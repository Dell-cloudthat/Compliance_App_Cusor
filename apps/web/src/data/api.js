/**
 * SecurityOS API client — connects the frontend to the backend at localhost:8001.
 *
 * Connection lifecycle:
 *   1. Call connectToAPI() once on startup.
 *   2. If the backend is reachable, it creates a demo session and stores
 *      token + orgId + mspId in localStorage under 'securityos_api_session'.
 *   3. All subsequent calls use the stored session.
 *   4. Falls back gracefully if the backend is offline.
 */

export const API_BASE = 'http://localhost:8001/api/v1/securityos';
const SESSION_KEY = 'securityos_api_session';

// ── Session management ────────────────────────────────────────────────────────

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(detail.detail || res.statusText), { status: res.status });
  }
  return res.json();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Connect to the backend API. Creates a demo session if none exists.
 * Returns the session object { token, orgId, mspId, orgName } or null if offline.
 */
export async function connectToAPI() {
  // Reuse an existing session
  const existing = loadSession();
  if (existing?.token) {
    try {
      // Verify it still works with a lightweight call
      await apiFetch(`/organizations/${existing.orgId}/score`, {
        headers: authHeaders(existing.token),
      });
      return existing;
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        clearSession(); // Token expired — re-bootstrap
      } else {
        return null; // Backend offline
      }
    }
  }

  // Bootstrap a new demo session
  try {
    const data = await fetch(`${API_BASE}/dev/demo`, { method: 'POST', signal: AbortSignal.timeout(5000) });
    if (!data.ok) return null;
    const session = await data.json();
    const s = { token: session.token, orgId: session.org_id, mspId: session.msp_id, orgName: session.org_name };
    saveSession(s);
    return s;
  } catch {
    return null;
  }
}

// ── Score & Evidence ──────────────────────────────────────────────────────────

export async function getScore(orgId, token) {
  return apiFetch(`/organizations/${orgId}/score`, { headers: authHeaders(token) });
}

export async function getScoreEvidence(orgId, token) {
  return apiFetch(`/organizations/${orgId}/score/evidence`, { headers: authHeaders(token) });
}

// ── Findings ──────────────────────────────────────────────────────────────────

export async function getFindings(orgId, token, { overdue, severity, state } = {}) {
  const params = new URLSearchParams();
  if (overdue !== undefined) params.set('overdue', overdue);
  if (severity) params.set('severity', severity);
  if (state)    params.set('state', state);
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch(`/organizations/${orgId}/findings${qs}`, { headers: authHeaders(token) });
}

export async function createFinding(orgId, token, body) {
  return apiFetch(`/organizations/${orgId}/findings`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export async function transitionFinding(orgId, findingId, token, action, extra = {}) {
  return apiFetch(`/organizations/${orgId}/findings/${findingId}/transition`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ action, ...extra }),
  });
}

// ── Grounded Copilot ──────────────────────────────────────────────────────────

export async function getGroundedCopilot(orgId, token, message) {
  return apiFetch(`/organizations/${orgId}/copilot`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ message }),
  });
}

// ── Integrations ──────────────────────────────────────────────────────────────

export async function getIntegrations(orgId, token) {
  return apiFetch(`/organizations/${orgId}/integrations`, { headers: authHeaders(token) });
}

export async function connectM365(orgId, token, tenantId, tenantDomain) {
  return apiFetch(`/organizations/${orgId}/integrations/m365/connect`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ tenant_id: tenantId, tenant_domain: tenantDomain }),
  });
}

export async function getM365Status(orgId, token) {
  return apiFetch(`/organizations/${orgId}/integrations/m365/status`, {
    headers: authHeaders(token),
  });
}

// ── MSP priority queue ────────────────────────────────────────────────────────

export async function getMSPPriorityQueue(mspId, token) {
  return apiFetch(`/msp/${mspId}/priority-queue`, { headers: authHeaders(token) });
}

export async function getMSPDashboard(mspId, token) {
  return apiFetch(`/msp/${mspId}/dashboard`, { headers: authHeaders(token) });
}

// ── Intelligence ──────────────────────────────────────────────────────────────

export async function getIntelligence(orgId, token, { monthlyBudget } = {}) {
  const params = new URLSearchParams();
  if (monthlyBudget !== undefined) params.set('monthly_budget', monthlyBudget);
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch(`/organizations/${orgId}/intelligence${qs}`, { headers: authHeaders(token) });
}
