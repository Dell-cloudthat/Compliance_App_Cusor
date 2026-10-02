/**
 * Client Intake Portal View
 * 
 * Comprehensive UI for the 4-tier client intake system:
 * - Tier 1: Manual/Document-Based Intake (Foundation)
 * - Tier 2: Read-Only API Integrations (Acceleration)
 * - Tier 3: Scheduled Exports (Bridge Model)
 * - Tier 4: Continuous Ingestion (Productized SaaS)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload, FileText, Link2, Calendar, Activity, Building2, 
  CheckCircle2, AlertCircle, Clock, Shield, Database, 
  RefreshCw, Plus, Settings, BarChart3, FileSpreadsheet,
  Image, FileQuestion, ChevronRight, X, Download, Eye,
  Zap, Server, Webhook, Cloud, Lock, AlertTriangle, Info
} from 'lucide-react';

// Tier configuration
const TIER_CONFIG = {
  1: {
    name: 'Manual / Document-Based',
    subtitle: 'FOUNDATION',
    color: 'emerald',
    icon: Upload,
    description: 'Works for 100% of clients with zero integration dependency',
    benefits: ['Zero integration dependency', 'Fast sales cycle', 'Lowest legal risk', 'Can charge immediately']
  },
  2: {
    name: 'Read-Only API Integrations',
    subtitle: 'ACCELERATION',
    color: 'blue',
    icon: Link2,
    description: 'Efficiency through scoped, read-only API connections',
    benefits: ['Automated data collection', 'Read-only (no risk)', 'Scoped permissions', 'Customer-owned credentials']
  },
  3: {
    name: 'Scheduled Exports',
    subtitle: 'BRIDGE MODEL',
    color: 'purple',
    icon: Calendar,
    description: 'Near-automation without live integration overhead',
    benefits: ['Near-automation', 'No live integrations', 'Works in regulated environments', 'Perfect for MSPs']
  },
  4: {
    name: 'Continuous Ingestion',
    subtitle: 'PRODUCTIZED SAAS',
    color: 'amber',
    icon: Activity,
    description: 'Real-time streaming for productized offerings',
    warnings: ['Higher security burden', 'Increased legal exposure', 'Higher support cost']
  }
};

const DOCUMENT_TYPES = [
  { value: 'CSV', label: 'CSV Spreadsheet', icon: FileSpreadsheet },
  { value: 'XLSX', label: 'Excel Workbook', icon: FileSpreadsheet },
  { value: 'PDF', label: 'PDF Document', icon: FileText },
  { value: 'ARCHITECTURE_DIAGRAM', label: 'Architecture Diagram', icon: Image },
  { value: 'POLICY_DOC', label: 'Policy Document', icon: Shield },
  { value: 'SCREENSHOT', label: 'Screenshot', icon: Image },
  { value: 'QUESTIONNAIRE', label: 'Questionnaire Response', icon: FileQuestion }
];

const INTEGRATION_TYPES = {
  microsoft_365: { name: 'Microsoft 365', vendor: 'Microsoft', icon: Cloud },
  azure: { name: 'Azure Security', vendor: 'Microsoft', icon: Cloud },
  aws: { name: 'AWS Security Hub', vendor: 'Amazon', icon: Server },
  crowdstrike: { name: 'CrowdStrike Falcon', vendor: 'CrowdStrike', icon: Shield },
  splunk: { name: 'Splunk SIEM', vendor: 'Splunk', icon: Database },
  qualys: { name: 'Qualys', vendor: 'Qualys', icon: Shield }
};

export default function ClientIntakePortalView({ currentUser }) {
  const userId = currentUser?.id || 1;
  
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [activeTier, setActiveTier] = useState(1);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [scheduledExports, setScheduledExports] = useState([]);
  const [continuousConfigs, setContinuousConfigs] = useState([]);
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showContinuousModal, setShowContinuousModal] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/intake/dashboard', {
        headers: { 'X-User-Id': userId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  }, [userId]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/intake/tier1/documents?limit=50', {
        headers: { 'X-User-Id': userId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  }, [userId]);

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/intake/tier2/integrations', {
        headers: { 'X-User-Id': userId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    }
  }, [userId]);

  // Fetch scheduled exports
  const fetchScheduledExports = useCallback(async () => {
    try {
      const response = await fetch('/api/intake/tier3/exports', {
        headers: { 'X-User-Id': userId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setScheduledExports(data.exports || []);
      }
    } catch (error) {
      console.error('Failed to fetch exports:', error);
    }
  }, [userId]);

  // Fetch continuous configs
  const fetchContinuousConfigs = useCallback(async () => {
    try {
      const response = await fetch('/api/intake/tier4/continuous', {
        headers: { 'X-User-Id': userId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setContinuousConfigs(data.configs || []);
      }
    } catch (error) {
      console.error('Failed to fetch continuous configs:', error);
    }
  }, [userId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboard(),
        fetchDocuments(),
        fetchIntegrations(),
        fetchScheduledExports(),
        fetchContinuousConfigs()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchDashboard, fetchDocuments, fetchIntegrations, fetchScheduledExports, fetchContinuousConfigs]);

  // Render tier badge
  const TierBadge = ({ tier, size = 'md' }) => {
    const config = TIER_CONFIG[tier];
    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-2 text-base'
    };
    
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizes[size]}
        bg-${config.color}-100 text-${config.color}-700 dark:bg-${config.color}-900/30 dark:text-${config.color}-400`}>
        <config.icon className="w-3.5 h-3.5" />
        Tier {tier}
      </span>
    );
  };

  // Overview Tab
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Tier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(tier => {
          const config = TIER_CONFIG[tier];
          const Icon = config.icon;
          const tierData = tier === 1 ? dashboard?.tier_1_manual :
                          tier === 2 ? dashboard?.tier_2_api :
                          tier === 3 ? dashboard?.tier_3_scheduled :
                          dashboard?.tier_4_continuous;
          
          return (
            <div 
              key={tier}
              onClick={() => { setActiveTier(tier); setActiveTab(`tier${tier}`); }}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg
                ${activeTier === tier 
                  ? `border-${config.color}-500 bg-${config.color}-50 dark:bg-${config.color}-900/20` 
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/30`}>
                  <Icon className={`w-5 h-5 text-${config.color}-600 dark:text-${config.color}-400`} />
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                  bg-${config.color}-100 text-${config.color}-700 dark:bg-${config.color}-900/30 dark:text-${config.color}-400`}>
                  {config.subtitle}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                Tier {tier}: {config.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {config.description}
              </p>
              
              {tierData && (
                <div className="flex items-center gap-3 text-sm">
                  {tier === 1 && (
                    <>
                      <span className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">{tierData.total_documents || 0}</span> docs
                      </span>
                      <span className="text-emerald-600">
                        <span className="font-semibold">{tierData.processed || 0}</span> processed
                      </span>
                    </>
                  )}
                  {tier === 2 && (
                    <>
                      <span className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">{tierData.total_integrations || 0}</span> integrations
                      </span>
                      <span className="text-blue-600">
                        <span className="font-semibold">{tierData.active || 0}</span> active
                      </span>
                    </>
                  )}
                  {tier === 3 && (
                    <>
                      <span className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">{tierData.total_exports || 0}</span> exports
                      </span>
                      <span className="text-purple-600">
                        <span className="font-semibold">{tierData.active || 0}</span> active
                      </span>
                    </>
                  )}
                  {tier === 4 && (
                    <>
                      <span className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">{tierData.total_streams || 0}</span> streams
                      </span>
                      <span className="text-amber-600">
                        <span className="font-semibold">{tierData.events_this_month || 0}</span> events
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
              hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 transition-all group"
          >
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-200">
              <Upload className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-900 dark:text-white">Upload Document</p>
              <p className="text-xs text-slate-500">CSV, PDF, Screenshots</p>
            </div>
          </button>
          
          <button
            onClick={() => setShowIntegrationModal(true)}
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
              hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all group"
          >
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200">
              <Link2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-900 dark:text-white">Connect API</p>
              <p className="text-xs text-slate-500">M365, Azure, AWS</p>
            </div>
          </button>
          
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
              hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 transition-all group"
          >
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-900 dark:text-white">Schedule Export</p>
              <p className="text-xs text-slate-500">Weekly/Monthly imports</p>
            </div>
          </button>
          
          <button
            onClick={() => setShowContinuousModal(true)}
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
              hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 transition-all group"
          >
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-900 dark:text-white">Real-time Stream</p>
              <p className="text-xs text-slate-500">Continuous ingestion</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recommendation Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Start with Tier 1</h3>
            <p className="text-emerald-100 mb-3">
              Tier 1 (Manual/Document-Based) is the foundation that funds everything else. 
              It works for 100% of clients with zero integration dependency, fast sales cycles, 
              and lowest legal risk.
            </p>
            <p className="text-sm text-emerald-200">
              This is how you onboard SMBs, MSPs, and regulated firms without engineering overhead.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Tier 1 Tab - Document Upload
  const Tier1Tab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            Tier 1: Manual / Document-Based Intake
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Upload CSVs, spreadsheets, PDFs, architecture diagrams, and policy documents
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Accepted Formats */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
        <h4 className="font-medium text-emerald-800 dark:text-emerald-300 mb-3">Accepted Inputs</h4>
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_TYPES.map(type => (
            <span key={type.value} className="inline-flex items-center gap-1.5 px-3 py-1.5 
              bg-white dark:bg-slate-800 rounded-full text-sm text-slate-700 dark:text-slate-300 
              border border-emerald-200 dark:border-emerald-700">
              <type.icon className="w-4 h-4" />
              {type.label}
            </span>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Uploaded Documents</h3>
        </div>
        
        {documents.length === 0 ? (
          <div className="p-12 text-center">
            <Upload className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No documents uploaded yet</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Upload your first document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {documents.map(doc => (
              <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    doc.parsing_status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    doc.parsing_status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' :
                    'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    <FileText className={`w-5 h-5 ${
                      doc.parsing_status === 'completed' ? 'text-emerald-600' :
                      doc.parsing_status === 'failed' ? 'text-red-600' :
                      'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{doc.document_name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{doc.document_type}</span>
                      <span>•</span>
                      <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                      {doc.contains_pii && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Contains PII
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doc.parsing_status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    doc.parsing_status === 'failed' ? 'bg-red-100 text-red-700' :
                    doc.parsing_status === 'pending' ? 'bg-slate-100 text-slate-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {doc.parsing_status}
                  </span>
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                    <Eye className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Tier 2 Tab - API Integrations
  const Tier2Tab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            Tier 2: Read-Only API Integrations
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Connect to Microsoft 365, Azure, AWS, and security tools with read-only access
          </p>
        </div>
        <button
          onClick={() => setShowIntegrationModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {/* Design Rules */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-3">Design Rules</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Read-only', 'Scoped permissions', 'Time-bound tokens', 'Customer-owned credentials'].map(rule => (
            <div key={rule} className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <CheckCircle2 className="w-4 h-4" />
              {rule}
            </div>
          ))}
        </div>
      </div>

      {/* Supported Integrations */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Supported Integrations</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(INTEGRATION_TYPES).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setShowIntegrationModal(true)}
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
                hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all"
            >
              <info.icon className="w-8 h-8 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-slate-900 dark:text-white">{info.name}</p>
                <p className="text-xs text-slate-500">{info.vendor}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Integrations */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Active Integrations</h3>
        </div>
        
        {integrations.length === 0 ? (
          <div className="p-12 text-center">
            <Link2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No integrations configured</p>
            <button
              onClick={() => setShowIntegrationModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Connect your first integration
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {integrations.map(integration => (
              <div key={integration.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Cloud className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{integration.integration_name}</p>
                    <p className="text-sm text-slate-500">{integration.vendor} • {integration.sync_frequency}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    integration.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    integration.status === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {integration.status}
                  </span>
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Tier 3 Tab - Scheduled Exports
  const Tier3Tab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Tier 3: Scheduled Exports
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure weekly or monthly data exports from SIEM, GRC tools, and MSP platforms
          </p>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Export Schedule
        </button>
      </div>

      {/* Benefits Banner */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
        <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-3">Why This is Gold</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['Near-automation', 'No live integrations', 'Regulated-friendly', 'Easy legal approval', 'Perfect for MSPs'].map(benefit => (
            <div key={benefit} className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
              <Zap className="w-4 h-4" />
              {benefit}
            </div>
          ))}
        </div>
      </div>

      {/* Export Examples */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Common Export Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-600">
            <Database className="w-8 h-8 text-purple-600 mb-2" />
            <p className="font-medium text-slate-900 dark:text-white">SIEM Weekly Export</p>
            <p className="text-sm text-slate-500">CSV from Splunk, QRadar, etc.</p>
          </div>
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-600">
            <Shield className="w-8 h-8 text-purple-600 mb-2" />
            <p className="font-medium text-slate-900 dark:text-white">GRC Monthly Report</p>
            <p className="text-sm text-slate-500">ServiceNow, Archer compliance data</p>
          </div>
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-600">
            <Building2 className="w-8 h-8 text-purple-600 mb-2" />
            <p className="font-medium text-slate-900 dark:text-white">MSP Bulk Export</p>
            <p className="text-sm text-slate-500">Multi-tenant aggregated data</p>
          </div>
        </div>
      </div>

      {/* Scheduled Exports List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Configured Exports</h3>
        </div>
        
        {scheduledExports.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No scheduled exports configured</p>
            <button
              onClick={() => setShowExportModal(true)}
              className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
            >
              Set up your first export
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {scheduledExports.map(exp => (
              <div key={exp.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{exp.export_name}</p>
                    <p className="text-sm text-slate-500">
                      {exp.source_system} • {exp.schedule_frequency} • {exp.delivery_method}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    exp.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {exp.status}
                  </span>
                  {exp.next_expected_at && (
                    <span className="text-xs text-slate-500">
                      Next: {new Date(exp.next_expected_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Tier 4 Tab - Continuous Ingestion
  const Tier4Tab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-600" />
            Tier 4: Continuous Ingestion
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time streaming telemetry and continuous control validation
          </p>
        </div>
        <button
          onClick={() => setShowContinuousModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Stream
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">
              SaaS Territory - Proceed with Caution
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
              Tier 4 dramatically increases security burden, legal exposure, support costs, and uptime expectations.
              Only enable for productized offerings with dedicated support teams.
            </p>
            <div className="flex flex-wrap gap-4">
              {['Higher security burden', 'Legal exposure', 'Support cost increase', 'Uptime SLAs'].map(warning => (
                <span key={warning} className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-3 h-3" />
                  {warning}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stream Types */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Stream Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-600">
            <Webhook className="w-8 h-8 text-amber-600 mb-2" />
            <p className="font-medium text-slate-900 dark:text-white">Streaming Telemetry</p>
            <p className="text-sm text-slate-500">Real-time event streams via webhooks</p>
          </div>
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-600">
            <BarChart3 className="w-8 h-8 text-amber-600 mb-2" />
            <p className="font-medium text-slate-900 dark:text-white">Real-time Scoring</p>
            <p className="text-sm text-slate-500">Continuous compliance score updates</p>
          </div>
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-600">
            <CheckCircle2 className="w-8 h-8 text-amber-600 mb-2" />
            <p className="font-medium text-slate-900 dark:text-white">Control Validation</p>
            <p className="text-sm text-slate-500">Continuous control state monitoring</p>
          </div>
        </div>
      </div>

      {/* Continuous Configs List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Active Streams</h3>
        </div>
        
        {continuousConfigs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No continuous streams configured</p>
            <p className="text-sm text-slate-400 mt-2">
              Consider starting with Tier 1-3 before enabling continuous ingestion
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {continuousConfigs.map(config => (
              <div key={config.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Activity className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{config.ingestion_name}</p>
                    <p className="text-sm text-slate-500">
                      {config.ingestion_type} • {config.stream_protocol}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    config.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    config.status === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {config.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    {config.events_this_month || 0} events/month
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Document Upload Modal
  const UploadModal = () => {
    const [uploadData, setUploadData] = useState({
      document_type: 'CSV',
      document_name: '',
      file: null,
      notes: ''
    });
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setUploadData(prev => ({
          ...prev,
          file,
          document_name: prev.document_name || file.name.replace(/\.[^/.]+$/, '')
        }));
      }
    };

    const handleUpload = async () => {
      if (!uploadData.file || !uploadData.document_name) return;
      
      setUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target.result.split(',')[1];
          
          const response = await fetch('/api/intake/tier1/documents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': userId.toString()
            },
            body: JSON.stringify({
              document_type: uploadData.document_type,
              document_name: uploadData.document_name,
              original_filename: uploadData.file.name,
              file_content_base64: base64,
              mime_type: uploadData.file.type,
              notes: uploadData.notes
            })
          });
          
          if (response.ok) {
            setShowUploadModal(false);
            fetchDocuments();
            fetchDashboard();
          }
        };
        reader.readAsDataURL(uploadData.file);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Upload Document</h3>
            <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Document Type
              </label>
              <select
                value={uploadData.document_type}
                onChange={e => setUploadData(prev => ({ ...prev, document_type: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {DOCUMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Document Name
              </label>
              <input
                type="text"
                value={uploadData.document_name}
                onChange={e => setUploadData(prev => ({ ...prev, document_name: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Enter a descriptive name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select File
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.gif,.doc,.docx"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">
                    {uploadData.file ? uploadData.file.name : 'Click to select a file'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    CSV, XLSX, PDF, Images, Word documents
                  </p>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={uploadData.notes}
                onChange={e => setUploadData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                rows={3}
                placeholder="Add any relevant notes about this document"
              />
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadData.file || !uploadData.document_name || uploading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Navigation Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'tier1', label: 'Tier 1: Manual', icon: Upload, color: 'emerald' },
    { id: 'tier2', label: 'Tier 2: API', icon: Link2, color: 'blue' },
    { id: 'tier3', label: 'Tier 3: Scheduled', icon: Calendar, color: 'purple' },
    { id: 'tier4', label: 'Tier 4: Continuous', icon: Activity, color: 'amber' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Client Intake Portal</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Tiered data ingestion system for compliance automation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchDashboard();
              fetchDocuments();
              fetchIntegrations();
              fetchScheduledExports();
              fetchContinuousConfigs();
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <RefreshCw className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors
              ${activeTab === tab.id 
                ? `border-${tab.color || 'blue'}-600 text-${tab.color || 'blue'}-600` 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'tier1' && <Tier1Tab />}
        {activeTab === 'tier2' && <Tier2Tab />}
        {activeTab === 'tier3' && <Tier3Tab />}
        {activeTab === 'tier4' && <Tier4Tab />}
      </div>

      {/* Modals */}
      {showUploadModal && <UploadModal />}
    </div>
  );
}
