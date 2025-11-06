"""
Intelligent Alerting & Notification Service
Generates actionable alerts with remediation guidance
"""
import sqlite3
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from services.realtime_compliance_engine import detect_compliance_drift, calculate_realtime_compliance_score

DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

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
        SELECT control_name, description, category, priority, mapped_fields, status
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
    
    return {
        'control_id': control_id,
        'control_name': control_dict['control_name'],
        'category': control_dict['category'],
        'priority': control_dict['priority'],
        'status': control_dict['status'],
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

def create_compliance_drift_alert(user_id: int, drift_data: Dict[str, Any]) -> int:
    """Create a compliance drift alert"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Calculate priority
    priority_data = calculate_alert_priority(
        alert_type='compliance_drift',
        compliance_impact=abs(drift_data['drift_percentage']),
        framework_coverage=100.0,  # Framework-wide impact
        time_since_update=1,  # Just detected
        evidence_freshness=50.0  # Default
    )
    
    # Generate alert title and description
    direction = 'decreased' if drift_data['drift_direction'] == 'negative' else 'increased'
    title = f"Compliance Drift Detected: {drift_data['framework']} Score {direction}"
    description = f"Compliance score for {drift_data['framework']} has {direction} by {abs(drift_data['drift_percentage']):.1f}% "
    description += f"(from {drift_data['baseline_score']:.1f} to {drift_data['current_score']:.1f}). "
    description += f"{drift_data['gaps_count']} controls require attention."
    
    # Generate remediation guidance for top affected controls
    remediation_guidance = []
    for control in drift_data['affected_controls'][:3]:  # Top 3
        guidance = generate_remendiation_guidance(
            control['id'],
            control['status'],
            []  # Will be populated from control data
        )
        if guidance:
            remediation_guidance.append(guidance)
    
    # Insert alert
    cursor.execute("""
        INSERT INTO compliance_alerts
        (user_id, alert_type, severity, title, description, framework,
         compliance_score_before, compliance_score_after, acknowledged)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        user_id,
        'compliance_drift',
        priority_data['severity'],
        title,
        description,
        drift_data['framework'],
        drift_data['baseline_score'],
        drift_data['current_score']
    ))
    
    alert_id = cursor.lastrowid
    
    # Store remediation guidance as JSON
    cursor.execute("""
        UPDATE compliance_alerts
        SET remediation_guidance = ?
        WHERE id = ?
    """, (json.dumps(remediation_guidance), alert_id))
    
    conn.commit()
    conn.close()
    
    return alert_id

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
            alert_id = create_compliance_drift_alert(user_id, drift_data)
            alerts_generated.append({
                'alert_id': alert_id,
                'framework': framework,
                'type': 'compliance_drift',
                'drift_percentage': drift_data['drift_percentage']
            })
    
    return alerts_generated

def get_actionable_alerts(user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """Get all actionable alerts with remediation guidance"""
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
    
    alerts = []
    for row in cursor.fetchall():
        alert = dict(row)
        
        # Parse remediation guidance if present
        if alert.get('remediation_guidance'):
            try:
                alert['remediation_guidance'] = json.loads(alert['remediation_guidance'])
            except:
                alert['remediation_guidance'] = []
        
        alerts.append(alert)
    
    conn.close()
    return alerts

