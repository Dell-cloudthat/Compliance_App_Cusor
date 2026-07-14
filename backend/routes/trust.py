"""
Tenant Trust & Value API — computes an evidence-backed Trust Score and
generates shareable tenant-facing proof-of-compliance data.

Four pillars → one Trust Score (0-100):
  • Security Coverage   25%  – controls implemented, events resolved
  • Compliance          30%  – framework scores, certs, audit readiness
  • AI & ML Protection  25%  – NIST AI RMF + MITRE ATLAS coverage, playbooks
  • Data Protection     20%  – PII/PHI controls, evidence freshness
"""

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from services.auth_service import get_current_user
from services.iam_service import check_permission

router = APIRouter()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _clamp(value: float, lo=0.0, hi=100.0) -> float:
    return max(lo, min(hi, value))


def _pct(num: int, denom: int, default=0.0) -> float:
    return (num / denom * 100) if denom else default


# ─── Pillar calculators ───────────────────────────────────────────────────────

def _security_score(conn, user_id: int) -> Dict[str, Any]:
    """Security Coverage pillar (25% weight)."""
    # Controls
    rows = conn.execute(
        "SELECT status FROM controls WHERE user_id = ?", (user_id,)
    ).fetchall()
    total = len(rows)
    implemented = sum(1 for r in rows if r["status"] in ("Implemented", "Compliant", "Vendor Managed"))
    partial = sum(1 for r in rows if r["status"] in ("Partial", "Partially Implemented"))
    control_pct = _pct(implemented + partial * 0.5, total)

    # Security events resolved in last 90 days
    cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    events = conn.execute(
        "SELECT status FROM security_events WHERE user_id = ? AND detected_at >= ?",
        (user_id, cutoff),
    ).fetchall()
    total_events = len(events)
    resolved_events = sum(1 for e in events if e["status"] in ("resolved", "false_positive"))
    resolution_pct = _pct(resolved_events, total_events, default=100.0)

    # Active compliance alerts (unacknowledged = weakness)
    open_alerts = conn.execute(
        "SELECT COUNT(*) as n FROM compliance_alerts WHERE user_id = ? AND acknowledged = 0",
        (user_id,),
    ).fetchone()["n"]
    alert_penalty = min(open_alerts * 2, 20)

    raw = (control_pct * 0.6 + resolution_pct * 0.4) - alert_penalty
    score = _clamp(raw)

    return {
        "score": round(score, 1),
        "label": "Security Coverage",
        "metrics": {
            "controls_total": total,
            "controls_implemented": implemented,
            "controls_partial": partial,
            "control_coverage_pct": round(control_pct, 1),
            "events_resolved": resolved_events,
            "events_total": total_events,
            "resolution_rate_pct": round(resolution_pct, 1),
            "open_alerts": open_alerts,
        },
    }


def _compliance_score(conn, user_id: int) -> Dict[str, Any]:
    """Compliance Alignment pillar (30% weight)."""
    # Per-framework scores from history
    fw_rows = conn.execute(
        """SELECT framework, overall_score
           FROM compliance_score_history
           WHERE user_id = ?
             AND calculated_at = (
               SELECT MAX(calculated_at) FROM compliance_score_history
               WHERE user_id = ? AND framework = compliance_score_history.framework
             )""",
        (user_id, user_id),
    ).fetchall()
    fw_scores = {r["framework"]: r["overall_score"] for r in fw_rows}
    avg_fw = sum(fw_scores.values()) / len(fw_scores) if fw_scores else 0.0

    # Active certifications
    active_certs = conn.execute(
        "SELECT COUNT(*) as n FROM certifications WHERE user_id = ? AND status = 'active'",
        (user_id,),
    ).fetchone()["n"]

    # Audit readiness (latest audit)
    audit_row = conn.execute(
        "SELECT readiness_score FROM audit_engagements WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    readiness = audit_row["readiness_score"] if audit_row else 0

    # If no framework scores yet, use control coverage as proxy
    if not fw_scores:
        ctrl_rows = conn.execute(
            "SELECT status FROM controls WHERE user_id = ?", (user_id,)
        ).fetchall()
        total = len(ctrl_rows)
        impl = sum(1 for r in ctrl_rows if r["status"] in ("Implemented", "Compliant", "Vendor Managed"))
        avg_fw = _pct(impl, total)

    score = _clamp(avg_fw * 0.6 + readiness * 0.25 + min(active_certs * 10, 15))

    return {
        "score": round(score, 1),
        "label": "Compliance Alignment",
        "metrics": {
            "frameworks_tracked": len(fw_scores),
            "framework_scores": fw_scores,
            "avg_framework_score": round(avg_fw, 1),
            "active_certifications": active_certs,
            "latest_audit_readiness": readiness,
        },
    }


def _ai_protection_score(conn, user_id: int) -> Dict[str, Any]:
    """AI & ML Protection pillar (25% weight)."""
    # AI RMF controls (prefix AIRMF-)
    ai_rows = conn.execute(
        "SELECT status FROM controls WHERE user_id = ? AND id LIKE 'AIRMF-%'",
        (user_id,),
    ).fetchall()
    ai_total = len(ai_rows)
    ai_impl = sum(1 for r in ai_rows if r["status"] in ("Implemented", "Compliant", "Vendor Managed"))
    ai_pct = _pct(ai_impl, ai_total, default=0.0)

    # ATLAS controls (prefix ATLAS-)
    atlas_rows = conn.execute(
        "SELECT status FROM controls WHERE user_id = ? AND id LIKE 'ATLAS-%'",
        (user_id,),
    ).fetchall()
    atlas_total = len(atlas_rows)
    atlas_impl = sum(1 for r in atlas_rows if r["status"] in ("Implemented", "Compliant", "Vendor Managed"))
    atlas_pct = _pct(atlas_impl, atlas_total, default=0.0)

    # Active detected security patterns (proxy for "learned patterns / playbooks")
    playbook_rows = conn.execute(
        "SELECT COUNT(*) as n FROM security_event_patterns WHERE user_id = ? AND status = 'active'",
        (user_id,),
    ).fetchone()
    active_playbooks = playbook_rows["n"] if playbook_rows else 0

    # All learned patterns (any status)
    pattern_rows = conn.execute(
        "SELECT COUNT(*) as n FROM security_event_patterns WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    learned_patterns = pattern_rows["n"] if pattern_rows else 0

    # Score: weighted blend + bonus for automation
    base = ai_pct * 0.45 + atlas_pct * 0.35
    automation_bonus = min(active_playbooks * 3 + learned_patterns * 2, 20)

    # If no AI controls loaded, give partial credit for general security posture
    if ai_total == 0 and atlas_total == 0:
        ctrl = conn.execute(
            "SELECT COUNT(*) as n FROM controls WHERE user_id = ? AND (category LIKE '%AI%' OR category LIKE '%Identit%' OR category LIKE '%Access%')",
            (user_id,),
        ).fetchone()["n"]
        base = min(ctrl * 1.5, 50)

    score = _clamp(base + automation_bonus)

    return {
        "score": round(score, 1),
        "label": "AI & ML Protection",
        "metrics": {
            "ai_rmf_controls_total": ai_total,
            "ai_rmf_controls_implemented": ai_impl,
            "ai_rmf_coverage_pct": round(ai_pct, 1),
            "atlas_tactics_covered": atlas_impl,
            "atlas_tactics_total": atlas_total,
            "atlas_coverage_pct": round(atlas_pct, 1),
            "active_playbooks": active_playbooks,
            "learned_patterns": learned_patterns,
        },
    }


def _data_protection_score(conn, user_id: int) -> Dict[str, Any]:
    """Data Protection pillar (20% weight)."""
    # PII / PHI / Access control family controls
    dp_rows = conn.execute(
        """SELECT status FROM controls WHERE user_id = ?
           AND (category IN ('Data Management', 'Privacy', 'Access Control', 'Identity Management')
                OR id LIKE 'AC-%' OR id LIKE 'HIPAA-%' OR id LIKE 'AIRMF-GOVERN%')""",
        (user_id,),
    ).fetchall()
    dp_total = len(dp_rows)
    dp_impl = sum(1 for r in dp_rows if r["status"] in ("Implemented", "Compliant", "Vendor Managed"))
    dp_pct = _pct(dp_impl, dp_total, default=50.0)

    # Evidence freshness
    old_cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    evidence_rows = conn.execute(
        "SELECT validated, expiration_date FROM audit_evidence WHERE audit_engagement_id IN "
        "(SELECT id FROM audit_engagements WHERE user_id = ?)",
        (user_id,),
    ).fetchall()
    total_evidence = len(evidence_rows)
    valid_evidence = sum(1 for e in evidence_rows if e["validated"])
    evidence_pct = _pct(valid_evidence, total_evidence, default=50.0)

    score = _clamp(dp_pct * 0.65 + evidence_pct * 0.35)

    return {
        "score": round(score, 1),
        "label": "Data Protection",
        "metrics": {
            "data_controls_total": dp_total,
            "data_controls_implemented": dp_impl,
            "data_coverage_pct": round(dp_pct, 1),
            "evidence_items": total_evidence,
            "evidence_validated": valid_evidence,
            "evidence_validation_pct": round(evidence_pct, 1),
        },
    }


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.get("/api/trust/score")
def get_trust_score(user_id: int = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Calculate the full four-pillar Trust Score for a user / organisation.
    Returns pillar scores, evidence metrics, and the composite Trust Score.
    """
    conn = get_db()
    try:
        security   = _security_score(conn, user_id)
        compliance = _compliance_score(conn, user_id)
        ai_protect = _ai_protection_score(conn, user_id)
        data_prot  = _data_protection_score(conn, user_id)
    finally:
        conn.close()

    # Weighted composite
    weights = {"security": 0.25, "compliance": 0.30, "ai": 0.25, "data": 0.20}
    composite = (
        security["score"]   * weights["security"]
        + compliance["score"] * weights["compliance"]
        + ai_protect["score"] * weights["ai"]
        + data_prot["score"]  * weights["data"]
    )
    composite = round(_clamp(composite), 1)

    # Trust tier
    if composite >= 85:   tier, tier_color = "Excellent",  "green"
    elif composite >= 70: tier, tier_color = "Strong",     "blue"
    elif composite >= 55: tier, tier_color = "Developing", "yellow"
    elif composite >= 40: tier, tier_color = "Foundational","orange"
    else:                 tier, tier_color = "At Risk",    "red"

    return {
        "trust_score":  composite,
        "tier":         tier,
        "tier_color":   tier_color,
        "calculated_at": datetime.now(timezone.utc).isoformat(),
        "pillars": {
            "security":   security,
            "compliance": compliance,
            "ai":         ai_protect,
            "data":       data_prot,
        },
        "weights": weights,
    }


@router.get("/api/trust/report")
def get_trust_report(user_id: int = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Extended trust report including certifications, framework detail,
    recent audit history, and improvement trajectory.
    """
    conn = get_db()
    try:
        # User org info
        user = conn.execute(
            "SELECT name, email, organization, role FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        org = dict(user) if user else {}

        # Active certifications
        certs = conn.execute(
            "SELECT certification_name, status, issue_date, expiration_date, certification_body "
            "FROM certifications WHERE user_id = ? ORDER BY status, expiration_date",
            (user_id,),
        ).fetchall()

        # Recent audits
        audits = conn.execute(
            "SELECT audit_name, framework, status, readiness_score, start_date, end_date "
            "FROM audit_engagements WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
            (user_id,),
        ).fetchall()

        # Control summary by category
        ctrl_cats = conn.execute(
            """SELECT category,
                      COUNT(*) as total,
                      SUM(CASE WHEN status IN ('Implemented','Compliant','Vendor Managed') THEN 1 ELSE 0 END) as implemented
               FROM controls WHERE user_id = ?
               GROUP BY category ORDER BY total DESC LIMIT 10""",
            (user_id,),
        ).fetchall()

        # Framework score history (last 30 days, top 4 frameworks)
        fw_history = conn.execute(
            """SELECT framework, overall_score, calculated_at
               FROM compliance_score_history
               WHERE user_id = ?
                 AND calculated_at >= datetime('now', '-30 days')
               ORDER BY calculated_at ASC""",
            (user_id,),
        ).fetchall()

        # Evidence summary
        evidence_summary = conn.execute(
            """SELECT evidence_type, COUNT(*) as count, SUM(validated) as validated_count
               FROM audit_evidence
               WHERE audit_engagement_id IN (SELECT id FROM audit_engagements WHERE user_id = ?)
               GROUP BY evidence_type""",
            (user_id,),
        ).fetchall()

        # Security events last 90 days
        event_summary = conn.execute(
            """SELECT event_type, severity, COUNT(*) as count
               FROM security_events
               WHERE user_id = ? AND detected_at >= datetime('now', '-90 days')
               GROUP BY event_type, severity""",
            (user_id,),
        ).fetchall()

    finally:
        conn.close()

    return {
        "organization": org,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "certifications": [dict(c) for c in certs],
        "audits": [dict(a) for a in audits],
        "control_categories": [dict(c) for c in ctrl_cats],
        "framework_history": [dict(r) for r in fw_history],
        "evidence_summary": [dict(e) for e in evidence_summary],
        "event_summary": [dict(e) for e in event_summary],
    }
