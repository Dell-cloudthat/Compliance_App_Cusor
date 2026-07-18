"""
Vendor credential management — store, list, delete, and verify encrypted credentials.

Encryption: Fernet (symmetric AES-128-CBC + HMAC-SHA256).
The key is derived from the CREDENTIAL_ENCRYPTION_KEY env var (must be a
valid URL-safe base64-encoded 32-byte key — generate with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

If the env var is absent a dev-only key is used and a warning is logged.
Do not run with the fallback key in any environment reachable from the internet.
"""

import logging
import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import DB_PATH
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── Encryption key ────────────────────────────────────────────────────────────

import base64 as _b64
# Exactly 32 raw bytes → valid 44-char Fernet key. NOT secret — dev/test only.
_DEV_FERNET_KEY = _b64.urlsafe_b64encode(b"dev-only-key-not-for-production!")

def _get_fernet() -> Fernet:
    raw = os.environ.get("CREDENTIAL_ENCRYPTION_KEY", "").strip()
    if raw:
        try:
            return Fernet(raw.encode())
        except Exception as exc:
            logger.error("Invalid CREDENTIAL_ENCRYPTION_KEY: %s — falling back to dev key", exc)
    else:
        logger.warning(
            "CREDENTIAL_ENCRYPTION_KEY not set — using insecure dev key. "
            "Set this env var before deploying."
        )
    return Fernet(_DEV_FERNET_KEY)


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string and return a URL-safe base64 ciphertext."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a ciphertext string produced by encrypt(). Raises ValueError on failure."""
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt credential — key mismatch or corrupted data.") from exc


# ─── DB bootstrap ──────────────────────────────────────────────────────────────

def _ensure_table() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS integration_credentials (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id              INTEGER NOT NULL,
            vendor               TEXT    NOT NULL,
            label                TEXT,
            encrypted_credential TEXT    NOT NULL,
            status               TEXT    NOT NULL DEFAULT 'active',
            last_verified_at     TIMESTAMP,
            created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_cred_user_vendor ON integration_credentials(user_id, vendor)"
    )
    conn.commit()
    conn.close()


# ─── Pydantic models ───────────────────────────────────────────────────────────

class CredentialUpsert(BaseModel):
    """
    vendor     — e.g. "okta", "azure_ad", "google_workspace"
    credential — vendor-specific secret string.
                 Okta: "domain.okta.com::API_TOKEN"
                 Azure AD: "tenant_id::client_id::client_secret"
    label      — optional human-readable name for the UI
    """
    vendor: str
    credential: str
    label: Optional[str] = None


class CredentialOut(BaseModel):
    id: int
    vendor: str
    label: Optional[str]
    status: str
    last_verified_at: Optional[str]
    created_at: str


# ─── Routes ────────────────────────────────────────────────────────────────────

@router.post("/api/credentials", response_model=CredentialOut, status_code=201)
async def upsert_credential(
    payload: CredentialUpsert,
    user_id: int = Depends(get_current_user),
):
    """Store or replace the credential for a given vendor (upsert by user_id + vendor)."""
    _ensure_table()
    ciphertext = encrypt(payload.credential)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(
            """INSERT INTO integration_credentials (user_id, vendor, label, encrypted_credential, status)
               VALUES (?, ?, ?, ?, 'active')
               ON CONFLICT(user_id, vendor) DO UPDATE SET
                   label                = excluded.label,
                   encrypted_credential = excluded.encrypted_credential,
                   status               = 'active',
                   last_verified_at     = NULL""",
            (user_id, payload.vendor.lower(), payload.label, ciphertext),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM integration_credentials WHERE user_id = ? AND vendor = ?",
            (user_id, payload.vendor.lower()),
        ).fetchone()
        return CredentialOut(**dict(row))
    finally:
        conn.close()


@router.get("/api/credentials", response_model=List[CredentialOut])
async def list_credentials(user_id: int = Depends(get_current_user)):
    """List all stored credentials for the authenticated user (no plaintext returned)."""
    _ensure_table()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT * FROM integration_credentials WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        return [CredentialOut(**dict(r)) for r in rows]
    finally:
        conn.close()


@router.delete("/api/credentials/{vendor}", status_code=204)
async def delete_credential(
    vendor: str,
    user_id: int = Depends(get_current_user),
):
    """Delete the stored credential for a specific vendor."""
    _ensure_table()
    conn = sqlite3.connect(str(DB_PATH))
    try:
        result = conn.execute(
            "DELETE FROM integration_credentials WHERE user_id = ? AND vendor = ?",
            (user_id, vendor.lower()),
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"No credential found for vendor '{vendor}'")
    finally:
        conn.close()


@router.post("/api/credentials/{vendor}/verify")
async def verify_credential(
    vendor: str,
    user_id: int = Depends(get_current_user),
):
    """
    Attempt a live API call with the stored credential to verify it is still valid.
    Updates status and last_verified_at in the DB.
    """
    _ensure_table()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT * FROM integration_credentials WHERE user_id = ? AND vendor = ?",
            (user_id, vendor.lower()),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No credential found for vendor '{vendor}'")

        plaintext = decrypt(row["encrypted_credential"])
        success = False
        error_msg: Optional[str] = None

        if vendor.lower() == "okta":
            try:
                from integrations.clients.okta_iam import OktaIAMClient
                if "::" not in plaintext:
                    raise ValueError("Okta credential must be 'domain.okta.com::API_TOKEN'")
                domain, token = plaintext.split("::", 1)
                client = OktaIAMClient(domain=domain, token=token)
                # Lightweight check — fetch 1 user
                client._get("/users", params={"limit": 1})
                success = True
            except Exception as exc:
                error_msg = str(exc)
        else:
            error_msg = f"Verification not yet implemented for vendor '{vendor}'"

        new_status = "active" if success else "error"
        conn.execute(
            "UPDATE integration_credentials SET status = ?, last_verified_at = ? WHERE user_id = ? AND vendor = ?",
            (new_status, datetime.utcnow().isoformat(), user_id, vendor.lower()),
        )
        conn.commit()

        return {
            "vendor": vendor,
            "status": new_status,
            "verified": success,
            "error": error_msg,
            "verified_at": datetime.utcnow().isoformat(),
        }
    finally:
        conn.close()
