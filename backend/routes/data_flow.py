"""
Data-flow graph (nodes, edges, audit-trail) routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services.data_flow_service import (
    create_data_flow_node, update_data_flow_node, delete_data_flow_node,
    create_data_flow_edge, update_data_flow_edge, delete_data_flow_edge,
    list_data_flow_graph, list_data_flow_audit,
    get_data_flow_node, get_data_flow_edge, record_data_flow_audit,
)

router = APIRouter()

class DataFlowNodeCreate(BaseModel):
    node_type: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sensitivity: Optional[str] = None
    data_domains: Optional[List[str]] = None
    classification_tags: Optional[List[str]] = None
    owner: Optional[str] = None
    responsible_party: Optional[str] = None
    framework_controls: Optional[List[str]] = None
    evidence_links: Optional[List[str]] = None
    integration_status: Optional[str] = "active"
    last_sync_at: Optional[str] = None
    sync_frequency: Optional[str] = None
    system_of_record: Optional[bool] = False
    metadata: Optional[Dict[str, Any]] = None
    layout_position: Optional[Dict[str, Any]] = None


class DataFlowNodeUpdate(BaseModel):
    node_type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    sensitivity: Optional[str] = None
    data_domains: Optional[List[str]] = None
    classification_tags: Optional[List[str]] = None
    owner: Optional[str] = None
    responsible_party: Optional[str] = None
    framework_controls: Optional[List[str]] = None
    evidence_links: Optional[List[str]] = None
    integration_status: Optional[str] = None
    last_sync_at: Optional[str] = None
    sync_frequency: Optional[str] = None
    system_of_record: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None
    layout_position: Optional[Dict[str, Any]] = None


class DataFlowEdgeCreate(BaseModel):
    source_node_id: int
    target_node_id: int
    flow_type: str
    transport: Optional[str] = None
    encryption_status: Optional[str] = None
    retention_policy: Optional[str] = None
    latency: Optional[str] = None
    volume: Optional[str] = None
    status: Optional[str] = "active"
    automated: Optional[bool] = True
    controls_impacted: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    last_validated_at: Optional[str] = None


class DataFlowEdgeUpdate(BaseModel):
    flow_type: Optional[str] = None
    transport: Optional[str] = None
    encryption_status: Optional[str] = None
    retention_policy: Optional[str] = None
    latency: Optional[str] = None
    volume: Optional[str] = None
    status: Optional[str] = None
    automated: Optional[bool] = None
    controls_impacted: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    last_validated_at: Optional[str] = None


@router.get("/api/data-flow/graph")
async def get_data_flow_graph_endpoint(user_id: int = Depends(get_current_user)):
    """Retrieve the full data flow graph (nodes + edges)"""
    allowed, reason = check_permission(user_id, "all", None, "read")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Insufficient permissions")
    try:
        return list_data_flow_graph(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data flow graph: {str(e)}")


@router.get("/api/data-flow/nodes/{node_id}")
async def get_data_flow_node_endpoint(node_id: int, user_id: int = Depends(get_current_user)):
    """Retrieve a single data flow node"""
    allowed, reason = check_permission(user_id, "all", None, "read")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Insufficient permissions")
    try:
        return get_data_flow_node(user_id, node_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data flow node: {str(e)}")


@router.post("/api/data-flow/nodes")
async def create_data_flow_node_endpoint(node: DataFlowNodeCreate, user_id: int = Depends(get_current_user)):
    """Create a new data flow node"""
    allowed, reason = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Insufficient permissions")
    try:
        payload = node.dict(exclude_none=True)
        return create_data_flow_node(user_id, payload, performed_by=user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create data flow node: {str(e)}")


@router.put("/api/data-flow/nodes/{node_id}")
async def update_data_flow_node_endpoint(node_id: int, node: DataFlowNodeUpdate, user_id: int = Depends(get_current_user)):
    """Update an existing data flow node"""
    allowed, reason = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Insufficient permissions")
    try:
        payload = node.dict(exclude_none=True)
        return update_data_flow_node(user_id, node_id, payload, performed_by=user_id)
    except ValueError as e:
        detail = str(e)
        status = 404 if "not found" in detail.lower() else 400
        raise HTTPException(status_code=status, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update data flow node: {str(e)}")


@router.delete("/api/data-flow/nodes/{node_id}")
async def delete_data_flow_node_endpoint(node_id: int, reason: Optional[str] = Query(None), user_id: int = Depends(get_current_user)):
    """Delete a data flow node (and cascading edges)"""
    allowed, reason_perm = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason_perm or "Insufficient permissions")
    try:
        delete_data_flow_node(user_id, node_id, performed_by=user_id, reason=reason)
        return {"message": "Node deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete data flow node: {str(e)}")


@router.get("/api/data-flow/edges/{edge_id}")
async def get_data_flow_edge_endpoint(edge_id: int, user_id: int = Depends(get_current_user)):
    """Retrieve a single data flow edge"""
    allowed, reason = check_permission(user_id, "all", None, "read")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Insufficient permissions")
    try:
        return get_data_flow_edge(user_id, edge_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data flow edge: {str(e)}")


@router.post("/api/data-flow/edges")
async def create_data_flow_edge_endpoint(edge: DataFlowEdgeCreate, user_id: int = Depends(get_current_user)):
    """Create a data flow edge connecting two nodes"""
    allowed, reason = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Insufficient permissions")
    try:
        payload = edge.dict(exclude_none=True)
        return create_data_flow_edge(user_id, payload, performed_by=user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create data flow edge: {str(e)}")


@router.put("/api/data-flow/edges/{edge_id}")
async def update_data_flow_edge_endpoint(edge_id: int, edge: DataFlowEdgeUpdate, user_id: int = Depends(get_current_user)):
    """Update metadata for a data flow edge"""
    allowed, reason = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Insufficient permissions")
    try:
        payload = edge.dict(exclude_none=True)
        return update_data_flow_edge(user_id, edge_id, payload, performed_by=user_id)
    except ValueError as e:
        detail = str(e)
        status = 404 if "not found" in detail.lower() else 400
        raise HTTPException(status_code=status, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update data flow edge: {str(e)}")


@router.delete("/api/data-flow/edges/{edge_id}")
async def delete_data_flow_edge_endpoint(edge_id: int, reason: Optional[str] = Query(None), user_id: int = Depends(get_current_user)):
    """Delete a data flow edge"""
    allowed, reason_perm = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason_perm or "Insufficient permissions")
    try:
        delete_data_flow_edge(user_id, edge_id, performed_by=user_id, reason=reason)
        return {"message": "Edge deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete data flow edge: {str(e)}")


@router.get("/api/data-flow/audit")
async def get_data_flow_audit_endpoint(limit: int = 100, user_id: int = Depends(get_current_user)):
    """Retrieve recent data flow architecture changes"""
    allowed, reason = check_permission(user_id, "all", None, "read")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Insufficient permissions")
    try:
        return list_data_flow_audit(user_id, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data flow audit log: {str(e)}")

# ============================================================================
# CSCA (Continuous Security-Compliance Alignment) Endpoints
# ============================================================================
