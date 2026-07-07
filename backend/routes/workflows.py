"""
Automation workflow CRUD, execution, and analytics routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request, Body
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services.workflow_service import (
    create_workflow, get_workflow, list_workflows, update_workflow, delete_workflow,
    execute_workflow, get_workflow_executions, get_workflow_analytics, get_workflow_templates,
)

router = APIRouter()

@router.get("/api/workflows/templates")
async def get_workflow_templates_endpoint():
    """Get available workflow templates"""
    try:
        templates = get_workflow_templates()
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow templates: {str(e)}")

@router.post("/api/workflows", response_model=Dict[str, Any])
async def create_workflow_endpoint(
    request: Request,
    workflow_data: Dict[str, Any] = Body(...)
):
    """Create a new workflow"""
    try:
        user_id = get_user_id_from_request(request)
        workflow = create_workflow(
            user_id=user_id,
            name=workflow_data.get('name'),
            workflow_type=workflow_data.get('workflow_type'),
            description=workflow_data.get('description'),
            trigger_config=workflow_data.get('trigger_config'),
            steps=workflow_data.get('steps'),
            conditions=workflow_data.get('conditions'),
            escalation_rules=workflow_data.get('escalation_rules'),
            metadata=workflow_data.get('metadata')
        )
        return workflow
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")

@router.get("/api/workflows", response_model=List[Dict[str, Any]])
async def list_workflows_endpoint(
    request: Request,
    workflow_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """List workflows for the current user"""
    try:
        user_id = get_user_id_from_request(request)
        workflows = list_workflows(user_id, workflow_type, status)
        return workflows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list workflows: {str(e)}")

@router.get("/api/workflows/{workflow_id}", response_model=Dict[str, Any])
async def get_workflow_endpoint(
    workflow_id: int,
    request: Request
):
    """Get a specific workflow"""
    try:
        user_id = get_user_id_from_request(request)
        workflow = get_workflow(workflow_id, user_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return workflow
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow: {str(e)}")

@router.put("/api/workflows/{workflow_id}", response_model=Dict[str, Any])
async def update_workflow_endpoint(
    workflow_id: int,
    request: Request,
    workflow_data: Dict[str, Any] = Body(...)
):
    """Update a workflow"""
    try:
        user_id = get_user_id_from_request(request)
        workflow = update_workflow(
            workflow_id=workflow_id,
            user_id=user_id,
            name=workflow_data.get('name'),
            description=workflow_data.get('description'),
            status=workflow_data.get('status'),
            trigger_config=workflow_data.get('trigger_config'),
            steps=workflow_data.get('steps'),
            conditions=workflow_data.get('conditions'),
            escalation_rules=workflow_data.get('escalation_rules'),
            metadata=workflow_data.get('metadata')
        )
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return workflow
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update workflow: {str(e)}")

@router.delete("/api/workflows/{workflow_id}")
async def delete_workflow_endpoint(
    workflow_id: int,
    request: Request
):
    """Delete a workflow"""
    try:
        user_id = get_user_id_from_request(request)
        deleted = delete_workflow(workflow_id, user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return {"success": True, "message": "Workflow deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete workflow: {str(e)}")

@router.post("/api/workflows/{workflow_id}/execute", response_model=Dict[str, Any])
async def execute_workflow_endpoint(
    workflow_id: int,
    request: Request,
    execution_data: Dict[str, Any] = Body(...)
):
    """Execute a workflow"""
    try:
        user_id = get_user_id_from_request(request)
        result = execute_workflow(
            workflow_id=workflow_id,
            user_id=user_id,
            trigger_event=execution_data.get('trigger_event'),
            trigger_data=execution_data.get('trigger_data')
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute workflow: {str(e)}")

@router.get("/api/workflows/{workflow_id}/executions", response_model=List[Dict[str, Any]])
async def get_workflow_executions_endpoint(
    workflow_id: int,
    request: Request,
    status: Optional[str] = Query(None),
    limit: int = Query(50)
):
    """Get execution history for a workflow"""
    try:
        user_id = get_user_id_from_request(request)
        executions = get_workflow_executions(
            workflow_id=workflow_id,
            user_id=user_id,
            status=status,
            limit=limit
        )
        return executions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow executions: {str(e)}")

@router.get("/api/workflows/analytics", response_model=Dict[str, Any])
async def get_workflow_analytics_endpoint(
    request: Request,
    days: int = Query(30)
):
    """Get workflow analytics"""
    try:
        user_id = get_user_id_from_request(request)
        analytics = get_workflow_analytics(user_id, days)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow analytics: {str(e)}")


# ============================================================================
# CLIENT INTAKE TIERS - Tiered Data Ingestion System
# ============================================================================

# ==================== Client Organization Management ====================

class ClientOrganizationCreate(BaseModel):
    organization_name: str
    organization_type: str = 'SMB'
    industry_vertical: Optional[str] = None
    compliance_frameworks: Optional[List[str]] = None
    intake_tier: int = 1
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None

