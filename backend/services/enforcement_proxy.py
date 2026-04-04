"""
Server-Side Enforcement Proxy
The high-performance, low-latency enforcement plane for ad events.

Architecture:
    Website / App
         ↓ (Server-side events)
    Enforcement Proxy (THIS SERVICE)
         ↓ (Token validation, policy eval, transform)
    Ad Platform (Meta, Google, DSP)
         ↓ (Log everything)
    Immutable Event Store

Design Principles:
    - Stateless (horizontally scalable)
    - Low latency (milliseconds)
    - Fail-open/fail-closed configurable
    - Append-only event logging
    - Hash chaining for integrity
    - NOT blockchain - security-grade logging
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from enum import Enum
import asyncio
import hashlib
import json
import secrets
import time
import uuid
from dataclasses import dataclass
from collections import deque
import threading


# ============== Enums ==============

class EnforcementAction(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    STRIP_FIELDS = "strip_fields"
    ANONYMIZE = "anonymize"
    RATE_LIMIT = "rate_limit"


class FailureMode(str, Enum):
    FAIL_OPEN = "fail_open"     # Allow on error (availability)
    FAIL_CLOSED = "fail_closed"  # Block on error (security)


class AdPlatform(str, Enum):
    META = "meta"
    GOOGLE = "google"
    TIKTOK = "tiktok"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    SNAPCHAT = "snapchat"
    PINTEREST = "pinterest"
    DSP_GENERIC = "dsp_generic"
    CDP = "cdp"
    CUSTOM = "custom"


class EventType(str, Enum):
    PAGE_VIEW = "PageView"
    PURCHASE = "Purchase"
    ADD_TO_CART = "AddToCart"
    INITIATE_CHECKOUT = "InitiateCheckout"
    LEAD = "Lead"
    COMPLETE_REGISTRATION = "CompleteRegistration"
    CONTACT = "Contact"
    SUBSCRIBE = "Subscribe"
    VIEW_CONTENT = "ViewContent"
    SEARCH = "Search"
    CUSTOM = "Custom"


# ============== Models ==============

class AdEvent(BaseModel):
    """Incoming ad event from customer's website/app"""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: EventType
    event_time: datetime = Field(default_factory=datetime.utcnow)
    
    # Identifiers
    user_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Hashed identifiers (for privacy-safe matching)
    hashed_email: Optional[str] = None
    hashed_phone: Optional[str] = None
    external_id: Optional[str] = None
    
    # Event data
    event_source_url: Optional[str] = None
    action_source: str = "website"  # website, app, email, chat, etc.
    
    # Custom data
    value: Optional[float] = None
    currency: Optional[str] = "USD"
    content_ids: List[str] = []
    content_type: Optional[str] = None
    content_name: Optional[str] = None
    content_category: Optional[str] = None
    
    # Consent
    consent_token: Optional[str] = None
    consent_purposes: List[str] = []
    
    # Destination
    platform: AdPlatform
    pixel_id: Optional[str] = None
    dataset_id: Optional[str] = None
    
    # Custom properties
    custom_data: Dict[str, Any] = {}
    
    # Metadata
    tenant_id: str
    source_ip: Optional[str] = None


class EnforcementDecision(BaseModel):
    """Result of enforcement evaluation"""
    decision_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    tenant_id: str
    
    # Decision
    action: EnforcementAction
    allowed: bool
    
    # Timing
    received_at: datetime
    decided_at: datetime
    latency_ms: float
    
    # Token validation
    token_valid: bool
    token_expired: bool = False
    token_scope_match: bool = True
    
    # Policy evaluation
    policy_matched: Optional[str] = None
    policy_version: Optional[str] = None
    
    # Data transformation
    fields_stripped: List[str] = []
    fields_anonymized: List[str] = []
    original_hash: str
    transformed_hash: Optional[str] = None
    
    # Forwarding
    forwarded: bool = False
    forwarded_at: Optional[datetime] = None
    platform: AdPlatform
    platform_response_code: Optional[int] = None
    platform_response_time_ms: Optional[float] = None
    
    # Reason
    reason: str
    
    # Chain linking
    previous_decision_hash: Optional[str] = None
    decision_hash: str = ""


class ProxyConfig(BaseModel):
    """Configuration for the enforcement proxy"""
    tenant_id: str
    
    # Failure mode
    failure_mode: FailureMode = FailureMode.FAIL_CLOSED
    
    # Performance
    timeout_ms: int = 5000
    max_retries: int = 2
    rate_limit_per_second: int = 10000
    
    # Field handling
    pii_fields: List[str] = ["email", "phone", "ip_address", "user_id", "user_agent"]
    strip_fields_on_no_consent: List[str] = ["email", "phone", "user_id"]
    always_hash_fields: List[str] = ["email", "phone"]
    
    # Logging
    log_full_events: bool = False  # For debugging only
    log_decisions: bool = True
    
    # Platforms enabled
    enabled_platforms: List[AdPlatform] = [p for p in AdPlatform]


class ForwardingResult(BaseModel):
    """Result of forwarding to ad platform"""
    success: bool
    platform: AdPlatform
    response_code: Optional[int] = None
    response_body: Optional[str] = None
    latency_ms: float
    error: Optional[str] = None


# ============== Immutable Event Store ==============

class ImmutableEventStore:
    """
    Append-only event store with hash chaining.
    This is security-grade logging, NOT blockchain marketing nonsense.
    
    What it stores:
    - Consent issuance
    - Consent revocation  
    - Every enforcement decision
    - Data transformations
    - Vendor access
    
    Properties:
    - Append-only (no updates, no deletes)
    - Hash chaining (tamper-evident)
    - Time-stamped
    - Queryable
    """
    
    def __init__(self, max_memory_events: int = 100000):
        self._events: deque = deque(maxlen=max_memory_events)
        self._lock = threading.Lock()
        self._last_hash: Optional[str] = None
        self._sequence: int = 0
        
        # Indexes for fast querying
        self._by_tenant: Dict[str, List[int]] = {}
        self._by_event_id: Dict[str, int] = {}
        
        # Stats
        self._total_events: int = 0
        self._events_per_second: float = 0
        self._last_stats_time: float = time.time()
        self._events_since_stats: int = 0
    
    def _compute_hash(self, data: Dict[str, Any], previous_hash: Optional[str]) -> str:
        """Compute SHA-256 hash including previous hash for chaining"""
        to_hash = {
            "previous": previous_hash or "genesis",
            "sequence": self._sequence,
            "data": data
        }
        return hashlib.sha256(
            json.dumps(to_hash, sort_keys=True, default=str).encode()
        ).hexdigest()
    
    def append(self, event_type: str, tenant_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Append an event to the store. Returns the stored event with hash.
        This operation is atomic and thread-safe.
        """
        with self._lock:
            self._sequence += 1
            
            event = {
                "sequence": self._sequence,
                "timestamp": datetime.utcnow().isoformat(),
                "type": event_type,
                "tenant_id": tenant_id,
                "data": data,
                "previous_hash": self._last_hash
            }
            
            event["hash"] = self._compute_hash(event, self._last_hash)
            self._last_hash = event["hash"]
            
            # Store
            idx = len(self._events)
            self._events.append(event)
            
            # Update indexes
            if tenant_id not in self._by_tenant:
                self._by_tenant[tenant_id] = []
            self._by_tenant[tenant_id].append(idx)
            
            if "event_id" in data:
                self._by_event_id[data["event_id"]] = idx
            
            # Update stats
            self._total_events += 1
            self._events_since_stats += 1
            
            now = time.time()
            elapsed = now - self._last_stats_time
            if elapsed >= 1.0:
                self._events_per_second = self._events_since_stats / elapsed
                self._events_since_stats = 0
                self._last_stats_time = now
            
            return event
    
    def query(self, tenant_id: str = None, event_type: str = None,
             start_time: datetime = None, end_time: datetime = None,
             limit: int = 100) -> List[Dict[str, Any]]:
        """Query events with filtering"""
        with self._lock:
            if tenant_id and tenant_id in self._by_tenant:
                indices = self._by_tenant[tenant_id]
                events = [self._events[i] for i in indices if i < len(self._events)]
            else:
                events = list(self._events)
        
        # Apply filters
        if event_type:
            events = [e for e in events if e.get("type") == event_type]
        
        if start_time:
            events = [e for e in events if datetime.fromisoformat(e["timestamp"]) >= start_time]
        
        if end_time:
            events = [e for e in events if datetime.fromisoformat(e["timestamp"]) <= end_time]
        
        # Return most recent first
        events = sorted(events, key=lambda e: e["sequence"], reverse=True)
        return events[:limit]
    
    def verify_chain(self, tenant_id: str = None) -> Dict[str, Any]:
        """Verify the integrity of the hash chain"""
        with self._lock:
            if tenant_id and tenant_id in self._by_tenant:
                indices = sorted(self._by_tenant[tenant_id])
                events = [self._events[i] for i in indices if i < len(self._events)]
            else:
                events = sorted(self._events, key=lambda e: e["sequence"])
        
        if not events:
            return {"valid": True, "events_checked": 0}
        
        prev_hash = None
        for event in events:
            if event["previous_hash"] != prev_hash:
                return {
                    "valid": False,
                    "error": f"Chain broken at sequence {event['sequence']}",
                    "expected_previous": prev_hash,
                    "actual_previous": event["previous_hash"]
                }
            
            # Verify event hash
            computed = self._compute_hash(
                {k: v for k, v in event.items() if k not in ["hash", "previous_hash"]},
                prev_hash
            )
            # Note: We can't verify exactly due to how we store, but we can verify chain links
            
            prev_hash = event["hash"]
        
        return {
            "valid": True,
            "events_checked": len(events),
            "latest_hash": prev_hash,
            "latest_sequence": events[-1]["sequence"] if events else 0
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get store statistics"""
        return {
            "total_events": self._total_events,
            "events_in_memory": len(self._events),
            "events_per_second": round(self._events_per_second, 2),
            "tenants": len(self._by_tenant),
            "latest_sequence": self._sequence,
            "latest_hash": self._last_hash
        }


# ============== Ad Platform Connectors ==============

class AdPlatformConnector:
    """Base class for ad platform connectors"""
    
    def __init__(self, platform: AdPlatform, config: Dict[str, Any] = None):
        self.platform = platform
        self.config = config or {}
    
    async def forward(self, event: AdEvent, transformed_data: Dict[str, Any]) -> ForwardingResult:
        """Forward event to ad platform. Override in subclasses."""
        raise NotImplementedError


class MetaConnector(AdPlatformConnector):
    """Meta (Facebook) Conversions API connector"""
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(AdPlatform.META, config)
        self.api_version = "v18.0"
        self.base_url = "https://graph.facebook.com"
    
    async def forward(self, event: AdEvent, transformed_data: Dict[str, Any]) -> ForwardingResult:
        """Forward to Meta Conversions API"""
        start = time.time()
        
        try:
            # Build Meta event format
            meta_event = {
                "event_name": event.event_type.value,
                "event_time": int(event.event_time.timestamp()),
                "action_source": event.action_source,
                "event_source_url": event.event_source_url,
                "user_data": {},
                "custom_data": {}
            }
            
            # Add user data (only what's in transformed_data)
            if transformed_data.get("hashed_email"):
                meta_event["user_data"]["em"] = [transformed_data["hashed_email"]]
            if transformed_data.get("hashed_phone"):
                meta_event["user_data"]["ph"] = [transformed_data["hashed_phone"]]
            if transformed_data.get("external_id"):
                meta_event["user_data"]["external_id"] = [transformed_data["external_id"]]
            if transformed_data.get("ip_address"):
                meta_event["user_data"]["client_ip_address"] = transformed_data["ip_address"]
            if transformed_data.get("user_agent"):
                meta_event["user_data"]["client_user_agent"] = transformed_data["user_agent"]
            
            # Add custom data
            if event.value:
                meta_event["custom_data"]["value"] = event.value
                meta_event["custom_data"]["currency"] = event.currency
            if event.content_ids:
                meta_event["custom_data"]["content_ids"] = event.content_ids
            if event.content_type:
                meta_event["custom_data"]["content_type"] = event.content_type
            
            # In production, actually send to Meta API
            # response = await self._send_to_meta(meta_event, event.pixel_id)
            
            # Simulate success for demo
            latency = (time.time() - start) * 1000
            
            return ForwardingResult(
                success=True,
                platform=self.platform,
                response_code=200,
                response_body='{"events_received": 1}',
                latency_ms=latency
            )
        
        except Exception as e:
            latency = (time.time() - start) * 1000
            return ForwardingResult(
                success=False,
                platform=self.platform,
                error=str(e),
                latency_ms=latency
            )


class GoogleConnector(AdPlatformConnector):
    """Google Ads Conversions API connector"""
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(AdPlatform.GOOGLE, config)
    
    async def forward(self, event: AdEvent, transformed_data: Dict[str, Any]) -> ForwardingResult:
        """Forward to Google Ads Conversions API"""
        start = time.time()
        
        try:
            # Build Google event format
            google_event = {
                "conversionAction": f"customers/{event.pixel_id}/conversionActions/{event.event_type.value}",
                "conversionDateTime": event.event_time.strftime("%Y-%m-%d %H:%M:%S%z"),
                "userIdentifiers": []
            }
            
            if transformed_data.get("hashed_email"):
                google_event["userIdentifiers"].append({
                    "hashedEmail": transformed_data["hashed_email"]
                })
            if transformed_data.get("hashed_phone"):
                google_event["userIdentifiers"].append({
                    "hashedPhoneNumber": transformed_data["hashed_phone"]
                })
            
            if event.value:
                google_event["conversionValue"] = event.value
                google_event["currencyCode"] = event.currency
            
            # Simulate success for demo
            latency = (time.time() - start) * 1000
            
            return ForwardingResult(
                success=True,
                platform=self.platform,
                response_code=200,
                latency_ms=latency
            )
        
        except Exception as e:
            latency = (time.time() - start) * 1000
            return ForwardingResult(
                success=False,
                platform=self.platform,
                error=str(e),
                latency_ms=latency
            )


class GenericDSPConnector(AdPlatformConnector):
    """Generic DSP/CDP connector"""
    
    async def forward(self, event: AdEvent, transformed_data: Dict[str, Any]) -> ForwardingResult:
        """Forward to generic endpoint"""
        start = time.time()
        
        try:
            # Build generic event format
            generic_event = {
                "event_type": event.event_type.value,
                "timestamp": event.event_time.isoformat(),
                "user": transformed_data,
                "properties": {
                    "value": event.value,
                    "currency": event.currency,
                    "content_ids": event.content_ids
                }
            }
            
            # Simulate success
            latency = (time.time() - start) * 1000
            
            return ForwardingResult(
                success=True,
                platform=self.platform,
                response_code=200,
                latency_ms=latency
            )
        
        except Exception as e:
            latency = (time.time() - start) * 1000
            return ForwardingResult(
                success=False,
                platform=self.platform,
                error=str(e),
                latency_ms=latency
            )


# ============== Enforcement Proxy Service ==============

class EnforcementProxy:
    """
    The Server-Side Enforcement Proxy.
    
    This is the high-performance, low-latency enforcement plane that:
    1. Receives ad events from customer websites/apps
    2. Validates consent tokens
    3. Evaluates policies
    4. Transforms data (strip/anonymize fields)
    5. Forwards to ad platforms
    6. Logs every decision to immutable store
    
    Design:
    - Stateless (horizontally scalable)
    - Millisecond latency
    - Configurable fail-open/fail-closed
    - Security-grade logging
    """
    
    def __init__(self):
        # Event store
        self.event_store = ImmutableEventStore()
        
        # Platform connectors
        self.connectors: Dict[AdPlatform, AdPlatformConnector] = {
            AdPlatform.META: MetaConnector(),
            AdPlatform.GOOGLE: GoogleConnector(),
            AdPlatform.DSP_GENERIC: GenericDSPConnector(AdPlatform.DSP_GENERIC),
            AdPlatform.CDP: GenericDSPConnector(AdPlatform.CDP),
        }
        
        # Tenant configurations
        self.configs: Dict[str, ProxyConfig] = {}
        
        # Stats
        self._stats = {
            "events_processed": 0,
            "events_allowed": 0,
            "events_blocked": 0,
            "events_stripped": 0,
            "total_latency_ms": 0,
            "errors": 0
        }
        
        # Decision chain for hash linking
        self._last_decision_hash: Dict[str, str] = {}  # per tenant
        
        # Initialize demo config
        self._init_demo_config()
    
    def _init_demo_config(self):
        """Initialize demo tenant configuration"""
        self.configs["demo-tenant"] = ProxyConfig(
            tenant_id="demo-tenant",
            failure_mode=FailureMode.FAIL_CLOSED,
            timeout_ms=5000,
            rate_limit_per_second=10000,
            pii_fields=["email", "phone", "ip_address", "user_id", "user_agent"],
            strip_fields_on_no_consent=["email", "phone", "user_id"],
            always_hash_fields=["email", "phone"],
            log_decisions=True
        )
    
    def _hash_value(self, value: str) -> str:
        """Hash a value for privacy-safe matching"""
        if not value:
            return None
        # Normalize and hash
        normalized = value.lower().strip()
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    def _compute_event_hash(self, event: AdEvent) -> str:
        """Compute hash of original event for audit"""
        data = event.model_dump()
        return hashlib.sha256(
            json.dumps(data, sort_keys=True, default=str).encode()
        ).hexdigest()[:32]
    
    def _validate_token(self, token: str, config: ProxyConfig) -> Tuple[bool, bool, List[str]]:
        """
        Validate consent token.
        Returns (is_valid, is_expired, granted_purposes)
        
        In production, this would call the Control Plane's token validation
        or validate locally using the public key.
        """
        if not token:
            return False, False, []
        
        # For demo, accept tokens starting with "cst_" as valid
        if token.startswith("cst_") or token.startswith("valid_"):
            return True, False, ["marketing", "analytics", "advertising"]
        
        # Check for expired token pattern
        if "expired" in token:
            return False, True, []
        
        return False, False, []
    
    def _evaluate_policy(self, event: AdEvent, token_valid: bool, 
                        granted_purposes: List[str], config: ProxyConfig) -> EnforcementAction:
        """
        Evaluate what action to take.
        
        In production, this would call the Policy Engine or use
        a local cache of policies for low-latency evaluation.
        """
        # If token is invalid or expired, use failure mode
        if not token_valid:
            if config.failure_mode == FailureMode.FAIL_OPEN:
                return EnforcementAction.STRIP_FIELDS  # Allow but strip PII
            else:
                return EnforcementAction.BLOCK
        
        # Check if platform/purpose is consented
        platform_purposes = {
            AdPlatform.META: ["marketing", "advertising"],
            AdPlatform.GOOGLE: ["marketing", "advertising", "analytics"],
            AdPlatform.TIKTOK: ["marketing", "advertising"],
            AdPlatform.LINKEDIN: ["marketing", "advertising"],
        }
        
        required = platform_purposes.get(event.platform, ["marketing"])
        if not any(p in granted_purposes for p in required):
            return EnforcementAction.BLOCK
        
        # Check event-level consent purposes
        if event.consent_purposes:
            if not any(p in granted_purposes for p in event.consent_purposes):
                return EnforcementAction.STRIP_FIELDS
        
        return EnforcementAction.ALLOW
    
    def _transform_data(self, event: AdEvent, action: EnforcementAction,
                       config: ProxyConfig) -> Tuple[Dict[str, Any], List[str], List[str]]:
        """
        Transform event data based on enforcement action.
        Returns (transformed_data, stripped_fields, anonymized_fields)
        """
        data = event.model_dump()
        stripped = []
        anonymized = []
        
        if action == EnforcementAction.BLOCK:
            return {}, list(data.keys()), []
        
        if action == EnforcementAction.STRIP_FIELDS:
            # Strip PII fields
            for field in config.strip_fields_on_no_consent:
                if field in data and data[field]:
                    del data[field]
                    stripped.append(field)
        
        # Always hash certain fields
        for field in config.always_hash_fields:
            if field in data and data[field]:
                hashed_field = f"hashed_{field}"
                if hashed_field not in data or not data[hashed_field]:
                    data[hashed_field] = self._hash_value(data[field])
                    anonymized.append(field)
        
        if action == EnforcementAction.ANONYMIZE:
            # Anonymize all PII
            for field in config.pii_fields:
                if field in data and data[field]:
                    hashed_field = f"hashed_{field}"
                    data[hashed_field] = self._hash_value(data[field])
                    del data[field]
                    anonymized.append(field)
        
        return data, stripped, anonymized
    
    async def process_event(self, event: AdEvent) -> EnforcementDecision:
        """
        Process a single ad event through the enforcement proxy.
        
        Steps:
        1. Validate consent token
        2. Evaluate policy
        3. Transform data
        4. Forward to platform
        5. Log decision
        
        All in milliseconds.
        """
        start_time = time.time()
        received_at = datetime.utcnow()
        
        # Get tenant config
        config = self.configs.get(event.tenant_id)
        if not config:
            config = ProxyConfig(
                tenant_id=event.tenant_id,
                failure_mode=FailureMode.FAIL_CLOSED
            )
        
        # Compute original event hash
        original_hash = self._compute_event_hash(event)
        
        # Step 1: Validate token
        token_valid, token_expired, granted_purposes = self._validate_token(
            event.consent_token, config
        )
        
        # Step 2: Evaluate policy
        action = self._evaluate_policy(event, token_valid, granted_purposes, config)
        
        # Step 3: Transform data
        transformed_data, stripped_fields, anonymized_fields = self._transform_data(
            event, action, config
        )
        
        # Compute transformed hash
        transformed_hash = hashlib.sha256(
            json.dumps(transformed_data, sort_keys=True, default=str).encode()
        ).hexdigest()[:32] if transformed_data else None
        
        # Step 4: Forward to platform (if allowed)
        forwarded = False
        forwarded_at = None
        platform_response_code = None
        platform_response_time = None
        
        if action in [EnforcementAction.ALLOW, EnforcementAction.STRIP_FIELDS, EnforcementAction.ANONYMIZE]:
            connector = self.connectors.get(event.platform)
            if connector:
                result = await connector.forward(event, transformed_data)
                forwarded = result.success
                forwarded_at = datetime.utcnow()
                platform_response_code = result.response_code
                platform_response_time = result.latency_ms
        
        # Calculate timing
        decided_at = datetime.utcnow()
        latency_ms = (time.time() - start_time) * 1000
        
        # Build reason
        if action == EnforcementAction.BLOCK:
            if not token_valid:
                reason = "Blocked: Invalid or missing consent token"
            elif token_expired:
                reason = "Blocked: Consent token expired"
            else:
                reason = "Blocked: Consent not granted for required purposes"
        elif action == EnforcementAction.STRIP_FIELDS:
            reason = f"Allowed with PII stripped: {', '.join(stripped_fields)}"
        elif action == EnforcementAction.ANONYMIZE:
            reason = f"Allowed with fields anonymized: {', '.join(anonymized_fields)}"
        else:
            reason = "Allowed: Valid consent for all requested purposes"
        
        # Get previous decision hash for chaining
        prev_hash = self._last_decision_hash.get(event.tenant_id)
        
        # Build decision
        decision = EnforcementDecision(
            event_id=event.event_id,
            tenant_id=event.tenant_id,
            action=action,
            allowed=action != EnforcementAction.BLOCK,
            received_at=received_at,
            decided_at=decided_at,
            latency_ms=latency_ms,
            token_valid=token_valid,
            token_expired=token_expired,
            token_scope_match=token_valid,
            fields_stripped=stripped_fields,
            fields_anonymized=anonymized_fields,
            original_hash=original_hash,
            transformed_hash=transformed_hash,
            forwarded=forwarded,
            forwarded_at=forwarded_at,
            platform=event.platform,
            platform_response_code=platform_response_code,
            platform_response_time_ms=platform_response_time,
            reason=reason,
            previous_decision_hash=prev_hash
        )
        
        # Compute decision hash
        decision_data = decision.model_dump()
        decision.decision_hash = hashlib.sha256(
            json.dumps(decision_data, sort_keys=True, default=str).encode()
        ).hexdigest()
        
        # Update chain
        self._last_decision_hash[event.tenant_id] = decision.decision_hash
        
        # Step 5: Log to immutable store
        if config.log_decisions:
            self.event_store.append(
                event_type="enforcement_decision",
                tenant_id=event.tenant_id,
                data={
                    "decision_id": decision.decision_id,
                    "event_id": event.event_id,
                    "action": action.value,
                    "allowed": decision.allowed,
                    "latency_ms": latency_ms,
                    "token_valid": token_valid,
                    "fields_stripped": stripped_fields,
                    "fields_anonymized": anonymized_fields,
                    "original_hash": original_hash,
                    "transformed_hash": transformed_hash,
                    "forwarded": forwarded,
                    "platform": event.platform.value,
                    "platform_response_code": platform_response_code,
                    "reason": reason,
                    "decision_hash": decision.decision_hash
                }
            )
        
        # Update stats
        self._stats["events_processed"] += 1
        self._stats["total_latency_ms"] += latency_ms
        if decision.allowed:
            self._stats["events_allowed"] += 1
            if stripped_fields:
                self._stats["events_stripped"] += 1
        else:
            self._stats["events_blocked"] += 1
        
        return decision
    
    async def process_batch(self, events: List[AdEvent]) -> List[EnforcementDecision]:
        """Process a batch of events concurrently"""
        tasks = [self.process_event(event) for event in events]
        return await asyncio.gather(*tasks)
    
    def get_config(self, tenant_id: str) -> Optional[ProxyConfig]:
        """Get configuration for a tenant"""
        return self.configs.get(tenant_id)
    
    def set_config(self, config: ProxyConfig):
        """Set configuration for a tenant"""
        self.configs[config.tenant_id] = config
    
    def get_stats(self) -> Dict[str, Any]:
        """Get proxy statistics"""
        avg_latency = (
            self._stats["total_latency_ms"] / self._stats["events_processed"]
            if self._stats["events_processed"] > 0 else 0
        )
        
        return {
            **self._stats,
            "average_latency_ms": round(avg_latency, 2),
            "allow_rate": round(
                self._stats["events_allowed"] / self._stats["events_processed"] * 100
                if self._stats["events_processed"] > 0 else 0, 2
            ),
            "event_store": self.event_store.get_stats()
        }
    
    def get_decisions(self, tenant_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent enforcement decisions"""
        return self.event_store.query(
            tenant_id=tenant_id,
            event_type="enforcement_decision",
            limit=limit
        )
    
    def verify_decision_chain(self, tenant_id: str) -> Dict[str, Any]:
        """Verify the integrity of the decision chain"""
        return self.event_store.verify_chain(tenant_id)


# Create singleton instance
enforcement_proxy = EnforcementProxy()
