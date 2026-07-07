/**
 * renderResponsibilityMatrix
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

export default function ResponsibilityView() {
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

  return renderResponsibilityMatrix();
}
