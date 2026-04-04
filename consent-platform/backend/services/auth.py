"""
Authentication & Authorization Service

Provides:
- API key validation
- Scope-based authorization
- Rate limiting
- Request context management
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Callable
from fastapi import Request, HTTPException, Depends
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from enum import Enum
import hashlib
import secrets
import time
from functools import wraps

from .database import db


# ============== Enums ==============

class Scope(str, Enum):
    """API Key scopes"""
    # Consent operations
    CONSENT_READ = "consent:read"
    CONSENT_WRITE = "consent:write"
    
    # Event processing
    EVENTS_WRITE = "events:write"
    
    # Audit/reporting
    AUDIT_READ = "audit:read"
    AUDIT_EXPORT = "audit:export"
    
    # Admin operations
    ADMIN_READ = "admin:read"
    ADMIN_WRITE = "admin:write"
    
    # Webhook management
    WEBHOOKS_READ = "webhooks:read"
    WEBHOOKS_WRITE = "webhooks:write"


# Scope presets for common use cases
SCOPE_PRESETS = {
    "frontend": [Scope.CONSENT_WRITE, Scope.EVENTS_WRITE],
    "backend": [Scope.CONSENT_READ, Scope.CONSENT_WRITE, Scope.EVENTS_WRITE],
    "audit": [Scope.AUDIT_READ, Scope.AUDIT_EXPORT],
    "admin": [s for s in Scope],  # All scopes
}


# ============== Models ==============

class AuthContext(BaseModel):
    """Authentication context for a request"""
    authenticated: bool = False
    tenant_id: Optional[str] = None
    api_key_id: Optional[str] = None
    api_key_name: Optional[str] = None
    scopes: List[str] = []
    
    def has_scope(self, scope: Scope) -> bool:
        """Check if context has a specific scope"""
        return scope.value in self.scopes or "admin:write" in self.scopes
    
    def require_scope(self, scope: Scope):
        """Raise exception if scope is missing"""
        if not self.has_scope(scope):
            raise HTTPException(
                status_code=403,
                detail=f"Missing required scope: {scope.value}"
            )


class RateLimitResult(BaseModel):
    """Result of rate limit check"""
    allowed: bool
    current_count: int
    limit: int
    remaining: int
    reset_at: Optional[datetime] = None


# ============== API Key Header ==============

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


# ============== Auth Service ==============

class AuthService:
    """
    Authentication and authorization service.
    """
    
    def __init__(self):
        # Rate limit configuration per tenant tier
        self.rate_limits = {
            "free": {"requests_per_minute": 60, "events_per_minute": 100},
            "starter": {"requests_per_minute": 600, "events_per_minute": 1000},
            "professional": {"requests_per_minute": 6000, "events_per_minute": 10000},
            "enterprise": {"requests_per_minute": 60000, "events_per_minute": 100000},
        }
        self.default_tier = "starter"
    
    def generate_api_key(self) -> tuple[str, str]:
        """
        Generate a new API key.
        Returns (key, key_hash) - only return key once, store hash.
        """
        # Format: csp_live_<32 random chars>
        key = f"csp_live_{secrets.token_urlsafe(32)}"
        key_hash = self._hash_key(key)
        return key, key_hash
    
    def generate_test_key(self) -> tuple[str, str]:
        """Generate a test API key"""
        key = f"csp_test_{secrets.token_urlsafe(32)}"
        key_hash = self._hash_key(key)
        return key, key_hash
    
    def _hash_key(self, key: str) -> str:
        """Hash an API key for storage"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    async def validate_api_key(self, key: str) -> Optional[Dict[str, Any]]:
        """Validate an API key and return its metadata"""
        if not key:
            return None
        
        key_hash = self._hash_key(key)
        api_key = await db.get_api_key_by_hash(key_hash)
        
        if not api_key:
            return None
        
        # Check expiration
        if api_key.get("expires_at"):
            expires = datetime.fromisoformat(api_key["expires_at"])
            if expires < datetime.now(timezone.utc):
                return None
        
        # Update last used
        await db.update_api_key_last_used(api_key["id"])
        
        return api_key
    
    async def get_auth_context(self, request: Request, api_key: str = None) -> AuthContext:
        """
        Build authentication context from request.
        Checks API key and tenant headers.
        """
        # Check for API key
        if api_key:
            key_data = await self.validate_api_key(api_key)
            if key_data:
                return AuthContext(
                    authenticated=True,
                    tenant_id=key_data["tenant_id"],
                    api_key_id=key_data["id"],
                    api_key_name=key_data.get("name"),
                    scopes=key_data.get("scopes", [])
                )
        
        # Check for tenant header (for backwards compatibility / demo mode)
        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            # Demo mode - allow with limited scopes
            return AuthContext(
                authenticated=True,
                tenant_id=tenant_id,
                scopes=[s.value for s in Scope]  # All scopes in demo mode
            )
        
        return AuthContext(authenticated=False)
    
    async def check_rate_limit(self, tenant_id: str, endpoint: str,
                               tier: str = None) -> RateLimitResult:
        """
        Check rate limit for a tenant/endpoint.
        Uses sliding window counter pattern.
        """
        tier = tier or self.default_tier
        limits = self.rate_limits.get(tier, self.rate_limits["starter"])
        
        # Determine limit based on endpoint
        if endpoint.startswith("/event"):
            limit = limits["events_per_minute"]
            window_key = f"events:{int(time.time() // 60)}"
        else:
            limit = limits["requests_per_minute"]
            window_key = f"requests:{int(time.time() // 60)}"
        
        # Increment counter
        current_count = await db.increment_rate_limit(tenant_id, window_key, 60)
        
        return RateLimitResult(
            allowed=current_count <= limit,
            current_count=current_count,
            limit=limit,
            remaining=max(0, limit - current_count),
            reset_at=datetime.fromtimestamp(
                (int(time.time() // 60) + 1) * 60,
                tz=timezone.utc
            )
        )


# Singleton
auth_service = AuthService()


# ============== FastAPI Dependencies ==============

async def get_auth_context(
    request: Request,
    api_key: str = Depends(api_key_header)
) -> AuthContext:
    """FastAPI dependency to get auth context"""
    return await auth_service.get_auth_context(request, api_key)


async def require_auth(
    auth: AuthContext = Depends(get_auth_context)
) -> AuthContext:
    """Require authentication"""
    if not auth.authenticated:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide X-API-Key header."
        )
    return auth


async def require_scope(scope: Scope):
    """Factory for scope requirement dependency"""
    async def check_scope(auth: AuthContext = Depends(require_auth)) -> AuthContext:
        auth.require_scope(scope)
        return auth
    return check_scope


async def check_rate_limit(
    request: Request,
    auth: AuthContext = Depends(get_auth_context)
) -> AuthContext:
    """Check rate limit for request"""
    if not auth.authenticated or not auth.tenant_id:
        return auth
    
    result = await auth_service.check_rate_limit(
        auth.tenant_id,
        request.url.path
    )
    
    if not result.allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limit_exceeded",
                "limit": result.limit,
                "remaining": 0,
                "reset_at": result.reset_at.isoformat() if result.reset_at else None
            },
            headers={
                "X-RateLimit-Limit": str(result.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(result.reset_at.timestamp())) if result.reset_at else ""
            }
        )
    
    # Add rate limit headers to response
    request.state.rate_limit = result
    return auth


# ============== Decorators ==============

def require_scopes(*scopes: Scope):
    """Decorator to require specific scopes"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, auth: AuthContext = Depends(require_auth), **kwargs):
            for scope in scopes:
                auth.require_scope(scope)
            return await func(*args, auth=auth, **kwargs)
        return wrapper
    return decorator
