"""
Consent as a Service Platform - API Server

A server-side consent enforcement platform.

Architecture:
    Control Plane (this service):
    - Define consent policies
    - Issue consent authorization tokens
    - Manage vendors & purposes
    - Provide audit & reporting

    Enforcement Plane:
    - Validate tokens
    - Enforce policies
    - Forward to ad platforms
    - Log everything

Endpoints:
    POST /consent          - Issue consent token
    POST /event            - Process ad event
    GET  /decisions        - Query enforcement decisions
    GET  /audit/export     - Export for auditors
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, Header, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
import uuid

# Services
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


# ============== FastAPI App ==============

app = FastAPI(
    title="Consent as a Service Platform",
    description="Server-side consent enforcement for ad data",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Idempotency cache (in production, use Redis)
_idempotency_cache: Dict[str, Dict[str, Any]] = {}


# ============== Request/Response Models ==============

class ConsentRequest(BaseModel):
    """Request to create consent (Flow A)"""
    user_id: str  # Hashed user ID
    purposes: List[str]  # ["retargeting", "analytics"]
    vendors: List[str]   # ["meta", "google"]
    ttl_days: int = 14
    jurisdiction: str = "GDPR"


class ConsentResponse(BaseModel):
    """Response with consent token"""
    consent_token: str
    token_id: str
    expires_at: datetime


class EventRequest(BaseModel):
    """Incoming ad event (Flow B)"""
    event_type: str  # page_view, purchase, etc.
    user_id: str     # Hashed user ID
    vendor: str      # meta, google, etc.
    
    # Data classes present
    data_classes: List[str] = []  # ["behavioral", "device"]
    
    # Optional fields
    url: Optional[str] = None
    referrer: Optional[str] = None
    device: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Event data
    value: Optional[float] = None
    currency: Optional[str] = "USD"
    properties: Dict[str, Any] = {}
    
    # Cross-site indicator
    is_cross_site: bool = False


class EventResponse(BaseModel):
    """Response with enforcement decision"""
    decision: str  # allowed | modified | blocked
    reason: Optional[str] = None
    policy_id: Optional[str] = None
    
    # What was done
    fields_stripped: List[str] = []
    
    # If forwarded
    forwarded: bool = False
    vendor_event_id: Optional[str] = None


class PolicyRequest(BaseModel):
    """Request to create a policy"""
    name: str
    description: Optional[str] = None
    rules: List[Dict[str, str]]  # [{"if": "vendor_not_allowed", "then": "block"}]
    jurisdictions: Optional[List[str]] = None
    purposes: Optional[List[str]] = None


# ============== Health ==============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }


# ============== Flow A: Consent Creation ==============

@app.post("/consent", response_model=ConsentResponse)
async def create_consent(
    request: ConsentRequest,
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID")
):
    """
    Issue a consent token.
    
    Flow:
    1. User clicks "Accept Retargeting"
    2. Website sends this request
    3. We validate and sign a token
    4. Token is stored client-side and attached to all ad events
    """
    try:
        # Build purposes consent
        purposes = {}
        for purpose in request.purposes:
            purposes[purpose] = PurposeConsent(allowed=True, ttl_days=request.ttl_days)
        
        # Build vendors consent
        vendors = {}
        for vendor_name in request.vendors:
            vendor = vendor_service.get_vendor(x_tenant_id, vendor_name)
            data_classes = vendor.allowed_data_classes if vendor else ["behavioral"]
            vendors[vendor_name] = VendorConsent(allowed=True, data_classes=data_classes)
        
        # Create token request
        token_request = ConsentTokenRequest(
            subject_id=request.user_id,
            purposes=purposes,
            vendors=vendors,
            constraints=ConsentConstraints(),
            jurisdiction=Jurisdiction(request.jurisdiction),
            ttl_days=request.ttl_days
        )
        
        # Issue token
        token = token_service.issue_token(x_tenant_id, token_request)
        
        # Log to evidence store
        evidence_store.log_consent_issued(
            tenant_id=x_tenant_id,
            token_id=token.token_id,
            subject_id=request.user_id,
            purposes=purposes,
            vendors=vendors,
            jurisdiction=request.jurisdiction,
            expires_at=token.expires_at
        )
        
        return ConsentResponse(
            consent_token=token.token,
            token_id=token.token_id,
            expires_at=token.expires_at
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/consent/revoke")
async def revoke_consent(
    token_id: str = Body(..., embed=True),
    reason: str = Body("user_requested", embed=True),
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID")
):
    """Revoke a consent token"""
    success = token_service.revoke_token(x_tenant_id, token_id, reason)
    
    if success:
        # Log to evidence store
        evidence_store.log_consent_revoked(
            tenant_id=x_tenant_id,
            token_id=token_id,
            subject_id="unknown",  # Would need to look up from token
            reason=reason
        )
    
    return {"success": success, "token_id": token_id}


# ============== Flow B: Ad Event Enforcement ==============

@app.post("/event", response_model=EventResponse)
async def process_event(
    request: EventRequest,
    authorization: Optional[str] = Header(default=None),
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID"),
    x_idempotency_key: Optional[str] = Header(default=None, alias="X-Idempotency-Key")
):
    """
    Process an ad event through enforcement.
    
    Flow:
    1. Customer backend sends event
    2. We validate consent token
    3. We evaluate policy
    4. We forward to ad platform (or block)
    5. We log everything
    
    All in milliseconds.
    """
    # Check idempotency
    if x_idempotency_key:
        cache_key = f"{x_tenant_id}:{x_idempotency_key}"
        if cache_key in _idempotency_cache:
            return EventResponse(**_idempotency_cache[cache_key])
    
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
    result = enforcement_engine.enforce(x_tenant_id, event, token_string)
    
    # Forward if allowed
    forwarded = False
    vendor_event_id = None
    vendor_response_code = None
    
    if result.decision in [Decision.ALLOWED, Decision.MODIFIED]:
        # Build forwarding request from modified event
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
        
        forward_result = await vendor_service.forward_event(x_tenant_id, forward_request)
        forwarded = forward_result.success
        vendor_event_id = forward_result.vendor_event_id
        vendor_response_code = forward_result.response_code
    
    # Log to evidence store
    token_hash = hashlib.sha256(token_string.encode()).hexdigest() if token_string else None
    
    evidence_store.log_enforcement_decision(
        tenant_id=x_tenant_id,
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
    
    # Build response
    response_data = {
        "decision": result.decision.value,
        "reason": result.reason,
        "fields_stripped": result.fields_stripped,
        "forwarded": forwarded,
        "vendor_event_id": vendor_event_id
    }
    
    # Cache for idempotency
    if x_idempotency_key:
        cache_key = f"{x_tenant_id}:{x_idempotency_key}"
        _idempotency_cache[cache_key] = response_data
    
    return EventResponse(**response_data)


# ============== Flow C: Evidence & Audit ==============

@app.get("/decisions")
async def get_decisions(
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID"),
    event_type: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0)
):
    """Get enforcement decisions"""
    events = evidence_store.query(
        tenant_id=x_tenant_id,
        event_type=EventType.ENFORCEMENT_DECISION if event_type == "enforcement" else None,
        limit=limit,
        offset=offset
    )
    
    return {
        "decisions": [e.model_dump() for e in events],
        "count": len(events)
    }


@app.get("/audit/export")
async def export_audit(
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Export audit data"""
    # Parse dates
    if start_date:
        start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    else:
        start = datetime.now(timezone.utc) - timedelta(days=30)
    
    if end_date:
        end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    else:
        end = datetime.now(timezone.utc)
    
    export = evidence_store.export_for_audit(x_tenant_id, start, end)
    
    return export.model_dump()


@app.get("/audit/verify")
async def verify_chain(
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID")
):
    """Verify evidence chain integrity"""
    result = evidence_store.verify_chain(x_tenant_id)
    return result.model_dump()


# ============== Vendors ==============

@app.get("/vendors")
async def list_vendors(
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID")
):
    """List vendors for tenant"""
    vendors = vendor_service.list_vendors(x_tenant_id)
    return {"vendors": [v.model_dump() for v in vendors]}


@app.post("/vendors")
async def add_vendor(
    vendor: Vendor,
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID")
):
    """Add a vendor"""
    vendor.tenant_id = x_tenant_id
    result = vendor_service.add_vendor(vendor)
    return {"vendor": result.model_dump()}


# ============== Tokens ==============

@app.get("/tokens")
async def list_tokens(
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID"),
    subject_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100)
):
    """List tokens"""
    status_enum = TokenStatus(status) if status else None
    tokens = token_service.list_tokens(x_tenant_id, subject_id, status_enum)
    
    return {
        "tokens": [
            {
                "token_id": t.token_id,
                "subject_id": t.subject_id,
                "purposes": list(t.purposes.keys()),
                "vendors": list(t.vendors.keys()),
                "status": t.status.value,
                "issued_at": t.issued_at.isoformat(),
                "expires_at": t.expires_at.isoformat()
            }
            for t in tokens[:limit]
        ]
    }


@app.get("/tokens/{token_id}/decode")
async def decode_token(
    token_id: str,
    token: str = Query(...),
):
    """Decode a token (for debugging, does NOT verify)"""
    payload = token_service.decode_token_unsafe(token)
    return {"payload": payload}


# ============== Stats ==============

@app.get("/stats")
async def get_stats():
    """Get platform statistics"""
    return {
        "evidence_store": evidence_store.get_stats(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============== Demo ==============

@app.post("/demo/flow")
async def demo_full_flow(
    x_tenant_id: str = Header(default="demo-tenant", alias="X-Tenant-ID")
):
    """
    Run a complete demo flow:
    1. Issue consent
    2. Send ad event
    3. Get decision
    """
    # Step 1: Issue consent
    consent_request = ConsentRequest(
        user_id=f"demo_user_{uuid.uuid4().hex[:8]}",
        purposes=["retargeting", "analytics"],
        vendors=["meta", "google"],
        ttl_days=14,
        jurisdiction="GDPR"
    )
    
    # Simulate the consent endpoint
    purposes = {p: PurposeConsent(allowed=True, ttl_days=14) for p in consent_request.purposes}
    vendors = {v: VendorConsent(allowed=True, data_classes=["behavioral", "device"]) for v in consent_request.vendors}
    
    token_request = ConsentTokenRequest(
        subject_id=consent_request.user_id,
        purposes=purposes,
        vendors=vendors,
        jurisdiction=Jurisdiction.GDPR,
        ttl_days=14
    )
    
    token = token_service.issue_token(x_tenant_id, token_request)
    
    evidence_store.log_consent_issued(
        tenant_id=x_tenant_id,
        token_id=token.token_id,
        subject_id=consent_request.user_id,
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
        user_id=consent_request.user_id,
        url="https://demo.example.com/checkout",
        value=99.99,
        currency="USD"
    )
    
    result = enforcement_engine.enforce(x_tenant_id, event, token.token)
    
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
        forward_result = await vendor_service.forward_event(x_tenant_id, forward_request)
        forwarded = forward_result.success
        vendor_event_id = forward_result.vendor_event_id
    
    # Log
    evidence_store.log_enforcement_decision(
        tenant_id=x_tenant_id,
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
            "subject_id": consent_request.user_id,
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
    uvicorn.run(app, host="0.0.0.0", port=8001)  # Different port from compliance app
