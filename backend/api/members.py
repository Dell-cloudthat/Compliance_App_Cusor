"""
SecurityOS Members API — Phase 2

Manages org membership: who belongs to an org and in what role.

Routes:
  GET    /api/v1/securityos/me
  GET    /api/v1/securityos/organizations/{org_id}/members
  POST   /api/v1/securityos/organizations/{org_id}/members
  PATCH  /api/v1/securityos/organizations/{org_id}/members/{user_id}
  DELETE /api/v1/securityos/organizations/{org_id}/members/{user_id}

Authorization:
  - GET /me — any authenticated caller
  - All org-member routes — requires org.manage permission
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.auth.context import Principal, get_principal, require_org_access
from backend.auth.permissions import PERM_ORG_MANAGE, require_permission
from backend.repositories.org_membership_repo import (
    OrgMembership,
    VALID_ROLES,
    org_membership_repo,
)

router = APIRouter(prefix="/api/v1/securityos", tags=["Members"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class MemberInvite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str = Field(..., min_length=1, description="The user_id from their JWT sub claim")
    role: str = Field(..., description=f"One of: {sorted(VALID_ROLES)}")
    expires_at: Optional[str] = Field(None, description="ISO-8601 expiry datetime (optional)")


class MemberRoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = Field(..., description=f"New role. One of: {sorted(VALID_ROLES)}")


def _serialize_membership(m: OrgMembership) -> dict:
    return {
        "user_id": m.user_id,
        "org_id": m.org_id,
        "role": m.role,
        "granted_by": m.granted_by,
        "granted_at": m.granted_at,
        "expires_at": m.expires_at,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/me", summary="Get your own profile and org memberships")
def get_me(principal: Principal = Depends(get_principal)):
    """
    Return the authenticated caller's identity and all org memberships.
    Identity fields come from the JWT.  Roles come from org_memberships.
    """
    memberships = [
        _serialize_membership(m)
        for m in org_membership_repo.list_by_user(principal.user_id)
    ]
    return {
        "user_id": principal.user_id,
        "email": principal.email,
        "display_name": principal.display_name,
        "org_id": principal.org_id,
        "msp_id": principal.msp_id,
        "memberships": memberships,
    }


@router.get(
    "/organizations/{org_id}/members",
    summary="List all members of an org",
)
def list_org_members(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """Return all membership rows for the given org.  Requires org.manage."""
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_ORG_MANAGE)

    members = org_membership_repo.list_by_org(org_id)
    return {
        "org_id": org_id,
        "members": [_serialize_membership(m) for m in members],
        "total": len(members),
    }


@router.post(
    "/organizations/{org_id}/members",
    status_code=201,
    summary="Add a member to an org (invite)",
)
def invite_member(
    org_id: str,
    payload: MemberInvite,
    principal: Principal = Depends(get_principal),
):
    """
    Add a user to this org with the specified role.

    The caller must have org.manage.  The server sets granted_by and granted_at.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_ORG_MANAGE)

    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role '{payload.role}'. Must be one of {sorted(VALID_ROLES)}.",
        )

    existing = org_membership_repo.get(payload.user_id, org_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"User '{payload.user_id}' is already a member of org '{org_id}'.",
        )

    membership = OrgMembership(
        user_id=payload.user_id,
        org_id=org_id,
        role=payload.role,
        granted_by=principal.user_id,
        granted_at=datetime.now(timezone.utc).isoformat(),
        expires_at=payload.expires_at,
    )
    org_membership_repo.add(membership)

    return {
        "message": f"User '{payload.user_id}' added to org '{org_id}' with role '{payload.role}'.",
        "membership": _serialize_membership(membership),
    }


@router.patch(
    "/organizations/{org_id}/members/{target_user_id}",
    summary="Change a member's role",
)
def change_member_role(
    org_id: str,
    target_user_id: str,
    payload: MemberRoleUpdate,
    principal: Principal = Depends(get_principal),
):
    """
    Update the role of an existing member.  Requires org.manage.
    An admin cannot downgrade their own role if they are the last admin.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_ORG_MANAGE)

    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role '{payload.role}'. Must be one of {sorted(VALID_ROLES)}.",
        )

    # Prevent last admin from demoting themselves
    if target_user_id == principal.user_id and payload.role != "admin":
        admins = [m for m in org_membership_repo.list_by_org(org_id) if m.role == "admin"]
        if len(admins) <= 1:
            raise HTTPException(
                status_code=409,
                detail="Cannot change your own role: you are the last admin in this org.",
            )

    try:
        org_membership_repo.update_role(
            target_user_id, org_id, payload.role, granted_by=principal.user_id
        )
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=f"User '{target_user_id}' is not a member of org '{org_id}'.",
        )

    membership = org_membership_repo.get(target_user_id, org_id)
    return {
        "message": f"Role updated to '{payload.role}'.",
        "membership": _serialize_membership(membership),
    }


@router.delete(
    "/organizations/{org_id}/members/{target_user_id}",
    status_code=204,
    summary="Remove a member from an org",
)
def remove_member(
    org_id: str,
    target_user_id: str,
    principal: Principal = Depends(get_principal),
):
    """
    Revoke a user's membership.  Requires org.manage.
    Cannot remove yourself if you are the last admin.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_ORG_MANAGE)

    existing = org_membership_repo.get(target_user_id, org_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"User '{target_user_id}' is not a member of org '{org_id}'.",
        )

    if target_user_id == principal.user_id and existing.role == "admin":
        admins = [m for m in org_membership_repo.list_by_org(org_id) if m.role == "admin"]
        if len(admins) <= 1:
            raise HTTPException(
                status_code=409,
                detail="Cannot remove yourself: you are the last admin in this org.",
            )

    org_membership_repo.remove(target_user_id, org_id)
