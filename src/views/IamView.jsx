/**
 * renderIAM + renderPermissionGrantModal + renderVendorProfileModal
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

export default function IamView() {
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

const renderIAM = () => {
  console.log('renderIAM called, allUsers:', allUsers?.length, 'accessByArea:', accessByArea?.length, 'backendConnected:', backendConnected);
  
  // Ensure demo data is loaded if we don't have users (use useEffect instead of here)
  // This check runs on every render, so we'll use useEffect for loading
  
  const totalRoles = roles.length;
  const privilegedRoles = roles.filter((role) => role.permissions.includes('*'));
  const privilegedRolesCount = privilegedRoles.length;
  const averagePermissionsPerRole = totalRoles
    ? Math.round(roles.reduce((sum, role) => sum + (role.permissions?.length || 0), 0) / totalRoles)
    : 0;

  const permissionTemplates = [
    {
      id: 'least_privilege',
      name: 'Least Privilege Starter',
      description: 'Baseline visibility with no write access. Perfect for contractors or auditors-in-training.',
      permissions: ['dashboard.view', 'controls.view_assigned', 'reports.view'],
      recommendedFor: 'Observers, business stakeholders, external auditors',
    },
    {
      id: 'control_owner',
      name: 'Control Owner Toolkit',
      description: 'Adds evidence upload and control updates without broad administrative powers.',
      permissions: ['controls.view', 'controls.edit_assigned', 'evidence.upload', 'reports.generate'],
      recommendedFor: 'Control owners, department managers',
    },
    {
      id: 'security_operator',
      name: 'Security Operations',
      description: 'Balanced access for analysts handling incidents, vendors, and integrations.',
      permissions: ['controls.view', 'vendors.edit', 'incidents.manage', 'integrations.manage'],
      recommendedFor: 'Security analysts, platform operators',
    },
    {
      id: 'full_admin',
      name: 'Platform Administrator',
      description: 'Full system control including IAM, automation, and data architecture changes.',
      permissions: ['*'],
      recommendedFor: 'CISO, Platform owners, Senior administrators',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">IAM, Roles & Permissions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Centralize account access, roles, vendor privileges, and audit evidence in one workspace.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPermissionGrant(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Grant Permission
            </button>
            <button
              onClick={() => setShowVendorProfile(true)}
              className="px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Vendor Profile
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
          <div className="text-sm text-muted-foreground mb-1">Active Roles</div>
          <div className="text-2xl font-bold text-foreground">{totalRoles}</div>
          <div className="text-xs text-muted-foreground mt-1">{privilegedRolesCount} elevated</div>
        </div>
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
          <div className="text-sm text-muted-foreground mb-1">Active Permissions</div>
          <div className="text-2xl font-bold text-foreground">{userPermissions.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Avg {averagePermissionsPerRole} per role</div>
        </div>
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
          <div className="text-sm text-muted-foreground mb-1">Privileged Roles</div>
          <div className="text-2xl font-bold text-foreground">{privilegedRolesCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {(totalRoles ? Math.round((privilegedRolesCount / totalRoles) * 100) : 0)}% of total
          </div>
        </div>
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
          <div className="text-sm text-muted-foreground mb-1">Vendor Profiles</div>
          <div className="text-2xl font-bold text-foreground">{vendorAccessProfiles.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Access monitored</div>
        </div>
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-4">
          <div className="text-sm text-muted-foreground mb-1">Expiring Soon</div>
          <div className="text-2xl font-bold text-yellow-500">
            {userPermissions.filter(p => {
              if (!p.expires_at) return false;
              const expires = new Date(p.expires_at);
              const daysUntilExpiry = (expires - new Date()) / (1000 * 60 * 60 * 24);
              return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
            }).length}
          </div>
        </div>
      </div>

      {/* Role Directory */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Role Directory</h3>
            <p className="text-sm text-muted-foreground">
              Curated access bundles with mapped permissions, user counts, and best-fit scenarios.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 border border-[hsl(var(--border))] rounded-lg px-3 py-2">
            <Shield className="w-3 h-3" />
            <span>{averagePermissionsPerRole} avg permissions per role</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map((role) => {
            const displayPermissions = role.permissions.slice(0, 4);
            const remaining = Math.max(role.permissions.length - displayPermissions.length, 0);
            const borderAccent =
              role.color === 'red' ? 'border-red-500/30' :
              role.color === 'blue' ? 'border-blue-500/30' :
              role.color === 'green' ? 'border-green-500/30' :
              role.color === 'purple' ? 'border-purple-500/30' :
              role.color === 'yellow' ? 'border-yellow-500/30' :
              'border-muted';

            return (
              <div key={role.id} className={`border ${borderAccent} rounded-lg p-4 bg-muted/20 hover:bg-muted/30 transition-colors`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{role.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                  </div>
                  <span className="px-2 py-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full">
                    {role.userCount} users
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {displayPermissions.map((perm) => (
                      <span key={`${role.id}-${perm}`} className="text-[11px] bg-card border border-[hsl(var(--border))] px-2 py-0.5 rounded text-muted-foreground">
                        {perm === '*' ? 'Full access' : perm}
                      </span>
                    ))}
                    {remaining > 0 && (
                      <span className="text-[11px] text-muted-foreground">+{remaining} more</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Activity className="w-3 h-3" />
                    <span>
                      Coverage: {role.permissions.includes('*') ? 'All resources' : `${role.permissions.length} scoped rights`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Templates */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Permission Templates</h3>
            <p className="text-sm text-muted-foreground">
              Starter bundles to accelerate onboarding and maintain least-privilege access.
            </p>
          </div>
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {permissionTemplates.map((template) => (
            <div key={template.id} className="border border-[hsl(var(--border))] rounded-lg p-4 bg-muted/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {template.permissions.slice(0, 3).map((perm) => (
                    <span key={`${template.id}-${perm}`} className="text-[11px] bg-card border border-[hsl(var(--border))] px-2 py-0.5 rounded text-muted-foreground">
                      {perm}
                    </span>
                  ))}
                  {template.permissions.length > 3 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{template.permissions.length - 3} more
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span>{template.recommendedFor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Permissions Table */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
        <div className="p-6 border-b border-[hsl(var(--border))]">
          <h3 className="text-lg font-semibold text-foreground">User Permissions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">User</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Resource</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Permission</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Granted By</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Expires</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userPermissions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-muted-foreground">
                    No permissions found. Grant permissions to get started.
                  </td>
                </tr>
              ) : (
                userPermissions.map((perm) => (
                  <tr key={perm.id} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                    <td className="py-3 px-4 text-sm text-foreground">{perm.user_email || `User ${perm.user_id}`}</td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      <span className="font-medium">{perm.resource_type}</span>
                      {perm.resource_id && <span className="text-muted-foreground ml-1">({perm.resource_id})</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        perm.permission_type === 'read' ? 'bg-blue-500/10 text-blue-500' :
                        perm.permission_type === 'write' ? 'bg-green-500/10 text-green-500' :
                        perm.permission_type === 'execute' ? 'bg-purple-500/10 text-purple-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {perm.permission_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{perm.granted_by_email || `User ${perm.granted_by}`}</td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {perm.expires_at ? (
                        <span className={new Date(perm.expires_at) < new Date() ? 'text-red-500' : ''}>
                          {new Date(perm.expires_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={async () => {
                          if (confirm('Revoke this permission?')) {
                            try {
                              await api.revokePermission(currentUser.id, perm.id, 'Revoked by admin');
                              await loadIAMData();
                            } catch (error) {
                              console.error('Permission revoke error:', error);
                              const errorMsg = error.detail || error.message || (error instanceof Error ? error.message : String(error));
                              alert('Error revoking permission: ' + errorMsg);
                            }
                          }
                        }}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg">
        <div className="p-6 border-b border-[hsl(var(--border))]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Permission Audit Log</h3>
              <p className="text-sm text-muted-foreground mt-1">Immutable record of all permission changes</p>
            </div>
            <span className="text-xs text-muted-foreground border border-[hsl(var(--border))] rounded-lg px-3 py-1 bg-muted/60">
              {permissionAuditLog.length} events recorded
            </span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-muted/30 sticky top-0">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Timestamp</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Event</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">User</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Resource</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Granted By</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {permissionAuditLog.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-muted-foreground">
                    No audit log entries yet.
                  </td>
                </tr>
              ) : (
                permissionAuditLog.map((log) => (
                  <tr key={log.id} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                    <td className="py-3 px-4 text-sm text-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.event_type === 'grant' ? 'bg-green-500/10 text-green-500' :
                        log.event_type === 'revoke' ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">User {log.user_id}</td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {log.resource_type} {log.resource_id && `(${log.resource_id})`}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">User {log.granted_by}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{log.ip_address || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Access Tracking Section */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">User Access Tracking & Auto-Mapping</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically track user access, login sessions, and map permissions with r/w/x breakdown
            </p>
          </div>
          <button
            onClick={() => {
              if (currentUser.id) {
                api.triggerAutoMapPermissions(currentUser.id, currentUser.id).then(() => {
                  loadAccessTrackingData();
                });
              }
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Re-map Permissions
          </button>
        </div>

        {/* User Statistics Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Users by Login Count - Bar Chart */}
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <h4 className="text-md font-semibold text-foreground mb-4">Users by Login Count</h4>
            {allUsers && allUsers.length > 0 ? (
              <div className="space-y-3">
                {allUsers
                  .sort((a, b) => (b.total_logins || 0) - (a.total_logins || 0))
                  .slice(0, 7)
                  .map((user) => {
                  const maxLogins = Math.max(...allUsers.map(u => u.total_logins || 0), 1);
                  const percentage = ((user.total_logins || 0) / maxLogins) * 100;
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUserForDetails(user);
                        setSelectedUserForTracking(user.id);
                        loadUserAccessDetails(user.id);
                      }}
                      className="cursor-pointer hover:bg-muted/30 p-2 rounded transition-colors border border-[hsl(var(--border))]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{user.name}</span>
                        <span className="text-sm font-bold text-primary">{user.total_logins || 0}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading user data...</p>
              </div>
            )}
          </div>

          {/* Users by Access Level - Role Distribution */}
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-6">
            <h4 className="text-md font-semibold text-foreground mb-4">Users by Access Level</h4>
            {allUsers && allUsers.length > 0 ? (
              <div className="space-y-3">
                {Object.entries(
                  allUsers.reduce((acc, user) => {
                    const role = user.role || 'viewer';
                    acc[role] = (acc[role] || 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([role, count]) => {
                    const totalUsers = allUsers.length || 1;
                    const percentage = (count / totalUsers) * 100;
                    const roleColors = {
                      admin: 'bg-red-500',
                      security_analyst: 'bg-blue-500',
                      compliance_manager: 'bg-purple-500',
                      control_owner: 'bg-green-500',
                      auditor: 'bg-yellow-500',
                      viewer: 'bg-gray-500',
                      vendor: 'bg-orange-500'
                    };
                    return (
                      <div
                        key={role}
                        onClick={() => {
                          const usersInRole = allUsers.filter(u => (u.role || 'viewer') === role);
                          if (usersInRole.length > 0) {
                            setSelectedUserForDetails(usersInRole[0]);
                            setSelectedUserForTracking(usersInRole[0].id);
                            loadUserAccessDetails(usersInRole[0].id);
                          }
                        }}
                        className="cursor-pointer hover:bg-muted/30 p-2 rounded transition-colors border border-[hsl(var(--border))]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${roleColors[role] || 'bg-gray-500'}`} />
                            <span className="text-sm font-medium text-foreground capitalize">{role.replace('_', ' ')}</span>
                          </div>
                          <span className="text-sm font-bold text-primary">{count}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className={`${roleColors[role] || 'bg-gray-500'} h-3 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading role data...</p>
              </div>
            )}
          </div>
        </div>

        {/* User List with Access Stats - Collapsible */}
        <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
          <button
            onClick={() => setIamSectionsExpanded(prev => ({ ...prev, userList: !prev.userList }))}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              All Users ({allUsers?.length || 0})
            </h4>
            {iamSectionsExpanded.userList ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {iamSectionsExpanded.userList && (
            <div className="p-6 pt-0 space-y-4">
          <h4 className="text-md font-semibold text-foreground">All Users</h4>
          {allUsers && allUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => {
                  setSelectedUserForDetails(user);
                  setSelectedUserForTracking(user.id);
                  loadUserAccessDetails(user.id);
                }}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedUserForTracking === user.id
                    ? 'border-primary bg-primary/5'
                    : 'border-[hsl(var(--border))] hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-foreground">{user.name || user.email}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <span className="px-2 py-1 text-xs bg-muted rounded">{user.role || 'viewer'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Logins</div>
                    <div className="font-semibold text-foreground">{user.total_logins || 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Accesses</div>
                    <div className="font-semibold text-foreground">{user.total_accesses || 0}</div>
                  </div>
                </div>
                {user.last_access && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Last: {new Date(user.last_access).toLocaleDateString()}
                  </div>
                )}
              </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/30 rounded-lg border border-[hsl(var(--border))]">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading user data...</p>
            </div>
          )}
            </div>
          )}
        </div>

        {/* Access Summary - Collapsible */}
        {userAccessSummary && (
          <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
            <button
              onClick={() => setIamSectionsExpanded(prev => ({ ...prev, accessSummary: !prev.accessSummary }))}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Access Summary (Last 30 Days)
              </h4>
              {iamSectionsExpanded.accessSummary ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {iamSectionsExpanded.accessSummary && (
              <div className="p-6 pt-0 space-y-4">
            <h4 className="text-md font-semibold text-foreground">Access Summary (Last 30 Days)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Total Logins</div>
                <div className="text-xl font-bold text-foreground">{userAccessSummary.sessions?.total_logins || 0}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Total Accesses</div>
                <div className="text-xl font-bold text-foreground">{userAccessSummary.access?.total_accesses || 0}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Unique Resources</div>
                <div className="text-xl font-bold text-foreground">{userAccessSummary.access?.unique_resources || 0}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Session Time</div>
                <div className="text-xl font-bold text-foreground">
                  {userAccessSummary.sessions?.total_session_time_seconds
                    ? Math.round(userAccessSummary.sessions.total_session_time_seconds / 3600)
                    : 0}h
                </div>
              </div>
            </div>
            
            {/* Permission Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="text-xs text-blue-500 mb-1">Read Actions</div>
                <div className="text-xl font-bold text-blue-500">{userAccessSummary.access?.read_actions || 0}</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="text-xs text-green-500 mb-1">Write Actions</div>
                <div className="text-xl font-bold text-green-500">{userAccessSummary.access?.write_actions || 0}</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                <div className="text-xs text-purple-500 mb-1">Execute Actions</div>
                <div className="text-xl font-bold text-purple-500">{userAccessSummary.access?.execute_actions || 0}</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="text-xs text-red-500 mb-1">Delete Actions</div>
                <div className="text-xl font-bold text-red-500">{userAccessSummary.access?.delete_actions || 0}</div>
              </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Auto-Mapped Permissions - Collapsible */}
        {mappedPermissions.length > 0 && (
          <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
            <button
              onClick={() => setIamSectionsExpanded(prev => ({ ...prev, permissions: !prev.permissions }))}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Auto-Mapped Permissions ({mappedPermissions.length})
              </h4>
              {iamSectionsExpanded.permissions ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {iamSectionsExpanded.permissions && (
              <div className="p-6 pt-0 space-y-4">
            <h4 className="text-md font-semibold text-foreground">Auto-Mapped Permissions (r/w/x)</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Resource Type</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Resource ID</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold text-foreground">Read</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold text-foreground">Write</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold text-foreground">Execute</th>
                    <th className="text-center py-2 px-3 text-sm font-semibold text-foreground">Delete</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Source</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedPermissions.map((perm, idx) => (
                    <tr key={idx} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                      <td className="py-2 px-3 text-sm text-foreground font-medium">{perm.resource_type}</td>
                      <td className="py-2 px-3 text-sm text-muted-foreground">{perm.resource_id || 'All'}</td>
                      <td className="py-2 px-3 text-center">
                        {perm.read ? (
                          <span className="inline-block w-6 h-6 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-blue-500" />
                          </span>
                        ) : (
                          <span className="inline-block w-6 h-6 rounded-full bg-muted border-2 border-[hsl(var(--border))]" />
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {perm.write ? (
                          <span className="inline-block w-6 h-6 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-green-500" />
                          </span>
                        ) : (
                          <span className="inline-block w-6 h-6 rounded-full bg-muted border-2 border-[hsl(var(--border))]" />
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {perm.execute ? (
                          <span className="inline-block w-6 h-6 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-purple-500" />
                          </span>
                        ) : (
                          <span className="inline-block w-6 h-6 rounded-full bg-muted border-2 border-[hsl(var(--border))]" />
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {perm.delete ? (
                          <span className="inline-block w-6 h-6 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-red-500" />
                          </span>
                        ) : (
                          <span className="inline-block w-6 h-6 rounded-full bg-muted border-2 border-[hsl(var(--border))]" />
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm text-muted-foreground">{perm.discovered_from || 'unknown'}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${(perm.confidence_score || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">
                            {Math.round((perm.confidence_score || 0) * 100)}%
                          </span>
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
        )}

        {/* Compliance Control Mapping - Collapsible */}
        {complianceMapping.length > 0 && (
          <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
            <button
              onClick={() => setIamSectionsExpanded(prev => ({ ...prev, compliance: !prev.compliance }))}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Compliance Control Mapping ({complianceMapping.length})
              </h4>
              {iamSectionsExpanded.compliance ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {iamSectionsExpanded.compliance && (
              <div className="p-6 pt-0 space-y-4">
            <h4 className="text-md font-semibold text-foreground">Compliance Control Mapping (NIST 800-53)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {complianceMapping.map((mapping, idx) => (
                <div
                  key={idx}
                  className="border border-[hsl(var(--border))] rounded-lg p-3 bg-muted/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground">{mapping.control_id}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        mapping.compliance_status === 'compliant'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                      }`}
                    >
                      {mapping.compliance_status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Permission: {mapping.permission_type}</div>
                    <div>Resource: {mapping.resource_type} {mapping.resource_id ? `(${mapping.resource_id})` : ''}</div>
                    {mapping.last_verified_at && (
                      <div>Verified: {new Date(mapping.last_verified_at).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Access by Area - Collapsible */}
        {accessByArea && accessByArea.length > 0 ? (
          <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
            <button
              onClick={() => setIamSectionsExpanded(prev => ({ ...prev, accessByArea: !prev.accessByArea }))}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                <Network className="w-4 h-4" />
                Access by Area ({accessByArea.length} areas)
              </h4>
              {iamSectionsExpanded.accessByArea ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {iamSectionsExpanded.accessByArea && (
              <div className="p-6 pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-foreground">Access by Area - User Access Timeline</h4>
              <span className="text-xs text-muted-foreground bg-muted/60 border border-[hsl(var(--border))] rounded-lg px-3 py-1">
                {accessByArea.reduce((sum, area) => sum + area.total_accesses, 0)} total accesses across {accessByArea.length} areas
              </span>
            </div>
            
            <div className="space-y-6">
              {accessByArea.map((area, areaIdx) => {
                const isExpanded = expandedArea === areaIdx;
                return (
                  <div key={areaIdx} className="border border-[hsl(var(--border))] rounded-lg p-4 bg-card">
                    <div 
                      className="flex items-center justify-between mb-4 cursor-pointer"
                      onClick={() => setExpandedArea(isExpanded ? null : areaIdx)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-lg font-semibold text-foreground">{area.area_name}</h5>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {area.unique_users} users
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            {area.total_accesses} accesses
                          </span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium">
                        {area.resource_type}
                      </span>
                    </div>
                    
                    {/* User Access Timeline - Expandable */}
                    {isExpanded && (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {area.accesses.slice(0, 50).map((access, accessIdx) => {
                      const accessDate = new Date(access.timestamp);
                      const isToday = accessDate.toDateString() === new Date().toDateString();
                      const isYesterday = accessDate.toDateString() === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
                      
                      return (
                        <div
                          key={accessIdx}
                          onClick={() => {
                            const user = allUsers.find(u => u.id === access.user_id);
                            if (user) {
                              setSelectedUserForDetails(user);
                              setSelectedUserForTracking(user.id);
                              loadUserAccessDetails(user.id);
                            }
                          }}
                          className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-[hsl(var(--border))] cursor-pointer"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {access.user_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground text-sm">{access.user_name}</span>
                                <span className="text-xs text-muted-foreground">({access.user_email})</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  access.user_role === 'admin' ? 'bg-red-500/10 text-red-500' :
                                  access.user_role === 'security_analyst' ? 'bg-blue-500/10 text-blue-500' :
                                  access.user_role === 'compliance_manager' ? 'bg-purple-500/10 text-purple-500' :
                                  access.user_role === 'auditor' ? 'bg-yellow-500/10 text-yellow-500' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {access.user_role}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  access.permission === 'read' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                  access.permission === 'write' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                  access.permission === 'execute' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                  'bg-red-500/10 text-red-500 border border-red-500/20'
                                }`}>
                                  {access.permission}
                                </span>
                                {access.success ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-medium">{access.action}</span>
                              {access.resource_id && (
                                <span className="text-muted-foreground">• Resource: {access.resource_id}</span>
                              )}
                              <span className="ml-auto">
                                {isToday ? 'Today' : isYesterday ? 'Yesterday' : accessDate.toLocaleDateString()} at {accessDate.toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                        {area.accesses.length > 50 && (
                          <div className="text-center text-sm text-muted-foreground py-2">
                            ... and {area.accesses.length - 50} more accesses
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
        ) : (
          <div className="text-center py-8 bg-muted/30 rounded-lg border border-[hsl(var(--border))]">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="text-md font-semibold text-foreground mb-2">No Access Data Available</h4>
            <p className="text-sm text-muted-foreground">
              Access tracking data will appear here once users start accessing the platform.
            </p>
          </div>
        )}

        {/* Access Logs - Collapsible */}
        {userAccessLogs.length > 0 && (
          <div className="border border-[hsl(var(--border))] rounded-lg bg-card">
            <button
              onClick={() => setIamSectionsExpanded(prev => ({ ...prev, accessLogs: !prev.accessLogs }))}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <h4 className="text-md font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Recent Access Logs ({userAccessLogs.length})
              </h4>
              {iamSectionsExpanded.accessLogs ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {iamSectionsExpanded.accessLogs && (
              <div className="p-6 pt-0 space-y-4">
            <h4 className="text-md font-semibold text-foreground">Recent Access Logs</h4>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Timestamp</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Resource</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Action</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Permission</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userAccessLogs.slice(0, 50).map((log, idx) => (
                    <tr key={idx} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                      <td className="py-2 px-3 text-xs text-foreground">
                        {new Date(log.access_timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-sm text-foreground">
                        {log.resource_type} {log.resource_id ? `(${log.resource_id})` : ''}
                      </td>
                      <td className="py-2 px-3 text-sm text-foreground">{log.action_type}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.permission_used === 'read'
                              ? 'bg-blue-500/10 text-blue-500'
                              : log.permission_used === 'write'
                              ? 'bg-green-500/10 text-green-500'
                              : log.permission_used === 'execute'
                              ? 'bg-purple-500/10 text-purple-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {log.permission_used}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {log.success ? 'Success' : 'Failed'}
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
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUserForDetails(null)}>
          <div className="bg-card border border-[hsl(var(--border))] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-[hsl(var(--border))] p-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground">{selectedUserForDetails.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedUserForDetails.email}</p>
              </div>
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Logins</div>
                  <div className="text-2xl font-bold text-foreground">{selectedUserForDetails.total_logins || 0}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Accesses</div>
                  <div className="text-2xl font-bold text-foreground">{selectedUserForDetails.total_accesses || 0}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Role</div>
                  <div className="text-lg font-semibold text-foreground capitalize">{(selectedUserForDetails.role || 'viewer').replace('_', ' ')}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Last Access</div>
                  <div className="text-sm font-semibold text-foreground">
                    {selectedUserForDetails.last_access 
                      ? new Date(selectedUserForDetails.last_access).toLocaleString()
                      : 'Never'}
                  </div>
                </div>
              </div>

              {/* Access Summary */}
              {userAccessSummary && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-foreground">Access Summary (Last 30 Days)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <div className="text-xs text-blue-500 mb-1">Read Actions</div>
                      <div className="text-xl font-bold text-blue-500">{userAccessSummary.access?.read_actions || 0}</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <div className="text-xs text-green-500 mb-1">Write Actions</div>
                      <div className="text-xl font-bold text-green-500">{userAccessSummary.access?.write_actions || 0}</div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                      <div className="text-xs text-purple-500 mb-1">Execute Actions</div>
                      <div className="text-xl font-bold text-purple-500">{userAccessSummary.access?.execute_actions || 0}</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="text-xs text-red-500 mb-1">Delete Actions</div>
                      <div className="text-xl font-bold text-red-500">{userAccessSummary.access?.delete_actions || 0}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Access Logs */}
              {userAccessLogs.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-foreground">Recent Access Logs</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {userAccessLogs.slice(0, 20).map((log, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-[hsl(var(--border))]">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">{log.resource_type}</span>
                            {log.resource_id && (
                              <span className="text-sm text-muted-foreground">({log.resource_id})</span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              log.permission_used === 'read' ? 'bg-blue-500/10 text-blue-500' :
                              log.permission_used === 'write' ? 'bg-green-500/10 text-green-500' :
                              log.permission_used === 'execute' ? 'bg-purple-500/10 text-purple-500' :
                              'bg-red-500/10 text-red-500'
                            }`}>
                              {log.permission_used}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.action_type} • {new Date(log.access_timestamp).toLocaleString()}
                          </div>
                        </div>
                        {log.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPermissionGrant && renderPermissionGrantModal()}
      {showVendorProfile && renderVendorProfileModal()}
    </div>
  );
};

  return renderIAM();
}
