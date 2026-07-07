/**
 * Module-level constants extracted from ComplianceMVP.jsx.
 * Import individual exports by name wherever they are needed.
 */

import { NIST_800_53_CONTROLS } from '../frameworks/nist80053-controls';
import { ISO_27001_CONTROLS }   from '../frameworks/iso27001-controls';
import { CIS_CONTROLS }         from '../frameworks/cis-controls';
import { HIPAA_CONTROLS }       from '../frameworks/hipaa-controls';
import { PCI_DSS_CONTROLS }     from '../frameworks/pci-dss-controls';
import { SOC2_CONTROLS }        from '../frameworks/soc2-controls';
import { FEDRAMP_CONTROLS }        from '../frameworks/fedramp-controls';
import { NIST_800_171_CONTROLS }   from '../frameworks/nist800171-controls';
import { NIST_AI_RMF_CONTROLS }    from '../frameworks/nist-ai-rmf-controls';
import { MITRE_ATLAS_CONTROLS }    from '../frameworks/mitre-atlas-controls';

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
  "FedRAMP": { name: "FedRAMP", version: "High Baseline" },
  "NIST_AI_RMF": { name: "NIST AI RMF", version: "1.0" },
  "MITRE_ATLAS": { name: "MITRE ATLAS", version: "v5.6.0" }
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
  {
    id: 'nistairmf',
    name: 'NIST AI Risk Management Framework 1.0',
    shortName: 'NIST AI RMF',
    category: 'AI Governance & Risk Management',
    description: 'Voluntary framework for managing risks across the AI lifecycle, organized into four functions: Govern, Map, Measure, and Manage.',
    focusAreas: ['AI Governance', 'Risk Mapping & Context', 'Trustworthy AI Measurement', 'Risk Treatment & Monitoring'],
    idealFor: ['Organizations building or deploying AI systems', 'AI governance and GRC teams', 'Enterprises facing AI-specific regulatory scrutiny'],
    docLink: 'https://airc.nist.gov/airmf-resources/airmf/5-sec-core/',
    quickFacts: {
      controlFamilies: 19,
      totalControls: 72,
      assuranceLevel: 'Voluntary',
    },
  },
  {
    id: 'mitreatlas',
    name: 'MITRE ATLAS (Adversarial Threat Landscape for AI Systems)',
    shortName: 'MITRE ATLAS',
    category: 'AI Adversarial Threat Modeling',
    description: 'Living knowledge base of adversary tactics and techniques targeting AI/ML systems, modeled after MITRE ATT&CK. Updated by MITRE multiple times per year.',
    focusAreas: ['Reconnaissance & AI Model Access', 'AI Attack Staging', 'LLM Prompt Injection & Jailbreaks', 'Exfiltration & Impact'],
    idealFor: ['AI red teams & security engineers', 'Organizations running pre-audit AI security simulations', 'ML/LLM application security reviews'],
    docLink: 'https://atlas.mitre.org/',
    quickFacts: {
      controlFamilies: 16,
      totalControls: 101,
      assuranceLevel: 'Living knowledge base (not a compliance standard)',
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

export {
  PRODUCT_LIBRARY,
  CONNECTION_TYPES,
  FEATURE_RELATIONSHIPS,
  FRAMEWORK_LIBRARY,
  FRAMEWORK_GLOSSARY,
  CORE_CONTROLS,
  generateMappedFields,
  getDefaultOwner,
  getControlFamily,
  segmentApiData,
  NIST_AI_RMF_CONTROLS,
  MITRE_ATLAS_CONTROLS,
};
