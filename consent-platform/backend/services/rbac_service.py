"""
Role-Based Access Control (RBAC) Service

Enterprise-grade access control for the Consent Platform with:
- Hierarchical roles: Admin > Operator > Analyst > Auditor > Guest
- Temporary guest access with mandatory expiration
- Admin-controlled key lifecycle
- Full audit trail of all access
- Compliance-ready permission model

This is a core differentiator - competitors don't offer this level of control.
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple, Any
from pydantic import BaseModel, Field
from collections import defaultdict


# ============== Role Definitions ==============

class Role(str, Enum):
    """
    Platform roles with hierarchical permissions.
    Higher roles inherit permissions from lower roles.
    """
    SUPER_ADMIN = "super_admin"     # Platform owner - full control
    ADMIN = "admin"                  # Tenant admin - manage users, keys, settings
    OPERATOR = "operator"            # Day-to-day operations - manage consent, vendors
    ANALYST = "analyst"              # View analytics, reports, dashboards
    AUDITOR = "auditor"              # Read-only compliance access - legal/external
    GUEST = "guest"                  # Temporary read-only - expires, must be reset


class Permission(str, Enum):
    """
    Granular permissions for platform actions.
    Organized by resource type.
    """
    # Consent Management
    CONSENT_READ = "consent:read"
    CONSENT_WRITE = "consent:write"
    CONSENT_DELETE = "consent:delete"
    CONSENT_REVOKE = "consent:revoke"
    
    # Event Processing
    EVENTS_READ = "events:read"
    EVENTS_WRITE = "events:write"
    EVENTS_REPLAY = "events:replay"
    
    # Vendor Management
    VENDORS_READ = "vendors:read"
    VENDORS_WRITE = "vendors:write"
    VENDORS_DELETE = "vendors:delete"
    VENDORS_CERTIFY = "vendors:certify"
    
    # Audit & Compliance
    AUDIT_READ = "audit:read"
    AUDIT_EXPORT = "audit:export"
    AUDIT_ATTEST = "audit:attest"
    
    # Reports
    REPORTS_READ = "reports:read"
    REPORTS_GENERATE = "reports:generate"
    REPORTS_SCHEDULE = "reports:schedule"
    
    # User & Access Management
    USERS_READ = "users:read"
    USERS_WRITE = "users:write"
    USERS_DELETE = "users:delete"
    USERS_INVITE = "users:invite"
    
    # API Key Management
    KEYS_READ = "keys:read"
    KEYS_CREATE = "keys:create"
    KEYS_REVOKE = "keys:revoke"
    KEYS_ROTATE = "keys:rotate"
    
    # Webhooks
    WEBHOOKS_READ = "webhooks:read"
    WEBHOOKS_WRITE = "webhooks:write"
    WEBHOOKS_DELETE = "webhooks:delete"
    
    # Settings & Configuration
    SETTINGS_READ = "settings:read"
    SETTINGS_WRITE = "settings:write"
    
    # Security
    SECURITY_READ = "security:read"
    SECURITY_CONFIGURE = "security:configure"
    
    # Registry
    REGISTRY_READ = "registry:read"
    REGISTRY_WRITE = "registry:write"
    
    # Platform Admin (Super Admin only)
    PLATFORM_MANAGE = "platform:manage"
    TENANTS_MANAGE = "tenants:manage"


# Role to Permission mapping
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.SUPER_ADMIN: set(Permission),  # All permissions
    
    Role.ADMIN: {
        # Full tenant control except platform management
        Permission.CONSENT_READ, Permission.CONSENT_WRITE, Permission.CONSENT_DELETE, Permission.CONSENT_REVOKE,
        Permission.EVENTS_READ, Permission.EVENTS_WRITE, Permission.EVENTS_REPLAY,
        Permission.VENDORS_READ, Permission.VENDORS_WRITE, Permission.VENDORS_DELETE, Permission.VENDORS_CERTIFY,
        Permission.AUDIT_READ, Permission.AUDIT_EXPORT, Permission.AUDIT_ATTEST,
        Permission.REPORTS_READ, Permission.REPORTS_GENERATE, Permission.REPORTS_SCHEDULE,
        Permission.USERS_READ, Permission.USERS_WRITE, Permission.USERS_DELETE, Permission.USERS_INVITE,
        Permission.KEYS_READ, Permission.KEYS_CREATE, Permission.KEYS_REVOKE, Permission.KEYS_ROTATE,
        Permission.WEBHOOKS_READ, Permission.WEBHOOKS_WRITE, Permission.WEBHOOKS_DELETE,
        Permission.SETTINGS_READ, Permission.SETTINGS_WRITE,
        Permission.SECURITY_READ, Permission.SECURITY_CONFIGURE,
        Permission.REGISTRY_READ, Permission.REGISTRY_WRITE,
    },
    
    Role.OPERATOR: {
        # Operational tasks - no user management, limited security
        Permission.CONSENT_READ, Permission.CONSENT_WRITE, Permission.CONSENT_REVOKE,
        Permission.EVENTS_READ, Permission.EVENTS_WRITE,
        Permission.VENDORS_READ, Permission.VENDORS_WRITE,
        Permission.AUDIT_READ, Permission.AUDIT_EXPORT,
        Permission.REPORTS_READ, Permission.REPORTS_GENERATE,
        Permission.KEYS_READ,
        Permission.WEBHOOKS_READ, Permission.WEBHOOKS_WRITE,
        Permission.SETTINGS_READ,
        Permission.SECURITY_READ,
        Permission.REGISTRY_READ,
    },
    
    Role.ANALYST: {
        # Analytics and reporting - read-heavy
        Permission.CONSENT_READ,
        Permission.EVENTS_READ,
        Permission.VENDORS_READ,
        Permission.AUDIT_READ,
        Permission.REPORTS_READ, Permission.REPORTS_GENERATE,
        Permission.SECURITY_READ,
        Permission.REGISTRY_READ,
    },
    
    Role.AUDITOR: {
        # External auditor - read-only compliance focus
        Permission.CONSENT_READ,
        Permission.EVENTS_READ,
        Permission.VENDORS_READ,
        Permission.AUDIT_READ, Permission.AUDIT_EXPORT,
        Permission.REPORTS_READ,
        Permission.SECURITY_READ,
        Permission.REGISTRY_READ,
    },
    
    Role.GUEST: {
        # Temporary guest - minimal read access
        Permission.AUDIT_READ,
        Permission.REPORTS_READ,
        Permission.REGISTRY_READ,
    },
}


# ============== Data Models ==============

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class AccessKeyStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    PENDING_RESET = "pending_reset"


class User(BaseModel):
    """Platform user with role and permissions"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    email: str
    name: str
    role: Role
    status: UserStatus = UserStatus.ACTIVE
    
    # Custom permission overrides (additions or restrictions)
    additional_permissions: List[Permission] = []
    restricted_permissions: List[Permission] = []
    
    # Access control
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    last_login: Optional[datetime] = None
    login_count: int = 0
    
    # For guests
    is_guest: bool = False
    guest_expires_at: Optional[datetime] = None
    guest_purpose: Optional[str] = None  # "audit", "legal_review", "due_diligence"
    requires_admin_reset: bool = False
    
    # MFA (future)
    mfa_enabled: bool = False
    
    def get_effective_permissions(self) -> Set[Permission]:
        """Get all permissions for this user including overrides"""
        base_permissions = ROLE_PERMISSIONS.get(self.role, set()).copy()
        
        # Add additional permissions
        for perm in self.additional_permissions:
            base_permissions.add(perm)
        
        # Remove restricted permissions
        for perm in self.restricted_permissions:
            base_permissions.discard(perm)
        
        return base_permissions
    
    def has_permission(self, permission: Permission) -> bool:
        """Check if user has a specific permission"""
        return permission in self.get_effective_permissions()
    
    def is_expired(self) -> bool:
        """Check if guest access has expired"""
        if not self.is_guest or not self.guest_expires_at:
            return False
        return datetime.now(timezone.utc) > self.guest_expires_at


class AccessKey(BaseModel):
    """API access key with RBAC integration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    user_id: str
    name: str
    key_hash: str
    key_prefix: str  # First 8 chars for identification
    
    role: Role
    permissions: List[Permission] = []  # Explicit permissions (subset of role)
    
    status: AccessKeyStatus = AccessKeyStatus.ACTIVE
    
    # Lifecycle
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    use_count: int = 0
    
    # For guest/auditor keys
    requires_admin_reset: bool = False
    reset_by: Optional[str] = None
    reset_at: Optional[datetime] = None
    
    # Restrictions
    ip_allowlist: List[str] = []
    allowed_endpoints: List[str] = []  # Empty = all allowed
    rate_limit_override: Optional[int] = None
    
    def is_expired(self) -> bool:
        if self.status == AccessKeyStatus.EXPIRED:
            return True
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return True
        return False
    
    def get_effective_permissions(self) -> Set[Permission]:
        """Get permissions for this key (intersection of role and explicit)"""
        role_perms = ROLE_PERMISSIONS.get(self.role, set())
        if self.permissions:
            # Key has explicit permissions - use intersection
            return role_perms.intersection(set(self.permissions))
        return role_perms


class AccessAuditLog(BaseModel):
    """Immutable audit log for all access events"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Actor
    user_id: Optional[str] = None
    key_id: Optional[str] = None
    role: Optional[Role] = None
    
    # Action
    action: str  # "login", "api_call", "permission_check", "key_created", etc.
    resource: str  # "/consent", "/audit/export", etc.
    method: str  # "GET", "POST", etc.
    
    # Result
    allowed: bool
    permission_checked: Optional[Permission] = None
    denial_reason: Optional[str] = None
    
    # Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    
    # For compliance
    sensitive_data_accessed: bool = False
    export_generated: bool = False


class GuestInvitation(BaseModel):
    """Invitation for temporary guest access"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    
    # Invitee
    email: str
    name: str
    organization: Optional[str] = None
    
    # Access parameters
    purpose: str  # "audit", "legal_review", "due_diligence", "regulatory_inquiry"
    permissions: List[Permission] = []
    expires_in_hours: int = 24  # Default 24 hours
    
    # Status
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    accepted_at: Optional[datetime] = None
    user_id: Optional[str] = None  # Created when accepted
    
    # Security
    invitation_token_hash: str = ""
    max_uses: int = 1
    use_count: int = 0


# ============== RBAC Service ==============

class RBACService:
    """
    Centralized Role-Based Access Control service.
    
    Key differentiators:
    1. Hierarchical roles with granular permissions
    2. Temporary guest access with mandatory expiration
    3. Admin-controlled key lifecycle (no self-service for guests)
    4. Full audit trail of every access
    5. Compliance-ready permission model
    """
    
    def __init__(self):
        self._users: Dict[str, User] = {}
        self._users_by_email: Dict[str, str] = {}  # email -> user_id
        self._keys: Dict[str, AccessKey] = {}
        self._audit_logs: List[AccessAuditLog] = []
        self._invitations: Dict[str, GuestInvitation] = {}
        self._max_audit_logs = 100000
        
        # Initialize with demo data
        self._init_demo_data()
    
    def _init_demo_data(self):
        """Create demo users for testing"""
        demo_tenant = "demo-tenant"
        
        # Super admin
        self.create_user(
            tenant_id=demo_tenant,
            email="admin@example.com",
            name="Platform Admin",
            role=Role.SUPER_ADMIN,
            created_by="system"
        )
        
        # Regular admin
        self.create_user(
            tenant_id=demo_tenant,
            email="tenant-admin@example.com",
            name="Tenant Administrator",
            role=Role.ADMIN,
            created_by="system"
        )
        
        # Operator
        self.create_user(
            tenant_id=demo_tenant,
            email="operator@example.com",
            name="Operations User",
            role=Role.OPERATOR,
            created_by="system"
        )
    
    # ============== User Management ==============
    
    def create_user(
        self,
        tenant_id: str,
        email: str,
        name: str,
        role: Role,
        created_by: str,
        additional_permissions: List[Permission] = None,
        restricted_permissions: List[Permission] = None
    ) -> User:
        """Create a new platform user"""
        if email in self._users_by_email:
            raise ValueError(f"User with email {email} already exists")
        
        user = User(
            tenant_id=tenant_id,
            email=email,
            name=name,
            role=role,
            created_by=created_by,
            additional_permissions=additional_permissions or [],
            restricted_permissions=restricted_permissions or []
        )
        
        self._users[user.id] = user
        self._users_by_email[email] = user.id
        
        self._log_access(
            tenant_id=tenant_id,
            user_id=created_by,
            action="user_created",
            resource=f"/users/{user.id}",
            method="POST",
            allowed=True
        )
        
        return user
    
    def create_guest_user(
        self,
        tenant_id: str,
        email: str,
        name: str,
        purpose: str,
        expires_in_hours: int,
        created_by: str,
        permissions: List[Permission] = None
    ) -> User:
        """
        Create a temporary guest user.
        
        Guests:
        - Have minimal read-only permissions by default
        - MUST have an expiration time
        - MUST be reset by an admin after expiration
        - Cannot self-extend their access
        """
        if expires_in_hours > 168:  # Max 1 week
            raise ValueError("Guest access cannot exceed 168 hours (1 week)")
        
        if expires_in_hours < 1:
            raise ValueError("Guest access must be at least 1 hour")
        
        user = User(
            tenant_id=tenant_id,
            email=email,
            name=name,
            role=Role.GUEST,
            created_by=created_by,
            is_guest=True,
            guest_expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
            guest_purpose=purpose,
            requires_admin_reset=True,
            additional_permissions=permissions or []
        )
        
        self._users[user.id] = user
        self._users_by_email[email] = user.id
        
        self._log_access(
            tenant_id=tenant_id,
            user_id=created_by,
            action="guest_created",
            resource=f"/users/{user.id}",
            method="POST",
            allowed=True
        )
        
        return user
    
    def reset_guest_access(
        self,
        user_id: str,
        admin_user_id: str,
        new_expires_in_hours: int
    ) -> User:
        """
        Admin resets expired guest access.
        Only admins can do this - guests cannot self-extend.
        """
        admin = self._users.get(admin_user_id)
        if not admin or admin.role not in [Role.SUPER_ADMIN, Role.ADMIN]:
            raise PermissionError("Only admins can reset guest access")
        
        user = self._users.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        if not user.is_guest:
            raise ValueError("User is not a guest")
        
        user.guest_expires_at = datetime.now(timezone.utc) + timedelta(hours=new_expires_in_hours)
        user.status = UserStatus.ACTIVE
        
        self._log_access(
            tenant_id=user.tenant_id,
            user_id=admin_user_id,
            action="guest_access_reset",
            resource=f"/users/{user_id}",
            method="POST",
            allowed=True
        )
        
        return user
    
    def get_user(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        user_id = self._users_by_email.get(email)
        if user_id:
            return self._users.get(user_id)
        return None
    
    def list_users(self, tenant_id: str, include_expired: bool = False) -> List[User]:
        users = [u for u in self._users.values() if u.tenant_id == tenant_id]
        if not include_expired:
            users = [u for u in users if not u.is_expired()]
        return users
    
    def suspend_user(self, user_id: str, suspended_by: str) -> User:
        user = self._users.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        user.status = UserStatus.SUSPENDED
        
        # Revoke all their keys
        for key in self._keys.values():
            if key.user_id == user_id:
                key.status = AccessKeyStatus.REVOKED
        
        self._log_access(
            tenant_id=user.tenant_id,
            user_id=suspended_by,
            action="user_suspended",
            resource=f"/users/{user_id}",
            method="POST",
            allowed=True
        )
        
        return user
    
    # ============== Access Key Management ==============
    
    def create_access_key(
        self,
        tenant_id: str,
        user_id: str,
        name: str,
        created_by: str,
        role: Optional[Role] = None,
        permissions: List[Permission] = None,
        expires_in_hours: Optional[int] = None,
        ip_allowlist: List[str] = None
    ) -> Tuple[str, AccessKey]:
        """
        Create an API access key for a user.
        
        Returns: (raw_key, AccessKey)
        The raw key is only shown once!
        """
        user = self._users.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Generate secure key
        raw_key = f"csp_{'live' if not user.is_guest else 'guest'}_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        key_prefix = raw_key[:16]
        
        # Use user's role if not specified
        key_role = role or user.role
        
        # For guests, always set expiration
        expires_at = None
        if expires_in_hours:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        elif user.is_guest:
            # Guest keys expire with the user
            expires_at = user.guest_expires_at
        
        key = AccessKey(
            tenant_id=tenant_id,
            user_id=user_id,
            name=name,
            key_hash=key_hash,
            key_prefix=key_prefix,
            role=key_role,
            permissions=permissions or [],
            created_by=created_by,
            expires_at=expires_at,
            requires_admin_reset=user.is_guest,
            ip_allowlist=ip_allowlist or []
        )
        
        self._keys[key.id] = key
        
        self._log_access(
            tenant_id=tenant_id,
            user_id=created_by,
            action="key_created",
            resource=f"/keys/{key.id}",
            method="POST",
            allowed=True
        )
        
        return raw_key, key
    
    def validate_key(self, raw_key: str) -> Tuple[bool, Optional[AccessKey], Optional[str]]:
        """
        Validate an API key and return access info.
        
        Returns: (valid, AccessKey or None, error_message or None)
        """
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        
        for key in self._keys.values():
            if key.key_hash == key_hash:
                # Found the key - check validity
                if key.status == AccessKeyStatus.REVOKED:
                    return False, None, "Key has been revoked"
                
                if key.is_expired():
                    key.status = AccessKeyStatus.EXPIRED
                    if key.requires_admin_reset:
                        return False, None, "Key expired - contact admin for reset"
                    return False, None, "Key has expired"
                
                if key.status == AccessKeyStatus.PENDING_RESET:
                    return False, None, "Key requires admin reset"
                
                # Update usage
                key.last_used_at = datetime.now(timezone.utc)
                key.use_count += 1
                
                return True, key, None
        
        return False, None, "Invalid key"
    
    def revoke_key(self, key_id: str, revoked_by: str) -> AccessKey:
        key = self._keys.get(key_id)
        if not key:
            raise ValueError("Key not found")
        
        key.status = AccessKeyStatus.REVOKED
        
        self._log_access(
            tenant_id=key.tenant_id,
            user_id=revoked_by,
            action="key_revoked",
            resource=f"/keys/{key_id}",
            method="DELETE",
            allowed=True
        )
        
        return key
    
    def reset_key(
        self,
        key_id: str,
        admin_user_id: str,
        new_expires_in_hours: int
    ) -> Tuple[str, AccessKey]:
        """
        Admin resets an expired key.
        Creates a new key and revokes the old one.
        """
        admin = self._users.get(admin_user_id)
        if not admin or admin.role not in [Role.SUPER_ADMIN, Role.ADMIN]:
            raise PermissionError("Only admins can reset keys")
        
        old_key = self._keys.get(key_id)
        if not old_key:
            raise ValueError("Key not found")
        
        # Revoke old key
        old_key.status = AccessKeyStatus.REVOKED
        
        # Create new key with same parameters
        return self.create_access_key(
            tenant_id=old_key.tenant_id,
            user_id=old_key.user_id,
            name=f"{old_key.name} (reset)",
            created_by=admin_user_id,
            role=old_key.role,
            permissions=old_key.permissions,
            expires_in_hours=new_expires_in_hours,
            ip_allowlist=old_key.ip_allowlist
        )
    
    def list_keys(self, tenant_id: str, user_id: Optional[str] = None) -> List[AccessKey]:
        keys = [k for k in self._keys.values() if k.tenant_id == tenant_id]
        if user_id:
            keys = [k for k in keys if k.user_id == user_id]
        return keys
    
    # ============== Permission Checking ==============
    
    def check_permission(
        self,
        key_or_user_id: str,
        permission: Permission,
        resource: str = "",
        method: str = "",
        ip_address: Optional[str] = None,
        is_key: bool = True
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if a key or user has a specific permission.
        
        Returns: (allowed, denial_reason or None)
        """
        if is_key:
            key = self._keys.get(key_or_user_id)
            if not key:
                return False, "Key not found"
            
            # Check IP allowlist
            if key.ip_allowlist and ip_address:
                if ip_address not in key.ip_allowlist:
                    self._log_access(
                        tenant_id=key.tenant_id,
                        key_id=key.id,
                        role=key.role,
                        action="permission_check",
                        resource=resource,
                        method=method,
                        allowed=False,
                        permission_checked=permission,
                        denial_reason="IP not in allowlist",
                        ip_address=ip_address
                    )
                    return False, "IP not in allowlist"
            
            # Check endpoint restrictions
            if key.allowed_endpoints:
                if not any(resource.startswith(ep) for ep in key.allowed_endpoints):
                    self._log_access(
                        tenant_id=key.tenant_id,
                        key_id=key.id,
                        role=key.role,
                        action="permission_check",
                        resource=resource,
                        method=method,
                        allowed=False,
                        permission_checked=permission,
                        denial_reason="Endpoint not allowed",
                        ip_address=ip_address
                    )
                    return False, "Endpoint not allowed for this key"
            
            # Check permission
            effective_permissions = key.get_effective_permissions()
            allowed = permission in effective_permissions
            
            self._log_access(
                tenant_id=key.tenant_id,
                key_id=key.id,
                role=key.role,
                action="permission_check",
                resource=resource,
                method=method,
                allowed=allowed,
                permission_checked=permission,
                denial_reason=None if allowed else "Permission denied",
                ip_address=ip_address
            )
            
            return allowed, None if allowed else f"Permission {permission.value} denied"
        
        else:
            user = self._users.get(key_or_user_id)
            if not user:
                return False, "User not found"
            
            if user.is_expired():
                return False, "User access has expired"
            
            if user.status != UserStatus.ACTIVE:
                return False, f"User status is {user.status.value}"
            
            allowed = user.has_permission(permission)
            
            self._log_access(
                tenant_id=user.tenant_id,
                user_id=user.id,
                role=user.role,
                action="permission_check",
                resource=resource,
                method=method,
                allowed=allowed,
                permission_checked=permission,
                denial_reason=None if allowed else "Permission denied"
            )
            
            return allowed, None if allowed else f"Permission {permission.value} denied"
    
    def require_permission(
        self,
        key_id: str,
        permission: Permission,
        resource: str = "",
        method: str = "",
        ip_address: Optional[str] = None
    ):
        """Check permission and raise if denied"""
        allowed, reason = self.check_permission(
            key_id, permission, resource, method, ip_address
        )
        if not allowed:
            raise PermissionError(reason)
    
    # ============== Guest Invitations ==============
    
    def create_guest_invitation(
        self,
        tenant_id: str,
        email: str,
        name: str,
        purpose: str,
        created_by: str,
        expires_in_hours: int = 24,
        permissions: List[Permission] = None,
        organization: Optional[str] = None
    ) -> Tuple[str, GuestInvitation]:
        """
        Create an invitation for temporary guest access.
        
        Returns: (invitation_token, GuestInvitation)
        """
        # Validate creator is admin
        creator = self._users.get(created_by)
        if not creator or creator.role not in [Role.SUPER_ADMIN, Role.ADMIN]:
            raise PermissionError("Only admins can invite guests")
        
        # Generate invitation token
        invitation_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(invitation_token.encode()).hexdigest()
        
        invitation = GuestInvitation(
            tenant_id=tenant_id,
            email=email,
            name=name,
            organization=organization,
            purpose=purpose,
            permissions=permissions or list(ROLE_PERMISSIONS[Role.GUEST]),
            expires_in_hours=expires_in_hours,
            created_by=created_by,
            invitation_token_hash=token_hash
        )
        
        self._invitations[invitation.id] = invitation
        
        self._log_access(
            tenant_id=tenant_id,
            user_id=created_by,
            action="guest_invitation_created",
            resource=f"/invitations/{invitation.id}",
            method="POST",
            allowed=True
        )
        
        return invitation_token, invitation
    
    def accept_invitation(
        self,
        invitation_token: str
    ) -> Tuple[User, str, AccessKey]:
        """
        Accept a guest invitation and create user + key.
        
        Returns: (User, raw_api_key, AccessKey)
        """
        token_hash = hashlib.sha256(invitation_token.encode()).hexdigest()
        
        invitation = None
        for inv in self._invitations.values():
            if inv.invitation_token_hash == token_hash:
                invitation = inv
                break
        
        if not invitation:
            raise ValueError("Invalid invitation")
        
        if invitation.use_count >= invitation.max_uses:
            raise ValueError("Invitation already used")
        
        if invitation.accepted_at:
            raise ValueError("Invitation already accepted")
        
        # Create guest user
        user = self.create_guest_user(
            tenant_id=invitation.tenant_id,
            email=invitation.email,
            name=invitation.name,
            purpose=invitation.purpose,
            expires_in_hours=invitation.expires_in_hours,
            created_by=invitation.created_by,
            permissions=invitation.permissions
        )
        
        # Create API key for guest
        raw_key, key = self.create_access_key(
            tenant_id=invitation.tenant_id,
            user_id=user.id,
            name=f"Guest key - {invitation.purpose}",
            created_by=invitation.created_by,
            expires_in_hours=invitation.expires_in_hours
        )
        
        invitation.accepted_at = datetime.now(timezone.utc)
        invitation.user_id = user.id
        invitation.use_count += 1
        
        return user, raw_key, key
    
    # ============== Audit Logging ==============
    
    def _log_access(
        self,
        tenant_id: str,
        action: str,
        resource: str,
        method: str,
        allowed: bool,
        user_id: Optional[str] = None,
        key_id: Optional[str] = None,
        role: Optional[Role] = None,
        permission_checked: Optional[Permission] = None,
        denial_reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        sensitive_data_accessed: bool = False,
        export_generated: bool = False
    ):
        """Log an access event for audit"""
        log = AccessAuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            key_id=key_id,
            role=role,
            action=action,
            resource=resource,
            method=method,
            allowed=allowed,
            permission_checked=permission_checked,
            denial_reason=denial_reason,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            sensitive_data_accessed=sensitive_data_accessed,
            export_generated=export_generated
        )
        
        self._audit_logs.append(log)
        
        # Trim old logs
        if len(self._audit_logs) > self._max_audit_logs:
            self._audit_logs = self._audit_logs[-self._max_audit_logs:]
    
    def get_audit_logs(
        self,
        tenant_id: str,
        user_id: Optional[str] = None,
        key_id: Optional[str] = None,
        action: Optional[str] = None,
        allowed: Optional[bool] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[AccessAuditLog]:
        """Query audit logs with filters"""
        logs = [l for l in self._audit_logs if l.tenant_id == tenant_id]
        
        if user_id:
            logs = [l for l in logs if l.user_id == user_id]
        if key_id:
            logs = [l for l in logs if l.key_id == key_id]
        if action:
            logs = [l for l in logs if l.action == action]
        if allowed is not None:
            logs = [l for l in logs if l.allowed == allowed]
        if start_time:
            logs = [l for l in logs if l.timestamp >= start_time]
        if end_time:
            logs = [l for l in logs if l.timestamp <= end_time]
        
        # Sort by timestamp descending
        logs.sort(key=lambda l: l.timestamp, reverse=True)
        
        return logs[:limit]
    
    def get_access_summary(self, tenant_id: str) -> Dict[str, Any]:
        """Get summary of access patterns for a tenant"""
        logs = [l for l in self._audit_logs if l.tenant_id == tenant_id]
        
        total = len(logs)
        allowed = sum(1 for l in logs if l.allowed)
        denied = total - allowed
        
        by_role = defaultdict(int)
        by_action = defaultdict(int)
        denied_permissions = defaultdict(int)
        
        for log in logs:
            if log.role:
                by_role[log.role.value] += 1
            by_action[log.action] += 1
            if not log.allowed and log.permission_checked:
                denied_permissions[log.permission_checked.value] += 1
        
        return {
            "total_requests": total,
            "allowed": allowed,
            "denied": denied,
            "denial_rate": denied / total if total > 0 else 0,
            "by_role": dict(by_role),
            "by_action": dict(by_action),
            "top_denied_permissions": dict(denied_permissions)
        }


# Global instance
rbac_service = RBACService()
