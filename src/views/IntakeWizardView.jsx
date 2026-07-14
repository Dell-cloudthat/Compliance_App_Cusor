/**
 * AI Compliance Intake Assessment Wizard
 *
 * A 6-step guided wizard that learns about the customer's organisation,
 * regulatory environment, security posture, and goals — then uses a
 * backend scoring engine to recommend the right compliance frameworks
 * and generate a prioritised implementation roadmap.
 */

import React, { useState, useCallback } from 'react';
import {
  Building2, Shield, CheckCircle2, Target, Sparkles, Map,
  ChevronRight, ChevronLeft, X, AlertTriangle, Clock,
  DollarSign, TrendingUp, Zap, ExternalLink, Download,
  Globe, Users, Database, Brain, CreditCard, Briefcase,
  Activity, FileCheck, Star, ArrowRight, CheckCheck,
  AlertCircle, Info, Award, BarChart3
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';

// ────────────────────────────────────────────────────────────────────────────
// Wizard step definitions
// ────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'org',        label: 'Organisation',         icon: Building2,   desc: 'Tell us about your company' },
  { id: 'regulatory', label: 'Regulatory',            icon: Shield,      desc: 'Regulations that apply to you' },
  { id: 'posture',    label: 'Security Posture',      icon: CheckCircle2,desc: 'Your current security maturity' },
  { id: 'goals',      label: 'Business Goals',        icon: Target,      desc: 'What you want to achieve' },
  { id: 'analysis',   label: 'AI Analysis',           icon: Sparkles,    desc: 'Your personalised recommendations' },
  { id: 'roadmap',    label: 'Roadmap',               icon: Map,         desc: 'Your implementation plan' },
];

const INDUSTRIES = [
  { value: 'Healthcare',        icon: '🏥', label: 'Healthcare & Life Sciences' },
  { value: 'Financial',         icon: '🏦', label: 'Financial Services & Fintech' },
  { value: 'Government',        icon: '🏛️',  label: 'Government & Public Sector' },
  { value: 'Technology',        icon: '💻', label: 'Technology & SaaS' },
  { value: 'Retail',            icon: '🛒', label: 'Retail & E-commerce' },
  { value: 'Education',         icon: '🎓', label: 'Education' },
  { value: 'Other',             icon: '🏢', label: 'Other' },
];

const SIZES = [
  { value: '1-50',    label: '1 – 50',     sub: 'Startup / SMB' },
  { value: '51-200',  label: '51 – 200',   sub: 'Growth stage' },
  { value: '201-1000',label: '201 – 1,000',sub: 'Mid-market' },
  { value: '1000+',   label: '1,000+',     sub: 'Enterprise' },
];

const DATA_TYPES = [
  { value: 'PII',         label: 'Personal Data (PII)',     icon: Users,     desc: 'Names, emails, addresses, IDs' },
  { value: 'PHI',         label: 'Health Data (PHI)',       icon: Activity,  desc: 'Medical records, health info' },
  { value: 'Financial',   label: 'Financial Data',          icon: CreditCard,desc: 'Payment cards, bank accounts' },
  { value: 'Federal/CUI', label: 'Federal / CUI',           icon: Shield,    desc: 'Controlled unclassified info' },
  { value: 'AI/ML',       label: 'AI / ML Data',            icon: Brain,     desc: 'Training data, model artefacts' },
];

const CERTIFICATIONS = ['SOC2', 'ISO27001', 'PCI_DSS', 'HIPAA', 'FedRAMP', 'NIST_800-171'];

const GOALS = [
  { value: 'Win customers',       icon: TrendingUp,  label: 'Win enterprise customers', sub: 'Customers require proof of compliance' },
  { value: 'Reduce risk',         icon: Shield,      label: 'Reduce security risk',     sub: 'Protect the business from breaches' },
  { value: 'Regulatory',          icon: FileCheck,   label: 'Meet a legal requirement', sub: 'A regulation requires this' },
  { value: 'Investment',          icon: DollarSign,  label: 'Investment / IPO readiness',sub: 'Investors / acquirers expect it' },
  { value: 'Customer requirement',icon: Briefcase,   label: 'Customer contract',        sub: 'A specific customer is asking' },
];

const BUDGETS = [
  { value: '<$50K',       label: '< $50K',        sub: 'Bootstrap / limited' },
  { value: '$50K-$200K',  label: '$50K – $200K',  sub: 'Growth investment' },
  { value: '$200K-$500K', label: '$200K – $500K', sub: 'Serious commitment' },
  { value: '$500K+',      label: '$500K+',         sub: 'Enterprise programme' },
];

const PRIORITY_COLOURS = {
  Critical: { bg: 'bg-red-500/10',    border: 'border-red-500/30',    badge: 'bg-red-500/20 text-red-400',    dot: 'bg-red-500' },
  High:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', badge: 'bg-orange-500/20 text-orange-400',dot: 'bg-orange-500' },
  Medium:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400',dot: 'bg-yellow-500' },
  Low:      { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   badge: 'bg-blue-500/20 text-blue-400',  dot: 'bg-blue-500' },
  Optional: { bg: 'bg-muted/30',      border: 'border-muted',         badge: 'bg-muted text-muted-foreground',dot: 'bg-muted-foreground' },
};

const PHASE_COLOURS = [
  { border: 'border-red-500/40',    bg: 'bg-red-500/5',    label_bg: 'bg-red-500',    text: 'text-red-400' },
  { border: 'border-orange-500/40', bg: 'bg-orange-500/5', label_bg: 'bg-orange-500', text: 'text-orange-400' },
  { border: 'border-blue-500/40',   bg: 'bg-blue-500/5',   label_bg: 'bg-blue-500',   text: 'text-blue-400' },
  { border: 'border-muted',         bg: 'bg-muted/20',      label_bg: 'bg-muted-foreground',text: 'text-muted-foreground' },
];

// ────────────────────────────────────────────────────────────────────────────
// Default wizard state
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_ANSWERS = {
  industry: '',
  company_size: '',
  geography: 'US Only',
  data_types: [],
  government_contractor: false,
  federal_agency_customer: false,
  handles_phi: false,
  processes_payments: false,
  enterprise_customers: false,
  eu_customers: false,
  seeking_investment_ipo: false,
  ai_products: false,
  existing_certifications: [],
  has_security_team: false,
  has_edr: false,
  has_siem: false,
  had_breach: false,
  primary_goal: '',
  timeline_months: 12,
  budget_tier: '$50K-$200K',
  desired_frameworks: [],
};

// ────────────────────────────────────────────────────────────────────────────
// Small re-usable components
// ────────────────────────────────────────────────────────────────────────────

function SelectCard({ selected, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left border rounded-xl p-4 transition-all ${
        selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary'
          : 'border-[hsl(var(--border))] bg-card hover:border-primary/50 hover:bg-muted/30'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full group"
    >
      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{label}</span>
      <div className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  );
}

function MultiCheck({ options, selected, onChange, columns = 2 }) {
  const toggle = (val) => onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-3`}>
      {options.map(opt => (
        <SelectCard key={opt.value || opt} selected={selected.includes(opt.value || opt)} onClick={() => toggle(opt.value || opt)}>
          <div className="flex items-center gap-3">
            {opt.icon && <opt.icon className="w-4 h-4 text-primary shrink-0" />}
            <div>
              <div className="text-sm font-medium text-foreground">{opt.label || opt}</div>
              {opt.desc && <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>}
            </div>
            {selected.includes(opt.value || opt) && <CheckCheck className="w-4 h-4 text-primary ml-auto shrink-0" />}
          </div>
        </SelectCard>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Wizard step panels
// ────────────────────────────────────────────────────────────────────────────

function StepOrg({ answers, set }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Industry</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {INDUSTRIES.map(ind => (
            <SelectCard key={ind.value} selected={answers.industry === ind.value} onClick={() => set('industry', ind.value)}>
              <div className="text-center">
                <div className="text-2xl mb-1">{ind.icon}</div>
                <div className="text-xs font-medium text-foreground">{ind.label}</div>
              </div>
            </SelectCard>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Company size</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SIZES.map(sz => (
            <SelectCard key={sz.value} selected={answers.company_size === sz.value} onClick={() => set('company_size', sz.value)}>
              <div className="font-bold text-lg text-foreground">{sz.label}</div>
              <div className="text-xs text-muted-foreground">{sz.sub}</div>
            </SelectCard>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Geographic presence</h3>
        <div className="grid grid-cols-3 gap-3">
          {['US Only', 'US + EU', 'Global'].map(geo => (
            <SelectCard key={geo} selected={answers.geography === geo} onClick={() => set('geography', geo)}>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{geo}</span>
              </div>
            </SelectCard>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Data types you handle <span className="normal-case font-normal text-muted-foreground">(select all that apply)</span></h3>
        <MultiCheck options={DATA_TYPES} selected={answers.data_types} onChange={v => set('data_types', v)} />
      </div>
    </div>
  );
}

function StepRegulatory({ answers, set }) {
  const items = [
    { key: 'government_contractor',   label: 'We are a government contractor (DoD / federal supply chain)' },
    { key: 'federal_agency_customer', label: 'We sell cloud services directly to US federal agencies' },
    { key: 'handles_phi',             label: 'We create, receive, or transmit protected health information (PHI)' },
    { key: 'processes_payments',      label: 'We store, process, or transmit payment card data' },
    { key: 'enterprise_customers',    label: 'We sell to enterprise / Fortune-2000 customers who ask for compliance evidence' },
    { key: 'eu_customers',            label: 'We have customers or employees in the European Union' },
    { key: 'seeking_investment_ipo',  label: 'We are seeking investment, acquisition, or planning an IPO within 2 years' },
    { key: 'ai_products',             label: 'We build or deploy AI / ML systems as a core product capability' },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        Select everything that applies. These signals drive which frameworks are mandatory vs recommended.
      </p>
      {items.map(item => (
        <div key={item.key} className="bg-card border border-[hsl(var(--border))] rounded-xl px-4 py-3">
          <Toggle checked={answers[item.key]} onChange={v => set(item.key, v)} label={item.label} />
        </div>
      ))}
    </div>
  );
}

function StepPosture({ answers, set }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Existing certifications</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CERTIFICATIONS.map(cert => (
            <SelectCard
              key={cert}
              selected={answers.existing_certifications.includes(cert)}
              onClick={() => {
                const cur = answers.existing_certifications;
                set('existing_certifications', cur.includes(cert) ? cur.filter(c => c !== cert) : [...cur, cert]);
              }}
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{cert}</span>
                {answers.existing_certifications.includes(cert) && <CheckCheck className="w-4 h-4 text-primary ml-auto" />}
              </div>
            </SelectCard>
          ))}
          <SelectCard
            selected={answers.existing_certifications.length === 0}
            onClick={() => set('existing_certifications', [])}
          >
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">None yet</span>
            </div>
          </SelectCard>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Security tooling & team</h3>
        {[
          { key: 'has_security_team', label: 'We have a dedicated security team or security-focused engineer' },
          { key: 'has_edr',           label: 'We have endpoint detection & response (EDR) deployed on all endpoints' },
          { key: 'has_siem',          label: 'We have centralised log management or SIEM in place' },
          { key: 'had_breach',        label: 'We have experienced a security incident or breach in the past 12 months' },
        ].map(item => (
          <div key={item.key} className="bg-card border border-[hsl(var(--border))] rounded-xl px-4 py-3">
            <Toggle checked={answers[item.key]} onChange={v => set(item.key, v)} label={item.label} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepGoals({ answers, set }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Primary goal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {GOALS.map(goal => (
            <SelectCard key={goal.value} selected={answers.primary_goal === goal.value} onClick={() => set('primary_goal', goal.value)}>
              <div className="flex items-start gap-3">
                <goal.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{goal.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{goal.sub}</div>
                </div>
                {answers.primary_goal === goal.value && <CheckCheck className="w-4 h-4 text-primary ml-auto shrink-0" />}
              </div>
            </SelectCard>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Target timeline: <span className="text-primary normal-case font-bold">{answers.timeline_months} months</span>
        </h3>
        <input
          type="range" min={3} max={24} step={3}
          value={answers.timeline_months}
          onChange={e => set('timeline_months', parseInt(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>3 months</span><span>12 months</span><span>24 months</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Compliance budget</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BUDGETS.map(b => (
            <SelectCard key={b.value} selected={answers.budget_tier === b.value} onClick={() => set('budget_tier', b.value)}>
              <div className="font-bold text-base text-foreground">{b.label}</div>
              <div className="text-xs text-muted-foreground">{b.sub}</div>
            </SelectCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepAnalysis({ loading, result, error }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Analysing your compliance profile…</p>
          <p className="text-sm text-muted-foreground mt-1">Scoring 10 frameworks against your answers</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-foreground font-semibold">Analysis failed</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const { recommendations, summary } = result;
  const top = recommendations.filter(r => r.score >= 40);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Frameworks assessed', value: summary.frameworks_assessed, icon: BarChart3, color: 'text-primary' },
          { label: 'Recommended',         value: summary.frameworks_recommended, icon: Star,     color: 'text-green-500' },
          { label: 'Est. timeline',        value: `${summary.estimated_months}+ mo`, icon: Clock, color: 'text-orange-500' },
          { label: 'Est. investment',      value: `$${Math.round(summary.estimated_cost_low/1000)}K–$${Math.round(summary.estimated_cost_high/1000)}K`, icon: DollarSign, color: 'text-blue-500' },
        ].map(card => (
          <div key={card.label} className="bg-card border border-[hsl(var(--border))] rounded-xl p-4">
            <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Recommendations list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Framework recommendations</h3>
        {top.map((rec, i) => {
          const col = PRIORITY_COLOURS[rec.priority] || PRIORITY_COLOURS.Optional;
          return (
            <div key={rec.framework} className={`border rounded-xl p-4 ${col.bg} ${col.border}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                    <span className="font-semibold text-foreground">{rec.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${col.badge}`}>{rec.priority}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{rec.rationale}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rec.typical_months} months typical</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${(rec.cost_low/1000).toFixed(0)}K–${(rec.cost_high/1000).toFixed(0)}K</span>
                  </div>
                </div>
                {/* Score bar */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-lg font-bold text-foreground">{rec.score}</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${col.dot}`} style={{ width: `${rec.score}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepRoadmap({ result }) {
  if (!result) return null;
  const { roadmap, recommendations } = result;

  const exportReport = () => {
    const top = recommendations.filter(r => r.score >= 40);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Compliance Roadmap Report</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#111}
  h1{color:#4f46e5;border-bottom:3px solid #4f46e5;padding-bottom:12px}
  h2{color:#374151;margin-top:32px}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;margin-right:8px}
  .critical{background:#fef2f2;color:#dc2626}.high{background:#fff7ed;color:#ea580c}
  .medium{background:#fefce8;color:#ca8a04}.low{background:#eff6ff;color:#2563eb}
  .card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px}
  .phase{border-left:4px solid #4f46e5;padding-left:16px;margin-bottom:24px}
  .quick-win{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;margin-bottom:8px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:13px}
  td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}
</style></head><body>
<h1>🛡️ Compliance Roadmap Report</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<h2>📊 Framework Recommendations</h2>
<table><tr><th>#</th><th>Framework</th><th>Priority</th><th>Score</th><th>Timeline</th><th>Est. Investment</th></tr>
${top.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.name}</strong></td><td><span class="badge ${r.priority.toLowerCase()}">${r.priority}</span></td><td>${r.score}/100</td><td>${r.typical_months} months</td><td>$${(r.cost_low/1000).toFixed(0)}K–$${(r.cost_high/1000).toFixed(0)}K</td></tr>`).join('')}
</table>
<h2>🗺️ Implementation Phases</h2>
${Object.entries(roadmap.phases).map(([phase,fws])=>fws.length?`<div class="phase"><strong>${phase}</strong><ul>${fws.map(fw=>`<li>${recommendations.find(r=>r.framework===fw)?.name||fw}</li>`).join('')}</ul></div>`:''
).join('')}
<h2>⚡ Quick Wins (Start This Week)</h2>
${roadmap.quick_wins.map(qw=>`<div class="quick-win">✅ ${qw}</div>`).join('')}
<h2>📋 Detailed Rationale</h2>
${top.map(r=>`<div class="card"><strong>${r.name}</strong> (${r.priority})<br><small>${r.rationale}</small></div>`).join('')}
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  const phases = Object.entries(roadmap.phases).filter(([, fws]) => fws.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your personalised compliance implementation roadmap — based on priority, effort, and budget.</p>
        <button
          onClick={exportReport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Timeline phases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {phases.map(([phase, fws], idx) => {
          const col = PHASE_COLOURS[idx] || PHASE_COLOURS[3];
          return (
            <div key={phase} className={`border rounded-xl p-4 ${col.border} ${col.bg}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${col.label_bg}`} />
                <span className="text-sm font-bold text-foreground">{phase}</span>
              </div>
              <div className="space-y-2">
                {fws.map(fw => {
                  const rec = recommendations.find(r => r.framework === fw);
                  return (
                    <div key={fw} className="flex items-center justify-between bg-card/60 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-foreground">{rec?.name || fw}</span>
                      {rec && (
                        <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLOURS[rec.priority]?.badge}`}>
                          {rec.priority}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick wins */}
      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-foreground">⚡ Quick wins — start this week</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {roadmap.quick_wins.map((qw, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span>{qw}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Import CTA */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <Sparkles className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Import this roadmap into your workspace</h3>
            <p className="text-sm text-muted-foreground">
              Close this wizard and navigate to <strong>Controls</strong> to see your recommended frameworks pre-loaded.
              Use the <strong>Automation Plan</strong> to generate a detailed remediation schedule.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-1" />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main wizard component
// ────────────────────────────────────────────────────────────────────────────

export default function IntakeWizardView({ onClose }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const set = useCallback((key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const canAdvance = () => {
    if (step === 0) return answers.industry && answers.company_size;
    if (step === 3) return answers.primary_goal;
    return true;
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/wizard/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...api.getAuthHeaders() },
        body: JSON.stringify(answers),
      });
      if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
      const data = await resp.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Assessment failed — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep === 4 && !result) {
      runAnalysis();
    }
  };

  const prev = () => setStep(s => Math.max(0, s - 1));

  const currentStep = STEPS[step];

  return (
    <div className="fixed inset-0 z-[300] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-[hsl(var(--border))] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <currentStep.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">{currentStep.label}</h2>
              <p className="text-xs text-muted-foreground">{currentStep.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress steps */}
        <div className="px-6 py-3 border-b border-[hsl(var(--border))] bg-muted/20 shrink-0">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => { if (i < step || (i === step)) return; if (i <= step) setStep(i); }}
                  disabled={i > step && !(i === 4 && result)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    i === step ? 'bg-primary text-primary-foreground' :
                    i < step  ? 'text-primary hover:bg-primary/10 cursor-pointer' :
                    'text-muted-foreground'
                  }`}
                >
                  <s.icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 ${i < step ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 0 && <StepOrg answers={answers} set={set} />}
          {step === 1 && <StepRegulatory answers={answers} set={set} />}
          {step === 2 && <StepPosture answers={answers} set={set} />}
          {step === 3 && <StepGoals answers={answers} set={set} />}
          {step === 4 && <StepAnalysis loading={loading} result={result} error={error} />}
          {step === 5 && <StepRoadmap result={result} />}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            Step {step + 1} of {STEPS.length}
          </div>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1.5 px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={next}
                disabled={!canAdvance() || (step === 4 && loading)}
                className="flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {step === 3 ? (
                  <><Sparkles className="w-4 h-4" /> Run AI Analysis</>
                ) : step === 4 && loading ? (
                  <>Analysing…</>
                ) : (
                  <>Continue <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
              >
                <CheckCheck className="w-4 h-4" /> Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
