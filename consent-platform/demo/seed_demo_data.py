#!/usr/bin/env python3
"""
Consent Platform Demo Data Seeder

This script populates the platform with realistic demo data for testing:
- Multiple tenants with different configurations
- Sample vendors (Meta, Google, TikTok, etc.)
- Consent tokens with various permission sets
- Historical enforcement decisions
- Security events and audit logs

Usage:
    python seed_demo_data.py --api-url http://localhost:8001 --api-key YOUR_API_KEY
"""

import argparse
import asyncio
import httpx
import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional

# Demo configuration
DEMO_PURPOSES = [
    {"id": "analytics", "name": "Analytics & Measurement", "description": "Website analytics and performance measurement"},
    {"id": "personalization", "name": "Content Personalization", "description": "Personalized content recommendations"},
    {"id": "advertising", "name": "Targeted Advertising", "description": "Interest-based advertising"},
    {"id": "retargeting", "name": "Retargeting", "description": "Show ads based on previous interactions"},
    {"id": "cross_device", "name": "Cross-Device Tracking", "description": "Link user activity across devices"},
    {"id": "social_features", "name": "Social Features", "description": "Social media integrations"},
    {"id": "functional", "name": "Functional Cookies", "description": "Remember preferences and settings"},
]

DEMO_VENDORS = [
    {
        "id": "meta",
        "name": "meta",
        "display_name": "Meta (Facebook)",
        "vendor_type": "dsp",
        "allowed_data_classes": ["behavioral", "demographic", "contextual"],
        "trust_tier": "certified",
    },
    {
        "id": "google",
        "name": "google",
        "display_name": "Google Ads",
        "vendor_type": "dsp",
        "allowed_data_classes": ["behavioral", "contextual", "first_party"],
        "trust_tier": "certified",
    },
    {
        "id": "tiktok",
        "name": "tiktok",
        "display_name": "TikTok for Business",
        "vendor_type": "dsp",
        "allowed_data_classes": ["behavioral", "contextual"],
        "trust_tier": "approved",
    },
    {
        "id": "amazon_ads",
        "name": "amazon_ads",
        "display_name": "Amazon Advertising",
        "vendor_type": "dsp",
        "allowed_data_classes": ["behavioral", "contextual", "first_party"],
        "trust_tier": "certified",
    },
    {
        "id": "segment",
        "name": "segment",
        "display_name": "Segment CDP",
        "vendor_type": "cdp",
        "allowed_data_classes": ["first_party", "behavioral"],
        "trust_tier": "approved",
    },
    {
        "id": "amplitude",
        "name": "amplitude",
        "display_name": "Amplitude Analytics",
        "vendor_type": "analytics",
        "allowed_data_classes": ["behavioral", "contextual"],
        "trust_tier": "approved",
    },
    {
        "id": "mixpanel",
        "name": "mixpanel",
        "display_name": "Mixpanel",
        "vendor_type": "analytics",
        "allowed_data_classes": ["behavioral", "first_party"],
        "trust_tier": "approved",
    },
]

# Sample event types for different scenarios
EVENT_SCENARIOS = [
    {
        "name": "page_view",
        "vendor": "google",
        "purpose": "analytics",
        "data_class": "behavioral",
        "consent_rate": 0.85,
    },
    {
        "name": "purchase",
        "vendor": "meta",
        "purpose": "advertising",
        "data_class": "behavioral",
        "consent_rate": 0.72,
    },
    {
        "name": "add_to_cart",
        "vendor": "meta",
        "purpose": "retargeting",
        "data_class": "behavioral",
        "consent_rate": 0.68,
    },
    {
        "name": "lead_gen",
        "vendor": "tiktok",
        "purpose": "advertising",
        "data_class": "demographic",
        "consent_rate": 0.55,
    },
    {
        "name": "video_watch",
        "vendor": "tiktok",
        "purpose": "personalization",
        "data_class": "behavioral",
        "consent_rate": 0.75,
    },
    {
        "name": "search",
        "vendor": "amazon_ads",
        "purpose": "advertising",
        "data_class": "contextual",
        "consent_rate": 0.80,
    },
    {
        "name": "user_profile",
        "vendor": "segment",
        "purpose": "personalization",
        "data_class": "first_party",
        "consent_rate": 0.90,
    },
    {
        "name": "feature_usage",
        "vendor": "amplitude",
        "purpose": "analytics",
        "data_class": "behavioral",
        "consent_rate": 0.88,
    },
]


class DemoDataSeeder:
    """Seeds the Consent Platform with realistic demo data."""

    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip('/')
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json",
        }
        self.consent_tokens: Dict[str, str] = {}
        self.stats = {
            "vendors_created": 0,
            "tokens_issued": 0,
            "events_processed": 0,
            "events_allowed": 0,
            "events_blocked": 0,
            "events_modified": 0,
        }

    async def close(self):
        await self.client.aclose()

    async def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make an API request with error handling."""
        url = f"{self.api_url}{endpoint}"
        try:
            response = await self.client.request(
                method=method,
                url=url,
                headers=self.headers,
                **kwargs
            )
            if response.status_code >= 400:
                print(f"  Warning: {method} {endpoint} returned {response.status_code}: {response.text[:200]}")
                return {"error": response.status_code}
            return response.json()
        except Exception as e:
            print(f"  Error: {method} {endpoint} failed: {e}")
            return {"error": str(e)}

    async def check_health(self) -> bool:
        """Check if the API is healthy."""
        print("\n🏥 Checking API health...")
        try:
            response = await self.client.get(f"{self.api_url}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ API is healthy: {data.get('status', 'unknown')}")
                return True
            print(f"   ✗ API returned status {response.status_code}")
            return False
        except Exception as e:
            print(f"   ✗ Could not connect to API: {e}")
            return False

    async def seed_vendors(self):
        """Create demo vendors."""
        print("\n📦 Seeding vendors...")
        for vendor in DEMO_VENDORS:
            result = await self._request(
                "POST", "/vendors",
                json={
                    "name": vendor["name"],
                    "display_name": vendor["display_name"],
                    "vendor_type": vendor["vendor_type"],
                    "allowed_data_classes": vendor["allowed_data_classes"],
                }
            )
            if "error" not in result:
                self.stats["vendors_created"] += 1
                print(f"   ✓ Created vendor: {vendor['display_name']}")
            else:
                print(f"   ⚠ Vendor {vendor['display_name']} may already exist")

    async def issue_consent_tokens(self, count: int = 50):
        """Issue consent tokens with various permission sets."""
        print(f"\n🔑 Issuing {count} consent tokens...")
        
        # Different consent profiles
        consent_profiles = [
            {
                "name": "full_consent",
                "purposes": ["analytics", "personalization", "advertising", "retargeting"],
                "vendors": ["meta", "google", "tiktok", "amazon_ads", "segment"],
                "weight": 0.25,
            },
            {
                "name": "analytics_only",
                "purposes": ["analytics", "functional"],
                "vendors": ["google", "amplitude", "mixpanel"],
                "weight": 0.30,
            },
            {
                "name": "no_advertising",
                "purposes": ["analytics", "personalization", "functional"],
                "vendors": ["google", "segment", "amplitude"],
                "weight": 0.25,
            },
            {
                "name": "minimal",
                "purposes": ["functional"],
                "vendors": [],
                "weight": 0.15,
            },
            {
                "name": "custom",
                "purposes": ["analytics", "advertising"],
                "vendors": ["google", "meta"],
                "weight": 0.05,
            },
        ]
        
        for i in range(count):
            # Select a consent profile based on weights
            profile = random.choices(
                consent_profiles,
                weights=[p["weight"] for p in consent_profiles]
            )[0]
            
            subject_id = f"user_{uuid.uuid4().hex[:8]}"
            
            # Build purposes dict
            purposes = {
                p: {"allowed": True, "ttl_days": random.choice([7, 14, 30, 90, 365])}
                for p in profile["purposes"]
            }
            
            # Build vendors dict
            vendors = {
                v: {"allowed": True, "data_classes": ["behavioral", "contextual"]}
                for v in profile["vendors"]
            }
            
            result = await self._request(
                "POST", "/consent",
                json={
                    "subject_id": subject_id,
                    "purposes": purposes,
                    "vendors": vendors,
                    "jurisdiction": random.choice(["EU", "US", "UK", "CA"]),
                    "ttl_seconds": random.choice([3600, 86400, 604800, 2592000]),  # 1h to 30d
                }
            )
            
            if "error" not in result and "token" in result:
                self.consent_tokens[subject_id] = result["token"]
                self.stats["tokens_issued"] += 1
                if (i + 1) % 10 == 0:
                    print(f"   ✓ Issued {i + 1}/{count} tokens")
        
        print(f"   ✓ Total tokens issued: {self.stats['tokens_issued']}")

    async def generate_events(self, count: int = 200):
        """Generate sample events to test enforcement."""
        print(f"\n📊 Generating {count} enforcement events...")
        
        token_list = list(self.consent_tokens.items())
        if not token_list:
            print("   ⚠ No consent tokens available, skipping events")
            return
        
        for i in range(count):
            # Pick a random scenario
            scenario = random.choice(EVENT_SCENARIOS)
            
            # Pick a random token (or no token sometimes)
            if random.random() < 0.95:  # 95% have a token
                subject_id, token = random.choice(token_list)
            else:
                subject_id = f"anonymous_{uuid.uuid4().hex[:8]}"
                token = None
            
            # Create event data
            event_data = {
                "event_name": scenario["name"],
                "vendor": scenario["vendor"],
                "purpose": scenario["purpose"],
                "data_class": scenario["data_class"],
                "event_data": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "session_id": f"sess_{uuid.uuid4().hex[:8]}",
                    "page_url": f"https://demo.example.com/{random.choice(['home', 'products', 'checkout', 'account'])}",
                    "user_agent": "Mozilla/5.0 (Demo)",
                    "value": random.randint(10, 500) if scenario["name"] == "purchase" else None,
                },
            }
            
            # Add authorization header if we have a token
            headers = {**self.headers}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            
            result = await self._request(
                "POST", "/event",
                headers=headers,
                json=event_data
            )
            
            if "error" not in result:
                self.stats["events_processed"] += 1
                decision = result.get("decision", "unknown")
                if decision == "allow":
                    self.stats["events_allowed"] += 1
                elif decision == "block":
                    self.stats["events_blocked"] += 1
                elif decision == "modify":
                    self.stats["events_modified"] += 1
            
            if (i + 1) % 50 == 0:
                print(f"   ✓ Processed {i + 1}/{count} events")
        
        print(f"   ✓ Events: {self.stats['events_allowed']} allowed, "
              f"{self.stats['events_blocked']} blocked, "
              f"{self.stats['events_modified']} modified")

    async def register_webhooks(self):
        """Register sample webhook endpoints."""
        print("\n🔗 Registering sample webhooks...")
        
        webhook_configs = [
            {
                "url": "https://webhook.site/demo-consent-events",
                "events": ["consent.issued", "consent.revoked"],
                "description": "Consent changes webhook",
            },
            {
                "url": "https://webhook.site/demo-enforcement-events",
                "events": ["enforcement.blocked", "enforcement.modified"],
                "description": "Enforcement alerts webhook",
            },
            {
                "url": "https://webhook.site/demo-security-events",
                "events": ["security.violation"],
                "description": "Security alerts webhook",
            },
        ]
        
        for config in webhook_configs:
            result = await self._request(
                "POST", "/webhooks",
                json={
                    "url": config["url"],
                    "events": config["events"],
                    "active": True,
                }
            )
            if "error" not in result:
                print(f"   ✓ Registered: {config['description']}")

    async def generate_reports_preview(self):
        """Generate sample executive reports."""
        print("\n📈 Generating executive report previews...")
        
        # Consent enforcement report
        result = await self._request(
            "POST", "/reports/consent-enforcement",
            json={
                "tenant_id": "demo",
                "start_date": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
                "end_date": datetime.now(timezone.utc).isoformat(),
                "regulations": ["GDPR", "CCPA"],
                "format": "json",
            }
        )
        if "error" not in result:
            print("   ✓ Generated consent enforcement report")
        
        # Financial ROI report
        result = await self._request(
            "POST", "/reports/financial-roi",
            json={
                "tenant_id": "demo",
                "start_date": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
                "end_date": datetime.now(timezone.utc).isoformat(),
                "platform_cost": 5000.0,
                "annual_revenue": 10000000.0,
                "format": "json",
            }
        )
        if "error" not in result:
            print("   ✓ Generated financial ROI report")

    def print_summary(self):
        """Print seeding summary."""
        print("\n" + "=" * 60)
        print("📊 DEMO DATA SEEDING COMPLETE")
        print("=" * 60)
        print(f"""
   Vendors Created:     {self.stats['vendors_created']}
   Tokens Issued:       {self.stats['tokens_issued']}
   Events Processed:    {self.stats['events_processed']}
     - Allowed:         {self.stats['events_allowed']}
     - Blocked:         {self.stats['events_blocked']}
     - Modified:        {self.stats['events_modified']}
        """)
        print("=" * 60)
        print("\n🎉 Demo environment is ready for testing!")
        print(f"\n   Dashboard:   http://localhost:3001")
        print(f"   API Docs:    {self.api_url}/docs")
        print(f"   Metrics:     {self.api_url}/metrics")
        print(f"   Health:      {self.api_url}/health")


async def main():
    parser = argparse.ArgumentParser(description="Seed Consent Platform with demo data")
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
        "--tokens",
        type=int,
        default=50,
        help="Number of consent tokens to create (default: 50)"
    )
    parser.add_argument(
        "--events",
        type=int,
        default=200,
        help="Number of events to generate (default: 200)"
    )
    parser.add_argument(
        "--skip-health",
        action="store_true",
        help="Skip health check"
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🚀 CONSENT PLATFORM DEMO DATA SEEDER")
    print("=" * 60)
    print(f"   API URL: {args.api_url}")
    print(f"   Tokens:  {args.tokens}")
    print(f"   Events:  {args.events}")
    
    seeder = DemoDataSeeder(args.api_url, args.api_key)
    
    try:
        # Health check
        if not args.skip_health:
            if not await seeder.check_health():
                print("\n❌ API is not healthy. Please start the backend first.")
                return
        
        # Seed data
        await seeder.seed_vendors()
        await seeder.issue_consent_tokens(args.tokens)
        await seeder.generate_events(args.events)
        await seeder.register_webhooks()
        await seeder.generate_reports_preview()
        
        # Print summary
        seeder.print_summary()
        
    finally:
        await seeder.close()


if __name__ == "__main__":
    asyncio.run(main())
