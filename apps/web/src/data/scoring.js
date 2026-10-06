/**
 * SecurityOS Scoring Engine (frontend)
 *
 * Score = Σ(risk_weight × evidence_confidence) across passing controls
 * normalized to 0–100.
 *
 * Key principle: UNKNOWN ≠ PASS. Unknown controls contribute 0 points.
 * The score also reports verification coverage so customers understand
 * "87/100 based on 72% verified controls" rather than an inflated number.
 */
import { CONTROLS_CATALOG, CATEGORIES, STATUS, EVIDENCE_CONFIDENCE, isApplicable } from './controls.js';

const SEVERITY_WEIGHT = { critical: 1.0, high: 0.75, medium: 0.50, low: 0.25 };

export function calculateScore(controlStatuses = {}, profile = null, catalog = null) {
  const controls = catalog ?? CONTROLS_CATALOG;

  let totalEarned = 0;
  let totalMax = 0;
  let verifiedCount = 0;
  let applicableCount = 0;

  // Evidence breakdown counters for passing controls only
  const evidenceBreakdown = {
    automated: 0,    // direct_automated or automatic
    integrated: 0,   // integrated_third_party
    attested: 0,     // attested_third_party
    manual: 0,       // manual or inferred
    unknown: 0,      // none / unverified
  };

  const categoryBuckets = {};
  const allResults = [];

  for (const control of controls) {
    const applicable = isApplicable(control, profile);
    const entry = controlStatuses[control.id] ?? {};
    const status = entry.status ?? STATUS.UNKNOWN;
    const evidenceSrc = entry.evidence_source ??
      (status !== STATUS.UNKNOWN ? 'manual' : 'none');
    const confidence = EVIDENCE_CONFIDENCE[evidenceSrc] ?? 0;
    const riskWeight = control.risk_weight ?? SEVERITY_WEIGHT[control.severity] ?? 0.5;
    // Scale so sum of all max_points = 100
    const maxPts = riskWeight * 4.0;

    if (applicable) {
      applicableCount++;
      if (evidenceSrc !== 'none') verifiedCount++;
    }

    let earnedPts = 0;
    if (applicable && status === STATUS.PASS) {
      earnedPts = maxPts * confidence;

      // Bucket the passing control into its evidence tier
      if (evidenceSrc === 'direct_automated' || evidenceSrc === 'automatic') {
        evidenceBreakdown.automated++;
      } else if (evidenceSrc === 'integrated_third_party') {
        evidenceBreakdown.integrated++;
      } else if (evidenceSrc === 'attested_third_party') {
        evidenceBreakdown.attested++;
      } else if (evidenceSrc === 'manual' || evidenceSrc === 'inferred') {
        evidenceBreakdown.manual++;
      } else {
        evidenceBreakdown.unknown++;
      }
    }
    // FAIL, UNKNOWN, IN_PROGRESS → 0 points
    // NOT_APPLICABLE → excluded from totals

    if (applicable) {
      totalEarned += earnedPts;
      totalMax += maxPts;
    }

    const result = {
      ...control,
      status,
      evidenceSource: evidenceSrc,
      evidenceConfidence: confidence,
      applicable,
      earnedPoints: earnedPts,
      maxPoints: maxPts,
      notes: entry.notes ?? null,
      lastChecked: entry.last_checked ?? null,
      customerMessage: buildMessage(control, status, entry.notes),
    };

    allResults.push(result);
    const cat = control.category;
    if (!categoryBuckets[cat]) categoryBuckets[cat] = [];
    categoryBuckets[cat].push(result);
  }

  const totalScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const verifiedPct = applicableCount > 0 ? Math.round((verifiedCount / applicableCount) * 100) : 0;

  // Build category results
  const categories = {};
  for (const [catId, catMeta] of Object.entries(CATEGORIES)) {
    const catControls = (categoryBuckets[catId] ?? []).filter(c => c.applicable);
    const catMax = catControls.reduce((s, c) => s + c.maxPoints, 0);
    const catEarned = catControls.reduce((s, c) => s + c.earnedPoints, 0);
    const catScore = catMax > 0 ? Math.round((catEarned / catMax) * catMeta.maxScore) : 0;

    categories[catId] = {
      ...catMeta,
      score: catScore,
      controls: categoryBuckets[catId] ?? [],
      passing: catControls.filter(c => c.status === STATUS.PASS).length,
      failing: catControls.filter(c => c.status === STATUS.FAIL).length,
      unknown: catControls.filter(c => c.status === STATUS.UNKNOWN).length,
    };
  }

  // Issues: FAIL first (critical → low), then UNKNOWN (critical → low)
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const issues = allResults
    .filter(c => c.applicable && (c.status === STATUS.FAIL || c.status === STATUS.UNKNOWN))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === STATUS.FAIL ? -1 : 1;
      return (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4);
    });

  const passing = allResults.filter(c => c.applicable && c.status === STATUS.PASS);

  const confidenceNote = verifiedPct >= 90
    ? `${verifiedPct}% of controls verified`
    : verifiedPct >= 60
    ? `${verifiedPct}% verified — connect integrations for full accuracy`
    : `${verifiedPct}% verified — score is an estimate`;

  return {
    totalScore,
    maxScore: 100,
    grade: toGrade(totalScore),
    color: toColor(totalScore),
    verifiedPct,
    confidenceNote,
    categories,
    issues,
    passing,
    allControls: allResults,
    evidenceBreakdown,
    summary: {
      total: applicableCount,
      passing: passing.length,
      failing: issues.filter(c => c.status === STATUS.FAIL).length,
      unknown: issues.filter(c => c.status === STATUS.UNKNOWN).length,
      inProgress: allResults.filter(c => c.status === STATUS.IN_PROGRESS).length,
    },
  };
}

function buildMessage(control, status, notes) {
  if (notes) return notes;
  const msgs = control.customer_message ?? {};
  if (status === STATUS.FAIL)    return msgs.fail    ?? `${control.short_name} needs attention`;
  if (status === STATUS.UNKNOWN) return msgs.unknown ?? `${control.short_name} not verified`;
  if (status === STATUS.IN_PROGRESS) return `Fix in progress`;
  return '';
}

export function toGrade(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'At Risk';
}

/**
 * Estimate how many score points would be gained by fixing one control.
 * Simulates the control passing with direct_automated evidence.
 */
export function calculateImpact(controlId, statuses, profile, catalog) {
  const before = calculateScore(statuses, profile, catalog);
  if (before.allControls.find(c => c.id === controlId && c.status === STATUS.PASS)) return 0;
  const fakeStatuses = {
    ...statuses,
    [controlId]: { status: STATUS.PASS, evidence_source: 'automatic', notes: null, last_checked: new Date().toISOString() },
  };
  const after = calculateScore(fakeStatuses, profile, catalog);
  return Math.max(0, after.totalScore - before.totalScore);
}

/**
 * Calculate per-framework readiness percentages from allControls results.
 * Returns an array ordered by most controls (most relevant first).
 */
export function calculateFrameworkReadiness(allControls) {
  const FRAMEWORKS = [
    { id: 'nist_csf_2',     label: 'NIST CSF 2.0' },
    { id: 'nist_ai_rmf',    label: 'NIST AI RMF' },
    { id: 'hipaa',          label: 'HIPAA' },
    { id: 'pci_dss',        label: 'PCI DSS' },
    { id: 'ftc_safeguards', label: 'FTC Safeguards' },
    { id: 'cyber_insurance',label: 'Cyber Insurance' },
  ];

  const result = [];
  for (const { id, label } of FRAMEWORKS) {
    const fwControls = allControls.filter(c =>
      c.applicable &&
      Array.isArray(c.framework_mappings?.[id]) &&
      c.framework_mappings[id].length > 0
    );
    if (fwControls.length === 0) continue;
    const passing = fwControls.filter(c => c.status === STATUS.PASS).length;
    result.push({
      id,
      label,
      total: fwControls.length,
      passing,
      failing: fwControls.filter(c => c.status === STATUS.FAIL).length,
      pct: Math.round((passing / fwControls.length) * 100),
    });
  }
  // Most-populated frameworks first
  return result.sort((a, b) => b.total - a.total);
}

export function toColor(score) {
  if (score >= 90) return 'green';
  if (score >= 75) return 'blue';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}

export function buildDemoStatuses() {
  const now = new Date().toISOString();
  return {
    // Identity
    'CTRL-ID-001': { status: 'fail',    evidence_source: 'automatic', notes: '3 users not protected',       last_checked: now },
    'CTRL-ID-002': { status: 'pass',    evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-ID-003': { status: 'pass',    evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-ID-004': { status: 'pass',    evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-ID-005': { status: 'pass',    evidence_source: 'manual',    notes: null,                          last_checked: now },
    // Devices
    'CTRL-DEV-001': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-DEV-002': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-DEV-003': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-DEV-004': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-DEV-005': { status: 'unknown', evidence_source: 'none',     notes: null,                          last_checked: null },
    // Data
    'CTRL-DATA-001': { status: 'pass',  evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-DATA-002': { status: 'pass',  evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-DATA-003': { status: 'pass',  evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-DATA-004': { status: 'fail',  evidence_source: 'manual',    notes: 'Last verified 52 days ago',   last_checked: now },
    'CTRL-DATA-005': { status: 'pass',  evidence_source: 'manual',    notes: null,                          last_checked: now },
    // Network
    'CTRL-NET-001': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-NET-002': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-NET-003': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-NET-004': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-NET-005': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    // Organization
    'CTRL-ORG-001': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-ORG-002': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-ORG-003': { status: 'unknown', evidence_source: 'none',     notes: null,                          last_checked: null },
    'CTRL-ORG-004': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    'CTRL-ORG-005': { status: 'pass',   evidence_source: 'manual',    notes: null,                          last_checked: now },
    // AI RMF — most SMBs start with these as fail/unknown (they're new requirements)
    'CTRL-AI-001': { status: 'fail',    evidence_source: 'manual',    notes: 'No AI tool inventory exists',               last_checked: now },
    'CTRL-AI-002': { status: 'fail',    evidence_source: 'manual',    notes: 'No AI acceptable use policy',               last_checked: now },
    'CTRL-AI-003': { status: 'unknown', evidence_source: 'none',      notes: null,                                        last_checked: null },
    'CTRL-AI-004': { status: 'unknown', evidence_source: 'none',      notes: null,                                        last_checked: null },
    'CTRL-AI-005': { status: 'fail',    evidence_source: 'manual',    notes: 'AI vendors not assessed',                   last_checked: now },
    'CTRL-AI-006': { status: 'unknown', evidence_source: 'none',      notes: null,                                        last_checked: null },
  };
}
