"""
Finding repository — Phase 2

Findings represent security gaps that need remediation.  The state machine is:

  open ──assign──► assigned ──start──► in_progress ──submit──► submitted_for_review
    ▲                                                                    │
    │                                                         approve / reject
    │                                                            │        │
    └──────────────────────── reopened ◄────────────────── closed    in_progress
                                                             (also ◄── risk_accepted reopen)

Additionally any non-closed state may transition to risk_accepted.

Append-only rule: finding events are never deleted or mutated.
The server sets all timestamps and actor fields.
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

# ── Valid states and transitions ──────────────────────────────────────────────

FINDING_STATES = frozenset(
    {
        "open",
        "assigned",
        "in_progress",
        "submitted_for_review",
        "closed",
        "risk_accepted",
        "reopened",
    }
)

# {from_state: {action: to_state}}
TRANSITIONS: Dict[str, Dict[str, str]] = {
    "open":                   {"assign": "assigned",       "risk_accept": "risk_accepted"},
    "assigned":               {"start":  "in_progress",   "risk_accept": "risk_accepted"},
    "in_progress":            {"submit": "submitted_for_review", "risk_accept": "risk_accepted"},
    "submitted_for_review":   {"approve": "closed",        "reject": "in_progress"},
    "closed":                 {"reopen": "reopened"},
    "risk_accepted":          {"reopen": "open"},
    "reopened":               {"assign": "assigned",       "risk_accept": "risk_accepted"},
}


# ── Data models ───────────────────────────────────────────────────────────────

@dataclass
class FindingEvent:
    """Immutable audit event for a single state transition."""
    event_id: str
    finding_id: str
    action: str
    from_state: str
    to_state: str
    actor_user_id: str
    actor_name: str
    occurred_at: str
    note: Optional[str] = None


@dataclass
class Finding:
    finding_id: str
    org_id: str
    title: str
    description: str
    severity: str                      # critical | high | medium | low | info
    control_ids: List[str]
    state: str                         # current state
    created_by_user_id: str
    created_at: str
    updated_at: str
    assigned_to_user_id: Optional[str] = None
    events: List[FindingEvent] = field(default_factory=list)


# ── Repository ────────────────────────────────────────────────────────────────

class InMemoryFindingRepository:
    """Thread-safe in-memory finding store."""

    def __init__(self) -> None:
        self._findings: Dict[str, Finding] = {}  # finding_id → Finding
        self._lock = threading.Lock()

    def create(
        self,
        *,
        org_id: str,
        title: str,
        description: str,
        severity: str,
        control_ids: List[str],
        created_by_user_id: str,
        created_by_name: str,
    ) -> Finding:
        now = datetime.now(timezone.utc).isoformat()
        finding_id = str(uuid.uuid4())
        finding = Finding(
            finding_id=finding_id,
            org_id=org_id,
            title=title,
            description=description,
            severity=severity,
            control_ids=control_ids,
            state="open",
            created_by_user_id=created_by_user_id,
            created_at=now,
            updated_at=now,
        )
        event = FindingEvent(
            event_id=str(uuid.uuid4()),
            finding_id=finding_id,
            action="create",
            from_state="",
            to_state="open",
            actor_user_id=created_by_user_id,
            actor_name=created_by_name,
            occurred_at=now,
        )
        finding.events.append(event)
        with self._lock:
            self._findings[finding_id] = finding
        return finding

    def get(self, finding_id: str, org_id: str) -> Optional[Finding]:
        with self._lock:
            f = self._findings.get(finding_id)
            if f is None or f.org_id != org_id:
                return None
            return f

    def list_by_org(self, org_id: str) -> List[Finding]:
        with self._lock:
            return [f for f in self._findings.values() if f.org_id == org_id]

    def transition(
        self,
        finding: Finding,
        *,
        action: str,
        actor_user_id: str,
        actor_name: str,
        note: Optional[str] = None,
        assigned_to_user_id: Optional[str] = None,
    ) -> FindingEvent:
        """
        Apply a state-machine transition to a finding.

        Raises ValueError if the action is not valid from the current state.
        The server sets the timestamp; callers must not pass timestamps.
        """
        allowed = TRANSITIONS.get(finding.state, {})
        if action not in allowed:
            raise ValueError(
                f"Action '{action}' is not allowed from state '{finding.state}'. "
                f"Allowed actions: {sorted(allowed.keys()) or 'none'}."
            )
        from_state = finding.state
        to_state = allowed[action]
        now = datetime.now(timezone.utc).isoformat()

        event = FindingEvent(
            event_id=str(uuid.uuid4()),
            finding_id=finding.finding_id,
            action=action,
            from_state=from_state,
            to_state=to_state,
            actor_user_id=actor_user_id,
            actor_name=actor_name,
            occurred_at=now,
            note=note,
        )
        with self._lock:
            finding.state = to_state
            finding.updated_at = now
            if assigned_to_user_id is not None:
                finding.assigned_to_user_id = assigned_to_user_id
            finding.events.append(event)

        return event

    def last_remediator(self, finding: Finding) -> Optional[str]:
        """Return the user_id of the last actor who performed 'submit' (remediation complete)."""
        for event in reversed(finding.events):
            if event.action == "submit":
                return event.actor_user_id
        return None

    def _clear(self) -> None:
        with self._lock:
            self._findings.clear()


# ── Module-level singleton ────────────────────────────────────────────────────

finding_repo: InMemoryFindingRepository = InMemoryFindingRepository()
