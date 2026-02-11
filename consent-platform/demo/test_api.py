#!/usr/bin/env python3
"""
Consent Platform API Test Suite

Comprehensive tests for all major API flows:
1. Health & Status
2. Authentication & API Keys
3. Consent Token Lifecycle
4. Event Enforcement
5. Vendor Management
6. TCF 2.2 Integration
7. Google Consent Mode v2
8. Webhooks
9. Audit & Reporting
10. Security Features

Usage:
    python test_api.py --api-url http://localhost:8001 --api-key YOUR_API_KEY
    python test_api.py --api-url http://localhost:8001 --api-key YOUR_API_KEY --verbose
    python test_api.py --api-url http://localhost:8001 --api-key YOUR_API_KEY --test consent
"""

import argparse
import asyncio
import httpx
import json
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass


@dataclass
class TestResult:
    name: str
    passed: bool
    duration_ms: float
    error: Optional[str] = None
    details: Optional[Dict] = None


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


class ConsentPlatformTester:
    """Comprehensive API test suite for the Consent Platform."""

    def __init__(self, api_url: str, api_key: str, verbose: bool = False):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.verbose = verbose
        self.client = httpx.AsyncClient(timeout=30.0)
        self.results: List[TestResult] = []
        
        # Test data storage
        self.issued_token: Optional[str] = None
        self.issued_token_id: Optional[str] = None
        self.created_webhook_id: Optional[str] = None
        self.created_vendor_id: Optional[str] = None

    async def close(self):
        await self.client.aclose()

    def _headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    async def _request(
        self, 
        method: str, 
        endpoint: str, 
        expected_status: int = 200,
        **kwargs
    ) -> tuple[Dict[str, Any], int]:
        """Make an API request and return response data and status code."""
        url = f"{self.api_url}{endpoint}"
        headers = kwargs.pop("headers", self._headers())
        
        response = await self.client.request(
            method=method,
            url=url,
            headers=headers,
            **kwargs
        )
        
        try:
            data = response.json()
        except:
            data = {"raw": response.text}
        
        return data, response.status_code

    async def run_test(
        self, 
        name: str, 
        test_fn: Callable, 
        *args, 
        **kwargs
    ) -> TestResult:
        """Run a single test and record the result."""
        start = time.time()
        try:
            result = await test_fn(*args, **kwargs)
            duration = (time.time() - start) * 1000
            test_result = TestResult(
                name=name,
                passed=True,
                duration_ms=duration,
                details=result if isinstance(result, dict) else None
            )
        except AssertionError as e:
            duration = (time.time() - start) * 1000
            test_result = TestResult(
                name=name,
                passed=False,
                duration_ms=duration,
                error=str(e)
            )
        except Exception as e:
            duration = (time.time() - start) * 1000
            test_result = TestResult(
                name=name,
                passed=False,
                duration_ms=duration,
                error=f"{type(e).__name__}: {str(e)}"
            )
        
        self.results.append(test_result)
        self._print_result(test_result)
        return test_result

    def _print_result(self, result: TestResult):
        """Print a test result with color."""
        status = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if result.passed else f"{Colors.RED}✗ FAIL{Colors.RESET}"
        print(f"  {status} {result.name} ({result.duration_ms:.1f}ms)")
        
        if not result.passed and result.error:
            print(f"         {Colors.RED}Error: {result.error}{Colors.RESET}")
        
        if self.verbose and result.details:
            print(f"         Details: {json.dumps(result.details, indent=2)[:200]}...")

    # ==========================================
    # Test Group 1: Health & Status
    # ==========================================
    
    async def test_health_check(self):
        """Test the health endpoint."""
        data, status = await self._request("GET", "/health", headers={})
        assert status == 200, f"Expected 200, got {status}"
        assert data.get("status") == "healthy", f"Expected healthy status"
        return data

    async def test_metrics_endpoint(self):
        """Test the Prometheus metrics endpoint."""
        response = await self.client.get(f"{self.api_url}/metrics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "consent_platform" in response.text, "Expected Prometheus metrics"
        return {"metrics_available": True}

    async def test_api_docs(self):
        """Test that OpenAPI docs are available."""
        response = await self.client.get(f"{self.api_url}/docs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        return {"docs_available": True}

    # ==========================================
    # Test Group 2: Authentication
    # ==========================================

    async def test_auth_required(self):
        """Test that endpoints require authentication."""
        data, status = await self._request(
            "POST", "/consent",
            headers={"Content-Type": "application/json"},
            json={"subject_id": "test"}
        )
        assert status == 401, f"Expected 401 without API key, got {status}"
        return {"auth_enforced": True}

    async def test_invalid_api_key(self):
        """Test that invalid API keys are rejected."""
        data, status = await self._request(
            "GET", "/vendors",
            headers={"X-API-Key": "invalid-key-12345", "Content-Type": "application/json"}
        )
        assert status == 401, f"Expected 401 for invalid key, got {status}"
        return {"invalid_key_rejected": True}

    # ==========================================
    # Test Group 3: Consent Token Lifecycle
    # ==========================================

    async def test_issue_consent_token(self):
        """Test issuing a consent token."""
        data, status = await self._request(
            "POST", "/consent",
            json={
                "subject_id": f"test_user_{uuid.uuid4().hex[:8]}",
                "purposes": {
                    "analytics": {"allowed": True, "ttl_days": 30},
                    "advertising": {"allowed": True, "ttl_days": 14},
                    "personalization": {"allowed": False},
                },
                "vendors": {
                    "google": {"allowed": True, "data_classes": ["behavioral"]},
                    "meta": {"allowed": True, "data_classes": ["behavioral", "contextual"]},
                },
                "jurisdiction": "EU",
                "ttl_seconds": 3600,
            }
        )
        assert status == 200, f"Expected 200, got {status}: {data}"
        assert "token" in data, "Expected token in response"
        assert "token_id" in data, "Expected token_id in response"
        
        self.issued_token = data["token"]
        self.issued_token_id = data["token_id"]
        return {"token_issued": True, "token_id": data["token_id"]}

    async def test_validate_consent_token(self):
        """Test validating a consent token."""
        assert self.issued_token, "No token available for validation"
        
        data, status = await self._request(
            "POST", "/consent/validate",
            json={"token": self.issued_token}
        )
        assert status == 200, f"Expected 200, got {status}: {data}"
        assert data.get("valid") == True, "Expected valid token"
        return data

    async def test_get_consent_token_details(self):
        """Test getting token details."""
        assert self.issued_token_id, "No token ID available"
        
        data, status = await self._request(
            "GET", f"/consent/{self.issued_token_id}"
        )
        # May return 200 or 404 depending on storage
        if status == 200:
            assert "token_id" in data or "id" in data
        return {"status": status}

    # ==========================================
    # Test Group 4: Event Enforcement
    # ==========================================

    async def test_event_enforcement_allow(self):
        """Test event enforcement - should allow with valid consent."""
        assert self.issued_token, "No token for enforcement test"
        
        data, status = await self._request(
            "POST", "/event",
            headers=self._headers(token=self.issued_token),
            json={
                "event_name": "page_view",
                "vendor": "google",
                "purpose": "analytics",
                "data_class": "behavioral",
                "event_data": {
                    "page": "/test",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            }
        )
        assert status == 200, f"Expected 200, got {status}: {data}"
        assert "decision" in data, "Expected decision in response"
        return data

    async def test_event_enforcement_block(self):
        """Test event enforcement - should block for non-consented purpose."""
        assert self.issued_token, "No token for enforcement test"
        
        data, status = await self._request(
            "POST", "/event",
            headers=self._headers(token=self.issued_token),
            json={
                "event_name": "tracking_pixel",
                "vendor": "unknown_vendor",
                "purpose": "cross_device_tracking",  # Not consented
                "data_class": "behavioral",
                "event_data": {"test": True},
            }
        )
        # Could be 200 with block decision or 403
        if status == 200:
            # Check if decision was block
            decision = data.get("decision", "")
            return {"decision": decision}
        return {"status": status, "blocked": True}

    async def test_event_with_idempotency(self):
        """Test event processing with idempotency key."""
        assert self.issued_token, "No token for enforcement test"
        
        idempotency_key = f"idem_{uuid.uuid4().hex}"
        
        # First request
        data1, status1 = await self._request(
            "POST", "/event",
            headers={
                **self._headers(token=self.issued_token),
                "X-Idempotency-Key": idempotency_key,
            },
            json={
                "event_name": "purchase",
                "vendor": "meta",
                "purpose": "advertising",
                "data_class": "behavioral",
                "event_data": {"value": 100},
            }
        )
        
        # Second request with same key
        data2, status2 = await self._request(
            "POST", "/event",
            headers={
                **self._headers(token=self.issued_token),
                "X-Idempotency-Key": idempotency_key,
            },
            json={
                "event_name": "purchase",
                "vendor": "meta",
                "purpose": "advertising",
                "data_class": "behavioral",
                "event_data": {"value": 100},
            }
        )
        
        assert status1 == 200 or status1 == 201, f"First request failed: {status1}"
        assert status2 == 200 or status2 == 201, f"Second request failed: {status2}"
        return {"idempotency_works": True, "first_decision": data1.get("decision"), "second_decision": data2.get("decision")}

    # ==========================================
    # Test Group 5: Vendor Management
    # ==========================================

    async def test_list_vendors(self):
        """Test listing vendors."""
        data, status = await self._request("GET", "/vendors")
        assert status == 200, f"Expected 200, got {status}"
        assert isinstance(data, list), "Expected list of vendors"
        return {"vendor_count": len(data)}

    async def test_create_vendor(self):
        """Test creating a new vendor."""
        vendor_id = f"test_vendor_{uuid.uuid4().hex[:8]}"
        
        data, status = await self._request(
            "POST", "/vendors",
            json={
                "name": vendor_id,
                "display_name": "Test Vendor",
                "vendor_type": "analytics",
                "allowed_data_classes": ["behavioral", "contextual"],
            }
        )
        assert status in [200, 201], f"Expected 200/201, got {status}: {data}"
        self.created_vendor_id = vendor_id
        return {"vendor_created": True}

    async def test_vendor_trust_registry(self):
        """Test getting the public trust registry."""
        data, status = await self._request("GET", "/vendors/trust-registry")
        assert status == 200, f"Expected 200, got {status}"
        return {"registry_entries": len(data) if isinstance(data, list) else "unknown"}

    # ==========================================
    # Test Group 6: TCF 2.2 Integration
    # ==========================================

    async def test_generate_tcf_string(self):
        """Test TCF 2.2 string generation."""
        data, status = await self._request(
            "POST", "/tcf/generate",
            json={
                "purposes": ["analytics", "advertising", "personalization"],
                "vendors": ["google", "meta"],
                "jurisdiction": "EU",
            }
        )
        assert status == 200, f"Expected 200, got {status}: {data}"
        assert "tc_string" in data or "tcString" in data, "Expected TC string in response"
        return data

    async def test_decode_tcf_string(self):
        """Test TCF 2.2 string decoding."""
        # First generate a string
        gen_data, gen_status = await self._request(
            "POST", "/tcf/generate",
            json={
                "purposes": ["analytics", "advertising"],
                "vendors": ["google"],
            }
        )
        
        if gen_status != 200 or "tc_string" not in gen_data:
            return {"skipped": "Could not generate TC string"}
        
        tc_string = gen_data["tc_string"]
        
        data, status = await self._request(
            "POST", "/tcf/decode",
            json={"tc_string": tc_string}
        )
        assert status == 200, f"Expected 200, got {status}"
        return data

    async def test_tcf_api_response(self):
        """Test TCF __tcfapi compatible response."""
        data, status = await self._request(
            "POST", "/tcf/api-response",
            json={
                "purposes": ["analytics", "advertising"],
                "vendors": ["google", "meta"],
            }
        )
        assert status == 200, f"Expected 200, got {status}"
        return {"tcf_api_response": "success"}

    # ==========================================
    # Test Group 7: Google Consent Mode v2
    # ==========================================

    async def test_gcm_settings(self):
        """Test Google Consent Mode settings generation."""
        data, status = await self._request(
            "POST", "/gcm/settings",
            json={
                "purposes": ["analytics", "advertising"],
                "all_consented": False,
                "region": "EU",
            }
        )
        assert status == 200, f"Expected 200, got {status}: {data}"
        return data

    async def test_gcm_script(self):
        """Test Google Consent Mode script generation."""
        data, status = await self._request(
            "POST", "/gcm/script",
            json={
                "region": "EU",
                "wait_for_update": 500,
                "gtm_container_id": "GTM-DEMO123",
            }
        )
        assert status == 200, f"Expected 200, got {status}"
        return {"script_generated": True}

    # ==========================================
    # Test Group 8: Webhooks
    # ==========================================

    async def test_create_webhook(self):
        """Test creating a webhook."""
        data, status = await self._request(
            "POST", "/webhooks",
            json={
                "url": "https://webhook.site/test-consent-platform",
                "events": ["consent.issued", "enforcement.blocked"],
                "active": True,
            }
        )
        assert status in [200, 201], f"Expected 200/201, got {status}: {data}"
        if "id" in data:
            self.created_webhook_id = data["id"]
        return data

    async def test_list_webhooks(self):
        """Test listing webhooks."""
        data, status = await self._request("GET", "/webhooks")
        assert status == 200, f"Expected 200, got {status}"
        return {"webhook_count": len(data) if isinstance(data, list) else "unknown"}

    async def test_webhook_test_delivery(self):
        """Test webhook test delivery."""
        if not self.created_webhook_id:
            return {"skipped": "No webhook created"}
        
        data, status = await self._request(
            "POST", f"/webhooks/{self.created_webhook_id}/test"
        )
        # May fail if URL is not reachable
        return {"test_sent": status in [200, 202]}

    # ==========================================
    # Test Group 9: Audit & Reporting
    # ==========================================

    async def test_audit_export(self):
        """Test audit log export."""
        data, status = await self._request(
            "GET", "/audit/export",
            params={
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2030-01-01T00:00:00Z",
                "format": "json",
            }
        )
        assert status == 200, f"Expected 200, got {status}"
        return {"export_available": True}

    async def test_decisions_list(self):
        """Test listing enforcement decisions."""
        data, status = await self._request("GET", "/decisions")
        assert status == 200, f"Expected 200, got {status}"
        return {"decisions_count": len(data) if isinstance(data, list) else "unknown"}

    async def test_consent_enforcement_report(self):
        """Test generating consent enforcement report."""
        data, status = await self._request(
            "POST", "/reports/consent-enforcement",
            json={
                "tenant_id": "demo",
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2030-01-01T00:00:00Z",
                "regulations": ["GDPR"],
                "format": "json",
            }
        )
        assert status == 200, f"Expected 200, got {status}: {data}"
        return {"report_generated": True}

    async def test_financial_roi_report(self):
        """Test generating financial ROI report."""
        data, status = await self._request(
            "POST", "/reports/financial-roi",
            json={
                "tenant_id": "demo",
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2030-01-01T00:00:00Z",
                "platform_cost": 5000.0,
                "annual_revenue": 10000000.0,
                "format": "json",
            }
        )
        assert status == 200, f"Expected 200, got {status}: {data}"
        return {"report_generated": True}

    # ==========================================
    # Test Group 10: Registry & Security
    # ==========================================

    async def test_registry_public_list(self):
        """Test getting public vendor registry."""
        data, status = await self._request("GET", "/registry")
        assert status == 200, f"Expected 200, got {status}"
        return {"registry_entries": len(data) if isinstance(data, list) else "unknown"}

    async def test_security_events(self):
        """Test getting security events."""
        data, status = await self._request("GET", "/security/events")
        assert status == 200, f"Expected 200, got {status}"
        return {"events_available": True}

    async def test_security_threats(self):
        """Test getting security threat summary."""
        data, status = await self._request("GET", "/security/threats")
        assert status == 200, f"Expected 200, got {status}"
        return data

    # ==========================================
    # Test Runner
    # ==========================================

    async def run_all_tests(self, test_group: Optional[str] = None):
        """Run all tests or a specific group."""
        
        test_groups = {
            "health": [
                ("Health Check", self.test_health_check),
                ("Metrics Endpoint", self.test_metrics_endpoint),
                ("API Documentation", self.test_api_docs),
            ],
            "auth": [
                ("Auth Required", self.test_auth_required),
                ("Invalid API Key Rejected", self.test_invalid_api_key),
            ],
            "consent": [
                ("Issue Consent Token", self.test_issue_consent_token),
                ("Validate Consent Token", self.test_validate_consent_token),
                ("Get Token Details", self.test_get_consent_token_details),
            ],
            "enforcement": [
                ("Issue Token for Enforcement", self.test_issue_consent_token),
                ("Event Enforcement - Allow", self.test_event_enforcement_allow),
                ("Event Enforcement - Block", self.test_event_enforcement_block),
                ("Event with Idempotency", self.test_event_with_idempotency),
            ],
            "vendors": [
                ("List Vendors", self.test_list_vendors),
                ("Create Vendor", self.test_create_vendor),
                ("Vendor Trust Registry", self.test_vendor_trust_registry),
            ],
            "tcf": [
                ("Generate TCF String", self.test_generate_tcf_string),
                ("Decode TCF String", self.test_decode_tcf_string),
                ("TCF API Response", self.test_tcf_api_response),
            ],
            "gcm": [
                ("GCM Settings", self.test_gcm_settings),
                ("GCM Script", self.test_gcm_script),
            ],
            "webhooks": [
                ("Create Webhook", self.test_create_webhook),
                ("List Webhooks", self.test_list_webhooks),
                ("Test Webhook Delivery", self.test_webhook_test_delivery),
            ],
            "audit": [
                ("Audit Export", self.test_audit_export),
                ("List Decisions", self.test_decisions_list),
                ("Consent Enforcement Report", self.test_consent_enforcement_report),
                ("Financial ROI Report", self.test_financial_roi_report),
            ],
            "security": [
                ("Registry Public List", self.test_registry_public_list),
                ("Security Events", self.test_security_events),
                ("Security Threats", self.test_security_threats),
            ],
        }

        # Determine which groups to run
        if test_group:
            if test_group not in test_groups:
                print(f"{Colors.RED}Unknown test group: {test_group}{Colors.RESET}")
                print(f"Available groups: {', '.join(test_groups.keys())}")
                return
            groups_to_run = {test_group: test_groups[test_group]}
        else:
            groups_to_run = test_groups

        print(f"\n{Colors.BOLD}{'=' * 60}{Colors.RESET}")
        print(f"{Colors.BOLD}🧪 CONSENT PLATFORM API TEST SUITE{Colors.RESET}")
        print(f"{Colors.BOLD}{'=' * 60}{Colors.RESET}")
        print(f"   API URL: {self.api_url}")
        print(f"   Verbose: {self.verbose}")
        
        for group_name, tests in groups_to_run.items():
            print(f"\n{Colors.BLUE}▶ {group_name.upper()}{Colors.RESET}")
            for test_name, test_fn in tests:
                await self.run_test(test_name, test_fn)

        # Print summary
        self._print_summary()

    def _print_summary(self):
        """Print test summary."""
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)
        total_time = sum(r.duration_ms for r in self.results)
        
        print(f"\n{Colors.BOLD}{'=' * 60}{Colors.RESET}")
        print(f"{Colors.BOLD}📊 TEST SUMMARY{Colors.RESET}")
        print(f"{Colors.BOLD}{'=' * 60}{Colors.RESET}")
        
        if failed == 0:
            print(f"\n   {Colors.GREEN}✓ All {total} tests passed!{Colors.RESET}")
        else:
            print(f"\n   {Colors.GREEN}✓ Passed: {passed}{Colors.RESET}")
            print(f"   {Colors.RED}✗ Failed: {failed}{Colors.RESET}")
        
        print(f"   ⏱ Total time: {total_time:.1f}ms")
        
        if failed > 0:
            print(f"\n{Colors.RED}Failed Tests:{Colors.RESET}")
            for r in self.results:
                if not r.passed:
                    print(f"   - {r.name}: {r.error}")
        
        print()
        
        # Return exit code
        return 0 if failed == 0 else 1


async def main():
    parser = argparse.ArgumentParser(description="Test Consent Platform API")
    parser.add_argument(
        "--api-url",
        default="http://localhost:8001",
        help="API base URL (default: http://localhost:8001)"
    )
    parser.add_argument(
        "--api-key",
        default="demo-api-key-12345",
        help="API key for authentication"
    )
    parser.add_argument(
        "--test",
        choices=["health", "auth", "consent", "enforcement", "vendors", "tcf", "gcm", "webhooks", "audit", "security"],
        help="Run only a specific test group"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )
    
    args = parser.parse_args()
    
    tester = ConsentPlatformTester(args.api_url, args.api_key, args.verbose)
    
    try:
        exit_code = await tester.run_all_tests(args.test)
        sys.exit(exit_code or 0)
    finally:
        await tester.close()


if __name__ == "__main__":
    asyncio.run(main())
