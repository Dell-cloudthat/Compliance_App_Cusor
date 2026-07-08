/**
 * renderDashboard + renderCircularStat
 *
 * Extracted from ComplianceMVP.jsx.
 * Uses useCompliance() to access all shared state and handlers.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Download, Upload, Plus, Search, Filter, CheckCircle, AlertCircle, Clock,
  Server, Shield, Edit2, Save, X, Users, TrendingUp, Database, Award, Menu,
  ChevronDown, ChevronRight, LayoutDashboard, ArrowUpRight, ArrowDownRight,
  ArrowRight, Activity, Target, ExternalLink, Info, Home, FileText, BarChart3,
  Settings, Sparkles, Gauge, FileCheck, ClipboardList, AlertTriangle, CheckSquare,
  Calendar, UserCheck, Link2, TrendingDown, XCircle, ActivitySquare, Network,
  BookOpen, ListTree, HelpCircle, Loader2, Check, RefreshCw, Zap
} from 'lucide-react';
import api from '../services/api';
import { useCompliance } from '../context/ComplianceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';

export default function DashboardView() {
  const ctx = useCompliance();
  const {
    controls, setControls, assets, setAssets, users, setUsers,
    complianceScores, currentUser, setCurrentUser, backendConnected, apiError,
    selectedFramework, setSelectedFramework, searchTerm, setSearchTerm,
    recommendations, selectedRecommendationIndex, setSelectedRecommendationIndex,
    automationPlan, setAutomationPlan, showPlanGenerator, setShowPlanGenerator,
    frameworkGlossarySearch, setFrameworkGlossarySearch,
    showProductLibrary, setShowProductLibrary, productLibrarySection, setProductLibrarySection,
    integrationMapSelectedFeature, setIntegrationMapSelectedFeature,
    integrationMapHighlightedPath, setIntegrationMapHighlightedPath,
    integrationMapFilterStrength, setIntegrationMapFilterStrength,
    integrationMapSelectedConnection, setIntegrationMapSelectedConnection,
    integrationMapDimensions, setIntegrationMapDimensions,
    entities, setEntities, currentEntity, setCurrentEntity,
    vendors, setVendors, userRole, setUserRole,
    projectTimeline, automationActivityLog, setAutomationActivityLog,
    showAutomationWalkthrough, setShowAutomationWalkthrough,
    selectedAutomationControl, setSelectedAutomationControl,
    automationChecklistState, setAutomationChecklistState,
    automationEvidenceNotes, setAutomationEvidenceNotes,
    automationEvidenceLink, setAutomationEvidenceLink,
    learnedPatterns, setLearnedPatterns, autoPlaybooks, setAutoPlaybooks,
    dataValueSummary, learningAnalysisRunning, selectedPlaybook, setSelectedPlaybook,
    showCommandPalette, setShowCommandPalette, commandQuery, setCommandQuery,
    commandHighlightIndex, setCommandHighlightIndex,
    selectedVendorFilter, setSelectedVendorFilter,
    selectedPriorityFilter, setSelectedPriorityFilter,
    selectedPriceFilter, setSelectedPriceFilter,
    responsibilityMatrix, bulkEditMode, setBulkEditMode,
    selectedControls, setSelectedControls, bulkOwner, setBulkOwner, bulkStatus, setBulkStatus,
    showUpload, setShowUpload, uploadType, setUploadType,
    audits, setAudits, selectedAudit, setSelectedAudit,
    certifications, setCertifications, auditFindings, setAuditFindings,
    auditEvidence, setAuditEvidence, showAuditCreate, setShowAuditCreate,
    showFindingCreate, setShowFindingCreate, showEvidenceUpload, setShowEvidenceUpload,
    auditFormData, setAuditFormData,
    findingFormData, setFindingFormData,
    evidenceFormData, setEvidenceFormData,
    userPermissions, setUserPermissions,
    permissionAuditLog, setPermissionAuditLog,
    showPermissionGrant, setShowPermissionGrant, showVendorProfile, setShowVendorProfile,
    permissionFormData, setPermissionFormData,
    vendorProfileFormData, setVendorProfileFormData,
    selectedUserForPermissions, setSelectedUserForPermissions,
    userAccessSummary, setUserAccessSummary,
    userAccessLogs, setUserAccessLogs,
    accessTrackingLoading, setAccessTrackingLoading,
    securityEvents, setSecurityEvents, complianceAlerts, setComplianceAlerts,
    complianceScoreHistory, setComplianceScoreHistory,
    securityComplianceCorrelation, setSecurityComplianceCorrelation,
    detectedPatterns, setDetectedPatterns, patternAlerts, setPatternAlerts,
    patternTrends, patternDetectionRunning,
    frameworkGrowth, setFrameworkGrowth, realtimeScores, setRealtimeScores,
    actionableAlerts, setActionableAlerts, selectedAlert, setSelectedAlert,
    alertRemediationForm, setAlertRemediationForm,
    showAlertRemediation, setShowAlertRemediation,
    alertSaving, setAlertSaving, matchingPlaybooks, setMatchingPlaybooks,
    dataFlowNodes, setDataFlowNodes, dataFlowEdges, setDataFlowEdges,
    dataFlowStats, dataFlowFilters, setDataFlowFilters,
    dataFlowNodeTypes, dataFlowSensitivities, dataFlowOwners,
    dataFlowError, dataFlowLoading, dataFlowGraphData, dataFlowGraphRef,
    dataFlowHasZoomedRef, dataFlowNodeMap, dataFlowEdgeMap,
    dataFlowAudit, dataFlowAccessSummary, showDataFlowNodeModal, showDataFlowEdgeModal,
    dataFlowNodeForm, setDataFlowNodeForm, dataFlowEdgeForm, setDataFlowEdgeForm,
    editingDataFlowNode, editingDataFlowEdge,
    integrationEventsSummary, showIntegrationEvents, setShowIntegrationEvents,
    dataFlowNodeSignals, dataFlowNodeAlerts, canEditDataFlow, canManageDataFlow,
    selectedDataFlowItem, setSelectedDataFlowItem,
    dataFlowLayoutSaving, dataFlowLayoutResetting, dataFlowLayoutLastSaved,
    tcoInputs, setTcoInputs, tcoResults, partnerGrowthHistory,
    stats, coverage, matrixEntriesById, controlsWithResponsibility,
    ownerOptions, dataSourceOptions, statusOptions,
    alertRiskSnapshot, alertTimeline, alertQuickActions,
    filteredDataFlowNodes, filteredDataFlowEdges, goldenThreadData,
    updateControl, handleFileUpload, importFrameworkControls, importAssetData,
    autoMapToolData, toggleControlSelection, applyBulkEdit,
    generateReport, exportJSON, exportResponsibilityMatrix,
    handleNavigateControl, openControlDetail, closeControlDetail,
    navigateToFeature,
    controlGuidance, controlPatterns, triggerEvidenceCollection, triggerAutoLinking,
    loadAudits, loadCertifications, loadAuditDetails,
    handleUploadEvidence, handleSubmitEvidence, handleCreateAudit, handleCreateFinding,
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
    persistDataFlowNodePosition, resetDataFlowLayout, handleDataFlowCheckboxChange,
    loadIntegrationEventsSummary, buildAutomationSteps,
    openAutomationWalkthrough, closeAutomationWalkthrough,
    toggleAutomationChecklistStep, handleAutomationProgressSave,
    loadLearningData, runLearningAnalysis, approvePlaybook, generateDemoLearningData,
    filteredCommands, commandPaletteItems, handleCommandSelect,
    calculatePartnerGrade, getGradeFromScore, exportQBRReport,
    getViewName, getViewIcon,
    integrationMapNodePositions, integrationMapFilteredRelationships,
    mobileMenuOpen, setMobileMenuOpen, sidebarCollapsed, setSidebarCollapsed,
    FRAMEWORK_LIBRARY, alertPlaybooksMap, dashboardSectionsExpanded, formatRelative, selectedAlertRef, setActiveView, setDashboardSectionsExpanded,
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
    apiIntegrations, setApiIntegrations,
    mdrProviders, setMdrProviders,
    selectedControl, setSelectedControl,
    showControlDetail, setShowControlDetail,
    controlGuidanceLoading, setControlGuidanceLoading,
    controlGuidanceError, setControlGuidanceError,
    controlPlaybooks, setControlPlaybooks,
    controlPatternsLoading, setControlPatternsLoading,
    threadNotification, setThreadNotification,
    importHistory, setImportHistory,
    importProgress, setImportProgress,
    showImportWizard, setShowImportWizard,
    importStep, setImportStep,
    selectedIntegration, setSelectedIntegration,
    parsedData, setParsedData,
    roles, setRoles,
    showRoleEditor, setShowRoleEditor,
    selectedRole, setSelectedRole,
    costPlan, setCostPlan,
    showCostPlan, setShowCostPlan,
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
    selectedSecurityEvent, setSelectedSecurityEvent,
    showSecurityEventModal, setShowSecurityEventModal,
    alertsSocketConnected,
    selectedAlertDetail, setSelectedAlertDetail,
    alertDetailLoading, setAlertDetailLoading,
    alertDetailError, setAlertDetailError,
    playbooksLoading, setPlaybooksLoading,
    selectedPlaybookForAlert, setSelectedPlaybookForAlert,
    playbookExecutionProgress, setPlaybookExecutionProgress, setAlertPlaybooksMap,
  } = ctx;

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
  <div className="space-y-4">
    {/* Header - Quick Overview */}
    <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Compliance Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time compliance intelligence • {gradeData.currentQuarter} {new Date().getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-3xl font-bold ${
              gradeData.overallScore >= 80 ? 'text-green-500' :
              gradeData.overallScore >= 70 ? 'text-blue-500' :
              gradeData.overallScore >= 60 ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {gradeData.grade}
            </div>
            <div className="text-sm text-muted-foreground">{gradeData.overallScore}%</div>
          </div>
          <button
            onClick={exportQBRReport}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export QBR
          </button>
        </div>
      </div>
    </div>

    {/* Overview Section - Collapsible */}
    <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
      <button
        onClick={() => setDashboardSectionsExpanded(prev => ({ ...prev, overview: !prev.overview }))}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          Overview & Growth Metrics
        </h3>
        {dashboardSectionsExpanded.overview ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {dashboardSectionsExpanded.overview && (
        <div className="p-6 pt-0 space-y-6">
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
              <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-md font-semibold text-foreground">Framework Oversight</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Track each framework's health, drift risk, and remediation urgency.
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                      <ChevronDown className="w-4 h-4" />
                      <span>View All Frameworks</span>
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
          </div>
        </div>
      )}
    </div>

    {/* Frameworks Section - Collapsible */}
    <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
      <button
        onClick={() => setDashboardSectionsExpanded(prev => ({ ...prev, frameworks: !prev.frameworks }))}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Framework Health & Metrics
          <span className="text-sm font-normal text-muted-foreground">
            ({Object.keys(FRAMEWORK_LIBRARY).length} frameworks)
          </span>
        </h3>
        {dashboardSectionsExpanded.frameworks ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {dashboardSectionsExpanded.frameworks && (
        <div className="p-6 pt-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-card px-4 py-3 text-sm font-medium hover:bg-muted transition-colors">
              <span>Select Framework to View Details</span>
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full max-w-md max-h-[500px] overflow-y-auto">
              <DropdownMenuLabel>Framework Details</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(FRAMEWORK_LIBRARY).map(([frameworkKey, frameworkMeta]) => {
                const growth = frameworkGrowth[frameworkKey];
                const complianceScore = complianceScores[frameworkKey];
                const needsAttention = !!(growth?.drift_detected || (growth?.gaps_count ?? 0) > 0 || (complianceScore ?? 100) < 80);
                return (
                  <DropdownMenuItem
                    key={frameworkKey}
                    className="py-3 px-3 focus:bg-primary/10"
                    onClick={() => {
                      setSelectedFramework(frameworkKey);
                      setActiveView('controls');
                    }}
                  >
                    <div className="w-full space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{frameworkMeta.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Score: {complianceScore != null ? `${complianceScore}%` : '—'} · 
                            Coverage: {growth?.control_coverage?.toFixed?.(1) ?? '—'}% · 
                            Gaps: {growth?.gaps_count ?? '—'}
                          </div>
                        </div>
                        {needsAttention ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                            Needs attention
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                            On track
                          </span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>

    {/* Actionable Alerts - Collapsible */}
    {actionableAlerts.length > 0 && (
      <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
        <button
          onClick={() => setDashboardSectionsExpanded(prev => ({ ...prev, alerts: !prev.alerts }))}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
        >
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Actionable Alerts
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
              {actionableAlerts.length}
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (backendConnected && currentUser.id) {
                  try {
                    await api.checkComplianceDrift(currentUser.id);
                    await loadActionableAlerts();
                  } catch (error) {
                    console.error('Error checking drift:', error);
                  }
                }
              }}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-medium"
            >
              Check Drift
            </button>
            {dashboardSectionsExpanded.alerts ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </button>
        {dashboardSectionsExpanded.alerts && (
          <div className="p-6 pt-0">
          
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
      </div>
    )}

    {/* Recent Activity - Collapsible */}
    {recentActivity.length > 0 && (
      <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
        <button
          onClick={() => setDashboardSectionsExpanded(prev => ({ ...prev, activity: !prev.activity }))}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
        >
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
            <span className="text-sm font-normal text-muted-foreground">
              ({recentActivity.length} items)
            </span>
          </h3>
          {dashboardSectionsExpanded.activity ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
        {dashboardSectionsExpanded.activity && (
          <div className="p-4 pt-0">
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map((entry, idx) => {
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
      </div>
    )}

    {/* Historical Growth Chart - Collapsible */}
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
          <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
            <button
              onClick={() => setDashboardSectionsExpanded(prev => ({ ...prev, growth: !prev.growth }))}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Historical Growth (Last 90 Days)
              </h3>
              {dashboardSectionsExpanded.growth ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            {dashboardSectionsExpanded.growth && (
              <div className="p-6 pt-0">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
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
            )}
          </div>
        );
      })()}

    {/* KPI Circular Metrics - Collapsible */}
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
        <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
          <button
            onClick={() => setDashboardSectionsExpanded(prev => ({ ...prev, kpis: !prev.kpis }))}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Key Performance Indicators
            </h3>
            {dashboardSectionsExpanded.kpis ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          {dashboardSectionsExpanded.kpis && (
            <div className="p-6 pt-0">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            </div>
          )}
        </div>
      );
    })()}

    {/* AI Gap Analysis Section - Collapsible */}
    <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
      <button
        onClick={() => setDashboardSectionsExpanded(prev => ({ ...prev, gapAnalysis: !prev.gapAnalysis }))}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          AI-Powered Gap Analysis
          {(() => {
            const criticalGaps = controls.filter(c => 
              (c.status === 'Not Implemented' || c.status === 'Non-Compliant' || c.status === 'Partial') 
              && c.priority === 'Critical'
            ).length;
            return criticalGaps > 0 ? (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                {criticalGaps} critical
              </span>
            ) : null;
          })()}
        </h3>
        {dashboardSectionsExpanded.gapAnalysis ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {dashboardSectionsExpanded.gapAnalysis && (
        <div className="p-6 pt-0">
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
      )}
    </div>

    {/* AI Recommendations - Collapsible */}
    {recommendations.length > 0 && (() => {
      const visibleRecommendations = recommendations.slice(0, 5);
      const activeIndex = Math.min(selectedRecommendationIndex, visibleRecommendations.length - 1);
      const activeRecommendation = visibleRecommendations[activeIndex] || visibleRecommendations[0];

      return (
        <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
          <button
            onClick={() => setDashboardSectionsExpanded(prev => ({ ...prev, recommendations: !prev.recommendations }))}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI-Powered Recommendations
              <span className="text-sm font-normal text-muted-foreground">
                ({recommendations.length} scenarios)
              </span>
            </h3>
            {dashboardSectionsExpanded.recommendations ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          {dashboardSectionsExpanded.recommendations && (
            <div className="p-6 pt-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
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
          )}
        </div>
      );
    })()}
  </div>
  );
};

  return renderDashboard();
}
