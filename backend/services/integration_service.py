"""
Integration Service - Handles data ingestion from external systems
Supports: EDRs, Network Appliances, Identity Providers, Cloud Platforms, etc.
"""
import sqlite3
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def register_integration(integration_type: str, name: str, config: Dict[str, Any], 
                         user_id: int) -> int:
    """
    Register a new integration (EDR, Network Appliance, Identity Provider, etc.)
    
    integration_type: 'edr', 'network_appliance', 'identity_provider', 'cloud_platform', 'siem'
    config: Integration-specific configuration (API keys, endpoints, etc.)
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Create integrations table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS integrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            integration_type TEXT NOT NULL,
            name TEXT NOT NULL,
            config_json TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            last_sync_at TIMESTAMP,
            sync_frequency TEXT DEFAULT 'realtime',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    cursor.execute("""
        INSERT INTO integrations (user_id, integration_type, name, config_json, status)
        VALUES (?, ?, ?, ?, 'active')
    """, (user_id, integration_type, name, json.dumps(config)))
    
    integration_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return integration_id

def ingest_edr_event(integration_id: int, event_data: Dict[str, Any]) -> int:
    """
    Ingest events from EDR systems (CrowdStrike, SentinelOne, Microsoft Defender, etc.)
    
    Event types:
    - login_events: User login/logout from endpoints
    - process_execution: Process execution events
    - file_access: File access events
    - network_connections: Network connection events
    - privilege_escalation: Privilege escalation events
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Create EDR events table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS edr_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            integration_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            user_identifier TEXT,
            device_identifier TEXT,
            event_timestamp TIMESTAMP NOT NULL,
            event_data_json TEXT,
            normalized_user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (integration_id) REFERENCES integrations(id),
            FOREIGN KEY (normalized_user_id) REFERENCES users(id)
        )
    """)
    
    # Normalize user identifier to platform user_id
    normalized_user_id = normalize_user_identifier(event_data.get('user_identifier'))
    
    cursor.execute("""
        INSERT INTO edr_events 
        (integration_id, event_type, user_identifier, device_identifier, 
         event_timestamp, event_data_json, normalized_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        integration_id,
        event_data.get('event_type'),
        event_data.get('user_identifier'),
        event_data.get('device_identifier'),
        event_data.get('event_timestamp', datetime.now().isoformat()),
        json.dumps(event_data),
        normalized_user_id
    ))
    
    event_id = cursor.lastrowid
    
    # If this is a login event, create a login session
    if event_data.get('event_type') == 'login':
        from services.iam_service import create_login_session
        if normalized_user_id:
            create_login_session(
                normalized_user_id,
                ip_address=event_data.get('ip_address'),
                user_agent=event_data.get('user_agent')
            )
    
    # If this is a file/process access event, log it as an access event
    if event_data.get('event_type') in ['file_access', 'process_execution']:
        from services.iam_service import log_user_access
        if normalized_user_id:
            resource_type = 'file' if event_data.get('event_type') == 'file_access' else 'process'
            action_type = 'read' if event_data.get('access_type') == 'read' else 'execute'
            log_user_access(
                normalized_user_id,
                resource_type=resource_type,
                resource_id=event_data.get('resource_id'),
                action_type=action_type,
                ip_address=event_data.get('ip_address'),
                user_agent=event_data.get('user_agent'),
                metadata={'edr_event_id': event_id, 'device_id': event_data.get('device_identifier')}
            )
    
    conn.commit()
    conn.close()
    
    return event_id

def ingest_network_appliance_log(integration_id: int, log_data: Dict[str, Any]) -> int:
    """
    Ingest logs from network appliances (Firewalls, Proxies, VPNs, etc.)
    
    Log types:
    - authentication: VPN/network authentication events
    - connection: Network connection logs
    - dns_query: DNS query logs
    - web_proxy: Web proxy access logs
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Create network logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS network_appliance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            integration_id INTEGER NOT NULL,
            log_type TEXT NOT NULL,
            user_identifier TEXT,
            source_ip TEXT,
            destination_ip TEXT,
            destination_port INTEGER,
            protocol TEXT,
            action TEXT,
            log_timestamp TIMESTAMP NOT NULL,
            log_data_json TEXT,
            normalized_user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (integration_id) REFERENCES integrations(id),
            FOREIGN KEY (normalized_user_id) REFERENCES users(id)
        )
    """)
    
    normalized_user_id = normalize_user_identifier(log_data.get('user_identifier'))
    
    cursor.execute("""
        INSERT INTO network_appliance_logs
        (integration_id, log_type, user_identifier, source_ip, destination_ip,
         destination_port, protocol, action, log_timestamp, log_data_json, normalized_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        integration_id,
        log_data.get('log_type'),
        log_data.get('user_identifier'),
        log_data.get('source_ip'),
        log_data.get('destination_ip'),
        log_data.get('destination_port'),
        log_data.get('protocol'),
        log_data.get('action'),
        log_data.get('log_timestamp', datetime.now().isoformat()),
        json.dumps(log_data),
        normalized_user_id
    ))
    
    log_id = cursor.lastrowid
    
    # If this is an authentication event, create a login session
    if log_data.get('log_type') == 'authentication' and log_data.get('action') == 'allow':
        from services.iam_service import create_login_session
        if normalized_user_id:
            create_login_session(
                normalized_user_id,
                ip_address=log_data.get('source_ip'),
                user_agent=log_data.get('user_agent')
            )
    
    # If this is a connection log, log it as network access
    if log_data.get('log_type') == 'connection' and normalized_user_id:
        from services.iam_service import log_user_access
        log_user_access(
            normalized_user_id,
            resource_type='network',
            resource_id=f"{log_data.get('destination_ip')}:{log_data.get('destination_port')}",
            action_type='execute',  # Network connection is an execute action
            ip_address=log_data.get('source_ip'),
            metadata={'network_log_id': log_id, 'protocol': log_data.get('protocol')}
        )
    
    conn.commit()
    conn.close()
    
    return log_id

def ingest_identity_provider_event(integration_id: int, event_data: Dict[str, Any]) -> int:
    """
    Ingest events from Identity Providers (Okta, Azure AD, Google Workspace, etc.)
    
    Event types:
    - user.login: User login events
    - user.logout: User logout events
    - user.created: New user created
    - user.updated: User updated
    - group.membership.added: User added to group
    - group.membership.removed: User removed from group
    - permission.granted: Permission granted
    - permission.revoked: Permission revoked
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Create identity provider events table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS identity_provider_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            integration_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            user_identifier TEXT,
            group_identifier TEXT,
            resource_identifier TEXT,
            permission_type TEXT,
            event_timestamp TIMESTAMP NOT NULL,
            event_data_json TEXT,
            normalized_user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (integration_id) REFERENCES integrations(id),
            FOREIGN KEY (normalized_user_id) REFERENCES users(id)
        )
    """)
    
    normalized_user_id = normalize_user_identifier(event_data.get('user_identifier'))
    
    cursor.execute("""
        INSERT INTO identity_provider_events
        (integration_id, event_type, user_identifier, group_identifier, resource_identifier,
         permission_type, event_timestamp, event_data_json, normalized_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        integration_id,
        event_data.get('event_type'),
        event_data.get('user_identifier'),
        event_data.get('group_identifier'),
        event_data.get('resource_identifier'),
        event_data.get('permission_type'),
        event_data.get('event_timestamp', datetime.now().isoformat()),
        json.dumps(event_data),
        normalized_user_id
    ))
    
    event_id = cursor.lastrowid
    
    # Handle login events
    if event_data.get('event_type') == 'user.login' and normalized_user_id:
        from services.iam_service import create_login_session
        create_login_session(
            normalized_user_id,
            ip_address=event_data.get('ip_address'),
            user_agent=event_data.get('user_agent')
        )
    
    # Handle logout events
    if event_data.get('event_type') == 'user.logout' and normalized_user_id:
        from services.iam_service import end_login_session
        # Would need to find active session token - simplified here
        # In production, would match by user_id and IP
    
    # Handle permission grants/revokes
    if event_data.get('event_type') in ['permission.granted', 'permission.revoked']:
        from services.iam_service import create_audit_log, auto_map_user_permissions
        if normalized_user_id:
            create_audit_log(
                event_type='grant' if 'granted' in event_data.get('event_type') else 'revoke',
                user_id=normalized_user_id,
                granted_by=normalized_user_id,  # Would get from event_data in production
                resource_type=event_data.get('resource_type'),
                resource_id=event_data.get('resource_identifier'),
                permission_type=event_data.get('permission_type'),
                ip_address=event_data.get('ip_address'),
                user_agent=event_data.get('user_agent')
            )
            # Re-map permissions after grant/revoke
            auto_map_user_permissions(normalized_user_id)
    
    conn.commit()
    conn.close()
    
    return event_id

def ingest_cloud_platform_event(integration_id: int, event_data: Dict[str, Any]) -> int:
    """
    Ingest events from Cloud Platforms (AWS CloudTrail, Azure Activity Logs, GCP Audit Logs)
    
    Event types:
    - api_call: API calls made by users/services
    - console_login: Console login events
    - resource_access: Resource access events
    - permission_change: IAM permission changes
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Create cloud platform events table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cloud_platform_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            integration_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            user_identifier TEXT,
            service_name TEXT,
            resource_arn TEXT,
            api_action TEXT,
            event_timestamp TIMESTAMP NOT NULL,
            event_data_json TEXT,
            normalized_user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (integration_id) REFERENCES integrations(id),
            FOREIGN KEY (normalized_user_id) REFERENCES users(id)
        )
    """)
    
    normalized_user_id = normalize_user_identifier(event_data.get('user_identifier'))
    
    cursor.execute("""
        INSERT INTO cloud_platform_events
        (integration_id, event_type, user_identifier, service_name, resource_arn,
         api_action, event_timestamp, event_data_json, normalized_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        integration_id,
        event_data.get('event_type'),
        event_data.get('user_identifier'),
        event_data.get('service_name'),
        event_data.get('resource_arn'),
        event_data.get('api_action'),
        event_data.get('event_timestamp', datetime.now().isoformat()),
        json.dumps(event_data),
        normalized_user_id
    ))
    
    event_id = cursor.lastrowid
    
    # Handle console login
    if event_data.get('event_type') == 'console_login' and normalized_user_id:
        from services.iam_service import create_login_session
        create_login_session(
            normalized_user_id,
            ip_address=event_data.get('source_ip'),
            user_agent=event_data.get('user_agent')
        )
    
    # Handle API calls as access events
    if event_data.get('event_type') == 'api_call' and normalized_user_id:
        from services.iam_service import log_user_access
        
        # Map API action to permission type
        api_action = event_data.get('api_action', '').lower()
        if 'get' in api_action or 'list' in api_action or 'describe' in api_action:
            action_type = 'read'
        elif 'put' in api_action or 'update' in api_action or 'modify' in api_action:
            action_type = 'write'
        elif 'delete' in api_action or 'remove' in api_action:
            action_type = 'delete'
        else:
            action_type = 'execute'
        
        log_user_access(
            normalized_user_id,
            resource_type='cloud_resource',
            resource_id=event_data.get('resource_arn'),
            action_type=action_type,
            ip_address=event_data.get('source_ip'),
            user_agent=event_data.get('user_agent'),
            metadata={
                'cloud_event_id': event_id,
                'service_name': event_data.get('service_name'),
                'api_action': event_data.get('api_action')
            }
        )
    
    conn.commit()
    conn.close()
    
    return event_id

def normalize_user_identifier(user_identifier: Optional[str]) -> Optional[int]:
    """
    Normalize user identifier from external systems to platform user_id
    This would match by email, username, or other identifiers
    """
    if not user_identifier:
        return None
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Try to match by email first
    cursor.execute("SELECT id FROM users WHERE email = ?", (user_identifier,))
    user = cursor.fetchone()
    
    if user:
        conn.close()
        return user['id']
    
    # Try to match by username
    cursor.execute("SELECT id FROM users WHERE username = ?", (user_identifier,))
    user = cursor.fetchone()
    
    if user:
        conn.close()
        return user['id']
    
    # Could also check a user_mappings table for external ID mappings
    conn.close()
    return None

def get_integration_events(integration_id: int, event_type: Optional[str] = None,
                          start_date: Optional[str] = None, limit: int = 100) -> List[Dict]:
    """Get events from a specific integration"""
    conn = get_db()
    cursor = conn.cursor()
    
    # This would query the appropriate table based on integration type
    # Simplified for now
    conn.close()
    return []

