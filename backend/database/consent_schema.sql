-- Consent as a Service Platform Database Schema
-- Supports GDPR, CCPA, and other privacy regulation compliance

-- Organizations/Tenants table
CREATE TABLE IF NOT EXISTS consent_organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#1E40AF',
    privacy_policy_url TEXT,
    terms_of_service_url TEXT,
    data_retention_days INTEGER DEFAULT 365,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    settings JSONB DEFAULT '{}'::jsonb
);

-- Consent purposes/categories
CREATE TABLE IF NOT EXISTS consent_purposes (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    legal_basis TEXT CHECK (legal_basis IN ('consent', 'legitimate_interest', 'contract', 'legal_obligation', 'vital_interest', 'public_task')),
    is_essential BOOLEAN DEFAULT FALSE,
    default_enabled BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    data_categories TEXT[], -- e.g., ['personal_data', 'usage_data', 'marketing']
    retention_period_days INTEGER,
    third_party_sharing BOOLEAN DEFAULT FALSE,
    third_parties TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted'))
);

-- Data subjects (users who give consent)
CREATE TABLE IF NOT EXISTS consent_subjects (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    external_id TEXT, -- Customer's own user ID
    email TEXT,
    hashed_identifier TEXT, -- For anonymous tracking
    ip_address_hash TEXT,
    country_code TEXT,
    region TEXT,
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(organization_id, external_id),
    UNIQUE(organization_id, hashed_identifier)
);

-- Consent records (the actual consent given/withdrawn)
CREATE TABLE IF NOT EXISTS consent_records (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    subject_id TEXT NOT NULL REFERENCES consent_subjects(id),
    purpose_id TEXT NOT NULL REFERENCES consent_purposes(id),
    granted BOOLEAN NOT NULL,
    consent_method TEXT CHECK (consent_method IN ('explicit', 'implicit', 'opt_out', 'opt_in', 'banner', 'preference_center', 'api')),
    consent_version TEXT,
    policy_version TEXT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    source_url TEXT,
    proof_data JSONB DEFAULT '{}'::jsonb, -- Store proof of consent (screenshots, timestamps, etc.)
    UNIQUE(subject_id, purpose_id, collected_at)
);

-- Consent audit log (immutable record of all consent changes)
CREATE TABLE IF NOT EXISTS consent_audit_log (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    subject_id TEXT REFERENCES consent_subjects(id),
    purpose_id TEXT REFERENCES consent_purposes(id),
    record_id TEXT REFERENCES consent_records(id),
    action TEXT NOT NULL CHECK (action IN ('consent_given', 'consent_withdrawn', 'consent_expired', 'purpose_created', 'purpose_updated', 'purpose_deleted', 'subject_created', 'data_export_requested', 'data_deletion_requested', 'data_deleted')),
    old_value JSONB,
    new_value JSONB,
    actor_type TEXT CHECK (actor_type IN ('user', 'system', 'admin', 'api')),
    actor_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Consent banners/widgets configuration
CREATE TABLE IF NOT EXISTS consent_banners (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    name TEXT NOT NULL,
    banner_type TEXT CHECK (banner_type IN ('cookie_banner', 'privacy_notice', 'marketing_consent', 'data_collection', 'custom')),
    position TEXT DEFAULT 'bottom' CHECK (position IN ('top', 'bottom', 'center', 'bottom_left', 'bottom_right')),
    layout TEXT DEFAULT 'bar' CHECK (layout IN ('bar', 'modal', 'popup', 'floating')),
    title TEXT,
    description TEXT,
    accept_button_text TEXT DEFAULT 'Accept All',
    reject_button_text TEXT DEFAULT 'Reject All',
    customize_button_text TEXT DEFAULT 'Customize',
    show_reject_button BOOLEAN DEFAULT TRUE,
    show_customize_button BOOLEAN DEFAULT TRUE,
    auto_dismiss_seconds INTEGER,
    blocking_mode BOOLEAN DEFAULT FALSE, -- Block page interaction until consent given
    geo_targeting JSONB DEFAULT '[]'::jsonb, -- Show only in specific regions
    purposes TEXT[], -- Which purposes this banner collects consent for
    styling JSONB DEFAULT '{}'::jsonb,
    custom_css TEXT,
    translations JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft'))
);

-- Data subject access requests (DSAR)
CREATE TABLE IF NOT EXISTS consent_dsar_requests (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    subject_id TEXT REFERENCES consent_subjects(id),
    request_type TEXT NOT NULL CHECK (request_type IN ('access', 'deletion', 'rectification', 'portability', 'restriction', 'objection')),
    requestor_email TEXT NOT NULL,
    requestor_name TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verification_method TEXT,
    verification_completed_at TIMESTAMP,
    request_status TEXT DEFAULT 'received' CHECK (request_status IN ('received', 'in_progress', 'completed', 'rejected', 'cancelled')),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP, -- Usually 30 days for GDPR
    completed_at TIMESTAMP,
    response_data JSONB,
    notes TEXT,
    assigned_to TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Consent analytics (aggregated metrics)
CREATE TABLE IF NOT EXISTS consent_analytics (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    banner_id TEXT REFERENCES consent_banners(id),
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    accepts INTEGER DEFAULT 0,
    rejects INTEGER DEFAULT 0,
    customizes INTEGER DEFAULT 0,
    ignores INTEGER DEFAULT 0,
    country_breakdown JSONB DEFAULT '{}'::jsonb,
    device_breakdown JSONB DEFAULT '{}'::jsonb,
    purpose_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, banner_id, date)
);

-- API keys for external integrations
CREATE TABLE IF NOT EXISTS consent_api_keys (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    permissions TEXT[] DEFAULT ARRAY['read', 'write'],
    rate_limit_per_minute INTEGER DEFAULT 1000,
    allowed_origins TEXT[],
    allowed_ips TEXT[],
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked'))
);

-- Webhook configurations
CREATE TABLE IF NOT EXISTS consent_webhooks (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES consent_organizations(id),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT[] NOT NULL, -- ['consent.given', 'consent.withdrawn', 'dsar.received', etc.]
    headers JSONB DEFAULT '{}'::jsonb,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    last_triggered_at TIMESTAMP,
    last_status_code INTEGER,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'failing'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consent_records_subject ON consent_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_purpose ON consent_records(purpose_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_org ON consent_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_collected ON consent_records(collected_at);
CREATE INDEX IF NOT EXISTS idx_consent_audit_org ON consent_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_subject ON consent_audit_log(subject_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_created ON consent_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_consent_subjects_org ON consent_subjects(organization_id);
CREATE INDEX IF NOT EXISTS idx_consent_subjects_external ON consent_subjects(organization_id, external_id);
CREATE INDEX IF NOT EXISTS idx_consent_analytics_date ON consent_analytics(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_consent_dsar_org ON consent_dsar_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_consent_dsar_status ON consent_dsar_requests(request_status);
