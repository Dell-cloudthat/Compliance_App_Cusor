import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Zap,
  Server,
  Activity,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Play,
  Settings,
  Filter,
  Hash,
  Lock,
  Unlock,
  Eye,
  BarChart3,
  Globe,
  Building2,
  Send,
  FileText,
} from 'lucide-react';

/**
 * Enforcement Proxy Dashboard
 * 
 * Server-Side Event Proxy - the high-performance enforcement plane.
 * 
 * Architecture:
 *   Website / App
 *        ↓ (Server-side events)
 *   Enforcement Proxy
 *        ↓ (Token validation, policy eval, transform)
 *   Ad Platform (Meta, Google, DSP)
 *        ↓ (Log everything)
 *   Immutable Event Store
 */

const API_BASE = 'http://localhost:8000/api/proxy';

const EnforcementProxyView = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [eventStoreStats, setEventStoreStats] = useState(null);
  const [chainVerification, setChainVerification] = useState(null);
  const [config, setConfig] = useState(null);
  
  // Demo event state
  const [demoResult, setDemoResult] = useState(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoSettings, setDemoSettings] = useState({
    eventType: 'Purchase',
    platform: 'meta',
    withConsent: true,
  });

  const tenantId = 'demo-tenant';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, decisionsRes, storeRes, configRes] = await Promise.all([
        fetch(`${API_BASE}/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/tenants/${tenantId}/decisions?limit=50`).then(r => r.json()).catch(() => ({ decisions: [] })),
        fetch(`${API_BASE}/event-store/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/tenants/${tenantId}/config`).then(r => r.json()).catch(() => ({ config: null })),
      ]);

      setStats(statsRes);
      setDecisions(decisionsRes.decisions || []);
      setEventStoreStats(storeRes);
      setConfig(configRes.config);

      // Verify chain
      const verifyRes = await fetch(`${API_BASE}/tenants/${tenantId}/decisions/verify`).then(r => r.json()).catch(() => null);
      setChainVerification(verifyRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runDemoEvent = async () => {
    setDemoRunning(true);
    setDemoResult(null);
    try {
      const response = await fetch(`${API_BASE}/demo/generate-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: demoSettings.eventType,
          platform: demoSettings.platform,
          with_consent: demoSettings.withConsent,
          tenant_id: tenantId,
        }),
      });
      const result = await response.json();
      setDemoResult(result);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Demo event failed:', error);
      setDemoResult({ error: error.message });
    }
    setDemoRunning(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'decisions', label: 'Decisions', icon: Activity },
    { id: 'eventstore', label: 'Event Store', icon: Database },
    { id: 'demo', label: 'Live Demo', icon: Play },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  // Overview Tab
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Architecture Diagram */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Server-Side Enforcement Architecture</h3>
        <div className="bg-gradient-to-b from-blue-50 to-green-50 rounded-xl p-8">
          <div className="flex flex-col items-center gap-4">
            {/* Website/App */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border-2 border-blue-200 w-full max-w-md">
              <Globe size={24} className="text-blue-500" />
              <div>
                <p className="font-semibold text-gray-900">Website / App</p>
                <p className="text-sm text-gray-500">Server-side ad events</p>
              </div>
            </div>
            
            <ArrowRight size={24} className="text-gray-400 rotate-90" />
            
            {/* Enforcement Proxy */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl shadow-lg w-full max-w-md">
              <Shield size={24} />
              <div className="flex-1">
                <p className="font-semibold">Enforcement Proxy</p>
                <p className="text-sm text-purple-100">Token validation • Policy eval • Transform</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-200">Latency</p>
                <p className="font-mono font-bold">{stats?.average_latency_ms || 0}ms</p>
              </div>
            </div>
            
            <ArrowRight size={24} className="text-gray-400 rotate-90" />
            
            {/* Ad Platforms */}
            <div className="flex gap-4 w-full max-w-md">
              {['Meta', 'Google', 'DSP'].map((platform) => (
                <div key={platform} className="flex-1 p-3 bg-white rounded-lg shadow-sm border border-gray-200 text-center">
                  <Building2 size={20} className="mx-auto text-gray-500 mb-1" />
                  <p className="text-sm font-medium">{platform}</p>
                </div>
              ))}
            </div>
            
            <ArrowRight size={24} className="text-gray-400 rotate-90" />
            
            {/* Immutable Store */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border-2 border-green-200 w-full max-w-md">
              <Database size={24} className="text-green-500" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Immutable Event Store</p>
                <p className="text-sm text-gray-500">Hash-chained audit log</p>
              </div>
              {chainVerification?.valid && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  <CheckCircle2 size={12} />
                  Verified
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Events Processed"
          value={stats?.events_processed || 0}
          icon={Zap}
          color="blue"
        />
        <StatCard
          label="Allow Rate"
          value={`${stats?.allow_rate || 0}%`}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Avg Latency"
          value={`${stats?.average_latency_ms || 0}ms`}
          icon={Clock}
          color="purple"
        />
        <StatCard
          label="Events Blocked"
          value={stats?.events_blocked || 0}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Enforcement Breakdown</h3>
          <div className="space-y-4">
            <ProgressBar
              label="Allowed"
              value={stats?.events_allowed || 0}
              total={stats?.events_processed || 1}
              color="bg-green-500"
            />
            <ProgressBar
              label="Stripped (PII removed)"
              value={stats?.events_stripped || 0}
              total={stats?.events_processed || 1}
              color="bg-amber-500"
            />
            <ProgressBar
              label="Blocked"
              value={stats?.events_blocked || 0}
              total={stats?.events_processed || 1}
              color="bg-red-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Event Store Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Events</span>
              <span className="font-mono font-semibold">{eventStoreStats?.total_events || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Events/Second</span>
              <span className="font-mono font-semibold">{eventStoreStats?.events_per_second || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Latest Sequence</span>
              <span className="font-mono font-semibold">#{eventStoreStats?.latest_sequence || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Chain Integrity</span>
              <span className={`flex items-center gap-1 ${chainVerification?.valid ? 'text-green-600' : 'text-red-600'}`}>
                {chainVerification?.valid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {chainVerification?.valid ? 'Valid' : 'Invalid'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Decisions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-blue-500" />
          Recent Enforcement Decisions
        </h3>
        <div className="space-y-2">
          {decisions.slice(0, 5).map((decision, index) => (
            <DecisionRow key={index} decision={decision} />
          ))}
        </div>
      </div>
    </div>
  );

  // Decisions Tab
  const DecisionsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Enforcement Decisions</h2>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {decisions.map((decision, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDate(decision.data?.timestamp || decision.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {(decision.data?.event_id || decision.event_id || '').slice(0, 8)}...
                  </code>
                </td>
                <td className="px-4 py-3 text-sm">
                  {decision.data?.platform || decision.platform || 'N/A'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    (decision.data?.action || decision.action) === 'allow' ? 'bg-green-100 text-green-700' :
                    (decision.data?.action || decision.action) === 'block' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {decision.data?.action || decision.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {(decision.data?.token_valid ?? decision.token_valid) ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle2 size={12} /> Valid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 text-xs">
                      <XCircle size={12} /> Invalid
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {(decision.data?.latency_ms || decision.latency_ms || 0).toFixed(2)}ms
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs text-gray-400">
                    {(decision.data?.decision_hash || decision.hash || '').slice(0, 8)}...
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Event Store Tab
  const EventStoreTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Database size={24} className="text-green-500" />
          Immutable Event Store
        </h2>
        <button
          onClick={async () => {
            const result = await fetch(`${API_BASE}/event-store/verify`).then(r => r.json());
            setChainVerification(result);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Lock size={16} />
          Verify Chain
        </button>
      </div>

      {/* Store Properties */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Store Properties</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <PropertyCard icon={Hash} label="Hash Chaining" value="SHA-256" />
          <PropertyCard icon={Lock} label="Append-Only" value="Enforced" />
          <PropertyCard icon={Clock} label="Time-Stamped" value="UTC" />
          <PropertyCard icon={Filter} label="Queryable" value="Yes" />
        </div>
      </div>

      {/* Chain Verification */}
      {chainVerification && (
        <div className={`rounded-xl border-2 p-6 ${
          chainVerification.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {chainVerification.valid ? (
              <CheckCircle2 size={24} className="text-green-600" />
            ) : (
              <XCircle size={24} className="text-red-600" />
            )}
            <h3 className={`font-semibold ${chainVerification.valid ? 'text-green-800' : 'text-red-800'}`}>
              Chain Integrity: {chainVerification.valid ? 'VERIFIED' : 'BROKEN'}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Events Checked</p>
              <p className="font-mono font-semibold">{chainVerification.events_checked}</p>
            </div>
            <div>
              <p className="text-gray-500">Latest Sequence</p>
              <p className="font-mono font-semibold">#{chainVerification.latest_sequence || 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Latest Hash</p>
              <p className="font-mono text-xs">{chainVerification.latest_hash?.slice(0, 16)}...</p>
            </div>
          </div>
        </div>
      )}

      {/* Why This Matters */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <h3 className="font-semibold text-indigo-900 mb-4">Why This Matters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/50 rounded-lg">
            <p className="font-medium text-indigo-800">Auditors Trust It</p>
            <p className="text-sm text-indigo-600 mt-1">Tamper-evident logging that can be independently verified</p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg">
            <p className="font-medium text-indigo-800">Regulators Understand It</p>
            <p className="text-sm text-indigo-600 mt-1">Clear audit trail of every consent enforcement decision</p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg">
            <p className="font-medium text-indigo-800">Customers Sleep Better</p>
            <p className="text-sm text-indigo-600 mt-1">Proof that consent preferences are actually enforced</p>
          </div>
        </div>
        <p className="text-xs text-indigo-500 mt-4 text-center">
          This is NOT blockchain marketing nonsense. It's security-grade logging.
        </p>
      </div>
    </div>
  );

  // Demo Tab
  const DemoTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Live Demo</h2>
      </div>

      {/* Demo Flow Visualization */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Event Flow</h3>
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex-1 p-4 border-2 border-blue-200 rounded-xl text-center bg-blue-50">
            <p className="font-medium text-blue-800">1. User Consents</p>
            <p className="text-xs text-blue-600">Token issued with scope</p>
          </div>
          <ArrowRight className="text-gray-400" />
          <div className="flex-1 p-4 border-2 border-purple-200 rounded-xl text-center bg-purple-50">
            <p className="font-medium text-purple-800">2. Ad Event Occurs</p>
            <p className="text-xs text-purple-600">Token attached to request</p>
          </div>
          <ArrowRight className="text-gray-400" />
          <div className="flex-1 p-4 border-2 border-green-200 rounded-xl text-center bg-green-50">
            <p className="font-medium text-green-800">3. Enforcement</p>
            <p className="text-xs text-green-600">Allow / Strip / Block</p>
          </div>
        </div>
      </div>

      {/* Demo Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Generate Test Event</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
            <select
              value={demoSettings.eventType}
              onChange={(e) => setDemoSettings(prev => ({ ...prev, eventType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="Purchase">Purchase</option>
              <option value="AddToCart">Add to Cart</option>
              <option value="PageView">Page View</option>
              <option value="Lead">Lead</option>
              <option value="Subscribe">Subscribe</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Platform</label>
            <select
              value={demoSettings.platform}
              onChange={(e) => setDemoSettings(prev => ({ ...prev, platform: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="meta">Meta (Facebook)</option>
              <option value="google">Google Ads</option>
              <option value="dsp_generic">Generic DSP</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Consent</label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={demoSettings.withConsent}
                onChange={(e) => setDemoSettings(prev => ({ ...prev, withConsent: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Include valid consent token</span>
            </label>
          </div>
          <div className="flex items-end">
            <button
              onClick={runDemoEvent}
              disabled={demoRunning}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {demoRunning ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send Event
            </button>
          </div>
        </div>

        {/* Demo Result */}
        {demoResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            demoResult.decision?.allowed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {demoResult.decision?.allowed ? (
                <CheckCircle2 className="text-green-500" size={20} />
              ) : (
                <XCircle className="text-red-500" size={20} />
              )}
              <span className={`font-medium ${demoResult.decision?.allowed ? 'text-green-700' : 'text-red-700'}`}>
                {demoResult.decision?.action?.toUpperCase() || 'ERROR'}
              </span>
              <span className="text-xs text-gray-500 ml-auto">
                {demoResult.decision?.latency_ms?.toFixed(2)}ms
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-gray-500">Token Valid</p>
                <p className={demoResult.decision?.token_valid ? 'text-green-600' : 'text-red-600'}>
                  {demoResult.decision?.token_valid ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Fields Stripped</p>
                <p>{demoResult.decision?.fields_stripped?.length || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Forwarded</p>
                <p className={demoResult.decision?.forwarded ? 'text-green-600' : 'text-gray-600'}>
                  {demoResult.decision?.forwarded ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Platform Response</p>
                <p>{demoResult.decision?.platform_response_code || '-'}</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mt-3 p-2 bg-white/50 rounded">
              <strong>Reason:</strong> {demoResult.decision?.reason}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Config Tab
  const ConfigTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Proxy Configuration</h2>

      {config && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Failure Mode</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${
                config.failure_mode === 'fail_closed' ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Lock size={20} className="text-red-500" />
                  <span className="font-medium">Fail Closed</span>
                  {config.failure_mode === 'fail_closed' && (
                    <span className="ml-auto px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Active</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">Block on error (security)</p>
              </div>
              <div className={`p-4 rounded-lg border-2 ${
                config.failure_mode === 'fail_open' ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Unlock size={20} className="text-green-500" />
                  <span className="font-medium">Fail Open</span>
                  {config.failure_mode === 'fail_open' && (
                    <span className="ml-auto px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Active</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">Allow on error (availability)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Timeout</span>
                <span className="font-mono">{config.timeout_ms}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Max Retries</span>
                <span className="font-mono">{config.max_retries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rate Limit</span>
                <span className="font-mono">{config.rate_limit_per_second}/sec</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">PII Fields</h3>
            <div className="flex flex-wrap gap-2">
              {(config.pii_fields || []).map((field) => (
                <span key={field} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                  {field}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Fields to Strip (No Consent)</h3>
            <div className="flex flex-wrap gap-2">
              {(config.strip_fields_on_no_consent || []).map((field) => (
                <span key={field} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                  {field}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20">
                <Server size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Enforcement Proxy</h1>
                <p className="text-white/80 text-sm">Server-Side Event Processing</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-purple-200">Events/sec</p>
                <p className="font-mono font-bold">{eventStoreStats?.events_per_second || 0}</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && !stats ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={32} className="animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'decisions' && <DecisionsTab />}
            {activeTab === 'eventstore' && <EventStoreTab />}
            {activeTab === 'demo' && <DemoTab />}
            {activeTab === 'config' && <ConfigTab />}
          </>
        )}
      </main>
    </div>
  );
};

// Helper Components
const StatCard = ({ label, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
};

const ProgressBar = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const PropertyCard = ({ icon: Icon, label, value }) => (
  <div className="p-4 bg-gray-50 rounded-lg text-center">
    <Icon size={20} className="mx-auto text-gray-500 mb-2" />
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-sm">{value}</p>
  </div>
);

const DecisionRow = ({ decision }) => {
  const data = decision.data || decision;
  const action = data.action || 'unknown';
  const allowed = data.allowed;
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-full ${
        allowed ? 'bg-green-100' : 'bg-red-100'
      }`}>
        {allowed ? (
          <CheckCircle2 size={16} className="text-green-600" />
        ) : (
          <XCircle size={16} className="text-red-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {action.toUpperCase()} - {data.platform || 'unknown'}
        </p>
        <p className="text-xs text-gray-500">{data.reason?.slice(0, 50)}...</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-mono text-gray-600">{data.latency_ms?.toFixed(2)}ms</p>
      </div>
    </div>
  );
};

export default EnforcementProxyView;
