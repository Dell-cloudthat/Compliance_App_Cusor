"""
Consulting Service - Professional Services Platform

Supports consulting engagements with:
- Engagement management and tracking
- Proprietary assessments and gap analysis
- Roadmap and budget planning
- MSP portfolio management
- Report generation
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"
SCHEMA_PATH = Path(__file__).parent.parent / "database" / "consulting_schema.sql"


def get_db():
    """Get database connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_consulting_tables():
    """Initialize consulting tables from schema."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        with open(SCHEMA_PATH, 'r') as f:
            schema = f.read()
            cursor.executescript(schema)
        conn.commit()
        print("Consulting tables initialized successfully")
    except Exception as e:
        print(f"Schema execution warning: {e}")
        conn.commit()
    finally:
        conn.close()


# ============================================================================
# ENGAGEMENT MANAGEMENT
# ============================================================================

def create_engagement(
    user_id: int,
    engagement_name: str,
    engagement_type: str,
    service_areas: List[str],
    client_org_id: Optional[int] = None,
    frameworks_in_scope: Optional[List[str]] = None,
    start_date: Optional[str] = None,
    target_end_date: Optional[str] = None,
    engagement_value: float = 0.0,
    billing_type: str = 'fixed',
    primary_contact_name: Optional[str] = None,
    primary_contact_email: Optional[str] = None,
    engagement_notes: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new consulting engagement."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO consulting_engagements (
                user_id, client_org_id, engagement_name, engagement_type,
                service_areas, frameworks_in_scope, start_date, target_end_date,
                engagement_value, billing_type, primary_contact_name,
                primary_contact_email, engagement_notes, engagement_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discovery')
        """, (
            user_id, client_org_id, engagement_name, engagement_type,
            json.dumps(service_areas), json.dumps(frameworks_in_scope or []),
            start_date, target_end_date, engagement_value, billing_type,
            primary_contact_name, primary_contact_email, engagement_notes
        ))
        conn.commit()
        
        engagement_id = cursor.lastrowid
        
        # Create default milestones based on engagement type
        default_milestones = _get_default_milestones(engagement_type)
        for milestone in default_milestones:
            cursor.execute("""
                INSERT INTO engagement_milestones (
                    engagement_id, milestone_name, milestone_type, description, status
                ) VALUES (?, ?, ?, ?, 'pending')
            """, (engagement_id, milestone['name'], milestone['type'], milestone['description']))
        conn.commit()
        
        return {
            "id": engagement_id,
            "engagement_name": engagement_name,
            "engagement_type": engagement_type,
            "status": "discovery",
            "message": "Engagement created successfully"
        }
    finally:
        conn.close()


def _get_default_milestones(engagement_type: str) -> List[Dict[str, str]]:
    """Get default milestones based on engagement type."""
    milestones = {
        'assessment': [
            {'name': 'Project Kickoff', 'type': 'kickoff', 'description': 'Initial project kickoff meeting'},
            {'name': 'Data Collection Complete', 'type': 'assessment_complete', 'description': 'All client data and evidence collected'},
            {'name': 'Assessment Complete', 'type': 'assessment_complete', 'description': 'Assessment scoring and analysis complete'},
            {'name': 'Report Delivery', 'type': 'report_delivery', 'description': 'Final assessment report delivered'},
            {'name': 'Findings Review', 'type': 'review', 'description': 'Review findings with client stakeholders'},
        ],
        'gap_analysis': [
            {'name': 'Project Kickoff', 'type': 'kickoff', 'description': 'Initial project kickoff meeting'},
            {'name': 'Current State Assessment', 'type': 'assessment_complete', 'description': 'Document current state'},
            {'name': 'Gap Identification', 'type': 'assessment_complete', 'description': 'Identify and document all gaps'},
            {'name': 'Remediation Planning', 'type': 'roadmap_approval', 'description': 'Create remediation recommendations'},
            {'name': 'Report Delivery', 'type': 'report_delivery', 'description': 'Deliver gap analysis report'},
        ],
        'roadmap': [
            {'name': 'Project Kickoff', 'type': 'kickoff', 'description': 'Initial project kickoff meeting'},
            {'name': 'Assessment Review', 'type': 'assessment_complete', 'description': 'Review existing assessments'},
            {'name': 'Draft Roadmap', 'type': 'roadmap_approval', 'description': 'Create draft roadmap'},
            {'name': 'Budget Planning', 'type': 'roadmap_approval', 'description': 'Develop budget estimates'},
            {'name': 'Roadmap Approval', 'type': 'roadmap_approval', 'description': 'Client approval of roadmap'},
            {'name': 'Final Delivery', 'type': 'report_delivery', 'description': 'Deliver final roadmap package'},
        ],
        'implementation': [
            {'name': 'Project Kickoff', 'type': 'kickoff', 'description': 'Initial project kickoff meeting'},
            {'name': 'Phase 1 Complete', 'type': 'implementation', 'description': 'Complete first implementation phase'},
            {'name': 'Phase 2 Complete', 'type': 'implementation', 'description': 'Complete second implementation phase'},
            {'name': 'Testing & Validation', 'type': 'implementation', 'description': 'Test and validate implementations'},
            {'name': 'Project Closeout', 'type': 'review', 'description': 'Final review and project closeout'},
        ],
        'managed_services': [
            {'name': 'Onboarding Complete', 'type': 'kickoff', 'description': 'Client onboarding complete'},
            {'name': 'First Monthly Review', 'type': 'review', 'description': 'First monthly service review'},
            {'name': 'Quarterly Business Review', 'type': 'review', 'description': 'Quarterly business review'},
        ],
        'audit_prep': [
            {'name': 'Project Kickoff', 'type': 'kickoff', 'description': 'Initial project kickoff meeting'},
            {'name': 'Evidence Collection', 'type': 'assessment_complete', 'description': 'Collect all audit evidence'},
            {'name': 'Gap Remediation', 'type': 'implementation', 'description': 'Address identified gaps'},
            {'name': 'Mock Audit', 'type': 'assessment_complete', 'description': 'Conduct mock audit'},
            {'name': 'Audit Ready', 'type': 'review', 'description': 'Client ready for external audit'},
        ],
    }
    return milestones.get(engagement_type, [
        {'name': 'Project Kickoff', 'type': 'kickoff', 'description': 'Initial project kickoff meeting'},
        {'name': 'Project Complete', 'type': 'review', 'description': 'Project completion and closeout'},
    ])


def list_engagements(
    user_id: int,
    status: Optional[str] = None,
    client_org_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """List all engagements for a user."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = """
            SELECT e.*, c.organization_name as client_name
            FROM consulting_engagements e
            LEFT JOIN client_organizations c ON e.client_org_id = c.id
            WHERE e.user_id = ?
        """
        params = [user_id]
        
        if status:
            query += " AND e.engagement_status = ?"
            params.append(status)
        
        if client_org_id:
            query += " AND e.client_org_id = ?"
            params.append(client_org_id)
        
        query += " ORDER BY e.created_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        engagements = []
        for row in rows:
            eng = dict(row)
            eng['service_areas'] = json.loads(eng['service_areas']) if eng['service_areas'] else []
            eng['frameworks_in_scope'] = json.loads(eng['frameworks_in_scope']) if eng['frameworks_in_scope'] else []
            
            # Get milestone summary
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM engagement_milestones WHERE engagement_id = ?
            """, (eng['id'],))
            milestone_summary = cursor.fetchone()
            eng['milestones_total'] = milestone_summary['total']
            eng['milestones_completed'] = milestone_summary['completed']
            
            engagements.append(eng)
        
        return engagements
    finally:
        conn.close()


def get_engagement(engagement_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """Get detailed engagement information."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT e.*, c.organization_name as client_name
            FROM consulting_engagements e
            LEFT JOIN client_organizations c ON e.client_org_id = c.id
            WHERE e.id = ? AND e.user_id = ?
        """, (engagement_id, user_id))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        eng = dict(row)
        eng['service_areas'] = json.loads(eng['service_areas']) if eng['service_areas'] else []
        eng['frameworks_in_scope'] = json.loads(eng['frameworks_in_scope']) if eng['frameworks_in_scope'] else []
        
        # Get milestones
        cursor.execute("""
            SELECT * FROM engagement_milestones 
            WHERE engagement_id = ?
            ORDER BY id
        """, (engagement_id,))
        eng['milestones'] = [dict(m) for m in cursor.fetchall()]
        
        # Get time entries summary
        cursor.execute("""
            SELECT 
                SUM(hours) as total_hours,
                SUM(CASE WHEN billable = 1 THEN hours ELSE 0 END) as billable_hours
            FROM engagement_time_entries WHERE engagement_id = ?
        """, (engagement_id,))
        time_summary = cursor.fetchone()
        eng['total_hours'] = time_summary['total_hours'] or 0
        eng['billable_hours'] = time_summary['billable_hours'] or 0
        
        return eng
    finally:
        conn.close()


def update_engagement_status(
    engagement_id: int,
    user_id: int,
    status: str
) -> Dict[str, Any]:
    """Update engagement status."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE consulting_engagements 
            SET engagement_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        """, (status, engagement_id, user_id))
        conn.commit()
        
        return {"success": True, "status": status}
    finally:
        conn.close()


def log_time_entry(
    engagement_id: int,
    user_id: int,
    hours: float,
    activity_type: str,
    description: Optional[str] = None,
    entry_date: Optional[str] = None,
    billable: bool = True
) -> Dict[str, Any]:
    """Log time entry for an engagement."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO engagement_time_entries (
                engagement_id, user_id, entry_date, hours,
                activity_type, description, billable
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            engagement_id, user_id,
            entry_date or datetime.now().strftime('%Y-%m-%d'),
            hours, activity_type, description, billable
        ))
        
        # Update engagement hours
        cursor.execute("""
            UPDATE consulting_engagements 
            SET hours_actual = hours_actual + ?
            WHERE id = ?
        """, (hours, engagement_id))
        
        conn.commit()
        
        return {"success": True, "hours_logged": hours}
    finally:
        conn.close()


# ============================================================================
# ASSESSMENT & GAP ANALYSIS
# ============================================================================

def create_assessment_template(
    user_id: int,
    template_name: str,
    template_type: str,
    categories: List[Dict[str, Any]],
    questions: List[Dict[str, Any]],
    description: Optional[str] = None,
    scoring_methodology: Optional[Dict[str, Any]] = None,
    maturity_levels: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """Create a proprietary assessment template."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Default maturity levels if not provided
    if not maturity_levels:
        maturity_levels = [
            {"level": 1, "name": "Initial", "description": "Ad hoc processes, no formal controls"},
            {"level": 2, "name": "Developing", "description": "Basic processes documented, inconsistent execution"},
            {"level": 3, "name": "Defined", "description": "Standardized processes, consistent execution"},
            {"level": 4, "name": "Managed", "description": "Measured and controlled processes"},
            {"level": 5, "name": "Optimizing", "description": "Continuous improvement, industry-leading"}
        ]
    
    try:
        cursor.execute("""
            INSERT INTO assessment_templates (
                user_id, template_name, template_type, description,
                scoring_methodology, maturity_levels, categories, questions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, template_name, template_type, description,
            json.dumps(scoring_methodology or {}),
            json.dumps(maturity_levels),
            json.dumps(categories),
            json.dumps(questions)
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "template_name": template_name,
            "question_count": len(questions),
            "message": "Assessment template created"
        }
    finally:
        conn.close()


def get_assessment_templates(user_id: int, template_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get assessment templates."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM assessment_templates WHERE user_id = ? AND is_active = 1"
        params = [user_id]
        
        if template_type:
            query += " AND template_type = ?"
            params.append(template_type)
        
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        templates = []
        for row in rows:
            t = dict(row)
            t['categories'] = json.loads(t['categories']) if t['categories'] else []
            t['questions'] = json.loads(t['questions']) if t['questions'] else []
            t['maturity_levels'] = json.loads(t['maturity_levels']) if t['maturity_levels'] else []
            t['scoring_methodology'] = json.loads(t['scoring_methodology']) if t['scoring_methodology'] else {}
            templates.append(t)
        
        return templates
    finally:
        conn.close()


def create_assessment(
    user_id: int,
    template_id: int,
    assessment_name: str,
    client_org_id: Optional[int] = None,
    engagement_id: Optional[int] = None,
    assessor_name: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new assessment instance."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO assessment_instances (
                template_id, engagement_id, client_org_id, user_id,
                assessment_name, assessment_date, assessor_name,
                responses, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 'draft')
        """, (
            template_id, engagement_id, client_org_id, user_id,
            assessment_name, datetime.now().strftime('%Y-%m-%d'), assessor_name
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "assessment_name": assessment_name,
            "status": "draft",
            "message": "Assessment created"
        }
    finally:
        conn.close()


def submit_assessment_responses(
    assessment_id: int,
    user_id: int,
    responses: Dict[str, Any]
) -> Dict[str, Any]:
    """Submit responses and calculate scores for an assessment."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get template
        cursor.execute("""
            SELECT a.*, t.questions, t.categories, t.maturity_levels, t.scoring_methodology
            FROM assessment_instances a
            JOIN assessment_templates t ON a.template_id = t.id
            WHERE a.id = ? AND a.user_id = ?
        """, (assessment_id, user_id))
        
        row = cursor.fetchone()
        if not row:
            return {"error": "Assessment not found"}
        
        template_questions = json.loads(row['questions'])
        template_categories = json.loads(row['categories'])
        maturity_levels = json.loads(row['maturity_levels'])
        
        # Calculate scores
        category_scores = {}
        total_score = 0
        total_weight = 0
        strengths = []
        weaknesses = []
        gaps = []
        
        for category in template_categories:
            cat_id = category.get('id', category.get('name'))
            cat_questions = [q for q in template_questions if q.get('category') == cat_id]
            
            cat_score = 0
            cat_max = 0
            
            for q in cat_questions:
                q_id = q.get('id')
                q_weight = q.get('weight', 1)
                response = responses.get(q_id, {})
                score = response.get('score', 0)
                max_score = q.get('max_score', 5)
                
                cat_score += score * q_weight
                cat_max += max_score * q_weight
                
                # Identify strengths and weaknesses
                percentage = (score / max_score * 100) if max_score > 0 else 0
                if percentage >= 80:
                    strengths.append({
                        "question_id": q_id,
                        "question": q.get('text'),
                        "score_percentage": percentage
                    })
                elif percentage < 50:
                    weaknesses.append({
                        "question_id": q_id,
                        "question": q.get('text'),
                        "score_percentage": percentage
                    })
                    gaps.append({
                        "question_id": q_id,
                        "question": q.get('text'),
                        "category": cat_id,
                        "current_score": score,
                        "target_score": max_score,
                        "gap_size": max_score - score
                    })
            
            cat_percentage = (cat_score / cat_max * 100) if cat_max > 0 else 0
            category_scores[cat_id] = {
                "score": cat_score,
                "max_score": cat_max,
                "percentage": round(cat_percentage, 1)
            }
            
            total_score += cat_score
            total_weight += cat_max
        
        # Calculate overall score and maturity level
        overall_percentage = (total_score / total_weight * 100) if total_weight > 0 else 0
        maturity_level = _calculate_maturity_level(overall_percentage, maturity_levels)
        
        # Generate recommendations
        recommendations = _generate_recommendations(gaps, weaknesses)
        
        # Update assessment
        cursor.execute("""
            UPDATE assessment_instances SET
                responses = ?,
                category_scores = ?,
                overall_score = ?,
                maturity_level = ?,
                maturity_level_name = ?,
                strengths = ?,
                weaknesses = ?,
                gaps = ?,
                recommendations = ?,
                status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            json.dumps(responses),
            json.dumps(category_scores),
            round(overall_percentage, 1),
            maturity_level['level'],
            maturity_level['name'],
            json.dumps(strengths[:10]),
            json.dumps(weaknesses[:10]),
            json.dumps(gaps),
            json.dumps(recommendations),
            assessment_id
        ))
        conn.commit()
        
        return {
            "success": True,
            "overall_score": round(overall_percentage, 1),
            "maturity_level": maturity_level,
            "category_scores": category_scores,
            "gaps_identified": len(gaps),
            "strengths_count": len(strengths),
            "weaknesses_count": len(weaknesses),
            "recommendations": recommendations
        }
    finally:
        conn.close()


def _calculate_maturity_level(score: float, maturity_levels: List[Dict]) -> Dict:
    """Calculate maturity level based on score."""
    # Default thresholds: 0-20 = Level 1, 20-40 = Level 2, etc.
    if score < 20:
        level = 1
    elif score < 40:
        level = 2
    elif score < 60:
        level = 3
    elif score < 80:
        level = 4
    else:
        level = 5
    
    for ml in maturity_levels:
        if ml.get('level') == level:
            return ml
    
    return {"level": level, "name": f"Level {level}", "description": ""}


def _generate_recommendations(gaps: List[Dict], weaknesses: List[Dict]) -> List[Dict]:
    """Generate prioritized recommendations based on gaps."""
    recommendations = []
    
    # Sort gaps by size
    sorted_gaps = sorted(gaps, key=lambda x: x.get('gap_size', 0), reverse=True)
    
    for i, gap in enumerate(sorted_gaps[:10]):
        recommendations.append({
            "priority": i + 1,
            "title": f"Address gap in: {gap.get('question', 'Unknown')[:50]}",
            "category": gap.get('category'),
            "current_state": f"Score: {gap.get('current_score')}/{gap.get('target_score')}",
            "recommendation": "Implement controls and processes to address this gap",
            "effort": "moderate" if gap.get('gap_size', 0) <= 2 else "significant"
        })
    
    return recommendations


def create_gap_analysis(
    user_id: int,
    gap_title: str,
    gap_category: str,
    gap_description: str,
    client_org_id: Optional[int] = None,
    engagement_id: Optional[int] = None,
    assessment_id: Optional[int] = None,
    business_impact: str = 'medium',
    current_state: Optional[str] = None,
    target_state: Optional[str] = None,
    remediation_approach: Optional[str] = None,
    estimated_hours: Optional[float] = None,
    estimated_cost: Optional[float] = None
) -> Dict[str, Any]:
    """Create a gap analysis record."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Calculate priority score
    impact_scores = {'critical': 40, 'high': 30, 'medium': 20, 'low': 10}
    priority_score = impact_scores.get(business_impact, 20)
    
    try:
        cursor.execute("""
            INSERT INTO gap_analysis (
                user_id, client_org_id, engagement_id, assessment_id,
                gap_title, gap_category, gap_description,
                business_impact, current_state, target_state,
                remediation_approach, estimated_hours, estimated_cost,
                priority_score, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'identified')
        """, (
            user_id, client_org_id, engagement_id, assessment_id,
            gap_title, gap_category, gap_description,
            business_impact, current_state, target_state,
            remediation_approach, estimated_hours, estimated_cost,
            priority_score
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "gap_title": gap_title,
            "priority_score": priority_score,
            "message": "Gap analysis created"
        }
    finally:
        conn.close()


def list_gaps(
    user_id: int,
    client_org_id: Optional[int] = None,
    engagement_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """List gap analysis records."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM gap_analysis WHERE user_id = ?"
        params = [user_id]
        
        if client_org_id:
            query += " AND client_org_id = ?"
            params.append(client_org_id)
        
        if engagement_id:
            query += " AND engagement_id = ?"
            params.append(engagement_id)
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        query += " ORDER BY priority_score DESC"
        
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


# ============================================================================
# ROADMAP & BUDGET PLANNING
# ============================================================================

def create_roadmap(
    user_id: int,
    roadmap_name: str,
    roadmap_type: str,
    start_date: str,
    target_completion_date: str,
    client_org_id: Optional[int] = None,
    engagement_id: Optional[int] = None,
    description: Optional[str] = None,
    target_frameworks: Optional[List[str]] = None,
    target_maturity_level: Optional[int] = None,
    strategic_objectives: Optional[List[str]] = None,
    total_budget: float = 0.0
) -> Dict[str, Any]:
    """Create a compliance/security roadmap."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO client_roadmaps (
                user_id, client_org_id, engagement_id,
                roadmap_name, roadmap_type, description,
                start_date, target_completion_date,
                target_frameworks, target_maturity_level, strategic_objectives,
                total_budget, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        """, (
            user_id, client_org_id, engagement_id,
            roadmap_name, roadmap_type, description,
            start_date, target_completion_date,
            json.dumps(target_frameworks or []),
            target_maturity_level,
            json.dumps(strategic_objectives or []),
            total_budget
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "roadmap_name": roadmap_name,
            "status": "draft",
            "message": "Roadmap created"
        }
    finally:
        conn.close()


def add_roadmap_phase(
    roadmap_id: int,
    user_id: int,
    phase_name: str,
    phase_number: int,
    description: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    duration_weeks: Optional[int] = None,
    phase_objectives: Optional[List[str]] = None,
    phase_budget: float = 0.0
) -> Dict[str, Any]:
    """Add a phase to a roadmap."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO roadmap_phases (
                roadmap_id, phase_name, phase_number, description,
                start_date, end_date, duration_weeks,
                phase_objectives, phase_budget, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')
        """, (
            roadmap_id, phase_name, phase_number, description,
            start_date, end_date, duration_weeks,
            json.dumps(phase_objectives or []), phase_budget
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "phase_name": phase_name,
            "phase_number": phase_number,
            "message": "Phase added to roadmap"
        }
    finally:
        conn.close()


def add_roadmap_initiative(
    phase_id: int,
    roadmap_id: int,
    initiative_name: str,
    initiative_type: str,
    description: Optional[str] = None,
    estimated_hours: Optional[float] = None,
    budget_estimate: Optional[float] = None,
    budget_category: Optional[str] = None,
    priority: int = 3,
    controls_addressed: Optional[List[str]] = None,
    gaps_addressed: Optional[List[int]] = None
) -> Dict[str, Any]:
    """Add an initiative to a roadmap phase."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO roadmap_initiatives (
                phase_id, roadmap_id, initiative_name, initiative_type,
                description, estimated_hours, budget_estimate, budget_category,
                priority, controls_addressed, gaps_addressed, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')
        """, (
            phase_id, roadmap_id, initiative_name, initiative_type,
            description, estimated_hours, budget_estimate, budget_category,
            priority, json.dumps(controls_addressed or []),
            json.dumps(gaps_addressed or [])
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "initiative_name": initiative_name,
            "message": "Initiative added"
        }
    finally:
        conn.close()


def get_roadmap_with_details(roadmap_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """Get roadmap with all phases and initiatives."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT r.*, c.organization_name as client_name
            FROM client_roadmaps r
            LEFT JOIN client_organizations c ON r.client_org_id = c.id
            WHERE r.id = ? AND r.user_id = ?
        """, (roadmap_id, user_id))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        roadmap = dict(row)
        roadmap['target_frameworks'] = json.loads(roadmap['target_frameworks']) if roadmap['target_frameworks'] else []
        roadmap['strategic_objectives'] = json.loads(roadmap['strategic_objectives']) if roadmap['strategic_objectives'] else []
        
        # Get phases
        cursor.execute("""
            SELECT * FROM roadmap_phases WHERE roadmap_id = ?
            ORDER BY phase_number
        """, (roadmap_id,))
        
        phases = []
        for phase_row in cursor.fetchall():
            phase = dict(phase_row)
            phase['phase_objectives'] = json.loads(phase['phase_objectives']) if phase['phase_objectives'] else []
            
            # Get initiatives for this phase
            cursor.execute("""
                SELECT * FROM roadmap_initiatives WHERE phase_id = ?
                ORDER BY priority, id
            """, (phase['id'],))
            
            initiatives = []
            for init_row in cursor.fetchall():
                init = dict(init_row)
                init['controls_addressed'] = json.loads(init['controls_addressed']) if init['controls_addressed'] else []
                init['gaps_addressed'] = json.loads(init['gaps_addressed']) if init['gaps_addressed'] else []
                initiatives.append(init)
            
            phase['initiatives'] = initiatives
            phases.append(phase)
        
        roadmap['phases'] = phases
        
        # Calculate totals
        roadmap['total_initiatives'] = sum(len(p['initiatives']) for p in phases)
        roadmap['total_estimated_hours'] = sum(
            i.get('estimated_hours', 0) or 0 
            for p in phases 
            for i in p['initiatives']
        )
        roadmap['total_estimated_cost'] = sum(
            i.get('budget_estimate', 0) or 0 
            for p in phases 
            for i in p['initiatives']
        )
        
        return roadmap
    finally:
        conn.close()


def create_budget_plan(
    user_id: int,
    budget_name: str,
    budget_year: int,
    total_budget: float,
    budget_type: str = 'annual',
    client_org_id: Optional[int] = None,
    roadmap_id: Optional[int] = None,
    category_budgets: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a budget plan."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO budget_plans (
                user_id, client_org_id, roadmap_id,
                budget_name, budget_year, budget_type,
                total_budget, category_budgets, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        """, (
            user_id, client_org_id, roadmap_id,
            budget_name, budget_year, budget_type,
            total_budget, json.dumps(category_budgets or {})
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "budget_name": budget_name,
            "total_budget": total_budget,
            "message": "Budget plan created"
        }
    finally:
        conn.close()


# ============================================================================
# REPORT GENERATION
# ============================================================================

def create_report_template(
    user_id: int,
    template_name: str,
    template_type: str,
    sections: List[Dict[str, Any]],
    description: Optional[str] = None,
    branding_config: Optional[Dict[str, Any]] = None,
    data_sources: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Create a report template."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO report_templates (
                user_id, template_name, template_type, description,
                sections, branding_config, data_sources, output_formats
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, template_name, template_type, description,
            json.dumps(sections),
            json.dumps(branding_config or {}),
            json.dumps(data_sources or []),
            json.dumps(['pdf', 'html'])
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "template_name": template_name,
            "message": "Report template created"
        }
    finally:
        conn.close()


def generate_report(
    user_id: int,
    report_name: str,
    report_type: str,
    client_org_id: Optional[int] = None,
    engagement_id: Optional[int] = None,
    template_id: Optional[int] = None,
    report_data: Optional[Dict[str, Any]] = None,
    report_period_start: Optional[str] = None,
    report_period_end: Optional[str] = None
) -> Dict[str, Any]:
    """Generate a report."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Gather data based on report type
        if not report_data:
            report_data = _gather_report_data(
                user_id, report_type, client_org_id, engagement_id
            )
        
        # Generate report content
        report_content = _render_report_content(report_type, report_data)
        
        cursor.execute("""
            INSERT INTO generated_reports (
                user_id, client_org_id, engagement_id, template_id,
                report_name, report_type, report_data, report_content,
                report_period_start, report_period_end, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        """, (
            user_id, client_org_id, engagement_id, template_id,
            report_name, report_type, json.dumps(report_data), report_content,
            report_period_start, report_period_end
        ))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "report_name": report_name,
            "report_type": report_type,
            "report_content": report_content,
            "report_data": report_data,
            "message": "Report generated"
        }
    finally:
        conn.close()


def _gather_report_data(
    user_id: int,
    report_type: str,
    client_org_id: Optional[int],
    engagement_id: Optional[int]
) -> Dict[str, Any]:
    """Gather data for a report based on type."""
    conn = get_db()
    cursor = conn.cursor()
    
    data = {
        "generated_at": datetime.now().isoformat(),
        "report_type": report_type
    }
    
    try:
        # Get client info
        if client_org_id:
            cursor.execute("SELECT * FROM client_organizations WHERE id = ?", (client_org_id,))
            client = cursor.fetchone()
            if client:
                data['client'] = dict(client)
        
        # Get engagement info
        if engagement_id:
            cursor.execute("SELECT * FROM consulting_engagements WHERE id = ?", (engagement_id,))
            engagement = cursor.fetchone()
            if engagement:
                data['engagement'] = dict(engagement)
        
        # Type-specific data
        if report_type == 'assessment_report':
            cursor.execute("""
                SELECT * FROM assessment_instances 
                WHERE user_id = ? AND client_org_id = ?
                ORDER BY created_at DESC LIMIT 1
            """, (user_id, client_org_id))
            assessment = cursor.fetchone()
            if assessment:
                a = dict(assessment)
                a['category_scores'] = json.loads(a['category_scores']) if a['category_scores'] else {}
                a['strengths'] = json.loads(a['strengths']) if a['strengths'] else []
                a['weaknesses'] = json.loads(a['weaknesses']) if a['weaknesses'] else []
                a['gaps'] = json.loads(a['gaps']) if a['gaps'] else []
                a['recommendations'] = json.loads(a['recommendations']) if a['recommendations'] else []
                data['assessment'] = a
        
        elif report_type == 'gap_analysis':
            cursor.execute("""
                SELECT * FROM gap_analysis 
                WHERE user_id = ? AND client_org_id = ?
                ORDER BY priority_score DESC
            """, (user_id, client_org_id))
            data['gaps'] = [dict(g) for g in cursor.fetchall()]
        
        elif report_type == 'roadmap':
            cursor.execute("""
                SELECT id FROM client_roadmaps 
                WHERE user_id = ? AND client_org_id = ?
                ORDER BY created_at DESC LIMIT 1
            """, (user_id, client_org_id))
            roadmap_row = cursor.fetchone()
            if roadmap_row:
                data['roadmap'] = get_roadmap_with_details(roadmap_row['id'], user_id)
        
        elif report_type == 'executive_summary':
            # Combine multiple data sources
            data['summary'] = {
                "compliance_score": 0,
                "gaps_total": 0,
                "gaps_critical": 0,
                "initiatives_planned": 0,
                "budget_total": 0
            }
            
            # Get latest assessment score
            cursor.execute("""
                SELECT overall_score FROM assessment_instances 
                WHERE user_id = ? AND client_org_id = ?
                ORDER BY created_at DESC LIMIT 1
            """, (user_id, client_org_id))
            score_row = cursor.fetchone()
            if score_row:
                data['summary']['compliance_score'] = score_row['overall_score']
            
            # Get gap counts
            cursor.execute("""
                SELECT COUNT(*) as total,
                    SUM(CASE WHEN business_impact = 'critical' THEN 1 ELSE 0 END) as critical
                FROM gap_analysis WHERE user_id = ? AND client_org_id = ?
            """, (user_id, client_org_id))
            gap_row = cursor.fetchone()
            if gap_row:
                data['summary']['gaps_total'] = gap_row['total'] or 0
                data['summary']['gaps_critical'] = gap_row['critical'] or 0
        
        return data
    finally:
        conn.close()


def _render_report_content(report_type: str, report_data: Dict[str, Any]) -> str:
    """Render report content as HTML/Markdown."""
    content = []
    
    content.append(f"# {report_type.replace('_', ' ').title()} Report")
    content.append(f"\n**Generated:** {report_data.get('generated_at', 'N/A')}\n")
    
    if 'client' in report_data:
        client = report_data['client']
        content.append(f"\n## Client Information")
        content.append(f"- **Organization:** {client.get('organization_name', 'N/A')}")
        content.append(f"- **Type:** {client.get('organization_type', 'N/A')}")
        content.append(f"- **Industry:** {client.get('industry_vertical', 'N/A')}")
    
    if report_type == 'assessment_report' and 'assessment' in report_data:
        assessment = report_data['assessment']
        content.append(f"\n## Assessment Results")
        content.append(f"- **Overall Score:** {assessment.get('overall_score', 0)}%")
        content.append(f"- **Maturity Level:** {assessment.get('maturity_level_name', 'N/A')}")
        
        if assessment.get('category_scores'):
            content.append(f"\n### Category Scores")
            for cat, scores in assessment['category_scores'].items():
                content.append(f"- **{cat}:** {scores.get('percentage', 0)}%")
        
        if assessment.get('strengths'):
            content.append(f"\n### Key Strengths")
            for s in assessment['strengths'][:5]:
                content.append(f"- {s.get('question', '')[:100]}")
        
        if assessment.get('weaknesses'):
            content.append(f"\n### Areas for Improvement")
            for w in assessment['weaknesses'][:5]:
                content.append(f"- {w.get('question', '')[:100]}")
        
        if assessment.get('recommendations'):
            content.append(f"\n### Recommendations")
            for r in assessment['recommendations'][:5]:
                content.append(f"{r.get('priority', 0)}. {r.get('title', '')}")
    
    elif report_type == 'gap_analysis' and 'gaps' in report_data:
        gaps = report_data['gaps']
        content.append(f"\n## Gap Analysis Summary")
        content.append(f"- **Total Gaps Identified:** {len(gaps)}")
        
        critical = [g for g in gaps if g.get('business_impact') == 'critical']
        high = [g for g in gaps if g.get('business_impact') == 'high']
        content.append(f"- **Critical Gaps:** {len(critical)}")
        content.append(f"- **High Priority Gaps:** {len(high)}")
        
        content.append(f"\n### Gap Details")
        for gap in gaps[:10]:
            content.append(f"\n#### {gap.get('gap_title', 'Untitled Gap')}")
            content.append(f"- **Category:** {gap.get('gap_category', 'N/A')}")
            content.append(f"- **Business Impact:** {gap.get('business_impact', 'N/A')}")
            content.append(f"- **Status:** {gap.get('status', 'N/A')}")
            if gap.get('remediation_approach'):
                content.append(f"- **Remediation:** {gap.get('remediation_approach')}")
    
    elif report_type == 'executive_summary' and 'summary' in report_data:
        summary = report_data['summary']
        content.append(f"\n## Executive Summary")
        content.append(f"\n### Current State")
        content.append(f"- **Compliance Score:** {summary.get('compliance_score', 0)}%")
        content.append(f"- **Total Gaps:** {summary.get('gaps_total', 0)}")
        content.append(f"- **Critical Gaps:** {summary.get('gaps_critical', 0)}")
    
    return "\n".join(content)


# ============================================================================
# MSP PORTFOLIO MANAGEMENT
# ============================================================================

def create_msp_portfolio(user_id: int, portfolio_name: str, description: Optional[str] = None) -> Dict[str, Any]:
    """Create an MSP portfolio for managing multiple clients."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO msp_portfolio (user_id, portfolio_name, description)
            VALUES (?, ?, ?)
        """, (user_id, portfolio_name, description))
        conn.commit()
        
        return {
            "id": cursor.lastrowid,
            "portfolio_name": portfolio_name,
            "message": "Portfolio created"
        }
    finally:
        conn.close()


def add_client_to_portfolio(
    portfolio_id: int,
    client_org_id: int,
    client_name: str,
    contract_type: str = 'managed',
    contract_value: float = 0.0,
    mrr: float = 0.0,
    service_tier: str = 'standard',
    primary_framework: Optional[str] = None
) -> Dict[str, Any]:
    """Add a client to the MSP portfolio."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO msp_client_summary (
                portfolio_id, client_org_id, client_name,
                contract_type, contract_value, mrr,
                service_tier, primary_framework, health_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 100)
        """, (
            portfolio_id, client_org_id, client_name,
            contract_type, contract_value, mrr,
            service_tier, primary_framework
        ))
        
        # Update portfolio totals
        cursor.execute("""
            UPDATE msp_portfolio SET
                total_clients = total_clients + 1,
                total_mrr = total_mrr + ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (mrr, portfolio_id))
        
        conn.commit()
        
        return {
            "success": True,
            "client_name": client_name,
            "message": "Client added to portfolio"
        }
    finally:
        conn.close()


def get_msp_portfolio_dashboard(user_id: int, portfolio_id: Optional[int] = None) -> Dict[str, Any]:
    """Get MSP portfolio dashboard with all client summaries."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Get portfolio(s)
        if portfolio_id:
            cursor.execute("""
                SELECT * FROM msp_portfolio WHERE id = ? AND user_id = ?
            """, (portfolio_id, user_id))
        else:
            cursor.execute("""
                SELECT * FROM msp_portfolio WHERE user_id = ?
            """, (user_id,))
        
        portfolios = [dict(p) for p in cursor.fetchall()]
        
        for portfolio in portfolios:
            # Get client summaries
            cursor.execute("""
                SELECT * FROM msp_client_summary 
                WHERE portfolio_id = ?
                ORDER BY health_score ASC
            """, (portfolio['id'],))
            
            clients = []
            for client_row in cursor.fetchall():
                client = dict(client_row)
                client['services_enabled'] = json.loads(client['services_enabled']) if client['services_enabled'] else []
                client['health_factors'] = json.loads(client['health_factors']) if client['health_factors'] else {}
                clients.append(client)
            
            portfolio['clients'] = clients
            
            # Calculate portfolio metrics
            portfolio['clients_by_risk'] = {
                'critical': len([c for c in clients if c.get('risk_rating') == 'critical']),
                'high': len([c for c in clients if c.get('risk_rating') == 'high']),
                'medium': len([c for c in clients if c.get('risk_rating') == 'medium']),
                'low': len([c for c in clients if c.get('risk_rating') == 'low'])
            }
            
            scores = [c.get('compliance_score') or 0 for c in clients if c.get('compliance_score')]
            portfolio['avg_compliance_score'] = sum(scores) / len(scores) if scores else 0
            
            portfolio['total_open_gaps'] = sum(c.get('open_gaps', 0) for c in clients)
        
        return {
            "portfolios": portfolios,
            "total_portfolios": len(portfolios),
            "total_clients": sum(len(p['clients']) for p in portfolios),
            "total_mrr": sum(p.get('total_mrr', 0) for p in portfolios)
        }
    finally:
        conn.close()


def update_client_metrics(
    client_summary_id: int,
    compliance_score: Optional[float] = None,
    risk_rating: Optional[str] = None,
    open_gaps: Optional[int] = None,
    health_score: Optional[int] = None
) -> Dict[str, Any]:
    """Update client metrics in MSP portfolio."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        updates = []
        params = []
        
        if compliance_score is not None:
            updates.append("compliance_score = ?")
            params.append(compliance_score)
        
        if risk_rating:
            updates.append("risk_rating = ?")
            params.append(risk_rating)
        
        if open_gaps is not None:
            updates.append("open_gaps = ?")
            params.append(open_gaps)
        
        if health_score is not None:
            updates.append("health_score = ?")
            params.append(health_score)
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(client_summary_id)
            
            cursor.execute(f"""
                UPDATE msp_client_summary SET {', '.join(updates)}
                WHERE id = ?
            """, params)
            conn.commit()
        
        return {"success": True, "message": "Client metrics updated"}
    finally:
        conn.close()


# ============================================================================
# DEFAULT TEMPLATES
# ============================================================================

def create_default_assessment_template(user_id: int) -> Dict[str, Any]:
    """Create a default security maturity assessment template."""
    categories = [
        {"id": "governance", "name": "Governance & Risk Management", "weight": 1.0},
        {"id": "access_control", "name": "Access Control", "weight": 1.0},
        {"id": "data_protection", "name": "Data Protection", "weight": 1.0},
        {"id": "security_operations", "name": "Security Operations", "weight": 1.0},
        {"id": "incident_response", "name": "Incident Response", "weight": 1.0},
        {"id": "vendor_management", "name": "Vendor Management", "weight": 0.8},
        {"id": "compliance", "name": "Compliance & Audit", "weight": 0.8}
    ]
    
    questions = [
        # Governance
        {"id": "gov_1", "category": "governance", "text": "Is there a documented information security policy?", "max_score": 5, "weight": 2},
        {"id": "gov_2", "category": "governance", "text": "Is there an appointed security leadership (CISO/Security Manager)?", "max_score": 5, "weight": 1.5},
        {"id": "gov_3", "category": "governance", "text": "Is there a formal risk assessment process?", "max_score": 5, "weight": 2},
        {"id": "gov_4", "category": "governance", "text": "Are security responsibilities clearly defined?", "max_score": 5, "weight": 1},
        
        # Access Control
        {"id": "ac_1", "category": "access_control", "text": "Is multi-factor authentication implemented for all users?", "max_score": 5, "weight": 2},
        {"id": "ac_2", "category": "access_control", "text": "Is there a formal access provisioning/deprovisioning process?", "max_score": 5, "weight": 1.5},
        {"id": "ac_3", "category": "access_control", "text": "Are user access reviews conducted regularly?", "max_score": 5, "weight": 1.5},
        {"id": "ac_4", "category": "access_control", "text": "Is privileged access management implemented?", "max_score": 5, "weight": 2},
        
        # Data Protection
        {"id": "dp_1", "category": "data_protection", "text": "Is data classified and inventoried?", "max_score": 5, "weight": 1.5},
        {"id": "dp_2", "category": "data_protection", "text": "Is encryption implemented for data at rest?", "max_score": 5, "weight": 2},
        {"id": "dp_3", "category": "data_protection", "text": "Is encryption implemented for data in transit?", "max_score": 5, "weight": 2},
        {"id": "dp_4", "category": "data_protection", "text": "Is there a data retention and disposal policy?", "max_score": 5, "weight": 1},
        
        # Security Operations
        {"id": "so_1", "category": "security_operations", "text": "Is endpoint detection and response (EDR) deployed?", "max_score": 5, "weight": 2},
        {"id": "so_2", "category": "security_operations", "text": "Is centralized logging implemented (SIEM)?", "max_score": 5, "weight": 2},
        {"id": "so_3", "category": "security_operations", "text": "Are vulnerability scans conducted regularly?", "max_score": 5, "weight": 1.5},
        {"id": "so_4", "category": "security_operations", "text": "Is patch management process defined and followed?", "max_score": 5, "weight": 1.5},
        
        # Incident Response
        {"id": "ir_1", "category": "incident_response", "text": "Is there a documented incident response plan?", "max_score": 5, "weight": 2},
        {"id": "ir_2", "category": "incident_response", "text": "Are incident response drills conducted?", "max_score": 5, "weight": 1},
        {"id": "ir_3", "category": "incident_response", "text": "Is there a 24/7 security monitoring capability?", "max_score": 5, "weight": 1.5},
        
        # Vendor Management
        {"id": "vm_1", "category": "vendor_management", "text": "Is there a vendor risk assessment process?", "max_score": 5, "weight": 1.5},
        {"id": "vm_2", "category": "vendor_management", "text": "Are vendor security requirements documented in contracts?", "max_score": 5, "weight": 1},
        
        # Compliance
        {"id": "comp_1", "category": "compliance", "text": "Are compliance requirements identified and tracked?", "max_score": 5, "weight": 1.5},
        {"id": "comp_2", "category": "compliance", "text": "Are internal security audits conducted?", "max_score": 5, "weight": 1},
        {"id": "comp_3", "category": "compliance", "text": "Is evidence collection automated where possible?", "max_score": 5, "weight": 1},
    ]
    
    return create_assessment_template(
        user_id=user_id,
        template_name="Security Maturity Assessment",
        template_type="security_maturity",
        categories=categories,
        questions=questions,
        description="Comprehensive security maturity assessment covering governance, access control, data protection, security operations, incident response, vendor management, and compliance."
    )


# Initialize tables when module is imported
try:
    init_consulting_tables()
except Exception as e:
    print(f"Warning: Could not initialize consulting tables: {e}")
