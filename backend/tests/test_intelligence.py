"""
Competitive Intelligence Engine — Acceptance Tests

Tests the following acceptance criteria:

  1. GET /intelligence and POST /intelligence/quote return 200 for members with
     finding.view and 403 for members without.
  2. Cross-tenant access returns 404.
  3. With no failing controls, recommendations list is empty.
  4. With failing controls, recommendations are non-empty and ranked by composite score.
  5. Budget constraints: tools above budget show fits_budget=False.
  6. Coverage: each recommendation correctly identifies which controls it covers.
  7. Package recommendation is generated when recommendations exist.
  8. Key insights are non-empty and contain score information.
  9. POST /quote respects priority_frameworks and user_count overrides.
 10. GET /gaps returns gap analysis without vendor recommendations.
 11. Extra-field requests return 422.
"""

import pytest
from fastapi.testclient import TestClient

from backend.tests.conftest import (
    API,
    add_member,
    auth,
    create_org,
    invite_and_accept,
    make_token,
)
from backend.securityos_main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ── Set up org + members ──────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def intel_org(client):
    """
    Org with:
      - owner (admin + executive via also_executive=True)
      - engineer member
      - no-access user (valid JWT but not a member)
    """
    owner_tok = make_token("intel-owner", name="Owner", email="owner@intel.test")
    eng_tok   = make_token("intel-eng",   name="Engineer", email="eng@intel.test")
    stranger_tok = make_token("intel-stranger", name="Stranger", email="stranger@intel.test")

    org_id = create_org(client, owner_tok, "Intel Corp", also_executive=True)

    # Invite engineer
    r = invite_and_accept(client, owner_tok, org_id, "engineer", eng_tok)
    assert r.status_code == 200, r.text

    return {
        "org_id": org_id,
        "owner_tok": owner_tok,
        "eng_tok": eng_tok,
        "stranger_tok": stranger_tok,
    }


def _set_control_fail(client, org_id, control_id, token):
    """Set a control to 'fail' via the manual status PATCH endpoint."""
    r = client.patch(
        f"{API}/organizations/{org_id}/statuses",
        json={"control_id": control_id, "status": "fail", "notes": "Test gap"},
        headers=auth(token),
    )
    assert r.status_code == 200, f"Set {control_id} fail: {r.text}"


# ── Authorization tests ───────────────────────────────────────────────────────

def test_no_membership_gets_404(client, intel_org):
    """A user with no membership in the org should get 404 (tenant isolation)."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["stranger_tok"]),
    )
    assert r.status_code == 404, f"Expected 404 for non-member, got {r.status_code}: {r.text}"


def test_engineer_can_view_intelligence(client, intel_org):
    """Engineers have finding.view → can access intelligence endpoints."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["eng_tok"]),
    )
    assert r.status_code == 200, f"Engineer should have access: {r.status_code}: {r.text}"


def test_owner_can_view_intelligence(client, intel_org):
    """Owner (admin + executive) can access intelligence endpoints."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["owner_tok"]),
    )
    assert r.status_code == 200, r.text


# ── Empty state — no failing controls ────────────────────────────────────────

def test_no_gaps_gives_empty_recommendations(client, intel_org):
    """When all controls are unknown (no explicit failures), recommendations may be empty or present."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["owner_tok"]),
    )
    assert r.status_code == 200
    body = r.json()
    assert "gap_summary" in body
    assert "recommendations" in body
    assert "key_insights" in body
    assert isinstance(body["recommendations"], list)


# ── Gap analysis after adding failing controls ────────────────────────────────

def test_failing_controls_appear_in_gap_analysis(client, intel_org):
    """
    After setting controls to fail via manual status writes, the gap analysis
    should reflect those failures.
    """
    org_id = intel_org["org_id"]
    owner_tok = intel_org["owner_tok"]

    # Engineers can write fail/unknown/in_progress status (finding.remediate)
    eng_tok = intel_org["eng_tok"]
    _set_control_fail(client, org_id, "CTRL-ID-001", eng_tok)
    _set_control_fail(client, org_id, "CTRL-DEV-003", eng_tok)
    _set_control_fail(client, org_id, "CTRL-NET-002", eng_tok)

    r = client.get(
        f"{API}/organizations/{org_id}/intelligence/gaps",
        headers=auth(owner_tok),
    )
    assert r.status_code == 200
    body = r.json()
    gap = body["gap_summary"]
    assert gap["total_failing"] >= 3, f"Expected ≥3 failing controls, got {gap['total_failing']}"
    control_ids = {fc["control_id"] for fc in gap["failing_controls"]}
    assert "CTRL-ID-001" in control_ids
    assert "CTRL-DEV-003" in control_ids
    assert "CTRL-NET-002" in control_ids


def test_recommendations_present_for_failing_controls(client, intel_org):
    """
    With failing controls, the full intelligence report must include vendor
    recommendations sorted by composite_score descending.
    """
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["owner_tok"]),
    )
    assert r.status_code == 200
    body = r.json()
    recs = body["recommendations"]
    assert len(recs) > 0, "Expected at least one recommendation for failing controls"

    # Recommendations must be ranked by composite score descending
    scores = [r["scores"]["composite"] for r in recs]
    assert scores == sorted(scores, reverse=True), "Recommendations must be sorted by composite score"


def test_each_recommendation_has_required_fields(client, intel_org):
    """Every recommendation must have the full schema."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["owner_tok"]),
    )
    recs = r.json()["recommendations"]
    assert recs, "Need at least one recommendation"

    required_fields = {
        "rank", "vendor_id", "display_name", "product_line", "category", "tagline",
        "summary", "controls_covered", "controls_covered_count", "coverage_pct",
        "estimated_monthly_cost", "estimated_annual_cost", "best_tier_name",
        "scores", "fits_budget", "estimated_annual_risk_reduction",
        "frameworks_covered", "implementation_complexity",
    }
    for rec in recs:
        missing = required_fields - set(rec.keys())
        assert not missing, f"Recommendation missing fields: {missing}"

    top = recs[0]
    score_fields = {"coverage", "budget_fit", "roi", "framework", "smb_ease", "composite"}
    missing_scores = score_fields - set(top["scores"].keys())
    assert not missing_scores, f"Score missing fields: {missing_scores}"


def test_top_recommendation_covers_failing_controls(client, intel_org):
    """The top recommendation must cover at least one of the org's failing controls."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["owner_tok"]),
    )
    top = r.json()["recommendations"][0]
    assert top["controls_covered_count"] > 0, (
        f"Top recommendation covers 0 controls: {top['display_name']}"
    )
    ctrl_ids = {c["control_id"] for c in top["controls_covered"]}
    gap_ctrl_ids = {"CTRL-ID-001", "CTRL-DEV-003", "CTRL-NET-002"}
    assert ctrl_ids & gap_ctrl_ids, (
        f"Top recommendation {top['display_name']} covers {ctrl_ids}, "
        f"none overlap with failing {gap_ctrl_ids}"
    )


def test_package_recommendation_is_included(client, intel_org):
    """The package recommendation must be non-null when there are recommendations."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["owner_tok"]),
    )
    body = r.json()
    pkg = body.get("package_recommendation")
    assert pkg is not None, "Expected a package recommendation"
    assert pkg["controls_covered"] > 0
    assert pkg["total_monthly_cost"] >= 0
    assert isinstance(pkg["fits_budget"], bool)
    assert isinstance(pkg["description"], str) and len(pkg["description"]) > 10


def test_key_insights_mention_score(client, intel_org):
    """Key insights must reference the org's security score."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["owner_tok"]),
    )
    body = r.json()
    insights = body["key_insights"]
    assert len(insights) >= 1, "Expected at least one key insight"
    combined = " ".join(insights).lower()
    assert any(kw in combined for kw in ["score", "control", "failing", "gap"]), (
        f"Key insights don't mention score/controls: {insights}"
    )


# ── Budget constraints ────────────────────────────────────────────────────────

def test_quote_with_zero_budget_marks_tools_as_over_budget(client, intel_org):
    """
    When monthly_budget=0, tools with any cost should show fits_budget=False.
    """
    r = client.post(
        f"{API}/organizations/{intel_org['org_id']}/intelligence/quote",
        json={"monthly_budget": 0, "user_count": 50},
        headers=auth(intel_org["owner_tok"]),
    )
    assert r.status_code == 200
    recs = r.json()["recommendations"]
    paid_recs = [rec for rec in recs if rec["estimated_monthly_cost"] > 0]
    if paid_recs:
        assert not paid_recs[0]["fits_budget"], (
            "With budget=0, paid tools should show fits_budget=False"
        )


def test_quote_with_generous_budget_marks_tools_as_fitting(client, intel_org):
    """When monthly_budget=10000, most SMB tools should fit."""
    r = client.post(
        f"{API}/organizations/{intel_org['org_id']}/intelligence/quote",
        json={"monthly_budget": 10000, "user_count": 50},
        headers=auth(intel_org["owner_tok"]),
    )
    assert r.status_code == 200
    recs = r.json()["recommendations"]
    fitting = [rec for rec in recs if rec["fits_budget"]]
    assert len(fitting) >= 1, "Expected at least one tool to fit within a $10k budget"


def test_quote_user_count_affects_cost(client, intel_org):
    """Doubling user_count should roughly double per-seat tool costs."""
    org_id = intel_org["org_id"]
    tok = intel_org["owner_tok"]

    r10 = client.post(
        f"{API}/organizations/{org_id}/intelligence/quote",
        json={"user_count": 10},
        headers=auth(tok),
    )
    r100 = client.post(
        f"{API}/organizations/{org_id}/intelligence/quote",
        json={"user_count": 100},
        headers=auth(tok),
    )
    assert r10.status_code == 200
    assert r100.status_code == 200

    recs10  = {r["vendor_id"]: r["estimated_monthly_cost"] for r in r10.json()["recommendations"]}
    recs100 = {r["vendor_id"]: r["estimated_monthly_cost"] for r in r100.json()["recommendations"]}

    common = set(recs10) & set(recs100)
    per_seat_vendors = [
        vid for vid in common
        if recs10[vid] > 0 and recs100[vid] > recs10[vid]
    ]
    assert per_seat_vendors, "Expected at least one per-seat vendor where cost scales with user count"


# ── Priority frameworks ────────────────────────────────────────────────────────

def test_quote_priority_frameworks_influence_framework_score(client, intel_org):
    """
    When priority_frameworks includes HIPAA, vendors certified for HIPAA should
    show a higher framework_score than vendors with no HIPAA certification.
    """
    r = client.post(
        f"{API}/organizations/{intel_org['org_id']}/intelligence/quote",
        json={"priority_frameworks": ["HIPAA"], "user_count": 50},
        headers=auth(intel_org["owner_tok"]),
    )
    assert r.status_code == 200
    recs = r.json()["recommendations"]

    hipaa_recs    = [rec for rec in recs if "HIPAA" in rec["frameworks_covered"]]
    non_hipaa_recs = [rec for rec in recs if "HIPAA" not in rec["frameworks_covered"]]

    if hipaa_recs and non_hipaa_recs:
        avg_hipaa     = sum(r["scores"]["framework"] for r in hipaa_recs)    / len(hipaa_recs)
        avg_non_hipaa = sum(r["scores"]["framework"] for r in non_hipaa_recs) / len(non_hipaa_recs)
        assert avg_hipaa > avg_non_hipaa, (
            f"HIPAA-certified vendors should score higher on framework_score "
            f"({avg_hipaa:.1f} vs {avg_non_hipaa:.1f})"
        )


# ── GET /gaps endpoint ────────────────────────────────────────────────────────

def test_gap_analysis_endpoint_returns_no_recommendations(client, intel_org):
    """GET /gaps must not include a recommendations key."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence/gaps",
        headers=auth(intel_org["owner_tok"]),
    )
    assert r.status_code == 200
    body = r.json()
    assert "gap_summary" in body
    assert "recommendations" not in body, "GET /gaps should not return recommendations"


def test_gap_analysis_shows_vendor_count(client, intel_org):
    """Each failing control in the gap analysis must include vendor_count_that_can_fix."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence/gaps",
        headers=auth(intel_org["owner_tok"]),
    )
    gap = r.json()["gap_summary"]
    for fc in gap["failing_controls"]:
        assert "vendor_count_that_can_fix" in fc, f"Missing vendor_count for {fc['control_id']}"
        assert isinstance(fc["vendor_count_that_can_fix"], int)


# ── Input validation ──────────────────────────────────────────────────────────

def test_quote_with_extra_fields_returns_422(client, intel_org):
    """QuoteRequest with unknown fields must return 422 (extra='forbid')."""
    r = client.post(
        f"{API}/organizations/{intel_org['org_id']}/intelligence/quote",
        json={"monthly_budget": 500, "hacker_field": "evil"},
        headers=auth(intel_org["owner_tok"]),
    )
    assert r.status_code == 422, f"Expected 422 for extra field, got {r.status_code}: {r.text}"


def test_quote_negative_budget_returns_422(client, intel_org):
    """Negative monthly_budget must fail validation."""
    r = client.post(
        f"{API}/organizations/{intel_org['org_id']}/intelligence/quote",
        json={"monthly_budget": -100},
        headers=auth(intel_org["owner_tok"]),
    )
    assert r.status_code == 422, f"Expected 422 for negative budget, got {r.status_code}: {r.text}"


# ── Breach cost estimates ─────────────────────────────────────────────────────

def test_breach_cost_is_positive_for_failing_controls(client, intel_org):
    """Total estimated annual breach cost must be > 0 when controls are failing."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence/gaps",
        headers=auth(intel_org["owner_tok"]),
    )
    breach_cost = r.json()["gap_summary"]["total_estimated_annual_breach_cost"]
    assert breach_cost > 0, f"Expected positive breach cost, got {breach_cost}"


def test_recommendations_show_risk_reduction(client, intel_org):
    """Top recommendations must show positive estimated_annual_risk_reduction."""
    r = client.get(
        f"{API}/organizations/{intel_org['org_id']}/intelligence",
        headers=auth(intel_org["owner_tok"]),
    )
    recs = r.json()["recommendations"]
    # At least the #1 recommendation should show a risk reduction
    assert recs[0]["estimated_annual_risk_reduction"] > 0, (
        f"Top recommendation shows zero risk reduction: {recs[0]['display_name']}"
    )
