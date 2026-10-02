/**
 * Consent Flow API Service
 * Handles communication with the consent flow backend
 * Flow: User Consent → Authorization Token → Ad Data Proxy → Vendor/Platform → Evidence Ledger
 */

const API_BASE = 'http://localhost:8000/api/consent/flow';

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'API request failed');
  }

  return response.json();
}

// ============== Authorization Token API ==============

export const tokenApi = {
  /**
   * Issue a new authorization token based on consent
   */
  issue: (orgId, data) => apiCall(`/${orgId}/tokens`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  /**
   * List tokens for an organization
   */
  list: (orgId, { subjectId, status } = {}) => {
    const params = new URLSearchParams();
    if (subjectId) params.append('subject_id', subjectId);
    if (status) params.append('status', status);
    return apiCall(`/${orgId}/tokens?${params}`);
  },

  /**
   * Revoke a token
   */
  revoke: (tokenId, reason = null) => apiCall(`/tokens/${tokenId}/revoke`, {
    method: 'POST',
    body: JSON.stringify(reason),
  }),
};

// ============== Vendor API ==============

export const vendorApi = {
  /**
   * Register a new vendor
   */
  create: (orgId, data) => apiCall(`/${orgId}/vendors`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  /**
   * List vendors
   */
  list: (orgId, vendorType = null) => {
    const params = vendorType ? `?vendor_type=${vendorType}` : '';
    return apiCall(`/${orgId}/vendors${params}`);
  },

  /**
   * Get vendor details
   */
  get: (vendorId) => apiCall(`/vendors/${vendorId}`),

  /**
   * Update vendor
   */
  update: (vendorId, data) => apiCall(`/vendors/${vendorId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// ============== Proxy Rules API ==============

export const proxyRuleApi = {
  /**
   * Create a new proxy rule
   */
  create: (orgId, data) => apiCall(`/${orgId}/proxy-rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  /**
   * List proxy rules
   */
  list: (orgId, enabledOnly = true) => 
    apiCall(`/${orgId}/proxy-rules?enabled_only=${enabledOnly}`),

  /**
   * Update a proxy rule
   */
  update: (ruleId, data) => apiCall(`/proxy-rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  /**
   * Delete a proxy rule
   */
  delete: (ruleId) => apiCall(`/proxy-rules/${ruleId}`, {
    method: 'DELETE',
  }),
};

// ============== Data Proxy API ==============

export const proxyApi = {
  /**
   * Process data through the consent proxy
   * This is the main enforcement endpoint
   */
  processData: (orgId, data) => apiCall(`/${orgId}/proxy`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// ============== Evidence Ledger API ==============

export const evidenceApi = {
  /**
   * Get evidence ledger entries
   */
  getEntries: (orgId, { startSequence, endSequence, eventType, subjectId, limit } = {}) => {
    const params = new URLSearchParams();
    if (startSequence) params.append('start_sequence', startSequence);
    if (endSequence) params.append('end_sequence', endSequence);
    if (eventType) params.append('event_type', eventType);
    if (subjectId) params.append('subject_id', subjectId);
    if (limit) params.append('limit', limit);
    return apiCall(`/${orgId}/evidence?${params}`);
  },

  /**
   * Verify evidence chain integrity
   */
  verify: (orgId) => apiCall(`/${orgId}/evidence/verify`),
};

// ============== Flow Session API ==============

export const flowSessionApi = {
  /**
   * List flow sessions
   */
  list: (orgId, { status, stage, limit } = {}) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (stage) params.append('stage', stage);
    if (limit) params.append('limit', limit);
    return apiCall(`/${orgId}/sessions?${params}`);
  },

  /**
   * Get a specific flow session
   */
  get: (orgId, flowId) => apiCall(`/${orgId}/sessions/${flowId}`),

  /**
   * Get flow statistics
   */
  getStatistics: (orgId, days = 30) => 
    apiCall(`/${orgId}/statistics?days=${days}`),
};

// ============== Complete Flow API ==============

export const completeFlowApi = {
  /**
   * Execute a complete consent flow
   * Demonstrates the entire flow from consent to evidence
   */
  execute: (orgId, { subjectId, purposes, vendorId, data }) => 
    apiCall(`/${orgId}/complete-flow`, {
      method: 'POST',
      body: JSON.stringify({
        subject_id: subjectId,
        purposes,
        vendor_id: vendorId,
        data,
      }),
    }),
};

// ============== Export all APIs ==============

export default {
  token: tokenApi,
  vendor: vendorApi,
  proxyRule: proxyRuleApi,
  proxy: proxyApi,
  evidence: evidenceApi,
  flowSession: flowSessionApi,
  completeFlow: completeFlowApi,
};
