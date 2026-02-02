"""
Consent Token Service
JWT-like signed tokens that encode consent state for enforcement.

These tokens are issued by the Consent SaaS platform and validated
by enforcement points (proxies, APIs, etc.) without calling back.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
import json
import base64
import hashlib
import hmac
import secrets
import uuid


# ============== Token Models ==============

class TokenAlgorithm(str, Enum):
    HS256 = "HS256"  # HMAC-SHA256
    HS384 = "HS384"  # HMAC-SHA384
    HS512 = "HS512"  # HMAC-SHA512
    # In production, add RS256, ES256 for asymmetric signing


class ConsentScope(BaseModel):
    """Defines what a consent token authorizes"""
    purpose: str
    data_categories: List[str] = []
    vendors: List[str] = []
    legal_basis: str = "consent"


class ConsentTokenHeader(BaseModel):
    """JWT-like header"""
    alg: TokenAlgorithm = TokenAlgorithm.HS256
    typ: str = "CST"  # Consent Service Token
    kid: Optional[str] = None  # Key ID for key rotation


class ConsentTokenPayload(BaseModel):
    """JWT-like payload with consent claims"""
    # Standard JWT claims
    iss: str                    # Issuer (tenant ID or service URL)
    sub: str                    # Subject (data subject identifier)
    aud: List[str] = []         # Audience (allowed vendors/services)
    exp: int                    # Expiration timestamp
    nbf: Optional[int] = None   # Not before timestamp
    iat: int                    # Issued at timestamp
    jti: str                    # Unique token ID
    
    # Consent-specific claims
    tenant_id: str              # Multi-tenant identifier
    consents: List[str]         # Granted consent purposes
    scopes: List[ConsentScope]  # Detailed scope definitions
    
    # Optional claims
    legal_basis: Dict[str, str] = {}  # purpose -> legal basis mapping
    policy_version: Optional[str] = None
    subject_country: Optional[str] = None
    subject_region: Optional[str] = None
    
    # Restrictions
    single_use: bool = False
    max_uses: Optional[int] = None
    allowed_ips: List[str] = []
    
    # Metadata
    metadata: Dict[str, Any] = {}


class SignedConsentToken(BaseModel):
    """A complete signed consent token"""
    id: str
    token: str                  # The actual signed token string
    header: ConsentTokenHeader
    payload: ConsentTokenPayload
    signature: str
    
    # Token management
    issued_at: datetime
    expires_at: datetime
    status: str = "active"      # active, revoked, expired
    use_count: int = 0
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    revocation_reason: Optional[str] = None


class TokenValidationResult(BaseModel):
    """Result of token validation"""
    valid: bool
    token_id: Optional[str] = None
    subject: Optional[str] = None
    tenant_id: Optional[str] = None
    consents: List[str] = []
    scopes: List[ConsentScope] = []
    error: Optional[str] = None
    error_code: Optional[str] = None


class TokenIssueRequest(BaseModel):
    """Request to issue a new consent token"""
    tenant_id: str
    subject_id: str
    consents: List[str]
    scopes: Optional[List[ConsentScope]] = None
    audience: List[str] = []
    expires_in_seconds: int = 3600
    single_use: bool = False
    max_uses: Optional[int] = None
    metadata: Dict[str, Any] = {}
    subject_country: Optional[str] = None


# ============== Token Service ==============

class ConsentTokenService:
    """
    Service for issuing and validating signed consent tokens.
    
    Tokens are self-contained and can be validated offline by
    enforcement points using the shared secret or public key.
    """
    
    def __init__(self, default_algorithm: TokenAlgorithm = TokenAlgorithm.HS256):
        self.default_algorithm = default_algorithm
        
        # Signing keys per tenant (in production, use secure key management)
        self.signing_keys: Dict[str, Dict[str, Any]] = {}
        
        # Token registry (for revocation checking)
        self.tokens: Dict[str, SignedConsentToken] = {}
        
        # Revocation list
        self.revoked_tokens: set = set()
        
        # Initialize demo tenant key
        self._init_demo_keys()
    
    def _init_demo_keys(self):
        """Initialize demo signing keys"""
        self.signing_keys["demo-tenant"] = {
            "kid": "demo-key-001",
            "secret": secrets.token_hex(32),
            "algorithm": TokenAlgorithm.HS256,
            "created_at": datetime.utcnow(),
            "active": True
        }
    
    def _base64url_encode(self, data: bytes) -> str:
        """Base64 URL-safe encoding without padding"""
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')
    
    def _base64url_decode(self, data: str) -> bytes:
        """Base64 URL-safe decoding with padding restoration"""
        padding = 4 - len(data) % 4
        if padding != 4:
            data += '=' * padding
        return base64.urlsafe_b64decode(data)
    
    def _sign(self, message: str, secret: str, algorithm: TokenAlgorithm) -> str:
        """Sign a message using HMAC"""
        if algorithm == TokenAlgorithm.HS256:
            sig = hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
        elif algorithm == TokenAlgorithm.HS384:
            sig = hmac.new(secret.encode(), message.encode(), hashlib.sha384).digest()
        elif algorithm == TokenAlgorithm.HS512:
            sig = hmac.new(secret.encode(), message.encode(), hashlib.sha512).digest()
        else:
            raise ValueError(f"Unsupported algorithm: {algorithm}")
        
        return self._base64url_encode(sig)
    
    def _verify_signature(self, message: str, signature: str, secret: str, 
                         algorithm: TokenAlgorithm) -> bool:
        """Verify a signature"""
        expected_sig = self._sign(message, secret, algorithm)
        return hmac.compare_digest(expected_sig, signature)
    
    # ============== Key Management ==============
    
    def register_tenant_key(self, tenant_id: str, secret: str = None,
                           algorithm: TokenAlgorithm = None) -> Dict[str, Any]:
        """Register a signing key for a tenant"""
        key_id = f"key-{secrets.token_hex(8)}"
        secret = secret or secrets.token_hex(32)
        algorithm = algorithm or self.default_algorithm
        
        key_info = {
            "kid": key_id,
            "secret": secret,
            "algorithm": algorithm,
            "created_at": datetime.utcnow(),
            "active": True
        }
        
        self.signing_keys[tenant_id] = key_info
        
        # Return key info without secret
        return {
            "kid": key_id,
            "algorithm": algorithm.value,
            "created_at": key_info["created_at"].isoformat()
        }
    
    def rotate_tenant_key(self, tenant_id: str) -> Dict[str, Any]:
        """Rotate the signing key for a tenant"""
        old_key = self.signing_keys.get(tenant_id)
        
        # Create new key
        new_key_info = self.register_tenant_key(tenant_id)
        
        # Mark old key as inactive (keep for validation of existing tokens)
        if old_key:
            self.signing_keys[f"{tenant_id}_old_{old_key['kid']}"] = {
                **old_key,
                "active": False,
                "rotated_at": datetime.utcnow()
            }
        
        return new_key_info
    
    def get_tenant_key(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Get the active signing key for a tenant"""
        return self.signing_keys.get(tenant_id)
    
    # ============== Token Issuance ==============
    
    def issue_token(self, request: TokenIssueRequest) -> SignedConsentToken:
        """
        Issue a new signed consent token.
        
        The token encodes the subject's consent state and can be
        validated by enforcement points without API calls.
        """
        # Get signing key
        key_info = self.signing_keys.get(request.tenant_id)
        if not key_info:
            raise ValueError(f"No signing key found for tenant: {request.tenant_id}")
        
        now = datetime.utcnow()
        now_ts = int(now.timestamp())
        exp_ts = now_ts + request.expires_in_seconds
        token_id = str(uuid.uuid4())
        
        # Build scopes from consents if not provided
        scopes = request.scopes or [
            ConsentScope(purpose=c, data_categories=[], vendors=request.audience)
            for c in request.consents
        ]
        
        # Create header
        header = ConsentTokenHeader(
            alg=key_info["algorithm"],
            typ="CST",
            kid=key_info["kid"]
        )
        
        # Create payload
        payload = ConsentTokenPayload(
            iss=f"consent-saas://{request.tenant_id}",
            sub=request.subject_id,
            aud=request.audience,
            exp=exp_ts,
            nbf=now_ts,
            iat=now_ts,
            jti=token_id,
            tenant_id=request.tenant_id,
            consents=request.consents,
            scopes=scopes,
            single_use=request.single_use,
            max_uses=request.max_uses,
            subject_country=request.subject_country,
            metadata=request.metadata
        )
        
        # Encode header and payload
        header_b64 = self._base64url_encode(
            json.dumps(header.model_dump(), separators=(',', ':')).encode()
        )
        payload_b64 = self._base64url_encode(
            json.dumps(payload.model_dump(), separators=(',', ':'), default=str).encode()
        )
        
        # Create signature
        message = f"{header_b64}.{payload_b64}"
        signature = self._sign(message, key_info["secret"], key_info["algorithm"])
        
        # Complete token
        token_string = f"{header_b64}.{payload_b64}.{signature}"
        
        signed_token = SignedConsentToken(
            id=token_id,
            token=token_string,
            header=header,
            payload=payload,
            signature=signature,
            issued_at=now,
            expires_at=datetime.fromtimestamp(exp_ts),
            status="active",
            use_count=0
        )
        
        # Store token for management
        self.tokens[token_id] = signed_token
        
        return signed_token
    
    # ============== Token Validation ==============
    
    def validate_token(self, token_string: str, 
                      check_revocation: bool = True,
                      record_use: bool = True) -> TokenValidationResult:
        """
        Validate a consent token.
        
        This can be called by enforcement points to validate tokens.
        In production, enforcement points would validate offline using
        the public key, and only check revocation periodically.
        """
        try:
            # Parse token
            parts = token_string.split('.')
            if len(parts) != 3:
                return TokenValidationResult(
                    valid=False,
                    error="Invalid token format",
                    error_code="INVALID_FORMAT"
                )
            
            header_b64, payload_b64, signature = parts
            
            # Decode header
            try:
                header_json = self._base64url_decode(header_b64)
                header_data = json.loads(header_json)
                header = ConsentTokenHeader(**header_data)
            except Exception as e:
                return TokenValidationResult(
                    valid=False,
                    error=f"Invalid header: {str(e)}",
                    error_code="INVALID_HEADER"
                )
            
            # Decode payload
            try:
                payload_json = self._base64url_decode(payload_b64)
                payload_data = json.loads(payload_json)
                payload = ConsentTokenPayload(**payload_data)
            except Exception as e:
                return TokenValidationResult(
                    valid=False,
                    error=f"Invalid payload: {str(e)}",
                    error_code="INVALID_PAYLOAD"
                )
            
            # Get signing key
            key_info = self.signing_keys.get(payload.tenant_id)
            if not key_info:
                return TokenValidationResult(
                    valid=False,
                    error="Unknown tenant",
                    error_code="UNKNOWN_TENANT"
                )
            
            # Verify signature
            message = f"{header_b64}.{payload_b64}"
            if not self._verify_signature(message, signature, key_info["secret"], header.alg):
                return TokenValidationResult(
                    valid=False,
                    error="Invalid signature",
                    error_code="INVALID_SIGNATURE"
                )
            
            # Check expiration
            now_ts = int(datetime.utcnow().timestamp())
            if payload.exp < now_ts:
                return TokenValidationResult(
                    valid=False,
                    error="Token expired",
                    error_code="TOKEN_EXPIRED"
                )
            
            # Check not-before
            if payload.nbf and payload.nbf > now_ts:
                return TokenValidationResult(
                    valid=False,
                    error="Token not yet valid",
                    error_code="TOKEN_NOT_YET_VALID"
                )
            
            # Check revocation
            if check_revocation and payload.jti in self.revoked_tokens:
                return TokenValidationResult(
                    valid=False,
                    error="Token has been revoked",
                    error_code="TOKEN_REVOKED"
                )
            
            # Check use limits
            stored_token = self.tokens.get(payload.jti)
            if stored_token:
                if stored_token.status == "revoked":
                    return TokenValidationResult(
                        valid=False,
                        error="Token has been revoked",
                        error_code="TOKEN_REVOKED"
                    )
                
                if payload.single_use and stored_token.use_count > 0:
                    return TokenValidationResult(
                        valid=False,
                        error="Single-use token already used",
                        error_code="TOKEN_EXHAUSTED"
                    )
                
                if payload.max_uses and stored_token.use_count >= payload.max_uses:
                    return TokenValidationResult(
                        valid=False,
                        error="Token use limit exceeded",
                        error_code="TOKEN_EXHAUSTED"
                    )
                
                # Record usage
                if record_use:
                    stored_token.use_count += 1
                    stored_token.last_used_at = datetime.utcnow()
            
            # Token is valid
            return TokenValidationResult(
                valid=True,
                token_id=payload.jti,
                subject=payload.sub,
                tenant_id=payload.tenant_id,
                consents=payload.consents,
                scopes=payload.scopes
            )
        
        except Exception as e:
            return TokenValidationResult(
                valid=False,
                error=f"Validation error: {str(e)}",
                error_code="VALIDATION_ERROR"
            )
    
    def decode_token(self, token_string: str) -> Optional[ConsentTokenPayload]:
        """Decode a token without validation (for inspection)"""
        try:
            parts = token_string.split('.')
            if len(parts) != 3:
                return None
            
            payload_json = self._base64url_decode(parts[1])
            payload_data = json.loads(payload_json)
            return ConsentTokenPayload(**payload_data)
        except:
            return None
    
    # ============== Token Management ==============
    
    def revoke_token(self, token_id: str, reason: str = None) -> bool:
        """Revoke a token"""
        self.revoked_tokens.add(token_id)
        
        stored_token = self.tokens.get(token_id)
        if stored_token:
            stored_token.status = "revoked"
            stored_token.revoked_at = datetime.utcnow()
            stored_token.revocation_reason = reason
            return True
        
        return False
    
    def revoke_all_for_subject(self, tenant_id: str, subject_id: str, reason: str = None) -> int:
        """Revoke all tokens for a subject"""
        count = 0
        for token in self.tokens.values():
            if token.payload.tenant_id == tenant_id and token.payload.sub == subject_id:
                if token.status == "active":
                    self.revoke_token(token.id, reason)
                    count += 1
        return count
    
    def list_tokens(self, tenant_id: str, subject_id: str = None,
                   status: str = None, limit: int = 100) -> List[SignedConsentToken]:
        """List tokens for a tenant"""
        tokens = [t for t in self.tokens.values() if t.payload.tenant_id == tenant_id]
        
        if subject_id:
            tokens = [t for t in tokens if t.payload.sub == subject_id]
        if status:
            tokens = [t for t in tokens if t.status == status]
        
        # Sort by issued_at descending
        tokens.sort(key=lambda t: t.issued_at, reverse=True)
        
        return tokens[:limit]
    
    def get_token(self, token_id: str) -> Optional[SignedConsentToken]:
        """Get a token by ID"""
        return self.tokens.get(token_id)
    
    def cleanup_expired_tokens(self, tenant_id: str = None) -> int:
        """Clean up expired tokens"""
        now = datetime.utcnow()
        count = 0
        
        to_remove = []
        for token_id, token in self.tokens.items():
            if tenant_id and token.payload.tenant_id != tenant_id:
                continue
            
            if token.expires_at < now:
                token.status = "expired"
                # In production, archive rather than delete
                to_remove.append(token_id)
                count += 1
        
        # Remove from active tokens (keep in archive in production)
        for token_id in to_remove:
            self.revoked_tokens.add(token_id)
        
        return count
    
    # ============== Token Introspection ==============
    
    def introspect_token(self, token_string: str) -> Dict[str, Any]:
        """
        Introspect a token (OAuth 2.0 Token Introspection style).
        Returns detailed information about the token state.
        """
        validation = self.validate_token(token_string, record_use=False)
        
        if not validation.valid:
            return {
                "active": False,
                "error": validation.error,
                "error_code": validation.error_code
            }
        
        stored_token = self.tokens.get(validation.token_id)
        payload = self.decode_token(token_string)
        
        return {
            "active": True,
            "token_id": validation.token_id,
            "subject": validation.subject,
            "tenant_id": validation.tenant_id,
            "consents": validation.consents,
            "scopes": [s.model_dump() for s in validation.scopes],
            "issued_at": stored_token.issued_at.isoformat() if stored_token else None,
            "expires_at": stored_token.expires_at.isoformat() if stored_token else None,
            "use_count": stored_token.use_count if stored_token else 0,
            "single_use": payload.single_use if payload else False,
            "max_uses": payload.max_uses if payload else None,
            "audience": payload.aud if payload else [],
            "metadata": payload.metadata if payload else {}
        }


# Create singleton instance
consent_token_service = ConsentTokenService()
