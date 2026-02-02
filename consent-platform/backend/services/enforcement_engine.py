"""
Enforcement Engine

The core decision-making engine for ad event enforcement.

Decision Flow:
1. Validate token signature
2. Check expiration
3. Check purpose allowed
4. Check vendor allowed
5. Check data class restrictions
6. Check constraints
7. Return: ALLOW | MODIFY | BLOCK

Simple by design. No OPA. No Rego. Just clear rules.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Set, Tuple
from pydantic import BaseModel, Field
from enum import Enum
import hashlib
import json
import time

from .token_service import (
    token_service, TokenValidationResult, TokenStatus,
    PurposeConsent, VendorConsent, ConsentConstraints
)


# ============== Enums ==============

class Decision(str, Enum):
    ALLOWED = "allowed"
    MODIFIED = "modified"
    BLOCKED = "blocked"


class BlockReason(str, Enum):
    TOKEN_MISSING = "token_missing"
    TOKEN_INVALID = "token_invalid"
    TOKEN_EXPIRED = "token_expired"
    TOKEN_REVOKED = "token_revoked"
    VENDOR_NOT_ALLOWED = "vendor_not_allowed"
    PURPOSE_NOT_ALLOWED = "purpose_not_allowed"
    DATA_CLASS_VIOLATION = "data_class_violation"
    CONSTRAINT_VIOLATION = "constraint_violation"


class DataClass(str, Enum):
    """Standard data classification"""
    BEHAVIORAL = "behavioral"      # Page views, clicks, events
    DEVICE = "device"              # Device fingerprint, user agent
    LOCATION = "location"          # IP, geo
    IDENTITY = "identity"          # Email, phone, user ID
    TRANSACTION = "transaction"    # Purchase data
    DEMOGRAPHIC = "demographic"    # Age, gender
    INTEREST = "interest"          # Inferred interests


# ============== Models ==============

class AdEvent(BaseModel):
    """Incoming ad event from customer"""
    event_id: str
    event_type: str  # page_view, purchase, add_to_cart, etc.
    vendor: str      # meta, google, etc.
    
    # Data present in this event
    data_classes: List[str] = []  # Which data classes this event contains
    
    # User identification
    user_id: Optional[str] = None
    hashed_email: Optional[str] = None
    hashed_phone: Optional[str] = None
    external_id: Optional[str] = None
    
    # Device/Location (PII)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_fingerprint: Optional[str] = None
    geo_location: Optional[Dict[str, Any]] = None
    
    # Event data
    url: Optional[str] = None
    referrer: Optional[str] = None
    value: Optional[float] = None
    currency: Optional[str] = "USD"
    
    # Custom properties
    properties: Dict[str, Any] = {}
    
    # Cross-site indicator
    is_cross_site: bool = False


class EnforcementResult(BaseModel):
    """Result of enforcement decision"""
    decision: Decision
    reason: Optional[str] = None
    policy_id: Optional[str] = None
    
    # Token info
    token_valid: bool
    token_expired: bool = False
    token_status: TokenStatus
    
    # Modifications applied
    fields_stripped: List[str] = []
    fields_anonymized: List[str] = []
    data_classes_removed: List[str] = []
    
    # Original event hash (for audit)
    original_event_hash: str
    
    # Modified event (if decision is MODIFIED or ALLOWED)
    modified_event: Optional[Dict[str, Any]] = None
    
    # Timing
    latency_ms: float


# ============== Purpose Mapping ==============

# Map event types to purposes
EVENT_PURPOSE_MAP: Dict[str, str] = {
    # Advertising
    "page_view": "analytics",
    "view_content": "analytics",
    "search": "analytics",
    
    # Retargeting
    "add_to_cart": "retargeting",
    "initiate_checkout": "retargeting",
    "purchase": "retargeting",
    
    # Lead generation
    "lead": "marketing",
    "subscribe": "marketing",
    "complete_registration": "marketing",
    "contact": "marketing",
}


# Data class to field mapping
DATA_CLASS_FIELDS: Dict[str, List[str]] = {
    DataClass.IDENTITY: ["user_id", "hashed_email", "hashed_phone", "external_id"],
    DataClass.DEVICE: ["user_agent", "device_fingerprint"],
    DataClass.LOCATION: ["ip_address", "geo_location"],
    DataClass.BEHAVIORAL: ["url", "referrer", "event_type"],
    DataClass.TRANSACTION: ["value", "currency"],
}


# ============== Enforcement Engine ==============

class EnforcementEngine:
    """
    The enforcement decision engine.
    
    Rules (evaluated in order):
    1. if token missing → block (or allow based on failure_mode)
    2. if token invalid → block
    3. if token expired → block
    4. if vendor not allowed → block
    5. if purpose not allowed → block
    6. if data class violation → strip fields
    7. if constraint violated → strip fields
    8. else → allow
    """
    
    def __init__(self, failure_mode: str = "fail_closed"):
        """
        Initialize the engine.
        
        failure_mode:
            - "fail_closed": Block on any error (security-first)
            - "fail_open": Allow on error, but strip PII (availability-first)
        """
        self.failure_mode = failure_mode
    
    def _hash_event(self, event: AdEvent) -> str:
        """Hash the original event for audit trail"""
        data = event.model_dump()
        return hashlib.sha256(
            json.dumps(data, sort_keys=True, default=str).encode()
        ).hexdigest()[:32]
    
    def _get_purpose(self, event_type: str) -> str:
        """Map event type to consent purpose"""
        return EVENT_PURPOSE_MAP.get(event_type.lower(), "analytics")
    
    def _strip_fields_for_data_class(self, event_dict: Dict[str, Any], 
                                      data_class: str) -> List[str]:
        """Strip fields belonging to a data class"""
        stripped = []
        fields = DATA_CLASS_FIELDS.get(data_class, [])
        
        for field in fields:
            if field in event_dict and event_dict[field] is not None:
                event_dict[field] = None
                stripped.append(field)
        
        return stripped
    
    def _anonymize_field(self, value: Any) -> str:
        """Anonymize a field value"""
        if value is None:
            return None
        return hashlib.sha256(str(value).encode()).hexdigest()[:16]
    
    def enforce(
        self,
        tenant_id: str,
        event: AdEvent,
        token_string: Optional[str]
    ) -> EnforcementResult:
        """
        Evaluate enforcement rules and return decision.
        
        This is the critical path - must be fast.
        """
        start_time = time.time()
        original_hash = self._hash_event(event)
        event_dict = event.model_dump()
        
        # Rule 0: Token missing
        if not token_string:
            if self.failure_mode == "fail_open":
                # Strip all PII and allow
                stripped = self._apply_fail_open_stripping(event_dict)
                return EnforcementResult(
                    decision=Decision.MODIFIED,
                    reason="no_token_fail_open",
                    token_valid=False,
                    token_status=TokenStatus.REVOKED,
                    fields_stripped=stripped,
                    original_event_hash=original_hash,
                    modified_event=event_dict,
                    latency_ms=self._elapsed_ms(start_time)
                )
            else:
                return EnforcementResult(
                    decision=Decision.BLOCKED,
                    reason=BlockReason.TOKEN_MISSING,
                    token_valid=False,
                    token_status=TokenStatus.REVOKED,
                    original_event_hash=original_hash,
                    latency_ms=self._elapsed_ms(start_time)
                )
        
        # Rule 1: Validate token
        validation = token_service.validate_token(tenant_id, token_string)
        
        if not validation.valid:
            if validation.status == TokenStatus.EXPIRED:
                return EnforcementResult(
                    decision=Decision.BLOCKED,
                    reason=BlockReason.TOKEN_EXPIRED,
                    token_valid=False,
                    token_expired=True,
                    token_status=validation.status,
                    original_event_hash=original_hash,
                    latency_ms=self._elapsed_ms(start_time)
                )
            else:
                return EnforcementResult(
                    decision=Decision.BLOCKED,
                    reason=validation.reason or BlockReason.TOKEN_INVALID,
                    token_valid=False,
                    token_status=validation.status,
                    original_event_hash=original_hash,
                    latency_ms=self._elapsed_ms(start_time)
                )
        
        # Token is valid - extract consent data
        purposes = validation.purposes
        vendors = validation.vendors
        constraints = validation.constraints
        
        # Rule 2: Check vendor allowed
        vendor_consent = vendors.get(event.vendor)
        if not vendor_consent or not vendor_consent.allowed:
            return EnforcementResult(
                decision=Decision.BLOCKED,
                reason=BlockReason.VENDOR_NOT_ALLOWED,
                token_valid=True,
                token_status=TokenStatus.ACTIVE,
                original_event_hash=original_hash,
                latency_ms=self._elapsed_ms(start_time)
            )
        
        # Rule 3: Check purpose allowed
        required_purpose = self._get_purpose(event.event_type)
        purpose_consent = purposes.get(required_purpose)
        if not purpose_consent or not purpose_consent.allowed:
            return EnforcementResult(
                decision=Decision.BLOCKED,
                reason=BlockReason.PURPOSE_NOT_ALLOWED,
                token_valid=True,
                token_status=TokenStatus.ACTIVE,
                original_event_hash=original_hash,
                latency_ms=self._elapsed_ms(start_time)
            )
        
        # Rule 4: Check data class restrictions
        allowed_classes = set(vendor_consent.data_classes)
        event_classes = set(event.data_classes)
        
        stripped = []
        removed_classes = []
        
        if allowed_classes and event_classes:
            # Strip fields for disallowed data classes
            disallowed = event_classes - allowed_classes
            for data_class in disallowed:
                class_stripped = self._strip_fields_for_data_class(event_dict, data_class)
                stripped.extend(class_stripped)
                removed_classes.append(data_class)
        
        # Rule 5: Check constraints
        anonymized = []
        
        if constraints:
            if constraints.no_cross_site and event.is_cross_site:
                # Strip cross-site identifiers
                cross_site_fields = ["referrer", "external_id"]
                for field in cross_site_fields:
                    if event_dict.get(field):
                        event_dict[field] = None
                        stripped.append(field)
            
            if constraints.no_enrichment:
                # Don't allow external ID matching
                if event_dict.get("external_id"):
                    event_dict["external_id"] = None
                    stripped.append("external_id")
            
            if constraints.no_profiling:
                # Strip behavioral data
                behavioral_stripped = self._strip_fields_for_data_class(
                    event_dict, DataClass.BEHAVIORAL
                )
                stripped.extend(behavioral_stripped)
        
        # Determine final decision
        if stripped or anonymized or removed_classes:
            decision = Decision.MODIFIED
            reason = f"fields_stripped:{len(stripped)}"
        else:
            decision = Decision.ALLOWED
            reason = "all_checks_passed"
        
        return EnforcementResult(
            decision=decision,
            reason=reason,
            token_valid=True,
            token_status=TokenStatus.ACTIVE,
            fields_stripped=stripped,
            fields_anonymized=anonymized,
            data_classes_removed=removed_classes,
            original_event_hash=original_hash,
            modified_event=event_dict,
            latency_ms=self._elapsed_ms(start_time)
        )
    
    def _apply_fail_open_stripping(self, event_dict: Dict[str, Any]) -> List[str]:
        """Strip all PII when failing open"""
        stripped = []
        pii_fields = [
            "user_id", "hashed_email", "hashed_phone", "external_id",
            "ip_address", "device_fingerprint", "geo_location"
        ]
        for field in pii_fields:
            if event_dict.get(field):
                event_dict[field] = None
                stripped.append(field)
        return stripped
    
    def _elapsed_ms(self, start_time: float) -> float:
        """Calculate elapsed time in milliseconds"""
        return (time.time() - start_time) * 1000


# Singleton instance
enforcement_engine = EnforcementEngine(failure_mode="fail_closed")
