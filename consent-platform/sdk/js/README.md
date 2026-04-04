# @consent-platform/js

JavaScript SDK for the Consent as a Service Platform.

## Installation

```bash
npm install @consent-platform/js
```

Or include via CDN:

```html
<script src="https://cdn.consent-platform.com/v1/consent-platform.min.js"></script>
```

## Quick Start

```javascript
import { ConsentPlatform } from '@consent-platform/js';

const cp = new ConsentPlatform({
  apiUrl: 'https://api.consent-platform.com',
  tenantId: 'your-tenant-id',
  apiKey: 'your-api-key', // Optional
  autoShow: true,
  enableGCM: true, // Google Consent Mode v2
  enableTCF: true, // TCF 2.2
});
```

## Auto-init via Script Tag

```html
<script 
  src="https://cdn.consent-platform.com/v1/consent-platform.min.js"
  data-auto-init="true"
  data-api-url="https://api.consent-platform.com"
  data-tenant-id="your-tenant-id"
></script>
```

## API

### Configuration

```typescript
interface ConsentPlatformConfig {
  apiUrl: string;           // Your API URL
  tenantId: string;         // Your tenant ID
  apiKey?: string;          // API key (optional)
  debug?: boolean;          // Enable debug logging
  autoShow?: boolean;       // Auto-show banner (default: true)
  cookieName?: string;      // Cookie name (default: 'consent_platform')
  cookieDomain?: string;    // Cookie domain
  cookieExpiry?: number;    // Cookie expiry in days (default: 365)
  enableGCM?: boolean;      // Enable Google Consent Mode v2
  enableTCF?: boolean;      // Enable TCF 2.2
}
```

### Methods

#### Show/Hide Banner

```javascript
cp.showBanner({
  position: 'bottom', // 'bottom' | 'top' | 'center'
  theme: 'light',     // 'light' | 'dark' | 'auto'
  primaryColor: '#4F46E5',
  showRejectAll: true,
  showManagePreferences: true,
  text: {
    title: 'We value your privacy',
    description: 'We use cookies...',
    acceptAll: 'Accept All',
    rejectAll: 'Reject All',
  },
});

cp.hideBanner();
```

#### Show/Hide Preferences

```javascript
cp.showPreferences();
cp.hidePreferences();
```

#### Consent Actions

```javascript
// Accept all
await cp.acceptAll();

// Reject all (only essential)
await cp.rejectAll();

// Set specific consent
await cp.setConsent(
  { analytics: true, marketing: false, personalization: true },
  { google: true, meta: false }
);
```

#### Check Consent

```javascript
// Has any consent been given?
cp.hasConsent(); // boolean

// Get full consent state
cp.getConsent(); // ConsentState | null

// Check specific purpose
cp.hasConsentFor('analytics'); // boolean

// Get consent token
cp.getConsentToken(); // string | null
```

#### TCF 2.2

```javascript
// Get TCF consent string
const tcString = await cp.getTCString();
```

### Events

```javascript
cp.on('consent:accept-all', () => {
  console.log('User accepted all');
});

cp.on('consent:reject-all', () => {
  console.log('User rejected all');
});

cp.on('consent:update', (consent) => {
  console.log('Consent updated', consent);
});

cp.on('banner:show', () => {
  console.log('Banner shown');
});

cp.on('preferences:show', () => {
  console.log('Preferences shown');
});
```

### Request Interceptor

Automatically attach consent token to all fetch requests:

```javascript
cp.wrapFetch();

// Now all fetch calls include Authorization header
fetch('/api/track', { method: 'POST', body: data });
```

## Google Consent Mode v2

The SDK automatically updates Google Consent Mode when consent changes:

```javascript
// With enableGCM: true (default)
const cp = new ConsentPlatform({
  apiUrl: 'https://api.consent-platform.com',
  tenantId: 'your-tenant-id',
  enableGCM: true,
});

// Consent changes automatically call:
// gtag('consent', 'update', { ad_storage: 'granted', ... })
```

Make sure you have the default consent snippet BEFORE loading Google tags:

```html
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'analytics_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'wait_for_update': 500
  });
</script>
<!-- Then load GTM/GA4 -->
```

## TCF 2.2

Enable TCF 2.2 consent string generation:

```javascript
const cp = new ConsentPlatform({
  apiUrl: 'https://api.consent-platform.com',
  tenantId: 'your-tenant-id',
  enableTCF: true,
});

// After consent, get TCF string
const tcString = await cp.getTCString();
// Returns: "CQHzqoAQHzqoAAHABBENA..."
```

## Styling

### Custom CSS

```javascript
cp.showBanner({
  customCss: `
    #consent-platform-banner {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    #consent-platform-banner .cp-title {
      color: white;
    }
  `,
});
```

### CSS Variables

Override default styling by targeting `#consent-platform-banner`:

```css
#consent-platform-banner {
  --cp-primary: #4F46E5;
  --cp-bg: #FFFFFF;
  --cp-text: #111827;
  --cp-border-radius: 0;
  font-family: 'Your Font', sans-serif;
}
```

## TypeScript

Full TypeScript support included:

```typescript
import { ConsentPlatform, ConsentState, BannerConfig } from '@consent-platform/js';

const cp = new ConsentPlatform({...});

const consent: ConsentState | null = cp.getConsent();
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT
