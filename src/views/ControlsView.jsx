/**
 * renderControls
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
import { useCompliance } from '../context/ComplianceContext';

export default function ControlsView() {
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
    ALERT_ACTION_ICONS, FRAMEWORK_LIBRARY, alertDetailError, alertDetailLoading, alertFirstDetectedTs, alertLastUpdatedTs, apiAttributedCount, apiIntegrations, controlCoverageFilter, controlDataSourceFilter, controlGuidanceError, controlGuidanceLoading, controlOwnerFilter, controlPatternsLoading, controlPlaybooks, controlSharedFilter, controlStatusFilter, coveragePercent, coveragePieStyle, coverageSegments, externalCoverageCount, fetchControlSegments, filteredControls, filtersAreDefault, formatRelative, frameworks, mdrProviders, noApiControlsCount, ownershipPieStyle, ownershipSegments, playbookExecutionProgress, playbooksLoading, priorityGuidance, selectedControl, setActiveView, setControlCoverageFilter, setControlDataSourceFilter, setControlOwnerFilter, setControlSharedFilter, setControlStatusFilter, setSelectedControl, setThreadNotification, sharedControlsCount, sharedPercent, showControlDetail, soloControlsCount, statusColors, threadNotification, totalControls, unassignedControlsCount,
    // Control filters & matrix
    matrixFilterCategory, setMatrixFilterCategory,
    matrixFilterCoverageType, setMatrixFilterCoverageType,
    matrixFilterOwnership, setMatrixFilterOwnership,
    expandedFrameworks, setExpandedFrameworks,
    expandedSections, setExpandedSections,
    selectedEntity, setSelectedEntity, setApiIntegrations, setMdrProviders, setShowControlDetail, setControlGuidanceLoading, setControlGuidanceError, setControlPlaybooks, setControlPatternsLoading,
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
    dashboardSectionsExpanded, setDashboardSectionsExpanded,
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
    selectedAlertDetail, setSelectedAlertDetail, setAlertDetailLoading, setAlertDetailError, setPlaybooksLoading,
    selectedPlaybookForAlert, setSelectedPlaybookForAlert, setPlaybookExecutionProgress,
    alertPlaybooksMap, setAlertPlaybooksMap,
  } = ctx;

  const {
    showControlsFilters, setShowControlsFilters,
    showControlsBreakdown, setShowControlsBreakdown,
    showControlsMoreDetails, setShowControlsMoreDetails,
  } = ctx;

  // alertLinkedControls: safe fallback — selectedAlert.linked_controls may not be
  // populated by the backend, so this prevents a ReferenceError while the section
  // gracefully renders empty rather than crashing.
  const alertLinkedControls = selectedAlert?.linked_controls || [];

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
            {(() => {
              const activeFilterCount = [
                controlOwnerFilter !== "ALL",
                controlSharedFilter !== "ALL",
                controlDataSourceFilter !== "ALL",
                controlStatusFilter !== "ALL",
                controlCoverageFilter !== "ALL",
              ].filter(Boolean).length;
              return (
                <button
                  type="button"
                  onClick={() => setShowControlsFilters(!showControlsFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    activeFilterCount > 0
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-card border-[hsl(var(--border))] text-foreground hover:border-primary"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showControlsFilters ? "rotate-180" : ""}`} />
                </button>
              );
            })()}
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

        {showControlsFilters && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-[hsl(var(--border))]">
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
        )}
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
                <th className="text-left py-3 px-4 font-semibold text-foreground">Owner</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Coverage</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredControls.map((control) => {
                const matrix = control.responsibility;
                const frameworkList = control.frameworks || [];
                const frameworkNames = frameworkList.map((fw) => {
                  const frameworkKey = fw.split(":")[0];
                  return FRAMEWORK_LIBRARY[frameworkKey]?.name || frameworkKey;
                });

                return (
                  <tr
                    key={control.id}
                    className="border-b border-[hsl(var(--border))] hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => openControlDetail(control)}
                  >
                    <td className="py-3 px-4 align-top">
                      <div className="font-medium text-foreground">{control.id}</div>
                      <div className="text-sm text-foreground mt-1">{control.control_name}</div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      {frameworkNames.length > 0 ? (
                        <span
                          className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded font-medium"
                          title={frameworkNames.join(", ")}
                        >
                          {frameworkNames.length === 1
                            ? frameworkNames[0]
                            : `${frameworkNames.length} frameworks`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="text-sm text-foreground">
                        {control.responsible_party || "Unassigned"}
                      </div>
                      {matrix.shared_responsibility && (
                        <div className="text-xs text-muted-foreground mt-0.5">Shared responsibility</div>
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
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusColors[control.status]}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {control.status}
                      </span>
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


      <div className="bg-card border border-[hsl(var(--border))] rounded-lg">
        <button
          type="button"
          onClick={() => setShowControlsBreakdown(!showControlsBreakdown)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground">Show breakdown</h3>
            <p className="text-xs text-muted-foreground">Ownership and coverage charts, click a segment to filter the table above</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showControlsBreakdown ? "rotate-180" : ""}`} />
        </button>
        {showControlsBreakdown && (
          <div className="px-6 pb-6">
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
          </div>
        )}
      </div>

      <div className="bg-card border border-[hsl(var(--border))] rounded-lg">
        <button
          type="button"
          onClick={() => setShowControlsMoreDetails(!showControlsMoreDetails)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground">More details</h3>
            <p className="text-xs text-muted-foreground">Connected API integrations and MDR / vendor coverage</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showControlsMoreDetails ? "rotate-180" : ""}`} />
        </button>
        {showControlsMoreDetails && (
          <div className="px-6 pb-6">
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
          </div>
        )}
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
            setThreadNotification({ type: 'export', message: 'No Golden Thread data available to export', timestamp: Date.now() });
            return;
          }
          const rows = [];
          const headers = ['Item Type', 'Name', 'Context', 'Owner / Scope', 'Status', 'Last Updated'];
          const formatDateIso = (value) => { if (!value) return ''; try { return new Date(value).toISOString(); } catch { return String(value); } };
          if (Array.isArray(thread.alerts)) { thread.alerts.forEach((entry) => { rows.push(['Alert', entry.title || entry.id, entry.description || '', entry.framework || '', `${(entry.severity || '').toUpperCase()} / ${(entry.status || 'open').toUpperCase()}`, formatDateIso(entry.updatedAt || entry.createdAt)]); }); }
          if (Array.isArray(thread.nodes)) { thread.nodes.forEach((entry) => { rows.push(['System', entry.name || entry.id, entry.type || '', entry.owner || '', entry.status || '', formatDateIso(entry.lastSync || entry.changeAt)]); }); }
          if (Array.isArray(thread.edges)) { thread.edges.forEach((edge) => { rows.push(['Data Flow', `${edge.sourceName} -> ${edge.targetName}`, edge.flowType || '', edge.transport || '', edge.status || '', formatDateIso(edge.lastValidatedAt)]); }); }
          const evidenceSegments = Array.isArray(selectedControl.api_data_segments) ? selectedControl.api_data_segments : [];
          evidenceSegments.forEach((segment) => { rows.push(['Evidence Segment', segment.api_name || segment.control_id, Array.isArray(segment.data_segment) ? segment.data_segment.join('; ') : Object.keys(segment.data_segment || {}).join('; '), segment.responsible_party || '', segment.coverage_type || '', formatDateIso(segment.last_sync)]); });
          if (thread.responsibility) { rows.push(['Responsibility', selectedControl.id, (thread.responsibility.secondary_owners || []).join('; '), thread.responsibility.ownership || '', thread.responsibility.coverage_type || '', '']); }
          if (rows.length === 0) { setThreadNotification({ type: 'export', message: 'No Golden Thread data available to export', timestamp: Date.now() }); return; }
          const escapeCell = (value) => { if (value == null) return ''; const str = String(value).replace(/"/g, '""'); return /[",\n]/.test(str) ? `"${str}"` : str; };
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
          setThreadNotification({ type: 'export', message: 'Golden Thread exported to CSV', timestamp: Date.now() });
        };

        const severityBadge = (severity) => {
          const normalized = (severity || '').toLowerCase();
          const palette = { critical: 'bg-red-500/15 text-red-500 border border-red-500/30', high: 'bg-orange-500/15 text-orange-500 border border-orange-500/30', medium: 'bg-amber-500/15 text-amber-500 border border-amber-500/30', low: 'bg-sky-500/15 text-sky-500 border border-sky-500/30' };
          return palette[normalized] || 'bg-muted text-muted-foreground border border-muted/30';
        };

        const handleNavigateToArchitecture = (target, type = 'node') => {
          if (!target) return;
          closeControlDetail();
          setActiveView('architecture');
          setTimeout(() => { setSelectedDataFlowItem({ type, data: target }); }, 0);
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
                <div className="rounded-lg border border-primary/30 bg-primary/10 text-primary px-4 py-2 text-sm font-medium shadow">{threadNotification.message}</div>
              </div>
            )}
            <div className="bg-card border border-[hsl(var(--border))] rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-[hsl(var(--border))] px-6 py-5 flex flex-wrap items-start gap-4 justify-between">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Network className="w-3.5 h-3.5" />Golden Thread</span>
                  <h2 className="text-2xl font-semibold text-foreground">{selectedControl.id}: {selectedControl.control_name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedControl.category} • Priority: {selectedControl.priority}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={exportGoldenThread} className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"><Download className="w-4 h-4" />Export</button>
                  <button onClick={() => openAutomationWalkthrough(selectedControl, { name: 'Golden Thread' })} className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"><Sparkles className="w-4 h-4" />Playbook</button>
                  <button onClick={closeControlDetail} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[320px,1fr]">
                  <div className="space-y-5">
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-muted/20 p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">Control Snapshot</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedControl.description}</p>
                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div className="rounded-lg border border-[hsl(var(--border))] bg-card px-3 py-2"><div className="uppercase tracking-wide text-[10px]">Status</div><div className="mt-1 text-sm font-semibold text-foreground">{selectedControl.status}</div></div>
                        <div className="rounded-lg border border-[hsl(var(--border))] bg-card px-3 py-2"><div className="uppercase tracking-wide text-[10px]">Owner</div><div className="mt-1 text-sm font-semibold text-foreground">{selectedControl.responsible_party || 'Unassigned'}</div></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Control Status</label>
                        <select value={selectedControl.status} onChange={(e) => { updateControl(selectedControl.id, 'status', e.target.value); setSelectedControl({ ...selectedControl, status: e.target.value }); }} className={`w-full px-3 py-2 rounded-lg text-sm font-medium border ${statusColors[selectedControl.status]}`}>
                          <option>Partial</option><option>Implemented</option><option>Compliant</option><option>Non-Compliant</option><option>Vendor Managed</option>
                        </select>
                      </div>
                      <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsible Owner</label>
                        <input type="text" value={selectedControl.responsible_party} onChange={(e) => { updateControl(selectedControl.id, 'responsible_party', e.target.value); setSelectedControl({ ...selectedControl, responsible_party: e.target.value }); }} placeholder="Add owner or team" className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Golden Thread Metrics</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {threadStats.map((stat) => (
                          <div key={stat.key} className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-muted/20 px-3 py-2">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground"><span className="inline-flex items-center justify-center rounded-md bg-background px-1.5 py-1">{stat.icon}</span>{stat.label}</span>
                            <span className="text-base font-semibold text-foreground">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Framework Coverage</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedControl.frameworks.map((fw, idx) => (<span key={idx} className="px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium">{fw}</span>))}
                      </div>
                      {selectedControl.mapped_fields?.length > 0 && (
                        <div className="pt-2 border-t border-dashed border-[hsl(var(--border))]">
                          <p className="text-xs text-muted-foreground mb-2">Auto-mapped fields</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedControl.mapped_fields.map((field, idx) => (<span key={idx} className="text-[11px] px-2 py-1 bg-muted/40 rounded border border-[hsl(var(--border))] text-muted-foreground">{field}</span>))}
                          </div>
                        </div>
                      )}
                    </div>

                    {thread?.responsibility && (
                      <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Responsibility Matrix</h4>
                        <div className="text-xs text-muted-foreground space-y-2">
                          <div className="flex items-start justify-between gap-3"><span className="uppercase tracking-wide text-[10px] text-muted-foreground">Primary Owner</span><span className="text-sm font-medium text-foreground">{thread.responsibility.ownership}</span></div>
                          {thread.responsibility.secondary_owners?.length > 0 && (<div className="flex items-start justify-between gap-3"><span className="uppercase tracking-wide text-[10px] text-muted-foreground">Shared</span><span className="text-sm font-medium text-foreground text-right">{thread.responsibility.secondary_owners.join(', ')}</span></div>)}
                          <div className="flex items-start justify-between gap-3"><span className="uppercase tracking-wide text-[10px] text-muted-foreground">Coverage</span><span className="text-sm font-medium text-foreground">{thread.responsibility.coverage_type}</span></div>
                          {thread.responsibility.evidence_sources?.length > 0 && (<div className="flex items-start justify-between gap-3"><span className="uppercase tracking-wide text-[10px] text-muted-foreground">Evidence</span><span className="text-sm font-medium text-foreground text-right">{thread.responsibility.evidence_sources.join(', ')}</span></div>)}
                        </div>
                      </div>
                    )}

                    {thread?.automation?.length > 0 && (
                      <div className="rounded-xl border border-[hsl(var(--border))] bg-card p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Recent Automation Activity</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {thread.automation.map((entry) => (
                            <div key={entry.id} className="rounded-lg border border-[hsl(var(--border))] bg-muted/20 px-3 py-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground"><span className="font-medium text-foreground">{entry.phase || 'Automation Plan'}</span><span>{formatRelative(entry.timestamp)}</span></div>
                              {entry.notes && (<p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.notes}</p>)}
                              <div className="text-[11px] uppercase tracking-wide mt-1 text-muted-foreground">Status: {entry.status?.replace('_', ' ') || 'in progress'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div><h3 className="text-sm font-semibold text-foreground">AI Guidance</h3><p className="text-xs text-muted-foreground">Targeted remediation playbook generated from live telemetry.</p></div>
                        {controlGuidanceLoading && (<span className="text-xs text-muted-foreground">Loading…</span>)}
                      </div>
                      {controlGuidanceError ? (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{controlGuidanceError}</div>
                      ) : controlGuidance ? (
                        <div className="space-y-4">
                          {controlGuidance.summary && (<p className="text-sm text-muted-foreground leading-relaxed">{controlGuidance.summary}</p>)}
                          {Array.isArray(controlGuidance.recommended_actions) && controlGuidance.recommended_actions.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended actions</div>
                              <div className="space-y-2">{controlGuidance.recommended_actions.map((action, idx) => (<div key={`guidance-action-${idx}`} className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-3"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-foreground">{action.title}</div>{action.summary && (<p className="text-xs text-muted-foreground mt-1">{action.summary}</p>)}</div>{action.impact && (<span className="text-[11px] text-primary font-medium">{action.impact}</span>)}</div>{Array.isArray(action.suggested_steps) && action.suggested_steps.length > 0 && (<ul className="mt-2 text-xs text-muted-foreground space-y-1 list-disc list-inside">{action.suggested_steps.map((step, stepIdx) => (<li key={`guidance-action-${idx}-step-${stepIdx}`}>{step}</li>))}</ul>)}</div>))}</div>
                            </div>
                          )}
                          {Array.isArray(controlGuidance.automation_opportunities) && controlGuidance.automation_opportunities.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Automation opportunities</div>
                              <div className="space-y-2">{controlGuidance.automation_opportunities.map((item, idx) => (<div key={`guidance-automation-${idx}`} className="rounded-xl border border-emerald-400/40 bg-emerald-200/10 px-3 py-3"><div className="text-sm font-semibold text-foreground">{item.title}</div>{item.summary && (<p className="text-xs text-muted-foreground mt-1">{item.summary}</p>)}</div>))}</div>
                            </div>
                          )}
                        </div>
                      ) : !controlGuidanceLoading ? (
                        <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-muted/10 px-3 py-6 text-center text-xs text-muted-foreground">Guidance will appear once the control is synced with the backend.</div>
                      ) : null}
                    </div>

                    {(controlPlaybooks.length > 0 || controlPatterns.length > 0 || controlPatternsLoading) && (
                      <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /><h3 className="text-sm font-semibold text-foreground">Learned Patterns & Playbooks</h3></div>
                          {controlPatternsLoading ? (<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />) : (<span className="text-xs text-muted-foreground">{controlPatterns.length} patterns • {controlPlaybooks.length} playbooks</span>)}
                        </div>
                        {controlPatternsLoading ? (
                          <div className="text-xs text-muted-foreground text-center py-4">Loading learned patterns...</div>
                        ) : (
                          <>
                            {controlPatterns.length === 0 && controlPlaybooks.length === 0 && (
                              <div className="text-xs text-muted-foreground text-center py-4">No learned patterns yet. The system will learn from your remediation actions.</div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-card p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><h3 className="text-sm font-semibold text-foreground">Active Signals & Alerts</h3><p className="text-xs text-muted-foreground">Drift, remediation and pattern detections linked to this control.</p></div>
                        {thread?.alerts?.length > 0 && (<span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{thread.alerts.length} open</span>)}
                      </div>
                      {thread?.alerts?.length ? (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {thread.alerts.map((entry) => (
                            <button key={entry.id} onClick={() => handleOpenAlert(entry.alert)} className="w-full text-left rounded-xl border border-[hsl(var(--border))] bg-muted/20 px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${severityBadge(entry.severity)}`}><AlertCircle className="w-3 h-3" />{(entry.severity || 'medium').toUpperCase()}</span><span className="text-xs text-muted-foreground uppercase tracking-wide">{entry.status || 'open'}</span></div>
                                  <div className="text-sm font-semibold text-foreground line-clamp-2">{entry.title}</div>
                                </div>
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatRelative(entry.updatedAt || entry.createdAt)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">No active alerts tied to this control.</div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div><h3 className="text-sm font-semibold text-foreground">Connected Systems & Flows</h3><p className="text-xs text-muted-foreground">Nodes and pipelines contributing evidence for this control.</p></div>
                        <button onClick={() => { closeControlDetail(); setActiveView('architecture'); }} className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline">Open architecture <ChevronRight className="w-3 h-3" /></button>
                      </div>
                      {thread?.nodes?.length ? (
                        <div className="space-y-3">
                          {thread.nodes.map((entry) => (
                            <div key={entry.id} className="rounded-xl border border-[hsl(var(--border))] bg-muted/15 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div><div className="text-sm font-semibold text-foreground">{entry.name}</div><div className="text-xs text-muted-foreground">{entry.type?.toUpperCase()} • {entry.owner || 'Unassigned'}</div></div>
                                <button onClick={() => handleNavigateToArchitecture(entry.node, 'node')} className="text-xs text-primary hover:underline inline-flex items-center gap-1">View path <ChevronRight className="w-3 h-3" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">No systems mapped to this control yet. Link data flows from the architecture view.</div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-card p-5 space-y-4">
                      <div><h3 className="text-sm font-semibold text-foreground">Evidence & Data Attribution</h3><p className="text-xs text-muted-foreground">Linked API segments, evidence vault entries, and reference documentation.</p></div>
                      <ControlDataSegments control={selectedControl} backendConnected={backendConnected} fetchControlSegments={fetchControlSegments} />
                      {!selectedControl.nist_id && !selectedControl.iso_id && thread?.alerts?.length === 0 && !selectedControl.api_data_segments?.length && (
                        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">No evidence sources attached yet. Capture API segments or manual artifacts to complete the thread.</div>
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
          <div className="relative bg-card border border-[hsl(var(--border))] rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="border-b border-[hsl(var(--border))] px-6 py-4 flex items-start justify-between gap-4">
              <div><h3 className="text-xl font-semibold text-foreground">{selectedAlert.title}</h3><p className="text-sm text-muted-foreground mt-1">{selectedAlert.description}</p></div>
              <button onClick={closeAlertRemediation} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-foreground" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Alert Status</label>
                <select value={alertRemediationForm.status} onChange={(e) => handleRemediationFieldChange('status', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm">
                  <option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Remediation Notes</label>
                <textarea value={alertRemediationForm.notes} onChange={(e) => handleRemediationFieldChange('notes', e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm" placeholder="Document key findings, blockers, or context" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Actions Taken</label>
                <textarea value={alertRemediationForm.actionsTaken} onChange={(e) => handleRemediationFieldChange('actionsTaken', e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-card text-sm" placeholder="List actions (comma or newline separated)" />
              </div>
            </div>
            <div className="border-t border-[hsl(var(--border))] px-6 py-4 flex justify-end gap-3">
              <button onClick={closeAlertRemediation} className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm font-medium hover:bg-muted transition-colors" disabled={alertSaving}>Cancel</button>
              <button onClick={handleRemediationSubmit} disabled={alertSaving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                {alertSaving ? 'Saving...' : alertRemediationForm.status === 'resolved' ? 'Mark as Resolved' : 'Save Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  return renderControls();
}
