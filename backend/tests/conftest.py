"""
Pytest fixtures for SecurityOS backend tests.

Sets ENV and AUTH_DEV_PRIVATE_KEY_PATH before any modules that read them at
import time are loaded.  Must be the first conftest evaluated.
"""

import os
import pathlib
import time

# ── Configure dev auth BEFORE importing app modules ───────────────────────────

_KEY_PATH = str(pathlib.Path(__file__).parent / "dev_key.pem")

# Auto-generate a test RSA private key if it doesn't exist.
# This key is ephemeral — do NOT use in production.
if not pathlib.Path(_KEY_PATH).exists():
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives.serialization import (
        Encoding, PrivateFormat, NoEncryption
    )
    _priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pathlib.Path(_KEY_PATH).write_bytes(
        _priv.private_bytes(Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption())
    )

os.environ.setdefault("ENV", "test")
os.environ.setdefault("AUTH_DEV_PRIVATE_KEY_PATH", _KEY_PATH)
os.environ.setdefault("AUTH_ISSUER", "http://localhost/test-issuer")
os.environ.setdefault("AUTH_AUDIENCE", "securityos-test")

import pytest
from fastapi.testclient import TestClient

from backend.securityos_main import app
from backend.auth.jwt import sign_dev_token


@pytest.fixture(scope="session")
def client():
    """A TestClient that shares state across the session (in-memory store)."""
    # Seed org membership so test_auth.py tests can pass permission checks.
    # user-abc has full access to org-test-001 (admin role).
    from datetime import datetime, timezone
    from backend.repositories.org_membership_repo import OrgMembership, org_membership_repo

    now = datetime.now(timezone.utc).isoformat()
    org_membership_repo.add(OrgMembership(
        user_id="user-abc",
        org_id="org-test-001",
        role="admin",
        granted_by="system",
        granted_at=now,
    ))

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


def _make_token(
    *,
    org_id: str = "org-test-001",
    msp_id: str | None = None,
    user_id: str = "user-abc",
    email: str = "test@example.com",
    name: str = "Test User",
    expires_in: int = 3600,
    extra: dict | None = None,
) -> str:
    """Return a signed dev JWT for the given principal."""
    claims: dict = {
        "sub": user_id,
        "email": email,
        "name": name,
        "org_id": org_id,
    }
    if msp_id is not None:
        claims["msp_id"] = msp_id
    if extra:
        claims.update(extra)
    return sign_dev_token(claims, expires_in=expires_in)


@pytest.fixture(scope="session")
def valid_token():
    """A token for org-test-001, no MSP."""
    return _make_token()


@pytest.fixture(scope="session")
def org_b_token():
    """A token for org-B (a different org)."""
    return _make_token(org_id="org-B-999", user_id="user-orgb", email="orgb@example.com")


@pytest.fixture(scope="session")
def msp_token():
    """A token for an MSP user managing msp-test-001."""
    return _make_token(
        org_id="org-msp-internal",
        msp_id="msp-test-001",
        user_id="user-msp",
        email="msp@example.com",
        name="MSP Admin",
    )


@pytest.fixture(scope="session")
def other_msp_token():
    """A token for a different MSP (msp-other-999)."""
    return _make_token(
        org_id="org-other-internal",
        msp_id="msp-other-999",
        user_id="user-other-msp",
        email="other@example.com",
    )


@pytest.fixture(scope="session")
def expired_token():
    """A token that is already expired."""
    return _make_token(expires_in=-1)


@pytest.fixture(scope="session")
def wrong_alg_none_token():
    """
    A token with alg=none crafted manually (not signed).
    We build the header/payload manually and join with dots.
    """
    import base64
    import json as _json

    def _b64(d: dict) -> str:
        return base64.urlsafe_b64encode(_json.dumps(d).encode()).rstrip(b"=").decode()

    header = _b64({"alg": "none", "typ": "JWT"})
    payload = _b64({
        "sub": "attacker",
        "org_id": "org-test-001",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    })
    return f"{header}.{payload}."
