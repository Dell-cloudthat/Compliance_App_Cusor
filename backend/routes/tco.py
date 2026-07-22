"""
Business-Aligned TCO Analyzer
-------------------------------
Takes company financials + live compliance gap summary, returns three
implementation tiers (Conservative / Balanced / Most Aggressive) each with:

  - Full tool stack selected from market catalog (budget / mid / premium)
  - Monthly recurring cost + one-time implementation cost
  - Month-by-month milestones
  - ROI at 12 / 24 / 36 months (breach-cost model + fine avoidance + labor savings)
  - Executive narrative

The gap_summary is provided by the frontend (computed from the user's live
controls array) so this route never needs to query controls from the DB.
"""

import math
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from services.auth_service import get_current_user

router = APIRouter()


# ── Market Tool Catalog ────────────────────────────────────────────────────────
# Three tiers per category: budget / mid / premium
# monthly_cost: flat rate scaled for a 50-250 seat company
# setup_cost:   one-time professional services estimate

TOOL_CATALOG: Dict[str, Dict] = {
    "iam": {
        "label": "Identity & Access Management",
        "priority_order": 1,
        "tools": [
            {"name": "JumpCloud Directory Plus", "vendor": "JumpCloud", "tier": "budget",
             "monthly_cost": 420, "setup_cost": 4_000, "implementation_weeks": 3,
             "controls_count": 14, "gap_reduction": 0.55,
             "description": "Cloud directory, SSO, MFA for SMB"},
            {"name": "Okta Workforce Identity", "vendor": "Okta", "tier": "mid",
             "monthly_cost": 1_800, "setup_cost": 8_000, "implementation_weeks": 5,
             "controls_count": 22, "gap_reduction": 0.75,
             "description": "Enterprise SSO, adaptive MFA, lifecycle management"},
            {"name": "CyberArk Identity Security", "vendor": "CyberArk", "tier": "premium",
             "monthly_cost": 3_800, "setup_cost": 18_000, "implementation_weeks": 8,
             "controls_count": 30, "gap_reduction": 0.90,
             "description": "PAM, privileged access, zero-trust identity"},
        ],
    },
    "edr": {
        "label": "Endpoint Detection & Response",
        "priority_order": 2,
        "tools": [
            {"name": "Microsoft Defender for Endpoint P1", "vendor": "Microsoft", "tier": "budget",
             "monthly_cost": 600, "setup_cost": 2_500, "implementation_weeks": 2,
             "controls_count": 10, "gap_reduction": 0.50,
             "description": "Built-in EDR with M365 integration"},
            {"name": "SentinelOne Singularity Core", "vendor": "SentinelOne", "tier": "mid",
             "monthly_cost": 1_100, "setup_cost": 5_000, "implementation_weeks": 3,
             "controls_count": 16, "gap_reduction": 0.72,
             "description": "AI-powered XDR, automated response"},
            {"name": "CrowdStrike Falcon Enterprise", "vendor": "CrowdStrike", "tier": "premium",
             "monthly_cost": 1_500, "setup_cost": 8_000, "implementation_weeks": 3,
             "controls_count": 20, "gap_reduction": 0.88,
             "description": "Cloud-native XDR + threat intelligence + MDR option"},
        ],
    },
    "siem": {
        "label": "SIEM & Log Management",
        "priority_order": 3,
        "tools": [
            {"name": "Graylog Security", "vendor": "Graylog", "tier": "budget",
             "monthly_cost": 700, "setup_cost": 6_000, "implementation_weeks": 4,
             "controls_count": 12, "gap_reduction": 0.48,
             "description": "Open-core SIEM with commercial support"},
            {"name": "Microsoft Sentinel", "vendor": "Microsoft", "tier": "mid",
             "monthly_cost": 1_500, "setup_cost": 10_000, "implementation_weeks": 5,
             "controls_count": 18, "gap_reduction": 0.70,
             "description": "Cloud-native SIEM/SOAR with AI analytics"},
            {"name": "Splunk Enterprise Security", "vendor": "Splunk", "tier": "premium",
             "monthly_cost": 3_200, "setup_cost": 20_000, "implementation_weeks": 8,
             "controls_count": 26, "gap_reduction": 0.88,
             "description": "Industry-leading SIEM + SOAR + UEBA + threat intelligence"},
        ],
    },
    "vm": {
        "label": "Vulnerability Management",
        "priority_order": 4,
        "tools": [
            {"name": "Greenbone Community Edition", "vendor": "Greenbone", "tier": "budget",
             "monthly_cost": 250, "setup_cost": 3_000, "implementation_weeks": 2,
             "controls_count": 8, "gap_reduction": 0.40,
             "description": "Open-source vulnerability scanning with managed option"},
            {"name": "Tenable.io Vulnerability Management", "vendor": "Tenable", "tier": "mid",
             "monthly_cost": 1_400, "setup_cost": 5_000, "implementation_weeks": 3,
             "controls_count": 14, "gap_reduction": 0.72,
             "description": "Cloud-based continuous VM + web application scanning"},
            {"name": "Rapid7 InsightVM + AppSec", "vendor": "Rapid7", "tier": "premium",
             "monthly_cost": 2_200, "setup_cost": 8_000, "implementation_weeks": 4,
             "controls_count": 20, "gap_reduction": 0.85,
             "description": "VM + application risk + threat modeling + remediation"},
        ],
    },
    "dlp": {
        "label": "Data Loss Prevention & Classification",
        "priority_order": 5,
        "tools": [
            {"name": "Microsoft Purview Information Protection", "vendor": "Microsoft", "tier": "budget",
             "monthly_cost": 500, "setup_cost": 4_000, "implementation_weeks": 3,
             "controls_count": 10, "gap_reduction": 0.42,
             "description": "Data classification and policy-based DLP"},
            {"name": "Forcepoint DLP", "vendor": "Forcepoint", "tier": "mid",
             "monthly_cost": 1_800, "setup_cost": 9_000, "implementation_weeks": 5,
             "controls_count": 16, "gap_reduction": 0.68,
             "description": "Behavior-based DLP + insider threat detection"},
            {"name": "Varonis Data Security Platform", "vendor": "Varonis", "tier": "premium",
             "monthly_cost": 3_500, "setup_cost": 15_000, "implementation_weeks": 6,
             "controls_count": 24, "gap_reduction": 0.85,
             "description": "Data access governance, UEBA, DLP + blast radius analysis"},
        ],
    },
    "grc": {
        "label": "GRC & Compliance Automation",
        "priority_order": 6,
        "tools": [
            {"name": "Secureframe", "vendor": "Secureframe", "tier": "budget",
             "monthly_cost": 700, "setup_cost": 2_000, "implementation_weeks": 2,
             "controls_count": 14, "gap_reduction": 0.52,
             "description": "Automated SOC 2, ISO 27001 compliance workflows"},
            {"name": "Vanta", "vendor": "Vanta", "tier": "mid",
             "monthly_cost": 1_200, "setup_cost": 4_000, "implementation_weeks": 3,
             "controls_count": 20, "gap_reduction": 0.70,
             "description": "Automated evidence collection, multi-framework + vendor mgmt"},
            {"name": "Drata Enterprise", "vendor": "Drata", "tier": "premium",
             "monthly_cost": 2_000, "setup_cost": 6_000, "implementation_weeks": 4,
             "controls_count": 28, "gap_reduction": 0.82,
             "description": "Full-stack compliance automation with AI security copilot"},
        ],
    },
    "cloud": {
        "label": "Cloud Security Posture Management",
        "priority_order": 7,
        "tools": [
            {"name": "AWS Security Hub + Config", "vendor": "AWS", "tier": "budget",
             "monthly_cost": 400, "setup_cost": 3_000, "implementation_weeks": 2,
             "controls_count": 10, "gap_reduction": 0.38,
             "description": "Native AWS CSPM + compliance benchmark checks"},
            {"name": "Lacework CNAPP", "vendor": "Lacework", "tier": "mid",
             "monthly_cost": 2_200, "setup_cost": 8_000, "implementation_weeks": 4,
             "controls_count": 18, "gap_reduction": 0.68,
             "description": "Multi-cloud CNAPP with behavioral anomaly detection"},
            {"name": "Wiz Cloud Security Platform", "vendor": "Wiz", "tier": "premium",
             "monthly_cost": 3_000, "setup_cost": 12_000, "implementation_weeks": 4,
             "controls_count": 26, "gap_reduction": 0.85,
             "description": "Agentless CNAPP, risk graph, secrets & vulnerability detection"},
        ],
    },
    "network": {
        "label": "Network Security & Zero Trust",
        "priority_order": 8,
        "tools": [
            {"name": "Cloudflare Teams (Zero Trust)", "vendor": "Cloudflare", "tier": "budget",
             "monthly_cost": 350, "setup_cost": 2_000, "implementation_weeks": 2,
             "controls_count": 8, "gap_reduction": 0.40,
             "description": "ZTNA, DNS filtering, WAF — low barrier to entry"},
            {"name": "Zscaler Internet Access", "vendor": "Zscaler", "tier": "mid",
             "monthly_cost": 2_000, "setup_cost": 10_000, "implementation_weeks": 5,
             "controls_count": 16, "gap_reduction": 0.68,
             "description": "SSE platform with CASB, DLP, ZTNA"},
            {"name": "Palo Alto Prisma SASE", "vendor": "Palo Alto Networks", "tier": "premium",
             "monthly_cost": 4_000, "setup_cost": 18_000, "implementation_weeks": 7,
             "controls_count": 22, "gap_reduction": 0.85,
             "description": "Full SASE with ZTNA, CASB, SD-WAN + AI-driven threat prevention"},
        ],
    },
    "awareness": {
        "label": "Security Awareness Training",
        "priority_order": 9,
        "tools": [
            {"name": "KnowBe4 Security Awareness", "vendor": "KnowBe4", "tier": "budget",
             "monthly_cost": 280, "setup_cost": 1_000, "implementation_weeks": 1,
             "controls_count": 6, "gap_reduction": 0.45,
             "description": "Phishing simulation + security awareness library"},
            {"name": "Proofpoint Security Awareness", "vendor": "Proofpoint", "tier": "mid",
             "monthly_cost": 450, "setup_cost": 2_000, "implementation_weeks": 2,
             "controls_count": 10, "gap_reduction": 0.62,
             "description": "Advanced phishing + threat simulation + compliance modules"},
            {"name": "SANS Security Awareness", "vendor": "SANS Institute", "tier": "premium",
             "monthly_cost": 750, "setup_cost": 3_000, "implementation_weeks": 2,
             "controls_count": 14, "gap_reduction": 0.78,
             "description": "Role-based training with compliance mapping and reporting"},
        ],
    },
}

# ── Tier Definitions ──────────────────────────────────────────────────────────

TIER_CONFIGS = {
    "conservative": {
        "key": "conservative",
        "label": "Conservative",
        "subtitle": "Least Aggressive",
        "description": "Address critical gaps only using cost-effective tools — minimum viable compliance that satisfies auditor requirements.",
        "tool_tier": "budget",
        "gap_coverage_pct": 0.60,
        "timeline_months": 20,
        "breach_risk_reduction": 0.45,
        "labor_savings_pct": 0.18,
        "audit_savings_pct": 0.35,
        "categories_included": ["iam", "edr", "grc", "awareness", "vm"],
        "color": "blue",
        "phases": [
            {"name": "Foundation", "month_range": "1–6", "focus": "IAM + Awareness + GRC platform"},
            {"name": "Detection", "month_range": "7–12", "focus": "EDR + Vulnerability Management"},
            {"name": "Hardening", "month_range": "13–20", "focus": "Gaps remediation + first audit"},
        ],
    },
    "balanced": {
        "key": "balanced",
        "label": "Balanced",
        "subtitle": "Aggressive",
        "description": "Risk-optimized coverage — address critical and high gaps with proven mid-market tools across all control families.",
        "tool_tier": "mid",
        "gap_coverage_pct": 0.80,
        "timeline_months": 10,
        "breach_risk_reduction": 0.68,
        "labor_savings_pct": 0.28,
        "audit_savings_pct": 0.55,
        "categories_included": ["iam", "edr", "siem", "vm", "grc", "cloud", "awareness", "network"],
        "color": "indigo",
        "is_recommended": True,
        "phases": [
            {"name": "Critical Controls", "month_range": "1–3", "focus": "IAM + EDR — stop the bleeding"},
            {"name": "Visibility", "month_range": "4–6", "focus": "SIEM + VM + GRC — evidence collection"},
            {"name": "Full Coverage", "month_range": "7–10", "focus": "Cloud + Network + Audit readiness"},
        ],
    },
    "aggressive": {
        "key": "aggressive",
        "label": "Most Aggressive",
        "subtitle": "Full Remediation",
        "description": "Complete remediation across all gap categories using best-in-class enterprise tools — maximum risk reduction, fastest certification path.",
        "tool_tier": "premium",
        "gap_coverage_pct": 1.00,
        "timeline_months": 5,
        "breach_risk_reduction": 0.85,
        "labor_savings_pct": 0.40,
        "audit_savings_pct": 0.75,
        "categories_included": list(TOOL_CATALOG.keys()),
        "color": "purple",
        "phases": [
            {"name": "All-In Deployment", "month_range": "1–2", "focus": "IAM + EDR + SIEM simultaneously"},
            {"name": "Data & Cloud", "month_range": "3–4", "focus": "DLP + CSPM + Network — full posture"},
            {"name": "Certify", "month_range": "5", "focus": "Audit, gaps close, certification"},
        ],
    },
}


# ── Breach Cost Model (IBM 2023 Cost of Data Breach, scaled to ARR) ──────────

def _breach_model(arr: float) -> Dict[str, float]:
    if arr <= 0:
        arr = 1_000_000
    if arr < 1_000_000:
        return {"avg_breach_cost": 500_000, "annual_probability": 0.22}
    elif arr < 5_000_000:
        return {"avg_breach_cost": 1_200_000, "annual_probability": 0.18}
    elif arr < 20_000_000:
        return {"avg_breach_cost": 2_500_000, "annual_probability": 0.15}
    elif arr < 100_000_000:
        return {"avg_breach_cost": 4_450_000, "annual_probability": 0.14}
    else:
        return {"avg_breach_cost": arr * 0.06, "annual_probability": 0.12}


def _fine_avoidance(arr: float, frameworks: List[str]) -> float:
    total = 0.0
    fw = [f.upper() for f in frameworks]
    if any(x in fw for x in ["HIPAA", "HITECH"]):
        total += min(arr * 0.038, 1_900_000)
    if "PCI" in fw or "PCI-DSS" in fw:
        total += 72_000  # $6k/mo mid estimate
    if "GDPR" in fw:
        total += arr * 0.02  # 2% of revenue risk
    if "FEDRAMP" in fw or "FedRAMP" in fw:
        total += arr * 0.12  # govt contract opportunity
    if "SOC2" in fw or "SOC 2" in fw:
        total += arr * 0.015  # customer-required / lost deal cost
    if "ISO27001" in fw or "ISO 27001" in fw:
        total += arr * 0.01
    if "NIST" in fw:
        total += 30_000
    return round(total)


def _select_tools(tier_config: Dict, gap_by_category: Dict) -> List[Dict]:
    """Pick one tool per relevant category at the correct price tier."""
    tier_name = tier_config["tool_tier"]
    selected = []
    for cat_key in tier_config["categories_included"]:
        cat = TOOL_CATALOG.get(cat_key)
        if not cat:
            continue
        # Only include if there are gaps in this category (or it's a foundation category)
        foundation = ["iam", "grc", "awareness"]
        if gap_by_category.get(cat_key, 0) == 0 and cat_key not in foundation:
            continue
        tool = next((t for t in cat["tools"] if t["tier"] == tier_name), cat["tools"][0])
        selected.append({**tool, "category": cat_key, "category_label": cat["label"]})
    return selected


def _calculate_costs(tools: List[Dict], tier_config: Dict) -> Dict[str, float]:
    monthly_license = sum(t["monthly_cost"] for t in tools)
    one_time_setup = sum(t["setup_cost"] for t in tools)
    # PS multiplier: aggressive = more parallel work = higher setup cost
    ps_multiplier = {"conservative": 1.0, "balanced": 1.3, "aggressive": 1.8}.get(
        tier_config["key"], 1.0
    )
    one_time_setup = round(one_time_setup * ps_multiplier)
    annual_license = monthly_license * 12
    total_year_1 = annual_license + one_time_setup
    return {
        "monthly_license": round(monthly_license),
        "one_time_setup": round(one_time_setup),
        "annual_license": round(annual_license),
        "total_year_1": round(total_year_1),
        "total_year_3": round(annual_license * 3 + one_time_setup),
    }


def _calculate_roi(
    tier_config: Dict,
    costs: Dict[str, float],
    arr: float,
    headcount: int,
    security_spend: float,
    frameworks: List[str],
) -> Dict[str, Any]:
    bm = _breach_model(arr)
    risk_before = bm["avg_breach_cost"] * bm["annual_probability"]
    risk_after = risk_before * (1.0 - tier_config["breach_risk_reduction"])
    annual_risk_savings = risk_before - risk_after

    fine_avoidance = _fine_avoidance(arr, frameworks)

    # Labor savings: 1 analyst per 75 employees, $125k loaded cost, tier % savings
    analyst_fte = max(1, headcount // 75)
    analyst_cost = analyst_fte * 125_000
    labor_savings = analyst_cost * tier_config["labor_savings_pct"]

    # Audit prep savings: $25k baseline per audit × 2 audits × tier %
    audit_savings = 25_000 * 2 * tier_config["audit_savings_pct"]

    total_annual_benefit = annual_risk_savings + fine_avoidance + labor_savings + audit_savings

    annual_program_cost = costs["total_year_1"]  # year 1 (includes setup)
    ongoing_annual = costs["annual_license"]      # year 2+ (license only)

    net_roi_12m = total_annual_benefit - annual_program_cost
    net_roi_24m = (total_annual_benefit * 2) - (annual_program_cost + ongoing_annual)
    net_roi_36m = (total_annual_benefit * 3) - (annual_program_cost + ongoing_annual * 2)

    roi_pct = (
        (total_annual_benefit - annual_program_cost) / annual_program_cost * 100
        if annual_program_cost > 0 else 0
    )
    payback_months = (
        round(annual_program_cost / total_annual_benefit * 12, 1)
        if total_annual_benefit > 0 else 999
    )

    return {
        "annual_risk_savings": round(annual_risk_savings),
        "fine_avoidance": round(fine_avoidance),
        "labor_savings": round(labor_savings),
        "audit_savings": round(audit_savings),
        "total_annual_benefit": round(total_annual_benefit),
        "net_roi_12m": round(net_roi_12m),
        "net_roi_24m": round(net_roi_24m),
        "net_roi_36m": round(net_roi_36m),
        "roi_pct": round(roi_pct, 1),
        "payback_months": payback_months,
        "breach_probability_before": round(bm["annual_probability"] * 100, 1),
        "breach_probability_after": round(bm["annual_probability"] * (1 - tier_config["breach_risk_reduction"]) * 100, 1),
        "avg_breach_cost": round(bm["avg_breach_cost"]),
    }


def _build_milestones(tier_config: Dict, tools: List[Dict]) -> List[Dict]:
    """Build per-phase milestones sorted by priority."""
    phases = tier_config["phases"]
    milestones = []
    # Distribute tools across phases evenly
    tools_per_phase = max(1, math.ceil(len(tools) / len(phases)))
    for i, phase in enumerate(phases):
        phase_tools = tools[i * tools_per_phase: (i + 1) * tools_per_phase]
        phase_cost = sum(t["monthly_cost"] for t in phase_tools)
        milestones.append({
            "phase": i + 1,
            "name": phase["name"],
            "month_range": phase["month_range"],
            "focus": phase["focus"],
            "tools": [{"name": t["name"], "vendor": t["vendor"], "category_label": t["category_label"]} for t in phase_tools],
            "monthly_cost_added": phase_cost,
            "controls_addressed": sum(t["controls_count"] for t in phase_tools),
        })
    return milestones


def _narrative(tier_config: Dict, gap_summary: Dict, roi: Dict, arr: float, costs: Dict) -> str:
    key = tier_config["key"]
    critical = gap_summary.get("critical", 0)
    total_gaps = gap_summary.get("total", 0)
    coverage = int(tier_config["gap_coverage_pct"] * 100)
    arr_m = arr / 1_000_000
    breach_cost = roi["avg_breach_cost"] / 1_000_000
    payback = roi["payback_months"]

    if key == "conservative":
        return (
            f"The Conservative path prioritizes your {critical} critical compliance gaps "
            f"using proven, cost-effective tools over {tier_config['timeline_months']} months. "
            f"At ${arr_m:.1f}M ARR your estimated annual breach exposure is ${breach_cost:.1f}M — "
            f"this tier reduces that risk by {int(tier_config['breach_risk_reduction']*100)}%. "
            f"Covering {coverage}% of the {total_gaps} identified gaps, payback arrives in "
            f"approximately {payback} months. Best for organizations under budget pressure "
            f"that need to demonstrate baseline compliance to customers or auditors."
        )
    elif key == "balanced":
        return (
            f"The Balanced approach delivers the strongest risk-adjusted return. "
            f"Addressing {coverage}% of your {total_gaps} identified gaps in just "
            f"{tier_config['timeline_months']} months, it closes both critical and high-severity "
            f"exposures across IAM, endpoint, SIEM, and cloud. "
            f"With ${roi['total_annual_benefit']:,.0f} in annualized benefits vs. "
            f"${costs['total_year_1']:,.0f} in year-one investment, ROI turns positive "
            f"in ~{payback} months. "
            f"This tier is recommended for most growing companies with {int(arr_m)}-figure ARR."
        )
    else:
        return (
            f"The Most Aggressive path deploys enterprise-grade tooling across all "
            f"{len(tier_config['categories_included'])} control categories simultaneously, "
            f"closing {coverage}% of gaps in only {tier_config['timeline_months']} months. "
            f"The {int(tier_config['breach_risk_reduction']*100)}% risk reduction and "
            f"${roi['net_roi_36m']:,.0f} 3-year net ROI justify the premium investment "
            f"for organizations under regulatory pressure, pursuing enterprise contracts, "
            f"or preparing for rapid scale. "
            f"Fastest path to SOC 2, ISO 27001, or FedRAMP certification."
        )


def _recommended_tier(
    arr: float,
    gap_summary: Dict,
    risk_tolerance: str,
) -> str:
    critical = gap_summary.get("critical", 0)
    total = gap_summary.get("total", 0)

    # Risk-tolerance override
    if risk_tolerance == "conservative":
        return "conservative"
    if risk_tolerance == "aggressive":
        return "aggressive"

    # Algorithmic: high ARR or many critical gaps → balanced at minimum
    if arr >= 50_000_000 or critical >= 20:
        return "aggressive"
    if arr >= 5_000_000 or critical >= 8 or total >= 30:
        return "balanced"
    return "conservative"


# ── Request / Response models ─────────────────────────────────────────────────

class GapByCategory(BaseModel):
    iam: int = 0
    edr: int = 0
    siem: int = 0
    vm: int = 0
    dlp: int = 0
    grc: int = 0
    cloud: int = 0
    network: int = 0
    awareness: int = 0


class GapSummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    total: int = 0
    total_controls: int = 0
    by_category: GapByCategory = GapByCategory()


class TCOAnalyzeRequest(BaseModel):
    arr: float = Field(default=0, description="Annual Recurring Revenue in USD")
    operating_cost: float = Field(default=0, description="Annual operating cost in USD")
    headcount: int = Field(default=50, ge=1)
    security_spend: float = Field(default=0, description="Current annual security spend in USD")
    risk_tolerance: str = Field(default="balanced", description="conservative | balanced | aggressive")
    frameworks: List[str] = Field(default_factory=list)
    gap_summary: GapSummary = GapSummary()


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/api/tco/analyze")
async def analyze_tco(
    payload: TCOAnalyzeRequest,
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns a full 3-tier TCO analysis keyed to the company's real compliance
    gap profile, financials, and risk tolerance.
    """
    gap_dict = payload.gap_summary.by_category.model_dump()
    frameworks = payload.frameworks or []
    arr = max(payload.arr, 0.0)
    headcount = max(payload.headcount, 1)

    recommended = _recommended_tier(arr, payload.gap_summary.model_dump(), payload.risk_tolerance)

    tiers: Dict[str, Any] = {}
    for tier_key, tier_config in TIER_CONFIGS.items():
        tools = _select_tools(tier_config, gap_dict)
        costs = _calculate_costs(tools, tier_config)
        roi = _calculate_roi(tier_config, costs, arr, headcount, payload.security_spend, frameworks)
        milestones = _build_milestones(tier_config, tools)
        narrative = _narrative(tier_config, payload.gap_summary.model_dump(), roi, arr, costs)

        tiers[tier_key] = {
            "key": tier_key,
            "label": tier_config["label"],
            "subtitle": tier_config["subtitle"],
            "description": tier_config["description"],
            "is_recommended": tier_key == recommended,
            "timeline_months": tier_config["timeline_months"],
            "gap_coverage_pct": tier_config["gap_coverage_pct"],
            "breach_risk_reduction": tier_config["breach_risk_reduction"],
            "color": tier_config["color"],
            "tools": tools,
            "costs": costs,
            "roi": roi,
            "milestones": milestones,
            "phases": tier_config["phases"],
            "narrative": narrative,
        }

    # Market pricing reference (full catalog, one row per tool)
    market_catalog = [
        {
            "category": cat_key,
            "category_label": cat["label"],
            "priority_order": cat["priority_order"],
            **tool,
        }
        for cat_key, cat in sorted(TOOL_CATALOG.items(), key=lambda x: x[1]["priority_order"])
        for tool in cat["tools"]
    ]

    # Recommendation reason
    critical = payload.gap_summary.critical
    reason_parts = []
    if arr >= 50_000_000:
        reason_parts.append(f"enterprise ARR (${arr/1e6:.0f}M)")
    if critical >= 8:
        reason_parts.append(f"{critical} critical unresolved gaps")
    if not reason_parts:
        reason_parts.append("balanced risk/cost profile")
    recommendation_reason = (
        f"Based on your {', '.join(reason_parts)}, the {TIER_CONFIGS[recommended]['label']} "
        f"tier delivers the strongest risk-adjusted return."
    )

    return {
        "recommended_tier": recommended,
        "recommendation_reason": recommendation_reason,
        "tiers": tiers,
        "market_catalog": market_catalog,
        "inputs_summary": {
            "arr": arr,
            "headcount": headcount,
            "security_spend": payload.security_spend,
            "frameworks": frameworks,
            "gap_summary": payload.gap_summary.model_dump(),
        },
    }
