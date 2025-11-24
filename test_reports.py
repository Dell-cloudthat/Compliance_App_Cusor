#!/usr/bin/env python3
"""
Test script for report generation endpoints
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
USER_ID = 1

def create_test_audit():
    """Create a test audit"""
    audit_data = {
        "audit_name": "SOC 2 Type II - Q1 2024",
        "framework": "SOC2",
        "audit_type": "Type II",
        "auditor_name": "Test Auditor Firm",
        "auditor_contact": "auditor@test.com",
        "start_date": "2024-01-01",
        "end_date": "2024-03-31",
        "scope": ["CC1.1", "CC1.2", "CC2.1", "CC2.2", "CC3.1", "CC4.1", "CC5.1", "CC6.1", "CC7.1"]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/audits",
        json=audit_data,
        headers={"X-User-Id": str(USER_ID)}
    )
    
    if response.status_code == 200:
        audit = response.json()
        print(f"✓ Created test audit: {audit['id']} - {audit['audit_name']}")
        return audit['id']
    else:
        print(f"✗ Failed to create audit: {response.status_code} - {response.text}")
        return None

def add_test_findings(audit_id):
    """Add test findings"""
    findings = [
        {
            "control_id": "CC1.1",
            "finding_type": "observation",
            "severity": "medium",
            "description": "Control documentation needs improvement",
            "remediation_plan": "Update control documentation with detailed procedures",
            "assigned_to": "Security Team",
            "due_date": "2024-02-15",
            "status": "open"
        },
        {
            "control_id": "CC2.1",
            "finding_type": "deficiency",
            "severity": "high",
            "description": "Access reviews not performed quarterly",
            "remediation_plan": "Implement quarterly access review process",
            "assigned_to": "IAM Team",
            "due_date": "2024-02-01",
            "status": "in_progress"
        },
        {
            "control_id": "CC7.1",
            "finding_type": "observation",
            "severity": "low",
            "description": "Monitoring alerts could be more comprehensive",
            "remediation_plan": "Enhance monitoring coverage",
            "assigned_to": "SOC Team",
            "due_date": "2024-03-01",
            "status": "open"
        }
    ]
    
    added = 0
    for finding in findings:
        response = requests.post(
            f"{BASE_URL}/api/audits/{audit_id}/findings",
            json=finding,
            headers={"X-User-Id": str(USER_ID)}
        )
        if response.status_code == 200:
            added += 1
        else:
            print(f"  ✗ Failed to add finding: {response.status_code}")
    
    print(f"✓ Added {added}/{len(findings)} test findings")
    return added

def add_test_evidence(audit_id):
    """Add test evidence"""
    evidence = [
        {
            "control_id": "CC1.1",
            "evidence_type": "document",
            "evidence_name": "Control Documentation - CC1.1",
            "file_url": "https://example.com/evidence/cc1.1.pdf",
            "file_size_bytes": 102400,
            "expiration_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "notes": "Control documentation for CC1.1",
            "metadata": {"source": "manual_upload"}
        },
        {
            "control_id": "CC2.1",
            "evidence_type": "api_data",
            "evidence_name": "Access Review Logs - Q4 2023",
            "file_url": "https://example.com/evidence/access-reviews.json",
            "file_size_bytes": 51200,
            "expiration_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "notes": "Quarterly access review evidence",
            "metadata": {"source": "automated_collection", "integration_type": "identity_provider"}
        },
        {
            "control_id": "CC3.1",
            "evidence_type": "configuration",
            "evidence_name": "System Configuration Snapshot",
            "file_url": "https://example.com/evidence/config-snapshot.json",
            "file_size_bytes": 25600,
            "expiration_date": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
            "notes": "System configuration evidence",
            "metadata": {"source": "automated_collection"}
        },
        {
            "control_id": "CC4.1",
            "evidence_type": "api_data",
            "evidence_name": "Monitoring Logs - January 2024",
            "file_url": "https://example.com/evidence/monitoring-logs.json",
            "file_size_bytes": 204800,
            "expiration_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "notes": "Security monitoring evidence",
            "metadata": {"source": "automated_collection", "integration_type": "siem"}
        }
    ]
    
    added = 0
    for ev in evidence:
        response = requests.post(
            f"{BASE_URL}/api/audits/{audit_id}/evidence",
            json=ev,
            headers={"X-User-Id": str(USER_ID)}
        )
        if response.status_code == 200:
            added += 1
        else:
            print(f"  ✗ Failed to add evidence: {response.status_code} - {response.text}")
    
    print(f"✓ Added {added}/{len(evidence)} test evidence items")
    return added

def test_full_report(audit_id):
    """Test full audit report generation"""
    print("\n📄 Testing Full Audit Report Generation...")
    response = requests.get(
        f"{BASE_URL}/api/audits/{audit_id}/reports/full",
        headers={"X-User-Id": str(USER_ID)}
    )
    
    if response.status_code == 200:
        report = response.json()
        print(f"✓ Full report generated successfully")
        print(f"  - Report Type: {report.get('report_type')}")
        print(f"  - Audit: {report.get('audit_info', {}).get('audit_name')}")
        print(f"  - Readiness Score: {report.get('executive_summary', {}).get('readiness_score', 'N/A')}%")
        print(f"  - Total Findings: {report.get('findings_summary', {}).get('total', 0)}")
        print(f"  - Total Evidence: {report.get('evidence_inventory', {}).get('total_evidence', 0)}")
        
        # Save to file
        with open(f"test_full_report_{audit_id}.json", "w") as f:
            json.dump(report, f, indent=2)
        print(f"  - Saved to: test_full_report_{audit_id}.json")
        return True
    else:
        print(f"✗ Failed to generate full report: {response.status_code} - {response.text}")
        return False

def test_evidence_package(audit_id):
    """Test evidence package generation"""
    print("\n📦 Testing Evidence Package Generation...")
    response = requests.get(
        f"{BASE_URL}/api/audits/{audit_id}/reports/evidence-package",
        headers={"X-User-Id": str(USER_ID)}
    )
    
    if response.status_code == 200:
        package = response.json()
        print(f"✓ Evidence package generated successfully")
        print(f"  - Report Type: {package.get('report_type')}")
        print(f"  - Total Evidence: {package.get('package_summary', {}).get('total_evidence', 0)}")
        print(f"  - Validated: {package.get('package_summary', {}).get('validated_evidence', 0)}")
        print(f"  - Controls Covered: {package.get('package_summary', {}).get('controls_covered', 0)}")
        
        # Save to file
        with open(f"test_evidence_package_{audit_id}.json", "w") as f:
            json.dump(package, f, indent=2)
        print(f"  - Saved to: test_evidence_package_{audit_id}.json")
        return True
    else:
        print(f"✗ Failed to generate evidence package: {response.status_code} - {response.text}")
        return False

def test_executive_summary(audit_id):
    """Test executive summary generation"""
    print("\n📊 Testing Executive Summary Generation...")
    response = requests.get(
        f"{BASE_URL}/api/audits/{audit_id}/reports/executive-summary",
        headers={"X-User-Id": str(USER_ID)}
    )
    
    if response.status_code == 200:
        summary = response.json()
        print(f"✓ Executive summary generated successfully")
        print(f"  - Report Type: {summary.get('report_type')}")
        print(f"  - Readiness Score: {summary.get('key_metrics', {}).get('readiness_score', 'N/A')}%")
        print(f"  - Assessment Level: {summary.get('key_metrics', {}).get('assessment_level', 'N/A')}")
        print(f"  - Total Findings: {summary.get('key_metrics', {}).get('total_findings', 0)}")
        print(f"  - Critical Findings: {summary.get('key_metrics', {}).get('critical_findings', 0)}")
        print(f"  - Recommendations: {len(summary.get('recommendations', []))}")
        
        # Save to file
        with open(f"test_executive_summary_{audit_id}.json", "w") as f:
            json.dump(summary, f, indent=2)
        print(f"  - Saved to: test_executive_summary_{audit_id}.json")
        return True
    else:
        print(f"✗ Failed to generate executive summary: {response.status_code} - {response.text}")
        return False

def main():
    print("🧪 Testing Report Generation System\n")
    print("=" * 50)
    
    # Step 1: Create test audit
    print("\n1. Creating test audit...")
    audit_id = create_test_audit()
    
    if not audit_id:
        print("\n❌ Cannot proceed without audit. Exiting.")
        return
    
    # Step 2: Add test data
    print("\n2. Adding test data...")
    add_test_findings(audit_id)
    add_test_evidence(audit_id)
    
    # Step 3: Test report generation
    print("\n3. Testing report generation endpoints...")
    print("=" * 50)
    
    results = {
        "full_report": test_full_report(audit_id),
        "evidence_package": test_evidence_package(audit_id),
        "executive_summary": test_executive_summary(audit_id)
    }
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary")
    print("=" * 50)
    print(f"✓ Full Report: {'PASS' if results['full_report'] else 'FAIL'}")
    print(f"✓ Evidence Package: {'PASS' if results['evidence_package'] else 'FAIL'}")
    print(f"✓ Executive Summary: {'PASS' if results['executive_summary'] else 'FAIL'}")
    
    all_passed = all(results.values())
    print(f"\n{'✅ All tests passed!' if all_passed else '❌ Some tests failed'}")
    print(f"\nTest audit ID: {audit_id}")
    print("You can view the generated reports in the current directory.")

if __name__ == "__main__":
    main()

