"""
SecurityOS FastAPI Application

Standalone server for the SecurityOS product.
Runs independently of the legacy compliance platform (main.py).

Start:
    uvicorn backend.securityos_main:app --port 8001 --reload

Environment variables:
    DATABASE_URL  — PostgreSQL URL (falls back to in-memory if not set)
    CORS_ORIGINS  — comma-separated allowed origins (default: localhost dev ports)
    OPENAI_API_KEY — optional, enables real LLM copilot responses
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.api import router as securityos_router
from backend.api.tiers import router as tiers_router
from backend.api.msp import router as msp_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("securityos")

app = FastAPI(
    title="SecurityOS API",
    description="Security Readiness Platform for Small Businesses",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

_raw_origins = os.environ.get("CORS_ORIGINS", "")
if _raw_origins:
    allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
else:
    # Development defaults
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────

app.include_router(securityos_router)
app.include_router(tiers_router)
app.include_router(msp_router)


@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "service": "SecurityOS API",
        "version": "0.2.0",
    }


@app.get("/", include_in_schema=False)
def root():
    return {
        "service": "SecurityOS",
        "docs": "/docs",
        "health": "/health",
        "api": "/api/v1/securityos",
    }


# ── Startup ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    logger.info("SecurityOS API v0.2.0 starting")
    logger.info("  Routes: /api/v1/securityos (core) · /api/v1/securityos/tiers · /api/v1/securityos/msp")
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        logger.info("  Database: PostgreSQL (persistent)")
    else:
        logger.warning(
            "  DATABASE_URL not set — using in-memory storage. "
            "All data lost on restart. See backend/database/securityos_schema.sql to provision PostgreSQL."
        )
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        logger.info("  OpenAI: configured — real LLM copilot enabled")
    else:
        logger.info("  OpenAI: not configured — copilot uses rule-based responses")
