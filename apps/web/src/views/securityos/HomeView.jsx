import { useApp, ScoreRing } from '../../SecurityOSApp';
import { STATUS, SEVERITY_DOT } from '../../data/controls';
import { toGrade, toColor } from '../../data/scoring';
import { calculateTCO, riskLevel, fmtUSD } from '../../data/risk';
import { CheckCircle2, ChevronRight, Clock, Info, TrendingDown, ShieldAlert } from 'lucide-react';

const COLOR_TEXT = {
  green:  'text-green-400',
  blue:   'text-indigo-400',
  yellow: 'text-yellow-400',
  orange: 'text-orange-400',
  red:    'text-red-400',
};

const COLOR_BG = {
  green:  'bg-green-500/10',
  blue:   'bg-indigo-500/10',
  yellow: 'bg-yellow-500/10',
  orange: 'bg-orange-500/10',
  red:    'bg-red-500/10',
};

function IssueRow({ control, onFix }) {
  const isFail    = control.status === STATUS.FAIL;
  const isUnknown = control.status === STATUS.UNKNOWN;
  const dot = isFail
    ? (control.severity === 'critical' ? '🔴' : '🟡')
    : '⚪';

  return (
    <button
      onClick={() => onFix(control.id)}
      className="w-full flex items-center gap-4 px-5 py-4 border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors text-left"
    >
      <span className="text-xl shrink-0 leading-none">{dot}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">{control.short_name}</p>
        <p className="text-slate-400 text-xs mt-0.5 truncate">{control.customerMessage}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-xs font-semibold ${isUnknown ? 'text-slate-500' : 'text-indigo-400'}`}>
          {isUnknown ? 'Verify' : 'Fix it'}
        </span>
        <ChevronRight size={14} className="text-slate-500" />
      </div>
    </button>
  );
}

function PassingRow({ control, onReview }) {
  return (
    <button
      onClick={() => onReview(control.id)}
      className="w-full flex items-center gap-4 px-5 py-3.5 border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors text-left"
    >
      <span className="text-lg shrink-0 leading-none">🟢</span>
      <div className="flex-1 min-w-0">
        <p className="text-slate-400 text-sm font-medium">{control.short_name}</p>
      </div>
      <CheckCircle2 size={16} className="text-green-500/60 shrink-0" />
    </button>
  );
}

export default function HomeView() {
  const { scoring, profile, statuses, catalog, openFix, openRisk } = useApp();
  const { totalScore, grade, color, issues, passing, summary, verifiedPct, confidenceNote } = scoring;

  const tco = calculateTCO(profile, statuses, issues, catalog);
  const rl  = riskLevel(tco);

  const RISK_BANNER = {
    red:    { bg: 'bg-red-500/10',    border: 'border-red-500/25',    text: 'text-red-400',    label: 'Critical Exposure' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-400', label: 'High Exposure' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', text: 'text-yellow-400', label: 'Moderate Exposure' },
    green:  { bg: 'bg-green-500/8',   border: 'border-green-500/20',  text: 'text-green-400',  label: 'Low Exposure' },
  };
  const rb = RISK_BANNER[rl.color] || RISK_BANNER.yellow;

  const colorText = COLOR_TEXT[color] || COLOR_TEXT.blue;
  const colorBg   = COLOR_BG[color]   || COLOR_BG.blue;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header / Score */}
      <div className="px-5 pt-10 pb-6 text-center border-b border-slate-800">
        {/* Business name */}
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-4 font-medium">
          {profile.businessName || 'Your Business'}
        </p>

        {/* Score ring */}
        <div className="relative inline-flex items-center justify-center mb-3">
          <ScoreRing score={totalScore} size={140} strokeWidth={9} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white tabular-nums">{totalScore}</span>
            <span className="text-xs text-slate-500 mt-0.5">out of 100</span>
          </div>
        </div>

        {/* Grade badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold mb-3 ${colorBg} ${colorText}`}>
          Security Readiness: {grade}
        </div>

        {/* Confidence note */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Clock size={11} />
          <span>{confidenceNote}</span>
        </div>
      </div>

      {/* Issues section */}
      <div className="flex-1">
        {issues.length > 0 ? (
          <>
            <div className="px-5 pt-5 pb-2">
              <p className="text-white font-bold text-lg">
                {issues.length === 1
                  ? 'You have 1 thing to fix.'
                  : `You have ${issues.length} things to fix.`}
              </p>
            </div>

            {/* Issue list */}
            <div className="mt-1">
              {issues.map(control => (
                <IssueRow key={control.id} control={control} onFix={openFix} />
              ))}
            </div>

            {/* Passing controls (collapsed section) */}
            {passing.length > 0 && (
              <div className="mt-4">
                <p className="px-5 text-xs text-slate-500 uppercase tracking-widest font-medium mb-1">
                  {passing.length} control{passing.length !== 1 ? 's' : ''} passing
                </p>
                {passing.slice(0, 6).map(control => (
                  <PassingRow key={control.id} control={control} onReview={openFix} />
                ))}
                {passing.length > 6 && (
                  <p className="px-5 py-3 text-xs text-slate-600">
                    +{passing.length - 6} more passing
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          /* All passing */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-white text-xl font-bold mb-2">All clear!</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              All {summary.total} controls are passing. Your business is well-protected.
              Connect integrations to automatically verify your status.
            </p>
          </div>
        )}
      </div>

      {/* Cost of Risk teaser card */}
      <div className="px-4 pb-2 pt-4">
        <button
          onClick={openRisk}
          className={`w-full ${rb.bg} ${rb.border} border rounded-2xl p-4 text-left hover:opacity-90 transition-opacity`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} className={rb.text} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${rb.text}`}>
                Cost of Risk
              </span>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              Full analysis <ChevronRight size={12} />
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Annual risk</p>
              <p className={`text-base font-bold ${rb.text} tabular-nums`}>
                {fmtUSD(tco.annual_risk_cost)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Fix cost</p>
              <p className="text-base font-bold text-white tabular-nums">
                {tco.fix_cost_pro > 0 ? fmtUSD(tco.fix_cost_pro) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Breach risk</p>
              <p className="text-base font-bold text-white tabular-nums">
                {fmtUSD(tco.breach.median)}
              </p>
            </div>
          </div>

          {tco.insur.denial_risks.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-700/40">
              <ShieldAlert size={11} className="text-red-400 shrink-0" />
              <p className="text-[10px] text-red-400">
                {tco.insur.denial_risks.length} insurance claim denial risk{tco.insur.denial_risks.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          )}
        </button>
      </div>

      {/* Bottom padding for nav */}
      <div className="h-4" />
    </div>
  );
}
