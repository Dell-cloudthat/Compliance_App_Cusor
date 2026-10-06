"""
SecurityOS JWT Verification

Verifies OIDC access tokens and returns a validated claims dict.

Environment variables:
  AUTH_ISSUER          — OIDC issuer URL (e.g. https://login.microsoftonline.com/{tenant}/v2.0)
  AUTH_AUDIENCE        — Expected token audience (e.g. api://securityos)
  AUTH_JWKS_URL        — JWKS endpoint URL (overrides discovery; optional)
  AUTH_DEV_PRIVATE_KEY_PATH — Path to local RSA private key PEM (dev/test only)
  ENV                  — "dev" | "test" | "prod"  (defaults to "dev")

Compatible with Microsoft Entra External ID, Auth0, and any OIDC-conformant IdP
without code changes — only environment variables differ.

Security invariants:
  - alg=none tokens are always rejected.
  - Expired tokens are always rejected (exp claim).
  - Wrong issuer or audience → 401 (never 403).
  - JWKS responses are cached with a configurable TTL (default 300 s).
  - Dev mode is refused to start when ENV=prod.
"""

from __future__ import annotations

import logging
import os
import time
import threading
from typing import Any, Dict, Optional

from jose import JWTError, jwk, jwt
from jose.exceptions import ExpiredSignatureError

logger = logging.getLogger("securityos.auth.jwt")

# ── Configuration ─────────────────────────────────────────────────────────────

ENV: str = os.environ.get("ENV", "dev").lower()
AUTH_ISSUER: str = os.environ.get("AUTH_ISSUER", "")
AUTH_AUDIENCE: str = os.environ.get("AUTH_AUDIENCE", "")
AUTH_JWKS_URL: str = os.environ.get("AUTH_JWKS_URL", "")
AUTH_DEV_PRIVATE_KEY_PATH: str = os.environ.get("AUTH_DEV_PRIVATE_KEY_PATH", "")

JWKS_CACHE_TTL: int = int(os.environ.get("AUTH_JWKS_CACHE_TTL_SECONDS", "300"))

# ── Guard: refuse dev mode in production ─────────────────────────────────────

def _check_dev_mode_safety() -> None:
    if ENV == "prod" and AUTH_DEV_PRIVATE_KEY_PATH:
        raise RuntimeError(
            "AUTH_DEV_PRIVATE_KEY_PATH must not be set when ENV=prod. "
            "Remove the env var or fix the ENV value."
        )

_check_dev_mode_safety()

# ── JWKS cache ────────────────────────────────────────────────────────────────

_jwks_cache: Optional[Dict] = None
_jwks_fetched_at: float = 0.0
_jwks_lock = threading.Lock()


def _fetch_jwks(jwks_url: str) -> Dict:
    """Fetch JWKS from the IdP.  Raises RuntimeError on HTTP failure."""
    import httpx  # lazy import keeps startup fast in dev mode

    try:
        resp = httpx.get(jwks_url, timeout=10.0)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch JWKS from {jwks_url}: {exc}") from exc


def _get_jwks(jwks_url: str) -> Dict:
    """Return cached JWKS, refreshing when the TTL has elapsed."""
    global _jwks_cache, _jwks_fetched_at

    with _jwks_lock:
        if _jwks_cache is None or (time.time() - _jwks_fetched_at) > JWKS_CACHE_TTL:
            _jwks_cache = _fetch_jwks(jwks_url)
            _jwks_fetched_at = time.time()
            logger.debug("JWKS refreshed from %s", jwks_url)
        return _jwks_cache


# ── Dev-mode local RSA key ────────────────────────────────────────────────────

def _load_dev_private_key() -> Any:
    """Load the local RSA private key for dev/test token signing."""
    path = AUTH_DEV_PRIVATE_KEY_PATH
    if not path:
        raise RuntimeError(
            "AUTH_DEV_PRIVATE_KEY_PATH is not set. "
            "Generate a key with: openssl genrsa -out dev_key.pem 2048"
        )
    with open(path, "rb") as fh:
        return fh.read()


def _get_dev_public_key() -> Any:
    """Return the RSA public key derived from the dev private key, as a JWK dict."""
    from cryptography.hazmat.primitives.serialization import (
        Encoding, PublicFormat, load_pem_private_key
    )
    import json

    private_pem = _load_dev_private_key()
    private_key = load_pem_private_key(private_pem, password=None)
    pub_pem = private_key.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)

    # Build a minimal JWK from the RSA public key
    from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
    pub_key: RSAPublicKey = private_key.public_key()  # type: ignore[assignment]
    pub_numbers = pub_key.public_numbers()

    def _int_to_base64url(n: int) -> str:
        import base64
        length = (n.bit_length() + 7) // 8
        b = n.to_bytes(length, "big")
        return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

    return {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "n": _int_to_base64url(pub_numbers.n),
        "e": _int_to_base64url(pub_numbers.e),
    }


def sign_dev_token(
    claims: Dict[str, Any],
    *,
    expires_in: int = 3600,
    algorithm: str = "RS256",
) -> str:
    """
    Sign a JWT with the local dev RSA private key.
    Only available when ENV != prod.  Used by tests to generate valid tokens.
    """
    if ENV == "prod":
        raise RuntimeError("sign_dev_token must not be called in prod")

    import time as _time

    now = int(_time.time())
    payload = {
        "iss": AUTH_ISSUER or "http://localhost/dev-issuer",
        "aud": AUTH_AUDIENCE or "securityos-dev",
        "iat": now,
        "exp": now + expires_in,
        **claims,
    }
    private_pem = _load_dev_private_key()
    return jwt.encode(payload, private_pem, algorithm=algorithm)


# ── Core verification ──────────────────────────────────────────────────────────

class TokenError(Exception):
    """Raised when a token cannot be validated.  Always maps to HTTP 401."""

    def __init__(self, message: str, *, fatal: bool = False) -> None:
        """
        Args:
            message: Human-readable reason for the rejection.
            fatal: When True, the caller must NOT fall through to alternate verifiers
                   (e.g. an expired token should never be re-checked against JWKS).
        """
        super().__init__(message)
        self.message = message
        self.fatal = fatal


def _resolve_jwks_url() -> str:
    """Return the JWKS URL from config or OIDC discovery."""
    if AUTH_JWKS_URL:
        return AUTH_JWKS_URL

    if not AUTH_ISSUER:
        raise TokenError("AUTH_ISSUER is not configured; cannot discover JWKS.")

    issuer = AUTH_ISSUER.rstrip("/")
    return f"{issuer}/.well-known/jwks.json"


def _verify_with_jwks(token: str, jwks_url: str) -> Dict[str, Any]:
    """Try each key in the JWKS until one verifies the token."""
    jwks_data = _get_jwks(jwks_url)
    keys = jwks_data.get("keys", [])
    if not keys:
        raise TokenError("JWKS endpoint returned no keys.")

    options = {
        "verify_exp": True,
        "verify_aud": bool(AUTH_AUDIENCE),
        "verify_iss": bool(AUTH_ISSUER),
    }
    audience = AUTH_AUDIENCE or None
    issuer = AUTH_ISSUER or None

    last_exc: Optional[Exception] = None
    for key_data in keys:
        try:
            public_key = jwk.construct(key_data)
            claims = jwt.decode(
                token,
                public_key,
                algorithms=["RS256", "ES256"],
                audience=audience,
                issuer=issuer,
                options=options,
            )
            return claims
        except ExpiredSignatureError:
            raise TokenError("Token has expired.")
        except JWTError as exc:
            last_exc = exc
            continue

    raise TokenError(f"Token signature verification failed: {last_exc}")


def _verify_with_dev_key(token: str) -> Dict[str, Any]:
    """Verify a token signed by the local dev RSA key."""
    pub_jwk = _get_dev_public_key()
    public_key = jwk.construct(pub_jwk)

    options = {
        "verify_exp": True,
        "verify_aud": False,  # dev tokens skip audience check
        "verify_iss": False,  # dev tokens skip issuer check
    }

    try:
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options=options,
        )
    except ExpiredSignatureError:
        # Mark as fatal: an expired token must not be re-tried against JWKS.
        raise TokenError("Token has expired.", fatal=True)
    except JWTError as exc:
        # Signature mismatch — may be a valid OIDC token; allow fall-through.
        raise TokenError(f"Dev token verification failed: {exc}")

    return claims


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify a JWT and return its claims.

    Strategy:
    1. Always reject alg=none.
    2. In dev/test mode with a local key configured: try dev key first,
       fall back to JWKS if it fails (allows hybrid local+real IdP testing).
    3. Otherwise: verify against JWKS.

    Raises TokenError (→ HTTP 401) on any failure.
    """
    if not token:
        raise TokenError("No token provided.")

    # Reject alg=none without decoding — inspect the header manually
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise TokenError(f"Malformed token header: {exc}")

    if unverified_header.get("alg", "").lower() == "none":
        raise TokenError("Tokens with alg=none are not accepted.")

    # Dev/test mode with local key
    if ENV in ("dev", "test") and AUTH_DEV_PRIVATE_KEY_PATH:
        try:
            return _verify_with_dev_key(token)
        except TokenError as exc:
            if exc.fatal:
                raise  # expired / obviously invalid — don't retry against JWKS
            pass  # signature mismatch — may be a real OIDC token; fall through

    # Production / OIDC path
    if not AUTH_ISSUER and not AUTH_JWKS_URL:
        # No IdP configured at all — only valid in pure dev/test without JWKS
        raise TokenError(
            "No AUTH_ISSUER or AUTH_JWKS_URL configured.  "
            "Set AUTH_DEV_PRIVATE_KEY_PATH for local dev tokens or configure an OIDC IdP."
        )

    jwks_url = _resolve_jwks_url()
    return _verify_with_jwks(token, jwks_url)
