"""
Consent Policy Engine
OPA-style policy definitions and evaluation for consent management.

This is the core compliance logic engine - it defines WHAT is allowed,
not the enforcement (which happens at the data proxy/edge).
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Callable
from pydantic import BaseModel, Field
from enum import Enum
import json
import re


# ============== Policy Language Enums ==============

class PolicyEffect(str, Enum):
    ALLOW = "allow"
    DENY = "deny"
    REQUIRE_CONSENT = "require_consent"


class PolicyConditionOperator(str, Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    IN = "in"
    NOT_IN = "not_in"
    CONTAINS = "contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    MATCHES = "matches"  # Regex
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    EXISTS = "exists"
    NOT_EXISTS = "not_exists"


class DataCategory(str, Enum):
    """Standard data categories for consent purposes"""
    PERSONAL_DATA = "personal_data"
    SENSITIVE_DATA = "sensitive_data"
    FINANCIAL_DATA = "financial_data"
    HEALTH_DATA = "health_data"
    BIOMETRIC_DATA = "biometric_data"
    LOCATION_DATA = "location_data"
    BEHAVIORAL_DATA = "behavioral_data"
    DEVICE_DATA = "device_data"
    USAGE_DATA = "usage_data"
    CONTACT_DATA = "contact_data"
    IDENTITY_DATA = "identity_data"
    MARKETING_DATA = "marketing_data"


class LegalBasis(str, Enum):
    """GDPR Legal Bases"""
    CONSENT = "consent"
    CONTRACT = "contract"
    LEGAL_OBLIGATION = "legal_obligation"
    VITAL_INTEREST = "vital_interest"
    PUBLIC_TASK = "public_task"
    LEGITIMATE_INTEREST = "legitimate_interest"


class Jurisdiction(str, Enum):
    """Privacy regulation jurisdictions"""
    GDPR = "gdpr"           # EU General Data Protection Regulation
    CCPA = "ccpa"           # California Consumer Privacy Act
    CPRA = "cpra"           # California Privacy Rights Act
    LGPD = "lgpd"           # Brazil Lei Geral de Proteção de Dados
    PIPEDA = "pipeda"       # Canada Personal Information Protection
    PDPA = "pdpa"           # Singapore Personal Data Protection Act
    POPIA = "popia"         # South Africa Protection of Personal Information Act
    GLOBAL = "global"       # Apply globally


# ============== Policy Models ==============

class PolicyCondition(BaseModel):
    """A single condition in a policy rule"""
    field: str                              # Field to evaluate (e.g., "subject.country", "data.category")
    operator: PolicyConditionOperator
    value: Any                              # Value to compare against
    
    def evaluate(self, context: Dict[str, Any]) -> bool:
        """Evaluate this condition against a context"""
        field_value = self._get_field_value(context, self.field)
        
        if self.operator == PolicyConditionOperator.EQUALS:
            return field_value == self.value
        elif self.operator == PolicyConditionOperator.NOT_EQUALS:
            return field_value != self.value
        elif self.operator == PolicyConditionOperator.IN:
            return field_value in self.value
        elif self.operator == PolicyConditionOperator.NOT_IN:
            return field_value not in self.value
        elif self.operator == PolicyConditionOperator.CONTAINS:
            return self.value in str(field_value) if field_value else False
        elif self.operator == PolicyConditionOperator.STARTS_WITH:
            return str(field_value).startswith(self.value) if field_value else False
        elif self.operator == PolicyConditionOperator.ENDS_WITH:
            return str(field_value).endswith(self.value) if field_value else False
        elif self.operator == PolicyConditionOperator.MATCHES:
            return bool(re.match(self.value, str(field_value))) if field_value else False
        elif self.operator == PolicyConditionOperator.GREATER_THAN:
            return field_value > self.value if field_value is not None else False
        elif self.operator == PolicyConditionOperator.LESS_THAN:
            return field_value < self.value if field_value is not None else False
        elif self.operator == PolicyConditionOperator.EXISTS:
            return field_value is not None
        elif self.operator == PolicyConditionOperator.NOT_EXISTS:
            return field_value is None
        
        return False
    
    def _get_field_value(self, context: Dict[str, Any], field_path: str) -> Any:
        """Get a value from nested context using dot notation"""
        parts = field_path.split('.')
        value = context
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return None
        return value


class PolicyRule(BaseModel):
    """A single rule within a policy"""
    id: str
    name: str
    description: Optional[str] = None
    priority: int = 100                     # Lower = higher priority
    effect: PolicyEffect
    conditions: List[PolicyCondition] = []  # All conditions must match (AND)
    
    # What this rule applies to
    purposes: List[str] = []                # Empty = all purposes
    data_categories: List[DataCategory] = [] # Empty = all categories
    vendors: List[str] = []                 # Empty = all vendors
    
    # Required consents for REQUIRE_CONSENT effect
    required_consents: List[str] = []
    required_legal_basis: List[LegalBasis] = []
    
    # Time-based restrictions
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    
    enabled: bool = True
    
    def matches(self, context: Dict[str, Any]) -> bool:
        """Check if this rule matches the given context"""
        if not self.enabled:
            return False
        
        # Check time validity
        now = datetime.utcnow()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        
        # Check purpose match
        if self.purposes:
            ctx_purpose = context.get('purpose')
            if ctx_purpose and ctx_purpose not in self.purposes:
                return False
        
        # Check data category match
        if self.data_categories:
            ctx_category = context.get('data_category')
            if ctx_category and ctx_category not in [c.value for c in self.data_categories]:
                return False
        
        # Check vendor match
        if self.vendors:
            ctx_vendor = context.get('vendor')
            if ctx_vendor and ctx_vendor not in self.vendors:
                return False
        
        # Evaluate all conditions (AND logic)
        for condition in self.conditions:
            if not condition.evaluate(context):
                return False
        
        return True


class ConsentPolicy(BaseModel):
    """A complete consent policy definition"""
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    version: str = "1.0"
    
    # Policy metadata
    jurisdiction: Jurisdiction = Jurisdiction.GLOBAL
    effective_date: datetime = Field(default_factory=datetime.utcnow)
    expiration_date: Optional[datetime] = None
    
    # Policy rules (evaluated in priority order)
    rules: List[PolicyRule] = []
    
    # Default behavior when no rules match
    default_effect: PolicyEffect = PolicyEffect.DENY
    
    # Audit settings
    log_all_decisions: bool = True
    require_justification: bool = False
    
    # Status
    status: str = "draft"  # draft, active, archived
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None


class PolicyDecision(BaseModel):
    """Result of policy evaluation"""
    allowed: bool
    effect: PolicyEffect
    matched_rule_id: Optional[str] = None
    matched_rule_name: Optional[str] = None
    policy_id: str
    policy_version: str
    
    # For REQUIRE_CONSENT effect
    required_consents: List[str] = []
    missing_consents: List[str] = []
    
    # Audit trail
    evaluation_time_ms: float
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
    context_hash: str = ""
    
    # Explanation
    reason: str = ""
    details: Dict[str, Any] = {}


class DataFlowMapping(BaseModel):
    """Maps consent purposes to allowed data flows"""
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    
    # Source consent
    consent_purpose: str
    required_legal_basis: List[LegalBasis] = [LegalBasis.CONSENT]
    
    # Allowed data flows
    allowed_data_categories: List[DataCategory] = []
    allowed_vendors: List[str] = []
    allowed_destinations: List[str] = []  # Endpoints, services, etc.
    
    # Data handling requirements
    require_anonymization: bool = False
    require_pseudonymization: bool = False
    require_encryption: bool = True
    max_retention_days: Optional[int] = None
    
    # Geographic restrictions
    allowed_countries: List[str] = []      # Empty = all
    blocked_countries: List[str] = []      # Takes precedence
    require_adequacy_decision: bool = False
    
    # Time restrictions
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============== Policy Engine Service ==============

class PolicyEngine:
    """
    OPA-style policy evaluation engine for consent management.
    Evaluates policies and data flow mappings to determine what is allowed.
    """
    
    def __init__(self):
        self.policies: Dict[str, ConsentPolicy] = {}
        self.data_flow_mappings: Dict[str, DataFlowMapping] = {}
        self.decision_log: List[PolicyDecision] = []
        
        # Initialize with demo policies
        self._init_demo_policies()
    
    def _init_demo_policies(self):
        """Create demo policies for testing"""
        
        # GDPR Policy
        gdpr_policy = ConsentPolicy(
            id="policy-gdpr-default",
            tenant_id="demo-tenant",
            name="GDPR Default Policy",
            description="Standard GDPR compliance policy for EU data subjects",
            version="1.0",
            jurisdiction=Jurisdiction.GDPR,
            rules=[
                # Rule 1: Allow essential data processing without consent
                PolicyRule(
                    id="rule-essential",
                    name="Allow Essential Processing",
                    description="Essential processing for service delivery",
                    priority=10,
                    effect=PolicyEffect.ALLOW,
                    purposes=["essential", "security", "fraud_prevention"],
                    conditions=[
                        PolicyCondition(
                            field="legal_basis",
                            operator=PolicyConditionOperator.IN,
                            value=["contract", "legal_obligation", "vital_interest"]
                        )
                    ]
                ),
                # Rule 2: Block sensitive data without explicit consent
                PolicyRule(
                    id="rule-sensitive-block",
                    name="Block Sensitive Data Without Consent",
                    description="Sensitive data requires explicit consent",
                    priority=20,
                    effect=PolicyEffect.DENY,
                    data_categories=[
                        DataCategory.HEALTH_DATA,
                        DataCategory.BIOMETRIC_DATA,
                        DataCategory.SENSITIVE_DATA
                    ],
                    conditions=[
                        PolicyCondition(
                            field="consent.explicit",
                            operator=PolicyConditionOperator.NOT_EQUALS,
                            value=True
                        )
                    ]
                ),
                # Rule 3: Require consent for marketing
                PolicyRule(
                    id="rule-marketing-consent",
                    name="Require Marketing Consent",
                    description="Marketing purposes require explicit opt-in",
                    priority=30,
                    effect=PolicyEffect.REQUIRE_CONSENT,
                    purposes=["marketing", "advertising", "profiling"],
                    required_consents=["marketing"],
                    required_legal_basis=[LegalBasis.CONSENT]
                ),
                # Rule 4: Require consent for analytics
                PolicyRule(
                    id="rule-analytics-consent",
                    name="Require Analytics Consent",
                    description="Analytics requires consent under GDPR",
                    priority=40,
                    effect=PolicyEffect.REQUIRE_CONSENT,
                    purposes=["analytics", "statistics"],
                    required_consents=["analytics"],
                    required_legal_basis=[LegalBasis.CONSENT, LegalBasis.LEGITIMATE_INTEREST]
                ),
                # Rule 5: Block transfers outside EEA without safeguards
                PolicyRule(
                    id="rule-transfer-block",
                    name="Block Unsafe International Transfers",
                    description="Block transfers without adequate safeguards",
                    priority=50,
                    effect=PolicyEffect.DENY,
                    conditions=[
                        PolicyCondition(
                            field="destination.country",
                            operator=PolicyConditionOperator.NOT_IN,
                            value=["EU", "EEA", "CH", "UK", "adequacy_countries"]
                        ),
                        PolicyCondition(
                            field="transfer.safeguards",
                            operator=PolicyConditionOperator.NOT_EXISTS,
                            value=None
                        )
                    ]
                )
            ],
            default_effect=PolicyEffect.REQUIRE_CONSENT,
            status="active"
        )
        self.policies[gdpr_policy.id] = gdpr_policy
        
        # CCPA Policy
        ccpa_policy = ConsentPolicy(
            id="policy-ccpa-default",
            tenant_id="demo-tenant",
            name="CCPA Default Policy",
            description="California Consumer Privacy Act compliance policy",
            version="1.0",
            jurisdiction=Jurisdiction.CCPA,
            rules=[
                # Rule 1: Honor Do Not Sell requests
                PolicyRule(
                    id="rule-do-not-sell",
                    name="Honor Do Not Sell",
                    description="Block data sale when opt-out is set",
                    priority=10,
                    effect=PolicyEffect.DENY,
                    purposes=["sale", "sharing_for_advertising"],
                    conditions=[
                        PolicyCondition(
                            field="subject.do_not_sell",
                            operator=PolicyConditionOperator.EQUALS,
                            value=True
                        )
                    ]
                ),
                # Rule 2: Allow data sale with consent
                PolicyRule(
                    id="rule-sale-consent",
                    name="Allow Sale With Consent",
                    description="Data sale allowed when not opted out",
                    priority=20,
                    effect=PolicyEffect.ALLOW,
                    purposes=["sale", "sharing_for_advertising"],
                    conditions=[
                        PolicyCondition(
                            field="subject.do_not_sell",
                            operator=PolicyConditionOperator.NOT_EQUALS,
                            value=True
                        )
                    ]
                ),
                # Rule 3: Minors require opt-in
                PolicyRule(
                    id="rule-minors",
                    name="Minors Require Opt-In",
                    description="Data sale for minors requires affirmative consent",
                    priority=5,
                    effect=PolicyEffect.REQUIRE_CONSENT,
                    conditions=[
                        PolicyCondition(
                            field="subject.age",
                            operator=PolicyConditionOperator.LESS_THAN,
                            value=16
                        )
                    ],
                    required_consents=["parental_consent"]
                )
            ],
            default_effect=PolicyEffect.ALLOW,  # CCPA is opt-out
            status="active"
        )
        self.policies[ccpa_policy.id] = ccpa_policy
        
        # Data Flow Mappings
        marketing_flow = DataFlowMapping(
            id="flow-marketing",
            tenant_id="demo-tenant",
            name="Marketing Data Flow",
            description="Allowed data flows for marketing purposes",
            consent_purpose="marketing",
            allowed_data_categories=[
                DataCategory.CONTACT_DATA,
                DataCategory.BEHAVIORAL_DATA,
                DataCategory.DEVICE_DATA,
                DataCategory.USAGE_DATA
            ],
            allowed_vendors=["google_ads", "meta_ads", "linkedin_ads"],
            require_encryption=True,
            max_retention_days=365,
            enabled=True
        )
        self.data_flow_mappings[marketing_flow.id] = marketing_flow
        
        analytics_flow = DataFlowMapping(
            id="flow-analytics",
            tenant_id="demo-tenant",
            name="Analytics Data Flow",
            description="Allowed data flows for analytics purposes",
            consent_purpose="analytics",
            allowed_data_categories=[
                DataCategory.USAGE_DATA,
                DataCategory.DEVICE_DATA,
                DataCategory.BEHAVIORAL_DATA
            ],
            allowed_vendors=["google_analytics", "mixpanel", "amplitude"],
            require_pseudonymization=True,
            require_encryption=True,
            max_retention_days=180,
            enabled=True
        )
        self.data_flow_mappings[analytics_flow.id] = analytics_flow
    
    # ============== Policy Management ==============
    
    def create_policy(self, policy: ConsentPolicy) -> ConsentPolicy:
        """Create a new policy"""
        policy.created_at = datetime.utcnow()
        policy.updated_at = datetime.utcnow()
        self.policies[policy.id] = policy
        return policy
    
    def get_policy(self, policy_id: str) -> Optional[ConsentPolicy]:
        """Get a policy by ID"""
        return self.policies.get(policy_id)
    
    def list_policies(self, tenant_id: str, jurisdiction: Jurisdiction = None, 
                     status: str = None) -> List[ConsentPolicy]:
        """List policies for a tenant"""
        policies = [p for p in self.policies.values() if p.tenant_id == tenant_id]
        
        if jurisdiction:
            policies = [p for p in policies if p.jurisdiction == jurisdiction]
        if status:
            policies = [p for p in policies if p.status == status]
        
        return policies
    
    def update_policy(self, policy_id: str, updates: Dict[str, Any]) -> Optional[ConsentPolicy]:
        """Update a policy"""
        policy = self.policies.get(policy_id)
        if policy:
            for key, value in updates.items():
                if hasattr(policy, key):
                    setattr(policy, key, value)
            policy.updated_at = datetime.utcnow()
            # Increment version
            major, minor = policy.version.split('.')
            policy.version = f"{major}.{int(minor) + 1}"
        return policy
    
    def activate_policy(self, policy_id: str) -> bool:
        """Activate a policy"""
        policy = self.policies.get(policy_id)
        if policy:
            policy.status = "active"
            policy.updated_at = datetime.utcnow()
            return True
        return False
    
    def archive_policy(self, policy_id: str) -> bool:
        """Archive a policy"""
        policy = self.policies.get(policy_id)
        if policy:
            policy.status = "archived"
            policy.updated_at = datetime.utcnow()
            return True
        return False
    
    # ============== Policy Evaluation ==============
    
    def evaluate(self, policy_id: str, context: Dict[str, Any], 
                consents: List[str] = None) -> PolicyDecision:
        """
        Evaluate a policy against a context.
        
        Args:
            policy_id: ID of the policy to evaluate
            context: Evaluation context containing:
                - purpose: The purpose of data processing
                - data_category: Category of data being processed
                - vendor: Target vendor
                - subject: Data subject info (country, age, etc.)
                - legal_basis: Legal basis claimed
                - consent: Consent information
                - destination: Data destination info
            consents: List of consents the subject has given
        
        Returns:
            PolicyDecision with the evaluation result
        """
        import time
        import hashlib
        
        start_time = time.time()
        consents = consents or []
        
        policy = self.policies.get(policy_id)
        if not policy:
            return PolicyDecision(
                allowed=False,
                effect=PolicyEffect.DENY,
                policy_id=policy_id,
                policy_version="unknown",
                evaluation_time_ms=0,
                reason="Policy not found"
            )
        
        # Check policy status
        if policy.status != "active":
            return PolicyDecision(
                allowed=False,
                effect=PolicyEffect.DENY,
                policy_id=policy_id,
                policy_version=policy.version,
                evaluation_time_ms=0,
                reason=f"Policy is not active (status: {policy.status})"
            )
        
        # Sort rules by priority
        sorted_rules = sorted(policy.rules, key=lambda r: r.priority)
        
        # Evaluate rules
        matched_rule = None
        for rule in sorted_rules:
            if rule.matches(context):
                matched_rule = rule
                break
        
        # Determine effect
        if matched_rule:
            effect = matched_rule.effect
            required_consents = matched_rule.required_consents
        else:
            effect = policy.default_effect
            required_consents = []
        
        # Check consent requirements
        missing_consents = []
        if effect == PolicyEffect.REQUIRE_CONSENT:
            missing_consents = [c for c in required_consents if c not in consents]
            if not missing_consents:
                effect = PolicyEffect.ALLOW
        
        # Calculate result
        allowed = effect == PolicyEffect.ALLOW
        
        # Calculate context hash for audit
        context_hash = hashlib.sha256(
            json.dumps(context, sort_keys=True, default=str).encode()
        ).hexdigest()[:16]
        
        evaluation_time = (time.time() - start_time) * 1000
        
        # Build reason
        if matched_rule:
            reason = f"Matched rule: {matched_rule.name}"
        else:
            reason = f"No matching rules, applied default: {policy.default_effect.value}"
        
        if missing_consents:
            reason += f". Missing consents: {', '.join(missing_consents)}"
        
        decision = PolicyDecision(
            allowed=allowed,
            effect=effect,
            matched_rule_id=matched_rule.id if matched_rule else None,
            matched_rule_name=matched_rule.name if matched_rule else None,
            policy_id=policy_id,
            policy_version=policy.version,
            required_consents=required_consents,
            missing_consents=missing_consents,
            evaluation_time_ms=evaluation_time,
            context_hash=context_hash,
            reason=reason,
            details={
                "rules_evaluated": len(sorted_rules),
                "jurisdiction": policy.jurisdiction.value
            }
        )
        
        # Log decision if required
        if policy.log_all_decisions:
            self.decision_log.append(decision)
        
        return decision
    
    def evaluate_for_jurisdiction(self, tenant_id: str, jurisdiction: Jurisdiction,
                                  context: Dict[str, Any], consents: List[str] = None) -> PolicyDecision:
        """Evaluate all active policies for a jurisdiction"""
        policies = self.list_policies(tenant_id, jurisdiction=jurisdiction, status="active")
        
        if not policies:
            return PolicyDecision(
                allowed=False,
                effect=PolicyEffect.DENY,
                policy_id="none",
                policy_version="0",
                evaluation_time_ms=0,
                reason=f"No active policies found for jurisdiction: {jurisdiction.value}"
            )
        
        # Evaluate the first (should typically be one per jurisdiction)
        return self.evaluate(policies[0].id, context, consents)
    
    # ============== Data Flow Mapping ==============
    
    def create_data_flow_mapping(self, mapping: DataFlowMapping) -> DataFlowMapping:
        """Create a new data flow mapping"""
        mapping.created_at = datetime.utcnow()
        mapping.updated_at = datetime.utcnow()
        self.data_flow_mappings[mapping.id] = mapping
        return mapping
    
    def get_data_flow_mapping(self, mapping_id: str) -> Optional[DataFlowMapping]:
        """Get a data flow mapping by ID"""
        return self.data_flow_mappings.get(mapping_id)
    
    def list_data_flow_mappings(self, tenant_id: str, purpose: str = None) -> List[DataFlowMapping]:
        """List data flow mappings"""
        mappings = [m for m in self.data_flow_mappings.values() if m.tenant_id == tenant_id]
        
        if purpose:
            mappings = [m for m in mappings if m.consent_purpose == purpose]
        
        return mappings
    
    def get_allowed_flows_for_consent(self, tenant_id: str, consent_purpose: str) -> Dict[str, Any]:
        """
        Get all allowed data flows for a given consent purpose.
        This is the consent → data flow mapping.
        """
        mappings = self.list_data_flow_mappings(tenant_id, consent_purpose)
        
        if not mappings:
            return {
                "consent_purpose": consent_purpose,
                "flows_allowed": False,
                "reason": "No data flow mapping found for this consent purpose"
            }
        
        # Aggregate allowed flows
        allowed_categories = set()
        allowed_vendors = set()
        allowed_destinations = set()
        requirements = {
            "anonymization": False,
            "pseudonymization": False,
            "encryption": False,
            "max_retention_days": None
        }
        
        for mapping in mappings:
            if not mapping.enabled:
                continue
            
            allowed_categories.update([c.value for c in mapping.allowed_data_categories])
            allowed_vendors.update(mapping.allowed_vendors)
            allowed_destinations.update(mapping.allowed_destinations)
            
            if mapping.require_anonymization:
                requirements["anonymization"] = True
            if mapping.require_pseudonymization:
                requirements["pseudonymization"] = True
            if mapping.require_encryption:
                requirements["encryption"] = True
            if mapping.max_retention_days:
                if requirements["max_retention_days"] is None:
                    requirements["max_retention_days"] = mapping.max_retention_days
                else:
                    requirements["max_retention_days"] = min(
                        requirements["max_retention_days"], 
                        mapping.max_retention_days
                    )
        
        return {
            "consent_purpose": consent_purpose,
            "flows_allowed": True,
            "allowed_data_categories": list(allowed_categories),
            "allowed_vendors": list(allowed_vendors),
            "allowed_destinations": list(allowed_destinations),
            "requirements": requirements,
            "mappings_count": len(mappings)
        }
    
    def is_flow_allowed(self, tenant_id: str, consent_purpose: str, 
                       data_category: str, vendor: str) -> Dict[str, Any]:
        """
        Check if a specific data flow is allowed under the given consent.
        """
        flows = self.get_allowed_flows_for_consent(tenant_id, consent_purpose)
        
        if not flows["flows_allowed"]:
            return {
                "allowed": False,
                "reason": flows["reason"]
            }
        
        category_allowed = data_category in flows["allowed_data_categories"] or not flows["allowed_data_categories"]
        vendor_allowed = vendor in flows["allowed_vendors"] or not flows["allowed_vendors"]
        
        if not category_allowed:
            return {
                "allowed": False,
                "reason": f"Data category '{data_category}' not allowed for consent purpose '{consent_purpose}'"
            }
        
        if not vendor_allowed:
            return {
                "allowed": False,
                "reason": f"Vendor '{vendor}' not allowed for consent purpose '{consent_purpose}'"
            }
        
        return {
            "allowed": True,
            "requirements": flows["requirements"],
            "reason": "Flow allowed"
        }
    
    # ============== Decision Log ==============
    
    def get_decision_log(self, tenant_id: str = None, limit: int = 100) -> List[PolicyDecision]:
        """Get recent policy decisions"""
        decisions = self.decision_log
        # In production, filter by tenant from context
        return decisions[-limit:]


# Create singleton instance
policy_engine = PolicyEngine()
