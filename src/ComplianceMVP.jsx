import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Download, Upload, Plus, Search, Filter, CheckCircle, AlertCircle, Clock, Server, Shield, Edit2, Save, X, Users, TrendingUp, Database, Award, Menu, ChevronDown, ChevronRight, LayoutDashboard, ArrowUpRight, ArrowDownRight, ArrowRight, Activity, Target, ExternalLink, Info, Home, FileText, BarChart3, Settings, Sparkles, Gauge, FileCheck, ClipboardList, AlertTriangle, CheckSquare, Calendar, UserCheck, Link2, TrendingDown, XCircle, ActivitySquare, Network, BookOpen, ListTree, HelpCircle, Loader2, Check, RefreshCw } from 'lucide-react';
import { NIST_800_53_CONTROLS } from './frameworks/nist80053-controls';
import { ISO_27001_CONTROLS } from './frameworks/iso27001-controls';
import { CIS_CONTROLS } from './frameworks/cis-controls';
import { HIPAA_CONTROLS } from './frameworks/hipaa-controls';
import { PCI_DSS_CONTROLS } from './frameworks/pci-dss-controls';
import { SOC2_CONTROLS } from './frameworks/soc2-controls';
import { FEDRAMP_CONTROLS } from './frameworks/fedramp-controls';
import { NIST_800_171_CONTROLS } from './frameworks/nist800171-controls';
import api, { API_BASE_URL } from './services/api';
import DataFlowArchitectureView from './views/DataFlowArchitectureView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

const PRODUCT_LIBRARY = [
  {
    key: 'golden-thread',
    name: 'Golden Thread Control Workspace',
    summary: 'Unified control view tying together risk snapshot, alerts, architecture, evidence, and AI guidance.',
    value: 'Reduces manual investigation time by presenting the entire control lifecycle in one place.',
    users: 'Compliance managers, SecOps analysts, auditors',
    status: 'Live',
    related: ['AI Guidance', 'Alert Drill-Down', 'Data Flow Architecture'],
    capabilities: [
      'Risk and timeline snapshot with live updates',
      'Linked alerts, systems, flows, and evidence',
      'AI-driven remediation guidance and automation opportunities',
      'CSV export for audit packages',
    ],
  },
  {
    key: 'ai-intelligence',
    name: 'AI Compliance Intelligence Core',
    summary: 'Scoring and guidance engine that ranks control risk and prescribes remediation steps.',
    value: 'Helps teams prioritize by risk, understand "why", and take action faster.',
    users: 'Compliance leads, GRC analysts, CISOs',
    status: 'Live',
    related: ['Golden Thread', 'Automation Playbook', 'Controls Matrix'],
    capabilities: [
      'Control priority scoring (obligation, threat, evidence, automation)',
      'Guided remediation actions and narratives',
      'Evidence freshness and owner recommendations',
    ],
  },
  {
    key: 'alert-drilldown',
    name: 'Alert Drill-Down & Remediation Console',
    summary: 'Full-screen alert workspace with risk snapshot, timeline, linked controls, and checklist.',
    value: 'Collapses investigation and remediation workflow into a single pane.',
    users: 'Security operations, compliance responders',
    status: 'Live',
    related: ['AI Guidance', 'Automation Playbook', 'Golden Thread'],
    capabilities: [
      'Detailed alert timeline with activity log',
      'Linked controls and remediation checklist',
      'Websocket refresh for collaborative response',
    ],
  },
  {
    key: 'dataflow',
    name: 'Data Flow Architecture Graph',
    summary: 'Interactive graph of systems, data flows, telemetry, and control attribution.',
    value: 'Visualizes data lineage and evidence mapping to support compliance-by-design.',
    users: 'Cloud/security architects, data governance, compliance teams',
    status: 'Live',
    related: ['Golden Thread', 'Automation Plan', 'Controls Matrix'],
    capabilities: [
      'Node/edge CRUD with audit history',
      'Telemetry overlays and signals',
      'Cross-navigation to controls and alerts',
    ],
  },
  {
    key: 'controls-matrix',
    name: 'Controls & Responsibility Matrix',
    summary: 'Tabular view of controls, ownership, shared responsibility, and data sources.',
    value: 'Clarifies accountability and forms the backbone for remediation reporting.',
    users: 'Compliance program owners, control operators, auditors',
    status: 'Live',
    related: ['Golden Thread', 'IAM & Permissions', 'Automation Plan'],
    capabilities: [
      'Filters and quick metrics',
      'Inline ownership updates and exports',
      'Shared responsibility and data attribution visibility',
    ],
  },
  {
    key: 'automation-playbook',
    name: 'Automation Playbook & Checklist',
    summary: 'Guided remediation modal that tracks steps, evidence, and automation progress.',
    value: 'Standardizes remediation, captures evidence, and tracks automation velocity.',
    users: 'Control owners, automation engineers, compliance teams',
    status: 'Live',
    related: ['AI Guidance', 'Automation Activity Log', 'Golden Thread'],
    capabilities: [
      'Step-by-step checklist with completion tracking',
      'Evidence and notes capture',
      'Automation history logging',
    ],
  },
  {
    key: 'framework-glossary',
    name: 'Framework Glossary & Learning Hub',
    summary: 'Interactive dictionary of frameworks, controls, and beginner-friendly explanations.',
    value: 'Onboards new stakeholders and supports multi-framework mapping.',
    users: 'Compliance teams, auditors, newcomers',
    status: 'Live',
    related: ['Controls Matrix', 'Reports', 'Product Library'],
    capabilities: [
      'Searchable catalogue of frameworks',
      'Quick facts and reference links',
      'Beginner-friendly descriptions',
    ],
  },
  {
    key: 'iam-console',
    name: 'IAM & Permissions Console',
    summary: 'Unified view of roles, vendor profiles, permission grants, and audit logs.',
    value: 'Supports least-privilege evidence and streamlines access governance.',
    users: 'IAM admins, compliance managers, auditors',
    status: 'Live',
    related: ['Controls Matrix', 'Golden Thread', 'Automation Plan'],
    capabilities: [
      'Role and permission management UI',
      'Vendor access profiles',
      'Permission audit logging',
    ],
  },
  {
    key: 'realtime-compliance',
    name: 'Real-Time Compliance & Score History',
    summary: 'Dashboards and APIs that track framework scores and security-compliance correlation.',
    value: 'Quantifies progress and highlights drift for leadership and auditors.',
    users: 'Compliance leadership, executives, auditors',
    status: 'Live',
    related: ['AI Prioritization', 'Alert Drill-Down', 'Reports'],
    capabilities: [
      'Framework growth metrics and history',
      'Security-compliance correlation API',
      'Real-time score snapshots',
    ],
  },
  {
    key: 'product-library',
    name: 'Product Library',
    summary: 'In-app catalogue explaining every platform feature and capability.',
    value: 'Supports adoption by documenting value, users, and related workflows.',
    users: 'All users (product, compliance, customer success)',
    status: 'Live',
    related: ['Framework Glossary', 'Golden Thread', 'AI Guidance'],
    capabilities: [
      'Feature summaries and benefits',
      'Target users and status tracking',
      'Links to related capabilities',
    ],
  },
];

// Connection type descriptions and icons
const CONNECTION_TYPES = {
  'enhances': {
    description: 'Improves functionality and adds capabilities',
    icon: '✨',
    color: 'hsl(142 76% 36%)'
  },
  'integrates': {
    description: 'Seamlessly connects and shares data',
    icon: '🔗',
    color: 'hsl(217 91% 60%)'
  },
  'visualizes': {
    description: 'Displays and represents data visually',
    icon: '📊',
    color: 'hsl(262 83% 58%)'
  },
  'sources': {
    description: 'Provides data or information',
    icon: '📥',
    color: 'hsl(38 92% 50%)'
  },
  'guides': {
    description: 'Provides direction and recommendations',
    icon: '🧭',
    color: 'hsl(199 89% 48%)'
  },
  'prioritizes': {
    description: 'Ranks and orders by importance',
    icon: '⭐',
    color: 'hsl(45 93% 47%)'
  },
  'powers': {
    description: 'Enables core functionality',
    icon: '⚡',
    color: 'hsl(0 84% 60%)'
  },
  'triggers': {
    description: 'Initiates actions or workflows',
    icon: '🚀',
    color: 'hsl(142 76% 36%)'
  },
  'feeds': {
    description: 'Supplies data or updates',
    icon: '📡',
    color: 'hsl(217 91% 60%)'
  },
  'updates': {
    description: 'Refreshes or modifies information',
    icon: '🔄',
    color: 'hsl(199 89% 48%)'
  },
  'enriches': {
    description: 'Adds context and additional details',
    icon: '💎',
    color: 'hsl(262 83% 58%)'
  },
  'maps': {
    description: 'Creates associations and links',
    icon: '🗺️',
    color: 'hsl(38 92% 50%)'
  },
  'informs': {
    description: 'Provides insights and knowledge',
    icon: '💡',
    color: 'hsl(199 89% 48%)'
  },
  'defines': {
    description: 'Establishes structure and rules',
    icon: '📋',
    color: 'hsl(217 91% 60%)'
  },
  'provides': {
    description: 'Supplies resources or capabilities',
    icon: '📦',
    color: 'hsl(38 92% 50%)'
  },
  'tracks': {
    description: 'Monitors progress and status',
    icon: '👁️',
    color: 'hsl(199 89% 48%)'
  },
  'improves': {
    description: 'Enhances performance or quality',
    icon: '📈',
    color: 'hsl(142 76% 36%)'
  },
  'uses': {
    description: 'Leverages capabilities',
    icon: '🔧',
    color: 'hsl(38 92% 50%)'
  },
  'explains': {
    description: 'Clarifies and educates',
    icon: '📚',
    color: 'hsl(199 89% 48%)'
  },
  'complements': {
    description: 'Works alongside to enhance',
    icon: '🤝',
    color: 'hsl(262 83% 58%)'
  },
  'manages': {
    description: 'Controls and administers',
    icon: '⚙️',
    color: 'hsl(217 91% 60%)'
  },
  'authorizes': {
    description: 'Grants permissions and access',
    icon: '🔐',
    color: 'hsl(0 84% 60%)'
  },
  'measures': {
    description: 'Quantifies and evaluates',
    icon: '📏',
    color: 'hsl(199 89% 48%)'
  },
  'monitors': {
    description: 'Observes and watches',
    icon: '👀',
    color: 'hsl(199 89% 48%)'
  },
  'links': {
    description: 'Connects and references',
    icon: '🔗',
    color: 'hsl(217 91% 60%)'
  },
  'documents': {
    description: 'Records and catalogs',
    icon: '📄',
    color: 'hsl(38 92% 50%)'
  }
};

// Feature Integration Map - Defines relationships between features
const FEATURE_RELATIONSHIPS = [
  // Core relationships based on PRODUCT_LIBRARY related fields
  { from: 'golden-thread', to: 'ai-intelligence', type: 'enhances', strength: 'strong' },
  { from: 'golden-thread', to: 'alert-drilldown', type: 'integrates', strength: 'strong' },
  { from: 'golden-thread', to: 'dataflow', type: 'visualizes', strength: 'strong' },
  { from: 'golden-thread', to: 'controls-matrix', type: 'sources', strength: 'medium' },
  
  { from: 'ai-intelligence', to: 'automation-playbook', type: 'guides', strength: 'strong' },
  { from: 'ai-intelligence', to: 'controls-matrix', type: 'prioritizes', strength: 'strong' },
  { from: 'ai-intelligence', to: 'golden-thread', type: 'powers', strength: 'strong' },
  
  { from: 'alert-drilldown', to: 'automation-playbook', type: 'triggers', strength: 'strong' },
  { from: 'alert-drilldown', to: 'golden-thread', type: 'feeds', strength: 'strong' },
  { from: 'alert-drilldown', to: 'realtime-compliance', type: 'updates', strength: 'medium' },
  
  { from: 'dataflow', to: 'golden-thread', type: 'enriches', strength: 'strong' },
  { from: 'dataflow', to: 'controls-matrix', type: 'maps', strength: 'medium' },
  { from: 'dataflow', to: 'automation-playbook', type: 'informs', strength: 'medium' },
  
  { from: 'controls-matrix', to: 'iam-console', type: 'defines', strength: 'strong' },
  { from: 'controls-matrix', to: 'golden-thread', type: 'provides', strength: 'strong' },
  { from: 'controls-matrix', to: 'automation-playbook', type: 'tracks', strength: 'medium' },
  
  { from: 'automation-playbook', to: 'realtime-compliance', type: 'improves', strength: 'strong' },
  { from: 'automation-playbook', to: 'controls-matrix', type: 'updates', strength: 'strong' },
  { from: 'automation-playbook', to: 'ai-intelligence', type: 'uses', strength: 'strong' },
  
  { from: 'framework-glossary', to: 'controls-matrix', type: 'explains', strength: 'medium' },
  { from: 'framework-glossary', to: 'product-library', type: 'complements', strength: 'weak' },
  
  { from: 'iam-console', to: 'controls-matrix', type: 'manages', strength: 'strong' },
  { from: 'iam-console', to: 'golden-thread', type: 'authorizes', strength: 'medium' },
  
  { from: 'realtime-compliance', to: 'controls-matrix', type: 'measures', strength: 'strong' },
  { from: 'realtime-compliance', to: 'alert-drilldown', type: 'monitors', strength: 'medium' },
  
  { from: 'product-library', to: 'framework-glossary', type: 'links', strength: 'weak' },
  { from: 'product-library', to: 'golden-thread', type: 'documents', strength: 'weak' },
];

// Extended framework library with NIST 800-171

const FRAMEWORK_LIBRARY = {
  "NIST_800-53": { name: "NIST 800-53", version: "Rev 5" },
  "NIST_800-171": { name: "NIST 800-171", version: "Rev 2" },
  "ISO27001": { name: "ISO 27001", version: "2022" },
  "SOC2": { name: "SOC 2", version: "Type II" },
  "CIS": { name: "CIS Controls", version: "v8" },
  "HIPAA": { name: "HIPAA", version: "Security Rule" },
  "PCI_DSS": { name: "PCI DSS", version: "v4.0" },
  "FedRAMP": { name: "FedRAMP", version: "High Baseline" }
};

const FRAMEWORK_GLOSSARY = [
  {
    id: 'nist80053',
    name: 'NIST SP 800-53 Revision 5',
    shortName: 'NIST 800-53',
    category: 'Security & Privacy Controls Catalog',
    description: 'Comprehensive catalog of security and privacy controls for U.S. federal information systems and organizations.',
    focusAreas: ['Access Control (AC)', 'Audit & Accountability (AU)', 'System & Communications Protection (SC)', 'Incident Response (IR)'],
    idealFor: ['US Federal agencies', 'Critical infrastructure', 'Enterprises needing a broad control baseline'],
    docLink: 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
    quickFacts: {
      controlFamilies: 20,
      totalControls: 1100,
      assuranceLevel: 'High',
    },
  },
  {
    id: 'nist800171',
    name: 'NIST SP 800-171 Revision 2',
    shortName: 'NIST 800-171',
    category: 'Controlled Unclassified Information (CUI)',
    description: 'Safeguards for protecting Controlled Unclassified Information in nonfederal systems and organizations.',
    focusAreas: ['Access Control', 'Media Protection', 'Personnel Security', 'System Integrity'],
    idealFor: ['Defense industrial base', 'Federal contractors & suppliers', 'Manufacturing & aerospace'],
    docLink: 'https://csrc.nist.gov/publications/detail/sp/800-171/rev-2/final',
    quickFacts: {
      controlFamilies: 14,
      totalControls: 110,
      assuranceLevel: 'Moderate',
    },
  },
  {
    id: 'iso27001',
    name: 'ISO/IEC 27001:2022',
    shortName: 'ISO 27001',
    category: 'Information Security Management System (ISMS)',
    description: 'International standard for establishing, implementing, maintaining, and improving an information security management system.',
    focusAreas: ['Leadership & Governance', 'Risk Assessment', 'Asset Management', 'Supplier Security'],
    idealFor: ['Global enterprises', 'Cloud & SaaS providers', 'Organizations with international customers'],
    docLink: 'https://www.iso.org/standard/27001',
    quickFacts: {
      controlFamilies: 4,
      totalControls: 93,
      assuranceLevel: 'High',
    },
  },
  {
    id: 'soc2',
    name: 'AICPA SOC 2 Trust Services Criteria',
    shortName: 'SOC 2',
    category: 'Service Organization Controls',
    description: 'Framework for managing customer data based on five "trust service principles": security, availability, processing integrity, confidentiality, and privacy.',
    focusAreas: ['Logical & Physical Access', 'Change Management', 'Risk Mitigation', 'Privacy'],
    idealFor: ['SaaS vendors', 'Managed service providers', 'FinTech'],
    docLink: 'https://www.aicpa.org/resources/article/soc-2-frequently-asked-questions',
    quickFacts: {
      controlFamilies: 5,
      totalControls: 61,
      assuranceLevel: 'Audit Attestation',
    },
  },
  {
    id: 'cis',
    name: 'CIS Critical Security Controls v8',
    shortName: 'CIS Controls',
    category: 'Operational Security Controls',
    description: 'Prioritized set of safeguards to defend against common cyber attacks, organized into Implementation Groups.',
    focusAreas: ['Enterprise Asset Management', 'Secure Configuration', 'Data Protection', 'Incident Response'],
    idealFor: ['IT & Security teams', 'SMBs scaling security', 'Organizations seeking quick wins'],
    docLink: 'https://www.cisecurity.org/controls/cis-controls-list',
    quickFacts: {
      controlFamilies: 18,
      totalControls: 153,
      assuranceLevel: 'Implementation Guidance',
    },
  },
  {
    id: 'hipaa',
    name: 'HIPAA Security Rule',
    shortName: 'HIPAA',
    category: 'Healthcare Information Protection',
    description: 'Standards for protecting the confidentiality, integrity, and availability of electronic protected health information (ePHI).',
    focusAreas: ['Administrative Safeguards', 'Physical Safeguards', 'Technical Safeguards'],
    idealFor: ['Hospitals & clinics', 'Health tech', 'Business associates handling ePHI'],
    docLink: 'https://www.hhs.gov/hipaa/for-professionals/security/index.html',
    quickFacts: {
      controlFamilies: 3,
      totalControls: 42,
      assuranceLevel: 'Regulatory',
    },
  },
  {
    id: 'pcidss',
    name: 'PCI DSS v4.0',
    shortName: 'PCI DSS',
    category: 'Payment Card Security',
    description: 'Global standard that helps ensure the secure handling of credit card information by merchants, processors, and service providers.',
    focusAreas: ['Network Security', 'Vulnerability Management', 'Access Control', 'Monitoring & Testing'],
    idealFor: ['Retail & e-commerce', 'Payment processors', 'FinTech'],
    docLink: 'https://www.pcisecuritystandards.org/document_library',
    quickFacts: {
      controlFamilies: 12,
      totalControls: 300,
      assuranceLevel: 'Regulatory',
    },
  },
  {
    id: 'fedramp',
    name: 'FedRAMP Moderate/High Baseline',
    shortName: 'FedRAMP',
    category: 'US Federal Cloud Authorization',
    description: 'Standardized approach to security assessment, authorization, and continuous monitoring for cloud products and services used by U.S. federal agencies.',
    focusAreas: ['Authorization Boundary', 'Continuous Monitoring', 'Audit Logging', 'Incident Reporting'],
    idealFor: ['Cloud service providers', 'GovTech startups', 'SaaS working with US federal agencies'],
    docLink: 'https://www.fedramp.gov/documents/',
    quickFacts: {
      controlFamilies: 17,
      totalControls: 325,
      assuranceLevel: 'High',
    },
  },
];



// Enhanced control schema

const CORE_CONTROLS = [

  {

    id: "AC-001",

    control_name: "Access Control Policy",

    description: "Establish and maintain documented access control policies",

    frameworks: ["NIST_800-53:AC-1", "ISO27001:A.9.1.1", "SOC2:CC6.1", "NIST_800-171:3.1.1"],

    category: "Access Control",

    priority: "Critical",

    mapped_fields: ["EDR.Users", "AD.Groups", "VPN.Logins", "SSO.Users"],

    default_owner: "Security Operations"

  },

  {

    id: "AC-002",

    control_name: "Multi-Factor Authentication",

    description: "Require MFA for all privileged and remote access",

    frameworks: ["NIST_800-53:IA-2", "ISO27001:A.9.4.2", "SOC2:CC6.1", "NIST_800-171:3.5.3"],

    category: "Access Control",

    priority: "Critical",

    mapped_fields: ["SSO.MFA_Enabled", "VPN.MFA_Required", "Cloud.MFA_Status"],

    default_owner: "Security Operations"

  },

  {

    id: "AC-003",

    control_name: "Least Privilege Access",

    description: "Users granted minimum necessary access rights",

    frameworks: ["NIST_800-53:AC-6", "ISO27001:A.9.2.3", "SOC2:CC6.3", "NIST_800-171:3.1.5"],

    category: "Access Control",

    priority: "High",

    mapped_fields: ["AD.PrivilegedUsers", "IAM.Roles", "RBAC.Assignments"],

    default_owner: "Security Operations"

  },

  {

    id: "IR-001",

    control_name: "Incident Response Plan",

    description: "Documented incident detection and response procedures",

    frameworks: ["NIST_800-53:IR-1", "ISO27001:A.16.1.1", "SOC2:CC7.3", "NIST_800-171:3.6.1"],

    category: "Incident Response",

    priority: "Critical",

    mapped_fields: ["SIEM.Alerts", "EDR.Incidents", "SOC.Tickets"],

    default_owner: "Security Operations"

  },

  {

    id: "IR-002",

    control_name: "Security Event Monitoring",

    description: "Continuous monitoring and logging of security events",

    frameworks: ["NIST_800-53:SI-4", "ISO27001:A.12.4.1", "SOC2:CC7.2", "NIST_800-171:3.3.1"],

    category: "Incident Response",

    priority: "Critical",

    mapped_fields: ["SIEM.Logs", "EDR.Telemetry", "CloudWatch.Events"],

    default_owner: "Security Operations"

  },

  {

    id: "DM-001",

    control_name: "Data Encryption at Rest",

    description: "Sensitive data encrypted when stored",

    frameworks: ["NIST_800-53:SC-28", "ISO27001:A.10.1.1", "SOC2:CC6.7", "NIST_800-171:3.13.11"],

    category: "Data Management",

    priority: "Critical",

    mapped_fields: ["Storage.Encryption", "DB.Encryption", "Disk.BitLocker"],

    default_owner: "Infrastructure Team"

  },

  {

    id: "DM-002",

    control_name: "Data Encryption in Transit",

    description: "Encrypted transmission of sensitive data",

    frameworks: ["NIST_800-53:SC-8", "ISO27001:A.13.1.1", "SOC2:CC6.7", "NIST_800-171:3.13.8"],

    category: "Data Management",

    priority: "Critical",

    mapped_fields: ["Network.TLS", "VPN.Encryption", "API.HTTPS"],

    default_owner: "Network Team"

  },

  {

    id: "VM-001",

    control_name: "Vulnerability Scanning",

    description: "Regular vulnerability assessments and scanning",

    frameworks: ["NIST_800-53:RA-5", "ISO27001:A.12.6.1", "SOC2:CC7.1", "NIST_800-171:3.11.2"],

    category: "Vulnerability Management",

    priority: "High",

    mapped_fields: ["Scanner.Results", "Assets.VulnStatus", "Patch.Level"],

    default_owner: "Security Operations"

  },

  {

    id: "VM-002",

    control_name: "Patch Management",

    description: "Timely application of security patches",

    frameworks: ["NIST_800-53:SI-2", "ISO27001:A.12.6.1", "SOC2:CC7.1", "NIST_800-171:3.4.1"],

    category: "Vulnerability Management",

    priority: "High",

    mapped_fields: ["Assets.PatchStatus", "WSUS.Compliance", "RMM.Patches"],

    default_owner: "Infrastructure Team"

  },

  {

    id: "EP-001",

    control_name: "Endpoint Protection",

    description: "EDR/antivirus deployed on all endpoints",

    frameworks: ["NIST_800-53:SI-3", "ISO27001:A.12.2.1", "SOC2:CC7.1", "NIST_800-171:3.14.1"],

    category: "Endpoint Security",

    priority: "Critical",

    mapped_fields: ["EDR.Coverage", "AV.Status", "Assets.Tools"],

    default_owner: "Security Operations"

  },

  {

    id: "BC-001",

    control_name: "Data Backup",

    description: "Regular backups with tested recovery procedures",

    frameworks: ["NIST_800-53:CP-9", "ISO27001:A.12.3.1", "SOC2:A1.2", "NIST_800-171:3.8.9"],

    category: "Business Continuity",

    priority: "High",

    mapped_fields: ["Backup.Status", "Recovery.Tests", "Storage.Backups"],

    default_owner: "Infrastructure Team"

  },

  {

    id: "SA-001",

    control_name: "Security Awareness Training",

    description: "Annual security training for all personnel",

    frameworks: ["NIST_800-53:AT-2", "ISO27001:A.7.2.2", "SOC2:CC1.4", "NIST_800-171:3.2.1"],

    category: "Security Awareness",

    priority: "High",

    mapped_fields: ["Training.Completion", "Users.TrainingDate"],

    default_owner: "HR/Security"

  },

  {

    id: "NET-001",

    control_name: "Network Segmentation",

    description: "Logical separation of network segments",

    frameworks: ["NIST_800-53:SC-7", "ISO27001:A.13.1.3", "SOC2:CC6.6", "NIST_800-171:3.13.1"],

    category: "Network Security",

    priority: "High",

    mapped_fields: ["Firewall.Rules", "Network.Segmentation", "VLAN.Config"],

    default_owner: "Network Team"

  },

  {

    id: "AUD-001",

    control_name: "Audit Logging",

    description: "Comprehensive logging of system activities",

    frameworks: ["NIST_800-53:AU-2", "ISO27001:A.12.4.1", "SOC2:CC7.2", "NIST_800-171:3.3.1"],

    category: "Audit & Compliance",

    priority: "Critical",

    mapped_fields: ["Logs.Enabled", "SIEM.Retention", "AuditLog.Status"],

    default_owner: "Security Operations"

  },

  {

    id: "TPA-001",

    control_name: "Third-Party Risk Assessment",

    description: "Security assessment of vendors and partners",

    frameworks: ["NIST_800-53:SA-9", "ISO27001:A.15.1.1", "SOC2:CC9.1", "NIST_800-171:3.12.1"],

    category: "Third Party",

    priority: "High",

    mapped_fields: ["Vendor.Assessments", "Contracts.Security"],

    default_owner: "Compliance Officer"

  }

];


// Helper functions for control data mapping
const generateMappedFields = (category, controlId) => {
  const categoryMappings = {
    "Access Control": ["SSO.Users", "IAM.Roles", "AD.Groups", "VPN.Logins"],
    "Identity Management": ["SSO.MFA_Enabled", "IAM.Identities", "Okta.Users"],
    "System Integrity": ["EDR.Coverage", "SIEM.Logs", "AV.Status"],
    "Incident Response": ["SIEM.Alerts", "EDR.Incidents", "SOC.Tickets"],
    "System Protection": ["Network.TLS", "Storage.Encryption", "VPN.Encryption"],
    "Audit": ["Logs.Enabled", "SIEM.Retention", "AuditLog.Status"],
    "Configuration Management": ["CMDB.Assets", "Config.Baseline", "Change.Management"],
    "Risk Assessment": ["Scanner.Results", "Assets.VulnStatus", "Patch.Level"],
    "Organizational": ["Policies.Status", "Training.Completion", "Vendor.Assessments"],
    "People": ["HR.Onboarding", "Training.Completion", "Users.TrainingDate"],
    "Physical": ["Access.Badge", "CCTV.Status", "Facility.Security"],
    "Technological": ["EDR.Coverage", "Network.Segmentation", "Backup.Status"]
  };
  return categoryMappings[category] || ["General.Security"];
};

const getDefaultOwner = (category) => {
  const ownerMappings = {
    "Access Control": "Security Operations",
    "Identity Management": "IT Operations",
    "System Integrity": "Security Operations",
    "Incident Response": "Security Operations",
    "System Protection": "Infrastructure Team",
    "Audit": "Security Operations",
    "Configuration Management": "Infrastructure Team",
    "Risk Assessment": "Security Operations",
    "Organizational": "Compliance Officer",
    "People": "HR/Security",
    "Physical": "Facilities/Security",
    "Technological": "Infrastructure Team"
  };
  return ownerMappings[category] || "Unassigned";
};
const getControlFamily = (controlId) => {
  if (!controlId) return "Unknown";
  const prefix = controlId.split('-')[0];
  const families = {
    "AC": "Access Control",
    "IA": "Identification and Authentication",
    "SI": "System and Information Integrity",
    "IR": "Incident Response",
    "SC": "System and Communications Protection",
    "AU": "Audit and Accountability",
    "CM": "Configuration Management",
    "RA": "Risk Assessment",
    "CA": "Security Assessment and Authorization"
  };
  return families[prefix] || prefix;
};

// API Data Segmentation Logic
const segmentApiData = (apiData, controls, apiIntegrations) => {
  // This function segments incoming API data and auto-assigns to controls
  const segmentedData = [];
  
  apiIntegrations.forEach(api => {
    if (api.status === 'active') {
      // Find controls that this API covers
      const relatedControls = controls.filter(c => 
        api.controls_covered.includes(c.id) || 
        c.mapped_fields.some(field => {
          const [category] = field.split('.');
          return api.type.toLowerCase().includes(category.toLowerCase());
        })
      );
      
      relatedControls.forEach(control => {
        // Segment the data by responsibility
        const segment = {
          control_id: control.id,
          api_integration_id: api.id,
          api_name: api.name,
          data_segment: api.data_attributes,
          responsible_party: api.responsible_party,
          last_sync: api.last_sync,
          evidence_attribution: api.evidence_attribution,
          coverage_type: control.coverage_type || "API Data Attribution"
        };
        
        segmentedData.push(segment);
        
        // Update control with this segment
        const controlIndex = controls.findIndex(c => c.id === control.id);
        if (controlIndex >= 0) {
          const updatedControl = {
            ...controls[controlIndex],
            api_data_segments: [
              ...(controls[controlIndex].api_data_segments || []),
              segment
            ]
          };
          controls[controlIndex] = updatedControl;
        }
      });
    }
  });
  
  return { segmentedData, updatedControls: controls };
};
const ComplianceMVP = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [controls, setControls] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [complianceScores, setComplianceScores] = useState({});
  const [currentUser, setCurrentUser] = useState({ id: null, email: 'admin@company.com', organization: 'Demo Org', role: 'Admin' });
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [selectedFramework, setSelectedFramework] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState("controls");
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedControls, setSelectedControls] = useState(new Set());
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecommendationIndex, setSelectedRecommendationIndex] = useState(0);
  const [automationPlan, setAutomationPlan] = useState(null);
  const [showPlanGenerator, setShowPlanGenerator] = useState(false);
  const [frameworkGlossarySearch, setFrameworkGlossarySearch] = useState('');
  const [showProductLibrary, setShowProductLibrary] = useState(false);
  const [productLibrarySection, setProductLibrarySection] = useState(PRODUCT_LIBRARY[0]?.key ?? null);
  const selectedProductFeature = useMemo(() => {
    if (!productLibrarySection) return PRODUCT_LIBRARY[0] || null;
    return PRODUCT_LIBRARY.find((feature) => feature.key === productLibrarySection) || PRODUCT_LIBRARY[0] || null;
  }, [productLibrarySection]);

  // Integration Map state
  const [integrationMapSelectedFeature, setIntegrationMapSelectedFeature] = useState(null);
  const [integrationMapHighlightedPath, setIntegrationMapHighlightedPath] = useState([]);
  const [integrationMapFilterStrength, setIntegrationMapFilterStrength] = useState('all');
  const [integrationMapSelectedConnection, setIntegrationMapSelectedConnection] = useState(null);
  const integrationMapSvgRef = useRef(null);
  const [integrationMapDimensions, setIntegrationMapDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (showProductLibrary) {
      if (!productLibrarySection && PRODUCT_LIBRARY.length > 0) {
        setProductLibrarySection(PRODUCT_LIBRARY[0].key);
      }
    }
  }, [showProductLibrary]);

  // Integration Map resize handler
  useEffect(() => {
    if (activeView === 'integration-map') {
      const handleResize = () => {
        if (integrationMapSvgRef.current) {
          const rect = integrationMapSvgRef.current.getBoundingClientRect();
          const width = rect.width || 1200;
          const height = rect.height || 800;
          setIntegrationMapDimensions({ width, height });
        } else {
          // Fallback if ref not ready yet
          setIntegrationMapDimensions({ width: 1200, height: 800 });
        }
      };
      
      // Initial resize with multiple attempts to ensure SVG is rendered
      const timeout1 = setTimeout(handleResize, 50);
      const timeout2 = setTimeout(handleResize, 200);
      const timeout3 = setTimeout(handleResize, 500);
      
      window.addEventListener('resize', handleResize);
      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
        window.removeEventListener('resize', handleResize);
      };
    } else {
      // Reset dimensions when leaving the view
      setIntegrationMapDimensions({ width: 1200, height: 800 });
    }
  }, [activeView]);
  
  // Enterprise features
  const [entities, setEntities] = useState([]);
  const [currentEntity, setCurrentEntity] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [userRole, setUserRole] = useState({ role: 'Admin', permissions: ['*'] });
  const [projectTimeline, setProjectTimeline] = useState(null);
  const [automationActivityLog, setAutomationActivityLog] = useState([]);
  const [showAutomationWalkthrough, setShowAutomationWalkthrough] = useState(false);
  const [selectedAutomationControl, setSelectedAutomationControl] = useState(null);
  const [automationChecklistState, setAutomationChecklistState] = useState({});
  const [automationEvidenceNotes, setAutomationEvidenceNotes] = useState('');
  const [automationEvidenceLink, setAutomationEvidenceLink] = useState('');
  
  // Self-Learning Automation System State
  const [learnedPatterns, setLearnedPatterns] = useState([]);
  const [autoPlaybooks, setAutoPlaybooks] = useState([]);
  const [dataValueSummary, setDataValueSummary] = useState(null);
  const [learningAnalysisRunning, setLearningAnalysisRunning] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandHighlightIndex, setCommandHighlightIndex] = useState(0);
  const commandInputRef = useRef(null);
  const formatRelative = useCallback((dateString) => {
    if (!dateString) return 'Just now';
    const target = new Date(dateString);
    if (Number.isNaN(target.getTime())) return 'Just now';
    const now = new Date();
    const diffMs = now - target;
    if (diffMs <= 0) return 'Just now';
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }, []);
  const buildAutomationSteps = (control) => {
    if (!control) return [];
    if (control.remediation_steps && control.remediation_steps.length > 0) {
      return control.remediation_steps.map((step, idx) => ({
        id: `step-${control.id || idx}-${idx}`,
        title: step.action || step.step || `Step ${idx + 1}`,
        description: step.description || step.detail || ''
      }));
    }
    const defaults = [
      {
        id: 'review-current',
        title: 'Review current control state',
        description: `Validate existing evidence and baseline for ${control.control_name}.`
      },
      {
        id: 'perform-remediation',
        title: 'Execute remediation actions',
        description: `Apply required configuration or process changes for ${control.category}.`
      },
      {
        id: 'collect-evidence',
        title: 'Collect and attach evidence',
        description: 'Capture screenshots, reports, or logs demonstrating remediation.'
      },
      {
        id: 'update-records',
        title: 'Update control status & matrix',
        description: 'Mark the control implemented and refresh framework coverage.'
      },
    ];
    if (control.automatable || (control.mapped_fields && control.mapped_fields.length > 0)) {
      defaults.splice(2, 0, {
        id: 'trigger-automation',
        title: 'Trigger automation playbook',
        description: 'Run connected workflows to auto-remediate and sync evidence.'
      });
    }
    return defaults;
  };
  const openAutomationWalkthrough = (control, phase) => {
    if (!control) return;
    const steps = buildAutomationSteps(control);
    const initialState = {};
    steps.forEach((step) => {
      initialState[step.id] = false;
    });
    setSelectedAutomationControl({ control, phase });
    setAutomationChecklistState(initialState);
    setAutomationEvidenceNotes('');
    setAutomationEvidenceLink(control.evidence_link || '');
    setShowAutomationWalkthrough(true);
  };
  const toggleAutomationChecklistStep = (stepId) => {
    setAutomationChecklistState((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };
  const closeAutomationWalkthrough = () => {
    setShowAutomationWalkthrough(false);
    setSelectedAutomationControl(null);
  };
  const recordAutomationActivity = (entry) => {
    setAutomationActivityLog((prev) => [{ ...entry }, ...prev].slice(0, 25));
  };
  const handleAutomationProgressSave = () => {
    if (!selectedAutomationControl) return;
    const { control, phase } = selectedAutomationControl;
    const allComplete = Object.values(automationChecklistState).every(Boolean);
    recordAutomationActivity({
      id: `automation-${Date.now()}`,
      type: 'automation',
      title: control.control_name,
      status: allComplete ? 'completed' : 'in_progress',
      timestamp: new Date().toISOString(),
      phase: phase?.name || 'Automation Plan',
      notes: automationEvidenceNotes,
      evidenceLink: automationEvidenceLink,
    });
    if (allComplete) {
      setControls((prevControls) =>
        prevControls.map((existing) =>
          existing.id === control.id
            ? { ...existing, status: 'Implemented', last_updated: new Date().toISOString().split('T')[0] }
            : existing
        )
      );
    }
    closeAutomationWalkthrough();
  };
  
  // Timeline filtering
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("ALL");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("ALL");
  const [selectedPriceFilter, setSelectedPriceFilter] = useState("ALL");
  
  // Responsibility Matrix features
  const [responsibilityMatrix, setResponsibilityMatrix] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [apiIntegrations, setApiIntegrations] = useState([]);
  const [mdrProviders, setMdrProviders] = useState([]);
  const [controlOwnerFilter, setControlOwnerFilter] = useState("ALL");
  const [controlSharedFilter, setControlSharedFilter] = useState("ALL");
  const [controlDataSourceFilter, setControlDataSourceFilter] = useState("ALL");
  const [controlCoverageFilter, setControlCoverageFilter] = useState("ALL");
  const [controlStatusFilter, setControlStatusFilter] = useState("ALL");
  const [matrixFilterCategory, setMatrixFilterCategory] = useState("ALL");
  const [matrixFilterCoverageType, setMatrixFilterCoverageType] = useState("ALL");
  const [matrixFilterOwnership, setMatrixFilterOwnership] = useState("ALL");
  const [expandedFrameworks, setExpandedFrameworks] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set());
  
  // Control detail view
const [selectedControl, setSelectedControl] = useState(null);
const [showControlDetail, setShowControlDetail] = useState(false);
const [controlGuidance, setControlGuidance] = useState(null);
const [controlGuidanceLoading, setControlGuidanceLoading] = useState(false);
const [controlGuidanceError, setControlGuidanceError] = useState(null);
const [controlPatterns, setControlPatterns] = useState([]);
const [controlPlaybooks, setControlPlaybooks] = useState([]);
const [controlPatternsLoading, setControlPatternsLoading] = useState(false);
const [threadNotification, setThreadNotification] = useState(null);
const showControlDetailRef = useRef(false);
const selectedControlRef = useRef(null);

useEffect(() => {
  showControlDetailRef.current = showControlDetail;
  if (!showControlDetail) {
    setControlGuidance(null);
    setControlGuidanceError(null);
    setControlGuidanceLoading(false);
  }
}, [showControlDetail]);

useEffect(() => {
  selectedControlRef.current = selectedControl;
}, [selectedControl]);

useEffect(() => {
  if (!threadNotification) return;
  const timeout = setTimeout(() => setThreadNotification(null), 5000);
  return () => clearTimeout(timeout);
}, [threadNotification]);

const fetchControlGuidance = useCallback(async (controlId) => {
  if (!backendConnected || !currentUser?.id || !controlId) {
    return;
  }
  setControlGuidanceLoading(true);
  setControlGuidanceError(null);
  try {
    const result = await api.getControlGuidance(currentUser.id, controlId);
    setControlGuidance(result);
  } catch (error) {
    console.error('Error loading control guidance:', error);
    const message = error?.detail || error?.message || (error instanceof Error ? error.message : 'Unable to load guidance');
    setControlGuidanceError(message);
  } finally {
    setControlGuidanceLoading(false);
  }
}, [backendConnected, currentUser?.id]);

// Fetch learned patterns and playbooks for a control
const fetchControlPatterns = useCallback(async (controlId) => {
  if (!backendConnected || !currentUser?.id || !controlId) {
    return;
  }
  setControlPatternsLoading(true);
  try {
    const [patternsRes, playbooksRes] = await Promise.all([
      api.getControlPatterns(currentUser.id, controlId),
      api.getMatchingPlaybooks(currentUser.id, null, controlId),
    ]);
    setControlPatterns(patternsRes.patterns || []);
    setControlPlaybooks(playbooksRes.playbooks || []);
  } catch (error) {
    console.error('Error loading control patterns:', error);
    setControlPatterns([]);
    setControlPlaybooks([]);
  } finally {
    setControlPatternsLoading(false);
  }
}, [backendConnected, currentUser?.id]);

useEffect(() => {
  const controlId = selectedControl?.id;
  if (!showControlDetail || !controlId) {
    return;
  }
  if (!backendConnected || !currentUser?.id) {
    setControlGuidance(null);
    setControlGuidanceError(null);
    setControlGuidanceLoading(false);
    setControlPatterns([]);
    setControlPlaybooks([]);
    return;
  }
  fetchControlGuidance(controlId);
  fetchControlPatterns(controlId); // Fetch patterns proactively
}, [showControlDetail, selectedControl?.id, backendConnected, currentUser?.id, fetchControlGuidance, fetchControlPatterns]);

const openControlDetail = useCallback((control) => {
  if (!control) return;
  setSelectedControl(control);
  setShowControlDetail(true);
}, []);

// Navigate to feature from Product Library
const navigateToFeature = useCallback((featureKey) => {
  // Close the Product Library modal
  setShowProductLibrary(false);
  
  // Small delay to ensure modal closes smoothly
  setTimeout(() => {
    switch (featureKey) {
      case 'golden-thread':
        // Navigate to controls view and open first control if available
        setActiveView('controls');
        if (controls.length > 0) {
          setTimeout(() => {
            openControlDetail(controls[0]);
          }, 100);
        }
        break;
      case 'ai-intelligence':
        // Navigate to controls view (AI guidance is shown in control detail)
        setActiveView('controls');
        break;
      case 'alert-drilldown':
        // Navigate to dashboard where alerts are shown
        setActiveView('dashboard');
        break;
      case 'dataflow':
        // Navigate to Data Flow Architecture view
        setActiveView('architecture');
        break;
      case 'controls-matrix':
        // Navigate to Controls Matrix view
        setActiveView('controls');
        break;
      case 'automation-playbook':
        // Navigate to Security-Compliance Alignment view (playbooks integrated)
        setActiveView('csca');
        break;
      case 'framework-glossary':
        // Navigate to Framework Glossary view
        setActiveView('framework_glossary');
        break;
      case 'iam-console':
        // Navigate to IAM & Permissions view
        setActiveView('iam');
        break;
      case 'realtime-compliance':
        // Navigate to Dashboard (shows compliance scores)
        setActiveView('dashboard');
        break;
      case 'product-library':
        // Already in Product Library, do nothing
        break;
      default:
        // Default to dashboard
        setActiveView('dashboard');
    }
  }, 150);
}, [controls, openControlDetail]);

const closeControlDetail = useCallback(() => {
  setShowControlDetail(false);
  setSelectedControl(null);
  setControlGuidance(null);
  setControlGuidanceError(null);
  setControlGuidanceLoading(false);
}, []);
  
  // Data import features
  const [importHistory, setImportHistory] = useState([]);
  const [importProgress, setImportProgress] = useState(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  
  // RBAC features
  const [roles, setRoles] = useState([]);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  
  // TCO Calculator inputs
  const [tcoInputs, setTcoInputs] = useState({
    numAssets: 100,
    numCloudAccounts: 3,
    numVendorTools: 5,
    retentionYears: 3,
    auditsPerYear: 2,
    desiredSLA: '99.9',
    onboardingHours: 40
  });
  const [tcoResults, setTcoResults] = useState(null);
  const [costPlan, setCostPlan] = useState(null);
  const [showCostPlan, setShowCostPlan] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Audit Management
  const [audits, setAudits] = useState([]);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [auditFindings, setAuditFindings] = useState([]);
  const [auditEvidence, setAuditEvidence] = useState([]);
  const [auditReadiness, setAuditReadiness] = useState(null);
  const [preAuditReadiness, setPreAuditReadiness] = useState([]);
  const [showAuditCreate, setShowAuditCreate] = useState(false);
  const [auditorMode, setAuditorMode] = useState(false); // Toggle for auditor view
  const [selectedEvidenceForReview, setSelectedEvidenceForReview] = useState(null);
  const [auditComments, setAuditComments] = useState([]); // Comments/notes on audits
  const [showFindingCreate, setShowFindingCreate] = useState(false);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [certifications, setCertifications] = useState([]);
  const [auditFormData, setAuditFormData] = useState({
    audit_name: '',
    framework: 'SOC2',
    audit_type: 'Type II',
    auditor_name: '',
    auditor_contact: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    scope: []
  });
  const [findingFormData, setFindingFormData] = useState({
    control_id: '',
    finding_type: 'observation',
    severity: 'medium',
    description: '',
    remediation_plan: '',
    assigned_to: '',
    due_date: ''
  });
  const [evidenceFormData, setEvidenceFormData] = useState({
    control_id: '',
    evidence_type: 'document',
    evidence_name: '',
    file_url: '',
    notes: '',
    expiration_date: ''
  });
  
  // IAM (Identity & Access Management) State
  const [userPermissions, setUserPermissions] = useState([]);
  const [vendorAccessProfiles, setVendorAccessProfiles] = useState([]);
  const [permissionAuditLog, setPermissionAuditLog] = useState([]);
  const [showPermissionGrant, setShowPermissionGrant] = useState(false);
  const [showVendorProfile, setShowVendorProfile] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  
  // IAM Access Tracking State
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserForTracking, setSelectedUserForTracking] = useState(null);
  const [userAccessSummary, setUserAccessSummary] = useState(null);
  const [userAccessLogs, setUserAccessLogs] = useState([]);
  const [mappedPermissions, setMappedPermissions] = useState([]);
  const [complianceMapping, setComplianceMapping] = useState([]);
  const [accessTrackingLoading, setAccessTrackingLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [accessByArea, setAccessByArea] = useState([]); // Access grouped by area/resource type
  const [selectedAreaForDetails, setSelectedAreaForDetails] = useState(null); // Selected area to show details
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null); // Selected user to show full details
  const [expandedArea, setExpandedArea] = useState(null); // Expanded area index
  
  // Collapsible sections state for IAM view
  const [iamSectionsExpanded, setIamSectionsExpanded] = useState({
    graphs: true,
    userList: false,
    accessSummary: false,
    permissions: false,
    compliance: false,
    accessByArea: false,
    accessLogs: false
  });
  
  const [permissionFormData, setPermissionFormData] = useState({
    user_id: null,
    resource_type: 'control',
    resource_id: '',
    permission_type: 'read',
    expires_at: '',
    metadata: {}
  });
  const [vendorProfileFormData, setVendorProfileFormData] = useState({
    vendor_name: '',
    profile_name: '',
    scope: { controls: [], frameworks: [], audits: [] },
    permissions: { controls: ['read'], audits: ['read'], evidence: ['read'] },
    access_expires_at: '',
    auto_renew: false
  });
  
  // CSCA (Continuous Security-Compliance Alignment) State
  const [securityEvents, setSecurityEvents] = useState([]);
  const [complianceScoreHistory, setComplianceScoreHistory] = useState([]);
  const [complianceAlerts, setComplianceAlerts] = useState([]);
  const [securityComplianceCorrelation, setSecurityComplianceCorrelation] = useState(null);
  const [selectedSecurityEvent, setSelectedSecurityEvent] = useState(null);
  const [showSecurityEventModal, setShowSecurityEventModal] = useState(false);
  
  // Pattern Detection & Trend Analysis State
  const [detectedPatterns, setDetectedPatterns] = useState([]);
  const [patternAlerts, setPatternAlerts] = useState([]);
  const [patternTrends, setPatternTrends] = useState(null);
  const [patternDetectionRunning, setPatternDetectionRunning] = useState(false);
  
  // Data Flow Architecture State
  const [dataFlowNodes, setDataFlowNodes] = useState([]);
  const [dataFlowEdges, setDataFlowEdges] = useState([]);
  const [dataFlowAudit, setDataFlowAudit] = useState([]);
  const [dataFlowLoading, setDataFlowLoading] = useState(false);
  const [dataFlowError, setDataFlowError] = useState(null);
  const [dataFlowFilters, setDataFlowFilters] = useState({
    nodeType: 'ALL',
    sensitivity: 'ALL',
    owner: 'ALL',
    status: 'ALL',
    search: ''
  });
  const [selectedDataFlowItem, setSelectedDataFlowItem] = useState(null);
  const [showDataFlowNodeModal, setShowDataFlowNodeModal] = useState(false);
  const [showDataFlowEdgeModal, setShowDataFlowEdgeModal] = useState(false);
  const [editingDataFlowNode, setEditingDataFlowNode] = useState(null);
  const [editingDataFlowEdge, setEditingDataFlowEdge] = useState(null);
  const [dataFlowNodeForm, setDataFlowNodeForm] = useState({
    node_type: 'source',
    name: '',
    description: '',
    sensitivity: 'Internal',
    data_domains: '',
    classification_tags: '',
    owner: '',
    responsible_party: '',
    framework_controls: '',
    evidence_links: '',
    integration_status: 'active',
    last_sync_at: '',
    sync_frequency: '',
    system_of_record: false
  });
  const [dataFlowEdgeForm, setDataFlowEdgeForm] = useState({
    source_node_id: '',
    target_node_id: '',
    flow_type: 'ingest',
    transport: '',
    encryption_status: '',
    retention_policy: '',
    latency: '',
    volume: '',
    status: 'active',
    automated: true,
    controls_impacted: '',
    last_validated_at: ''
  });
  const dataFlowGraphRef = useRef(null);
  const [dataFlowLayoutSaving, setDataFlowLayoutSaving] = useState(false);
  const [dataFlowLayoutResetting, setDataFlowLayoutResetting] = useState(false);
  const [dataFlowLayoutLastSaved, setDataFlowLayoutLastSaved] = useState(null);

  // Unified Data Flow: Framework Growth & Actionable Alerts
  const [frameworkGrowth, setFrameworkGrowth] = useState({});
  const [actionableAlerts, setActionableAlerts] = useState([]);
  const [realtimeScores, setRealtimeScores] = useState({});
  const alertsSocketRef = useRef(null);
  const [alertsSocketConnected, setAlertsSocketConnected] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedAlertDetail, setSelectedAlertDetail] = useState(null);
  const [alertDetailLoading, setAlertDetailLoading] = useState(false);
  const [alertDetailError, setAlertDetailError] = useState(null);
  const [matchingPlaybooks, setMatchingPlaybooks] = useState([]);
  const [playbooksLoading, setPlaybooksLoading] = useState(false);
  const [selectedPlaybookForAlert, setSelectedPlaybookForAlert] = useState(null);
  const [playbookExecutionProgress, setPlaybookExecutionProgress] = useState(null);
  const [alertPlaybooksMap, setAlertPlaybooksMap] = useState({}); // Map alert ID to available playbooks
  const [showAlertRemediation, setShowAlertRemediation] = useState(false);
  const [alertRemediationForm, setAlertRemediationForm] = useState({
    status: 'in_progress',
    notes: '',
    actionsTaken: '',
    evidenceLinks: '',
    controlUpdates: {}
  });
  const [alertSaving, setAlertSaving] = useState(false);
  const selectedAlertRef = useRef(null);
  const showAlertRemediationRef = useRef(false);

  const canEditDataFlow = useMemo(() => {
    if (!backendConnected) return true;
    const role = (currentUser.role || '').toLowerCase();
    if (role === 'admin') return true;
    return userPermissions.some((perm) => {
      const type = (perm.permission_type || '').toLowerCase();
      const resource = (perm.resource_type || '').toLowerCase();
      return ['write', 'manage'].includes(type) && (resource === 'data_flow' || resource === 'all');
    });
  }, [backendConnected, currentUser.role, userPermissions]);

  const canManageDataFlow = useMemo(() => {
    if (!backendConnected) return true;
    const role = (currentUser.role || '').toLowerCase();
    if (role === 'admin') return true;
    return userPermissions.some((perm) => {
      const type = (perm.permission_type || '').toLowerCase();
      const resource = (perm.resource_type || '').toLowerCase();
      return type === 'manage' && (resource === 'data_flow' || resource === 'all');
    });
  }, [backendConnected, currentUser.role, userPermissions]);

  const dataFlowOwners = useMemo(() => {
    const owners = new Set();
    dataFlowNodes.forEach((node) => {
      if (node.owner) owners.add(node.owner);
      if (node.responsible_party) owners.add(node.responsible_party);
    });
    return Array.from(owners).sort();
  }, [dataFlowNodes]);

  const dataFlowSensitivities = useMemo(() => {
    const sensitivities = new Set();
    dataFlowNodes.forEach((node) => {
      if (node.sensitivity) sensitivities.add(node.sensitivity);
    });
    return Array.from(sensitivities).sort();
  }, [dataFlowNodes]);

  const dataFlowNodeTypes = useMemo(() => {
    const types = new Set();
    dataFlowNodes.forEach((node) => {
      if (node.node_type) types.add(node.node_type);
    });
    return Array.from(types).sort();
  }, [dataFlowNodes]);

  const dataFlowNodeAlerts = useMemo(() => {
    const controlIndex = new Map();
    dataFlowNodes.forEach((node) => {
      if (Array.isArray(node.framework_controls)) {
        const nodeId = String(node.id);
        node.framework_controls.forEach((control) => {
          if (!control) return;
          const key = control.toLowerCase();
          if (!controlIndex.has(key)) {
            controlIndex.set(key, new Set());
          }
          controlIndex.get(key).add(nodeId);
        });
      }
    });

    const alertMap = new Map();

    actionableAlerts.forEach((alert) => {
      const severity = (alert.severity || 'medium').toLowerCase();
      const guidanceControls = Array.isArray(alert.remediation_guidance)
        ? alert.remediation_guidance
        : [];

      const relatedControlIds = new Set();
      guidanceControls.forEach((guidance) => {
        if (guidance && guidance.control_id) {
          relatedControlIds.add(guidance.control_id.toLowerCase());
        }
      });
      if (alert.control_id) {
        relatedControlIds.add(alert.control_id.toLowerCase());
      }

      relatedControlIds.forEach((controlId) => {
        const nodeIds = controlIndex.get(controlId);
        if (!nodeIds) return;

        nodeIds.forEach((nodeId) => {
          const entry =
            alertMap.get(String(nodeId)) || {
              alerts: [],
              counts: { critical: 0, high: 0, medium: 0, low: 0 },
            };

          if (!entry.alerts.some((existing) => existing.id === alert.id)) {
            entry.alerts.push(alert);
            if (entry.counts[severity] !== undefined) {
              entry.counts[severity] += 1;
            } else {
              entry.counts.low += 1;
            }
          }

          alertMap.set(String(nodeId), entry);
        });
      });
    });

    return alertMap;
  }, [dataFlowNodes, actionableAlerts]);

  const getControlTokens = useCallback((control) => {
    const tokens = new Set();
    if (!control) return tokens;
    const normalize = (value) => {
      if (value == null) return null;
      return String(value).trim().toUpperCase();
    };
    const addToken = (value) => {
      const normalized = normalize(value);
      if (normalized) {
        tokens.add(normalized);
      }
    };

    addToken(control.id);
    addToken(control.control_id);

    if (Array.isArray(control.frameworks)) {
      control.frameworks.forEach((frameworkTag) => {
        addToken(frameworkTag);
        if (typeof frameworkTag === 'string' && frameworkTag.includes(':')) {
          const [, frameworkControl] = frameworkTag.split(':');
          addToken(frameworkControl);
        }
      });
    }

    if (Array.isArray(control.related_controls)) {
      control.related_controls.forEach(addToken);
    }

    return tokens;
  }, []);

  const alertMatchesControlTokens = useCallback((alert, tokens) => {
    if (!alert || !(tokens instanceof Set) || tokens.size === 0) {
      return false;
    }
    const normalize = (value) => {
      if (value == null) return null;
      return String(value).trim().toUpperCase();
    };

    if (tokens.has(normalize(alert.control_id))) {
      return true;
    }

    if (Array.isArray(alert.remediation_guidance)) {
      const matchesGuidance = alert.remediation_guidance.some((entry) =>
        tokens.has(normalize(entry?.control_id))
      );
      if (matchesGuidance) {
        return true;
      }
    }

    if (Array.isArray(alert.linked_controls)) {
      const matchesLinked = alert.linked_controls.some((entry) =>
        tokens.has(normalize(entry?.id || entry?.control_id))
      );
      if (matchesLinked) {
        return true;
      }
    }

    return false;
  }, []);

  const dataFlowAccessSummary = useMemo(() => {
    const existingNodeIds = new Set(dataFlowNodes.map((node) => String(node.id)));
    const perNode = new Map();
    const privilegedAccounts = new Set();
    const readOnlyAccounts = new Set();
    let totalPermissions = 0;
    let expiringSoon = 0;
    const now = new Date();

    userPermissions.forEach((perm) => {
      const resourceType = (perm.resource_type || '').toLowerCase();
      if (!['data_flow', 'data_flow_node', 'data_flow_edge', 'architecture'].includes(resourceType)) {
        return;
      }

      const normalizedId =
        perm.resource_id !== undefined && perm.resource_id !== null
          ? String(perm.resource_id)
          : null;
      if (normalizedId && !existingNodeIds.has(normalizedId)) {
        return;
      }

      const permissionType = (perm.permission_type || '').toLowerCase();
      const permissionEntry = {
        id: perm.id,
        user: perm.user_email || `User ${perm.user_id}`,
        type: permissionType,
        expiresAt: perm.expires_at || null,
        resourceType: perm.resource_type,
        resourceId: normalizedId,
        grantedBy: perm.granted_by_email || `User ${perm.granted_by}`,
      };

      totalPermissions += 1;

      if (['write', 'manage', 'admin'].includes(permissionType)) {
        if (permissionEntry.user) privilegedAccounts.add(permissionEntry.user);
      } else if (permissionType === 'read' && permissionEntry.user) {
        readOnlyAccounts.add(permissionEntry.user);
      }

      if (permissionEntry.expiresAt) {
        const expires = new Date(permissionEntry.expiresAt);
        const daysUntilExpiry = (expires - now) / (1000 * 60 * 60 * 24);
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
          expiringSoon += 1;
        }
      }

      if (normalizedId) {
        if (!perNode.has(normalizedId)) {
          perNode.set(normalizedId, {
            permissions: [],
            total: 0,
            elevated: 0,
            expiringSoon: 0,
            viewers: new Set(),
          });
        }
        const nodeEntry = perNode.get(normalizedId);
        nodeEntry.permissions.push(permissionEntry);
        nodeEntry.total += 1;
        if (['write', 'manage', 'admin'].includes(permissionType)) {
          nodeEntry.elevated += 1;
        }
        if (permissionEntry.expiresAt) {
          const expires = new Date(permissionEntry.expiresAt);
          const daysUntilExpiry = (expires - now) / (1000 * 60 * 60 * 24);
          if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
            nodeEntry.expiringSoon += 1;
          }
        }
        if (permissionEntry.user) {
          nodeEntry.viewers.add(permissionEntry.user);
        }
      }
    });

    const normalizedPerNode = new Map();
    perNode.forEach((value, key) => {
      normalizedPerNode.set(key, {
        permissions: value.permissions,
        total: value.total,
        elevated: value.elevated,
        expiringSoon: value.expiringSoon,
        viewers: Array.from(value.viewers),
      });
    });

    return {
      perNode: normalizedPerNode,
      totalPermissions,
      expiringSoon,
      privilegedAccounts: Array.from(privilegedAccounts),
      readOnlyAccounts: Array.from(readOnlyAccounts),
    };
  }, [userPermissions, dataFlowNodes]);

  const goldenThreadData = useMemo(() => {
    if (!selectedControl) return null;

    const normalize = (value) => {
      if (value == null) return null;
      return String(value).trim().toUpperCase();
    };

    const controlTokens = getControlTokens(selectedControl);

    const nodeLookup = new Map();
    (Array.isArray(dataFlowNodes) ? dataFlowNodes : []).forEach((node) => {
      nodeLookup.set(node.id, node);
    });

    const relatedNodes = (Array.isArray(dataFlowNodes) ? dataFlowNodes : [])
      .filter((node) => {
        if (!Array.isArray(node.framework_controls) || node.framework_controls.length === 0) {
          return false;
        }
        return node.framework_controls.some((ctrl) => controlTokens.has(normalize(ctrl)));
      })
      .map((node) => {
        const mostRecentChange = Array.isArray(node.change_log) && node.change_log.length > 0
          ? node.change_log[0]
          : null;
        return {
          node,
          id: node.id,
          name: node.name,
          type: node.node_type,
          status: node.integration_status,
          owner: node.responsible_party || node.owner,
          lastSync: node.last_sync_at || node.updated_at || node.last_transfer_at,
          changeSummary: mostRecentChange?.summary,
          changeActor: mostRecentChange?.actor,
          changeAt: mostRecentChange?.timestamp,
          frameworks: node.framework_controls || [],
        };
      });

    const relatedEdges = (Array.isArray(dataFlowEdges) ? dataFlowEdges : [])
      .filter((edge) => {
        if (!Array.isArray(edge.controls_impacted) || edge.controls_impacted.length === 0) {
          return false;
        }
        return edge.controls_impacted.some((ctrl) => controlTokens.has(normalize(ctrl)));
      })
      .map((edge) => {
        const sourceNode = nodeLookup.get(edge.source_node_id);
        const targetNode = nodeLookup.get(edge.target_node_id);
        return {
          edge,
          id: edge.id,
          flowType: edge.flow_type,
          status: edge.status,
          transport: edge.transport,
          sourceName: sourceNode?.name || `Node ${edge.source_node_id}`,
          targetName: targetNode?.name || `Node ${edge.target_node_id}`,
          lastValidatedAt: edge.last_validated_at,
          dailyVolume: edge.daily_volume_gb,
          latencyMs: edge.latency_ms,
        };
      });

    const alertSources = [
      ...(Array.isArray(actionableAlerts) ? actionableAlerts : []),
      ...(Array.isArray(complianceAlerts) ? complianceAlerts : []),
      ...(Array.isArray(patternAlerts) ? patternAlerts : []),
    ];

    const relatedAlerts = [];
    const seenAlertIds = new Set();

    alertSources.forEach((alert) => {
      if (!alert) return;
      const alertId = alert.id ?? alert.alert_id;
      if (alertId != null && seenAlertIds.has(alertId)) {
        return;
      }

      const alertControlToken = normalize(alert.control_id);
      let matches = alertControlToken && controlTokens.has(alertControlToken);

      if (!matches && Array.isArray(alert.remediation_guidance)) {
        matches = alert.remediation_guidance.some((entry) =>
          controlTokens.has(normalize(entry?.control_id))
        );
      }

      if (!matches && Array.isArray(alert.linked_controls)) {
        matches = alert.linked_controls.some((entry) =>
          controlTokens.has(normalize(entry?.id || entry?.control_id))
        );
      }

      if (matches) {
        if (alertId != null) {
          seenAlertIds.add(alertId);
        }
        relatedAlerts.push({
          alert,
          id: alertId,
          title: alert.title,
          severity: alert.severity,
          status: alert.status,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at || alert.resolved_at || alert.acknowledged_at,
          description: alert.description,
          framework: alert.framework,
        });
      }
    });

    relatedAlerts.sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt;
      const bTime = b.updatedAt || b.createdAt;
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;
      return new Date(bTime) - new Date(aTime);
    });

    const responsibilityEntry = Array.isArray(responsibilityMatrix)
      ? responsibilityMatrix.find((entry) => normalize(entry.control_id) === normalize(selectedControl.id))
      : null;

    const automationEntries = Array.isArray(automationActivityLog)
      ? automationActivityLog.filter((entry) => normalize(entry.control_id) === normalize(selectedControl.id))
      : [];

    const evidenceSegments = Array.isArray(selectedControl.api_data_segments)
      ? selectedControl.api_data_segments.length
      : 0;

    return {
      tokens: controlTokens,
      nodes: relatedNodes,
      edges: relatedEdges,
      alerts: relatedAlerts,
      responsibility: responsibilityEntry,
      automation: automationEntries,
      evidenceSegments,
    };
  }, [selectedControl, dataFlowNodes, dataFlowEdges, actionableAlerts, complianceAlerts, patternAlerts, responsibilityMatrix, automationActivityLog, getControlTokens]);

  const dataFlowNodeSignals = useMemo(() => {
    const signals = {};

    dataFlowNodes.forEach((node) => {
      const id = String(node.id);
      signals[id] = {
        alertCount: 0,
        counts: { critical: 0, high: 0, medium: 0, low: 0 },
        alerts: [],
        hasDrift: false,
        evidenceGap: !(Array.isArray(node.evidence_links) && node.evidence_links.length > 0),
        inactive: (node.integration_status || '').toLowerCase() !== 'active',
        access: {
          total: 0,
          elevated: 0,
          expiringSoon: 0,
          viewers: [],
        },
      };
    });

    dataFlowNodeAlerts.forEach((value, key) => {
      if (!value) return;
      const alerts = Array.isArray(value.alerts) ? value.alerts : [];
      const existing =
        signals[String(key)] ||
        {
          alertCount: 0,
          counts: { critical: 0, high: 0, medium: 0, low: 0 },
          alerts: [],
          hasDrift: false,
          evidenceGap: true,
          inactive: true,
        };

      existing.alertCount = alerts.length;
      existing.alerts = alerts;
      existing.counts = {
        critical: value.counts?.critical || 0,
        high: value.counts?.high || 0,
        medium: value.counts?.medium || 0,
        low: value.counts?.low || 0,
      };
      existing.hasDrift = alerts.some(
        (alert) => (alert.alert_type || '').toLowerCase() === 'compliance_drift'
      );
      signals[String(key)] = existing;
    });

    dataFlowAccessSummary.perNode.forEach((value, key) => {
      if (!signals[key]) {
        signals[key] = {
          alertCount: 0,
          counts: { critical: 0, high: 0, medium: 0, low: 0 },
          alerts: [],
          hasDrift: false,
          evidenceGap: true,
          inactive: true,
          access: {
            total: value.total,
            elevated: value.elevated,
            expiringSoon: value.expiringSoon,
            viewers: value.viewers,
          },
        };
        return;
      }
      signals[key].access = {
        total: value.total,
        elevated: value.elevated,
        expiringSoon: value.expiringSoon,
        viewers: value.viewers,
      };
    });

    return signals;
  }, [dataFlowNodes, dataFlowNodeAlerts, dataFlowAccessSummary]);

  const filteredDataFlowNodes = useMemo(() => {
    const searchTerm = dataFlowFilters.search.trim().toLowerCase();
    return dataFlowNodes.filter((node) => {
      const typeMatch = dataFlowFilters.nodeType === 'ALL' || node.node_type === dataFlowFilters.nodeType;
      const sensitivityMatch = dataFlowFilters.sensitivity === 'ALL' || (node.sensitivity || '') === dataFlowFilters.sensitivity;
      const ownerMatch =
        dataFlowFilters.owner === 'ALL' ||
        (node.owner && node.owner === dataFlowFilters.owner) ||
        (node.responsible_party && node.responsible_party === dataFlowFilters.owner);
      const statusMatch = dataFlowFilters.status === 'ALL' || (node.integration_status || '').toLowerCase() === dataFlowFilters.status.toLowerCase();
      const searchMatch =
        !searchTerm ||
        (node.name && node.name.toLowerCase().includes(searchTerm)) ||
        (node.description && node.description.toLowerCase().includes(searchTerm)) ||
        (Array.isArray(node.framework_controls) && node.framework_controls.some((c) => c.toLowerCase().includes(searchTerm)));
      return typeMatch && sensitivityMatch && ownerMatch && statusMatch && searchMatch;
    });
  }, [dataFlowNodes, dataFlowFilters]);

  const filteredDataFlowEdges = useMemo(() => {
    const nodeIds = new Set(filteredDataFlowNodes.map((node) => node.id));
    return dataFlowEdges.filter((edge) => {
      if (!nodeIds.has(edge.source_node_id) || !nodeIds.has(edge.target_node_id)) {
        return false;
      }
      if (dataFlowFilters.status !== 'ALL') {
        return (edge.status || '').toLowerCase() === dataFlowFilters.status.toLowerCase();
      }
      return true;
    });
  }, [dataFlowEdges, filteredDataFlowNodes, dataFlowFilters.status]);

  const dataFlowStats = useMemo(() => {
    const highSensitivity = dataFlowNodes.filter((node) => {
      const sensitivity = (node.sensitivity || '').toUpperCase();
      return sensitivity === 'PII' || sensitivity === 'CUI';
    }).length;
    const plannedConnections = dataFlowEdges.filter((edge) => (edge.status || '').toLowerCase() === 'planned').length;
    const automatedFlows = dataFlowEdges.filter((edge) => edge.automated !== false).length;
    return {
      totalNodes: dataFlowNodes.length,
      totalEdges: dataFlowEdges.length,
      highSensitivity,
      plannedConnections,
      automatedFlows,
    };
  }, [dataFlowNodes, dataFlowEdges]);

  const dataFlowNodeMap = useMemo(() => {
    const map = new Map();
    dataFlowNodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [dataFlowNodes]);

  const dataFlowEdgeMap = useMemo(() => {
    const map = new Map();
    dataFlowEdges.forEach((edge) => {
      map.set(edge.id, edge);
    });
    return map;
  }, [dataFlowEdges]);

  const dataFlowGraphData = useMemo(() => {
    const nodes = filteredDataFlowNodes.map((node) => {
      const layout = node.layout_position || {};
      const x = typeof layout.x === 'number' ? layout.x : undefined;
      const y = typeof layout.y === 'number' ? layout.y : undefined;
      const nodeId = node.id != null ? String(node.id) : '';
      return {
        ...node,
        id: nodeId,
        fx: x,
        fy: y,
        x,
        y,
      };
    });

    const links = filteredDataFlowEdges.map((edge) => {
      const sourceId =
        edge.source_node_id != null ? String(edge.source_node_id) : edge.source != null ? String(edge.source) : '';
      const targetId =
        edge.target_node_id != null ? String(edge.target_node_id) : edge.target != null ? String(edge.target) : '';
      return {
        ...edge,
        id:
          edge.id != null
            ? String(edge.id)
            : `${sourceId}-${targetId}-${edge.flow_type || ''}`,
        source: sourceId,
        target: targetId,
      };
    });

    return { nodes, links };
  }, [filteredDataFlowNodes, filteredDataFlowEdges]);

  const dataFlowHasZoomedRef = useRef(false);

  const persistDataFlowNodePosition = useCallback(
    async (graphNode) => {
      if (!graphNode || !graphNode.id) return;
      const layoutPosition = { x: graphNode.x, y: graphNode.y };
      const nodeId = String(graphNode.id);
      const applyLocalUpdate = () => {
        setDataFlowNodes((prev) =>
          prev.map((node) =>
            String(node.id) === nodeId ? { ...node, layout_position: layoutPosition } : node
          )
        );
        setDataFlowLayoutLastSaved(new Date());
      };
      if (!backendConnected || !currentUser.id) {
        applyLocalUpdate();
        return;
      }
      try {
        setDataFlowLayoutSaving(true);
        await api.updateDataFlowNode(currentUser.id, graphNode.id, { layout_position: layoutPosition });
        applyLocalUpdate();
      } catch (error) {
        console.error('Error saving node position:', error);
        setDataFlowError(error.message || 'Failed to save node position');
      } finally {
        setDataFlowLayoutSaving(false);
      }
    },
    [backendConnected, currentUser.id]
  );

  const resetDataFlowLayout = useCallback(async () => {
    setDataFlowLayoutResetting(true);
    let nodeIds = [];
    setDataFlowNodes((prev) => {
      nodeIds = prev.map((node) => String(node.id));
      return prev.map((node) => ({ ...node, layout_position: null }));
    });

    let saved = false;
    if (!backendConnected || !currentUser.id) {
      saved = true;
    } else if (nodeIds.length > 0) {
      try {
        await Promise.all(
          nodeIds.map((id) =>
            api.updateDataFlowNode(currentUser.id, id, { layout_position: null })
          )
        );
        saved = true;
      } catch (error) {
        console.error('Error resetting layout positions:', error);
        setDataFlowError(error.message || 'Failed to reset layout');
      }
    } else {
      saved = true;
    }

    if (dataFlowGraphRef.current && typeof dataFlowGraphRef.current.graphData === 'function') {
      const graphInstance = dataFlowGraphRef.current;
      const currentGraph = graphInstance.graphData();
      if (currentGraph?.nodes) {
        currentGraph.nodes.forEach((node) => {
          delete node.fx;
          delete node.fy;
        });
      }
      dataFlowHasZoomedRef.current = false;
      graphInstance.d3ReheatSimulation();
      graphInstance.zoomToFit(400, 80);
    }

    if (saved) {
      setDataFlowLayoutLastSaved(new Date());
    }
    setDataFlowLayoutResetting(false);
    setDataFlowLayoutSaving(false);
  }, [backendConnected, currentUser.id]);

  useEffect(() => {
    selectedAlertRef.current = selectedAlert;
  }, [selectedAlert]);

  useEffect(() => {
    showAlertRemediationRef.current = showAlertRemediation;
  }, [showAlertRemediation]);

  // Partner Growth Tracking for QBR
  const [partnerGrowthHistory, setPartnerGrowthHistory] = useState([
    {
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
      quarter: 'Q1',
      overallScore: 62,
      complianceCoverage: 58,
      controlsImplemented: 45,
      gapsClosed: 12,
      frameworksCovered: 3,
      automationProgress: 25
    },
    {
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days ago
      quarter: 'Q1',
      overallScore: 68,
      complianceCoverage: 64,
      controlsImplemented: 52,
      gapsClosed: 18,
      frameworksCovered: 3,
      automationProgress: 35
    },
    {
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      quarter: 'Q2',
      overallScore: 74,
      complianceCoverage: 70,
      controlsImplemented: 58,
      gapsClosed: 24,
      frameworksCovered: 4,
      automationProgress: 48
    },
    {
      date: new Date().toISOString().split('T')[0], // Today
      quarter: 'Q2',
      overallScore: 82,
      complianceCoverage: 78,
      controlsImplemented: 65,
      gapsClosed: 32,
      frameworksCovered: 5,
      automationProgress: 62
    }
  ]);

  useEffect(() => {
    initializeBackend();
  }, []);

  // Load audits when backend is connected or when switching to audits view
  useEffect(() => {
    if (backendConnected && currentUser.id) {
      loadAudits();
      loadCertifications();
    } else if (activeView === 'audits' && !backendConnected) {
      // Demo mode - use empty arrays
      setAudits([]);
      setCertifications([]);
    }
  }, [backendConnected, currentUser.id, activeView]);

  // Also load when switching to audits view
  useEffect(() => {
    if (activeView === 'audits') {
      if (backendConnected && currentUser.id) {
        loadAudits();
        loadCertifications();
      }
    }
  }, [activeView]);

  // Load IAM data
  useEffect(() => {
    if (activeView === 'iam') {
      console.log('IAM view active, loading data...');
      if (currentUser.id) {
        loadIAMData();
      } else {
        // Even without user ID, load demo data for visualization
        console.log('No user ID, loading demo data anyway');
        loadDemoIAMData();
      }
    }
  }, [activeView, backendConnected, currentUser.id]);
  
  // Also ensure demo data loads when view is active and no users exist
  useEffect(() => {
    if (activeView === 'iam' && (!allUsers || allUsers.length === 0) && !backendConnected) {
      console.log('Force loading demo IAM data - no users found');
      loadDemoIAMData();
    }
  }, [activeView, allUsers, backendConnected]);

  // Load CSCA data
  useEffect(() => {
    if (activeView === 'csca') {
      if (backendConnected && currentUser.id) {
        loadCSCAData();
      } else {
        // Initialize with demo data for testing
        loadDemoCSCAData();
      }
    }
  }, [activeView, backendConnected, currentUser.id]);

  // Load Data Flow Architecture data
  useEffect(() => {
    if (activeView === 'architecture') {
      refreshDataFlowGraph();
    }
  }, [activeView, backendConnected, currentUser.id]);

  useEffect(() => {
    if (activeView === 'architecture') {
      dataFlowHasZoomedRef.current = false;
    }
  }, [activeView]);

  useEffect(() => {
    if (
      activeView === 'architecture' &&
      filteredDataFlowNodes.length > 0 &&
      dataFlowGraphRef.current &&
      !dataFlowHasZoomedRef.current
    ) {
      requestAnimationFrame(() => {
        if (dataFlowGraphRef.current) {
          dataFlowGraphRef.current.zoomToFit(400, 80);
          dataFlowHasZoomedRef.current = true;
        }
      });
    }
  }, [activeView, filteredDataFlowNodes.length]);

  const loadDemoCSCAData = () => {
    // Demo security events
    const demoEvents = [
      {
        id: 1,
        event_type: 'threat_detected',
        event_source: 'SIEM',
        source_tool: 'Splunk Enterprise Security',
        severity: 'critical',
        title: 'Malware Detected on Production Server',
        description: 'Advanced persistent threat detected on production web server. Multiple suspicious processes spawned.',
        affected_resources: ['prod-web-01', '10.0.1.45'],
        security_event_data: { threat_type: 'malware', confidence: 'high' },
        detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'open',
        compliance_mappings: [
          { control_id: 'SI-3', framework: 'NIST_800-53', impact_level: 'critical' },
          { control_id: 'SI-4', framework: 'NIST_800-53', impact_level: 'critical' },
          { control_id: 'A.12.4.1', framework: 'ISO27001', impact_level: 'critical' }
        ]
      },
      {
        id: 2,
        event_type: 'vulnerability_found',
        event_source: 'Vulnerability Scanner',
        source_tool: 'Tenable.io',
        severity: 'high',
        title: 'Critical CVE-2024-1234 in Apache Web Server',
        description: 'Remote code execution vulnerability found in Apache httpd version 2.4.55',
        affected_resources: ['prod-web-01', 'prod-web-02'],
        security_event_data: { cve_id: 'CVE-2024-1234', cvss_score: 9.8 },
        detected_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'investigating',
        compliance_mappings: [
          { control_id: 'SI-2', framework: 'NIST_800-53', impact_level: 'high' },
          { control_id: 'RA-5', framework: 'NIST_800-53', impact_level: 'high' },
          { control_id: 'A.12.6.1', framework: 'ISO27001', impact_level: 'high' }
        ]
      },
      {
        id: 3,
        event_type: 'incident',
        event_source: 'EDR',
        source_tool: 'CrowdStrike Falcon',
        severity: 'high',
        title: 'Unauthorized Access Attempt Detected',
        description: 'Multiple failed login attempts from external IP followed by successful authentication',
        affected_resources: ['vpn-gateway-01'],
        security_event_data: { incident_type: 'unauthorized_access', attempts: 47 },
        detected_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        status: 'resolved',
        compliance_mappings: [
          { control_id: 'IR-1', framework: 'NIST_800-53', impact_level: 'high' },
          { control_id: 'IR-4', framework: 'NIST_800-53', impact_level: 'high' },
          { control_id: 'A.16.1.1', framework: 'ISO27001', impact_level: 'high' }
        ]
      },
      {
        id: 4,
        event_type: 'policy_violation',
        event_source: 'CSPM',
        source_tool: 'AWS Security Hub',
        severity: 'medium',
        title: 'S3 Bucket Publicly Accessible',
        description: 'S3 bucket found to be publicly accessible, violating data protection policy',
        affected_resources: ['s3://customer-data-backup'],
        security_event_data: { resource_type: 's3_bucket', contains_pii: true },
        detected_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'open',
        compliance_mappings: [
          { control_id: 'AC-1', framework: 'NIST_800-53', impact_level: 'medium' },
          { control_id: 'AC-4', framework: 'NIST_800-53', impact_level: 'medium' }
        ]
      },
      {
        id: 5,
        event_type: 'configuration_change',
        event_source: 'CSPM',
        source_tool: 'Azure Security Center',
        severity: 'low',
        title: 'Security Group Rule Modified',
        description: 'Network security group rule allowing inbound traffic from 0.0.0.0/0 was added',
        affected_resources: ['nsg-prod-web'],
        security_event_data: { change_type: 'security_group_rule_added' },
        detected_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'open',
        compliance_mappings: [
          { control_id: 'CM-2', framework: 'NIST_800-53', impact_level: 'low' },
          { control_id: 'CM-3', framework: 'NIST_800-53', impact_level: 'low' }
        ]
      }
    ];

    // Demo compliance score history (30 days)
    const demoHistory = [];
    const frameworks = ['NIST_800-53', 'ISO27001', 'SOC2', 'CIS'];
    const now = Date.now();
    
    frameworks.forEach(framework => {
      let baseScore = 85;
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        // Simulate score variations
        const variation = Math.random() * 5 - 2.5; // ±2.5 points
        const eventImpact = i % 7 === 0 ? Math.floor(Math.random() * 5) : 0; // Random impact every 7 days
        const score = Math.max(70, Math.min(100, baseScore + variation - eventImpact));
        baseScore = score;
        
        demoHistory.push({
          id: `${framework}-${i}`,
          user_id: 1,
          framework: framework,
          overall_score: Math.round(score),
          controls_implemented: Math.round(score * 0.8),
          controls_total: 100,
          gaps_count: Math.round(100 - score),
          security_event_impact: eventImpact,
          calculated_at: date.toISOString()
        });
      }
    });

    // Demo compliance alerts
    const demoAlerts = [
      {
        id: 1,
        user_id: 1,
        alert_type: 'compliance_degradation',
        severity: 'high',
        title: 'Compliance Score Degraded: NIST_800-53',
        description: 'Security event caused 8 point drop in NIST_800-53 compliance score. 3 controls affected.',
        security_event_id: 1,
        framework: 'NIST_800-53',
        compliance_score_before: 85,
        compliance_score_after: 77,
        acknowledged: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        user_id: 1,
        alert_type: 'compliance_degradation',
        severity: 'medium',
        title: 'Compliance Score Degraded: ISO27001',
        description: 'Security event caused 5 point drop in ISO27001 compliance score. 2 controls affected.',
        security_event_id: 2,
        framework: 'ISO27001',
        compliance_score_before: 88,
        compliance_score_after: 83,
        acknowledged: false,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Demo correlation data
    const demoCorrelation = {
      security_events: [
        { event_type: 'threat_detected', severity: 'critical', event_count: 2, avg_impact: -8.5 },
        { event_type: 'vulnerability_found', severity: 'high', event_count: 1, avg_impact: -5.0 },
        { event_type: 'incident', severity: 'high', event_count: 1, avg_impact: -5.0 },
        { event_type: 'policy_violation', severity: 'medium', event_count: 1, avg_impact: -2.0 },
        { event_type: 'configuration_change', severity: 'low', event_count: 1, avg_impact: -1.0 }
      ],
      compliance_trends: demoHistory,
      correlation_score: 0.72
    };

    // Demo patterns
    const demoPatterns = [
      {
        id: 1,
        pattern_name: 'Recurring Threat Detected Events',
        pattern_type: 'recurring_event',
        pattern_description: '3 occurrences of threat_detected events in the last 30 days',
        confidence_score: 0.75,
        severity: 'high',
        occurrence_count: 3,
        trend_direction: 'increasing',
        trend_percentage: 25.0,
        last_detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        first_detected_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        pattern_name: 'Event Spike Detected on Production',
        pattern_type: 'spike_detection',
        pattern_description: '5 events detected on Nov 4 (2.5x average daily rate)',
        confidence_score: 0.85,
        severity: 'high',
        occurrence_count: 5,
        trend_direction: 'increasing',
        trend_percentage: 150.0,
        last_detected_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        first_detected_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        pattern_name: 'Recurring Issues from Splunk Enterprise Security',
        pattern_type: 'correlation_pattern',
        pattern_description: '4 security events originated from Splunk Enterprise Security',
        confidence_score: 0.70,
        severity: 'medium',
        occurrence_count: 4,
        trend_direction: 'stable',
        trend_percentage: 0.0,
        last_detected_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        first_detected_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Demo pattern alerts
    const demoPatternAlerts = [
      {
        id: 1,
        pattern_id: 1,
        alert_type: 'pattern_detected',
        severity: 'high',
        title: 'New Pattern Detected: Recurring Threat Detected Events',
        description: '3 occurrences of threat_detected events in the last 30 days',
        pattern_trend_data: {
          trend_direction: 'increasing',
          trend_percentage: 25.0,
          confidence_score: 0.75
        },
        acknowledged: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        pattern_id: 2,
        alert_type: 'pattern_spike',
        severity: 'high',
        title: 'New Pattern Detected: Event Spike Detected on Production',
        description: '5 events detected on Nov 4 (2.5x average daily rate)',
        pattern_trend_data: {
          trend_direction: 'increasing',
          trend_percentage: 150.0,
          confidence_score: 0.85
        },
        acknowledged: false,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Demo pattern trends
    const demoPatternTrends = {
      pattern_statistics: [
        {
          pattern_type: 'recurring_event',
          pattern_count: 2,
          avg_confidence: 0.725,
          avg_occurrences: 3.5,
          increasing_trends: 2,
          decreasing_trends: 0
        },
        {
          pattern_type: 'spike_detection',
          pattern_count: 1,
          avg_confidence: 0.85,
          avg_occurrences: 5.0,
          increasing_trends: 1,
          decreasing_trends: 0
        },
        {
          pattern_type: 'correlation_pattern',
          pattern_count: 1,
          avg_confidence: 0.70,
          avg_occurrences: 4.0,
          increasing_trends: 0,
          decreasing_trends: 0
        }
      ],
      unacknowledged_alerts: 2,
      lookback_days: 30
    };

    setSecurityEvents(demoEvents);
    setComplianceScoreHistory(demoHistory);
    setComplianceAlerts(demoAlerts);
    setSecurityComplianceCorrelation(demoCorrelation);
    setDetectedPatterns(demoPatterns);
    setPatternAlerts(demoPatternAlerts);
    setPatternTrends(demoPatternTrends);
  };

  const loadCSCAData = async () => {
    if (!backendConnected || !currentUser.id) {
      console.log('CSCA: Backend not connected or no user ID');
      return;
    }
    
    try {
      console.log('CSCA: Loading data for user:', currentUser.id);
      const [events, history, alerts, correlation, patterns, pAlerts, trends] = await Promise.all([
        api.getSecurityEvents({ limit: 50 }, currentUser.id).catch((err) => {
          console.error('CSCA: Error fetching events:', err);
          return [];
        }),
        api.getComplianceScoreHistory(null, 30, currentUser.id).catch((err) => {
          console.error('CSCA: Error fetching history:', err);
          return [];
        }),
        api.getComplianceAlerts({ acknowledged: false, limit: 20 }, currentUser.id).catch((err) => {
          console.error('CSCA: Error fetching alerts:', err);
          return [];
        }),
        api.getSecurityComplianceCorrelation(30, currentUser.id).catch((err) => {
          console.error('CSCA: Error fetching correlation:', err);
          return null;
        }),
        api.getPatterns(currentUser.id, 'active').catch((err) => {
          console.error('CSCA: Error fetching patterns:', err);
          return [];
        }),
        api.getPatternAlerts(currentUser.id, { acknowledged: false, limit: 20 }).catch((err) => {
          console.error('CSCA: Error fetching pattern alerts:', err);
          return [];
        }),
        api.getPatternTrends(currentUser.id, 30).catch((err) => {
          console.error('CSCA: Error fetching pattern trends:', err);
          return null;
        })
      ]);
      
      console.log('CSCA: Data loaded', { 
        events: events.length, 
        history: history.length, 
        alerts: alerts.length,
        patterns: patterns.length,
        patternAlerts: pAlerts.length
      });
      setSecurityEvents(events || []);
      setComplianceScoreHistory(history || []);
      setComplianceAlerts(alerts || []);
      setSecurityComplianceCorrelation(correlation);
      setDetectedPatterns(patterns || []);
      setPatternAlerts(pAlerts || []);
      setPatternTrends(trends);
    } catch (error) {
      console.error('CSCA: Error loading data:', error);
      // Set empty arrays on error to ensure page renders
      setSecurityEvents([]);
      setComplianceScoreHistory([]);
      setComplianceAlerts([]);
      setSecurityComplianceCorrelation(null);
      setDetectedPatterns([]);
      setPatternAlerts([]);
      setPatternTrends(null);
    }
  };

  const runPatternDetection = async () => {
    if (!backendConnected || !currentUser.id) {
      alert('Backend not connected');
      return;
    }
    
    setPatternDetectionRunning(true);
    try {
      const result = await api.detectPatterns(currentUser.id, 30);
      alert(`Pattern detection complete! Found ${result.patterns_detected} patterns.`);
      await loadCSCAData(); // Reload to get new patterns
    } catch (error) {
      console.error('Error detecting patterns:', error);
      alert('Error detecting patterns: ' + (error.message || error));
    } finally {
      setPatternDetectionRunning(false);
    }
  };

  // Load framework growth metrics for dashboard
  const loadFrameworkGrowth = async () => {
    if (!backendConnected || !currentUser.id) {
      // Demo data
      const demoGrowth = {
        'NIST_800-53': {
          framework: 'NIST_800-53',
          current_score: 82.5,
          risk_adjusted_score: 80.2,
          growth_rate: 12.5,
          score_velocity: 0.8,
          trend_direction: 'improving',
          controls_implemented: 65,
          controls_total: 80,
          gaps_count: 15,
          control_coverage: 81.3,
          evidence_coverage: 75.0,
          drift_detected: false,
          drift_percentage: 0,
          trend_data: []
        },
        'ISO27001': {
          framework: 'ISO27001',
          current_score: 78.2,
          risk_adjusted_score: 76.5,
          growth_rate: 8.3,
          score_velocity: 0.5,
          trend_direction: 'improving',
          controls_implemented: 58,
          controls_total: 75,
          gaps_count: 17,
          control_coverage: 77.3,
          evidence_coverage: 70.0,
          drift_detected: false,
          drift_percentage: 0,
          trend_data: []
        },
        'SOC2': {
          framework: 'SOC2',
          current_score: 85.0,
          risk_adjusted_score: 83.5,
          growth_rate: 15.2,
          score_velocity: 1.2,
          trend_direction: 'improving',
          controls_implemented: 68,
          controls_total: 80,
          gaps_count: 12,
          control_coverage: 85.0,
          evidence_coverage: 80.0,
          drift_detected: false,
          drift_percentage: 0,
          trend_data: []
        },
        'CIS': {
          framework: 'CIS',
          current_score: 75.5,
          risk_adjusted_score: 73.8,
          growth_rate: 5.8,
          score_velocity: 0.3,
          trend_direction: 'stable',
          controls_implemented: 45,
          controls_total: 60,
          gaps_count: 15,
          control_coverage: 75.0,
          evidence_coverage: 68.0,
          drift_detected: false,
          drift_percentage: 0,
          trend_data: []
        },
        'NIST_800-171': {
          framework: 'NIST_800-171',
          current_score: 70.0,
          risk_adjusted_score: 68.5,
          growth_rate: 2.5,
          score_velocity: 0.2,
          trend_direction: 'stable',
          controls_implemented: 42,
          controls_total: 60,
          gaps_count: 18,
          control_coverage: 70.0,
          evidence_coverage: 65.0,
          drift_detected: false,
          drift_percentage: 0,
          trend_data: []
        }
      };
      setFrameworkGrowth(demoGrowth);
      return;
    }

    try {
      const growthData = await api.getAllFrameworksGrowth(currentUser.id, 30);
      setFrameworkGrowth(growthData || {});
    } catch (error) {
      console.error('Error loading framework growth:', error);
    }
  };

  // Load actionable alerts
  const loadActionableAlerts = async () => {
    if (!backendConnected || !currentUser.id) {
      // Demo data
      const demoAlerts = [
        {
          id: 1,
          alert_type: 'compliance_drift',
          severity: 'high',
          title: 'Compliance Drift Detected: NIST_800-53 Score decreased',
          description: 'Compliance score for NIST_800-53 has decreased by 8.2% (from 85.0 to 78.0). 12 controls require attention.',
          framework: 'NIST_800-53',
          compliance_score_before: 85.0,
          compliance_score_after: 78.0,
          acknowledged: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          remediation_guidance: [
            {
              control_id: 'AC-001',
              control_name: 'Access Control Policy',
              category: 'Access Control',
              priority: 'Critical',
              status: 'Non-Compliant',
              remediation_steps: [
                { step: 1, action: 'Assess Current State', estimated_time: '30 minutes' },
                { step: 2, action: 'Identify Gaps', estimated_time: '1 hour' },
                { step: 3, action: 'Implement Remediation', estimated_time: '4-8 hours' },
                { step: 4, action: 'Validate & Document', estimated_time: '1 hour' }
              ]
            }
          ]
        }
      ];
      setActionableAlerts(demoAlerts);
      return;
    }

    try {
      const alerts = await api.getActionableAlerts(currentUser.id, 10);
      setActionableAlerts(alerts || []);
      if (selectedAlert) {
        const updatedSelected = (alerts || []).find((alert) => alert.id === selectedAlert.id);
        if (updatedSelected) {
          setSelectedAlert(updatedSelected);
        } else if (showAlertRemediation) {
          setShowAlertRemediation(false);
          setSelectedAlert(null);
        }
      }
    } catch (error) {
      console.error('Error loading actionable alerts:', error);
    }
  };
  const runDriftCheckCommand = async () => {
    if (!backendConnected || !currentUser.id) {
      alert('Connect the backend API to run an automated drift check.');
      return;
    }
    try {
      await api.checkComplianceDrift(currentUser.id);
      await loadActionableAlerts();
    } catch (error) {
      console.error('Error running drift check:', error);
      const message = error?.detail || error?.message || (error instanceof Error ? error.message : String(error));
      alert(`Unable to run drift check: ${message}`);
    }
  };
  const getDemoDataFlowGraph = () => {
    const now = new Date();
    const daysAgo = (days) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d.toISOString();
    };

    const demoNodes = [
      {
        id: 1,
        node_type: 'source',
        name: 'AWS CloudTrail',
        description: 'Centralized audit logs ingested from all AWS accounts.',
        sensitivity: 'Internal',
        data_domains: ['Audit Logs'],
        classification_tags: ['LOGS', 'CLOUD'],
        owner: 'Cloud Security',
        responsible_party: 'Security Operations',
        framework_controls: ['AC-2', 'AU-6', 'AU-12'],
        evidence_links: ['https://demo.aws/cloudtrail'],
        integration_status: 'active',
        last_sync_at: daysAgo(0),
        sync_frequency: 'Real-time',
        system_of_record: true,
        created_at: daysAgo(420),
        updated_at: daysAgo(12),
        last_adjusted_by: 'Alex Romero',
        change_log: [
          {
            timestamp: daysAgo(12),
            summary: 'Enabled new CloudTrail Lake channel for GovCloud accounts.',
            actor: 'Alex Romero'
          },
          {
            timestamp: daysAgo(60),
            summary: 'Increased retention from 365 to 730 days.',
            actor: 'Jamie Chen'
          }
        ],
        metadata: { platform: 'AWS', accountCount: 8 },
        layout_position: { x: 180, y: 120 }
      },
      {
        id: 2,
        node_type: 'source',
        name: 'Okta Identity Logs',
        description: 'Authentication and user lifecycle events.',
        sensitivity: 'PII',
        data_domains: ['Identity Events'],
        classification_tags: ['IAM', 'IDENTITY'],
        owner: 'Identity Engineering',
        responsible_party: 'Security Operations',
        framework_controls: ['IA-2', 'AC-3'],
        evidence_links: ['https://okta.demo.com/events'],
        integration_status: 'active',
        last_sync_at: daysAgo(0),
        sync_frequency: '5 min',
        system_of_record: false,
        created_at: daysAgo(365),
        updated_at: daysAgo(6),
        last_adjusted_by: 'Priya Desai',
        change_log: [
          {
            timestamp: daysAgo(6),
            summary: 'Added MFA challenge telemetry for privileged apps.',
            actor: 'Priya Desai'
          }
        ],
        metadata: { platform: 'Okta', fishyLoginsLast24h: 3 },
        layout_position: { x: 160, y: 260 }
      },
      {
        id: 3,
        node_type: 'processor',
        name: 'Splunk Enterprise',
        description: 'Security analytics platform correlating events in real-time.',
        sensitivity: 'Internal',
        data_domains: ['Security Events'],
        classification_tags: ['SIEM', 'SECURITY'],
        owner: 'Security Operations',
        responsible_party: 'Security Operations',
        framework_controls: ['SI-4', 'IR-4'],
        evidence_links: ['https://demo.splunk/dashboard'],
        integration_status: 'active',
        system_of_record: false,
        created_at: daysAgo(530),
        updated_at: daysAgo(2),
        last_adjusted_by: 'Morgan Ellis',
        change_log: [
          {
            timestamp: daysAgo(2),
            summary: 'Deployed playbook to auto-tag suspected exfiltration events.',
            actor: 'Morgan Ellis'
          }
        ],
        metadata: { environment: 'Production', ingestionRateGbDay: 1.9 },
        layout_position: { x: 420, y: 140 }
      },
      {
        id: 4,
        node_type: 'processor',
        name: 'Automation Orchestrator',
        description: 'Runs evidence collection and drift remediation playbooks.',
        sensitivity: 'Internal',
        data_domains: ['Automation Jobs'],
        classification_tags: ['AUTOMATION', 'ORCHESTRATION'],
        owner: 'Platform Engineering',
        responsible_party: 'Automation Squad',
        framework_controls: ['IR-4', 'CA-7'],
        integration_status: 'active',
        created_at: daysAgo(210),
        updated_at: daysAgo(4),
        last_adjusted_by: 'Morgan Ellis',
        change_log: [
          {
            timestamp: daysAgo(4),
            summary: 'Released new remediation flow for CIS 1.4 misconfigurations.',
            actor: 'Morgan Ellis'
          },
          {
            timestamp: daysAgo(28),
            summary: 'Connected to Azure Policy to auto-open change tickets.',
            actor: 'Taylor Rivers'
          }
        ],
        framework_controls: ['IR-4', 'CA-7', 'SI-2'],
        metadata: { runbooks: 18, lastRunbook: 'CIS-LINUX-SSH-0004' },
        layout_position: { x: 440, y: 260 }
      },
      {
        id: 5,
        node_type: 'analytics',
        name: 'Compliance Engine',
        description: 'Maps security events and evidence to framework controls.',
        sensitivity: 'Internal',
        data_domains: ['Compliance Metrics'],
        owner: 'GRC Team',
        responsible_party: 'Compliance',
        framework_controls: ['CA-7', 'PM-6', 'AU-11'],
        integration_status: 'active',
        system_of_record: false,
        created_at: daysAgo(480),
        updated_at: daysAgo(1),
        last_adjusted_by: 'Riley Stone',
        change_log: [
          {
            timestamp: daysAgo(1),
            summary: 'Added FedRAMP Moderate mappings for identity events.',
            actor: 'Riley Stone'
          }
        ],
        metadata: { coveragePercent: 78 },
        layout_position: { x: 650, y: 180 }
      },
      {
        id: 6,
        node_type: 'storage',
        name: 'Evidence Vault',
        description: 'Immutable storage for audit evidence with retention policy.',
        sensitivity: 'Confidential',
        data_domains: ['Audit Evidence'],
        owner: 'Compliance',
        responsible_party: 'Security Operations',
        framework_controls: ['CM-8', 'AU-11'],
        evidence_links: ['https://vault.demo.com/controls'],
        integration_status: 'active',
        system_of_record: true,
        created_at: daysAgo(600),
        updated_at: daysAgo(9),
        last_adjusted_by: 'Jordan Lee',
        change_log: [
          {
            timestamp: daysAgo(9),
            summary: 'Enabled write-once retention and legal hold.',
            actor: 'Jordan Lee'
          }
        ],
        metadata: { retentionYears: 7 },
        layout_position: { x: 660, y: 320 }
      },
      {
        id: 7,
        node_type: 'analytics',
        name: 'Risk AI Engine',
        description: 'Calculates residual risk and predicts drift likelihood.',
        sensitivity: 'Internal',
        data_domains: ['Risk Scores'],
        owner: 'Risk Management',
        responsible_party: 'Data Science',
        framework_controls: ['RA-3', 'PM-9'],
        integration_status: 'planned',
        created_at: daysAgo(60),
        updated_at: daysAgo(7),
        last_adjusted_by: 'Leah Patel',
        change_log: [
          {
            timestamp: daysAgo(7),
            summary: 'Training dataset refreshed with 30-day drift outcomes.',
            actor: 'Leah Patel'
          }
        ],
        metadata: { modelVersion: 'v0.9-beta' },
        layout_position: { x: 820, y: 120 }
      },
      {
        id: 8,
        node_type: 'report',
        name: 'Executive Dashboard',
        description: 'Cohesive compliance + security view for leadership.',
        sensitivity: 'Internal',
        owner: 'Leadership',
        responsible_party: 'Compliance',
        integration_status: 'planned',
        created_at: daysAgo(30),
        updated_at: daysAgo(3),
        last_adjusted_by: 'Taylor Rivers',
        change_log: [
          {
            timestamp: daysAgo(3),
            summary: 'Added drift recovery timeline widget.',
            actor: 'Taylor Rivers'
          }
        ],
        metadata: { releaseTarget: 'Q1 2026' },
        layout_position: { x: 860, y: 240 }
      },
      {
        id: 9,
        node_type: 'report',
        name: 'Auditor Portal',
        description: 'Read-only evidence and control traceability workspace.',
        sensitivity: 'Confidential',
        owner: 'Compliance',
        responsible_party: 'Audit Readiness',
        integration_status: 'active',
        created_at: daysAgo(120),
        updated_at: daysAgo(15),
        last_adjusted_by: 'Jordan Lee',
        change_log: [
          {
            timestamp: daysAgo(15),
            summary: 'Configured SOC Type II evidence access for Deloitte.',
            actor: 'Jordan Lee'
          }
        ],
        framework_controls: ['AU-11', 'CA-7'],
        metadata: { externalAuditors: ['Deloitte'], readOnlyUsers: 7 },
        layout_position: { x: 900, y: 360 }
      }
    ];

    const demoEdges = [
      {
        id: 11,
        source_node_id: 1,
        target_node_id: 3,
        flow_type: 'ingest',
        transport: 'API',
        encryption_status: 'Encrypted in transit',
        status: 'active',
        automated: true,
        controls_impacted: ['AU-6', 'AU-12'],
        metadata: { connector: 'Lambda' },
        first_seen_at: daysAgo(420),
        last_validated_at: daysAgo(2),
        last_transfer_at: daysAgo(0),
        daily_volume_gb: 1.2,
        peak_volume_gb: 2.1,
        latency_ms: 380,
        particle_count: 2,
        change_log: [
          {
            timestamp: daysAgo(2),
            summary: 'Validation succeeded after API credential rotation.',
            actor: 'Alex Romero'
          }
        ],
        sample_payloads: ['CloudTrail.CreateUser', 'CloudTrail.StopLogging']
      },
      {
        id: 12,
        source_node_id: 2,
        target_node_id: 3,
        flow_type: 'ingest',
        transport: 'API',
        encryption_status: 'Encrypted in transit',
        status: 'active',
        automated: true,
        controls_impacted: ['IA-2', 'AC-3'],
        first_seen_at: daysAgo(360),
        last_validated_at: daysAgo(1),
        last_transfer_at: daysAgo(0),
        daily_volume_gb: 0.5,
        peak_volume_gb: 0.8,
        latency_ms: 220,
        particle_count: 1,
        change_log: [
          {
            timestamp: daysAgo(6),
            summary: 'Added MFA failure events to stream.',
            actor: 'Priya Desai'
          }
        ],
        sample_payloads: ['Okta.LoginFailure', 'Okta.UserSuspended']
      },
      {
        id: 13,
        source_node_id: 3,
        target_node_id: 5,
        flow_type: 'transform',
        transport: 'API',
        encryption_status: 'Encrypted in transit',
        status: 'active',
        automated: true,
        controls_impacted: ['SI-4', 'CA-7', 'PM-6'],
        first_seen_at: daysAgo(480),
        last_validated_at: daysAgo(1),
        last_transfer_at: daysAgo(0),
        daily_volume_gb: 0.9,
        peak_volume_gb: 1.4,
        latency_ms: 540,
        particle_count: 2,
        change_log: [
          {
            timestamp: daysAgo(1),
            summary: 'Mapped new anomaly detections to CIS v8 Section 4.',
            actor: 'Riley Stone'
          }
        ],
        sample_payloads: ['Derived.Alert#1294', 'Anomaly.HighRiskLogin']
      },
      {
        id: 14,
        source_node_id: 4,
        target_node_id: 6,
        flow_type: 'transform',
        transport: 'API',
        encryption_status: 'Encrypted in transit',
        status: 'active',
        automated: true,
        controls_impacted: ['IR-4', 'AU-11'],
        first_seen_at: daysAgo(210),
        last_validated_at: daysAgo(3),
        last_transfer_at: daysAgo(0),
        daily_volume_gb: 0.35,
        peak_volume_gb: 0.6,
        latency_ms: 420,
        particle_count: 1,
        change_log: [
          {
            timestamp: daysAgo(3),
            summary: 'Automation job archived 42 drift remediation evidence files.',
            actor: 'Morgan Ellis'
          }
        ],
        sample_payloads: ['Playbook.EvidencePackage#987']
      },
      {
        id: 15,
        source_node_id: 5,
        target_node_id: 7,
        flow_type: 'transform',
        transport: 'Streaming',
        encryption_status: 'Encrypted in transit',
        status: 'planned',
        automated: false,
        controls_impacted: ['RA-3', 'PM-9'],
        first_seen_at: daysAgo(30),
        last_validated_at: null,
        last_transfer_at: null,
        daily_volume_gb: 0.2,
        peak_volume_gb: 0.2,
        latency_ms: 800,
        particle_count: 1,
        change_log: [
          {
            timestamp: daysAgo(7),
            summary: 'Integration pending security review.',
            actor: 'Leah Patel'
          }
        ],
        sample_payloads: []
      },
      {
        id: 16,
        source_node_id: 5,
        target_node_id: 8,
        flow_type: 'export',
        transport: 'API',
        encryption_status: 'Encrypted in transit',
        status: 'planned',
        automated: true,
        controls_impacted: ['PM-3', 'CA-7'],
        first_seen_at: daysAgo(30),
        last_validated_at: null,
        last_transfer_at: null,
        daily_volume_gb: 0.1,
        peak_volume_gb: 0.2,
        latency_ms: 620,
        particle_count: 1,
        change_log: [
          {
            timestamp: daysAgo(3),
            summary: 'Dashboard schema aligned with leadership OKRs.',
            actor: 'Taylor Rivers'
          }
        ],
        sample_payloads: []
      },
      {
        id: 17,
        source_node_id: 6,
        target_node_id: 9,
        flow_type: 'export',
        transport: 'S3 Signed URL',
        encryption_status: 'Encrypted at rest',
        status: 'active',
        automated: false,
        controls_impacted: ['AU-11'],
        first_seen_at: daysAgo(90),
        last_validated_at: daysAgo(10),
        last_transfer_at: daysAgo(5),
        daily_volume_gb: 0.05,
        peak_volume_gb: 0.08,
        latency_ms: 900,
        particle_count: 1,
        change_log: [
          {
            timestamp: daysAgo(10),
            summary: 'Auditor access rotated for SOC II evidence package.',
            actor: 'Jordan Lee'
          }
        ],
        sample_payloads: ['Evidence.Zip#SOC2-FY25']
      }
    ];

    return { nodes: demoNodes, edges: demoEdges };
  };

  const loadDataFlowGraph = async () => {
    if (!backendConnected || !currentUser.id) {
      const demoGraph = getDemoDataFlowGraph();
      setDataFlowNodes(demoGraph.nodes);
      setDataFlowEdges(demoGraph.edges);
      setDataFlowAudit([]);
      return;
    }
    setDataFlowLoading(true);
    setDataFlowError(null);
    try {
      const graph = await api.getDataFlowGraph(currentUser.id);
      setDataFlowNodes(Array.isArray(graph?.nodes) ? graph.nodes : []);
      setDataFlowEdges(Array.isArray(graph?.edges) ? graph.edges : []);
    } catch (error) {
      console.error('Error loading data flow graph:', error);
      setDataFlowError(error.message || 'Failed to load data flow graph');
    } finally {
      setDataFlowLoading(false);
    }
  };

  const loadDataFlowAudit = async () => {
    if (!backendConnected || !currentUser.id) {
      setDataFlowAudit([]);
      return;
    }
    try {
      const audit = await api.getDataFlowAudit(currentUser.id, 25);
      setDataFlowAudit(audit || []);
    } catch (error) {
      console.error('Error loading data flow audit log:', error);
    }
  };

  const refreshDataFlowGraph = async () => {
    await Promise.all([loadDataFlowGraph(), loadDataFlowAudit()]);
  };

  const resetDataFlowNodeForm = (overrides = {}) => {
    setDataFlowNodeForm({
      node_type: 'source',
      name: '',
      description: '',
      sensitivity: 'Internal',
      data_domains: '',
      classification_tags: '',
      owner: '',
      responsible_party: '',
      framework_controls: '',
      evidence_links: '',
      integration_status: 'active',
      last_sync_at: '',
      sync_frequency: '',
      system_of_record: false,
      ...overrides
    });
  };

  const resetDataFlowEdgeForm = (overrides = {}) => {
    setDataFlowEdgeForm({
      source_node_id: '',
      target_node_id: '',
      flow_type: 'ingest',
      transport: '',
      encryption_status: '',
      retention_policy: '',
      latency: '',
      volume: '',
      status: 'active',
      automated: true,
      controls_impacted: '',
      last_validated_at: '',
      ...overrides
    });
  };

  const parseListInput = (value) => {
    if (!value || typeof value !== 'string') return [];
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const handleSubmitDataFlowNode = async (event) => {
    event.preventDefault();
    const payload = {
      node_type: dataFlowNodeForm.node_type,
      name: dataFlowNodeForm.name,
      description: dataFlowNodeForm.description,
      sensitivity: dataFlowNodeForm.sensitivity,
      data_domains: parseListInput(dataFlowNodeForm.data_domains),
      classification_tags: parseListInput(dataFlowNodeForm.classification_tags),
      owner: dataFlowNodeForm.owner,
      responsible_party: dataFlowNodeForm.responsible_party,
      framework_controls: parseListInput(dataFlowNodeForm.framework_controls),
      evidence_links: parseListInput(dataFlowNodeForm.evidence_links),
      integration_status: dataFlowNodeForm.integration_status,
      last_sync_at: dataFlowNodeForm.last_sync_at || null,
      sync_frequency: dataFlowNodeForm.sync_frequency,
      system_of_record: Boolean(dataFlowNodeForm.system_of_record),
    };

    try {
      if (!backendConnected || !currentUser.id) {
        // Demo mode adjustments
        if (editingDataFlowNode) {
          setDataFlowNodes((prev) =>
            prev.map((node) =>
              node.id === editingDataFlowNode.id ? { ...node, ...payload } : node
            )
          );
        } else {
          const nextId = Math.max(0, ...dataFlowNodes.map((n) => n.id || 0)) + 1;
          setDataFlowNodes((prev) => [...prev, { id: nextId, ...payload }]);
        }
      } else if (editingDataFlowNode) {
        await api.updateDataFlowNode(currentUser.id, editingDataFlowNode.id, payload);
        await refreshDataFlowGraph();
      } else {
        await api.createDataFlowNode(currentUser.id, payload);
        await refreshDataFlowGraph();
      }
      closeDataFlowNodeModal();
      resetDataFlowNodeForm();
    } catch (error) {
      console.error('Error saving data flow node:', error);
      setDataFlowError(error.message || 'Failed to save data flow node');
    }
  };

  const handleSubmitDataFlowEdge = async (event) => {
    event.preventDefault();
    const payload = {
      source_node_id: Number(dataFlowEdgeForm.source_node_id),
      target_node_id: Number(dataFlowEdgeForm.target_node_id),
      flow_type: dataFlowEdgeForm.flow_type,
      transport: dataFlowEdgeForm.transport,
      encryption_status: dataFlowEdgeForm.encryption_status,
      retention_policy: dataFlowEdgeForm.retention_policy,
      latency: dataFlowEdgeForm.latency,
      volume: dataFlowEdgeForm.volume,
      status: dataFlowEdgeForm.status,
      automated: Boolean(dataFlowEdgeForm.automated),
      controls_impacted: parseListInput(dataFlowEdgeForm.controls_impacted),
      last_validated_at: dataFlowEdgeForm.last_validated_at || null,
    };

    try {
      if (!backendConnected || !currentUser.id) {
        if (editingDataFlowEdge) {
          setDataFlowEdges((prev) =>
            prev.map((edge) =>
              edge.id === editingDataFlowEdge.id ? { ...edge, ...payload } : edge
            )
          );
        } else {
          const nextId = Math.max(0, ...dataFlowEdges.map((e) => e.id || 0)) + 1;
          setDataFlowEdges((prev) => [...prev, { id: nextId, ...payload }]);
        }
      } else if (editingDataFlowEdge) {
        await api.updateDataFlowEdge(currentUser.id, editingDataFlowEdge.id, payload);
        await refreshDataFlowGraph();
      } else {
        await api.createDataFlowEdge(currentUser.id, payload);
        await refreshDataFlowGraph();
      }
      closeDataFlowEdgeModal();
      resetDataFlowEdgeForm();
    } catch (error) {
      console.error('Error saving data flow edge:', error);
      setDataFlowError(error.message || 'Failed to save data flow edge');
    }
  };

  const handleDeleteDataFlowNode = async (node) => {
    if (!node) return;
    const confirmation = window.confirm(`Remove ${node.name} and its connections?`);
    if (!confirmation) return;
    try {
      if (!backendConnected || !currentUser.id) {
        setDataFlowNodes((prev) => prev.filter((n) => n.id !== node.id));
        setDataFlowEdges((prev) =>
          prev.filter((edge) => edge.source_node_id !== node.id && edge.target_node_id !== node.id)
        );
      } else {
        await api.deleteDataFlowNode(currentUser.id, node.id);
        await refreshDataFlowGraph();
      }
      setSelectedDataFlowItem(null);
    } catch (error) {
      console.error('Error deleting data flow node:', error);
      setDataFlowError(error.message || 'Failed to delete data flow node');
    }
  };
  const handleDeleteDataFlowEdge = async (edge) => {
    if (!edge) return;
    const confirmation = window.confirm(`Remove flow from ${edge.source_node_id} to ${edge.target_node_id}?`);
    if (!confirmation) return;
    try {
      if (!backendConnected || !currentUser.id) {
        setDataFlowEdges((prev) => prev.filter((e) => e.id !== edge.id));
      } else {
        await api.deleteDataFlowEdge(currentUser.id, edge.id);
        await refreshDataFlowGraph();
      }
      setSelectedDataFlowItem(null);
    } catch (error) {
      console.error('Error deleting data flow edge:', error);
      setDataFlowError(error.message || 'Failed to delete data flow edge');
    }
  };

  const updateDataFlowFilter = (key, value) => {
    setDataFlowFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openDataFlowNodeModal = (node = null) => {
    if (node) {
      setEditingDataFlowNode(node);
      resetDataFlowNodeForm({
        node_type: node.node_type || 'source',
        name: node.name || '',
        description: node.description || '',
        sensitivity: node.sensitivity || 'Internal',
        data_domains: Array.isArray(node.data_domains) ? node.data_domains.join(', ') : '',
        classification_tags: Array.isArray(node.classification_tags) ? node.classification_tags.join(', ') : '',
        owner: node.owner || '',
        responsible_party: node.responsible_party || '',
        framework_controls: Array.isArray(node.framework_controls) ? node.framework_controls.join(', ') : '',
        evidence_links: Array.isArray(node.evidence_links) ? node.evidence_links.join(', ') : '',
        integration_status: node.integration_status || 'active',
        last_sync_at: node.last_sync_at || '',
        sync_frequency: node.sync_frequency || '',
        system_of_record: Boolean(node.system_of_record),
      });
    } else {
      setEditingDataFlowNode(null);
      resetDataFlowNodeForm();
    }
    setShowDataFlowNodeModal(true);
  };

  const openDataFlowEdgeModal = (edge = null) => {
    if (edge) {
      setEditingDataFlowEdge(edge);
      resetDataFlowEdgeForm({
        source_node_id: edge.source_node_id?.toString() || '',
        target_node_id: edge.target_node_id?.toString() || '',
        flow_type: edge.flow_type || 'ingest',
        transport: edge.transport || '',
        encryption_status: edge.encryption_status || '',
        retention_policy: edge.retention_policy || '',
        latency: edge.latency || '',
        volume: edge.volume || '',
        status: edge.status || 'active',
        automated: edge.automated !== false,
        controls_impacted: Array.isArray(edge.controls_impacted) ? edge.controls_impacted.join(', ') : '',
        last_validated_at: edge.last_validated_at || '',
      });
    } else {
      setEditingDataFlowEdge(null);
      resetDataFlowEdgeForm();
    }
    setShowDataFlowEdgeModal(true);
  };

  const closeDataFlowNodeModal = () => {
    setShowDataFlowNodeModal(false);
    setEditingDataFlowNode(null);
  };

  const closeDataFlowEdgeModal = () => {
    setShowDataFlowEdgeModal(false);
    setEditingDataFlowEdge(null);
  };

  const handleDataFlowCheckboxChange = (type, checked) => {
    if (type === 'node') {
      setDataFlowNodeForm((prev) => ({ ...prev, system_of_record: Boolean(checked) }));
    } else {
      setDataFlowEdgeForm((prev) => ({ ...prev, automated: Boolean(checked) }));
    }
  };


  const upsertActionableAlert = useCallback((incomingAlert) => {
    if (!incomingAlert || !incomingAlert.id) return;

    setActionableAlerts((prevAlerts) => {
      const shouldRemove = incomingAlert.acknowledged || incomingAlert.status === 'resolved';
      if (shouldRemove) {
        return prevAlerts.filter((alert) => alert.id !== incomingAlert.id);
      }

      const existingIndex = prevAlerts.findIndex((alert) => alert.id === incomingAlert.id);
      if (existingIndex >= 0) {
        const nextAlerts = [...prevAlerts];
        nextAlerts[existingIndex] = { ...nextAlerts[existingIndex], ...incomingAlert };
        return nextAlerts;
      }

      return [incomingAlert, ...prevAlerts].slice(0, 20);
    });

    let shouldClosePanel = false;
    setSelectedAlert((prevSelected) => {
      if (!prevSelected || prevSelected.id !== incomingAlert.id) {
        return prevSelected;
      }

      if (incomingAlert.acknowledged || incomingAlert.status === 'resolved') {
        shouldClosePanel = true;
        return null;
      }

      return { ...prevSelected, ...incomingAlert };
    });

    if (shouldClosePanel) {
      setShowAlertRemediation(false);
    }
    if (showControlDetailRef.current && selectedControlRef.current) {
      const tokens = getControlTokens(selectedControlRef.current);
      if (alertMatchesControlTokens(incomingAlert, tokens)) {
        setThreadNotification({
          type: 'alert',
          message: `Alert updated • ${incomingAlert.title || incomingAlert.severity || incomingAlert.id}`,
          timestamp: Date.now(),
        });
      }
    }
  }, [setShowAlertRemediation, getControlTokens, alertMatchesControlTokens]);

  const closeAlertRemediation = useCallback(() => {
    setShowAlertRemediation(false);
    setSelectedAlert(null);
    setSelectedAlertDetail(null);
    setAlertDetailError(null);
    setAlertDetailLoading(false);
    setAlertRemediationForm({
      status: 'in_progress',
      notes: '',
      actionsTaken: '',
      evidenceLinks: '',
      controlUpdates: {}
    });
  }, []);

  const buildDemoAlertDetail = useCallback((alert) => {
    if (!alert) return null;
    const triggeredAt = alert.created_at ? new Date(alert.created_at) : new Date(Date.now() - 3 * 60 * 60 * 1000);
    const acknowledgedAt = alert.acknowledged_at ? new Date(alert.acknowledged_at) : new Date(triggeredAt.getTime() + 45 * 60 * 1000);
    const updatedAt = alert.updated_at ? new Date(alert.updated_at) : new Date(Date.now() - 30 * 60 * 1000);

    const timeline = [
      {
        id: `${alert.id}-triggered`,
        timestamp: triggeredAt.toISOString(),
        actor: 'Monitoring Engine',
        event: 'Alert Triggered',
        status: 'open',
        notes: `Detected drift across ${alert.framework || 'framework'} with ${alert.drift_payload?.gaps_count || 12} gaps.`,
        evidence_links: alert.drift_payload?.evidence_links || [],
      },
      {
        id: `${alert.id}-ack`,
        timestamp: acknowledgedAt.toISOString(),
        actor: 'Compliance Bot',
        event: 'Automated Assessment',
        status: 'in_progress',
        notes: 'Generated remediation guidance and prioritized affected controls.',
        evidence_links: [],
      },
      {
        id: `${alert.id}-update`,
        timestamp: updatedAt.toISOString(),
        actor: alert.responsible_party || 'Compliance Team',
        event: 'Owner Assigned',
        status: alert.status || 'open',
        notes: 'Assigned remediation owner and initiated evidence collection.',
        evidence_links: [],
      },
    ];

    const linkedControls = (alert.remediation_guidance || []).map((guidance, index) => ({
      id: guidance.control_id,
      control_name: guidance.control_name,
      framework: guidance.framework || alert.framework,
      priority: guidance.priority,
      status: guidance.current_status || 'Not Implemented',
      target_status: guidance.target_status || 'Implemented',
      owner: guidance.current_owner || alert.responsible_party || 'Unassigned',
      coverage_delta: guidance.coverage_delta ?? -5,
      evidence_links: guidance.evidence_links || [],
      automation_ready: Boolean(guidance.automation_ready),
      sequence: index + 1,
    }));

    const riskSnapshot = {
      severity: alert.severity || 'high',
      drift_percentage: alert.drift_payload?.drift_percentage ?? 7.5,
      baseline_score: alert.drift_payload?.baseline_score ?? alert.compliance_score_before ?? 85,
      current_score: alert.drift_payload?.current_score ?? alert.compliance_score_after ?? 78,
      risk_owner: alert.responsible_party || 'Compliance Operations',
      affected_assets: alert.drift_payload?.affected_assets || 12,
      automation_impact: linkedControls.filter((ctrl) => ctrl.automation_ready).length,
    };

    return {
      timeline,
      linked_controls: linkedControls,
      risk_snapshot: riskSnapshot,
      actions: [
        { id: 'guidance', label: 'View Guidance', icon: 'Sparkles', description: 'Review AI-generated remediation steps' },
        { id: 'assign', label: 'Assign Owner', icon: 'UserCheck', description: 'Assign resolver and set due date' },
        { id: 'ticket', label: 'Open Change Ticket', icon: 'ClipboardList', description: 'Create Jira/ServiceNow ticket' },
        { id: 'evidence', label: 'Request Evidence', icon: 'FileCheck', description: 'Trigger automated evidence capture' },
      ],
      last_updated: updatedAt.toISOString(),
      first_detected: triggeredAt.toISOString(),
    };
  }, []);

  // Fetch matching playbooks for an alert
  const fetchMatchingPlaybooks = useCallback(async (alert) => {
    if (!alert || !alert.id || !backendConnected || !currentUser?.id) return;
    setPlaybooksLoading(true);
    try {
      const result = await api.getMatchingPlaybooks(currentUser.id, alert.id);
      const playbooks = result.playbooks || [];
      setMatchingPlaybooks(playbooks);
      // Store playbooks for this alert in the map
      setAlertPlaybooksMap(prev => ({
        ...prev,
        [alert.id]: playbooks
      }));
    } catch (error) {
      console.error('Failed to fetch matching playbooks:', error);
      setMatchingPlaybooks([]);
    } finally {
      setPlaybooksLoading(false);
    }
  }, [backendConnected, currentUser?.id]);
  
  // Pre-fetch playbooks for actionable alerts
  useEffect(() => {
    if (backendConnected && currentUser?.id && actionableAlerts.length > 0) {
      // Fetch playbooks for first 5 alerts
      actionableAlerts.slice(0, 5).forEach(async (alert) => {
        if (!alertPlaybooksMap[alert.id]) {
          try {
            const result = await api.getMatchingPlaybooks(currentUser.id, alert.id);
            const playbooks = result.playbooks || [];
            if (playbooks.length > 0) {
              setAlertPlaybooksMap(prev => ({
                ...prev,
                [alert.id]: playbooks
              }));
            }
          } catch (error) {
            // Silently fail - playbooks are optional
          }
        }
      });
    }
  }, [actionableAlerts.length, backendConnected, currentUser?.id]); // Only depend on length to avoid infinite loops

  const fetchAlertDetails = useCallback(async (alert) => {
    if (!alert) {
      return;
    }
    setAlertDetailLoading(true);
    setAlertDetailError(null);
    try {
      let detail = null;
      if (backendConnected && currentUser?.id) {
        detail = await api.getAlertDetails(currentUser.id, alert.id);
        // Fetch matching playbooks proactively
        fetchMatchingPlaybooks(alert);
      }
      if (!detail) {
        detail = buildDemoAlertDetail(alert);
      }
      setSelectedAlertDetail(detail);
    } catch (error) {
      console.error('Alert detail load error:', error);
      const message = error?.detail || error?.message || 'Unable to load alert detail';
      setAlertDetailError(message);
      setSelectedAlertDetail(buildDemoAlertDetail(alert));
    } finally {
      setAlertDetailLoading(false);
    }
  }, [backendConnected, buildDemoAlertDetail, currentUser?.id, fetchMatchingPlaybooks]);

  // Execute a playbook for an alert
  const executePlaybook = useCallback(async (playbook, alert) => {
    if (!playbook || !alert) return;
    
    setPlaybookExecutionProgress({ playbookId: playbook.id, currentStep: 0, totalSteps: playbook.steps?.length || 0 });
    
    // Apply playbook steps to remediation form
    const controlUpdates = {};
    const actionsTaken = [];
    const evidenceLinks = [];
    
    // Process each step
    if (playbook.steps && Array.isArray(playbook.steps)) {
      for (let i = 0; i < playbook.steps.length; i++) {
        const step = playbook.steps[i];
        setPlaybookExecutionProgress({ 
          playbookId: playbook.id, 
          currentStep: i + 1, 
          totalSteps: playbook.steps.length,
          currentAction: step.description 
        });
        
        // Simulate step execution delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Map step actions to form fields
        if (step.action === 'evidence_collected' && step.automation_ready) {
          evidenceLinks.push(`Auto-collected: ${step.description}`);
        }
        
        if (step.action === 'status_updated' || step.action === 'control_update') {
          // Apply to control updates
          const controlId = alert.control_id || (alert.remediation_guidance?.[0]?.control_id);
          if (controlId) {
            controlUpdates[controlId] = {
              status: 'Implemented',
              responsible_party: alert.responsible_party || 'System',
              evidence_link: evidenceLinks[evidenceLinks.length - 1] || ''
            };
          }
        }
        
        actionsTaken.push(step.description || step.action);
      }
    }
    
    // Update remediation form with playbook results
    setAlertRemediationForm(prev => ({
      ...prev,
      status: 'in_progress',
      notes: prev.notes ? `${prev.notes}\n\nExecuted playbook: ${playbook.playbook_name}` : `Executed playbook: ${playbook.playbook_name}`,
      actionsTaken: [...(prev.actionsTaken ? prev.actionsTaken.split('\n') : []), ...actionsTaken].join('\n'),
      evidenceLinks: [...(prev.evidenceLinks ? prev.evidenceLinks.split('\n') : []), ...evidenceLinks].join('\n'),
      controlUpdates: { ...prev.controlUpdates, ...controlUpdates }
    }));
    
    // Track playbook usage
    if (backendConnected && currentUser?.id) {
      try {
        await api.trackPlaybookUsage(currentUser.id, playbook.id, alert.id);
      } catch (error) {
        console.error('Failed to track playbook usage:', error);
      }
    }
    
    setPlaybookExecutionProgress(null);
    setSelectedPlaybookForAlert(null);
    
    // Show success notification
    alert(`Playbook executed! Estimated time saved: ${playbook.estimated_time_minutes || 0} minutes`);
  }, [backendConnected, currentUser?.id]);

  const openAlertRemediation = useCallback((alert) => {
    if (!alert) return;

    const controlUpdates = {};
    (alert.remediation_guidance || []).forEach((guidance) => {
      controlUpdates[guidance.control_id] = {
        status: 'Implemented',
        responsible_party: guidance.recommended_owner || guidance.current_owner || alert.responsible_party || '',
        evidence_link: ''
      };
    });

    setAlertRemediationForm({
      status: alert.status === 'resolved' ? 'resolved' : 'in_progress',
      notes: '',
      actionsTaken: '',
      evidenceLinks: '',
      controlUpdates
    });
    setSelectedAlert(alert);
    setShowAlertRemediation(true);
    setAlertDetailError(null);
    setSelectedAlertDetail(null);
    fetchAlertDetails(alert);
  }, [fetchAlertDetails]);

  const handleRemediationFieldChange = (field, value) => {
    setAlertRemediationForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleControlUpdateChange = (controlId, field, value) => {
    setAlertRemediationForm((prev) => ({
      ...prev,
      controlUpdates: {
        ...prev.controlUpdates,
        [controlId]: {
          ...(prev.controlUpdates?.[controlId] || {}),
          [field]: value
        }
      }
    }));
  };

  const applyControlUpdates = useCallback((controlUpdatesPayload) => {
    if (!controlUpdatesPayload || controlUpdatesPayload.length === 0) {
      return;
    }

    const updatesMap = controlUpdatesPayload.reduce((map, update) => {
      if (update.control_id) {
        map[update.control_id] = update;
      }
      return map;
    }, {});

    if (Object.keys(updatesMap).length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();

    setControls((prevControls) => {
      if (!Array.isArray(prevControls) || prevControls.length === 0) {
        return prevControls;
      }
      return prevControls.map((control) => {
        const update = updatesMap[control.id];
        if (!update) {
          return control;
        }
        return {
          ...control,
          status: update.status || control.status,
          responsible_party: update.responsible_party ?? control.responsible_party,
          evidence_link: update.evidence_link ?? control.evidence_link,
          last_updated: timestamp
        };
      });
    });

    setResponsibilityMatrix((prevMatrix) => {
      if (!Array.isArray(prevMatrix) || prevMatrix.length === 0) {
        return prevMatrix;
      }
      return prevMatrix.map((entry) => {
        const update = updatesMap[entry.control_id];
        if (!update) {
          return entry;
        }

        const updatedEntry = { ...entry };

        if (update.responsible_party) {
          updatedEntry.ownership = update.responsible_party;
          updatedEntry.primary_owner = update.responsible_party;
        }

        if (update.evidence_link) {
          const existingEvidence = Array.isArray(entry.evidence_sources)
            ? entry.evidence_sources
            : entry.evidence_sources
              ? [entry.evidence_sources]
              : [];

          if (!existingEvidence.includes(update.evidence_link)) {
            updatedEntry.evidence_sources = [...existingEvidence, update.evidence_link];
          } else {
            updatedEntry.evidence_sources = existingEvidence;
          }
        }

        updatedEntry.last_computed = timestamp;
        return updatedEntry;
      });
    });
  }, []);

  const recordRemediationProgress = useCallback((alert, controlUpdatesPayload, status) => {
    const updates = Array.isArray(controlUpdatesPayload) ? controlUpdatesPayload : [];
    const controlsTouched = updates.length;
    const implementedCount = updates.filter((u) => (u.status || '').toLowerCase() === 'implemented').length;
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];
    const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;

    setProjectTimeline((prev) => {
      const milestone = {
        name: status === 'resolved' ? `Resolved Drift: ${alert.framework}` : `Remediation Update: ${alert.framework}`,
        type: 'remediation',
        status: status === 'resolved' ? 'completed' : 'in-progress',
        description: `${alert.framework} • ${controlsTouched || 1} control${controlsTouched === 1 ? '' : 's'} updated (${alert.severity || 'high'} severity)`,
        date: isoDate,
        cost: 0,
        vendorCost: 0,
        controls: controlsTouched || null,
        impact: alert.severity || 'high',
        updatedControls: updates,
        vendors: []
      };

      const baseTimeline = prev || {
        milestones: [],
        timelineData: [],
        vendorRecommendations: [],
        summary: {
          totalDuration: 90,
          totalMilestones: 0,
          totalControls: 0,
          totalBudget: 0,
          totalVendorCost: 0
        }
      };

      const milestones = baseTimeline.milestones.filter(
        (m) => !(m.type === 'remediation' && m.date === isoDate && m.name === milestone.name)
      );
      milestones.push(milestone);
      milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

      const firstDate = milestones.length > 0 ? new Date(milestones[0].date) : now;
      const dayOffset = Math.max(0, Math.floor((now - firstDate) / (1000 * 60 * 60 * 24)));

      const timelineData = [...baseTimeline.timelineData];
      const complianceBoost = status === 'resolved' ? Math.min(6, Math.max(1, implementedCount * 2)) : Math.max(0, controlsTouched);

      const existingIndex = timelineData.findIndex((point) => point.date === isoDate);
      const referencePoint = existingIndex >= 0
        ? timelineData[existingIndex]
        : timelineData.length > 0
          ? timelineData[timelineData.length - 1]
          : {
              day: dayOffset,
              date: isoDate,
              cumulativeCost: 0,
              vendorCost: 0,
              implementationCost: 0,
              complianceScore: 72
            };

      const nextPoint = {
        ...referencePoint,
        day: dayOffset,
        date: isoDate,
        complianceScore: Math.min(100, (referencePoint.complianceScore || 72) + complianceBoost)
      };

      if (existingIndex >= 0) {
        timelineData[existingIndex] = nextPoint;
      } else {
        timelineData.push(nextPoint);
      }

      timelineData.sort((a, b) => a.day - b.day);

      const summary = {
        ...baseTimeline.summary,
        totalMilestones: milestones.length,
        totalControls: (baseTimeline.summary?.totalControls || 0) + implementedCount
      };

      return {
        ...baseTimeline,
        milestones,
        timelineData,
        summary
      };
    });

    if (status === 'resolved') {
      setPartnerGrowthHistory((prevHistory) => {
        if (!Array.isArray(prevHistory) || prevHistory.length === 0) {
          return prevHistory;
        }

        const lastEntry = prevHistory[prevHistory.length - 1];
        const improvement = Math.max(1, implementedCount * 2 || updates.length);
        const newEntry = {
          date: isoDate,
          quarter,
          overallScore: Math.min(100, (lastEntry?.overallScore || 72) + improvement),
          complianceCoverage: Math.min(100, (lastEntry?.complianceCoverage || 68) + improvement),
          controlsImplemented: (lastEntry?.controlsImplemented || 0) + implementedCount,
          gapsClosed: (lastEntry?.gapsClosed || 0) + (updates.length || 1),
          frameworksCovered: lastEntry?.frameworksCovered || 5,
          automationProgress: Math.min(100, (lastEntry?.automationProgress || 60) + improvement)
        };

        if (lastEntry && lastEntry.date === isoDate) {
          const updatedHistory = [...prevHistory];
          updatedHistory[updatedHistory.length - 1] = {
            ...lastEntry,
            ...newEntry
          };
          return updatedHistory;
        }

        return [...prevHistory.slice(-11), newEntry];
      });
    }
  }, []);

  const handleRemediationSubmit = async () => {
    if (!selectedAlert) return;

    setAlertSaving(true);
    const normalizeList = (input) =>
      (input || '')
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);

    try {
      const controlUpdatesEntries = Object.entries(alertRemediationForm.controlUpdates || {});
      const controlUpdatesPayload = controlUpdatesEntries
        .map(([controlId, updates]) => {
          const payload = { control_id: controlId };
          if (updates.status) {
            payload.status = updates.status;
          }
          if (updates.responsible_party) {
            payload.responsible_party = updates.responsible_party;
          }
          if (updates.evidence_link) {
            payload.evidence_link = updates.evidence_link;
          }
          return payload;
        })
        .filter((payload) => Object.keys(payload).length > 1);

      const payload = {
        status: alertRemediationForm.status,
      };

      const notes = (alertRemediationForm.notes || '').trim();
      if (notes) {
        payload.notes = notes;
      }

      const actions = normalizeList(alertRemediationForm.actionsTaken);
      if (actions.length) {
        payload.actions_taken = actions;
      }

      const evidenceLinks = normalizeList(alertRemediationForm.evidenceLinks);
      if (evidenceLinks.length) {
        payload.evidence_links = evidenceLinks;
      }

      if (controlUpdatesPayload.length) {
        payload.control_updates = controlUpdatesPayload;
      }

      const alertContext = selectedAlertRef.current || selectedAlert;
      const statusSnapshot = alertRemediationForm.status;

      const updateResponse = await api.updateAlertRemediation(selectedAlert.id, currentUser.id, payload);
      const responseDetail = updateResponse && updateResponse.alert ? updateResponse : null;
      const responseAlert = responseDetail ? updateResponse.alert : updateResponse;
      const timestamp = new Date().toISOString();

      let nextAlertSnapshot = responseAlert && responseAlert.id
        ? responseAlert
        : (alertContext ? {
            ...alertContext,
            status: statusSnapshot,
            acknowledged: true,
            updated_at: timestamp,
          } : null);

      if (nextAlertSnapshot && !nextAlertSnapshot.updated_at) {
        nextAlertSnapshot = { ...nextAlertSnapshot, updated_at: timestamp };
      }

      setSelectedAlert((prev) => {
        if (!prev || prev.id !== selectedAlert.id) {
          return prev;
        }
        return nextAlertSnapshot || prev;
      });

      if (controlUpdatesPayload.length) {
        applyControlUpdates(controlUpdatesPayload);
      }

      const progressContext = nextAlertSnapshot || alertContext;
      if (progressContext) {
        recordRemediationProgress(progressContext, controlUpdatesPayload, statusSnapshot);
      }

      await loadActionableAlerts();
      if (statusSnapshot === 'resolved') {
        loadFrameworkGrowth();
        closeAlertRemediation();
      } else if (responseDetail) {
        setSelectedAlertDetail(responseDetail);
      } else if (progressContext) {
        await fetchAlertDetails(progressContext);
      }
    } catch (error) {
      console.error('Error updating alert remediation:', error);
    } finally {
      setAlertSaving(false);
    }
  };

  // Load framework growth and alerts when dashboard is active
  useEffect(() => {
    if (activeView === 'dashboard') {
      loadFrameworkGrowth();
      loadActionableAlerts();

      const interval = setInterval(() => {
        loadFrameworkGrowth();
        if (!alertsSocketConnected) {
          loadActionableAlerts();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [activeView, backendConnected, currentUser.id, alertsSocketConnected]);

  useEffect(() => {
    if (!backendConnected || !currentUser.id) {
      if (alertsSocketRef.current) {
        alertsSocketRef.current.close();
        alertsSocketRef.current = null;
      }
      setAlertsSocketConnected(false);
      return;
    }

    try {
      const wsUrl = new URL('/ws/alerts', API_BASE_URL);
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl.searchParams.set('user_id', currentUser.id);

      const socket = new WebSocket(wsUrl.toString());
      alertsSocketRef.current = socket;

      socket.onopen = () => {
        setAlertsSocketConnected(true);
      };

      socket.onclose = () => {
        if (alertsSocketRef.current === socket) {
          alertsSocketRef.current = null;
          setAlertsSocketConnected(false);
        }
      };

      socket.onerror = () => {
        if (alertsSocketRef.current === socket) {
          setAlertsSocketConnected(false);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || !data.type) return;

          if (data.type === 'connection_ack') {
            return;
          }

          if (data.type === 'alert.snapshot' && Array.isArray(data.payload)) {
            setActionableAlerts(data.payload);
            const existingSelected = selectedAlertRef.current;
            if (existingSelected) {
              const updatedSelected = data.payload.find((alert) => alert.id === existingSelected.id);
              if (updatedSelected) {
                setSelectedAlert(updatedSelected);
              } else if (showAlertRemediationRef.current) {
                setShowAlertRemediation(false);
                setSelectedAlert(null);
              }
            }
          } else if ((data.type === 'alert.created' || data.type === 'alert.updated') && data.payload) {
            upsertActionableAlert(data.payload);
            if (data.type === 'alert.updated') {
              const currentSelected = selectedAlertRef.current;
              if (
                showAlertRemediationRef.current &&
                currentSelected &&
                currentSelected.id === data.payload.id
              ) {
                fetchAlertDetails({ ...currentSelected, ...data.payload });
              }
            }
          }
        } catch (error) {
          console.error('Error processing alert message:', error);
        }
      };

      return () => {
        if (alertsSocketRef.current === socket) {
          alertsSocketRef.current = null;
        }
        socket.close();
        setAlertsSocketConnected(false);
      };
    } catch (error) {
      console.error('Error initializing alert WebSocket:', error);
      setAlertsSocketConnected(false);
    }
  }, [backendConnected, currentUser.id, upsertActionableAlert, fetchAlertDetails]);

  const loadIAMData = async () => {
    if (!currentUser.id) {
      console.log('No current user ID, skipping IAM data load');
      return;
    }
    
    console.log('Loading IAM data, backendConnected:', backendConnected);
    
    if (!backendConnected) {
      // Load demo data when backend is not connected
      console.log('Backend not connected, loading demo IAM data');
      loadDemoIAMData();
      return;
    }
    
    try {
      const permissions = await api.getUserPermissions(currentUser.id, currentUser.id);
      setUserPermissions(permissions || []);
      
      const auditLog = await api.getAuditLog(currentUser.id);
      setPermissionAuditLog(auditLog || []);
      
      // Load access tracking data
      await loadAccessTrackingData();
    } catch (error) {
      console.error('Error loading IAM data:', error);
      // Fallback to demo data on error
      loadDemoIAMData();
    }
  };

  const loadDemoIAMData = () => {
    console.log('=== loadDemoIAMData START ===');
    // Generate demo users with different roles and access patterns
    const demoUsers = [
      {
        id: 1,
        name: 'Sarah Chen',
        email: 'sarah.chen@company.com',
        role: 'admin',
        created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        total_logins: 142,
        total_accesses: 3847,
        last_access: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        name: 'Michael Rodriguez',
        email: 'michael.rodriguez@company.com',
        role: 'security_analyst',
        created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        total_logins: 98,
        total_accesses: 2156,
        last_access: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        name: 'Emily Watson',
        email: 'emily.watson@company.com',
        role: 'compliance_manager',
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        total_logins: 76,
        total_accesses: 1892,
        last_access: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        name: 'David Kim',
        email: 'david.kim@company.com',
        role: 'control_owner',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        total_logins: 54,
        total_accesses: 892,
        last_access: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 5,
        name: 'Jessica Martinez',
        email: 'jessica.martinez@company.com',
        role: 'auditor',
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        total_logins: 32,
        total_accesses: 456,
        last_access: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 6,
        name: 'Robert Thompson',
        email: 'robert.thompson@company.com',
        role: 'viewer',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        total_logins: 18,
        total_accesses: 234,
        last_access: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 7,
        name: 'Lisa Anderson',
        email: 'lisa.anderson@company.com',
        role: 'vendor',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        total_logins: 12,
        total_accesses: 178,
        last_access: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    console.log('Setting demo users:', demoUsers.length, demoUsers);
    setAllUsers(demoUsers);

    // Generate demo access summary for current user (Sarah Chen - admin)
    const demoAccessSummary = {
      user_id: 1,
      period_days: 30,
      sessions: {
        total_logins: 142,
        active_sessions: 1,
        total_session_time_seconds: 284700 // ~79 hours
      },
      access: {
        total_accesses: 3847,
        read_actions: 2456,
        write_actions: 892,
        execute_actions: 389,
        delete_actions: 110,
        unique_resource_types: 8,
        unique_resources: 156
      },
      mapped_permissions: [
        {
          resource_type: 'all',
          resource_id: null,
          read: true,
          write: true,
          execute: true,
          delete: true,
          confidence: 1.0,
          observation_count: 3847
        },
        {
          resource_type: 'control',
          resource_id: 'AC-1',
          read: true,
          write: true,
          execute: false,
          delete: false,
          confidence: 0.95,
          observation_count: 234
        },
        {
          resource_type: 'audit',
          resource_id: '1',
          read: true,
          write: true,
          execute: true,
          delete: false,
          confidence: 0.98,
          observation_count: 156
        },
        {
          resource_type: 'report',
          resource_id: null,
          read: true,
          write: true,
          execute: true,
          delete: true,
          confidence: 0.92,
          observation_count: 89
        }
      ],
      daily_statistics: Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const baseLogins = isWeekend ? 2 : 5;
        const baseAccesses = isWeekend ? 50 : 130;
        
        return {
          date: date.toISOString().split('T')[0],
          logins: baseLogins + Math.floor(Math.random() * 3),
          accesses: baseAccesses + Math.floor(Math.random() * 50),
          read: Math.floor((baseAccesses + Math.random() * 50) * 0.65),
          write: Math.floor((baseAccesses + Math.random() * 50) * 0.23),
          execute: Math.floor((baseAccesses + Math.random() * 50) * 0.10),
          delete: Math.floor((baseAccesses + Math.random() * 50) * 0.02),
          session_time_seconds: (baseLogins + Math.floor(Math.random() * 3)) * 3600
        };
      })
    };
    setUserAccessSummary(demoAccessSummary);

    // Generate demo mapped permissions for different users
    const demoMappedPermissions = [
      // Admin user (full access)
      {
        resource_type: 'all',
        resource_id: null,
        read: true,
        write: true,
        execute: true,
        delete: true,
        discovered_from: 'role',
        source_id: null,
        confidence_score: 1.0,
        observation_count: 3847,
        first_observed_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        last_observed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      // Control-specific permissions
      {
        resource_type: 'control',
        resource_id: 'AC-1',
        read: true,
        write: true,
        execute: false,
        delete: false,
        discovered_from: 'direct_permission',
        source_id: 1,
        confidence_score: 0.95,
        observation_count: 234,
        first_observed_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
        last_observed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        resource_type: 'control',
        resource_id: 'AC-2',
        read: true,
        write: true,
        execute: true,
        delete: false,
        discovered_from: 'direct_permission',
        source_id: 2,
        confidence_score: 0.92,
        observation_count: 189,
        first_observed_at: new Date(Date.now() - 140 * 24 * 60 * 60 * 1000).toISOString(),
        last_observed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        resource_type: 'control',
        resource_id: 'AC-3',
        read: true,
        write: false,
        execute: false,
        delete: false,
        discovered_from: 'vendor_profile',
        source_id: 1,
        confidence_score: 0.88,
        observation_count: 156,
        first_observed_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        last_observed_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      // Audit permissions
      {
        resource_type: 'audit',
        resource_id: '1',
        read: true,
        write: true,
        execute: true,
        delete: false,
        discovered_from: 'direct_permission',
        source_id: 3,
        confidence_score: 0.98,
        observation_count: 156,
        first_observed_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_observed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        resource_type: 'audit',
        resource_id: '2',
        read: true,
        write: false,
        execute: false,
        delete: false,
        discovered_from: 'role',
        source_id: null,
        confidence_score: 0.85,
        observation_count: 89,
        first_observed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        last_observed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      // Report permissions
      {
        resource_type: 'report',
        resource_id: null,
        read: true,
        write: true,
        execute: true,
        delete: true,
        discovered_from: 'role',
        source_id: null,
        confidence_score: 0.92,
        observation_count: 89,
        first_observed_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
        last_observed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      // Evidence permissions
      {
        resource_type: 'evidence',
        resource_id: null,
        read: true,
        write: true,
        execute: false,
        delete: false,
        discovered_from: 'direct_permission',
        source_id: 4,
        confidence_score: 0.90,
        observation_count: 234,
        first_observed_at: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString(),
        last_observed_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      // Dashboard permissions
      {
        resource_type: 'dashboard',
        resource_id: null,
        read: true,
        write: false,
        execute: false,
        delete: false,
        discovered_from: 'role',
        source_id: null,
        confidence_score: 0.99,
        observation_count: 567,
        first_observed_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        last_observed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ];
    setMappedPermissions(demoMappedPermissions);

    // Generate demo access logs
    const resourceTypesList = ['control', 'audit', 'report', 'evidence', 'dashboard', 'api'];
    const actions = {
      read: ['read', 'view', 'list', 'export'],
      write: ['write', 'create', 'update', 'edit', 'modify'],
      execute: ['execute', 'run', 'trigger', 'start', 'stop'],
      delete: ['delete', 'remove']
    };
    
    const demoAccessLogs = [];
    const now = Date.now();
    
    // Generate logs for last 7 days
    for (let day = 0; day < 7; day++) {
      const dayStart = now - (day * 24 * 60 * 60 * 1000);
      const logsPerDay = day === 0 ? 45 : (day === 1 ? 38 : Math.floor(30 - day * 3));
      
      for (let i = 0; i < logsPerDay; i++) {
        const logTime = dayStart - (i * (24 * 60 * 60 * 1000 / logsPerDay));
        const resourceType = resourceTypesList[Math.floor(Math.random() * resourceTypesList.length)];
        const permType = Math.random() < 0.65 ? 'read' : 
                        Math.random() < 0.85 ? 'write' : 
                        Math.random() < 0.95 ? 'execute' : 'delete';
        const actionList = actions[permType];
        const action = actionList[Math.floor(Math.random() * actionList.length)];
        const resourceId = resourceType === 'control' ? 
          ['AC-1', 'AC-2', 'AC-3', 'SI-3', 'IR-1'][Math.floor(Math.random() * 5)] :
          resourceType === 'audit' ? String(Math.floor(Math.random() * 3) + 1) :
          null;
        
        demoAccessLogs.push({
          id: demoAccessLogs.length + 1,
          user_id: 1,
          session_id: Math.floor(Math.random() * 10) + 1,
          resource_type: resourceType,
          resource_id: resourceId,
          action_type: action,
          permission_used: permType,
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          access_timestamp: new Date(logTime).toISOString(),
          access_duration_ms: Math.floor(Math.random() * 2000) + 100,
          success: Math.random() > 0.05, // 95% success rate
          failure_reason: null,
          metadata_json: JSON.stringify({
            endpoint: `/api/${resourceType}s${resourceId ? `/${resourceId}` : ''}`,
            method: permType === 'read' ? 'GET' : permType === 'write' ? 'POST' : 'PUT'
          })
        });
      }
    }
    
    // Generate access logs for ALL users across different areas
    const allUsersAccessLogs = [];
    const resourceTypes = ['control', 'audit', 'report', 'evidence', 'dashboard', 'api', 'csca', 'golden-thread'];
    const areaLabels = {
      'control': 'Controls & Compliance',
      'audit': 'Audit Management',
      'report': 'Reports & Analytics',
      'evidence': 'Evidence Management',
      'dashboard': 'Dashboard',
      'api': 'API Access',
      'csca': 'Security-Compliance Alignment',
      'golden-thread': 'Golden Thread Workspace'
    };
    
    // Generate access logs for each user
    demoUsers.forEach(user => {
      const userAccessCount = user.total_accesses || 100;
      const now = Date.now();
      
      // Generate logs for last 14 days for this user
      for (let day = 0; day < 14; day++) {
        const dayStart = now - (day * 24 * 60 * 60 * 1000);
        const logsPerDay = Math.max(Math.floor(userAccessCount / 14), 5); // Ensure at least 5 logs per day
        const dayOfWeek = new Date(dayStart).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const actualLogsPerDay = isWeekend ? Math.max(Math.floor(logsPerDay * 0.3), 2) : logsPerDay; // At least 2 on weekends
        
        for (let i = 0; i < actualLogsPerDay; i++) {
          const logTime = dayStart - (i * (24 * 60 * 60 * 1000 / Math.max(actualLogsPerDay, 1)));
          const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
          const permType = Math.random() < 0.70 ? 'read' : 
                          Math.random() < 0.90 ? 'write' : 
                          Math.random() < 0.98 ? 'execute' : 'delete';
          const actionList = actions[permType];
          const action = actionList[Math.floor(Math.random() * actionList.length)];
          const resourceId = resourceType === 'control' ? 
            ['AC-1', 'AC-2', 'AC-3', 'SI-3', 'IR-1'][Math.floor(Math.random() * 5)] :
            resourceType === 'audit' ? String(Math.floor(Math.random() * 3) + 1) :
            null;
          
          allUsersAccessLogs.push({
            id: allUsersAccessLogs.length + 1,
            user_id: user.id,
            user_name: user.name,
            user_email: user.email,
            user_role: user.role,
            session_id: Math.floor(Math.random() * 10) + 1,
            resource_type: resourceType,
            resource_id: resourceId,
            action_type: action,
            permission_used: permType,
            ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
            user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            access_timestamp: new Date(logTime).toISOString(),
            access_duration_ms: Math.floor(Math.random() * 2000) + 100,
            success: Math.random() > 0.05,
            failure_reason: null,
            metadata_json: JSON.stringify({
              endpoint: `/api/${resourceType}s${resourceId ? `/${resourceId}` : ''}`,
              method: permType === 'read' ? 'GET' : permType === 'write' ? 'POST' : 'PUT'
            })
          });
        }
      }
    });
    
    // Group access by area/resource type
    console.log('Total access logs generated:', allUsersAccessLogs.length);
    const accessByAreaMap = {};
    allUsersAccessLogs.forEach(log => {
      const area = log.resource_type;
      if (!accessByAreaMap[area]) {
        accessByAreaMap[area] = {
          area_name: areaLabels[area] || area,
          resource_type: area,
          total_accesses: 0,
          unique_users: new Set(),
          accesses: []
        };
      }
      accessByAreaMap[area].total_accesses++;
      accessByAreaMap[area].unique_users.add(log.user_id);
      accessByAreaMap[area].accesses.push({
        user_id: log.user_id,
        user_name: log.user_name,
        user_email: log.user_email,
        user_role: log.user_role,
        timestamp: log.access_timestamp,
        action: log.action_type,
        permission: log.permission_used,
        resource_id: log.resource_id,
        success: log.success
      });
    });
    
    // Convert to array and sort accesses by timestamp
    const accessByAreaArray = Object.values(accessByAreaMap).map(area => ({
      ...area,
      unique_users: Array.from(area.unique_users).length,
      accesses: area.accesses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }));
    
    // Sort areas by total accesses
    accessByAreaArray.sort((a, b) => b.total_accesses - a.total_accesses);
    
    // Debug: Log the data to console
    console.log('Access by Area Data Generated:', {
      totalAreas: accessByAreaArray.length,
      totalAccesses: accessByAreaArray.reduce((sum, area) => sum + area.total_accesses, 0),
      allUsersAccessLogsCount: allUsersAccessLogs.length,
      areas: accessByAreaArray.map(a => ({ name: a.area_name, accesses: a.total_accesses, users: a.unique_users }))
    });
    
    // Ensure we have data before setting
    if (accessByAreaArray.length > 0) {
      setAccessByArea(accessByAreaArray);
    } else {
      console.warn('No access by area data generated!');
      // Set empty array to show the "no data" message
      setAccessByArea([]);
    }
    
    // Sort by timestamp descending
    demoAccessLogs.sort((a, b) => new Date(b.access_timestamp) - new Date(a.access_timestamp));
    setUserAccessLogs(demoAccessLogs.slice(0, 100)); // Show last 100

    // Generate demo compliance mappings
    const demoComplianceMapping = [
      {
        control_id: 'AC-2',
        framework: 'NIST_800-53',
        permission_type: 'read',
        resource_type: 'all',
        resource_id: null,
        compliance_status: 'compliant',
        last_verified_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        verification_notes: 'Account management tracking enabled'
      },
      {
        control_id: 'AC-3',
        framework: 'NIST_800-53',
        permission_type: 'write',
        resource_type: 'control',
        resource_id: 'AC-1',
        compliance_status: 'compliant',
        last_verified_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        verification_notes: 'Access enforcement policies implemented'
      },
      {
        control_id: 'AC-6',
        framework: 'NIST_800-53',
        permission_type: 'execute',
        resource_type: 'audit',
        resource_id: '1',
        compliance_status: 'compliant',
        last_verified_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        verification_notes: 'Least privilege principle applied'
      },
      {
        control_id: 'AC-7',
        framework: 'NIST_800-53',
        permission_type: 'read',
        resource_type: 'dashboard',
        resource_id: null,
        compliance_status: 'compliant',
        last_verified_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        verification_notes: 'Unsuccessful login attempts logged'
      },
      {
        control_id: 'AU-2',
        framework: 'NIST_800-53',
        permission_type: 'read',
        resource_type: 'all',
        resource_id: null,
        compliance_status: 'compliant',
        last_verified_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        verification_notes: 'Audit events captured for all access'
      },
      {
        control_id: 'AU-3',
        framework: 'NIST_800-53',
        permission_type: 'read',
        resource_type: 'all',
        resource_id: null,
        compliance_status: 'compliant',
        last_verified_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        verification_notes: 'Content of audit records verified'
      }
    ];
    setComplianceMapping(demoComplianceMapping);

    // Set session token for demo
    setSessionToken('demo_session_token_' + Date.now());
  };

  const loadAccessTrackingData = async () => {
    if (!currentUser.id) return;
    
    if (!backendConnected) {
      // Demo data already loaded in loadDemoIAMData
      return;
    }
    
    setAccessTrackingLoading(true);
    try {
      // Load all users
      const users = await api.listAllUsers(currentUser.id);
      setAllUsers(users || []);
      
      // Load mapped permissions for current user
      const mapped = await api.getMappedPermissions(currentUser.id, currentUser.id);
      setMappedPermissions(mapped || []);
      
      // Load access summary for current user
      const summary = await api.getUserAccessSummary(currentUser.id, currentUser.id, 30);
      setUserAccessSummary(summary);
      
      // Load compliance mapping
      const compliance = await api.getComplianceMapping(currentUser.id, currentUser.id, 'NIST_800-53');
      setComplianceMapping(compliance || []);
      
      // Create login session if not exists
      if (!sessionToken) {
        const loginResult = await api.createLoginSession(currentUser.id);
        if (loginResult?.session_token) {
          setSessionToken(loginResult.session_token);
        }
      }
    } catch (error) {
      console.error('Error loading access tracking data:', error);
      // Fallback to demo data on error
      loadDemoIAMData();
    } finally {
      setAccessTrackingLoading(false);
    }
  };

  const loadUserAccessDetails = async (userId) => {
    if (!currentUser.id) return;
    
    if (!backendConnected) {
      // Generate demo data for selected user
      loadDemoUserAccessDetails(userId);
      return;
    }
    
    try {
      const summary = await api.getUserAccessSummary(currentUser.id, userId, 30);
      setUserAccessSummary(summary);
      
      const logs = await api.getUserAccessLogs(currentUser.id, userId, { limit: 100 });
      setUserAccessLogs(logs || []);
      
      const mapped = await api.getMappedPermissions(currentUser.id, userId);
      setMappedPermissions(mapped || []);
      
      const compliance = await api.getComplianceMapping(currentUser.id, userId, 'NIST_800-53');
      setComplianceMapping(compliance || []);
    } catch (error) {
      console.error('Error loading user access details:', error);
      // Fallback to demo data
      loadDemoUserAccessDetails(userId);
    }
  };

  const loadDemoUserAccessDetails = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    // Generate different access patterns based on user role
    const rolePatterns = {
      admin: {
        read: 0.65,
        write: 0.23,
        execute: 0.10,
        delete: 0.02,
        totalAccesses: 3847,
        uniqueResources: 156
      },
      security_analyst: {
        read: 0.70,
        write: 0.20,
        execute: 0.08,
        delete: 0.02,
        totalAccesses: 2156,
        uniqueResources: 98
      },
      compliance_manager: {
        read: 0.75,
        write: 0.18,
        execute: 0.05,
        delete: 0.02,
        totalAccesses: 1892,
        uniqueResources: 87
      },
      control_owner: {
        read: 0.80,
        write: 0.15,
        execute: 0.04,
        delete: 0.01,
        totalAccesses: 892,
        uniqueResources: 45
      },
      auditor: {
        read: 0.95,
        write: 0.03,
        execute: 0.02,
        delete: 0.00,
        totalAccesses: 456,
        uniqueResources: 23
      },
      viewer: {
        read: 1.0,
        write: 0.0,
        execute: 0.0,
        delete: 0.0,
        totalAccesses: 234,
        uniqueResources: 12
      },
      vendor: {
        read: 0.90,
        write: 0.08,
        execute: 0.02,
        delete: 0.00,
        totalAccesses: 178,
        uniqueResources: 8
      }
    };

    const pattern = rolePatterns[user.role] || rolePatterns.viewer;

    // Generate access summary
    const demoSummary = {
      user_id: userId,
      period_days: 30,
      sessions: {
        total_logins: user.total_logins || 0,
        active_sessions: userId === 1 ? 1 : 0,
        total_session_time_seconds: (user.total_logins || 0) * 2000 // ~33 min per session
      },
      access: {
        total_accesses: pattern.totalAccesses,
        read_actions: Math.floor(pattern.totalAccesses * pattern.read),
        write_actions: Math.floor(pattern.totalAccesses * pattern.write),
        execute_actions: Math.floor(pattern.totalAccesses * pattern.execute),
        delete_actions: Math.floor(pattern.totalAccesses * pattern.delete),
        unique_resource_types: 6,
        unique_resources: pattern.uniqueResources
      },
      mapped_permissions: generateDemoPermissionsForRole(user.role),
      daily_statistics: Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const baseLogins = isWeekend ? 1 : Math.floor((user.total_logins || 0) / 30);
        const baseAccesses = isWeekend ? 
          Math.floor(pattern.totalAccesses / 60) : 
          Math.floor(pattern.totalAccesses / 20);
        
        return {
          date: date.toISOString().split('T')[0],
          logins: baseLogins + Math.floor(Math.random() * 2),
          accesses: baseAccesses + Math.floor(Math.random() * 20),
          read: Math.floor((baseAccesses + Math.random() * 20) * pattern.read),
          write: Math.floor((baseAccesses + Math.random() * 20) * pattern.write),
          execute: Math.floor((baseAccesses + Math.random() * 20) * pattern.execute),
          delete: Math.floor((baseAccesses + Math.random() * 20) * pattern.delete),
          session_time_seconds: (baseLogins + Math.floor(Math.random() * 2)) * 2000
        };
      })
    };
    setUserAccessSummary(demoSummary);

    // Generate permissions based on role
    setMappedPermissions(generateDemoPermissionsForRole(user.role));

    // Generate access logs
    const resourceTypes = ['control', 'audit', 'report', 'evidence', 'dashboard', 'api'];
    const actions = {
      read: ['read', 'view', 'list', 'export'],
      write: ['write', 'create', 'update', 'edit', 'modify'],
      execute: ['execute', 'run', 'trigger', 'start', 'stop'],
      delete: ['delete', 'remove']
    };
    
    const demoLogs = [];
    const now = Date.now();
    const logsToGenerate = Math.min(pattern.totalAccesses, 100);
    
    for (let i = 0; i < logsToGenerate; i++) {
      const logTime = now - (i * (7 * 24 * 60 * 60 * 1000 / logsToGenerate));
      const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
      const rand = Math.random();
      const permType = rand < pattern.read ? 'read' : 
                      rand < (pattern.read + pattern.write) ? 'write' : 
                      rand < (pattern.read + pattern.write + pattern.execute) ? 'execute' : 'delete';
      const actionList = actions[permType];
      const action = actionList[Math.floor(Math.random() * actionList.length)];
      const resourceId = resourceType === 'control' ? 
        ['AC-1', 'AC-2', 'AC-3', 'SI-3', 'IR-1'][Math.floor(Math.random() * 5)] :
        resourceType === 'audit' ? String(Math.floor(Math.random() * 3) + 1) :
        null;
      
      demoLogs.push({
        id: i + 1,
        user_id: userId,
        session_id: Math.floor(Math.random() * 10) + 1,
        resource_type: resourceType,
        resource_id: resourceId,
        action_type: action,
        permission_used: permType,
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        access_timestamp: new Date(logTime).toISOString(),
        access_duration_ms: Math.floor(Math.random() * 2000) + 100,
        success: Math.random() > 0.05,
        failure_reason: null,
        metadata_json: JSON.stringify({
          endpoint: `/api/${resourceType}s${resourceId ? `/${resourceId}` : ''}`,
          method: permType === 'read' ? 'GET' : permType === 'write' ? 'POST' : 'PUT'
        })
      });
    }
    
    demoLogs.sort((a, b) => new Date(b.access_timestamp) - new Date(a.access_timestamp));
    setUserAccessLogs(demoLogs);

    // Generate compliance mapping based on permissions
    const complianceMappings = [];
    const permissions = generateDemoPermissionsForRole(user.role);
    
    permissions.forEach(perm => {
      if (perm.read) {
        complianceMappings.push({
          control_id: 'AC-2',
          framework: 'NIST_800-53',
          permission_type: 'read',
          resource_type: perm.resource_type,
          resource_id: perm.resource_id,
          compliance_status: 'compliant',
          last_verified_at: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
          verification_notes: 'Account management tracking enabled'
        });
      }
      if (perm.write || perm.execute) {
        complianceMappings.push({
          control_id: 'AC-3',
          framework: 'NIST_800-53',
          permission_type: perm.write ? 'write' : 'execute',
          resource_type: perm.resource_type,
          resource_id: perm.resource_id,
          compliance_status: 'compliant',
          last_verified_at: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
          verification_notes: 'Access enforcement policies implemented'
        });
      }
      if (perm.execute || perm.delete) {
        complianceMappings.push({
          control_id: 'AC-6',
          framework: 'NIST_800-53',
          permission_type: perm.execute ? 'execute' : 'delete',
          resource_type: perm.resource_type,
          resource_id: perm.resource_id,
          compliance_status: 'compliant',
          last_verified_at: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
          verification_notes: 'Least privilege principle applied'
        });
      }
    });
    
    setComplianceMapping(complianceMappings);
  };

  const generateDemoPermissionsForRole = (role) => {
    const rolePermissions = {
      admin: [
        { resource_type: 'all', resource_id: null, read: true, write: true, execute: true, delete: true, discovered_from: 'role', confidence: 1.0, observation_count: 3847 },
        { resource_type: 'control', resource_id: null, read: true, write: true, execute: true, delete: true, discovered_from: 'role', confidence: 0.98, observation_count: 1234 },
        { resource_type: 'audit', resource_id: null, read: true, write: true, execute: true, delete: true, discovered_from: 'role', confidence: 0.97, observation_count: 567 },
        { resource_type: 'report', resource_id: null, read: true, write: true, execute: true, delete: true, discovered_from: 'role', confidence: 0.95, observation_count: 234 }
      ],
      security_analyst: [
        { resource_type: 'control', resource_id: null, read: true, write: true, execute: true, delete: false, discovered_from: 'role', confidence: 0.95, observation_count: 892 },
        { resource_type: 'audit', resource_id: null, read: true, write: true, execute: false, delete: false, discovered_from: 'role', confidence: 0.93, observation_count: 456 },
        { resource_type: 'dashboard', resource_id: null, read: true, write: false, execute: false, delete: false, discovered_from: 'role', confidence: 0.99, observation_count: 567 }
      ],
      compliance_manager: [
        { resource_type: 'control', resource_id: null, read: true, write: true, execute: false, delete: false, discovered_from: 'role', confidence: 0.92, observation_count: 678 },
        { resource_type: 'audit', resource_id: null, read: true, write: true, execute: false, delete: false, discovered_from: 'role', confidence: 0.90, observation_count: 456 },
        { resource_type: 'report', resource_id: null, read: true, write: true, execute: true, delete: false, discovered_from: 'role', confidence: 0.88, observation_count: 234 }
      ],
      control_owner: [
        { resource_type: 'control', resource_id: 'AC-1', read: true, write: true, execute: false, delete: false, discovered_from: 'direct_permission', confidence: 0.85, observation_count: 234 },
        { resource_type: 'control', resource_id: 'AC-2', read: true, write: true, execute: false, delete: false, discovered_from: 'direct_permission', confidence: 0.83, observation_count: 189 },
        { resource_type: 'evidence', resource_id: null, read: true, write: true, execute: false, delete: false, discovered_from: 'role', confidence: 0.80, observation_count: 156 }
      ],
      auditor: [
        { resource_type: 'control', resource_id: null, read: true, write: false, execute: false, delete: false, discovered_from: 'role', confidence: 0.95, observation_count: 234 },
        { resource_type: 'audit', resource_id: null, read: true, write: false, execute: false, delete: false, discovered_from: 'role', confidence: 0.93, observation_count: 189 },
        { resource_type: 'report', resource_id: null, read: true, write: false, execute: true, delete: false, discovered_from: 'role', confidence: 0.90, observation_count: 123 }
      ],
      viewer: [
        { resource_type: 'dashboard', resource_id: null, read: true, write: false, execute: false, delete: false, discovered_from: 'role', confidence: 0.99, observation_count: 178 },
        { resource_type: 'control', resource_id: null, read: true, write: false, execute: false, delete: false, discovered_from: 'role', confidence: 0.97, observation_count: 56 }
      ],
      vendor: [
        { resource_type: 'control', resource_id: 'AC-1', read: true, write: false, execute: false, delete: false, discovered_from: 'vendor_profile', confidence: 0.88, observation_count: 89 },
        { resource_type: 'audit', resource_id: '1', read: true, write: false, execute: false, delete: false, discovered_from: 'vendor_profile', confidence: 0.85, observation_count: 67 },
        { resource_type: 'evidence', resource_id: null, read: true, write: true, execute: false, delete: false, discovered_from: 'vendor_profile', confidence: 0.82, observation_count: 45 }
      ]
    };

    return rolePermissions[role] || rolePermissions.viewer;
  };
  const loadAudits = async () => {
    if (!backendConnected || !currentUser.id) {
      // Demo mode - set empty array
      setAudits([]);
      return;
    }
    try {
      const auditsData = await api.getAudits(currentUser.id);
      setAudits(auditsData || []);
    } catch (error) {
      console.error('Error loading audits:', error);
      // On error, still set empty array so UI doesn't break
      setAudits([]);
    }
  };

  const loadCertifications = async () => {
    if (!backendConnected || !currentUser.id) {
      // Demo mode - set empty array
      setCertifications([]);
      return;
    }
    try {
      const certs = await api.getCertifications(currentUser.id);
      setCertifications(certs || []);
    } catch (error) {
      console.error('Error loading certifications:', error);
      // On error, still set empty array so UI doesn't break
      setCertifications([]);
    }
  };

  const loadAuditDetails = async (auditId) => {
    // Demo mode - find audit in local state
    if (!backendConnected || !currentUser.id) {
      const audit = audits.find(a => a.id === auditId || a.id === parseInt(auditId));
      if (audit) {
        setSelectedAudit(audit);
        setAuditFindings([]);
        setAuditEvidence([]);
        setAuditReadiness({
          readiness_score: audit.readiness_score || 0,
          breakdown: {
            controls_with_evidence: 0,
            total_controls: audit.scope?.length || 0,
            total_findings: 0,
            resolved_findings: 0,
            total_evidence: 0,
            validated_evidence: 0
          }
        });
      }
      return;
    }

    try {
      const audit = await api.getAudit(currentUser.id, auditId);
      setSelectedAudit(audit);
      
      // Load findings and evidence
      const findings = await api.getFindings(currentUser.id, auditId).catch(() => []);
      setAuditFindings(findings || []);
      
      const evidence = await api.getEvidence(currentUser.id, auditId).catch(() => []);
      setAuditEvidence(evidence || []);
      
      // Calculate readiness score
      const readiness = await api.getAuditReadiness(currentUser.id, auditId).catch(() => ({
        readiness_score: 0,
        breakdown: {
          controls_with_evidence: 0,
          total_controls: audit.scope?.length || 0,
          total_findings: 0,
          resolved_findings: 0,
          total_evidence: 0,
          validated_evidence: 0
        }
      }));
      setAuditReadiness(readiness);
    } catch (error) {
      console.error('Error loading audit details:', error);
      // Try to find in local state as fallback
      const audit = audits.find(a => a.id === auditId || a.id === parseInt(auditId));
      if (audit) {
        setSelectedAudit(audit);
        setAuditFindings([]);
        setAuditEvidence([]);
      }
    }
  };

  const initializeBackend = async () => {
    try {
      // Check if backend is available
      const response = await fetch(`${api.baseURL || 'http://localhost:8000'}/`);
      if (response.ok) {
        setBackendConnected(true);
        setApiError(null);
        
        // Try to get or create current user
        try {
          // For demo, create a user if doesn't exist
          const userData = {
            name: currentUser.email.split('@')[0],
            email: currentUser.email,
            organization: currentUser.organization,
            plan: 'free',
            role: currentUser.role
          };
          
          const user = await api.createUser(userData).catch(async () => {
            // User might already exist, try to get by email (would need GET endpoint)
            // For now, we'll use a demo user ID
            return { id: 1, ...userData };
          });
          
          setCurrentUser({ ...currentUser, id: user.id });
          
          // Bootstrap: Grant admin role to first user
          try {
            await api.bootstrapAdmin(user.id);
          } catch (e) {
            console.warn('Could not bootstrap admin role:', e);
          }
        } catch (error) {
          console.warn('Could not create/get user, using demo mode:', error);
          setCurrentUser({ ...currentUser, id: 1 }); // Demo user ID
          
          // Try to bootstrap admin for demo user
          try {
            await api.bootstrapAdmin(1);
          } catch (e) {
            console.warn('Could not bootstrap admin for demo user:', e);
          }
        }
      }
    } catch (error) {
      console.warn('Backend not available, running in demo mode:', error.message);
      setBackendConnected(false);
      setApiError('Backend API not available - running in demo mode');
    }
    
    // Load data regardless of backend status (works in demo mode too)
    loadData();
  };

  useEffect(() => {
    calculateComplianceScores();
    generateRecommendations();
    calculateTCO();
    if (controls.length > 0) {
      // Auto-segment API data and assign responsibilities
      if (apiIntegrations.length > 0) {
        segmentApiDataToBackend();
      }
      generateResponsibilityMatrix();
      if (tcoResults) {
        generateAutomationPlan();
        generateProjectTimeline();
      }
    }
  }, [controls, tcoInputs, assets, apiIntegrations, mdrProviders, vendors]);

  useEffect(() => {
    if (recommendations.length === 0) {
      setSelectedRecommendationIndex(0);
      return;
    }
    setSelectedRecommendationIndex((idx) => {
      const cappedLength = Math.min(recommendations.length, 5);
      if (idx >= cappedLength) {
        return cappedLength - 1;
      }
      return idx;
    });
  }, [recommendations]);
  useEffect(() => {
    const handleGlobalKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowCommandPalette(true);
      } else if (event.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);
  useEffect(() => {
    if (showCommandPalette) {
      setCommandQuery('');
      setCommandHighlightIndex(0);
      if (commandInputRef.current) {
        commandInputRef.current.focus();
      }
    }
  }, [showCommandPalette]);
  useEffect(() => {
    setCommandHighlightIndex(0);
  }, [commandQuery]);

  // Sync responsibility matrix with backend
  useEffect(() => {
    if (backendConnected && currentUser.id && responsibilityMatrix.length > 0) {
      syncResponsibilityMatrixToBackend();
    }
  }, [responsibilityMatrix, backendConnected, currentUser.id]);
  // Component for rendering control data segments (handles backend fetching)
  const ControlDataSegments = ({ control, backendConnected, fetchControlSegments }) => {
    const [segments, setSegments] = useState([]);
    const [loadingSegments, setLoadingSegments] = useState(false);
    
    useEffect(() => {
      if (control && backendConnected) {
        setLoadingSegments(true);
        fetchControlSegments(control.id).then(s => {
          setSegments(s);
          setLoadingSegments(false);
        }).catch(() => {
          setLoadingSegments(false);
          // Fallback to local segments if backend fetch fails
          if (control.api_data_segments) {
            setSegments(control.api_data_segments);
          }
        });
      } else if (control?.api_data_segments) {
        setSegments(control.api_data_segments);
      }
    }, [control?.id, backendConnected]);
    
    if (loadingSegments) {
      return (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">API Data Segments</h3>
          <div className="text-muted-foreground">Loading segments from backend...</div>
        </div>
      );
    }
    
    if (segments.length === 0) return null;
    
    return (
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          API Data Segments {backendConnected && <span className="text-xs text-green-500">(Backend)</span>}
        </h3>
        <div className="space-y-3">
          {segments.map((segment, idx) => (
            <div key={idx} className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-foreground">{segment.api_name}</h4>
                  <p className="text-sm text-muted-foreground">{segment.responsible_party}</p>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{segment.coverage_type}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Data Attributes: {Array.isArray(segment.data_segment) ? segment.data_segment.join(', ') : Object.keys(segment.data_segment || {}).join(', ')}</div>
                <div>Evidence: {segment.evidence_attribution}</div>
                <div>Last Sync: {new Date(segment.last_sync).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  const loadData = () => {
    // Convert all framework controls to our format
    const nistControls = NIST_800_53_CONTROLS.map(ctrl => ({
      id: `NIST-${ctrl.id}`,
      control_name: ctrl.name,
      description: `NIST 800-53 ${ctrl.id}: ${ctrl.name}`,
      frameworks: [`NIST_800-53:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      nist_id: ctrl.id,
      control_family: getControlFamily(ctrl.id)
    }));
    
    const isoControls = ISO_27001_CONTROLS.map(ctrl => ({
      id: `ISO-${ctrl.id.replace(/\./g, '-')}`,
      control_name: ctrl.name,
      description: `ISO 27001:2022 ${ctrl.id}: ${ctrl.name}`,
      frameworks: [`ISO27001:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      iso_id: ctrl.id,
      control_category: ctrl.category
    }));

    const cisControls = CIS_CONTROLS.map(ctrl => ({
      id: `CIS-${ctrl.id}`,
      control_name: ctrl.name,
      description: `CIS Controls v8 ${ctrl.id}: ${ctrl.name}`,
      frameworks: [`CIS:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      cis_id: ctrl.id
    }));

    const hipaaControls = HIPAA_CONTROLS.map(ctrl => ({
      id: `HIPAA-${ctrl.id.replace(/\./g, '-').replace(/\//g, '-')}`,
      control_name: ctrl.name,
      description: `HIPAA ${ctrl.id}: ${ctrl.name}`,
      frameworks: [`HIPAA:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      hipaa_id: ctrl.id
    }));

    const pciControls = PCI_DSS_CONTROLS.map(ctrl => ({
      id: `PCI-${ctrl.id.replace(/\./g, '-')}`,
      control_name: ctrl.name,
      description: `PCI DSS v4.0 ${ctrl.id}: ${ctrl.name}`,
      frameworks: [`PCI_DSS:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      pci_id: ctrl.id
    }));

    const soc2Controls = SOC2_CONTROLS.map(ctrl => ({
      id: `SOC2-${ctrl.id.replace(/\./g, '-')}`,
      control_name: ctrl.name,
      description: `SOC 2 Type II ${ctrl.id}: ${ctrl.name}`,
      frameworks: [`SOC2:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      soc2_id: ctrl.id
    }));

    const fedrampControls = FEDRAMP_CONTROLS.map(ctrl => ({
      id: `FEDRAMP-${ctrl.id.replace(/\./g, '-')}`,
      control_name: ctrl.name,
      description: `FedRAMP High Baseline ${ctrl.id}: ${ctrl.name}`,
      frameworks: [`FedRAMP:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      fedramp_id: ctrl.id
    }));

    const nist171Controls = NIST_800_171_CONTROLS.map(ctrl => ({
      id: `NIST171-${ctrl.id.replace(/\./g, '-')}`,
      control_name: ctrl.name,
      description: `NIST 800-171 Rev 2 ${ctrl.id}: ${ctrl.name}`,
      frameworks: [`NIST_800-171:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      nist171_id: ctrl.id
    }));
    
    // Merge all controls: existing core + all framework controls (avoid duplicates by checking id)
    const existingIds = new Set(CORE_CONTROLS.map(c => c.id));
    const allControls = [
      ...CORE_CONTROLS,
      ...nistControls.filter(c => !existingIds.has(c.id)),
      ...isoControls.filter(c => !existingIds.has(c.id)),
      ...cisControls.filter(c => !existingIds.has(c.id)),
      ...hipaaControls.filter(c => !existingIds.has(c.id)),
      ...pciControls.filter(c => !existingIds.has(c.id)),
      ...soc2Controls.filter(c => !existingIds.has(c.id)),
      ...fedrampControls.filter(c => !existingIds.has(c.id)),
      ...nist171Controls.filter(c => !existingIds.has(c.id))
    ];
    
    // Initialize with all controls
    const initialControls = allControls.map(control => ({
      ...control,
      status: "Partial",
      covered_by: "",
      responsible_party: control.default_owner || "Unassigned",
      evidence_link: "",
      last_updated: new Date().toISOString().split('T')[0],
      auto_mapped: false,
      entity_id: null, // null = applies to all entities
      api_data_segments: [], // Store API data segments for this control
      responsibility_segments: [] // Store responsibility assignments
    }));
    setControls(initialControls);

    // Initialize demo users
    setUsers([
      { id: 1, email: 'admin@company.com', organization: 'Demo Org', role: 'Admin' },
      { id: 2, email: 'security@company.com', organization: 'Demo Org', role: 'Security Analyst' },
      { id: 3, email: 'compliance@company.com', organization: 'Demo Org', role: 'Compliance Officer' }
    ]);

    // Initialize RBAC roles
    const defaultRoles = [
      {
        id: 1,
        name: 'Global Admin',
        description: 'Full system access - can manage all settings, users, and data',
        permissions: ['*'],
        userCount: 1,
        color: 'red'
      },
      {
        id: 2,
        name: 'Compliance Officer',
        description: 'Manage compliance controls, generate reports, assign tasks',
        permissions: [
          'controls.view',
          'controls.edit',
          'controls.assign',
          'reports.generate',
          'reports.export',
          'vendors.view',
          'vendors.edit',
          'audit.view'
        ],
        userCount: 2,
        color: 'blue'
      },
      {
        id: 3,
        name: 'Security Analyst',
        description: 'View security controls, update evidence, manage incidents',
        permissions: [
          'controls.view',
          'controls.edit_assigned',
          'evidence.upload',
          'incidents.manage',
          'reports.view',
          'vendors.view'
        ],
        userCount: 5,
        color: 'green'
      },
      {
        id: 4,
        name: 'Auditor',
        description: 'Read-only access to controls and evidence for audit purposes',
        permissions: [
          'controls.view',
          'evidence.view',
          'reports.view',
          'reports.export',
          'audit.view'
        ],
        userCount: 2,
        color: 'purple'
      },
      {
        id: 5,
        name: 'Department Manager',
        description: 'Manage controls assigned to their department only',
        permissions: [
          'controls.view',
          'controls.edit_department',
          'evidence.upload',
          'reports.view'
        ],
        userCount: 8,
        color: 'yellow'
      },
      {
        id: 6,
        name: 'Viewer',
        description: 'Read-only access to dashboard and assigned controls',
        permissions: [
          'controls.view_assigned',
          'dashboard.view'
        ],
        userCount: 45,
        color: 'gray'
      }
    ];
    setRoles(defaultRoles);

    // Initialize demo entities for multi-entity management
    const demoEntities = [
      {
        id: 1,
        name: "Acme Corp (Parent)",
        type: "parent",
        region: "Global",
        frameworks: ["NIST_800-53", "ISO27001", "SOC2"],
        employees: 500,
        parent_id: null
      },
      {
        id: 2,
        name: "Acme EU",
        type: "subsidiary",
        region: "Europe",
        frameworks: ["GDPR", "ISO27001"],
        employees: 150,
        parent_id: 1
      },
      {
        id: 3,
        name: "Acme US",
        type: "subsidiary",
        region: "North America",
        frameworks: ["SOC2", "HIPAA"],
        employees: 250,
        parent_id: 1
      },
      {
        id: 4,
        name: "Acme Asia",
        type: "subsidiary",
        region: "APAC",
        frameworks: ["ISO27001"],
        employees: 100,
        parent_id: 1
      }
    ];
    setEntities(demoEntities);
    setCurrentEntity(demoEntities[0]); // Default to parent

    // Initialize demo vendors
    const demoVendors = [
      {
        id: 1,
        name: "AWS",
        category: "Cloud Provider",
        risk_tier: "Critical",
        frameworks_covered: ["SOC2", "ISO27001", "HIPAA"],
        last_assessment: "2024-12-01",
        next_review: "2025-06-01",
        status: "Compliant",
        controls_inherited: ["DM-001", "DM-002", "BC-001"],
        contact: "aws-compliance@amazon.com",
        evidence: ["AWS SOC2 Type II Report", "ISO 27001 Certificate"]
      },
      {
        id: 2,
        name: "Okta",
        category: "Identity Provider",
        risk_tier: "Critical",
        frameworks_covered: ["SOC2", "ISO27001"],
        last_assessment: "2024-11-15",
        next_review: "2025-05-15",
        status: "Compliant",
        controls_inherited: ["AC-001", "AC-002", "AC-003"],
        contact: "compliance@okta.com",
        evidence: ["Okta SOC2 Report"]
      },
      {
        id: 3,
        name: "CrowdStrike",
        category: "Security Tool",
        risk_tier: "High",
        frameworks_covered: ["SOC2"],
        last_assessment: "2024-10-01",
        next_review: "2025-04-01",
        status: "Under Review",
        controls_inherited: ["EP-001", "IR-002"],
        contact: "security@crowdstrike.com",
        evidence: ["CrowdStrike SOC2 Report"]
      },
      {
        id: 4,
        name: "Salesforce",
        category: "SaaS Application",
        risk_tier: "Medium",
        frameworks_covered: ["SOC2", "ISO27001"],
        last_assessment: "2024-09-01",
        next_review: "2025-03-01",
        status: "Action Required",
        controls_inherited: ["DM-001", "AC-001"],
        contact: "trust@salesforce.com",
        evidence: []
      }
    ];
    setVendors(demoVendors);

    // Initialize API Integrations (data sources)
    const demoApiIntegrations = [
      {
        id: 1,
        name: "CrowdStrike Falcon API",
        vendor: "CrowdStrike",
        type: "EDR",
        status: "active",
        controls_covered: ["EP-001", "IR-002"],
        data_attributes: ["endpoint_status", "threat_detections", "incident_data"],
        last_sync: "2024-12-15T10:30:00Z",
        sync_frequency: "real-time",
        responsible_party: "SOC Team (External)",
        evidence_attribution: "CrowdStrike Falcon Console"
      },
      {
        id: 2,
        name: "Okta SCIM API",
        vendor: "Okta",
        type: "Identity",
        status: "active",
        controls_covered: ["AC-001", "AC-002", "AC-003"],
        data_attributes: ["user_mfa_status", "access_policies", "privileged_users"],
        last_sync: "2024-12-15T09:15:00Z",
        sync_frequency: "hourly",
        responsible_party: "IT Operations (Internal)",
        evidence_attribution: "Okta Admin Console"
      },
      {
        id: 3,
        name: "AWS CloudTrail API",
        vendor: "AWS",
        type: "Cloud",
        status: "active",
        controls_covered: ["AUD-001", "DM-001", "DM-002", "NET-001"],
        data_attributes: ["api_calls", "encryption_status", "network_config"],
        last_sync: "2024-12-15T11:00:00Z",
        sync_frequency: "15-minutes",
        responsible_party: "Cloud Security Team (Internal)",
        evidence_attribution: "AWS CloudTrail Logs"
      },
      {
        id: 4,
        name: "Qualys VMDR API",
        vendor: "Qualys",
        type: "Vulnerability",
        status: "active",
        controls_covered: ["VM-001", "VM-002"],
        data_attributes: ["vulnerability_scan_results", "patch_status", "asset_inventory"],
        last_sync: "2024-12-15T08:00:00Z",
        sync_frequency: "daily",
        responsible_party: "Vulnerability Management Team (Internal)",
        evidence_attribution: "Qualys VMDR Portal"
      },
      {
        id: 5,
        name: "Splunk SIEM API",
        vendor: "Splunk",
        type: "SIEM",
        status: "active",
        controls_covered: ["IR-002", "AUD-001"],
        data_attributes: ["security_events", "log_data", "incident_alerts"],
        last_sync: "2024-12-15T10:45:00Z",
        sync_frequency: "real-time",
        responsible_party: "SOC Team (External MDR)",
        evidence_attribution: "Splunk Enterprise Security"
      },
      {
        id: 6,
        name: "Microsoft Defender API",
        vendor: "Microsoft",
        type: "EDR",
        status: "active",
        controls_covered: ["EP-001"],
        data_attributes: ["endpoint_protection_status", "threat_intel"],
        last_sync: "2024-12-15T10:20:00Z",
        sync_frequency: "real-time",
        responsible_party: "SOC Team (External MDR)",
        evidence_attribution: "Microsoft 365 Security Center"
      }
    ];
    setApiIntegrations(demoApiIntegrations);

    // Initialize MDR/SOC Providers
    const demoSocProviders = [
      {
        id: 1,
        name: "Arctic Wolf MDR",
        type: "Managed Detection & Response",
        coverage: ["EP-001", "IR-002", "IR-001"],
        controls_responsible: ["EP-001", "IR-002"],
        service_level: "24/7 SOC",
        evidence_attribution: "Arctic Wolf Concierge Security Team",
        contact: "soc@arcticwolf.com",
        api_integrations: [1, 5, 6],
        responsibility_scope: "Threat detection, incident response, endpoint monitoring"
      },
      {
        id: 2,
        name: "Internal SOC Team",
        type: "Internal Security Operations",
        coverage: ["IR-001", "IR-002"],
        controls_responsible: ["IR-001"],
        service_level: "Business Hours",
        evidence_attribution: "Internal Security Operations Center",
        contact: "soc@company.com",
        api_integrations: [5],
        responsibility_scope: "Incident response coordination, threat analysis"
      }
    ];
    setMdrProviders(demoSocProviders);

    // Generate initial responsibility matrix
    generateResponsibilityMatrix();
  };

  const generateResponsibilityMatrix = () => {
    const matrix = [];
    
    controls.forEach(control => {
      // Determine ownership based on covered_by and api integrations
      let ownership = {
        primary: control.responsible_party || "Unassigned",
        secondary: [],
        data_source: [],
        evidence_attribution: []
      };

      // Check API integrations for this control
      const relatedApis = apiIntegrations.filter(api => 
        api.controls_covered.includes(control.id)
      );

      relatedApis.forEach(api => {
        ownership.data_source.push({
          integration: api.name,
          vendor: api.vendor,
          type: api.type,
          last_sync: api.last_sync,
          sync_frequency: api.sync_frequency
        });
        
        ownership.evidence_attribution.push(api.evidence_attribution);
        
        if (api.responsible_party && !ownership.secondary.includes(api.responsible_party)) {
          ownership.secondary.push(api.responsible_party);
        }
      });

      // Check MDR providers
      const relatedMdr = mdrProviders.filter(mdr =>
        mdr.controls_responsible.includes(control.id)
      );

      relatedMdr.forEach(mdr => {
        if (!ownership.secondary.includes(mdr.name)) {
          ownership.secondary.push(mdr.name);
        }
        ownership.evidence_attribution.push(mdr.evidence_attribution);
      });

      // Check vendor coverage
      const relatedVendors = vendors.filter(v =>
        v.controls_inherited.includes(control.id)
      );

      relatedVendors.forEach(vendor => {
        if (!ownership.secondary.includes(vendor.name)) {
          ownership.secondary.push(`${vendor.name} (Inherited)`);
        }
        ownership.evidence_attribution.push(...vendor.evidence);
      });

      // Determine shared responsibility
      const isShared = ownership.secondary.length > 0 || ownership.data_source.length > 0;
      
      matrix.push({
        control_id: control.id,
        control_name: control.control_name,
        category: control.category,
        priority: control.priority,
        frameworks: control.frameworks,
        status: control.status,
        ownership: ownership.primary,
        shared_responsibility: isShared,
        secondary_owners: ownership.secondary,
        data_sources: ownership.data_source,
        evidence_sources: [...new Set(ownership.evidence_attribution)],
        coverage_type: relatedMdr.length > 0 ? "MDR/SOC Managed" : 
                      relatedVendors.length > 0 ? "Vendor Inherited" :
                      ownership.data_source.length > 0 ? "API Data Attribution" :
                      "Internal",
        auto_mapped: control.auto_mapped
      });
    });

    setResponsibilityMatrix(matrix);
  };

  const calculateComplianceScores = () => {
    const scores = {};
    
    Object.keys(FRAMEWORK_LIBRARY).forEach(framework => {
      const frameworkControls = controls.filter(c => 
        c.frameworks.some(f => f.startsWith(framework))
      );
      
      if (frameworkControls.length === 0) {
        scores[framework] = 0;
        return;
      }
      
      const compliantCount = frameworkControls.filter(c => 
        c.status === "Implemented" || c.status === "Vendor Managed"
      ).length;
      
      const partialCount = frameworkControls.filter(c => 
        c.status === "Partially Implemented"
      ).length;
      
      // Compliant = 100%, Partial = 50%, Non-Compliant = 0%
      const score = ((compliantCount + (partialCount * 0.5)) / frameworkControls.length) * 100;
      scores[framework] = Math.round(score * 10) / 10;
    });
    
    setComplianceScores(scores);
  };
  const generateRecommendations = () => {
    const recs = [];
    
    // Identify critical gaps
    const criticalGaps = controls.filter(c => 
      c.priority === "Critical" && (c.status === "Not Implemented" || c.status === "Partial")
    );
    
    if (criticalGaps.length > 0) {
      // Find recommended vendors for these gaps
      const vendorRecommendations = generateVendorRecommendations(criticalGaps);
      
      recs.push({
        type: "critical",
        title: "Critical Controls Not Implemented",
        description: `${criticalGaps.length} critical controls require immediate attention`,
        controls: criticalGaps.map(c => c.id),
        priority: 1,
        vendorRecommendations: vendorRecommendations.slice(0, 3),
        estimatedImpact: `Addressing these gaps could improve compliance score by ${Math.round((criticalGaps.length / controls.length) * 100)}%`,
        suggestedActions: [
          `Implement ${criticalGaps.filter(c => c.category === "Access Control").length} Access Control measures immediately`,
          `Deploy ${criticalGaps.filter(c => c.category === "Endpoint Security").length} Endpoint Security solutions`,
          `Configure ${criticalGaps.filter(c => c.category === "Data Management").length} Data Encryption controls`
        ]
      });
    }
    
    // Identify high-priority gaps
    const highGaps = controls.filter(c => 
      c.priority === "High" && (c.status === "Not Implemented" || c.status === "Partial")
    );
    
    if (highGaps.length > 0) {
      const vendorRecommendations = generateVendorRecommendations(highGaps);
      
      recs.push({
        type: "high-priority",
        title: "High-Priority Controls Requiring Attention",
        description: `${highGaps.length} high-priority controls should be addressed within 60 days`,
        controls: highGaps.map(c => c.id),
        priority: 2,
        vendorRecommendations: vendorRecommendations.slice(0, 2),
        estimatedImpact: `Complete implementation would increase compliance coverage by ${Math.round((highGaps.length / controls.length) * 30)}%`,
        suggestedActions: [
          `Prioritize controls that cover multiple frameworks for maximum ROI`,
          `Consider vendor solutions that can address ${highGaps.filter(c => c.mapped_fields.length > 0).length} automatable controls`
        ]
      });
    }
    
    // Identify unassigned controls
    const unassigned = controls.filter(c => 
      !c.responsible_party || c.responsible_party === "Unassigned"
    );
    
    if (unassigned.length > 0) {
      recs.push({
        type: "assignment",
        title: "Unassigned Controls",
        description: `${unassigned.length} controls need ownership assignment`,
        controls: unassigned.map(c => c.id),
        priority: 3,
        suggestedActions: [
          `Assign ${unassigned.filter(c => c.category === "Access Control").length} Access Control items to Security Operations`,
          `Assign ${unassigned.filter(c => c.category === "Infrastructure Team").length} Infrastructure items to Network/Infrastructure Team`
        ]
      });
    }
    
    // Identify missing evidence
    const noEvidence = controls.filter(c => 
      (c.status === "Implemented" || c.status === "Partially Implemented") && !c.evidence_link
    );
    
    if (noEvidence.length > 0) {
      recs.push({
        type: "evidence",
        title: "Missing Evidence Documentation",
        description: `${noEvidence.length} implemented controls lack evidence links`,
        controls: noEvidence.map(c => c.id),
        priority: 4,
        suggestedActions: [
          `Collect screenshots or exports for ${noEvidence.filter(c => c.category === "Access Control").length} Access Control implementations`,
          `Link automated evidence sources for ${noEvidence.filter(c => c.auto_mapped).length} auto-mapped controls`
        ]
      });
    }
    
    // Vendor optimization recommendations
    const vendorOptimization = analyzeVendorCoverage();
    if (vendorOptimization.canOptimize) {
      recs.push({
        type: "optimization",
        title: "Vendor Coverage Optimization",
        description: vendorOptimization.message,
        priority: 5,
        vendorRecommendations: vendorOptimization.recommendedVendors,
        estimatedSavings: `Potential annual savings: $${vendorOptimization.estimatedSavings.toLocaleString()}`,
        suggestedActions: vendorOptimization.actions
      });
    }
    
    setRecommendations(recs.sort((a, b) => a.priority - b.priority));
  };
  const generateVendorRecommendations = (gapControls) => {
    // Vendor to control mapping
    const vendorControlMap = {
      "Okta": { controls: ["AC-001", "AC-002", "AC-003"], price: 2400, category: "Identity", priority: 1 },
      "CrowdStrike": { controls: ["EP-001", "IR-002"], price: 1500, category: "EDR", priority: 1 },
      "AWS Config": { controls: ["DM-001", "DM-002", "NET-001", "AUD-001"], price: 500, category: "Cloud", priority: 1 },
      "Qualys": { controls: ["VM-001", "VM-002"], price: 2000, category: "Vulnerability", priority: 2 },
      "SentinelOne": { controls: ["EP-001"], price: 1200, category: "EDR", priority: 2 },
      "Splunk": { controls: ["IR-002", "AUD-001"], price: 3000, category: "SIEM", priority: 2 },
      "Varonis": { controls: ["DM-001", "AC-003"], price: 4000, category: "Data Security", priority: 3 },
      "Cloudflare": { controls: ["NET-001", "DM-002"], price: 200, category: "Network", priority: 3 },
      "Palo Alto Networks": { controls: ["NET-001", "DM-002"], price: 5000, category: "Firewall", priority: 3 },
      "Rapid7": { controls: ["VM-001", "IR-002"], price: 2500, category: "Security", priority: 3 }
    };

    const recommendations = [];
    
    gapControls.forEach(control => {
      Object.entries(vendorControlMap).forEach(([vendorName, vendorData]) => {
        if (vendorData.controls.includes(control.id)) {
          const existing = recommendations.find(r => r.vendor === vendorName);
          if (existing) {
            existing.controlsCovered.push(control.id);
            existing.controlsList.push(control);
          } else {
            recommendations.push({
              vendor: vendorName,
              controlsCovered: [control.id],
              controlsList: [control],
              monthlyPrice: vendorData.price,
              category: vendorData.category,
              priority: vendorData.priority,
              roi: calculateVendorROI(vendorData, [control]),
              frameworks: control.frameworks.length,
              automatable: control.mapped_fields.length > 0
            });
          }
        }
      });
    });

    // Sort by priority, then by ROI
    return recommendations.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.roi - a.roi;
    });
  };

  const calculateVendorROI = (vendorData, controls) => {
    const implementationCost = controls.reduce((sum, c) => sum + (c.priority === "Critical" ? 8000 : 2000), 0);
    const annualCost = vendorData.price * 12;
    const riskReduction = controls.reduce((sum, c) => sum + (c.priority === "Critical" ? 5000 : 2000), 0);
    const roi = ((riskReduction - annualCost) / annualCost * 100);
    return Math.round(roi);
  };
  const analyzeVendorCoverage = () => {
    const gaps = controls.filter(c => c.status === "Not Implemented" || c.status === "Partial");
    const vendorRecommendations = generateVendorRecommendations(gaps);
    
    // Calculate potential savings by consolidating vendors
    const vendorGroups = {};
    vendorRecommendations.forEach(rec => {
      if (!vendorGroups[rec.category]) {
        vendorGroups[rec.category] = [];
      }
      vendorGroups[rec.category].push(rec);
    });

    let estimatedSavings = 0;
    const actions = [];
    
    // Suggest consolidating by category
    Object.entries(vendorGroups).forEach(([category, vendors]) => {
      if (vendors.length > 1) {
        const totalMonthly = vendors.reduce((sum, v) => sum + v.monthlyPrice, 0);
        const recommended = vendors.sort((a, b) => b.roi - a.roi)[0];
        const savings = (totalMonthly - recommended.monthlyPrice) * 12;
        if (savings > 0) {
          estimatedSavings += savings;
          actions.push(`Consider ${recommended.vendor} to cover ${vendors.length} ${category} needs (potential savings: $${savings.toLocaleString()}/yr)`);
        }
      }
    });

    return {
      canOptimize: estimatedSavings > 0 || vendorRecommendations.length > 0,
      message: `${vendorRecommendations.length} vendors recommended to address ${gaps.length} compliance gaps`,
      recommendedVendors: vendorRecommendations,
      estimatedSavings,
      actions
    };
  };

  const calculateTCO = async () => {
    const inputs = tcoInputs;
    
    // If backend is connected, get cost prediction from backend
    if (backendConnected && currentUser.id) {
      try {
        // Estimate storage based on current data
        const estimatedStorage = inputs.numAssets * 0.2; // 200MB per asset
        
        // Estimate API requests based on sync frequency
        const apiRequests = inputs.numAssets * 24 * 30; // Rough estimate
        
        const costPrediction = await api.predictCosts({
          num_users: 1, // Single organization
          avg_storage_gb_per_user: estimatedStorage,
          api_requests_per_month: apiRequests,
          retention_days: inputs.retentionYears * 365
        });
        
        // Use backend prediction for storage and API costs
        const backendStorageCost = costPrediction.monthly.storage;
        const backendApiCost = costPrediction.monthly.api_requests;
        const backendComputeCost = costPrediction.monthly.compute;
        
        // Continue with existing TCO calculation but use backend costs where applicable
        // We'll merge backend predictions with local calculations
      } catch (error) {
        console.warn('Could not get cost prediction from backend, using local calculation:', error);
      }
    }
    
    // Original TCO calculation continues...
    
    // Pricing tiers based on asset count
    let platformTier = 'Starter';
    let platformMonthlyCost = 499;
    
    if (inputs.numAssets > 500) {
      platformTier = 'Enterprise';
      platformMonthlyCost = 2499;
    } else if (inputs.numAssets > 200) {
      platformTier = 'Growth';
      platformMonthlyCost = 1299;
    }
    
    // Tool licensing (average per endpoint/seat)
    const avgToolCostPerSeat = 8; // $8/endpoint/month average (EDR, RMM, etc.)
    const toolLicensingMonthly = inputs.numAssets * avgToolCostPerSeat * inputs.numVendorTools * 0.3; // 30% of tools need per-seat
    
    // Storage costs for evidence retention
    // Use backend prediction if available, otherwise calculate locally
    let totalStorageMonthly;
    let s3StandardGB, glacierGB, storageGBTotal;
    let backendCosts = null;
    
    // Try to get backend costs if connected
    if (backendConnected && currentUser.id) {
      try {
        const estimatedStorage = inputs.numAssets * 0.2;
        const apiRequests = inputs.numAssets * 24 * 30;
        const costPrediction = await api.predictCosts({
          num_users: 1,
          avg_storage_gb_per_user: estimatedStorage,
          api_requests_per_month: apiRequests,
          retention_days: inputs.retentionYears * 365
        });
        backendCosts = costPrediction;
      } catch (error) {
        console.warn('Could not get cost prediction from backend, using local calculation:', error);
      }
    }
    
    if (backendCosts && backendCosts.monthly && backendCosts.monthly.storage) {
      // Use backend storage cost breakdown
      totalStorageMonthly = typeof backendCosts.monthly.storage === 'object' 
        ? (backendCosts.monthly.storage.total || 0)
        : backendCosts.monthly.storage;
      const storageGBPerMonth = (inputs.numAssets * 0.05);
      storageGBTotal = storageGBPerMonth * 12 * inputs.retentionYears;
      s3StandardGB = storageGBPerMonth * 6;
      glacierGB = storageGBTotal - s3StandardGB;
    } else {
      // Calculate locally (demo mode)
      const storageGBPerMonth = (inputs.numAssets * 0.05);
      storageGBTotal = storageGBPerMonth * 12 * inputs.retentionYears;
      s3StandardGB = storageGBPerMonth * 6;
      glacierGB = storageGBTotal - s3StandardGB;
      const s3StandardCost = s3StandardGB * 0.023;
      const glacierCost = glacierGB * 0.004;
      totalStorageMonthly = s3StandardCost + glacierCost;
    }
    
    // Compute costs (AI mapping + workers)
    // Use backend prediction if available
    let totalComputeMonthly;
    if (backendCosts && backendCosts.monthly && backendCosts.monthly.compute) {
      totalComputeMonthly = backendCosts.monthly.compute;
    } else {
      // Calculate locally (demo mode)
      const baseComputeCost = 50;
      const assetComputeCost = Math.ceil(inputs.numAssets / 100) * 10;
      const cloudComputeCost = inputs.numCloudAccounts * 20;
      const aiAPICost = inputs.numAssets * 0.05; // $0.05 per asset for AI mapping calls
      totalComputeMonthly = baseComputeCost + assetComputeCost + cloudComputeCost + aiAPICost;
    }
    
    // Labor costs
    // Hours per control to remediate: 4 hours average
    const nonCompliantControls = controls.filter(c => 
      c.status === "Not Implemented" || c.status === "Non-Compliant" || c.status === "Partial"
    ).length;
    
    const hoursToRemediate = nonCompliantControls * 4;
    const avgHourlyRate = 125; // $125/hour for security engineer
    const laborCostOneTime = hoursToRemediate * avgHourlyRate;
    
    // Audit engagement costs (external auditors)
    const auditCostPerEngagement = 15000; // $15k per audit
    const annualAuditCost = inputs.auditsPerYear * auditCostPerEngagement;
    
    // SLA premium
    const slaPremium = inputs.desiredSLA === '99.99' ? 500 : 0; // $500/month for 99.99% SLA
    
    // Onboarding/Professional Services
    const psHourlyRate = 200;
    const onboardingCostOneTime = inputs.onboardingHours * psHourlyRate;
    
    // Monthly recurring costs
    const monthlyRecurring = 
      platformMonthlyCost + 
      toolLicensingMonthly + 
      totalStorageMonthly + 
      totalComputeMonthly + 
      slaPremium;
    
    // Annual costs
    const annualRecurring = monthlyRecurring * 12 + annualAuditCost;
    
    // One-time costs
    const oneTimeCosts = laborCostOneTime + onboardingCostOneTime;
    
    // 3-year TCO
    const threeYearTCO = (annualRecurring * 3) + oneTimeCosts;
    
    // Cost per asset
    const costPerAssetMonthly = monthlyRecurring / inputs.numAssets;
    const costPerAssetAnnual = annualRecurring / inputs.numAssets;
    
    // ROI calculation (vs manual compliance)
    const manualComplianceFTECost = 150000; // Annual salary for compliance person
    const manualToolsCost = toolLicensingMonthly * 12 * 1.5; // 50% more tools needed manually
    const manualAuditCost = annualAuditCost * 1.3; // 30% higher audit costs due to lack of automation
    const manualAnnualCost = manualComplianceFTECost + manualToolsCost + manualAuditCost;
    
    const annualSavings = manualAnnualCost - annualRecurring;
    const roi = ((annualSavings / annualRecurring) * 100).toFixed(1);
    const paybackMonths = (oneTimeCosts / (annualSavings / 12)).toFixed(1);
    
    setTcoResults({
      platformTier,
      monthly: {
        platform: platformMonthlyCost,
        toolLicensing: toolLicensingMonthly,
        storage: totalStorageMonthly,
        compute: totalComputeMonthly,
        slaPremium: slaPremium,
        total: monthlyRecurring
      },
      annual: {
        recurring: annualRecurring,
        audits: annualAuditCost,
        total: annualRecurring
      },
      oneTime: {
        onboarding: onboardingCostOneTime,
        remediation: laborCostOneTime,
        total: oneTimeCosts
      },
      threeYear: {
        total: threeYearTCO,
        perAsset: (threeYearTCO / inputs.numAssets / 36).toFixed(2)
      },
      perAsset: {
        monthly: costPerAssetMonthly.toFixed(2),
        annual: costPerAssetAnnual.toFixed(2)
      },
      roi: {
        annualSavings: annualSavings,
        roiPercent: roi,
        paybackMonths: paybackMonths,
        manualCost: manualAnnualCost
      },
      storage: {
        s3GB: (s3StandardGB || 0).toFixed(2),
        glacierGB: (glacierGB || 0).toFixed(2),
        totalGB: (storageGBTotal || 0).toFixed(2)
      },
      backendConnected: backendConnected,
      backendCosts: backendCosts,
      labor: {
        hoursRequired: hoursToRemediate,
        controlsToRemediate: nonCompliantControls
      }
    });
  };

  const updateTCOInput = (field, value) => {
    setTcoInputs({
      ...tcoInputs,
      [field]: value
    });
  };
  const generateAutomationPlan = () => {
    // Get all non-compliant controls (works with demo data)
    const gapControls = controls.filter(c => 
      c.status === "Not Implemented" || c.status === "Non-Compliant" || c.status === "Partial"
    );
    
    // If no gap controls found, use demo data
    if (gapControls.length === 0) {
      // Use a subset of controls as demo gaps
      const demoGaps = controls.slice(0, Math.min(10, controls.length)).map(c => ({
        ...c,
        status: "Partial"
      }));
      gapControls.push(...demoGaps);
    }

    // Risk scoring algorithm
    const scoredControls = gapControls.map(control => {
      let riskScore = 0;
      let costImpact = 0;
      let timeEstimate = 4; // Base hours per control

      // Priority weight (40% of score)
      if (control.priority === "Critical") {
        riskScore += 40;
        costImpact += 5000; // Higher audit finding cost
        timeEstimate = 8;
      } else if (control.priority === "High") {
        riskScore += 25;
        costImpact += 2000;
        timeEstimate = 6;
      } else {
        riskScore += 10;
        costImpact += 500;
        timeEstimate = 4;
      }

      // Category risk weight (30% of score)
      const highRiskCategories = ["Access Control", "Data Management", "Incident Response", "Endpoint Security"];
      if (highRiskCategories.includes(control.category)) {
        riskScore += 30;
        costImpact += 3000;
      } else {
        riskScore += 15;
        costImpact += 1000;
      }

      // Framework coverage weight (20% of score)
      const frameworkCount = control.frameworks.length;
      riskScore += Math.min(frameworkCount * 5, 20);

      // Auto-mappability weight (10% of score) - easier = higher priority
      if (control.mapped_fields && control.mapped_fields.length > 0) {
        riskScore += 10;
        timeEstimate = Math.ceil(timeEstimate * 0.5); // 50% faster with automation
        costImpact = Math.ceil(costImpact * 0.7); // 30% cost reduction
      }

      // Calculate ROI of fixing this control
      const implementationCost = timeEstimate * 125; // $125/hr
      const annualRiskReduction = costImpact;
      const roi = ((annualRiskReduction - implementationCost) / implementationCost * 100);

      return {
        ...control,
        riskScore,
        costImpact,
        timeEstimate,
        implementationCost,
        roi,
        automatable: control.mapped_fields && control.mapped_fields.length > 0
      };
    });

    // Sort by risk score (highest first)
    const prioritized = scoredControls.sort((a, b) => b.riskScore - a.riskScore);

    // Group into phases (30/60/90 day plan)
    const phase1 = prioritized.filter(c => c.priority === "Critical").slice(0, 5);
    const phase2 = prioritized.filter(c => c.priority === "High" || (c.priority === "Critical" && !phase1.includes(c))).slice(0, 8);
    const phase3 = prioritized.filter(c => !phase1.includes(c) && !phase2.includes(c)).slice(0, 10);

    // Calculate phase costs and timelines
    const calculatePhaseMetrics = (phase) => ({
      controls: phase.length,
      totalHours: phase.reduce((sum, c) => sum + c.timeEstimate, 0),
      totalCost: phase.reduce((sum, c) => sum + c.implementationCost, 0),
      riskReduction: phase.reduce((sum, c) => sum + c.costImpact, 0),
      automatable: phase.filter(c => c.automatable).length
    });

    const phase1Metrics = calculatePhaseMetrics(phase1);
    const phase2Metrics = calculatePhaseMetrics(phase2);
    const phase3Metrics = calculatePhaseMetrics(phase3);

    // Quick wins - high ROI, low effort
    const quickWins = prioritized
      .filter(c => c.automatable && c.timeEstimate <= 4)
      .slice(0, 5)
      .map(c => ({
        ...c,
        reason: "High automation potential with minimal manual effort"
      }));

    // Critical blockers - must-fix for audit
    const criticalBlockers = prioritized
      .filter(c => c.priority === "Critical" && c.frameworks.some(f => f.includes("SOC2") || f.includes("ISO")))
      .slice(0, 3)
      .map(c => ({
        ...c,
        reason: "Audit failure risk - required for certification"
      }));

    setAutomationPlan({
      generated: new Date().toISOString(),
      summary: {
        totalControls: gapControls.length,
        totalHours: prioritized.reduce((sum, c) => sum + c.timeEstimate, 0),
        totalCost: prioritized.reduce((sum, c) => sum + c.implementationCost, 0),
        potentialSavings: prioritized.reduce((sum, c) => sum + c.costImpact, 0),
        automatable: prioritized.filter(c => c.automatable).length,
        avgRoi: (prioritized.reduce((sum, c) => sum + c.roi, 0) / prioritized.length).toFixed(1)
      },
      phases: {
        phase1: {
          name: "Phase 1: Critical Controls (30 Days)",
          timeline: "Days 1-30",
          controls: phase1,
          metrics: phase1Metrics,
          focus: "Address critical security gaps and audit blockers"
        },
        phase2: {
          name: "Phase 2: High-Priority Controls (60 Days)",
          timeline: "Days 31-60",
          controls: phase2,
          metrics: phase2Metrics,
          focus: "Strengthen security posture and framework coverage"
        },
        phase3: {
          name: "Phase 3: Remaining Controls (90 Days)",
          timeline: "Days 61-90",
          controls: phase3,
          metrics: phase3Metrics,
          focus: "Complete compliance requirements and optimize"
        }
      },
      quickWins,
      criticalBlockers,
      prioritizedList: prioritized,
      recommendations: [
        {
          title: "Prioritize Automation",
          description: `${prioritized.filter(c => c.automatable).length} controls can be automated, saving ~${Math.round(prioritized.filter(c => c.automatable).reduce((sum, c) => sum + c.timeEstimate, 0) * 0.5)} hours`,
          impact: "high"
        },
        {
          title: "Focus on Multi-Framework Controls",
          description: `Controls covering 3+ frameworks provide maximum compliance value`,
          impact: "medium"
        },
        {
          title: "Front-Load Critical Controls",
          description: `${phase1.length} critical controls in Phase 1 reduce audit risk by ${((phase1Metrics.riskReduction / prioritized.reduce((sum, c) => sum + c.costImpact, 0)) * 100).toFixed(0)}%`,
          impact: "high"
        }
      ]
    });
  };

  const frameworks = ["ALL", ...Object.keys(FRAMEWORK_LIBRARY)];
  
  const statusColors = {
    "Implemented": "bg-green-500/10 text-green-500 border-green-500/20",
    "Compliant": "bg-green-500/10 text-green-500 border-green-500/20",
    "Partially Implemented": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    "Partial": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    "Not Implemented": "bg-red-500/10 text-red-500 border-red-500/20",
    "Non-Compliant": "bg-red-500/10 text-red-500 border-red-500/20",
    "Vendor Managed": "bg-blue-500/10 text-blue-500 border-blue-500/20"
  };
  const ALERT_ACTION_ICONS = {
    Sparkles,
    UserCheck,
    ClipboardList,
    FileCheck,
    ExternalLink,
    Activity,
    Target,
    Link2,
  };

  const matrixEntriesById = useMemo(() => {
    const map = new Map();
    responsibilityMatrix.forEach(entry => {
      map.set(entry.control_id, entry);
    });
    return map;
  }, [responsibilityMatrix]);

  const controlsWithResponsibility = useMemo(() => {
    return controls.map(control => {
      const matrixEntry = matrixEntriesById.get(control.id);
      const fallbackEntry = {
        control_id: control.id,
        control_name: control.control_name,
        category: control.category,
        priority: control.priority,
        frameworks: control.frameworks || [],
        status: control.status,
        ownership: control.responsible_party || "Unassigned",
        shared_responsibility: false,
        secondary_owners: [],
        data_sources: [],
        evidence_sources: [],
        coverage_type: "Internal"
      };
      return {
        ...control,
        responsibility: matrixEntry || fallbackEntry
      };
    });
  }, [controls, matrixEntriesById]);

  const ownerOptions = useMemo(() => {
    const owners = new Set();
    controls.forEach(control => {
      if (control.responsible_party) {
        owners.add(control.responsible_party);
      }
    });
    responsibilityMatrix.forEach(entry => {
      if (entry.ownership) {
        owners.add(entry.ownership);
      }
      (entry.secondary_owners || []).forEach(owner => {
        if (owner) {
          owners.add(owner);
        }
      });
    });
    return Array.from(owners).sort((a, b) => a.localeCompare(b));
  }, [controls, responsibilityMatrix]);

  const dataSourceOptions = useMemo(() => {
    const sources = new Set();
    responsibilityMatrix.forEach(entry => {
      (entry.data_sources || []).forEach(ds => {
        if (ds.integration) {
          sources.add(ds.integration);
        }
      });
    });
    return Array.from(sources).sort((a, b) => a.localeCompare(b));
  }, [responsibilityMatrix]);

  const statusOptions = useMemo(() => {
    const statuses = new Set();
    controlsWithResponsibility.forEach(control => {
      const normalizedStatus = control.status || "Not Set";
      statuses.add(normalizedStatus);
    });
    return Array.from(statuses).sort((a, b) => a.localeCompare(b));
  }, [controlsWithResponsibility]);
  const alertRiskSnapshot = useMemo(() => {
    if (selectedAlertDetail?.risk_snapshot) {
      return selectedAlertDetail.risk_snapshot;
    }
    if (!selectedAlert) {
      return null;
    }
    const drift = selectedAlert.drift_payload || {};
    const guidance = selectedAlert.remediation_guidance || [];
    return {
      severity: selectedAlert.severity || 'medium',
      drift_percentage: drift.drift_percentage ?? null,
      baseline_score: drift.baseline_score ?? selectedAlert.compliance_score_before ?? null,
      current_score: drift.current_score ?? selectedAlert.compliance_score_after ?? null,
      risk_owner: selectedAlert.responsible_party || 'Unassigned',
      affected_assets: drift.affected_assets ?? null,
      automation_impact: guidance.filter((item) => item.automation_ready).length,
    };
  }, [selectedAlert, selectedAlertDetail]);

  const alertTimeline = useMemo(() => {
    if (selectedAlertDetail?.timeline?.length) {
      return selectedAlertDetail.timeline;
    }
    if (!selectedAlert) {
      return [];
    }
    const events = [];
    const baseId = selectedAlert.id || 'alert';
    const createdAt = selectedAlert.created_at;
    const acknowledgedAt = selectedAlert.acknowledged_at;
    const updatedAt = selectedAlert.updated_at || (selectedAlert.status === 'resolved' ? selectedAlert.resolved_at : null);
    if (createdAt) {
      events.push({
        id: `${baseId}-created`,
        timestamp: createdAt,
        actor: selectedAlert.triggered_by || 'Monitoring Engine',
        event: 'Alert Triggered',
        status: 'open',
        notes: selectedAlert.description || 'Alert raised by monitoring engine.',
        evidence_links: [],
      });
    }
    if (acknowledgedAt) {
      events.push({
        id: `${baseId}-ack`,
        timestamp: acknowledgedAt,
        actor: selectedAlert.responsible_party || 'Compliance Bot',
        event: 'Acknowledged',
        status: 'in_progress',
        notes: 'Alert acknowledged and remediation guidance prepared.',
        evidence_links: [],
      });
    }
    if (updatedAt && (!createdAt || updatedAt !== createdAt)) {
      events.push({
        id: `${baseId}-update`,
        timestamp: updatedAt,
        actor: selectedAlert.updated_by || selectedAlert.responsible_party || 'Compliance Team',
        event: selectedAlert.status === 'resolved' ? 'Resolved' : 'Updated',
        status: selectedAlert.status || 'open',
        notes: selectedAlert.status === 'resolved'
          ? 'All remediation steps completed and evidence captured.'
          : 'Alert status updated with latest remediation progress.',
        evidence_links: [],
      });
    }
    return events;
  }, [selectedAlert, selectedAlertDetail]);

  const alertQuickActions = useMemo(() => {
    if (selectedAlertDetail?.actions?.length) {
      return selectedAlertDetail.actions;
    }
    return [
      { id: 'guidance', label: 'View Guidance', icon: 'Sparkles', description: 'Review AI-generated remediation steps' },
      { id: 'assign', label: 'Assign Owner', icon: 'UserCheck', description: 'Assign resolver and set due date' },
      { id: 'ticket', label: 'Open Change Ticket', icon: 'ClipboardList', description: 'Create change or incident record' },
      { id: 'evidence', label: 'Request Evidence', icon: 'FileCheck', description: 'Trigger automated evidence capture' },
    ];
  }, [selectedAlertDetail]);
  const alertFirstDetectedTs = selectedAlertDetail?.first_detected || selectedAlert?.created_at || null;
  const alertLastUpdatedTs =
    selectedAlertDetail?.last_updated ||
    selectedAlert?.updated_at ||
    selectedAlert?.resolved_at ||
    selectedAlert?.created_at ||
    null;
  const priorityGuidance = selectedAlert?.remediation_guidance || [];

  const totalControls = controlsWithResponsibility.length;
  const sharedControlsCount = controlsWithResponsibility.filter(control => control.responsibility.shared_responsibility).length;
  const apiAttributedCount = controlsWithResponsibility.filter(control => control.responsibility.data_sources.length > 0).length;
  const vendorInheritedCount = controlsWithResponsibility.filter(control => control.responsibility.coverage_type === "Vendor Inherited").length;
  const mdrManagedCount = controlsWithResponsibility.filter(control => control.responsibility.coverage_type === "MDR/SOC Managed").length;
  const apiCoverageCount = controlsWithResponsibility.filter(control => control.responsibility.coverage_type === "API Data Attribution").length;
  const internalCoverageCount = controlsWithResponsibility.filter(control => control.responsibility.coverage_type === "Internal").length;
  const soloControlsCount = Math.max(totalControls - sharedControlsCount, 0);
  const noApiControlsCount = Math.max(totalControls - apiAttributedCount, 0);
  const unassignedControlsCount = controlsWithResponsibility.filter(control => {
    const owner = control.responsible_party || control.responsibility.ownership;
    return !owner || owner === "Unassigned";
  }).length;

  const coverageSegments = [
    { key: "Internal", label: "Internal", count: internalCoverageCount, color: "#4C51BF" },
    { key: "Vendor Inherited", label: "Vendor Inherited", count: vendorInheritedCount, color: "#0EA5E9" },
    { key: "MDR/SOC Managed", label: "MDR / SOC", count: mdrManagedCount, color: "#F97316" },
    { key: "API Data Attribution", label: "API Data", count: apiCoverageCount, color: "#8B5CF6" }
  ].filter(segment => segment.count > 0);

  const coverageTotal = coverageSegments.reduce((sum, segment) => sum + segment.count, 0);
  const ownershipSegments = [
    { key: "SHARED", label: "Shared Ownership", count: sharedControlsCount, color: "#F97316" },
    { key: "SOLO", label: "Single Owner", count: soloControlsCount, color: "#22C55E" }
  ].filter(segment => segment.count > 0);
  const ownershipTotal = ownershipSegments.reduce((sum, segment) => sum + segment.count, 0);
  let coverageGradient = "";
  if (coverageTotal > 0) {
    let currentAngle = 0;
    coverageGradient = coverageSegments
      .map((segment) => {
        const startAngle = currentAngle;
        const angle = (segment.count / coverageTotal) * 360;
        currentAngle += angle;
        return `${segment.color} ${startAngle}deg ${currentAngle}deg`;
      })
      .join(", ");
  }

  const coveragePieStyle =
    coverageTotal > 0
      ? { background: `conic-gradient(${coverageGradient})` }
      : {
          background:
            "radial-gradient(circle at center, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0.15) 65%, transparent 70%)"
        };

  let ownershipGradient = "";
  if (ownershipTotal > 0) {
    let currentAngle = 0;
    ownershipGradient = ownershipSegments
      .map((segment) => {
        const startAngle = currentAngle;
        const angle = (segment.count / ownershipTotal) * 360;
        currentAngle += angle;
        return `${segment.color} ${startAngle}deg ${currentAngle}deg`;
      })
      .join(", ");
  }

  const ownershipPieStyle =
    ownershipTotal > 0
      ? { background: `conic-gradient(${ownershipGradient})` }
      : {
          background:
            "radial-gradient(circle at center, rgba(34,197,94,0.35) 0%, rgba(34,197,94,0.15) 65%, transparent 70%)"
        };

  const sharedPercent = totalControls > 0 ? Math.round((sharedControlsCount / totalControls) * 100) : 0;
  const externalCoverageCount = vendorInheritedCount + mdrManagedCount;
  const coveragePercent = totalControls > 0 ? Math.round((coverageTotal / totalControls) * 100) : 0;
  const filtersAreDefault =
    controlOwnerFilter === "ALL" &&
    controlSharedFilter === "ALL" &&
    controlDataSourceFilter === "ALL" &&
    controlCoverageFilter === "ALL" &&
    controlStatusFilter === "ALL" &&
    selectedFramework === "ALL" &&
    !searchTerm;
  // quickStats defined within renderControls to access filtering handlers
 
  const filteredControls = controlsWithResponsibility.filter(control => {
    const matrix = control.responsibility;
    const matchesFramework = selectedFramework === "ALL" ||
      (control.frameworks || []).some(f => f.startsWith(selectedFramework));
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch = !lowerSearch ||
      control.control_name.toLowerCase().includes(lowerSearch) ||
      (control.description || "").toLowerCase().includes(lowerSearch) ||
      control.id.toLowerCase().includes(lowerSearch);
    const matchesOwner = controlOwnerFilter === "ALL" ||
      (matrix.ownership && matrix.ownership === controlOwnerFilter) ||
      (control.responsible_party && control.responsible_party === controlOwnerFilter) ||
      (matrix.secondary_owners || []).includes(controlOwnerFilter);
    const matchesShared = controlSharedFilter === "ALL" ||
      (controlSharedFilter === "SHARED" && matrix.shared_responsibility) ||
      (controlSharedFilter === "NOT_SHARED" && !matrix.shared_responsibility);
    const matchesDataSource = controlDataSourceFilter === "ALL" ||
      (controlDataSourceFilter === "HAS" && matrix.data_sources.length > 0) ||
      (controlDataSourceFilter === "NONE" && matrix.data_sources.length === 0) ||
      matrix.data_sources.some(ds => ds.integration === controlDataSourceFilter);
    const matchesCoverage =
      controlCoverageFilter === "ALL" ||
      matrix.coverage_type === controlCoverageFilter ||
      (controlCoverageFilter === "EXTERNAL" &&
        (matrix.coverage_type === "Vendor Inherited" || matrix.coverage_type === "MDR/SOC Managed"));
    const normalizedStatus = control.status || "Not Set";
    const matchesStatus = controlStatusFilter === "ALL" || normalizedStatus === controlStatusFilter;

    return matchesFramework && matchesSearch && matchesOwner && matchesShared && matchesDataSource && matchesCoverage && matchesStatus;
  });
  const handleNavigateControl = useCallback(
    (controlId, targetView = 'controls') => {
      if (!controlId) return;
      const normalizedId = controlId.trim();
      if (!normalizedId) return;

      const controlRecord = controlsWithResponsibility.find((c) => c.id === normalizedId);
      const matrixEntry = responsibilityMatrix.find((m) => m.control_id === normalizedId);

      if (targetView === 'controls') {
        setMobileMenuOpen(false);
        setSearchTerm(normalizedId);
        setSelectedFramework(() => {
          if (controlRecord && Array.isArray(controlRecord.frameworks) && controlRecord.frameworks.length > 0) {
            const firstFramework = controlRecord.frameworks[0];
            return typeof firstFramework === 'string' ? firstFramework.split(':')[0] : 'ALL';
          }
          return 'ALL';
        });
        setControlOwnerFilter('ALL');
        setControlSharedFilter('ALL');
        setControlDataSourceFilter('ALL');
        setControlCoverageFilter('ALL');
        setControlStatusFilter('ALL');
        setActiveView('controls');
        return;
      }

      if (targetView === 'responsibility') {
        setMobileMenuOpen(false);
        setMatrixFilterCategory('ALL');
        setMatrixFilterCoverageType('ALL');
        setMatrixFilterOwnership('ALL');

        if (matrixEntry) {
          const frameworksToExpand = Array.isArray(matrixEntry.frameworks)
            ? matrixEntry.frameworks.map((fw) => {
                const key = typeof fw === 'string' ? fw.split(':')[0] : fw;
                return FRAMEWORK_LIBRARY[key]?.name || key;
              })
            : [];

          setExpandedFrameworks((prev) => {
            const next = new Set(prev);
            frameworksToExpand.forEach((name) => {
              if (name) next.add(name);
            });
            return next;
          });

          setExpandedSections((prev) => {
            const next = new Set(prev);
            frameworksToExpand.forEach((name) => {
              if (name && matrixEntry.category) {
                next.add(`${name}-${matrixEntry.category}`);
              }
            });
            return next;
          });
        }

        setActiveView('responsibility');
      }
    },
    [
      controlsWithResponsibility,
      responsibilityMatrix,
      setActiveView,
      setControlCoverageFilter,
      setControlDataSourceFilter,
      setControlOwnerFilter,
      setControlSharedFilter,
      setControlStatusFilter,
      setMatrixFilterCategory,
      setMatrixFilterCoverageType,
      setMatrixFilterOwnership,
      setSearchTerm,
      setSelectedFramework,
      setExpandedFrameworks,
      setExpandedSections,
      setMobileMenuOpen
    ]
  );
  const updateControl = (id, field, value) => {
    setControls(controls.map(c => 
      c.id === id ? { ...c, [field]: value, last_updated: new Date().toISOString().split('T')[0] } : c
    ));
  };
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          if (uploadType === "controls") {
            importFrameworkControls(data);
          } else if (uploadType === "assets") {
            importAssetData(data);
          } else if (uploadType === "tools") {
            autoMapToolData(data);
          }
        } catch (error) {
          alert('Invalid JSON file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const importFrameworkControls = (data) => {
    if (data.framework && data.controls) {
      const newControls = data.controls.map((ctrl, idx) => ({
        id: ctrl.id || `CUSTOM-${idx}`,
        control_name: ctrl.name,
        description: ctrl.description || "",
        frameworks: [data.framework + ":" + ctrl.id],
        category: "Custom",
        priority: "Medium",
        mapped_fields: ctrl.mapped_fields || [],
        default_owner: ctrl.default_owner || "Unassigned",
        status: ctrl.status || "Partial",
        covered_by: "",
        responsible_party: ctrl.default_owner || "Unassigned",
        evidence_link: "",
        last_updated: new Date().toISOString().split('T')[0],
        auto_mapped: false
      }));
      
      setControls([...controls, ...newControls]);
      alert(`Imported ${newControls.length} controls from ${data.framework}`);
    }
    setShowUpload(false);
  };

  const importAssetData = (data) => {
    if (data.assets) {
      const newAssets = data.assets.map((asset, idx) => ({
        id: asset.id || idx + 1,
        name: asset.name || asset.id,
        type: asset.type || "Server",
        owner_id: users.find(u => u.email.includes(asset.owner?.toLowerCase()))?.id || 1,
        metadata: { tools: asset.tools, vuln_status: asset.vuln_status }
      }));
      
      setAssets([...assets, ...newAssets]);
      
      const updatedControls = [...controls];
      
      data.assets.forEach(asset => {
        if (asset.tools && asset.tools.length > 0) {
          const edrControl = updatedControls.find(c => c.id === "EP-001");
          if (edrControl && edrControl.status === "Partial") {
            edrControl.status = "Implemented";
            edrControl.covered_by = asset.tools.join(", ");
            edrControl.responsible_party = asset.owner || edrControl.default_owner;
            edrControl.auto_mapped = true;
          }
        }
        
        if (asset.vuln_status === "patched") {
          const vmControl = updatedControls.find(c => c.id === "VM-002");
          if (vmControl && vmControl.status !== "Implemented") {
            vmControl.status = "Implemented";
            vmControl.covered_by = "Patch Management";
            vmControl.responsible_party = asset.owner || vmControl.default_owner;
            vmControl.auto_mapped = true;
          }
        }
      });
      
      setControls(updatedControls);
      alert(`Imported ${data.assets.length} assets and auto-mapped to controls`);
    }
    setShowUpload(false);
  };
  const autoMapToolData = (toolData) => {
    const updatedControls = [...controls];
    const newApiIntegrations = [...apiIntegrations];
    let mappedCount = 0;
    let apiIntegrationAdded = false;
    
    Object.keys(toolData).forEach(toolKey => {
      const toolValue = toolData[toolKey];
      
      updatedControls.forEach(control => {
        if (control.status === "Implemented") return;
        
        control.mapped_fields.forEach(field => {
          const [category, fieldName] = field.split('.');
          
          if (toolKey.toLowerCase().includes(category.toLowerCase()) ||
              (typeof toolValue === 'object' && toolValue && toolValue[fieldName] !== undefined)) {
            
            if (toolValue === true || toolValue === "enabled" || toolValue === "active") {
              control.status = "Implemented";
              control.covered_by = toolKey;
              control.auto_mapped = true;
              mappedCount++;
              
              // Auto-create API integration if not exists
              const existingApi = newApiIntegrations.find(api => 
                api.name.toLowerCase().includes(toolKey.toLowerCase())
              );
              if (!existingApi && toolKey) {
                const newApi = {
                  id: Date.now(),
                  name: `${toolKey} API`,
                  vendor: toolKey,
                  type: category === "EDR" ? "EDR" : category === "SSO" ? "Identity" : "Security",
                  status: "active",
                  controls_covered: [control.id],
                  data_attributes: [fieldName],
                  last_sync: new Date().toISOString(),
                  sync_frequency: "real-time",
                  responsible_party: control.responsible_party || "Unassigned",
                  evidence_attribution: `${toolKey} Console`
                };
                newApiIntegrations.push(newApi);
                apiIntegrationAdded = true;
              }
            } else if (typeof toolValue === 'object' && toolValue && toolValue[fieldName]) {
              control.status = "Implemented";
              control.covered_by = toolKey;
              control.evidence_link = JSON.stringify(toolValue[fieldName]);
              control.auto_mapped = true;
              mappedCount++;
            }
          }
        });
      });
    });
    
    if (toolData.mfa_enabled || (toolData.SSO && toolData.SSO.MFA_Enabled)) {
      const mfaControl = updatedControls.find(c => c.id === "AC-002");
      if (mfaControl && mfaControl.status !== "Implemented") {
        mfaControl.status = "Implemented";
        const ssoProvider = toolData.sso_provider || "SSO Tool";
        mfaControl.covered_by = ssoProvider;
        mfaControl.auto_mapped = true;
        mappedCount++;
        
        // Add API integration
        if (!newApiIntegrations.find(api => api.name.includes("Okta") || api.name.includes("SSO"))) {
          newApiIntegrations.push({
            id: Date.now(),
            name: `${ssoProvider} SCIM API`,
            vendor: ssoProvider,
            type: "Identity",
            status: "active",
            controls_covered: ["AC-001", "AC-002", "AC-003"],
            data_attributes: ["user_mfa_status", "access_policies"],
            last_sync: new Date().toISOString(),
            sync_frequency: "hourly",
            responsible_party: "IT Operations (Internal)",
            evidence_attribution: `${ssoProvider} Admin Console`
          });
          apiIntegrationAdded = true;
        }
      }
    }
    
    if (toolData.edr_deployed || (toolData.EDR && toolData.EDR.Coverage)) {
      const edrControl = updatedControls.find(c => c.id === "EP-001");
      if (edrControl && edrControl.status !== "Implemented") {
        edrControl.status = "Implemented";
        const edrVendor = toolData.edr_vendor || "EDR Tool";
        edrControl.covered_by = edrVendor;
        edrControl.auto_mapped = true;
        mappedCount++;
      }
    }
    
    if ((toolData.Firewall && toolData.Firewall.Rules) || (toolData.Network && toolData.Network.Segmentation)) {
      const netControl = updatedControls.find(c => c.id === "NET-001");
      if (netControl && netControl.status !== "Implemented") {
        netControl.status = "Implemented";
        netControl.covered_by = "Firewall/Network";
        netControl.responsible_party = "Network Team";
        netControl.auto_mapped = true;
        mappedCount++;
      }
    }
    
    setControls(updatedControls);
    if (apiIntegrationAdded) {
      setApiIntegrations(newApiIntegrations);
      // If backend is connected, sync new integrations
      if (backendConnected && currentUser.id) {
        segmentApiDataToBackend();
      }
    }
    setShowUpload(false);
    alert(`Auto-mapped ${mappedCount} controls${apiIntegrationAdded ? ' and added API integrations' : ''} from tool data`);
  };

  // Sync responsibility matrix to backend
  const syncResponsibilityMatrixToBackend = async () => {
    if (!backendConnected || !currentUser.id) return;
    
    try {
      // Fetch existing matrix from backend
      const backendMatrix = await api.getResponsibilityMatrix(currentUser.id).catch(() => []);
      
      // For now, we'll just verify connection - full sync would require PUT endpoints
      console.log('Responsibility matrix synced with backend:', backendMatrix.length, 'entries');
    } catch (error) {
      console.error('Error syncing responsibility matrix:', error);
    }
  };

  // Segment API data and send to backend
  const segmentApiDataToBackend = async () => {
    if (!backendConnected || !currentUser.id || apiIntegrations.length === 0) return;
    
    try {
      // Create data sources for each API integration
      for (const apiIntegration of apiIntegrations) {
        if (apiIntegration.status === 'active') {
          try {
            // Create data source in backend
            const dataSource = await api.createDataSource(currentUser.id, {
              source_type: 'API',
              source_name: apiIntegration.name,
              vendor: apiIntegration.vendor,
              connection_info: {
                endpoint: apiIntegration.type,
                sync_frequency: apiIntegration.sync_frequency,
                last_sync: apiIntegration.last_sync
              },
              sync_frequency: apiIntegration.sync_frequency,
              metadata_tags: ['API_ATTRIBUTED', apiIntegration.type.toUpperCase()],
              responsible_party: apiIntegration.responsible_party
            }).catch(() => null); // Ignore if already exists
            
            if (dataSource && dataSource.id) {
              // Create data segments for each control this API covers
              for (const controlId of apiIntegration.controls_covered) {
                const control = controls.find(c => c.id === controlId);
                if (control) {
                  await api.createDataSegment(currentUser.id, {
                    data_source_id: dataSource.id,
                    control_id: controlId,
                    segment_name: `${apiIntegration.name} - ${controlId}`,
                    data_payload: {
                      api_name: apiIntegration.name,
                      vendor: apiIntegration.vendor,
                      data_attributes: apiIntegration.data_attributes,
                      last_sync: apiIntegration.last_sync
                    },
                    metadata_tags: ['API_ATTRIBUTED', apiIntegration.type.toUpperCase()],
                    data_classification: 'INTERNAL',
                    responsible_party: apiIntegration.responsible_party
                  }).catch(error => {
                    if (error.message.includes('CUI')) {
                      console.warn(`CUI data detected for ${controlId} - segment rejected`);
                    } else {
                      console.error(`Error creating segment for ${controlId}:`, error);
                    }
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error creating data source for ${apiIntegration.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error segmenting API data to backend:', error);
    }
  };

  // Fetch data segments for a control from backend
  const fetchControlSegments = async (controlId) => {
    if (!backendConnected || !currentUser.id) return [];
    
    try {
      const segments = await api.getSegmentsByControl(currentUser.id, controlId);
      return segments.map(s => ({
        api_name: s.source_name || JSON.parse(s.data_payload || '{}').api_name || 'Unknown',
        responsible_party: s.responsible_party,
        data_segment: Array.isArray(s.data_attributes) ? s.data_attributes : Object.keys(JSON.parse(s.data_payload || '{}')),
        last_sync: s.last_updated || s.last_sync,
        evidence_attribution: s.evidence_attribution || s.coverage_type,
        coverage_type: s.coverage_type || 'API Data Attribution'
      }));
    } catch (error) {
      console.error(`Error fetching segments for ${controlId}:`, error);
      return [];
    }
  };

  const toggleControlSelection = (id) => {
    const newSelection = new Set(selectedControls);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedControls(newSelection);
  };

  const applyBulkEdit = () => {
    if (selectedControls.size === 0) {
      alert("No controls selected");
      return;
    }
    
    const updatedControls = controls.map(c => {
      if (selectedControls.has(c.id)) {
        return {
          ...c,
          ...(bulkOwner && { responsible_party: bulkOwner }),
          ...(bulkStatus && { status: bulkStatus }),
          last_updated: new Date().toISOString().split('T')[0]
        };
      }
      return c;
    });
    
    setControls(updatedControls);
    setSelectedControls(new Set());
    setBulkEditMode(false);
    setBulkOwner("");
    setBulkStatus("");
    alert(`Updated ${selectedControls.size} controls`);
  };
  const generateReport = () => {
    const stats = {
      total: controls.length,
      implemented: controls.filter(c => c.status === "Implemented" || c.status === "Compliant").length,
      partial: controls.filter(c => c.status === "Partially Implemented" || c.status === "Partial").length,
      notImplemented: controls.filter(c => c.status === "Not Implemented" || c.status === "Non-Compliant").length,
      vendorManaged: controls.filter(c => c.status === "Vendor Managed").length,
      autoMapped: controls.filter(c => c.auto_mapped).length
    };

    const coverage = ((stats.implemented + stats.vendorManaged) / stats.total * 100).toFixed(1);
    
    const byCategory = {};
    const byOwner = {};
    
    controls.forEach(c => {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      if (c.responsible_party) {
        byOwner[c.responsible_party] = (byOwner[c.responsible_party] || 0) + 1;
      }
    });

    let reportHTML = `
      <html>
        <head>
          <title>Compliance Control Matrix Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            .header-info { background: #f9fafb; padding: 15px; margin-bottom: 20px; border-left: 4px solid #6366f1; }
            .summary { background: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #1e40af; }
            .stat { display: inline-block; margin: 10px 20px; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1e40af; }
            .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 13px; }
            th { background: #1e40af; color: white; font-weight: 600; }
            tr:nth-child(even) { background: #f9fafb; }
            .status-implemented, .status-compliant { background: #dcfce7; }
            .status-partial { background: #fef3c7; }
            .status-not, .status-non-compliant { background: #fee2e2; }
            .status-vendor { background: #dbeafe; }
            .auto-mapped { color: #059669; font-weight: 600; }
            .coverage-meter { background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden; margin: 10px 0; }
            .coverage-fill { background: linear-gradient(to right, #10b981, #059669); height: 100%; display: flex; align-items: center; padding-left: 15px; color: white; font-weight: bold; }
            .section { margin: 30px 0; padding: 20px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; }
            .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .score-card { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
            .score-value { font-size: 32px; font-weight: bold; color: #1e40af; }
          </style>
        </head>
        <body>
          <h1>Compliance Control Matrix Report</h1>
          
          <div class="header-info">
            <p><strong>Organization:</strong> ${currentUser.organization}</p>
            <p><strong>Generated By:</strong> ${currentUser.email} (${currentUser.role})</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Frameworks:</strong> ${Object.values(FRAMEWORK_LIBRARY).map(f => f.name).join(", ")}</p>
          </div>
          
          <div class="summary">
            <h2>Executive Summary</h2>
            <div class="stat">
              <div class="stat-label">Total Controls</div>
              <div class="stat-value">${stats.total}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Implemented</div>
              <div class="stat-value" style="color: #10b981;">${stats.implemented}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Partial</div>
              <div class="stat-value" style="color: #f59e0b;">${stats.partial}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Not Implemented</div>
              <div class="stat-value" style="color: #ef4444;">${stats.notImplemented}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Vendor Managed</div>
              <div class="stat-value" style="color: #3b82f6;">${stats.vendorManaged}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Auto-Mapped</div>
              <div class="stat-value" style="color: #059669;">${stats.autoMapped}</div>
            </div>
            
            <h3>Overall Compliance Coverage</h3>
            <div class="coverage-meter">
              <div class="coverage-fill" style="width: ${coverage}%;">${coverage}%</div>
            </div>
          </div>

          <div class="section">
            <h2>Compliance Scores by Framework</h2>
            <div class="score-grid">
              ${Object.entries(complianceScores).map(([fw, score]) => `
                <div class="score-card">
                  <div class="stat-label">${FRAMEWORK_LIBRARY[fw].name}</div>
                  <div class="score-value" style="color: ${score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}">${score}%</div>
                </div>
              `).join('')}
            </div>
          </div>

          <h2>Detailed Control Matrix</h2>
          <table>
            <tr>
              <th>Control ID</th>
              <th>Control Name</th>
              <th>Status</th>
              <th>Covered By</th>
              <th>Responsible Party</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Frameworks</th>
            </tr>
            ${controls.map(c => `
              <tr class="status-${c.status.toLowerCase().replace(' ', '-')}">
                <td><strong>${c.id}</strong></td>
                <td>${c.control_name}${c.auto_mapped ? ' <span class="auto-mapped">⚡ Auto</span>' : ''}</td>
                <td>${c.status}</td>
                <td>${c.covered_by || 'N/A'}</td>
                <td>${c.responsible_party || 'Unassigned'}</td>
                <td>${c.category}</td>
                <td>${c.priority}</td>
                <td style="font-size: 11px;">${c.frameworks.map(f => f.split(':')[0]).join(', ')}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;

    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
  };

  const exportJSON = () => {
    const exportData = {
      user: currentUser,
      controls,
      assets,
      users,
      complianceScores,
      recommendations,
      metadata: {
        exported: new Date().toISOString(),
        frameworks: FRAMEWORK_LIBRARY,
        stats: {
          total: controls.length,
          implemented: controls.filter(c => c.status === "Implemented" || c.status === "Compliant").length,
          coverage: ((controls.filter(c => c.status === "Implemented" || c.status === "Compliant" || c.status === "Vendor Managed").length / controls.length) * 100).toFixed(1) + "%"
        }
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compliance-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const exportResponsibilityMatrix = () => {
    let matrixHTML = `
      <html>
        <head>
          <title>Responsibility Matrix - ${currentUser.organization}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; }
            h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; background: #f3f4f6; padding: 12px; border-left: 4px solid #6366f1; }
            .header-info { background: #eff6ff; padding: 20px; margin-bottom: 20px; border-left: 4px solid #3b82f6; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #1e40af; color: white; font-weight: 600; position: sticky; top: 0; }
            tr:nth-child(even) { background: #f9fafb; }
            .shared { background: #fef3c7 !important; }
            .mdr { background: #dbeafe !important; }
            .vendor { background: #dcfce7 !important; }
            .internal { background: #f3f4f6 !important; }
            .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin: 2px; }
            .tag-primary { background: #3b82f6; color: white; }
            .tag-secondary { background: #10b981; color: white; }
            .tag-source { background: #6366f1; color: white; }
            @media print { body { margin: 20px; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>Responsibility & Data Attribution Matrix</h1>
            <p><strong>Organization:</strong> ${currentUser.organization}</p>
            <p><strong>Generated By:</strong> ${currentUser.email}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Purpose:</strong> Audit-ready responsibility matrix showing control ownership, data sources, and evidence attribution</p>
          </div>

          <h2>Executive Summary</h2>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0;">
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px;">Total Controls</div>
              <div style="font-size: 32px; font-weight: bold; color: #1e40af;">${responsibilityMatrix.length}</div>
            </div>
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px;">Shared Responsibility</div>
              <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${responsibilityMatrix.filter(m => m.shared_responsibility).length}</div>
            </div>
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px;">MDR/SOC Managed</div>
              <div style="font-size: 32px; font-weight: bold; color: #10b981;">${responsibilityMatrix.filter(m => m.coverage_type === "MDR/SOC Managed").length}</div>
            </div>
            <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px;">API Integrated</div>
              <div style="font-size: 32px; font-weight: bold; color: #6366f1;">${responsibilityMatrix.filter(m => m.data_sources.length > 0).length}</div>
            </div>
          </div>

          <h2>Detailed Responsibility Matrix</h2>
          <table>
            <thead>
              <tr>
                <th>Control ID</th>
                <th>Control Name</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Primary Owner</th>
                <th>Shared Responsibility</th>
                <th>Secondary Owners</th>
                <th>Data Sources (APIs)</th>
                <th>Coverage Type</th>
                <th>Evidence Attribution</th>
              </tr>
            </thead>
            <tbody>
              ${responsibilityMatrix.map(m => `
                <tr class="${m.coverage_type.toLowerCase().replace('/', '-')}">
                  <td><strong>${m.control_id}</strong></td>
                  <td>${m.control_name}</td>
                  <td>${m.category}</td>
                  <td><span class="tag" style="background: ${m.priority === 'Critical' ? '#fee2e2; color: #991b1b' : m.priority === 'High' ? '#fef3c7; color: #92400e' : '#e0e7ff; color: #3730a3'}">${m.priority}</span></td>
                  <td>${m.status}</td>
                  <td><span class="tag tag-primary">${m.ownership}</span></td>
                  <td>${m.shared_responsibility ? '<span style="color: #f59e0b; font-weight: bold;">✓ Yes</span>' : '<span style="color: #6b7280;">No</span>'}</td>
                  <td>
                    ${m.secondary_owners.map(owner => `<span class="tag tag-secondary">${owner}</span>`).join(' ') || '<span style="color: #9ca3af;">None</span>'}
                  </td>
                  <td>
                    ${m.data_sources.map(ds => `<span class="tag tag-source">${ds.integration} (${ds.vendor})</span>`).join(' ') || '<span style="color: #9ca3af;">None</span>'}
                  </td>
                  <td><strong>${m.coverage_type}</strong></td>
                  <td style="font-size: 11px;">
                    ${m.evidence_sources.map(source => `<div style="margin: 2px 0;">• ${source}</div>`).join('') || '<span style="color: #9ca3af;">No evidence sources</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>Data Source Details</h2>
          <table>
            <thead>
              <tr>
                <th>Integration Name</th>
                <th>Vendor</th>
                <th>Type</th>
                <th>Status</th>
                <th>Controls Covered</th>
                <th>Responsible Party</th>
                <th>Last Sync</th>
                <th>Sync Frequency</th>
                <th>Evidence Attribution</th>
              </tr>
            </thead>
            <tbody>
              ${apiIntegrations.map(api => `
                <tr>
                  <td><strong>${api.name}</strong></td>
                  <td>${api.vendor}</td>
                  <td>${api.type}</td>
                  <td><span style="color: #10b981; font-weight: bold;">${api.status}</span></td>
                  <td>${api.controls_covered.map(id => `<span class="tag" style="background: #6366f1; color: white;">${id}</span>`).join(' ')}</td>
                  <td>${api.responsible_party}</td>
                  <td>${new Date(api.last_sync).toLocaleString()}</td>
                  <td>${api.sync_frequency}</td>
                  <td>${api.evidence_attribution}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>MDR/SOC Provider Coverage</h2>
          <table>
            <thead>
              <tr>
                <th>Provider Name</th>
                <th>Type</th>
                <th>Service Level</th>
                <th>Controls Responsible</th>
                <th>Evidence Attribution</th>
                <th>Contact</th>
                <th>Responsibility Scope</th>
              </tr>
            </thead>
            <tbody>
              ${mdrProviders.map(mdr => `
                <tr>
                  <td><strong>${mdr.name}</strong></td>
                  <td>${mdr.type}</td>
                  <td>${mdr.service_level}</td>
                  <td>${mdr.controls_responsible.map(id => `<span class="tag" style="background: #10b981; color: white;">${id}</span>`).join(' ')}</td>
                  <td>${mdr.evidence_attribution}</td>
                  <td>${mdr.contact}</td>
                  <td>${mdr.responsibility_scope}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; padding: 20px; background: #f9fafb; border-top: 3px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 12px;">
              Generated by Compliance Automation Platform | ${currentUser.organization} | ${new Date().toLocaleDateString()}
            </p>
            <p style="color: #6b7280; font-size: 11px; margin-top: 10px;">
              This matrix is audit-ready and shows clear ownership, data attribution, and evidence sources for each compliance control.
            </p>
          </div>
        </body>
      </html>
    `;

    const matrixWindow = window.open('', '_blank');
    matrixWindow.document.write(matrixHTML);
    matrixWindow.document.close();
  };

  const stats = {
    total: controls.length,
    implemented: controls.filter(c => c.status === "Implemented" || c.status === "Compliant").length,
    vendorManaged: controls.filter(c => c.status === "Vendor Managed").length,
    autoMapped: controls.filter(c => c.auto_mapped).length
  };
  const coverage = controls.length > 0 ? ((stats.implemented + stats.vendorManaged) / stats.total * 100).toFixed(1) : 0;

  const exportAutomationPlan = () => {
    if (!automationPlan) return;

    const plan = automationPlan;
    let planHTML = `
      <html>
        <head>
          <title>Compliance Automation Plan - ${currentUser.organization}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; }
            h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; background: #f3f4f6; padding: 12px; border-left: 4px solid #6366f1; }
            h3 { color: #4b5563; margin-top: 20px; }
            .header-info { background: #eff6ff; padding: 20px; margin-bottom: 20px; border-left: 4px solid #3b82f6; border-radius: 4px; }
            .executive-summary { background: #f0fdf4; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #22c55e; }
            .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
            .stat-value { font-size: 32px; font-weight: bold; color: #1e40af; }
            .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-top: 5px; }
            .phase { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .phase-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
            .phase-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
            .metric { background: #f9fafb; padding: 10px; border-radius: 4px; text-align: center; }
            .control-item { background: #fafafa; border-left: 4px solid #6366f1; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .priority-critical { border-left-color: #ef4444; background: #fef2f2; }
            .priority-high { border-left-color: #f59e0b; background: #fffbeb; }
            .priority-medium { border-left-color: #3b82f6; background: #eff6ff; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 13px; }
            th { background: #f3f4f6; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>90-Day Compliance Automation Plan</h1>
            <p><strong>Organization:</strong> ${currentUser.organization}</p>
            <p><strong>Prepared For:</strong> ${currentUser.email}</p>
            <p><strong>Generated:</strong> ${new Date(plan.generated).toLocaleString()}</p>
          </div>

          <div class="executive-summary">
            <h2 style="margin-top: 0; background: none; padding: 0; border: none;">Executive Summary</h2>
            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-label">Controls to Implement</div>
                <div class="stat-value">${plan.summary.totalControls}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Hours Required</div>
                <div class="stat-value">${plan.summary.totalHours}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Implementation Cost</div>
                <div class="stat-value">${plan.summary.totalCost.toLocaleString()}</div>
              </div>
            </div>
          </div>

          ${Object.values(plan.phases).map((phase, phaseIdx) => `
            <div class="phase">
              <div class="phase-header">
                <h2 style="margin: 0; color: white; background: none; padding: 0; border: none;">${phase.name}</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">${phase.timeline} • ${phase.focus}</p>
              </div>

              <div class="phase-metrics">
                <div class="metric">
                  <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${phase.metrics.controls}</div>
                  <div style="font-size: 11px; color: #6b7280;">Controls</div>
                </div>
                <div class="metric">
                  <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${phase.metrics.totalHours}</div>
                  <div style="font-size: 11px; color: #6b7280;">Hours</div>
                </div>
                <div class="metric">
                  <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${phase.metrics.totalCost.toLocaleString()}</div>
                  <div style="font-size: 11px; color: #6b7280;">Cost</div>
                </div>
                <div class="metric">
                  <div style="font-size: 24px; font-weight: bold; color: #22c55e;">${phase.metrics.automatable}</div>
                  <div style="font-size: 11px; color: #6b7280;">Automatable</div>
                </div>
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const planWindow = window.open('', '_blank');
    planWindow.document.write(planHTML);
    planWindow.document.close();
  };
  const generateProjectTimeline = () => {
    const today = new Date();
    const milestones = [];
    
    // Get vendor recommendations for gaps (works with demo data)
    const gaps = controls.filter(c => c.status === "Not Implemented" || c.status === "Partial");
    const vendorRecommendations = generateVendorRecommendations(gaps.length > 0 ? gaps : controls.slice(0, 5));
    
    // Generate automation plan if it doesn't exist (for demo)
    let planToUse = automationPlan;
    if (!planToUse) {
      generateAutomationPlan();
      planToUse = automationPlan || {
        phases: {
          phase1: { controls: gaps.slice(0, 5) || controls.slice(0, 5), metrics: { totalHours: 40, totalCost: 5000 } },
          phase2: { controls: gaps.slice(5, 10) || controls.slice(5, 10), metrics: { totalHours: 60, totalCost: 7500 } },
          phase3: { controls: gaps.slice(10, 15) || controls.slice(10, 15), metrics: { totalHours: 50, totalCost: 6250 } }
        }
      };
    }
    
    milestones.push({
      id: 'start',
      name: 'Project Kickoff',
      date: today,
      type: 'start',
      status: 'completed',
      description: 'Initial assessment and planning complete',
      cost: 0,
      vendors: []
    });

    const phase1End = new Date(today);
    phase1End.setDate(phase1End.getDate() + 30);
    
    // Assign vendors to Phase 1
    const phase1Controls = planToUse.phases?.phase1?.controls || gaps.slice(0, 5) || controls.slice(0, 5);
    const phase1Vendors = vendorRecommendations
      .filter(v => v.controlsList && v.controlsList.some(c => phase1Controls.find(pc => pc.id === c.id)))
      .slice(0, 3);
    const phase1VendorCost = phase1Vendors.length > 0 
      ? phase1Vendors.reduce((sum, v) => sum + v.monthlyPrice, 0)
      : 2500; // Demo fallback
    const phase1Cost = (planToUse.phases?.phase1?.metrics?.totalCost || 5000) + (phase1VendorCost * 3);
    
    milestones.push({
      id: 'phase1-start',
      name: 'Phase 1: Critical Controls',
      date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
      type: 'phase',
      status: 'in-progress',
      description: `${phase1Controls.length} critical controls`,
      controls: phase1Controls.length,
      hours: planToUse.phases?.phase1?.metrics?.totalHours || 40,
      cost: phase1Cost,
      vendors: phase1Vendors,
      vendorCost: phase1VendorCost
    });

    milestones.push({
      id: 'phase1-complete',
      name: 'Phase 1 Complete',
      date: phase1End,
      type: 'milestone',
      status: 'upcoming',
      description: 'Critical gaps addressed',
      impact: 'critical',
      cost: 0,
      vendors: []
    });

    // Phase 2
    const phase2Start = new Date(phase1End);
    phase2Start.setDate(phase2Start.getDate() + 1);
    const phase2End = new Date(today);
    phase2End.setDate(phase2End.getDate() + 60);
    
    const phase2Controls = planToUse.phases?.phase2?.controls || gaps.slice(5, 10) || controls.slice(5, 10);
    const phase2Vendors = vendorRecommendations
      .filter(v => v.controlsList && v.controlsList.some(c => phase2Controls.find(pc => pc.id === c.id)))
      .slice(0, 2);
    const phase2VendorCost = phase2Vendors.length > 0 
      ? phase2Vendors.reduce((sum, v) => sum + v.monthlyPrice, 0)
      : 1500; // Demo fallback
    const phase2Cost = (planToUse.phases?.phase2?.metrics?.totalCost || 7500) + (phase2VendorCost * 2);
    
    milestones.push({
      id: 'phase2-start',
      name: 'Phase 2: High-Priority Controls',
      date: phase2Start,
      type: 'phase',
      status: 'upcoming',
      description: `${phase2Controls.length} high-priority controls`,
      controls: phase2Controls.length,
      hours: planToUse.phases?.phase2?.metrics?.totalHours || 60,
      cost: phase2Cost,
      vendors: phase2Vendors,
      vendorCost: phase2VendorCost
    });

    milestones.push({
      id: 'phase2-complete',
      name: 'Phase 2 Complete',
      date: phase2End,
      type: 'milestone',
      status: 'upcoming',
      description: 'Enhanced security posture',
      impact: 'high',
      cost: 0,
      vendors: []
    });

    // Phase 3
    const phase3Start = new Date(phase2End);
    phase3Start.setDate(phase3Start.getDate() + 1);
    const phase3End = new Date(today);
    phase3End.setDate(phase3End.getDate() + 90);
    
    const phase3Controls = planToUse.phases?.phase3?.controls || gaps.slice(10, 15) || controls.slice(10, 15);
    const phase3Vendors = vendorRecommendations
      .filter(v => v.controlsList && !phase1Vendors.some(pv => pv.vendor === v.vendor) && !phase2Vendors.some(pv => pv.vendor === v.vendor))
      .slice(0, 2);
    const phase3VendorCost = phase3Vendors.length > 0 
      ? phase3Vendors.reduce((sum, v) => sum + v.monthlyPrice, 0)
      : 1000; // Demo fallback
    const phase3Cost = (planToUse.phases?.phase3?.metrics?.totalCost || 6250) + (phase3VendorCost * 1);
    
    milestones.push({
      id: 'phase3-start',
      name: 'Phase 3: Remaining Controls',
      date: phase3Start,
      type: 'phase',
      status: 'upcoming',
      description: `${phase3Controls.length} remaining controls`,
      controls: phase3Controls.length,
      hours: planToUse.phases?.phase3?.metrics?.totalHours || 50,
      cost: phase3Cost,
      vendors: phase3Vendors,
      vendorCost: phase3VendorCost
    });

    milestones.push({
      id: 'phase3-complete',
      name: 'Project Complete',
      date: phase3End,
      type: 'complete',
      status: 'upcoming',
      description: 'Full compliance achieved',
      impact: 'critical',
      cost: 0,
      vendors: []
    });

    // Generate cost timeline data
    const timelineData = [];
    
    for (let day = 0; day <= 90; day += 5) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() + day);
      
      let cumulativeCost = 0;
      let vendorMonthlyCost = 0;
      let implementationCost = 0;
      
      // Calculate costs up to this point
      milestones.forEach(milestone => {
        if (milestone.date <= currentDate && milestone.cost) {
          cumulativeCost += milestone.cost;
          implementationCost += milestone.cost;
        }
        
        // Calculate vendor costs - monthly recurring
        if (milestone.date <= currentDate && milestone.vendorCost) {
          const daysSinceMilestone = Math.floor((currentDate - milestone.date) / (1000 * 60 * 60 * 24));
          const monthsSinceMilestone = Math.floor(daysSinceMilestone / 30);
          if (monthsSinceMilestone >= 0) {
            vendorMonthlyCost += milestone.vendorCost * Math.min(monthsSinceMilestone + 1, 3);
          }
        }
      });
      
      timelineData.push({
        day,
        date: currentDate.toISOString().split('T')[0],
        cumulativeCost: cumulativeCost + vendorMonthlyCost,
        vendorCost: vendorMonthlyCost,
        implementationCost: implementationCost,
        complianceScore: Math.min(100, Math.round((day / 90) * 85))
      });
    }

    const totalControls = (planToUse.phases?.phase1?.controls?.length || 0) + 
                          (planToUse.phases?.phase2?.controls?.length || 0) + 
                          (planToUse.phases?.phase3?.controls?.length || 0) || gaps.length || controls.length;
    const totalCost = (planToUse.phases?.phase1?.metrics?.totalCost || 0) + 
                      (planToUse.phases?.phase2?.metrics?.totalCost || 0) + 
                      (planToUse.phases?.phase3?.metrics?.totalCost || 0) || 18750;
    
    setProjectTimeline({
      milestones,
      timelineData,
      vendorRecommendations: vendorRecommendations,
      summary: {
        totalDuration: 90,
        totalMilestones: milestones.length,
        totalControls: totalControls,
        totalBudget: totalCost,
        totalVendorCost: vendorRecommendations.length > 0 
          ? vendorRecommendations.reduce((sum, v) => sum + v.monthlyPrice * 12, 0)
          : 50000 // Demo fallback
      }
    });
  };

  // Calculate Partner Growth Grade
  const calculatePartnerGrade = () => {
    const current = partnerGrowthHistory[partnerGrowthHistory.length - 1];
    const previous = partnerGrowthHistory.length > 1 ? partnerGrowthHistory[partnerGrowthHistory.length - 2] : null;
    
    if (!previous) {
      return {
        overallScore: current.overallScore,
        grade: getGradeFromScore(current.overallScore),
        growth: 0,
        metrics: {
          complianceGrowth: 0,
          controlsGrowth: 0,
          gapsClosedGrowth: 0,
          frameworksGrowth: 0,
          automationGrowth: 0
        },
        currentQuarter: current.quarter
      };
    }
    
    const growth = {
      overallScore: current.overallScore - previous.overallScore,
      complianceGrowth: current.complianceCoverage - previous.complianceCoverage,
      controlsGrowth: current.controlsImplemented - previous.controlsImplemented,
      gapsClosedGrowth: current.gapsClosed - previous.gapsClosed,
      frameworksGrowth: current.frameworksCovered - previous.frameworksCovered,
      automationGrowth: current.automationProgress - previous.automationProgress
    };
    
    return {
      overallScore: current.overallScore,
      grade: getGradeFromScore(current.overallScore),
      previousScore: previous.overallScore,
      growth: growth.overallScore,
      metrics: growth,
      currentQuarter: current.quarter
    };
  };
  
  const getGradeFromScore = (score) => {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    return 'D';
  };
  
  const exportQBRReport = () => {
    const gradeData = calculatePartnerGrade();
    const current = partnerGrowthHistory[partnerGrowthHistory.length - 1];
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QBR Report - Partner Growth</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; }
          h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; background: #f3f4f6; padding: 12px; border-left: 4px solid #6366f1; }
          .grade-circle { width: 200px; height: 200px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 48px; font-weight: bold; margin: 20px; }
          .grade-A { background: #10b981; color: white; }
          .grade-B { background: #3b82f6; color: white; }
          .grade-C { background: #f59e0b; color: white; }
          .grade-D { background: #ef4444; color: white; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #1e40af; color: white; font-weight: 600; }
          tr:nth-child(even) { background: #f9fafb; }
          .positive { color: #10b981; font-weight: bold; }
          .negative { color: #ef4444; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Quarterly Business Review (QBR) - Partner Growth Report</h1>
        <div style="text-align: center; margin: 40px 0;">
          <div class="grade-circle grade-${gradeData.grade[0]}">${gradeData.grade}</div>
          <div style="font-size: 24px; font-weight: bold; margin-top: 10px;">Overall Score: ${gradeData.overallScore}%</div>
          <div style="color: #6b7280; margin-top: 5px;">${current.quarter} ${new Date().getFullYear()}</div>
        </div>
        
        <h2>Growth Summary</h2>
        <table>
          <tr>
            <th>Metric</th>
            <th>Previous</th>
            <th>Current</th>
            <th>Growth</th>
          </tr>
          <tr>
            <td>Overall Score</td>
            <td>${gradeData.previousScore || 'N/A'}%</td>
            <td>${gradeData.overallScore}%</td>
            <td class="${gradeData.growth >= 0 ? 'positive' : 'negative'}">${gradeData.growth >= 0 ? '+' : ''}${gradeData.growth}%</td>
          </tr>
          <tr>
            <td>Compliance Coverage</td>
            <td>${partnerGrowthHistory[partnerGrowthHistory.length - 2]?.complianceCoverage || 'N/A'}%</td>
            <td>${current.complianceCoverage}%</td>
            <td class="${gradeData.metrics.complianceGrowth >= 0 ? 'positive' : 'negative'}">${gradeData.metrics.complianceGrowth >= 0 ? '+' : ''}${gradeData.metrics.complianceGrowth}%</td>
          </tr>
          <tr>
            <td>Controls Implemented</td>
            <td>${partnerGrowthHistory[partnerGrowthHistory.length - 2]?.controlsImplemented || 'N/A'}</td>
            <td>${current.controlsImplemented}</td>
            <td class="${gradeData.metrics.controlsGrowth >= 0 ? 'positive' : 'negative'}">${gradeData.metrics.controlsGrowth >= 0 ? '+' : ''}${gradeData.metrics.controlsGrowth}</td>
          </tr>
          <tr>
            <td>Gaps Closed</td>
            <td>${partnerGrowthHistory[partnerGrowthHistory.length - 2]?.gapsClosed || 'N/A'}</td>
            <td>${current.gapsClosed}</td>
            <td class="${gradeData.metrics.gapsClosedGrowth >= 0 ? 'positive' : 'negative'}">${gradeData.metrics.gapsClosedGrowth >= 0 ? '+' : ''}${gradeData.metrics.gapsClosedGrowth}</td>
          </tr>
          <tr>
            <td>Frameworks Covered</td>
            <td>${partnerGrowthHistory[partnerGrowthHistory.length - 2]?.frameworksCovered || 'N/A'}</td>
            <td>${current.frameworksCovered}</td>
            <td class="${gradeData.metrics.frameworksGrowth >= 0 ? 'positive' : 'negative'}">${gradeData.metrics.frameworksGrowth >= 0 ? '+' : ''}${gradeData.metrics.frameworksGrowth}</td>
          </tr>
          <tr>
            <td>Automation Progress</td>
            <td>${partnerGrowthHistory[partnerGrowthHistory.length - 2]?.automationProgress || 'N/A'}%</td>
            <td>${current.automationProgress}%</td>
            <td class="${gradeData.metrics.automationGrowth >= 0 ? 'positive' : 'negative'}">${gradeData.metrics.automationGrowth >= 0 ? '+' : ''}${gradeData.metrics.automationGrowth}%</td>
          </tr>
        </table>
        
        <h2>Historical Trend</h2>
        <table>
          <tr>
            <th>Date</th>
            <th>Quarter</th>
            <th>Overall Score</th>
            <th>Compliance Coverage</th>
            <th>Controls Implemented</th>
            <th>Gaps Closed</th>
          </tr>
          ${partnerGrowthHistory.map(snapshot => `
            <tr>
              <td>${new Date(snapshot.date).toLocaleDateString()}</td>
              <td>${snapshot.quarter}</td>
              <td>${snapshot.overallScore}%</td>
              <td>${snapshot.complianceCoverage}%</td>
              <td>${snapshot.controlsImplemented}</td>
              <td>${snapshot.gapsClosed}</td>
            </tr>
          `).join('')}
        </table>
        
        <div style="margin-top: 40px; padding: 20px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
          <h3 style="margin-top: 0;">Key Achievements</h3>
          <ul>
            ${gradeData.growth > 0 ? `<li>Overall score improved by ${gradeData.growth}% this quarter</li>` : ''}
            ${gradeData.metrics.complianceGrowth > 0 ? `<li>Compliance coverage increased by ${gradeData.metrics.complianceGrowth}%</li>` : ''}
            ${gradeData.metrics.gapsClosedGrowth > 0 ? `<li>Closed ${gradeData.metrics.gapsClosedGrowth} additional compliance gaps</li>` : ''}
            ${gradeData.metrics.automationGrowth > 0 ? `<li>Automation progress increased by ${gradeData.metrics.automationGrowth}%</li>` : ''}
          </ul>
        </div>
        
        <p style="margin-top: 40px; color: #6b7280; font-size: 12px;">
          Generated on ${new Date().toLocaleString()} for ${currentUser.organization}
        </p>
      </body>
      </html>
    `;
    
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(html);
    reportWindow.document.close();
  };
  
  // Update partner growth history when data changes
  useEffect(() => {
    if (controls.length === 0 || Object.keys(complianceScores).length === 0) return; // Wait for data to load
    
    // Calculate stats from controls
    const currentStats = {
      total: controls.length,
      implemented: controls.filter(c => c.status === "Implemented" || c.status === "Compliant").length,
      vendorManaged: controls.filter(c => c.status === "Vendor Managed").length,
      autoMapped: controls.filter(c => c.auto_mapped).length
    };
    const currentCoverage = currentStats.total > 0 
      ? parseFloat(((currentStats.implemented + currentStats.vendorManaged) / currentStats.total * 100).toFixed(1))
      : 0;
    
    const currentDate = new Date().toISOString().split('T')[0];
    setPartnerGrowthHistory(prev => {
      const lastSnapshot = prev[prev.length - 1];
      const currentGapsClosed = controls.filter(c => c.status === 'Compliant' || c.status === 'Implemented').length;
      const currentAutomation = currentStats.total > 0 ? Math.round((currentStats.autoMapped / currentStats.total) * 100) : 0;
      
      // Only update if it's a new day or if coverage changed significantly
      if (lastSnapshot.date !== currentDate || Math.abs(lastSnapshot.complianceCoverage - currentCoverage) > 2) {
        const newSnapshot = {
          date: currentDate,
          quarter: lastSnapshot.quarter,
          overallScore: Math.round(currentCoverage) || 82,
          complianceCoverage: Math.round(currentCoverage) || 78,
          controlsImplemented: currentStats.implemented || 65,
          gapsClosed: currentGapsClosed,
          frameworksCovered: Object.keys(complianceScores).length || 5,
          automationProgress: currentAutomation
        };
        
        // Only update if there's a meaningful change
        if (Math.abs(newSnapshot.overallScore - lastSnapshot.overallScore) > 1) {
          return [...prev.slice(-3), newSnapshot];
        }
      }
      return prev; // No change, return previous state
    });
  }, [complianceScores, controls]);

  const commandPaletteItems = useMemo(() => {
    const items = [
      {
        id: 'go-dashboard',
        title: 'Go to Dashboard',
        subtitle: 'View real-time metrics and KPIs',
        shortcut: 'D',
        action: () => setActiveView('dashboard'),
      },
      {
        id: 'open-controls',
        title: 'Open Controls & Responsibility Matrix',
        subtitle: 'Ownership filters, coverage, evidence',
        shortcut: 'C',
        action: () => setActiveView('controls'),
      },
      {
        id: 'open-architecture',
        title: 'Open Data Flow Architecture',
        subtitle: 'Interactive lineage map & IAM context',
        shortcut: 'A',
        action: () => setActiveView('architecture'),
      },
      {
        id: 'open-automation',
        title: 'Open Security-Compliance Alignment',
        subtitle: 'View AI playbooks and security event correlation',
        shortcut: 'P',
        action: () => setActiveView('csca'),
      },
      {
        id: 'generate-plan',
        title: automationPlan ? 'Regenerate Automation Plan' : 'Generate Automation Plan',
        subtitle: 'Refresh AI recommendations and phases',
        shortcut: 'G',
        action: () => generateAutomationPlan(),
      },
      {
        id: 'run-drift',
        title: 'Run Compliance Drift Check',
        subtitle: backendConnected ? 'Trigger drift detection via API' : 'Requires backend connection',
        shortcut: 'Shift+D',
        action: () => runDriftCheckCommand(),
        disabled: !backendConnected || !currentUser.id,
      },
      {
        id: 'view-alerts',
        title: 'View Alert Alignment',
        subtitle: 'Security signals mapped to controls',
        shortcut: 'S',
        action: () => setActiveView('csca'),
      },
      {
        id: 'open-iam',
        title: 'Open IAM & Permissions',
        subtitle: 'Manage roles, grants, and audits',
        shortcut: 'I',
        action: () => setActiveView('iam'),
      },
    ];
    return items;
  }, [automationPlan, backendConnected, currentUser.id]);
  const filteredCommands = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return commandPaletteItems;
    return commandPaletteItems.filter((command) => {
      return (
        command.title.toLowerCase().includes(query) ||
        (command.subtitle && command.subtitle.toLowerCase().includes(query)) ||
        (command.shortcut && command.shortcut.toLowerCase().includes(query))
      );
    });
  }, [commandPaletteItems, commandQuery]);
  useEffect(() => {
    setCommandHighlightIndex((idx) => {
      if (filteredCommands.length === 0) return 0;
      if (idx >= filteredCommands.length) {
        return filteredCommands.length - 1;
      }
      return idx;
    });
  }, [filteredCommands]);
  const handleCommandSelect = (command) => {
    if (!command || command.disabled) return;
    const result = command.action?.();
    if (result && typeof result.then === 'function') {
      result.finally(() => {
        if (!command.keepOpen) {
          setShowCommandPalette(false);
        }
      });
    } else if (!command.keepOpen) {
      setShowCommandPalette(false);
    }
  };
  const renderDashboard = () => {
    // Calculate stats and coverage
    const stats = {
      total: controls.length,
      implemented: controls.filter(c => c.status === "Implemented" || c.status === "Compliant").length,
      vendorManaged: controls.filter(c => c.status === "Vendor Managed").length,
      autoMapped: controls.filter(c => c.auto_mapped).length
    };
    const coverage = stats.total > 0 ? parseFloat(((stats.implemented + stats.vendorManaged) / stats.total * 100).toFixed(1)) : 0;
    
    const gaps = controls.filter(c => c.status === 'Not Implemented' || c.status === 'Non-Compliant' || c.status === 'Partial').length;
    const gapsChange = 5; // Example: 5 fewer gaps
    const complianceTrend = coverage >= 70 ? 12.5 : -5.2; // Example trend
    const gradeData = calculatePartnerGrade();
    const alertActivityEntries = actionableAlerts
      .map((alert) => {
        const timestamp = alert.updated_at || alert.last_updated || alert.resolved_at || alert.created_at;
        if (!timestamp) return null;
        return {
          id: `alert-${alert.id}`,
          type: 'alert',
          title: alert.title || alert.name || 'Compliance Alert',
          status: (alert.status || 'open').toLowerCase(),
          timestamp,
          description: alert.description,
          severity: (alert.severity || 'medium').toLowerCase(),
          framework: alert.framework || null,
        };
      })
      .filter(Boolean);
    const automationEntries = automationActivityLog.map((entry) => ({
      ...entry,
      type: 'automation',
    }));
    const recentActivity = [...alertActivityEntries, ...automationEntries]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
    
    return (
    <div className="space-y-6">
      {/* Partner Growth Grade Dial - QBR Ready */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Partner Growth Grade</h2>
            <p className="text-sm text-muted-foreground mt-1">QBR Tracking - {gradeData.currentQuarter} {new Date().getFullYear()}</p>
          </div>
          <button
            onClick={exportQBRReport}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export QBR Report
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Circular Grade Dial */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-64 h-64">
              <svg className="transform -rotate-90" width="256" height="256">
                {/* Background circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="100"
                  stroke="hsl(var(--muted))"
                  strokeWidth="20"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="100"
                  stroke={
                    gradeData.overallScore >= 80 ? 'hsl(142, 76%, 36%)' :
                    gradeData.overallScore >= 70 ? 'hsl(217, 91%, 60%)' :
                    gradeData.overallScore >= 60 ? 'hsl(45, 93%, 47%)' :
                    'hsl(0, 84%, 60%)'
                  }
                  strokeWidth="20"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 100}`}
                  strokeDashoffset={`${2 * Math.PI * 100 * (1 - gradeData.overallScore / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-6xl font-bold ${
                  gradeData.overallScore >= 80 ? 'text-green-500' :
                  gradeData.overallScore >= 70 ? 'text-blue-500' :
                  gradeData.overallScore >= 60 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>
                  {gradeData.grade}
                </div>
                <div className="text-2xl font-semibold text-foreground mt-2">
                  {gradeData.overallScore}%
                </div>
                <div className={`text-sm mt-1 ${
                  gradeData.growth >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {gradeData.growth >= 0 ? '+' : ''}{gradeData.growth}% from last quarter
                </div>
              </div>
            </div>
          </div>
          
          {/* Growth Metrics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Growth Metrics</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Compliance Coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {partnerGrowthHistory[partnerGrowthHistory.length - 1].complianceCoverage}%
                  </span>
                  {gradeData.metrics.complianceGrowth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    gradeData.metrics.complianceGrowth >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {gradeData.metrics.complianceGrowth >= 0 ? '+' : ''}{gradeData.metrics.complianceGrowth}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Controls Implemented</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {partnerGrowthHistory[partnerGrowthHistory.length - 1].controlsImplemented}
                  </span>
                  {gradeData.metrics.controlsGrowth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    gradeData.metrics.controlsGrowth >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {gradeData.metrics.controlsGrowth >= 0 ? '+' : ''}{gradeData.metrics.controlsGrowth}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Gaps Closed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {partnerGrowthHistory[partnerGrowthHistory.length - 1].gapsClosed}
                  </span>
                  {gradeData.metrics.gapsClosedGrowth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    gradeData.metrics.gapsClosedGrowth >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {gradeData.metrics.gapsClosedGrowth >= 0 ? '+' : ''}{gradeData.metrics.gapsClosedGrowth}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Frameworks Covered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {partnerGrowthHistory[partnerGrowthHistory.length - 1].frameworksCovered}
                  </span>
                  {gradeData.metrics.frameworksGrowth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    gradeData.metrics.frameworksGrowth >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {gradeData.metrics.frameworksGrowth >= 0 ? '+' : ''}{gradeData.metrics.frameworksGrowth}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Automation Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {partnerGrowthHistory[partnerGrowthHistory.length - 1].automationProgress}%
                  </span>
                  {gradeData.metrics.automationGrowth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    gradeData.metrics.automationGrowth >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {gradeData.metrics.automationGrowth >= 0 ? '+' : ''}{gradeData.metrics.automationGrowth}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Framework Metrics & Attention */}
        {(() => {
          const frameworksForDropdown = Object.entries(FRAMEWORK_LIBRARY).map(([frameworkKey, frameworkMeta]) => {
            const growth = frameworkGrowth[frameworkKey];
            const complianceScore = complianceScores[frameworkKey];
            const needsAttention = !!(growth?.drift_detected || (growth?.gaps_count ?? 0) > 0 || (complianceScore ?? 100) < 80);
            const growthDelta = growth ? (growth.current_score - (growth.previous_score ?? growth.current_score)) : 0;
            return {
              key: frameworkKey,
              name: frameworkMeta.name,
              growth,
              complianceScore,
              needsAttention,
              growthDelta,
            };
          });

          return (
            <div className="mt-8 pt-8 border-t border-[hsl(var(--border))]">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Framework Oversight</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track each framework's health, drift risk, and remediation urgency.
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                    <ChevronDown className="w-4 h-4" />
                    <span>Framework Attention Center</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 max-h-[420px] overflow-y-auto">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Summary of drift, coverage, and gaps by framework
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {frameworksForDropdown.map((fw) => (
                      <DropdownMenuItem
                        key={fw.key}
                        className="py-3 px-3 focus:bg-primary/10 focus:text-foreground"
                        onClick={() => {
                          setSelectedFramework(fw.key);
                          setActiveView('controls');
                        }}
                      >
                        <div className="w-full space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-foreground">{fw.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Coverage {fw.growth?.control_coverage?.toFixed?.(1) ?? '—'}% ·{' '}
                                {fw.growth?.controls_implemented ?? '—'}/{fw.growth?.controls_total ?? '—'} controls
                              </div>
                            </div>
                            {fw.needsAttention ? (
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                                Needs attention
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                                On track
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="rounded bg-muted/40 p-2 text-center">
                              <div className="text-muted-foreground">Score</div>
                              <div className="font-semibold text-foreground">
                                {fw.complianceScore != null ? `${fw.complianceScore}%` : '—'}
                              </div>
                            </div>
                            <div className="rounded bg-muted/40 p-2 text-center">
                              <div className="text-muted-foreground">Gaps</div>
                              <div className="font-semibold text-red-500">
                                {fw.growth?.gaps_count ?? '—'}
                              </div>
                            </div>
                            <div className="rounded bg-muted/40 p-2 text-center">
                              <div className="text-muted-foreground">Velocity</div>
                              <div className={`font-semibold ${
                                (fw.growth?.score_velocity ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {(fw.growth?.score_velocity ?? 0) >= 0 ? '+' : ''}
                                {fw.growth?.score_velocity?.toFixed?.(2) ?? '0.00'}
                              </div>
                            </div>
                          </div>
                          {fw.growth?.drift_detected && (
                            <div className="text-[11px] text-red-500">
                              ⚠️ Drift detected – {fw.growth?.drift_percentage?.toFixed?.(1) ?? fw.growth?.drift_percentage}% deviation from baseline.
                            </div>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })()}

        {/* Actionable Alerts */}
        {actionableAlerts.length > 0 && (
          <div className="mt-8 pt-8 border-t border-[hsl(var(--border))]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Actionable Alerts</h3>
                <p className="text-sm text-muted-foreground mt-1">Items requiring immediate attention</p>
              </div>
              <button
                onClick={async () => {
                  if (backendConnected && currentUser.id) {
                    try {
                      await api.checkComplianceDrift(currentUser.id);
                      await loadActionableAlerts();
                    } catch (error) {
                      console.error('Error checking drift:', error);
                    }
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
              >
                Check for Drift
              </button>
            </div>
            
            <div className="space-y-3">
              {actionableAlerts.slice(0, 5).map((alert) => {
                const severityColors = {
                  critical: 'bg-red-500/10 border-red-500/20',
                  high: 'bg-orange-500/10 border-orange-500/20',
                  medium: 'bg-yellow-500/10 border-yellow-500/20',
                  low: 'bg-blue-500/10 border-blue-500/20'
                };
                const statusColors = {
                  resolved: 'bg-green-500/10 border-green-500/20 text-green-500',
                  in_progress: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
                  open: 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                };
                const alertStatus = (alert.status || 'open');
                const statusBadgeClass = statusColors[alertStatus] || statusColors.open;
                const isResolved = alertStatus === 'resolved';
                const isAcknowledged = Boolean(alert.acknowledged);
                
                return (
                  <div key={alert.id} className={`border rounded-lg p-4 ${severityColors[alert.severity] || severityColors.medium}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          <h4 className="text-sm font-semibold text-foreground">{alert.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.severity === 'critical' ? 'bg-red-500 text-white' :
                            alert.severity === 'high' ? 'bg-orange-500 text-white' :
                            alert.severity === 'medium' ? 'bg-yellow-500 text-black' :
                            'bg-blue-500 text-white'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${statusBadgeClass}`}>
                            {alertStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>
                        
                        {alert.compliance_score_before !== null && alert.compliance_score_after !== null && (
                          <div className="flex items-center gap-2 text-xs mb-2">
                            <span className="text-muted-foreground">Score:</span>
                            <span className="text-foreground">{alert.compliance_score_before}</span>
                            <TrendingDown className="w-3 h-3 text-red-500" />
                            <span className="text-red-500">{alert.compliance_score_after}</span>
                            {alert.framework && (
                              <span className="text-muted-foreground ml-2">({alert.framework})</span>
                            )}
                          </div>
                        )}

                        {alert.drift_payload && (
                          <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-2 text-muted-foreground">
                            <span>Drift</span>
                            <span className="text-red-500 font-medium">
                              {alert.drift_payload.drift_percentage?.toFixed?.(1) ?? alert.drift_payload.drift_percentage}%
                            </span>
                            <span>Baseline</span>
                            <span className="text-foreground">
                              {alert.drift_payload.baseline_score?.toFixed?.(1) ?? alert.compliance_score_before}
                            </span>
                            <span>Current</span>
                            <span className="text-foreground">
                              {alert.drift_payload.current_score?.toFixed?.(1) ?? alert.compliance_score_after}
                            </span>
                          </div>
                        )}
                        
                        {/* Playbook Availability Indicator */}
                        {alertPlaybooksMap[alert.id] && alertPlaybooksMap[alert.id].length > 0 && (
                          <div className="flex items-center gap-2 text-xs mb-2 mt-2">
                            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-500">
                              <Sparkles className="w-3 h-3" />
                              <span className="font-medium">{alertPlaybooksMap[alert.id].length} playbook{alertPlaybooksMap[alert.id].length === 1 ? '' : 's'} available</span>
                            </div>
                            <span className="text-muted-foreground">
                              • Saves ~{alertPlaybooksMap[alert.id].reduce((sum, p) => sum + (p.estimated_time_minutes || 0), 0)} min
                            </span>
                          </div>
                        )}
                        
                        {alert.remediation_guidance && Array.isArray(alert.remediation_guidance) && alert.remediation_guidance.length > 0 && (
                          <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                            <div className="font-medium text-foreground mb-1">Top Priority Control:</div>
                            <div className="text-muted-foreground">
                              {alert.remediation_guidance[0].control_name} ({alert.remediation_guidance[0].priority})
                            </div>
                            {alert.remediation_guidance[0].remediation_steps && alert.remediation_guidance[0].remediation_steps.length > 0 && (
                              <div className="mt-2 text-muted-foreground">
                                Next: {alert.remediation_guidance[0].remediation_steps[0].action}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <button
                          onClick={() => openAlertRemediation(alert)}
                          disabled={isResolved}
                          className={`px-3 py-1 rounded text-xs font-medium border border-primary/40 transition-colors ${
                            isResolved
                              ? 'bg-muted text-muted-foreground cursor-not-allowed'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          Remediate
                        </button>
                        <button
                          onClick={async () => {
                            if (backendConnected && currentUser.id) {
                              try {
                                await api.acknowledgeComplianceAlert(alert.id, currentUser.id);
                                if (selectedAlertRef.current?.id === alert.id) {
                                  closeAlertRemediation();
                                }
                                await loadActionableAlerts();
                              } catch (error) {
                                console.error('Error acknowledging alert:', error);
                              }
                            }
                          }}
                          disabled={isAcknowledged || isResolved}
                          className={`px-3 py-1 bg-card border border-[hsl(var(--border))] rounded text-xs text-foreground hover:bg-muted transition-colors ${
                            isAcknowledged || isResolved ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {actionableAlerts.length > 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setActiveView('csca')}
                  className="text-sm text-primary hover:underline"
                >
                  View all {actionableAlerts.length} alerts →
                </button>
              </div>
            )}
          </div>
        )}

      {/* Recent Activity - Compact */}
      {recentActivity.length > 0 && (
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentActivity.slice(0, 3).map((entry, idx) => {
              const isAlert = entry.type === 'alert';
              const accentColor =
                isAlert && entry.severity === 'critical'
                  ? 'bg-red-500'
                  : isAlert && entry.severity === 'high'
                  ? 'bg-orange-500'
                  : isAlert
                  ? 'bg-blue-500'
                  : 'bg-emerald-500';
              return (
                <div key={`${entry.id}-${idx}`} className="flex items-start gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${accentColor} mt-1.5 shrink-0`}></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isAlert ? (
                        <AlertTriangle className="w-3 h-3 text-muted-foreground shrink-0" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-semibold text-foreground truncate">{entry.title}</span>
                      {entry.framework && (
                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] border border-[hsl(var(--border))] shrink-0">
                          {entry.framework}
                        </span>
                      )}
                    </div>
                    {entry.timestamp && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatRelative(entry.timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        {/* Historical Growth Chart */}
        {(() => {
          const ninetyDaysAgo = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 90);
            return d;
          })();
          const historicalWindow = partnerGrowthHistory.filter((snapshot) => {
            const snapshotDate = new Date(snapshot.date);
            return snapshotDate >= ninetyDaysAgo;
          });
          const chartPoints = (historicalWindow.length > 1 ? historicalWindow : partnerGrowthHistory).slice(-12);

          const chartWidth = 880;
          const chartHeight = 260;
          const paddingX = 48;
          const paddingY = 36;
          const effectiveWidth = chartWidth - paddingX * 2;
          const effectiveHeight = chartHeight - paddingY * 2;

          const minScore = chartPoints.reduce((min, point) => Math.min(min, point.overallScore), Infinity);
          const maxScore = chartPoints.reduce((max, point) => Math.max(max, point.overallScore), -Infinity);
          const scoreRange = maxScore - minScore || 1;

          const coordinates = chartPoints.map((point, index) => {
            const x =
              paddingX +
              (chartPoints.length <= 1
                ? effectiveWidth / 2
                : (effectiveWidth / (chartPoints.length - 1)) * index);
            const normalized = (point.overallScore - minScore) / scoreRange;
            const y = chartHeight - paddingY - normalized * effectiveHeight;
            return { x, y, label: point.date, score: point.overallScore };
          });

          const velocityAverage = chartPoints.length > 1
            ? chartPoints.slice(1).reduce((sum, point, index) => {
                const previous = chartPoints[index];
                return sum + (point.overallScore - previous.overallScore);
              }, 0) / (chartPoints.length - 1)
            : 0;

          const linePath = coordinates
            .map((coord, idx) => `${idx === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`)
            .join(' ');
          const areaPath =
            coordinates.length > 0
              ? `${linePath} L ${coordinates[coordinates.length - 1].x} ${chartHeight - paddingY} L ${coordinates[0].x} ${chartHeight - paddingY} Z`
              : '';

          const latestPoint = coordinates[coordinates.length - 1];
          const firstPoint = coordinates[0];
          const deltaScore = latestPoint && firstPoint ? latestPoint.score - firstPoint.score : 0;

          const xLabels = [
            coordinates[0],
            coordinates[Math.floor(coordinates.length / 2)],
            coordinates[coordinates.length - 1],
          ].filter(Boolean);

          return (
            <div className="mt-8 pt-8 border-t border-[hsl(var(--border))]">
              <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Historical Growth (Last 90 Days)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Rolling compliance score trend with daily velocity and drift insight.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                      <span>Overall Score</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-primary/20 border border-primary/40"></div>
                      <span>Target zone</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="w-full h-[260px]"
                    >
                      <defs>
                        <linearGradient id="growthArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <rect
                        x={paddingX}
                        y={paddingY}
                        width={effectiveWidth}
                        height={effectiveHeight}
                        fill="none"
                        stroke="hsl(var(--border))"
                        strokeDasharray="4 6"
                        strokeWidth="1"
                        rx="12"
                      />
                      {areaPath && (
                        <path
                          d={areaPath}
                          fill="url(#growthArea)"
                          stroke="none"
                        />
                      )}
                      {linePath && (
                        <path
                          d={linePath}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      )}
                      {coordinates.map((coord, idx) => (
                        <circle
                          key={coord.label}
                          cx={coord.x}
                          cy={coord.y}
                          r={idx === coordinates.length - 1 ? 5 : 3.2}
                          fill={idx === coordinates.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary))'}
                          stroke="hsl(var(--background))"
                          strokeWidth="1.5"
                        />
                      ))}
                      {xLabels.map((label) => (
                        <g key={label.label}>
                          <line
                            x1={label.x}
                            y1={chartHeight - paddingY}
                            x2={label.x}
                            y2={chartHeight - paddingY + 6}
                            stroke="hsl(var(--border))"
                            strokeWidth="1"
                          />
                          <text
                            x={label.x}
                            y={chartHeight - paddingY + 20}
                            textAnchor="middle"
                            className="text-[10px] fill-muted-foreground"
                          >
                            {new Date(label.label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="w-full lg:w-64 border border-[hsl(var(--border))] rounded-lg bg-muted/40 p-4 space-y-4">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">Current score</div>
                      <div className="text-3xl font-semibold text-foreground flex items-center gap-2">
                        {latestPoint?.score ?? '—'}%
                        {deltaScore !== 0 && (
                          <>
                            {deltaScore >= 0 ? (
                              <ArrowUpRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-500" />
                            )}
                            <span className={`text-sm font-medium ${deltaScore >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {deltaScore >= 0 ? '+' : ''}
                              {deltaScore.toFixed(1)} pts
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Compared to {firstPoint ? new Date(firstPoint.label).toLocaleDateString() : 'baseline'}
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span>90-day peak: <span className="text-foreground font-medium">
                          {Math.max(...chartPoints.map((p) => p.overallScore)).toFixed?.(1) ?? '—'}%
                        </span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <span>90-day low: <span className="text-foreground font-medium">
                          {Math.min(...chartPoints.map((p) => p.overallScore)).toFixed?.(1) ?? '—'}%
                        </span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <span>Velocity avg: <span className="text-foreground font-medium">
                          {velocityAverage >= 0 ? '+' : ''}
                          {velocityAverage.toFixed(2)}
                        </span> pts/change</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveView('timeline')}
                      className="w-full px-3 py-2 text-sm rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      View program timeline →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      {/* KPI Circular Metrics */}
      {(() => {
        const renderCircularStat = ({ label, displayValue, helperText, color, percentage }) => {
          const gradientPercent = Math.min(100, Math.max(0, percentage));
          return (
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-6 flex flex-col items-center text-center gap-4">
              <div
                className="relative h-32 w-32 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(${color} ${gradientPercent}%, rgba(148,163,184,0.15) ${gradientPercent}%)`,
                  boxShadow: 'inset 0 0 0 14px rgba(15,23,42,0.85)',
                }}
              >
                <div className="text-2xl font-semibold text-foreground">
                  {displayValue}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
                <div className="text-xs text-muted-foreground">{helperText}</div>
              </div>
            </div>
          );
        };

        const implementedPercent = stats.total > 0 ? (stats.implemented / stats.total) * 100 : 0;
        const gapsPercent = stats.total > 0 ? (gaps / stats.total) * 100 : 0;

        return (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {renderCircularStat({
              label: 'Total Controls',
              displayValue: stats.total.toString(),
              helperText: `${stats.total} controls across frameworks`,
              color: 'hsl(226 71% 40%)',
              percentage: stats.total > 0 ? 100 : 0,
            })}
            {renderCircularStat({
              label: 'Compliance Coverage',
              displayValue: `${coverage}%`,
              helperText: `${coverage}% across all mapped controls`,
              color: 'hsl(162 73% 46%)',
              percentage: coverage,
            })}
            {renderCircularStat({
              label: 'Controls Implemented',
              displayValue: stats.implemented.toString(),
              helperText: `${stats.implemented}/${stats.total} controls implemented`,
              color: 'hsl(161 84% 39%)',
              percentage: implementedPercent,
            })}
            {renderCircularStat({
              label: 'Active Gaps',
              displayValue: gaps.toString(),
              helperText: `${gaps} controls require remediation`,
              color: 'hsl(0 82% 55%)',
              percentage: Math.min(100, gapsPercent),
            })}
          </div>
        );
      })()}

      {/* AI Gap Analysis Section */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">AI-Powered Gap Analysis</h3>
            <p className="text-sm text-muted-foreground mt-1">Critical issues requiring immediate attention</p>
          </div>
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(() => {
            const criticalGaps = controls.filter(c => 
              (c.status === 'Not Implemented' || c.status === 'Non-Compliant' || c.status === 'Partial') 
              && c.priority === 'Critical'
            );
            const highGaps = controls.filter(c => 
              (c.status === 'Not Implemented' || c.status === 'Non-Compliant' || c.status === 'Partial') 
              && c.priority === 'High'
            );
            const spotlightGaps = criticalGaps.slice(0, 3).map((gap) => ({
              id: gap.id,
              name: gap.control_name,
              status: gap.status,
              owner: gap.responsible_party || gap.owner || 'Unassigned',
              frameworks: gap.frameworks || [],
            }));
            
            return (
              <>
                <div className="bg-muted/50 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-foreground">Critical Gaps</span>
                  </div>
                  <div className="text-2xl font-bold text-red-500">{criticalGaps.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Require immediate action</p>
                </div>
                <div className="bg-muted/50 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                    <span className="text-sm font-medium text-foreground">High Priority Gaps</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-500">{highGaps.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Should be addressed soon</p>
                </div>
                <div className="bg-muted/50 border border-[hsl(var(--border))] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-foreground">Total Implemented</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">{stats.implemented}</div>
                  <p className="text-xs text-muted-foreground mt-1">Controls in good standing</p>
                </div>

                {spotlightGaps.length > 0 && (
                  <div className="md:col-span-3 bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground">Spotlight Controls</span>
                      <button
                        onClick={() => setActiveView('csca')}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View playbooks →
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {spotlightGaps.map((gap) => (
                        <div
                          key={gap.id}
                          className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-foreground"
                        >
                          <div className="font-semibold text-red-500">{gap.name}</div>
                          <div className="text-muted-foreground mt-1">Status: {gap.status}</div>
                          <div className="text-muted-foreground mt-1">
                            Owner: <span className="text-foreground">{gap.owner}</span>
                          </div>
                          {gap.frameworks.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {gap.frameworks.slice(0, 3).map((fw) => (
                                <span
                                  key={fw}
                                  className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20"
                                >
                                  {fw}
                                </span>
                              ))}
                              {gap.frameworks.length > 3 && (
                                <span className="text-muted-foreground">+{gap.frameworks.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {recommendations.length > 0 && (() => {
        const visibleRecommendations = recommendations.slice(0, 5);
        const activeIndex = Math.min(selectedRecommendationIndex, visibleRecommendations.length - 1);
        const activeRecommendation = visibleRecommendations[activeIndex] || visibleRecommendations[0];

        return (
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">AI-Powered Recommendations</h3>
                <p className="text-sm text-muted-foreground">
                  Smart scenarios tailored to improve your compliance posture.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleRecommendations.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedRecommendationIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      idx === activeIndex
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Option {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {activeRecommendation && (
              <div className={`p-5 rounded-xl border transition-colors ${
                activeRecommendation.type === 'critical' ? 'bg-muted/30 border-red-500/30' :
                activeRecommendation.type === 'high-priority' ? 'bg-muted/30 border-yellow-500/30' :
                activeRecommendation.type === 'assignment' ? 'bg-muted/30 border-blue-500/30' :
                activeRecommendation.type === 'optimization' ? 'bg-muted/30 border-purple-500/30' :
                'bg-muted/30 border-[hsl(var(--border))]'
              }`}>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="font-semibold text-lg text-foreground">{activeRecommendation.title}</div>
                    <div className="text-sm text-muted-foreground">{activeRecommendation.description}</div>
                    {activeRecommendation.estimatedImpact && (
                      <div className="text-xs text-primary mt-2 font-medium">
                        💡 {activeRecommendation.estimatedImpact}
                      </div>
                    )}
                  </div>
                  <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${
                    activeRecommendation.type === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    activeRecommendation.type === 'high-priority' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                    'bg-muted text-foreground'
                  }`}>
                    Priority {activeRecommendation.priority}
                  </span>
                </div>

                {activeRecommendation.vendorRecommendations && activeRecommendation.vendorRecommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-sm font-semibold text-foreground mb-3">
                      💼 Recommended Vendors (Sorted by Priority & ROI):
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeRecommendation.vendorRecommendations.map((vendor, vIdx) => (
                        <div
                          key={vIdx}
                          className="bg-card rounded-lg p-3 border border-[hsl(var(--border))] hover:shadow-md transition-shadow"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-semibold text-foreground">{vendor.vendor}</div>
                            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded">
                              {vendor.category}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>💰 ${vendor.monthlyPrice.toLocaleString()}/mo</div>
                            <div>
                              📊 ROI:{' '}
                              <span className={`font-semibold ${vendor.roi > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {vendor.roi}%
                              </span>
                            </div>
                            <div>🎯 Covers: {vendor.controlsCovered.join(', ')}</div>
                            <div>📋 {vendor.controlsList.length} control{vendor.controlsList.length > 1 ? 's' : ''}</div>
                            {vendor.automatable && (
                              <div className="text-green-500 font-medium">⚡ Auto-mappable</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeRecommendation.suggestedActions && activeRecommendation.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                    <div className="text-sm font-semibold text-foreground mb-2">📝 Suggested Actions:</div>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                      {activeRecommendation.suggestedActions.map((action, aIdx) => (
                        <li key={aIdx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeRecommendation.estimatedSavings && (
                  <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-500 font-semibold">
                    💰 {activeRecommendation.estimatedSavings}
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Review AI playbooks in Security-Compliance Alignment to execute this recommendation.</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveView('csca')}
                      className="px-3 py-2 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      View Playbooks
                    </button>
                    <button
                      onClick={() => setActiveView('controls')}
                      className="px-3 py-2 rounded-md border border-[hsl(var(--border))] bg-card text-sm hover:bg-muted transition-colors"
                    >
                      View Related Controls
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
    );
  };
  const generateCostPlan = () => {
    if (!tcoResults) {
      calculateTCO();
      return;
    }

    // AI-powered cost optimization recommendations
    const aiRecommendations = [];
    
    // Analyze backend costs
    if (tcoResults.backendCosts) {
      const backendMonthly = tcoResults.backendCosts.monthly;
      const totalBackend = (backendMonthly.auth || 0) + 
        (typeof backendMonthly.storage === 'object' ? backendMonthly.storage.total : backendMonthly.storage || 0) +
        (backendMonthly.api_requests || 0) + 
        (backendMonthly.compute || 0) + 
        (backendMonthly.database || 0);
      
      if (totalBackend > tcoResults.monthly.total * 0.3) {
        aiRecommendations.push({
          type: 'cost_optimization',
          priority: 'high',
          title: 'Backend Costs High',
          description: `Backend infrastructure costs ($${totalBackend.toFixed(0)}/month) represent ${((totalBackend / tcoResults.monthly.total) * 100).toFixed(1)}% of total monthly costs.`,
          recommendation: 'Consider implementing data retention policies, API rate limiting, and storage tiering to reduce costs by 20-30%.',
          estimatedSavings: totalBackend * 0.25,
          implementationEffort: 'Medium',
          timeframe: '30-60 days'
        });
      }
    }

    // Analyze vendor tool costs
    const vendorCostEstimate = tcoInputs.numVendorTools * 500; // Rough estimate
    if (vendorCostEstimate > tcoResults.monthly.total * 0.4) {
      aiRecommendations.push({
        type: 'vendor_optimization',
        priority: 'high',
        title: 'Vendor Tool Consolidation',
        description: `Estimated vendor tool costs ($${vendorCostEstimate.toFixed(0)}/month) are high.`,
        recommendation: 'Review overlapping tool capabilities and consolidate to 3-4 core vendors. Consider vendor bundles with volume discounts.',
        estimatedSavings: vendorCostEstimate * 0.15,
        implementationEffort: 'High',
        timeframe: '60-90 days'
      });
    }

    // Analyze asset scaling
    if (tcoInputs.numAssets > 500) {
      aiRecommendations.push({
        type: 'scaling',
        priority: 'medium',
        title: 'Asset Scaling Opportunities',
        description: `With ${tcoInputs.numAssets} assets, volume discounts may apply.`,
        recommendation: 'Negotiate enterprise pricing tiers. Consider annual prepayment for 10-15% discount.',
        estimatedSavings: tcoResults.annual.total * 0.12,
        implementationEffort: 'Low',
        timeframe: '15-30 days'
      });
    }

    // Analyze compliance gaps cost impact
    const gapControls = controls.filter(c => 
      c.status === "Not Implemented" || c.status === "Non-Compliant" || c.status === "Partial"
    );
    if (gapControls.length > 10) {
      aiRecommendations.push({
        type: 'compliance_gaps',
        priority: 'critical',
        title: 'Compliance Gap Cost Impact',
        description: `${gapControls.length} controls are non-compliant, increasing audit risk and potential fines.`,
        recommendation: 'Prioritize critical controls (AC-*, SI-*, IR-*) to reduce audit findings and potential penalties by 40-60%.',
        estimatedSavings: gapControls.length * 2000, // Estimated audit finding cost
        implementationEffort: 'High',
        timeframe: '90-180 days'
      });
    }

    // Analyze retention costs
    if (tcoInputs.retentionYears > 3) {
      aiRecommendations.push({
        type: 'retention',
        priority: 'medium',
        title: 'Data Retention Optimization',
        description: `${tcoInputs.retentionYears}-year retention may be excessive for some data types.`,
        recommendation: 'Implement tiered retention: 7 years for critical data, 3 years for standard, 1 year for non-critical. Reduces storage costs by 25-35%.',
        estimatedSavings: (tcoResults.backendCosts?.monthly?.storage && typeof tcoResults.backendCosts.monthly.storage === 'object' 
          ? tcoResults.backendCosts.monthly.storage.total 
          : tcoResults.backendCosts?.monthly?.storage || 500) * 0.3 * 12,
        implementationEffort: 'Medium',
        timeframe: '45-60 days'
      });
    }

    // Cost breakdown analysis
    const costPlanData = {
      currentState: {
        monthly: tcoResults.monthly.total,
        annual: tcoResults.annual.total,
        threeYear: tcoResults.threeYear.total,
        breakdown: {
          platform: tcoResults.monthly.platform || 0,
          backend: tcoResults.backendCosts ? 
            (tcoResults.backendCosts.monthly.auth || 0) + 
            (typeof tcoResults.backendCosts.monthly.storage === 'object' ? tcoResults.backendCosts.monthly.storage.total : tcoResults.backendCosts.monthly.storage || 0) +
            (tcoResults.backendCosts.monthly.api_requests || 0) + 
            (tcoResults.backendCosts.monthly.compute || 0) + 
            (tcoResults.backendCosts.monthly.database || 0) : 0,
          vendors: vendorCostEstimate,
          audits: (tcoResults.annual.audits || 0) / 12,
          onboarding: (tcoResults.monthly.onboarding || 0)
        }
      },
      optimizedState: {
        monthly: tcoResults.monthly.total * 0.85, // 15% optimization potential
        annual: tcoResults.annual.total * 0.85,
        threeYear: tcoResults.threeYear.total * 0.85,
        savings: {
          monthly: tcoResults.monthly.total * 0.15,
          annual: tcoResults.annual.total * 0.15,
          threeYear: tcoResults.threeYear.total * 0.15
        }
      },
      aiRecommendations: aiRecommendations.sort((a, b) => {
        const priorityOrder = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      timeline: {
        immediate: aiRecommendations.filter(r => r.timeframe.includes('15') || r.timeframe.includes('30')).length,
        shortTerm: aiRecommendations.filter(r => r.timeframe.includes('60') || r.timeframe.includes('45')).length,
        longTerm: aiRecommendations.filter(r => r.timeframe.includes('90') || r.timeframe.includes('180')).length
      },
      generatedAt: new Date().toISOString()
    };

    setCostPlan(costPlanData);
    setShowCostPlan(true);
  };

  const renderTCOCalculator = () => (
    <div className="space-y-6">
      <div className="bg-card rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">TCO Calculator Inputs</h3>
          <button
            onClick={generateCostPlan}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate Cost Plan
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Number of Assets/Endpoints
            </label>
            <input
              type="number"
              value={tcoInputs.numAssets}
              onChange={(e) => updateTCOInput('numAssets', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Cloud Accounts (AWS/Azure/GCP)
            </label>
            <input
              type="number"
              value={tcoInputs.numCloudAccounts}
              onChange={(e) => updateTCOInput('numCloudAccounts', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Vendor Tools (EDR, SIEM, RMM)
            </label>
            <input
              type="number"
              value={tcoInputs.numVendorTools}
              onChange={(e) => updateTCOInput('numVendorTools', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {tcoResults && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg shadow p-6">
              <div className="text-sm text-muted-foreground mb-1">Monthly Cost</div>
              <div className="text-3xl font-bold text-foreground">${tcoResults.monthly.total.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {tcoResults.platformTier} Tier
                {tcoResults.backendConnected && <span className="block mt-1 text-green-500">✓ Backend Predicted</span>}
              </div>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg shadow p-6">
              <div className="text-sm text-muted-foreground mb-1">Annual Cost</div>
              <div className="text-3xl font-bold text-foreground">${tcoResults.annual.total.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Including audits</div>
            </div>
            
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg shadow p-6">
              <div className="text-sm text-muted-foreground mb-1">3-Year TCO</div>
              <div className="text-3xl font-bold text-foreground">${tcoResults.threeYear.total.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground mt-1">${tcoResults.threeYear.perAsset}/asset/mo</div>
            </div>
            
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg shadow p-6">
              <div className="text-sm text-muted-foreground mb-1">ROI</div>
              <div className="text-3xl font-bold text-foreground">{tcoResults.roi.roiPercent}%</div>
              <div className="text-xs text-muted-foreground mt-1">{tcoResults.roi.paybackMonths} mo payback</div>
            </div>
          </div>
          
          {/* Backend Cost Breakdown */}
          {tcoResults.backendCosts && (
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow p-6 mt-6">
              <h4 className="text-lg font-semibold text-foreground mb-4">Backend Cost Breakdown (API Prediction)</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Auth</div>
                  <div className="text-lg font-bold text-foreground">${tcoResults.backendCosts.monthly.auth}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Storage</div>
                  <div className="text-lg font-bold text-foreground">
                    ${typeof tcoResults.backendCosts.monthly.storage === 'object' 
                      ? tcoResults.backendCosts.monthly.storage.total 
                      : tcoResults.backendCosts.monthly.storage}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">API Requests</div>
                  <div className="text-lg font-bold text-foreground">${tcoResults.backendCosts.monthly.api_requests}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Compute</div>
                  <div className="text-lg font-bold text-foreground">${tcoResults.backendCosts.monthly.compute}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Database</div>
                  <div className="text-lg font-bold text-foreground">
                    ${tcoResults.backendCosts.monthly.database || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                <div className="text-sm text-muted-foreground">
                  Per User: <span className="font-semibold text-foreground">${tcoResults.backendCosts.per_user_monthly}/month</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* AI Cost Plan Display */}
      {showCostPlan && costPlan && (
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                AI-Generated Cost Optimization Plan
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Generated {new Date(costPlan.generatedAt).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setShowCostPlan(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Cost Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 border border-[hsl(var(--border))] rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Current Monthly Cost</div>
              <div className="text-2xl font-bold text-foreground">${costPlan.currentState.monthly.toFixed(0)}</div>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="text-sm text-primary mb-1">Optimized Monthly Cost</div>
              <div className="text-2xl font-bold text-primary">${costPlan.optimizedState.monthly.toFixed(0)}</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="text-sm text-green-500 mb-1">Potential Savings</div>
              <div className="text-2xl font-bold text-green-500">${costPlan.optimizedState.savings.monthly.toFixed(0)}/mo</div>
              <div className="text-xs text-muted-foreground mt-1">
                ${costPlan.optimizedState.savings.annual.toFixed(0)}/year
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">AI Recommendations</h4>
            <div className="space-y-3">
              {costPlan.aiRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${
                    rec.priority === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                    rec.priority === 'high' ? 'border-orange-500/30 bg-orange-500/5' :
                    'border-blue-500/30 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          rec.priority === 'critical' ? 'bg-red-500/20 text-red-500' :
                          rec.priority === 'high' ? 'bg-orange-500/20 text-orange-500' :
                          'bg-blue-500/20 text-blue-500'
                        }`}>
                          {rec.priority.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-foreground">{rec.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                      <p className="text-sm text-foreground font-medium">{rec.recommendation}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-green-500">
                        ${rec.estimatedSavings.toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">savings</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t border-[hsl(var(--border))]">
                    <span>Effort: {rec.implementationEffort}</span>
                    <span>•</span>
                    <span>Timeframe: {rec.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">Cost Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Platform</div>
                <div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.platform.toFixed(0)}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Backend</div>
                <div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.backend.toFixed(0)}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Vendors</div>
                <div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.vendors.toFixed(0)}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Audits</div>
                <div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.audits.toFixed(0)}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Onboarding</div>
                <div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.onboarding.toFixed(0)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  const renderControls = () => {
    const handleResetFilters = () => {
      setControlOwnerFilter("ALL");
      setControlSharedFilter("ALL");
      setControlDataSourceFilter("ALL");
      setControlCoverageFilter("ALL");
      setControlStatusFilter("ALL");
      setSelectedFramework("ALL");
      setSearchTerm("");
    };

    const toggleSharedFilter = () => {
      setControlSharedFilter((prev) => (prev === "SHARED" ? "ALL" : "SHARED"));
    };

    const toggleApiFilter = () => {
      setControlDataSourceFilter((prev) => (prev === "HAS" ? "ALL" : "HAS"));
    };

    const toggleExternalCoverageFilter = () => {
      setControlCoverageFilter((prev) => (prev === "EXTERNAL" ? "ALL" : "EXTERNAL"));
    };

    const handleCoverageSegmentClick = (segmentKey) => {
      setControlCoverageFilter((prev) => (prev === segmentKey ? "ALL" : segmentKey));
    };

    const toggleUnassignedFilter = () => {
      setControlOwnerFilter((prev) => (prev === "Unassigned" ? "ALL" : "Unassigned"));
    };

    const handleOwnershipSegmentClick = (segmentKey) => {
      if (segmentKey === "SHARED") {
        setControlSharedFilter((prev) => (prev === "SHARED" ? "ALL" : "SHARED"));
      } else {
        setControlSharedFilter((prev) => (prev === "NOT_SHARED" ? "ALL" : "NOT_SHARED"));
      }
    };

    const applyDataSourceFilter = (value) => {
      setControlDataSourceFilter((prev) => (prev === value ? "ALL" : value));
    };

    const quickStats = [
      {
        key: "TOTAL",
        label: "Total Controls",
        value: totalControls,
        description: "Reset all filters",
        color: "#6366F1",
        onClick: handleResetFilters,
        active: filtersAreDefault,
        disabled: totalControls === 0
      },
      {
        key: "SHARED",
        label: "Shared Controls",
        value: sharedControlsCount,
        description: "Controls with multiple owners",
        color: "#F97316",
        onClick: toggleSharedFilter,
        active: controlSharedFilter === "SHARED",
        disabled: sharedControlsCount === 0
      },
      {
        key: "SOLO",
        label: "Single Owner",
        value: soloControlsCount,
        description: "Controls owned by one team",
        color: "#22C55E",
        onClick: () => handleOwnershipSegmentClick("SOLO"),
        active: controlSharedFilter === "NOT_SHARED",
        disabled: soloControlsCount === 0
      },
      {
        key: "API",
        label: "API Data Sources",
        value: apiAttributedCount,
        description: "Controls with live integrations",
        color: "#6366F1",
        onClick: toggleApiFilter,
        active: controlDataSourceFilter === "HAS",
        disabled: apiAttributedCount === 0
      },
      {
        key: "NO_API",
        label: "No API Data",
        value: noApiControlsCount,
        description: "Controls without integrations",
        color: "#38BDF8",
        onClick: () => applyDataSourceFilter("NONE"),
        active: controlDataSourceFilter === "NONE",
        disabled: noApiControlsCount === 0
      },
      {
        key: "EXTERNAL",
        label: "External Coverage",
        value: externalCoverageCount,
        description: "Vendor & MDR managed controls",
        color: "#8B5CF6",
        onClick: toggleExternalCoverageFilter,
        active: controlCoverageFilter === "EXTERNAL",
        disabled: externalCoverageCount === 0
      },
      {
        key: "UNASSIGNED",
        label: "Unassigned Owners",
        value: unassignedControlsCount,
        description: "Controls needing assignment",
        color: "#EF4444",
        onClick: toggleUnassignedFilter,
        active: controlOwnerFilter === "Unassigned",
        disabled: unassignedControlsCount === 0
      }
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Control Overview</h3>
                <p className="text-xs text-muted-foreground">Click a metric to filter the table</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-foreground">{totalControls.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total controls</div>
              </div>
            </div>
            <div className="space-y-2">
              {quickStats.map((stat) => {
                const isActive = stat.active && !stat.disabled;
                const baseClasses = isActive
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/30 border-transparent hover:bg-muted/50 text-foreground";
                const disabledClasses = stat.disabled ? "opacity-50 cursor-not-allowed" : "";
                return (
                  <button
                    key={stat.key}
                    type="button"
                    disabled={stat.disabled}
                    onClick={!stat.disabled ? stat.onClick : undefined}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${baseClasses} ${disabledClasses}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }}></span>
                      <span className="text-left">
                        <span className="block font-medium">{stat.label}</span>
                        <span className="text-xs text-muted-foreground">{stat.description}</span>
                      </span>
                    </span>
                    <span className="text-base font-semibold">{stat.value.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Ownership Breakdown</h3>
              {controlSharedFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setControlSharedFilter("ALL")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full" style={ownershipPieStyle}></div>
                <div className="absolute inset-6 rounded-full bg-card border border-[hsl(var(--border))] flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{sharedPercent}%</div>
                    <div className="text-xs text-muted-foreground">Shared</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full space-y-2">
                {ownershipSegments.length > 0 ? (
                  ownershipSegments.map((segment) => {
                    const isActive =
                      (segment.key === "SHARED" && controlSharedFilter === "SHARED") ||
                      (segment.key === "SOLO" && controlSharedFilter === "NOT_SHARED");
                    return (
                      <button
                        type="button"
                        key={segment.key}
                        onClick={() => handleOwnershipSegmentClick(segment.key)}
                        className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive ? "bg-primary/10 text-primary" : "bg-muted/30 hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }}></span>
                          {segment.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{segment.count.toLocaleString()}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ownership data will appear as responsibilities are assigned.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Coverage Breakdown</h3>
              {controlCoverageFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setControlCoverageFilter("ALL")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full" style={coveragePieStyle}></div>
                <div className="absolute inset-6 rounded-full bg-card border border-[hsl(var(--border))] flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{coveragePercent}%</div>
                    <div className="text-xs text-muted-foreground">Mapped Coverage</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full space-y-2">
                {coverageSegments.length > 0 ? (
                  coverageSegments.map((segment) => (
                    <button
                      type="button"
                      key={segment.key}
                      onClick={() => handleCoverageSegmentClick(segment.key)}
                      className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        controlCoverageFilter === segment.key
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/30 hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }}></span>
                        {segment.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{segment.count.toLocaleString()}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No coverage data yet. Connect integrations to attribute evidence automatically.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by control, ID, or description..."
                  className="w-full pl-10 pr-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
              >
                {frameworks.map((f) => (
                  <option key={f} value={f}>
                    {f === "ALL" ? "All Frameworks" : FRAMEWORK_LIBRARY[f]?.name || f}
                  </option>
                ))}
              </select>
              <select
                value={controlOwnerFilter}
                onChange={(e) => setControlOwnerFilter(e.target.value)}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Owners</option>
                {ownerOptions.map((owner) => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
              <select
                value={controlSharedFilter}
                onChange={(e) => setControlSharedFilter(e.target.value)}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">Shared & Non-Shared</option>
                <option value="SHARED">Shared Responsibility</option>
                <option value="NOT_SHARED">Not Shared</option>
              </select>
              <select
                value={controlDataSourceFilter}
                onChange={(e) => setControlDataSourceFilter(e.target.value)}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Data Sources</option>
                <option value="HAS">Has API Data</option>
                <option value="NONE">No API Data</option>
                {dataSourceOptions.map((source) => (
                  <option key={source} value={source}>Integration: {source}</option>
                ))}
              </select>
              <select
                value={controlStatusFilter}
                onChange={(e) => setControlStatusFilter(e.target.value)}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select
                value={controlCoverageFilter}
                onChange={(e) => setControlCoverageFilter(e.target.value)}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Coverage Types</option>
                <option value="Internal">Internal</option>
                <option value="Vendor Inherited">Vendor Inherited</option>
                <option value="MDR/SOC Managed">MDR / SOC Managed</option>
                <option value="API Data Attribution">API Data Attribution</option>
                <option value="EXTERNAL">External (Vendor & MDR)</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Import Data
              </button>
              <button
                type="button"
                onClick={generateReport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Generate Report
              </button>
              <button
                type="button"
                onClick={exportResponsibilityMatrix}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
              >
                <Database className="w-4 h-4" />
                Export Matrix
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-[hsl(var(--border))] rounded-lg">
          <div className="flex items-center justify-between px-4 pt-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Controls & Ownership Matrix</h3>
              <p className="text-sm text-muted-foreground">
                Showing {filteredControls.length} of {totalControls} controls · {sharedControlsCount} shared · {apiAttributedCount} with API data
              </p>
            </div>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[hsl(var(--border))] bg-muted/30">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Control</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Frameworks</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Primary Owner</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Shared</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Secondary Owners</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Data Sources</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Coverage</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredControls.map((control) => {
                  const matrix = control.responsibility;
                  const secondaryOwners = matrix.secondary_owners || [];
                  const dataSources = matrix.data_sources || [];

                  return (
                    <tr
                      key={control.id}
                      className="border-b border-[hsl(var(--border))] hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => openControlDetail(control)}
                    >
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-foreground">{control.id}</div>
                        <div className="text-sm text-foreground mt-1">{control.control_name}</div>
                        {control.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{control.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {(control.frameworks || []).map((fw, idx) => {
                            const frameworkKey = fw.split(":")[0];
                            const frameworkName = FRAMEWORK_LIBRARY[frameworkKey]?.name || frameworkKey;
                            return (
                              <span key={`${control.id}-framework-${idx}`} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded font-medium">
                                {frameworkName}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <input
                          type="text"
                          value={control.responsible_party ?? ""}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateControl(control.id, "responsible_party", e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Owner name"
                          className="w-full px-2 py-1 text-sm bg-card border border-[hsl(var(--border))] rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="py-3 px-4 align-top">
                        {matrix.shared_responsibility ? (
                          <span className="px-2 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full text-xs font-semibold">
                            Shared
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-muted text-muted-foreground border border-[hsl(var(--border))] rounded-full text-xs font-semibold">
                            Solo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {secondaryOwners.length > 0 ? (
                            secondaryOwners.slice(0, 2).map((owner) => (
                              <span key={`${control.id}-${owner}`} className="text-xs bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-1 rounded">
                                {owner}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                          {secondaryOwners.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{secondaryOwners.length - 2} more</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        {dataSources.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {dataSources.slice(0, 2).map((ds, idx) => (
                              <span key={`${control.id}-ds-${idx}`} className="text-xs bg-purple-500/15 text-purple-500 border border-purple-500/20 px-2 py-1 rounded">
                                {ds.integration}
                              </span>
                            ))}
                            {dataSources.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{dataSources.length - 2} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                          matrix.coverage_type === "MDR/SOC Managed"
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : matrix.coverage_type === "Vendor Inherited"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : matrix.coverage_type === "API Data Attribution"
                                ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                : "bg-muted text-foreground border-[hsl(var(--border))]"
                        }`}>
                          {matrix.coverage_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <select
                          value={control.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateControl(control.id, "status", e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[control.status]}`}
                        >
                          <option>Partial</option>
                          <option>Implemented</option>
                          <option>Compliant</option>
                          <option>Non-Compliant</option>
                          <option>Vendor Managed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredControls.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No controls match your current filters. Try resetting or broadening your search.
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">API Integrations & Data Sources</h3>
                <p className="text-xs text-muted-foreground">Connected sources feeding compliance evidence</p>
              </div>
              <span className="text-xs text-muted-foreground">{apiIntegrations.length} integrations</span>
            </div>
            {apiIntegrations.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-auto pr-1">
                {apiIntegrations.map((integration, idx) => {
                  const coveredControls = integration.controls_covered || [];
                  return (
                    <div key={`${integration.name}-${idx}`} className="border border-[hsl(var(--border))] rounded-lg p-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{integration.name}</div>
                          <div className="text-xs text-muted-foreground">{integration.vendor} • {integration.type}</div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Last sync {integration.last_sync ? new Date(integration.last_sync).toLocaleDateString() : "—"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {coveredControls.slice(0, 6).map((controlId) => (
                          <span key={`${integration.name}-${controlId}`} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded">
                            {controlId}
                          </span>
                        ))}
                        {coveredControls.length > 6 && (
                          <span className="text-xs text-muted-foreground">+{coveredControls.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Connect your security tools to attribute evidence automatically.</p>
            )}
          </div>

          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">MDR & Vendor Coverage</h3>
                <p className="text-xs text-muted-foreground">External partners providing inherited controls</p>
              </div>
              <span className="text-xs text-muted-foreground">{mdrProviders.length} providers</span>
            </div>
            {mdrProviders.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-auto pr-1">
                {mdrProviders.map((provider, idx) => {
                  const providerControls = provider.controls_responsible || [];
                  return (
                    <div key={`${provider.name}-${idx}`} className="border border-[hsl(var(--border))] rounded-lg p-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{provider.name}</div>
                          <div className="text-xs text-muted-foreground">{provider.type} • {provider.service_level}</div>
                        </div>
                        <span className="text-xs text-muted-foreground">{provider.contact}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {providerControls.slice(0, 6).map((controlId) => (
                          <span key={`${provider.name}-${controlId}`} className="text-xs bg-green-500/15 text-green-500 border border-green-500/30 px-2 py-1 rounded">
                            {controlId}
                          </span>
                        ))}
                        {providerControls.length > 6 && (
                          <span className="text-xs text-muted-foreground">+{providerControls.length - 6} more</span>
                        )}
                      </div>
                      {provider.responsibility_scope && (
                        <p className="text-xs text-muted-foreground mt-2">{provider.responsibility_scope}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Add MDR and vendor partners to attribute shared controls.</p>
            )}
          </div>
        </div>

        {showControlDetail && selectedControl && (() => {
          const thread = goldenThreadData;
          const threadStats = [
            {
              key: 'systems',
              label: 'Connected systems',
              value: thread?.nodes?.length ?? 0,
              icon: <Server className="w-3.5 h-3.5 text-sky-500" />,
            },
            {
              key: 'flows',
              label: 'Data flows',
              value: thread?.edges?.length ?? 0,
              icon: <Link2 className="w-3.5 h-3.5 text-indigo-500" />,
            },
            {
              key: 'alerts',
              label: 'Active signals',
              value: thread?.alerts?.length ?? 0,
              icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
            },
            {
              key: 'evidence',
              label: 'Evidence segments',
              value: thread?.evidenceSegments ?? (selectedControl.api_data_segments?.length ?? 0),
              icon: <FileCheck className="w-3.5 h-3.5 text-emerald-500" />,
            },
          ];

          const exportGoldenThread = () => {
            if (!thread) {
              setThreadNotification({
                type: 'export',
                message: 'No Golden Thread data available to export',
                timestamp: Date.now(),
              });
              return;
            }

            const rows = [];
            const headers = ['Item Type', 'Name', 'Context', 'Owner / Scope', 'Status', 'Last Updated'];
            const formatDateIso = (value) => {
              if (!value) return '';
              try {
                return new Date(value).toISOString();
              } catch {
                return String(value);
              }
            };

            if (Array.isArray(thread.alerts)) {
              thread.alerts.forEach((entry) => {
                rows.push([
                  'Alert',
                  entry.title || entry.id,
                  entry.description || '',
                  entry.framework || '',
                  `${(entry.severity || '').toUpperCase()} / ${(entry.status || 'open').toUpperCase()}`,
                  formatDateIso(entry.updatedAt || entry.createdAt),
                ]);
              });
            }

            if (Array.isArray(thread.nodes)) {
              thread.nodes.forEach((entry) => {
                rows.push([
                  'System',
                  entry.name || entry.id,
                  entry.type || '',
                  entry.owner || '',
                  entry.status || '',
                  formatDateIso(entry.lastSync || entry.changeAt),
                ]);
              });
            }

            if (Array.isArray(thread.edges)) {
              thread.edges.forEach((edge) => {
                rows.push([
                  'Data Flow',
                  `${edge.sourceName} -> ${edge.targetName}`,
                  edge.flowType || '',
                  edge.transport || '',
                  edge.status || '',
                  formatDateIso(edge.lastValidatedAt),
                ]);
              });
            }

            const evidenceSegments = Array.isArray(selectedControl.api_data_segments)
              ? selectedControl.api_data_segments
              : [];

            evidenceSegments.forEach((segment) => {
              rows.push([
                'Evidence Segment',
                segment.api_name || segment.control_id,
                Array.isArray(segment.data_segment)
                  ? segment.data_segment.join('; ')
                  : Object.keys(segment.data_segment || {}).join('; '),
                segment.responsible_party || '',
                segment.coverage_type || '',
                formatDateIso(segment.last_sync),
              ]);
            });

            if (thread.responsibility) {
              rows.push([
                'Responsibility',
                selectedControl.id,
                (thread.responsibility.secondary_owners || []).join('; '),
                thread.responsibility.ownership || '',
                thread.responsibility.coverage_type || '',
                '',
              ]);
            }

            if (rows.length === 0) {
              setThreadNotification({
                type: 'export',
                message: 'No Golden Thread data available to export',
                timestamp: Date.now(),
              });
              return;
            }

            const escapeCell = (value) => {
              if (value == null) return '';
              const str = String(value).replace(/"/g, '""');
              return /[",\n]/.test(str) ? `"${str}"` : str;
            };

            const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${selectedControl.id}-golden-thread.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setThreadNotification({
              type: 'export',
              message: 'Golden Thread exported to CSV',
              timestamp: Date.now(),
            });
          };

          const severityBadge = (severity) => {
            const normalized = (severity || '').toLowerCase();
            const palette = {
              critical: 'bg-red-500/15 text-red-500 border border-red-500/30',
              high: 'bg-orange-500/15 text-orange-500 border border-orange-500/30',
              medium: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
              low: 'bg-sky-500/15 text-sky-500 border border-sky-500/30',
            };
            return palette[normalized] || 'bg-muted text-muted-foreground border border-muted/30';
          };

          const handleNavigateToArchitecture = (target, type = 'node') => {
            if (!target) return;
            closeControlDetail();
            setActiveView('architecture');
            setTimeout(() => {
              setSelectedDataFlowItem({ type, data: target });
            }, 0);
          };

          const handleOpenAlert = (alert) => {
            if (!alert) return;
            closeControlDetail();
            openAlertRemediation(alert);
          };

          return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeControlDetail}>
              {threadNotification && (
                <div className="absolute top-6 right-6 z-[60]">
                  <div className="rounded-lg border border-primary/30 bg-primary/10 text-primary px-4 py-2 text-sm font-medium shadow">
                    {threadNotification.message}
                  </div>
                </div>
              )}
              <div className="bg-card border border-[hsl(var(--border))] rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-[hsl(var(--border))] px-6 py-5 flex flex-wrap items-start gap-4 justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <Network className="w-3.5 h-3.5" />
                      Golden Thread
                    </span>
                    <h2 className="text-2xl font-semibold text-foreground">
                      {selectedControl.id}: {selectedControl.control_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedControl.category} • Priority: {selectedControl.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={exportGoldenThread}
                      className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button
                      onClick={() => openAutomationWalkthrough(selectedControl, { name: 'Golden Thread' })}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Playbook
                    </button>
                    <button
                      onClick={closeControlDetail}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[320px,1fr]">
                    <div className="space-y-5">
                      <div className="rounded-xl border border-[hsl(var(--border))] bg-muted/20 p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Control Snapshot</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {selectedControl.description}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                          <div className="rounded-lg border border-[hsl(var(--border))] bg-card px-3 py-2">
                            <div className="uppercase tracking-wide text-[10px]">Status</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{selectedControl.status}</div>
                          </div>
                          <div className="rounded-lg border border-[hsl(var(--border))] bg-card px-3 py-2">
                            <div className="uppercase tracking-wide text-[10px]">Owner</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">
                              {selectedControl.responsible_party || 'Unassigned'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Control Status
                          </label>
                          <select
                            value={selectedControl.status}
                            onChange={(e) => {
                              updateControl(selectedControl.id, 'status', e.target.value);
                              setSelectedControl({ ...selectedControl, status: e.target.value });
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-sm font-medium border ${statusColors[selectedControl.status]}`}
                          >
                            <option>Partial</option>
                            <option>Implemented</option>
                            <option>Compliant</option>
                            <option>Non-Compliant</option>
                            <option>Vendor Managed</option>
                          </select>
                        </div>
                        <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Responsible Owner
                          </label>
                          <input
                            type="text"
                            value={selectedControl.responsible_party}
                            onChange={(e) => {
                              updateControl(selectedControl.id, 'responsible_party', e.target.value);
                              setSelectedControl({ ...selectedControl, responsible_party: e.target.value });
                            }}
                            placeholder="Add owner or team"
                            className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-3">Golden Thread Metrics</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {threadStats.map((stat) => (
                            <div key={stat.key} className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-muted/20 px-3 py-2">
                              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="inline-flex items-center justify-center rounded-md bg-background px-1.5 py-1">
                                  {stat.icon}
                                </span>
                                {stat.label}
                              </span>
                              <span className="text-base font-semibold text-foreground">{stat.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Framework Coverage</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedControl.frameworks.map((fw, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
                              {fw}
                            </span>
                          ))}
                        </div>
                        {selectedControl.mapped_fields?.length > 0 && (
                          <div className="pt-2 border-t border-dashed border-[hsl(var(--border))]">
                            <p className="text-xs text-muted-foreground mb-2">Auto-mapped fields</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedControl.mapped_fields.map((field, idx) => (
                                <span key={idx} className="text-[11px] px-2 py-1 bg-muted/40 rounded border border-[hsl(var(--border))] text-muted-foreground">
                                  {field}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {thread?.responsibility && (
                        <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-foreground">Responsibility Matrix</h4>
                          <div className="text-xs text-muted-foreground space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <span className="uppercase tracking-wide text-[10px] text-muted-foreground">Primary Owner</span>
                              <span className="text-sm font-medium text-foreground">{thread.responsibility.ownership}</span>
                            </div>
                            {thread.responsibility.secondary_owners?.length > 0 && (
                              <div className="flex items-start justify-between gap-3">
                                <span className="uppercase tracking-wide text-[10px] text-muted-foreground">Shared</span>
                                <span className="text-sm font-medium text-foreground text-right">
                                  {thread.responsibility.secondary_owners.join(', ')}
                                </span>
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-3">
                              <span className="uppercase tracking-wide text-[10px] text-muted-foreground">Coverage</span>
                              <span className="text-sm font-medium text-foreground">{thread.responsibility.coverage_type}</span>
                            </div>
                            {thread.responsibility.evidence_sources?.length > 0 && (
                              <div className="flex items-start justify-between gap-3">
                                <span className="uppercase tracking-wide text-[10px] text-muted-foreground">Evidence</span>
                                <span className="text-sm font-medium text-foreground text-right">
                                  {thread.responsibility.evidence_sources.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {thread?.automation?.length > 0 && (
                        <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Recent Automation Activity
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {thread.automation.map((entry) => (
                              <div key={entry.id} className="rounded-lg border border-[hsl(var(--border))] bg-muted/20 px-3 py-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{entry.phase || 'Automation Plan'}</span>
                                  <span>{formatRelative(entry.timestamp)}</span>
                                </div>
                                {entry.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.notes}</p>
                                )}
                                <div className="text-[11px] uppercase tracking-wide mt-1 text-muted-foreground">
                                  Status: {entry.status?.replace('_', ' ') || 'in progress'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-card p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">AI Guidance</h3>
                            <p className="text-xs text-muted-foreground">
                              Targeted remediation playbook generated from live telemetry.
                            </p>
                          </div>
                          {controlGuidanceLoading && (
                            <span className="text-xs text-muted-foreground">Loading…</span>
                          )}
                        </div>
                        {controlGuidanceError ? (
                          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {controlGuidanceError}
                          </div>
                        ) : controlGuidance ? (
                          <div className="space-y-4">
                            {controlGuidance.summary && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {controlGuidance.summary}
                              </p>
                            )}

                            {Array.isArray(controlGuidance.recommended_actions) && controlGuidance.recommended_actions.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Recommended actions
                                </div>
                                <div className="space-y-2">
                                  {controlGuidance.recommended_actions.map((action, idx) => (
                                    <div key={`guidance-action-${idx}`} className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="text-sm font-semibold text-foreground">{action.title}</div>
                                          {action.summary && (
                                            <p className="text-xs text-muted-foreground mt-1">{action.summary}</p>
                                          )}
                                        </div>
                                        {action.impact && (
                                          <span className="text-[11px] text-primary font-medium">{action.impact}</span>
                                        )}
                                      </div>
                                      {Array.isArray(action.suggested_steps) && action.suggested_steps.length > 0 && (
                                        <ul className="mt-2 text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                          {action.suggested_steps.map((step, stepIdx) => (
                                            <li key={`guidance-action-${idx}-step-${stepIdx}`}>{step}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {Array.isArray(controlGuidance.evidence_recommendations) && controlGuidance.evidence_recommendations.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Evidence reminders
                                </div>
                                <div className="space-y-2">
                                  {controlGuidance.evidence_recommendations.map((item, idx) => (
                                    <div key={`guidance-evidence-${idx}`} className="rounded-xl border border-amber-300/40 bg-amber-200/10 px-3 py-3">
                                      <div className="text-sm font-semibold text-foreground">{item.title}</div>
                                      {item.summary && (
                                        <p className="text-xs text-muted-foreground mt-1">{item.summary}</p>
                                      )}
                                      {Array.isArray(item.suggested_steps) && (
                                        <ul className="mt-2 text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                          {item.suggested_steps.map((step, stepIdx) => (
                                            <li key={`guidance-evidence-${idx}-step-${stepIdx}`}>{step}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {Array.isArray(controlGuidance.automation_opportunities) && controlGuidance.automation_opportunities.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Automation opportunities
                                </div>
                                <div className="space-y-2">
                                  {controlGuidance.automation_opportunities.map((item, idx) => (
                                    <div key={`guidance-automation-${idx}`} className="rounded-xl border border-emerald-400/40 bg-emerald-200/10 px-3 py-3">
                                      <div className="text-sm font-semibold text-foreground">{item.title}</div>
                                      {item.summary && (
                                        <p className="text-xs text-muted-foreground mt-1">{item.summary}</p>
                                      )}
                                      {Array.isArray(item.mapped_fields) && item.mapped_fields.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {item.mapped_fields.map((field, fieldIdx) => (
                                            <span key={`guidance-automation-${idx}-field-${fieldIdx}`} className="text-[11px] px-2 py-1 rounded border border-emerald-400/40 bg-card text-emerald-500">
                                              {field}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {Array.isArray(item.suggested_steps) && (
                                        <ul className="mt-2 text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                          {item.suggested_steps.map((step, stepIdx) => (
                                            <li key={`guidance-automation-${idx}-step-${stepIdx}`}>{step}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {Array.isArray(controlGuidance.suggested_owners) && controlGuidance.suggested_owners.length > 0 && (
                              <div className="pt-2 border-t border-dashed border-[hsl(var(--border))]">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                                  Suggested owners
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {controlGuidance.suggested_owners.map((owner, idx) => (
                                    <span key={`guidance-owner-${idx}`} className="text-[11px] px-2 py-1 rounded-full border border-[hsl(var(--border))] bg-muted/30 text-muted-foreground">
                                      {owner}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : !controlGuidanceLoading ? (
                          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground">
                            Guidance will appear once the control is synced with the backend.
                          </div>
                        ) : null}
                      </div>

                      {/* Proactive Learned Patterns & Playbooks */}
                      {(controlPlaybooks.length > 0 || controlPatterns.length > 0 || controlPatternsLoading) && (
                        <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10 p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-primary" />
                              <h3 className="text-sm font-semibold text-foreground">Learned Patterns & Playbooks</h3>
                            </div>
                            {controlPatternsLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {controlPatterns.length} patterns • {controlPlaybooks.length} playbooks
                              </span>
                            )}
                          </div>

                          {controlPatternsLoading ? (
                            <div className="text-xs text-muted-foreground text-center py-4">
                              Loading learned patterns...
                            </div>
                          ) : (
                            <>
                              {/* Learned Patterns */}
                              {controlPatterns.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Successful Remediation Patterns
                                  </div>
                                  <div className="space-y-2">
                                    {controlPatterns.slice(0, 3).map((pattern) => (
                                      <div
                                        key={pattern.id}
                                        className="rounded-xl border border-primary/20 bg-card px-3 py-3"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1">
                                            <div className="text-sm font-semibold text-foreground">{pattern.pattern_name}</div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                              <span>Success: {(pattern.success_rate * 100).toFixed(0)}%</span>
                                              <span>Used: {pattern.usage_count} times</span>
                                              {pattern.avg_resolution_time_minutes && (
                                                <span>Avg Time: {pattern.avg_resolution_time_minutes} min</span>
                                              )}
                                            </div>
                                            {pattern.pattern_steps && pattern.pattern_steps.length > 0 && (
                                              <div className="mt-2 text-xs text-muted-foreground">
                                                Common steps: {pattern.pattern_steps.slice(0, 2).map(s => s.action?.replace('_', ' ')).join(', ')}
                                              </div>
                                            )}
                                          </div>
                                          <span className={`px-2 py-1 rounded text-xs ${
                                            pattern.confidence_score >= 0.7 ? 'bg-emerald-500/10 text-emerald-500' :
                                            pattern.confidence_score >= 0.5 ? 'bg-yellow-500/10 text-yellow-500' :
                                            'bg-gray-500/10 text-gray-500'
                                          }`}>
                                            {Math.round(pattern.confidence_score * 100)}% confidence
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Matching Playbooks */}
                              {controlPlaybooks.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-primary/20">
                                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Suggested Playbooks
                                  </div>
                                  <div className="space-y-2">
                                    {controlPlaybooks.slice(0, 2).map((playbook) => (
                                      <div
                                        key={playbook.id || playbook.playbook_name}
                                        className="rounded-xl border border-primary/20 bg-card px-3 py-3 hover:border-primary/40 transition-colors cursor-pointer"
                                        onClick={() => setSelectedPlaybook(playbook)}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-sm font-semibold text-foreground">{playbook.playbook_name}</span>
                                              <span className={`px-2 py-0.5 rounded text-xs ${
                                                playbook.automation_level === 'fully_automated' ? 'bg-blue-500/10 text-blue-500' :
                                                playbook.automation_level === 'semi_automated' ? 'bg-purple-500/10 text-purple-500' :
                                                'bg-gray-500/10 text-gray-500'
                                              }`}>
                                                {playbook.automation_level?.replace('_', ' ')}
                                              </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-1">{playbook.description}</p>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                              {playbook.success_metrics?.success_rate && (
                                                <span>Success: {(playbook.success_metrics.success_rate * 100).toFixed(0)}%</span>
                                              )}
                                              {playbook.estimated_time_minutes && (
                                                <span>Est. Time: {playbook.estimated_time_minutes} min</span>
                                              )}
                                            </div>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedPlaybook(playbook);
                                            }}
                                            className="px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-medium"
                                          >
                                            View
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {controlPatterns.length === 0 && controlPlaybooks.length === 0 && !controlPatternsLoading && (
                                <div className="text-xs text-muted-foreground text-center py-4">
                                  No learned patterns yet. The system will learn from your remediation actions.
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-card p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Active Signals & Alerts</h3>
                            <p className="text-xs text-muted-foreground">Drift, remediation and pattern detections linked to this control.</p>
                          </div>
                          {thread?.alerts?.length > 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {thread.alerts.length} open
                            </span>
                          )}
                        </div>
                        {thread?.alerts?.length ? (
                          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                            {thread.alerts.map((entry) => (
                              <button
                                key={entry.id}
                                onClick={() => handleOpenAlert(entry.alert)}
                                className="w-full text-left rounded-xl border border-[hsl(var(--border))] bg-muted/20 px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${severityBadge(entry.severity)}`}>
                                        <AlertCircle className="w-3 h-3" />
                                        {(entry.severity || 'medium').toUpperCase()}
                                      </span>
                                      <span className="text-xs text-muted-foreground uppercase tracking-wide">{entry.status || 'open'}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-foreground line-clamp-2">{entry.title}</div>
                                    {entry.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">{entry.description}</p>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    {formatRelative(entry.updatedAt || entry.createdAt)}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
                            No active alerts tied to this control.
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-card p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Connected Systems & Flows</h3>
                            <p className="text-xs text-muted-foreground">Nodes and pipelines contributing evidence for this control.</p>
                          </div>
                          <button
                            onClick={() => {
                              closeControlDetail();
                              setActiveView('architecture');
                            }}
                            className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                          >
                            Open architecture <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>

                        {thread?.nodes?.length ? (
                          <div className="space-y-3">
                            {thread.nodes.map((entry) => (
                              <div key={entry.id} className="rounded-xl border border-[hsl(var(--border))] bg-muted/15 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-semibold text-foreground">{entry.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {entry.type?.toUpperCase()} • {entry.owner || 'Unassigned'}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleNavigateToArchitecture(entry.node, 'node')}
                                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    View path <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-3">
                                  <div>Last sync: {entry.lastSync ? formatRelative(entry.lastSync) : 'Unknown'}</div>
                                  <div>Status: {entry.status || 'Unknown'}</div>
                                </div>
                                {entry.changeSummary && (
                                  <div className="mt-2 rounded-lg border border-[hsl(var(--border))] bg-card px-3 py-2 text-xs text-muted-foreground">
                                    <div className="uppercase tracking-wide text-[10px] text-muted-foreground mb-1">
                                      Recent change • {entry.changeActor || 'System'}
                                    </div>
                                    {entry.changeSummary}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
                            No systems mapped to this control yet. Link data flows from the architecture view.
                          </div>
                        )}

                        {thread?.edges?.length ? (
                          <div className="pt-3 border-t border-dashed border-[hsl(var(--border))] space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supporting flows</div>
                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                              {thread.edges.map((edge) => (
                                <div key={edge.id} className="rounded-lg border border-[hsl(var(--border))] bg-muted/10 px-3 py-2 text-xs flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-semibold text-foreground">{edge.sourceName}</div>
                                    <div className="text-muted-foreground">→ {edge.targetName}</div>
                                    <div className="text-[11px] text-muted-foreground mt-1">
                                      {edge.flowType} • {edge.transport || 'Unknown transport'}
                                    </div>
                                  </div>
                                  <div className="text-right space-y-1">
                                    <div className="text-[11px] text-muted-foreground">
                                      Last validated {edge.lastValidatedAt ? formatRelative(edge.lastValidatedAt) : 'n/a'}
                                    </div>
                                    <button
                                      onClick={() => handleNavigateToArchitecture(edge.edge, 'edge')}
                                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                                    >
                                      Inspect flow <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-card p-5 space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Evidence & Data Attribution</h3>
                          <p className="text-xs text-muted-foreground">
                            Linked API segments, evidence vault entries, and reference documentation.
                          </p>
                        </div>

                        <ControlDataSegments
                          control={selectedControl}
                          backendConnected={backendConnected}
                          fetchControlSegments={fetchControlSegments}
                        />

                        {(selectedControl.nist_id || selectedControl.iso_id) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedControl.nist_id && (
                              <a
                                href="https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-500 hover:bg-blue-500/15 transition-colors flex items-center justify-between gap-3"
                              >
                                NIST 800-53 reference
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            {selectedControl.iso_id && (
                              <a
                                href="https://hightable.io/iso-27001-annex-a-controls-list/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500 hover:bg-emerald-500/15 transition-colors flex items-center justify-between gap-3"
                              >
                                ISO 27001 guidance
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}

                        {!selectedControl.nist_id && !selectedControl.iso_id && thread?.alerts?.length === 0 && !selectedControl.api_data_segments?.length && (
                          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
                            No evidence sources attached yet. Capture API segments or manual artifacts to complete the thread.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        {showAlertRemediation && selectedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={closeAlertRemediation} />
            <div className="relative bg-card border border-[hsl(var(--border))] rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
              <div className="border-b border-[hsl(var(--border))] px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{selectedAlert.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{selectedAlert.description}</p>
                </div>
                <button
                  onClick={closeAlertRemediation}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Severity</div>
                    <div className="text-sm font-semibold text-foreground mt-1">{selectedAlert.severity?.toUpperCase()}</div>
                  </div>
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
                    <div className="text-sm font-semibold text-foreground mt-1">{(selectedAlert.status || 'open').replace('_', ' ').toUpperCase()}</div>
                  </div>
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Framework</div>
                    <div className="text-sm font-semibold text-foreground mt-1">{selectedAlert.framework}</div>
                  </div>
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Last Updated</div>
                    <div className="text-sm font-semibold text-foreground mt-1">
                      {alertLastUpdatedTs ? formatRelative(alertLastUpdatedTs) : '—'}
                    </div>
                    {alertFirstDetectedTs && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Detected {formatRelative(alertFirstDetectedTs)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {alertDetailLoading && (
                      <div className="bg-muted/30 border border-dashed border-[hsl(var(--border))] rounded-lg p-4 text-sm text-muted-foreground">
                        Loading alert context…
                      </div>
                    )}
                    {alertDetailError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg p-4 text-sm">
                        {alertDetailError}
                      </div>
                    )}

                    {alertRiskSnapshot && (
                      <div className="bg-muted/20 border border-[hsl(var(--border))] rounded-lg p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">Risk Snapshot</h4>
                            {alertLastUpdatedTs && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Updated {formatRelative(alertLastUpdatedTs)}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            alertRiskSnapshot.severity === 'critical'
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : alertRiskSnapshot.severity === 'high'
                              ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                              : alertRiskSnapshot.severity === 'medium'
                              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                            {(alertRiskSnapshot.severity || 'medium').toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          {alertRiskSnapshot.drift_percentage !== null && (
                            <div>
                              <div className="text-xs uppercase">Drift</div>
                              <div className="text-foreground font-semibold">
                                {alertRiskSnapshot.drift_percentage?.toFixed?.(1) ?? alertRiskSnapshot.drift_percentage}%
                              </div>
                            </div>
                          )}
                          {alertRiskSnapshot.baseline_score !== null && (
                            <div>
                              <div className="text-xs uppercase">Baseline Score</div>
                              <div className="text-foreground font-semibold">
                                {alertRiskSnapshot.baseline_score}
                              </div>
                            </div>
                          )}
                          {alertRiskSnapshot.current_score !== null && (
                            <div>
                              <div className="text-xs uppercase">Current Score</div>
                              <div className="text-foreground font-semibold">
                                {alertRiskSnapshot.current_score}
                              </div>
                            </div>
                          )}
                          {alertRiskSnapshot.risk_owner && (
                            <div>
                              <div className="text-xs uppercase">Risk Owner</div>
                              <div className="text-foreground font-semibold">
                                {alertRiskSnapshot.risk_owner}
                              </div>
                            </div>
                          )}
                          {alertRiskSnapshot.affected_assets !== null && (
                            <div>
                              <div className="text-xs uppercase">Assets Impacted</div>
                              <div className="text-foreground font-semibold">
                                {alertRiskSnapshot.affected_assets}
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="text-xs uppercase">Automation Ready</div>
                            <div className="text-foreground font-semibold">
                              {alertRiskSnapshot.automation_impact}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">Alert Timeline</h4>
                          {alertFirstDetectedTs && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Detected {formatRelative(alertFirstDetectedTs)}
                            </p>
                          )}
                        </div>
                        {alertLastUpdatedTs && (
                          <span className="text-xs text-muted-foreground">
                            Last update {formatRelative(alertLastUpdatedTs)}
                          </span>
                        )}
                      </div>
                      {alertTimeline.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center bg-muted/20 border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-6">
                          Timeline entries will appear as remediation progresses.
                        </div>
                      ) : (
                        <ol className="space-y-4">
                          {alertTimeline.map((event) => {
                            const statusClass =
                              event.status === 'resolved'
                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                : event.status === 'in_progress'
                                ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                            return (
                              <li key={event.id} className="border border-[hsl(var(--border))] rounded-lg p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-semibold text-foreground">{event.event}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                      <span>{formatRelative(event.timestamp)}</span>
                                      <span>•</span>
                                      <span>{event.actor}</span>
                                    </div>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold border ${statusClass}`}>
                                    {(event.status || 'open').replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>
                                {event.notes && (
                                  <p className="text-xs text-muted-foreground mt-2">{event.notes}</p>
                                )}
                                {event.evidence_links && event.evidence_links.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {event.evidence_links.map((link, idx) => (
                                      <a
                                        key={`${event.id}-evidence-${idx}`}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        Evidence {idx + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>

                    {/* Proactive Playbook Suggestions */}
                    {(matchingPlaybooks.length > 0 || playbooksLoading) && (
                      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-2 border-primary/30 rounded-lg p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h4 className="text-sm font-semibold text-foreground">Suggested Playbooks</h4>
                          </div>
                          {playbooksLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {matchingPlaybooks.length} match{matchingPlaybooks.length === 1 ? '' : 'es'} found
                            </span>
                          )}
                        </div>
                        {playbooksLoading ? (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            Finding matching playbooks...
                          </div>
                        ) : matchingPlaybooks.length > 0 ? (
                          <div className="space-y-3">
                            {matchingPlaybooks.map((playbook) => (
                              <div
                                key={playbook.id}
                                className="bg-card border border-primary/20 rounded-lg p-4 hover:border-primary/40 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h5 className="text-sm font-semibold text-foreground">{playbook.playbook_name}</h5>
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                        playbook.automation_level === 'fully_automated' ? 'bg-blue-500/10 text-blue-500' :
                                        playbook.automation_level === 'semi_automated' ? 'bg-purple-500/10 text-purple-500' :
                                        'bg-gray-500/10 text-gray-500'
                                      }`}>
                                        {playbook.automation_level?.replace('_', ' ')}
                                      </span>
                                      {playbook.match_confidence && (
                                        <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                                          {Math.round(playbook.match_confidence * 100)}% match
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">{playbook.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                                      <span>Success: {(playbook.success_metrics?.success_rate * 100 || 0).toFixed(0)}%</span>
                                      <span>Used: {playbook.usage_count || 0} times</span>
                                      <span>Est. Time: {playbook.estimated_time_minutes || 0} min</span>
                                    </div>
                                    {playbook.match_reason && (
                                      <div className="text-xs text-primary mt-2 italic mb-2">
                                        {playbook.match_reason}
                                      </div>
                                    )}
                                    {/* Time Savings Indicator */}
                                    <div className="flex items-center gap-2 mt-2 text-xs">
                                      <TrendingDown className="w-3 h-3 text-emerald-500" />
                                      <span className="text-emerald-500 font-medium">
                                        Avg. {playbook.estimated_time_minutes || 0} min vs. {playbook.estimated_time_minutes ? playbook.estimated_time_minutes * 2 : 0} min manual
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        executePlaybook(playbook, selectedAlert);
                                      }}
                                      disabled={playbookExecutionProgress?.playbookId === playbook.id}
                                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                      {playbookExecutionProgress?.playbookId === playbook.id ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                          Running...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-3 h-3" />
                                          Run Playbook
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPlaybook(playbook);
                                      }}
                                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-medium"
                                    >
                                      View Details
                                    </button>
                                  </div>
                                </div>
                                {/* Playbook Execution Progress */}
                                {playbookExecutionProgress?.playbookId === playbook.id && (
                                  <div className="mt-3 pt-3 border-t border-primary/20">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                      <span>Executing step {playbookExecutionProgress.currentStep} of {playbookExecutionProgress.totalSteps}</span>
                                      <span>{Math.round((playbookExecutionProgress.currentStep / playbookExecutionProgress.totalSteps) * 100)}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-emerald-500 transition-all duration-500" 
                                        style={{ width: `${(playbookExecutionProgress.currentStep / playbookExecutionProgress.totalSteps) * 100}%` }}
                                      />
                                    </div>
                                    {playbookExecutionProgress.currentAction && (
                                      <div className="text-xs text-muted-foreground mt-2">
                                        {playbookExecutionProgress.currentAction}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {alertLinkedControls.length > 0 && (
                      <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-foreground">Linked Controls</h4>
                          <span className="text-xs text-muted-foreground">
                            {alertLinkedControls.length} controls impacted
                          </span>
                        </div>
                        <div className="space-y-3">
                          {alertLinkedControls.map((control) => {
                            const badgeClass =
                              statusColors[control.status] || 'bg-muted text-foreground border-[hsl(var(--border))]';
                            return (
                              <div
                                key={control.id || control.control_id}
                                className="border border-[hsl(var(--border))] rounded-lg p-4 bg-muted/10 hover:bg-muted/20 transition-colors"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-semibold text-foreground">
                                      {control.control_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {(control.id || control.control_id) || 'Control'} • {control.framework || selectedAlert.framework}
                                    </div>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold border ${badgeClass}`}>
                                    {(control.status || 'Not Implemented').replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-3">
                                  {control.owner && (
                                    <span className="px-2 py-1 bg-card border border-[hsl(var(--border))] rounded">
                                      Owner: {control.owner}
                                    </span>
                                  )}
                                  {control.target_status && (
                                    <span className="px-2 py-1 bg-card border border-[hsl(var(--border))] rounded">
                                      Target: {control.target_status}
                                    </span>
                                  )}
                                  {control.coverage_delta !== undefined && control.coverage_delta !== null && (
                                    <span className={`px-2 py-1 bg-card border border-[hsl(var(--border))] rounded ${
                                      control.coverage_delta >= 0 ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                      Coverage {control.coverage_delta >= 0 ? '+' : ''}
                                      {control.coverage_delta}%
                                    </span>
                                  )}
                                  {control.automation_ready && (
                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded">
                                      Automation Ready
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                  <button
                                    type="button"
                                    onClick={() => handleNavigateControl(control.id || control.control_id, 'controls')}
                                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    View Control
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                  {control.evidence_links && control.evidence_links.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {control.evidence_links.length} evidence link{control.evidence_links.length === 1 ? '' : 's'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {priorityGuidance.length > 0 && (
                      <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-foreground">Remediation Checklist</h4>
                          <span className="text-xs text-muted-foreground">
                            Update status, ownership, and evidence as you work
                          </span>
                        </div>
                        {priorityGuidance.map((guidance) => {
                          const controlForm = alertRemediationForm.controlUpdates[guidance.control_id] || {};
                          const currentStatus = guidance.status || guidance.current_status || 'Not Implemented';
                          return (
                            <div key={guidance.control_id} className="border border-[hsl(var(--border))] rounded-lg bg-muted/10 p-4 space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="text-sm font-semibold text-foreground">{guidance.control_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {guidance.control_id} • {guidance.priority}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span className="px-2 py-1 rounded bg-card border border-[hsl(var(--border))]">
                                    Current: {currentStatus}
                                  </span>
                                  {guidance.recommended_owner && (
                                    <span className="px-2 py-1 rounded bg-card border border-[hsl(var(--border))]">
                                      Recommended Owner: {guidance.recommended_owner}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {guidance.remediation_steps && guidance.remediation_steps.length > 0 && (
                                <div className="bg-card border border-dashed border-[hsl(var(--border))] rounded-lg p-3 text-xs text-muted-foreground">
                                  <div className="font-medium text-foreground mb-2">Guided Steps</div>
                                  <ol className="list-decimal pl-4 space-y-1">
                                    {guidance.remediation_steps.map((step, idx) => (
                                      <li key={`${guidance.control_id}-step-${idx}`}>
                                        <span className="font-medium text-foreground">{step.action}</span>
                                        {step.estimated_time && <span className="ml-2">({step.estimated_time})</span>}
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-muted-foreground mb-1">Updated Status</label>
                                  <select
                                    value={controlForm.status || ''}
                                    onChange={(e) => handleControlUpdateChange(guidance.control_id, 'status', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="Implemented">Implemented</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Non-Compliant">Non-Compliant</option>
                                    <option value="Vendor Managed">Vendor Managed</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-muted-foreground mb-1">Primary Owner</label>
                                  <input
                                    type="text"
                                    value={controlForm.responsible_party || ''}
                                    onChange={(e) => handleControlUpdateChange(guidance.control_id, 'responsible_party', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm"
                                    placeholder="Assign owner"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-muted-foreground mb-1">Evidence Link</label>
                                  <input
                                    type="text"
                                    value={controlForm.evidence_link || ''}
                                    onChange={(e) => handleControlUpdateChange(guidance.control_id, 'evidence_link', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm"
                                    placeholder="URL or reference"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Playbook Quick Run */}
                    {matchingPlaybooks.length > 0 && (
                      <div className="bg-gradient-to-r from-emerald-500/10 to-primary/10 border-2 border-emerald-500/30 rounded-lg p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-emerald-500" />
                            <h4 className="text-sm font-semibold text-foreground">Quick Playbook Execution</h4>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {matchingPlaybooks.length} available
                          </span>
                        </div>
                        <div className="space-y-2">
                          {matchingPlaybooks.slice(0, 2).map((playbook) => (
                            <div
                              key={playbook.id}
                              className="bg-card border border-emerald-500/20 rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-foreground">{playbook.playbook_name}</span>
                                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-500">
                                      {playbook.estimated_time_minutes || 0} min
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{(playbook.success_metrics?.success_rate * 100 || 0).toFixed(0)}% success</span>
                                    <span>•</span>
                                    <span className="text-emerald-500">Saves ~{playbook.estimated_time_minutes || 0} min</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => executePlaybook(playbook, selectedAlert)}
                                  disabled={playbookExecutionProgress?.playbookId === playbook.id}
                                  className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {playbookExecutionProgress?.playbookId === playbook.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Running...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3 h-3" />
                                      Run Now
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">Quick Actions</h4>
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div className="space-y-2">
                        {alertQuickActions.map((action) => {
                          const IconComponent = ALERT_ACTION_ICONS[action.icon] || Sparkles;
                          return (
                            <button
                              key={action.id}
                              type="button"
                              className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-start gap-3"
                            >
                              <IconComponent className="w-4 h-4 text-primary mt-0.5" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-foreground">{action.label}</div>
                                {action.description && (
                                  <div className="text-xs text-muted-foreground mt-1">{action.description}</div>
                                )}
                              </div>
                              <ExternalLink className="w-3 h-3 text-muted-foreground mt-0.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">Remediation Updates</h4>
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Alert Status</label>
                          <select
                            value={alertRemediationForm.status}
                            onChange={(e) => handleRemediationFieldChange('status', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm"
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Remediation Notes</label>
                          <textarea
                            value={alertRemediationForm.notes}
                            onChange={(e) => handleRemediationFieldChange('notes', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm"
                            placeholder="Document key findings, blockers, or context"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Actions Taken</label>
                          <textarea
                            value={alertRemediationForm.actionsTaken}
                            onChange={(e) => handleRemediationFieldChange('actionsTaken', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm"
                            placeholder="List actions (comma or newline separated)"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Evidence Links</label>
                          <textarea
                            value={alertRemediationForm.evidenceLinks}
                            onChange={(e) => handleRemediationFieldChange('evidenceLinks', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm"
                            placeholder="Paste evidence URLs or references"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[hsl(var(--border))] px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={closeAlertRemediation}
                  className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  disabled={alertSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemediationSubmit}
                  disabled={alertSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {alertSaving ? 'Saving...' : alertRemediationForm.status === 'resolved' ? 'Mark as Resolved' : 'Save Progress'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  // Load learned patterns and playbooks
  const loadLearningData = async () => {
    try {
      const [patternsRes, playbooksRes, valueRes] = await Promise.all([
        api.getLearnedPatterns(userId),
        api.getAutoPlaybooks(userId),
        api.getDataValueSummary(userId),
      ]);
      setLearnedPatterns(patternsRes.patterns || []);
      setAutoPlaybooks(playbooksRes.playbooks || []);
      setDataValueSummary(valueRes);
    } catch (error) {
      console.error('Failed to load learning data:', error);
    }
  };

  // Run learning analysis
  const runLearningAnalysis = async () => {
    setLearningAnalysisRunning(true);
    try {
      const result = await api.runLearningAnalysis(userId);
      await loadLearningData(); // Reload after analysis
      alert(`Learning complete! ${result.message}`);
    } catch (error) {
      console.error('Learning analysis failed:', error);
      alert('Learning analysis failed. Please try again.');
    } finally {
      setLearningAnalysisRunning(false);
    }
  };

  // Approve a playbook
  const approvePlaybook = async (playbookId) => {
    try {
      await api.approvePlaybook(userId, playbookId);
      await loadLearningData();
      alert('Playbook approved and activated!');
    } catch (error) {
      console.error('Failed to approve playbook:', error);
      alert('Failed to approve playbook.');
    }
  };

  // Generate demo learning data for showcase
  const generateDemoLearningData = useCallback(() => {
    const demoPatterns = [
      {
        id: 1,
        pattern_name: 'Auto Pattern: Access Control - High',
        pattern_type: 'control_remediation',
        trigger_conditions: { control_id: 'AC-001', severity: 'high', priority: 'High', category: 'Access Control' },
        success_rate: 0.92,
        usage_count: 8,
        avg_resolution_time_minutes: 45,
        confidence_score: 0.85,
        pattern_steps: [
          { action: 'remediation_started', order: 1, frequency: 1.0 },
          { action: 'evidence_collected', order: 2, frequency: 0.9 },
          { action: 'status_updated', order: 3, frequency: 0.95 },
        ],
        evidence_requirements: ['MFA Configuration', 'Access Logs'],
        automation_opportunities: ['Auto-enable MFA', 'Generate access report'],
        related_controls: ['AC-001', 'AC-002'],
      },
      {
        id: 2,
        pattern_name: 'Auto Pattern: Endpoint Security - Critical',
        pattern_type: 'control_remediation',
        trigger_conditions: { control_id: 'EP-001', severity: 'critical', priority: 'Critical', category: 'Endpoint Security' },
        success_rate: 0.88,
        usage_count: 12,
        avg_resolution_time_minutes: 60,
        confidence_score: 0.92,
        pattern_steps: [
          { action: 'remediation_started', order: 1, frequency: 1.0 },
          { action: 'evidence_collected', order: 2, frequency: 0.85 },
          { action: 'control_update', order: 3, frequency: 0.9 },
        ],
        evidence_requirements: ['EDR Coverage Report', 'Vulnerability Scan'],
        automation_opportunities: ['Deploy EDR agent', 'Run vulnerability scan'],
        related_controls: ['EP-001', 'VM-001'],
      },
    ];

    const demoPlaybooks = [
      {
        id: 1,
        playbook_name: 'Auto: Access Control - High',
        source_pattern_id: 1,
        playbook_type: 'remediation',
        description: 'Auto-generated playbook from 8 successful remediations. Success rate: 92%',
        trigger_conditions: { control_id: 'AC-001', severity: 'high', priority: 'High' },
        steps: [
          { id: 'step_1', order: 1, action: 'remediation_started', description: 'Review access control configuration', required: true, automation_ready: false, estimated_minutes: 15 },
          { id: 'step_2', order: 2, action: 'evidence_collected', description: 'Collect MFA configuration evidence', required: true, automation_ready: true, estimated_minutes: 10 },
          { id: 'step_3', order: 3, action: 'status_updated', description: 'Update control status to Implemented', required: true, automation_ready: true, estimated_minutes: 5 },
        ],
        estimated_time_minutes: 45,
        automation_level: 'semi_automated',
        success_metrics: { success_rate: 0.92, avg_time_minutes: 45, usage_count: 8 },
        status: 'active',
        approval_status: 'approved',
        usage_count: 8,
      },
      {
        id: 2,
        playbook_name: 'Auto: Endpoint Security - Critical',
        source_pattern_id: 2,
        playbook_type: 'remediation',
        description: 'Auto-generated playbook from 12 successful remediations. Success rate: 88%',
        trigger_conditions: { control_id: 'EP-001', severity: 'critical', priority: 'Critical' },
        steps: [
          { id: 'step_1', order: 1, action: 'remediation_started', description: 'Assess endpoint security coverage', required: true, automation_ready: false, estimated_minutes: 20 },
          { id: 'step_2', order: 2, action: 'evidence_collected', description: 'Collect EDR coverage evidence', required: true, automation_ready: true, estimated_minutes: 15 },
          { id: 'step_3', order: 3, action: 'control_update', description: 'Update control status and evidence links', required: true, automation_ready: true, estimated_minutes: 10 },
        ],
        estimated_time_minutes: 60,
        automation_level: 'semi_automated',
        success_metrics: { success_rate: 0.88, avg_time_minutes: 60, usage_count: 12 },
        status: 'active',
        approval_status: 'approved',
        usage_count: 12,
      },
    ];

    return { patterns: demoPatterns, playbooks: demoPlaybooks };
  }, []);

  // Load learning data when CSCA view or dashboard is active
  useEffect(() => {
    if (activeView === 'csca' || activeView === 'dashboard') {
      if (backendConnected && currentUser?.id) {
        loadLearningData();
      } else {
        // Use demo data for showcase
        const demoData = generateDemoLearningData();
        setLearnedPatterns(demoData.patterns);
        setAutoPlaybooks(demoData.playbooks);
      }
    }
  }, [activeView, backendConnected, currentUser?.id, loadLearningData, generateDemoLearningData]);

  const renderAutomationPlan = () => {

    if (!automationPlan) {
      return (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow p-12 text-center">
            <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Generate Your Automation Plan</h3>
            <p className="text-muted-foreground mb-6">
              AI-powered prioritization based on risk, cost, and automation potential
            </p>
            <button
              onClick={() => generateAutomationPlan()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Generate Plan Now
            </button>
          </div>

          {/* Self-Learning System Section */}
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Self-Learning Automation System
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The platform learns from your remediation actions and creates reusable playbooks automatically
                </p>
              </div>
              {backendConnected ? (
                <button
                  onClick={runLearningAnalysis}
                  disabled={learningAnalysisRunning}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {learningAnalysisRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Run Learning Analysis
                    </>
                  )}
                </button>
              ) : (
                <div className="px-4 py-2 bg-muted/50 border border-[hsl(var(--border))] rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Demo Mode - Showing Sample Data
                </div>
              )}
            </div>

            {/* Learning Activity Feed */}
            <div className="mb-6 bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Recent Learning Activity</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Pattern discovered: Access Control remediation (92% success rate)</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">2 hours ago</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Playbook generated: Endpoint Security - Critical (88% success)</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">5 hours ago</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Pattern confidence increased: Access Control (85% → 92%)</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">1 day ago</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>8 successful remediations learned from historical data</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">2 days ago</span>
                </div>
              </div>
            </div>

            {/* Learning Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Learned Patterns</div>
                <div className="text-2xl font-bold text-foreground">{learnedPatterns.length}</div>
              </div>
              <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Auto Playbooks</div>
                <div className="text-2xl font-bold text-foreground">{autoPlaybooks.length}</div>
              </div>
              <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Active Playbooks</div>
                <div className="text-2xl font-bold text-emerald-500">
                  {autoPlaybooks.filter(p => p.status === 'active').length}
                </div>
              </div>
              <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Data Utilization</div>
                <div className="text-2xl font-bold text-primary">
                  {dataValueSummary ? `${(dataValueSummary.overall_utilization * 100).toFixed(0)}%` : '0%'}
                </div>
              </div>
            </div>

            {/* Learning Progress Visualization */}
            <div className="mb-6 bg-muted/20 border border-[hsl(var(--border))] rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Learning Progress</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{learnedPatterns.length}</div>
                  <div className="text-xs text-muted-foreground">Patterns Learned</div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (learnedPatterns.length / 10) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-500 mb-1">
                    {autoPlaybooks.filter(p => p.status === 'active').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Active Playbooks</div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (autoPlaybooks.filter(p => p.status === 'active').length / 5) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500 mb-1">
                    {learnedPatterns.length > 0 
                      ? Math.round(learnedPatterns.reduce((sum, p) => sum + (p.success_rate || 0), 0) / learnedPatterns.length * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Success Rate</div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-1000" 
                      style={{ width: `${learnedPatterns.length > 0 
                        ? Math.round(learnedPatterns.reduce((sum, p) => sum + (p.success_rate || 0), 0) / learnedPatterns.length * 100)
                        : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-Generated Playbooks */}
            {autoPlaybooks.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-foreground">Auto-Generated Playbooks</h4>
                  <span className="text-xs text-muted-foreground">
                    {autoPlaybooks.filter(p => p.status === 'active').length} active • {autoPlaybooks.filter(p => p.approval_status === 'pending').length} pending
                  </span>
                </div>
                <div className="space-y-3">
                  {autoPlaybooks.slice(0, 5).map((playbook) => (
                    <div
                      key={playbook.id}
                      className="border border-[hsl(var(--border))] rounded-lg p-4 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedPlaybook(playbook)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-foreground">{playbook.playbook_name}</h5>
                            <span className={`px-2 py-1 rounded text-xs ${
                              playbook.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                              playbook.approval_status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>
                              {playbook.status === 'active' ? 'Active' : playbook.approval_status}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              playbook.automation_level === 'fully_automated' ? 'bg-blue-500/10 text-blue-500' :
                              playbook.automation_level === 'semi_automated' ? 'bg-purple-500/10 text-purple-500' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>
                              {playbook.automation_level?.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{playbook.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Success Rate: {(playbook.success_metrics?.success_rate * 100 || 0).toFixed(0)}%</span>
                            <span>Used: {playbook.usage_count || 0} times</span>
                            <span>Est. Time: {playbook.estimated_time_minutes || 0} min</span>
                          </div>
                        </div>
                        {playbook.approval_status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              approvePlaybook(playbook.id);
                            }}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How It Works - Showcase */}
            <div className="mt-6 bg-gradient-to-br from-primary/10 via-purple-500/10 to-emerald-500/10 border-2 border-primary/30 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                How The Learning System Works
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
                  <div className="text-3xl mb-2">1️⃣</div>
                  <h5 className="text-sm font-semibold text-foreground mb-2">Observes</h5>
                  <p className="text-xs text-muted-foreground">
                    Tracks every remediation action, evidence collection, and outcome
                  </p>
                </div>
                <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
                  <div className="text-3xl mb-2">2️⃣</div>
                  <h5 className="text-sm font-semibold text-foreground mb-2">Learns</h5>
                  <p className="text-xs text-muted-foreground">
                    Identifies successful patterns from historical remediation data
                  </p>
                </div>
                <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
                  <div className="text-3xl mb-2">3️⃣</div>
                  <h5 className="text-sm font-semibold text-foreground mb-2">Suggests</h5>
                  <p className="text-xs text-muted-foreground">
                    Proactively recommends playbooks when similar alerts occur
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/20 rounded-lg p-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-foreground mb-1">Continuous Improvement</h5>
                    <p className="text-xs text-muted-foreground">
                      Each remediation makes the system smarter. Success rates improve over time as patterns are refined and validated.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Value Tracking */}
            {dataValueSummary ? (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-foreground mb-4">Data Value Tracking</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Every piece of data in the platform is tracked and used. Nothing goes to waste.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(dataValueSummary.by_type || {}).map(([type, stats]) => (
                    <div key={type} className="bg-muted/20 border border-[hsl(var(--border))] rounded-lg p-4">
                      <div className="text-sm font-semibold text-foreground mb-2 capitalize">{type}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items:</span>
                          <span className="text-foreground font-medium">{stats.total_items}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Uses:</span>
                          <span className="text-foreground font-medium">{stats.total_uses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Utilization:</span>
                          <span className="text-foreground font-medium">{(stats.utilization_rate * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Value:</span>
                          <span className="text-foreground font-medium">{(stats.avg_value_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-foreground mb-4">Data Value Tracking</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Every piece of data in the platform is tracked and used. Nothing goes to waste.
                </p>
                <div className="bg-muted/20 border border-dashed border-[hsl(var(--border))] rounded-lg p-6 text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Data value tracking will appear once you start using the platform
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    const plan = automationPlan;

    return (
      <div className="space-y-6">
        {/* Self-Learning System Banner */}
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 rounded-lg p-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Self-Learning Automation</h3>
                <p className="text-sm text-muted-foreground">
                  {learnedPatterns.length} patterns learned • {autoPlaybooks.filter(p => p.status === 'active').length} active playbooks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={runLearningAnalysis}
                disabled={learningAnalysisRunning}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {learningAnalysisRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-foreground">90-Day Compliance Automation Plan</h2>
              <p className="text-muted-foreground">
                Risk-prioritized roadmap • Generated {new Date(plan.generated).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={exportAutomationPlan}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Controls</div>
            <div className="text-2xl font-bold text-foreground">{plan.summary.totalControls}</div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Hours</div>
            <div className="text-2xl font-bold text-indigo-600">{plan.summary.totalHours}</div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-purple-600">${plan.summary.totalCost.toLocaleString()}</div>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(plan.phases).map(([phaseKey, phase]) => (
            <div key={phaseKey} className="bg-card border border-[hsl(var(--border))] rounded-lg shadow p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{phase.name}</h3>
                  <p className="text-sm text-muted-foreground">{phase.timeline} • {phase.focus}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-center">
                    <div className="text-[11px] uppercase text-muted-foreground">Controls</div>
                    <div className="text-lg font-semibold text-foreground">{phase.metrics.controls}</div>
                  </div>
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-center">
                    <div className="text-[11px] uppercase text-muted-foreground">Hours</div>
                    <div className="text-lg font-semibold text-indigo-500">{phase.metrics.totalHours}</div>
                  </div>
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-center">
                    <div className="text-[11px] uppercase text-muted-foreground">Cost</div>
                    <div className="text-lg font-semibold text-purple-500">${phase.metrics.totalCost.toLocaleString()}</div>
                  </div>
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-center">
                    <div className="text-[11px] uppercase text-muted-foreground">Automatable</div>
                    <div className="text-lg font-semibold text-emerald-500">{phase.metrics.automatable}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {phase.controls.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground bg-muted/30 border border-dashed border-[hsl(var(--border))] rounded-lg text-center">
                    No controls assigned to this phase.
                  </div>
                ) : (
                  phase.controls.map((control) => {
                    const frameworks = Array.isArray(control.frameworks) ? control.frameworks : [];
                    const effortHours = control.timeEstimate ?? control.estimatedHours ?? 4;
                    const controlCost = control.implementationCost ?? Math.round(effortHours * 125);
                    return (
                    <div
                      key={control.id}
                      className="border border-[hsl(var(--border))] rounded-lg p-4 bg-muted/20 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{control.control_name}</span>
                            <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                              control.priority === 'Critical'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                : control.priority === 'High'
                                ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            }`}>
                              {control.priority}
                            </span>
                            {control.automatable && (
                              <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                Automatable
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {control.category} • Risk score {control.riskScore} • {frameworks.length} frameworks impacted
                          </div>
                          <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                            {frameworks.slice(0, 4).map((fw) => (
                              <span key={fw} className="px-2 py-0.5 bg-muted rounded border border-[hsl(var(--border))]">
                                {fw}
                              </span>
                            ))}
                            {frameworks.length > 4 && (
                              <span className="px-2 py-0.5 bg-muted rounded border border-[hsl(var(--border))]">
                                +{frameworks.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="text-xs text-muted-foreground bg-muted/50 border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-center">
                            <div className="font-semibold text-foreground">{effortHours} hrs</div>
                            <div>Est. effort</div>
                          </div>
                          <div className="text-xs text-muted-foreground bg-muted/50 border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-center">
                            <div className="font-semibold text-foreground">${controlCost.toLocaleString()}</div>
                            <div>Cost</div>
                          </div>
                          <button
                            onClick={() => openAutomationWalkthrough(control, phase)}
                            className="px-3 py-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition-colors"
                          >
                            Launch playbook
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  const renderEntities = () => <div className="bg-card rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Entity Management</h2><p className="text-muted-foreground mt-2">Manage subsidiaries and regional entities</p></div>;
  const renderDataImport = () => <div className="bg-card rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Data Import Center</h2><p className="text-muted-foreground mt-2">Connect your security tools and import data seamlessly</p></div>;
  const renderVendors = () => <div className="bg-card rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Vendor Risk Management</h2><p className="text-muted-foreground mt-2">Track third-party compliance and inherited controls</p></div>;
  const renderFrameworkGlossary = () => {
    const query = frameworkGlossarySearch.trim().toLowerCase();
    const filteredFrameworks = FRAMEWORK_GLOSSARY.filter((framework) => {
      if (!query) return true;
      return (
        framework.name.toLowerCase().includes(query) ||
        framework.shortName.toLowerCase().includes(query) ||
        framework.description.toLowerCase().includes(query) ||
        framework.focusAreas.some((area) => area.toLowerCase().includes(query)) ||
        framework.idealFor.some((audience) => audience.toLowerCase().includes(query))
      );
    });

    return (
      <div className="space-y-6">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Framework Glossary & Control Guide</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Quick explanations, focus areas, and official reference links to help teams understand where each framework shines.
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={frameworkGlossarySearch}
                onChange={(e) => setFrameworkGlossarySearch(e.target.value)}
                placeholder="Search frameworks, controls, industries..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFrameworks.map((framework) => (
            <div key={framework.id} className="border border-[hsl(var(--border))] rounded-lg bg-card shadow-sm p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{framework.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                    {framework.category} • {framework.shortName}
                  </p>
                </div>
                <button
                  onClick={() => window.open(framework.docLink, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Reference <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{framework.description}</p>

              <div className="space-y-2">
                <div>
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Focus Areas</div>
                  <div className="flex flex-wrap gap-1.5">
                    {framework.focusAreas.map((area) => (
                      <span key={`${framework.id}-${area}`} className="text-[11px] bg-muted/50 border border-[hsl(var(--border))] text-muted-foreground px-2 py-0.5 rounded">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Great For</div>
                  <div className="flex flex-wrap gap-1.5">
                    {framework.idealFor.map((audience) => (
                      <span key={`${framework.id}-aud-${audience}`} className="text-[11px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded">
                        {audience}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground pt-2 border-t border-dashed border-[hsl(var(--border))]">
                <div>
                  <div className="font-semibold text-foreground">{framework.quickFacts.controlFamilies}</div>
                  <div className="text-[11px] uppercase tracking-wide">Control Families</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{framework.quickFacts.totalControls}</div>
                  <div className="text-[11px] uppercase tracking-wide">Controls</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{framework.quickFacts.assuranceLevel}</div>
                  <div className="text-[11px] uppercase tracking-wide">Assurance</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredFrameworks.length === 0 && (
          <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-8 text-center text-sm text-muted-foreground">
            No framework matches your search. Try keywords like "cloud", "healthcare", or "risk".
          </div>
        )}
      </div>
    );
  };
  const renderResponsibilityMatrix = () => {
    const filteredMatrix = responsibilityMatrix.filter(m => {
      const categoryMatch = matrixFilterCategory === "ALL" || m.category === matrixFilterCategory;
      const coverageMatch = matrixFilterCoverageType === "ALL" || m.coverage_type === matrixFilterCoverageType;
      const ownershipMatch = matrixFilterOwnership === "ALL" || 
        m.ownership === matrixFilterOwnership ||
        m.secondary_owners.includes(matrixFilterOwnership);
      return categoryMatch && coverageMatch && ownershipMatch;
    });

    const uniqueCategories = [...new Set(responsibilityMatrix.map(m => m.category))].sort();
    const uniqueCoverageTypes = [...new Set(responsibilityMatrix.map(m => m.coverage_type))].sort();
    const uniqueOwners = [...new Set([
      ...responsibilityMatrix.map(m => m.ownership),
      ...responsibilityMatrix.flatMap(m => m.secondary_owners)
    ].filter(Boolean))].sort();

    // Group matrix by framework, then by category
    const groupedMatrix = {};
    filteredMatrix.forEach(matrix => {
      matrix.frameworks.forEach(fw => {
        const frameworkKey = fw.split(':')[0];
        const frameworkName = FRAMEWORK_LIBRARY[frameworkKey]?.name || frameworkKey;
        
        if (!groupedMatrix[frameworkName]) {
          groupedMatrix[frameworkName] = {};
        }
        
        if (!groupedMatrix[frameworkName][matrix.category]) {
          groupedMatrix[frameworkName][matrix.category] = [];
        }
        
        groupedMatrix[frameworkName][matrix.category].push({
          ...matrix,
          frameworkKey
        });
      });
    });

    // Toggle framework expansion
    const toggleFramework = (frameworkName) => {
      const newExpanded = new Set(expandedFrameworks);
      if (newExpanded.has(frameworkName)) {
        newExpanded.delete(frameworkName);
        // Also collapse all sections in this framework
        const newExpandedSections = new Set(expandedSections);
        Object.keys(groupedMatrix[frameworkName] || {}).forEach(section => {
          newExpandedSections.delete(`${frameworkName}-${section}`);
        });
        setExpandedSections(newExpandedSections);
      } else {
        newExpanded.add(frameworkName);
      }
      setExpandedFrameworks(newExpanded);
    };

    // Toggle section expansion
    const toggleSection = (frameworkName, sectionName) => {
      const sectionKey = `${frameworkName}-${sectionName}`;
      const newExpanded = new Set(expandedSections);
      if (newExpanded.has(sectionKey)) {
        newExpanded.delete(sectionKey);
      } else {
        newExpanded.add(sectionKey);
      }
      setExpandedSections(newExpanded);
    };

    // Expand/Collapse all
    const expandAll = () => {
      const allFrameworks = new Set(Object.keys(groupedMatrix));
      setExpandedFrameworks(allFrameworks);
      const allSections = new Set();
      Object.entries(groupedMatrix).forEach(([fw, sections]) => {
        Object.keys(sections).forEach(section => {
          allSections.add(`${fw}-${section}`);
        });
      });
      setExpandedSections(allSections);
    };

    const collapseAll = () => {
      setExpandedFrameworks(new Set());
      setExpandedSections(new Set());
    };

    return (
      <div className="space-y-6">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 text-foreground">Responsibility & Data Attribution Matrix</h2>
              <p className="text-muted-foreground">
                Audit-ready matrix showing control ownership, data sources, and evidence attribution
              </p>
            </div>
            <button
              onClick={exportResponsibilityMatrix}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Matrix
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="text-sm text-muted-foreground mb-1">Total Controls</div>
            <div className="text-3xl font-bold text-primary">{responsibilityMatrix.length}</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="text-sm text-muted-foreground mb-1">Shared Responsibility</div>
            <div className="text-3xl font-bold text-orange-500">
              {responsibilityMatrix.filter(m => m.shared_responsibility).length}
            </div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="text-sm text-muted-foreground mb-1">MDR/SOC Managed</div>
            <div className="text-3xl font-bold text-green-500">
              {responsibilityMatrix.filter(m => m.coverage_type === "MDR/SOC Managed").length}
            </div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="text-sm text-muted-foreground mb-1">API Integrated</div>
            <div className="text-3xl font-bold text-blue-500">
              {responsibilityMatrix.filter(m => m.data_sources.length > 0).length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Filter Matrix</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select
                value={matrixFilterCategory}
                onChange={(e) => setMatrixFilterCategory(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Coverage Type</label>
              <select
                value={matrixFilterCoverageType}
                onChange={(e) => setMatrixFilterCoverageType(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Types</option>
                {uniqueCoverageTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Owner</label>
              <select
                value={matrixFilterOwnership}
                onChange={(e) => setMatrixFilterOwnership(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Owners</option>
                {uniqueOwners.map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Responsibility Matrix - Collapsible Framework/Section View */}
        <div className="bg-card rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Responsibility Matrix ({filteredMatrix.length} controls)</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 font-medium transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-xs bg-muted text-foreground border border-[hsl(var(--border))] rounded-lg hover:bg-muted/80 font-medium transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(groupedMatrix).map(([frameworkName, sections]) => {
              const isFrameworkExpanded = expandedFrameworks.has(frameworkName);
              const frameworkControlsCount = Object.values(sections).reduce((sum, controls) => sum + controls.length, 0);
              
              return (
                <div key={frameworkName} className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                  {/* Framework Header */}
                  <button
                    onClick={() => toggleFramework(frameworkName)}
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isFrameworkExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <Shield className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <div className="font-semibold text-foreground">{frameworkName}</div>
                        <div className="text-xs text-muted-foreground">
                          {frameworkControlsCount} controls • {Object.keys(sections).length} sections
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {Object.keys(sections).length} sections
                      </span>
                    </div>
                  </button>

                  {/* Sections within Framework */}
                  {isFrameworkExpanded && (
                    <div className="bg-card border-t border-[hsl(var(--border))]">
                      {Object.entries(sections).map(([sectionName, controls]) => {
                        const sectionKey = `${frameworkName}-${sectionName}`;
                        const isSectionExpanded = expandedSections.has(sectionKey);
                        
                        return (
                          <div key={sectionKey} className="border-b border-[hsl(var(--border))] last:border-b-0">
                            {/* Section Header */}
                            <button
                              onClick={() => toggleSection(frameworkName, sectionName)}
                              className="w-full flex items-center justify-between p-3 pl-12 bg-card hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isSectionExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-foreground">{sectionName}</span>
                                <span className="text-xs text-muted-foreground">({controls.length} controls)</span>
                              </div>
                            </button>

                            {/* Controls within Section */}
                            {isSectionExpanded && (
                              <div className="bg-muted/20">
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b border-[hsl(var(--border))] bg-muted/30">
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-foreground">Control ID</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-foreground">Control Name</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-foreground">Primary Owner</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-foreground">Shared</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-foreground">Secondary Owners</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-foreground">Data Sources</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-foreground">Coverage Type</th>
                                        <th className="text-left py-2 px-4 text-xs font-semibold text-foreground">Evidence</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {controls.map((matrix, idx) => (
                                        <tr key={idx} className={`border-b border-[hsl(var(--border))] hover:bg-muted/50 transition-colors ${
                                          matrix.coverage_type === "MDR/SOC Managed" ? "bg-blue-500/10" :
                                          matrix.coverage_type === "Vendor Inherited" ? "bg-green-500/10" :
                                          matrix.coverage_type === "API Data Attribution" ? "bg-purple-500/10" :
                                          "bg-card"
                                        }`}>
                                          <td className="py-2 px-4">
                                            <div className="font-medium text-sm text-foreground">{matrix.control_id}</div>
                                          </td>
                                          <td className="py-2 px-4">
                                            <div className="text-sm text-foreground max-w-xs">{matrix.control_name}</div>
                                          </td>
                                          <td className="py-2 px-4">
                                            <span className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-semibold">
                                              {matrix.ownership}
                                            </span>
                                          </td>
                                          <td className="py-2 px-4">
                                            {matrix.shared_responsibility ? (
                                              <span className="px-2 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded text-xs font-semibold">
                                                ✓ Yes
                                              </span>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">No</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-4">
                                            <div className="flex flex-wrap gap-1">
                                              {matrix.secondary_owners.slice(0, 2).map((owner, oIdx) => (
                                                <span key={oIdx} className="text-xs bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-0.5 rounded">
                                                  {owner}
                                                </span>
                                              ))}
                                              {matrix.secondary_owners.length > 2 && (
                                                <span className="text-xs text-muted-foreground">
                                                  +{matrix.secondary_owners.length - 2}
                                                </span>
                                              )}
                                              {matrix.secondary_owners.length === 0 && (
                                                <span className="text-xs text-muted-foreground">None</span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2 px-4">
                                            {matrix.data_sources.length > 0 ? (
                                              <div className="text-xs space-y-0.5">
                                                {matrix.data_sources.slice(0, 1).map((ds, dsIdx) => (
                                                  <div key={dsIdx}>
                                                    <div className="font-medium text-purple-500">{ds.integration}</div>
                                                    <div className="text-muted-foreground">{ds.vendor}</div>
                                                  </div>
                                                ))}
                                                {matrix.data_sources.length > 1 && (
                                                  <span className="text-muted-foreground">+{matrix.data_sources.length - 1} more</span>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">None</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                                              matrix.coverage_type === "MDR/SOC Managed" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                              matrix.coverage_type === "Vendor Inherited" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                              matrix.coverage_type === "API Data Attribution" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                                              "bg-muted text-foreground border-[hsl(var(--border))]"
                                            }`}>
                                              {matrix.coverage_type}
                                            </span>
                                          </td>
                                          <td className="py-2 px-4">
                                            <div className="text-xs text-muted-foreground">
                                              {matrix.evidence_sources.length > 0 ? (
                                                <div className="flex items-center gap-1">
                                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                                  <span>{matrix.evidence_sources.length} source{matrix.evidence_sources.length !== 1 ? 's' : ''}</span>
                                                </div>
                                              ) : (
                                                <span>None</span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {Object.keys(groupedMatrix).length === 0 && (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-[hsl(var(--border))]">
              <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Controls Found</h3>
              <p className="text-sm text-muted-foreground">
                Adjust your filters to see responsibility matrix controls.
              </p>
            </div>
          )}
        </div>

        {/* API Integrations Section */}
        <div className="bg-card rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">API Integrations & Data Sources</h3>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              onClick={() => alert("Add API Integration feature - Enter vendor name, API endpoint, controls covered, and responsible party")}
            >
              <Plus className="w-4 h-4" />
              Add API Integration
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apiIntegrations.map(api => (
              <div key={api.id} className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{api.name}</h4>
                    <div className="text-sm text-muted-foreground">{api.vendor} • {api.type}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    api.status === 'active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-muted text-muted-foreground border border-[hsl(var(--border))]'
                  }`}>
                    {api.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-foreground">Controls Covered: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {api.controls_covered.map(id => (
                        <span key={id} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded">{id}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Responsible Party: </span>
                    <span className="text-muted-foreground">{api.responsible_party}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Last Sync: </span>
                    <span className="text-muted-foreground">{new Date(api.last_sync).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Sync Frequency: </span>
                    <span className="text-muted-foreground">{api.sync_frequency}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Evidence Attribution: </span>
                    <span className="text-muted-foreground">{api.evidence_attribution}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MDR/SOC Providers Section */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">MDR/SOC Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mdrProviders.map(mdr => (
              <div key={mdr.id} className="border-2 border-blue-200 rounded-lg p-4 bg-primary/10">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{mdr.name}</h4>
                    <div className="text-sm text-muted-foreground">{mdr.type}</div>
                  </div>
                  <Server className="w-6 h-6 text-blue-500" />
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-foreground">Service Level: </span>
                    <span className="text-muted-foreground">{mdr.service_level}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Controls Responsible: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mdr.controls_responsible.map(id => (
                        <span key={id} className="text-xs bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded">{id}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Evidence Attribution: </span>
                    <span className="text-muted-foreground">{mdr.evidence_attribution}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Contact: </span>
                    <span className="text-muted-foreground">{mdr.contact}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Scope: </span>
                    <span className="text-muted-foreground">{mdr.responsibility_scope}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Customer Support Info */}
        {currentEntity && (
          <div className="bg-primary/10 border-2 border-primary/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              📊 Multi-Customer Responsibility Matrix
            </h3>
            <p className="text-sm text-primary mb-3">
              This responsibility matrix is generated for: <strong>{currentEntity.name}</strong>
            </p>
            <div className="text-sm text-primary/80 space-y-1">
              <div>✓ Control ownership clearly attributed to internal teams, vendors, or MDR providers</div>
              <div>✓ Data source attribution shows which APIs provide evidence for each control</div>
              <div>✓ Export ready for audit documentation and customer reporting</div>
              <div>✓ Suitable for MSSP/MDR providers managing multiple customers</div>
            </div>
          </div>
        )}
      </div>
    );
  };
  // ============================================================================
  // IAM (Identity & Access Management) RENDER FUNCTIONS
  // ============================================================================
  
  const renderIAM = () => {
    console.log('renderIAM called, allUsers:', allUsers?.length, 'accessByArea:', accessByArea?.length, 'backendConnected:', backendConnected);
    
    // Ensure demo data is loaded if we don't have users (use useEffect instead of here)
    // This check runs on every render, so we'll use useEffect for loading
    
    const totalRoles = roles.length;
    const privilegedRoles = roles.filter((role) => role.permissions.includes('*'));
    const privilegedRolesCount = privilegedRoles.length;
    const averagePermissionsPerRole = totalRoles
      ? Math.round(roles.reduce((sum, role) => sum + (role.permissions?.length || 0), 0) / totalRoles)
      : 0;

    const permissionTemplates = [
      {
        id: 'least_privilege',
        name: 'Least Privilege Starter',
        description: 'Baseline visibility with no write access. Perfect for contractors or auditors-in-training.',
        permissions: ['dashboard.view', 'controls.view_assigned', 'reports.view'],
        recommendedFor: 'Observers, business stakeholders, external auditors',
      },
      {
        id: 'control_owner',
        name: 'Control Owner Toolkit',
        description: 'Adds evidence upload and control updates without broad administrative powers.',
        permissions: ['controls.view', 'controls.edit_assigned', 'evidence.upload', 'reports.generate'],
        recommendedFor: 'Control owners, department managers',
      },
      {
        id: 'security_operator',
        name: 'Security Operations',
        description: 'Balanced access for analysts handling incidents, vendors, and integrations.',
        permissions: ['controls.view', 'vendors.edit', 'incidents.manage', 'integrations.manage'],
        recommendedFor: 'Security analysts, platform operators',
      },
      {
        id: 'full_admin',
        name: 'Platform Administrator',
        description: 'Full system control including IAM, automation, and data architecture changes.',
        permissions: ['*'],
        recommendedFor: 'CISO, Platform owners, Senior administrators',
      },
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">IAM, Roles & Permissions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Centralize account access, roles, vendor privileges, and audit evidence in one workspace.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPermissionGrant(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Grant Permission
              </button>
              <button
                onClick={() => setShowVendorProfile(true)}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Vendor Profile
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
            <div className="text-sm text-muted-foreground mb-1">Active Roles</div>
            <div className="text-2xl font-bold text-foreground">{totalRoles}</div>
            <div className="text-xs text-muted-foreground mt-1">{privilegedRolesCount} elevated</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
            <div className="text-sm text-muted-foreground mb-1">Active Permissions</div>
            <div className="text-2xl font-bold text-foreground">{userPermissions.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Avg {averagePermissionsPerRole} per role</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
            <div className="text-sm text-muted-foreground mb-1">Privileged Roles</div>
            <div className="text-2xl font-bold text-foreground">{privilegedRolesCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {(totalRoles ? Math.round((privilegedRolesCount / totalRoles) * 100) : 0)}% of total
            </div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
            <div className="text-sm text-muted-foreground mb-1">Vendor Profiles</div>
            <div className="text-2xl font-bold text-foreground">{vendorAccessProfiles.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Access monitored</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
            <div className="text-sm text-muted-foreground mb-1">Expiring Soon</div>
            <div className="text-2xl font-bold text-yellow-500">
              {userPermissions.filter(p => {
                if (!p.expires_at) return false;
                const expires = new Date(p.expires_at);
                const daysUntilExpiry = (expires - new Date()) / (1000 * 60 * 60 * 24);
                return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
              }).length}
            </div>
          </div>
        </div>

        {/* Role Directory */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Role Directory</h3>
              <p className="text-sm text-muted-foreground">
                Curated access bundles with mapped permissions, user counts, and best-fit scenarios.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 border border-[hsl(var(--border))] rounded-lg px-3 py-2">
              <Shield className="w-3 h-3" />
              <span>{averagePermissionsPerRole} avg permissions per role</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {roles.map((role) => {
              const displayPermissions = role.permissions.slice(0, 4);
              const remaining = Math.max(role.permissions.length - displayPermissions.length, 0);
              const borderAccent =
                role.color === 'red' ? 'border-red-500/30' :
                role.color === 'blue' ? 'border-blue-500/30' :
                role.color === 'green' ? 'border-green-500/30' :
                role.color === 'purple' ? 'border-purple-500/30' :
                role.color === 'yellow' ? 'border-yellow-500/30' :
                'border-muted';

              return (
                <div key={role.id} className={`border ${borderAccent} rounded-lg p-4 bg-muted/20 hover:bg-muted/30 transition-colors`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{role.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                    </div>
                    <span className="px-2 py-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full">
                      {role.userCount} users
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {displayPermissions.map((perm) => (
                        <span key={`${role.id}-${perm}`} className="text-[11px] bg-card border border-[hsl(var(--border))] px-2 py-0.5 rounded text-muted-foreground">
                          {perm === '*' ? 'Full access' : perm}
                        </span>
                      ))}
                      {remaining > 0 && (
                        <span className="text-[11px] text-muted-foreground">+{remaining} more</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Activity className="w-3 h-3" />
                      <span>
                        Coverage: {role.permissions.includes('*') ? 'All resources' : `${role.permissions.length} scoped rights`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permission Templates */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Permission Templates</h3>
              <p className="text-sm text-muted-foreground">
                Starter bundles to accelerate onboarding and maintain least-privilege access.
              </p>
            </div>
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {permissionTemplates.map((template) => (
              <div key={template.id} className="border border-[hsl(var(--border))] rounded-lg p-4 bg-muted/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{template.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {template.permissions.slice(0, 3).map((perm) => (
                      <span key={`${template.id}-${perm}`} className="text-[11px] bg-card border border-[hsl(var(--border))] px-2 py-0.5 rounded text-muted-foreground">
                        {perm}
                      </span>
                    ))}
                    {template.permissions.length > 3 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{template.permissions.length - 3} more
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>{template.recommendedFor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Permissions Table */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
          <div className="p-6 border-b border-[hsl(var(--border))]">
            <h3 className="text-lg font-semibold text-foreground">User Permissions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Resource</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Permission</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Granted By</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Expires</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userPermissions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-muted-foreground">
                      No permissions found. Grant permissions to get started.
                    </td>
                  </tr>
                ) : (
                  userPermissions.map((perm) => (
                    <tr key={perm.id} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                      <td className="py-3 px-4 text-sm text-foreground">{perm.user_email || `User ${perm.user_id}`}</td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        <span className="font-medium">{perm.resource_type}</span>
                        {perm.resource_id && <span className="text-muted-foreground ml-1">({perm.resource_id})</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          perm.permission_type === 'read' ? 'bg-blue-500/10 text-blue-500' :
                          perm.permission_type === 'write' ? 'bg-green-500/10 text-green-500' :
                          perm.permission_type === 'execute' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {perm.permission_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{perm.granted_by_email || `User ${perm.granted_by}`}</td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {perm.expires_at ? (
                          <span className={new Date(perm.expires_at) < new Date() ? 'text-red-500' : ''}>
                            {new Date(perm.expires_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={async () => {
                            if (confirm('Revoke this permission?')) {
                              try {
                                await api.revokePermission(currentUser.id, perm.id, 'Revoked by admin');
                                await loadIAMData();
                              } catch (error) {
                                console.error('Permission revoke error:', error);
                                const errorMsg = error.detail || error.message || (error instanceof Error ? error.message : String(error));
                                alert('Error revoking permission: ' + errorMsg);
                              }
                            }
                          }}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
          <div className="p-6 border-b border-[hsl(var(--border))]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Permission Audit Log</h3>
                <p className="text-sm text-muted-foreground mt-1">Immutable record of all permission changes</p>
              </div>
              <span className="text-xs text-muted-foreground border border-[hsl(var(--border))] rounded-lg px-3 py-1 bg-muted/60">
                {permissionAuditLog.length} events recorded
              </span>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Timestamp</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Event</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Resource</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Granted By</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {permissionAuditLog.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-muted-foreground">
                      No audit log entries yet.
                    </td>
                  </tr>
                ) : (
                  permissionAuditLog.map((log) => (
                    <tr key={log.id} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                      <td className="py-3 px-4 text-sm text-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.event_type === 'grant' ? 'bg-green-500/10 text-green-500' :
                          log.event_type === 'revoke' ? 'bg-red-500/10 text-red-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">User {log.user_id}</td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {log.resource_type} {log.resource_id && `(${log.resource_id})`}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">User {log.granted_by}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{log.ip_address || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Access Tracking Section */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">User Access Tracking & Auto-Mapping</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically track user access, login sessions, and map permissions with r/w/x breakdown
              </p>
            </div>
            <button
              onClick={() => {
                if (currentUser.id) {
                  api.triggerAutoMapPermissions(currentUser.id, currentUser.id).then(() => {
                    loadAccessTrackingData();
                  });
                }
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Re-map Permissions
            </button>
          </div>

          {/* User Statistics Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Users by Login Count - Bar Chart */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
              <h4 className="text-md font-semibold text-foreground mb-4">Users by Login Count</h4>
              {allUsers && allUsers.length > 0 ? (
                <div className="space-y-3">
                  {allUsers
                    .sort((a, b) => (b.total_logins || 0) - (a.total_logins || 0))
                    .slice(0, 7)
                    .map((user) => {
                    const maxLogins = Math.max(...allUsers.map(u => u.total_logins || 0), 1);
                    const percentage = ((user.total_logins || 0) / maxLogins) * 100;
                    return (
                      <div
                        key={user.id}
                        onClick={() => {
                          setSelectedUserForDetails(user);
                          setSelectedUserForTracking(user.id);
                          loadUserAccessDetails(user.id);
                        }}
                        className="cursor-pointer hover:bg-muted/30 p-2 rounded transition-colors border border-[hsl(var(--border))]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{user.name}</span>
                          <span className="text-sm font-bold text-primary">{user.total_logins || 0}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className="bg-primary h-3 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Loading user data...</p>
                </div>
              )}
            </div>

            {/* Users by Access Level - Role Distribution */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
              <h4 className="text-md font-semibold text-foreground mb-4">Users by Access Level</h4>
              {allUsers && allUsers.length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(
                    allUsers.reduce((acc, user) => {
                      const role = user.role || 'viewer';
                      acc[role] = (acc[role] || 0) + 1;
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([role, count]) => {
                      const totalUsers = allUsers.length || 1;
                      const percentage = (count / totalUsers) * 100;
                      const roleColors = {
                        admin: 'bg-red-500',
                        security_analyst: 'bg-blue-500',
                        compliance_manager: 'bg-purple-500',
                        control_owner: 'bg-green-500',
                        auditor: 'bg-yellow-500',
                        viewer: 'bg-gray-500',
                        vendor: 'bg-orange-500'
                      };
                      return (
                        <div
                          key={role}
                          onClick={() => {
                            const usersInRole = allUsers.filter(u => (u.role || 'viewer') === role);
                            if (usersInRole.length > 0) {
                              setSelectedUserForDetails(usersInRole[0]);
                              setSelectedUserForTracking(usersInRole[0].id);
                              loadUserAccessDetails(usersInRole[0].id);
                            }
                          }}
                          className="cursor-pointer hover:bg-muted/30 p-2 rounded transition-colors border border-[hsl(var(--border))]"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${roleColors[role] || 'bg-gray-500'}`} />
                              <span className="text-sm font-medium text-foreground capitalize">{role.replace('_', ' ')}</span>
                            </div>
                            <span className="text-sm font-bold text-primary">{count}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3">
                            <div
                              className={`${roleColors[role] || 'bg-gray-500'} h-3 rounded-full transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Loading role data...</p>
                </div>
              )}
            </div>
          </div>

          {/* User List with Access Stats - Collapsible */}
          <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
            <button
              onClick={() => setIamSectionsExpanded(prev => ({ ...prev, userList: !prev.userList }))}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                All Users ({allUsers?.length || 0})
              </h4>
              {iamSectionsExpanded.userList ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {iamSectionsExpanded.userList && (
              <div className="p-6 pt-0 space-y-4">
            <h4 className="text-md font-semibold text-foreground">All Users</h4>
            {allUsers && allUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    setSelectedUserForDetails(user);
                    setSelectedUserForTracking(user.id);
                    loadUserAccessDetails(user.id);
                  }}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedUserForTracking === user.id
                      ? 'border-primary bg-primary/5'
                      : 'border-[hsl(var(--border))] hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-foreground">{user.name || user.email}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    <span className="px-2 py-1 text-xs bg-muted rounded">{user.role || 'viewer'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Logins</div>
                      <div className="font-semibold text-foreground">{user.total_logins || 0}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Accesses</div>
                      <div className="font-semibold text-foreground">{user.total_accesses || 0}</div>
                    </div>
                  </div>
                  {user.last_access && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Last: {new Date(user.last_access).toLocaleDateString()}
                    </div>
                  )}
                </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted/30 rounded-lg border border-[hsl(var(--border))]">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading user data...</p>
              </div>
            )}
              </div>
            )}
          </div>

          {/* Access Summary - Collapsible */}
          {userAccessSummary && (
            <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
              <button
                onClick={() => setIamSectionsExpanded(prev => ({ ...prev, accessSummary: !prev.accessSummary }))}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Access Summary (Last 30 Days)
                </h4>
                {iamSectionsExpanded.accessSummary ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {iamSectionsExpanded.accessSummary && (
                <div className="p-6 pt-0 space-y-4">
              <h4 className="text-md font-semibold text-foreground">Access Summary (Last 30 Days)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Total Logins</div>
                  <div className="text-xl font-bold text-foreground">{userAccessSummary.sessions?.total_logins || 0}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Total Accesses</div>
                  <div className="text-xl font-bold text-foreground">{userAccessSummary.access?.total_accesses || 0}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Unique Resources</div>
                  <div className="text-xl font-bold text-foreground">{userAccessSummary.access?.unique_resources || 0}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Session Time</div>
                  <div className="text-xl font-bold text-foreground">
                    {userAccessSummary.sessions?.total_session_time_seconds
                      ? Math.round(userAccessSummary.sessions.total_session_time_seconds / 3600)
                      : 0}h
                  </div>
                </div>
              </div>
              
              {/* Permission Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="text-xs text-blue-500 mb-1">Read Actions</div>
                  <div className="text-xl font-bold text-blue-500">{userAccessSummary.access?.read_actions || 0}</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="text-xs text-green-500 mb-1">Write Actions</div>
                  <div className="text-xl font-bold text-green-500">{userAccessSummary.access?.write_actions || 0}</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <div className="text-xs text-purple-500 mb-1">Execute Actions</div>
                  <div className="text-xl font-bold text-purple-500">{userAccessSummary.access?.execute_actions || 0}</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="text-xs text-red-500 mb-1">Delete Actions</div>
                  <div className="text-xl font-bold text-red-500">{userAccessSummary.access?.delete_actions || 0}</div>
                </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Auto-Mapped Permissions - Collapsible */}
          {mappedPermissions.length > 0 && (
            <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
              <button
                onClick={() => setIamSectionsExpanded(prev => ({ ...prev, permissions: !prev.permissions }))}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Auto-Mapped Permissions ({mappedPermissions.length})
                </h4>
                {iamSectionsExpanded.permissions ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {iamSectionsExpanded.permissions && (
                <div className="p-6 pt-0 space-y-4">
              <h4 className="text-md font-semibold text-foreground">Auto-Mapped Permissions (r/w/x)</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Resource Type</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Resource ID</th>
                      <th className="text-center py-2 px-3 text-sm font-semibold text-foreground">Read</th>
                      <th className="text-center py-2 px-3 text-sm font-semibold text-foreground">Write</th>
                      <th className="text-center py-2 px-3 text-sm font-semibold text-foreground">Execute</th>
                      <th className="text-center py-2 px-3 text-sm font-semibold text-foreground">Delete</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Source</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedPermissions.map((perm, idx) => (
                      <tr key={idx} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                        <td className="py-2 px-3 text-sm text-foreground font-medium">{perm.resource_type}</td>
                        <td className="py-2 px-3 text-sm text-muted-foreground">{perm.resource_id || 'All'}</td>
                        <td className="py-2 px-3 text-center">
                          {perm.read ? (
                            <span className="inline-block w-6 h-6 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-blue-500" />
                            </span>
                          ) : (
                            <span className="inline-block w-6 h-6 rounded-full bg-muted border-2 border-[hsl(var(--border))]" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {perm.write ? (
                            <span className="inline-block w-6 h-6 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-green-500" />
                            </span>
                          ) : (
                            <span className="inline-block w-6 h-6 rounded-full bg-muted border-2 border-[hsl(var(--border))]" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {perm.execute ? (
                            <span className="inline-block w-6 h-6 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-purple-500" />
                            </span>
                          ) : (
                            <span className="inline-block w-6 h-6 rounded-full bg-muted border-2 border-[hsl(var(--border))]" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {perm.delete ? (
                            <span className="inline-block w-6 h-6 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-red-500" />
                            </span>
                          ) : (
                            <span className="inline-block w-6 h-6 rounded-full bg-muted border-2 border-[hsl(var(--border))]" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-sm text-muted-foreground">{perm.discovered_from || 'unknown'}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${(perm.confidence_score || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">
                              {Math.round((perm.confidence_score || 0) * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Compliance Control Mapping - Collapsible */}
          {complianceMapping.length > 0 && (
            <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
              <button
                onClick={() => setIamSectionsExpanded(prev => ({ ...prev, compliance: !prev.compliance }))}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Compliance Control Mapping ({complianceMapping.length})
                </h4>
                {iamSectionsExpanded.compliance ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {iamSectionsExpanded.compliance && (
                <div className="p-6 pt-0 space-y-4">
              <h4 className="text-md font-semibold text-foreground">Compliance Control Mapping (NIST 800-53)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {complianceMapping.map((mapping, idx) => (
                  <div
                    key={idx}
                    className="border border-[hsl(var(--border))] rounded-lg p-3 bg-muted/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-foreground">{mapping.control_id}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          mapping.compliance_status === 'compliant'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {mapping.compliance_status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Permission: {mapping.permission_type}</div>
                      <div>Resource: {mapping.resource_type} {mapping.resource_id ? `(${mapping.resource_id})` : ''}</div>
                      {mapping.last_verified_at && (
                        <div>Verified: {new Date(mapping.last_verified_at).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Access by Area - Collapsible */}
          {accessByArea && accessByArea.length > 0 ? (
            <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
              <button
                onClick={() => setIamSectionsExpanded(prev => ({ ...prev, accessByArea: !prev.accessByArea }))}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                  <Network className="w-4 h-4" />
                  Access by Area ({accessByArea.length} areas)
                </h4>
                {iamSectionsExpanded.accessByArea ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {iamSectionsExpanded.accessByArea && (
                <div className="p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-foreground">Access by Area - User Access Timeline</h4>
                <span className="text-xs text-muted-foreground bg-muted/60 border border-[hsl(var(--border))] rounded-lg px-3 py-1">
                  {accessByArea.reduce((sum, area) => sum + area.total_accesses, 0)} total accesses across {accessByArea.length} areas
                </span>
              </div>
              
              <div className="space-y-6">
                {accessByArea.map((area, areaIdx) => {
                  const isExpanded = expandedArea === areaIdx;
                  return (
                    <div key={areaIdx} className="border border-[hsl(var(--border))] rounded-lg p-4 bg-card">
                      <div 
                        className="flex items-center justify-between mb-4 cursor-pointer"
                        onClick={() => setExpandedArea(isExpanded ? null : areaIdx)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="text-lg font-semibold text-foreground">{area.area_name}</h5>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {area.unique_users} users
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="w-4 h-4" />
                              {area.total_accesses} accesses
                            </span>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium">
                          {area.resource_type}
                        </span>
                      </div>
                      
                      {/* User Access Timeline - Expandable */}
                      {isExpanded && (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {area.accesses.slice(0, 50).map((access, accessIdx) => {
                        const accessDate = new Date(access.timestamp);
                        const isToday = accessDate.toDateString() === new Date().toDateString();
                        const isYesterday = accessDate.toDateString() === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
                        
                        return (
                          <div
                            key={accessIdx}
                            onClick={() => {
                              const user = allUsers.find(u => u.id === access.user_id);
                              if (user) {
                                setSelectedUserForDetails(user);
                                setSelectedUserForTracking(user.id);
                                loadUserAccessDetails(user.id);
                              }
                            }}
                            className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-[hsl(var(--border))] cursor-pointer"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary">
                                {access.user_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground text-sm">{access.user_name}</span>
                                  <span className="text-xs text-muted-foreground">({access.user_email})</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    access.user_role === 'admin' ? 'bg-red-500/10 text-red-500' :
                                    access.user_role === 'security_analyst' ? 'bg-blue-500/10 text-blue-500' :
                                    access.user_role === 'compliance_manager' ? 'bg-purple-500/10 text-purple-500' :
                                    access.user_role === 'auditor' ? 'bg-yellow-500/10 text-yellow-500' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {access.user_role}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    access.permission === 'read' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                    access.permission === 'write' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                    access.permission === 'execute' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                    'bg-red-500/10 text-red-500 border border-red-500/20'
                                  }`}>
                                    {access.permission}
                                  </span>
                                  {access.success ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="font-medium">{access.action}</span>
                                {access.resource_id && (
                                  <span className="text-muted-foreground">• Resource: {access.resource_id}</span>
                                )}
                                <span className="ml-auto">
                                  {isToday ? 'Today' : isYesterday ? 'Yesterday' : accessDate.toLocaleDateString()} at {accessDate.toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                          {area.accesses.length > 50 && (
                            <div className="text-center text-sm text-muted-foreground py-2">
                              ... and {area.accesses.length - 50} more accesses
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
          ) : (
            <div className="text-center py-8 bg-muted/30 rounded-lg border border-[hsl(var(--border))]">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="text-md font-semibold text-foreground mb-2">No Access Data Available</h4>
              <p className="text-sm text-muted-foreground">
                Access tracking data will appear here once users start accessing the platform.
              </p>
            </div>
          )}

          {/* Access Logs - Collapsible */}
          {userAccessLogs.length > 0 && (
            <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
              <button
                onClick={() => setIamSectionsExpanded(prev => ({ ...prev, accessLogs: !prev.accessLogs }))}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Recent Access Logs ({userAccessLogs.length})
                </h4>
                {iamSectionsExpanded.accessLogs ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {iamSectionsExpanded.accessLogs && (
                <div className="p-6 pt-0 space-y-4">
              <h4 className="text-md font-semibold text-foreground">Recent Access Logs</h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Timestamp</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Resource</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Action</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Permission</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userAccessLogs.slice(0, 50).map((log, idx) => (
                      <tr key={idx} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                        <td className="py-2 px-3 text-xs text-foreground">
                          {new Date(log.access_timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-sm text-foreground">
                          {log.resource_type} {log.resource_id ? `(${log.resource_id})` : ''}
                        </td>
                        <td className="py-2 px-3 text-sm text-foreground">{log.action_type}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              log.permission_used === 'read'
                                ? 'bg-blue-500/10 text-blue-500'
                                : log.permission_used === 'write'
                                ? 'bg-green-500/10 text-green-500'
                                : log.permission_used === 'execute'
                                ? 'bg-purple-500/10 text-purple-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {log.permission_used}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              log.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* User Detail Modal */}
        {selectedUserForDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUserForDetails(null)}>
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-card border-b border-[hsl(var(--border))] p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{selectedUserForDetails.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{selectedUserForDetails.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUserForDetails(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* User Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-1">Total Logins</div>
                    <div className="text-2xl font-bold text-foreground">{selectedUserForDetails.total_logins || 0}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-1">Total Accesses</div>
                    <div className="text-2xl font-bold text-foreground">{selectedUserForDetails.total_accesses || 0}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-1">Role</div>
                    <div className="text-lg font-semibold text-foreground capitalize">{(selectedUserForDetails.role || 'viewer').replace('_', ' ')}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-1">Last Access</div>
                    <div className="text-sm font-semibold text-foreground">
                      {selectedUserForDetails.last_access 
                        ? new Date(selectedUserForDetails.last_access).toLocaleString()
                        : 'Never'}
                    </div>
                  </div>
                </div>

                {/* Access Summary */}
                {userAccessSummary && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-foreground">Access Summary (Last 30 Days)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <div className="text-xs text-blue-500 mb-1">Read Actions</div>
                        <div className="text-xl font-bold text-blue-500">{userAccessSummary.access?.read_actions || 0}</div>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <div className="text-xs text-green-500 mb-1">Write Actions</div>
                        <div className="text-xl font-bold text-green-500">{userAccessSummary.access?.write_actions || 0}</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                        <div className="text-xs text-purple-500 mb-1">Execute Actions</div>
                        <div className="text-xl font-bold text-purple-500">{userAccessSummary.access?.execute_actions || 0}</div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <div className="text-xs text-red-500 mb-1">Delete Actions</div>
                        <div className="text-xl font-bold text-red-500">{userAccessSummary.access?.delete_actions || 0}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Access Logs */}
                {userAccessLogs.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-foreground">Recent Access Logs</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {userAccessLogs.slice(0, 20).map((log, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-[hsl(var(--border))]">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">{log.resource_type}</span>
                              {log.resource_id && (
                                <span className="text-sm text-muted-foreground">({log.resource_id})</span>
                              )}
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                log.permission_used === 'read' ? 'bg-blue-500/10 text-blue-500' :
                                log.permission_used === 'write' ? 'bg-green-500/10 text-green-500' :
                                log.permission_used === 'execute' ? 'bg-purple-500/10 text-purple-500' :
                                'bg-red-500/10 text-red-500'
                              }`}>
                                {log.permission_used}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.action_type} • {new Date(log.access_timestamp).toLocaleString()}
                            </div>
                          </div>
                          {log.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showPermissionGrant && renderPermissionGrantModal()}
        {showVendorProfile && renderVendorProfileModal()}
      </div>
    );
  };
  const renderCSCA = () => {
    try {
      const severityColors = {
        critical: 'bg-red-500/10 text-red-500 border-red-500/20',
        high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        info: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      };

      const eventTypeIcons = {
        threat_detected: Shield,
        vulnerability_found: AlertTriangle,
        incident: AlertCircle,
        policy_violation: XCircle,
        configuration_change: Settings
      };

      return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Security-Compliance Alignment</h2>
              <p className="text-sm text-muted-foreground mt-1">Real-time correlation between security events and compliance posture</p>
            </div>
            <div className="flex gap-2">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
            <div className="text-sm text-muted-foreground mb-1">Security Events (30d)</div>
            <div className="text-2xl font-bold text-foreground">{securityEvents.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {securityEvents.filter(e => e.status === 'open').length} open
            </div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
            <div className="text-sm text-muted-foreground mb-1">Compliance Alerts</div>
            <div className="text-2xl font-bold text-yellow-500">
              {complianceAlerts.filter(a => !a.acknowledged).length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Unacknowledged</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
            <div className="text-sm text-muted-foreground mb-1">Critical Events</div>
            <div className="text-2xl font-bold text-red-500">
              {securityEvents.filter(e => e.severity === 'critical').length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
            <div className="text-sm text-muted-foreground mb-1">Controls Affected</div>
            <div className="text-2xl font-bold text-foreground">
              {new Set(securityEvents.flatMap(e => e.compliance_mappings?.map(m => m.control_id) || [])).size}
            </div>
            <div className="text-xs text-muted-foreground mt-1">By security events</div>
          </div>
        </div>

        {/* Security Events Table */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
          <div className="p-6 border-b border-[hsl(var(--border))]">
            <h3 className="text-lg font-semibold text-foreground">Security Events & Compliance Impact</h3>
            <p className="text-sm text-muted-foreground mt-1">Security events automatically mapped to compliance controls</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Event</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Source</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Severity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Controls Affected</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Detected</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {securityEvents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-muted-foreground">
                      No security events yet. Security events will appear here when ingested from SIEM, EDR, or CSPM tools.
                    </td>
                  </tr>
                ) : (
                  securityEvents.map((event) => {
                    const IconComponent = eventTypeIcons[event.event_type] || AlertCircle;
                    return (
                      <tr key={event.id} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium text-foreground">{event.title}</div>
                              {event.description && (
                                <div className="text-xs text-muted-foreground mt-0.5">{event.description.substring(0, 60)}...</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          <div>{event.source_tool || event.event_source}</div>
                          <div className="text-xs text-muted-foreground">{event.event_type}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${severityColors[event.severity] || severityColors.info}`}>
                            {event.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            event.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
                            event.status === 'investigating' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {event.compliance_mappings?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {event.compliance_mappings.slice(0, 3).map((mapping, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                  {mapping.control_id}
                                </span>
                              ))}
                              {event.compliance_mappings.length > 3 && (
                                <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                                  +{event.compliance_mappings.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {new Date(event.detected_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={async () => {
                              try {
                                const impact = await api.getSecurityEventComplianceImpact(event.id, currentUser.id);
                                setSelectedSecurityEvent({ ...event, impact });
                                setShowSecurityEventModal(true);
                              } catch (error) {
                                console.error('Error fetching compliance impact:', error);
                                alert('Error loading compliance impact');
                              }
                            }}
                            className="text-primary hover:text-primary/80 text-sm"
                          >
                            View Impact
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance Score Trends Chart */}
        {complianceScoreHistory.length > 0 && (
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
            <div className="p-6 border-b border-[hsl(var(--border))]">
              <h3 className="text-lg font-semibold text-foreground">Compliance Score Trends (30 Days)</h3>
              <p className="text-sm text-muted-foreground mt-1">Track how security events impact compliance scores over time</p>
            </div>
            <div className="p-6">
              {/* Group by framework */}
              {['NIST_800-53', 'ISO27001', 'SOC2', 'CIS'].map((framework) => {
                const frameworkHistory = complianceScoreHistory
                  .filter(h => h.framework === framework)
                  .sort((a, b) => new Date(a.calculated_at) - new Date(b.calculated_at))
                  .slice(-30); // Last 30 data points
                
                if (frameworkHistory.length === 0) return null;
                
                const maxScore = 100;
                const minScore = Math.min(...frameworkHistory.map(h => h.overall_score), 0);
                const scoreRange = maxScore - minScore || 1;
                const chartHeight = 200;
                const chartWidth = 800;
                
                // Generate points for the line chart
                const points = frameworkHistory.map((point, index) => {
                  const x = (index / (frameworkHistory.length - 1 || 1)) * chartWidth;
                  const y = chartHeight - ((point.overall_score - minScore) / scoreRange) * chartHeight;
                  return `${x},${y}`;
                }).join(' ');
                
                // Find security event impacts
                const impactPoints = frameworkHistory
                  .map((point, index) => {
                    if (point.security_event_impact > 0) {
                      const x = (index / (frameworkHistory.length - 1 || 1)) * chartWidth;
                      const y = chartHeight - ((point.overall_score - minScore) / scoreRange) * chartHeight;
                      return { x, y, impact: point.security_event_impact };
                    }
                    return null;
                  })
                  .filter(Boolean);
                
                return (
                  <div key={framework} className="mb-6 last:mb-0">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-foreground">{framework}</h4>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Current: <span className="text-foreground font-semibold">{frameworkHistory[frameworkHistory.length - 1]?.overall_score || 0}%</span></span>
                        {frameworkHistory.length > 1 && (
                          <span>
                            {frameworkHistory[frameworkHistory.length - 1].overall_score >= frameworkHistory[0].overall_score ? (
                              <span className="text-green-500 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                +{frameworkHistory[frameworkHistory.length - 1].overall_score - frameworkHistory[0].overall_score}%
                              </span>
                            ) : (
                              <span className="text-red-500 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                {frameworkHistory[frameworkHistory.length - 1].overall_score - frameworkHistory[0].overall_score}%
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative h-[200px] border-l-2 border-b-2 border-[hsl(var(--border))] bg-muted/5 rounded">
                      <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map((score) => {
                          const y = chartHeight - ((score - minScore) / scoreRange) * chartHeight;
                          return (
                            <g key={score}>
                              <line
                                x1="0"
                                y1={y}
                                x2={chartWidth}
                                y2={y}
                                stroke="currentColor"
                                strokeOpacity="0.1"
                                strokeWidth="1"
                              />
                              <text
                                x="-5"
                                y={y + 4}
                                fontSize="10"
                                fill="currentColor"
                                className="text-muted-foreground"
                                textAnchor="end"
                              >
                                {score}
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* Score line */}
                        <polyline
                          points={points}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                          className="drop-shadow-sm"
                        />
                        
                        {/* Area fill */}
                        <polygon
                          points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
                          fill="hsl(var(--primary))"
                          fillOpacity="0.1"
                        />
                        
                        {/* Security event impact markers */}
                        {impactPoints.map((point, idx) => (
                          <g key={idx}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="4"
                              fill="#ef4444"
                              stroke="white"
                              strokeWidth="2"
                            />
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="8"
                              fill="#ef4444"
                              fillOpacity="0.2"
                            />
                          </g>
                        ))}
                      </svg>
                      
                      {/* X-axis labels (dates) */}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2 -mb-5">
                        <span>{new Date(frameworkHistory[0]?.calculated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span>{new Date(frameworkHistory[Math.floor(frameworkHistory.length / 2)]?.calculated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span>{new Date(frameworkHistory[frameworkHistory.length - 1]?.calculated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="mt-8 flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span>Compliance Score</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>Security Event Impact</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Security-Compliance Correlation Graph */}
        {securityComplianceCorrelation && (
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
            <div className="p-6 border-b border-[hsl(var(--border))]">
              <h3 className="text-lg font-semibold text-foreground">Security-Compliance Correlation</h3>
              <p className="text-sm text-muted-foreground mt-1">Visualize the relationship between security events and compliance scores</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Type Impact */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4">Event Type Impact</h4>
                  <div className="space-y-3">
                    {securityComplianceCorrelation.security_events?.map((event, idx) => {
                      const maxImpact = Math.max(...(securityComplianceCorrelation.security_events?.map(e => Math.abs(e.avg_impact)) || [1]));
                      const barWidth = Math.abs(event.avg_impact / maxImpact) * 100;
                      const isNegative = event.avg_impact < 0;
                      
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-foreground capitalize">{event.event_type.replace('_', ' ')}</span>
                            <span className={`font-semibold ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
                              {isNegative ? '' : '+'}{event.avg_impact.toFixed(1)} pts
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${isNegative ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {event.event_count} events ({event.severity} severity)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Framework Trend Summary */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4">Framework Trends</h4>
                  <div className="space-y-3">
                    {['NIST_800-53', 'ISO27001', 'SOC2', 'CIS'].map((framework) => {
                      const frameworkData = securityComplianceCorrelation.compliance_trends?.filter(t => t.framework === framework);
                      if (!frameworkData || frameworkData.length === 0) return null;
                      
                      const firstScore = frameworkData[0]?.overall_score || 0;
                      const lastScore = frameworkData[frameworkData.length - 1]?.overall_score || 0;
                      const change = lastScore - firstScore;
                      const totalImpact = frameworkData.reduce((sum, d) => sum + (d.security_event_impact || 0), 0);
                      
                      return (
                        <div key={framework} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">{framework}</span>
                            <span className={`text-sm font-semibold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Score: {lastScore}%</span>
                            {totalImpact > 0 && (
                              <span className="text-red-500">• Security Impact: -{totalImpact} pts</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compliance Alerts */}
        {complianceAlerts.length > 0 && (
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
            <div className="p-6 border-b border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Compliance Alerts</h3>
                  <p className="text-sm text-muted-foreground mt-1">Alerts triggered by security events affecting compliance</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {complianceAlerts.filter(a => !a.acknowledged).slice(0, 10).map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${severityColors[alert.severity] || severityColors.info}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <h4 className="text-sm font-semibold text-foreground">{alert.title}</h4>
                      </div>
                      {alert.description && (
                        <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>
                      )}
                      {alert.compliance_score_before !== null && alert.compliance_score_after !== null && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Score:</span>
                          <span className="text-foreground">{alert.compliance_score_before}</span>
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          <span className="text-red-500">{alert.compliance_score_after}</span>
                          {alert.framework && (
                            <span className="text-muted-foreground ml-2">({alert.framework})</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await api.acknowledgeComplianceAlert(alert.id, currentUser.id);
                          await loadCSCAData();
                        } catch (error) {
                          console.error('Error acknowledging alert:', error);
                          alert('Error acknowledging alert');
                        }
                      }}
                      className="px-3 py-1 bg-card border border-[hsl(var(--border))] rounded text-xs text-foreground hover:bg-muted"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pattern Detection & Trend Analysis */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
          <div className="p-6 border-b border-[hsl(var(--border))]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Pattern Detection & Trend Analysis</h3>
                <p className="text-sm text-muted-foreground mt-1">AI-powered pattern detection with 30-day lookback analysis</p>
              </div>
              <div className="flex gap-2">
                {backendConnected && currentUser.id && (
                  <>
                    <button
                      onClick={runPatternDetection}
                      disabled={patternDetectionRunning}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ActivitySquare className="w-4 h-4" />
                      {patternDetectionRunning ? 'Detecting...' : 'Run Pattern Detection'}
                    </button>
                    <button
                      onClick={() => loadDemoCSCAData()}
                      className="px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Load Demo Data
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Pattern Statistics */}
            {patternTrends && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Pattern Types</div>
                  <div className="text-2xl font-bold text-foreground">
                    {patternTrends.pattern_statistics?.length || 0}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Active Patterns</div>
                  <div className="text-2xl font-bold text-foreground">{detectedPatterns.length}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Pattern Alerts</div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {patternAlerts.filter(a => !a.acknowledged).length}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">30-Day Lookback</div>
                  <div className="text-2xl font-bold text-foreground">{patternTrends.lookback_days || 30}d</div>
                </div>
              </div>
            )}

            {/* Detected Patterns */}
            {detectedPatterns.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-4">Detected Patterns</h4>
                <div className="space-y-3">
                  {detectedPatterns.map((pattern) => (
                    <div key={pattern.id} className={`p-4 rounded-lg border ${severityColors[pattern.severity] || severityColors.info}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <ActivitySquare className="w-4 h-4" />
                            <h5 className="text-sm font-semibold text-foreground">{pattern.pattern_name}</h5>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                              {pattern.pattern_type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{pattern.pattern_description}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">
                              Occurrences: <span className="text-foreground font-semibold">{pattern.occurrence_count}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Confidence: <span className="text-foreground font-semibold">{(pattern.confidence_score * 100).toFixed(0)}%</span>
                            </span>
                            {pattern.trend_direction && (
                              <span className={`flex items-center gap-1 ${
                                pattern.trend_direction === 'increasing' ? 'text-red-500' :
                                pattern.trend_direction === 'decreasing' ? 'text-green-500' :
                                'text-muted-foreground'
                              }`}>
                                {pattern.trend_direction === 'increasing' ? <TrendingUp className="w-3 h-3" /> :
                                 pattern.trend_direction === 'decreasing' ? <TrendingDown className="w-3 h-3" /> : null}
                                {pattern.trend_direction}
                                {pattern.trend_percentage !== 0 && ` (${pattern.trend_percentage > 0 ? '+' : ''}${pattern.trend_percentage.toFixed(1)}%)`}
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              Last detected: {new Date(pattern.last_detected_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ActivitySquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  {backendConnected 
                    ? 'No patterns detected yet. Click "Run Pattern Detection" to analyze security events.'
                    : 'Connect backend to ingest real security events and see live compliance-impact correlation.'}
                </p>
              </div>
            )}

            {/* Pattern Alerts */}
            {patternAlerts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-4">Pattern Alerts</h4>
                <div className="space-y-2">
                  {patternAlerts.filter(a => !a.acknowledged).map((alert) => (
                    <div key={alert.id} className={`p-3 rounded-lg border ${severityColors[alert.severity] || severityColors.info}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            <h6 className="text-sm font-semibold text-foreground">{alert.title}</h6>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{alert.description}</p>
                          {alert.pattern_trend_data && (
                            <div className="text-xs text-muted-foreground">
                              Trend: {alert.pattern_trend_data.trend_direction} 
                              {alert.pattern_trend_data.trend_percentage !== undefined && 
                                ` (${alert.pattern_trend_data.trend_percentage > 0 ? '+' : ''}${alert.pattern_trend_data.trend_percentage.toFixed(1)}%)`}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await api.acknowledgePatternAlert(alert.id, currentUser.id);
                              await loadCSCAData();
                            } catch (error) {
                              console.error('Error acknowledging pattern alert:', error);
                              alert('Error acknowledging alert');
                            }
                          }}
                          className="px-3 py-1 bg-card border border-[hsl(var(--border))] rounded text-xs text-foreground hover:bg-muted"
                        >
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI-Powered Self-Learning Playbooks */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-primary/10 to-purple-500/10 border-2 border-emerald-500/30 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-emerald-500" />
                <h3 className="text-xl font-semibold text-foreground">AI-Powered Self-Learning Playbooks</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically generated remediation playbooks that learn from your security event responses and compliance actions
              </p>
            </div>
            {backendConnected ? (
              <button
                onClick={runLearningAnalysis}
                disabled={learningAnalysisRunning}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {learningAnalysisRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run Learning Analysis
                  </>
                )}
              </button>
            ) : (
              <div className="px-4 py-2 bg-muted/50 border border-[hsl(var(--border))] rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Demo Mode
              </div>
            )}
          </div>

          {/* Playbook Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Active Playbooks</span>
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-emerald-500 mb-1">
                {autoPlaybooks.filter(p => p.status === 'active').length}
              </div>
              <div className="text-xs text-muted-foreground">
                {autoPlaybooks.length} total generated
              </div>
            </div>

            <div className="bg-card border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Time Saved</span>
                <TrendingDown className="w-4 h-4 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-1">
                {autoPlaybooks.reduce((sum, p) => sum + ((p.estimated_time_minutes || 0) * (p.usage_count || 0)), 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                minutes saved this month
              </div>
            </div>

            <div className="bg-card border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Success Rate</span>
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-purple-500 mb-1">
                {autoPlaybooks.length > 0 
                  ? Math.round(autoPlaybooks.reduce((sum, p) => sum + ((p.success_metrics?.success_rate || 0) * 100), 0) / autoPlaybooks.length)
                  : 0}%
              </div>
              <div className="text-xs text-muted-foreground">
                average across all playbooks
              </div>
            </div>

            <div className="bg-card border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Patterns Learned</span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-blue-500 mb-1">
                {learnedPatterns.length}
              </div>
              <div className="text-xs text-muted-foreground">
                from security events
              </div>
            </div>
          </div>

          {/* Auto-Generated Playbooks */}
          {autoPlaybooks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Available Playbooks for Security Events</h4>
              <div className="space-y-3">
                {autoPlaybooks
                  .filter(p => p.status === 'active')
                  .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
                  .slice(0, 5)
                  .map((playbook) => (
                    <div
                      key={playbook.id}
                      className="bg-card border border-[hsl(var(--border))] rounded-lg p-4 hover:border-emerald-500/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedPlaybook(playbook)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-foreground">{playbook.playbook_name}</h5>
                            <span className={`px-2 py-1 rounded text-xs ${
                              playbook.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                              playbook.approval_status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>
                              {playbook.status === 'active' ? 'Active' : playbook.approval_status}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              playbook.automation_level === 'fully_automated' ? 'bg-blue-500/10 text-blue-500' :
                              playbook.automation_level === 'semi_automated' ? 'bg-purple-500/10 text-purple-500' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>
                              {playbook.automation_level?.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{playbook.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Success: {(playbook.success_metrics?.success_rate * 100 || 0).toFixed(0)}%</span>
                            <span>Used: {playbook.usage_count || 0} times</span>
                            <span>Est. Time: {playbook.estimated_time_minutes || 0} min</span>
                            <span className="text-emerald-500 font-medium">
                              Saves ~{playbook.estimated_time_minutes || 0} min per use
                            </span>
                          </div>
                        </div>
                        {playbook.approval_status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              approvePlaybook(playbook.id);
                            }}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Learning Activity Feed */}
          <div className="bg-card/50 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Recent Learning Activity</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Pattern discovered: Access Control remediation (92% success rate)</span>
                <span className="text-[10px] text-muted-foreground ml-auto">2 hours ago</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Playbook generated: Endpoint Security - Critical (88% success)</span>
                <span className="text-[10px] text-muted-foreground ml-auto">5 hours ago</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Pattern confidence increased: Access Control (85% → 92%)</span>
                <span className="text-[10px] text-muted-foreground ml-auto">1 day ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Mode Notice */}
        {!backendConnected && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Demo Mode</p>
                <p className="text-xs text-muted-foreground">Connect backend to ingest real security events and see live compliance-impact correlation.</p>
              </div>
            </div>
          </div>
        )}
      </div>
      );
    } catch (error) {
      console.error('Error rendering CSCA:', error);
      return (
        <div className="space-y-6">
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-foreground">Security-Compliance Alignment</h2>
            <p className="text-red-500 mt-4">Error rendering page: {error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
  };

  const renderPermissionGrantModal = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Grant Permission</h3>
            <button
              onClick={() => setShowPermissionGrant(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">User ID</label>
              <input
                type="number"
                value={permissionFormData.user_id || ''}
                onChange={(e) => setPermissionFormData({...permissionFormData, user_id: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground"
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Resource Type</label>
              <select
                value={permissionFormData.resource_type}
                onChange={(e) => setPermissionFormData({...permissionFormData, resource_type: e.target.value})}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground"
              >
                <option value="control">Control</option>
                <option value="audit">Audit</option>
                <option value="report">Report</option>
                <option value="evidence">Evidence</option>
                <option value="all">All Resources</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Resource ID (optional)</label>
              <input
                type="text"
                value={permissionFormData.resource_id}
                onChange={(e) => setPermissionFormData({...permissionFormData, resource_id: e.target.value})}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground"
                placeholder="Leave empty for all resources"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Permission Type</label>
              <select
                value={permissionFormData.permission_type}
                onChange={(e) => setPermissionFormData({...permissionFormData, permission_type: e.target.value})}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground"
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="execute">Execute</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={permissionFormData.expires_at}
                onChange={(e) => setPermissionFormData({...permissionFormData, expires_at: e.target.value})}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={async () => {
                  if (!permissionFormData.user_id) {
                    alert('Please enter a user ID');
                    return;
                  }
                  try {
                    // Ensure user_id is a number
                    const userId = parseInt(permissionFormData.user_id);
                    if (isNaN(userId)) {
                      alert('Please enter a valid user ID (number)');
                      return;
                    }
                    
                    const permissionPayload = {
                      user_id: userId, // Ensure it's a number
                      resource_type: permissionFormData.resource_type,
                      permission_type: permissionFormData.permission_type
                    };
                    
                    // Only include optional fields if they have values
                    if (permissionFormData.resource_id && permissionFormData.resource_id.trim() !== '') {
                      permissionPayload.resource_id = permissionFormData.resource_id;
                    }
                    
                    if (permissionFormData.expires_at && permissionFormData.expires_at.trim() !== '') {
                      permissionPayload.expires_at = permissionFormData.expires_at;
                    }
                    
                    console.log('Sending permission payload:', permissionPayload);
                    await api.grantPermission(currentUser.id, permissionPayload);
                    await loadIAMData();
                    setShowPermissionGrant(false);
                    setPermissionFormData({
                      user_id: null,
                      resource_type: 'control',
                      resource_id: '',
                      permission_type: 'read',
                      expires_at: '',
                      metadata: {}
                    });
                  } catch (error) {
                    console.error('Permission grant error:', error);
                    const errorMsg = error.detail || error.message || (error instanceof Error ? error.message : String(error));
                    alert('Error granting permission: ' + errorMsg);
                  }
                }}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Grant Permission
              </button>
              <button
                onClick={() => setShowPermissionGrant(false)}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderVendorProfileModal = () => {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Create Vendor Access Profile</h3>
            <button
              onClick={() => setShowVendorProfile(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Vendor Name</label>
              <input
                type="text"
                value={vendorProfileFormData.vendor_name}
                onChange={(e) => setVendorProfileFormData({...vendorProfileFormData, vendor_name: e.target.value})}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground"
                placeholder="e.g., SOC Provider, MDR Vendor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Profile Name</label>
              <input
                type="text"
                value={vendorProfileFormData.profile_name}
                onChange={(e) => setVendorProfileFormData({...vendorProfileFormData, profile_name: e.target.value})}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground"
                placeholder="e.g., SOC Team Read-Only"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Access Expires At (optional)</label>
              <input
                type="datetime-local"
                value={vendorProfileFormData.access_expires_at}
                onChange={(e) => setVendorProfileFormData({...vendorProfileFormData, access_expires_at: e.target.value})}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={vendorProfileFormData.auto_renew}
                onChange={(e) => setVendorProfileFormData({...vendorProfileFormData, auto_renew: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm text-foreground">Auto-renew access</label>
            </div>
            <div className="pt-4 border-t border-[hsl(var(--border))]">
              <p className="text-sm text-muted-foreground mb-2">Note: Scope and permissions configuration will be added in a future update.</p>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={async () => {
                  if (!vendorProfileFormData.vendor_name || !vendorProfileFormData.profile_name) {
                    alert('Please fill in vendor name and profile name');
                    return;
                  }
                  try {
                    await api.createVendorAccessProfile(currentUser.id, vendorProfileFormData);
                    await loadIAMData();
                    setShowVendorProfile(false);
                    setVendorProfileFormData({
                      vendor_name: '',
                      profile_name: '',
                      scope: { controls: [], frameworks: [], audits: [] },
                      permissions: { controls: ['read'], audits: ['read'], evidence: ['read'] },
                      access_expires_at: '',
                      auto_renew: false
                    });
                    alert('Vendor access profile created successfully');
                  } catch (error) {
                    console.error('Vendor profile error:', error);
                    const errorMsg = error.detail || error.message || (error instanceof Error ? error.message : String(error));
                    alert('Error creating vendor profile: ' + errorMsg);
                  }
                }}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Create Profile
              </button>
              <button
                onClick={() => setShowVendorProfile(false)}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // AUDIT MANAGEMENT RENDER FUNCTIONS
  // ============================================================================
  
  const renderAudits = () => {
    if (selectedAudit) {
      return renderAuditDetail();
    }

    // Show connection status
    const showConnectionWarning = !backendConnected && activeView === 'audits';
    
    return (
      <div className="space-y-6">
        {showConnectionWarning && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Demo Mode</p>
                <p className="text-xs text-muted-foreground">Backend not connected. Data will not persist. Connect backend to save audits.</p>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Audit Management</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage audit engagements, evidence, and certifications</p>
            </div>
            <button
              onClick={() => setShowAuditCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Audit
            </button>
          </div>
        </div>

        {/* Pre-Audit Readiness Engine - NEW ACCELERATION FEATURE */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg shadow-lg p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Pre-Audit Readiness Engine
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Know if you're audit-ready before you start. Get real-time readiness scores and AI-powered gap analysis.
              </p>
            </div>
            <button
              onClick={() => {
                // Calculate readiness for all frameworks
                const frameworks = Object.keys(FRAMEWORK_LIBRARY);
                const readinessScores = frameworks.map(fw => {
                  const fwControls = controls.filter(c => 
                    (c.frameworks || []).some(f => f.startsWith(fw))
                  );
                  const implemented = fwControls.filter(c => 
                    c.status === 'Implemented' || c.status === 'Compliant'
                  ).length;
                  return {
                    framework: fw,
                    score: fwControls.length > 0 ? Math.round((implemented / fwControls.length) * 100) : 0,
                    total: fwControls.length,
                    implemented
                  };
                });
                setPreAuditReadiness(readinessScores);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Calculate Readiness
            </button>
          </div>

          {/* Readiness Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {(() => {
              const frameworks = Object.keys(FRAMEWORK_LIBRARY).slice(0, 3);
              return frameworks.map(fw => {
                const fwControls = controls.filter(c => 
                  (c.frameworks || []).some(f => f.startsWith(fw))
                );
                const implemented = fwControls.filter(c => 
                  c.status === 'Implemented' || c.status === 'Compliant'
                ).length;
                const score = fwControls.length > 0 ? Math.round((implemented / fwControls.length) * 100) : 0;
                const hasEvidence = fwControls.filter(c => c.evidence_link).length;
                const evidencePercent = fwControls.length > 0 ? Math.round((hasEvidence / fwControls.length) * 100) : 0;
                
                return (
                  <div key={fw} className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground">
                        {FRAMEWORK_LIBRARY[fw]?.name || fw}
                      </span>
                      <span className={`text-lg font-bold ${
                        score >= 80 ? 'text-green-500' :
                        score >= 60 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {score}%
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Controls</span>
                          <span className="text-foreground font-medium">{implemented}/{fwControls.length}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              score >= 80 ? 'bg-green-500' :
                              score >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Evidence</span>
                          <span className="text-foreground font-medium">{evidencePercent}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${evidencePercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`font-semibold ${
                          score >= 80 ? 'text-green-500' : 'text-yellow-500'
                        }`}>
                          {score >= 80 ? '✓ Audit Ready' : '⚠ Needs Work'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Gap Analysis & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gap Analysis */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Critical Gaps
              </h4>
              <div className="space-y-2">
                {controls
                  .filter(c => c.status !== 'Implemented' && c.status !== 'Compliant')
                  .slice(0, 5)
                  .map(control => (
                    <div key={control.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs">
                      <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">{control.id}</div>
                        <div className="text-muted-foreground truncate">{control.control_name}</div>
                      </div>
                    </div>
                  ))}
                {controls.filter(c => c.status !== 'Implemented' && c.status !== 'Compliant').length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    No critical gaps found!
                  </div>
                )}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Recommendations
              </h4>
              <div className="space-y-2 text-xs">
                {(() => {
                  const gaps = controls.filter(c => c.status !== 'Implemented' && c.status !== 'Compliant').length;
                  const missingEvidence = controls.filter(c => !c.evidence_link).length;
                  const recommendations = [];
                  
                  if (gaps > 0) {
                    recommendations.push({
                      icon: Target,
                      text: `Focus on ${gaps} controls that need implementation`,
                      priority: 'high'
                    });
                  }
                  if (missingEvidence > 0) {
                    recommendations.push({
                      icon: FileText,
                      text: `Collect evidence for ${missingEvidence} controls`,
                      priority: 'medium'
                    });
                  }
                  if (gaps === 0 && missingEvidence === 0) {
                    recommendations.push({
                      icon: CheckCircle,
                      text: 'You\'re audit-ready! Consider scheduling your audit.',
                      priority: 'success'
                    });
                  }
                  
                  return recommendations.map((rec, idx) => {
                    const Icon = rec.icon;
                    return (
                      <div key={idx} className={`flex items-start gap-2 p-2 rounded ${
                        rec.priority === 'high' ? 'bg-red-500/10' :
                        rec.priority === 'success' ? 'bg-green-500/10' :
                        'bg-yellow-500/10'
                      }`}>
                        <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                          rec.priority === 'high' ? 'text-red-500' :
                          rec.priority === 'success' ? 'text-green-500' :
                          'text-yellow-500'
                        }`} />
                        <span className="text-foreground">{rec.text}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowAuditCreate(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Start New Audit
              </button>
              <button
                onClick={() => {
                  // Navigate to controls filtered by gaps
                  setActiveView('controls');
                  setControlStatusFilter('Not Set');
                }}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium"
              >
                View Gaps
              </button>
              <button
                onClick={() => {
                  // Navigate to evidence upload
                  setActiveView('audits');
                  setShowEvidenceUpload(true);
                }}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium"
              >
                Upload Evidence
              </button>
            </div>
          </div>
        </div>

        {/* Audit Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="text-sm font-medium text-muted-foreground">Total Audits</div>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-foreground">{audits.length}</div>
              <p className="text-xs text-muted-foreground">Active engagements</p>
            </div>
          </div>

          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="text-sm font-medium text-muted-foreground">In Progress</div>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-foreground">
                {audits.filter(a => a.status === 'in_progress').length}
              </div>
              <p className="text-xs text-muted-foreground">Ongoing audits</p>
            </div>
          </div>

          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="text-sm font-medium text-muted-foreground">Certifications</div>
              <Award className="h-4 w-4 text-green-500" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-foreground">{certifications.length}</div>
              <p className="text-xs text-muted-foreground">Active certifications</p>
            </div>
          </div>

          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="text-sm font-medium text-muted-foreground">Avg Readiness</div>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-foreground">
                {audits.length > 0
                  ? Math.round(audits.reduce((sum, a) => sum + (a.readiness_score || 0), 0) / audits.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Readiness score</p>
            </div>
          </div>
        </div>

        {/* Audits List */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
          <div className="p-6 border-b border-[hsl(var(--border))]">
            <h3 className="text-lg font-semibold text-foreground">Audit Engagements</h3>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {audits.length === 0 ? (
              <div className="p-12 text-center">
                <FileCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2 text-foreground">No audits yet</h3>
                <p className="text-muted-foreground mb-6">Create your first audit engagement to get started</p>
                <button
                  onClick={() => setShowAuditCreate(true)}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                >
                  Create Audit
                </button>
              </div>
            ) : (
              audits.map((audit) => (
                <div
                  key={audit.id}
                  onClick={() => loadAuditDetails(audit.id)}
                  className="p-6 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-foreground">{audit.audit_name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          audit.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                          audit.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                          audit.status === 'planned' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {audit.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Shield className="w-4 h-4" />
                          {FRAMEWORK_LIBRARY[audit.framework]?.name || audit.framework}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileCheck className="w-4 h-4" />
                          {audit.audit_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(audit.start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="relative w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`absolute h-full ${
                                audit.readiness_score >= 80 ? 'bg-green-500' :
                                audit.readiness_score >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${audit.readiness_score || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">{audit.readiness_score || 0}%</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {audit.finding_count || 0} findings • {audit.evidence_count || 0} evidence
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Certifications Section */}
        {certifications.length > 0 && (
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
            <div className="p-6 border-b border-[hsl(var(--border))]">
              <h3 className="text-lg font-semibold text-foreground">Certifications</h3>
            </div>
            <div className="divide-y divide-[hsl(var(--border))]">
              {certifications.map((cert) => {
                const daysUntilExpiry = Math.ceil((new Date(cert.expiration_date) - new Date()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = daysUntilExpiry <= cert.renewal_reminder_days;
                
                return (
                  <div key={cert.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-foreground">{cert.certification_name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cert.status === 'active' ? 'bg-green-500/10 text-green-500' :
                            cert.status === 'pending_renewal' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {cert.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {cert.certification_body && (
                            <span>Issued by: {cert.certification_body}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Expires: {new Date(cert.expiration_date).toLocaleDateString()}
                          </span>
                          {isExpiringSoon && (
                            <span className="text-yellow-500 font-medium">
                              {daysUntilExpiry} days until expiry
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create Audit Modal */}
        {showAuditCreate && renderAuditCreateModal()}
      </div>
    );
  };
  const renderAuditDetail = () => {
    if (!selectedAudit) return null;

    // Check if user is auditor (role-based or toggle)
    const isAuditor = auditorMode || (currentUser.role && currentUser.role.toLowerCase().includes('auditor'));

    return (
      <div className="space-y-6">
        {/* Header with Back Button & Auditor Mode Toggle */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedAudit(null);
                  setActiveView('audits');
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">{selectedAudit.audit_name}</h2>
                  {isAuditor && (
                    <span className="px-2 py-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded text-xs font-semibold">
                      Auditor View
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {FRAMEWORK_LIBRARY[selectedAudit.framework]?.name || selectedAudit.framework} • {selectedAudit.audit_type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Auditor Mode Toggle */}
              <button
                onClick={() => setAuditorMode(!auditorMode)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  auditorMode 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                {auditorMode ? 'Auditor Mode' : 'Switch to Auditor'}
              </button>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedAudit.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                selectedAudit.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                {selectedAudit.status}
              </span>
            </div>
          </div>
        </div>

        {/* Auditor Portal - Enhanced Workspace */}
        {isAuditor && (
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-500/20 rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-500" />
                  Auditor Workspace
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Review evidence, document findings, and collaborate with the company in real-time
                </p>
              </div>
            </div>

            {/* Auditor Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Evidence Reviewed</div>
                <div className="text-2xl font-bold text-foreground">
                  {auditEvidence.filter(e => e.validated).length}/{auditEvidence.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {auditEvidence.length > 0 
                    ? Math.round((auditEvidence.filter(e => e.validated).length / auditEvidence.length) * 100)
                    : 0}% complete
                </div>
              </div>
              <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Findings</div>
                <div className="text-2xl font-bold text-foreground">{auditFindings.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {auditFindings.filter(f => f.status === 'open').length} open
                </div>
              </div>
              <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Controls Reviewed</div>
                <div className="text-2xl font-bold text-foreground">
                  {controls.filter(c => 
                    (c.frameworks || []).some(f => f.startsWith(selectedAudit.framework))
                  ).length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">In scope</div>
              </div>
              <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Readiness</div>
                <div className="text-2xl font-bold text-foreground">{selectedAudit.readiness_score || 0}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedAudit.readiness_score >= 80 ? 'Ready' : 'Needs work'}
                </div>
              </div>
            </div>

            {/* Quick Actions for Auditors */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowFindingCreate(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <AlertCircle className="w-4 h-4" />
                Document Finding
              </button>
              <button
                onClick={() => {
                  // Show evidence review interface
                  setSelectedEvidenceForReview(auditEvidence[0] || null);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FileCheck className="w-4 h-4" />
                Review Evidence ({auditEvidence.filter(e => !e.validated).length} pending)
              </button>
              <button
                onClick={() => {
                  // Generate audit report
                  alert('Audit report generation coming soon!');
                }}
                className="px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Generate Report
              </button>
            </div>
          </div>
        )}

        {/* Readiness Score */}
        {auditReadiness && (
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Audit Readiness Score</h3>
              {backendConnected && (
                <button
                  onClick={() => loadAuditDetails(selectedAudit.id)}
                  className="text-sm text-primary hover:underline"
                >
                  Refresh
                </button>
              )}
            </div>
            <div className="flex items-center gap-8">
              <div className="relative w-48 h-48">
                <svg className="transform -rotate-90" width="192" height="192">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="hsl(var(--muted))"
                    strokeWidth="16"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke={
                      auditReadiness.readiness_score >= 80 ? 'hsl(142, 76%, 36%)' :
                      auditReadiness.readiness_score >= 60 ? 'hsl(45, 93%, 47%)' :
                      'hsl(0, 84%, 60%)'
                    }
                    strokeWidth="16"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - (auditReadiness.readiness_score || 0) / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-4xl font-bold ${
                    (auditReadiness.readiness_score || 0) >= 80 ? 'text-green-500' :
                    (auditReadiness.readiness_score || 0) >= 60 ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    {auditReadiness.readiness_score || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Ready</div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-foreground">Evidence Coverage</span>
                  <span className="text-sm font-semibold text-foreground">
                    {auditReadiness.breakdown?.controls_with_evidence || 0}/{auditReadiness.breakdown?.total_controls || 0} controls
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-foreground">Total Findings</span>
                  <span className="text-sm font-semibold text-foreground">
                    {auditReadiness.breakdown?.total_findings || 0} ({auditReadiness.breakdown?.resolved_findings || 0} resolved)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-foreground">Validated Evidence</span>
                  <span className="text-sm font-semibold text-foreground">
                    {auditReadiness.breakdown?.validated_evidence || 0}/{auditReadiness.breakdown?.total_evidence || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Evidence Review Interface - Auditor Feature */}
        {isAuditor && auditEvidence.length > 0 && (
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
            <div className="p-6 border-b border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-purple-500" />
                    Evidence Review
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review and validate evidence. {auditEvidence.filter(e => !e.validated).length} items pending review
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {auditEvidence.filter(e => e.validated).length}/{auditEvidence.length} validated
                  </span>
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${auditEvidence.length > 0 
                          ? (auditEvidence.filter(e => e.validated).length / auditEvidence.length) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="divide-y divide-[hsl(var(--border))] max-h-96 overflow-y-auto">
              {auditEvidence.map((evidence) => (
                <div
                  key={evidence.id}
                  className={`p-4 hover:bg-muted/30 transition-colors ${
                    selectedEvidenceForReview?.id === evidence.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-foreground">{evidence.evidence_name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          evidence.validated 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {evidence.validated ? '✓ Validated' : 'Pending Review'}
                        </span>
                        <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                          {evidence.evidence_type}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Control: <span className="text-foreground font-medium">{evidence.control_id}</span></div>
                        {evidence.uploaded_by && (
                          <div>Uploaded by: <span className="text-foreground">{evidence.uploaded_by}</span></div>
                        )}
                        {evidence.uploaded_at && (
                          <div>Uploaded: <span className="text-foreground">
                            {new Date(evidence.uploaded_at).toLocaleDateString()}
                          </span></div>
                        )}
                        {evidence.expiration_date && (
                          <div className="flex items-center gap-1">
                            Expires: <span className={`font-medium ${
                              new Date(evidence.expiration_date) < new Date() 
                                ? 'text-red-500' 
                                : 'text-foreground'
                            }`}>
                              {new Date(evidence.expiration_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {evidence.file_url && (
                        <div className="mt-3">
                          <a
                            href={evidence.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Evidence
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {!evidence.validated && (
                        <button
                          onClick={async () => {
                            if (backendConnected && currentUser.id) {
                              try {
                                await api.validateEvidence(selectedAudit.id, evidence.id, currentUser.id, true);
                                await loadAuditDetails(selectedAudit.id);
                                alert('Evidence validated successfully');
                              } catch (error) {
                                console.error('Validation error:', error);
                                alert('Error validating evidence');
                              }
                            } else {
                              // Demo mode - just update local state
                              setAuditEvidence(prev => 
                                prev.map(e => 
                                  e.id === evidence.id 
                                    ? { ...e, validated: true, validated_by: currentUser.email, validated_at: new Date().toISOString() }
                                    : e
                                )
                              );
                            }
                          }}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Validate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedEvidenceForReview(evidence)}
                        className="px-3 py-1.5 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted transition-colors text-xs font-medium"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Findings */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
          <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Audit Findings</h3>
            <button
              onClick={() => setShowFindingCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              {isAuditor ? 'Document Finding' : 'Add Finding'}
            </button>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {auditFindings.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2 text-foreground">No findings</h3>
                <p className="text-muted-foreground">Great! No audit findings to report.</p>
              </div>
            ) : (
              auditFindings.map((finding) => (
                <div key={finding.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          finding.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                          finding.severity === 'high' ? 'bg-orange-500/10 text-orange-500' :
                          finding.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {finding.severity}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                          {finding.finding_type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          finding.status === 'closed' ? 'bg-green-500/10 text-green-500' :
                          finding.status === 'resolved' ? 'bg-blue-500/10 text-blue-500' :
                          finding.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {finding.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-2">{finding.description}</p>
                      {finding.remediation_plan && (
                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
                          <div className="font-semibold text-blue-500 mb-1">Remediation Plan:</div>
                          <div className="text-foreground">{finding.remediation_plan}</div>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                        <span>Control: {finding.control_id}</span>
                        {finding.assigned_to && <span>Assigned to: {finding.assigned_to}</span>}
                        {finding.due_date && <span>Due: {new Date(finding.due_date).toLocaleDateString()}</span>}
                      </div>
                      {/* Collaborative Comments */}
                      {(() => {
                        const findingComments = auditComments.filter(c => c.finding_id === finding.id);
                        return findingComments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">Comments ({findingComments.length})</div>
                            <div className="space-y-2">
                              {findingComments.slice(0, 3).map((comment, idx) => (
                                <div key={idx} className="text-xs bg-muted/30 p-2 rounded">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-foreground">{comment.author || 'Unknown'}</span>
                                    <span className="text-muted-foreground">
                                      {new Date(comment.timestamp).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="text-foreground">{comment.text}</div>
                                </div>
                              ))}
                              {findingComments.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{findingComments.length - 3} more comments
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {isAuditor && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            const comment = prompt('Add a comment or note:');
                            if (comment) {
                              const newComment = {
                                id: Date.now(),
                                finding_id: finding.id,
                                author: currentUser.email,
                                text: comment,
                                timestamp: new Date().toISOString()
                              };
                              setAuditComments([...auditComments, newComment]);
                            }
                          }}
                          className="px-3 py-1.5 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted transition-colors text-xs font-medium"
                        >
                          Add Comment
                        </button>
                        {finding.status === 'open' && (
                          <button
                            onClick={async () => {
                              if (backendConnected && currentUser.id) {
                                try {
                                  await api.updateFinding(selectedAudit.id, finding.id, { status: 'in_progress' }, currentUser.id);
                                  await loadAuditDetails(selectedAudit.id);
                                } catch (error) {
                                  console.error('Error updating finding:', error);
                                }
                              } else {
                                // Demo mode
                                setAuditFindings(prev =>
                                  prev.map(f =>
                                    f.id === finding.id ? { ...f, status: 'in_progress' } : f
                                  )
                                );
                              }
                            }}
                            className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-xs font-medium"
                          >
                            Mark In Progress
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Collaborative Comments Section */}
        {isAuditor && (
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Collaboration & Notes
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Add a note or comment..."
                  className="flex-1 px-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const newComment = {
                        id: Date.now(),
                        audit_id: selectedAudit.id,
                        author: currentUser.email,
                        text: e.target.value,
                        timestamp: new Date().toISOString()
                      };
                      setAuditComments([...auditComments, newComment]);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.target.previousSibling;
                    if (input.value.trim()) {
                      const newComment = {
                        id: Date.now(),
                        audit_id: selectedAudit.id,
                        author: currentUser.email,
                        text: input.value,
                        timestamp: new Date().toISOString()
                      };
                      setAuditComments([...auditComments, newComment]);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Post
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {auditComments
                  .filter(c => c.audit_id === selectedAudit.id)
                  .slice()
                  .reverse()
                  .map((comment, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {(comment.author || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{comment.author || 'Unknown'}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-foreground">{comment.text}</div>
                      </div>
                    </div>
                  ))}
                {auditComments.filter(c => c.audit_id === selectedAudit.id).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No comments yet. Start the conversation!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Evidence */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
          <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Evidence ({auditEvidence.length})</h3>
            <button
              onClick={() => setShowEvidenceUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm"
            >
              <Upload className="w-4 h-4" />
              Upload Evidence
            </button>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {auditEvidence.length === 0 ? (
              <div className="p-12 text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2 text-foreground">No evidence uploaded</h3>
                <p className="text-muted-foreground mb-6">Upload evidence to support your audit</p>
              </div>
            ) : (
              auditEvidence.map((evidence) => (
                <div key={evidence.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileCheck className={`w-5 h-5 mt-1 ${
                        evidence.validated ? 'text-green-500' : 'text-muted-foreground'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-foreground">{evidence.evidence_name}</h4>
                          {evidence.validated && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Type: {evidence.evidence_type}</span>
                          <span>Control: {evidence.control_id}</span>
                          <span>Uploaded: {new Date(evidence.uploaded_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Automated Report Generation - NEW ACCELERATION FEATURE */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Audit Report Generation
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Generate comprehensive audit reports in seconds. Export evidence packages and executive summaries.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => {
                // Generate full audit report
                const reportData = {
                  audit: selectedAudit,
                  findings: auditFindings,
                  evidence: auditEvidence,
                  readiness: auditReadiness,
                  generated_at: new Date().toISOString(),
                  generated_by: currentUser.email
                };
                const reportJson = JSON.stringify(reportData, null, 2);
                const blob = new Blob([reportJson], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit-report-${selectedAudit.audit_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                alert('Audit report generated! Full report export coming soon.');
              }}
              className="p-4 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-left"
            >
              <FileText className="w-6 h-6 text-primary mb-2" />
              <div className="font-semibold text-foreground mb-1">Full Audit Report</div>
              <div className="text-xs text-muted-foreground">Complete audit documentation with all findings and evidence</div>
            </button>
            <button
              onClick={() => {
                // Generate evidence package
                const evidencePackage = {
                  audit_name: selectedAudit.audit_name,
                  framework: selectedAudit.framework,
                  evidence: auditEvidence.map(e => ({
                    control_id: e.control_id,
                    evidence_name: e.evidence_name,
                    evidence_type: e.evidence_type,
                    validated: e.validated,
                    uploaded_at: e.uploaded_at
                  })),
                  generated_at: new Date().toISOString()
                };
                const csv = [
                  ['Control ID', 'Evidence Name', 'Type', 'Validated', 'Uploaded'],
                  ...evidencePackage.evidence.map(e => [
                    e.control_id,
                    e.evidence_name,
                    e.evidence_type,
                    e.validated ? 'Yes' : 'No',
                    new Date(e.uploaded_at).toLocaleDateString()
                  ])
                ].map(row => row.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `evidence-package-${selectedAudit.audit_name.replace(/\s+/g, '-')}.csv`;
                a.click();
                alert('Evidence package exported!');
              }}
              className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-left"
            >
              <Download className="w-6 h-6 text-green-500 mb-2" />
              <div className="font-semibold text-foreground mb-1">Evidence Package</div>
              <div className="text-xs text-muted-foreground">CSV export of all evidence for audit submission</div>
            </button>
            <button
              onClick={() => {
                // Generate executive summary
                const summary = {
                  audit_name: selectedAudit.audit_name,
                  framework: FRAMEWORK_LIBRARY[selectedAudit.framework]?.name || selectedAudit.framework,
                  status: selectedAudit.status,
                  readiness_score: selectedAudit.readiness_score || 0,
                  total_findings: auditFindings.length,
                  critical_findings: auditFindings.filter(f => f.severity === 'critical').length,
                  high_findings: auditFindings.filter(f => f.severity === 'high').length,
                  evidence_count: auditEvidence.length,
                  validated_evidence: auditEvidence.filter(e => e.validated).length,
                  summary: `Audit readiness: ${selectedAudit.readiness_score || 0}%. ${auditFindings.length} findings identified, ${auditEvidence.length} evidence items collected.`,
                  generated_at: new Date().toISOString()
                };
                const summaryText = `
AUDIT EXECUTIVE SUMMARY
======================

Audit: ${summary.audit_name}
Framework: ${summary.framework}
Status: ${summary.status}
Readiness Score: ${summary.readiness_score}%

Findings:
- Total: ${summary.total_findings}
- Critical: ${summary.critical_findings}
- High: ${summary.high_findings}

Evidence:
- Total: ${summary.evidence_count}
- Validated: ${summary.validated_evidence}

Summary:
${summary.summary}

Generated: ${new Date(summary.generated_at).toLocaleString()}
                `.trim();
                const blob = new Blob([summaryText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `executive-summary-${selectedAudit.audit_name.replace(/\s+/g, '-')}.txt`;
                a.click();
                alert('Executive summary generated!');
              }}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
            >
              <BarChart3 className="w-6 h-6 text-purple-500 mb-2" />
              <div className="font-semibold text-foreground mb-1">Executive Summary</div>
              <div className="text-xs text-muted-foreground">High-level summary for leadership and stakeholders</div>
            </button>
          </div>
        </div>

        {/* Modals */}
        {showFindingCreate && renderFindingCreateModal()}
        {showEvidenceUpload && renderEvidenceUploadModal()}
      </div>
    );
  };

  const handleUploadEvidence = async (evidenceData) => {
    if (!selectedAudit) return;
    
    // Demo mode
    if (!backendConnected || !currentUser.id) {
      const newEvidence = {
        id: Date.now(),
        audit_engagement_id: selectedAudit.id,
        control_id: evidenceData.control_id,
        evidence_type: evidenceData.evidence_type,
        evidence_name: evidenceData.evidence_name,
        file_url: evidenceData.file_url,
        file_size_bytes: evidenceData.file_size_bytes,
        expiration_date: evidenceData.expiration_date,
        notes: evidenceData.notes,
        validated: false,
        uploaded_by: currentUser.email,
        uploaded_at: new Date().toISOString()
      };
      setAuditEvidence([...auditEvidence, newEvidence]);
      setShowEvidenceUpload(false);
      alert('Evidence uploaded (demo mode)');
      return;
    }
    
    try {
      await api.createEvidence(currentUser.id, selectedAudit.id, evidenceData);
      await loadAuditDetails(selectedAudit.id);
      setShowEvidenceUpload(false);
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('Failed to upload evidence: ' + error.message);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!evidenceFormData.control_id || !evidenceFormData.evidence_name) {
      alert('Please fill in required fields');
      return;
    }

    await handleUploadEvidence(evidenceFormData);
    setEvidenceFormData({
      control_id: '',
      evidence_type: 'document',
      evidence_name: '',
      file_url: '',
      notes: '',
      expiration_date: ''
    });
  };

  const renderEvidenceUploadModal = () => {

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Upload Audit Evidence</h3>
            <button
              onClick={() => setShowEvidenceUpload(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Control ID *</label>
              <input
                type="text"
                value={evidenceFormData.control_id}
                onChange={(e) => setEvidenceFormData({ ...evidenceFormData, control_id: e.target.value })}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                placeholder="e.g., AC-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Evidence Type *</label>
                <select
                  value={evidenceFormData.evidence_type}
                  onChange={(e) => setEvidenceFormData({ ...evidenceFormData, evidence_type: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                >
                  <option value="document">Document</option>
                  <option value="screenshot">Screenshot</option>
                  <option value="api_data">API Data</option>
                  <option value="log_export">Log Export</option>
                  <option value="policy">Policy</option>
                  <option value="procedure">Procedure</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Expiration Date</label>
                <input
                  type="date"
                  value={evidenceFormData.expiration_date}
                  onChange={(e) => setEvidenceFormData({ ...evidenceFormData, expiration_date: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Evidence Name *</label>
              <input
                type="text"
                value={evidenceFormData.evidence_name}
                onChange={(e) => setEvidenceFormData({ ...evidenceFormData, evidence_name: e.target.value })}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                placeholder="e.g., Access Control Policy v2.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">File URL / Link</label>
              <input
                type="text"
                value={evidenceFormData.file_url}
                onChange={(e) => setEvidenceFormData({ ...evidenceFormData, file_url: e.target.value })}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                placeholder="https://... or /path/to/file"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
              <textarea
                value={evidenceFormData.notes}
                onChange={(e) => setEvidenceFormData({ ...evidenceFormData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                placeholder="Additional notes about this evidence..."
              />
            </div>
          </div>
          <div className="p-6 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3">
            <button
              onClick={() => setShowEvidenceUpload(false)}
              className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitEvidence}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              Upload Evidence
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleCreateAudit = async () => {
    if (!auditFormData.audit_name || !auditFormData.start_date) {
      alert('Please fill in required fields');
      return;
    }

    // Demo mode - create local audit if backend not connected
    if (!backendConnected || !currentUser.id) {
      const newAudit = {
        id: Date.now(), // Temporary ID
        audit_name: auditFormData.audit_name,
        framework: auditFormData.framework,
        audit_type: auditFormData.audit_type,
        auditor_name: auditFormData.auditor_name,
        auditor_contact: auditFormData.auditor_contact,
        start_date: auditFormData.start_date,
        end_date: auditFormData.end_date,
        status: 'planned',
        readiness_score: 0,
        scope: auditFormData.scope || [],
        finding_count: 0,
        evidence_count: 0,
        created_at: new Date().toISOString()
      };
      setAudits([...audits, newAudit]);
      setShowAuditCreate(false);
      setAuditFormData({
        audit_name: '',
        framework: 'SOC2',
        audit_type: 'Type II',
        auditor_name: '',
        auditor_contact: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        scope: []
      });
      alert('Audit created (demo mode - not saved to backend)');
      return;
    }

    try {
      await api.createAudit(currentUser.id, auditFormData);
      await loadAudits();
      setShowAuditCreate(false);
      setAuditFormData({
        audit_name: '',
        framework: 'SOC2',
        audit_type: 'Type II',
        auditor_name: '',
        auditor_contact: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        scope: []
      });
    } catch (error) {
      console.error('Error creating audit:', error);
      alert('Failed to create audit: ' + error.message);
    }
  };
  const renderAuditCreateModal = () => {

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Create New Audit Engagement</h3>
            <button
              onClick={() => setShowAuditCreate(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Audit Name *</label>
              <input
                type="text"
                value={auditFormData.audit_name}
                onChange={(e) => setAuditFormData({ ...auditFormData, audit_name: e.target.value })}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                placeholder="e.g., SOC2 Type II 2024"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Framework *</label>
                <select
                value={auditFormData.framework}
                onChange={(e) => setAuditFormData({ ...auditFormData, framework: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(FRAMEWORK_LIBRARY).map(([key, value]) => (
                    <option key={key} value={key}>{value.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Audit Type *</label>
                <select
                value={auditFormData.audit_type}
                onChange={(e) => setAuditFormData({ ...auditFormData, audit_type: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                >
                  <option value="Type I">Type I</option>
                  <option value="Type II">Type II</option>
                  <option value="Surveillance">Surveillance</option>
                  <option value="Recertification">Recertification</option>
                  <option value="Initial">Initial</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Start Date *</label>
                <input
                  type="date"
                value={auditFormData.start_date}
                onChange={(e) => setAuditFormData({ ...auditFormData, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
                <input
                  type="date"
                value={auditFormData.end_date}
                onChange={(e) => setAuditFormData({ ...auditFormData, end_date: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Auditor Name</label>
                <input
                  type="text"
                value={auditFormData.auditor_name}
                onChange={(e) => setAuditFormData({ ...auditFormData, auditor_name: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Big 4 Audit Firm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Auditor Contact</label>
                <input
                  type="text"
                value={auditFormData.auditor_contact}
                onChange={(e) => setAuditFormData({ ...auditFormData, auditor_contact: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                  placeholder="auditor@firm.com"
                />
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3">
            <button
              onClick={() => setShowAuditCreate(false)}
              className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAudit}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              Create Audit
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleCreateFinding = async () => {
    if (!findingFormData.control_id || !findingFormData.description) {
      alert('Please fill in required fields');
      return;
    }

    if (!selectedAudit) {
      alert('No audit selected');
      return;
    }

    // Demo mode
    if (!backendConnected || !currentUser.id) {
      const newFinding = {
        id: Date.now(),
        audit_engagement_id: selectedAudit.id,
        control_id: findingFormData.control_id,
        finding_type: findingFormData.finding_type,
        severity: findingFormData.severity,
        description: findingFormData.description,
        remediation_plan: findingFormData.remediation_plan,
        assigned_to: findingFormData.assigned_to,
        due_date: findingFormData.due_date,
        status: 'open',
        created_at: new Date().toISOString()
      };
      setAuditFindings([...auditFindings, newFinding]);
      setShowFindingCreate(false);
      setFindingFormData({
        control_id: '',
        finding_type: 'observation',
        severity: 'medium',
        description: '',
        remediation_plan: '',
        assigned_to: '',
        due_date: ''
      });
      alert('Finding created (demo mode)');
      return;
    }

    try {
      await api.createFinding(currentUser.id, selectedAudit.id, findingFormData);
      await loadAuditDetails(selectedAudit.id);
      setShowFindingCreate(false);
      setFindingFormData({
        control_id: '',
        finding_type: 'observation',
        severity: 'medium',
        description: '',
        remediation_plan: '',
        assigned_to: '',
        due_date: ''
      });
    } catch (error) {
      console.error('Error creating finding:', error);
      alert('Failed to create finding: ' + error.message);
    }
  };
  const renderFindingCreateModal = () => {

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Create Audit Finding</h3>
            <button
              onClick={() => setShowFindingCreate(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {/* AI Assistance Banner */}
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">AI Finding Assistant</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Get AI-powered suggestions for finding descriptions and remediation plans based on control requirements
                  </p>
                  <button
                    onClick={() => {
                      if (!findingFormData.control_id) {
                        alert('Please enter a Control ID first');
                        return;
                      }
                      // Find the control
                      const control = controls.find(c => c.id === findingFormData.control_id);
                      if (control) {
                        // AI-generated suggestions based on control status and type
                        const suggestions = {
                          description: control.status === 'Not Set' || control.status === 'Not Implemented'
                            ? `Control ${findingFormData.control_id} (${control.control_name}) is not implemented. ${control.description || 'This control requires implementation to meet compliance requirements.'}`
                            : `Control ${findingFormData.control_id} (${control.control_name}) requires attention. Evidence may be missing or insufficient to demonstrate compliance.`,
                          remediation_plan: `1. Review control requirements for ${findingFormData.control_id}\n2. Implement necessary controls or processes\n3. Collect appropriate evidence\n4. Document implementation\n5. Validate evidence before audit`,
                          severity: control.status === 'Not Set' || control.status === 'Not Implemented' ? 'high' : 'medium'
                        };
                        setFindingFormData({
                          ...findingFormData,
                          description: suggestions.description,
                          remediation_plan: suggestions.remediation_plan,
                          severity: suggestions.severity
                        });
                        alert('AI suggestions applied! Review and adjust as needed.');
                      } else {
                        alert('Control not found. AI suggestions will be generic.');
                        setFindingFormData({
                          ...findingFormData,
                          description: `Control ${findingFormData.control_id} requires attention. Evidence may be missing or insufficient to demonstrate compliance with framework requirements.`,
                          remediation_plan: `1. Review control requirements\n2. Implement necessary controls\n3. Collect appropriate evidence\n4. Document implementation\n5. Validate evidence`
                        });
                      }
                    }}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium flex items-center gap-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate AI Suggestions
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Control ID *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={findingFormData.control_id}
                  onChange={(e) => setFindingFormData({ ...findingFormData, control_id: e.target.value })}
                  className="flex-1 px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                  placeholder="e.g., AC-001"
                />
                <button
                  onClick={() => {
                    // Show control selector
                    const controlId = prompt('Enter Control ID or search:', findingFormData.control_id);
                    if (controlId) {
                      setFindingFormData({ ...findingFormData, control_id: controlId });
                    }
                  }}
                  className="px-3 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted transition-colors text-xs"
                >
                  Search
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Finding Type *</label>
                <select
                  value={findingFormData.finding_type}
                  onChange={(e) => setFindingFormData({ ...findingFormData, finding_type: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                >
                  <option value="observation">Observation</option>
                  <option value="deficiency">Deficiency</option>
                  <option value="non-conformity">Non-Conformity</option>
                  <option value="major_nonconformity">Major Non-Conformity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Severity *</label>
                <select
                  value={findingFormData.severity}
                  onChange={(e) => setFindingFormData({ ...findingFormData, severity: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description *</label>
              <textarea
                value={findingFormData.description}
                onChange={(e) => setFindingFormData({ ...findingFormData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                placeholder="Describe the finding..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Remediation Plan</label>
              <textarea
                value={findingFormData.remediation_plan}
                onChange={(e) => setFindingFormData({ ...findingFormData, remediation_plan: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                placeholder="Describe the remediation plan..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Assigned To</label>
                <input
                  type="text"
                  value={findingFormData.assigned_to}
                  onChange={(e) => setFindingFormData({ ...findingFormData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                  placeholder="team@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Due Date</label>
                <input
                  type="date"
                  value={findingFormData.due_date}
                  onChange={(e) => setFindingFormData({ ...findingFormData, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3">
            <button
              onClick={() => setShowFindingCreate(false)}
              className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFinding}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              Create Finding
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    if (!projectTimeline) {
      return (
        <div className="bg-card rounded-lg shadow p-12 text-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Generate Project Timeline</h3>
          <p className="text-muted-foreground mb-6">
            Create a visual roadmap based on your automation plan and TCO
          </p>
          <button
            onClick={() => generateProjectTimeline()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Generate Timeline
          </button>
        </div>
      );
    }

    const timeline = projectTimeline;
    const maxCost = Math.max(...timeline.timelineData.map(d => d.cumulativeCost), 1);
    const maxScore = 100;

    // Filter milestones based on selected filters
    let filteredMilestones = timeline.milestones;
    
    if (selectedVendorFilter !== "ALL") {
      filteredMilestones = filteredMilestones.filter(m => 
        m.vendors && m.vendors.some(v => v.vendor === selectedVendorFilter)
      );
    }
    
    if (selectedPriorityFilter !== "ALL") {
      filteredMilestones = filteredMilestones.filter(m => {
        if (selectedPriorityFilter === "critical") return m.impact === "critical" || m.type === "phase";
        if (selectedPriorityFilter === "high") return m.impact === "high";
        return true;
      });
    }
    
    if (selectedPriceFilter !== "ALL") {
      filteredMilestones = filteredMilestones.filter(m => {
        if (!m.vendorCost) return false;
        if (selectedPriceFilter === "low") return m.vendorCost < 1000;
        if (selectedPriceFilter === "medium") return m.vendorCost >= 1000 && m.vendorCost <= 3000;
        if (selectedPriceFilter === "high") return m.vendorCost > 3000;
        return true;
      });
    }

    // Get unique vendors for filter
    const allVendors = [...new Set(
      timeline.vendorRecommendations.map(v => v.vendor)
    )].sort();

    return (
      <div className="space-y-6">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold mb-2 text-foreground">Project Timeline with Cost Analysis</h2>
          <p className="text-muted-foreground">{timeline.summary.totalDuration} days • {timeline.summary.totalMilestones} milestones</p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Filter Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Filter by Vendor</label>
              <select
                value={selectedVendorFilter}
                onChange={(e) => setSelectedVendorFilter(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Vendors</option>
                {allVendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Filter by Priority</label>
              <select
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="critical">Critical Only</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Filter by Price Range</label>
              <select
                value={selectedPriceFilter}
                onChange={(e) => setSelectedPriceFilter(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Prices</option>
                <option value="low">Under $1,000/mo</option>
                <option value="medium">$1,000 - $3,000/mo</option>
                <option value="high">Over $3,000/mo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cost Graph */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-6">Cost Over Time</h3>
          <div className="relative h-96 border-l-2 border-b-2 border-[hsl(var(--border))] p-4">
            <svg className="w-full h-full" viewBox="0 0 1000 350" preserveAspectRatio="none">
              {/* Cost line */}
              <polyline
                points={timeline.timelineData.map((d, i) => 
                  `${(i / timeline.timelineData.length) * 1000},${350 - (d.cumulativeCost / maxCost) * 350}`
                ).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
              />
              
              {/* Vendor cost line */}
              <polyline
                points={timeline.timelineData.map((d, i) => 
                  `${(i / timeline.timelineData.length) * 1000},${350 - (d.vendorCost / maxCost) * 350}`
                ).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray="5,5"
              />
              
              {/* Implementation cost line */}
              <polyline
                points={timeline.timelineData.map((d, i) => 
                  `${(i / timeline.timelineData.length) * 1000},${350 - (d.implementationCost / maxCost) * 350}`
                ).join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeDasharray="10,5"
              />

              {/* Milestones */}
              {timeline.milestones.map((milestone, idx) => {
                const daysSinceStart = Math.floor((new Date(milestone.date) - new Date(timeline.milestones[0].date)) / (1000 * 60 * 60 * 24));
                const x = (daysSinceStart / timeline.summary.totalDuration) * 1000;
                const dataPoint = timeline.timelineData.find(d => d.day >= daysSinceStart) || timeline.timelineData[timeline.timelineData.length - 1];
                const y = 350 - (dataPoint.cumulativeCost / maxCost) * 350;
                
                return (
                  <g key={idx}>
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill={
                        milestone.status === 'completed' ? '#10b981' :
                        milestone.status === 'in-progress' ? '#f59e0b' :
                        milestone.type === 'milestone' ? '#6366f1' :
                        '#ef4444'
                      }
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y - 15}
                      fontSize="10"
                      fill="#374151"
                      textAnchor="middle"
                    >
                      {milestone.name.split(':')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="absolute top-0 right-0 text-xs text-muted-foreground">${maxCost.toLocaleString()}</div>
            <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">$0</div>
            <div className="absolute bottom-0 left-0 text-xs text-muted-foreground">Day 0</div>
            <div className="absolute bottom-0" style={{ right: '0' }}>
              <span className="text-xs text-muted-foreground">Day {timeline.summary.totalDuration}</span>
            </div>
          </div>

          <div className="mt-4 flex gap-6 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-primary/100"></div>
              <span>Total Cost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500" style={{backgroundImage: 'repeating-linear-gradient(to right, #10b981 0px, #10b981 5px, transparent 5px, transparent 10px)'}}></div>
              <span>Vendor Cost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-orange-500" style={{backgroundImage: 'repeating-linear-gradient(to right, #f59e0b 0px, #f59e0b 10px, transparent 10px, transparent 15px)'}}></div>
              <span>Implementation Cost</span>
            </div>
          </div>
        </div>

        {/* Milestones with Vendor Details */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Milestones & Vendor Assignments</h3>
          <div className="space-y-4">
            {filteredMilestones.map((milestone, idx) => (
              <div key={idx} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  milestone.status === 'completed' ? 'bg-green-500/10' :
                  milestone.status === 'in-progress' ? 'bg-yellow-500/10' :
                  'bg-muted'
                }`}>
                  {milestone.type === 'start' && <CheckCircle className={`w-6 h-6 ${milestone.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`} />}
                  {milestone.type === 'phase' && <Server className={`w-6 h-6 ${milestone.status === 'in-progress' ? 'text-yellow-500' : 'text-muted-foreground'}`} />}
                  {milestone.type === 'milestone' && <Award className={`w-6 h-6 ${milestone.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`} />}
                  {milestone.type === 'remediation' && (
                    milestone.status === 'completed' ?
                      <CheckCircle className="w-6 h-6 text-green-500" /> :
                      <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold text-foreground">{milestone.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      milestone.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                      milestone.status === 'in-progress' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {milestone.status}
                    </span>
                    {milestone.cost > 0 && (
                      <span className="text-sm font-semibold text-primary">
                        ${milestone.cost.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{milestone.description}</div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>📅 {new Date(milestone.date).toLocaleDateString()}</span>
                    {milestone.controls && <span>🎯 {milestone.controls} controls</span>}
                    {milestone.hours && <span>⏱️ {milestone.hours} hours</span>}
                  </div>
                  
                  {milestone.vendors && milestone.vendors.length > 0 && (
                    <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="text-sm font-semibold text-foreground mb-2">Recommended Vendors:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {milestone.vendors.map((vendor, vIdx) => (
                          <div key={vIdx} className="bg-card p-2 rounded border border-primary/20">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{vendor.vendor}</span>
                              <span className="text-xs text-primary">${vendor.monthlyPrice}/mo</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Covers: {vendor.controlsCovered.join(', ')} • ROI: <span className={`font-semibold ${vendor.roi > 0 ? 'text-green-500' : 'text-red-500'}`}>{vendor.roi}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {milestone.vendorCost > 0 && (
                        <div className="text-xs text-primary mt-2 font-semibold">
                          Total Vendor Cost: ${milestone.vendorCost.toLocaleString()}/month
                        </div>
                      )}
                    </div>
                  )}

                  {milestone.updatedControls && milestone.updatedControls.length > 0 && (
                    <div className="mt-3 p-3 bg-muted/30 border border-dashed border-[hsl(var(--border))] rounded-lg">
                      <div className="text-sm font-semibold text-foreground mb-2">Controls Updated</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {milestone.updatedControls.map((ctrl, idx) => (
                          <div key={idx} className="bg-card border border-[hsl(var(--border))] rounded-lg p-2 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-foreground">{ctrl.control_id}</span>
                              {ctrl.status && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                  {ctrl.status}
                                </span>
                              )}
                            </div>
                            {ctrl.responsible_party && (
                              <div>Owner: <span className="text-foreground">{ctrl.responsible_party}</span></div>
                            )}
                            {ctrl.evidence_link && (
                              <div className="truncate">Evidence: <span className="text-foreground">{ctrl.evidence_link}</span></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Recommendations Summary */}
        {timeline.vendorRecommendations && timeline.vendorRecommendations.length > 0 && (
          <div className="bg-card rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">All Recommended Vendors (Sorted by Priority & Price)</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[hsl(var(--border))]">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Vendor</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Monthly Price</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Controls Covered</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">ROI</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.vendorRecommendations.map((vendor, idx) => (
                    <tr key={idx} className="border-b border-border100 hover:bg-muted">
                      <td className="py-3 px-4 font-medium">{vendor.vendor}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-muted text-foreground px-2 py-1 rounded">{vendor.category}</span>
                      </td>
                      <td className="py-3 px-4">${vendor.monthlyPrice.toLocaleString()}/mo</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {vendor.controlsCovered.map((id, cIdx) => (
                            <span key={cIdx} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded">{id}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${vendor.roi > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {vendor.roi}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          vendor.priority === 1 ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          vendor.priority === 2 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                          'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        }`}>
                          {vendor.priority === 1 ? 'High' : vendor.priority === 2 ? 'Medium' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get view display name
  const getViewName = (view) => {
    const viewNames = {
      'dashboard': 'Dashboard',
      'controls': 'Controls',
      'tco': 'TCO Calculator',
      'automation': 'Automation Plan',
      'import': 'Data Import',
      'vendors': 'Vendors',
      'timeline': 'Timeline',
      'responsibility': 'Responsibility Matrix',
      'audits': 'Audits & Certifications',
      'iam': 'IAM & Permissions',
      'framework_glossary': 'Framework Glossary',
      'integration-map': 'Feature Integration Map'
    };
    return viewNames[view] || 'Controls';
  };

  // Get view icon
  const getViewIcon = (view) => {
    const icons = {
      'dashboard': LayoutDashboard,
      'controls': Shield,
      'tco': TrendingUp,
      'automation': Award,
      'import': Upload,
      'vendors': Users,
      'timeline': TrendingUp,
      'responsibility': Database,
      'audits': ClipboardList,
      'iam': UserCheck,
      'framework_glossary': BookOpen,
      'integration-map': Network
    };
    const IconComponent = icons[view] || Shield;
    return <IconComponent className="w-4 h-4" />;
  };

  // Calculate node positions for Integration Map
  const integrationMapNodePositions = useMemo(() => {
    if (!integrationMapDimensions.width || !integrationMapDimensions.height) return {};
    const centerX = integrationMapDimensions.width / 2;
    const centerY = integrationMapDimensions.height / 2;
    const radius = Math.min(integrationMapDimensions.width, integrationMapDimensions.height) * 0.35;
    const angleStep = (2 * Math.PI) / PRODUCT_LIBRARY.length;
    
    return PRODUCT_LIBRARY.reduce((acc, feature, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      acc[feature.key] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        feature
      };
      return acc;
    }, {});
  }, [integrationMapDimensions]);

  // Filter relationships based on strength
  const integrationMapFilteredRelationships = useMemo(() => {
    if (integrationMapFilterStrength === 'all') return FEATURE_RELATIONSHIPS;
    if (integrationMapFilterStrength === 'medium') {
      return FEATURE_RELATIONSHIPS.filter(rel => rel.strength === 'strong' || rel.strength === 'medium');
    }
    return FEATURE_RELATIONSHIPS.filter(rel => rel.strength === integrationMapFilterStrength);
  }, [integrationMapFilterStrength]);

  // Render Integration Map View
  const renderIntegrationMap = () => {
    const nodePositions = integrationMapNodePositions;
    const filteredRelationships = integrationMapFilteredRelationships;

    // Early return if no node positions calculated
    if (!nodePositions || Object.keys(nodePositions).length === 0) {
      return (
        <div className="space-y-6">
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Network className="w-6 h-6 text-primary" />
              Feature Integration Map
            </h2>
            <p className="text-sm text-muted-foreground mt-2">Calculating node positions...</p>
          </div>
        </div>
      );
    }

    // Get relationships for a specific feature
    const getFeatureRelationships = (featureKey) => {
      return filteredRelationships.filter(rel => 
        rel.from === featureKey || rel.to === featureKey
      );
    };

    // Find path between two features
    const findPath = (fromKey, toKey) => {
      const visited = new Set();
      const queue = [[fromKey]];
      
      while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];
        
        if (current === toKey) return path;
        if (visited.has(current)) continue;
        visited.add(current);
        
        filteredRelationships
          .filter(rel => rel.from === current || rel.to === current)
          .forEach(rel => {
            const next = rel.from === current ? rel.to : rel.from;
            if (!visited.has(next)) {
              queue.push([...path, next]);
            }
          });
      }
      return null;
    };

    // Handle feature click
    const handleFeatureClick = (featureKey) => {
      if (integrationMapSelectedFeature === featureKey) {
        setIntegrationMapSelectedFeature(null);
        setIntegrationMapHighlightedPath([]);
        setIntegrationMapSelectedConnection(null); // Clear connection when deselecting feature
      } else {
        setIntegrationMapSelectedFeature(featureKey);
        const rels = getFeatureRelationships(featureKey);
        setIntegrationMapHighlightedPath(rels.map(rel => rel.from === featureKey ? rel.to : rel.from));
        // Don't clear selected connection - allow both to be visible
      }
    };

    // Handle feature navigation
    const handleNavigateToFeature = (featureKey) => {
      navigateToFeature(featureKey);
    };

    const strengthColors = {
      strong: 'hsl(142 76% 36%)',
      medium: 'hsl(38 92% 50%)',
      weak: 'hsl(0 0% 63%)'
    };

    const strengthWidths = {
      strong: 3,
      medium: 2,
      weak: 1
    };

    return (
      <div className="space-y-6">
        {/* Header and Controls */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Network className="w-6 h-6 text-primary" />
                Feature Integration Map
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize how platform features connect and work together
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filter by strength:</span>
                <select
                  value={integrationMapFilterStrength}
                  onChange={(e) => setIntegrationMapFilterStrength(e.target.value)}
                  className="px-3 py-1.5 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground"
                >
                  <option value="all">All Connections</option>
                  <option value="strong">Strong Only</option>
                  <option value="medium">Medium & Strong</option>
                  <option value="weak">Include Weak</option>
                </select>
              </div>
              {integrationMapSelectedFeature && (
                <button
                  onClick={() => handleNavigateToFeature(integrationMapSelectedFeature)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Go to Feature
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-green-500 rounded"></div>
              <span className="text-muted-foreground">Strong Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-yellow-500 rounded"></div>
              <span className="text-muted-foreground">Medium Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-gray-500 rounded"></div>
              <span className="text-muted-foreground">Weak Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary"></div>
              <span className="text-muted-foreground">Selected Feature</span>
            </div>
          </div>
        </div>

        {/* SVG Graph */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6 overflow-auto">
          <svg
            ref={integrationMapSvgRef}
            width="100%"
            height="800"
            viewBox={`0 0 ${integrationMapDimensions.width || 1200} ${integrationMapDimensions.height || 800}`}
            className="w-full"
            style={{ minHeight: '800px', display: 'block' }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Render connections/edges */}
            {filteredRelationships.map((rel, idx) => {
              const fromPos = nodePositions[rel.from];
              const toPos = nodePositions[rel.to];
              if (!fromPos || !toPos) return null;

              const isHighlighted = integrationMapSelectedFeature && 
                (rel.from === integrationMapSelectedFeature || rel.to === integrationMapSelectedFeature);
              const isSelected = integrationMapSelectedConnection && 
                integrationMapSelectedConnection.from === rel.from && 
                integrationMapSelectedConnection.to === rel.to;
              
              const connectionType = CONNECTION_TYPES[rel.type] || { description: rel.type, icon: '🔗', color: strengthColors.medium };
              const opacity = isSelected ? 1 : isHighlighted ? 0.7 : 0.25;
              const strokeColor = isSelected ? connectionType.color : (strengthColors[rel.strength] || strengthColors.medium);
              const strokeWidth = isSelected ? (strengthWidths[rel.strength] || 2) + 2 : (strengthWidths[rel.strength] || 2);
              
              // Calculate midpoint for connection label
              const midX = (fromPos.x + toPos.x) / 2;
              const midY = (fromPos.y + toPos.y) / 2;

              return (
                <g key={`edge-${idx}`}>
                  {/* Invisible wider line for easier clicking */}
                  <line
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke="transparent"
                    strokeWidth="20"
                    opacity="0"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setIntegrationMapSelectedConnection(rel)}
                  />
                  {/* Visible connection line */}
                  <line
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    markerEnd="url(#arrowhead)"
                    className={isSelected ? "animate-pulse" : ""}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onClick={() => setIntegrationMapSelectedConnection(rel)}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.strokeWidth = String(strokeWidth + 1);
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.opacity = String(opacity);
                        e.currentTarget.style.strokeWidth = String(strokeWidth);
                      }
                    }}
                  />
                  {/* Connection type icon at midpoint (show when highlighted or selected) */}
                  {(isHighlighted || isSelected) && (
                    <g>
                      <circle
                        cx={midX}
                        cy={midY}
                        r="20"
                        fill="hsl(var(--card))"
                        stroke={strokeColor}
                        strokeWidth={isSelected ? "3" : "2"}
                        opacity="0.95"
                        style={{ cursor: 'pointer', filter: isSelected ? 'drop-shadow(0 0 8px ' + strokeColor + ')' : 'none' }}
                        onClick={() => setIntegrationMapSelectedConnection(rel)}
                      />
                      <text
                        x={midX}
                        y={midY + 6}
                        textAnchor="middle"
                        fontSize="16"
                        fill={strokeColor}
                        style={{ cursor: 'pointer', pointerEvents: 'none', fontWeight: isSelected ? 'bold' : 'normal' }}
                      >
                        {connectionType.icon}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="hsl(142 76% 36%)"
                  opacity="0.6"
                />
              </marker>
            </defs>

            {/* Render nodes */}
            {Object.entries(nodePositions).map(([key, pos]) => {
              const feature = pos.feature;
              const isSelected = integrationMapSelectedFeature === key;
              const isHighlighted = integrationMapHighlightedPath.includes(key);
              
              return (
                <g key={`node-${key}`}>
                  {/* Node circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 35 : isHighlighted ? 30 : 25}
                    fill={isSelected ? 'hsl(var(--primary))' : isHighlighted ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--card))'}
                    stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer transition-all"
                    onClick={() => handleFeatureClick(key)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.fill = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.fill = isSelected ? 'hsl(var(--primary))' : isHighlighted ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--card))';
                    }}
                  />
                  {/* Feature name */}
                  <text
                    x={pos.x}
                    y={pos.y + 50}
                    textAnchor="middle"
                    className="text-xs font-medium fill-foreground pointer-events-none"
                    style={{ fontSize: '12px' }}
                  >
                    {feature.name.split(' ').slice(0, 2).join(' ')}
                  </text>
                  {/* Status badge */}
                  <circle
                    cx={pos.x + 20}
                    cy={pos.y - 20}
                    r={6}
                    fill={feature.status === 'Live' ? '#22c55e' : '#f59e0b'}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Connection Details Panel */}
        {integrationMapSelectedConnection && (() => {
          const rel = integrationMapSelectedConnection;
          const fromFeature = PRODUCT_LIBRARY.find(f => f.key === rel.from);
          const toFeature = PRODUCT_LIBRARY.find(f => f.key === rel.to);
          const connectionType = CONNECTION_TYPES[rel.type] || { description: rel.type, icon: '🔗', color: '#666' };
          
          if (!fromFeature || !toFeature) return null;
          
          return (
            <div className="bg-card border-2 border-primary/30 rounded-lg p-6 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{connectionType.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Connection Details</h3>
                    <p className="text-sm text-muted-foreground">How these features work together</p>
                  </div>
                </div>
                <button
                  onClick={() => setIntegrationMapSelectedConnection(null)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* From Feature */}
                <div className="bg-muted/30 rounded-lg p-4 border border-[hsl(var(--border))]">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">From</div>
                  <div className="text-sm font-semibold text-foreground mb-1">{fromFeature.name}</div>
                  <button
                    onClick={() => handleFeatureClick(rel.from)}
                    className="text-xs text-primary hover:underline mt-2"
                  >
                    View feature →
                  </button>
                </div>
                
                {/* Connection Type */}
                <div className="bg-primary/10 rounded-lg p-4 border-2 border-primary/30">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Connection Type</div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{connectionType.icon}</span>
                    <span className="text-sm font-semibold text-foreground capitalize">{rel.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{connectionType.description}</p>
                  <div className="mt-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      rel.strength === 'strong' ? 'bg-green-500/20 text-green-600' :
                      rel.strength === 'medium' ? 'bg-yellow-500/20 text-yellow-600' :
                      'bg-gray-500/20 text-gray-600'
                    }`}>
                      {rel.strength} connection
                    </span>
                  </div>
                </div>
                
                {/* To Feature */}
                <div className="bg-muted/30 rounded-lg p-4 border border-[hsl(var(--border))]">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">To</div>
                  <div className="text-sm font-semibold text-foreground mb-1">{toFeature.name}</div>
                  <button
                    onClick={() => handleFeatureClick(rel.to)}
                    className="text-xs text-primary hover:underline mt-2"
                  >
                    View feature →
                  </button>
                </div>
              </div>
              
              {/* Detailed Explanation */}
              <div className="bg-muted/20 rounded-lg p-4 border border-[hsl(var(--border))]">
                <h4 className="text-sm font-semibold text-foreground mb-2">How This Connection Works</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong>{fromFeature.name}</strong> {connectionType.description.toLowerCase()} <strong>{toFeature.name}</strong>. 
                  This {rel.strength} connection means {rel.strength === 'strong' ? 'these features are tightly integrated and work closely together' : rel.strength === 'medium' ? 'these features complement each other with moderate integration' : 'these features have a loose relationship'}. 
                  When you use {fromFeature.name}, it directly impacts {toFeature.name} by {connectionType.description.toLowerCase()}.
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => {
                    handleNavigateToFeature(rel.from);
                    setIntegrationMapSelectedConnection(null);
                  }}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Go to {fromFeature.name.split(' ')[0]}
                </button>
                <button
                  onClick={() => {
                    handleNavigateToFeature(rel.to);
                    setIntegrationMapSelectedConnection(null);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Go to {toFeature.name.split(' ')[0]}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Feature Details Panel */}
        {integrationMapSelectedFeature && !integrationMapSelectedConnection && (() => {
          const feature = PRODUCT_LIBRARY.find(f => f.key === integrationMapSelectedFeature);
          const rels = getFeatureRelationships(integrationMapSelectedFeature);
          
          return (
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{feature.summary}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      feature.status === 'Live' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {feature.status}
                    </span>
                  </div>
                  <button
                    onClick={() => handleNavigateToFeature(integrationMapSelectedFeature)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Navigate to {feature.name}
                  </button>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Connected Features ({rels.length})</h4>
                  <div className="space-y-2">
                    {rels.map((rel, idx) => {
                      const connectedKey = rel.from === integrationMapSelectedFeature ? rel.to : rel.from;
                      const connectedFeature = PRODUCT_LIBRARY.find(f => f.key === connectedKey);
                      if (!connectedFeature) return null;
                      const connectionType = CONNECTION_TYPES[rel.type] || { icon: '🔗', description: rel.type };
                      
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-[hsl(var(--border))] hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setIntegrationMapSelectedConnection(rel);
                            handleFeatureClick(connectedKey);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{connectionType.icon}</span>
                            <div>
                              <div className="text-sm font-medium text-foreground">{connectedFeature.name}</div>
                              <div className="text-xs text-muted-foreground">{connectionType.description}</div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            rel.strength === 'strong' ? 'bg-green-500/10 text-green-500' :
                            rel.strength === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-gray-500/10 text-gray-500'
                          }`}>
                            {rel.strength}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Top Navigation Bar with Dropdown Menus */}
        <header className="border-b border-[hsl(var(--border))] bg-card">
          <div className="flex items-center justify-between px-4 md:px-6 h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Compliance Platform</h2>
              </div>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-foreground" />
              </button>

              {/* Main Navigation - Desktop */}
              <nav className="hidden md:flex items-center gap-1 ml-8">
                {/* Dashboard - Always Visible */}
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === 'dashboard'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                {/* Compliance & Controls Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ['controls', 'responsibility', 'audits', 'framework_glossary'].includes(activeView)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}>
                    <Shield className="w-4 h-4" />
                    <span>Compliance</span>
                    <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Compliance & Controls</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveView('controls')}>
                      <Shield className="w-4 h-4 mr-2" />
                      <span>Controls</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveView('responsibility')}>
                      <Database className="w-4 h-4 mr-2" />
                      <span>Responsibility Matrix</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveView('framework_glossary')}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      <span>Framework Glossary</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setActiveView('audits'); setSelectedAudit(null); }}>
                      <FileCheck className="w-4 h-4 mr-2" />
                      <span>Audits & Certifications</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setShowProductLibrary(true);
                      }}
                    >
                      <ListTree className="w-4 h-4 mr-2" />
                      <span>Product Library</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setActiveView('integration-map')}
                    >
                      <Network className="w-4 h-4 mr-2" />
                      <span>Integration Map</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Security & Access Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ['iam', 'csca', 'architecture'].includes(activeView)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}>
                    <UserCheck className="w-4 h-4" />
                    <span>Security</span>
                    <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Security, Roles & Access</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveView('iam')}>
                      <UserCheck className="w-4 h-4 mr-2" />
                      <span>IAM & Permissions</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveView('architecture')}>
                      <Network className="w-4 h-4 mr-2" />
                      <span>Data Flow Architecture</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveView('csca')}>
                      <Link2 className="w-4 h-4 mr-2" />
                      <span>Security-Compliance Alignment</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Planning & Analysis Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ['tco', 'timeline'].includes(activeView)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}>
                    <BarChart3 className="w-4 h-4" />
                    <span>Planning</span>
                    <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Planning & Analysis</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveView('tco')}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      <span>TCO Calculator</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveView('timeline')}>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <span>Timeline</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Management Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ['vendors', 'import'].includes(activeView)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}>
                    <Users className="w-4 h-4" />
                    <span>Management</span>
                    <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Management</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setActiveView('vendors')}>
                      <Users className="w-4 h-4 mr-2" />
                      <span>Vendors</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveView('import')}>
                      <FileText className="w-4 h-4 mr-2" />
                      <span>Data Import</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowProductLibrary(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <ListTree className="w-4 h-4" />
                  <span>Product Library</span>
                </button>
              </nav>
            </div>

            {/* Right Side - User Info and Status */}
            <div className="flex items-center gap-4">
              {backendConnected && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-500 hidden md:inline">API Connected</span>
                </div>
              )}
              {apiError && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-yellow-500 hidden md:inline">{apiError}</span>
                </div>
              )}
              {/* User Info */}
              <div className="hidden md:flex flex-col items-end border-l border-[hsl(var(--border))] pl-4">
                <div className="text-sm font-medium text-foreground">{currentUser.organization}</div>
                <div className="text-xs text-muted-foreground">{currentUser.email}</div>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-[hsl(var(--border))] bg-card p-4 space-y-2">
              <button
                onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4" />
                    <span>Compliance</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  <DropdownMenuItem onClick={() => { setActiveView('controls'); setMobileMenuOpen(false); }}>
                    <Shield className="w-4 h-4 mr-2" />
                    <span>Controls</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveView('responsibility'); setMobileMenuOpen(false); }}>
                    <Database className="w-4 h-4 mr-2" />
                    <span>Responsibility Matrix</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveView('framework_glossary'); setMobileMenuOpen(false); }}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span>Framework Glossary</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveView('audits'); setSelectedAudit(null); setMobileMenuOpen(false); }}>
                    <FileCheck className="w-4 h-4 mr-2" />
                    <span>Audits & Certifications</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowProductLibrary(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <ListTree className="w-4 h-4 mr-2" />
                    <span>Product Library</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4" />
                    <span>Security</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  <DropdownMenuItem onClick={() => { setActiveView('iam'); setMobileMenuOpen(false); }}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    <span>IAM & Permissions</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveView('architecture'); setMobileMenuOpen(false); }}>
                    <Network className="w-4 h-4 mr-2" />
                    <span>Data Flow Architecture</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveView('csca'); setMobileMenuOpen(false); }}>
                    <Link2 className="w-4 h-4 mr-2" />
                    <span>Security-Compliance Alignment</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4" />
                    <span>Planning</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  <DropdownMenuItem onClick={() => { setActiveView('tco'); setMobileMenuOpen(false); }}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    <span>TCO Calculator</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveView('timeline'); setMobileMenuOpen(false); }}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    <span>Timeline</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4" />
                    <span>Management</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full">
                  <DropdownMenuItem onClick={() => { setActiveView('vendors'); setMobileMenuOpen(false); }}>
                    <Users className="w-4 h-4 mr-2" />
                    <span>Vendors</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setActiveView('import'); setMobileMenuOpen(false); }}>
                    <FileText className="w-4 h-4 mr-2" />
                    <span>Data Import</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowProductLibrary(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <ListTree className="w-4 h-4" />
                <span>Product Library</span>
              </button>
            </div>
          )}
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Page Header */}
          <div className="border-b border-[hsl(var(--border))] bg-card p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{getViewName(activeView)}</h1>
              <p className="text-sm text-muted-foreground mt-1">Compliance Automation Platform</p>
            </div>
          </div>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto space-y-6">

        {/* Stats Cards with shadcn/ui styling - Only show on dashboard */}
        {activeView === 'dashboard' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">Total Controls</div>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.total}</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">Implemented</div>
            <div className="text-2xl md:text-3xl font-bold text-green-500">{stats.implemented}</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">Vendor Managed</div>
            <div className="text-2xl md:text-3xl font-bold text-blue-500">{stats.vendorManaged}</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">Auto-Mapped</div>
            <div className="text-2xl md:text-3xl font-bold text-purple-500">{stats.autoMapped}</div>
          </div>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">Coverage</div>
            <div className="text-2xl md:text-3xl font-bold text-primary">{coverage}%</div>
          </div>
        </div>
        )}

              {activeView === 'dashboard' ? renderDashboard() : 
               activeView === 'audits' ? renderAudits() :
               activeView === 'framework_glossary' ? renderFrameworkGlossary() :
               activeView === 'iam' ? renderIAM() :
               activeView === 'architecture' ? (
                 <DataFlowArchitectureView
                   stats={dataFlowStats}
                   canEdit={canEditDataFlow}
                   canManage={canManageDataFlow}
                   onAddNode={openDataFlowNodeModal}
                   onAddEdge={openDataFlowEdgeModal}
                   filters={dataFlowFilters}
                   onFilterChange={(key, value) => updateDataFlowFilter(key, value)}
                   nodeTypes={dataFlowNodeTypes}
                   sensitivities={dataFlowSensitivities}
                   owners={dataFlowOwners}
                   error={dataFlowError}
                   loading={dataFlowLoading}
                   graphData={dataFlowGraphData}
                   graphRef={dataFlowGraphRef}
                   hasZoomedRef={dataFlowHasZoomedRef}
                   nodeMap={dataFlowNodeMap}
                   nodeSignals={dataFlowNodeSignals}
                   edgeMap={dataFlowEdgeMap}
                   selectedItem={selectedDataFlowItem}
                   onSelectItem={setSelectedDataFlowItem}
                   onDeleteNode={handleDeleteDataFlowNode}
                   onDeleteEdge={handleDeleteDataFlowEdge}
                   auditLog={dataFlowAudit}
                   onRefresh={refreshDataFlowGraph}
                   showNodeModal={showDataFlowNodeModal}
                   showEdgeModal={showDataFlowEdgeModal}
                   nodeForm={dataFlowNodeForm}
                   edgeForm={dataFlowEdgeForm}
                   setNodeForm={setDataFlowNodeForm}
                   setEdgeForm={setDataFlowEdgeForm}
                   onSubmitNode={handleSubmitDataFlowNode}
                   onSubmitEdge={handleSubmitDataFlowEdge}
                   closeNodeModal={closeDataFlowNodeModal}
                   closeEdgeModal={closeDataFlowEdgeModal}
                   editingNode={editingDataFlowNode}
                   editingEdge={editingDataFlowEdge}
                   nodes={dataFlowNodes}
                   persistNodePosition={persistDataFlowNodePosition}
                   onResetLayout={resetDataFlowLayout}
                   savingLayout={dataFlowLayoutSaving}
                   resettingLayout={dataFlowLayoutResetting}
                   layoutLastSaved={dataFlowLayoutLastSaved}
                   accessSummary={dataFlowAccessSummary}
                   onNavigateControl={handleNavigateControl}
                   handleFormCheckbox={handleDataFlowCheckboxChange}
                 />
               ) :
               activeView === 'csca' ? renderCSCA() :
               activeView === 'tco' ? renderTCOCalculator() : 
               activeView === 'automation' ? renderAutomationPlan() :
               activeView === 'import' ? renderDataImport() :
               activeView === 'vendors' ? renderVendors() :
               activeView === 'timeline' ? renderTimeline() :
               activeView === 'responsibility' ? renderResponsibilityMatrix() :
               activeView === 'integration-map' ? renderIntegrationMap() :
               renderControls()}
            </div>
          </main>
        </div>
      </div>

      {showAutomationWalkthrough && selectedAutomationControl && (() => {
        const modalSteps = buildAutomationSteps(selectedAutomationControl.control);
        const completedCount = Object.values(automationChecklistState).filter(Boolean).length;
        const totalSteps = modalSteps.length;
        return (
          <div className="fixed inset-0 z-[150] bg-background/70 backdrop-blur-sm flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-3xl bg-card border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-[hsl(var(--border))] flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Automation Playbook • {selectedAutomationControl.control.control_name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAutomationControl.phase?.name || 'Automation Plan'} • {completedCount}/{totalSteps} steps complete
                  </p>
                </div>
                <button
                  onClick={closeAutomationWalkthrough}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Priority</div>
                    <div className="text-lg font-semibold text-foreground mt-1">
                      {selectedAutomationControl.control.priority}
                    </div>
                  </div>
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Effort</div>
                    <div className="text-lg font-semibold text-foreground mt-1">
                      {(selectedAutomationControl.control.timeEstimate ?? 4)} hrs
                    </div>
                  </div>
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Automation Ready</div>
                    <div className="text-lg font-semibold text-foreground mt-1">
                      {selectedAutomationControl.control.automatable ? 'Yes' : 'Manual'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                  {modalSteps.map((step) => (
                    <label
                      key={step.id}
                      className={`flex items-start gap-3 border border-[hsl(var(--border))] rounded-lg p-4 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer ${
                        automationChecklistState[step.id] ? 'border-primary/40 bg-primary/10' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={automationChecklistState[step.id] || false}
                        onChange={() => toggleAutomationChecklistStep(step.id)}
                        className="mt-1 h-4 w-4 rounded border-[hsl(var(--border))] text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="text-sm font-semibold text-foreground">{step.title}</div>
                        {step.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Evidence link
                    </label>
                    <input
                      type="url"
                      value={automationEvidenceLink}
                      onChange={(e) => setAutomationEvidenceLink(e.target.value)}
                      placeholder="https://share.your-evidence-link.com/artifact"
                      className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Notes for audit log
                    </label>
                    <input
                      type="text"
                      value={automationEvidenceNotes}
                      onChange={(e) => setAutomationEvidenceNotes(e.target.value)}
                      placeholder="Summary of remediation actions"
                      className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Complete every step to automatically move this control to <span className="text-foreground font-medium">Implemented</span>.
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={closeAutomationWalkthrough}
                      className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAutomationProgressSave}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Save progress
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showCommandPalette && (
        <div
          className="fixed inset-0 z-[200] bg-background/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          onClick={() => setShowCommandPalette(false)}
        >
          <div
            className="w-full max-w-xl bg-card border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[hsl(var(--border))] px-4 py-3">
              <input
                ref={commandInputRef}
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setCommandHighlightIndex((idx) =>
                      Math.min(idx + 1, Math.max(filteredCommands.length - 1, 0))
                    );
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setCommandHighlightIndex((idx) => Math.max(idx - 1, 0));
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    const command = filteredCommands[commandHighlightIndex];
                    handleCommandSelect(command);
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setShowCommandPalette(false);
                  }
                }}
                placeholder="Search commands…"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No commands found.</div>
              ) : (
                filteredCommands.map((command, idx) => {
                  const isActive = idx === commandHighlightIndex;
                  return (
                    <button
                      key={command.id}
                      type="button"
                      disabled={command.disabled}
                      onClick={() => handleCommandSelect(command)}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between gap-3 ${
                        isActive ? 'bg-primary/10' : 'hover:bg-muted/60'
                      } ${command.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div>
                        <div className="font-medium text-foreground">{command.title}</div>
                        {command.subtitle && (
                          <div className="text-xs text-muted-foreground mt-0.5">{command.subtitle}</div>
                        )}
                      </div>
                      {command.shortcut && (
                        <div className="text-[11px] text-muted-foreground border border-[hsl(var(--border))] bg-muted/50 px-2 py-1 rounded">
                          {command.shortcut}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-[hsl(var(--border))] px-4 py-3 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Use ↑ ↓ to navigate • Enter to run</span>
              <span>Press Esc to close</span>
            </div>
          </div>
        </div>
      )}

      {/* Product Library Modal - Global */}
      {showProductLibrary && (
        <div 
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" 
          onClick={() => setShowProductLibrary(false)}
          style={{ zIndex: 200 }}
        >
          <div 
            className="relative bg-card border border-[hsl(var(--border))] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 bg-card/90 backdrop-blur">
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Product Library
                </h2>
                <p className="text-xs text-muted-foreground">Explore platform capabilities, value, and related workflows.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductLibrary(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[240px,1fr] gap-0 md:gap-6 h-full">
              <div className="border-b md:border-b-0 md:border-r border-[hsl(var(--border))] bg-muted/20">
                <div className="p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feature Catalogue</div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {PRODUCT_LIBRARY.map((feature) => {
                    const isActive = selectedProductFeature?.key === feature.key;
                    return (
                      <button
                        key={feature.key}
                        type="button"
                        onClick={() => setProductLibrarySection(feature.key)}
                        className={`w-full text-left px-4 py-3 border-b border-[hsl(var(--border))] transition-colors ${
                          isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <div className="text-sm">{feature.name}</div>
                        <div className="text-[11px] uppercase tracking-wide">
                          {feature.status}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="bg-card max-h-[70vh] overflow-y-auto p-6 space-y-4">
                {selectedProductFeature ? (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-foreground">{selectedProductFeature.name}</h3>
                      <div className="text-sm text-muted-foreground leading-relaxed">{selectedProductFeature.summary}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div className="rounded-lg border border-[hsl(var(--border))] bg-muted/20 px-3 py-2">
                        <div className="uppercase tracking-wide text-[10px]">Key Value</div>
                        <div className="mt-1 text-sm text-foreground">{selectedProductFeature.value}</div>
                      </div>
                      <div className="rounded-lg border border-[hsl(var(--border))] bg-muted/20 px-3 py-2">
                        <div className="uppercase tracking-wide text-[10px]">Primary Users</div>
                        <div className="mt-1 text-sm text-foreground">{selectedProductFeature.users}</div>
                      </div>
                      <div className="rounded-lg border border-[hsl(var(--border))] bg-muted/20 px-3 py-2">
                        <div className="uppercase tracking-wide text-[10px]">Status</div>
                        <div className="mt-1 text-sm text-foreground">{selectedProductFeature.status}</div>
                      </div>
                      <div className="rounded-lg border border-[hsl(var(--border))] bg-muted/20 px-3 py-2">
                        <div className="uppercase tracking-wide text-[10px]">Related Features</div>
                        <div className="mt-1 text-sm text-foreground">
                          {selectedProductFeature.related.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capabilities</div>
                      <ul className="space-y-2">
                        {selectedProductFeature.capabilities.map((item, idx) => (
                          <li key={`capability-${selectedProductFeature.key}-${idx}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-4 border-t border-[hsl(var(--border))] space-y-2">
                      <button
                        type="button"
                        onClick={() => navigateToFeature(selectedProductFeature.key)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>Go to {selectedProductFeature.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProductLibrary(false);
                          setTimeout(() => setActiveView('integration-map'), 150);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                      >
                        <Network className="w-4 h-4" />
                        <span>View Integration Map</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Select a feature to view details.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceMVP;