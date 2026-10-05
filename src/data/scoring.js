/**
 * SecurityOS Scoring Engine
 * Calculates Security Readiness Score from control statuses.
 */
import { CONTROLS_CATALOG, CATEGORIES, STATUS } from './controls.js';

/**
 * Calculate the security readiness score for a given set of control statuses.
 * @param {Object} controlStatuses - Map of controlId → { status, notes, lastChecked }
 * @returns {Object} scoring result
 */
export function calculateScore(controlStatuses = {}) {
  const categoryScores = {};
  const categoryDetails = {};

  for (const [catKey, catMeta] of Object.entries(CATEGORIES)) {
    const catControls = CONTROLS_CATALOG.filter((c) => c.category === catMeta.id);
    let earned = 0;
    let possible = 0;
    const controlResults = [];

    for (const control of catControls) {
      const statusEntry = controlStatuses[control.id];
      const status = statusEntry?.status ?? STATUS.UNKNOWN;
      const pointValue = control.weight;
      possible += pointValue;

      let points = 0;
      if (status === STATUS.PASS) {
        points = pointValue;
      } else if (status === STATUS.IN_PROGRESS) {
        points = Math.round(pointValue * 0.5);
      }
      earned += points;

      controlResults.push({
        ...control,
        status,
        points,
        maxPoints: pointValue,
        lastChecked: statusEntry?.lastChecked ?? null,
        notes: statusEntry?.notes ?? null,
      });
    }

    const rawScore = possible > 0 ? (earned / possible) * catMeta.maxScore : 0;
    categoryScores[catMeta.id] = Math.round(rawScore);
    categoryDetails[catMeta.id] = {
      ...catMeta,
      score: Math.round(rawScore),
      earned,
      possible,
      controls: controlResults,
    };
  }

  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);

  const allControls = Object.values(categoryDetails).flatMap((c) => c.controls);
  const failingControls = allControls.filter((c) => c.status === STATUS.FAIL);
  const unknownControls = allControls.filter((c) => c.status === STATUS.UNKNOWN);
  const passingControls = allControls.filter((c) => c.status === STATUS.PASS);

  const criticalIssues = failingControls.filter((c) => c.severity === 'critical');
  const highIssues = failingControls.filter((c) => c.severity === 'high');

  return {
    totalScore,
    maxScore: 100,
    grade: scoreToGrade(totalScore),
    color: scoreToColor(totalScore),
    categories: categoryDetails,
    summary: {
      total: allControls.length,
      passing: passingControls.length,
      failing: failingControls.length,
      unknown: unknownControls.length,
      criticalIssues: criticalIssues.length,
      highIssues: highIssues.length,
    },
    topIssues: [...criticalIssues, ...highIssues].slice(0, 5),
    allControls,
  };
}

export function scoreToGrade(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'At Risk';
}

export function scoreToColor(score) {
  if (score >= 90) return 'green';
  if (score >= 75) return 'blue';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}

export function scoreToEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 75) return '🔵';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

/**
 * Generate a demo starting state with some controls set.
 */
export function generateDemoStatuses() {
  return {
    'CTRL-ID-001': { status: STATUS.FAIL, notes: '3 users without MFA', lastChecked: new Date().toISOString() },
    'CTRL-ID-002': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-ID-003': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-ID-004': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-ID-005': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-DEV-001': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-DEV-002': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-DEV-003': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-DEV-004': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-DEV-005': { status: STATUS.UNKNOWN, notes: null, lastChecked: null },
    'CTRL-DATA-001': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-DATA-002': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-DATA-003': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-DATA-004': { status: STATUS.FAIL, notes: 'Last verified 52 days ago', lastChecked: new Date().toISOString() },
    'CTRL-DATA-005': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-NET-001': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-NET-002': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-NET-003': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-NET-004': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-NET-005': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-ORG-001': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-ORG-002': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-ORG-003': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-ORG-004': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
    'CTRL-ORG-005': { status: STATUS.PASS, notes: null, lastChecked: new Date().toISOString() },
  };
}
