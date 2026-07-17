"""
Violation Source Evidence Trail
================================
Records the actual entities (users, devices, IPs, service accounts) behind
each compliance gap — pulled from the MCP integration layer.

Data model
----------
violation_sources:
  • tenant_user_id  — platform user (tenant) who owns this record
  • control_id      — NIST/ISO/SOC2 control that is violated
  • violation_type  — e.g. 'inactive_mfa', 'stale_access', 'unpatched_device'
  • source_vendor   — 'okta' | 'crowdstrike' | 'sentinelone' | 'aws' | …
  • entity_type     — 'user' | 'device' | 'ip' | 'service_account'
  • email / hostname / display_name  — human-readable identity of the violator
  • raw_context     — JSON blob of vendor-specific metadata
  • first_seen / last_seen  — rolling 30-day window
  • expires_at      — default CURRENT_TIMESTAMP + 30 days
  • storage_tier    — 'hot' (SQLite) | 'glacier' (AWS Glacier)
  • glacier_key     — S3/Glacier object key when archived

Retention policy
----------------
• Hot (default): 30 days in SQLite, accessible via this API
• Glacier (optional, paid tier): call POST /api/violations/archive/{id}
  to push to Glacier before the 30-day expiry; the record is then
  soft-deleted from SQLite with glacier_key stored.
• A daily purge job (POST /api/violations/purge) cleans expired hot records.
"""

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from database import DB_PATH, get_db
from services.auth_service import get_current_user

router = APIRouter()

HOT_RETENTION_DAYS = 30

# ─── Table bootstrap ─────────────────────────────────────────────────────────

def _ensure_table() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS violation_sources (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_user_id  INTEGER NOT NULL,
            control_id      TEXT    NOT NULL,
            violation_type  TEXT    NOT NULL,
            source_vendor   TEXT    NOT NULL,
            entity_type     TEXT    NOT NULL DEFAULT 'user',
            source_id       TEXT,
            email           TEXT,
            hostname        TEXT,
            display_name    TEXT,
            raw_context     TEXT,
            first_seen      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at      TIMESTAMP,
            storage_tier    TEXT    NOT NULL DEFAULT 'hot',
            archived_at     TIMESTAMP,
            glacier_key     TEXT,
            FOREIGN KEY (tenant_user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_vs_tenant   ON violation_sources(tenant_user_id);
        CREATE INDEX IF NOT EXISTS idx_vs_control  ON violation_sources(tenant_user_id, control_id);
        CREATE INDEX IF NOT EXISTS idx_vs_expires  ON violation_sources(expires_at);
        CREATE INDEX IF NOT EXISTS idx_vs_vendor   ON violation_sources(tenant_user_id, source_vendor);
    """)
    conn.commit()
    conn.close()


# ─── Pydantic models ──────────────────────────────────────────────────────────

class ViolationIngest(BaseModel):
    control_id:     str
    violation_type: str
    source_vendor:  str
    entity_type:    str = "user"
    source_id:      Optional[str] = None
    email:          Optional[str] = None
    hostname:       Optional[str] = None
    display_name:   Optional[str] = None
    raw_context:    Optional[Dict[str, Any]] = None
    retention_days: int = HOT_RETENTION_DAYS


class ViolationBulkIngest(BaseModel):
    violations: List[ViolationIngest]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _identity_key(v: ViolationIngest) -> str:
    """Unique fingerprint for dedup — same entity+control = upsert."""
    return f"{v.control_id}|{v.source_vendor}|{v.entity_type}|{v.source_id or v.email or v.hostname or ''}"


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/api/violations/ingest", status_code=201)
def ingest_violations(
    payload: ViolationBulkIngest,
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Receive one or more violation source records from an MCP integration run.
    Upserts on (tenant_user_id, control_id, source_vendor, entity_type, source_id/email/hostname)
    — re-detection bumps last_seen and extends expires_at.
    """
    _ensure_table()
    conn = get_db()
    inserted = updated = 0
    now = datetime.now(timezone.utc).isoformat()

    try:
        for v in payload.violations:
            expires = (
                datetime.now(timezone.utc) + timedelta(days=v.retention_days)
            ).isoformat()
            raw = json.dumps(v.raw_context) if v.raw_context else None

            existing = conn.execute(
                """SELECT id FROM violation_sources
                   WHERE tenant_user_id = ? AND control_id = ?
                     AND source_vendor = ? AND entity_type = ?
                     AND COALESCE(source_id,'') = COALESCE(?,'')
                     AND COALESCE(email,'')    = COALESCE(?,'')
                     AND COALESCE(hostname,'') = COALESCE(?,'')
                     AND storage_tier = 'hot'""",
                (user_id, v.control_id, v.source_vendor, v.entity_type,
                 v.source_id, v.email, v.hostname),
            ).fetchone()

            if existing:
                conn.execute(
                    """UPDATE violation_sources
                       SET last_seen = ?, expires_at = ?, raw_context = ?
                       WHERE id = ?""",
                    (now, expires, raw, existing["id"]),
                )
                updated += 1
            else:
                conn.execute(
                    """INSERT INTO violation_sources
                         (tenant_user_id, control_id, violation_type, source_vendor,
                          entity_type, source_id, email, hostname, display_name,
                          raw_context, first_seen, last_seen, expires_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (user_id, v.control_id, v.violation_type, v.source_vendor,
                     v.entity_type, v.source_id, v.email, v.hostname, v.display_name,
                     raw, now, now, expires),
                )
                inserted += 1

        conn.commit()
    finally:
        conn.close()

    return {"inserted": inserted, "updated": updated, "total": inserted + updated}


@router.get("/api/violations")
def list_violations(
    control_id:   Optional[str] = Query(None),
    source_vendor:Optional[str] = Query(None),
    entity_type:  Optional[str] = Query(None),
    limit:        int           = Query(200),
    include_archived: bool      = Query(False),
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    List active violation sources for the tenant (hot tier, within 30-day window).
    Optionally include Glacier-archived records.
    """
    _ensure_table()
    conn = get_db()
    try:
        clauses = ["tenant_user_id = ?"]
        params: List[Any] = [user_id]

        if not include_archived:
            clauses.append("storage_tier = 'hot'")
            clauses.append("(expires_at IS NULL OR expires_at > datetime('now'))")

        if control_id:
            clauses.append("control_id = ?")
            params.append(control_id)
        if source_vendor:
            clauses.append("source_vendor = ?")
            params.append(source_vendor)
        if entity_type:
            clauses.append("entity_type = ?")
            params.append(entity_type)

        where = " AND ".join(clauses)
        rows = conn.execute(
            f"""SELECT id, control_id, violation_type, source_vendor, entity_type,
                       source_id, email, hostname, display_name,
                       first_seen, last_seen, expires_at, storage_tier, glacier_key
                FROM violation_sources
                WHERE {where}
                ORDER BY last_seen DESC
                LIMIT ?""",
            params + [limit],
        ).fetchall()

        # Days-remaining in hot tier
        now = datetime.now(timezone.utc)
        records = []
        for r in rows:
            d = dict(r)
            if d.get("expires_at") and d["storage_tier"] == "hot":
                exp = datetime.fromisoformat(d["expires_at"].replace("Z", "+00:00"))
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                d["days_remaining"] = max(0, (exp - now).days)
            else:
                d["days_remaining"] = None
            records.append(d)

    finally:
        conn.close()

    return {"violations": records, "total": len(records)}


@router.get("/api/violations/summary")
def violation_summary(
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Aggregated counts: by control, by vendor, by entity type, expiring soon.
    """
    _ensure_table()
    conn = get_db()
    try:
        by_control = conn.execute(
            """SELECT control_id, COUNT(*) as count
               FROM violation_sources
               WHERE tenant_user_id = ? AND storage_tier = 'hot'
                 AND (expires_at IS NULL OR expires_at > datetime('now'))
               GROUP BY control_id ORDER BY count DESC LIMIT 20""",
            (user_id,),
        ).fetchall()

        by_vendor = conn.execute(
            """SELECT source_vendor, COUNT(*) as count
               FROM violation_sources
               WHERE tenant_user_id = ? AND storage_tier = 'hot'
                 AND (expires_at IS NULL OR expires_at > datetime('now'))
               GROUP BY source_vendor ORDER BY count DESC""",
            (user_id,),
        ).fetchall()

        by_type = conn.execute(
            """SELECT entity_type, COUNT(*) as count
               FROM violation_sources
               WHERE tenant_user_id = ? AND storage_tier = 'hot'
                 AND (expires_at IS NULL OR expires_at > datetime('now'))
               GROUP BY entity_type""",
            (user_id,),
        ).fetchall()

        expiring_soon = conn.execute(
            """SELECT COUNT(*) as n FROM violation_sources
               WHERE tenant_user_id = ? AND storage_tier = 'hot'
                 AND expires_at BETWEEN datetime('now') AND datetime('now', '+7 days')""",
            (user_id,),
        ).fetchone()["n"]

        total_hot = conn.execute(
            """SELECT COUNT(*) as n FROM violation_sources
               WHERE tenant_user_id = ? AND storage_tier = 'hot'
                 AND (expires_at IS NULL OR expires_at > datetime('now'))""",
            (user_id,),
        ).fetchone()["n"]

        total_archived = conn.execute(
            """SELECT COUNT(*) as n FROM violation_sources
               WHERE tenant_user_id = ? AND storage_tier = 'glacier'""",
            (user_id,),
        ).fetchone()["n"]

    finally:
        conn.close()

    return {
        "total_active":    total_hot,
        "total_archived":  total_archived,
        "expiring_7_days": expiring_soon,
        "by_control":  [dict(r) for r in by_control],
        "by_vendor":   [dict(r) for r in by_vendor],
        "by_entity_type": [dict(r) for r in by_type],
    }


@router.post("/api/violations/archive/{violation_id}")
def archive_to_glacier(
    violation_id: int,
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Push a single violation record to AWS Glacier for long-term retention.
    The record is soft-deleted from hot tier and glacier_key is stored.
    """
    _ensure_table()
    conn = get_db()
    try:
        row = conn.execute(
            """SELECT * FROM violation_sources
               WHERE id = ? AND tenant_user_id = ? AND storage_tier = 'hot'""",
            (violation_id, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Violation record not found in hot tier.")

        data = dict(row)
    finally:
        conn.close()

    # Push to Glacier
    from services.glacier import archive_violation
    glacier_key = archive_violation(user_id=user_id, record=data)

    # Mark as archived in SQLite
    conn2 = get_db()
    try:
        conn2.execute(
            """UPDATE violation_sources
               SET storage_tier = 'glacier', archived_at = ?, glacier_key = ?,
                   expires_at   = NULL
               WHERE id = ?""",
            (datetime.now(timezone.utc).isoformat(), glacier_key, violation_id),
        )
        conn2.commit()
    finally:
        conn2.close()

    return {"archived": True, "glacier_key": glacier_key, "id": violation_id}


@router.post("/api/violations/archive-bulk")
def archive_bulk(
    control_id:   Optional[str] = Query(None),
    source_vendor:Optional[str] = Query(None),
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """Archive all hot records matching optional filters."""
    _ensure_table()
    conn = get_db()
    try:
        clauses = ["tenant_user_id = ?", "storage_tier = 'hot'"]
        params: List[Any] = [user_id]
        if control_id:
            clauses.append("control_id = ?"); params.append(control_id)
        if source_vendor:
            clauses.append("source_vendor = ?"); params.append(source_vendor)

        rows = conn.execute(
            f"SELECT * FROM violation_sources WHERE {' AND '.join(clauses)}",
            params,
        ).fetchall()
    finally:
        conn.close()

    from services.glacier import archive_violation
    archived = 0
    for row in rows:
        data = dict(row)
        key = archive_violation(user_id=user_id, record=data)
        conn2 = get_db()
        try:
            conn2.execute(
                """UPDATE violation_sources SET storage_tier='glacier', archived_at=?, glacier_key=?, expires_at=NULL
                   WHERE id=?""",
                (datetime.now(timezone.utc).isoformat(), key, data["id"]),
            )
            conn2.commit()
        finally:
            conn2.close()
        archived += 1

    return {"archived": archived}


@router.post("/api/violations/purge")
def purge_expired(
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Hard-delete hot-tier records past their expires_at and not yet archived.
    Called by a scheduler or manually triggered by the tenant.
    """
    _ensure_table()
    conn = get_db()
    try:
        result = conn.execute(
            """DELETE FROM violation_sources
               WHERE tenant_user_id = ? AND storage_tier = 'hot'
                 AND expires_at < datetime('now')""",
            (user_id,),
        )
        conn.commit()
        deleted = result.rowcount
    finally:
        conn.close()
    return {"purged": deleted}


# ─── Okta sync trigger ────────────────────────────────────────────────────────

@router.post("/api/violations/sync/okta")
def sync_okta_violations(
    inactive_days: int = Query(90),
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Pull the calling user's stored Okta credential, run violation scans
    via the IAM MCP tools, and ingest results into violation_sources.
    """
    from routes.credentials import decrypt
    _ensure_table()

    # Load stored Okta credential
    conn = get_db()
    try:
        cred_row = conn.execute(
            "SELECT encrypted_credential FROM integration_credentials "
            "WHERE user_id = ? AND vendor = 'okta' AND status = 'active'",
            (user_id,),
        ).fetchone()
    finally:
        conn.close()

    if not cred_row:
        raise HTTPException(
            status_code=400,
            detail="No active Okta credential found. Connect Okta in Integrations first.",
        )

    raw_cred = decrypt(cred_row["encrypted_credential"])
    # Expect format "domain::token"
    if "::" in raw_cred:
        domain, token = raw_cred.split("::", 1)
    else:
        raise HTTPException(
            status_code=400,
            detail="Okta credential must be stored as 'your-domain.okta.com::API_TOKEN'.",
        )

    from mcp.okta_iam import OktaIAMClient, okta_get_violation_sources
    client = OktaIAMClient(domain=domain, token=token)
    raw_violations = okta_get_violation_sources(client, inactive_days=inactive_days)

    if not raw_violations:
        return {"ingested": 0, "message": "No violations detected in Okta"}

    # Ingest via the standard route logic
    now = datetime.now(timezone.utc).isoformat()
    expires = (datetime.now(timezone.utc) + timedelta(days=HOT_RETENTION_DAYS)).isoformat()
    conn2 = get_db()
    ingested = 0
    try:
        for v in raw_violations:
            raw_ctx = json.dumps(v.get("raw_context")) if v.get("raw_context") else None
            existing = conn2.execute(
                """SELECT id FROM violation_sources
                   WHERE tenant_user_id=? AND control_id=? AND source_vendor='okta'
                     AND entity_type=? AND COALESCE(email,'')=COALESCE(?,'')
                     AND storage_tier='hot'""",
                (user_id, v["control_id"], v.get("entity_type","user"), v.get("email")),
            ).fetchone()
            if existing:
                conn2.execute(
                    "UPDATE violation_sources SET last_seen=?, expires_at=?, raw_context=? WHERE id=?",
                    (now, expires, raw_ctx, existing["id"]),
                )
            else:
                conn2.execute(
                    """INSERT INTO violation_sources
                         (tenant_user_id,control_id,violation_type,source_vendor,entity_type,
                          source_id,email,hostname,display_name,raw_context,first_seen,last_seen,expires_at)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (user_id, v["control_id"], v["violation_type"], "okta",
                     v.get("entity_type","user"), v.get("source_id"), v.get("email"),
                     v.get("hostname"), v.get("display_name"), raw_ctx, now, now, expires),
                )
                ingested += 1
        conn2.commit()
    finally:
        conn2.close()

    return {"ingested": ingested, "total_found": len(raw_violations)}
