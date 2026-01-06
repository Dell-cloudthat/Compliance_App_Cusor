"""
Pydantic Models for API Request/Response Validation
Provides type safety and automatic validation for all API endpoints
"""
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class UserRole(str, Enum):
    ADMIN = "admin"
    ENGINEER = "engineer"
    AUDITOR = "auditor"
    VIEWER = "viewer"
    VENDOR = "vendor"


class UserPlan(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class ControlStatus(str, Enum):
    IMPLEMENTED = "Implemented"
    PARTIAL = "Partial"
    NOT_IMPLEMENTED = "Not Implemented"
    VENDOR_MANAGED = "Vendor Managed"
    COMPLIANT = "Compliant"
    NON_COMPLIANT = "Non-Compliant"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertType(str, Enum):
    COMPLIANCE_DEGRADATION = "compliance_degradation"
    GAP_CREATED = "gap_created"
    EVIDENCE_EXPIRED = "evidence_expired"
    CONTROL_FAILED = "control_failed"
    COMPLIANCE_DRIFT = "compliance_drift"
    INTEGRATION_EVENT = "integration_event"


class AuditType(str, Enum):
    TYPE_I = "Type I"
    TYPE_II = "Type II"
    SURVEILLANCE = "Surveillance"
    RECERTIFICATION = "Recertification"
    INITIAL = "Initial"


class AuditStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FindingType(str, Enum):
    OBSERVATION = "observation"
    DEFICIENCY = "deficiency"
    NON_CONFORMITY = "non_conformity"
    MAJOR_NONCONFORMITY = "major_nonconformity"


class FindingStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class EvidenceType(str, Enum):
    DOCUMENT = "document"
    SCREENSHOT = "screenshot"
    API_DATA = "api_data"
    LOG_EXPORT = "log_export"
    POLICY = "policy"
    PROCEDURE = "procedure"
    CONFIGURATION = "configuration"


class WorkflowType(str, Enum):
    EVIDENCE_COLLECTION = "evidence_collection"
    GAP_REMEDIATION = "gap_remediation"
    AUDIT_PREP = "audit_prep"
    INCIDENT_RESPONSE = "incident_response"
    CUSTOM = "custom"


class WorkflowStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class Framework(str, Enum):
    SOC2 = "SOC2"
    ISO27001 = "ISO27001"
    NIST_800_53 = "NIST_800-53"
    NIST_800_171 = "NIST_800-171"
    CIS = "CIS"
    HIPAA = "HIPAA"
    PCI_DSS = "PCI-DSS"
    FEDRAMP = "FedRAMP"


# ============================================================================
# User Models
# ============================================================================

class UserCreate(BaseModel):
    """Model for creating a new user"""
    name: str = Field(..., min_length=1, max_length=100, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    organization: Optional[str] = Field(None, max_length=200, description="Organization name")
    plan: UserPlan = Field(default=UserPlan.FREE, description="Subscription plan")
    role: UserRole = Field(default=UserRole.VIEWER, description="User role")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "organization": "Acme Corp",
                "plan": "free",
                "role": "admin"
            }
        }


class UserResponse(BaseModel):
    """Model for user response"""
    id: int
    name: str
    email: str
    organization: Optional[str]
    plan: str
    role: str
    created_at: datetime
    updated_at: datetime


# ============================================================================
# Control Models
# ============================================================================

class ControlCreate(BaseModel):
    """Model for creating a control"""
    control_id: str = Field(..., min_length=1, max_length=50, description="Unique control identifier")
    control_name: str = Field(..., min_length=1, max_length=200, description="Control name")
    description: Optional[str] = Field(None, description="Control description")
    frameworks: Optional[List[str]] = Field(default=[], description="Associated frameworks")
    category: Optional[str] = Field(None, max_length=100, description="Control category")
    priority: Optional[str] = Field(None, description="Priority level")
    status: ControlStatus = Field(default=ControlStatus.PARTIAL, description="Implementation status")
    responsible_party: Optional[str] = Field(None, max_length=200, description="Responsible party")
    covered_by: Optional[str] = Field(None, description="Who covers this control")
    evidence_link: Optional[str] = Field(None, description="Link to evidence")


class ControlUpdate(BaseModel):
    """Model for updating a control"""
    control_name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[ControlStatus] = None
    responsible_party: Optional[str] = Field(None, max_length=200)
    covered_by: Optional[str] = None
    evidence_link: Optional[str] = None


class ControlBulkUpdate(BaseModel):
    """Model for bulk updating controls"""
    control_ids: List[str] = Field(..., min_items=1, description="List of control IDs to update")
    status: Optional[ControlStatus] = None
    responsible_party: Optional[str] = Field(None, max_length=200)
    covered_by: Optional[str] = None


# ============================================================================
# Audit Models
# ============================================================================

class AuditCreate(BaseModel):
    """Model for creating an audit engagement"""
    audit_name: str = Field(..., min_length=1, max_length=200, description="Audit name")
    framework: Framework = Field(..., description="Compliance framework")
    audit_type: AuditType = Field(..., description="Type of audit")
    auditor_name: Optional[str] = Field(None, max_length=200, description="Auditor company name")
    auditor_contact: Optional[EmailStr] = Field(None, description="Auditor contact email")
    start_date: date = Field(..., description="Audit start date")
    end_date: Optional[date] = Field(None, description="Audit end date")
    scope: Optional[List[str]] = Field(default=[], description="Control IDs in scope")

    @validator('end_date')
    def end_date_must_be_after_start(cls, v, values):
        if v and 'start_date' in values and v < values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "audit_name": "SOC 2 Type II - Q1 2024",
                "framework": "SOC2",
                "audit_type": "Type II",
                "auditor_name": "Deloitte",
                "auditor_contact": "audit@deloitte.com",
                "start_date": "2024-01-01",
                "end_date": "2024-03-31",
                "scope": ["CC1.1", "CC2.1", "CC3.1"]
            }
        }


class AuditUpdate(BaseModel):
    """Model for updating an audit"""
    audit_name: Optional[str] = Field(None, min_length=1, max_length=200)
    status: Optional[AuditStatus] = None
    auditor_name: Optional[str] = Field(None, max_length=200)
    auditor_contact: Optional[EmailStr] = None
    end_date: Optional[date] = None
    readiness_score: Optional[int] = Field(None, ge=0, le=100)


# ============================================================================
# Finding Models
# ============================================================================

class FindingCreate(BaseModel):
    """Model for creating an audit finding"""
    control_id: str = Field(..., min_length=1, max_length=50, description="Related control ID")
    finding_type: FindingType = Field(..., description="Type of finding")
    severity: Severity = Field(..., description="Severity level")
    description: str = Field(..., min_length=1, description="Finding description")
    remediation_plan: Optional[str] = Field(None, description="Remediation plan")
    assigned_to: Optional[str] = Field(None, max_length=200, description="Assigned to")
    due_date: Optional[date] = Field(None, description="Due date for remediation")
    status: FindingStatus = Field(default=FindingStatus.OPEN, description="Finding status")


class FindingUpdate(BaseModel):
    """Model for updating a finding"""
    status: Optional[FindingStatus] = None
    remediation_plan: Optional[str] = None
    assigned_to: Optional[str] = Field(None, max_length=200)
    due_date: Optional[date] = None


# ============================================================================
# Evidence Models
# ============================================================================

class EvidenceCreate(BaseModel):
    """Model for creating audit evidence"""
    control_id: str = Field(..., min_length=1, max_length=50, description="Related control ID")
    evidence_type: EvidenceType = Field(..., description="Type of evidence")
    evidence_name: str = Field(..., min_length=1, max_length=200, description="Evidence name")
    file_url: Optional[str] = Field(None, description="URL to evidence file")
    file_size_bytes: Optional[int] = Field(None, ge=0, description="File size in bytes")
    expiration_date: Optional[date] = Field(None, description="Evidence expiration date")
    notes: Optional[str] = Field(None, description="Additional notes")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")


class EvidenceValidate(BaseModel):
    """Model for validating evidence"""
    validated: bool = Field(..., description="Whether evidence is validated")
    notes: Optional[str] = Field(None, description="Validation notes")


# ============================================================================
# Security Event Models
# ============================================================================

class SecurityEventCreate(BaseModel):
    """Model for creating a security event"""
    event_type: str = Field(..., min_length=1, max_length=50, description="Event type")
    event_source: str = Field(..., min_length=1, max_length=100, description="Event source")
    source_tool: Optional[str] = Field(None, max_length=100, description="Source tool name")
    severity: Severity = Field(..., description="Event severity")
    title: str = Field(..., min_length=1, max_length=200, description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    affected_resources: Optional[List[str]] = Field(default=[], description="Affected resources")
    security_event_data: Optional[Dict[str, Any]] = Field(default={}, description="Event data")
    detected_at: datetime = Field(..., description="When the event was detected")
    frameworks: Optional[List[str]] = Field(default=[], description="Relevant frameworks")

    class Config:
        json_schema_extra = {
            "example": {
                "event_type": "threat_detected",
                "event_source": "SIEM",
                "source_tool": "Splunk",
                "severity": "high",
                "title": "Malware Detected",
                "description": "Malware detected on production server",
                "affected_resources": ["server-01", "10.0.1.5"],
                "detected_at": "2024-01-15T10:30:00Z",
                "frameworks": ["NIST_800-53", "SOC2"]
            }
        }


# ============================================================================
# Workflow Models
# ============================================================================

class WorkflowCreate(BaseModel):
    """Model for creating a workflow"""
    name: str = Field(..., min_length=1, max_length=200, description="Workflow name")
    workflow_type: WorkflowType = Field(..., description="Workflow type")
    description: Optional[str] = Field(None, description="Workflow description")
    trigger_config: Optional[Dict[str, Any]] = Field(default={}, description="Trigger configuration")
    steps: Optional[List[Dict[str, Any]]] = Field(default=[], description="Workflow steps")
    conditions: Optional[Dict[str, Any]] = Field(default={}, description="Workflow conditions")
    escalation_rules: Optional[Dict[str, Any]] = Field(default={}, description="Escalation rules")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Evidence Collection Workflow",
                "workflow_type": "evidence_collection",
                "description": "Automated evidence collection workflow",
                "steps": [
                    {"action": "collect_evidence", "params": {"control_id": "AC-1"}},
                    {"action": "validate_evidence", "params": {}}
                ]
            }
        }


class WorkflowUpdate(BaseModel):
    """Model for updating a workflow"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[WorkflowStatus] = None
    trigger_config: Optional[Dict[str, Any]] = None
    steps: Optional[List[Dict[str, Any]]] = None


class WorkflowExecute(BaseModel):
    """Model for executing a workflow"""
    trigger_event: Optional[str] = Field(None, description="Event that triggered execution")
    trigger_data: Optional[Dict[str, Any]] = Field(default={}, description="Trigger data")
    parameters: Optional[Dict[str, Any]] = Field(default={}, description="Execution parameters")


# ============================================================================
# Alert Models
# ============================================================================

class AlertAcknowledge(BaseModel):
    """Model for acknowledging an alert"""
    acknowledged: bool = Field(default=True, description="Acknowledgement status")
    notes: Optional[str] = Field(None, description="Acknowledgement notes")


class AlertResolve(BaseModel):
    """Model for resolving an alert"""
    resolution_notes: str = Field(..., min_length=1, description="Resolution notes")
    actions_taken: Optional[List[str]] = Field(default=[], description="Actions taken")
    evidence_links: Optional[List[str]] = Field(default=[], description="Evidence links")


# ============================================================================
# Cost Prediction Models
# ============================================================================

class CostPredictionRequest(BaseModel):
    """Model for cost prediction request"""
    num_users: int = Field(..., ge=1, le=100000, description="Number of users")
    avg_storage_gb_per_user: float = Field(default=0.2, ge=0, description="Average storage per user in GB")
    api_requests_per_month: int = Field(default=50000, ge=0, description="API requests per month")
    retention_days: int = Field(default=90, ge=30, le=3650, description="Data retention in days")

    class Config:
        json_schema_extra = {
            "example": {
                "num_users": 50,
                "avg_storage_gb_per_user": 0.2,
                "api_requests_per_month": 50000,
                "retention_days": 90
            }
        }


# ============================================================================
# Data Flow Models
# ============================================================================

class DataFlowNodeCreate(BaseModel):
    """Model for creating a data flow node"""
    node_type: str = Field(..., min_length=1, max_length=50, description="Node type")
    name: str = Field(..., min_length=1, max_length=200, description="Node name")
    description: Optional[str] = Field(None, description="Node description")
    sensitivity: Optional[str] = Field(None, max_length=50, description="Data sensitivity")
    data_domains: Optional[List[str]] = Field(default=[], description="Data domains")
    classification_tags: Optional[List[str]] = Field(default=[], description="Classification tags")
    owner: Optional[str] = Field(None, max_length=200, description="Node owner")
    responsible_party: Optional[str] = Field(None, max_length=200, description="Responsible party")
    framework_controls: Optional[List[str]] = Field(default=[], description="Related controls")
    evidence_links: Optional[List[str]] = Field(default=[], description="Evidence links")
    layout_position: Optional[Dict[str, float]] = Field(default={}, description="UI position")


class DataFlowEdgeCreate(BaseModel):
    """Model for creating a data flow edge"""
    source_node_id: int = Field(..., description="Source node ID")
    target_node_id: int = Field(..., description="Target node ID")
    flow_type: str = Field(..., min_length=1, max_length=50, description="Flow type")
    transport: Optional[str] = Field(None, max_length=50, description="Transport method")
    encryption_status: Optional[str] = Field(None, max_length=50, description="Encryption status")
    controls_impacted: Optional[List[str]] = Field(default=[], description="Impacted controls")


# ============================================================================
# Permission Models
# ============================================================================

class PermissionGrant(BaseModel):
    """Model for granting permissions"""
    user_id: int = Field(..., description="User to grant permission to")
    resource_type: str = Field(..., min_length=1, max_length=50, description="Resource type")
    resource_id: Optional[str] = Field(None, description="Specific resource ID")
    permission_type: str = Field(..., min_length=1, max_length=50, description="Permission type")
    expires_at: Optional[datetime] = Field(None, description="Permission expiration")


class PermissionRevoke(BaseModel):
    """Model for revoking permissions"""
    permission_id: int = Field(..., description="Permission ID to revoke")
    reason: Optional[str] = Field(None, description="Reason for revocation")


# ============================================================================
# Response Models
# ============================================================================

class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = True
    message: str


class ErrorResponse(BaseModel):
    """Generic error response"""
    success: bool = False
    error: str
    detail: Optional[str] = None


class PaginatedResponse(BaseModel):
    """Generic paginated response"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    has_more: bool
