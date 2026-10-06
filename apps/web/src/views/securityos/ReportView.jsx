/**
 * ReportView — Detailed Security Report
 *
 * Level 3 view: full technical/security assessment.
 * Different from SecurityProfileView (executive summary).
 *
 * Supports three privacy modes:
 *   INTERNAL    — full technical detail for MSP engineers
 *   CLIENT_SAFE — appropriate for sharing with customer IT/leadership
 *   REDACTED    — sensitive identifiers removed/masked
 *
 * Sections:
 *   1. Executive Summary
 *   2. Security Readiness
 *   3. Critical Risks
 *   4. Control-by-Control Results
 *   5. Evidence Sources
 *   6. Framework Readiness
 *   7. Attestations
 *   8. Remediation Priorities
 */
import { useState, useMemo } from 'react';
import { useApp } from '../../SecurityOSApp';
import { CATEGORY_LABEL, STATUS } from '../../data/controls';
import { toGrade, calculateFrameworkReadiness, calculateImpact } from '../../data/scoring';
import {
  ArrowLeft, Download, Lock, Users, Shield,
  CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, ShieldCheck, Zap, PenLine,
  FileText, Copy,
} from 'lucide-react';

const PRIVACY_MODES = [
  { id: 'INTERNAL',    label: 'Internal',    desc: 'Full technical detail' },
  { id: 'CLIENT_SAFE', label: 'Client',      desc: 'Customer-appropriate' },
  { id: 'REDACTED',    label: 'Redacted',    desc: 'PII removed' },
];

const STATUS_ICON = {
  pass:        { icon: CheckCircle2, color: 'text-green-400' },
  fail:        { icon: XCircle,      color: 'text-red-400'   },
  unknown:     { icon: Clock,        color: 'text-slate-500'  },
  in_progress: { icon: Clock,        color: 'text-yellow-400' },
};

const SEV_BADGE = {
  critical: 'bg-red-500/15 text-red-400',
  high:     'bg-orange-500/15 text-orange-400',
  medium:   'bg-yellow-500/15 text-yellow-400',
  low:      'bg-slate-800 text-slate-400',
};

const FW_SHORT = {
  nist_csf_2: 'NIST CSF', nist_ai_rmf: 'AI RMF', hipaa: 'HIPAA',
  pci_dss: 'PCI DSS', ftc_safeguards: 'FTC', cyber_insurance: 'Insurance',
};

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors text-left"
      >
        <p className="text-sm font-bold text-white">{title}</p>
        {open ? <ChevronUp size={14} className="text-slate-500 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function ControlRow({ control, privacy, impact }) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, color } = STATUS_ICON[control.status] || STATUS_ICON.unknown;
  const tags = Object.keys(control.framework_mappings || {}).filter(k => control.framework_mappings[k]?.length > 0);
  const evidenceSrc = privacy === 'REDACTED' ? '[redacted]' : (control.evidenceSource || 'none');

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-3 bg-slate-900/60 hover:bg-slate-800/40 transition-colors text-left"
      >
        <Icon size={14} className={`${color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{control.short_name}</p>
          <p className="text-[10px] text-slate-500">{CATEGORY_LABEL[control.category] || control.category}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEV_BADGE[control.severity] || SEV_BADGE.low}`}>
            {control.severity}
          </span>
          {open ? <ChevronUp size={12} className="text-slate-600" /> : <ChevronDown size={12} className="text-slate-600" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-2.5 bg-slate-900/30">
          {/* Status + evidence */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-500 mb-0.5">Status</p>
              <p className={`font-semibold ${color}`}>{control.status?.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-0.5">Evidence</p>
              <p className="text-slate-300">{evidenceSrc.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-0.5">Confidence</p>
              <p className="text-slate-300">{Math.round((control.evidenceConfidence || 0) * 100)}%</p>
            </div>
            {impact > 0 && (
              <div>
                <p className="text-slate-500 mb-0.5">Fix Impact</p>
                <p className="text-green-400 font-semibold">+{impact} pts</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">Assessment</p>
            <p className="text-xs text-slate-300 leading-relaxed">{control.customer_impact}</p>
          </div>

          {/* Framework tags */}
          {tags.length > 0 && privacy !== 'CLIENT_SAFE' && (
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Framework requirements</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(fw => (
                  <span key={fw} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {FW_SHORT[fw] || fw}: {(control.framework_mappings[fw] || []).slice(0, 2).join(', ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {control.notes && privacy !== 'REDACTED' && (
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Notes</p>
              <p className="text-xs text-slate-400 italic">{control.notes}</p>
            </div>
          )}

          {/* Last checked */}
          {control.lastChecked && privacy === 'INTERNAL' && (
            <p className="text-[10px] text-slate-600">
              Last checked: {new Date(control.lastChecked).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportView({ onBack }) {
  const { scoring, profile, statuses, catalog, attestations } = useApp();
  const { totalScore, issues, passing, allControls, evidenceBreakdown, categories, summary } = scoring;
  const grade = toGrade(totalScore);

  const [privacy, setPrivacy] = useState('CLIENT_SAFE');

  const fwReadiness = useMemo(() => calculateFrameworkReadiness(allControls), [allControls]);

  // Impact per control
  const impacts = useMemo(() => {
    const map = {};
    for (const c of issues) {
      map[c.id] = calculateImpact(c.id, statuses, profile, catalog);
    }
    return map;
  }, [issues, statuses, profile, catalog]);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Group controls by category
  const byCategory = useMemo(() => {
    const out = {};
    for (const c of allControls) {
      if (!c.applicable) continue;
      if (!out[c.category]) out[c.category] = [];
      out[c.category].push(c);
    }
    return out;
  }, [allControls]);

  // Evidence breakdown
  const { automated = 0, integrated = 0, attested = 0, manual = 0 } = evidenceBreakdown;
  const passCount = passing.length;
  const autoCount = automated + integrated;

  function handleExportJSON() {
    const data = {
      generated: new Date().toISOString(),
      privacyMode: privacy,
      organization: privacy === 'REDACTED' ? '[REDACTED]' : (profile.businessName || 'Unknown'),
      securityReadiness: { score: totalScore, grade },
      summary,
      evidenceBreakdown,
      frameworks: fwReadiness,
      controls: allControls
        .filter(c => c.applicable)
        .map(c => ({
          id: c.id,
          name: privacy === 'REDACTED' ? '[REDACTED]' : c.short_name,
          category: c.category,
          status: c.status,
          severity: c.severity,
          evidenceSource: privacy === 'REDACTED' ? '[REDACTED]' : c.evidenceSource,
          evidenceConfidence: c.evidenceConfidence,
        })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `securityos-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopySummary() {
    const lines = [
      `SECURITYOS SECURITY REPORT`,
      `${privacy !== 'REDACTED' ? (profile.businessName || 'Organization') : '[Organization]'}`,
      `Generated: ${today}`,
      ``,
      `Security Readiness: ${totalScore}/100 — ${grade}`,
      `Critical Risks: ${issues.filter(c => c.severity === 'critical').length}`,
      `Open Fixes: ${issues.length}`,
      `Passing Controls: ${passing.length}`,
      ``,
      `Evidence Coverage:`,
      `  Automated: ${autoCount}`,
      `  Attested:  ${attested}`,
      `  Manual:    ${manual}`,
      ``,
      `Framework Readiness:`,
      ...fwReadiness.map(fw => `  ${fw.label}: ${fw.pct}%`),
    ];
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white shrink-0 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base">Detailed Security Report</h1>
          <p className="text-xs text-slate-500">{today}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleCopySummary}
            className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title="Copy summary"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleExportJSON}
            className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title="Export JSON"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Privacy mode selector */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2 mb-1.5">
          <Lock size={11} className="text-slate-500" />
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Report Privacy Mode</p>
        </div>
        <div className="flex gap-2">
          {PRIVACY_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setPrivacy(m.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                privacy === m.id
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5">
          {PRIVACY_MODES.find(m => m.id === privacy)?.desc} — {
            privacy === 'INTERNAL'    ? 'For MSP engineers and internal security teams.' :
            privacy === 'CLIENT_SAFE' ? 'Safe to share with customer IT and leadership.' :
            'Sensitive identifiers removed. Safe for external review.'
          }
        </p>
      </div>

      {/* Report sections */}
      <div className="flex-1 overflow-y-auto">

        {/* 1. Executive Summary */}
        <Section title="1. Executive Summary">
          <div className="space-y-3">
            {privacy !== 'REDACTED' && (
              <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-4">
                <p className="text-xs text-slate-500 mb-0.5">Organization</p>
                <p className="text-white font-bold">{profile.businessName || 'Your Business'}</p>
                {profile.industry && <p className="text-slate-400 text-xs mt-0.5">{profile.industry}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3 text-center">
                <p className="text-3xl font-bold text-white">{totalScore}</p>
                <p className="text-xs text-slate-400 mt-0.5">Security Readiness</p>
                <p className="text-xs text-indigo-400 font-semibold">{grade}</p>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-2.5">
                  <p className="text-[10px] text-slate-500">Critical Risks</p>
                  <p className="text-lg font-bold text-red-400">
                    {issues.filter(c => c.severity === 'critical').length}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-2.5">
                  <p className="text-[10px] text-slate-500">Open Fixes</p>
                  <p className="text-lg font-bold text-yellow-400">{issues.length}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {profile.businessName ? `${profile.businessName} maintains` : 'This organization maintains'} a Security Readiness Score of{' '}
              <span className="text-white font-semibold">{totalScore}/100 ({grade})</span> as assessed by SecurityOS on{' '}
              {today}. {issues.length > 0
                ? `There are ${issues.length} open security controls requiring attention, including ${issues.filter(c => c.severity === 'critical').length} critical and ${issues.filter(c => c.severity === 'high').length} high severity findings.`
                : 'All controls are currently passing.'
              }
            </p>
          </div>
        </Section>

        {/* 2. Critical Risks */}
        {issues.filter(c => c.severity === 'critical').length > 0 && (
          <Section title="2. Critical Risks">
            <div className="space-y-2">
              {issues.filter(c => c.severity === 'critical').map(c => (
                <div key={c.id} className="flex items-start gap-3 rounded-xl bg-red-500/8 border border-red-500/20 p-3">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">{c.short_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.customer_impact}</p>
                    {c.notes && privacy !== 'REDACTED' && (
                      <p className="text-xs text-red-300/70 mt-1 italic">{c.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 3. Control-by-Control Results */}
        <Section title="3. Control Results" defaultOpen={false}>
          {Object.entries(byCategory).map(([cat, controls]) => (
            <div key={cat} className="mb-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
                {CATEGORY_LABEL[cat] || cat}
              </p>
              {controls.map(c => (
                <ControlRow
                  key={c.id}
                  control={c}
                  privacy={privacy}
                  impact={impacts[c.id] ?? 0}
                />
              ))}
            </div>
          ))}
        </Section>

        {/* 4. Evidence Sources */}
        <Section title="4. Evidence Sources" defaultOpen={false}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Automated',  count: autoCount,  icon: Zap,        col: 'text-green-400',  bg: 'bg-green-500/10'  },
                { label: 'Attested',   count: attested,   icon: ShieldCheck, col: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                { label: 'Manual',     count: manual,     icon: PenLine,    col: 'text-slate-400',  bg: 'bg-slate-800'     },
                { label: 'Unverified', count: summary.unknown, icon: Clock, col: 'text-slate-600',  bg: 'bg-slate-800/60'  },
              ].map(({ label, count, icon: Icon, col, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-3`}>
                  <Icon size={13} className={`${col} mb-1`} />
                  <p className="text-xl font-bold text-white">{count}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {privacy === 'INTERNAL' && (
              <p className="text-xs text-slate-500 leading-relaxed">
                Evidence confidence hierarchy: Automated (100%) → Integrated Third-Party (90%) → Attested (70%) → Manual (50%) → Unknown (0%). Score is weighted by evidence confidence — connecting integrations will raise the score even before fixing issues.
              </p>
            )}
          </div>
        </Section>

        {/* 5. Framework Readiness */}
        <Section title="5. Framework Readiness" defaultOpen={false}>
          {fwReadiness.length === 0 ? (
            <p className="text-sm text-slate-500">No framework mappings found.</p>
          ) : (
            <div className="space-y-4">
              {fwReadiness.map(fw => (
                <div key={fw.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-white">{fw.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{fw.passing}/{fw.total} controls</span>
                      <span className={`text-sm font-bold ${
                        fw.pct >= 80 ? 'text-green-400' : fw.pct >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{fw.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-700/60 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fw.pct >= 80 ? 'bg-green-500' : fw.pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${fw.pct}%` }}
                    />
                  </div>
                  {fw.failing > 0 && privacy !== 'CLIENT_SAFE' && (
                    <p className="text-[10px] text-slate-500 mt-1">{fw.failing} failing control{fw.failing !== 1 ? 's' : ''}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 6. Attestations */}
        {attestations.length > 0 && (
          <Section title="6. Attestations" defaultOpen={false}>
            <div className="space-y-2">
              {attestations.map(a => {
                const daysLeft = Math.floor((new Date(a.expiresAt) - Date.now()) / 86400000);
                const isExpiring = daysLeft >= 0 && daysLeft <= 14;
                return (
                  <div key={a.id} className="rounded-xl bg-slate-800/60 border border-slate-700 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{a.providerIcon || '🔒'}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{a.providerName}</p>
                          {a.providerProduct && <p className="text-xs text-slate-500">{a.providerProduct}</p>}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        a.status === 'active'  ? 'bg-green-500/15 text-green-400'  :
                        a.status === 'expired' ? 'bg-red-500/15 text-red-400'      :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {a.status?.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(a.controlIds || []).slice(0, 5).map(id => (
                        <span key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600/15 text-indigo-400">{id}</span>
                      ))}
                      {(a.controlIds?.length ?? 0) > 5 && (
                        <span className="text-[10px] text-slate-600">+{a.controlIds.length - 5} more</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      {privacy !== 'REDACTED' ? (
                        <span>Attested by {a.attesterName || 'Unknown'}</span>
                      ) : (
                        <span>Attested by [REDACTED]</span>
                      )}
                      <span className={isExpiring ? 'text-amber-400 font-semibold' : ''}>
                        {daysLeft < 0 ? 'Expired' : `Expires in ${daysLeft}d`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* 7. Top Remediation Priorities */}
        {issues.length > 0 && (
          <Section title="7. Remediation Priorities" defaultOpen={false}>
            <div className="space-y-2">
              {issues.slice(0, 8).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-900/60 border border-slate-800 px-3 py-2.5">
                  <span className="text-xs font-bold text-slate-600 w-4 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{c.short_name}</p>
                    <p className="text-[10px] text-slate-500">{c.severity} · ~{c.estimated_minutes || 30} min</p>
                  </div>
                  {(impacts[c.id] ?? 0) > 0 && (
                    <span className="text-[10px] text-green-400 font-semibold shrink-0">+{impacts[c.id]} pts</span>
                  )}
                </div>
              ))}
              {issues.length > 8 && (
                <p className="text-xs text-slate-600 text-center pt-1">
                  +{issues.length - 8} more in Fix Roadmap
                </p>
              )}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="px-5 py-5">
          <p className="text-[10px] text-slate-700 text-center leading-relaxed">
            SecurityOS Detailed Security Report · {today}<br />
            Privacy mode: {privacy} · Generated automatically from control engine data
          </p>
        </div>
      </div>

      {/* Export bar */}
      <div className="border-t border-slate-800 px-4 py-3 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <FileText size={12} /> Print / PDF
        </button>
        <button
          onClick={handleExportJSON}
          className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <Download size={12} /> Export JSON
        </button>
        <button
          onClick={handleCopySummary}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
        >
          <Copy size={12} /> Copy
        </button>
      </div>
    </div>
  );
}
