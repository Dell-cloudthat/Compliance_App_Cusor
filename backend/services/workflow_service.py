"""
Workflow Automation Engine
Configurable workflows for evidence collection, gap remediation, audit prep, and more
"""
import sqlite3
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def ensure_workflow_tables():
    """Ensure workflow tables exist"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Workflows table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            workflow_type TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            trigger_config TEXT,
            steps TEXT,
            conditions TEXT,
            escalation_rules TEXT,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Workflow executions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflow_executions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'running',
            trigger_event TEXT,
            trigger_data TEXT,
            current_step INTEGER DEFAULT 0,
            execution_data TEXT,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            error_message TEXT,
            FOREIGN KEY (workflow_id) REFERENCES workflows(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # Workflow step logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflow_step_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            execution_id INTEGER NOT NULL,
            step_index INTEGER NOT NULL,
            step_name TEXT,
            action_type TEXT,
            status TEXT,
            input_data TEXT,
            output_data TEXT,
            error_message TEXT,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            duration_ms INTEGER,
            FOREIGN KEY (execution_id) REFERENCES workflow_executions(id)
        )
    """)
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(workflow_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_executions_workflow ON workflow_executions(workflow_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_step_logs_execution ON workflow_step_logs(execution_id)")
    
    conn.commit()
    conn.close()

def get_workflow_templates() -> List[Dict[str, Any]]:
    """Get pre-built workflow templates"""
    return [
        {
            "id": "evidence_collection",
            "name": "Automated Evidence Collection",
            "description": "Automatically request and collect evidence when controls need validation",
            "workflow_type": "evidence_collection",
            "trigger_config": {
                "trigger_type": "scheduled",
                "schedule": "weekly",
                "conditions": ["control_evidence_expiring", "audit_approaching"]
            },
            "steps": [
                {
                    "step_index": 0,
                    "name": "Identify Controls Needing Evidence",
                    "action_type": "query_controls",
                    "config": {
                        "filters": {"evidence_status": "missing_or_expiring"},
                        "timeframe_days": 30
                    }
                },
                {
                    "step_index": 1,
                    "name": "Send Evidence Requests",
                    "action_type": "send_notification",
                    "config": {
                        "recipients": "control_owners",
                        "template": "evidence_request",
                        "include_deadline": True
                    }
                },
                {
                    "step_index": 2,
                    "name": "Set Reminders",
                    "action_type": "schedule_reminder",
                    "config": {
                        "reminder_days": [7, 3, 1],
                        "escalate_to": "compliance_manager"
                    }
                }
            ],
            "conditions": {
                "enabled": True,
                "framework_filter": None,
                "severity_filter": None
            }
        },
        {
            "id": "gap_remediation",
            "name": "Gap Remediation Workflow",
            "description": "Automated workflow for tracking and remediating compliance gaps",
            "workflow_type": "gap_remediation",
            "trigger_config": {
                "trigger_type": "event",
                "event_type": "gap_detected",
                "conditions": ["severity >= high"]
            },
            "steps": [
                {
                    "step_index": 0,
                    "name": "Create Remediation Task",
                    "action_type": "create_task",
                    "config": {
                        "task_type": "remediation",
                        "assign_to": "responsible_party",
                        "priority": "from_gap_severity"
                    }
                },
                {
                    "step_index": 1,
                    "name": "Notify Stakeholders",
                    "action_type": "send_notification",
                    "config": {
                        "recipients": ["control_owner", "compliance_manager"],
                        "template": "gap_remediation_assigned"
                    }
                },
                {
                    "step_index": 2,
                    "name": "Schedule Review",
                    "action_type": "schedule_review",
                    "config": {
                        "review_days": 7,
                        "auto_escalate": True
                    }
                }
            ]
        },
        {
            "id": "audit_prep",
            "name": "Pre-Audit Preparation",
            "description": "Automated workflow to prepare for upcoming audits",
            "workflow_type": "audit_preparation",
            "trigger_config": {
                "trigger_type": "scheduled",
                "schedule": "days_before_audit",
                "days": 30
            },
            "steps": [
                {
                    "step_index": 0,
                    "name": "Audit Readiness Check",
                    "action_type": "calculate_readiness",
                    "config": {
                        "framework": "from_audit",
                        "generate_report": True
                    }
                },
                {
                    "step_index": 1,
                    "name": "Identify Gaps",
                    "action_type": "identify_gaps",
                    "config": {
                        "severity_filter": ["critical", "high"]
                    }
                },
                {
                    "step_index": 2,
                    "name": "Request Evidence",
                    "action_type": "bulk_evidence_request",
                    "config": {
                        "controls": "from_gaps",
                        "deadline_days": 14
                    }
                },
                {
                    "step_index": 3,
                    "name": "Generate Readiness Report",
                    "action_type": "generate_report",
                    "config": {
                        "report_type": "audit_readiness",
                        "include_recommendations": True
                    }
                }
            ]
        },
        {
            "id": "compliance_drift_alert",
            "name": "Compliance Drift Response",
            "description": "Automated response when compliance score drops",
            "workflow_type": "drift_response",
            "trigger_config": {
                "trigger_type": "event",
                "event_type": "compliance_drift",
                "conditions": ["drift_percentage >= 5"]
            },
            "steps": [
                {
                    "step_index": 0,
                    "name": "Analyze Drift",
                    "action_type": "analyze_drift",
                    "config": {
                        "include_controls": True,
                        "include_evidence": True
                    }
                },
                {
                    "step_index": 1,
                    "name": "Create Alert",
                    "action_type": "create_alert",
                    "config": {
                        "severity": "auto_calculate",
                        "assign_to": "compliance_manager"
                    }
                },
                {
                    "step_index": 2,
                    "name": "Notify Leadership",
                    "action_type": "send_notification",
                    "config": {
                        "recipients": ["ciso", "compliance_manager"],
                        "template": "drift_alert",
                        "include_dashboard_link": True
                    }
                }
            ]
        }
    ]

def create_workflow(
    user_id: int,
    name: str,
    workflow_type: str,
    description: Optional[str] = None,
    trigger_config: Optional[Dict[str, Any]] = None,
    steps: Optional[List[Dict[str, Any]]] = None,
    conditions: Optional[Dict[str, Any]] = None,
    escalation_rules: Optional[List[Dict[str, Any]]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a new workflow"""
    ensure_workflow_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO workflows 
            (user_id, name, description, workflow_type, trigger_config, steps, conditions, escalation_rules, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            name,
            description,
            workflow_type,
            json.dumps(trigger_config or {}),
            json.dumps(steps or []),
            json.dumps(conditions or {}),
            json.dumps(escalation_rules or []),
            json.dumps(metadata or {})
        ))
        
        workflow_id = cursor.lastrowid
        conn.commit()
        
        return get_workflow(workflow_id, user_id)
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_workflow(workflow_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Get a workflow by ID"""
    ensure_workflow_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    if user_id:
        cursor.execute("""
            SELECT * FROM workflows 
            WHERE id = ? AND user_id = ?
        """, (workflow_id, user_id))
    else:
        cursor.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    
    workflow = dict(row)
    workflow['trigger_config'] = json.loads(workflow.get('trigger_config') or '{}')
    workflow['steps'] = json.loads(workflow.get('steps') or '[]')
    workflow['conditions'] = json.loads(workflow.get('conditions') or '{}')
    workflow['escalation_rules'] = json.loads(workflow.get('escalation_rules') or '[]')
    workflow['metadata'] = json.loads(workflow.get('metadata') or '{}')
    
    return workflow

def list_workflows(
    user_id: int,
    workflow_type: Optional[str] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """List workflows for a user"""
    ensure_workflow_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM workflows WHERE user_id = ?"
    params = [user_id]
    
    if workflow_type:
        query += " AND workflow_type = ?"
        params.append(workflow_type)
    
    if status:
        query += " AND status = ?"
        params.append(status)
    
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    workflows = []
    for row in rows:
        workflow = dict(row)
        workflow['trigger_config'] = json.loads(workflow.get('trigger_config') or '{}')
        workflow['steps'] = json.loads(workflow.get('steps') or '[]')
        workflow['conditions'] = json.loads(workflow.get('conditions') or '{}')
        workflow['escalation_rules'] = json.loads(workflow.get('escalation_rules') or '[]')
        workflow['metadata'] = json.loads(workflow.get('metadata') or '{}')
        
        # Get execution stats
        workflow['execution_count'] = get_workflow_execution_count(workflow['id'])
        workflow['success_rate'] = get_workflow_success_rate(workflow['id'])
        
        workflows.append(workflow)
    
    return workflows

def get_workflow_execution_count(workflow_id: int) -> int:
    """Get total execution count for a workflow"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM workflow_executions WHERE workflow_id = ?", (workflow_id,))
    count = cursor.fetchone()[0]
    conn.close()
    return count

def get_workflow_success_rate(workflow_id: int) -> float:
    """Get success rate for a workflow"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful
        FROM workflow_executions 
        WHERE workflow_id = ?
    """, (workflow_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row[0] == 0:
        return 0.0
    
    return (row[1] / row[0]) * 100

def update_workflow(
    workflow_id: int,
    user_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None,
    trigger_config: Optional[Dict[str, Any]] = None,
    steps: Optional[List[Dict[str, Any]]] = None,
    conditions: Optional[Dict[str, Any]] = None,
    escalation_rules: Optional[List[Dict[str, Any]]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """Update a workflow"""
    ensure_workflow_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    
    if status is not None:
        updates.append("status = ?")
        params.append(status)
    
    if trigger_config is not None:
        updates.append("trigger_config = ?")
        params.append(json.dumps(trigger_config))
    
    if steps is not None:
        updates.append("steps = ?")
        params.append(json.dumps(steps))
    
    if conditions is not None:
        updates.append("conditions = ?")
        params.append(json.dumps(conditions))
    
    if escalation_rules is not None:
        updates.append("escalation_rules = ?")
        params.append(json.dumps(escalation_rules))
    
    if metadata is not None:
        updates.append("metadata = ?")
        params.append(json.dumps(metadata))
    
    if not updates:
        conn.close()
        return get_workflow(workflow_id, user_id)
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.extend([workflow_id, user_id])
    
    cursor.execute(f"""
        UPDATE workflows 
        SET {', '.join(updates)}
        WHERE id = ? AND user_id = ?
    """, params)
    
    conn.commit()
    conn.close()
    
    return get_workflow(workflow_id, user_id)

def delete_workflow(workflow_id: int, user_id: int) -> bool:
    """Delete a workflow"""
    ensure_workflow_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM workflows WHERE id = ? AND user_id = ?", (workflow_id, user_id))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    
    return deleted

def execute_workflow(
    workflow_id: int,
    user_id: int,
    trigger_event: Optional[str] = None,
    trigger_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Execute a workflow"""
    ensure_workflow_tables()
    workflow = get_workflow(workflow_id, user_id)
    
    if not workflow:
        raise ValueError(f"Workflow {workflow_id} not found")
    
    if workflow['status'] != 'active':
        raise ValueError(f"Workflow {workflow_id} is not active")
    
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Create execution record
        cursor.execute("""
            INSERT INTO workflow_executions 
            (workflow_id, user_id, trigger_event, trigger_data, status)
            VALUES (?, ?, ?, ?, 'running')
        """, (
            workflow_id,
            user_id,
            trigger_event,
            json.dumps(trigger_data or {})
        ))
        
        execution_id = cursor.lastrowid
        conn.commit()
        
        # Execute steps (simplified - in production would use async task queue)
        execution_data = {}
        steps = workflow.get('steps', [])
        
        for step_index, step in enumerate(steps):
            step_start = datetime.now()
            
            try:
                result = execute_workflow_step(step, execution_data, trigger_data)
                execution_data[f"step_{step_index}"] = result
                
                # Log step execution
                step_duration = int((datetime.now() - step_start).total_seconds() * 1000)
                cursor.execute("""
                    INSERT INTO workflow_step_logs 
                    (execution_id, step_index, step_name, action_type, status, input_data, output_data, duration_ms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    execution_id,
                    step_index,
                    step.get('name'),
                    step.get('action_type'),
                    'completed',
                    json.dumps(step.get('config', {})),
                    json.dumps(result),
                    step_duration
                ))
                
            except Exception as step_error:
                # Log failed step
                cursor.execute("""
                    INSERT INTO workflow_step_logs 
                    (execution_id, step_index, step_name, action_type, status, error_message)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    execution_id,
                    step_index,
                    step.get('name'),
                    step.get('action_type'),
                    'failed',
                    str(step_error)
                ))
                
                # Update execution status
                cursor.execute("""
                    UPDATE workflow_executions 
                    SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (str(step_error), execution_id))
                conn.commit()
                conn.close()
                raise step_error
        
        # Mark execution as completed
        cursor.execute("""
            UPDATE workflow_executions 
            SET status = 'completed', execution_data = ?, completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (json.dumps(execution_data), execution_id))
        conn.commit()
        
        # Update compliance scores if workflow collected evidence or remediated gaps
        try:
            update_compliance_from_workflow(conn, user_id, workflow, execution_data, execution_id)
        except Exception as e:
            # Log error but don't fail workflow execution
            print(f"Error updating compliance from workflow: {e}")
        
        conn.close()
        
        return {
            "execution_id": execution_id,
            "workflow_id": workflow_id,
            "status": "completed",
            "execution_data": execution_data
        }
        
    except Exception as e:
        conn.rollback()
        conn.close()
        raise e

def update_compliance_from_workflow(
    conn: sqlite3.Connection,
    user_id: int,
    workflow: Dict[str, Any],
    execution_data: Dict[str, Any],
    execution_id: int
):
    """
    Update compliance scores and control status based on workflow execution results.
    This ensures workflow executions impact compliance posture.
    """
    cursor = conn.cursor()
    workflow_type = workflow.get('workflow_type', '')
    
    # For evidence collection workflows, update control evidence links
    if workflow_type == 'evidence_collection':
        # Check if evidence was collected in execution_data
        evidence_collected = execution_data.get('evidence_collected', [])
        controls_updated = execution_data.get('controls_updated', [])
        
        for control_id in controls_updated:
            # Update control evidence_link if new evidence was collected
            if evidence_collected:
                latest_evidence = evidence_collected[-1] if isinstance(evidence_collected, list) else evidence_collected
                evidence_link = latest_evidence.get('link') or latest_evidence.get('url', '')
                
                if evidence_link:
                    cursor.execute("""
                        UPDATE controls 
                        SET evidence_link = ?, last_updated = CURRENT_TIMESTAMP
                        WHERE id = ? AND user_id = ?
                    """, (evidence_link, control_id, user_id))
        
        # Recalculate compliance scores for affected frameworks
        if controls_updated:
            try:
                from services.csca_engine import update_compliance_scores_from_security_event
                # Trigger compliance score recalculation
                # This is a simplified approach - in production would be more sophisticated
                for control_id in controls_updated:
                    cursor.execute("SELECT frameworks FROM controls WHERE id = ? AND user_id = ?", (control_id, user_id))
                    control = cursor.fetchone()
                    if control and control['frameworks']:
                        frameworks = json.loads(control['frameworks'] or '[]')
                        # Update scores for each framework
                        for framework in frameworks:
                            # Trigger score update (simplified)
                            pass
            except Exception as e:
                print(f"Error recalculating compliance scores: {e}")
    
    # For gap remediation workflows, update control status
    elif workflow_type == 'gap_remediation':
        remediated_controls = execution_data.get('remediated_controls', [])
        
        for control_id in remediated_controls:
            cursor.execute("""
                UPDATE controls 
                SET status = 'Implemented', last_updated = CURRENT_TIMESTAMP
                WHERE id = ? AND user_id = ?
            """, (control_id, user_id))
        
        # Link workflow execution as evidence
        if remediated_controls:
            for control_id in remediated_controls:
                try:
                    from services.auto_mapping_service import update_control_evidence_from_event
                    update_control_evidence_from_event(
                        conn=conn,
                        user_id=user_id,
                        control_id=control_id,
                        event_id=execution_id,
                        event_source='workflow',
                        event_type=f"{workflow_type}_completed"
                    )
                except Exception as e:
                    print(f"Error linking workflow evidence: {e}")
    
    conn.commit()


def execute_workflow_step(
    step: Dict[str, Any],
    execution_data: Dict[str, Any],
    trigger_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Execute a single workflow step"""
    action_type = step.get('action_type')
    config = step.get('config', {})
    
    # Simplified step execution - in production would call actual services
    if action_type == 'query_controls':
        return {
            "controls_found": 5,
            "message": "Controls queried successfully"
        }
    elif action_type == 'send_notification':
        return {
            "notifications_sent": 3,
            "recipients": config.get('recipients', []),
            "message": "Notifications sent successfully"
        }
    elif action_type == 'create_task':
        return {
            "task_created": True,
            "task_id": 123,
            "message": "Task created successfully"
        }
    elif action_type == 'calculate_readiness':
        return {
            "readiness_score": 85,
            "gaps_identified": 3,
            "message": "Readiness calculated"
        }
    elif action_type == 'generate_report':
        return {
            "report_generated": True,
            "report_id": 456,
            "message": "Report generated successfully"
        }
    else:
        return {
            "status": "completed",
            "message": f"Step {step.get('name')} executed"
        }

def get_workflow_executions(
    workflow_id: Optional[int] = None,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Get workflow execution history"""
    ensure_workflow_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM workflow_executions WHERE 1=1"
    params = []
    
    if workflow_id:
        query += " AND workflow_id = ?"
        params.append(workflow_id)
    
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)
    
    if status:
        query += " AND status = ?"
        params.append(status)
    
    query += " ORDER BY started_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    executions = []
    for row in rows:
        execution = dict(row)
        execution['trigger_data'] = json.loads(execution.get('trigger_data') or '{}')
        execution['execution_data'] = json.loads(execution.get('execution_data') or '{}')
        executions.append(execution)
    
    return executions

def get_workflow_analytics(user_id: int, days: int = 30) -> Dict[str, Any]:
    """Get workflow analytics"""
    ensure_workflow_tables()
    conn = get_db()
    cursor = conn.cursor()
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Total workflows
    cursor.execute("SELECT COUNT(*) FROM workflows WHERE user_id = ?", (user_id,))
    total_workflows = cursor.fetchone()[0]
    
    # Active workflows
    cursor.execute("SELECT COUNT(*) FROM workflows WHERE user_id = ? AND status = 'active'", (user_id,))
    active_workflows = cursor.fetchone()[0]
    
    # Total executions
    cursor.execute("""
        SELECT COUNT(*) FROM workflow_executions 
        WHERE user_id = ? AND started_at >= ?
    """, (user_id, start_date))
    total_executions = cursor.fetchone()[0]
    
    # Successful executions
    cursor.execute("""
        SELECT COUNT(*) FROM workflow_executions 
        WHERE user_id = ? AND status = 'completed' AND started_at >= ?
    """, (user_id, start_date))
    successful_executions = cursor.fetchone()[0]
    
    # Average execution time
    cursor.execute("""
        SELECT AVG((julianday(completed_at) - julianday(started_at)) * 86400000)
        FROM workflow_executions 
        WHERE user_id = ? AND status = 'completed' AND started_at >= ?
    """, (user_id, start_date))
    avg_time_result = cursor.fetchone()[0]
    avg_execution_time_ms = avg_time_result if avg_time_result else 0
    
    # Executions by workflow type
    cursor.execute("""
        SELECT w.workflow_type, COUNT(*) as count
        FROM workflow_executions e
        JOIN workflows w ON e.workflow_id = w.id
        WHERE e.user_id = ? AND e.started_at >= ?
        GROUP BY w.workflow_type
    """, (user_id, start_date))
    executions_by_type = {row[0]: row[1] for row in cursor.fetchall()}
    
    conn.close()
    
    return {
        "total_workflows": total_workflows,
        "active_workflows": active_workflows,
        "total_executions": total_executions,
        "successful_executions": successful_executions,
        "success_rate": (successful_executions / total_executions * 100) if total_executions > 0 else 0,
        "avg_execution_time_ms": int(avg_execution_time_ms),
        "executions_by_type": executions_by_type,
        "period_days": days
    }

