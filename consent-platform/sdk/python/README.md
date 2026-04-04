# Consent Platform Python SDK

Python SDK for the Consent as a Service Platform.

## Installation

```bash
pip install consent-platform
```

## Quick Start

```python
from consent_platform import ConsentClient

# Initialize client
client = ConsentClient(
    api_url="https://api.consent-platform.com",
    api_key="csp_live_xxxxx",
    tenant_id="your-tenant-id"
)

# Issue consent token
token = client.issue_consent(
    user_id="hashed_user_123",
    purposes=["analytics", "marketing"],
    vendors=["meta", "google"],
    ttl_days=30
)

print(f"Token: {token.consent_token}")
print(f"Expires: {token.expires_at}")

# Send ad event
result = client.send_event(
    consent_token=token.consent_token,
    event_type="purchase",
    vendor="meta",
    user_id="hashed_user_123",
    value=99.99,
    currency="USD"
)

print(f"Decision: {result.decision}")  # allowed, modified, or blocked
print(f"Forwarded: {result.forwarded}")
```

## Async Client

```python
import asyncio
from consent_platform import AsyncConsentClient

async def main():
    async with AsyncConsentClient(
        api_url="https://api.consent-platform.com",
        api_key="csp_live_xxxxx",
        tenant_id="your-tenant-id"
    ) as client:
        token = await client.issue_consent(
            user_id="user_123",
            purposes=["analytics"],
            vendors=["meta"]
        )
        print(f"Token: {token.consent_token}")

asyncio.run(main())
```

## TCF 2.2 Support

Generate IAB-compliant consent strings:

```python
# Generate TCF string
tcf = client.generate_tcf_string(
    purposes=["analytics", "marketing"],
    vendors=["meta", "google"]
)

print(f"TC String: {tcf.tc_string}")
print(f"TCF Purposes: {tcf.tcf_purposes}")

# Generate from existing token
tcf = client.tcf_from_token(token.consent_token)
```

## Google Consent Mode v2

```python
# Get GCM settings
gcm = client.get_gcm_settings(
    purposes=["analytics", "marketing"],
    region="EU"
)

print(f"ad_storage: {gcm.ad_storage}")
print(f"analytics_storage: {gcm.analytics_storage}")
print(f"ad_user_data: {gcm.ad_user_data}")
print(f"ad_personalization: {gcm.ad_personalization}")

# Get default consent script
script = client.get_gcm_script(region="EU")
```

## Webhook Handling

```python
from consent_platform import WebhookHandler

# Create handler with your webhook secret
handler = WebhookHandler(secret="whsec_xxxxx")

# Register event handlers
@handler.on("consent.issued")
def on_consent_issued(event):
    print(f"New consent: {event.data['token_id']}")
    # Sync with your database

@handler.on("enforcement.blocked")
def on_blocked(event):
    print(f"Event blocked: {event.data['reason']}")
    # Log for compliance

# In your web framework route
def webhook_endpoint(request):
    try:
        event = handler.verify_and_parse(
            payload=request.body,
            signature_header=request.headers.get("X-Signature")
        )
        handler.handle(event)
        return {"received": True}
    except WebhookVerificationError:
        return {"error": "Invalid signature"}, 401
```

### Flask Integration

```python
from flask import Flask
from consent_platform import WebhookHandler, flask_webhook_handler

app = Flask(__name__)
webhook = WebhookHandler(secret="whsec_xxxxx")

@webhook.on("consent.issued")
def on_consent(event):
    print(f"New consent: {event.data}")

app.add_url_rule(
    "/webhooks",
    "webhooks",
    flask_webhook_handler(webhook),
    methods=["POST"]
)
```

### FastAPI Integration

```python
from fastapi import FastAPI, Request
from consent_platform import WebhookHandler, fastapi_webhook_handler

app = FastAPI()
webhook = WebhookHandler(secret="whsec_xxxxx")

@webhook.on("consent.issued")
def on_consent(event):
    print(f"New consent: {event.data}")

app.post("/webhooks")(fastapi_webhook_handler(webhook))
```

## Error Handling

```python
from consent_platform import (
    ConsentClient,
    AuthenticationError,
    RateLimitError,
    ValidationError,
)

client = ConsentClient(...)

try:
    token = client.issue_consent(...)
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except ValidationError as e:
    print(f"Invalid request: {e.errors}")
```

## Audit & Compliance

```python
# Get enforcement decisions
decisions = client.get_decisions(limit=100)

for decision in decisions:
    print(f"{decision['event_type']}: {decision['decision']}")

# Export audit data
export = client.export_audit(
    start_date="2026-01-01",
    end_date="2026-01-31"
)

print(f"Events: {export.events_count}")
print(f"Chain valid: {export.chain_valid}")

# Verify audit chain integrity
verification = client.verify_audit_chain()
print(f"Chain valid: {verification['valid']}")
```

## Configuration

```python
client = ConsentClient(
    api_url="https://api.consent-platform.com",
    api_key="csp_live_xxxxx",
    tenant_id="your-tenant-id",
    timeout=30.0,      # Request timeout in seconds
    max_retries=3,     # Max retries for failed requests
)
```

## API Reference

### ConsentClient Methods

| Method | Description |
|--------|-------------|
| `issue_consent()` | Issue a new consent token |
| `revoke_consent()` | Revoke a consent token |
| `list_tokens()` | List consent tokens |
| `send_event()` | Send an ad event through enforcement |
| `generate_tcf_string()` | Generate TCF 2.2 consent string |
| `decode_tcf_string()` | Decode a TCF string |
| `tcf_from_token()` | Generate TCF from consent token |
| `get_gcm_settings()` | Get Google Consent Mode settings |
| `get_gcm_script()` | Get GCM JavaScript snippet |
| `generate_all_standards()` | Generate all standards at once |
| `get_decisions()` | Get enforcement decisions |
| `export_audit()` | Export audit data |
| `verify_audit_chain()` | Verify chain integrity |
| `list_vendors()` | List configured vendors |
| `health_check()` | Check API health |

### Models

- `ConsentToken` - Consent token response
- `EventResponse` - Event processing result
- `TCFString` - TCF 2.2 consent string
- `GCMSettings` - Google Consent Mode settings
- `AuditExport` - Audit data export
- `WebhookEvent` - Incoming webhook event

### Exceptions

- `ConsentPlatformError` - Base exception
- `AuthenticationError` - 401 errors
- `AuthorizationError` - 403 errors
- `RateLimitError` - 429 errors
- `ValidationError` - 400 errors
- `NetworkError` - Network failures
- `WebhookVerificationError` - Invalid webhook signature

## License

MIT
