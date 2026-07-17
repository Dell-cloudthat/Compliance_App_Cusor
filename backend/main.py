"""
FastAPI application factory for the Compliance Automation Platform.

All route logic lives in backend/routes/*.py; shared DB utilities in
backend/database.py; WebSocket manager in backend/websocket.py.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from websocket import alert_ws_manager
from services.auth_service import get_current_user, register_user, authenticate_user

# Route modules
from routes import (
    users,
    audits,
    permissions,
    iam,
    integrations,
    data_flow,
    security,
    alerts,
    intelligence,
    learning,
    workflows,
    intake,
    consulting,
    wizard,
    trust,
    credentials,
)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Compliance Platform API", version="1.0.0")

# CORS middleware
# NOTE: allow_origins is a dev-only localhost list. Before deploying anywhere
# reachable from the internet, replace this with your real frontend domain(s) —
# combining allow_credentials=True with a wildcard/broad origin list is unsafe.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    init_db()


# ── Health-check ──────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Compliance Platform API", "version": "1.0.0", "status": "operational"}


# ── Auth endpoints (inline — small and shared with startup logic) ─────────────

from pydantic import BaseModel, Field
from typing import Optional

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = Field(..., min_length=8)
    organization: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

from fastapi import Depends

@app.post("/api/auth/register")
async def auth_register(payload: RegisterRequest):
    """Create a new account and return a JWT access token."""
    return register_user(payload.name, payload.email, payload.password, payload.organization)

@app.post("/api/auth/login")
async def auth_login(payload: LoginRequest):
    """Verify credentials and return a JWT access token."""
    return authenticate_user(payload.email, payload.password)

@app.get("/api/auth/me")
async def auth_me(user_id: int = Depends(get_current_user)):
    """Return the authenticated user's full profile."""
    from database import get_db
    from fastapi import HTTPException
    conn = get_db()
    row  = conn.execute(
        "SELECT id, name, email, organization, role, plan FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


# ── WebSocket ─────────────────────────────────────────────────────────────────

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


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(users.router)
app.include_router(audits.router)
app.include_router(permissions.router)
app.include_router(iam.router)
app.include_router(integrations.router)
app.include_router(data_flow.router)
app.include_router(security.router)
app.include_router(alerts.router)
app.include_router(intelligence.router)
app.include_router(learning.router)
app.include_router(workflows.router)
app.include_router(intake.router)
app.include_router(consulting.router)
app.include_router(wizard.router)
app.include_router(trust.router)
app.include_router(credentials.router)


# ── Dev entrypoint ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
