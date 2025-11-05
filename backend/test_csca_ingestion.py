#!/usr/bin/env python3
"""
Test script to ingest sample security events into the CSCA system
Run this to populate the database with sample events for testing
"""
import requests
import json
from datetime import datetime, timedelta
import random

API_BASE_URL = "http://localhost:8000"
USER_ID = 1  # Assuming user ID 1 exists

# Sample security events to test CSCA
SAMPLE_EVENTS = [
    {
        "event_type": "threat_detected",
        "event_source": "SIEM",
        "source_tool": "Splunk Enterprise Security",
        "severity": "critical",
        "title": "Malware Detected on Production Server",
        "description": "Advanced persistent threat detected on production web server. Multiple suspicious processes spawned.",
        "affected_resources": ["prod-web-01", "10.0.1.45", "user:admin"],
        "security_event_data": {
            "threat_type": "malware",
            "confidence": "high",
            "ioc_count": 5,
            "affected_endpoints": 1
        },
        "detected_at": (datetime.now() - timedelta(hours=2)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001", "SOC2", "CIS"]
    },
    {
        "event_type": "vulnerability_found",
        "event_source": "Vulnerability Scanner",
        "source_tool": "Tenable.io",
        "severity": "high",
        "title": "Critical CVE-2024-1234 in Apache Web Server",
        "description": "Remote code execution vulnerability found in Apache httpd version 2.4.55 on production servers.",
        "affected_resources": ["prod-web-01", "prod-web-02", "prod-api-01"],
        "security_event_data": {
            "cve_id": "CVE-2024-1234",
            "cvss_score": 9.8,
            "affected_assets": 3,
            "patch_available": True
        },
        "detected_at": (datetime.now() - timedelta(hours=5)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001", "SOC2"]
    },
    {
        "event_type": "incident",
        "event_source": "EDR",
        "source_tool": "CrowdStrike Falcon",
        "severity": "high",
        "title": "Unauthorized Access Attempt Detected",
        "description": "Multiple failed login attempts from external IP followed by successful authentication. Potential brute force attack.",
        "affected_resources": ["vpn-gateway-01", "user:john.doe"],
        "security_event_data": {
            "incident_type": "unauthorized_access",
            "source_ip": "203.0.113.45",
            "attempts": 47,
            "status": "contained"
        },
        "detected_at": (datetime.now() - timedelta(hours=12)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001", "SOC2", "CIS"]
    },
    {
        "event_type": "policy_violation",
        "event_source": "CSPM",
        "source_tool": "AWS Security Hub",
        "severity": "medium",
        "title": "S3 Bucket Publicly Accessible",
        "description": "S3 bucket 'customer-data-backup' found to be publicly accessible, violating data protection policy.",
        "affected_resources": ["s3://customer-data-backup", "us-east-1"],
        "security_event_data": {
            "resource_type": "s3_bucket",
            "policy_violation": "public_read",
            "contains_pii": True,
            "remediation": "restrict_bucket_policy"
        },
        "detected_at": (datetime.now() - timedelta(days=1)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001", "SOC2"]
    },
    {
        "event_type": "configuration_change",
        "event_source": "CSPM",
        "source_tool": "Azure Security Center",
        "severity": "low",
        "title": "Security Group Rule Modified",
        "description": "Network security group rule allowing inbound traffic from 0.0.0.0/0 was added to production subnet.",
        "affected_resources": ["nsg-prod-web", "subnet-prod-01"],
        "security_event_data": {
            "change_type": "security_group_rule_added",
            "changed_by": "user:admin",
            "risk_level": "medium",
            "requires_approval": True
        },
        "detected_at": (datetime.now() - timedelta(days=2)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001"]
    },
    {
        "event_type": "threat_detected",
        "event_source": "EDR",
        "source_tool": "Microsoft Defender",
        "severity": "high",
        "title": "Suspicious PowerShell Execution Pattern",
        "description": "PowerShell script with obfuscated code executed on multiple endpoints. Potential lateral movement.",
        "affected_resources": ["endpoint-01", "endpoint-02", "endpoint-03"],
        "security_event_data": {
            "threat_type": "suspicious_script",
            "script_type": "powershell",
            "endpoints_affected": 3,
            "containment_status": "in_progress"
        },
        "detected_at": (datetime.now() - timedelta(days=3)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001", "SOC2", "CIS"]
    },
    {
        "event_type": "vulnerability_found",
        "event_source": "Vulnerability Scanner",
        "source_tool": "Qualys VMDR",
        "severity": "medium",
        "title": "Outdated SSL/TLS Configuration",
        "description": "TLS 1.0 and 1.1 protocols still enabled on multiple web servers. Should be disabled per security policy.",
        "affected_resources": ["prod-web-01", "prod-web-02", "staging-web-01"],
        "security_event_data": {
            "vulnerability_type": "weak_crypto",
            "affected_services": ["https", "ldaps"],
            "compliance_impact": "PCI-DSS",
            "remediation_difficulty": "low"
        },
        "detected_at": (datetime.now() - timedelta(days=4)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001"]
    },
    {
        "event_type": "data_breach",
        "event_source": "SIEM",
        "source_tool": "Splunk Enterprise Security",
        "severity": "critical",
        "title": "Potential Data Exfiltration Detected",
        "description": "Large volume of data transfer detected from internal database server to external IP. Potential data breach.",
        "affected_resources": ["db-prod-01", "203.0.113.45", "user:service_account"],
        "security_event_data": {
            "data_volume": "2.5GB",
            "destination_ip": "203.0.113.45",
            "data_type": "customer_records",
            "incident_status": "under_investigation"
        },
        "detected_at": (datetime.now() - timedelta(days=5)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001", "SOC2"]
    }
]

def ingest_security_event(event_data):
    """Ingest a single security event"""
    url = f"{API_BASE_URL}/api/security-events"
    headers = {
        "Content-Type": "application/json",
        "X-User-Id": str(USER_ID)
    }
    
    try:
        response = requests.post(url, json=event_data, headers=headers)
        response.raise_for_status()
        result = response.json()
        print(f"✅ Ingested: {event_data['title']}")
        print(f"   Event ID: {result.get('id')}, Mappings: {result.get('mappings')}")
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ Error ingesting {event_data['title']}: {e}")
        if hasattr(e.response, 'text'):
            print(f"   Response: {e.response.text}")
        return None

def main():
    print("=" * 60)
    print("CSCA Security Event Ingestion Test Script")
    print("=" * 60)
    print(f"API URL: {API_BASE_URL}")
    print(f"User ID: {USER_ID}")
    print(f"Events to ingest: {len(SAMPLE_EVENTS)}")
    print("-" * 60)
    
    # Check if API is accessible
    try:
        response = requests.get(f"{API_BASE_URL}/docs")
        print("✅ API server is accessible")
    except requests.exceptions.RequestException:
        print("❌ ERROR: Cannot reach API server. Make sure FastAPI is running on port 8000")
        return
    
    print("\nIngesting security events...\n")
    
    results = []
    for i, event in enumerate(SAMPLE_EVENTS, 1):
        print(f"[{i}/{len(SAMPLE_EVENTS)}] {event['title']}")
        result = ingest_security_event(event)
        if result:
            results.append(result)
        print()
    
    print("=" * 60)
    print("Ingestion Summary")
    print("=" * 60)
    print(f"Successfully ingested: {len(results)}/{len(SAMPLE_EVENTS)}")
    
    if results:
        print("\n✅ Sample events have been ingested successfully!")
        print("\nNext steps:")
        print("1. Open the frontend and navigate to 'Security-Compliance Alignment'")
        print("2. View the security events and their compliance impact")
        print("3. Check compliance alerts for any score degradations")
        print("\nTo view events via API:")
        print(f"   GET {API_BASE_URL}/api/security-events (with X-User-Id: {USER_ID} header)")
        print(f"   GET {API_BASE_URL}/api/compliance-alerts (with X-User-Id: {USER_ID} header)")

if __name__ == "__main__":
    main()

