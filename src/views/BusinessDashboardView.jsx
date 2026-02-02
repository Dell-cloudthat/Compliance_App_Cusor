import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Users, FileText, Target,
  ArrowUpRight, ArrowDownRight, Calendar, Clock,
  CheckCircle2, XCircle, AlertCircle, BarChart3,
  PieChart, Activity, Briefcase, Building2, ChevronRight,
  Plus, Filter, MoreVertical, Star, Award, Zap
} from 'lucide-react';
import api from '../services/api';

export default function BusinessDashboardView({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [dashboardData, setDashboardData] = useState(null);
  
  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);
  
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await api.getPipelineDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      // Use demo data
      setDashboardData(getDemoData());
    } finally {
      setLoading(false);
    }
  };
  
  const getDemoData = () => ({
    totals: {
      total_opportunities: 12,
      total_pipeline_value: 285000,
      weighted_pipeline_value: 178500
    },
    stages: [
      { id: 1, stage_name: 'Lead', stage_order: 1, probability_percent: 10, opportunity_count: 4, stage_value: 80000 },
      { id: 2, stage_name: 'Qualified', stage_order: 2, probability_percent: 25, opportunity_count: 3, stage_value: 75000 },
      { id: 3, stage_name: 'Proposal', stage_order: 3, probability_percent: 50, opportunity_count: 3, stage_value: 90000 },
      { id: 4, stage_name: 'Negotiation', stage_order: 4, probability_percent: 75, opportunity_count: 2, stage_value: 40000 },
      { id: 5, stage_name: 'Closed Won', stage_order: 5, probability_percent: 100, opportunity_count: 5, stage_value: 125000 },
      { id: 6, stage_name: 'Closed Lost', stage_order: 6, probability_percent: 0, opportunity_count: 2, stage_value: 35000 }
    ],
    proposal_stats: {
      won: 5,
      lost: 2,
      pending: 5
    },
    win_rate: 71.4,
    recent_proposals: [
      { id: 1, proposal_number: 'PROP-2026-0008', proposal_name: 'TechFlow - SOC 2', client_name: 'TechFlow Inc', proposal_status: 'sent', total_price: 35000, created_at: '2026-01-23' },
      { id: 2, proposal_number: 'PROP-2026-0007', proposal_name: 'HealthMax - HIPAA', client_name: 'HealthMax', proposal_status: 'accepted', total_price: 42000, created_at: '2026-01-21' },
      { id: 3, proposal_number: 'PROP-2026-0006', proposal_name: 'FinServ - ISO 27001', client_name: 'FinServ LLC', proposal_status: 'sent', total_price: 55000, created_at: '2026-01-19' }
    ],
    revenue_this_month: 87000,
    revenue_last_month: 75000,
    active_engagements: 8,
    completed_this_month: 3,
    avg_deal_size: 32500,
    total_clients: 24
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const data = dashboardData || getDemoData();
  const revenueGrowth = data.revenue_last_month > 0 
    ? ((data.revenue_this_month - data.revenue_last_month) / data.revenue_last_month * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Dashboard</h2>
          <p className="text-gray-500 mt-1">Overview of your consulting business</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>
      
      {/* Top KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className={`flex items-center gap-1 text-sm ${parseFloat(revenueGrowth) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {parseFloat(revenueGrowth) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(revenueGrowth)}%
            </span>
          </div>
          <p className="text-white/70 text-sm">Revenue This Month</p>
          <p className="text-3xl font-bold">${(data.revenue_this_month || 0).toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">Pipeline Value</p>
          <p className="text-3xl font-bold text-gray-900">${(data.totals?.total_pipeline_value || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Weighted: ${(data.totals?.weighted_pipeline_value || 0).toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">Win Rate</p>
          <p className="text-3xl font-bold text-gray-900">{data.win_rate || 0}%</p>
          <p className="text-xs text-gray-400 mt-1">{data.proposal_stats?.won || 0} won / {(data.proposal_stats?.won || 0) + (data.proposal_stats?.lost || 0)} decided</p>
        </div>
        
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">Active Clients</p>
          <p className="text-3xl font-bold text-gray-900">{data.total_clients || 0}</p>
          <p className="text-xs text-gray-400 mt-1">{data.active_engagements || 0} active engagements</p>
        </div>
      </div>
      
      {/* Pipeline Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            Sales Pipeline
          </h3>
        </div>
        <div className="p-4">
          <div className="flex items-end justify-between gap-2">
            {(data.stages || []).filter(s => s.stage_order <= 5).map((stage, idx) => {
              const maxValue = Math.max(...(data.stages || []).filter(s => s.stage_order <= 4).map(s => s.stage_value || 0));
              const height = maxValue > 0 ? Math.max(20, ((stage.stage_value || 0) / maxValue) * 150) : 20;
              const colors = ['bg-gray-400', 'bg-blue-400', 'bg-yellow-400', 'bg-orange-400', 'bg-green-500'];
              
              return (
                <div key={stage.id} className="flex-1 text-center">
                  <div className="relative group">
                    <div
                      className={`${colors[idx] || 'bg-gray-400'} rounded-t-lg transition-all hover:opacity-80 mx-auto`}
                      style={{ 
                        height: `${height}px`,
                        width: '80%',
                        minHeight: '20px'
                      }}
                    />
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {stage.opportunity_count} opportunities
                      <br />
                      ${(stage.stage_value || 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-900">{stage.stage_name}</p>
                    <p className="text-xs text-gray-500">${((stage.stage_value || 0) / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-gray-400">{stage.opportunity_count} deals</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Proposals */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              Recent Proposals
            </h3>
            <button className="text-sm text-primary hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-100">
            {(data.recent_proposals || []).slice(0, 5).map(proposal => (
              <div key={proposal.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{proposal.proposal_name}</p>
                    <p className="text-sm text-gray-500">{proposal.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${proposal.total_price?.toLocaleString()}</p>
                    <span className={`
                      inline-block px-2 py-0.5 rounded-full text-xs font-medium
                      ${proposal.proposal_status === 'accepted' ? 'bg-green-100 text-green-700' :
                        proposal.proposal_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        proposal.proposal_status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'}
                    `}>
                      {proposal.proposal_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {(data.recent_proposals || []).length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No recent proposals</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="space-y-4">
          {/* Proposal Stats */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-gray-500" />
              Proposal Performance
            </h3>
            
            <div className="flex items-center justify-center gap-8">
              {/* Simple Donut Chart Representation */}
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="64"
                    cy="64"
                    r="50"
                    stroke="#f3f4f6"
                    strokeWidth="12"
                    fill="none"
                  />
                  {/* Won segment */}
                  <circle
                    cx="64"
                    cy="64"
                    r="50"
                    stroke="#22c55e"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(data.proposal_stats?.won || 0) / ((data.proposal_stats?.won || 0) + (data.proposal_stats?.lost || 0) + (data.proposal_stats?.pending || 0) || 1) * 314} 314`}
                  />
                  {/* Lost segment */}
                  <circle
                    cx="64"
                    cy="64"
                    r="50"
                    stroke="#ef4444"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(data.proposal_stats?.lost || 0) / ((data.proposal_stats?.won || 0) + (data.proposal_stats?.lost || 0) + (data.proposal_stats?.pending || 0) || 1) * 314} 314`}
                    strokeDashoffset={`-${(data.proposal_stats?.won || 0) / ((data.proposal_stats?.won || 0) + (data.proposal_stats?.lost || 0) + (data.proposal_stats?.pending || 0) || 1) * 314}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{(data.proposal_stats?.won || 0) + (data.proposal_stats?.lost || 0) + (data.proposal_stats?.pending || 0)}</span>
                  <span className="text-xs text-gray-500">Total</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">Won</span>
                  <span className="font-semibold ml-auto">{data.proposal_stats?.won || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-600">Lost</span>
                  <span className="font-semibold ml-auto">{data.proposal_stats?.lost || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-semibold ml-auto">{data.proposal_stats?.pending || 0}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Business Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" />
              Key Metrics
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Avg Deal Size</p>
                <p className="text-xl font-bold text-gray-900">${(data.avg_deal_size || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Completed This Month</p>
                <p className="text-xl font-bold text-gray-900">{data.completed_this_month || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Open Opportunities</p>
                <p className="text-xl font-bold text-gray-900">{data.totals?.total_opportunities || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Active Engagements</p>
                <p className="text-xl font-bold text-gray-900">{data.active_engagements || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4">
          <button className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left group">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <p className="font-medium text-gray-900">New Client</p>
            <p className="text-sm text-gray-500">Start onboarding</p>
          </button>
          
          <button className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left group">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="font-medium text-gray-900">Create Proposal</p>
            <p className="text-sm text-gray-500">Generate quote</p>
          </button>
          
          <button className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left group">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
              <Briefcase className="w-5 h-5 text-green-600" />
            </div>
            <p className="font-medium text-gray-900">New Engagement</p>
            <p className="text-sm text-gray-500">Start project</p>
          </button>
          
          <button className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all text-left group">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="font-medium text-gray-900">Generate Report</p>
            <p className="text-sm text-gray-500">Client deliverable</p>
          </button>
        </div>
      </div>
    </div>
  );
}
