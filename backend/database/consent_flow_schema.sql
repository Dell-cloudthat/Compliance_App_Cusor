-- Consent Flow Architecture Schema
-- Flow: User Consent → Authorization Token → Ad Data Proxy → Vendor/Platform → Evidence Ledger

-- =====================================================
-- AUTHORIZATION TOKENS
-- Tokens generated from user consent for data access
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_authorization_tokens (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    subject_id TEXT NOT NULL REFERENCES consent_subjects(id),
    
    -- Token details
    token_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the actual token
    token_prefix TEXT NOT NULL,        -- First 8 chars for identification
    token_type TEXT DEFAULT 'bearer' CHECK (token_type IN ('bearer', 'jwt', 'opaque')),
    
    -- Consent scope
    granted_purposes TEXT[] NOT NULL,  -- Array of purpose IDs this token grants access to
    granted_scopes TEXT[] DEFAULT '{}', -- Fine-grained scopes (e.g., 'read:analytics', 'write:marketing')
    consent_record_ids TEXT[],         -- Links to consent records that authorize this token
    
    -- Validity
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    use_count INTEGER DEFAULT 0,
    max_uses INTEGER,  -- Optional: limit number of uses
    
    -- Context
    issued_for_vendor_id TEXT REFERENCES consent_vendors(id),
    ip_address TEXT,
    user_agent TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired', 'exhausted')),
    revoked_at TIMESTAMP,
    revoked_reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- VENDORS / PLATFORMS
-- Third-party vendors that receive data
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_vendors (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    
    -- Vendor identification
    name TEXT NOT NULL,
    vendor_type TEXT CHECK (vendor_type IN ('ad_platform', 'analytics', 'marketing', 'social', 'data_broker', 'crm', 'cdp', 'dmp', 'other')),
    vendor_code TEXT,  -- Unique code for this vendor (e.g., 'google_ads', 'facebook_pixel')
    
    -- Contact & legal
    company_name TEXT,
    website_url TEXT,
    privacy_policy_url TEXT,
    data_processing_agreement_url TEXT,
    contact_email TEXT,
    
    -- Integration details
    api_endpoint TEXT,
    api_version TEXT,
    integration_type TEXT CHECK (integration_type IN ('api', 'pixel', 'sdk', 'server_to_server', 'webhook', 'file_transfer')),
    
    -- Data handling
    data_categories_received TEXT[],  -- What data this vendor receives
    purposes_served TEXT[],           -- Which purposes this vendor fulfills
    data_retention_days INTEGER,
    transfers_outside_eea BOOLEAN DEFAULT FALSE,
    transfer_safeguards TEXT,         -- e.g., 'SCCs', 'Adequacy Decision', 'BCRs'
    
    -- Compliance
    gdpr_compliant BOOLEAN DEFAULT FALSE,
    ccpa_compliant BOOLEAN DEFAULT FALSE,
    iso_27001_certified BOOLEAN DEFAULT FALSE,
    soc2_certified BOOLEAN DEFAULT FALSE,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_review', 'blocked')),
    onboarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_data_sent_at TIMESTAMP,
    
    -- Metadata
    settings JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(organization_id, vendor_code)
);

-- =====================================================
-- AD DATA PROXY CONFIGURATION
-- Proxy rules for enforcing consent before data flows
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_proxy_rules (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    
    -- Rule identification
    name TEXT NOT NULL,
    description TEXT,
    rule_order INTEGER DEFAULT 0,  -- Lower numbers = higher priority
    
    -- Matching conditions
    match_vendors TEXT[],          -- Which vendors this rule applies to (NULL = all)
    match_purposes TEXT[],         -- Which purposes trigger this rule
    match_data_categories TEXT[],  -- Which data categories
    match_geo_locations TEXT[],    -- Geographic restrictions (e.g., ['EU', 'CA'])
    
    -- Actions
    action TEXT NOT NULL CHECK (action IN ('allow', 'block', 'filter', 'anonymize', 'aggregate', 'delay', 'require_consent')),
    
    -- Filtering configuration (when action = 'filter')
    filter_fields TEXT[],          -- Fields to remove
    anonymize_fields TEXT[],       -- Fields to anonymize
    aggregate_config JSONB,        -- Aggregation settings
    
    -- Delay configuration (when action = 'delay')
    delay_seconds INTEGER,
    delay_until_consent BOOLEAN DEFAULT FALSE,
    
    -- Consent requirements
    required_purposes TEXT[],      -- Purposes that must be consented
    required_legal_basis TEXT[],   -- Required legal basis
    
    -- Logging
    log_matches BOOLEAN DEFAULT TRUE,
    log_level TEXT DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
    
    -- Status
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- PROXY TRANSACTIONS
-- Record of data flowing through the proxy
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_proxy_transactions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    
    -- Request identification
    transaction_id TEXT NOT NULL UNIQUE,  -- External transaction ID
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Source
    subject_id TEXT REFERENCES consent_subjects(id),
    token_id TEXT REFERENCES consent_authorization_tokens(id),
    source_ip TEXT,
    source_user_agent TEXT,
    
    -- Destination
    vendor_id TEXT REFERENCES consent_vendors(id),
    destination_endpoint TEXT,
    
    -- Request details
    data_categories TEXT[],
    purposes TEXT[],
    payload_size_bytes INTEGER,
    payload_hash TEXT,  -- Hash of original payload for verification
    
    -- Processing
    rules_evaluated TEXT[],        -- IDs of rules that were checked
    rule_matched TEXT,             -- ID of rule that matched (if any)
    action_taken TEXT,             -- What action was taken
    
    -- Transformation
    fields_filtered TEXT[],
    fields_anonymized TEXT[],
    transformed_payload_hash TEXT,
    
    -- Result
    status TEXT CHECK (status IN ('allowed', 'blocked', 'filtered', 'pending', 'failed', 'timeout')),
    response_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    
    -- Evidence linking
    evidence_ledger_id TEXT REFERENCES consent_evidence_ledger(id)
);

-- =====================================================
-- IMMUTABLE EVIDENCE LEDGER
-- Cryptographically secured, append-only audit trail
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_evidence_ledger (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    
    -- Sequence for ordering
    sequence_number BIGSERIAL,
    
    -- Event identification
    event_type TEXT NOT NULL CHECK (event_type IN (
        'consent_given', 'consent_withdrawn', 'consent_expired',
        'token_issued', 'token_used', 'token_revoked',
        'data_requested', 'data_allowed', 'data_blocked', 'data_filtered',
        'vendor_data_sent', 'vendor_data_failed',
        'dsar_received', 'dsar_completed',
        'policy_updated', 'purpose_created', 'purpose_deleted'
    )),
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Entities involved
    subject_id TEXT,
    token_id TEXT,
    vendor_id TEXT,
    purpose_id TEXT,
    
    -- Event details
    event_data JSONB NOT NULL,
    
    -- Cryptographic chain (for immutability)
    previous_hash TEXT,           -- Hash of previous entry
    entry_hash TEXT NOT NULL,     -- Hash of this entry (includes previous_hash)
    
    -- Signature
    signed_by TEXT,               -- ID of signing key
    signature TEXT,               -- Digital signature
    signature_algorithm TEXT DEFAULT 'SHA256withRSA',
    
    -- Proof of existence
    merkle_root TEXT,             -- Merkle tree root at time of entry
    blockchain_anchor TEXT,       -- Optional: anchor to public blockchain
    
    -- Storage
    archived BOOLEAN DEFAULT FALSE,
    archive_location TEXT,
    
    -- This table is APPEND-ONLY - no updates or deletes allowed
    CONSTRAINT no_future_events CHECK (event_timestamp <= CURRENT_TIMESTAMP + INTERVAL '1 minute')
);

-- Ensure immutability with a trigger (no UPDATE, no DELETE)
-- Note: This would be implemented as a database trigger in production

-- =====================================================
-- CONSENT FLOW SESSIONS
-- Track the complete flow from consent to evidence
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_flow_sessions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    
    -- Flow tracking
    flow_id TEXT NOT NULL UNIQUE,  -- Unique flow identifier
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Stage 1: User Consent
    consent_subject_id TEXT REFERENCES consent_subjects(id),
    consent_record_ids TEXT[],
    consent_timestamp TIMESTAMP,
    consent_method TEXT,
    
    -- Stage 2: Authorization Token
    token_id TEXT REFERENCES consent_authorization_tokens(id),
    token_issued_at TIMESTAMP,
    token_scopes TEXT[],
    
    -- Stage 3: Ad Data Proxy
    proxy_transaction_id TEXT REFERENCES consent_proxy_transactions(id),
    proxy_action TEXT,
    proxy_timestamp TIMESTAMP,
    
    -- Stage 4: Vendor/Platform
    vendor_id TEXT REFERENCES consent_vendors(id),
    vendor_request_timestamp TIMESTAMP,
    vendor_response_status TEXT,
    vendor_response_timestamp TIMESTAMP,
    
    -- Stage 5: Evidence Ledger
    evidence_ids TEXT[],
    ledger_entries_count INTEGER DEFAULT 0,
    
    -- Flow status
    current_stage TEXT CHECK (current_stage IN ('consent', 'token', 'proxy', 'vendor', 'evidence', 'completed', 'failed')),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'cancelled')),
    error_stage TEXT,
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_auth_tokens_subject ON consent_authorization_tokens(subject_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_org ON consent_authorization_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_status ON consent_authorization_tokens(status);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON consent_authorization_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_vendors_org ON consent_vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON consent_vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON consent_vendors(status);

CREATE INDEX IF NOT EXISTS idx_proxy_rules_org ON consent_proxy_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_proxy_rules_enabled ON consent_proxy_rules(enabled);

CREATE INDEX IF NOT EXISTS idx_proxy_tx_org ON consent_proxy_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_proxy_tx_vendor ON consent_proxy_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_proxy_tx_timestamp ON consent_proxy_transactions(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_proxy_tx_status ON consent_proxy_transactions(status);

CREATE INDEX IF NOT EXISTS idx_evidence_org ON consent_evidence_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON consent_evidence_ledger(event_type);
CREATE INDEX IF NOT EXISTS idx_evidence_timestamp ON consent_evidence_ledger(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_evidence_subject ON consent_evidence_ledger(subject_id);
CREATE INDEX IF NOT EXISTS idx_evidence_sequence ON consent_evidence_ledger(sequence_number);

CREATE INDEX IF NOT EXISTS idx_flow_sessions_org ON consent_flow_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_stage ON consent_flow_sessions(current_stage);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_status ON consent_flow_sessions(status);
