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
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import hashlib
import uuid
import traceback
import time

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
from services.tcf_service import tcf_service, TCFPurpose
from services.gcm_service import gcm_service, GCMConsentSettings, GCMTagConfig
from services.vendor_certification import (
    vendor_certification_service, 
    TrustTier, ViolationType, ViolationSeverity, CheckType,
    VendorCertification, Violation, ComplianceCheck, TrustRegistryEntry
)
from services.metrics_service import metrics
from services.logging_service import (
    logger, audit_logger, LogEvent, 
    set_request_id, set_tenant_id, generate_request_id
)


# ============== Lifespan ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic"""
    # Startup
    logger.info(LogEvent.SERVICE_STARTED, version="1.0.0")
    await db.initialize()
    logger.info(LogEvent.DATABASE_CONNECTED)
    await webhook_service.start()
    await setup_demo_tenant()
    logger.info("Platform ready", status="healthy")
    
    yield
    
    # Shutdown
    await webhook_service.stop()
    logger.info(LogEvent.SERVICE_STOPPED)


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
async def request_tracking_middleware(request: Request, call_next):
    """Track requests with ID and metrics"""
    start_time = time.time()
    
    # Generate or extract request ID
    request_id = request.headers.get("X-Request-ID", generate_request_id())
    set_request_id(request_id)
    
    # Extract tenant ID if present
    tenant_id = request.headers.get("X-Tenant-ID")
    if tenant_id:
        set_tenant_id(tenant_id)
    
    # Process request
    try:
        response = await call_next(request)
        
        # Record metrics
        duration = time.time() - start_time
        endpoint = request.url.path
        metrics.record_request(
            method=request.method,
            endpoint=endpoint,
            status=response.status_code,
            duration=duration
        )
        
        # Add request ID to response
        response.headers["X-Request-ID"] = request_id
        
        return response
    except Exception as e:
        duration = time.time() - start_time
        metrics.record_request(
            method=request.method,
            endpoint=request.url.path,
            status=500,
            duration=duration
        )
        raise


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


@app.get("/metrics", response_class=PlainTextResponse)
async def get_metrics():
    """
    Prometheus metrics endpoint.
    
    Returns metrics in Prometheus exposition format.
    Scrape this endpoint with Prometheus at regular intervals.
    """
    return metrics.export_prometheus()


@app.get("/metrics/summary")
async def get_metrics_summary():
    """Get a JSON summary of key metrics"""
    return metrics.get_summary()


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
        
        # Record metrics
        metrics.record_token_issued(tenant_id, request.jurisdiction)
        
        # Audit log
        audit_logger.log_consent_issued(
            tenant_id=tenant_id,
            token_id=token.token_id,
            subject_id=request.user_id,
            purposes=request.purposes,
            vendors=request.vendors,
            jurisdiction=request.jurisdiction
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
    
    # Check vendor certification before forwarding
    vendor_allowed, vendor_reason = vendor_certification_service.check_vendor_allowed(event.vendor)
    
    # Forward if consent allowed AND vendor is certified
    forwarded = False
    vendor_event_id = None
    vendor_response_code = None
    vendor_blocked_reason = None
    
    if result.decision in [Decision.ALLOWED, Decision.MODIFIED]:
        if not vendor_allowed:
            # Vendor not certified - block forwarding
            vendor_blocked_reason = vendor_reason
            result.decision = Decision.BLOCKED
            result.reason = f"Vendor certification: {vendor_reason}"
        else:
            # Record event processed for vendor compliance tracking
            vendor_certification_service.record_event_processed(event.vendor, True)
        
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
    
    # Record metrics
    metrics.record_enforcement(tenant_id, event.vendor, result.decision.value, result.latency_ms)
    if forwarded:
        metrics.record_event_forwarded(event.vendor, True)
    elif result.decision == Decision.BLOCKED:
        metrics.record_event_forwarded(event.vendor, False)
    
    # Audit log
    audit_logger.log_enforcement(
        tenant_id=tenant_id,
        event_id=event.event_id,
        vendor=event.vendor,
        decision=result.decision.value,
        reason=result.reason,
        token_hash=token_hash
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


@app.get("/webhooks/{webhook_id}/logs")
async def get_webhook_logs(
    webhook_id: str,
    limit: int = Query(default=50, le=200),
    auth: AuthContext = Depends(require_auth)
):
    """Get delivery logs for a webhook"""
    auth.require_scope(Scope.WEBHOOKS_READ)
    
    logs = webhook_service.get_delivery_logs(webhook_id, limit)
    stats = webhook_service.get_delivery_stats(webhook_id)
    
    return {
        "logs": [
            {
                "id": l.id,
                "event_id": l.event_id,
                "status": l.status.value,
                "attempts": l.attempts,
                "last_attempt_at": l.last_attempt_at.isoformat() if l.last_attempt_at else None,
                "response_code": l.response_code,
                "error": l.error
            }
            for l in logs
        ],
        "stats": stats
    }


@app.post("/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    auth: AuthContext = Depends(require_auth)
):
    """
    Send a test webhook to verify the endpoint.
    """
    auth.require_scope(Scope.WEBHOOKS_WRITE)
    
    # Get webhook
    webhooks = await webhook_service.list_webhooks(auth.tenant_id)
    webhook = next((w for w in webhooks if w["id"] == webhook_id), None)
    
    if not webhook:
        raise APIError(404, "not_found", "Webhook not found")
    
    # Create test payload
    from services.webhook_service import WebhookPayload, WebhookEvent
    
    test_payload = WebhookPayload(
        id=str(uuid.uuid4()),
        event="test.ping",
        created_at=datetime.now(timezone.utc),
        tenant_id=auth.tenant_id,
        data={
            "message": "This is a test webhook delivery",
            "webhook_id": webhook_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        idempotency_key=f"test_{uuid.uuid4().hex}"
    )
    
    # Deliver synchronously for test
    await webhook_service._deliver(webhook, test_payload, attempt=1)
    
    # Get latest log for this webhook
    logs = webhook_service.get_delivery_logs(webhook_id, limit=1)
    latest = logs[0] if logs else None
    
    return {
        "success": latest.status.value == "success" if latest else False,
        "delivery": {
            "id": latest.id if latest else None,
            "status": latest.status.value if latest else "unknown",
            "response_code": latest.response_code if latest else None,
            "error": latest.error if latest else None
        }
    }


@app.get("/webhooks/logs")
async def get_all_webhook_logs(
    limit: int = Query(default=100, le=500),
    auth: AuthContext = Depends(require_auth)
):
    """Get all delivery logs for tenant's webhooks"""
    auth.require_scope(Scope.WEBHOOKS_READ)
    
    logs = webhook_service.get_delivery_logs(limit=limit)
    stats = webhook_service.get_delivery_stats()
    
    return {
        "logs": [
            {
                "id": l.id,
                "webhook_id": l.webhook_id,
                "event_id": l.event_id,
                "status": l.status.value,
                "attempts": l.attempts,
                "last_attempt_at": l.last_attempt_at.isoformat() if l.last_attempt_at else None,
                "response_code": l.response_code,
                "error": l.error
            }
            for l in logs
        ],
        "stats": stats
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


# ============== TCF 2.2 Endpoints ==============

class TCFGenerateRequest(BaseModel):
    """Request to generate TCF string"""
    purposes: List[str]
    vendors: List[str]
    language: str = "EN"
    special_features: List[int] = []


@app.post("/tcf/generate")
async def generate_tcf_string(
    request: TCFGenerateRequest,
    auth: AuthContext = Depends(get_auth_context)
):
    """
    Generate a TCF 2.2 compliant consent string.
    
    Maps our purposes/vendors to IAB TCF format.
    """
    result = tcf_service.generate_tc_string(
        purposes=request.purposes,
        vendors=request.vendors,
        language=request.language,
        special_features=request.special_features
    )
    
    return {
        "tc_string": result.tc_string,
        "version": result.version,
        "created": result.created.isoformat(),
        "tcf_purposes": result.purposes_consented,
        "tcf_vendors": result.vendors_consented,
        "decoded": result.decoded
    }


@app.get("/tcf/decode")
async def decode_tcf_string(
    tc_string: str = Query(..., description="TC string to decode")
):
    """Decode a TCF consent string"""
    decoded = tcf_service.decode_tc_string(tc_string)
    return {"decoded": decoded}


@app.get("/tcf/purposes")
async def get_tcf_purposes():
    """Get list of TCF 2.2 standard purposes"""
    return {"purposes": tcf_service.get_purpose_info()}


@app.get("/tcf/api-response")
async def get_tcf_api_response(
    tc_string: str = Query(...),
    command: str = Query(default="getTCData")
):
    """
    Get __tcfapi response format.
    
    Useful for testing TCF API integration.
    """
    return tcf_service.get_tcf_api_response(tc_string, command)


@app.post("/tcf/from-token")
async def generate_tcf_from_token(
    token: str = Body(..., embed=True),
    language: str = Body(default="EN", embed=True),
    auth: AuthContext = Depends(get_auth_context)
):
    """
    Generate TCF string from an existing consent token.
    """
    tenant_id = auth.tenant_id or "demo-tenant"
    
    # Validate and decode token
    validation = token_service.validate_token(tenant_id, token)
    if not validation.valid:
        raise HTTPException(status_code=400, detail=f"Invalid token: {validation.reason}")
    
    # Generate TCF string from token contents
    result = tcf_service.generate_for_consent_token(
        token_purposes={p: {"allowed": v.allowed} for p, v in validation.purposes.items()},
        token_vendors={v: {"allowed": d.allowed} for v, d in validation.vendors.items()},
        language=language
    )
    
    return {
        "tc_string": result.tc_string,
        "tcf_purposes": result.purposes_consented,
        "tcf_vendors": result.vendors_consented
    }


# ============== Google Consent Mode v2 Endpoints ==============

class GCMGenerateRequest(BaseModel):
    """Request to generate GCM configuration"""
    purposes: List[str]
    region: str = "EU"
    gtm_container_id: Optional[str] = None
    ga4_measurement_id: Optional[str] = None


@app.post("/gcm/generate")
async def generate_gcm_config(
    request: GCMGenerateRequest,
    auth: AuthContext = Depends(get_auth_context)
):
    """
    Generate Google Consent Mode v2 configuration.
    
    Returns consent settings and JavaScript snippets.
    """
    # Map purposes to GCM settings
    settings = gcm_service.map_purposes_to_gcm(request.purposes)
    
    # Generate config
    tag_config = GCMTagConfig(
        gtm_container_id=request.gtm_container_id,
        ga4_measurement_id=request.ga4_measurement_id
    )
    
    snippet = gcm_service.generate_full_snippet(tag_config, request.region)
    
    return {
        "consent_settings": {
            "ad_storage": settings.ad_storage.value,
            "analytics_storage": settings.analytics_storage.value,
            "ad_user_data": settings.ad_user_data.value,
            "ad_personalization": settings.ad_personalization.value,
        },
        "snippets": {
            "default_consent": snippet.default_consent_script,
            "update_function": snippet.update_consent_function,
            "gtm": snippet.gtag_config
        }
    }


@app.get("/gcm/default-script")
async def get_gcm_default_script(
    region: str = Query(default="EU"),
    gtm_container_id: Optional[str] = None
):
    """
    Get the default consent script to place before Google tags.
    """
    tag_config = GCMTagConfig(gtm_container_id=gtm_container_id)
    script = gcm_service.generate_default_consent_script(region, tag_config=tag_config)
    
    return {
        "script": script,
        "placement": "Place this script BEFORE any Google tags (GTM, GA4, Ads)",
        "region": region
    }


@app.get("/gcm/update-function")
async def get_gcm_update_function():
    """
    Get the JavaScript function for updating consent.
    """
    return {
        "function": gcm_service.generate_update_function(),
        "usage": "Call updateGoogleConsent({analytics: true, marketing: false, personalization: false})"
    }


@app.post("/gcm/server-payload")
async def generate_gcm_server_payload(
    purposes: List[str] = Body(...),
    event_name: str = Body(default="consent_update")
):
    """
    Generate payload for server-side GTM.
    
    Send this to your GTM server container.
    """
    return gcm_service.generate_server_side_payload(purposes, event_name)


@app.get("/gcm/info")
async def get_gcm_info():
    """Get information about Google Consent Mode v2"""
    return gcm_service.get_consent_info()


@app.post("/gcm/validate")
async def validate_gcm_implementation(
    has_default_consent: bool = Body(...),
    default_before_tags: bool = Body(...),
    has_update_mechanism: bool = Body(...),
    has_ad_user_data: bool = Body(default=True),
    has_ad_personalization: bool = Body(default=True)
):
    """
    Validate your GCM implementation against requirements.
    """
    return gcm_service.validate_implementation(
        has_default_consent=has_default_consent,
        default_before_tags=default_before_tags,
        has_update_mechanism=has_update_mechanism,
        has_ad_user_data=has_ad_user_data,
        has_ad_personalization=has_ad_personalization
    )


# ============== Combined Standards Endpoint ==============

@app.post("/standards/generate-all")
async def generate_all_standards(
    purposes: List[str] = Body(...),
    vendors: List[str] = Body(...),
    language: str = Body(default="EN"),
    region: str = Body(default="EU"),
    gtm_container_id: Optional[str] = Body(default=None),
    auth: AuthContext = Depends(get_auth_context)
):
    """
    Generate all industry standard consent formats at once.
    
    Returns:
    - TCF 2.2 string
    - Google Consent Mode v2 settings
    - JavaScript snippets
    """
    # Generate TCF string
    tcf_result = tcf_service.generate_tc_string(purposes, vendors, language)
    
    # Generate GCM settings
    gcm_settings = gcm_service.map_purposes_to_gcm(purposes)
    
    # Generate snippets
    tag_config = GCMTagConfig(gtm_container_id=gtm_container_id)
    gcm_snippet = gcm_service.generate_full_snippet(tag_config, region)
    
    return {
        "tcf": {
            "tc_string": tcf_result.tc_string,
            "version": "2.2",
            "purposes_consented": tcf_result.purposes_consented,
            "vendors_consented": tcf_result.vendors_consented
        },
        "gcm": {
            "ad_storage": gcm_settings.ad_storage.value,
            "analytics_storage": gcm_settings.analytics_storage.value,
            "ad_user_data": gcm_settings.ad_user_data.value,
            "ad_personalization": gcm_settings.ad_personalization.value
        },
        "snippets": {
            "tcf_string_for_vendors": tcf_result.tc_string,
            "gcm_default_consent": gcm_snippet.default_consent_script,
            "gcm_update_function": gcm_snippet.update_consent_function
        },
        "integration_notes": {
            "tcf": "Pass tc_string to ad tech vendors in gdpr_consent parameter",
            "gcm": "Load default_consent script BEFORE Google tags, call update function after user choice"
        }
    }


# ============== Vendor Certification Endpoints ==============

@app.get("/vendors/trust-registry")
async def get_trust_registry():
    """
    Get the public vendor trust registry.
    
    This is the customer-visible list of all certified vendors
    with their trust scores, compliance rates, and badges.
    
    Reputation becomes technical, not PR-based.
    """
    registry = vendor_certification_service.get_trust_registry()
    return {
        "vendors": [entry.model_dump() for entry in registry],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


@app.get("/vendors/trust-registry/{vendor_id}")
async def get_vendor_trust_entry(vendor_id: str):
    """Get trust registry entry for a specific vendor"""
    entry = vendor_certification_service.get_registry_entry(vendor_id)
    if not entry:
        raise APIError(404, "not_found", f"Vendor {vendor_id} not in trust registry")
    return entry.model_dump()


@app.get("/vendors/certifications")
async def list_certifications(
    tier: Optional[str] = Query(default=None, description="Filter by trust tier"),
    auth: AuthContext = Depends(require_auth)
):
    """List all vendor certifications (admin view)"""
    auth.require_scope(Scope.ADMIN_READ)
    
    tier_filter = TrustTier(tier) if tier else None
    certs = vendor_certification_service.list_certifications(tier_filter)
    
    return {
        "certifications": [cert.model_dump() for cert in certs],
        "stats": vendor_certification_service.get_stats()
    }


@app.get("/vendors/certifications/{vendor_id}")
async def get_certification(
    vendor_id: str,
    auth: AuthContext = Depends(require_auth)
):
    """Get detailed certification for a vendor"""
    auth.require_scope(Scope.ADMIN_READ)
    
    cert = vendor_certification_service.get_certification(vendor_id)
    if not cert:
        raise APIError(404, "not_found", f"Vendor {vendor_id} not found")
    
    return cert.model_dump()


class VendorRegistrationRequest(BaseModel):
    """Request to register a vendor for certification"""
    vendor_id: str
    vendor_name: str


@app.post("/vendors/certifications/register")
async def register_vendor_for_certification(
    request: VendorRegistrationRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Register a new vendor for certification"""
    auth.require_scope(Scope.ADMIN_WRITE)
    
    cert = vendor_certification_service.register_vendor(
        request.vendor_id, 
        request.vendor_name
    )
    
    return {
        "certification": cert.model_dump(),
        "message": "Vendor registered. Complete requirements for approval."
    }


class VendorApprovalRequest(BaseModel):
    """Request to approve a vendor"""
    tier: str = "approved"
    reason: str = "Requirements met"


@app.post("/vendors/certifications/{vendor_id}/approve")
async def approve_vendor(
    vendor_id: str,
    request: VendorApprovalRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Approve a vendor for a specific trust tier"""
    auth.require_scope(Scope.ADMIN_WRITE)
    
    cert = vendor_certification_service.approve_vendor(
        vendor_id,
        TrustTier(request.tier),
        request.reason
    )
    
    return {
        "certification": cert.model_dump(),
        "message": f"Vendor approved at {request.tier} tier"
    }


@app.get("/vendors/certifications/{vendor_id}/checks")
async def get_vendor_checks(
    vendor_id: str,
    check_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    auth: AuthContext = Depends(require_auth)
):
    """Get compliance checks for a vendor"""
    auth.require_scope(Scope.ADMIN_READ)
    
    type_filter = CheckType(check_type) if check_type else None
    checks = vendor_certification_service.get_checks(vendor_id, type_filter, limit)
    
    return {
        "checks": [check.model_dump() for check in checks],
        "count": len(checks)
    }


@app.post("/vendors/certifications/{vendor_id}/check")
async def run_compliance_check(
    vendor_id: str,
    auth: AuthContext = Depends(require_auth)
):
    """Run automated compliance checks for a vendor"""
    auth.require_scope(Scope.ADMIN_WRITE)
    
    results = vendor_certification_service.run_automated_checks(vendor_id)
    
    # Get updated certification
    cert = vendor_certification_service.get_certification(vendor_id)
    
    return {
        "checks": [r.model_dump() for r in results],
        "updated_certification": cert.model_dump() if cert else None,
        "message": f"Ran {len(results)} compliance checks"
    }


# ============== Violation Management ==============

@app.get("/vendors/certifications/{vendor_id}/violations")
async def get_vendor_violations(
    vendor_id: str,
    open_only: bool = Query(default=False),
    auth: AuthContext = Depends(require_auth)
):
    """Get violations for a vendor"""
    auth.require_scope(Scope.ADMIN_READ)
    
    violations = vendor_certification_service.get_violations(vendor_id, open_only)
    
    return {
        "violations": [v.model_dump() for v in violations],
        "count": len(violations),
        "open_count": len([v for v in violations if v.resolved_at is None])
    }


class ViolationReportRequest(BaseModel):
    """Request to report a violation"""
    violation_type: str
    description: str
    evidence: Dict[str, Any] = {}
    events_affected: int = 0
    users_affected: int = 0


@app.post("/vendors/certifications/{vendor_id}/violations")
async def report_violation(
    vendor_id: str,
    request: ViolationReportRequest,
    auth: AuthContext = Depends(require_auth)
):
    """
    Report a policy violation for a vendor.
    
    This will:
    - Record the violation
    - Deduct trust score points
    - Potentially downgrade trust tier
    - Make the violation visible to customers
    """
    auth.require_scope(Scope.ADMIN_WRITE)
    
    violation = vendor_certification_service.record_violation(
        vendor_id=vendor_id,
        violation_type=ViolationType(request.violation_type),
        description=request.description,
        evidence=request.evidence,
        events_affected=request.events_affected,
        users_affected=request.users_affected
    )
    
    # Log to evidence store
    evidence_store.append(
        tenant_id="system",
        event_type=EventType.SYSTEM,
        event_data={
            "type": "vendor_violation",
            "vendor_id": vendor_id,
            "violation_id": violation.id,
            "violation_type": violation.violation_type.value,
            "severity": violation.severity.value,
            "tier_before": violation.tier_before.value if violation.tier_before else None,
            "tier_after": violation.tier_after.value if violation.tier_after else None,
            "action_taken": violation.action_taken
        }
    )
    
    return {
        "violation": violation.model_dump(),
        "action_taken": violation.action_taken,
        "message": "Violation recorded and appropriate action taken"
    }


class ViolationResolutionRequest(BaseModel):
    """Request to resolve a violation"""
    resolution_notes: str


@app.post("/violations/{violation_id}/resolve")
async def resolve_violation(
    violation_id: str,
    request: ViolationResolutionRequest,
    auth: AuthContext = Depends(require_auth)
):
    """Resolve a violation"""
    auth.require_scope(Scope.ADMIN_WRITE)
    
    violation = vendor_certification_service.resolve_violation(
        violation_id,
        request.resolution_notes
    )
    
    if not violation:
        raise APIError(404, "not_found", f"Violation {violation_id} not found")
    
    return {
        "violation": violation.model_dump(),
        "message": "Violation resolved"
    }


# ============== Vendor Check During Enforcement ==============

@app.get("/vendors/{vendor_id}/allowed")
async def check_vendor_allowed(
    vendor_id: str,
    auth: AuthContext = Depends(get_auth_context)
):
    """
    Check if a vendor is allowed to receive events.
    
    Returns allowed=false for suspended/revoked vendors.
    """
    allowed, reason = vendor_certification_service.check_vendor_allowed(vendor_id)
    
    cert = vendor_certification_service.get_certification(vendor_id)
    
    return {
        "vendor_id": vendor_id,
        "allowed": allowed,
        "reason": reason,
        "trust_tier": cert.trust_tier.value if cert else None,
        "trust_score": cert.trust_score if cert else None
    }


# ============== Certification Stats ==============

@app.get("/vendors/certification-stats")
async def get_certification_stats():
    """Get vendor certification statistics"""
    return vendor_certification_service.get_stats()


# ============== Violation Types ==============

@app.get("/vendors/violation-types")
async def get_violation_types():
    """Get list of possible violation types"""
    from services.vendor_certification import VIOLATION_SEVERITY_MAP, SEVERITY_POINTS
    
    return {
        "violation_types": [
            {
                "type": vt.value,
                "severity": VIOLATION_SEVERITY_MAP.get(vt, ViolationSeverity.MEDIUM).value,
                "description": {
                    ViolationType.MISSING_CONSENT_CHECK: "Processed events without consent validation",
                    ViolationType.BYPASSED_PROXY: "Received events that didn't go through consent gateway",
                    ViolationType.INVALID_TOKEN_USAGE: "Used consent tokens incorrectly",
                    ViolationType.UNAUTHORIZED_DATA_ACCESS: "Accessed data classes not authorized",
                    ViolationType.DATA_CLASS_VIOLATION: "Processed restricted data classes",
                    ViolationType.CROSS_SITE_VIOLATION: "Cross-site tracking when not allowed",
                    ViolationType.PURPOSE_VIOLATION: "Used data for non-consented purpose",
                    ViolationType.MISSING_AUDIT_TRAIL: "Failed to provide audit logs",
                    ViolationType.TAMPERED_LOGS: "Audit logs show signs of tampering",
                    ViolationType.LATE_REPORTING: "Compliance reports submitted late",
                    ViolationType.FAILED_AUDIT: "Failed periodic compliance audit",
                    ViolationType.EXPIRED_CERTIFICATION: "Certification expired without renewal",
                    ViolationType.POLICY_BREACH: "General policy breach"
                }.get(vt, "Policy violation")
            }
            for vt in ViolationType
        ],
        "severities": [
            {"level": s.value, "points_deducted": SEVERITY_POINTS[s]}
            for s in ViolationSeverity
        ]
    }


# ============== Main ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
