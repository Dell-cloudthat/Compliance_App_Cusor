"""
SecurityOS Integrations API — Priority 4

Microsoft 365 (and future integrations) connect the platform to real identity,
device, and email data so controls can be verified automatically rather than
relying on manual attestation.

Design principles:
- Least-privilege OAuth: request only the Graph API scopes actually needed.
- Expired-consent handling: clearly surface when a token has expired so the
  MSP knows to re-authorize.
- Incomplete-collection status: distinguish "connected but still collecting"
  from "connected and data current" from "not connected".
- Never store raw OAuth tokens — only the consent metadata and collection state.

Routes:
  GET    /api/v1/securityos/organizations/{org_id}/integrations
  POST   /api/v1/securityos/organizations/{org_id}/integrations/m365/connect
  GET    /api/v1/securityos/organizations/{org_id}/integrations/m365/status
  DELETE /api/v1/securityos/organizations/{org_id}/integrations/m365/disconnect
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.auth.context import Principal, get_principal, require_org_access
from backend.auth.permissions import PERM_FINDING_VIEW, PERM_ORG_MANAGE, require_permission

router = APIRouter(prefix="/api/v1/securityos", tags=["Integrations"])


# ── Required Microsoft Graph API permissions (least-privilege) ────────────────

M365_REQUIRED_SCOPES: List[Dict] = [
    {
        "scope": "User.Read.All",
        "reason": "List all user accounts to check MFA enrollment and inactive accounts.",
        "least_privilege": True,
    },
    {
        "scope": "Policy.Read.All",
        "reason": "Read Conditional Access policies to verify MFA is enforced for all users.",
        "least_privilege": True,
    },
    {
        "scope": "AuditLog.Read.All",
        "reason": "Read sign-in logs to detect inactive accounts and suspicious activity.",
        "least_privilege": True,
    },
    {
        "scope": "DeviceManagementManagedDevices.Read.All",
        "reason": "Check device compliance and encryption status via Intune.",
        "least_privilege": True,
    },
    {
        "scope": "SecurityEvents.Read.All",
        "reason": "Read Microsoft Secure Score and security alert data.",
        "least_privilege": True,
    },
    {
        "scope": "Reports.Read.All",
        "reason": "Access usage reports for email security (anti-spam, anti-phishing).",
        "least_privilege": True,
    },
]

# Controls that M365 integration can automatically verify
M365_VERIFIABLE_CONTROLS: List[str] = [
    "CTRL-ID-001",  # MFA
    "CTRL-ID-002",  # Privileged Account Protection
    "CTRL-ID-003",  # User Access Review
    "CTRL-ID-004",  # Password Policy
    "CTRL-DEV-001", # Device Encryption
    "CTRL-DEV-003", # Endpoint Protection (via Defender)
    "CTRL-NET-004", # Admin Access Control
]


# ── In-memory integration store ───────────────────────────────────────────────

@dataclass
class IntegrationRecord:
    integration_id: str
    org_id: str
    provider: str                    # "microsoft_365"
    status: str                      # "pending_consent" | "active" | "expired" | "disconnected"
    connected_by_user_id: str
    connected_at: str
    tenant_id: Optional[str] = None  # Azure AD tenant ID
    tenant_domain: Optional[str] = None
    # Consent metadata (never the raw token)
    consent_granted_at: Optional[str] = None
    consent_expires_at: Optional[str] = None
    consent_scopes: List[str] = field(default_factory=list)
    # Collection state
    collection_status: str = "not_started"  # "not_started" | "in_progress" | "complete" | "failed"
    last_collection_at: Optional[str] = None
    last_collection_error: Optional[str] = None
    controls_verified: List[str] = field(default_factory=list)
    collection_summary: Dict = field(default_factory=dict)
    updated_at: str = ""


class _IntegrationStore:
    def __init__(self) -> None:
        self._records: Dict[str, IntegrationRecord] = {}  # org_id:provider → record
        self._lock = threading.Lock()

    def _key(self, org_id: str, provider: str) -> str:
        return f"{org_id}:{provider}"

    def get(self, org_id: str, provider: str) -> Optional[IntegrationRecord]:
        with self._lock:
            return self._records.get(self._key(org_id, provider))

    def list_by_org(self, org_id: str) -> List[IntegrationRecord]:
        with self._lock:
            return [r for r in self._records.values() if r.org_id == org_id]

    def upsert(self, record: IntegrationRecord) -> IntegrationRecord:
        with self._lock:
            self._records[self._key(record.org_id, record.provider)] = record
            return record

    def remove(self, org_id: str, provider: str) -> bool:
        with self._lock:
            key = self._key(org_id, provider)
            if key in self._records:
                del self._records[key]
                return True
            return False

    def remove_org(self, org_id: str) -> None:
        with self._lock:
            for key in [k for k in self._records if k.startswith(f"{org_id}:")]:
                del self._records[key]

    def _clear(self) -> None:
        with self._lock:
            self._records.clear()


integration_store = _IntegrationStore()


# ── Pydantic models ───────────────────────────────────────────────────────────

class M365ConnectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tenant_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Azure Active Directory tenant ID (GUID or domain).",
    )
    tenant_domain: Optional[str] = Field(
        None, max_length=253,
        description="Primary domain of the M365 tenant, e.g. contoso.com",
    )
    # In a real implementation the caller would provide an OAuth authorization
    # code; here we accept it as an opaque string so the flow is sketched out
    # without a real OAuth exchange.
    authorization_code: Optional[str] = Field(
        None,
        description=(
            "OAuth 2.0 authorization code from the Microsoft consent redirect. "
            "Omit to receive a consent URL instead of completing the connection."
        ),
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_integration(r: IntegrationRecord) -> dict:
    now = datetime.now(timezone.utc)

    # Determine if consent has expired
    consent_expired = False
    if r.consent_expires_at:
        try:
            exp = datetime.fromisoformat(r.consent_expires_at)
            consent_expired = exp <= now
        except ValueError:
            pass

    effective_status = r.status
    if effective_status == "active" and consent_expired:
        effective_status = "expired"

    return {
        "integration_id": r.integration_id,
        "provider": r.provider,
        "provider_display": "Microsoft 365",
        "status": effective_status,
        "consent_expired": consent_expired,
        "tenant_id": r.tenant_id,
        "tenant_domain": r.tenant_domain,
        "connected_by_user_id": r.connected_by_user_id,
        "connected_at": r.connected_at,
        "consent_granted_at": r.consent_granted_at,
        "consent_expires_at": r.consent_expires_at,
        "consent_scopes": r.consent_scopes,
        "collection_status": r.collection_status,
        "last_collection_at": r.last_collection_at,
        "last_collection_error": r.last_collection_error,
        "controls_verified": r.controls_verified,
        "collection_summary": r.collection_summary,
        "updated_at": r.updated_at,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get(
    "/organizations/{org_id}/integrations",
    summary="List active integrations for an org",
)
def list_integrations(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """
    Return all configured integrations for this organisation, including their
    current consent status and last collection state.

    Expired consent is clearly flagged so the MSP knows to re-authorize before
    the next automated evidence collection run.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    records = integration_store.list_by_org(org_id)
    integrations = [_serialize_integration(r) for r in records if r.status != "disconnected"]

    available_providers = [
        {
            "provider": "microsoft_365",
            "display_name": "Microsoft 365",
            "description": (
                "Automatically verify MFA, Conditional Access, device compliance, "
                "and more via Microsoft Graph API."
            ),
            "verifiable_controls": M365_VERIFIABLE_CONTROLS,
            "required_scopes": M365_REQUIRED_SCOPES,
            "connected": any(i["provider"] == "microsoft_365" for i in integrations),
        }
    ]

    return {
        "org_id": org_id,
        "integrations": integrations,
        "available_providers": available_providers,
        "total_connected": len(integrations),
    }


@router.post(
    "/organizations/{org_id}/integrations/m365/connect",
    status_code=201,
    summary="Initiate or complete Microsoft 365 OAuth consent",
)
def connect_m365(
    org_id: str,
    payload: M365ConnectRequest,
    principal: Principal = Depends(get_principal),
):
    """
    Connect Microsoft 365 to this organisation for automated control verification.

    **Two-step flow:**

    1. **Without `authorization_code`**: returns a consent URL for the admin to
       visit.  The admin grants the required Graph API permissions in the
       Microsoft consent screen, then is redirected back with an authorization
       code.

    2. **With `authorization_code`**: completes the OAuth exchange, stores the
       consent metadata (not the raw token), and marks the integration as
       `active`.  A background collection job will then begin verifying controls.

    **Least-privilege**: only the scopes listed in `required_scopes` are
    requested.  No write permissions are ever requested.

    **Re-authorization**: if the integration is already active but consent has
    expired, call this endpoint again with a new `authorization_code` to refresh
    the connection without losing historical collection data.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_ORG_MANAGE)

    existing = integration_store.get(org_id, "microsoft_365")

    if not payload.authorization_code:
        # Step 1: return the consent URL (stub — real impl would build the URL
        # using the Azure AD OAuth2 endpoint with the required scopes).
        scope_str = " ".join(s["scope"] for s in M365_REQUIRED_SCOPES)
        consent_url = (
            f"https://login.microsoftonline.com/{payload.tenant_id}/oauth2/v2.0/authorize"
            f"?client_id=<APP_CLIENT_ID>"
            f"&response_type=code"
            f"&redirect_uri=<REDIRECT_URI>"
            f"&scope={scope_str}"
            f"&response_mode=query"
            f"&state={org_id}"
        )
        return {
            "status": "consent_required",
            "tenant_id": payload.tenant_id,
            "consent_url": consent_url,
            "required_scopes": M365_REQUIRED_SCOPES,
            "instruction": (
                "Have your Microsoft 365 Global Admin visit the consent_url above. "
                "After granting permissions they will be redirected with an "
                "authorization_code — pass it back to this endpoint to complete the connection."
            ),
        }

    # Step 2: complete the connection (stub token exchange)
    now = datetime.now(timezone.utc)
    # In production: exchange the authorization_code for an access token + refresh token
    # via the Microsoft identity platform token endpoint.  Store only the consent metadata.
    consent_granted_at = now.isoformat()
    # Graph API access tokens expire after 1 hour; refresh tokens last ~90 days.
    consent_expires_at = (now + timedelta(days=89)).isoformat()

    if existing and existing.status not in ("disconnected",):
        # Re-authorization: preserve collection history
        record = existing
        record.status = "active"
        record.consent_granted_at = consent_granted_at
        record.consent_expires_at = consent_expires_at
        record.consent_scopes = [s["scope"] for s in M365_REQUIRED_SCOPES]
        record.tenant_id = payload.tenant_id
        record.tenant_domain = payload.tenant_domain
        record.updated_at = now.isoformat()
        record.collection_status = "in_progress"
        record.last_collection_error = None
    else:
        record = IntegrationRecord(
            integration_id=str(uuid.uuid4()),
            org_id=org_id,
            provider="microsoft_365",
            status="active",
            connected_by_user_id=principal.user_id,
            connected_at=now.isoformat(),
            tenant_id=payload.tenant_id,
            tenant_domain=payload.tenant_domain,
            consent_granted_at=consent_granted_at,
            consent_expires_at=consent_expires_at,
            consent_scopes=[s["scope"] for s in M365_REQUIRED_SCOPES],
            collection_status="in_progress",
            updated_at=now.isoformat(),
        )

    integration_store.upsert(record)

    return {
        "integration_id": record.integration_id,
        "status": "active",
        "provider": "microsoft_365",
        "tenant_id": payload.tenant_id,
        "tenant_domain": payload.tenant_domain,
        "consent_granted_at": consent_granted_at,
        "consent_expires_at": consent_expires_at,
        "consent_scopes": record.consent_scopes,
        "collection_status": "in_progress",
        "verifiable_controls": M365_VERIFIABLE_CONTROLS,
        "message": (
            "Microsoft 365 connected successfully. Evidence collection has started. "
            "Control statuses will update within a few minutes as data is collected."
        ),
        "re_authorization": existing is not None,
    }


@router.get(
    "/organizations/{org_id}/integrations/m365/status",
    summary="Microsoft 365 integration status and collection progress",
)
def get_m365_status(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """
    Return the current consent and data-collection status for the M365 integration.

    Collection states:
    - **not_started** — integration exists but no collection has run yet
    - **in_progress** — collection job is running; control statuses may be incomplete
    - **complete** — all verifiable controls have been checked; statuses are current
    - **failed** — collection failed; see `last_collection_error` for details

    Consent states:
    - **active** — consent is valid; automated collection can run
    - **expired** — the OAuth consent has expired; re-authorize via /connect
    - **pending_consent** — waiting for the admin to complete the consent flow

    When `collection_status == "in_progress"`, callers should poll this endpoint
    every 30 seconds until it transitions to `complete` or `failed`.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    record = integration_store.get(org_id, "microsoft_365")
    if record is None or record.status == "disconnected":
        return {
            "org_id": org_id,
            "provider": "microsoft_365",
            "connected": False,
            "status": "not_connected",
            "verifiable_controls": M365_VERIFIABLE_CONTROLS,
            "required_scopes": M365_REQUIRED_SCOPES,
            "message": "Microsoft 365 is not connected. Use POST /integrations/m365/connect to begin.",
        }

    serialized = _serialize_integration(record)

    # Add action guidance based on current state
    action_required: Optional[str] = None
    if serialized["consent_expired"]:
        action_required = (
            "Consent has expired. Re-authorize via POST /integrations/m365/connect "
            "to resume automated evidence collection."
        )
    elif serialized["collection_status"] == "failed":
        action_required = (
            f"Collection failed: {record.last_collection_error}. "
            "Check network access to Microsoft Graph API and re-try."
        )
    elif serialized["collection_status"] == "in_progress":
        action_required = "Collection is running. Poll again in 30 seconds."

    return {
        "org_id": org_id,
        "connected": True,
        **serialized,
        "verifiable_controls": M365_VERIFIABLE_CONTROLS,
        "action_required": action_required,
    }


@router.delete(
    "/organizations/{org_id}/integrations/m365/disconnect",
    status_code=204,
    summary="Disconnect and revoke Microsoft 365 integration",
)
def disconnect_m365(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """
    Disconnect the M365 integration and mark consent as revoked.

    This does NOT delete historical collection data or revert control statuses
    that were set by the integration — those remain as manual evidence until
    explicitly updated.  Requires org.manage.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_ORG_MANAGE)

    record = integration_store.get(org_id, "microsoft_365")
    if record is None or record.status == "disconnected":
        raise HTTPException(status_code=404, detail="Microsoft 365 integration is not connected.")

    now = datetime.now(timezone.utc)
    record.status = "disconnected"
    record.updated_at = now.isoformat()
    record.collection_status = "not_started"
    integration_store.upsert(record)
    # Return 204 No Content
