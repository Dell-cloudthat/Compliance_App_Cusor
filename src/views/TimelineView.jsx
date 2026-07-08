/**
 * renderTimeline
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

export default function TimelineView() {
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
  } = ctx;

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

  return renderTimeline();
}
