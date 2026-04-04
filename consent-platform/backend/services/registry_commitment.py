"""
Vendor Registry Commitment Path

Similar to IAB TCF Vendor List (https://iabeurope.eu/vendor-list-tcf/)
but for our Consent Platform ecosystem.

Markets:
- EU: GDPR, ePrivacy Directive
- US: CCPA/CPRA, State Privacy Laws

Commitment Levels:
1. Registered - Basic registration, pending review
2. Committed - Signed commitment, integration in progress
3. Certified - Full integration verified, ongoing compliance
4. Suspended - Violations detected, remediation required
5. Revoked - Repeated violations, removed from registry

Public Registry Features:
- Publicly visible commitment status
- Compliance history
- Integration verification status
- Violation records
- Renewal dates
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum
import uuid
import hashlib


# ============== Enums ==============

class Market(str, Enum):
    """Target markets for compliance"""
    EU = "eu"
    US = "us"
    GLOBAL = "global"


class CommitmentLevel(str, Enum):
    """Commitment levels in the registry"""
    REGISTERED = "registered"
    COMMITTED = "committed"
    CERTIFIED = "certified"
    SUSPENDED = "suspended"
    REVOKED = "revoked"


class ComplianceFramework(str, Enum):
    """Compliance frameworks"""
    # EU
    GDPR = "gdpr"
    TCF_2_2 = "tcf_2_2"
    EPRIVACY = "eprivacy"
    
    # US
    CCPA = "ccpa"
    CPRA = "cpra"
    VIRGINIA_CDPA = "virginia_cdpa"
    COLORADO_CPA = "colorado_cpa"
    CONNECTICUT_CTDPA = "connecticut_ctdpa"
    
    # Industry
    NAI = "nai"  # Network Advertising Initiative
    DAA = "daa"  # Digital Advertising Alliance


class IntegrationType(str, Enum):
    """Types of platform integration"""
    SERVER_SIDE = "server_side"
    CLIENT_SIDE = "client_side"
    HYBRID = "hybrid"


# ============== Models ==============

class CommitmentRequirements(BaseModel):
    """Requirements for each commitment level"""
    level: CommitmentLevel
    requirements: List[str]
    verification_frequency_days: int
    max_open_violations: int
    min_compliance_rate: float


class RegistryEntry(BaseModel):
    """A vendor's entry in the public registry"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    vendor_name: str
    vendor_url: Optional[str] = None
    
    # Commitment status
    commitment_level: CommitmentLevel = CommitmentLevel.REGISTERED
    markets: List[Market] = [Market.GLOBAL]
    frameworks: List[ComplianceFramework] = []
    
    # Dates
    registered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    committed_at: Optional[datetime] = None
    certified_at: Optional[datetime] = None
    certification_expires: Optional[datetime] = None
    last_verified: Optional[datetime] = None
    next_verification: Optional[datetime] = None
    
    # Integration
    integration_type: IntegrationType = IntegrationType.SERVER_SIDE
    integration_verified: bool = False
    gateway_connected: bool = False
    api_version: str = "v1"
    
    # Compliance metrics (public)
    compliance_rate: float = 0.0
    total_events_processed: int = 0
    consent_rate: float = 0.0
    
    # Violations
    total_violations: int = 0
    open_violations: int = 0
    critical_violations: int = 0
    
    # Commitment history
    history: List[Dict[str, Any]] = []
    
    # Public flags
    publicly_visible: bool = True
    badges: List[str] = []


class CommitmentApplication(BaseModel):
    """Application for commitment level upgrade"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    target_level: CommitmentLevel
    markets: List[Market]
    frameworks: List[ComplianceFramework]
    
    # Application details
    applied_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    contact_email: str
    contact_name: str
    company_address: str
    
    # Technical details
    integration_type: IntegrationType
    technical_contact: str
    api_endpoint: Optional[str] = None
    
    # Agreements
    terms_accepted: bool = False
    dpa_signed: bool = False
    audit_consent: bool = False
    
    # Status
    status: str = "pending"  # pending, approved, rejected, withdrawn
    reviewed_at: Optional[datetime] = None
    reviewer_notes: Optional[str] = None


class VerificationResult(BaseModel):
    """Result of a commitment verification"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    verified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Checks performed
    checks_passed: List[str] = []
    checks_failed: List[str] = []
    
    # Metrics at verification time
    compliance_rate: float = 0.0
    consent_rate: float = 0.0
    open_violations: int = 0
    
    # Result
    passed: bool = False
    level_maintained: bool = True
    recommended_action: Optional[str] = None


# ============== Commitment Requirements ==============

COMMITMENT_REQUIREMENTS = {
    CommitmentLevel.REGISTERED: CommitmentRequirements(
        level=CommitmentLevel.REGISTERED,
        requirements=[
            "Complete vendor registration form",
            "Provide contact information",
            "Accept terms of service"
        ],
        verification_frequency_days=0,  # No verification
        max_open_violations=999,
        min_compliance_rate=0.0
    ),
    CommitmentLevel.COMMITTED: CommitmentRequirements(
        level=CommitmentLevel.COMMITTED,
        requirements=[
            "Sign commitment agreement",
            "Complete integration plan",
            "Assign technical contact",
            "Begin integration process"
        ],
        verification_frequency_days=30,
        max_open_violations=10,
        min_compliance_rate=50.0
    ),
    CommitmentLevel.CERTIFIED: CommitmentRequirements(
        level=CommitmentLevel.CERTIFIED,
        requirements=[
            "Complete gateway integration",
            "Pass integration verification",
            "Maintain 95%+ compliance rate",
            "No critical violations",
            "Submit to continuous monitoring",
            "Accept periodic audits"
        ],
        verification_frequency_days=90,
        max_open_violations=3,
        min_compliance_rate=95.0
    )
}


# ============== Registry Service ==============

class RegistryCommitmentService:
    """
    Manages the public vendor registry commitment path.
    
    Similar to IAB TCF Vendor List but for consent enforcement.
    """
    
    def __init__(self):
        # Registry entries
        self._entries: Dict[str, RegistryEntry] = {}
        
        # Applications
        self._applications: Dict[str, CommitmentApplication] = {}
        
        # Verification history
        self._verifications: Dict[str, List[VerificationResult]] = {}
        
        # Initialize with demo data
        self._init_demo_data()
    
    def _init_demo_data(self):
        """Initialize demo registry entries"""
        
        # Meta - Certified for EU and US
        self._entries["meta"] = RegistryEntry(
            vendor_id="meta",
            vendor_name="Meta Platforms, Inc.",
            vendor_url="https://www.meta.com",
            commitment_level=CommitmentLevel.CERTIFIED,
            markets=[Market.EU, Market.US],
            frameworks=[
                ComplianceFramework.GDPR,
                ComplianceFramework.TCF_2_2,
                ComplianceFramework.CCPA,
                ComplianceFramework.CPRA
            ],
            registered_at=datetime.now(timezone.utc) - timedelta(days=365),
            committed_at=datetime.now(timezone.utc) - timedelta(days=300),
            certified_at=datetime.now(timezone.utc) - timedelta(days=180),
            certification_expires=datetime.now(timezone.utc) + timedelta(days=185),
            last_verified=datetime.now(timezone.utc) - timedelta(days=30),
            next_verification=datetime.now(timezone.utc) + timedelta(days=60),
            integration_type=IntegrationType.SERVER_SIDE,
            integration_verified=True,
            gateway_connected=True,
            compliance_rate=99.5,
            total_events_processed=12500000,
            consent_rate=87.3,
            total_violations=2,
            open_violations=0,
            badges=["certified", "high_volume", "tcf_registered", "clean_record"],
            history=[
                {"date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(), "action": "registered", "level": "registered"},
                {"date": (datetime.now(timezone.utc) - timedelta(days=300)).isoformat(), "action": "committed", "level": "committed"},
                {"date": (datetime.now(timezone.utc) - timedelta(days=180)).isoformat(), "action": "certified", "level": "certified"},
            ]
        )
        
        # Google - Certified
        self._entries["google"] = RegistryEntry(
            vendor_id="google",
            vendor_name="Google LLC",
            vendor_url="https://www.google.com",
            commitment_level=CommitmentLevel.CERTIFIED,
            markets=[Market.EU, Market.US],
            frameworks=[
                ComplianceFramework.GDPR,
                ComplianceFramework.TCF_2_2,
                ComplianceFramework.CCPA
            ],
            registered_at=datetime.now(timezone.utc) - timedelta(days=400),
            committed_at=datetime.now(timezone.utc) - timedelta(days=350),
            certified_at=datetime.now(timezone.utc) - timedelta(days=200),
            certification_expires=datetime.now(timezone.utc) + timedelta(days=165),
            last_verified=datetime.now(timezone.utc) - timedelta(days=15),
            next_verification=datetime.now(timezone.utc) + timedelta(days=75),
            integration_type=IntegrationType.SERVER_SIDE,
            integration_verified=True,
            gateway_connected=True,
            compliance_rate=98.2,
            total_events_processed=8900000,
            consent_rate=85.1,
            total_violations=5,
            open_violations=1,
            badges=["certified", "high_volume", "tcf_registered"],
            history=[
                {"date": (datetime.now(timezone.utc) - timedelta(days=400)).isoformat(), "action": "registered", "level": "registered"},
                {"date": (datetime.now(timezone.utc) - timedelta(days=350)).isoformat(), "action": "committed", "level": "committed"},
                {"date": (datetime.now(timezone.utc) - timedelta(days=200)).isoformat(), "action": "certified", "level": "certified"},
            ]
        )
        
        # TikTok - Committed (working toward certification)
        self._entries["tiktok"] = RegistryEntry(
            vendor_id="tiktok",
            vendor_name="TikTok Inc.",
            vendor_url="https://www.tiktok.com",
            commitment_level=CommitmentLevel.COMMITTED,
            markets=[Market.US],
            frameworks=[ComplianceFramework.CCPA, ComplianceFramework.CPRA],
            registered_at=datetime.now(timezone.utc) - timedelta(days=120),
            committed_at=datetime.now(timezone.utc) - timedelta(days=60),
            last_verified=datetime.now(timezone.utc) - timedelta(days=7),
            next_verification=datetime.now(timezone.utc) + timedelta(days=23),
            integration_type=IntegrationType.SERVER_SIDE,
            integration_verified=True,
            gateway_connected=True,
            compliance_rate=92.0,
            total_events_processed=3400000,
            consent_rate=78.5,
            total_violations=8,
            open_violations=3,
            badges=["committed", "us_market"],
            history=[
                {"date": (datetime.now(timezone.utc) - timedelta(days=120)).isoformat(), "action": "registered", "level": "registered"},
                {"date": (datetime.now(timezone.utc) - timedelta(days=60)).isoformat(), "action": "committed", "level": "committed"},
            ]
        )
        
        # Amazon Ads - Registered
        self._entries["amazon"] = RegistryEntry(
            vendor_id="amazon",
            vendor_name="Amazon Advertising",
            vendor_url="https://advertising.amazon.com",
            commitment_level=CommitmentLevel.REGISTERED,
            markets=[Market.US],
            frameworks=[],
            registered_at=datetime.now(timezone.utc) - timedelta(days=30),
            integration_type=IntegrationType.SERVER_SIDE,
            integration_verified=False,
            gateway_connected=False,
            compliance_rate=0.0,
            total_events_processed=0,
            consent_rate=0.0,
            total_violations=0,
            open_violations=0,
            badges=["registered"],
            history=[
                {"date": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(), "action": "registered", "level": "registered"},
            ]
        )
    
    # ==================== Public Registry ====================
    
    def get_public_registry(self, market: Market = None) -> List[Dict[str, Any]]:
        """
        Get the public registry list.
        
        Similar to IAB Vendor List - publicly accessible.
        """
        entries = []
        
        for entry in self._entries.values():
            if not entry.publicly_visible:
                continue
            
            if market and market not in entry.markets:
                continue
            
            entries.append({
                "vendor_id": entry.vendor_id,
                "vendor_name": entry.vendor_name,
                "vendor_url": entry.vendor_url,
                "commitment_level": entry.commitment_level.value,
                "markets": [m.value for m in entry.markets],
                "frameworks": [f.value for f in entry.frameworks],
                "certified_at": entry.certified_at.isoformat() if entry.certified_at else None,
                "certification_expires": entry.certification_expires.isoformat() if entry.certification_expires else None,
                "compliance_rate": entry.compliance_rate,
                "consent_rate": entry.consent_rate,
                "badges": entry.badges,
                "open_violations": entry.open_violations,
                "integration_verified": entry.integration_verified
            })
        
        # Sort by commitment level and compliance rate
        level_order = {
            CommitmentLevel.CERTIFIED.value: 0,
            CommitmentLevel.COMMITTED.value: 1,
            CommitmentLevel.REGISTERED.value: 2,
            CommitmentLevel.SUSPENDED.value: 3,
            CommitmentLevel.REVOKED.value: 4
        }
        
        entries.sort(key=lambda x: (
            level_order.get(x["commitment_level"], 99),
            -x["compliance_rate"]
        ))
        
        return entries
    
    def get_registry_entry(self, vendor_id: str) -> Optional[RegistryEntry]:
        """Get a specific registry entry"""
        return self._entries.get(vendor_id)
    
    def get_registry_entry_public(self, vendor_id: str) -> Optional[Dict[str, Any]]:
        """Get public view of a registry entry"""
        entry = self._entries.get(vendor_id)
        if not entry or not entry.publicly_visible:
            return None
        
        return {
            "vendor_id": entry.vendor_id,
            "vendor_name": entry.vendor_name,
            "vendor_url": entry.vendor_url,
            "commitment_level": entry.commitment_level.value,
            "markets": [m.value for m in entry.markets],
            "frameworks": [f.value for f in entry.frameworks],
            "registered_at": entry.registered_at.isoformat(),
            "committed_at": entry.committed_at.isoformat() if entry.committed_at else None,
            "certified_at": entry.certified_at.isoformat() if entry.certified_at else None,
            "certification_expires": entry.certification_expires.isoformat() if entry.certification_expires else None,
            "last_verified": entry.last_verified.isoformat() if entry.last_verified else None,
            "integration_type": entry.integration_type.value,
            "integration_verified": entry.integration_verified,
            "compliance_rate": entry.compliance_rate,
            "consent_rate": entry.consent_rate,
            "total_violations": entry.total_violations,
            "open_violations": entry.open_violations,
            "badges": entry.badges,
            "history": entry.history
        }
    
    # ==================== Registration & Application ====================
    
    def register_vendor(self, vendor_id: str, vendor_name: str,
                       contact_email: str, vendor_url: str = None) -> RegistryEntry:
        """Register a new vendor in the registry"""
        
        entry = RegistryEntry(
            vendor_id=vendor_id,
            vendor_name=vendor_name,
            vendor_url=vendor_url,
            commitment_level=CommitmentLevel.REGISTERED,
            markets=[],
            frameworks=[],
            history=[{
                "date": datetime.now(timezone.utc).isoformat(),
                "action": "registered",
                "level": "registered"
            }]
        )
        
        self._entries[vendor_id] = entry
        return entry
    
    def apply_for_commitment(self, application: CommitmentApplication) -> str:
        """Submit application for commitment level upgrade"""
        
        self._applications[application.id] = application
        return application.id
    
    def process_application(self, application_id: str, approved: bool,
                           reviewer_notes: str = None) -> Optional[CommitmentApplication]:
        """Process a commitment application"""
        
        app = self._applications.get(application_id)
        if not app:
            return None
        
        app.status = "approved" if approved else "rejected"
        app.reviewed_at = datetime.now(timezone.utc)
        app.reviewer_notes = reviewer_notes
        
        if approved:
            entry = self._entries.get(app.vendor_id)
            if entry:
                self._upgrade_commitment(entry, app.target_level, app.markets, app.frameworks)
        
        return app
    
    def _upgrade_commitment(self, entry: RegistryEntry, new_level: CommitmentLevel,
                           markets: List[Market], frameworks: List[ComplianceFramework]):
        """Upgrade a vendor's commitment level"""
        
        old_level = entry.commitment_level
        entry.commitment_level = new_level
        entry.markets = markets
        entry.frameworks = frameworks
        
        now = datetime.now(timezone.utc)
        
        if new_level == CommitmentLevel.COMMITTED:
            entry.committed_at = now
            entry.next_verification = now + timedelta(days=30)
        elif new_level == CommitmentLevel.CERTIFIED:
            entry.certified_at = now
            entry.certification_expires = now + timedelta(days=365)
            entry.next_verification = now + timedelta(days=90)
            entry.badges.append("certified")
        
        entry.history.append({
            "date": now.isoformat(),
            "action": f"upgraded to {new_level.value}",
            "level": new_level.value,
            "previous_level": old_level.value
        })
    
    # ==================== Verification ====================
    
    def verify_commitment(self, vendor_id: str, metrics: Dict[str, Any]) -> VerificationResult:
        """Verify a vendor's commitment status"""
        
        entry = self._entries.get(vendor_id)
        if not entry:
            return VerificationResult(
                vendor_id=vendor_id,
                passed=False,
                recommended_action="Vendor not found in registry"
            )
        
        requirements = COMMITMENT_REQUIREMENTS.get(entry.commitment_level)
        if not requirements:
            return VerificationResult(
                vendor_id=vendor_id,
                passed=True,
                level_maintained=True
            )
        
        checks_passed = []
        checks_failed = []
        
        # Check compliance rate
        compliance_rate = metrics.get("compliance_rate", entry.compliance_rate)
        if compliance_rate >= requirements.min_compliance_rate:
            checks_passed.append(f"Compliance rate {compliance_rate:.1f}% >= {requirements.min_compliance_rate}%")
        else:
            checks_failed.append(f"Compliance rate {compliance_rate:.1f}% < {requirements.min_compliance_rate}%")
        
        # Check open violations
        open_violations = metrics.get("open_violations", entry.open_violations)
        if open_violations <= requirements.max_open_violations:
            checks_passed.append(f"Open violations {open_violations} <= {requirements.max_open_violations}")
        else:
            checks_failed.append(f"Open violations {open_violations} > {requirements.max_open_violations}")
        
        # Check integration
        if entry.commitment_level == CommitmentLevel.CERTIFIED:
            if entry.integration_verified and entry.gateway_connected:
                checks_passed.append("Integration verified and gateway connected")
            else:
                checks_failed.append("Integration verification required")
        
        # Determine result
        passed = len(checks_failed) == 0
        level_maintained = passed
        
        # Determine recommended action
        recommended_action = None
        if not passed:
            if entry.commitment_level == CommitmentLevel.CERTIFIED:
                if len(checks_failed) > 2:
                    recommended_action = "Consider downgrade to Committed level"
                else:
                    recommended_action = "Remediation required within 30 days"
            elif entry.commitment_level == CommitmentLevel.COMMITTED:
                recommended_action = "Address compliance gaps before certification"
        
        result = VerificationResult(
            vendor_id=vendor_id,
            checks_passed=checks_passed,
            checks_failed=checks_failed,
            compliance_rate=compliance_rate,
            consent_rate=metrics.get("consent_rate", entry.consent_rate),
            open_violations=open_violations,
            passed=passed,
            level_maintained=level_maintained,
            recommended_action=recommended_action
        )
        
        # Store verification
        if vendor_id not in self._verifications:
            self._verifications[vendor_id] = []
        self._verifications[vendor_id].append(result)
        
        # Update entry
        entry.last_verified = datetime.now(timezone.utc)
        entry.compliance_rate = compliance_rate
        entry.consent_rate = metrics.get("consent_rate", entry.consent_rate)
        
        reqs = COMMITMENT_REQUIREMENTS.get(entry.commitment_level)
        if reqs:
            entry.next_verification = datetime.now(timezone.utc) + timedelta(days=reqs.verification_frequency_days)
        
        return result
    
    def get_verifications(self, vendor_id: str, limit: int = 10) -> List[VerificationResult]:
        """Get verification history for a vendor"""
        verifications = self._verifications.get(vendor_id, [])
        return sorted(verifications, key=lambda v: v.verified_at, reverse=True)[:limit]
    
    # ==================== Downgrade / Suspension ====================
    
    def suspend_vendor(self, vendor_id: str, reason: str) -> Optional[RegistryEntry]:
        """Suspend a vendor's certification"""
        
        entry = self._entries.get(vendor_id)
        if not entry:
            return None
        
        old_level = entry.commitment_level
        entry.commitment_level = CommitmentLevel.SUSPENDED
        entry.badges = [b for b in entry.badges if b != "certified"]
        
        entry.history.append({
            "date": datetime.now(timezone.utc).isoformat(),
            "action": "suspended",
            "level": "suspended",
            "previous_level": old_level.value,
            "reason": reason
        })
        
        return entry
    
    def revoke_vendor(self, vendor_id: str, reason: str) -> Optional[RegistryEntry]:
        """Revoke a vendor from the registry"""
        
        entry = self._entries.get(vendor_id)
        if not entry:
            return None
        
        old_level = entry.commitment_level
        entry.commitment_level = CommitmentLevel.REVOKED
        entry.badges = []
        entry.publicly_visible = False  # Remove from public listing
        
        entry.history.append({
            "date": datetime.now(timezone.utc).isoformat(),
            "action": "revoked",
            "level": "revoked",
            "previous_level": old_level.value,
            "reason": reason
        })
        
        return entry
    
    def reinstate_vendor(self, vendor_id: str, to_level: CommitmentLevel,
                        reason: str) -> Optional[RegistryEntry]:
        """Reinstate a suspended vendor"""
        
        entry = self._entries.get(vendor_id)
        if not entry or entry.commitment_level not in [CommitmentLevel.SUSPENDED, CommitmentLevel.REVOKED]:
            return None
        
        old_level = entry.commitment_level
        entry.commitment_level = to_level
        entry.publicly_visible = True
        
        if to_level == CommitmentLevel.COMMITTED:
            entry.badges.append("committed")
        elif to_level == CommitmentLevel.CERTIFIED:
            entry.badges.append("certified")
            entry.certified_at = datetime.now(timezone.utc)
            entry.certification_expires = datetime.now(timezone.utc) + timedelta(days=365)
        
        entry.history.append({
            "date": datetime.now(timezone.utc).isoformat(),
            "action": "reinstated",
            "level": to_level.value,
            "previous_level": old_level.value,
            "reason": reason
        })
        
        return entry
    
    # ==================== Statistics ====================
    
    def get_registry_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        
        entries = list(self._entries.values())
        
        by_level = {}
        for level in CommitmentLevel:
            by_level[level.value] = len([e for e in entries if e.commitment_level == level])
        
        by_market = {}
        for market in Market:
            by_market[market.value] = len([e for e in entries if market in e.markets])
        
        by_framework = {}
        for framework in ComplianceFramework:
            by_framework[framework.value] = len([e for e in entries if framework in e.frameworks])
        
        certified = [e for e in entries if e.commitment_level == CommitmentLevel.CERTIFIED]
        
        return {
            "total_vendors": len(entries),
            "by_level": by_level,
            "by_market": by_market,
            "by_framework": by_framework,
            "avg_compliance_rate": sum(e.compliance_rate for e in certified) / len(certified) if certified else 0,
            "total_events_processed": sum(e.total_events_processed for e in entries),
            "total_violations": sum(e.total_violations for e in entries),
            "open_violations": sum(e.open_violations for e in entries)
        }
    
    def get_commitment_requirements(self, level: CommitmentLevel) -> Optional[CommitmentRequirements]:
        """Get requirements for a commitment level"""
        return COMMITMENT_REQUIREMENTS.get(level)
    
    def get_all_requirements(self) -> Dict[str, Any]:
        """Get all commitment level requirements"""
        return {
            level.value: req.model_dump()
            for level, req in COMMITMENT_REQUIREMENTS.items()
        }


# Singleton instance
registry_service = RegistryCommitmentService()
