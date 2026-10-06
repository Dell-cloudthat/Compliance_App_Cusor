"""
SecurityOS JWT Verification — Phase 1.1

Verifies OIDC access tokens and returns a validated claims dict.

Environment variables:
  AUTH_ISSUER          — OIDC issuer URL (required in prod)
                         Entra: https://login.microsoftonline.com/{tenant}/v2.0
                         Auth0: https://your-domain.auth0.com/
  AUTH_AUDIENCE        — Expected token audience (required in prod)
  AUTH_JWKS_URL        — Explicit JWKS endpoint URL (optional; overrides discovery)
  AUTH_DEV_PRIVATE_KEY_PATH — Path to local RSA private key PEM (dev/test ONLY)
  AUTH_JWKS_CACHE_TTL_SECONDS — JWKS cache TTL in seconds (default 300)
  ENV                  — "dev" | "test" | "prod" (DEFAULT: "prod")

Security invariants:
  - alg=none tokens are always rejected before any crypto.
  - Expired tokens are always rejected and never fall-through to another verifier.
  - Wrong issuer or audience → 401.
  - iss and aud are ALWAYS verified on the JWKS path (no opt-out).
  - JWKS is selected by kid; unknown kid triggers exactly one refresh, then fails.
  - JWKS and OIDC discovery responses are TTL-cached (never per-request HTTP).
  - JWKS fetch runs in a thread-pool; never blocks the asyncio event loop.
  - Dev mode (AUTH_DEV_PRIVATE_KEY_PATH) is refused in ENV=prod.
  - In ENV=prod, AUTH_ISSUER and AUTH_AUDIENCE must be set or startup fails.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any, Dict, List, Optional

from jose import JWTError, jwk, jwt
from jose.exceptions import ExpiredSignatureError

logger = logging.getLogger("securityos.auth.jwt")

# ── Configuration ─────────────────────────────────────────────────────────────

ENV: str = os.environ.get("ENV", "prod").lower()
AUTH_ISSUER: str = os.environ.get("AUTH_ISSUER", "")
AUTH_AUDIENCE: str = os.environ.get("AUTH_AUDIENCE", "")
AUTH_JWKS_URL: str = os.environ.get("AUTH_JWKS_URL", "")
AUTH_DEV_PRIVATE_KEY_PATH: str = os.environ.get("AUTH_DEV_PRIVATE_KEY_PATH", "")

JWKS_CACHE_TTL: int = int(os.environ.get("AUTH_JWKS_CACHE_TTL_SECONDS", "300"))

_ENV_IS_DEV: bool = ENV in ("dev", "test")

# ── Startup guards ────────────────────────────────────────────────────────────

def _check_dev_mode_safety() -> None:
    """Refuse to start if dev key is present in production."""
    if ENV == "prod" and AUTH_DEV_PRIVATE_KEY_PATH:
        raise RuntimeError(
            "AUTH_DEV_PRIVATE_KEY_PATH must not be set when ENV=prod. "
            "Remove the env var or fix the ENV value."
        )


def validate_prod_config() -> None:
    """
    Validate that all required configuration is present for production.
    Call this from startup handlers.  Safe to call in dev/test (no-op).
    Raises RuntimeError with a clear message if config is missing.
    """
    if ENV == "prod":
        missing = []
        if not AUTH_ISSUER:
            missing.append("AUTH_ISSUER")
        if not AUTH_AUDIENCE:
            missing.append("AUTH_AUDIENCE")
        if missing:
            raise RuntimeError(
                f"Missing required config for ENV=prod: {', '.join(missing)}. "
                "Set these environment variables before starting SecurityOS in production."
            )


_check_dev_mode_safety()

# ── kid-forced-refresh rate limiter ───────────────────────────────────────────
# A token with an unknown kid triggers a JWKS refresh.  Without a cooldown an
# attacker can send a flood of tokens with random kids and hammer the IdP's
# JWKS endpoint.  We enforce a minimum 60 s between forced refreshes.
# Within the window an unknown kid → TokenError(fatal=True) with no HTTP call.

KID_REFRESH_MIN_INTERVAL: int = int(
    os.environ.get("AUTH_KID_REFRESH_MIN_INTERVAL_SECONDS", "60")
)
_kid_refresh_last_at: float = 0.0
_kid_refresh_lock = threading.Lock()

# Monotonic counter — incremented only when a refresh is actually performed.
_jwks_kid_refresh_count: int = 0


def get_jwks_kid_refresh_count() -> int:
    return _jwks_kid_refresh_count


def reset_jwks_kid_refresh_count() -> None:
    global _jwks_kid_refresh_count
    _jwks_kid_refresh_count = 0


def get_kid_refresh_last_at() -> float:
    with _kid_refresh_lock:
        return _kid_refresh_last_at


def reset_kid_refresh_last_at() -> None:
    global _kid_refresh_last_at
    with _kid_refresh_lock:
        _kid_refresh_last_at = 0.0


# ── OIDC discovery cache ──────────────────────────────────────────────────────

_oidc_config_cache: Optional[Dict] = None
_oidc_config_fetched_at: float = 0.0
_oidc_config_lock = threading.Lock()


def _fetch_json(url: str) -> Dict:
    """Blocking HTTP GET that returns parsed JSON. Raises RuntimeError on failure."""
    import httpx  # lazy import — fast startup

    try:
        resp = httpx.get(url, timeout=10.0)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        raise RuntimeError(f"HTTP GET {url} failed: {exc}") from exc


def _get_jwks_uri_from_discovery(issuer: str) -> str:
    """
    Fetch the OIDC discovery document and extract jwks_uri.
    Cached for JWKS_CACHE_TTL seconds (same TTL as JWKS itself).
    This is the correct way to find the JWKS URL for Entra External ID,
    Auth0, and any OIDC-conformant IdP.
    """
    global _oidc_config_cache, _oidc_config_fetched_at

    with _oidc_config_lock:
        age = time.time() - _oidc_config_fetched_at
        if _oidc_config_cache is None or age > JWKS_CACHE_TTL:
            discovery_url = f"{issuer.rstrip('/')}/.well-known/openid-configuration"
            logger.debug("Fetching OIDC discovery from %s", discovery_url)
            _oidc_config_cache = _fetch_json(discovery_url)
            _oidc_config_fetched_at = time.time()

        jwks_uri = _oidc_config_cache.get("jwks_uri")
        if not jwks_uri:
            raise RuntimeError(
                f"OIDC discovery document at {issuer} did not contain 'jwks_uri'."
            )
        return jwks_uri


# ── JWKS cache ────────────────────────────────────────────────────────────────

_jwks_cache: Optional[Dict] = None
_jwks_fetched_at: float = 0.0
_jwks_lock = threading.Lock()


def _get_jwks(jwks_url: str, *, force: bool = False) -> Dict:
    """
    Return cached JWKS, refreshing when the TTL has elapsed or force=True.
    Thread-safe.
    """
    global _jwks_cache, _jwks_fetched_at

    with _jwks_lock:
        age = time.time() - _jwks_fetched_at
        if force or _jwks_cache is None or age > JWKS_CACHE_TTL:
            logger.debug("Refreshing JWKS from %s (force=%s)", jwks_url, force)
            _jwks_cache = _fetch_json(jwks_url)
            _jwks_fetched_at = time.time()
        return _jwks_cache


def _resolve_jwks_url() -> str:
    """
    Return the JWKS URL to use.
    Priority: explicit AUTH_JWKS_URL > OIDC discovery from AUTH_ISSUER.
    """
    if AUTH_JWKS_URL:
        return AUTH_JWKS_URL

    if not AUTH_ISSUER:
        raise TokenError(
            "AUTH_ISSUER is not configured; cannot discover JWKS. "
            "Set AUTH_ISSUER (and AUTH_AUDIENCE) or AUTH_JWKS_URL.",
            fatal=True,
        )

    return _get_jwks_uri_from_discovery(AUTH_ISSUER)


# ── Dev-mode local RSA key ────────────────────────────────────────────────────

def _load_dev_private_key() -> bytes:
    """Load the local RSA private key for dev/test token signing."""
    path = AUTH_DEV_PRIVATE_KEY_PATH
    if not path:
        raise RuntimeError(
            "AUTH_DEV_PRIVATE_KEY_PATH is not set. "
            "Generate a key with: openssl genrsa -out dev_key.pem 2048"
        )
    with open(path, "rb") as fh:
        return fh.read()


def _get_dev_public_key_jwk() -> Dict:
    """Return the RSA public key derived from the dev private key as a JWK dict."""
    import base64

    from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
    from cryptography.hazmat.primitives.serialization import load_pem_private_key

    private_pem = _load_dev_private_key()
    private_key = load_pem_private_key(private_pem, password=None)
    pub_key: RSAPublicKey = private_key.public_key()  # type: ignore[assignment]
    pub_numbers = pub_key.public_numbers()

    def _int_to_b64url(n: int) -> str:
        length = (n.bit_length() + 7) // 8
        return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode()

    return {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": "dev-key-1",
        "n": _int_to_b64url(pub_numbers.n),
        "e": _int_to_b64url(pub_numbers.e),
    }


def sign_dev_token(
    claims: Dict[str, Any],
    *,
    expires_in: int = 3600,
    algorithm: str = "RS256",
    kid: str = "dev-key-1",
) -> str:
    """
    Sign a JWT with the local dev RSA private key.
    Only usable when ENV != prod.  Used by tests to generate valid tokens.
    """
    if ENV == "prod":
        raise RuntimeError("sign_dev_token must not be called in prod.")

    now = int(time.time())
    payload: Dict[str, Any] = {
        "iss": AUTH_ISSUER or "http://localhost/dev-issuer",
        "aud": AUTH_AUDIENCE or "securityos-dev",
        "iat": now,
        "exp": now + expires_in,
        **claims,
    }
    private_pem = _load_dev_private_key()
    return jwt.encode(payload, private_pem, algorithm=algorithm, headers={"kid": kid})


# ── Core exception ────────────────────────────────────────────────────────────

class TokenError(Exception):
    """Raised when a token cannot be validated.  Always maps to HTTP 401."""

    def __init__(self, message: str, *, fatal: bool = False) -> None:
        """
        Args:
            message: Human-readable rejection reason.
            fatal: When True, callers must NOT fall through to alternate verifiers
                   (e.g. an expired token should never be re-checked against JWKS).
        """
        super().__init__(message)
        self.message = message
        self.fatal = fatal


# ── JWKS verification with kid matching ──────────────────────────────────────

def _decode_with_key(token: str, key_data: Dict, *, verify_iss: bool, verify_aud: bool) -> Dict[str, Any]:
    """Attempt to decode a token with a single JWK.  Raises JWTError on failure."""
    public_key = jwk.construct(key_data)
    options = {
        "verify_exp": True,
        "verify_aud": verify_aud,
        "verify_iss": verify_iss,
    }
    audience = AUTH_AUDIENCE if verify_aud else None
    issuer = AUTH_ISSUER if verify_iss else None
    return jwt.decode(
        token,
        public_key,
        algorithms=["RS256", "ES256"],
        audience=audience,
        issuer=issuer,
        options=options,
    )


def _verify_with_jwks(token: str, jwks_url: str, header: Dict) -> Dict[str, Any]:
    """
    Verify token against JWKS, selecting by kid.

    kid matching strategy:
    1. If header has kid, find matching key in JWKS.
    2. If not found, force-refresh JWKS once (counts toward _jwks_kid_refresh_count).
    3. If still not found, fail (fatal).
    4. If header has no kid, try all keys.

    iss and aud are always verified.
    """
    global _jwks_kid_refresh_count, _kid_refresh_last_at

    token_kid: Optional[str] = header.get("kid")

    def _keys_to_try(jwks_data: Dict) -> List[Dict]:
        all_keys = jwks_data.get("keys", [])
        if not all_keys:
            raise TokenError("JWKS endpoint returned no keys.", fatal=True)
        if token_kid:
            matched = [k for k in all_keys if k.get("kid") == token_kid]
            return matched
        return all_keys

    jwks_data = _get_jwks(jwks_url)
    candidates = _keys_to_try(jwks_data)

    # Unknown kid — refresh once, subject to a minimum 60 s cooldown.
    # Without the cooldown an attacker could send a flood of tokens with random
    # kids and hammer the IdP's JWKS endpoint.  Within the window we return
    # a fatal 401 without making any outbound HTTP call.
    if token_kid and not candidates:
        with _kid_refresh_lock:
            now = time.time()
            if (now - _kid_refresh_last_at) < KID_REFRESH_MIN_INTERVAL:
                raise TokenError(
                    f"Unknown key ID '{token_kid}'; JWKS refresh is on cooldown. "
                    "Try again later.",
                    fatal=True,
                )
            # Mark the timestamp before the fetch so concurrent requests that
            # race through the lock also back off for the cooldown window.
            _kid_refresh_last_at = now
        _jwks_kid_refresh_count += 1
        logger.info("Unknown kid '%s' — refreshing JWKS (refresh #%d)", token_kid, _jwks_kid_refresh_count)
        jwks_data = _get_jwks(jwks_url, force=True)
        candidates = _keys_to_try(jwks_data)
        if not candidates:
            raise TokenError(
                f"Unknown key ID '{token_kid}'. "
                "The token was signed with a key not in the IdP's JWKS.",
                fatal=True,
            )

    last_exc: Optional[Exception] = None
    for key_data in candidates:
        try:
            return _decode_with_key(token, key_data, verify_iss=True, verify_aud=True)
        except ExpiredSignatureError:
            raise TokenError("Token has expired.", fatal=True)
        except JWTError as exc:
            last_exc = exc
            continue

    raise TokenError(f"Token signature verification failed: {last_exc}")


# ── Dev-key verification ───────────────────────────────────────────────────────

def _verify_with_dev_key(token: str) -> Dict[str, Any]:
    """Verify a token signed by the local dev RSA key. Skips iss/aud checks."""
    pub_jwk = _get_dev_public_key_jwk()
    try:
        return _decode_with_key(token, pub_jwk, verify_iss=False, verify_aud=False)
    except ExpiredSignatureError:
        raise TokenError("Token has expired.", fatal=True)
    except JWTError as exc:
        # Signature mismatch — may be a real OIDC token; allow fall-through.
        raise TokenError(f"Dev token verification failed: {exc}")


# ── Public entry point ────────────────────────────────────────────────────────

def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify a JWT and return its claims.

    This is a synchronous, blocking function intended to be called via
    asyncio.get_running_loop().run_in_executor() from async contexts so the
    event loop is never blocked during JWKS or OIDC discovery fetches.

    Strategy:
    1. Reject alg=none immediately.
    2. In dev/test with AUTH_DEV_PRIVATE_KEY_PATH: try dev key first.
       - Expiry failure → fatal 401 (no fall-through).
       - Signature mismatch → fall through to JWKS.
    3. Try JWKS (always in prod; fallback in dev/test).

    Raises TokenError (→ HTTP 401) on any failure.
    """
    if not token:
        raise TokenError("No token provided.")

    # Reject alg=none before any crypto
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise TokenError(f"Malformed token header: {exc}")

    if header.get("alg", "").lower() == "none":
        raise TokenError("Tokens with alg=none are not accepted.")

    # Dev/test mode with local key
    if _ENV_IS_DEV and AUTH_DEV_PRIVATE_KEY_PATH:
        try:
            return _verify_with_dev_key(token)
        except TokenError as exc:
            if exc.fatal:
                raise  # expired / obviously invalid — don't retry against JWKS
            # Signature mismatch — may be a real OIDC token; fall through

    # JWKS path (always in prod; fallback in dev/test)
    if not AUTH_ISSUER and not AUTH_JWKS_URL:
        raise TokenError(
            "No AUTH_ISSUER or AUTH_JWKS_URL configured. "
            "Set AUTH_DEV_PRIVATE_KEY_PATH for local dev, or configure an OIDC IdP.",
            fatal=True,
        )

    jwks_url = _resolve_jwks_url()
    return _verify_with_jwks(token, jwks_url, header)
