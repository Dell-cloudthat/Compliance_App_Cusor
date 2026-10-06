# SecurityOS Repository Audit
**Date:** October 2026 | **Branch:** `cursor/securityos-architecture-9659`

---

## Target Architecture

```
Mobile (decision layer)
  → Web (operations layer)
    → Backend (security intelligence)
      → Integrations (evidence)
        → Control Engine (source of truth)
          → AI Copilot
            → TCO (business value)
              → MSP (distribution)
                → MCP (AI interface)
```

---

## KEEP — Working, production-quality, build on these

| File | Lines | What it is | Status |
|---|---|---|---|
| `compliance/controls/catalog.json` | 986 | 31-control catalog (25 core + 6 AI RMF). Single source of truth for both frontend and backend. | ✅ Production-ready |
| `backend/securityos_main.py` | 99 | FastAPI entry point for SecurityOS only. Clean CORS, startup hooks, health endpoint. | ✅ Production-ready |
| `backend/api/api.py` | 274 | REST router: controls, org profile, statuses, score, passport, copilot stub. In-memory store with DB swap path. | ✅ Keep, minor fix needed |
| `backend/scoring/engine.py` | 325 | Confidence-weighted scoring: auto (1.0) / manual (0.7) / none (0.0). Evidence-aware. Transparent. | ✅ Production-ready |
| `backend/evidence/pipeline.py` | 241 | Evidence types (M365, Google, AWS, Intune, Defender). Normalized evidence → ControlEvaluation. CONTROL_EVIDENCE_MAP maps checks to control IDs. | ✅ Solid architecture |
| `apps/web/src/SecurityOSApp.jsx` | 296 | React app shell. Multi-tenant state, AppContext, framework filter, copilot deep-link, nav. | ✅ Working |
| `apps/web/src/data/scoring.js` | 186 | JS mirror of Python scoring engine. Identical confidence logic. Runs fully client-side. | ✅ Keep, minor fix needed |
| `apps/web/src/data/controls.js` | 108 | Control catalog loader, STATUS constants, FRAMEWORK_OPTIONS, filterControlsByFramework(). | ✅ Working |
| `apps/web/src/data/copilot.js` | 500 | Shared AI copilot engine. respond() + respondForControl() + SUGGESTED_BY_CATEGORY. AI RMF playbooks included. | ✅ Working |
| `apps/web/src/data/risk.js` | 363 | TCO engine: breach cost (IBM/Ponemon), remediation cost per control, insurance impact, 3-year TCO. | ✅ Working |
| `apps/web/src/views/securityos/` | ~1200 | 12 views: Home, Fix, Copilot, Passport, Risk, Settings, Global, Onboarding, Analysis. All building cleanly. | ✅ Working |

---

## MODIFY — Correct architecture, need targeted fixes

| File | Issue | Fix |
|---|---|---|
| `backend/api/api.py` | `VALID_CATEGORIES` set doesn't include `ai_rmf` — filtering will 400 on AI RMF controls | Add `"ai_rmf"` to VALID_CATEGORIES |
| `backend/scoring/engine.py` | `CATEGORY_META` missing `ai_rmf` — AI RMF controls fall into no category bucket | Add `ai_rmf` entry with `label` and `max_score: 0` (bonus, doesn't dilute 100-pt scale) |
| `apps/web/src/data/scoring.js` | `buildDemoStatuses()` has no entries for CTRL-AI-001 through CTRL-AI-006 — all show as UNKNOWN on first load | Add 6 AI RMF entries (mix of fail/unknown) |
| `backend/evidence/pipeline.py` | `MANUAL_ONLY_CONTROLS` set doesn't include AI RMF control IDs | Add CTRL-AI-001 through CTRL-AI-006 |

---

## DEPRECATE — Wrong product, do not build on

These files belong to the old consent management / consulting platform. They are not called by `securityos_main.py`. Leave in place (git history), but treat as dead code.

| File | Lines | Why deprecated |
|---|---|---|
| `backend/main.py` | ~840 | Old compliance platform entry point. Imports 20+ consent/consulting services. Not SecurityOS. |
| `backend/services/consent_service.py` | 1,085 | GDPR consent token management — consent platform, not GRC |
| `backend/services/consent_flow_service.py` | 1,042 | Consent transaction flow — consent platform |
| `backend/services/consent_token_service.py` | 567 | JWT consent tokens — consent platform |
| `backend/services/enforcement_proxy.py` | 920 | Consent enforcement proxy — consent platform |
| `backend/services/policy_engine.py` | 810 | Data policy engine — consent platform |
| `backend/services/workflow_service.py` | 848 | Audit workflow management — old platform |
| `backend/services/alert_service.py` | 802 | Old alert/notification system |
| `backend/services/learning_service.py` | 789 | ML pattern learning — old platform |
| `backend/services/client_intake_service.py` | 1,527 | Consulting client intake — wrong product |
| `backend/services/consulting_service.py` | 1,450 | Consulting project management — wrong product |
| `backend/services/tenant_service.py` | 604 | Consent platform tenant/plan model (token limits, not GRC controls) |
| `backend/services/data_flow_service.py` | 600 | Data lineage graph — old platform |
| `backend/services/report_generation_service.py` | 693 | Old compliance report generation |
| `backend/services/csca_engine.py` | 295 | CSCA (old internal framework) |
| `backend/database/consent_schema.sql` | — | Consent platform DB — wrong product |
| `backend/database/consent_flow_schema.sql` | — | Consent platform DB |
| `backend/database/consulting_schema.sql` | — | Consulting DB |
| `backend/database/learning_schema.sql` | — | ML learning DB |
| `backend/database/client_intake_schema.sql` | — | Client intake DB |
| `consent-platform/` | ~4,000 | Entirely separate product. Not part of SecurityOS. |

**Total deprecated lines: ~13,400** — none of this is called by `securityos_main.py`.

---

## BUILD — Phase 1

Phase 1 establishes the data model, tier system, and MSP distribution layer without breaking anything.

### Phase 1 Deliverables

| File | What | Why |
|---|---|---|
| `backend/database/securityos_schema.sql` | Clean PostgreSQL schema: `organizations`, `organization_users`, `control_statuses`, `integration_connections`, `evidence_records`, `api_keys` | Foundation for all persistence — replaces in-memory dicts |
| `backend/api/tiers.py` | Solo / Starter / Professional / MSP tier definitions + `GET /tiers` + `GET /tiers/{tier}` entitlements endpoint | Tier system the mobile, web, and MSP portal all reference |
| `backend/api/msp.py` | MSP org management: create/list managed orgs, per-org score, aggregate dashboard | Distribution layer — MSPs managing N client orgs |
| Fixes to `api.py`, `engine.py`, `scoring.js`, `pipeline.py` | ai_rmf category support | AI RMF controls now first-class in scoring and API |

### Phase 2 (next)
- M365 OAuth connection + Graph API evidence collection
- Google Workspace OAuth + Admin SDK evidence
- Real PostgreSQL persistence (swap in-memory dicts for DB calls)
- MCP interface for AI agent access
- Web operations layer (admin dashboard for MSPs)

### Phase 3 (after)
- Full RAG copilot (OpenAI/Anthropic) over control catalog + org evidence
- White-label for MSPs
- Automated evidence scheduling (cron jobs per integration)
- Compliance report generation (PDF/HTML)

---

## Architecture Decisions

### Why in-memory store still OK for now
`api.py` uses `_profiles` and `_control_statuses` dicts. This is intentional for MVP — the schema exists, the swap is one function per endpoint. Don't pre-optimize.

### Why scoring runs both client-side and server-side
Frontend scoring runs on locally-stored state for instant mobile response (no API latency). Backend scoring runs on server-stored state for MSP dashboard and API consumers. Both use identical logic from the same catalog.

### Why the control catalog is JSON, not a database table
Controls are code, not data. They change with framework updates (NIST AI RMF, CIS v9), not with user actions. Static JSON loaded at startup by both frontend (Vite import) and backend (pathlib). Single source of truth.
