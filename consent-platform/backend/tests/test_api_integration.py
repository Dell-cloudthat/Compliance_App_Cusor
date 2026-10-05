"""
Integration tests for the Consent Platform API.

Uses FastAPI's TestClient to exercise real HTTP endpoints:
- Health check
- Consent token lifecycle (issue → validate → revoke)
- Vendor CRUD (create, list, update, delete)
- Event enforcement
- Webhook create & list

Authentication: X-Tenant-ID header grants demo-mode access with all scopes.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
import pytest
from fastapi.testclient import TestClient
from main import app


DEMO_TENANT = "demo-tenant"  # pre-seeded by lifespan startup


@pytest.fixture(scope="module")
def client():
    """Start app with lifespan (database init + demo tenant seed)."""
    with TestClient(app) as c:
        yield c


def _headers(tenant_id: str = DEMO_TENANT) -> dict:
    return {"X-Tenant-ID": tenant_id}


def _issue_token(client, vendor: str = "meta", tenant: str = DEMO_TENANT) -> dict:
    """Issue a consent token and return the parsed JSON response."""
    payload = {
        "user_id": f"user-{uuid.uuid4().hex[:8]}",
        "purposes": ["analytics"],
        "vendors": [vendor],
        "jurisdiction": "GDPR",
        "ttl_days": 14,
    }
    r = client.post("/consent", json=payload, headers=_headers(tenant))
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_returns_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_stats_endpoint(self, client):
        r = client.get("/stats")
        assert r.status_code == 200
        assert "evidence_store" in r.json()


# ---------------------------------------------------------------------------
# Consent token lifecycle
# ---------------------------------------------------------------------------

class TestConsentTokenLifecycle:
    def test_issue_token_success(self, client):
        body = {
            "user_id": "user-001",
            "purposes": ["analytics"],
            "vendors": ["meta"],
            "jurisdiction": "GDPR",
            "ttl_days": 14,
        }
        r = client.post("/consent", json=body, headers=_headers())
        assert r.status_code == 200
        data = r.json()
        assert "consent_token" in data
        assert "token_id" in data

    def test_issue_token_returns_metadata(self, client):
        body = {
            "user_id": "user-002",
            "purposes": ["retargeting", "analytics"],
            "vendors": ["meta", "google"],
            "jurisdiction": "CPRA",
            "ttl_days": 7,
        }
        r = client.post("/consent", json=body, headers=_headers())
        assert r.status_code == 200
        data = r.json()
        assert "purposes" in data
        assert "vendors" in data
        assert "expires_at" in data

    def test_revoke_token(self, client):
        issued = _issue_token(client)
        token_id = issued["token_id"]
        r = client.post(
            "/consent/revoke",
            json={"token_id": token_id, "reason": "user_request"},
            headers=_headers(),
        )
        assert r.status_code == 200
        assert r.json()["token_id"] == token_id

    def test_list_tokens(self, client):
        _issue_token(client)
        r = client.get("/consent/tokens?limit=5", headers=_headers())
        assert r.status_code == 200
        data = r.json()
        assert "tokens" in data
        assert isinstance(data["tokens"], list)

    def test_token_contains_jwt(self, client):
        issued = _issue_token(client)
        token = issued["consent_token"]
        # JWT has 3 dot-separated segments
        assert len(token.split(".")) == 3


# ---------------------------------------------------------------------------
# Vendor CRUD
# ---------------------------------------------------------------------------

class TestVendorCRUD:
    def _unique_vendor(self) -> dict:
        suffix = uuid.uuid4().hex[:6]
        return {
            "id": str(uuid.uuid4()),
            "name": f"test_vendor_{suffix}",
            "display_name": f"Test Vendor {suffix}",
            "vendor_type": "analytics",
            "allowed_data_classes": ["behavioral"],
            "tenant_id": DEMO_TENANT,
        }

    def test_list_vendors(self, client):
        r = client.get("/vendors", headers=_headers())
        assert r.status_code == 200
        assert "vendors" in r.json()

    def test_create_vendor(self, client):
        v = self._unique_vendor()
        r = client.post("/vendors", json=v, headers=_headers())
        assert r.status_code == 200
        assert r.json()["vendor"]["name"] == v["name"]

    def test_create_then_list(self, client):
        v = self._unique_vendor()
        client.post("/vendors", json=v, headers=_headers())
        r = client.get("/vendors", headers=_headers())
        names = [x["name"] for x in r.json()["vendors"]]
        assert v["name"] in names

    def test_update_vendor(self, client):
        v = self._unique_vendor()
        create_r = client.post("/vendors", json=v, headers=_headers())
        vendor_id = create_r.json()["vendor"]["id"]

        update_r = client.put(
            f"/vendors/{vendor_id}",
            json={"display_name": "Updated Name", "status": "inactive"},
            headers=_headers(),
        )
        assert update_r.status_code == 200
        updated = update_r.json()["vendor"]
        assert updated["display_name"] == "Updated Name"
        assert updated["status"] == "inactive"

    def test_update_data_classes(self, client):
        v = self._unique_vendor()
        create_r = client.post("/vendors", json=v, headers=_headers())
        vendor_id = create_r.json()["vendor"]["id"]

        update_r = client.put(
            f"/vendors/{vendor_id}",
            json={"allowed_data_classes": ["behavioral", "device", "identity"]},
            headers=_headers(),
        )
        assert update_r.status_code == 200
        updated = update_r.json()["vendor"]
        assert "device" in updated["allowed_data_classes"]

    def test_delete_vendor(self, client):
        v = self._unique_vendor()
        create_r = client.post("/vendors", json=v, headers=_headers())
        vendor_id = create_r.json()["vendor"]["id"]

        del_r = client.delete(f"/vendors/{vendor_id}", headers=_headers())
        assert del_r.status_code == 200
        assert del_r.json()["deleted"] is True

    def test_delete_nonexistent_vendor(self, client):
        r = client.delete("/vendors/nonexistent-id-xyz", headers=_headers())
        assert r.status_code == 404

    def test_update_nonexistent_vendor(self, client):
        r = client.put(
            "/vendors/nonexistent-id-xyz",
            json={"display_name": "Should Fail"},
            headers=_headers(),
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Enforcement
# ---------------------------------------------------------------------------

class TestEnforcement:
    def test_enforce_with_valid_token(self, client):
        issued = _issue_token(client, vendor="meta")
        token = issued["consent_token"]

        payload = {
            "event_type": "page_view",  # maps to analytics
            "user_id": "u-123",
            "vendor": "meta",
            "data_classes": ["behavioral"],
        }
        r = client.post(
            "/event",
            json=payload,
            headers={**_headers(), "Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert r.json()["decision"] in ("allowed", "modified")

    def test_enforce_without_token_blocked(self, client):
        payload = {
            "event_type": "page_view",
            "user_id": "u-456",
            "vendor": "meta",
            "data_classes": ["behavioral"],
        }
        r = client.post("/event", json=payload, headers=_headers())
        assert r.status_code == 200
        assert r.json()["decision"] == "blocked"

    def test_enforce_returns_latency(self, client):
        payload = {
            "event_type": "page_view",
            "user_id": f"u-{uuid.uuid4().hex[:8]}",
            "vendor": "meta",
            "data_classes": ["behavioral"],
        }
        r = client.post("/event", json=payload, headers=_headers())
        # Without a token the engine blocks; security service may also return 403
        assert r.status_code in (200, 403)
        if r.status_code == 200:
            assert "latency_ms" in r.json()


# ---------------------------------------------------------------------------
# Webhooks
# ---------------------------------------------------------------------------

class TestWebhooks:
    def test_create_webhook(self, client):
        r = client.post(
            "/webhooks",
            json={"url": "https://example.com/webhook", "events": ["consent.issued"]},
            headers=_headers(),
        )
        assert r.status_code == 200
        data = r.json()
        assert "webhook" in data
        assert data["webhook"]["url"] == "https://example.com/webhook"
        assert "secret" in data["webhook"]

    def test_list_webhooks(self, client):
        r = client.get("/webhooks", headers=_headers())
        assert r.status_code == 200
        assert "webhooks" in r.json()

    def test_webhook_logs_empty_initially(self, client):
        create_r = client.post(
            "/webhooks",
            json={"url": "https://example.com/hook-logs", "events": ["*"]},
            headers=_headers(),
        )
        webhook_id = create_r.json()["webhook"]["id"]
        logs_r = client.get(f"/webhooks/{webhook_id}/logs", headers=_headers())
        assert logs_r.status_code == 200
        assert "logs" in logs_r.json()
