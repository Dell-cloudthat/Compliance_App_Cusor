"""
Audit log — Phase 2.1 (in-memory, append-only)

Records security-relevant actions (org creation, role grants, invites, manual
status changes, attestations).  Append-only: there is no update or delete API.

Phase 3 moves this to Postgres with a SHA-256 hash chain and an /audit/verify
endpoint; callers already use the final shape (`record(...)`), so that change
is a storage swap.
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class AuditEvent:
    event_id: str
    org_id: Optional[str]
    actor_user_id: str
    action: str
    occurred_at: str
    details: Dict[str, Any] = field(default_factory=dict)


class InMemoryAuditRepository:
    def __init__(self) -> None:
        self._events: List[AuditEvent] = []
        self._lock = threading.Lock()

    def record(
        self,
        *,
        org_id: Optional[str],
        actor_user_id: str,
        action: str,
        **details: Any,
    ) -> AuditEvent:
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            org_id=org_id,
            actor_user_id=actor_user_id,
            action=action,
            occurred_at=datetime.now(timezone.utc).isoformat(),
            details=details,
        )
        with self._lock:
            self._events.append(event)
        return event

    def list_by_org(self, org_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            return [asdict(e) for e in self._events if e.org_id == org_id]

    def _clear(self) -> None:
        with self._lock:
            self._events.clear()


audit_repo: InMemoryAuditRepository = InMemoryAuditRepository()
