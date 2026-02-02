"""
Consent as a Service Platform - API Server

A server-side consent enforcement platform.

Features:
- Real JWT token signing (ES256)
- Database persistence (SQLite/PostgreSQL)
- API key authentication with scopes
- Rate limiting
- Webhook notifications
- Comprehensive error handling
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Header, Body, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import hashlib
import uuid
import traceback

# Services
from services.database import db
from services.auth import (
    auth_service, AuthContext, Scope,
    get_auth_context, require_auth, check_rate_limit
)
from services.token_service import (
    token_service, ConsentTokenRequest, ConsentToken,
    PurposeConsent, VendorConsent, ConsentConstraints,
    Jurisdiction, TokenStatus
)
from services.enforcement_engine import (
    enforcement_engine, AdEvent, EnforcementResult, Decision
)
from services.evidence_store import evidence_store, EventType
from services.vendor_service import vendor_service, ForwardingRequest, Vendor, VendorType
from services.webhook_service import webhook_service, WebhookEvent


# ============== Lifespan ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic"""
    # Startup
    await db.initialize()
    await webhook_service.start()
    await setup_demo_tenant()
    print("Consent Platform started")
    
    yield
    
    # Shutdown
    await webhook_service.stop()
    print("Consent Platform stopped")


async def setup_demo_tenant():
    """Setup demo tenant with API key"""
    tenant = await db.get_tenant("demo-tenant")
    if not tenant:
        # Create demo tenant
        from services.token_service import TenantKeys
        keys = TenantKeys.generate("demo-tenant")
        
        await db.create_tenant({
            "id": "demo-tenant",
            "name": "Demo Tenant",
            "domain": "demo.example.com",
            "public_key": keys._public_key_pem,
            "private_key_encrypted": keys._private_key_pem,  # In prod, encrypt this
            "key_version": 1,
            "failure_mode": "fail_closed"
        })
        
        # Create demo API key
        key, key_hash = auth_service.generate_api_key()
        await db.create_api_key({
            "id": str(uuid.uuid4()),
            "tenant_id": "demo-tenant",
            "key_hash": key_hash,
            "name": "Demo Key",
            "scopes": [s.value for s in Scope]
        })
        
        # Create demo vendors
        await db.create_vendor({
            "id": "vendor-meta",
            "tenant_id": "demo-tenant",
            "name": "meta",
            "display_name": "Meta (Facebook)",
            "vendor_type": "ad_platform",
            "allowed_data_classes": ["behavioral", "device", "identity"]
        })
        
        await db.create_vendor({
            "id": "vendor-google",
            "tenant_id": "demo-tenant",
            "name": "google",
            "display_name": "Google Ads",
            "vendor_type": "ad_platform",
            "allowed_data_classes": ["behavioral", "device", "identity", "transaction"]
        })
        
        print(f"Demo tenant created. API Key: {key}")


# ============== FastAPI App ==============

app = FastAPI(
    title="Consent as a Service Platform",
    description="Server-side consent enforcement for ad data",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Error Handling ==============

class APIError(Exception):
    """Custom API error"""
    def __init__(self, status_code: int, error: str, detail: str = None, 
                 errors: List[Dict] = None):
        self.status_code = status_code
        self.error = error
        self.detail = detail
        self.errors = errors


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error,
            "detail": exc.detail,
            "errors": exc.errors,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    # Log the error
    print(f"Unhandled error: {exc}")
    traceback.print_exc()
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "detail": "An unexpected error occurred",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )


# ============== Middleware ==============

@app.middleware("http")
async def add_rate_limit_headers(request: Request, call_next):
    """Add rate limit headers to response"""
    response = await call_next(request)
    
    if hasattr(request.state, "rate_limit"):
        rl = request.state.rate_limit
        response.headers["X-RateLimit-Limit"] = str(rl.limit)
        response.headers["X-RateLimit-Remaining"] = str(rl.remaining)
        if rl.reset_at:
            response.headers["X-RateLimit-Reset"] = str(int(rl.reset_at.timestamp()))
    
    return response


# ============== Request/Response Models ==============

class ConsentRequest(BaseModel):
    """Request to create consent"""
    user_id: str = Field(..., description="Hashed user ID")
    purposes: List[str] = Field(..., description="Consent purposes")
    vendors: List[str] = Field(..., description="Allowed vendors")
    ttl_days: int = Field(default=14, ge=1, le=365)
    jurisdiction: str = Field(default="GDPR")
    constraints: Optional[Dict[str, bool]] = None


class ConsentResponse(BaseModel):
    """Response with consent token"""
    consent_token: str
    token_id: str
    expires_at: datetime
    purposes: List[str]
    vendors: List[str]


class EventRequest(BaseModel):
    """Incoming ad event"""
    event_type: str
    user_id: str
    vendor: str
    data_classes: List[str] = []
    url: Optional[str] = None
    referrer: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    value: Optional[float] = None
    currency: Optional[str] = "USD"
    properties: Dict[str, Any] = {}
    is_cross_site: bool = False


class EventResponse(BaseModel):
    """Enforcement decision response"""
    decision: str
    reason: Optional[str] = None
    fields_stripped: List[str] = []
    forwarded: bool = False
    vendor_event_id: Optional[str] = None
    latency_ms: float


class WebhookCreateRequest(BaseModel):
    """Create webhook request"""
    url: str
    events: List[str] = ["*"]
    name: Optional[str] = None


class APIKeyCreateRequest(BaseModel):
    """Create API key request"""
    name: str
    scopes: List[str]
    expires_in_days: Optional[int] = None


# ============== Health ==============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }


# ============== Consent Endpoints ==============

@app.post("/consent", response_model=ConsentResponse)
async def create_consent(
    request: ConsentRequest,
    auth: AuthContext = Depends(check_rate_limit)
):
    """
    Issue a consent token.
    
    Requires scope: consent:write
    """
    if not auth.authenticated:
        raise APIError(401, "unauthorized", "Authentication required")
    
    auth.require_scope(Scope.CONSENT_WRITE)
    tenant_id = auth.tenant_id
    
    try:
        # Build purposes consent
        purposes = {}
        for purpose in request.purposes:
            purposes[purpose] = PurposeConsent(allowed=True, ttl_days=request.ttl_days)
        
        # Build vendors consent
        vendors = {}
        for vendor_name in request.vendors:
            vendor = await db.get_vendor(tenant_id, vendor_name)
            data_classes = vendor["allowed_data_classes"] if vendor else ["behavioral"]
            vendors[vendor_name] = VendorConsent(allowed=True, data_classes=data_classes)
        
        # Build constraints
        constraints = ConsentConstraints(**(request.constraints or {}))
        
        # Create token request
        token_request = ConsentTokenRequest(
            subject_id=request.user_id,
            purposes=purposes,
            vendors=vendors,
            constraints=constraints,
            jurisdiction=Jurisdiction(request.jurisdiction),
            ttl_days=request.ttl_days
        )
        
        # Issue token
        token = token_service.issue_token(tenant_id, token_request)
        
        # Store in database
        await db.store_token({
            "id": token.token_id,
            "tenant_id": tenant_id,
            "token_hash": token.token_hash,
            "subject_id": request.user_id,
            "purposes": {k: v.model_dump() for k, v in token.purposes.items()},
            "vendors": {k: v.model_dump() for k, v in token.vendors.items()},
            "constraints": token.constraints.model_dump(),
            "jurisdiction": token.jurisdiction.value,
            "issued_at": token.issued_at.isoformat(),
            "expires_at": token.expires_at.isoformat(),
            "key_version": token.key_version
        })
        
        # Log to evidence store
        evidence_store.log_consent_issued(
            tenant_id=tenant_id,
            token_id=token.token_id,
            subject_id=request.user_id,
            purposes=purposes,
            vendors=vendors,
            jurisdiction=request.jurisdiction,
            expires_at=token.expires_at
        )
        
        # Emit webhook
        await webhook_service.emit_consent_issued(
            tenant_id=tenant_id,
            token_id=token.token_id,
            subject_id=request.user_id,
            purposes=request.purposes,
            vendors=request.vendors,
            expires_at=token.expires_at
        )
        
        return ConsentResponse(
            consent_token=token.token,
            token_id=token.token_id,
            expires_at=token.expires_at,
            purposes=request.purposes,
            vendors=request.vendors
        )
    
    except ValueError as e:
        raise APIError(400, "invalid_request", str(e))


@app.post("/consent/revoke")
async def revoke_consent(
    token_id: str = Body(...),
    reason: str = Body(default="user_requested"),
    auth: AuthContext = Depends(require_auth)
):
    """Revoke a consent token"""
    auth.require_scope(Scope.CONSENT_WRITE)
    
    success = token_service.revoke_token(auth.tenant_id, token_id, reason)
    
    if success:
        await db.revoke_token(token_id, reason)
        
        evidence_store.log_consent_revoked(
            tenant_id=auth.tenant_id,
            token_id=token_id,
            subject_id="unknown",
            reason=reason
        )
        
        await webhook_service.emit_consent_revoked(
            tenant_id=auth.tenant_id,
            token_id=token_id,
            subject_id="unknown",
            reason=reason
        )
    
    return {"success": success, "token_id": token_id}


@app.get("/consent/tokens")
async def list_tokens(
    subject_id: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    auth: AuthContext = Depends(require_auth)
):
    """List consent tokens"""
    auth.require_scope(Scope.CONSENT_READ)
    
    tokens = await db.list_tokens(auth.tenant_id, subject_id, limit)
    
    return {
        "tokens": [
            {
                "token_id": t["id"],
                "subject_id": t["subject_id"],
                "purposes": list(t["purposes"].keys()),
                "vendors": list(t["vendors"].keys()),
                "issued_at": t["issued_at"],
                "expires_at": t["expires_at"],
                "revoked_at": t.get("revoked_at"),
                "status": "revoked" if t.get("revoked_at") else (
                    "expired" if datetime.fromisoformat(t["expires_at"]) < datetime.now(timezone.utc) else "active"
                )
            }
            for t in tokens
        ],
        "count": len(tokens)
    }


# ============== Event Processing ==============

@app.post("/event", response_model=EventResponse)
async def process_event(
    request: EventRequest,
    authorization: Optional[str] = Header(default=None),
    x_idempotency_key: Optional[str] = Header(default=None, alias="X-Idempotency-Key"),
    auth: AuthContext = Depends(check_rate_limit)
):
    """
    Process an ad event through enforcement.
    
    Requires scope: events:write
    """
    if not auth.authenticated:
        raise APIError(401, "unauthorized", "Authentication required")
    
    auth.require_scope(Scope.EVENTS_WRITE)
    tenant_id = auth.tenant_id
    
    # Check idempotency
    if x_idempotency_key:
        existing = await db.get_decision_by_idempotency_key(tenant_id, x_idempotency_key)
        if existing:
            return EventResponse(
                decision=existing["decision"],
                reason=existing.get("reason"),
                fields_stripped=existing.get("fields_stripped", []),
                forwarded=existing.get("forwarded", False),
                vendor_event_id=existing.get("vendor_event_id"),
                latency_ms=existing.get("latency_ms", 0)
            )
    
    # Extract token from Authorization header
    token_string = None
    if authorization and authorization.startswith("Bearer "):
        token_string = authorization[7:]
    
    # Build AdEvent
    event = AdEvent(
        event_id=str(uuid.uuid4()),
        event_type=request.event_type,
        vendor=request.vendor,
        data_classes=request.data_classes,
        user_id=request.user_id,
        ip_address=request.ip_address,
        user_agent=request.user_agent,
        url=request.url,
        referrer=request.referrer,
        value=request.value,
        currency=request.currency,
        properties=request.properties,
        is_cross_site=request.is_cross_site
    )
    
    # Enforce
    result = enforcement_engine.enforce(tenant_id, event, token_string)
    
    # Forward if allowed
    forwarded = False
    vendor_event_id = None
    vendor_response_code = None
    
    if result.decision in [Decision.ALLOWED, Decision.MODIFIED]:
        modified = result.modified_event or {}
        
        forward_request = ForwardingRequest(
            event_id=event.event_id,
            event_type=event.event_type,
            vendor=event.vendor,
            user_data={
                "user_id": modified.get("user_id"),
                "hashed_email": modified.get("hashed_email"),
                "hashed_phone": modified.get("hashed_phone"),
                "external_id": modified.get("external_id"),
                "ip_address": modified.get("ip_address"),
                "user_agent": modified.get("user_agent"),
            },
            event_data={
                "url": modified.get("url"),
                "referrer": modified.get("referrer"),
                "value": modified.get("value"),
                "currency": modified.get("currency"),
                "properties": modified.get("properties", {}),
            }
        )
        
        forward_result = await vendor_service.forward_event(tenant_id, forward_request)
        forwarded = forward_result.success
        vendor_event_id = forward_result.vendor_event_id
        vendor_response_code = forward_result.response_code
    
    # Store decision
    token_hash = hashlib.sha256(token_string.encode()).hexdigest() if token_string else None
    
    decision_record = {
        "id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "event_id": event.event_id,
        "idempotency_key": x_idempotency_key,
        "event_type": event.event_type,
        "vendor": event.vendor,
        "data_classes": event.data_classes,
        "token_hash": token_hash,
        "token_valid": result.token_valid,
        "token_expired": result.token_expired,
        "decision": result.decision.value,
        "reason": result.reason,
        "fields_stripped": result.fields_stripped,
        "fields_anonymized": result.fields_anonymized,
        "forwarded": forwarded,
        "forwarded_at": datetime.now(timezone.utc).isoformat() if forwarded else None,
        "vendor_response_code": vendor_response_code,
        "vendor_event_id": vendor_event_id,
        "latency_ms": result.latency_ms,
        "decision_hash": hashlib.sha256(
            f"{event.event_id}:{result.decision.value}".encode()
        ).hexdigest()
    }
    
    await db.store_decision(decision_record)
    
    # Log to evidence store
    evidence_store.log_enforcement_decision(
        tenant_id=tenant_id,
        event_id=event.event_id,
        vendor=event.vendor,
        decision=result.decision.value,
        reason=result.reason,
        token_hash=token_hash,
        fields_stripped=result.fields_stripped,
        latency_ms=result.latency_ms,
        forwarded=forwarded,
        vendor_response_code=vendor_response_code,
        vendor_event_id=vendor_event_id
    )
    
    # Emit webhook
    await webhook_service.emit_enforcement_decision(
        tenant_id=tenant_id,
        event_id=event.event_id,
        vendor=event.vendor,
        decision=result.decision.value,
        reason=result.reason,
        forwarded=forwarded
    )
    
    return EventResponse(
        decision=result.decision.value,
        reason=result.reason,
        fields_stripped=result.fields_stripped,
        forwarded=forwarded,
        vendor_event_id=vendor_event_id,
        latency_ms=round(result.latency_ms, 2)
    )


# ============== Audit Endpoints ==============

@app.get("/decisions")
async def get_decisions(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0),
    auth: AuthContext = Depends(require_auth)
):
    """Get enforcement decisions"""
    auth.require_scope(Scope.AUDIT_READ)
    
    decisions = await db.list_decisions(auth.tenant_id, limit, offset)
    
    return {
        "decisions": decisions,
        "count": len(decisions)
    }


@app.get("/audit/export")
async def export_audit(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    auth: AuthContext = Depends(require_auth)
):
    """Export audit data"""
    auth.require_scope(Scope.AUDIT_EXPORT)
    
    if start_date:
        start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    else:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    
    if end_date:
        end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    else:
        end = datetime.now(timezone.utc)
    
    export = evidence_store.export_for_audit(auth.tenant_id, start, end)
    
    return export.model_dump()


@app.get("/audit/verify")
async def verify_chain(auth: AuthContext = Depends(require_auth)):
    """Verify evidence chain integrity"""
    auth.require_scope(Scope.AUDIT_READ)
    
    result = evidence_store.verify_chain(auth.tenant_id)
    return result.model_dump()


# ============== Vendor Endpoints ==============

@app.get("/vendors")
async def list_vendors(auth: AuthContext = Depends(require_auth)):
    """List vendors"""
    auth.require_scope(Scope.ADMIN_READ)
    
    vendors = await db.list_vendors(auth.tenant_id)
    return {"vendors": vendors}


@app.post("/vendors")
async def create_vendor(
    vendor: Vendor,
    auth: AuthContext = Depends(require_auth)
):
    """Create a vendor"""
    auth.require_scope(Scope.ADMIN_WRITE)
    
    vendor.tenant_id = auth.tenant_id
    vendor.id = str(uuid.uuid4())
    
    await db.create_vendor(vendor.model_dump())
    
    return {"vendor": vendor.model_dump()}


# ============== Webhook Endpoints ==============

@app.get("/webhooks")
async def list_webhooks(auth: AuthContext = Depends(require_auth)):
    """List webhooks"""
    auth.require_scope(Scope.WEBHOOKS_READ)
    
    webhooks = await webhook_service.list_webhooks(auth.tenant_id)
    return {"webhooks": webhooks}


@app.post("/webhooks")
async def create_webhook(
    request: WebhookCreateRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Create a webhook"""
    auth.require_scope(Scope.WEBHOOKS_WRITE)
    
    webhook = await webhook_service.create_webhook(
        tenant_id=auth.tenant_id,
        url=request.url,
        events=request.events,
        name=request.name
    )
    
    return {
        "webhook": {
            "id": webhook.id,
            "url": webhook.url,
            "events": webhook.events,
            "secret": webhook.secret  # Only returned on creation
        }
    }


# ============== API Key Endpoints ==============

@app.get("/api-keys")
async def list_api_keys(auth: AuthContext = Depends(require_auth)):
    """List API keys"""
    auth.require_scope(Scope.ADMIN_READ)
    
    keys = await db.list_api_keys(auth.tenant_id)
    return {
        "api_keys": [
            {
                "id": k["id"],
                "name": k["name"],
                "scopes": k["scopes"],
                "last_used_at": k["last_used_at"],
                "status": k["status"],
                "created_at": k["created_at"]
            }
            for k in keys
        ]
    }


@app.post("/api-keys")
async def create_api_key(
    request: APIKeyCreateRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Create an API key"""
    auth.require_scope(Scope.ADMIN_WRITE)
    
    key, key_hash = auth_service.generate_api_key()
    key_id = str(uuid.uuid4())
    
    expires_at = None
    if request.expires_in_days:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=request.expires_in_days)).isoformat()
    
    await db.create_api_key({
        "id": key_id,
        "tenant_id": auth.tenant_id,
        "key_hash": key_hash,
        "name": request.name,
        "scopes": request.scopes,
        "expires_at": expires_at
    })
    
    return {
        "api_key": {
            "id": key_id,
            "key": key,  # Only returned on creation!
            "name": request.name,
            "scopes": request.scopes
        },
        "warning": "Save this key securely. It will not be shown again."
    }


@app.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    auth: AuthContext = Depends(require_auth)
):
    """Revoke an API key"""
    auth.require_scope(Scope.ADMIN_WRITE)
    
    await db.revoke_api_key(key_id)
    return {"success": True, "key_id": key_id}


# ============== Stats ==============

@app.get("/stats")
async def get_stats(auth: AuthContext = Depends(get_auth_context)):
    """Get platform statistics"""
    return {
        "evidence_store": evidence_store.get_stats(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============== Demo ==============

@app.post("/demo/flow")
async def demo_full_flow(auth: AuthContext = Depends(get_auth_context)):
    """Run a complete demo flow"""
    tenant_id = auth.tenant_id or "demo-tenant"
    
    # Step 1: Issue consent
    user_id = f"demo_user_{uuid.uuid4().hex[:8]}"
    purposes = {p: PurposeConsent(allowed=True, ttl_days=14) for p in ["retargeting", "analytics"]}
    vendors = {v: VendorConsent(allowed=True, data_classes=["behavioral", "device"]) for v in ["meta", "google"]}
    
    token_request = ConsentTokenRequest(
        subject_id=user_id,
        purposes=purposes,
        vendors=vendors,
        jurisdiction=Jurisdiction.GDPR,
        ttl_days=14
    )
    
    token = token_service.issue_token(tenant_id, token_request)
    
    evidence_store.log_consent_issued(
        tenant_id=tenant_id,
        token_id=token.token_id,
        subject_id=user_id,
        purposes=purposes,
        vendors=vendors,
        jurisdiction="GDPR",
        expires_at=token.expires_at
    )
    
    # Step 2: Send ad event
    event = AdEvent(
        event_id=str(uuid.uuid4()),
        event_type="purchase",
        vendor="meta",
        data_classes=["behavioral", "transaction"],
        user_id=user_id,
        url="https://demo.example.com/checkout",
        value=99.99,
        currency="USD"
    )
    
    result = enforcement_engine.enforce(tenant_id, event, token.token)
    
    # Forward
    forwarded = False
    vendor_event_id = None
    
    if result.decision in [Decision.ALLOWED, Decision.MODIFIED]:
        forward_request = ForwardingRequest(
            event_id=event.event_id,
            event_type=event.event_type,
            vendor=event.vendor,
            user_data={"user_id": event.user_id},
            event_data={"url": event.url, "value": event.value}
        )
        forward_result = await vendor_service.forward_event(tenant_id, forward_request)
        forwarded = forward_result.success
        vendor_event_id = forward_result.vendor_event_id
    
    # Log
    evidence_store.log_enforcement_decision(
        tenant_id=tenant_id,
        event_id=event.event_id,
        vendor=event.vendor,
        decision=result.decision.value,
        reason=result.reason,
        token_hash=hashlib.sha256(token.token.encode()).hexdigest(),
        fields_stripped=result.fields_stripped,
        latency_ms=result.latency_ms,
        forwarded=forwarded,
        vendor_event_id=vendor_event_id
    )
    
    return {
        "step_1_consent": {
            "token_id": token.token_id,
            "subject_id": user_id,
            "purposes": list(purposes.keys()),
            "vendors": list(vendors.keys()),
            "expires_at": token.expires_at.isoformat()
        },
        "step_2_event": {
            "event_id": event.event_id,
            "event_type": event.event_type,
            "vendor": event.vendor
        },
        "step_3_decision": {
            "decision": result.decision.value,
            "reason": result.reason,
            "latency_ms": round(result.latency_ms, 2),
            "forwarded": forwarded,
            "vendor_event_id": vendor_event_id
        }
    }


# ============== Main ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
