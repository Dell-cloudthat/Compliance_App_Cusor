# Integration Guide

This guide covers how to integrate the Consent Platform into your application stack to achieve server-side consent enforcement for ad events.

---

## Overview

```
Your Website/App
      │
      │  1. User gives consent
      ▼
Consent Platform API  ──────► Issues signed consent token (JWT / ES256)
      │
      │  2. Attach token to events
      ▼
Enforcement Proxy (your server)
      │
      │  3. Validate token + strip disallowed data
      ▼
Ad Platforms (Meta, Google, TikTok, …)
      │
      │  4. Immutable audit log
      ▼
Evidence Store (compliance proof)
```

The platform sits between your users and your ad platforms, making sure every data point forwarded to a vendor was explicitly consented to.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Python 3.10+ (backend) | Node.js 16+ or browser JS also supported via SDKs |
| PostgreSQL 14+ or SQLite | SQLite used for development/demo |
| API key | Issued by the Consent Platform admin UI |

---

## Quick Start

### 1. Start the backend

```bash
cd consent-platform
docker compose up -d          # PostgreSQL + Redis + backend + frontend
# — or for local dev without Docker —
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

The API is available at `http://localhost:8001`. Interactive docs: `http://localhost:8001/docs`.

### 2. Obtain an API key

```bash
curl -X POST http://localhost:8001/api-keys \
  -H "X-Tenant-ID: your-tenant-id" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production", "scopes": ["consent:write", "consent:read", "events:write", "admin:read"]}'
```

Response:
```json
{
  "api_key": "cp_live_xxxxxxxxxxxxxxxxxxxxxxxx",
  "key_id": "ak-..."
}
```

> **Security note**: Store the key securely. It is shown only once.

---

## Step 1 — Register Vendors

Before issuing consent tokens, define which vendors you send data to.

### Python SDK

```python
from consent_platform import ConsentPlatformClient

client = ConsentPlatformClient(
    base_url="https://your-consent-platform.example.com",
    api_key="cp_live_xxxx",
)

# Create a vendor
vendor = client.vendors.create(
    name="meta",
    display_name="Meta (Facebook)",
    vendor_type="ad_platform",
    allowed_data_classes=["behavioral", "device"],
)
```

### REST API

```bash
curl -X POST https://your-consent-platform.example.com/vendors \
  -H "X-API-Key: cp_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "meta",
    "display_name": "Meta (Facebook)",
    "vendor_type": "ad_platform",
    "allowed_data_classes": ["behavioral", "device"],
    "api_key": "EAAxxxxx",
    "pixel_id": "1234567890"
  }'
```

### Vendor update (change data classes or credentials)

```bash
curl -X PUT https://your-consent-platform.example.com/vendors/{vendor_id} \
  -H "X-API-Key: cp_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"allowed_data_classes": ["behavioral"], "status": "active"}'
```

### Delete a vendor

```bash
curl -X DELETE https://your-consent-platform.example.com/vendors/{vendor_id} \
  -H "X-API-Key: cp_live_xxxx"
```

---

## Step 2 — Embed the Consent Banner

### JavaScript SDK (browser)

```html
<script src="https://cdn.your-consent-platform.example.com/cp-sdk.min.js"></script>
<script>
  const cp = new ConsentPlatform({
    tenantId: 'your-tenant-id',
    apiUrl: 'https://your-consent-platform.example.com',
    purposes: ['analytics', 'retargeting'],
    vendors: ['meta', 'google'],
  });

  // Show banner (auto-skipped if consent already given)
  cp.showBanner({
    onAcceptAll: async () => {
      const token = await cp.issueToken({ jurisdiction: 'GDPR' });
      // Store token for subsequent event calls
      sessionStorage.setItem('consent_token', token);
    },
    onSavePreferences: async (prefs) => {
      const token = await cp.issueToken({
        purposes: prefs.purposes,
        vendors: prefs.vendors,
        jurisdiction: 'GDPR',
      });
      sessionStorage.setItem('consent_token', token);
    },
  });
</script>
```

### Server-side token issuance (recommended for production)

Issue tokens from your server after receiving user consent, so the API key never reaches the browser.

```python
# Python — in your consent form handler
from consent_platform import ConsentPlatformClient

client = ConsentPlatformClient(
    base_url="https://your-consent-platform.example.com",
    api_key=os.environ["CONSENT_PLATFORM_API_KEY"],
)

def handle_consent_submission(user_id: str, purposes: list, vendors: list):
    token = client.consent.issue(
        user_id=user_id,   # hashed / pseudonymous
        purposes=purposes,
        vendors=vendors,
        jurisdiction="GDPR",
        ttl_days=14,
    )
    # Return token to client; client attaches it to subsequent ad events
    return token.consent_token
```

#### REST equivalent

```bash
curl -X POST https://your-consent-platform.example.com/consent \
  -H "X-API-Key: cp_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "hashed-uid-abc123",
    "purposes": ["analytics", "retargeting"],
    "vendors": ["meta", "google"],
    "jurisdiction": "GDPR",
    "ttl_days": 14
  }'
```

Response:
```json
{
  "consent_token": "eyJhbGciOiJFUzI1NiJ9.xxx.yyy",
  "token_id": "tok-...",
  "expires_at": "2026-10-19T20:00:00Z",
  "purposes": ["analytics", "retargeting"],
  "vendors": ["meta", "google"]
}
```

---

## Step 3 — Enforce Events Server-Side

Every ad event must pass through the enforcement endpoint before being forwarded to vendors.

### REST API

```bash
curl -X POST https://your-consent-platform.example.com/event \
  -H "X-API-Key: cp_live_xxxx" \
  -H "Authorization: Bearer eyJhbGciOiJFUzI1NiJ9.xxx.yyy" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "purchase",
    "user_id": "hashed-uid-abc123",
    "vendor": "meta",
    "data_classes": ["behavioral", "identity"],
    "value": 49.99,
    "currency": "USD"
  }'
```

#### Decision outcomes

| Decision | Meaning |
|---|---|
| `allowed` | All data forwarded to vendor unchanged |
| `modified` | Some fields stripped; remaining data forwarded |
| `blocked` | Event not forwarded (missing token, revoked, vendor/purpose not allowed) |

### Python SDK

```python
result = client.events.enforce(
    event_type="purchase",
    user_id="hashed-uid-abc123",
    vendor="meta",
    consent_token=token,
    data_classes=["behavioral", "identity"],
    value=49.99,
)

if result.decision == "blocked":
    logger.warning("Event blocked", reason=result.reason)
elif result.decision == "modified":
    logger.info("Fields stripped", fields=result.fields_stripped)
```

### Node.js SDK

```typescript
import { ConsentPlatformClient } from '@consent-platform/node';

const client = new ConsentPlatformClient({
  baseUrl: 'https://your-consent-platform.example.com',
  apiKey: process.env.CONSENT_PLATFORM_API_KEY!,
});

const result = await client.events.enforce({
  eventType: 'purchase',
  userId: 'hashed-uid-abc123',
  vendor: 'meta',
  consentToken: token,
  dataClasses: ['behavioral', 'identity'],
  value: 49.99,
});
```

---

## Step 4 — Revoke Consent

Users can withdraw consent at any time. Revoking a token immediately blocks all future events using that token.

```bash
curl -X POST https://your-consent-platform.example.com/consent/revoke \
  -H "X-API-Key: cp_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"token_id": "tok-...", "reason": "user_request"}'
```

Or revoke all tokens for a subject:

```python
client.consent.revoke_all(subject_id="hashed-uid-abc123", reason="account_deletion")
```

---

## Step 5 — Webhooks

Subscribe to real-time consent and enforcement events.

### Create a webhook

```bash
curl -X POST https://your-consent-platform.example.com/webhooks \
  -H "X-API-Key: cp_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.example.com/consent-events",
    "events": ["consent.issued", "consent.revoked", "enforcement.blocked"]
  }'
```

Response includes a `secret` — store it securely to verify webhook signatures.

### Verify webhook signatures

```python
import hmac, hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

# In your webhook handler:
@app.post("/consent-events")
def handle_webhook(request: Request):
    sig = request.headers.get("X-Signature-256", "")
    body = request.body()
    if not verify_webhook(body, sig, WEBHOOK_SECRET):
        raise HTTPException(status_code=401)
    event = json.loads(body)
    # … process event …
```

### Available webhook events

| Event | Trigger |
|---|---|
| `consent.issued` | New consent token created |
| `consent.revoked` | Token revoked by user or admin |
| `consent.expired` | Token TTL elapsed |
| `enforcement.allowed` | Event forwarded unchanged |
| `enforcement.modified` | Event forwarded with fields stripped |
| `enforcement.blocked` | Event blocked |
| `vendor.added` | New vendor registered |
| `vendor.removed` | Vendor deleted |
| `policy.updated` | Consent policy changed |
| `*` | All events |

### Test a webhook

```bash
curl -X POST https://your-consent-platform.example.com/webhooks/{webhook_id}/test \
  -H "X-API-Key: cp_live_xxxx"
```

### View delivery logs

```bash
curl https://your-consent-platform.example.com/webhooks/{webhook_id}/logs?limit=20 \
  -H "X-API-Key: cp_live_xxxx"
```

---

## Step 6 — Google Consent Mode v2

If you use Google Analytics 4 or Google Ads, enable Consent Mode v2 signals.

```bash
curl -X POST https://your-consent-platform.example.com/gcm/generate \
  -H "X-API-Key: cp_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "consent_token": "eyJhbGciOiJFUzI1NiJ9.xxx.yyy",
    "default_state": "denied"
  }'
```

Returns the GCM payload to pass to `gtag('consent', 'update', {...})`.

---

## Step 7 — TCF 2.2 (EU Programmatic Advertising)

Generate IAB-compliant TC strings for DSPs and CMP integration.

```bash
curl -X POST https://your-consent-platform.example.com/tcf/generate \
  -H "X-API-Key: cp_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "consent_token": "eyJhbGciOiJFUzI1NiJ9.xxx.yyy",
    "vendor_ids": [755, 32, 91]
  }'
```

---

## Running Tests

```bash
# Unit tests (no server required)
cd consent-platform/backend
pytest tests/test_token_service.py tests/test_enforcement_engine.py -v

# Integration tests (spins up in-memory SQLite server)
pytest tests/test_api_integration.py -v

# All tests
pytest tests/ -v
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `403 security_violation` on `/event` | Anti-replay triggered | Use unique event IDs; don't reuse tokens at high frequency without a new issuance |
| `401 unauthorized` | Missing or invalid API key | Pass `X-API-Key` header or use `X-Tenant-ID` for demo mode |
| `400` on token issuance | Missing required fields | Ensure `user_id`, `purposes`, and `vendors` are all provided |
| `404` on vendor update/delete | Vendor ID not found | Fetch `/vendors` to retrieve the correct UUID |
| Decision always `blocked` | Token missing vendor consent | Re-issue the token and include the vendor in the `vendors` array |
| Webhook delivery fails | Endpoint unreachable | Use `POST /webhooks/{id}/test` to check delivery; review logs at `/webhooks/{id}/logs` |

---

## Architecture Reference

```
┌──────────────────────────────────────────────────────────────┐
│                      Control Plane                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Token Service│  │ Policy Engine│  │ Tenant / Auth    │  │
│  │ (ES256 JWT)  │  │ (purpose map)│  │ (API key + RBAC) │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────────────────────┬───────────────────────┘
                                       │ Policies + Keys
                                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    Enforcement Plane                         │
│  ┌──────────────────────┐  ┌───────────────────────────┐   │
│  │  Enforcement Engine  │  │   Security Service         │   │
│  │  (ALLOW / MODIFY /   │  │   (replay, shadow pipe,   │   │
│  │   BLOCK decisions)   │  │    token fingerprint)     │   │
│  └──────────────────────┘  └───────────────────────────┘   │
└──────────────────────────────────────┬───────────────────────┘
                                       │ Events (with audit log)
                   ┌───────────────────┼────────────────────┐
                   ▼                   ▼                    ▼
            Meta CAPI             Google Ads          Custom DSP
                                       │
                                       ▼
                             ┌──────────────────┐
                             │  Evidence Store   │
                             │ (immutable audit) │
                             └──────────────────┘
```
