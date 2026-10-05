import { useRef } from 'react';
import { useApp, ScoreRing } from '../../SecurityOSApp';
import { CATEGORIES, STATUS } from '../../data/controls';
import { scoreToGrade, scoreToColor } from '../../data/scoring';
import {
  ShieldCheck, BadgeCheck, Download, Share2, CheckCircle2,
  XCircle, Clock, UserCheck, Laptop, Database, Cloud, Shield,
} from 'lucide-react';

const CATEGORY_ICONS = {
  identity: UserCheck,
  devices: Laptop,
  data: Database,
  network: Cloud,
  organization: Shield,
};

function ControlStatusRow({ label, status }) {
  if (status === STATUS.PASS) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 size={14} className="text-green-400 shrink-0" />
        <span className="text-slate-300">{label}</span>
      </div>
    );
  }
  if (status === STATUS.FAIL) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <XCircle size={14} className="text-red-400 shrink-0" />
        <span className="text-slate-500 line-through">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock size={14} className="text-slate-500 shrink-0" />
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

function PassportCard({ profile, scoring, printRef }) {
  const score = scoring.totalScore;
  const grade = scoreToGrade(score);
  const color = scoreToColor(score);

  const colorClasses = {
    green: { gradient: 'from-green-900/40 to-slate-900', accent: 'text-green-400', border: 'border-green-500/40', badge: 'bg-green-500/20 text-green-400' },
    blue: { gradient: 'from-indigo-900/40 to-slate-900', accent: 'text-indigo-400', border: 'border-indigo-500/40', badge: 'bg-indigo-500/20 text-indigo-400' },
    yellow: { gradient: 'from-yellow-900/30 to-slate-900', accent: 'text-yellow-400', border: 'border-yellow-500/40', badge: 'bg-yellow-500/20 text-yellow-400' },
    orange: { gradient: 'from-orange-900/30 to-slate-900', accent: 'text-orange-400', border: 'border-orange-500/40', badge: 'bg-orange-500/20 text-orange-400' },
    red: { gradient: 'from-red-900/30 to-slate-900', accent: 'text-red-400', border: 'border-red-500/40', badge: 'bg-red-500/20 text-red-400' },
  };

  const c = colorClasses[color] || colorClasses.blue;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div
      ref={printRef}
      className={`bg-gradient-to-b ${c.gradient} rounded-2xl border ${c.border} p-6 space-y-6`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">SecurityOS</span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Trust Passport</p>
        </div>
        <div className="flex items-center gap-2">
          <BadgeCheck size={18} className={c.accent} />
          <span className={`text-xs font-semibold ${c.accent}`}>Verified</span>
        </div>
      </div>

      {/* Business name */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          {profile.businessName || 'Your Business'}
        </h2>
        {profile.industry && (
          <p className="text-slate-400 text-sm mt-0.5">{profile.industry}</p>
        )}
      </div>

      {/* Score */}
      <div className="flex items-center gap-5 p-4 bg-black/20 rounded-xl">
        <div className="relative shrink-0">
          <ScoreRing score={score} size={80} strokeWidth={6} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{score}</span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-400">Security Readiness</p>
          <p className="text-xl font-bold text-white">{grade}</p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${c.badge}`}>
            {score >= 90 ? '✓ Excellent Protection' :
             score >= 75 ? '✓ Good Protection' :
             score >= 60 ? '⚠ Fair Protection' :
             '⚠ Needs Improvement'}
          </span>
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Security Categories</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(scoring.categories).map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || Shield;
            const pct = Math.round((cat.score / cat.maxScore) * 100);
            const catColor =
              pct >= 90 ? 'text-green-400' :
              pct >= 70 ? 'text-indigo-400' :
              pct >= 50 ? 'text-yellow-400' :
              'text-red-400';

            return (
              <div key={cat.id} className="flex items-center gap-3 bg-black/20 rounded-lg p-3">
                <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">{cat.label}</span>
                    <span className={`text-xs font-bold ${catColor}`}>{cat.score}/{cat.maxScore}</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full mt-1">
                    <div
                      className={`h-full rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-indigo-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key controls verified */}
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Key Controls Verified</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {[
            { id: 'CTRL-ID-001', label: 'Multi-Factor Authentication' },
            { id: 'CTRL-DEV-001', label: 'Device Encryption' },
            { id: 'CTRL-DATA-003', label: 'Data Backups' },
            { id: 'CTRL-DEV-003', label: 'Endpoint Protection' },
            { id: 'CTRL-ORG-001', label: 'Security Policy' },
            { id: 'CTRL-ORG-002', label: 'Incident Response' },
            { id: 'CTRL-ORG-003', label: 'Security Training' },
            { id: 'CTRL-NET-004', label: 'Admin Access Control' },
          ].map(({ id, label }) => (
            <ControlStatusRow
              key={id}
              label={label}
              status={scoring.allControls.find((c) => c.id === id)?.status ?? STATUS.UNKNOWN}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 pt-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">Last Verified</p>
          <p className="text-sm text-slate-300 font-medium">{today}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Powered by</p>
          <p className="text-sm text-white font-bold">SecurityOS</p>
        </div>
      </div>
    </div>
  );
}

export default function TrustPassportView() {
  const { profile, scoring } = useApp();
  const passportRef = useRef(null);
  const score = scoring.totalScore;

  function handlePrint() {
    window.print();
  }

  function handleCopyLink() {
    const text = `${profile.businessName || 'Our business'} maintains a Security Readiness Score of ${score}/100 (${scoreToGrade(score)}) as verified by SecurityOS on ${new Date().toLocaleDateString()}.`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Security summary copied to clipboard!');
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trust Passport</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Share proof of your security with clients, vendors, and insurance carriers.
        </p>
      </div>

      {score < 70 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-amber-400 font-semibold text-sm">Improve your score before sharing</p>
            <p className="text-slate-400 text-sm mt-0.5">
              Your current score is {score}/100. Fix the open issues in the "Fix Issues" tab to strengthen your passport before sharing with clients.
            </p>
          </div>
        </div>
      )}

      {/* Passport card */}
      <PassportCard profile={profile} scoring={scoring} printRef={passportRef} />

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium transition-colors"
        >
          <Download size={16} /> Download / Print
        </button>
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Share2 size={16} /> Copy Summary
        </button>
      </div>

      {/* When to share */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">When to share your passport</h3>
        <div className="space-y-3">
          {[
            { emoji: '🏥', title: 'Vendor questionnaires', desc: 'When enterprise clients ask for a security review' },
            { emoji: '🏦', title: 'Cyber insurance', desc: 'Show insurers your security posture for better rates' },
            { emoji: '🤝', title: 'Client trust', desc: 'Demonstrate security commitment to new and existing clients' },
            { emoji: '📋', title: 'Partner due diligence', desc: 'Satisfy partner onboarding security requirements' },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="text-lg shrink-0">{item.emoji}</span>
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
