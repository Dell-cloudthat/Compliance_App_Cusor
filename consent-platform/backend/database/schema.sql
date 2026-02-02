-- Consent as a Service Platform
-- Database Schema (PostgreSQL-compatible, works with SQLite for demo)

-- ============================================
-- TENANTS (Multi-tenant support)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    
    -- Signing keys (ES256)
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT NOT NULL,  -- Encrypted at rest
    key_version INTEGER DEFAULT 1,
    
    -- Configuration
    default_ttl_days INTEGER DEFAULT 14,
    failure_mode TEXT DEFAULT 'fail_closed',  -- fail_open | fail_closed
    
    -- Status
    status TEXT DEFAULT 'active',  -- active | suspended
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);

-- ============================================
-- PURPOSES (What consent is for)
-- ============================================
CREATE TABLE IF NOT EXISTS purposes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    
    name TEXT NOT NULL,  -- e.g., "retargeting", "analytics"
    description TEXT,
    legal_basis TEXT DEFAULT 'consent',  -- consent | legitimate_interest | contract
    
    -- Defaults
    default_ttl_days INTEGER DEFAULT 14,
    requires_explicit_consent BOOLEAN DEFAULT TRUE,
    
    -- Data classes this purpose allows
    allowed_data_classes TEXT,  -- JSON array: ["behavioral", "device", "location"]
    
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purposes_tenant ON purposes(tenant_id);

-- ============================================
-- VENDORS (Ad platforms, analytics providers)
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    
    name TEXT NOT NULL,  -- e.g., "meta", "google"
    display_name TEXT,   -- e.g., "Meta (Facebook)"
    vendor_type TEXT,    -- ad_platform | analytics | cdp | dsp
    
    -- Integration config
    endpoint_url TEXT,
    api_key_encrypted TEXT,
    
    -- Data handling
    allowed_data_classes TEXT,  -- JSON array
    
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);

-- ============================================
-- CONSENT TOKENS (Issued tokens)
-- ============================================
CREATE TABLE IF NOT EXISTS consent_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    
    -- Token identity
    token_hash TEXT NOT NULL UNIQUE,  -- SHA256 of the token (for lookup without storing token)
    subject_id TEXT NOT NULL,         -- Hashed user ID
    
    -- Token contents (denormalized for query performance)
    purposes TEXT NOT NULL,           -- JSON: {"retargeting": {"allowed": true, "ttl_days": 14}}
    vendors TEXT NOT NULL,            -- JSON: {"meta": {"allowed": true, "data_classes": ["behavioral"]}}
    constraints TEXT,                 -- JSON: {"no_cross_site": true}
    jurisdiction TEXT,                -- GDPR | CPRA | LGPD | etc.
    
    -- Lifecycle
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revocation_reason TEXT,
    
    -- Metadata
    key_version INTEGER NOT NULL,     -- Which key version signed this
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_tenant ON consent_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tokens_subject ON consent_tokens(subject_id);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON consent_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON consent_tokens(expires_at);

-- ============================================
-- ENFORCEMENT DECISIONS (Hot storage - 30 days)
-- ============================================
CREATE TABLE IF NOT EXISTS enforcement_decisions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    
    -- Request
    event_id TEXT NOT NULL,
    idempotency_key TEXT,
    event_type TEXT NOT NULL,
    vendor TEXT NOT NULL,
    data_classes TEXT,  -- JSON array of data classes in the event
    
    -- Token
    token_hash TEXT,
    token_valid BOOLEAN NOT NULL,
    token_expired BOOLEAN DEFAULT FALSE,
    
    -- Decision
    decision TEXT NOT NULL,  -- allowed | modified | blocked
    reason TEXT,
    policy_id TEXT,
    
    -- Modifications (if decision = modified)
    fields_stripped TEXT,    -- JSON array
    fields_anonymized TEXT,  -- JSON array
    
    -- Forwarding
    forwarded BOOLEAN DEFAULT FALSE,
    forwarded_at TIMESTAMP,
    vendor_response_code INTEGER,
    vendor_event_id TEXT,    -- Acknowledgment from vendor
    
    -- Timing
    latency_ms REAL,
    
    -- Hash chain
    previous_hash TEXT,
    decision_hash TEXT NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decisions_tenant ON enforcement_decisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_decisions_event ON enforcement_decisions(event_id);
CREATE INDEX IF NOT EXISTS idx_decisions_idempotency ON enforcement_decisions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON enforcement_decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_decisions_vendor ON enforcement_decisions(vendor);

-- ============================================
-- EVIDENCE LOG (Immutable, append-only)
-- ============================================
CREATE TABLE IF NOT EXISTS evidence_log (
    sequence BIGSERIAL PRIMARY KEY,  -- Auto-incrementing, never gaps
    tenant_id TEXT NOT NULL,
    
    -- Event
    event_type TEXT NOT NULL,  -- consent_issued | consent_revoked | enforcement_decision | policy_changed
    event_data TEXT NOT NULL,  -- JSON payload
    
    -- Hash chain
    previous_hash TEXT,
    event_hash TEXT NOT NULL,
    
    -- Timestamp (immutable)
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- No updates or deletes allowed - enforce via application layer and/or triggers
CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON evidence_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_log(event_type);
CREATE INDEX IF NOT EXISTS idx_evidence_timestamp ON evidence_log(timestamp);

-- ============================================
-- POLICIES (Simple rule definitions)
-- ============================================
CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Rules (JSON)
    -- Format: [{"if": "vendor_not_allowed", "then": "block"}, ...]
    rules TEXT NOT NULL,
    
    -- Applicability
    jurisdictions TEXT,  -- JSON array: ["GDPR", "CPRA"] or null for all
    purposes TEXT,       -- JSON array or null for all
    
    priority INTEGER DEFAULT 0,  -- Higher = evaluated first
    
    status TEXT DEFAULT 'active',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);

-- ============================================
-- API KEYS (For tenant authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    
    key_hash TEXT NOT NULL UNIQUE,  -- SHA256 of the key
    name TEXT,
    
    -- Scopes
    scopes TEXT NOT NULL,  -- JSON array: ["consent:write", "events:write", "audit:read"]
    
    -- Lifecycle
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_apikeys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apikeys_hash ON api_keys(key_hash);
