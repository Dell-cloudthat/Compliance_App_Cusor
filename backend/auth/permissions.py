"""
SecurityOS Permission System — Phase 2

Security invariants:
  - Identity and tenant come only from a verified JWT.
  - Authorization (roles) comes from org_memberships, never from token role claims.
  - Deny by default: missing membership → 403.
  - Permission checks, not role-name checks (require_permission('attestation.create')).
  - Self-approval prohibition: same user cannot both submit-for-review and approve-close
    a finding, or both remediate and attest the same controls.

Permission constants use dot notation: <resource>.<action>
"""

from __future__ import annotations

from typing import FrozenSet, Dict

from fastapi import HTTPException

from backend.auth.context import Principal
from backend.repositories.org_membership_repo import org_membership_repo

# ── Permission constants ───────────────────────────────────────────────────────

PERM_ORG_MANAGE          = "org.manage"
PERM_ATTESTATION_CREATE  = "attestation.create"
PERM_ATTESTATION_REVOKE  = "attestation.revoke"
PERM_FINDING_VIEW        = "finding.view"
PERM_FINDING_ASSIGN      = "finding.assign"
PERM_FINDING_REMEDIATE   = "finding.remediate"
PERM_FINDING_APPROVE_CLOSE = "finding.approve_close"
PERM_FINDING_RISK_ACCEPT = "finding.risk_accept"
PERM_REPORT_VIEW         = "report.view"

# ── Role → permission map ─────────────────────────────────────────────────────

ROLE_PERMISSIONS: Dict[str, FrozenSet[str]] = {
    "admin": frozenset({
        PERM_ORG_MANAGE,
        PERM_ATTESTATION_CREATE,
        PERM_ATTESTATION_REVOKE,
        PERM_FINDING_VIEW,
        PERM_FINDING_ASSIGN,
        PERM_FINDING_REMEDIATE,
        PERM_FINDING_APPROVE_CLOSE,
        PERM_FINDING_RISK_ACCEPT,
        PERM_REPORT_VIEW,
    }),
    "executive": frozenset({
        PERM_ATTESTATION_CREATE,
        PERM_ATTESTATION_REVOKE,
        PERM_FINDING_VIEW,
        PERM_FINDING_APPROVE_CLOSE,
        PERM_FINDING_RISK_ACCEPT,
        PERM_REPORT_VIEW,
    }),
    "engineer": frozenset({
        PERM_FINDING_VIEW,
        PERM_FINDING_ASSIGN,
        PERM_FINDING_REMEDIATE,
        PERM_REPORT_VIEW,
    }),
    "msp_technician": frozenset({
        PERM_FINDING_VIEW,
        PERM_REPORT_VIEW,
    }),
    "auditor": frozenset({
        PERM_FINDING_VIEW,
        PERM_REPORT_VIEW,
    }),
}

# ── Permission enforcement ────────────────────────────────────────────────────

def has_permission(principal: Principal, org_id: str, permission: str) -> bool:
    """
    Return True if the principal has the given permission in the given org.

    Authorization comes from org_memberships — never from token role claims.
    """
    membership = org_membership_repo.get(principal.user_id, org_id)
    if membership is None:
        return False
    role_perms = ROLE_PERMISSIONS.get(membership.role, frozenset())
    return permission in role_perms


def require_permission(principal: Principal, org_id: str, permission: str) -> None:
    """
    Raise HTTP 403 if the principal does not have the given permission in org_id.

    Call AFTER require_org_access() so cross-tenant requests return 404 first.
    """
    if not has_permission(principal, org_id, permission):
        raise HTTPException(
            status_code=403,
            detail=f"Permission '{permission}' is required for this action.",
        )


def get_role(principal: Principal, org_id: str) -> str | None:
    """Return the principal's role in org_id, or None if no membership exists."""
    membership = org_membership_repo.get(principal.user_id, org_id)
    return membership.role if membership else None
