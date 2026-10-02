/**
 * Consulting Portal View
 * 
 * Comprehensive consulting platform for:
 * - Engagement management
 * - Proprietary assessments
 * - Gap analysis
 * - Roadmap & budget planning
 * - Report generation
 * - MSP portfolio management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Users, FileText, Target, BarChart3, Calendar,
  DollarSign, Clock, CheckCircle2, AlertCircle, TrendingUp,
  Plus, RefreshCw, ChevronRight, Building2, Shield, Gauge,
  FileSpreadsheet, Download, Eye, Edit2, Play, PieChart,
  AlertTriangle, Award, Zap, ArrowRight, Settings, Map,
  ClipboardList, Search, Filter, X, Check, Star, Layers
} from 'lucide-react';

const SERVICE_AREAS = [
  { id: 'compliance', name: 'Compliance', icon: Shield, color: 'blue' },
  { id: 'security_visibility', name: 'Security Visibility', icon: Eye, color: 'purple' },
  { id: 'msp_enablement', name: 'MSP Enablement', icon: Building2, color: 'emerald' },
  { id: 'reporting', name: 'Reporting', icon: FileText, color: 'amber' }
];

const ENGAGEMENT_TYPES = [
  { value: 'assessment', label: 'Security Assessment', description: 'Evaluate current security posture' },
  { value: 'gap_analysis', label: 'Gap Analysis', description: 'Identify compliance gaps' },
  { value: 'roadmap', label: 'Roadmap Development', description: 'Create strategic improvement plan' },
  { value: 'implementation', label: 'Implementation', description: 'Implement security controls' },
  { value: 'managed_services', label: 'Managed Services', description: 'Ongoing security management' },
  { value: 'audit_prep', label: 'Audit Preparation', description: 'Prepare for compliance audits' }
];

export default function ConsultingPortalView({ currentUser }) {
  const userId = currentUser?.id || 1;
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [engagements, setEngagements] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [mspDashboard, setMspDashboard] = useState(null);
  
  // Modal states
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showGapModal, setShowGapModal] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/consulting/dashboard', {
        headers: { 'X-User-Id': userId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
        setEngagements(data.recent_engagements || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  }, [userId]);

  // Fetch all engagements
  const fetchEngagements = useCallback(async () => {
    try {
      const response = await fetch('/api/consulting/engagements', {
        headers: { 'X-User-Id': userId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setEngagements(data.engagements || []);
      }
    } catch (error) {
      console.error('Failed to fetch engagements:', error);
    }
  }, [userId]);

  // Fetch gaps
  const fetchGaps = useCallback(async () => {
    try {
      const response = await fetch('/api/consulting/gaps', {
        headers: { 'X-User-Id': userId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setGaps(data.gaps || []);
      }
    } catch (error) {
      console.error('Failed to fetch gaps:', error);
    }
  }, [userId]);

  // Fetch MSP dashboard
  const fetchMspDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/consulting/msp/dashboard', {
        headers: { 'X-User-Id': userId.toString() }
      });
      if (response.ok) {
        const data = await response.json();
        setMspDashboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch MSP dashboard:', error);
    }
  }, [userId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboard(),
        fetchEngagements(),
        fetchGaps(),
        fetchMspDashboard()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchDashboard, fetchEngagements, fetchGaps, fetchMspDashboard]);

  // Dashboard Tab
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Service Areas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SERVICE_AREAS.map(area => (
          <div
            key={area.id}
            className={`p-5 rounded-xl border-2 border-${area.color}-200 dark:border-${area.color}-800 
              bg-${area.color}-50 dark:bg-${area.color}-900/20 hover:shadow-lg transition-shadow cursor-pointer`}
          >
            <div className={`w-10 h-10 rounded-lg bg-${area.color}-100 dark:bg-${area.color}-900/50 
              flex items-center justify-center mb-3`}>
              <area.icon className={`w-5 h-5 text-${area.color}-600 dark:text-${area.color}-400`} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{area.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Consulting services</p>
          </div>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Active Engagements</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {dashboard?.engagements?.active || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                ${((dashboard?.engagements?.total_revenue || 0) / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Open Gaps</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {dashboard?.gaps?.open || 0}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          {dashboard?.gaps?.critical > 0 && (
            <p className="text-xs text-red-600 mt-2">{dashboard.gaps.critical} critical</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Hours Logged</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {dashboard?.engagements?.total_hours || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={() => setShowEngagementModal(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
              hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all group"
          >
            <Briefcase className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">New Engagement</span>
          </button>

          <button
            onClick={() => setShowAssessmentModal(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
              hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 transition-all group"
          >
            <ClipboardList className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Run Assessment</span>
          </button>

          <button
            onClick={() => setShowGapModal(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
              hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 transition-all group"
          >
            <Target className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Log Gap</span>
          </button>

          <button
            onClick={() => setShowRoadmapModal(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
              hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 transition-all group"
          >
            <Map className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Create Roadmap</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 dark:border-slate-600 
              hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 transition-all group"
          >
            <FileText className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Generate Report</span>
          </button>
        </div>
      </div>

      {/* Recent Engagements */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">Recent Engagements</h3>
          <button
            onClick={() => setActiveTab('engagements')}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {engagements.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No engagements yet</p>
            <button
              onClick={() => setShowEngagementModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first engagement
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {engagements.slice(0, 5).map(eng => (
              <div key={eng.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    eng.engagement_status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    eng.engagement_status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    <Briefcase className={`w-5 h-5 ${
                      eng.engagement_status === 'active' ? 'text-emerald-600' :
                      eng.engagement_status === 'completed' ? 'text-blue-600' :
                      'text-slate-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{eng.engagement_name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{eng.client_name || 'No client'}</span>
                      <span>•</span>
                      <span>{eng.engagement_type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    eng.engagement_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    eng.engagement_status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    eng.engagement_status === 'discovery' ? 'bg-purple-100 text-purple-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {eng.engagement_status}
                  </span>
                  <span className="text-sm text-slate-500">
                    {eng.milestones_completed}/{eng.milestones_total} milestones
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Engagements Tab
  const EngagementsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Consulting Engagements</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage client engagements and track progress</p>
        </div>
        <button
          onClick={() => setShowEngagementModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Engagement
        </button>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-4 gap-4">
        {['discovery', 'active', 'on_hold', 'completed'].map(status => {
          const count = engagements.filter(e => e.engagement_status === status).length;
          const colors = {
            discovery: 'purple',
            active: 'emerald',
            on_hold: 'amber',
            completed: 'blue'
          };
          return (
            <div key={status} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm text-slate-500 capitalize">{status.replace('_', ' ')}</p>
              <p className={`text-2xl font-bold text-${colors[status]}-600 mt-1`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Engagements List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Engagement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {engagements.map(eng => (
                <tr key={eng.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900 dark:text-white">{eng.engagement_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {eng.service_areas?.join(', ')}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {eng.client_name || 'No client'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 capitalize">
                    {eng.engagement_type?.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      eng.engagement_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      eng.engagement_status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      eng.engagement_status === 'discovery' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {eng.engagement_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${(eng.milestones_completed / eng.milestones_total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {eng.milestones_completed}/{eng.milestones_total}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                    ${(eng.engagement_value || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                        <Eye className="w-4 h-4 text-slate-500" />
                      </button>
                      <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Gap Analysis Tab
  const GapsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Gap Analysis</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track and prioritize compliance gaps</p>
        </div>
        <button
          onClick={() => setShowGapModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Gap
        </button>
      </div>

      {/* Gap Stats */}
      <div className="grid grid-cols-4 gap-4">
        {['critical', 'high', 'medium', 'low'].map(impact => {
          const count = gaps.filter(g => g.business_impact === impact).length;
          const colors = { critical: 'red', high: 'orange', medium: 'amber', low: 'emerald' };
          return (
            <div key={impact} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm text-slate-500 capitalize">{impact} Impact</p>
              <p className={`text-2xl font-bold text-${colors[impact]}-600 mt-1`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Gaps List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        {gaps.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No gaps logged yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {gaps.map(gap => (
              <div key={gap.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      gap.business_impact === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
                      gap.business_impact === 'high' ? 'bg-orange-100 dark:bg-orange-900/30' :
                      gap.business_impact === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-emerald-100 dark:bg-emerald-900/30'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        gap.business_impact === 'critical' ? 'text-red-600' :
                        gap.business_impact === 'high' ? 'text-orange-600' :
                        gap.business_impact === 'medium' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{gap.gap_title}</p>
                      <p className="text-sm text-slate-500 mt-1">{gap.gap_description?.substring(0, 100)}...</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {gap.gap_category}
                        </span>
                        <span className="text-xs text-slate-500">Priority: {gap.priority_score}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      gap.status === 'identified' ? 'bg-purple-100 text-purple-700' :
                      gap.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                      gap.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      gap.status === 'remediated' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {gap.status}
                    </span>
                    {gap.estimated_cost && (
                      <span className="text-sm text-slate-500">
                        ${gap.estimated_cost.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // MSP Portfolio Tab
  const MSPPortfolioTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">MSP Portfolio</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage multiple client environments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500">Total Clients</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {mspDashboard?.total_clients || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500">Monthly Recurring Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            ${((mspDashboard?.total_mrr || 0) / 1000).toFixed(1)}k
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500">Avg Compliance Score</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {(mspDashboard?.portfolios?.[0]?.avg_compliance_score || 0).toFixed(0)}%
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-500">Total Open Gaps</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {mspDashboard?.portfolios?.[0]?.total_open_gaps || 0}
          </p>
        </div>
      </div>

      {/* Client List */}
      {mspDashboard?.portfolios?.length > 0 ? (
        mspDashboard.portfolios.map(portfolio => (
          <div key={portfolio.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">{portfolio.portfolio_name}</h3>
            </div>
            {portfolio.clients?.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {portfolio.clients.map(client => (
                  <div key={client.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        client.health_score >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                        client.health_score >= 60 ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <Building2 className={`w-5 h-5 ${
                          client.health_score >= 80 ? 'text-emerald-600' :
                          client.health_score >= 60 ? 'text-amber-600' :
                          'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{client.client_name}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{client.service_tier}</span>
                          <span>•</span>
                          <span>{client.primary_framework || 'No framework'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Health</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{client.health_score || 0}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Compliance</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{client.compliance_score || 0}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">MRR</p>
                        <p className="font-semibold text-emerald-600">${client.mrr || 0}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.risk_rating === 'low' ? 'bg-emerald-100 text-emerald-700' :
                        client.risk_rating === 'medium' ? 'bg-amber-100 text-amber-700' :
                        client.risk_rating === 'high' ? 'bg-orange-100 text-orange-700' :
                        client.risk_rating === 'critical' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {client.risk_rating || 'unrated'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No clients in this portfolio</p>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No portfolios created yet</p>
          <p className="text-sm text-slate-400 mt-2">Create a portfolio to start managing multiple clients</p>
        </div>
      )}
    </div>
  );

  // Reports Tab
  const ReportsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Report Generation</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Generate proprietary reports for clients</p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Report Templates */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Report Types</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { type: 'executive_summary', name: 'Executive Summary', icon: Briefcase, color: 'blue' },
            { type: 'assessment_report', name: 'Assessment Report', icon: ClipboardList, color: 'purple' },
            { type: 'gap_analysis', name: 'Gap Analysis', icon: Target, color: 'amber' },
            { type: 'roadmap', name: 'Roadmap Report', icon: Map, color: 'emerald' }
          ].map(template => (
            <button
              key={template.type}
              onClick={() => setShowReportModal(true)}
              className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-${template.color}-200 
                dark:border-${template.color}-800 bg-${template.color}-50 dark:bg-${template.color}-900/20 
                hover:shadow-lg transition-all`}
            >
              <template.icon className={`w-8 h-8 text-${template.color}-600`} />
              <span className="font-medium text-slate-900 dark:text-white">{template.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Report Generation Info */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <FileText className="w-8 h-8" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Proprietary Reporting Engine</h3>
            <p className="text-blue-100 mb-3">
              Generate professional, branded reports with your own methodology. Reports include:
            </p>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Security maturity scores
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Gap analysis details
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Prioritized recommendations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Budget estimates
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // Engagement Modal
  const EngagementModal = () => {
    const [formData, setFormData] = useState({
      engagement_name: '',
      engagement_type: 'assessment',
      service_areas: [],
      engagement_value: 0,
      billing_type: 'fixed',
      primary_contact_name: '',
      primary_contact_email: ''
    });
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
      if (!formData.engagement_name || formData.service_areas.length === 0) return;
      
      setCreating(true);
      try {
        const response = await fetch('/api/consulting/engagements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId.toString()
          },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
          setShowEngagementModal(false);
          fetchEngagements();
          fetchDashboard();
        }
      } catch (error) {
        console.error('Failed to create engagement:', error);
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">New Engagement</h3>
            <button onClick={() => setShowEngagementModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Engagement Name *
              </label>
              <input
                type="text"
                value={formData.engagement_name}
                onChange={e => setFormData(prev => ({ ...prev, engagement_name: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="e.g., ACME Corp SOC2 Assessment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Engagement Type
              </label>
              <select
                value={formData.engagement_type}
                onChange={e => setFormData(prev => ({ ...prev, engagement_type: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {ENGAGEMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Service Areas *
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_AREAS.map(area => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        service_areas: prev.service_areas.includes(area.id)
                          ? prev.service_areas.filter(a => a !== area.id)
                          : [...prev.service_areas, area.id]
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.service_areas.includes(area.id)
                        ? `bg-${area.color}-100 text-${area.color}-700 border-2 border-${area.color}-500`
                        : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                    }`}
                  >
                    {area.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Engagement Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                  <input
                    type="number"
                    value={formData.engagement_value}
                    onChange={e => setFormData(prev => ({ ...prev, engagement_value: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-7 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                      bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Billing Type
                </label>
                <select
                  value={formData.billing_type}
                  onChange={e => setFormData(prev => ({ ...prev, billing_type: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                    bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Hourly</option>
                  <option value="retainer">Retainer</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Primary Contact
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.primary_contact_name}
                  onChange={e => setFormData(prev => ({ ...prev, primary_contact_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                    bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="Contact name"
                />
                <input
                  type="email"
                  value={formData.primary_contact_email}
                  onChange={e => setFormData(prev => ({ ...prev, primary_contact_email: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                    bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="Contact email"
                />
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              onClick={() => setShowEngagementModal(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!formData.engagement_name || formData.service_areas.length === 0 || creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Engagement
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Navigation tabs
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'engagements', label: 'Engagements', icon: Briefcase },
    { id: 'gaps', label: 'Gap Analysis', icon: Target },
    { id: 'msp', label: 'MSP Portfolio', icon: Building2 },
    { id: 'reports', label: 'Reports', icon: FileText }
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Consulting Portal</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage engagements, assessments, roadmaps, and reports
          </p>
        </div>
        <button
          onClick={() => {
            fetchDashboard();
            fetchEngagements();
            fetchGaps();
            fetchMspDashboard();
          }}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
        >
          <RefreshCw className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors
              ${activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'engagements' && <EngagementsTab />}
        {activeTab === 'gaps' && <GapsTab />}
        {activeTab === 'msp' && <MSPPortfolioTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>

      {/* Modals */}
      {showEngagementModal && <EngagementModal />}
    </div>
  );
}
