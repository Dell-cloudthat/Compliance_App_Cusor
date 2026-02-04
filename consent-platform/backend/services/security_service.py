"""
Security Hardening Service

Defenses against bypass attempts:
1. Fake Consent Tokens - Nonce binding, audience validation, fingerprinting
2. Shadow Pipelines - Hash-based detection, behavioral verification
3. Model Laundering - Purpose binding, lineage tracking
4. Replay Attacks - Idempotency, anomaly detection
5. Traffic Authentication - mTLS, environment binding, origin allowlists

Principle: Treat consent tokens like OAuth access tokens, not cookies.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Set, Tuple
from pydantic import BaseModel, Field
from enum import Enum
from collections import defaultdict
import hashlib
import hmac
import secrets
import time
import threading
import ipaddress


# ============== Enums ==============

class SecurityEventType(str, Enum):
    """Types of security events"""
    # Token attacks
    TOKEN_REPLAY = "token_replay"
    TOKEN_MODIFIED = "token_modified"
    TOKEN_EXPIRED_REUSE = "token_expired_reuse"
    TOKEN_INVALID_AUDIENCE = "token_invalid_audience"
    TOKEN_NONCE_REUSE = "token_nonce_reuse"
    
    # Shadow pipeline attacks
    SHADOW_PIPELINE_DETECTED = "shadow_pipeline_detected"
    HASH_MISMATCH = "hash_mismatch"
    PARALLEL_SUBMISSION = "parallel_submission"
    
    # Purpose violations
    PURPOSE_VIOLATION = "purpose_violation"
    DERIVED_DATA_VIOLATION = "derived_data_violation"
    CROSS_PURPOSE_REUSE = "cross_purpose_reuse"
    
    # Volume attacks
    REPLAY_ATTACK = "replay_attack"
    VOLUME_FLOOD = "volume_flood"
    ANOMALY_DETECTED = "anomaly_detected"
    
    # Auth attacks
    INVALID_ORIGIN = "invalid_origin"
    ENVIRONMENT_MISMATCH = "environment_mismatch"
    SUSPICIOUS_PATTERN = "suspicious_pattern"


class ThreatLevel(str, Enum):
    """Threat severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Environment(str, Enum):
    """Deployment environments"""
    PRODUCTION = "production"
    STAGING = "staging"
    DEVELOPMENT = "development"
    TEST = "test"


# ============== Models ==============

class SecurityEvent(BaseModel):
    """A detected security event"""
    id: str
    tenant_id: str
    event_type: SecurityEventType
    threat_level: ThreatLevel
    description: str
    evidence: Dict[str, Any] = {}
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Actions taken
    blocked: bool = False
    flagged: bool = False
    vendor_notified: bool = False


class NonceRecord(BaseModel):
    """Record of a used nonce"""
    nonce: str
    token_id: str
    event_id: Optional[str] = None
    used_at: datetime
    expires_at: datetime


class EventFingerprint(BaseModel):
    """Fingerprint of an event for shadow pipeline detection"""
    event_hash: str
    payload_hash: str
    metadata_hash: str
    destination: str
    timestamp: datetime
    expected: bool = True  # Was this expected based on policy?


class TrafficPattern(BaseModel):
    """Traffic pattern for anomaly detection"""
    tenant_id: str
    window_start: datetime
    request_count: int = 0
    unique_users: int = 0
    unique_events: int = 0
    avg_latency_ms: float = 0
    error_rate: float = 0


class OriginConfig(BaseModel):
    """Origin allowlist configuration"""
    tenant_id: str
    allowed_origins: List[str] = []
    allowed_ip_ranges: List[str] = []
    environment: Environment = Environment.PRODUCTION
    require_mtls: bool = False
    api_key_hash: Optional[str] = None


# ============== Token Security ==============

class TokenSecurityService:
    """
    Defends against fake consent token attacks.
    
    Attacks defended:
    - Generate tokens client-side
    - Replay old tokens
    - Modify scopes
    
    Defenses:
    - Server-side only issuance
    - Signed (JWS) with rotating keys
    - Audience + issuer binding
    - Short TTL + refresh model
    - Nonce or event binding for high-risk flows
    """
    
    def __init__(self):
        # Nonce tracking (in production, use Redis with TTL)
        self._used_nonces: Dict[str, NonceRecord] = {}
        self._nonce_lock = threading.Lock()
        
        # Token fingerprints for replay detection
        self._token_fingerprints: Dict[str, datetime] = {}
        
        # Audience binding
        self._valid_audiences: Set[str] = {"consent-platform", "enforcement-gateway"}
    
    def generate_nonce(self, token_id: str, ttl_seconds: int = 300) -> str:
        """Generate a cryptographically secure nonce for token binding"""
        nonce = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        
        with self._nonce_lock:
            self._used_nonces[nonce] = NonceRecord(
                nonce=nonce,
                token_id=token_id,
                used_at=now,
                expires_at=now + timedelta(seconds=ttl_seconds)
            )
        
        return nonce
    
    def validate_nonce(self, nonce: str, token_id: str) -> Tuple[bool, str]:
        """Validate and consume a nonce (one-time use)"""
        with self._nonce_lock:
            record = self._used_nonces.get(nonce)
            
            if not record:
                return False, "Nonce not found or already used"
            
            if record.token_id != token_id:
                return False, "Nonce/token mismatch"
            
            if datetime.now(timezone.utc) > record.expires_at:
                del self._used_nonces[nonce]
                return False, "Nonce expired"
            
            # Consume the nonce (one-time use)
            del self._used_nonces[nonce]
            return True, "Valid"
    
    def bind_nonce_to_event(self, nonce: str, event_id: str) -> bool:
        """Bind a nonce to a specific event (high-risk flows)"""
        with self._nonce_lock:
            record = self._used_nonces.get(nonce)
            if record and record.event_id is None:
                record.event_id = event_id
                return True
            return False
    
    def validate_audience(self, token_aud: str) -> Tuple[bool, str]:
        """Validate token audience claim"""
        if token_aud not in self._valid_audiences:
            return False, f"Invalid audience: {token_aud}"
        return True, "Valid"
    
    def fingerprint_token(self, token_string: str) -> str:
        """Create a fingerprint for replay detection"""
        return hashlib.sha256(token_string.encode()).hexdigest()[:16]
    
    def check_token_replay(self, token_fingerprint: str, token_id: str) -> Tuple[bool, str]:
        """Check if token is being replayed suspiciously"""
        now = datetime.now(timezone.utc)
        
        key = f"{token_fingerprint}:{token_id}"
        last_seen = self._token_fingerprints.get(key)
        
        if last_seen:
            time_diff = (now - last_seen).total_seconds()
            # If same token used within 100ms, likely replay
            if time_diff < 0.1:
                return True, "Token replay detected (rapid reuse)"
        
        self._token_fingerprints[key] = now
        
        # Cleanup old fingerprints
        if len(self._token_fingerprints) > 100000:
            cutoff = now - timedelta(minutes=5)
            self._token_fingerprints = {
                k: v for k, v in self._token_fingerprints.items()
                if v > cutoff
            }
        
        return False, "OK"
    
    def validate_token_binding(self, token_claims: Dict[str, Any],
                               request_context: Dict[str, Any]) -> List[str]:
        """Validate that token is properly bound to request context"""
        violations = []
        
        # Check issuer
        if token_claims.get("iss") != "consent-platform":
            violations.append("Invalid issuer")
        
        # Check audience
        aud = token_claims.get("aud")
        if aud:
            valid, msg = self.validate_audience(aud)
            if not valid:
                violations.append(msg)
        
        # Check subject binding (token should match user)
        token_sub = token_claims.get("sub")
        request_user = request_context.get("user_id")
        if token_sub and request_user and token_sub != request_user:
            violations.append(f"Subject mismatch: token={token_sub}, request={request_user}")
        
        return violations


# ============== Shadow Pipeline Detection ==============

class ShadowPipelineDetector:
    """
    Detects shadow event pipelines.
    
    Attack: Send "clean" events through gateway but enriched/raw PII directly to vendors.
    
    Defense:
    - Outbound destination fingerprinting
    - Hash-based verification (what should be sent vs what is sent)
    - Parallel pipeline detection
    
    "You don't need payloads — metadata + hashes are enough"
    """
    
    def __init__(self):
        # Expected vs actual event tracking
        self._expected_events: Dict[str, EventFingerprint] = {}
        self._actual_events: Dict[str, EventFingerprint] = {}
        
        # Parallel submission detection
        self._event_submissions: Dict[str, List[Tuple[str, datetime]]] = defaultdict(list)
        
        # Detection thresholds
        self.parallel_window_seconds = 5
        self.mismatch_threshold = 0.05  # 5% mismatch rate triggers alert
    
    def compute_event_hash(self, event_data: Dict[str, Any]) -> str:
        """Compute hash of event data (excluding timestamps)"""
        # Normalize and hash
        normalized = {
            k: v for k, v in sorted(event_data.items())
            if k not in ["timestamp", "received_at", "processed_at"]
        }
        import json
        return hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()
    
    def compute_metadata_hash(self, user_id: str, vendor: str, event_type: str) -> str:
        """Compute hash of event metadata"""
        data = f"{user_id}:{vendor}:{event_type}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def record_expected_event(self, event_id: str, payload_hash: str,
                              metadata_hash: str, destination: str):
        """Record what we expect to send to a vendor"""
        self._expected_events[event_id] = EventFingerprint(
            event_hash=event_id,
            payload_hash=payload_hash,
            metadata_hash=metadata_hash,
            destination=destination,
            timestamp=datetime.now(timezone.utc),
            expected=True
        )
    
    def record_actual_event(self, event_id: str, payload_hash: str,
                           metadata_hash: str, destination: str):
        """Record what was actually sent (from vendor callback or log)"""
        self._actual_events[event_id] = EventFingerprint(
            event_hash=event_id,
            payload_hash=payload_hash,
            metadata_hash=metadata_hash,
            destination=destination,
            timestamp=datetime.now(timezone.utc),
            expected=False
        )
    
    def detect_mismatch(self, event_id: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Detect if expected and actual events mismatch"""
        expected = self._expected_events.get(event_id)
        actual = self._actual_events.get(event_id)
        
        if not expected or not actual:
            return False, None
        
        mismatches = {}
        
        if expected.payload_hash != actual.payload_hash:
            mismatches["payload_hash"] = {
                "expected": expected.payload_hash,
                "actual": actual.payload_hash
            }
        
        if expected.metadata_hash != actual.metadata_hash:
            mismatches["metadata_hash"] = {
                "expected": expected.metadata_hash,
                "actual": actual.metadata_hash
            }
        
        if expected.destination != actual.destination:
            mismatches["destination"] = {
                "expected": expected.destination,
                "actual": actual.destination
            }
        
        if mismatches:
            return True, {
                "event_id": event_id,
                "mismatches": mismatches,
                "evidence": "Shadow pipeline suspected - data modified after gateway"
            }
        
        return False, None
    
    def detect_parallel_submission(self, user_id: str, vendor: str,
                                   event_type: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Detect parallel event submissions (shadow pipeline indicator)"""
        now = datetime.now(timezone.utc)
        key = f"{user_id}:{vendor}:{event_type}"
        
        # Get recent submissions
        submissions = self._event_submissions[key]
        
        # Filter to window
        cutoff = now - timedelta(seconds=self.parallel_window_seconds)
        recent = [(dest, ts) for dest, ts in submissions if ts > cutoff]
        
        # Check for parallel submissions to different destinations
        destinations = set(dest for dest, _ in recent)
        
        # Record this submission
        submissions.append(("gateway", now))
        
        # Cleanup old entries
        self._event_submissions[key] = recent[-100:]  # Keep last 100
        
        if len(destinations) > 1:
            return True, {
                "user_id": user_id,
                "vendor": vendor,
                "event_type": event_type,
                "parallel_destinations": list(destinations),
                "evidence": "Same event data sent to multiple destinations in parallel"
            }
        
        return False, None
    
    def get_mismatch_rate(self, tenant_id: str, window_hours: int = 24) -> float:
        """Calculate mismatch rate for a tenant"""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=window_hours)
        
        total = 0
        mismatched = 0
        
        for event_id, expected in self._expected_events.items():
            if expected.timestamp < cutoff:
                continue
            total += 1
            actual = self._actual_events.get(event_id)
            if actual and expected.payload_hash != actual.payload_hash:
                mismatched += 1
        
        return mismatched / total if total > 0 else 0


# ============== Purpose Limitation ==============

class PurposeLimitationEnforcer:
    """
    Enforces purpose binding to prevent model laundering.
    
    Attack: Claim data isn't used for ads, feed to ML "analytics", reuse for targeting.
    
    Defense:
    - Purpose binding in policy engine
    - Derived data restrictions
    - Purpose lineage tracking
    - Cross-purpose event ID reuse detection
    """
    
    def __init__(self):
        # Purpose lineage tracking
        self._purpose_lineage: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        
        # Event ID usage tracking (which purposes used which event IDs)
        self._event_purpose_map: Dict[str, Set[str]] = defaultdict(set)
        
        # Derived data tracking
        self._derived_data: Dict[str, Dict[str, Any]] = {}
        
        # Incompatible purpose pairs
        self.incompatible_purposes = {
            ("analytics", "retargeting"),
            ("analytics", "cross_site_tracking"),
            ("functional", "advertising"),
            ("security", "marketing"),
        }
    
    def record_purpose_usage(self, event_id: str, purpose: str,
                            tenant_id: str, vendor: str):
        """Record that an event was used for a specific purpose"""
        self._purpose_lineage[event_id].append({
            "purpose": purpose,
            "tenant_id": tenant_id,
            "vendor": vendor,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        self._event_purpose_map[event_id].add(purpose)
    
    def check_cross_purpose_reuse(self, event_id: str, new_purpose: str) -> Tuple[bool, Optional[str]]:
        """Check if event ID is being reused across incompatible purposes"""
        existing_purposes = self._event_purpose_map.get(event_id, set())
        
        for existing in existing_purposes:
            pair = tuple(sorted([existing, new_purpose]))
            if pair in self.incompatible_purposes:
                return True, f"Cross-purpose reuse: {existing} → {new_purpose}"
        
        return False, None
    
    def validate_purpose_chain(self, event_id: str, claimed_purpose: str) -> Tuple[bool, List[str]]:
        """Validate that purpose chain is legitimate"""
        violations = []
        lineage = self._purpose_lineage.get(event_id, [])
        
        if not lineage:
            return True, []
        
        # Check for purpose drift
        original_purpose = lineage[0]["purpose"]
        if self._is_purpose_drift(original_purpose, claimed_purpose):
            violations.append(f"Purpose drift detected: {original_purpose} → {claimed_purpose}")
        
        # Check for purpose laundering pattern
        if len(lineage) > 2:
            # Pattern: analytics → "model training" → retargeting
            purposes = [l["purpose"] for l in lineage]
            if self._detect_laundering_pattern(purposes):
                violations.append("Suspected purpose laundering via intermediate steps")
        
        return len(violations) == 0, violations
    
    def _is_purpose_drift(self, original: str, current: str) -> bool:
        """Check if purpose has drifted inappropriately"""
        # Analytics cannot drift to advertising
        analytics_purposes = {"analytics", "reporting", "statistics"}
        advertising_purposes = {"retargeting", "advertising", "targeting", "personalization"}
        
        if original in analytics_purposes and current in advertising_purposes:
            return True
        
        return False
    
    def _detect_laundering_pattern(self, purposes: List[str]) -> bool:
        """Detect model laundering pattern in purpose chain"""
        # Pattern: non-ad → ML/model → ad
        non_ad = {"analytics", "functional", "security", "reporting"}
        ml_related = {"model_training", "machine_learning", "prediction", "scoring"}
        ad_related = {"retargeting", "advertising", "targeting", "personalization"}
        
        saw_non_ad = False
        saw_ml = False
        
        for p in purposes:
            if p in non_ad:
                saw_non_ad = True
            elif p in ml_related and saw_non_ad:
                saw_ml = True
            elif p in ad_related and saw_ml:
                return True  # Laundering pattern detected
        
        return False
    
    def record_derived_data(self, source_event_id: str, derived_id: str,
                           derivation_type: str, purpose: str):
        """Track derived data for lineage"""
        self._derived_data[derived_id] = {
            "source_event_id": source_event_id,
            "derivation_type": derivation_type,
            "purpose": purpose,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    def check_derived_data_usage(self, derived_id: str, intended_purpose: str) -> Tuple[bool, Optional[str]]:
        """Check if derived data usage is consistent with original purpose"""
        derived = self._derived_data.get(derived_id)
        if not derived:
            return True, None
        
        original_purpose = derived["purpose"]
        if self._is_purpose_drift(original_purpose, intended_purpose):
            return False, f"Derived data purpose violation: created for {original_purpose}, used for {intended_purpose}"
        
        return True, None
    
    def get_purpose_lineage(self, event_id: str) -> List[Dict[str, Any]]:
        """Get full purpose lineage for audit"""
        return self._purpose_lineage.get(event_id, [])


# ============== Replay & Volume Protection ==============

class ReplayProtectionService:
    """
    Protects against replay attacks and volume flooding.
    
    Attacks:
    - Replay valid events at scale
    - Inflate attribution
    - Overwhelm gateway (cheap traffic)
    
    Defenses:
    - Event-level idempotency keys
    - Rate limits per issuer + destination
    - Sliding window anomaly detection
    - Duplicate hash rejection
    """
    
    def __init__(self):
        # Event hash tracking
        self._event_hashes: Dict[str, datetime] = {}
        self._hash_lock = threading.Lock()
        
        # Rate limiting per issuer
        self._request_counts: Dict[str, List[datetime]] = defaultdict(list)
        
        # Anomaly detection baselines
        self._baselines: Dict[str, TrafficPattern] = {}
        
        # Thresholds
        self.hash_ttl_seconds = 3600  # 1 hour
        self.rate_window_seconds = 60
        self.anomaly_threshold = 3.0  # Standard deviations
    
    def check_duplicate_hash(self, event_hash: str) -> Tuple[bool, Optional[str]]:
        """Check if event hash has been seen before"""
        with self._hash_lock:
            now = datetime.now(timezone.utc)
            
            if event_hash in self._event_hashes:
                first_seen = self._event_hashes[event_hash]
                return True, f"Duplicate event detected, first seen at {first_seen.isoformat()}"
            
            # Record hash
            self._event_hashes[event_hash] = now
            
            # Cleanup old hashes
            if len(self._event_hashes) > 1000000:
                cutoff = now - timedelta(seconds=self.hash_ttl_seconds)
                self._event_hashes = {
                    k: v for k, v in self._event_hashes.items()
                    if v > cutoff
                }
            
            return False, None
    
    def check_rate_limit(self, issuer_id: str, destination: str,
                        limit: int = 1000) -> Tuple[bool, int]:
        """Check rate limit for issuer + destination pair"""
        key = f"{issuer_id}:{destination}"
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=self.rate_window_seconds)
        
        # Get recent requests
        recent = [ts for ts in self._request_counts[key] if ts > cutoff]
        self._request_counts[key] = recent
        
        count = len(recent)
        
        if count >= limit:
            return True, count  # Rate limited
        
        # Record this request
        self._request_counts[key].append(now)
        
        return False, count
    
    def detect_anomaly(self, tenant_id: str, current_count: int,
                      current_error_rate: float) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Detect traffic anomalies using baseline comparison"""
        baseline = self._baselines.get(tenant_id)
        
        if not baseline:
            # No baseline yet, create one
            self._baselines[tenant_id] = TrafficPattern(
                tenant_id=tenant_id,
                window_start=datetime.now(timezone.utc),
                request_count=current_count,
                error_rate=current_error_rate
            )
            return False, None
        
        # Calculate deviation
        count_deviation = abs(current_count - baseline.request_count) / max(baseline.request_count, 1)
        error_deviation = abs(current_error_rate - baseline.error_rate) / max(baseline.error_rate, 0.01)
        
        anomalies = {}
        
        if count_deviation > self.anomaly_threshold:
            anomalies["request_count"] = {
                "baseline": baseline.request_count,
                "current": current_count,
                "deviation": count_deviation
            }
        
        if error_deviation > self.anomaly_threshold:
            anomalies["error_rate"] = {
                "baseline": baseline.error_rate,
                "current": current_error_rate,
                "deviation": error_deviation
            }
        
        if anomalies:
            return True, {
                "tenant_id": tenant_id,
                "anomalies": anomalies,
                "evidence": "Traffic pattern anomaly detected"
            }
        
        # Update baseline with exponential moving average
        alpha = 0.1
        baseline.request_count = int(alpha * current_count + (1 - alpha) * baseline.request_count)
        baseline.error_rate = alpha * current_error_rate + (1 - alpha) * baseline.error_rate
        
        return False, None
    
    def compute_event_fingerprint(self, event_data: Dict[str, Any]) -> str:
        """Compute a fingerprint for duplicate detection"""
        # Include all identifying fields
        key_fields = ["user_id", "event_type", "vendor", "url", "value"]
        fingerprint_data = {k: event_data.get(k) for k in key_fields if k in event_data}
        
        import json
        return hashlib.sha256(json.dumps(fingerprint_data, sort_keys=True).encode()).hexdigest()


# ============== Traffic Authentication ==============

class TrafficAuthenticator:
    """
    Authenticates real traffic.
    
    Must prove: "This event came from this customer, this app, this environment."
    
    Controls:
    - mTLS between customer servers and gateway
    - Org-scoped API keys
    - Environment binding (prod ≠ dev)
    - Origin allowlists
    """
    
    def __init__(self):
        # Origin configurations per tenant
        self._origin_configs: Dict[str, OriginConfig] = {}
        
        # Environment bindings
        self._env_bindings: Dict[str, Environment] = {}
        
        # API key to environment mapping
        self._key_environments: Dict[str, Environment] = {}
        
        # Initialize demo config
        self._init_demo_config()
    
    def _init_demo_config(self):
        """Initialize demo tenant config"""
        self._origin_configs["demo-tenant"] = OriginConfig(
            tenant_id="demo-tenant",
            allowed_origins=["*"],  # Allow all for demo
            allowed_ip_ranges=["0.0.0.0/0"],  # Allow all for demo
            environment=Environment.DEVELOPMENT
        )
    
    def configure_tenant(self, tenant_id: str, config: OriginConfig):
        """Configure origin allowlist for a tenant"""
        self._origin_configs[tenant_id] = config
    
    def validate_origin(self, tenant_id: str, origin: str) -> Tuple[bool, str]:
        """Validate request origin against allowlist"""
        config = self._origin_configs.get(tenant_id)
        
        if not config:
            return False, "Tenant not configured"
        
        # Check if origin is allowed
        if "*" in config.allowed_origins:
            return True, "OK"
        
        if origin in config.allowed_origins:
            return True, "OK"
        
        # Check domain patterns
        for allowed in config.allowed_origins:
            if allowed.startswith("*."):
                # Wildcard subdomain
                domain = allowed[2:]
                if origin.endswith(domain):
                    return True, "OK"
        
        return False, f"Origin not allowed: {origin}"
    
    def validate_ip(self, tenant_id: str, ip_address: str) -> Tuple[bool, str]:
        """Validate request IP against allowlist"""
        config = self._origin_configs.get(tenant_id)
        
        if not config:
            return False, "Tenant not configured"
        
        # Check if all IPs allowed
        if "0.0.0.0/0" in config.allowed_ip_ranges:
            return True, "OK"
        
        try:
            request_ip = ipaddress.ip_address(ip_address)
            
            for cidr in config.allowed_ip_ranges:
                network = ipaddress.ip_network(cidr, strict=False)
                if request_ip in network:
                    return True, "OK"
            
            return False, f"IP not in allowlist: {ip_address}"
        except ValueError:
            return False, f"Invalid IP address: {ip_address}"
    
    def validate_environment(self, tenant_id: str, api_key_hash: str,
                            claimed_env: Environment) -> Tuple[bool, str]:
        """Validate that API key matches claimed environment"""
        key_env = self._key_environments.get(api_key_hash)
        
        if not key_env:
            # No binding, allow but warn
            return True, "No environment binding"
        
        if key_env != claimed_env:
            return False, f"Environment mismatch: key is for {key_env.value}, claimed {claimed_env.value}"
        
        return True, "OK"
    
    def bind_key_to_environment(self, api_key_hash: str, environment: Environment):
        """Bind an API key to a specific environment"""
        self._key_environments[api_key_hash] = environment
    
    def validate_mtls(self, client_cert_fingerprint: Optional[str],
                     tenant_id: str) -> Tuple[bool, str]:
        """Validate mTLS client certificate"""
        config = self._origin_configs.get(tenant_id)
        
        if not config:
            return False, "Tenant not configured"
        
        if not config.require_mtls:
            return True, "mTLS not required"
        
        if not client_cert_fingerprint:
            return False, "mTLS required but no client certificate provided"
        
        # In production, validate against stored cert fingerprints
        # For now, just check presence
        return True, "OK"
    
    def authenticate_request(self, tenant_id: str, origin: Optional[str],
                            ip_address: str, api_key_hash: str,
                            claimed_env: Environment = Environment.PRODUCTION,
                            client_cert: Optional[str] = None) -> Tuple[bool, List[str]]:
        """Full authentication check for a request"""
        errors = []
        
        # Check origin
        if origin:
            valid, msg = self.validate_origin(tenant_id, origin)
            if not valid:
                errors.append(msg)
        
        # Check IP
        valid, msg = self.validate_ip(tenant_id, ip_address)
        if not valid:
            errors.append(msg)
        
        # Check environment
        valid, msg = self.validate_environment(tenant_id, api_key_hash, claimed_env)
        if not valid:
            errors.append(msg)
        
        # Check mTLS
        valid, msg = self.validate_mtls(client_cert, tenant_id)
        if not valid:
            errors.append(msg)
        
        return len(errors) == 0, errors


# ============== Unified Security Service ==============

class SecurityService:
    """
    Unified security service combining all defenses.
    """
    
    def __init__(self):
        self.token_security = TokenSecurityService()
        self.shadow_detector = ShadowPipelineDetector()
        self.purpose_enforcer = PurposeLimitationEnforcer()
        self.replay_protection = ReplayProtectionService()
        self.traffic_auth = TrafficAuthenticator()
        
        # Security event log
        self._security_events: List[SecurityEvent] = []
        self._events_lock = threading.Lock()
    
    def log_security_event(self, event: SecurityEvent):
        """Log a security event"""
        with self._events_lock:
            self._security_events.append(event)
            # Keep last 10000 events
            if len(self._security_events) > 10000:
                self._security_events = self._security_events[-10000:]
    
    def get_security_events(self, tenant_id: str = None,
                           event_type: SecurityEventType = None,
                           limit: int = 100) -> List[SecurityEvent]:
        """Get recent security events"""
        events = self._security_events
        
        if tenant_id:
            events = [e for e in events if e.tenant_id == tenant_id]
        
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        
        return sorted(events, key=lambda e: e.timestamp, reverse=True)[:limit]
    
    def validate_event_submission(self, tenant_id: str, event_data: Dict[str, Any],
                                  token_claims: Dict[str, Any],
                                  request_context: Dict[str, Any]) -> Tuple[bool, List[str], List[SecurityEvent]]:
        """
        Full security validation for an event submission.
        
        Returns:
        - allowed: bool
        - violations: list of violation messages
        - security_events: list of security events to log
        """
        violations = []
        security_events = []
        
        # 1. Token validation
        token_violations = self.token_security.validate_token_binding(token_claims, request_context)
        violations.extend(token_violations)
        
        # 2. Check for token replay
        token_fp = self.token_security.fingerprint_token(request_context.get("token_string", ""))
        is_replay, msg = self.token_security.check_token_replay(token_fp, token_claims.get("jti", ""))
        if is_replay:
            violations.append(msg)
            security_events.append(SecurityEvent(
                id=secrets.token_urlsafe(16),
                tenant_id=tenant_id,
                event_type=SecurityEventType.TOKEN_REPLAY,
                threat_level=ThreatLevel.HIGH,
                description=msg,
                evidence={"token_fingerprint": token_fp},
                source_ip=request_context.get("ip_address"),
                blocked=True
            ))
        
        # 3. Check for duplicate events
        event_hash = self.replay_protection.compute_event_fingerprint(event_data)
        is_duplicate, msg = self.replay_protection.check_duplicate_hash(event_hash)
        if is_duplicate:
            violations.append(msg)
            security_events.append(SecurityEvent(
                id=secrets.token_urlsafe(16),
                tenant_id=tenant_id,
                event_type=SecurityEventType.REPLAY_ATTACK,
                threat_level=ThreatLevel.MEDIUM,
                description=msg,
                evidence={"event_hash": event_hash},
                source_ip=request_context.get("ip_address"),
                blocked=True
            ))
        
        # 4. Check rate limits
        is_limited, count = self.replay_protection.check_rate_limit(
            tenant_id,
            event_data.get("vendor", "unknown")
        )
        if is_limited:
            msg = f"Rate limit exceeded: {count} requests"
            violations.append(msg)
            security_events.append(SecurityEvent(
                id=secrets.token_urlsafe(16),
                tenant_id=tenant_id,
                event_type=SecurityEventType.VOLUME_FLOOD,
                threat_level=ThreatLevel.MEDIUM,
                description=msg,
                evidence={"request_count": count},
                source_ip=request_context.get("ip_address"),
                blocked=True
            ))
        
        # 5. Check purpose binding
        event_id = event_data.get("event_id", "")
        purpose = event_data.get("purpose", token_claims.get("purposes", {}).keys())
        if isinstance(purpose, dict):
            purpose = list(purpose.keys())
        
        for p in (purpose if isinstance(purpose, list) else [purpose]):
            is_reuse, msg = self.purpose_enforcer.check_cross_purpose_reuse(event_id, p)
            if is_reuse:
                violations.append(msg)
                security_events.append(SecurityEvent(
                    id=secrets.token_urlsafe(16),
                    tenant_id=tenant_id,
                    event_type=SecurityEventType.CROSS_PURPOSE_REUSE,
                    threat_level=ThreatLevel.HIGH,
                    description=msg,
                    evidence={"event_id": event_id, "purpose": p},
                    flagged=True
                ))
        
        # 6. Check shadow pipeline indicators
        is_parallel, evidence = self.shadow_detector.detect_parallel_submission(
            event_data.get("user_id", ""),
            event_data.get("vendor", ""),
            event_data.get("event_type", "")
        )
        if is_parallel:
            violations.append("Parallel submission detected")
            security_events.append(SecurityEvent(
                id=secrets.token_urlsafe(16),
                tenant_id=tenant_id,
                event_type=SecurityEventType.PARALLEL_SUBMISSION,
                threat_level=ThreatLevel.CRITICAL,
                description="Parallel submission to multiple destinations detected",
                evidence=evidence,
                flagged=True,
                vendor_notified=True
            ))
        
        # Log all security events
        for event in security_events:
            self.log_security_event(event)
        
        # Determine if request should be blocked
        high_severity_events = [e for e in security_events if e.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]]
        should_block = len(high_severity_events) > 0 or len(violations) > 2
        
        return not should_block, violations, security_events
    
    def get_threat_summary(self, tenant_id: str = None) -> Dict[str, Any]:
        """Get summary of recent threats"""
        events = self.get_security_events(tenant_id)
        
        by_type = defaultdict(int)
        by_level = defaultdict(int)
        blocked_count = 0
        
        for event in events:
            by_type[event.event_type.value] += 1
            by_level[event.threat_level.value] += 1
            if event.blocked:
                blocked_count += 1
        
        return {
            "total_events": len(events),
            "blocked": blocked_count,
            "by_type": dict(by_type),
            "by_level": dict(by_level)
        }


# Singleton instance
security_service = SecurityService()
