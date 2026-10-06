"""
OrgMembership repository — Phase 2 RBAC

Source of truth for role-based authorization within an organization.
Identity (who you are) comes from the JWT; authorization (what you may do)
comes from this table, never from token role claims.

Roles and their semantics:
  admin          — full org management: invite, revoke, change roles, all data
  executive      — sign off: create/revoke attestations, approve/risk-accept findings
  engineer       — operational: assign and remediate findings, view all
  msp_technician — MSP staff servicing the org: read-only view
  auditor        — external auditor: read-only view

Schema (logical):
  org_memberships(user_id, org_id, role, granted_by, granted_at, expires_at)
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, FrozenSet, List, Optional, Protocol, Tuple


# ── Valid roles ────────────────────────────────────────────────────────────────

VALID_ROLES: FrozenSet[str] = frozenset(
    {"admin", "executive", "engineer", "msp_technician", "auditor"}
)


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class OrgMembership:
    user_id: str
    org_id: str
    role: str                      # one of VALID_ROLES
    granted_by: str                # user_id of the granting admin
    granted_at: str                # ISO-8601 UTC timestamp
    expires_at: Optional[str] = None   # ISO-8601 UTC or None


# ── Repository protocol ───────────────────────────────────────────────────────

class OrgMembershipRepository(Protocol):
    def get(self, user_id: str, org_id: str) -> Optional[OrgMembership]: ...
    def list_by_org(self, org_id: str) -> List[OrgMembership]: ...
    def list_by_user(self, user_id: str) -> List[OrgMembership]: ...
    def add(self, membership: OrgMembership) -> None: ...
    def remove(self, user_id: str, org_id: str) -> None: ...
    def update_role(self, user_id: str, org_id: str, role: str, granted_by: str) -> None: ...
    def _clear(self) -> None: ...


# ── In-memory implementation ──────────────────────────────────────────────────

class InMemoryOrgMembershipRepository:
    """Thread-safe in-memory implementation for development and testing."""

    def __init__(self) -> None:
        # Keyed by (user_id, org_id)
        self._data: Dict[Tuple[str, str], OrgMembership] = {}
        self._lock = threading.Lock()

    def get(self, user_id: str, org_id: str) -> Optional[OrgMembership]:
        with self._lock:
            return self._data.get((user_id, org_id))

    def list_by_org(self, org_id: str) -> List[OrgMembership]:
        with self._lock:
            return [m for m in self._data.values() if m.org_id == org_id]

    def list_by_user(self, user_id: str) -> List[OrgMembership]:
        with self._lock:
            return [m for m in self._data.values() if m.user_id == user_id]

    def add(self, membership: OrgMembership) -> None:
        if membership.role not in VALID_ROLES:
            raise ValueError(
                f"Invalid role '{membership.role}'. Must be one of {sorted(VALID_ROLES)}."
            )
        with self._lock:
            self._data[(membership.user_id, membership.org_id)] = membership

    def remove(self, user_id: str, org_id: str) -> None:
        with self._lock:
            self._data.pop((user_id, org_id), None)

    def update_role(
        self, user_id: str, org_id: str, role: str, granted_by: str
    ) -> None:
        if role not in VALID_ROLES:
            raise ValueError(
                f"Invalid role '{role}'. Must be one of {sorted(VALID_ROLES)}."
            )
        with self._lock:
            existing = self._data.get((user_id, org_id))
            if existing is None:
                raise KeyError(f"No membership for user '{user_id}' in org '{org_id}'.")
            existing.role = role
            existing.granted_by = granted_by
            existing.granted_at = datetime.now(timezone.utc).isoformat()

    def _clear(self) -> None:
        """Test helper: remove all memberships."""
        with self._lock:
            self._data.clear()


# ── Module-level singleton ────────────────────────────────────────────────────

org_membership_repo: InMemoryOrgMembershipRepository = InMemoryOrgMembershipRepository()
