"""
SecurityOS Auth Context — Phase 2.1

Provides the `Principal` dataclass and the `get_principal()` FastAPI dependency.

Identity comes ONLY from the verified JWT.
Access to an org comes ONLY from an active row in org_memberships.

Phase 2.1 change — `org_id` claim is now OPTIONAL:
  Orgs are created by the server (POST /organizations, POST /msp/{id}/orgs) with
  server-generated IDs, and people join them through invites.  The token's
  `org_id` claim is no longer used for authorization at all, so requiring it
  only blocked sign-up.  The Phase 1.1 safety property still holds: a token
  carrying only Entra `tid` (or any org-looking claim) grants access to nothing
  until the user holds a membership.  The `tid` fallback remains removed.

JWT claim mapping (Entra External ID and Auth0):
  sub          → user_id   (required)
  email / upn / preferred_username → email
  name         → display_name
  org_id       → org_id   (optional hint only — never used for authorization)
  msp_id       → msp_id   (optional; identifies MSP staff for /msp routes)
  roles        → roles     (ignored for authorization)
  auth_time    → auth_time
  amr          → amr
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import List, Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.auth.jwt import TokenError, verify_token
from backend.repositories.org_membership_repo import org_membership_repo

logger = logging.getLogger("securityos.auth.context")

_bearer = HTTPBearer(auto_error=False)


# ── Principal ─────────────────────────────────────────────────────────────────

@dataclass
class Principal:
    """Authenticated caller extracted from the verified JWT."""

    user_id: str
    email: str
    display_name: str
    org_id: Optional[str]                # Home-org hint from the token; NOT used for authz
    msp_id: Optional[str]                # Set for MSP staff; None otherwise
    roles: List[str] = field(default_factory=list)
    auth_time: Optional[int] = None
    amr: List[str] = field(default_factory=list)

    def is_msp(self) -> bool:
        return self.msp_id is not None

    def manages_org(self, org_id: str) -> bool:
        """
        True if this principal holds at least one ACTIVE membership in org_id.

        This is the only way to reach an org.  Matching the token's org_id
        claim, or being MSP staff, is not sufficient on its own.
        """
        return org_membership_repo.has_any_active(self.user_id, org_id)


# ── Claim extraction ──────────────────────────────────────────────────────────

def _extract_principal(claims: dict) -> Principal:
    """
    Map JWT claims to a Principal.

    Raises ValueError on missing required claims so the caller can return 401.
    The `tid`/`tenant_id` fallback that mapped Entra tenant IDs to org_id has
    been removed: it silently merged all users in a tenant into one SecurityOS
    org, which broke multi-org Entra deployments.  Callers must emit an explicit
    `org_id` claim via a custom claims provider (see docs/auth-setup.md).
    """
    user_id = claims.get("sub") or claims.get("oid") or ""
    if not user_id:
        raise ValueError("JWT is missing 'sub' claim.")

    email = (
        claims.get("email")
        or claims.get("upn")
        or claims.get("preferred_username")
        or ""
    )

    display_name = (
        claims.get("name")
        or (claims.get("given_name", "") + " " + claims.get("family_name", "")).strip()
        or email
        or user_id
    )

    # org_id is an optional hint.  The `tid` (Entra tenant ID) fallback stays
    # removed: `tid` is never read, so it cannot merge users into one org.
    org_id: Optional[str] = claims.get("org_id") or None

    msp_id: Optional[str] = claims.get("msp_id") or None

    roles_raw = claims.get("roles") or claims.get("groups") or []
    if isinstance(roles_raw, str):
        roles_raw = [roles_raw]
    roles: List[str] = [str(r) for r in roles_raw]

    auth_time: Optional[int] = claims.get("auth_time")
    amr_raw = claims.get("amr") or []
    if isinstance(amr_raw, str):
        amr_raw = [amr_raw]
    amr: List[str] = [str(a) for a in amr_raw]

    return Principal(
        user_id=user_id,
        email=email,
        display_name=display_name.strip(),
        org_id=org_id,
        msp_id=msp_id,
        roles=roles,
        auth_time=auth_time,
        amr=amr,
    )


# ── FastAPI dependency ─────────────────────────────────────────────────────────

async def get_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Principal:
    """
    FastAPI dependency that verifies the Bearer token and returns a Principal.

    Token verification (which may include a blocking JWKS/OIDC discovery HTTP
    fetch) runs in a thread-pool executor so the asyncio event loop is never
    blocked.

    Returns HTTP 401 when:
      - No Authorization header is provided
      - Token is expired, malformed, wrong iss/aud/alg, or alg=none
      - JWT is missing required claims (sub, org_id)
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    loop = asyncio.get_running_loop()
    try:
        claims = await loop.run_in_executor(None, verify_token, credentials.credentials)
    except TokenError as exc:
        logger.warning("Token verification failed: %s", exc.message)
        raise HTTPException(
            status_code=401,
            detail=exc.message,
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        principal = _extract_principal(claims)
    except ValueError as exc:
        logger.warning("Token claims extraction failed: %s", exc)
        raise HTTPException(
            status_code=401,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )

    return principal


# ── Tenant isolation helpers ───────────────────────────────────────────────────

def require_org_access(principal: Principal, org_id: str) -> None:
    """
    Enforce tenant isolation.  Raises HTTP 404 (not 403) unless the caller holds
    an active membership in the org.  404 prevents org enumeration.  Expired
    memberships (e.g. a finished auditor engagement) are treated as absent.
    """
    if not principal.manages_org(org_id):
        raise HTTPException(
            status_code=404,
            detail=f"Organization '{org_id}' not found.",
        )


def require_msp_access(principal: Principal, msp_id: str) -> None:
    """
    Enforce MSP isolation.  Raises HTTP 404 when the caller's msp_id does not
    match the requested msp_id.
    """
    if principal.msp_id != msp_id:
        raise HTTPException(
            status_code=404,
            detail=f"MSP account '{msp_id}' not found.",
        )
