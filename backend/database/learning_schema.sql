-- ============================================================================
-- Self-Learning Automation System
-- Tracks patterns, learns from events, and auto-generates playbooks
-- ============================================================================

-- Learned Remediation Patterns (Patterns discovered from historical data)
CREATE TABLE IF NOT EXISTS learned_remediation_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'control_remediation', 'alert_response', 'evidence_collection', 'automation_workflow'
  trigger_conditions TEXT NOT NULL, -- JSON: {"control_id": "AC-001", "status": "Non-Compliant", "priority": "High"}
  pattern_signature TEXT NOT NULL UNIQUE, -- Hash of conditions for deduplication
  success_rate REAL DEFAULT 0.0, -- 0.0 to 1.0
  usage_count INTEGER DEFAULT 0,
  avg_resolution_time_minutes INTEGER,
  last_successful_use TIMESTAMP,
  pattern_steps TEXT NOT NULL, -- JSON array of step objects
  evidence_requirements TEXT, -- JSON array of required evidence types
  automation_opportunities TEXT, -- JSON array of automation suggestions
  related_controls TEXT, -- JSON array of control IDs
  related_alerts TEXT, -- JSON array of alert types/patterns
  confidence_score REAL DEFAULT 0.5, -- 0.0 to 1.0
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_learned_patterns_user ON learned_remediation_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_type ON learned_remediation_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_signature ON learned_remediation_patterns(pattern_signature);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_success ON learned_remediation_patterns(success_rate DESC);

-- Auto-Generated Playbooks (Playbooks created from learned patterns)
CREATE TABLE IF NOT EXISTS auto_generated_playbooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  playbook_name TEXT NOT NULL,
  source_pattern_id INTEGER, -- Link to learned_remediation_patterns
  playbook_type TEXT NOT NULL, -- 'remediation', 'evidence_collection', 'automation', 'response'
  description TEXT,
  trigger_conditions TEXT NOT NULL, -- JSON: When this playbook should be suggested
  steps TEXT NOT NULL, -- JSON array of step objects with actions, order, dependencies
  estimated_time_minutes INTEGER,
  automation_level TEXT, -- 'manual', 'semi_automated', 'fully_automated'
  success_metrics TEXT, -- JSON: {"success_rate": 0.95, "avg_time": 45, "usage_count": 12}
  status TEXT DEFAULT 'active', -- 'active', 'draft', 'archived', 'deprecated'
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by INTEGER,
  approved_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_pattern_id) REFERENCES learned_remediation_patterns(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_auto_playbooks_user ON auto_generated_playbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_playbooks_type ON auto_generated_playbooks(playbook_type);
CREATE INDEX IF NOT EXISTS idx_auto_playbooks_status ON auto_generated_playbooks(status);
CREATE INDEX IF NOT EXISTS idx_auto_playbooks_approval ON auto_generated_playbooks(approval_status);

-- Event Learning Log (Tracks what the system learns from each event)
CREATE TABLE IF NOT EXISTS event_learning_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- 'alert_resolved', 'control_updated', 'remediation_completed', 'evidence_collected'
  event_source_id INTEGER, -- ID of alert, control, etc.
  event_source_type TEXT NOT NULL, -- 'alert', 'control', 'evidence', 'automation'
  event_data TEXT NOT NULL, -- JSON: Full event context
  patterns_detected TEXT, -- JSON array of pattern IDs that matched
  playbooks_suggested TEXT, -- JSON array of playbook IDs suggested
  playbook_used INTEGER, -- Which playbook was actually used
  outcome TEXT, -- 'success', 'partial', 'failure', 'unknown'
  outcome_data TEXT, -- JSON: Metrics, time taken, evidence collected, etc.
  learning_insights TEXT, -- JSON: What was learned from this event
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (playbook_used) REFERENCES auto_generated_playbooks(id)
);

CREATE INDEX IF NOT EXISTS idx_event_learning_user ON event_learning_log(user_id);
CREATE INDEX IF NOT EXISTS idx_event_learning_type ON event_learning_log(event_type);
CREATE INDEX IF NOT EXISTS idx_event_learning_source ON event_learning_log(event_source_type, event_source_id);
CREATE INDEX IF NOT EXISTS idx_event_learning_outcome ON event_learning_log(outcome);
CREATE INDEX IF NOT EXISTS idx_event_learning_created ON event_learning_log(created_at DESC);

-- Data Value Tracking (Tracks how every piece of data is used)
CREATE TABLE IF NOT EXISTS data_value_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  data_type TEXT NOT NULL, -- 'alert', 'control', 'evidence', 'event', 'pattern', 'playbook'
  data_id TEXT NOT NULL, -- ID of the data item
  data_source TEXT, -- Where the data came from
  usage_type TEXT NOT NULL, -- 'pattern_detection', 'playbook_generation', 'ai_recommendation', 'automation_trigger', 'analytics'
  usage_context TEXT, -- JSON: Context of how it was used
  value_score REAL DEFAULT 0.0, -- 0.0 to 1.0 - calculated value contribution
  impact_metrics TEXT, -- JSON: {"alerts_prevented": 5, "time_saved_minutes": 120, "automation_enabled": true}
  last_used TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_data_value_user ON data_value_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_data_value_type ON data_value_tracking(data_type, data_id);
CREATE INDEX IF NOT EXISTS idx_data_value_score ON data_value_tracking(value_score DESC);
CREATE INDEX IF NOT EXISTS idx_data_value_usage ON data_value_tracking(usage_type);

-- Pattern Correlation Matrix (Tracks relationships between patterns)
CREATE TABLE IF NOT EXISTS pattern_correlations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pattern_a_id INTEGER NOT NULL,
  pattern_b_id INTEGER NOT NULL,
  correlation_type TEXT NOT NULL, -- 'sequential', 'parallel', 'alternative', 'dependent'
  correlation_strength REAL DEFAULT 0.0, -- 0.0 to 1.0
  co_occurrence_count INTEGER DEFAULT 0,
  success_rate_when_combined REAL DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_observed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (pattern_a_id) REFERENCES learned_remediation_patterns(id),
  FOREIGN KEY (pattern_b_id) REFERENCES learned_remediation_patterns(id),
  UNIQUE(pattern_a_id, pattern_b_id)
);

CREATE INDEX IF NOT EXISTS idx_pattern_corr_user ON pattern_correlations(user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_corr_patterns ON pattern_correlations(pattern_a_id, pattern_b_id);

