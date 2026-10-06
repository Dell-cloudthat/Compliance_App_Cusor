"""
SecurityOS Findings API — Phase 2

Manages security findings and their state-machine lifecycle.

Routes:
  POST   /api/v1/securityos/organizations/{org_id}/findings
  GET    /api/v1/securityos/organizations/{org_id}/findings
  GET    /api/v1/securityos/organizations/{org_id}/findings/{finding_id}
  POST   /api/v1/securityos/organizations/{org_id}/findings/{finding_id}/transition

Security invariants:
  - Server sets all timestamps and actor fields.
  - Self-approval prohibition: the user who submitted a finding for review
    cannot be the same user who approves/closes it (→ 409).
  - Append-only audit trail: events are never deleted.
  - Tenant isolation: require_org_access() on every route.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.auth.context import Principal, get_principal, require_org_access
from backend.auth.permissions import (
    PERM_FINDING_APPROVE_CLOSE,
    PERM_FINDING_ASSIGN,
    PERM_FINDING_REMEDIATE,
    PERM_FINDING_RISK_ACCEPT,
    PERM_FINDING_VIEW,
    require_permission,
)
from backend.repositories.finding_repo import TRANSITIONS, finding_repo

router = APIRouter(prefix="/api/v1/securityos", tags=["Findings"])

VALID_SEVERITIES = frozenset({"critical", "high", "medium", "low", "info"})

# Map action → required permission
ACTION_PERMISSIONS = {
    "assign":   PERM_FINDING_ASSIGN,
    "start":    PERM_FINDING_REMEDIATE,
    "submit":   PERM_FINDING_REMEDIATE,
    "approve":  PERM_FINDING_APPROVE_CLOSE,
    "reject":   PERM_FINDING_APPROVE_CLOSE,
    "reopen":   PERM_FINDING_APPROVE_CLOSE,
    "risk_accept": PERM_FINDING_RISK_ACCEPT,
}


# ── Pydantic models ───────────────────────────────────────────────────────────

class FindingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=300)
    description: str = Field(..., min_length=1, max_length=5000)
    severity: str = Field(..., description=f"One of: {sorted(VALID_SEVERITIES)}")
    control_ids: List[str] = Field(default_factory=list)


class FindingTransition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: str = Field(..., description="State-machine action to apply")
    note: Optional[str] = Field(None, max_length=2000)
    assigned_to_user_id: Optional[str] = Field(
        None, description="Required when action='assign'"
    )


# ── Serialization ─────────────────────────────────────────────────────────────

def _serialize_event(e) -> dict:
    return {
        "event_id": e.event_id,
        "action": e.action,
        "from_state": e.from_state,
        "to_state": e.to_state,
        "actor_user_id": e.actor_user_id,
        "actor_name": e.actor_name,
        "occurred_at": e.occurred_at,
        "note": e.note,
    }


def _serialize_finding(f, *, include_events: bool = False) -> dict:
    d: dict = {
        "finding_id": f.finding_id,
        "org_id": f.org_id,
        "title": f.title,
        "description": f.description,
        "severity": f.severity,
        "control_ids": f.control_ids,
        "state": f.state,
        "created_by_user_id": f.created_by_user_id,
        "assigned_to_user_id": f.assigned_to_user_id,
        "created_at": f.created_at,
        "updated_at": f.updated_at,
    }
    if include_events:
        d["events"] = [_serialize_event(e) for e in f.events]
    return d


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/organizations/{org_id}/findings",
    status_code=201,
    summary="Create a new finding",
)
def create_finding(
    org_id: str,
    payload: FindingCreate,
    principal: Principal = Depends(get_principal),
):
    """
    Create a new finding in state 'open'.

    Actor identity and timestamps are set by the server.
    Requires finding.assign permission (engineers and admins discover/log findings).
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_ASSIGN)

    if payload.severity not in VALID_SEVERITIES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid severity '{payload.severity}'. Must be one of {sorted(VALID_SEVERITIES)}.",
        )

    finding = finding_repo.create(
        org_id=org_id,
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        control_ids=payload.control_ids,
        created_by_user_id=principal.user_id,
        created_by_name=principal.display_name,
    )
    return {"finding": _serialize_finding(finding, include_events=True)}


@router.get(
    "/organizations/{org_id}/findings",
    summary="List findings for an org",
)
def list_findings(
    org_id: str,
    state: Optional[str] = None,
    principal: Principal = Depends(get_principal),
):
    """Return all findings for the org, optionally filtered by state."""
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    findings = finding_repo.list_by_org(org_id)
    if state:
        findings = [f for f in findings if f.state == state]

    return {
        "org_id": org_id,
        "findings": [_serialize_finding(f) for f in findings],
        "total": len(findings),
    }


@router.get(
    "/organizations/{org_id}/findings/{finding_id}",
    summary="Get one finding with full event history",
)
def get_finding(
    org_id: str,
    finding_id: str,
    principal: Principal = Depends(get_principal),
):
    """Return a single finding with its full audit-event trail."""
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    finding = finding_repo.get(finding_id, org_id)
    if finding is None:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")

    return {"finding": _serialize_finding(finding, include_events=True)}


@router.post(
    "/organizations/{org_id}/findings/{finding_id}/transition",
    summary="Apply a state-machine transition to a finding",
)
def transition_finding(
    org_id: str,
    finding_id: str,
    payload: FindingTransition,
    principal: Principal = Depends(get_principal),
):
    """
    Apply a state transition (assign / start / submit / approve / reject / reopen / risk_accept).

    Self-approval prohibition: the same user who submitted a finding for review
    (action='submit') cannot also approve/close it (action='approve').
    Violation → 409.
    """
    require_org_access(principal, org_id)

    action = payload.action
    perm = ACTION_PERMISSIONS.get(action)
    if perm is None:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown action '{action}'. Valid actions: {sorted(ACTION_PERMISSIONS.keys())}.",
        )
    require_permission(principal, org_id, perm)

    finding = finding_repo.get(finding_id, org_id)
    if finding is None:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")

    # Self-approval prohibition: if approving, the same user must not have been
    # the one who submitted this finding for review.
    if action == "approve":
        last_remediator = finding_repo.last_remediator(finding)
        if last_remediator == principal.user_id:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Self-approval prohibited: you submitted this finding for review "
                    "and cannot also approve it. Assign a different reviewer."
                ),
            )

    if action == "assign" and not payload.assigned_to_user_id:
        raise HTTPException(
            status_code=422,
            detail="'assigned_to_user_id' is required when action='assign'.",
        )

    try:
        event = finding_repo.transition(
            finding,
            action=action,
            actor_user_id=principal.user_id,
            actor_name=principal.display_name,
            note=payload.note,
            assigned_to_user_id=payload.assigned_to_user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return {
        "finding": _serialize_finding(finding, include_events=True),
        "event": _serialize_event(event),
    }
