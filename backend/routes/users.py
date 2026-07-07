"""
User, data-source, data-segment, cost-prediction and metadata routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: str
    organization: str
    plan: str = "free"
    role: str = "viewer"

class DataSourceCreate(BaseModel):
    source_type: str
    source_name: str
    vendor: Optional[str] = None
    connection_info: Dict[str, Any]
    sync_frequency: str = "hourly"
    metadata_tags: List[str] = []
    responsible_party: Optional[str] = None

class DataSegmentCreate(BaseModel):
    data_source_id: int
    control_id: str
    segment_name: str
    data_payload: Dict[str, Any]
    metadata_tags: List[str] = []
    data_classification: str = "INTERNAL"
    responsible_party: Optional[str] = None

class ControlCreate(BaseModel):
    control_id: str
    control_name: str
    description: Optional[str] = None
    frameworks: List[str] = []
    category: str
    priority: str
    mapped_fields: List[str] = []

class CostPredictionRequest(BaseModel):
    num_users: int = 50
    avg_storage_gb_per_user: float = 0.2  # 200MB per user
    api_requests_per_month: int = 50000
    retention_days: int = 90

# IAM Models
class PermissionGrant(BaseModel):
    user_id: int
    vendor_id: Optional[int] = None
    resource_type: str  # 'control', 'audit', 'report', 'evidence', 'all'
    resource_id: Optional[str] = None
    permission_type: str  # 'read', 'write', 'execute', 'delete'
    expires_at: Optional[str] = None
    approval_required: bool = False
    metadata: Optional[Dict[str, Any]] = None

class PermissionRevoke(BaseModel):
    permission_id: int
    reason: str

class PermissionCheck(BaseModel):
    user_id: int
    resource_type: str
    resource_id: Optional[str] = None
    permission_type: str

class VendorAccessProfileCreate(BaseModel):
    vendor_id: Optional[int] = None
    vendor_name: str
    profile_name: str
    entity_id: Optional[int] = None
    scope: Dict[str, Any]  # {"controls": [...], "frameworks": [...], "audits": [...]}
    permissions: Dict[str, List[str]]  # {"controls": ["read"], "audits": ["read", "write"]}
    access_expires_at: Optional[str] = None
    auto_renew: bool = False

class VendorUserAssign(BaseModel):
    vendor_access_profile_id: int
    vendor_user_id: int
    expires_at: Optional[str] = None


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

class ApprovalWorkflowRequest(BaseModel):
    resource_type: str
    resource_id: Optional[str] = None
    permission_type: str
    reason: str

class ApprovalWorkflowResponse(BaseModel):
    workflow_id: int
    approver_id: Optional[int] = None
    status: str
    reason: Optional[str] = None

# CSCA Models
class SecurityEventCreate(BaseModel):
    event_type: str  # 'threat_detected', 'vulnerability_found', 'incident', 'policy_violation', 'configuration_change'
    event_source: str  # 'SIEM', 'EDR', 'CSPM', 'Vulnerability Scanner'
    source_tool: Optional[str] = None
    severity: str  # 'critical', 'high', 'medium', 'low', 'info'
    title: str
    description: Optional[str] = None
    affected_resources: Optional[List[str]] = None
    security_event_data: Optional[Dict[str, Any]] = None
    detected_at: Optional[str] = None  # ISO format timestamp
    frameworks: Optional[List[str]] = None  # Which frameworks to map to

# Metadata Tagging Functions
def detect_pii_in_data(data: Dict[str, Any]) -> tuple[bool, List[str]]:
    """Detect PII in data payload and return (has_pii, pii_types)"""
    pii_indicators = {
        'email': ['email', 'e-mail', 'mail', 'user_email'],
        'ssn': ['ssn', 'social_security', 'social_security_number'],
        'phone': ['phone', 'telephone', 'mobile', 'cell'],
        'address': ['address', 'street', 'city', 'zip', 'postal'],
        'name': ['first_name', 'last_name', 'full_name', 'name'],
        'dob': ['date_of_birth', 'dob', 'birth_date'],
        'credit_card': ['credit_card', 'card_number', 'cc_number']
    }
    
    has_pii = False
    pii_types = []
    data_str = json.dumps(data).lower()
    
    for pii_type, keywords in pii_indicators.items():
        if any(keyword in data_str for keyword in keywords):
            has_pii = True
            pii_types.append(pii_type.upper())
    
    return has_pii, pii_types

def detect_cui_indicators(data: Dict[str, Any], metadata_tags: List[str]) -> bool:
    """Detect CUI indicators - CUI data should be filtered out for non-FedRAMP environments"""
    cui_keywords = [
        'classified', 'secret', 'top_secret', 'federal', 'government',
        'defense', 'military', 'clearance', 'cui', 'controlled_unclassified'
    ]
    
    # Check metadata tags
    if any('CUI' in tag.upper() or 'RESTRICTED' in tag.upper() for tag in metadata_tags):
        return True
    
    # Check data payload
    data_str = json.dumps(data).lower()
    if any(keyword in data_str for keyword in cui_keywords):
        return True
    
    return False

def classify_data_segment(data: Dict[str, Any], metadata_tags: List[str]) -> str:
    """Classify data segment based on content and metadata"""
    has_pii, _ = detect_pii_in_data(data)
    has_cui = detect_cui_indicators(data, metadata_tags)
    
    if has_cui:
        return "RESTRICTED"  # Should not be ingested
    elif has_pii:
        return "CONFIDENTIAL"
    elif 'ENCRYPTED' in metadata_tags:
        return "INTERNAL"
    else:
        return "PUBLIC"

# API Endpoints

@router.get("/")
async def root():
    return {
        "message": "Compliance Platform API",
        "version": "1.0.0",
        "status": "operational"
    }

@router.post("/api/users", response_model=Dict[str, Any])
async def create_user(user: UserCreate):
    """Create a new user"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, organization, plan, role)
            VALUES (?, ?, '', ?, ?, ?)
        """, (user.name, user.email, user.organization, user.plan, user.role))

        user_id = cursor.lastrowid
        conn.commit()

        return {
            "id": user_id,
            "name": user.name,
            "email": user.email,
            "organization": user.organization,
            "plan": user.plan,
            "role": user.role
        }
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    finally:
        conn.close()

@router.get("/api/users/{user_id}")
async def get_user(user_id: int):
    """Get user by ID"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return dict(user)

@router.get("/api/data-sources")
async def get_data_sources(user_id: int):
    """Get all data sources for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM data_sources WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    sources = cursor.fetchall()
    conn.close()
    
    return [dict(s) for s in sources]

@router.post("/api/data-sources", response_model=Dict[str, Any])
async def create_data_source(user_id: int, source: DataSourceCreate):
    """Create a new data source with PII/CUI detection"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check for CUI indicators in metadata
    contains_cui = detect_cui_indicators(source.connection_info, source.metadata_tags)
    if contains_cui:
        raise HTTPException(
            status_code=403,
            detail="CUI data sources are not supported in non-FedRAMP environments"
        )
    
    # Detect PII in connection info
    contains_pii, pii_types = detect_pii_in_data(source.connection_info)
    
    try:
        cursor.execute("""
            INSERT INTO data_sources 
            (user_id, source_type, source_name, vendor, connection_info, sync_frequency, 
             metadata_tags, contains_pii, contains_cui, responsible_party)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, source.source_type, source.source_name, source.vendor,
            json.dumps(source.connection_info), source.sync_frequency,
            json.dumps(source.metadata_tags), contains_pii, contains_cui,
            source.responsible_party
        ))
        
        source_id = cursor.lastrowid
        conn.commit()
        
        return {
            "id": source_id,
            "user_id": user_id,
            "source_name": source.source_name,
            "contains_pii": contains_pii,
            "contains_cui": contains_cui,
            "pii_types": pii_types if contains_pii else []
        }
    finally:
        conn.close()

@router.post("/api/data-segments", response_model=Dict[str, Any])
async def create_data_segment(user_id: int, segment: DataSegmentCreate):
    """Create a data segment with automatic PII/CUI detection and classification"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Detect PII and CUI
    contains_pii, pii_types = detect_pii_in_data(segment.data_payload)
    contains_cui = detect_cui_indicators(segment.data_payload, segment.metadata_tags)
    
    # Block CUI data ingestion
    if contains_cui:
        raise HTTPException(
            status_code=403,
            detail="CUI data cannot be ingested in non-FedRAMP environments. Please filter CUI data before submission."
        )
    
    # Auto-classify data
    classification = classify_data_segment(segment.data_payload, segment.metadata_tags)
    
    # Add automatic metadata tags
    auto_tags = list(segment.metadata_tags)
    if contains_pii:
        auto_tags.append('PII')
        auto_tags.extend([f'PII_{pt}' for pt in pii_types])
    auto_tags.append(classification)
    
    try:
        cursor.execute("""
            INSERT INTO data_segments
            (user_id, data_source_id, control_id, segment_name, data_payload,
             metadata_tags, contains_pii, contains_cui, pii_types, data_classification,
             responsible_party, coverage_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, segment.data_source_id, segment.control_id, segment.segment_name,
            json.dumps(segment.data_payload), json.dumps(auto_tags),
            contains_pii, contains_cui, json.dumps(pii_types), classification,
            segment.responsible_party, 'API Data Attribution'
        ))
        
        segment_id = cursor.lastrowid
        conn.commit()
        
        return {
            "id": segment_id,
            "control_id": segment.control_id,
            "contains_pii": contains_pii,
            "contains_cui": contains_cui,
            "pii_types": pii_types,
            "data_classification": classification,
            "metadata_tags": auto_tags
        }
    finally:
        conn.close()

@router.get("/api/data-segments/by-control/{control_id}")
async def get_segments_by_control(user_id: int, control_id: str):
    """Get all data segments for a specific control"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT ds.*, dso.source_name, dso.vendor
        FROM data_segments ds
        JOIN data_sources dso ON ds.data_source_id = dso.id
        WHERE ds.user_id = ? AND ds.control_id = ?
        ORDER BY ds.last_updated DESC
    """, (user_id, control_id))
    
    segments = cursor.fetchall()
    conn.close()
    
    return [dict(s) for s in segments]

@router.get("/api/responsibility-matrix/{user_id}")
async def get_responsibility_matrix(user_id: int):
    """Get responsibility matrix for user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT rm.*, c.control_name, c.category, c.priority, c.status
        FROM responsibility_matrix rm
        JOIN controls c ON rm.control_id = c.id
        WHERE rm.user_id = ?
        ORDER BY c.priority DESC, c.control_name
    """, (user_id,))
    
    matrix = cursor.fetchall()
    conn.close()
    
    return [dict(m) for m in matrix]

@router.post("/api/cost-prediction")
async def predict_costs(prediction: CostPredictionRequest):
    """Predict monthly costs based on usage metrics"""
    
    # Pricing (based on typical cloud costs)
    AUTH_COST_PER_USER = 0.0055  # $0.0055 per user/month
    STORAGE_COST_PER_GB = 0.023  # S3 Standard: $0.023/GB/month
    API_REQUEST_COST = 0.0001  # $0.0001 per API request (example)
    COMPUTE_BASE = 10.0  # Base compute cost
    COMPUTE_PER_1000_REQUESTS = 0.01  # Additional compute per 1000 requests
    
    # Calculate costs
    auth_cost = prediction.num_users * AUTH_COST_PER_USER
    storage_gb = prediction.num_users * prediction.avg_storage_gb_per_user
    storage_cost = storage_gb * STORAGE_COST_PER_GB
    
    api_cost = prediction.api_requests_per_month * API_REQUEST_COST
    compute_cost = COMPUTE_BASE + (prediction.api_requests_per_month / 1000) * COMPUTE_PER_1000_REQUESTS
    
    total_monthly = auth_cost + storage_cost + api_cost + compute_cost
    
    # Annual projection
    annual_cost = total_monthly * 12
    
    # Per-user breakdown
    cost_per_user_monthly = total_monthly / prediction.num_users if prediction.num_users > 0 else 0
    
    return {
        "monthly": {
            "auth": round(auth_cost, 2),
            "storage": round(storage_cost, 2),
            "api_requests": round(api_cost, 2),
            "compute": round(compute_cost, 2),
            "total": round(total_monthly, 2)
        },
        "annual": round(annual_cost, 2),
        "per_user_monthly": round(cost_per_user_monthly, 2),
        "metrics": {
            "users": prediction.num_users,
            "storage_gb": round(storage_gb, 2),
            "api_requests": prediction.api_requests_per_month
        },
        "breakdown": {
            "auth_percentage": round((auth_cost / total_monthly * 100), 1),
            "storage_percentage": round((storage_cost / total_monthly * 100), 1),
            "api_percentage": round((api_cost / total_monthly * 100), 1),
            "compute_percentage": round((compute_cost / total_monthly * 100), 1)
        }
    }

@router.get("/api/metadata-tags")
async def get_metadata_tags():
    """Get all available metadata tags"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM metadata_tags_registry ORDER BY tag_category, tag_name")
    tags = cursor.fetchall()
    conn.close()
    
    return [dict(t) for t in tags]

# ============================================================================
# AUDIT MANAGEMENT ENDPOINTS
# ============================================================================

class AuditEngagementCreate(BaseModel):
    audit_name: str
    framework: str
    audit_type: str
    auditor_name: Optional[str] = None
    auditor_contact: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    scope: Optional[List[str]] = None

class AuditEngagementUpdate(BaseModel):
    audit_name: Optional[str] = None
    framework: Optional[str] = None
    audit_type: Optional[str] = None
    auditor_name: Optional[str] = None
    auditor_contact: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    scope: Optional[List[str]] = None

class AuditFindingCreate(BaseModel):
    control_id: str
    finding_type: str
    severity: str
    description: str
    remediation_plan: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    evidence_required: Optional[List[str]] = None

class AuditFindingUpdate(BaseModel):
    finding_type: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    remediation_plan: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    resolved_date: Optional[str] = None

class AuditEvidenceCreate(BaseModel):
    control_id: str
    evidence_type: str
    evidence_name: str
    file_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    expiration_date: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class CertificationCreate(BaseModel):
    certification_name: str
    certification_body: Optional[str] = None
    issue_date: Optional[str] = None
    expiration_date: str
    scope: Optional[List[str]] = None
    certificate_file_path: Optional[str] = None
    renewal_reminder_days: int = 90

