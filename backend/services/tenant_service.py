"""
Tenant Management Service
Multi-tenant SaaS support with tenant isolation and onboarding.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from enum import Enum
import secrets
import uuid
import hashlib


# ============== Enums ==============

class TenantPlan(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class TenantStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class ApiKeyScope(str, Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    TOKEN_ISSUE = "token:issue"
    TOKEN_REVOKE = "token:revoke"
    POLICY_READ = "policy:read"
    POLICY_WRITE = "policy:write"


# ============== Plan Limits ==============

PLAN_LIMITS = {
    TenantPlan.FREE: {
        "monthly_token_limit": 1000,
        "monthly_api_calls": 10000,
        "max_purposes": 5,
        "max_vendors": 3,
        "max_policies": 2,
        "max_api_keys": 2,
        "data_retention_days": 30,
        "features": ["basic_consent", "basic_reporting"]
    },
    TenantPlan.STARTER: {
        "monthly_token_limit": 10000,
        "monthly_api_calls": 100000,
        "max_purposes": 20,
        "max_vendors": 10,
        "max_policies": 10,
        "max_api_keys": 5,
        "data_retention_days": 90,
        "features": ["basic_consent", "basic_reporting", "custom_branding", "webhooks"]
    },
    TenantPlan.PROFESSIONAL: {
        "monthly_token_limit": 100000,
        "monthly_api_calls": 1000000,
        "max_purposes": 100,
        "max_vendors": 50,
        "max_policies": 50,
        "max_api_keys": 20,
        "data_retention_days": 365,
        "features": ["basic_consent", "basic_reporting", "custom_branding", "webhooks",
                    "advanced_analytics", "custom_policies", "multi_jurisdiction"]
    },
    TenantPlan.ENTERPRISE: {
        "monthly_token_limit": -1,  # Unlimited
        "monthly_api_calls": -1,    # Unlimited
        "max_purposes": -1,         # Unlimited
        "max_vendors": -1,          # Unlimited
        "max_policies": -1,         # Unlimited
        "max_api_keys": -1,         # Unlimited
        "data_retention_days": -1,  # Custom
        "features": ["all"]
    }
}


# ============== Models ==============

class TenantCreate(BaseModel):
    name: str
    domain: str
    contact_email: str
    plan: TenantPlan = TenantPlan.FREE
    company_name: Optional[str] = None
    billing_email: Optional[str] = None


class Tenant(BaseModel):
    id: str
    name: str
    domain: str
    slug: str                       # URL-safe identifier
    contact_email: str
    company_name: Optional[str] = None
    billing_email: Optional[str] = None
    
    # Plan and status
    plan: TenantPlan = TenantPlan.FREE
    status: TenantStatus = TenantStatus.PENDING
    
    # Settings
    settings: Dict[str, Any] = {}
    branding: Dict[str, Any] = {}   # Custom branding (logo, colors, etc.)
    
    # Usage tracking
    current_month_tokens: int = 0
    current_month_api_calls: int = 0
    usage_reset_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    activated_at: Optional[datetime] = None
    suspended_at: Optional[datetime] = None
    
    # Metadata
    metadata: Dict[str, Any] = {}


class TenantApiKey(BaseModel):
    id: str
    tenant_id: str
    name: str
    key_prefix: str                 # First 8 chars for display
    key_hash: str                   # SHA-256 hash of the full key
    scopes: List[ApiKeyScope] = [ApiKeyScope.READ]
    
    # Restrictions
    allowed_ips: List[str] = []
    allowed_origins: List[str] = []
    rate_limit_per_minute: int = 100
    
    # Status
    status: str = "active"          # active, revoked
    last_used_at: Optional[datetime] = None
    use_count: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None


class TenantUser(BaseModel):
    id: str
    tenant_id: str
    email: str
    name: str
    role: str = "member"            # owner, admin, member, viewer
    
    # Authentication
    password_hash: Optional[str] = None
    mfa_enabled: bool = False
    
    # Status
    status: str = "active"          # active, invited, disabled
    last_login_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    invited_at: Optional[datetime] = None
    activated_at: Optional[datetime] = None


class TenantUsageStats(BaseModel):
    tenant_id: str
    period: str                     # e.g., "2024-01"
    tokens_issued: int = 0
    tokens_validated: int = 0
    tokens_revoked: int = 0
    api_calls: int = 0
    consent_records: int = 0
    policy_evaluations: int = 0
    unique_subjects: int = 0


# ============== Tenant Service ==============

class TenantService:
    """
    Service for managing tenants in the multi-tenant SaaS platform.
    Handles tenant onboarding, API keys, usage tracking, and isolation.
    """
    
    def __init__(self):
        self.tenants: Dict[str, Tenant] = {}
        self.api_keys: Dict[str, TenantApiKey] = {}
        self.key_lookup: Dict[str, str] = {}  # key_hash -> api_key_id
        self.users: Dict[str, TenantUser] = {}
        self.usage_stats: Dict[str, TenantUsageStats] = {}
        
        # Initialize demo tenant
        self._init_demo_tenant()
    
    def _generate_id(self) -> str:
        return str(uuid.uuid4())
    
    def _generate_slug(self, name: str) -> str:
        """Generate a URL-safe slug from name"""
        import re
        slug = name.lower()
        slug = re.sub(r'[^a-z0-9]+', '-', slug)
        slug = slug.strip('-')
        # Add random suffix for uniqueness
        slug = f"{slug}-{secrets.token_hex(4)}"
        return slug
    
    def _hash_key(self, key: str) -> str:
        """Hash an API key"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    def _generate_api_key(self) -> tuple[str, str, str]:
        """Generate an API key: (full_key, key_hash, key_prefix)"""
        full_key = f"csk_{secrets.token_urlsafe(32)}"
        key_hash = self._hash_key(full_key)
        key_prefix = full_key[:12]
        return full_key, key_hash, key_prefix
    
    def _init_demo_tenant(self):
        """Initialize demo tenant for testing"""
        demo_tenant = Tenant(
            id="demo-tenant",
            name="Demo Company",
            domain="demo.example.com",
            slug="demo-company",
            contact_email="admin@demo.example.com",
            company_name="Demo Company Inc.",
            plan=TenantPlan.PROFESSIONAL,
            status=TenantStatus.ACTIVE,
            activated_at=datetime.utcnow(),
            settings={
                "default_token_expiry": 3600,
                "require_consent_proof": True,
                "audit_retention_days": 365
            },
            branding={
                "primary_color": "#3B82F6",
                "logo_url": "https://demo.example.com/logo.png",
                "company_name": "Demo Company"
            }
        )
        self.tenants[demo_tenant.id] = demo_tenant
        
        # Create demo API key
        full_key, key_hash, key_prefix = self._generate_api_key()
        demo_key = TenantApiKey(
            id="demo-api-key",
            tenant_id="demo-tenant",
            name="Demo API Key",
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=[ApiKeyScope.READ, ApiKeyScope.WRITE, ApiKeyScope.TOKEN_ISSUE],
            status="active"
        )
        self.api_keys[demo_key.id] = demo_key
        self.key_lookup[key_hash] = demo_key.id
        
        # Create demo user
        demo_user = TenantUser(
            id="demo-user",
            tenant_id="demo-tenant",
            email="admin@demo.example.com",
            name="Demo Admin",
            role="owner",
            status="active",
            activated_at=datetime.utcnow()
        )
        self.users[demo_user.id] = demo_user
    
    # ============== Tenant Management ==============
    
    def create_tenant(self, data: TenantCreate) -> tuple[Tenant, str]:
        """
        Create a new tenant. Returns (tenant, api_key).
        The API key is only returned once during creation.
        """
        tenant_id = self._generate_id()
        slug = self._generate_slug(data.name)
        
        tenant = Tenant(
            id=tenant_id,
            name=data.name,
            domain=data.domain,
            slug=slug,
            contact_email=data.contact_email,
            company_name=data.company_name,
            billing_email=data.billing_email or data.contact_email,
            plan=data.plan,
            status=TenantStatus.PENDING,
            settings={
                "default_token_expiry": 3600,
                "require_consent_proof": True
            }
        )
        self.tenants[tenant_id] = tenant
        
        # Create initial API key
        full_key, _ = self.create_api_key(
            tenant_id=tenant_id,
            name="Initial API Key",
            scopes=[ApiKeyScope.READ, ApiKeyScope.WRITE, ApiKeyScope.TOKEN_ISSUE]
        )
        
        return tenant, full_key
    
    def get_tenant(self, tenant_id: str) -> Optional[Tenant]:
        """Get a tenant by ID"""
        return self.tenants.get(tenant_id)
    
    def get_tenant_by_slug(self, slug: str) -> Optional[Tenant]:
        """Get a tenant by slug"""
        for tenant in self.tenants.values():
            if tenant.slug == slug:
                return tenant
        return None
    
    def get_tenant_by_domain(self, domain: str) -> Optional[Tenant]:
        """Get a tenant by domain"""
        for tenant in self.tenants.values():
            if tenant.domain == domain:
                return tenant
        return None
    
    def list_tenants(self, status: TenantStatus = None, 
                    plan: TenantPlan = None) -> List[Tenant]:
        """List all tenants"""
        tenants = list(self.tenants.values())
        
        if status:
            tenants = [t for t in tenants if t.status == status]
        if plan:
            tenants = [t for t in tenants if t.plan == plan]
        
        return tenants
    
    def update_tenant(self, tenant_id: str, updates: Dict[str, Any]) -> Optional[Tenant]:
        """Update a tenant"""
        tenant = self.tenants.get(tenant_id)
        if tenant:
            for key, value in updates.items():
                if hasattr(tenant, key) and key not in ['id', 'created_at']:
                    setattr(tenant, key, value)
            tenant.updated_at = datetime.utcnow()
        return tenant
    
    def activate_tenant(self, tenant_id: str) -> bool:
        """Activate a tenant"""
        tenant = self.tenants.get(tenant_id)
        if tenant:
            tenant.status = TenantStatus.ACTIVE
            tenant.activated_at = datetime.utcnow()
            tenant.updated_at = datetime.utcnow()
            return True
        return False
    
    def suspend_tenant(self, tenant_id: str, reason: str = None) -> bool:
        """Suspend a tenant"""
        tenant = self.tenants.get(tenant_id)
        if tenant:
            tenant.status = TenantStatus.SUSPENDED
            tenant.suspended_at = datetime.utcnow()
            tenant.updated_at = datetime.utcnow()
            tenant.metadata["suspension_reason"] = reason
            return True
        return False
    
    def upgrade_plan(self, tenant_id: str, new_plan: TenantPlan) -> bool:
        """Upgrade a tenant's plan"""
        tenant = self.tenants.get(tenant_id)
        if tenant:
            tenant.plan = new_plan
            tenant.updated_at = datetime.utcnow()
            return True
        return False
    
    def get_plan_limits(self, tenant_id: str) -> Dict[str, Any]:
        """Get the plan limits for a tenant"""
        tenant = self.tenants.get(tenant_id)
        if not tenant:
            return {}
        return PLAN_LIMITS.get(tenant.plan, {})
    
    def check_limit(self, tenant_id: str, limit_type: str, current_value: int = None) -> Dict[str, Any]:
        """Check if a tenant has exceeded a limit"""
        tenant = self.tenants.get(tenant_id)
        if not tenant:
            return {"allowed": False, "reason": "Tenant not found"}
        
        limits = PLAN_LIMITS.get(tenant.plan, {})
        limit_value = limits.get(limit_type, 0)
        
        if limit_value == -1:  # Unlimited
            return {"allowed": True, "limit": "unlimited"}
        
        if current_value is None:
            if limit_type == "monthly_token_limit":
                current_value = tenant.current_month_tokens
            elif limit_type == "monthly_api_calls":
                current_value = tenant.current_month_api_calls
            else:
                current_value = 0
        
        if current_value >= limit_value:
            return {
                "allowed": False,
                "reason": f"Limit exceeded: {current_value}/{limit_value}",
                "limit": limit_value,
                "current": current_value
            }
        
        return {
            "allowed": True,
            "limit": limit_value,
            "current": current_value,
            "remaining": limit_value - current_value
        }
    
    # ============== API Key Management ==============
    
    def create_api_key(self, tenant_id: str, name: str, 
                      scopes: List[ApiKeyScope] = None,
                      expires_in_days: int = None) -> tuple[str, TenantApiKey]:
        """
        Create a new API key for a tenant.
        Returns (full_key, key_metadata). Full key is only returned once!
        """
        # Check limit
        existing_keys = [k for k in self.api_keys.values() 
                       if k.tenant_id == tenant_id and k.status == "active"]
        limits = self.get_plan_limits(tenant_id)
        max_keys = limits.get("max_api_keys", 2)
        
        if max_keys != -1 and len(existing_keys) >= max_keys:
            raise ValueError(f"API key limit reached ({max_keys})")
        
        full_key, key_hash, key_prefix = self._generate_api_key()
        
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        api_key = TenantApiKey(
            id=self._generate_id(),
            tenant_id=tenant_id,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes or [ApiKeyScope.READ],
            expires_at=expires_at
        )
        
        self.api_keys[api_key.id] = api_key
        self.key_lookup[key_hash] = api_key.id
        
        return full_key, api_key
    
    def validate_api_key(self, key: str) -> Optional[TenantApiKey]:
        """Validate an API key and return its metadata"""
        key_hash = self._hash_key(key)
        key_id = self.key_lookup.get(key_hash)
        
        if not key_id:
            return None
        
        api_key = self.api_keys.get(key_id)
        if not api_key:
            return None
        
        # Check status
        if api_key.status != "active":
            return None
        
        # Check expiration
        if api_key.expires_at and datetime.utcnow() > api_key.expires_at:
            api_key.status = "expired"
            return None
        
        # Update usage
        api_key.last_used_at = datetime.utcnow()
        api_key.use_count += 1
        
        return api_key
    
    def revoke_api_key(self, key_id: str) -> bool:
        """Revoke an API key"""
        api_key = self.api_keys.get(key_id)
        if api_key:
            api_key.status = "revoked"
            api_key.revoked_at = datetime.utcnow()
            return True
        return False
    
    def list_api_keys(self, tenant_id: str, include_revoked: bool = False) -> List[TenantApiKey]:
        """List API keys for a tenant"""
        keys = [k for k in self.api_keys.values() if k.tenant_id == tenant_id]
        if not include_revoked:
            keys = [k for k in keys if k.status == "active"]
        return keys
    
    def check_api_key_scope(self, api_key: TenantApiKey, required_scope: ApiKeyScope) -> bool:
        """Check if an API key has a required scope"""
        if ApiKeyScope.ADMIN in api_key.scopes:
            return True  # Admin has all permissions
        return required_scope in api_key.scopes
    
    # ============== Usage Tracking ==============
    
    def record_token_issued(self, tenant_id: str):
        """Record that a token was issued"""
        tenant = self.tenants.get(tenant_id)
        if tenant:
            self._check_usage_reset(tenant)
            tenant.current_month_tokens += 1
    
    def record_api_call(self, tenant_id: str):
        """Record an API call"""
        tenant = self.tenants.get(tenant_id)
        if tenant:
            self._check_usage_reset(tenant)
            tenant.current_month_api_calls += 1
    
    def _check_usage_reset(self, tenant: Tenant):
        """Check if usage counters need to be reset"""
        now = datetime.utcnow()
        if tenant.usage_reset_date.month != now.month or tenant.usage_reset_date.year != now.year:
            tenant.current_month_tokens = 0
            tenant.current_month_api_calls = 0
            tenant.usage_reset_date = now
    
    def get_usage_stats(self, tenant_id: str) -> Dict[str, Any]:
        """Get usage statistics for a tenant"""
        tenant = self.tenants.get(tenant_id)
        if not tenant:
            return {}
        
        limits = self.get_plan_limits(tenant_id)
        
        return {
            "tenant_id": tenant_id,
            "plan": tenant.plan.value,
            "current_month": {
                "tokens_issued": tenant.current_month_tokens,
                "api_calls": tenant.current_month_api_calls,
                "reset_date": tenant.usage_reset_date.isoformat()
            },
            "limits": {
                "monthly_tokens": limits.get("monthly_token_limit"),
                "monthly_api_calls": limits.get("monthly_api_calls")
            },
            "utilization": {
                "tokens_pct": (tenant.current_month_tokens / limits.get("monthly_token_limit", 1) * 100)
                             if limits.get("monthly_token_limit", -1) > 0 else 0,
                "api_calls_pct": (tenant.current_month_api_calls / limits.get("monthly_api_calls", 1) * 100)
                                if limits.get("monthly_api_calls", -1) > 0 else 0
            }
        }
    
    # ============== User Management ==============
    
    def create_user(self, tenant_id: str, email: str, name: str, 
                   role: str = "member") -> TenantUser:
        """Create a new user for a tenant"""
        user = TenantUser(
            id=self._generate_id(),
            tenant_id=tenant_id,
            email=email,
            name=name,
            role=role,
            status="invited",
            invited_at=datetime.utcnow()
        )
        self.users[user.id] = user
        return user
    
    def get_user(self, user_id: str) -> Optional[TenantUser]:
        """Get a user by ID"""
        return self.users.get(user_id)
    
    def list_users(self, tenant_id: str) -> List[TenantUser]:
        """List users for a tenant"""
        return [u for u in self.users.values() if u.tenant_id == tenant_id]
    
    def update_user_role(self, user_id: str, role: str) -> bool:
        """Update a user's role"""
        user = self.users.get(user_id)
        if user:
            user.role = role
            return True
        return False


# Create singleton instance
tenant_service = TenantService()
