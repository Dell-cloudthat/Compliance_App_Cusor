# @consent-platform/node

Node.js/TypeScript SDK for the Consent as a Service Platform.

## Installation

```bash
npm install @consent-platform/node
# or
yarn add @consent-platform/node
```

## Quick Start

```typescript
import { ConsentClient } from '@consent-platform/node';

const client = new ConsentClient({
  apiUrl: 'https://api.consent-platform.com',
  apiKey: 'csp_live_xxxxx',
  tenantId: 'your-tenant-id'
});

// Issue consent token
const token = await client.issueConsent({
  userId: 'hashed_user_123',
  purposes: ['analytics', 'marketing'],
  vendors: ['meta', 'google'],
  ttlDays: 30
});

console.log(`Token: ${token.consentToken}`);
console.log(`Expires: ${token.expiresAt}`);

// Send ad event
const result = await client.sendEvent({
  consentToken: token.consentToken,
  eventType: 'purchase',
  vendor: 'meta',
  userId: 'hashed_user_123',
  value: 99.99,
  currency: 'USD'
});

console.log(`Decision: ${result.decision}`);
console.log(`Forwarded: ${result.forwarded}`);
```

## TCF 2.2 Support

```typescript
// Generate TCF string
const tcf = await client.generateTCFString(
  ['analytics', 'marketing'],
  ['meta', 'google']
);

console.log(`TC String: ${tcf.tcString}`);
console.log(`TCF Purposes: ${tcf.tcfPurposes}`);

// Decode TC string
const decoded = await client.decodeTCFString(tcf.tcString);

// Generate from token
const tcfFromToken = await client.tcfFromToken(token.consentToken);
```

## Google Consent Mode v2

```typescript
// Get GCM settings
const gcm = await client.getGCMSettings(
  ['analytics', 'marketing'],
  'EU'
);

console.log(`ad_storage: ${gcm.adStorage}`);
console.log(`analytics_storage: ${gcm.analyticsStorage}`);
console.log(`ad_user_data: ${gcm.adUserData}`);
console.log(`ad_personalization: ${gcm.adPersonalization}`);

// Get default consent script
const script = await client.getGCMScript('EU');
```

## Webhook Handling

```typescript
import { WebhookHandler, WebhookEvent } from '@consent-platform/node';

const webhookHandler = new WebhookHandler({
  secret: 'whsec_xxxxx',
  tolerance: 300 // 5 minutes
});

// Register handlers
webhookHandler.on('consent.issued', (event: WebhookEvent) => {
  console.log(`New consent: ${event.data.token_id}`);
});

webhookHandler.on('enforcement.blocked', (event: WebhookEvent) => {
  console.log(`Blocked: ${event.data.reason}`);
});

// Handle wildcard events
webhookHandler.on('*', (event: WebhookEvent) => {
  console.log(`Event: ${event.event}`);
});
```

### Express Integration

```typescript
import express from 'express';
import { WebhookHandler, expressWebhookMiddleware } from '@consent-platform/node';

const app = express();
const webhookHandler = new WebhookHandler({ secret: 'whsec_xxxxx' });

webhookHandler.on('consent.issued', (event) => {
  console.log('Consent issued:', event.data);
});

// Use raw body for signature verification
app.post('/webhooks', 
  express.raw({ type: 'application/json' }),
  expressWebhookMiddleware(webhookHandler)
);
```

### Manual Handling

```typescript
import express from 'express';
import { WebhookHandler, WebhookVerificationError } from '@consent-platform/node';

const app = express();
const webhookHandler = new WebhookHandler({ secret: 'whsec_xxxxx' });

app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = await webhookHandler.process(
      req.body,
      req.headers['x-signature'] as string
    );
    
    res.json({ received: true, eventId: event.id });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal error' });
    }
  }
});
```

## Error Handling

```typescript
import {
  ConsentClient,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from '@consent-platform/node';

try {
  const token = await client.issueConsent({...});
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof ValidationError) {
    console.log(`Invalid request: ${error.errors}`);
  }
}
```

## Audit & Compliance

```typescript
// Get enforcement decisions
const decisions = await client.getDecisions(100);

for (const decision of decisions) {
  console.log(`${decision.event_type}: ${decision.decision}`);
}

// Export audit data
const auditExport = await client.exportAudit('2026-01-01', '2026-01-31');

console.log(`Events: ${auditExport.eventsCount}`);
console.log(`Chain valid: ${auditExport.chainValid}`);

// Verify chain integrity
const verification = await client.verifyAuditChain();
console.log(`Valid: ${verification.valid}`);
```

## All Standards at Once

```typescript
const standards = await client.generateAllStandards(
  ['analytics', 'marketing'],
  ['meta', 'google'],
  'EN',
  'EU'
);

console.log('TCF String:', standards.tcf.tc_string);
console.log('GCM Settings:', standards.gcm);
```

## TypeScript Types

All types are exported:

```typescript
import {
  ConsentClientConfig,
  IssueConsentParams,
  ConsentToken,
  SendEventParams,
  EventResponse,
  TCFString,
  GCMSettings,
  AuditExport,
  WebhookEvent,
} from '@consent-platform/node';
```

## API Reference

### ConsentClient Methods

| Method | Description |
|--------|-------------|
| `issueConsent()` | Issue a new consent token |
| `revokeConsent()` | Revoke a consent token |
| `listTokens()` | List consent tokens |
| `sendEvent()` | Send event through enforcement |
| `generateTCFString()` | Generate TCF 2.2 string |
| `decodeTCFString()` | Decode TCF string |
| `tcfFromToken()` | Generate TCF from token |
| `getGCMSettings()` | Get GCM settings |
| `getGCMScript()` | Get GCM script |
| `generateAllStandards()` | Generate all standards |
| `getDecisions()` | Get decisions |
| `exportAudit()` | Export audit data |
| `verifyAuditChain()` | Verify chain |
| `listVendors()` | List vendors |
| `healthCheck()` | Health check |

### WebhookHandler Methods

| Method | Description |
|--------|-------------|
| `verifySignature()` | Verify signature |
| `parse()` | Parse payload |
| `verifyAndParse()` | Verify and parse |
| `on()` | Register handler |
| `handle()` | Handle event |
| `process()` | Full processing |

## Configuration

```typescript
const client = new ConsentClient({
  apiUrl: 'https://api.consent-platform.com',
  apiKey: 'csp_live_xxxxx',
  tenantId: 'your-tenant-id',
  timeout: 30000,    // ms
  maxRetries: 3,
});
```

## License

MIT
