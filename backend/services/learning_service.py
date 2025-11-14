"""
Self-Learning Automation Service
Learns from past events, detects patterns, and auto-generates playbooks
"""
import json
import sqlite3
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict, Counter

DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_learning_tables():
    """Ensure learning system tables exist"""
    conn = _get_db()
    cursor = conn.cursor()
    
    # Read and execute learning schema
    schema_path = Path(__file__).parent.parent / "database" / "learning_schema.sql"
    if schema_path.exists():
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
            # Execute each statement separately
            for statement in schema_sql.split(';'):
                statement = statement.strip()
                if statement:
                    try:
                        cursor.execute(statement)
                    except sqlite3.OperationalError as e:
                        # Table might already exist
                        if "already exists" not in str(e).lower():
                            print(f"Warning: {e}")
    
    conn.commit()
    conn.close()


def _safe_json_loads(value: Optional[str]) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


def _create_pattern_signature(conditions: Dict[str, Any]) -> str:
    """Create unique hash signature for pattern conditions"""
    normalized = json.dumps(conditions, sort_keys=True)
    return hashlib.sha256(normalized.encode()).hexdigest()


def analyze_remediation_patterns(user_id: int, days_back: int = 90) -> List[Dict[str, Any]]:
    """
    Analyze historical remediation data to discover patterns
    Returns list of discovered patterns
    """
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    cutoff_date = datetime.now() - timedelta(days=days_back)
    
    # Get all resolved alerts with their activity logs
    cursor.execute("""
        SELECT 
            a.id as alert_id,
            a.control_id,
            a.severity,
            a.alert_type,
            a.status,
            a.resolved_at,
            a.resolved_by,
            a.resolution_metadata,
            c.priority,
            c.category,
            c.frameworks
        FROM compliance_alerts a
        LEFT JOIN controls c ON a.control_id = c.id AND a.user_id = c.user_id
        WHERE a.user_id = ? 
        AND a.status = 'resolved'
        AND a.resolved_at IS NOT NULL
        AND datetime(a.resolved_at) >= datetime(?)
        ORDER BY a.resolved_at DESC
    """, (user_id, cutoff_date.isoformat()))
    
    resolved_alerts = cursor.fetchall()
    
    # Get activity logs for these alerts
    alert_ids = [row['alert_id'] for row in resolved_alerts]
    if not alert_ids:
        conn.close()
        return []
    
    placeholders = ','.join(['?'] * len(alert_ids))
    cursor.execute(f"""
        SELECT 
            alert_id,
            event_type,
            status,
            notes,
            actions_taken,
            evidence_links,
            metadata_json,
            created_at
        FROM alert_activity_log
        WHERE alert_id IN ({placeholders})
        ORDER BY alert_id, created_at
    """, alert_ids)
    
    activity_logs = cursor.fetchall()
    
    # Group activities by alert
    activities_by_alert = defaultdict(list)
    for log in activity_logs:
        activities_by_alert[log['alert_id']].append(dict(log))
    
    # Analyze patterns
    patterns = []
    pattern_groups = defaultdict(list)
    
    for alert in resolved_alerts:
        alert_dict = dict(alert)
        activities = activities_by_alert.get(alert_dict['alert_id'], [])
        
        # Create pattern signature from conditions
        conditions = {
            'control_id': alert_dict.get('control_id'),
            'severity': alert_dict.get('severity'),
            'alert_type': alert_dict.get('alert_type'),
            'priority': alert_dict.get('priority'),
            'category': alert_dict.get('category'),
        }
        
        signature = _create_pattern_signature(conditions)
        
        # Extract remediation steps from activities
        steps = []
        evidence_collected = []
        actions_taken = []
        
        for activity in activities:
            if activity.get('actions_taken'):
                actions = _safe_json_loads(activity['actions_taken']) or []
                actions_taken.extend(actions)
            
            if activity.get('evidence_links'):
                evidence = _safe_json_loads(activity['evidence_links']) or []
                evidence_collected.extend(evidence)
            
            if activity.get('event_type') in ['remediation_started', 'step_completed', 'evidence_collected']:
                steps.append({
                    'action': activity.get('event_type'),
                    'notes': activity.get('notes'),
                    'timestamp': activity.get('created_at'),
                })
        
        # Calculate resolution time
        if alert_dict.get('resolved_at'):
            resolved_at = datetime.fromisoformat(alert_dict['resolved_at'].replace('Z', '+00:00'))
            created_at = datetime.fromisoformat(alert_dict.get('created_at', resolved_at.isoformat()).replace('Z', '+00:00'))
            resolution_time = (resolved_at - created_at).total_seconds() / 60  # minutes
        else:
            resolution_time = None
        
        pattern_groups[signature].append({
            'alert': alert_dict,
            'activities': activities,
            'steps': steps,
            'evidence_collected': evidence_collected,
            'actions_taken': actions_taken,
            'resolution_time': resolution_time,
            'success': alert_dict.get('status') == 'resolved',
        })
    
    # Create patterns from groups (patterns that occurred multiple times)
    for signature, occurrences in pattern_groups.items():
        if len(occurrences) < 2:  # Need at least 2 occurrences to be a pattern
            continue
        
        successful = [o for o in occurrences if o['success']]
        success_rate = len(successful) / len(occurrences) if occurrences else 0
        
        # Calculate average resolution time
        resolution_times = [o['resolution_time'] for o in occurrences if o['resolution_time']]
        avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else None
        
        # Find most common steps
        all_steps = []
        for occ in occurrences:
            all_steps.extend(occ['steps'])
        
        # Extract common evidence requirements
        all_evidence = []
        for occ in occurrences:
            all_evidence.extend(occ['evidence_collected'])
        evidence_requirements = list(set(all_evidence))
        
        # Extract common actions
        all_actions = []
        for occ in occurrences:
            all_actions.extend(occ['actions_taken'])
        common_actions = [action for action, count in Counter(all_actions).most_common(5)]
        
        # Get first occurrence for pattern details
        first_occ = occurrences[0]
        conditions = {
            'control_id': first_occ['alert'].get('control_id'),
            'severity': first_occ['alert'].get('severity'),
            'alert_type': first_occ['alert'].get('alert_type'),
            'priority': first_occ['alert'].get('priority'),
            'category': first_occ['alert'].get('category'),
        }
        
        # Create pattern steps from most common sequence
        pattern_steps = []
        if all_steps:
            # Group steps by action type and take most common
            step_types = Counter([s.get('action') for s in all_steps])
            for step_type, count in step_types.most_common():
                if count >= len(occurrences) * 0.5:  # Appears in at least 50% of cases
                    pattern_steps.append({
                        'action': step_type,
                        'order': len(pattern_steps) + 1,
                        'frequency': count / len(occurrences),
                    })
        
        # Get related controls
        related_controls = list(set([
            occ['alert'].get('control_id') 
            for occ in occurrences 
            if occ['alert'].get('control_id')
        ]))
        
        pattern = {
            'pattern_name': f"Auto Pattern: {first_occ['alert'].get('category', 'Unknown')} - {first_occ['alert'].get('severity', 'Unknown')}",
            'pattern_type': 'control_remediation',
            'trigger_conditions': conditions,
            'pattern_signature': signature,
            'success_rate': success_rate,
            'usage_count': len(occurrences),
            'avg_resolution_time_minutes': int(avg_resolution_time) if avg_resolution_time else None,
            'last_successful_use': max([o['alert'].get('resolved_at') for o in successful]) if successful else None,
            'pattern_steps': pattern_steps,
            'evidence_requirements': evidence_requirements,
            'automation_opportunities': common_actions,
            'related_controls': related_controls,
            'confidence_score': min(1.0, len(occurrences) / 10.0),  # More occurrences = higher confidence
        }
        
        patterns.append(pattern)
    
    conn.close()
    return patterns


def save_learned_pattern(user_id: int, pattern: Dict[str, Any]) -> int:
    """Save a learned pattern to the database"""
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    # Check if pattern already exists
    cursor.execute("""
        SELECT id FROM learned_remediation_patterns
        WHERE user_id = ? AND pattern_signature = ?
    """, (user_id, pattern['pattern_signature']))
    
    existing = cursor.fetchone()
    
    if existing:
        # Update existing pattern
        cursor.execute("""
            UPDATE learned_remediation_patterns
            SET pattern_name = ?,
                success_rate = ?,
                usage_count = ?,
                avg_resolution_time_minutes = ?,
                last_successful_use = ?,
                pattern_steps = ?,
                evidence_requirements = ?,
                automation_opportunities = ?,
                related_controls = ?,
                confidence_score = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            pattern['pattern_name'],
            pattern['success_rate'],
            pattern['usage_count'],
            pattern.get('avg_resolution_time_minutes'),
            pattern.get('last_successful_use'),
            json.dumps(pattern['pattern_steps']),
            json.dumps(pattern.get('evidence_requirements', [])),
            json.dumps(pattern.get('automation_opportunities', [])),
            json.dumps(pattern.get('related_controls', [])),
            pattern['confidence_score'],
            existing['id']
        ))
        pattern_id = existing['id']
    else:
        # Insert new pattern
        cursor.execute("""
            INSERT INTO learned_remediation_patterns
            (user_id, pattern_name, pattern_type, trigger_conditions, pattern_signature,
             success_rate, usage_count, avg_resolution_time_minutes, last_successful_use,
             pattern_steps, evidence_requirements, automation_opportunities, related_controls, confidence_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            pattern['pattern_name'],
            pattern['pattern_type'],
            json.dumps(pattern['trigger_conditions']),
            pattern['pattern_signature'],
            pattern['success_rate'],
            pattern['usage_count'],
            pattern.get('avg_resolution_time_minutes'),
            pattern.get('last_successful_use'),
            json.dumps(pattern['pattern_steps']),
            json.dumps(pattern.get('evidence_requirements', [])),
            json.dumps(pattern.get('automation_opportunities', [])),
            json.dumps(pattern.get('related_controls', [])),
            pattern['confidence_score']
        ))
        pattern_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    return pattern_id


def generate_playbook_from_pattern(user_id: int, pattern_id: int) -> Dict[str, Any]:
    """Generate an auto-playbook from a learned pattern"""
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM learned_remediation_patterns
        WHERE id = ? AND user_id = ?
    """, (pattern_id, user_id))
    
    pattern_row = cursor.fetchone()
    if not pattern_row:
        conn.close()
        return None
    
    pattern = dict(pattern_row)
    trigger_conditions = _safe_json_loads(pattern['trigger_conditions'])
    pattern_steps = _safe_json_loads(pattern['pattern_steps']) or []
    evidence_requirements = _safe_json_loads(pattern['evidence_requirements']) or []
    
    # Convert pattern steps to playbook steps
    playbook_steps = []
    for idx, step in enumerate(pattern_steps, 1):
        playbook_steps.append({
            'id': f"step_{idx}",
            'order': idx,
            'action': step.get('action', 'manual_action'),
            'description': step.get('notes', f"Step {idx}"),
            'required': step.get('frequency', 1.0) >= 0.8,  # Required if appears in 80%+ of cases
            'estimated_minutes': 15,  # Default estimate
            'automation_ready': step.get('action') in ['evidence_collected', 'status_updated'],
        })
    
    # Determine automation level
    automation_ready_steps = sum(1 for s in playbook_steps if s.get('automation_ready'))
    if automation_ready_steps == len(playbook_steps):
        automation_level = 'fully_automated'
    elif automation_ready_steps > 0:
        automation_level = 'semi_automated'
    else:
        automation_level = 'manual'
    
    playbook = {
        'playbook_name': f"Auto: {pattern['pattern_name']}",
        'source_pattern_id': pattern_id,
        'playbook_type': 'remediation',
        'description': f"Auto-generated playbook from {pattern['usage_count']} successful remediations. Success rate: {pattern['success_rate']*100:.0f}%",
        'trigger_conditions': trigger_conditions,
        'steps': playbook_steps,
        'estimated_time_minutes': pattern.get('avg_resolution_time_minutes') or 60,
        'automation_level': automation_level,
        'success_metrics': {
            'success_rate': pattern['success_rate'],
            'avg_time_minutes': pattern.get('avg_resolution_time_minutes'),
            'usage_count': pattern['usage_count'],
        },
        'status': 'draft',
        'approval_status': 'pending',
    }
    
    conn.close()
    return playbook


def save_auto_playbook(user_id: int, playbook: Dict[str, Any]) -> int:
    """Save an auto-generated playbook"""
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO auto_generated_playbooks
        (user_id, playbook_name, source_pattern_id, playbook_type, description,
         trigger_conditions, steps, estimated_time_minutes, automation_level,
         success_metrics, status, approval_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        playbook['playbook_name'],
        playbook.get('source_pattern_id'),
        playbook['playbook_type'],
        playbook.get('description'),
        json.dumps(playbook['trigger_conditions']),
        json.dumps(playbook['steps']),
        playbook.get('estimated_time_minutes'),
        playbook.get('automation_level'),
        json.dumps(playbook.get('success_metrics', {})),
        playbook.get('status', 'draft'),
        playbook.get('approval_status', 'pending'),
    ))
    
    playbook_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return playbook_id


def get_learned_patterns(user_id: int, min_confidence: float = 0.3) -> List[Dict[str, Any]]:
    """Get all learned patterns for a user"""
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM learned_remediation_patterns
        WHERE user_id = ? AND confidence_score >= ?
        ORDER BY success_rate DESC, usage_count DESC
    """, (user_id, min_confidence))
    
    patterns = []
    for row in cursor.fetchall():
        pattern = dict(row)
        pattern['trigger_conditions'] = _safe_json_loads(pattern['trigger_conditions'])
        pattern['pattern_steps'] = _safe_json_loads(pattern['pattern_steps']) or []
        pattern['evidence_requirements'] = _safe_json_loads(pattern['evidence_requirements']) or []
        pattern['automation_opportunities'] = _safe_json_loads(pattern['automation_opportunities']) or []
        pattern['related_controls'] = _safe_json_loads(pattern['related_controls']) or []
        patterns.append(pattern)
    
    conn.close()
    return patterns


def get_auto_playbooks(user_id: int, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get auto-generated playbooks"""
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    if status:
        cursor.execute("""
            SELECT * FROM auto_generated_playbooks
            WHERE user_id = ? AND status = ?
            ORDER BY created_at DESC
        """, (user_id, status))
    else:
        cursor.execute("""
            SELECT * FROM auto_generated_playbooks
            WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,))
    
    playbooks = []
    for row in cursor.fetchall():
        playbook = dict(row)
        playbook['trigger_conditions'] = _safe_json_loads(playbook['trigger_conditions'])
        playbook['steps'] = _safe_json_loads(playbook['steps']) or []
        playbook['success_metrics'] = _safe_json_loads(playbook['success_metrics']) or {}
        playbooks.append(playbook)
    
    conn.close()
    return playbooks


def track_data_usage(user_id: int, data_type: str, data_id: str, usage_type: str, 
                     usage_context: Optional[Dict[str, Any]] = None,
                     impact_metrics: Optional[Dict[str, Any]] = None) -> None:
    """Track how data is being used to show value"""
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    # Check if usage already exists
    cursor.execute("""
        SELECT id, usage_count FROM data_value_tracking
        WHERE user_id = ? AND data_type = ? AND data_id = ? AND usage_type = ?
    """, (user_id, data_type, data_id, usage_type))
    
    existing = cursor.fetchone()
    
    if existing:
        # Update existing
        new_count = existing['usage_count'] + 1
        cursor.execute("""
            UPDATE data_value_tracking
            SET usage_count = ?,
                usage_context = ?,
                impact_metrics = ?,
                last_used = CURRENT_TIMESTAMP,
                value_score = LEAST(1.0, value_score + 0.1)
            WHERE id = ?
        """, (
            new_count,
            json.dumps(usage_context) if usage_context else None,
            json.dumps(impact_metrics) if impact_metrics else None,
            existing['id']
        ))
    else:
        # Insert new
        cursor.execute("""
            INSERT INTO data_value_tracking
            (user_id, data_type, data_id, data_source, usage_type, usage_context, impact_metrics, value_score, usage_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0.1, 1)
        """, (
            user_id,
            data_type,
            data_id,
            None,  # data_source can be determined later
            usage_type,
            json.dumps(usage_context) if usage_context else None,
            json.dumps(impact_metrics) if impact_metrics else None,
        ))
    
    conn.commit()
    conn.close()


def get_data_value_summary(user_id: int) -> Dict[str, Any]:
    """Get summary of how data is being used and its value"""
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            data_type,
            COUNT(*) as total_items,
            SUM(usage_count) as total_uses,
            AVG(value_score) as avg_value_score,
            SUM(CASE WHEN usage_count > 0 THEN 1 ELSE 0 END) as items_with_usage
        FROM data_value_tracking
        WHERE user_id = ?
        GROUP BY data_type
    """, (user_id,))
    
    by_type = {}
    total_items = 0
    total_uses = 0
    
    for row in cursor.fetchall():
        by_type[row['data_type']] = {
            'total_items': row['total_items'],
            'total_uses': row['total_uses'],
            'avg_value_score': row['avg_value_score'] or 0,
            'items_with_usage': row['items_with_usage'],
            'utilization_rate': row['items_with_usage'] / row['total_items'] if row['total_items'] > 0 else 0,
        }
        total_items += row['total_items']
        total_uses += row['total_uses']
    
    # Get top valuable data items
    cursor.execute("""
        SELECT data_type, data_id, usage_count, value_score, usage_type
        FROM data_value_tracking
        WHERE user_id = ?
        ORDER BY value_score DESC, usage_count DESC
        LIMIT 20
    """, (user_id,))
    
    top_items = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        'by_type': by_type,
        'total_items_tracked': total_items,
        'total_uses': total_uses,
        'top_valuable_items': top_items,
        'overall_utilization': total_uses / total_items if total_items > 0 else 0,
    }


def learn_from_event(user_id: int, event_type: str, event_source_type: str, 
                     event_source_id: int, event_data: Dict[str, Any],
                     outcome: Optional[str] = None, outcome_data: Optional[Dict[str, Any]] = None) -> None:
    """Record an event for learning and trigger pattern analysis if needed"""
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    # Save event to learning log
    cursor.execute("""
        INSERT INTO event_learning_log
        (user_id, event_type, event_source_id, event_source_type, event_data, outcome, outcome_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        event_type,
        event_source_id,
        event_source_type,
        json.dumps(event_data),
        outcome,
        json.dumps(outcome_data) if outcome_data else None,
    ))
    
    conn.commit()
    conn.close()
    
    # Track data usage
    track_data_usage(
        user_id=user_id,
        data_type=event_source_type,
        data_id=str(event_source_id),
        usage_type='event_learning',
        usage_context={'event_type': event_type},
        impact_metrics={'events_learned': 1}
    )
    
    # If this is a successful remediation, trigger pattern analysis
    if event_type == 'remediation_completed' and outcome == 'success':
        # Run pattern analysis in background (for now, just mark for analysis)
        # In production, this would be async
        pass


def find_matching_playbooks(user_id: int, alert_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Find playbooks that match an alert's conditions
    Returns list of matching playbooks sorted by confidence
    """
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    # Extract conditions from alert
    conditions = {
        'control_id': alert_data.get('control_id'),
        'severity': alert_data.get('severity'),
        'alert_type': alert_data.get('alert_type'),
    }
    
    # Get control details if control_id exists
    if conditions.get('control_id'):
        cursor.execute("""
            SELECT priority, category, frameworks
            FROM controls
            WHERE id = ? AND user_id = ?
        """, (conditions['control_id'], user_id))
        control_row = cursor.fetchone()
        if control_row:
            conditions['priority'] = control_row['priority']
            conditions['category'] = control_row['category']
    
    # Find matching playbooks
    cursor.execute("""
        SELECT * FROM auto_generated_playbooks
        WHERE user_id = ? AND status = 'active' AND approval_status = 'approved'
        ORDER BY usage_count DESC, created_at DESC
    """, (user_id,))
    
    matching_playbooks = []
    for row in cursor.fetchall():
        playbook = dict(row)
        trigger_conditions = _safe_json_loads(playbook['trigger_conditions']) or {}
        
        # Calculate match score
        match_score = 0.0
        total_conditions = 0
        
        for key, value in trigger_conditions.items():
            total_conditions += 1
            if key in conditions and conditions[key]:
                if conditions[key] == value:
                    match_score += 1.0
                elif isinstance(value, str) and isinstance(conditions[key], str):
                    # Partial match (e.g., category contains)
                    if value.lower() in conditions[key].lower() or conditions[key].lower() in value.lower():
                        match_score += 0.5
        
        if total_conditions > 0:
            confidence = match_score / total_conditions
            if confidence >= 0.3:  # At least 30% match
                playbook['trigger_conditions'] = trigger_conditions
                playbook['steps'] = _safe_json_loads(playbook['steps']) or []
                playbook['success_metrics'] = _safe_json_loads(playbook['success_metrics']) or {}
                playbook['match_confidence'] = confidence
                playbook['match_reason'] = f"Matches {int(confidence * 100)}% of trigger conditions"
                matching_playbooks.append(playbook)
    
    conn.close()
    
    # Sort by match confidence and success rate
    matching_playbooks.sort(key=lambda p: (
        p['match_confidence'],
        p['success_metrics'].get('success_rate', 0),
        p['usage_count']
    ), reverse=True)
    
    return matching_playbooks[:5]  # Return top 5 matches


def find_patterns_for_control(user_id: int, control_id: str) -> List[Dict[str, Any]]:
    """
    Find learned patterns that apply to a specific control
    """
    _ensure_learning_tables()
    conn = _get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM learned_remediation_patterns
        WHERE user_id = ? AND confidence_score >= 0.3
        ORDER BY success_rate DESC, usage_count DESC
    """, (user_id,))
    
    matching_patterns = []
    for row in cursor.fetchall():
        pattern = dict(row)
        trigger_conditions = _safe_json_loads(pattern['trigger_conditions']) or {}
        
        # Check if pattern matches this control
        if trigger_conditions.get('control_id') == control_id:
            pattern['trigger_conditions'] = trigger_conditions
            pattern['pattern_steps'] = _safe_json_loads(pattern['pattern_steps']) or []
            pattern['evidence_requirements'] = _safe_json_loads(pattern['evidence_requirements']) or []
            pattern['automation_opportunities'] = _safe_json_loads(pattern['automation_opportunities']) or []
            pattern['related_controls'] = _safe_json_loads(pattern['related_controls']) or []
            matching_patterns.append(pattern)
    
    conn.close()
    return matching_patterns


def run_learning_cycle(user_id: int) -> Dict[str, Any]:
    """
    Run a complete learning cycle:
    1. Analyze historical data for patterns
    2. Generate playbooks from patterns
    3. Return summary of what was learned
    """
    _ensure_learning_tables()
    
    # Analyze patterns
    patterns = analyze_remediation_patterns(user_id, days_back=90)
    
    # Save patterns
    saved_patterns = []
    for pattern in patterns:
        pattern_id = save_learned_pattern(user_id, pattern)
        saved_patterns.append(pattern_id)
    
    # Generate playbooks from high-confidence patterns
    generated_playbooks = []
    for pattern in patterns:
        if pattern['confidence_score'] >= 0.5 and pattern['success_rate'] >= 0.7:
            playbook = generate_playbook_from_pattern(user_id, pattern.get('id') or saved_patterns[len(generated_playbooks)])
            if playbook:
                playbook_id = save_auto_playbook(user_id, playbook)
                generated_playbooks.append(playbook_id)
    
    return {
        'patterns_discovered': len(patterns),
        'patterns_saved': len(saved_patterns),
        'playbooks_generated': len(generated_playbooks),
        'high_confidence_patterns': len([p for p in patterns if p['confidence_score'] >= 0.7]),
        'high_success_patterns': len([p for p in patterns if p['success_rate'] >= 0.8]),
    }

