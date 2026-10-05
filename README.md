# SecurityOS

> Continuously checks your business's security, tells you what needs fixing, and automatically builds the evidence you need to prove you're protected.

SecurityOS is a security readiness platform built for small businesses (1–25 employees) — the dentists, therapists, CPAs, law firms, realtors, and consultants who are too sophisticated to ignore cybersecurity but too small to hire a security team.

---

## The Problem It Solves

Today, a small business owner trying to understand their security faces:

```
Business Owner → Google → NIST → FTC → Cyber insurance questionnaire
  → Customer security questionnaire → IT provider → Consultant → Spreadsheet → Confusion
```

SecurityOS changes it to:

```
Business Owner → SecurityOS → "Here are your 4 problems." → "Here's how to fix them."
  → "Here's the evidence." → "You're done."
```

---

## Five Layers

| Layer | Description |
|---|---|
| **1. Business Profile** | Industry, employees, cloud providers, data types, regulatory exposure |
| **2. Control Engine** | 25 normalized controls mapped to NIST CSF 2.0, CIS Controls, HIPAA, PCI DSS, Cyber Insurance |
| **3. Evidence Engine** | Connect to Microsoft 365, Google Workspace, AWS for automatic verification |
| **4. AI Security Copilot** | Plain-language answers, guided remediation, context-aware advice |
| **5. Trust Passport** | Shareable security certificate for clients, vendors, and insurers |

---

## Security Readiness Score

Not "73% NIST compliant" — just a clear score out of 100 across 5 categories:

| Category | Max | Controls |
|---|---|---|
| Identity | 20 | MFA, admin accounts, access review, passwords, offboarding |
| Devices | 20 | Encryption, updates, endpoint protection, screen lock, inventory |
| Data | 20 | Data inventory, classification, backups, backup verification, encryption |
| Cloud & Network | 20 | Secure config, logging, attack surface, admin access, cloud security |
| Organization | 20 | Security policy, incident response, training, vendors, annual review |

---

## Tech Stack

### Frontend
- **React 18** + Vite
- **Tailwind CSS** — utility-first styling
- **Lucide React** — icons
- State persisted in `localStorage` (MVP), designed for API integration

### Backend
- **FastAPI** — Python REST API
- **PostgreSQL** — primary database (schema in `backend/securityos/`)
- **LLM integration** — AI Copilot connects to any LLM provider

### Architecture

```
Mobile App (React Native/Expo — roadmap)
        │
Web App (React/Vite — current)
        │
    API Gateway
        │
    FastAPI API
   ┌────┴────┐
Control   Evidence
Engine    Engine
   └────┬────┘
      AI Layer
   ┌────┴────┐
  RAG      Agents
        │
  Integrations (M365, Google, AWS)
```

---

## Getting Started

### Frontend

```bash
npm install
npm run dev
# Open http://localhost:5173
```

### Backend

```bash
cd backend
pip install -r requirements.txt
# SecurityOS standalone API:
uvicorn securityos.api:router --reload
# Or with the full platform:
python main.py
```

---

## 25 Controls

### Identity
- `CTRL-ID-001` MFA Required *(Critical)*
- `CTRL-ID-002` Privileged Account Protection *(Critical)*
- `CTRL-ID-003` User Access Review *(High)*
- `CTRL-ID-004` Password Policy *(High)*
- `CTRL-ID-005` Account Termination Process *(Medium)*

### Devices
- `CTRL-DEV-001` Device Encryption *(Critical)*
- `CTRL-DEV-002` Software Updates & Patching *(High)*
- `CTRL-DEV-003` Endpoint Protection *(High)*
- `CTRL-DEV-004` Screen Lock Policy *(Medium)*
- `CTRL-DEV-005` Device Inventory *(Medium)*

### Data
- `CTRL-DATA-001` Data Inventory *(High)*
- `CTRL-DATA-002` Data Classification *(Medium)*
- `CTRL-DATA-003` Backup Strategy *(Critical)*
- `CTRL-DATA-004` Backup Verification *(High)*
- `CTRL-DATA-005` Data Encryption at Rest *(High)*

### Cloud & Network
- `CTRL-NET-001` Secure Configuration Baseline *(High)*
- `CTRL-NET-002` Security Logging *(Medium)*
- `CTRL-NET-003` External Exposure Management *(High)*
- `CTRL-NET-004` Administrative Access Control *(Critical)*
- `CTRL-NET-005` Cloud Security Configuration *(High)*

### Organization
- `CTRL-ORG-001` Security Policy *(High)*
- `CTRL-ORG-002` Incident Response Plan *(High)*
- `CTRL-ORG-003` Employee Security Training *(High)*
- `CTRL-ORG-004` Vendor Security Assessment *(Medium)*
- `CTRL-ORG-005` Annual Security Review *(Medium)*

---

## Framework Mappings (under the hood)

Customers see **Security Readiness**. Under the hood, every control maps to:

- **NIST CSF 2.0** — Primary framework (Govern, Identify, Protect, Detect, Respond, Recover)
- **CIS Controls v8** — Prioritized security actions
- **HIPAA Security Rule** — For healthcare and health data handlers
- **PCI DSS** — For payment card data handlers
- **FTC Safeguards Rule** — For financial services
- **Cyber Insurance baselines** — What carriers actually require

---

## Roadmap

### V1 (current)
- [x] Business Profile onboarding
- [x] 25-control catalog
- [x] Security Readiness Score (5 categories)
- [x] Step-by-step fix guides
- [x] AI Copilot (local, context-aware)
- [x] Trust Passport

### V2
- [ ] Microsoft 365 integration (auto-check MFA, users, config)
- [ ] Google Workspace integration
- [ ] AWS/Azure integration
- [ ] Real-time evidence collection
- [ ] Push notifications for score changes

### V3
- [ ] React Native mobile app
- [ ] Policy generator (auto-create security policies)
- [ ] Cyber insurance application pre-fill
- [ ] Team management / multi-user
- [ ] Annual security report generation

---

## Target Customer

Small businesses (1–25 employees) handling sensitive customer information:

- Medical and dental practices
- Therapists and mental health providers
- CPA firms and financial advisors
- Law firms
- Real estate agencies
- Insurance agencies
- Consultants and professional services
- Marketing agencies
- MSPs
- E-commerce businesses

---

*SecurityOS — Security that works for your business.*
