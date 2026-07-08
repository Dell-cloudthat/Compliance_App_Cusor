"""
ML-driven learning cycle, learned patterns, auto-playbooks, and execution routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services import learning_service
from services import alert_service

router = APIRouter()

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
