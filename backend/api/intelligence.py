"""
Competitive Intelligence API — Phase 3 Feature

When a customer has failing compliance controls, this engine analyses the gap,
benchmarks available security tools against their budget and use case, and
returns a ranked list of recommendations with ROI estimates.

Routes:
  GET  /api/v1/securityos/organizations/{org_id}/intelligence
       Full competitive intelligence report (requires finding.view)

  GET  /api/v1/securityos/organizations/{org_id}/intelligence/gaps
       Gap-only analysis without vendor recommendations (finding.view)

  POST /api/v1/securityos/organizations/{org_id}/intelligence/quote
       Budget-aware recommendation — caller supplies budget + user count.
       Returns the top vendor picks that fit within the budget and use case.

Authentication: Bearer JWT, org membership required.
Authorization: finding.view permission.
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.auth.context import Principal, get_principal, require_org_access
from backend.auth.permissions import PERM_FINDING_VIEW, require_permission
from backend.controls.state import effective_statuses
from backend.repositories.org_repo import org_repo
from backend.scoring.engine import calculate_score, load_catalog
from backend.intelligence.gap_analyzer import analyze_gaps, _parse_employee_count
from backend.intelligence.recommender import (
    build_package_recommendation,
    generate_key_insights,
    generate_recommendations,
    PackageRecommendation,
    RecommendationReport,
    VendorRecommendation,
)

router = APIRouter(prefix="/api/v1/securityos", tags=["Intelligence"])

_catalog = load_catalog()   # loaded once at import time


# ── Pydantic models ───────────────────────────────────────────────────────────

class QuoteRequest(BaseModel):
    """Input for a budget-aligned recommendation quote."""
    model_config = ConfigDict(extra="forbid")

    monthly_budget: Optional[float] = Field(
        None,
        ge=0,
        description="Total monthly security-tool budget in USD. Omit if unknown.",
    )
    user_count: Optional[int] = Field(
        None,
        ge=1,
        le=100_000,
        description="Number of users/endpoints for cost estimation. Defaults to org employee count.",
    )
    priority_frameworks: List[str] = Field(
        default_factory=list,
        description='Compliance frameworks to prioritize. E.g. ["HIPAA", "PCI-DSS"].',
    )
    use_case: Optional[str] = Field(
        None,
        max_length=500,
        description="Free-text use-case description (industry, data types, regulatory context).",
    )
    top_n: int = Field(
        default=10,
        ge=1,
        le=30,
        description="Maximum number of recommendations to return.",
    )


def _serialize_package(pkg: Optional[PackageRecommendation]) -> Optional[Dict]:
    if pkg is None:
        return None
    return {
        "vendors": pkg.vendors,
        "display_names": pkg.display_names,
        "total_monthly_cost": pkg.total_monthly_cost,
        "total_annual_cost": pkg.total_annual_cost,
        "controls_covered": pkg.controls_covered,
        "total_failing": pkg.total_failing,
        "coverage_pct": pkg.coverage_pct,
        "fits_budget": pkg.fits_budget,
        "description": pkg.description,
    }


def _serialize_rec(rec: VendorRecommendation) -> Dict:
    return {
        "rank": rec.rank,
        "vendor_id": rec.vendor_id,
        "display_name": rec.display_name,
        "product_line": rec.product_line,
        "category": rec.category,
        "tagline": rec.tagline,
        "summary": rec.summary,
        "controls_covered": [
            {
                "control_id": c.control_id,
                "short_name": c.short_name,
                "severity": c.severity,
                "status": c.status,
            }
            for c in rec.controls_covered
        ],
        "controls_covered_count": rec.controls_covered_count,
        "total_failing_in_category": rec.total_failing_in_category,
        "coverage_pct": rec.coverage_pct,
        "estimated_monthly_cost": rec.estimated_monthly_cost,
        "estimated_annual_cost": rec.estimated_annual_cost,
        "best_tier_name": rec.best_tier_name,
        "scores": {
            "coverage": rec.coverage_score,
            "budget_fit": rec.budget_fit_score,
            "roi": rec.roi_score,
            "framework": rec.framework_score,
            "smb_ease": rec.smb_ease_score,
            "composite": rec.composite_score,
        },
        "fits_budget": rec.fits_budget,
        "estimated_annual_risk_reduction": rec.estimated_annual_risk_reduction,
        "frameworks_covered": rec.frameworks_covered,
        "overlapping_frameworks": rec.overlapping_frameworks,
        "implementation_complexity": rec.implementation_complexity,
        "implementation_weeks_typical": rec.implementation_weeks_typical,
        "smb_friendly": rec.smb_friendly,
        "free_trial_days": rec.free_trial_days,
    }


def _run_intelligence(
    org_id: str,
    *,
    monthly_budget: Optional[float],
    user_count: Optional[int],
    priority_frameworks: List[str],
    top_n: int,
) -> Dict:
    """Core logic shared by GET /intelligence and POST /intelligence/quote."""
    # Load org profile for industry / employee_count / regulatory_exposure
    org = org_repo.get(org_id)
    profile: Dict = dict(org.profile) if org else {}

    # Merge caller-supplied priority frameworks into the profile's regulatory_exposure
    if priority_frameworks:
        existing = set(profile.get("regulatory_exposure") or [])
        profile["regulatory_exposure"] = sorted(existing | set(priority_frameworks))

    # Derive user count: caller > profile > default 25
    if user_count is None:
        user_count = _parse_employee_count(profile.get("employee_count", ""))

    statuses = effective_statuses(org_id)
    result = calculate_score(statuses, business_profile=profile, catalog=_catalog)

    gap = analyze_gaps(
        all_controls=result.all_controls,
        score=result.total_score,
        business_profile=profile,
    )

    recs = generate_recommendations(
        gap,
        monthly_budget=monthly_budget,
        user_count=user_count,
        top_n=top_n,
    )
    pkg = build_package_recommendation(recs, gap, monthly_budget)
    insights = generate_key_insights(gap, recs, monthly_budget, user_count)

    # Rough score projection: each covered control adds ~(max_score/total_applicable)
    top_coverage_pct = recs[0].coverage_pct if recs else 0.0
    potential_lift = top_coverage_pct / 100.0 * (100 - result.total_score) * 0.7
    estimated_score_after = min(100, int(result.total_score + potential_lift))

    return {
        "org_id": org_id,
        "score": result.total_score,
        "grade": result.grade,
        "estimated_score_after_top_recommendation": estimated_score_after,
        "monthly_budget": monthly_budget,
        "user_count": user_count,
        "gap_summary": {
            "total_failing": gap.total_failing,
            "total_unknown": gap.total_unknown,
            "total_in_progress": gap.total_in_progress,
            "total_applicable": gap.total_applicable,
            "total_estimated_annual_breach_cost": gap.total_estimated_annual_breach_cost,
            "regulatory_exposure": gap.regulatory_exposure,
            "uncoverable_controls": [
                {"control_id": fc.control_id, "short_name": fc.short_name, "severity": fc.severity}
                for fc in gap.uncoverable_controls
            ],
            "gaps_by_category": {
                cat: [
                    {
                        "control_id": fc.control_id,
                        "short_name": fc.short_name,
                        "severity": fc.severity,
                        "status": fc.status,
                        "estimated_annual_breach_cost": fc.estimated_annual_breach_cost,
                    }
                    for fc in controls
                ]
                for cat, controls in gap.gaps_by_category.items()
            },
        },
        "key_insights": insights,
        "recommendations": [_serialize_rec(r) for r in recs],
        "package_recommendation": _serialize_package(pkg),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get(
    "/organizations/{org_id}/intelligence",
    summary="Full competitive intelligence report",
)
def get_intelligence_report(
    org_id: str,
    monthly_budget: Optional[float] = None,
    user_count: Optional[int] = None,
    principal: Principal = Depends(get_principal),
):
    """
    Return a full competitive intelligence report for the org.

    Analyzes failing controls, benchmarks available security tools against
    budget and compliance requirements, and returns ranked recommendations
    with ROI estimates.

    Query params:
      monthly_budget — total monthly security-tool budget in USD (optional)
      user_count     — overrides profile employee_count for cost estimation
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    return _run_intelligence(
        org_id,
        monthly_budget=monthly_budget,
        user_count=user_count,
        priority_frameworks=[],
        top_n=10,
    )


@router.get(
    "/organizations/{org_id}/intelligence/gaps",
    summary="Compliance gap analysis only (no vendor recommendations)",
)
def get_gap_analysis(
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """
    Return the gap analysis for the org without vendor recommendations.
    Faster and useful when the client only needs to understand what is failing
    and why, without the full competitive comparison.
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    org = org_repo.get(org_id)
    profile: Dict = dict(org.profile) if org else {}
    statuses = effective_statuses(org_id)
    result = calculate_score(statuses, business_profile=profile, catalog=_catalog)

    gap = analyze_gaps(
        all_controls=result.all_controls,
        score=result.total_score,
        business_profile=profile,
    )

    return {
        "org_id": org_id,
        "score": result.total_score,
        "grade": result.grade,
        "gap_summary": {
            "total_failing": gap.total_failing,
            "total_unknown": gap.total_unknown,
            "total_in_progress": gap.total_in_progress,
            "total_applicable": gap.total_applicable,
            "total_estimated_annual_breach_cost": gap.total_estimated_annual_breach_cost,
            "regulatory_exposure": gap.regulatory_exposure,
            "failing_controls": [
                {
                    "control_id": fc.control_id,
                    "short_name": fc.short_name,
                    "severity": fc.severity,
                    "status": fc.status,
                    "category": fc.category,
                    "estimated_annual_breach_cost": fc.estimated_annual_breach_cost,
                    "vendor_count_that_can_fix": len(fc.vendor_ids_that_cover),
                }
                for fc in gap.failing_controls
            ],
            "uncoverable_controls": [
                {"control_id": fc.control_id, "short_name": fc.short_name}
                for fc in gap.uncoverable_controls
            ],
        },
    }


@router.post(
    "/organizations/{org_id}/intelligence/quote",
    summary="Budget-aligned recommendation quote",
)
def get_intelligence_quote(
    org_id: str,
    payload: QuoteRequest,
    principal: Principal = Depends(get_principal),
):
    """
    Generate a budget-aligned competitive intelligence report.

    The caller supplies their monthly security budget and optionally a list
    of compliance frameworks to prioritize. The engine returns the best-fit
    vendor package within the stated budget.

    The report includes:
    - Ranked vendor recommendations with composite scores (0–100)
    - Per-vendor cost estimate at the stated user count
    - Controls each vendor would remediate
    - Estimated annual breach-cost reduction
    - A suggested bundle (package) that maximizes coverage within budget
    - Executive-summary key insights
    """
    require_org_access(principal, org_id)
    require_permission(principal, org_id, PERM_FINDING_VIEW)

    return _run_intelligence(
        org_id,
        monthly_budget=payload.monthly_budget,
        user_count=payload.user_count,
        priority_frameworks=payload.priority_frameworks,
        top_n=payload.top_n,
    )
