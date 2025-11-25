"""
Auto-Mapping Service
Maps integration events (EDR, Network, Cloud, Identity Provider) to compliance controls automatically.
Ensures every piece of data flows to compliance frameworks, reports, and audit logs.
"""

import json
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlite3 import Connection


# Event type to control mapping patterns
EVENT_TO_CONTROL_MAPPINGS = {
    # Authentication & Access Control
    'failed_login': ['AC-2', 'AC-7', 'AC-12'],  # Account Management, Session Lock, Session Termination
    'successful_login': ['AC-2', 'AC-3'],  # Account Management, Access Enforcement
    'privilege_escalation': ['AC-6', 'AC-3'],  # Least Privilege, Access Enforcement
    'account_creation': ['AC-2', 'AC-3'],  # Account Management, Access Enforcement
    'account_deletion': ['AC-2'],  # Account Management
    'password_change': ['AC-2', 'IA-5'],  # Account Management, Authenticator Management
    'mfa_enabled': ['IA-2', 'IA-5'],  # Identification & Authentication, Authenticator Management
    'mfa_disabled': ['IA-2', 'IA-5'],  # Identification & Authentication, Authenticator Management
    'session_timeout': ['AC-12', 'AC-11'],  # Session Termination, Session Lock
    'inactive_session': ['AC-12', 'AC-11'],  # Session Termination, Session Lock
    
    # Network Security
    'network_scan': ['SC-7', 'SI-4'],  # Boundary Protection, System Monitoring
    'unauthorized_access': ['SC-7', 'AC-3', 'SI-4'],  # Boundary Protection, Access Enforcement, System Monitoring
    'firewall_rule_change': ['CM-6', 'CM-7'],  # Configuration Settings, Least Functionality
    'vpn_connection': ['AC-17', 'SC-7'],  # Remote Access, Boundary Protection
    'port_scan': ['SC-7', 'SI-4'],  # Boundary Protection, System Monitoring
    'ddos_attack': ['SC-5', 'SI-4'],  # Denial of Service Protection, System Monitoring
    
    # Data Protection
    'data_access': ['AC-3', 'AU-2'],  # Access Enforcement, Audit Events
    'data_modification': ['AC-3', 'AU-2', 'SI-7'],  # Access Enforcement, Audit Events, Software Integrity
    'data_export': ['AC-3', 'AU-2', 'SC-8'],  # Access Enforcement, Audit Events, Transmission Confidentiality
    'encryption_enabled': ['SC-8', 'SC-13'],  # Transmission Confidentiality, Cryptographic Protection
    'encryption_disabled': ['SC-8', 'SC-13'],  # Transmission Confidentiality, Cryptographic Protection
    'backup_created': ['CP-9', 'CP-10'],  # System Backup, System Recovery
    'backup_restored': ['CP-9', 'CP-10'],  # System Backup, System Recovery
    
    # System Integrity
    'malware_detected': ['SI-3', 'SI-4'],  # Malicious Code Protection, System Monitoring
    'vulnerability_found': ['RA-5', 'SI-2'],  # Vulnerability Scanning, Flaw Remediation
    'patch_applied': ['SI-2', 'CM-6'],  # Flaw Remediation, Configuration Settings
    'system_config_change': ['CM-6', 'CM-7'],  # Configuration Settings, Least Functionality
    'service_started': ['CM-6', 'CM-7'],  # Configuration Settings, Least Functionality
    'service_stopped': ['CM-6', 'CM-7'],  # Configuration Settings, Least Functionality
    
    # Audit & Monitoring
    'audit_log_created': ['AU-2', 'AU-3'],  # Audit Events, Content of Audit Records
    'audit_log_deleted': ['AU-2', 'AU-4'],  # Audit Events, Audit Storage Capacity
    'compliance_check': ['CA-2', 'CA-7'],  # Security Assessments, Continuous Monitoring
    'policy_violation': ['PL-8', 'SI-4'],  # Security Architecture, System Monitoring
    
    # Cloud Specific
    'instance_created': ['CM-2', 'CM-6'],  # Baseline Configuration, Configuration Settings
    'instance_terminated': ['CM-2', 'CM-6'],  # Baseline Configuration, Configuration Settings
    's3_bucket_created': ['AC-3', 'SC-28'],  # Access Enforcement, Protection of Information at Rest
    's3_bucket_public': ['AC-3', 'SC-7'],  # Access Enforcement, Boundary Protection
    'iam_role_created': ['AC-2', 'AC-3'],  # Account Management, Access Enforcement
    'iam_policy_changed': ['AC-2', 'AC-3', 'CM-6'],  # Account Management, Access Enforcement, Configuration Settings
    
    # Identity Provider Events
    'user_provisioned': ['AC-2', 'AC-3'],  # Account Management, Access Enforcement
    'user_deprovisioned': ['AC-2'],  # Account Management
    'group_membership_changed': ['AC-2', 'AC-3'],  # Account Management, Access Enforcement
    'sso_login': ['AC-17', 'IA-2'],  # Remote Access, Identification & Authentication
    'token_refreshed': ['AC-12', 'IA-5'],  # Session Termination, Authenticator Management
}

# Resource type to control mapping
RESOURCE_TO_CONTROL_MAPPINGS = {
    'database': ['SC-7', 'SC-8', 'AC-3'],  # Boundary Protection, Transmission Confidentiality, Access Enforcement
    'api': ['SC-7', 'SC-8', 'AC-3'],  # Boundary Protection, Transmission Confidentiality, Access Enforcement
    'storage': ['SC-28', 'AC-3'],  # Protection of Information at Rest, Access Enforcement
    'compute': ['SC-7', 'CM-6'],  # Boundary Protection, Configuration Settings
    'network': ['SC-7', 'SC-5'],  # Boundary Protection, Denial of Service Protection
    'application': ['SC-7', 'SI-7'],  # Boundary Protection, Software Integrity
}

# User role to control mapping
ROLE_TO_CONTROL_MAPPINGS = {
    'admin': ['AC-6', 'AC-3', 'AU-2'],  # Least Privilege, Access Enforcement, Audit Events
    'root': ['AC-6', 'AC-3', 'AU-2'],  # Least Privilege, Access Enforcement, Audit Events
    'superuser': ['AC-6', 'AC-3', 'AU-2'],  # Least Privilege, Access Enforcement, Audit Events
    'auditor': ['AU-2', 'AU-3', 'AC-3'],  # Audit Events, Content of Audit Records, Access Enforcement
    'compliance': ['CA-2', 'CA-7', 'AC-3'],  # Security Assessments, Continuous Monitoring, Access Enforcement
}


def map_event_to_controls(
    event_type: str,
    resource_type: Optional[str] = None,
    user_role: Optional[str] = None,
    event_data: Optional[Dict] = None
) -> List[str]:
    """
    Map an integration event to relevant compliance controls.
    
    Args:
        event_type: Type of event (e.g., 'failed_login', 'malware_detected')
        resource_type: Type of resource accessed (e.g., 'database', 'api')
        user_role: Role of user who triggered event (e.g., 'admin', 'auditor')
        event_data: Additional event data for context
        
    Returns:
        List of control IDs that this event maps to
    """
    mapped_controls = set()
    
    # Map by event type
    if event_type in EVENT_TO_CONTROL_MAPPINGS:
        mapped_controls.update(EVENT_TO_CONTROL_MAPPINGS[event_type])
    
    # Map by resource type
    if resource_type and resource_type in RESOURCE_TO_CONTROL_MAPPINGS:
        mapped_controls.update(RESOURCE_TO_CONTROL_MAPPINGS[resource_type])
    
    # Map by user role
    if user_role:
        role_lower = user_role.lower()
        for role_key, controls in ROLE_TO_CONTROL_MAPPINGS.items():
            if role_key in role_lower:
                mapped_controls.update(controls)
                break
    
    # Additional context-based mapping from event_data
    if event_data:
        # Check for sensitive data access
        if event_data.get('contains_pii') or event_data.get('contains_cui'):
            mapped_controls.update(['AC-3', 'AU-2', 'SC-28'])  # Access Enforcement, Audit Events, Protection of Information at Rest
        
        # Check for encryption
        if event_data.get('encrypted', False):
            mapped_controls.add('SC-8')  # Transmission Confidentiality
        
        # Check for compliance-related tags
        tags = event_data.get('tags', [])
        if isinstance(tags, str):
            tags = json.loads(tags) if tags else []
        
        if 'compliance' in str(tags).lower():
            mapped_controls.update(['CA-2', 'CA-7'])  # Security Assessments, Continuous Monitoring
    
    return sorted(list(mapped_controls))


def create_compliance_alert_from_event(
    conn: Connection,
    user_id: int,
    event_id: int,
    event_type: str,
    event_source: str,  # 'edr', 'network', 'cloud', 'identity'
    mapped_controls: List[str],
    event_data: Dict,
    severity: str = 'medium'
) -> Optional[int]:
    """
    Create a compliance alert from an integration event, linking it to mapped controls.
    
    Args:
        conn: Database connection
        user_id: User ID
        event_id: Integration event ID
        event_type: Type of event
        event_source: Source of event (edr, network, cloud, identity)
        mapped_controls: List of control IDs this event maps to
        event_data: Event data dictionary
        severity: Alert severity (low, medium, high, critical)
        
    Returns:
        Alert ID if created, None otherwise
    """
    if not mapped_controls:
        return None
    
    cursor = conn.cursor()
    
    # Determine alert title and description
    title = f"{event_source.upper()} Event: {event_type.replace('_', ' ').title()}"
    description = f"Integration event from {event_source} mapped to {len(mapped_controls)} compliance control(s)"
    
    # Create alert payload with event context
    alert_payload = {
        'event_id': event_id,
        'event_type': event_type,
        'event_source': event_source,
        'mapped_controls': mapped_controls,
        'event_timestamp': event_data.get('event_timestamp', datetime.utcnow().isoformat()),
        'resource_type': event_data.get('resource_type'),
        'user_role': event_data.get('user_role'),
    }
    
    # Get primary framework from first control (simplified - could be enhanced)
    primary_framework = 'NIST_800-53'  # Default, could be determined from control
    
    # Insert compliance alert
    cursor.execute("""
        INSERT INTO compliance_alerts 
        (user_id, title, description, severity, status, framework, control_id, alert_type, 
         compliance_score_before, compliance_score_after, drift_payload, metadata_json)
        VALUES (?, ?, ?, ?, 'open', ?, ?, 'integration_event', NULL, NULL, NULL, ?)
    """, (
        user_id,
        title,
        description,
        severity,
        primary_framework,
        mapped_controls[0] if mapped_controls else None,  # Primary control
        json.dumps(alert_payload)
    ))
    
    alert_id = cursor.lastrowid
    conn.commit()
    
    return alert_id


def auto_map_integration_event(
    conn: Connection,
    user_id: int,
    event_id: int,
    event_type: str,
    event_source: str,
    event_data: Dict
) -> Dict:
    """
    Automatically map an integration event to compliance controls and create alerts.
    
    This is the main entry point for ensuring every integration event flows to compliance.
    
    Args:
        conn: Database connection
        user_id: User ID
        event_id: Integration event ID
        event_type: Type of event
        event_source: Source system (edr, network, cloud, identity)
        event_data: Event data dictionary
        
    Returns:
        Dictionary with mapping results:
        {
            'mapped_controls': List[str],
            'alert_id': Optional[int],
            'timestamp': str
        }
    """
    # Extract context from event_data
    resource_type = event_data.get('resource_type') or event_data.get('resource')
    user_role = event_data.get('user_role') or event_data.get('role')
    
    # Map event to controls
    mapped_controls = map_event_to_controls(
        event_type=event_type,
        resource_type=resource_type,
        user_role=user_role,
        event_data=event_data
    )
    
    # Determine severity based on event type and context
    severity = determine_event_severity(event_type, event_data)
    
    # Create compliance alert if controls were mapped
    alert_id = None
    if mapped_controls:
        alert_id = create_compliance_alert_from_event(
            conn=conn,
            user_id=user_id,
            event_id=event_id,
            event_type=event_type,
            event_source=event_source,
            mapped_controls=mapped_controls,
            event_data=event_data,
            severity=severity
        )
    
    return {
        'mapped_controls': mapped_controls,
        'alert_id': alert_id,
        'timestamp': datetime.utcnow().isoformat(),
        'severity': severity
    }


def determine_event_severity(event_type: str, event_data: Dict) -> str:
    """
    Determine alert severity based on event type and context.
    
    Args:
        event_type: Type of event
        event_data: Event data dictionary
        
    Returns:
        Severity level: 'low', 'medium', 'high', or 'critical'
    """
    # Critical events
    critical_patterns = [
        'malware_detected',
        'unauthorized_access',
        'privilege_escalation',
        'data_export',
        's3_bucket_public',
        'ddos_attack'
    ]
    
    if any(pattern in event_type.lower() for pattern in critical_patterns):
        return 'critical'
    
    # High severity events
    high_patterns = [
        'failed_login',
        'vulnerability_found',
        'policy_violation',
        'iam_policy_changed',
        'firewall_rule_change'
    ]
    
    if any(pattern in event_type.lower() for pattern in high_patterns):
        return 'high'
    
    # Check event_data for severity indicators
    if event_data.get('severity'):
        return event_data['severity'].lower()
    
    if event_data.get('risk_score', 0) > 7:
        return 'high'
    elif event_data.get('risk_score', 0) > 4:
        return 'medium'
    
    # Default to medium
    return 'medium'


def update_control_evidence_from_event(
    conn: Connection,
    user_id: int,
    control_id: str,
    event_id: int,
    event_source: str,
    event_type: str
) -> Optional[int]:
    """
    Link an integration event as evidence for a compliance control.
    
    Args:
        conn: Database connection
        user_id: User ID
        control_id: Control ID to link evidence to
        event_id: Integration event ID
        event_source: Source system
        event_type: Type of event
        
    Returns:
        Evidence ID if created, None otherwise
    """
    cursor = conn.cursor()
    
    # Check if control exists
    cursor.execute("SELECT id FROM controls WHERE id = ? AND user_id = ?", (control_id, user_id))
    if not cursor.fetchone():
        return None
    
    # Create evidence entry
    evidence_name = f"{event_source.upper()} Event: {event_type}"
    evidence_link = f"/api/integrations/{event_source}/events/{event_id}"
    
    cursor.execute("""
        INSERT INTO audit_evidence
        (user_id, control_id, evidence_type, evidence_name, evidence_link, collected_at, 
         collected_by, evidence_status, metadata_json)
        VALUES (?, ?, 'integration_event', ?, ?, ?, 'system', 'collected', ?)
    """, (
        user_id,
        control_id,
        evidence_name,
        evidence_link,
        datetime.utcnow().isoformat(),
        json.dumps({
            'event_source': event_source,
            'event_type': event_type,
            'event_id': event_id,
            'auto_mapped': True
        })
    ))
    
    evidence_id = cursor.lastrowid
    conn.commit()
    
    return evidence_id

