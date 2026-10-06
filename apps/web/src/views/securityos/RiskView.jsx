import { useState } from 'react';
import { useApp } from '../../SecurityOSApp';
import { STATUS } from '../../data/controls';
import {
  estimateBreachCost,
  estimateRemediationCost,
  estimateInsuranceImpact,
  calculateTCO,
  riskLevel,
  fmtUSD,
  CONTROL_RISK_LIFT,
  INSURANCE_REQUIREMENTS,
} from '../../data/risk';
import {
  ArrowLeft,
  AlertTriangle,
  ShieldOff,
  TrendingDown,
  DollarSign,
  BadgeAlert,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

// ── Color maps ─────────────────────────────────────────────────────────────────
const RISK_COLORS = {
  red:    { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    badge: 'bg-red-500/20 text-red-300',    bar: 'bg-red-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300', bar: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300', bar: 'bg-yellow-500' },
  green:  { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  badge: 'bg-green-500/20 text-green-300',  bar: 'bg-green-500' },
};

const SEV_DOT = { critical: '🔴', high: '🟡', medium: '🟠', low: '⚪' };

function SectionHeader({ icon: Icon, title, subtitle, color = 'text-white' }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={17} className={color} />
      </div>
      <div>
        <h2 className="text-white font-bold text-base">{title}</h2>
        {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Pill({ children, className = '' }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${className}`}>
      {children}
    </span>
  );
}

function Divider() {
  return <div className="border-t border-slate-800 my-6" />;
}

// ── Section 1: Breach Risk ─────────────────────────────────────────────────────
function BreachSection({ breach, probPct, issues, statuses }) {
  const [expanded, setExpanded] = useState(false);

  const lifts = Object.entries(CONTROL_RISK_LIFT)
    .filter(([id]) => {
      const s = (statuses[id] ?? {}).status;
      return s === STATUS.FAIL || s === STATUS.UNKNOWN;
    })
    .slice(0, 4);

  return (
    <div>
      <SectionHeader
        icon={ShieldOff}
        title="If You Were Breached Today"
        subtitle="Based on IBM Cost of a Data Breach 2024 + Ponemon SMB data"
        color="text-red-400"
      />

      {/* Main cost callout */}
      <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-5 mb-4">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-slate-400 mb-1">Estimated breach cost range</p>
            <p className="text-3xl font-bold text-white">
              {fmtUSD(breach.low)}
              <span className="text-slate-500 text-xl mx-1">–</span>
              {fmtUSD(breach.high)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Annual breach probability</p>
            <p className="text-2xl font-bold text-red-400">{probPct}%</p>
          </div>
        </div>

        {/* Probability bar */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Breach likelihood (this year)</span>
            <span>{probPct}% based on your gaps</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{ width: `${Math.min(100, probPct * 2)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Industry baseline: 16% · Your risk: {probPct}% · Source: Verizon DBIR 2024
          </p>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-2 mb-4">
        {breach.components.map(c => (
          <div key={c.label} className="flex items-center gap-3">
            <span className="text-base shrink-0">{c.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-slate-300 truncate">{c.label}</span>
                <span className="text-xs text-slate-400 shrink-0 ml-2">{fmtUSD(c.median)}</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full">
                <div
                  className="h-full rounded-full bg-slate-600"
                  style={{ width: `${Math.round(c.pct * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Why your risk is elevated */}
      {lifts.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-left"
          >
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Why your risk is elevated
            </p>
            {expanded ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
          </button>
          {expanded && (
            <ul className="mt-3 space-y-2">
              {lifts.map(([id, lift]) => (
                <li key={id} className="flex gap-2 text-xs text-slate-400">
                  <AlertTriangle size={12} className="text-yellow-500 shrink-0 mt-0.5" />
                  <span>{lift.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section 2: Remediation Cost ────────────────────────────────────────────────
function RemediationSection({ remed }) {
  const { items, total_diy, total_pro } = remed;

  if (!items.length) {
    return (
      <div>
        <SectionHeader
          icon={DollarSign}
          title="Cost to Fix Everything"
          subtitle="Market rate to resolve all open issues"
          color="text-green-400"
        />
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
          <p className="text-green-400 font-semibold">No open issues — nothing to fix!</p>
          <p className="text-slate-400 text-sm mt-1">You're in great shape.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        icon={DollarSign}
        title="Cost to Fix Everything"
        subtitle="Market rate to resolve all open issues"
        color="text-indigo-400"
      />

      {/* DIY vs. MSP comparison */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Do it yourself</p>
          <p className="text-2xl font-bold text-white">{fmtUSD(total_diy)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Time + any tool costs</p>
        </div>
        <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-4 text-center">
          <p className="text-xs text-indigo-300 mb-1">With IT provider</p>
          <p className="text-2xl font-bold text-white">{fmtUSD(total_pro)}</p>
          <p className="text-[10px] text-indigo-400 mt-1">@$125/hr · done right</p>
        </div>
      </div>

      {/* Per-control breakdown */}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 bg-slate-900 rounded-xl px-4 py-3 border border-slate-800">
            <span className="text-sm shrink-0">{SEV_DOT[item.severity] || '⚪'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{item.name}</p>
              <p className="text-xs text-slate-500">{item.minutes} min to implement</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-white">{fmtUSD(item.pro_cost)}</p>
              <p className="text-[10px] text-slate-500">DIY: {fmtUSD(item.diy_cost)}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-600 mt-3 text-center">
        IT provider rate: $125/hr · DIY opportunity cost: $75/hr · Tool costs included
      </p>
    </div>
  );
}

// ── Section 3: Insurance Impact ────────────────────────────────────────────────
function InsuranceSection({ insur, statuses }) {
  const ELIGIBILITY_CONFIG = {
    good:     { label: 'Likely Eligible',      color: RISK_COLORS.green  },
    moderate: { label: 'Higher Premiums Likely', color: RISK_COLORS.yellow },
    at_risk:  { label: 'Coverage at Risk',     color: RISK_COLORS.red    },
  };

  const cfg = ELIGIBILITY_CONFIG[insur.eligibility] || ELIGIBILITY_CONFIG.moderate;
  const hasImpacts = insur.all_impacts.length > 0;

  return (
    <div>
      <SectionHeader
        icon={BadgeAlert}
        title="Cyber Insurance Impact"
        subtitle="How your current gaps affect coverage and premiums"
        color="text-yellow-400"
      />

      {/* Eligibility status */}
      <div className={`${cfg.color.bg} ${cfg.color.border} border rounded-2xl p-5 mb-4`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Current eligibility assessment</p>
            <p className={`text-xl font-bold ${cfg.color.text}`}>{cfg.color.label ?? cfg.label}</p>
          </div>
          {insur.all_impacts.length === 0
            ? <CheckCircle2 size={28} className="text-green-400" />
            : <XCircle size={28} className={cfg.color.text} />}
        </div>

        {hasImpacts && (
          <div className="border-t border-slate-700/50 pt-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Estimated premium impact</p>
                <p className="text-lg font-bold text-white mt-0.5">
                  +{fmtUSD(insur.total_premium_low)}–{fmtUSD(insur.total_premium_high)}/yr
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Claim denial risks</p>
                <p className="text-lg font-bold text-white mt-0.5">
                  {insur.denial_risks.length} control{insur.denial_risks.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Per-requirement breakdown */}
      {hasImpacts && (
        <div className="space-y-2.5">
          {insur.all_impacts.map(req => {
            const IMPACT_LABEL = {
              required:        { text: 'Required', color: 'text-red-400',    bg: 'bg-red-500/15'    },
              premium_increase:{ text: 'Premium +', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
              sublimit:        { text: 'Sublimit',  color: 'text-orange-400', bg: 'bg-orange-500/15' },
            };
            const imp = IMPACT_LABEL[req.impact] || IMPACT_LABEL.premium_increase;

            return (
              <div key={req.control_id} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {req.denial_risk
                      ? <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      : <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />}
                    <p className="text-sm text-white font-medium">{req.label}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${imp.bg} ${imp.color}`}>
                    {imp.text}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{req.note}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Required by: {req.required_by.slice(0, 3).join(', ')}
                    {req.required_by.length > 3 ? ` +${req.required_by.length - 3}` : ''}
                  </p>
                  <p className="text-xs font-semibold text-yellow-400">
                    +{fmtUSD(req.premium_increase_min)}–{fmtUSD(req.premium_increase_max)}/yr
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasImpacts && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <CheckCircle2 size={22} className="text-green-400 mx-auto mb-2" />
          <p className="text-green-400 font-semibold text-sm">All required controls passing</p>
          <p className="text-slate-400 text-xs mt-1">You qualify for standard or preferred pricing at major carriers.</p>
        </div>
      )}

      {/* Insurance tip */}
      <div className="mt-4 bg-slate-900 rounded-xl border border-slate-800 p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Good to know</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your Trust Passport score improves your cyber insurance application.
          Most carriers now ask specifically about MFA, backups, and endpoint protection.
          Fixing these issues before applying can save{' '}
          <span className="text-white font-semibold">
            {fmtUSD(insur.total_premium_low + insur.baseline_premium_estimate * 0.1)}–
            {fmtUSD(insur.total_premium_high)}/year
          </span>{' '}
          in premiums.
        </p>
      </div>
    </div>
  );
}

// ── Section 4: TCO of Inaction ─────────────────────────────────────────────────
function TCOSection({ tco }) {
  const fix = fmtUSD(tco.fix_cost_pro);
  const risk1 = fmtUSD(tco.annual_risk_cost);
  const risk3 = fmtUSD(tco.three_year_risk_cost);
  const savings3 = fmtUSD(Math.max(0, tco.three_year_savings));

  return (
    <div>
      <SectionHeader
        icon={TrendingDown}
        title="TCO of Inaction"
        subtitle="Total cost of NOT fixing your gaps vs. fixing them now"
        color="text-orange-400"
      />

      {/* 3-column summary */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-400 mb-1">Fix cost (now)</p>
          <p className="text-lg font-bold text-white">{fix}</p>
          <p className="text-[10px] text-indigo-400 mt-0.5">one-time</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-400 mb-1">Risk cost</p>
          <p className="text-lg font-bold text-red-400">{risk1}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">per year</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-400 mb-1">3-yr savings</p>
          <p className="text-lg font-bold text-green-400">{savings3}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">if fixed now</p>
        </div>
      </div>

      {/* Break-even timeline */}
      {tco.break_even_months_pro > 0 && (
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-indigo-400 shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">
                Break-even: {tco.break_even_months_pro} month{tco.break_even_months_pro !== 1 ? 's' : ''}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                Fixing all issues pays for itself in {tco.break_even_months_pro} month{tco.break_even_months_pro !== 1 ? 's' : ''} based on risk reduction alone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3-year comparison bar chart */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-4 font-medium">3-Year Cost Comparison</p>

        <div className="space-y-4">
          {/* Cost if you fix */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">✅ Fix now</span>
              <span className="text-green-400 font-semibold">{fmtUSD(tco.three_year_fix_cost)}</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${Math.max(5, Math.min(100, (tco.three_year_fix_cost / Math.max(tco.three_year_risk_cost, tco.three_year_fix_cost)) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Fix cost + reduced insurance premiums (3 yrs)</p>
          </div>

          {/* Cost if you don't fix */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">❌ Do nothing</span>
              <span className="text-red-400 font-semibold">{risk3}</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500"
                style={{
                  width: `${Math.max(5, Math.min(100, (tco.three_year_risk_cost / Math.max(tco.three_year_risk_cost, tco.three_year_fix_cost)) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Expected breach cost + premium overpayment (3 yrs)</p>
          </div>
        </div>

        {tco.three_year_savings > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
            <span className="text-green-400 text-lg">→</span>
            <p className="text-sm text-slate-300">
              Fixing everything now saves an estimated{' '}
              <span className="text-green-400 font-bold">{savings3}</span> over 3 years.
            </p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600 mt-3 text-center leading-relaxed">
        Risk figures are estimates based on IBM/Ponemon breach data and market insurance rates.
        Actual costs vary by incident type, industry, and carrier. This is not financial or legal advice.
      </p>
    </div>
  );
}

// ── Main RiskView ──────────────────────────────────────────────────────────────
export default function RiskView({ onBack }) {
  const { profile, statuses, scoring, catalog } = useApp();
  const { issues } = scoring;

  const breach = estimateBreachCost(profile, statuses);
  const remed  = estimateRemediationCost(issues, catalog);
  const insur  = estimateInsuranceImpact(statuses);
  const tco    = calculateTCO(profile, statuses, issues, catalog);
  const rl     = riskLevel(tco);

  const probPct = Math.round(tco.breach_prob_annual * 100);

  const RISK_C = RISK_COLORS[rl.color] || RISK_COLORS.yellow;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base">Cost of Risk</h1>
          <p className="text-slate-400 text-xs">Financial impact of your security gaps</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${RISK_C.badge}`}>
          {rl.label}
        </span>
      </div>

      {/* Annual risk number — lead with the big number */}
      <div className={`mx-4 mt-4 ${RISK_C.bg} ${RISK_C.border} border rounded-2xl p-5`}>
        <p className="text-xs text-slate-400 mb-1">Estimated annual risk cost</p>
        <p className={`text-4xl font-bold ${RISK_C.text} tabular-nums`}>
          {fmtUSD(tco.annual_risk_cost)}
          <span className="text-slate-500 text-base font-normal ml-1">/yr</span>
        </p>
        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
          Expected breach exposure ({probPct}% annual probability) +
          insurance premium impact
          {issues.length > 0 && ` across ${issues.length} open issue${issues.length !== 1 ? 's' : ''}`}.
        </p>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-0">
        <BreachSection breach={breach} probPct={probPct} issues={issues} statuses={statuses} />
        <Divider />
        <RemediationSection remed={remed} />
        <Divider />
        <InsuranceSection insur={insur} statuses={statuses} />
        <Divider />
        <TCOSection tco={tco} />

        {/* CTA */}
        <div className="mt-6 mb-2">
          <button
            onClick={onBack}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
          >
            Go fix the issues →
          </button>
        </div>
      </div>
    </div>
  );
}
