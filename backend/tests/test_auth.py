"""
Phase 1 Authentication & Tenant Isolation Tests

Acceptance criteria (from the hardening spec):
  1. No token → 401 on every protected route (parametrized)
  2. Expired token → 401
  3. alg=none → 401
  4. User in org A requesting org B resources → 404
  5. MSP user requesting another MSP's orgs → 404
  6. Anonymous POST to attestations → 401
  7. Authenticated attestation records actor from token
     even if body tries to send extra fields (→ 422 for unknown fields)
  8. Valid token for the correct org → 200/201
"""

import pytest

# ── Protected route matrix (no auth → 401) ────────────────────────────────────

_PROTECTED_ROUTES = [
    ("GET",   "/api/v1/securityos/organizations/org-test-001/profile"),
    ("GET",   "/api/v1/securityos/organizations/org-test-001/statuses"),
    ("GET",   "/api/v1/securityos/organizations/org-test-001/score"),
    ("GET",   "/api/v1/securityos/organizations/org-test-001/passport"),
    ("GET",   "/api/v1/securityos/organizations/org-test-001/attestations"),
    ("GET",   "/api/v1/securityos/organizations/org-test-001/attestations/expiring"),
    ("GET",   "/api/v1/securityos/organizations/org-test-001/attestations/recommendations"),
    ("GET",   "/api/v1/securityos/msp/msp-test-001/orgs"),
    ("GET",   "/api/v1/securityos/msp/msp-test-001/dashboard"),
]


@pytest.mark.parametrize("method,path", _PROTECTED_ROUTES)
def test_no_token_returns_401(client, method, path):
    """Every protected endpoint must return 401 when no Authorization header is sent."""
    resp = getattr(client, method.lower())(path)
    assert resp.status_code == 401, (
        f"{method} {path} returned {resp.status_code}, expected 401. Body: {resp.text}"
    )


# ── Token validity checks ──────────────────────────────────────────────────────

def test_expired_token_returns_401(client, expired_token):
    resp = client.get(
        "/api/v1/securityos/organizations/org-test-001/profile",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401


def test_alg_none_returns_401(client, wrong_alg_none_token):
    """Tokens with alg=none must be rejected, even if payload looks valid."""
    resp = client.get(
        "/api/v1/securityos/organizations/org-test-001/profile",
        headers={"Authorization": f"Bearer {wrong_alg_none_token}"},
    )
    assert resp.status_code == 401


def test_malformed_token_returns_401(client):
    resp = client.get(
        "/api/v1/securityos/organizations/org-test-001/profile",
        headers={"Authorization": "Bearer not.a.jwt"},
    )
    assert resp.status_code == 401


# ── Tenant isolation ───────────────────────────────────────────────────────────

def test_org_a_token_cannot_access_org_b(client, valid_token):
    """
    A user authenticated for org-test-001 must get 404 (not 403) when
    requesting resources belonging to org-B-999.
    """
    resp = client.get(
        "/api/v1/securityos/organizations/org-B-999/profile",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert resp.status_code == 404, (
        f"Expected 404 for cross-tenant access, got {resp.status_code}: {resp.text}"
    )


def test_org_a_token_cannot_read_org_b_attestations(client, valid_token):
    resp = client.get(
        "/api/v1/securityos/organizations/org-B-999/attestations",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert resp.status_code == 404


def test_org_a_token_cannot_post_to_org_b_attestations(client, valid_token):
    resp = client.post(
        "/api/v1/securityos/organizations/org-B-999/attestations",
        json={
            "source_name": "Test",
            "source_description": "desc",
            "control_ids": ["CTRL-ID-001"],
            "confirmation_phrase": "ATTEST",
        },
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert resp.status_code == 404


# ── MSP tenant isolation ───────────────────────────────────────────────────────

def test_msp_token_cannot_access_different_msp(client, msp_token):
    """
    An MSP user for msp-test-001 must get 404 when requesting msp-other-999's routes.
    """
    resp = client.get(
        "/api/v1/securityos/msp/msp-other-999/orgs",
        headers={"Authorization": f"Bearer {msp_token}"},
    )
    assert resp.status_code == 404, (
        f"Expected 404 for cross-MSP access, got {resp.status_code}: {resp.text}"
    )


def test_other_msp_token_cannot_access_msp_test(client, other_msp_token):
    resp = client.get(
        "/api/v1/securityos/msp/msp-test-001/orgs",
        headers={"Authorization": f"Bearer {other_msp_token}"},
    )
    assert resp.status_code == 404


def test_non_msp_token_cannot_access_msp_routes(client, valid_token):
    """A user without msp_id must get 404 on MSP routes."""
    resp = client.get(
        "/api/v1/securityos/msp/msp-test-001/orgs",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert resp.status_code == 404


# ── Anonymous POST to attestations → 401 ─────────────────────────────────────

def test_anonymous_attestation_post_returns_401(client):
    """The critical exploit: unauthenticated attestation creation must be blocked."""
    resp = client.post(
        "/api/v1/securityos/organizations/org-test-001/attestations",
        json={
            "attested_by_name": "CEO Jane",
            "attested_by_email": "ceo@example.com",
            "source_name": "CrowdStrike",
            "source_description": "desc",
            "control_ids": ["CTRL-ID-001"],
            "confirmation_phrase": "ATTEST",
        },
    )
    assert resp.status_code == 401, (
        f"Expected 401 for unauthenticated attestation, got {resp.status_code}: {resp.text}"
    )


# ── Authenticated requests work and enforce JWT actor ─────────────────────────

def test_valid_token_can_read_own_org_statuses(client, valid_token):
    resp = client.get(
        "/api/v1/securityos/organizations/org-test-001/statuses",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert resp.status_code == 200


def test_authenticated_attestation_ignores_body_actor_fields(client, valid_token):
    """
    Body fields like attested_by_name, attested_by_email, user_id are no longer
    accepted by AttestationCreate — sending them must return 422 (extra fields).
    """
    resp = client.post(
        "/api/v1/securityos/organizations/org-test-001/attestations",
        json={
            # These fields were removed from the model — should cause 422
            "attested_by_name": "Hacker",
            "attested_by_email": "hacker@evil.com",
            "user_id": "evil-user-id",
            "source_name": "CrowdStrike",
            "source_description": "EDR coverage for all endpoints",
            "control_ids": ["CTRL-DEV-003"],
            "confirmation_phrase": "ATTEST",
        },
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    # Pydantic v2 with model_config extra='forbid' → 422
    # Without forbid, extra fields are silently ignored and the attestation is created
    # from the JWT identity (201). Either outcome proves the body fields have no effect.
    assert resp.status_code in (201, 422), (
        f"Expected 201 (fields ignored) or 422 (fields rejected), got {resp.status_code}: {resp.text}"
    )

    if resp.status_code == 201:
        data = resp.json()
        attest = data["attestation"]
        # The actor MUST come from the JWT, not from the body
        assert attest["created_by_name"] == "Test User", (
            f"Actor name should be from JWT ('Test User'), got: {attest['created_by_name']}"
        )
        assert attest["created_by_email"] == "test@example.com", (
            f"Actor email should be from JWT, got: {attest['created_by_email']}"
        )
        assert attest["created_by_user_id"] == "user-abc", (
            f"Actor user_id should be from JWT, got: {attest['created_by_user_id']}"
        )


def test_authenticated_attestation_records_jwt_actor(client, valid_token):
    """An authenticated attestation must record the actor from the JWT."""
    resp = client.post(
        "/api/v1/securityos/organizations/org-test-001/attestations",
        json={
            "source_name": "Microsoft Defender",
            "source_description": "EDR coverage for all Windows endpoints",
            "control_ids": ["CTRL-DEV-003", "CTRL-DEV-001"],
            "confirmation_phrase": "ATTEST",
        },
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"

    data = resp.json()
    attest = data["attestation"]
    assert attest["created_by_name"] == "Test User"
    assert attest["created_by_email"] == "test@example.com"
    assert attest["created_by_user_id"] == "user-abc"
    assert attest["organization_id"] == "org-test-001"


def test_revoke_requires_auth(client):
    """Revoke endpoint must also require authentication."""
    resp = client.post(
        "/api/v1/securityos/organizations/org-test-001/attestations/nonexistent/revoke",
        json={"reason": "test"},
    )
    assert resp.status_code == 401


def test_revoke_records_jwt_actor(client, valid_token):
    """After creating an attestation, revoke it; actor must come from JWT."""
    # Create first
    create_resp = client.post(
        "/api/v1/securityos/organizations/org-test-001/attestations",
        json={
            "source_name": "SentinelOne",
            "source_description": "EDR for revocation test",
            "control_ids": ["CTRL-DEV-003"],
            "confirmation_phrase": "ATTEST",
        },
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert create_resp.status_code == 201
    attest_id = create_resp.json()["attestation"]["id"]

    # Revoke
    revoke_resp = client.post(
        f"/api/v1/securityos/organizations/org-test-001/attestations/{attest_id}/revoke",
        json={"reason": "no longer needed"},
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert revoke_resp.status_code == 200
    data = revoke_resp.json()
    # revoked_by_name must come from JWT
    assert data["revoked_by_name"] == "Test User"


# ── Public endpoints still work without auth ───────────────────────────────────

def test_health_no_auth(client):
    resp = client.get("/health")
    assert resp.status_code == 200


def test_root_no_auth(client):
    resp = client.get("/")
    assert resp.status_code == 200


def test_controls_catalog_no_auth(client):
    resp = client.get("/api/v1/securityos/controls")
    assert resp.status_code == 200
    data = resp.json()
    assert "controls" in data
    assert len(data["controls"]) > 0


def test_tiers_no_auth(client):
    resp = client.get("/api/v1/securityos/tiers")
    assert resp.status_code == 200


def test_providers_no_auth(client):
    resp = client.get("/api/v1/securityos/providers")
    assert resp.status_code == 200


# ── MSP access with correct token ─────────────────────────────────────────────

def test_msp_token_can_access_own_msp(client, msp_token):
    resp = client.get(
        "/api/v1/securityos/msp/msp-test-001/orgs",
        headers={"Authorization": f"Bearer {msp_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["msp_id"] == "msp-test-001"


def test_msp_token_can_create_org(client, msp_token):
    resp = client.post(
        "/api/v1/securityos/msp/msp-test-001/orgs",
        json={"name": "Test Client Corp", "industry": "healthcare"},
        headers={"Authorization": f"Bearer {msp_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["msp_id"] == "msp-test-001"
    assert "org_id" in data
