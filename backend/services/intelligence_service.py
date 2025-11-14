import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _safe_json_loads(value: Optional[str]) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


def _parse_timestamp(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        # sqlite typically stores ISO strings; handle naive timestamps as UTC
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def _calculate_obligation_weight(control_row: sqlite3.Row) -> float:
    priority = (control_row["priority"] or "").lower()
    priority_map = {
        "critical": 1.0,
        "high": 0.8,
        "medium": 0.55,
        "low": 0.35,
    }
    base = priority_map.get(priority, 0.5)

    frameworks = _safe_json_loads(control_row["frameworks"]) or []
    frameworks = [fw.upper() for fw in frameworks if isinstance(fw, str)]

    high_impact_frameworks = ("SOC2", "ISO27001", "PCI", "FEDRAMP", "HIPAA")
    if any(any(token in fw for token in high_impact_frameworks) for fw in frameworks):
        base += 0.1

    # Shared responsibility or vendor coverage can lower control leverage slightly
    coverage = (control_row["covered_by"] or "").lower()
    if coverage in ("vendor", "inherit", "mdr"):
        base -= 0.1

    return max(0.0, min(base, 1.0))


def _calculate_threat_pressure(alert_rows: List[sqlite3.Row]) -> Tuple[float, List[Dict[str, Any]]]:
    severity_map = {
        "critical": 1.0,
        "high": 0.8,
        "medium": 0.55,
        "low": 0.3,
    }
    max_pressure = 0.1  # baseline
    summaries: List[Dict[str, Any]] = []

    now = datetime.now(timezone.utc)
    for alert in alert_rows:
        status = (alert["status"] or "").lower()
        if status == "resolved":
            continue

        severity = (alert["severity"] or "").lower()
        base = severity_map.get(severity, 0.4)

        created = _parse_timestamp(alert["created_at"])
        age_days = 0.0
        if created:
            age_days = max((now - created).total_seconds() / 86400.0, 0.0)

        age_factor = min(age_days / 30.0, 0.5)
        pressure = max(base * (1.0 + age_factor), base)
        max_pressure = max(max_pressure, pressure)

        summaries.append(
            {
                "alert_id": alert["id"],
                "title": alert["title"],
                "severity": alert["severity"],
                "status": alert["status"],
                "age_days": round(age_days, 1),
                "pressure": round(pressure, 2),
            }
        )

    return max(0.0, min(max_pressure, 1.0)), summaries


def _calculate_evidence_freshness(evidence_rows: List[sqlite3.Row], fallback_date: Optional[datetime]) -> Tuple[float, Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    freshest = None

    for evidence in evidence_rows:
        timestamp = _parse_timestamp(evidence["uploaded_at"]) or _parse_timestamp(evidence["validated_at"])
        if timestamp and (freshest is None or timestamp > freshest):
            freshest = timestamp

    if freshest is None:
        freshest = fallback_date

    if freshest is None:
        return 0.8, {"last_evidence_at": None, "age_days": None}

    age_days = max((now - freshest).total_seconds() / 86400.0, 0.0)
    if age_days <= 7:
        freshness = 0.2  # low risk
    elif age_days >= 90:
        freshness = 1.0  # very stale
    else:
        freshness = 0.2 + ((age_days - 7) / (90 - 7)) * (1.0 - 0.2)

    return min(max(freshness, 0.0), 1.0), {
        "last_evidence_at": freshest.isoformat(),
        "age_days": round(age_days, 1),
        "evidence_count": len(evidence_rows),
    }


def _calculate_automation_readiness(control_row: sqlite3.Row, automation_count: int) -> float:
    readiness = 0.4
    if control_row["auto_mapped"]:
        readiness += 0.25
    if automation_count > 0:
        readiness += 0.2
    mapped_fields = _safe_json_loads(control_row["mapped_fields"]) or []
    if mapped_fields:
        readiness += 0.1
    return max(0.0, min(readiness, 1.0))


def _calculate_business_radius(responsibility_row: Optional[sqlite3.Row], frameworks: List[str]) -> Tuple[float, Dict[str, Any]]:
    if responsibility_row is None:
        shared = False
        owners = []
        coverage = ""
        data_sources = []
    else:
        shared = bool(responsibility_row["shared_responsibility"])
        owners = _safe_json_loads(responsibility_row["secondary_owners"]) or []
        coverage = responsibility_row["coverage_type"] or ""
        data_sources = _safe_json_loads(responsibility_row["data_sources"]) or []

    coverage_weight = 0.4
    if shared:
        coverage_weight += 0.1
    if coverage and coverage.lower().startswith("mdr"):
        coverage_weight += 0.1
    if len(frameworks) > 3:
        coverage_weight += 0.1
    if len(data_sources) > 2:
        coverage_weight += 0.1

    metadata = {
        "shared": shared,
        "secondary_owners": owners,
        "coverage_type": coverage,
        "data_source_count": len(data_sources),
    }

    return max(0.0, min(coverage_weight, 1.0)), metadata


def _fetch_control_context(user_id: int, control_id: str) -> Optional[Dict[str, Any]]:
    conn = _get_db()
    try:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM controls WHERE id = ? AND user_id = ?",
            (control_id, user_id),
        )
        control = cursor.fetchone()
        if not control:
            return None

        cursor.execute(
            "SELECT * FROM compliance_alerts WHERE control_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 25",
            (control_id, user_id),
        )
        alerts = cursor.fetchall()

        cursor.execute(
            "SELECT * FROM audit_evidence WHERE control_id = ? ORDER BY uploaded_at DESC LIMIT 25",
            (control_id,),
        )
        evidence = cursor.fetchall()

        cursor.execute(
            "SELECT * FROM responsibility_matrix WHERE control_id = ? AND user_id = ?",
            (control_id, user_id),
        )
        responsibility = cursor.fetchone()

        cursor.execute(
            """
            SELECT *
            FROM audit_findings
            WHERE control_id = ?
            ORDER BY created_at DESC
            LIMIT 10
            """,
            (control_id,),
        )
        findings = cursor.fetchall()

        return {
            "control": control,
            "alerts": alerts,
            "evidence": evidence,
            "responsibility": responsibility,
            "findings": findings,
        }
    finally:
        conn.close()


def calculate_control_priority(user_id: int, control_id: str) -> Optional[Dict[str, Any]]:
    context = _fetch_control_context(user_id, control_id)
    if not context:
        return None

    control_row = context["control"]
    frameworks = _safe_json_loads(control_row["frameworks"]) or []

    obligation_weight = _calculate_obligation_weight(control_row)
    threat_pressure, alert_summaries = _calculate_threat_pressure(context["alerts"])

    last_updated = _parse_timestamp(control_row["last_updated"])
    evidence_freshness, evidence_meta = _calculate_evidence_freshness(context["evidence"], last_updated)

    automation_readiness = _calculate_automation_readiness(control_row, len(context["findings"]))

    business_radius, business_meta = _calculate_business_radius(context["responsibility"], frameworks)

    weights = {
        "obligation": 0.30,
        "threat": 0.30,
        "evidence": 0.15,
        "automation": 0.15,
        "business": 0.10,
    }

    score = (
        obligation_weight * weights["obligation"]
        + threat_pressure * weights["threat"]
        + evidence_freshness * weights["evidence"]
        + automation_readiness * weights["automation"]
        + business_radius * weights["business"]
    )

    return {
        "control_id": control_row["id"],
        "control_name": control_row["control_name"],
        "score": round(score * 100, 1),
        "components": {
            "obligation_weight": round(obligation_weight, 3),
            "threat_pressure": round(threat_pressure, 3),
            "evidence_freshness": round(evidence_freshness, 3),
            "automation_readiness": round(automation_readiness, 3),
            "business_radius": round(business_radius, 3),
        },
        "weights": weights,
        "alerts": alert_summaries,
        "evidence": evidence_meta,
        "business": business_meta,
        "frameworks": frameworks,
        "priority": control_row["priority"],
        "status": control_row["status"],
        "responsible_party": control_row["responsible_party"],
    }


def calculate_priorities_for_user(user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    conn = _get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id
            FROM controls
            WHERE user_id = ?
            ORDER BY
                CASE LOWER(priority)
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                last_updated DESC
            LIMIT ?
            """,
            (user_id, limit),
        )
        control_ids = [row["id"] for row in cursor.fetchall()]
    finally:
        conn.close()

    results = []
    for control_id in control_ids:
        priority = calculate_control_priority(user_id, control_id)
        if priority:
            results.append(priority)

    results.sort(key=lambda item: item["score"], reverse=True)
    return results


def generate_guidance_for_control(user_id: int, control_id: str) -> Optional[Dict[str, Any]]:
    context = _fetch_control_context(user_id, control_id)
    if not context:
        return None

    priority_snapshot = calculate_control_priority(user_id, control_id)
    control_row = context["control"]
    responsibility_row = context["responsibility"]

    frameworks = priority_snapshot["frameworks"] if priority_snapshot else _safe_json_loads(control_row["frameworks"]) or []

    recommended_actions: List[Dict[str, Any]] = []
    evidence_recommendations: List[Dict[str, Any]] = []
    automation_opportunities: List[Dict[str, Any]] = []
    suggested_owners: List[str] = []

    status = (control_row["status"] or "").lower()
    if status in {"non-compliant", "partial"}:
        recommended_actions.append(
            {
                "title": "Restore Control Compliance",
                "summary": "Control is not fully implemented. Drive remediation to close the gap.",
                "impact": "Compliance status prevents audit readiness and opens contractual exposure.",
                "suggested_steps": [
                    "Review current implementation state against framework requirements.",
                    "Assign remediation owner and due date.",
                    "Capture remediation evidence once changes are complete.",
                ],
            }
        )

    alerts = priority_snapshot["alerts"] if priority_snapshot else []
    if alerts:
        most_pressing = max(alerts, key=lambda a: a.get("pressure", 0))
        recommended_actions.append(
            {
                "title": f"Resolve {most_pressing.get('severity', '').title()} Alert",
                "summary": most_pressing.get("title") or "Outstanding alert requires remediation.",
                "impact": f"Alert has been open for {most_pressing.get('age_days', 0)} day(s); increases residual risk and audit findings.",
                "suggested_steps": [
                    "Review alert timeline to confirm root cause.",
                    "Execute remediation checklist and document updates.",
                    "Notify stakeholders once resolved and update alert status.",
                ],
            }
        )

    evidence_meta = priority_snapshot["evidence"] if priority_snapshot else {"age_days": None, "last_evidence_at": None}
    evidence_age = evidence_meta.get("age_days")
    if evidence_age is None or evidence_age > 30:
        evidence_recommendations.append(
            {
                "title": "Refresh Evidence",
                "summary": "Evidence is stale or missing; auditors require recent proof.",
                "details": {
                    "last_evidence_at": evidence_meta.get("last_evidence_at"),
                    "age_days": evidence_age,
                },
                "suggested_steps": [
                    "Trigger automated evidence capture or request updated artifacts.",
                    "Validate and tag new evidence with date, owner, and system.",
                ],
            }
        )

    mapped_fields = _safe_json_loads(control_row["mapped_fields"]) or []
    if mapped_fields:
        automation_opportunities.append(
            {
                "title": "Leverage Data Mapping",
                "summary": "Control supports API-mapped evidence; automate collection to reduce manual effort.",
                "mapped_fields": mapped_fields,
                "suggested_steps": [
                    "Verify API data sources supplying mapped fields.",
                    "Schedule recurring evidence sync leveraging automation playbooks.",
                ],
            }
        )

    findings = context["findings"]
    open_findings = [finding for finding in findings if (finding["status"] or "").lower() != "resolved"]
    if open_findings:
        finding = open_findings[0]
        recommended_actions.append(
            {
                "title": "Close Outstanding Audit Finding",
                "summary": finding["description"],
                "impact": f"Finding severity: {finding['severity']}. Due date: {finding.get('due_date') or 'Not set'}.",
                "suggested_steps": [
                    "Update remediation plan with owner and timeline.",
                    "Upload evidence demonstrating corrective action.",
                    "Mark finding resolved and monitor for recurrence.",
                ],
            }
        )

    owners = set()
    if responsibility_row:
        primary = responsibility_row["primary_owner"]
        if primary:
            owners.add(primary)
        secondary = _safe_json_loads(responsibility_row["secondary_owners"]) or []
        owners.update(secondary)
    else:
        if control_row["responsible_party"]:
            owners.add(control_row["responsible_party"])

    suggested_owners = sorted({owner for owner in owners if owner})

    summary_parts = []
    if priority_snapshot:
        summary_parts.append(f"Priority score: {priority_snapshot['score']}")
        summary_parts.append(
            f"Top driver: threat pressure {priority_snapshot['components']['threat_pressure'] * 100:.0f}%"
        )
    if status in {"non-compliant", "partial"}:
        summary_parts.append("Control status requires remediation.")
    if evidence_age is None or (evidence_age and evidence_age > 30):
        summary_parts.append("Evidence freshness is at risk.")

    summary = " ".join(summary_parts) or "Control operating nominally."

    return {
        "control_id": control_row["id"],
        "control_name": control_row["control_name"],
        "status": control_row["status"],
        "priority_snapshot": priority_snapshot,
        "summary": summary,
        "recommended_actions": recommended_actions,
        "evidence_recommendations": evidence_recommendations,
        "automation_opportunities": automation_opportunities,
        "suggested_owners": suggested_owners,
        "frameworks": frameworks,
    }

