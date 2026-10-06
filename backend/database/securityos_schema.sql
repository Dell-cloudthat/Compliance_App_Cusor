-- ============================================================
-- SecurityOS PostgreSQL Schema
-- Clean, purpose-built schema for the SecurityOS GRC product.
-- No consent platform, no consulting tables.
-- ============================================================

-- Extension: generate UUIDs server-side
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Organizations ────────────────────────────────────────────────────────────
-- Each org is one business unit (SMB customer or MSP-managed client).
-- MSP accounts have is_msp = true; their clients have msp_parent_id set.

CREATE TABLE IF NOT EXISTS organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE,                        -- URL-friendly identifier
    plan            TEXT NOT NULL DEFAULT 'solo'        -- solo | starter | professional | msp
                        CHECK (plan IN ('solo','starter','professional','msp')),
    is_msp          BOOLEAN NOT NULL DEFAULT FALSE,     -- TRUE = this org is an MSP account
    msp_parent_id   UUID REFERENCES organizations(id) ON DELETE SET NULL,  -- client's MSP
    -- Business profile (denormalized for fast scoring)
    industry        TEXT,
    employee_count  TEXT,
    email_provider  TEXT,
    cloud_providers JSONB DEFAULT '[]',
    sensitive_data  JSONB DEFAULT '[]',
    contact_email   TEXT,
    notes           TEXT,
    --
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ                         -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_orgs_msp_parent ON organizations (msp_parent_id) WHERE msp_parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orgs_plan ON organizations (plan);


-- ── Organization Users ────────────────────────────────────────────────────────
-- Users who can access an organization's SecurityOS dashboard.
-- MSP admins have access to all their client orgs via msp_parent_id relationship.

CREATE TABLE IF NOT EXISTS organization_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('owner','admin','analyst','viewer')),
    invited_by  UUID REFERENCES organization_users(id),
    accepted_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_users_org ON organization_users (org_id);
CREATE INDEX IF NOT EXISTS idx_org_users_email ON organization_users (email);


-- ── Control Statuses ──────────────────────────────────────────────────────────
-- One row per (org, control). The scoring engine reads this table.
-- evidence_source: automatic | manual | inferred | none
-- status: pass | fail | unknown | in_progress | not_applicable

CREATE TABLE IF NOT EXISTS control_statuses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    control_id      TEXT NOT NULL,                      -- e.g. "CTRL-ID-001", "CTRL-AI-003"
    status          TEXT NOT NULL DEFAULT 'unknown'
                        CHECK (status IN ('pass','fail','unknown','in_progress','not_applicable')),
    evidence_source TEXT NOT NULL DEFAULT 'none'
                        CHECK (evidence_source IN ('automatic','manual','inferred','none')),
    notes           TEXT,
    updated_by      UUID REFERENCES organization_users(id),
    last_checked    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_ctrl_statuses_org ON control_statuses (org_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_statuses_control ON control_statuses (control_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_statuses_status ON control_statuses (org_id, status);


-- ── Integration Connections ───────────────────────────────────────────────────
-- Tracks which external systems are connected per org.
-- Credentials are stored as a reference to a secrets manager, never plaintext.

CREATE TABLE IF NOT EXISTS integration_connections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_type    TEXT NOT NULL
                            CHECK (integration_type IN (
                                'microsoft_365', 'google_workspace',
                                'microsoft_intune', 'microsoft_defender',
                                'azure_backup', 'aws_backup', 'aws',
                                'manual'
                            )),
    display_name        TEXT,                           -- e.g. "Contoso M365"
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','connected','error','disconnected')),
    credentials_ref     TEXT,                           -- Reference to secrets manager key
    scope               JSONB DEFAULT '[]',             -- OAuth scopes granted
    tenant_id           TEXT,                           -- Azure/Google tenant ID
    last_synced_at      TIMESTAMPTZ,
    last_error          TEXT,
    sync_frequency      TEXT DEFAULT 'daily'
                            CHECK (sync_frequency IN ('realtime','hourly','daily','manual')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integrations_org ON integration_connections (org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integration_connections (status);


-- ── Evidence Records ──────────────────────────────────────────────────────────
-- Raw evidence from integration API calls, normalized for the scoring engine.
-- Immutable — each sync creates new records. Historical evidence is retained.

CREATE TABLE IF NOT EXISTS evidence_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_id      UUID REFERENCES integration_connections(id) ON DELETE SET NULL,
    check_name          TEXT NOT NULL,                  -- EvidenceCheck enum value
    control_id          TEXT,                           -- Which control this satisfies
    raw_payload         JSONB,                          -- Full API response (for audit)
    normalized_value    JSONB,                          -- {value: bool|int, unit: str, detail: str}
    evidence_source     TEXT DEFAULT 'automatic',
    collected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Evaluation result (computed from normalized_value by the pipeline)
    evaluated_status    TEXT CHECK (evaluated_status IN ('pass','fail','unknown')),
    confidence          NUMERIC(3,2) DEFAULT 1.0        -- 0.0 - 1.0
);

CREATE INDEX IF NOT EXISTS idx_evidence_org ON evidence_records (org_id);
CREATE INDEX IF NOT EXISTS idx_evidence_control ON evidence_records (control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_collected ON evidence_records (collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_check ON evidence_records (check_name);


-- ── API Keys ──────────────────────────────────────────────────────────────────
-- For MSP and Professional plan API access.
-- key_hash stores SHA-256 of the actual key — never store plaintext.

CREATE TABLE IF NOT EXISTS api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_prefix  TEXT NOT NULL,                          -- First 8 chars, shown to user for identification
    key_hash    TEXT NOT NULL UNIQUE,                   -- SHA-256(full_key)
    scope       TEXT NOT NULL DEFAULT 'read'
                    CHECK (scope IN ('read','write','admin')),
    label       TEXT,
    expires_at  TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked_at  TIMESTAMPTZ,
    created_by  UUID REFERENCES organization_users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys (org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);


-- ── Audit Log ─────────────────────────────────────────────────────────────────
-- Immutable record of all security-relevant actions.

CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id     UUID REFERENCES organization_users(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,                          -- e.g. "control.status.update"
    resource    TEXT,                                   -- e.g. "CTRL-ID-001"
    detail      JSONB,                                  -- Before/after, context
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action);


-- ── Triggers: auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_orgs_updated_at
        BEFORE UPDATE ON organizations
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_ctrl_statuses_updated_at
        BEFORE UPDATE ON control_statuses
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_integrations_updated_at
        BEFORE UPDATE ON integration_connections
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── Views ─────────────────────────────────────────────────────────────────────

-- Org summary: one row per org with counts of control statuses
CREATE OR REPLACE VIEW org_control_summary AS
SELECT
    o.id AS org_id,
    o.name,
    o.plan,
    o.msp_parent_id,
    COUNT(cs.id)                                                        AS total_controls_tracked,
    COUNT(cs.id) FILTER (WHERE cs.status = 'pass')                      AS passing,
    COUNT(cs.id) FILTER (WHERE cs.status = 'fail')                      AS failing,
    COUNT(cs.id) FILTER (WHERE cs.status = 'unknown')                   AS unknown,
    COUNT(cs.id) FILTER (WHERE cs.status = 'in_progress')               AS in_progress,
    COUNT(cs.id) FILTER (WHERE cs.evidence_source = 'automatic')        AS auto_verified,
    MAX(cs.updated_at)                                                  AS last_activity
FROM organizations o
LEFT JOIN control_statuses cs ON cs.org_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name, o.plan, o.msp_parent_id;


-- MSP portfolio: one row per MSP with aggregate client metrics
CREATE OR REPLACE VIEW msp_portfolio_summary AS
SELECT
    msp.id                              AS msp_id,
    msp.name                            AS msp_name,
    COUNT(DISTINCT client.id)           AS total_clients,
    COUNT(cs.id) FILTER (WHERE cs.status = 'fail')   AS total_failing_across_clients,
    COUNT(ic.id) FILTER (WHERE ic.status = 'connected') AS total_active_integrations
FROM organizations msp
JOIN organizations client ON client.msp_parent_id = msp.id AND client.deleted_at IS NULL
LEFT JOIN control_statuses cs ON cs.org_id = client.id
LEFT JOIN integration_connections ic ON ic.org_id = client.id
WHERE msp.is_msp = TRUE AND msp.deleted_at IS NULL
GROUP BY msp.id, msp.name;
