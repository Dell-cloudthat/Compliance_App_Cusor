/**
 * API Service - Connects frontend to FastAPI backend
 * Handles data segmentation, metadata tagging, and cost predictions
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ComplianceAPI {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
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
        'X-User-Id': userId.toString(),
      },
      body: JSON.stringify(auditData),
    });
  }

  async getAudits(userId) {
    return this.request(`/api/audits`, {
      headers: {
        'X-User-Id': userId.toString(),
      },
    });
  }

  async getAudit(userId, auditId) {
    return this.request(`/api/audits/${auditId}`, {
      headers: {
        'X-User-Id': userId.toString(),
      },
    });
  }

  async updateAudit(userId, auditId, auditData) {
    return this.request(`/api/audits/${auditId}`, {
      method: 'PUT',
      headers: {
        'X-User-Id': userId.toString(),
      },
      body: JSON.stringify(auditData),
    });
  }

  async getAuditReadiness(userId, auditId) {
    return this.request(`/api/audits/${auditId}/readiness`, {
      headers: {
        'X-User-Id': userId.toString(),
      },
    });
  }

  // Audit Findings
  async createFinding(userId, auditId, findingData) {
    return this.request(`/api/audits/${auditId}/findings`, {
      method: 'POST',
      headers: {
        'X-User-Id': userId.toString(),
      },
      body: JSON.stringify(findingData),
    });
  }

  async getFindings(userId, auditId) {
    return this.request(`/api/audits/${auditId}/findings`, {
      headers: {
        'X-User-Id': userId.toString(),
      },
    });
  }

  async updateFinding(userId, auditId, findingId, findingData) {
    return this.request(`/api/audits/${auditId}/findings/${findingId}`, {
      method: 'PUT',
      headers: {
        'X-User-Id': userId.toString(),
      },
      body: JSON.stringify(findingData),
    });
  }

  // Audit Evidence
  async createEvidence(userId, auditId, evidenceData) {
    return this.request(`/api/audits/${auditId}/evidence`, {
      method: 'POST',
      headers: {
        'X-User-Id': userId.toString(),
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
        'X-User-Id': userId.toString(),
      },
    });
  }

  async validateEvidence(userId, auditId, evidenceId, validated = true) {
    return this.request(`/api/audits/${auditId}/evidence/${evidenceId}/validate?validated=${validated}`, {
      method: 'PUT',
      headers: {
        'X-User-Id': userId.toString(),
      },
    });
  }

  // Certifications
  async createCertification(userId, certData) {
    return this.request('/api/certifications', {
      method: 'POST',
      headers: {
        'X-User-Id': userId.toString(),
      },
      body: JSON.stringify(certData),
    });
  }

  async getCertifications(userId) {
    return this.request('/api/certifications', {
      headers: {
        'X-User-Id': userId.toString(),
      },
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
}

export default new ComplianceAPI();

