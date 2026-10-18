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

from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.api.api import CONTROLS_BY_ID
from backend.api.orgs import validate_future_iso
from backend.auth.context import Principal, get_principal, require_org_access
from backend.auth.permissions import (
    PERM_FINDING_APPROVE_CLOSE,
    PERM_FINDING_ASSIGN,
    PERM_FINDING_REMEDIATE,
    PERM_FINDING_VIEW,
    PERM_RISK_ACCEPT,
    effective_permissions,
    permissions_for_roles,
    require_any_permission,
    require_permission,
)
from backend.repositories.finding_repo import TRANSITIONS, AffectedResource, finding_repo
from backend.repositories.org_membership_repo import org_membership_repo, parse_iso, utcnow

router = APIRouter(prefix="/api/v1/securityos", tags=["Findings"])

VALID_SEVERITIES = frozenset({"critical", "high", "medium", "low", "info"})

# Severities whose closure needs an independent executive approval.
HIGH_RISK_SEVERITIES = frozenset({"critical", "high"})

# Risk acceptance limits.
RISK_ACCEPT_MAX_DAYS = 365
RISK_ACCEPT_MAX_DAYS_CRITICAL = 90
RISK_JUSTIFICATION_MIN_CHARS = 20

# Map action → required permission.  "approve" on Low/Medium/Info has an extra
# path (the submitting remediator may close it) handled in transition_finding.
ACTION_PERMISSIONS = {
    "assign":      PERM_FINDING_ASSIGN,
    "start":       PERM_FINDING_REMEDIATE,
    "submit":      PERM_FINDING_REMEDIATE,
    "approve":     PERM_FINDING_APPROVE_CLOSE,
    "reject":      PERM_FINDING_APPROVE_CLOSE,
    "reopen":      PERM_FINDING_APPROVE_CLOSE,
    "risk_accept": PERM_RISK_ACCEPT,
}


# ── Pydantic models ───────────────────────────────────────────────────────────

class AffectedResourceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    resource_type: str = Field(..., description="user | device | setting | cloud_resource | other")
    identifier: str = Field(..., min_length=1, max_length=500)
    details: Optional[str] = Field(None, max_length=1000)


class FindingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=300)
    description: str = Field(..., min_length=1, max_length=5000)
    severity: str = Field(..., description=f"One of: {sorted(VALID_SEVERITIES)}")
    control_ids: List[str] = Field(default_factory=list)
    # Engineering to-do fields
    affected_resources: List[AffectedResourceInput] = Field(
        default_factory=list,
        description="Which users, devices, or settings are affected.",
    )
    due_date: Optional[str] = Field(
        None,
        description="ISO-8601 date (YYYY-MM-DD) by which remediation must be complete.",
    )
    business_impact: Optional[str] = Field(None, max_length=2000)
    verification_evidence: Optional[str] = Field(
        None, max_length=2000,
        description="What evidence is required to prove this is fixed.",
    )
    definition_of_done: Optional[str] = Field(None, max_length=2000)


class FindingTransition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: str = Field(..., description="State-machine action to apply")
    note: Optional[str] = Field(None, max_length=2000)
    assigned_to_user_id: Optional[str] = Field(
        None, description="Required when action='assign'"
    )
    expires_at: Optional[str] = Field(
        None, description="Required when action='risk_accept' (ISO-8601, ≤365 days; ≤90 for critical)"
    )
    justification: Optional[str] = Field(
        None, max_length=2000, description="Required when action='risk_accept' (≥20 chars)"
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
        "is_overdue": f.is_overdue(),
        # Risk acceptance
        "risk_accepted_until": f.risk_accepted_until,
        "risk_justification": f.risk_justification,
        "risk_accepted_by": f.risk_accepted_by,
        "risk_acceptance_expired": f.risk_acceptance_expired(),
        # Engineering to-do
        "due_date": f.due_date,
        "business_impact": f.business_impact,
        "verification_evidence": f.verification_evidence,
        "definition_of_done": f.definition_of_done,
        "affected_resources": [
            {
                "resource_type": r.resource_type,
                "identifier": r.identifier,
                "details": r.details,
            }
            for r in (f.affected_resources or [])
        ],
        # Catalog-derived guidance
        "catalog_remediation_steps": f.catalog_remediation_steps,
        "catalog_estimated_minutes": f.catalog_estimated_minutes,
        "catalog_framework_mappings": f.catalog_framework_mappings,
        "catalog_verification_methods": f.catalog_verification_methods,
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
    Anyone who can triage (finding.assign) or do the work (finding.remediate)
    may log a finding.  Opening a finding can only lower the score.
    """
    require_org_access(principal, org_id)
    require_any_permission(principal, org_id, PERM_FINDING_ASSIGN, PERM_FINDING_REMEDIATE)

    unknown = [c for c in payload.control_ids if c not in CONTROLS_BY_ID]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown control_ids: {unknown}.")

    if payload.severity not in VALID_SEVERITIES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid severity '{payload.severity}'. Must be one of {sorted(VALID_SEVERITIES)}.",
        )

    if payload.due_date:
        try:
            from datetime import date as _date
            _date.fromisoformat(payload.due_date)
        except ValueError:
            raise HTTPException(status_code=422, detail="due_date must be a valid YYYY-MM-DD date.")

    # Auto-populate catalog guidance from all linked controls (merge lists, dedupe)
    all_steps: list = []
    all_methods: list = []
    all_mappings: dict = {}
    total_minutes = 0
    for cid in payload.control_ids:
        ctrl = CONTROLS_BY_ID[cid]
        for step in ctrl.get("remediation_steps", []):
            if step not in all_steps:
                all_steps.append(step)
        for m in ctrl.get("verification_methods", []):
            if m not in all_methods:
                all_methods.append(m)
        for framework, codes in (ctrl.get("framework_mappings") or {}).items():
            existing = all_mappings.setdefault(framework, [])
            for code in codes:
                if code not in existing:
                    existing.append(code)
        total_minutes += ctrl.get("estimated_minutes", 0)

    affected = [
        AffectedResource(
            resource_type=r.resource_type,
            identifier=r.identifier,
            details=r.details,
        )
        for r in payload.affected_resources
    ]

    finding = finding_repo.create(
        org_id=org_id,
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        control_ids=payload.control_ids,
        created_by_user_id=principal.user_id,
        created_by_name=principal.display_name,
        affected_resources=affected,
        due_date=payload.due_date,
        business_impact=payload.business_impact,
        verification_evidence=payload.verification_evidence,
        definition_of_done=payload.definition_of_done,
        catalog_remediation_steps=all_steps,
        catalog_estimated_minutes=total_minutes or None,
        catalog_framework_mappings=all_mappings,
        catalog_verification_methods=all_methods,
    )
    return {"finding": _serialize_finding(finding, include_events=True)}


@router.get(
    "/organizations/{org_id}/findings",
    summary="List findings for an org",
)
def list_findings(
    org_id: str,
    state: Optional[str] = None,
    severity: Optional[str] = None,
    overdue: Optional[bool] = None,
    assigned_to: Optional[str] = None,
    principal: Principal = Depends(get_principal),
):
    """
    Return all findings for the org.

    Optional filters:
    - **state**: one of open | assigned | in_progress | submitted_for_review | closed | risk_accepted | reopened
    - **severity**: one of critical | high | medium | low | info
    - **overdue**: true → only findings whose due_date has passed and are not closed
    - **assigned_to**: user_id of the engineer assigned to the finding
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    findings = finding_repo.list_by_org(org_id)
    if state:
        findings = [f for f in findings if f.state == state]
    if severity:
        if severity not in VALID_SEVERITIES:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid severity '{severity}'. Must be one of {sorted(VALID_SEVERITIES)}.",
            )
        findings = [f for f in findings if f.severity == severity]
    if overdue is True:
        findings = [f for f in findings if f.is_overdue()]
    if assigned_to:
        findings = [f for f in findings if f.assigned_to_user_id == assigned_to]

    # Sort: overdue first, then by severity, then by created_at desc
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    findings.sort(key=lambda f: (
        not f.is_overdue(),
        severity_order.get(f.severity, 5),
        f.created_at,
    ))

    return {
        "org_id": org_id,
        "findings": [_serialize_finding(f) for f in findings],
        "total": len(findings),
        "overdue_count": sum(1 for f in findings if f.is_overdue()),
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

    finding = finding_repo.get(finding_id, org_id)
    if finding is None:
        raise HTTPException(status_code=404, detail=f"Finding '{finding_id}' not found.")

    perms = effective_permissions(principal, org_id)
    if PERM_FINDING_VIEW not in perms:
        raise HTTPException(status_code=403, detail="Permission 'finding.view' is required.")

    if action == "approve":
        _check_approve(finding, principal, perms)
    else:
        require_permission(principal, org_id, perm)

    if action == "assign":
        _check_assignee(org_id, payload.assigned_to_user_id)

    risk_until = None
    if action == "risk_accept":
        risk_until = _check_risk_acceptance(finding, payload)

    try:
        event = finding_repo.transition(
            finding,
            action=action,
            actor_user_id=principal.user_id,
            actor_name=principal.display_name,
            note=payload.note,
            assigned_to_user_id=payload.assigned_to_user_id,
            risk_accepted_until=risk_until,
            risk_justification=payload.justification if action == "risk_accept" else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return {
        "finding": _serialize_finding(finding, include_events=True),
        "event": _serialize_event(event),
    }


# ── Transition guards ─────────────────────────────────────────────────────────

def _check_approve(finding, principal: Principal, perms: set) -> None:
    """
    High/Critical: requires finding.approve_close AND the approver did none of
    the remediation work.  Low/Medium/Info: an executive may approve, or the
    remediator who submitted it may close it themselves.
    """
    remediators = finding_repo.remediators(finding)

    if finding.severity in HIGH_RISK_SEVERITIES:
        if PERM_FINDING_APPROVE_CLOSE not in perms:
            raise HTTPException(
                status_code=403,
                detail=f"Closing a {finding.severity} finding requires 'finding.approve_close'.",
            )
        if principal.user_id in remediators:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Self-approval prohibited: you did remediation work on this "
                    f"{finding.severity} finding and cannot also approve it."
                ),
            )
        return

    if PERM_FINDING_APPROVE_CLOSE in perms:
        return
    if PERM_FINDING_REMEDIATE in perms and finding_repo.last_remediator(finding) == principal.user_id:
        return
    raise HTTPException(
        status_code=403,
        detail="Only an executive or the remediator who submitted this finding may close it.",
    )


def _check_assignee(org_id: str, assignee: Optional[str]) -> None:
    if not assignee:
        raise HTTPException(status_code=422, detail="'assigned_to_user_id' is required when action='assign'.")
    roles = org_membership_repo.active_roles(assignee, org_id)
    if PERM_FINDING_REMEDIATE not in permissions_for_roles(roles):
        raise HTTPException(
            status_code=422,
            detail="Assignee must be an active member who can remediate (engineer or MSP technician).",
        )


def _check_risk_acceptance(finding, payload: FindingTransition) -> str:
    if not payload.justification or len(payload.justification.strip()) < RISK_JUSTIFICATION_MIN_CHARS:
        raise HTTPException(
            status_code=422,
            detail=f"Risk acceptance requires a justification of at least {RISK_JUSTIFICATION_MIN_CHARS} characters.",
        )
    if not payload.expires_at:
        raise HTTPException(status_code=422, detail="Risk acceptance requires expires_at.")
    until = validate_future_iso(payload.expires_at, "expires_at")
    max_days = RISK_ACCEPT_MAX_DAYS_CRITICAL if finding.severity == "critical" else RISK_ACCEPT_MAX_DAYS
    if parse_iso(until) > utcnow() + timedelta(days=max_days):
        raise HTTPException(
            status_code=422,
            detail=f"Risk acceptance for a {finding.severity} finding may last at most {max_days} days.",
        )
    return until
