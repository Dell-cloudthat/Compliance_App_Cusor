"""
SecurityOS FastAPI router.
Handles business profiles, control status, scoring, and AI copilot.
"""
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import json
from pathlib import Path

# Load catalog from the single source of truth
_CATALOG_PATH = Path(__file__).parent.parent.parent / "compliance" / "controls" / "catalog.json"
with open(_CATALOG_PATH) as _f:
    CONTROLS = json.load(_f)
CONTROLS_BY_ID = {c["id"]: c for c in CONTROLS}

from backend.scoring.engine import calculate_score, ControlStatus

router = APIRouter(prefix="/api/v1/securityos", tags=["SecurityOS"])


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class BusinessProfile(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    industry: str = ""
    employee_count: str = ""
    revenue_range: str = ""
    cloud_providers: List[str] = []
    email_provider: str = ""
    sensitive_data: List[str] = []
    has_insurance: Optional[bool] = None
    regulatory_exposure: List[str] = []


class ControlStatusUpdate(BaseModel):
    control_id: str
    status: ControlStatus
    notes: Optional[str] = None


class BulkControlStatusUpdate(BaseModel):
    updates: List[ControlStatusUpdate]


class CopilotMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    control_statuses: Optional[Dict[str, Dict]] = None
    profile: Optional[Dict] = None


# ─── In-memory store (replace with DB in production) ─────────────────────────

_profiles: Dict[str, Dict] = {}
_control_statuses: Dict[str, Dict[str, Dict]] = {}


# ─── Controls Catalog ─────────────────────────────────────────────────────────

VALID_CATEGORIES = {"identity", "devices", "data", "network", "organization"}

@router.get("/controls")
def list_controls(category: Optional[str] = None):
    """Return the full controls catalog, optionally filtered by category."""
    controls = CONTROLS
    if category:
        if category not in VALID_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Unknown category: {category}. Valid: {sorted(VALID_CATEGORIES)}")
        controls = [c for c in CONTROLS if c["category"] == category]
    return {"controls": controls, "total": len(controls)}


@router.get("/controls/{control_id}")
def get_control(control_id: str):
    """Return a single control by ID."""
    control = CONTROLS_BY_ID.get(control_id)
    if not control:
        raise HTTPException(status_code=404, detail=f"Control {control_id} not found")
    return control


# ─── Business Profile ─────────────────────────────────────────────────────────

@router.post("/organizations/{org_id}/profile")
def update_profile(org_id: str, profile: BusinessProfile):
    """Create or update a business profile."""
    _profiles[org_id] = {**profile.dict(), "updated_at": datetime.utcnow().isoformat()}
    return {"org_id": org_id, "profile": _profiles[org_id]}


@router.get("/organizations/{org_id}/profile")
def get_profile(org_id: str):
    """Retrieve a business profile."""
    profile = _profiles.get(org_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# ─── Control Statuses ─────────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/statuses")
def get_control_statuses(org_id: str):
    """Get all control statuses for an organization."""
    statuses = _control_statuses.get(org_id, {})
    return {"org_id": org_id, "statuses": statuses}


@router.patch("/organizations/{org_id}/statuses")
def update_control_status(org_id: str, update: ControlStatusUpdate):
    """Update the status of a single control."""
    if update.control_id not in CONTROLS_BY_ID:
        raise HTTPException(status_code=404, detail=f"Control {update.control_id} not found")

    if org_id not in _control_statuses:
        _control_statuses[org_id] = {}

    _control_statuses[org_id][update.control_id] = {
        "status": update.status,
        "notes": update.notes,
        "last_checked": datetime.utcnow().isoformat(),
    }
    return {"control_id": update.control_id, "status": update.status}


@router.put("/organizations/{org_id}/statuses/bulk")
def bulk_update_control_statuses(org_id: str, payload: BulkControlStatusUpdate):
    """Update multiple control statuses at once."""
    if org_id not in _control_statuses:
        _control_statuses[org_id] = {}

    results = []
    for update in payload.updates:
        if update.control_id not in CONTROLS_BY_ID:
            continue
        _control_statuses[org_id][update.control_id] = {
            "status": update.status,
            "notes": update.notes,
            "last_checked": datetime.utcnow().isoformat(),
        }
        results.append({"control_id": update.control_id, "status": update.status})

    return {"updated": len(results), "results": results}


# ─── Scoring ──────────────────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/score")
def get_score(org_id: str):
    """Calculate and return the Security Readiness Score."""
    statuses = _control_statuses.get(org_id, {})
    profile = _profiles.get(org_id)
    result = calculate_score(statuses, business_profile=profile)
    return {
        "total_score": result.total_score,
        "max_score": result.max_score,
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


# ─── Trust Passport ───────────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/passport")
def get_trust_passport(org_id: str):
    """Generate a Trust Passport for an organization."""
    profile = _profiles.get(org_id, {})
    statuses = _control_statuses.get(org_id, {})
    score_data = calculate_score(statuses, business_profile=profile)

    KEY_PASSPORT_CONTROLS = [
        ("CTRL-ID-001", "Multi-Factor Authentication"),
        ("CTRL-DEV-001", "Device Encryption"),
        ("CTRL-DATA-003", "Data Backups"),
        ("CTRL-DEV-003", "Endpoint Protection"),
        ("CTRL-ORG-001", "Security Policy"),
        ("CTRL-ORG-002", "Incident Response"),
        ("CTRL-ORG-003", "Security Training"),
        ("CTRL-NET-004", "Admin Access Control"),
    ]

    control_summary = []
    for ctrl_id, label in KEY_PASSPORT_CONTROLS:
        entry = statuses.get(ctrl_id, {})
        control_summary.append({
            "control_id": ctrl_id,
            "label": label,
            "status": entry.get("status", ControlStatus.UNKNOWN),
            "last_checked": entry.get("last_checked"),
        })

    return {
        "org_id": org_id,
        "business_name": profile.get("business_name", ""),
        "industry": profile.get("industry", ""),
        "total_score": score_data.total_score,
        "grade": score_data.grade,
        "color": score_data.color,
        "category_scores": {
            cat_id: {"label": cat.label, "score": cat.score, "max_score": cat.max_score}
            for cat_id, cat in score_data.categories.items()
        },
        "key_controls": control_summary,
        "verified_at": datetime.utcnow().isoformat(),
        "summary": score_data.summary,
    }


# ─── AI Copilot (stub — connect to LLM in production) ─────────────────────────

@router.post("/copilot")
def copilot_query(payload: CopilotMessage):
    """
    AI Security Copilot endpoint.
    In production, this routes to an LLM with RAG over the control catalog and business profile.
    Currently returns structured context for client-side AI processing.
    """
    statuses = payload.control_statuses or {}
    profile = payload.profile or {}
    score_data = calculate_score(statuses, business_profile=profile)

    return {
        "context": {
            "score": score_data.total_score,
            "grade": score_data.grade,
            "open_issues": [
                {
                    "control_id": c.control_id,
                    "name": c.name,
                    "short_name": c.short_name,
                    "severity": c.severity,
                    "status": c.status,
                    "customer_message": c.customer_message,
                }
                for c in score_data.top_issues
            ],
            "profile_summary": {
                "industry": profile.get("industry", ""),
                "employee_count": profile.get("employee_count", ""),
                "sensitive_data": profile.get("sensitive_data", []),
            },
        },
        "message": payload.message,
        "note": "Connect to your preferred LLM provider with this context to generate responses.",
    }
