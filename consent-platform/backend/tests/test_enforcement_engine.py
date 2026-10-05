"""
Unit tests for the Enforcement Engine.

Tests cover:
- ALLOW decision (valid token, matching vendor + purpose)
- BLOCK: missing token (fail_closed)
- BLOCK: invalid token
- BLOCK: vendor not allowed
- BLOCK: purpose not allowed
- MODIFY: disallowed data class stripped
- MODIFY: constraint enforcement
- Fail-open mode (no token)
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
import pytest
from services.token_service import (
    token_service,
    ConsentTokenRequest,
    PurposeConsent,
    VendorConsent,
    ConsentConstraints,
    Jurisdiction,
    TokenStatus,
)
from services.enforcement_engine import (
    EnforcementEngine,
    AdEvent,
    Decision,
    BlockReason,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TENANT = f"enforce-test-{uuid.uuid4().hex[:8]}"


@pytest.fixture(autouse=True, scope="module")
def register_tenant():
    token_service.register_tenant(TENANT)


def _make_token(
    vendor: str = "meta",
    vendor_allowed: bool = True,
    purposes: dict = None,
    data_classes: list = None,
    constraints: ConsentConstraints = None,
) -> str:
    if purposes is None:
        # "page_view" maps to "analytics" in EVENT_PURPOSE_MAP
        purposes = {"analytics": PurposeConsent(allowed=True, ttl_days=30)}
    if data_classes is None:
        data_classes = ["behavioral"]

    req = ConsentTokenRequest(
        subject_id="test-subject",
        purposes=purposes,
        vendors={vendor: VendorConsent(allowed=vendor_allowed, data_classes=data_classes)},
        jurisdiction=Jurisdiction.GDPR,
        ttl_days=14,
        constraints=constraints,
    )
    return token_service.issue_token(TENANT, req).token


def _make_event(
    event_type: str = "page_view",  # maps to "analytics"
    vendor: str = "meta",
    data_classes: list = None,
    user_id: str = "uid-123",
    ip_address: str = "1.2.3.4",
    external_id: str = None,
    is_cross_site: bool = False,
) -> AdEvent:
    return AdEvent(
        event_id="evt-test-001",
        event_type=event_type,
        vendor=vendor,
        data_classes=data_classes or ["behavioral"],
        user_id=user_id,
        ip_address=ip_address,
        external_id=external_id,
        is_cross_site=is_cross_site,
    )


# ---------------------------------------------------------------------------
# Basic decisions
# ---------------------------------------------------------------------------

class TestAllowDecision:
    engine = EnforcementEngine()

    def test_allow_with_valid_token(self):
        token = _make_token()
        event = _make_event()
        result = self.engine.enforce(TENANT, event, token)
        assert result.decision == Decision.ALLOWED
        assert result.token_valid is True

    def test_allow_sets_latency(self):
        token = _make_token()
        result = self.engine.enforce(TENANT, _make_event(), token)
        assert result.latency_ms >= 0

    def test_allow_sets_original_hash(self):
        token = _make_token()
        result = self.engine.enforce(TENANT, _make_event(), token)
        assert result.original_event_hash is not None
        assert len(result.original_event_hash) > 8


class TestBlockDecisions:
    engine = EnforcementEngine(failure_mode="fail_closed")

    def test_block_missing_token(self):
        result = self.engine.enforce(TENANT, _make_event(), None)
        assert result.decision == Decision.BLOCKED
        assert result.reason == BlockReason.TOKEN_MISSING

    def test_block_empty_string_token(self):
        result = self.engine.enforce(TENANT, _make_event(), "")
        assert result.decision == Decision.BLOCKED

    def test_block_invalid_token(self):
        result = self.engine.enforce(TENANT, _make_event(), "totally.invalid.jwt")
        assert result.decision == Decision.BLOCKED
        assert result.token_valid is False

    def test_block_vendor_not_in_token(self):
        token = _make_token(vendor="meta")
        event = _make_event(vendor="google")  # not in token
        result = self.engine.enforce(TENANT, event, token)
        assert result.decision == Decision.BLOCKED
        assert result.reason == BlockReason.VENDOR_NOT_ALLOWED

    def test_block_vendor_explicitly_denied(self):
        token = _make_token(vendor="meta", vendor_allowed=False)
        event = _make_event(vendor="meta")
        result = self.engine.enforce(TENANT, event, token)
        assert result.decision == Decision.BLOCKED
        assert result.reason == BlockReason.VENDOR_NOT_ALLOWED

    def test_block_purpose_not_allowed(self):
        # Token only allows "analytics" but event maps to "retargeting"
        # add_to_cart → retargeting; token only has analytics → BLOCK
        token = _make_token(
            purposes={"analytics": PurposeConsent(allowed=True)},
            vendor="meta",
        )
        event = _make_event(event_type="add_to_cart")  # maps to retargeting
        result = self.engine.enforce(TENANT, event, token)
        assert result.decision == Decision.BLOCKED
        assert result.reason == BlockReason.PURPOSE_NOT_ALLOWED


# ---------------------------------------------------------------------------
# Data-class stripping (MODIFY)
# ---------------------------------------------------------------------------

class TestModifyDecision:
    engine = EnforcementEngine()

    def test_strip_disallowed_data_class(self):
        # Token only allows "behavioral" data class; event also carries "identity"
        token = _make_token(data_classes=["behavioral"])
        event = _make_event(data_classes=["behavioral", "identity"])
        event.hashed_email = "abc@example.com"
        result = self.engine.enforce(TENANT, event, token)
        assert result.decision == Decision.MODIFIED
        assert len(result.fields_stripped) > 0
        assert "identity" in result.data_classes_removed

    def test_modified_event_excludes_stripped_fields(self):
        token = _make_token(data_classes=["behavioral"])
        event = _make_event(data_classes=["behavioral", "location"])
        event.ip_address = "192.168.0.1"
        result = self.engine.enforce(TENANT, event, token)
        if result.modified_event:
            assert result.modified_event.get("ip_address") is None


# ---------------------------------------------------------------------------
# Constraint enforcement
# ---------------------------------------------------------------------------

class TestConstraints:
    engine = EnforcementEngine()

    def test_no_enrichment_strips_external_id(self):
        constraints = ConsentConstraints(no_enrichment=True)
        # Token grants analytics for page_view + no_enrichment constraint
        token = _make_token(
            purposes={"analytics": PurposeConsent(allowed=True)},
            constraints=constraints,
        )
        event = _make_event(external_id="ext-999")  # page_view → analytics → allowed
        result = self.engine.enforce(TENANT, event, token)
        assert "external_id" in result.fields_stripped


# ---------------------------------------------------------------------------
# Fail-open mode
# ---------------------------------------------------------------------------

class TestFailOpen:
    engine = EnforcementEngine(failure_mode="fail_open")

    def test_no_token_fail_open_modifies(self):
        result = self.engine.enforce(TENANT, _make_event(), None)
        assert result.decision == Decision.MODIFIED
        assert result.reason == "no_token_fail_open"

    def test_fail_open_strips_pii(self):
        event = _make_event(user_id="sensitive-uid", ip_address="1.2.3.4")
        result = self.engine.enforce(TENANT, event, None)
        if result.modified_event:
            assert result.modified_event.get("user_id") is None
            assert result.modified_event.get("ip_address") is None
