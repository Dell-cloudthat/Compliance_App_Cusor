"""
FastAPI application factory for the Compliance Automation Platform.

All route logic lives in backend/routes/*.py; shared DB utilities in
backend/database.py; WebSocket manager in backend/websocket.py.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from database import init_db
from services.rate_limit import limiter
from websocket import alert_ws_manager
from services.auth_service import get_current_user, register_user, authenticate_user
from integrations.servers.iam_server import mcp as iam_mcp, create_iam_app, add_iam_auth_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # FastMCP's streamable-HTTP session manager runs its own background task
    # group. Mounting it with app.mount() alone does NOT start that task
    # group — it must run inside the parent app's lifespan, or every request
    # to /mcp/iam/mcp fails with "Task group is not initialized."
    async with iam_mcp.session_manager.run():
        yield


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
    tco,
    violations,
    assistant,
    waitlist,
    action_items,
)

# ── Production configuration guard ────────────────────────────────────────────
# When APP_ENV=production, refuse to boot with dev-fallback secrets. Both keys
# have local-file fallbacks that are fine for development but must never sign
# tokens or encrypt customer credentials on a real server.

import os

APP_ENV = os.getenv("APP_ENV", "development").lower()

if APP_ENV == "production":
    _missing = [
        var for var in ("JWT_SECRET_KEY", "ENCRYPTION_KEY")
        if not os.getenv(var, "").strip()
    ]
    if _missing:
        raise RuntimeError(
            f"APP_ENV=production but required secrets are not set: {', '.join(_missing)}. "
            "Generate them with:\n"
            "  JWT_SECRET_KEY:  openssl rand -hex 32\n"
            "  ENCRYPTION_KEY:  python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Compliance Platform API", version="1.0.0", lifespan=lifespan)

# CORS: origins come from the CORS_ORIGINS env var (comma-separated) so a
# deployment can restrict to its real frontend domain without a code change.
# The localhost list remains the development default. Wildcard entries are
# rejected because allow_credentials=True + "*" is an unsafe combination.
_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5176",
]

_env_origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",")
    if o.strip() and o.strip() != "*"
]
_cors_origins = _env_origins or _DEV_ORIGINS

if APP_ENV == "production" and not _env_origins:
    raise RuntimeError(
        "APP_ENV=production but CORS_ORIGINS is not set. "
        "Set it to your frontend domain(s), e.g. CORS_ORIGINS=https://app.example.com"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
# Per-IP request limits on the highest-value abuse targets (login/register).
# Complements the per-account lockout in auth_service.py, which alone does
# not stop one IP from credential-stuffing many different email addresses.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


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
@limiter.limit("10/hour")
async def auth_register(request: Request, payload: RegisterRequest):
    """Create a new account and return a JWT access token."""
    return register_user(payload.name, payload.email, payload.password, payload.organization)

@app.post("/api/auth/login")
@limiter.limit("10/minute")
async def auth_login(request: Request, payload: LoginRequest):
    """Verify credentials and return a JWT access token."""
    return authenticate_user(payload.email, payload.password)

@app.get("/api/auth/me")
async def auth_me(user_id: int = Depends(get_current_user)):
    """Return the authenticated user's full profile."""
    from database import get_db
    from fastapi import HTTPException
    from services.auth_service import is_platform_admin
    conn = get_db()
    row  = conn.execute(
        "SELECT id, name, email, organization, role, plan FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    profile = dict(row)
    profile["is_platform_admin"] = is_platform_admin(user_id)
    return profile


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
app.include_router(tco.router)
app.include_router(violations.router)
app.include_router(assistant.router)
app.include_router(waitlist.router)
app.include_router(action_items.router)

# ── MCP servers ───────────────────────────────────────────────────────────────
# Mounted at /mcp/iam — accessible to MCP clients (Claude, MCP Inspector, etc.)
# Auth middleware enforces JWT on all /mcp/* paths and resolves user_id
# from the token server-side (no user_id tool parameter).

add_iam_auth_middleware(app)           # must come before mount()
app.mount("/mcp/iam", create_iam_app())


# ── Dev entrypoint ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
