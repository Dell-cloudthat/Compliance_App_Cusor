"""
Alert drill-down, remediation workflow, drift detection, and actionable-alert routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services import alert_service
from services import learning_service
from services import intelligence_service
from services.csca_engine import get_security_compliance_correlation
from websocket import alert_ws_manager

router = APIRouter()

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


@router.get("/api/alerts/{alert_id}")
async def get_alert_detail(alert_id: int, user_id: int = Depends(get_current_user)):
    """Retrieve detailed alert drill-down data"""
    detail = alert_service.get_alert_detail(alert_id, user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Alert not found")
    return detail


@router.post("/api/alerts/{alert_id}/remediation")
async def update_alert_remediation(alert_id: int, payload: AlertRemediationUpdate, user_id: int = Depends(get_current_user)):
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

@router.get("/api/security-compliance-correlation")
async def get_security_compliance_correlation_endpoint(user_id: int = Depends(get_current_user), days: int = 30):
    """Get correlation metrics between security events and compliance scores"""
    correlation = get_security_compliance_correlation(user_id, days)
    return correlation


@router.get("/api/intelligence/priorities")
async def get_control_priorities_endpoint(
    user_id: int = Depends(get_current_user),
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


@router.get("/api/intelligence/guidance")
async def get_control_guidance_endpoint(
    control_id: str,
    user_id: int = Depends(get_current_user),
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

@router.post("/api/patterns/detect")
async def detect_security_patterns(user_id: int = Depends(get_current_user), lookback_days: int = 30):
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

@router.get("/api/patterns")
async def get_patterns_endpoint(user_id: int = Depends(get_current_user), status: Optional[str] = None):
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

@router.get("/api/pattern-alerts")
async def get_pattern_alerts(user_id: int = Depends(get_current_user), acknowledged: Optional[bool] = None, limit: int = 50):
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

@router.post("/api/pattern-alerts/{alert_id}/acknowledge")
async def acknowledge_pattern_alert(alert_id: int, user_id: int = Depends(get_current_user)):
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

@router.get("/api/patterns/trends")
async def get_pattern_trends_endpoint(user_id: int = Depends(get_current_user), lookback_days: int = 30):
    """Get pattern trend analysis"""
    from services.pattern_detector import get_pattern_trends
    
    trends = get_pattern_trends(user_id, lookback_days)
    return trends

# ============================================================================
# Real-Time Compliance & Unified Data Flow Endpoints
# ============================================================================

@router.get("/api/compliance/realtime/{framework}")
async def get_realtime_compliance_score(framework: str, user_id: int = Depends(get_current_user)):
    """Get real-time compliance score for a framework"""
    from services.realtime_compliance_engine import calculate_realtime_compliance_score
    
    try:
        score_data = calculate_realtime_compliance_score(user_id, framework)
        return score_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate compliance score: {str(e)}")

@router.get("/api/compliance/framework-growth/{framework}")
async def get_framework_growth_metrics(framework: str, user_id: int = Depends(get_current_user), 
                                       period_days: int = 30):
    """Get framework growth metrics for dashboard"""
    from services.realtime_compliance_engine import get_framework_growth_metrics
    
    try:
        metrics = get_framework_growth_metrics(user_id, framework, period_days)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get growth metrics: {str(e)}")

@router.get("/api/compliance/all-frameworks-growth")
async def get_all_frameworks_growth(user_id: int = Depends(get_current_user), period_days: int = 30):
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

@router.post("/api/learning/analyze")
async def run_learning_analysis(user_id: int = Depends(get_current_user)):
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


@router.get("/api/learning/patterns")
async def get_learned_patterns(user_id: int = Depends(get_current_user), min_confidence: float = 0.3):
    """Get all learned remediation patterns"""
    try:
        patterns = learning_service.get_learned_patterns(user_id, min_confidence)
        return {
            "patterns": patterns,
            "count": len(patterns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get patterns: {str(e)}")


@router.get("/api/learning/playbooks")
async def get_auto_playbooks(user_id: int = Depends(get_current_user), status: Optional[str] = None):
    """Get auto-generated playbooks"""
    try:
        playbooks = learning_service.get_auto_playbooks(user_id, status)
        return {
            "playbooks": playbooks,
            "count": len(playbooks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get playbooks: {str(e)}")


@router.post("/api/learning/playbooks/{playbook_id}/approve")
async def approve_playbook(playbook_id: int, user_id: int = Depends(get_current_user)):
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


@router.get("/api/learning/data-value")
async def get_data_value_summary(user_id: int = Depends(get_current_user)):
    """Get summary of how data is being used and its value"""
    try:
        summary = learning_service.get_data_value_summary(user_id)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get data value summary: {str(e)}")


@router.get("/api/learning/playbooks/match")
async def get_matching_playbooks(
    alert_id: Optional[int] = None,
    control_id: Optional[str] = None,
    user_id: int = Depends(get_current_user)
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


@router.get("/api/learning/patterns/control/{control_id}")
async def get_control_patterns(control_id: str, user_id: int = Depends(get_current_user)):
    """Get learned patterns for a specific control"""
    try:
        patterns = learning_service.find_patterns_for_control(user_id, control_id)
        return {
            "patterns": patterns,
            "count": len(patterns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get control patterns: {str(e)}")


@router.post("/api/learning/playbooks/{playbook_id}/execute")
async def execute_playbook(
    playbook_id: int,
    request: Request,
    user_id: int = Depends(get_current_user)
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


@router.post("/api/alerts/check-drift")
async def check_compliance_drift(user_id: int = Depends(get_current_user)):
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

@router.get("/api/alerts/actionable")
async def get_actionable_alerts_endpoint(user_id: int = Depends(get_current_user), limit: int = 50):
    """Get all actionable alerts with remediation guidance"""
    try:
        alerts = alert_service.get_actionable_alerts(user_id, limit)
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get actionable alerts: {str(e)}")
