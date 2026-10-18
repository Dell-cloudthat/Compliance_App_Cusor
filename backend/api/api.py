"""
SecurityOS FastAPI router.
Handles business profiles, control status, scoring, and AI copilot.

Authentication: all /organizations/{org_id}/* routes require a Bearer JWT.
Public endpoints (no auth): GET /controls, GET /controls/{id}, POST /copilot.

Phase 2.1:
  - Every org route requires an active membership (404 otherwise) AND a
    permission (403 otherwise): reads need finding.view, profile writes need
    org.manage, status writes need finding.remediate.
  - Manual status writes may only set fail / unknown / in_progress.  A control
    reaches "pass" only through an approved finding or an active attestation
    (and, from Phase 5, integration evidence).  See backend/controls/state.py.
  - Score and Trust Passport are computed from that derived state.
"""
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

import json
from pathlib import Path

# Load catalog from the single source of truth
_CATALOG_PATH = Path(__file__).parent.parent.parent / "compliance" / "controls" / "catalog.json"
with open(_CATALOG_PATH) as _f:
    CONTROLS = json.load(_f)
CONTROLS_BY_ID = {c["id"]: c for c in CONTROLS}

from backend.auth.context import Principal, get_principal, require_org_access
from backend.auth.permissions import (
    PERM_FINDING_REMEDIATE,
    PERM_FINDING_VIEW,
    PERM_ORG_MANAGE,
    require_permission,
)
from backend.repositories import control_state_repo
from backend.repositories.audit_repo import audit_repo
from backend.repositories.org_repo import org_repo
from backend.scoring.engine import calculate_score, ControlStatus

router = APIRouter(prefix="/api/v1/securityos", tags=["SecurityOS"])


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class BusinessProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(..., min_length=1, max_length=200)
    industry: str = ""
    employee_count: str = ""
    revenue_range: str = ""
    cloud_providers: List[str] = []
    email_provider: str = ""
    sensitive_data: List[str] = []
    has_insurance: Optional[bool] = None
    regulatory_exposure: List[str] = []


class ControlStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    control_id: str
    status: ControlStatus
    notes: Optional[str] = None


class BulkControlStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    updates: List[ControlStatusUpdate]


class CopilotMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=2000)
    control_statuses: Optional[Dict[str, Dict]] = None
    profile: Optional[Dict] = None


# ─── Stores ───────────────────────────────────────────────────────────────────
# Profiles live on the Organization (org_repo); manual statuses live in
# control_state_repo so the MSP router shares the same state.

_control_statuses = control_state_repo.manual_statuses  # back-compat alias


def _effective_statuses(org_id: str) -> Dict[str, Dict]:
    # Imported lazily: backend.controls.state imports the finding repo, which is fine,
    # but keeping the import here avoids a cycle with routers that import this module.
    from backend.controls.state import effective_statuses
    return effective_statuses(org_id)


def _profile(org_id: str) -> Dict:
    org = org_repo.get(org_id)
    return dict(org.profile) if org else {}


def apply_manual_status(
    org_id: str,
    control_id: str,
    status: str,
    notes: Optional[str],
    principal: Principal,
    evidence_source: str = "manual",
) -> Dict:
    """Shared by /organizations and /msp status routes.  Rejects score-raising values."""
    from backend.controls.state import MANUAL_ALLOWED_STATUSES

    if control_id not in CONTROLS_BY_ID:
        raise HTTPException(status_code=404, detail=f"Control {control_id} not found")
    status_value = status.value if hasattr(status, "value") else str(status)
    if status_value not in MANUAL_ALLOWED_STATUSES:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Status '{status_value}' cannot be set manually. A control passes only when "
                "its finding is approved, it is covered by an active attestation, or an "
                "integration verifies it."
            ),
        )
    entry = {
        "status": status_value,
        "notes": notes,
        "evidence_source": evidence_source,
        "last_checked": datetime.utcnow().isoformat(),
        "set_by": principal.user_id,
    }
    control_state_repo.manual_statuses.setdefault(org_id, {})[control_id] = entry
    audit_repo.record(org_id=org_id, actor_user_id=principal.user_id, action="control.status_set",
                      control_id=control_id, status=status_value)
    return entry


# ─── Controls Catalog (public — no auth required) ────────────────────────────

VALID_CATEGORIES = {"identity", "devices", "data", "network", "organization", "ai_rmf"}


@router.get("/controls")
def list_controls(category: Optional[str] = None, framework: Optional[str] = None):
    """Return the full controls catalog, optionally filtered by category or framework."""
    controls = CONTROLS
    if category:
        if category not in VALID_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown category: {category}. Valid: {sorted(VALID_CATEGORIES)}",
            )
        controls = [c for c in controls if c["category"] == category]
    if framework:
        controls = [c for c in controls if framework in (c.get("framework_mappings") or {})]
    return {"controls": controls, "total": len(controls)}


@router.get("/controls/{control_id}")
def get_control(control_id: str):
    """Return a single control by ID."""
    control = CONTROLS_BY_ID.get(control_id)
    if not control:
        raise HTTPException(status_code=404, detail=f"Control {control_id} not found")
    return control


# ─── Business Profile ─────────────────────────────────────────────────────────

@router.post("/organizations/{org_id}/profile")
def update_profile(
    org_id: str,
    profile: BusinessProfile,
    principal: Principal = Depends(get_principal),
):
    """Create or update a business profile.  Requires org.manage."""
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_ORG_MANAGE)
    org = org_repo.update_profile(org_id, profile.model_dump())
    audit_repo.record(org_id=org_id, actor_user_id=principal.user_id, action="org.profile_updated")
    return {"org_id": org_id, "profile": {**org.profile, "updated_at": org.updated_at}}


@router.get("/organizations/{org_id}/profile")
def get_profile(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """Retrieve a business profile.  Requires finding.view."""
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)
    org = org_repo.get(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {**org.profile, "updated_at": org.updated_at}


# ─── Control Statuses ─────────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/statuses")
def get_control_statuses(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """Effective control statuses (derived from findings, attestations, manual input)."""
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)
    return {"org_id": org_id, "statuses": _effective_statuses(org_id)}


@router.patch("/organizations/{org_id}/statuses")
def update_control_status(
    org_id: str,
    update: ControlStatusUpdate,
    principal: Principal = Depends(get_principal),
):
    """
    Record a manual status (fail / unknown / in_progress only).  Requires
    finding.remediate.  "pass" and "not_applicable" are rejected with 403.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_REMEDIATE)
    entry = apply_manual_status(org_id, update.control_id, update.status, update.notes, principal)
    return {"control_id": update.control_id, "status": entry["status"]}


@router.put("/organizations/{org_id}/statuses/bulk")
def bulk_update_control_statuses(
    org_id: str,
    payload: BulkControlStatusUpdate,
    principal: Principal = Depends(get_principal),
):
    """
    Record several manual statuses.  All-or-nothing: if any entry is a
    score-raising value or an unknown control, nothing is written.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_REMEDIATE)

    from backend.controls.state import MANUAL_ALLOWED_STATUSES
    for update in payload.updates:
        value = update.status.value if hasattr(update.status, "value") else str(update.status)
        if update.control_id not in CONTROLS_BY_ID:
            raise HTTPException(status_code=404, detail=f"Control {update.control_id} not found")
        if value not in MANUAL_ALLOWED_STATUSES:
            raise HTTPException(
                status_code=403,
                detail=f"Status '{value}' cannot be set manually (control {update.control_id}).",
            )

    results = []
    for update in payload.updates:
        entry = apply_manual_status(org_id, update.control_id, update.status, update.notes, principal)
        results.append({"control_id": update.control_id, "status": entry["status"]})
    return {"updated": len(results), "results": results}


# ─── Scoring ──────────────────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/score")
def get_score(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """Security Readiness Score, computed from derived control state."""
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    statuses = _effective_statuses(org_id)
    profile = _profile(org_id) or None
    result = calculate_score(statuses, business_profile=profile)
    return {
        "total_score": result.total_score,
        "max_score": result.max_score,
        "grade": result.grade,
        "color": result.color,
        "verified_pct": result.verified_pct,
        "confidence_note": result.confidence_note,
        "summary": result.summary,
        "categories": {
            cat_id: {
                "id": cat.id,
                "label": cat.label,
                "score": cat.score,
                "max_score": cat.max_score,
                "passing": cat.passing_count,
                "failing": cat.failing_count,
                "unknown": cat.unknown_count,
            }
            for cat_id, cat in result.categories.items()
        },
        "top_issues": [
            {
                "control_id": c.control_id,
                "name": c.name,
                "short_name": c.short_name,
                "severity": c.severity,
                "status": c.status,
                "customer_message": c.customer_message,
            }
            for c in result.top_issues
        ],
    }


# ─── Trust Passport ───────────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/passport")
def get_trust_passport(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """Generate a Trust Passport, computed from derived control state."""
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    profile = _profile(org_id)
    statuses = _effective_statuses(org_id)
    score_data = calculate_score(statuses, business_profile=profile)

    KEY_PASSPORT_CONTROLS = [
        ("CTRL-ID-001", "Multi-Factor Authentication"),
        ("CTRL-DEV-001", "Device Encryption"),
        ("CTRL-DATA-003", "Data Backups"),
        ("CTRL-DEV-003", "Endpoint Protection"),
        ("CTRL-ORG-001", "Security Policy"),
        ("CTRL-ORG-002", "Incident Response"),
        ("CTRL-ORG-003", "Security Training"),
        ("CTRL-NET-004", "Admin Access Control"),
    ]

    control_summary = []
    for ctrl_id, label in KEY_PASSPORT_CONTROLS:
        entry = statuses.get(ctrl_id, {})
        control_summary.append({
            "control_id": ctrl_id,
            "label": label,
            "status": entry.get("status", ControlStatus.UNKNOWN),
            "last_checked": entry.get("last_checked"),
            "basis": entry.get("derived_from", "none"),
        })

    return {
        "org_id": org_id,
        "business_name": profile.get("business_name", ""),
        "industry": profile.get("industry", ""),
        "total_score": score_data.total_score,
        "grade": score_data.grade,
        "color": score_data.color,
        "category_scores": {
            cat_id: {"label": cat.label, "score": cat.score, "max_score": cat.max_score}
            for cat_id, cat in score_data.categories.items()
        },
        "key_controls": control_summary,
        "verified_at": datetime.utcnow().isoformat(),
        "summary": score_data.summary,
    }


# ─── Score Evidence Breakdown ────────────────────────────────────────────────

# A status entry older than this many days is considered stale.
_STALE_DAYS = 30
# Score threshold above which a concealed-gap warning is issued.
_SCORE_WARN_THRESHOLD = 70
# Severities that trigger the concealed-gap warning.
_HIGH_SEVERITY_SET = {"critical", "high"}


@router.get("/organizations/{org_id}/score/evidence", summary="Per-control evidence breakdown")
def get_score_evidence(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """
    Return a per-control evidence breakdown so customers can see exactly what
    backs each control's status.

    For every control the response includes:
    - **status** — derived effective status (pass / fail / in_progress / unknown)
    - **evidence_source** — where the status came from (attestation, approved_finding, manual, none, …)
    - **evidence_confidence** — 0.0–1.0 confidence weight used in scoring
    - **derived_from** — which mechanism produced the status
    - **last_checked** — ISO-8601 timestamp of the most recent evidence
    - **age_days** — how many days ago the evidence was recorded
    - **stale** — true when age_days > 30 (manual or unverified evidence needs refresh)
    - **notes** — any human-readable notes attached to the status

    The summary section includes a **concealed_gap_warning** when the overall score
    is ≥ 70 but at least one critical or high-severity control is still failing.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    from backend.scoring.engine import EVIDENCE_CONFIDENCE, load_catalog, calculate_score

    catalog = load_catalog()
    statuses = _effective_statuses(org_id)
    profile = _profile(org_id) or None
    score_result = calculate_score(statuses, business_profile=profile, catalog=catalog)

    now = datetime.utcnow()
    controls_out = []
    verified_count = 0
    stale_count = 0
    failing_high_severity: list = []

    for ctrl in catalog:
        ctrl_id = ctrl["id"]
        entry = statuses.get(ctrl_id, {})
        status = entry.get("status", "unknown")
        evidence_source = entry.get("evidence_source", "none")
        derived_from = entry.get("derived_from", "none")
        last_checked = entry.get("last_checked")
        notes = entry.get("notes")

        # Age calculation
        age_days: Optional[float] = None
        is_stale = False
        if last_checked:
            try:
                lc_dt = datetime.fromisoformat(last_checked.replace("Z", "+00:00"))
                # Strip tz for simple subtraction if needed
                lc_naive = lc_dt.replace(tzinfo=None) if lc_dt.tzinfo else lc_dt
                age_days = round((now - lc_naive).total_seconds() / 86400, 1)
                is_stale = age_days > _STALE_DAYS
            except (ValueError, TypeError):
                pass

        confidence = EVIDENCE_CONFIDENCE.get(str(evidence_source), 0.0)

        if status == "pass":
            verified_count += 1
        if is_stale:
            stale_count += 1
        if status == "fail" and ctrl.get("severity") in _HIGH_SEVERITY_SET:
            failing_high_severity.append({
                "control_id": ctrl_id,
                "name": ctrl["name"],
                "severity": ctrl.get("severity"),
            })

        controls_out.append({
            "control_id": ctrl_id,
            "name": ctrl["name"],
            "short_name": ctrl.get("short_name"),
            "category": ctrl.get("category"),
            "severity": ctrl.get("severity"),
            "status": status,
            "evidence_source": evidence_source,
            "evidence_confidence": confidence,
            "derived_from": derived_from,
            "last_checked": last_checked,
            "age_days": age_days,
            "stale": is_stale,
            "notes": notes,
            "finding_ids": entry.get("finding_ids", []),
            "attestation_id": entry.get("attestation_id"),
            "risk_accepted": entry.get("risk_accepted", False),
        })

    # Sort: failing first, then by severity
    _sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    _status_order = {"fail": 0, "in_progress": 1, "unknown": 2, "pass": 3}
    controls_out.sort(key=lambda c: (
        _status_order.get(c["status"], 5),
        _sev_order.get(c["severity"], 5),
    ))

    total_score = score_result.total_score
    concealed_gap = total_score >= _SCORE_WARN_THRESHOLD and bool(failing_high_severity)

    return {
        "org_id": org_id,
        "total_score": total_score,
        "grade": score_result.grade,
        "summary": {
            "total_controls": len(controls_out),
            "verified_count": verified_count,
            "stale_count": stale_count,
            "failing_count": score_result.summary.get("failing", 0),
            "unknown_count": score_result.summary.get("unknown", 0),
            "in_progress_count": score_result.summary.get("in_progress", 0),
        },
        "concealed_gap_warning": concealed_gap,
        "concealed_gaps": failing_high_severity if concealed_gap else [],
        "concealed_gap_message": (
            f"Score is {total_score} but {len(failing_high_severity)} critical/high "
            "control(s) are failing. These must be resolved — accepting risk or ignoring "
            "them does not make the organisation secure."
        ) if concealed_gap else None,
        "evidence_breakdown": score_result.evidence_breakdown,
        "controls": controls_out,
        "generated_at": now.isoformat(),
    }


# ─── AI Copilot (public — no auth required for context building) ─────────────

@router.post("/copilot")
def copilot_query(payload: CopilotMessage):
    """
    AI Security Copilot endpoint (unauthenticated preview).
    Returns structured context for client-side AI processing.
    For org-specific grounded responses, use POST /organizations/{org_id}/copilot.
    """
    statuses = payload.control_statuses or {}
    profile = payload.profile or {}
    score_data = calculate_score(statuses, business_profile=profile)

    return {
        "context": {
            "score": score_data.total_score,
            "grade": score_data.grade,
            "open_issues": [
                {
                    "control_id": c.control_id,
                    "name": c.name,
                    "short_name": c.short_name,
                    "severity": c.severity,
                    "status": c.status,
                    "customer_message": c.customer_message,
                }
                for c in score_data.top_issues
            ],
            "profile_summary": {
                "industry": profile.get("industry", ""),
                "employee_count": profile.get("employee_count", ""),
                "sensitive_data": profile.get("sensitive_data", []),
            },
        },
        "message": payload.message,
        "note": "Connect to your preferred LLM provider with this context to generate responses.",
    }


class OrgCopilotMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=2000)


@router.post(
    "/organizations/{org_id}/copilot",
    summary="Grounded AI Copilot — answers are based on this org's actual findings",
)
def org_copilot_query(
    org_id: str,
    payload: OrgCopilotMessage,
    principal: Principal = Depends(get_principal),
):
    """
    Grounded Security Copilot for a specific organisation.

    Unlike the public /copilot endpoint, this one:
    - Is authenticated — only org members can query it.
    - Pulls the org's **actual** open findings, control statuses, and evidence.
    - Enriches each open finding with catalog remediation steps, framework
      mappings, estimated effort, and verification methods so an LLM can give
      engineer-specific guidance rather than generic AI text.
    - Makes clear which claims are backed by real evidence and which are unknown,
      so the AI cannot fabricate compliance status.

    The response contains a `grounded_context` object ready to be injected into
    an LLM system prompt.  Pass it along with `message` to your LLM provider.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    from backend.repositories.finding_repo import finding_repo as _finding_repo
    from backend.scoring.engine import load_catalog

    catalog = load_catalog()
    catalog_by_id = {c["id"]: c for c in catalog}
    statuses = _effective_statuses(org_id)
    profile = _profile(org_id) or {}
    score_data = calculate_score(statuses, business_profile=profile, catalog=catalog)

    # Collect open/in-progress findings with full remediation context
    open_findings = [
        f for f in _finding_repo.list_by_org(org_id)
        if f.state not in ("closed",)
    ]

    findings_context = []
    for f in open_findings:
        ctrl_guidance = []
        for cid in f.control_ids:
            ctrl = catalog_by_id.get(cid)
            if ctrl:
                ctrl_guidance.append({
                    "control_id": cid,
                    "name": ctrl["name"],
                    "framework_mappings": ctrl.get("framework_mappings", {}),
                    "remediation_steps": ctrl.get("remediation_steps", []),
                    "estimated_minutes": ctrl.get("estimated_minutes"),
                    "verification_methods": ctrl.get("verification_methods", []),
                    "evidence_requirements": ctrl.get("evidence_requirements", []),
                })
        findings_context.append({
            "finding_id": f.finding_id,
            "title": f.title,
            "description": f.description,
            "severity": f.severity,
            "state": f.state,
            "is_overdue": f.is_overdue(),
            "due_date": f.due_date,
            "business_impact": f.business_impact,
            "affected_resources": [
                {"resource_type": r.resource_type, "identifier": r.identifier}
                for r in (f.affected_resources or [])
            ],
            "definition_of_done": f.definition_of_done,
            "verification_evidence": f.verification_evidence,
            "control_guidance": ctrl_guidance,
        })

    # Per-control evidence summary (show what is and isn't verified)
    evidence_summary = []
    for ctrl in catalog:
        entry = statuses.get(ctrl["id"], {})
        evidence_summary.append({
            "control_id": ctrl["id"],
            "name": ctrl["name"],
            "severity": ctrl.get("severity"),
            "status": entry.get("status", "unknown"),
            "evidence_source": entry.get("evidence_source", "none"),
            "derived_from": entry.get("derived_from", "none"),
            "last_checked": entry.get("last_checked"),
        })

    return {
        "org_id": org_id,
        "message": payload.message,
        "grounded_context": {
            "org_profile": {
                "business_name": profile.get("business_name", ""),
                "industry": profile.get("industry", ""),
                "employee_count": profile.get("employee_count", ""),
                "sensitive_data": profile.get("sensitive_data", []),
                "regulatory_exposure": profile.get("regulatory_exposure", []),
            },
            "score": {
                "total": score_data.total_score,
                "grade": score_data.grade,
                "verified_pct": round(score_data.verified_pct, 1),
                "confidence_note": score_data.confidence_note,
            },
            "open_findings": findings_context,
            "open_finding_count": len(findings_context),
            "overdue_finding_count": sum(1 for f in open_findings if f.is_overdue()),
            "evidence_summary": evidence_summary,
            "instruction": (
                "You are a cybersecurity advisor for this organisation. "
                "Answer ONLY based on the evidence in grounded_context. "
                "Do not invent or assume compliance status for any control unless "
                "its evidence_source is 'direct_automated' or 'attested_third_party'. "
                "For each open finding, provide step-by-step remediation from "
                "control_guidance.remediation_steps, estimated effort, and state "
                "what verification_evidence is required to close the finding."
            ),
        },
        "note": "Inject grounded_context into your LLM system prompt to generate accurate, org-specific responses.",
    }
