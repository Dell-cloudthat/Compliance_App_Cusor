import { useApp, ScoreRing } from '../../SecurityOSApp';
import { CATEGORIES, STATUS } from '../../data/controls';
import { scoreToColor, scoreToGrade } from '../../data/scoring';
import {
  AlertTriangle, CheckCircle2, Clock, ChevronRight,
  UserCheck, Laptop, Database, Cloud, Shield, TrendingUp,
} from 'lucide-react';

const CATEGORY_ICONS = {
  identity: UserCheck,
  devices: Laptop,
  data: Database,
  network: Cloud,
  organization: Shield,
};

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  high: { label: 'High', dot: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  medium: { label: 'Medium', dot: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
};

function ScoreCard({ score }) {
  const grade = scoreToGrade(score);
  const color = scoreToColor(score);

  const colorMap = {
    green: { text: 'text-green-400', label: 'text-green-400', bg: 'bg-green-500/10' },
    blue: { text: 'text-indigo-400', label: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    yellow: { text: 'text-yellow-400', label: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    orange: { text: 'text-orange-400', label: 'text-orange-400', bg: 'bg-orange-500/10' },
    red: { text: 'text-red-400', label: 'text-red-400', bg: 'bg-red-500/10' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="relative bg-slate-900 rounded-2xl border border-slate-800 p-6 overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-indigo-500 translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative flex items-center gap-6">
        <div className="relative shrink-0">
          <ScoreRing score={score} size={120} strokeWidth={8} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-white">{score}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">Security Readiness Score</p>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${c.bg} ${c.label}`}>
            {grade}
          </div>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            {score >= 90
              ? 'Your business has excellent security practices in place.'
              : score >= 75
              ? 'You\'re well-protected with a few areas to improve.'
              : score >= 60
              ? 'Your security is fair but has some important gaps.'
              : 'Your business has significant security vulnerabilities.'}
          </p>
          <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
            <Clock size={11} /> Last checked: just now
          </p>
        </div>
      </div>
    </div>
  );
}

function IssueCard({ control, onClick }) {
  const sev = SEVERITY_CONFIG[control.severity] || SEVERITY_CONFIG.medium;
  const isUnknown = control.status === STATUS.UNKNOWN;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:border-slate-600 ${sev.bg}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${sev.dot}`} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${sev.text}`}>
              {isUnknown ? 'Unknown' : sev.label}
            </span>
          </div>
          <p className="text-white text-sm font-semibold">{control.shortTitle}</p>
          {control.notes && (
            <p className="text-slate-400 text-xs mt-0.5 truncate">{control.notes}</p>
          )}
          {isUnknown && (
            <p className="text-slate-500 text-xs mt-0.5">Status not verified</p>
          )}
        </div>
        <ChevronRight size={16} className="text-slate-500 shrink-0 mt-1" />
      </div>
    </button>
  );
}

function CategoryBar({ catData }) {
  const Icon = CATEGORY_ICONS[catData.id] || Shield;
  const pct = Math.round((catData.score / catData.maxScore) * 100);

  const barColor =
    pct >= 90 ? 'bg-green-500' :
    pct >= 70 ? 'bg-indigo-500' :
    pct >= 50 ? 'bg-yellow-500' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-300 font-medium">{catData.label}</span>
          <span className="text-slate-400 tabular-nums">{catData.score}/{catData.maxScore}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function DashboardView() {
  const { scoring, profile, navigateTo } = useApp();
  const { totalScore, categories, summary, topIssues } = scoring;

  const failingControls = Object.values(categories)
    .flatMap((cat) => cat.controls)
    .filter((c) => c.status === STATUS.FAIL || c.status === STATUS.UNKNOWN)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {profile.businessName ? `${profile.businessName}` : 'Your Security Dashboard'}
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {summary.failing + summary.unknown > 0
            ? `${summary.failing + summary.unknown} item${summary.failing + summary.unknown !== 1 ? 's' : ''} need attention`
            : 'Everything looks good — keep it up!'}
        </p>
      </div>

      {/* Score Card */}
      <ScoreCard score={totalScore} />

      {/* Issues */}
      {failingControls.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400" />
              Needs Attention
            </h2>
            <button
              onClick={() => navigateTo('controls')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {failingControls.slice(0, 4).map((control) => (
              <IssueCard
                key={control.id}
                control={control}
                onClick={() => navigateTo('controls', control.id)}
              />
            ))}
          </div>
          {failingControls.length > 4 && (
            <button
              onClick={() => navigateTo('controls')}
              className="mt-2 w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:text-white hover:border-slate-600 transition-colors"
            >
              +{failingControls.length - 4} more issues
            </button>
          )}
        </div>
      )}

      {/* All passing! */}
      {failingControls.length === 0 && (
        <div className="flex items-center gap-4 p-5 bg-green-500/10 rounded-2xl border border-green-500/20">
          <CheckCircle2 size={32} className="text-green-400 shrink-0" />
          <div>
            <p className="text-white font-semibold">All controls passing</p>
            <p className="text-slate-400 text-sm">Your security is in excellent shape. Keep checking back.</p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Score Breakdown</h2>
        </div>
        <div className="space-y-4">
          {Object.values(categories).map((cat) => (
            <CategoryBar key={cat.id} catData={cat} />
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Passing', value: summary.passing, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Issues', value: summary.failing + summary.unknown, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Total Controls', value: summary.total, color: 'text-slate-300', bg: 'bg-slate-800' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-3 text-center ${stat.bg}`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigateTo('copilot')}
          className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left hover:border-slate-600 transition-colors"
        >
          <div className="text-2xl mb-2">🤖</div>
          <p className="text-white text-sm font-semibold">Ask AI Copilot</p>
          <p className="text-slate-500 text-xs mt-0.5">Get personalized advice</p>
        </button>
        <button
          onClick={() => navigateTo('passport')}
          className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left hover:border-slate-600 transition-colors"
        >
          <div className="text-2xl mb-2">🏅</div>
          <p className="text-white text-sm font-semibold">Trust Passport</p>
          <p className="text-slate-500 text-xs mt-0.5">Share your security proof</p>
        </button>
      </div>
    </div>
  );
}
