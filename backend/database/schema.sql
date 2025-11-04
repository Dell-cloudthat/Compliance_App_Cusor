-- Compliance Platform Database Schema
-- Designed for PII handling with CUI filtering for FedRAMP compliance

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

