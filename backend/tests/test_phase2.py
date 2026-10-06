"""
Phase 2 RBAC tests — rewritten for Phase 2.1.

Every org and member is created through the public API (no repository
seeding), so these tests exercise the same bootstrap paths as production:

  admin (owner)   — POST /organizations
  executive       — invite → accept
  engineer(s)     — POST /members
  auditor         — POST /members with expires_at
  MSP technician  — POST /msp/{id}/orgs (provisioning technician)
  client exec     — invite into the MSP-provisioned org → accept
"""

import pytest

from backend.tests.conftest import (
    API,
    add_member,
    auth,
    create_org,
    future_iso,
    invite_and_accept,
    make_token,
)

ADMIN = make_token("p2-admin", name="Pat Admin")
EXEC = make_token("p2-exec", name="Erin Exec")
ENG = make_token("p2-eng", name="Eli Engineer")
ENG2 = make_token("p2-eng2", name="Ena Engineer-Exec")
AUD = make_token("p2-aud", name="Ada Auditor")
OUTSIDER = make_token("p2-outsider")

MSP_ID = "msp-p2"
TECH = make_token("p2-tech", msp_id=MSP_ID, name="Tom Tech")
CLIENT_EXEC = make_token("p2-client-exec", name="Cleo ClientCEO")

ATTEST_BODY = {
    "source_name": "CrowdStrike Falcon",
    "source_description": "EDR on all endpoints",
    "control_ids": ["CTRL-DEV-003"],
    "confirmation_phrase": "ATTEST",
}


@pytest.fixture(scope="module")
def world(client):
    org = create_org(client, ADMIN, "Phase2 Co")
    assert invite_and_accept(client, ADMIN, org, "executive", EXEC).status_code == 200
    add_member(client, ADMIN, org, "p2-eng", "engineer")
    add_member(client, ADMIN, org, "p2-eng2", "engineer")
    # p2-eng2 also becomes an executive (holds engineer + executive)
    assert invite_and_accept(client, ADMIN, org, "executive", ENG2).status_code == 200
    add_member(client, ADMIN, org, "p2-aud", "auditor", expires_at=future_iso(30))

    r = client.post(f"{API}/msp/{MSP_ID}/orgs", json={"name": "Client Dental"}, headers=auth(TECH))
    assert r.status_code == 201, r.text
    client_org = r.json()["org_id"]
    assert invite_and_accept(client, TECH, client_org, "executive", CLIENT_EXEC).status_code == 200
    return {"org": org, "client_org": client_org}


def _finding(client, org, token, severity="high", controls=("CTRL-ID-001",)):
    r = client.post(
        f"{API}/organizations/{org}/findings",
        json={"title": f"{severity} gap", "description": "x", "severity": severity,
              "control_ids": list(controls)},
        headers=auth(token),
    )
    assert r.status_code == 201, r.text
    return r.json()["finding"]["finding_id"]


def _act(client, org, fid, token, action, **extra):
    return client.post(
        f"{API}/organizations/{org}/findings/{fid}/transition",
        json={"action": action, **extra},
        headers=auth(token),
    )


# ── Attestation permissions ───────────────────────────────────────────────────

def test_no_membership_cannot_attest(client, world):
    r = client.post(f"{API}/organizations/{world['org']}/attestations", json=ATTEST_BODY,
                    headers=auth(OUTSIDER))
    assert r.status_code == 404


def test_client_executive_can_attest_in_msp_org(client, world):
    r = client.post(f"{API}/organizations/{world['client_org']}/attestations", json=ATTEST_BODY,
                    headers=auth(CLIENT_EXEC))
    assert r.status_code == 201, r.text
    assert r.json()["attestation"]["created_by_user_id"] == "p2-client-exec"


def test_msp_technician_cannot_attest(client, world):
    r = client.post(f"{API}/organizations/{world['client_org']}/attestations", json=ATTEST_BODY,
                    headers=auth(TECH))
    assert r.status_code == 403


@pytest.mark.parametrize("token", [ADMIN, ENG, AUD], ids=["admin", "engineer", "auditor"])
def test_non_executives_cannot_attest(client, world, token):
    r = client.post(f"{API}/organizations/{world['org']}/attestations", json=ATTEST_BODY,
                    headers=auth(token))
    assert r.status_code == 403, r.text


def test_executive_can_attest(client, world):
    r = client.post(f"{API}/organizations/{world['org']}/attestations", json=ATTEST_BODY,
                    headers=auth(EXEC))
    assert r.status_code == 201, r.text


# ── Finding lifecycle ─────────────────────────────────────────────────────────

def test_finding_full_lifecycle_moves_score(client, world):
    org = world["org"]
    fid = _finding(client, org, ENG, "critical", ("CTRL-ID-001",))

    statuses = client.get(f"{API}/organizations/{org}/statuses", headers=auth(ADMIN)).json()["statuses"]
    assert statuses["CTRL-ID-001"]["status"] == "fail"

    assert _act(client, org, fid, ADMIN, "assign", assigned_to_user_id="p2-eng").status_code == 200
    assert _act(client, org, fid, ENG, "start").status_code == 200
    assert _act(client, org, fid, ENG, "submit", note="Enforced MFA via CA policy").status_code == 200
    r = _act(client, org, fid, EXEC, "approve")
    assert r.status_code == 200, r.text
    assert r.json()["finding"]["state"] == "closed"

    statuses = client.get(f"{API}/organizations/{org}/statuses", headers=auth(ADMIN)).json()["statuses"]
    assert statuses["CTRL-ID-001"]["status"] == "pass"
    assert statuses["CTRL-ID-001"]["derived_from"] == "approved_finding"


def test_self_approval_prohibited_for_engineer_executive(client, world):
    """p2-eng2 holds engineer + executive: they can do the work OR approve it, never both."""
    org = world["org"]
    fid = _finding(client, org, ENG2, "high", ("CTRL-NET-004",))
    assert _act(client, org, fid, EXEC, "assign", assigned_to_user_id="p2-eng2").status_code == 200
    assert _act(client, org, fid, ENG2, "start").status_code == 200
    assert _act(client, org, fid, ENG2, "submit").status_code == 200

    r = _act(client, org, fid, ENG2, "approve")
    assert r.status_code == 409, r.text

    r = _act(client, org, fid, EXEC, "approve")
    assert r.status_code == 200, r.text


def test_engineer_cannot_approve_high_finding(client, world):
    org = world["org"]
    fid = _finding(client, org, ENG, "high", ("CTRL-DEV-001",))
    _act(client, org, fid, ADMIN, "assign", assigned_to_user_id="p2-eng")
    _act(client, org, fid, ENG, "start")
    _act(client, org, fid, ENG, "submit")
    r = _act(client, org, fid, ENG, "approve")
    assert r.status_code == 403, r.text


def test_submitting_engineer_may_close_low_finding(client, world):
    org = world["org"]
    fid = _finding(client, org, ENG, "low", ("CTRL-ORG-003",))
    _act(client, org, fid, ADMIN, "assign", assigned_to_user_id="p2-eng")
    _act(client, org, fid, ENG, "start")
    _act(client, org, fid, ENG, "submit")
    r = _act(client, org, fid, ENG, "approve")
    assert r.status_code == 200, r.text


def test_other_engineer_cannot_close_someone_elses_low_finding(client, world):
    org = world["org"]
    fid = _finding(client, org, ENG, "medium", ("CTRL-ORG-002",))
    _act(client, org, fid, ADMIN, "assign", assigned_to_user_id="p2-eng")
    _act(client, org, fid, ENG, "start")
    _act(client, org, fid, ENG, "submit")
    # p2-eng2 is also an executive, so use a pure engineer who did not submit
    add_member(client, ADMIN, org, "p2-eng3", "engineer")
    r = _act(client, org, fid, make_token("p2-eng3"), "approve")
    assert r.status_code == 403, r.text


def test_assignee_must_be_able_to_remediate(client, world):
    org = world["org"]
    fid = _finding(client, org, ENG, "medium", ("CTRL-ORG-001",))
    r = _act(client, org, fid, ADMIN, "assign", assigned_to_user_id="p2-aud")
    assert r.status_code == 422
    r = _act(client, org, fid, ADMIN, "assign", assigned_to_user_id="nobody-at-all")
    assert r.status_code == 422


def test_auditor_can_view_findings(client, world):
    r = client.get(f"{API}/organizations/{world['org']}/findings", headers=auth(AUD))
    assert r.status_code == 200


def test_auditor_cannot_create_finding(client, world):
    r = client.post(
        f"{API}/organizations/{world['org']}/findings",
        json={"title": "t", "description": "d", "severity": "low", "control_ids": []},
        headers=auth(AUD),
    )
    assert r.status_code == 403


def test_finding_with_unknown_control_rejected(client, world):
    r = client.post(
        f"{API}/organizations/{world['org']}/findings",
        json={"title": "t", "description": "d", "severity": "low", "control_ids": ["NOPE-1"]},
        headers=auth(ENG),
    )
    assert r.status_code == 422


# ── /me and members ───────────────────────────────────────────────────────────

def test_get_me_returns_roles_and_permissions(client, world):
    r = client.get(f"{API}/me", headers=auth(ENG2))
    assert r.status_code == 200
    org = next(o for o in r.json()["organizations"] if o["org_id"] == world["org"])
    assert org["roles"] == ["engineer", "executive"]
    assert "attestation.create" in org["permissions"]
    assert "finding.remediate" in org["permissions"]


def test_list_members_requires_org_manage(client, world):
    assert client.get(f"{API}/organizations/{world['org']}/members", headers=auth(AUD)).status_code == 403
    assert client.get(f"{API}/organizations/{world['org']}/members", headers=auth(EXEC)).status_code == 403
    assert client.get(f"{API}/organizations/{world['org']}/members", headers=auth(ADMIN)).status_code == 200


def test_add_and_remove_member(client, world):
    org = world["org"]
    add_member(client, ADMIN, org, "p2-temp", "engineer")
    r = client.delete(f"{API}/organizations/{org}/members/p2-temp", headers=auth(ADMIN))
    assert r.status_code == 204
    r = client.get(f"{API}/organizations/{org}/findings", headers=auth(make_token("p2-temp")))
    assert r.status_code == 404


def test_set_member_roles(client, world):
    org = world["org"]
    add_member(client, ADMIN, org, "p2-roles", "engineer")
    r = client.patch(f"{API}/organizations/{org}/members/p2-roles",
                     json={"roles": ["engineer", "msp_technician"]}, headers=auth(ADMIN))
    assert r.status_code == 200, r.text
    assert r.json()["roles"] == ["engineer", "msp_technician"]


def test_executive_cannot_be_granted_directly(client, world):
    org = world["org"]
    r = client.post(f"{API}/organizations/{org}/members",
                    json={"user_id": "p2-sneaky", "role": "executive"}, headers=auth(ADMIN))
    assert r.status_code == 422
    r = client.patch(f"{API}/organizations/{org}/members/p2-eng",
                     json={"roles": ["engineer", "executive"]}, headers=auth(ADMIN))
    assert r.status_code == 422


def test_last_admin_cannot_be_removed(client, world):
    org = world["org"]
    r = client.delete(f"{API}/organizations/{org}/members/p2-admin", headers=auth(ADMIN))
    assert r.status_code == 409
    r = client.patch(f"{API}/organizations/{org}/members/p2-admin",
                     json={"roles": ["engineer"]}, headers=auth(ADMIN))
    assert r.status_code == 409


def test_finding_create_with_extra_field_returns_422(client, world):
    r = client.post(
        f"{API}/organizations/{world['org']}/findings",
        json={"title": "t", "description": "d", "severity": "low", "control_ids": [],
              "created_by_user_id": "spoof"},
        headers=auth(ENG),
    )
    assert r.status_code == 422


def test_member_add_with_invalid_role_returns_422(client, world):
    r = client.post(f"{API}/organizations/{world['org']}/members",
                    json={"user_id": "x", "role": "superuser"}, headers=auth(ADMIN))
    assert r.status_code == 422
