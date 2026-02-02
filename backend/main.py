"""
FastAPI Backend for Compliance Automation Platform
Handles data segmentation, metadata tagging, PII/CUI filtering, and cost tracking
"""

import asyncio

from fastapi import FastAPI, HTTPException, Depends, Header, Request, WebSocket, WebSocketDisconnect, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import sqlite3
import json
import hashlib
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from services.iam_service import (
    check_permission, create_audit_log, get_user_permissions,
    create_login_session, end_login_session, log_user_access,
    get_user_access_summary, get_user_access_logs, auto_map_user_permissions,
    map_permissions_to_compliance
)
from services.integration_service import (
    register_integration, ingest_edr_event, ingest_network_appliance_log,
    ingest_identity_provider_event, ingest_cloud_platform_event
)
from services.auto_mapping_service import (
    map_event_to_controls, auto_map_integration_event, update_control_evidence_from_event
)
from services.evidence_collection_service import (
    collect_evidence_for_control, collect_evidence_for_audit,
    get_evidence_freshness, auto_link_evidence_to_controls
)
from services.report_generation_service import (
    generate_full_audit_report, generate_evidence_package, generate_executive_summary
)
from services.workflow_service import (
    create_workflow, get_workflow, list_workflows, update_workflow, delete_workflow,
    execute_workflow, get_workflow_executions, get_workflow_analytics, get_workflow_templates
)
from services.csca_engine import map_security_event_to_compliance, calculate_compliance_impact, update_compliance_scores_from_security_event, get_security_compliance_correlation
from services import alert_service
from services import intelligence_service
from services import learning_service
from services.data_flow_service import (
    create_data_flow_node,
    update_data_flow_node,
    delete_data_flow_node,
    create_data_flow_edge,
    update_data_flow_edge,
    delete_data_flow_edge,
    list_data_flow_graph,
    list_data_flow_audit,
    get_data_flow_node,
    get_data_flow_edge,
    record_data_flow_audit
)
from services import client_intake_service
from services import consulting_service
from services import business_ops_service

# Database setup
DB_PATH = Path(__file__).parent / "database" / "compliance.db"
SCHEMA_PATH = Path(__file__).parent / "database" / "schema.sql"

app = FastAPI(title="Compliance Platform API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()


class AlertWebSocketManager:
    def __init__(self):
        self.connections: Dict[int, List[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.connections.setdefault(user_id, []).append(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket):
        async with self.lock:
            conns = self.connections.get(user_id, [])
            if websocket in conns:
                conns.remove(websocket)
            if not conns and user_id in self.connections:
                del self.connections[user_id]

    async def send_to_user(self, user_id: int, message: Dict[str, Any]):
        async with self.lock:
            conns = list(self.connections.get(user_id, []))
        stale_connections = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                stale_connections.append(ws)
        for ws in stale_connections:
            await self.disconnect(user_id, ws)

    async def broadcast_alert(self, alert: Dict[str, Any], event_type: str):
        user_id = alert.get('user_id')
        if user_id is not None:
            await self.send_to_user(user_id, {
                'type': event_type,
                'payload': alert
            })

    async def send_initial_snapshot(self, user_id: int):
        alerts = alert_service.get_actionable_alerts(user_id, limit=50)
        if alerts:
            await self.send_to_user(user_id, {
                'type': 'alert.snapshot',
                'payload': alerts
            })


alert_ws_manager = AlertWebSocketManager()


@app.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket, user_id: int = Query(..., alias="user_id")):
    try:
        await alert_ws_manager.connect(user_id, websocket)
        await websocket.send_json({"type": "connection_ack"})
        await alert_ws_manager.send_initial_snapshot(user_id)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await alert_ws_manager.disconnect(user_id, websocket)
    except Exception:
        await alert_ws_manager.disconnect(user_id, websocket)


# Helper: Get database connection
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


class AlertControlUpdate(BaseModel):
    control_id: str
    status: Optional[str] = None
    responsible_party: Optional[str] = None
    coverage_type: Optional[str] = None
    secondary_owners: Optional[List[str]] = None
    data_sources: Optional[List[str]] = None
    evidence_link: Optional[str] = None


class AlertRemediationUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|in_progress|resolved)$")
    notes: Optional[str] = None
    actions_taken: Optional[List[str]] = None
    evidence_links: Optional[List[str]] = None
    control_updates: Optional[List[AlertControlUpdate]] = None

# Helper: Initialize database
def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Read and execute schema (will create tables if they don't exist)
    with open(SCHEMA_PATH, 'r') as f:
        schema = f.read()
        # Split by semicolons and execute each statement
        # This handles CREATE TABLE IF NOT EXISTS properly
        try:
            cursor.executescript(schema)
            conn.commit()
        except sqlite3.OperationalError as e:
            # If table already exists, that's okay - continue
            if "already exists" not in str(e).lower():
                print(f"Schema execution warning: {e}")
            conn.commit()
    
    # Check if audit tables exist, if not create them
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_engagements'")
    audit_tables_exist = cursor.fetchone()
    
    # Check if IAM tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_permissions'")
    iam_tables_exist = cursor.fetchone()
    
    if not audit_tables_exist:
        print("Creating audit management tables...")
        # Execute only the audit-related CREATE TABLE statements
        audit_schema = """
        CREATE TABLE IF NOT EXISTS audit_engagements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          audit_name TEXT NOT NULL,
          framework TEXT NOT NULL,
          audit_type TEXT NOT NULL,
          auditor_name TEXT,
          auditor_contact TEXT,
          start_date DATE NOT NULL,
          end_date DATE,
          status TEXT DEFAULT 'planned',
          scope TEXT,
          readiness_score INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        CREATE TABLE IF NOT EXISTS audit_findings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          audit_engagement_id INTEGER NOT NULL,
          control_id TEXT NOT NULL,
          finding_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          description TEXT NOT NULL,
          remediation_plan TEXT,
          assigned_to TEXT,
          due_date DATE,
          status TEXT DEFAULT 'open',
          resolved_date DATE,
          evidence_required TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)
        );
        
        CREATE TABLE IF NOT EXISTS audit_evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          audit_engagement_id INTEGER,
          control_id TEXT NOT NULL,
          evidence_type TEXT NOT NULL,
          evidence_name TEXT NOT NULL,
          file_path TEXT,
          file_url TEXT,
          file_size_bytes INTEGER,
          uploaded_by TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          validated BOOLEAN DEFAULT 0,
          validated_by TEXT,
          validated_at TIMESTAMP,
          expiration_date DATE,
          metadata TEXT,
          notes TEXT,
          FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)
        );
        
        CREATE TABLE IF NOT EXISTS certifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          certification_name TEXT NOT NULL,
          certification_body TEXT,
          issue_date DATE,
          expiration_date DATE NOT NULL,
          status TEXT DEFAULT 'active',
          scope TEXT,
          certificate_file_path TEXT,
          renewal_reminder_days INTEGER DEFAULT 90,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        CREATE TABLE IF NOT EXISTS certification_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          certification_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          event_date DATE NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (certification_id) REFERENCES certifications(id)
        );
        
        CREATE TABLE IF NOT EXISTS evidence_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          audit_engagement_id INTEGER,
          control_id TEXT NOT NULL,
          requested_by TEXT NOT NULL,
          requested_from TEXT NOT NULL,
          request_type TEXT DEFAULT 'evidence_upload',
          due_date DATE NOT NULL,
          status TEXT DEFAULT 'pending',
          submitted_at TIMESTAMP,
          validated_at TIMESTAMP,
          reminder_sent BOOLEAN DEFAULT 0,
          reminder_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_audit_engagements_user ON audit_engagements(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_engagements_status ON audit_engagements(status);
        CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON audit_findings(audit_engagement_id);
        CREATE INDEX IF NOT EXISTS idx_audit_findings_status ON audit_findings(status);
        CREATE INDEX IF NOT EXISTS idx_audit_evidence_audit ON audit_evidence(audit_engagement_id);
        CREATE INDEX IF NOT EXISTS idx_audit_evidence_control ON audit_evidence(control_id);
        CREATE INDEX IF NOT EXISTS idx_certifications_user ON certifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
        CREATE INDEX IF NOT EXISTS idx_evidence_requests_audit ON evidence_requests(audit_engagement_id);
        """
        cursor.executescript(audit_schema)
        conn.commit()
    
    # Check if CSCA tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='security_events'")
    csca_tables_exist = cursor.fetchone()
    
    if not iam_tables_exist:
        print("Creating IAM system tables...")
        # IAM tables are already in schema.sql, but we'll verify they exist
        # The schema.sql should have been executed, so this is just a safety check
        # Re-run the schema to ensure IAM tables are created
        try:
            with open(SCHEMA_PATH, 'r') as f:
                full_schema = f.read()
                # Extract just the IAM section (or re-run entire schema)
                cursor.executescript(full_schema)
                conn.commit()
        except Exception as e:
            print(f"Warning: Could not create IAM tables from schema: {e}")
            # Create IAM tables manually if schema execution fails
            iam_schema = """
            CREATE TABLE IF NOT EXISTS user_roles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              role_name TEXT NOT NULL,
              entity_id INTEGER,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id)
            );
            
            CREATE TABLE IF NOT EXISTS permission_templates (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              template_name TEXT NOT NULL UNIQUE,
              description TEXT,
              permissions_json TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS user_permissions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              resource_type TEXT NOT NULL,
              resource_id TEXT,
              permission_type TEXT NOT NULL,
              granted_by INTEGER NOT NULL,
              granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              expires_at TIMESTAMP,
              approval_workflow_id INTEGER,
              metadata_json TEXT,
              FOREIGN KEY (user_id) REFERENCES users(id),
              FOREIGN KEY (granted_by) REFERENCES users(id)
            );
            
            CREATE TABLE IF NOT EXISTS approval_workflows (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              workflow_name TEXT,
              requestor_id INTEGER NOT NULL,
              approver_id INTEGER,
              resource_type TEXT NOT NULL,
              resource_id TEXT,
              permission_requested TEXT NOT NULL,
              status TEXT DEFAULT 'pending',
              requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              approved_at TIMESTAMP,
              rejected_at TIMESTAMP,
              rejection_reason TEXT,
              FOREIGN KEY (requestor_id) REFERENCES users(id),
              FOREIGN KEY (approver_id) REFERENCES users(id)
            );
            
            CREATE TABLE IF NOT EXISTS permission_audit_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              log_hash TEXT NOT NULL UNIQUE,
              event_type TEXT NOT NULL,
              user_id INTEGER NOT NULL,
              permission_id INTEGER,
              granted_by INTEGER,
              ip_address TEXT,
              user_agent TEXT,
              resource_type TEXT,
              resource_id TEXT,
              permission_type TEXT,
              previous_permissions TEXT,
              new_permissions TEXT,
              metadata_json TEXT,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id),
              FOREIGN KEY (granted_by) REFERENCES users(id),
              FOREIGN KEY (permission_id) REFERENCES user_permissions(id)
            );
            
            CREATE TABLE IF NOT EXISTS vendor_access_profiles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              vendor_id INTEGER,
              vendor_name TEXT NOT NULL,
              profile_name TEXT NOT NULL,
              entity_id INTEGER,
              scope_json TEXT NOT NULL,
              permissions_json TEXT NOT NULL,
              access_expires_at TIMESTAMP,
              auto_renew BOOLEAN DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS vendor_user_assignments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              vendor_access_profile_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              assigned_by INTEGER NOT NULL,
              assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              expires_at TIMESTAMP,
              status TEXT DEFAULT 'active',
              FOREIGN KEY (vendor_access_profile_id) REFERENCES vendor_access_profiles(id),
              FOREIGN KEY (user_id) REFERENCES users(id),
              FOREIGN KEY (assigned_by) REFERENCES users(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON user_permissions(resource_type, resource_id);
            CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_permission_audit_timestamp ON permission_audit_log(timestamp);
            CREATE INDEX IF NOT EXISTS idx_permission_audit_hash ON permission_audit_log(log_hash);
            CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
            CREATE INDEX IF NOT EXISTS idx_vendor_user_assignments_user ON vendor_user_assignments(user_id);
            """
            cursor.executescript(iam_schema)
            conn.commit()
            print("IAM tables created successfully")
    
    # Check if IAM tracking tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_login_sessions'")
    iam_tracking_tables_exist = cursor.fetchone()
    
    if not iam_tracking_tables_exist:
        print("Creating IAM tracking tables...")
        try:
            iam_tracking_schema_path = Path(__file__).parent / "database" / "iam_tracking_schema.sql"
            if iam_tracking_schema_path.exists():
                with open(iam_tracking_schema_path, 'r') as f:
                    iam_tracking_schema = f.read()
                    cursor.executescript(iam_tracking_schema)
                    conn.commit()
                    print("IAM tracking tables created successfully")
        except Exception as e:
            print(f"Warning: Could not create IAM tracking tables: {e}")
    
    if not csca_tables_exist:
        print("Creating CSCA system tables...")
        try:
            with open(SCHEMA_PATH, 'r') as f:
                full_schema = f.read()
                cursor.executescript(full_schema)
                conn.commit()
        except Exception as e:
            print(f"Warning: Could not create CSCA tables from schema: {e}")
            # Create CSCA tables manually if schema execution fails
            csca_schema = """
            CREATE TABLE IF NOT EXISTS security_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              event_type TEXT NOT NULL,
              event_source TEXT NOT NULL,
              source_tool TEXT,
              severity TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT,
              affected_resources TEXT,
              security_event_data TEXT,
              detected_at TIMESTAMP NOT NULL,
              resolved_at TIMESTAMP,
              status TEXT DEFAULT 'open',
              assigned_to TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id)
            );
            
            CREATE TABLE IF NOT EXISTS security_event_compliance_mapping (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              security_event_id INTEGER NOT NULL,
              control_id TEXT NOT NULL,
              framework TEXT NOT NULL,
              impact_level TEXT NOT NULL,
              compliance_impact TEXT,
              mapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (security_event_id) REFERENCES security_events(id)
            );
            
            CREATE TABLE IF NOT EXISTS compliance_score_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              framework TEXT NOT NULL,
              overall_score INTEGER NOT NULL,
              controls_implemented INTEGER,
              controls_total INTEGER,
              gaps_count INTEGER,
              security_event_impact INTEGER DEFAULT 0,
              calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id)
            );
            
            CREATE TABLE IF NOT EXISTS security_compliance_correlation (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              metric_type TEXT NOT NULL,
              metric_value REAL NOT NULL,
              compliance_score_delta INTEGER,
              framework TEXT,
              control_id TEXT,
              calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id)
            );
            
            CREATE TABLE IF NOT EXISTS compliance_alerts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              alert_type TEXT NOT NULL,
              severity TEXT NOT NULL,
              title TEXT NOT NULL,
              description TEXT,
              security_event_id INTEGER,
              control_id TEXT,
              framework TEXT,
              compliance_score_before INTEGER,
              compliance_score_after INTEGER,
              acknowledged BOOLEAN DEFAULT 0,
              acknowledged_at TIMESTAMP,
              acknowledged_by TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id),
              FOREIGN KEY (security_event_id) REFERENCES security_events(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
            CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
            CREATE INDEX IF NOT EXISTS idx_security_events_status ON security_events(status);
            CREATE INDEX IF NOT EXISTS idx_event_compliance_mapping_event ON security_event_compliance_mapping(security_event_id);
            CREATE INDEX IF NOT EXISTS idx_compliance_score_history_user ON compliance_score_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_compliance_alerts_user ON compliance_alerts(user_id);
            """
            cursor.executescript(csca_schema)
            conn.commit()
            print("CSCA tables created successfully")
    
    # Check if pattern detection tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='security_event_patterns'")
    pattern_tables_exist = cursor.fetchone()
    
    if not pattern_tables_exist:
        print("Creating pattern detection tables...")
        try:
            with open(SCHEMA_PATH, 'r') as f:
                full_schema = f.read()
                cursor.executescript(full_schema)
                conn.commit()
        except Exception as e:
            print(f"Warning: Could not create pattern tables from schema: {e}")
            # Pattern tables will be created on next schema execution
    
    conn.close()
    print(f"Database initialized at {DB_PATH}")

# Initialize on startup
@app.on_event("startup")
async def startup():
    init_db()

# Pydantic Models
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

@app.get("/")
async def root():
    return {
        "message": "Compliance Platform API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.post("/api/users", response_model=Dict[str, Any])
async def create_user(user: UserCreate):
    """Create a new user"""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO users (name, email, organization, plan, role)
            VALUES (?, ?, ?, ?, ?)
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

@app.get("/api/users/{user_id}")
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

@app.get("/api/data-sources")
async def get_data_sources(user_id: int):
    """Get all data sources for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM data_sources WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    sources = cursor.fetchall()
    conn.close()
    
    return [dict(s) for s in sources]

@app.post("/api/data-sources", response_model=Dict[str, Any])
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

@app.post("/api/data-segments", response_model=Dict[str, Any])
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

@app.get("/api/data-segments/by-control/{control_id}")
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

@app.get("/api/responsibility-matrix/{user_id}")
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

@app.post("/api/cost-prediction")
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

@app.get("/api/metadata-tags")
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

# Audit Engagement Endpoints
@app.post("/api/audits")
async def create_audit_engagement(audit: AuditEngagementCreate, user_id: int = Header(..., alias="X-User-Id")):
    """Create a new audit engagement"""
    conn = get_db()
    cursor = conn.cursor()
    
    scope_json = json.dumps(audit.scope or [])
    
    cursor.execute("""
        INSERT INTO audit_engagements 
        (user_id, audit_name, framework, audit_type, auditor_name, auditor_contact, 
         start_date, end_date, scope, readiness_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        user_id, audit.audit_name, audit.framework, audit.audit_type,
        audit.auditor_name, audit.auditor_contact, audit.start_date,
        audit.end_date, scope_json
    ))
    
    audit_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": audit_id, "message": "Audit engagement created successfully"}

@app.get("/api/audits")
async def list_audits(user_id: int = Header(..., alias="X-User-Id")):
    """List all audit engagements for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT *, 
               (SELECT COUNT(*) FROM audit_findings WHERE audit_engagement_id = audit_engagements.id) as finding_count,
               (SELECT COUNT(*) FROM audit_evidence WHERE audit_engagement_id = audit_engagements.id) as evidence_count
        FROM audit_engagements 
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))
    
    audits = cursor.fetchall()
    conn.close()
    
    result = []
    for audit in audits:
        audit_dict = dict(audit)
        audit_dict['scope'] = json.loads(audit_dict['scope']) if audit_dict['scope'] else []
        result.append(audit_dict)
    
    return result

@app.get("/api/audits/{audit_id}")
async def get_audit(audit_id: int, user_id: int = Header(..., alias="X-User-Id")):
    """Get audit engagement details"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM audit_engagements 
        WHERE id = ? AND user_id = ?
    """, (audit_id, user_id))
    
    audit = cursor.fetchone()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    audit_dict = dict(audit)
    audit_dict['scope'] = json.loads(audit_dict['scope']) if audit_dict['scope'] else []
    
    # Get findings count
    cursor.execute("SELECT COUNT(*) as count FROM audit_findings WHERE audit_engagement_id = ?", (audit_id,))
    findings_count = cursor.fetchone()['count']
    audit_dict['findings_count'] = findings_count
    
    # Get evidence count
    cursor.execute("SELECT COUNT(*) as count FROM audit_evidence WHERE audit_engagement_id = ?", (audit_id,))
    evidence_count = cursor.fetchone()['count']
    audit_dict['evidence_count'] = evidence_count
    
    conn.close()
    return audit_dict

@app.put("/api/audits/{audit_id}")
async def update_audit(audit_id: int, audit_update: AuditEngagementUpdate, user_id: int = Header(..., alias="X-User-Id")):
    """Update audit engagement"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Build update query dynamically
    updates = []
    values = []
    
    if audit_update.audit_name:
        updates.append("audit_name = ?")
        values.append(audit_update.audit_name)
    if audit_update.framework:
        updates.append("framework = ?")
        values.append(audit_update.framework)
    if audit_update.audit_type:
        updates.append("audit_type = ?")
        values.append(audit_update.audit_type)
    if audit_update.auditor_name is not None:
        updates.append("auditor_name = ?")
        values.append(audit_update.auditor_name)
    if audit_update.auditor_contact is not None:
        updates.append("auditor_contact = ?")
        values.append(audit_update.auditor_contact)
    if audit_update.start_date:
        updates.append("start_date = ?")
        values.append(audit_update.start_date)
    if audit_update.end_date is not None:
        updates.append("end_date = ?")
        values.append(audit_update.end_date)
    if audit_update.status:
        updates.append("status = ?")
        values.append(audit_update.status)
    if audit_update.scope is not None:
        updates.append("scope = ?")
        values.append(json.dumps(audit_update.scope))
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.extend([audit_id, user_id])
    
    cursor.execute(f"""
        UPDATE audit_engagements 
        SET {', '.join(updates)}
        WHERE id = ? AND user_id = ?
    """, values)
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Audit updated successfully"}

@app.get("/api/audits/{audit_id}/readiness")
async def calculate_readiness(audit_id: int, user_id: int = Header(..., alias="X-User-Id")):
    """Calculate audit readiness score (0-100)"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get audit
    cursor.execute("SELECT * FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    audit = cursor.fetchone()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    audit_dict = dict(audit)
    scope = json.loads(audit_dict['scope']) if audit_dict['scope'] else []
    
    if not scope:
        return {"readiness_score": 0, "breakdown": {}}
    
    # Calculate evidence coverage
    cursor.execute("""
        SELECT control_id, COUNT(*) as evidence_count
        FROM audit_evidence
        WHERE audit_engagement_id = ? AND validated = 1
        GROUP BY control_id
    """, (audit_id,))
    
    evidence_by_control = {row['control_id']: row['evidence_count'] for row in cursor.fetchall()}
    
    # Calculate findings impact
    cursor.execute("""
        SELECT 
            COUNT(*) as total_findings,
            SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_findings,
            SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_findings,
            SUM(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 ELSE 0 END) as resolved_findings
        FROM audit_findings
        WHERE audit_engagement_id = ?
    """, (audit_id,))
    
    findings_stats = dict(cursor.fetchone())
    
    # Calculate readiness score
    # Evidence coverage: 50% of score
    controls_with_evidence = sum(1 for cid in scope if cid in evidence_by_control and evidence_by_control[cid] > 0)
    evidence_coverage = (controls_with_evidence / len(scope) * 100) if scope else 0
    evidence_score = evidence_coverage * 0.5
    
    # Findings impact: 30% of score
    total_findings = findings_stats['total_findings'] or 0
    critical_findings = findings_stats['critical_findings'] or 0
    high_findings = findings_stats['high_findings'] or 0
    resolved_findings = findings_stats['resolved_findings'] or 0
    
    finding_penalty = (critical_findings * 10) + (high_findings * 5) + (total_findings - resolved_findings) * 2
    findings_score = max(0, 30 - min(finding_penalty, 30))
    
    # Evidence validation: 20% of score
    cursor.execute("""
        SELECT 
            COUNT(*) as total_evidence,
            SUM(CASE WHEN validated = 1 THEN 1 ELSE 0 END) as validated_evidence
        FROM audit_evidence
        WHERE audit_engagement_id = ?
    """, (audit_id,))
    
    validation_stats = dict(cursor.fetchone())
    total_evidence = validation_stats['total_evidence'] or 0
    validated_evidence = validation_stats['validated_evidence'] or 0
    validation_score = (validated_evidence / total_evidence * 20) if total_evidence > 0 else 0
    
    readiness_score = min(100, int(evidence_score + findings_score + validation_score))
    
    # Update audit readiness score
    cursor.execute("""
        UPDATE audit_engagements 
        SET readiness_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    """, (readiness_score, audit_id, user_id))
    
    conn.commit()
    conn.close()
    
    return {
        "readiness_score": readiness_score,
        "breakdown": {
            "evidence_coverage": round(evidence_coverage, 1),
            "evidence_score": round(evidence_score, 1),
            "findings_penalty": finding_penalty,
            "findings_score": round(findings_score, 1),
            "validation_score": round(validation_score, 1),
            "total_findings": total_findings,
            "critical_findings": critical_findings,
            "high_findings": high_findings,
            "resolved_findings": resolved_findings,
            "controls_with_evidence": controls_with_evidence,
            "total_controls": len(scope),
            "total_evidence": total_evidence,
            "validated_evidence": validated_evidence
        }
    }

# Audit Findings Endpoints
@app.post("/api/audits/{audit_id}/findings")
async def create_finding(audit_id: int, finding: AuditFindingCreate, user_id: int = Header(..., alias="X-User-Id")):
    """Create a new audit finding"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit exists and belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    evidence_required_json = json.dumps(finding.evidence_required or [])
    
    cursor.execute("""
        INSERT INTO audit_findings 
        (audit_engagement_id, control_id, finding_type, severity, description, 
         remediation_plan, assigned_to, due_date, evidence_required)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id, finding.control_id, finding.finding_type, finding.severity,
        finding.description, finding.remediation_plan, finding.assigned_to,
        finding.due_date, evidence_required_json
    ))
    
    finding_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": finding_id, "message": "Audit finding created successfully"}

@app.get("/api/audits/{audit_id}/findings")
async def list_findings(audit_id: int, user_id: int = Header(..., alias="X-User-Id")):
    """List all findings for an audit"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    cursor.execute("""
        SELECT * FROM audit_findings 
        WHERE audit_engagement_id = ?
        ORDER BY 
            CASE severity 
                WHEN 'critical' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                ELSE 4 
            END,
            created_at DESC
    """, (audit_id,))
    
    findings = cursor.fetchall()
    conn.close()
    
    result = []
    for finding in findings:
        finding_dict = dict(finding)
        finding_dict['evidence_required'] = json.loads(finding_dict['evidence_required']) if finding_dict['evidence_required'] else []
        result.append(finding_dict)
    
    return result

@app.put("/api/audits/{audit_id}/findings/{finding_id}")
async def update_finding(audit_id: int, finding_id: int, finding_update: AuditFindingUpdate, user_id: int = Header(..., alias="X-User-Id")):
    """Update audit finding"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    # Build update query
    updates = []
    values = []
    
    if finding_update.finding_type:
        updates.append("finding_type = ?")
        values.append(finding_update.finding_type)
    if finding_update.severity:
        updates.append("severity = ?")
        values.append(finding_update.severity)
    if finding_update.description:
        updates.append("description = ?")
        values.append(finding_update.description)
    if finding_update.remediation_plan is not None:
        updates.append("remediation_plan = ?")
        values.append(finding_update.remediation_plan)
    if finding_update.assigned_to is not None:
        updates.append("assigned_to = ?")
        values.append(finding_update.assigned_to)
    if finding_update.due_date is not None:
        updates.append("due_date = ?")
        values.append(finding_update.due_date)
    if finding_update.status:
        updates.append("status = ?")
        values.append(finding_update.status)
        if finding_update.status in ['resolved', 'closed'] and not finding_update.resolved_date:
            updates.append("resolved_date = CURRENT_DATE")
    
    if finding_update.resolved_date:
        updates.append("resolved_date = ?")
        values.append(finding_update.resolved_date)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.extend([finding_id, audit_id])
    
    cursor.execute(f"""
        UPDATE audit_findings 
        SET {', '.join(updates)}
        WHERE id = ? AND audit_engagement_id = ?
    """, values)
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Finding updated successfully"}

# Audit Evidence Endpoints
@app.post("/api/audits/{audit_id}/evidence")
async def create_evidence(audit_id: int, evidence: AuditEvidenceCreate, user_id: int = Header(..., alias="X-User-Id")):
    """Upload audit evidence"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    metadata_json = json.dumps(evidence.metadata or {})
    
    cursor.execute("""
        INSERT INTO audit_evidence 
        (audit_engagement_id, control_id, evidence_type, evidence_name, 
         file_url, file_size_bytes, expiration_date, metadata, notes, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        audit_id, evidence.control_id, evidence.evidence_type, evidence.evidence_name,
        evidence.file_url, evidence.file_size_bytes, evidence.expiration_date,
        metadata_json, evidence.notes, f"user_{user_id}"
    ))
    
    evidence_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": evidence_id, "message": "Evidence uploaded successfully"}

@app.get("/api/audits/{audit_id}/evidence")
async def list_evidence(audit_id: int, user_id: int = Header(..., alias="X-User-Id"), control_id: Optional[str] = None):
    """List audit evidence"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    if control_id:
        cursor.execute("""
            SELECT * FROM audit_evidence 
            WHERE audit_engagement_id = ? AND control_id = ?
            ORDER BY uploaded_at DESC
        """, (audit_id, control_id))
    else:
        cursor.execute("""
            SELECT * FROM audit_evidence 
            WHERE audit_engagement_id = ?
            ORDER BY uploaded_at DESC
        """, (audit_id,))
    
    evidence_list = cursor.fetchall()
    conn.close()
    
    result = []
    for ev in evidence_list:
        ev_dict = dict(ev)
        ev_dict['metadata'] = json.loads(ev_dict['metadata']) if ev_dict['metadata'] else {}
        result.append(ev_dict)
    
    return result

@app.put("/api/audits/{audit_id}/evidence/{evidence_id}/validate")
async def validate_evidence(audit_id: int, evidence_id: int, user_id: int = Header(..., alias="X-User-Id"), validated: bool = True):
    """Validate or reject audit evidence"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Audit not found")
    
    cursor.execute("""
        UPDATE audit_evidence 
        SET validated = ?, validated_by = ?, validated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND audit_engagement_id = ?
    """, (validated, f"user_{user_id}", evidence_id, audit_id))
    
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Evidence not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Evidence validation updated successfully"}

# Automated Evidence Collection Endpoints
@app.post("/api/audits/{audit_id}/evidence/collect")
async def trigger_evidence_collection(
    audit_id: int,
    user_id: int = Header(..., alias="X-User-Id"),
    control_ids: Optional[List[str]] = None,
    integration_id: Optional[int] = None
):
    """Trigger automated evidence collection for an audit"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.close()
    
    # Collect evidence
    results = collect_evidence_for_audit(audit_id, control_ids, integration_id)
    
    return results

@app.post("/api/audits/{audit_id}/evidence/collect/{control_id}")
async def collect_evidence_for_single_control(
    audit_id: int,
    control_id: str,
    user_id: int = Header(..., alias="X-User-Id"),
    integration_id: Optional[int] = None
):
    """Collect evidence for a specific control"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.close()
    
    # Collect evidence for this control
    evidence_items = collect_evidence_for_control(control_id, audit_id, integration_id)
    
    return {
        "control_id": control_id,
        "evidence_collected": len(evidence_items),
        "evidence_items": evidence_items
    }

@app.get("/api/audits/{audit_id}/evidence/freshness")
async def get_evidence_freshness_metrics(
    audit_id: int,
    user_id: int = Header(..., alias="X-User-Id")
):
    """Get evidence freshness metrics for an audit"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.close()
    
    freshness_stats = get_evidence_freshness(audit_id)
    
    return freshness_stats

@app.post("/api/audits/{audit_id}/evidence/auto-link")
async def trigger_auto_linking(
    audit_id: int,
    user_id: int = Header(..., alias="X-User-Id")
):
    """Automatically link evidence to controls based on content analysis"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify audit belongs to user
    cursor.execute("SELECT id FROM audit_engagements WHERE id = ? AND user_id = ?", (audit_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Audit not found")
    
    conn.close()
    
    linking_results = auto_link_evidence_to_controls(audit_id)
    
    return linking_results

# Report Generation Endpoints
@app.get("/api/audits/{audit_id}/reports/full")
async def generate_full_report(
    audit_id: int,
    user_id: int = Header(..., alias="X-User-Id")
):
    """Generate full audit report"""
    report = generate_full_audit_report(audit_id, user_id)
    if "error" in report:
        raise HTTPException(status_code=404, detail=report["error"])
    return report

@app.get("/api/audits/{audit_id}/reports/evidence-package")
async def generate_evidence_package_report(
    audit_id: int,
    user_id: int = Header(..., alias="X-User-Id"),
    control_ids: Optional[str] = None
):
    """Generate evidence package report"""
    control_ids_list = json.loads(control_ids) if control_ids else None
    package = generate_evidence_package(audit_id, user_id, control_ids_list)
    if "error" in package:
        raise HTTPException(status_code=404, detail=package["error"])
    return package

@app.get("/api/audits/{audit_id}/reports/executive-summary")
async def generate_executive_summary_report(
    audit_id: int,
    user_id: int = Header(..., alias="X-User-Id")
):
    """Generate executive summary report"""
    summary = generate_executive_summary(audit_id, user_id)
    if "error" in summary:
        raise HTTPException(status_code=404, detail=summary["error"])
    return summary

# Certification Endpoints
@app.post("/api/certifications")
async def create_certification(cert: CertificationCreate, user_id: int = Header(..., alias="X-User-Id")):
    """Create a new certification"""
    conn = get_db()
    cursor = conn.cursor()
    
    scope_json = json.dumps(cert.scope or [])
    
    cursor.execute("""
        INSERT INTO certifications 
        (user_id, certification_name, certification_body, issue_date, 
         expiration_date, scope, certificate_file_path, renewal_reminder_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, cert.certification_name, cert.certification_body, cert.issue_date,
        cert.expiration_date, scope_json, cert.certificate_file_path, cert.renewal_reminder_days
    ))
    
    cert_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": cert_id, "message": "Certification created successfully"}

@app.get("/api/certifications")
async def list_certifications(user_id: int = Header(..., alias="X-User-Id")):
    """List all certifications for a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM certifications 
        WHERE user_id = ?
        ORDER BY expiration_date ASC
    """, (user_id,))
    
    certs = cursor.fetchall()
    conn.close()
    
    result = []
    for cert in certs:
        cert_dict = dict(cert)
        cert_dict['scope'] = json.loads(cert_dict['scope']) if cert_dict['scope'] else []
        result.append(cert_dict)
    
    return result

# ============================================================================
# IAM (Identity & Access Management) Endpoints
# ============================================================================

@app.post("/api/permissions/grant")
async def grant_permission(permission: PermissionGrant, user_id: int = Header(..., alias="X-User-Id"), request: Request = None):
    """Grant permission to a user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if grantor has permission to grant permissions (admin check)
    # First, check if user has admin role
    cursor.execute("SELECT role_name FROM user_roles WHERE user_id = ? AND role_name = 'Admin'", (user_id,))
    has_admin_role = cursor.fetchone()
    
    # If no admin role, check permission system
    if not has_admin_role:
        allowed, reason = check_permission(user_id, "all", None, "write")
        if not allowed:
            # Check if this is the first user (bootstrap admin)
            cursor.execute("SELECT COUNT(*) as count FROM users")
            user_count = cursor.fetchone()['count']
            if user_count <= 1:
                # First user automatically gets admin
                cursor.execute("INSERT OR IGNORE INTO user_roles (user_id, role_name) VALUES (?, 'Admin')", (user_id,))
                conn.commit()
            else:
                raise HTTPException(status_code=403, detail="Insufficient permissions to grant access. Admin role required.")
    
    # Get IP and user agent
    ip_address = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    
    # Insert permission
    expires_at = permission.expires_at if permission.expires_at else None
    metadata_json = json.dumps(permission.metadata) if permission.metadata else None
    
    cursor.execute("""
        INSERT INTO user_permissions 
        (user_id, resource_type, resource_id, permission_type, granted_by, expires_at, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        permission.user_id, permission.resource_type, permission.resource_id,
        permission.permission_type, user_id, expires_at, metadata_json
    ))
    
    perm_id = cursor.lastrowid
    conn.commit()
    
    # Create audit log
    create_audit_log(
        event_type="grant",
        user_id=permission.user_id,
        granted_by=user_id,
        resource_type=permission.resource_type,
        resource_id=permission.resource_id,
        permission_type=permission.permission_type,
        permission_id=perm_id,
        ip_address=ip_address,
        user_agent=user_agent,
        new_permissions={"resource_type": permission.resource_type, "permission_type": permission.permission_type}
    )
    
    conn.close()
    return {"id": perm_id, "message": "Permission granted successfully"}

@app.post("/api/permissions/revoke")
async def revoke_permission(revoke: PermissionRevoke, user_id: int = Header(..., alias="X-User-Id"), request: Request = None):
    """Revoke a permission"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if grantor has permission
    allowed, reason = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get permission before deleting
    cursor.execute("SELECT * FROM user_permissions WHERE id = ?", (revoke.permission_id,))
    perm = cursor.fetchone()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    perm_dict = dict(perm)
    
    # Delete permission
    cursor.execute("DELETE FROM user_permissions WHERE id = ?", (revoke.permission_id,))
    conn.commit()
    
    # Create audit log
    ip_address = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    
    create_audit_log(
        event_type="revoke",
        user_id=perm_dict['user_id'],
        granted_by=user_id,
        resource_type=perm_dict['resource_type'],
        resource_id=perm_dict['resource_id'],
        permission_type=perm_dict['permission_type'],
        permission_id=revoke.permission_id,
        ip_address=ip_address,
        user_agent=user_agent,
        previous_permissions=perm_dict,
        metadata={"reason": revoke.reason}
    )
    
    conn.close()
    return {"message": "Permission revoked successfully"}

@app.post("/api/permissions/check")
async def check_user_permission(check: PermissionCheck):
    """Check if user has permission"""
    allowed, reason = check_permission(check.user_id, check.resource_type, check.resource_id, check.permission_type)
    return {"allowed": allowed, "reason": reason}

@app.get("/api/permissions/user/{target_user_id}")
async def list_user_permissions(target_user_id: int, user_id: int = Header(..., alias="X-User-Id")):
    """List all permissions for a user (requires admin or self)"""
    # Check if user is viewing their own permissions or is admin
    if target_user_id != user_id:
        allowed, _ = check_permission(user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    permissions = get_user_permissions(target_user_id)
    return permissions

@app.post("/api/permissions/bootstrap-admin")
async def bootstrap_admin(user_id: int = Header(..., alias="X-User-Id")):
    """Bootstrap admin role for first user (one-time setup)"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if user already has admin role
    cursor.execute("SELECT id FROM user_roles WHERE user_id = ? AND role_name = 'Admin'", (user_id,))
    if cursor.fetchone():
        conn.close()
        return {"message": "User already has admin role"}
    
    # Check if this is the first user or if no admins exist
    cursor.execute("SELECT COUNT(*) as count FROM users")
    user_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM user_roles WHERE role_name = 'Admin'")
    admin_count = cursor.fetchone()['count']
    
    if user_count <= 1 or admin_count == 0:
        # Grant admin role
        cursor.execute("INSERT INTO user_roles (user_id, role_name) VALUES (?, 'Admin')", (user_id,))
        conn.commit()
        conn.close()
        return {"message": "Admin role granted successfully"}
    else:
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot bootstrap admin: admins already exist")

@app.post("/api/vendor-access/profiles")
async def create_vendor_access_profile(profile: VendorAccessProfileCreate, user_id: int = Header(..., alias="X-User-Id")):
    """Create a vendor access profile"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check admin permission
    cursor.execute("SELECT role_name FROM user_roles WHERE user_id = ? AND role_name = 'Admin'", (user_id,))
    has_admin_role = cursor.fetchone()
    
    if not has_admin_role:
        allowed, _ = check_permission(user_id, "all", None, "write")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    cursor.execute("""
        INSERT INTO vendor_access_profiles 
        (vendor_id, vendor_name, profile_name, entity_id, scope_json, permissions_json, access_expires_at, auto_renew)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        profile.vendor_id, profile.vendor_name, profile.profile_name, profile.entity_id,
        json.dumps(profile.scope), json.dumps(profile.permissions),
        profile.access_expires_at, profile.auto_renew
    ))
    
    profile_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": profile_id, "message": "Vendor access profile created successfully"}

@app.post("/api/vendor-access/assign")
async def assign_vendor_user(assign: VendorUserAssign, user_id: int = Header(..., alias="X-User-Id")):
    """Assign a vendor user to an access profile"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check admin permission
    allowed, _ = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    cursor.execute("""
        INSERT INTO vendor_user_assignments 
        (vendor_access_profile_id, user_id, assigned_by, expires_at)
        VALUES (?, ?, ?, ?)
    """, (assign.vendor_access_profile_id, assign.vendor_user_id, user_id, assign.expires_at))
    
    assignment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {"id": assignment_id, "message": "Vendor user assigned successfully"}

@app.get("/api/permissions/audit-log")
async def get_audit_log(user_id: Optional[int] = None, vendor_id: Optional[int] = None,
                       start_date: Optional[str] = None, end_date: Optional[str] = None,
                       event_type: Optional[str] = None,
                       current_user_id: int = Header(..., alias="X-User-Id")):
    """Get permission audit log"""
    # Check admin permission
    allowed, _ = check_permission(current_user_id, "all", None, "read")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM permission_audit_log WHERE 1=1"
    params = []
    
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)
    
    if start_date:
        query += " AND timestamp >= ?"
        params.append(start_date)
    
    if end_date:
        query += " AND timestamp <= ?"
        params.append(end_date)
    
    if event_type:
        query += " AND event_type = ?"
        params.append(event_type)
    
    query += " ORDER BY timestamp DESC LIMIT 1000"
    
    cursor.execute(query, params)
    logs = cursor.fetchall()
    conn.close()
    
    result = []
    for log in logs:
        log_dict = dict(log)
        log_dict['previous_permissions'] = json.loads(log_dict['previous_permissions']) if log_dict.get('previous_permissions') else None
        log_dict['new_permissions'] = json.loads(log_dict['new_permissions']) if log_dict.get('new_permissions') else None
        log_dict['metadata_json'] = json.loads(log_dict['metadata_json']) if log_dict.get('metadata_json') else None
        result.append(log_dict)
    
    return result

# ============================================================================
# IAM Access Tracking Endpoints
# ============================================================================

class LoginRequest(BaseModel):
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AccessLogRequest(BaseModel):
    resource_type: str
    resource_id: Optional[str] = None
    action_type: str  # 'read', 'write', 'execute', 'delete', 'view', etc.
    session_token: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool = True
    failure_reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    access_duration_ms: int = 0

@app.post("/api/iam/login")
async def login_user(login: LoginRequest, user_id: int = Header(..., alias="X-User-Id"), request: Request = None):
    """Create a login session and auto-map user permissions"""
    ip_address = login.ip_address or (request.client.host if request else None)
    user_agent = login.user_agent or (request.headers.get("user-agent") if request else None)
    
    session_token = create_login_session(user_id, ip_address, user_agent)
    
    return {
        "session_token": session_token,
        "message": "Login session created, permissions auto-mapped"
    }

@app.post("/api/iam/logout")
async def logout_user(session_token: str = Header(..., alias="X-Session-Token")):
    """End a login session"""
    end_login_session(session_token, 'logout')
    return {"message": "Logged out successfully"}

@app.post("/api/iam/access-log")
async def log_access(access: AccessLogRequest, user_id: int = Header(..., alias="X-User-Id"), request: Request = None):
    """Log a user access event with r/w/x permission tracking"""
    ip_address = access.ip_address or (request.client.host if request else None)
    user_agent = access.user_agent or (request.headers.get("user-agent") if request else None)
    
    access_log_id = log_user_access(
        user_id=user_id,
        resource_type=access.resource_type,
        resource_id=access.resource_id,
        action_type=access.action_type,
        session_token=access.session_token,
        ip_address=ip_address,
        user_agent=user_agent,
        success=access.success,
        failure_reason=access.failure_reason,
        metadata=access.metadata,
        access_duration_ms=access.access_duration_ms
    )
    
    return {"access_log_id": access_log_id, "message": "Access logged successfully"}

@app.get("/api/iam/access-summary/{target_user_id}")
async def get_access_summary(
    target_user_id: int,
    days: int = Query(30, ge=1, le=365),
    current_user_id: int = Header(..., alias="X-User-Id")
):
    """Get comprehensive access summary for a user"""
    # Check if user is viewing their own summary or is admin
    if target_user_id != current_user_id:
        allowed, _ = check_permission(current_user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    summary = get_user_access_summary(target_user_id, days)
    return summary

@app.get("/api/iam/access-logs/{target_user_id}")
async def get_access_logs(
    target_user_id: int,
    limit: int = Query(100, ge=1, le=1000),
    resource_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user_id: int = Header(..., alias="X-User-Id")
):
    """Get access logs for a user"""
    # Check if user is viewing their own logs or is admin
    if target_user_id != current_user_id:
        allowed, _ = check_permission(current_user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    logs = get_user_access_logs(target_user_id, limit, resource_type, start_date, end_date)
    return logs

@app.get("/api/iam/mapped-permissions/{target_user_id}")
async def get_mapped_permissions(
    target_user_id: int,
    current_user_id: int = Header(..., alias="X-User-Id")
):
    """Get auto-mapped permissions for a user with r/w/x breakdown"""
    # Check if user is viewing their own permissions or is admin
    if target_user_id != current_user_id:
        allowed, _ = check_permission(current_user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT resource_type, resource_id,
               read_access, write_access, execute_access, delete_access,
               discovered_from, source_id, confidence_score, observation_count,
               first_observed_at, last_observed_at
        FROM auto_mapped_permissions
        WHERE user_id = ?
        ORDER BY observation_count DESC, confidence_score DESC
    """, (target_user_id,))
    
    permissions = cursor.fetchall()
    conn.close()
    
    return [
        {
            'resource_type': p['resource_type'],
            'resource_id': p['resource_id'],
            'read': bool(p['read_access']),
            'write': bool(p['write_access']),
            'execute': bool(p['execute_access']),
            'delete': bool(p['delete_access']),
            'discovered_from': p['discovered_from'],
            'source_id': p['source_id'],
            'confidence_score': p['confidence_score'],
            'observation_count': p['observation_count'],
            'first_observed_at': p['first_observed_at'],
            'last_observed_at': p['last_observed_at']
        }
        for p in permissions
    ]

@app.post("/api/iam/auto-map-permissions/{target_user_id}")
async def trigger_auto_map(
    target_user_id: int,
    current_user_id: int = Header(..., alias="X-User-Id")
):
    """Manually trigger auto-mapping of user permissions"""
    # Check admin permission
    allowed, _ = check_permission(current_user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    auto_map_user_permissions(target_user_id)
    return {"message": "Permissions auto-mapped successfully"}

@app.get("/api/iam/compliance-mapping/{target_user_id}")
async def get_compliance_mapping(
    target_user_id: int,
    framework: str = Query('NIST_800-53'),
    current_user_id: int = Header(..., alias="X-User-Id")
):
    """Get compliance control mappings for user permissions"""
    # Check if user is viewing their own mapping or is admin
    if target_user_id != current_user_id:
        allowed, _ = check_permission(current_user_id, "all", None, "read")
        if not allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Map permissions to compliance
    map_permissions_to_compliance(target_user_id, framework)
    
    # Get mappings
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT control_id, framework, permission_type, resource_type, resource_id,
               compliance_status, last_verified_at, verification_notes
        FROM permission_compliance_mapping
        WHERE user_id = ? AND framework = ?
        ORDER BY control_id, resource_type
    """, (target_user_id, framework))
    
    mappings = cursor.fetchall()
    conn.close()
    
    return [
        {
            'control_id': m['control_id'],
            'framework': m['framework'],
            'permission_type': m['permission_type'],
            'resource_type': m['resource_type'],
            'resource_id': m['resource_id'],
            'compliance_status': m['compliance_status'],
            'last_verified_at': m['last_verified_at'],
            'verification_notes': m['verification_notes']
        }
        for m in mappings
    ]

@app.get("/api/iam/users")
async def list_all_users(
    current_user_id: int = Header(..., alias="X-User-Id")
):
    """List all users with their access statistics (admin only)"""
    # Check admin permission
    allowed, _ = check_permission(current_user_id, "all", None, "read")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.role, u.created_at,
               (SELECT COUNT(*) FROM user_login_sessions WHERE user_id = u.id) as total_logins,
               (SELECT COUNT(*) FROM user_access_logs WHERE user_id = u.id) as total_accesses,
               (SELECT MAX(access_timestamp) FROM user_access_logs WHERE user_id = u.id) as last_access
        FROM users u
        ORDER BY u.created_at DESC
    """, ())
    
    users = cursor.fetchall()
    conn.close()
    
    return [dict(u) for u in users]

# ============================================================================
# Integration Endpoints - External System Integration
# ============================================================================

class IntegrationRegister(BaseModel):
    integration_type: str  # 'edr', 'network_appliance', 'identity_provider', 'cloud_platform', 'siem'
    name: str
    config: Dict[str, Any]

class EDREvent(BaseModel):
    event_type: str  # 'login', 'logout', 'file_access', 'process_execution', 'network_connection', 'privilege_escalation'
    user_identifier: Optional[str] = None
    device_identifier: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    resource_id: Optional[str] = None
    access_type: Optional[str] = None
    event_timestamp: Optional[str] = None

class NetworkApplianceLog(BaseModel):
    log_type: str  # 'authentication', 'connection', 'dns_query', 'web_proxy'
    user_identifier: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    action: Optional[str] = None
    user_agent: Optional[str] = None
    log_timestamp: Optional[str] = None

class IdentityProviderEvent(BaseModel):
    event_type: str  # 'user.login', 'user.logout', 'user.created', 'permission.granted', 'permission.revoked'
    user_identifier: Optional[str] = None
    group_identifier: Optional[str] = None
    resource_identifier: Optional[str] = None
    resource_type: Optional[str] = None
    permission_type: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    event_timestamp: Optional[str] = None

class CloudPlatformEvent(BaseModel):
    event_type: str  # 'api_call', 'console_login', 'resource_access', 'permission_change'
    user_identifier: Optional[str] = None
    service_name: Optional[str] = None
    resource_arn: Optional[str] = None
    api_action: Optional[str] = None
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
    event_timestamp: Optional[str] = None

@app.post("/api/integrations/register")
async def register_integration_endpoint(
    integration: IntegrationRegister,
    user_id: int = Header(..., alias="X-User-Id")
):
    """Register a new integration (EDR, Network Appliance, Identity Provider, etc.)"""
    allowed, _ = check_permission(user_id, "all", None, "write")
    if not allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    integration_id = register_integration(
        integration.integration_type,
        integration.name,
        integration.config,
        user_id
    )
    
    return {
        "integration_id": integration_id,
        "message": f"Integration '{integration.name}' registered successfully"
    }

@app.post("/api/integrations/edr/events")
async def ingest_edr_event_endpoint(
    event: EDREvent,
    integration_id: int = Header(..., alias="X-Integration-Id"),
    user_id: int = Header(..., alias="X-User-Id")
):
    """Ingest events from EDR systems (CrowdStrike, SentinelOne, Microsoft Defender, etc.)"""
    event_data = event.dict()
    event_id = ingest_edr_event(integration_id, event_data)
    
    return {
        "event_id": event_id,
        "message": "EDR event ingested successfully"
    }

@app.post("/api/integrations/network/logs")
async def ingest_network_log_endpoint(
    log: NetworkApplianceLog,
    integration_id: int = Header(..., alias="X-Integration-Id"),
    user_id: int = Header(..., alias="X-User-Id")
):
    """Ingest logs from network appliances (Firewalls, Proxies, VPNs, etc.)"""
    log_data = log.dict()
    log_id = ingest_network_appliance_log(integration_id, log_data)
    
    return {
        "log_id": log_id,
        "message": "Network appliance log ingested successfully"
    }

@app.post("/api/integrations/identity/events")
async def ingest_identity_event_endpoint(
    event: IdentityProviderEvent,
    integration_id: int = Header(..., alias="X-Integration-Id"),
    user_id: int = Header(..., alias="X-User-Id")
):
    """Ingest events from Identity Providers (Okta, Azure AD, Google Workspace, etc.)"""
    event_data = event.dict()
    event_id = ingest_identity_provider_event(integration_id, event_data)
    
    return {
        "event_id": event_id,
        "message": "Identity provider event ingested successfully"
    }

@app.post("/api/integrations/cloud/events")
async def ingest_cloud_event_endpoint(
    event: CloudPlatformEvent,
    integration_id: int = Header(..., alias="X-Integration-Id"),
    user_id: int = Header(..., alias="X-User-Id")
):
    """Ingest events from Cloud Platforms (AWS CloudTrail, Azure Activity Logs, GCP Audit Logs)"""
    event_data = event.dict()
    event_id = ingest_cloud_platform_event(integration_id, event_data)
    
    return {
        "event_id": event_id,
        "message": "Cloud platform event ingested successfully"
    }

@app.get("/api/integrations/events/summary")
async def get_integration_events_summary(
    user_id: int = Header(..., alias="X-User-Id"),
    days: int = 30
):
    """Get summary of integration events for data flow visualization"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get integrations for this user
    cursor.execute("SELECT id, name, integration_type FROM integrations WHERE user_id = ?", (user_id,))
    integrations = [dict(row) for row in cursor.fetchall()]
    
    # Get event counts by integration and type
    summary = {
        "total_events": 0,
        "by_integration": {},
        "by_type": {},
        "by_framework": {},
        "recent_events": []
    }
    
    # EDR Events
    for integration in integrations:
        if integration['integration_type'] in ['EDR', 'edr']:
            cursor.execute("""
                SELECT COUNT(*) as count, event_type
                FROM edr_events
                WHERE integration_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
                GROUP BY event_type
            """, (integration['id'], days))
            for row in cursor.fetchall():
                row_dict = dict(row)
                event_type = row_dict['event_type'] or 'unknown'
                count = row_dict['count'] or 0
                summary['total_events'] += count
                summary['by_integration'][integration['name']] = summary['by_integration'].get(integration['name'], 0) + count
                summary['by_type'][event_type] = summary['by_type'].get(event_type, 0) + count
    
    # Network Appliance Logs
    for integration in integrations:
        if integration['integration_type'] in ['Network', 'network']:
            cursor.execute("""
                SELECT COUNT(*) as count, log_type
                FROM network_appliance_logs
                WHERE integration_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
                GROUP BY log_type
            """, (integration['id'], days))
            for row in cursor.fetchall():
                row_dict = dict(row)
                log_type = row_dict['log_type'] or 'unknown'
                count = row_dict['count'] or 0
                summary['total_events'] += count
                summary['by_integration'][integration['name']] = summary['by_integration'].get(integration['name'], 0) + count
                summary['by_type'][log_type] = summary['by_type'].get(log_type, 0) + count
    
    # Identity Provider Events
    for integration in integrations:
        if integration['integration_type'] in ['Identity', 'identity']:
            cursor.execute("""
                SELECT COUNT(*) as count, event_type
                FROM identity_provider_events
                WHERE integration_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
                GROUP BY event_type
            """, (integration['id'], days))
            for row in cursor.fetchall():
                row_dict = dict(row)
                event_type = row_dict['event_type'] or 'unknown'
                count = row_dict['count'] or 0
                summary['total_events'] += count
                summary['by_integration'][integration['name']] = summary['by_integration'].get(integration['name'], 0) + count
                summary['by_type'][event_type] = summary['by_type'].get(event_type, 0) + count
    
    # Cloud Platform Events
    for integration in integrations:
        if integration['integration_type'] in ['Cloud', 'cloud']:
            cursor.execute("""
                SELECT COUNT(*) as count, event_type
                FROM cloud_platform_events
                WHERE integration_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
                GROUP BY event_type
            """, (integration['id'], days))
            for row in cursor.fetchall():
                row_dict = dict(row)
                event_type = row_dict['event_type'] or 'unknown'
                count = row_dict['count'] or 0
                summary['total_events'] += count
                summary['by_integration'][integration['name']] = summary['by_integration'].get(integration['name'], 0) + count
                summary['by_type'][event_type] = summary['by_type'].get(event_type, 0) + count
    
    # Get compliance alerts created from integration events (to show framework mapping)
    cursor.execute("""
        SELECT framework, COUNT(*) as count
        FROM compliance_alerts
        WHERE user_id = ? AND alert_type = 'integration_event' 
          AND created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY framework
    """, (user_id, days))
    for row in cursor.fetchall():
        row_dict = dict(row)
        framework = row_dict['framework'] or 'unknown'
        count = row_dict['count'] or 0
        summary['by_framework'][framework] = summary['by_framework'].get(framework, 0) + count
    
    conn.close()
    return summary

# ============================================================================
# Data Flow Architecture Endpoints
# ============================================================================

@app.get("/api/data-flow/graph")
async def get_data_flow_graph_endpoint(user_id: int = Header(..., alias="X-User-Id")):
    """Retrieve the full data flow graph (nodes + edges)"""
    allowed, reason = check_permission(user_id, "all", None, "read")
    if not allowed:
        raise HTTPException(status_code=403, detail=reason or "Insufficient permissions")
    try:
        return list_data_flow_graph(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load data flow graph: {str(e)}")


@app.get("/api/data-flow/nodes/{node_id}")
async def get_data_flow_node_endpoint(node_id: int, user_id: int = Header(..., alias="X-User-Id")):
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


@app.post("/api/data-flow/nodes")
async def create_data_flow_node_endpoint(node: DataFlowNodeCreate, user_id: int = Header(..., alias="X-User-Id")):
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


@app.put("/api/data-flow/nodes/{node_id}")
async def update_data_flow_node_endpoint(node_id: int, node: DataFlowNodeUpdate, user_id: int = Header(..., alias="X-User-Id")):
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


@app.delete("/api/data-flow/nodes/{node_id}")
async def delete_data_flow_node_endpoint(node_id: int, reason: Optional[str] = Query(None), user_id: int = Header(..., alias="X-User-Id")):
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


@app.get("/api/data-flow/edges/{edge_id}")
async def get_data_flow_edge_endpoint(edge_id: int, user_id: int = Header(..., alias="X-User-Id")):
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


@app.post("/api/data-flow/edges")
async def create_data_flow_edge_endpoint(edge: DataFlowEdgeCreate, user_id: int = Header(..., alias="X-User-Id")):
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


@app.put("/api/data-flow/edges/{edge_id}")
async def update_data_flow_edge_endpoint(edge_id: int, edge: DataFlowEdgeUpdate, user_id: int = Header(..., alias="X-User-Id")):
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


@app.delete("/api/data-flow/edges/{edge_id}")
async def delete_data_flow_edge_endpoint(edge_id: int, reason: Optional[str] = Query(None), user_id: int = Header(..., alias="X-User-Id")):
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


@app.get("/api/data-flow/audit")
async def get_data_flow_audit_endpoint(limit: int = 100, user_id: int = Header(..., alias="X-User-Id")):
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

@app.post("/api/security-events")
async def create_security_event(event: SecurityEventCreate, user_id: int = Header(..., alias="X-User-Id"), request: Request = None):
    """Ingest a security event and automatically map to compliance controls"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Insert security event
    detected_at = event.detected_at if event.detected_at else datetime.now().isoformat()
    affected_resources_json = json.dumps(event.affected_resources) if event.affected_resources else None
    event_data_json = json.dumps(event.security_event_data) if event.security_event_data else None
    
    cursor.execute("""
        INSERT INTO security_events 
        (user_id, event_type, event_source, source_tool, severity, title, description, 
         affected_resources, security_event_data, detected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, event.event_type, event.event_source, event.source_tool,
        event.severity, event.title, event.description,
        affected_resources_json, event_data_json, detected_at
    ))
    
    event_id = cursor.lastrowid
    conn.commit()
    
    # Map to compliance controls
    event_dict = {
        'event_type': event.event_type,
        'severity': event.severity,
        'frameworks': event.frameworks or ['NIST_800-53', 'ISO27001', 'SOC2', 'CIS']
    }
    mappings = map_security_event_to_compliance(user_id, event_dict)
    
    # Insert compliance mappings
    for mapping in mappings:
        cursor.execute("""
            INSERT INTO security_event_compliance_mapping
            (security_event_id, control_id, framework, impact_level, compliance_impact)
            VALUES (?, ?, ?, ?, ?)
        """, (
            event_id, mapping['control_id'], mapping['framework'],
            mapping['impact_level'], mapping['compliance_impact']
        ))
    
    conn.commit()
    
    # Update compliance scores
    update_compliance_scores_from_security_event(user_id, event_id)
    
    # Insert correlation metric
    if mappings:
        cursor.execute("""
            INSERT INTO security_compliance_correlation
            (user_id, metric_type, metric_value, compliance_score_delta, framework)
            VALUES (?, ?, ?, ?, ?)
        """, (
            user_id, f'{event.event_type}_impact', abs(mappings[0].get('compliance_score_delta', 0)),
            mappings[0].get('compliance_score_delta', 0), mappings[0].get('framework')
        ))
        conn.commit()
    
    conn.close()
    
    return {
        "id": event_id,
        "mappings": len(mappings),
        "message": "Security event ingested and mapped to compliance controls"
    }

@app.get("/api/security-events")
async def list_security_events(user_id: int = Header(..., alias="X-User-Id"), 
                              event_type: Optional[str] = None,
                              severity: Optional[str] = None,
                              status: Optional[str] = None,
                              limit: int = 100):
    """List security events with compliance mappings"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM security_events WHERE user_id = ?"
    params = [user_id]
    
    if event_type:
        query += " AND event_type = ?"
        params.append(event_type)
    
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    
    if status:
        query += " AND status = ?"
        params.append(status)
    
    query += " ORDER BY detected_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    events = cursor.fetchall()
    
    # Get compliance mappings for each event
    result = []
    for event in events:
        event_dict = dict(event)
        event_dict['affected_resources'] = json.loads(event_dict['affected_resources']) if event_dict.get('affected_resources') else []
        event_dict['security_event_data'] = json.loads(event_dict['security_event_data']) if event_dict.get('security_event_data') else {}
        
        # Get compliance mappings
        cursor.execute("""
            SELECT * FROM security_event_compliance_mapping
            WHERE security_event_id = ?
        """, (event_dict['id'],))
        mappings = cursor.fetchall()
        event_dict['compliance_mappings'] = [dict(m) for m in mappings]
        
        result.append(event_dict)
    
    conn.close()
    return result

@app.get("/api/security-events/{event_id}/compliance-impact")
async def get_security_event_compliance_impact(event_id: int, user_id: int = Header(..., alias="X-User-Id")):
    """Get compliance impact of a specific security event"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify event belongs to user
    cursor.execute("SELECT id FROM security_events WHERE id = ? AND user_id = ?", (event_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Security event not found")
    
    impact = calculate_compliance_impact(user_id, event_id)
    
    # Get compliance mappings
    cursor.execute("""
        SELECT secm.*, c.control_name
        FROM security_event_compliance_mapping secm
        LEFT JOIN controls c ON secm.control_id = c.id
        WHERE secm.security_event_id = ?
    """, (event_id,))
    mappings = cursor.fetchall()
    
    conn.close()
    
    return {
        "event_id": event_id,
        "framework_impacts": impact,
        "control_mappings": [dict(m) for m in mappings]
    }

@app.get("/api/compliance-score-history")
async def get_compliance_score_history(user_id: int = Header(..., alias="X-User-Id"),
                                       framework: Optional[str] = None,
                                       days: int = 30):
    """Get compliance score history with security event impacts"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = """
        SELECT * FROM compliance_score_history
        WHERE user_id = ? AND calculated_at >= datetime('now', '-' || ? || ' days')
    """
    params = [user_id, days]
    
    if framework:
        query += " AND framework = ?"
        params.append(framework)
    
    query += " ORDER BY framework, calculated_at DESC"
    
    cursor.execute(query, params)
    history = cursor.fetchall()
    
    conn.close()
    return [dict(h) for h in history]

@app.get("/api/compliance-alerts")
async def get_compliance_alerts(user_id: int = Header(..., alias="X-User-Id"),
                               acknowledged: Optional[bool] = None,
                               severity: Optional[str] = None,
                               limit: int = 50):
    """Get compliance alerts (including security event triggered alerts)"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM compliance_alerts WHERE user_id = ?"
    params = [user_id]
    
    if acknowledged is not None:
        query += " AND acknowledged = ?"
        params.append(1 if acknowledged else 0)
    
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    alerts = cursor.fetchall()
    
    conn.close()
    return [dict(a) for a in alerts]

@app.post("/api/compliance-alerts/{alert_id}/acknowledge")
async def acknowledge_compliance_alert(alert_id: int, user_id: int = Header(..., alias="X-User-Id")):
    """Acknowledge a compliance alert"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify alert belongs to user
    cursor.execute("SELECT id FROM compliance_alerts WHERE id = ? AND user_id = ?", (alert_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Alert not found")
    
    cursor.execute("""
        UPDATE compliance_alerts
        SET acknowledged = 1, acknowledged_at = datetime('now'), acknowledged_by = ?
        WHERE id = ?
    """, (user_id, alert_id))
    
    conn.commit()
    conn.close()
    updated_alert = alert_service.get_alert(alert_id)
    if updated_alert:
        await alert_ws_manager.broadcast_alert(updated_alert, 'alert.updated')
    return {"message": "Alert acknowledged"}


@app.get("/api/alerts/{alert_id}")
async def get_alert_detail(alert_id: int, user_id: int = Header(..., alias="X-User-Id")):
    """Retrieve detailed alert drill-down data"""
    detail = alert_service.get_alert_detail(alert_id, user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Alert not found")
    return detail


@app.post("/api/alerts/{alert_id}/remediation")
async def update_alert_remediation(alert_id: int, payload: AlertRemediationUpdate, user_id: int = Header(..., alias="X-User-Id")):
    """Update remediation workflow for an alert and optionally modify related controls"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM compliance_alerts WHERE id = ? AND user_id = ?", (alert_id, user_id))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Alert not found")

    control_updates_payload: List[Dict[str, Any]] = []

    if payload.control_updates:
        for update in payload.control_updates:
            cursor.execute("SELECT id FROM controls WHERE id = ? AND user_id = ?", (update.control_id, user_id))
            if not cursor.fetchone():
                conn.rollback()
                conn.close()
                raise HTTPException(status_code=404, detail=f"Control {update.control_id} not found")

            control_updates: List[str] = []
            control_params: List[Any] = []
            control_activity_metadata: Dict[str, Any] = {"control_id": update.control_id}

            if update.status:
                control_updates.append("status = ?")
                control_params.append(update.status)
                control_activity_metadata["new_status"] = update.status
            if update.responsible_party:
                control_updates.append("responsible_party = ?")
                control_params.append(update.responsible_party)
                control_activity_metadata["new_owner"] = update.responsible_party
            if update.evidence_link:
                control_updates.append("evidence_link = ?")
                control_params.append(update.evidence_link)
                control_activity_metadata.setdefault("evidence_links", []).append(update.evidence_link)

            if control_updates:
                control_updates.append("last_updated = CURRENT_TIMESTAMP")
                sql = f"UPDATE controls SET {', '.join(control_updates)} WHERE id = ? AND user_id = ?"
                control_params.extend([update.control_id, user_id])
                cursor.execute(sql, control_params)

            if any([
                update.coverage_type is not None,
                update.secondary_owners is not None,
                update.data_sources is not None,
                update.responsible_party is not None
            ]):
                cursor.execute("SELECT id FROM responsibility_matrix WHERE control_id = ? AND user_id = ?", (update.control_id, user_id))
                resp_entry = cursor.fetchone()
                shared_flag = 1 if update.secondary_owners and len(update.secondary_owners) > 0 else 0

                if resp_entry:
                    rm_updates = []
                    rm_params: List[Any] = []
                    if update.coverage_type is not None:
                        rm_updates.append("coverage_type = ?")
                        rm_params.append(update.coverage_type)
                        control_activity_metadata["coverage_type"] = update.coverage_type
                    if update.secondary_owners is not None:
                        rm_updates.append("secondary_owners = ?")
                        rm_params.append(json.dumps(update.secondary_owners))
                        rm_updates.append("shared_responsibility = ?")
                        rm_params.append(shared_flag)
                        control_activity_metadata["secondary_owners"] = update.secondary_owners
                    if update.data_sources is not None:
                        rm_updates.append("data_sources = ?")
                        rm_params.append(json.dumps(update.data_sources))
                        control_activity_metadata["data_sources"] = update.data_sources
                    if update.responsible_party:
                        rm_updates.append("primary_owner = ?")
                        rm_params.append(update.responsible_party)
                    if rm_updates:
                        rm_updates.append("last_computed = CURRENT_TIMESTAMP")
                        sql = f"UPDATE responsibility_matrix SET {', '.join(rm_updates)} WHERE id = ?"
                        rm_params.append(resp_entry['id'])
                        cursor.execute(sql, rm_params)
                else:
                    cursor.execute(
                        """
                        INSERT INTO responsibility_matrix
                        (user_id, control_id, primary_owner, shared_responsibility, secondary_owners, data_sources, coverage_type, last_computed)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        """,
                        (
                            user_id,
                            update.control_id,
                            update.responsible_party,
                            shared_flag,
                            json.dumps(update.secondary_owners or []),
                            json.dumps(update.data_sources or []),
                            update.coverage_type
                        )
                    )
                    control_activity_metadata["coverage_type"] = update.coverage_type
                    control_activity_metadata["secondary_owners"] = update.secondary_owners or []
                    control_activity_metadata["data_sources"] = update.data_sources or []

            has_changes = any([
                update.status is not None,
                update.responsible_party is not None,
                update.coverage_type is not None,
                update.secondary_owners is not None,
                update.data_sources is not None,
                update.evidence_link is not None,
            ])

            if has_changes:
                control_updates_payload.append({
                "control_id": update.control_id,
                "status": update.status,
                "responsible_party": update.responsible_party,
                "coverage_type": update.coverage_type,
                "secondary_owners": update.secondary_owners,
                "data_sources": update.data_sources,
                "evidence_link": update.evidence_link,
                })

            metadata_payload = {k: v for k, v in control_activity_metadata.items() if v is not None and k != "control_id"}
            if metadata_payload:
                metadata_payload["control_id"] = control_activity_metadata["control_id"]
                alert_service.record_alert_activity(
                    alert_id=alert_id,
                    user_id=user_id,
                    event_type="control_update",
                    status=payload.status,
                    actor=f"User {user_id}",
                    metadata=metadata_payload,
                )

    conn.commit()
    conn.close()

    metadata_patch: Dict[str, Any] = {}
    if payload.actions_taken is not None:
        metadata_patch['actions_taken'] = payload.actions_taken
    if payload.evidence_links is not None:
        metadata_patch['evidence_links'] = payload.evidence_links
    if payload.control_updates is not None:
        metadata_patch['control_updates'] = [update.dict(exclude_none=True) for update in payload.control_updates]

    updated_alert = alert_service.update_alert_status(
        alert_id,
        payload.status,
        metadata_patch=metadata_patch if metadata_patch else None,
        resolved_by=str(user_id) if payload.status == 'resolved' else None,
        notes=payload.notes,
        user_id=user_id,
        actor=f"User {user_id}",
        actions_taken=payload.actions_taken,
        evidence_links=payload.evidence_links,
        control_updates=control_updates_payload if control_updates_payload else None,
    )

    if not updated_alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Learn from this remediation event
    if payload.status == 'resolved':
        learning_service.learn_from_event(
            user_id=user_id,
            event_type='remediation_completed',
            event_source_type='alert',
            event_source_id=alert_id,
            event_data={
                'alert_type': updated_alert.get('alert_type'),
                'control_id': updated_alert.get('control_id'),
                'severity': updated_alert.get('severity'),
                'actions_taken': payload.actions_taken,
                'evidence_links': payload.evidence_links,
                'control_updates': control_updates_payload,
            },
            outcome='success',
            outcome_data={
                'resolution_time_minutes': None,  # Could calculate from alert creation
                'evidence_collected': len(payload.evidence_links or []),
                'controls_updated': len(payload.control_updates or []),
            }
        )

    await alert_ws_manager.broadcast_alert(updated_alert, 'alert.updated')
    detail_payload = alert_service.get_alert_detail(alert_id, user_id)
    return detail_payload or updated_alert

@app.get("/api/security-compliance-correlation")
async def get_security_compliance_correlation_endpoint(user_id: int = Header(..., alias="X-User-Id"), days: int = 30):
    """Get correlation metrics between security events and compliance scores"""
    correlation = get_security_compliance_correlation(user_id, days)
    return correlation


@app.get("/api/intelligence/priorities")
async def get_control_priorities_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
    limit: int = 20,
    control_id: Optional[str] = None,
):
    """
    Get AI-driven control priority insights.
    - Provide control_id to retrieve a single control's priority breakdown.
    - Otherwise returns the top controls (default limit 20, capped at 100).
    """
    if control_id:
        priority = intelligence_service.calculate_control_priority(user_id, control_id)
        if not priority:
            raise HTTPException(status_code=404, detail="Control not found")
        return priority

    limit = max(1, min(limit, 100))
    priorities = intelligence_service.calculate_priorities_for_user(user_id, limit)
    return {
        "user_id": user_id,
        "count": len(priorities),
        "results": priorities,
    }


@app.get("/api/intelligence/guidance")
async def get_control_guidance_endpoint(
    control_id: str,
    user_id: int = Header(..., alias="X-User-Id"),
):
    """
    Generate guided remediation insights for a control.
    Returns AI-powered recommendations, evidence reminders, and automation opportunities.
    """
    guidance = intelligence_service.generate_guidance_for_control(user_id, control_id)
    if not guidance:
        raise HTTPException(status_code=404, detail="Control not found")
    return guidance

# ============================================================================
# Pattern Detection & Trend Analysis Endpoints
# ============================================================================

@app.post("/api/patterns/detect")
async def detect_security_patterns(user_id: int = Header(..., alias="X-User-Id"), lookback_days: int = 30):
    """Detect security event patterns and save them"""
    from services.pattern_detector import detect_patterns, save_patterns
    
    try:
        patterns = detect_patterns(user_id, lookback_days)
        if patterns:
            save_patterns(user_id, patterns)
        
        return {
            "patterns_detected": len(patterns),
            "patterns": patterns
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pattern detection failed: {str(e)}")

@app.get("/api/patterns")
async def get_patterns_endpoint(user_id: int = Header(..., alias="X-User-Id"), status: Optional[str] = None):
    """Get all detected patterns"""
    from services.pattern_detector import get_patterns
    
    patterns = get_patterns(user_id, status)
    
    # Parse JSON fields
    for pattern in patterns:
        if pattern.get('pattern_signature'):
            try:
                pattern['pattern_signature'] = json.loads(pattern['pattern_signature'])
            except:
                pass
        if pattern.get('affected_frameworks'):
            try:
                pattern['affected_frameworks'] = json.loads(pattern['affected_frameworks'])
            except:
                pass
        if pattern.get('affected_controls'):
            try:
                pattern['affected_controls'] = json.loads(pattern['affected_controls'])
            except:
                pass
    
    return patterns

@app.get("/api/pattern-alerts")
async def get_pattern_alerts(user_id: int = Header(..., alias="X-User-Id"), acknowledged: Optional[bool] = None, limit: int = 50):
    """Get pattern alerts"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT pa.*, sp.pattern_name, sp.pattern_type FROM pattern_alerts pa JOIN security_event_patterns sp ON pa.pattern_id = sp.id WHERE pa.user_id = ?"
    params = [user_id]
    
    if acknowledged is not None:
        query += " AND pa.acknowledged = ?"
        params.append(1 if acknowledged else 0)
    
    query += " ORDER BY pa.created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    alerts = cursor.fetchall()
    
    # Parse JSON fields
    result = []
    for alert in alerts:
        alert_dict = dict(alert)
        if alert_dict.get('pattern_trend_data'):
            try:
                alert_dict['pattern_trend_data'] = json.loads(alert_dict['pattern_trend_data'])
            except:
                pass
        result.append(alert_dict)
    
    conn.close()
    return result

@app.post("/api/pattern-alerts/{alert_id}/acknowledge")
async def acknowledge_pattern_alert(alert_id: int, user_id: int = Header(..., alias="X-User-Id")):
    """Acknowledge a pattern alert"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify alert belongs to user
    cursor.execute("SELECT id FROM pattern_alerts WHERE id = ? AND user_id = ?", (alert_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Alert not found")
    
    cursor.execute("""
        UPDATE pattern_alerts
        SET acknowledged = 1, acknowledged_at = datetime('now'), acknowledged_by = ?
        WHERE id = ?
    """, (user_id, alert_id))
    
    conn.commit()
    conn.close()
    return {"message": "Alert acknowledged"}

@app.get("/api/patterns/trends")
async def get_pattern_trends_endpoint(user_id: int = Header(..., alias="X-User-Id"), lookback_days: int = 30):
    """Get pattern trend analysis"""
    from services.pattern_detector import get_pattern_trends
    
    trends = get_pattern_trends(user_id, lookback_days)
    return trends

# ============================================================================
# Real-Time Compliance & Unified Data Flow Endpoints
# ============================================================================

@app.get("/api/compliance/realtime/{framework}")
async def get_realtime_compliance_score(framework: str, user_id: int = Header(..., alias="X-User-Id")):
    """Get real-time compliance score for a framework"""
    from services.realtime_compliance_engine import calculate_realtime_compliance_score
    
    try:
        score_data = calculate_realtime_compliance_score(user_id, framework)
        return score_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate compliance score: {str(e)}")

@app.get("/api/compliance/framework-growth/{framework}")
async def get_framework_growth_metrics(framework: str, user_id: int = Header(..., alias="X-User-Id"), 
                                       period_days: int = 30):
    """Get framework growth metrics for dashboard"""
    from services.realtime_compliance_engine import get_framework_growth_metrics
    
    try:
        metrics = get_framework_growth_metrics(user_id, framework, period_days)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get growth metrics: {str(e)}")

@app.get("/api/compliance/all-frameworks-growth")
async def get_all_frameworks_growth(user_id: int = Header(..., alias="X-User-Id"), period_days: int = 30):
    """Get growth metrics for all frameworks"""
    from services.realtime_compliance_engine import get_all_frameworks_growth
    
    try:
        all_metrics = get_all_frameworks_growth(user_id, period_days)
        return all_metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get all frameworks growth: {str(e)}")

# ============================================================================
# Self-Learning Automation System Endpoints
# ============================================================================

@app.post("/api/learning/analyze")
async def run_learning_analysis(user_id: int = Header(..., alias="X-User-Id")):
    """Run learning cycle to discover patterns and generate playbooks"""
    try:
        results = learning_service.run_learning_cycle(user_id)
        return {
            "success": True,
            "results": results,
            "message": f"Discovered {results['patterns_discovered']} patterns and generated {results['playbooks_generated']} playbooks"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Learning analysis failed: {str(e)}")


@app.get("/api/learning/patterns")
async def get_learned_patterns(user_id: int = Header(..., alias="X-User-Id"), min_confidence: float = 0.3):
    """Get all learned remediation patterns"""
    try:
        patterns = learning_service.get_learned_patterns(user_id, min_confidence)
        return {
            "patterns": patterns,
            "count": len(patterns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get patterns: {str(e)}")


@app.get("/api/learning/playbooks")
async def get_auto_playbooks(user_id: int = Header(..., alias="X-User-Id"), status: Optional[str] = None):
    """Get auto-generated playbooks"""
    try:
        playbooks = learning_service.get_auto_playbooks(user_id, status)
        return {
            "playbooks": playbooks,
            "count": len(playbooks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get playbooks: {str(e)}")


@app.post("/api/learning/playbooks/{playbook_id}/approve")
async def approve_playbook(playbook_id: int, user_id: int = Header(..., alias="X-User-Id")):
    """Approve an auto-generated playbook for use"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE auto_generated_playbooks
        SET approval_status = 'approved',
            approved_by = ?,
            approved_at = CURRENT_TIMESTAMP,
            status = 'active'
        WHERE id = ? AND user_id = ?
    """, (user_id, playbook_id, user_id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Playbook approved"}


@app.get("/api/learning/data-value")
async def get_data_value_summary(user_id: int = Header(..., alias="X-User-Id")):
    """Get summary of how data is being used and its value"""
    try:
        summary = learning_service.get_data_value_summary(user_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get data value summary: {str(e)}")


@app.get("/api/learning/playbooks/match")
async def get_matching_playbooks(
    alert_id: Optional[int] = None,
    control_id: Optional[str] = None,
    user_id: int = Header(..., alias="X-User-Id")
):
    """Get playbooks that match an alert or control"""
    try:
        if alert_id:
            # Get alert data
            alert = alert_service.get_alert_detail(alert_id, user_id)
            if not alert:
                raise HTTPException(status_code=404, detail="Alert not found")
            playbooks = learning_service.find_matching_playbooks(user_id, alert)
        elif control_id:
            # Find patterns for control and get their playbooks
            patterns = learning_service.find_patterns_for_control(user_id, control_id)
            playbooks = []
            for pattern in patterns:
                if pattern.get('id'):
                    playbook = learning_service.generate_playbook_from_pattern(user_id, pattern['id'])
                    if playbook:
                        # Check if playbook already exists
                        existing = learning_service.get_auto_playbooks(user_id)
                        existing_ids = [p.get('source_pattern_id') for p in existing]
                        if pattern['id'] not in existing_ids:
                            playbooks.append(playbook)
        else:
            raise HTTPException(status_code=400, detail="Must provide alert_id or control_id")
        
        return {
            "playbooks": playbooks,
            "count": len(playbooks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find matching playbooks: {str(e)}")


@app.get("/api/learning/patterns/control/{control_id}")
async def get_control_patterns(control_id: str, user_id: int = Header(..., alias="X-User-Id")):
    """Get learned patterns for a specific control"""
    try:
        patterns = learning_service.find_patterns_for_control(user_id, control_id)
        return {
            "patterns": patterns,
            "count": len(patterns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get control patterns: {str(e)}")


@app.post("/api/learning/playbooks/{playbook_id}/execute")
async def execute_playbook(
    playbook_id: int,
    request: Request,
    user_id: int = Header(..., alias="X-User-Id")
):
    """Track playbook execution and update usage metrics"""
    try:
        body = await request.json()
        alert_id = body.get('alert_id')
    except:
        alert_id = None
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Update playbook usage count
        cursor.execute("""
            UPDATE auto_generated_playbooks
            SET usage_count = usage_count + 1,
                last_used = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        """, (playbook_id, user_id))
        
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Playbook not found")
        
        # Track data usage
        learning_service.track_data_usage(
            user_id=user_id,
            data_type='playbook',
            data_id=str(playbook_id),
            usage_type='remediation_execution',
            usage_context={'alert_id': alert_id} if alert_id else None,
            impact_metrics={'executions': 1}
        )
        
        # Learn from this execution
        if alert_id:
            learning_service.learn_from_event(
                user_id=user_id,
                event_type='playbook_executed',
                event_source_type='alert',
                event_source_id=alert_id,
                event_data={'playbook_id': playbook_id},
                outcome='success',
                outcome_data={'playbook_used': playbook_id}
            )
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Playbook execution tracked"}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to track playbook execution: {str(e)}")


@app.post("/api/alerts/check-drift")
async def check_compliance_drift(user_id: int = Header(..., alias="X-User-Id")):
    """Check all frameworks for compliance drift and generate alerts"""
    try:
        alerts = alert_service.check_and_generate_alerts(user_id)
        for alert_info in alerts:
            alert_payload = alert_info.get('alert')
            if alert_payload:
                await alert_ws_manager.broadcast_alert(alert_payload, 'alert.created')
        return {
            "alerts_generated": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check drift: {str(e)}")

@app.get("/api/alerts/actionable")
async def get_actionable_alerts_endpoint(user_id: int = Header(..., alias="X-User-Id"), limit: int = 50):
    """Get all actionable alerts with remediation guidance"""
    try:
        alerts = alert_service.get_actionable_alerts(user_id, limit)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get actionable alerts: {str(e)}")

# ==================== Workflow Automation Endpoints ====================

@app.get("/api/workflows/templates")
async def get_workflow_templates_endpoint():
    """Get available workflow templates"""
    try:
        templates = get_workflow_templates()
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workflow templates: {str(e)}")

@app.post("/api/workflows", response_model=Dict[str, Any])
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

@app.get("/api/workflows", response_model=List[Dict[str, Any]])
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

@app.get("/api/workflows/{workflow_id}", response_model=Dict[str, Any])
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

@app.put("/api/workflows/{workflow_id}", response_model=Dict[str, Any])
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

@app.delete("/api/workflows/{workflow_id}")
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

@app.post("/api/workflows/{workflow_id}/execute", response_model=Dict[str, Any])
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

@app.get("/api/workflows/{workflow_id}/executions", response_model=List[Dict[str, Any]])
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

@app.get("/api/workflows/analytics", response_model=Dict[str, Any])
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


@app.post("/api/intake/organizations")
async def create_client_organization_endpoint(
    data: ClientOrganizationCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/intake/organizations")
async def list_client_organizations_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
    intake_tier: Optional[int] = Query(None)
):
    """List all client organizations"""
    try:
        orgs = client_intake_service.list_client_organizations(user_id, intake_tier)
        return {"organizations": orgs, "count": len(orgs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list organizations: {str(e)}")


@app.get("/api/intake/organizations/{org_id}")
async def get_client_organization_endpoint(
    org_id: int,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.put("/api/intake/organizations/{org_id}/tier")
async def update_intake_tier_endpoint(
    org_id: int,
    new_tier: int = Query(...),
    user_id: int = Header(..., alias="X-User-Id")
):
    """Update client's intake tier (upgrade/downgrade)"""
    try:
        result = client_intake_service.update_client_intake_tier(org_id, user_id, new_tier)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update tier: {str(e)}")


@app.get("/api/intake/tier-recommendation")
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


@app.post("/api/intake/tier1/documents")
async def upload_document_endpoint(
    data: DocumentUpload,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/intake/tier1/documents")
async def list_documents_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
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


@app.post("/api/intake/tier1/documents/{doc_id}/map-controls")
async def map_document_to_controls_endpoint(
    doc_id: int,
    data: DocumentControlMapping,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/intake/tier1/questionnaires")
async def create_questionnaire_endpoint(
    data: QuestionnaireCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/intake/tier1/questionnaires/{questionnaire_id}/responses")
async def submit_questionnaire_response_endpoint(
    questionnaire_id: int,
    data: QuestionnaireResponse,
    user_id: int = Header(..., alias="X-User-Id")
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

@app.get("/api/intake/tier2/integrations/supported")
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


@app.post("/api/intake/tier2/integrations")
async def configure_api_integration_endpoint(
    data: APIIntegrationConfig,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/intake/tier2/integrations")
async def list_api_integrations_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
    client_org_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None)
):
    """List configured API integrations"""
    try:
        integrations = client_intake_service.get_api_integrations(user_id, client_org_id, status)
        return {"integrations": integrations, "count": len(integrations)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list integrations: {str(e)}")


@app.post("/api/intake/tier2/integrations/{integration_id}/sync")
async def trigger_api_sync_endpoint(
    integration_id: int,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/intake/tier3/exports")
async def configure_scheduled_export_endpoint(
    data: ScheduledExportConfig,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/intake/tier3/exports")
async def list_scheduled_exports_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
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


@app.post("/api/intake/tier3/exports/{config_id}/process")
async def process_scheduled_export_endpoint(
    config_id: int,
    data: ScheduledExportProcess,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/intake/tier4/continuous")
async def configure_continuous_ingestion_endpoint(
    data: ContinuousIngestionConfig,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/intake/tier4/continuous")
async def list_continuous_ingestion_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
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


@app.post("/api/intake/tier4/continuous/{config_id}/events")
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

@app.get("/api/intake/dashboard")
async def get_intake_dashboard_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
    client_org_id: Optional[int] = Query(None)
):
    """Get intake dashboard metrics across all tiers"""
    try:
        dashboard = client_intake_service.get_intake_dashboard(user_id, client_org_id)
        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")


@app.get("/api/intake/tiers-info")
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


@app.post("/api/consulting/engagements")
async def create_engagement_endpoint(
    data: EngagementCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/consulting/engagements")
async def list_engagements_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
    status: Optional[str] = Query(None),
    client_org_id: Optional[int] = Query(None)
):
    """List consulting engagements"""
    try:
        engagements = consulting_service.list_engagements(user_id, status, client_org_id)
        return {"engagements": engagements, "count": len(engagements)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list engagements: {str(e)}")


@app.get("/api/consulting/engagements/{engagement_id}")
async def get_engagement_endpoint(
    engagement_id: int,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.put("/api/consulting/engagements/{engagement_id}/status")
async def update_engagement_status_endpoint(
    engagement_id: int,
    status: str = Query(...),
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/engagements/{engagement_id}/time")
async def log_time_entry_endpoint(
    engagement_id: int,
    data: TimeEntryCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/assessment-templates")
async def create_assessment_template_endpoint(
    data: AssessmentTemplateCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/consulting/assessment-templates")
async def list_assessment_templates_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
    template_type: Optional[str] = Query(None)
):
    """List assessment templates"""
    try:
        templates = consulting_service.get_assessment_templates(user_id, template_type)
        return {"templates": templates, "count": len(templates)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {str(e)}")


@app.post("/api/consulting/assessment-templates/default")
async def create_default_template_endpoint(
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/assessments")
async def create_assessment_endpoint(
    data: AssessmentCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/assessments/{assessment_id}/submit")
async def submit_assessment_endpoint(
    assessment_id: int,
    data: AssessmentResponses,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/gaps")
async def create_gap_endpoint(
    data: GapCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/consulting/gaps")
async def list_gaps_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
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


@app.post("/api/consulting/roadmaps")
async def create_roadmap_endpoint(
    data: RoadmapCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/roadmaps/{roadmap_id}/phases")
async def add_roadmap_phase_endpoint(
    roadmap_id: int,
    data: RoadmapPhaseCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/roadmaps/{roadmap_id}/phases/{phase_id}/initiatives")
async def add_initiative_endpoint(
    roadmap_id: int,
    phase_id: int,
    data: InitiativeCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/consulting/roadmaps/{roadmap_id}")
async def get_roadmap_endpoint(
    roadmap_id: int,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/budgets")
async def create_budget_plan_endpoint(
    data: BudgetPlanCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/report-templates")
async def create_report_template_endpoint(
    data: ReportTemplateCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/reports/generate")
async def generate_report_endpoint(
    data: ReportGenerate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/msp/portfolios")
async def create_msp_portfolio_endpoint(
    data: MSPPortfolioCreate,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.post("/api/consulting/msp/portfolios/{portfolio_id}/clients")
async def add_client_to_portfolio_endpoint(
    portfolio_id: int,
    data: MSPClientAdd,
    user_id: int = Header(..., alias="X-User-Id")
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


@app.get("/api/consulting/msp/dashboard")
async def get_msp_dashboard_endpoint(
    user_id: int = Header(..., alias="X-User-Id"),
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


@app.put("/api/consulting/msp/clients/{client_summary_id}/metrics")
async def update_client_metrics_endpoint(
    client_summary_id: int,
    data: ClientMetricsUpdate,
    user_id: int = Header(..., alias="X-User-Id")
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

@app.get("/api/consulting/dashboard")
async def get_consulting_dashboard_endpoint(
    user_id: int = Header(..., alias="X-User-Id")
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


# ==================== Business Operations ====================

# Service Catalog
class ServiceCreate(BaseModel):
    service_name: str
    service_category: str
    pricing_model: str
    base_price: float
    description: Optional[str] = None
    hourly_rate: Optional[float] = None
    estimated_hours_min: Optional[float] = None
    estimated_hours_max: Optional[float] = None
    default_duration_weeks: Optional[int] = None
    deliverables: Optional[List[str]] = None
    frameworks_supported: Optional[List[str]] = None


@app.get("/api/business/services")
async def list_services_endpoint(
    category: Optional[str] = Query(None),
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Get service catalog"""
    try:
        services = business_ops_service.get_service_catalog(user_id, category)
        return services
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get services: {str(e)}")


@app.post("/api/business/services")
async def create_service_endpoint(
    data: ServiceCreate,
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Create a service in the catalog"""
    try:
        result = business_ops_service.create_service(
            user_id=user_id,
            service_name=data.service_name,
            service_category=data.service_category,
            pricing_model=data.pricing_model,
            base_price=data.base_price,
            description=data.description,
            hourly_rate=data.hourly_rate,
            estimated_hours_min=data.estimated_hours_min,
            estimated_hours_max=data.estimated_hours_max,
            default_duration_weeks=data.default_duration_weeks,
            deliverables=data.deliverables,
            frameworks_supported=data.frameworks_supported
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create service: {str(e)}")


@app.post("/api/business/services/seed")
async def seed_services_endpoint(user_id: int = Header(default=1, alias="X-User-Id")):
    """Seed default services for new users"""
    try:
        result = business_ops_service.seed_default_services(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed services: {str(e)}")


# Proposals
class ProposalCreate(BaseModel):
    proposal_name: str
    client_name: str
    services: List[Dict[str, Any]]
    client_org_id: Optional[int] = None
    client_contact_name: Optional[str] = None
    client_contact_email: Optional[str] = None
    client_industry: Optional[str] = None
    client_size: Optional[str] = None
    frameworks_in_scope: Optional[List[str]] = None
    discount_percent: float = 0
    proposed_start_date: Optional[str] = None
    proposed_duration_weeks: Optional[int] = None
    valid_days: int = 30
    executive_summary: Optional[str] = None
    payment_terms: str = 'net_30'


@app.get("/api/business/proposals")
async def list_proposals_endpoint(
    status: Optional[str] = Query(None),
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """List all proposals"""
    try:
        proposals = business_ops_service.list_proposals(user_id, status)
        return proposals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list proposals: {str(e)}")


@app.post("/api/business/proposals")
async def create_proposal_endpoint(
    data: ProposalCreate,
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Create a new proposal"""
    try:
        result = business_ops_service.create_proposal(
            user_id=user_id,
            proposal_name=data.proposal_name,
            client_name=data.client_name,
            services=data.services,
            client_org_id=data.client_org_id,
            client_contact_name=data.client_contact_name,
            client_contact_email=data.client_contact_email,
            client_industry=data.client_industry,
            client_size=data.client_size,
            frameworks_in_scope=data.frameworks_in_scope,
            discount_percent=data.discount_percent,
            proposed_start_date=data.proposed_start_date,
            proposed_duration_weeks=data.proposed_duration_weeks,
            valid_days=data.valid_days,
            executive_summary=data.executive_summary,
            payment_terms=data.payment_terms
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create proposal: {str(e)}")


@app.get("/api/business/proposals/{proposal_id}")
async def get_proposal_endpoint(
    proposal_id: int,
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Get proposal details"""
    try:
        proposal = business_ops_service.get_proposal(proposal_id, user_id)
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        return proposal
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get proposal: {str(e)}")


class ProposalStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


@app.put("/api/business/proposals/{proposal_id}/status")
async def update_proposal_status_endpoint(
    proposal_id: int,
    data: ProposalStatusUpdate,
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Update proposal status"""
    try:
        result = business_ops_service.update_proposal_status(proposal_id, user_id, data.status, data.notes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")


@app.post("/api/business/proposals/{proposal_id}/convert")
async def convert_proposal_endpoint(
    proposal_id: int,
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Convert accepted proposal to engagement"""
    try:
        result = business_ops_service.convert_proposal_to_engagement(proposal_id, user_id)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to convert proposal: {str(e)}")


# Onboarding Wizard
@app.post("/api/business/onboarding/start")
async def start_onboarding_endpoint(user_id: int = Header(default=1, alias="X-User-Id")):
    """Start a new client onboarding session"""
    try:
        result = business_ops_service.start_onboarding_session(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start onboarding: {str(e)}")


class OnboardingStepData(BaseModel):
    data: Dict[str, Any] = {}


@app.put("/api/business/onboarding/{session_token}/step/{step}")
async def update_onboarding_step_endpoint(
    session_token: str,
    step: int,
    body: Dict[str, Any] = Body(...),
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Update onboarding session step"""
    try:
        result = business_ops_service.update_onboarding_step(session_token, user_id, step, body)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update step: {str(e)}")


@app.get("/api/business/onboarding/{session_token}")
async def get_onboarding_session_endpoint(
    session_token: str,
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Get onboarding session details"""
    try:
        session = business_ops_service.get_onboarding_session(session_token, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")


class OnboardingComplete(BaseModel):
    create_proposal: bool = True


@app.post("/api/business/onboarding/{session_token}/complete")
async def complete_onboarding_endpoint(
    session_token: str,
    data: OnboardingComplete,
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Complete onboarding and create client/engagement/proposal"""
    try:
        result = business_ops_service.complete_onboarding(session_token, user_id, data.create_proposal)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete onboarding: {str(e)}")


# Industry Templates
@app.get("/api/business/templates/assessments")
async def list_industry_templates_endpoint(
    industry: Optional[str] = Query(None),
    user_id: int = Header(default=1, alias="X-User-Id")
):
    """Get industry assessment templates"""
    try:
        templates = business_ops_service.get_industry_templates(user_id, industry)
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get templates: {str(e)}")


@app.post("/api/business/templates/assessments/seed")
async def seed_industry_templates_endpoint(user_id: int = Header(default=1, alias="X-User-Id")):
    """Seed industry assessment templates"""
    try:
        result = business_ops_service.seed_industry_templates(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed templates: {str(e)}")


# Pipeline Dashboard
@app.get("/api/business/pipeline/dashboard")
async def get_pipeline_dashboard_endpoint(user_id: int = Header(default=1, alias="X-User-Id")):
    """Get pipeline dashboard with metrics"""
    try:
        dashboard = business_ops_service.get_pipeline_dashboard(user_id)
        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")


@app.post("/api/business/pipeline/stages/seed")
async def seed_pipeline_stages_endpoint(user_id: int = Header(default=1, alias="X-User-Id")):
    """Seed default pipeline stages"""
    try:
        result = business_ops_service.seed_pipeline_stages(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed stages: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

