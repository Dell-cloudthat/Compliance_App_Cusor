import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Activity,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Play,
  Download,
  Settings,
  Building2,
  Hash,
  Lock,
  ArrowRight,
  Zap,
  Key,
  Webhook,
  Copy,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Code,
  Globe,
  Award,
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  Users,
  BarChart3,
} from 'lucide-react';

/**
 * Consent Platform - Admin UI
 * 
 * Three screens only:
 * 1. Consent Policies - Purposes, Vendors, TTLs
 * 2. Live Enforcement - Allowed/Blocked/Modified per vendor
 * 3. Audit Export - Time range, Vendor, Jurisdiction
 */

const API_BASE = '/api';

// API Helper
const api = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'X-Tenant-ID': 'demo-tenant' }
    });
    return res.json();
  },
  async post(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'demo-tenant'
      },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};

// ============== App ==============

export default function App() {
  const [activeView, setActiveView] = useState('live');
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    api.get('/stats').then(setStats).catch(console.error);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={28} />
              <div>
                <h1 className="text-xl font-bold">Consent Platform</h1>
                <p className="text-sm text-indigo-200">Server-Side Enforcement</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-indigo-200">Events</p>
              <p className="font-mono font-bold">{stats?.evidence_store?.total_events || 0}</p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            {[
              { id: 'policies', label: 'Consent Policies', icon: Settings },
              { id: 'live', label: 'Live Enforcement', icon: Activity },
              { id: 'trust', label: 'Vendor Trust', icon: Award },
              { id: 'audit', label: 'Audit Export', icon: FileText },
              { id: 'settings', label: 'Settings', icon: Key },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeView === id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>
      
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeView === 'policies' && <PoliciesView />}
        {activeView === 'live' && <LiveEnforcementView />}
        {activeView === 'trust' && <VendorTrustView />}
        {activeView === 'audit' && <AuditExportView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

// ============== Screen 1: Consent Policies ==============

function PoliciesView() {
  const [vendors, setVendors] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsRes, tokensRes] = await Promise.all([
        api.get('/vendors'),
        api.get('/tokens?limit=20')
      ]);
      setVendors(vendorsRes.vendors || []);
      setTokens(tokensRes.tokens || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);
  
  useEffect(() => { load(); }, [load]);
  
  // Purposes (hardcoded for MVP)
  const purposes = [
    { id: 'retargeting', name: 'Retargeting', description: 'Show personalized ads based on browsing', defaultTtl: 14 },
    { id: 'analytics', name: 'Analytics', description: 'Track page views and user behavior', defaultTtl: 30 },
    { id: 'marketing', name: 'Marketing', description: 'Lead generation and email capture', defaultTtl: 30 },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Consent Policies</h2>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {/* Purposes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Purposes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {purposes.map(purpose => (
            <div key={purpose.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{purpose.name}</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
              </div>
              <p className="text-sm text-gray-500 mb-2">{purpose.description}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock size={12} />
                <span>Default TTL: {purpose.defaultTtl} days</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Vendors */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendors</h3>
        {vendors.length === 0 ? (
          <p className="text-gray-500">No vendors configured</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Data Classes</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendors.map(vendor => (
                  <tr key={vendor.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        <div>
                          <p className="font-medium">{vendor.display_name}</p>
                          <p className="text-xs text-gray-400">{vendor.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{vendor.vendor_type}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {vendor.allowed_data_classes?.map(dc => (
                          <span key={dc} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {dc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Recent Tokens */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Consent Tokens</h3>
        {tokens.length === 0 ? (
          <p className="text-gray-500">No tokens issued</p>
        ) : (
          <div className="space-y-2">
            {tokens.map(token => (
              <div key={token.token_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Hash size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-mono">{token.token_id.slice(0, 12)}...</p>
                    <p className="text-xs text-gray-500">Subject: {token.subject_id.slice(0, 20)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex gap-1">
                    {token.purposes?.map(p => (
                      <span key={p} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    token.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {token.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============== Screen 2: Live Enforcement ==============

function LiveEnforcementView() {
  const [decisions, setDecisions] = useState([]);
  const [stats, setStats] = useState(null);
  const [demoResult, setDemoResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoRunning, setDemoRunning] = useState(false);
  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [decisionsRes, statsRes] = await Promise.all([
        api.get('/decisions?limit=50'),
        api.get('/stats')
      ]);
      setDecisions(decisionsRes.decisions || []);
      setStats(statsRes);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);
  
  useEffect(() => { load(); }, [load]);
  
  const runDemo = async () => {
    setDemoRunning(true);
    try {
      const result = await api.post('/demo/flow', {});
      setDemoResult(result);
      load();
    } catch (e) {
      console.error(e);
    }
    setDemoRunning(false);
  };
  
  // Calculate stats from decisions
  const enforcementDecisions = decisions.filter(d => d.event_type === 'enforcement_decision');
  const allowed = enforcementDecisions.filter(d => d.event_data?.decision === 'allowed').length;
  const modified = enforcementDecisions.filter(d => d.event_data?.decision === 'modified').length;
  const blocked = enforcementDecisions.filter(d => d.event_data?.decision === 'blocked').length;
  const total = allowed + modified + blocked;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Live Enforcement</h2>
        <div className="flex gap-2">
          <button
            onClick={runDemo}
            disabled={demoRunning}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2 disabled:opacity-50"
          >
            {demoRunning ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            Run Demo Flow
          </button>
          <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg border">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      {/* Demo Result */}
      {demoResult && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-800 mb-4">Demo Flow Complete</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">1. Consent Issued</p>
              <p className="font-mono text-sm">{demoResult.step_1_consent?.token_id?.slice(0, 12)}...</p>
              <p className="text-xs text-gray-400">Purposes: {demoResult.step_1_consent?.purposes?.join(', ')}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">2. Event Sent</p>
              <p className="font-medium">{demoResult.step_2_event?.event_type}</p>
              <p className="text-xs text-gray-400">Vendor: {demoResult.step_2_event?.vendor}</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">3. Decision</p>
              <p className={`font-bold ${
                demoResult.step_3_decision?.decision === 'allowed' ? 'text-green-600' : 
                demoResult.step_3_decision?.decision === 'modified' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {demoResult.step_3_decision?.decision?.toUpperCase()}
              </p>
              <p className="text-xs text-gray-400">{demoResult.step_3_decision?.latency_ms}ms</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Decisions" value={total} icon={Zap} color="blue" />
        <StatCard label="Allowed" value={allowed} icon={CheckCircle} color="green" />
        <StatCard label="Modified" value={modified} icon={AlertTriangle} color="amber" />
        <StatCard label="Blocked" value={blocked} icon={XCircle} color="red" />
      </div>
      
      {/* Flow Diagram */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Enforcement Flow</h3>
        <div className="flex items-center justify-center gap-4 py-4">
          {[
            { label: 'Event In', icon: Zap, bg: 'bg-blue-100', text: 'text-blue-600' },
            { label: 'Validate Token', icon: Lock, bg: 'bg-purple-100', text: 'text-purple-600' },
            { label: 'Enforce Policy', icon: Shield, bg: 'bg-indigo-100', text: 'text-indigo-600' },
            { label: 'Forward', icon: ArrowRight, bg: 'bg-green-100', text: 'text-green-600' },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center">
                <div className={`p-3 rounded-xl ${step.bg}`}>
                  <step.icon size={24} className={step.text} />
                </div>
                <p className="text-sm mt-2 font-medium">{step.label}</p>
              </div>
              {i < 3 && <ArrowRight className="text-gray-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Decisions Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Decisions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Forwarded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {enforcementDecisions.slice(0, 20).map((d, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(d.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {d.event_data?.event_id?.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-sm">{d.event_data?.vendor}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      d.event_data?.decision === 'allowed' ? 'bg-green-100 text-green-700' :
                      d.event_data?.decision === 'modified' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {d.event_data?.decision}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{d.event_data?.latency_ms}ms</td>
                  <td className="px-4 py-3">
                    {d.event_data?.forwarded ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-gray-300" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============== Screen 3: Audit Export ==============

function AuditExportView() {
  const [verification, setVerification] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const verifyChain = async () => {
    setLoading(true);
    try {
      const result = await api.get('/audit/verify');
      setVerification(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  
  const exportAudit = async () => {
    setLoading(true);
    try {
      const result = await api.get(`/audit/export?start_date=${dateRange.start}T00:00:00Z&end_date=${dateRange.end}T23:59:59Z`);
      setExportData(result);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  
  const downloadJson = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-export-${dateRange.start}-${dateRange.end}.json`;
    a.click();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Audit Export</h2>
      </div>
      
      {/* Chain Verification */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Chain Integrity</h3>
          <button
            onClick={verifyChain}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Lock size={16} />
            Verify Chain
          </button>
        </div>
        
        {verification && (
          <div className={`p-4 rounded-lg ${verification.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {verification.valid ? (
                <CheckCircle className="text-green-500" />
              ) : (
                <XCircle className="text-red-500" />
              )}
              <span className={`font-semibold ${verification.valid ? 'text-green-700' : 'text-red-700'}`}>
                {verification.valid ? 'Chain Verified' : 'Chain Broken'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Events Checked</p>
                <p className="font-mono">{verification.events_checked}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Sequence</p>
                <p className="font-mono">#{verification.last_sequence || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Hash</p>
                <p className="font-mono text-xs">{verification.last_hash?.slice(0, 16)}...</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Export Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Export Data</h3>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={exportAudit}
              disabled={loading}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2"
            >
              <FileText size={16} />
              Generate Export
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={downloadJson}
              disabled={!exportData}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} />
              Download JSON
            </button>
          </div>
        </div>
        
        {/* Export Preview */}
        {exportData && (
          <div className="mt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-500">Events</p>
                  <p className="font-bold text-lg">{exportData.events_count}</p>
                </div>
                <div>
                  <p className="text-gray-500">Time Range</p>
                  <p className="text-xs">{dateRange.start} to {dateRange.end}</p>
                </div>
                <div>
                  <p className="text-gray-500">Chain Valid</p>
                  <p className={exportData.chain_valid ? 'text-green-600' : 'text-red-600'}>
                    {exportData.chain_valid ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Export Time</p>
                  <p className="text-xs">{new Date(exportData.export_time).toLocaleString()}</p>
                </div>
              </div>
              
              {/* Sample events */}
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Sample Events</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {exportData.events?.slice(0, 10).map((event, i) => (
                    <div key={i} className="text-xs bg-white p-2 rounded border font-mono">
                      <span className="text-gray-400">#{event.sequence}</span>{' '}
                      <span className="text-purple-600">{event.event_type}</span>{' '}
                      <span className="text-gray-500">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Why This Matters */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <h3 className="font-semibold text-indigo-900 mb-3">Why This Matters</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-indigo-800">Auditors Trust It</p>
            <p className="text-indigo-600">Tamper-evident hash chaining</p>
          </div>
          <div>
            <p className="font-medium text-indigo-800">Regulators Understand It</p>
            <p className="text-indigo-600">Clear decision audit trail</p>
          </div>
          <div>
            <p className="font-medium text-indigo-800">Customers Sleep Better</p>
            <p className="text-indigo-600">Proof of enforcement</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== Screen 4: Vendor Trust ==============

function VendorTrustView() {
  const [registry, setRegistry] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorDetails, setVendorDetails] = useState(null);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    violation_type: 'data_class_violation',
    description: '',
    events_affected: 0,
    users_affected: 0
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [registryRes, statsRes] = await Promise.all([
        api.get('/vendors/trust-registry'),
        api.get('/vendors/certification-stats')
      ]);
      setRegistry(registryRes.vendors || []);
      setStats(statsRes);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadVendorDetails = async (vendorId) => {
    try {
      const [certRes, violationsRes] = await Promise.all([
        api.get(`/vendors/certifications/${vendorId}`),
        api.get(`/vendors/certifications/${vendorId}/violations`)
      ]);
      setVendorDetails(certRes);
      setViolations(violationsRes.violations || []);
    } catch (e) {
      console.error(e);
    }
  };

  const selectVendor = (vendor) => {
    setSelectedVendor(vendor);
    loadVendorDetails(vendor.vendor_id);
  };

  const reportViolation = async () => {
    if (!selectedVendor || !reportData.description) return;
    try {
      await api.post(`/vendors/certifications/${selectedVendor.vendor_id}/violations`, reportData);
      loadVendorDetails(selectedVendor.vendor_id);
      load();
      setShowReportModal(false);
      setReportData({ violation_type: 'data_class_violation', description: '', events_affected: 0, users_affected: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'certified': return <ShieldCheck className="text-green-500" size={20} />;
      case 'approved': return <Shield className="text-blue-500" size={20} />;
      case 'probation': return <ShieldAlert className="text-amber-500" size={20} />;
      case 'suspended': return <ShieldX className="text-red-500" size={20} />;
      default: return <ShieldQuestion className="text-gray-400" size={20} />;
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'certified': return 'bg-green-100 text-green-700 border-green-200';
      case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'probation': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'suspended': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const violationTypes = [
    { value: 'missing_consent_check', label: 'Missing Consent Check' },
    { value: 'bypassed_proxy', label: 'Bypassed Proxy' },
    { value: 'invalid_token_usage', label: 'Invalid Token Usage' },
    { value: 'unauthorized_data_access', label: 'Unauthorized Data Access' },
    { value: 'data_class_violation', label: 'Data Class Violation' },
    { value: 'cross_site_violation', label: 'Cross-Site Violation' },
    { value: 'purpose_violation', label: 'Purpose Violation' },
    { value: 'missing_audit_trail', label: 'Missing Audit Trail' },
    { value: 'failed_audit', label: 'Failed Audit' },
    { value: 'policy_breach', label: 'Policy Breach' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vendor Trust Registry</h2>
          <p className="text-gray-500 text-sm">Technical reputation, not PR-based</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <StatCard 
            label="Total Vendors" 
            value={stats.total_vendors} 
            icon={Building2} 
            color="blue" 
          />
          <StatCard 
            label="Certified" 
            value={stats.tier_distribution?.certified || 0} 
            icon={ShieldCheck} 
            color="green" 
          />
          <StatCard 
            label="On Probation" 
            value={stats.tier_distribution?.probation || 0} 
            icon={ShieldAlert} 
            color="amber" 
          />
          <StatCard 
            label="Open Violations" 
            value={stats.open_violations} 
            icon={AlertOctagon} 
            color="red" 
          />
          <StatCard 
            label="Avg Compliance" 
            value={`${stats.avg_compliance_rate}%`} 
            icon={TrendingUp} 
            color="green" 
          />
        </div>
      )}

      {/* Explanation Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <h3 className="font-semibold text-indigo-900 mb-2">How Vendor Trust Works</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-green-500" />
              <span className="font-medium text-gray-800">Certified</span>
            </div>
            <p className="text-gray-600">Fully compliant, verified integration, clean history</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-blue-500" />
              <span className="font-medium text-gray-800">Approved</span>
            </div>
            <p className="text-gray-600">Meets requirements, minor issues allowed</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={16} className="text-amber-500" />
              <span className="font-medium text-gray-800">Probation</span>
            </div>
            <p className="text-gray-600">Recent violations, under monitoring</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldX size={16} className="text-red-500" />
              <span className="font-medium text-gray-800">Suspended</span>
            </div>
            <p className="text-gray-600">Serious violations, events blocked</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Trust Registry List */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Public Trust Registry</h3>
          {registry.length === 0 ? (
            <p className="text-gray-500">No vendors registered</p>
          ) : (
            <div className="space-y-3">
              {registry.map(vendor => (
                <div 
                  key={vendor.vendor_id}
                  onClick={() => selectVendor(vendor)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedVendor?.vendor_id === vendor.vendor_id 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTierIcon(vendor.trust_tier)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{vendor.vendor_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getTierColor(vendor.trust_tier)}`}>
                            {vendor.trust_tier.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Compliance: {vendor.compliance_rate}% • 
                          Score: {vendor.trust_score}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {vendor.badges?.map(badge => (
                        <span key={badge} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {badge.replace('_', ' ')}
                        </span>
                      ))}
                      {vendor.has_open_violations && (
                        <AlertTriangle size={16} className="text-amber-500" />
                      )}
                    </div>
                  </div>
                  
                  {/* Trust Score Bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          vendor.trust_score >= 90 ? 'bg-green-500' :
                          vendor.trust_score >= 70 ? 'bg-blue-500' :
                          vendor.trust_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${vendor.trust_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vendor Details Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {selectedVendor && vendorDetails ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{vendorDetails.vendor_name}</h3>
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Report Violation
                </button>
              </div>
              
              {/* Trust Status */}
              <div className={`p-4 rounded-lg ${getTierColor(vendorDetails.trust_tier)}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getTierIcon(vendorDetails.trust_tier)}
                  <span className="font-bold">{vendorDetails.trust_tier.toUpperCase()}</span>
                </div>
                <div className="text-3xl font-bold">{vendorDetails.trust_score}</div>
                <p className="text-sm opacity-75">Trust Score</p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Events Processed</p>
                  <p className="font-bold">{vendorDetails.total_events_processed?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Compliance Rate</p>
                  <p className="font-bold">{vendorDetails.compliance_rate}%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Violations</p>
                  <p className="font-bold">{vendorDetails.total_violations}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Open Violations</p>
                  <p className={`font-bold ${vendorDetails.open_violations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {vendorDetails.open_violations}
                  </p>
                </div>
              </div>
              
              {/* Integration Status */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Integration Status</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    {vendorDetails.gateway_connected ? 
                      <CheckCircle size={14} className="text-green-500" /> : 
                      <XCircle size={14} className="text-red-500" />}
                    <span>Gateway Connected</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {vendorDetails.integration_verified ? 
                      <CheckCircle size={14} className="text-green-500" /> : 
                      <XCircle size={14} className="text-red-500" />}
                    <span>Integration Verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {vendorDetails.logging_enabled ? 
                      <CheckCircle size={14} className="text-green-500" /> : 
                      <XCircle size={14} className="text-red-500" />}
                    <span>Logging Enabled</span>
                  </div>
                </div>
              </div>
              
              {/* Recent Violations */}
              {violations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Violations</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {violations.slice(0, 5).map(v => (
                      <div key={v.id} className="p-2 bg-red-50 rounded border border-red-100 text-sm">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            v.severity === 'critical' ? 'bg-red-200 text-red-800' :
                            v.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                            'bg-amber-200 text-amber-800'
                          }`}>
                            {v.severity}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(v.detected_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 mt-1">{v.description}</p>
                        {v.resolved_at && (
                          <p className="text-xs text-green-600 mt-1">✓ Resolved</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <Award size={48} className="mx-auto mb-4 opacity-30" />
              <p>Select a vendor to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Report Violation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-900 mb-4">Report Violation</h3>
            <p className="text-sm text-gray-500 mb-4">
              Reporting for: <strong>{selectedVendor?.vendor_name}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Violation Type</label>
                <select 
                  value={reportData.violation_type}
                  onChange={(e) => setReportData(prev => ({ ...prev, violation_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {violationTypes.map(vt => (
                    <option key={vt.value} value={vt.value}>{vt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={reportData.description}
                  onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Describe the violation..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Events Affected</label>
                  <input 
                    type="number"
                    value={reportData.events_affected}
                    onChange={(e) => setReportData(prev => ({ ...prev, events_affected: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Users Affected</label>
                  <input 
                    type="number"
                    value={reportData.users_affected}
                    onChange={(e) => setReportData(prev => ({ ...prev, users_affected: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={reportViolation}
                disabled={!reportData.description}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Report Violation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== Screen 5: Settings ==============

function SettingsView() {
  const [activeTab, setActiveTab] = useState('apikeys');
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState(['consent:write', 'events:write']);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState(['*']);
  const [createdKey, setCreatedKey] = useState(null);
  const [createdWebhook, setCreatedWebhook] = useState(null);
  const [showKey, setShowKey] = useState(false);

  const availableScopes = [
    'consent:read', 'consent:write', 'events:write', 
    'audit:read', 'audit:export', 'admin:read', 'admin:write',
    'webhooks:read', 'webhooks:write'
  ];

  const availableEvents = [
    '*', 'consent.issued', 'consent.revoked', 
    'enforcement.allowed', 'enforcement.modified', 'enforcement.blocked'
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        api.get('/api-keys'),
        api.get('/webhooks')
      ]);
      setApiKeys(keysRes.api_keys || []);
      setWebhooks(webhooksRes.webhooks || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createApiKey = async () => {
    if (!newKeyName) return;
    try {
      const res = await api.post('/api-keys', {
        name: newKeyName,
        scopes: newKeyScopes
      });
      setCreatedKey(res.api_key);
      setNewKeyName('');
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const createWebhook = async () => {
    if (!newWebhookUrl) return;
    try {
      const res = await api.post('/webhooks', {
        url: newWebhookUrl,
        events: newWebhookEvents
      });
      setCreatedWebhook(res.webhook);
      setNewWebhookUrl('');
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        {[
          { id: 'apikeys', label: 'API Keys', icon: Key },
          { id: 'webhooks', label: 'Webhooks', icon: Webhook },
          { id: 'integration', label: 'Integration', icon: Code },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* API Keys Tab */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          {/* Created Key Alert */}
          {createdKey && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-green-800">API Key Created!</span>
                <button onClick={() => setCreatedKey(null)} className="text-green-600 hover:text-green-800">
                  <XCircle size={20} />
                </button>
              </div>
              <p className="text-sm text-green-700 mb-2">Save this key now. It won't be shown again.</p>
              <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-green-300">
                <code className="flex-1 text-sm font-mono break-all">
                  {showKey ? createdKey.key : '••••••••••••••••••••••••••••••••'}
                </code>
                <button onClick={() => setShowKey(!showKey)} className="p-1 hover:bg-green-100 rounded">
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => copyToClipboard(createdKey.key)} className="p-1 hover:bg-green-100 rounded">
                  <Copy size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Create New Key */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Create API Key</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Backend"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scopes</label>
                <div className="flex flex-wrap gap-1">
                  {availableScopes.map(scope => (
                    <button
                      key={scope}
                      onClick={() => setNewKeyScopes(prev => 
                        prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
                      )}
                      className={`text-xs px-2 py-1 rounded ${
                        newKeyScopes.includes(scope)
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={createApiKey}
              disabled={!newKeyName}
              className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={16} />
              Create Key
            </button>
          </div>

          {/* Existing Keys */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Existing Keys</h3>
            {apiKeys.length === 0 ? (
              <p className="text-gray-500">No API keys created yet</p>
            ) : (
              <div className="space-y-3">
                {apiKeys.map(key => (
                  <div key={key.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Key size={16} className="text-gray-400" />
                        <span className="font-medium">{key.name || 'Unnamed Key'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {key.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && ` • Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          {/* Created Webhook Alert */}
          {createdWebhook && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-green-800">Webhook Created!</span>
                <button onClick={() => setCreatedWebhook(null)} className="text-green-600 hover:text-green-800">
                  <XCircle size={20} />
                </button>
              </div>
              <p className="text-sm text-green-700 mb-2">Save this secret for verifying signatures.</p>
              <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-green-300">
                <code className="flex-1 text-sm font-mono">{createdWebhook.secret}</code>
                <button onClick={() => copyToClipboard(createdWebhook.secret)} className="p-1 hover:bg-green-100 rounded">
                  <Copy size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Create New Webhook */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Create Webhook</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://your-server.com/webhooks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Events</label>
                <div className="flex flex-wrap gap-1">
                  {availableEvents.map(event => (
                    <button
                      key={event}
                      onClick={() => setNewWebhookEvents(prev => 
                        prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
                      )}
                      className={`text-xs px-2 py-1 rounded ${
                        newWebhookEvents.includes(event)
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={createWebhook}
              disabled={!newWebhookUrl}
              className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={16} />
              Create Webhook
            </button>
          </div>

          {/* Existing Webhooks */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Existing Webhooks</h3>
            {webhooks.length === 0 ? (
              <p className="text-gray-500">No webhooks configured yet</p>
            ) : (
              <div className="space-y-3">
                {webhooks.map(webhook => (
                  <div key={webhook.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Globe size={16} className="text-gray-400" />
                        <span className="font-mono text-sm">{webhook.url}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {webhook.events?.map(event => (
                          <span key={event} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integration Tab */}
      {activeTab === 'integration' && (
        <div className="space-y-6">
          {/* JavaScript SDK */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Code size={18} className="text-amber-500" />
              JavaScript SDK
            </h3>
            <p className="text-sm text-gray-600 mb-4">Add consent collection to your website.</p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono">{`<script src="https://cdn.consent-platform.com/v1/consent.min.js"
  data-auto-init="true"
  data-api-url="${window.location.origin}"
  data-tenant-id="demo-tenant"
></script>`}</pre>
            </div>
            <button 
              onClick={() => copyToClipboard(`<script src="https://cdn.consent-platform.com/v1/consent.min.js" data-auto-init="true" data-api-url="${window.location.origin}" data-tenant-id="demo-tenant"></script>`)}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Copy size={14} /> Copy snippet
            </button>
          </div>

          {/* TCF 2.2 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={18} className="text-blue-500" />
              TCF 2.2 (IAB)
            </h3>
            <p className="text-sm text-gray-600 mb-4">Generate TCF consent strings for ad tech partners.</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">API Endpoint:</p>
              <code className="text-sm text-purple-600">POST /tcf/generate</code>
              <p className="text-xs text-gray-500 mt-2">Returns IAB-compliant TC string for programmatic advertising</p>
            </div>
          </div>

          {/* Google Consent Mode */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={18} className="text-green-500" />
              Google Consent Mode v2
            </h3>
            <p className="text-sm text-gray-600 mb-4">Required for Google Ads/Analytics in EU.</p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">{`// Get default consent script
GET /gcm/default-script?region=EU

// Get update function
GET /gcm/update-function`}</pre>
            </div>
          </div>

          {/* Combined Standards */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
            <h3 className="font-semibold text-indigo-900 mb-2">Generate All Standards at Once</h3>
            <p className="text-sm text-indigo-700 mb-4">Get TCF string + GCM settings in one API call.</p>
            <code className="text-sm bg-white/50 px-3 py-2 rounded block">
              POST /standards/generate-all
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== Helper Components ==============

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
