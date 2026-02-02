"""
Business Operations Service

Handles:
- Service catalog and pricing
- Proposal/quote generation
- Template library management
- Client onboarding wizard
- Pipeline tracking
- Business metrics
"""

import sqlite3
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"
SCHEMA_PATH = Path(__file__).parent.parent / "database" / "business_ops_schema.sql"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_business_ops_tables():
    """Initialize business operations tables."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        with open(SCHEMA_PATH, 'r') as f:
            schema = f.read()
            cursor.executescript(schema)
        conn.commit()
        print("Business ops tables initialized successfully")
    except Exception as e:
        print(f"Business ops schema warning: {e}")
        conn.commit()
    finally:
        conn.close()


# ============================================================================
# SERVICE CATALOG
# ============================================================================

def create_service(
    user_id: int,
    service_name: str,
    service_category: str,
    pricing_model: str,
    base_price: float,
    description: Optional[str] = None,
    hourly_rate: Optional[float] = None,
    estimated_hours_min: Optional[float] = None,
    estimated_hours_max: Optional[float] = None,
    default_duration_weeks: Optional[int] = None,
    deliverables: Optional[List[str]] = None,
    frameworks_supported: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Create a service in the catalog."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO service_catalog (
                user_id, service_name, service_category, description,
                pricing_model, base_price, hourly_rate,
                estimated_hours_min, estimated_hours_max, default_duration_weeks,
                deliverables, frameworks_supported
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, service_name, service_category, description,
            pricing_model, base_price, hourly_rate,
            estimated_hours_min, estimated_hours_max, default_duration_weeks,
            json.dumps(deliverables or []),
            json.dumps(frameworks_supported or [])
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "service_name": service_name,
            "message": "Service created successfully"
        }
    finally:
        conn.close()


def get_service_catalog(user_id: int, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all services in the catalog."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM service_catalog WHERE user_id = ? AND is_active = 1"
        params = [user_id]
        
        if category:
            query += " AND service_category = ?"
            params.append(category)
        
        query += " ORDER BY display_order, service_name"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        services = []
        for row in rows:
            s = dict(row)
            s['deliverables'] = json.loads(s['deliverables']) if s['deliverables'] else []
            s['frameworks_supported'] = json.loads(s['frameworks_supported']) if s['frameworks_supported'] else []
            services.append(s)
        
        return services
    finally:
        conn.close()


def seed_default_services(user_id: int) -> Dict[str, Any]:
    """Seed default service catalog for new users."""
    default_services = [
        {
            "service_name": "Security Maturity Assessment",
            "service_category": "assessment",
            "pricing_model": "fixed",
            "base_price": 15000,
            "description": "Comprehensive security maturity assessment covering governance, access control, data protection, and more.",
            "estimated_hours_min": 40,
            "estimated_hours_max": 60,
            "default_duration_weeks": 3,
            "deliverables": ["Assessment Report", "Executive Summary", "Maturity Scorecard", "Recommendations"],
            "frameworks_supported": ["NIST CSF", "ISO 27001", "CIS Controls"]
        },
        {
            "service_name": "Compliance Gap Analysis",
            "service_category": "gap_analysis",
            "pricing_model": "fixed",
            "base_price": 20000,
            "description": "Detailed gap analysis against target compliance framework with remediation roadmap.",
            "estimated_hours_min": 60,
            "estimated_hours_max": 80,
            "default_duration_weeks": 4,
            "deliverables": ["Gap Analysis Report", "Control Mapping", "Remediation Roadmap", "Priority Matrix"],
            "frameworks_supported": ["SOC 2", "ISO 27001", "HIPAA", "PCI DSS", "NIST 800-53"]
        },
        {
            "service_name": "Compliance Roadmap Development",
            "service_category": "roadmap",
            "pricing_model": "fixed",
            "base_price": 25000,
            "description": "Strategic compliance roadmap with phased implementation plan and budget estimates.",
            "estimated_hours_min": 60,
            "estimated_hours_max": 100,
            "default_duration_weeks": 4,
            "deliverables": ["Strategic Roadmap", "Implementation Plan", "Budget Estimate", "Resource Plan", "Timeline"],
            "frameworks_supported": ["All Frameworks"]
        },
        {
            "service_name": "SOC 2 Readiness Assessment",
            "service_category": "audit_prep",
            "pricing_model": "fixed",
            "base_price": 18000,
            "description": "SOC 2 Type I/II readiness assessment with gap remediation guidance.",
            "estimated_hours_min": 50,
            "estimated_hours_max": 70,
            "default_duration_weeks": 3,
            "deliverables": ["Readiness Report", "Control Matrix", "Evidence Checklist", "Remediation Plan"],
            "frameworks_supported": ["SOC 2"]
        },
        {
            "service_name": "ISO 27001 Implementation Support",
            "service_category": "implementation",
            "pricing_model": "fixed",
            "base_price": 45000,
            "description": "End-to-end ISO 27001 implementation support including ISMS development.",
            "estimated_hours_min": 120,
            "estimated_hours_max": 200,
            "default_duration_weeks": 12,
            "deliverables": ["ISMS Documentation", "Policy Templates", "Risk Assessment", "Internal Audit Support"],
            "frameworks_supported": ["ISO 27001"]
        },
        {
            "service_name": "Virtual CISO (vCISO) - Monthly",
            "service_category": "managed_services",
            "pricing_model": "fixed",
            "base_price": 5000,
            "description": "Monthly virtual CISO services including security leadership and guidance.",
            "estimated_hours_min": 20,
            "estimated_hours_max": 40,
            "default_duration_weeks": 4,
            "deliverables": ["Monthly Security Review", "Board Reporting", "Vendor Risk Reviews", "Incident Support"],
            "frameworks_supported": ["All Frameworks"]
        },
        {
            "service_name": "Security Awareness Training",
            "service_category": "training",
            "pricing_model": "per_user",
            "base_price": 25,
            "description": "Customized security awareness training for employees.",
            "estimated_hours_min": 8,
            "estimated_hours_max": 16,
            "default_duration_weeks": 2,
            "deliverables": ["Training Materials", "Phishing Simulation", "Completion Certificates", "Metrics Report"],
            "frameworks_supported": ["All Frameworks"]
        },
        {
            "service_name": "Penetration Testing",
            "service_category": "assessment",
            "pricing_model": "fixed",
            "base_price": 12000,
            "description": "External and internal penetration testing with detailed findings report.",
            "estimated_hours_min": 40,
            "estimated_hours_max": 60,
            "default_duration_weeks": 2,
            "deliverables": ["Pentest Report", "Executive Summary", "Technical Findings", "Remediation Guidance"],
            "frameworks_supported": ["PCI DSS", "SOC 2", "ISO 27001"]
        }
    ]
    
    created = 0
    for service in default_services:
        try:
            create_service(user_id, **service)
            created += 1
        except Exception as e:
            print(f"Error creating service {service['service_name']}: {e}")
    
    return {"services_created": created, "message": f"Created {created} default services"}


# ============================================================================
# PROPOSALS
# ============================================================================

def generate_proposal_number(user_id: int) -> str:
    """Generate unique proposal number."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        year = datetime.now().strftime("%Y")
        cursor.execute("""
            SELECT COUNT(*) as count FROM proposals 
            WHERE user_id = ? AND proposal_number LIKE ?
        """, (user_id, f"PROP-{year}-%"))
        
        count = cursor.fetchone()['count']
        return f"PROP-{year}-{str(count + 1).zfill(4)}"
    finally:
        conn.close()


def create_proposal(
    user_id: int,
    proposal_name: str,
    client_name: str,
    services: List[Dict[str, Any]],  # [{service_id, quantity, custom_price}]
    client_org_id: Optional[int] = None,
    client_contact_name: Optional[str] = None,
    client_contact_email: Optional[str] = None,
    client_industry: Optional[str] = None,
    client_size: Optional[str] = None,
    frameworks_in_scope: Optional[List[str]] = None,
    discount_percent: float = 0,
    proposed_start_date: Optional[str] = None,
    proposed_duration_weeks: Optional[int] = None,
    valid_days: int = 30,
    executive_summary: Optional[str] = None,
    payment_terms: str = 'net_30'
) -> Dict[str, Any]:
    """Create a new proposal."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        proposal_number = generate_proposal_number(user_id)
        
        # Calculate pricing
        subtotal = 0
        line_items = []
        
        for svc in services:
            if svc.get('service_id'):
                cursor.execute("SELECT * FROM service_catalog WHERE id = ?", (svc['service_id'],))
                service = cursor.fetchone()
                if service:
                    service = dict(service)
                    quantity = svc.get('quantity', 1)
                    unit_price = svc.get('custom_price') or service['base_price']
                    total = unit_price * quantity
                    
                    line_items.append({
                        'service_catalog_id': svc['service_id'],
                        'line_item_name': service['service_name'],
                        'description': service['description'],
                        'quantity': quantity,
                        'unit_price': unit_price,
                        'total_price': total,
                        'is_custom': False
                    })
                    subtotal += total
            elif svc.get('custom_name'):
                # Custom line item
                quantity = svc.get('quantity', 1)
                unit_price = svc.get('unit_price', 0)
                total = unit_price * quantity
                
                line_items.append({
                    'service_catalog_id': None,
                    'line_item_name': svc['custom_name'],
                    'description': svc.get('description', ''),
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'total_price': total,
                    'is_custom': True
                })
                subtotal += total
        
        # Apply discount
        discount_amount = subtotal * (discount_percent / 100)
        total_price = subtotal - discount_amount
        
        # Valid until date
        valid_until = (datetime.now() + timedelta(days=valid_days)).strftime('%Y-%m-%d')
        
        # Insert proposal
        cursor.execute("""
            INSERT INTO proposals (
                user_id, client_org_id, proposal_number, proposal_name,
                client_name, client_contact_name, client_contact_email,
                client_industry, client_size, services_included, frameworks_in_scope,
                subtotal, discount_percent, discount_amount, total_price,
                payment_terms, proposed_start_date, proposed_duration_weeks,
                valid_until, executive_summary, proposal_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        """, (
            user_id, client_org_id, proposal_number, proposal_name,
            client_name, client_contact_name, client_contact_email,
            client_industry, client_size, json.dumps(services),
            json.dumps(frameworks_in_scope or []),
            subtotal, discount_percent, discount_amount, total_price,
            payment_terms, proposed_start_date, proposed_duration_weeks,
            valid_until, executive_summary
        ))
        
        proposal_id = cursor.lastrowid
        
        # Insert line items
        for idx, item in enumerate(line_items):
            cursor.execute("""
                INSERT INTO proposal_line_items (
                    proposal_id, service_catalog_id, line_item_name,
                    description, quantity, unit_price, total_price,
                    is_custom, display_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal_id, item['service_catalog_id'], item['line_item_name'],
                item['description'], item['quantity'], item['unit_price'],
                item['total_price'], item['is_custom'], idx
            ))
        
        conn.commit()
        
        return {
            "id": proposal_id,
            "proposal_number": proposal_number,
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "total_price": total_price,
            "valid_until": valid_until,
            "line_items_count": len(line_items),
            "message": "Proposal created successfully"
        }
    finally:
        conn.close()


def get_proposal(proposal_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """Get proposal with line items."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM proposals WHERE id = ? AND user_id = ?
        """, (proposal_id, user_id))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        proposal = dict(row)
        proposal['services_included'] = json.loads(proposal['services_included']) if proposal['services_included'] else []
        proposal['frameworks_in_scope'] = json.loads(proposal['frameworks_in_scope']) if proposal['frameworks_in_scope'] else []
        proposal['assumptions'] = json.loads(proposal['assumptions']) if proposal['assumptions'] else []
        proposal['exclusions'] = json.loads(proposal['exclusions']) if proposal['exclusions'] else []
        
        # Get line items
        cursor.execute("""
            SELECT * FROM proposal_line_items 
            WHERE proposal_id = ? ORDER BY display_order
        """, (proposal_id,))
        
        proposal['line_items'] = [dict(item) for item in cursor.fetchall()]
        
        return proposal
    finally:
        conn.close()


def list_proposals(
    user_id: int,
    status: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """List all proposals."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM proposals WHERE user_id = ?"
        params = [user_id]
        
        if status:
            query += " AND proposal_status = ?"
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        proposals = []
        for row in rows:
            p = dict(row)
            p['services_included'] = json.loads(p['services_included']) if p['services_included'] else []
            p['frameworks_in_scope'] = json.loads(p['frameworks_in_scope']) if p['frameworks_in_scope'] else []
            proposals.append(p)
        
        return proposals
    finally:
        conn.close()


def update_proposal_status(
    proposal_id: int,
    user_id: int,
    status: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Update proposal status."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        timestamp_field = None
        if status == 'sent':
            timestamp_field = 'sent_at'
        elif status == 'viewed':
            timestamp_field = 'viewed_at'
        elif status in ['accepted', 'rejected']:
            timestamp_field = 'responded_at'
        
        if timestamp_field:
            cursor.execute(f"""
                UPDATE proposals SET 
                    proposal_status = ?, 
                    {timestamp_field} = CURRENT_TIMESTAMP,
                    response_notes = COALESCE(?, response_notes),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            """, (status, notes, proposal_id, user_id))
        else:
            cursor.execute("""
                UPDATE proposals SET 
                    proposal_status = ?,
                    response_notes = COALESCE(?, response_notes),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            """, (status, notes, proposal_id, user_id))
        
        conn.commit()
        
        return {"success": True, "status": status}
    finally:
        conn.close()


def convert_proposal_to_engagement(proposal_id: int, user_id: int) -> Dict[str, Any]:
    """Convert accepted proposal to engagement."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get proposal
        cursor.execute("SELECT * FROM proposals WHERE id = ? AND user_id = ?", (proposal_id, user_id))
        proposal = cursor.fetchone()
        
        if not proposal:
            return {"error": "Proposal not found"}
        
        proposal = dict(proposal)
        
        if proposal['proposal_status'] != 'accepted':
            return {"error": "Proposal must be accepted before conversion"}
        
        # Create client org if needed
        client_org_id = proposal['client_org_id']
        if not client_org_id:
            cursor.execute("""
                INSERT INTO client_organizations (
                    user_id, organization_name, organization_type,
                    industry_vertical, contact_name, contact_email,
                    onboarding_status
                ) VALUES (?, ?, 'SMB', ?, ?, ?, 'in_progress')
            """, (
                user_id, proposal['client_name'],
                proposal['client_industry'],
                proposal['client_contact_name'],
                proposal['client_contact_email']
            ))
            client_org_id = cursor.lastrowid
        
        # Determine service areas from services
        services = json.loads(proposal['services_included']) if proposal['services_included'] else []
        service_areas = set()
        for svc in services:
            if svc.get('service_id'):
                cursor.execute("SELECT service_category FROM service_catalog WHERE id = ?", (svc['service_id'],))
                cat = cursor.fetchone()
                if cat:
                    service_areas.add(cat['service_category'])
        
        # Create engagement
        cursor.execute("""
            INSERT INTO consulting_engagements (
                user_id, client_org_id, engagement_name, engagement_type,
                service_areas, frameworks_in_scope, start_date,
                engagement_value, billing_type, primary_contact_name,
                primary_contact_email, engagement_status
            ) VALUES (?, ?, ?, 'implementation', ?, ?, ?, ?, 'fixed', ?, ?, 'active')
        """, (
            user_id, client_org_id, proposal['proposal_name'],
            json.dumps(list(service_areas)),
            proposal['frameworks_in_scope'],
            proposal['proposed_start_date'],
            proposal['total_price'],
            proposal['client_contact_name'],
            proposal['client_contact_email']
        ))
        
        engagement_id = cursor.lastrowid
        
        # Update proposal
        cursor.execute("""
            UPDATE proposals SET 
                converted_to_engagement_id = ?,
                client_org_id = ?
            WHERE id = ?
        """, (engagement_id, client_org_id, proposal_id))
        
        conn.commit()
        
        return {
            "success": True,
            "engagement_id": engagement_id,
            "client_org_id": client_org_id,
            "message": "Proposal converted to engagement"
        }
    finally:
        conn.close()


# ============================================================================
# ONBOARDING WIZARD
# ============================================================================

def start_onboarding_session(user_id: int) -> Dict[str, Any]:
    """Start a new client onboarding session."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        session_token = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO onboarding_sessions (
                user_id, session_token, current_step, completed_steps
            ) VALUES (?, ?, 1, '[]')
        """, (user_id, session_token))
        conn.commit()
        
        return {
            "session_id": cursor.lastrowid,
            "session_token": session_token,
            "current_step": 1,
            "total_steps": 6,
            "steps": [
                {"step": 1, "name": "Client Information", "description": "Basic client details"},
                {"step": 2, "name": "Select Services", "description": "Choose services to provide"},
                {"step": 3, "name": "Select Frameworks", "description": "Target compliance frameworks"},
                {"step": 4, "name": "Upload Documents", "description": "Upload existing documentation"},
                {"step": 5, "name": "Quick Assessment", "description": "Initial assessment questionnaire"},
                {"step": 6, "name": "Review & Create", "description": "Review and create engagement"}
            ],
            "message": "Onboarding session started"
        }
    finally:
        conn.close()


def update_onboarding_step(
    session_token: str,
    user_id: int,
    step: int,
    data: Dict[str, Any]
) -> Dict[str, Any]:
    """Update onboarding session with step data."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get session
        cursor.execute("""
            SELECT * FROM onboarding_sessions 
            WHERE session_token = ? AND user_id = ?
        """, (session_token, user_id))
        
        session = cursor.fetchone()
        if not session:
            return {"error": "Session not found"}
        
        session = dict(session)
        completed_steps = json.loads(session['completed_steps']) if session['completed_steps'] else []
        
        # Update based on step
        updates = {"last_activity_at": "CURRENT_TIMESTAMP"}
        
        if step == 1:  # Client Information
            updates['client_info'] = json.dumps(data)
        elif step == 2:  # Services
            updates['selected_services'] = json.dumps(data.get('services', []))
        elif step == 3:  # Frameworks
            updates['selected_frameworks'] = json.dumps(data.get('frameworks', []))
        elif step == 4:  # Documents
            existing = json.loads(session['uploaded_documents']) if session['uploaded_documents'] else []
            existing.extend(data.get('document_ids', []))
            updates['uploaded_documents'] = json.dumps(existing)
        elif step == 5:  # Assessment
            updates['questionnaire_responses'] = json.dumps(data.get('responses', {}))
            # Calculate simple assessment score
            responses = data.get('responses', {})
            yes_count = sum(1 for v in responses.values() if v in [True, 'yes', 'Yes'])
            total = len(responses)
            score = (yes_count / total * 100) if total > 0 else 0
            updates['assessment_results'] = json.dumps({
                'score': round(score, 1),
                'total_questions': total,
                'positive_answers': yes_count
            })
        
        # Mark step complete
        if step not in completed_steps:
            completed_steps.append(step)
        
        updates['completed_steps'] = json.dumps(completed_steps)
        updates['current_step'] = step + 1
        
        # Build update query
        set_clauses = []
        params = []
        for key, value in updates.items():
            if value == "CURRENT_TIMESTAMP":
                set_clauses.append(f"{key} = CURRENT_TIMESTAMP")
            else:
                set_clauses.append(f"{key} = ?")
                params.append(value)
        
        params.extend([session_token, user_id])
        
        cursor.execute(f"""
            UPDATE onboarding_sessions SET {', '.join(set_clauses)}
            WHERE session_token = ? AND user_id = ?
        """, params)
        
        conn.commit()
        
        return {
            "success": True,
            "current_step": step + 1,
            "completed_steps": completed_steps,
            "message": f"Step {step} completed"
        }
    finally:
        conn.close()


def complete_onboarding(
    session_token: str,
    user_id: int,
    create_proposal: bool = True
) -> Dict[str, Any]:
    """Complete onboarding and create client/engagement/proposal."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get session
        cursor.execute("""
            SELECT * FROM onboarding_sessions 
            WHERE session_token = ? AND user_id = ?
        """, (session_token, user_id))
        
        session = cursor.fetchone()
        if not session:
            return {"error": "Session not found"}
        
        session = dict(session)
        
        # Parse collected data
        client_info = json.loads(session['client_info']) if session['client_info'] else {}
        selected_services = json.loads(session['selected_services']) if session['selected_services'] else []
        selected_frameworks = json.loads(session['selected_frameworks']) if session['selected_frameworks'] else []
        assessment_results = json.loads(session['assessment_results']) if session['assessment_results'] else {}
        
        # Create client organization
        cursor.execute("""
            INSERT INTO client_organizations (
                user_id, organization_name, organization_type,
                industry_vertical, compliance_frameworks,
                contact_name, contact_email, onboarding_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')
        """, (
            user_id,
            client_info.get('company_name', 'Unknown'),
            client_info.get('company_size', 'SMB'),
            client_info.get('industry', ''),
            json.dumps(selected_frameworks),
            client_info.get('contact_name', ''),
            client_info.get('contact_email', '')
        ))
        
        client_org_id = cursor.lastrowid
        
        # Create engagement
        service_areas = []
        for svc_id in selected_services:
            cursor.execute("SELECT service_category FROM service_catalog WHERE id = ?", (svc_id,))
            cat = cursor.fetchone()
            if cat and cat['service_category'] not in service_areas:
                service_areas.append(cat['service_category'])
        
        cursor.execute("""
            INSERT INTO consulting_engagements (
                user_id, client_org_id, engagement_name, engagement_type,
                service_areas, frameworks_in_scope, primary_contact_name,
                primary_contact_email, engagement_status
            ) VALUES (?, ?, ?, 'assessment', ?, ?, ?, ?, 'discovery')
        """, (
            user_id, client_org_id,
            f"{client_info.get('company_name', 'Client')} - Initial Engagement",
            json.dumps(service_areas),
            json.dumps(selected_frameworks),
            client_info.get('contact_name', ''),
            client_info.get('contact_email', '')
        ))
        
        engagement_id = cursor.lastrowid
        
        # Create proposal if requested
        proposal_id = None
        if create_proposal and selected_services:
            services_for_proposal = [{"service_id": sid, "quantity": 1} for sid in selected_services]
            conn.commit()  # Commit before calling create_proposal
            
            proposal_result = create_proposal(
                user_id=user_id,
                proposal_name=f"{client_info.get('company_name', 'Client')} - Proposal",
                client_name=client_info.get('company_name', 'Unknown'),
                client_org_id=client_org_id,
                services=services_for_proposal,
                client_contact_name=client_info.get('contact_name'),
                client_contact_email=client_info.get('contact_email'),
                client_industry=client_info.get('industry'),
                frameworks_in_scope=selected_frameworks
            )
            proposal_id = proposal_result.get('id')
        
        # Update session
        cursor.execute("""
            UPDATE onboarding_sessions SET
                session_status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                created_client_org_id = ?,
                created_engagement_id = ?,
                created_proposal_id = ?
            WHERE session_token = ?
        """, (client_org_id, engagement_id, proposal_id, session_token))
        
        conn.commit()
        
        return {
            "success": True,
            "client_org_id": client_org_id,
            "engagement_id": engagement_id,
            "proposal_id": proposal_id,
            "assessment_score": assessment_results.get('score', 0),
            "message": "Onboarding completed successfully"
        }
    finally:
        conn.close()


def get_onboarding_session(session_token: str, user_id: int) -> Optional[Dict[str, Any]]:
    """Get onboarding session details."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM onboarding_sessions 
            WHERE session_token = ? AND user_id = ?
        """, (session_token, user_id))
        
        session = cursor.fetchone()
        if not session:
            return None
        
        s = dict(session)
        s['client_info'] = json.loads(s['client_info']) if s['client_info'] else {}
        s['selected_services'] = json.loads(s['selected_services']) if s['selected_services'] else []
        s['selected_frameworks'] = json.loads(s['selected_frameworks']) if s['selected_frameworks'] else []
        s['uploaded_documents'] = json.loads(s['uploaded_documents']) if s['uploaded_documents'] else []
        s['questionnaire_responses'] = json.loads(s['questionnaire_responses']) if s['questionnaire_responses'] else {}
        s['assessment_results'] = json.loads(s['assessment_results']) if s['assessment_results'] else {}
        s['completed_steps'] = json.loads(s['completed_steps']) if s['completed_steps'] else []
        
        return s
    finally:
        conn.close()


# ============================================================================
# TEMPLATES
# ============================================================================

def seed_industry_templates(user_id: int) -> Dict[str, Any]:
    """Seed industry-specific assessment templates."""
    templates = [
        {
            "template_name": "Healthcare Security Assessment",
            "industry": "healthcare",
            "target_frameworks": ["HIPAA", "HITRUST"],
            "description": "Comprehensive healthcare security assessment covering HIPAA requirements.",
            "categories": [
                {"id": "privacy", "name": "Privacy & PHI Protection", "weight": 1.5},
                {"id": "access", "name": "Access Controls", "weight": 1.2},
                {"id": "audit", "name": "Audit Controls", "weight": 1.0},
                {"id": "integrity", "name": "Integrity Controls", "weight": 1.0},
                {"id": "transmission", "name": "Transmission Security", "weight": 1.2}
            ],
            "questions": [
                {"id": "h1", "category": "privacy", "text": "Is PHI encrypted at rest?", "max_score": 5, "weight": 2},
                {"id": "h2", "category": "privacy", "text": "Are there documented policies for PHI handling?", "max_score": 5, "weight": 1.5},
                {"id": "h3", "category": "access", "text": "Is role-based access control implemented?", "max_score": 5, "weight": 2},
                {"id": "h4", "category": "access", "text": "Are access logs reviewed regularly?", "max_score": 5, "weight": 1},
                {"id": "h5", "category": "audit", "text": "Is there an audit trail for PHI access?", "max_score": 5, "weight": 2},
                {"id": "h6", "category": "integrity", "text": "Are integrity verification mechanisms in place?", "max_score": 5, "weight": 1},
                {"id": "h7", "category": "transmission", "text": "Is PHI encrypted in transit?", "max_score": 5, "weight": 2}
            ],
            "estimated_duration_minutes": 45,
            "difficulty_level": "intermediate"
        },
        {
            "template_name": "Financial Services Security Assessment",
            "industry": "finance",
            "target_frameworks": ["SOC 2", "PCI DSS", "GLBA"],
            "description": "Security assessment for financial services organizations.",
            "categories": [
                {"id": "data_protection", "name": "Data Protection", "weight": 1.5},
                {"id": "access_mgmt", "name": "Access Management", "weight": 1.3},
                {"id": "network_security", "name": "Network Security", "weight": 1.2},
                {"id": "incident_response", "name": "Incident Response", "weight": 1.0},
                {"id": "vendor_mgmt", "name": "Vendor Management", "weight": 1.0}
            ],
            "questions": [
                {"id": "f1", "category": "data_protection", "text": "Is customer financial data encrypted?", "max_score": 5, "weight": 2},
                {"id": "f2", "category": "data_protection", "text": "Is there a data classification policy?", "max_score": 5, "weight": 1.5},
                {"id": "f3", "category": "access_mgmt", "text": "Is MFA required for all financial systems?", "max_score": 5, "weight": 2},
                {"id": "f4", "category": "access_mgmt", "text": "Are privileged accounts regularly reviewed?", "max_score": 5, "weight": 1.5},
                {"id": "f5", "category": "network_security", "text": "Is network segmentation implemented?", "max_score": 5, "weight": 1.5},
                {"id": "f6", "category": "network_security", "text": "Are firewalls configured and monitored?", "max_score": 5, "weight": 1},
                {"id": "f7", "category": "incident_response", "text": "Is there a documented incident response plan?", "max_score": 5, "weight": 1.5},
                {"id": "f8", "category": "vendor_mgmt", "text": "Are third-party vendors assessed for security?", "max_score": 5, "weight": 1}
            ],
            "estimated_duration_minutes": 60,
            "difficulty_level": "advanced"
        },
        {
            "template_name": "Technology Startup Security Assessment",
            "industry": "technology",
            "target_frameworks": ["SOC 2", "ISO 27001"],
            "description": "Right-sized security assessment for technology startups.",
            "categories": [
                {"id": "sdlc", "name": "Secure Development", "weight": 1.5},
                {"id": "cloud", "name": "Cloud Security", "weight": 1.3},
                {"id": "identity", "name": "Identity & Access", "weight": 1.2},
                {"id": "data", "name": "Data Protection", "weight": 1.0}
            ],
            "questions": [
                {"id": "t1", "category": "sdlc", "text": "Is security integrated into the SDLC?", "max_score": 5, "weight": 2},
                {"id": "t2", "category": "sdlc", "text": "Are code reviews performed?", "max_score": 5, "weight": 1.5},
                {"id": "t3", "category": "sdlc", "text": "Is dependency scanning automated?", "max_score": 5, "weight": 1},
                {"id": "t4", "category": "cloud", "text": "Are cloud resources properly configured?", "max_score": 5, "weight": 1.5},
                {"id": "t5", "category": "cloud", "text": "Is infrastructure as code used?", "max_score": 5, "weight": 1},
                {"id": "t6", "category": "identity", "text": "Is SSO implemented?", "max_score": 5, "weight": 1.5},
                {"id": "t7", "category": "identity", "text": "Is MFA enforced for all employees?", "max_score": 5, "weight": 2},
                {"id": "t8", "category": "data", "text": "Is customer data encrypted?", "max_score": 5, "weight": 2}
            ],
            "estimated_duration_minutes": 30,
            "difficulty_level": "basic"
        }
    ]
    
    created = 0
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        for t in templates:
            cursor.execute("""
                INSERT INTO industry_assessment_templates (
                    user_id, template_name, industry, target_frameworks,
                    description, categories, questions, scoring_model,
                    estimated_duration_minutes, difficulty_level, is_system_template
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (
                user_id, t['template_name'], t['industry'],
                json.dumps(t['target_frameworks']),
                t['description'],
                json.dumps(t['categories']),
                json.dumps(t['questions']),
                json.dumps({}),
                t['estimated_duration_minutes'],
                t['difficulty_level']
            ))
            created += 1
        
        conn.commit()
        return {"templates_created": created}
    finally:
        conn.close()


def get_industry_templates(
    user_id: int,
    industry: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get industry assessment templates."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT * FROM industry_assessment_templates 
            WHERE (user_id = ? OR is_system_template = 1) AND is_active = 1
        """
        params = [user_id]
        
        if industry:
            query += " AND industry = ?"
            params.append(industry)
        
        query += " ORDER BY industry, template_name"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        templates = []
        for row in rows:
            t = dict(row)
            t['target_frameworks'] = json.loads(t['target_frameworks']) if t['target_frameworks'] else []
            t['categories'] = json.loads(t['categories']) if t['categories'] else []
            t['questions'] = json.loads(t['questions']) if t['questions'] else []
            templates.append(t)
        
        return templates
    finally:
        conn.close()


# ============================================================================
# PIPELINE & METRICS
# ============================================================================

def seed_pipeline_stages(user_id: int) -> Dict[str, Any]:
    """Seed default pipeline stages."""
    stages = [
        {"stage_name": "Lead", "stage_order": 1, "stage_type": "lead", "probability_percent": 10},
        {"stage_name": "Qualified", "stage_order": 2, "stage_type": "qualified", "probability_percent": 25},
        {"stage_name": "Proposal Sent", "stage_order": 3, "stage_type": "proposal", "probability_percent": 50},
        {"stage_name": "Negotiation", "stage_order": 4, "stage_type": "negotiation", "probability_percent": 75},
        {"stage_name": "Closed Won", "stage_order": 5, "stage_type": "closed_won", "probability_percent": 100},
        {"stage_name": "Closed Lost", "stage_order": 6, "stage_type": "closed_lost", "probability_percent": 0}
    ]
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        for stage in stages:
            cursor.execute("""
                INSERT OR IGNORE INTO pipeline_stages (
                    user_id, stage_name, stage_order, stage_type, probability_percent
                ) VALUES (?, ?, ?, ?, ?)
            """, (user_id, stage['stage_name'], stage['stage_order'], 
                  stage['stage_type'], stage['probability_percent']))
        
        conn.commit()
        return {"stages_created": len(stages)}
    finally:
        conn.close()


def get_pipeline_dashboard(user_id: int) -> Dict[str, Any]:
    """Get pipeline dashboard with metrics."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get stages
        cursor.execute("""
            SELECT * FROM pipeline_stages WHERE user_id = ? ORDER BY stage_order
        """, (user_id,))
        stages = [dict(s) for s in cursor.fetchall()]
        
        # Get opportunities by stage
        for stage in stages:
            cursor.execute("""
                SELECT COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value
                FROM pipeline_opportunities 
                WHERE user_id = ? AND stage_id = ?
            """, (user_id, stage['id']))
            result = cursor.fetchone()
            stage['opportunity_count'] = result['count']
            stage['stage_value'] = result['value']
        
        # Get totals
        cursor.execute("""
            SELECT 
                COUNT(*) as total_opportunities,
                COALESCE(SUM(estimated_value), 0) as total_pipeline_value,
                COALESCE(SUM(weighted_value), 0) as weighted_pipeline_value
            FROM pipeline_opportunities 
            WHERE user_id = ? AND outcome IS NULL
        """, (user_id,))
        totals = dict(cursor.fetchone())
        
        # Get recent proposals
        cursor.execute("""
            SELECT * FROM proposals 
            WHERE user_id = ? 
            ORDER BY created_at DESC LIMIT 5
        """, (user_id,))
        recent_proposals = []
        for row in cursor.fetchall():
            p = dict(row)
            p['services_included'] = json.loads(p['services_included']) if p['services_included'] else []
            recent_proposals.append(p)
        
        # Calculate metrics
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN proposal_status = 'accepted' THEN 1 END) as won,
                COUNT(CASE WHEN proposal_status = 'rejected' THEN 1 END) as lost,
                COUNT(CASE WHEN proposal_status = 'sent' THEN 1 END) as pending
            FROM proposals WHERE user_id = ?
        """, (user_id,))
        proposal_stats = dict(cursor.fetchone())
        
        win_rate = 0
        if proposal_stats['won'] + proposal_stats['lost'] > 0:
            win_rate = (proposal_stats['won'] / (proposal_stats['won'] + proposal_stats['lost'])) * 100
        
        return {
            "stages": stages,
            "totals": totals,
            "proposal_stats": proposal_stats,
            "win_rate": round(win_rate, 1),
            "recent_proposals": recent_proposals
        }
    finally:
        conn.close()


# Initialize tables
try:
    init_business_ops_tables()
except Exception as e:
    print(f"Warning: Could not initialize business ops tables: {e}")
