"""
Intelligence priorities, control guidance, pattern detection, and compliance-growth routes.
"""
import sqlite3, json, hashlib
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Request
from pydantic import BaseModel, Field
from database import get_db
from services.iam_service import check_permission
from services.auth_service import get_current_user

from services import intelligence_service
from services import learning_service

router = APIRouter()

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

