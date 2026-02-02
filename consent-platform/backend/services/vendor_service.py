"""
Vendor Service

Manages vendor integrations and forwards events to ad platforms.

Supported Platforms:
- Meta (Facebook Conversions API)
- Google (Enhanced Conversions)
- Generic DSP/CDP

Each connector handles:
- Payload transformation to platform format
- Authentication
- Retry logic
- Response handling
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum
import hashlib
import json
import time
import uuid
import httpx


# ============== Enums ==============

class VendorType(str, Enum):
    AD_PLATFORM = "ad_platform"
    ANALYTICS = "analytics"
    CDP = "cdp"
    DSP = "dsp"
    CUSTOM = "custom"


class VendorStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


# ============== Models ==============

class Vendor(BaseModel):
    """Vendor configuration"""
    id: str
    tenant_id: str
    name: str  # e.g., "meta", "google"
    display_name: str  # e.g., "Meta (Facebook)"
    vendor_type: VendorType
    
    # Integration
    endpoint_url: Optional[str] = None
    api_key: Optional[str] = None  # Would be encrypted in production
    pixel_id: Optional[str] = None
    
    # Data handling
    allowed_data_classes: List[str] = []
    
    status: VendorStatus = VendorStatus.ACTIVE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ForwardingRequest(BaseModel):
    """Request to forward an event to a vendor"""
    event_id: str
    event_type: str
    vendor: str
    
    # User data (post-enforcement, already filtered)
    user_data: Dict[str, Any]
    
    # Event data
    event_data: Dict[str, Any]
    
    # Metadata
    action_source: str = "website"
    event_time: Optional[datetime] = None


class ForwardingResult(BaseModel):
    """Result of forwarding to a vendor"""
    success: bool
    vendor: str
    
    # Response
    response_code: Optional[int] = None
    vendor_event_id: Optional[str] = None  # ID assigned by vendor
    
    # Error
    error: Optional[str] = None
    
    # Timing
    latency_ms: float


# ============== Vendor Connectors ==============

class BaseVendorConnector:
    """Base class for vendor connectors"""
    
    def __init__(self, vendor: Vendor):
        self.vendor = vendor
    
    async def forward(self, request: ForwardingRequest) -> ForwardingResult:
        """Forward event to vendor. Override in subclasses."""
        raise NotImplementedError
    
    def _hash_for_matching(self, value: str) -> str:
        """Hash a value for privacy-safe matching (SHA256, lowercase, trimmed)"""
        if not value:
            return None
        normalized = value.lower().strip()
        return hashlib.sha256(normalized.encode()).hexdigest()


class MetaConnector(BaseVendorConnector):
    """
    Meta (Facebook) Conversions API connector
    https://developers.facebook.com/docs/marketing-api/conversions-api
    """
    
    async def forward(self, request: ForwardingRequest) -> ForwardingResult:
        start = time.time()
        
        try:
            # Build Meta event format
            meta_event = {
                "event_name": self._map_event_type(request.event_type),
                "event_time": int((request.event_time or datetime.now(timezone.utc)).timestamp()),
                "action_source": request.action_source,
                "user_data": self._build_user_data(request.user_data),
                "custom_data": self._build_custom_data(request.event_data)
            }
            
            if request.event_data.get("url"):
                meta_event["event_source_url"] = request.event_data["url"]
            
            # In production, send to Meta API:
            # POST https://graph.facebook.com/v18.0/{pixel_id}/events
            # Headers: Authorization: Bearer {access_token}
            # Body: {"data": [meta_event]}
            
            # For demo, simulate success
            latency = (time.time() - start) * 1000
            
            return ForwardingResult(
                success=True,
                vendor="meta",
                response_code=200,
                vendor_event_id=f"fbq_{uuid.uuid4().hex[:12]}",
                latency_ms=latency
            )
        
        except Exception as e:
            latency = (time.time() - start) * 1000
            return ForwardingResult(
                success=False,
                vendor="meta",
                error=str(e),
                latency_ms=latency
            )
    
    def _map_event_type(self, event_type: str) -> str:
        """Map generic event type to Meta event name"""
        mapping = {
            "page_view": "PageView",
            "view_content": "ViewContent",
            "add_to_cart": "AddToCart",
            "initiate_checkout": "InitiateCheckout",
            "purchase": "Purchase",
            "lead": "Lead",
            "complete_registration": "CompleteRegistration",
            "subscribe": "Subscribe",
            "search": "Search",
        }
        return mapping.get(event_type.lower(), event_type)
    
    def _build_user_data(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Build Meta user_data object"""
        result = {}
        
        if user_data.get("hashed_email"):
            result["em"] = [user_data["hashed_email"]]
        if user_data.get("hashed_phone"):
            result["ph"] = [user_data["hashed_phone"]]
        if user_data.get("external_id"):
            result["external_id"] = [user_data["external_id"]]
        if user_data.get("ip_address"):
            result["client_ip_address"] = user_data["ip_address"]
        if user_data.get("user_agent"):
            result["client_user_agent"] = user_data["user_agent"]
        
        return result
    
    def _build_custom_data(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Build Meta custom_data object"""
        result = {}
        
        if event_data.get("value"):
            result["value"] = event_data["value"]
            result["currency"] = event_data.get("currency", "USD")
        if event_data.get("content_ids"):
            result["content_ids"] = event_data["content_ids"]
        if event_data.get("content_type"):
            result["content_type"] = event_data["content_type"]
        
        return result


class GoogleConnector(BaseVendorConnector):
    """
    Google Enhanced Conversions connector
    https://developers.google.com/google-ads/api/docs/conversions/upload-clicks
    """
    
    async def forward(self, request: ForwardingRequest) -> ForwardingResult:
        start = time.time()
        
        try:
            # Build Google conversion format
            google_conversion = {
                "conversionAction": f"customers/{self.vendor.pixel_id}/conversionActions/{request.event_type}",
                "conversionDateTime": (request.event_time or datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M:%S%z"),
                "userIdentifiers": self._build_user_identifiers(request.user_data)
            }
            
            if request.event_data.get("value"):
                google_conversion["conversionValue"] = request.event_data["value"]
                google_conversion["currencyCode"] = request.event_data.get("currency", "USD")
            
            # In production, send to Google Ads API
            # Simulate success for demo
            latency = (time.time() - start) * 1000
            
            return ForwardingResult(
                success=True,
                vendor="google",
                response_code=200,
                vendor_event_id=f"gads_{uuid.uuid4().hex[:12]}",
                latency_ms=latency
            )
        
        except Exception as e:
            latency = (time.time() - start) * 1000
            return ForwardingResult(
                success=False,
                vendor="google",
                error=str(e),
                latency_ms=latency
            )
    
    def _build_user_identifiers(self, user_data: Dict[str, Any]) -> List[Dict[str, str]]:
        """Build Google userIdentifiers array"""
        identifiers = []
        
        if user_data.get("hashed_email"):
            identifiers.append({"hashedEmail": user_data["hashed_email"]})
        if user_data.get("hashed_phone"):
            identifiers.append({"hashedPhoneNumber": user_data["hashed_phone"]})
        
        return identifiers


class GenericConnector(BaseVendorConnector):
    """Generic webhook connector for DSPs, CDPs, etc."""
    
    async def forward(self, request: ForwardingRequest) -> ForwardingResult:
        start = time.time()
        
        try:
            # Build generic payload
            payload = {
                "event_id": request.event_id,
                "event_type": request.event_type,
                "event_time": (request.event_time or datetime.now(timezone.utc)).isoformat(),
                "user": request.user_data,
                "event": request.event_data
            }
            
            # In production, POST to vendor.endpoint_url
            # Simulate success for demo
            latency = (time.time() - start) * 1000
            
            return ForwardingResult(
                success=True,
                vendor=self.vendor.name,
                response_code=200,
                vendor_event_id=f"evt_{uuid.uuid4().hex[:12]}",
                latency_ms=latency
            )
        
        except Exception as e:
            latency = (time.time() - start) * 1000
            return ForwardingResult(
                success=False,
                vendor=self.vendor.name,
                error=str(e),
                latency_ms=latency
            )


# ============== Vendor Service ==============

class VendorService:
    """
    Manages vendors and handles event forwarding.
    """
    
    def __init__(self):
        # In production, this would be in a database
        self._vendors: Dict[str, Dict[str, Vendor]] = {}  # tenant_id -> {vendor_name -> Vendor}
        
        # Connector instances
        self._connectors: Dict[str, BaseVendorConnector] = {}
        
        # Initialize demo vendors
        self._init_demo_vendors()
    
    def _init_demo_vendors(self):
        """Initialize demo vendors"""
        demo_tenant = "demo-tenant"
        self._vendors[demo_tenant] = {}
        
        # Meta
        meta = Vendor(
            id="vendor-meta",
            tenant_id=demo_tenant,
            name="meta",
            display_name="Meta (Facebook)",
            vendor_type=VendorType.AD_PLATFORM,
            allowed_data_classes=["behavioral", "device", "identity"],
            pixel_id="demo-pixel-123"
        )
        self._vendors[demo_tenant]["meta"] = meta
        self._connectors[f"{demo_tenant}:meta"] = MetaConnector(meta)
        
        # Google
        google = Vendor(
            id="vendor-google",
            tenant_id=demo_tenant,
            name="google",
            display_name="Google Ads",
            vendor_type=VendorType.AD_PLATFORM,
            allowed_data_classes=["behavioral", "device", "identity", "transaction"],
            pixel_id="demo-customer-123"
        )
        self._vendors[demo_tenant]["google"] = google
        self._connectors[f"{demo_tenant}:google"] = GoogleConnector(google)
        
        # Generic DSP
        dsp = Vendor(
            id="vendor-dsp",
            tenant_id=demo_tenant,
            name="dsp",
            display_name="Generic DSP",
            vendor_type=VendorType.DSP,
            allowed_data_classes=["behavioral"],
            endpoint_url="https://dsp.example.com/events"
        )
        self._vendors[demo_tenant]["dsp"] = dsp
        self._connectors[f"{demo_tenant}:dsp"] = GenericConnector(dsp)
    
    def add_vendor(self, vendor: Vendor) -> Vendor:
        """Add a vendor for a tenant"""
        if vendor.tenant_id not in self._vendors:
            self._vendors[vendor.tenant_id] = {}
        
        self._vendors[vendor.tenant_id][vendor.name] = vendor
        
        # Create connector
        connector_key = f"{vendor.tenant_id}:{vendor.name}"
        if vendor.name == "meta":
            self._connectors[connector_key] = MetaConnector(vendor)
        elif vendor.name == "google":
            self._connectors[connector_key] = GoogleConnector(vendor)
        else:
            self._connectors[connector_key] = GenericConnector(vendor)
        
        return vendor
    
    def get_vendor(self, tenant_id: str, vendor_name: str) -> Optional[Vendor]:
        """Get a vendor by name"""
        return self._vendors.get(tenant_id, {}).get(vendor_name)
    
    def list_vendors(self, tenant_id: str) -> List[Vendor]:
        """List all vendors for a tenant"""
        return list(self._vendors.get(tenant_id, {}).values())
    
    def remove_vendor(self, tenant_id: str, vendor_name: str) -> bool:
        """Remove a vendor"""
        if tenant_id in self._vendors and vendor_name in self._vendors[tenant_id]:
            del self._vendors[tenant_id][vendor_name]
            
            connector_key = f"{tenant_id}:{vendor_name}"
            if connector_key in self._connectors:
                del self._connectors[connector_key]
            
            return True
        return False
    
    async def forward_event(
        self,
        tenant_id: str,
        request: ForwardingRequest
    ) -> ForwardingResult:
        """Forward an event to a vendor"""
        connector_key = f"{tenant_id}:{request.vendor}"
        connector = self._connectors.get(connector_key)
        
        if not connector:
            return ForwardingResult(
                success=False,
                vendor=request.vendor,
                error=f"No connector for vendor: {request.vendor}",
                latency_ms=0
            )
        
        return await connector.forward(request)


# Singleton instance
vendor_service = VendorService()
