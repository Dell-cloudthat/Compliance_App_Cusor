"""
Vendor Certification & Trust System

Technical reputation for ad platforms and data vendors.

Approval Requirements:
1. Integrates with consent gateway
2. Accepts only policy-approved events
3. Submits to continuous compliance logging
4. Passes automated & periodic checks

Trust Tiers:
- CERTIFIED: Fully compliant, verified integration, clean history
- APPROVED: Meets requirements, minor issues allowed
- PROBATION: Recent violations, under monitoring
- SUSPENDED: Serious violations, no events forwarded
- REVOKED: Repeated violations, removed from platform

Key Principle: Reputation becomes technical, not PR-based.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from pydantic import BaseModel, Field
from enum import Enum
import hashlib
import json
import uuid


# ============== Enums ==============

class TrustTier(str, Enum):
    """Vendor trust tiers"""
    CERTIFIED = "certified"      # Highest trust, all checks passed
    APPROVED = "approved"        # Standard approval, meets requirements
    PROBATION = "probation"      # Under monitoring due to issues
    SUSPENDED = "suspended"      # Temporarily blocked
    REVOKED = "revoked"          # Permanently removed
    PENDING = "pending"          # Awaiting initial approval


class ViolationType(str, Enum):
    """Types of policy violations"""
    # Integration violations
    MISSING_CONSENT_CHECK = "missing_consent_check"
    BYPASSED_PROXY = "bypassed_proxy"
    INVALID_TOKEN_USAGE = "invalid_token_usage"
    
    # Data handling violations
    UNAUTHORIZED_DATA_ACCESS = "unauthorized_data_access"
    DATA_CLASS_VIOLATION = "data_class_violation"
    CROSS_SITE_VIOLATION = "cross_site_violation"
    PURPOSE_VIOLATION = "purpose_violation"
    
    # Logging violations
    MISSING_AUDIT_TRAIL = "missing_audit_trail"
    TAMPERED_LOGS = "tampered_logs"
    LATE_REPORTING = "late_reporting"
    
    # Compliance violations
    FAILED_AUDIT = "failed_audit"
    EXPIRED_CERTIFICATION = "expired_certification"
    POLICY_BREACH = "policy_breach"


class ViolationSeverity(str, Enum):
    """Severity of violations"""
    CRITICAL = "critical"    # Immediate suspension
    HIGH = "high"            # Downgrade + review
    MEDIUM = "medium"        # Warning + monitoring
    LOW = "low"              # Logged only


class CheckType(str, Enum):
    """Types of compliance checks"""
    INTEGRATION = "integration"
    DATA_FLOW = "data_flow"
    CONSENT_VALIDATION = "consent_validation"
    AUDIT_TRAIL = "audit_trail"
    RESPONSE_TIME = "response_time"
    DATA_RETENTION = "data_retention"
    SECURITY = "security"


# ============== Models ==============

class CertificationRequirement(BaseModel):
    """A requirement for certification"""
    id: str
    name: str
    description: str
    check_type: CheckType
    required_for_tier: TrustTier
    automated: bool = True
    frequency_hours: int = 24


class ComplianceCheck(BaseModel):
    """Result of a compliance check"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    check_type: CheckType
    passed: bool
    score: float = Field(ge=0, le=100)
    details: Dict[str, Any] = {}
    checked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    next_check_at: Optional[datetime] = None


class Violation(BaseModel):
    """A policy violation"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    violation_type: ViolationType
    severity: ViolationSeverity
    description: str
    evidence: Dict[str, Any] = {}
    detected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    
    # Impact
    events_affected: int = 0
    users_affected: int = 0
    
    # Action taken
    action_taken: Optional[str] = None
    tier_before: Optional[TrustTier] = None
    tier_after: Optional[TrustTier] = None


class VendorCertification(BaseModel):
    """Vendor certification status"""
    vendor_id: str
    vendor_name: str
    
    # Trust status
    trust_tier: TrustTier = TrustTier.PENDING
    trust_score: float = Field(default=0, ge=0, le=100)
    
    # Certification
    certified_at: Optional[datetime] = None
    certification_expires: Optional[datetime] = None
    last_audit: Optional[datetime] = None
    next_audit: Optional[datetime] = None
    
    # Compliance metrics
    total_events_processed: int = 0
    compliant_events: int = 0
    blocked_events: int = 0
    compliance_rate: float = 100.0
    
    # Violations
    total_violations: int = 0
    open_violations: int = 0
    critical_violations: int = 0
    
    # Integration status
    integration_verified: bool = False
    gateway_connected: bool = False
    logging_enabled: bool = False
    
    # History
    tier_history: List[Dict[str, Any]] = []
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrustRegistryEntry(BaseModel):
    """Public trust registry entry (customer-visible)"""
    vendor_id: str
    vendor_name: str
    trust_tier: TrustTier
    trust_score: float
    
    # Public metrics
    compliance_rate: float
    certified_since: Optional[datetime]
    last_verified: datetime
    
    # Flags
    has_open_violations: bool
    on_probation: bool
    
    # Badges
    badges: List[str] = []  # e.g., ["gdpr_certified", "ccpa_compliant", "iso27001"]


# ============== Severity Rules ==============

VIOLATION_SEVERITY_MAP: Dict[ViolationType, ViolationSeverity] = {
    ViolationType.BYPASSED_PROXY: ViolationSeverity.CRITICAL,
    ViolationType.TAMPERED_LOGS: ViolationSeverity.CRITICAL,
    ViolationType.UNAUTHORIZED_DATA_ACCESS: ViolationSeverity.CRITICAL,
    
    ViolationType.MISSING_CONSENT_CHECK: ViolationSeverity.HIGH,
    ViolationType.DATA_CLASS_VIOLATION: ViolationSeverity.HIGH,
    ViolationType.PURPOSE_VIOLATION: ViolationSeverity.HIGH,
    ViolationType.POLICY_BREACH: ViolationSeverity.HIGH,
    
    ViolationType.CROSS_SITE_VIOLATION: ViolationSeverity.MEDIUM,
    ViolationType.INVALID_TOKEN_USAGE: ViolationSeverity.MEDIUM,
    ViolationType.FAILED_AUDIT: ViolationSeverity.MEDIUM,
    
    ViolationType.MISSING_AUDIT_TRAIL: ViolationSeverity.LOW,
    ViolationType.LATE_REPORTING: ViolationSeverity.LOW,
    ViolationType.EXPIRED_CERTIFICATION: ViolationSeverity.LOW,
}

# Points deducted per violation severity
SEVERITY_POINTS: Dict[ViolationSeverity, int] = {
    ViolationSeverity.CRITICAL: 50,
    ViolationSeverity.HIGH: 25,
    ViolationSeverity.MEDIUM: 10,
    ViolationSeverity.LOW: 5,
}

# Minimum score for each tier
TIER_THRESHOLDS: Dict[TrustTier, int] = {
    TrustTier.CERTIFIED: 90,
    TrustTier.APPROVED: 70,
    TrustTier.PROBATION: 50,
    TrustTier.SUSPENDED: 0,
}


# ============== Vendor Certification Service ==============

class VendorCertificationService:
    """
    Manages vendor certification, trust scoring, and violation handling.
    
    Key principles:
    - Reputation is technical, not PR-based
    - Violations are detected automatically
    - Downgrades happen programmatically
    - Status is publicly visible
    """
    
    def __init__(self):
        # Storage (in production, use database)
        self._certifications: Dict[str, VendorCertification] = {}
        self._violations: Dict[str, List[Violation]] = {}
        self._checks: Dict[str, List[ComplianceCheck]] = {}
        
        # Requirements
        self._requirements = self._init_requirements()
        
        # Initialize demo data
        self._init_demo_data()
    
    def _init_requirements(self) -> List[CertificationRequirement]:
        """Define certification requirements"""
        return [
            CertificationRequirement(
                id="req_integration",
                name="Gateway Integration",
                description="Must route all ad events through consent gateway",
                check_type=CheckType.INTEGRATION,
                required_for_tier=TrustTier.APPROVED,
                frequency_hours=1
            ),
            CertificationRequirement(
                id="req_consent_validation",
                name="Consent Validation",
                description="Must validate consent tokens for every event",
                check_type=CheckType.CONSENT_VALIDATION,
                required_for_tier=TrustTier.APPROVED,
                frequency_hours=1
            ),
            CertificationRequirement(
                id="req_audit_trail",
                name="Audit Trail",
                description="Must submit complete audit logs",
                check_type=CheckType.AUDIT_TRAIL,
                required_for_tier=TrustTier.APPROVED,
                frequency_hours=24
            ),
            CertificationRequirement(
                id="req_data_flow",
                name="Data Flow Compliance",
                description="Must only process authorized data classes",
                check_type=CheckType.DATA_FLOW,
                required_for_tier=TrustTier.CERTIFIED,
                frequency_hours=6
            ),
            CertificationRequirement(
                id="req_response_time",
                name="Response Time SLA",
                description="Must respond within 100ms for 99% of requests",
                check_type=CheckType.RESPONSE_TIME,
                required_for_tier=TrustTier.CERTIFIED,
                frequency_hours=1
            ),
            CertificationRequirement(
                id="req_security",
                name="Security Standards",
                description="Must pass security assessment",
                check_type=CheckType.SECURITY,
                required_for_tier=TrustTier.CERTIFIED,
                frequency_hours=168,  # Weekly
                automated=False
            ),
        ]
    
    def _init_demo_data(self):
        """Initialize demo vendor certifications"""
        # Meta - Certified
        meta_cert = VendorCertification(
            vendor_id="meta",
            vendor_name="Meta (Facebook)",
            trust_tier=TrustTier.CERTIFIED,
            trust_score=95,
            certified_at=datetime.now(timezone.utc) - timedelta(days=180),
            certification_expires=datetime.now(timezone.utc) + timedelta(days=185),
            last_audit=datetime.now(timezone.utc) - timedelta(days=30),
            next_audit=datetime.now(timezone.utc) + timedelta(days=60),
            total_events_processed=1250000,
            compliant_events=1243750,
            blocked_events=6250,
            compliance_rate=99.5,
            total_violations=2,
            open_violations=0,
            integration_verified=True,
            gateway_connected=True,
            logging_enabled=True,
            tier_history=[
                {"tier": "approved", "date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(), "reason": "Initial approval"},
                {"tier": "certified", "date": (datetime.now(timezone.utc) - timedelta(days=180)).isoformat(), "reason": "Passed full audit"}
            ]
        )
        self._certifications["meta"] = meta_cert
        
        # Google - Approved
        google_cert = VendorCertification(
            vendor_id="google",
            vendor_name="Google Ads",
            trust_tier=TrustTier.APPROVED,
            trust_score=82,
            certified_at=datetime.now(timezone.utc) - timedelta(days=90),
            certification_expires=datetime.now(timezone.utc) + timedelta(days=275),
            last_audit=datetime.now(timezone.utc) - timedelta(days=15),
            next_audit=datetime.now(timezone.utc) + timedelta(days=75),
            total_events_processed=890000,
            compliant_events=872200,
            blocked_events=17800,
            compliance_rate=98.0,
            total_violations=5,
            open_violations=1,
            integration_verified=True,
            gateway_connected=True,
            logging_enabled=True,
            tier_history=[
                {"tier": "approved", "date": (datetime.now(timezone.utc) - timedelta(days=90)).isoformat(), "reason": "Initial approval"}
            ]
        )
        self._certifications["google"] = google_cert
        
        # TikTok - Probation
        tiktok_cert = VendorCertification(
            vendor_id="tiktok",
            vendor_name="TikTok Ads",
            trust_tier=TrustTier.PROBATION,
            trust_score=58,
            certified_at=datetime.now(timezone.utc) - timedelta(days=60),
            last_audit=datetime.now(timezone.utc) - timedelta(days=7),
            next_audit=datetime.now(timezone.utc) + timedelta(days=7),
            total_events_processed=340000,
            compliant_events=312800,
            blocked_events=27200,
            compliance_rate=92.0,
            total_violations=8,
            open_violations=3,
            critical_violations=1,
            integration_verified=True,
            gateway_connected=True,
            logging_enabled=True,
            tier_history=[
                {"tier": "approved", "date": (datetime.now(timezone.utc) - timedelta(days=60)).isoformat(), "reason": "Initial approval"},
                {"tier": "probation", "date": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(), "reason": "Data class violation detected"}
            ]
        )
        self._certifications["tiktok"] = tiktok_cert
        self._violations["tiktok"] = [
            Violation(
                vendor_id="tiktok",
                violation_type=ViolationType.DATA_CLASS_VIOLATION,
                severity=ViolationSeverity.HIGH,
                description="Received location data without explicit consent",
                events_affected=1200,
                users_affected=450,
                detected_at=datetime.now(timezone.utc) - timedelta(days=14),
                tier_before=TrustTier.APPROVED,
                tier_after=TrustTier.PROBATION,
                action_taken="Downgraded to probation, increased monitoring"
            )
        ]
    
    # ==================== Certification Management ====================
    
    def get_certification(self, vendor_id: str) -> Optional[VendorCertification]:
        """Get vendor certification status"""
        return self._certifications.get(vendor_id)
    
    def list_certifications(self, tier: TrustTier = None) -> List[VendorCertification]:
        """List all vendor certifications"""
        certs = list(self._certifications.values())
        if tier:
            certs = [c for c in certs if c.trust_tier == tier]
        return sorted(certs, key=lambda c: c.trust_score, reverse=True)
    
    def register_vendor(self, vendor_id: str, vendor_name: str) -> VendorCertification:
        """Register a new vendor for certification"""
        cert = VendorCertification(
            vendor_id=vendor_id,
            vendor_name=vendor_name,
            trust_tier=TrustTier.PENDING,
            trust_score=0,
            tier_history=[{
                "tier": TrustTier.PENDING.value,
                "date": datetime.now(timezone.utc).isoformat(),
                "reason": "Initial registration"
            }]
        )
        self._certifications[vendor_id] = cert
        return cert
    
    def approve_vendor(self, vendor_id: str, tier: TrustTier = TrustTier.APPROVED,
                      reason: str = "Requirements met") -> VendorCertification:
        """Approve a vendor for a specific tier"""
        cert = self._certifications.get(vendor_id)
        if not cert:
            raise ValueError(f"Vendor {vendor_id} not found")
        
        old_tier = cert.trust_tier
        cert.trust_tier = tier
        cert.certified_at = datetime.now(timezone.utc)
        cert.certification_expires = datetime.now(timezone.utc) + timedelta(days=365)
        cert.next_audit = datetime.now(timezone.utc) + timedelta(days=90)
        cert.trust_score = TIER_THRESHOLDS.get(tier, 70)
        cert.updated_at = datetime.now(timezone.utc)
        
        cert.tier_history.append({
            "tier": tier.value,
            "date": datetime.now(timezone.utc).isoformat(),
            "reason": reason,
            "previous_tier": old_tier.value
        })
        
        return cert
    
    # ==================== Compliance Checks ====================
    
    def record_check(self, vendor_id: str, check_type: CheckType,
                    passed: bool, score: float, details: Dict = None) -> ComplianceCheck:
        """Record a compliance check result"""
        check = ComplianceCheck(
            vendor_id=vendor_id,
            check_type=check_type,
            passed=passed,
            score=score,
            details=details or {},
            next_check_at=datetime.now(timezone.utc) + timedelta(hours=24)
        )
        
        if vendor_id not in self._checks:
            self._checks[vendor_id] = []
        self._checks[vendor_id].append(check)
        
        # Update certification
        self._update_trust_score(vendor_id)
        
        return check
    
    def get_checks(self, vendor_id: str, check_type: CheckType = None,
                  limit: int = 100) -> List[ComplianceCheck]:
        """Get compliance checks for a vendor"""
        checks = self._checks.get(vendor_id, [])
        if check_type:
            checks = [c for c in checks if c.check_type == check_type]
        return sorted(checks, key=lambda c: c.checked_at, reverse=True)[:limit]
    
    def run_automated_checks(self, vendor_id: str) -> List[ComplianceCheck]:
        """Run all automated compliance checks for a vendor"""
        cert = self._certifications.get(vendor_id)
        if not cert:
            return []
        
        results = []
        
        # Integration check
        integration_check = ComplianceCheck(
            vendor_id=vendor_id,
            check_type=CheckType.INTEGRATION,
            passed=cert.gateway_connected and cert.integration_verified,
            score=100 if (cert.gateway_connected and cert.integration_verified) else 0,
            details={
                "gateway_connected": cert.gateway_connected,
                "integration_verified": cert.integration_verified
            }
        )
        results.append(integration_check)
        
        # Consent validation check
        consent_check = ComplianceCheck(
            vendor_id=vendor_id,
            check_type=CheckType.CONSENT_VALIDATION,
            passed=cert.compliance_rate >= 95,
            score=cert.compliance_rate,
            details={
                "compliance_rate": cert.compliance_rate,
                "total_events": cert.total_events_processed,
                "compliant_events": cert.compliant_events
            }
        )
        results.append(consent_check)
        
        # Audit trail check
        audit_check = ComplianceCheck(
            vendor_id=vendor_id,
            check_type=CheckType.AUDIT_TRAIL,
            passed=cert.logging_enabled,
            score=100 if cert.logging_enabled else 0,
            details={"logging_enabled": cert.logging_enabled}
        )
        results.append(audit_check)
        
        # Store results
        if vendor_id not in self._checks:
            self._checks[vendor_id] = []
        self._checks[vendor_id].extend(results)
        
        # Update scores
        self._update_trust_score(vendor_id)
        
        return results
    
    # ==================== Violation Management ====================
    
    def record_violation(self, vendor_id: str, violation_type: ViolationType,
                        description: str, evidence: Dict = None,
                        events_affected: int = 0, users_affected: int = 0) -> Violation:
        """Record a policy violation and take appropriate action"""
        cert = self._certifications.get(vendor_id)
        if not cert:
            raise ValueError(f"Vendor {vendor_id} not found")
        
        severity = VIOLATION_SEVERITY_MAP.get(violation_type, ViolationSeverity.MEDIUM)
        old_tier = cert.trust_tier
        
        violation = Violation(
            vendor_id=vendor_id,
            violation_type=violation_type,
            severity=severity,
            description=description,
            evidence=evidence or {},
            events_affected=events_affected,
            users_affected=users_affected,
            tier_before=old_tier
        )
        
        # Store violation
        if vendor_id not in self._violations:
            self._violations[vendor_id] = []
        self._violations[vendor_id].append(violation)
        
        # Update certification
        cert.total_violations += 1
        cert.open_violations += 1
        if severity == ViolationSeverity.CRITICAL:
            cert.critical_violations += 1
        
        # Deduct points
        cert.trust_score = max(0, cert.trust_score - SEVERITY_POINTS[severity])
        
        # Determine new tier
        new_tier = self._calculate_tier(cert.trust_score, cert.critical_violations)
        
        # Apply tier change
        if new_tier != old_tier:
            cert.trust_tier = new_tier
            violation.tier_after = new_tier
            violation.action_taken = f"Downgraded from {old_tier.value} to {new_tier.value}"
            
            cert.tier_history.append({
                "tier": new_tier.value,
                "date": datetime.now(timezone.utc).isoformat(),
                "reason": f"Violation: {violation_type.value}",
                "previous_tier": old_tier.value,
                "violation_id": violation.id
            })
        else:
            violation.tier_after = old_tier
            violation.action_taken = "Warning issued, increased monitoring"
        
        cert.updated_at = datetime.now(timezone.utc)
        
        return violation
    
    def resolve_violation(self, violation_id: str, resolution_notes: str) -> Optional[Violation]:
        """Mark a violation as resolved"""
        for vendor_id, violations in self._violations.items():
            for v in violations:
                if v.id == violation_id:
                    v.resolved_at = datetime.now(timezone.utc)
                    v.resolution_notes = resolution_notes
                    
                    # Update cert
                    cert = self._certifications.get(vendor_id)
                    if cert:
                        cert.open_violations = max(0, cert.open_violations - 1)
                        
                        # Restore some trust points
                        restore_points = SEVERITY_POINTS[v.severity] // 2
                        cert.trust_score = min(100, cert.trust_score + restore_points)
                        
                        # Maybe upgrade tier
                        new_tier = self._calculate_tier(cert.trust_score, cert.critical_violations)
                        if new_tier.value > cert.trust_tier.value:  # Higher tier
                            cert.trust_tier = new_tier
                            cert.tier_history.append({
                                "tier": new_tier.value,
                                "date": datetime.now(timezone.utc).isoformat(),
                                "reason": f"Violation {violation_id} resolved",
                                "previous_tier": cert.trust_tier.value
                            })
                    
                    return v
        return None
    
    def get_violations(self, vendor_id: str, open_only: bool = False) -> List[Violation]:
        """Get violations for a vendor"""
        violations = self._violations.get(vendor_id, [])
        if open_only:
            violations = [v for v in violations if v.resolved_at is None]
        return sorted(violations, key=lambda v: v.detected_at, reverse=True)
    
    # ==================== Trust Score ====================
    
    def _calculate_tier(self, score: float, critical_violations: int) -> TrustTier:
        """Calculate trust tier based on score and violations"""
        # Critical violations = immediate suspension
        if critical_violations > 0:
            return TrustTier.SUSPENDED
        
        if score >= TIER_THRESHOLDS[TrustTier.CERTIFIED]:
            return TrustTier.CERTIFIED
        elif score >= TIER_THRESHOLDS[TrustTier.APPROVED]:
            return TrustTier.APPROVED
        elif score >= TIER_THRESHOLDS[TrustTier.PROBATION]:
            return TrustTier.PROBATION
        else:
            return TrustTier.SUSPENDED
    
    def _update_trust_score(self, vendor_id: str):
        """Recalculate trust score based on recent checks"""
        cert = self._certifications.get(vendor_id)
        if not cert:
            return
        
        checks = self._checks.get(vendor_id, [])
        if not checks:
            return
        
        # Get latest check of each type
        latest_by_type: Dict[CheckType, ComplianceCheck] = {}
        for check in checks:
            if check.check_type not in latest_by_type or \
               check.checked_at > latest_by_type[check.check_type].checked_at:
                latest_by_type[check.check_type] = check
        
        # Calculate weighted score
        weights = {
            CheckType.INTEGRATION: 0.25,
            CheckType.CONSENT_VALIDATION: 0.25,
            CheckType.DATA_FLOW: 0.20,
            CheckType.AUDIT_TRAIL: 0.15,
            CheckType.RESPONSE_TIME: 0.10,
            CheckType.SECURITY: 0.05,
        }
        
        total_weight = 0
        weighted_score = 0
        
        for check_type, check in latest_by_type.items():
            weight = weights.get(check_type, 0.1)
            weighted_score += check.score * weight
            total_weight += weight
        
        if total_weight > 0:
            base_score = weighted_score / total_weight
            
            # Apply violation penalty
            violation_penalty = cert.open_violations * 5
            cert.trust_score = max(0, min(100, base_score - violation_penalty))
    
    # ==================== Public Trust Registry ====================
    
    def get_trust_registry(self) -> List[TrustRegistryEntry]:
        """Get the public trust registry (customer-visible)"""
        entries = []
        
        for cert in self._certifications.values():
            # Skip pending vendors
            if cert.trust_tier == TrustTier.PENDING:
                continue
            
            # Determine badges
            badges = []
            if cert.trust_tier == TrustTier.CERTIFIED:
                badges.append("certified")
            if cert.compliance_rate >= 99:
                badges.append("high_compliance")
            if cert.total_violations == 0:
                badges.append("clean_record")
            if cert.total_events_processed >= 1000000:
                badges.append("high_volume")
            
            entry = TrustRegistryEntry(
                vendor_id=cert.vendor_id,
                vendor_name=cert.vendor_name,
                trust_tier=cert.trust_tier,
                trust_score=round(cert.trust_score, 1),
                compliance_rate=cert.compliance_rate,
                certified_since=cert.certified_at,
                last_verified=cert.updated_at,
                has_open_violations=cert.open_violations > 0,
                on_probation=cert.trust_tier == TrustTier.PROBATION,
                badges=badges
            )
            entries.append(entry)
        
        return sorted(entries, key=lambda e: e.trust_score, reverse=True)
    
    def get_registry_entry(self, vendor_id: str) -> Optional[TrustRegistryEntry]:
        """Get a single trust registry entry"""
        registry = self.get_trust_registry()
        for entry in registry:
            if entry.vendor_id == vendor_id:
                return entry
        return None
    
    # ==================== Event Processing Integration ====================
    
    def check_vendor_allowed(self, vendor_id: str) -> Tuple[bool, str]:
        """Check if a vendor is allowed to receive events"""
        cert = self._certifications.get(vendor_id)
        
        if not cert:
            return False, "Vendor not registered"
        
        if cert.trust_tier == TrustTier.SUSPENDED:
            return False, "Vendor suspended due to policy violations"
        
        if cert.trust_tier == TrustTier.REVOKED:
            return False, "Vendor certification revoked"
        
        if cert.trust_tier == TrustTier.PENDING:
            return False, "Vendor pending certification"
        
        return True, "Vendor approved"
    
    def record_event_processed(self, vendor_id: str, compliant: bool):
        """Record that an event was processed for a vendor"""
        cert = self._certifications.get(vendor_id)
        if cert:
            cert.total_events_processed += 1
            if compliant:
                cert.compliant_events += 1
            else:
                cert.blocked_events += 1
            
            # Recalculate compliance rate
            if cert.total_events_processed > 0:
                cert.compliance_rate = round(
                    (cert.compliant_events / cert.total_events_processed) * 100, 2
                )
    
    # ==================== Statistics ====================
    
    def get_stats(self) -> Dict[str, Any]:
        """Get certification system statistics"""
        certs = list(self._certifications.values())
        
        tier_counts = {}
        for tier in TrustTier:
            tier_counts[tier.value] = len([c for c in certs if c.trust_tier == tier])
        
        total_violations = sum(c.total_violations for c in certs)
        open_violations = sum(c.open_violations for c in certs)
        
        return {
            "total_vendors": len(certs),
            "tier_distribution": tier_counts,
            "total_violations": total_violations,
            "open_violations": open_violations,
            "avg_trust_score": round(
                sum(c.trust_score for c in certs) / len(certs) if certs else 0, 1
            ),
            "avg_compliance_rate": round(
                sum(c.compliance_rate for c in certs) / len(certs) if certs else 0, 1
            )
        }


# Singleton instance
vendor_certification_service = VendorCertificationService()
