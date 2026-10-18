"""
Gap Analyzer — Competitive Intelligence Engine

Given an org's failing controls, budget, and business profile, this module
produces a structured gap analysis that the recommender can act on.

Design:
  - Works entirely from in-memory data (scoring engine output + provider catalog).
  - Zero external I/O — all calls are synchronous and fast.
  - The catalog is the single source of truth for which vendor covers which control.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from backend.scoring.engine import ControlResult, ControlStatus, SEVERITY_RISK_WEIGHT
from backend.evidence.third_party_coverage import PROVIDERS, ThirdPartyProvider
from backend.intelligence.vendor_pricing import (
    VENDOR_CATALOG_BY_ID,
    BREACH_COST_BY_SEVERITY,
    HIGH_IMPACT_FRAMEWORKS,
    VendorPricing,
)


# ── Data models ───────────────────────────────────────────────────────────────

@dataclass
class FailingControl:
    """A control that is failing or unknown, with breach-cost context."""
    control_id: str
    name: str
    short_name: str
    category: str
    severity: str
    status: str                 # "fail" | "unknown" | "in_progress"
    estimated_annual_breach_cost: float
    vendor_ids_that_cover: List[str] = field(default_factory=list)


@dataclass
class GapSummary:
    """High-level gap summary for the org."""
    total_failing: int
    total_unknown: int
    total_in_progress: int
    total_applicable: int
    score: int
    max_score: int = 100
    failing_controls: List[FailingControl] = field(default_factory=list)
    total_estimated_annual_breach_cost: float = 0.0
    # Controls grouped by vendor category that could fix them
    gaps_by_category: Dict[str, List[FailingControl]] = field(default_factory=dict)
    # Regulatory frameworks the org is exposed to (from profile)
    regulatory_exposure: List[str] = field(default_factory=list)
    uncoverable_controls: List[FailingControl] = field(default_factory=list)


def _parse_employee_count(employee_count_str: str) -> int:
    """
    Parse employee_count strings like "10-50", "51-200", "1-10", "500+" into
    a representative integer for cost estimation.
    """
    if not employee_count_str:
        return 25  # safe default

    s = employee_count_str.strip().lower()
    # Handle "500+" style
    if "+" in s:
        nums = re.findall(r"\d+", s)
        return int(nums[0]) + 100 if nums else 500

    # Handle "10-50" or "10 - 50" ranges
    nums = re.findall(r"\d+", s)
    if len(nums) >= 2:
        return (int(nums[0]) + int(nums[1])) // 2

    if len(nums) == 1:
        return int(nums[0])

    return 25


def _build_vendor_coverage_index() -> Dict[str, List[str]]:
    """Return {control_id: [vendor_id, ...]} from the provider catalog."""
    index: Dict[str, List[str]] = {}
    for provider in PROVIDERS:
        if provider.id not in VENDOR_CATALOG_BY_ID:
            continue  # no pricing data for this provider; skip
        for ctrl_id in provider.controls:
            index.setdefault(ctrl_id, []).append(provider.id)
    return index


_VENDOR_COVERAGE_INDEX: Dict[str, List[str]] = _build_vendor_coverage_index()


def analyze_gaps(
    all_controls: List[ControlResult],
    score: int,
    business_profile: Optional[Dict] = None,
) -> GapSummary:
    """
    Build a GapSummary from the scoring engine's all_controls list.

    Args:
        all_controls: from ScoreResult.all_controls
        score: current total_score (0–100)
        business_profile: org profile dict (industry, regulatory_exposure, employee_count)
    """
    profile = business_profile or {}
    regulatory_exposure: List[str] = profile.get("regulatory_exposure") or []

    failing: List[FailingControl] = []
    unknown: List[FailingControl] = []
    in_progress: List[FailingControl] = []
    total_applicable = 0

    for ctrl in all_controls:
        if not ctrl.applicable:
            continue
        total_applicable += 1

        if ctrl.status not in (ControlStatus.FAIL, ControlStatus.UNKNOWN, ControlStatus.IN_PROGRESS):
            continue

        breach_cost = BREACH_COST_BY_SEVERITY.get(ctrl.severity, 10_000)
        # Amplify if org is exposed to high-impact frameworks
        exposure_multiplier = 1.0
        for fw in regulatory_exposure:
            fw_upper = fw.upper()
            if any(hif in fw_upper for hif in HIGH_IMPACT_FRAMEWORKS):
                exposure_multiplier = 2.5
                break

        fc = FailingControl(
            control_id=ctrl.control_id,
            name=ctrl.name,
            short_name=ctrl.short_name,
            category=ctrl.category,
            severity=ctrl.severity,
            status=ctrl.status.value,
            estimated_annual_breach_cost=breach_cost * exposure_multiplier,
            vendor_ids_that_cover=_VENDOR_COVERAGE_INDEX.get(ctrl.control_id, []),
        )

        if ctrl.status == ControlStatus.FAIL:
            failing.append(fc)
        elif ctrl.status == ControlStatus.UNKNOWN:
            unknown.append(fc)
        else:
            in_progress.append(fc)

    all_gaps: List[FailingControl] = failing + unknown + in_progress

    # Sort by severity then status (fail first)
    _sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    _st_order = {"fail": 0, "unknown": 1, "in_progress": 2}
    all_gaps.sort(
        key=lambda c: (_sev_order.get(c.severity, 4), _st_order.get(c.status, 3))
    )

    # Group by category
    gaps_by_category: Dict[str, List[FailingControl]] = {}
    for fc in all_gaps:
        gaps_by_category.setdefault(fc.category, []).append(fc)

    # Find controls no vendor currently covers
    uncoverable = [fc for fc in all_gaps if not fc.vendor_ids_that_cover]

    total_breach_cost = sum(fc.estimated_annual_breach_cost for fc in all_gaps)

    return GapSummary(
        total_failing=len(failing),
        total_unknown=len(unknown),
        total_in_progress=len(in_progress),
        total_applicable=total_applicable,
        score=score,
        failing_controls=all_gaps,
        total_estimated_annual_breach_cost=total_breach_cost,
        gaps_by_category=gaps_by_category,
        regulatory_exposure=regulatory_exposure,
        uncoverable_controls=uncoverable,
    )
