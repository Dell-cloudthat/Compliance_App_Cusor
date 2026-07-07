"""
Permissions, vendor-access, and permission audit-log routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services.iam_service import (
    check_permission, create_audit_log, get_user_permissions,
)

router = APIRouter()

# IAM Models
class PermissionGrant(BaseModel):
    user_id: int
    vendor_id: Optional[int] = None
    resource_type: str  # 'control', 'audit', 'report', 'evidence', 'all'
    resource_id: Optional[str] = None
    permission_type: str  # 'read', 'write', 'execute', 'delete'
    expires_at: Optional[str] = None
    approval_required: bool = False
    metadata: Optional[Dict[str, Any]] = None

class PermissionRevoke(BaseModel):
    permission_id: int
    reason: str

class PermissionCheck(BaseModel):
    user_id: int
    resource_type: str
    resource_id: Optional[str] = None
    permission_type: str

class VendorAccessProfileCreate(BaseModel):
    vendor_id: Optional[int] = None
    vendor_name: str
    profile_name: str
    entity_id: Optional[int] = None
    scope: Dict[str, Any]  # {"controls": [...], "frameworks": [...], "audits": [...]}
    permissions: Dict[str, List[str]]  # {"controls": ["read"], "audits": ["read", "write"]}
    access_expires_at: Optional[str] = None
    auto_renew: bool = False

class VendorUserAssign(BaseModel):
    vendor_access_profile_id: int
    vendor_user_id: int
    expires_at: Optional[str] = None



class ApprovalWorkflowRequest(BaseModel):
    resource_type: str
    resource_id: Optional[str] = None
    permission_type: str
    reason: str

class ApprovalWorkflowResponse(BaseModel):
    workflow_id: int
    approver_id: Optional[int] = None
    status: str
    reason: Optional[str] = None


@router.post("/api/permissions/grant")
async def grant_permission(permission: PermissionGrant, user_id: int = Depends(get_current_user), request: Request = None):
    """Grant permission to a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if grantor has permission to grant permissions (admin check)
    # First, check if user has admin role
    cursor.execute("SELECT role_name FROM user_roles WHERE user_id = ? AND role_name = 'Admin'", (user_id,))
    has_admin_role = cursor.fetchone()
    
    # If no admin role, check permission system
    if not has_admin_role:
        allowed, reason = check_permission(user_id, "all", None, "write")
        if not allowed:
            # Check if this is the first user (bootstrap admin)
            cursor.execute("SELECT COUNT(*) as count FROM users")
            user_count = cursor.fetchone()['count']
            if user_count <= 1:
                # First user automatically gets admin
                cursor.execute("INSERT OR IGNORE INTO user_roles (user_id, role_name) VALUES (?, 'Admin')", (user_id,))
                conn.commit()
            else:
                raise HTTPException(status_code=403, detail="Insufficient permissions to grant access. Admin role required.")
    
    # Get IP and user agent
    ip_address = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    
    # Insert permission
    expires_at = permission.expires_at if permission.expires_at else None
    metadata_json = json.dumps(permission.metadata) if permission.metadata else None
    
    cursor.execute("""
        INSERT INTO user_permissions 
        (user_id, resource_type, resource_id, permission_type, granted_by, expires_at, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        permission.user_id, permission.resource_type, permission.resource_id,
        permission.permission_type, user_id, expires_at, metadata_json
    ))
    
    perm_id = cursor.lastrowid
    conn.commit()
    
    # Create audit log
    create_audit_log(
        event_type="grant",
        user_id=permission.user_id,
        granted_by=user_id,
        resource_type=permission.resource_type,
        resource_id=permission.resource_id,
        permission_type=permission.permission_type,
        permission_id=perm_id,
        ip_address=ip_address,
        user_agent=user_agent,
        new_permissions={"resource_type": permission.resource_type, "permission_type": permission.permission_type}
    )
    
    conn.close()
    return {"id": perm_id, "message": "Permission granted successfully"}

@router.post("/api/permissions/revoke")
async def revoke_permission(revoke: PermissionRevoke, user_id: int = Depends(get_current_user), request: Request = None):
    """Revoke a permission"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if grantor has permission
    allowed, reason = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get permission before deleting
    cursor.execute("SELECT * FROM user_permissions WHERE id = ?", (revoke.permission_id,))
    perm = cursor.fetchone()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    perm_dict = dict(perm)
    
    # Delete permission
    cursor.execute("DELETE FROM user_permissions WHERE id = ?", (revoke.permission_id,))
    conn.commit()
    
    # Create audit log
    ip_address = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    
    create_audit_log(
        event_type="revoke",
        user_id=perm_dict['user_id'],
        granted_by=user_id,
        resource_type=perm_dict['resource_type'],
        resource_id=perm_dict['resource_id'],
        permission_type=perm_dict['permission_type'],
        permission_id=revoke.permission_id,
        ip_address=ip_address,
        user_agent=user_agent,
        previous_permissions=perm_dict,
        metadata={"reason": revoke.reason}
    )
    
    conn.close()
    return {"message": "Permission revoked successfully"}

@router.post("/api/permissions/check")
async def check_user_permission(check: PermissionCheck):
    """Check if user has permission"""
    allowed, reason = check_permission(check.user_id, check.resource_type, check.resource_id, check.permission_type)
    return {"allowed": allowed, "reason": reason}

@router.get("/api/permissions/user/{target_user_id}")
async def list_user_permissions(target_user_id: int, user_id: int = Depends(get_current_user)):
    """List all permissions for a user (requires admin or self)"""
    # Check if user is viewing their own permissions or is admin
    if target_user_id != user_id:
        allowed, _ = check_permission(user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    permissions = get_user_permissions(target_user_id)
    return permissions

@router.post("/api/permissions/bootstrap-admin")
async def bootstrap_admin(user_id: int = Depends(get_current_user)):
    """Bootstrap admin role for first user (one-time setup)"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user already has admin role
    cursor.execute("SELECT id FROM user_roles WHERE user_id = ? AND role_name = 'Admin'", (user_id,))
    if cursor.fetchone():
        conn.close()
        return {"message": "User already has admin role"}
    
    # Check if this is the first user or if no admins exist
    cursor.execute("SELECT COUNT(*) as count FROM users")
    user_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM user_roles WHERE role_name = 'Admin'")
    admin_count = cursor.fetchone()['count']
    
    if user_count <= 1 or admin_count == 0:
        # Grant admin role
        cursor.execute("INSERT INTO user_roles (user_id, role_name) VALUES (?, 'Admin')", (user_id,))
        conn.commit()
        conn.close()
        return {"message": "Admin role granted successfully"}
    else:
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot bootstrap admin: admins already exist")

@router.post("/api/vendor-access/profiles")
async def create_vendor_access_profile(profile: VendorAccessProfileCreate, user_id: int = Depends(get_current_user)):
    """Create a vendor access profile"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check admin permission
    cursor.execute("SELECT role_name FROM user_roles WHERE user_id = ? AND role_name = 'Admin'", (user_id,))
    has_admin_role = cursor.fetchone()
    
    if not has_admin_role:
        allowed, _ = check_permission(user_id, "all", None, "write")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    cursor.execute("""
        INSERT INTO vendor_access_profiles 
        (vendor_id, vendor_name, profile_name, entity_id, scope_json, permissions_json, access_expires_at, auto_renew)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        profile.vendor_id, profile.vendor_name, profile.profile_name, profile.entity_id,
        json.dumps(profile.scope), json.dumps(profile.permissions),
        profile.access_expires_at, profile.auto_renew
    ))
    
    profile_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": profile_id, "message": "Vendor access profile created successfully"}

@router.post("/api/vendor-access/assign")
async def assign_vendor_user(assign: VendorUserAssign, user_id: int = Depends(get_current_user)):
    """Assign a vendor user to an access profile"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check admin permission
    allowed, _ = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    cursor.execute("""
        INSERT INTO vendor_user_assignments 
        (vendor_access_profile_id, user_id, assigned_by, expires_at)
        VALUES (?, ?, ?, ?)
    """, (assign.vendor_access_profile_id, assign.vendor_user_id, user_id, assign.expires_at))
    
    assignment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": assignment_id, "message": "Vendor user assigned successfully"}

@router.get("/api/permissions/audit-log")
async def get_audit_log(user_id: Optional[int] = None, vendor_id: Optional[int] = None,
                       start_date: Optional[str] = None, end_date: Optional[str] = None,
                       event_type: Optional[str] = None,
                       current_user_id: int = Depends(get_current_user)):
    """Get permission audit log"""
    # Check admin permission
    allowed, _ = check_permission(current_user_id, "all", None, "read")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM permission_audit_log WHERE 1=1"
    params = []
    
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)
    
    if start_date:
        query += " AND timestamp >= ?"
        params.append(start_date)
    
    if end_date:
        query += " AND timestamp <= ?"
        params.append(end_date)
    
    if event_type:
        query += " AND event_type = ?"
        params.append(event_type)
    
    query += " ORDER BY timestamp DESC LIMIT 1000"
    
    cursor.execute(query, params)
    logs = cursor.fetchall()
    conn.close()
    
    result = []
    for log in logs:
        log_dict = dict(log)
        log_dict['previous_permissions'] = json.loads(log_dict['previous_permissions']) if log_dict.get('previous_permissions') else None
        log_dict['new_permissions'] = json.loads(log_dict['new_permissions']) if log_dict.get('new_permissions') else None
        log_dict['metadata_json'] = json.loads(log_dict['metadata_json']) if log_dict.get('metadata_json') else None
        result.append(log_dict)
    
    return result

# ============================================================================
# IAM Access Tracking Endpoints
# ============================================================================

