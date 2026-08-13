"""Credential store: encryption round-trip, CRUD, isolation, no plaintext leak."""

from routes.credentials import encrypt, decrypt


def test_fernet_roundtrip():
    secret = "acme.okta.com::SSWS-token-abc123"
    ciphertext = encrypt(secret)
    assert ciphertext != secret
    assert decrypt(ciphertext) == secret


def test_ciphertext_is_not_deterministic():
    # Fernet includes a random IV — same plaintext must not produce same output
    assert encrypt("same-input") != encrypt("same-input")


def test_store_and_list(client, fresh_user):
    resp = client.post(
        "/api/credentials",
        headers=fresh_user["headers"],
        json={"vendor": "okta", "credential": "acme.okta.com::tok-123"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["vendor"] == "okta"
    # plaintext must never come back
    assert "tok-123" not in resp.text

    listing = client.get("/api/credentials", headers=fresh_user["headers"])
    assert listing.status_code == 200
    assert "tok-123" not in listing.text


def test_empty_credential_rejected(client, fresh_user):
    resp = client.post(
        "/api/credentials",
        headers=fresh_user["headers"],
        json={"vendor": "okta", "credential": "   "},
    )
    assert resp.status_code == 400


def test_upsert_same_vendor(client, fresh_user):
    h = fresh_user["headers"]
    first = client.post("/api/credentials", headers=h,
                        json={"vendor": "aws", "credential": "key-v1"})
    second = client.post("/api/credentials", headers=h,
                         json={"vendor": "aws", "credential": "key-v2"})
    assert first.status_code == 201 and second.status_code == 201
    assert first.json()["id"] == second.json()["id"]  # replaced, not duplicated


def test_delete_credential(client, fresh_user):
    h = fresh_user["headers"]
    created = client.post("/api/credentials", headers=h,
                          json={"vendor": "azure_ad", "credential": "tid::cid::sec"})
    cred_id = created.json()["id"]
    assert client.delete(f"/api/credentials/{cred_id}", headers=h).status_code == 204


def test_cannot_delete_other_users_credential(client, fresh_user):
    import random
    h1 = fresh_user["headers"]
    created = client.post("/api/credentials", headers=h1,
                          json={"vendor": "gcp", "credential": "sa-json"})
    cred_id = created.json()["id"]

    # second user
    email = f"pytest-b-{random.randint(100000, 999999)}@test.local"
    other = client.post("/api/auth/register", json={
        "name": "Other", "email": email,
        "password": "pytest-password-123", "organization": "Other Org",
    }).json()
    h2 = {"Authorization": f"Bearer {other['access_token']}"}

    resp = client.delete(f"/api/credentials/{cred_id}", headers=h2)
    assert resp.status_code in (403, 404)
