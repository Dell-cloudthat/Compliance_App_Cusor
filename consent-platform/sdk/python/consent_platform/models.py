"""
Pydantic models for the Consent Platform SDK
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class Decision(str, Enum):
    """Enforcement decision types"""
    ALLOWED = "allowed"
    MODIFIED = "modified"
    BLOCKED = "blocked"


class ConsentRequest(BaseModel):
    """Request to issue a consent token"""
    user_id: str = Field(..., description="Hashed user identifier")
    purposes: List[str] = Field(..., description="List of consented purposes")
    vendors: List[str] = Field(..., description="List of allowed vendors")
    ttl_days: int = Field(default=14, ge=1, le=365, description="Token TTL in days")
    jurisdiction: str = Field(default="GDPR", description="Legal jurisdiction")
    constraints: Optional[Dict[str, bool]] = Field(default=None, description="Consent constraints")


class ConsentToken(BaseModel):
    """Consent token response"""
    consent_token: str = Field(..., description="The JWT consent token")
    token_id: str = Field(..., description="Unique token identifier")
    expires_at: datetime = Field(..., description="Token expiration time")
    purposes: List[str] = Field(..., description="Consented purposes")
    vendors: List[str] = Field(..., description="Allowed vendors")


class TokenValidation(BaseModel):
    """Token validation result"""
    valid: bool = Field(..., description="Whether the token is valid")
    status: str = Field(..., description="Token status (active/expired/revoked)")
    reason: Optional[str] = Field(default=None, description="Reason if invalid")
    purposes: Optional[Dict[str, Any]] = Field(default=None, description="Consented purposes")
    vendors: Optional[Dict[str, Any]] = Field(default=None, description="Allowed vendors")
    constraints: Optional[Dict[str, bool]] = Field(default=None, description="Consent constraints")


class EventRequest(BaseModel):
    """Request to process an ad event"""
    event_type: str = Field(..., description="Type of event (purchase, page_view, etc.)")
    user_id: str = Field(..., description="Hashed user identifier")
    vendor: str = Field(..., description="Target vendor (meta, google, etc.)")
    data_classes: List[str] = Field(default=[], description="Data classes in this event")
    url: Optional[str] = Field(default=None, description="Page URL")
    referrer: Optional[str] = Field(default=None, description="Referrer URL")
    ip_address: Optional[str] = Field(default=None, description="User IP address")
    user_agent: Optional[str] = Field(default=None, description="User agent string")
    value: Optional[float] = Field(default=None, description="Event value")
    currency: str = Field(default="USD", description="Currency code")
    properties: Dict[str, Any] = Field(default={}, description="Custom properties")
    is_cross_site: bool = Field(default=False, description="Is this a cross-site event")


class EventResponse(BaseModel):
    """Response from event processing"""
    decision: Decision = Field(..., description="Enforcement decision")
    reason: Optional[str] = Field(default=None, description="Decision reason")
    fields_stripped: List[str] = Field(default=[], description="Fields that were stripped")
    forwarded: bool = Field(default=False, description="Whether event was forwarded to vendor")
    vendor_event_id: Optional[str] = Field(default=None, description="Vendor's event ID if forwarded")
    latency_ms: float = Field(..., description="Processing latency in milliseconds")


class TCFString(BaseModel):
    """TCF 2.2 consent string"""
    tc_string: str = Field(..., description="The TCF consent string")
    version: int = Field(..., description="TCF version")
    created: datetime = Field(..., description="Creation timestamp")
    tcf_purposes: List[int] = Field(..., description="TCF purpose IDs")
    tcf_vendors: List[int] = Field(..., description="TCF vendor IDs")


class GCMSettings(BaseModel):
    """Google Consent Mode v2 settings"""
    ad_storage: str = Field(..., description="Ad storage consent")
    analytics_storage: str = Field(..., description="Analytics storage consent")
    ad_user_data: str = Field(..., description="Ad user data consent")
    ad_personalization: str = Field(..., description="Ad personalization consent")


class AuditExport(BaseModel):
    """Audit data export"""
    tenant_id: str
    export_time: datetime
    events_count: int
    chain_valid: bool
    events: List[Dict[str, Any]]


class WebhookEvent(BaseModel):
    """Incoming webhook event"""
    id: str = Field(..., description="Event ID")
    event: str = Field(..., description="Event type")
    created_at: datetime = Field(..., description="Event timestamp")
    tenant_id: str = Field(..., description="Tenant ID")
    data: Dict[str, Any] = Field(..., description="Event data")
    idempotency_key: str = Field(..., description="Idempotency key")
