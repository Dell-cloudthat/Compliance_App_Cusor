import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  FileText,
  Settings,
  BarChart3,
  Bell,
  Key,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  Code,
  ExternalLink,
  Copy,
  ChevronRight,
  Layers,
  Target,
  Activity,
  PieChart,
  Calendar,
  Mail,
  Webhook,
} from 'lucide-react';
import consentApi, {
  organizationApi,
  purposeApi,
  bannerApi,
  dsarApi,
  analyticsApi,
  auditApi,
  subjectApi,
} from '../services/consentApi';
import ConsentBannerWidget from '../components/consent/ConsentBannerWidget';

const ConsentDashboardView = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [organization, setOrganization] = useState(null);
  const [purposes, setPurposes] = useState([]);
  const [banners, setBanners] = useState([]);
  const [dsarRequests, setDsarRequests] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBannerPreview, setShowBannerPreview] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Demo org ID
  const orgId = 'demo-org-001';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [orgRes, purposesRes, bannersRes, dsarRes, analyticsRes, auditRes, subjectsRes] = await Promise.all([
        organizationApi.get(orgId).catch(() => ({ organization: null })),
        purposeApi.list(orgId).catch(() => ({ purposes: [] })),
        bannerApi.list(orgId).catch(() => ({ banners: [] })),
        dsarApi.list(orgId).catch(() => ({ requests: [] })),
        analyticsApi.getSummary(orgId, 30).catch(() => null),
        auditApi.get(orgId, { limit: 50 }).catch(() => ({ audit_logs: [] })),
        subjectApi.list(orgId, 100, 0).catch(() => ({ subjects: [] })),
      ]);

      setOrganization(orgRes.organization);
      setPurposes(purposesRes.purposes || []);
      setBanners(bannersRes.banners || []);
      setDsarRequests(dsarRes.requests || []);
      setAnalytics(analyticsRes);
      setAuditLogs(auditRes.audit_logs || []);
      setSubjects(subjectsRes.subjects || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'purposes', label: 'Consent Purposes', icon: Target },
    { id: 'banners', label: 'Banners', icon: Layers },
    { id: 'subjects', label: 'Data Subjects', icon: Users },
    { id: 'dsar', label: 'DSAR Requests', icon: FileText },
    { id: 'audit', label: 'Audit Log', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  // Overview Tab Component
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Consent Rate"
          value={`${analytics?.accept_rate || 0}%`}
          change={analytics?.accept_rate > 50 ? '+5.2%' : '-2.1%'}
          trend={analytics?.accept_rate > 50 ? 'up' : 'down'}
          icon={CheckCircle2}
          color="green"
        />
        <MetricCard
          title="Total Impressions"
          value={formatNumber(analytics?.total_impressions || 0)}
          change="+12.3%"
          trend="up"
          icon={Eye}
          color="blue"
        />
        <MetricCard
          title="Active Subjects"
          value={formatNumber(subjects.length)}
          change="+8.1%"
          trend="up"
          icon={Users}
          color="purple"
        />
        <MetricCard
          title="Pending DSARs"
          value={dsarRequests.filter(d => d.request_status === 'received').length}
          change=""
          trend="neutral"
          icon={FileText}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consent Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-blue-500" />
            Consent Breakdown (30 days)
          </h3>
          <div className="space-y-4">
            <ConsentBar
              label="Accepted"
              value={analytics?.total_accepts || 0}
              total={analytics?.total_impressions || 1}
              color="bg-green-500"
            />
            <ConsentBar
              label="Rejected"
              value={analytics?.total_rejects || 0}
              total={analytics?.total_impressions || 1}
              color="bg-red-500"
            />
            <ConsentBar
              label="Customized"
              value={analytics?.total_customizes || 0}
              total={analytics?.total_impressions || 1}
              color="bg-blue-500"
            />
          </div>
        </div>

        {/* Purpose Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target size={20} className="text-purple-500" />
            Consent by Purpose
          </h3>
          <div className="space-y-3">
            {purposes.filter(p => !p.is_essential).slice(0, 5).map((purpose) => (
              <div key={purpose.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-gray-900">{purpose.name}</p>
                  <p className="text-xs text-gray-500">{purpose.legal_basis}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {Math.floor(Math.random() * 30 + 60)}%
                  </p>
                  <p className="text-xs text-gray-500">consent rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-amber-500" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {auditLogs.slice(0, 8).map((log, index) => (
            <div key={log.id || index} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className={`p-2 rounded-full ${
                log.action?.includes('given') ? 'bg-green-100 text-green-600' :
                log.action?.includes('withdrawn') ? 'bg-red-100 text-red-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {log.action?.includes('given') ? <CheckCircle2 size={16} /> :
                 log.action?.includes('withdrawn') ? <XCircle size={16} /> :
                 <Activity size={16} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {log.action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
                <p className="text-xs text-gray-500">{formatDate(log.created_at)}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                {log.actor_type || 'system'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Purposes Tab Component
  const PurposesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Consent Purposes</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Plus size={18} />
          Add Purpose
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Legal Basis</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Third Parties</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {purposes.map((purpose) => (
              <tr key={purpose.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{purpose.name}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">{purpose.description}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                    {purpose.legal_basis?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {purpose.is_essential ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Essential</span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Optional</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600">
                    {purpose.third_parties?.length > 0 ? purpose.third_parties.join(', ') : 'None'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    purpose.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {purpose.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit size={16} className="text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" disabled={purpose.is_essential}>
                      <Trash2 size={16} className={purpose.is_essential ? 'text-gray-300' : 'text-red-500'} />
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

  // Banners Tab Component
  const BannersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Consent Banners</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowBannerPreview(!showBannerPreview)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Eye size={18} />
            {showBannerPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
            <Plus size={18} />
            Create Banner
          </button>
        </div>
      </div>

      {showBannerPreview && (
        <div className="relative bg-gray-100 rounded-xl p-8 min-h-[300px]">
          <p className="text-center text-gray-500 mb-4">Banner Preview</p>
          <ConsentBannerWidget
            config={selectedBanner ? {
              banner: selectedBanner,
              purposes: purposes,
              organization: organization
            } : null}
            position="bottom"
            visible={true}
            onAcceptAll={() => alert('Accept All clicked')}
            onRejectAll={() => alert('Reject All clicked')}
            onSavePreferences={(prefs) => alert('Preferences saved: ' + JSON.stringify(prefs))}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-blue-100">
                <Layers size={24} className="text-blue-600" />
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                banner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {banner.status}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{banner.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{banner.banner_type?.replace('_', ' ')}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                {banner.position}
              </span>
              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                {banner.layout}
              </span>
              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                {banner.purposes?.length || 0} purposes
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedBanner(banner)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Eye size={14} />
                Preview
              </button>
              <button className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center justify-center gap-2">
                <Edit size={14} />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Embed Code Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Code size={20} className="text-purple-500" />
          Embed Code
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Add this script to your website to display the consent banner:
        </p>
        <div className="bg-gray-900 rounded-lg p-4 relative">
          <pre className="text-sm text-green-400 overflow-x-auto">
{`<script src="https://consent.example.com/widget.js"></script>
<script>
  ConsentWidget.init({
    organizationId: '${orgId}',
    bannerId: '${banners[0]?.id || 'your-banner-id'}',
  });
</script>`}
          </pre>
          <button 
            className="absolute top-2 right-2 p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            onClick={() => navigator.clipboard.writeText(`...`)}
          >
            <Copy size={16} className="text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );

  // Data Subjects Tab Component
  const SubjectsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Data Subjects</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Seen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subjects.filter(s => 
              !searchTerm || 
              s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              s.external_id?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((subject) => (
              <tr key={subject.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{subject.email || subject.external_id || 'Anonymous'}</p>
                      <p className="text-xs text-gray-500">{subject.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {subject.country_code || 'Unknown'}{subject.region ? `, ${subject.region}` : ''}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(subject.first_seen_at)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(subject.last_seen_at)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View consent">
                      <Eye size={16} className="text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Export data">
                      <Download size={16} className="text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete data">
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

  // DSAR Tab Component
  const DSARTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Data Subject Access Requests</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Plus size={18} />
          New Request
        </button>
      </div>

      {/* DSAR Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-amber-600">
            {dsarRequests.filter(d => d.request_status === 'received').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">
            {dsarRequests.filter(d => d.request_status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {dsarRequests.filter(d => d.request_status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600">0</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requestor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dsarRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No DSAR requests yet
                </td>
              </tr>
            ) : (
              dsarRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-mono text-sm text-gray-900">{request.id?.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      request.request_type === 'deletion' ? 'bg-red-100 text-red-700' :
                      request.request_type === 'access' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {request.request_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{request.requestor_email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(request.submitted_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(request.due_date)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      request.request_status === 'completed' ? 'bg-green-100 text-green-700' :
                      request.request_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      request.request_status === 'received' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {request.request_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      Process
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Audit Log Tab Component
  const AuditTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Audit Log</h2>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Filter size={18} />
            Filter
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {auditLogs.map((log, index) => (
          <div key={log.id || index} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${
                log.action?.includes('given') ? 'bg-green-100 text-green-600' :
                log.action?.includes('withdrawn') ? 'bg-red-100 text-red-600' :
                log.action?.includes('created') ? 'bg-blue-100 text-blue-600' :
                log.action?.includes('deleted') ? 'bg-red-100 text-red-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {log.action?.includes('given') ? <CheckCircle2 size={16} /> :
                 log.action?.includes('withdrawn') ? <XCircle size={16} /> :
                 log.action?.includes('created') ? <Plus size={16} /> :
                 log.action?.includes('deleted') ? <Trash2 size={16} /> :
                 <Activity size={16} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">
                    {log.action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {log.subject_id && (
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      Subject: {log.subject_id.slice(0, 8)}
                    </span>
                  )}
                  {log.purpose_id && (
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      Purpose: {log.purpose_id.slice(0, 12)}
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {log.actor_type || 'system'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Settings Tab Component
  const SettingsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={20} className="text-gray-500" />
            Organization Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
              <input
                type="text"
                value={organization?.name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input
                type="text"
                value={organization?.domain || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy URL</label>
              <input
                type="text"
                value={organization?.privacy_policy_url || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Retention (days)</label>
              <input
                type="number"
                value={organization?.data_retention_days || 365}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key size={20} className="text-gray-500" />
            API Keys
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Use API keys to integrate consent management with your applications.
          </p>
          <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <Plus size={18} />
            Generate New API Key
          </button>
        </div>

        {/* Webhooks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Webhook size={20} className="text-gray-500" />
            Webhooks
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Configure webhooks to receive real-time notifications about consent events.
          </p>
          <button className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <Plus size={18} />
            Add Webhook
          </button>
        </div>

        {/* Compliance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-gray-500" />
            Compliance Settings
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked readOnly className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">GDPR Mode</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked readOnly className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">CCPA Mode</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">LGPD Mode (Brazil)</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">ePrivacy Mode</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500">
                <Shield size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Consent as a Service</h1>
                <p className="text-xs text-gray-500">{organization?.name || 'Loading...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={loadDashboardData}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw size={20} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <ExternalLink size={18} />
                View Live Banner
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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
            <RefreshCw size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'purposes' && <PurposesTab />}
            {activeTab === 'banners' && <BannersTab />}
            {activeTab === 'subjects' && <SubjectsTab />}
            {activeTab === 'dsar' && <DSARTab />}
            {activeTab === 'audit' && <AuditTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </main>
    </div>
  );
};

// Helper Components
const MetricCard = ({ title, value, change, trend, icon: Icon, color }) => {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        {change && (
          <span className={`flex items-center text-sm ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' && <TrendingUp size={16} className="mr-1" />}
            {trend === 'down' && <TrendingDown size={16} className="mr-1" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  );
};

const ConsentBar = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ConsentDashboardView;
