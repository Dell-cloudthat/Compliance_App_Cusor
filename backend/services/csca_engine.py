"""
Continuous Security-Compliance Alignment (CSCA) Engine
Maps security events to compliance controls and calculates real-time compliance impact
"""
import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Any, Tuple
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

# Security Event Type to Compliance Control Mapping
EVENT_TYPE_TO_CONTROLS = {
    'threat_detected': {
        'NIST_800-53': ['SI-3', 'SI-4', 'IR-4', 'IR-5'],
        'ISO27001': ['A.12.4.1', 'A.16.1.1', 'A.16.1.2'],
        'SOC2': ['CC6.1', 'CC7.2', 'CC7.3'],
        'CIS': ['CIS 6', 'CIS 7']
    },
    'vulnerability_found': {
        'NIST_800-53': ['SI-2', 'RA-5', 'CM-4'],
        'ISO27001': ['A.12.6.1', 'A.14.2.1'],
        'SOC2': ['CC6.2', 'CC7.1'],
        'CIS': ['CIS 3', 'CIS 4']
    },
    'incident': {
        'NIST_800-53': ['IR-1', 'IR-2', 'IR-3', 'IR-4', 'IR-6', 'IR-8'],
        'ISO27001': ['A.16.1.1', 'A.16.1.2', 'A.16.1.3'],
        'SOC2': ['CC7.2', 'CC7.3', 'CC7.4'],
        'CIS': ['CIS 6', 'CIS 19']
    },
    'policy_violation': {
        'NIST_800-53': ['AC-1', 'AC-2', 'AC-3', 'AC-4'],
        'ISO27001': ['A.9.1.1', 'A.9.1.2', 'A.9.2.1'],
        'SOC2': ['CC6.1', 'CC6.2'],
        'CIS': ['CIS 1', 'CIS 5']
    },
    'configuration_change': {
        'NIST_800-53': ['CM-2', 'CM-3', 'CM-4'],
        'ISO27001': ['A.12.1.1', 'A.12.1.2'],
        'SOC2': ['CC6.1', 'CC6.2'],
        'CIS': ['CIS 2', 'CIS 3']
    },
    'data_breach': {
        'NIST_800-53': ['IR-4', 'IR-6', 'IR-8', 'SI-4'],
        'ISO27001': ['A.16.1.1', 'A.18.1.1'],
        'SOC2': ['CC7.2', 'CC7.3'],
        'CIS': ['CIS 6', 'CIS 19']
    }
}

# Severity to Compliance Impact Mapping
SEVERITY_TO_IMPACT = {
    'critical': {
        'compliance_score_delta': -10,
        'impact_level': 'critical',
        'compliance_impact': 'compliance_gap'
    },
    'high': {
        'compliance_score_delta': -5,
        'impact_level': 'high',
        'compliance_impact': 'control_degradation'
    },
    'medium': {
        'compliance_score_delta': -2,
        'impact_level': 'medium',
        'compliance_impact': 'risk_increase'
    },
    'low': {
        'compliance_score_delta': -1,
        'impact_level': 'low',
        'compliance_impact': 'evidence_update'
    },
    'info': {
        'compliance_score_delta': 0,
        'impact_level': 'low',
        'compliance_impact': 'evidence_update'
    }
}

def map_security_event_to_compliance(user_id: int, event: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Map a security event to compliance controls across all frameworks
    Returns list of mappings with impact levels
    """
    conn = get_db()
    cursor = conn.cursor()
    
    event_type = event.get('event_type', '')
    severity = event.get('severity', 'medium')
    frameworks = event.get('frameworks', ['NIST_800-53', 'ISO27001', 'SOC2', 'CIS'])
    
    mappings = []
    impact_config = SEVERITY_TO_IMPACT.get(severity, SEVERITY_TO_IMPACT['medium'])
    
    # Get control mappings for this event type
    for framework in frameworks:
        if framework in EVENT_TYPE_TO_CONTROLS.get(event_type, {}):
            control_ids = EVENT_TYPE_TO_CONTROLS[event_type][framework]
            
            for control_id in control_ids:
                # Always create mapping even if control doesn't exist yet
                # This allows us to track compliance impact even before controls are fully set up
                mapping = {
                    'control_id': control_id,
                    'framework': framework,
                    'impact_level': impact_config['impact_level'],
                    'compliance_impact': impact_config['compliance_impact'],
                    'compliance_score_delta': impact_config['compliance_score_delta']
                }
                mappings.append(mapping)
    
    conn.close()
    return mappings

def calculate_compliance_impact(user_id: int, security_event_id: int) -> Dict[str, Any]:
    """
    Calculate compliance impact of a security event
    Returns compliance score deltas per framework
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get the security event
    cursor.execute("SELECT * FROM security_events WHERE id = ?", (security_event_id,))
    event = cursor.fetchone()
    
    if not event:
        conn.close()
        return {}
    
    event_dict = dict(event)
    
    # Get compliance mappings for this event
    cursor.execute("""
        SELECT framework, control_id, impact_level, compliance_impact
        FROM security_event_compliance_mapping
        WHERE security_event_id = ?
    """, (security_event_id,))
    mappings = cursor.fetchall()
    
    # Calculate impact per framework
    framework_impacts = {}
    for mapping in mappings:
        framework = mapping['framework']
        if framework not in framework_impacts:
            framework_impacts[framework] = {
                'controls_affected': 0,
                'total_impact': 0,
                'critical_impacts': 0,
                'high_impacts': 0
            }
        
        framework_impacts[framework]['controls_affected'] += 1
        
        # Calculate impact score
        impact_delta = SEVERITY_TO_IMPACT.get(event_dict['severity'], SEVERITY_TO_IMPACT['medium'])['compliance_score_delta']
        framework_impacts[framework]['total_impact'] += impact_delta
        
        if mapping['impact_level'] == 'critical':
            framework_impacts[framework]['critical_impacts'] += 1
        elif mapping['impact_level'] == 'high':
            framework_impacts[framework]['high_impacts'] += 1
    
    conn.close()
    return framework_impacts

def update_compliance_scores_from_security_event(user_id: int, security_event_id: int):
    """
    Update compliance scores based on security event impact
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get compliance impact
    framework_impacts = calculate_compliance_impact(user_id, security_event_id)
    
    # Update compliance scores for each framework
    for framework, impact in framework_impacts.items():
        # Get current compliance score
        cursor.execute("""
            SELECT overall_score FROM compliance_score_history
            WHERE user_id = ? AND framework = ?
            ORDER BY calculated_at DESC LIMIT 1
        """, (user_id, framework))
        current_score = cursor.fetchone()
        
        base_score = current_score['overall_score'] if current_score else 100
        
        # Calculate new score (don't go below 0)
        new_score = max(0, base_score + impact['total_impact'])
        
        # Get control counts
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Implemented' THEN 1 ELSE 0 END) as implemented,
                SUM(CASE WHEN status IN ('Non-Compliant', 'Partial') THEN 1 ELSE 0 END) as gaps
            FROM controls
            WHERE user_id = ? AND frameworks LIKE ?
        """, (user_id, f'%{framework}%'))
        control_stats = cursor.fetchone()
        
        # Insert new score history
        cursor.execute("""
            INSERT INTO compliance_score_history
            (user_id, framework, overall_score, controls_implemented, controls_total, gaps_count, security_event_impact)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, framework, new_score,
            control_stats['implemented'] if control_stats else 0,
            control_stats['total'] if control_stats else 0,
            control_stats['gaps'] if control_stats else 0,
            abs(impact['total_impact'])
        ))
        
        # Create compliance alert if score dropped significantly
        if impact['total_impact'] < -5:
            cursor.execute("""
                INSERT INTO compliance_alerts
                (user_id, alert_type, severity, title, description, security_event_id, framework, compliance_score_before, compliance_score_after)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                'compliance_degradation',
                'high' if impact['total_impact'] < -10 else 'medium',
                f'Compliance Score Degraded: {framework}',
                f'Security event caused {abs(impact["total_impact"])} point drop in {framework} compliance score. {impact["controls_affected"]} controls affected.',
                security_event_id,
                framework,
                base_score,
                new_score
            ))
    
    conn.commit()
    conn.close()

def get_security_compliance_correlation(user_id: int, days: int = 30) -> Dict[str, Any]:
    """
    Get correlation metrics between security events and compliance scores
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get security events in time period
    cursor.execute("""
        SELECT 
            event_type,
            severity,
            COUNT(*) as event_count,
            AVG(CASE 
                WHEN severity = 'critical' THEN -10
                WHEN severity = 'high' THEN -5
                WHEN severity = 'medium' THEN -2
                WHEN severity = 'low' THEN -1
                ELSE 0
            END) as avg_impact
        FROM security_events
        WHERE user_id = ? AND detected_at >= datetime('now', '-' || ? || ' days')
        GROUP BY event_type, severity
    """, (user_id, days))
    
    security_metrics = cursor.fetchall()
    
    # Get compliance score trends
    cursor.execute("""
        SELECT 
            framework,
            overall_score,
            security_event_impact,
            calculated_at
        FROM compliance_score_history
        WHERE user_id = ? AND calculated_at >= datetime('now', '-' || ? || ' days')
        ORDER BY framework, calculated_at
    """, (user_id, days))
    
    compliance_trends = cursor.fetchall()
    
    # Calculate correlation
    correlation = {
        'security_events': [dict(m) for m in security_metrics],
        'compliance_trends': [dict(t) for t in compliance_trends],
        'correlation_score': 0.0  # Will be calculated
    }
    
    conn.close()
    return correlation

