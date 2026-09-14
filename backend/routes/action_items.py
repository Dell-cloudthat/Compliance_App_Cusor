"""
Action items — assign remediation work from the Responsibility Matrix (or
any control) to a team, with a trackable ticket reference and an optional
outbound email so the assignee has a record outside the platform too.

Every create/update writes an immutable row to action_item_audit_log
capturing who made the change (user id + email, looked up server-side —
never trusted from the client), what changed, and when. This is the
"who made changes inside the platform" trail requested alongside the
external ticket/email tracking.

Design notes
------------
- No real ticketing system (Jira/ServiceNow) is integrated yet — each
  action item IS the ticket, identified by a human-readable ticket_ref
  (e.g. AI-000123). If a real ticketing integration is added later
  (through the same BYOC/MCP credential pattern as routes/credentials.py),
  this is the natural extension point: swap _next_ticket_ref()/the email
  notification for an outbound API call, same audit log either way.
- Email is best-effort via services/email_service.py. Without SMTP
  configured, the caller still gets the ticket_ref and a copyable summary
  back — the feature works end to end with zero external dependencies.
"""

import os
import sqlite3
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database import DB_PATH, get_db
from services.auth_service import get_current_user
from services.email_service import send_email, is_email_configured

router = APIRouter()


def _ensure_tables() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS action_items (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id           INTEGER NOT NULL,
            ticket_ref        TEXT NOT NULL UNIQUE,
            control_id        TEXT,
            control_name      TEXT,
            title             TEXT NOT NULL,
            description       TEXT,
            assigned_team     TEXT,
            assigned_email    TEXT,
            priority          TEXT NOT NULL DEFAULT 'medium',
            status            TEXT NOT NULL DEFAULT 'open',
            due_date          TEXT,
            email_sent        INTEGER NOT NULL DEFAULT 0,
            email_sent_at     TIMESTAMP,
            created_by        INTEGER NOT NULL,
            created_by_email  TEXT NOT NULL,
            created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS action_item_audit_log (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            action_item_id   INTEGER NOT NULL,
            user_id          INTEGER NOT NULL,
            user_email       TEXT NOT NULL,
            action           TEXT NOT NULL,
            field_changed    TEXT,
            old_value        TEXT,
            new_value        TEXT,
            notes            TEXT,
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_action_items_user ON action_items(user_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_action_item_audit_item ON action_item_audit_log(action_item_id)"
    )
    conn.commit()
    conn.close()


def _current_user_email(user_id: int) -> str:
    conn = get_db()
    try:
        row = conn.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
    finally:
        conn.close()
    return row["email"] if row else "unknown@unknown"


def _next_ticket_ref(conn: sqlite3.Connection) -> str:
    n = conn.execute("SELECT COUNT(*) AS n FROM action_items").fetchone()["n"]
    return f"AI-{n + 1:06d}"


def _log(conn: sqlite3.Connection, action_item_id: int, user_id: int, user_email: str,
          action: str, field_changed: Optional[str] = None,
          old_value: Optional[str] = None, new_value: Optional[str] = None,
          notes: Optional[str] = None) -> None:
    conn.execute(
        """INSERT INTO action_item_audit_log
           (action_item_id, user_id, user_email, action, field_changed, old_value, new_value, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (action_item_id, user_id, user_email, action, field_changed, old_value, new_value, notes),
    )


def _email_body(item: Dict[str, Any]) -> str:
    frontend = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    lines = [
        f"A compliance action item has been assigned to your team.\n",
        f"Ticket: {item['ticket_ref']}",
        f"Title: {item['title']}",
    ]
    if item.get("control_id"):
        lines.append(f"Control: {item['control_id']} — {item.get('control_name', '')}")
    lines.append(f"Priority: {item['priority'].upper()}")
    if item.get("due_date"):
        lines.append(f"Due: {item['due_date']}")
    if item.get("description"):
        lines.append(f"\nDetails:\n{item['description']}")
    lines.append(f"\nAssigned by: {item['created_by_email']}")
    lines.append(f"\nTrack this in the platform: {frontend}")
    return "\n".join(lines)


# ── Models ────────────────────────────────────────────────────────────────────

class ActionItemCreate(BaseModel):
    control_id: Optional[str] = None
    control_name: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=5000)
    assigned_team: Optional[str] = Field(None, max_length=200)
    assigned_email: Optional[str] = Field(None, max_length=320)
    priority: str = Field(default="medium")  # low | medium | high | critical
    due_date: Optional[str] = None
    send_email: bool = True


class ActionItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_team: Optional[str] = None
    assigned_email: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None  # open | in_progress | done | cancelled
    due_date: Optional[str] = None
    notify_on_reassign: bool = True


VALID_PRIORITIES = {"low", "medium", "high", "critical"}
VALID_STATUSES = {"open", "in_progress", "done", "cancelled"}


# ── Routes ──────────────────────────────────────────────────────────────────────

@router.post("/api/action-items", status_code=201)
def create_action_item(
    payload: ActionItemCreate,
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    _ensure_tables()
    if payload.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"priority must be one of {sorted(VALID_PRIORITIES)}")

    user_email = _current_user_email(user_id)
    conn = get_db()
    try:
        ticket_ref = _next_ticket_ref(conn)
        cursor = conn.execute(
            """INSERT INTO action_items
               (user_id, ticket_ref, control_id, control_name, title, description,
                assigned_team, assigned_email, priority, status, due_date,
                created_by, created_by_email)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)""",
            (
                user_id, ticket_ref, payload.control_id, payload.control_name,
                payload.title, payload.description, payload.assigned_team,
                payload.assigned_email, payload.priority, payload.due_date,
                user_id, user_email,
            ),
        )
        item_id = cursor.lastrowid
        _log(conn, item_id, user_id, user_email, "created", notes=f"Ticket {ticket_ref} created")

        row = conn.execute("SELECT * FROM action_items WHERE id = ?", (item_id,)).fetchone()
        item = dict(row)

        emailed = False
        if payload.send_email and payload.assigned_email:
            emailed = send_email(
                to_email=payload.assigned_email,
                subject=f"[{ticket_ref}] Action item assigned: {payload.title}",
                body_text=_email_body(item),
            )
            if emailed:
                conn.execute(
                    "UPDATE action_items SET email_sent = 1, email_sent_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (item_id,),
                )
                _log(conn, item_id, user_id, user_email, "email_sent",
                     notes=f"Notification emailed to {payload.assigned_email}")
            else:
                _log(conn, item_id, user_id, user_email, "email_failed",
                     notes=f"Email to {payload.assigned_email} not sent (SMTP not configured or send failed)")

        conn.commit()
        row = conn.execute("SELECT * FROM action_items WHERE id = ?", (item_id,)).fetchone()
    finally:
        conn.close()

    result = dict(row)
    result["email_configured"] = is_email_configured()
    result["emailed"] = emailed
    return result


@router.get("/api/action-items")
def list_action_items(
    control_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    assigned_team: Optional[str] = None,
    user_id: int = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    _ensure_tables()
    conn = get_db()
    try:
        clauses = ["user_id = ?"]
        params: List[Any] = [user_id]
        if control_id:
            clauses.append("control_id = ?")
            params.append(control_id)
        if status_filter:
            clauses.append("status = ?")
            params.append(status_filter)
        if assigned_team:
            clauses.append("assigned_team = ?")
            params.append(assigned_team)
        rows = conn.execute(
            f"SELECT * FROM action_items WHERE {' AND '.join(clauses)} ORDER BY created_at DESC",
            params,
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/api/action-items/{item_id}")
def get_action_item(item_id: int, user_id: int = Depends(get_current_user)) -> Dict[str, Any]:
    _ensure_tables()
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM action_items WHERE id = ? AND user_id = ?", (item_id, user_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Action item not found.")
        audit_rows = conn.execute(
            "SELECT * FROM action_item_audit_log WHERE action_item_id = ? ORDER BY created_at ASC",
            (item_id,),
        ).fetchall()
    finally:
        conn.close()
    result = dict(row)
    result["audit_log"] = [dict(a) for a in audit_rows]
    return result


@router.patch("/api/action-items/{item_id}")
def update_action_item(
    item_id: int,
    payload: ActionItemUpdate,
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    _ensure_tables()
    if payload.priority is not None and payload.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"priority must be one of {sorted(VALID_PRIORITIES)}")
    if payload.status is not None and payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(VALID_STATUSES)}")

    user_email = _current_user_email(user_id)
    conn = get_db()
    try:
        existing = conn.execute(
            "SELECT * FROM action_items WHERE id = ? AND user_id = ?", (item_id, user_id)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Action item not found.")
        existing = dict(existing)

        fields = ["title", "description", "assigned_team", "assigned_email",
                  "priority", "status", "due_date"]
        updates = {}
        for f in fields:
            new_val = getattr(payload, f)
            if new_val is not None and new_val != existing.get(f):
                updates[f] = new_val

        if not updates:
            return existing

        set_clause = ", ".join(f"{f} = ?" for f in updates)
        conn.execute(
            f"UPDATE action_items SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (*updates.values(), item_id),
        )

        for field, new_val in updates.items():
            action = "status_changed" if field == "status" else (
                "assigned" if field in ("assigned_team", "assigned_email") else "updated"
            )
            _log(conn, item_id, user_id, user_email, action,
                 field_changed=field, old_value=str(existing.get(field)), new_value=str(new_val))

        # Re-notify on reassignment if requested and we now have an email
        reassigned_email = updates.get("assigned_email") or (
            existing.get("assigned_email") if "assigned_team" in updates else None
        )
        emailed = False
        if payload.notify_on_reassign and reassigned_email and (
            "assigned_email" in updates or "assigned_team" in updates
        ):
            row = conn.execute("SELECT * FROM action_items WHERE id = ?", (item_id,)).fetchone()
            emailed = send_email(
                to_email=reassigned_email,
                subject=f"[{row['ticket_ref']}] Action item reassigned to your team: {row['title']}",
                body_text=_email_body(dict(row)),
            )
            if emailed:
                conn.execute(
                    "UPDATE action_items SET email_sent = 1, email_sent_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (item_id,),
                )
                _log(conn, item_id, user_id, user_email, "email_sent",
                     notes=f"Reassignment notification emailed to {reassigned_email}")

        conn.commit()
        row = conn.execute("SELECT * FROM action_items WHERE id = ?", (item_id,)).fetchone()
    finally:
        conn.close()

    result = dict(row)
    result["emailed"] = emailed
    return result


@router.post("/api/action-items/{item_id}/resend-email")
def resend_email(item_id: int, user_id: int = Depends(get_current_user)) -> Dict[str, Any]:
    _ensure_tables()
    user_email = _current_user_email(user_id)
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM action_items WHERE id = ? AND user_id = ?", (item_id, user_id)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Action item not found.")
        item = dict(row)
        if not item.get("assigned_email"):
            raise HTTPException(status_code=400, detail="No assignee email set on this action item.")

        emailed = send_email(
            to_email=item["assigned_email"],
            subject=f"[{item['ticket_ref']}] Reminder: {item['title']}",
            body_text=_email_body(item),
        )
        if emailed:
            conn.execute(
                "UPDATE action_items SET email_sent = 1, email_sent_at = CURRENT_TIMESTAMP WHERE id = ?",
                (item_id,),
            )
            _log(conn, item_id, user_id, user_email, "email_sent", notes="Manual resend")
        else:
            _log(conn, item_id, user_id, user_email, "email_failed", notes="Manual resend failed")
        conn.commit()
    finally:
        conn.close()

    return {"emailed": emailed, "email_configured": is_email_configured()}
