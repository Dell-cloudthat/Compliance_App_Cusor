"""
Security Event Pattern Detection & Trend Analysis
Detects recurring patterns, trends, and anomalies in security events
"""
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from pathlib import Path
from collections import Counter, defaultdict

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def detect_patterns(user_id: int, lookback_days: int = 30) -> List[Dict[str, Any]]:
    """
    Detect security event patterns over the last N days
    Returns list of detected patterns
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all security events in the lookback period
    cutoff_date = (datetime.now() - timedelta(days=lookback_days)).isoformat()
    cursor.execute("""
        SELECT * FROM security_events
        WHERE user_id = ? AND detected_at >= ?
        ORDER BY detected_at DESC
    """, (user_id, cutoff_date))
    
    events = cursor.fetchall()
    
    if len(events) < 3:  # Need at least 3 events to detect patterns
        conn.close()
        return []
    
    patterns = []
    
    # Pattern 1: Recurring Event Types
    patterns.extend(_detect_recurring_event_types(events, user_id))
    
    # Pattern 2: Trend Anomalies (spikes in event frequency)
    patterns.extend(_detect_trend_anomalies(events, user_id, lookback_days))
    
    # Pattern 3: Severity Escalation Patterns
    patterns.extend(_detect_severity_escalations(events, user_id))
    
    # Pattern 4: Source Tool Patterns (repeated issues from same tool)
    patterns.extend(_detect_source_tool_patterns(events, user_id))
    
    # Pattern 5: Time-based Patterns (events at specific times)
    patterns.extend(_detect_time_based_patterns(events, user_id))
    
    conn.close()
    return patterns

def _detect_recurring_event_types(events: List, user_id: int) -> List[Dict[str, Any]]:
    """Detect if same event type occurs multiple times"""
    event_type_counts = Counter()
    event_type_details = defaultdict(list)
    
    for event in events:
        event_type = event['event_type']
        event_type_counts[event_type] += 1
        event_type_details[event_type].append({
            'id': event['id'],
            'severity': event['severity'],
            'detected_at': event['detected_at'],
            'title': event['title']
        })
    
    patterns = []
    for event_type, count in event_type_counts.items():
        if count >= 3:  # Recurring if 3+ occurrences
            details = event_type_details[event_type]
            avg_severity = _calculate_avg_severity([d['severity'] for d in details])
            
            pattern = {
                'pattern_name': f'Recurring {event_type.replace("_", " ").title()} Events',
                'pattern_type': 'recurring_event',
                'pattern_description': f'{count} occurrences of {event_type.replace("_", " ")} events in the last 30 days',
                'pattern_signature': json.dumps({
                    'event_type': event_type,
                    'occurrence_count': count,
                    'event_ids': [d['id'] for d in details]
                }),
                'confidence_score': min(0.9, 0.5 + (count * 0.1)),
                'severity': avg_severity,
                'occurrence_count': count,
                'trend_direction': 'stable' if count <= 5 else 'increasing',
                'trend_percentage': 0.0,
                'user_id': user_id
            }
            patterns.append(pattern)
    
    return patterns

def _detect_trend_anomalies(events: List, user_id: int, lookback_days: int) -> List[Dict[str, Any]]:
    """Detect spikes or anomalies in event frequency"""
    # Group events by day
    daily_counts = defaultdict(int)
    for event in events:
        event_date = datetime.fromisoformat(event['detected_at']).date()
        daily_counts[event_date] += 1
    
    if len(daily_counts) < 7:  # Need at least a week of data
        return []
    
    # Calculate average daily count
    avg_daily = sum(daily_counts.values()) / len(daily_counts)
    
    # Find days with spikes (2x average or more)
    patterns = []
    for date, count in daily_counts.items():
        if count >= avg_daily * 2 and count >= 3:
            pattern = {
                'pattern_name': f'Event Spike Detected on {date}',
                'pattern_type': 'spike_detection',
                'pattern_description': f'{count} events detected on {date} ({count/avg_daily:.1f}x average daily rate)',
                'pattern_signature': json.dumps({
                    'spike_date': date.isoformat(),
                    'event_count': count,
                    'average_daily': avg_daily,
                    'multiplier': count / avg_daily
                }),
                'confidence_score': min(0.95, 0.6 + ((count - avg_daily) / avg_daily * 0.1)),
                'severity': 'high' if count >= avg_daily * 3 else 'medium',
                'occurrence_count': count,
                'trend_direction': 'increasing',
                'trend_percentage': ((count - avg_daily) / avg_daily * 100) if avg_daily > 0 else 0,
                'user_id': user_id
            }
            patterns.append(pattern)
    
    return patterns

def _detect_severity_escalations(events: List, user_id: int) -> List[Dict[str, Any]]:
    """Detect if severity is increasing over time"""
    if len(events) < 5:
        return []
    
    severity_values = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'info': 0}
    
    # Check if recent events have higher severity
    recent_events = sorted(events, key=lambda x: x['detected_at'], reverse=True)[:10]
    older_events = sorted(events, key=lambda x: x['detected_at'], reverse=True)[10:20] if len(events) >= 20 else []
    
    if not older_events:
        return []
    
    recent_avg = sum(severity_values.get(e['severity'], 0) for e in recent_events) / len(recent_events)
    older_avg = sum(severity_values.get(e['severity'], 0) for e in older_events) / len(older_events)
    
    if recent_avg > older_avg + 0.5:  # Significant escalation
        pattern = {
            'pattern_name': 'Severity Escalation Trend',
            'pattern_type': 'trend_anomaly',
            'pattern_description': f'Average event severity increased from {older_avg:.1f} to {recent_avg:.1f} over recent period',
            'pattern_signature': json.dumps({
                'recent_avg_severity': recent_avg,
                'older_avg_severity': older_avg,
                'escalation': recent_avg - older_avg
            }),
            'confidence_score': 0.7,
            'severity': 'high' if recent_avg >= 3 else 'medium',
            'occurrence_count': len(recent_events),
            'trend_direction': 'increasing',
            'trend_percentage': ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0,
            'user_id': user_id
        }
        return [pattern]
    
    return []

def _detect_source_tool_patterns(events: List, user_id: int) -> List[Dict[str, Any]]:
    """Detect patterns from same source tool"""
    tool_counts = Counter()
    tool_events = defaultdict(list)
    
    for event in events:
        # sqlite3.Row doesn't have .get() method, use direct access with fallback
        tool = event['source_tool'] if event['source_tool'] else (event['event_source'] if event['event_source'] else 'Unknown')
        tool_counts[tool] += 1
        tool_events[tool].append(event)
    
    patterns = []
    for tool, count in tool_counts.items():
        if count >= 3:
            severities = [e['severity'] for e in tool_events[tool]]
            avg_severity = _calculate_avg_severity(severities)
            
            pattern = {
                'pattern_name': f'Recurring Issues from {tool}',
                'pattern_type': 'correlation_pattern',
                'pattern_description': f'{count} security events originated from {tool}',
                'pattern_signature': json.dumps({
                    'source_tool': tool,
                    'event_count': count,
                    'event_ids': [e['id'] for e in tool_events[tool]]
                }),
                'confidence_score': min(0.85, 0.5 + (count * 0.1)),
                'severity': avg_severity,
                'occurrence_count': count,
                'trend_direction': 'stable',
                'trend_percentage': 0.0,
                'user_id': user_id
            }
            patterns.append(pattern)
    
    return patterns

def _detect_time_based_patterns(events: List, user_id: int) -> List[Dict[str, Any]]:
    """Detect if events occur at specific times (e.g., business hours, weekends)"""
    hour_counts = defaultdict(int)
    day_of_week_counts = defaultdict(int)
    
    for event in events:
        event_dt = datetime.fromisoformat(event['detected_at'])
        hour_counts[event_dt.hour] += 1
        day_of_week_counts[event_dt.weekday()] += 1
    
    patterns = []
    
    # Check for concentrated time periods
    if hour_counts:
        max_hour = max(hour_counts.items(), key=lambda x: x[1])
        if max_hour[1] >= 3 and max_hour[1] >= sum(hour_counts.values()) * 0.3:  # 30% of events in one hour
            pattern = {
                'pattern_name': f'Time-Based Pattern: {max_hour[0]}:00 Hour',
                'pattern_type': 'correlation_pattern',
                'pattern_description': f'{max_hour[1]} events occurred during {max_hour[0]}:00 hour ({max_hour[1]/len(events)*100:.1f}% of total)',
                'pattern_signature': json.dumps({
                    'hour': max_hour[0],
                    'event_count': max_hour[1],
                    'percentage': max_hour[1]/len(events)*100
                }),
                'confidence_score': 0.65,
                'severity': 'medium',
                'occurrence_count': max_hour[1],
                'trend_direction': 'stable',
                'trend_percentage': 0.0,
                'user_id': user_id
            }
            patterns.append(pattern)
    
    return patterns

def _calculate_avg_severity(severities: List[str]) -> str:
    """Calculate average severity"""
    severity_values = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'info': 0}
    values = [severity_values.get(s, 0) for s in severities]
    avg = sum(values) / len(values) if values else 0
    
    if avg >= 3.5:
        return 'critical'
    elif avg >= 2.5:
        return 'high'
    elif avg >= 1.5:
        return 'medium'
    else:
        return 'low'

def save_patterns(user_id: int, patterns: List[Dict[str, Any]]):
    """Save detected patterns to database"""
    if not patterns:
        return
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        for pattern in patterns:
            # Check if pattern already exists
            cursor.execute("""
                SELECT id, occurrence_count FROM security_event_patterns
                WHERE user_id = ? AND pattern_signature = ?
            """, (user_id, pattern['pattern_signature']))
            
            existing = cursor.fetchone()
            
            if existing:
                # Update existing pattern
                cursor.execute("""
                    UPDATE security_event_patterns
                    SET occurrence_count = ?,
                        last_detected_at = ?,
                        confidence_score = ?,
                        trend_direction = ?,
                        trend_percentage = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (
                    pattern['occurrence_count'],
                    datetime.now().isoformat(),
                    pattern['confidence_score'],
                    pattern['trend_direction'],
                    pattern['trend_percentage'],
                    existing['id']
                ))
                pattern_id = existing['id']
            else:
                # Insert new pattern
                cursor.execute("""
                    INSERT INTO security_event_patterns
                    (user_id, pattern_name, pattern_type, pattern_description, pattern_signature,
                     confidence_score, severity, occurrence_count, trend_direction, trend_percentage,
                     first_detected_at, last_detected_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    pattern['pattern_name'],
                    pattern['pattern_type'],
                    pattern['pattern_description'],
                    pattern['pattern_signature'],
                    pattern['confidence_score'],
                    pattern['severity'],
                    pattern['occurrence_count'],
                    pattern['trend_direction'],
                    pattern['trend_percentage'],
                    datetime.now().isoformat(),
                    datetime.now().isoformat()
                ))
                pattern_id = cursor.lastrowid
                
                # Create alert for new pattern (in separate transaction)
                try:
                    _create_pattern_alert(user_id, pattern_id, pattern)
                except Exception as e:
                    # Log error but don't fail the whole operation
                    print(f"Warning: Could not create pattern alert: {e}")
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def _create_pattern_alert(user_id: int, pattern_id: int, pattern: Dict[str, Any]):
    """Create an alert for a detected pattern"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        alert_title = f"New Pattern Detected: {pattern['pattern_name']}"
        alert_description = pattern['pattern_description']
        
        cursor.execute("""
            INSERT INTO pattern_alerts
            (user_id, pattern_id, alert_type, severity, title, description, pattern_trend_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            pattern_id,
            'pattern_detected',
            pattern['severity'],
            alert_title,
            alert_description,
            json.dumps({
                'trend_direction': pattern['trend_direction'],
                'trend_percentage': pattern['trend_percentage'],
                'confidence_score': pattern['confidence_score']
            })
        ))
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_patterns(user_id: int, status: str = 'active') -> List[Dict[str, Any]]:
    """Get all patterns for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM security_event_patterns WHERE user_id = ?"
    params = [user_id]
    
    if status:
        query += " AND status = ?"
        params.append(status)
    
    query += " ORDER BY last_detected_at DESC"
    
    cursor.execute(query, params)
    patterns = cursor.fetchall()
    
    conn.close()
    return [dict(p) for p in patterns]

def get_pattern_trends(user_id: int, lookback_days: int = 30) -> Dict[str, Any]:
    """Get trend analysis for patterns"""
    conn = get_db()
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=lookback_days)).isoformat()
    
    # Get pattern statistics
    cursor.execute("""
        SELECT 
            pattern_type,
            COUNT(*) as pattern_count,
            AVG(confidence_score) as avg_confidence,
            AVG(occurrence_count) as avg_occurrences,
            SUM(CASE WHEN trend_direction = 'increasing' THEN 1 ELSE 0 END) as increasing_trends,
            SUM(CASE WHEN trend_direction = 'decreasing' THEN 1 ELSE 0 END) as decreasing_trends
        FROM security_event_patterns
        WHERE user_id = ? AND last_detected_at >= ?
        GROUP BY pattern_type
    """, (user_id, cutoff_date))
    
    stats = cursor.fetchall()
    
    # Get pattern alerts
    cursor.execute("""
        SELECT COUNT(*) as alert_count
        FROM pattern_alerts
        WHERE user_id = ? AND acknowledged = 0
    """, (user_id,))
    
    alert_count = cursor.fetchone()['alert_count']
    
    conn.close()
    
    return {
        'pattern_statistics': [dict(s) for s in stats],
        'unacknowledged_alerts': alert_count,
        'lookback_days': lookback_days
    }

