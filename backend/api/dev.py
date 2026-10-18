"""
SecurityOS Dev-Mode Bootstrap

ONLY available when ENV != "prod".
Creates a ready-to-use demo session so the frontend can connect to the API
without manual setup: one POST call returns a signed JWT, an org_id, and an
msp_id with demo findings and integrations pre-seeded.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException

ENV = os.environ.get("ENV", "dev").lower()

router = APIRouter(prefix="/api/v1/securityos/dev", tags=["Dev"])

DEMO_USER_ID  = "demo-user-001"
DEMO_ORG_ID   = "demo-org-001"
DEMO_MSP_ID   = "demo-msp-001"
DEMO_ORG_NAME = "Acme Healthcare IT"


@router.post("/demo", summary="Bootstrap demo session (dev only)")
def create_demo_session():
    """
    Idempotent: calling this multiple times returns the same org_id / msp_id
    but re-seeds findings and integrations.  Call once on frontend startup.
    """
    if ENV == "prod":
        raise HTTPException(status_code=404, detail="Not found")

    from backend.auth.jwt import sign_dev_token
    from backend.repositories.org_repo import org_repo
    from backend.repositories.org_membership_repo import org_membership_repo, OrgMembership
    from backend.repositories.msp_org_repo import msp_org_repo
    from backend.repositories.finding_repo import finding_repo, AffectedResource
    from backend.repositories.control_state_repo import manual_statuses
    from backend.repositories.audit_repo import audit_repo
    from backend.api.integrations import integration_store, IntegrationRecord
    import uuid

    now = datetime.now(timezone.utc)
    iso = now.isoformat()

    # ── Org ──────────────────────────────────────────────────────────────────
    if not org_repo.get(DEMO_ORG_ID):
        from backend.repositories.org_repo import Organization
        demo_org = Organization(
            org_id=DEMO_ORG_ID,
            name=DEMO_ORG_NAME,
            created_by=DEMO_USER_ID,
            created_at=iso,
            updated_at=iso,
            msp_id=DEMO_MSP_ID,
            profile={
                "business_name":       DEMO_ORG_NAME,
                "industry":            "Medical / Dental Practice",
                "employee_count":      "25",
                "email_provider":      "Microsoft 365",
                "cloud_providers":     ["Azure", "Microsoft 365"],
                "sensitive_data":      ["phi", "pii"],
                "regulatory_exposure": ["HIPAA", "FTC Safeguards"],
                "has_insurance":       True,
                "revenue_range":       "$1M–$5M",
            },
        )
        with org_repo._lock:
            org_repo._orgs[DEMO_ORG_ID] = demo_org

    try:
        msp_org_repo.add_org(DEMO_MSP_ID, DEMO_ORG_ID)
    except Exception:
        pass

    # ── Membership — admin role for the demo user ─────────────────────────────
    if not org_membership_repo.get(DEMO_USER_ID, DEMO_ORG_ID):
        org_membership_repo.add(OrgMembership(
            user_id=DEMO_USER_ID,
            org_id=DEMO_ORG_ID,
            role="admin",
            granted_by=DEMO_USER_ID,
            granted_at=iso,
        ))

    # ── Control statuses (manual baselines) ──────────────────────────────────
    statuses = manual_statuses.setdefault(DEMO_ORG_ID, {})
    _set = lambda cid, st, src="manual": statuses.update({
        cid: {"status": st, "evidence_source": src, "last_checked": iso, "notes": None}
    })
    _set("CTRL-ID-001", "pass",  "attested_third_party")
    _set("CTRL-ID-002", "pass",  "manual")
    _set("CTRL-ID-003", "fail")
    _set("CTRL-ID-004", "fail")
    _set("CTRL-DEV-001","pass",  "manual")
    _set("CTRL-DEV-002","fail")
    _set("CTRL-DEV-003","fail")
    _set("CTRL-DATA-001","pass", "manual")
    _set("CTRL-DATA-003","fail")
    _set("CTRL-NET-001", "pass", "manual")
    _set("CTRL-NET-004", "fail")
    _set("CTRL-ORG-001", "pass", "manual")
    _set("CTRL-ORG-002", "fail")
    _set("CTRL-ORG-003", "fail")

    # ── Findings ─────────────────────────────────────────────────────────────
    # Clear and re-seed so demo is fresh each call
    finding_repo.remove_org(DEMO_ORG_ID)

    overdue_date = (now - timedelta(days=3)).strftime("%Y-%m-%d")
    due_soon     = (now + timedelta(days=5)).strftime("%Y-%m-%d")
    due_future   = (now + timedelta(days=30)).strftime("%Y-%m-%d")

    _findings_seed = [
        dict(
            title="MFA not enforced for 3 inactive accounts",
            description="Three user accounts have not enrolled in MFA despite the 30-day policy window. Accounts: sarah.jones@acmehealthcare.com, mike.chen@acmehealthcare.com, temp-contractor-01@acmehealthcare.com",
            severity="critical",
            control_ids=["CTRL-ID-001"],
            affected_resources=[
                AffectedResource("user", "sarah.jones@acmehealthcare.com", "Last login 45 days ago"),
                AffectedResource("user", "mike.chen@acmehealthcare.com",   "Never set up MFA"),
                AffectedResource("user", "temp-contractor-01@acmehealthcare.com", "Temporary account, no MFA"),
            ],
            due_date=overdue_date,
            business_impact="Accounts without MFA are 99% more likely to be compromised in a phishing attack. A breached account with PHI access could trigger a HIPAA reportable breach costing $50K–$500K.",
            verification_evidence="Screenshot or API report showing 0 users without MFA in Microsoft 365 admin center → Security → MFA.",
            definition_of_done="All active and inactive user accounts show MFA status = Enforced in Microsoft 365. Unresolvable accounts are disabled.",
        ),
        dict(
            title="Endpoint protection missing on 4 Windows workstations",
            description="Devices ACME-PC-07, ACME-PC-11, ACME-PC-14, ACME-LAPTOP-03 are not reporting to Microsoft Defender. These machines access the EHR system.",
            severity="high",
            control_ids=["CTRL-DEV-003"],
            affected_resources=[
                AffectedResource("device", "ACME-PC-07",     "Exam room 2 — accesses EHR"),
                AffectedResource("device", "ACME-PC-11",     "Front desk — processes payments"),
                AffectedResource("device", "ACME-PC-14",     "Doctor's office"),
                AffectedResource("device", "ACME-LAPTOP-03", "Remote work laptop"),
            ],
            due_date=due_soon,
            business_impact="Unprotected endpoints accessing the EHR create a direct ransomware pathway to patient records. Healthcare ransomware average downtime is 15 days.",
            verification_evidence="Intune device compliance report showing all devices compliant with Defender enabled and definitions current (< 24 hours old).",
            definition_of_done="All workstations and laptops appear in Intune as Compliant. Defender real-time protection active, signatures < 24h old.",
        ),
        dict(
            title="No formal incident response plan documented",
            description="The practice has no written incident response plan. In the event of a ransomware attack or data breach, staff will not know who to call or what to do in the first critical hours.",
            severity="high",
            control_ids=["CTRL-ORG-002"],
            affected_resources=[
                AffectedResource("setting", "incident_response_plan", "Document does not exist"),
            ],
            due_date=due_future,
            business_impact="HIPAA requires a documented incident response plan. Without one, a breach response will be slower and more expensive. HHS may impose penalties for lack of a plan.",
            verification_evidence="Signed and dated incident response plan document with: contact list, breach notification steps, and annual review signature.",
            definition_of_done="IRP document signed by practice owner, stored in SharePoint, and reviewed by all staff. Plan tested with a tabletop exercise.",
        ),
        dict(
            title="Annual security awareness training not completed",
            description="14 of 25 staff members have not completed this year's security awareness training. Training deadline was 90 days ago.",
            severity="medium",
            control_ids=["CTRL-ORG-003"],
            affected_resources=[
                AffectedResource("user", "14 staff members", "Completion rate: 44%"),
            ],
            due_date=overdue_date,
            business_impact="Staff who haven't completed training are 3× more likely to click phishing links. Phishing is the #1 entry point for healthcare data breaches.",
            verification_evidence="Training platform completion report showing 100% of active staff completed the current year's training module.",
            definition_of_done="All 25 active staff show completion date in KnowBe4 or equivalent. New hires complete training within 7 days of start date.",
        ),
        dict(
            title="User access review overdue — no quarterly review completed",
            description="No quarterly access review has been conducted this year. Former employee accounts may still have active access to patient records.",
            severity="high",
            control_ids=["CTRL-ID-003"],
            affected_resources=[
                AffectedResource("setting", "access_review_process", "Process not established"),
                AffectedResource("user",    "former_employees",       "Unknown — no review completed"),
            ],
            due_date=due_soon,
            business_impact="Former employee with active EHR access is a HIPAA violation. Even accidental access by ex-staff constitutes an unauthorized disclosure.",
            verification_evidence="Signed access review worksheet listing every user account, their role, last login, and approval or removal decision.",
            definition_of_done="Quarterly access review completed and documented. All accounts verified active and appropriate. Inactive accounts disabled.",
        ),
    ]

    for seed in _findings_seed:
        finding_repo.create(
            org_id=DEMO_ORG_ID,
            title=seed["title"],
            description=seed["description"],
            severity=seed["severity"],
            control_ids=seed["control_ids"],
            created_by_user_id=DEMO_USER_ID,
            created_by_name="Demo Admin",
            affected_resources=seed.get("affected_resources", []),
            due_date=seed.get("due_date"),
            business_impact=seed.get("business_impact"),
            verification_evidence=seed.get("verification_evidence"),
            definition_of_done=seed.get("definition_of_done"),
            # Catalog data auto-populated from control_ids in real API; here we skip
            # to keep the seed simple — the API route does this automatically.
        )

    # ── M365 Integration (pending consent) ───────────────────────────────────
    from backend.api.integrations import M365_REQUIRED_SCOPES, M365_VERIFIABLE_CONTROLS
    existing = integration_store.get(DEMO_ORG_ID, "microsoft_365")
    if not existing:
        integration_store.upsert(IntegrationRecord(
            integration_id=str(uuid.uuid4()),
            org_id=DEMO_ORG_ID,
            provider="microsoft_365",
            status="pending_consent",
            connected_by_user_id=DEMO_USER_ID,
            connected_at=iso,
            tenant_id="acme-healthcare.onmicrosoft.com",
            tenant_domain="acmehealthcare.com",
            collection_status="not_started",
            updated_at=iso,
        ))

    # ── JWT ──────────────────────────────────────────────────────────────────
    token = sign_dev_token({
        "sub":    DEMO_USER_ID,
        "name":   "Demo Admin",
        "email":  "admin@acmehealthcare.com",
        "msp_id": DEMO_MSP_ID,
        "org_id": DEMO_ORG_ID,
    }, expires_in=86400 * 7)  # 7-day demo token

    findings = finding_repo.list_by_org(DEMO_ORG_ID)
    overdue_count = sum(1 for f in findings if f.is_overdue())

    return {
        "token":      token,
        "org_id":     DEMO_ORG_ID,
        "msp_id":     DEMO_MSP_ID,
        "user_id":    DEMO_USER_ID,
        "org_name":   DEMO_ORG_NAME,
        "findings":   len(findings),
        "overdue":    overdue_count,
        "api_base":   "/api/v1/securityos",
        "docs":       "/docs",
        "expires_in": 86400 * 7,
    }


@router.delete("/demo", summary="Clear demo data (dev only)")
def clear_demo_session():
    """Wipe all demo org data so create_demo_session starts fresh."""
    if ENV == "prod":
        raise HTTPException(status_code=404, detail="Not found")

    from backend.repositories.org_repo import org_repo
    from backend.repositories.org_membership_repo import org_membership_repo
    from backend.repositories.msp_org_repo import msp_org_repo
    from backend.repositories.finding_repo import finding_repo
    from backend.repositories.control_state_repo import manual_statuses
    from backend.api.integrations import integration_store

    finding_repo.remove_org(DEMO_ORG_ID)
    org_membership_repo.remove_org(DEMO_ORG_ID)
    msp_org_repo.remove_org(DEMO_MSP_ID)
    manual_statuses.pop(DEMO_ORG_ID, None)
    integration_store.remove_org(DEMO_ORG_ID)
    org_repo.delete(DEMO_ORG_ID)

    return {"cleared": True}
