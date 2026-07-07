/**
 * renderAutomationPlan
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

export default function AutomationView() {
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
    newAudit, setNewAudit, newFinding, setNewFinding, newEvidence, setNewEvidence,
    auditError, setAuditError, auditLoading, setAuditLoading,
    userPermissions, setUserPermissions, permissionLogs, setPermissionLogs,
    showPermissionGrant, setShowPermissionGrant, showVendorProfile, setShowVendorProfile,
    newPermission, setNewPermission, newVendorProfile, setNewVendorProfile,
    iamError, setIamError, selectedUser, setSelectedUser,
    userAccessDetails, setUserAccessDetails, accessTrackingLoading, setAccessTrackingLoading,
    securityEvents, setSecurityEvents, complianceAlerts, setComplianceAlerts,
    complianceScoreHistory, setComplianceScoreHistory,
    securityComplianceCorrelation, setSecurityComplianceCorrelation,
    cscaLoading, setCscaLoading, cscaError, setCscaError,
    detectedPatterns, setDetectedPatterns, patternAlerts, setPatternAlerts,
    frameworkGrowthData, setFrameworkGrowthData, realtimeScores, setRealtimeScores,
    actionableAlerts, setActionableAlerts, selectedAlert, setSelectedAlert,
    alertRemediation, setAlertRemediation, showAlertRemediation, setShowAlertRemediation,
    alertRemediationLoading, setAlertRemediationLoading, matchingPlaybooks, setMatchingPlaybooks,
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
    navigateToFeature, selectedControlDetail, setSelectedControlDetail,
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
  } = ctx;

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

  return renderAutomationPlan();
}
