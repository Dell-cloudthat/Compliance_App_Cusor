"""
Client intake portal — Tier 1-4 ingestion, questionnaires, and dashboard routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services import client_intake_service

router = APIRouter()

class ClientOrganizationCreate(BaseModel):
    organization_name: str
    organization_type: str = 'SMB'
    industry_vertical: Optional[str] = None
    compliance_frameworks: Optional[List[str]] = None
    intake_tier: int = 1
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None


@router.post("/api/intake/organizations")
async def create_client_organization_endpoint(
    data: ClientOrganizationCreate,
    user_id: int = Depends(get_current_user)
):
    """Create a new client organization for intake management"""
    try:
        result = client_intake_service.create_client_organization(
            user_id=user_id,
            organization_name=data.organization_name,
            organization_type=data.organization_type,
            industry_vertical=data.industry_vertical,
            compliance_frameworks=data.compliance_frameworks,
            intake_tier=data.intake_tier,
            contact_name=data.contact_name,
            contact_email=data.contact_email
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create organization: {str(e)}")


@router.get("/api/intake/organizations")
async def list_client_organizations_endpoint(
    user_id: int = Depends(get_current_user),
    intake_tier: Optional[int] = Query(None)
):
    """List all client organizations"""
    try:
        orgs = client_intake_service.list_client_organizations(user_id, intake_tier)
        return {"organizations": orgs, "count": len(orgs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list organizations: {str(e)}")


@router.get("/api/intake/organizations/{org_id}")
async def get_client_organization_endpoint(
    org_id: int,
    user_id: int = Depends(get_current_user)
):
    """Get a specific client organization"""
    try:
        org = client_intake_service.get_client_organization(org_id, user_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        return org
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get organization: {str(e)}")


@router.put("/api/intake/organizations/{org_id}/tier")
async def update_intake_tier_endpoint(
    org_id: int,
    new_tier: int = Query(...),
    user_id: int = Depends(get_current_user)
):
    """Update client's intake tier (upgrade/downgrade)"""
    try:
        result = client_intake_service.update_client_intake_tier(org_id, user_id, new_tier)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update tier: {str(e)}")


@router.get("/api/intake/tier-recommendation")
async def get_tier_recommendation_endpoint(
    organization_type: str = Query(...),
    compliance_frameworks: str = Query(""),
    current_maturity: str = Query("basic")
):
    """Get recommended intake tier based on organization profile"""
    try:
        frameworks = compliance_frameworks.split(",") if compliance_frameworks else []
        recommendation = client_intake_service.get_intake_tier_recommendation(
            organization_type, frameworks, current_maturity
        )
        return recommendation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendation: {str(e)}")


# ==================== TIER 1: Manual/Document-Based Intake ====================

class DocumentUpload(BaseModel):
    document_type: str  # 'CSV', 'XLSX', 'PDF', 'ARCHITECTURE_DIAGRAM', 'POLICY_DOC', 'SCREENSHOT', 'QUESTIONNAIRE'
    document_name: str
    original_filename: str
    file_content_base64: str
    mime_type: str
    client_org_id: Optional[int] = None
    metadata_tags: Optional[List[str]] = None
    notes: Optional[str] = None


@router.post("/api/intake/tier1/documents")
async def upload_document_endpoint(
    data: DocumentUpload,
    user_id: int = Depends(get_current_user)
):
    """Upload a document for Tier 1 manual intake"""
    try:
        import base64
        file_content = base64.b64decode(data.file_content_base64)
        
        result = client_intake_service.upload_document(
            user_id=user_id,
            document_type=data.document_type,
            document_name=data.document_name,
            original_filename=data.original_filename,
            file_content=file_content,
            mime_type=data.mime_type,
            client_org_id=data.client_org_id,
            metadata_tags=data.metadata_tags,
            notes=data.notes
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.get("/api/intake/tier1/documents")
async def list_documents_endpoint(
    user_id: int = Depends(get_current_user),
    client_org_id: Optional[int] = Query(None),
    document_type: Optional[str] = Query(None),
    parsing_status: Optional[str] = Query(None),
    limit: int = Query(50)
):
    """List uploaded documents"""
    try:
        docs = client_intake_service.get_intake_documents(
            user_id, client_org_id, document_type, parsing_status, limit
        )
        return {"documents": docs, "count": len(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


class DocumentControlMapping(BaseModel):
    control_mappings: List[Dict[str, Any]]


@router.post("/api/intake/tier1/documents/{doc_id}/map-controls")
async def map_document_to_controls_endpoint(
    doc_id: int,
    data: DocumentControlMapping,
    user_id: int = Depends(get_current_user)
):
    """Map document data to compliance controls"""
    try:
        result = client_intake_service.map_document_to_controls(
            doc_id, user_id, data.control_mappings
        )
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to map controls: {str(e)}")


# Questionnaire Management

class QuestionnaireCreate(BaseModel):
    questionnaire_name: str
    questionnaire_type: str  # 'security_assessment', 'compliance_gap', 'vendor_risk', 'readiness_check'
    target_frameworks: List[str]
    questions: List[Dict[str, Any]]
    scoring_model: Optional[Dict[str, Any]] = None


@router.post("/api/intake/tier1/questionnaires")
async def create_questionnaire_endpoint(
    data: QuestionnaireCreate,
    user_id: int = Depends(get_current_user)
):
    """Create a questionnaire template"""
    try:
        result = client_intake_service.create_questionnaire_template(
            user_id=user_id,
            questionnaire_name=data.questionnaire_name,
            questionnaire_type=data.questionnaire_type,
            target_frameworks=data.target_frameworks,
            questions=data.questions,
            scoring_model=data.scoring_model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create questionnaire: {str(e)}")


class QuestionnaireResponse(BaseModel):
    responses: Dict[str, Any]
    client_org_id: Optional[int] = None
    respondent_name: Optional[str] = None
    respondent_email: Optional[str] = None


@router.post("/api/intake/tier1/questionnaires/{questionnaire_id}/responses")
async def submit_questionnaire_response_endpoint(
    questionnaire_id: int,
    data: QuestionnaireResponse,
    user_id: int = Depends(get_current_user)
):
    """Submit responses to a questionnaire"""
    try:
        result = client_intake_service.submit_questionnaire_response(
            questionnaire_id=questionnaire_id,
            user_id=user_id,
            responses=data.responses,
            client_org_id=data.client_org_id,
            respondent_name=data.respondent_name,
            respondent_email=data.respondent_email
        )
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit response: {str(e)}")


# ==================== TIER 2: Read-Only API Integrations ====================

@router.get("/api/intake/tier2/integrations/supported")
async def get_supported_integrations_endpoint():
    """Get list of supported API integrations"""
    try:
        integrations = client_intake_service.get_supported_integrations()
        return {"integrations": integrations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get integrations: {str(e)}")


class APIIntegrationConfig(BaseModel):
    integration_type: str  # 'microsoft_365', 'azure', 'aws', 'crowdstrike', 'splunk', 'qualys'
    integration_name: str
    auth_type: str  # 'oauth2', 'api_key', 'bearer_token', 'client_credentials'
    credentials: Dict[str, Any]
    client_org_id: Optional[int] = None
    sync_frequency: str = 'daily'
    data_categories: Optional[List[str]] = None
    resource_filters: Optional[Dict[str, Any]] = None


@router.post("/api/intake/tier2/integrations")
async def configure_api_integration_endpoint(
    data: APIIntegrationConfig,
    user_id: int = Depends(get_current_user)
):
    """Configure a new read-only API integration"""
    try:
        result = client_intake_service.configure_api_integration(
            user_id=user_id,
            integration_type=data.integration_type,
            integration_name=data.integration_name,
            auth_type=data.auth_type,
            credentials=data.credentials,
            client_org_id=data.client_org_id,
            sync_frequency=data.sync_frequency,
            data_categories=data.data_categories,
            resource_filters=data.resource_filters
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure integration: {str(e)}")


@router.get("/api/intake/tier2/integrations")
async def list_api_integrations_endpoint(
    user_id: int = Depends(get_current_user),
    client_org_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    """List configured API integrations"""
    try:
        integrations = client_intake_service.get_api_integrations(user_id, client_org_id, status)
        return {"integrations": integrations, "count": len(integrations)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list integrations: {str(e)}")


@router.post("/api/intake/tier2/integrations/{integration_id}/sync")
async def trigger_api_sync_endpoint(
    integration_id: int,
    user_id: int = Depends(get_current_user)
):
    """Trigger a sync for an API integration"""
    try:
        result = client_intake_service.trigger_api_sync(integration_id, user_id)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger sync: {str(e)}")


# ==================== TIER 3: Scheduled Exports ====================

class ScheduledExportConfig(BaseModel):
    export_name: str
    export_type: str  # 'siem_csv', 'grc_export', 'msp_bulk', 'compliance_report', 'custom'
    source_system: str
    schedule_frequency: str  # 'daily', 'weekly', 'monthly', 'quarterly'
    delivery_method: str  # 'sftp', 'email', 'webhook', 'manual_upload', 's3'
    expected_format: str  # 'CSV', 'XLSX', 'JSON', 'XML'
    delivery_config: Optional[Dict[str, Any]] = None
    expected_columns: Optional[List[str]] = None
    client_org_id: Optional[int] = None
    schedule_day_of_week: Optional[int] = None
    schedule_day_of_month: Optional[int] = None
    schedule_time: str = '00:00'


@router.post("/api/intake/tier3/exports")
async def configure_scheduled_export_endpoint(
    data: ScheduledExportConfig,
    user_id: int = Depends(get_current_user)
):
    """Configure a scheduled export ingestion"""
    try:
        result = client_intake_service.configure_scheduled_export(
            user_id=user_id,
            export_name=data.export_name,
            export_type=data.export_type,
            source_system=data.source_system,
            schedule_frequency=data.schedule_frequency,
            delivery_method=data.delivery_method,
            expected_format=data.expected_format,
            delivery_config=data.delivery_config,
            expected_columns=data.expected_columns,
            client_org_id=data.client_org_id,
            schedule_day_of_week=data.schedule_day_of_week,
            schedule_day_of_month=data.schedule_day_of_month,
            schedule_time=data.schedule_time
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure export: {str(e)}")


@router.get("/api/intake/tier3/exports")
async def list_scheduled_exports_endpoint(
    user_id: int = Depends(get_current_user),
    client_org_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    """List scheduled export configurations"""
    try:
        exports = client_intake_service.get_scheduled_exports(user_id, client_org_id, status)
        return {"exports": exports, "count": len(exports)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list exports: {str(e)}")


class ScheduledExportProcess(BaseModel):
    filename: str
    file_content_base64: str
    received_via: str = 'manual'


@router.post("/api/intake/tier3/exports/{config_id}/process")
async def process_scheduled_export_endpoint(
    config_id: int,
    data: ScheduledExportProcess,
    user_id: int = Depends(get_current_user)
):
    """Process a received scheduled export file"""
    try:
        import base64
        file_content = base64.b64decode(data.file_content_base64)
        
        result = client_intake_service.process_scheduled_export(
            config_id=config_id,
            user_id=user_id,
            filename=data.filename,
            file_content=file_content,
            received_via=data.received_via
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process export: {str(e)}")


# ==================== TIER 4: Continuous Ingestion ====================

class ContinuousIngestionConfig(BaseModel):
    ingestion_name: str
    ingestion_type: str  # 'streaming_telemetry', 'realtime_scoring', 'continuous_validation', 'event_stream'
    stream_protocol: str  # 'webhook', 'websocket', 'kafka', 'sqs', 'pubsub'
    auth_method: str  # 'hmac', 'jwt', 'api_key', 'mtls'
    client_org_id: Optional[int] = None
    stream_config: Optional[Dict[str, Any]] = None
    auth_config: Optional[Dict[str, Any]] = None
    event_schema: Optional[Dict[str, Any]] = None
    scoring_enabled: bool = False
    alert_thresholds: Optional[Dict[str, Any]] = None


@router.post("/api/intake/tier4/continuous")
async def configure_continuous_ingestion_endpoint(
    data: ContinuousIngestionConfig,
    user_id: int = Depends(get_current_user)
):
    """Configure continuous data ingestion (Tier 4 - SaaS territory)"""
    try:
        result = client_intake_service.configure_continuous_ingestion(
            user_id=user_id,
            ingestion_name=data.ingestion_name,
            ingestion_type=data.ingestion_type,
            stream_protocol=data.stream_protocol,
            auth_method=data.auth_method,
            client_org_id=data.client_org_id,
            stream_config=data.stream_config,
            auth_config=data.auth_config,
            event_schema=data.event_schema,
            scoring_enabled=data.scoring_enabled,
            alert_thresholds=data.alert_thresholds
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure ingestion: {str(e)}")


@router.get("/api/intake/tier4/continuous")
async def list_continuous_ingestion_endpoint(
    user_id: int = Depends(get_current_user),
    client_org_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    """List continuous ingestion configurations"""
    try:
        configs = client_intake_service.get_continuous_ingestion_configs(user_id, client_org_id, status)
        return {"configs": configs, "count": len(configs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list configs: {str(e)}")


class ContinuousEvent(BaseModel):
    event_id: str
    event_type: str
    event_data: Dict[str, Any]
    event_timestamp: Optional[str] = None


@router.post("/api/intake/tier4/continuous/{config_id}/events")
async def ingest_continuous_event_endpoint(
    config_id: int,
    data: ContinuousEvent
):
    """Ingest a single event from continuous stream (webhook endpoint)"""
    try:
        result = client_intake_service.ingest_continuous_event(
            config_id=config_id,
            event_id=data.event_id,
            event_type=data.event_type,
            event_data=data.event_data,
            event_timestamp=data.event_timestamp
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest event: {str(e)}")


# ==================== Intake Dashboard & Analytics ====================

@router.get("/api/intake/dashboard")
async def get_intake_dashboard_endpoint(
    user_id: int = Depends(get_current_user),
    client_org_id: Optional[int] = Query(None)
):
    """Get intake dashboard metrics across all tiers"""
    try:
        dashboard = client_intake_service.get_intake_dashboard(user_id, client_org_id)
        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")


@router.get("/api/intake/tiers-info")
async def get_tiers_info_endpoint():
    """Get information about all intake tiers"""
    return {
        "tiers": [
            {
                "tier": 1,
                "name": "Manual / Document-Based Intake",
                "subtitle": "FOUNDATION",
                "description": "Works for 100% of clients with zero integration dependency",
                "inputs": ["CSV", "XLSX", "PDF", "Architecture diagrams", "Policy docs", "Screenshots", "Questionnaire responses"],
                "benefits": [
                    "Works for 100% of clients",
                    "Zero integration dependency",
                    "Fast sales cycle",
                    "Lowest legal risk",
                    "Can charge immediately"
                ],
                "ideal_for": ["SMBs", "MSPs", "Regulated firms"],
                "color": "green"
            },
            {
                "tier": 2,
                "name": "Read-Only API Integrations",
                "subtitle": "ACCELERATION",
                "description": "Efficiency through scoped, read-only API connections",
                "inputs": ["Microsoft 365 (Graph API)", "Azure/AWS security APIs", "SIEM exports", "EDR endpoints", "Vulnerability scanners"],
                "benefits": [
                    "Automated data collection",
                    "Read-only (no management risk)",
                    "Scoped permissions",
                    "Time-bound tokens",
                    "Customer-owned credentials"
                ],
                "rules": ["Read-only", "Scoped permissions", "Time-bound tokens", "Customer-owned credentials"],
                "data_types": ["Counts, states, coverage", "Config posture", "Alert summaries (not raw logs)", "Control evidence"],
                "ideal_for": ["Enterprise clients", "Tech-forward organizations"],
                "color": "blue"
            },
            {
                "tier": 3,
                "name": "Scheduled Exports",
                "subtitle": "BRIDGE MODEL",
                "description": "Near-automation without live integration overhead",
                "inputs": ["Weekly CSV export from SIEM", "Monthly compliance export from GRC tool", "MSP bulk export across tenants"],
                "benefits": [
                    "Near-automation",
                    "No live integrations to maintain",
                    "Works in regulated environments",
                    "Easy to explain legally",
                    "Perfect for MSPs"
                ],
                "ideal_for": ["MSPs", "Regulated industries", "Organizations with strict data controls"],
                "color": "purple"
            },
            {
                "tier": 4,
                "name": "Continuous Ingestion",
                "subtitle": "PRODUCTIZED SAAS",
                "description": "Real-time streaming for productized offerings",
                "inputs": ["Streaming telemetry", "Real-time scoring", "Continuous control validation"],
                "benefits": [
                    "Real-time compliance scoring",
                    "Continuous monitoring",
                    "Immediate alert generation"
                ],
                "warnings": [
                    "Dramatically increases security burden",
                    "Higher legal exposure",
                    "Increased support cost",
                    "Uptime expectations"
                ],
                "ideal_for": ["Mature SaaS offerings", "Enterprise clients with dedicated support"],
                "color": "red"
            }
        ]
    }


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
