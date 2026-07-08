/**
 * renderIntegrationMap
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

export default function IntegrationMapView() {
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

const renderIntegrationMap = () => {
  const nodePositions = integrationMapNodePositions;
  const filteredRelationships = integrationMapFilteredRelationships;

  // Early return if no node positions calculated
  if (!nodePositions || Object.keys(nodePositions).length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />
            Feature Integration Map
          </h2>
          <p className="text-sm text-muted-foreground mt-2">Calculating node positions...</p>
        </div>
      </div>
    );
  }

  // Get relationships for a specific feature
  const getFeatureRelationships = (featureKey) => {
    return filteredRelationships.filter(rel => 
      rel.from === featureKey || rel.to === featureKey
    );
  };

  // Find path between two features
  const findPath = (fromKey, toKey) => {
    const visited = new Set();
    const queue = [[fromKey]];
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (current === toKey) return path;
      if (visited.has(current)) continue;
      visited.add(current);
      
      filteredRelationships
        .filter(rel => rel.from === current || rel.to === current)
        .forEach(rel => {
          const next = rel.from === current ? rel.to : rel.from;
          if (!visited.has(next)) {
            queue.push([...path, next]);
          }
        });
    }
    return null;
  };

  // Handle feature click
  const handleFeatureClick = (featureKey) => {
    if (integrationMapSelectedFeature === featureKey) {
      setIntegrationMapSelectedFeature(null);
      setIntegrationMapHighlightedPath([]);
      setIntegrationMapSelectedConnection(null); // Clear connection when deselecting feature
    } else {
      setIntegrationMapSelectedFeature(featureKey);
      const rels = getFeatureRelationships(featureKey);
      setIntegrationMapHighlightedPath(rels.map(rel => rel.from === featureKey ? rel.to : rel.from));
      // Don't clear selected connection - allow both to be visible
    }
  };

  // Handle feature navigation
  const handleNavigateToFeature = (featureKey) => {
    navigateToFeature(featureKey);
  };

  const strengthColors = {
    strong: 'hsl(142 76% 36%)',
    medium: 'hsl(38 92% 50%)',
    weak: 'hsl(0 0% 63%)'
  };

  const strengthWidths = {
    strong: 3,
    medium: 2,
    weak: 1
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className={"text-2xl font-bold text-foreground flex items-center gap-2"}>
              <Network className="w-6 h-6 text-primary" />
              Feature Integration Map
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize how platform features connect and work together
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filter by strength:</span>
              <select
                value={integrationMapFilterStrength}
                onChange={(e) => setIntegrationMapFilterStrength(e.target.value)}
                className="px-3 py-1.5 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground"
              >
                <option value="all">All Connections</option>
                <option value="strong">Strong Only</option>
                <option value="medium">Medium & Strong</option>
                <option value="weak">Include Weak</option>
              </select>
            </div>
            {integrationMapSelectedFeature && (
              <button
                onClick={() => handleNavigateToFeature(integrationMapSelectedFeature)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Go to Feature
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-green-500 rounded"></div>
            <span className="text-muted-foreground">Strong Connection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-yellow-500 rounded"></div>
            <span className="text-muted-foreground">Medium Connection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-gray-500 rounded"></div>
            <span className="text-muted-foreground">Weak Connection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary"></div>
            <span className="text-muted-foreground">Selected Feature</span>
          </div>
        </div>
      </div>

      {/* SVG Graph */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6 overflow-auto">
        <svg
          ref={integrationMapSvgRef}
          width="100%"
          height="800"
          viewBox={`0 0 ${integrationMapDimensions.width || 1200} ${integrationMapDimensions.height || 800}`}
          className="w-full"
          style={{ minHeight: '800px', display: 'block' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Render connections/edges */}
          {filteredRelationships.map((rel, idx) => {
            const fromPos = nodePositions[rel.from];
            const toPos = nodePositions[rel.to];
            if (!fromPos || !toPos) return null;

            const isHighlighted = integrationMapSelectedFeature && 
              (rel.from === integrationMapSelectedFeature || rel.to === integrationMapSelectedFeature);
            const isSelected = integrationMapSelectedConnection && 
              integrationMapSelectedConnection.from === rel.from && 
              integrationMapSelectedConnection.to === rel.to;
            
            const connectionType = CONNECTION_TYPES[rel.type] || { description: rel.type, icon: '🔗', color: strengthColors.medium };
            const opacity = isSelected ? 1 : isHighlighted ? 0.7 : 0.25;
            const strokeColor = isSelected ? connectionType.color : (strengthColors[rel.strength] || strengthColors.medium);
            const strokeWidth = isSelected ? (strengthWidths[rel.strength] || 2) + 2 : (strengthWidths[rel.strength] || 2);
            
            // Calculate midpoint for connection label
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;

            return (
              <g key={`edge-${idx}`}>
                {/* Invisible wider line for easier clicking */}
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke="transparent"
                  strokeWidth="20"
                  opacity="0"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setIntegrationMapSelectedConnection(rel)}
                />
                {/* Visible connection line */}
                <line
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  markerEnd="url(#arrowhead)"
                  className={isSelected ? "animate-pulse" : ""}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  onClick={() => setIntegrationMapSelectedConnection(rel)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.strokeWidth = String(strokeWidth + 1);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.opacity = String(opacity);
                      e.currentTarget.style.strokeWidth = String(strokeWidth);
                    }
                  }}
                />
                {/* Connection type icon at midpoint (show when highlighted or selected) */}
                {(isHighlighted || isSelected) && (
                  <g>
                    <circle
                      cx={midX}
                      cy={midY}
                      r="20"
                      fill="hsl(var(--card))"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? "3" : "2"}
                      opacity="0.95"
                      style={{ cursor: 'pointer', filter: isSelected ? 'drop-shadow(0 0 8px ' + strokeColor + ')' : 'none' }}
                      onClick={() => setIntegrationMapSelectedConnection(rel)}
                    />
                    <text
                      x={midX}
                      y={midY + 6}
                      textAnchor="middle"
                      fontSize="16"
                      fill={strokeColor}
                      style={{ cursor: 'pointer', pointerEvents: 'none', fontWeight: isSelected ? 'bold' : 'normal' }}
                    >
                      {connectionType.icon}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="hsl(142 76% 36%)"
                opacity="0.6"
              />
            </marker>
          </defs>

          {/* Render nodes */}
          {Object.entries(nodePositions).map(([key, pos]) => {
            const feature = pos.feature;
            const isSelected = integrationMapSelectedFeature === key;
            const isHighlighted = integrationMapHighlightedPath.includes(key);
            
            return (
              <g key={`node-${key}`}>
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? 35 : isHighlighted ? 30 : 25}
                  fill={isSelected ? 'hsl(var(--primary))' : isHighlighted ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--card))'}
                  stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="cursor-pointer transition-all"
                  onClick={() => handleFeatureClick(key)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.fill = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.fill = isSelected ? 'hsl(var(--primary))' : isHighlighted ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--card))';
                  }}
                />
                {/* Feature name */}
                <text
                  x={pos.x}
                  y={pos.y + 50}
                  textAnchor="middle"
                  className="text-xs font-medium fill-foreground pointer-events-none"
                  style={{ fontSize: '12px' }}
                >
                  {feature.name.split(' ').slice(0, 2).join(' ')}
                </text>
                {/* Status badge */}
                <circle
                  cx={pos.x + 20}
                  cy={pos.y - 20}
                  r={6}
                  fill={feature.status === 'Live' ? '#22c55e' : '#f59e0b'}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Connection Details Panel */}
      {integrationMapSelectedConnection && (() => {
        const rel = integrationMapSelectedConnection;
        const fromFeature = PRODUCT_LIBRARY.find(f => f.key === rel.from);
        const toFeature = PRODUCT_LIBRARY.find(f => f.key === rel.to);
        const connectionType = CONNECTION_TYPES[rel.type] || { description: rel.type, icon: '🔗', color: '#666' };
        
        if (!fromFeature || !toFeature) return null;
        
        return (
          <div className="bg-card border-2 border-primary/30 rounded-lg p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{connectionType.icon}</div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Connection Details</h3>
                  <p className="text-sm text-muted-foreground">How these features work together</p>
                </div>
              </div>
              <button
                onClick={() => setIntegrationMapSelectedConnection(null)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* From Feature */}
              <div className="bg-muted/30 rounded-lg p-4 border border-[hsl(var(--border))]">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">From</div>
                <div className="text-sm font-semibold text-foreground mb-1">{fromFeature.name}</div>
                <button
                  onClick={() => handleFeatureClick(rel.from)}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  View feature →
                </button>
              </div>
              
              {/* Connection Type */}
              <div className="bg-primary/10 rounded-lg p-4 border-2 border-primary/30">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Connection Type</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{connectionType.icon}</span>
                  <span className="text-sm font-semibold text-foreground capitalize">{rel.type}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{connectionType.description}</p>
                <div className="mt-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    rel.strength === 'strong' ? 'bg-green-500/20 text-green-600' :
                    rel.strength === 'medium' ? 'bg-yellow-500/20 text-yellow-600' :
                    'bg-gray-500/20 text-gray-600'
                  }`}>
                    {rel.strength} connection
                  </span>
                </div>
              </div>
              
              {/* To Feature */}
              <div className="bg-muted/30 rounded-lg p-4 border border-[hsl(var(--border))]">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">To</div>
                <div className="text-sm font-semibold text-foreground mb-1">{toFeature.name}</div>
                <button
                  onClick={() => handleFeatureClick(rel.to)}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  View feature →
                </button>
              </div>
            </div>
            
            {/* Detailed Explanation */}
            <div className="bg-muted/20 rounded-lg p-4 border border-[hsl(var(--border))]">
              <h4 className="text-sm font-semibold text-foreground mb-2">How This Connection Works</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>{fromFeature.name}</strong> {connectionType.description.toLowerCase()} <strong>{toFeature.name}</strong>. 
                This {rel.strength} connection means {rel.strength === 'strong' ? 'these features are tightly integrated and work closely together' : rel.strength === 'medium' ? 'these features complement each other with moderate integration' : 'these features have a loose relationship'}. 
                When you use {fromFeature.name}, it directly impacts {toFeature.name} by {connectionType.description.toLowerCase()}.
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => {
                  handleNavigateToFeature(rel.from);
                  setIntegrationMapSelectedConnection(null);
                }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Go to {fromFeature.name.split(' ')[0]}
              </button>
              <button
                onClick={() => {
                  handleNavigateToFeature(rel.to);
                  setIntegrationMapSelectedConnection(null);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Go to {toFeature.name.split(' ')[0]}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Feature Details Panel */}
      {integrationMapSelectedFeature && !integrationMapSelectedConnection && (() => {
        const feature = PRODUCT_LIBRARY.find(f => f.key === integrationMapSelectedFeature);
        const rels = getFeatureRelationships(integrationMapSelectedFeature);
        
        return (
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{feature.summary}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    feature.status === 'Live' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {feature.status}
                  </span>
                </div>
                <button
                  onClick={() => handleNavigateToFeature(integrationMapSelectedFeature)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Navigate to {feature.name}
                </button>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Connected Features ({rels.length})</h4>
                <div className="space-y-2">
                  {rels.map((rel, idx) => {
                    const connectedKey = rel.from === integrationMapSelectedFeature ? rel.to : rel.from;
                    const connectedFeature = PRODUCT_LIBRARY.find(f => f.key === connectedKey);
                    if (!connectedFeature) return null;
                    const connectionType = CONNECTION_TYPES[rel.type] || { icon: '🔗', description: rel.type };
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-[hsl(var(--border))] hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setIntegrationMapSelectedConnection(rel);
                          handleFeatureClick(connectedKey);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{connectionType.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-foreground">{connectedFeature.name}</div>
                            <div className="text-xs text-muted-foreground">{connectionType.description}</div>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${
                          rel.strength === 'strong' ? 'bg-green-500/10 text-green-500' :
                          rel.strength === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {rel.strength}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

  return renderIntegrationMap();
}
