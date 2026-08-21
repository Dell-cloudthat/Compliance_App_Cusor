"""Early-access waitlist: public signup, platform-admin gating, invite/redeem flow."""

import os

import pytest

ADMIN_EMAIL = "platform-admin-test@internal.test"


@pytest.fixture()
def admin_user(client, monkeypatch):
    """A user whose email is configured as a platform admin for this test only.

    Reuses the same fixed email across tests (needed so PLATFORM_ADMIN_EMAILS
    can match it), so registration may 409 on the second+ test to use this
    fixture — fall back to login in that case.
    """
    monkeypatch.setenv("PLATFORM_ADMIN_EMAILS", ADMIN_EMAIL)
    password = "pytest-password-123"
    resp = client.post("/api/auth/register", json={
        "name": "Platform Admin", "email": ADMIN_EMAIL,
        "password": password, "organization": "Internal",
    })
    if resp.status_code == 409:
        resp = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"headers": {"Authorization": f"Bearer {token}"}}


def test_signup_is_public_no_auth_required(client):
    resp = client.post("/api/waitlist/signup", json={
        "name": "Prospect", "email": "prospect1@example.com",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["already_registered"] is False
    assert body["position"] >= 1


def test_duplicate_signup_returns_position_not_error(client):
    payload = {"name": "Dup", "email": "dup-signup@example.com"}
    first = client.post("/api/waitlist/signup", json=payload)
    second = client.post("/api/waitlist/signup", json=payload)
    assert first.status_code == 201
    assert second.status_code == 201
    assert second.json()["already_registered"] is True


def test_list_requires_platform_admin(client, fresh_user):
    resp = client.get("/api/waitlist", headers=fresh_user["headers"])
    assert resp.status_code == 403


def test_list_requires_auth_entirely(client):
    resp = client.get("/api/waitlist")
    assert resp.status_code in (401, 403)


def test_admin_can_list_and_see_stats(client, admin_user):
    client.post("/api/waitlist/signup", json={"name": "A", "email": "statcheck@example.com"})
    listing = client.get("/api/waitlist", headers=admin_user["headers"])
    assert listing.status_code == 200
    assert any(r["email"] == "statcheck@example.com" for r in listing.json())

    stats = client.get("/api/waitlist/stats", headers=admin_user["headers"])
    assert stats.status_code == 200
    assert stats.json()["total"] >= 1


def test_full_invite_and_redeem_flow(client, admin_user):
    client.post("/api/waitlist/signup", json={"name": "Invitee", "email": "invitee-flow@example.com"})
    rows = client.get("/api/waitlist", headers=admin_user["headers"]).json()
    signup_id = next(r["id"] for r in rows if r["email"] == "invitee-flow@example.com")

    invite = client.post(f"/api/waitlist/{signup_id}/invite", headers=admin_user["headers"])
    assert invite.status_code == 200
    invite_link = invite.json()["invite_link"]
    token = invite_link.split("invite=")[1]

    redeem = client.post("/api/waitlist/redeem", json={"token": token, "password": "trialpass123"})
    assert redeem.status_code == 200
    assert redeem.json()["access_token"]

    # The new account can authenticate normally afterward
    login = client.post("/api/auth/login", json={"email": "invitee-flow@example.com", "password": "trialpass123"})
    assert login.status_code == 200

    # Waitlist row reflects the conversion
    rows_after = client.get("/api/waitlist", headers=admin_user["headers"]).json()
    converted_row = next(r for r in rows_after if r["email"] == "invitee-flow@example.com")
    assert converted_row["status"] == "converted"
    assert converted_row["converted_user_id"] is not None


def test_redeem_twice_fails(client, admin_user):
    client.post("/api/waitlist/signup", json={"name": "OnceOnly", "email": "once-only@example.com"})
    rows = client.get("/api/waitlist", headers=admin_user["headers"]).json()
    signup_id = next(r["id"] for r in rows if r["email"] == "once-only@example.com")
    token = client.post(f"/api/waitlist/{signup_id}/invite", headers=admin_user["headers"]).json()["invite_link"].split("invite=")[1]

    first = client.post("/api/waitlist/redeem", json={"token": token, "password": "trialpass123"})
    second = client.post("/api/waitlist/redeem", json={"token": token, "password": "trialpass123"})
    assert first.status_code == 200
    assert second.status_code == 409


def test_redeem_invalid_token_404(client):
    resp = client.post("/api/waitlist/redeem", json={"token": "not-a-real-token", "password": "trialpass123"})
    assert resp.status_code == 404


def test_redeem_uninvited_signup_rejected(client, admin_user):
    """A pending (never-invited) signup has no token yet — redeem must fail."""
    resp = client.post("/api/waitlist/redeem", json={"token": "", "password": "trialpass123"})
    assert resp.status_code == 404


def test_decline_signup(client, admin_user):
    client.post("/api/waitlist/signup", json={"name": "Declined", "email": "declined@example.com"})
    rows = client.get("/api/waitlist", headers=admin_user["headers"]).json()
    signup_id = next(r["id"] for r in rows if r["email"] == "declined@example.com")

    resp = client.post(f"/api/waitlist/{signup_id}/decline", headers=admin_user["headers"])
    assert resp.status_code == 200

    filtered = client.get("/api/waitlist?status_filter=declined", headers=admin_user["headers"]).json()
    assert any(r["email"] == "declined@example.com" for r in filtered)


def test_current_user_reports_platform_admin_flag(client, admin_user, fresh_user):
    me_admin = client.get("/api/auth/me", headers=admin_user["headers"])
    assert me_admin.json()["is_platform_admin"] is True

    me_regular = client.get("/api/auth/me", headers=fresh_user["headers"])
    assert me_regular.json()["is_platform_admin"] is False
