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
    workflow_data: Dict[str, Any] = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Create a new workflow"""
    try:
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
    workflow_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user_id: int = Depends(get_current_user)
):
    """List workflows for the current user"""
    try:
        workflows = list_workflows(user_id, workflow_type, status)
        return workflows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list workflows: {str(e)}")

@router.get("/api/workflows/analytics", response_model=Dict[str, Any])
async def get_workflow_analytics_endpoint(
    days: int = Query(30),
    user_id: int = Depends(get_current_user)
):
    """Get workflow analytics"""
    try:
        analytics = get_workflow_analytics(user_id, days)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow analytics: {str(e)}")

@router.get("/api/workflows/{workflow_id}", response_model=Dict[str, Any])
async def get_workflow_endpoint(
    workflow_id: int,
    user_id: int = Depends(get_current_user)
):
    """Get a specific workflow"""
    try:
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
    workflow_data: Dict[str, Any] = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Update a workflow"""
    try:
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
    user_id: int = Depends(get_current_user)
):
    """Delete a workflow"""
    try:
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
    execution_data: Dict[str, Any] = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Execute a workflow"""
    try:
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
    status: Optional[str] = Query(None),
    limit: int = Query(50),
    user_id: int = Depends(get_current_user)
):
    """Get execution history for a workflow"""
    try:
        executions = get_workflow_executions(
            workflow_id=workflow_id,
            user_id=user_id,
            status=status,
            limit=limit
        )
        return executions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow executions: {str(e)}")


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

