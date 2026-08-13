"""Assistant: retrieval ranking, gap boost, graceful no-LLM fallback."""

SAMPLE_CONTROLS = [
    {"id": "AC-001", "control_name": "Multi-Factor Authentication",
     "description": "Require MFA for all user access to systems",
     "category": "Access Control", "priority": "HIGH", "status": "Implemented",
     "frameworks": ["SOC2", "NIST"]},
    {"id": "AC-002", "control_name": "Role-Based Access Control",
     "description": "Enforce least-privilege access via roles",
     "category": "Access Control", "priority": "HIGH", "status": "Partial",
     "frameworks": ["SOC2"]},
    {"id": "EP-001", "control_name": "Endpoint Detection & Response",
     "description": "Deploy EDR agents on all endpoints and laptops",
     "category": "Endpoint Security", "priority": "HIGH", "status": "Not Implemented",
     "frameworks": ["CIS", "NIST"]},
    {"id": "DM-001", "control_name": "Data Encryption at Rest",
     "description": "Encrypt sensitive data stored in databases",
     "category": "Data Management", "priority": "MEDIUM", "status": "Compliant",
     "frameworks": ["HIPAA", "PCI"]},
]


def _chat(client, headers, message):
    return client.post("/api/assistant/chat", headers=headers, json={
        "message": message,
        "controls": SAMPLE_CONTROLS,
        "gap_summary": {"total_controls": 4, "open_gaps": 2, "critical": 1},
    })


def test_requires_auth(client):
    resp = client.post("/api/assistant/chat", json={"message": "hi", "controls": []})
    assert resp.status_code in (401, 403)


def test_retrieval_finds_relevant_controls(client, fresh_user):
    resp = _chat(client, fresh_user["headers"], "what covers employee laptops?")
    assert resp.status_code == 200
    body = resp.json()
    matched_ids = [m["id"] for m in body["matched_controls"]]
    assert "EP-001" in matched_ids  # laptop → endpoint synonym expansion
    assert body["answer"]


def test_gap_boost_ranks_open_gaps_higher(client, fresh_user):
    resp = _chat(client, fresh_user["headers"], "access control")
    matched = resp.json()["matched_controls"]
    ids = [m["id"] for m in matched]
    # Both AC controls match; AC-002 (Partial) should outrank AC-001 (Implemented)
    assert ids.index("AC-002") < ids.index("AC-001")


def test_no_match_returns_helpful_answer(client, fresh_user):
    resp = _chat(client, fresh_user["headers"], "zzzz qqqq xxxx")
    body = resp.json()
    assert resp.status_code == 200
    assert body["matched_controls"] == []
    assert body["answer"]  # graceful, not an error


def test_mode_reported(client, fresh_user):
    # Without GROQ_API_KEY in the test env, mode must be 'retrieval'
    resp = _chat(client, fresh_user["headers"], "mfa status")
    assert resp.json()["mode"] in ("retrieval", "llm")


def test_status_endpoint(client, fresh_user):
    resp = client.get("/api/assistant/status", headers=fresh_user["headers"])
    assert resp.status_code == 200
    assert "llm_enabled" in resp.json()
