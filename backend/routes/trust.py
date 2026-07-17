"""
Tenant Trust & Value API — computes an evidence-backed Trust Score and
generates shareable tenant-facing proof-of-compliance data.

Four pillars → one Trust Score (0-100):
  • Security Coverage   25%  – controls implemented, events resolved
  • Compliance          30%  – framework scores, certs, audit readiness
  • AI & ML Protection  25%  – NIST AI RMF + MITRE ATLAS coverage, playbooks
  • Data Protection     20%  – PII/PHI controls, evidence freshness
"""

import asyncio
import json
import logging
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from database import get_db, DB_PATH
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── IAM MCP helper ──────────────────────────────────────────────────────────
# Routes trust score calls through the MCP server's tool functions directly
# (same process, no HTTP round-trip) — one code path for all consumers.

async def _iam_call(user_id: int, tool_fn, **kwargs) -> Any:
    """
    Set the MCP user contextvar, invoke an iam_* tool function in-process,
    then reset.  Returns None if the tenant has no IAM credential.
    """
    try:
        from integrations.servers.iam_server import _request_user_id
    except ImportError:
        return None
    ctx_token = _request_user_id.set(user_id)
    try:
        return await tool_fn(**kwargs)
    except ValueError as exc:
        logger.debug("IAM call skipped for user %s: %s", user_id, exc)
        return None
    except Exception as exc:
        logger.warning("IAM call failed for user %s: %s", user_id, exc)
        return None
    finally:
        _request_user_id.reset(ctx_token)

# ─── Share token table bootstrap ────────────────────────────────────────────
# Created lazily on first use so it doesn't require a schema migration.

def _ensure_share_table() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS trust_share_tokens (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            token      TEXT    NOT NULL UNIQUE,
            label      TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            is_active  BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.commit()
    conn.close()


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


async def _ai_protection_score_async(conn, user_id: int) -> Dict[str, Any]:
    """AI & ML Protection pillar (25% weight) — uses real IAM data via MCP when available."""
    from integrations.servers.iam_server import iam_get_user_count, iam_mfa_adoption

    # ── Pull live IAM data through MCP tools ─────────────────────────────────
    user_counts, mfa_data = await asyncio.gather(
        _iam_call(user_id, iam_get_user_count),
        _iam_call(user_id, iam_mfa_adoption),
        return_exceptions=False,
    )

    # ── AI RMF controls (prefix AIRMF-) ─────────────────────────────────────
    ai_rows = conn.execute(
        "SELECT status FROM controls WHERE user_id = ? AND id LIKE 'AIRMF-%'",
        (user_id,),
    ).fetchall()
    ai_total = len(ai_rows)
    ai_impl = sum(1 for r in ai_rows if r["status"] in ("Implemented", "Compliant", "Vendor Managed"))
    ai_pct = _pct(ai_impl, ai_total, default=0.0)

    # ── ATLAS controls (prefix ATLAS-) ──────────────────────────────────────
    atlas_rows = conn.execute(
        "SELECT status FROM controls WHERE user_id = ? AND id LIKE 'ATLAS-%'",
        (user_id,),
    ).fetchall()
    atlas_total = len(atlas_rows)
    atlas_impl = sum(1 for r in atlas_rows if r["status"] in ("Implemented", "Compliant", "Vendor Managed"))
    atlas_pct = _pct(atlas_impl, atlas_total, default=0.0)

    # ── Playbooks / patterns ─────────────────────────────────────────────────
    playbook_rows = conn.execute(
        "SELECT COUNT(*) as n FROM security_event_patterns WHERE user_id = ? AND status = 'active'",
        (user_id,),
    ).fetchone()
    active_playbooks = playbook_rows["n"] if playbook_rows else 0
    pattern_rows = conn.execute(
        "SELECT COUNT(*) as n FROM security_event_patterns WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    learned_patterns = pattern_rows["n"] if pattern_rows else 0

    # ── Real MFA adoption bonus (from Okta via MCP) ──────────────────────────
    mfa_adoption_pct = 0.0
    mfa_enrolled = 0
    total_active_users = 0
    if mfa_data and isinstance(mfa_data, dict):
        mfa_adoption_pct = float(mfa_data.get("mfa_adoption_pct", 0))
        mfa_enrolled     = int(mfa_data.get("mfa_enrolled", 0))
        total_active_users = int(mfa_data.get("total_active_users", 0))

    active_user_count = 0
    if user_counts and isinstance(user_counts, dict):
        active_user_count = int(user_counts.get("active", 0) or 0)

    # ── Score computation ─────────────────────────────────────────────────────
    base = ai_pct * 0.45 + atlas_pct * 0.35
    automation_bonus = min(active_playbooks * 3 + learned_patterns * 2, 20)

    # Real MFA data lifts the score — MFA adoption pct contributes up to 20 pts
    mfa_bonus = mfa_adoption_pct * 0.20 if mfa_data else 0

    if ai_total == 0 and atlas_total == 0:
        ctrl = conn.execute(
            "SELECT COUNT(*) as n FROM controls WHERE user_id = ? "
            "AND (category LIKE '%AI%' OR category LIKE '%Identit%' OR category LIKE '%Access%')",
            (user_id,),
        ).fetchone()["n"]
        base = min(ctrl * 1.5, 50)

    score = _clamp(base + automation_bonus + mfa_bonus)

    return {
        "score": round(score, 1),
        "label": "AI & ML Protection",
        "iam_data_source": "live_okta" if mfa_data else "controls_only",
        "metrics": {
            "ai_rmf_controls_total":        ai_total,
            "ai_rmf_controls_implemented":  ai_impl,
            "ai_rmf_coverage_pct":          round(ai_pct, 1),
            "atlas_tactics_covered":        atlas_impl,
            "atlas_tactics_total":          atlas_total,
            "atlas_coverage_pct":           round(atlas_pct, 1),
            "active_playbooks":             active_playbooks,
            "learned_patterns":             learned_patterns,
            # Live IAM metrics (None when no Okta credential connected)
            "mfa_adoption_pct":             round(mfa_adoption_pct, 1) if mfa_data else None,
            "mfa_enrolled":                 mfa_enrolled if mfa_data else None,
            "total_active_users":           total_active_users if mfa_data else None,
            "active_user_count_okta":       active_user_count if user_counts else None,
        },
    }


def _ai_protection_score(conn, user_id: int) -> Dict[str, Any]:
    """Sync wrapper — runs the async implementation in the current event loop."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're inside an async context (FastAPI route) — schedule as task
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, _ai_protection_score_async(conn, user_id))
                return future.result(timeout=15)
        else:
            return loop.run_until_complete(_ai_protection_score_async(conn, user_id))
    except Exception as exc:
        logger.warning("Async AI protection score failed, falling back: %s", exc)
        # Synchronous fallback — no IAM data
        ai_rows   = conn.execute("SELECT status FROM controls WHERE user_id = ? AND id LIKE 'AIRMF-%'", (user_id,)).fetchall()
        atlas_rows = conn.execute("SELECT status FROM controls WHERE user_id = ? AND id LIKE 'ATLAS-%'", (user_id,)).fetchall()
        ai_impl   = sum(1 for r in ai_rows   if r["status"] in ("Implemented","Compliant","Vendor Managed"))
        atlas_impl = sum(1 for r in atlas_rows if r["status"] in ("Implemented","Compliant","Vendor Managed"))
        ai_pct    = _pct(ai_impl,   len(ai_rows))
        atlas_pct = _pct(atlas_impl, len(atlas_rows))
        score     = _clamp(ai_pct * 0.45 + atlas_pct * 0.35)
        return {
            "score": round(score, 1), "label": "AI & ML Protection",
            "iam_data_source": "controls_only",
            "metrics": {
                "ai_rmf_controls_total": len(ai_rows), "ai_rmf_controls_implemented": ai_impl,
                "ai_rmf_coverage_pct": round(ai_pct, 1), "atlas_tactics_covered": atlas_impl,
                "atlas_tactics_total": len(atlas_rows), "atlas_coverage_pct": round(atlas_pct, 1),
                "active_playbooks": 0, "learned_patterns": 0,
                "mfa_adoption_pct": None, "mfa_enrolled": None, "total_active_users": None,
                "active_user_count_okta": None,
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


# ─── Public share token endpoints ────────────────────────────────────────────

def _build_public_payload(user_id: int, conn) -> Dict[str, Any]:
    """
    Narrow public payload: composite score, tier, pillar scores, certs,
    and framework badge list ONLY.  No event counts, no control itemisation.
    """
    from routes.trust import (
        _security_score, _compliance_score,
        _ai_protection_score, _data_protection_score, _clamp
    )

    security   = _security_score(conn, user_id)
    compliance = _compliance_score(conn, user_id)
    ai_protect = _ai_protection_score(conn, user_id)
    data_prot  = _data_protection_score(conn, user_id)

    composite = round(_clamp(
        security["score"] * 0.25 + compliance["score"] * 0.30
        + ai_protect["score"] * 0.25 + data_prot["score"] * 0.20
    ), 1)

    if composite >= 85:   tier = "Excellent"
    elif composite >= 70: tier = "Strong"
    elif composite >= 55: tier = "Developing"
    elif composite >= 40: tier = "Foundational"
    else:                 tier = "At Risk"

    user = conn.execute(
        "SELECT name, organization FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    org_name = (user["organization"] or user["name"] or "Organisation") if user else "Organisation"

    certs = conn.execute(
        "SELECT certification_name, expiration_date FROM certifications "
        "WHERE user_id = ? AND status = 'active' ORDER BY expiration_date",
        (user_id,),
    ).fetchall()

    fw_scores = dict(conn.execute(
        """SELECT framework, overall_score
           FROM compliance_score_history
           WHERE user_id = ?
             AND calculated_at = (
               SELECT MAX(calculated_at) FROM compliance_score_history
               WHERE user_id = ? AND framework = compliance_score_history.framework
             )""",
        (user_id, user_id),
    ).fetchall() or [])

    return {
        "organization": org_name,
        "trust_score": composite,
        "tier": tier,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pillars": {
            "security":   {"score": security["score"],   "label": "Security Coverage"},
            "compliance": {"score": compliance["score"],  "label": "Compliance Alignment"},
            "ai":         {"score": ai_protect["score"],  "label": "AI & ML Protection"},
            "data":       {"score": data_prot["score"],   "label": "Data Protection"},
        },
        "certifications": [dict(c) for c in certs],
        "frameworks_tracked": len(fw_scores),
        "framework_badges": list(fw_scores.keys()),
    }


@router.post("/api/trust/share")
def create_share_token(
    label: Optional[str] = None,
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Generate (or rotate) a public share token for the authenticated user.
    Returns the token and the public portal URL.
    """
    _ensure_share_table()
    token = secrets.token_urlsafe(24)
    conn = get_db()
    try:
        conn.execute("UPDATE trust_share_tokens SET is_active = 0 WHERE user_id = ?", (user_id,))
        conn.execute(
            "INSERT INTO trust_share_tokens (user_id, token, label) VALUES (?, ?, ?)",
            (user_id, token, label or "Public trust portal"),
        )
        conn.commit()
    finally:
        conn.close()
    return {"token": token, "share_path": f"/trust-portal?token={token}"}


@router.get("/api/trust/public/{token}")
def get_public_trust_score(token: str) -> Dict[str, Any]:
    """
    Unauthenticated public endpoint — returns the narrowed public payload
    for the tenant whose share token matches.
    Excludes ALL incident-level or internal metrics.
    """
    _ensure_share_table()
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT user_id FROM trust_share_tokens WHERE token = ? AND is_active = 1",
            (token,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Share link not found or has been revoked.")
        return _build_public_payload(row["user_id"], conn)
    finally:
        conn.close()


@router.get("/trust-portal", response_class=HTMLResponse)
def public_trust_portal_page(request: Request, token: str = "") -> HTMLResponse:
    """
    Server-rendered HTML page — no auth required.
    Designed to be bookmarked by prospects / auditors.
    """
    _ensure_share_table()

    if not token:
        return HTMLResponse(
            "<html><body style='font-family:system-ui;padding:40px;color:#111'>"
            "<h1>Trust Portal</h1><p>No share token provided. Ask your vendor for a share link.</p>"
            "</body></html>",
            status_code=400,
        )

    conn = get_db()
    try:
        row = conn.execute(
            "SELECT user_id FROM trust_share_tokens WHERE token = ? AND is_active = 1",
            (token,),
        ).fetchone()
        if not row:
            return HTMLResponse(
                "<html><body style='font-family:system-ui;padding:40px;color:#111'>"
                "<h1>Link not found</h1><p>This share link has expired or been revoked.</p>"
                "</body></html>",
                status_code=404,
            )
        data = _build_public_payload(row["user_id"], conn)
    finally:
        conn.close()

    score   = data["trust_score"]
    tier    = data["tier"]
    org     = data["organization"]
    pillars = data["pillars"]
    certs   = data["certifications"]
    badges  = data["framework_badges"]
    gen     = data["generated_at"][:10]

    TIER_COLOR = {
        "Excellent":    "#22c55e",
        "Strong":       "#3b82f6",
        "Developing":   "#eab308",
        "Foundational": "#f97316",
        "At Risk":      "#ef4444",
    }
    tc = TIER_COLOR.get(tier, "#6366f1")
    circ = 2 * 3.14159 * 54
    dash = (score / 100) * circ

    pillar_cards = "".join(
        f"""<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:#f8fafc">
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#64748b;margin-bottom:4px">{p['label']}</div>
              <div style="font-size:28px;font-weight:900;color:#1e293b">{p['score']}<span style="font-size:14px;color:#94a3b8">/100</span></div>
              <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:8px">
                <div style="height:100%;width:{p['score']}%;background:{tc};border-radius:3px"></div>
              </div>
            </div>"""
        for p in pillars.values()
    )

    cert_chips = "".join(
        f'<span style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:20px;padding:4px 12px;font-size:13px;font-weight:600">✓ {c["certification_name"]}</span>'
        for c in certs
    ) or '<span style="color:#94a3b8;font-size:13px">No active certifications on record yet</span>'

    badge_chips = "".join(
        f'<span style="background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600">{b}</span>'
        for b in badges
    ) or '<span style="color:#94a3b8;font-size:13px">No framework scores recorded yet</span>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Trust Portal — {org}</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#1e293b;min-height:100vh}}
    .wrap{{max-width:760px;margin:0 auto;padding:32px 16px 64px}}
    .card{{background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;border:1px solid #e2e8f0}}
    .hero{{background:linear-gradient(135deg,{tc}22,{tc}08);border-color:{tc}40}}
    .ring-wrap{{display:flex;align-items:center;gap:28px;flex-wrap:wrap}}
    .score-label{{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:{tc}}}
    .org-name{{font-size:24px;font-weight:800;color:#0f172a;margin:4px 0}}
    .tier-badge{{display:inline-block;background:{tc}22;border:1px solid {tc}55;color:{tc};border-radius:20px;padding:4px 14px;font-size:13px;font-weight:700;margin-top:6px}}
    .pillar-grid{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}
    .section-title{{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:12px}}
    .chips{{display:flex;flex-wrap:wrap;gap:8px}}
    .disclaimer{{font-size:11px;color:#94a3b8;text-align:center;margin-top:24px}}
    @media(max-width:480px){{.pillar-grid{{grid-template-columns:1fr}}.ring-wrap{{flex-direction:column;align-items:flex-start}}}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="card hero">
    <div class="ring-wrap">
      <svg width="120" height="120" style="flex-shrink:0">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" stroke-width="10"/>
        <circle cx="60" cy="60" r="54" fill="none" stroke="{tc}" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="{dash:.1f} {circ-dash:.1f}"
          transform="rotate(-90 60 60)"/>
        <text x="60" y="56" text-anchor="middle" font-size="28" font-weight="900" fill="{tc}">{score}</text>
        <text x="60" y="72" text-anchor="middle" font-size="12" fill="#94a3b8">/100</text>
      </svg>
      <div>
        <div class="score-label">Tenant Trust Score</div>
        <div class="org-name">{org}</div>
        <div class="tier-badge">{tier} Security Posture</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:8px">As of {gen} · Powered by Compliance Platform</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Four-Pillar Breakdown</div>
    <div class="pillar-grid">{pillar_cards}</div>
  </div>

  <div class="card">
    <div class="section-title">Active Certifications</div>
    <div class="chips">{cert_chips}</div>
  </div>

  <div class="card">
    <div class="section-title">Compliance Frameworks Tracked ({data['frameworks_tracked']})</div>
    <div class="chips">{badge_chips}</div>
  </div>

  <div class="disclaimer">
    This report was automatically generated from the vendor's live compliance programme.
    Trust Score is a composite indicator across Security, Compliance, AI Protection, and Data controls.
    It is not a substitute for formal audit or certification.<br><br>
    Report generated {gen} · Share link is read-only and contains no internal incident data.
  </div>
</div>
</body>
</html>"""

    return HTMLResponse(content=html)
