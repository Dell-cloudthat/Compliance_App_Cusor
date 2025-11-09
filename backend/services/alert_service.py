"""
Intelligent Alerting & Notification Service
Generates actionable alerts with remediation guidance
"""
import sqlite3
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from services.realtime_compliance_engine import detect_compliance_drift, calculate_realtime_compliance_score

DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def ensure_alert_columns():
    """Ensure newer alert columns exist for remediation workflow"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(compliance_alerts)")
    columns = {row[1] if not hasattr(row, 'keys') else row['name'] for row in cursor.fetchall()}

    alterations = []
    if 'status' not in columns:
        alterations.append("ALTER TABLE compliance_alerts ADD COLUMN status TEXT DEFAULT 'open'")
    if 'drift_payload' not in columns:
        alterations.append("ALTER TABLE compliance_alerts ADD COLUMN drift_payload TEXT")
    if 'resolution_metadata' not in columns:
        alterations.append("ALTER TABLE compliance_alerts ADD COLUMN resolution_metadata TEXT")
    if 'resolution_notes' not in columns:
        alterations.append("ALTER TABLE compliance_alerts ADD COLUMN resolution_notes TEXT")
    if 'resolved_at' not in columns:
        alterations.append("ALTER TABLE compliance_alerts ADD COLUMN resolved_at TIMESTAMP")
    if 'resolved_by' not in columns:
        alterations.append("ALTER TABLE compliance_alerts ADD COLUMN resolved_by TEXT")

    for statement in alterations:
        try:
            cursor.execute(statement)
        except sqlite3.OperationalError:
            # Column may already exist due to race; ignore
            pass

    if alterations:
        conn.commit()
    conn.close()

def ensure_alert_activity_tables():
    """Ensure alert activity log table exists"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alert_activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            actor TEXT,
            event_type TEXT NOT NULL,
            status TEXT,
            notes TEXT,
            actions_taken TEXT,
            evidence_links TEXT,
            metadata_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (alert_id) REFERENCES compliance_alerts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alert_activity_alert ON alert_activity_log(alert_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alert_activity_user ON alert_activity_log(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alert_activity_created ON alert_activity_log(created_at)")
    conn.commit()
    conn.close()

DEFAULT_ALERT_ACTIONS: List[Dict[str, Any]] = [
    {'id': 'guidance', 'label': 'View Guidance', 'icon': 'Sparkles',
     'description': 'Review AI-generated remediation steps'},
    {'id': 'assign', 'label': 'Assign Owner', 'icon': 'UserCheck',
     'description': 'Assign resolver and set due date'},
    {'id': 'ticket', 'label': 'Open Change Ticket', 'icon': 'ClipboardList',
     'description': 'Create change or incident record'},
    {'id': 'evidence', 'label': 'Request Evidence', 'icon': 'FileCheck',
     'description': 'Trigger automated evidence capture'},
]

def record_alert_activity(
    alert_id: int,
    user_id: int,
    event_type: str,
    status: Optional[str] = None,
    actor: Optional[str] = None,
    notes: Optional[str] = None,
    actions_taken: Optional[List[str]] = None,
    evidence_links: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Persist alert activity timeline entry"""
    ensure_alert_activity_tables()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO alert_activity_log
        (alert_id, user_id, actor, event_type, status, notes, actions_taken, evidence_links, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            alert_id,
            user_id,
            actor,
            event_type,
            status,
            notes,
            json.dumps(actions_taken) if actions_taken else None,
            json.dumps(evidence_links) if evidence_links else None,
            json.dumps(metadata) if metadata else None,
        ),
    )
    conn.commit()
    conn.close()

def list_alert_activity(alert_id: int) -> List[Dict[str, Any]]:
    """Return ordered timeline entries for an alert"""
    ensure_alert_activity_tables()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, actor, event_type, status, notes, actions_taken, evidence_links, metadata_json, created_at
        FROM alert_activity_log
        WHERE alert_id = ?
        ORDER BY created_at ASC, id ASC
        """,
        (alert_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    entries: List[Dict[str, Any]] = []
    for row in rows:
        entry = dict(row)
        actions = entry.get('actions_taken')
        evidence = entry.get('evidence_links')
        metadata_json = entry.get('metadata_json')
        if actions:
            try:
                entry['actions_taken'] = json.loads(actions)
            except json.JSONDecodeError:
                entry['actions_taken'] = actions
        else:
            entry['actions_taken'] = []
        if evidence:
            try:
                entry['evidence_links'] = json.loads(evidence)
            except json.JSONDecodeError:
                entry['evidence_links'] = evidence
        else:
            entry['evidence_links'] = []
        if metadata_json:
            try:
                entry['metadata'] = json.loads(metadata_json)
            except json.JSONDecodeError:
                entry['metadata'] = metadata_json
        else:
            entry['metadata'] = {}

        event_type = entry.pop('event_type', 'update')
        entry['event_type'] = event_type
        entry['event'] = {
            'alert_triggered': 'Alert Triggered',
            'alert_status_change': 'Status Updated',
            'control_update': 'Control Update',
            'evidence_added': 'Evidence Added',
        }.get(event_type, event_type.replace('_', ' ').title())
        entry['timestamp'] = entry.pop('created_at')
        entries.append(entry)
    return entries

def _build_linked_controls(alert: Dict[str, Any], user_id: Optional[int]) -> List[Dict[str, Any]]:
    guidance = alert.get('remediation_guidance') or []
    if not guidance:
        return []

    control_ids = [g.get('control_id') for g in guidance if g.get('control_id')]
    controls_map: Dict[str, Dict[str, Any]] = {}
    if control_ids:
        placeholders = ",".join("?" for _ in control_ids)
        sql = f"""
            SELECT id, control_name, status, responsible_party, frameworks, priority, evidence_link
            FROM controls
            WHERE id IN ({placeholders})
        """
        params: Tuple[Any, ...]
        if user_id is not None:
            sql += " AND user_id = ?"
            params = tuple(control_ids) + (user_id,)
        else:
            params = tuple(control_ids)
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(sql, params)
        for row in cursor.fetchall():
            data = dict(row)
            frameworks = data.get('frameworks')
            if isinstance(frameworks, str):
                try:
                    data['frameworks'] = json.loads(frameworks)
                except json.JSONDecodeError:
                    data['frameworks'] = frameworks
            controls_map[data['id']] = data
        conn.close()

    linked_controls: List[Dict[str, Any]] = []
    for index, guidance_entry in enumerate(guidance, start=1):
        control_id = guidance_entry.get('control_id')
        current = controls_map.get(control_id, {})
        linked_controls.append({
            'id': control_id,
            'control_name': guidance_entry.get('control_name') or current.get('control_name'),
            'framework': guidance_entry.get('framework') or (current.get('frameworks') or [alert.get('framework')])[0] if current.get('frameworks') else alert.get('framework'),
            'priority': guidance_entry.get('priority') or current.get('priority'),
            'status': current.get('status') or guidance_entry.get('status') or guidance_entry.get('current_status') or 'Not Implemented',
            'target_status': guidance_entry.get('target_status') or 'Implemented',
            'owner': current.get('responsible_party') or guidance_entry.get('current_owner') or guidance_entry.get('recommended_owner') or alert.get('responsible_party'),
            'coverage_delta': guidance_entry.get('coverage_delta'),
            'evidence_links': guidance_entry.get('evidence_links') or ([current['evidence_link']] if current.get('evidence_link') else []),
            'automation_ready': bool(guidance_entry.get('automation_ready')),
            'sequence': guidance_entry.get('sequence') or index,
        })
    return linked_controls

def _build_risk_snapshot(alert: Dict[str, Any]) -> Dict[str, Any]:
    drift_payload = alert.get('drift_payload') or {}
    baseline = drift_payload.get('baseline_score') or alert.get('compliance_score_before')
    current = drift_payload.get('current_score') or alert.get('compliance_score_after')
    return {
        'severity': alert.get('severity'),
        'drift_percentage': drift_payload.get('drift_percentage'),
        'baseline_score': baseline,
        'current_score': current,
        'risk_owner': alert.get('responsible_party'),
        'affected_assets': drift_payload.get('affected_assets'),
        'automation_impact': len([g for g in alert.get('remediation_guidance') or [] if g.get('automation_ready')]),
    }

def get_alert_detail(alert_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Fetch alert and enriched drill-down data"""
    alert = get_alert(alert_id)
    if not alert:
        return None
    if user_id is not None and alert.get('user_id') != user_id:
        return None

    timeline = list_alert_activity(alert_id)
    if not timeline:
        metadata = alert.get('resolution_metadata') or {}
        history = metadata.get('status_history') or []
        for item in history:
            timeline.append({
                'id': f"{alert_id}-history-{item.get('timestamp')}",
                'actor': None,
                'event_type': 'alert_status_change',
                'event': 'Status Updated',
                'status': item.get('status'),
                'notes': None,
                'actions_taken': [],
                'evidence_links': [],
                'metadata': {},
                'timestamp': item.get('timestamp'),
            })
        timeline.sort(key=lambda entry: entry.get('timestamp') or '')

    linked_controls = _build_linked_controls(alert, user_id)
    detail = {
        'alert': alert,
        'timeline': timeline,
        'linked_controls': linked_controls,
        'risk_snapshot': _build_risk_snapshot(alert),
        'actions': DEFAULT_ALERT_ACTIONS,
        'first_detected': alert.get('created_at'),
        'last_updated': alert.get('resolved_at') or (timeline[-1]['timestamp'] if timeline else alert.get('created_at')),
    }
    return detail
def calculate_alert_priority(alert_type: str, compliance_impact: float, framework_coverage: float, 
                             time_since_update: int, evidence_freshness: float) -> Dict[str, Any]:
    """
    Calculate alert priority using risk scoring algorithm
    Risk Score = (Compliance Impact × Framework Coverage × Time Since Update × Evidence Freshness)
    """
    # Normalize factors (0-1 scale)
    impact_norm = min(compliance_impact / 100, 1.0)  # Impact as percentage
    coverage_norm = framework_coverage / 100  # Coverage as percentage
    time_norm = min(time_since_update / 30, 1.0)  # Days since update, capped at 30
    freshness_norm = evidence_freshness / 100  # Evidence freshness as percentage
    
    # Calculate risk score (0-100)
    risk_score = (impact_norm * 0.4 + coverage_norm * 0.3 + time_norm * 0.2 + freshness_norm * 0.1) * 100
    
    # Determine priority
    if risk_score >= 80:
        priority = 'critical'
        severity = 'critical'
    elif risk_score >= 60:
        priority = 'high'
        severity = 'high'
    elif risk_score >= 40:
        priority = 'medium'
        severity = 'medium'
    else:
        priority = 'low'
        severity = 'low'
    
    return {
        'priority': priority,
        'severity': severity,
        'risk_score': round(risk_score, 1),
        'factors': {
            'compliance_impact': compliance_impact,
            'framework_coverage': framework_coverage,
            'time_since_update': time_since_update,
            'evidence_freshness': evidence_freshness
        }
    }

def generate_remendiation_guidance(control_id: str, control_status: str, frameworks: List[str]) -> Dict[str, Any]:
    """
    Generate actionable remediation guidance for a control
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get control details
    cursor.execute("""
        SELECT control_name, description, category, priority, mapped_fields, status,
               frameworks, responsible_party, default_owner
        FROM controls
        WHERE id = ?
    """, (control_id,))
    
    control = cursor.fetchone()
    if not control:
        conn.close()
        return {}
    
    control_dict = dict(control)
    
    # Generate step-by-step remediation
    steps = []
    
    if control_dict['status'] == 'Non-Compliant':
        steps.append({
            'step': 1,
            'action': 'Assess Current State',
            'description': f'Review current implementation status of {control_dict["control_name"]}',
            'estimated_time': '30 minutes',
            'resources': ['Control documentation', 'Current configuration']
        })
        
        steps.append({
            'step': 2,
            'action': 'Identify Gaps',
            'description': 'Document specific gaps between current state and compliance requirements',
            'estimated_time': '1 hour',
            'resources': ['Framework requirements', 'Gap analysis template']
        })
        
        steps.append({
            'step': 3,
            'action': 'Implement Remediation',
            'description': f'Implement required changes to achieve compliance for {control_dict["category"]}',
            'estimated_time': '4-8 hours',
            'resources': ['Implementation guide', 'Testing checklist']
        })
        
        steps.append({
            'step': 4,
            'action': 'Validate & Document',
            'description': 'Validate implementation and collect evidence',
            'estimated_time': '1 hour',
            'resources': ['Validation checklist', 'Evidence template']
        })
    elif control_dict['status'] == 'Partial':
        steps.append({
            'step': 1,
            'action': 'Complete Partial Implementation',
            'description': 'Identify and complete remaining implementation requirements',
            'estimated_time': '2-4 hours',
            'resources': ['Partial implementation checklist']
        })
        
        steps.append({
            'step': 2,
            'action': 'Validate Full Compliance',
            'description': 'Ensure all requirements are fully met',
            'estimated_time': '1 hour',
            'resources': ['Compliance checklist']
        })
    
    # Add framework-specific guidance
    framework_links = []
    for framework in frameworks:
        if 'NIST_800-53' in framework:
            framework_links.append({
                'framework': 'NIST 800-53',
                'link': f'https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf',
                'control_id': framework.split(':')[1] if ':' in framework else ''
            })
        elif 'ISO27001' in framework:
            framework_links.append({
                'framework': 'ISO 27001',
                'link': 'https://www.iso.org/standard/54534.html',
                'control_id': framework.split(':')[1] if ':' in framework else ''
            })
    
    conn.close()
    
    frameworks_list = frameworks or []
    if control_dict.get('frameworks'):
        try:
            frameworks_list = json.loads(control_dict['frameworks'])
        except json.JSONDecodeError:
            frameworks_list = frameworks or []

    return {
        'control_id': control_id,
        'control_name': control_dict['control_name'],
        'category': control_dict['category'],
        'priority': control_dict['priority'],
        'status': control_dict['status'],
        'recommended_owner': control_dict.get('responsible_party') or control_dict.get('default_owner'),
        'frameworks': frameworks_list,
        'remediation_steps': steps,
        'estimated_total_time': sum(int(s['estimated_time'].split()[0]) for s in steps if 'hour' in s['estimated_time']),
        'framework_links': framework_links,
        'mapped_fields': json.loads(control_dict['mapped_fields']) if control_dict['mapped_fields'] else [],
        'one_click_actions': generate_one_click_actions(control_dict)
    }

def generate_one_click_actions(control: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate one-click remediation actions based on control type"""
    actions = []
    
    # Auto-mappable controls can have automated actions
    if control.get('mapped_fields'):
        mapped_fields = json.loads(control['mapped_fields']) if isinstance(control['mapped_fields'], str) else control['mapped_fields']
        
        for field in mapped_fields:
            if 'EDR' in field or 'Endpoint' in field:
                actions.append({
                    'action': 'Configure EDR Monitoring',
                    'type': 'link',
                    'url': '/controls/configure-edr',
                    'description': 'Configure endpoint detection and response monitoring'
                })
            elif 'MFA' in field or 'SSO' in field:
                actions.append({
                    'action': 'Enable MFA',
                    'type': 'link',
                    'url': '/controls/configure-mfa',
                    'description': 'Configure multi-factor authentication'
                })
            elif 'IAM' in field or 'RBAC' in field:
                actions.append({
                    'action': 'Review Access Controls',
                    'type': 'link',
                    'url': '/iam',
                    'description': 'Review and configure identity and access management'
                })
    
    # Generic actions
    actions.append({
        'action': 'Upload Evidence',
        'type': 'modal',
        'modal': 'upload-evidence',
        'description': 'Upload compliance evidence for this control'
    })
    
    actions.append({
        'action': 'Assign Owner',
        'type': 'modal',
        'modal': 'assign-owner',
        'description': 'Assign a responsible party for this control'
    })
    
    return actions

def create_compliance_drift_alert(user_id: int, drift_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a compliance drift alert and return the full alert payload"""
    ensure_alert_columns()
    conn = get_db()
    cursor = conn.cursor()

    priority_data = calculate_alert_priority(
        alert_type='compliance_drift',
        compliance_impact=abs(drift_data['drift_percentage']),
        framework_coverage=100.0,
        time_since_update=1,
        evidence_freshness=50.0
    )

    direction = 'decreased' if drift_data['drift_direction'] == 'negative' else 'increased'
    title = f"Compliance Drift Detected: {drift_data['framework']} Score {direction}"
    description = (
        f"Compliance score for {drift_data['framework']} has {direction} by "
        f"{abs(drift_data['drift_percentage']):.1f}% (from {drift_data['baseline_score']:.1f} "
        f"to {drift_data['current_score']:.1f}). {drift_data['gaps_count']} controls require attention."
    )

    remediation_guidance = []
    for control in drift_data['affected_controls'][:3]:
        guidance = generate_remendiation_guidance(
            control['id'],
            control.get('status', ''),
            control.get('frameworks', [])
        )
        if guidance:
            if control.get('responsible_party'):
                guidance['current_owner'] = control.get('responsible_party')
            remediation_guidance.append(guidance)

    primary_control_id = drift_data['affected_controls'][0]['id'] if drift_data['affected_controls'] else None
    drift_payload = json.dumps(drift_data)
    status_history = [{
        'status': 'open',
        'timestamp': datetime.utcnow().isoformat()
    }]
    resolution_metadata = json.dumps({
        'status_history': status_history,
        'risk_score': priority_data['risk_score'],
        'factors': priority_data['factors']
    })

    cursor.execute("""
        INSERT INTO compliance_alerts
        (user_id, alert_type, severity, title, description, security_event_id, control_id, framework,
         compliance_score_before, compliance_score_after, status, drift_payload, resolution_metadata, acknowledged)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        user_id,
        'compliance_drift',
        priority_data['severity'],
        title,
        description,
        None,
        primary_control_id,
        drift_data['framework'],
        drift_data['baseline_score'],
        drift_data['current_score'],
        'open',
        drift_payload,
        resolution_metadata
    ))

    alert_id = cursor.lastrowid

    cursor.execute("""
        UPDATE compliance_alerts
        SET remediation_guidance = ?
        WHERE id = ?
    """, (json.dumps(remediation_guidance), alert_id))

    conn.commit()
    conn.close()

    alert_record = get_alert(alert_id)
    if alert_record:
        record_alert_activity(
            alert_id=alert_id,
            user_id=user_id,
            event_type='alert_triggered',
            status='open',
            actor='Monitoring Engine',
            notes=description,
            metadata={'drift_payload': drift_data},
        )

    return alert_record

def _parse_alert_row(row: sqlite3.Row) -> Dict[str, Any]:
    alert = dict(row)
    for field in ('remediation_guidance', 'drift_payload', 'resolution_metadata'):
        if alert.get(field):
            try:
                alert[field] = json.loads(alert[field])
            except (json.JSONDecodeError, TypeError):
                pass
    alert['acknowledged'] = bool(alert.get('acknowledged', 0))
    return alert

def get_alert(alert_id: int) -> Optional[Dict[str, Any]]:
    ensure_alert_columns()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM compliance_alerts WHERE id = ?", (alert_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return _parse_alert_row(row)

def update_alert_status(
    alert_id: int,
    status: str,
    metadata_patch: Optional[Dict[str, Any]] = None,
    resolved_by: Optional[str] = None,
    notes: Optional[str] = None,
    *,
    user_id: Optional[int] = None,
    actor: Optional[str] = None,
    actions_taken: Optional[List[str]] = None,
    evidence_links: Optional[List[str]] = None,
    control_updates: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Dict[str, Any]]:
    ensure_alert_columns()
    existing_alert = get_alert(alert_id)
    if not existing_alert:
        return None

    metadata = existing_alert.get('resolution_metadata') or {}
    if metadata_patch:
        metadata.update(metadata_patch)

    history = metadata.get('status_history', [])
    history.append({
        'status': status,
        'timestamp': datetime.utcnow().isoformat()
    })
    metadata['status_history'] = history

    conn = get_db()
    cursor = conn.cursor()

    updates = ["status = ?", "resolution_metadata = ?"]
    params = [status, json.dumps(metadata)]

    if notes is not None:
        updates.append("resolution_notes = ?")
        params.append(notes)

    if status == 'resolved':
        updates.append("resolved_at = datetime('now')")
    else:
        updates.append("resolved_at = NULL")

    if resolved_by is not None:
        updates.append("resolved_by = ?")
        params.append(resolved_by)
    elif status != 'resolved':
        updates.append("resolved_by = NULL")

    sql = f"UPDATE compliance_alerts SET {', '.join(updates)} WHERE id = ?"
    params.append(alert_id)
    cursor.execute(sql, params)

    if cursor.rowcount == 0:
        conn.close()
        return None

    conn.commit()
    conn.close()

    updated_alert = get_alert(alert_id)
    if updated_alert:
        activity_metadata: Dict[str, Any] = {}
        if metadata_patch:
            activity_metadata.update(metadata_patch)
        if control_updates:
            activity_metadata['control_updates'] = control_updates

        record_alert_activity(
            alert_id=alert_id,
            user_id=user_id or existing_alert.get('user_id'),
            event_type='alert_status_change',
            status=status,
            actor=actor or resolved_by or (f"User {user_id}" if user_id is not None else None),
            notes=notes,
            actions_taken=actions_taken,
            evidence_links=evidence_links,
            metadata=activity_metadata if activity_metadata else None,
        )

    return updated_alert

def check_and_generate_alerts(user_id: int) -> List[Dict[str, Any]]:
    """
    Check all frameworks for drift and generate alerts
    Returns list of generated alerts
    """
    frameworks = ['NIST_800-53', 'NIST_800-171', 'ISO27001', 'SOC2', 'CIS']
    alerts_generated = []
    
    for framework in frameworks:
        drift_data = detect_compliance_drift(user_id, framework, threshold=5.0)
        if drift_data:
            alert_record = create_compliance_drift_alert(user_id, drift_data)
            alerts_generated.append({
                'alert_id': alert_record['id'] if alert_record else None,
                'alert': alert_record,
                'framework': framework,
                'type': 'compliance_drift',
                'drift_percentage': drift_data['drift_percentage']
            })
    
    return alerts_generated

def get_actionable_alerts(user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """Get all actionable alerts with remediation guidance"""
    ensure_alert_columns()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM compliance_alerts
        WHERE user_id = ? AND acknowledged = 0
        ORDER BY 
            CASE severity
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                ELSE 4
            END,
            created_at DESC
        LIMIT ?
    """, (user_id, limit))
    
    alerts = [_parse_alert_row(row) for row in cursor.fetchall()]
    conn.close()
    return alerts

