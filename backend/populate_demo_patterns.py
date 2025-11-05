#!/usr/bin/env python3
"""
Populate demo pattern detection data for testing
This script creates demo security events and runs pattern detection
"""
import requests
import json
from datetime import datetime, timedelta
import random

API_BASE_URL = "http://localhost:8000"
USER_ID = 1  # Assuming user ID 1 exists

# Additional demo security events to create patterns
DEMO_PATTERN_EVENTS = [
    # Multiple threat_detected events (recurring pattern)
    {
        "event_type": "threat_detected",
        "event_source": "SIEM",
        "source_tool": "Splunk Enterprise Security",
        "severity": "critical",
        "title": "Malware Detected on Database Server",
        "description": "Suspicious database queries detected from external IP",
        "affected_resources": ["db-prod-02", "10.0.2.45"],
        "detected_at": (datetime.now() - timedelta(days=3)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001", "SOC2"]
    },
    {
        "event_type": "threat_detected",
        "event_source": "EDR",
        "source_tool": "CrowdStrike Falcon",
        "severity": "high",
        "title": "Ransomware Indicators Detected",
        "description": "Multiple files encrypted with suspicious patterns",
        "affected_resources": ["file-server-01"],
        "detected_at": (datetime.now() - timedelta(days=5)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001"]
    },
    {
        "event_type": "threat_detected",
        "event_source": "SIEM",
        "source_tool": "Splunk Enterprise Security",
        "severity": "critical",
        "title": "Lateral Movement Detected",
        "description": "Unauthorized access spreading across network segments",
        "affected_resources": ["prod-web-01", "prod-api-01", "db-prod-01"],
        "detected_at": (datetime.now() - timedelta(days=7)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001", "SOC2"]
    },
    # Multiple events from same source (source tool pattern)
    {
        "event_type": "vulnerability_found",
        "event_source": "Vulnerability Scanner",
        "source_tool": "Tenable.io",
        "severity": "high",
        "title": "Critical CVE in MySQL Database",
        "description": "Remote code execution vulnerability in MySQL 8.0.28",
        "affected_resources": ["db-prod-01", "db-prod-02"],
        "detected_at": (datetime.now() - timedelta(days=4)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001"]
    },
    {
        "event_type": "vulnerability_found",
        "event_source": "Vulnerability Scanner",
        "source_tool": "Tenable.io",
        "severity": "medium",
        "title": "SSL/TLS Weak Cipher Suites",
        "description": "Weak cipher suites detected in SSL/TLS configuration",
        "affected_resources": ["prod-web-01", "prod-web-02"],
        "detected_at": (datetime.now() - timedelta(days=6)).isoformat(),
        "frameworks": ["NIST_800-53"]
    },
    {
        "event_type": "vulnerability_found",
        "event_source": "Vulnerability Scanner",
        "source_tool": "Tenable.io",
        "severity": "high",
        "title": "Outdated Docker Container Images",
        "description": "Container images with known vulnerabilities detected",
        "affected_resources": ["k8s-cluster-01"],
        "detected_at": (datetime.now() - timedelta(days=8)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001"]
    },
    # Policy violations (pattern)
    {
        "event_type": "policy_violation",
        "event_source": "CSPM",
        "source_tool": "AWS Security Hub",
        "severity": "medium",
        "title": "EC2 Instance Without Encryption",
        "description": "EC2 instance found without encryption at rest",
        "affected_resources": ["ec2-prod-01"],
        "detected_at": (datetime.now() - timedelta(days=2)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001"]
    },
    {
        "event_type": "policy_violation",
        "event_source": "CSPM",
        "source_tool": "AWS Security Hub",
        "severity": "medium",
        "title": "CloudTrail Logging Disabled",
        "description": "CloudTrail found disabled for production account",
        "affected_resources": ["aws-prod-account"],
        "detected_at": (datetime.now() - timedelta(days=9)).isoformat(),
        "frameworks": ["NIST_800-53", "SOC2"]
    },
    # Spike detection (many events on same day)
    {
        "event_type": "incident",
        "event_source": "EDR",
        "source_tool": "Microsoft Defender",
        "severity": "high",
        "title": "Phishing Email Campaign Detected",
        "description": "Multiple users received phishing emails with malicious attachments",
        "affected_resources": ["user:john.doe", "user:jane.smith", "user:admin"],
        "detected_at": (datetime.now() - timedelta(days=1, hours=10)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001"]
    },
    {
        "event_type": "incident",
        "event_source": "EDR",
        "source_tool": "Microsoft Defender",
        "severity": "medium",
        "title": "Suspicious Email Attachment",
        "description": "User attempted to open suspicious attachment",
        "affected_resources": ["user:john.doe"],
        "detected_at": (datetime.now() - timedelta(days=1, hours=8)).isoformat(),
        "frameworks": ["NIST_800-53"]
    },
    {
        "event_type": "incident",
        "event_source": "EDR",
        "source_tool": "Microsoft Defender",
        "severity": "high",
        "title": "Macro-Enabled Document Blocked",
        "description": "Malicious macro in Office document blocked",
        "affected_resources": ["user:jane.smith"],
        "detected_at": (datetime.now() - timedelta(days=1, hours=6)).isoformat(),
        "frameworks": ["NIST_800-53", "ISO27001"]
    },
    {
        "event_type": "incident",
        "event_source": "EDR",
        "source_tool": "Microsoft Defender",
        "severity": "medium",
        "title": "Suspicious PowerShell Execution",
        "description": "PowerShell script executed from email attachment",
        "affected_resources": ["endpoint-05"],
        "detected_at": (datetime.now() - timedelta(days=1, hours=4)).isoformat(),
        "frameworks": ["NIST_800-53"]
    },
    {
        "event_type": "incident",
        "event_source": "EDR",
        "source_tool": "Microsoft Defender",
        "severity": "high",
        "title": "Data Exfiltration Attempt",
        "description": "Large volume of data transfer to external destination",
        "affected_resources": ["endpoint-05", "203.0.113.45"],
        "detected_at": (datetime.now() - timedelta(days=1, hours=2)).isoformat(),
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
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ Error ingesting {event_data['title']}: {e}")
        return None

def run_pattern_detection():
    """Run pattern detection on ingested events"""
    url = f"{API_BASE_URL}/api/patterns/detect"
    headers = {
        "X-User-Id": str(USER_ID)
    }
    
    try:
        response = requests.post(url, headers=headers, params={"lookback_days": 30})
        response.raise_for_status()
        result = response.json()
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ Error running pattern detection: {e}")
        return None

def main():
    print("=" * 60)
    print("Demo Pattern Data Population Script")
    print("=" * 60)
    print(f"API URL: {API_BASE_URL}")
    print(f"User ID: {USER_ID}")
    print("-" * 60)
    
    # Check if API is accessible
    try:
        response = requests.get(f"{API_BASE_URL}/docs")
        print("✅ API server is accessible")
    except requests.exceptions.RequestException:
        print("❌ ERROR: Cannot reach API server. Make sure FastAPI is running on port 8000")
        return
    
    print("\nIngesting security events for pattern detection...\n")
    
    # Ingest events
    results = []
    for i, event in enumerate(DEMO_PATTERN_EVENTS, 1):
        print(f"[{i}/{len(DEMO_PATTERN_EVENTS)}] {event['title']}")
        result = ingest_security_event(event)
        if result:
            results.append(result)
        print()
    
    print("=" * 60)
    print(f"Successfully ingested: {len(results)}/{len(DEMO_PATTERN_EVENTS)} events")
    print("-" * 60)
    
    # Run pattern detection
    print("\nRunning pattern detection...")
    pattern_result = run_pattern_detection()
    
    if pattern_result:
        print(f"✅ Pattern detection complete!")
        print(f"   Patterns detected: {pattern_result.get('patterns_detected', 0)}")
        if pattern_result.get('patterns'):
            print("\n   Detected patterns:")
            for pattern in pattern_result['patterns']:
                print(f"   - {pattern.get('pattern_name')} ({pattern.get('pattern_type')})")
                print(f"     Confidence: {pattern.get('confidence_score', 0)*100:.0f}%")
                print(f"     Occurrences: {pattern.get('occurrence_count', 0)}")
    else:
        print("❌ Pattern detection failed")
    
    print("\n" + "=" * 60)
    print("✅ Demo data population complete!")
    print("\nNext steps:")
    print("1. Refresh the frontend and navigate to 'Security-Compliance Alignment'")
    print("2. View the detected patterns in the 'Pattern Detection & Trend Analysis' section")
    print("3. Check pattern alerts for trend notifications")
    print("\nTo view patterns via API:")
    print(f"   GET {API_BASE_URL}/api/patterns (with X-User-Id: {USER_ID} header)")
    print(f"   GET {API_BASE_URL}/api/pattern-alerts (with X-User-Id: {USER_ID} header)")

if __name__ == "__main__":
    main()

