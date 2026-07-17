/**
 * TrustShowcasePage — Full-page showcase / launch pad for the
 * Tenant Trust & Value Portal.
 *
 * This page explains the value proposition, shows a live preview
 * of the trust score, and serves as the canonical entry point.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield, Brain, FileCheck, Database, Sparkles, ArrowRight,
  CheckCircle2, ChevronRight, Download, Star, Globe, Users,
  Lock, Award, TrendingUp, Activity, Target, Zap, BarChart3,
  PlayCircle, ChevronDown, Eye, Building2, Share2, ExternalLink,
  AlertCircle, Info, Layers, CheckCheck, Clock, DollarSign,
  Cpu, RefreshCw
} from 'lucide-react';
import TrustPortalView from './TrustPortalView';
import api, { API_BASE_URL } from '../services/api';

// ─── Static data ──────────────────────────────────────────────────────────────

const PILLARS = [
  {
    key: 'security', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
    title: 'Security Coverage', weight: '25%', score: 94,
    bullets: ['Control implementation rate', 'Threat event resolution', 'Continuous monitoring'],
  },
  {
    key: 'compliance', icon: FileCheck, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20',
    title: 'Compliance Alignment', weight: '30%', score: 88,
    bullets: ['10 framework scores', 'Active certifications', 'Audit readiness'],
  },
  {
    key: 'ai', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
    title: 'AI & ML Protection', weight: '25%', score: 79,
    bullets: ['NIST AI RMF 1.0 coverage', 'MITRE ATLAS threat model', 'Automated playbooks'],
  },
  {
    key: 'data', icon: Database, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20',
    title: 'Data Protection', weight: '20%', score: 91,
    bullets: ['PII / PHI controls', 'Evidence validation', 'Access management'],
  },
];

const PROOF_POINTS = [
  { icon: Shield,    value: '847',    label: 'Controls active',         color: 'text-blue-500' },
  { icon: FileCheck, value: '234',    label: 'Evidence items validated', color: 'text-green-500' },
  { icon: Brain,     value: '68%',    label: 'NIST AI RMF coverage',    color: 'text-purple-500' },
  { icon: Target,    value: '11/16',  label: 'ATLAS tactics mitigated', color: 'text-pink-500' },
  { icon: Award,     value: '3',      label: 'Active certifications',   color: 'text-yellow-500' },
  { icon: Zap,       value: '8',      label: 'Auto playbooks running',  color: 'text-orange-500' },
];

const TENANT_QUESTIONS = [
  { q: 'Are you SOC 2 compliant?',                ans: 'Yes — SOC 2 Type II in progress, readiness 92%' },
  { q: 'How do you protect our AI/ML data?',       ans: 'NIST AI RMF + MITRE ATLAS — 68% coverage, 8 active playbooks' },
  { q: 'What frameworks do you comply with?',      ans: 'SOC 2, ISO 27001, HIPAA, CIS, NIST AI RMF — all tracked live' },
  { q: 'Can you show me proof of your controls?',  ans: '234 validated evidence items exportable as attestation report' },
  { q: 'How quickly do you resolve security events?', ans: '98% resolved within 90 days, fully documented audit trail' },
];

const TABS = [
  { id: 'overview',  label: 'Overview',      icon: BarChart3 },
  { id: 'security',  label: 'Security',      icon: Shield },
  { id: 'ai',        label: 'AI Protection', icon: Brain },
  { id: 'evidence',  label: 'Evidence',      icon: FileCheck },
];

// ─── Mini trust score ring (static preview) ───────────────────────────────────
function PreviewRing({ score = 87, size = 120 }) {
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="8" className="stroke-muted/30" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="8"
          stroke="#22c55e" strokeLinecap="round"
          strokeDasharray={`${(score/100)*circ} ${circ - (score/100)*circ}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-green-500">{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

// ─── Animated mock dashboard preview ─────────────────────────────────────────
function MockDashboard({ activeTab }) {
  return (
    <div className="bg-card border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-2xl">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-[hsl(var(--border))]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <div className="flex-1 mx-3 bg-muted rounded text-xs text-muted-foreground px-3 py-0.5">
          compliance.yourcompany.com/trust
        </div>
        <Share2 className="w-3 h-3 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-500 uppercase tracking-wide">Excellent Posture</span>
            </div>
            <div className="text-sm font-bold text-foreground">Acme Corp — Trust Report</div>
          </div>
          <PreviewRing score={87} size={70} />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 border-b border-[hsl(var(--border))] pb-2">
          {TABS.map(t => (
            <div key={t.id} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${activeTab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <t.icon className="w-3 h-3" />{t.label}
            </div>
          ))}
        </div>

        {/* Pillar mini bars */}
        <div className="grid grid-cols-2 gap-2">
          {PILLARS.map(p => (
            <div key={p.key} className={`rounded-lg p-2.5 ${p.bg} ${p.border} border`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{p.title.split(' ')[0]}</span>
                <span className={`text-sm font-black ${p.color}`}>{p.score}</span>
              </div>
              <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                <div className={`h-full rounded-full`} style={{ width: `${p.score}%`, background: p.color.replace('text-','').replace('-500','') === 'blue' ? '#3b82f6' : p.color.replace('text-','').replace('-500','') === 'green' ? '#22c55e' : p.color.replace('text-','').replace('-500','') === 'purple' ? '#a855f7' : '#f97316' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Proof points mini */}
        <div className="grid grid-cols-3 gap-1.5">
          {PROOF_POINTS.slice(0,6).map(pp => (
            <div key={pp.label} className="bg-muted/20 rounded-lg p-2 text-center">
              <div className={`text-base font-black ${pp.color}`}>{pp.value}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{pp.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrustShowcasePage() {
  const [showPortal, setShowPortal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showQA, setShowQA] = useState(null);
  // Live data from the authenticated user's own trust score
  const [liveScore, setLiveScore] = useState(null);

  // Fetch the user's real trust score for the hero section
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/trust/score`, { headers: api.getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLiveScore(d); })
      .catch(() => {});
  }, []);

  // Cycle demo tabs
  useEffect(() => {
    const ids = TABS.map(t => t.id);
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % ids.length;
      setActiveTab(ids[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  if (showPortal) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setShowPortal(false)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to showcase
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">Live Trust Portal</span>
        </div>
        <TrustPortalView />
      </div>
    );
  }

  return (
    <div className="space-y-14 pb-16">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/15 via-blue-500/10 to-purple-500/10 border border-green-500/20 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-72 h-72 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-10">
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-600 text-xs font-semibold mb-5">
              <Shield className="w-3.5 h-3.5" />
              Tenant-Facing · Exportable · Real-time
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight mb-4">
              Show tenants your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500">
                security proof
              </span>
              , not just your word
            </h1>

            <p className="text-lg text-muted-foreground mb-8">
              The Trust Portal turns your compliance data into a single, shareable proof-of-security
              dashboard — covering security controls, compliance frameworks, AI protection,
              and validated evidence. One click to export as an attestation report.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowPortal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-base shadow-lg shadow-green-600/20 transition-all hover:scale-[1.02]"
              >
                <Shield className="w-5 h-5" />
                Open Trust Portal
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => document.getElementById('showcase-qa')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center justify-center gap-2 px-6 py-3.5 border border-[hsl(var(--border))] bg-card rounded-xl hover:bg-muted text-foreground font-medium text-base transition-colors"
              >
                <Eye className="w-5 h-5 text-muted-foreground" />
                See what tenants see
              </button>
            </div>
          </div>

          {/* Animated sample preview — clearly labelled */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground bg-muted/50 border border-[hsl(var(--border))] px-2 py-0.5 rounded-full">
                Sample preview
              </span>
              <span className="text-xs text-muted-foreground">— your portal uses live data</span>
            </div>
            <MockDashboard activeTab={activeTab} />
          </div>
        </div>
      </div>

      {/* ── Four pillars — live data when available, sample label when not ── */}
      <div>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">One score. Four proof pillars.</h2>
          <p className="text-muted-foreground">Every metric is backed by live data from your compliance programme</p>
          {!liveScore && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-muted/40 border border-[hsl(var(--border))] text-xs text-muted-foreground">
              <Info className="w-3 h-3" />
              Scores below are sample values — open the Trust Portal to see your live numbers
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map(p => {
            // Merge live score if available, otherwise use sample with label
            const liveP = liveScore?.pillars?.[p.key];
            const displayScore = liveP ? liveP.score : p.score;
            const isSample = !liveP;
            return (
              <div key={p.key} className={`border rounded-xl p-5 ${p.bg} ${p.border} relative`}>
                {isSample && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    sample
                  </span>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${p.bg} border ${p.border} flex items-center justify-center`}>
                    <p.icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <div className="text-right mr-6">
                    <div className={`text-2xl font-black ${p.color}`}>{displayScore}</div>
                    <div className="text-xs text-muted-foreground">{p.weight} weight</div>
                  </div>
                </div>
                <h3 className="font-bold text-foreground mb-1 text-sm">{p.title}</h3>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full ${p.color.replace('text-','bg-')}`} style={{ width: `${displayScore}%` }} />
                </div>
                <ul className="space-y-1">
                  {p.bullets.map(b => (
                    <li key={b} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className={`w-3 h-3 ${p.color} shrink-0`} /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Proof points — sample, clearly labelled ───────────────────────── */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-2xl p-6 md:p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">What tenants see in your portal</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm">Live metrics pulled from your compliance database</p>
            <span className="text-xs font-semibold text-muted-foreground bg-muted/50 border border-[hsl(var(--border))] px-2 py-0.5 rounded-full">
              Sample values shown
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {PROOF_POINTS.map(pp => (
            <div key={pp.label} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center mx-auto mb-2">
                <pp.icon className={`w-6 h-6 ${pp.color}`} />
              </div>
              <div className={`text-2xl font-black ${pp.color}`}>{pp.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{pp.label}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6 border-t border-[hsl(var(--border))] pt-4">
          These numbers are illustrative. Open the <button onClick={() => setShowPortal(true)} className="text-primary underline underline-offset-2 hover:no-underline">Trust Portal</button> to see your organisation's actual figures.
        </p>
      </div>

      {/* ── Q&A — what tenants ask ────────────────────────────────────────── */}
      <div id="showcase-qa">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Answer every tenant security question instantly</h2>
          <p className="text-muted-foreground">Click any question to see how the Trust Portal answers it with live data</p>
        </div>
        <div className="space-y-2 max-w-3xl mx-auto">
          {TENANT_QUESTIONS.map((item, i) => (
            <div key={i} className="border border-[hsl(var(--border))] rounded-xl overflow-hidden bg-card">
              <button
                onClick={() => setShowQA(showQA === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">"{item.q}"</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-3 ${showQA === i ? 'rotate-180' : ''}`} />
              </button>
              {showQA === i && (
                <div className="px-5 pb-4 flex items-start gap-3 border-t border-[hsl(var(--border))] pt-3">
                  <Shield className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{item.ans}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Export & sharing ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Download, title: 'Exportable Attestation Report',
            desc: 'One-click HTML report with all four pillars, evidence summary, audit history, and certifications. Professional enough to send directly to tenants.',
            tag: 'Available now', tagColor: 'text-green-500 bg-green-500/10 border-green-500/20'
          },
          {
            icon: Eye, title: 'Tenant-Friendly Language',
            desc: 'Metrics are presented without GRC jargon. Tenants see "847 controls active" and "98% threat resolution" — not NIST control families.',
            tag: 'Available now', tagColor: 'text-green-500 bg-green-500/10 border-green-500/20'
          },
          {
            icon: RefreshCw, title: 'Always Current',
            desc: 'Every score recalculates from live database data when you open the portal. No stale quarterly reports — your trust score reflects today\'s posture.',
            tag: 'Real-time', tagColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
          },
        ].map(card => (
          <div key={card.title} className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                <card.icon className="w-5 h-5 text-primary" />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${card.tagColor}`}>{card.tag}</span>
            </div>
            <h3 className="font-bold text-foreground">{card.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 to-blue-600 p-8 text-center">
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIzIi8+PC9nPjwvc3ZnPg==')]" />
        <div className="relative">
          <Shield className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            Your tenants deserve proof, not promises
          </h2>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">
            Open your Trust Portal and see your live trust score right now. Export a professional
            attestation report in one click.
          </p>
          <button
            onClick={() => setShowPortal(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-700 rounded-xl hover:bg-white/90 font-bold text-base shadow-xl transition-all hover:scale-[1.02]"
          >
            <Shield className="w-5 h-5" />
            Open My Trust Portal
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
