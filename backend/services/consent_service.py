"""
Consent as a Service - Core Backend Service
Provides comprehensive consent management functionality for GDPR, CCPA, and other privacy regulations.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from enum import Enum
import hashlib
import secrets
import uuid
import json


# ============== Enums ==============

class LegalBasis(str, Enum):
    CONSENT = "consent"
    LEGITIMATE_INTEREST = "legitimate_interest"
    CONTRACT = "contract"
    LEGAL_OBLIGATION = "legal_obligation"
    VITAL_INTEREST = "vital_interest"
    PUBLIC_TASK = "public_task"


class ConsentMethod(str, Enum):
    EXPLICIT = "explicit"
    IMPLICIT = "implicit"
    OPT_OUT = "opt_out"
    OPT_IN = "opt_in"
    BANNER = "banner"
    PREFERENCE_CENTER = "preference_center"
    API = "api"


class BannerType(str, Enum):
    COOKIE_BANNER = "cookie_banner"
    PRIVACY_NOTICE = "privacy_notice"
    MARKETING_CONSENT = "marketing_consent"
    DATA_COLLECTION = "data_collection"
    CUSTOM = "custom"


class BannerPosition(str, Enum):
    TOP = "top"
    BOTTOM = "bottom"
    CENTER = "center"
    BOTTOM_LEFT = "bottom_left"
    BOTTOM_RIGHT = "bottom_right"


class BannerLayout(str, Enum):
    BAR = "bar"
    MODAL = "modal"
    POPUP = "popup"
    FLOATING = "floating"


class DSARType(str, Enum):
    ACCESS = "access"
    DELETION = "deletion"
    RECTIFICATION = "rectification"
    PORTABILITY = "portability"
    RESTRICTION = "restriction"
    OBJECTION = "objection"


class DSARStatus(str, Enum):
    RECEIVED = "received"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class AuditAction(str, Enum):
    CONSENT_GIVEN = "consent_given"
    CONSENT_WITHDRAWN = "consent_withdrawn"
    CONSENT_EXPIRED = "consent_expired"
    PURPOSE_CREATED = "purpose_created"
    PURPOSE_UPDATED = "purpose_updated"
    PURPOSE_DELETED = "purpose_deleted"
    SUBJECT_CREATED = "subject_created"
    DATA_EXPORT_REQUESTED = "data_export_requested"
    DATA_DELETION_REQUESTED = "data_deletion_requested"
    DATA_DELETED = "data_deleted"


# ============== Models ==============

class OrganizationCreate(BaseModel):
    name: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#1E40AF"
    privacy_policy_url: Optional[str] = None
    terms_of_service_url: Optional[str] = None
    data_retention_days: int = 365


class Organization(OrganizationCreate):
    id: str
    created_at: datetime
    updated_at: datetime
    status: str = "active"
    settings: Dict[str, Any] = {}


class PurposeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    legal_basis: LegalBasis = LegalBasis.CONSENT
    is_essential: bool = False
    default_enabled: bool = False
    display_order: int = 0
    data_categories: List[str] = []
    retention_period_days: Optional[int] = None
    third_party_sharing: bool = False
    third_parties: List[str] = []


class Purpose(PurposeCreate):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime
    status: str = "active"


class SubjectCreate(BaseModel):
    external_id: Optional[str] = None
    email: Optional[str] = None
    country_code: Optional[str] = None
    region: Optional[str] = None
    metadata: Dict[str, Any] = {}


class Subject(SubjectCreate):
    id: str
    organization_id: str
    hashed_identifier: Optional[str] = None
    ip_address_hash: Optional[str] = None
    first_seen_at: datetime
    last_seen_at: datetime


class ConsentRecordCreate(BaseModel):
    subject_id: str
    purpose_id: str
    granted: bool
    consent_method: ConsentMethod = ConsentMethod.EXPLICIT
    consent_version: Optional[str] = None
    policy_version: Optional[str] = None
    expires_at: Optional[datetime] = None
    source_url: Optional[str] = None
    proof_data: Dict[str, Any] = {}


class ConsentRecord(ConsentRecordCreate):
    id: str
    organization_id: str
    collected_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class BannerCreate(BaseModel):
    name: str
    banner_type: BannerType = BannerType.COOKIE_BANNER
    position: BannerPosition = BannerPosition.BOTTOM
    layout: BannerLayout = BannerLayout.BAR
    title: Optional[str] = None
    description: Optional[str] = None
    accept_button_text: str = "Accept All"
    reject_button_text: str = "Reject All"
    customize_button_text: str = "Customize"
    show_reject_button: bool = True
    show_customize_button: bool = True
    auto_dismiss_seconds: Optional[int] = None
    blocking_mode: bool = False
    geo_targeting: List[str] = []
    purposes: List[str] = []
    styling: Dict[str, Any] = {}
    custom_css: Optional[str] = None
    translations: Dict[str, Dict[str, str]] = {}


class Banner(BannerCreate):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime
    status: str = "active"


class DSARRequestCreate(BaseModel):
    request_type: DSARType
    requestor_email: str
    requestor_name: Optional[str] = None
    subject_id: Optional[str] = None


class DSARRequest(DSARRequestCreate):
    id: str
    organization_id: str
    verification_status: str = "pending"
    verification_method: Optional[str] = None
    verification_completed_at: Optional[datetime] = None
    request_status: DSARStatus = DSARStatus.RECEIVED
    submitted_at: datetime
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    response_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class ConsentAnalytics(BaseModel):
    id: str
    organization_id: str
    banner_id: Optional[str] = None
    date: str
    impressions: int = 0
    accepts: int = 0
    rejects: int = 0
    customizes: int = 0
    ignores: int = 0
    country_breakdown: Dict[str, int] = {}
    device_breakdown: Dict[str, int] = {}
    purpose_breakdown: Dict[str, Dict[str, int]] = {}


class WebhookCreate(BaseModel):
    name: str
    url: str
    events: List[str]
    headers: Dict[str, str] = {}
    retry_count: int = 3
    timeout_seconds: int = 30


class Webhook(WebhookCreate):
    id: str
    organization_id: str
    secret: str
    last_triggered_at: Optional[datetime] = None
    last_status_code: Optional[int] = None
    failure_count: int = 0
    created_at: datetime
    status: str = "active"


class BulkConsentRequest(BaseModel):
    """For collecting consent for multiple purposes at once"""
    subject_identifier: str  # Can be email, external_id, or hashed identifier
    consents: List[Dict[str, Any]]  # [{purpose_id: str, granted: bool}, ...]
    consent_method: ConsentMethod = ConsentMethod.BANNER
    consent_version: Optional[str] = None
    policy_version: Optional[str] = None
    source_url: Optional[str] = None


class ConsentStatusResponse(BaseModel):
    """Response for checking a subject's current consent status"""
    subject_id: str
    purposes: List[Dict[str, Any]]
    last_updated: datetime
    consent_given: bool


# ============== Service Class ==============

class ConsentService:
    """
    Core service for managing consent operations.
    Provides a complete Consent Management Platform (CMP) backend.
    """
    
    def __init__(self):
        # In-memory storage for demo purposes
        # In production, this would connect to a real database
        self.organizations: Dict[str, Organization] = {}
        self.purposes: Dict[str, Purpose] = {}
        self.subjects: Dict[str, Subject] = {}
        self.consent_records: Dict[str, ConsentRecord] = {}
        self.banners: Dict[str, Banner] = {}
        self.dsar_requests: Dict[str, DSARRequest] = {}
        self.audit_logs: List[Dict[str, Any]] = []
        self.analytics: Dict[str, ConsentAnalytics] = {}
        self.webhooks: Dict[str, Webhook] = {}
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        
        # Initialize demo data
        self._init_demo_data()
    
    def _generate_id(self) -> str:
        """Generate a unique ID"""
        return str(uuid.uuid4())
    
    def _hash_identifier(self, identifier: str) -> str:
        """Hash an identifier for privacy"""
        return hashlib.sha256(identifier.encode()).hexdigest()
    
    def _generate_api_key(self) -> tuple[str, str, str]:
        """Generate an API key and return (full_key, key_hash, key_prefix)"""
        full_key = f"cmp_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        key_prefix = full_key[:12]
        return full_key, key_hash, key_prefix
    
    def _log_audit(self, org_id: str, action: AuditAction, **kwargs):
        """Log an audit entry"""
        entry = {
            "id": self._generate_id(),
            "organization_id": org_id,
            "action": action.value,
            "created_at": datetime.utcnow().isoformat(),
            **kwargs
        }
        self.audit_logs.append(entry)
        
        # Trigger webhooks for this event
        self._trigger_webhooks(org_id, f"consent.{action.value}", entry)
    
    def _trigger_webhooks(self, org_id: str, event: str, data: Dict[str, Any]):
        """Trigger webhooks for an event"""
        for webhook in self.webhooks.values():
            if webhook.organization_id == org_id and event in webhook.events:
                # In production, this would make actual HTTP requests
                # For now, just log it
                pass
    
    def _init_demo_data(self):
        """Initialize with demo organization and purposes"""
        # Create demo organization
        demo_org = Organization(
            id="demo-org-001",
            name="Demo Company",
            domain="demo.example.com",
            logo_url="https://via.placeholder.com/150",
            primary_color="#3B82F6",
            secondary_color="#1E40AF",
            privacy_policy_url="https://demo.example.com/privacy",
            terms_of_service_url="https://demo.example.com/terms",
            data_retention_days=365,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            status="active",
            settings={"gdpr_enabled": True, "ccpa_enabled": True}
        )
        self.organizations[demo_org.id] = demo_org
        
        # Create demo purposes
        demo_purposes = [
            Purpose(
                id="purpose-essential",
                organization_id=demo_org.id,
                name="Essential Cookies",
                description="Required for the website to function properly. Cannot be disabled.",
                legal_basis=LegalBasis.LEGITIMATE_INTEREST,
                is_essential=True,
                default_enabled=True,
                display_order=1,
                data_categories=["functional_data"],
                retention_period_days=365,
                third_party_sharing=False,
                third_parties=[],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                status="active"
            ),
            Purpose(
                id="purpose-analytics",
                organization_id=demo_org.id,
                name="Analytics",
                description="Help us understand how visitors interact with our website.",
                legal_basis=LegalBasis.CONSENT,
                is_essential=False,
                default_enabled=False,
                display_order=2,
                data_categories=["usage_data", "device_data"],
                retention_period_days=180,
                third_party_sharing=True,
                third_parties=["Google Analytics", "Mixpanel"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                status="active"
            ),
            Purpose(
                id="purpose-marketing",
                organization_id=demo_org.id,
                name="Marketing & Advertising",
                description="Used to deliver personalized advertisements and measure ad performance.",
                legal_basis=LegalBasis.CONSENT,
                is_essential=False,
                default_enabled=False,
                display_order=3,
                data_categories=["marketing_data", "behavioral_data"],
                retention_period_days=90,
                third_party_sharing=True,
                third_parties=["Google Ads", "Facebook Pixel", "LinkedIn Insight"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                status="active"
            ),
            Purpose(
                id="purpose-personalization",
                organization_id=demo_org.id,
                name="Personalization",
                description="Remember your preferences and customize your experience.",
                legal_basis=LegalBasis.CONSENT,
                is_essential=False,
                default_enabled=False,
                display_order=4,
                data_categories=["preference_data", "behavioral_data"],
                retention_period_days=365,
                third_party_sharing=False,
                third_parties=[],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                status="active"
            ),
            Purpose(
                id="purpose-email",
                organization_id=demo_org.id,
                name="Email Communications",
                description="Receive newsletters, product updates, and promotional offers.",
                legal_basis=LegalBasis.CONSENT,
                is_essential=False,
                default_enabled=False,
                display_order=5,
                data_categories=["contact_data"],
                retention_period_days=730,
                third_party_sharing=True,
                third_parties=["Mailchimp", "SendGrid"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                status="active"
            )
        ]
        
        for purpose in demo_purposes:
            self.purposes[purpose.id] = purpose
        
        # Create demo banner
        demo_banner = Banner(
            id="banner-001",
            organization_id=demo_org.id,
            name="Main Cookie Banner",
            banner_type=BannerType.COOKIE_BANNER,
            position=BannerPosition.BOTTOM,
            layout=BannerLayout.BAR,
            title="We value your privacy",
            description="We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking 'Accept All', you consent to our use of cookies.",
            accept_button_text="Accept All",
            reject_button_text="Reject All",
            customize_button_text="Manage Preferences",
            show_reject_button=True,
            show_customize_button=True,
            auto_dismiss_seconds=None,
            blocking_mode=False,
            geo_targeting=[],
            purposes=["purpose-essential", "purpose-analytics", "purpose-marketing", "purpose-personalization"],
            styling={
                "backgroundColor": "#ffffff",
                "textColor": "#1f2937",
                "buttonColor": "#3B82F6",
                "buttonTextColor": "#ffffff",
                "borderRadius": "8px",
                "boxShadow": "0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
            },
            custom_css=None,
            translations={
                "es": {
                    "title": "Valoramos su privacidad",
                    "description": "Utilizamos cookies para mejorar su experiencia de navegación.",
                    "accept_button": "Aceptar Todo",
                    "reject_button": "Rechazar Todo",
                    "customize_button": "Gestionar Preferencias"
                },
                "fr": {
                    "title": "Nous respectons votre vie privée",
                    "description": "Nous utilisons des cookies pour améliorer votre expérience de navigation.",
                    "accept_button": "Tout Accepter",
                    "reject_button": "Tout Refuser",
                    "customize_button": "Gérer les Préférences"
                },
                "de": {
                    "title": "Wir schätzen Ihre Privatsphäre",
                    "description": "Wir verwenden Cookies, um Ihr Browsing-Erlebnis zu verbessern.",
                    "accept_button": "Alle Akzeptieren",
                    "reject_button": "Alle Ablehnen",
                    "customize_button": "Einstellungen Verwalten"
                }
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            status="active"
        )
        self.banners[demo_banner.id] = demo_banner
        
        # Create demo analytics
        for i in range(30):
            date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            analytics = ConsentAnalytics(
                id=f"analytics-{date}",
                organization_id=demo_org.id,
                banner_id="banner-001",
                date=date,
                impressions=1000 + (i * 50) + (hash(date) % 200),
                accepts=700 + (i * 30) + (hash(date) % 100),
                rejects=150 + (hash(date) % 50),
                customizes=100 + (hash(date) % 30),
                ignores=50 + (hash(date) % 20),
                country_breakdown={
                    "US": 400 + (hash(date) % 100),
                    "UK": 200 + (hash(date) % 50),
                    "DE": 150 + (hash(date) % 40),
                    "FR": 100 + (hash(date) % 30),
                    "Other": 150 + (hash(date) % 30)
                },
                device_breakdown={
                    "desktop": 500 + (hash(date) % 100),
                    "mobile": 400 + (hash(date) % 80),
                    "tablet": 100 + (hash(date) % 20)
                },
                purpose_breakdown={
                    "purpose-analytics": {"accepted": 600, "rejected": 400},
                    "purpose-marketing": {"accepted": 400, "rejected": 600},
                    "purpose-personalization": {"accepted": 500, "rejected": 500}
                }
            )
            self.analytics[analytics.id] = analytics
        
        # Create some demo subjects and consent records
        for i in range(10):
            subject = Subject(
                id=f"subject-{i:03d}",
                organization_id=demo_org.id,
                external_id=f"user-{i:03d}",
                email=f"user{i}@example.com" if i % 2 == 0 else None,
                hashed_identifier=self._hash_identifier(f"user-{i:03d}"),
                country_code="US" if i < 5 else "UK",
                region="California" if i < 5 else "London",
                first_seen_at=datetime.utcnow() - timedelta(days=30-i),
                last_seen_at=datetime.utcnow() - timedelta(days=i),
                metadata={}
            )
            self.subjects[subject.id] = subject
            
            # Create consent records for each subject
            for purpose in demo_purposes:
                if not purpose.is_essential:
                    record = ConsentRecord(
                        id=f"record-{subject.id}-{purpose.id}",
                        organization_id=demo_org.id,
                        subject_id=subject.id,
                        purpose_id=purpose.id,
                        granted=hash(f"{subject.id}-{purpose.id}") % 2 == 0,
                        consent_method=ConsentMethod.BANNER,
                        consent_version="1.0",
                        policy_version="2024.1",
                        collected_at=datetime.utcnow() - timedelta(days=i),
                        expires_at=datetime.utcnow() + timedelta(days=365),
                        ip_address="192.168.1.1",
                        user_agent="Mozilla/5.0",
                        source_url="https://demo.example.com",
                        proof_data={"timestamp": datetime.utcnow().isoformat()}
                    )
                    self.consent_records[record.id] = record
    
    # ============== Organization Methods ==============
    
    def create_organization(self, data: OrganizationCreate) -> Organization:
        """Create a new organization"""
        org = Organization(
            id=self._generate_id(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            **data.model_dump()
        )
        self.organizations[org.id] = org
        return org
    
    def get_organization(self, org_id: str) -> Optional[Organization]:
        """Get an organization by ID"""
        return self.organizations.get(org_id)
    
    def list_organizations(self) -> List[Organization]:
        """List all organizations"""
        return list(self.organizations.values())
    
    def update_organization(self, org_id: str, data: Dict[str, Any]) -> Optional[Organization]:
        """Update an organization"""
        org = self.organizations.get(org_id)
        if org:
            for key, value in data.items():
                if hasattr(org, key):
                    setattr(org, key, value)
            org.updated_at = datetime.utcnow()
            self.organizations[org_id] = org
        return org
    
    # ============== Purpose Methods ==============
    
    def create_purpose(self, org_id: str, data: PurposeCreate) -> Purpose:
        """Create a new consent purpose"""
        purpose = Purpose(
            id=self._generate_id(),
            organization_id=org_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            **data.model_dump()
        )
        self.purposes[purpose.id] = purpose
        self._log_audit(org_id, AuditAction.PURPOSE_CREATED, purpose_id=purpose.id, new_value=data.model_dump())
        return purpose
    
    def get_purpose(self, purpose_id: str) -> Optional[Purpose]:
        """Get a purpose by ID"""
        return self.purposes.get(purpose_id)
    
    def list_purposes(self, org_id: str) -> List[Purpose]:
        """List all purposes for an organization"""
        return [p for p in self.purposes.values() if p.organization_id == org_id and p.status == "active"]
    
    def update_purpose(self, purpose_id: str, data: Dict[str, Any]) -> Optional[Purpose]:
        """Update a purpose"""
        purpose = self.purposes.get(purpose_id)
        if purpose:
            old_value = purpose.model_dump()
            for key, value in data.items():
                if hasattr(purpose, key):
                    setattr(purpose, key, value)
            purpose.updated_at = datetime.utcnow()
            self.purposes[purpose_id] = purpose
            self._log_audit(purpose.organization_id, AuditAction.PURPOSE_UPDATED, 
                          purpose_id=purpose_id, old_value=old_value, new_value=purpose.model_dump())
        return purpose
    
    def delete_purpose(self, purpose_id: str) -> bool:
        """Soft delete a purpose"""
        purpose = self.purposes.get(purpose_id)
        if purpose:
            purpose.status = "deleted"
            purpose.updated_at = datetime.utcnow()
            self._log_audit(purpose.organization_id, AuditAction.PURPOSE_DELETED, purpose_id=purpose_id)
            return True
        return False
    
    # ============== Subject Methods ==============
    
    def create_or_get_subject(self, org_id: str, data: SubjectCreate, ip_address: Optional[str] = None) -> Subject:
        """Create a new subject or return existing one"""
        # Check for existing subject
        for subject in self.subjects.values():
            if subject.organization_id == org_id:
                if data.external_id and subject.external_id == data.external_id:
                    subject.last_seen_at = datetime.utcnow()
                    return subject
                if data.email and subject.email == data.email:
                    subject.last_seen_at = datetime.utcnow()
                    return subject
        
        # Create new subject
        hashed_id = None
        if data.external_id:
            hashed_id = self._hash_identifier(data.external_id)
        elif data.email:
            hashed_id = self._hash_identifier(data.email)
        
        ip_hash = self._hash_identifier(ip_address) if ip_address else None
        
        subject = Subject(
            id=self._generate_id(),
            organization_id=org_id,
            hashed_identifier=hashed_id,
            ip_address_hash=ip_hash,
            first_seen_at=datetime.utcnow(),
            last_seen_at=datetime.utcnow(),
            **data.model_dump()
        )
        self.subjects[subject.id] = subject
        self._log_audit(org_id, AuditAction.SUBJECT_CREATED, subject_id=subject.id)
        return subject
    
    def get_subject(self, subject_id: str) -> Optional[Subject]:
        """Get a subject by ID"""
        return self.subjects.get(subject_id)
    
    def find_subject(self, org_id: str, identifier: str) -> Optional[Subject]:
        """Find a subject by external_id, email, or hashed identifier"""
        hashed = self._hash_identifier(identifier)
        for subject in self.subjects.values():
            if subject.organization_id == org_id:
                if subject.external_id == identifier or subject.email == identifier or subject.hashed_identifier == hashed:
                    return subject
        return None
    
    def list_subjects(self, org_id: str, limit: int = 100, offset: int = 0) -> List[Subject]:
        """List subjects for an organization"""
        subjects = [s for s in self.subjects.values() if s.organization_id == org_id]
        return subjects[offset:offset + limit]
    
    # ============== Consent Record Methods ==============
    
    def record_consent(self, org_id: str, data: ConsentRecordCreate, 
                      ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> ConsentRecord:
        """Record a consent decision"""
        record = ConsentRecord(
            id=self._generate_id(),
            organization_id=org_id,
            collected_at=datetime.utcnow(),
            ip_address=ip_address,
            user_agent=user_agent,
            **data.model_dump()
        )
        self.consent_records[record.id] = record
        
        action = AuditAction.CONSENT_GIVEN if data.granted else AuditAction.CONSENT_WITHDRAWN
        self._log_audit(org_id, action, subject_id=data.subject_id, purpose_id=data.purpose_id, 
                       record_id=record.id, new_value={"granted": data.granted})
        
        return record
    
    def record_bulk_consent(self, org_id: str, request: BulkConsentRequest,
                           ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> List[ConsentRecord]:
        """Record consent for multiple purposes at once"""
        # Find or create subject
        subject = self.find_subject(org_id, request.subject_identifier)
        if not subject:
            subject = self.create_or_get_subject(
                org_id, 
                SubjectCreate(external_id=request.subject_identifier),
                ip_address
            )
        
        records = []
        for consent in request.consents:
            record_data = ConsentRecordCreate(
                subject_id=subject.id,
                purpose_id=consent["purpose_id"],
                granted=consent["granted"],
                consent_method=request.consent_method,
                consent_version=request.consent_version,
                policy_version=request.policy_version,
                source_url=request.source_url
            )
            record = self.record_consent(org_id, record_data, ip_address, user_agent)
            records.append(record)
        
        return records
    
    def get_consent_status(self, org_id: str, subject_id: str) -> ConsentStatusResponse:
        """Get current consent status for a subject"""
        purposes = self.list_purposes(org_id)
        purpose_statuses = []
        last_updated = None
        consent_given = False
        
        for purpose in purposes:
            # Find the most recent consent record for this purpose
            records = [r for r in self.consent_records.values() 
                      if r.subject_id == subject_id and r.purpose_id == purpose.id]
            records.sort(key=lambda r: r.collected_at, reverse=True)
            
            if records:
                latest = records[0]
                granted = latest.granted
                if last_updated is None or latest.collected_at > last_updated:
                    last_updated = latest.collected_at
                if granted:
                    consent_given = True
            else:
                granted = purpose.default_enabled if purpose.is_essential else False
            
            purpose_statuses.append({
                "purpose_id": purpose.id,
                "purpose_name": purpose.name,
                "granted": granted,
                "is_essential": purpose.is_essential,
                "legal_basis": purpose.legal_basis.value
            })
        
        return ConsentStatusResponse(
            subject_id=subject_id,
            purposes=purpose_statuses,
            last_updated=last_updated or datetime.utcnow(),
            consent_given=consent_given
        )
    
    def get_consent_records(self, org_id: str, subject_id: Optional[str] = None, 
                           purpose_id: Optional[str] = None, limit: int = 100) -> List[ConsentRecord]:
        """Get consent records with optional filters"""
        records = [r for r in self.consent_records.values() if r.organization_id == org_id]
        
        if subject_id:
            records = [r for r in records if r.subject_id == subject_id]
        if purpose_id:
            records = [r for r in records if r.purpose_id == purpose_id]
        
        records.sort(key=lambda r: r.collected_at, reverse=True)
        return records[:limit]
    
    # ============== Banner Methods ==============
    
    def create_banner(self, org_id: str, data: BannerCreate) -> Banner:
        """Create a new consent banner"""
        banner = Banner(
            id=self._generate_id(),
            organization_id=org_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            **data.model_dump()
        )
        self.banners[banner.id] = banner
        return banner
    
    def get_banner(self, banner_id: str) -> Optional[Banner]:
        """Get a banner by ID"""
        return self.banners.get(banner_id)
    
    def list_banners(self, org_id: str) -> List[Banner]:
        """List all banners for an organization"""
        return [b for b in self.banners.values() if b.organization_id == org_id]
    
    def update_banner(self, banner_id: str, data: Dict[str, Any]) -> Optional[Banner]:
        """Update a banner"""
        banner = self.banners.get(banner_id)
        if banner:
            for key, value in data.items():
                if hasattr(banner, key):
                    setattr(banner, key, value)
            banner.updated_at = datetime.utcnow()
            self.banners[banner_id] = banner
        return banner
    
    def get_banner_config(self, org_id: str, banner_id: Optional[str] = None) -> Dict[str, Any]:
        """Get banner configuration for embedding"""
        if banner_id:
            banner = self.get_banner(banner_id)
        else:
            banners = self.list_banners(org_id)
            banner = banners[0] if banners else None
        
        if not banner:
            return {}
        
        purposes = [self.get_purpose(p) for p in banner.purposes]
        purposes = [p for p in purposes if p]
        
        org = self.get_organization(org_id)
        
        return {
            "banner": banner.model_dump(),
            "purposes": [p.model_dump() for p in purposes],
            "organization": {
                "name": org.name if org else "",
                "logo_url": org.logo_url if org else "",
                "privacy_policy_url": org.privacy_policy_url if org else "",
                "primary_color": org.primary_color if org else "#3B82F6"
            }
        }
    
    # ============== DSAR Methods ==============
    
    def create_dsar_request(self, org_id: str, data: DSARRequestCreate) -> DSARRequest:
        """Create a new DSAR request"""
        due_date = datetime.utcnow() + timedelta(days=30)  # GDPR: 30 days
        
        request = DSARRequest(
            id=self._generate_id(),
            organization_id=org_id,
            submitted_at=datetime.utcnow(),
            due_date=due_date,
            **data.model_dump()
        )
        self.dsar_requests[request.id] = request
        
        action = AuditAction.DATA_EXPORT_REQUESTED if data.request_type == DSARType.ACCESS else AuditAction.DATA_DELETION_REQUESTED
        self._log_audit(org_id, action, subject_id=data.subject_id)
        
        return request
    
    def get_dsar_request(self, request_id: str) -> Optional[DSARRequest]:
        """Get a DSAR request by ID"""
        return self.dsar_requests.get(request_id)
    
    def list_dsar_requests(self, org_id: str, status: Optional[DSARStatus] = None) -> List[DSARRequest]:
        """List DSAR requests for an organization"""
        requests = [r for r in self.dsar_requests.values() if r.organization_id == org_id]
        if status:
            requests = [r for r in requests if r.request_status == status]
        return requests
    
    def update_dsar_request(self, request_id: str, data: Dict[str, Any]) -> Optional[DSARRequest]:
        """Update a DSAR request"""
        request = self.dsar_requests.get(request_id)
        if request:
            for key, value in data.items():
                if hasattr(request, key):
                    setattr(request, key, value)
            self.dsar_requests[request_id] = request
        return request
    
    # ============== Analytics Methods ==============
    
    def record_banner_interaction(self, org_id: str, banner_id: str, interaction_type: str,
                                  country: Optional[str] = None, device: Optional[str] = None):
        """Record a banner interaction for analytics"""
        date = datetime.utcnow().strftime("%Y-%m-%d")
        analytics_id = f"{org_id}-{banner_id}-{date}"
        
        if analytics_id not in self.analytics:
            self.analytics[analytics_id] = ConsentAnalytics(
                id=analytics_id,
                organization_id=org_id,
                banner_id=banner_id,
                date=date
            )
        
        analytics = self.analytics[analytics_id]
        
        if interaction_type == "impression":
            analytics.impressions += 1
        elif interaction_type == "accept":
            analytics.accepts += 1
        elif interaction_type == "reject":
            analytics.rejects += 1
        elif interaction_type == "customize":
            analytics.customizes += 1
        elif interaction_type == "ignore":
            analytics.ignores += 1
        
        if country:
            analytics.country_breakdown[country] = analytics.country_breakdown.get(country, 0) + 1
        if device:
            analytics.device_breakdown[device] = analytics.device_breakdown.get(device, 0) + 1
    
    def get_analytics(self, org_id: str, start_date: str, end_date: str, 
                     banner_id: Optional[str] = None) -> List[ConsentAnalytics]:
        """Get analytics for a date range"""
        analytics = [a for a in self.analytics.values() 
                    if a.organization_id == org_id and start_date <= a.date <= end_date]
        if banner_id:
            analytics = [a for a in analytics if a.banner_id == banner_id]
        analytics.sort(key=lambda a: a.date)
        return analytics
    
    def get_analytics_summary(self, org_id: str, days: int = 30) -> Dict[str, Any]:
        """Get analytics summary for the last N days"""
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
        start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        analytics = self.get_analytics(org_id, start_date, end_date)
        
        total_impressions = sum(a.impressions for a in analytics)
        total_accepts = sum(a.accepts for a in analytics)
        total_rejects = sum(a.rejects for a in analytics)
        total_customizes = sum(a.customizes for a in analytics)
        
        accept_rate = (total_accepts / total_impressions * 100) if total_impressions > 0 else 0
        reject_rate = (total_rejects / total_impressions * 100) if total_impressions > 0 else 0
        
        return {
            "period_days": days,
            "total_impressions": total_impressions,
            "total_accepts": total_accepts,
            "total_rejects": total_rejects,
            "total_customizes": total_customizes,
            "accept_rate": round(accept_rate, 2),
            "reject_rate": round(reject_rate, 2),
            "daily_data": [a.model_dump() for a in analytics]
        }
    
    # ============== Audit Log Methods ==============
    
    def get_audit_logs(self, org_id: str, subject_id: Optional[str] = None,
                      action: Optional[AuditAction] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get audit logs with optional filters"""
        logs = [l for l in self.audit_logs if l["organization_id"] == org_id]
        
        if subject_id:
            logs = [l for l in logs if l.get("subject_id") == subject_id]
        if action:
            logs = [l for l in logs if l.get("action") == action.value]
        
        logs.sort(key=lambda l: l["created_at"], reverse=True)
        return logs[:limit]
    
    # ============== Webhook Methods ==============
    
    def create_webhook(self, org_id: str, data: WebhookCreate) -> Webhook:
        """Create a new webhook"""
        webhook = Webhook(
            id=self._generate_id(),
            organization_id=org_id,
            secret=secrets.token_urlsafe(32),
            created_at=datetime.utcnow(),
            **data.model_dump()
        )
        self.webhooks[webhook.id] = webhook
        return webhook
    
    def list_webhooks(self, org_id: str) -> List[Webhook]:
        """List webhooks for an organization"""
        return [w for w in self.webhooks.values() if w.organization_id == org_id]
    
    # ============== API Key Methods ==============
    
    def create_api_key(self, org_id: str, name: str, permissions: List[str] = None) -> Dict[str, Any]:
        """Create a new API key (returns the key only once!)"""
        full_key, key_hash, key_prefix = self._generate_api_key()
        
        api_key = {
            "id": self._generate_id(),
            "organization_id": org_id,
            "name": name,
            "key_hash": key_hash,
            "key_prefix": key_prefix,
            "permissions": permissions or ["read", "write"],
            "created_at": datetime.utcnow().isoformat(),
            "status": "active"
        }
        self.api_keys[api_key["id"]] = api_key
        
        return {
            "id": api_key["id"],
            "name": name,
            "key": full_key,  # Only returned once!
            "key_prefix": key_prefix,
            "permissions": api_key["permissions"]
        }
    
    def validate_api_key(self, key: str) -> Optional[Dict[str, Any]]:
        """Validate an API key and return its metadata"""
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        for api_key in self.api_keys.values():
            if api_key["key_hash"] == key_hash and api_key["status"] == "active":
                return api_key
        return None
    
    # ============== Export Methods ==============
    
    def export_subject_data(self, org_id: str, subject_id: str) -> Dict[str, Any]:
        """Export all data for a subject (for DSAR compliance)"""
        subject = self.get_subject(subject_id)
        if not subject or subject.organization_id != org_id:
            return {}
        
        consent_records = self.get_consent_records(org_id, subject_id=subject_id, limit=1000)
        audit_logs = self.get_audit_logs(org_id, subject_id=subject_id, limit=1000)
        
        return {
            "export_date": datetime.utcnow().isoformat(),
            "subject": subject.model_dump(),
            "consent_records": [r.model_dump() for r in consent_records],
            "audit_history": audit_logs
        }
    
    def delete_subject_data(self, org_id: str, subject_id: str) -> bool:
        """Delete all data for a subject (right to be forgotten)"""
        subject = self.get_subject(subject_id)
        if not subject or subject.organization_id != org_id:
            return False
        
        # Delete consent records
        records_to_delete = [r_id for r_id, r in self.consent_records.items() if r.subject_id == subject_id]
        for r_id in records_to_delete:
            del self.consent_records[r_id]
        
        # Anonymize subject
        subject.email = None
        subject.external_id = None
        subject.metadata = {}
        
        self._log_audit(org_id, AuditAction.DATA_DELETED, subject_id=subject_id)
        
        return True


# Create singleton instance
consent_service = ConsentService()
