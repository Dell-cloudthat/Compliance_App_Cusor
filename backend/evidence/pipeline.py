"""
SecurityOS Evidence Pipeline.

Raw evidence from integrations flows through this pipeline to produce
normalized ControlEvaluation records that feed the scoring engine.

Flow:
    Integration (M365, Google, AWS, ...)
        │
        ▼
    RawEvidence  (what the API returned, verbatim)
        │
        ▼
    NormalizedEvidence  (typed, structured)
        │
        ▼
    ControlEvaluation  (PASS / FAIL / UNKNOWN + confidence)
        │
        ▼
    SecurityScore  (weighted aggregate)

The pipeline is stateless; each evaluation run processes evidence fresh.
Evidence records are stored in the database and passed into this module —
the module itself does not talk to the database or integrations.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class IntegrationType(str, Enum):
    MICROSOFT_365 = "microsoft_365"
    GOOGLE_WORKSPACE = "google_workspace"
    AWS = "aws"
    AZURE = "azure"
    MICROSOFT_INTUNE = "microsoft_intune"
    MICROSOFT_DEFENDER = "microsoft_defender"
    AZURE_BACKUP = "azure_backup"
    AWS_BACKUP = "aws_backup"
    MANUAL = "manual"


class EvidenceCheck(str, Enum):
    # Identity
    MFA_ENABLED_ALL_USERS = "mfa_enabled_all_users"
    MFA_ENABLED_ADMINS = "mfa_enabled_admins"
    INACTIVE_ACCOUNTS = "inactive_accounts"
    PRIVILEGED_ACCOUNTS_MFA = "privileged_accounts_mfa"
    # Devices
    ENCRYPTION_ALL_DEVICES = "encryption_enabled_all_devices"
    OS_PATCHING_CURRENT = "os_patching_current"
    EDR_INSTALLED = "edr_installed_all_devices"
    SCREEN_LOCK_ENFORCED = "screen_lock_enforced"
    # Cloud
    SECURE_SCORE = "secure_score_above_threshold"
    AUDIT_LOGGING = "audit_logging_enabled"
    ADMIN_ACCESS_RESTRICTED = "admin_access_restricted"
    # Backup
    BACKUPS_RUNNING = "backups_configured_and_running"
    RESTORE_TEST = "restore_test_within_30_days"
    # Policy (manual)
    POLICY_EXISTS = "policy_document_exists"


@dataclass
class RawEvidence:
    """Raw data from an integration API call, unprocessed."""
    integration: IntegrationType
    check: EvidenceCheck
    org_id: str
    raw_payload: Dict[str, Any]
    collected_at: datetime = field(default_factory=datetime.utcnow)
    collection_error: Optional[str] = None


@dataclass
class NormalizedEvidence:
    """Processed, typed evidence record ready for control evaluation."""
    integration: IntegrationType
    check: EvidenceCheck
    org_id: str
    # The normalized result for this specific check
    value: Any                     # e.g. True/False, count, percentage
    unit: Optional[str] = None    # e.g. "users", "devices", "days"
    detail: Optional[str] = None  # human-readable detail
    collected_at: Optional[datetime] = None
    raw_evidence_id: Optional[str] = None

    # Examples of what normalized looks like per check:
    # MFA_ENABLED_ALL_USERS → value=False, detail="3 of 12 users missing MFA", unit="users"
    # OS_PATCHING_CURRENT   → value=True,  detail="All 8 devices current"
    # SECURE_SCORE          → value=72,    unit="percent"
    # RESTORE_TEST          → value=47,    unit="days_since_test"


@dataclass
class ControlEvaluation:
    """
    The result of evaluating a control against normalized evidence.
    This is the direct input to the scoring engine.
    """
    control_id: str
    status: str  # "pass" | "fail" | "unknown"
    evidence_source: str  # "automatic" | "manual" | "inferred" | "none"
    evidence_confidence: float  # 0.0 - 1.0
    notes: Optional[str] = None
    detail: Optional[str] = None  # Customer-facing detail, e.g. "3 users not protected"
    last_checked: Optional[str] = None
    evidence_records: List[NormalizedEvidence] = field(default_factory=list)


def evaluate_mfa_control(evidence_list: List[NormalizedEvidence]) -> ControlEvaluation:
    """
    Evaluate CTRL-ID-001 (MFA) from normalized evidence.

    Example:
        M365 Graph API returns: 3 users without MFA, 9 users with MFA
        → FAIL, confidence=1.0, detail="3 users not protected"
    """
    auto_evidence = [e for e in evidence_list if e.integration != IntegrationType.MANUAL]
    manual_evidence = [e for e in evidence_list if e.integration == IntegrationType.MANUAL]

    if auto_evidence:
        # Use the most recent automatic evidence
        ev = sorted(auto_evidence, key=lambda e: e.collected_at or datetime.min, reverse=True)[0]
        if ev.value is True:
            return ControlEvaluation(
                control_id="CTRL-ID-001",
                status="pass",
                evidence_source="automatic",
                evidence_confidence=1.0,
                detail="MFA enabled for all users",
                last_checked=ev.collected_at.isoformat() if ev.collected_at else None,
                evidence_records=auto_evidence,
            )
        else:
            count = ev.value if isinstance(ev.value, int) else "Some"
            unit = ev.unit or "users"
            return ControlEvaluation(
                control_id="CTRL-ID-001",
                status="fail",
                evidence_source="automatic",
                evidence_confidence=1.0,
                notes=ev.detail,
                detail=f"{count} {unit} not protected",
                last_checked=ev.collected_at.isoformat() if ev.collected_at else None,
                evidence_records=auto_evidence,
            )

    if manual_evidence:
        ev = manual_evidence[0]
        status = "pass" if ev.value is True else "fail"
        return ControlEvaluation(
            control_id="CTRL-ID-001",
            status=status,
            evidence_source="manual",
            evidence_confidence=0.70,
            detail=ev.detail,
            last_checked=ev.collected_at.isoformat() if ev.collected_at else None,
            evidence_records=manual_evidence,
        )

    return ControlEvaluation(
        control_id="CTRL-ID-001",
        status="unknown",
        evidence_source="none",
        evidence_confidence=0.0,
        detail="MFA status not verified",
    )


def evaluate_backup_verification(evidence_list: List[NormalizedEvidence]) -> ControlEvaluation:
    """
    Evaluate CTRL-DATA-004 (Backup Verification).
    Checks if restore test was done within 30 days.
    """
    for ev in evidence_list:
        if ev.check == EvidenceCheck.RESTORE_TEST:
            days = ev.value  # days since last test
            if isinstance(days, (int, float)):
                if days <= 30:
                    return ControlEvaluation(
                        control_id="CTRL-DATA-004",
                        status="pass",
                        evidence_source="automatic" if ev.integration != IntegrationType.MANUAL else "manual",
                        evidence_confidence=1.0 if ev.integration != IntegrationType.MANUAL else 0.7,
                        detail=f"Last verified {int(days)} days ago",
                        last_checked=ev.collected_at.isoformat() if ev.collected_at else None,
                        evidence_records=evidence_list,
                    )
                else:
                    return ControlEvaluation(
                        control_id="CTRL-DATA-004",
                        status="fail",
                        evidence_source="automatic" if ev.integration != IntegrationType.MANUAL else "manual",
                        evidence_confidence=1.0 if ev.integration != IntegrationType.MANUAL else 0.7,
                        detail=f"Last verified {int(days)} days ago",
                        last_checked=ev.collected_at.isoformat() if ev.collected_at else None,
                        evidence_records=evidence_list,
                    )

    return ControlEvaluation(
        control_id="CTRL-DATA-004",
        status="unknown",
        evidence_source="none",
        evidence_confidence=0.0,
        detail="Backup verification date unknown",
    )


# ── Evidence-to-control mapping ───────────────────────────────────────────────
# Maps each control ID to the evidence checks that can satisfy it.
# When an integration provides evidence for a check, the pipeline
# calls the appropriate evaluator to produce a ControlEvaluation.

CONTROL_EVIDENCE_MAP: Dict[str, List[EvidenceCheck]] = {
    "CTRL-ID-001": [EvidenceCheck.MFA_ENABLED_ALL_USERS],
    "CTRL-ID-002": [EvidenceCheck.PRIVILEGED_ACCOUNTS_MFA, EvidenceCheck.MFA_ENABLED_ADMINS],
    "CTRL-ID-003": [EvidenceCheck.INACTIVE_ACCOUNTS],
    "CTRL-DEV-001": [EvidenceCheck.ENCRYPTION_ALL_DEVICES],
    "CTRL-DEV-002": [EvidenceCheck.OS_PATCHING_CURRENT],
    "CTRL-DEV-003": [EvidenceCheck.EDR_INSTALLED],
    "CTRL-DEV-004": [EvidenceCheck.SCREEN_LOCK_ENFORCED],
    "CTRL-NET-001": [EvidenceCheck.SECURE_SCORE],
    "CTRL-NET-002": [EvidenceCheck.AUDIT_LOGGING],
    "CTRL-NET-004": [EvidenceCheck.ADMIN_ACCESS_RESTRICTED],
    "CTRL-DATA-003": [EvidenceCheck.BACKUPS_RUNNING],
    "CTRL-DATA-004": [EvidenceCheck.RESTORE_TEST],
}

# Controls that require manual attestation only (no automation available for MVP)
MANUAL_ONLY_CONTROLS = {
    # Identity (policy/process controls)
    "CTRL-ID-004", "CTRL-ID-005",
    # Devices (policy controls)
    "CTRL-DEV-005",
    # Data (policy controls)
    "CTRL-DATA-001", "CTRL-DATA-002", "CTRL-DATA-005",
    # Network (policy controls)
    "CTRL-NET-003", "CTRL-NET-005",
    # Organization (all policy/process)
    "CTRL-ORG-001", "CTRL-ORG-002", "CTRL-ORG-003", "CTRL-ORG-004", "CTRL-ORG-005",
    # AI RMF — all require human policy review; no API can verify these automatically
    "CTRL-AI-001", "CTRL-AI-002", "CTRL-AI-003",
    "CTRL-AI-004", "CTRL-AI-005", "CTRL-AI-006",
}
