"""
SecurityOS Attestation Engine

An attestation is an explicit, authenticated confirmation that a named
third-party platform or operational process provides the security coverage
required by one or more SecurityOS controls.

Key invariants:
  - Attestations are NEVER created silently from a manual yes/no answer.
  - Every attestation requires the user to explicitly confirm with "ATTEST".
  - Attestations have explicit scope — never cover all controls at once.
  - Attestations expire; historical records are never overwritten.
  - Revocation is permanent but non-destructive (prior records preserved).
  - The server always sets the timestamp, never the browser.
"""

from __future__ import annotations
import uuid
import os
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


# ── Configuration ──────────────────────────────────────────────────────────────
# Override via env: SECURITYOS_ATTESTATION_DEFAULT_DAYS=90
DEFAULT_VALIDITY_DAYS: int = int(os.environ.get("SECURITYOS_ATTESTATION_DEFAULT_DAYS", 90))
ALLOWED_VALIDITY_DAYS: List[int] = [30, 60, 90, 180]
EXPIRY_WARNING_DAYS: int = 14   # show "expiring soon" banner N days before expiry
CONFIRMATION_PHRASE: str = "ATTEST"  # user must type this exactly


class AttestationScope(str, Enum):
    INDIVIDUAL_CONTROL = "individual_control"   # One control only
    CONTROL_GROUP      = "control_group"        # Multiple related controls
    EVIDENCE_SOURCE    = "evidence_source"      # Named provider → multiple controls


class AttestationStatus(str, Enum):
    ACTIVE   = "active"
    EXPIRED  = "expired"
    REVOKED  = "revoked"


class AttestationType(str, Enum):
    THIRD_PARTY_PLATFORM = "third_party_platform"   # Named security product
    OPERATIONAL_PROCESS  = "operational_process"    # Internal process/procedure
    CONFIGURATION        = "configuration"          # System configuration confirmed


@dataclass
class Attestation:
    """
    A single attestation record.
    Immutable once created — revocation sets status+revoked_at, never deletes.
    """
    id: str
    organization_id: str

    # Who attested
    created_by_user_id: Optional[str]
    created_by_name: str
    created_by_email: str

    # What was attested
    attestation_type: AttestationType
    scope_type: AttestationScope
    control_ids: List[str]          # Controls covered by this attestation

    # The third-party source (if attestation_type = THIRD_PARTY_PLATFORM)
    source_provider_id: Optional[str]    # e.g. "crowdstrike_falcon"
    source_name: str                     # e.g. "CrowdStrike Falcon"
    source_description: str              # Free-form description of coverage

    # Confirmation
    statement: str                       # Human-readable attestation statement
    confirmation_phrase: str = CONFIRMATION_PHRASE

    # Lifecycle
    status: AttestationStatus = AttestationStatus.ACTIVE
    effective_at: Optional[str] = None
    expires_at: Optional[str] = None
    validity_days: int = DEFAULT_VALIDITY_DAYS

    # Audit
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    revoked_at: Optional[str] = None
    revoked_by_user_id: Optional[str] = None
    revoked_by_name: Optional[str] = None
    revoke_reason: Optional[str] = None

    # Request metadata
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # Extensible metadata
    metadata: Dict[str, Any] = field(default_factory=dict)


def create_attestation(
    *,
    organization_id: str,
    created_by_user_id: Optional[str] = None,
    created_by_name: str,
    created_by_email: str,
    attestation_type: str = AttestationType.THIRD_PARTY_PLATFORM,
    scope_type: str = AttestationScope.EVIDENCE_SOURCE,
    control_ids: List[str],
    source_provider_id: Optional[str] = None,
    source_name: str,
    source_description: str,
    validity_days: int = DEFAULT_VALIDITY_DAYS,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Attestation:
    """
    Create a new attestation. Server sets all timestamps.
    Validates that control_ids is non-empty and validity_days is allowed.
    Raises ValueError on invalid input.
    """
    if not control_ids:
        raise ValueError("Attestation must cover at least one control.")

    if not source_name.strip():
        raise ValueError("source_name is required.")

    if validity_days not in ALLOWED_VALIDITY_DAYS:
        validity_days = DEFAULT_VALIDITY_DAYS

    # Deduplicate control IDs
    control_ids = list(dict.fromkeys(control_ids))

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=validity_days)

    statement = (
        f"I confirm that {source_name} currently provides the described security "
        f"coverage for {len(control_ids)} SecurityOS control(s)."
    )

    return Attestation(
        id=f"attest-{uuid.uuid4().hex[:16]}",
        organization_id=organization_id,
        created_by_user_id=created_by_user_id,
        created_by_name=created_by_name,
        created_by_email=created_by_email,
        attestation_type=AttestationType(attestation_type),
        scope_type=AttestationScope(scope_type),
        control_ids=control_ids,
        source_provider_id=source_provider_id,
        source_name=source_name,
        source_description=source_description,
        statement=statement,
        status=AttestationStatus.ACTIVE,
        effective_at=now.isoformat(),
        expires_at=expires.isoformat(),
        validity_days=validity_days,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata or {},
    )


def revoke_attestation(
    attestation: Attestation,
    *,
    revoked_by_user_id: Optional[str] = None,
    revoked_by_name: str,
    reason: Optional[str] = None,
) -> None:
    """
    Revoke an attestation in place.
    Does NOT delete the record — preserves full audit history.
    """
    now = datetime.now(timezone.utc).isoformat()
    attestation.status = AttestationStatus.REVOKED
    attestation.revoked_at = now
    attestation.updated_at = now
    attestation.revoked_by_user_id = revoked_by_user_id
    attestation.revoked_by_name = revoked_by_name
    attestation.revoke_reason = reason


def refresh_status(attestation: Attestation) -> None:
    """
    Recalculate the attestation's status based on expiry.
    Call this before returning any attestation to the client.
    """
    if attestation.status == AttestationStatus.REVOKED:
        return
    if attestation.expires_at:
        try:
            expiry = datetime.fromisoformat(attestation.expires_at)
            if datetime.now(timezone.utc) > expiry:
                attestation.status = AttestationStatus.EXPIRED
                attestation.updated_at = datetime.now(timezone.utc).isoformat()
        except ValueError:
            pass


def is_active(attestation: Attestation) -> bool:
    refresh_status(attestation)
    return attestation.status == AttestationStatus.ACTIVE


def days_until_expiry(attestation: Attestation) -> Optional[int]:
    if not attestation.expires_at:
        return None
    try:
        expiry = datetime.fromisoformat(attestation.expires_at)
        delta = expiry - datetime.now(timezone.utc)
        return max(0, delta.days)
    except ValueError:
        return None


def is_expiring_soon(attestation: Attestation) -> bool:
    days = days_until_expiry(attestation)
    return days is not None and 0 < days <= EXPIRY_WARNING_DAYS


def to_dict(attestation: Attestation) -> Dict:
    """Serialize to API response format."""
    refresh_status(attestation)
    return {
        "id": attestation.id,
        "organization_id": attestation.organization_id,
        "created_by_user_id": attestation.created_by_user_id,
        "created_by_name": attestation.created_by_name,
        "created_by_email": attestation.created_by_email,
        "attestation_type": attestation.attestation_type,
        "scope_type": attestation.scope_type,
        "control_ids": attestation.control_ids,
        "source_provider_id": attestation.source_provider_id,
        "source_name": attestation.source_name,
        "source_description": attestation.source_description,
        "statement": attestation.statement,
        "status": attestation.status,
        "effective_at": attestation.effective_at,
        "expires_at": attestation.expires_at,
        "validity_days": attestation.validity_days,
        "days_until_expiry": days_until_expiry(attestation),
        "expiring_soon": is_expiring_soon(attestation),
        "created_at": attestation.created_at,
        "updated_at": attestation.updated_at,
        "revoked_at": attestation.revoked_at,
        "revoked_by_name": attestation.revoked_by_name,
        "revoke_reason": attestation.revoke_reason,
        "ip_address": attestation.ip_address,
        "user_agent": attestation.user_agent,
        "metadata": attestation.metadata,
    }
