/**
 * SecurityOS Control Catalog — loads from compliance/controls/catalog.json
 * at build time via Vite's static import.
 *
 * Controls are dynamic objects, not hard-coded features. Each control carries:
 *   - applicable_industries ([] = all industries)
 *   - evidence_requirements (what evidence satisfies this control)
 *   - verification_methods  (how to verify: api | manual)
 *   - risk_weight           (1.0 critical → 0.25 low)
 *   - framework_mappings    (NIST CSF 2.0, CIS, HIPAA, PCI, FTC, insurance)
 */

// Vite resolves this path relative to the project root at build time
import CATALOG from '../../../../compliance/controls/catalog.json';

export const CONTROLS_CATALOG = CATALOG;

export const STATUS = {
  PASS: 'pass',
  FAIL: 'fail',
  UNKNOWN: 'unknown',
  IN_PROGRESS: 'in_progress',
  NOT_APPLICABLE: 'not_applicable',
};

export const EVIDENCE_SOURCE = {
  DIRECT_AUTOMATED:       'direct_automated',       // native integration API — 1.0
  AUTOMATIC:              'automatic',              // legacy alias → 1.0
  INTEGRATED_THIRD_PARTY: 'integrated_third_party', // live third-party API — 0.9
  ATTESTED_THIRD_PARTY:   'attested_third_party',   // explicit user attestation — 0.7
  MANUAL:                 'manual',                 // self-reported — 0.5
  INFERRED:               'inferred',               // indirect signal — 0.5
  NONE:                   'none',                   // not gathered — 0.0
};

/**
 * Evidence confidence hierarchy:
 *   DIRECT_AUTOMATED  → 1.00  (live integration directly on this control)
 *   INTEGRATED_THIRD  → 0.90  (live integration via third-party connector)
 *   ATTESTED_THIRD    → 0.70  (user explicitly typed ATTEST for a named platform)
 *   MANUAL / INFERRED → 0.50  (self-reported, no automation)
 *   UNKNOWN / NONE    → 0.00
 */
export const EVIDENCE_CONFIDENCE = {
  direct_automated:       1.00,
  automatic:              1.00,  // backward-compat alias
  integrated_third_party: 0.90,
  attested_third_party:   0.70,
  manual:                 0.50,
  inferred:               0.50,
  none:                   0.00,
};

export const CATEGORIES = {
  identity:     { id: 'identity',     label: 'Identity',           maxScore: 20 },
  devices:      { id: 'devices',      label: 'Devices',            maxScore: 20 },
  data:         { id: 'data',         label: 'Data',               maxScore: 20 },
  network:      { id: 'network',      label: 'Cloud & Network',    maxScore: 20 },
  organization: { id: 'organization', label: 'Organization',       maxScore: 20 },
  ai_rmf:       { id: 'ai_rmf',       label: 'AI Risk (AI RMF)',   maxScore: 0 },
};

export const CATEGORY_LABEL = {
  identity:     'Identity & Access',
  devices:      'Device Security',
  data:         'Data Protection',
  network:      'Cloud & Network',
  organization: 'Organization',
  ai_rmf:       'AI Risk Management',
};

// ── Framework selector options ─────────────────────────────────────────────
export const FRAMEWORK_OPTIONS = [
  { id: 'all',             label: 'All Controls',    short: 'All',     icon: '🛡️' },
  { id: 'nist_ai_rmf',    label: 'NIST AI RMF',     short: 'AI RMF',  icon: '🤖' },
  { id: 'nist_csf_2',     label: 'NIST CSF 2.0',    short: 'CSF 2.0', icon: '📋' },
  { id: 'hipaa',           label: 'HIPAA',            short: 'HIPAA',   icon: '🏥' },
  { id: 'pci_dss',         label: 'PCI DSS',          short: 'PCI DSS', icon: '💳' },
  { id: 'ftc_safeguards',  label: 'FTC Safeguards',   short: 'FTC',     icon: '🏦' },
  { id: 'cyber_insurance', label: 'Cyber Insurance',  short: 'Insurance', icon: '🔐' },
];

export function filterControlsByFramework(controls, frameworkId) {
  if (!frameworkId || frameworkId === 'all') return controls;
  return controls.filter(c =>
    c.framework_mappings &&
    Array.isArray(c.framework_mappings[frameworkId]) &&
    c.framework_mappings[frameworkId].length > 0
  );
}

export const SEVERITY_DOT = {
  critical: '🔴',
  high:     '🟡',
  medium:   '🟡',
  low:      '🟢',
};

export const SEVERITY_COLOR = {
  critical: { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    dot: 'bg-red-500' },
  high:     { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
  medium:   { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
  low:      { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  dot: 'bg-green-500' },
};

export function loadCatalog() {
  return CONTROLS_CATALOG;
}

export function getControlById(id) {
  return CONTROLS_CATALOG.find(c => c.id === id);
}

export function isApplicable(control, profile) {
  const industries = control.applicable_industries || [];
  if (industries.length === 0) return true;
  if (!profile?.industry) return true;
  const industry = profile.industry.toLowerCase();
  return industries.some(i => industry.includes(i.toLowerCase()));
}

export default CONTROLS_CATALOG;
