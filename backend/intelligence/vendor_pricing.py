"""
Vendor Pricing Catalog — Competitive Intelligence Engine

Real-world SMB/mid-market pricing for every provider in the third-party
coverage catalog.  Figures are based on publicly listed rates and common
MSP channel pricing as of 2025.  Exact quotes vary by volume; these are
used for budget-fit estimation and ROI scoring, not as binding quotes.

Pricing models:
  per_seat_monthly  — charged per user or endpoint per month
  flat_monthly      — fixed monthly regardless of seat count (uncommon at SMB)
  per_device_monthly — some EDR tools charge per device, not per user

Implementation complexity:
  "low"    — < 1 week, no professional services required
  "medium" — 1–4 weeks, standard onboarding
  "high"   — > 4 weeks, may require professional services

Compliance frameworks each vendor is independently audited / certified for.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, FrozenSet, List, Optional


@dataclass
class PricingTier:
    """A single pricing option (vendors often offer multiple tiers)."""
    tier_name: str                        # "Starter" | "Business" | "Enterprise"
    per_seat_monthly: Optional[float]     # USD per user/endpoint per month
    flat_monthly: Optional[float]         # USD flat monthly (None if seat-based)
    min_seats: int = 1
    max_seats: Optional[int] = None       # None = unlimited
    includes_support: bool = True
    notes: str = ""


@dataclass
class VendorPricing:
    """Full pricing and metadata for one vendor/product."""
    vendor_id: str                        # Must match ThirdPartyProvider.id
    display_name: str                     # Human-readable
    product_line: str
    category: str
    tiers: List[PricingTier]
    frameworks: FrozenSet[str]            # Compliance frameworks supported
    smb_friendly: bool                    # Designed for <500 employees
    implementation_complexity: str        # "low" | "medium" | "high"
    implementation_weeks_typical: float
    cloud_native: bool
    free_trial_days: int = 0
    website: str = ""
    tagline: str = ""


def _best_tier_for(pricing: VendorPricing, seat_count: int) -> Optional[PricingTier]:
    """Return the lowest-cost tier that covers the given seat count."""
    eligible = [
        t for t in pricing.tiers
        if t.min_seats <= seat_count
        and (t.max_seats is None or t.max_seats >= seat_count)
    ]
    if not eligible:
        # Fall back to best available even if outside stated range
        eligible = pricing.tiers
    # Prefer per-seat tiers (more predictable budget fit)
    eligible.sort(key=lambda t: (
        t.flat_monthly is not None,   # flat last
        estimate_tier_cost(t, seat_count),
    ))
    return eligible[0] if eligible else None


def estimate_tier_cost(tier: PricingTier, seat_count: int) -> float:
    """Return monthly USD cost for a tier given seat count."""
    if tier.flat_monthly is not None:
        return tier.flat_monthly
    if tier.per_seat_monthly is not None:
        return tier.per_seat_monthly * seat_count
    return 0.0


def estimate_monthly_cost(pricing: VendorPricing, seat_count: int) -> float:
    """Return the best (lowest) monthly cost estimate for the given seat count."""
    tier = _best_tier_for(pricing, seat_count)
    if not tier:
        return 0.0
    return estimate_tier_cost(tier, seat_count)


# ── Catalog ───────────────────────────────────────────────────────────────────

VENDOR_CATALOG: List[VendorPricing] = [

    # ── EDR / Endpoint Protection ─────────────────────────────────────────────

    VendorPricing(
        vendor_id="crowdstrike_falcon",
        display_name="CrowdStrike Falcon",
        product_line="Falcon Go / Pro",
        category="edr",
        tiers=[
            PricingTier("Falcon Go",  per_seat_monthly=8.99,  flat_monthly=None, min_seats=1,  max_seats=500),
            PricingTier("Falcon Pro", per_seat_monthly=15.99, flat_monthly=None, min_seats=5),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "CMMC"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=15,
        tagline="Industry-leading AI-powered EDR and threat intelligence",
    ),
    VendorPricing(
        vendor_id="sentinelone",
        display_name="SentinelOne Singularity",
        product_line="Core / Complete",
        category="edr",
        tiers=[
            PricingTier("Core",     per_seat_monthly=6.00,  flat_monthly=None, min_seats=1, max_seats=250),
            PricingTier("Complete", per_seat_monthly=10.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "GDPR"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Autonomous AI endpoint protection with one-click rollback",
    ),
    VendorPricing(
        vendor_id="microsoft_defender",
        display_name="Microsoft Defender for Business",
        product_line="Defender for Business",
        category="edr",
        tiers=[
            PricingTier("Standalone",       per_seat_monthly=3.00,  flat_monthly=None, min_seats=1, max_seats=300),
            PricingTier("M365 Business Premium", per_seat_monthly=22.00, flat_monthly=None, min_seats=1,
                        notes="Includes full M365 suite + Defender + Intune + Entra"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "GDPR", "CMMC"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=0.5,
        cloud_native=True,
        free_trial_days=30,
        tagline="Enterprise endpoint security at SMB pricing, deeply integrated with Microsoft 365",
    ),
    VendorPricing(
        vendor_id="sophos",
        display_name="Sophos Intercept X",
        product_line="Intercept X Advanced",
        category="edr",
        tiers=[
            PricingTier("Intercept X",          per_seat_monthly=4.00, flat_monthly=None, min_seats=1, max_seats=500),
            PricingTier("Intercept X Advanced", per_seat_monthly=6.50, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Deep learning endpoint protection with synchronized security",
    ),
    VendorPricing(
        vendor_id="malwarebytes",
        display_name="Malwarebytes ThreatDown",
        product_line="ThreatDown Core",
        category="edr",
        tiers=[
            PricingTier("Core",     per_seat_monthly=4.00, flat_monthly=None, min_seats=1, max_seats=250),
            PricingTier("Advanced", per_seat_monthly=7.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "NIST-CSF"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=0.5,
        cloud_native=True,
        free_trial_days=14,
        tagline="Battle-tested malware remediation and endpoint protection for SMBs",
    ),
    VendorPricing(
        vendor_id="palo_alto_cortex",
        display_name="Palo Alto Cortex XDR",
        product_line="Cortex XDR Pro",
        category="edr",
        tiers=[
            PricingTier("Prevent", per_seat_monthly=7.99,  flat_monthly=None, min_seats=10),
            PricingTier("Pro",     per_seat_monthly=14.00, flat_monthly=None, min_seats=10),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "CMMC"}),
        smb_friendly=False,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Extended detection and response across endpoint, network, and cloud",
    ),
    VendorPricing(
        vendor_id="cisco_secure",
        display_name="Cisco Secure Endpoint",
        product_line="Secure Endpoint Essentials",
        category="edr",
        tiers=[
            PricingTier("Essentials", per_seat_monthly=6.00, flat_monthly=None, min_seats=1),
            PricingTier("Advantage",  per_seat_monthly=9.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Cloud-native endpoint security with Cisco Talos threat intelligence",
    ),

    # ── MDR / Managed Security Operations ────────────────────────────────────

    VendorPricing(
        vendor_id="huntress",
        display_name="Huntress Managed EDR",
        product_line="Managed EDR + ITDR",
        category="mdr",
        tiers=[
            PricingTier("Managed EDR", per_seat_monthly=5.50, flat_monthly=None, min_seats=1, max_seats=500,
                        notes="Includes 24/7 SOC; popular MSP pricing"),
            PricingTier("EDR + ITDR",  per_seat_monthly=8.00, flat_monthly=None, min_seats=1,
                        notes="Adds identity threat detection"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=0.5,
        cloud_native=True,
        free_trial_days=21,
        tagline="Purpose-built for SMBs: 24/7 human threat hunting at EDR prices",
    ),
    VendorPricing(
        vendor_id="arctic_wolf",
        display_name="Arctic Wolf Managed Security",
        product_line="Managed Detection and Response",
        category="mdr",
        tiers=[
            PricingTier("MDR",  per_seat_monthly=25.00, flat_monthly=None, min_seats=25,
                        notes="Concierge Security Team included"),
            PricingTier("MDRP", per_seat_monthly=35.00, flat_monthly=None, min_seats=25),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "CMMC", "GDPR"}),
        smb_friendly=False,
        implementation_complexity="medium",
        implementation_weeks_typical=3.0,
        cloud_native=True,
        free_trial_days=0,
        tagline="Concierge Security Team provides 24/7 monitoring and compliance reporting",
    ),
    VendorPricing(
        vendor_id="blackpoint",
        display_name="Blackpoint Cyber",
        product_line="SNAP-Defense",
        category="mdr",
        tiers=[
            PricingTier("SNAP-Defense", per_seat_monthly=9.00, flat_monthly=None, min_seats=1, max_seats=500,
                        notes="SOC-as-a-service; active containment included"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=0,
        tagline="SOC-as-a-service with active threat response, not just alerts",
    ),

    # ── IAM / Identity ────────────────────────────────────────────────────────

    VendorPricing(
        vendor_id="okta",
        display_name="Okta Workforce Identity",
        product_line="Workforce Identity Cloud",
        category="iam",
        tiers=[
            PricingTier("Starter",    per_seat_monthly=2.00,  flat_monthly=None, min_seats=1, max_seats=100),
            PricingTier("Professional", per_seat_monthly=6.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "FedRAMP", "GDPR"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Zero-trust identity with SSO, MFA, and lifecycle management",
    ),
    VendorPricing(
        vendor_id="duo",
        display_name="Duo Security",
        product_line="Duo MFA",
        category="iam",
        tiers=[
            PricingTier("Essentials", per_seat_monthly=3.00, flat_monthly=None, min_seats=1, max_seats=500),
            PricingTier("Business",   per_seat_monthly=6.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "GDPR", "CMMC"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Industry-standard MFA that works with any app, any device",
    ),
    VendorPricing(
        vendor_id="jumpcloud",
        display_name="JumpCloud Open Directory",
        product_line="JumpCloud Platform",
        category="iam",
        tiers=[
            PricingTier("Core",    per_seat_monthly=9.00,  flat_monthly=None, min_seats=1, max_seats=500),
            PricingTier("Platform", per_seat_monthly=15.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "CMMC"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Unified directory, SSO, MDM, and zero-trust from one console",
    ),
    VendorPricing(
        vendor_id="azure_ad",
        display_name="Microsoft Entra ID",
        product_line="Entra ID P1 / P2",
        category="iam",
        tiers=[
            PricingTier("P1", per_seat_monthly=6.00,  flat_monthly=None, min_seats=1),
            PricingTier("P2", per_seat_monthly=9.00,  flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "FedRAMP", "GDPR", "CMMC"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Microsoft's enterprise identity platform, often included with M365",
    ),
    VendorPricing(
        vendor_id="cyberark",
        display_name="CyberArk Workforce Identity",
        product_line="Idaptive / Workforce Identity",
        category="iam",
        tiers=[
            PricingTier("Core",       per_seat_monthly=4.00, flat_monthly=None, min_seats=50),
            PricingTier("Enterprise", per_seat_monthly=8.00, flat_monthly=None, min_seats=50),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "FedRAMP"}),
        smb_friendly=False,
        implementation_complexity="high",
        implementation_weeks_typical=4.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Privileged access management and workforce identity for regulated industries",
    ),

    # ── Backup / Recovery ─────────────────────────────────────────────────────

    VendorPricing(
        vendor_id="veeam",
        display_name="Veeam Data Platform",
        product_line="Veeam Backup & Replication",
        category="backup",
        tiers=[
            PricingTier("Foundation",  per_seat_monthly=2.50, flat_monthly=None, min_seats=1),
            PricingTier("Advanced",    per_seat_monthly=4.50, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=False,
        free_trial_days=30,
        tagline="Gold-standard backup with immutable storage and ransomware recovery",
    ),
    VendorPricing(
        vendor_id="backblaze",
        display_name="Backblaze Business Backup",
        product_line="Business Backup / B2",
        category="backup",
        tiers=[
            PricingTier("Business Backup", per_seat_monthly=7.00, flat_monthly=None, min_seats=1, max_seats=500,
                        notes="Unlimited storage per computer"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "NIST-CSF"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=0.5,
        cloud_native=True,
        free_trial_days=15,
        tagline="Unlimited computer backup for SMBs at the lowest price in the industry",
    ),
    VendorPricing(
        vendor_id="acronis",
        display_name="Acronis Cyber Protect",
        product_line="Cyber Protect Cloud",
        category="backup",
        tiers=[
            PricingTier("Essentials", per_seat_monthly=5.00,  flat_monthly=None, min_seats=1, max_seats=500),
            PricingTier("Standard",   per_seat_monthly=10.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Integrated backup + endpoint protection with ransomware recovery",
    ),
    VendorPricing(
        vendor_id="datto",
        display_name="Datto SIRIS",
        product_line="SIRIS / ALTO",
        category="backup",
        tiers=[
            PricingTier("ALTO 3", flat_monthly=150.0, per_seat_monthly=None, min_seats=1, max_seats=50,
                        notes="Appliance-based; MSP pricing"),
            PricingTier("SIRIS",  flat_monthly=400.0, per_seat_monthly=None, min_seats=1,
                        notes="Appliance-based; MSP pricing"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=1.5,
        cloud_native=False,
        free_trial_days=0,
        tagline="Purpose-built business continuity and disaster recovery for MSPs",
    ),

    # ── Email Security ────────────────────────────────────────────────────────

    VendorPricing(
        vendor_id="proofpoint",
        display_name="Proofpoint Essentials",
        product_line="Proofpoint Essentials",
        category="email",
        tiers=[
            PricingTier("Essentials",  per_seat_monthly=3.00, flat_monthly=None, min_seats=1, max_seats=500),
            PricingTier("Business",    per_seat_monthly=5.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Advanced email filtering, phishing detection, and BEC protection",
    ),
    VendorPricing(
        vendor_id="mimecast",
        display_name="Mimecast Email Security",
        product_line="Email Security Cloud Integrated",
        category="email",
        tiers=[
            PricingTier("Core",     per_seat_monthly=4.00, flat_monthly=None, min_seats=1),
            PricingTier("Advanced", per_seat_monthly=7.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "GDPR"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Email security, continuity, and archival from one cloud platform",
    ),
    VendorPricing(
        vendor_id="abnormal",
        display_name="Abnormal Security",
        product_line="Inbound Email Security",
        category="email",
        tiers=[
            PricingTier("Inbound",    per_seat_monthly=4.50, flat_monthly=None, min_seats=25),
            PricingTier("Full Suite", per_seat_monthly=8.00, flat_monthly=None, min_seats=25),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "NIST-CSF", "GDPR"}),
        smb_friendly=False,
        implementation_complexity="low",
        implementation_weeks_typical=0.5,
        cloud_native=True,
        free_trial_days=0,
        tagline="AI-powered behavioral detection for BEC, phishing, and account takeover",
    ),

    # ── Network / SASE / DNS ──────────────────────────────────────────────────

    VendorPricing(
        vendor_id="cisco_umbrella",
        display_name="Cisco Umbrella",
        product_line="DNS Security Essentials",
        category="network",
        tiers=[
            PricingTier("DNS Essentials", per_seat_monthly=2.20, flat_monthly=None, min_seats=1, max_seats=500),
            PricingTier("SIG Essentials", per_seat_monthly=5.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "FedRAMP"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=0.5,
        cloud_native=True,
        free_trial_days=14,
        tagline="DNS-layer protection that blocks malware and phishing before connection",
    ),
    VendorPricing(
        vendor_id="zscaler",
        display_name="Zscaler Internet Access",
        product_line="ZIA Business",
        category="network",
        tiers=[
            PricingTier("Business",    per_seat_monthly=7.00,  flat_monthly=None, min_seats=50),
            PricingTier("Enterprise",  per_seat_monthly=12.00, flat_monthly=None, min_seats=50),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "FedRAMP"}),
        smb_friendly=False,
        implementation_complexity="high",
        implementation_weeks_typical=4.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Cloud-native zero-trust network access and web security",
    ),
    VendorPricing(
        vendor_id="palo_alto_prisma",
        display_name="Palo Alto Prisma Access",
        product_line="Prisma Access SASE",
        category="network",
        tiers=[
            PricingTier("Business",   per_seat_monthly=10.00, flat_monthly=None, min_seats=100),
            PricingTier("Enterprise", per_seat_monthly=18.00, flat_monthly=None, min_seats=100),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "FedRAMP", "CMMC"}),
        smb_friendly=False,
        implementation_complexity="high",
        implementation_weeks_typical=6.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="SASE platform delivering zero-trust access and threat prevention globally",
    ),

    # ── SIEM / Log Management ─────────────────────────────────────────────────

    VendorPricing(
        vendor_id="microsoft_sentinel",
        display_name="Microsoft Sentinel",
        product_line="Microsoft Sentinel",
        category="siem",
        tiers=[
            PricingTier("Pay-as-you-go", per_seat_monthly=2.46, flat_monthly=None, min_seats=1,
                        notes="~$2.46/GB/day ingested; typical SMB at 1 GB/day"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "FedRAMP", "CMMC"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=3.0,
        cloud_native=True,
        free_trial_days=90,
        tagline="Cloud-native SIEM and SOAR with Microsoft threat intelligence",
    ),

    # ── Vulnerability Management ──────────────────────────────────────────────

    VendorPricing(
        vendor_id="tenable",
        display_name="Tenable Nessus / Tenable.io",
        product_line="Tenable.io Vulnerability Management",
        category="vuln",
        tiers=[
            PricingTier("Nessus Pro",  flat_monthly=208.0, per_seat_monthly=None, min_seats=1, max_seats=500,
                        notes="Flat annual = $2,490/year; unlimited IPs"),
            PricingTier("Tenable.io",  per_seat_monthly=5.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "PCI-DSS", "NIST-CSF", "ISO27001", "HIPAA"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="The most widely deployed vulnerability scanner, trusted by 75% of Fortune 500",
    ),
    VendorPricing(
        vendor_id="rapid7_insightvm",
        display_name="Rapid7 InsightVM",
        product_line="InsightVM",
        category="vuln",
        tiers=[
            PricingTier("InsightVM", per_seat_monthly=2.50, flat_monthly=None, min_seats=25),
        ],
        frameworks=frozenset({"SOC2", "PCI-DSS", "NIST-CSF", "ISO27001", "HIPAA"}),
        smb_friendly=False,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Risk-based vulnerability management with live attack surface visibility",
    ),

    # ── Security Awareness Training ───────────────────────────────────────────

    VendorPricing(
        vendor_id="knowbe4",
        display_name="KnowBe4",
        product_line="Security Awareness Training",
        category="training",
        tiers=[
            PricingTier("Silver", per_seat_monthly=1.67, flat_monthly=None, min_seats=1, max_seats=500,
                        notes="~$20/user/year"),
            PricingTier("Gold",   per_seat_monthly=2.50, flat_monthly=None, min_seats=1,
                        notes="~$30/user/year"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "GDPR"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=0.5,
        cloud_native=True,
        free_trial_days=30,
        tagline="The world's largest security awareness training library with phishing simulation",
    ),
    VendorPricing(
        vendor_id="proofpoint_sat",
        display_name="Proofpoint Security Awareness",
        product_line="Security Awareness Training",
        category="training",
        tiers=[
            PricingTier("Essentials", per_seat_monthly=2.00, flat_monthly=None, min_seats=1, max_seats=500),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "GDPR"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=0.5,
        cloud_native=True,
        free_trial_days=0,
        tagline="Threat-intelligence-driven security awareness and phishing simulation",
    ),

    # ── Mobile Device Management ──────────────────────────────────────────────

    VendorPricing(
        vendor_id="intune",
        display_name="Microsoft Intune",
        product_line="Intune MDM/MAM",
        category="mdm",
        tiers=[
            PricingTier("Standalone", per_seat_monthly=8.00, flat_monthly=None, min_seats=1,
                        notes="Often included in M365 Business Premium"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "FedRAMP", "CMMC"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=True,
        free_trial_days=30,
        tagline="Cloud-based MDM and MAM that manages all devices from one console",
    ),
    VendorPricing(
        vendor_id="jamf",
        display_name="Jamf Pro",
        product_line="Jamf Pro / Now",
        category="mdm",
        tiers=[
            PricingTier("Now",  per_seat_monthly=4.00, flat_monthly=None, min_seats=1, max_seats=50,
                        notes="Free for first 3 devices"),
            PricingTier("Pro",  per_seat_monthly=7.17, flat_monthly=None, min_seats=1,
                        notes="~$86/device/year"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "PCI-DSS", "NIST-CSF", "ISO27001", "FedRAMP"}),
        smb_friendly=True,
        implementation_complexity="medium",
        implementation_weeks_typical=2.0,
        cloud_native=True,
        free_trial_days=14,
        tagline="The gold standard for Apple device management in the enterprise",
    ),
    VendorPricing(
        vendor_id="kandji",
        display_name="Kandji",
        product_line="Apple MDM",
        category="mdm",
        tiers=[
            PricingTier("Essentials", per_seat_monthly=4.00, flat_monthly=None, min_seats=1, max_seats=500),
            PricingTier("Access",     per_seat_monthly=8.00, flat_monthly=None, min_seats=1,
                        notes="Includes Passport local SSO"),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "NIST-CSF", "ISO27001"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=14,
        tagline="Modern Apple MDM with pre-built compliance blueprints for SOC 2, HIPAA, CIS",
    ),
    VendorPricing(
        vendor_id="mosyle",
        display_name="Mosyle Business",
        product_line="Apple MDM + Security",
        category="mdm",
        tiers=[
            PricingTier("Business",  per_seat_monthly=1.00, flat_monthly=None, min_seats=1, max_seats=500,
                        notes="Free for up to 30 devices"),
            PricingTier("Business+", per_seat_monthly=2.00, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "NIST-CSF"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=0.5,
        cloud_native=True,
        free_trial_days=30,
        tagline="All-in-one Apple MDM + endpoint security at the most affordable price",
    ),
    VendorPricing(
        vendor_id="hexnode",
        display_name="Hexnode UEM",
        product_line="Hexnode UEM",
        category="mdm",
        tiers=[
            PricingTier("Pro",        per_seat_monthly=1.08, flat_monthly=None, min_seats=1, max_seats=500),
            PricingTier("Enterprise", per_seat_monthly=2.25, flat_monthly=None, min_seats=1),
        ],
        frameworks=frozenset({"SOC2", "HIPAA", "GDPR", "NIST-CSF"}),
        smb_friendly=True,
        implementation_complexity="low",
        implementation_weeks_typical=1.0,
        cloud_native=True,
        free_trial_days=14,
        tagline="Unified endpoint management for Apple, Android, and Windows — all in one console",
    ),
]

# ── Index ─────────────────────────────────────────────────────────────────────

VENDOR_CATALOG_BY_ID: Dict[str, VendorPricing] = {v.vendor_id: v for v in VENDOR_CATALOG}

# Frameworks for which a majority of security breaches trigger regulatory penalties
HIGH_IMPACT_FRAMEWORKS = frozenset({"HIPAA", "PCI-DSS", "CMMC", "FedRAMP", "GDPR", "SOC2"})

# Estimated annual cost of a compliance failure by severity (USD)
BREACH_COST_BY_SEVERITY = {
    "critical": 500_000,
    "high":     150_000,
    "medium":    40_000,
    "low":       10_000,
}
