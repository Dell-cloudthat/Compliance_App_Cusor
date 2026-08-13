"""Auth flow: register, login, token validation, rejection paths."""


def test_register_returns_token(fresh_user):
    assert fresh_user["token"]


def test_login_roundtrip(client, fresh_user):
    resp = client.post(
        "/api/auth/login",
        json={"email": fresh_user["email"], "password": fresh_user["password"]},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_wrong_password_rejected(client, fresh_user):
    resp = client.post(
        "/api/auth/login",
        json={"email": fresh_user["email"], "password": "wrong-password"},
    )
    assert resp.status_code in (400, 401, 403)


def test_me_returns_profile(client, fresh_user):
    resp = client.get("/api/auth/me", headers=fresh_user["headers"])
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == fresh_user["email"]
    assert body["name"] == "Pytest User"


def test_me_without_token_rejected(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code in (401, 403)


def test_me_with_garbage_token_rejected(client):
    resp = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not.a.real.token"}
    )
    assert resp.status_code in (401, 403)


def test_duplicate_registration_rejected(client, fresh_user):
    resp = client.post(
        "/api/auth/register",
        json={
            "name": "Dup",
            "email": fresh_user["email"],
            "password": "another-password-123",
            "organization": "X",
        },
    )
    assert resp.status_code in (400, 409)
