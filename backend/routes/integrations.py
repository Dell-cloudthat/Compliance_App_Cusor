"""
Third-party integration registration and event ingestion routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services.integration_service import (
    register_integration, ingest_edr_event, ingest_network_appliance_log,
    ingest_identity_provider_event, ingest_cloud_platform_event,
)
from services.auto_mapping_service import (
    map_event_to_controls, auto_map_integration_event, update_control_evidence_from_event,
)

router = APIRouter()

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
    event_timestamp: Optional[str] = None

@router.post("/api/integrations/register")
async def register_integration_endpoint(
    integration: IntegrationRegister,
    user_id: int = Depends(get_current_user)
):
    """Register a new integration (EDR, Network Appliance, Identity Provider, etc.)"""
    allowed, _ = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    integration_id = register_integration(
        integration.integration_type,
        integration.name,
        integration.config,
        user_id
    )
    
    return {
        "integration_id": integration_id,
        "message": f"Integration '{integration.name}' registered successfully"
    }

@router.post("/api/integrations/edr/events")
async def ingest_edr_event_endpoint(
    event: EDREvent,
    integration_id: int = Header(..., alias="X-Integration-Id"),
    user_id: int = Depends(get_current_user)
):
    """Ingest events from EDR systems (CrowdStrike, SentinelOne, Microsoft Defender, etc.)"""
    event_data = event.dict()
    event_id = ingest_edr_event(integration_id, event_data)
    
    return {
        "event_id": event_id,
        "message": "EDR event ingested successfully"
    }

@router.post("/api/integrations/network/logs")
async def ingest_network_log_endpoint(
    log: NetworkApplianceLog,
    integration_id: int = Header(..., alias="X-Integration-Id"),
    user_id: int = Depends(get_current_user)
):
    """Ingest logs from network appliances (Firewalls, Proxies, VPNs, etc.)"""
    log_data = log.dict()
    log_id = ingest_network_appliance_log(integration_id, log_data)
    
    return {
        "log_id": log_id,
        "message": "Network appliance log ingested successfully"
    }

@router.post("/api/integrations/identity/events")
async def ingest_identity_event_endpoint(
    event: IdentityProviderEvent,
    integration_id: int = Header(..., alias="X-Integration-Id"),
    user_id: int = Depends(get_current_user)
):
    """Ingest events from Identity Providers (Okta, Azure AD, Google Workspace, etc.)"""
    event_data = event.dict()
    event_id = ingest_identity_provider_event(integration_id, event_data)
    
    return {
        "event_id": event_id,
        "message": "Identity provider event ingested successfully"
    }

@router.post("/api/integrations/cloud/events")
async def ingest_cloud_event_endpoint(
    event: CloudPlatformEvent,
    integration_id: int = Header(..., alias="X-Integration-Id"),
    user_id: int = Depends(get_current_user)
):
    """Ingest events from Cloud Platforms (AWS CloudTrail, Azure Activity Logs, GCP Audit Logs)"""
    event_data = event.dict()
    event_id = ingest_cloud_platform_event(integration_id, event_data)
    
    return {
        "event_id": event_id,
        "message": "Cloud platform event ingested successfully"
    }

@router.get("/api/integrations/events/summary")
async def get_integration_events_summary(
    user_id: int = Depends(get_current_user),
    days: int = 30
):
    """Get summary of integration events for data flow visualization"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get integrations for this user
    cursor.execute("SELECT id, name, integration_type FROM integrations WHERE user_id = ?", (user_id,))
    integrations = [dict(row) for row in cursor.fetchall()]
    
    # Get event counts by integration and type
    summary = {
        "total_events": 0,
        "by_integration": {},
        "by_type": {},
        "by_framework": {},
        "recent_events": []
    }
    
    # EDR Events
    for integration in integrations:
        if integration['integration_type'] in ['EDR', 'edr']:
            cursor.execute("""
                SELECT COUNT(*) as count, event_type
                FROM edr_events
                WHERE integration_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
                GROUP BY event_type
            """, (integration['id'], days))
            for row in cursor.fetchall():
                row_dict = dict(row)
                event_type = row_dict['event_type'] or 'unknown'
                count = row_dict['count'] or 0
                summary['total_events'] += count
                summary['by_integration'][integration['name']] = summary['by_integration'].get(integration['name'], 0) + count
                summary['by_type'][event_type] = summary['by_type'].get(event_type, 0) + count
    
    # Network Appliance Logs
    for integration in integrations:
        if integration['integration_type'] in ['Network', 'network']:
            cursor.execute("""
                SELECT COUNT(*) as count, log_type
                FROM network_appliance_logs
                WHERE integration_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
                GROUP BY log_type
            """, (integration['id'], days))
            for row in cursor.fetchall():
                row_dict = dict(row)
                log_type = row_dict['log_type'] or 'unknown'
                count = row_dict['count'] or 0
                summary['total_events'] += count
                summary['by_integration'][integration['name']] = summary['by_integration'].get(integration['name'], 0) + count
                summary['by_type'][log_type] = summary['by_type'].get(log_type, 0) + count
    
    # Identity Provider Events
    for integration in integrations:
        if integration['integration_type'] in ['Identity', 'identity']:
            cursor.execute("""
                SELECT COUNT(*) as count, event_type
                FROM identity_provider_events
                WHERE integration_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
                GROUP BY event_type
            """, (integration['id'], days))
            for row in cursor.fetchall():
                row_dict = dict(row)
                event_type = row_dict['event_type'] or 'unknown'
                count = row_dict['count'] or 0
                summary['total_events'] += count
                summary['by_integration'][integration['name']] = summary['by_integration'].get(integration['name'], 0) + count
                summary['by_type'][event_type] = summary['by_type'].get(event_type, 0) + count
    
    # Cloud Platform Events
    for integration in integrations:
        if integration['integration_type'] in ['Cloud', 'cloud']:
            cursor.execute("""
                SELECT COUNT(*) as count, event_type
                FROM cloud_platform_events
                WHERE integration_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
                GROUP BY event_type
            """, (integration['id'], days))
            for row in cursor.fetchall():
                row_dict = dict(row)
                event_type = row_dict['event_type'] or 'unknown'
                count = row_dict['count'] or 0
                summary['total_events'] += count
                summary['by_integration'][integration['name']] = summary['by_integration'].get(integration['name'], 0) + count
                summary['by_type'][event_type] = summary['by_type'].get(event_type, 0) + count
    
    # Get compliance alerts created from integration events (to show framework mapping)
    cursor.execute("""
        SELECT framework, COUNT(*) as count
        FROM compliance_alerts
        WHERE user_id = ? AND alert_type = 'integration_event' 
          AND created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY framework
    """, (user_id, days))
    for row in cursor.fetchall():
        row_dict = dict(row)
        framework = row_dict['framework'] or 'unknown'
        count = row_dict['count'] or 0
        summary['by_framework'][framework] = summary['by_framework'].get(framework, 0) + count
    
    conn.close()
    return summary

# ============================================================================
# Data Flow Architecture Endpoints
# ============================================================================
