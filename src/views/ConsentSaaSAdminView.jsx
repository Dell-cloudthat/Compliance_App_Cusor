import React, { useState, useEffect } from 'react';
import {
  Building2,
  Key,
  Shield,
  FileText,
  BarChart3,
  Settings,
  Users,
  Globe,
  Zap,
  Activity,
  Database,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Filter,
  Search,
  Play,
} from 'lucide-react';

/**
 * Consent SaaS Admin Dashboard
 * 
 * This is the main admin interface for the Consent as a Service platform.
 * Responsibilities:
 * - Define consent policies
 * - Issue consent authorization tokens  
 * - Map consent → allowed data flows
 * - Manage vendors & purposes
 * - Provide audit & reporting
 */

const API_BASE = 'http://localhost:8000/api/saas';

const ConsentSaaSAdminView = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [flowMappings, setFlowMappings] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [usage, setUsage] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);

  const tenantId = 'demo-tenant';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [tenantRes, policiesRes, tokensRes, mappingsRes, eventsRes, usageRes, keysRes] = await Promise.all([
        fetch(`${API_BASE}/tenants/${tenantId}`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/tenants/${tenantId}/policies`).then(r => r.json()).catch(() => ({ policies: [] })),
        fetch(`${API_BASE}/tenants/${tenantId}/tokens?limit=20`).then(r => r.json()).catch(() => ({ tokens: [] })),
        fetch(`${API_BASE}/tenants/${tenantId}/data-flow-mappings`).then(r => r.json()).catch(() => ({ mappings: [] })),
        fetch(`${API_BASE}/tenants/${tenantId}/audit/events?limit=30`).then(r => r.json()).catch(() => ({ events: [] })),
        fetch(`${API_BASE}/tenants/${tenantId}/usage`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/tenants/${tenantId}/api-keys`).then(r => r.json()).catch(() => ({ api_keys: [] })),
      ]);

      setTenant(tenantRes.tenant);
      setPolicies(policiesRes.policies || []);
      setTokens(tokensRes.tokens || []);
      setFlowMappings(mappingsRes.mappings || []);
      setAuditEvents(eventsRes.events || []);
      setUsage(usageRes);
      setApiKeys(keysRes.api_keys || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'policies', label: 'Policies', icon: Shield },
    { id: 'tokens', label: 'Tokens', icon: Key },
    { id: 'flows', label: 'Data Flow Maps', icon: Activity },
    { id: 'audit', label: 'Audit Log', icon: Database },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Overview Tab
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Policies"
          value={policies.filter(p => p.status === 'active').length}
          total={policies.length}
          icon={Shield}
          color="blue"
        />
        <MetricCard
          label="Tokens Issued"
          value={usage?.current_month?.tokens_issued || 0}
          limit={usage?.limits?.monthly_tokens}
          icon={Key}
          color="purple"
        />
        <MetricCard
          label="API Calls"
          value={usage?.current_month?.api_calls || 0}
          limit={usage?.limits?.monthly_api_calls}
          icon={Zap}
          color="green"
        />
        <MetricCard
          label="Data Flow Maps"
          value={flowMappings.length}
          icon={Activity}
          color="amber"
        />
      </div>

      {/* Platform Architecture */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Architecture</h3>
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <ArchitectureBox
              icon={Shield}
              label="Policy Engine"
              sublabel="Define consent rules"
              color="blue"
            />
            <ArrowRight className="text-gray-400 hidden md:block" />
            <ArchitectureBox
              icon={Key}
              label="Token Service"
              sublabel="Issue signed tokens"
              color="purple"
            />
            <ArrowRight className="text-gray-400 hidden md:block" />
            <ArchitectureBox
              icon={Activity}
              label="Flow Mapping"
              sublabel="Consent → Data flows"
              color="green"
            />
            <ArrowRight className="text-gray-400 hidden md:block" />
            <ArchitectureBox
              icon={Database}
              label="Audit Ledger"
              sublabel="Immutable records"
              color="amber"
            />
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Stateless APIs • Horizontally Scalable • Multi-tenant Isolated
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-gray-500" />
            Recent Audit Events
          </h3>
          <div className="space-y-3">
            {auditEvents.slice(0, 5).map((event, index) => (
              <div key={event.id || index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <div className={`p-1.5 rounded-full ${
                  event.event_type?.includes('granted') || event.event_type?.includes('allowed') 
                    ? 'bg-green-100 text-green-600' 
                    : event.event_type?.includes('blocked') || event.event_type?.includes('revoked')
                    ? 'bg-red-100 text-red-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {event.event_type?.includes('token') ? <Key size={14} /> :
                   event.event_type?.includes('policy') ? <Shield size={14} /> :
                   event.event_type?.includes('consent') ? <CheckCircle2 size={14} /> :
                   <Activity size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {event.event_type?.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key size={18} className="text-gray-500" />
            Recent Tokens
          </h3>
          <div className="space-y-3">
            {tokens.slice(0, 5).map((token, index) => (
              <div key={token.id || index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {token.header?.kid || token.id?.slice(0, 8)}
                  </code>
                  <div>
                    <p className="text-sm text-gray-700">{token.payload?.sub?.slice(0, 12) || 'Subject'}</p>
                    <p className="text-xs text-gray-500">
                      {(token.payload?.consents || []).join(', ')}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  token.status === 'active' ? 'bg-green-100 text-green-700' :
                  token.status === 'revoked' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {token.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Policies Tab
  const PoliciesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Consent Policies</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
          <Plus size={18} />
          Create Policy
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jurisdiction</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rules</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {policies.map((policy) => (
              <tr key={policy.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{policy.name}</p>
                    <p className="text-xs text-gray-500">{policy.description?.slice(0, 50)}...</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                    {policy.jurisdiction?.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {policy.rules?.length || 0} rules
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    policy.default_effect === 'allow' ? 'bg-green-100 text-green-700' :
                    policy.default_effect === 'deny' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {policy.default_effect}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">v{policy.version}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    policy.status === 'active' ? 'bg-green-100 text-green-700' :
                    policy.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {policy.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Eye size={16} className="text-gray-500" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded ml-1">
                    <Edit size={16} className="text-gray-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Policy Rules Preview */}
      {policies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Policy Rules: {policies[0]?.name}</h3>
          <div className="space-y-3">
            {(policies[0]?.rules || []).map((rule, index) => (
              <div key={rule.id || index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {rule.priority}
                    </span>
                    <span className="font-medium text-gray-900">{rule.name}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    rule.effect === 'allow' ? 'bg-green-100 text-green-700' :
                    rule.effect === 'deny' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {rule.effect}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{rule.description}</p>
                {rule.conditions?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {rule.conditions.map((cond, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-gray-200 rounded">
                        {cond.field} {cond.operator} {JSON.stringify(cond.value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Tokens Tab
  const TokensTab = () => {
    const [testSubject, setTestSubject] = useState('user-test-001');
    const [testConsents, setTestConsents] = useState(['marketing', 'analytics']);
    const [issuedToken, setIssuedToken] = useState(null);

    const issueTestToken = async () => {
      try {
        const response = await fetch(`${API_BASE}/tenants/${tenantId}/tokens/issue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: tenantId,
            subject_id: testSubject,
            consents: testConsents,
            expires_in_seconds: 3600
          })
        });
        const result = await response.json();
        if (result.success) {
          setIssuedToken(result);
          loadDashboardData();
        }
      } catch (error) {
        console.error('Failed to issue token:', error);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Consent Tokens</h2>
        </div>

        {/* Token Issuance Test */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key size={18} className="text-purple-500" />
            Issue Test Token
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject ID</label>
              <input
                type="text"
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Consents</label>
              <input
                type="text"
                value={testConsents.join(', ')}
                onChange={(e) => setTestConsents(e.target.value.split(',').map(s => s.trim()))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="marketing, analytics"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={issueTestToken}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2"
              >
                <Key size={16} />
                Issue Token
              </button>
            </div>
          </div>

          {issuedToken && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-700 mb-2">Token Issued Successfully!</p>
              <div className="bg-white p-3 rounded border overflow-x-auto">
                <code className="text-xs break-all">{issuedToken.token}</code>
              </div>
              <p className="text-xs text-green-600 mt-2">Expires: {issuedToken.expires_at}</p>
            </div>
          )}
        </div>

        {/* Token List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consents</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uses</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{token.id?.slice(0, 8)}...</code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{token.payload?.sub}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(token.payload?.consents || []).map((c) => (
                        <span key={c} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{token.use_count || 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(token.issued_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(token.expires_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      token.status === 'active' ? 'bg-green-100 text-green-700' :
                      token.status === 'revoked' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {token.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Data Flow Mappings Tab
  const FlowsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Consent → Data Flow Mappings</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
          <Plus size={18} />
          Create Mapping
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {flowMappings.map((mapping) => (
          <div key={mapping.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{mapping.name}</h3>
                <p className="text-sm text-gray-500">{mapping.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                mapping.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {mapping.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                <Shield size={20} className="text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">Consent Purpose</p>
                  <p className="font-medium text-blue-700">{mapping.consent_purpose}</p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="text-gray-400" />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Allowed Data Categories</p>
                <div className="flex flex-wrap gap-1">
                  {(mapping.allowed_data_categories || []).map((cat) => (
                    <span key={cat} className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">{cat}</span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Allowed Vendors</p>
                <div className="flex flex-wrap gap-1">
                  {(mapping.allowed_vendors || []).map((vendor) => (
                    <span key={vendor} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">{vendor}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Encryption Required</p>
                  <p className="font-medium">{mapping.require_encryption ? '✓ Yes' : '✗ No'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Max Retention</p>
                  <p className="font-medium">{mapping.max_retention_days || 'N/A'} days</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Audit Tab
  const AuditTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Audit Log</h2>
        <div className="flex gap-2">
          <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm">
            <Filter size={16} />
            Filter
          </button>
          <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {auditEvents.map((event, index) => (
          <div key={event.id || index} className="p-4 hover:bg-gray-50">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${
                event.event_type?.includes('granted') || event.event_type?.includes('allowed') || event.event_type?.includes('created')
                  ? 'bg-green-100 text-green-600'
                  : event.event_type?.includes('blocked') || event.event_type?.includes('revoked') || event.event_type?.includes('denied')
                  ? 'bg-red-100 text-red-600'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {event.event_type?.includes('token') ? <Key size={16} /> :
                 event.event_type?.includes('policy') ? <Shield size={16} /> :
                 event.event_type?.includes('consent') ? <CheckCircle2 size={16} /> :
                 event.event_type?.includes('data_flow') ? <Activity size={16} /> :
                 <Database size={16} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">
                    {event.event_type?.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{event.action}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {event.subject_id && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">Subject: {event.subject_id}</span>
                  )}
                  {event.vendor_id && (
                    <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">Vendor: {event.vendor_id}</span>
                  )}
                  <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">{event.actor_type}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Reports Tab
  const ReportsTab = () => {
    const [generatingReport, setGeneratingReport] = useState(null);

    const generateReport = async (type) => {
      setGeneratingReport(type);
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const endpoint = type === 'compliance' 
          ? `${API_BASE}/tenants/${tenantId}/reports/compliance-status`
          : `${API_BASE}/tenants/${tenantId}/reports/${type}`;
        
        const body = type === 'compliance' ? {} : {
          start_date: thirtyDaysAgo.toISOString(),
          end_date: now.toISOString()
        };
        
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        loadDashboardData();
      } catch (error) {
        console.error('Failed to generate report:', error);
      }
      setGeneratingReport(null);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Compliance Reports</h2>
        </div>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { type: 'consent-summary', label: 'Consent Summary', icon: CheckCircle2, color: 'blue' },
            { type: 'data-flow-audit', label: 'Data Flow Audit', icon: Activity, color: 'green' },
            { type: 'compliance', label: 'Compliance Status', icon: Shield, color: 'purple' },
          ].map((report) => (
            <div key={report.type} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className={`p-3 rounded-lg bg-${report.color}-100 w-fit mb-4`}>
                <report.icon size={24} className={`text-${report.color}-600`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{report.label}</h3>
              <p className="text-sm text-gray-500 mb-4">Generate a comprehensive {report.label.toLowerCase()} report</p>
              <button
                onClick={() => generateReport(report.type)}
                disabled={generatingReport === report.type}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generatingReport === report.type ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                Generate Report
              </button>
            </div>
          ))}
        </div>

        {/* Report List would go here */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Generated Reports</h3>
          <p className="text-gray-500 text-sm">Reports will appear here after generation.</p>
        </div>
      </div>
    );
  };

  // Settings Tab
  const SettingsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Tenant Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-gray-500" />
            Tenant Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tenant ID</label>
              <input type="text" value={tenant?.id || ''} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input type="text" value={tenant?.name || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Domain</label>
              <input type="text" value={tenant?.domain || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {tenant?.plan?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key size={18} className="text-gray-500" />
            API Keys
          </h3>
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{key.name}</p>
                  <code className="text-xs text-gray-500">{key.key_prefix}...</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {key.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
            <Plus size={16} />
            Create API Key
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20">
                <Shield size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Consent SaaS Admin</h1>
                <p className="text-white/80 text-sm">{tenant?.name || 'Loading...'}</p>
              </div>
            </div>
            <button
              onClick={loadDashboardData}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
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
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'policies' && <PoliciesTab />}
            {activeTab === 'tokens' && <TokensTab />}
            {activeTab === 'flows' && <FlowsTab />}
            {activeTab === 'audit' && <AuditTab />}
            {activeTab === 'reports' && <ReportsTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </main>
    </div>
  );
};

// Helper Components
const MetricCard = ({ label, value, total, limit, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  const percentage = limit && limit > 0 ? Math.round((value / limit) * 100) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        {percentage !== null && (
          <span className="text-xs text-gray-500">{percentage}% used</span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {total !== undefined && <span className="text-sm text-gray-400">/{total}</span>}
      </p>
      <p className="text-sm text-gray-500">{label}</p>
      {limit && limit > 0 && (
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

const ArchitectureBox = ({ icon: Icon, label, sublabel, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    amber: 'bg-amber-100 text-amber-600 border-amber-200',
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color]} bg-white/50 min-w-[140px]`}>
      <div className="flex flex-col items-center text-center">
        <Icon size={24} className="mb-2" />
        <p className="font-medium text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{sublabel}</p>
      </div>
    </div>
  );
};

export default ConsentSaaSAdminView;
