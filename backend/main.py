"""
FastAPI Backend for Compliance Automation Platform
Handles data segmentation, metadata tagging, PII/CUI filtering, and cost tracking
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import sqlite3
import json
import hashlib
import os
from pathlib import Path

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

# Helper: Get database connection
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

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
    if not cursor.fetchone():
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

