/**
 * HomeView — Prioritized "what should I do next" screen
 *
 * Default landing for Tier 1-2 (guided mode) users. Shows:
 *   1. Trust score with tier badge
 *   2. Top 3 open compliance gaps (actionable items)
 *   3. AI Assessment Wizard status / next step
 *   4. Quick-action tiles
 *
 * Deliberately simple — no sidebar noise, no jargon, one clear CTA per section.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles, Shield, ArrowRight, CheckCircle2, AlertTriangle,
  Target, ChevronRight, Zap, Clock, BookOpen, FileCheck,
  TrendingUp, AlertCircle, BarChart3, Lock, Play, RefreshCw
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_CFG = {
  Excellent:    { color: 'text-green-500',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  ring: '#22c55e' },
  Strong:       { color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   ring: '#3b82f6' },
  Developing:   { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', ring: '#eab308' },
  Foundational: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', ring: '#f97316' },
  'At Risk':    { color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    ring: '#ef4444' },
};

const PRIORITY_COLOR = {
  Critical: 'text-red-500 bg-red-500/10 border-red-500/25',
  High:     'text-orange-500 bg-orange-500/10 border-orange-500/25',
  Medium:   'text-yellow-500 bg-yellow-500/10 border-yellow-500/25',
  Low:      'text-blue-500 bg-blue-500/10 border-blue-500/25',
};

function ScoreRing({ score, tier, size = 100 }) {
  const cfg = TIER_CFG[tier] || TIER_CFG.Developing;
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="8" className="stroke-muted/30" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="8"
          stroke={cfg.ring} strokeLinecap="round"
          strokeDasharray={`${(score/100)*circ} ${circ-(score/100)*circ}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-black ${cfg.color}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomeView({ currentUser, setActiveView, controls }) {
  const [trust, setTrust]       = useState(null);
  const [loadingTrust, setLoadingTrust] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/trust/score`, { headers: api.getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setTrust(d); setLoadingTrust(false); })
      .catch(() => setLoadingTrust(false));
  }, []);

  // Top 3 open gaps from controls
  const openGaps = (controls || [])
    .filter(c => ['Not Implemented', 'Non-Compliant', 'Partial', 'Partially Implemented'].includes(c.status))
    .sort((a, b) => {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
    })
    .slice(0, 3);

  const implementedCount = (controls || []).filter(c =>
    c.status === 'Implemented' || c.status === 'Compliant' || c.status === 'Vendor Managed'
  ).length;
  const totalCount = (controls || []).length;
  const coveragePct = totalCount ? Math.round((implementedCount / totalCount) * 100) : 0;

  const tier = trust?.tier || 'Developing';
  const tierCfg = TIER_CFG[tier];
  const score = trust?.trust_score ?? 0;
  const name = currentUser?.name || currentUser?.email?.split('@')[0] || 'there';

  // Quick actions
  const actions = [
    { label: 'Run AI Assessment', sub: 'Get framework recommendations', icon: Sparkles, view: 'wizard',   color: 'text-primary',  bg: 'bg-primary/10',    border: 'border-primary/20' },
    { label: 'View Trust Score',  sub: 'Share proof with tenants',      icon: Shield,   view: 'trust',    color: 'text-green-500',bg: 'bg-green-500/10',  border: 'border-green-500/20' },
    { label: 'Connect a Tool',    sub: 'Import live security data',      icon: Zap,      view: 'integrations', color: 'text-purple-500',bg:'bg-purple-500/10',border:'border-purple-500/20' },
    { label: 'View Controls',     sub: 'Review your compliance controls', icon: FileCheck,view: 'controls', color: 'text-blue-500', bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{greeting}, {name} 👋</h1>
        <p className="text-muted-foreground mt-1">
          Here's where your compliance programme stands today.
        </p>
      </div>

      {/* ── Top row: Trust score + Coverage ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Trust Score */}
        <div className={`bg-card border rounded-2xl p-5 flex items-center gap-5 ${tierCfg.bg} ${tierCfg.border}`}>
          {loadingTrust ? (
            <div className="w-24 h-24 rounded-full bg-muted/30 animate-pulse shrink-0" />
          ) : (
            <ScoreRing score={score} tier={tier} size={90} />
          )}
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold uppercase tracking-wide ${tierCfg.color} mb-0.5`}>{tier} Posture</div>
            <div className="text-lg font-bold text-foreground">Tenant Trust Score</div>
            <p className="text-xs text-muted-foreground mt-1">
              {score < 40 ? 'Get started — run the AI Assessment to build your roadmap.'
               : score < 70 ? 'Good progress. Address the open gaps below to improve.'
               : 'Strong posture. Share your Trust Portal with prospects.'}
            </p>
            <button
              onClick={() => setActiveView('trust')}
              className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${tierCfg.color} hover:underline`}
            >
              View full Trust Portal <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Control coverage */}
        <div className="bg-card border border-[hsl(var(--border))] rounded-2xl p-5 flex items-center gap-5">
          <div className="flex flex-col items-center justify-center w-24 shrink-0">
            <span className="text-4xl font-black text-foreground">{coveragePct}%</span>
            <span className="text-xs text-muted-foreground mt-0.5">coverage</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-foreground">Controls</div>
            <div className="h-2 bg-muted/30 rounded-full overflow-hidden mt-2 mb-2">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${coveragePct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {implementedCount} of {totalCount} controls implemented
              {openGaps.length > 0 && ` · ${openGaps.length} priority gaps below`}
            </p>
            <button
              onClick={() => setActiveView('controls')}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              View all controls <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Top 3 open gaps ───────────────────────────────────────────────── */}
      <div className="bg-card border border-[hsl(var(--border))] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h2 className="font-bold text-foreground">Top open gaps</h2>
          </div>
          <button
            onClick={() => setActiveView('controls')}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {openGaps.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No critical open gaps</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCount > 0
                ? 'All tracked controls are implemented or in progress.'
                : 'Import your framework controls to start tracking gaps.'}
            </p>
            {totalCount === 0 && (
              <button
                onClick={() => setActiveView('wizard')}
                className="mt-3 flex items-center gap-1.5 mx-auto text-xs font-semibold text-primary hover:underline"
              >
                <Sparkles className="w-3 h-3" /> Run AI Assessment first
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {openGaps.map((gap, i) => (
              <div key={gap.id || i} className="flex items-center gap-4 px-5 py-3.5">
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-foreground truncate">{gap.control_name || gap.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold shrink-0 ${PRIORITY_COLOR[gap.priority] || PRIORITY_COLOR.Medium}`}>
                      {gap.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{gap.category} · Status: {gap.status}</p>
                </div>
                <button
                  onClick={() => setActiveView('controls')}
                  className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline shrink-0"
                >
                  Fix <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI Assessment wizard CTA ──────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/15 to-purple-500/10 border border-primary/20 rounded-2xl p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-foreground">AI Compliance Assessment</div>
            <p className="text-sm text-muted-foreground">
              Answer 4 questions and get a prioritised framework roadmap in under 5 minutes.
            </p>
          </div>
          <button
            onClick={() => setActiveView('wizard')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-semibold text-sm whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4" /> Start
          </button>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map(a => (
            <button
              key={a.view}
              onClick={() => setActiveView(a.view)}
              className={`flex flex-col items-start p-4 border rounded-xl text-left hover:scale-[1.02] transition-all ${a.bg} ${a.border}`}
            >
              <a.icon className={`w-5 h-5 ${a.color} mb-2`} />
              <div className="text-sm font-semibold text-foreground leading-tight">{a.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{a.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
