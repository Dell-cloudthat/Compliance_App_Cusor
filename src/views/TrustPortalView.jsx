/**
 * TrustPortalView — Tenant-Facing Security, AI & Compliance Value Dashboard
 *
 * Shows customers (tenants) proof-of-compliance across four pillars:
 *   1. Security Coverage
 *   2. Compliance Alignment
 *   3. AI & ML Protection
 *   4. Data Protection
 *
 * Aggregates into a single "Trust Score" with drill-down evidence and
 * an exportable attestation report.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Brain, FileCheck, Database, Sparkles, Download,
  TrendingUp, CheckCircle2, AlertTriangle, Clock, Award,
  BarChart3, Zap, Lock, Eye, Activity, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, Info, Star,
  Users, Globe, Layers, Target, ArrowUp, ArrowRight,
  CheckCheck, XCircle, AlertCircle, Cpu, Share2, Copy, Link2
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  Excellent:   { color: 'text-green-500',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  ring: '#22c55e', label: 'Excellent',   desc: 'Industry-leading security posture' },
  Strong:      { color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   ring: '#3b82f6', label: 'Strong',      desc: 'Solid compliance foundation' },
  Developing:  { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', ring: '#eab308', label: 'Developing',  desc: 'Actively improving posture' },
  Foundational:{ color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', ring: '#f97316', label: 'Foundational','desc': 'Building compliance programme' },
  'At Risk':   { color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    ring: '#ef4444', label: 'At Risk',     desc: 'Requires immediate attention' },
};

const PILLAR_CONFIG = {
  security:   { label: 'Security Coverage',   icon: Shield,    color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   weight: 25, description: 'Controls implemented, threat response, active protections' },
  compliance: { label: 'Compliance Alignment',icon: FileCheck, color: 'text-green-500',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  weight: 30, description: 'Framework scores, certifications, audit readiness' },
  ai:         { label: 'AI & ML Protection',  icon: Brain,     color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', weight: 25, description: 'NIST AI RMF, MITRE ATLAS, automated playbooks' },
  data:       { label: 'Data Protection',     icon: Database,  color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', weight: 20, description: 'PII/PHI controls, evidence validation, access management' },
};

const scoreColor = (s) =>
  s >= 85 ? 'text-green-500' : s >= 70 ? 'text-blue-500' : s >= 55 ? 'text-yellow-500' : s >= 40 ? 'text-orange-500' : 'text-red-500';

const scoreBg = (s) =>
  s >= 85 ? 'bg-green-500' : s >= 70 ? 'bg-blue-500' : s >= 55 ? 'bg-yellow-500' : s >= 40 ? 'bg-orange-500' : 'bg-red-500';

// ─── Sub-components ───────────────────────────────────────────────────────────

function CircularScore({ score, tier, size = 160 }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.Developing;
  const radius = (size / 2) - 14;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth="10" className="stroke-muted/30" />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none" strokeWidth="10"
          stroke={cfg.ring}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black ${cfg.color}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
        <span className={`text-xs font-bold mt-1 ${cfg.color}`}>{cfg.label}</span>
      </div>
    </div>
  );
}

function PillarCard({ pillarKey, data, expanded, onToggle }) {
  const cfg = PILLAR_CONFIG[pillarKey];
  const Icon = cfg.icon;
  const score = data?.score || 0;
  const metrics = data?.metrics || {};

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.border} ${cfg.bg}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">{cfg.label}</div>
            <div className="text-xs text-muted-foreground">{cfg.weight}% of Trust Score</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-2xl font-black ${scoreColor(score)}`}>{score}</div>
            <div className="text-xs text-muted-foreground">/100</div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Score bar */}
      <div className="px-4 pb-1">
        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${scoreBg(score)}`} style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Expanded metrics */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-2 border-t border-[hsl(var(--border))] mt-2">
          <p className="text-xs text-muted-foreground mb-3">{cfg.description}</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(metrics)
              .filter(([k]) => !k.includes('_scores'))
              .map(([key, val]) => (
                <div key={key} className="bg-card/60 rounded-lg px-3 py-2">
                  <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</div>
                  <div className="text-sm font-bold text-foreground">
                    {typeof val === 'number'
                      ? key.includes('pct') ? `${val}%` : val
                      : String(val)}
                  </div>
                </div>
              ))
            }
          </div>
          {/* Framework sub-scores */}
          {metrics.framework_scores && Object.entries(metrics.framework_scores).length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-2">Framework scores</div>
              <div className="space-y-1.5">
                {Object.entries(metrics.framework_scores).map(([fw, sc]) => (
                  <div key={fw} className="flex items-center gap-2">
                    <span className="text-xs text-foreground w-32 shrink-0">{fw}</span>
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${scoreBg(sc)}`} style={{ width: `${sc}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-8 text-right ${scoreColor(sc)}`}>{sc}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProofPoint({ icon: Icon, label, value, sub, color = 'text-primary' }) {
  return (
    <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold text-foreground">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrustPortalView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trustData, setTrustData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [expandedPillar, setExpandedPillar] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const generateShareLink = async () => {
    setShareLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/trust/share`, {
        method: 'POST',
        headers: api.getAuthHeaders(),
      });
      if (!resp.ok) throw new Error('Failed to generate share link');
      const data = await resp.json();
      const url = `${window.location.origin}${data.share_path}`;
      setShareUrl(url);
    } catch (err) {
      alert('Could not generate share link. Make sure the backend is running.');
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      prompt('Copy this link:', shareUrl);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [score, report] = await Promise.all([
        fetch(`${API_BASE_URL}/api/trust/score`, { headers: api.getAuthHeaders() }).then(r => r.json()),
        fetch(`${API_BASE_URL}/api/trust/report`, { headers: api.getAuthHeaders() }).then(r => r.json()),
      ]);
      setTrustData(score);
      setReportData(report);
    } catch (err) {
      setError('Failed to load trust data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportReport = () => {
    if (!trustData || !reportData) return;
    setExporting(true);

    const p = trustData.pillars;
    const org = reportData.organization || {};
    const tier = TIER_CONFIG[trustData.tier] || TIER_CONFIG.Developing;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Trust & Security Report — ${org.organization || 'Organisation'}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;color:#111;background:#fff;padding:40px}
  .header{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:16px;padding:32px;margin-bottom:32px}
  .score-hero{display:flex;align-items:center;gap:32px;margin-bottom:16px}
  .score-circle{width:100px;height:100px;border-radius:50%;border:6px solid rgba(255,255,255,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.15)}
  .score-num{font-size:36px;font-weight:900;color:#fff}
  .tier-badge{display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);border-radius:20px;padding:4px 14px;font-size:14px;font-weight:700;margin-top:8px}
  .section{margin-bottom:28px}
  h2{font-size:18px;font-weight:700;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-bottom:16px}
  .pillar-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .pillar-card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#f8fafc}
  .pillar-score{font-size:32px;font-weight:900}
  .bar{height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin:8px 0}
  .bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#4f46e5,#7c3aed)}
  .proof-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .proof-card{border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#f8fafc}
  .proof-val{font-size:24px;font-weight:800;color:#4f46e5}
  .cert-list{display:flex;flex-wrap:wrap;gap:8px}
  .cert{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;color:#065f46}
  .disclaimer{font-size:11px;color:#94a3b8;margin-top:32px;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f1f5f9;padding:8px 12px;text-align:left;font-weight:600}
  td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
</style></head><body>
<div class="header">
  <div class="score-hero">
    <div class="score-circle"><div class="score-num">${trustData.trust_score}</div><div style="font-size:11px;color:rgba(255,255,255,0.7)">/100</div></div>
    <div>
      <div style="font-size:28px;font-weight:800">Trust &amp; Security Report</div>
      <div style="font-size:16px;opacity:0.85;margin-top:4px">${org.organization || 'Organisation'}</div>
      <div class="tier-badge">${trustData.tier} Security Posture</div>
    </div>
  </div>
  <div style="font-size:13px;opacity:0.75">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; ${tier.desc}</div>
</div>

<div class="section">
  <h2>Four-Pillar Trust Score</h2>
  <div class="pillar-grid">
    ${Object.entries(p).map(([key, pillar]) => {
      const cfg = PILLAR_CONFIG[key];
      return `<div class="pillar-card">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:#64748b;margin-bottom:4px">${cfg.label}</div>
        <div class="pillar-score" style="color:${pillar.score>=70?'#22c55e':pillar.score>=50?'#3b82f6':'#f59e0b'}">${pillar.score}<span style="font-size:16px;color:#94a3b8">/100</span></div>
        <div class="bar"><div class="bar-fill" style="width:${pillar.score}%"></div></div>
        <div style="font-size:11px;color:#64748b">${cfg.weight}% weight &nbsp;·&nbsp; ${cfg.description}</div>
      </div>`;
    }).join('')}
  </div>
</div>

<div class="section">
  <h2>Security Evidence Proof Points</h2>
  <div class="proof-grid">
    <div class="proof-card"><div style="font-size:11px;color:#64748b">Controls Implemented</div><div class="proof-val">${p.security?.metrics?.control_coverage_pct||0}%</div><div style="font-size:11px;color:#94a3b8">${p.security?.metrics?.controls_implemented||0} of ${p.security?.metrics?.controls_total||0}</div></div>
    <div class="proof-card"><div style="font-size:11px;color:#64748b">Threat Resolution Rate</div><div class="proof-val">${p.security?.metrics?.resolution_rate_pct||100}%</div><div style="font-size:11px;color:#94a3b8">Last 90 days</div></div>
    <div class="proof-card"><div style="font-size:11px;color:#64748b">AI RMF Coverage</div><div class="proof-val">${p.ai?.metrics?.ai_rmf_coverage_pct||0}%</div><div style="font-size:11px;color:#94a3b8">NIST AI RMF 1.0</div></div>
    <div class="proof-card"><div style="font-size:11px;color:#64748b">ATLAS Tactics Covered</div><div class="proof-val">${p.ai?.metrics?.atlas_tactics_covered||0}</div><div style="font-size:11px;color:#94a3b8">of ${p.ai?.metrics?.atlas_tactics_total||16} tactics</div></div>
    <div class="proof-card"><div style="font-size:11px;color:#64748b">Data Controls</div><div class="proof-val">${p.data?.metrics?.data_coverage_pct||0}%</div><div style="font-size:11px;color:#94a3b8">PII/PHI/Access</div></div>
    <div class="proof-card"><div style="font-size:11px;color:#64748b">Active Playbooks</div><div class="proof-val">${p.ai?.metrics?.active_playbooks||0}</div><div style="font-size:11px;color:#94a3b8">Automated responses</div></div>
  </div>
</div>

${reportData.certifications?.filter(c=>c.status==='active').length ? `
<div class="section">
  <h2>Active Certifications &amp; Attestations</h2>
  <div class="cert-list">
    ${reportData.certifications.filter(c=>c.status==='active').map(c=>`<div class="cert">✓ ${c.certification_name}</div>`).join('')}
  </div>
</div>` : ''}

${reportData.audits?.length ? `
<div class="section">
  <h2>Recent Audit Engagements</h2>
  <table><tr><th>Audit</th><th>Framework</th><th>Status</th><th>Readiness</th></tr>
  ${reportData.audits.map(a=>`<tr><td>${a.audit_name}</td><td>${a.framework}</td><td>${a.status}</td><td>${a.readiness_score}%</td></tr>`).join('')}
  </table>
</div>` : ''}

<div class="disclaimer">This report was generated automatically by the Compliance Automation Platform and reflects the security posture at time of generation. Trust Score is a composite metric and not a substitute for formal certification or audit.</div>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setExporting(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <Shield className="absolute inset-0 m-auto w-7 h-7 text-primary" />
      </div>
      <p className="text-muted-foreground">Computing trust scores…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <p className="text-foreground font-semibold">Could not load trust data</p>
      <p className="text-sm text-muted-foreground">{error}</p>
      <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  );

  const pillars = trustData?.pillars || {};
  const tier = TIER_CONFIG[trustData?.tier] || TIER_CONFIG.Developing;
  const certs = reportData?.certifications?.filter(c => c.status === 'active') || [];
  const ctrlCats = reportData?.control_categories || [];
  const evidenceSummary = reportData?.evidence_summary || [];
  const orgName = reportData?.organization?.organization || 'Your Organisation';

  const totalEvidence = evidenceSummary.reduce((s, e) => s + (e.count || 0), 0);
  const validatedEvidence = evidenceSummary.reduce((s, e) => s + (e.validated_count || 0), 0);

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 ${tier.bg} ${tier.border}`}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: tier.ring }} />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <CircularScore score={trustData.trust_score} tier={trustData.tier} size={160} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wide ${tier.color}`}>{tier.label} Security Posture</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{tier.desc}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-1">{orgName}</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Tenant Trust Report · Generated {new Date(trustData.calculated_at).toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-2">
              {certs.map(c => (
                <span key={c.certification_name} className="flex items-center gap-1 px-2.5 py-1 bg-green-500/10 border border-green-500/25 rounded-full text-xs font-semibold text-green-500">
                  <CheckCheck className="w-3 h-3" />{c.certification_name}
                </span>
              ))}
              {certs.length === 0 && (
                <span className="text-xs text-muted-foreground">No active certifications recorded yet</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={exportReport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-xl hover:bg-foreground/90 font-semibold text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button
              onClick={shareUrl ? copyShareUrl : generateShareLink}
              disabled={shareLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                shareCopied
                  ? 'bg-green-600 text-white'
                  : shareUrl
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-[hsl(var(--border))] bg-card hover:bg-muted text-foreground'
              }`}
            >
              {shareCopied ? <CheckCheck className="w-4 h-4" /> : shareUrl ? <Copy className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {shareCopied ? 'Copied!' : shareUrl ? 'Copy Link' : shareLoading ? 'Generating…' : 'Share Portal'}
            </button>
            <button
              onClick={load}
              className="flex items-center gap-2 px-4 py-2.5 border border-[hsl(var(--border))] bg-card rounded-xl hover:bg-muted text-sm text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Share URL display */}
          {shareUrl && !shareCopied && (
            <div className="mt-3 col-span-full w-full">
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5">
                <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-xs text-blue-600 font-mono flex-1 truncate">{shareUrl}</span>
                <button onClick={copyShareUrl} className="text-xs text-blue-600 font-semibold hover:underline shrink-0">Copy</button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 px-1">
                Share this link with prospects or auditors — no account required to view. Revoke anytime by generating a new link.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[hsl(var(--border))] overflow-x-auto">
        {[
          { id: 'overview',    label: 'Overview',         icon: BarChart3 },
          { id: 'pillars',     label: 'Trust Pillars',    icon: Layers },
          { id: 'ai',          label: 'AI Protection',    icon: Brain },
          { id: 'evidence',    label: 'Evidence & Audit', icon: FileCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Proof point grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <ProofPoint icon={Shield}    label="Controls Active"       value={`${pillars.security?.metrics?.control_coverage_pct||0}%`} sub={`${pillars.security?.metrics?.controls_implemented||0} implemented`} color="text-blue-500" />
            <ProofPoint icon={Activity}  label="Threat Resolution"     value={`${pillars.security?.metrics?.resolution_rate_pct||100}%`} sub="Last 90 days" color="text-green-500" />
            <ProofPoint icon={Brain}     label="AI RMF Coverage"       value={`${pillars.ai?.metrics?.ai_rmf_coverage_pct||0}%`}   sub="NIST AI RMF 1.0" color="text-purple-500" />
            <ProofPoint icon={Target}    label="ATLAS Tactics"         value={pillars.ai?.metrics?.atlas_tactics_covered||0} sub={`of ${pillars.ai?.metrics?.atlas_tactics_total||16} covered`} color="text-pink-500" />
            <ProofPoint icon={FileCheck} label="Evidence Items"        value={totalEvidence} sub={`${validatedEvidence} validated`} color="text-orange-500" />
            <ProofPoint icon={Zap}       label="Auto Playbooks"        value={pillars.ai?.metrics?.active_playbooks||0} sub="Active responses" color="text-yellow-500" />
          </div>

          {/* Three-column value story */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Security */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-foreground">Security Posture</h3>
                <span className={`ml-auto text-lg font-black ${scoreColor(pillars.security?.score||0)}`}>{pillars.security?.score||0}</span>
              </div>
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pillars.security?.score||0}%` }} />
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{pillars.security?.metrics?.controls_implemented||0} security controls implemented</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{pillars.security?.metrics?.resolution_rate_pct||100}% of security events resolved</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />Continuous compliance monitoring active</div>
              </div>
            </div>

            {/* Compliance */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-500" />
                <h3 className="font-bold text-foreground">Compliance</h3>
                <span className={`ml-auto text-lg font-black ${scoreColor(pillars.compliance?.score||0)}`}>{pillars.compliance?.score||0}</span>
              </div>
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pillars.compliance?.score||0}%` }} />
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{pillars.compliance?.metrics?.frameworks_tracked||0} frameworks actively tracked</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{certs.length} active certification{certs.length!==1?'s':''}</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />Audit readiness: {pillars.compliance?.metrics?.latest_audit_readiness||0}%</div>
              </div>
            </div>

            {/* AI */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-foreground">AI Protection</h3>
                <span className={`ml-auto text-lg font-black ${scoreColor(pillars.ai?.score||0)}`}>{pillars.ai?.score||0}</span>
              </div>
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pillars.ai?.score||0}%` }} />
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />NIST AI RMF {pillars.ai?.metrics?.ai_rmf_coverage_pct||0}% coverage</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{pillars.ai?.metrics?.atlas_tactics_covered||0} MITRE ATLAS tactics mitigated</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />{pillars.ai?.metrics?.active_playbooks||0} automated response playbooks</div>
              </div>
            </div>
          </div>

          {/* Framework scores bar chart */}
          {Object.keys(pillars.compliance?.metrics?.framework_scores||{}).length > 0 && (
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Compliance Coverage by Framework
              </h3>
              <div className="space-y-3">
                {Object.entries(pillars.compliance.metrics.framework_scores).map(([fw, sc]) => (
                  <div key={fw} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-36 shrink-0">{fw}</span>
                    <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${scoreBg(sc)}`} style={{ width: `${sc}%` }} />
                    </div>
                    <span className={`text-sm font-bold w-12 text-right ${scoreColor(sc)}`}>{sc}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Pillars tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'pillars' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Click any pillar to expand the underlying evidence metrics. Weights reflect industry-standard importance for enterprise trust.
          </p>
          {Object.entries(pillars).map(([key, data]) => (
            <PillarCard
              key={key}
              pillarKey={key}
              data={data}
              expanded={expandedPillar === key}
              onToggle={() => setExpandedPillar(expandedPillar === key ? null : key)}
            />
          ))}
          {/* Weight explanation */}
          <div className="bg-muted/20 border border-[hsl(var(--border))] rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <strong className="text-foreground">How Trust Score is calculated:</strong> Compliance (30%) + Security (25%) + AI Protection (25%) + Data (20%).
                Scores are derived from live data in the compliance database — controls, audit history, security events, and evidence items.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Protection tab ────────────────────────────────────────────────── */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Hero */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Brain className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-bold text-foreground">AI & Machine Learning Protection</h2>
              <span className={`ml-auto text-2xl font-black ${scoreColor(pillars.ai?.score||0)}`}>{pillars.ai?.score||0}/100</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Demonstrating proactive AI risk management aligned to NIST AI RMF 1.0 (Govern / Map / Measure / Manage)
              and adversarial threat modelling via MITRE ATLAS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NIST AI RMF */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-foreground">NIST AI RMF 1.0</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['GOVERN', 'MAP', 'MEASURE', 'MANAGE'].map(fn => (
                  <div key={fn} className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-3">
                    <div className="text-xs font-bold text-purple-500 mb-1">{fn}</div>
                    <div className="text-lg font-black text-foreground">
                      {pillars.ai?.metrics?.ai_rmf_coverage_pct||0}%
                    </div>
                    <div className="text-xs text-muted-foreground">coverage</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {pillars.ai?.metrics?.ai_rmf_controls_implemented||0} of {pillars.ai?.metrics?.ai_rmf_controls_total||72} subcategories implemented
              </div>
            </div>

            {/* MITRE ATLAS */}
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-pink-500" />
                <h3 className="font-bold text-foreground">MITRE ATLAS v5.6</h3>
              </div>
              <div className="space-y-2">
                {[
                  ['Reconnaissance', pillars.ai?.metrics?.atlas_coverage_pct||0],
                  ['AI Attack Staging', pillars.ai?.metrics?.atlas_coverage_pct||0],
                  ['Execution & Persistence', pillars.ai?.metrics?.atlas_coverage_pct||0],
                  ['Exfiltration & Impact', pillars.ai?.metrics?.atlas_coverage_pct||0],
                ].map(([tactic, pct]) => (
                  <div key={tactic} className="flex items-center gap-2">
                    <span className="text-xs text-foreground w-40 shrink-0">{tactic}</span>
                    <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-pink-500 w-8 text-right">{Math.round(pct)}%</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {pillars.ai?.metrics?.atlas_tactics_covered||0} of {pillars.ai?.metrics?.atlas_tactics_total||16} tactics covered
              </div>
            </div>
          </div>

          {/* Automation */}
          <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/15 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">AI-Powered Automation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-black text-primary">{pillars.ai?.metrics?.active_playbooks||0}</div>
                <div className="text-sm font-medium text-foreground mt-1">Active Playbooks</div>
                <div className="text-xs text-muted-foreground">Auto-remediation scripts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-purple-500">{pillars.ai?.metrics?.learned_patterns||0}</div>
                <div className="text-sm font-medium text-foreground mt-1">Learned Patterns</div>
                <div className="text-xs text-muted-foreground">ML-detected behaviours</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-green-500">{pillars.security?.metrics?.resolution_rate_pct||100}%</div>
                <div className="text-sm font-medium text-foreground mt-1">Threat Resolution</div>
                <div className="text-xs text-muted-foreground">Automated + manual</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Evidence & Audit tab ─────────────────────────────────────────────── */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          {/* Evidence vault */}
          <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-500" />
              Evidence Vault
            </h3>
            {evidenceSummary.length > 0 ? (
              <div className="space-y-2">
                {evidenceSummary.map(e => (
                  <div key={e.evidence_type} className="flex items-center gap-3 py-2 border-b border-[hsl(var(--border))] last:border-0">
                    <FileCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground capitalize flex-1">{(e.evidence_type||'').replace(/_/g,' ')}</span>
                    <span className="text-sm text-muted-foreground">{e.count} items</span>
                    <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">{e.validated_count||0} validated</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No evidence items recorded yet. Upload evidence from the Audits view.</p>
              </div>
            )}
          </div>

          {/* Control categories */}
          {ctrlCats.length > 0 && (
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Control Coverage by Category
              </h3>
              <div className="space-y-2.5">
                {ctrlCats.map(cat => {
                  const pct = Math.round((cat.implemented / cat.total) * 100);
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className="text-xs text-foreground w-36 shrink-0 truncate">{cat.category}</span>
                      <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${scoreBg(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-xs font-bold w-10 text-right ${scoreColor(pct)}`}>{pct}%</span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{cat.implemented}/{cat.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Audits */}
          {reportData?.audits?.length > 0 && (
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-5">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-green-500" />
                Audit Engagements
              </h3>
              <div className="space-y-2">
                {reportData.audits.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-[hsl(var(--border))] last:border-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${a.status==='completed'?'bg-green-500':a.status==='in_progress'?'bg-blue-500':'bg-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{a.audit_name}</div>
                      <div className="text-xs text-muted-foreground">{a.framework} · {a.status}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${scoreColor(a.readiness_score)}`}>{a.readiness_score}%</div>
                      <div className="text-xs text-muted-foreground">readiness</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
