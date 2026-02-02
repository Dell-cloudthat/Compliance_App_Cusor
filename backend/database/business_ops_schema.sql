-- ============================================================================
-- Business Operations Schema
-- Supports proposals, templates, onboarding, and pipeline tracking
-- ============================================================================

-- ============================================================================
-- PROPOSAL & QUOTE MANAGEMENT
-- ============================================================================

-- Service Catalog (your offerings with pricing)
CREATE TABLE IF NOT EXISTS service_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL, -- 'assessment', 'gap_analysis', 'roadmap', 'implementation', 'managed_services', 'audit_prep', 'training'
  description TEXT,
  
  -- Pricing
  pricing_model TEXT NOT NULL, -- 'fixed', 'hourly', 'per_user', 'per_asset', 'tiered'
  base_price REAL NOT NULL,
  hourly_rate REAL,
  
  -- Scope defaults
  estimated_hours_min REAL,
  estimated_hours_max REAL,
  default_duration_weeks INTEGER,
  
  -- Deliverables
  deliverables TEXT, -- JSON array of deliverable names
  
  -- Frameworks supported
  frameworks_supported TEXT, -- JSON array
  
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Proposals/Quotes
CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_org_id INTEGER,
  
  -- Proposal Info
  proposal_number TEXT NOT NULL UNIQUE,
  proposal_name TEXT NOT NULL,
  proposal_status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'
  
  -- Client Info (can be prospect not yet in system)
  client_name TEXT NOT NULL,
  client_contact_name TEXT,
  client_contact_email TEXT,
  client_contact_phone TEXT,
  client_industry TEXT,
  client_size TEXT, -- 'small', 'medium', 'large', 'enterprise'
  
  -- Scope
  services_included TEXT NOT NULL, -- JSON array of service objects with quantities
  frameworks_in_scope TEXT, -- JSON array
  
  -- Pricing
  subtotal REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total_price REAL NOT NULL,
  payment_terms TEXT, -- 'net_30', 'net_60', '50_50', 'monthly'
  
  -- Timeline
  proposed_start_date DATE,
  proposed_duration_weeks INTEGER,
  valid_until DATE,
  
  -- Content
  executive_summary TEXT,
  scope_of_work TEXT,
  assumptions TEXT, -- JSON array
  exclusions TEXT, -- JSON array
  terms_and_conditions TEXT,
  
  -- Tracking
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  responded_at TIMESTAMP,
  response_notes TEXT,
  
  -- Conversion
  converted_to_engagement_id INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (converted_to_engagement_id) REFERENCES consulting_engagements(id)
);

-- Proposal Line Items
CREATE TABLE IF NOT EXISTS proposal_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  service_catalog_id INTEGER,
  
  line_item_name TEXT NOT NULL,
  description TEXT,
  quantity REAL DEFAULT 1,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  
  -- For custom items
  is_custom BOOLEAN DEFAULT 0,
  
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id),
  FOREIGN KEY (service_catalog_id) REFERENCES service_catalog(id)
);

-- ============================================================================
-- TEMPLATE LIBRARY
-- ============================================================================

-- Assessment Templates (industry-specific)
CREATE TABLE IF NOT EXISTS industry_assessment_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  template_name TEXT NOT NULL,
  industry TEXT NOT NULL, -- 'healthcare', 'finance', 'technology', 'manufacturing', 'retail', 'government', 'general'
  target_frameworks TEXT NOT NULL, -- JSON array
  
  description TEXT,
  
  -- Template content
  categories TEXT NOT NULL, -- JSON array
  questions TEXT NOT NULL, -- JSON array
  scoring_model TEXT, -- JSON
  maturity_levels TEXT, -- JSON array
  
  -- Metadata
  estimated_duration_minutes INTEGER,
  difficulty_level TEXT, -- 'basic', 'intermediate', 'advanced'
  
  is_system_template BOOLEAN DEFAULT 0, -- Pre-built vs user-created
  is_active BOOLEAN DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recommendation Templates (reusable recommendations)
CREATE TABLE IF NOT EXISTS recommendation_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'policy', 'process', 'technology', 'people', 'governance'
  subcategory TEXT,
  
  -- Content
  description TEXT NOT NULL,
  detailed_guidance TEXT,
  implementation_steps TEXT, -- JSON array
  evidence_requirements TEXT, -- JSON array
  
  -- Applicability
  applicable_frameworks TEXT, -- JSON array
  applicable_controls TEXT, -- JSON array
  applicable_industries TEXT, -- JSON array
  gap_keywords TEXT, -- JSON array - keywords to match for auto-suggestion
  
  -- Effort and cost
  effort_level TEXT, -- 'minimal', 'moderate', 'significant', 'major'
  typical_hours_min REAL,
  typical_hours_max REAL,
  typical_cost_min REAL,
  typical_cost_max REAL,
  
  -- Priority guidance
  default_priority INTEGER DEFAULT 3, -- 1-5
  
  is_system_template BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  effectiveness_rating REAL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'executive_summary', 'assessment', 'gap_analysis', 'roadmap', 'progress', 'proposal'
  
  description TEXT,
  
  -- Structure
  sections TEXT NOT NULL, -- JSON array of section definitions
  cover_page_config TEXT, -- JSON
  header_footer_config TEXT, -- JSON
  
  -- Branding
  branding TEXT, -- JSON: {logo_url, primary_color, secondary_color, font}
  
  -- Data mapping
  data_sources TEXT, -- JSON: which data fields to pull
  
  is_system_template BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- CLIENT ONBOARDING
-- ============================================================================

-- Onboarding Sessions (tracks wizard progress)
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  session_token TEXT UNIQUE NOT NULL,
  session_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  
  -- Progress
  current_step INTEGER DEFAULT 1,
  completed_steps TEXT, -- JSON array of completed step numbers
  
  -- Collected Data
  client_info TEXT, -- JSON: name, contact, industry, size
  selected_services TEXT, -- JSON array
  selected_frameworks TEXT, -- JSON array
  uploaded_documents TEXT, -- JSON array of document IDs
  questionnaire_responses TEXT, -- JSON
  assessment_results TEXT, -- JSON
  
  -- Outcomes
  created_client_org_id INTEGER,
  created_engagement_id INTEGER,
  created_proposal_id INTEGER,
  
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (created_client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (created_engagement_id) REFERENCES consulting_engagements(id),
  FOREIGN KEY (created_proposal_id) REFERENCES proposals(id)
);

-- Quick Intake Questionnaire Templates
CREATE TABLE IF NOT EXISTS quick_intake_questionnaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  questionnaire_name TEXT NOT NULL,
  description TEXT,
  
  -- Target
  target_industries TEXT, -- JSON array, empty = all
  target_services TEXT, -- JSON array
  
  -- Questions
  questions TEXT NOT NULL, -- JSON array
  
  -- Scoring
  scoring_config TEXT, -- JSON: how to interpret answers
  
  is_active BOOLEAN DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- PIPELINE & BUSINESS METRICS
-- ============================================================================

-- Pipeline Stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_type TEXT NOT NULL, -- 'lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  
  probability_percent INTEGER DEFAULT 0, -- Win probability at this stage
  
  is_active BOOLEAN DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Pipeline Opportunities
CREATE TABLE IF NOT EXISTS pipeline_opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_org_id INTEGER,
  proposal_id INTEGER,
  
  opportunity_name TEXT NOT NULL,
  stage_id INTEGER NOT NULL,
  
  -- Value
  estimated_value REAL NOT NULL,
  weighted_value REAL, -- estimated_value * probability
  
  -- Timeline
  expected_close_date DATE,
  actual_close_date DATE,
  
  -- Source
  lead_source TEXT, -- 'referral', 'website', 'linkedin', 'conference', 'cold_outreach', 'existing_client'
  
  -- Contacts
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  
  -- Notes
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  
  -- Outcome
  outcome TEXT, -- 'won', 'lost', 'pending'
  lost_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (proposal_id) REFERENCES proposals(id),
  FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id)
);

-- Business Metrics Snapshots (for dashboards)
CREATE TABLE IF NOT EXISTS business_metrics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  snapshot_date DATE NOT NULL,
  snapshot_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  
  -- Revenue
  revenue_closed REAL DEFAULT 0,
  revenue_pipeline REAL DEFAULT 0,
  revenue_weighted_pipeline REAL DEFAULT 0,
  
  -- Engagements
  active_engagements INTEGER DEFAULT 0,
  completed_engagements INTEGER DEFAULT 0,
  
  -- Proposals
  proposals_sent INTEGER DEFAULT 0,
  proposals_won INTEGER DEFAULT 0,
  proposals_lost INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0,
  
  -- Clients
  total_clients INTEGER DEFAULT 0,
  new_clients INTEGER DEFAULT 0,
  
  -- Utilization
  billable_hours REAL DEFAULT 0,
  total_hours REAL DEFAULT 0,
  utilization_rate REAL DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, snapshot_date, snapshot_period)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_service_catalog_user ON service_catalog(user_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON service_catalog(service_category);

CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_org_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(proposal_status);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);

CREATE INDEX IF NOT EXISTS idx_proposal_line_items_proposal ON proposal_line_items(proposal_id);

CREATE INDEX IF NOT EXISTS idx_industry_templates_user ON industry_assessment_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_industry_templates_industry ON industry_assessment_templates(industry);

CREATE INDEX IF NOT EXISTS idx_recommendation_templates_user ON recommendation_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_templates_category ON recommendation_templates(category);

CREATE INDEX IF NOT EXISTS idx_report_templates_user ON report_templates_library(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_token ON onboarding_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON onboarding_sessions(session_status);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user ON pipeline_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_opportunities_user ON pipeline_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_opportunities_stage ON pipeline_opportunities(stage_id);

CREATE INDEX IF NOT EXISTS idx_business_metrics_user ON business_metrics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics_snapshots(snapshot_date);
