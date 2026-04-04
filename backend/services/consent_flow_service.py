"""
Consent Flow Service
Implements the complete consent flow:
User Consent → Authorization Token → Ad Data Proxy → Vendor/Platform → Evidence Ledger
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import hashlib
import secrets
import uuid
import json
import hmac


# ============== Enums ==============

class TokenType(str, Enum):
    BEARER = "bearer"
    JWT = "jwt"
    OPAQUE = "opaque"


class TokenStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"
    EXHAUSTED = "exhausted"


class VendorType(str, Enum):
    AD_PLATFORM = "ad_platform"
    ANALYTICS = "analytics"
    MARKETING = "marketing"
    SOCIAL = "social"
    DATA_BROKER = "data_broker"
    CRM = "crm"
    CDP = "cdp"
    DMP = "dmp"
    OTHER = "other"


class IntegrationType(str, Enum):
    API = "api"
    PIXEL = "pixel"
    SDK = "sdk"
    SERVER_TO_SERVER = "server_to_server"
    WEBHOOK = "webhook"
    FILE_TRANSFER = "file_transfer"


class ProxyAction(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    FILTER = "filter"
    ANONYMIZE = "anonymize"
    AGGREGATE = "aggregate"
    DELAY = "delay"
    REQUIRE_CONSENT = "require_consent"


class TransactionStatus(str, Enum):
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    FILTERED = "filtered"
    PENDING = "pending"
    FAILED = "failed"
    TIMEOUT = "timeout"


class EvidenceEventType(str, Enum):
    CONSENT_GIVEN = "consent_given"
    CONSENT_WITHDRAWN = "consent_withdrawn"
    CONSENT_EXPIRED = "consent_expired"
    TOKEN_ISSUED = "token_issued"
    TOKEN_USED = "token_used"
    TOKEN_REVOKED = "token_revoked"
    DATA_REQUESTED = "data_requested"
    DATA_ALLOWED = "data_allowed"
    DATA_BLOCKED = "data_blocked"
    DATA_FILTERED = "data_filtered"
    VENDOR_DATA_SENT = "vendor_data_sent"
    VENDOR_DATA_FAILED = "vendor_data_failed"
    DSAR_RECEIVED = "dsar_received"
    DSAR_COMPLETED = "dsar_completed"
    POLICY_UPDATED = "policy_updated"
    PURPOSE_CREATED = "purpose_created"
    PURPOSE_DELETED = "purpose_deleted"


class FlowStage(str, Enum):
    CONSENT = "consent"
    TOKEN = "token"
    PROXY = "proxy"
    VENDOR = "vendor"
    EVIDENCE = "evidence"
    COMPLETED = "completed"
    FAILED = "failed"


# ============== Models ==============

class AuthorizationTokenCreate(BaseModel):
    subject_id: str
    granted_purposes: List[str]
    granted_scopes: List[str] = []
    expires_in_seconds: int = 3600
    vendor_id: Optional[str] = None
    max_uses: Optional[int] = None


class AuthorizationToken(BaseModel):
    id: str
    organization_id: str
    subject_id: str
    token_prefix: str
    token_type: TokenType = TokenType.BEARER
    granted_purposes: List[str]
    granted_scopes: List[str]
    consent_record_ids: List[str] = []
    issued_at: datetime
    expires_at: datetime
    last_used_at: Optional[datetime] = None
    use_count: int = 0
    max_uses: Optional[int] = None
    issued_for_vendor_id: Optional[str] = None
    status: TokenStatus = TokenStatus.ACTIVE


class VendorCreate(BaseModel):
    name: str
    vendor_type: VendorType = VendorType.OTHER
    vendor_code: str
    company_name: Optional[str] = None
    website_url: Optional[str] = None
    privacy_policy_url: Optional[str] = None
    api_endpoint: Optional[str] = None
    integration_type: IntegrationType = IntegrationType.API
    data_categories_received: List[str] = []
    purposes_served: List[str] = []
    gdpr_compliant: bool = False
    ccpa_compliant: bool = False


class Vendor(VendorCreate):
    id: str
    organization_id: str
    status: str = "active"
    onboarded_at: datetime
    last_data_sent_at: Optional[datetime] = None


class ProxyRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rule_order: int = 0
    match_vendors: Optional[List[str]] = None
    match_purposes: Optional[List[str]] = None
    match_data_categories: Optional[List[str]] = None
    match_geo_locations: Optional[List[str]] = None
    action: ProxyAction
    filter_fields: List[str] = []
    anonymize_fields: List[str] = []
    required_purposes: List[str] = []
    enabled: bool = True


class ProxyRule(ProxyRuleCreate):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime


class ProxyTransactionCreate(BaseModel):
    subject_id: Optional[str] = None
    token_id: Optional[str] = None
    vendor_id: str
    data_categories: List[str] = []
    purposes: List[str] = []
    payload: Dict[str, Any] = {}


class ProxyTransaction(BaseModel):
    id: str
    organization_id: str
    transaction_id: str
    request_timestamp: datetime
    subject_id: Optional[str]
    token_id: Optional[str]
    vendor_id: str
    data_categories: List[str]
    purposes: List[str]
    rules_evaluated: List[str]
    rule_matched: Optional[str]
    action_taken: str
    fields_filtered: List[str] = []
    fields_anonymized: List[str] = []
    status: TransactionStatus
    response_time_ms: int
    evidence_ledger_id: Optional[str]


class EvidenceLedgerEntry(BaseModel):
    id: str
    organization_id: str
    sequence_number: int
    event_type: EvidenceEventType
    event_timestamp: datetime
    subject_id: Optional[str] = None
    token_id: Optional[str] = None
    vendor_id: Optional[str] = None
    purpose_id: Optional[str] = None
    event_data: Dict[str, Any]
    previous_hash: Optional[str]
    entry_hash: str
    signature: Optional[str] = None


class ConsentFlowSession(BaseModel):
    id: str
    organization_id: str
    flow_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    consent_subject_id: Optional[str] = None
    consent_record_ids: List[str] = []
    consent_timestamp: Optional[datetime] = None
    token_id: Optional[str] = None
    token_issued_at: Optional[datetime] = None
    proxy_transaction_id: Optional[str] = None
    proxy_action: Optional[str] = None
    vendor_id: Optional[str] = None
    vendor_response_status: Optional[str] = None
    evidence_ids: List[str] = []
    current_stage: FlowStage
    status: str = "in_progress"


class DataRequest(BaseModel):
    """Request to send data through the proxy to a vendor"""
    vendor_id: str
    subject_identifier: str
    purposes: List[str]
    data: Dict[str, Any]
    consent_token: Optional[str] = None


class DataResponse(BaseModel):
    """Response from the proxy"""
    transaction_id: str
    status: TransactionStatus
    action_taken: str
    data_sent: Optional[Dict[str, Any]] = None
    blocked_reason: Optional[str] = None
    evidence_id: str
    flow_id: str


# ============== Service Class ==============

class ConsentFlowService:
    """
    Manages the complete consent flow:
    User Consent → Authorization Token → Ad Data Proxy → Vendor/Platform → Evidence Ledger
    """
    
    def __init__(self):
        # In-memory storage
        self.tokens: Dict[str, AuthorizationToken] = {}
        self.token_hashes: Dict[str, str] = {}  # hash -> token_id
        self.vendors: Dict[str, Vendor] = {}
        self.proxy_rules: Dict[str, ProxyRule] = {}
        self.transactions: Dict[str, ProxyTransaction] = {}
        self.evidence_ledger: List[EvidenceLedgerEntry] = []
        self.flow_sessions: Dict[str, ConsentFlowSession] = {}
        
        # Sequence counter for evidence ledger
        self._evidence_sequence = 0
        self._last_evidence_hash = None
        
        # Initialize demo data
        self._init_demo_data()
    
    def _generate_id(self) -> str:
        return str(uuid.uuid4())
    
    def _generate_token(self) -> tuple[str, str, str]:
        """Generate a token and return (full_token, token_hash, token_prefix)"""
        full_token = f"cst_{secrets.token_urlsafe(32)}"
        token_hash = hashlib.sha256(full_token.encode()).hexdigest()
        token_prefix = full_token[:12]
        return full_token, token_hash, token_prefix
    
    def _hash_data(self, data: str) -> str:
        """Create SHA-256 hash of data"""
        return hashlib.sha256(data.encode()).hexdigest()
    
    def _compute_entry_hash(self, entry_data: Dict[str, Any], previous_hash: Optional[str]) -> str:
        """Compute hash for a ledger entry"""
        data_str = json.dumps(entry_data, sort_keys=True, default=str)
        combined = f"{previous_hash or 'genesis'}:{data_str}"
        return self._hash_data(combined)
    
    def _anonymize_value(self, value: Any) -> Any:
        """Anonymize a value"""
        if isinstance(value, str):
            if '@' in value:  # Email
                parts = value.split('@')
                return f"{parts[0][:2]}***@{parts[1]}"
            elif len(value) > 4:
                return f"{value[:2]}***{value[-2:]}"
            return "***"
        elif isinstance(value, (int, float)):
            return 0
        return None
    
    def _init_demo_data(self):
        """Initialize demo vendors and proxy rules"""
        demo_org = "demo-org-001"
        
        # Demo vendors
        demo_vendors = [
            Vendor(
                id="vendor-google-ads",
                organization_id=demo_org,
                name="Google Ads",
                vendor_type=VendorType.AD_PLATFORM,
                vendor_code="google_ads",
                company_name="Google LLC",
                website_url="https://ads.google.com",
                privacy_policy_url="https://policies.google.com/privacy",
                api_endpoint="https://googleads.googleapis.com/v14",
                integration_type=IntegrationType.API,
                data_categories_received=["user_id", "email_hash", "device_id", "conversion_data"],
                purposes_served=["purpose-marketing", "purpose-analytics"],
                gdpr_compliant=True,
                ccpa_compliant=True,
                status="active",
                onboarded_at=datetime.utcnow()
            ),
            Vendor(
                id="vendor-facebook",
                organization_id=demo_org,
                name="Meta Ads (Facebook)",
                vendor_type=VendorType.AD_PLATFORM,
                vendor_code="meta_ads",
                company_name="Meta Platforms, Inc.",
                website_url="https://business.facebook.com",
                privacy_policy_url="https://www.facebook.com/privacy/policy",
                api_endpoint="https://graph.facebook.com/v18.0",
                integration_type=IntegrationType.PIXEL,
                data_categories_received=["email_hash", "phone_hash", "conversion_data", "custom_audience"],
                purposes_served=["purpose-marketing"],
                gdpr_compliant=True,
                ccpa_compliant=True,
                status="active",
                onboarded_at=datetime.utcnow()
            ),
            Vendor(
                id="vendor-mixpanel",
                organization_id=demo_org,
                name="Mixpanel",
                vendor_type=VendorType.ANALYTICS,
                vendor_code="mixpanel",
                company_name="Mixpanel, Inc.",
                website_url="https://mixpanel.com",
                privacy_policy_url="https://mixpanel.com/legal/privacy-policy",
                api_endpoint="https://api.mixpanel.com",
                integration_type=IntegrationType.SDK,
                data_categories_received=["user_id", "event_data", "device_info", "session_data"],
                purposes_served=["purpose-analytics"],
                gdpr_compliant=True,
                ccpa_compliant=True,
                status="active",
                onboarded_at=datetime.utcnow()
            ),
            Vendor(
                id="vendor-mailchimp",
                organization_id=demo_org,
                name="Mailchimp",
                vendor_type=VendorType.MARKETING,
                vendor_code="mailchimp",
                company_name="Intuit Mailchimp",
                website_url="https://mailchimp.com",
                privacy_policy_url="https://mailchimp.com/legal/privacy",
                api_endpoint="https://api.mailchimp.com/3.0",
                integration_type=IntegrationType.API,
                data_categories_received=["email", "name", "preferences", "engagement_data"],
                purposes_served=["purpose-email", "purpose-marketing"],
                gdpr_compliant=True,
                ccpa_compliant=True,
                status="active",
                onboarded_at=datetime.utcnow()
            ),
        ]
        
        for vendor in demo_vendors:
            self.vendors[vendor.id] = vendor
        
        # Demo proxy rules
        demo_rules = [
            ProxyRule(
                id="rule-require-consent",
                organization_id=demo_org,
                name="Require Marketing Consent",
                description="Block data to ad platforms without marketing consent",
                rule_order=1,
                match_vendors=["vendor-google-ads", "vendor-facebook"],
                match_purposes=["purpose-marketing"],
                action=ProxyAction.REQUIRE_CONSENT,
                required_purposes=["purpose-marketing"],
                enabled=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ),
            ProxyRule(
                id="rule-anonymize-eu",
                organization_id=demo_org,
                name="Anonymize EU User Data",
                description="Anonymize PII for EU users before sending to vendors",
                rule_order=2,
                match_geo_locations=["EU", "EEA"],
                action=ProxyAction.ANONYMIZE,
                anonymize_fields=["email", "phone", "ip_address", "name"],
                enabled=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ),
            ProxyRule(
                id="rule-filter-sensitive",
                organization_id=demo_org,
                name="Filter Sensitive Data",
                description="Remove sensitive fields before sending to analytics",
                rule_order=3,
                match_vendors=["vendor-mixpanel"],
                action=ProxyAction.FILTER,
                filter_fields=["ssn", "credit_card", "password", "secret"],
                enabled=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ),
            ProxyRule(
                id="rule-block-no-consent",
                organization_id=demo_org,
                name="Block Without Any Consent",
                description="Block all data if no consent is present",
                rule_order=100,
                action=ProxyAction.BLOCK,
                enabled=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ),
        ]
        
        for rule in demo_rules:
            self.proxy_rules[rule.id] = rule
    
    # ============== Authorization Token Methods ==============
    
    def issue_token(self, org_id: str, data: AuthorizationTokenCreate, 
                   consent_record_ids: List[str] = None,
                   ip_address: str = None) -> tuple[str, AuthorizationToken]:
        """
        Issue an authorization token based on consent.
        Returns (full_token, token_metadata) - full_token is only returned once!
        """
        full_token, token_hash, token_prefix = self._generate_token()
        
        token = AuthorizationToken(
            id=self._generate_id(),
            organization_id=org_id,
            subject_id=data.subject_id,
            token_prefix=token_prefix,
            token_type=TokenType.BEARER,
            granted_purposes=data.granted_purposes,
            granted_scopes=data.granted_scopes,
            consent_record_ids=consent_record_ids or [],
            issued_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(seconds=data.expires_in_seconds),
            max_uses=data.max_uses,
            issued_for_vendor_id=data.vendor_id,
            status=TokenStatus.ACTIVE
        )
        
        self.tokens[token.id] = token
        self.token_hashes[token_hash] = token.id
        
        # Record in evidence ledger
        self._record_evidence(
            org_id=org_id,
            event_type=EvidenceEventType.TOKEN_ISSUED,
            subject_id=data.subject_id,
            token_id=token.id,
            event_data={
                "granted_purposes": data.granted_purposes,
                "granted_scopes": data.granted_scopes,
                "expires_at": token.expires_at.isoformat(),
                "vendor_id": data.vendor_id,
                "ip_address": ip_address
            }
        )
        
        return full_token, token
    
    def validate_token(self, token_string: str) -> Optional[AuthorizationToken]:
        """Validate a token and return its metadata if valid"""
        token_hash = self._hash_data(token_string)
        token_id = self.token_hashes.get(token_hash)
        
        if not token_id:
            return None
        
        token = self.tokens.get(token_id)
        if not token:
            return None
        
        # Check status
        if token.status != TokenStatus.ACTIVE:
            return None
        
        # Check expiration
        if datetime.utcnow() > token.expires_at:
            token.status = TokenStatus.EXPIRED
            return None
        
        # Check max uses
        if token.max_uses and token.use_count >= token.max_uses:
            token.status = TokenStatus.EXHAUSTED
            return None
        
        # Update usage
        token.last_used_at = datetime.utcnow()
        token.use_count += 1
        
        # Record usage in evidence ledger
        self._record_evidence(
            org_id=token.organization_id,
            event_type=EvidenceEventType.TOKEN_USED,
            subject_id=token.subject_id,
            token_id=token.id,
            event_data={
                "use_count": token.use_count,
                "purposes_accessed": token.granted_purposes
            }
        )
        
        return token
    
    def revoke_token(self, token_id: str, reason: str = None) -> bool:
        """Revoke an authorization token"""
        token = self.tokens.get(token_id)
        if not token:
            return False
        
        token.status = TokenStatus.REVOKED
        
        # Record in evidence ledger
        self._record_evidence(
            org_id=token.organization_id,
            event_type=EvidenceEventType.TOKEN_REVOKED,
            subject_id=token.subject_id,
            token_id=token.id,
            event_data={"reason": reason}
        )
        
        return True
    
    def list_tokens(self, org_id: str, subject_id: str = None, 
                   status: TokenStatus = None) -> List[AuthorizationToken]:
        """List tokens with optional filters"""
        tokens = [t for t in self.tokens.values() if t.organization_id == org_id]
        
        if subject_id:
            tokens = [t for t in tokens if t.subject_id == subject_id]
        if status:
            tokens = [t for t in tokens if t.status == status]
        
        return tokens
    
    # ============== Vendor Methods ==============
    
    def create_vendor(self, org_id: str, data: VendorCreate) -> Vendor:
        """Register a new vendor"""
        vendor = Vendor(
            id=self._generate_id(),
            organization_id=org_id,
            onboarded_at=datetime.utcnow(),
            **data.model_dump()
        )
        self.vendors[vendor.id] = vendor
        return vendor
    
    def get_vendor(self, vendor_id: str) -> Optional[Vendor]:
        """Get vendor by ID"""
        return self.vendors.get(vendor_id)
    
    def list_vendors(self, org_id: str, vendor_type: VendorType = None) -> List[Vendor]:
        """List vendors for an organization"""
        vendors = [v for v in self.vendors.values() if v.organization_id == org_id]
        if vendor_type:
            vendors = [v for v in vendors if v.vendor_type == vendor_type]
        return vendors
    
    def update_vendor(self, vendor_id: str, data: Dict[str, Any]) -> Optional[Vendor]:
        """Update vendor settings"""
        vendor = self.vendors.get(vendor_id)
        if vendor:
            for key, value in data.items():
                if hasattr(vendor, key):
                    setattr(vendor, key, value)
        return vendor
    
    # ============== Proxy Rule Methods ==============
    
    def create_proxy_rule(self, org_id: str, data: ProxyRuleCreate) -> ProxyRule:
        """Create a new proxy rule"""
        rule = ProxyRule(
            id=self._generate_id(),
            organization_id=org_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            **data.model_dump()
        )
        self.proxy_rules[rule.id] = rule
        return rule
    
    def list_proxy_rules(self, org_id: str, enabled_only: bool = True) -> List[ProxyRule]:
        """List proxy rules ordered by priority"""
        rules = [r for r in self.proxy_rules.values() if r.organization_id == org_id]
        if enabled_only:
            rules = [r for r in rules if r.enabled]
        return sorted(rules, key=lambda r: r.rule_order)
    
    def update_proxy_rule(self, rule_id: str, data: Dict[str, Any]) -> Optional[ProxyRule]:
        """Update a proxy rule"""
        rule = self.proxy_rules.get(rule_id)
        if rule:
            for key, value in data.items():
                if hasattr(rule, key):
                    setattr(rule, key, value)
            rule.updated_at = datetime.utcnow()
        return rule
    
    def delete_proxy_rule(self, rule_id: str) -> bool:
        """Delete a proxy rule"""
        if rule_id in self.proxy_rules:
            del self.proxy_rules[rule_id]
            return True
        return False
    
    # ============== Ad Data Proxy (Enforcement) Methods ==============
    
    def _evaluate_rules(self, org_id: str, request: DataRequest, 
                       token: Optional[AuthorizationToken],
                       geo_location: str = None) -> tuple[ProxyRule, ProxyAction]:
        """Evaluate proxy rules and return matching rule and action"""
        rules = self.list_proxy_rules(org_id, enabled_only=True)
        
        for rule in rules:
            # Check vendor match
            if rule.match_vendors and request.vendor_id not in rule.match_vendors:
                continue
            
            # Check purpose match
            if rule.match_purposes:
                if not any(p in request.purposes for p in rule.match_purposes):
                    continue
            
            # Check geo match
            if rule.match_geo_locations and geo_location:
                if geo_location not in rule.match_geo_locations:
                    continue
            
            # Check consent requirements
            if rule.action == ProxyAction.REQUIRE_CONSENT:
                if not token:
                    return rule, ProxyAction.BLOCK
                
                # Check if token has required purposes
                for required in rule.required_purposes:
                    if required not in token.granted_purposes:
                        return rule, ProxyAction.BLOCK
            
            return rule, rule.action
        
        # Default: allow if no rules match
        return None, ProxyAction.ALLOW
    
    def _apply_transformation(self, data: Dict[str, Any], rule: ProxyRule, 
                             action: ProxyAction) -> tuple[Dict[str, Any], List[str], List[str]]:
        """Apply data transformation based on rule action"""
        transformed = data.copy()
        filtered_fields = []
        anonymized_fields = []
        
        if action == ProxyAction.FILTER:
            for field in rule.filter_fields:
                if field in transformed:
                    del transformed[field]
                    filtered_fields.append(field)
        
        elif action == ProxyAction.ANONYMIZE:
            for field in rule.anonymize_fields:
                if field in transformed:
                    transformed[field] = self._anonymize_value(transformed[field])
                    anonymized_fields.append(field)
        
        return transformed, filtered_fields, anonymized_fields
    
    def process_data_request(self, org_id: str, request: DataRequest,
                            ip_address: str = None, geo_location: str = None) -> DataResponse:
        """
        Process a data request through the proxy.
        This is the main enforcement point of the consent flow.
        """
        start_time = datetime.utcnow()
        
        # Start a flow session
        flow_session = ConsentFlowSession(
            id=self._generate_id(),
            organization_id=org_id,
            flow_id=f"flow_{secrets.token_hex(8)}",
            started_at=start_time,
            current_stage=FlowStage.PROXY,
            status="in_progress"
        )
        self.flow_sessions[flow_session.id] = flow_session
        
        # Validate token if provided
        token = None
        if request.consent_token:
            token = self.validate_token(request.consent_token)
            if token:
                flow_session.token_id = token.id
                flow_session.consent_subject_id = token.subject_id
        
        # Record data request in evidence
        request_evidence = self._record_evidence(
            org_id=org_id,
            event_type=EvidenceEventType.DATA_REQUESTED,
            subject_id=request.subject_identifier,
            vendor_id=request.vendor_id,
            event_data={
                "purposes": request.purposes,
                "data_categories": list(request.data.keys()),
                "token_provided": bool(token),
                "ip_address": ip_address
            }
        )
        
        # Evaluate rules
        rules_evaluated = [r.id for r in self.list_proxy_rules(org_id)]
        matched_rule, action = self._evaluate_rules(org_id, request, token, geo_location)
        
        # Determine transaction status and apply transformations
        transformed_data = None
        filtered_fields = []
        anonymized_fields = []
        blocked_reason = None
        
        if action == ProxyAction.BLOCK:
            status = TransactionStatus.BLOCKED
            blocked_reason = f"Blocked by rule: {matched_rule.name if matched_rule else 'No consent'}"
        elif action == ProxyAction.ALLOW:
            status = TransactionStatus.ALLOWED
            transformed_data = request.data
        elif action in [ProxyAction.FILTER, ProxyAction.ANONYMIZE]:
            status = TransactionStatus.FILTERED
            transformed_data, filtered_fields, anonymized_fields = self._apply_transformation(
                request.data, matched_rule, action
            )
        else:
            status = TransactionStatus.PENDING
        
        # Calculate response time
        end_time = datetime.utcnow()
        response_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Create transaction record
        transaction = ProxyTransaction(
            id=self._generate_id(),
            organization_id=org_id,
            transaction_id=f"tx_{secrets.token_hex(8)}",
            request_timestamp=start_time,
            subject_id=request.subject_identifier,
            token_id=token.id if token else None,
            vendor_id=request.vendor_id,
            data_categories=list(request.data.keys()),
            purposes=request.purposes,
            rules_evaluated=rules_evaluated,
            rule_matched=matched_rule.id if matched_rule else None,
            action_taken=action.value,
            fields_filtered=filtered_fields,
            fields_anonymized=anonymized_fields,
            status=status,
            response_time_ms=response_time_ms,
            evidence_ledger_id=request_evidence.id
        )
        self.transactions[transaction.id] = transaction
        
        # Record result in evidence ledger
        result_event = EvidenceEventType.DATA_ALLOWED if status == TransactionStatus.ALLOWED else \
                      EvidenceEventType.DATA_BLOCKED if status == TransactionStatus.BLOCKED else \
                      EvidenceEventType.DATA_FILTERED
        
        result_evidence = self._record_evidence(
            org_id=org_id,
            event_type=result_event,
            subject_id=request.subject_identifier,
            token_id=token.id if token else None,
            vendor_id=request.vendor_id,
            event_data={
                "transaction_id": transaction.transaction_id,
                "action": action.value,
                "rule_matched": matched_rule.id if matched_rule else None,
                "fields_filtered": filtered_fields,
                "fields_anonymized": anonymized_fields,
                "status": status.value
            }
        )
        
        # Update flow session
        flow_session.proxy_transaction_id = transaction.id
        flow_session.proxy_action = action.value
        flow_session.vendor_id = request.vendor_id
        flow_session.evidence_ids.append(request_evidence.id)
        flow_session.evidence_ids.append(result_evidence.id)
        
        if status == TransactionStatus.BLOCKED:
            flow_session.current_stage = FlowStage.FAILED
            flow_session.status = "failed"
            flow_session.error_stage = "proxy"
            flow_session.error_message = blocked_reason
        else:
            flow_session.current_stage = FlowStage.VENDOR
            
            # Simulate vendor response
            vendor_evidence = self._record_evidence(
                org_id=org_id,
                event_type=EvidenceEventType.VENDOR_DATA_SENT,
                subject_id=request.subject_identifier,
                vendor_id=request.vendor_id,
                event_data={
                    "transaction_id": transaction.transaction_id,
                    "data_sent": True,
                    "fields_count": len(transformed_data) if transformed_data else 0
                }
            )
            flow_session.evidence_ids.append(vendor_evidence.id)
            flow_session.vendor_response_status = "success"
            flow_session.current_stage = FlowStage.COMPLETED
            flow_session.status = "completed"
        
        flow_session.completed_at = datetime.utcnow()
        flow_session.ledger_entries_count = len(flow_session.evidence_ids)
        
        return DataResponse(
            transaction_id=transaction.transaction_id,
            status=status,
            action_taken=action.value,
            data_sent=transformed_data,
            blocked_reason=blocked_reason,
            evidence_id=result_evidence.id,
            flow_id=flow_session.flow_id
        )
    
    # ============== Evidence Ledger Methods ==============
    
    def _record_evidence(self, org_id: str, event_type: EvidenceEventType,
                        event_data: Dict[str, Any], subject_id: str = None,
                        token_id: str = None, vendor_id: str = None,
                        purpose_id: str = None) -> EvidenceLedgerEntry:
        """Record an entry in the immutable evidence ledger"""
        self._evidence_sequence += 1
        
        entry_data = {
            "sequence": self._evidence_sequence,
            "event_type": event_type.value,
            "timestamp": datetime.utcnow().isoformat(),
            "org_id": org_id,
            "subject_id": subject_id,
            "token_id": token_id,
            "vendor_id": vendor_id,
            "purpose_id": purpose_id,
            "data": event_data
        }
        
        entry_hash = self._compute_entry_hash(entry_data, self._last_evidence_hash)
        
        entry = EvidenceLedgerEntry(
            id=self._generate_id(),
            organization_id=org_id,
            sequence_number=self._evidence_sequence,
            event_type=event_type,
            event_timestamp=datetime.utcnow(),
            subject_id=subject_id,
            token_id=token_id,
            vendor_id=vendor_id,
            purpose_id=purpose_id,
            event_data=event_data,
            previous_hash=self._last_evidence_hash,
            entry_hash=entry_hash
        )
        
        self.evidence_ledger.append(entry)
        self._last_evidence_hash = entry_hash
        
        return entry
    
    def get_evidence_chain(self, org_id: str, start_sequence: int = None,
                          end_sequence: int = None, event_type: EvidenceEventType = None,
                          subject_id: str = None, limit: int = 100) -> List[EvidenceLedgerEntry]:
        """Get evidence entries with optional filters"""
        entries = [e for e in self.evidence_ledger if e.organization_id == org_id]
        
        if start_sequence:
            entries = [e for e in entries if e.sequence_number >= start_sequence]
        if end_sequence:
            entries = [e for e in entries if e.sequence_number <= end_sequence]
        if event_type:
            entries = [e for e in entries if e.event_type == event_type]
        if subject_id:
            entries = [e for e in entries if e.subject_id == subject_id]
        
        return entries[:limit]
    
    def verify_evidence_chain(self, org_id: str) -> Dict[str, Any]:
        """Verify the integrity of the evidence chain"""
        entries = [e for e in self.evidence_ledger if e.organization_id == org_id]
        entries.sort(key=lambda e: e.sequence_number)
        
        if not entries:
            return {"valid": True, "entries_checked": 0}
        
        previous_hash = None
        for entry in entries:
            # Verify chain link
            if entry.previous_hash != previous_hash:
                return {
                    "valid": False,
                    "error": f"Chain broken at sequence {entry.sequence_number}",
                    "expected_previous_hash": previous_hash,
                    "actual_previous_hash": entry.previous_hash
                }
            
            # Verify entry hash
            entry_data = {
                "sequence": entry.sequence_number,
                "event_type": entry.event_type.value,
                "timestamp": entry.event_timestamp.isoformat(),
                "org_id": entry.organization_id,
                "subject_id": entry.subject_id,
                "token_id": entry.token_id,
                "vendor_id": entry.vendor_id,
                "purpose_id": entry.purpose_id,
                "data": entry.event_data
            }
            computed_hash = self._compute_entry_hash(entry_data, previous_hash)
            
            if computed_hash != entry.entry_hash:
                return {
                    "valid": False,
                    "error": f"Hash mismatch at sequence {entry.sequence_number}",
                    "expected_hash": computed_hash,
                    "actual_hash": entry.entry_hash
                }
            
            previous_hash = entry.entry_hash
        
        return {
            "valid": True,
            "entries_checked": len(entries),
            "latest_sequence": entries[-1].sequence_number if entries else 0,
            "latest_hash": entries[-1].entry_hash if entries else None
        }
    
    # ============== Flow Session Methods ==============
    
    def get_flow_session(self, flow_id: str) -> Optional[ConsentFlowSession]:
        """Get a flow session by ID"""
        for session in self.flow_sessions.values():
            if session.flow_id == flow_id:
                return session
        return None
    
    def list_flow_sessions(self, org_id: str, status: str = None,
                          stage: FlowStage = None, limit: int = 100) -> List[ConsentFlowSession]:
        """List flow sessions with optional filters"""
        sessions = [s for s in self.flow_sessions.values() if s.organization_id == org_id]
        
        if status:
            sessions = [s for s in sessions if s.status == status]
        if stage:
            sessions = [s for s in sessions if s.current_stage == stage]
        
        sessions.sort(key=lambda s: s.started_at, reverse=True)
        return sessions[:limit]
    
    def get_flow_statistics(self, org_id: str, days: int = 30) -> Dict[str, Any]:
        """Get flow statistics for the organization"""
        cutoff = datetime.utcnow() - timedelta(days=days)
        sessions = [s for s in self.flow_sessions.values() 
                   if s.organization_id == org_id and s.started_at >= cutoff]
        
        total = len(sessions)
        completed = len([s for s in sessions if s.status == "completed"])
        failed = len([s for s in sessions if s.status == "failed"])
        
        # Count by stage failures
        stage_failures = {}
        for session in sessions:
            if session.status == "failed" and session.error_stage:
                stage_failures[session.error_stage] = stage_failures.get(session.error_stage, 0) + 1
        
        # Count by action taken
        actions = {}
        for session in sessions:
            if session.proxy_action:
                actions[session.proxy_action] = actions.get(session.proxy_action, 0) + 1
        
        transactions = [t for t in self.transactions.values() 
                       if t.organization_id == org_id and t.request_timestamp >= cutoff]
        
        return {
            "period_days": days,
            "total_flows": total,
            "completed_flows": completed,
            "failed_flows": failed,
            "success_rate": round((completed / total * 100) if total > 0 else 0, 2),
            "stage_failures": stage_failures,
            "actions_breakdown": actions,
            "total_transactions": len(transactions),
            "evidence_entries": len([e for e in self.evidence_ledger 
                                    if e.organization_id == org_id and e.event_timestamp >= cutoff])
        }


# Create singleton instance
consent_flow_service = ConsentFlowService()
