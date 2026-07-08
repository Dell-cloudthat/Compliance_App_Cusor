/**
 * renderCSCA
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

export default function CscaView() {
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
    loadDemoCSCAData, setSelectedSecurityEvent, setShowSecurityEventModal,
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
    selectedSecurityEvent,
    showSecurityEventModal,
    alertsSocketConnected,
    selectedAlertDetail, setSelectedAlertDetail,
    alertDetailLoading, setAlertDetailLoading,
    alertDetailError, setAlertDetailError,
    playbooksLoading, setPlaybooksLoading,
    selectedPlaybookForAlert, setSelectedPlaybookForAlert,
    playbookExecutionProgress, setPlaybookExecutionProgress,
    alertPlaybooksMap, setAlertPlaybooksMap,
  } = ctx;

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

  return renderCSCA();
}
