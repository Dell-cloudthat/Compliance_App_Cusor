/**
 * API Service - Connects frontend to FastAPI backend
 * Handles data segmentation, metadata tagging, and cost predictions
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TOKEN_STORAGE_KEY = 'compliance_app_access_token';

class ComplianceAPI {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // --- Auth token handling -------------------------------------------
  // Replaces the old pattern of sending a raw, unverified user id on every
  // request. The backend now issues a signed JWT on login/register; we
  // store it and attach it as a Bearer token on every subsequent call.

  getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  setToken(token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async register(name, email, password, organization) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, organization }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  logout() {
    this.clearToken();
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Prepare body - stringify if it's an object
    let body = options.body;
    if (body !== undefined && body !== null) {
      // If body is already a string, use it as-is
      // If it's an object, stringify it
      if (typeof body !== 'string') {
        body = JSON.stringify(body);
      }
    }
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    // Only add body for methods that support it
    if (body !== undefined && body !== null && config.method !== 'GET' && config.method !== 'HEAD') {
      config.body = body;
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        // Token missing/expired/invalid — clear it so the app can prompt a fresh login
        this.clearToken();
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { detail: response.statusText || `HTTP ${response.status}` };
        }
        
        // FastAPI validation errors have a specific format
        let errorMessage;
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Validation errors from Pydantic
            errorMessage = errorData.detail.map(err => {
              const loc = err.loc ? err.loc.join('.') : '';
              return `${loc}: ${err.msg}`;
            }).join('; ');
          } else {
            errorMessage = errorData.detail;
          }
        } else {
          errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
        }
        
        const error = new Error(errorMessage);
        error.detail = errorMessage;
        error.status = response.status;
        error.rawError = errorData; // Store raw error for debugging
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      
      // If it's already an Error with a message, check if it has detail
      if (error instanceof Error) {
        // Preserve the detail property if it exists
        if (error.detail) {
          error.message = error.detail;
        }
        throw error;
      }
      
      // For non-Error objects, try to extract message
      const errorMessage = error?.detail || error?.message || error?.error || String(error);
      const newError = new Error(errorMessage);
      newError.detail = errorMessage;
      throw newError;
    }
  }

  // User Management
  async createUser(userData) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUser(userId) {
    return this.request(`/api/users/${userId}`);
  }

  // Data Sources
  async createDataSource(userId, sourceData) {
    return this.request(`/api/data-sources?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(sourceData),
    });
  }

  async getDataSources(userId) {
    return this.request(`/api/data-sources?user_id=${userId}`);
  }

  // Data Segments
  async createDataSegment(userId, segmentData) {
    return this.request(`/api/data-segments?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(segmentData),
    });
  }

  async getSegmentsByControl(userId, controlId) {
    return this.request(`/api/data-segments/by-control/${controlId}?user_id=${userId}`);
  }

  // Responsibility Matrix
  async getResponsibilityMatrix(userId) {
    return this.request(`/api/responsibility-matrix/${userId}`);
  }

  // Cost Prediction
  async predictCosts(predictionData) {
    return this.request('/api/cost-prediction', {
      method: 'POST',
      body: JSON.stringify(predictionData),
    });
  }

  // Metadata Tags
  async getMetadataTags() {
    return this.request('/api/metadata-tags');
  }

  // Audit Management Endpoints
  async createAudit(userId, auditData) {
    return this.request('/api/audits', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(auditData),
    });
  }

  async getAudits(userId) {
    return this.request(`/api/audits`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getAudit(userId, auditId) {
    return this.request(`/api/audits/${auditId}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async updateAudit(userId, auditId, auditData) {
    return this.request(`/api/audits/${auditId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(auditData),
    });
  }

  async getAuditReadiness(userId, auditId) {
    return this.request(`/api/audits/${auditId}/readiness`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // Audit Findings
  async createFinding(userId, auditId, findingData) {
    return this.request(`/api/audits/${auditId}/findings`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(findingData),
    });
  }

  async getFindings(userId, auditId) {
    return this.request(`/api/audits/${auditId}/findings`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async updateFinding(userId, auditId, findingId, findingData) {
    return this.request(`/api/audits/${auditId}/findings/${findingId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(findingData),
    });
  }

  // Audit Evidence
  async createEvidence(userId, auditId, evidenceData) {
    return this.request(`/api/audits/${auditId}/evidence`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(evidenceData),
    });
  }

  async getEvidence(userId, auditId, controlId = null) {
    const url = controlId
      ? `/api/audits/${auditId}/evidence?control_id=${controlId}`
      : `/api/audits/${auditId}/evidence`;
    return this.request(url, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async validateEvidence(userId, auditId, evidenceId, validated = true) {
    return this.request(`/api/audits/${auditId}/evidence/${evidenceId}/validate?validated=${validated}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // Automated Evidence Collection
  async collectEvidence(userId, auditId, controlIds = null, integrationId = null) {
    const body = {};
    if (controlIds) body.control_ids = controlIds;
    if (integrationId) body.integration_id = integrationId;
    
    return this.request(`/api/audits/${auditId}/evidence/collect`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
  }

  async collectEvidenceForControl(userId, auditId, controlId, integrationId = null) {
    const body = integrationId ? { integration_id: integrationId } : {};
    
    return this.request(`/api/audits/${auditId}/evidence/collect/${controlId}`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
  }

  async getEvidenceFreshness(userId, auditId) {
    return this.request(`/api/audits/${auditId}/evidence/freshness`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async autoLinkEvidence(userId, auditId) {
    return this.request(`/api/audits/${auditId}/evidence/auto-link`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // Certifications
  async createCertification(userId, certData) {
    return this.request('/api/certifications', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(certData),
    });
  }

  async getCertifications(userId) {
    return this.request('/api/certifications', {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // Report Generation
  async generateFullAuditReport(userId, auditId) {
    return this.request(`/api/audits/${auditId}/reports/full`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async generateEvidencePackage(userId, auditId, controlIds = null) {
    const url = controlIds 
      ? `/api/audits/${auditId}/reports/evidence-package?control_ids=${JSON.stringify(controlIds)}`
      : `/api/audits/${auditId}/reports/evidence-package`;
    return this.request(url, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async generateExecutiveSummary(userId, auditId) {
    return this.request(`/api/audits/${auditId}/reports/executive-summary`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // ==================== Workflow Automation ====================
  
  async getWorkflowTemplates() {
    return this.request('/api/workflows/templates');
  }

  async createWorkflow(userId, workflowData) {
    return this.request('/api/workflows', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(workflowData),
    });
  }

  async listWorkflows(userId, workflowType = null, status = null) {
    const params = new URLSearchParams();
    if (workflowType) params.append('workflow_type', workflowType);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/workflows${query}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getWorkflow(userId, workflowId) {
    return this.request(`/api/workflows/${workflowId}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async updateWorkflow(userId, workflowId, workflowData) {
    return this.request(`/api/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(workflowData),
    });
  }

  async deleteWorkflow(userId, workflowId) {
    return this.request(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async executeWorkflow(userId, workflowId, executionData = {}) {
    return this.request(`/api/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(executionData),
    });
  }

  async getWorkflowExecutions(userId, workflowId, status = null, limit = 50) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    return this.request(`/api/workflows/${workflowId}/executions?${params.toString()}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getWorkflowAnalytics(userId, days = 30) {
    return this.request(`/api/workflows/analytics?days=${days}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // ============================================================================
  // IAM (Identity & Access Management) Endpoints
  // ============================================================================

  async grantPermission(userId, permissionData) {
    return this.request('/api/permissions/grant', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: permissionData, // Will be stringified by request method
    });
  }

  async revokePermission(userId, permissionId, reason) {
    return this.request('/api/permissions/revoke', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        permission_id: permissionId,
        reason: reason,
      }),
    });
  }

  async checkPermission(permissionCheck) {
    return this.request('/api/permissions/check', {
      method: 'POST',
      body: JSON.stringify(permissionCheck),
    });
  }

  async getUserPermissions(userId, targetUserId) {
    return this.request(`/api/permissions/user/${targetUserId}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async createVendorAccessProfile(userId, profileData) {
    return this.request('/api/vendor-access/profiles', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(profileData),
    });
  }

  async assignVendorUser(userId, assignmentData) {
    return this.request('/api/vendor-access/assign', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(assignmentData),
    });
  }

  async getAuditLog(userId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.vendor_id) params.append('vendor_id', filters.vendor_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.event_type) params.append('event_type', filters.event_type);

    const queryString = params.toString();
    const url = queryString ? `/api/permissions/audit-log?${queryString}` : '/api/permissions/audit-log';

    return this.request(url, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async bootstrapAdmin(userId) {
    return this.request('/api/permissions/bootstrap-admin', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // IAM Access Tracking Endpoints
  async createLoginSession(userId, ipAddress = null, userAgent = null) {
    return this.request('/api/iam/login', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: {
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
  }

  async endLoginSession(sessionToken) {
    return this.request('/api/iam/logout', {
      method: 'POST',
      headers: {
        'X-Session-Token': sessionToken,
      },
    });
  }

  async logUserAccess(userId, accessData) {
    return this.request('/api/iam/access-log', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: accessData,
    });
  }

  async getUserAccessSummary(userId, targetUserId, days = 30) {
    return this.request(`/api/iam/access-summary/${targetUserId}?days=${days}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getUserAccessLogs(userId, targetUserId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.resource_type) params.append('resource_type', filters.resource_type);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const queryString = params.toString();
    const url = queryString 
      ? `/api/iam/access-logs/${targetUserId}?${queryString}`
      : `/api/iam/access-logs/${targetUserId}`;
    
    return this.request(url, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getMappedPermissions(userId, targetUserId) {
    return this.request(`/api/iam/mapped-permissions/${targetUserId}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async triggerAutoMapPermissions(userId, targetUserId) {
    return this.request(`/api/iam/auto-map-permissions/${targetUserId}`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getComplianceMapping(userId, targetUserId, framework = 'NIST_800-53') {
    return this.request(`/api/iam/compliance-mapping/${targetUserId}?framework=${framework}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async listAllUsers(userId) {
    return this.request('/api/iam/users', {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // ============================================================================
  // CSCA (Continuous Security-Compliance Alignment) Endpoints
  // ============================================================================

  async createSecurityEvent(eventData, userId) {
    return this.request('/api/security-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(eventData)
    });
  }

  async getSecurityEvents(filters = {}, userId) {
    const params = new URLSearchParams();
    if (filters.event_type) params.append('event_type', filters.event_type);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    
    const query = params.toString();
    return this.request(`/api/security-events${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getSecurityEventComplianceImpact(eventId, userId) {
    return this.request(`/api/security-events/${eventId}/compliance-impact`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getComplianceScoreHistory(framework = null, days = 30, userId) {
    const params = new URLSearchParams();
    if (framework) params.append('framework', framework);
    params.append('days', days);
    return this.request(`/api/compliance-score-history?${params.toString()}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getComplianceAlerts(filters = {}, userId) {
    const params = new URLSearchParams();
    if (filters.acknowledged !== undefined) params.append('acknowledged', filters.acknowledged);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.limit) params.append('limit', filters.limit);
    
    const query = params.toString();
    return this.request(`/api/compliance-alerts${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async acknowledgeComplianceAlert(alertId, userId) {
    return this.request(`/api/compliance-alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getSecurityComplianceCorrelation(days = 30, userId) {
    return this.request(`/api/security-compliance-correlation?days=${days}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getControlPriorities(userId, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.controlId) params.append('control_id', options.controlId);
    const query = params.toString();
    return this.request(`/api/intelligence/priorities${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getControlGuidance(userId, controlId) {
    return this.request(`/api/intelligence/guidance?control_id=${encodeURIComponent(controlId)}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  // ============================================================================
  // Pattern Detection & Trend Analysis Endpoints
  // ============================================================================

  async detectPatterns(userId, lookbackDays = 30) {
    return this.request(`/api/patterns/detect?lookback_days=${lookbackDays}`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getPatterns(userId, status = null) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const query = params.toString();
    return this.request(`/api/patterns${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getPatternAlerts(userId, filters = {}) {
    const params = new URLSearchParams();
    if (filters.acknowledged !== undefined) params.append('acknowledged', filters.acknowledged);
    if (filters.limit) params.append('limit', filters.limit);
    const query = params.toString();
    return this.request(`/api/pattern-alerts${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async acknowledgePatternAlert(alertId, userId) {
    return this.request(`/api/pattern-alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getPatternTrends(userId, lookbackDays = 30) {
    return this.request(`/api/patterns/trends?lookback_days=${lookbackDays}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  // ============================================================================
  // Real-Time Compliance & Unified Data Flow APIs
  // ============================================================================

  async getRealtimeComplianceScore(userId, framework) {
    return this.request(`/api/compliance/realtime/${framework}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getFrameworkGrowthMetrics(userId, framework, periodDays = 30) {
    return this.request(`/api/compliance/framework-growth/${framework}?period_days=${periodDays}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getAllFrameworksGrowth(userId, periodDays = 30) {
    return this.request(`/api/compliance/all-frameworks-growth?period_days=${periodDays}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async checkComplianceDrift(userId) {
    return this.request('/api/alerts/check-drift', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getActionableAlerts(userId, limit = 50) {
    return this.request(`/api/alerts/actionable?limit=${limit}`, {
      headers: {
        ...this.getAuthHeaders(),
      }
    });
  }

  async getDataFlowGraph(userId) {
    return this.request('/api/data-flow/graph', {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getDataFlowAudit(userId, limit = 50) {
    return this.request(`/api/data-flow/audit?limit=${limit}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async createDataFlowNode(userId, nodePayload) {
    return this.request('/api/data-flow/nodes', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(nodePayload),
    });
  }

  async updateDataFlowNode(userId, nodeId, nodePayload) {
    return this.request(`/api/data-flow/nodes/${nodeId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(nodePayload),
    });
  }

  async deleteDataFlowNode(userId, nodeId, reason) {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return this.request(`/api/data-flow/nodes/${nodeId}${query}`, {
      method: 'DELETE',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async createDataFlowEdge(userId, edgePayload) {
    return this.request('/api/data-flow/edges', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(edgePayload),
    });
  }

  async updateDataFlowEdge(userId, edgeId, edgePayload) {
    return this.request(`/api/data-flow/edges/${edgeId}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(edgePayload),
    });
  }

  async deleteDataFlowEdge(userId, edgeId, reason) {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return this.request(`/api/data-flow/edges/${edgeId}${query}`, {
      method: 'DELETE',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getIntegrationEventsSummary(userId, days = 30) {
    return this.request(`/api/integrations/events/summary?days=${days}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async updateAlertRemediation(alertId, userId, payload) {
    return this.request(`/api/alerts/${alertId}/remediation`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
  }

  // Simulate API Data Ingestion
  async simulateAPIIngestion(userId, apiData) {
    /**
     * Simulate incoming API data and automatically segment it by control
     * This is the core function for data segmentation
     */
    const segments = [];
    
    // For each control, check if API data matches mapped fields
    for (const [controlId, mappedFields] of Object.entries(apiData.controlMappings || {})) {
      const segmentData = {};
      
      // Extract relevant fields from API data
      mappedFields.forEach(field => {
        const [category, fieldName] = field.split('.');
        
        // Check if this field exists in the API response
        if (apiData.response[category] && apiData.response[category][fieldName]) {
          segmentData[field] = apiData.response[category][fieldName];
        } else if (apiData.response[fieldName]) {
          segmentData[field] = apiData.response[fieldName];
        }
      });

      if (Object.keys(segmentData).length > 0) {
        // Create data segment with metadata
        const segment = {
          data_source_id: apiData.dataSourceId,
          control_id: controlId,
          segment_name: `${apiData.sourceName} - ${controlId}`,
          data_payload: segmentData,
          metadata_tags: apiData.metadataTags || [],
          data_classification: 'INTERNAL',
          responsible_party: apiData.responsibleParty || 'Unassigned',
        };

        try {
          const result = await this.createDataSegment(userId, segment);
          segments.push(result);
        } catch (error) {
          console.error(`Error creating segment for ${controlId}:`, error);
          // If CUI detected, log but don't fail completely
          if (error.message.includes('CUI')) {
            console.warn(`CUI data detected for ${controlId} - segment rejected`);
          }
        }
      }
    }

    return segments;
  }

  // ============================================================================
  // Self-Learning Automation System
  // ============================================================================

  async runLearningAnalysis(userId) {
    return this.request('/api/learning/analyze', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getLearnedPatterns(userId, minConfidence = 0.3) {
    return this.request(`/api/learning/patterns?min_confidence=${minConfidence}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getAutoPlaybooks(userId, status = null) {
    const url = status 
      ? `/api/learning/playbooks?status=${status}`
      : '/api/learning/playbooks';
    return this.request(url, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async approvePlaybook(userId, playbookId) {
    return this.request(`/api/learning/playbooks/${playbookId}/approve`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getDataValueSummary(userId) {
    return this.request('/api/learning/data-value', {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getMatchingPlaybooks(userId, alertId = null, controlId = null) {
    const params = new URLSearchParams();
    if (alertId) params.append('alert_id', alertId);
    if (controlId) params.append('control_id', controlId);
    return this.request(`/api/learning/playbooks/match?${params.toString()}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getControlPatterns(userId, controlId) {
    return this.request(`/api/learning/patterns/control/${controlId}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async trackPlaybookUsage(userId, playbookId, alertId) {
    return this.request(`/api/learning/playbooks/${playbookId}/execute`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ alert_id: alertId }),
    });
  }

  // ============================================================================
  // Client Intake Portal - Tiered Data Ingestion
  // ============================================================================

  // Client Organizations
  async createClientOrganization(userId, orgData) {
    return this.request('/api/intake/organizations', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(orgData),
    });
  }

  async listClientOrganizations(userId, intakeTier = null) {
    const params = intakeTier ? `?intake_tier=${intakeTier}` : '';
    return this.request(`/api/intake/organizations${params}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getClientOrganization(userId, orgId) {
    return this.request(`/api/intake/organizations/${orgId}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async updateClientIntakeTier(userId, orgId, newTier) {
    return this.request(`/api/intake/organizations/${orgId}/tier?new_tier=${newTier}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getTierRecommendation(organizationType, complianceFrameworks, currentMaturity) {
    const params = new URLSearchParams({
      organization_type: organizationType,
      compliance_frameworks: complianceFrameworks.join(','),
      current_maturity: currentMaturity,
    });
    return this.request(`/api/intake/tier-recommendation?${params.toString()}`);
  }

  async getTiersInfo() {
    return this.request('/api/intake/tiers-info');
  }

  // Tier 1: Manual/Document-Based Intake
  async uploadIntakeDocument(userId, documentData) {
    return this.request('/api/intake/tier1/documents', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(documentData),
    });
  }

  async listIntakeDocuments(userId, options = {}) {
    const params = new URLSearchParams();
    if (options.clientOrgId) params.append('client_org_id', options.clientOrgId);
    if (options.documentType) params.append('document_type', options.documentType);
    if (options.parsingStatus) params.append('parsing_status', options.parsingStatus);
    if (options.limit) params.append('limit', options.limit);
    const query = params.toString();
    return this.request(`/api/intake/tier1/documents${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async mapDocumentToControls(userId, docId, controlMappings) {
    return this.request(`/api/intake/tier1/documents/${docId}/map-controls`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ control_mappings: controlMappings }),
    });
  }

  async createQuestionnaire(userId, questionnaireData) {
    return this.request('/api/intake/tier1/questionnaires', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(questionnaireData),
    });
  }

  async submitQuestionnaireResponse(userId, questionnaireId, responseData) {
    return this.request(`/api/intake/tier1/questionnaires/${questionnaireId}/responses`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(responseData),
    });
  }

  // Tier 2: Read-Only API Integrations
  async getSupportedIntegrations() {
    return this.request('/api/intake/tier2/integrations/supported');
  }

  async configureApiIntegration(userId, integrationData) {
    return this.request('/api/intake/tier2/integrations', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(integrationData),
    });
  }

  async listApiIntegrations(userId, options = {}) {
    const params = new URLSearchParams();
    if (options.clientOrgId) params.append('client_org_id', options.clientOrgId);
    if (options.status) params.append('status', options.status);
    const query = params.toString();
    return this.request(`/api/intake/tier2/integrations${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async triggerApiSync(userId, integrationId) {
    return this.request(`/api/intake/tier2/integrations/${integrationId}/sync`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // Tier 3: Scheduled Exports
  async configureScheduledExport(userId, exportData) {
    return this.request('/api/intake/tier3/exports', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(exportData),
    });
  }

  async listScheduledExports(userId, options = {}) {
    const params = new URLSearchParams();
    if (options.clientOrgId) params.append('client_org_id', options.clientOrgId);
    if (options.status) params.append('status', options.status);
    const query = params.toString();
    return this.request(`/api/intake/tier3/exports${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async processScheduledExport(userId, configId, processData) {
    return this.request(`/api/intake/tier3/exports/${configId}/process`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(processData),
    });
  }

  // Tier 4: Continuous Ingestion
  async configureContinuousIngestion(userId, ingestionData) {
    return this.request('/api/intake/tier4/continuous', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(ingestionData),
    });
  }

  async listContinuousIngestion(userId, options = {}) {
    const params = new URLSearchParams();
    if (options.clientOrgId) params.append('client_org_id', options.clientOrgId);
    if (options.status) params.append('status', options.status);
    const query = params.toString();
    return this.request(`/api/intake/tier4/continuous${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async ingestContinuousEvent(configId, eventData) {
    return this.request(`/api/intake/tier4/continuous/${configId}/events`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  // Intake Dashboard
  async getIntakeDashboard(userId, clientOrgId = null) {
    const params = clientOrgId ? `?client_org_id=${clientOrgId}` : '';
    return this.request(`/api/intake/dashboard${params}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // ============================================================================
  // Consulting Platform APIs
  // ============================================================================

  // Consulting Dashboard
  async getConsultingDashboard(userId) {
    return this.request('/api/consulting/dashboard', {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // Engagements
  async createEngagement(userId, engagementData) {
    return this.request('/api/consulting/engagements', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(engagementData),
    });
  }

  async listEngagements(userId, options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.clientOrgId) params.append('client_org_id', options.clientOrgId);
    const query = params.toString();
    return this.request(`/api/consulting/engagements${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async getEngagement(userId, engagementId) {
    return this.request(`/api/consulting/engagements/${engagementId}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async updateEngagementStatus(userId, engagementId, status) {
    return this.request(`/api/consulting/engagements/${engagementId}/status?status=${status}`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async logTimeEntry(userId, engagementId, timeData) {
    return this.request(`/api/consulting/engagements/${engagementId}/time`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(timeData),
    });
  }

  // Assessment Templates
  async createAssessmentTemplate(userId, templateData) {
    return this.request('/api/consulting/assessment-templates', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(templateData),
    });
  }

  async listAssessmentTemplates(userId, templateType = null) {
    const params = templateType ? `?template_type=${templateType}` : '';
    return this.request(`/api/consulting/assessment-templates${params}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async createDefaultAssessmentTemplate(userId) {
    return this.request('/api/consulting/assessment-templates/default', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // Assessments
  async createAssessment(userId, assessmentData) {
    return this.request('/api/consulting/assessments', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(assessmentData),
    });
  }

  async submitAssessmentResponses(userId, assessmentId, responses) {
    return this.request(`/api/consulting/assessments/${assessmentId}/submit`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ responses }),
    });
  }

  // Gap Analysis
  async createGap(userId, gapData) {
    return this.request('/api/consulting/gaps', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(gapData),
    });
  }

  async listGaps(userId, options = {}) {
    const params = new URLSearchParams();
    if (options.clientOrgId) params.append('client_org_id', options.clientOrgId);
    if (options.engagementId) params.append('engagement_id', options.engagementId);
    if (options.status) params.append('status', options.status);
    const query = params.toString();
    return this.request(`/api/consulting/gaps${query ? `?${query}` : ''}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // Roadmaps
  async createRoadmap(userId, roadmapData) {
    return this.request('/api/consulting/roadmaps', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(roadmapData),
    });
  }

  async addRoadmapPhase(userId, roadmapId, phaseData) {
    return this.request(`/api/consulting/roadmaps/${roadmapId}/phases`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(phaseData),
    });
  }

  async addRoadmapInitiative(userId, roadmapId, phaseId, initiativeData) {
    return this.request(`/api/consulting/roadmaps/${roadmapId}/phases/${phaseId}/initiatives`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(initiativeData),
    });
  }

  async getRoadmap(userId, roadmapId) {
    return this.request(`/api/consulting/roadmaps/${roadmapId}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  // Budget Plans
  async createBudgetPlan(userId, budgetData) {
    return this.request('/api/consulting/budgets', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(budgetData),
    });
  }

  // Report Generation
  async createReportTemplate(userId, templateData) {
    return this.request('/api/consulting/report-templates', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(templateData),
    });
  }

  async generateReport(userId, reportData) {
    return this.request('/api/consulting/reports/generate', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(reportData),
    });
  }

  // MSP Portfolio
  async createMSPPortfolio(userId, portfolioData) {
    return this.request('/api/consulting/msp/portfolios', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(portfolioData),
    });
  }

  async addClientToPortfolio(userId, portfolioId, clientData) {
    return this.request(`/api/consulting/msp/portfolios/${portfolioId}/clients`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(clientData),
    });
  }

  async getMSPDashboard(userId, portfolioId = null) {
    const params = portfolioId ? `?portfolio_id=${portfolioId}` : '';
    return this.request(`/api/consulting/msp/dashboard${params}`, {
      headers: {
        ...this.getAuthHeaders(),
      },
    });
  }

  async updateClientMetrics(userId, clientSummaryId, metricsData) {
    return this.request(`/api/consulting/msp/clients/${clientSummaryId}/metrics`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(metricsData),
    });
  }
}

export default new ComplianceAPI();

