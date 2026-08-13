"""TCO analyzer: tier structure, ROI math, recommendation logic."""

BASE_PAYLOAD = {
    "arr": 5_000_000,
    "operating_cost": 2_000_000,
    "headcount": 75,
    "security_spend": 120_000,
    "risk_tolerance": "balanced",
    "frameworks": ["SOC2", "HIPAA"],
    "gap_summary": {
        "critical": 10,
        "high": 8,
        "medium": 5,
        "low": 2,
        "total": 25,
        "total_controls": 120,
        "by_category": {"iam": 6, "edr": 4, "siem": 5, "vm": 3, "grc": 4, "cloud": 3},
    },
}


def test_requires_auth(client):
    assert client.post("/api/tco/analyze", json=BASE_PAYLOAD).status_code in (401, 403)


def test_returns_three_tiers(client, fresh_user):
    resp = client.post("/api/tco/analyze", headers=fresh_user["headers"], json=BASE_PAYLOAD)
    assert resp.status_code == 200
    tiers = resp.json()["tiers"]
    assert set(tiers.keys()) == {"conservative", "balanced", "aggressive"}


def test_tier_ordering_invariants(client, fresh_user):
    """Aggressive must cost more, finish faster, and reduce more risk."""
    tiers = client.post(
        "/api/tco/analyze", headers=fresh_user["headers"], json=BASE_PAYLOAD
    ).json()["tiers"]
    con, bal, agg = tiers["conservative"], tiers["balanced"], tiers["aggressive"]

    assert con["costs"]["monthly_license"] < bal["costs"]["monthly_license"] < agg["costs"]["monthly_license"]
    assert con["timeline_months"] > bal["timeline_months"] > agg["timeline_months"]
    assert con["breach_risk_reduction"] < bal["breach_risk_reduction"] < agg["breach_risk_reduction"]
    assert agg["gap_coverage_pct"] == 1.0


def test_each_tier_has_tools_costs_roi_milestones(client, fresh_user):
    tiers = client.post(
        "/api/tco/analyze", headers=fresh_user["headers"], json=BASE_PAYLOAD
    ).json()["tiers"]
    for tier in tiers.values():
        assert len(tier["tools"]) > 0
        assert tier["costs"]["total_year_1"] > 0
        assert tier["roi"]["total_annual_benefit"] > 0
        assert len(tier["milestones"]) == 3
        assert tier["narrative"]


def test_roi_components_sum(client, fresh_user):
    roi = client.post(
        "/api/tco/analyze", headers=fresh_user["headers"], json=BASE_PAYLOAD
    ).json()["tiers"]["balanced"]["roi"]
    parts = (
        roi["annual_risk_savings"]
        + roi["fine_avoidance"]
        + roi["labor_savings"]
        + roi["audit_savings"]
    )
    assert abs(parts - roi["total_annual_benefit"]) <= 2  # rounding tolerance


def test_recommendation_scales_with_arr(client, fresh_user):
    small = dict(BASE_PAYLOAD, arr=500_000,
                 gap_summary=dict(BASE_PAYLOAD["gap_summary"], critical=2, total=5))
    big = dict(BASE_PAYLOAD, arr=80_000_000)
    small_rec = client.post("/api/tco/analyze", headers=fresh_user["headers"], json=small).json()["recommended_tier"]
    big_rec = client.post("/api/tco/analyze", headers=fresh_user["headers"], json=big).json()["recommended_tier"]
    assert small_rec == "conservative"
    assert big_rec == "aggressive"


def test_risk_tolerance_override(client, fresh_user):
    payload = dict(BASE_PAYLOAD, risk_tolerance="aggressive")
    rec = client.post(
        "/api/tco/analyze", headers=fresh_user["headers"], json=payload
    ).json()["recommended_tier"]
    assert rec == "aggressive"


def test_market_catalog_present(client, fresh_user):
    body = client.post(
        "/api/tco/analyze", headers=fresh_user["headers"], json=BASE_PAYLOAD
    ).json()
    catalog = body["market_catalog"]
    assert len(catalog) == 27  # 9 categories x 3 tiers
    for entry in catalog:
        assert entry["monthly_cost"] > 0
        assert entry["tier"] in ("budget", "mid", "premium")
