"""
SecurityOS Evidence Confidence Hierarchy

All confidence values are configurable — override via environment variables.
Nothing outside this module should hard-code the numeric weights.

Evidence Type Hierarchy (highest → lowest confidence):

  DIRECT_AUTOMATED       SecurityOS queried the source API directly
  INTEGRATED_THIRD_PARTY Connected third-party platform provided the evidence
  ATTESTED_THIRD_PARTY   User explicitly attested that a named platform covers the control
  MANUAL                 User self-attested without naming a specific platform
  UNKNOWN                No evidence gathered
  FAIL                   Control is known-failing (regardless of evidence)

Override any value via environment variable:
  SECURITYOS_CONF_DIRECT_AUTOMATED=1.0
  SECURITYOS_CONF_INTEGRATED_THIRD_PARTY=0.9
  SECURITYOS_CONF_ATTESTED_THIRD_PARTY=0.7
  SECURITYOS_CONF_MANUAL=0.5
  SECURITYOS_CONF_UNKNOWN=0.0
  SECURITYOS_CONF_FAIL=0.0
"""

from __future__ import annotations
import os
from enum import Enum
from typing import Dict


class EvidenceType(str, Enum):
    DIRECT_AUTOMATED        = "direct_automated"
    INTEGRATED_THIRD_PARTY  = "integrated_third_party"
    ATTESTED_THIRD_PARTY    = "attested_third_party"
    MANUAL                  = "manual"
    UNKNOWN                 = "unknown"
    FAIL                    = "fail"


_DEFAULTS: Dict[EvidenceType, float] = {
    EvidenceType.DIRECT_AUTOMATED:       1.00,
    EvidenceType.INTEGRATED_THIRD_PARTY: 0.90,
    EvidenceType.ATTESTED_THIRD_PARTY:   0.70,
    EvidenceType.MANUAL:                 0.50,
    EvidenceType.UNKNOWN:                0.00,
    EvidenceType.FAIL:                   0.00,
}

# Legacy source strings → EvidenceType (backward compatibility with existing data)
_LEGACY_MAP: Dict[str, EvidenceType] = {
    # Old strings still used in existing control_statuses records
    "automatic":  EvidenceType.DIRECT_AUTOMATED,
    "manual":     EvidenceType.MANUAL,
    "inferred":   EvidenceType.MANUAL,
    "none":       EvidenceType.UNKNOWN,
    # New canonical strings
    "direct_automated":       EvidenceType.DIRECT_AUTOMATED,
    "integrated_third_party": EvidenceType.INTEGRATED_THIRD_PARTY,
    "attested_third_party":   EvidenceType.ATTESTED_THIRD_PARTY,
    "attested":               EvidenceType.ATTESTED_THIRD_PARTY,
    "unknown":                EvidenceType.UNKNOWN,
    "fail":                   EvidenceType.FAIL,
}

EVIDENCE_TYPE_LABEL: Dict[EvidenceType, str] = {
    EvidenceType.DIRECT_AUTOMATED:       "Directly Automated",
    EvidenceType.INTEGRATED_THIRD_PARTY: "Third-Party Integration",
    EvidenceType.ATTESTED_THIRD_PARTY:   "Attested Third-Party Coverage",
    EvidenceType.MANUAL:                 "Manual",
    EvidenceType.UNKNOWN:                "Unverified",
    EvidenceType.FAIL:                   "Failing",
}

EVIDENCE_TYPE_BADGE: Dict[EvidenceType, str] = {
    EvidenceType.DIRECT_AUTOMATED:       "Auto-Verified",
    EvidenceType.INTEGRATED_THIRD_PARTY: "Integration",
    EvidenceType.ATTESTED_THIRD_PARTY:   "Attested",
    EvidenceType.MANUAL:                 "Manual",
    EvidenceType.UNKNOWN:                "Unverified",
    EvidenceType.FAIL:                   "Failing",
}


def _load_confidence() -> Dict[EvidenceType, float]:
    conf: Dict[EvidenceType, float] = dict(_DEFAULTS)
    for ev_type in EvidenceType:
        env_key = f"SECURITYOS_CONF_{ev_type.value.upper()}"
        raw = os.environ.get(env_key)
        if raw:
            try:
                val = float(raw)
                if 0.0 <= val <= 1.0:
                    conf[ev_type] = val
            except ValueError:
                pass
    return conf


# Module-level map — loaded once at import time
EVIDENCE_CONFIDENCE: Dict[EvidenceType, float] = _load_confidence()


def resolve_evidence_type(source: str) -> EvidenceType:
    """Map any evidence source string (old or new) to a canonical EvidenceType."""
    return _LEGACY_MAP.get(source, EvidenceType.UNKNOWN)


def get_confidence(source: str) -> float:
    """Get the numeric confidence weight for any evidence source string."""
    ev = resolve_evidence_type(source)
    return EVIDENCE_CONFIDENCE.get(ev, 0.0)


def is_attested(source: str) -> bool:
    return resolve_evidence_type(source) == EvidenceType.ATTESTED_THIRD_PARTY


def is_automated(source: str) -> bool:
    et = resolve_evidence_type(source)
    return et in (EvidenceType.DIRECT_AUTOMATED, EvidenceType.INTEGRATED_THIRD_PARTY)
