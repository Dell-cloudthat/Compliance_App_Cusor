"""
Consulting engagements, assessments, gap analysis, roadmaps, MSP portfolio routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services import consulting_service

router = APIRouter()


# ============================================================================
# CONSULTING PLATFORM - Engagements, Assessments, Roadmaps, Reports, MSP Portfolio
# ============================================================================

# ==================== Consulting Engagements ====================

class EngagementCreate(BaseModel):
    engagement_name: str
    engagement_type: str  # 'assessment', 'gap_analysis', 'roadmap', 'implementation', 'managed_services', 'audit_prep'
    service_areas: List[str]  # ['compliance', 'security_visibility', 'msp_enablement', 'reporting']
    client_org_id: Optional[int] = None
    frameworks_in_scope: Optional[List[str]] = None
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    engagement_value: float = 0.0
    billing_type: str = 'fixed'
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    engagement_notes: Optional[str] = None


@router.post("/api/consulting/engagements")
async def create_engagement_endpoint(
    data: EngagementCreate,
    user_id: int = Depends(get_current_user)
):
    """Create a new consulting engagement"""
    try:
        result = consulting_service.create_engagement(
            user_id=user_id,
            engagement_name=data.engagement_name,
            engagement_type=data.engagement_type,
            service_areas=data.service_areas,
            client_org_id=data.client_org_id,
            frameworks_in_scope=data.frameworks_in_scope,
            start_date=data.start_date,
            target_end_date=data.target_end_date,
            engagement_value=data.engagement_value,
            billing_type=data.billing_type,
            primary_contact_name=data.primary_contact_name,
            primary_contact_email=data.primary_contact_email,
            engagement_notes=data.engagement_notes
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create engagement: {str(e)}")


@router.get("/api/consulting/engagements")
async def list_engagements_endpoint(
    user_id: int = Depends(get_current_user),
    status: Optional[str] = Query(None),
    client_org_id: Optional[int] = Query(None)
):
    """List consulting engagements"""
    try:
        engagements = consulting_service.list_engagements(user_id, status, client_org_id)
        return {"engagements": engagements, "count": len(engagements)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list engagements: {str(e)}")


@router.get("/api/consulting/engagements/{engagement_id}")
async def get_engagement_endpoint(
    engagement_id: int,
    user_id: int = Depends(get_current_user)
):
    """Get engagement details"""
    try:
        engagement = consulting_service.get_engagement(engagement_id, user_id)
        if not engagement:
            raise HTTPException(status_code=404, detail="Engagement not found")
        return engagement
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get engagement: {str(e)}")


@router.put("/api/consulting/engagements/{engagement_id}/status")
async def update_engagement_status_endpoint(
    engagement_id: int,
    status: str = Query(...),
    user_id: int = Depends(get_current_user)
):
    """Update engagement status"""
    try:
        result = consulting_service.update_engagement_status(engagement_id, user_id, status)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")


class TimeEntryCreate(BaseModel):
    hours: float
    activity_type: str
    description: Optional[str] = None
    entry_date: Optional[str] = None
    billable: bool = True


@router.post("/api/consulting/engagements/{engagement_id}/time")
async def log_time_entry_endpoint(
    engagement_id: int,
    data: TimeEntryCreate,
    user_id: int = Depends(get_current_user)
):
    """Log time entry for engagement"""
    try:
        result = consulting_service.log_time_entry(
            engagement_id=engagement_id,
            user_id=user_id,
            hours=data.hours,
            activity_type=data.activity_type,
            description=data.description,
            entry_date=data.entry_date,
            billable=data.billable
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log time: {str(e)}")


# ==================== Assessments ====================

class AssessmentTemplateCreate(BaseModel):
    template_name: str
    template_type: str
    categories: List[Dict[str, Any]]
    questions: List[Dict[str, Any]]
    description: Optional[str] = None
    scoring_methodology: Optional[Dict[str, Any]] = None
    maturity_levels: Optional[List[Dict[str, Any]]] = None


@router.post("/api/consulting/assessment-templates")
async def create_assessment_template_endpoint(
    data: AssessmentTemplateCreate,
    user_id: int = Depends(get_current_user)
):
    """Create a proprietary assessment template"""
    try:
        result = consulting_service.create_assessment_template(
            user_id=user_id,
            template_name=data.template_name,
            template_type=data.template_type,
            categories=data.categories,
            questions=data.questions,
            description=data.description,
            scoring_methodology=data.scoring_methodology,
            maturity_levels=data.maturity_levels
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.get("/api/consulting/assessment-templates")
async def list_assessment_templates_endpoint(
    user_id: int = Depends(get_current_user),
    template_type: Optional[str] = Query(None)
):
    """List assessment templates"""
    try:
        templates = consulting_service.get_assessment_templates(user_id, template_type)
        return {"templates": templates, "count": len(templates)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {str(e)}")


@router.post("/api/consulting/assessment-templates/default")
async def create_default_template_endpoint(
    user_id: int = Depends(get_current_user)
):
    """Create default security maturity assessment template"""
    try:
        result = consulting_service.create_default_assessment_template(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create default template: {str(e)}")


class AssessmentCreate(BaseModel):
    template_id: int
    assessment_name: str
    client_org_id: Optional[int] = None
    engagement_id: Optional[int] = None
    assessor_name: Optional[str] = None


@router.post("/api/consulting/assessments")
async def create_assessment_endpoint(
    data: AssessmentCreate,
    user_id: int = Depends(get_current_user)
):
    """Create a new assessment instance"""
    try:
        result = consulting_service.create_assessment(
            user_id=user_id,
            template_id=data.template_id,
            assessment_name=data.assessment_name,
            client_org_id=data.client_org_id,
            engagement_id=data.engagement_id,
            assessor_name=data.assessor_name
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create assessment: {str(e)}")


class AssessmentResponses(BaseModel):
    responses: Dict[str, Any]


@router.post("/api/consulting/assessments/{assessment_id}/submit")
async def submit_assessment_endpoint(
    assessment_id: int,
    data: AssessmentResponses,
    user_id: int = Depends(get_current_user)
):
    """Submit assessment responses and calculate scores"""
    try:
        result = consulting_service.submit_assessment_responses(
            assessment_id=assessment_id,
            user_id=user_id,
            responses=data.responses
        )
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit assessment: {str(e)}")


# ==================== Gap Analysis ====================

class GapCreate(BaseModel):
    gap_title: str
    gap_category: str  # 'policy', 'process', 'technology', 'people', 'governance'
    gap_description: str
    client_org_id: Optional[int] = None
    engagement_id: Optional[int] = None
    assessment_id: Optional[int] = None
    business_impact: str = 'medium'
    current_state: Optional[str] = None
    target_state: Optional[str] = None
    remediation_approach: Optional[str] = None
    estimated_hours: Optional[float] = None
    estimated_cost: Optional[float] = None


@router.post("/api/consulting/gaps")
async def create_gap_endpoint(
    data: GapCreate,
    user_id: int = Depends(get_current_user)
):
    """Create a gap analysis record"""
    try:
        result = consulting_service.create_gap_analysis(
            user_id=user_id,
            gap_title=data.gap_title,
            gap_category=data.gap_category,
            gap_description=data.gap_description,
            client_org_id=data.client_org_id,
            engagement_id=data.engagement_id,
            assessment_id=data.assessment_id,
            business_impact=data.business_impact,
            current_state=data.current_state,
            target_state=data.target_state,
            remediation_approach=data.remediation_approach,
            estimated_hours=data.estimated_hours,
            estimated_cost=data.estimated_cost
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create gap: {str(e)}")


@router.get("/api/consulting/gaps")
async def list_gaps_endpoint(
    user_id: int = Depends(get_current_user),
    client_org_id: Optional[int] = Query(None),
    engagement_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    """List gap analysis records"""
    try:
        gaps = consulting_service.list_gaps(user_id, client_org_id, engagement_id, status)
        return {"gaps": gaps, "count": len(gaps)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list gaps: {str(e)}")


# ==================== Roadmaps & Budget Planning ====================

class RoadmapCreate(BaseModel):
    roadmap_name: str
    roadmap_type: str  # 'compliance', 'security_maturity', 'msp_growth', 'technology', 'combined'
    start_date: str
    target_completion_date: str
    client_org_id: Optional[int] = None
    engagement_id: Optional[int] = None
    description: Optional[str] = None
    target_frameworks: Optional[List[str]] = None
    target_maturity_level: Optional[int] = None
    strategic_objectives: Optional[List[str]] = None
    total_budget: float = 0.0


@router.post("/api/consulting/roadmaps")
async def create_roadmap_endpoint(
    data: RoadmapCreate,
    user_id: int = Depends(get_current_user)
):
    """Create a compliance/security roadmap"""
    try:
        result = consulting_service.create_roadmap(
            user_id=user_id,
            roadmap_name=data.roadmap_name,
            roadmap_type=data.roadmap_type,
            start_date=data.start_date,
            target_completion_date=data.target_completion_date,
            client_org_id=data.client_org_id,
            engagement_id=data.engagement_id,
            description=data.description,
            target_frameworks=data.target_frameworks,
            target_maturity_level=data.target_maturity_level,
            strategic_objectives=data.strategic_objectives,
            total_budget=data.total_budget
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create roadmap: {str(e)}")


class RoadmapPhaseCreate(BaseModel):
    phase_name: str
    phase_number: int
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_weeks: Optional[int] = None
    phase_objectives: Optional[List[str]] = None
    phase_budget: float = 0.0


@router.post("/api/consulting/roadmaps/{roadmap_id}/phases")
async def add_roadmap_phase_endpoint(
    roadmap_id: int,
    data: RoadmapPhaseCreate,
    user_id: int = Depends(get_current_user)
):
    """Add a phase to a roadmap"""
    try:
        result = consulting_service.add_roadmap_phase(
            roadmap_id=roadmap_id,
            user_id=user_id,
            phase_name=data.phase_name,
            phase_number=data.phase_number,
            description=data.description,
            start_date=data.start_date,
            end_date=data.end_date,
            duration_weeks=data.duration_weeks,
            phase_objectives=data.phase_objectives,
            phase_budget=data.phase_budget
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add phase: {str(e)}")


class InitiativeCreate(BaseModel):
    initiative_name: str
    initiative_type: str  # 'policy', 'process', 'technology', 'training', 'audit', 'vendor'
    description: Optional[str] = None
    estimated_hours: Optional[float] = None
    budget_estimate: Optional[float] = None
    budget_category: Optional[str] = None
    priority: int = 3
    controls_addressed: Optional[List[str]] = None
    gaps_addressed: Optional[List[int]] = None


@router.post("/api/consulting/roadmaps/{roadmap_id}/phases/{phase_id}/initiatives")
async def add_initiative_endpoint(
    roadmap_id: int,
    phase_id: int,
    data: InitiativeCreate,
    user_id: int = Depends(get_current_user)
):
    """Add an initiative to a roadmap phase"""
    try:
        result = consulting_service.add_roadmap_initiative(
            phase_id=phase_id,
            roadmap_id=roadmap_id,
            initiative_name=data.initiative_name,
            initiative_type=data.initiative_type,
            description=data.description,
            estimated_hours=data.estimated_hours,
            budget_estimate=data.budget_estimate,
            budget_category=data.budget_category,
            priority=data.priority,
            controls_addressed=data.controls_addressed,
            gaps_addressed=data.gaps_addressed
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add initiative: {str(e)}")


@router.get("/api/consulting/roadmaps/{roadmap_id}")
async def get_roadmap_endpoint(
    roadmap_id: int,
    user_id: int = Depends(get_current_user)
):
    """Get roadmap with all phases and initiatives"""
    try:
        roadmap = consulting_service.get_roadmap_with_details(roadmap_id, user_id)
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        return roadmap
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get roadmap: {str(e)}")


class BudgetPlanCreate(BaseModel):
    budget_name: str
    budget_year: int
    total_budget: float
    budget_type: str = 'annual'
    client_org_id: Optional[int] = None
    roadmap_id: Optional[int] = None
    category_budgets: Optional[Dict[str, Any]] = None


@router.post("/api/consulting/budgets")
async def create_budget_plan_endpoint(
    data: BudgetPlanCreate,
    user_id: int = Depends(get_current_user)
):
    """Create a budget plan"""
    try:
        result = consulting_service.create_budget_plan(
            user_id=user_id,
            budget_name=data.budget_name,
            budget_year=data.budget_year,
            total_budget=data.total_budget,
            budget_type=data.budget_type,
            client_org_id=data.client_org_id,
            roadmap_id=data.roadmap_id,
            category_budgets=data.category_budgets
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create budget: {str(e)}")


# ==================== Report Generation ====================

class ReportTemplateCreate(BaseModel):
    template_name: str
    template_type: str  # 'executive_summary', 'assessment_report', 'gap_analysis', 'roadmap', 'progress', 'compliance_status', 'msp_portfolio'
    sections: List[Dict[str, Any]]
    description: Optional[str] = None
    branding_config: Optional[Dict[str, Any]] = None
    data_sources: Optional[List[str]] = None


@router.post("/api/consulting/report-templates")
async def create_report_template_endpoint(
    data: ReportTemplateCreate,
    user_id: int = Depends(get_current_user)
):
    """Create a report template"""
    try:
        result = consulting_service.create_report_template(
            user_id=user_id,
            template_name=data.template_name,
            template_type=data.template_type,
            sections=data.sections,
            description=data.description,
            branding_config=data.branding_config,
            data_sources=data.data_sources
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


class ReportGenerate(BaseModel):
    report_name: str
    report_type: str
    client_org_id: Optional[int] = None
    engagement_id: Optional[int] = None
    template_id: Optional[int] = None
    report_data: Optional[Dict[str, Any]] = None
    report_period_start: Optional[str] = None
    report_period_end: Optional[str] = None


@router.post("/api/consulting/reports/generate")
async def generate_report_endpoint(
    data: ReportGenerate,
    user_id: int = Depends(get_current_user)
):
    """Generate a report"""
    try:
        result = consulting_service.generate_report(
            user_id=user_id,
            report_name=data.report_name,
            report_type=data.report_type,
            client_org_id=data.client_org_id,
            engagement_id=data.engagement_id,
            template_id=data.template_id,
            report_data=data.report_data,
            report_period_start=data.report_period_start,
            report_period_end=data.report_period_end
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


# ==================== MSP Portfolio Management ====================

class MSPPortfolioCreate(BaseModel):
    portfolio_name: str
    description: Optional[str] = None


@router.post("/api/consulting/msp/portfolios")
async def create_msp_portfolio_endpoint(
    data: MSPPortfolioCreate,
    user_id: int = Depends(get_current_user)
):
    """Create an MSP portfolio"""
    try:
        result = consulting_service.create_msp_portfolio(user_id, data.portfolio_name, data.description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create portfolio: {str(e)}")


class MSPClientAdd(BaseModel):
    client_org_id: int
    client_name: str
    contract_type: str = 'managed'
    contract_value: float = 0.0
    mrr: float = 0.0
    service_tier: str = 'standard'
    primary_framework: Optional[str] = None


@router.post("/api/consulting/msp/portfolios/{portfolio_id}/clients")
async def add_client_to_portfolio_endpoint(
    portfolio_id: int,
    data: MSPClientAdd,
    user_id: int = Depends(get_current_user)
):
    """Add a client to MSP portfolio"""
    try:
        result = consulting_service.add_client_to_portfolio(
            portfolio_id=portfolio_id,
            client_org_id=data.client_org_id,
            client_name=data.client_name,
            contract_type=data.contract_type,
            contract_value=data.contract_value,
            mrr=data.mrr,
            service_tier=data.service_tier,
            primary_framework=data.primary_framework
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add client: {str(e)}")


@router.get("/api/consulting/msp/dashboard")
async def get_msp_dashboard_endpoint(
    user_id: int = Depends(get_current_user),
    portfolio_id: Optional[int] = Query(None)
):
    """Get MSP portfolio dashboard"""
    try:
        dashboard = consulting_service.get_msp_portfolio_dashboard(user_id, portfolio_id)
        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")


class ClientMetricsUpdate(BaseModel):
    compliance_score: Optional[float] = None
    risk_rating: Optional[str] = None
    open_gaps: Optional[int] = None
    health_score: Optional[int] = None


@router.put("/api/consulting/msp/clients/{client_summary_id}/metrics")
async def update_client_metrics_endpoint(
    client_summary_id: int,
    data: ClientMetricsUpdate,
    user_id: int = Depends(get_current_user)
):
    """Update client metrics in MSP portfolio"""
    try:
        result = consulting_service.update_client_metrics(
            client_summary_id=client_summary_id,
            compliance_score=data.compliance_score,
            risk_rating=data.risk_rating,
            open_gaps=data.open_gaps,
            health_score=data.health_score
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update metrics: {str(e)}")


# ==================== Consulting Dashboard ====================

@router.get("/api/consulting/dashboard")
async def get_consulting_dashboard_endpoint(
    user_id: int = Depends(get_current_user)
):
    """Get consulting dashboard overview"""
    try:
        engagements = consulting_service.list_engagements(user_id)
        gaps = consulting_service.list_gaps(user_id)
        msp_dashboard = consulting_service.get_msp_portfolio_dashboard(user_id)
        
        # Calculate metrics
        active_engagements = [e for e in engagements if e.get('engagement_status') == 'active']
        total_revenue = sum(e.get('engagement_value', 0) or 0 for e in engagements)
        total_hours = sum(e.get('hours_actual', 0) or 0 for e in engagements)
        
        critical_gaps = [g for g in gaps if g.get('business_impact') == 'critical']
        open_gaps = [g for g in gaps if g.get('status') in ['identified', 'planned']]
        
        return {
            "engagements": {
                "total": len(engagements),
                "active": len(active_engagements),
                "total_revenue": total_revenue,
                "total_hours": total_hours
            },
            "gaps": {
                "total": len(gaps),
                "critical": len(critical_gaps),
                "open": len(open_gaps)
            },
            "msp": msp_dashboard,
            "recent_engagements": engagements[:5]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")
