import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Server,
  Building2,
  FileText,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Play,
  Eye,
  Lock,
  Unlock,
  Database,
  Activity,
  TrendingUp,
  Filter,
  Hash,
  Link2,
  Zap,
  Users,
  Globe,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import consentFlowApi, {
  tokenApi,
  vendorApi,
  proxyRuleApi,
  evidenceApi,
  flowSessionApi,
  completeFlowApi,
} from '../services/consentFlowApi';

const ConsentFlowView = () => {
  const [activeTab, setActiveTab] = useState('flow');
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [proxyRules, setProxyRules] = useState([]);
  const [evidenceEntries, setEvidenceEntries] = useState([]);
  const [flowSessions, setFlowSessions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [chainVerification, setChainVerification] = useState(null);
  
  // Demo flow state
  const [flowDemo, setFlowDemo] = useState({
    running: false,
    currentStage: null,
    results: null,
  });
  
  // Form state for demo
  const [demoForm, setDemoForm] = useState({
    subjectId: 'user-demo-001',
    purposes: ['purpose-marketing', 'purpose-analytics'],
    vendorId: 'vendor-google-ads',
    data: {
      email: 'demo@example.com',
      user_id: 'usr_123456',
      event: 'purchase',
      value: 99.99,
    },
  });

  const orgId = 'demo-org-001';

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [vendorsRes, rulesRes, evidenceRes, sessionsRes, statsRes, tokensRes] = await Promise.all([
        vendorApi.list(orgId).catch(() => ({ vendors: [] })),
        proxyRuleApi.list(orgId, false).catch(() => ({ rules: [] })),
        evidenceApi.getEntries(orgId, { limit: 50 }).catch(() => ({ entries: [] })),
        flowSessionApi.list(orgId, { limit: 20 }).catch(() => ({ sessions: [] })),
        flowSessionApi.getStatistics(orgId, 30).catch(() => null),
        tokenApi.list(orgId).catch(() => ({ tokens: [] })),
      ]);

      setVendors(vendorsRes.vendors || []);
      setProxyRules(rulesRes.rules || []);
      setEvidenceEntries(evidenceRes.entries || []);
      setFlowSessions(sessionsRes.sessions || []);
      setStatistics(statsRes);
      setTokens(tokensRes.tokens || []);
      
      // Verify chain integrity
      const verifyRes = await evidenceApi.verify(orgId).catch(() => null);
      setChainVerification(verifyRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const runDemoFlow = async () => {
    setFlowDemo({ running: true, currentStage: 'consent', results: null });
    
    try {
      // Simulate stage progression
      await new Promise(r => setTimeout(r, 500));
      setFlowDemo(prev => ({ ...prev, currentStage: 'token' }));
      
      await new Promise(r => setTimeout(r, 500));
      setFlowDemo(prev => ({ ...prev, currentStage: 'proxy' }));
      
      await new Promise(r => setTimeout(r, 500));
      setFlowDemo(prev => ({ ...prev, currentStage: 'vendor' }));
      
      // Execute the actual flow
      const result = await completeFlowApi.execute(orgId, {
        subjectId: demoForm.subjectId,
        purposes: demoForm.purposes,
        vendorId: demoForm.vendorId,
        data: demoForm.data,
      });
      
      await new Promise(r => setTimeout(r, 500));
      setFlowDemo({ running: false, currentStage: 'evidence', results: result });
      
      // Reload data to show new entries
      loadAllData();
    } catch (error) {
      console.error('Flow execution failed:', error);
      setFlowDemo({ running: false, currentStage: 'failed', results: { error: error.message } });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const tabs = [
    { id: 'flow', label: 'Flow Visualization', icon: Activity },
    { id: 'vendors', label: 'Vendors', icon: Building2 },
    { id: 'rules', label: 'Proxy Rules', icon: Filter },
    { id: 'tokens', label: 'Tokens', icon: Key },
    { id: 'evidence', label: 'Evidence Ledger', icon: Database },
    { id: 'sessions', label: 'Flow Sessions', icon: Clock },
  ];

  // Flow Visualization Tab
  const FlowVisualizationTab = () => (
    <div className="space-y-8">
      {/* Flow Diagram */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Consent Flow Architecture</h3>
        
        {/* Visual Flow */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-2 mb-8">
          <FlowStage
            icon={Users}
            label="User Consent"
            description="User grants consent for data processing"
            color="blue"
            active={flowDemo.currentStage === 'consent'}
            completed={['token', 'proxy', 'vendor', 'evidence'].includes(flowDemo.currentStage) || flowDemo.results}
          />
          
          <FlowArrow />
          
          <FlowStage
            icon={Key}
            label="Authorization Token"
            description="Token issued based on consent scope"
            color="purple"
            active={flowDemo.currentStage === 'token'}
            completed={['proxy', 'vendor', 'evidence'].includes(flowDemo.currentStage) || flowDemo.results}
          />
          
          <FlowArrow />
          
          <FlowStage
            icon={Shield}
            label="Ad Data Proxy"
            description="Enforcement layer applies rules"
            color="amber"
            active={flowDemo.currentStage === 'proxy'}
            completed={['vendor', 'evidence'].includes(flowDemo.currentStage) || flowDemo.results}
          />
          
          <FlowArrow />
          
          <FlowStage
            icon={Building2}
            label="Vendor / Platform"
            description="Data sent to authorized vendor"
            color="green"
            active={flowDemo.currentStage === 'vendor'}
            completed={['evidence'].includes(flowDemo.currentStage) || flowDemo.results}
          />
          
          <FlowArrow />
          
          <FlowStage
            icon={Database}
            label="Evidence Ledger"
            description="Immutable audit trail recorded"
            color="red"
            active={flowDemo.currentStage === 'evidence'}
            completed={flowDemo.results?.success}
          />
        </div>

        {/* Demo Controls */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Test Flow Execution</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject ID</label>
              <input
                type="text"
                value={demoForm.subjectId}
                onChange={(e) => setDemoForm(prev => ({ ...prev, subjectId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
              <select
                value={demoForm.vendorId}
                onChange={(e) => setDemoForm(prev => ({ ...prev, vendorId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Purposes</label>
              <div className="flex flex-wrap gap-1">
                {['purpose-marketing', 'purpose-analytics'].map(p => (
                  <label key={p} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={demoForm.purposes.includes(p)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDemoForm(prev => ({ ...prev, purposes: [...prev.purposes, p] }));
                        } else {
                          setDemoForm(prev => ({ ...prev, purposes: prev.purposes.filter(x => x !== p) }));
                        }
                      }}
                      className="rounded"
                    />
                    {p.replace('purpose-', '')}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={runDemoFlow}
                disabled={flowDemo.running}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {flowDemo.running ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Play size={18} />
                )}
                Run Flow
              </button>
            </div>
          </div>

          {/* Flow Results */}
          {flowDemo.results && (
            <div className={`mt-4 p-4 rounded-lg ${
              flowDemo.results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {flowDemo.results.success ? (
                  <CheckCircle2 className="text-green-500" size={20} />
                ) : (
                  <XCircle className="text-red-500" size={20} />
                )}
                <span className={`font-medium ${flowDemo.results.success ? 'text-green-700' : 'text-red-700'}`}>
                  Flow {flowDemo.results.success ? 'Completed Successfully' : 'Failed'}
                </span>
              </div>
              
              {flowDemo.results.flow && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <div className="bg-white p-2 rounded border">
                    <p className="text-gray-500">Consent</p>
                    <p className="font-medium text-green-600">✓ Token Issued</p>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <p className="text-gray-500">Token</p>
                    <p className="font-mono text-gray-700">{flowDemo.results.flow.stage_2_token?.token_prefix}...</p>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <p className="text-gray-500">Proxy Action</p>
                    <p className="font-medium">{flowDemo.results.flow.stage_3_proxy?.action_taken}</p>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <p className="text-gray-500">Vendor</p>
                    <p className={flowDemo.results.flow.stage_4_vendor?.data_sent ? 'text-green-600' : 'text-red-600'}>
                      {flowDemo.results.flow.stage_4_vendor?.data_sent ? 'Data Sent' : 'Blocked'}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <p className="text-gray-500">Evidence</p>
                    <p className="font-medium">{flowDemo.results.flow.stage_5_evidence?.entries_recorded} entries</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Flows"
            value={statistics.total_flows}
            icon={Activity}
            color="blue"
          />
          <StatCard
            label="Success Rate"
            value={`${statistics.success_rate}%`}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="Transactions"
            value={statistics.total_transactions}
            icon={Zap}
            color="purple"
          />
          <StatCard
            label="Evidence Entries"
            value={statistics.evidence_entries}
            icon={Database}
            color="amber"
          />
        </div>
      )}

      {/* Chain Verification */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Lock size={20} className="text-purple-500" />
            Evidence Chain Integrity
          </h3>
          <button
            onClick={async () => {
              const result = await evidenceApi.verify(orgId);
              setChainVerification(result);
            }}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Verify
          </button>
        </div>
        
        {chainVerification && (
          <div className={`p-4 rounded-lg ${
            chainVerification.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {chainVerification.valid ? (
                <CheckCircle2 className="text-green-500" size={20} />
              ) : (
                <XCircle className="text-red-500" size={20} />
              )}
              <span className={`font-medium ${chainVerification.valid ? 'text-green-700' : 'text-red-700'}`}>
                Chain is {chainVerification.valid ? 'Valid' : 'Invalid'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
              <div>
                <p className="text-gray-500">Entries Verified</p>
                <p className="font-mono">{chainVerification.entries_checked}</p>
              </div>
              <div>
                <p className="text-gray-500">Latest Sequence</p>
                <p className="font-mono">{chainVerification.latest_sequence || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Latest Hash</p>
                <p className="font-mono text-xs truncate">{chainVerification.latest_hash?.slice(0, 16)}...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Vendors Tab
  const VendorsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Registered Vendors</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
          <Plus size={18} />
          Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  vendor.vendor_type === 'ad_platform' ? 'bg-blue-100' :
                  vendor.vendor_type === 'analytics' ? 'bg-purple-100' :
                  vendor.vendor_type === 'marketing' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Building2 size={20} className={
                    vendor.vendor_type === 'ad_platform' ? 'text-blue-600' :
                    vendor.vendor_type === 'analytics' ? 'text-purple-600' :
                    vendor.vendor_type === 'marketing' ? 'text-green-600' : 'text-gray-600'
                  } />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                  <p className="text-xs text-gray-500">{vendor.vendor_code}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {vendor.status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Globe size={14} />
                <span>{vendor.integration_type}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {vendor.gdpr_compliant && (
                  <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">GDPR</span>
                )}
                {vendor.ccpa_compliant && (
                  <span className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded">CCPA</span>
                )}
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">Data Categories:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(vendor.data_categories_received || []).slice(0, 3).map((cat) => (
                    <span key={cat} className="px-2 py-0.5 text-xs bg-gray-100 rounded">{cat}</span>
                  ))}
                  {(vendor.data_categories_received || []).length > 3 && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                      +{vendor.data_categories_received.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Proxy Rules Tab
  const ProxyRulesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Proxy Enforcement Rules</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
          <Plus size={18} />
          Add Rule
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matches</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {proxyRules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium">
                    {rule.rule_order}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{rule.name}</p>
                  <p className="text-xs text-gray-500">{rule.description}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {rule.match_vendors && (
                      <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                        {rule.match_vendors.length} vendors
                      </span>
                    )}
                    {rule.match_geo_locations && (
                      <span className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded">
                        {rule.match_geo_locations.join(', ')}
                      </span>
                    )}
                    {rule.match_purposes && (
                      <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded">
                        {rule.match_purposes.length} purposes
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    rule.action === 'allow' ? 'bg-green-100 text-green-700' :
                    rule.action === 'block' ? 'bg-red-100 text-red-700' :
                    rule.action === 'filter' ? 'bg-amber-100 text-amber-700' :
                    rule.action === 'anonymize' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {rule.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Edit size={16} className="text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-red-50 rounded">
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Tokens Tab
  const TokensTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Authorization Tokens</h2>
        <div className="flex gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purposes</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uses</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tokens.map((token) => (
              <tr key={token.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-purple-500" />
                    <code className="text-sm font-mono">{token.token_prefix}...</code>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {token.subject_id?.slice(0, 12)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(token.granted_purposes || []).map((p) => (
                      <span key={p} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                        {p.replace('purpose-', '')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {token.use_count}{token.max_uses ? ` / ${token.max_uses}` : ''}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(token.expires_at)}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    token.status === 'active' ? 'bg-green-100 text-green-700' :
                    token.status === 'revoked' ? 'bg-red-100 text-red-700' :
                    token.status === 'expired' ? 'bg-gray-100 text-gray-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {token.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {token.status === 'active' && (
                    <button 
                      onClick={() => tokenApi.revoke(token.id, 'Manual revocation')}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Evidence Ledger Tab
  const EvidenceLedgerTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Database size={24} className="text-purple-500" />
          Immutable Evidence Ledger
        </h2>
        <div className="flex items-center gap-2">
          {chainVerification?.valid && (
            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              <CheckCircle2 size={14} />
              Chain Verified
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {evidenceEntries.map((entry, index) => (
          <div key={entry.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  entry.event_type.includes('given') || entry.event_type.includes('allowed') ? 'bg-green-100' :
                  entry.event_type.includes('withdrawn') || entry.event_type.includes('blocked') ? 'bg-red-100' :
                  entry.event_type.includes('token') ? 'bg-purple-100' :
                  'bg-blue-100'
                }`}>
                  {entry.event_type.includes('token') ? <Key size={16} className="text-purple-600" /> :
                   entry.event_type.includes('vendor') ? <Building2 size={16} className="text-blue-600" /> :
                   entry.event_type.includes('consent') ? <Shield size={16} className="text-green-600" /> :
                   <FileText size={16} className="text-gray-600" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {entry.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(entry.event_timestamp)}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.subject_id && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                        Subject: {entry.subject_id.slice(0, 8)}
                      </span>
                    )}
                    {entry.vendor_id && (
                      <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                        Vendor: {entry.vendor_id.slice(0, 12)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-gray-400">#{entry.sequence_number}</span>
                <div className="flex items-center gap-1 mt-1">
                  <Hash size={12} className="text-gray-400" />
                  <code className="text-xs text-gray-500">{entry.entry_hash?.slice(0, 12)}...</code>
                </div>
                {entry.previous_hash && (
                  <div className="flex items-center gap-1 mt-1">
                    <Link2 size={12} className="text-gray-400" />
                    <code className="text-xs text-gray-400">{entry.previous_hash?.slice(0, 8)}...</code>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Flow Sessions Tab
  const FlowSessionsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Flow Sessions</h2>
        <div className="flex gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flow ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evidence</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {flowSessions.map((session) => (
              <tr key={session.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <code className="text-sm font-mono text-purple-600">{session.flow_id}</code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {session.consent_subject_id?.slice(0, 12) || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {session.vendor_id?.replace('vendor-', '') || '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    session.current_stage === 'completed' ? 'bg-green-100 text-green-700' :
                    session.current_stage === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {session.current_stage}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {session.proxy_action || '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {session.ledger_entries_count || 0} entries
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    session.status === 'completed' ? 'bg-green-100 text-green-700' :
                    session.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {session.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDate(session.started_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20">
              <Activity size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Consent Flow Architecture</h1>
              <p className="text-white/80 mt-1">
                User Consent → Authorization Token → Ad Data Proxy → Vendor → Evidence Ledger
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap text-sm
                  ${activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={32} className="animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {activeTab === 'flow' && <FlowVisualizationTab />}
            {activeTab === 'vendors' && <VendorsTab />}
            {activeTab === 'rules' && <ProxyRulesTab />}
            {activeTab === 'tokens' && <TokensTab />}
            {activeTab === 'evidence' && <EvidenceLedgerTab />}
            {activeTab === 'sessions' && <FlowSessionsTab />}
          </>
        )}
      </main>
    </div>
  );
};

// Helper Components
const FlowStage = ({ icon: Icon, label, description, color, active, completed }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-500' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500' },
    red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-500' },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`
      flex flex-col items-center p-4 rounded-xl border-2 transition-all min-w-[140px]
      ${active ? `${colors.border} ${colors.bg} scale-105` : 
        completed ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}
    `}>
      <div className={`p-3 rounded-full ${completed ? 'bg-green-100' : colors.bg} mb-2`}>
        {completed ? (
          <CheckCircle2 size={24} className="text-green-600" />
        ) : (
          <Icon size={24} className={active ? colors.text : 'text-gray-400'} />
        )}
      </div>
      <p className={`font-medium text-sm ${active ? colors.text : completed ? 'text-green-700' : 'text-gray-700'}`}>
        {label}
      </p>
      <p className="text-xs text-gray-500 text-center mt-1">{description}</p>
    </div>
  );
};

const FlowArrow = () => (
  <div className="hidden lg:flex items-center px-2">
    <ArrowRight size={24} className="text-gray-300" />
  </div>
);

const StatCard = ({ label, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
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

export default ConsentFlowView;
