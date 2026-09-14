"""
Early-access waitlist: public signup, admin review/invite, and self-serve
invite redemption into a real trial account.

Flow
----
1. Visitor submits the landing-page form -> POST /api/waitlist/signup
   (public, rate-limited). Row created with status='pending'.
2. Platform admin reviews signups -> GET /api/waitlist (admin only).
3. Admin invites a signup -> POST /api/waitlist/{id}/invite (admin only).
   Generates a single-use token; emails it if SMTP_HOST is configured,
   otherwise returns the invite link for the admin to send manually.
4. Invitee opens the link (frontend reads ?invite=<token> from the URL,
   shows a "set your password" form) -> POST /api/waitlist/redeem
   (public). Creates a real account with plan='trial' and logs them in.

No email-sending service is required to use this end to end — without
SMTP configured, the admin just copies the returned invite_link.
"""

import logging
import os
import secrets
import smtplib
import sqlite3
from email.message import EmailMessage
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from database import DB_PATH
from services.auth_service import register_user, require_platform_admin
from services.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter()


def _ensure_table() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS waitlist_signups (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            name                 TEXT NOT NULL,
            email                TEXT NOT NULL UNIQUE,
            company              TEXT,
            role_title           TEXT,
            company_size         TEXT,
            use_case             TEXT,
            frameworks_interested TEXT,
            status               TEXT NOT NULL DEFAULT 'pending',
            invite_token         TEXT UNIQUE,
            invited_at           TIMESTAMP,
            converted_user_id    INTEGER,
            source               TEXT DEFAULT 'landing_page',
            created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


# ─── Models ────────────────────────────────────────────────────────────────────

class WaitlistSignup(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    company: Optional[str] = Field(None, max_length=200)
    role_title: Optional[str] = Field(None, max_length=120)
    company_size: Optional[str] = Field(None, max_length=40)
    use_case: Optional[str] = Field(None, max_length=2000)
    frameworks_interested: List[str] = Field(default_factory=list)
    source: str = "landing_page"


class WaitlistOut(BaseModel):
    id: int
    name: str
    email: str
    company: Optional[str]
    role_title: Optional[str]
    company_size: Optional[str]
    use_case: Optional[str]
    frameworks_interested: Optional[str]
    status: str
    invited_at: Optional[str]
    converted_user_id: Optional[int]
    source: Optional[str]
    created_at: str


class RedeemInvite(BaseModel):
    token: str
    password: str = Field(..., min_length=8)


# ─── Email (optional) ──────────────────────────────────────────────────────────

def _send_invite_email(to_email: str, to_name: str, invite_link: str) -> bool:
    """Best-effort SMTP send. Returns False (never raises) if unconfigured/failed —
    the caller always gets the invite_link back regardless, so this is purely
    a convenience layer."""
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        return False
    try:
        port = int(os.getenv("SMTP_PORT", "587"))
        user = os.getenv("SMTP_USER", "")
        password = os.getenv("SMTP_PASSWORD", "")
        from_addr = os.getenv("SMTP_FROM", user or "no-reply@example.com")

        msg = EmailMessage()
        msg["Subject"] = "You're invited — early access to the platform"
        msg["From"] = from_addr
        msg["To"] = to_email
        msg.set_content(
            f"Hi {to_name},\n\n"
            f"You're in! Set up your account here:\n{invite_link}\n\n"
            f"This link is single-use and doesn't expire, but please don't share it.\n"
        )

        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            if user:
                server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.warning("Invite email send failed for %s: %s", to_email, exc)
        return False


def _frontend_invite_url(token: str) -> str:
    base = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return f"{base}/?invite={token}"


# ─── Public routes ──────────────────────────────────────────────────────────────

@router.post("/api/waitlist/signup", status_code=201)
@limiter.limit("5/hour")
async def waitlist_signup(request: Request, payload: WaitlistSignup) -> Dict[str, Any]:
    """Public early-access signup. Returns the visitor's queue position."""
    _ensure_table()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        existing = conn.execute(
            "SELECT id FROM waitlist_signups WHERE email = ?", (payload.email,)
        ).fetchone()
        if existing:
            position = conn.execute(
                "SELECT COUNT(*) AS n FROM waitlist_signups WHERE id <= ? AND status = 'pending'",
                (existing["id"],),
            ).fetchone()["n"]
            return {"already_registered": True, "position": position}

        import json
        conn.execute(
            """INSERT INTO waitlist_signups
               (name, email, company, role_title, company_size, use_case,
                frameworks_interested, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                payload.name, payload.email, payload.company, payload.role_title,
                payload.company_size, payload.use_case,
                json.dumps(payload.frameworks_interested), payload.source,
            ),
        )
        conn.commit()
        new_id = conn.execute(
            "SELECT id FROM waitlist_signups WHERE email = ?", (payload.email,)
        ).fetchone()["id"]
        position = conn.execute(
            "SELECT COUNT(*) AS n FROM waitlist_signups WHERE id <= ? AND status = 'pending'",
            (new_id,),
        ).fetchone()["n"]
    finally:
        conn.close()

    return {"already_registered": False, "position": position}


@router.post("/api/waitlist/redeem")
async def redeem_invite(payload: RedeemInvite) -> Dict[str, Any]:
    """Turn an invite token into a real trial account and log the user in."""
    _ensure_table()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT * FROM waitlist_signups WHERE invite_token = ?", (payload.token,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invalid or expired invite link.")
        if row["status"] == "converted":
            raise HTTPException(status_code=409, detail="This invite has already been used. Please log in instead.")
        if row["status"] != "invited":
            raise HTTPException(status_code=400, detail="This invite is not active yet.")

        result = register_user(
            name=row["name"],
            email=row["email"],
            password=payload.password,
            organization=row["company"],
            plan="trial",
        )

        conn.execute(
            "UPDATE waitlist_signups SET status = 'converted', converted_user_id = ? WHERE id = ?",
            (result["user_id"], row["id"]),
        )
        conn.commit()
    finally:
        conn.close()

    return result


# ─── Admin routes (platform operator only — see auth_service.is_platform_admin) ─

@router.get("/api/waitlist", response_model=List[WaitlistOut])
async def list_waitlist(
    status_filter: Optional[str] = None,
    _admin: int = Depends(require_platform_admin),
) -> List[Dict[str, Any]]:
    _ensure_table()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        if status_filter:
            rows = conn.execute(
                "SELECT * FROM waitlist_signups WHERE status = ? ORDER BY created_at ASC",
                (status_filter,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM waitlist_signups ORDER BY created_at ASC"
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/api/waitlist/stats")
async def waitlist_stats(_admin: int = Depends(require_platform_admin)) -> Dict[str, Any]:
    _ensure_table()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT status, COUNT(*) AS n FROM waitlist_signups GROUP BY status"
        ).fetchall()
        total = conn.execute("SELECT COUNT(*) AS n FROM waitlist_signups").fetchone()["n"]
    finally:
        conn.close()
    return {"total": total, "by_status": {r["status"]: r["n"] for r in rows}}


@router.post("/api/waitlist/{signup_id}/invite")
async def invite_signup(
    signup_id: int,
    _admin: int = Depends(require_platform_admin),
) -> Dict[str, Any]:
    _ensure_table()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT * FROM waitlist_signups WHERE id = ?", (signup_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Signup not found.")
        if row["status"] == "converted":
            raise HTTPException(status_code=409, detail="This signup already converted to an account.")

        token = row["invite_token"] or secrets.token_urlsafe(32)
        conn.execute(
            """UPDATE waitlist_signups
               SET status = 'invited', invite_token = ?, invited_at = CURRENT_TIMESTAMP
               WHERE id = ?""",
            (token, signup_id),
        )
        conn.commit()
    finally:
        conn.close()

    invite_link = _frontend_invite_url(token)
    emailed = _send_invite_email(row["email"], row["name"], invite_link)
    return {"invite_link": invite_link, "emailed": emailed}


@router.post("/api/waitlist/{signup_id}/decline")
async def decline_signup(
    signup_id: int,
    _admin: int = Depends(require_platform_admin),
) -> Dict[str, Any]:
    _ensure_table()
    conn = sqlite3.connect(str(DB_PATH))
    try:
        result = conn.execute(
            "UPDATE waitlist_signups SET status = 'declined' WHERE id = ?", (signup_id,)
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Signup not found.")
    finally:
        conn.close()
    return {"declined": True}
