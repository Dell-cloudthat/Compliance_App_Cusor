-- ============================================================================
-- Client Intake Tiers Schema
-- Supports 4 tiers of data ingestion for compliance automation
-- ============================================================================

-- Client Organizations (for MSPs and multi-tenant support)
CREATE TABLE IF NOT EXISTS client_organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, -- Owner user ID
  organization_name TEXT NOT NULL,
  organization_type TEXT DEFAULT 'SMB', -- 'SMB', 'Enterprise', 'MSP', 'Government', 'Healthcare'
  industry_vertical TEXT, -- 'Finance', 'Healthcare', 'Technology', 'Manufacturing', etc.
  compliance_frameworks TEXT, -- JSON array: ['SOC2', 'HIPAA', 'ISO27001']
  intake_tier INTEGER DEFAULT 1, -- 1=Manual, 2=Read-Only API, 3=Scheduled Exports, 4=Continuous
  contact_name TEXT,
  contact_email TEXT,
  billing_status TEXT DEFAULT 'active', -- 'active', 'trial', 'suspended', 'cancelled'
  onboarding_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- TIER 1: Manual/Document-Based Intake (FOUNDATION)
-- ============================================================================

-- Document Uploads (CSV, XLSX, PDF, Images, etc.)
CREATE TABLE IF NOT EXISTS intake_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_org_id INTEGER,
  document_type TEXT NOT NULL, -- 'CSV', 'XLSX', 'PDF', 'ARCHITECTURE_DIAGRAM', 'POLICY_DOC', 'SCREENSHOT', 'QUESTIONNAIRE'
  document_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT, -- Secure storage path
  file_size_bytes INTEGER,
  file_hash TEXT, -- SHA-256 hash for integrity
  mime_type TEXT,
  upload_source TEXT DEFAULT 'portal', -- 'portal', 'admin_upload', 'email', 'api'
  uploaded_by INTEGER NOT NULL,
  parsing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'manual_review'
  parsing_errors TEXT, -- JSON array of errors if failed
  parsed_data TEXT, -- JSON object with extracted data
  mapped_controls TEXT, -- JSON array of control IDs this document relates to
  metadata_tags TEXT, -- JSON array of metadata tags
  contains_pii BOOLEAN DEFAULT 0,
  contains_cui BOOLEAN DEFAULT 0,
  data_classification TEXT DEFAULT 'INTERNAL', -- 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'
  evidence_linked BOOLEAN DEFAULT 0, -- Whether linked to audit evidence
  evidence_id INTEGER, -- Link to audit_evidence if applicable
  expiration_date DATE, -- When this document evidence expires
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  FOREIGN KEY (evidence_id) REFERENCES audit_evidence(id)
);

-- Questionnaire Templates (for client intake questionnaires)
CREATE TABLE IF NOT EXISTS intake_questionnaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  questionnaire_name TEXT NOT NULL,
  questionnaire_type TEXT NOT NULL, -- 'security_assessment', 'compliance_gap', 'vendor_risk', 'readiness_check'
  target_frameworks TEXT, -- JSON array: ['SOC2', 'ISO27001']
  questions_json TEXT NOT NULL, -- JSON array of question objects
  scoring_model TEXT, -- JSON object with scoring rules
  version TEXT DEFAULT '1.0',
  is_template BOOLEAN DEFAULT 1, -- Template vs filled questionnaire
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'deprecated'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Questionnaire Responses (completed questionnaires)
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  questionnaire_id INTEGER NOT NULL,
  client_org_id INTEGER,
  user_id INTEGER NOT NULL,
  respondent_name TEXT,
  respondent_email TEXT,
  responses_json TEXT NOT NULL, -- JSON object with answers
  calculated_score INTEGER, -- Computed score based on scoring model
  gap_analysis TEXT, -- JSON object with identified gaps
  mapped_controls TEXT, -- JSON array of control mappings
  completion_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'expired'
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (questionnaire_id) REFERENCES intake_questionnaires(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Parsed Data Mappings (extracted data mapped to scoring model)
CREATE TABLE IF NOT EXISTS parsed_data_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_org_id INTEGER,
  source_document_id INTEGER, -- Reference to intake_documents
  source_type TEXT NOT NULL, -- 'document', 'questionnaire', 'api_import'
  data_category TEXT NOT NULL, -- 'asset_inventory', 'user_accounts', 'security_controls', 'policies', 'configurations'
  extracted_data TEXT NOT NULL, -- JSON object with parsed data
  control_mappings TEXT, -- JSON array: [{control_id, confidence, data_field}]
  compliance_scores TEXT, -- JSON object with preliminary scores per framework
  validation_status TEXT DEFAULT 'pending', -- 'pending', 'validated', 'rejected', 'needs_review'
  validated_by INTEGER,
  validated_at TIMESTAMP,
  auto_mapped BOOLEAN DEFAULT 0, -- Whether auto-mapped by system
  confidence_score REAL DEFAULT 0.0, -- AI/ML confidence in mapping accuracy
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (source_document_id) REFERENCES intake_documents(id),
  FOREIGN KEY (validated_by) REFERENCES users(id)
);

-- ============================================================================
-- TIER 2: Read-Only API Integrations (ACCELERATION)
-- ============================================================================

-- API Integration Configurations (read-only, scoped, time-bound)
CREATE TABLE IF NOT EXISTS api_integration_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_org_id INTEGER,
  integration_name TEXT NOT NULL,
  integration_type TEXT NOT NULL, -- 'microsoft_365', 'azure', 'aws', 'siem', 'edr', 'vulnerability_scanner', 'grc_tool'
  vendor TEXT NOT NULL, -- 'Microsoft', 'AWS', 'CrowdStrike', 'Splunk', 'Qualys', etc.
  
  -- Access Configuration (READ-ONLY ONLY)
  api_endpoint TEXT,
  auth_type TEXT NOT NULL, -- 'oauth2', 'api_key', 'bearer_token', 'client_credentials'
  credentials_encrypted TEXT, -- Encrypted JSON with credentials (customer-owned)
  scopes TEXT, -- JSON array of OAuth2 scopes (minimal/read-only)
  
  -- Token Management (time-bound)
  token_expires_at TIMESTAMP,
  token_refresh_at TIMESTAMP,
  last_token_refresh TIMESTAMP,
  
  -- Data Scope (what we observe, not manage)
  data_categories TEXT, -- JSON array: ['security_posture', 'config_state', 'alert_summaries', 'control_evidence']
  resource_filters TEXT, -- JSON object defining resource scope
  
  -- Sync Configuration
  sync_frequency TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP,
  sync_status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'syncing', 'error', 'rate_limited'
  last_sync_error TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending_auth', -- 'pending_auth', 'active', 'paused', 'expired', 'revoked', 'error'
  enabled BOOLEAN DEFAULT 1,
  
  -- Compliance Mapping
  mapped_controls TEXT, -- JSON array of control IDs this integration covers
  evidence_types TEXT, -- JSON array: ['config_export', 'alert_summary', 'coverage_report']
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id)
);

-- API Integration Sync Logs
CREATE TABLE IF NOT EXISTS api_integration_sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  integration_id INTEGER NOT NULL,
  sync_started_at TIMESTAMP NOT NULL,
  sync_completed_at TIMESTAMP,
  sync_status TEXT NOT NULL, -- 'started', 'completed', 'failed', 'partial'
  records_fetched INTEGER DEFAULT 0,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  data_categories_synced TEXT, -- JSON array
  error_message TEXT,
  error_details TEXT, -- JSON object with detailed errors
  api_calls_made INTEGER DEFAULT 0,
  rate_limit_remaining INTEGER,
  sync_metadata TEXT, -- JSON object with sync details
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (integration_id) REFERENCES api_integration_configs(id)
);

-- API Ingested Data (summarized, not raw logs)
CREATE TABLE IF NOT EXISTS api_ingested_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  integration_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  client_org_id INTEGER,
  data_type TEXT NOT NULL, -- 'security_posture', 'config_state', 'alert_summary', 'coverage_report', 'control_evidence'
  data_category TEXT NOT NULL, -- 'identity', 'endpoint', 'network', 'cloud', 'application'
  summary_data TEXT NOT NULL, -- JSON object with summarized data (NOT raw logs)
  metrics TEXT, -- JSON object: {counts, states, coverage_percentages}
  compliance_relevant BOOLEAN DEFAULT 1,
  control_mappings TEXT, -- JSON array of control IDs
  evidence_value TEXT, -- How this data serves as evidence
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_timestamp TIMESTAMP, -- When the source data was generated
  expires_at TIMESTAMP, -- Data freshness expiration
  FOREIGN KEY (integration_id) REFERENCES api_integration_configs(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id)
);

-- ============================================================================
-- TIER 3: Scheduled Exports (BRIDGE MODEL)
-- ============================================================================

-- Scheduled Export Configurations
CREATE TABLE IF NOT EXISTS scheduled_export_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_org_id INTEGER,
  export_name TEXT NOT NULL,
  export_type TEXT NOT NULL, -- 'siem_csv', 'grc_export', 'msp_bulk', 'compliance_report', 'custom'
  source_system TEXT NOT NULL, -- 'Splunk', 'ServiceNow GRC', 'ConnectWise', 'Custom', etc.
  
  -- Schedule Configuration
  schedule_frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  schedule_day_of_week INTEGER, -- 0-6 for weekly (0=Sunday)
  schedule_day_of_month INTEGER, -- 1-31 for monthly
  schedule_time TEXT, -- HH:MM format
  timezone TEXT DEFAULT 'UTC',
  
  -- Delivery Configuration
  delivery_method TEXT NOT NULL, -- 'sftp', 'email', 'webhook', 'manual_upload', 's3'
  delivery_config TEXT, -- JSON object with delivery details (SFTP host, email, etc.)
  
  -- File Configuration
  expected_format TEXT NOT NULL, -- 'CSV', 'XLSX', 'JSON', 'XML'
  file_naming_pattern TEXT, -- Pattern for expected filenames
  expected_columns TEXT, -- JSON array of expected columns/fields
  
  -- Processing Configuration
  auto_process BOOLEAN DEFAULT 1, -- Automatically process when received
  processing_rules TEXT, -- JSON object with processing/mapping rules
  mapped_controls TEXT, -- JSON array of control IDs
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'error', 'pending_setup'
  last_received_at TIMESTAMP,
  last_processed_at TIMESTAMP,
  next_expected_at TIMESTAMP,
  missed_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id)
);

-- Scheduled Export Instances (actual exports received)
CREATE TABLE IF NOT EXISTS scheduled_export_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  -- File Details
  filename TEXT NOT NULL,
  file_path TEXT,
  file_size_bytes INTEGER,
  file_hash TEXT,
  
  -- Receipt Details
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  received_via TEXT NOT NULL, -- 'sftp', 'email', 'webhook', 'manual', 's3'
  
  -- Processing Status
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'partial'
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  
  -- Results
  records_total INTEGER DEFAULT 0,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  processing_errors TEXT, -- JSON array of errors
  parsed_summary TEXT, -- JSON object with summary of parsed data
  
  -- Compliance Mapping
  mapped_controls TEXT, -- JSON array of controls this export covers
  compliance_impact TEXT, -- JSON object with compliance score impact
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES scheduled_export_configs(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- MSP Bulk Export Configurations (for MSPs managing multiple clients)
CREATE TABLE IF NOT EXISTS msp_bulk_export_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, -- MSP user
  msp_name TEXT NOT NULL,
  
  -- Tenant Configuration
  tenant_mapping TEXT NOT NULL, -- JSON object mapping tenant IDs to client_org_ids
  tenant_identifier_field TEXT NOT NULL, -- Field in export that identifies tenant
  
  -- Export Configuration (inherits from scheduled_export_configs)
  export_config_id INTEGER,
  
  -- Bulk Processing
  process_mode TEXT DEFAULT 'parallel', -- 'parallel', 'sequential'
  tenant_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active',
  last_bulk_process_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (export_config_id) REFERENCES scheduled_export_configs(id)
);

-- ============================================================================
-- TIER 4: Continuous Ingestion (PRODUCTIZED SAAS)
-- ============================================================================

-- Continuous Ingestion Configurations
CREATE TABLE IF NOT EXISTS continuous_ingestion_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_org_id INTEGER,
  ingestion_name TEXT NOT NULL,
  ingestion_type TEXT NOT NULL, -- 'streaming_telemetry', 'realtime_scoring', 'continuous_validation', 'event_stream'
  
  -- Stream Configuration
  stream_endpoint TEXT, -- Webhook URL or streaming endpoint
  stream_protocol TEXT NOT NULL, -- 'webhook', 'websocket', 'kafka', 'sqs', 'pubsub'
  stream_config TEXT, -- JSON object with protocol-specific config
  
  -- Authentication
  auth_method TEXT NOT NULL, -- 'hmac', 'jwt', 'api_key', 'mtls'
  auth_config TEXT, -- JSON object with auth details
  
  -- Processing
  event_schema TEXT, -- JSON schema for expected events
  processing_pipeline TEXT, -- JSON array of processing steps
  control_mappings TEXT, -- JSON array of control mappings
  
  -- Real-time Scoring
  scoring_enabled BOOLEAN DEFAULT 0,
  scoring_rules TEXT, -- JSON object with scoring rules
  alert_thresholds TEXT, -- JSON object with alert thresholds
  
  -- SLA Configuration (for productized offering)
  uptime_sla_percent REAL DEFAULT 99.9,
  max_latency_ms INTEGER DEFAULT 5000,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'paused', 'error', 'maintenance'
  health_status TEXT DEFAULT 'unknown', -- 'healthy', 'degraded', 'unhealthy', 'unknown'
  last_event_at TIMESTAMP,
  events_per_minute REAL DEFAULT 0.0,
  
  -- Cost Tracking (this tier increases costs)
  estimated_monthly_cost REAL DEFAULT 0.0,
  events_this_month INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id)
);

-- Continuous Ingestion Events (recent events for monitoring)
CREATE TABLE IF NOT EXISTS continuous_ingestion_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  -- Event Details
  event_id TEXT NOT NULL, -- External event ID
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL, -- JSON object
  event_timestamp TIMESTAMP NOT NULL,
  
  -- Processing
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_latency_ms INTEGER,
  
  -- Compliance Impact
  control_impacts TEXT, -- JSON array of {control_id, impact_type, impact_value}
  score_impact REAL DEFAULT 0.0,
  
  -- Alerts Generated
  alerts_generated TEXT, -- JSON array of alert IDs
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES continuous_ingestion_configs(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Continuous Ingestion Health Metrics
CREATE TABLE IF NOT EXISTS continuous_ingestion_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_id INTEGER NOT NULL,
  
  -- Metrics
  metric_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  events_received INTEGER DEFAULT 0,
  events_processed INTEGER DEFAULT 0,
  events_failed INTEGER DEFAULT 0,
  avg_latency_ms REAL DEFAULT 0.0,
  p99_latency_ms REAL DEFAULT 0.0,
  error_rate REAL DEFAULT 0.0,
  
  -- Health Assessment
  health_score INTEGER DEFAULT 100, -- 0-100
  health_issues TEXT, -- JSON array of issues
  
  FOREIGN KEY (config_id) REFERENCES continuous_ingestion_configs(id)
);

-- ============================================================================
-- Intake Tier Analytics and Reporting
-- ============================================================================

-- Intake Analytics (cross-tier metrics)
CREATE TABLE IF NOT EXISTS intake_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_org_id INTEGER,
  
  -- Period
  analytics_date DATE NOT NULL,
  analytics_period TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  
  -- Tier 1 Metrics
  documents_uploaded INTEGER DEFAULT 0,
  documents_processed INTEGER DEFAULT 0,
  questionnaires_completed INTEGER DEFAULT 0,
  manual_data_points INTEGER DEFAULT 0,
  
  -- Tier 2 Metrics
  api_syncs_completed INTEGER DEFAULT 0,
  api_records_fetched INTEGER DEFAULT 0,
  api_errors INTEGER DEFAULT 0,
  
  -- Tier 3 Metrics
  scheduled_exports_received INTEGER DEFAULT 0,
  scheduled_exports_processed INTEGER DEFAULT 0,
  export_records_total INTEGER DEFAULT 0,
  
  -- Tier 4 Metrics
  continuous_events_received INTEGER DEFAULT 0,
  continuous_events_processed INTEGER DEFAULT 0,
  avg_event_latency_ms REAL DEFAULT 0.0,
  
  -- Compliance Impact
  controls_updated INTEGER DEFAULT 0,
  evidence_collected INTEGER DEFAULT 0,
  compliance_score_change REAL DEFAULT 0.0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_client_orgs_user ON client_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_client_orgs_tier ON client_organizations(intake_tier);
CREATE INDEX IF NOT EXISTS idx_client_orgs_status ON client_organizations(onboarding_status);

CREATE INDEX IF NOT EXISTS idx_intake_docs_user ON intake_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_docs_client ON intake_documents(client_org_id);
CREATE INDEX IF NOT EXISTS idx_intake_docs_type ON intake_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_intake_docs_status ON intake_documents(parsing_status);

CREATE INDEX IF NOT EXISTS idx_questionnaires_user ON intake_questionnaires(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_client ON questionnaire_responses(client_org_id);

CREATE INDEX IF NOT EXISTS idx_parsed_mappings_user ON parsed_data_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_parsed_mappings_client ON parsed_data_mappings(client_org_id);
CREATE INDEX IF NOT EXISTS idx_parsed_mappings_doc ON parsed_data_mappings(source_document_id);

CREATE INDEX IF NOT EXISTS idx_api_configs_user ON api_integration_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_configs_client ON api_integration_configs(client_org_id);
CREATE INDEX IF NOT EXISTS idx_api_configs_type ON api_integration_configs(integration_type);
CREATE INDEX IF NOT EXISTS idx_api_configs_status ON api_integration_configs(status);

CREATE INDEX IF NOT EXISTS idx_api_sync_logs_integration ON api_integration_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_api_ingested_integration ON api_ingested_data(integration_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_exports_user ON scheduled_export_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_client ON scheduled_export_configs(client_org_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_status ON scheduled_export_configs(status);

CREATE INDEX IF NOT EXISTS idx_export_instances_config ON scheduled_export_instances(config_id);
CREATE INDEX IF NOT EXISTS idx_export_instances_status ON scheduled_export_instances(processing_status);

CREATE INDEX IF NOT EXISTS idx_continuous_configs_user ON continuous_ingestion_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_continuous_configs_client ON continuous_ingestion_configs(client_org_id);
CREATE INDEX IF NOT EXISTS idx_continuous_configs_status ON continuous_ingestion_configs(status);

CREATE INDEX IF NOT EXISTS idx_continuous_events_config ON continuous_ingestion_events(config_id);
CREATE INDEX IF NOT EXISTS idx_continuous_events_timestamp ON continuous_ingestion_events(event_timestamp);

CREATE INDEX IF NOT EXISTS idx_intake_analytics_user ON intake_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_intake_analytics_date ON intake_analytics(analytics_date);
