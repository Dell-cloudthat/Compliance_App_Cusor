"""
SecurityOS MSP (Managed Service Provider) API

MSPs manage multiple client organizations under a single account.
This router provides the MSP portal backend:

  POST   /api/v1/securityos/msp/{msp_id}/orgs              — create managed org
  GET    /api/v1/securityos/msp/{msp_id}/orgs              — list all managed orgs
  GET    /api/v1/securityos/msp/{msp_id}/orgs/{org_id}     — get one managed org
  DELETE /api/v1/securityos/msp/{msp_id}/orgs/{org_id}     — remove managed org
  GET    /api/v1/securityos/msp/{msp_id}/orgs/{org_id}/score  — get org score
  GET    /api/v1/securityos/msp/{msp_id}/dashboard         — aggregate dashboard

Authentication: every route requires a valid Bearer JWT.
Tenant isolation: the caller's msp_id from the JWT must match the path msp_id.
Storage: in-memory dicts (swap for PostgreSQL via securityos_schema.sql when DATABASE_URL is set).
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.auth.context import Principal, get_principal, require_msp_access
from backend.repositories.msp_org_repo import msp_org_repo
from backend.scoring.engine import calculate_score, ControlStatus

router = APIRouter(prefix="/api/v1/securityos/msp", tags=["MSP"])


# ── In-memory stores ──────────────────────────────────────────────────────────
# Structure: _msp_orgs[msp_id][org_id] = {name, profile, statuses, created_at, ...}
_msp_orgs: Dict[str, Dict[str, Dict]] = {}


# ── Pydantic models ───────────────────────────────────────────────────────────

class ManagedOrgCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=200, description="Client organization name")
    industry: str = ""
    employee_count: str = ""
    email_provider: str = ""
    cloud_providers: List[str] = []
    sensitive_data: List[str] = []
    contact_email: Optional[str] = None
    notes: Optional[str] = None


class ManagedOrgUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    industry: Optional[str] = None
    employee_count: Optional[str] = None
    email_provider: Optional[str] = None
    cloud_providers: Optional[List[str]] = None
    sensitive_data: Optional[List[str]] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_msp_org(msp_id: str, org_id: str) -> Dict:
    orgs = _msp_orgs.get(msp_id, {})
    org = orgs.get(org_id)
    if not org:
        raise HTTPException(
            status_code=404,
            detail=f"Managed org '{org_id}' not found under MSP '{msp_id}'",
        )
    return org


def _score_org(org: Dict) -> Dict:
    statuses = org.get("statuses", {})
    profile  = org.get("profile", {})
    result   = calculate_score(statuses, business_profile=profile)
    return {
        "total_score": result.total_score,
        "grade": result.grade,
        "color": result.color,
        "verified_pct": result.verified_pct,
        "summary": result.summary,
        "top_issues": [
            {
                "control_id": c.control_id,
                "name": c.name,
                "short_name": c.short_name,
                "severity": c.severity,
                "status": c.status,
                "customer_message": c.customer_message,
            }
            for c in result.top_issues
        ],
    }


def _risk_level(score: int) -> str:
    if score >= 80: return "low"
    if score >= 65: return "moderate"
    if score >= 45: return "high"
    return "critical"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/{msp_id}/orgs", status_code=201, summary="Create a managed client org")
def create_managed_org(
    msp_id: str,
    payload: ManagedOrgCreate,
    principal: Principal = Depends(get_principal),
):
    """
    Create a new managed client organization under this MSP account.
    Returns the new org record including its generated org_id.
    """
    require_msp_access(principal, msp_id)

    org_id = f"org-{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow().isoformat()

    org = {
        "org_id": org_id,
        "msp_id": msp_id,
        "name": payload.name,
        "contact_email": payload.contact_email,
        "notes": payload.notes,
        "profile": {
            "business_name": payload.name,
            "industry": payload.industry,
            "employee_count": payload.employee_count,
            "email_provider": payload.email_provider,
            "cloud_providers": payload.cloud_providers,
            "sensitive_data": payload.sensitive_data,
        },
        "statuses": {},   # populated as evidence flows in
        "created_at": now,
        "updated_at": now,
    }

    if msp_id not in _msp_orgs:
        _msp_orgs[msp_id] = {}
    _msp_orgs[msp_id][org_id] = org
    msp_org_repo.add_org(msp_id, org_id)

    score = _score_org(org)
    return {"org_id": org_id, "msp_id": msp_id, "name": payload.name, "score": score, "created_at": now}


@router.get("/{msp_id}/orgs", summary="List all managed client orgs")
def list_managed_orgs(
    msp_id: str,
    principal: Principal = Depends(get_principal),
):
    """
    Return all client organizations managed by this MSP, with their current scores.
    Sorted by score ascending (highest risk first) for the MSP dashboard.
    """
    require_msp_access(principal, msp_id)

    orgs = _msp_orgs.get(msp_id, {})

    results = []
    for org in orgs.values():
        score = _score_org(org)
        results.append({
            "org_id": org["org_id"],
            "name": org["name"],
            "industry": org["profile"].get("industry", ""),
            "contact_email": org.get("contact_email"),
            "score": score["total_score"],
            "grade": score["grade"],
            "color": score["color"],
            "risk_level": _risk_level(score["total_score"]),
            "open_issues": score["summary"].get("failing", 0) + score["summary"].get("unknown", 0),
            "verified_pct": score["verified_pct"],
            "top_issue": score["top_issues"][0]["short_name"] if score["top_issues"] else None,
            "updated_at": org["updated_at"],
        })

    # Sort: critical risk first, then high, then score ascending within group
    risk_order = {"critical": 0, "high": 1, "moderate": 2, "low": 3}
    results.sort(key=lambda x: (risk_order.get(x["risk_level"], 4), x["score"]))

    return {
        "msp_id": msp_id,
        "total_orgs": len(results),
        "orgs": results,
    }


@router.get("/{msp_id}/orgs/{org_id}", summary="Get one managed org")
def get_managed_org(
    msp_id: str,
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """Return full details for one managed client org including profile and current score."""
    require_msp_access(principal, msp_id)
    org = _get_msp_org(msp_id, org_id)
    score = _score_org(org)
    return {**org, "current_score": score}


@router.patch("/{msp_id}/orgs/{org_id}", summary="Update a managed org's profile")
def update_managed_org(
    msp_id: str,
    org_id: str,
    payload: ManagedOrgUpdate,
    principal: Principal = Depends(get_principal),
):
    """Update name, industry, contact info, or other profile fields for a managed org."""
    require_msp_access(principal, msp_id)
    org = _get_msp_org(msp_id, org_id)

    if payload.name is not None:
        org["name"] = payload.name
        org["profile"]["business_name"] = payload.name
    if payload.industry is not None:
        org["profile"]["industry"] = payload.industry
    if payload.employee_count is not None:
        org["profile"]["employee_count"] = payload.employee_count
    if payload.email_provider is not None:
        org["profile"]["email_provider"] = payload.email_provider
    if payload.cloud_providers is not None:
        org["profile"]["cloud_providers"] = payload.cloud_providers
    if payload.sensitive_data is not None:
        org["profile"]["sensitive_data"] = payload.sensitive_data
    if payload.contact_email is not None:
        org["contact_email"] = payload.contact_email
    if payload.notes is not None:
        org["notes"] = payload.notes

    org["updated_at"] = datetime.utcnow().isoformat()
    return {"org_id": org_id, "updated": True, "org": org}


@router.delete("/{msp_id}/orgs/{org_id}", status_code=204, summary="Remove a managed org")
def delete_managed_org(
    msp_id: str,
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """Remove a client organization from MSP management."""
    require_msp_access(principal, msp_id)
    _get_msp_org(msp_id, org_id)  # raises 404 if not found
    del _msp_orgs[msp_id][org_id]
    msp_org_repo.remove_org(msp_id, org_id)


@router.get("/{msp_id}/orgs/{org_id}/score", summary="Get score for a managed org")
def get_org_score(
    msp_id: str,
    org_id: str,
    principal: Principal = Depends(get_principal),
):
    """
    Calculate and return the Security Readiness Score for a managed client org.
    Identical to the standalone /score endpoint but scoped to MSP-managed orgs.
    """
    require_msp_access(principal, msp_id)
    org = _get_msp_org(msp_id, org_id)
    statuses = org.get("statuses", {})
    profile  = org.get("profile", {})
    result   = calculate_score(statuses, business_profile=profile)

    return {
        "org_id": org_id,
        "msp_id": msp_id,
        "org_name": org["name"],
        "total_score": result.total_score,
        "grade": result.grade,
        "color": result.color,
        "verified_pct": result.verified_pct,
        "confidence_note": result.confidence_note,
        "summary": result.summary,
        "categories": {
            cat_id: {
                "id": cat.id,
                "label": cat.label,
                "score": cat.score,
                "max_score": cat.max_score,
                "passing": cat.passing_count,
                "failing": cat.failing_count,
                "unknown": cat.unknown_count,
            }
            for cat_id, cat in result.categories.items()
        },
        "top_issues": [
            {
                "control_id": c.control_id,
                "name": c.name,
                "short_name": c.short_name,
                "severity": c.severity,
                "status": c.status,
                "customer_message": c.customer_message,
            }
            for c in result.top_issues
        ],
    }


@router.patch(
    "/{msp_id}/orgs/{org_id}/statuses/{control_id}",
    summary="Update a control status for a managed org",
)
def update_org_control_status(
    msp_id: str,
    org_id: str,
    control_id: str,
    status: str,
    notes: Optional[str] = None,
    evidence_source: str = "manual",
    principal: Principal = Depends(get_principal),
):
    """Update a single control status for a managed client org."""
    require_msp_access(principal, msp_id)
    org = _get_msp_org(msp_id, org_id)
    try:
        ControlStatus(status)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status}'. Valid: pass, fail, unknown, in_progress, not_applicable",
        )

    if "statuses" not in org:
        org["statuses"] = {}
    org["statuses"][control_id] = {
        "status": status,
        "notes": notes,
        "evidence_source": evidence_source,
        "last_checked": datetime.utcnow().isoformat(),
    }
    org["updated_at"] = datetime.utcnow().isoformat()
    return {"org_id": org_id, "control_id": control_id, "status": status}


@router.get("/{msp_id}/dashboard", summary="MSP aggregate dashboard")
def get_msp_dashboard(
    msp_id: str,
    principal: Principal = Depends(get_principal),
):
    """
    Aggregate view across all managed client orgs for the MSP portal.
    Returns portfolio-level risk metrics and per-org summary.
    """
    require_msp_access(principal, msp_id)

    orgs = _msp_orgs.get(msp_id, {})

    if not orgs:
        return {
            "msp_id": msp_id,
            "total_orgs": 0,
            "portfolio_score": None,
            "risk_distribution": {"critical": 0, "high": 0, "moderate": 0, "low": 0},
            "orgs_at_risk": [],
            "common_issues": [],
            "orgs": [],
        }

    org_scores = []
    all_issues: Dict[str, int] = {}

    for org in orgs.values():
        score = _score_org(org)
        risk = _risk_level(score["total_score"])
        org_scores.append({
            "org_id": org["org_id"],
            "name": org["name"],
            "score": score["total_score"],
            "grade": score["grade"],
            "color": score["color"],
            "risk_level": risk,
            "open_issues": score["summary"].get("failing", 0) + score["summary"].get("unknown", 0),
            "top_issue": score["top_issues"][0]["short_name"] if score["top_issues"] else None,
        })
        for issue in score["top_issues"]:
            all_issues[issue["short_name"]] = all_issues.get(issue["short_name"], 0) + 1

    portfolio_score = int(sum(o["score"] for o in org_scores) / len(org_scores)) if org_scores else 0

    risk_dist: Dict[str, int] = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
    for o in org_scores:
        risk_dist[o["risk_level"]] = risk_dist.get(o["risk_level"], 0) + 1

    orgs_at_risk = sorted(
        [o for o in org_scores if o["risk_level"] in ("critical", "high")],
        key=lambda x: x["score"],
    )

    common_issues = sorted(
        [{"name": k, "affected_orgs": v} for k, v in all_issues.items()],
        key=lambda x: -x["affected_orgs"],
    )[:5]

    risk_order = {"critical": 0, "high": 1, "moderate": 2, "low": 3}
    org_scores.sort(key=lambda x: (risk_order.get(x["risk_level"], 4), x["score"]))

    return {
        "msp_id": msp_id,
        "total_orgs": len(orgs),
        "portfolio_score": portfolio_score,
        "portfolio_grade": _portfolio_grade(portfolio_score),
        "risk_distribution": risk_dist,
        "orgs_at_risk": orgs_at_risk,
        "common_issues": common_issues,
        "orgs": org_scores,
        "generated_at": datetime.utcnow().isoformat(),
    }


def _portfolio_grade(score: int) -> str:
    if score >= 90: return "Excellent"
    if score >= 75: return "Good"
    if score >= 60: return "Fair"
    if score >= 40: return "Poor"
    return "At Risk"
