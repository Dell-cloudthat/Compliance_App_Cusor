import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { NIST_800_53_CONTROLS } from './frameworks/nist80053-controls';
import { ISO_27001_CONTROLS } from './frameworks/iso27001-controls';
import { CIS_CONTROLS } from './frameworks/cis-controls';
import { HIPAA_CONTROLS } from './frameworks/hipaa-controls';
import { PCI_DSS_CONTROLS } from './frameworks/pci-dss-controls';
import { SOC2_CONTROLS } from './frameworks/soc2-controls';
import { FEDRAMP_CONTROLS } from './frameworks/fedramp-controls';
import { NIST_800_171_CONTROLS } from './frameworks/nist800171-controls';
import { Download, Upload, Plus, Search, Filter, CheckCircle, AlertCircle, Clock, Server, Shield, Edit2, Save, X, Users, TrendingUp, Database, Award, Menu, ChevronDown, ChevronUp, ChevronRight, LayoutDashboard, ArrowUpRight, ArrowDownRight, ArrowRight, Activity, Target, ExternalLink, Info, Home, FileText, BarChart3, Settings, Sparkles, Gauge, FileCheck, ClipboardList, AlertTriangle, CheckSquare, Calendar, UserCheck, Link2, TrendingDown, XCircle, ActivitySquare, Network, BookOpen, ListTree, HelpCircle, Loader2, Check, RefreshCw, Zap } from 'lucide-react';
import api, { API_BASE_URL } from './services/api';
// Constants and framework data moved to src/data/constants.js
import {
  PRODUCT_LIBRARY, CONNECTION_TYPES, FEATURE_RELATIONSHIPS,
  FRAMEWORK_LIBRARY, FRAMEWORK_GLOSSARY, CORE_CONTROLS,
  generateMappedFields, getDefaultOwner, getControlFamily, segmentApiData,
  NIST_AI_RMF_CONTROLS, MITRE_ATLAS_CONTROLS,
} from './data/constants';
// Extracted view components
import { ComplianceProvider } from './context/ComplianceContext';
import ControlsView       from './views/ControlsView';
import DashboardView      from './views/DashboardView';
import IamView            from './views/IamView';
import CscaView           from './views/CscaView';
import AuditsView         from './views/AuditsView';
import AutomationView     from './views/AutomationView';
import FrameworkGlossary  from './views/FrameworkGlossary';
import ResponsibilityView from './views/ResponsibilityView';
import TimelineView       from './views/TimelineView';
import IntegrationMapView from './views/IntegrationMapView';
import IntakeWizardView   from './views/IntakeWizardView';
import WizardShowcasePage from './views/WizardShowcasePage';
import TrustPortalView   from './views/TrustPortalView';
import TrustShowcasePage from './views/TrustShowcasePage';
import HomeView          from './views/HomeView';
import IntegrationsView  from './views/IntegrationsView';
import DataFlowArchitectureView from './views/DataFlowArchitectureView';
import ClientIntakePortalView from './views/ClientIntakePortalView';
import ConsultingPortalView from './views/ConsultingPortalView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

const ComplianceMVP = ({ onLogout }) => {
  const [activeView, setActiveView] = useState('home');
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
  const [showWizard, setShowWizard] = useState(false);
  // guided = ≤5 nav items (Tier 1-2 / new users); advanced = full nav
  const [navMode, setNavMode] = useState(
    () => localStorage.getItem('navMode') || 'guided'
  );
  const setNavModeAndPersist = (mode) => {
    setNavMode(mode);
    localStorage.setItem('navMode', mode);
  };
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
  const [auditIntegrationEvents, setAuditIntegrationEvents] = useState(null);
  const [auditWorkflowExecutions, setAuditWorkflowExecutions] = useState(null);
  const [preAuditReadiness, setPreAuditReadiness] = useState([]);
  const [showAuditCreate, setShowAuditCreate] = useState(false);
  const [auditorMode, setAuditorMode] = useState(false); // Toggle for auditor view
  const [selectedEvidenceForReview, setSelectedEvidenceForReview] = useState(null);
  const [auditComments, setAuditComments] = useState([]); // Comments/notes on audits
  const [showFindingCreate, setShowFindingCreate] = useState(false);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [certifications, setCertifications] = useState([]);
  // Automated Evidence Collection
  const [evidenceCollectionStatus, setEvidenceCollectionStatus] = useState(null);
  const [evidenceCollectionLoading, setEvidenceCollectionLoading] = useState(false);
  const [evidenceFreshness, setEvidenceFreshness] = useState(null);
  const [autoLinkingStatus, setAutoLinkingStatus] = useState(null);
  
  // Dashboard Collapsible Sections State
  const [dashboardSectionsExpanded, setDashboardSectionsExpanded] = useState({
    overview: true, // Keep overview expanded by default
    frameworks: false,
    alerts: false,
    activity: false,
    growth: false,
    kpis: false,
    gapAnalysis: false,
    recommendations: false
  });
  
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
  const [integrationEventsSummary, setIntegrationEventsSummary] = useState(null);
  const [showIntegrationEvents, setShowIntegrationEvents] = useState(true);
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

  // Load IAM data - use ref to prevent multiple calls
  const iamDataLoadedRef = useRef(false);
  
  useEffect(() => {
    if (activeView === 'iam') {
      // Only load if not already loaded
      if (iamDataLoadedRef.current && allUsers && allUsers.length > 0) {
        return;
      }
      
      console.log('IAM view active, loading data...');
      if (currentUser.id && backendConnected) {
        loadIAMData();
        iamDataLoadedRef.current = true;
      } else {
        // Even without user ID, load demo data for visualization
        if (!allUsers || allUsers.length === 0) {
          console.log('No user ID or backend, loading demo data');
          loadDemoIAMData();
          iamDataLoadedRef.current = true;
        }
      }
    } else {
      // Reset when switching away from IAM view
      iamDataLoadedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, backendConnected, currentUser.id]);

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
      loadIntegrationEventsSummary();
    }
  }, [activeView, backendConnected, currentUser.id]);

  // Load integration events summary for visualization
  const loadIntegrationEventsSummary = async () => {
    if (!backendConnected || !currentUser.id) {
      // Demo mode - create sample integration events summary
      setIntegrationEventsSummary({
        total_events: 1250,
        by_integration: {
          'CrowdStrike EDR': 450,
          'Okta Identity': 320,
          'AWS CloudTrail': 280,
          'Palo Alto Firewall': 200
        },
        by_type: {
          'login_events': 320,
          'api_calls': 280,
          'process_execution': 250,
          'network_connections': 200,
          'privilege_escalation': 100,
          'file_access': 100
        },
        by_framework: {
          'NIST_800-53': 850,
          'ISO27001': 600,
          'SOC2': 450
        },
        recent_events: []
      });
      return;
    }
    try {
      const summary = await api.getIntegrationEventsSummary(currentUser.id, 30);
      setIntegrationEventsSummary(summary);
    } catch (error) {
      console.error('Error loading integration events summary:', error);
      setIntegrationEventsSummary(null);
    }
  };

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
      // Add integration event nodes if summary is available
      const enhancedGraph = enhanceGraphWithIntegrationEvents(demoGraph, integrationEventsSummary);
      setDataFlowNodes(enhancedGraph.nodes);
      setDataFlowEdges(enhancedGraph.edges);
      setDataFlowAudit([]);
      return;
    }
    setDataFlowLoading(true);
    setDataFlowError(null);
    try {
      const graph = await api.getDataFlowGraph(currentUser.id);
      const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
      const edges = Array.isArray(graph?.edges) ? graph.edges : [];
      
      // Enhance graph with integration events
      const enhancedGraph = enhanceGraphWithIntegrationEvents({ nodes, edges }, integrationEventsSummary);
      setDataFlowNodes(enhancedGraph.nodes);
      setDataFlowEdges(enhancedGraph.edges);
    } catch (error) {
      console.error('Error loading data flow graph:', error);
      setDataFlowError(error.message || 'Failed to load data flow graph');
    } finally {
      setDataFlowLoading(false);
    }
  };

  // Enhance data flow graph with integration event nodes and edges
  const enhanceGraphWithIntegrationEvents = (graph, eventsSummary) => {
    if (!eventsSummary || !showIntegrationEvents) {
      return graph;
    }

    const { nodes, edges } = graph;
    const integrationNodes = [];
    const integrationEdges = [];
    let nodeIdCounter = Math.max(...nodes.map(n => n.id || 0), 0) + 1;

    // Create integration event source nodes
    Object.entries(eventsSummary.by_integration || {}).forEach(([integrationName, eventCount]) => {
      const integrationNode = {
        id: nodeIdCounter++,
        node_type: 'source',
        name: integrationName,
        description: `Integration event source: ${eventCount} events in last 30 days`,
        sensitivity: 'Internal',
        integration_status: 'active',
        event_count: eventCount,
        is_integration_event_source: true
      };
      integrationNodes.push(integrationNode);

      // Find auto-mapping processor node (or create one)
      let autoMappingNode = nodes.find(n => n.name?.toLowerCase().includes('auto-map') || n.name?.toLowerCase().includes('mapping'));
      if (!autoMappingNode) {
        autoMappingNode = {
          id: nodeIdCounter++,
          node_type: 'processor',
          name: 'Auto-Mapping Service',
          description: 'Automatically maps integration events to compliance controls',
          sensitivity: 'Internal',
          is_auto_mapping: true
        };
        integrationNodes.push(autoMappingNode);
      }

      // Create edge from integration to auto-mapping
      integrationEdges.push({
        id: `integration-${integrationNode.id}-to-mapping`,
        source_node_id: integrationNode.id,
        target_node_id: autoMappingNode.id,
        flow_type: 'ingest',
        transport: 'API',
        automated: true,
        status: 'active',
        event_volume: eventCount,
        is_integration_flow: true
      });

      // Find controls that might be mapped from this integration
      const relatedControls = nodes.filter(n => 
        n.framework_controls && 
        Array.isArray(n.framework_controls) && 
        n.framework_controls.length > 0
      ).slice(0, 3); // Limit to 3 controls for visualization

      relatedControls.forEach(controlNode => {
        // Create edge from auto-mapping to control
        integrationEdges.push({
          id: `mapping-to-control-${controlNode.id}-from-${integrationNode.id}`,
          source_node_id: autoMappingNode.id,
          target_node_id: controlNode.id,
          flow_type: 'transform',
          transport: 'Auto-Mapping',
          automated: true,
          status: 'active',
          controls_impacted: controlNode.framework_controls || [],
          is_integration_flow: true
        });
      });
    });

    // Find report nodes
    const reportNodes = nodes.filter(n => 
      n.node_type === 'report' || 
      n.name?.toLowerCase().includes('report') ||
      n.name?.toLowerCase().includes('audit')
    );

    // Create edges from controls to reports
    const controlNodes = nodes.filter(n => 
      n.framework_controls && 
      Array.isArray(n.framework_controls) && 
      n.framework_controls.length > 0
    );

    controlNodes.forEach(controlNode => {
      reportNodes.forEach(reportNode => {
        // Check if edge already exists
        const existingEdge = edges.find(e => 
          e.source_node_id === controlNode.id && 
          e.target_node_id === reportNode.id
        );
        
        if (!existingEdge) {
          integrationEdges.push({
            id: `control-${controlNode.id}-to-report-${reportNode.id}`,
            source_node_id: controlNode.id,
            target_node_id: reportNode.id,
            flow_type: 'export',
            transport: 'Report Generation',
            automated: true,
            status: 'active',
            is_integration_flow: true
          });
        }
      });
    });

    return {
      nodes: [...nodes, ...integrationNodes],
      edges: [...edges, ...integrationEdges]
    };
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

  // Refresh graph when integration events summary changes
  useEffect(() => {
    if (activeView === 'architecture' && integrationEventsSummary) {
      loadDataFlowGraph();
    }
  }, [integrationEventsSummary, showIntegrationEvents]);

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
    // Prevent multiple calls - if data already exists, don't reload
    if (allUsers && allUsers.length > 0) {
      console.log('Demo IAM data already loaded, skipping');
      return;
    }
    
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
      
      // Load evidence freshness
      const freshness = await api.getEvidenceFreshness(currentUser.id, auditId).catch(() => null);
      setEvidenceFreshness(freshness);
      
      // Load integration events summary for this audit
      try {
        const eventsSummary = await api.getIntegrationEventsSummary(currentUser.id, 30);
        setAuditIntegrationEvents(eventsSummary);
      } catch (error) {
        console.error('Error loading integration events:', error);
        setAuditIntegrationEvents(null);
      }
      
      // Load workflow executions for this audit
      try {
        const workflows = await api.getWorkflowExecutions(currentUser.id, 50);
        // Filter workflows related to this audit (evidence collection, gap remediation, audit prep)
        const auditWorkflows = workflows.filter(w => 
          w.workflow_type === 'evidence_collection' || 
          w.workflow_type === 'gap_remediation' || 
          w.workflow_type === 'audit_preparation'
        );
        setAuditWorkflowExecutions(auditWorkflows);
      } catch (error) {
        console.error('Error loading workflow executions:', error);
        setAuditWorkflowExecutions([]);
      }
    } catch (error) {
      console.error('Error loading audit details:', error);
      // Try to find in local state as fallback
      const audit = audits.find(a => a.id === auditId || a.id === parseInt(auditId));
      if (audit) {
        setSelectedAudit(audit);
        setAuditFindings([]);
        setAuditEvidence([]);
        // Demo mode - set demo data
        setAuditIntegrationEvents({
          total_events: 1250,
          by_integration: { 'CrowdStrike EDR': 450, 'Okta Identity': 320, 'AWS CloudTrail': 280 },
          by_type: { 'login_events': 320, 'api_calls': 280, 'process_execution': 250 },
          by_framework: { 'NIST_800-53': 850, 'ISO27001': 600, 'SOC2': 450 }
        });
        setAuditWorkflowExecutions([
          { id: 1, workflow_name: 'Evidence Collection', workflow_type: 'evidence_collection', status: 'completed', completed_at: new Date().toISOString() },
          { id: 2, workflow_name: 'Gap Remediation', workflow_type: 'gap_remediation', status: 'completed', completed_at: new Date().toISOString() }
        ]);
      }
    }
  };

  // Automated Evidence Collection Functions
  const triggerEvidenceCollection = async (controlIds = null) => {
    if (!selectedAudit) return;
    
    setEvidenceCollectionLoading(true);
    setEvidenceCollectionStatus(null);
    
    try {
      if (backendConnected && currentUser.id) {
        const results = await api.collectEvidence(currentUser.id, selectedAudit.id, controlIds, null);
        setEvidenceCollectionStatus(results);
        
        // Reload evidence and freshness
        await loadAuditDetails(selectedAudit.id);
        
        alert(`Evidence collection complete! Collected ${results.evidence_collected} items for ${results.controls_processed} controls.`);
      } else {
        // Demo mode
        const demoResults = {
          audit_id: selectedAudit.id,
          controls_processed: controlIds ? controlIds.length : (selectedAudit.scope?.length || 0),
          evidence_collected: controlIds ? controlIds.length * 2 : (selectedAudit.scope?.length || 0) * 2,
          errors: [],
          by_control: {}
        };
        setEvidenceCollectionStatus(demoResults);
        
        // Add demo evidence
        const newEvidence = (controlIds || selectedAudit.scope || []).map((controlId, idx) => ({
          id: Date.now() + idx,
          audit_engagement_id: selectedAudit.id,
          control_id: controlId,
          evidence_type: idx % 2 === 0 ? 'api_data' : 'configuration',
          evidence_name: `Auto-collected Evidence - ${controlId} - ${new Date().toLocaleDateString()}`,
          uploaded_by: 'system',
          uploaded_at: new Date().toISOString(),
          expiration_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          validated: false,
          metadata: { source: 'automated_collection', integration_type: 'demo' }
        }));
        setAuditEvidence(prev => [...prev, ...newEvidence]);
        
        alert(`Demo: Collected ${demoResults.evidence_collected} evidence items.`);
      }
    } catch (error) {
      console.error('Error collecting evidence:', error);
      alert('Error collecting evidence. Please try again.');
    } finally {
      setEvidenceCollectionLoading(false);
    }
  };

  const triggerAutoLinking = async () => {
    if (!selectedAudit) return;
    
    try {
      if (backendConnected && currentUser.id) {
        const results = await api.autoLinkEvidence(currentUser.id, selectedAudit.id);
        setAutoLinkingStatus(results);
        
        // Reload evidence
        await loadAuditDetails(selectedAudit.id);
        
        alert(`Auto-linking complete! Linked ${results.linked_count} evidence items to controls.`);
      } else {
        // Demo mode
        const demoResults = {
          unlinked_count: 0,
          linked_count: 0,
          results: []
        };
        setAutoLinkingStatus(demoResults);
        alert('Demo: All evidence is already linked to controls.');
      }
    } catch (error) {
      console.error('Error auto-linking evidence:', error);
      alert('Error auto-linking evidence. Please try again.');
    }
  };

  const initializeBackend = async () => {
    try {
      // Check if backend is available
      const response = await fetch(`${api.baseURL || 'http://localhost:8000'}/`);
      if (response.ok) {
        setBackendConnected(true);
        setApiError(null);

        // Resolve the authenticated user from the JWT stored by api.js
        try {
          const me = await api.request('/api/auth/me');
          setCurrentUser({
            id: me.id,
            email: me.email || currentUser.email,
            name: me.name || currentUser.email.split('@')[0],
            organization: me.organization || currentUser.organization,
            role: me.role || currentUser.role,
          });

          // Bootstrap: grant admin role to first user (no-op if admins already exist)
          try {
            await api.bootstrapAdmin(me.id);
          } catch (e) {
            console.warn('Could not bootstrap admin role:', e);
          }
        } catch (error) {
          console.warn('Could not resolve authenticated user:', error);
          // If token is invalid the 401 handler in api.js already cleared it;
          // App.jsx will unmount us and show the login page.
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

    const aiRmfControls = NIST_AI_RMF_CONTROLS.map(ctrl => ({
      id: `AIRMF-${ctrl.id.replace(/[.\s]/g, '-')}`,
      control_name: ctrl.name,
      description: `NIST AI RMF ${ctrl.id} (${ctrl.function}): ${ctrl.description}`,
      frameworks: [`NIST_AI_RMF:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      ai_rmf_id: ctrl.id,
      ai_rmf_function: ctrl.function,
      // Full official subcategory text -- used by the recommendation
      // verification feature to cross-check AI-generated guidance against
      // the actual framework language rather than just a short label.
      source_text: ctrl.description,
    }));

    const mitreAtlasControls = MITRE_ATLAS_CONTROLS.map(ctrl => ({
      id: `ATLAS-${ctrl.id.replace(/\./g, '-')}`,
      control_name: ctrl.name,
      description: `MITRE ATLAS Tactic ${ctrl.id}: ${ctrl.description}`,
      frameworks: [`MITRE_ATLAS:${ctrl.id}`],
      category: ctrl.category,
      priority: ctrl.priority,
      mapped_fields: generateMappedFields(ctrl.category, ctrl.id),
      default_owner: getDefaultOwner(ctrl.category),
      atlas_id: ctrl.id,
      source_text: ctrl.description,
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
      ...nist171Controls.filter(c => !existingIds.has(c.id)),
      ...aiRmfControls.filter(c => !existingIds.has(c.id)),
      ...mitreAtlasControls.filter(c => !existingIds.has(c.id))
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

  // Load learned patterns and playbooks
  const loadLearningData = async () => {
    try {
      const [patternsRes, playbooksRes, valueRes] = await Promise.all([
        api.getLearnedPatterns(currentUser.id),
        api.getAutoPlaybooks(currentUser.id),
        api.getDataValueSummary(currentUser.id),
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
      const result = await api.runLearningAnalysis(currentUser.id);
      await loadLearningData();
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
      await api.approvePlaybook(currentUser.id, playbookId);
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

  useEffect(() => {
    if (activeView === 'csca' || activeView === 'dashboard') {
      if (backendConnected && currentUser?.id) {
        loadLearningData();
      } else {
        const demoData = generateDemoLearningData();
        setLearnedPatterns(demoData.patterns);
        setAutoPlaybooks(demoData.playbooks);
      }
    }
  }, [activeView, backendConnected, currentUser?.id, loadLearningData, generateDemoLearningData]);

  const handleUploadEvidence = async (evidenceData) => {
    if (!selectedAudit) return;
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
    setEvidenceFormData({ control_id: '', evidence_type: 'document', evidence_name: '', file_url: '', notes: '', expiration_date: '' });
  };

  const handleCreateAudit = async () => {
    if (!auditFormData.audit_name || !auditFormData.start_date) {
      alert('Please fill in required fields');
      return;
    }
    if (!backendConnected || !currentUser.id) {
      const newAudit = {
        id: Date.now(),
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
      setAuditFormData({ audit_name: '', framework: 'SOC2', audit_type: 'Type II', auditor_name: '', auditor_contact: '', start_date: new Date().toISOString().split('T')[0], end_date: '', scope: [] });
      alert('Audit created (demo mode - not saved to backend)');
      return;
    }
    try {
      await api.createAudit(currentUser.id, auditFormData);
      await loadAudits();
      setShowAuditCreate(false);
      setAuditFormData({ audit_name: '', framework: 'SOC2', audit_type: 'Type II', auditor_name: '', auditor_contact: '', start_date: new Date().toISOString().split('T')[0], end_date: '', scope: [] });
    } catch (error) {
      console.error('Error creating audit:', error);
      alert('Failed to create audit: ' + error.message);
    }
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
      setFindingFormData({ control_id: '', finding_type: 'observation', severity: 'medium', description: '', remediation_plan: '', assigned_to: '', due_date: '' });
      alert('Finding created (demo mode)');
      return;
    }
    try {
      await api.createFinding(currentUser.id, selectedAudit.id, findingFormData);
      await loadAuditDetails(selectedAudit.id);
      setShowFindingCreate(false);
      setFindingFormData({ control_id: '', finding_type: 'observation', severity: 'medium', description: '', remediation_plan: '', assigned_to: '', due_date: '' });
    } catch (error) {
      console.error('Error creating finding:', error);
      alert('Failed to create finding: ' + error.message);
    }
  };

  const getViewName = (view) => {
    const viewNames = {
      'dashboard': 'Dashboard', 'controls': 'Controls', 'tco': 'TCO Calculator',
      'automation': 'Automation Plan', 'import': 'Data Import', 'vendors': 'Vendors',
      'timeline': 'Timeline', 'responsibility': 'Responsibility Matrix',
      'audits': 'Audits & Certifications', 'iam': 'IAM & Permissions',
      'framework_glossary': 'Framework Glossary', 'integration-map': 'Feature Integration Map'
    };
    return viewNames[view] || 'Controls';
  };

  const getViewIcon = (view) => {
    const icons = {
      'dashboard': LayoutDashboard, 'controls': Shield, 'tco': TrendingUp,
      'automation': Award, 'import': Upload, 'vendors': Users, 'timeline': TrendingUp,
      'responsibility': Database, 'audits': ClipboardList, 'iam': UserCheck,
      'framework_glossary': BookOpen, 'integration-map': Network
    };
    const IconComponent = icons[view] || Shield;
    return <IconComponent className="w-4 h-4" />;
  };

  const integrationMapNodePositions = useMemo(() => {
    if (!integrationMapDimensions.width || !integrationMapDimensions.height) return {};
    const centerX = integrationMapDimensions.width / 2;
    const centerY = integrationMapDimensions.height / 2;
    const radius = Math.min(integrationMapDimensions.width, integrationMapDimensions.height) * 0.35;
    const angleStep = (2 * Math.PI) / PRODUCT_LIBRARY.length;
    return PRODUCT_LIBRARY.reduce((acc, feature, index) => {
      const angle = index * angleStep - Math.PI / 2;
      acc[feature.key] = { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle), feature };
      return acc;
    }, {});
  }, [integrationMapDimensions]);

  const integrationMapFilteredRelationships = useMemo(() => {
    if (integrationMapFilterStrength === 'all') return FEATURE_RELATIONSHIPS;
    if (integrationMapFilterStrength === 'medium') {
      return FEATURE_RELATIONSHIPS.filter(rel => rel.strength === 'strong' || rel.strength === 'medium');
    }
    return FEATURE_RELATIONSHIPS.filter(rel => rel.strength === integrationMapFilterStrength);
  }, [integrationMapFilterStrength]);

  const generateCostPlan = () => {
    if (!tcoResults) {
      calculateTCO();
      return;
    }
    const aiRecommendations = [];
    if (tcoResults.backendCosts) {
      const backendMonthly = tcoResults.backendCosts.monthly;
      const totalBackend = (backendMonthly.auth || 0) +
        (typeof backendMonthly.storage === 'object' ? backendMonthly.storage.total : backendMonthly.storage || 0) +
        (backendMonthly.api_requests || 0) +
        (backendMonthly.compute || 0) +
        (backendMonthly.database || 0);
      if (totalBackend > tcoResults.monthly.total * 0.3) {
        aiRecommendations.push({
          type: 'cost_optimization', priority: 'high',
          title: 'Backend Costs High',
          description: `Backend infrastructure costs ($${totalBackend.toFixed(0)}/month) represent ${((totalBackend / tcoResults.monthly.total) * 100).toFixed(1)}% of total monthly costs.`,
          recommendation: 'Consider implementing data retention policies, API rate limiting, and storage tiering to reduce costs by 20-30%.',
          estimatedSavings: totalBackend * 0.25, implementationEffort: 'Medium', timeframe: '30-60 days'
        });
      }
    }
    const vendorCostEstimate = tcoInputs.numVendorTools * 500;
    if (vendorCostEstimate > tcoResults.monthly.total * 0.4) {
      aiRecommendations.push({
        type: 'vendor_optimization', priority: 'high',
        title: 'Vendor Tool Consolidation',
        description: `Estimated vendor tool costs ($${vendorCostEstimate.toFixed(0)}/month) are high.`,
        recommendation: 'Review overlapping tool capabilities and consolidate to 3-4 core vendors.',
        estimatedSavings: vendorCostEstimate * 0.15, implementationEffort: 'High', timeframe: '60-90 days'
      });
    }
    if (tcoInputs.numAssets > 500) {
      aiRecommendations.push({
        type: 'scaling', priority: 'medium',
        title: 'Asset Scaling Opportunities',
        description: `With ${tcoInputs.numAssets} assets, volume discounts may apply.`,
        recommendation: 'Negotiate enterprise pricing tiers. Consider annual prepayment for 10-15% discount.',
        estimatedSavings: tcoResults.annual.total * 0.12, implementationEffort: 'Low', timeframe: '15-30 days'
      });
    }
    const gapControls = controls.filter(c => c.status === "Not Implemented" || c.status === "Non-Compliant" || c.status === "Partial");
    if (gapControls.length > 10) {
      aiRecommendations.push({
        type: 'compliance_gaps', priority: 'critical',
        title: 'Compliance Gap Cost Impact',
        description: `${gapControls.length} controls are non-compliant, increasing audit risk and potential fines.`,
        recommendation: 'Prioritize critical controls (AC-*, SI-*, IR-*) to reduce audit findings and potential penalties by 40-60%.',
        estimatedSavings: gapControls.length * 2000, implementationEffort: 'High', timeframe: '90-180 days'
      });
    }
    if (tcoInputs.retentionYears > 3) {
      aiRecommendations.push({
        type: 'retention', priority: 'medium',
        title: 'Data Retention Optimization',
        description: `${tcoInputs.retentionYears}-year retention may be excessive for some data types.`,
        recommendation: 'Implement tiered retention: 7 years for critical data, 3 years for standard, 1 year for non-critical.',
        estimatedSavings: (tcoResults.backendCosts?.monthly?.storage && typeof tcoResults.backendCosts.monthly.storage === 'object'
          ? tcoResults.backendCosts.monthly.storage.total
          : tcoResults.backendCosts?.monthly?.storage || 500) * 0.3 * 12,
        implementationEffort: 'Medium', timeframe: '45-60 days'
      });
    }
    const costPlanData = {
      currentState: {
        monthly: tcoResults.monthly.total, annual: tcoResults.annual.total, threeYear: tcoResults.threeYear.total,
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
        monthly: tcoResults.monthly.total * 0.85, annual: tcoResults.annual.total * 0.85, threeYear: tcoResults.threeYear.total * 0.85,
        savings: { monthly: tcoResults.monthly.total * 0.15, annual: tcoResults.annual.total * 0.15, threeYear: tcoResults.threeYear.total * 0.15 }
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
          <button onClick={generateCostPlan} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors">
            <Sparkles className="w-4 h-4" />
            Generate Cost Plan
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Number of Assets/Endpoints</label>
            <input type="number" value={tcoInputs.numAssets} onChange={(e) => updateTCOInput('numAssets', parseInt(e.target.value))} className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Cloud Accounts (AWS/Azure/GCP)</label>
            <input type="number" value={tcoInputs.numCloudAccounts} onChange={(e) => updateTCOInput('numCloudAccounts', parseInt(e.target.value))} className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Vendor Tools (EDR, SIEM, RMM)</label>
            <input type="number" value={tcoInputs.numVendorTools} onChange={(e) => updateTCOInput('numVendorTools', parseInt(e.target.value))} className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </div>
      {tcoResults && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg shadow p-6">
              <div className="text-sm text-muted-foreground mb-1">Monthly Cost</div>
              <div className="text-3xl font-bold text-foreground">${tcoResults.monthly.total.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground mt-1">{tcoResults.platformTier} Tier</div>
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
          {tcoResults.backendCosts && (
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow p-6 mt-6">
              <h4 className="text-lg font-semibold text-foreground mb-4">Backend Cost Breakdown (API Prediction)</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div><div className="text-xs text-muted-foreground">Auth</div><div className="text-lg font-bold text-foreground">${tcoResults.backendCosts.monthly.auth}</div></div>
                <div><div className="text-xs text-muted-foreground">Storage</div><div className="text-lg font-bold text-foreground">${typeof tcoResults.backendCosts.monthly.storage === 'object' ? tcoResults.backendCosts.monthly.storage.total : tcoResults.backendCosts.monthly.storage}</div></div>
                <div><div className="text-xs text-muted-foreground">API Requests</div><div className="text-lg font-bold text-foreground">${tcoResults.backendCosts.monthly.api_requests}</div></div>
                <div><div className="text-xs text-muted-foreground">Compute</div><div className="text-lg font-bold text-foreground">${tcoResults.backendCosts.monthly.compute}</div></div>
                <div><div className="text-xs text-muted-foreground">Database</div><div className="text-lg font-bold text-foreground">${tcoResults.backendCosts.monthly.database || 'N/A'}</div></div>
              </div>
              <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                <div className="text-sm text-muted-foreground">Per User: <span className="font-semibold text-foreground">${tcoResults.backendCosts.per_user_monthly}/month</span></div>
              </div>
            </div>
          )}
        </>
      )}
      {showCostPlan && costPlan && (
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" />AI-Generated Cost Optimization Plan</h3>
              <p className="text-sm text-muted-foreground mt-1">Generated {new Date(costPlan.generatedAt).toLocaleString()}</p>
            </div>
            <button onClick={() => setShowCostPlan(false)} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5 text-foreground" /></button>
          </div>
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
              <div className="text-xs text-muted-foreground mt-1">${costPlan.optimizedState.savings.annual.toFixed(0)}/year</div>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">AI Recommendations</h4>
            <div className="space-y-3">
              {costPlan.aiRecommendations.map((rec, idx) => (
                <div key={idx} className={`border rounded-lg p-4 ${rec.priority === 'critical' ? 'border-red-500/30 bg-red-500/5' : rec.priority === 'high' ? 'border-orange-500/30 bg-orange-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${rec.priority === 'critical' ? 'bg-red-500/20 text-red-500' : rec.priority === 'high' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>{rec.priority.toUpperCase()}</span>
                        <span className="text-sm font-medium text-foreground">{rec.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                      <p className="text-sm text-foreground font-medium">{rec.recommendation}</p>
                    </div>
                    <div className="text-right ml-4"><div className="text-lg font-bold text-green-500">${rec.estimatedSavings.toFixed(0)}</div><div className="text-xs text-muted-foreground">savings</div></div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t border-[hsl(var(--border))]">
                    <span>Effort: {rec.implementationEffort}</span><span>•</span><span>Timeframe: {rec.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">Cost Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-muted/30 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Platform</div><div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.platform.toFixed(0)}</div></div>
              <div className="bg-muted/30 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Backend</div><div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.backend.toFixed(0)}</div></div>
              <div className="bg-muted/30 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Vendors</div><div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.vendors.toFixed(0)}</div></div>
              <div className="bg-muted/30 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Audits</div><div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.audits.toFixed(0)}</div></div>
              <div className="bg-muted/30 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Onboarding</div><div className="text-lg font-bold text-foreground">${costPlan.currentState.breakdown.onboarding.toFixed(0)}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDataImport = () => <div className="bg-card rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Data Import Center</h2><p className="text-muted-foreground mt-2">Connect your security tools and import data seamlessly</p></div>;
  const renderVendors = () => <div className="bg-card rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Vendor Risk Management</h2><p className="text-muted-foreground mt-2">Track third-party compliance and inherited controls</p></div>;

  // Build the shared context value consumed by all extracted view components.
  // This single object gives every view access to all state and handlers
  // without requiring prop drilling.
  const ctx = {
    // Recovered state/helpers restored from pre-split monolith
    ALERT_ACTION_ICONS, CONNECTION_TYPES, FRAMEWORK_GLOSSARY, FRAMEWORK_LIBRARY, PRODUCT_LIBRARY, accessByArea, alertDetailError, alertDetailLoading, alertFirstDetectedTs, alertLastUpdatedTs, alertPlaybooksMap, allUsers, apiAttributedCount, apiIntegrations, auditComments, auditIntegrationEvents, auditReadiness, auditWorkflowExecutions, auditorMode, complianceMapping, controlCoverageFilter, controlDataSourceFilter, controlGuidanceError, controlGuidanceLoading, controlOwnerFilter, controlPatternsLoading, controlPlaybooks, controlSharedFilter, controlStatusFilter, coveragePercent, coveragePieStyle, coverageSegments, dashboardSectionsExpanded, evidenceCollectionLoading, evidenceCollectionStatus, evidenceFreshness, expandedArea, expandedFrameworks, expandedSections, exportAutomationPlan, externalCoverageCount, fetchControlSegments, filteredControls, filtersAreDefault, formatRelative, frameworks, generateAutomationPlan, generateProjectTimeline, iamSectionsExpanded, integrationMapSvgRef, loadDemoCSCAData, mappedPermissions, matrixFilterCategory, matrixFilterCoverageType, matrixFilterOwnership, mdrProviders, noApiControlsCount, ownershipPieStyle, ownershipSegments, playbookExecutionProgress, playbooksLoading, preAuditReadiness, priorityGuidance, roles, selectedAlertRef, selectedControl, selectedEvidenceForReview, selectedSecurityEvent, selectedUserForDetails, selectedUserForTracking, setAccessByArea, setAlertDetailError, setAlertDetailLoading, setAlertPlaybooksMap, setAllUsers, setApiIntegrations, setAuditComments, setAuditIntegrationEvents, setAuditReadiness, setAuditWorkflowExecutions, setAuditorMode, setComplianceMapping, setControlCoverageFilter, setControlDataSourceFilter, setControlGuidanceError, setControlGuidanceLoading, setControlOwnerFilter, setControlPatternsLoading, setControlPlaybooks, setControlSharedFilter, setControlStatusFilter, setDashboardSectionsExpanded, setEvidenceCollectionLoading, setEvidenceCollectionStatus, setEvidenceFreshness, setExpandedArea, setExpandedFrameworks, setExpandedSections, setIamSectionsExpanded, setMappedPermissions, setMatrixFilterCategory, setMatrixFilterCoverageType, setMatrixFilterOwnership, setMdrProviders, setPlaybookExecutionProgress, setPlaybooksLoading, setPreAuditReadiness, setRoles, setSelectedControl, setSelectedEvidenceForReview, setSelectedSecurityEvent, setSelectedUserForDetails, setSelectedUserForTracking, setShowControlDetail, setShowSecurityEventModal, setThreadNotification, setVendorAccessProfiles, sharedControlsCount, sharedPercent, showControlDetail, showSecurityEventModal, soloControlsCount, statusColors, threadNotification, totalControls, unassignedControlsCount, vendorAccessProfiles,
    // Navigation
    activeView, setActiveView,
    // Core data
    controls, setControls, assets, setAssets, users, setUsers,
    complianceScores, currentUser, setCurrentUser,
    backendConnected, apiError,
    // Framework / search
    selectedFramework, setSelectedFramework,
    searchTerm, setSearchTerm,
    // Compliance & recommendations
    recommendations, selectedRecommendationIndex, setSelectedRecommendationIndex,
    automationPlan, setAutomationPlan,
    showPlanGenerator, setShowPlanGenerator,
    frameworkGlossarySearch, setFrameworkGlossarySearch,
    showProductLibrary, setShowProductLibrary,
    productLibrarySection, setProductLibrarySection,
    // Integration map
    integrationMapSelectedFeature, setIntegrationMapSelectedFeature,
    integrationMapHighlightedPath, setIntegrationMapHighlightedPath,
    integrationMapFilterStrength, setIntegrationMapFilterStrength,
    integrationMapSelectedConnection, setIntegrationMapSelectedConnection,
    integrationMapDimensions, setIntegrationMapDimensions,
    // Entities / vendors
    entities, setEntities, currentEntity, setCurrentEntity,
    vendors, setVendors, userRole, setUserRole,
    // Timeline / automation
    projectTimeline, automationActivityLog, setAutomationActivityLog,
    showAutomationWalkthrough, setShowAutomationWalkthrough,
    selectedAutomationControl, setSelectedAutomationControl,
    automationChecklistState, setAutomationChecklistState,
    automationEvidenceNotes, setAutomationEvidenceNotes,
    automationEvidenceLink, setAutomationEvidenceLink,
    // Learning / playbooks
    learnedPatterns, setLearnedPatterns,
    autoPlaybooks, setAutoPlaybooks,
    dataValueSummary, learningAnalysisRunning,
    selectedPlaybook, setSelectedPlaybook,
    // Command palette
    showCommandPalette, setShowCommandPalette,
    commandQuery, setCommandQuery,
    commandHighlightIndex, setCommandHighlightIndex,
    // Control filters
    selectedVendorFilter, setSelectedVendorFilter,
    selectedPriorityFilter, setSelectedPriorityFilter,
    selectedPriceFilter, setSelectedPriceFilter,
    // Responsibility matrix
    responsibilityMatrix,
    // Bulk edit
    bulkEditMode, setBulkEditMode,
    selectedControls, setSelectedControls,
    bulkOwner, setBulkOwner, bulkStatus, setBulkStatus,
    // Upload
    showUpload, setShowUpload, uploadType, setUploadType,
    // Audits
    audits, setAudits, selectedAudit, setSelectedAudit,
    certifications, setCertifications,
    auditFindings, setAuditFindings,
    auditEvidence, setAuditEvidence,
    showAuditCreate, setShowAuditCreate,
    showFindingCreate, setShowFindingCreate,
    showEvidenceUpload, setShowEvidenceUpload,
    auditFormData, setAuditFormData,
    findingFormData, setFindingFormData,
    evidenceFormData, setEvidenceFormData,
    // IAM
    userPermissions, setUserPermissions,
    permissionAuditLog, setPermissionAuditLog,
    showPermissionGrant, setShowPermissionGrant,
    showVendorProfile, setShowVendorProfile,
    permissionFormData, setPermissionFormData,
    vendorProfileFormData, setVendorProfileFormData,
    selectedUserForPermissions, setSelectedUserForPermissions,
    userAccessSummary, setUserAccessSummary,
    userAccessLogs, setUserAccessLogs,
    accessTrackingLoading, setAccessTrackingLoading,
    // CSCA
    securityEvents, setSecurityEvents,
    complianceAlerts, setComplianceAlerts,
    complianceScoreHistory, setComplianceScoreHistory,
    securityComplianceCorrelation, setSecurityComplianceCorrelation,
    detectedPatterns, setDetectedPatterns,
    patternAlerts, setPatternAlerts,
    patternTrends, patternDetectionRunning,
    frameworkGrowth, setFrameworkGrowth,
    realtimeScores, setRealtimeScores,
    // Alerts
    actionableAlerts, setActionableAlerts,
    selectedAlert, setSelectedAlert,
    alertRemediationForm, setAlertRemediationForm,
    showAlertRemediation, setShowAlertRemediation,
    alertSaving, setAlertSaving,
    matchingPlaybooks, setMatchingPlaybooks,
    // Data flow
    dataFlowNodes, setDataFlowNodes,
    dataFlowEdges, setDataFlowEdges,
    dataFlowStats, dataFlowFilters, setDataFlowFilters: updateDataFlowFilter,
    dataFlowNodeTypes, dataFlowSensitivities, dataFlowOwners,
    dataFlowError, dataFlowLoading,
    dataFlowGraphData, dataFlowGraphRef, dataFlowHasZoomedRef,
    dataFlowNodeMap, dataFlowEdgeMap,
    dataFlowAudit, dataFlowAccessSummary,
    showDataFlowNodeModal, showDataFlowEdgeModal,
    dataFlowNodeForm, setDataFlowNodeForm,
    dataFlowEdgeForm, setDataFlowEdgeForm,
    editingDataFlowNode, editingDataFlowEdge,
    integrationEventsSummary, showIntegrationEvents, setShowIntegrationEvents,
    dataFlowNodeSignals, dataFlowNodeAlerts,
    canEditDataFlow, canManageDataFlow,
    selectedDataFlowItem, setSelectedDataFlowItem,
    dataFlowLayoutSaving, dataFlowLayoutResetting, dataFlowLayoutLastSaved,
    // TCO
    tcoInputs, setTcoInputs: updateTCOInput, tcoResults,
    // Partner
    partnerGrowthHistory,
    // Computed
    stats, coverage, matrixEntriesById, controlsWithResponsibility,
    ownerOptions, dataSourceOptions, statusOptions,
    alertRiskSnapshot, alertTimeline, alertQuickActions,
    filteredDataFlowNodes, filteredDataFlowEdges,
    goldenThreadData,

    // Control filters & matrix
    controlOwnerFilter, setControlOwnerFilter,
    controlSharedFilter, setControlSharedFilter,
    controlDataSourceFilter, setControlDataSourceFilter,
    controlCoverageFilter, setControlCoverageFilter,
    controlStatusFilter, setControlStatusFilter,
    matrixFilterCategory, setMatrixFilterCategory,
    matrixFilterCoverageType, setMatrixFilterCoverageType,
    matrixFilterOwnership, setMatrixFilterOwnership,
    expandedFrameworks, setExpandedFrameworks,
    expandedSections, setExpandedSections,
    selectedEntity, setSelectedEntity,
    // API / MDR integrations
    apiIntegrations, setApiIntegrations,
    mdrProviders, setMdrProviders,
    // Control detail
    selectedControl, setSelectedControl,
    showControlDetail, setShowControlDetail,
    controlGuidanceLoading, setControlGuidanceLoading,
    controlGuidanceError, setControlGuidanceError,
    controlPlaybooks, setControlPlaybooks,
    controlPatternsLoading, setControlPatternsLoading,
    threadNotification, setThreadNotification,
    // Import wizard
    importHistory, setImportHistory,
    importProgress, setImportProgress,
    showImportWizard, setShowImportWizard,
    importStep, setImportStep,
    selectedIntegration, setSelectedIntegration,
    parsedData, setParsedData,
    // RBAC
    roles, setRoles,
    showRoleEditor, setShowRoleEditor,
    selectedRole, setSelectedRole,
    // TCO
    costPlan, setCostPlan,
    showCostPlan, setShowCostPlan,
    // Audit detail
    auditReadiness, setAuditReadiness,
    auditIntegrationEvents, setAuditIntegrationEvents,
    auditWorkflowExecutions, setAuditWorkflowExecutions,
    preAuditReadiness, setPreAuditReadiness,
    auditorMode, setAuditorMode,
    selectedEvidenceForReview, setSelectedEvidenceForReview,
    auditComments, setAuditComments,
    evidenceCollectionStatus, setEvidenceCollectionStatus,
    evidenceCollectionLoading, setEvidenceCollectionLoading,
    evidenceFreshness, setEvidenceFreshness,
    autoLinkingStatus, setAutoLinkingStatus,
    // Dashboard
    dashboardSectionsExpanded, setDashboardSectionsExpanded,
    // IAM extended
    vendorAccessProfiles, setVendorAccessProfiles,
    allUsers, setAllUsers,
    selectedUserForTracking, setSelectedUserForTracking,
    mappedPermissions, setMappedPermissions,
    complianceMapping, setComplianceMapping,
    sessionToken, setSessionToken,
    accessByArea, setAccessByArea,
    selectedAreaForDetails, setSelectedAreaForDetails,
    selectedUserForDetails, setSelectedUserForDetails,
    expandedArea, setExpandedArea,
    iamSectionsExpanded, setIamSectionsExpanded,
    // CSCA extended
    selectedSecurityEvent, setSelectedSecurityEvent,
    showSecurityEventModal, setShowSecurityEventModal,
    // Alerts extended
    alertsSocketConnected,
    selectedAlertDetail, setSelectedAlertDetail,
    alertDetailLoading, setAlertDetailLoading,
    alertDetailError, setAlertDetailError,
    playbooksLoading, setPlaybooksLoading,
    selectedPlaybookForAlert, setSelectedPlaybookForAlert,
    playbookExecutionProgress, setPlaybookExecutionProgress,
    alertPlaybooksMap, setAlertPlaybooksMap,
    // Handlers
    updateControl, handleFileUpload, importFrameworkControls,
    importAssetData, autoMapToolData, toggleControlSelection, applyBulkEdit,
    generateReport, exportJSON, exportResponsibilityMatrix,
    handleNavigateControl, openControlDetail, closeControlDetail,
    navigateToFeature,
    controlGuidance, controlPatterns,
    triggerEvidenceCollection, triggerAutoLinking,
    loadAudits, loadCertifications, loadAuditDetails,
    handleUploadEvidence, handleSubmitEvidence,
    handleCreateAudit, handleCreateFinding,
    loadIAMData, loadAccessTrackingData, loadUserAccessDetails,
    loadCSCAData, runPatternDetection, loadFrameworkGrowth,
    loadActionableAlerts, runDriftCheckCommand,
    openAlertRemediation, closeAlertRemediation,
    handleRemediationFieldChange, handleControlUpdateChange,
    applyControlUpdates, recordRemediationProgress, handleRemediationSubmit,
    executePlaybook, fetchAlertDetails, fetchMatchingPlaybooks,
    loadDataFlowGraph, refreshDataFlowGraph, loadDataFlowAudit,
    openDataFlowNodeModal, openDataFlowEdgeModal,
    closeDataFlowNodeModal, closeDataFlowEdgeModal,
    handleSubmitDataFlowNode, handleSubmitDataFlowEdge,
    handleDeleteDataFlowNode, handleDeleteDataFlowEdge,
    persistDataFlowNodePosition, resetDataFlowLayout,
    handleDataFlowCheckboxChange,
    loadIntegrationEventsSummary,
    buildAutomationSteps, openAutomationWalkthrough, closeAutomationWalkthrough,
    toggleAutomationChecklistStep, handleAutomationProgressSave,
    loadLearningData, runLearningAnalysis, approvePlaybook,
    generateDemoLearningData,
    filteredCommands, commandPaletteItems, handleCommandSelect,
    calculatePartnerGrade, getGradeFromScore, exportQBRReport,
    getViewName, getViewIcon,
    integrationMapNodePositions, integrationMapFilteredRelationships,
    mobileMenuOpen, setMobileMenuOpen,
    sidebarCollapsed, setSidebarCollapsed,
  };

  return (
    <ComplianceProvider value={ctx}>
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

              {/* Main Navigation - Desktop (tiered) */}
              <nav className="hidden md:flex items-center gap-1 ml-8">
                {navMode === 'guided' ? (
                  /* ── Guided nav: ≤5 items for Tier 1-2 users ─────────────── */
                  <>
                    {[
                      { view: 'home',    label: 'Home',       icon: Home },
                      { view: 'wizard',  label: 'Assessment', icon: Sparkles },
                      { view: 'trust',   label: 'Trust Score',icon: Shield },
                      { view: 'tco',     label: 'Roadmap',    icon: BarChart3 },
                      { view: 'integrations', label: 'Connect Tools', icon: Zap },
                    ].map(item => (
                      <button
                        key={item.view}
                        onClick={() => setActiveView(item.view)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeView === item.view ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                    {/* Advanced toggle */}
                    <button
                      onClick={() => setNavModeAndPersist('advanced')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-dashed border-muted ml-1"
                    >
                      <ChevronDown className="w-3.5 h-3.5" /> Advanced
                    </button>
                  </>
                ) : (
                  /* ── Advanced nav: full nav for Tier 3-4 ─────────────────── */
                  <>
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
                    ['vendors', 'import', 'client-intake', 'consulting'].includes(activeView)
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
                    <DropdownMenuItem onClick={() => setActiveView('consulting')}>
                      <Award className="w-4 h-4 mr-2" />
                      <span>Consulting Portal</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveView('client-intake')}>
                      <Upload className="w-4 h-4 mr-2" />
                      <span>Client Intake Portal</span>
                    </DropdownMenuItem>
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

                {/* Trust Portal */}
                <button
                  onClick={() => setActiveView('trust')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                    activeView === 'trust'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Trust Portal</span>
                </button>

                {/* AI Assessment Wizard — prominent nav entry */}
                <button
                  onClick={() => setActiveView('wizard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                    activeView === 'wizard'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Assessment</span>
                </button>
                    {/* Guided mode toggle */}
                    <button
                      onClick={() => setNavModeAndPersist('guided')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-dashed border-muted ml-1"
                    >
                      <ChevronUp className="w-3.5 h-3.5" /> Guided
                    </button>
                  </>
                )}
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
              {/* AI Assessment Wizard */}
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                title="AI Intake Assessment Wizard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors border border-primary/30 bg-primary/5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Framework Wizard</span>
              </button>
              {/* Logout */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-[hsl(var(--border))]"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
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

              {/* Mobile: Trust Portal */}
              <button
                type="button"
                onClick={() => { setActiveView('trust'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold bg-green-500/10 text-green-600 border border-green-500/20 transition-colors hover:bg-green-500/20"
              >
                <Shield className="w-4 h-4" />
                <span>🛡️ Tenant Trust Portal</span>
              </button>
              {/* Mobile: AI Assessment */}
              <button
                type="button"
                onClick={() => { setActiveView('wizard'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold bg-primary/10 text-primary border border-primary/20 transition-colors hover:bg-primary/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>✨ AI Assessment Wizard</span>
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

              {activeView === 'dashboard' ? <DashboardView /> :
               activeView === 'audits' ? <AuditsView /> :
               activeView === 'framework_glossary' ? <FrameworkGlossary /> :
               activeView === 'iam' ? <IamView /> :
               activeView === 'client-intake' ? (
                 <ClientIntakePortalView currentUser={currentUser} />
               ) :
               activeView === 'consulting' ? (
                 <ConsultingPortalView currentUser={currentUser} />
               ) :
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
                   integrationEventsSummary={integrationEventsSummary}
                   showIntegrationEvents={showIntegrationEvents}
                   onToggleIntegrationEvents={() => setShowIntegrationEvents(!showIntegrationEvents)}
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
               activeView === 'csca' ? <CscaView /> :
               activeView === 'tco' ? renderTCOCalculator() :
               activeView === 'automation' ? <AutomationView /> :
               activeView === 'import' ? renderDataImport() :
               activeView === 'vendors' ? renderVendors() :
               activeView === 'timeline' ? <TimelineView /> :
               activeView === 'responsibility' ? <ResponsibilityView /> :
                activeView === 'integration-map' ? <IntegrationMapView /> :
               activeView === 'home' ? <HomeView currentUser={currentUser} setActiveView={setActiveView} controls={controls} /> :
               activeView === 'wizard' ? <WizardShowcasePage /> :
               activeView === 'trust' ? <TrustShowcasePage /> :
               activeView === 'integrations' ? <IntegrationsView /> :
               <ControlsView />}
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

    {/* AI Framework Intake Wizard */}
    {showWizard && (
      <IntakeWizardView onClose={() => setShowWizard(false)} />
    )}
    </ComplianceProvider>
  );
};

export default ComplianceMVP;
