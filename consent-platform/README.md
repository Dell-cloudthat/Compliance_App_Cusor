# Consent as a Service Platform

**OAuth for Ad Data** - Server-side consent enforcement for the modern ad stack.

[![API Status](https://img.shields.io/badge/API-v1.0-green.svg)](http://localhost:8001/docs)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## The Problem

Most Consent Management Platforms (CMPs) are client-side checkbox collectors. They:
- Get blocked by ad blockers
- Can be trivially bypassed
- Can't actually enforce anything
- Have no proof of enforcement

## The Solution

A server-side enforcement proxy that **actually blocks data** before it reaches vendors.

```
Website / App
     │
     │ Server-side events
     ▼
┌─────────────────────────────┐
│     ENFORCEMENT PROXY       │
│  • Token validation         │
│  • Policy evaluation        │
│  • Data transformation      │
│  • Allow / Strip / Block    │
└─────────────┬───────────────┘
              │
      ┌───────┴───────┐
      ▼               ▼
   Meta            Google
      │               │
      └───────┬───────┘
              │
              ▼
    Immutable Evidence Store
    (Hash-chained audit log)
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Access the platform
# Dashboard: http://localhost:3001
# API Docs:  http://localhost:8001/docs
# Metrics:   http://localhost:8001/metrics

# Seed demo data
pip install httpx
python demo/seed_demo_data.py

# Run tests
python demo/test_api.py
```

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Option 3: With Monitoring

```bash
# Start with Prometheus + Grafana
docker-compose --profile monitoring up -d

# Access Grafana: http://localhost:3000 (admin/admin)
# Access Prometheus: http://localhost:9090
```

---

## 📖 Full Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Complete deployment guide for local, Docker, and cloud |
| [API Docs](http://localhost:8001/docs) | Interactive API documentation (Swagger UI) |
| [demo/](demo/) | Test scripts, data seeding, and examples |

## API Reference

### Flow A: Issue Consent Token

```bash
POST /consent
{
  "user_id": "hashed_user_123",
  "purposes": ["retargeting", "analytics"],
  "vendors": ["meta", "google"],
  "ttl_days": 14,
  "jurisdiction": "GDPR"
}
```

Response:
```json
{
  "consent_token": "eyJhbGciOiJFUzI1NiIs...",
  "token_id": "abc-123",
  "expires_at": "2026-02-16T00:00:00Z"
}
```

### Flow B: Process Ad Event

```bash
POST /event
Authorization: Bearer <consent_token>
{
  "event_type": "purchase",
  "user_id": "hashed_user_123",
  "vendor": "meta",
  "data_classes": ["behavioral", "transaction"],
  "url": "/checkout",
  "value": 99.99
}
```

Response:
```json
{
  "decision": "allowed",
  "reason": "all_checks_passed",
  "fields_stripped": [],
  "forwarded": true,
  "vendor_event_id": "fbq_abc123"
}
```

### Flow C: Audit Export

```bash
GET /audit/export?start_date=2026-01-01&end_date=2026-02-01
```

```bash
GET /audit/verify  # Verify hash chain integrity
```

## Consent Token Schema

Tokens are JWT-like, signed with ES256, NOT encrypted (auditable).

```json
{
  "iss": "consent-control-plane",
  "sub": "hashed_user_id",
  "iat": 1738362000,
  "exp": 1739571600,
  "tid": "tenant_id",
  "jti": "unique_token_id",
  "jurisdiction": "GDPR",

  "purposes": {
    "retargeting": {
      "allowed": true,
      "ttl_days": 14
    }
  },

  "vendors": {
    "meta": {
      "allowed": true,
      "data_classes": ["behavioral"]
    },
    "google": {
      "allowed": false
    }
  },

  "constraints": {
    "no_cross_site": true,
    "no_enrichment": true
  },

  "version": "1.0"
}
```

## Enforcement Rules

Simple by design. No OPA. No Rego.

```yaml
rules:
  - if token missing → block (or allow based on failure_mode)
  - if token invalid → block
  - if token expired → block
  - if vendor not allowed → block
  - if purpose not allowed → block
  - if data class violation → strip fields
  - if constraint violated → strip fields
  - else → allow
```

## Evidence Store

Append-only, hash-chained, tamper-evident logging.

**What it stores:**
- Consent issuance
- Consent revocation
- Every enforcement decision
- Data transformations
- Vendor access

**Properties:**
- Append-only (no updates, no deletes)
- Hash chaining: `hash(n) = SHA256(event(n) + hash(n-1))`
- Time-stamped (UTC)
- Queryable

**Storage Tiers:**
- Hot: last 30 days (fast queries)
- Warm: 1 year (operational)
- Cold: archive (audit only)

**This is NOT blockchain. This is security-grade logging.**

## UI Screens

Three screens only:

1. **Consent Policies** - Purposes, Vendors, TTLs
2. **Live Enforcement** - Allowed/Blocked/Modified per vendor
3. **Audit Export** - Time range, Vendor, Jurisdiction

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    CONTROL PLANE (This Service)                │
│  • Define consent policies        • Issue consent tokens       │
│  • Manage vendors & purposes      • Audit & reporting          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐         │
│   │   Token     │   │ Enforcement │   │  Evidence   │         │
│   │  Service    │   │   Engine    │   │   Store     │         │
│   │  (ES256)    │   │  (Rules)    │   │  (Append)   │         │
│   └─────────────┘   └─────────────┘   └─────────────┘         │
│                                                                 │
│   ┌─────────────────────────────────────────────────┐         │
│   │              Vendor Connectors                   │         │
│   │   Meta │ Google │ Generic DSP │ CDP             │         │
│   └─────────────────────────────────────────────────┘         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Scaling Characteristics

| Aspect | Details |
|--------|---------|
| Latency | Milliseconds (avg ~2ms) |
| Volume | Designed for millions of events/day |
| Architecture | Stateless, horizontally scalable |
| Failure Modes | Configurable fail-open or fail-closed |

## Configuration

Set via environment variables or headers:

| Variable | Description | Default |
|----------|-------------|---------|
| `X-Tenant-ID` | Tenant identifier | `demo-tenant` |
| `X-Idempotency-Key` | Prevent duplicate processing | None |

## Database

PostgreSQL-ready schema in `backend/database/schema.sql`.

For demo/development, uses in-memory storage.

## What This Is NOT

- Not a client-side cookie banner
- Not a "blockchain" solution
- Not a compliance checkbox tool

## What This IS

- Server-side enforcement that actually works
- Cryptographically verifiable audit trail
- Simple, auditor-friendly decision logic
- Modern ad stack compatible (server-side GTM, CDPs)

## License

MIT
