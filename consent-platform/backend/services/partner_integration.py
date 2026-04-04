"""
Partner & Vendor Integration Lock-In Service

Strategic features that create competitive moat and switching costs:
1. Certified integration program with compliance scoring
2. Real-time compliance monitoring that vendors MUST use
3. Data flow contracts with SLA enforcement
4. Cross-platform consent portability (only through us)
5. Compliance-as-a-dependency - vendors can't operate without certification

This makes the platform REQUIRED infrastructure, not an optional tool.
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field
from collections import defaultdict


# ============== Partner Program Tiers ==============

class PartnerTier(str, Enum):
    """Partner certification tiers with increasing privileges"""
    REGISTERED = "registered"       # Basic registration, limited API
    VERIFIED = "verified"           # Identity verified, standard API
    CERTIFIED = "certified"         # Full compliance audit passed
    PREMIER = "premier"             # Strategic partner, priority support
    PLATINUM = "platinum"           # Highest tier, co-development rights


class IntegrationType(str, Enum):
    """Types of integrations we support"""
    DATA_PROCESSOR = "data_processor"         # Receives data from us
    DATA_CONTROLLER = "data_controller"       # Sends data to us
    CONSENT_PROVIDER = "consent_provider"     # Provides consent collection
    ENFORCEMENT_POINT = "enforcement_point"   # Enforces consent decisions
    ANALYTICS = "analytics"                   # Analytics/reporting only
    BIDIRECTIONAL = "bidirectional"          # Full two-way integration


class ComplianceStatus(str, Enum):
    """Real-time compliance status"""
    COMPLIANT = "compliant"
    WARNING = "warning"              # Minor issues, grace period
    NON_COMPLIANT = "non_compliant"  # Major issues, restricted access
    SUSPENDED = "suspended"          # Blocked until remediation
    UNDER_REVIEW = "under_review"    # Audit in progress


class DataFlowDirection(str, Enum):
    """Direction of data flow"""
    INBOUND = "inbound"     # Partner → Platform
    OUTBOUND = "outbound"   # Platform → Partner
    BOTH = "both"


# ============== Data Models ==============

class PartnerProfile(BaseModel):
    """Certified partner profile"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Identity
    organization_name: str
    legal_entity_name: str
    registration_number: Optional[str] = None  # Company registration
    tax_id: Optional[str] = None
    
    # Contact
    primary_contact_email: str
    primary_contact_name: str
    technical_contact_email: Optional[str] = None
    compliance_contact_email: Optional[str] = None
    
    # Certification
    tier: PartnerTier = PartnerTier.REGISTERED
    integration_types: List[IntegrationType] = []
    certified_at: Optional[datetime] = None
    certification_expires_at: Optional[datetime] = None
    
    # Compliance
    compliance_status: ComplianceStatus = ComplianceStatus.UNDER_REVIEW
    compliance_score: float = 0.0  # 0-100
    last_audit_date: Optional[datetime] = None
    next_audit_date: Optional[datetime] = None
    
    # API Access
    api_key_hash: Optional[str] = None
    api_rate_limit: int = 1000  # requests per minute
    allowed_endpoints: List[str] = []
    
    # Data Flow
    data_categories_allowed: List[str] = []
    jurisdictions_allowed: List[str] = []
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Compliance history
    violations: List[Dict[str, Any]] = []
    audit_history: List[Dict[str, Any]] = []


class DataFlowContract(BaseModel):
    """
    Data flow contract between platform and partner.
    
    This is legally binding and defines:
    - What data can flow
    - In which direction
    - Under what conditions
    - With what SLAs
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Parties
    partner_id: str
    tenant_id: str
    
    # Contract details
    contract_name: str
    contract_version: str = "1.0"
    effective_date: datetime
    expiration_date: Optional[datetime] = None
    
    # Data flow specification
    flow_direction: DataFlowDirection
    data_categories: List[str]  # "behavioral", "demographic", etc.
    purposes: List[str]  # What data can be used for
    
    # Consent requirements
    consent_required: bool = True
    consent_purposes: List[str] = []
    consent_freshness_hours: int = 24  # Max age of consent
    
    # Technical requirements
    encryption_required: bool = True
    minimum_encryption: str = "TLS1.2"
    data_format: str = "JSON"
    webhook_url: Optional[str] = None
    
    # SLA
    sla_uptime_percent: float = 99.9
    sla_latency_ms: int = 100
    sla_error_rate_percent: float = 0.1
    
    # Penalties
    penalty_per_violation_usd: float = 0.0
    max_violations_before_suspension: int = 10
    
    # Status
    status: str = "active"  # active, suspended, terminated
    signed_at: Optional[datetime] = None
    signed_by_partner: Optional[str] = None
    signed_by_platform: Optional[str] = None
    
    # Compliance tracking
    violation_count: int = 0
    last_violation_at: Optional[datetime] = None


class IntegrationEndpoint(BaseModel):
    """Partner integration endpoint configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    
    # Endpoint details
    endpoint_type: str  # "consent_check", "event_forward", "audit_export"
    url: str
    method: str = "POST"
    
    # Authentication
    auth_type: str = "api_key"  # api_key, oauth2, mtls
    auth_config: Dict[str, Any] = {}
    
    # Performance
    timeout_ms: int = 5000
    retry_count: int = 3
    circuit_breaker_enabled: bool = True
    
    # Health
    is_healthy: bool = True
    last_health_check: Optional[datetime] = None
    health_check_failures: int = 0
    
    # Statistics
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    avg_latency_ms: float = 0.0


class ComplianceCheck(BaseModel):
    """Record of a compliance check"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner_id: str
    contract_id: Optional[str] = None
    
    # Check details
    check_type: str  # "consent_verification", "data_flow", "sla", "security"
    check_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Results
    passed: bool
    score: float = 0.0
    issues: List[str] = []
    
    # Evidence
    evidence_hash: Optional[str] = None
    
    # Actions taken
    auto_remediated: bool = False
    remediation_required: bool = False
    remediation_deadline: Optional[datetime] = None


# ============== Partner Integration Service ==============

class PartnerIntegrationService:
    """
    Service for managing certified partner integrations.
    
    Key differentiators that create lock-in:
    
    1. COMPLIANCE DEPENDENCY
       - Partners must maintain certification to access API
       - Real-time compliance scoring affects access
       - Automatic suspension for violations
    
    2. DATA FLOW CONTRACTS
       - Legally binding data flow agreements
       - SLA enforcement with penalties
       - Audit trail of all data movements
    
    3. CONSENT PORTABILITY
       - Only certified partners can receive consent data
       - Consent transfers require our platform
       - Cross-vendor consent coordination
    
    4. NETWORK EFFECTS
       - More partners = more value
       - Partners need each other through us
       - Consent flows require certification
    """
    
    def __init__(self):
        self._partners: Dict[str, PartnerProfile] = {}
        self._contracts: Dict[str, DataFlowContract] = {}
        self._endpoints: Dict[str, IntegrationEndpoint] = {}
        self._compliance_checks: List[ComplianceCheck] = []
        
        # Tier requirements
        self._tier_requirements = {
            PartnerTier.REGISTERED: {
                "min_score": 0,
                "audit_required": False,
                "rate_limit": 100,
            },
            PartnerTier.VERIFIED: {
                "min_score": 50,
                "audit_required": False,
                "rate_limit": 1000,
            },
            PartnerTier.CERTIFIED: {
                "min_score": 80,
                "audit_required": True,
                "rate_limit": 10000,
            },
            PartnerTier.PREMIER: {
                "min_score": 90,
                "audit_required": True,
                "rate_limit": 50000,
            },
            PartnerTier.PLATINUM: {
                "min_score": 95,
                "audit_required": True,
                "rate_limit": -1,  # Unlimited
            },
        }
        
        # Initialize demo partners
        self._init_demo_data()
    
    def _init_demo_data(self):
        """Create demo partners"""
        # Meta as a certified partner
        meta = PartnerProfile(
            organization_name="Meta Platforms",
            legal_entity_name="Meta Platforms, Inc.",
            primary_contact_email="privacy@meta.com",
            primary_contact_name="Privacy Team",
            tier=PartnerTier.CERTIFIED,
            integration_types=[IntegrationType.DATA_PROCESSOR],
            compliance_status=ComplianceStatus.COMPLIANT,
            compliance_score=92.5,
            data_categories_allowed=["behavioral", "demographic"],
            jurisdictions_allowed=["US", "EU", "UK"],
            certified_at=datetime.now(timezone.utc) - timedelta(days=180),
            certification_expires_at=datetime.now(timezone.utc) + timedelta(days=185),
        )
        self._partners[meta.id] = meta
        
        # Google as a premier partner
        google = PartnerProfile(
            organization_name="Google",
            legal_entity_name="Google LLC",
            primary_contact_email="privacy@google.com",
            primary_contact_name="Privacy Engineering",
            tier=PartnerTier.PREMIER,
            integration_types=[IntegrationType.BIDIRECTIONAL],
            compliance_status=ComplianceStatus.COMPLIANT,
            compliance_score=96.8,
            data_categories_allowed=["behavioral", "demographic", "contextual"],
            jurisdictions_allowed=["US", "EU", "UK", "CA", "AU"],
            certified_at=datetime.now(timezone.utc) - timedelta(days=365),
            certification_expires_at=datetime.now(timezone.utc) + timedelta(days=365),
        )
        self._partners[google.id] = google
    
    # ============== Partner Registration ==============
    
    def register_partner(
        self,
        organization_name: str,
        legal_entity_name: str,
        primary_contact_email: str,
        primary_contact_name: str,
        integration_types: List[IntegrationType],
        **kwargs
    ) -> Tuple[PartnerProfile, str]:
        """
        Register a new partner.
        Returns: (PartnerProfile, api_key)
        """
        # Generate API key
        api_key = f"partner_{secrets.token_urlsafe(32)}"
        api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        partner = PartnerProfile(
            organization_name=organization_name,
            legal_entity_name=legal_entity_name,
            primary_contact_email=primary_contact_email,
            primary_contact_name=primary_contact_name,
            integration_types=integration_types,
            api_key_hash=api_key_hash,
            tier=PartnerTier.REGISTERED,
            compliance_status=ComplianceStatus.UNDER_REVIEW,
            **kwargs
        )
        
        self._partners[partner.id] = partner
        
        return partner, api_key
    
    def upgrade_tier(
        self,
        partner_id: str,
        new_tier: PartnerTier,
        upgraded_by: str,
        audit_report_id: Optional[str] = None
    ) -> PartnerProfile:
        """Upgrade a partner's tier after verification/certification"""
        partner = self._partners.get(partner_id)
        if not partner:
            raise ValueError("Partner not found")
        
        requirements = self._tier_requirements.get(new_tier)
        if not requirements:
            raise ValueError("Invalid tier")
        
        # Check minimum score
        if partner.compliance_score < requirements["min_score"]:
            raise ValueError(
                f"Compliance score {partner.compliance_score} below minimum "
                f"{requirements['min_score']} for tier {new_tier.value}"
            )
        
        # Check audit requirement
        if requirements["audit_required"] and not audit_report_id:
            raise ValueError(f"Audit required for tier {new_tier.value}")
        
        partner.tier = new_tier
        partner.api_rate_limit = requirements["rate_limit"]
        partner.updated_at = datetime.now(timezone.utc)
        
        if new_tier in [PartnerTier.CERTIFIED, PartnerTier.PREMIER, PartnerTier.PLATINUM]:
            partner.certified_at = datetime.now(timezone.utc)
            partner.certification_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
        
        partner.audit_history.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "tier_upgrade",
            "from_tier": partner.tier.value,
            "to_tier": new_tier.value,
            "upgraded_by": upgraded_by,
            "audit_report_id": audit_report_id
        })
        
        return partner
    
    # ============== Data Flow Contracts ==============
    
    def create_data_flow_contract(
        self,
        partner_id: str,
        tenant_id: str,
        contract_name: str,
        flow_direction: DataFlowDirection,
        data_categories: List[str],
        purposes: List[str],
        effective_date: datetime,
        **kwargs
    ) -> DataFlowContract:
        """Create a legally binding data flow contract"""
        partner = self._partners.get(partner_id)
        if not partner:
            raise ValueError("Partner not found")
        
        # Verify partner is certified for data flows
        if partner.tier == PartnerTier.REGISTERED:
            raise ValueError("Partner must be at least VERIFIED tier for data flow contracts")
        
        # Check compliance status
        if partner.compliance_status in [ComplianceStatus.SUSPENDED, ComplianceStatus.NON_COMPLIANT]:
            raise ValueError("Partner compliance status does not allow new contracts")
        
        contract = DataFlowContract(
            partner_id=partner_id,
            tenant_id=tenant_id,
            contract_name=contract_name,
            flow_direction=flow_direction,
            data_categories=data_categories,
            purposes=purposes,
            effective_date=effective_date,
            **kwargs
        )
        
        self._contracts[contract.id] = contract
        
        return contract
    
    def sign_contract(
        self,
        contract_id: str,
        signed_by: str,
        is_partner: bool = True
    ) -> DataFlowContract:
        """Sign a data flow contract"""
        contract = self._contracts.get(contract_id)
        if not contract:
            raise ValueError("Contract not found")
        
        if is_partner:
            contract.signed_by_partner = signed_by
        else:
            contract.signed_by_platform = signed_by
        
        if contract.signed_by_partner and contract.signed_by_platform:
            contract.signed_at = datetime.now(timezone.utc)
            contract.status = "active"
        
        return contract
    
    def check_data_flow_allowed(
        self,
        partner_id: str,
        tenant_id: str,
        data_category: str,
        purpose: str,
        direction: DataFlowDirection
    ) -> Tuple[bool, Optional[str], Optional[DataFlowContract]]:
        """
        Check if a specific data flow is allowed.
        
        Returns: (allowed, reason, contract)
        
        This is THE critical function for lock-in:
        - Partners MUST call this before any data transfer
        - We control the data flow permissions
        - Without certification, data cannot flow
        """
        partner = self._partners.get(partner_id)
        if not partner:
            return False, "Partner not registered", None
        
        # Check partner compliance status
        if partner.compliance_status == ComplianceStatus.SUSPENDED:
            return False, "Partner suspended due to compliance violations", None
        
        if partner.compliance_status == ComplianceStatus.NON_COMPLIANT:
            return False, "Partner non-compliant - resolve issues before data flow", None
        
        # Check certification
        if partner.tier == PartnerTier.REGISTERED:
            return False, "Partner must be VERIFIED or higher for data flows", None
        
        # Check data category permissions
        if data_category not in partner.data_categories_allowed:
            return False, f"Partner not certified for data category: {data_category}", None
        
        # Find applicable contract
        applicable_contract = None
        for contract in self._contracts.values():
            if (contract.partner_id == partner_id and 
                contract.tenant_id == tenant_id and
                contract.status == "active" and
                data_category in contract.data_categories and
                purpose in contract.purposes and
                contract.flow_direction in [direction, DataFlowDirection.BOTH]):
                applicable_contract = contract
                break
        
        if not applicable_contract:
            return False, "No active data flow contract for this configuration", None
        
        # Record compliance check
        check = ComplianceCheck(
            partner_id=partner_id,
            contract_id=applicable_contract.id,
            check_type="data_flow",
            passed=True,
            score=100.0
        )
        self._compliance_checks.append(check)
        
        return True, None, applicable_contract
    
    # ============== Compliance Monitoring ==============
    
    def run_compliance_check(
        self,
        partner_id: str,
        check_type: str,
        evidence: Dict[str, Any]
    ) -> ComplianceCheck:
        """
        Run a compliance check on a partner.
        
        This is continuous monitoring that partners cannot avoid.
        """
        partner = self._partners.get(partner_id)
        if not partner:
            raise ValueError("Partner not found")
        
        # Score the compliance based on check type
        score, issues, passed = self._evaluate_compliance(check_type, evidence)
        
        check = ComplianceCheck(
            partner_id=partner_id,
            check_type=check_type,
            passed=passed,
            score=score,
            issues=issues,
            evidence_hash=hashlib.sha256(
                str(evidence).encode()
            ).hexdigest()
        )
        
        self._compliance_checks.append(check)
        
        # Update partner compliance score (weighted average)
        recent_checks = [
            c for c in self._compliance_checks
            if c.partner_id == partner_id and 
            c.check_timestamp > datetime.now(timezone.utc) - timedelta(days=30)
        ]
        
        if recent_checks:
            partner.compliance_score = sum(c.score for c in recent_checks) / len(recent_checks)
        
        # Auto-update compliance status
        self._update_compliance_status(partner)
        
        return check
    
    def _evaluate_compliance(
        self,
        check_type: str,
        evidence: Dict[str, Any]
    ) -> Tuple[float, List[str], bool]:
        """Evaluate compliance and return (score, issues, passed)"""
        issues = []
        score = 100.0
        
        if check_type == "consent_verification":
            # Check consent was properly verified
            if not evidence.get("consent_checked"):
                issues.append("Consent not verified before data processing")
                score -= 30
            if not evidence.get("consent_fresh"):
                issues.append("Consent data older than allowed freshness window")
                score -= 20
        
        elif check_type == "data_flow":
            # Check data flow compliance
            if evidence.get("unauthorized_data_category"):
                issues.append("Unauthorized data category in payload")
                score -= 40
            if evidence.get("missing_encryption"):
                issues.append("Data not encrypted in transit")
                score -= 50
        
        elif check_type == "sla":
            # Check SLA compliance
            latency = evidence.get("latency_ms", 0)
            error_rate = evidence.get("error_rate", 0)
            
            if latency > 200:
                issues.append(f"Latency {latency}ms exceeds SLA")
                score -= min(30, (latency - 200) / 10)
            
            if error_rate > 0.1:
                issues.append(f"Error rate {error_rate}% exceeds SLA")
                score -= min(30, error_rate * 100)
        
        elif check_type == "security":
            # Check security posture
            if not evidence.get("mtls_enabled"):
                issues.append("mTLS not enabled")
                score -= 15
            if evidence.get("vulnerabilities"):
                issues.append(f"{len(evidence['vulnerabilities'])} security vulnerabilities")
                score -= len(evidence['vulnerabilities']) * 10
        
        passed = score >= 70 and len([i for i in issues if "Unauthorized" in i or "not encrypted" in i]) == 0
        
        return max(0, score), issues, passed
    
    def _update_compliance_status(self, partner: PartnerProfile):
        """Update partner compliance status based on score and violations"""
        if partner.compliance_score >= 90:
            partner.compliance_status = ComplianceStatus.COMPLIANT
        elif partner.compliance_score >= 70:
            partner.compliance_status = ComplianceStatus.WARNING
        elif partner.compliance_score >= 50:
            partner.compliance_status = ComplianceStatus.NON_COMPLIANT
        else:
            partner.compliance_status = ComplianceStatus.SUSPENDED
        
        partner.updated_at = datetime.now(timezone.utc)
    
    def record_violation(
        self,
        partner_id: str,
        violation_type: str,
        description: str,
        severity: str,  # "low", "medium", "high", "critical"
        evidence: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Record a compliance violation"""
        partner = self._partners.get(partner_id)
        if not partner:
            raise ValueError("Partner not found")
        
        violation = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": violation_type,
            "description": description,
            "severity": severity,
            "evidence_hash": hashlib.sha256(str(evidence).encode()).hexdigest()
        }
        
        partner.violations.append(violation)
        
        # Deduct from compliance score
        severity_deductions = {
            "low": 5,
            "medium": 15,
            "high": 30,
            "critical": 50
        }
        partner.compliance_score = max(0, partner.compliance_score - severity_deductions.get(severity, 10))
        
        # Update status
        self._update_compliance_status(partner)
        
        # Update contracts
        for contract in self._contracts.values():
            if contract.partner_id == partner_id:
                contract.violation_count += 1
                contract.last_violation_at = datetime.now(timezone.utc)
                
                if contract.violation_count >= contract.max_violations_before_suspension:
                    contract.status = "suspended"
        
        return violation
    
    # ============== Integration Endpoints ==============
    
    def register_endpoint(
        self,
        partner_id: str,
        endpoint_type: str,
        url: str,
        auth_type: str = "api_key",
        auth_config: Dict[str, Any] = None,
        **kwargs
    ) -> IntegrationEndpoint:
        """Register an integration endpoint for a partner"""
        partner = self._partners.get(partner_id)
        if not partner:
            raise ValueError("Partner not found")
        
        endpoint = IntegrationEndpoint(
            partner_id=partner_id,
            endpoint_type=endpoint_type,
            url=url,
            auth_type=auth_type,
            auth_config=auth_config or {},
            **kwargs
        )
        
        self._endpoints[endpoint.id] = endpoint
        
        return endpoint
    
    async def call_endpoint(
        self,
        endpoint_id: str,
        payload: Dict[str, Any]
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Call a partner endpoint.
        
        Returns: (success, response, error)
        """
        endpoint = self._endpoints.get(endpoint_id)
        if not endpoint:
            return False, None, "Endpoint not found"
        
        if not endpoint.is_healthy:
            return False, None, "Endpoint marked unhealthy"
        
        # Check partner compliance
        partner = self._partners.get(endpoint.partner_id)
        if partner and partner.compliance_status == ComplianceStatus.SUSPENDED:
            return False, None, "Partner suspended"
        
        # In production, make actual HTTP call
        # For now, simulate success
        endpoint.total_calls += 1
        endpoint.successful_calls += 1
        endpoint.last_health_check = datetime.now(timezone.utc)
        
        return True, {"status": "received"}, None
    
    # ============== Consent Portability ==============
    
    def transfer_consent(
        self,
        from_partner_id: str,
        to_partner_id: str,
        tenant_id: str,
        consent_token_id: str,
        purposes: List[str],
        transferred_by: str
    ) -> Dict[str, Any]:
        """
        Transfer consent from one certified partner to another.
        
        This is THE lock-in feature:
        - Consent can only be transferred through our platform
        - Both partners must be certified
        - Creates audit trail of transfer
        - Enforces data minimization
        """
        from_partner = self._partners.get(from_partner_id)
        to_partner = self._partners.get(to_partner_id)
        
        if not from_partner or not to_partner:
            raise ValueError("Both partners must be registered")
        
        # Verify certification
        if from_partner.tier == PartnerTier.REGISTERED:
            raise ValueError("Source partner must be certified")
        if to_partner.tier == PartnerTier.REGISTERED:
            raise ValueError("Destination partner must be certified")
        
        # Verify compliance
        if from_partner.compliance_status in [ComplianceStatus.SUSPENDED, ComplianceStatus.NON_COMPLIANT]:
            raise ValueError("Source partner not compliant")
        if to_partner.compliance_status in [ComplianceStatus.SUSPENDED, ComplianceStatus.NON_COMPLIANT]:
            raise ValueError("Destination partner not compliant")
        
        # Check destination partner is allowed these purposes
        allowed_purposes = []
        for purpose in purposes:
            for contract in self._contracts.values():
                if (contract.partner_id == to_partner_id and
                    contract.tenant_id == tenant_id and
                    contract.status == "active" and
                    purpose in contract.purposes):
                    allowed_purposes.append(purpose)
                    break
        
        if not allowed_purposes:
            raise ValueError("Destination partner not authorized for any requested purposes")
        
        transfer_record = {
            "transfer_id": str(uuid.uuid4()),
            "from_partner_id": from_partner_id,
            "to_partner_id": to_partner_id,
            "tenant_id": tenant_id,
            "consent_token_id": consent_token_id,
            "purposes_requested": purposes,
            "purposes_transferred": allowed_purposes,
            "transferred_at": datetime.now(timezone.utc).isoformat(),
            "transferred_by": transferred_by,
            "audit_hash": hashlib.sha256(
                f"{consent_token_id}:{from_partner_id}:{to_partner_id}".encode()
            ).hexdigest()
        }
        
        return transfer_record
    
    # ============== Analytics & Reporting ==============
    
    def get_partner_dashboard(self, partner_id: str) -> Dict[str, Any]:
        """Get comprehensive partner dashboard data"""
        partner = self._partners.get(partner_id)
        if not partner:
            raise ValueError("Partner not found")
        
        # Get contracts
        contracts = [c for c in self._contracts.values() if c.partner_id == partner_id]
        active_contracts = [c for c in contracts if c.status == "active"]
        
        # Get compliance checks
        recent_checks = [
            c for c in self._compliance_checks
            if c.partner_id == partner_id and
            c.check_timestamp > datetime.now(timezone.utc) - timedelta(days=30)
        ]
        
        # Get endpoints
        endpoints = [e for e in self._endpoints.values() if e.partner_id == partner_id]
        
        return {
            "partner": {
                "id": partner.id,
                "name": partner.organization_name,
                "tier": partner.tier.value,
                "compliance_status": partner.compliance_status.value,
                "compliance_score": partner.compliance_score,
                "certified_at": partner.certified_at.isoformat() if partner.certified_at else None,
                "certification_expires_at": partner.certification_expires_at.isoformat() if partner.certification_expires_at else None,
            },
            "contracts": {
                "total": len(contracts),
                "active": len(active_contracts),
                "total_violations": sum(c.violation_count for c in contracts),
            },
            "compliance": {
                "recent_checks": len(recent_checks),
                "passed_checks": sum(1 for c in recent_checks if c.passed),
                "failed_checks": sum(1 for c in recent_checks if not c.passed),
                "average_score": sum(c.score for c in recent_checks) / len(recent_checks) if recent_checks else 0,
            },
            "endpoints": {
                "total": len(endpoints),
                "healthy": sum(1 for e in endpoints if e.is_healthy),
                "total_calls": sum(e.total_calls for e in endpoints),
                "success_rate": sum(e.successful_calls for e in endpoints) / max(1, sum(e.total_calls for e in endpoints)),
            },
            "violations": {
                "total": len(partner.violations),
                "recent": len([v for v in partner.violations if v.get("timestamp", "") > (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()]),
            }
        }
    
    def get_ecosystem_stats(self) -> Dict[str, Any]:
        """Get overall ecosystem statistics"""
        partners = list(self._partners.values())
        contracts = list(self._contracts.values())
        
        return {
            "partners": {
                "total": len(partners),
                "by_tier": {
                    tier.value: sum(1 for p in partners if p.tier == tier)
                    for tier in PartnerTier
                },
                "by_compliance": {
                    status.value: sum(1 for p in partners if p.compliance_status == status)
                    for status in ComplianceStatus
                },
                "average_score": sum(p.compliance_score for p in partners) / len(partners) if partners else 0,
            },
            "contracts": {
                "total": len(contracts),
                "active": sum(1 for c in contracts if c.status == "active"),
                "suspended": sum(1 for c in contracts if c.status == "suspended"),
            },
            "data_flows": {
                "total_checks": len(self._compliance_checks),
                "passed": sum(1 for c in self._compliance_checks if c.passed),
                "failed": sum(1 for c in self._compliance_checks if not c.passed),
            }
        }


# Global instance
partner_service = PartnerIntegrationService()
