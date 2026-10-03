# SecurityOS

> Continuously checks your business's security, tells you what needs fixing, and automatically builds the evidence you need to prove you're protected.

Built for small businesses (1–25 employees) that handle sensitive customer information: dental practices, law firms, CPAs, therapists, financial advisors, and other professional services businesses.

---

## Design Principles

**The backend can be sophisticated. The customer experience must be ridiculously simple.**

```
Customer opens the app

  How secure is your business?

  → Tell us about your business
  → SecurityOS analyzes you
  → Security Readiness: 76

  You have 4 things to fix.

  🔴 MFA            One employee not protected    [Fix it →]
  🟡 Backups         Verification overdue          [Fix it →]
  🟡 Security Training  4 employees untrained      [Fix it →]
  🟢 Encryption       All devices encrypted        [Review →]

  That's it.
```

The complexity lives underneath.

---

## Repository Structure

```
Mobile_GRC_AI/
│
├── apps/
│   └── web/              # React/Vite frontend (runs npm run dev here)
│       └── src/
│           ├── data/     # controls.js, scoring.js
│           └── views/securityos/
│               ├── AnalysisView.jsx   # "Analyzing your business..." loading
│               ├── HomeView.jsx       # Score + issue list (main screen)
│               ├── FixView.jsx        # Control detail + remediation steps
│               ├── CopilotView.jsx    # AI chat
│               ├── PassportView.jsx   # Trust Passport
│               └── SettingsView.jsx
│
├── backend/
│   ├── api/              # FastAPI route handlers
│   ├── auth/             # Authentication (Entra External ID / Auth0)
│   ├── organizations/    # Business profile management
│   ├── controls/         # Control catalog service
│   ├── scoring/          # engine.py — confidence-weighted score calculation
│   ├── evidence/         # pipeline.py — Raw → Normalized → ControlEvaluation
│   ├── integrations/     # M365, Google Workspace, AWS connectors (v2)
│   ├── remediation/      # Guided fix workflows
│   ├── reports/          # Annual report, audit package generation
│   └── ai/               # LLM + RAG copilot
│
├── compliance/
│   ├── controls/
│   │   └── catalog.json  # 25 controls as structured objects (THE source of truth)
│   ├── frameworks/       # Framework definitions
│   └── mappings/         # Cross-framework mapping tables
│
├── knowledge/
│   ├── nist/             # NIST CSF 2.0 reference
│   ├── cis/              # CIS Controls v8 reference
│   ├── hipaa/            # HIPAA Security Rule reference
│   └── pci/              # PCI DSS reference
│
├── infrastructure/       # IaC (Terraform / Bicep)
└── docs/
```

---

## The 25 Controls

Controls are **data objects**, not hard-coded features. Each control has:

```json
{
  "id": "CTRL-ID-001",
  "category": "identity",
  "name": "Multi-Factor Authentication",
  "short_name": "MFA",
  "severity": "critical",
  "risk_weight": 1.0,
  "applicable_industries": [],
  "evidence_requirements": [...],
  "verification_methods": [...],
  "framework_mappings": {
    "nist_csf_2": ["PR.AA-02"],
    "cis_v8": ["5.2"],
    "hipaa": ["164.312(d)"],
    "cyber_insurance": ["mfa_required"]
  },
  "customer_message": {
    "fail": "MFA is not enabled for all users",
    "unknown": "MFA status not verified"
  }
}
```

The product dynamically determines which controls apply to which business type — so a dental practice gets HIPAA controls automatically without needing to know what HIPAA is.

---

## Scoring Model

**Score = Σ(risk_weight × evidence_confidence) across passing controls, normalized to 100**

| Status | Points |
|---|---|
| PASS (auto-verified via integration) | `risk_weight × 1.0` |
| PASS (manually confirmed) | `risk_weight × 0.7` |
| FAIL | 0 |
| UNKNOWN | 0 |
| IN_PROGRESS | 0 |

This means: **unknown ≠ passing**. A business that hasn't verified 40% of its controls gets a lower score that reflects reality, not a falsely inflated number.

The score also reports verification coverage:
> "Score: 87/100 based on 72% verified controls — connect integrations for full accuracy"

### Score Categories (max 100)

| Category | Max | Controls |
|---|---|---|
| Identity | 20 | MFA, admin accounts, access review, password policy, offboarding |
| Devices | 20 | Encryption, updates, endpoint protection, screen lock, inventory |
| Data | 20 | Data inventory, classification, backups, backup verification, encryption |
| Cloud & Network | 20 | Secure config, logging, attack surface, admin access, cloud security |
| Organization | 20 | Security policy, incident response, training, vendor assessment, annual review |

---

## Evidence Pipeline

```
Microsoft 365
      │
      ▼
Raw Evidence (API response, verbatim)
      │
      ▼
Normalized Evidence (typed: True/False, count, days)
      │
      ▼
Control Evaluation (PASS / FAIL / UNKNOWN + confidence)
      │
      ▼
Security Score (weighted aggregate)
```

Example:
```
M365 Graph API → User: john@company.com, MFA: disabled
      ↓
NormalizedEvidence(check=MFA_ENABLED_ALL_USERS, value=False, detail="3 of 12 users missing MFA")
      ↓
ControlEvaluation(CTRL-ID-001, status=FAIL, confidence=1.0, detail="3 users not protected")
      ↓
Identity score decreases → Customer notification
```

---

## Integrations (Prioritized)

| Phase | Integration | Controls Verified |
|---|---|---|
| MVP | Manual attestation | All 25 (70% confidence) |
| V2 | Microsoft 365 (Graph API) | MFA, users, admin accounts, secure score, audit logs |
| V2 | Google Workspace (Admin SDK) | MFA, users, 2SV settings |
| V3 | AWS / Azure | Cloud config, logging, backup |
| V3 | Microsoft Intune | Device encryption, patching, screen lock, EDR |

---

## Getting Started

### Frontend (web app)

```bash
cd apps/web
npm install
npm run dev
# Open http://localhost:5173
```

### Deploy (Vercel)

- **Recommended Vercel Project Root**: `apps/web`
- **Install Command**: `npm ci`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

This repo includes `apps/web/vercel.json` so Vercel can auto-detect the correct Vite settings when the project root is set to `apps/web`.

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn api.securityos_router:router --reload
```

---

## Framework Coverage (hidden from customers)

Customers see **Security Readiness**. The system maps underneath to:

- **NIST CSF 2.0** — primary structure (Govern, Identify, Protect, Detect, Respond, Recover)
- **CIS Controls v8** — prioritized implementation guidance
- **HIPAA Security Rule** — triggered by PHI selection in business profile
- **PCI DSS** — triggered by payment card data selection
- **FTC Safeguards Rule** — applied to financial services
- **Cyber Insurance Baselines** — Coalition, Cowbell, At-Bay requirements

Customer says: "I run a dental office."
System determines: Medical → apply HIPAA controls, weight PHI-related controls higher.
Customer sees: Security Readiness score with plain-English issues.

---

*SecurityOS — Security that works for your business.*
