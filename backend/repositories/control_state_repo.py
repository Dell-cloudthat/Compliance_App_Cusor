"""
Shared control-state stores — Phase 2.1

Holds the two inputs to scoring that are not findings:
  - manual control statuses (non-passing values only — see control_state service)
  - attestations

Previously these lived as module globals inside the API routers, and the MSP
router kept a second, separate status store for the same org.  Both routers now
use these stores so an org has exactly one state.
"""

from __future__ import annotations

from typing import Dict

# {org_id: {control_id: {"status", "notes", "evidence_source", "last_checked", "set_by"}}}
manual_statuses: Dict[str, Dict[str, Dict]] = {}

# {org_id: {attest_id: Attestation}}
attestations: Dict[str, Dict[str, object]] = {}


def remove_org(org_id: str) -> None:
    manual_statuses.pop(org_id, None)
    attestations.pop(org_id, None)


def _clear() -> None:
    manual_statuses.clear()
    attestations.clear()
