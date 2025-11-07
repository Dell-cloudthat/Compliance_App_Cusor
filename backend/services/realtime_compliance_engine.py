"""
Real-Time Compliance Engine
Continuous compliance tracking with drift detection and framework growth metrics
"""
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path
from collections import defaultdict

DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def calculate_realtime_compliance_score(user_id: int, framework: str) -> Dict[str, Any]:
    """
    Calculate real-time compliance score for a framework
    Returns comprehensive score data with drift detection
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all controls for this framework
    cursor.execute("""
        SELECT id, status, priority, category, last_updated
        FROM controls
        WHERE user_id = ? AND frameworks LIKE ?
    """, (user_id, f'%{framework}%'))
    
    controls = cursor.fetchall()
    
    if not controls:
        conn.close()
        return {
            'framework': framework,
            'overall_score': 0,
            'controls_total': 0,
            'controls_implemented': 0,
            'controls_partial': 0,
            'controls_non_compliant': 0,
            'gaps_count': 0,
            'control_coverage': 0,
            'evidence_coverage': 0,
            'drift_detected': False,
            'drift_percentage': 0,
            'score_velocity': 0,
            'calculated_at': datetime.now().isoformat()
        }
    
    # Calculate scores
    total_controls = len(controls)
    implemented = sum(1 for c in controls if c['status'] == 'Implemented' or c['status'] == 'Vendor Managed')
    partial = sum(1 for c in controls if c['status'] == 'Partial')
    non_compliant = sum(1 for c in controls if c['status'] == 'Non-Compliant')
    gaps = non_compliant + partial
    
    # Score calculation: Implemented = 100%, Partial = 50%, Non-Compliant = 0%
    score = ((implemented + (partial * 0.5)) / total_controls) * 100
    
    # Check evidence coverage
    cursor.execute("""
        SELECT COUNT(DISTINCT c.id) as controls_with_evidence
        FROM controls c
        LEFT JOIN audit_evidence ae ON c.id = ae.control_id
        WHERE c.user_id = ? AND c.frameworks LIKE ? 
        AND (ae.id IS NOT NULL OR c.evidence_link IS NOT NULL)
        AND (ae.expires_at IS NULL OR ae.expires_at > datetime('now'))
    """, (user_id, f'%{framework}%'))
    
    evidence_result = cursor.fetchone()
    evidence_coverage = (evidence_result['controls_with_evidence'] / total_controls * 100) if total_controls > 0 else 0
    
    # Get baseline score (from 7 days ago or last known good)
    baseline_score = get_baseline_score(user_id, framework)
    
    # Calculate drift
    drift_detected = False
    drift_percentage = 0
    if baseline_score > 0:
        drift_percentage = ((score - baseline_score) / baseline_score) * 100
        drift_detected = abs(drift_percentage) > 5  # 5% threshold
    
    # Calculate score velocity (change per day over last 7 days)
    score_velocity = calculate_score_velocity(user_id, framework)
    
    # Get security event impact
    cursor.execute("""
        SELECT COALESCE(SUM(security_event_impact), 0) as total_impact
        FROM compliance_score_history
        WHERE user_id = ? AND framework = ? 
        AND calculated_at >= datetime('now', '-7 days')
    """, (user_id, framework))
    
    security_impact = cursor.fetchone()['total_impact'] or 0
    
    # Risk-adjusted score (penalize for recent security events)
    risk_adjusted_score = max(0, score - (security_impact * 0.1))
    
    result = {
        'framework': framework,
        'overall_score': round(score, 1),
        'risk_adjusted_score': round(risk_adjusted_score, 1),
        'controls_total': total_controls,
        'controls_implemented': implemented,
        'controls_partial': partial,
        'controls_non_compliant': non_compliant,
        'gaps_count': gaps,
        'control_coverage': round((implemented / total_controls) * 100, 1) if total_controls > 0 else 0,
        'evidence_coverage': round(evidence_coverage, 1),
        'security_impact': security_impact,
        'drift_detected': drift_detected,
        'drift_percentage': round(drift_percentage, 1),
        'score_velocity': round(score_velocity, 2),
        'baseline_score': baseline_score,
        'calculated_at': datetime.now().isoformat()
    }
    
    # Save to history
    cursor.execute("""
        INSERT INTO compliance_score_history
        (user_id, framework, overall_score, controls_implemented, controls_total, gaps_count, security_event_impact)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, framework, round(score, 1), implemented, total_controls, gaps, security_impact
    ))
    
    conn.commit()
    conn.close()
    
    return result

def get_baseline_score(user_id: int, framework: str) -> float:
    """Get baseline score (7 days ago or last known good score)"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Try to get score from 7 days ago
    cursor.execute("""
        SELECT overall_score FROM compliance_score_history
        WHERE user_id = ? AND framework = ?
        AND calculated_at <= datetime('now', '-7 days')
        ORDER BY calculated_at DESC LIMIT 1
    """, (user_id, framework))
    
    result = cursor.fetchone()
    if result:
        conn.close()
        return result['overall_score']
    
    # If no 7-day old score, get most recent score as baseline
    cursor.execute("""
        SELECT overall_score FROM compliance_score_history
        WHERE user_id = ? AND framework = ?
        ORDER BY calculated_at DESC LIMIT 1
    """, (user_id, framework))
    
    result = cursor.fetchone()
    baseline = result['overall_score'] if result else 100.0  # Default to 100 if no history
    
    conn.close()
    return baseline

def calculate_score_velocity(user_id: int, framework: str, days: int = 7) -> float:
    """Calculate score change per day over specified period"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT overall_score, calculated_at
        FROM compliance_score_history
        WHERE user_id = ? AND framework = ?
        AND calculated_at >= datetime('now', '-' || ? || ' days')
        ORDER BY calculated_at ASC
    """, (user_id, framework, days))
    
    scores = cursor.fetchall()
    conn.close()
    
    if len(scores) < 2:
        return 0.0
    
    first_score = scores[0]['overall_score']
    last_score = scores[-1]['overall_score']
    first_date = datetime.fromisoformat(scores[0]['calculated_at'].replace(' ', 'T'))
    last_date = datetime.fromisoformat(scores[-1]['calculated_at'].replace(' ', 'T'))
    
    days_diff = (last_date - first_date).days
    if days_diff == 0:
        return 0.0
    
    velocity = (last_score - first_score) / days_diff
    return velocity

def get_framework_growth_metrics(user_id: int, framework: str, period_days: int = 30) -> Dict[str, Any]:
    """
    Get comprehensive growth metrics for a framework
    Used for dashboard visualization
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get current score
    current_score_data = calculate_realtime_compliance_score(user_id, framework)
    
    # Get historical data
    cursor.execute("""
        SELECT overall_score, calculated_at, controls_implemented, controls_total, gaps_count
        FROM compliance_score_history
        WHERE user_id = ? AND framework = ?
        AND calculated_at >= datetime('now', '-' || ? || ' days')
        ORDER BY calculated_at ASC
    """, (user_id, framework, period_days))
    
    history = cursor.fetchall()
    
    # Calculate trends
    trend_data = []
    for row in history:
        trend_data.append({
            'date': row['calculated_at'],
            'score': row['overall_score'],
            'controls_implemented': row['controls_implemented'],
            'controls_total': row['controls_total'],
            'gaps': row['gaps_count']
        })
    
    # Calculate growth metrics
    if len(trend_data) >= 2:
        first_score = trend_data[0]['score']
        last_score = trend_data[-1]['score']
        growth_rate = ((last_score - first_score) / first_score * 100) if first_score > 0 else 0
        
        # Calculate average velocity
        velocities = []
        for i in range(1, len(trend_data)):
            prev_score = trend_data[i-1]['score']
            curr_score = trend_data[i]['score']
            prev_date = datetime.fromisoformat(trend_data[i-1]['date'].replace(' ', 'T'))
            curr_date = datetime.fromisoformat(trend_data[i]['date'].replace(' ', 'T'))
            days = (curr_date - prev_date).days
            if days > 0:
                velocities.append((curr_score - prev_score) / days)
        
        avg_velocity = sum(velocities) / len(velocities) if velocities else 0
    else:
        growth_rate = 0
        avg_velocity = 0
    
    # Determine trend direction
    if avg_velocity > 0.5:
        trend_direction = 'improving'
    elif avg_velocity < -0.5:
        trend_direction = 'declining'
    else:
        trend_direction = 'stable'
    
    conn.close()
    
    return {
        'framework': framework,
        'current_score': current_score_data['overall_score'],
        'risk_adjusted_score': current_score_data['risk_adjusted_score'],
        'growth_rate': round(growth_rate, 1),
        'score_velocity': round(avg_velocity, 2),
        'trend_direction': trend_direction,
        'trend_data': trend_data,
        'controls_implemented': current_score_data['controls_implemented'],
        'controls_total': current_score_data['controls_total'],
        'gaps_count': current_score_data['gaps_count'],
        'control_coverage': current_score_data['control_coverage'],
        'evidence_coverage': current_score_data['evidence_coverage'],
        'drift_detected': current_score_data['drift_detected'],
        'drift_percentage': current_score_data['drift_percentage'],
        'period_days': period_days,
        'calculated_at': datetime.now().isoformat()
    }

def get_all_frameworks_growth(user_id: int, period_days: int = 30) -> Dict[str, Any]:
    """Get growth metrics for all frameworks"""
    frameworks = ['NIST_800-53', 'NIST_800-171', 'ISO27001', 'SOC2', 'CIS']
    
    results = {}
    for framework in frameworks:
        results[framework] = get_framework_growth_metrics(user_id, framework, period_days)
    
    return results

def detect_compliance_drift(user_id: int, framework: str, threshold: float = 5.0) -> Optional[Dict[str, Any]]:
    """
    Detect compliance drift and generate alert if threshold exceeded
    Returns drift alert data if drift detected, None otherwise
    """
    current_data = calculate_realtime_compliance_score(user_id, framework)
    
    if not current_data['drift_detected']:
        return None
    
    drift_amount = abs(current_data['drift_percentage'])
    if drift_amount < threshold:
        return None
    
    # Determine drift direction
    drift_direction = 'negative' if current_data['drift_percentage'] < 0 else 'positive'
    
    # Get affected controls
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, control_name, status, priority, category, frameworks, responsible_party, default_owner
        FROM controls
        WHERE user_id = ? AND frameworks LIKE ?
        AND status IN ('Non-Compliant', 'Partial')
        ORDER BY 
            CASE priority
                WHEN 'Critical' THEN 1
                WHEN 'High' THEN 2
                WHEN 'Medium' THEN 3
                ELSE 4
            END
        LIMIT 10
    """, (user_id, f'%{framework}%'))

    control_rows = cursor.fetchall()
    control_ids = [row['id'] for row in control_rows]
    responsibility_map: Dict[str, Dict[str, Any]] = {}

    if control_ids:
        placeholders = ','.join('?' for _ in control_ids)
        cursor.execute(f"""
            SELECT control_id, primary_owner, shared_responsibility, secondary_owners, data_sources, coverage_type
            FROM responsibility_matrix
            WHERE user_id = ? AND control_id IN ({placeholders})
        """, (user_id, *control_ids))

        for entry in cursor.fetchall():
            responsibility_map[entry['control_id']] = dict(entry)

    affected_controls = []
    for row in control_rows:
        control = dict(row)
        frameworks_list = []
        if control.get('frameworks'):
            try:
                frameworks_list = json.loads(control['frameworks'])
            except json.JSONDecodeError:
                frameworks_list = [control['frameworks']]
        control['frameworks'] = frameworks_list

        responsibility = responsibility_map.get(control['id'])
        if responsibility:
            control['responsible_party'] = control.get('responsible_party') or responsibility.get('primary_owner')
            control['shared_responsibility'] = bool(responsibility.get('shared_responsibility'))
            secondary = responsibility.get('secondary_owners')
            data_sources = responsibility.get('data_sources')
            try:
                control['secondary_owners'] = json.loads(secondary) if secondary else []
            except json.JSONDecodeError:
                control['secondary_owners'] = []
            try:
                control['data_sources'] = json.loads(data_sources) if data_sources else []
            except json.JSONDecodeError:
                control['data_sources'] = []
            control['coverage_type'] = responsibility.get('coverage_type')
        else:
            control['responsible_party'] = control.get('responsible_party') or control.get('default_owner')
            control['shared_responsibility'] = False
            control['secondary_owners'] = []
            control['data_sources'] = []
            control['coverage_type'] = None

        control.pop('default_owner', None)
        affected_controls.append(control)
    conn.close()
    
    return {
        'framework': framework,
        'drift_detected': True,
        'drift_percentage': current_data['drift_percentage'],
        'drift_direction': drift_direction,
        'current_score': current_data['overall_score'],
        'baseline_score': current_data['baseline_score'],
        'score_delta': current_data['overall_score'] - current_data['baseline_score'],
        'affected_controls': affected_controls,
        'gaps_count': current_data['gaps_count'],
        'severity': 'critical' if drift_amount > 15 else 'high' if drift_amount > 10 else 'medium',
        'detected_at': datetime.now().isoformat()
    }

