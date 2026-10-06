"""
SecurityOS Auth Context

Provides the `Principal` dataclass and the `get_principal()` FastAPI dependency.

Identity and tenant come ONLY from the verified JWT.  Never from the request
body, query string, or custom headers.

JWT claim mapping (works with Entra External ID and Auth0):
  sub          → user_id
  email / upn  → email
  name / preferred_username → display_name
  org_id       → org_id   (custom claim; must be present)
  msp_id       → msp_id   (optional custom claim; present for MSP accounts)
  roles        → roles     (list; may be empty)
  auth_time    → auth_time
  amr          → amr
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.auth.jwt import TokenError, verify_token

logger = logging.getLogger("securityos.auth.context")

_bearer = HTTPBearer(auto_error=False)


# ── Principal ─────────────────────────────────────────────────────────────────

@dataclass
class Principal:
    """Authenticated caller extracted from the verified JWT."""

    user_id: str
    email: str
    display_name: str
    org_id: str                          # The organization the caller belongs to
    msp_id: Optional[str]               # Set for MSP accounts; None otherwise
    roles: List[str] = field(default_factory=list)
    auth_time: Optional[int] = None
    amr: List[str] = field(default_factory=list)

    def is_msp(self) -> bool:
        return self.msp_id is not None

    def manages_org(self, org_id: str) -> bool:
        """True if this principal is the org's own member OR an MSP managing it."""
        return self.org_id == org_id or self.is_msp()


# ── Claim extraction ──────────────────────────────────────────────────────────

def _extract_principal(claims: dict) -> Principal:
    """Map JWT claims to a Principal.  Raises ValueError on missing required claims."""
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
        or claims.get("given_name", "") + " " + claims.get("family_name", "")
        or email
        or user_id
    ).strip()

    org_id = claims.get("org_id") or claims.get("tenant_id") or claims.get("tid") or ""
    if not org_id:
        raise ValueError(
            "JWT is missing 'org_id' claim.  "
            "Ensure the IdP is configured to include org_id in access tokens."
        )

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
        display_name=display_name,
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
    Returns HTTP 401 when:
      - No token is supplied
      - Token is expired, malformed, wrong issuer/audience, or alg=none
      - JWT is missing required claims (sub, org_id)
    """
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = verify_token(credentials.credentials)
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


# ── Tenant isolation helper ───────────────────────────────────────────────────

def require_org_access(principal: Principal, org_id: str) -> None:
    """
    Enforce tenant isolation.  Raises HTTP 404 (not 403) when the caller does
    not have access to the requested organization.  404 prevents org enumeration.
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
