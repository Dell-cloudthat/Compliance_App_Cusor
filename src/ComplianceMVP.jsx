import React, { useState, useEffect } from 'react';
import { Download, Upload, Plus, Search, Filter, CheckCircle, AlertCircle, Clock, Server, Shield, Edit2, Save, X, Users, TrendingUp, Database, Award, Menu, ChevronDown, LayoutDashboard, ArrowUpRight, ArrowDownRight, Activity, Target, ExternalLink, Info, Home, FileText, BarChart3, Settings, Sparkles, Gauge } from 'lucide-react';
import { NIST_800_53_CONTROLS } from './frameworks/nist80053-controls';
import { ISO_27001_CONTROLS } from './frameworks/iso27001-controls';
import api from './services/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";



// Extended framework library with NIST 800-171

const FRAMEWORK_LIBRARY = {

  "NIST_800-53": { name: "NIST 800-53", version: "Rev 5" },

  "NIST_800-171": { name: "NIST 800-171", version: "Rev 2" },

  "ISO27001": { name: "ISO 27001", version: "2013" },

  "SOC2": { name: "SOC 2", version: "2017" },

  "CIS": { name: "CIS Controls", version: "v8" }

};



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
  const [activeView, setActiveView] = useState('controls');
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
  const [automationPlan, setAutomationPlan] = useState(null);
  const [showPlanGenerator, setShowPlanGenerator] = useState(false);
  
  // Enterprise features
  const [entities, setEntities] = useState([]);
  const [currentEntity, setCurrentEntity] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [userRole, setUserRole] = useState({ role: 'Admin', permissions: ['*'] });
  const [projectTimeline, setProjectTimeline] = useState(null);
  
  // Timeline filtering
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("ALL");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("ALL");
  const [selectedPriceFilter, setSelectedPriceFilter] = useState("ALL");
  
  // Responsibility Matrix features
  const [responsibilityMatrix, setResponsibilityMatrix] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [apiIntegrations, setApiIntegrations] = useState([]);
  const [mdrProviders, setMdrProviders] = useState([]);
  const [matrixFilterCategory, setMatrixFilterCategory] = useState("ALL");
  const [matrixFilterCoverageType, setMatrixFilterCoverageType] = useState("ALL");
  const [matrixFilterOwnership, setMatrixFilterOwnership] = useState("ALL");
  
  // Control detail view
  const [selectedControl, setSelectedControl] = useState(null);
  const [showControlDetail, setShowControlDetail] = useState(false);
  
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
        } catch (error) {
          console.warn('Could not create/get user, using demo mode:', error);
          setCurrentUser({ ...currentUser, id: 1 }); // Demo user ID
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
    // Convert NIST 800-53 controls to our format
    const nistControls = NIST_800_53_CONTROLS.map(ctrl => ({
      id: ctrl.id,
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
    
    // Convert ISO 27001 controls to our format
    const isoControls = ISO_27001_CONTROLS.map(ctrl => ({
      id: ctrl.id.replace(/\./g, '-'),
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
    
    // Merge all controls: existing core + NIST + ISO (avoid duplicates)
    const existingIds = new Set(CORE_CONTROLS.map(c => c.id));
    const allControls = [
      ...CORE_CONTROLS,
      ...nistControls.filter(c => !existingIds.has(c.id)),
      ...isoControls.filter(c => !existingIds.has(c.id))
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

  const filteredControls = controls.filter(control => {
    const matchesFramework = selectedFramework === "ALL" || 
      control.frameworks.some(f => f.startsWith(selectedFramework));
    const matchesSearch = control.control_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      control.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      control.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFramework && matchesSearch;
  });

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
        
        {/* Historical Trend Chart */}
        <div className="mt-8 pt-8 border-t border-[hsl(var(--border))]">
          <h3 className="text-lg font-semibold text-foreground mb-4">Historical Growth Trend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {partnerGrowthHistory.map((snapshot, idx) => {
              const isLatest = idx === partnerGrowthHistory.length - 1;
              const prevSnapshot = idx > 0 ? partnerGrowthHistory[idx - 1] : null;
              const scoreChange = prevSnapshot ? snapshot.overallScore - prevSnapshot.overallScore : 0;
              
              return (
                <div key={idx} className={`bg-card border rounded-lg p-4 ${
                  isLatest ? 'border-primary ring-2 ring-primary/20' : 'border-[hsl(var(--border))]'
                }`}>
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(snapshot.date).toLocaleDateString()}
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {snapshot.overallScore}%
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {snapshot.quarter}
                  </div>
                  {scoreChange !== 0 && (
                    <div className={`flex items-center gap-1 text-xs ${
                      scoreChange >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {scoreChange >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      <span>{scoreChange >= 0 ? '+' : ''}{scoreChange}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Metrics Cards - shadcn style */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Controls Card */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-muted-foreground">Total Controls</div>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Across all frameworks</p>
          </div>
        </div>

        {/* Coverage Card */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-muted-foreground">Compliance Coverage</div>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{coverage}%</div>
            <div className="flex items-center text-xs">
              {complianceTrend > 0 ? (
                <>
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{complianceTrend}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-500">{complianceTrend}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">from last quarter</span>
            </div>
          </div>
        </div>

        {/* Implemented Controls Card */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-muted-foreground">Implemented</div>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{stats.implemented}</div>
            <div className="flex items-center text-xs">
              <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
              <span className="text-green-500">+{(stats.implemented / stats.total * 100).toFixed(1)}%</span>
              <span className="text-muted-foreground ml-1">of total</span>
            </div>
          </div>
        </div>

        {/* Compliance Gaps Card */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-muted-foreground">Active Gaps</div>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{gaps}</div>
            <div className="flex items-center text-xs">
              {gapsChange > 0 ? (
                <>
                  <ArrowDownRight className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500">-{gapsChange}</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-500">+{Math.abs(gapsChange)}</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Framework Compliance Section - shadcn style */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Object.entries(complianceScores).map(([framework, score]) => (
          <div key={framework} className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="text-sm font-medium text-muted-foreground">{FRAMEWORK_LIBRARY[framework].name}</div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <div className={`text-2xl font-bold ${
                score >= 80 ? 'text-green-500' : 
                score >= 50 ? 'text-yellow-500' : 
                'text-red-500'
              }`}>
                {score}%
              </div>
              <p className="text-xs text-muted-foreground">
                {score >= 80 ? 'Compliant' : score >= 50 ? 'In progress' : 'Needs attention'}
              </p>
            </div>
          </div>
        ))}
      </div>

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
              </>
            );
          })()}
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-1">AI-Powered Recommendations</h3>
            <p className="text-sm text-muted-foreground">Smart suggestions to improve your compliance posture</p>
          </div>
          <div className="space-y-4">
            {recommendations.slice(0, 5).map((rec, idx) => (
              <div key={idx} className={`p-4 rounded-lg border ${
                rec.type === 'critical' ? 'bg-muted/30 border-red-500/30' :
                rec.type === 'high-priority' ? 'bg-muted/30 border-yellow-500/30' :
                rec.type === 'assignment' ? 'bg-muted/30 border-blue-500/30' :
                rec.type === 'optimization' ? 'bg-muted/30 border-purple-500/30' :
                'bg-muted/30 border-[hsl(var(--border))]'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-foreground">{rec.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">{rec.description}</div>
                    {rec.estimatedImpact && (
                      <div className="text-xs text-primary mt-2 font-medium">
                        💡 {rec.estimatedImpact}
                      </div>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    rec.type === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    rec.type === 'high-priority' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                    'bg-muted text-foreground'
                  }`}>
                    Priority {rec.priority}
                  </span>
                </div>

                {rec.vendorRecommendations && rec.vendorRecommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-sm font-semibold text-foreground mb-3">💼 Recommended Vendors (Sorted by Priority & ROI):</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {rec.vendorRecommendations.map((vendor, vIdx) => (
                        <div key={vIdx} className="bg-card rounded-lg p-3 border border-[hsl(var(--border))] hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-semibold text-foreground">{vendor.vendor}</div>
                            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded">
                              {vendor.category}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>💰 ${vendor.monthlyPrice.toLocaleString()}/mo</div>
                            <div>📊 ROI: <span className={`font-semibold ${vendor.roi > 0 ? 'text-green-500' : 'text-red-500'}`}>{vendor.roi}%</span></div>
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

                {rec.suggestedActions && rec.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                    <div className="text-sm font-semibold text-foreground mb-2">📝 Suggested Actions:</div>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                      {rec.suggestedActions.map((action, aIdx) => (
                        <li key={aIdx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {rec.estimatedSavings && (
                  <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-500 font-semibold">
                    💰 {rec.estimatedSavings}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
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

  const renderControls = () => (
    <div className="bg-card rounded-lg shadow-lg p-6">
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search controls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <select
          value={selectedFramework}
          onChange={(e) => setSelectedFramework(e.target.value)}
          className="px-4 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500"
        >
          {frameworks.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Upload className="w-4 h-4" />
          Import Data
        </button>

        <button
          onClick={generateReport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[hsl(var(--border))] bg-muted/30">
              <th className="text-left py-3 px-4 font-semibold text-foreground">Control</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Description</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Owner</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Frameworks</th>
            </tr>
          </thead>
          <tbody>
            {filteredControls.map((control) => (
              <tr 
                key={control.id} 
                className="border-b border-[hsl(var(--border))] hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedControl(control);
                  setShowControlDetail(true);
                }}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{control.id}</div>
                      <div className="text-sm text-muted-foreground">{control.control_name}</div>
                    </div>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs">{control.description}</td>
                <td className="py-3 px-4">
                  <select
                    value={control.status}
                    onChange={(e) => updateControl(control.id, 'status', e.target.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[control.status]}`}
                  >
                    <option>Partial</option>
                    <option>Implemented</option>
                    <option>Compliant</option>
                    <option>Non-Compliant</option>
                    <option>Vendor Managed</option>
                  </select>
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={control.responsible_party}
                    onChange={(e) => updateControl(control.id, 'responsible_party', e.target.value)}
                    placeholder="Owner name"
                    className="w-full px-2 py-1 text-sm bg-card border border-[hsl(var(--border))] rounded text-foreground"
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {control.frameworks.map((fw, idx) => (
                      <span key={idx} className="text-xs bg-muted text-foreground px-2 py-1 rounded">
                        {fw.split(':')[0]}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Control Detail Modal */}
      {showControlDetail && selectedControl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowControlDetail(false)}>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-[hsl(var(--border))] p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{selectedControl.id}: {selectedControl.control_name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedControl.category} • Priority: {selectedControl.priority}</p>
              </div>
              <button
                onClick={() => setShowControlDetail(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Description</h3>
                <p className="text-muted-foreground">{selectedControl.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Status</h4>
                  <select
                    value={selectedControl.status}
                    onChange={(e) => {
                      updateControl(selectedControl.id, 'status', e.target.value);
                      setSelectedControl({...selectedControl, status: e.target.value});
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
                
                <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Responsible Party</h4>
                  <input
                    type="text"
                    value={selectedControl.responsible_party}
                    onChange={(e) => {
                      updateControl(selectedControl.id, 'responsible_party', e.target.value);
                      setSelectedControl({...selectedControl, responsible_party: e.target.value});
                    }}
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-foreground"
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Frameworks</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedControl.frameworks.map((fw, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium">
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
              
              {selectedControl.mapped_fields && selectedControl.mapped_fields.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">API Data Mapping</h3>
                  <div className="bg-muted/30 border border-[hsl(var(--border))] rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">These fields can be auto-mapped from API integrations:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedControl.mapped_fields.map((field, idx) => (
                        <span key={idx} className="px-2 py-1 bg-card border border-[hsl(var(--border))] rounded text-xs text-foreground">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* API Data Segments - Fetch from backend if connected */}
              <ControlDataSegments 
                control={selectedControl}
                backendConnected={backendConnected}
                fetchControlSegments={fetchControlSegments}
              />
              
              {selectedControl.nist_id && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <h4 className="font-semibold text-foreground">NIST 800-53 Control</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Control Family: {selectedControl.control_family || 'Unknown'}
                  </p>
                  <a 
                    href={`https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline flex items-center gap-1 mt-2"
                  >
                    View NIST 800-53 Documentation <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              
              {selectedControl.iso_id && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    <h4 className="font-semibold text-foreground">ISO 27001:2022 Control</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Category: {selectedControl.control_category || 'Unknown'}
                  </p>
                  <a 
                    href={`https://hightable.io/iso-27001-annex-a-controls-list/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-500 hover:underline flex items-center gap-1 mt-2"
                  >
                    View ISO 27001 Documentation <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAutomationPlan = () => {
    if (!automationPlan) {
      return (
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
      );
    }

    const plan = automationPlan;

    return (
      <div className="space-y-6">
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
      </div>
    );
  };

  // Placeholder render methods for other views
  const renderEntities = () => <div className="bg-card rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Entity Management</h2><p className="text-muted-foreground mt-2">Manage subsidiaries and regional entities</p></div>;
  const renderRBAC = () => <div className="bg-card rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Roles & Permissions</h2><p className="text-muted-foreground mt-2">Manage access control and user permissions</p></div>;
  const renderDataImport = () => <div className="bg-card rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Data Import Center</h2><p className="text-muted-foreground mt-2">Connect your security tools and import data seamlessly</p></div>;
  const renderVendors = () => <div className="bg-card rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Vendor Risk Management</h2><p className="text-muted-foreground mt-2">Track third-party compliance and inherited controls</p></div>;
  
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

        {/* Responsibility Matrix Table */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Responsibility Matrix ({filteredMatrix.length} controls)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[hsl(var(--border))] bg-muted/30">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Control ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Control Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Primary Owner</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Shared</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Secondary Owners</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Data Sources</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Coverage Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Evidence Attribution</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.map((matrix, idx) => (
                  <tr key={idx} className={`border-b border-[hsl(var(--border))] hover:bg-muted/50 transition-colors ${
                    matrix.coverage_type === "MDR/SOC Managed" ? "bg-blue-500/10" :
                    matrix.coverage_type === "Vendor Inherited" ? "bg-green-500/10" :
                    matrix.coverage_type === "API Data Attribution" ? "bg-purple-500/10" :
                    "bg-card"
                  }`}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{matrix.control_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-foreground">{matrix.control_name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {matrix.frameworks.slice(0, 2).map((fw, fIdx) => (
                          <span key={fIdx} className="text-xs bg-muted text-foreground px-2 py-1 rounded">
                            {fw.split(':')[0]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-muted text-foreground px-2 py-1 rounded">{matrix.category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold">
                        {matrix.ownership}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {matrix.shared_responsibility ? (
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full text-xs font-semibold">
                          ✓ Yes
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {matrix.secondary_owners.map((owner, oIdx) => (
                          <span key={oIdx} className="text-xs bg-green-500/20 text-green-500 border border-green-500/30 px-2 py-1 rounded">
                            {owner}
                          </span>
                        ))}
                        {matrix.secondary_owners.length === 0 && (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {matrix.data_sources.map((ds, dsIdx) => (
                          <div key={dsIdx} className="text-xs">
                            <div className="font-medium text-purple-500">{ds.integration}</div>
                            <div className="text-muted-foreground">{ds.vendor} • {ds.type}</div>
                            <div className="text-muted-foreground">Last: {new Date(ds.last_sync).toLocaleDateString()}</div>
                          </div>
                        ))}
                        {matrix.data_sources.length === 0 && (
                          <span className="text-xs text-muted-foreground">No API integrations</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        matrix.coverage_type === "MDR/SOC Managed" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        matrix.coverage_type === "Vendor Inherited" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        matrix.coverage_type === "API Data Attribution" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                        "bg-muted text-foreground border-[hsl(var(--border))]"
                      }`}>
                        {matrix.coverage_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs text-muted-foreground space-y-1">
                        {matrix.evidence_sources.map((source, eIdx) => (
                          <div key={eIdx} className="flex items-start gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{source}</span>
                          </div>
                        ))}
                        {matrix.evidence_sources.length === 0 && (
                          <span className="text-muted-foreground">No evidence sources</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    const maxCost = Math.max(...timeline.timelineData.map(d => d.cumulativeCost));
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
      'rbac': 'Roles & Permissions',
      'timeline': 'Timeline',
      'responsibility': 'Responsibility Matrix'
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
      'rbac': Shield,
      'timeline': TrendingUp,
      'responsibility': Database
    };
    const IconComponent = icons[view] || Shield;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Navigation - shadcn dashboard style */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} border-r border-[hsl(var(--border))] bg-card transition-all duration-300 flex flex-col`}>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-[hsl(var(--border))]">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Compliance</h2>
                  <p className="text-xs text-muted-foreground">Automation Platform</p>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Menu className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* Home Section */}
            <div className="mb-6">
              {!sidebarCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Home
                </div>
              )}
              <button
                onClick={() => setActiveView('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Home className="w-4 h-4" />
                {!sidebarCollapsed && <span>Dashboard</span>}
              </button>
            </div>

            {/* Documents Section */}
            <div className="mb-6">
              {!sidebarCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Documents
                </div>
              )}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveView('controls')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === 'controls'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  {!sidebarCollapsed && <span>Controls</span>}
                </button>
                <button
                  onClick={() => setActiveView('responsibility')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === 'responsibility'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  {!sidebarCollapsed && <span>Responsibility Matrix</span>}
                </button>
                <button
                  onClick={() => setActiveView('tco')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === 'tco'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  {!sidebarCollapsed && <span>TCO Calculator</span>}
                </button>
                <button
                  onClick={() => setActiveView('timeline')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === 'timeline'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  {!sidebarCollapsed && <span>Timeline</span>}
                </button>
                <button
                  onClick={() => setActiveView('automation')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === 'automation'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  {!sidebarCollapsed && <span>Automation Plan</span>}
                </button>
                <button
                  onClick={() => setActiveView('vendors')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === 'vendors'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {!sidebarCollapsed && <span>Vendors</span>}
                </button>
                <button
                  onClick={() => setActiveView('import')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === 'import'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {!sidebarCollapsed && <span>Data Import</span>}
                </button>
              </div>
            </div>

            {/* Settings Section */}
            {!sidebarCollapsed && (
              <div className="mt-auto pt-4 border-t border-[hsl(var(--border))]">
                <button
                  onClick={() => setActiveView('rbac')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === 'rbac'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="border-b border-[hsl(var(--border))] bg-card p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{getViewName(activeView)}</h1>
                <p className="text-sm text-muted-foreground">Compliance Automation Platform</p>
              </div>
              <div className="flex items-center gap-4">
                {backendConnected && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500">API Connected</span>
                  </div>
                )}
                {apiError && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-yellow-500">{apiError}</span>
                  </div>
                )}
                <div className="flex flex-col items-end">
                  <div className="text-sm font-medium text-foreground">{currentUser.organization}</div>
                  <div className="text-xs text-muted-foreground">{currentUser.email}</div>
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

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
               activeView === 'tco' ? renderTCOCalculator() : 
               activeView === 'automation' ? renderAutomationPlan() :
               activeView === 'import' ? renderDataImport() :
               activeView === 'vendors' ? renderVendors() :
               activeView === 'rbac' ? renderRBAC() :
               activeView === 'timeline' ? renderTimeline() :
               activeView === 'responsibility' ? renderResponsibilityMatrix() :
               renderControls()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ComplianceMVP;
