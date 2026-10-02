"""
SecurityOS Scoring Engine.
Calculates the Security Readiness Score (0-100) from control statuses.
"""
from typing import Dict, Optional
from .controls_catalog import (
    CONTROLS, CONTROLS_BY_CATEGORY, CATEGORY_META,
    Category, ControlStatus, Severity,
)


def calculate_score(control_statuses: Dict[str, Dict]) -> Dict:
    """
    Calculate the Security Readiness Score.

    Args:
        control_statuses: {control_id: {"status": str, "notes": str, "last_checked": str}}

    Returns:
        Full scoring result with category breakdown, issues list, and summary.
    """
    category_results = {}

    for category, cat_meta in CATEGORY_META.items():
        cat_controls = CONTROLS_BY_CATEGORY.get(category, [])
        earned = 0
        possible = 0
        control_results = []

        for control in cat_controls:
            entry = control_statuses.get(control["id"], {})
            status = entry.get("status", ControlStatus.UNKNOWN)
            weight = control["weight"]
            possible += weight

            points = 0
            if status == ControlStatus.PASS:
                points = weight
            elif status == ControlStatus.IN_PROGRESS:
                points = round(weight * 0.5)
            earned += points

            control_results.append({
                **control,
                "status": status,
                "points": points,
                "max_points": weight,
                "last_checked": entry.get("last_checked"),
                "notes": entry.get("notes"),
            })

        raw_score = (earned / possible * cat_meta["max_score"]) if possible > 0 else 0
        category_score = round(raw_score)
        category_results[category.value] = {
            **cat_meta,
            "id": category.value,
            "score": category_score,
            "earned": earned,
            "possible": possible,
            "controls": control_results,
        }

    total_score = sum(v["score"] for v in category_results.values())

    all_controls = [c for cat in category_results.values() for c in cat["controls"]]
    failing = [c for c in all_controls if c["status"] == ControlStatus.FAIL]
    unknown = [c for c in all_controls if c["status"] == ControlStatus.UNKNOWN]
    passing = [c for c in all_controls if c["status"] == ControlStatus.PASS]
    critical_issues = [c for c in failing if c["severity"] == Severity.CRITICAL]

    severity_order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.LOW: 3}
    top_issues = sorted(failing + unknown, key=lambda c: severity_order.get(c["severity"], 4))[:5]

    return {
        "total_score": total_score,
        "max_score": 100,
        "grade": _score_to_grade(total_score),
        "color": _score_to_color(total_score),
        "categories": category_results,
        "summary": {
            "total": len(all_controls),
            "passing": len(passing),
            "failing": len(failing),
            "unknown": len(unknown),
            "critical_issues": len(critical_issues),
        },
        "top_issues": top_issues,
    }


def _score_to_grade(score: int) -> str:
    if score >= 90: return "Excellent"
    if score >= 75: return "Good"
    if score >= 60: return "Fair"
    if score >= 40: return "Poor"
    return "At Risk"


def _score_to_color(score: int) -> str:
    if score >= 90: return "green"
    if score >= 75: return "blue"
    if score >= 60: return "yellow"
    if score >= 40: return "orange"
    return "red"
