"""
MSP → Org membership repository.

Tracks which organizations are managed by each MSP account.
`context.py` reads from this before granting cross-org access to MSP users.
`msp.py` writes to it when orgs are created or deleted.

Interface is defined as a Protocol so Phase 3 can swap in a Postgres
implementation without touching any of the callers.
"""

from __future__ import annotations

import threading
from typing import Protocol, Set


class MspOrgRepository(Protocol):
    """Abstract read/write interface for MSP → org membership."""

    def get_managed_org_ids(self, msp_id: str) -> Set[str]:
        """Return the set of org_ids managed by this MSP (empty set if none)."""
        ...

    def add_org(self, msp_id: str, org_id: str) -> None:
        """Register a new org as managed by this MSP."""
        ...

    def remove_org(self, msp_id: str, org_id: str) -> None:
        """Unregister an org from this MSP's management."""
        ...


class InMemoryMspOrgRepository:
    """Thread-safe in-memory implementation. Replaced by Postgres in Phase 3."""

    def __init__(self) -> None:
        self._data: dict[str, set[str]] = {}
        self._lock = threading.Lock()

    def get_managed_org_ids(self, msp_id: str) -> Set[str]:
        with self._lock:
            return set(self._data.get(msp_id, set()))

    def add_org(self, msp_id: str, org_id: str) -> None:
        with self._lock:
            self._data.setdefault(msp_id, set()).add(org_id)

    def remove_org(self, msp_id: str, org_id: str) -> None:
        with self._lock:
            if msp_id in self._data:
                self._data[msp_id].discard(org_id)

    def _clear(self) -> None:
        """Test helper — resets all state."""
        with self._lock:
            self._data.clear()


# Module-level singleton used by all callers.
# Replace with a DI-injected instance in Phase 3.
msp_org_repo: InMemoryMspOrgRepository = InMemoryMspOrgRepository()
