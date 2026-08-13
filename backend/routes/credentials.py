"""
Integration credential storage with Fernet symmetric encryption.

Design:
  • Each client pastes their own read-only vendor API key.
  • The key is encrypted with a Fernet key derived from ENCRYPTION_KEY env var
    before being written to SQLite — never stored or logged in plaintext.
  • No platform-wide vendor credentials exist; every tool call uses the
    specific client's own stored credential.
  • All tools exposed through MCP servers are read-only (readOnlyHint=True).

Routes
------
POST /api/credentials              store a new encrypted credential
GET  /api/credentials              list connected integrations (no plaintext)
DELETE /api/credentials/{id}       revoke / delete
POST /api/credentials/{id}/verify  test the stored credential against vendor API
"""

import os
import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import DB_PATH, get_db
from services.auth_service import get_current_user

router = APIRouter()

# ─── Encryption helpers ───────────────────────────────────────────────────────

def _get_fernet():
    """Return a Fernet instance keyed from ENCRYPTION_KEY env var.

    If the env var is absent, a random key is generated per-process
    (credentials will become unreadable after a restart — warn loudly).
    """
    import base64
    import logging
    from cryptography.fernet import Fernet

    raw = os.getenv("ENCRYPTION_KEY")
    if not raw:
        # Attempt to read/create a persisted key file (same pattern as JWT key)
        key_file = DB_PATH.parent.parent / ".encryption_key"
        if key_file.exists():
            raw = key_file.read_text().strip()
        else:
            raw = Fernet.generate_key().decode()
            key_file.write_text(raw)
            logging.getLogger(__name__).warning(
                "⚠️  ENCRYPTION_KEY env var not set. "
                "A random key was generated and saved to %s. "
                "Set ENCRYPTION_KEY before deploying to production.",
                key_file,
            )

    # Fernet requires a 32-byte url-safe base64-encoded key
    # If the stored value looks like a raw Fernet key, use directly
    try:
        key_bytes = raw.encode() if isinstance(raw, str) else raw
        return Fernet(key_bytes)
    except Exception:
        # Derive a proper Fernet key from an arbitrary string
        import hashlib
        digest = hashlib.sha256(raw.encode()).digest()
        fernet_key = base64.urlsafe_b64encode(digest)
        return Fernet(fernet_key)


def encrypt(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return _get_fernet().decrypt(ciphertext.encode()).decode()


# ─── Table bootstrap ─────────────────────────────────────────────────────────

def _ensure_table() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS integration_credentials (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             INTEGER NOT NULL,
            vendor              TEXT    NOT NULL,
            credential_type     TEXT    NOT NULL DEFAULT 'api_key',
            encrypted_credential TEXT   NOT NULL,
            scopes_granted      TEXT,
            status              TEXT    NOT NULL DEFAULT 'active',
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_verified_at    TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE (user_id, vendor)
        )
    """)
    conn.commit()
    conn.close()


# ─── Pydantic models ──────────────────────────────────────────────────────────

class CredentialCreate(BaseModel):
    vendor: str
    credential: str          # raw plaintext — will be encrypted before storage
    credential_type: str = "api_key"
    scopes_granted: Optional[str] = None


class CredentialOut(BaseModel):
    id: int
    vendor: str
    credential_type: str
    status: str
    created_at: str
    last_verified_at: Optional[str]

    class Config:
        from_attributes = True


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/api/credentials", status_code=201)
def store_credential(
    payload: CredentialCreate,
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """Encrypt and store a vendor credential. Upserts on vendor+user_id."""
    _ensure_table()
    if not payload.credential.strip():
        raise HTTPException(status_code=400, detail="Credential cannot be empty.")

    encrypted = encrypt(payload.credential.strip())
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO integration_credentials
                (user_id, vendor, credential_type, encrypted_credential, scopes_granted, status)
            VALUES (?, ?, ?, ?, ?, 'active')
            ON CONFLICT(user_id, vendor) DO UPDATE SET
                credential_type      = excluded.credential_type,
                encrypted_credential = excluded.encrypted_credential,
                scopes_granted       = excluded.scopes_granted,
                status               = 'active',
                created_at           = CURRENT_TIMESTAMP,
                last_verified_at     = NULL
        """, (user_id, payload.vendor, payload.credential_type, encrypted, payload.scopes_granted))
        conn.commit()
        row = conn.execute(
            "SELECT id, vendor, credential_type, status, created_at, last_verified_at "
            "FROM integration_credentials WHERE user_id = ? AND vendor = ?",
            (user_id, payload.vendor),
        ).fetchone()
    finally:
        conn.close()

    return dict(row)


@router.get("/api/credentials")
def list_credentials(user_id: int = Depends(get_current_user)) -> Dict[str, Any]:
    """List connected integrations — never returns the plaintext credential."""
    _ensure_table()
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, vendor, credential_type, status, created_at, last_verified_at "
            "FROM integration_credentials WHERE user_id = ? ORDER BY vendor",
            (user_id,),
        ).fetchall()
    finally:
        conn.close()
    return {"credentials": [dict(r) for r in rows]}


@router.delete("/api/credentials/{cred_id}", status_code=204)
def delete_credential(cred_id: int, user_id: int = Depends(get_current_user)) -> None:
    """Revoke and delete a stored credential."""
    _ensure_table()
    conn = get_db()
    try:
        result = conn.execute(
            "DELETE FROM integration_credentials WHERE id = ? AND user_id = ?",
            (cred_id, user_id),
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Credential not found.")
    finally:
        conn.close()


@router.post("/api/credentials/{cred_id}/verify")
def verify_credential(cred_id: int, user_id: int = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Attempt a live API call using the stored credential to confirm it's valid.
    Currently implemented for Okta; other vendors return a placeholder result.
    """
    _ensure_table()
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, vendor, encrypted_credential FROM integration_credentials "
            "WHERE id = ? AND user_id = ? AND status = 'active'",
            (cred_id, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Credential not found.")

        vendor = row["vendor"]
        plaintext = decrypt(row["encrypted_credential"])
    finally:
        conn.close()

    # ── Vendor-specific verification ─────────────────────────────────────────
    ok = False
    detail = ""
    try:
        if vendor == "okta":
            from backend.mcp.okta_iam import verify_okta_token
            ok, detail = verify_okta_token(plaintext)
        else:
            # Placeholder: mark as verified for unsupported vendors
            ok, detail = True, f"Live verification not yet implemented for '{vendor}' — credential saved."
    except ImportError:
        ok, detail = True, "MCP server not installed — credential saved but not verified live."
    except Exception as e:
        ok, detail = False, str(e)

    # Update last_verified_at
    conn2 = get_db()
    try:
        conn2.execute(
            "UPDATE integration_credentials SET last_verified_at = ?, status = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), "active" if ok else "error", cred_id),
        )
        conn2.commit()
    finally:
        conn2.close()

    if not ok:
        raise HTTPException(status_code=422, detail=detail)
    return {"ok": True, "detail": detail}
