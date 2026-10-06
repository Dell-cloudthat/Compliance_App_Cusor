"""
Phase 1.1 Acceptance Tests — Tenant Isolation Fixes

Tests the following acceptance criteria from the spec:

HTTP integration tests:
  - MSP → unmanaged org (profile/statuses/score/passport/attestations) → 404
  - MSP → managed org (org created via API) → 200
  - Token with `tid` but no `org_id` → 401
  - Body with `attested_by_name` → 422

Unit tests (jwt.py / securityos_main.py):
  - validate_prod_config(): ENV=prod, missing AUTH_AUDIENCE → RuntimeError
  - validate_prod_config(): ENV=prod, missing AUTH_ISSUER → RuntimeError
  - validate_prod_config(): ENV=prod, both set → no error
  - validate_prod_config(): ENV=test → no-op
  - Wrong audience on JWKS path → TokenError
  - Unknown kid triggers exactly one JWKS refresh
"""

import os
import time
from typing import Any, Dict
from unittest.mock import MagicMock, call, patch

import pytest
from fastapi.testclient import TestClient

# conftest sets ENV=test and all required env vars before app import
from backend.auth.jwt import (
    _decode_with_key,
    _get_dev_public_key_jwk,
    _verify_with_jwks,
    get_jwks_kid_refresh_count,
    get_kid_refresh_last_at,
    reset_jwks_kid_refresh_count,
    reset_kid_refresh_last_at,
    sign_dev_token,
    validate_prod_config,
)
from backend.repositories.msp_org_repo import msp_org_repo
from backend.securityos_main import app


# ── Helpers ───────────────────────────────────────────────────────────────────

def _token(
    *,
    org_id: str = "org-test-001",
    msp_id: str | None = None,
    user_id: str = "user-test",
    name: str = "Test User",
    email: str = "test@example.com",
    expires_in: int = 3600,
    extra: dict | None = None,
) -> str:
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


MSP_ID = "msp-p11-test"
MSP_TOKEN = _token(
    org_id="org-msp-internal-p11",
    msp_id=MSP_ID,
    user_id="user-msp-p11",
    email="msp@example.com",
    name="MSP Admin",
)


@pytest.fixture(scope="module")
def client():
    """Module-scoped client so org state persists within this test module."""
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    # Clean up repository entries created during this module
    msp_org_repo._clear()


# ── MSP → unmanaged org → 404 ─────────────────────────────────────────────────

_UNMANAGED_ORG = "org-definitely-not-managed-xyz"

_MSP_ORG_ROUTES: list[tuple[str, str]] = [
    ("GET",  f"/api/v1/securityos/organizations/{_UNMANAGED_ORG}/profile"),
    ("GET",  f"/api/v1/securityos/organizations/{_UNMANAGED_ORG}/statuses"),
    ("GET",  f"/api/v1/securityos/organizations/{_UNMANAGED_ORG}/score"),
    ("GET",  f"/api/v1/securityos/organizations/{_UNMANAGED_ORG}/passport"),
    ("GET",  f"/api/v1/securityos/organizations/{_UNMANAGED_ORG}/attestations"),
]


@pytest.mark.parametrize("method,path", _MSP_ORG_ROUTES)
def test_msp_cannot_access_unmanaged_org(client, method, path):
    """
    An MSP user must get 404 on any org that has NOT been provisioned
    under their msp_id, even if they have a valid JWT.
    """
    resp = getattr(client, method.lower())(
        path, headers={"Authorization": f"Bearer {MSP_TOKEN}"}
    )
    assert resp.status_code == 404, (
        f"MSP→unmanaged org: {method} {path} returned {resp.status_code}, expected 404. "
        f"Body: {resp.text}"
    )


def test_msp_cannot_create_attestation_for_unmanaged_org(client):
    resp = client.post(
        f"/api/v1/securityos/organizations/{_UNMANAGED_ORG}/attestations",
        json={
            "source_name": "Test",
            "source_description": "desc",
            "control_ids": ["CTRL-ID-001"],
            "confirmation_phrase": "ATTEST",
        },
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert resp.status_code == 404


def test_msp_cannot_revoke_attestation_for_unmanaged_org(client):
    resp = client.post(
        f"/api/v1/securityos/organizations/{_UNMANAGED_ORG}/attestations/attest-fake/revoke",
        json={"reason": "test"},
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert resp.status_code == 404


# ── MSP → managed org → 200 ──────────────────────────────────────────────────

def test_msp_can_access_managed_org(client):
    """
    After creating an org via POST /msp/{msp_id}/orgs, the MSP should be
    able to access that org's resources through /organizations/{org_id}/*.
    """
    # Step 1: create org via MSP API (also registers it in msp_org_repo)
    create_resp = client.post(
        f"/api/v1/securityos/msp/{MSP_ID}/orgs",
        json={"name": "Managed Client Corp", "industry": "retail"},
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert create_resp.status_code == 201, (
        f"Failed to create managed org: {create_resp.text}"
    )
    new_org_id = create_resp.json()["org_id"]

    # Step 2: MSP reads the org's statuses via the /organizations/ route
    statuses_resp = client.get(
        f"/api/v1/securityos/organizations/{new_org_id}/statuses",
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert statuses_resp.status_code == 200, (
        f"MSP→managed org GET statuses returned {statuses_resp.status_code}: {statuses_resp.text}"
    )

    # Step 3: MSP reads score
    score_resp = client.get(
        f"/api/v1/securityos/organizations/{new_org_id}/score",
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert score_resp.status_code == 200

    # Step 4: MSP can list attestations for the managed org
    attest_resp = client.get(
        f"/api/v1/securityos/organizations/{new_org_id}/attestations",
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert attest_resp.status_code == 200


def test_msp_managed_org_not_accessible_by_other_msp(client):
    """
    An org managed by msp-p11-test must not be accessible by a different MSP.
    """
    # Create org under MSP_ID
    create_resp = client.post(
        f"/api/v1/securityos/msp/{MSP_ID}/orgs",
        json={"name": "Exclusive Client"},
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert create_resp.status_code == 201
    new_org_id = create_resp.json()["org_id"]

    # Different MSP tries to access it
    other_msp_token = _token(
        org_id="org-other-msp-internal",
        msp_id="msp-totally-different",
        user_id="user-other",
        email="other@example.com",
    )
    resp = client.get(
        f"/api/v1/securityos/organizations/{new_org_id}/statuses",
        headers={"Authorization": f"Bearer {other_msp_token}"},
    )
    assert resp.status_code == 404


# ── Token with `tid` but no `org_id` → no access ──────────────────────────────

def test_token_with_tid_but_no_org_id_grants_no_access(client):
    """
    Phase 2.1: org_id is an optional hint and authorization comes only from
    memberships.  A token carrying only the Entra `tid` claim authenticates
    (so the user can sign up or accept an invite) but reaches no org — `tid`
    is never read, so it cannot merge users into a shared org.
    """
    tid_token = sign_dev_token({
        "sub": "user-entra-12345",
        "email": "user@contoso.com",
        "name": "Entra User",
        "tid": "00000000-0000-0000-0000-000000000001",  # Entra tenant ID
    })
    headers = {"Authorization": f"Bearer {tid_token}"}

    # The tenant id is not an org this user can reach
    resp = client.get(
        "/api/v1/securityos/organizations/00000000-0000-0000-0000-000000000001/statuses",
        headers=headers,
    )
    assert resp.status_code == 404, resp.text

    # Identity works; no memberships exist
    me = client.get("/api/v1/securityos/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["organizations"] == []


# ── Body with forbidden actor fields → 422 ───────────────────────────────────

def test_attestation_body_with_attested_by_name_returns_422(client):
    """
    Sending `attested_by_name` (or any old actor field) in the attestation
    body must return 422 because AttestationCreate has extra='forbid'.
    This proves the security fix: actor identity cannot come from the body.
    """
    user_token = _token()
    resp = client.post(
        "/api/v1/securityos/organizations/org-test-001/attestations",
        json={
            "attested_by_name": "Hacker McHack",  # forbidden field
            "attested_by_email": "hacker@evil.com",  # forbidden field
            "user_id": "some-evil-id",  # forbidden field
            "source_name": "CrowdStrike",
            "source_description": "EDR coverage",
            "control_ids": ["CTRL-DEV-003"],
            "confirmation_phrase": "ATTEST",
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 422, (
        f"Expected 422 for forbidden body fields, got {resp.status_code}: {resp.text}"
    )


def test_managed_org_create_with_extra_field_returns_422(client):
    """ManagedOrgCreate with extra fields must return 422."""
    resp = client.post(
        f"/api/v1/securityos/msp/{MSP_ID}/orgs",
        json={
            "name": "Test Org",
            "malicious_field": "should_fail",  # extra field
        },
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert resp.status_code == 422


# ── validate_prod_config unit tests ───────────────────────────────────────────

def test_validate_prod_config_raises_if_no_auth_audience():
    """ENV=prod without AUTH_AUDIENCE → RuntimeError at startup."""
    _check_prod_config_with_env(
        env="prod",
        issuer="https://login.microsoftonline.com/tenant/v2.0",
        audience="",  # missing
        expect_error="AUTH_AUDIENCE",
    )


def test_validate_prod_config_raises_if_no_auth_issuer():
    """ENV=prod without AUTH_ISSUER → RuntimeError at startup."""
    _check_prod_config_with_env(env="prod", issuer="", audience="api://securityos",
                                 expect_error="AUTH_ISSUER")


def test_validate_prod_config_raises_if_both_missing():
    """ENV=prod with neither AUTH_ISSUER nor AUTH_AUDIENCE → RuntimeError."""
    _check_prod_config_with_env(env="prod", issuer="", audience="",
                                 expect_error="AUTH_ISSUER")


def test_validate_prod_config_ok_if_both_set():
    """ENV=prod with both AUTH_ISSUER and AUTH_AUDIENCE → no error."""
    _check_prod_config_with_env(
        env="prod",
        issuer="https://login.microsoftonline.com/tenant/v2.0",
        audience="api://securityos",
        expect_error=None,
    )


def test_validate_prod_config_noop_in_test():
    """ENV=test → validate_prod_config() is a no-op regardless of other vars."""
    _check_prod_config_with_env(env="test", issuer="", audience="", expect_error=None)


def _check_prod_config_with_env(
    *,
    env: str,
    issuer: str,
    audience: str,
    expect_error: str | None = None,
) -> None:
    """
    Helper: call validate_prod_config() with explicit env values by
    temporarily patching the module-level constants.
    """
    import backend.auth.jwt as jwt_mod

    orig_env = jwt_mod.ENV
    orig_issuer = jwt_mod.AUTH_ISSUER
    orig_audience = jwt_mod.AUTH_AUDIENCE

    jwt_mod.ENV = env
    jwt_mod.AUTH_ISSUER = issuer
    jwt_mod.AUTH_AUDIENCE = audience
    try:
        if expect_error:
            with pytest.raises(RuntimeError, match=expect_error):
                jwt_mod.validate_prod_config()
        else:
            jwt_mod.validate_prod_config()  # should not raise
    finally:
        jwt_mod.ENV = orig_env
        jwt_mod.AUTH_ISSUER = orig_issuer
        jwt_mod.AUTH_AUDIENCE = orig_audience


# ── Wrong audience → TokenError ───────────────────────────────────────────────

def test_wrong_audience_rejected_by_decode():
    """
    _decode_with_key with verify_aud=True and a token whose aud does not
    match AUTH_AUDIENCE must raise JWTError (→ TokenError → 401).
    """
    import backend.auth.jwt as jwt_mod
    from jose import JWTError

    # Build a token with wrong audience
    import time as _time
    from jose import jwt as jose_jwt

    private_pem = jwt_mod._load_dev_private_key()
    pub_jwk = jwt_mod._get_dev_public_key_jwk()

    wrong_aud_token = jose_jwt.encode(
        {
            "sub": "user-test",
            "org_id": "org-test-001",
            "aud": "wrong-audience-completely",
            "iss": jwt_mod.AUTH_ISSUER or "http://localhost/test-issuer",
            "iat": int(_time.time()),
            "exp": int(_time.time()) + 3600,
        },
        private_pem,
        algorithm="RS256",
    )

    orig_aud = jwt_mod.AUTH_AUDIENCE
    jwt_mod.AUTH_AUDIENCE = "securityos-test"
    try:
        with pytest.raises(JWTError):
            jwt_mod._decode_with_key(wrong_aud_token, pub_jwk, verify_iss=False, verify_aud=True)
    finally:
        jwt_mod.AUTH_AUDIENCE = orig_aud


# ── Unknown kid triggers exactly one JWKS refresh ────────────────────────────

def test_unknown_kid_triggers_exactly_one_refresh():
    """
    When a token's kid is not found in the cached JWKS, the system must
    force-refresh the JWKS exactly once.  If the kid is still not found
    after the refresh, it must fail (not loop).
    """
    import backend.auth.jwt as jwt_mod

    # Build a valid dev token with a kid that won't be in any JWKS
    unknown_kid = "totally-unknown-kid-xyz-99"
    private_pem = jwt_mod._load_dev_private_key()
    from jose import jwt as jose_jwt
    import time as _time

    token = jose_jwt.encode(
        {
            "sub": "user-test",
            "org_id": "org-test-001",
            "aud": "securityos-test",
            "iss": "http://localhost/test-issuer",
            "iat": int(_time.time()),
            "exp": int(_time.time()) + 3600,
        },
        private_pem,
        algorithm="RS256",
        headers={"kid": unknown_kid},
    )

    # A JWKS with a different kid
    known_kid_jwks = {
        "keys": [
            {
                "kty": "RSA",
                "kid": "different-kid-123",
                "use": "sig",
                "alg": "RS256",
                "n": "sW_abc123",  # doesn't matter; just needs a kid
                "e": "AQAB",
            }
        ]
    }

    # Reset counters and cooldown timestamp so the refresh is allowed.
    reset_jwks_kid_refresh_count()
    reset_kid_refresh_last_at()
    initial_count = get_jwks_kid_refresh_count()

    # Save and clear ONLY the JWKS cache (not OIDC config — that has no bearing
    # on _verify_with_jwks which takes jwks_url directly).
    saved_jwks_cache = jwt_mod._jwks_cache
    saved_jwks_fetched_at = jwt_mod._jwks_fetched_at
    jwt_mod._jwks_cache = None
    jwt_mod._jwks_fetched_at = 0.0

    from backend.auth.jwt import TokenError as _TokenError

    try:
        # Patch _fetch_json to return the same JWKS both times (kid still not found)
        with patch("backend.auth.jwt._fetch_json", return_value=known_kid_jwks) as mock_fetch:
            with pytest.raises(_TokenError) as exc_info:
                jwt_mod._verify_with_jwks(
                    token,
                    "https://mock.example.com/jwks.json",
                    {"alg": "RS256", "kid": unknown_kid},
                )
    finally:
        # Restore JWKS cache so subsequent tests use the dev-key path normally
        jwt_mod._jwks_cache = saved_jwks_cache
        jwt_mod._jwks_fetched_at = saved_jwks_fetched_at

    final_count = get_jwks_kid_refresh_count()
    assert final_count == initial_count + 1, (
        f"Expected exactly 1 kid-triggered refresh, got {final_count - initial_count}"
    )
    assert "Unknown key ID" in str(exc_info.value), (
        f"Expected 'Unknown key ID' in error, got: {exc_info.value}"
    )
    # _fetch_json called twice: once for initial JWKS, once for forced refresh
    assert mock_fetch.call_count == 2, (
        f"Expected _fetch_json to be called exactly 2 times (initial + refresh), "
        f"got {mock_fetch.call_count}"
    )
    # After the refresh the cooldown timestamp must have been updated
    assert get_kid_refresh_last_at() > 0.0, "Expected _kid_refresh_last_at to be set after refresh"


# ── Kid-refresh cooldown → 401 without HTTP call ──────────────────────────────

def test_kid_refresh_within_cooldown_returns_401_without_fetch():
    """
    Within the 60 s cooldown window a second unknown-kid request must return
    TokenError(fatal=True) immediately, without making any outbound HTTP call.
    """
    import backend.auth.jwt as jwt_mod
    import time as _time

    unknown_kid = "cooldown-test-kid-abc"

    # Simulate that a refresh just happened by setting _kid_refresh_last_at to now
    with jwt_mod._kid_refresh_lock:
        jwt_mod._kid_refresh_last_at = _time.time()

    saved_jwks_cache = jwt_mod._jwks_cache
    saved_jwks_fetched_at = jwt_mod._jwks_fetched_at
    # Populate a JWKS cache with a *different* kid so the unknown kid misses
    jwt_mod._jwks_cache = {"keys": [{"kty": "RSA", "kid": "other-kid", "use": "sig", "alg": "RS256", "n": "x", "e": "AQAB"}]}
    jwt_mod._jwks_fetched_at = _time.time()

    from backend.auth.jwt import TokenError as _TokenError

    try:
        with patch("backend.auth.jwt._fetch_json") as mock_fetch:
            with pytest.raises(_TokenError) as exc_info:
                jwt_mod._verify_with_jwks(
                    "dummy.token.here",
                    "https://mock.example.com/jwks.json",
                    {"alg": "RS256", "kid": unknown_kid},
                )
    finally:
        jwt_mod._jwks_cache = saved_jwks_cache
        jwt_mod._jwks_fetched_at = saved_jwks_fetched_at
        reset_kid_refresh_last_at()

    assert exc_info.value.fatal, "TokenError must be fatal within the cooldown window"
    assert "cooldown" in str(exc_info.value).lower(), (
        f"Expected 'cooldown' in error message, got: {exc_info.value}"
    )
    mock_fetch.assert_not_called()


# ── After delete, org is no longer accessible ─────────────────────────────────

def test_after_delete_msp_cannot_access_org(client):
    """
    After deleting a managed org, the MSP must no longer be able to access it.
    """
    # Create
    create_resp = client.post(
        f"/api/v1/securityos/msp/{MSP_ID}/orgs",
        json={"name": "To Be Deleted"},
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert create_resp.status_code == 201
    org_id = create_resp.json()["org_id"]

    # Verify access works
    read_resp = client.get(
        f"/api/v1/securityos/organizations/{org_id}/statuses",
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert read_resp.status_code == 200

    # Delete
    del_resp = client.delete(
        f"/api/v1/securityos/msp/{MSP_ID}/orgs/{org_id}",
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert del_resp.status_code == 204

    # Access must be revoked
    revoked_resp = client.get(
        f"/api/v1/securityos/organizations/{org_id}/statuses",
        headers={"Authorization": f"Bearer {MSP_TOKEN}"},
    )
    assert revoked_resp.status_code == 404, (
        f"Expected 404 after org deletion, got {revoked_resp.status_code}"
    )
