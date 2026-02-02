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
              { id: 'audit', label: 'Audit Export', icon: FileText },
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
        {activeView === 'audit' && <AuditExportView />}
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
