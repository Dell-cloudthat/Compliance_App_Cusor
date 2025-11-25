"""
Automated Report Generation Service
Generates comprehensive audit reports, evidence packages, and executive summaries
"""
import sqlite3
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def generate_full_audit_report(audit_id: int, user_id: int) -> Dict[str, Any]:
    """
    Generate a comprehensive audit report including:
    - Executive summary
    - Audit scope and methodology
    - Control coverage analysis
    - Findings summary
    - Evidence inventory
    - Recommendations
    - Appendices
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get audit details
    cursor.execute("""
        SELECT * FROM audit_engagements WHERE id = ? AND user_id = ?
    """, (audit_id, user_id))
    audit = cursor.fetchone()
    
    if not audit:
        conn.close()
        return {"error": "Audit not found"}
    
    audit_dict = dict(audit)
    scope = json.loads(audit_dict.get('scope', '[]'))
    
    # Get findings
    cursor.execute("""
        SELECT * FROM audit_findings WHERE audit_engagement_id = ?
        ORDER BY severity DESC, created_at DESC
    """, (audit_id,))
    findings = [dict(f) for f in cursor.fetchall()]
    
    # Get evidence
    cursor.execute("""
        SELECT * FROM audit_evidence WHERE audit_engagement_id = ?
        ORDER BY control_id, uploaded_at DESC
    """, (audit_id,))
    evidence = [dict(e) for e in cursor.fetchall()]
    
    # Get readiness score
    cursor.execute("""
        SELECT readiness_score FROM audit_engagements WHERE id = ?
    """, (audit_id,))
    readiness_result = cursor.fetchone()
    readiness_score = readiness_result['readiness_score'] if readiness_result else 0
    
    # Calculate statistics
    total_controls = len(scope)
    controls_with_evidence = len(set(e['control_id'] for e in evidence))
    evidence_coverage = (controls_with_evidence / total_controls * 100) if total_controls > 0 else 0
    
    total_findings = len(findings)
    critical_findings = len([f for f in findings if f['severity'] == 'critical'])
    high_findings = len([f for f in findings if f['severity'] == 'high'])
    resolved_findings = len([f for f in findings if f['status'] in ['resolved', 'closed']])
    
    validated_evidence = len([e for e in evidence if e.get('validated')])
    evidence_validation_rate = (validated_evidence / len(evidence) * 100) if evidence else 0
    
    # Group findings by severity
    findings_by_severity = {
        'critical': [f for f in findings if f['severity'] == 'critical'],
        'high': [f for f in findings if f['severity'] == 'high'],
        'medium': [f for f in findings if f['severity'] == 'medium'],
        'low': [f for f in findings if f['severity'] == 'low']
    }
    
    # Group evidence by control
    evidence_by_control = {}
    for ev in evidence:
        control_id = ev['control_id']
        if control_id not in evidence_by_control:
            evidence_by_control[control_id] = []
        evidence_by_control[control_id].append(ev)
    
    # Get integration events mapped to controls in scope (via compliance alerts)
    integration_events_summary = _get_integration_events_summary(conn, user_id, scope, audit_dict.get('start_date'))
    
    # Get workflow executions related to this audit
    workflow_executions_summary = _get_workflow_executions_summary(conn, user_id, audit_id, audit_dict.get('start_date'))
    
    # Calculate evidence freshness metrics
    evidence_freshness = _calculate_evidence_freshness(evidence, audit_dict.get('start_date'))
    
    # Generate report sections
    report = {
        "report_type": "full_audit_report",
        "audit_id": audit_id,
        "generated_at": datetime.now().isoformat(),
        "audit_info": {
            "audit_name": audit_dict['audit_name'],
            "framework": audit_dict['framework'],
            "audit_type": audit_dict['audit_type'],
            "status": audit_dict['status'],
            "start_date": audit_dict['start_date'],
            "end_date": audit_dict.get('end_date'),
            "auditor_name": audit_dict.get('auditor_name'),
            "scope": scope
        },
        "executive_summary": {
            "readiness_score": readiness_score,
            "overall_assessment": _get_assessment_level(readiness_score),
            "key_metrics": {
                "total_controls": total_controls,
                "controls_with_evidence": controls_with_evidence,
                "evidence_coverage_percent": round(evidence_coverage, 1),
                "total_findings": total_findings,
                "critical_findings": critical_findings,
                "high_findings": high_findings,
                "resolved_findings": resolved_findings,
                "total_evidence": len(evidence),
                "validated_evidence": validated_evidence,
                "evidence_validation_rate": round(evidence_validation_rate, 1)
            },
            "summary": _generate_executive_summary(readiness_score, total_findings, critical_findings, evidence_coverage)
        },
        "control_coverage": {
            "total_controls": total_controls,
            "controls_with_evidence": controls_with_evidence,
            "controls_without_evidence": total_controls - controls_with_evidence,
            "coverage_percentage": round(evidence_coverage, 1),
            "controls_list": scope
        },
        "findings_summary": {
            "total": total_findings,
            "by_severity": {
                "critical": critical_findings,
                "high": high_findings,
                "medium": len(findings_by_severity['medium']),
                "low": len(findings_by_severity['low'])
            },
            "by_status": {
                "open": len([f for f in findings if f['status'] == 'open']),
                "in_progress": len([f for f in findings if f['status'] == 'in_progress']),
                "resolved": resolved_findings,
                "closed": len([f for f in findings if f['status'] == 'closed'])
            },
            "findings": findings
        },
        "evidence_inventory": {
            "total_evidence": len(evidence),
            "validated_evidence": validated_evidence,
            "pending_validation": len(evidence) - validated_evidence,
            "by_type": _group_evidence_by_type(evidence),
            "by_control": evidence_by_control,
            "evidence_list": evidence
        },
        "recommendations": _generate_recommendations(findings, evidence_coverage, readiness_score),
        "integration_events": integration_events_summary,
        "workflow_executions": workflow_executions_summary,
        "evidence_freshness": evidence_freshness,
        "appendices": {
            "findings_details": findings,
            "evidence_catalog": evidence,
            "control_mapping": _generate_control_mapping(scope, evidence_by_control),
            "integration_events_details": integration_events_summary.get('events', []),
            "workflow_executions_details": workflow_executions_summary.get('executions', [])
        }
    }
    
    conn.close()
    return report

def generate_evidence_package(audit_id: int, user_id: int, control_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Generate an evidence package for specific controls or all controls in audit
    Includes evidence metadata, validation status, and links
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT * FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    audit = cursor.fetchone()
    
    if not audit:
        conn.close()
        return {"error": "Audit not found"}
    
    audit_dict = dict(audit)
    
    # Get evidence
    if control_ids:
        placeholders = ','.join(['?'] * len(control_ids))
        cursor.execute(f"""
            SELECT * FROM audit_evidence 
            WHERE audit_engagement_id = ? AND control_id IN ({placeholders})
            ORDER BY control_id, uploaded_at DESC
        """, (audit_id, *control_ids))
    else:
        cursor.execute("""
            SELECT * FROM audit_evidence WHERE audit_engagement_id = ?
            ORDER BY control_id, uploaded_at DESC
        """, (audit_id,))
    
    evidence = [dict(e) for e in cursor.fetchall()]
    
    # Group by control
    evidence_by_control = {}
    for ev in evidence:
        control_id = ev['control_id']
        if control_id not in evidence_by_control:
            evidence_by_control[control_id] = []
        evidence_by_control[control_id].append(ev)
    
    # Calculate statistics
    validated_count = len([e for e in evidence if e.get('validated')])
    
    # Get evidence freshness
    evidence_freshness = _calculate_evidence_freshness(evidence, audit_dict.get('start_date'))
    
    # Get integration events for controls in package
    scope_controls = control_ids if control_ids else json.loads(audit_dict.get('scope', '[]'))
    integration_events_summary = _get_integration_events_summary(conn, user_id, scope_controls, audit_dict.get('start_date'))
    
    package = {
        "report_type": "evidence_package",
        "audit_id": audit_id,
        "generated_at": datetime.now().isoformat(),
        "audit_info": {
            "audit_name": audit_dict['audit_name'],
            "framework": audit_dict['framework'],
            "audit_type": audit_dict['audit_type']
        },
        "package_summary": {
            "total_evidence": len(evidence),
            "validated_evidence": validated_count,
            "pending_validation": len(evidence) - validated_count,
            "controls_covered": len(evidence_by_control),
            "evidence_types": list(set(e['evidence_type'] for e in evidence))
        },
        "evidence_by_control": evidence_by_control,
        "evidence_catalog": evidence,
        "validation_summary": {
            "validated": validated_count,
            "pending": len(evidence) - validated_count,
            "validation_rate": round((validated_count / len(evidence) * 100) if evidence else 0, 1)
        },
        "evidence_freshness": evidence_freshness,
        "integration_events": {
            "total_events": integration_events_summary.get('total_events', 0),
            "by_source": integration_events_summary.get('by_source', {}),
            "by_type": integration_events_summary.get('by_type', {})
        }
    }
    
    conn.close()
    return package

def generate_executive_summary(audit_id: int, user_id: int) -> Dict[str, Any]:
    """
    Generate a concise executive summary for leadership
    Focuses on high-level metrics, key findings, and recommendations
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get audit details
    cursor.execute("SELECT * FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    audit = cursor.fetchone()
    
    if not audit:
        conn.close()
        return {"error": "Audit not found"}
    
    audit_dict = dict(audit)
    scope = json.loads(audit_dict.get('scope', '[]'))
    
    # Get key metrics
    cursor.execute("""
        SELECT 
            COUNT(*) as total_findings,
            SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_findings,
            SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_findings,
            SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_findings
        FROM audit_findings
        WHERE audit_engagement_id = ?
    """, (audit_id,))
    findings_stats = dict(cursor.fetchone())
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total_evidence,
            SUM(CASE WHEN validated = 1 THEN 1 ELSE 0 END) as validated_evidence
        FROM audit_evidence
        WHERE audit_engagement_id = ?
    """, (audit_id,))
    evidence_stats = dict(cursor.fetchone())
    
    readiness_score = audit_dict.get('readiness_score', 0)
    total_controls = len(scope)
    controls_with_evidence = evidence_stats.get('total_evidence', 0)  # Simplified
    
    # Get top findings
    cursor.execute("""
        SELECT * FROM audit_findings 
        WHERE audit_engagement_id = ? AND severity IN ('critical', 'high')
        ORDER BY severity DESC, created_at DESC
        LIMIT 5
    """, (audit_id,))
    top_findings = [dict(f) for f in cursor.fetchall()]
    
    # Get integration events and workflow summaries
    scope = json.loads(audit_dict.get('scope', '[]'))
    integration_events_summary = _get_integration_events_summary(conn, user_id, scope, audit_dict.get('start_date'))
    workflow_executions_summary = _get_workflow_executions_summary(conn, user_id, audit_id, audit_dict.get('start_date'))
    
    # Get evidence freshness
    cursor.execute("""
        SELECT * FROM audit_evidence WHERE audit_engagement_id = ?
    """, (audit_id,))
    evidence = [dict(e) for e in cursor.fetchall()]
    evidence_freshness = _calculate_evidence_freshness(evidence, audit_dict.get('start_date'))
    
    summary = {
        "report_type": "executive_summary",
        "audit_id": audit_id,
        "generated_at": datetime.now().isoformat(),
        "audit_overview": {
            "audit_name": audit_dict['audit_name'],
            "framework": audit_dict['framework'],
            "audit_type": audit_dict['audit_type'],
            "status": audit_dict['status'],
            "start_date": audit_dict['start_date'],
            "end_date": audit_dict.get('end_date')
        },
        "key_metrics": {
            "readiness_score": readiness_score,
            "assessment_level": _get_assessment_level(readiness_score),
            "total_controls": total_controls,
            "controls_with_evidence": controls_with_evidence,
            "evidence_coverage": round((controls_with_evidence / total_controls * 100) if total_controls > 0 else 0, 1),
            "total_findings": findings_stats.get('total_findings', 0),
            "critical_findings": findings_stats.get('critical_findings', 0),
            "high_findings": findings_stats.get('high_findings', 0),
            "resolved_findings": findings_stats.get('resolved_findings', 0),
            "total_evidence": evidence_stats.get('total_evidence', 0),
            "validated_evidence": evidence_stats.get('validated_evidence', 0)
        },
        "top_findings": top_findings,
        "recommendations": _generate_executive_recommendations(
            readiness_score,
            findings_stats.get('critical_findings', 0),
            findings_stats.get('high_findings', 0)
        ),
        "next_steps": _generate_next_steps(audit_dict['status'], findings_stats),
        "automation_metrics": {
            "integration_events": integration_events_summary.get('total_events', 0),
            "workflow_executions": workflow_executions_summary.get('total_executions', 0),
            "evidence_collected_automated": workflow_executions_summary.get('total_evidence_collected', 0),
            "gaps_remediated_automated": workflow_executions_summary.get('total_gaps_remediated', 0)
        },
        "evidence_freshness": evidence_freshness
    }
    
    conn.close()
    return summary

def _get_assessment_level(score: int) -> str:
    """Convert readiness score to assessment level"""
    if score >= 90:
        return "Excellent"
    elif score >= 75:
        return "Good"
    elif score >= 60:
        return "Fair"
    elif score >= 40:
        return "Needs Improvement"
    else:
        return "Critical"

def _generate_executive_summary(readiness_score: int, total_findings: int, 
                                critical_findings: int, evidence_coverage: float) -> str:
    """Generate executive summary text"""
    assessment = _get_assessment_level(readiness_score)
    
    summary = f"The audit readiness assessment indicates an {assessment.lower()} level of preparedness "
    summary += f"with a readiness score of {readiness_score}%. "
    
    if evidence_coverage >= 80:
        summary += "Evidence coverage is comprehensive, with most controls having supporting documentation. "
    elif evidence_coverage >= 60:
        summary += "Evidence coverage is adequate, though some controls require additional documentation. "
    else:
        summary += "Evidence coverage needs improvement, with several controls lacking sufficient documentation. "
    
    if critical_findings > 0:
        summary += f"There are {critical_findings} critical finding(s) that require immediate attention. "
    elif total_findings > 0:
        summary += f"There are {total_findings} finding(s) that need to be addressed. "
    else:
        summary += "No significant findings have been identified at this time. "
    
    return summary

def _generate_recommendations(findings: List[Dict], evidence_coverage: float, 
                             readiness_score: int) -> List[str]:
    """Generate recommendations based on findings and metrics"""
    recommendations = []
    
    if readiness_score < 60:
        recommendations.append("Immediate action required: Readiness score is below acceptable threshold. Focus on evidence collection and control implementation.")
    
    critical_findings = [f for f in findings if f['severity'] == 'critical']
    if critical_findings:
        recommendations.append(f"Address {len(critical_findings)} critical finding(s) immediately to prevent audit failure.")
    
    high_findings = [f for f in findings if f['severity'] == 'high']
    if high_findings:
        recommendations.append(f"Prioritize remediation of {len(high_findings)} high-severity finding(s) within 30 days.")
    
    if evidence_coverage < 80:
        recommendations.append(f"Improve evidence coverage from {evidence_coverage:.1f}% to at least 80% by collecting additional documentation for controls.")
    
    open_findings = [f for f in findings if f['status'] == 'open']
    if open_findings:
        recommendations.append(f"Assign owners and due dates for {len(open_findings)} open finding(s) to ensure timely remediation.")
    
    if not recommendations:
        recommendations.append("Continue maintaining current compliance posture and monitoring for any changes.")
    
    return recommendations

def _generate_executive_recommendations(readiness_score: int, critical_findings: int, 
                                      high_findings: int) -> List[str]:
    """Generate high-level recommendations for executives"""
    recommendations = []
    
    if readiness_score < 75:
        recommendations.append("Allocate resources to improve audit readiness before the engagement begins.")
    
    if critical_findings > 0:
        recommendations.append("Immediate executive attention required for critical findings that could impact audit outcome.")
    
    if high_findings > 0:
        recommendations.append("Establish a remediation plan for high-severity findings with clear ownership and timelines.")
    
    if readiness_score >= 90 and critical_findings == 0:
        recommendations.append("Maintain current compliance posture and continue proactive monitoring.")
    
    return recommendations

def _generate_next_steps(status: str, findings_stats: Dict) -> List[str]:
    """Generate next steps based on audit status"""
    next_steps = []
    
    if status == 'planned':
        next_steps.append("Complete evidence collection for all controls in scope.")
        next_steps.append("Conduct internal readiness review and gap analysis.")
        next_steps.append("Schedule kickoff meeting with auditor.")
    
    elif status == 'in_progress':
        next_steps.append("Continue providing evidence to auditor as requested.")
        next_steps.append("Address any preliminary findings promptly.")
        next_steps.append("Maintain open communication with audit team.")
    
    elif status == 'completed':
        if findings_stats.get('total_findings', 0) > findings_stats.get('resolved_findings', 0):
            next_steps.append("Develop remediation plan for outstanding findings.")
            next_steps.append("Assign owners and due dates for each finding.")
        else:
            next_steps.append("Document lessons learned from this audit.")
            next_steps.append("Update compliance processes based on audit feedback.")
    
    return next_steps

def _group_evidence_by_type(evidence: List[Dict]) -> Dict[str, int]:
    """Group evidence by type"""
    by_type = {}
    for ev in evidence:
        ev_type = ev.get('evidence_type', 'unknown')
        by_type[ev_type] = by_type.get(ev_type, 0) + 1
    return by_type

def _generate_control_mapping(scope: List[str], evidence_by_control: Dict) -> Dict[str, Dict]:
    """Generate control to evidence mapping"""
    mapping = {}
    for control_id in scope:
        mapping[control_id] = {
            "has_evidence": control_id in evidence_by_control,
            "evidence_count": len(evidence_by_control.get(control_id, [])),
            "validated_evidence": len([e for e in evidence_by_control.get(control_id, []) if e.get('validated')])
        }
    return mapping


def _get_integration_events_summary(conn: sqlite3.Connection, user_id: int, control_ids: List[str], 
                                    start_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Get summary of integration events mapped to controls in audit scope.
    This ensures integration events flow to reports.
    """
    cursor = conn.cursor()
    
    # Get compliance alerts created from integration events for controls in scope
    if control_ids:
        placeholders = ','.join(['?'] * len(control_ids))
        query = f"""
            SELECT ca.*, 
                   json_extract(ca.metadata_json, '$.event_source') as event_source,
                   json_extract(ca.metadata_json, '$.event_type') as event_type,
                   json_extract(ca.metadata_json, '$.mapped_controls') as mapped_controls
            FROM compliance_alerts ca
            WHERE ca.user_id = ? 
              AND ca.alert_type = 'integration_event'
              AND ca.control_id IN ({placeholders})
        """
        params = [user_id] + control_ids
    else:
        query = """
            SELECT ca.*, 
                   json_extract(ca.metadata_json, '$.event_source') as event_source,
                   json_extract(ca.metadata_json, '$.event_type') as event_type,
                   json_extract(ca.metadata_json, '$.mapped_controls') as mapped_controls
            FROM compliance_alerts ca
            WHERE ca.user_id = ? AND ca.alert_type = 'integration_event'
        """
        params = [user_id]
    
    if start_date:
        query += " AND ca.created_at >= ?"
        params.append(start_date)
    
    query += " ORDER BY ca.created_at DESC LIMIT 100"
    
    cursor.execute(query, params)
    alerts = [dict(a) for a in cursor.fetchall()]
    
    # Group by event source and type
    by_source = {}
    by_type = {}
    by_framework = {}
    
    for alert in alerts:
        source = alert.get('event_source') or 'unknown'
        event_type = alert.get('event_type') or 'unknown'
        framework = alert.get('framework') or 'unknown'
        
        by_source[source] = by_source.get(source, 0) + 1
        by_type[event_type] = by_type.get(event_type, 0) + 1
        by_framework[framework] = by_framework.get(framework, 0) + 1
    
    return {
        "total_events": len(alerts),
        "by_source": by_source,
        "by_type": by_type,
        "by_framework": by_framework,
        "events": alerts[:50]  # Include top 50 events in summary
    }


def _get_workflow_executions_summary(conn: sqlite3.Connection, user_id: int, audit_id: int,
                                     start_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Get summary of workflow executions related to this audit.
    This ensures workflow executions flow to reports.
    """
    cursor = conn.cursor()
    
    # Get workflow executions that might be related to this audit
    # (evidence collection, gap remediation, audit prep workflows)
    query = """
        SELECT we.*, w.name as workflow_name, w.workflow_type
        FROM workflow_executions we
        JOIN workflows w ON we.workflow_id = w.id
        WHERE we.user_id = ? 
          AND w.workflow_type IN ('evidence_collection', 'gap_remediation', 'audit_preparation')
          AND we.status = 'completed'
    """
    params = [user_id]
    
    if start_date:
        query += " AND we.started_at >= ?"
        params.append(start_date)
    
    query += " ORDER BY we.completed_at DESC LIMIT 50"
    
    cursor.execute(query, params)
    executions = [dict(e) for e in cursor.fetchall()]
    
    # Group by workflow type
    by_type = {}
    total_evidence_collected = 0
    total_gaps_remediated = 0
    
    for exec in executions:
        wf_type = exec.get('workflow_type', 'unknown')
        by_type[wf_type] = by_type.get(wf_type, 0) + 1
        
        # Parse execution_data for metrics
        exec_data = json.loads(exec.get('execution_data', '{}'))
        if wf_type == 'evidence_collection':
            evidence_collected = exec_data.get('evidence_collected', [])
            if isinstance(evidence_collected, list):
                total_evidence_collected += len(evidence_collected)
        elif wf_type == 'gap_remediation':
            remediated = exec_data.get('remediated_controls', [])
            if isinstance(remediated, list):
                total_gaps_remediated += len(remediated)
    
    return {
        "total_executions": len(executions),
        "by_type": by_type,
        "total_evidence_collected": total_evidence_collected,
        "total_gaps_remediated": total_gaps_remediated,
        "executions": executions[:20]  # Include top 20 executions in summary
    }


def _calculate_evidence_freshness(evidence: List[Dict], audit_start_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculate evidence freshness metrics.
    This ensures timestamps flow to reports and audit readiness assessment.
    """
    if not evidence:
        return {
            "average_age_days": 0,
            "fresh_evidence_count": 0,
            "stale_evidence_count": 0,
            "by_age_category": {}
        }
    
    now = datetime.now()
    audit_start = datetime.fromisoformat(audit_start_date) if audit_start_date else now
    
    ages = []
    fresh_count = 0  # < 30 days old
    stale_count = 0  # > 90 days old
    
    by_category = {
        "fresh": 0,      # < 30 days
        "recent": 0,    # 30-90 days
        "stale": 0,     # 90-180 days
        "very_stale": 0  # > 180 days
    }
    
    for ev in evidence:
        # Use collected_at, uploaded_at, or created_at
        ev_date_str = ev.get('collected_at') or ev.get('uploaded_at') or ev.get('created_at')
        if not ev_date_str:
            continue
        
        try:
            ev_date = datetime.fromisoformat(ev_date_str.replace('Z', '+00:00').split('+')[0])
            age_days = (now - ev_date).days
            ages.append(age_days)
            
            if age_days < 30:
                fresh_count += 1
                by_category["fresh"] += 1
            elif age_days < 90:
                by_category["recent"] += 1
            elif age_days < 180:
                stale_count += 1
                by_category["stale"] += 1
            else:
                stale_count += 1
                by_category["very_stale"] += 1
        except:
            continue
    
    avg_age = sum(ages) / len(ages) if ages else 0
    
    return {
        "average_age_days": round(avg_age, 1),
        "fresh_evidence_count": fresh_count,
        "stale_evidence_count": stale_count,
        "total_evidence": len(evidence),
        "by_age_category": by_category,
        "freshness_score": round((fresh_count / len(evidence) * 100) if evidence else 0, 1)  # % fresh
    }


