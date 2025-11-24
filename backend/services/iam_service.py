"""
IAM Service - Permission checking, audit logging, and access tracking
Enhanced with auto-mapping, session tracking, and compliance integration
"""
import sqlite3
import json
import hashlib
import secrets
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, Tuple, List
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def check_permission(user_id: int, resource_type: str, resource_id: Optional[str], permission_type: str) -> Tuple[bool, str]:
    """
    Check if user has permission to perform action
    Returns: (allowed: bool, reason: str)
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user is admin (has admin role)
    cursor.execute("SELECT role_name FROM user_roles WHERE user_id = ? AND role_name = 'Admin'", (user_id,))
    if cursor.fetchone():
        conn.close()
        return True, "Admin role"
    
    # Check direct permissions
    if resource_id:
        cursor.execute("""
            SELECT permission_type, expires_at 
            FROM user_permissions 
            WHERE user_id = ? 
            AND resource_type = ? 
            AND (resource_id = ? OR resource_id IS NULL)
            AND permission_type = ?
            AND (expires_at IS NULL OR expires_at > datetime('now'))
        """, (user_id, resource_type, resource_id, permission_type))
    else:
        cursor.execute("""
            SELECT permission_type, expires_at 
            FROM user_permissions 
            WHERE user_id = ? 
            AND resource_type = ? 
            AND resource_id IS NULL
            AND permission_type = ?
            AND (expires_at IS NULL OR expires_at > datetime('now'))
        """, (user_id, resource_type, permission_type))
    
    permission = cursor.fetchone()
    
    # Check vendor access profiles
    cursor.execute("""
        SELECT vap.permissions_json, vap.scope_json
        FROM vendor_user_assignments vua
        JOIN vendor_access_profiles vap ON vua.vendor_access_profile_id = vap.id
        WHERE vua.user_id = ? 
        AND vua.status = 'active'
        AND (vua.expires_at IS NULL OR vua.expires_at > datetime('now'))
    """, (user_id,))
    
    vendor_profile = cursor.fetchone()
    
    conn.close()
    
    if permission:
        return True, "Direct permission"
    
    if vendor_profile:
        permissions = json.loads(vendor_profile['permissions_json'])
        scope = json.loads(vendor_profile['scope_json'])
        
        # Check if resource is in scope
        if resource_type in permissions:
            allowed_perms = permissions[resource_type]
            if permission_type in allowed_perms or 'all' in allowed_perms:
                # Check scope
                if resource_type == 'control' and resource_id:
                    controls = scope.get('controls', [])
                    if resource_id in controls or 'all' in controls:
                        return True, "Vendor access profile"
                elif resource_type == 'audit' and resource_id:
                    audits = scope.get('audits', [])
                    if int(resource_id) in audits or 'all' in audits:
                        return True, "Vendor access profile"
                elif resource_type not in ['control', 'audit']:
                    return True, "Vendor access profile"
    
    return False, "Permission denied"

def create_audit_log(event_type: str, user_id: int, granted_by: int, 
                     resource_type: Optional[str] = None, resource_id: Optional[str] = None,
                     permission_type: Optional[str] = None, permission_id: Optional[int] = None,
                     ip_address: Optional[str] = None, user_agent: Optional[str] = None,
                     previous_permissions: Optional[Dict] = None, new_permissions: Optional[Dict] = None,
                     metadata: Optional[Dict] = None) -> str:
    """
    Create immutable audit log entry with hash
    Returns: log_hash
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get previous hash for chain
    cursor.execute("SELECT log_hash FROM permission_audit_log ORDER BY id DESC LIMIT 1")
    last_entry = cursor.fetchone()
    previous_hash = last_entry['log_hash'] if last_entry else "0" * 64
    
    # Create event data
    event_data = {
        "event_type": event_type,
        "user_id": user_id,
        "granted_by": granted_by,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "permission_type": permission_type,
        "timestamp": datetime.now().isoformat(),
        "previous_permissions": previous_permissions,
        "new_permissions": new_permissions,
        "metadata": metadata
    }
    
    # Create hash (previous_hash + current_event)
    event_json = json.dumps(event_data, sort_keys=True)
    hash_input = f"{previous_hash}{event_json}"
    log_hash = hashlib.sha256(hash_input.encode()).hexdigest()
    
    # Insert audit log
    cursor.execute("""
        INSERT INTO permission_audit_log 
        (log_hash, event_type, user_id, permission_id, granted_by, ip_address, user_agent,
         resource_type, resource_id, permission_type, previous_permissions, new_permissions, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        log_hash, event_type, user_id, permission_id, granted_by, ip_address, user_agent,
        resource_type, resource_id, permission_type,
        json.dumps(previous_permissions) if previous_permissions else None,
        json.dumps(new_permissions) if new_permissions else None,
        json.dumps(metadata) if metadata else None
    ))
    
    conn.commit()
    conn.close()
    
    return log_hash

def get_user_permissions(user_id: int) -> List[Dict]:
    """Get all permissions for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT up.*, u1.email as user_email, u2.email as granted_by_email
        FROM user_permissions up
        JOIN users u1 ON up.user_id = u1.id
        LEFT JOIN users u2 ON up.granted_by = u2.id
        WHERE up.user_id = ?
        AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))
        ORDER BY up.granted_at DESC
    """, (user_id,))
    
    permissions = cursor.fetchall()
    conn.close()
    
    result = []
    for perm in permissions:
        perm_dict = dict(perm)
        perm_dict['metadata_json'] = json.loads(perm_dict['metadata_json']) if perm_dict.get('metadata_json') else {}
        result.append(perm_dict)
    
    return result

def _ensure_iam_tracking_tables():
    """Ensure IAM tracking tables exist"""
    conn = get_db()
    cursor = conn.cursor()
    
    schema_path = Path(__file__).parent.parent / "database" / "iam_tracking_schema.sql"
    if schema_path.exists():
        with open(schema_path, 'r') as f:
            schema = f.read()
            cursor.executescript(schema)
            conn.commit()
    
    conn.close()

def create_login_session(user_id: int, ip_address: Optional[str] = None, 
                        user_agent: Optional[str] = None) -> str:
    """
    Create a new login session and return session token
    Auto-maps user permissions on login
    """
    _ensure_iam_tracking_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    # Generate session token
    session_token = secrets.token_urlsafe(32)
    
    # Create session
    cursor.execute("""
        INSERT INTO user_login_sessions 
        (user_id, session_token, ip_address, user_agent, login_timestamp, last_activity, status)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 'active')
    """, (user_id, session_token, ip_address, user_agent))
    
    session_id = cursor.lastrowid
    
    # Auto-map permissions on login
    auto_map_user_permissions(user_id)
    
    conn.commit()
    conn.close()
    
    return session_token

def end_login_session(session_token: str, termination_reason: str = 'logout'):
    """End a login session and calculate duration"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get session start time
    cursor.execute("""
        SELECT login_timestamp FROM user_login_sessions 
        WHERE session_token = ? AND status = 'active'
    """, (session_token,))
    session = cursor.fetchone()
    
    if session:
        login_time = datetime.fromisoformat(session['login_timestamp'].replace('Z', '+00:00'))
        logout_time = datetime.now()
        duration = int((logout_time - login_time).total_seconds())
        
        cursor.execute("""
            UPDATE user_login_sessions 
            SET logout_timestamp = datetime('now'),
                session_duration_seconds = ?,
                status = 'expired',
                termination_reason = ?
            WHERE session_token = ?
        """, (duration, termination_reason, session_token))
        
        conn.commit()
    
    conn.close()

def log_user_access(user_id: int, resource_type: str, resource_id: Optional[str],
                    action_type: str, session_token: Optional[str] = None,
                    ip_address: Optional[str] = None, user_agent: Optional[str] = None,
                    success: bool = True, failure_reason: Optional[str] = None,
                    metadata: Optional[Dict] = None, access_duration_ms: int = 0) -> int:
    """
    Log a user access event with r/w/x permission tracking
    Returns: access_log_id
    """
    _ensure_iam_tracking_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    # Get session_id from token
    session_id = None
    if session_token:
        cursor.execute("SELECT id FROM user_login_sessions WHERE session_token = ?", (session_token,))
        session = cursor.fetchone()
        if session:
            session_id = session['id']
            # Update last activity
            cursor.execute("""
                UPDATE user_login_sessions 
                SET last_activity = datetime('now')
                WHERE id = ?
            """, (session_id,))
    
    # Determine permission type from action
    permission_used = None
    if action_type in ['read', 'view', 'export', 'list']:
        permission_used = 'read'
    elif action_type in ['write', 'create', 'update', 'edit', 'modify']:
        permission_used = 'write'
    elif action_type in ['execute', 'run', 'trigger', 'start', 'stop']:
        permission_used = 'execute'
    elif action_type in ['delete', 'remove']:
        permission_used = 'delete'
    
    # Insert access log
    cursor.execute("""
        INSERT INTO user_access_logs 
        (user_id, session_id, resource_type, resource_id, action_type, permission_used,
         ip_address, user_agent, access_timestamp, access_duration_ms, success, 
         failure_reason, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
    """, (
        user_id, session_id, resource_type, resource_id, action_type, permission_used,
        ip_address, user_agent, access_duration_ms, 1 if success else 0,
        failure_reason, json.dumps(metadata) if metadata else None
    ))
    
    access_log_id = cursor.lastrowid
    
    # Update auto-mapped permissions based on successful access
    if success and permission_used:
        update_auto_mapped_permission(user_id, resource_type, resource_id, permission_used)
    
    # Update daily statistics
    update_daily_access_statistics(user_id, action_type, resource_id)
    
    conn.commit()
    conn.close()
    
    return access_log_id

def auto_map_user_permissions(user_id: int):
    """
    Automatically map all permissions a user has based on:
    - Direct permissions
    - Role-based permissions
    - Vendor access profiles
    """
    _ensure_iam_tracking_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all direct permissions
    cursor.execute("""
        SELECT resource_type, resource_id, permission_type
        FROM user_permissions
        WHERE user_id = ?
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    """, (user_id,))
    
    direct_perms = cursor.fetchall()
    
    # Get role-based permissions
    cursor.execute("""
        SELECT role_name FROM user_roles WHERE user_id = ?
    """, (user_id,))
    roles = cursor.fetchall()
    
    # Get vendor access profiles
    cursor.execute("""
        SELECT vap.permissions_json, vap.scope_json
        FROM vendor_user_assignments vua
        JOIN vendor_access_profiles vap ON vua.vendor_access_profile_id = vap.id
        WHERE vua.user_id = ? 
        AND vua.status = 'active'
        AND (vua.expires_at IS NULL OR vua.expires_at > datetime('now'))
    """, (user_id,))
    
    vendor_profiles = cursor.fetchall()
    
    # Map direct permissions
    for perm in direct_perms:
        resource_type = perm['resource_type']
        resource_id = perm['resource_id']
        perm_type = perm['permission_type']
        
        update_auto_mapped_permission(user_id, resource_type, resource_id, perm_type, 
                                      'direct_permission', None, 1.0)
    
    # Map role-based permissions (Admin gets all)
    for role in roles:
        if role['role_name'] == 'Admin':
            # Admin has full access to all resources
            update_auto_mapped_permission(user_id, 'all', None, 'read', 'role', None, 1.0)
            update_auto_mapped_permission(user_id, 'all', None, 'write', 'role', None, 1.0)
            update_auto_mapped_permission(user_id, 'all', None, 'execute', 'role', None, 1.0)
            update_auto_mapped_permission(user_id, 'all', None, 'delete', 'role', None, 1.0)
    
    # Map vendor profile permissions
    for profile in vendor_profiles:
        permissions = json.loads(profile['permissions_json'])
        scope = json.loads(profile['scope_json'])
        
        for resource_type, perm_types in permissions.items():
            if isinstance(perm_types, list):
                for perm_type in perm_types:
                    # Map to specific resources in scope
                    if resource_type == 'controls' and 'controls' in scope:
                        for control_id in scope['controls']:
                            update_auto_mapped_permission(user_id, 'control', control_id, perm_type,
                                                          'vendor_profile', None, 0.9)
                    elif resource_type == 'audits' and 'audits' in scope:
                        for audit_id in scope['audits']:
                            update_auto_mapped_permission(user_id, 'audit', str(audit_id), perm_type,
                                                          'vendor_profile', None, 0.9)
                    else:
                        update_auto_mapped_permission(user_id, resource_type, None, perm_type,
                                                      'vendor_profile', None, 0.9)
    
    conn.close()

def update_auto_mapped_permission(user_id: int, resource_type: str, resource_id: Optional[str],
                                  permission_type: str, discovered_from: str = 'observed',
                                  source_id: Optional[int] = None, confidence: float = 0.8):
    """Update or create auto-mapped permission"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if mapping exists
    cursor.execute("""
        SELECT id, observation_count, confidence_score
        FROM auto_mapped_permissions
        WHERE user_id = ? AND resource_type = ? 
        AND (resource_id = ? OR (resource_id IS NULL AND ? IS NULL))
    """, (user_id, resource_type, resource_id, resource_id))
    
    existing = cursor.fetchone()
    
    # Map permission_type to boolean flags
    read_access = 1 if permission_type == 'read' else 0
    write_access = 1 if permission_type == 'write' else 0
    execute_access = 1 if permission_type == 'execute' else 0
    delete_access = 1 if permission_type == 'delete' else 0
    
    if existing:
        # Update existing mapping
        obs_count = existing['observation_count'] + 1
        # Increase confidence with more observations (capped at 1.0)
        new_confidence = min(1.0, existing['confidence_score'] + 0.05)
        
        cursor.execute("""
            UPDATE auto_mapped_permissions
            SET read_access = read_access | ?,
                write_access = write_access | ?,
                execute_access = execute_access | ?,
                delete_access = delete_access | ?,
                last_observed_at = datetime('now'),
                observation_count = ?,
                confidence_score = ?
            WHERE id = ?
        """, (read_access, write_access, execute_access, delete_access, 
              obs_count, new_confidence, existing['id']))
    else:
        # Create new mapping
        cursor.execute("""
            INSERT INTO auto_mapped_permissions
            (user_id, resource_type, resource_id, read_access, write_access, 
             execute_access, delete_access, discovered_from, source_id, confidence_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, resource_type, resource_id, read_access, write_access,
              execute_access, delete_access, discovered_from, source_id, confidence))
    
    conn.commit()
    conn.close()

def update_daily_access_statistics(user_id: int, action_type: str, resource_id: Optional[str]):
    """Update daily access statistics"""
    conn = get_db()
    cursor = conn.cursor()
    
    today = date.today().isoformat()
    
    # Check if stats exist for today
    cursor.execute("""
        SELECT id, total_access_count, read_actions, write_actions, execute_actions,
               delete_actions, resources_accessed_json, first_access_timestamp, last_access_timestamp
        FROM user_access_statistics
        WHERE user_id = ? AND date = ?
    """, (user_id, today))
    
    stats = cursor.fetchone()
    
    # Determine action counters
    read_inc = 1 if action_type in ['read', 'view', 'export', 'list'] else 0
    write_inc = 1 if action_type in ['write', 'create', 'update', 'edit', 'modify'] else 0
    execute_inc = 1 if action_type in ['execute', 'run', 'trigger', 'start', 'stop'] else 0
    delete_inc = 1 if action_type in ['delete', 'remove'] else 0
    
    if stats:
        # Update existing stats
        resources = json.loads(stats['resources_accessed_json'] or '[]')
        if resource_id and resource_id not in resources:
            resources.append(resource_id)
        
        cursor.execute("""
            UPDATE user_access_statistics
            SET total_access_count = total_access_count + 1,
                read_actions = read_actions + ?,
                write_actions = write_actions + ?,
                execute_actions = execute_actions + ?,
                delete_actions = delete_actions + ?,
                resources_accessed_json = ?,
                last_access_timestamp = datetime('now')
            WHERE id = ?
        """, (read_inc, write_inc, execute_inc, delete_inc, 
              json.dumps(resources), stats['id']))
    else:
        # Create new stats
        resources = [resource_id] if resource_id else []
        cursor.execute("""
            INSERT INTO user_access_statistics
            (user_id, date, total_access_count, read_actions, write_actions,
             execute_actions, delete_actions, resources_accessed_json,
             first_access_timestamp, last_access_timestamp)
            VALUES (?, ?, 1, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (user_id, today, read_inc, write_inc, execute_inc, delete_inc, json.dumps(resources)))
    
    conn.commit()
    conn.close()

def get_user_access_summary(user_id: int, days: int = 30) -> Dict[str, Any]:
    """Get comprehensive access summary for a user"""
    _ensure_iam_tracking_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    # Get login sessions
    cursor.execute("""
        SELECT COUNT(*) as total_logins,
               SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_sessions,
               SUM(session_duration_seconds) as total_session_time
        FROM user_login_sessions
        WHERE user_id = ?
        AND login_timestamp >= datetime('now', '-' || ? || ' days')
    """, (user_id, days))
    
    session_stats = cursor.fetchone()
    
    # Get access logs summary
    cursor.execute("""
        SELECT COUNT(*) as total_accesses,
               SUM(CASE WHEN permission_used = 'read' THEN 1 ELSE 0 END) as read_count,
               SUM(CASE WHEN permission_used = 'write' THEN 1 ELSE 0 END) as write_count,
               SUM(CASE WHEN permission_used = 'execute' THEN 1 ELSE 0 END) as execute_count,
               SUM(CASE WHEN permission_used = 'delete' THEN 1 ELSE 0 END) as delete_count,
               COUNT(DISTINCT resource_type) as unique_resource_types,
               COUNT(DISTINCT resource_id) as unique_resources
        FROM user_access_logs
        WHERE user_id = ?
        AND access_timestamp >= datetime('now', '-' || ? || ' days')
    """, (user_id, days))
    
    access_stats = cursor.fetchone()
    
    # Get auto-mapped permissions
    cursor.execute("""
        SELECT resource_type, resource_id,
               read_access, write_access, execute_access, delete_access,
               confidence_score, observation_count
        FROM auto_mapped_permissions
        WHERE user_id = ?
        ORDER BY observation_count DESC, confidence_score DESC
    """, (user_id,))
    
    mapped_perms = cursor.fetchall()
    
    # Get daily statistics
    cursor.execute("""
        SELECT date, total_logins, total_access_count, read_actions, write_actions,
               execute_actions, delete_actions, total_session_duration_seconds
        FROM user_access_statistics
        WHERE user_id = ?
        AND date >= date('now', '-' || ? || ' days')
        ORDER BY date DESC
    """, (user_id, days))
    
    daily_stats = cursor.fetchall()
    
    conn.close()
    
    return {
        'user_id': user_id,
        'period_days': days,
        'sessions': {
            'total_logins': session_stats['total_logins'] or 0,
            'active_sessions': session_stats['active_sessions'] or 0,
            'total_session_time_seconds': session_stats['total_session_time'] or 0
        },
        'access': {
            'total_accesses': access_stats['total_accesses'] or 0,
            'read_actions': access_stats['read_count'] or 0,
            'write_actions': access_stats['write_count'] or 0,
            'execute_actions': access_stats['execute_count'] or 0,
            'delete_actions': access_stats['delete_count'] or 0,
            'unique_resource_types': access_stats['unique_resource_types'] or 0,
            'unique_resources': access_stats['unique_resources'] or 0
        },
        'mapped_permissions': [
            {
                'resource_type': p['resource_type'],
                'resource_id': p['resource_id'],
                'read': bool(p['read_access']),
                'write': bool(p['write_access']),
                'execute': bool(p['execute_access']),
                'delete': bool(p['delete_access']),
                'confidence': p['confidence_score'],
                'observation_count': p['observation_count']
            }
            for p in mapped_perms
        ],
        'daily_statistics': [
            {
                'date': d['date'],
                'logins': d['total_logins'],
                'accesses': d['total_access_count'],
                'read': d['read_actions'],
                'write': d['write_actions'],
                'execute': d['execute_actions'],
                'delete': d['delete_actions'],
                'session_time_seconds': d['total_session_duration_seconds'] or 0
            }
            for d in daily_stats
        ]
    }

def get_user_access_logs(user_id: int, limit: int = 100, 
                         resource_type: Optional[str] = None,
                         start_date: Optional[str] = None,
                         end_date: Optional[str] = None) -> List[Dict]:
    """Get access logs for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = """
        SELECT ual.*, uls.session_token
        FROM user_access_logs ual
        LEFT JOIN user_login_sessions uls ON ual.session_id = uls.id
        WHERE ual.user_id = ?
    """
    params = [user_id]
    
    if resource_type:
        query += " AND ual.resource_type = ?"
        params.append(resource_type)
    
    if start_date:
        query += " AND ual.access_timestamp >= ?"
        params.append(start_date)
    
    if end_date:
        query += " AND ual.access_timestamp <= ?"
        params.append(end_date)
    
    query += " ORDER BY ual.access_timestamp DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    logs = cursor.fetchall()
    conn.close()
    
    return [
        {
            **dict(log),
            'metadata_json': json.loads(log['metadata_json']) if log.get('metadata_json') else {}
        }
        for log in logs
    ]

def map_permissions_to_compliance(user_id: int, framework: str = 'NIST_800-53'):
    """
    Map user permissions to compliance controls (AC-2, AC-3, AC-6, etc.)
    """
    _ensure_iam_tracking_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all mapped permissions
    cursor.execute("""
        SELECT resource_type, resource_id, read_access, write_access, execute_access, delete_access
        FROM auto_mapped_permissions
        WHERE user_id = ?
    """, (user_id,))
    
    permissions = cursor.fetchall()
    
    # Map to compliance controls
    compliance_mappings = []
    
    for perm in permissions:
        # AC-2: Account Management - tracks user accounts and access
        if perm['read_access']:
            compliance_mappings.append({
                'user_id': user_id,
                'control_id': 'AC-2',
                'framework': framework,
                'permission_type': 'read',
                'resource_type': perm['resource_type'],
                'resource_id': perm['resource_id'],
                'compliance_status': 'compliant'
            })
        
        # AC-3: Access Enforcement - enforces access control policies
        if perm['read_access'] or perm['write_access'] or perm['execute_access']:
            compliance_mappings.append({
                'user_id': user_id,
                'control_id': 'AC-3',
                'framework': framework,
                'permission_type': 'read' if perm['read_access'] else ('write' if perm['write_access'] else 'execute'),
                'resource_type': perm['resource_type'],
                'resource_id': perm['resource_id'],
                'compliance_status': 'compliant'
            })
        
        # AC-6: Least Privilege - ensures users have minimum necessary access
        if perm['write_access'] or perm['execute_access'] or perm['delete_access']:
            compliance_mappings.append({
                'user_id': user_id,
                'control_id': 'AC-6',
                'framework': framework,
                'permission_type': 'write' if perm['write_access'] else ('execute' if perm['execute_access'] else 'delete'),
                'resource_type': perm['resource_type'],
                'resource_id': perm['resource_id'],
                'compliance_status': 'compliant'  # Would need additional logic to verify least privilege
            })
    
    # Insert/update compliance mappings
    for mapping in compliance_mappings:
        cursor.execute("""
            INSERT OR REPLACE INTO permission_compliance_mapping
            (user_id, control_id, framework, permission_type, resource_type, resource_id,
             compliance_status, last_verified_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (
            mapping['user_id'], mapping['control_id'], mapping['framework'],
            mapping['permission_type'], mapping['resource_type'], mapping['resource_id'],
            mapping['compliance_status']
        ))
    
    conn.commit()
    conn.close()
    
    return compliance_mappings

