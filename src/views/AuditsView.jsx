/**
 * renderAudits + renderAuditDetail + evidence/create modals
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

export default function AuditsView() {
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
    selectedSecurityEvent, setSelectedSecurityEvent,
    showSecurityEventModal, setShowSecurityEventModal,
    alertsSocketConnected,
    selectedAlertDetail, setSelectedAlertDetail,
    alertDetailLoading, setAlertDetailLoading,
    alertDetailError, setAlertDetailError,
    playbooksLoading, setPlaybooksLoading,
    selectedPlaybookForAlert, setSelectedPlaybookForAlert,
    playbookExecutionProgress, setPlaybookExecutionProgress,
    alertPlaybooksMap, setAlertPlaybooksMap,
  } = ctx;

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
      {/* Automated Report Generation - NEW ACCELERATION FEATURE */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              Audit Report Generation
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Generate comprehensive audit reports in seconds. Export evidence packages and executive summaries.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={async () => {
              try {
                let reportData;
                if (backendConnected && currentUser.id) {
                  reportData = await api.generateFullAuditReport(currentUser.id, selectedAudit.id);
                } else {
                  // Demo mode
                  reportData = {
                    report_type: "full_audit_report",
                    audit_id: selectedAudit.id,
                    generated_at: new Date().toISOString(),
                    audit_info: {
                      audit_name: selectedAudit.audit_name,
                      framework: selectedAudit.framework,
                      audit_type: selectedAudit.audit_type,
                      status: selectedAudit.status
                    },
                    executive_summary: {
                      readiness_score: selectedAudit.readiness_score || 0,
                      overall_assessment: "Good",
                      key_metrics: {
                        total_controls: selectedAudit.scope?.length || 0,
                        total_findings: auditFindings.length,
                        total_evidence: auditEvidence.length
                      }
                    },
                    findings_summary: {
                      total: auditFindings.length,
                      findings: auditFindings
                    },
                    evidence_inventory: {
                      total_evidence: auditEvidence.length,
                      evidence_list: auditEvidence
                    }
                  };
                }
                
                const reportJson = JSON.stringify(reportData, null, 2);
                const blob = new Blob([reportJson], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit-report-${selectedAudit.audit_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                alert('Full audit report generated and downloaded!');
              } catch (error) {
                console.error('Error generating report:', error);
                alert('Error generating report. Please try again.');
              }
            }}
            className="p-4 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-left"
          >
            <FileText className="w-6 h-6 text-primary mb-2" />
            <div className="font-semibold text-foreground mb-1">Full Audit Report</div>
            <div className="text-xs text-muted-foreground">Complete audit documentation with all findings, evidence, and recommendations</div>
          </button>
          <button
            onClick={async () => {
              try {
                let packageData;
                if (backendConnected && currentUser.id) {
                  packageData = await api.generateEvidencePackage(currentUser.id, selectedAudit.id);
                } else {
                  // Demo mode
                  packageData = {
                    audit_name: selectedAudit.audit_name,
                    framework: selectedAudit.framework,
                    evidence: auditEvidence.map(e => ({
                      control_id: e.control_id,
                      evidence_name: e.evidence_name,
                      evidence_type: e.evidence_type,
                      validated: e.validated,
                      uploaded_at: e.uploaded_at
                    }))
                  };
                }
                
                // Generate CSV
                const csv = [
                  ['Control ID', 'Evidence Name', 'Type', 'Validated', 'Uploaded', 'Expiration'],
                  ...(packageData.evidence || packageData.evidence_catalog || []).map(e => [
                    e.control_id || '',
                    e.evidence_name || '',
                    e.evidence_type || '',
                    e.validated ? 'Yes' : 'No',
                    e.uploaded_at ? new Date(e.uploaded_at).toLocaleDateString() : '',
                    e.expiration_date ? new Date(e.expiration_date).toLocaleDateString() : ''
                  ])
                ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `evidence-package-${selectedAudit.audit_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                alert('Evidence package exported successfully!');
              } catch (error) {
                console.error('Error generating evidence package:', error);
                alert('Error generating evidence package. Please try again.');
              }
            }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-left"
          >
            <Download className="w-6 h-6 text-green-500 mb-2" />
            <div className="font-semibold text-foreground mb-1">Evidence Package</div>
            <div className="text-xs text-muted-foreground">CSV export of all evidence with validation status for audit submission</div>
          </button>
          <button
            onClick={async () => {
              try {
                let summaryData;
                if (backendConnected && currentUser.id) {
                  summaryData = await api.generateExecutiveSummary(currentUser.id, selectedAudit.id);
                } else {
                  // Demo mode
                  summaryData = {
                    audit_overview: {
                      audit_name: selectedAudit.audit_name,
                      framework: selectedAudit.framework,
                      status: selectedAudit.status
                    },
                    key_metrics: {
                      readiness_score: selectedAudit.readiness_score || 0,
                      total_findings: auditFindings.length,
                      critical_findings: auditFindings.filter(f => f.severity === 'critical').length,
                      total_evidence: auditEvidence.length
                    },
                    recommendations: [
                      "Continue maintaining current compliance posture",
                      "Address any open findings promptly"
                    ]
                  };
                }
                
                // Generate formatted text summary
                const summaryText = `
AUDIT EXECUTIVE SUMMARY
======================

Audit: ${summaryData.audit_overview?.audit_name || selectedAudit.audit_name}
Framework: ${summaryData.audit_overview?.framework || selectedAudit.framework}
Status: ${summaryData.audit_overview?.status || selectedAudit.status}
Readiness Score: ${summaryData.key_metrics?.readiness_score || 0}%
Assessment Level: ${summaryData.key_metrics?.assessment_level || 'N/A'}

KEY METRICS
-----------
Total Controls: ${summaryData.key_metrics?.total_controls || selectedAudit.scope?.length || 0}
Controls with Evidence: ${summaryData.key_metrics?.controls_with_evidence || 0}
Evidence Coverage: ${summaryData.key_metrics?.evidence_coverage || 0}%

Findings:
- Total: ${summaryData.key_metrics?.total_findings || auditFindings.length}
- Critical: ${summaryData.key_metrics?.critical_findings || 0}
- High: ${summaryData.key_metrics?.high_findings || 0}
- Resolved: ${summaryData.key_metrics?.resolved_findings || 0}

Evidence:
- Total: ${summaryData.key_metrics?.total_evidence || auditEvidence.length}
- Validated: ${summaryData.key_metrics?.validated_evidence || 0}

${summaryData.top_findings && summaryData.top_findings.length > 0 ? `
TOP FINDINGS
------------
${summaryData.top_findings.slice(0, 5).map((f, i) => `${i + 1}. ${f.severity.toUpperCase()}: ${f.description.substring(0, 100)}...`).join('\n')}
` : ''}

RECOMMENDATIONS
---------------
${(summaryData.recommendations || []).map((r, i) => `${i + 1}. ${r}`).join('\n')}

${summaryData.next_steps && summaryData.next_steps.length > 0 ? `
NEXT STEPS
----------
${summaryData.next_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
` : ''}

Generated: ${new Date(summaryData.generated_at || new Date().toISOString()).toLocaleString()}
                `.trim();
                
                const blob = new Blob([summaryText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `executive-summary-${selectedAudit.audit_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                alert('Executive summary generated successfully!');
              } catch (error) {
                console.error('Error generating executive summary:', error);
                alert('Error generating executive summary. Please try again.');
              }
            }}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
          >
            <BarChart3 className="w-6 h-6 text-purple-500 mb-2" />
            <div className="font-semibold text-foreground mb-1">Executive Summary</div>
            <div className="text-xs text-muted-foreground">High-level summary with key metrics and recommendations for leadership</div>
          </button>
        </div>
      </div>

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

      {/* Automated Report Generation - NEW ACCELERATION FEATURE */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              Audit Report Generation
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Generate comprehensive audit reports in seconds. Export evidence packages and executive summaries.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={async () => {
              try {
                let reportData;
                if (backendConnected && currentUser.id) {
                  reportData = await api.generateFullAuditReport(currentUser.id, selectedAudit.id);
                } else {
                  // Demo mode
                  reportData = {
                    report_type: "full_audit_report",
                    audit_id: selectedAudit.id,
                    generated_at: new Date().toISOString(),
                    audit_info: {
                      audit_name: selectedAudit.audit_name,
                      framework: selectedAudit.framework,
                      audit_type: selectedAudit.audit_type,
                      status: selectedAudit.status
                    },
                    executive_summary: {
                      readiness_score: selectedAudit.readiness_score || 0,
                      overall_assessment: "Good",
                      key_metrics: {
                        total_controls: selectedAudit.scope?.length || 0,
                        total_findings: auditFindings.length,
                        total_evidence: auditEvidence.length
                      }
                    },
                    findings_summary: {
                      total: auditFindings.length,
                      findings: auditFindings
                    },
                    evidence_inventory: {
                      total_evidence: auditEvidence.length,
                      evidence_list: auditEvidence
                    }
                  };
                }
                
                const reportJson = JSON.stringify(reportData, null, 2);
                const blob = new Blob([reportJson], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit-report-${selectedAudit.audit_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                alert('Full audit report generated and downloaded!');
              } catch (error) {
                console.error('Error generating report:', error);
                alert('Error generating report. Please try again.');
              }
            }}
            className="p-4 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors text-left"
          >
            <FileText className="w-6 h-6 text-primary mb-2" />
            <div className="font-semibold text-foreground mb-1">Full Audit Report</div>
            <div className="text-xs text-muted-foreground">Complete audit documentation with all findings, evidence, and recommendations</div>
          </button>
          <button
            onClick={async () => {
              try {
                let packageData;
                if (backendConnected && currentUser.id) {
                  packageData = await api.generateEvidencePackage(currentUser.id, selectedAudit.id);
                } else {
                  // Demo mode
                  packageData = {
                    audit_name: selectedAudit.audit_name,
                    framework: selectedAudit.framework,
                    evidence: auditEvidence.map(e => ({
                      control_id: e.control_id,
                      evidence_name: e.evidence_name,
                      evidence_type: e.evidence_type,
                      validated: e.validated,
                      uploaded_at: e.uploaded_at
                    }))
                  };
                }
                
                // Generate CSV
                const csv = [
                  ['Control ID', 'Evidence Name', 'Type', 'Validated', 'Uploaded', 'Expiration'],
                  ...(packageData.evidence || packageData.evidence_catalog || []).map(e => [
                    e.control_id || '',
                    e.evidence_name || '',
                    e.evidence_type || '',
                    e.validated ? 'Yes' : 'No',
                    e.uploaded_at ? new Date(e.uploaded_at).toLocaleDateString() : '',
                    e.expiration_date ? new Date(e.expiration_date).toLocaleDateString() : ''
                  ])
                ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `evidence-package-${selectedAudit.audit_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                alert('Evidence package exported successfully!');
              } catch (error) {
                console.error('Error generating evidence package:', error);
                alert('Error generating evidence package. Please try again.');
              }
            }}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors text-left"
          >
            <Download className="w-6 h-6 text-green-500 mb-2" />
            <div className="font-semibold text-foreground mb-1">Evidence Package</div>
            <div className="text-xs text-muted-foreground">CSV export of all evidence with validation status for audit submission</div>
          </button>
          <button
            onClick={async () => {
              try {
                let summaryData;
                if (backendConnected && currentUser.id) {
                  summaryData = await api.generateExecutiveSummary(currentUser.id, selectedAudit.id);
                } else {
                  // Demo mode
                  summaryData = {
                    audit_overview: {
                      audit_name: selectedAudit.audit_name,
                      framework: selectedAudit.framework,
                      status: selectedAudit.status
                    },
                    key_metrics: {
                      readiness_score: selectedAudit.readiness_score || 0,
                      total_findings: auditFindings.length,
                      critical_findings: auditFindings.filter(f => f.severity === 'critical').length,
                      total_evidence: auditEvidence.length
                    },
                    recommendations: [
                      "Continue maintaining current compliance posture",
                      "Address any open findings promptly"
                    ]
                  };
                }
                
                // Generate formatted text summary
                const summaryText = `
AUDIT EXECUTIVE SUMMARY
======================

Audit: ${summaryData.audit_overview?.audit_name || selectedAudit.audit_name}
Framework: ${summaryData.audit_overview?.framework || selectedAudit.framework}
Status: ${summaryData.audit_overview?.status || selectedAudit.status}
Readiness Score: ${summaryData.key_metrics?.readiness_score || 0}%
Assessment Level: ${summaryData.key_metrics?.assessment_level || 'N/A'}

KEY METRICS
-----------
Total Controls: ${summaryData.key_metrics?.total_controls || selectedAudit.scope?.length || 0}
Controls with Evidence: ${summaryData.key_metrics?.controls_with_evidence || 0}
Evidence Coverage: ${summaryData.key_metrics?.evidence_coverage || 0}%

Findings:
- Total: ${summaryData.key_metrics?.total_findings || auditFindings.length}
- Critical: ${summaryData.key_metrics?.critical_findings || 0}
- High: ${summaryData.key_metrics?.high_findings || 0}
- Resolved: ${summaryData.key_metrics?.resolved_findings || 0}

Evidence:
- Total: ${summaryData.key_metrics?.total_evidence || auditEvidence.length}
- Validated: ${summaryData.key_metrics?.validated_evidence || 0}

${summaryData.top_findings && summaryData.top_findings.length > 0 ? `
TOP FINDINGS
------------
${summaryData.top_findings.slice(0, 5).map((f, i) => `${i + 1}. ${f.severity.toUpperCase()}: ${f.description.substring(0, 100)}...`).join('\n')}
` : ''}

RECOMMENDATIONS
---------------
${(summaryData.recommendations || []).map((r, i) => `${i + 1}. ${r}`).join('\n')}

${summaryData.next_steps && summaryData.next_steps.length > 0 ? `
NEXT STEPS
----------
${summaryData.next_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
` : ''}

Generated: ${new Date(summaryData.generated_at || new Date().toISOString()).toLocaleString()}
                `.trim();
                
                const blob = new Blob([summaryText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `executive-summary-${selectedAudit.audit_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                alert('Executive summary generated successfully!');
              } catch (error) {
                console.error('Error generating executive summary:', error);
                alert('Error generating executive summary. Please try again.');
              }
            }}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
          >
            <BarChart3 className="w-6 h-6 text-purple-500 mb-2" />
            <div className="font-semibold text-foreground mb-1">Executive Summary</div>
            <div className="text-xs text-muted-foreground">High-level summary with key metrics and recommendations for leadership</div>
          </button>
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

      {/* Automated Evidence Collection */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
        <div className="p-6 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Automated Evidence Collection
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically collect evidence from integrated systems (EDR, Identity Providers, Cloud Platforms, etc.)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerEvidenceCollection()}
                disabled={evidenceCollectionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {evidenceCollectionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Collecting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Collect All Evidence
                  </>
                )}
              </button>
              <button
                onClick={triggerAutoLinking}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted font-medium text-sm"
              >
                <Link2 className="w-4 h-4" />
                Auto-Link Evidence
              </button>
            </div>
          </div>
          
          {/* Collection Status */}
          {evidenceCollectionStatus && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground mb-1">Collection Complete</div>
                  <div className="text-sm text-muted-foreground">
                    Collected {evidenceCollectionStatus.evidence_collected} evidence items for {evidenceCollectionStatus.controls_processed} controls
                  </div>
                </div>
                <button
                  onClick={() => setEvidenceCollectionStatus(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Evidence Freshness */}
          {evidenceFreshness && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Total Evidence</div>
                <div className="text-lg font-bold text-foreground">{evidenceFreshness.total_evidence}</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Fresh (&lt;30 days)</div>
                <div className="text-lg font-bold text-green-500">{evidenceFreshness.fresh_evidence}</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Stale (30-90 days)</div>
                <div className="text-lg font-bold text-yellow-500">{evidenceFreshness.stale_evidence}</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Expired/Expiring</div>
                <div className="text-lg font-bold text-red-500">
                  {evidenceFreshness.expired_evidence + evidenceFreshness.expiring_soon}
                </div>
              </div>
            </div>
          )}
          
          {/* Expiration Warnings */}
          {evidenceFreshness && evidenceFreshness.expiration_warnings && evidenceFreshness.expiration_warnings.length > 0 && (
            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="font-semibold text-yellow-500 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Expiration Warnings ({evidenceFreshness.expiration_warnings.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {evidenceFreshness.expiration_warnings.slice(0, 5).map((warning, idx) => (
                  <div key={idx} className="text-sm text-foreground">
                    Control {warning.control_id}: {warning.expired_days_ago 
                      ? `Expired ${warning.expired_days_ago} days ago`
                      : `Expires in ${warning.expires_in_days} days`}
                  </div>
                ))}
                {evidenceFreshness.expiration_warnings.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    +{evidenceFreshness.expiration_warnings.length - 5} more warnings
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Integration Events Summary */}
      {auditIntegrationEvents && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Integration Events Flow
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Events from integrated systems mapped to this audit's controls
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Events</div>
              <div className="text-2xl font-bold text-foreground">{auditIntegrationEvents.total_events?.toLocaleString() || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
            </div>
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Integrations</div>
              <div className="text-2xl font-bold text-foreground">{Object.keys(auditIntegrationEvents.by_integration || {}).length}</div>
              <div className="text-xs text-muted-foreground mt-1">Active sources</div>
            </div>
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Event Types</div>
              <div className="text-2xl font-bold text-foreground">{Object.keys(auditIntegrationEvents.by_type || {}).length}</div>
              <div className="text-xs text-muted-foreground mt-1">Different types</div>
            </div>
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Frameworks</div>
              <div className="text-2xl font-bold text-foreground">{Object.keys(auditIntegrationEvents.by_framework || {}).length}</div>
              <div className="text-xs text-muted-foreground mt-1">Mapped to</div>
            </div>
          </div>
          {Object.keys(auditIntegrationEvents.by_integration || {}).length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-500/20">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Top Integration Sources</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(auditIntegrationEvents.by_integration || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([name, count]) => (
                    <div
                      key={name}
                      className="px-3 py-1.5 bg-card border border-[hsl(var(--border))] rounded-lg text-sm"
                    >
                      <span className="font-medium text-foreground">{name}</span>
                      <span className="text-muted-foreground ml-2">{count.toLocaleString()} events</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workflow Execution Metrics */}
      {auditWorkflowExecutions && auditWorkflowExecutions.length > 0 && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                Automated Workflow Executions
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Automated processes that collected evidence and remediated gaps for this audit
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Executions</div>
              <div className="text-2xl font-bold text-foreground">{auditWorkflowExecutions.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Completed workflows</div>
            </div>
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Evidence Collection</div>
              <div className="text-2xl font-bold text-green-500">
                {auditWorkflowExecutions.filter(w => w.workflow_type === 'evidence_collection').length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Automated collections</div>
            </div>
            <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Gap Remediation</div>
              <div className="text-2xl font-bold text-emerald-500">
                {auditWorkflowExecutions.filter(w => w.workflow_type === 'gap_remediation').length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Auto-remediated</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-500/20">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Recent Executions</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {auditWorkflowExecutions.slice(0, 5).map((execution) => (
                <div
                  key={execution.id}
                  className="bg-card border border-[hsl(var(--border))] rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-foreground">{execution.workflow_name || execution.workflow_type}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {execution.completed_at ? new Date(execution.completed_at).toLocaleString() : 'Recently completed'}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    execution.status === 'completed' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {execution.status}
                  </span>
                </div>
              ))}
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

      {/* Modals */}
      {showFindingCreate && renderFindingCreateModal()}
      {showEvidenceUpload && renderEvidenceUploadModal()}
    </div>
  );
};

  return renderAudits();
}
