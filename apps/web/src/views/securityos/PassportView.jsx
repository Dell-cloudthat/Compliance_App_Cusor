import { useApp, ScoreRing } from '../../SecurityOSApp';
import { STATUS } from '../../data/controls';
import { toGrade } from '../../data/scoring';
import { ShieldCheck, BadgeCheck, CheckCircle2, XCircle, Clock, Share2, Download } from 'lucide-react';

const KEY_CONTROLS = [
  { id: 'CTRL-ID-001',  label: 'Multi-Factor Authentication' },
  { id: 'CTRL-DEV-001', label: 'Device Encryption' },
  { id: 'CTRL-DATA-003', label: 'Data Backups' },
  { id: 'CTRL-DEV-003', label: 'Endpoint Protection' },
  { id: 'CTRL-ORG-001', label: 'Security Policy' },
  { id: 'CTRL-ORG-002', label: 'Incident Response' },
  { id: 'CTRL-ORG-003', label: 'Security Training' },
  { id: 'CTRL-NET-004', label: 'Admin Access Control' },
];

const CAT_COLORS = {
  green:  { bar: 'bg-green-500',  text: 'text-green-400' },
  blue:   { bar: 'bg-indigo-500', text: 'text-indigo-400' },
  yellow: { bar: 'bg-yellow-500', text: 'text-yellow-400' },
  orange: { bar: 'bg-orange-500', text: 'text-orange-400' },
  red:    { bar: 'bg-red-500',    text: 'text-red-400' },
};

function catColor(score, max) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.9) return CAT_COLORS.green;
  if (pct >= 0.7) return CAT_COLORS.blue;
  if (pct >= 0.5) return CAT_COLORS.yellow;
  return CAT_COLORS.red;
}

export default function PassportView() {
  const { profile, scoring } = useApp();
  const { totalScore, categories, allControls } = scoring;
  const grade = toGrade(totalScore);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  function statusForControl(id) {
    return allControls.find(c => c.id === id)?.status ?? STATUS.UNKNOWN;
  }

  function handleCopy() {
    const text = `${profile.businessName || 'Our business'} maintains a Security Readiness Score of ${totalScore}/100 (${grade}) as verified by SecurityOS on ${today}.`;
    navigator.clipboard.writeText(text);
    alert('Security summary copied!');
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 border-b border-slate-800">
        <h1 className="text-white font-bold text-xl">Trust Passport</h1>
        <p className="text-slate-400 text-sm mt-0.5">Share your security status with clients and partners.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Passport card */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-5">
          {/* Card header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <ShieldCheck size={14} />
              </div>
              <span className="text-white font-bold text-sm">SecurityOS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BadgeCheck size={16} className="text-indigo-400" />
              <span className="text-xs text-indigo-400 font-semibold">Verified</span>
            </div>
          </div>

          {/* Business */}
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Trust Passport</p>
          <h2 className="text-xl font-bold text-white">{profile.businessName || 'Your Business'}</h2>
          {profile.industry && <p className="text-slate-400 text-sm mt-0.5">{profile.industry}</p>}

          {/* Score */}
          <div className="flex items-center gap-4 mt-5 mb-5 p-4 bg-black/20 rounded-xl">
            <div className="relative shrink-0">
              <ScoreRing score={totalScore} size={70} strokeWidth={5} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{totalScore}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400">Security Readiness</p>
              <p className="text-lg font-bold text-white">{grade}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalScore >= 90 ? '✓ Excellent protection' :
                 totalScore >= 75 ? '✓ Good protection' :
                 totalScore >= 60 ? '⚠ Fair protection' : '⚠ Needs improvement'}
              </p>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2.5 mb-5">
            {Object.values(categories).map(cat => {
              const { bar, text } = catColor(cat.score, cat.maxScore);
              const pct = Math.round((cat.score / cat.maxScore) * 100);
              return (
                <div key={cat.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{cat.label}</span>
                    <span className={text}>{cat.score}/{cat.maxScore}</span>
                  </div>
                  <div className="h-1 bg-slate-700 rounded-full">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key controls */}
          <div className="grid grid-cols-2 gap-1.5">
            {KEY_CONTROLS.map(({ id, label }) => {
              const status = statusForControl(id);
              return (
                <div key={id} className="flex items-center gap-2 text-xs">
                  {status === STATUS.PASS
                    ? <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                    : status === STATUS.FAIL
                    ? <XCircle size={12} className="text-red-400 shrink-0" />
                    : <Clock size={12} className="text-slate-500 shrink-0" />}
                  <span className={status === STATUS.PASS ? 'text-slate-300' : 'text-slate-500'}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 mt-5 pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Last Verified</p>
              <p className="text-sm text-white font-medium">{today}</p>
            </div>
            <p className="text-xs text-slate-600">SecurityOS</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:border-slate-500 transition-colors"
          >
            <Download size={15} /> Print / Save
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Share2 size={15} /> Copy Summary
          </button>
        </div>

        {/* When to share */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">When to share</p>
          {[
            { e: '🏥', t: 'Vendor security questionnaires' },
            { e: '🏦', t: 'Cyber insurance applications' },
            { e: '🤝', t: 'New client onboarding' },
            { e: '📋', t: 'Partner due diligence reviews' },
          ].map(({ e, t }) => (
            <div key={t} className="flex items-center gap-3">
              <span className="text-base">{e}</span>
              <span className="text-sm text-slate-300">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
