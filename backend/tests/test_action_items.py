"""
Action items: creation, ticket references, audit trail (who/when/email),
email notification (best-effort), status updates, cross-user isolation.
"""

BASE_ITEM = {
    "control_id": "AC-001",
    "control_name": "Multi-Factor Authentication",
    "title": "Enable MFA for all admin accounts",
    "description": "Roll out MFA enforcement for the IT Ops team.",
    "assigned_team": "IT Ops",
    "assigned_email": "itops@acme.com",
    "priority": "high",
    "due_date": "2026-09-01",
}


def test_requires_auth(client):
    assert client.post("/api/action-items", json=BASE_ITEM).status_code in (401, 403)


def test_create_action_item_returns_ticket_ref(client, fresh_user):
    resp = client.post("/api/action-items", headers=fresh_user["headers"], json=BASE_ITEM)
    assert resp.status_code == 201
    body = resp.json()
    assert body["ticket_ref"].startswith("AI-")
    assert body["status"] == "open"
    assert body["created_by_email"] == fresh_user["email"]


def test_audit_log_records_creator_email_and_timestamp(client, fresh_user):
    item = client.post("/api/action-items", headers=fresh_user["headers"], json=BASE_ITEM).json()
    detail = client.get(f"/api/action-items/{item['id']}", headers=fresh_user["headers"])
    assert detail.status_code == 200
    audit = detail.json()["audit_log"]
    created_entry = next(a for a in audit if a["action"] == "created")
    assert created_entry["user_email"] == fresh_user["email"]
    assert created_entry["created_at"]


def test_email_without_smtp_configured_logs_failure_not_error(client, fresh_user):
    """Without SMTP configured, creation must still succeed (201) — email
    is best-effort, never blocking."""
    resp = client.post("/api/action-items", headers=fresh_user["headers"], json=BASE_ITEM)
    assert resp.status_code == 201
    body = resp.json()
    assert body["emailed"] is False
    assert body["email_configured"] is False

    detail = client.get(f"/api/action-items/{body['id']}", headers=fresh_user["headers"]).json()
    assert any(a["action"] == "email_failed" for a in detail["audit_log"])


def test_invalid_priority_rejected(client, fresh_user):
    bad = dict(BASE_ITEM, priority="urgent-ish")
    resp = client.post("/api/action-items", headers=fresh_user["headers"], json=bad)
    assert resp.status_code == 400


def test_list_filters_by_control_and_status(client, fresh_user):
    h = fresh_user["headers"]
    client.post("/api/action-items", headers=h, json=BASE_ITEM)
    client.post("/api/action-items", headers=h, json=dict(BASE_ITEM, control_id="EP-002", title="Deploy EDR"))

    by_control = client.get("/api/action-items?control_id=AC-001", headers=h).json()
    assert all(i["control_id"] == "AC-001" for i in by_control)

    by_status = client.get("/api/action-items?status_filter=open", headers=h).json()
    assert all(i["status"] == "open" for i in by_status)


def test_update_status_writes_audit_entry_with_old_and_new_value(client, fresh_user):
    h = fresh_user["headers"]
    item = client.post("/api/action-items", headers=h, json=BASE_ITEM).json()

    update = client.patch(f"/api/action-items/{item['id']}", headers=h, json={"status": "done"})
    assert update.status_code == 200
    assert update.json()["status"] == "done"

    detail = client.get(f"/api/action-items/{item['id']}", headers=h).json()
    status_change = next(a for a in detail["audit_log"] if a["action"] == "status_changed")
    assert status_change["old_value"] == "open"
    assert status_change["new_value"] == "done"
    assert status_change["user_email"] == fresh_user["email"]


def test_update_no_changes_returns_unchanged(client, fresh_user):
    h = fresh_user["headers"]
    item = client.post("/api/action-items", headers=h, json=BASE_ITEM).json()
    resp = client.patch(f"/api/action-items/{item['id']}", headers=h, json={"status": "open"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "open"


def test_reassignment_triggers_notification_attempt(client, fresh_user):
    h = fresh_user["headers"]
    item = client.post("/api/action-items", headers=h, json=BASE_ITEM).json()

    resp = client.patch(f"/api/action-items/{item['id']}", headers=h, json={
        "assigned_email": "newteam@acme.com",
        "assigned_team": "Security Team",
    })
    assert resp.status_code == 200
    detail = client.get(f"/api/action-items/{item['id']}", headers=h).json()
    assert any(a["action"] == "assigned" for a in detail["audit_log"])


def test_resend_email_endpoint(client, fresh_user):
    h = fresh_user["headers"]
    item = client.post("/api/action-items", headers=h, json=BASE_ITEM).json()
    resp = client.post(f"/api/action-items/{item['id']}/resend-email", headers=h)
    assert resp.status_code == 200
    assert "emailed" in resp.json()


def test_resend_email_without_assignee_rejected(client, fresh_user):
    h = fresh_user["headers"]
    no_assignee = dict(BASE_ITEM)
    no_assignee.pop("assigned_email")
    item = client.post("/api/action-items", headers=h, json=no_assignee).json()
    resp = client.post(f"/api/action-items/{item['id']}/resend-email", headers=h)
    assert resp.status_code == 400


def test_users_cannot_see_each_others_action_items(client, fresh_user):
    import random
    item = client.post("/api/action-items", headers=fresh_user["headers"], json=BASE_ITEM).json()

    email = f"other-{random.randint(100000, 999999)}@test.local"
    other = client.post("/api/auth/register", json={
        "name": "Other", "email": email, "password": "pytest-password-123",
    }).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    resp = client.get(f"/api/action-items/{item['id']}", headers=other_headers)
    assert resp.status_code == 404

    listing = client.get("/api/action-items", headers=other_headers).json()
    assert all(i["id"] != item["id"] for i in listing)


def test_not_found_for_nonexistent_item(client, fresh_user):
    resp = client.get("/api/action-items/999999", headers=fresh_user["headers"])
    assert resp.status_code == 404


def test_ticket_refs_are_unique_and_sequential_format(client, fresh_user):
    h = fresh_user["headers"]
    a = client.post("/api/action-items", headers=h, json=BASE_ITEM).json()
    b = client.post("/api/action-items", headers=h, json=BASE_ITEM).json()
    assert a["ticket_ref"] != b["ticket_ref"]
    assert a["ticket_ref"].startswith("AI-") and b["ticket_ref"].startswith("AI-")
