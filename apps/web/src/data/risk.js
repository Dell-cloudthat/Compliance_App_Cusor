/**
 * SecurityOS Financial Risk Engine
 *
 * Calculates:
 *   1. Breach cost estimate (what a breach would cost given current gaps)
 *   2. Remediation cost (market rate to fix each open issue)
 *   3. Cyber insurance impact (how gaps affect premiums and eligibility)
 *   4. TCO of inaction (total cost of NOT fixing vs. fixing)
 *
 * Sources:
 *   - IBM Cost of a Data Breach Report 2024
 *   - Ponemon Institute 2023 SMB Cyber Threat Report
 *   - Verizon DBIR 2024
 *   - Coalition, Cowbell, At-Bay SMB insurance underwriting data
 *   - Microsoft Security Intelligence Report (MFA effectiveness)
 */

import { STATUS } from './controls.js';

// ── Breach Cost Baselines (per employee band, USD) ────────────────────────────
// Source: Ponemon/IBM SMB data. These are expected-value estimates, not worst-case.
const BREACH_BASE = {
  'Just me':  { low: 42_000,  high: 110_000, median: 68_000  },
  '2–5':      { low: 58_000,  high: 145_000, median: 92_000  },
  '6–10':     { low: 85_000,  high: 210_000, median: 135_000 },
  '11–25':    { low: 120_000, high: 310_000, median: 195_000 },
  '26–50':    { low: 200_000, high: 520_000, median: 330_000 },
  '50+':      { low: 350_000, high: 950_000, median: 580_000 },
  default:    { low: 95_000,  high: 245_000, median: 155_000 },
};

// ── Industry Multipliers ───────────────────────────────────────────────────────
// Higher multipliers = more regulated, more valuable data, larger fines
const INDUSTRY_MULT = {
  'medical':    2.8,   // HIPAA fines $100–$50K per violation + class action
  'dental':     2.8,
  'therapy':    2.5,   // HIPAA + sensitive mental health records
  'mental':     2.5,
  'legal':      2.2,   // Attorney-client privilege, case data value
  'law':        2.2,
  'accounting': 2.0,   // Tax ID, financial data, IRS exposure
  'cpa':        2.0,
  'financial':  2.0,   // SEC/FINRA exposure, fiduciary liability
  'insurance':  1.8,
  'real estate':1.5,   // Transaction data, escrow, wire fraud target
  'e-commerce': 1.6,   // PCI DSS, card data, customer PII
  'it ':        1.3,   // MSP breach hits all clients (supply chain)
  'msp':        1.8,
  default:      1.0,
};

// ── Breach Component Breakdown ────────────────────────────────────────────────
// Each component as % of total breach cost (Ponemon 2024 breakdown)
const BREACH_COMPONENTS = [
  { label: 'Incident Response & Investigation', pct: 0.22, icon: '🔍' },
  { label: 'Legal Fees & Regulatory Counsel',  pct: 0.18, icon: '⚖️' },
  { label: 'Business Downtime & Recovery',      pct: 0.28, icon: '⏱️' },
  { label: 'Customer Notification & Credit',    pct: 0.12, icon: '📨' },
  { label: 'Reputation & Customer Loss',        pct: 0.20, icon: '📉' },
];

// ── Control → Breach Probability Reduction ────────────────────────────────────
// How much each missing control increases breach likelihood.
// Source: Microsoft Security Report, CISA, Verizon DBIR
const CONTROL_RISK_LIFT = {
  'CTRL-ID-001': { pct: 45, label: 'No MFA → 45× more likely to be breached via credential theft' },
  'CTRL-ID-002': { pct: 30, label: 'Unprotected admin accounts → primary ransomware entry vector' },
  'CTRL-DEV-001': { pct: 25, label: 'Unencrypted devices → immediate breach on theft/loss' },
  'CTRL-DEV-003': { pct: 30, label: 'No endpoint protection → 3× longer detection time' },
  'CTRL-DATA-003': { pct: 40, label: 'No backups → 90% chance of paying ransom demand' },
  'CTRL-DATA-004': { pct: 20, label: 'Unverified backups → ~40% fail to restore when needed' },
  'CTRL-NET-004': { pct: 25, label: 'Weak admin controls → lateral movement after breach' },
  'CTRL-ORG-002': { pct: 15, label: 'No incident plan → 4× longer breach containment time' },
  'CTRL-ORG-003': { pct: 20, label: 'Untrained employees → #1 phishing/social engineering risk' },
  'CTRL-DEV-002': { pct: 18, label: 'Unpatched systems → known CVE exploits' },
};

// ── IT Provider Market Rates for Remediation ─────────────────────────────────
// Hourly rate for SMB IT provider / MSP. Source: CompTIA, Tech Republic surveys.
const IT_PROVIDER_RATE = 125; // $/hr
const OWNER_TIME_RATE  = 75;  // $/hr (opportunity cost of owner's time)

// Additional tool/software costs beyond time (one-time or first-year)
const CONTROL_TOOL_COST = {
  'CTRL-DEV-003': 600,   // Endpoint protection software, ~$50/device × 12 devices
  'CTRL-DATA-003': 300,  // Cloud backup service setup + first year
  'CTRL-DEV-002': 200,   // Patch management tool / process setup
  'CTRL-ORG-003': 400,   // Security awareness training platform (1 year)
  'CTRL-NET-003': 300,   // Vulnerability scanner setup
  'CTRL-DATA-005': 150,  // Encryption tool configuration
  'default': 0,
};

// ── Cyber Insurance Requirements ─────────────────────────────────────────────
// What major SMB carriers require for coverage. Denial = claim likely denied.
// Source: Coalition, Cowbell, At-Bay, Travelers underwriting guidelines.
const INSURANCE_REQUIREMENTS = [
  {
    control_id: 'CTRL-ID-001',
    label: 'Multi-Factor Authentication',
    required_by: ['Coalition', 'Cowbell', 'At-Bay', 'Travelers', 'Chubb'],
    impact: 'required',  // 'required' | 'premium_increase' | 'sublimit'
    denial_risk: true,   // Claim likely denied if missing
    premium_increase_min: 800,
    premium_increase_max: 2500,
    note: 'MFA is now a hard requirement at most carriers. Missing it can result in policy non-renewal or 30–50% premium surcharge.',
  },
  {
    control_id: 'CTRL-DATA-003',
    label: 'Data Backups',
    required_by: ['Coalition', 'Cowbell', 'At-Bay', 'Travelers'],
    impact: 'required',
    denial_risk: true,
    premium_increase_min: 600,
    premium_increase_max: 1800,
    note: 'Carriers deny ransomware recovery claims if no backups existed. This is the #1 claim denial reason.',
  },
  {
    control_id: 'CTRL-DATA-004',
    label: 'Backup Verification (Tested Restores)',
    required_by: ['Coalition', 'At-Bay'],
    impact: 'sublimit',
    denial_risk: true,
    premium_increase_min: 400,
    premium_increase_max: 1200,
    note: 'Unverified backups that fail during recovery can void your ransomware coverage.',
  },
  {
    control_id: 'CTRL-DEV-003',
    label: 'Endpoint Protection',
    required_by: ['Coalition', 'Cowbell', 'Travelers', 'Chubb'],
    impact: 'premium_increase',
    denial_risk: false,
    premium_increase_min: 300,
    premium_increase_max: 900,
    note: 'Antivirus/EDR is required by most carriers. Absence increases premiums.',
  },
  {
    control_id: 'CTRL-ORG-003',
    label: 'Employee Security Training',
    required_by: ['Coalition', 'Cowbell'],
    impact: 'premium_increase',
    denial_risk: false,
    premium_increase_min: 200,
    premium_increase_max: 600,
    note: 'Annual security awareness training reduces premium by 5–10% at most carriers.',
  },
  {
    control_id: 'CTRL-ORG-002',
    label: 'Incident Response Plan',
    required_by: ['Travelers', 'Chubb', 'At-Bay'],
    impact: 'premium_increase',
    denial_risk: false,
    premium_increase_min: 250,
    premium_increase_max: 750,
    note: 'Having a documented IR plan qualifies for lower premiums and faster claims.',
  },
  {
    control_id: 'CTRL-DEV-001',
    label: 'Device Encryption',
    required_by: ['Coalition', 'At-Bay'],
    impact: 'sublimit',
    denial_risk: false,
    premium_increase_min: 200,
    premium_increase_max: 600,
    note: 'Unencrypted device theft typically triggers a breach notification obligation and may be excluded from coverage.',
  },
  {
    control_id: 'CTRL-ID-002',
    label: 'Privileged Account Protection',
    required_by: ['Coalition', 'At-Bay'],
    impact: 'premium_increase',
    denial_risk: false,
    premium_increase_min: 300,
    premium_increase_max: 800,
    note: 'Dedicated admin accounts and admin MFA required for full coverage at leading carriers.',
  },
];

// ── Helper: format currency ───────────────────────────────────────────────────
export function fmtUSD(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

// ── Breach Cost Estimate ──────────────────────────────────────────────────────
export function estimateBreachCost(profile, statuses) {
  const empKey = profile?.employeeCount || 'default';
  const base = BREACH_BASE[empKey] || BREACH_BASE.default;

  // Industry multiplier
  const industry = (profile?.industry || '').toLowerCase();
  let mult = INDUSTRY_MULT.default;
  for (const [key, val] of Object.entries(INDUSTRY_MULT)) {
    if (key !== 'default' && industry.includes(key)) { mult = val; break; }
  }

  // Sensitive data surcharge
  const sensitiveData = profile?.sensitiveData || [];
  let dataSurcharge = 0;
  if (sensitiveData.includes('phi'))      dataSurcharge += 0.40;  // HIPAA fines
  if (sensitiveData.includes('payment'))  dataSurcharge += 0.25;  // PCI penalties
  if (sensitiveData.includes('federal'))  dataSurcharge += 0.60;  // Federal contract risk

  const finalMult = mult + dataSurcharge;

  // Current control gaps — each critical/high missing gap increases median cost
  const criticalMissing = Object.entries(statuses || {})
    .filter(([id, entry]) => {
      const lift = CONTROL_RISK_LIFT[id];
      return lift && (entry.status === STATUS.FAIL || entry.status === STATUS.UNKNOWN);
    }).length;

  // Gap penalty: each missing high-risk control adds 15-20% to breach cost
  const gapPenalty = 1 + (criticalMissing * 0.17);

  return {
    low:    Math.round(base.low    * finalMult * gapPenalty / 1000) * 1000,
    high:   Math.round(base.high   * finalMult * gapPenalty / 1000) * 1000,
    median: Math.round(base.median * finalMult * gapPenalty / 1000) * 1000,
    multiplier: finalMult,
    components: BREACH_COMPONENTS.map(c => ({
      ...c,
      low:    Math.round(base.low    * finalMult * gapPenalty * c.pct / 1000) * 1000,
      median: Math.round(base.median * finalMult * gapPenalty * c.pct / 1000) * 1000,
    })),
  };
}

// ── Remediation Cost Per Control ──────────────────────────────────────────────
export function estimateRemediationCost(issues, catalog) {
  if (!issues?.length || !catalog?.length) return { total_low: 0, total_high: 0, items: [] };

  const items = issues.map(issue => {
    const control = catalog.find(c => c.id === issue.id);
    const minutes = control?.estimated_minutes ?? 60;

    const ownerHours = minutes / 60;
    const providerHours = ownerHours * 1.3; // MSP takes ~30% longer (documentation, etc.)

    const toolCost = CONTROL_TOOL_COST[issue.id] ?? CONTROL_TOOL_COST.default;
    const diy_cost  = Math.round(ownerHours    * OWNER_TIME_RATE  + toolCost);
    const pro_cost  = Math.round(providerHours * IT_PROVIDER_RATE + toolCost);

    return {
      id:        issue.id,
      name:      control?.short_name ?? issue.id,
      severity:  issue.severity,
      diy_cost,
      pro_cost,
      minutes:   control?.estimated_minutes ?? 60,
      tool_cost: toolCost,
    };
  });

  return {
    total_diy: items.reduce((s, i) => s + i.diy_cost, 0),
    total_pro: items.reduce((s, i) => s + i.pro_cost, 0),
    items,
  };
}

// ── Insurance Impact ──────────────────────────────────────────────────────────
export function estimateInsuranceImpact(statuses) {
  const statusMap = statuses || {};

  const impacts = INSURANCE_REQUIREMENTS
    .filter(req => {
      const entry = statusMap[req.control_id] ?? {};
      const status = entry.status ?? STATUS.UNKNOWN;
      return status === STATUS.FAIL || status === STATUS.UNKNOWN;
    })
    .map(req => ({
      ...req,
      current_status: (statusMap[req.control_id] ?? {}).status ?? STATUS.UNKNOWN,
    }));

  const denial_risks     = impacts.filter(i => i.denial_risk);
  const premium_increase = impacts.filter(i => !i.denial_risk);

  const total_premium_low  = impacts.reduce((s, i) => s + i.premium_increase_min, 0);
  const total_premium_high = impacts.reduce((s, i) => s + i.premium_increase_max, 0);

  // Eligibility rating
  let eligibility = 'good';
  if (denial_risks.length >= 2)  eligibility = 'at_risk';
  else if (denial_risks.length === 1 || total_premium_high > 3000) eligibility = 'moderate';

  return {
    eligibility,
    denial_risks,
    premium_increase,
    all_impacts: impacts,
    total_premium_low,
    total_premium_high,
    baseline_premium_estimate: 1800, // Avg SMB cyber insurance premium (Coalition/At-Bay data)
  };
}

// ── TCO of Inaction ───────────────────────────────────────────────────────────
export function calculateTCO(profile, statuses, issues, catalog) {
  const breach  = estimateBreachCost(profile, statuses);
  const remed   = estimateRemediationCost(issues, catalog);
  const insur   = estimateInsuranceImpact(statuses);

  // Annual breach probability for an SMB with gaps (DBIR 2024: 61% of SMBs breached in 5 years)
  // Per year: ~16% baseline. Each critical gap adds ~4%.
  const criticalMissingCount = Object.entries(statuses || {}).filter(([id, e]) => {
    const lift = CONTROL_RISK_LIFT[id];
    return lift && (e.status === STATUS.FAIL || e.status === STATUS.UNKNOWN);
  }).length;

  const breach_prob_annual = Math.min(0.55, 0.16 + criticalMissingCount * 0.04);
  const expected_breach_cost_annual = breach.median * breach_prob_annual;

  // Insurance premium overpayment per year (vs. fixing and getting lower rate)
  const insur_overpayment_annual = Math.round((insur.total_premium_low + insur.total_premium_high) / 2);

  // Total cost of inaction per year
  const annual_risk_cost = Math.round(expected_breach_cost_annual + insur_overpayment_annual);

  // Cost to fix (one-time, DIY or MSP)
  const fix_cost_diy = remed.total_diy;
  const fix_cost_pro = remed.total_pro;

  // Break-even: months until fix pays for itself
  const break_even_months_diy = fix_cost_diy > 0
    ? Math.max(1, Math.round((fix_cost_diy / (annual_risk_cost / 12))))
    : 0;
  const break_even_months_pro = fix_cost_pro > 0
    ? Math.max(1, Math.round((fix_cost_pro / (annual_risk_cost / 12))))
    : 0;

  return {
    breach,
    remed,
    insur,
    breach_prob_annual,
    expected_breach_cost_annual,
    insur_overpayment_annual,
    annual_risk_cost,
    fix_cost_diy,
    fix_cost_pro,
    break_even_months_diy,
    break_even_months_pro,
    // 3-year view
    three_year_risk_cost: annual_risk_cost * 3,
    three_year_fix_cost:  fix_cost_pro + (insur.baseline_premium_estimate * 3),
    three_year_savings:   (annual_risk_cost * 3) - (fix_cost_pro + (insur.baseline_premium_estimate * 3)),
  };
}

// ── Risk Level (for color coding) ────────────────────────────────────────────
export function riskLevel(tco) {
  const annual = tco.annual_risk_cost;
  if (annual >= 80_000)  return { level: 'critical', color: 'red',    label: 'Critical Exposure' };
  if (annual >= 40_000)  return { level: 'high',     color: 'orange', label: 'High Exposure'     };
  if (annual >= 15_000)  return { level: 'moderate', color: 'yellow', label: 'Moderate Exposure' };
  return                        { level: 'low',      color: 'green',  label: 'Low Exposure'      };
}

export { CONTROL_RISK_LIFT, INSURANCE_REQUIREMENTS, BREACH_COMPONENTS };
