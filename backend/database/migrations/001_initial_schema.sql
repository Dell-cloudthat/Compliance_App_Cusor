-- Migration 001: Initial Schema Consolidation
-- This migration consolidates all tables from various services into a single schema
-- Run this on a fresh database or use the migration runner

-- ============================================================================
-- Schema Version Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Users and Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    organization TEXT,
    role TEXT DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Sources (API Integrations)
CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    vendor TEXT,
    connection_info TEXT,
    status TEXT DEFAULT 'active',
    last_sync TIMESTAMP,
    sync_frequency TEXT DEFAULT 'hourly',
    metadata_tags TEXT,
    contains_pii BOOLEAN DEFAULT 0,
    contains_cui BOOLEAN DEFAULT 0,
    responsible_party TEXT,
    evidence_attribution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Data Segments
CREATE TABLE IF NOT EXISTS data_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    data_source_id INTEGER NOT NULL,
    control_id TEXT NOT NULL,
    segment_name TEXT NOT NULL,
    data_payload TEXT,
    metadata_tags TEXT,
    contains_pii BOOLEAN DEFAULT 0,
    contains_cui BOOLEAN DEFAULT 0,
    pii_types TEXT,
    data_classification TEXT,
    retention_days INTEGER DEFAULT 90,
    responsible_party TEXT,
    coverage_type TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
);

-- Compliance Controls
CREATE TABLE IF NOT EXISTS controls (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    control_name TEXT NOT NULL,
    description TEXT,
    frameworks TEXT,
    category TEXT,
    priority TEXT,
    status TEXT DEFAULT 'Partial',
    responsible_party TEXT,
    covered_by TEXT,
    evidence_link TEXT,
    mapped_fields TEXT,
    default_owner TEXT,
    entity_id INTEGER,
    auto_mapped BOOLEAN DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- Audit Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_engagements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    audit_name TEXT NOT NULL,
    framework TEXT NOT NULL,
    audit_type TEXT NOT NULL,
    auditor_name TEXT,
    auditor_contact TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'planned',
    scope TEXT,
    readiness_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_engagement_id INTEGER NOT NULL,
    control_id TEXT NOT NULL,
    finding_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    remediation_plan TEXT,
    assigned_to TEXT,
    due_date DATE,
    status TEXT DEFAULT 'open',
    resolved_date DATE,
    evidence_required TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)
);

CREATE TABLE IF NOT EXISTS audit_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_engagement_id INTEGER,
    control_id TEXT NOT NULL,
    evidence_type TEXT NOT NULL,
    evidence_name TEXT NOT NULL,
    file_path TEXT,
    file_url TEXT,
    file_size_bytes INTEGER,
    uploaded_by TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated BOOLEAN DEFAULT 0,
    validated_by TEXT,
    validated_at TIMESTAMP,
    expiration_date DATE,
    metadata TEXT,
    notes TEXT,
    FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)
);

-- ============================================================================
-- IAM Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    entity_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS permission_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    permission_type TEXT NOT NULL,
    granted_by INTEGER NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    approval_workflow_id INTEGER,
    metadata_json TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (granted_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS approval_workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_name TEXT,
    requestor_id INTEGER NOT NULL,
    approver_id INTEGER,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    permission_requested TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    FOREIGN KEY (requestor_id) REFERENCES users(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS permission_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_hash TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    permission_id INTEGER,
    granted_by INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    resource_type TEXT,
    resource_id TEXT,
    permission_type TEXT,
    previous_permissions TEXT,
    new_permissions TEXT,
    metadata_json TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- ============================================================================
-- Security & Compliance Alignment (CSCA) Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL,
    source_tool TEXT,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    affected_resources TEXT,
    security_event_data TEXT,
    detected_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    status TEXT DEFAULT 'open',
    assigned_to TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS security_event_compliance_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    security_event_id INTEGER NOT NULL,
    control_id TEXT NOT NULL,
    framework TEXT NOT NULL,
    impact_level TEXT NOT NULL,
    compliance_impact TEXT,
    mapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (security_event_id) REFERENCES security_events(id)
);

CREATE TABLE IF NOT EXISTS compliance_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    security_event_id INTEGER,
    control_id TEXT,
    framework TEXT,
    compliance_score_before INTEGER,
    compliance_score_after INTEGER,
    remediation_guidance TEXT,
    status TEXT DEFAULT 'open',
    drift_payload TEXT,
    resolution_metadata TEXT,
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    resolved_by TEXT,
    acknowledged BOOLEAN DEFAULT 0,
    acknowledged_at TIMESTAMP,
    acknowledged_by TEXT,
    metadata_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (security_event_id) REFERENCES security_events(id)
);

CREATE TABLE IF NOT EXISTS compliance_score_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    framework TEXT NOT NULL,
    overall_score INTEGER NOT NULL,
    controls_implemented INTEGER,
    controls_total INTEGER,
    gaps_count INTEGER,
    security_event_impact INTEGER DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- Workflow Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    workflow_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    trigger_config TEXT,
    steps TEXT,
    conditions TEXT,
    escalation_rules TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'running',
    trigger_event TEXT,
    trigger_data TEXT,
    current_step INTEGER DEFAULT 0,
    execution_data TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workflow_step_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id INTEGER NOT NULL,
    step_index INTEGER NOT NULL,
    step_name TEXT,
    action_type TEXT,
    status TEXT,
    input_data TEXT,
    output_data TEXT,
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    FOREIGN KEY (execution_id) REFERENCES workflow_executions(id)
);

-- ============================================================================
-- Integration Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    integration_type TEXT NOT NULL,
    name TEXT NOT NULL,
    vendor TEXT,
    config TEXT,
    status TEXT DEFAULT 'active',
    last_sync_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS edr_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    integration_id INTEGER,
    event_id TEXT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    hostname TEXT,
    process_name TEXT,
    file_hash TEXT,
    user_name TEXT,
    description TEXT,
    raw_data TEXT,
    detected_at TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (integration_id) REFERENCES integrations(id)
);

CREATE TABLE IF NOT EXISTS network_appliance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    integration_id INTEGER,
    log_type TEXT NOT NULL,
    source_ip TEXT,
    destination_ip TEXT,
    source_port INTEGER,
    destination_port INTEGER,
    protocol TEXT,
    action TEXT,
    rule_name TEXT,
    bytes_sent INTEGER,
    bytes_received INTEGER,
    raw_data TEXT,
    logged_at TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (integration_id) REFERENCES integrations(id)
);

CREATE TABLE IF NOT EXISTS identity_provider_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    integration_id INTEGER,
    event_type TEXT NOT NULL,
    actor TEXT,
    target TEXT,
    application TEXT,
    ip_address TEXT,
    location TEXT,
    result TEXT,
    risk_level TEXT,
    raw_data TEXT,
    occurred_at TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (integration_id) REFERENCES integrations(id)
);

CREATE TABLE IF NOT EXISTS cloud_platform_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    integration_id INTEGER,
    cloud_provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_name TEXT,
    resource_type TEXT,
    resource_id TEXT,
    region TEXT,
    actor TEXT,
    source_ip TEXT,
    raw_data TEXT,
    occurred_at TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (integration_id) REFERENCES integrations(id)
);

-- ============================================================================
-- Data Flow Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_flow_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    node_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sensitivity TEXT,
    data_domains TEXT,
    classification_tags TEXT,
    owner TEXT,
    responsible_party TEXT,
    framework_controls TEXT,
    evidence_links TEXT,
    integration_status TEXT DEFAULT 'active',
    last_sync_at TIMESTAMP,
    sync_frequency TEXT,
    system_of_record BOOLEAN DEFAULT 0,
    metadata_json TEXT,
    layout_position TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS data_flow_edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    source_node_id INTEGER NOT NULL,
    target_node_id INTEGER NOT NULL,
    flow_type TEXT NOT NULL,
    transport TEXT,
    encryption_status TEXT,
    retention_policy TEXT,
    latency TEXT,
    volume TEXT,
    status TEXT DEFAULT 'active',
    automated BOOLEAN DEFAULT 1,
    controls_impacted TEXT,
    metadata_json TEXT,
    last_validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (source_node_id) REFERENCES data_flow_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_node_id) REFERENCES data_flow_nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS data_flow_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER,
    before_state TEXT,
    after_state TEXT,
    performed_by INTEGER NOT NULL,
    reason TEXT,
    approval_reference TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- ============================================================================
-- Learning & Pattern Detection Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS learned_remediation_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pattern_name TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    trigger_conditions TEXT NOT NULL,
    remediation_steps TEXT NOT NULL,
    success_rate REAL DEFAULT 0.0,
    times_applied INTEGER DEFAULT 0,
    times_successful INTEGER DEFAULT 0,
    avg_resolution_time_minutes REAL,
    confidence_score REAL DEFAULT 0.5,
    source_alert_types TEXT,
    source_frameworks TEXT,
    auto_apply BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_applied_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS auto_generated_playbooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    playbook_name TEXT NOT NULL,
    description TEXT,
    target_alert_type TEXT,
    target_severity TEXT,
    target_frameworks TEXT,
    steps TEXT NOT NULL,
    estimated_time_minutes INTEGER,
    automation_level TEXT DEFAULT 'guided',
    success_criteria TEXT,
    rollback_steps TEXT,
    generated_from_pattern_id INTEGER,
    times_used INTEGER DEFAULT 0,
    avg_effectiveness_score REAL,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (generated_from_pattern_id) REFERENCES learned_remediation_patterns(id)
);

CREATE TABLE IF NOT EXISTS security_event_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pattern_name TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    pattern_description TEXT,
    pattern_signature TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.0,
    severity TEXT NOT NULL,
    first_detected_at TIMESTAMP NOT NULL,
    last_detected_at TIMESTAMP NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    affected_frameworks TEXT,
    affected_controls TEXT,
    trend_direction TEXT,
    trend_percentage REAL,
    status TEXT DEFAULT 'active',
    auto_acknowledged BOOLEAN DEFAULT 0,
    acknowledged_at TIMESTAMP,
    acknowledged_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS alert_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    actor TEXT,
    event_type TEXT NOT NULL,
    status TEXT,
    notes TEXT,
    actions_taken TEXT,
    evidence_links TEXT,
    metadata_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES compliance_alerts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_data_segments_control ON data_segments(control_id);
CREATE INDEX IF NOT EXISTS idx_data_segments_source ON data_segments(data_source_id);
CREATE INDEX IF NOT EXISTS idx_controls_user ON controls(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_user ON data_sources(user_id);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_engagements_user ON audit_engagements(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_engagements_status ON audit_engagements(status);
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON audit_findings(audit_engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_control ON audit_evidence(control_id);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_status ON security_events(status);
CREATE INDEX IF NOT EXISTS idx_security_events_detected ON security_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_user ON compliance_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(status);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- Data flow indexes
CREATE INDEX IF NOT EXISTS idx_data_flow_nodes_user ON data_flow_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_data_flow_edges_user ON data_flow_edges(user_id);

-- IAM indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_user ON permission_audit_log(user_id);

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (1, '001_initial_schema');
