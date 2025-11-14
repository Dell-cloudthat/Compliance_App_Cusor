# Product Feature Dictionary

Central catalogue of the platform’s capabilities. Each entry outlines what the feature does, why it matters, who benefits, and how it interacts with the rest of the system. Update this document whenever we ship or materially enhance a feature.

---

## Golden Thread Control Workspace
- **Summary:** Unified control detail overlay that stitches together risk snapshot, linked alerts, dataflows, evidence, and AI-guided actions.
- **Key Value:** Gives operators and auditors a single, contextualized view from detection to attestation, reducing investigation time.
- **Primary Users:** Compliance managers, security operations, auditors.
- **Data Inputs:** Controls, actionable alerts, responsibility matrix, data flow nodes/edges, evidence segments, AI guidance API.
- **Status:** ✅ Live (with AI guidance refresh & CSV export).
- **Related Features:** AI Compliance Intelligence Core, Data Flow Architecture Graph, Alert Drill-Down.

## AI Compliance Intelligence Core
- **Summary:** Intelligence layer that scores control risk (priorities API) and generates remediation guidance, evidence reminders, and automation tips.
- **Key Value:** Prioritizes what matters, explains why, and tells teams exactly how to respond—accelerates ROI and audit readiness.
- **Primary Users:** Compliance leads, GRC analysts, CISOs.
- **Data Inputs:** Controls, alerts, audit evidence, responsibility matrix, automation log.
- **Status:** ✅ Live (priorities + guidance endpoints, UI surfaces in Golden Thread).
- **Related Features:** Golden Thread Control Workspace, Automation Playbook, Alert Drill-Down.

## Alert Drill-Down & Remediation Console
- **Summary:** Full-screen alert workspace with risk snapshot, timeline, linked controls, and guided remediation checklist.
- **Key Value:** Collapses investigation + action into one flow; real-time updates keep timelines in sync across users.
- **Primary Users:** SecOps analysts, compliance responders.
- **Data Inputs:** Alert detail endpoint, activity log, control metadata, automation playbooks.
- **Status:** ✅ Live (modal + backend detail endpoint + websocket refresh).
- **Related Features:** AI Guidance, Automation Plan, Golden Thread.

## Data Flow Architecture Graph
- **Summary:** Interactive graph of systems, data flows, telemetry, and control attribution with audit trail and cross-navigation.
- **Key Value:** Makes data lineage and control coverage visible; supports change tracking and compliance-by-design.
- **Primary Users:** Cloud/security architecture, data governance, compliance teams.
- **Data Inputs:** Data flow nodes/edges/audit log, access summary, control mapping, telemetry signals.
- **Status:** ✅ Live (graph view + CRUD + audit trail + navigation hooks).
- **Related Features:** Golden Thread, Automation Plan, Controls & Responsibility Matrix.

## Controls & Responsibility Matrix
- **Summary:** Tabular view of all controls, owners, shared responsibility, data sources, and coverage type with inline edits.
- **Key Value:** Clarifies ownership and accountability; forms the backbone for guided remediation and reporting.
- **Primary Users:** Compliance program owners, control operators, auditors.
- **Data Inputs:** Controls table, responsibility matrix, API integrations, vendor/MDR assignments.
- **Status:** ✅ Live (filters, exports, inline updates).
- **Related Features:** Golden Thread, automation reporting, IAM & Permissions.

## Automation Playbook & Checklist
- **Summary:** Guided modal that walks teams through remediation steps, tracks evidence, and pushes automation completion to history.
- **Key Value:** Standardizes remediation, captures evidence, and improves burndown tracking for automation initiatives.
- **Primary Users:** Control owners, automation engineers, compliance teams.
- **Data Inputs:** Automation plan definitions, checklist state, evidence capture inputs.
- **Status:** ✅ Live (playbook modal + checklist + activity log integration).
- **Related Features:** AI Guidance, Golden Thread, Automation Activity Log.

## AI Command Palette
- **Summary:** Global ⌘K / Ctrl+K interface for quick navigation, filtering views, and triggering platform actions.
- **Key Value:** Boosts productivity for power users, reduces click depth across the application.
- **Primary Users:** All roles (especially analysts and admins).
- **Data Inputs:** Command registry, navigation routes, action handlers.
- **Status:** ✅ Live (global palette + keyboard shortcuts).
- **Related Features:** Golden Thread, Data Flow Graph, Automation Plan.

## Framework Glossary & Learning Hub
- **Summary:** Interactive dictionary of compliance frameworks, control definitions, and beginner-friendly explanations.
- **Key Value:** Onboards new users, supports multi-framework mapping, and provides quick references during audits.
- **Primary Users:** Compliance teams, auditors, new security hires.
- **Data Inputs:** Framework glossary dataset, search/filter inputs.
- **Status:** ✅ Live (searchable glossary view).
- **Related Features:** Controls Matrix, AI Guidance summaries, reports.

## IAM & Permissions Console
- **Summary:** Consolidated view of user roles, vendor profiles, permission grants, and audit log events.
- **Key Value:** Centralizes identity & access governance with compliance context; supports evidence for least-privilege controls.
- **Primary Users:** IAM admins, compliance managers, auditors.
- **Data Inputs:** IAM tables (user_roles, user_permissions, vendor profiles), permission audit log.
- **Status:** ✅ Live (UI and backend endpoints).
- **Related Features:** Golden Thread (owner insights), Automation Playbook, Compliance Score History.

## Real-Time Compliance & Score History
- **Summary:** Dashboards and APIs that track framework scores, growth metrics, and correlation between security events and compliance posture.
- **Key Value:** Shows progress over time, highlights drifts, and quantifies security-compliance alignment.
- **Primary Users:** Compliance leadership, executives, auditors.
- **Data Inputs:** Compliance history tables, security events, correlation metrics.
- **Status:** ✅ Live (API + dashboard components).
- **Related Features:** AI Prioritization, Alert Drill-Down, Reporting.

## Bulk Import & Data Sync Framework
- **Summary:** Upload/import pipelines for controls, assets, and evidence with segmentation and API attribution logic.
- **Key Value:** Accelerates onboarding, keeps control metadata synchronized with external systems.
- **Primary Users:** Implementation teams, compliance admins, integration engineers.
- **Data Inputs:** Controls dataset, API integrations, segment metadata.
- **Status:** ✅ Live (import wizard, segmentation engine).
- **Related Features:** Data Flow Architecture, AI Guidance (mapped evidence), Controls Matrix.

---

### How to Add New Entries
1. Copy the section template below.
2. Fill in the fields with concise, value-driven descriptions.
3. Keep the list alphabetized by feature name once we have more entries.

```
## Feature Name
- **Summary:** One-liner explaining the capability.
- **Key Value:** Business/user outcome it delivers.
- **Primary Users:** Personas who rely on it.
- **Data Inputs:** Systems, datasets, or APIs it consumes.
- **Status:** (Planned / In Progress / Live / Deprecated)
- **Related Features:** Cross-links to keep the web navigable.
```

