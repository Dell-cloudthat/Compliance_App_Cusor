"""
Automated Evidence Collection Service
Automatically collects evidence from integrated systems and links to controls
"""
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

# Control to Evidence Type Mapping
CONTROL_EVIDENCE_MAPPING = {
    # Access Control
    "AC-2": ["user_login_logs", "identity_provider_events", "access_reports"],
    "AC-3": ["permission_logs", "access_control_lists", "iam_policies"],
    "AC-6": ["privilege_escalation_logs", "admin_access_logs", "sudo_logs"],
    "AC-7": ["failed_login_logs", "account_lockout_logs"],
    "AC-17": ["vpn_logs", "remote_access_logs", "network_authentication"],
    
    # Audit & Accountability
    "AU-2": ["audit_logs", "event_logs", "siem_events"],
    "AU-3": ["log_content", "audit_records", "event_details"],
    "AU-4": ["log_storage_capacity", "retention_policies"],
    "AU-5": ["log_failure_alerts", "audit_system_status"],
    "AU-6": ["log_reviews", "audit_analysis_reports"],
    "AU-7": ["log_reduction", "audit_filtering"],
    "AU-8": ["time_synchronization", "ntp_configuration"],
    "AU-9": ["log_protection", "log_integrity"],
    "AU-10": ["non_repudiation", "digital_signatures"],
    "AU-11": ["log_retention", "archive_policies"],
    "AU-12": ["audit_generation", "event_capture"],
    
    # Identification & Authentication
    "IA-2": ["authentication_logs", "mfa_configuration", "login_methods"],
    "IA-3": ["device_identification", "device_certificates"],
    "IA-4": ["identity_management", "user_provisioning"],
    "IA-5": ["password_policies", "credential_management"],
    "IA-6": ["authenticator_feedback", "password_masking"],
    "IA-7": ["cryptographic_module", "certificate_management"],
    "IA-8": ["external_authentication", "federated_identity"],
    
    # System & Communications Protection
    "SC-7": ["firewall_rules", "network_segmentation", "access_control_lists"],
    "SC-8": ["encryption_configuration", "tls_configuration"],
    "SC-12": ["key_management", "cryptographic_keys"],
    "SC-13": ["cryptographic_protection", "encryption_standards"],
    
    # Configuration Management
    "CM-2": ["baseline_configurations", "system_configurations"],
    "CM-3": ["change_control_logs", "change_management_records"],
    "CM-4": ["security_impact_analysis", "change_assessments"],
    "CM-6": ["configuration_settings", "hardening_standards"],
    "CM-7": ["least_functionality", "disabled_services"],
    "CM-8": ["inventory_records", "asset_management"],
    
    # Incident Response
    "IR-2": ["incident_response_training", "training_records"],
    "IR-4": ["incident_handling_procedures", "incident_reports"],
    "IR-5": ["incident_monitoring", "security_monitoring"],
    "IR-6": ["incident_reports", "incident_documentation"],
    
    # Contingency Planning
    "CP-2": ["contingency_plans", "disaster_recovery_plans"],
    "CP-3": ["contingency_training", "drill_records"],
    "CP-4": ["contingency_testing", "dr_test_results"],
    "CP-9": ["backup_configurations", "backup_logs"],
    
    # Risk Assessment
    "RA-2": ["security_categorization", "risk_assessments"],
    "RA-3": ["risk_assessment_reports", "threat_assessments"],
    "RA-5": ["vulnerability_scans", "penetration_test_reports"],
    
    # Security Assessment & Authorization
    "CA-2": ["security_assessments", "audit_reports"],
    "CA-3": ["system_interconnections", "interconnection_agreements"],
    "CA-5": ["action_plans", "poam"],
    "CA-7": ["continuous_monitoring", "compliance_reports"],
    
    # System & Information Integrity
    "SI-2": ["vulnerability_remediation", "patch_management"],
    "SI-3": ["malware_protection", "antivirus_logs"],
    "SI-4": ["system_monitoring", "ids_ips_logs"],
    "SI-5": ["security_alerts", "threat_intelligence"],
    "SI-7": ["software_integrity", "code_signing"],
}

def collect_evidence_for_control(control_id: str, audit_id: int, 
                                  integration_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Automatically collect evidence for a specific control from integrated systems
    
    Returns list of evidence items collected
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get evidence types needed for this control
    evidence_types = CONTROL_EVIDENCE_MAPPING.get(control_id, ["audit_logs", "configuration"])
    
    collected_evidence = []
    
    # Collect from each integration
    if integration_id:
        integrations = [integration_id]
    else:
        cursor.execute("SELECT id, integration_type, name FROM integrations WHERE status = 'active'")
        integrations = cursor.fetchall()
    
    for integration in integrations:
        integration_id_val = integration if isinstance(integration, int) else integration['id']
        integration_type = integration if isinstance(integration, int) else integration['integration_type']
        
        for evidence_type in evidence_types:
            evidence_items = _collect_from_integration(
                integration_id_val, integration_type, evidence_type, control_id
            )
            collected_evidence.extend(evidence_items)
    
    # Store collected evidence
    for evidence_item in collected_evidence:
        _store_evidence(conn, cursor, audit_id, control_id, evidence_item)
    
    conn.commit()
    conn.close()
    
    return collected_evidence

def _collect_from_integration(integration_id: int, integration_type: str, 
                              evidence_type: str, control_id: str) -> List[Dict[str, Any]]:
    """Collect specific evidence type from an integration"""
    conn = get_db()
    cursor = conn.cursor()
    
    evidence_items = []
    now = datetime.now()
    
    # Map evidence types to integration data sources
    if evidence_type == "user_login_logs" or evidence_type == "authentication_logs":
        # Collect from EDR, Identity Provider, or Network Appliance
        if integration_type == "identity_provider":
            cursor.execute("""
                SELECT * FROM identity_provider_events
                WHERE integration_id = ? AND event_type IN ('user.login', 'user.logout')
                AND event_timestamp >= datetime('now', '-30 days')
                ORDER BY event_timestamp DESC
                LIMIT 100
            """, (integration_id,))
            events = cursor.fetchall()
            if events:
                evidence_items.append({
                    "evidence_type": "api_data",
                    "evidence_name": f"Login Logs - {now.strftime('%Y-%m-%d')}",
                    "source": "identity_provider",
                    "record_count": len(events),
                    "date_range": {
                        "start": events[-1]['event_timestamp'],
                        "end": events[0]['event_timestamp']
                    },
                    "metadata": {
                        "integration_id": integration_id,
                        "integration_type": integration_type,
                        "control_id": control_id,
                        "event_types": ["user.login", "user.logout"]
                    }
                })
        
        elif integration_type == "edr":
            cursor.execute("""
                SELECT * FROM edr_events
                WHERE integration_id = ? AND event_type = 'login'
                AND event_timestamp >= datetime('now', '-30 days')
                ORDER BY event_timestamp DESC
                LIMIT 100
            """, (integration_id,))
            events = cursor.fetchall()
            if events:
                evidence_items.append({
                    "evidence_type": "api_data",
                    "evidence_name": f"EDR Login Events - {now.strftime('%Y-%m-%d')}",
                    "source": "edr",
                    "record_count": len(events),
                    "date_range": {
                        "start": events[-1]['event_timestamp'],
                        "end": events[0]['event_timestamp']
                    },
                    "metadata": {
                        "integration_id": integration_id,
                        "integration_type": integration_type,
                        "control_id": control_id
                    }
                })
    
    elif evidence_type == "permission_logs" or evidence_type == "access_control_lists":
        # Collect from Identity Provider or Cloud Platform
        if integration_type == "identity_provider":
            cursor.execute("""
                SELECT * FROM identity_provider_events
                WHERE integration_id = ? AND event_type IN ('permission.granted', 'permission.revoked')
                AND event_timestamp >= datetime('now', '-90 days')
                ORDER BY event_timestamp DESC
                LIMIT 100
            """, (integration_id,))
            events = cursor.fetchall()
            if events:
                evidence_items.append({
                    "evidence_type": "api_data",
                    "evidence_name": f"Permission Changes - {now.strftime('%Y-%m-%d')}",
                    "source": "identity_provider",
                    "record_count": len(events),
                    "metadata": {
                        "integration_id": integration_id,
                        "integration_type": integration_type,
                        "control_id": control_id
                    }
                })
    
    elif evidence_type == "audit_logs" or evidence_type == "event_logs":
        # Collect from all integration types
        if integration_type == "edr":
            cursor.execute("""
                SELECT * FROM edr_events
                WHERE integration_id = ? AND event_timestamp >= datetime('now', '-30 days')
                ORDER BY event_timestamp DESC
                LIMIT 500
            """, (integration_id,))
            events = cursor.fetchall()
            if events:
                evidence_items.append({
                    "evidence_type": "api_data",
                    "evidence_name": f"EDR Audit Logs - {now.strftime('%Y-%m-%d')}",
                    "source": "edr",
                    "record_count": len(events),
                    "metadata": {
                        "integration_id": integration_id,
                        "integration_type": integration_type,
                        "control_id": control_id
                    }
                })
        
        elif integration_type == "cloud_platform":
            cursor.execute("""
                SELECT * FROM cloud_platform_events
                WHERE integration_id = ? AND event_timestamp >= datetime('now', '-30 days')
                ORDER BY event_timestamp DESC
                LIMIT 500
            """, (integration_id,))
            events = cursor.fetchall()
            if events:
                evidence_items.append({
                    "evidence_type": "api_data",
                    "evidence_name": f"Cloud Platform Audit Logs - {now.strftime('%Y-%m-%d')}",
                    "source": "cloud_platform",
                    "record_count": len(events),
                    "metadata": {
                        "integration_id": integration_id,
                        "integration_type": integration_type,
                        "control_id": control_id
                    }
                })
    
    elif evidence_type == "network_authentication" or evidence_type == "vpn_logs":
        if integration_type == "network_appliance":
            cursor.execute("""
                SELECT * FROM network_appliance_logs
                WHERE integration_id = ? AND log_type = 'authentication'
                AND log_timestamp >= datetime('now', '-30 days')
                ORDER BY log_timestamp DESC
                LIMIT 100
            """, (integration_id,))
            logs = cursor.fetchall()
            if logs:
                evidence_items.append({
                    "evidence_type": "api_data",
                    "evidence_name": f"Network Authentication Logs - {now.strftime('%Y-%m-%d')}",
                    "source": "network_appliance",
                    "record_count": len(logs),
                    "metadata": {
                        "integration_id": integration_id,
                        "integration_type": integration_type,
                        "control_id": control_id
                    }
                })
    
    elif evidence_type == "firewall_rules" or evidence_type == "network_segmentation":
        if integration_type == "network_appliance":
            # In production, would fetch actual firewall configuration
            evidence_items.append({
                "evidence_type": "configuration",
                "evidence_name": f"Firewall Configuration Snapshot - {now.strftime('%Y-%m-%d')}",
                "source": "network_appliance",
                "metadata": {
                    "integration_id": integration_id,
                    "integration_type": integration_type,
                    "control_id": control_id,
                    "note": "Configuration snapshot from integrated firewall"
                }
            })
    
    conn.close()
    return evidence_items

def _store_evidence(conn, cursor, audit_id: int, control_id: str, evidence_item: Dict[str, Any]):
    """Store collected evidence in audit_evidence table"""
    metadata_json = json.dumps(evidence_item.get('metadata', {}))
    
    # Calculate expiration date (default 90 days for API data, 365 for configurations)
    expiration_days = 90 if evidence_item.get('evidence_type') == 'api_data' else 365
    expiration_date = (datetime.now() + timedelta(days=expiration_days)).strftime('%Y-%m-%d')
    
    cursor.execute("""
        INSERT INTO audit_evidence 
        (audit_engagement_id, control_id, evidence_type, evidence_name, 
         file_url, file_size_bytes, expiration_date, metadata, notes, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id,
        control_id,
        evidence_item.get('evidence_type', 'api_data'),
        evidence_item.get('evidence_name', 'Automated Evidence'),
        evidence_item.get('file_url'),  # Could be API endpoint URL
        evidence_item.get('file_size_bytes'),
        expiration_date,
        metadata_json,
        f"Auto-collected from {evidence_item.get('source', 'integration')}. "
        f"Record count: {evidence_item.get('record_count', 'N/A')}",
        "system"
    ))

def collect_evidence_for_audit(audit_id: int, control_ids: Optional[List[str]] = None,
                               integration_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Collect evidence for all controls in an audit engagement
    
    Returns summary of collection results
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get audit scope
    cursor.execute("SELECT scope FROM audit_engagements WHERE id = ?", (audit_id,))
    audit = cursor.fetchone()
    if not audit:
        conn.close()
        return {"error": "Audit not found"}
    
    scope = json.loads(audit['scope']) if audit['scope'] else []
    
    if control_ids:
        scope = [cid for cid in scope if cid in control_ids]
    
    collection_results = {
        "audit_id": audit_id,
        "controls_processed": 0,
        "evidence_collected": 0,
        "errors": [],
        "by_control": {}
    }
    
    for control_id in scope:
        try:
            evidence_items = collect_evidence_for_control(control_id, audit_id, integration_id)
            collection_results["controls_processed"] += 1
            collection_results["evidence_collected"] += len(evidence_items)
            collection_results["by_control"][control_id] = {
                "evidence_count": len(evidence_items),
                "evidence_types": list(set(e.get('evidence_type') for e in evidence_items))
            }
        except Exception as e:
            collection_results["errors"].append({
                "control_id": control_id,
                "error": str(e)
            })
    
    conn.close()
    return collection_results

def get_evidence_freshness(audit_id: int) -> Dict[str, Any]:
    """
    Calculate evidence freshness metrics for an audit
    
    Returns freshness scores and expiration warnings
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all evidence for audit
    cursor.execute("""
        SELECT control_id, uploaded_at, expiration_date, validated
        FROM audit_evidence
        WHERE audit_engagement_id = ?
    """, (audit_id,))
    
    evidence_list = cursor.fetchall()
    
    now = datetime.now()
    freshness_stats = {
        "total_evidence": len(evidence_list),
        "fresh_evidence": 0,  # < 30 days old
        "stale_evidence": 0,  # 30-90 days old
        "expired_evidence": 0,
        "expiring_soon": 0,  # Expires in < 30 days
        "by_control": {},
        "expiration_warnings": []
    }
    
    for ev in evidence_list:
        control_id = ev['control_id']
        uploaded_at = datetime.fromisoformat(ev['uploaded_at']) if ev['uploaded_at'] else now
        expiration_date = datetime.fromisoformat(ev['expiration_date']) if ev['expiration_date'] else None
        
        age_days = (now - uploaded_at).days
        
        if age_days < 30:
            freshness_stats["fresh_evidence"] += 1
        elif age_days < 90:
            freshness_stats["stale_evidence"] += 1
        else:
            freshness_stats["stale_evidence"] += 1
        
        if expiration_date:
            days_until_expiry = (expiration_date - now).days
            if days_until_expiry < 0:
                freshness_stats["expired_evidence"] += 1
                freshness_stats["expiration_warnings"].append({
                    "control_id": control_id,
                    "evidence_id": ev['id'],
                    "expired_days_ago": abs(days_until_expiry)
                })
            elif days_until_expiry < 30:
                freshness_stats["expiring_soon"] += 1
                freshness_stats["expiration_warnings"].append({
                    "control_id": control_id,
                    "evidence_id": ev['id'],
                    "expires_in_days": days_until_expiry
                })
        
        # Track by control
        if control_id not in freshness_stats["by_control"]:
            freshness_stats["by_control"][control_id] = {
                "total": 0,
                "fresh": 0,
                "stale": 0,
                "expired": 0
            }
        
        freshness_stats["by_control"][control_id]["total"] += 1
        if age_days < 30:
            freshness_stats["by_control"][control_id]["fresh"] += 1
        elif age_days < 90:
            freshness_stats["by_control"][control_id]["stale"] += 1
        else:
            freshness_stats["by_control"][control_id]["stale"] += 1
    
    conn.close()
    return freshness_stats

def auto_link_evidence_to_controls(audit_id: int) -> Dict[str, Any]:
    """
    Automatically link evidence to controls based on content analysis
    
    Uses metadata and evidence type to match with control requirements
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # Get unlinked evidence
    cursor.execute("""
        SELECT * FROM audit_evidence
        WHERE audit_engagement_id = ? AND control_id = ''
    """, (audit_id,))
    
    unlinked_evidence = cursor.fetchall()
    
    linked_count = 0
    linking_results = []
    
    for ev in unlinked_evidence:
        metadata = json.loads(ev['metadata']) if ev['metadata'] else {}
        evidence_type = ev['evidence_type']
        evidence_name = ev['evidence_name'].lower()
        
        # Try to match evidence to controls based on keywords and evidence types
        cursor.execute("SELECT scope FROM audit_engagements WHERE id = ?", (audit_id,))
        audit = cursor.fetchone()
        scope = json.loads(audit['scope']) if audit and audit['scope'] else []
        
        best_match = None
        best_score = 0
        
        for control_id in scope:
            score = 0
            
            # Check if evidence type matches control requirements
            required_types = CONTROL_EVIDENCE_MAPPING.get(control_id, [])
            if evidence_type in required_types or any(et in evidence_name for et in required_types):
                score += 10
            
            # Check metadata for control references
            if 'control_id' in metadata and metadata['control_id'] == control_id:
                score += 20
            
            # Check evidence name for control keywords
            control_keywords = {
                'AC-': ['access', 'authentication', 'login', 'permission'],
                'AU-': ['audit', 'log', 'event', 'monitoring'],
                'IA-': ['identity', 'authentication', 'credential'],
                'SC-': ['network', 'firewall', 'encryption', 'security'],
                'CM-': ['configuration', 'change', 'baseline'],
                'IR-': ['incident', 'response', 'alert'],
                'CP-': ['backup', 'recovery', 'contingency'],
            }
            
            for prefix, keywords in control_keywords.items():
                if control_id.startswith(prefix):
                    if any(kw in evidence_name for kw in keywords):
                        score += 5
            
            if score > best_score:
                best_score = score
                best_match = control_id
        
        if best_match and best_score >= 5:
            cursor.execute("""
                UPDATE audit_evidence
                SET control_id = ?
                WHERE id = ?
            """, (best_match, ev['id']))
            linked_count += 1
            linking_results.append({
                "evidence_id": ev['id'],
                "evidence_name": ev['evidence_name'],
                "linked_to": best_match,
                "confidence_score": best_score
            })
    
    conn.commit()
    conn.close()
    
    return {
        "unlinked_count": len(unlinked_evidence),
        "linked_count": linked_count,
        "results": linking_results
    }

