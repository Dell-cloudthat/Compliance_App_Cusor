# SecurityOS V1 Build Specification

**Date:** October 2, 2026  
**Status:** Active — this document drives all implementation work  
**Repo:** `Dell-cloudthat/Compliance_App_Cusor` → branch `cursor/securityos-platform-9659`

---

## 1. What SecurityOS Actually Is

SecurityOS is a **consumer-grade security readiness platform** for small businesses (1–25 employees). Target customers are dentists, therapists, CPAs, law firms, and other professional services firms who have data to protect but no dedicated security team.

The product shows:
1. A **Security Readiness Score** (0–100)
2. A plain-English list: "You have 4 things to fix"
3. Step-by-step fix instructions
4. A **Trust Passport** — shareable proof of security status

It does **not** show: compliance frameworks, control families, audit trails, or enterprise GRC language.

---

## 2. Technical Audit Findings

### 2.1 Repository Structure (as of audit date)

```
/workspace
├── apps/web/                    ← React/Vite frontend (SecurityOS V2 LIVE)
│   └── src/
│       ├── SecurityOSApp.jsx    ← LIVE: main app shell
│       ├── ComplianceMVP.jsx    ← DEAD: 19,949 lines, old product
│       ├── App.jsx              ← LIVE: thin wrapper → SecurityOSApp
│       ├── main.jsx             ← LIVE: entry point
│       ├── data/
│       │   ├── controls.js      ← LIVE: catalog loader + status constants
│       │   └── scoring.js       ← LIVE: confidence-weighted scoring
│       ├── views/securityos/    ← 11 files (7 LIVE, 4 DEAD V1)
│       ├── views/               ← 8 compliance views (ALL DEAD)
│       ├── services/            ← api.js, consentApi.js, consentFlowApi.js (ALL DEAD)
│       ├── frameworks/          ← 8 framework JS files (ALL DEAD)
│       └── components/consent/  ← ConsentBannerWidget (DEAD)
├── backend/                     ← FastAPI backend (SPLIT — old + new)
│   ├── main.py                  ← OLD: 6,204 lines, 247 routes, SQLite, 0 auth enforcement
│   ├── api/api.py               ← NEW: SecurityOS router (NOT MOUNTED in main.py)
│   ├── scoring/
│   │   ├── engine.py            ← NEW: correct confidence-weighted engine (LIVE architecture)
│   │   └── scoring_engine.py    ← OLD: simple binary, hardcoded catalog (DUPLICATE)
│   ├── controls/
│   │   └── controls_catalog.py  ← OLD: hardcoded Python dict (DUPLICATE of JSON catalog)
│   ├── evidence/pipeline.py     ← NEW: typed evidence pipeline (LIVE architecture)
│   ├── services/                ← 24 services, 16,583 lines (ALL OLD compliance platform)
│   └── database/                ← 7 SQLite schemas (ALL OLD compliance platform)
├── compliance/controls/
│   └── catalog.json             ← LIVE: 25 controls, single source of truth
├── consent-platform/            ← SEPARATE PRODUCT (PostgreSQL + real auth)
│   ├── backend/                 ← FastAPI, asyncpg, SQLAlchemy, Alembic, PyJWT
│   └── frontend/                ← Separate frontend
├── knowledge/                   ← Knowledge base directory (mostly empty)
└── infrastructure/              ← Infrastructure config (mostly empty)
```

### 2.2 Frontend Audit

| File | Lines | Status | Verdict |
|------|-------|--------|---------|
| `SecurityOSApp.jsx` | 157 | **LIVE** | Main shell, phase routing, AppContext |
| `views/securityos/OnboardingView.jsx` | — | **LIVE** | Business profile wizard |
| `views/securityos/AnalysisView.jsx` | — | **LIVE** | Animated loading between phases |
| `views/securityos/HomeView.jsx` | — | **LIVE** | Score ring + issue list |
| `views/securityos/FixView.jsx` | — | **LIVE** | Control detail + fix steps |
| `views/securityos/CopilotView.jsx` | — | **LIVE** | Rule-based chat (no LLM) |
| `views/securityos/PassportView.jsx` | — | **LIVE** | Trust Passport card |
| `views/securityos/SettingsView.jsx` | — | **LIVE** | Profile editor + data controls |
| `views/securityos/AICopilotView.jsx` | — | **DEAD (V1)** | Replaced by CopilotView |
| `views/securityos/ControlsView.jsx` | — | **DEAD (V1)** | Had sidebar nav, replaced |
| `views/securityos/DashboardView.jsx` | — | **DEAD (V1)** | Replaced by HomeView |
| `views/securityos/TrustPassportView.jsx` | — | **DEAD (V1)** | Replaced by PassportView |
| `ComplianceMVP.jsx` | 19,949 | **DEAD** | Entire old product |
| `views/ConsentDashboardView.jsx` | 931 | **DEAD** | Old consent platform UI |
| `views/ConsentFlowView.jsx` | 933 | **DEAD** | Old consent flow |
| `views/ConsentPreferenceCenterView.jsx` | 631 | **DEAD** | Old consent preferences |
| `views/ConsentSaaSAdminView.jsx` | 895 | **DEAD** | Old SaaS admin |
| `views/ClientIntakePortalView.jsx` | 1,047 | **DEAD** | Old client intake |
| `views/ConsultingPortalView.jsx` | 986 | **DEAD** | Old consulting |
| `views/DataFlowArchitectureView.jsx` | 1,654 | **DEAD** | Old data flow viz |
| `views/EnforcementProxyView.jsx` | 822 | **DEAD** | Old enforcement proxy |
| `services/api.js` | 1,500 | **DEAD** | Old compliance API client |
| `services/consentApi.js` | 304 | **DEAD** | Old consent API |
| `services/consentFlowApi.js` | 217 | **DEAD** | Old consent flow API |
| `frameworks/cis-controls.js` | 25 | **DEAD** | Framework data, not wired |
| `frameworks/fedramp-controls.js` | 163 | **DEAD** | Framework data, not wired |
| `frameworks/hipaa-controls.js` | 42 | **DEAD** | Framework data, not wired |
| `frameworks/iso27001-controls.js` | 106 | **DEAD** | Framework data, not wired |
| `frameworks/nist800171-controls.js` | 149 | **DEAD** | Framework data, not wired |
| `frameworks/nist80053-controls.js` | 123 | **DEAD** | Framework data, not wired |
| `frameworks/pci-dss-controls.js` | 87 | **DEAD** | Framework data, not wired |
| `frameworks/soc2-controls.js` | 62 | **DEAD** | Framework data, not wired |
| `data/controls.js` | 78 | **LIVE** | Catalog loader, status constants |
| `data/scoring.js` | 186 | **LIVE** | Confidence-weighted scoring |

**Dead frontend code removed by this spec: ~31,000 lines across 28 files.**

### 2.3 Backend Audit

#### `backend/main.py` (OLD compliance platform — 6,204 lines, 247 routes)
- **Database:** Raw `sqlite3` — no ORM, no PostgreSQL
- **Authentication:** `security = HTTPBearer()` is declared at line 110 but **never used in any `Depends()` call**. Every route is publicly accessible. No JWT validation.
- **AI:** Zero AI/LLM calls. `intelligence_service.py` (460 lines) is pure SQLite heuristic pattern matching labeled as "AI."
- **Routes:** All serve the old compliance platform: data segments, audits, IAM, consent, SaaS tenant management, workflows, reporting, cost tracking
- **SecurityOS routes:** Zero. None of the 247 routes serve SecurityOS.

#### `backend/api/api.py` (NEW SecurityOS router — 233 lines)
- Properly structured FastAPI router at `/api/v1/securityos/`
- Endpoints: controls catalog, profile CRUD, status updates, scoring, trust passport, copilot stub
- **Critical bug:** Imports `from .scoring_engine import calculate_score` — this imports the OLD `scoring_engine.py` (simple binary scoring, hardcoded catalog), NOT the new `engine.py` (confidence-weighted, reads from JSON)
- **Not mounted:** This router is never included in any running server. Zero requests have ever hit it.
- **In-memory store:** `_profiles` and `_control_statuses` are Python dicts — lost on restart

#### `backend/scoring/engine.py` (NEW — correct implementation)
- Reads from `compliance/controls/catalog.json`
- Confidence-weighted: automatic=1.0, manual=0.70, inferred=0.50, unknown=0.0
- UNKNOWN ≠ PASS (explicit zero contribution)
- Returns `ScoreResult` dataclass with full breakdown

#### `backend/scoring/scoring_engine.py` (OLD — incorrect duplicate)
- Imports from `backend/controls/controls_catalog.py` (hardcoded Python dict)
- Simple binary scoring (pass=1, fail=0) — no confidence weighting
- No evidence source concept

#### `backend/evidence/pipeline.py` (NEW — correct architecture)
- Typed data classes: `RawEvidence`, `NormalizedEvidence`, `ControlEvaluation`
- `IntegrationType` enum: M365, Google Workspace, AWS, Azure, Intune, Defender, Backup
- Integration-to-control mapping (stateless, correct design)
- **Not wired:** No integration connectors exist yet (correct — MVP is manual attestation)

#### `backend/services/` (ALL OLD — 16,583 lines)
All 24 services use `sqlite3.connect(str(DB_PATH))` directly. No ORM. No relationship to SecurityOS. They serve the old compliance platform backend.

### 2.4 Data Model Audit

#### Main Backend SQLite (`backend/database/schema.sql` + 6 others = 7 schemas)
- **Main schema (700 lines):** `users`, `data_sources`, `data_segments`, `controls`, `responsibility_matrix`, `api_integrations`, `reports`, `cost_tracking`, `data_flow_nodes`, `audit_engagements`, `audit_findings`, `audit_evidence`, `certifications`, `user_roles`, `compliance_alerts`
- **Consent schema:** `consent_organizations`, `consent_purposes`, `consent_subjects`, `consent_records`, `consent_banners`, `consent_dsar_requests`
- **Client intake schema:** `client_organizations`, `intake_documents`, `questionnaires`, API sync tables
- **Consulting schema:** `consulting_engagements`, `gap_analysis`, `client_roadmaps`, `budget_plans`, `report_templates`
- **IAM schema:** `user_login_sessions`, `auto_mapped_permissions`
- **Learning schema:** `learned_remediation_patterns`, `auto_generated_playbooks`, `pattern_correlations`
- **Total:** ~57 tables across 7 schema files
- **Status:** All OLD compliance platform. None used by SecurityOS.

#### SecurityOS Data (current — no persistent DB)
- **Frontend:** `localStorage` key `securityos_v2` → `{ profile, statuses }` — per-browser, no server sync
- **Backend router:** `_profiles: Dict[str, Dict]`, `_control_statuses: Dict[str, Dict]` — in-memory Python dicts, ephemeral
- **What's needed:** PostgreSQL tables for `organizations`, `control_statuses`, `integrations`, `evidence_records`

#### Consent Platform PostgreSQL (`consent-platform/backend/database/schema.sql`)
- 8 tables: `tenants`, `purposes`, `vendors`, `consent_tokens`, `enforcement_decisions`, `evidence_log`, `policies`, `api_keys`
- Uses ES256 keypairs per tenant, token hashing, full audit trail
- Properly designed for its purpose — no changes needed

### 2.5 Authentication Audit

| Component | Auth Mechanism | Enforced? | Verdict |
|-----------|---------------|-----------|---------|
| `backend/main.py` | `HTTPBearer` declared, never used in `Depends()` | **NO** | Critical gap — all 247 routes public |
| `backend/api/api.py` | No auth at all | **NO** | Acceptable for MVP (localStorage state) |
| `consent-platform/backend/` | API key (`X-API-Key` header) with scope-based authorization, rate limiting | **YES** | Production-grade |
| Frontend | No auth — localStorage only | N/A | Acceptable for MVP |

**Security gaps:**
1. `backend/main.py` — no route requires authentication despite importing `HTTPBearer`
2. API keys in `backend/main.py` stored without hashing (unlike consent-platform which hashes them)
3. No rate limiting in main backend
4. CORS locked to localhost — acceptable for dev, breaks production

### 2.6 AI/RAG Audit

**Finding: There is no AI implementation anywhere in this codebase.**

| File | Claimed | Actual |
|------|---------|--------|
| `backend/services/intelligence_service.py` | "AI-powered intelligence" | SQLite heuristic pattern matching |
| `backend/api/api.py` copilot endpoint | "AI Copilot" | Returns context dict + note: "Connect to your preferred LLM provider" |
| `apps/web/src/views/securityos/CopilotView.jsx` | "AI Security Copilot" | Client-side rule-based responses (if/else on message keywords) |

The copilot in `CopilotView.jsx` is actually quite good as a rule-based system — it handles MFA, HIPAA, insurance, incidents, breach response, and sharing scenarios with contextual responses. It uses the user's actual score, issues list, and business profile. It just isn't LLM-powered.

**What's needed for real AI:** An OpenAI/Anthropic API call from the copilot endpoint with the control catalog + business profile + current score as context (RAG-lite).

---

## 3. Build Specification

### 3.1 KEEP — No Changes Required

| Item | Why |
|------|-----|
| `compliance/controls/catalog.json` | Perfect. 25 controls, structured JSON, framework mappings, evidence requirements |
| `apps/web/src/data/controls.js` | Clean catalog loader with correct constants |
| `apps/web/src/data/scoring.js` | Confidence-weighted scoring, UNKNOWN≠PASS, correct |
| `apps/web/src/SecurityOSApp.jsx` | Main app shell, AppContext, localStorage persistence |
| `apps/web/src/views/securityos/OnboardingView.jsx` | Business profile wizard |
| `apps/web/src/views/securityos/AnalysisView.jsx` | Loading animation between phases |
| `apps/web/src/views/securityos/HomeView.jsx` | Score ring + plain issue list |
| `apps/web/src/views/securityos/FixView.jsx` | Control detail + fix steps |
| `apps/web/src/views/securityos/CopilotView.jsx` | Good rule-based copilot, upgrade to LLM later |
| `apps/web/src/views/securityos/PassportView.jsx` | Trust Passport card + share |
| `apps/web/src/views/securityos/SettingsView.jsx` | Profile editor + data controls |
| `backend/scoring/engine.py` | Correct confidence-weighted scoring engine |
| `backend/evidence/pipeline.py` | Correct typed evidence pipeline architecture |
| `consent-platform/` | Separate product — keep, deploy separately |

### 3.2 MODIFY — Changes Required

| Item | Change |
|------|--------|
| `backend/api/api.py` | Fix import: use `engine.py` not `scoring_engine.py` |
| `apps/web/package.json` | Rename `name` field from `compliance-app` to `securityos-web` |
| `apps/web/src/views/securityos/CopilotView.jsx` | (Future) Add real LLM API call; current rule-based is acceptable for MVP |

### 3.3 DELETE — Remove These Files

**Frontend dead code (~31,000 lines):**
- `apps/web/src/ComplianceMVP.jsx` (19,949 lines)
- `apps/web/src/views/ConsentDashboardView.jsx`
- `apps/web/src/views/ConsentFlowView.jsx`
- `apps/web/src/views/ConsentPreferenceCenterView.jsx`
- `apps/web/src/views/ConsentSaaSAdminView.jsx`
- `apps/web/src/views/ClientIntakePortalView.jsx`
- `apps/web/src/views/ConsultingPortalView.jsx`
- `apps/web/src/views/DataFlowArchitectureView.jsx`
- `apps/web/src/views/EnforcementProxyView.jsx`
- `apps/web/src/services/api.js`
- `apps/web/src/services/consentApi.js`
- `apps/web/src/services/consentFlowApi.js`
- `apps/web/src/components/consent/ConsentBannerWidget.jsx`
- `apps/web/src/frameworks/cis-controls.js`
- `apps/web/src/frameworks/fedramp-controls.js`
- `apps/web/src/frameworks/hipaa-controls.js`
- `apps/web/src/frameworks/iso27001-controls.js`
- `apps/web/src/frameworks/nist800171-controls.js`
- `apps/web/src/frameworks/nist80053-controls.js`
- `apps/web/src/frameworks/pci-dss-controls.js`
- `apps/web/src/frameworks/soc2-controls.js`
- `apps/web/src/views/securityos/AICopilotView.jsx` (V1)
- `apps/web/src/views/securityos/ControlsView.jsx` (V1)
- `apps/web/src/views/securityos/DashboardView.jsx` (V1)
- `apps/web/src/views/securityos/TrustPassportView.jsx` (V1)

**Backend duplicate/dead code:**
- `backend/scoring/scoring_engine.py` (OLD — replaced by engine.py)
- `backend/controls/controls_catalog.py` (OLD — replaced by catalog.json)

**Old compliance platform backend (do NOT delete yet — freeze it):**
- `backend/main.py` — 6,204 lines, 247 routes. Archive, not delete. The old product may still be in use.
- `backend/services/*.py` — 24 services, 16,583 lines. Archive, not delete.
- `backend/database/*.sql` — 7 schemas. Archive, not delete.

### 3.4 BUILD NEXT — Implementation Sequence

This is the exact order of implementation. Each item unblocks the next.

---

#### STEP 1: SecurityOS Backend Server (1–2 days, critical path)

Create `backend/securityos_main.py` — a standalone FastAPI app that:
- Mounts `backend/api/api.py` router
- Uses `backend/scoring/engine.py` (the correct engine)
- Has PostgreSQL persistence (replace in-memory dicts)
- Has basic JWT auth for user sessions
- Has CORS configured for production

**Tables needed (PostgreSQL):**
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    industry TEXT,
    employee_count TEXT,
    email_provider TEXT,
    cloud_providers JSONB DEFAULT '[]',
    sensitive_data JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE control_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    control_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    evidence_source TEXT NOT NULL DEFAULT 'none',
    notes TEXT,
    last_checked TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, control_id)
);
```

**Run separately from old `backend/main.py`:**
```bash
uvicorn backend.securityos_main:app --port 8001
# Old platform on 8000, SecurityOS on 8001
```

---

#### STEP 2: Frontend → Backend Connection (1 day)

Connect the frontend to the real backend:
- Add `VITE_SECURITYOS_API_URL` env var (defaults to `http://localhost:8001`)
- Create `apps/web/src/services/securityosApi.js` — typed API client
- Replace `localStorage` persistence with API calls (keep localStorage as cache/offline fallback)
- Generate a persistent `org_id` (UUID) on first launch, store in localStorage

**API calls to add:**
- On onboarding complete → `POST /api/v1/securityos/organizations/{org_id}/profile`
- On control status change → `PATCH /api/v1/securityos/organizations/{org_id}/statuses`
- On score view → `GET /api/v1/securityos/organizations/{org_id}/score`

---

#### STEP 3: Microsoft 365 Integration (3–5 days, highest ROI)

Connect the evidence pipeline to real data. M365 covers 40% of target customers.

**What to verify automatically:**
- MFA status for all users (`/users` + `/reports/authenticationMethods/userRegistrationDetails`)
- Secure Score (`/security/secureScores`)
- Audit log enabled (`/auditLogs`)
- Conditional Access policies

**Implementation:**
- `backend/integrations/m365.py` — Microsoft Graph API client
- OAuth2 flow for admin consent (app-level permissions)
- Stores token in `integrations` table
- Runs evidence collection → `backend/evidence/pipeline.py` → updates `control_statuses` with `evidence_source='automatic'`

---

#### STEP 4: Real AI Copilot (2–3 days)

Replace the rule-based `respond()` function in `CopilotView.jsx` with an actual LLM call.

**Architecture:**
- Frontend sends: `{ message, score, issues, profile, history }` to `/api/v1/securityos/copilot`
- Backend builds system prompt: control catalog + business profile + current score + top issues
- Calls OpenAI `gpt-4o` or Anthropic `claude-3-5-sonnet` with streaming
- Returns streamed response to frontend

**System prompt structure:**
```
You are a security advisor for small businesses.
Business: {name}, Industry: {industry}, Employees: {count}
Current score: {score}/100 ({grade})
Open issues: {issues_list}
Controls catalog: {relevant_controls}
Respond in plain English. No jargon.
```

**Keep the rule-based responses as fallback** if API key is not configured.

---

#### STEP 5: Google Workspace Integration (2–3 days)

Second-largest identity provider for target customers. Mirrors M365 implementation.

**What to verify automatically:**
- 2-Step Verification enrollment (`/admin/reports/v1/activity/usage/gplus/users`)
- Admin accounts inventory
- Audit log enabled (`/admin/reports/v1/activity`)

---

#### STEP 6: Trust Passport Shareable URL (2 days)

Allow businesses to generate a public URL showing their Trust Passport.

**Implementation:**
- `POST /api/v1/securityos/organizations/{org_id}/passport/publish` → returns `share_token`
- `GET /passport/{share_token}` → public read-only passport view
- Store `share_token` in `organizations` table with `passport_published_at`

---

#### STEP 7: User Authentication (2 days)

Required before charging customers. Currently zero auth.

**Simple approach for MVP:**
- Magic link email authentication (no passwords)
- JWT with 30-day expiry
- Associate `org_id` with authenticated user
- Use `python-jose` or `PyJWT`

---

## 4. Scoring Model Reference

**Formula:** `Score = Σ(risk_weight × evidence_confidence) / Σ(max_weight) × 100`

| Confidence Level | Value | When Applied |
|-----------------|-------|-------------|
| Automatic | 1.0 | Integration API verified this control |
| Manual | 0.70 | Customer self-attested |
| Inferred | 0.50 | Inferred from other signals |
| Unknown/None | 0.0 | Not verified — contributes 0 points |

**Critical rule:** UNKNOWN ≠ PASS. An unverified control contributes exactly 0 points, not the full weight. This prevents inflated scores from unverified claims.

**Risk weights by severity:**
- Critical: 1.0
- High: 0.75
- Medium: 0.50
- Low: 0.25

**Category structure:** 5 categories × max 20 pts = 100 total

---

## 5. Control Catalog Reference

25 controls across 5 categories. All defined in `compliance/controls/catalog.json`.

| ID | Category | Severity | Name |
|----|----------|----------|------|
| CTRL-ID-001 | Identity | Critical | Multi-Factor Authentication |
| CTRL-ID-002 | Identity | Critical | Privileged Account Protection |
| CTRL-ID-003 | Identity | High | User Access Review |
| CTRL-ID-004 | Identity | High | Password Policy |
| CTRL-ID-005 | Identity | Medium | Account Termination Process |
| CTRL-DEV-001 | Devices | Critical | Device Encryption |
| CTRL-DEV-002 | Devices | High | Software Updates & Patching |
| CTRL-DEV-003 | Devices | High | Endpoint Protection |
| CTRL-DEV-004 | Devices | Medium | Screen Lock Policy |
| CTRL-DEV-005 | Devices | Medium | Device Inventory |
| CTRL-DATA-001 | Data | High | Data Inventory |
| CTRL-DATA-002 | Data | Medium | Data Classification |
| CTRL-DATA-003 | Data | Critical | Backup Strategy |
| CTRL-DATA-004 | Data | High | Backup Verification |
| CTRL-DATA-005 | Data | High | Data Encryption at Rest |
| CTRL-NET-001 | Cloud/Network | High | Secure Configuration Baseline |
| CTRL-NET-002 | Cloud/Network | Medium | Security Logging |
| CTRL-NET-003 | Cloud/Network | High | External Exposure Management |
| CTRL-NET-004 | Cloud/Network | Critical | Administrative Access Control |
| CTRL-NET-005 | Cloud/Network | High | Cloud Security Configuration |
| CTRL-ORG-001 | Organization | High | Security Policy |
| CTRL-ORG-002 | Organization | High | Incident Response Plan |
| CTRL-ORG-003 | Organization | High | Employee Security Training |
| CTRL-ORG-004 | Organization | Medium | Vendor Security Assessment |
| CTRL-ORG-005 | Organization | Medium | Annual Security Review |

---

## 6. What's Functional Today vs. What Isn't

### Functional (ships today)
- ✅ Business profile onboarding (5-step wizard)
- ✅ 25-control catalog (JSON-driven, not hardcoded)
- ✅ Security Readiness Score (confidence-weighted)
- ✅ Issue list ("You have N things to fix")
- ✅ Fix instructions per control (step-by-step)
- ✅ AI Copilot (rule-based, good coverage of key questions)
- ✅ Trust Passport (shareable card, copy to clipboard)
- ✅ Settings (profile editing, data reset)
- ✅ HIPAA / PCI / CMMC detection from profile
- ✅ Industry-specific control applicability filtering
- ✅ localStorage persistence across sessions

### Not Functional (needs BUILD NEXT)
- ❌ Backend server for SecurityOS (router exists but not mounted)
- ❌ Persistent database (all state is local/in-memory)
- ❌ Real integrations (M365, Google Workspace, AWS)
- ❌ Automatic evidence collection (manual only)
- ❌ Real LLM copilot (rule-based responses)
- ❌ User authentication
- ❌ Trust Passport shareable URL
- ❌ Email notifications
- ❌ Multi-device sync

---

## 7. Immediate Actions (This PR)

1. **Write this spec** ← done
2. **Delete dead frontend code** — remove 28 files, ~31,000 lines
3. **Fix `backend/api/api.py`** — import correct scoring engine
4. **Create `backend/securityos_main.py`** — mount the SecurityOS router, add PostgreSQL persistence
5. **Delete backend duplicates** — `scoring_engine.py`, `controls_catalog.py`
6. **Update `package.json`** name

---

## 8. Deferred (Separate PRs)

- M365 integration
- Google Workspace integration
- Real LLM copilot
- User auth (magic link)
- Trust Passport shareable URL
- PostgreSQL schema migration with Alembic
