"""
Security-event ingestion, compliance score history, and compliance-alerts routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services.csca_engine import (
    map_security_event_to_compliance, calculate_compliance_impact,
    update_compliance_scores_from_security_event, get_security_compliance_correlation,
)

router = APIRouter()

# CSCA Models
class SecurityEventCreate(BaseModel):
    event_type: str  # 'threat_detected', 'vulnerability_found', 'incident', 'policy_violation', 'configuration_change'
    event_source: str  # 'SIEM', 'EDR', 'CSPM', 'Vulnerability Scanner'
    source_tool: Optional[str] = None
    severity: str  # 'critical', 'high', 'medium', 'low', 'info'
    title: str
    description: Optional[str] = None
    affected_resources: Optional[List[str]] = None
    security_event_data: Optional[Dict[str, Any]] = None
    detected_at: Optional[str] = None  # ISO format timestamp
    frameworks: Optional[List[str]] = None  # Which frameworks to map to


@router.post("/api/security-events")
async def create_security_event(event: SecurityEventCreate, user_id: int = Depends(get_current_user), request: Request = None):
    """Ingest a security event and automatically map to compliance controls"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Insert security event
    detected_at = event.detected_at if event.detected_at else datetime.now().isoformat()
    affected_resources_json = json.dumps(event.affected_resources) if event.affected_resources else None
    event_data_json = json.dumps(event.security_event_data) if event.security_event_data else None
    
    cursor.execute("""
        INSERT INTO security_events 
        (user_id, event_type, event_source, source_tool, severity, title, description, 
         affected_resources, security_event_data, detected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, event.event_type, event.event_source, event.source_tool,
        event.severity, event.title, event.description,
        affected_resources_json, event_data_json, detected_at
    ))
    
    event_id = cursor.lastrowid
    conn.commit()
    
    # Map to compliance controls
    event_dict = {
        'event_type': event.event_type,
        'severity': event.severity,
        'frameworks': event.frameworks or ['NIST_800-53', 'ISO27001', 'SOC2', 'CIS']
    }
    mappings = map_security_event_to_compliance(user_id, event_dict)
    
    # Insert compliance mappings
    for mapping in mappings:
        cursor.execute("""
            INSERT INTO security_event_compliance_mapping
            (security_event_id, control_id, framework, impact_level, compliance_impact)
            VALUES (?, ?, ?, ?, ?)
        """, (
            event_id, mapping['control_id'], mapping['framework'],
            mapping['impact_level'], mapping['compliance_impact']
        ))
    
    conn.commit()
    
    # Update compliance scores
    update_compliance_scores_from_security_event(user_id, event_id)
    
    # Insert correlation metric
    if mappings:
        cursor.execute("""
            INSERT INTO security_compliance_correlation
            (user_id, metric_type, metric_value, compliance_score_delta, framework)
            VALUES (?, ?, ?, ?, ?)
        """, (
            user_id, f'{event.event_type}_impact', abs(mappings[0].get('compliance_score_delta', 0)),
            mappings[0].get('compliance_score_delta', 0), mappings[0].get('framework')
        ))
        conn.commit()
    
    conn.close()
    
    return {
        "id": event_id,
        "mappings": len(mappings),
        "message": "Security event ingested and mapped to compliance controls"
    }

@router.get("/api/security-events")
async def list_security_events(user_id: int = Depends(get_current_user), 
                              event_type: Optional[str] = None,
                              severity: Optional[str] = None,
                              status: Optional[str] = None,
                              limit: int = 100):
    """List security events with compliance mappings"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM security_events WHERE user_id = ?"
    params = [user_id]
    
    if event_type:
        query += " AND event_type = ?"
        params.append(event_type)
    
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    
    if status:
        query += " AND status = ?"
        params.append(status)
    
    query += " ORDER BY detected_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    events = cursor.fetchall()
    
    # Get compliance mappings for each event
    result = []
    for event in events:
        event_dict = dict(event)
        event_dict['affected_resources'] = json.loads(event_dict['affected_resources']) if event_dict.get('affected_resources') else []
        event_dict['security_event_data'] = json.loads(event_dict['security_event_data']) if event_dict.get('security_event_data') else {}
        
        # Get compliance mappings
        cursor.execute("""
            SELECT * FROM security_event_compliance_mapping
            WHERE security_event_id = ?
        """, (event_dict['id'],))
        mappings = cursor.fetchall()
        event_dict['compliance_mappings'] = [dict(m) for m in mappings]
        
        result.append(event_dict)
    
    conn.close()
    return result

@router.get("/api/security-events/{event_id}/compliance-impact")
async def get_security_event_compliance_impact(event_id: int, user_id: int = Depends(get_current_user)):
    """Get compliance impact of a specific security event"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify event belongs to user
    cursor.execute("SELECT id FROM security_events WHERE id = ? AND user_id = ?", (event_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Security event not found")
    
    impact = calculate_compliance_impact(user_id, event_id)
    
    # Get compliance mappings
    cursor.execute("""
        SELECT secm.*, c.control_name
        FROM security_event_compliance_mapping secm
        LEFT JOIN controls c ON secm.control_id = c.id
        WHERE secm.security_event_id = ?
    """, (event_id,))
    mappings = cursor.fetchall()
    
    conn.close()
    
    return {
        "event_id": event_id,
        "framework_impacts": impact,
        "control_mappings": [dict(m) for m in mappings]
    }

@router.get("/api/compliance-score-history")
async def get_compliance_score_history(user_id: int = Depends(get_current_user),
                                       framework: Optional[str] = None,
                                       days: int = 30):
    """Get compliance score history with security event impacts"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = """
        SELECT * FROM compliance_score_history
        WHERE user_id = ? AND calculated_at >= datetime('now', '-' || ? || ' days')
    """
    params = [user_id, days]
    
    if framework:
        query += " AND framework = ?"
        params.append(framework)
    
    query += " ORDER BY framework, calculated_at DESC"
    
    cursor.execute(query, params)
    history = cursor.fetchall()
    
    conn.close()
    return [dict(h) for h in history]

@router.get("/api/compliance-alerts")
async def get_compliance_alerts(user_id: int = Depends(get_current_user),
                               acknowledged: Optional[bool] = None,
                               severity: Optional[str] = None,
                               limit: int = 50):
    """Get compliance alerts (including security event triggered alerts)"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM compliance_alerts WHERE user_id = ?"
    params = [user_id]
    
    if acknowledged is not None:
        query += " AND acknowledged = ?"
        params.append(1 if acknowledged else 0)
    
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    alerts = cursor.fetchall()
    
    conn.close()
    return [dict(a) for a in alerts]

@router.post("/api/compliance-alerts/{alert_id}/acknowledge")
async def acknowledge_compliance_alert(alert_id: int, user_id: int = Depends(get_current_user)):
    """Acknowledge a compliance alert"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify alert belongs to user
    cursor.execute("SELECT id FROM compliance_alerts WHERE id = ? AND user_id = ?", (alert_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Alert not found")
    
    cursor.execute("""
        UPDATE compliance_alerts
        SET acknowledged = 1, acknowledged_at = datetime('now'), acknowledged_by = ?
        WHERE id = ?
    """, (user_id, alert_id))
    
    conn.commit()
    conn.close()
    updated_alert = alert_service.get_alert(alert_id)
    if updated_alert:
        await alert_ws_manager.broadcast_alert(updated_alert, 'alert.updated')
    return {"message": "Alert acknowledged"}

