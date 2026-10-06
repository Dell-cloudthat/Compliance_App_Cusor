# SecurityOS Authentication Setup

SecurityOS uses OIDC/OAuth 2.0 bearer tokens for authentication. Every protected API endpoint
requires a valid JWT in the `Authorization: Bearer <token>` header. This document explains
how to configure identity providers so they emit the required `org_id` custom claim.

## Required JWT Claims

| Claim | Required | Description |
|-------|----------|-------------|
| `sub` or `oid` | Yes | Unique user identifier (never changes) |
| `org_id` | **Yes** | SecurityOS organization ID for this user. Must be an explicit custom claim — we deliberately do not fall back to `tid` or `tenant_id`. See why below. |
| `email` | Recommended | Used for audit log display and attestation records. Falls back to `upn` or `preferred_username`. |
| `name` | Recommended | Display name for audit records. |
| `msp_id` | MSP accounts only | SecurityOS MSP account ID. Present only for MSP users; absent for direct org users. |
| `roles` | Optional | List of role strings (Phase 2 will use these for RBAC). |
| `exp`, `iat`, `iss`, `aud` | Yes | Standard OIDC claims. Always verified. |

### Why `org_id` cannot be inferred from `tid`

Entra's `tid` claim contains the Entra tenant ID — one per Microsoft tenant. If we used `tid`
as `org_id`, every user in the same Microsoft tenant would share one SecurityOS organization,
breaking multi-org setups (e.g., an MSP with one Entra tenant managing 40 clients, or a
company with separate SecurityOS orgs per business unit). `org_id` must be explicit and set by
your provisioning flow.

---

## Environment Variables

```bash
# Required in ENV=prod
AUTH_ISSUER=https://login.microsoftonline.com/{tenant_id}/v2.0
AUTH_AUDIENCE=api://securityos

# Optional — overrides OIDC discovery (rarely needed)
AUTH_JWKS_URL=https://.../.well-known/jwks.json

# Dev/test only — NEVER set in prod
ENV=dev
AUTH_DEV_PRIVATE_KEY_PATH=/path/to/dev_key.pem

# JWKS cache TTL in seconds (default: 300)
AUTH_JWKS_CACHE_TTL_SECONDS=300
```

SecurityOS refuses to start if `ENV=prod` and `AUTH_ISSUER` or `AUTH_AUDIENCE` are missing.

---

## Option 1: Microsoft Entra External ID

Entra External ID is the recommended IdP for B2B and MSP scenarios. The app registration
lives in your tenant; customers sign in with their own Microsoft accounts.

### Step 1: Register the API application

1. In the [Azure Portal](https://portal.azure.com), go to **App registrations → New registration**.
2. Name: `SecurityOS API`; Supported account types: **Accounts in any organizational directory**.
3. Under **Expose an API**:
   - Set Application ID URI: `api://securityos` (or a custom URI).
   - Add a scope: `SecurityOS.Read` (or `access_as_user`).
4. Under **App roles**, create:
   - `admin` (Users/Groups)
   - `executive` (Users/Groups)
   - `engineer` (Users/Groups)
   - `auditor` (Users/Groups)

### Step 2: Register the frontend application

1. New registration: `SecurityOS Web`.
2. Redirect URI: `https://your-domain.com/auth/callback` (SPA type).
3. Under **API permissions**, add `SecurityOS API / SecurityOS.Read`.
4. Grant admin consent.

### Step 3: Emit `org_id` via a Custom Claims Provider

Entra does not automatically add custom attributes to access tokens. Use a **Custom Claims
Provider** (a custom extension or a Logic App) to add `org_id`:

1. In your Entra tenant, go to **Enterprise applications → Custom authentication extensions**.
2. Create a **TokenIssuanceStart** extension that calls a function endpoint.
3. The endpoint receives the user's UPN and returns:
   ```json
   {
     "data": {
       "@odata.type": "microsoft.graph.onTokenIssuanceStartResponseData",
       "actions": [{
         "@odata.type": "microsoft.graph.tokenIssuanceStartAction",
         "claims": {
           "org_id": "org-abc123",
           "msp_id": "msp-xyz456"
         }
       }]
     }
   }
   ```
4. Map the extension claims to the token:
   - In your **API app registration → Token configuration → Optional claims**, add
     `org_id` and `msp_id` from your custom claims provider.

Alternatively, for simpler setups, use **Group claims** to map a security group to an org,
then implement a token enrichment Azure Function.

### Step 4: Configure SecurityOS

```bash
AUTH_ISSUER=https://login.microsoftonline.com/{your_tenant_id}/v2.0
AUTH_AUDIENCE=api://securityos
```

The `jwks_uri` is discovered automatically from
`https://login.microsoftonline.com/{tenant_id}/v2.0/.well-known/openid-configuration`.

---

## Option 2: Auth0

Auth0 is well-suited for customer-facing SaaS and supports both B2B and B2C flows.

### Step 1: Create an API

1. In the [Auth0 Dashboard](https://manage.auth0.com), go to **Applications → APIs → Create API**.
2. Name: `SecurityOS API`; Identifier: `https://api.securityos.io` (or your domain).
3. Signing Algorithm: `RS256`.

### Step 2: Create an Action to add `org_id`

1. Go to **Actions → Library → Build Custom Action**.
2. Trigger: **Login / Post Login**.
3. Code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  // Look up the user's SecurityOS org_id from your user metadata or an external API
  const orgId = event.user.app_metadata?.securityos_org_id;
  const mspId = event.user.app_metadata?.securityos_msp_id;

  const namespace = 'https://securityos.io/claims/';

  if (orgId) {
    api.accessToken.setCustomClaim(`${namespace}org_id`, orgId);
  }
  if (mspId) {
    api.accessToken.setCustomClaim(`${namespace}msp_id`, mspId);
  }
};
```

4. Set `org_id` on each user at provisioning time:
   ```bash
   curl -X PATCH "https://your-domain.auth0.com/api/v2/users/{user_id}" \
     -H "Authorization: Bearer {management_api_token}" \
     -H "Content-Type: application/json" \
     -d '{"app_metadata": {"securityos_org_id": "org-abc123"}}'
   ```

> **Note on namespaced claims:** Auth0 requires custom claims to be namespaced (e.g., `https://securityos.io/claims/org_id`). Adjust your SecurityOS claim mapping to use the full namespaced key, or strip the namespace prefix in a pre-processing step.

### Step 3: Configure SecurityOS

```bash
AUTH_ISSUER=https://your-domain.auth0.com/
AUTH_AUDIENCE=https://api.securityos.io
```

---

## Option 3: Local dev key (dev/test only)

For local development and CI without a real IdP:

```bash
# Generate a key pair
openssl genrsa -out backend/tests/dev_key.pem 2048

# Configure SecurityOS
ENV=dev
AUTH_DEV_PRIVATE_KEY_PATH=backend/tests/dev_key.pem
AUTH_ISSUER=http://localhost/dev-issuer   # any value; skipped in dev-key path
AUTH_AUDIENCE=securityos-dev             # any value; skipped in dev-key path
```

Generate a token for testing:

```python
from backend.auth.jwt import sign_dev_token

token = sign_dev_token({
    "sub": "user-local-001",
    "email": "dev@example.com",
    "name": "Dev User",
    "org_id": "org-local-001",
    # "msp_id": "msp-local-001",  # uncomment for MSP user
})
print(token)
```

Use with any HTTP client:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/securityos/organizations/org-local-001/score
```

**The dev key path is disabled when `ENV=prod`. The server will refuse to start if both
`ENV=prod` and `AUTH_DEV_PRIVATE_KEY_PATH` are set.**

---

## Provisioning `org_id` Values

SecurityOS org IDs are created when an organization is onboarded:

- **Direct org:** ID is generated at signup and stored in the SecurityOS database.
- **MSP-managed org:** ID is returned by `POST /api/v1/securityos/msp/{msp_id}/orgs`.

Store the org ID in your IdP's user metadata (Auth0: `app_metadata`; Entra: custom attribute
or directory extension) at onboarding time so it's automatically included in every token.

---

## Token Validation Details

SecurityOS's `backend/auth/jwt.py` performs these checks in order:

1. Token is present — else `401`.
2. Header is parseable — else `401`.
3. `alg=none` is rejected immediately — `401`.
4. In dev/test with `AUTH_DEV_PRIVATE_KEY_PATH`: verify against local key. Expiry → fatal `401`. Signature mismatch → fall through to JWKS.
5. JWKS URI is resolved via OIDC discovery (`{issuer}/.well-known/openid-configuration`).
6. JWKS is fetched and cached (default TTL 300 s).
7. Key is selected by `kid` header. Unknown `kid` → exactly one refresh, then `401`.
8. Signature is verified with `RS256` or `ES256`.
9. `exp`, `iss`, and `aud` are always verified on the JWKS path.
10. `org_id` claim must be present — else `401`.
11. Tenant isolation: `org_id` from token must match the path `org_id`, or the caller must be an MSP user with that org registered under their `msp_id`.
