/**
 * Business Value & TCO Analyzer
 *
 * Three implementation tiers (Conservative / Balanced / Most Aggressive)
 * each backed by:
 *   - Live compliance gap analysis from the user's controls
 *   - Market-priced vendor tool stack
 *   - ROI model tied to company ARR, operating cost, headcount
 *   - Month-by-month implementation timeline
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Shield, Zap, Target, DollarSign,
  Clock, AlertTriangle, CheckCircle, ChevronDown, ChevronRight,
  Sparkles, BarChart3, Users, Database, Server, RefreshCw,
  ArrowUpRight, Award, Loader2, Info, ExternalLink, Check,
} from 'lucide-react';
import { useCompliance } from '../context/ComplianceContext';
import api from '../services/api';

// ── Gap category mapping ──────────────────────────────────────────────────────

const CATEGORY_META = {
  iam:      { label: 'Identity & Access',        prefixes: ['AC-', 'IAM-', 'PA-'],    icon: Users },
  edr:      { label: 'Endpoint Protection',      prefixes: ['EP-', 'EDR-', 'AV-'],    icon: Shield },
  siem:     { label: 'SIEM & Logging',           prefixes: ['AUD-', 'LOG-', 'IR-'],   icon: BarChart3 },
  vm:       { label: 'Vulnerability Mgmt',       prefixes: ['VM-', 'VULN-', 'SCAN-'], icon: Target },
  dlp:      { label: 'Data Protection',          prefixes: ['DM-', 'DS-', 'DLP-'],    icon: Database },
  grc:      { label: 'GRC & Compliance',         prefixes: ['GRC-', 'COMP-', 'POL-'], icon: Award },
  cloud:    { label: 'Cloud Security',           prefixes: ['DC-', 'CLOUD-', 'CSP-'], icon: Server },
  network:  { label: 'Network & Zero Trust',     prefixes: ['NET-', 'FW-', 'ZT-'],    icon: Shield },
  awareness:{ label: 'Security Awareness',       prefixes: ['SA-', 'HR-', 'TRAIN-'],  icon: Users },
};

const TIER_COLOR = {
  conservative: { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-500',   badge: 'bg-blue-500/15 text-blue-500' },
  balanced:     { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', badge: 'bg-indigo-500/15 text-indigo-400' },
  aggressive:   { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500/15 text-purple-400' },
};

function getGapCategory(controlId) {
  if (!controlId) return 'grc';
  const id = controlId.toUpperCase();
  for (const [key, meta] of Object.entries(CATEGORY_META)) {
    if (meta.prefixes.some(p => id.startsWith(p))) return key;
  }
  return 'grc';
}

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(decimals === 0 ? 0 : decimals)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtMo(n) { return `${fmt(n)}/mo`; }
function sign(n) { return n >= 0 ? `+${fmt(n)}` : fmt(n); }

// ── Default (client-side) tier previews before API call ──────────────────────

function clientTierPreview(totalGaps, criticalGaps) {
  const base = Math.max(totalGaps * 180, 5000); // rough $180/gap/mo
  return {
    conservative: { monthly: Math.round(base * 0.5), timeline: 20, coverage: 60, risk_reduction: 45 },
    balanced:     { monthly: Math.round(base * 0.9), timeline: 10, coverage: 80, risk_reduction: 68 },
    aggressive:   { monthly: Math.round(base * 1.5), timeline: 5,  coverage: 100, risk_reduction: 85 },
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'text-foreground', icon: Icon }) {
  return (
    <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function TierCard({ tier, isSelected, onSelect, preview }) {
  const c = TIER_COLOR[tier.key] || TIER_COLOR.balanced;
  const costs = tier.costs || {};
  const roi = tier.roi || {};
  const tools = tier.tools || [];
  const topTools = tools.slice(0, 4);

  return (
    <div
      className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all ${
        isSelected ? `${c.border} ${c.bg}` : 'border-[hsl(var(--border))] hover:border-primary/40'
      }`}
      onClick={onSelect}
    >
      {tier.is_recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-[11px] font-semibold px-3 py-0.5 rounded-full shadow">
            Recommended
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${c.text}`}>
            {tier.subtitle || tier.label}
          </div>
          <div className="text-lg font-bold text-foreground">{tier.label}</div>
        </div>
        {isSelected && <Check className={`w-5 h-5 ${c.text} mt-0.5`} />}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
        {tier.description}
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Monthly cost</span>
          <span className="font-semibold text-foreground">{fmtMo(costs.monthly_license || preview?.monthly)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Year-1 total</span>
          <span className="font-semibold text-foreground">{fmt(costs.total_year_1)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Timeline</span>
          <span className="font-semibold text-foreground">{tier.timeline_months || preview?.timeline} months</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Risk reduction</span>
          <span className={`font-semibold ${c.text}`}>
            {Math.round((tier.breach_risk_reduction || (preview?.risk_reduction / 100) || 0) * 100)}%
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Gaps covered</span>
          <span className="font-semibold text-foreground">
            {Math.round((tier.gap_coverage_pct || (preview?.coverage / 100) || 0) * 100)}%
          </span>
        </div>
        {roi.net_roi_12m !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">12-mo net ROI</span>
            <span className={`font-semibold ${roi.net_roi_12m >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {sign(roi.net_roi_12m)}
            </span>
          </div>
        )}
      </div>

      {topTools.length > 0 && (
        <div className="border-t border-[hsl(var(--border))] pt-3 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Included tools
          </div>
          {topTools.map((t, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-foreground">{t.vendor}</span>
              <span className="text-muted-foreground">{fmtMo(t.monthly_cost)}</span>
            </div>
          ))}
          {tools.length > 4 && (
            <div className="text-[11px] text-muted-foreground">+{tools.length - 4} more tools</div>
          )}
        </div>
      )}

      <button
        type="button"
        className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
          isSelected
            ? `${c.bg} ${c.text} border ${c.border}`
            : 'bg-muted/30 text-foreground hover:bg-muted/60 border border-[hsl(var(--border))]'
        }`}
      >
        {isSelected ? 'Selected ✓' : 'Select this tier'}
      </button>
    </div>
  );
}

function RoiBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{sign(value)}</span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function TCOView() {
  const { controls = [] } = useCompliance();

  // Business inputs
  const [inputs, setInputs] = useState({
    arr: '',
    operating_cost: '',
    headcount: '',
    security_spend: '',
    risk_tolerance: 'balanced',
    frameworks: [],
  });

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState('balanced');
  const [showMarketRef, setShowMarketRef] = useState(false);
  const [showRoiDetail, setShowRoiDetail] = useState(false);

  const ALL_FRAMEWORKS = ['SOC2', 'ISO27001', 'HIPAA', 'PCI-DSS', 'NIST', 'FedRAMP', 'GDPR', 'CIS'];

  // ── Gap analysis from live controls ──────────────────────────────────────
  const gapSummary = useMemo(() => {
    const isGap = c => ['Not Implemented', 'Non-Compliant', 'Partial'].includes(c.status);
    const gaps = controls.filter(isGap);
    const critical = gaps.filter(c => c.priority === 'HIGH' && ['Not Implemented', 'Non-Compliant'].includes(c.status)).length;
    const high = gaps.filter(c => c.priority === 'HIGH' && c.status === 'Partial').length;
    const medium = gaps.filter(c => ['MEDIUM', 'Medium'].includes(c.priority) && isGap(c)).length;
    const low = gaps.filter(c => ['LOW', 'Low', 'INFORMATIONAL'].includes(c.priority) && isGap(c)).length;

    const by_category = {};
    for (const key of Object.keys(CATEGORY_META)) by_category[key] = 0;
    for (const c of gaps) {
      const cat = getGapCategory(c.id);
      by_category[cat] = (by_category[cat] || 0) + 1;
    }

    return { critical, high, medium, low, total: gaps.length, total_controls: controls.length, by_category };
  }, [controls]);

  const preview = useMemo(() => clientTierPreview(gapSummary.total, gapSummary.critical), [gapSummary]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const set = useCallback((key, val) => setInputs(p => ({ ...p, [key]: val })), []);

  const toggleFramework = useCallback(fw => {
    setInputs(p => ({
      ...p,
      frameworks: p.frameworks.includes(fw)
        ? p.frameworks.filter(f => f !== fw)
        : [...p.frameworks, fw],
    }));
  }, []);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        arr: parseFloat(inputs.arr) || 0,
        operating_cost: parseFloat(inputs.operating_cost) || 0,
        headcount: parseInt(inputs.headcount, 10) || 50,
        security_spend: parseFloat(inputs.security_spend) || 0,
        risk_tolerance: inputs.risk_tolerance,
        frameworks: inputs.frameworks,
        gap_summary: gapSummary,
      };
      const result = await api.analyzeTCO(payload);
      setAnalysis(result);
      setSelectedTier(result.recommended_tier || 'balanced');
    } catch (e) {
      setError(e?.message || 'Analysis failed — check your backend connection.');
    } finally {
      setLoading(false);
    }
  }, [inputs, gapSummary]);

  const tiers = analysis?.tiers || {};
  const activeTier = tiers[selectedTier];
  const c = TIER_COLOR[selectedTier] || TIER_COLOR.balanced;

  const TIER_ORDER = ['conservative', 'balanced', 'aggressive'];
  const maxRoi = Math.max(...TIER_ORDER.map(k => tiers[k]?.roi?.net_roi_36m || 0), 1);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Business Value & TCO Analyzer</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Map compliance gaps to market-priced solutions. Model three implementation tiers against your ARR and operating cost.
          </p>
        </div>
        {analysis && (
          <div className="shrink-0 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2 text-sm text-emerald-500 font-medium">
            Analysis ready
          </div>
        )}
      </div>

      {/* ── Gap Intelligence (always live) ── */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Live Compliance Gap Intelligence</h3>
          <span className="text-xs text-muted-foreground ml-auto">{gapSummary.total_controls} controls tracked</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Critical gaps" value={gapSummary.critical} color="text-red-500" sub="HIGH priority + unimplemented" icon={AlertTriangle} />
          <StatCard label="High gaps" value={gapSummary.high} color="text-orange-500" sub="HIGH priority + partial" icon={TrendingDown} />
          <StatCard label="Medium gaps" value={gapSummary.medium} color="text-amber-500" sub="MEDIUM priority" icon={Clock} />
          <StatCard label="Total gaps" value={gapSummary.total} color="text-foreground" sub={`of ${gapSummary.total_controls} controls`} icon={BarChart3} />
        </div>

        {/* Category heatmap */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const count = gapSummary.by_category[key] || 0;
            const heat = count === 0 ? 'bg-muted/20 text-muted-foreground' :
              count <= 2 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
              count <= 5 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
              'bg-red-500/10 text-red-500 border-red-500/20';
            const Icon = meta.icon;
            return (
              <div key={key} className={`rounded-lg border px-2 py-2 text-center ${heat} border-[hsl(var(--border))]`}>
                <div className="text-lg font-bold">{count}</div>
                <div className="text-[10px] leading-tight mt-0.5">{meta.label}</div>
              </div>
            );
          })}
        </div>

        {gapSummary.total === 0 && controls.length > 0 && (
          <div className="mt-3 text-sm text-emerald-500 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            No open gaps detected — all controls are implemented or compliant.
          </div>
        )}
        {controls.length === 0 && (
          <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
            <Info className="w-4 h-4" />
            Connect your backend to load live control status. Gap counts will populate automatically.
          </div>
        )}
      </div>

      {/* ── Business Inputs ── */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Business Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Annual Recurring Revenue (ARR)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                value={inputs.arr}
                onChange={e => set('arr', e.target.value)}
                placeholder="5,000,000"
                className="w-full pl-7 pr-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Annual Operating Cost</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                value={inputs.operating_cost}
                onChange={e => set('operating_cost', e.target.value)}
                placeholder="2,000,000"
                className="w-full pl-7 pr-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Employee Headcount</label>
            <input
              type="number"
              value={inputs.headcount}
              onChange={e => set('headcount', e.target.value)}
              placeholder="75"
              className="w-full px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Current Annual Security Spend</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                value={inputs.security_spend}
                onChange={e => set('security_spend', e.target.value)}
                placeholder="120,000"
                className="w-full pl-7 pr-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Target Compliance Frameworks</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_FRAMEWORKS.map(fw => (
                <button
                  key={fw}
                  type="button"
                  onClick={() => toggleFramework(fw)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    inputs.frameworks.includes(fw)
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-muted/20 border-[hsl(var(--border))] text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {fw}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Implementation Preference</label>
              <select
                value={inputs.risk_tolerance}
                onChange={e => set('risk_tolerance', e.target.value)}
                className="px-3 py-2 bg-card border border-[hsl(var(--border))] rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
              >
                <option value="conservative">Conservative — lowest cost</option>
                <option value="balanced">Balanced — best ROI (recommended)</option>
                <option value="aggressive">Aggressive — fastest timeline</option>
              </select>
            </div>
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Analyzing…' : 'Analyze Now'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* ── Recommendation banner ── */}
      {analysis?.recommendation_reason && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-5 py-3 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-primary font-medium">{analysis.recommendation_reason}</p>
        </div>
      )}

      {/* ── Three Tier Cards ── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Implementation Tiers
          {gapSummary.total > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              — {gapSummary.total} gaps · {gapSummary.critical} critical
            </span>
          )}
        </h3>
        <div className="grid gap-5 md:grid-cols-3">
          {TIER_ORDER.map(key => {
            const tier = tiers[key] || {
              key,
              label: { conservative: 'Conservative', balanced: 'Balanced', aggressive: 'Most Aggressive' }[key],
              subtitle: { conservative: 'Least Aggressive', balanced: 'Aggressive', aggressive: 'Full Remediation' }[key],
              description: {
                conservative: 'Address critical gaps with cost-effective tools over 18-20 months.',
                balanced: 'Risk-optimized coverage across all major control families in 10 months.',
                aggressive: 'Full remediation with best-in-class tools in 5 months.',
              }[key],
              timeline_months: preview[key]?.timeline,
              gap_coverage_pct: preview[key]?.coverage / 100,
              breach_risk_reduction: preview[key]?.risk_reduction / 100,
            };
            return (
              <TierCard
                key={key}
                tier={tier}
                isSelected={selectedTier === key}
                onSelect={() => setSelectedTier(key)}
                preview={preview[key]}
              />
            );
          })}
        </div>
      </div>

      {/* ── Selected Tier Detail ── */}
      {activeTier && (
        <div className={`rounded-2xl border-2 p-6 space-y-6 ${c.border} ${c.bg}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${c.text}`}>
                {activeTier.subtitle}
              </div>
              <h3 className="text-xl font-bold text-foreground">{activeTier.label} — Detailed View</h3>
              <p className="text-sm text-muted-foreground mt-1">{activeTier.narrative}</p>
            </div>
            <div className={`shrink-0 rounded-xl border px-4 py-3 text-center ${c.border} ${c.bg}`}>
              <div className={`text-2xl font-bold ${c.text}`}>{activeTier.timeline_months}mo</div>
              <div className="text-xs text-muted-foreground">timeline</div>
            </div>
          </div>

          {/* Cost + ROI summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Monthly license" value={fmtMo(activeTier.costs?.monthly_license)} sub="recurring" />
            <StatCard label="Year-1 total" value={fmt(activeTier.costs?.total_year_1)} sub="license + setup" />
            <StatCard label="3-year total" value={fmt(activeTier.costs?.total_year_3)} sub="ongoing cost" />
            <StatCard
              label="12-mo net ROI"
              value={sign(activeTier.roi?.net_roi_12m)}
              color={activeTier.roi?.net_roi_12m >= 0 ? 'text-emerald-500' : 'text-red-500'}
              sub={`${activeTier.roi?.payback_months}mo payback`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tool stack */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                Recommended Tool Stack
                <span className="ml-auto text-xs text-muted-foreground">{activeTier.tools?.length} tools</span>
              </h4>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(activeTier.tools || []).map((tool, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border))] bg-muted/20 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{tool.name}</div>
                      <div className="text-xs text-muted-foreground">{tool.category_label} · {tool.controls_count} controls</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-foreground">{fmtMo(tool.monthly_cost)}</div>
                      <div className="text-[11px] text-muted-foreground">+{fmt(tool.setup_cost)} setup</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-3 pt-3 border-t border-[hsl(var(--border))] flex justify-between text-sm font-semibold`}>
                <span className="text-muted-foreground">Total monthly</span>
                <span className={c.text}>{fmtMo(activeTier.costs?.monthly_license)}</span>
              </div>
            </div>

            {/* Implementation milestones */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Implementation Timeline
              </h4>
              <div className="space-y-3">
                {(activeTier.milestones || []).map((m, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${c.border} ${c.text}`}>
                      {m.phase}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-foreground">{m.name}</span>
                        <span className="text-xs text-muted-foreground">Months {m.month_range}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{m.focus}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>+{fmtMo(m.monthly_cost_added)} MRR</span>
                        <span>·</span>
                        <span>{m.controls_addressed} controls addressed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROI breakdown */}
          <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
            <button
              type="button"
              onClick={() => setShowRoiDetail(v => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-foreground"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                ROI Breakdown
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showRoiDetail ? 'rotate-180' : ''}`} />
            </button>
            {showRoiDetail && (
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Annual Benefits</div>
                  <RoiBar label="Breach risk reduction" value={activeTier.roi?.annual_risk_savings} max={activeTier.roi?.avg_breach_cost || 1} color="bg-emerald-500" />
                  <RoiBar label="Fine & penalty avoidance" value={activeTier.roi?.fine_avoidance} max={activeTier.roi?.avg_breach_cost || 1} color="bg-blue-500" />
                  <RoiBar label="Security labor savings" value={activeTier.roi?.labor_savings} max={activeTier.roi?.avg_breach_cost || 1} color="bg-indigo-500" />
                  <RoiBar label="Audit prep savings" value={activeTier.roi?.audit_savings} max={activeTier.roi?.avg_breach_cost || 1} color="bg-purple-500" />
                  <div className="pt-2 border-t border-[hsl(var(--border))] flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">Total annual benefit</span>
                    <span className="text-emerald-500">{fmt(activeTier.roi?.total_annual_benefit)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Net ROI Over Time</div>
                  {[
                    { label: '12 months', value: activeTier.roi?.net_roi_12m, color: 'bg-amber-500' },
                    { label: '24 months', value: activeTier.roi?.net_roi_24m, color: 'bg-orange-500' },
                    { label: '36 months', value: activeTier.roi?.net_roi_36m, color: 'bg-emerald-500' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground w-24">{r.label}</span>
                      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${r.value >= 0 ? r.color : 'bg-red-500'}`}
                          style={{ width: `${Math.max(0, Math.min(100, (r.value / maxRoi) * 100))}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold w-24 text-right ${r.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {sign(r.value)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[hsl(var(--border))] space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Annual breach probability</span>
                      <span>{activeTier.roi?.breach_probability_before}% → {activeTier.roi?.breach_probability_after}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg breach cost modeled</span>
                      <span>{fmt(activeTier.roi?.avg_breach_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payback period</span>
                      <span>{activeTier.roi?.payback_months} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ROI percentage (year 1)</span>
                      <span className={activeTier.roi?.roi_pct >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {activeTier.roi?.roi_pct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tier comparison (when analysis available) ── */}
      {analysis && (
        <div className="bg-card border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
            <h3 className="text-sm font-semibold text-foreground">Side-by-Side Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-muted/20">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Metric</th>
                  {TIER_ORDER.map(k => (
                    <th key={k} className={`text-center py-3 px-4 font-semibold ${TIER_COLOR[k].text}`}>
                      {tiers[k]?.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Monthly cost', fn: k => fmtMo(tiers[k]?.costs?.monthly_license) },
                  { label: 'Year-1 total', fn: k => fmt(tiers[k]?.costs?.total_year_1) },
                  { label: 'Setup / PS cost', fn: k => fmt(tiers[k]?.costs?.one_time_setup) },
                  { label: 'Timeline', fn: k => `${tiers[k]?.timeline_months} months` },
                  { label: 'Gaps covered', fn: k => `${Math.round((tiers[k]?.gap_coverage_pct || 0) * 100)}%` },
                  { label: 'Risk reduction', fn: k => `${Math.round((tiers[k]?.breach_risk_reduction || 0) * 100)}%` },
                  { label: '12-mo net ROI', fn: k => sign(tiers[k]?.roi?.net_roi_12m) },
                  { label: '36-mo net ROI', fn: k => sign(tiers[k]?.roi?.net_roi_36m) },
                  { label: 'Payback period', fn: k => `${tiers[k]?.roi?.payback_months}mo` },
                  { label: 'Tools included', fn: k => `${tiers[k]?.tools?.length || 0} tools` },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-[hsl(var(--border))] ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="py-2.5 px-4 text-muted-foreground">{row.label}</td>
                    {TIER_ORDER.map(k => (
                      <td key={k} className="py-2.5 px-4 text-center font-medium text-foreground">{row.fn(k)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Market Pricing Reference ── */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-xl">
        <button
          type="button"
          onClick={() => setShowMarketRef(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Market Pricing Reference
            <span className="text-xs font-normal text-muted-foreground">
              — {analysis?.market_catalog?.length || 27} tools across {Object.keys(CATEGORY_META).length} categories
            </span>
          </h3>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showMarketRef ? 'rotate-180' : ''}`} />
        </button>
        {showMarketRef && (
          <div className="px-5 pb-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] text-left">
                    <th className="py-2 px-3 font-semibold text-foreground">Tool</th>
                    <th className="py-2 px-3 font-semibold text-foreground">Vendor</th>
                    <th className="py-2 px-3 font-semibold text-foreground">Category</th>
                    <th className="py-2 px-3 font-semibold text-foreground">Tier</th>
                    <th className="py-2 px-3 font-semibold text-foreground text-right">Monthly</th>
                    <th className="py-2 px-3 font-semibold text-foreground text-right">Setup</th>
                    <th className="py-2 px-3 font-semibold text-foreground text-right">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {(analysis?.market_catalog || Object.entries(CATEGORY_META).flatMap(([catKey, catMeta]) =>
                    ['budget', 'mid', 'premium'].map(tier => ({
                      name: `${catMeta.label} (${tier})`, vendor: '—',
                      category_label: catMeta.label, tier,
                      monthly_cost: 0, setup_cost: 0, controls_count: 0,
                    }))
                  )).map((tool, i) => (
                    <tr key={i} className={`border-b border-[hsl(var(--border))] ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="py-2 px-3 font-medium text-foreground">{tool.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{tool.vendor}</td>
                      <td className="py-2 px-3 text-muted-foreground">{tool.category_label}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded border ${
                          tool.tier === 'budget' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          tool.tier === 'mid' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {tool.tier}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">{fmtMo(tool.monthly_cost)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{fmt(tool.setup_cost)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{tool.controls_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * Pricing is market estimate for a 50–250 seat organization. Actual quotes vary by contract volume, negotiation, and configuration.
              Setup costs reflect typical professional services engagement.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
