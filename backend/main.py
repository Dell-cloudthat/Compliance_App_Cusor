"""
FastAPI Backend for Compliance Automation Platform
Handles data segmentation, metadata tagging, PII/CUI filtering, and cost tracking
"""

import asyncio

from fastapi import FastAPI, HTTPException, Depends, Header, Request, WebSocket, WebSocketDisconnect, Query
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

# Database setup
DB_PATH = Path(__file__).parent / "database" / "compliance.db"
SCHEMA_PATH = Path(__file__).parent / "database" / "schema.sql"

app = FastAPI(title="Compliance Platform API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

