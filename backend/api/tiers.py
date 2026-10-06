"""
SecurityOS Tier Definitions + Entitlements API

Tiers define what each subscription level can access.
The frontend and MSP portal reference this at runtime to gate features.

GET /api/v1/securityos/tiers          — list all tiers
GET /api/v1/securityos/tiers/{tier}   — get one tier's full entitlements
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

router = APIRouter(prefix="/api/v1/securityos/tiers", tags=["Tiers"])


# ── Tier definitions ──────────────────────────────────────────────────────────
# price_monthly: USD/month for the account (not per-seat unless noted)
# price_per_org: additional cost per managed org (MSP only)
# max_orgs: how many organizations this account can manage (-1 = unlimited)
# max_integrations: live API integrations per org (-1 = unlimited)
# frameworks: which compliance frameworks are surfaced in the UI
# integrations_available: which integration types can be connected

TIERS: Dict[str, Dict[str, Any]] = {
    "solo": {
        "id": "solo",
        "name": "Solo",
        "tagline": "Free security readiness for individual business owners",
        "price_monthly": 0,
        "price_per_org": 0,
        "limits": {
            "max_orgs": 1,
            "max_integrations": 0,
            "max_api_keys": 0,
        },
        "features": {
            "control_catalog": True,         # All 31 controls visible
            "manual_attestation": True,      # Self-serve status updates
            "framework_selector": True,      # AI RMF, NIST CSF, HIPAA, PCI filter
            "score_card": True,              # Security Readiness Score
            "tco_analysis": False,           # Cost of Risk / breach TCO
            "trust_passport": False,         # Shareable proof of compliance
            "copilot": "basic",              # Rule-based copilot responses
            "integrations": False,           # No live API connections
            "msp_portal": False,             # No multi-org management
            "api_access": False,             # No REST API access
            "white_label": False,            # No branding customization
            "evidence_pipeline": False,      # No automated evidence collection
            "custom_frameworks": False,      # No custom framework mapping
        },
        "frameworks": [
            "all", "nist_ai_rmf", "nist_csf_2", "hipaa",
            "pci_dss", "ftc_safeguards", "cyber_insurance",
        ],
        "integrations_available": [],
        "upgrade_cta": "Connect Microsoft 365 or Google Workspace to auto-verify your controls.",
    },

    "starter": {
        "id": "starter",
        "name": "Starter",
        "tagline": "Auto-verification for growing businesses",
        "price_monthly": 29,
        "price_per_org": 0,
        "limits": {
            "max_orgs": 1,
            "max_integrations": 1,
            "max_api_keys": 2,
        },
        "features": {
            "control_catalog": True,
            "manual_attestation": True,
            "framework_selector": True,
            "score_card": True,
            "tco_analysis": True,            # Cost of Risk / breach TCO unlocked
            "trust_passport": True,          # Shareable compliance proof
            "copilot": "standard",           # Copilot with integration context
            "integrations": True,            # 1 live integration
            "msp_portal": False,
            "api_access": False,
            "white_label": False,
            "evidence_pipeline": True,       # Automatic evidence from 1 integration
            "custom_frameworks": False,
        },
        "frameworks": [
            "all", "nist_ai_rmf", "nist_csf_2", "hipaa",
            "pci_dss", "ftc_safeguards", "cyber_insurance",
        ],
        "integrations_available": [
            "microsoft_365",
            "google_workspace",
        ],
        "upgrade_cta": "Add more integrations and manage multiple locations with Professional.",
    },

    "professional": {
        "id": "professional",
        "name": "Professional",
        "tagline": "Full GRC coverage with multi-location support",
        "price_monthly": 79,
        "price_per_org": 0,
        "limits": {
            "max_orgs": 5,
            "max_integrations": 4,
            "max_api_keys": 10,
        },
        "features": {
            "control_catalog": True,
            "manual_attestation": True,
            "framework_selector": True,
            "score_card": True,
            "tco_analysis": True,
            "trust_passport": True,
            "copilot": "advanced",           # Full AI copilot with org context + RAG
            "integrations": True,            # Up to 4 integrations
            "msp_portal": False,
            "api_access": True,              # REST API access (read)
            "white_label": False,
            "evidence_pipeline": True,
            "custom_frameworks": False,
        },
        "frameworks": [
            "all", "nist_ai_rmf", "nist_csf_2", "hipaa",
            "pci_dss", "ftc_safeguards", "cyber_insurance",
        ],
        "integrations_available": [
            "microsoft_365",
            "google_workspace",
            "microsoft_intune",
            "microsoft_defender",
        ],
        "upgrade_cta": "Scale to unlimited clients and white-label for your brand with MSP.",
    },

    "msp": {
        "id": "msp",
        "name": "MSP",
        "tagline": "Unlimited clients, white-label, and full MSP portal",
        "price_monthly": 199,
        "price_per_org": 15,          # Per managed client org/month after first 5 included
        "included_orgs": 5,           # Orgs included in base price
        "limits": {
            "max_orgs": -1,            # Unlimited
            "max_integrations": -1,    # Unlimited per org
            "max_api_keys": -1,        # Unlimited
        },
        "features": {
            "control_catalog": True,
            "manual_attestation": True,
            "framework_selector": True,
            "score_card": True,
            "tco_analysis": True,
            "trust_passport": True,
            "copilot": "advanced",
            "integrations": True,
            "msp_portal": True,        # Multi-org dashboard, aggregate scoring, alerts
            "api_access": True,        # Full read/write API
            "white_label": True,       # Custom branding, custom domain, co-branded reports
            "evidence_pipeline": True,
            "custom_frameworks": True, # Map controls to custom internal frameworks
        },
        "frameworks": [
            "all", "nist_ai_rmf", "nist_csf_2", "hipaa",
            "pci_dss", "ftc_safeguards", "cyber_insurance",
        ],
        "integrations_available": [
            "microsoft_365",
            "google_workspace",
            "microsoft_intune",
            "microsoft_defender",
            "azure_backup",
            "aws_backup",
            "aws",
        ],
        "upgrade_cta": None,
    },
}

TIER_ORDER = ["solo", "starter", "professional", "msp"]


def check_entitlement(tier: str, feature: str) -> bool:
    """Return True if the given tier has access to the given feature."""
    t = TIERS.get(tier)
    if not t:
        return False
    val = t["features"].get(feature)
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val != "none"
    return False


def get_tier_limit(tier: str, limit: str) -> int:
    """Return a numeric limit for the tier (-1 = unlimited)."""
    t = TIERS.get(tier)
    if not t:
        return 0
    return t["limits"].get(limit, 0)


# ── REST Endpoints ────────────────────────────────────────────────────────────

@router.get("", summary="List all tiers")
def list_tiers():
    """Return all tiers in display order with key pricing and limit info."""
    return {
        "tiers": [
            {
                "id": TIERS[tid]["id"],
                "name": TIERS[tid]["name"],
                "tagline": TIERS[tid]["tagline"],
                "price_monthly": TIERS[tid]["price_monthly"],
                "price_per_org": TIERS[tid].get("price_per_org", 0),
                "max_orgs": TIERS[tid]["limits"]["max_orgs"],
                "max_integrations": TIERS[tid]["limits"]["max_integrations"],
                "msp_portal": TIERS[tid]["features"]["msp_portal"],
                "api_access": TIERS[tid]["features"]["api_access"],
                "copilot": TIERS[tid]["features"]["copilot"],
                "upgrade_cta": TIERS[tid].get("upgrade_cta"),
            }
            for tid in TIER_ORDER
        ]
    }


@router.get("/{tier_id}", summary="Get full entitlements for one tier")
def get_tier(tier_id: str):
    """Return complete entitlements, limits, and feature flags for a tier."""
    tier = TIERS.get(tier_id.lower())
    if not tier:
        raise HTTPException(
            status_code=404,
            detail=f"Tier '{tier_id}' not found. Valid tiers: {TIER_ORDER}",
        )
    return tier


@router.get("/{tier_id}/check/{feature}", summary="Check a single feature entitlement")
def check_feature(tier_id: str, feature: str):
    """
    Quick entitlement check — returns {allowed: bool}.
    Useful for feature gating in the frontend without fetching the full tier.
    """
    if tier_id.lower() not in TIERS:
        raise HTTPException(status_code=404, detail=f"Tier '{tier_id}' not found")
    allowed = check_entitlement(tier_id.lower(), feature)
    return {"tier": tier_id.lower(), "feature": feature, "allowed": allowed}
