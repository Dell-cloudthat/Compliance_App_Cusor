"""
Client Intake Service - Tiered Data Ingestion for Compliance Platform

This service manages the 4-tier client intake system:
- Tier 1: Manual/Document-Based Intake (Foundation)
- Tier 2: Read-Only API Integrations (Acceleration)
- Tier 3: Scheduled Exports (Bridge Model)
- Tier 4: Continuous Ingestion (Productized SaaS)
"""

import sqlite3
import json
import hashlib
import os
import csv
import io
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path
import base64
import re

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"
SCHEMA_PATH = Path(__file__).parent.parent / "database" / "client_intake_schema.sql"
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"


def get_db():
    """Get database connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_client_intake_tables():
    """Initialize client intake tables from schema."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        with open(SCHEMA_PATH, 'r') as f:
            schema = f.read()
            cursor.executescript(schema)
        conn.commit()
        print("Client intake tables initialized successfully")
    except sqlite3.OperationalError as e:
        if "already exists" not in str(e).lower():
            print(f"Schema execution warning: {e}")
        conn.commit()
    finally:
        conn.close()


# ============================================================================
# Client Organization Management
# ============================================================================

def create_client_organization(
    user_id: int,
    organization_name: str,
    organization_type: str = 'SMB',
    industry_vertical: Optional[str] = None,
    compliance_frameworks: Optional[List[str]] = None,
    intake_tier: int = 1,
    contact_name: Optional[str] = None,
    contact_email: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new client organization."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO client_organizations (
                user_id, organization_name, organization_type, industry_vertical,
                compliance_frameworks, intake_tier, contact_name, contact_email,
                billing_status, onboarding_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'pending')
        """, (
            user_id, organization_name, organization_type, industry_vertical,
            json.dumps(compliance_frameworks or []), intake_tier,
            contact_name, contact_email
        ))
        conn.commit()
        
        org_id = cursor.lastrowid
        return {
            "id": org_id,
            "organization_name": organization_name,
            "organization_type": organization_type,
            "intake_tier": intake_tier,
            "onboarding_status": "pending",
            "message": "Client organization created successfully"
        }
    finally:
        conn.close()


def get_client_organization(org_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """Get a client organization by ID."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM client_organizations WHERE id = ? AND user_id = ?
        """, (org_id, user_id))
        row = cursor.fetchone()
        
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def list_client_organizations(user_id: int, intake_tier: Optional[int] = None) -> List[Dict[str, Any]]:
    """List all client organizations for a user."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        if intake_tier:
            cursor.execute("""
                SELECT * FROM client_organizations 
                WHERE user_id = ? AND intake_tier = ?
                ORDER BY created_at DESC
            """, (user_id, intake_tier))
        else:
            cursor.execute("""
                SELECT * FROM client_organizations 
                WHERE user_id = ?
                ORDER BY created_at DESC
            """, (user_id,))
        
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def update_client_intake_tier(org_id: int, user_id: int, new_tier: int) -> Dict[str, Any]:
    """Upgrade/downgrade client's intake tier."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE client_organizations 
            SET intake_tier = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        """, (new_tier, org_id, user_id))
        conn.commit()
        
        return {
            "success": True,
            "org_id": org_id,
            "new_tier": new_tier,
            "message": f"Intake tier updated to Tier {new_tier}"
        }
    finally:
        conn.close()


# ============================================================================
# TIER 1: Manual/Document-Based Intake
# ============================================================================

def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA-256 hash of file content."""
    return hashlib.sha256(content).hexdigest()


def detect_pii_in_text(text: str) -> Tuple[bool, List[str]]:
    """Simple PII detection in text content."""
    pii_patterns = {
        'SSN': r'\b\d{3}-\d{2}-\d{4}\b',
        'Email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'Phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        'Credit_Card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        'IP_Address': r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
    }
    
    detected_types = []
    for pii_type, pattern in pii_patterns.items():
        if re.search(pattern, text, re.IGNORECASE):
            detected_types.append(pii_type)
    
    return len(detected_types) > 0, detected_types


def parse_csv_content(content: str) -> Dict[str, Any]:
    """Parse CSV content and extract structured data."""
    try:
        reader = csv.DictReader(io.StringIO(content))
        rows = list(reader)
        headers = reader.fieldnames or []
        
        # Analyze content
        has_pii, pii_types = detect_pii_in_text(content)
        
        return {
            "success": True,
            "row_count": len(rows),
            "headers": headers,
            "sample_data": rows[:5] if rows else [],
            "contains_pii": has_pii,
            "pii_types": pii_types,
            "data_categories": _infer_data_categories(headers)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def _infer_data_categories(headers: List[str]) -> List[str]:
    """Infer data categories from column headers."""
    categories = set()
    header_lower = [h.lower() for h in headers]
    
    category_keywords = {
        'asset_inventory': ['hostname', 'asset', 'device', 'ip', 'mac', 'serial'],
        'user_accounts': ['user', 'username', 'email', 'employee', 'account', 'role'],
        'security_controls': ['control', 'policy', 'rule', 'security', 'compliance'],
        'configurations': ['config', 'setting', 'parameter', 'option', 'enabled'],
        'vulnerabilities': ['vulnerability', 'cve', 'risk', 'severity', 'patch'],
        'access_logs': ['login', 'access', 'timestamp', 'event', 'action']
    }
    
    for category, keywords in category_keywords.items():
        for header in header_lower:
            if any(kw in header for kw in keywords):
                categories.add(category)
                break
    
    return list(categories) if categories else ['general']


def upload_document(
    user_id: int,
    document_type: str,
    document_name: str,
    original_filename: str,
    file_content: bytes,
    mime_type: str,
    client_org_id: Optional[int] = None,
    metadata_tags: Optional[List[str]] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Upload and process a document for Tier 1 intake."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Calculate file hash
        file_hash = calculate_file_hash(file_content)
        file_size = len(file_content)
        
        # Create upload directory if it doesn't exist
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save file with hash-based name for deduplication
        file_ext = Path(original_filename).suffix
        file_path = UPLOAD_DIR / f"{file_hash}{file_ext}"
        
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Initial parsing based on document type
        parsed_data = {}
        parsing_status = 'pending'
        contains_pii = False
        pii_types = []
        
        if document_type == 'CSV':
            try:
                content = file_content.decode('utf-8')
                parsed_data = parse_csv_content(content)
                parsing_status = 'completed' if parsed_data.get('success') else 'failed'
                contains_pii = parsed_data.get('contains_pii', False)
                pii_types = parsed_data.get('pii_types', [])
            except Exception as e:
                parsing_status = 'failed'
                parsed_data = {"error": str(e)}
        elif document_type in ['PDF', 'ARCHITECTURE_DIAGRAM', 'SCREENSHOT']:
            parsing_status = 'manual_review'
            parsed_data = {"message": "Document requires manual review"}
        
        # Insert document record
        cursor.execute("""
            INSERT INTO intake_documents (
                user_id, client_org_id, document_type, document_name,
                original_filename, file_path, file_size_bytes, file_hash,
                mime_type, uploaded_by, parsing_status, parsed_data,
                metadata_tags, contains_pii, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, client_org_id, document_type, document_name,
            original_filename, str(file_path), file_size, file_hash,
            mime_type, user_id, parsing_status, json.dumps(parsed_data),
            json.dumps(metadata_tags or []), contains_pii, notes
        ))
        conn.commit()
        
        doc_id = cursor.lastrowid
        
        return {
            "id": doc_id,
            "document_name": document_name,
            "document_type": document_type,
            "file_size_bytes": file_size,
            "file_hash": file_hash,
            "parsing_status": parsing_status,
            "parsed_data": parsed_data,
            "contains_pii": contains_pii,
            "pii_types": pii_types,
            "message": "Document uploaded successfully"
        }
    finally:
        conn.close()


def get_intake_documents(
    user_id: int,
    client_org_id: Optional[int] = None,
    document_type: Optional[str] = None,
    parsing_status: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Get list of uploaded documents."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM intake_documents WHERE user_id = ?"
        params = [user_id]
        
        if client_org_id:
            query += " AND client_org_id = ?"
            params.append(client_org_id)
        
        if document_type:
            query += " AND document_type = ?"
            params.append(document_type)
        
        if parsing_status:
            query += " AND parsing_status = ?"
            params.append(parsing_status)
        
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        documents = []
        for row in rows:
            doc = dict(row)
            doc['parsed_data'] = json.loads(doc['parsed_data']) if doc['parsed_data'] else {}
            doc['metadata_tags'] = json.loads(doc['metadata_tags']) if doc['metadata_tags'] else []
            doc['mapped_controls'] = json.loads(doc['mapped_controls']) if doc['mapped_controls'] else []
            documents.append(doc)
        
        return documents
    finally:
        conn.close()


def map_document_to_controls(
    doc_id: int,
    user_id: int,
    control_mappings: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Map a document's data to compliance controls."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get the document
        cursor.execute("""
            SELECT * FROM intake_documents WHERE id = ? AND user_id = ?
        """, (doc_id, user_id))
        doc = cursor.fetchone()
        
        if not doc:
            return {"error": "Document not found"}
        
        doc = dict(doc)
        control_ids = [m.get('control_id') for m in control_mappings]
        
        # Update document with control mappings
        cursor.execute("""
            UPDATE intake_documents 
            SET mapped_controls = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (json.dumps(control_ids), doc_id))
        
        # Create parsed data mappings
        parsed_data = json.loads(doc['parsed_data']) if doc['parsed_data'] else {}
        
        cursor.execute("""
            INSERT INTO parsed_data_mappings (
                user_id, client_org_id, source_document_id, source_type,
                data_category, extracted_data, control_mappings, auto_mapped
            ) VALUES (?, ?, ?, 'document', ?, ?, ?, 0)
        """, (
            user_id, doc['client_org_id'], doc_id,
            parsed_data.get('data_categories', ['general'])[0] if parsed_data.get('data_categories') else 'general',
            json.dumps(parsed_data),
            json.dumps(control_mappings)
        ))
        
        conn.commit()
        
        return {
            "success": True,
            "doc_id": doc_id,
            "controls_mapped": len(control_ids),
            "control_ids": control_ids,
            "message": "Document mapped to controls successfully"
        }
    finally:
        conn.close()


# ============================================================================
# Questionnaire Management (Tier 1)
# ============================================================================

def create_questionnaire_template(
    user_id: int,
    questionnaire_name: str,
    questionnaire_type: str,
    target_frameworks: List[str],
    questions: List[Dict[str, Any]],
    scoring_model: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a questionnaire template."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO intake_questionnaires (
                user_id, questionnaire_name, questionnaire_type,
                target_frameworks, questions_json, scoring_model,
                is_template, status
            ) VALUES (?, ?, ?, ?, ?, ?, 1, 'active')
        """, (
            user_id, questionnaire_name, questionnaire_type,
            json.dumps(target_frameworks), json.dumps(questions),
            json.dumps(scoring_model or {})
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "questionnaire_name": questionnaire_name,
            "question_count": len(questions),
            "message": "Questionnaire template created successfully"
        }
    finally:
        conn.close()


def submit_questionnaire_response(
    questionnaire_id: int,
    user_id: int,
    responses: Dict[str, Any],
    client_org_id: Optional[int] = None,
    respondent_name: Optional[str] = None,
    respondent_email: Optional[str] = None
) -> Dict[str, Any]:
    """Submit responses to a questionnaire."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get questionnaire template
        cursor.execute("""
            SELECT * FROM intake_questionnaires WHERE id = ?
        """, (questionnaire_id,))
        template = cursor.fetchone()
        
        if not template:
            return {"error": "Questionnaire not found"}
        
        template = dict(template)
        questions = json.loads(template['questions_json'])
        scoring_model = json.loads(template['scoring_model']) if template['scoring_model'] else {}
        
        # Calculate score
        calculated_score = _calculate_questionnaire_score(questions, responses, scoring_model)
        
        # Perform gap analysis
        gap_analysis = _analyze_questionnaire_gaps(questions, responses)
        
        # Map to controls
        control_mappings = _map_responses_to_controls(questions, responses)
        
        cursor.execute("""
            INSERT INTO questionnaire_responses (
                questionnaire_id, client_org_id, user_id,
                respondent_name, respondent_email, responses_json,
                calculated_score, gap_analysis, mapped_controls,
                completion_status, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
        """, (
            questionnaire_id, client_org_id, user_id,
            respondent_name, respondent_email, json.dumps(responses),
            calculated_score, json.dumps(gap_analysis), json.dumps(control_mappings)
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "calculated_score": calculated_score,
            "gap_analysis": gap_analysis,
            "control_mappings": control_mappings,
            "message": "Questionnaire response submitted successfully"
        }
    finally:
        conn.close()


def _calculate_questionnaire_score(
    questions: List[Dict],
    responses: Dict[str, Any],
    scoring_model: Dict[str, Any]
) -> int:
    """Calculate questionnaire score based on responses."""
    if not questions or not responses:
        return 0
    
    total_points = 0
    earned_points = 0
    
    for q in questions:
        q_id = q.get('id', '')
        q_weight = q.get('weight', 1)
        answer = responses.get(q_id)
        
        if answer is not None:
            total_points += q_weight
            
            # Simple scoring: True/Yes answers earn points
            if answer in [True, 'yes', 'Yes', 'YES', 'implemented', 'Implemented']:
                earned_points += q_weight
            elif answer in ['partial', 'Partial', 'in_progress']:
                earned_points += q_weight * 0.5
    
    if total_points == 0:
        return 0
    
    return int((earned_points / total_points) * 100)


def _analyze_questionnaire_gaps(
    questions: List[Dict],
    responses: Dict[str, Any]
) -> Dict[str, Any]:
    """Analyze gaps based on questionnaire responses."""
    gaps = []
    recommendations = []
    
    for q in questions:
        q_id = q.get('id', '')
        answer = responses.get(q_id)
        
        if answer in [False, 'no', 'No', 'NO', 'not_implemented', None]:
            gaps.append({
                "question_id": q_id,
                "question_text": q.get('text', ''),
                "control_id": q.get('control_id'),
                "severity": q.get('severity', 'medium'),
                "recommendation": q.get('recommendation', 'Implementation required')
            })
            
            if q.get('recommendation'):
                recommendations.append(q.get('recommendation'))
    
    return {
        "total_gaps": len(gaps),
        "gaps": gaps,
        "recommendations": recommendations,
        "risk_level": "high" if len(gaps) > 10 else "medium" if len(gaps) > 5 else "low"
    }


def _map_responses_to_controls(
    questions: List[Dict],
    responses: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Map questionnaire responses to compliance controls."""
    mappings = []
    
    for q in questions:
        q_id = q.get('id', '')
        control_id = q.get('control_id')
        
        if control_id:
            answer = responses.get(q_id)
            status = 'implemented' if answer in [True, 'yes', 'implemented'] else \
                     'partial' if answer in ['partial', 'in_progress'] else 'not_implemented'
            
            mappings.append({
                "control_id": control_id,
                "status": status,
                "evidence_source": "questionnaire",
                "question_id": q_id
            })
    
    return mappings


# ============================================================================
# TIER 2: Read-Only API Integrations
# ============================================================================

SUPPORTED_INTEGRATIONS = {
    'microsoft_365': {
        'name': 'Microsoft 365',
        'vendor': 'Microsoft',
        'auth_types': ['oauth2'],
        'scopes': ['Directory.Read.All', 'SecurityEvents.Read.All', 'Reports.Read.All'],
        'data_categories': ['identity', 'security_posture', 'config_state'],
        'controls_coverage': ['AC-2', 'AC-3', 'IA-2', 'IA-5', 'AU-6']
    },
    'azure': {
        'name': 'Azure Security',
        'vendor': 'Microsoft',
        'auth_types': ['client_credentials', 'oauth2'],
        'scopes': ['https://management.azure.com/.default'],
        'data_categories': ['cloud_security', 'config_state', 'compliance'],
        'controls_coverage': ['SC-7', 'SC-8', 'CM-6', 'CM-7', 'AC-4']
    },
    'aws': {
        'name': 'AWS Security Hub',
        'vendor': 'Amazon',
        'auth_types': ['api_key', 'iam_role'],
        'scopes': [],
        'data_categories': ['cloud_security', 'compliance', 'vulnerabilities'],
        'controls_coverage': ['SC-7', 'SC-8', 'RA-5', 'CM-6', 'SI-4']
    },
    'crowdstrike': {
        'name': 'CrowdStrike Falcon',
        'vendor': 'CrowdStrike',
        'auth_types': ['oauth2', 'api_key'],
        'scopes': ['read'],
        'data_categories': ['endpoint_security', 'threat_detection', 'coverage'],
        'controls_coverage': ['SI-3', 'SI-4', 'IR-4', 'IR-5', 'SC-7']
    },
    'splunk': {
        'name': 'Splunk SIEM',
        'vendor': 'Splunk',
        'auth_types': ['bearer_token', 'api_key'],
        'scopes': ['search'],
        'data_categories': ['alert_summaries', 'security_events', 'audit_logs'],
        'controls_coverage': ['AU-6', 'AU-7', 'SI-4', 'IR-4', 'IR-5']
    },
    'qualys': {
        'name': 'Qualys Vulnerability Scanner',
        'vendor': 'Qualys',
        'auth_types': ['api_key', 'oauth2'],
        'scopes': ['read'],
        'data_categories': ['vulnerabilities', 'compliance', 'asset_inventory'],
        'controls_coverage': ['RA-5', 'SI-2', 'CM-8', 'CM-6', 'SC-7']
    }
}


def get_supported_integrations() -> Dict[str, Any]:
    """Get list of supported API integrations."""
    return SUPPORTED_INTEGRATIONS


def configure_api_integration(
    user_id: int,
    integration_type: str,
    integration_name: str,
    auth_type: str,
    credentials: Dict[str, Any],
    client_org_id: Optional[int] = None,
    sync_frequency: str = 'daily',
    data_categories: Optional[List[str]] = None,
    resource_filters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Configure a new read-only API integration."""
    
    if integration_type not in SUPPORTED_INTEGRATIONS:
        return {"error": f"Unsupported integration type: {integration_type}"}
    
    integration_info = SUPPORTED_INTEGRATIONS[integration_type]
    
    if auth_type not in integration_info['auth_types']:
        return {"error": f"Invalid auth type for {integration_type}. Supported: {integration_info['auth_types']}"}
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Encrypt credentials (in production, use proper encryption)
        credentials_encrypted = base64.b64encode(json.dumps(credentials).encode()).decode()
        
        # Set token expiration (if applicable)
        token_expires = datetime.now() + timedelta(hours=1) if auth_type in ['oauth2', 'bearer_token'] else None
        
        cursor.execute("""
            INSERT INTO api_integration_configs (
                user_id, client_org_id, integration_name, integration_type,
                vendor, auth_type, credentials_encrypted, scopes,
                data_categories, resource_filters, sync_frequency,
                mapped_controls, status, enabled
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_auth', 1)
        """, (
            user_id, client_org_id, integration_name, integration_type,
            integration_info['vendor'], auth_type, credentials_encrypted,
            json.dumps(integration_info['scopes']),
            json.dumps(data_categories or integration_info['data_categories']),
            json.dumps(resource_filters or {}), sync_frequency,
            json.dumps(integration_info['controls_coverage'])
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "integration_name": integration_name,
            "integration_type": integration_type,
            "vendor": integration_info['vendor'],
            "status": "pending_auth",
            "sync_frequency": sync_frequency,
            "controls_coverage": integration_info['controls_coverage'],
            "message": "API integration configured successfully. Authentication required."
        }
    finally:
        conn.close()


def get_api_integrations(
    user_id: int,
    client_org_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get list of configured API integrations."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM api_integration_configs WHERE user_id = ?"
        params = [user_id]
        
        if client_org_id:
            query += " AND client_org_id = ?"
            params.append(client_org_id)
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        integrations = []
        for row in rows:
            integration = dict(row)
            # Don't expose credentials
            integration.pop('credentials_encrypted', None)
            integration['scopes'] = json.loads(integration['scopes']) if integration['scopes'] else []
            integration['data_categories'] = json.loads(integration['data_categories']) if integration['data_categories'] else []
            integration['mapped_controls'] = json.loads(integration['mapped_controls']) if integration['mapped_controls'] else []
            integrations.append(integration)
        
        return integrations
    finally:
        conn.close()


def trigger_api_sync(
    integration_id: int,
    user_id: int
) -> Dict[str, Any]:
    """Trigger a sync for an API integration."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get integration config
        cursor.execute("""
            SELECT * FROM api_integration_configs WHERE id = ? AND user_id = ?
        """, (integration_id, user_id))
        integration = cursor.fetchone()
        
        if not integration:
            return {"error": "Integration not found"}
        
        integration = dict(integration)
        
        if integration['status'] not in ['active', 'pending_auth']:
            return {"error": f"Cannot sync integration with status: {integration['status']}"}
        
        # Create sync log entry
        cursor.execute("""
            INSERT INTO api_integration_sync_logs (
                integration_id, sync_started_at, sync_status
            ) VALUES (?, CURRENT_TIMESTAMP, 'started')
        """, (integration_id,))
        sync_log_id = cursor.lastrowid
        
        # Simulate sync (in production, this would call the actual API)
        simulated_data = _simulate_api_sync(integration['integration_type'])
        
        # Update sync log
        cursor.execute("""
            UPDATE api_integration_sync_logs 
            SET sync_completed_at = CURRENT_TIMESTAMP,
                sync_status = 'completed',
                records_fetched = ?,
                records_processed = ?,
                data_categories_synced = ?
            WHERE id = ?
        """, (
            simulated_data['records_fetched'],
            simulated_data['records_processed'],
            json.dumps(simulated_data['categories']),
            sync_log_id
        ))
        
        # Store ingested data summary
        for category, data in simulated_data['data'].items():
            cursor.execute("""
                INSERT INTO api_ingested_data (
                    integration_id, user_id, client_org_id,
                    data_type, data_category, summary_data,
                    metrics, compliance_relevant, data_timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
            """, (
                integration_id, user_id, integration['client_org_id'],
                data['type'], category, json.dumps(data['summary']),
                json.dumps(data['metrics'])
            ))
        
        # Update integration last sync
        cursor.execute("""
            UPDATE api_integration_configs 
            SET last_sync_at = CURRENT_TIMESTAMP,
                sync_status = 'active',
                status = 'active'
            WHERE id = ?
        """, (integration_id,))
        
        conn.commit()
        
        return {
            "success": True,
            "integration_id": integration_id,
            "sync_log_id": sync_log_id,
            "records_fetched": simulated_data['records_fetched'],
            "records_processed": simulated_data['records_processed'],
            "categories_synced": simulated_data['categories'],
            "message": "API sync completed successfully"
        }
    finally:
        conn.close()


def _simulate_api_sync(integration_type: str) -> Dict[str, Any]:
    """Simulate API data fetch (for demo purposes)."""
    simulations = {
        'microsoft_365': {
            'records_fetched': 150,
            'records_processed': 148,
            'categories': ['identity', 'security_posture'],
            'data': {
                'identity': {
                    'type': 'security_posture',
                    'summary': {
                        'total_users': 127,
                        'mfa_enabled': 115,
                        'mfa_percentage': 90.5,
                        'admin_accounts': 8,
                        'guest_users': 12,
                        'inactive_30_days': 5
                    },
                    'metrics': {
                        'mfa_coverage': 90.5,
                        'privileged_access_review': 'compliant',
                        'password_policy_compliant': True
                    }
                },
                'security_posture': {
                    'type': 'config_state',
                    'summary': {
                        'secure_score': 78,
                        'security_defaults_enabled': True,
                        'conditional_access_policies': 12,
                        'dlp_policies_active': 5
                    },
                    'metrics': {
                        'secure_score': 78,
                        'improvement_actions': 15,
                        'critical_actions': 2
                    }
                }
            }
        },
        'crowdstrike': {
            'records_fetched': 245,
            'records_processed': 243,
            'categories': ['endpoint_security', 'coverage'],
            'data': {
                'endpoint_security': {
                    'type': 'coverage_report',
                    'summary': {
                        'total_endpoints': 189,
                        'sensors_active': 185,
                        'sensors_offline': 4,
                        'coverage_percentage': 97.9
                    },
                    'metrics': {
                        'endpoint_coverage': 97.9,
                        'prevention_mode': 'enabled',
                        'real_time_response': True
                    }
                },
                'coverage': {
                    'type': 'alert_summary',
                    'summary': {
                        'critical_detections_30d': 2,
                        'high_detections_30d': 8,
                        'medium_detections_30d': 23,
                        'resolved_percentage': 95.0
                    },
                    'metrics': {
                        'detection_count': 33,
                        'resolution_rate': 95.0,
                        'avg_resolution_hours': 4.2
                    }
                }
            }
        }
    }
    
    return simulations.get(integration_type, {
        'records_fetched': 100,
        'records_processed': 100,
        'categories': ['general'],
        'data': {
            'general': {
                'type': 'config_state',
                'summary': {'status': 'connected', 'data_available': True},
                'metrics': {'connection_status': 'healthy'}
            }
        }
    })


# ============================================================================
# TIER 3: Scheduled Exports
# ============================================================================

def configure_scheduled_export(
    user_id: int,
    export_name: str,
    export_type: str,
    source_system: str,
    schedule_frequency: str,
    delivery_method: str,
    expected_format: str,
    delivery_config: Optional[Dict[str, Any]] = None,
    expected_columns: Optional[List[str]] = None,
    client_org_id: Optional[int] = None,
    schedule_day_of_week: Optional[int] = None,
    schedule_day_of_month: Optional[int] = None,
    schedule_time: str = '00:00'
) -> Dict[str, Any]:
    """Configure a scheduled export ingestion."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Calculate next expected delivery
        next_expected = _calculate_next_expected(
            schedule_frequency, schedule_day_of_week,
            schedule_day_of_month, schedule_time
        )
        
        cursor.execute("""
            INSERT INTO scheduled_export_configs (
                user_id, client_org_id, export_name, export_type,
                source_system, schedule_frequency, schedule_day_of_week,
                schedule_day_of_month, schedule_time, delivery_method,
                delivery_config, expected_format, expected_columns,
                next_expected_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        """, (
            user_id, client_org_id, export_name, export_type,
            source_system, schedule_frequency, schedule_day_of_week,
            schedule_day_of_month, schedule_time, delivery_method,
            json.dumps(delivery_config or {}), expected_format,
            json.dumps(expected_columns or []), next_expected
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "export_name": export_name,
            "schedule_frequency": schedule_frequency,
            "delivery_method": delivery_method,
            "next_expected_at": next_expected,
            "message": "Scheduled export configured successfully"
        }
    finally:
        conn.close()


def _calculate_next_expected(
    frequency: str,
    day_of_week: Optional[int],
    day_of_month: Optional[int],
    time_str: str
) -> str:
    """Calculate next expected delivery time."""
    now = datetime.now()
    
    if frequency == 'daily':
        next_date = now + timedelta(days=1)
    elif frequency == 'weekly' and day_of_week is not None:
        days_ahead = day_of_week - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_date = now + timedelta(days=days_ahead)
    elif frequency == 'monthly' and day_of_month is not None:
        next_month = now.month + 1 if now.day >= day_of_month else now.month
        next_year = now.year + 1 if next_month > 12 else now.year
        next_month = 1 if next_month > 12 else next_month
        next_date = datetime(next_year, next_month, min(day_of_month, 28))
    else:
        next_date = now + timedelta(days=1)
    
    return next_date.strftime('%Y-%m-%d') + f' {time_str}'


def get_scheduled_exports(
    user_id: int,
    client_org_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get list of scheduled export configurations."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM scheduled_export_configs WHERE user_id = ?"
        params = [user_id]
        
        if client_org_id:
            query += " AND client_org_id = ?"
            params.append(client_org_id)
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        exports = []
        for row in rows:
            export = dict(row)
            export['delivery_config'] = json.loads(export['delivery_config']) if export['delivery_config'] else {}
            export['expected_columns'] = json.loads(export['expected_columns']) if export['expected_columns'] else []
            export['mapped_controls'] = json.loads(export['mapped_controls']) if export['mapped_controls'] else []
            exports.append(export)
        
        return exports
    finally:
        conn.close()


def process_scheduled_export(
    config_id: int,
    user_id: int,
    filename: str,
    file_content: bytes,
    received_via: str = 'manual'
) -> Dict[str, Any]:
    """Process a received scheduled export file."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get export config
        cursor.execute("""
            SELECT * FROM scheduled_export_configs WHERE id = ? AND user_id = ?
        """, (config_id, user_id))
        config = cursor.fetchone()
        
        if not config:
            return {"error": "Export configuration not found"}
        
        config = dict(config)
        
        # Calculate file hash
        file_hash = calculate_file_hash(file_content)
        file_size = len(file_content)
        
        # Save file
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        file_path = UPLOAD_DIR / f"export_{config_id}_{file_hash}"
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Create instance record
        cursor.execute("""
            INSERT INTO scheduled_export_instances (
                config_id, user_id, filename, file_path,
                file_size_bytes, file_hash, received_via,
                processing_status, processing_started_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', CURRENT_TIMESTAMP)
        """, (
            config_id, user_id, filename, str(file_path),
            file_size, file_hash, received_via
        ))
        instance_id = cursor.lastrowid
        
        # Process the file
        processing_result = _process_export_file(
            file_content, config['expected_format'],
            json.loads(config['expected_columns']) if config['expected_columns'] else []
        )
        
        # Update instance with results
        cursor.execute("""
            UPDATE scheduled_export_instances 
            SET processing_completed_at = CURRENT_TIMESTAMP,
                processing_status = ?,
                records_total = ?,
                records_processed = ?,
                records_failed = ?,
                processing_errors = ?,
                parsed_summary = ?
            WHERE id = ?
        """, (
            'completed' if processing_result['success'] else 'failed',
            processing_result.get('records_total', 0),
            processing_result.get('records_processed', 0),
            processing_result.get('records_failed', 0),
            json.dumps(processing_result.get('errors', [])),
            json.dumps(processing_result.get('summary', {})),
            instance_id
        ))
        
        # Update config last received
        cursor.execute("""
            UPDATE scheduled_export_configs 
            SET last_received_at = CURRENT_TIMESTAMP,
                last_processed_at = CURRENT_TIMESTAMP,
                missed_count = 0
            WHERE id = ?
        """, (config_id,))
        
        conn.commit()
        
        return {
            "success": processing_result['success'],
            "instance_id": instance_id,
            "records_total": processing_result.get('records_total', 0),
            "records_processed": processing_result.get('records_processed', 0),
            "summary": processing_result.get('summary', {}),
            "message": "Export processed successfully" if processing_result['success'] else "Export processing failed"
        }
    finally:
        conn.close()


def _process_export_file(
    content: bytes,
    expected_format: str,
    expected_columns: List[str]
) -> Dict[str, Any]:
    """Process an export file and extract data."""
    try:
        if expected_format.upper() == 'CSV':
            text_content = content.decode('utf-8')
            parsed = parse_csv_content(text_content)
            
            if not parsed.get('success'):
                return {'success': False, 'errors': [parsed.get('error')]}
            
            return {
                'success': True,
                'records_total': parsed['row_count'],
                'records_processed': parsed['row_count'],
                'records_failed': 0,
                'summary': {
                    'headers': parsed['headers'],
                    'row_count': parsed['row_count'],
                    'data_categories': parsed.get('data_categories', []),
                    'contains_pii': parsed.get('contains_pii', False)
                }
            }
        else:
            return {
                'success': True,
                'records_total': 1,
                'records_processed': 1,
                'summary': {'format': expected_format, 'status': 'manual_review_required'}
            }
    except Exception as e:
        return {
            'success': False,
            'errors': [str(e)],
            'records_total': 0,
            'records_processed': 0
        }


# ============================================================================
# TIER 4: Continuous Ingestion (Productized SaaS)
# ============================================================================

def configure_continuous_ingestion(
    user_id: int,
    ingestion_name: str,
    ingestion_type: str,
    stream_protocol: str,
    auth_method: str,
    client_org_id: Optional[int] = None,
    stream_config: Optional[Dict[str, Any]] = None,
    auth_config: Optional[Dict[str, Any]] = None,
    event_schema: Optional[Dict[str, Any]] = None,
    scoring_enabled: bool = False,
    alert_thresholds: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Configure continuous data ingestion (Tier 4 - SaaS territory)."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Generate webhook endpoint
        webhook_id = hashlib.sha256(f"{user_id}_{ingestion_name}_{datetime.now().isoformat()}".encode()).hexdigest()[:16]
        stream_endpoint = f"/api/webhooks/ingest/{webhook_id}"
        
        # Encrypt auth config
        auth_encrypted = base64.b64encode(json.dumps(auth_config or {}).encode()).decode()
        
        cursor.execute("""
            INSERT INTO continuous_ingestion_configs (
                user_id, client_org_id, ingestion_name, ingestion_type,
                stream_endpoint, stream_protocol, stream_config,
                auth_method, auth_config, event_schema,
                scoring_enabled, alert_thresholds, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        """, (
            user_id, client_org_id, ingestion_name, ingestion_type,
            stream_endpoint, stream_protocol, json.dumps(stream_config or {}),
            auth_method, auth_encrypted, json.dumps(event_schema or {}),
            scoring_enabled, json.dumps(alert_thresholds or {})
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "ingestion_name": ingestion_name,
            "stream_endpoint": stream_endpoint,
            "stream_protocol": stream_protocol,
            "status": "pending",
            "warning": "Tier 4 continuous ingestion significantly increases security burden, legal exposure, and support costs.",
            "message": "Continuous ingestion configured. Activation requires review."
        }
    finally:
        conn.close()


def get_continuous_ingestion_configs(
    user_id: int,
    client_org_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get list of continuous ingestion configurations."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM continuous_ingestion_configs WHERE user_id = ?"
        params = [user_id]
        
        if client_org_id:
            query += " AND client_org_id = ?"
            params.append(client_org_id)
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        configs = []
        for row in rows:
            config = dict(row)
            # Don't expose auth config
            config.pop('auth_config', None)
            config['stream_config'] = json.loads(config['stream_config']) if config['stream_config'] else {}
            config['event_schema'] = json.loads(config['event_schema']) if config['event_schema'] else {}
            config['alert_thresholds'] = json.loads(config['alert_thresholds']) if config['alert_thresholds'] else {}
            configs.append(config)
        
        return configs
    finally:
        conn.close()


def ingest_continuous_event(
    config_id: int,
    event_id: str,
    event_type: str,
    event_data: Dict[str, Any],
    event_timestamp: Optional[str] = None
) -> Dict[str, Any]:
    """Ingest a single event from continuous stream."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get config
        cursor.execute("""
            SELECT * FROM continuous_ingestion_configs WHERE id = ?
        """, (config_id,))
        config = cursor.fetchone()
        
        if not config:
            return {"error": "Ingestion configuration not found"}
        
        config = dict(config)
        
        if config['status'] != 'active':
            return {"error": f"Ingestion not active. Status: {config['status']}"}
        
        # Calculate processing latency
        event_ts = datetime.fromisoformat(event_timestamp) if event_timestamp else datetime.now()
        latency_ms = int((datetime.now() - event_ts).total_seconds() * 1000)
        
        # Store event
        cursor.execute("""
            INSERT INTO continuous_ingestion_events (
                config_id, user_id, event_id, event_type,
                event_data, event_timestamp, processing_latency_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            config_id, config['user_id'], event_id, event_type,
            json.dumps(event_data), event_ts.isoformat(), latency_ms
        ))
        
        # Update config stats
        cursor.execute("""
            UPDATE continuous_ingestion_configs 
            SET last_event_at = CURRENT_TIMESTAMP,
                events_this_month = events_this_month + 1
            WHERE id = ?
        """, (config_id,))
        
        conn.commit()
        
        return {
            "success": True,
            "event_id": event_id,
            "latency_ms": latency_ms,
            "message": "Event ingested successfully"
        }
    finally:
        conn.close()


# ============================================================================
# Intake Analytics and Dashboard
# ============================================================================

def get_intake_dashboard(user_id: int, client_org_id: Optional[int] = None) -> Dict[str, Any]:
    """Get intake dashboard metrics across all tiers."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        dashboard = {
            "tier_1_manual": {},
            "tier_2_api": {},
            "tier_3_scheduled": {},
            "tier_4_continuous": {},
            "overall_metrics": {}
        }
        
        # Tier 1 metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_documents,
                SUM(CASE WHEN parsing_status = 'completed' THEN 1 ELSE 0 END) as processed,
                SUM(CASE WHEN parsing_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN parsing_status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM intake_documents WHERE user_id = ?
        """, (user_id,))
        tier1 = cursor.fetchone()
        dashboard["tier_1_manual"] = {
            "total_documents": tier1['total_documents'] or 0,
            "processed": tier1['processed'] or 0,
            "pending": tier1['pending'] or 0,
            "failed": tier1['failed'] or 0
        }
        
        # Tier 2 metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_integrations,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errored
            FROM api_integration_configs WHERE user_id = ?
        """, (user_id,))
        tier2 = cursor.fetchone()
        dashboard["tier_2_api"] = {
            "total_integrations": tier2['total_integrations'] or 0,
            "active": tier2['active'] or 0,
            "errored": tier2['errored'] or 0
        }
        
        # Tier 3 metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_exports,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(missed_count) as total_missed
            FROM scheduled_export_configs WHERE user_id = ?
        """, (user_id,))
        tier3 = cursor.fetchone()
        dashboard["tier_3_scheduled"] = {
            "total_exports": tier3['total_exports'] or 0,
            "active": tier3['active'] or 0,
            "missed_deliveries": tier3['total_missed'] or 0
        }
        
        # Tier 4 metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_streams,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(events_this_month) as events_this_month
            FROM continuous_ingestion_configs WHERE user_id = ?
        """, (user_id,))
        tier4 = cursor.fetchone()
        dashboard["tier_4_continuous"] = {
            "total_streams": tier4['total_streams'] or 0,
            "active": tier4['active'] or 0,
            "events_this_month": tier4['events_this_month'] or 0
        }
        
        # Overall metrics
        dashboard["overall_metrics"] = {
            "total_data_sources": (
                (tier1['total_documents'] or 0) +
                (tier2['total_integrations'] or 0) +
                (tier3['total_exports'] or 0) +
                (tier4['total_streams'] or 0)
            ),
            "active_integrations": (
                (tier2['active'] or 0) +
                (tier3['active'] or 0) +
                (tier4['active'] or 0)
            )
        }
        
        return dashboard
    finally:
        conn.close()


def get_intake_tier_recommendation(
    organization_type: str,
    compliance_frameworks: List[str],
    current_maturity: str
) -> Dict[str, Any]:
    """Recommend appropriate intake tier based on organization profile."""
    
    recommendations = {
        "recommended_tier": 1,
        "reasoning": [],
        "upgrade_path": [],
        "considerations": []
    }
    
    # Start with Tier 1 (always available)
    recommendations["reasoning"].append("Tier 1 (Manual/Document-Based) is the foundation - works for 100% of clients")
    
    # Evaluate for higher tiers
    if organization_type in ['Enterprise', 'Government']:
        recommendations["recommended_tier"] = 2
        recommendations["reasoning"].append("Enterprise/Government clients typically have API-enabled tools")
        recommendations["upgrade_path"].append("Consider Tier 3 for regulated data that can't use live APIs")
    
    if organization_type == 'MSP':
        recommendations["recommended_tier"] = 3
        recommendations["reasoning"].append("MSPs benefit most from scheduled bulk exports across tenants")
        recommendations["considerations"].append("Tier 3 provides near-automation without live integration overhead")
    
    if 'HIPAA' in compliance_frameworks or 'FedRAMP' in compliance_frameworks:
        recommendations["considerations"].append("Regulated frameworks may restrict live API integrations")
        recommendations["considerations"].append("Tier 3 (Scheduled Exports) often preferred in regulated environments")
    
    if current_maturity == 'advanced' and organization_type == 'Enterprise':
        recommendations["upgrade_path"].append("Tier 4 (Continuous) available for productized SaaS offerings")
        recommendations["considerations"].append("Tier 4 significantly increases security/legal burden")
    
    return recommendations


# Initialize tables when module is imported
try:
    init_client_intake_tables()
except Exception as e:
    print(f"Warning: Could not initialize client intake tables: {e}")
