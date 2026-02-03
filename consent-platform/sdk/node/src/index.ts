/**
 * Consent Platform Node.js SDK
 * 
 * A Node.js/TypeScript SDK for integrating with the Consent as a Service Platform.
 * 
 * @example
 * ```typescript
 * import { ConsentClient } from '@consent-platform/node';
 * 
 * const client = new ConsentClient({
 *   apiUrl: 'https://api.consent-platform.com',
 *   apiKey: 'csp_live_xxxxx',
 *   tenantId: 'your-tenant-id'
 * });
 * 
 * const token = await client.issueConsent({
 *   userId: 'user_123',
 *   purposes: ['analytics', 'marketing'],
 *   vendors: ['meta', 'google']
 * });
 * ```
 */

import crypto from 'crypto';

// ==================== Types ====================

export interface ConsentClientConfig {
  /** API URL */
  apiUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Tenant ID */
  tenantId?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Max retries */
  maxRetries?: number;
}

export interface IssueConsentParams {
  userId: string;
  purposes: string[];
  vendors: string[];
  ttlDays?: number;
  jurisdiction?: string;
  constraints?: Record<string, boolean>;
}

export interface ConsentToken {
  consentToken: string;
  tokenId: string;
  expiresAt: Date;
  purposes: string[];
  vendors: string[];
}

export interface SendEventParams {
  consentToken: string;
  eventType: string;
  vendor: string;
  userId: string;
  dataClasses?: string[];
  url?: string;
  value?: number;
  currency?: string;
  properties?: Record<string, any>;
  idempotencyKey?: string;
}

export interface EventResponse {
  decision: 'allowed' | 'modified' | 'blocked';
  reason?: string;
  fieldsStripped: string[];
  forwarded: boolean;
  vendorEventId?: string;
  latencyMs: number;
}

export interface TCFString {
  tcString: string;
  version: number;
  created: Date;
  tcfPurposes: number[];
  tcfVendors: number[];
}

export interface GCMSettings {
  adStorage: 'granted' | 'denied';
  analyticsStorage: 'granted' | 'denied';
  adUserData: 'granted' | 'denied';
  adPersonalization: 'granted' | 'denied';
}

export interface AuditExport {
  tenantId: string;
  exportTime: Date;
  eventsCount: number;
  chainValid: boolean;
  events: any[];
}

export interface WebhookEvent {
  id: string;
  event: string;
  createdAt: Date;
  tenantId: string;
  data: Record<string, any>;
  idempotencyKey: string;
}

// ==================== Errors ====================

export class ConsentPlatformError extends Error {
  statusCode?: number;
  response?: any;

  constructor(message: string, statusCode?: number, response?: any) {
    super(message);
    this.name = 'ConsentPlatformError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class AuthenticationError extends ConsentPlatformError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends ConsentPlatformError {
  retryAfter?: number;
  limit?: number;
  remaining?: number;

  constructor(message: string, retryAfter?: number, limit?: number, remaining?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
  }
}

export class ValidationError extends ConsentPlatformError {
  errors?: any[];

  constructor(message: string, errors?: any[]) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

// ==================== Client ====================

export class ConsentClient {
  private apiUrl: string;
  private apiKey?: string;
  private tenantId?: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: ConsentClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.tenantId = config.tenantId;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  private getHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'consent-platform-node/1.0.0',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    return { ...headers, ...additionalHeaders };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options?: {
      body?: any;
      params?: Record<string, string>;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    let url = `${this.apiUrl}${endpoint}`;
    
    if (options?.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(options?.headers),
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.detail || errorData.error || 'Unknown error';

        if (response.status === 401) {
          throw new AuthenticationError(message);
        } else if (response.status === 429) {
          throw new RateLimitError(
            message,
            parseInt(response.headers.get('Retry-After') || '60'),
            parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
            parseInt(response.headers.get('X-RateLimit-Remaining') || '0')
          );
        } else if (response.status === 400) {
          throw new ValidationError(message, errorData.errors);
        } else {
          throw new ConsentPlatformError(message, response.status, errorData);
        }
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof ConsentPlatformError) {
        throw error;
      }
      throw new ConsentPlatformError(`Request failed: ${error}`);
    }
  }

  // ==================== Consent ====================

  /**
   * Issue a new consent token
   */
  async issueConsent(params: IssueConsentParams): Promise<ConsentToken> {
    const response = await this.request<any>('POST', '/consent', {
      body: {
        user_id: params.userId,
        purposes: params.purposes,
        vendors: params.vendors,
        ttl_days: params.ttlDays || 14,
        jurisdiction: params.jurisdiction || 'GDPR',
        constraints: params.constraints,
      },
    });

    return {
      consentToken: response.consent_token,
      tokenId: response.token_id,
      expiresAt: new Date(response.expires_at),
      purposes: response.purposes,
      vendors: response.vendors,
    };
  }

  /**
   * Revoke a consent token
   */
  async revokeConsent(tokenId: string, reason: string = 'user_requested'): Promise<boolean> {
    const response = await this.request<any>('POST', '/consent/revoke', {
      body: { token_id: tokenId, reason },
    });
    return response.success;
  }

  /**
   * List consent tokens
   */
  async listTokens(subjectId?: string, limit: number = 50): Promise<any[]> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (subjectId) {
      params.subject_id = subjectId;
    }
    const response = await this.request<any>('GET', '/consent/tokens', { params });
    return response.tokens;
  }

  // ==================== Events ====================

  /**
   * Send an ad event through enforcement
   */
  async sendEvent(params: SendEventParams): Promise<EventResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${params.consentToken}`,
    };

    if (params.idempotencyKey) {
      headers['X-Idempotency-Key'] = params.idempotencyKey;
    }

    const response = await this.request<any>('POST', '/event', {
      body: {
        event_type: params.eventType,
        vendor: params.vendor,
        user_id: params.userId,
        data_classes: params.dataClasses || [],
        url: params.url,
        value: params.value,
        currency: params.currency || 'USD',
        properties: params.properties || {},
      },
      headers,
    });

    return {
      decision: response.decision,
      reason: response.reason,
      fieldsStripped: response.fields_stripped || [],
      forwarded: response.forwarded,
      vendorEventId: response.vendor_event_id,
      latencyMs: response.latency_ms,
    };
  }

  // ==================== TCF 2.2 ====================

  /**
   * Generate a TCF 2.2 consent string
   */
  async generateTCFString(
    purposes: string[],
    vendors: string[],
    language: string = 'EN'
  ): Promise<TCFString> {
    const response = await this.request<any>('POST', '/tcf/generate', {
      body: { purposes, vendors, language },
    });

    return {
      tcString: response.tc_string,
      version: response.version,
      created: new Date(response.created),
      tcfPurposes: response.tcf_purposes,
      tcfVendors: response.tcf_vendors,
    };
  }

  /**
   * Decode a TCF string
   */
  async decodeTCFString(tcString: string): Promise<any> {
    const response = await this.request<any>('GET', '/tcf/decode', {
      params: { tc_string: tcString },
    });
    return response.decoded;
  }

  /**
   * Generate TCF string from consent token
   */
  async tcfFromToken(token: string, language: string = 'EN'): Promise<TCFString> {
    const response = await this.request<any>('POST', '/tcf/from-token', {
      body: { token, language },
    });

    return {
      tcString: response.tc_string,
      version: 2,
      created: new Date(),
      tcfPurposes: response.tcf_purposes,
      tcfVendors: response.tcf_vendors,
    };
  }

  // ==================== Google Consent Mode ====================

  /**
   * Get Google Consent Mode v2 settings
   */
  async getGCMSettings(purposes: string[], region: string = 'EU'): Promise<GCMSettings> {
    const response = await this.request<any>('POST', '/gcm/generate', {
      body: { purposes, region },
    });

    return {
      adStorage: response.consent_settings.ad_storage,
      analyticsStorage: response.consent_settings.analytics_storage,
      adUserData: response.consent_settings.ad_user_data,
      adPersonalization: response.consent_settings.ad_personalization,
    };
  }

  /**
   * Get default GCM script
   */
  async getGCMScript(region: string = 'EU'): Promise<string> {
    const response = await this.request<any>('GET', '/gcm/default-script', {
      params: { region },
    });
    return response.script;
  }

  // ==================== Standards ====================

  /**
   * Generate all standards at once
   */
  async generateAllStandards(
    purposes: string[],
    vendors: string[],
    language: string = 'EN',
    region: string = 'EU'
  ): Promise<any> {
    return this.request('POST', '/standards/generate-all', {
      body: { purposes, vendors, language, region },
    });
  }

  // ==================== Audit ====================

  /**
   * Get enforcement decisions
   */
  async getDecisions(limit: number = 100): Promise<any[]> {
    const response = await this.request<any>('GET', '/decisions', {
      params: { limit: limit.toString() },
    });
    return response.decisions;
  }

  /**
   * Export audit data
   */
  async exportAudit(startDate?: string, endDate?: string): Promise<AuditExport> {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await this.request<any>('GET', '/audit/export', { params });

    return {
      tenantId: response.tenant_id,
      exportTime: new Date(response.export_time),
      eventsCount: response.events_count,
      chainValid: response.chain_valid,
      events: response.events || [],
    };
  }

  /**
   * Verify audit chain
   */
  async verifyAuditChain(): Promise<any> {
    return this.request('GET', '/audit/verify');
  }

  // ==================== Vendors ====================

  /**
   * List vendors
   */
  async listVendors(): Promise<any[]> {
    const response = await this.request<any>('GET', '/vendors');
    return response.vendors;
  }

  // ==================== Health ====================

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    return this.request('GET', '/health');
  }
}

// ==================== Webhook Handler ====================

export interface WebhookHandlerConfig {
  secret: string;
  tolerance?: number; // seconds
}

export class WebhookHandler {
  private secret: string;
  private tolerance: number;
  private handlers: Map<string, ((event: WebhookEvent) => void | Promise<void>)[]> = new Map();

  constructor(config: WebhookHandlerConfig) {
    this.secret = config.secret;
    this.tolerance = config.tolerance || 300;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string | Buffer, signatureHeader: string): boolean {
    if (!signatureHeader) {
      throw new WebhookVerificationError('Missing signature header');
    }

    const parts: Record<string, string> = {};
    signatureHeader.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) parts[key] = value;
    });

    const timestamp = parts['t'];
    const signature = parts['v1'];

    if (!timestamp || !signature) {
      throw new WebhookVerificationError('Invalid signature format');
    }

    const webhookTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);

    if (Math.abs(currentTime - webhookTime) > this.tolerance) {
      throw new WebhookVerificationError('Webhook timestamp too old');
    }

    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8');
    const signedPayload = `${timestamp}.${payloadStr}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(signedPayload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new WebhookVerificationError('Signature mismatch');
    }

    return true;
  }

  /**
   * Parse webhook payload
   */
  parse(payload: string | Buffer): WebhookEvent {
    try {
      const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf-8');
      const data = JSON.parse(payloadStr);

      return {
        id: data.id,
        event: data.event,
        createdAt: new Date(data.created_at),
        tenantId: data.tenant_id,
        data: data.data,
        idempotencyKey: data.idempotency_key,
      };
    } catch (error) {
      throw new WebhookVerificationError(`Invalid payload: ${error}`);
    }
  }

  /**
   * Verify and parse webhook
   */
  verifyAndParse(payload: string | Buffer, signatureHeader: string): WebhookEvent {
    this.verifySignature(payload, signatureHeader);
    return this.parse(payload);
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: (event: WebhookEvent) => void | Promise<void>): this {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    return this;
  }

  /**
   * Handle event
   */
  async handle(event: WebhookEvent): Promise<void> {
    const handlers = [
      ...(this.handlers.get(event.event) || []),
      ...(this.handlers.get('*') || []),
    ];

    for (const handler of handlers) {
      await handler(event);
    }
  }

  /**
   * Process webhook (verify, parse, handle)
   */
  async process(payload: string | Buffer, signatureHeader: string): Promise<WebhookEvent> {
    const event = this.verifyAndParse(payload, signatureHeader);
    await this.handle(event);
    return event;
  }
}

// Express middleware helper
export function expressWebhookMiddleware(handler: WebhookHandler) {
  return async (req: any, res: any, next: any) => {
    try {
      const event = await handler.process(
        req.body,
        req.headers['x-signature'] || ''
      );
      res.json({ received: true, eventId: event.id });
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        res.status(401).json({ error: error.message });
      } else {
        next(error);
      }
    }
  };
}

// Default export
export default ConsentClient;
