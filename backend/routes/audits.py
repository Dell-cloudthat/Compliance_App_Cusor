"""
Audit engagements, findings, evidence, reports, and certifications routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services.evidence_collection_service import (
    collect_evidence_for_control, collect_evidence_for_audit,
    get_evidence_freshness, auto_link_evidence_to_controls,
)
from services.report_generation_service import (
    generate_full_audit_report, generate_evidence_package, generate_executive_summary,
)

router = APIRouter()

class AuditEngagementCreate(BaseModel):
    audit_name: str
    framework: str
    audit_type: str
    auditor_name: Optional[str] = None
    auditor_contact: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    scope: Optional[List[str]] = None

class AuditEngagementUpdate(BaseModel):
    audit_name: Optional[str] = None
    framework: Optional[str] = None
    audit_type: Optional[str] = None
    auditor_name: Optional[str] = None
    auditor_contact: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    scope: Optional[List[str]] = None

class AuditFindingCreate(BaseModel):
    control_id: str
    finding_type: str
    severity: str
    description: str
    remediation_plan: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    evidence_required: Optional[List[str]] = None

class AuditFindingUpdate(BaseModel):
    finding_type: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    remediation_plan: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    resolved_date: Optional[str] = None

class AuditEvidenceCreate(BaseModel):
    control_id: str
    evidence_type: str
    evidence_name: str
    file_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    expiration_date: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class CertificationCreate(BaseModel):
    certification_name: str
    certification_body: Optional[str] = None
    issue_date: Optional[str] = None
    expiration_date: str
    scope: Optional[List[str]] = None
    certificate_file_path: Optional[str] = None
    renewal_reminder_days: int = 90

# Audit Engagement Endpoints
@router.post("/api/audits")
async def create_audit_engagement(audit: AuditEngagementCreate, user_id: int = Depends(get_current_user)):
    """Create a new audit engagement"""
    conn = get_db()
    cursor = conn.cursor()
    
    scope_json = json.dumps(audit.scope or [])
    
    cursor.execute("""
        INSERT INTO audit_engagements 
        (user_id, audit_name, framework, audit_type, auditor_name, auditor_contact, 
         start_date, end_date, scope, readiness_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        user_id, audit.audit_name, audit.framework, audit.audit_type,
        audit.auditor_name, audit.auditor_contact, audit.start_date,
        audit.end_date, scope_json
    ))
    
    audit_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": audit_id, "message": "Audit engagement created successfully"}

@router.get("/api/audits")
async def list_audits(user_id: int = Depends(get_current_user)):
    """List all audit engagements for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT *, 
               (SELECT COUNT(*) FROM audit_findings WHERE audit_engagement_id = audit_engagements.id) as finding_count,
               (SELECT COUNT(*) FROM audit_evidence WHERE audit_engagement_id = audit_engagements.id) as evidence_count
        FROM audit_engagements 
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))
    
    audits = cursor.fetchall()
    conn.close()
    
    result = []
    for audit in audits:
        audit_dict = dict(audit)
        audit_dict['scope'] = json.loads(audit_dict['scope']) if audit_dict['scope'] else []
        result.append(audit_dict)
    
    return result

@router.get("/api/audits/{audit_id}")
async def get_audit(audit_id: int, user_id: int = Depends(get_current_user)):
    """Get audit engagement details"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM audit_engagements 
        WHERE id = ? AND user_id = ?
    """, (audit_id, user_id))
    
    audit = cursor.fetchone()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    audit_dict = dict(audit)
    audit_dict['scope'] = json.loads(audit_dict['scope']) if audit_dict['scope'] else []
    
    # Get findings count
    cursor.execute("SELECT COUNT(*) as count FROM audit_findings WHERE audit_engagement_id = ?", (audit_id,))
    findings_count = cursor.fetchone()['count']
    audit_dict['findings_count'] = findings_count
    
    # Get evidence count
    cursor.execute("SELECT COUNT(*) as count FROM audit_evidence WHERE audit_engagement_id = ?", (audit_id,))
    evidence_count = cursor.fetchone()['count']
    audit_dict['evidence_count'] = evidence_count
    
    conn.close()
    return audit_dict

@router.put("/api/audits/{audit_id}")
async def update_audit(audit_id: int, audit_update: AuditEngagementUpdate, user_id: int = Depends(get_current_user)):
    """Update audit engagement"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Build update query dynamically
    updates = []
    values = []
    
    if audit_update.audit_name:
        updates.append("audit_name = ?")
        values.append(audit_update.audit_name)
    if audit_update.framework:
        updates.append("framework = ?")
        values.append(audit_update.framework)
    if audit_update.audit_type:
        updates.append("audit_type = ?")
        values.append(audit_update.audit_type)
    if audit_update.auditor_name is not None:
        updates.append("auditor_name = ?")
        values.append(audit_update.auditor_name)
    if audit_update.auditor_contact is not None:
        updates.append("auditor_contact = ?")
        values.append(audit_update.auditor_contact)
    if audit_update.start_date:
        updates.append("start_date = ?")
        values.append(audit_update.start_date)
    if audit_update.end_date is not None:
        updates.append("end_date = ?")
        values.append(audit_update.end_date)
    if audit_update.status:
        updates.append("status = ?")
        values.append(audit_update.status)
    if audit_update.scope is not None:
        updates.append("scope = ?")
        values.append(json.dumps(audit_update.scope))
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.extend([audit_id, user_id])
    
    cursor.execute(f"""
        UPDATE audit_engagements 
        SET {', '.join(updates)}
        WHERE id = ? AND user_id = ?
    """, values)
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Audit updated successfully"}

@router.get("/api/audits/{audit_id}/readiness")
async def calculate_readiness(audit_id: int, user_id: int = Depends(get_current_user)):
    """Calculate audit readiness score (0-100)"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get audit
    cursor.execute("SELECT * FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    audit = cursor.fetchone()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    audit_dict = dict(audit)
    scope = json.loads(audit_dict['scope']) if audit_dict['scope'] else []
    
    if not scope:
        return {"readiness_score": 0, "breakdown": {}}
    
    # Calculate evidence coverage
    cursor.execute("""
        SELECT control_id, COUNT(*) as evidence_count
        FROM audit_evidence
        WHERE audit_engagement_id = ? AND validated = 1
        GROUP BY control_id
    """, (audit_id,))
    
    evidence_by_control = {row['control_id']: row['evidence_count'] for row in cursor.fetchall()}
    
    # Calculate findings impact
    cursor.execute("""
        SELECT 
            COUNT(*) as total_findings,
            SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_findings,
            SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_findings,
            SUM(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 ELSE 0 END) as resolved_findings
        FROM audit_findings
        WHERE audit_engagement_id = ?
    """, (audit_id,))
    
    findings_stats = dict(cursor.fetchone())
    
    # Calculate readiness score
    # Evidence coverage: 50% of score
    controls_with_evidence = sum(1 for cid in scope if cid in evidence_by_control and evidence_by_control[cid] > 0)
    evidence_coverage = (controls_with_evidence / len(scope) * 100) if scope else 0
    evidence_score = evidence_coverage * 0.5
    
    # Findings impact: 30% of score
    total_findings = findings_stats['total_findings'] or 0
    critical_findings = findings_stats['critical_findings'] or 0
    high_findings = findings_stats['high_findings'] or 0
    resolved_findings = findings_stats['resolved_findings'] or 0
    
    finding_penalty = (critical_findings * 10) + (high_findings * 5) + (total_findings - resolved_findings) * 2
    findings_score = max(0, 30 - min(finding_penalty, 30))
    
    # Evidence validation: 20% of score
    cursor.execute("""
        SELECT 
            COUNT(*) as total_evidence,
            SUM(CASE WHEN validated = 1 THEN 1 ELSE 0 END) as validated_evidence
        FROM audit_evidence
        WHERE audit_engagement_id = ?
    """, (audit_id,))
    
    validation_stats = dict(cursor.fetchone())
    total_evidence = validation_stats['total_evidence'] or 0
    validated_evidence = validation_stats['validated_evidence'] or 0
    validation_score = (validated_evidence / total_evidence * 20) if total_evidence > 0 else 0
    
    readiness_score = min(100, int(evidence_score + findings_score + validation_score))
    
    # Update audit readiness score
    cursor.execute("""
        UPDATE audit_engagements 
        SET readiness_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    """, (readiness_score, audit_id, user_id))
    
    conn.commit()
    conn.close()
    
    return {
        "readiness_score": readiness_score,
        "breakdown": {
            "evidence_coverage": round(evidence_coverage, 1),
            "evidence_score": round(evidence_score, 1),
            "findings_penalty": finding_penalty,
            "findings_score": round(findings_score, 1),
            "validation_score": round(validation_score, 1),
            "total_findings": total_findings,
            "critical_findings": critical_findings,
            "high_findings": high_findings,
            "resolved_findings": resolved_findings,
            "controls_with_evidence": controls_with_evidence,
            "total_controls": len(scope),
            "total_evidence": total_evidence,
            "validated_evidence": validated_evidence
        }
    }

# Audit Findings Endpoints
@router.post("/api/audits/{audit_id}/findings")
async def create_finding(audit_id: int, finding: AuditFindingCreate, user_id: int = Depends(get_current_user)):
    """Create a new audit finding"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit exists and belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    evidence_required_json = json.dumps(finding.evidence_required or [])
    
    cursor.execute("""
        INSERT INTO audit_findings 
        (audit_engagement_id, control_id, finding_type, severity, description, 
         remediation_plan, assigned_to, due_date, evidence_required)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id, finding.control_id, finding.finding_type, finding.severity,
        finding.description, finding.remediation_plan, finding.assigned_to,
        finding.due_date, evidence_required_json
    ))
    
    finding_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": finding_id, "message": "Audit finding created successfully"}

@router.get("/api/audits/{audit_id}/findings")
async def list_findings(audit_id: int, user_id: int = Depends(get_current_user)):
    """List all findings for an audit"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    cursor.execute("""
        SELECT * FROM audit_findings 
        WHERE audit_engagement_id = ?
        ORDER BY 
            CASE severity 
                WHEN 'critical' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                ELSE 4 
            END,
            created_at DESC
    """, (audit_id,))
    
    findings = cursor.fetchall()
    conn.close()
    
    result = []
    for finding in findings:
        finding_dict = dict(finding)
        finding_dict['evidence_required'] = json.loads(finding_dict['evidence_required']) if finding_dict['evidence_required'] else []
        result.append(finding_dict)
    
    return result

@router.put("/api/audits/{audit_id}/findings/{finding_id}")
async def update_finding(audit_id: int, finding_id: int, finding_update: AuditFindingUpdate, user_id: int = Depends(get_current_user)):
    """Update audit finding"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    # Build update query
    updates = []
    values = []
    
    if finding_update.finding_type:
        updates.append("finding_type = ?")
        values.append(finding_update.finding_type)
    if finding_update.severity:
        updates.append("severity = ?")
        values.append(finding_update.severity)
    if finding_update.description:
        updates.append("description = ?")
        values.append(finding_update.description)
    if finding_update.remediation_plan is not None:
        updates.append("remediation_plan = ?")
        values.append(finding_update.remediation_plan)
    if finding_update.assigned_to is not None:
        updates.append("assigned_to = ?")
        values.append(finding_update.assigned_to)
    if finding_update.due_date is not None:
        updates.append("due_date = ?")
        values.append(finding_update.due_date)
    if finding_update.status:
        updates.append("status = ?")
        values.append(finding_update.status)
        if finding_update.status in ['resolved', 'closed'] and not finding_update.resolved_date:
            updates.append("resolved_date = CURRENT_DATE")
    
    if finding_update.resolved_date:
        updates.append("resolved_date = ?")
        values.append(finding_update.resolved_date)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.extend([finding_id, audit_id])
    
    cursor.execute(f"""
        UPDATE audit_findings 
        SET {', '.join(updates)}
        WHERE id = ? AND audit_engagement_id = ?
    """, values)
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Finding updated successfully"}

# Audit Evidence Endpoints
@router.post("/api/audits/{audit_id}/evidence")
async def create_evidence(audit_id: int, evidence: AuditEvidenceCreate, user_id: int = Depends(get_current_user)):
    """Upload audit evidence"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    metadata_json = json.dumps(evidence.metadata or {})
    
    cursor.execute("""
        INSERT INTO audit_evidence 
        (audit_engagement_id, control_id, evidence_type, evidence_name, 
         file_url, file_size_bytes, expiration_date, metadata, notes, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id, evidence.control_id, evidence.evidence_type, evidence.evidence_name,
        evidence.file_url, evidence.file_size_bytes, evidence.expiration_date,
        metadata_json, evidence.notes, f"user_{user_id}"
    ))
    
    evidence_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": evidence_id, "message": "Evidence uploaded successfully"}

@router.get("/api/audits/{audit_id}/evidence")
async def list_evidence(audit_id: int, user_id: int = Depends(get_current_user), control_id: Optional[str] = None):
    """List audit evidence"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    if control_id:
        cursor.execute("""
            SELECT * FROM audit_evidence 
            WHERE audit_engagement_id = ? AND control_id = ?
            ORDER BY uploaded_at DESC
        """, (audit_id, control_id))
    else:
        cursor.execute("""
            SELECT * FROM audit_evidence 
            WHERE audit_engagement_id = ?
            ORDER BY uploaded_at DESC
        """, (audit_id,))
    
    evidence_list = cursor.fetchall()
    conn.close()
    
    result = []
    for ev in evidence_list:
        ev_dict = dict(ev)
        ev_dict['metadata'] = json.loads(ev_dict['metadata']) if ev_dict['metadata'] else {}
        result.append(ev_dict)
    
    return result

@router.put("/api/audits/{audit_id}/evidence/{evidence_id}/validate")
async def validate_evidence(audit_id: int, evidence_id: int, user_id: int = Depends(get_current_user), validated: bool = True):
    """Validate or reject audit evidence"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    cursor.execute("""
        UPDATE audit_evidence 
        SET validated = ?, validated_by = ?, validated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND audit_engagement_id = ?
    """, (validated, f"user_{user_id}", evidence_id, audit_id))
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Evidence not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Evidence validation updated successfully"}

# Automated Evidence Collection Endpoints
@router.post("/api/audits/{audit_id}/evidence/collect")
async def trigger_evidence_collection(
    audit_id: int,
    user_id: int = Depends(get_current_user),
    control_ids: Optional[List[str]] = None,
    integration_id: Optional[int] = None
):
    """Trigger automated evidence collection for an audit"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.close()
    
    # Collect evidence
    results = collect_evidence_for_audit(audit_id, control_ids, integration_id)
    
    return results

@router.post("/api/audits/{audit_id}/evidence/collect/{control_id}")
async def collect_evidence_for_single_control(
    audit_id: int,
    control_id: str,
    user_id: int = Depends(get_current_user),
    integration_id: Optional[int] = None
):
    """Collect evidence for a specific control"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.close()
    
    # Collect evidence for this control
    evidence_items = collect_evidence_for_control(control_id, audit_id, integration_id)
    
    return {
        "control_id": control_id,
        "evidence_collected": len(evidence_items),
        "evidence_items": evidence_items
    }

@router.get("/api/audits/{audit_id}/evidence/freshness")
async def get_evidence_freshness_metrics(
    audit_id: int,
    user_id: int = Depends(get_current_user)
):
    """Get evidence freshness metrics for an audit"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.close()
    
    freshness_stats = get_evidence_freshness(audit_id)
    
    return freshness_stats

@router.post("/api/audits/{audit_id}/evidence/auto-link")
async def trigger_auto_linking(
    audit_id: int,
    user_id: int = Depends(get_current_user)
):
    """Automatically link evidence to controls based on content analysis"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.close()
    
    linking_results = auto_link_evidence_to_controls(audit_id)
    
    return linking_results

# Report Generation Endpoints
@router.get("/api/audits/{audit_id}/reports/full")
async def generate_full_report(
    audit_id: int,
    user_id: int = Depends(get_current_user)
):
    """Generate full audit report"""
    report = generate_full_audit_report(audit_id, user_id)
    if "error" in report:
        raise HTTPException(status_code=404, detail=report["error"])
    return report

@router.get("/api/audits/{audit_id}/reports/evidence-package")
async def generate_evidence_package_report(
    audit_id: int,
    user_id: int = Depends(get_current_user),
    control_ids: Optional[str] = None
):
    """Generate evidence package report"""
    control_ids_list = json.loads(control_ids) if control_ids else None
    package = generate_evidence_package(audit_id, user_id, control_ids_list)
    if "error" in package:
        raise HTTPException(status_code=404, detail=package["error"])
    return package

@router.get("/api/audits/{audit_id}/reports/executive-summary")
async def generate_executive_summary_report(
    audit_id: int,
    user_id: int = Depends(get_current_user)
):
    """Generate executive summary report"""
    summary = generate_executive_summary(audit_id, user_id)
    if "error" in summary:
        raise HTTPException(status_code=404, detail=summary["error"])
    return summary

# Certification Endpoints
@router.post("/api/certifications")
async def create_certification(cert: CertificationCreate, user_id: int = Depends(get_current_user)):
    """Create a new certification"""
    conn = get_db()
    cursor = conn.cursor()
    
    scope_json = json.dumps(cert.scope or [])
    
    cursor.execute("""
        INSERT INTO certifications 
        (user_id, certification_name, certification_body, issue_date, 
         expiration_date, scope, certificate_file_path, renewal_reminder_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, cert.certification_name, cert.certification_body, cert.issue_date,
        cert.expiration_date, scope_json, cert.certificate_file_path, cert.renewal_reminder_days
    ))
    
    cert_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": cert_id, "message": "Certification created successfully"}

@router.get("/api/certifications")
async def list_certifications(user_id: int = Depends(get_current_user)):
    """List all certifications for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM certifications 
        WHERE user_id = ?
        ORDER BY expiration_date ASC
    """, (user_id,))
    
    certs = cursor.fetchall()
    conn.close()
    
    result = []
    for cert in certs:
        cert_dict = dict(cert)
        cert_dict['scope'] = json.loads(cert_dict['scope']) if cert_dict['scope'] else []
        result.append(cert_dict)
    
    return result

# ============================================================================
# IAM (Identity & Access Management) Endpoints
