"""
Competitive Intelligence Recommender — Core Ranking Engine

Takes a GapSummary + client context (budget, user count, industry) and
produces a ranked list of vendor recommendations with:
  - Coverage score     — what % of failing controls this vendor addresses
  - Budget fit score   — how well the cost fits within the stated budget
  - ROI score          — compliance lift per dollar spent
  - Framework score    — alignment with the org's regulatory exposure
  - SMB ease score     — implementation ease for a small team
  - Composite rating   — weighted average of the above (0–100)

The composite rating drives the "buy" recommendation shown to the customer.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from backend.evidence.third_party_coverage import PROVIDERS_BY_ID, ThirdPartyProvider
from backend.intelligence.gap_analyzer import (
    GapSummary,
    FailingControl,
    _parse_employee_count,
)
from backend.intelligence.vendor_pricing import (
    VENDOR_CATALOG_BY_ID,
    HIGH_IMPACT_FRAMEWORKS,
    VendorPricing,
    estimate_monthly_cost,
)

# ── Rating weights ────────────────────────────────────────────────────────────
# Must sum to 1.0
_W_COVERAGE   = 0.35   # most important: does it fix my gaps?
_W_BUDGET_FIT = 0.25   # does it fit my wallet?
_W_ROI        = 0.20   # efficiency: coverage per dollar
_W_FRAMEWORK  = 0.12   # does it help my specific compliance requirements?
_W_SMB_EASE   = 0.08   # can a small team deploy this without professional services?

assert abs((_W_COVERAGE + _W_BUDGET_FIT + _W_ROI + _W_FRAMEWORK + _W_SMB_EASE) - 1.0) < 0.001


# ── Data models ───────────────────────────────────────────────────────────────

@dataclass
class ControlCoverageDetail:
    control_id: str
    short_name: str
    severity: str
    status: str   # "fail" | "unknown" | "in_progress"


@dataclass
class VendorRecommendation:
    """A single vendor recommendation with full scoring breakdown."""
    rank: int
    vendor_id: str
    display_name: str
    product_line: str
    category: str
    tagline: str

    # What it fixes
    controls_covered: List[ControlCoverageDetail]
    controls_covered_count: int
    total_failing_in_category: int
    coverage_pct: float               # 0–100; % of ALL failing controls covered

    # Cost
    estimated_monthly_cost: float
    estimated_annual_cost: float
    best_tier_name: str

    # Scores (each 0–100)
    coverage_score: float
    budget_fit_score: float
    roi_score: float
    framework_score: float
    smb_ease_score: float
    composite_score: float            # 0–100; the headline rating

    # Context
    fits_budget: bool
    implementation_complexity: str
    implementation_weeks_typical: float
    frameworks_covered: List[str]
    overlapping_frameworks: List[str]  # intersection with org's regulatory_exposure
    free_trial_days: int
    smb_friendly: bool

    # Estimated annual breach-cost reduction if this vendor is deployed
    estimated_annual_risk_reduction: float

    # Narrative summary (generated, not LLM)
    summary: str


@dataclass
class RecommendationReport:
    """Complete competitive intelligence report for an org."""
    org_id: str
    score_before: int
    estimated_score_after_top_recommendation: int
    monthly_budget: Optional[float]
    user_count: int
    recommendations: List[VendorRecommendation]
    total_failing_controls: int
    total_estimated_annual_breach_cost: float
    estimated_annual_risk_reduction_all: float  # if ALL top recommendations deployed
    package_recommendation: Optional[PackageRecommendation]
    uncoverable_controls: List[str]   # control_ids with no vendor coverage
    key_insights: List[str]           # bullet-point insights for the executive summary


@dataclass
class PackageRecommendation:
    """Suggested bundle of vendors that together maximize coverage within budget."""
    vendors: List[str]                # vendor_ids
    display_names: List[str]
    total_monthly_cost: float
    total_annual_cost: float
    controls_covered: int
    total_failing: int
    coverage_pct: float
    fits_budget: bool
    description: str


# ── Scoring helpers ───────────────────────────────────────────────────────────

def _coverage_score(vendor_id: str, gap: GapSummary) -> Tuple[float, List[FailingControl]]:
    """
    Return (coverage_score 0–100, list of failing controls this vendor covers).
    Coverage score is severity-weighted, not just a count.
    """
    _sev_weight = {"critical": 4.0, "high": 3.0, "medium": 2.0, "low": 1.0}
    total_weight = sum(_sev_weight.get(fc.severity, 1.0) for fc in gap.failing_controls)
    if total_weight == 0:
        return 0.0, []

    covered = [fc for fc in gap.failing_controls if vendor_id in fc.vendor_ids_that_cover]
    covered_weight = sum(_sev_weight.get(fc.severity, 1.0) for fc in covered)
    score = (covered_weight / total_weight) * 100
    return min(score, 100.0), covered


def _budget_fit_score(
    monthly_cost: float,
    monthly_budget: Optional[float],
    category: str,
    gap: GapSummary,
) -> float:
    """
    Return 0–100 budget fit.  100 = comfortably within budget; degrades above budget.
    If no budget is provided, score is neutral (50).
    """
    if monthly_budget is None:
        return 50.0  # unknown budget → neutral score
    if monthly_budget <= 0:
        return 0.0 if monthly_cost > 0 else 100.0  # $0 budget: only free tools score well

    # Weight the category's share of budget by how many gaps are in that category
    category_gap_count = len(gap.gaps_by_category.get(category, []))
    total_gap_count = len(gap.failing_controls) or 1
    category_budget_share = monthly_budget * (category_gap_count / total_gap_count)
    category_budget_share = max(category_budget_share, monthly_budget * 0.1)

    if monthly_cost <= 0:
        return 50.0

    ratio = monthly_cost / category_budget_share
    if ratio <= 1.0:
        return 100.0
    if ratio <= 1.5:
        return 80.0 - (ratio - 1.0) * 60.0
    if ratio <= 2.5:
        return 50.0 - (ratio - 1.5) * 25.0
    return max(0.0, 25.0 - (ratio - 2.5) * 10.0)


def _roi_score(
    covered: List[FailingControl],
    monthly_cost: float,
    total_annual_breach_cost: float,
) -> float:
    """
    Return 0–100 ROI score: how much risk reduction per dollar.
    """
    if monthly_cost <= 0:
        return 100.0  # free tools get max ROI
    annual_cost = monthly_cost * 12
    risk_reduction = sum(fc.estimated_annual_breach_cost for fc in covered)
    if risk_reduction <= 0:
        return 10.0  # minimal — addresses no material financial risk
    ratio = risk_reduction / max(annual_cost, 1)
    # ratio > 1 means the tool pays for itself in avoided breach costs
    return min(100.0, math.log1p(ratio) * 30)


def _framework_score(
    vendor_pricing: VendorPricing,
    regulatory_exposure: List[str],
) -> float:
    """
    Return 0–100: how well the vendor's certified frameworks overlap with the
    org's regulatory exposure.
    """
    if not regulatory_exposure:
        return 50.0  # neutral when no frameworks declared

    org_frameworks: Set[str] = set()
    for fw in regulatory_exposure:
        fw_upper = fw.upper()
        for known in {"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "FedRAMP",
                      "GDPR", "CMMC", "CCPA", "CISA"}:
            if known in fw_upper:
                org_frameworks.add(known)

    if not org_frameworks:
        return 50.0

    overlap = org_frameworks & vendor_pricing.frameworks
    coverage = len(overlap) / len(org_frameworks)
    return min(100.0, coverage * 100)


def _smb_ease_score(vendor_pricing: VendorPricing) -> float:
    """Return 0–100 ease score based on implementation complexity and SMB friendliness."""
    base = 100.0 if vendor_pricing.smb_friendly else 60.0
    if vendor_pricing.implementation_complexity == "low":
        impl_score = 100.0
    elif vendor_pricing.implementation_complexity == "medium":
        impl_score = 65.0
    else:  # high
        impl_score = 30.0

    weeks_penalty = min(30.0, vendor_pricing.implementation_weeks_typical * 5)
    return max(0.0, (base + impl_score) / 2 - weeks_penalty)


def _generate_summary(
    rec: VendorRecommendation,
    gap: GapSummary,
    monthly_budget: Optional[float],
) -> str:
    """Build a plain-language recommendation summary."""
    lines = []
    if rec.controls_covered_count == 0:
        return (
            f"{rec.display_name} does not directly address your current failing controls, "
            "but strengthens your overall security posture."
        )

    ctrl_word = "control" if rec.controls_covered_count == 1 else "controls"
    lines.append(
        f"{rec.display_name} addresses {rec.controls_covered_count} of your "
        f"{gap.total_failing + gap.total_unknown} open {ctrl_word} "
        f"({rec.coverage_pct:.0f}% coverage)."
    )

    if rec.estimated_annual_risk_reduction > 0:
        lines.append(
            f"Deploying this tool could reduce your estimated annual compliance-breach "
            f"exposure by ${rec.estimated_annual_risk_reduction:,.0f}."
        )

    if rec.estimated_monthly_cost > 0:
        annual = rec.estimated_annual_cost
        lines.append(
            f"Estimated cost: ${rec.estimated_monthly_cost:,.0f}/month "
            f"(${annual:,.0f}/year) at {rec.user_count if hasattr(rec, 'user_count') else '?'} seats."
        )
        if monthly_budget and rec.fits_budget:
            lines.append("This fits within your stated security budget.")
        elif monthly_budget and not rec.fits_budget:
            lines.append(
                f"This exceeds your current budget allocation for this control category. "
                "Consider requesting a volume discount or phasing the rollout."
            )

    if rec.overlapping_frameworks:
        fw_list = ", ".join(rec.overlapping_frameworks)
        lines.append(
            f"Supports your compliance requirements: {fw_list}."
        )

    if rec.free_trial_days > 0:
        lines.append(f"{rec.free_trial_days}-day free trial available — no commitment required.")

    impl = rec.implementation_complexity
    weeks = rec.implementation_weeks_typical
    lines.append(
        f"Implementation: {impl} complexity, typically {weeks:.0f}–{math.ceil(weeks * 1.5):.0f} weeks."
    )

    return " ".join(lines)


# ── Main recommender ──────────────────────────────────────────────────────────

def generate_recommendations(
    gap: GapSummary,
    *,
    monthly_budget: Optional[float] = None,
    user_count: int = 25,
    top_n: int = 10,
) -> List[VendorRecommendation]:
    """
    Generate a ranked list of vendor recommendations for an org's compliance gaps.

    Args:
        gap: Output of gap_analyzer.analyze_gaps()
        monthly_budget: Total monthly security budget in USD (None = unknown)
        user_count: Number of employees/endpoints for cost estimation
        top_n: Maximum recommendations to return

    Returns:
        List of VendorRecommendation, sorted by composite_score descending.
    """
    if not gap.failing_controls:
        return []

    recs: List[VendorRecommendation] = []

    for vendor_pricing in VENDOR_CATALOG_BY_ID.values():
        c_score, covered = _coverage_score(vendor_pricing.vendor_id, gap)
        if c_score < 5.0:
            # Skip vendors with < 5% coverage — not relevant to this org's gaps
            continue

        monthly_cost = estimate_monthly_cost(vendor_pricing, user_count)
        annual_cost = monthly_cost * 12

        # Find the best tier name
        from backend.intelligence.vendor_pricing import _best_tier_for
        best_tier = _best_tier_for(vendor_pricing, user_count)
        tier_name = best_tier.tier_name if best_tier else vendor_pricing.tiers[0].tier_name if vendor_pricing.tiers else ""

        bf_score = _budget_fit_score(monthly_cost, monthly_budget, vendor_pricing.category, gap)
        roi_score = _roi_score(covered, monthly_cost, gap.total_estimated_annual_breach_cost)
        fw_score = _framework_score(vendor_pricing, gap.regulatory_exposure)
        ease_score = _smb_ease_score(vendor_pricing)

        composite = (
            _W_COVERAGE   * c_score
            + _W_BUDGET_FIT * bf_score
            + _W_ROI        * roi_score
            + _W_FRAMEWORK  * fw_score
            + _W_SMB_EASE   * ease_score
        )

        # Framework overlap
        org_frameworks: Set[str] = set()
        for fw in gap.regulatory_exposure:
            fw_u = fw.upper()
            for known in {"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001",
                          "FedRAMP", "GDPR", "CMMC", "CCPA", "CISA"}:
                if known in fw_u:
                    org_frameworks.add(known)
        overlap_fw = sorted(org_frameworks & vendor_pricing.frameworks)

        coverage_pct = len(covered) / max(len(gap.failing_controls), 1) * 100
        # monthly_budget=None means "unknown" → neutral True
        # monthly_budget=0 means "no budget" → only free tools fit
        fits_budget = (
            monthly_budget is None
            or monthly_cost <= monthly_budget
        )
        risk_reduction = sum(fc.estimated_annual_breach_cost for fc in covered)

        rec = VendorRecommendation(
            rank=0,  # set after sort
            vendor_id=vendor_pricing.vendor_id,
            display_name=vendor_pricing.display_name,
            product_line=vendor_pricing.product_line,
            category=vendor_pricing.category,
            tagline=vendor_pricing.tagline,
            controls_covered=[
                ControlCoverageDetail(
                    control_id=fc.control_id,
                    short_name=fc.short_name,
                    severity=fc.severity,
                    status=fc.status,
                )
                for fc in covered
            ],
            controls_covered_count=len(covered),
            total_failing_in_category=len(gap.gaps_by_category.get(vendor_pricing.category, [])),
            coverage_pct=round(coverage_pct, 1),
            estimated_monthly_cost=round(monthly_cost, 2),
            estimated_annual_cost=round(annual_cost, 2),
            best_tier_name=tier_name,
            coverage_score=round(c_score, 1),
            budget_fit_score=round(bf_score, 1),
            roi_score=round(roi_score, 1),
            framework_score=round(fw_score, 1),
            smb_ease_score=round(ease_score, 1),
            composite_score=round(composite, 1),
            fits_budget=fits_budget,
            implementation_complexity=vendor_pricing.implementation_complexity,
            implementation_weeks_typical=vendor_pricing.implementation_weeks_typical,
            frameworks_covered=sorted(vendor_pricing.frameworks),
            overlapping_frameworks=overlap_fw,
            free_trial_days=vendor_pricing.free_trial_days,
            smb_friendly=vendor_pricing.smb_friendly,
            estimated_annual_risk_reduction=round(risk_reduction, 2),
            summary="",  # filled in below
        )
        recs.append(rec)

    # Sort: composite descending, then coverage pct descending
    recs.sort(key=lambda r: (-r.composite_score, -r.coverage_pct))

    # Assign ranks and generate summaries
    for i, rec in enumerate(recs[:top_n]):
        rec.rank = i + 1
        rec.summary = _generate_summary(rec, gap, monthly_budget)

    return recs[:top_n]


def build_package_recommendation(
    recs: List[VendorRecommendation],
    gap: GapSummary,
    monthly_budget: Optional[float],
) -> Optional[PackageRecommendation]:
    """
    Suggest a bundle of vendors that together maximize coverage within budget.
    Greedy: pick the highest-composite-score vendor per category that fits the
    remaining budget, up to 3 vendors.
    """
    if not recs:
        return None

    seen_categories: Set[str] = set()
    selected: List[VendorRecommendation] = []
    cumulative_cost = 0.0
    covered_ctrl_ids: Set[str] = set()

    for rec in recs:
        if rec.category in seen_categories:
            continue
        if monthly_budget and cumulative_cost + rec.estimated_monthly_cost > monthly_budget * 1.15:
            # Allow up to 15% over budget for a strong recommendation
            continue

        selected.append(rec)
        seen_categories.add(rec.category)
        cumulative_cost += rec.estimated_monthly_cost
        for ctrl in rec.controls_covered:
            covered_ctrl_ids.add(ctrl.control_id)

        if len(selected) >= 3:
            break

    if not selected:
        return None

    all_failing_ids = {fc.control_id for fc in gap.failing_controls}
    coverage_pct = len(covered_ctrl_ids & all_failing_ids) / max(len(all_failing_ids), 1) * 100
    fits = monthly_budget is None or cumulative_cost <= monthly_budget * 1.15

    names = [r.display_name for r in selected]
    if len(names) == 1:
        desc = f"{names[0]} addresses {coverage_pct:.0f}% of your open controls."
    elif len(names) == 2:
        desc = (
            f"{names[0]} + {names[1]} together cover {coverage_pct:.0f}% of your "
            f"open controls at ${cumulative_cost:,.0f}/month."
        )
    else:
        desc = (
            f"The {' + '.join(names)} bundle covers {coverage_pct:.0f}% of your "
            f"open controls at ${cumulative_cost:,.0f}/month combined."
        )

    return PackageRecommendation(
        vendors=[r.vendor_id for r in selected],
        display_names=names,
        total_monthly_cost=round(cumulative_cost, 2),
        total_annual_cost=round(cumulative_cost * 12, 2),
        controls_covered=len(covered_ctrl_ids & all_failing_ids),
        total_failing=len(all_failing_ids),
        coverage_pct=round(coverage_pct, 1),
        fits_budget=fits,
        description=desc,
    )


def generate_key_insights(
    gap: GapSummary,
    recs: List[VendorRecommendation],
    monthly_budget: Optional[float],
    user_count: int,
) -> List[str]:
    """Generate 3–6 executive-summary bullet points."""
    insights: List[str] = []

    if gap.total_failing + gap.total_unknown == 0:
        insights.append("All applicable controls are passing. No critical gaps found.")
        return insights

    insights.append(
        f"You have {gap.total_failing} failing and {gap.total_unknown} unverified controls "
        f"out of {gap.total_applicable} applicable — your current security score is {gap.score}/100."
    )

    if gap.total_estimated_annual_breach_cost > 0:
        insights.append(
            f"Your unaddressed control gaps represent an estimated "
            f"${gap.total_estimated_annual_breach_cost:,.0f} in annual compliance-breach exposure."
        )

    if recs:
        top = recs[0]
        insights.append(
            f"Top recommendation: {top.display_name} (rated {top.composite_score:.0f}/100) "
            f"covers {top.controls_covered_count} of your open controls "
            f"at ~${top.estimated_monthly_cost:,.0f}/month ({user_count} users)."
        )
        if top.estimated_annual_risk_reduction > 0:
            insights.append(
                f"Deploying {top.display_name} alone could eliminate "
                f"${top.estimated_annual_risk_reduction:,.0f} of annual breach-cost exposure."
            )

    if monthly_budget:
        total_top3_cost = sum(r.estimated_monthly_cost for r in recs[:3])
        if total_top3_cost <= monthly_budget:
            insights.append(
                f"Your top 3 recommendations fit within your ${monthly_budget:,.0f}/month "
                f"security budget (combined: ${total_top3_cost:,.0f}/month)."
            )
        else:
            insights.append(
                f"Your top recommendation alone requires ${recs[0].estimated_monthly_cost:,.0f}/month. "
                f"Consider phasing deployment to stay within your ${monthly_budget:,.0f}/month budget."
            )

    if gap.uncoverable_controls:
        ctrl_names = ", ".join(fc.short_name for fc in gap.uncoverable_controls[:3])
        insights.append(
            f"{len(gap.uncoverable_controls)} control(s) have no automated vendor solution yet "
            f"({ctrl_names}) — these require manual policy or process controls."
        )

    return insights
