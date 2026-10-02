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
  AUTOMATIC: 'automatic',   // verified via integration API — highest confidence
  MANUAL: 'manual',         // customer self-attested — moderate confidence
  INFERRED: 'inferred',     // inferred from indirect signals
  NONE: 'none',             // not gathered
};

export const EVIDENCE_CONFIDENCE = {
  automatic: 1.0,
  manual: 0.70,
  inferred: 0.50,
  none: 0.0,
};

export const CATEGORIES = {
  identity:     { id: 'identity',     label: 'Identity',        maxScore: 20 },
  devices:      { id: 'devices',      label: 'Devices',         maxScore: 20 },
  data:         { id: 'data',         label: 'Data',            maxScore: 20 },
  network:      { id: 'network',      label: 'Cloud & Network', maxScore: 20 },
  organization: { id: 'organization', label: 'Organization',    maxScore: 20 },
};

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
