"""
Consent Token Service

Issues, validates, and manages consent tokens.
Tokens are JWT-like, signed with ES256 (ECDSA), NOT encrypted (auditable).

Token Schema:
{
  "iss": "consent-control-plane",
  "sub": "hashed_user_id",
  "iat": 1738362000,
  "exp": 1739571600,
  "tid": "tenant_id",
  "jti": "unique_token_id",
  "jurisdiction": "CPRA",
  
  "purposes": {
    "retargeting": {"allowed": true, "ttl_days": 14}
  },
  
  "vendors": {
    "meta": {"allowed": true, "data_classes": ["behavioral"]}
  },
  
  "constraints": {
    "no_cross_site": true,
    "no_enrichment": true
  },
  
  "version": "1.0"
}
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Tuple
from pydantic import BaseModel, Field
from enum import Enum
import hashlib
import json
import uuid
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend


# ============== Enums ==============

class Jurisdiction(str, Enum):
    GDPR = "GDPR"
    CPRA = "CPRA"
    CCPA = "CCPA"
    LGPD = "LGPD"
    PIPEDA = "PIPEDA"
    PDPA = "PDPA"
    OTHER = "OTHER"


class TokenStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


# ============== Models ==============

class PurposeConsent(BaseModel):
    """Consent for a specific purpose"""
    allowed: bool
    ttl_days: Optional[int] = 14


class VendorConsent(BaseModel):
    """Consent for a specific vendor"""
    allowed: bool
    data_classes: List[str] = []  # e.g., ["behavioral", "device", "location"]


class ConsentConstraints(BaseModel):
    """Constraints on how data can be used"""
    no_cross_site: bool = False
    no_enrichment: bool = False
    no_profiling: bool = False
    no_sale: bool = False  # CCPA "Do Not Sell"


class ConsentTokenRequest(BaseModel):
    """Request to create a consent token"""
    subject_id: str  # Hashed user ID
    purposes: Dict[str, PurposeConsent]
    vendors: Dict[str, VendorConsent]
    constraints: Optional[ConsentConstraints] = None
    jurisdiction: Jurisdiction = Jurisdiction.GDPR
    ttl_days: int = 14


class ConsentTokenPayload(BaseModel):
    """The payload of a consent token"""
    # Standard JWT claims
    iss: str = "consent-control-plane"
    sub: str  # subject_id
    iat: int  # issued at (unix timestamp)
    exp: int  # expiration (unix timestamp)
    jti: str  # unique token ID
    
    # Custom claims
    tid: str  # tenant_id
    jurisdiction: str
    purposes: Dict[str, Dict[str, Any]]
    vendors: Dict[str, Dict[str, Any]]
    constraints: Dict[str, bool] = {}
    version: str = "1.0"


class ConsentToken(BaseModel):
    """A signed consent token with metadata"""
    token_id: str
    tenant_id: str
    subject_id: str
    token: str  # The actual JWT string
    token_hash: str  # For lookup
    
    # Parsed contents
    purposes: Dict[str, PurposeConsent]
    vendors: Dict[str, VendorConsent]
    constraints: ConsentConstraints
    jurisdiction: Jurisdiction
    
    # Lifecycle
    issued_at: datetime
    expires_at: datetime
    status: TokenStatus = TokenStatus.ACTIVE
    
    # For audit
    key_version: int


class TokenValidationResult(BaseModel):
    """Result of validating a token"""
    valid: bool
    status: TokenStatus
    reason: Optional[str] = None
    
    # If valid, the parsed payload
    payload: Optional[ConsentTokenPayload] = None
    purposes: Optional[Dict[str, PurposeConsent]] = None
    vendors: Optional[Dict[str, VendorConsent]] = None
    constraints: Optional[ConsentConstraints] = None


# ============== Key Management ==============

class TenantKeys:
    """Manages signing keys for a tenant"""
    
    def __init__(self, tenant_id: str, private_key_pem: str, public_key_pem: str, version: int = 1):
        self.tenant_id = tenant_id
        self.version = version
        self._private_key_pem = private_key_pem
        self._public_key_pem = public_key_pem
        
        # Load keys
        self.private_key = serialization.load_pem_private_key(
            private_key_pem.encode(),
            password=None,
            backend=default_backend()
        )
        self.public_key = serialization.load_pem_public_key(
            public_key_pem.encode(),
            backend=default_backend()
        )
    
    @classmethod
    def generate(cls, tenant_id: str, version: int = 1) -> "TenantKeys":
        """Generate a new key pair for a tenant"""
        # Generate ECDSA key pair (ES256 = P-256 curve)
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        public_key = private_key.public_key()
        
        # Serialize to PEM
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode()
        
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode()
        
        return cls(tenant_id, private_pem, public_pem, version)


# ============== Token Service ==============

class TokenService:
    """
    Service for issuing and validating consent tokens.
    
    Tokens are:
    - Signed with ES256 (ECDSA P-256)
    - Human-readable (JWT format)
    - Machine-enforceable
    - Auditor-friendly
    """
    
    def __init__(self):
        # In production, these would be in a database
        self._tenant_keys: Dict[str, TenantKeys] = {}
        self._tokens: Dict[str, ConsentToken] = {}  # token_hash -> token
        self._revoked: set = set()  # Set of revoked token_ids
        
        # Initialize demo tenant
        self._init_demo_tenant()
    
    def _init_demo_tenant(self):
        """Initialize a demo tenant with keys"""
        demo_keys = TenantKeys.generate("demo-tenant", version=1)
        self._tenant_keys["demo-tenant"] = demo_keys
    
    def register_tenant(self, tenant_id: str) -> Dict[str, str]:
        """Register a new tenant and generate keys"""
        if tenant_id in self._tenant_keys:
            raise ValueError(f"Tenant {tenant_id} already registered")
        
        keys = TenantKeys.generate(tenant_id)
        self._tenant_keys[tenant_id] = keys
        
        return {
            "tenant_id": tenant_id,
            "public_key": keys._public_key_pem,
            "key_version": keys.version
        }
    
    def get_public_key(self, tenant_id: str) -> Optional[str]:
        """Get the public key for a tenant (for external validation)"""
        keys = self._tenant_keys.get(tenant_id)
        return keys._public_key_pem if keys else None
    
    def rotate_keys(self, tenant_id: str) -> Dict[str, str]:
        """Rotate keys for a tenant"""
        old_keys = self._tenant_keys.get(tenant_id)
        new_version = (old_keys.version + 1) if old_keys else 1
        
        new_keys = TenantKeys.generate(tenant_id, version=new_version)
        self._tenant_keys[tenant_id] = new_keys
        
        return {
            "tenant_id": tenant_id,
            "public_key": new_keys._public_key_pem,
            "key_version": new_keys.version
        }
    
    def issue_token(self, tenant_id: str, request: ConsentTokenRequest) -> ConsentToken:
        """
        Issue a new consent token.
        
        Flow:
        1. Validate request
        2. Build payload
        3. Sign with tenant's private key
        4. Store and return
        """
        keys = self._tenant_keys.get(tenant_id)
        if not keys:
            raise ValueError(f"Tenant {tenant_id} not registered")
        
        now = datetime.now(timezone.utc)
        token_id = str(uuid.uuid4())
        
        # Calculate expiration
        expires_at = now + timedelta(days=request.ttl_days)
        
        # Build payload
        payload = ConsentTokenPayload(
            iss="consent-control-plane",
            sub=request.subject_id,
            iat=int(now.timestamp()),
            exp=int(expires_at.timestamp()),
            jti=token_id,
            tid=tenant_id,
            jurisdiction=request.jurisdiction.value,
            purposes={k: v.model_dump() for k, v in request.purposes.items()},
            vendors={k: v.model_dump() for k, v in request.vendors.items()},
            constraints=request.constraints.model_dump() if request.constraints else {},
            version="1.0"
        )
        
        # Sign token
        token_string = jwt.encode(
            payload.model_dump(),
            keys.private_key,
            algorithm="ES256"
        )
        
        # Hash for lookup
        token_hash = hashlib.sha256(token_string.encode()).hexdigest()
        
        # Create token object
        token = ConsentToken(
            token_id=token_id,
            tenant_id=tenant_id,
            subject_id=request.subject_id,
            token=token_string,
            token_hash=token_hash,
            purposes=request.purposes,
            vendors=request.vendors,
            constraints=request.constraints or ConsentConstraints(),
            jurisdiction=request.jurisdiction,
            issued_at=now,
            expires_at=expires_at,
            status=TokenStatus.ACTIVE,
            key_version=keys.version
        )
        
        # Store
        self._tokens[token_hash] = token
        
        return token
    
    def validate_token(self, tenant_id: str, token_string: str) -> TokenValidationResult:
        """
        Validate a consent token.
        
        Checks:
        1. Signature validity (ES256)
        2. Expiration
        3. Revocation status
        4. Tenant match
        """
        keys = self._tenant_keys.get(tenant_id)
        if not keys:
            return TokenValidationResult(
                valid=False,
                status=TokenStatus.REVOKED,
                reason="tenant_not_found"
            )
        
        try:
            # Verify signature and decode
            payload_dict = jwt.decode(
                token_string,
                keys.public_key,
                algorithms=["ES256"],
                options={"require": ["exp", "iat", "sub", "jti"]}
            )
            
            payload = ConsentTokenPayload(**payload_dict)
            
            # Check tenant match
            if payload.tid != tenant_id:
                return TokenValidationResult(
                    valid=False,
                    status=TokenStatus.REVOKED,
                    reason="tenant_mismatch"
                )
            
            # Check if revoked
            if payload.jti in self._revoked:
                return TokenValidationResult(
                    valid=False,
                    status=TokenStatus.REVOKED,
                    reason="token_revoked"
                )
            
            # Parse purposes and vendors
            purposes = {
                k: PurposeConsent(**v) for k, v in payload.purposes.items()
            }
            vendors = {
                k: VendorConsent(**v) for k, v in payload.vendors.items()
            }
            constraints = ConsentConstraints(**payload.constraints) if payload.constraints else ConsentConstraints()
            
            return TokenValidationResult(
                valid=True,
                status=TokenStatus.ACTIVE,
                payload=payload,
                purposes=purposes,
                vendors=vendors,
                constraints=constraints
            )
            
        except jwt.ExpiredSignatureError:
            return TokenValidationResult(
                valid=False,
                status=TokenStatus.EXPIRED,
                reason="token_expired"
            )
        except jwt.InvalidSignatureError:
            return TokenValidationResult(
                valid=False,
                status=TokenStatus.REVOKED,
                reason="invalid_signature"
            )
        except jwt.DecodeError as e:
            return TokenValidationResult(
                valid=False,
                status=TokenStatus.REVOKED,
                reason=f"decode_error: {str(e)}"
            )
        except Exception as e:
            return TokenValidationResult(
                valid=False,
                status=TokenStatus.REVOKED,
                reason=f"validation_error: {str(e)}"
            )
    
    def revoke_token(self, tenant_id: str, token_id: str, reason: str = None) -> bool:
        """Revoke a token by ID"""
        self._revoked.add(token_id)
        
        # Update stored token if exists
        for token_hash, token in self._tokens.items():
            if token.token_id == token_id and token.tenant_id == tenant_id:
                token.status = TokenStatus.REVOKED
                return True
        
        return True  # Token might exist but not in our cache
    
    def revoke_all_for_subject(self, tenant_id: str, subject_id: str) -> int:
        """Revoke all tokens for a subject"""
        count = 0
        for token in self._tokens.values():
            if token.tenant_id == tenant_id and token.subject_id == subject_id:
                self._revoked.add(token.token_id)
                token.status = TokenStatus.REVOKED
                count += 1
        return count
    
    def get_token_by_hash(self, token_hash: str) -> Optional[ConsentToken]:
        """Get a token by its hash"""
        return self._tokens.get(token_hash)
    
    def list_tokens(self, tenant_id: str, subject_id: str = None, status: TokenStatus = None) -> List[ConsentToken]:
        """List tokens for a tenant"""
        tokens = [t for t in self._tokens.values() if t.tenant_id == tenant_id]
        
        if subject_id:
            tokens = [t for t in tokens if t.subject_id == subject_id]
        
        if status:
            tokens = [t for t in tokens if t.status == status]
        
        return sorted(tokens, key=lambda t: t.issued_at, reverse=True)
    
    def decode_token_unsafe(self, token_string: str) -> Optional[Dict[str, Any]]:
        """
        Decode a token WITHOUT verifying signature.
        Useful for debugging/audit display.
        DO NOT use for enforcement decisions.
        """
        try:
            return jwt.decode(token_string, options={"verify_signature": False})
        except:
            return None


# Singleton instance
token_service = TokenService()
