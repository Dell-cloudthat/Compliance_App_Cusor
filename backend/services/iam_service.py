"""
IAM Service - Permission checking and audit logging
"""
import sqlite3
import json
import hashlib
from datetime import datetime
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

