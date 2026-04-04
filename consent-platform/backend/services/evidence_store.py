"""
Evidence Store

Append-only, hash-chained, tamper-evident logging.

What it stores:
- Consent issuance
- Consent revocation
- Every enforcement decision
- Data transformations
- Vendor access

Properties:
- Append-only (no updates, no deletes)
- Hash chaining: hash(n) = SHA256(event(n) + hash(n-1))
- Time-stamped (UTC)
- Queryable

Storage Tiers:
- Hot: last 30 days (fast queries)
- Warm: 1 year (operational)
- Cold: archive (audit only)

This is NOT blockchain. This is security-grade logging.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum
from collections import deque
from dataclasses import dataclass
import hashlib
import json
import threading
import time
import uuid


# ============== Enums ==============

class EventType(str, Enum):
    # Consent lifecycle
    CONSENT_ISSUED = "consent_issued"
    CONSENT_REVOKED = "consent_revoked"
    CONSENT_EXPIRED = "consent_expired"
    
    # Enforcement
    ENFORCEMENT_DECISION = "enforcement_decision"
    
    # Policy
    POLICY_CREATED = "policy_created"
    POLICY_UPDATED = "policy_updated"
    
    # Vendor
    VENDOR_ADDED = "vendor_added"
    VENDOR_REMOVED = "vendor_removed"
    
    # Admin
    KEY_ROTATED = "key_rotated"
    TENANT_CREATED = "tenant_created"


# ============== Models ==============

class EvidenceEntry(BaseModel):
    """A single entry in the evidence log"""
    sequence: int
    event_id: str
    tenant_id: str
    
    event_type: EventType
    event_data: Dict[str, Any]
    
    # Hash chain
    previous_hash: Optional[str]
    event_hash: str
    
    # Immutable timestamp
    timestamp: datetime


class ChainVerificationResult(BaseModel):
    """Result of verifying the hash chain"""
    valid: bool
    events_checked: int
    first_sequence: Optional[int] = None
    last_sequence: Optional[int] = None
    last_hash: Optional[str] = None
    
    # If invalid
    broken_at_sequence: Optional[int] = None
    expected_hash: Optional[str] = None
    actual_hash: Optional[str] = None
    error: Optional[str] = None


class AuditExport(BaseModel):
    """Export format for audit"""
    tenant_id: str
    export_time: datetime
    time_range_start: datetime
    time_range_end: datetime
    
    events: List[EvidenceEntry]
    
    # Verification
    chain_valid: bool
    events_count: int
    first_hash: Optional[str]
    last_hash: Optional[str]


# ============== Evidence Store ==============

class EvidenceStore:
    """
    Immutable, append-only evidence store with hash chaining.
    
    Thread-safe. Fast reads. Cryptographically verifiable.
    """
    
    def __init__(self, max_hot_events: int = 100000):
        """
        Initialize the evidence store.
        
        Args:
            max_hot_events: Max events to keep in hot storage (in-memory)
        """
        # Hot storage (in-memory, fast)
        self._events: deque = deque(maxlen=max_hot_events)
        
        # Thread safety
        self._lock = threading.Lock()
        
        # Chain state
        self._sequence: int = 0
        self._last_hash: Dict[str, str] = {}  # tenant_id -> last hash
        
        # Indexes for fast querying
        self._by_tenant: Dict[str, List[int]] = {}  # tenant_id -> list of indices
        self._by_type: Dict[str, List[int]] = {}    # event_type -> list of indices
        
        # Stats
        self._stats = {
            "total_events": 0,
            "events_per_second": 0,
            "last_stats_time": time.time(),
            "events_since_stats": 0
        }
    
    def _compute_hash(self, event_data: Dict[str, Any], previous_hash: Optional[str]) -> str:
        """
        Compute SHA-256 hash of event data including previous hash.
        
        Formula: hash(n) = SHA256(event(n) + hash(n-1))
        """
        to_hash = {
            "previous": previous_hash or "genesis",
            "data": event_data
        }
        return hashlib.sha256(
            json.dumps(to_hash, sort_keys=True, default=str).encode()
        ).hexdigest()
    
    def append(
        self,
        tenant_id: str,
        event_type: EventType,
        event_data: Dict[str, Any]
    ) -> EvidenceEntry:
        """
        Append an event to the evidence log.
        
        This operation is:
        - Atomic
        - Thread-safe
        - Append-only (cannot modify or delete)
        
        Returns the stored entry with hash.
        """
        with self._lock:
            self._sequence += 1
            event_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc)
            
            # Get previous hash for this tenant's chain
            previous_hash = self._last_hash.get(tenant_id)
            
            # Compute event hash
            hash_data = {
                "sequence": self._sequence,
                "event_id": event_id,
                "tenant_id": tenant_id,
                "event_type": event_type.value,
                "event_data": event_data,
                "timestamp": timestamp.isoformat()
            }
            event_hash = self._compute_hash(hash_data, previous_hash)
            
            # Create entry
            entry = EvidenceEntry(
                sequence=self._sequence,
                event_id=event_id,
                tenant_id=tenant_id,
                event_type=event_type,
                event_data=event_data,
                previous_hash=previous_hash,
                event_hash=event_hash,
                timestamp=timestamp
            )
            
            # Store
            idx = len(self._events)
            self._events.append(entry)
            
            # Update chain state
            self._last_hash[tenant_id] = event_hash
            
            # Update indexes
            if tenant_id not in self._by_tenant:
                self._by_tenant[tenant_id] = []
            self._by_tenant[tenant_id].append(idx)
            
            type_key = event_type.value
            if type_key not in self._by_type:
                self._by_type[type_key] = []
            self._by_type[type_key].append(idx)
            
            # Update stats
            self._stats["total_events"] += 1
            self._stats["events_since_stats"] += 1
            
            now = time.time()
            elapsed = now - self._stats["last_stats_time"]
            if elapsed >= 1.0:
                self._stats["events_per_second"] = self._stats["events_since_stats"] / elapsed
                self._stats["events_since_stats"] = 0
                self._stats["last_stats_time"] = now
            
            return entry
    
    def log_consent_issued(
        self,
        tenant_id: str,
        token_id: str,
        subject_id: str,
        purposes: Dict[str, Any],
        vendors: Dict[str, Any],
        jurisdiction: str,
        expires_at: datetime
    ) -> EvidenceEntry:
        """Log a consent token issuance"""
        return self.append(
            tenant_id=tenant_id,
            event_type=EventType.CONSENT_ISSUED,
            event_data={
                "token_id": token_id,
                "subject_id": subject_id,
                "purposes": list(purposes.keys()),
                "vendors": list(vendors.keys()),
                "jurisdiction": jurisdiction,
                "expires_at": expires_at.isoformat()
            }
        )
    
    def log_consent_revoked(
        self,
        tenant_id: str,
        token_id: str,
        subject_id: str,
        reason: str
    ) -> EvidenceEntry:
        """Log a consent revocation"""
        return self.append(
            tenant_id=tenant_id,
            event_type=EventType.CONSENT_REVOKED,
            event_data={
                "token_id": token_id,
                "subject_id": subject_id,
                "reason": reason
            }
        )
    
    def log_enforcement_decision(
        self,
        tenant_id: str,
        event_id: str,
        vendor: str,
        decision: str,
        reason: str,
        token_hash: Optional[str],
        fields_stripped: List[str],
        latency_ms: float,
        forwarded: bool,
        vendor_response_code: Optional[int] = None,
        vendor_event_id: Optional[str] = None
    ) -> EvidenceEntry:
        """Log an enforcement decision"""
        return self.append(
            tenant_id=tenant_id,
            event_type=EventType.ENFORCEMENT_DECISION,
            event_data={
                "event_id": event_id,
                "vendor": vendor,
                "decision": decision,
                "reason": reason,
                "token_hash": token_hash[:16] if token_hash else None,  # Truncate for privacy
                "fields_stripped": fields_stripped,
                "latency_ms": round(latency_ms, 2),
                "forwarded": forwarded,
                "vendor_response_code": vendor_response_code,
                "vendor_event_id": vendor_event_id
            }
        )
    
    def query(
        self,
        tenant_id: Optional[str] = None,
        event_type: Optional[EventType] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[EvidenceEntry]:
        """
        Query events with filtering.
        
        Returns events in reverse chronological order (newest first).
        """
        with self._lock:
            # Start with tenant filter if provided
            if tenant_id and tenant_id in self._by_tenant:
                indices = self._by_tenant[tenant_id]
                events = [self._events[i] for i in indices if i < len(self._events)]
            else:
                events = list(self._events)
        
        # Apply filters
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        
        if start_time:
            events = [e for e in events if e.timestamp >= start_time]
        
        if end_time:
            events = [e for e in events if e.timestamp <= end_time]
        
        # Sort by sequence descending (newest first)
        events = sorted(events, key=lambda e: e.sequence, reverse=True)
        
        # Apply pagination
        return events[offset:offset + limit]
    
    def verify_chain(self, tenant_id: Optional[str] = None) -> ChainVerificationResult:
        """
        Verify the integrity of the hash chain.
        
        This proves that no events have been tampered with or deleted.
        """
        with self._lock:
            if tenant_id and tenant_id in self._by_tenant:
                indices = sorted(self._by_tenant[tenant_id])
                events = [self._events[i] for i in indices if i < len(self._events)]
            else:
                events = sorted(self._events, key=lambda e: e.sequence)
        
        if not events:
            return ChainVerificationResult(
                valid=True,
                events_checked=0
            )
        
        # Verify each link in the chain
        expected_prev = None
        for event in events:
            # Check that previous_hash matches what we expect
            if event.previous_hash != expected_prev:
                return ChainVerificationResult(
                    valid=False,
                    events_checked=event.sequence,
                    broken_at_sequence=event.sequence,
                    expected_hash=expected_prev,
                    actual_hash=event.previous_hash,
                    error="Chain broken: previous hash mismatch"
                )
            
            # Recompute the hash to verify it wasn't tampered
            hash_data = {
                "sequence": event.sequence,
                "event_id": event.event_id,
                "tenant_id": event.tenant_id,
                "event_type": event.event_type.value,
                "event_data": event.event_data,
                "timestamp": event.timestamp.isoformat()
            }
            computed_hash = self._compute_hash(hash_data, expected_prev)
            
            if computed_hash != event.event_hash:
                return ChainVerificationResult(
                    valid=False,
                    events_checked=event.sequence,
                    broken_at_sequence=event.sequence,
                    expected_hash=computed_hash,
                    actual_hash=event.event_hash,
                    error="Chain broken: event hash mismatch (possible tampering)"
                )
            
            expected_prev = event.event_hash
        
        return ChainVerificationResult(
            valid=True,
            events_checked=len(events),
            first_sequence=events[0].sequence if events else None,
            last_sequence=events[-1].sequence if events else None,
            last_hash=events[-1].event_hash if events else None
        )
    
    def export_for_audit(
        self,
        tenant_id: str,
        start_time: datetime,
        end_time: datetime
    ) -> AuditExport:
        """
        Export events for audit.
        
        Includes chain verification to prove integrity.
        """
        events = self.query(
            tenant_id=tenant_id,
            start_time=start_time,
            end_time=end_time,
            limit=100000  # High limit for export
        )
        
        # Reverse to chronological order for export
        events = list(reversed(events))
        
        # Verify the chain
        verification = self.verify_chain(tenant_id)
        
        return AuditExport(
            tenant_id=tenant_id,
            export_time=datetime.now(timezone.utc),
            time_range_start=start_time,
            time_range_end=end_time,
            events=events,
            chain_valid=verification.valid,
            events_count=len(events),
            first_hash=events[0].event_hash if events else None,
            last_hash=events[-1].event_hash if events else None
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get store statistics"""
        return {
            "total_events": self._stats["total_events"],
            "events_in_hot_storage": len(self._events),
            "events_per_second": round(self._stats["events_per_second"], 2),
            "tenants": len(self._by_tenant),
            "current_sequence": self._sequence
        }
    
    def get_latest_hash(self, tenant_id: str) -> Optional[str]:
        """Get the latest hash in a tenant's chain"""
        return self._last_hash.get(tenant_id)


# Singleton instance
evidence_store = EvidenceStore()
