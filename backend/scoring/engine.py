"""
SecurityOS Scoring Engine v2.

Score = Σ(risk_weight × evidence_confidence × applicability_factor)

Key improvements over v1:
- Evidence confidence distinguishes auto-verified (1.0) from manually confirmed (0.7)
  from unverified (0.0), preventing inflated scores from unverified claims.
- Business applicability — some controls only apply to certain industries or profiles.
- Transparent: the score reports both the score AND the verification coverage,
  so customers know "87/100 based on 72% verified controls" rather than
  a misleading 87 derived from mostly unknown data.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class ControlStatus(str, Enum):
    PASS = "pass"          # Control requirement is satisfied
    FAIL = "fail"          # Control requirement is NOT satisfied
    UNKNOWN = "unknown"    # Status cannot be determined — not verified
    IN_PROGRESS = "in_progress"  # Customer is actively working on remediation
    NOT_APPLICABLE = "not_applicable"  # Control does not apply to this business


class EvidenceSource(str, Enum):
    AUTOMATIC = "automatic"    # Verified via direct API integration — highest confidence
    MANUAL = "manual"          # Customer self-attested — moderate confidence
    INFERRED = "inferred"      # Inferred from indirect signals — lower confidence
    NONE = "none"              # No evidence gathered


EVIDENCE_CONFIDENCE: Dict[EvidenceSource, float] = {
    EvidenceSource.AUTOMATIC: 1.0,
    EvidenceSource.MANUAL: 0.70,
    EvidenceSource.INFERRED: 0.50,
    EvidenceSource.NONE: 0.0,
}

SEVERITY_RISK_WEIGHT: Dict[str, float] = {
    "critical": 1.0,
    "high": 0.75,
    "medium": 0.50,
    "low": 0.25,
}

CATALOG_PATH = Path(__file__).parent.parent.parent / "compliance" / "controls" / "catalog.json"


def load_catalog() -> List[Dict]:
    with open(CATALOG_PATH) as f:
        return json.load(f)


@dataclass
class ControlResult:
    control_id: str
    name: str
    short_name: str
    category: str
    severity: str
    status: ControlStatus
    evidence_source: EvidenceSource
    evidence_confidence: float
    raw_weight: float          # risk_weight from catalog
    applicable: bool
    earned_points: float       # actual points contributing to score
    max_points: float          # maximum possible points for this control
    notes: Optional[str] = None
    last_checked: Optional[str] = None
    customer_message: Optional[str] = None


@dataclass
class CategoryResult:
    id: str
    label: str
    score: int
    max_score: int
    controls: List[ControlResult] = field(default_factory=list)
    verified_count: int = 0
    passing_count: int = 0
    failing_count: int = 0
    unknown_count: int = 0


@dataclass
class ScoreResult:
    total_score: int
    max_score: int = 100
    grade: str = ""
    color: str = ""
    categories: Dict[str, CategoryResult] = field(default_factory=dict)
    verified_pct: float = 0.0   # % of applicable controls with real evidence
    confidence_note: str = ""   # Human-readable confidence qualifier
    summary: Dict[str, int] = field(default_factory=dict)
    top_issues: List[ControlResult] = field(default_factory=list)
    all_controls: List[ControlResult] = field(default_factory=list)


CATEGORY_META = {
    "identity":     {"label": "Identity",        "max_score": 20},
    "devices":      {"label": "Devices",         "max_score": 20},
    "data":         {"label": "Data",            "max_score": 20},
    "network":      {"label": "Cloud & Network", "max_score": 20},
    "organization": {"label": "Organization",    "max_score": 20},
}


def is_applicable(control: Dict, business_profile: Optional[Dict]) -> bool:
    """Return True if this control applies to the given business profile."""
    applicable_industries = control.get("applicable_industries", [])
    if not applicable_industries:
        return True  # empty list = applies to all

    if not business_profile:
        return True

    industry = (business_profile.get("industry") or "").lower()
    return any(ind.lower() in industry for ind in applicable_industries)


def calculate_control_points(
    control: Dict,
    status: ControlStatus,
    evidence_source: EvidenceSource,
    applicable: bool,
) -> tuple[float, float]:
    """Returns (earned_points, max_points)."""
    if not applicable:
        return 0.0, 0.0

    risk_weight = control.get("risk_weight", SEVERITY_RISK_WEIGHT.get(control.get("severity", "medium"), 0.5))
    max_pts = risk_weight * 4.0  # scale so all 25 controls sum to 100

    if status == ControlStatus.FAIL:
        return 0.0, max_pts
    if status == ControlStatus.UNKNOWN or status == ControlStatus.IN_PROGRESS:
        return 0.0, max_pts
    if status == ControlStatus.NOT_APPLICABLE:
        return 0.0, 0.0
    if status == ControlStatus.PASS:
        confidence = EVIDENCE_CONFIDENCE.get(evidence_source, 0.7)
        return max_pts * confidence, max_pts

    return 0.0, max_pts


def build_customer_message(control: Dict, status: ControlStatus, notes: Optional[str]) -> str:
    """Return the plain-language customer message for a control's status."""
    msgs = control.get("customer_message", {})
    if notes:
        return notes
    if status == ControlStatus.FAIL:
        return msgs.get("fail", f"{control['short_name']} needs attention")
    if status == ControlStatus.UNKNOWN:
        return msgs.get("unknown", f"{control['short_name']} status not verified")
    if status == ControlStatus.IN_PROGRESS:
        return f"{control['short_name']} fix in progress"
    return ""


def calculate_score(
    control_statuses: Dict[str, Dict],
    business_profile: Optional[Dict] = None,
    catalog: Optional[List[Dict]] = None,
) -> ScoreResult:
    """
    Calculate the Security Readiness Score.

    Args:
        control_statuses: {
            control_id: {
                "status": str,
                "evidence_source": str,   # "automatic" | "manual" | "inferred" | "none"
                "notes": str | None,
                "last_checked": str | None,
            }
        }
        business_profile: business profile dict for applicability filtering
        catalog: pre-loaded catalog (loaded from JSON if None)

    Returns:
        ScoreResult with full breakdown
    """
    if catalog is None:
        catalog = load_catalog()

    category_buckets: Dict[str, List[ControlResult]] = {cat: [] for cat in CATEGORY_META}
    all_results: List[ControlResult] = []

    total_earned = 0.0
    total_max = 0.0
    verified_applicable = 0
    total_applicable = 0

    for control in catalog:
        ctrl_id = control["id"]
        entry = control_statuses.get(ctrl_id, {})

        status_raw = entry.get("status", ControlStatus.UNKNOWN)
        try:
            status = ControlStatus(status_raw)
        except ValueError:
            status = ControlStatus.UNKNOWN

        src_raw = entry.get("evidence_source", EvidenceSource.NONE)
        try:
            evidence_source = EvidenceSource(src_raw)
        except ValueError:
            # Infer source: if status is set without an explicit source, treat as manual
            evidence_source = EvidenceSource.MANUAL if status != ControlStatus.UNKNOWN else EvidenceSource.NONE

        applicable = is_applicable(control, business_profile)
        earned, max_pts = calculate_control_points(control, status, evidence_source, applicable)

        if applicable:
            total_applicable += 1
            if evidence_source in (EvidenceSource.AUTOMATIC, EvidenceSource.MANUAL):
                verified_applicable += 1

        total_earned += earned
        total_max += max_pts

        result = ControlResult(
            control_id=ctrl_id,
            name=control["name"],
            short_name=control["short_name"],
            category=control["category"],
            severity=control["severity"],
            status=status,
            evidence_source=evidence_source,
            evidence_confidence=EVIDENCE_CONFIDENCE.get(evidence_source, 0.0),
            raw_weight=control.get("risk_weight", 0.5),
            applicable=applicable,
            earned_points=earned,
            max_points=max_pts,
            notes=entry.get("notes"),
            last_checked=entry.get("last_checked"),
            customer_message=build_customer_message(control, status, entry.get("notes")),
        )
        all_results.append(result)
        if control["category"] in category_buckets:
            category_buckets[control["category"]].append(result)

    # Normalize to 100
    normalized_score = int(round((total_earned / total_max * 100) if total_max > 0 else 0))\

    # Build category scores
    categories: Dict[str, CategoryResult] = {}
    for cat_id, meta in CATEGORY_META.items():
        controls = category_buckets.get(cat_id, [])
        cat_earned = sum(c.earned_points for c in controls if c.applicable)
        cat_max = sum(c.max_points for c in controls if c.applicable)
        cat_score = int(round((cat_earned / cat_max * meta["max_score"]) if cat_max > 0 else 0))

        categories[cat_id] = CategoryResult(
            id=cat_id,
            label=meta["label"],
            score=cat_score,
            max_score=meta["max_score"],
            controls=controls,
            verified_count=sum(1 for c in controls if c.evidence_source != EvidenceSource.NONE and c.applicable),
            passing_count=sum(1 for c in controls if c.status == ControlStatus.PASS and c.applicable),
            failing_count=sum(1 for c in controls if c.status == ControlStatus.FAIL and c.applicable),
            unknown_count=sum(1 for c in controls if c.status == ControlStatus.UNKNOWN and c.applicable),
        )

    verified_pct = (verified_applicable / total_applicable * 100) if total_applicable > 0 else 0.0

    # Issues: FAIL first, then UNKNOWN; sorted by severity then risk_weight
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    issues = [c for c in all_results if c.status in (ControlStatus.FAIL, ControlStatus.UNKNOWN) and c.applicable]
    issues.sort(key=lambda c: (c.status != ControlStatus.FAIL, severity_order.get(c.severity, 4), -c.raw_weight))

    passing = [c for c in all_results if c.status == ControlStatus.PASS and c.applicable]

    summary = {
        "total": total_applicable,
        "passing": len(passing),
        "failing": sum(1 for c in all_results if c.status == ControlStatus.FAIL and c.applicable),
        "unknown": sum(1 for c in all_results if c.status == ControlStatus.UNKNOWN and c.applicable),
        "in_progress": sum(1 for c in all_results if c.status == ControlStatus.IN_PROGRESS and c.applicable),
        "not_applicable": sum(1 for c in all_results if not c.applicable),
    }

    if verified_pct >= 90:
        confidence_note = f"Score based on {int(verified_pct)}% verified controls"
    elif verified_pct >= 60:
        confidence_note = f"Score based on {int(verified_pct)}% verified — connect integrations to improve accuracy"
    else:
        confidence_note = f"Only {int(verified_pct)}% of controls verified — score may not reflect actual security"

    return ScoreResult(
        total_score=normalized_score,
        grade=score_to_grade(normalized_score),
        color=score_to_color(normalized_score),
        categories=categories,
        verified_pct=verified_pct,
        confidence_note=confidence_note,
        summary=summary,
        top_issues=issues[:5],
        all_controls=all_results,
    )


def score_to_grade(score: int) -> str:
    if score >= 90: return "Excellent"
    if score >= 75: return "Good"
    if score >= 60: return "Fair"
    if score >= 40: return "Poor"
    return "At Risk"


def score_to_color(score: int) -> str:
    if score >= 90: return "green"
    if score >= 75: return "blue"
    if score >= 60: return "yellow"
    if score >= 40: return "orange"
    return "red"
