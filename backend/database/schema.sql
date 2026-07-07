-- Compliance Platform Database Schema
-- Designed for PII handling with CUI filtering for FedRAMP compliance

-- Users and Authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  plan TEXT DEFAULT 'free',
  organization TEXT,
  role TEXT DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT 1,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Sources (API Integrations)
CREATE TABLE IF NOT EXISTS data_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_type TEXT NOT NULL, -- 'API', 'FILE', 'MANUAL', 'WEBHOOK'
  source_name TEXT NOT NULL,
  vendor TEXT,
  connection_info TEXT, -- JSON string with API keys, endpoints, etc.
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'error'
  last_sync TIMESTAMP,
  sync_frequency TEXT DEFAULT 'hourly', -- 'real-time', 'hourly', 'daily', 'weekly'
  metadata_tags TEXT, -- JSON array of metadata tags
  contains_pii BOOLEAN DEFAULT 0,
  contains_cui BOOLEAN DEFAULT 0, -- CUI = Controlled Unclassified Information (FedRAMP)
  responsible_party TEXT,
  evidence_attribution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Data Segments (Segmented API data by control)
CREATE TABLE IF NOT EXISTS data_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  data_source_id INTEGER NOT NULL,
  control_id TEXT NOT NULL,
  segment_name TEXT NOT NULL,
  data_payload TEXT, -- JSON string of actual data
  metadata_tags TEXT, -- JSON array: ['PII', 'ENCRYPTED', 'AUDIT_LOG', etc.]
  contains_pii BOOLEAN DEFAULT 0,
  contains_cui BOOLEAN DEFAULT 0,
  pii_types TEXT, -- JSON array: ['EMAIL', 'SSN', 'PHONE', etc.]
  data_classification TEXT, -- 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'
  retention_days INTEGER DEFAULT 90,
  responsible_party TEXT,
  coverage_type TEXT, -- 'API Data Attribution', 'MDR/SOC Managed', 'Vendor Inherited', 'Internal'
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
  frameworks TEXT, -- JSON array: ['NIST_800-53:AC-1', 'ISO27001:A.9.1.1']
  category TEXT,
  priority TEXT, -- 'Critical', 'High', 'Medium', 'Low'
  status TEXT DEFAULT 'Partial', -- 'Implemented', 'Partial', 'Non-Compliant', 'Vendor Managed'
  responsible_party TEXT,
  covered_by TEXT,
  evidence_link TEXT,
  mapped_fields TEXT, -- JSON array: ['EDR.Users', 'AD.Groups']
  default_owner TEXT,
  entity_id INTEGER,
  auto_mapped BOOLEAN DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Responsibility Matrix (Pre-computed for performance)
CREATE TABLE IF NOT EXISTS responsibility_matrix (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  control_id TEXT NOT NULL,
  primary_owner TEXT,
  shared_responsibility BOOLEAN DEFAULT 0,
  secondary_owners TEXT, -- JSON array
  data_sources TEXT, -- JSON array of data_source_ids
  coverage_type TEXT,
  evidence_sources TEXT, -- JSON array
  last_computed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (control_id) REFERENCES controls(id)
);

-- API Integration Metadata
CREATE TABLE IF NOT EXISTS api_integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  data_source_id INTEGER NOT NULL,
  api_name TEXT NOT NULL,
  api_endpoint TEXT,
  api_key_hash TEXT, -- Hashed API key for security
  controls_covered TEXT, -- JSON array of control_ids
  data_attributes TEXT, -- JSON array of attribute names
  request_count INTEGER DEFAULT 0,
  last_request TIMESTAMP,
  error_count INTEGER DEFAULT 0,
  metadata_tags TEXT, -- JSON array
  contains_pii BOOLEAN DEFAULT 0,
  contains_cui BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
);

-- Reports and Exports
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  report_name TEXT NOT NULL,
  report_type TEXT, -- 'compliance', 'responsibility_matrix', 'tco', 'timeline'
  file_path TEXT,
  file_size_bytes INTEGER,
  metadata_tags TEXT, -- JSON array
  contains_pii BOOLEAN DEFAULT 0,
  contains_cui BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Cost Tracking
CREATE TABLE IF NOT EXISTS cost_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month_year TEXT NOT NULL, -- '2024-12'
  metric_type TEXT NOT NULL, -- 'storage', 'api_requests', 'compute', 'auth'
  metric_value REAL NOT NULL,
  cost_usd REAL NOT NULL,
  metadata TEXT, -- JSON object with additional details
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, month_year, metric_type)
);

-- Metadata Tags Registry (for consistent tagging)
CREATE TABLE IF NOT EXISTS metadata_tags_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_name TEXT UNIQUE NOT NULL,
  tag_category TEXT, -- 'DATA_TYPE', 'CLASSIFICATION', 'COMPLIANCE', 'SOURCE'
  description TEXT,
  pii_related BOOLEAN DEFAULT 0,
  cui_related BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Flow Architecture Graph
CREATE TABLE IF NOT EXISTS data_flow_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  node_type TEXT NOT NULL, -- 'source', 'system', 'processor', 'analytics', 'report', 'storage'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sensitivity TEXT, -- 'PII', 'CUI', 'Internal', 'Public', etc.
  data_domains TEXT, -- JSON array of data domains
  classification_tags TEXT, -- JSON array referencing metadata_tags_registry
  owner TEXT,
  responsible_party TEXT,
  framework_controls TEXT, -- JSON array of control IDs
  evidence_links TEXT, -- JSON array of URLs/identifiers
  integration_status TEXT DEFAULT 'active', -- 'active', 'deprecated', 'planned'
  last_sync_at TIMESTAMP,
  sync_frequency TEXT,
  system_of_record BOOLEAN DEFAULT 0,
  metadata_json TEXT,
  layout_position TEXT, -- JSON object { x, y }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_data_flow_nodes_user ON data_flow_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_data_flow_nodes_type ON data_flow_nodes(user_id, node_type);

CREATE TABLE IF NOT EXISTS data_flow_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  source_node_id INTEGER NOT NULL,
  target_node_id INTEGER NOT NULL,
  flow_type TEXT NOT NULL, -- 'ingest', 'transform', 'export', 'evidence'
  transport TEXT, -- 'API', 'SFTP', 'Manual', etc.
  encryption_status TEXT,
  retention_policy TEXT,
  latency TEXT,
  volume TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'planned', 'decommissioning'
  automated BOOLEAN DEFAULT 1,
  controls_impacted TEXT, -- JSON array of control IDs
  metadata_json TEXT,
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_node_id) REFERENCES data_flow_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES data_flow_nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_data_flow_edges_user ON data_flow_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_data_flow_edges_nodes ON data_flow_edges(source_node_id, target_node_id);

CREATE TABLE IF NOT EXISTS data_flow_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'create_node', 'update_node', 'delete_node', 'create_edge', etc.
  target_type TEXT NOT NULL, -- 'node', 'edge'
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

CREATE INDEX IF NOT EXISTS idx_data_flow_audit_user ON data_flow_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_flow_audit_target ON data_flow_audit_log(target_type, target_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_segments_control ON data_segments(control_id);
CREATE INDEX IF NOT EXISTS idx_data_segments_source ON data_segments(data_source_id);
CREATE INDEX IF NOT EXISTS idx_data_segments_pii ON data_segments(contains_pii);
CREATE INDEX IF NOT EXISTS idx_data_segments_cui ON data_segments(contains_cui);
CREATE INDEX IF NOT EXISTS idx_controls_user ON controls(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_user ON data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_user_month ON cost_tracking(user_id, month_year);

-- Audit Engagements
CREATE TABLE IF NOT EXISTS audit_engagements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  audit_name TEXT NOT NULL,
  framework TEXT NOT NULL, -- 'SOC2', 'ISO27001', 'NIST_800-53', 'NIST_800-171', 'CIS'
  audit_type TEXT NOT NULL, -- 'Type I', 'Type II', 'Surveillance', 'Recertification', 'Initial'
  auditor_name TEXT, -- External auditor company
  auditor_contact TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
  scope TEXT, -- JSON array of control IDs
  readiness_score INTEGER DEFAULT 0, -- 0-100
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit Findings
CREATE TABLE IF NOT EXISTS audit_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_engagement_id INTEGER NOT NULL,
  control_id TEXT NOT NULL,
  finding_type TEXT NOT NULL, -- 'observation', 'deficiency', 'non-conformity', 'major_nonconformity'
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  description TEXT NOT NULL,
  remediation_plan TEXT,
  assigned_to TEXT,
  due_date DATE,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  resolved_date DATE,
  evidence_required TEXT, -- JSON array of evidence types
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)
);

-- Audit Evidence
CREATE TABLE IF NOT EXISTS audit_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_engagement_id INTEGER,
  control_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL, -- 'document', 'screenshot', 'api_data', 'log_export', 'policy', 'procedure'
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
  metadata TEXT, -- JSON object
  notes TEXT,
  FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)
);

-- Certifications
CREATE TABLE IF NOT EXISTS certifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  certification_name TEXT NOT NULL, -- 'SOC2 Type II', 'ISO 27001:2013'
  certification_body TEXT, -- 'AICPA', 'BSI', 'ISO'
  issue_date DATE,
  expiration_date DATE NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'suspended', 'revoked', 'pending_renewal'
  scope TEXT, -- JSON array of control IDs or scope description
  certificate_file_path TEXT,
  renewal_reminder_days INTEGER DEFAULT 90,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Certification History
CREATE TABLE IF NOT EXISTS certification_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certification_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- 'issued', 'renewed', 'expired', 'revoked', 'suspended'
  event_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (certification_id) REFERENCES certifications(id)
);

-- Evidence Requests (for workflow automation)
CREATE TABLE IF NOT EXISTS evidence_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audit_engagement_id INTEGER,
  control_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_from TEXT NOT NULL, -- Control owner email/name
  request_type TEXT DEFAULT 'evidence_upload', -- 'evidence_upload', 'evidence_refresh', 'evidence_validation'
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'submitted', 'validated', 'rejected', 'overdue'
  submitted_at TIMESTAMP,
  validated_at TIMESTAMP,
  reminder_sent BOOLEAN DEFAULT 0,
  reminder_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audit_engagement_id) REFERENCES audit_engagements(id)
);

-- Indexes for audit tables
CREATE INDEX IF NOT EXISTS idx_audit_engagements_user ON audit_engagements(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_engagements_status ON audit_engagements(status);
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON audit_findings(audit_engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_status ON audit_findings(status);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_audit ON audit_evidence(audit_engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_control ON audit_evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_certifications_user ON certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
CREATE INDEX IF NOT EXISTS idx_evidence_requests_audit ON evidence_requests(audit_engagement_id);

-- Insert default metadata tags
INSERT OR IGNORE INTO metadata_tags_registry (tag_name, tag_category, description, pii_related, cui_related) VALUES
('PII', 'DATA_TYPE', 'Personally Identifiable Information', 1, 0),
('CUI', 'DATA_TYPE', 'Controlled Unclassified Information', 0, 1),
('ENCRYPTED', 'CLASSIFICATION', 'Data is encrypted at rest and in transit', 0, 0),
('AUDIT_LOG', 'DATA_TYPE', 'Audit trail data', 0, 0),
('ENDPOINT_DATA', 'DATA_TYPE', 'Endpoint security data', 0, 0),
('IDENTITY_DATA', 'DATA_TYPE', 'Identity and access management data', 1, 0),
('NETWORK_DATA', 'DATA_TYPE', 'Network traffic and configuration data', 0, 0),
('VULNERABILITY_DATA', 'DATA_TYPE', 'Vulnerability scan results', 0, 0),
('INCIDENT_DATA', 'DATA_TYPE', 'Security incident data', 0, 0),
('COMPLIANCE_DATA', 'DATA_TYPE', 'Compliance control evidence', 0, 0),
('PUBLIC', 'CLASSIFICATION', 'Public data classification', 0, 0),
('INTERNAL', 'CLASSIFICATION', 'Internal data classification', 0, 0),
('CONFIDENTIAL', 'CLASSIFICATION', 'Confidential data classification', 0, 0),
('RESTRICTED', 'CLASSIFICATION', 'Restricted data classification', 0, 1),
('MDR_MANAGED', 'SOURCE', 'Managed by MDR/SOC provider', 0, 0),
('VENDOR_INHERITED', 'SOURCE', 'Coverage inherited from vendor', 0, 0),
('API_ATTRIBUTED', 'SOURCE', 'Data from API integration', 0, 0),
('INTERNAL_MANAGED', 'SOURCE', 'Internally managed', 0, 0);

-- ============================================================================
-- IAM (Identity & Access Management) Tables
-- ============================================================================

-- User Roles (Multi-tenant support)
CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_name TEXT NOT NULL, -- 'Admin', 'Engineer', 'Auditor', 'Vendor', 'ReadOnly'
  entity_id INTEGER, -- For multi-tenant isolation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Permission Templates (Reusable permission sets)
CREATE TABLE IF NOT EXISTS permission_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL UNIQUE, -- 'Vendor Read-Only', 'Vendor Read-Write', 'Engineer Full'
  description TEXT,
  permissions_json TEXT NOT NULL, -- JSON: {"controls": ["read"], "audits": ["read", "write"], "reports": ["read"]}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Permissions (Granular permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  resource_type TEXT NOT NULL, -- 'control', 'audit', 'report', 'evidence', 'vendor', 'all'
  resource_id TEXT, -- Specific control ID, audit ID, or NULL for all resources of this type
  permission_type TEXT NOT NULL, -- 'read', 'write', 'execute', 'delete'
  granted_by INTEGER NOT NULL, -- User ID who granted this
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL for permanent permissions
  approval_workflow_id INTEGER, -- Link to approval workflow
  metadata_json TEXT, -- Additional context JSON
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),
  FOREIGN KEY (approval_workflow_id) REFERENCES approval_workflows(id)
);

-- Approval Workflows (For permission requests)
CREATE TABLE IF NOT EXISTS approval_workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_name TEXT,
  requestor_id INTEGER NOT NULL,
  approver_id INTEGER, -- NULL if pending approval
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  permission_requested TEXT NOT NULL, -- JSON permission request
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  FOREIGN KEY (requestor_id) REFERENCES users(id),
  FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- Permission Audit Log (Immutable audit trail)
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash for immutability
  event_type TEXT NOT NULL, -- 'grant', 'revoke', 'modify', 'approve', 'reject', 'access'
  user_id INTEGER NOT NULL, -- User affected
  permission_id INTEGER, -- Link to user_permissions
  granted_by INTEGER, -- Who performed the action
  ip_address TEXT,
  user_agent TEXT,
  resource_type TEXT,
  resource_id TEXT,
  permission_type TEXT,
  previous_permissions TEXT, -- JSON snapshot before change
  new_permissions TEXT, -- JSON snapshot after change
  metadata_json TEXT, -- Additional context
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (granted_by) REFERENCES users(id),
  FOREIGN KEY (permission_id) REFERENCES user_permissions(id)
);

-- Vendor Access Profiles (Templates for vendor access)
CREATE TABLE IF NOT EXISTS vendor_access_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER, -- Link to vendors (if exists in vendors table)
  vendor_name TEXT NOT NULL, -- Vendor name if not in vendors table
  profile_name TEXT NOT NULL, -- 'SOC Team Read-Only', 'MDR Full Access'
  entity_id INTEGER, -- Multi-tenant isolation
  scope_json TEXT NOT NULL, -- {"controls": ["AC-001", "AC-002"], "frameworks": ["NIST"], "audits": [1, 2]}
  permissions_json TEXT NOT NULL, -- {"controls": ["read"], "audits": ["read", "write"], "evidence": ["read", "write", "execute"]}
  access_expires_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor User Assignments (Link vendor users to access profiles)
CREATE TABLE IF NOT EXISTS vendor_user_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_access_profile_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL, -- Vendor's user account
  assigned_by INTEGER NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'revoked'
  FOREIGN KEY (vendor_access_profile_id) REFERENCES vendor_access_profiles(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Indexes for IAM tables (Performance optimization)
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_entity ON user_roles(entity_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON user_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_expires ON user_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_timestamp ON permission_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_permission_audit_hash ON permission_audit_log(log_hash);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_requestor ON approval_workflows(requestor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_access_profiles_vendor ON vendor_access_profiles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_user_assignments_user ON vendor_user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_user_assignments_profile ON vendor_user_assignments(vendor_access_profile_id);

-- ============================================================================
-- Continuous Security-Compliance Alignment (CSCA) Tables
-- ============================================================================

-- Security Events (from SIEM, EDR, CSPM, etc.)
CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- 'threat_detected', 'vulnerability_found', 'incident', 'policy_violation', 'configuration_change'
  event_source TEXT NOT NULL, -- 'SIEM', 'EDR', 'CSPM', 'Vulnerability Scanner', 'Manual'
  source_tool TEXT, -- 'CrowdStrike', 'Splunk', 'AWS Security Hub', etc.
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low', 'info'
  title TEXT NOT NULL,
  description TEXT,
  affected_resources TEXT, -- JSON array of resource IDs, IPs, hostnames, etc.
  security_event_data TEXT, -- JSON object with event details
  detected_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
  assigned_to TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Security Event to Compliance Control Mapping
CREATE TABLE IF NOT EXISTS security_event_compliance_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  security_event_id INTEGER NOT NULL,
  control_id TEXT NOT NULL,
  framework TEXT NOT NULL, -- 'NIST_800-53', 'ISO27001', 'SOC2', 'CIS'
  impact_level TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  compliance_impact TEXT, -- 'compliance_gap', 'evidence_update', 'control_degradation', 'risk_increase'
  mapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (security_event_id) REFERENCES security_events(id),
  FOREIGN KEY (control_id) REFERENCES controls(id)
);

-- Compliance Score History (for real-time tracking)
CREATE TABLE IF NOT EXISTS compliance_score_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  framework TEXT NOT NULL,
  overall_score INTEGER NOT NULL, -- 0-100
  controls_implemented INTEGER,
  controls_total INTEGER,
  gaps_count INTEGER,
  security_event_impact INTEGER DEFAULT 0, -- Impact from recent security events
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Security-Compliance Correlation Metrics
CREATE TABLE IF NOT EXISTS security_compliance_correlation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  metric_type TEXT NOT NULL, -- 'security_event_impact', 'vulnerability_impact', 'incident_impact', 'policy_violation_impact'
  metric_value REAL NOT NULL,
  compliance_score_delta INTEGER, -- Change in compliance score
  framework TEXT,
  control_id TEXT,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Real-Time Compliance Alerts (when security events affect compliance)
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  alert_type TEXT NOT NULL, -- 'compliance_degradation', 'gap_created', 'evidence_expired', 'control_failed', 'compliance_drift'
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  security_event_id INTEGER, -- Link to security event if applicable
  control_id TEXT,
  framework TEXT,
  compliance_score_before INTEGER,
  compliance_score_after INTEGER,
  remediation_guidance TEXT, -- JSON string with remediation steps
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
  drift_payload TEXT, -- JSON payload with drift detection details
  resolution_metadata TEXT, -- JSON object capturing remediation actions/evidence
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by TEXT,
  acknowledged BOOLEAN DEFAULT 0,
  acknowledged_at TIMESTAMP,
  acknowledged_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (security_event_id) REFERENCES security_events(id)
);

-- Indexes for CSCA tables
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_status ON security_events(status);
CREATE INDEX IF NOT EXISTS idx_security_events_detected ON security_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_event_compliance_mapping_event ON security_event_compliance_mapping(security_event_id);
CREATE INDEX IF NOT EXISTS idx_event_compliance_mapping_control ON security_event_compliance_mapping(control_id);
CREATE INDEX IF NOT EXISTS idx_compliance_score_history_user ON compliance_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_score_history_framework ON compliance_score_history(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_score_history_calculated ON compliance_score_history(calculated_at);
CREATE INDEX IF NOT EXISTS idx_security_compliance_correlation_user ON security_compliance_correlation(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_user ON compliance_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_acknowledged ON compliance_alerts(acknowledged);

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

CREATE INDEX IF NOT EXISTS idx_alert_activity_alert ON alert_activity_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_activity_user ON alert_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_activity_created ON alert_activity_log(created_at);

-- ============================================================================
-- Security Event Pattern Detection & Trend Analysis
-- ============================================================================

-- Detected Security Event Patterns
CREATE TABLE IF NOT EXISTS security_event_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'recurring_event', 'trend_anomaly', 'spike_detection', 'correlation_pattern'
  pattern_description TEXT,
  pattern_signature TEXT NOT NULL, -- JSON string describing the pattern
  confidence_score REAL DEFAULT 0.0, -- 0.0 to 1.0
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  first_detected_at TIMESTAMP NOT NULL,
  last_detected_at TIMESTAMP NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  affected_frameworks TEXT, -- JSON array
  affected_controls TEXT, -- JSON array
  trend_direction TEXT, -- 'increasing', 'decreasing', 'stable', 'fluctuating'
  trend_percentage REAL, -- Percentage change over 30 days
  status TEXT DEFAULT 'active', -- 'active', 'resolved', 'false_positive'
  auto_acknowledged BOOLEAN DEFAULT 0,
  acknowledged_at TIMESTAMP,
  acknowledged_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Pattern Detection Events (matches against patterns)
CREATE TABLE IF NOT EXISTS pattern_detection_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id INTEGER NOT NULL,
  security_event_id INTEGER NOT NULL,
  matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  match_confidence REAL DEFAULT 0.0,
  FOREIGN KEY (pattern_id) REFERENCES security_event_patterns(id),
  FOREIGN KEY (security_event_id) REFERENCES security_events(id)
);

-- Pattern Alerts (notifications when patterns are detected)
CREATE TABLE IF NOT EXISTS pattern_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pattern_id INTEGER NOT NULL,
  alert_type TEXT NOT NULL, -- 'pattern_detected', 'pattern_trend_change', 'pattern_spike'
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  pattern_trend_data TEXT, -- JSON string with trend details
  acknowledged BOOLEAN DEFAULT 0,
  acknowledged_at TIMESTAMP,
  acknowledged_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (pattern_id) REFERENCES security_event_patterns(id)
);

-- Indexes for pattern tables
CREATE INDEX IF NOT EXISTS idx_security_event_patterns_user ON security_event_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_security_event_patterns_type ON security_event_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_security_event_patterns_status ON security_event_patterns(status);
CREATE INDEX IF NOT EXISTS idx_security_event_patterns_last_detected ON security_event_patterns(last_detected_at);
CREATE INDEX IF NOT EXISTS idx_pattern_detection_events_pattern ON pattern_detection_events(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_detection_events_event ON pattern_detection_events(security_event_id);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_user ON pattern_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_pattern ON pattern_alerts(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_acknowledged ON pattern_alerts(acknowledged);

