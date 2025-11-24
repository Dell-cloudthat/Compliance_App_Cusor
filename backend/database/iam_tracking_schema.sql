-- Enhanced IAM Tracking Schema
-- Tracks user access, login sessions, and auto-maps permissions

-- User Login Sessions (Track every login/logout)
CREATE TABLE IF NOT EXISTS user_login_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_timestamp TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_duration_seconds INTEGER, -- Calculated on logout
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'terminated'
  termination_reason TEXT, -- 'logout', 'timeout', 'security', 'admin'
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Access Logs (Track every resource access with r/w/x permissions)
CREATE TABLE IF NOT EXISTS user_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_id INTEGER, -- Link to login session
  resource_type TEXT NOT NULL, -- 'control', 'audit', 'report', 'evidence', 'dashboard', 'api'
  resource_id TEXT, -- Specific resource ID or NULL for general access
  action_type TEXT NOT NULL, -- 'read', 'write', 'execute', 'delete', 'view', 'export'
  permission_used TEXT, -- Which permission was used: 'read', 'write', 'execute'
  ip_address TEXT,
  user_agent TEXT,
  access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_duration_ms INTEGER, -- How long the action took
  success BOOLEAN DEFAULT 1, -- Whether access was granted
  failure_reason TEXT, -- If success=0, why it failed
  metadata_json TEXT, -- Additional context (endpoint, parameters, etc.)
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES user_login_sessions(id)
);

-- Auto-Mapped User Permissions (Automatically discovered permissions)
CREATE TABLE IF NOT EXISTS auto_mapped_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  read_access BOOLEAN DEFAULT 0,
  write_access BOOLEAN DEFAULT 0,
  execute_access BOOLEAN DEFAULT 0,
  delete_access BOOLEAN DEFAULT 0,
  discovered_from TEXT, -- 'role', 'direct_permission', 'vendor_profile', 'inherited'
  source_id INTEGER, -- ID of the source (role_id, permission_id, vendor_profile_id)
  first_observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  observation_count INTEGER DEFAULT 1, -- How many times this permission was observed
  confidence_score REAL DEFAULT 1.0, -- 0.0 to 1.0 - how confident we are this is correct
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User Access Statistics (Aggregated access metrics)
CREATE TABLE IF NOT EXISTS user_access_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL, -- Date of statistics
  total_logins INTEGER DEFAULT 0,
  total_access_count INTEGER DEFAULT 0,
  read_actions INTEGER DEFAULT 0,
  write_actions INTEGER DEFAULT 0,
  execute_actions INTEGER DEFAULT 0,
  delete_actions INTEGER DEFAULT 0,
  total_session_duration_seconds INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER DEFAULT 0,
  unique_resources_accessed INTEGER DEFAULT 0,
  resources_accessed_json TEXT, -- JSON array of resource IDs accessed
  first_access_timestamp TIMESTAMP,
  last_access_timestamp TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

-- Permission Compliance Mapping (Map permissions to compliance controls)
CREATE TABLE IF NOT EXISTS permission_compliance_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  control_id TEXT NOT NULL, -- e.g., 'AC-2', 'AC-3', 'AC-6'
  framework TEXT NOT NULL, -- 'NIST_800-53', 'NIST_800-171', 'SOC2', etc.
  permission_type TEXT NOT NULL, -- 'read', 'write', 'execute'
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  compliance_status TEXT DEFAULT 'compliant', -- 'compliant', 'non_compliant', 'partial'
  last_verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON user_login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_status ON user_login_sessions(status);
CREATE INDEX IF NOT EXISTS idx_login_sessions_token ON user_login_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON user_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_session ON user_access_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_resource ON user_access_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON user_access_logs(access_timestamp);
CREATE INDEX IF NOT EXISTS idx_auto_mapped_perms_user ON auto_mapped_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_mapped_perms_resource ON auto_mapped_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_stats_user_date ON user_access_statistics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_permission_compliance_user ON permission_compliance_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_compliance_control ON permission_compliance_mapping(control_id, framework);

