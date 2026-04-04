"""
Database Service

Provides persistence layer for the consent platform.
Uses SQLite for development, PostgreSQL-ready for production.

Tables:
- tenants
- purposes
- vendors
- consent_tokens
- enforcement_decisions
- evidence_log
- api_keys
- policies
- webhooks
"""

import aiosqlite
import json
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import asyncio


# Database path
DB_PATH = os.environ.get("DATABASE_PATH", "consent_platform.db")


class Database:
    """
    Async database service with connection pooling.
    SQLite for dev, PostgreSQL-ready for production.
    """
    
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._initialized = False
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a database connection"""
        conn = await aiosqlite.connect(self.db_path)
        conn.row_factory = aiosqlite.Row
        try:
            yield conn
        finally:
            await conn.close()
    
    async def initialize(self):
        """Initialize database schema"""
        if self._initialized:
            return
        
        async with self.get_connection() as conn:
            await conn.executescript(SCHEMA)
            await conn.commit()
        
        self._initialized = True
        print(f"Database initialized at {self.db_path}")
    
    # ==================== Tenants ====================
    
    async def create_tenant(self, tenant: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new tenant"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO tenants (id, name, domain, public_key, private_key_encrypted, 
                                    key_version, default_ttl_days, failure_mode, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant["id"], tenant["name"], tenant.get("domain"),
                tenant["public_key"], tenant["private_key_encrypted"],
                tenant.get("key_version", 1), tenant.get("default_ttl_days", 14),
                tenant.get("failure_mode", "fail_closed"), tenant.get("status", "active")
            ))
            await conn.commit()
        return tenant
    
    async def get_tenant(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Get a tenant by ID"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM tenants WHERE id = ?", (tenant_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
    
    async def update_tenant(self, tenant_id: str, updates: Dict[str, Any]) -> bool:
        """Update a tenant"""
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [tenant_id]
        
        async with self.get_connection() as conn:
            await conn.execute(
                f"UPDATE tenants SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                values
            )
            await conn.commit()
        return True
    
    # ==================== API Keys ====================
    
    async def create_api_key(self, api_key: Dict[str, Any]) -> Dict[str, Any]:
        """Create an API key"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO api_keys (id, tenant_id, key_hash, name, scopes, expires_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                api_key["id"], api_key["tenant_id"], api_key["key_hash"],
                api_key.get("name"), json.dumps(api_key.get("scopes", [])),
                api_key.get("expires_at"), api_key.get("status", "active")
            ))
            await conn.commit()
        return api_key
    
    async def get_api_key_by_hash(self, key_hash: str) -> Optional[Dict[str, Any]]:
        """Get an API key by its hash"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM api_keys WHERE key_hash = ? AND status = 'active'", (key_hash,)
            )
            row = await cursor.fetchone()
            if row:
                result = dict(row)
                result["scopes"] = json.loads(result["scopes"]) if result["scopes"] else []
                return result
            return None
    
    async def update_api_key_last_used(self, key_id: str):
        """Update the last used timestamp for an API key"""
        async with self.get_connection() as conn:
            await conn.execute(
                "UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?",
                (key_id,)
            )
            await conn.commit()
    
    async def list_api_keys(self, tenant_id: str) -> List[Dict[str, Any]]:
        """List API keys for a tenant"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT id, tenant_id, name, scopes, expires_at, last_used_at, status, created_at "
                "FROM api_keys WHERE tenant_id = ? ORDER BY created_at DESC",
                (tenant_id,)
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def revoke_api_key(self, key_id: str) -> bool:
        """Revoke an API key"""
        async with self.get_connection() as conn:
            await conn.execute(
                "UPDATE api_keys SET status = 'revoked' WHERE id = ?", (key_id,)
            )
            await conn.commit()
        return True
    
    # ==================== Consent Tokens ====================
    
    async def store_token(self, token: Dict[str, Any]) -> Dict[str, Any]:
        """Store a consent token"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO consent_tokens (id, tenant_id, token_hash, subject_id, 
                                           purposes, vendors, constraints, jurisdiction,
                                           issued_at, expires_at, key_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                token["id"], token["tenant_id"], token["token_hash"],
                token["subject_id"], json.dumps(token["purposes"]),
                json.dumps(token["vendors"]), json.dumps(token.get("constraints", {})),
                token["jurisdiction"], token["issued_at"], token["expires_at"],
                token["key_version"]
            ))
            await conn.commit()
        return token
    
    async def get_token_by_hash(self, token_hash: str) -> Optional[Dict[str, Any]]:
        """Get a token by its hash"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM consent_tokens WHERE token_hash = ?", (token_hash,)
            )
            row = await cursor.fetchone()
            if row:
                result = dict(row)
                result["purposes"] = json.loads(result["purposes"])
                result["vendors"] = json.loads(result["vendors"])
                result["constraints"] = json.loads(result["constraints"]) if result["constraints"] else {}
                return result
            return None
    
    async def revoke_token(self, token_id: str, reason: str) -> bool:
        """Revoke a token"""
        async with self.get_connection() as conn:
            await conn.execute(
                "UPDATE consent_tokens SET revoked_at = CURRENT_TIMESTAMP, revocation_reason = ? WHERE id = ?",
                (reason, token_id)
            )
            await conn.commit()
        return True
    
    async def list_tokens(self, tenant_id: str, subject_id: str = None, 
                         limit: int = 50) -> List[Dict[str, Any]]:
        """List tokens for a tenant"""
        async with self.get_connection() as conn:
            if subject_id:
                cursor = await conn.execute(
                    "SELECT * FROM consent_tokens WHERE tenant_id = ? AND subject_id = ? "
                    "ORDER BY issued_at DESC LIMIT ?",
                    (tenant_id, subject_id, limit)
                )
            else:
                cursor = await conn.execute(
                    "SELECT * FROM consent_tokens WHERE tenant_id = ? ORDER BY issued_at DESC LIMIT ?",
                    (tenant_id, limit)
                )
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                r = dict(row)
                r["purposes"] = json.loads(r["purposes"])
                r["vendors"] = json.loads(r["vendors"])
                results.append(r)
            return results
    
    # ==================== Enforcement Decisions ====================
    
    async def store_decision(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Store an enforcement decision"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO enforcement_decisions (id, tenant_id, event_id, idempotency_key,
                                                  event_type, vendor, data_classes, token_hash,
                                                  token_valid, token_expired, decision, reason,
                                                  policy_id, fields_stripped, fields_anonymized,
                                                  forwarded, forwarded_at, vendor_response_code,
                                                  vendor_event_id, latency_ms, previous_hash, decision_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                decision["id"], decision["tenant_id"], decision["event_id"],
                decision.get("idempotency_key"), decision["event_type"], decision["vendor"],
                json.dumps(decision.get("data_classes", [])), decision.get("token_hash"),
                decision["token_valid"], decision.get("token_expired", False),
                decision["decision"], decision.get("reason"), decision.get("policy_id"),
                json.dumps(decision.get("fields_stripped", [])),
                json.dumps(decision.get("fields_anonymized", [])),
                decision.get("forwarded", False), decision.get("forwarded_at"),
                decision.get("vendor_response_code"), decision.get("vendor_event_id"),
                decision.get("latency_ms"), decision.get("previous_hash"),
                decision["decision_hash"]
            ))
            await conn.commit()
        return decision
    
    async def get_decision_by_idempotency_key(self, tenant_id: str, 
                                              idempotency_key: str) -> Optional[Dict[str, Any]]:
        """Get a decision by idempotency key"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM enforcement_decisions WHERE tenant_id = ? AND idempotency_key = ?",
                (tenant_id, idempotency_key)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
    
    async def list_decisions(self, tenant_id: str, limit: int = 100, 
                            offset: int = 0) -> List[Dict[str, Any]]:
        """List decisions for a tenant"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM enforcement_decisions WHERE tenant_id = ? "
                "ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (tenant_id, limit, offset)
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
    
    # ==================== Evidence Log ====================
    
    async def append_evidence(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Append to the evidence log (immutable)"""
        async with self.get_connection() as conn:
            cursor = await conn.execute("""
                INSERT INTO evidence_log (tenant_id, event_type, event_data, 
                                         previous_hash, event_hash, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING sequence
            """, (
                event["tenant_id"], event["event_type"], json.dumps(event["event_data"]),
                event.get("previous_hash"), event["event_hash"], event["timestamp"]
            ))
            row = await cursor.fetchone()
            await conn.commit()
            event["sequence"] = row[0] if row else None
        return event
    
    async def query_evidence(self, tenant_id: str = None, event_type: str = None,
                            start_time: datetime = None, end_time: datetime = None,
                            limit: int = 100) -> List[Dict[str, Any]]:
        """Query evidence log"""
        conditions = []
        params = []
        
        if tenant_id:
            conditions.append("tenant_id = ?")
            params.append(tenant_id)
        if event_type:
            conditions.append("event_type = ?")
            params.append(event_type)
        if start_time:
            conditions.append("timestamp >= ?")
            params.append(start_time.isoformat())
        if end_time:
            conditions.append("timestamp <= ?")
            params.append(end_time.isoformat())
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        params.append(limit)
        
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                f"SELECT * FROM evidence_log WHERE {where_clause} ORDER BY sequence DESC LIMIT ?",
                params
            )
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                r = dict(row)
                r["event_data"] = json.loads(r["event_data"])
                results.append(r)
            return results
    
    async def get_latest_evidence_hash(self, tenant_id: str) -> Optional[str]:
        """Get the latest evidence hash for a tenant"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT event_hash FROM evidence_log WHERE tenant_id = ? ORDER BY sequence DESC LIMIT 1",
                (tenant_id,)
            )
            row = await cursor.fetchone()
            return row[0] if row else None
    
    # ==================== Vendors ====================
    
    async def create_vendor(self, vendor: Dict[str, Any]) -> Dict[str, Any]:
        """Create a vendor"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO vendors (id, tenant_id, name, display_name, vendor_type,
                                    endpoint_url, api_key_encrypted, allowed_data_classes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                vendor["id"], vendor["tenant_id"], vendor["name"],
                vendor.get("display_name"), vendor.get("vendor_type"),
                vendor.get("endpoint_url"), vendor.get("api_key_encrypted"),
                json.dumps(vendor.get("allowed_data_classes", [])),
                vendor.get("status", "active")
            ))
            await conn.commit()
        return vendor
    
    async def get_vendor(self, tenant_id: str, vendor_name: str) -> Optional[Dict[str, Any]]:
        """Get a vendor by name"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM vendors WHERE tenant_id = ? AND name = ?",
                (tenant_id, vendor_name)
            )
            row = await cursor.fetchone()
            if row:
                result = dict(row)
                result["allowed_data_classes"] = json.loads(result["allowed_data_classes"])
                return result
            return None
    
    async def list_vendors(self, tenant_id: str) -> List[Dict[str, Any]]:
        """List vendors for a tenant"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM vendors WHERE tenant_id = ? ORDER BY name",
                (tenant_id,)
            )
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                r = dict(row)
                r["allowed_data_classes"] = json.loads(r["allowed_data_classes"])
                results.append(r)
            return results
    
    # ==================== Webhooks ====================
    
    async def create_webhook(self, webhook: Dict[str, Any]) -> Dict[str, Any]:
        """Create a webhook"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO webhooks (id, tenant_id, url, events, secret_hash, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                webhook["id"], webhook["tenant_id"], webhook["url"],
                json.dumps(webhook.get("events", [])), webhook.get("secret_hash"),
                webhook.get("status", "active")
            ))
            await conn.commit()
        return webhook
    
    async def list_webhooks(self, tenant_id: str) -> List[Dict[str, Any]]:
        """List webhooks for a tenant"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM webhooks WHERE tenant_id = ? AND status = 'active'",
                (tenant_id,)
            )
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                r = dict(row)
                r["events"] = json.loads(r["events"])
                results.append(r)
            return results
    
    async def get_webhooks_for_event(self, tenant_id: str, event_type: str) -> List[Dict[str, Any]]:
        """Get webhooks that should receive a specific event type"""
        webhooks = await self.list_webhooks(tenant_id)
        return [w for w in webhooks if event_type in w["events"] or "*" in w["events"]]
    
    # ==================== Rate Limiting ====================
    
    async def get_rate_limit_count(self, tenant_id: str, window_key: str) -> int:
        """Get current rate limit count for a window"""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT count FROM rate_limits WHERE tenant_id = ? AND window_key = ?",
                (tenant_id, window_key)
            )
            row = await cursor.fetchone()
            return row[0] if row else 0
    
    async def increment_rate_limit(self, tenant_id: str, window_key: str, 
                                   ttl_seconds: int = 60) -> int:
        """Increment rate limit counter"""
        async with self.get_connection() as conn:
            # Try to insert or update
            await conn.execute("""
                INSERT INTO rate_limits (tenant_id, window_key, count, expires_at)
                VALUES (?, ?, 1, datetime('now', '+' || ? || ' seconds'))
                ON CONFLICT (tenant_id, window_key) DO UPDATE SET count = count + 1
            """, (tenant_id, window_key, ttl_seconds))
            
            cursor = await conn.execute(
                "SELECT count FROM rate_limits WHERE tenant_id = ? AND window_key = ?",
                (tenant_id, window_key)
            )
            row = await cursor.fetchone()
            await conn.commit()
            return row[0] if row else 1
    
    async def cleanup_expired_rate_limits(self):
        """Clean up expired rate limit entries"""
        async with self.get_connection() as conn:
            await conn.execute("DELETE FROM rate_limits WHERE expires_at < datetime('now')")
            await conn.commit()


# Database schema
SCHEMA = """
-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT NOT NULL,
    key_version INTEGER DEFAULT 1,
    default_ttl_days INTEGER DEFAULT 14,
    failure_mode TEXT DEFAULT 'fail_closed',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT,
    scopes TEXT,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Consent Tokens
CREATE TABLE IF NOT EXISTS consent_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    subject_id TEXT NOT NULL,
    purposes TEXT NOT NULL,
    vendors TEXT NOT NULL,
    constraints TEXT,
    jurisdiction TEXT,
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revocation_reason TEXT,
    key_version INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_tokens_tenant ON consent_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tokens_subject ON consent_tokens(subject_id);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON consent_tokens(token_hash);

-- Enforcement Decisions
CREATE TABLE IF NOT EXISTS enforcement_decisions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    idempotency_key TEXT,
    event_type TEXT NOT NULL,
    vendor TEXT NOT NULL,
    data_classes TEXT,
    token_hash TEXT,
    token_valid BOOLEAN NOT NULL,
    token_expired BOOLEAN DEFAULT FALSE,
    decision TEXT NOT NULL,
    reason TEXT,
    policy_id TEXT,
    fields_stripped TEXT,
    fields_anonymized TEXT,
    forwarded BOOLEAN DEFAULT FALSE,
    forwarded_at TIMESTAMP,
    vendor_response_code INTEGER,
    vendor_event_id TEXT,
    latency_ms REAL,
    previous_hash TEXT,
    decision_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_decisions_tenant ON enforcement_decisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decisions_idempotency ON enforcement_decisions(tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON enforcement_decisions(created_at);

-- Evidence Log (Immutable)
CREATE TABLE IF NOT EXISTS evidence_log (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL,
    previous_hash TEXT,
    event_hash TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON evidence_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_log(event_type);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT,
    vendor_type TEXT,
    endpoint_url TEXT,
    api_key_encrypted TEXT,
    allowed_data_classes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, name)
);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT NOT NULL,
    secret_hash TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Rate Limits
CREATE TABLE IF NOT EXISTS rate_limits (
    tenant_id TEXT NOT NULL,
    window_key TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    PRIMARY KEY (tenant_id, window_key)
);

-- Purposes
CREATE TABLE IF NOT EXISTS purposes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    legal_basis TEXT DEFAULT 'consent',
    default_ttl_days INTEGER DEFAULT 14,
    requires_explicit_consent BOOLEAN DEFAULT TRUE,
    allowed_data_classes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, name)
);

-- Policies
CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    rules TEXT NOT NULL,
    jurisdictions TEXT,
    purposes TEXT,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
"""

# Singleton instance
db = Database()
