"""
AI Intake Assessment Wizard — compliance framework recommendation engine.

Accepts structured answers from the frontend multi-step wizard and returns:
  • Ranked framework recommendations with rationale and priority scores
  • A phased implementation roadmap (30/60/90/180-day)
  • Estimated effort and cost ranges per framework
  • Quick-win control suggestions
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class WizardAnswers(BaseModel):
    # Step 1 — Organisation
    industry: str                          # Healthcare | Financial | Government | Technology | Retail | Education | Other
    company_size: str                      # 1-50 | 51-200 | 201-1000 | 1000+
    geography: str                         # US Only | US + EU | Global
    data_types: List[str]                  # PII | PHI | Financial | Federal/CUI | AI/ML | None

    # Step 2 — Regulatory environment
    government_contractor: bool = False
    federal_agency_customer: bool = False
    handles_phi: bool = False
    processes_payments: bool = False
    enterprise_customers: bool = False
    eu_customers: bool = False
    seeking_investment_ipo: bool = False
    ai_products: bool = False

    # Step 3 — Current security posture
    existing_certifications: List[str] = []   # SOC2 | ISO27001 | PCI | HIPAA | FedRAMP | None
    has_security_team: bool = False
    has_edr: bool = False
    has_siem: bool = False
    had_breach: bool = False

    # Step 4 — Business goals
    primary_goal: str = "Win customers"   # Win customers | Reduce risk | Regulatory | Investment | Customer requirement
    timeline_months: int = 12
    budget_tier: str = "$50K-$200K"       # <$50K | $50K-$200K | $200K-$500K | $500K+

    # Optional: specific frameworks already in scope
    desired_frameworks: List[str] = []


# ---------------------------------------------------------------------------
# Scoring engine
# ---------------------------------------------------------------------------

FRAMEWORKS = {
    "SOC2":        {"name": "SOC 2 Type II",          "version": "AICPA 2022",       "typical_months": 9,  "cost_low": 30000,  "cost_high": 120000},
    "ISO27001":    {"name": "ISO 27001:2022",          "version": "2022",             "typical_months": 12, "cost_low": 50000,  "cost_high": 200000},
    "NIST_800-53": {"name": "NIST SP 800-53",          "version": "Rev 5",            "typical_months": 18, "cost_low": 80000,  "cost_high": 400000},
    "NIST_800-171":{"name": "NIST SP 800-171",         "version": "Rev 2",            "typical_months": 12, "cost_low": 40000,  "cost_high": 150000},
    "FedRAMP":     {"name": "FedRAMP",                 "version": "High Baseline",    "typical_months": 24, "cost_low": 500000, "cost_high": 2000000},
    "HIPAA":       {"name": "HIPAA Security Rule",     "version": "2013",             "typical_months": 6,  "cost_low": 20000,  "cost_high": 80000},
    "PCI_DSS":     {"name": "PCI DSS",                 "version": "v4.0",             "typical_months": 9,  "cost_low": 30000,  "cost_high": 150000},
    "CIS":         {"name": "CIS Controls",            "version": "v8",               "typical_months": 6,  "cost_low": 15000,  "cost_high": 60000},
    "NIST_AI_RMF": {"name": "NIST AI RMF",             "version": "1.0",              "typical_months": 6,  "cost_low": 20000,  "cost_high": 80000},
    "MITRE_ATLAS": {"name": "MITRE ATLAS",             "version": "v5.6",             "typical_months": 4,  "cost_low": 10000,  "cost_high": 50000},
}


def _score(answers: WizardAnswers) -> Dict[str, int]:
    """Return a relevance score 0-100 for each framework."""
    s = {k: 0 for k in FRAMEWORKS}

    # ── Industry signals ─────────────────────────────────────────────────────
    if answers.industry == "Healthcare":
        s["HIPAA"]       += 100  # mandatory
        s["SOC2"]        +=  55
        s["ISO27001"]    +=  40
        s["CIS"]         +=  35

    elif answers.industry == "Financial":
        s["SOC2"]        +=  80
        s["PCI_DSS"]     +=  70
        s["ISO27001"]    +=  60
        s["CIS"]         +=  40

    elif answers.industry == "Government":
        s["NIST_800-53"] +=  90
        s["FedRAMP"]     +=  75
        s["NIST_800-171"]+=  65
        s["CIS"]         +=  40

    elif answers.industry == "Technology":
        s["SOC2"]        +=  80
        s["ISO27001"]    +=  55
        s["CIS"]         +=  50

    elif answers.industry == "Retail":
        s["PCI_DSS"]     +=  85
        s["SOC2"]        +=  50
        s["CIS"]         +=  40

    else:  # Education / Other
        s["SOC2"]        +=  50
        s["CIS"]         +=  45
        s["ISO27001"]    +=  40

    # ── Data types ───────────────────────────────────────────────────────────
    if "PHI" in answers.data_types:
        s["HIPAA"]       +=  50
    if "PII" in answers.data_types:
        s["SOC2"]        +=  20
        s["ISO27001"]    +=  15
    if "Financial" in answers.data_types:
        s["PCI_DSS"]     +=  25
        s["SOC2"]        +=  15
    if "Federal/CUI" in answers.data_types:
        s["NIST_800-171"]+=  50
        s["FedRAMP"]     +=  30
    if "AI/ML" in answers.data_types:
        s["NIST_AI_RMF"] +=  60
        s["MITRE_ATLAS"] +=  40

    # ── Regulatory signals ───────────────────────────────────────────────────
    if answers.government_contractor:
        s["NIST_800-171"]+=  60
        s["NIST_800-53"] +=  30
    if answers.federal_agency_customer:
        s["FedRAMP"]     +=  70
        s["NIST_800-53"] +=  40
    if answers.handles_phi:
        s["HIPAA"]       +=  60
    if answers.processes_payments:
        s["PCI_DSS"]     +=  60
    if answers.enterprise_customers:
        s["SOC2"]        +=  40
        s["ISO27001"]    +=  25
    if answers.eu_customers:
        s["ISO27001"]    +=  35
    if answers.seeking_investment_ipo:
        s["SOC2"]        +=  30
        s["ISO27001"]    +=  20
    if answers.ai_products:
        s["NIST_AI_RMF"] +=  50
        s["MITRE_ATLAS"] +=  35

    # ── Goal / timeline pressure ─────────────────────────────────────────────
    urgency = max(0, 18 - answers.timeline_months)  # 0-17
    if answers.primary_goal == "Win customers":
        s["SOC2"]        +=  20 + urgency
    if answers.primary_goal == "Regulatory":
        # Boost whichever is already highest (user said it's mandatory)
        top = max(s, key=lambda k: s[k])
        s[top]           +=  25

    # ── Budget filter — cap expensive frameworks when budget is low ──────────
    if answers.budget_tier == "<$50K":
        s["FedRAMP"]     = min(s["FedRAMP"], 30)
        s["NIST_800-53"] = min(s["NIST_800-53"], 40)
        s["ISO27001"]    = min(s["ISO27001"], 50)

    # ── Existing certifications — avoid duplicating already-certified frameworks
    for cert in answers.existing_certifications:
        if cert in s:
            s[cert] = max(s[cert] - 50, 0)

    # ── Explicitly requested frameworks get a floor ──────────────────────────
    for fw in answers.desired_frameworks:
        if fw in s:
            s[fw] = max(s[fw], 70)

    # Clamp 0-100
    return {k: min(100, max(0, v)) for k, v in s.items()}


def _priority_label(score: int) -> str:
    if score >= 80:  return "Critical"
    if score >= 60:  return "High"
    if score >= 40:  return "Medium"
    if score >= 20:  return "Low"
    return "Optional"


def _rationale(fw: str, answers: WizardAnswers, score: int) -> str:
    reasons = []
    if fw == "SOC2":
        if answers.enterprise_customers:    reasons.append("required by enterprise customers")
        if answers.seeking_investment_ipo:  reasons.append("expected by investors / acquirers")
        if answers.industry == "Technology":reasons.append("de-facto standard for SaaS companies")
        reasons.append(f"score {score}/100 based on your profile")
    elif fw == "ISO27001":
        if answers.eu_customers:            reasons.append("EU customers typically require ISO 27001")
        reasons.append("internationally recognised information security management standard")
    elif fw == "HIPAA":
        if answers.handles_phi or "PHI" in answers.data_types:
            reasons.append("federally mandated for any entity that creates, receives, or transmits PHI")
    elif fw == "PCI_DSS":
        if answers.processes_payments:      reasons.append("mandatory if you store, process, or transmit cardholder data")
    elif fw == "FedRAMP":
        if answers.federal_agency_customer: reasons.append("required to sell cloud services to US federal agencies")
    elif fw == "NIST_800-171":
        if answers.government_contractor:   reasons.append("required for DoD / federal supply chain contracts (DFARS 252.204-7012)")
    elif fw == "NIST_800-53":
        reasons.append("comprehensive risk management for federal systems and high-assurance environments")
    elif fw == "CIS":
        reasons.append("practical, prioritised security controls — ideal starting point before larger frameworks")
    elif fw == "NIST_AI_RMF":
        if answers.ai_products:             reasons.append("voluntary but fast-becoming an expected baseline for AI products")
    elif fw == "MITRE_ATLAS":
        if answers.ai_products:             reasons.append("adversarial threat modelling specifically for AI/ML systems")
    return "; ".join(reasons) if reasons else f"relevant to your industry and risk profile (score {score}/100)"


def _build_roadmap(ranked: list, answers: WizardAnswers) -> dict:
    """Assign frameworks to 30/90/180/365-day phases based on urgency & effort."""
    phases = {"0-90 days": [], "90-180 days": [], "180-365 days": [], "12-24 months": []}

    for item in ranked:
        if item["priority"] in ("Critical",) and item["typical_months"] <= 6:
            phases["0-90 days"].append(item["framework"])
        elif item["priority"] in ("Critical", "High") and item["typical_months"] <= 12:
            phases["90-180 days"].append(item["framework"])
        elif item["priority"] in ("High", "Medium") and item["typical_months"] <= 18:
            phases["180-365 days"].append(item["framework"])
        else:
            phases["12-24 months"].append(item["framework"])

    quick_wins = [
        "Enable MFA on all administrator accounts",
        "Inventory all systems and data stores",
        "Implement centralised logging (SIEM or cloud-native)",
        "Conduct a gap assessment against your top framework",
        "Document an Incident Response policy",
        "Deploy EDR on all endpoints",
        "Create a data classification policy",
        "Establish a vulnerability management programme",
    ]

    return {"phases": phases, "quick_wins": quick_wins[:5]}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/api/wizard/assess")
def assess_frameworks(answers: WizardAnswers) -> Dict[str, Any]:
    """
    Score all frameworks against the wizard answers and return ranked
    recommendations, a phased roadmap, and quick-win suggestions.
    """
    scores = _score(answers)

    ranked = []
    for fw, score in sorted(scores.items(), key=lambda x: -x[1]):
        if score == 0:
            continue
        meta = FRAMEWORKS[fw]
        ranked.append({
            "framework":        fw,
            "name":             meta["name"],
            "score":            score,
            "priority":         _priority_label(score),
            "rationale":        _rationale(fw, answers, score),
            "typical_months":   meta["typical_months"],
            "cost_low":         meta["cost_low"],
            "cost_high":        meta["cost_high"],
            "version":          meta["version"],
        })

    roadmap = _build_roadmap(ranked, answers)

    # Total cost range (top 3 recommendations)
    top3 = ranked[:3]
    total_low  = sum(r["cost_low"]  for r in top3)
    total_high = sum(r["cost_high"] for r in top3)

    return {
        "recommendations": ranked,
        "roadmap":         roadmap,
        "summary": {
            "frameworks_assessed":    len(FRAMEWORKS),
            "frameworks_recommended": len([r for r in ranked if r["score"] >= 40]),
            "estimated_cost_low":     total_low,
            "estimated_cost_high":    total_high,
            "estimated_months":       max((r["typical_months"] for r in top3), default=12),
        }
    }
