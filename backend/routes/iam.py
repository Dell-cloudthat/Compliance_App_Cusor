"""
IAM login sessions, access-log, permission mappings, and user listing routes.
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
    create_login_session, end_login_session, log_user_access,
    get_user_access_summary, get_user_access_logs, auto_map_user_permissions,
    map_permissions_to_compliance,
)

router = APIRouter()

class LoginRequest(BaseModel):
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AccessLogRequest(BaseModel):
    resource_type: str
    resource_id: Optional[str] = None
    action_type: str  # 'read', 'write', 'execute', 'delete', 'view', etc.
    session_token: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool = True
    failure_reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    access_duration_ms: int = 0

@router.post("/api/iam/login")
async def login_user(login: LoginRequest, user_id: int = Depends(get_current_user), request: Request = None):
    """Create a login session and auto-map user permissions"""
    ip_address = login.ip_address or (request.client.host if request else None)
    user_agent = login.user_agent or (request.headers.get("user-agent") if request else None)
    
    session_token = create_login_session(user_id, ip_address, user_agent)
    
    return {
        "session_token": session_token,
        "message": "Login session created, permissions auto-mapped"
    }

@router.post("/api/iam/logout")
async def logout_user(session_token: str = Header(..., alias="X-Session-Token")):
    """End a login session"""
    end_login_session(session_token, 'logout')
    return {"message": "Logged out successfully"}

@router.post("/api/iam/access-log")
async def log_access(access: AccessLogRequest, user_id: int = Depends(get_current_user), request: Request = None):
    """Log a user access event with r/w/x permission tracking"""
    ip_address = access.ip_address or (request.client.host if request else None)
    user_agent = access.user_agent or (request.headers.get("user-agent") if request else None)
    
    access_log_id = log_user_access(
        user_id=user_id,
        resource_type=access.resource_type,
        resource_id=access.resource_id,
        action_type=access.action_type,
        session_token=access.session_token,
        ip_address=ip_address,
        user_agent=user_agent,
        success=access.success,
        failure_reason=access.failure_reason,
        metadata=access.metadata,
        access_duration_ms=access.access_duration_ms
    )
    
    return {"access_log_id": access_log_id, "message": "Access logged successfully"}

@router.get("/api/iam/access-summary/{target_user_id}")
async def get_access_summary(
    target_user_id: int,
    days: int = Query(30, ge=1, le=365),
    current_user_id: int = Depends(get_current_user)
):
    """Get comprehensive access summary for a user"""
    # Check if user is viewing their own summary or is admin
    if target_user_id != current_user_id:
        allowed, _ = check_permission(current_user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    summary = get_user_access_summary(target_user_id, days)
    return summary

@router.get("/api/iam/access-logs/{target_user_id}")
async def get_access_logs(
    target_user_id: int,
    limit: int = Query(100, ge=1, le=1000),
    resource_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user_id: int = Depends(get_current_user)
):
    """Get access logs for a user"""
    # Check if user is viewing their own logs or is admin
    if target_user_id != current_user_id:
        allowed, _ = check_permission(current_user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    logs = get_user_access_logs(target_user_id, limit, resource_type, start_date, end_date)
    return logs

@router.get("/api/iam/mapped-permissions/{target_user_id}")
async def get_mapped_permissions(
    target_user_id: int,
    current_user_id: int = Depends(get_current_user)
):
    """Get auto-mapped permissions for a user with r/w/x breakdown"""
    # Check if user is viewing their own permissions or is admin
    if target_user_id != current_user_id:
        allowed, _ = check_permission(current_user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT resource_type, resource_id,
               read_access, write_access, execute_access, delete_access,
               discovered_from, source_id, confidence_score, observation_count,
               first_observed_at, last_observed_at
        FROM auto_mapped_permissions
        WHERE user_id = ?
        ORDER BY observation_count DESC, confidence_score DESC
    """, (target_user_id,))
    
    permissions = cursor.fetchall()
    conn.close()
    
    return [
        {
            'resource_type': p['resource_type'],
            'resource_id': p['resource_id'],
            'read': bool(p['read_access']),
            'write': bool(p['write_access']),
            'execute': bool(p['execute_access']),
            'delete': bool(p['delete_access']),
            'discovered_from': p['discovered_from'],
            'source_id': p['source_id'],
            'confidence_score': p['confidence_score'],
            'observation_count': p['observation_count'],
            'first_observed_at': p['first_observed_at'],
            'last_observed_at': p['last_observed_at']
        }
        for p in permissions
    ]

@router.post("/api/iam/auto-map-permissions/{target_user_id}")
async def trigger_auto_map(
    target_user_id: int,
    current_user_id: int = Depends(get_current_user)
):
    """Manually trigger auto-mapping of user permissions"""
    # Check admin permission
    allowed, _ = check_permission(current_user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    auto_map_user_permissions(target_user_id)
    return {"message": "Permissions auto-mapped successfully"}

@router.get("/api/iam/compliance-mapping/{target_user_id}")
async def get_compliance_mapping(
    target_user_id: int,
    framework: str = Query('NIST_800-53'),
    current_user_id: int = Depends(get_current_user)
):
    """Get compliance control mappings for user permissions"""
    # Check if user is viewing their own mapping or is admin
    if target_user_id != current_user_id:
        allowed, _ = check_permission(current_user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Map permissions to compliance
    map_permissions_to_compliance(target_user_id, framework)
    
    # Get mappings
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT control_id, framework, permission_type, resource_type, resource_id,
               compliance_status, last_verified_at, verification_notes
        FROM permission_compliance_mapping
        WHERE user_id = ? AND framework = ?
        ORDER BY control_id, resource_type
    """, (target_user_id, framework))
    
    mappings = cursor.fetchall()
    conn.close()
    
    return [
        {
            'control_id': m['control_id'],
            'framework': m['framework'],
            'permission_type': m['permission_type'],
            'resource_type': m['resource_type'],
            'resource_id': m['resource_id'],
            'compliance_status': m['compliance_status'],
            'last_verified_at': m['last_verified_at'],
            'verification_notes': m['verification_notes']
        }
        for m in mappings
    ]

@router.get("/api/iam/users")
async def list_all_users(
    current_user_id: int = Depends(get_current_user)
):
    """List all users with their access statistics (admin only)"""
    # Check admin permission
    allowed, _ = check_permission(current_user_id, "all", None, "read")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.role, u.created_at,
               (SELECT COUNT(*) FROM user_login_sessions WHERE user_id = u.id) as total_logins,
               (SELECT COUNT(*) FROM user_access_logs WHERE user_id = u.id) as total_accesses,
               (SELECT MAX(access_timestamp) FROM user_access_logs WHERE user_id = u.id) as last_access
        FROM users u
        ORDER BY u.created_at DESC
    """, ())
    
    users = cursor.fetchall()
    conn.close()
    
    return [dict(u) for u in users]

# ============================================================================
# Integration Endpoints - External System Integration
# ============================================================================

class IntegrationRegister(BaseModel):
    integration_type: str  # 'edr', 'network_appliance', 'identity_provider', 'cloud_platform', 'siem'
    name: str
    config: Dict[str, Any]

class EDREvent(BaseModel):
    event_type: str  # 'login', 'logout', 'file_access', 'process_execution', 'network_connection', 'privilege_escalation'
    user_identifier: Optional[str] = None
    device_identifier: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    resource_id: Optional[str] = None
    access_type: Optional[str] = None
    event_timestamp: Optional[str] = None

class NetworkApplianceLog(BaseModel):
    log_type: str  # 'authentication', 'connection', 'dns_query', 'web_proxy'
    user_identifier: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    action: Optional[str] = None
    user_agent: Optional[str] = None
    log_timestamp: Optional[str] = None

class IdentityProviderEvent(BaseModel):
    event_type: str  # 'user.login', 'user.logout', 'user.created', 'permission.granted', 'permission.revoked'
    user_identifier: Optional[str] = None
    group_identifier: Optional[str] = None
    resource_identifier: Optional[str] = None
    resource_type: Optional[str] = None
    permission_type: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    event_timestamp: Optional[str] = None

class CloudPlatformEvent(BaseModel):
    event_type: str  # 'api_call', 'console_login', 'resource_access', 'permission_change'
    user_identifier: Optional[str] = None
    service_name: Optional[str] = None
    resource_arn: Optional[str] = None
    api_action: Optional[str] = None
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
