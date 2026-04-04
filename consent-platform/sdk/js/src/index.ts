/**
 * Consent Platform JavaScript SDK
 * 
 * A lightweight SDK for integrating consent management into your website.
 * 
 * Features:
 * - Consent banner with customizable styling
 * - Preference center
 * - Automatic token attachment to requests
 * - TCF 2.2 and Google Consent Mode v2 support
 * - Cookie management
 * 
 * Usage:
 * ```javascript
 * import { ConsentPlatform } from '@consent-platform/js';
 * 
 * const cp = new ConsentPlatform({
 *   apiUrl: 'https://consent-api.example.com',
 *   tenantId: 'your-tenant-id',
 * });
 * 
 * cp.showBanner();
 * ```
 */

// ============== Types ==============

export interface ConsentPlatformConfig {
  /** API URL for the consent platform */
  apiUrl: string;
  /** Your tenant ID */
  tenantId: string;
  /** API key (optional, for authenticated requests) */
  apiKey?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-show banner if no consent stored */
  autoShow?: boolean;
  /** Cookie name for storing consent */
  cookieName?: string;
  /** Cookie domain */
  cookieDomain?: string;
  /** Cookie expiry in days */
  cookieExpiry?: number;
  /** Enable Google Consent Mode v2 */
  enableGCM?: boolean;
  /** Enable TCF 2.2 */
  enableTCF?: boolean;
}

export interface Purpose {
  id: string;
  name: string;
  description: string;
  required?: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  purposes: string[];
}

export interface ConsentState {
  purposes: Record<string, boolean>;
  vendors: Record<string, boolean>;
  timestamp: string;
  token?: string;
  tcString?: string;
}

export interface BannerConfig {
  /** Banner position */
  position?: 'bottom' | 'top' | 'center';
  /** Theme */
  theme?: 'light' | 'dark' | 'auto';
  /** Primary color */
  primaryColor?: string;
  /** Custom CSS */
  customCss?: string;
  /** Privacy policy URL */
  privacyPolicyUrl?: string;
  /** Cookie policy URL */
  cookiePolicyUrl?: string;
  /** Show "Reject All" button */
  showRejectAll?: boolean;
  /** Show "Manage Preferences" button */
  showManagePreferences?: boolean;
  /** Custom text */
  text?: {
    title?: string;
    description?: string;
    acceptAll?: string;
    rejectAll?: string;
    managePreferences?: string;
    save?: string;
    close?: string;
  };
}

export interface ConsentResponse {
  consent_token: string;
  token_id: string;
  expires_at: string;
  purposes: string[];
  vendors: string[];
}

// ============== Constants ==============

const DEFAULT_PURPOSES: Purpose[] = [
  {
    id: 'essential',
    name: 'Essential',
    description: 'Required for the website to function properly',
    required: true,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Help us understand how visitors use our website',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Used to deliver relevant advertisements',
  },
  {
    id: 'personalization',
    name: 'Personalization',
    description: 'Allow us to personalize your experience',
  },
];

const DEFAULT_BANNER_TEXT = {
  title: 'We value your privacy',
  description: 'We use cookies and similar technologies to provide you with the best experience. You can choose which cookies you allow.',
  acceptAll: 'Accept All',
  rejectAll: 'Reject All',
  managePreferences: 'Manage Preferences',
  save: 'Save Preferences',
  close: 'Close',
};

// ============== Utility Functions ==============

function generateUserId(): string {
  // Generate a random user ID and hash it
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number, domain?: string): void {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  let cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  if (domain) {
    cookie += `; domain=${domain}`;
  }
  document.cookie = cookie;
}

function deleteCookie(name: string, domain?: string): void {
  let cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  if (domain) {
    cookie += `; domain=${domain}`;
  }
  document.cookie = cookie;
}

// ============== Main Class ==============

export class ConsentPlatform {
  private config: ConsentPlatformConfig;
  private consent: ConsentState | null = null;
  private purposes: Purpose[] = DEFAULT_PURPOSES;
  private vendors: Vendor[] = [];
  private bannerElement: HTMLElement | null = null;
  private preferencesElement: HTMLElement | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor(config: ConsentPlatformConfig) {
    this.config = {
      cookieName: 'consent_platform',
      cookieExpiry: 365,
      autoShow: true,
      enableGCM: true,
      enableTCF: false,
      debug: false,
      ...config,
    };

    this.loadConsent();
    
    if (this.config.autoShow && !this.hasConsent()) {
      // Show banner after DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.showBanner());
      } else {
        this.showBanner();
      }
    }

    this.log('Consent Platform initialized', this.config);
  }

  // ============== Logging ==============

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[ConsentPlatform]', ...args);
    }
  }

  // ============== Events ==============

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // ============== Consent State ==============

  public hasConsent(): boolean {
    return this.consent !== null;
  }

  public getConsent(): ConsentState | null {
    return this.consent;
  }

  public getConsentToken(): string | null {
    return this.consent?.token || null;
  }

  public hasConsentFor(purposeId: string): boolean {
    return this.consent?.purposes[purposeId] === true;
  }

  private loadConsent(): void {
    const stored = getCookie(this.config.cookieName!);
    if (stored) {
      try {
        this.consent = JSON.parse(stored);
        this.log('Loaded consent from cookie', this.consent);
        
        // Apply consent to Google Consent Mode
        if (this.config.enableGCM) {
          this.updateGoogleConsentMode();
        }
      } catch (e) {
        this.log('Failed to parse stored consent', e);
      }
    }
  }

  private saveConsent(): void {
    if (this.consent) {
      setCookie(
        this.config.cookieName!,
        JSON.stringify(this.consent),
        this.config.cookieExpiry!,
        this.config.cookieDomain
      );
      this.log('Saved consent to cookie', this.consent);
    }
  }

  // ============== API Calls ==============

  private async apiCall(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.config.tenantId,
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  public async issueConsentToken(purposes: string[], vendors: string[]): Promise<ConsentResponse> {
    const userId = this.consent?.purposes ? generateUserId() : generateUserId();
    
    const response = await this.apiCall('/consent', 'POST', {
      user_id: userId,
      purposes,
      vendors,
      ttl_days: this.config.cookieExpiry,
      jurisdiction: this.detectJurisdiction(),
    });

    return response;
  }

  private detectJurisdiction(): string {
    // Simple jurisdiction detection based on timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.startsWith('Europe/')) return 'GDPR';
    if (tz === 'America/Los_Angeles' || tz === 'America/San_Francisco') return 'CPRA';
    return 'GDPR'; // Default to GDPR for strictest compliance
  }

  // ============== Google Consent Mode ==============

  private updateGoogleConsentMode(): void {
    if (typeof window === 'undefined') return;
    
    const gtag = (window as any).gtag;
    if (typeof gtag !== 'function') {
      this.log('gtag not found, skipping GCM update');
      return;
    }

    const consent = this.consent;
    if (!consent) return;

    gtag('consent', 'update', {
      'ad_storage': consent.purposes['marketing'] ? 'granted' : 'denied',
      'analytics_storage': consent.purposes['analytics'] ? 'granted' : 'denied',
      'ad_user_data': consent.purposes['marketing'] ? 'granted' : 'denied',
      'ad_personalization': consent.purposes['personalization'] ? 'granted' : 'denied',
      'functionality_storage': 'granted',
      'personalization_storage': consent.purposes['personalization'] ? 'granted' : 'denied',
    });

    this.log('Updated Google Consent Mode');
  }

  // ============== TCF 2.2 ==============

  public async getTCString(): Promise<string | null> {
    if (!this.consent) return null;

    try {
      const response = await this.apiCall('/tcf/generate', 'POST', {
        purposes: Object.keys(this.consent.purposes).filter(p => this.consent!.purposes[p]),
        vendors: Object.keys(this.consent.vendors).filter(v => this.consent!.vendors[v]),
        language: navigator.language.split('-')[0].toUpperCase(),
      });

      return response.tc_string;
    } catch (e) {
      this.log('Failed to generate TC string', e);
      return null;
    }
  }

  // ============== Banner ==============

  public showBanner(config?: BannerConfig): void {
    if (this.bannerElement) {
      this.bannerElement.style.display = 'block';
      return;
    }

    const bannerConfig: BannerConfig = {
      position: 'bottom',
      theme: 'light',
      primaryColor: '#4F46E5',
      showRejectAll: true,
      showManagePreferences: true,
      text: DEFAULT_BANNER_TEXT,
      ...config,
    };

    this.bannerElement = this.createBanner(bannerConfig);
    document.body.appendChild(this.bannerElement);
    this.emit('banner:show');
  }

  public hideBanner(): void {
    if (this.bannerElement) {
      this.bannerElement.style.display = 'none';
      this.emit('banner:hide');
    }
  }

  private createBanner(config: BannerConfig): HTMLElement {
    const banner = document.createElement('div');
    banner.id = 'consent-platform-banner';
    
    const text = { ...DEFAULT_BANNER_TEXT, ...config.text };
    const isDark = config.theme === 'dark';
    
    banner.innerHTML = `
      <style>
        #consent-platform-banner {
          position: fixed;
          ${config.position === 'top' ? 'top: 0;' : config.position === 'center' ? 'top: 50%; transform: translateY(-50%);' : 'bottom: 0;'}
          left: 0;
          right: 0;
          ${config.position === 'center' ? 'max-width: 500px; margin: 0 auto; border-radius: 12px;' : ''}
          background: ${isDark ? '#1F2937' : '#FFFFFF'};
          color: ${isDark ? '#F9FAFB' : '#111827'};
          padding: 20px 24px;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #consent-platform-banner .cp-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
        }
        #consent-platform-banner .cp-text {
          flex: 1;
          min-width: 300px;
        }
        #consent-platform-banner .cp-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        #consent-platform-banner .cp-description {
          font-size: 14px;
          color: ${isDark ? '#9CA3AF' : '#6B7280'};
          line-height: 1.5;
        }
        #consent-platform-banner .cp-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        #consent-platform-banner .cp-btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        #consent-platform-banner .cp-btn-primary {
          background: ${config.primaryColor};
          color: white;
        }
        #consent-platform-banner .cp-btn-primary:hover {
          opacity: 0.9;
        }
        #consent-platform-banner .cp-btn-secondary {
          background: ${isDark ? '#374151' : '#F3F4F6'};
          color: ${isDark ? '#F9FAFB' : '#374151'};
        }
        #consent-platform-banner .cp-btn-secondary:hover {
          background: ${isDark ? '#4B5563' : '#E5E7EB'};
        }
        #consent-platform-banner .cp-btn-link {
          background: transparent;
          color: ${config.primaryColor};
          text-decoration: underline;
        }
        ${config.customCss || ''}
      </style>
      <div class="cp-content">
        <div class="cp-text">
          <div class="cp-title">${text.title}</div>
          <div class="cp-description">${text.description}</div>
        </div>
        <div class="cp-buttons">
          ${config.showRejectAll ? `<button class="cp-btn cp-btn-secondary" data-action="reject">${text.rejectAll}</button>` : ''}
          ${config.showManagePreferences ? `<button class="cp-btn cp-btn-secondary" data-action="preferences">${text.managePreferences}</button>` : ''}
          <button class="cp-btn cp-btn-primary" data-action="accept">${text.acceptAll}</button>
        </div>
      </div>
    `;

    // Event handlers
    banner.querySelector('[data-action="accept"]')?.addEventListener('click', () => this.acceptAll());
    banner.querySelector('[data-action="reject"]')?.addEventListener('click', () => this.rejectAll());
    banner.querySelector('[data-action="preferences"]')?.addEventListener('click', () => this.showPreferences());

    return banner;
  }

  // ============== Preferences ==============

  public showPreferences(): void {
    if (this.preferencesElement) {
      this.preferencesElement.style.display = 'flex';
      return;
    }

    this.preferencesElement = this.createPreferences();
    document.body.appendChild(this.preferencesElement);
    this.emit('preferences:show');
  }

  public hidePreferences(): void {
    if (this.preferencesElement) {
      this.preferencesElement.style.display = 'none';
      this.emit('preferences:hide');
    }
  }

  private createPreferences(): HTMLElement {
    const modal = document.createElement('div');
    modal.id = 'consent-platform-preferences';

    modal.innerHTML = `
      <style>
        #consent-platform-preferences {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #consent-platform-preferences .cp-modal {
          background: white;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }
        #consent-platform-preferences .cp-header {
          padding: 20px;
          border-bottom: 1px solid #E5E7EB;
        }
        #consent-platform-preferences .cp-header h2 {
          margin: 0;
          font-size: 18px;
        }
        #consent-platform-preferences .cp-body {
          padding: 20px;
        }
        #consent-platform-preferences .cp-purpose {
          padding: 16px 0;
          border-bottom: 1px solid #E5E7EB;
        }
        #consent-platform-preferences .cp-purpose:last-child {
          border-bottom: none;
        }
        #consent-platform-preferences .cp-purpose-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #consent-platform-preferences .cp-purpose-name {
          font-weight: 600;
          font-size: 14px;
        }
        #consent-platform-preferences .cp-purpose-desc {
          font-size: 13px;
          color: #6B7280;
          margin-top: 4px;
        }
        #consent-platform-preferences .cp-toggle {
          position: relative;
          width: 44px;
          height: 24px;
        }
        #consent-platform-preferences .cp-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        #consent-platform-preferences .cp-toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #D1D5DB;
          border-radius: 24px;
          transition: 0.2s;
        }
        #consent-platform-preferences .cp-toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: 0.2s;
        }
        #consent-platform-preferences .cp-toggle input:checked + .cp-toggle-slider {
          background-color: #4F46E5;
        }
        #consent-platform-preferences .cp-toggle input:checked + .cp-toggle-slider:before {
          transform: translateX(20px);
        }
        #consent-platform-preferences .cp-toggle input:disabled + .cp-toggle-slider {
          opacity: 0.5;
          cursor: not-allowed;
        }
        #consent-platform-preferences .cp-footer {
          padding: 16px 20px;
          border-top: 1px solid #E5E7EB;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        #consent-platform-preferences .cp-btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
        }
        #consent-platform-preferences .cp-btn-primary {
          background: #4F46E5;
          color: white;
        }
        #consent-platform-preferences .cp-btn-secondary {
          background: #F3F4F6;
          color: #374151;
        }
      </style>
      <div class="cp-modal">
        <div class="cp-header">
          <h2>Privacy Preferences</h2>
        </div>
        <div class="cp-body">
          ${this.purposes.map(p => `
            <div class="cp-purpose">
              <div class="cp-purpose-header">
                <span class="cp-purpose-name">${p.name}</span>
                <label class="cp-toggle">
                  <input type="checkbox" data-purpose="${p.id}" ${p.required ? 'checked disabled' : ''} ${this.consent?.purposes[p.id] ? 'checked' : ''}>
                  <span class="cp-toggle-slider"></span>
                </label>
              </div>
              <div class="cp-purpose-desc">${p.description}</div>
            </div>
          `).join('')}
        </div>
        <div class="cp-footer">
          <button class="cp-btn cp-btn-secondary" data-action="close">Cancel</button>
          <button class="cp-btn cp-btn-primary" data-action="save">Save Preferences</button>
        </div>
      </div>
    `;

    // Event handlers
    modal.querySelector('[data-action="close"]')?.addEventListener('click', () => this.hidePreferences());
    modal.querySelector('[data-action="save"]')?.addEventListener('click', () => this.savePreferences(modal));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.hidePreferences();
    });

    return modal;
  }

  // ============== Consent Actions ==============

  public async acceptAll(): Promise<void> {
    const purposes: Record<string, boolean> = {};
    const vendors: Record<string, boolean> = {};

    this.purposes.forEach(p => purposes[p.id] = true);
    this.vendors.forEach(v => vendors[v.id] = true);

    await this.setConsent(purposes, vendors);
    this.hideBanner();
    this.hidePreferences();
    this.emit('consent:accept-all');
  }

  public async rejectAll(): Promise<void> {
    const purposes: Record<string, boolean> = {};
    const vendors: Record<string, boolean> = {};

    this.purposes.forEach(p => purposes[p.id] = p.required || false);
    this.vendors.forEach(v => vendors[v.id] = false);

    await this.setConsent(purposes, vendors);
    this.hideBanner();
    this.hidePreferences();
    this.emit('consent:reject-all');
  }

  private async savePreferences(modal: HTMLElement): Promise<void> {
    const purposes: Record<string, boolean> = {};
    const vendors: Record<string, boolean> = {};

    modal.querySelectorAll<HTMLInputElement>('[data-purpose]').forEach(input => {
      purposes[input.dataset.purpose!] = input.checked;
    });

    this.vendors.forEach(v => vendors[v.id] = true); // Default vendors

    await this.setConsent(purposes, vendors);
    this.hideBanner();
    this.hidePreferences();
    this.emit('consent:save-preferences', purposes);
  }

  public async setConsent(purposes: Record<string, boolean>, vendors: Record<string, boolean>): Promise<void> {
    try {
      // Get token from API
      const consentedPurposes = Object.keys(purposes).filter(p => purposes[p]);
      const consentedVendors = Object.keys(vendors).filter(v => vendors[v]);
      
      const response = await this.issueConsentToken(consentedPurposes, consentedVendors);

      this.consent = {
        purposes,
        vendors,
        timestamp: new Date().toISOString(),
        token: response.consent_token,
      };

      this.saveConsent();

      // Update Google Consent Mode
      if (this.config.enableGCM) {
        this.updateGoogleConsentMode();
      }

      // Get TCF string if enabled
      if (this.config.enableTCF) {
        this.consent.tcString = await this.getTCString() || undefined;
      }

      this.emit('consent:update', this.consent);
      this.log('Consent updated', this.consent);

    } catch (e) {
      this.log('Failed to set consent', e);
      throw e;
    }
  }

  // ============== Cookie Utilities ==============

  public clearConsent(): void {
    deleteCookie(this.config.cookieName!, this.config.cookieDomain);
    this.consent = null;
    this.emit('consent:clear');
    this.log('Consent cleared');
  }

  // ============== Request Interceptor ==============

  public getAuthorizationHeader(): string | null {
    if (this.consent?.token) {
      return `Bearer ${this.consent.token}`;
    }
    return null;
  }

  /**
   * Wrap fetch to automatically attach consent token
   */
  public wrapFetch(): void {
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const token = self.getConsentToken();
      if (token && init) {
        init.headers = {
          ...init.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
      return originalFetch(input, init);
    };

    this.log('Fetch wrapped with consent token');
  }
}

// ============== Auto-init from script tag ==============

if (typeof window !== 'undefined') {
  (window as any).ConsentPlatform = ConsentPlatform;
  
  // Check for auto-init script tag
  const script = document.currentScript as HTMLScriptElement;
  if (script?.dataset.autoInit === 'true') {
    const config: ConsentPlatformConfig = {
      apiUrl: script.dataset.apiUrl || '',
      tenantId: script.dataset.tenantId || '',
      apiKey: script.dataset.apiKey,
      debug: script.dataset.debug === 'true',
      autoShow: script.dataset.autoShow !== 'false',
    };
    
    if (config.apiUrl && config.tenantId) {
      (window as any).consentPlatform = new ConsentPlatform(config);
    }
  }
}

export default ConsentPlatform;
