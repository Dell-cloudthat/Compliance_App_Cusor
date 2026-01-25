-- ============================================================================
-- Consulting Platform Schema
-- Supports consulting engagements, proprietary reporting, roadmaps, and MSP management
-- ============================================================================

-- ============================================================================
-- CONSULTING ENGAGEMENTS & CLIENT MANAGEMENT
-- ============================================================================

-- Consulting Engagements (main tracking for client work)
CREATE TABLE IF NOT EXISTS consulting_engagements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, -- Consultant user ID
  client_org_id INTEGER, -- Link to client organization
  
  -- Engagement Details
  engagement_name TEXT NOT NULL,
  engagement_type TEXT NOT NULL, -- 'assessment', 'gap_analysis', 'roadmap', 'implementation', 'managed_services', 'audit_prep'
  engagement_status TEXT DEFAULT 'discovery', -- 'discovery', 'active', 'on_hold', 'completed', 'cancelled'
  
  -- Scope
  service_areas TEXT NOT NULL, -- JSON: ['compliance', 'security_visibility', 'msp_enablement', 'reporting']
  frameworks_in_scope TEXT, -- JSON: ['SOC2', 'ISO27001', 'HIPAA', etc.]
  
  -- Timeline
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  
  -- Financials
  engagement_value REAL DEFAULT 0.0,
  billing_type TEXT DEFAULT 'fixed', -- 'fixed', 'hourly', 'retainer', 'subscription'
  billing_rate REAL,
  hours_estimated REAL,
  hours_actual REAL DEFAULT 0.0,
  
  -- Contacts
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  executive_sponsor TEXT,
  
  -- Notes
  engagement_notes TEXT,
  internal_notes TEXT, -- Private consultant notes
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id)
);

-- Engagement Milestones
CREATE TABLE IF NOT EXISTS engagement_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  engagement_id INTEGER NOT NULL,
  
  milestone_name TEXT NOT NULL,
  milestone_type TEXT NOT NULL, -- 'kickoff', 'assessment_complete', 'report_delivery', 'roadmap_approval', 'implementation', 'review'
  description TEXT,
  
  due_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked', 'skipped'
  
  deliverables TEXT, -- JSON array of deliverable names
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (engagement_id) REFERENCES consulting_engagements(id)
);

-- Engagement Time Tracking
CREATE TABLE IF NOT EXISTS engagement_time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  engagement_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  
  entry_date DATE NOT NULL,
  hours REAL NOT NULL,
  activity_type TEXT NOT NULL, -- 'assessment', 'analysis', 'report_writing', 'meeting', 'implementation', 'support'
  description TEXT,
  
  billable BOOLEAN DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (engagement_id) REFERENCES consulting_engagements(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- PROPRIETARY ASSESSMENTS & GAP ANALYSIS
-- ============================================================================

-- Assessment Templates (your proprietary methodology)
CREATE TABLE IF NOT EXISTS assessment_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'security_maturity', 'compliance_readiness', 'risk_assessment', 'msp_capability', 'vendor_risk'
  description TEXT,
  version TEXT DEFAULT '1.0',
  
  -- Methodology
  scoring_methodology TEXT, -- JSON: describes how scores are calculated
  maturity_levels TEXT, -- JSON: [{level: 1, name: 'Initial', description: '...'}, ...]
  
  -- Categories and Questions
  categories TEXT NOT NULL, -- JSON array of category objects
  questions TEXT NOT NULL, -- JSON array of question objects with weights
  
  -- Branding
  report_branding TEXT, -- JSON: {logo_url, company_name, colors, etc.}
  
  is_active BOOLEAN DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Assessment Instances (completed assessments for clients)
CREATE TABLE IF NOT EXISTS assessment_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  engagement_id INTEGER,
  client_org_id INTEGER,
  user_id INTEGER NOT NULL,
  
  assessment_name TEXT NOT NULL,
  assessment_date DATE NOT NULL,
  assessor_name TEXT,
  
  -- Responses and Scores
  responses TEXT NOT NULL, -- JSON: {question_id: {answer, score, evidence, notes}}
  category_scores TEXT, -- JSON: {category_id: {score, max_score, percentage}}
  overall_score REAL,
  maturity_level INTEGER,
  maturity_level_name TEXT,
  
  -- Analysis
  strengths TEXT, -- JSON array
  weaknesses TEXT, -- JSON array
  gaps TEXT, -- JSON array of identified gaps
  recommendations TEXT, -- JSON array of prioritized recommendations
  
  -- Risk Assessment
  risk_rating TEXT, -- 'critical', 'high', 'medium', 'low'
  risk_factors TEXT, -- JSON array
  
  status TEXT DEFAULT 'draft', -- 'draft', 'in_progress', 'completed', 'approved'
  completed_at TIMESTAMP,
  approved_by TEXT,
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES assessment_templates(id),
  FOREIGN KEY (engagement_id) REFERENCES consulting_engagements(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Gap Analysis Records
CREATE TABLE IF NOT EXISTS gap_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER,
  engagement_id INTEGER,
  client_org_id INTEGER,
  user_id INTEGER NOT NULL,
  
  gap_title TEXT NOT NULL,
  gap_category TEXT NOT NULL, -- 'policy', 'process', 'technology', 'people', 'governance'
  gap_description TEXT NOT NULL,
  
  -- Impact
  business_impact TEXT, -- 'critical', 'high', 'medium', 'low'
  compliance_impact TEXT, -- Which frameworks/controls affected
  affected_controls TEXT, -- JSON array of control IDs
  
  -- Current vs Target State
  current_state TEXT,
  target_state TEXT,
  
  -- Remediation
  remediation_approach TEXT,
  remediation_effort TEXT, -- 'minimal', 'moderate', 'significant', 'major'
  estimated_hours REAL,
  estimated_cost REAL,
  
  -- Priority
  priority_score INTEGER, -- Calculated priority 1-100
  priority_factors TEXT, -- JSON explaining priority calculation
  
  -- Status
  status TEXT DEFAULT 'identified', -- 'identified', 'planned', 'in_progress', 'remediated', 'accepted_risk'
  remediation_date DATE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessment_instances(id),
  FOREIGN KEY (engagement_id) REFERENCES consulting_engagements(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- ROADMAPS & BUDGET PLANNING
-- ============================================================================

-- Compliance/Security Roadmaps
CREATE TABLE IF NOT EXISTS client_roadmaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  engagement_id INTEGER,
  client_org_id INTEGER,
  user_id INTEGER NOT NULL,
  
  roadmap_name TEXT NOT NULL,
  roadmap_type TEXT NOT NULL, -- 'compliance', 'security_maturity', 'msp_growth', 'technology', 'combined'
  description TEXT,
  
  -- Timeline
  start_date DATE NOT NULL,
  target_completion_date DATE NOT NULL,
  
  -- Goals
  target_frameworks TEXT, -- JSON: frameworks to achieve
  target_maturity_level INTEGER,
  strategic_objectives TEXT, -- JSON array
  
  -- Budget Summary
  total_budget REAL,
  budget_allocated REAL DEFAULT 0.0,
  budget_spent REAL DEFAULT 0.0,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'proposed', 'approved', 'active', 'completed', 'on_hold'
  approved_by TEXT,
  approved_at TIMESTAMP,
  
  -- Metadata
  version TEXT DEFAULT '1.0',
  last_review_date DATE,
  next_review_date DATE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (engagement_id) REFERENCES consulting_engagements(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Roadmap Phases
CREATE TABLE IF NOT EXISTS roadmap_phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roadmap_id INTEGER NOT NULL,
  
  phase_name TEXT NOT NULL,
  phase_number INTEGER NOT NULL,
  description TEXT,
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  duration_weeks INTEGER,
  
  -- Goals
  phase_objectives TEXT, -- JSON array
  target_controls TEXT, -- JSON array of control IDs to implement
  target_maturity_gain INTEGER,
  
  -- Budget
  phase_budget REAL,
  budget_breakdown TEXT, -- JSON: {category: amount}
  
  -- Dependencies
  dependencies TEXT, -- JSON array of phase IDs this depends on
  
  -- Status
  status TEXT DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'blocked'
  completion_percentage INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roadmap_id) REFERENCES client_roadmaps(id)
);

-- Roadmap Initiatives (specific projects within phases)
CREATE TABLE IF NOT EXISTS roadmap_initiatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase_id INTEGER NOT NULL,
  roadmap_id INTEGER NOT NULL,
  
  initiative_name TEXT NOT NULL,
  initiative_type TEXT NOT NULL, -- 'policy', 'process', 'technology', 'training', 'audit', 'vendor'
  description TEXT,
  
  -- Scope
  controls_addressed TEXT, -- JSON array of control IDs
  gaps_addressed TEXT, -- JSON array of gap_analysis IDs
  
  -- Resources
  estimated_hours REAL,
  resource_requirements TEXT, -- JSON: {role: hours}
  
  -- Budget
  budget_estimate REAL,
  budget_category TEXT, -- 'internal_labor', 'external_services', 'technology', 'training', 'other'
  budget_notes TEXT,
  
  -- Timeline
  start_date DATE,
  target_date DATE,
  actual_completion_date DATE,
  
  -- Priority & Dependencies
  priority INTEGER, -- 1-5, 1 being highest
  dependencies TEXT, -- JSON array of initiative IDs
  
  -- Status
  status TEXT DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'blocked', 'cancelled'
  completion_percentage INTEGER DEFAULT 0,
  status_notes TEXT,
  
  -- Outcomes
  expected_outcomes TEXT, -- JSON array
  actual_outcomes TEXT, -- JSON array
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (phase_id) REFERENCES roadmap_phases(id),
  FOREIGN KEY (roadmap_id) REFERENCES client_roadmaps(id)
);

-- Budget Plans
CREATE TABLE IF NOT EXISTS budget_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roadmap_id INTEGER,
  client_org_id INTEGER,
  user_id INTEGER NOT NULL,
  
  budget_name TEXT NOT NULL,
  budget_year INTEGER NOT NULL,
  budget_type TEXT NOT NULL, -- 'annual', 'project', 'quarterly'
  
  -- Totals
  total_budget REAL NOT NULL,
  allocated_amount REAL DEFAULT 0.0,
  spent_amount REAL DEFAULT 0.0,
  
  -- Categories (JSON breakdown)
  category_budgets TEXT, -- JSON: {category: {budgeted, allocated, spent}}
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'proposed', 'approved', 'active', 'closed'
  approved_by TEXT,
  approved_at TIMESTAMP,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roadmap_id) REFERENCES client_roadmaps(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Budget Line Items
CREATE TABLE IF NOT EXISTS budget_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_plan_id INTEGER NOT NULL,
  initiative_id INTEGER,
  
  line_item_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'personnel', 'technology', 'services', 'training', 'compliance', 'other'
  subcategory TEXT,
  description TEXT,
  
  -- Amounts
  budgeted_amount REAL NOT NULL,
  allocated_amount REAL DEFAULT 0.0,
  spent_amount REAL DEFAULT 0.0,
  
  -- Timeline
  planned_quarter TEXT, -- 'Q1', 'Q2', 'Q3', 'Q4'
  actual_spend_date DATE,
  
  -- Vendor/Source
  vendor_name TEXT,
  vendor_quote_ref TEXT,
  
  -- Status
  status TEXT DEFAULT 'planned', -- 'planned', 'approved', 'committed', 'spent'
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_plan_id) REFERENCES budget_plans(id),
  FOREIGN KEY (initiative_id) REFERENCES roadmap_initiatives(id)
);

-- ============================================================================
-- PROPRIETARY REPORTS
-- ============================================================================

-- Report Templates (your branded report formats)
CREATE TABLE IF NOT EXISTS report_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'executive_summary', 'assessment_report', 'gap_analysis', 'roadmap', 'progress', 'compliance_status', 'msp_portfolio'
  description TEXT,
  
  -- Structure
  sections TEXT NOT NULL, -- JSON array of section definitions
  
  -- Branding
  branding_config TEXT, -- JSON: {logo, colors, fonts, header, footer}
  
  -- Data Sources
  data_sources TEXT, -- JSON: which data to include
  
  -- Output Format
  output_formats TEXT, -- JSON: ['pdf', 'docx', 'html']
  
  is_active BOOLEAN DEFAULT 1,
  version TEXT DEFAULT '1.0',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Generated Reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER,
  engagement_id INTEGER,
  client_org_id INTEGER,
  user_id INTEGER NOT NULL,
  
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  
  -- Content
  report_data TEXT NOT NULL, -- JSON: all data used to generate report
  report_content TEXT, -- Rendered report content (HTML/Markdown)
  
  -- Generated Files
  pdf_path TEXT,
  docx_path TEXT,
  
  -- Metadata
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  report_period_start DATE,
  report_period_end DATE,
  
  -- Distribution
  shared_with TEXT, -- JSON array of email addresses
  shared_at TIMESTAMP,
  download_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'final', 'delivered', 'archived'
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES report_templates(id),
  FOREIGN KEY (engagement_id) REFERENCES consulting_engagements(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- MSP PORTFOLIO MANAGEMENT
-- ============================================================================

-- MSP Portfolio Overview
CREATE TABLE IF NOT EXISTS msp_portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, -- MSP/Consultant user
  
  portfolio_name TEXT NOT NULL,
  description TEXT,
  
  -- Aggregated Metrics (calculated)
  total_clients INTEGER DEFAULT 0,
  active_engagements INTEGER DEFAULT 0,
  total_mrr REAL DEFAULT 0.0, -- Monthly Recurring Revenue
  
  -- Risk Summary
  clients_critical_risk INTEGER DEFAULT 0,
  clients_high_risk INTEGER DEFAULT 0,
  clients_medium_risk INTEGER DEFAULT 0,
  clients_low_risk INTEGER DEFAULT 0,
  
  -- Compliance Summary
  avg_compliance_score REAL DEFAULT 0.0,
  clients_compliant INTEGER DEFAULT 0,
  clients_non_compliant INTEGER DEFAULT 0,
  
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- MSP Client Summary (per-client metrics for portfolio view)
CREATE TABLE IF NOT EXISTS msp_client_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id INTEGER NOT NULL,
  client_org_id INTEGER NOT NULL,
  
  -- Client Info
  client_name TEXT NOT NULL,
  industry TEXT,
  employee_count INTEGER,
  
  -- Contract
  contract_type TEXT, -- 'managed', 'project', 'advisory', 'hybrid'
  contract_value REAL,
  contract_start_date DATE,
  contract_end_date DATE,
  mrr REAL DEFAULT 0.0,
  
  -- Service Levels
  service_tier TEXT, -- 'basic', 'standard', 'premium', 'enterprise'
  services_enabled TEXT, -- JSON array
  
  -- Compliance Status
  primary_framework TEXT,
  compliance_score REAL,
  last_assessment_date DATE,
  next_assessment_date DATE,
  
  -- Risk
  risk_rating TEXT, -- 'critical', 'high', 'medium', 'low'
  open_gaps INTEGER DEFAULT 0,
  critical_gaps INTEGER DEFAULT 0,
  
  -- Health
  health_score INTEGER, -- 0-100
  health_factors TEXT, -- JSON explaining health score
  
  -- Activity
  last_activity_date DATE,
  pending_actions INTEGER DEFAULT 0,
  
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES msp_portfolio(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id)
);

-- ============================================================================
-- CONSULTANT INSIGHTS & RECOMMENDATIONS
-- ============================================================================

-- Consultant Recommendations Library (reusable recommendations)
CREATE TABLE IF NOT EXISTS recommendation_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  
  recommendation_title TEXT NOT NULL,
  recommendation_type TEXT NOT NULL, -- 'policy', 'process', 'technology', 'training', 'governance'
  
  -- Content
  description TEXT NOT NULL,
  detailed_guidance TEXT,
  implementation_steps TEXT, -- JSON array
  
  -- Applicability
  applicable_frameworks TEXT, -- JSON array
  applicable_controls TEXT, -- JSON array
  applicable_gap_types TEXT, -- JSON array
  
  -- Effort & Cost
  typical_effort TEXT, -- 'minimal', 'moderate', 'significant', 'major'
  typical_cost_range TEXT, -- '$', '$$', '$$$', '$$$$'
  typical_timeline TEXT,
  
  -- Effectiveness
  times_used INTEGER DEFAULT 0,
  avg_effectiveness_rating REAL,
  
  is_active BOOLEAN DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Client-Specific Recommendations
CREATE TABLE IF NOT EXISTS client_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  library_rec_id INTEGER, -- Optional link to library
  client_org_id INTEGER NOT NULL,
  engagement_id INTEGER,
  gap_id INTEGER,
  user_id INTEGER NOT NULL,
  
  recommendation_title TEXT NOT NULL,
  recommendation_type TEXT NOT NULL,
  
  -- Priority
  priority INTEGER NOT NULL, -- 1-5
  priority_rationale TEXT,
  
  -- Content
  description TEXT NOT NULL,
  client_specific_guidance TEXT,
  implementation_steps TEXT, -- JSON array
  
  -- Effort & Cost (client-specific estimates)
  estimated_effort TEXT,
  estimated_hours REAL,
  estimated_cost REAL,
  estimated_timeline TEXT,
  
  -- Budget Impact
  budget_category TEXT,
  budget_year INTEGER,
  
  -- Status
  status TEXT DEFAULT 'proposed', -- 'proposed', 'accepted', 'in_progress', 'completed', 'deferred', 'rejected'
  client_response TEXT,
  client_response_date DATE,
  
  -- Outcomes
  completion_date DATE,
  effectiveness_rating INTEGER, -- 1-5
  outcome_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (library_rec_id) REFERENCES recommendation_library(id),
  FOREIGN KEY (client_org_id) REFERENCES client_organizations(id),
  FOREIGN KEY (engagement_id) REFERENCES consulting_engagements(id),
  FOREIGN KEY (gap_id) REFERENCES gap_analysis(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_engagements_user ON consulting_engagements(user_id);
CREATE INDEX IF NOT EXISTS idx_engagements_client ON consulting_engagements(client_org_id);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON consulting_engagements(engagement_status);

CREATE INDEX IF NOT EXISTS idx_milestones_engagement ON engagement_milestones(engagement_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_engagement ON engagement_time_entries(engagement_id);

CREATE INDEX IF NOT EXISTS idx_assessment_templates_user ON assessment_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_client ON assessment_instances(client_org_id);
CREATE INDEX IF NOT EXISTS idx_assessment_instances_engagement ON assessment_instances(engagement_id);

CREATE INDEX IF NOT EXISTS idx_gap_analysis_client ON gap_analysis(client_org_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_engagement ON gap_analysis(engagement_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_status ON gap_analysis(status);

CREATE INDEX IF NOT EXISTS idx_roadmaps_client ON client_roadmaps(client_org_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_engagement ON client_roadmaps(engagement_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_phases_roadmap ON roadmap_phases(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_initiatives_phase ON roadmap_initiatives(phase_id);

CREATE INDEX IF NOT EXISTS idx_budget_plans_roadmap ON budget_plans(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_budget_plans_client ON budget_plans(client_org_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_plan ON budget_line_items(budget_plan_id);

CREATE INDEX IF NOT EXISTS idx_report_templates_user ON report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_client ON generated_reports(client_org_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_engagement ON generated_reports(engagement_id);

CREATE INDEX IF NOT EXISTS idx_msp_portfolio_user ON msp_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_msp_client_summary_portfolio ON msp_client_summary(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_msp_client_summary_client ON msp_client_summary(client_org_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_library_user ON recommendation_library(user_id);
CREATE INDEX IF NOT EXISTS idx_client_recommendations_client ON client_recommendations(client_org_id);
CREATE INDEX IF NOT EXISTS idx_client_recommendations_engagement ON client_recommendations(engagement_id);
