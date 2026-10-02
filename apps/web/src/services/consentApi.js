/**
 * Consent as a Service Platform - Frontend API Service
 * Handles all API communication with the consent management backend
 */

const API_BASE = 'http://localhost:8000/api/consent';

// Helper function for API calls
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

// ============== Organization API ==============

export const organizationApi = {
  create: (data) => apiCall('/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  list: () => apiCall('/organizations'),

  get: (orgId) => apiCall(`/organizations/${orgId}`),

  update: (orgId, data) => apiCall(`/organizations/${orgId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// ============== Purpose API ==============

export const purposeApi = {
  create: (orgId, data) => apiCall(`/organizations/${orgId}/purposes`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  list: (orgId) => apiCall(`/organizations/${orgId}/purposes`),

  get: (purposeId) => apiCall(`/purposes/${purposeId}`),

  update: (purposeId, data) => apiCall(`/purposes/${purposeId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (purposeId) => apiCall(`/purposes/${purposeId}`, {
    method: 'DELETE',
  }),
};

// ============== Subject API ==============

export const subjectApi = {
  create: (orgId, data) => apiCall(`/organizations/${orgId}/subjects`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  list: (orgId, limit = 100, offset = 0) => 
    apiCall(`/organizations/${orgId}/subjects?limit=${limit}&offset=${offset}`),

  get: (subjectId) => apiCall(`/subjects/${subjectId}`),

  find: (orgId, identifier) => 
    apiCall(`/organizations/${orgId}/subjects/find?identifier=${encodeURIComponent(identifier)}`),

  export: (orgId, subjectId) => 
    apiCall(`/organizations/${orgId}/subjects/${subjectId}/export`),

  delete: (orgId, subjectId) => apiCall(`/organizations/${orgId}/subjects/${subjectId}`, {
    method: 'DELETE',
  }),
};

// ============== Consent Record API ==============

export const consentApi = {
  record: (orgId, data) => apiCall(`/organizations/${orgId}/consent`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  recordBulk: (orgId, data) => apiCall(`/organizations/${orgId}/consent/bulk`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getStatus: (orgId, subjectId) => 
    apiCall(`/organizations/${orgId}/consent/status/${subjectId}`),

  getRecords: (orgId, { subjectId, purposeId, limit } = {}) => {
    const params = new URLSearchParams();
    if (subjectId) params.append('subject_id', subjectId);
    if (purposeId) params.append('purpose_id', purposeId);
    if (limit) params.append('limit', limit);
    return apiCall(`/organizations/${orgId}/consent/records?${params}`);
  },
};

// ============== Banner API ==============

export const bannerApi = {
  create: (orgId, data) => apiCall(`/organizations/${orgId}/banners`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  list: (orgId) => apiCall(`/organizations/${orgId}/banners`),

  get: (bannerId) => apiCall(`/banners/${bannerId}`),

  update: (bannerId, data) => apiCall(`/banners/${bannerId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  getConfig: (orgId, bannerId = null) => {
    const params = bannerId ? `?banner_id=${bannerId}` : '';
    return apiCall(`/organizations/${orgId}/banners/config${params}`);
  },
};

// ============== DSAR (Data Subject Access Request) API ==============

export const dsarApi = {
  create: (orgId, data) => apiCall(`/organizations/${orgId}/dsar`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  list: (orgId, status = null) => {
    const params = status ? `?status=${status}` : '';
    return apiCall(`/organizations/${orgId}/dsar${params}`);
  },

  get: (requestId) => apiCall(`/dsar/${requestId}`),

  update: (requestId, data) => apiCall(`/dsar/${requestId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// ============== Analytics API ==============

export const analyticsApi = {
  recordInteraction: (orgId, data) => apiCall(`/organizations/${orgId}/analytics/interaction`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  get: (orgId, startDate, endDate, bannerId = null) => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    if (bannerId) params.append('banner_id', bannerId);
    return apiCall(`/organizations/${orgId}/analytics?${params}`);
  },

  getSummary: (orgId, days = 30) => 
    apiCall(`/organizations/${orgId}/analytics/summary?days=${days}`),
};

// ============== Audit Log API ==============

export const auditApi = {
  get: (orgId, { subjectId, action, limit } = {}) => {
    const params = new URLSearchParams();
    if (subjectId) params.append('subject_id', subjectId);
    if (action) params.append('action', action);
    if (limit) params.append('limit', limit);
    return apiCall(`/organizations/${orgId}/audit-logs?${params}`);
  },
};

// ============== Webhook API ==============

export const webhookApi = {
  create: (orgId, data) => apiCall(`/organizations/${orgId}/webhooks`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  list: (orgId) => apiCall(`/organizations/${orgId}/webhooks`),
};

// ============== API Key API ==============

export const apiKeyApi = {
  create: (orgId, name, permissions = ['read', 'write']) => 
    apiCall(`/organizations/${orgId}/api-keys`, {
      method: 'POST',
      body: JSON.stringify({ name, permissions }),
    }),
};

// ============== Widget API (Public endpoints) ==============

export const widgetApi = {
  getConfig: (orgId, bannerId = null) => {
    const params = bannerId ? `?banner_id=${bannerId}` : '';
    return apiCall(`/widget/${orgId}${params}`);
  },

  submitConsent: (orgId, data) => apiCall(`/widget/${orgId}/consent`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// ============== Utility Functions ==============

/**
 * Generate a unique identifier for anonymous users
 */
export function generateAnonymousId() {
  return 'anon_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Get or create an anonymous user ID from localStorage
 */
export function getOrCreateAnonymousId(storageKey = 'consent_anonymous_id') {
  let id = localStorage.getItem(storageKey);
  if (!id) {
    id = generateAnonymousId();
    localStorage.setItem(storageKey, id);
  }
  return id;
}

/**
 * Check if consent has been given (stored in localStorage)
 */
export function hasConsentBeenGiven(storageKey = 'consent_given') {
  return localStorage.getItem(storageKey) === 'true';
}

/**
 * Mark consent as given in localStorage
 */
export function markConsentAsGiven(storageKey = 'consent_given') {
  localStorage.setItem(storageKey, 'true');
}

/**
 * Get stored consent preferences from localStorage
 */
export function getStoredConsent(storageKey = 'consent_preferences') {
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Store consent preferences in localStorage
 */
export function storeConsent(preferences, storageKey = 'consent_preferences') {
  localStorage.setItem(storageKey, JSON.stringify(preferences));
}

// Export everything as a single object for convenience
export default {
  organization: organizationApi,
  purpose: purposeApi,
  subject: subjectApi,
  consent: consentApi,
  banner: bannerApi,
  dsar: dsarApi,
  analytics: analyticsApi,
  audit: auditApi,
  webhook: webhookApi,
  apiKey: apiKeyApi,
  widget: widgetApi,
  utils: {
    generateAnonymousId,
    getOrCreateAnonymousId,
    hasConsentBeenGiven,
    markConsentAsGiven,
    getStoredConsent,
    storeConsent,
  },
};
