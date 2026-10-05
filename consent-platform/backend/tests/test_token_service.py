"""
Unit tests for the Token Service.

Tests cover:
- Tenant key registration
- Token issuance (happy path)
- Token validation (valid, expired, revoked)
- Token revocation (single + bulk)
- Duplicate / cross-tenant isolation
"""

import sys
import os

# Add the backend directory to sys.path so imports work without installing the package
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from services.token_service import (
    token_service,
    ConsentTokenRequest,
    PurposeConsent,
    VendorConsent,
    ConsentConstraints,
    Jurisdiction,
    TokenStatus,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def unique_tenant(prefix: str = "t") -> str:
    """Generate a unique tenant ID to avoid cross-test pollution."""
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _register(tenant_id: str) -> None:
    token_service.register_tenant(tenant_id)


def _make_request(
    subject="user-abc",
    purposes=None,
    vendors=None,
    jurisdiction=Jurisdiction.GDPR,
    ttl_days=14,
):
    if purposes is None:
        purposes = {"analytics": PurposeConsent(allowed=True, ttl_days=30)}
    if vendors is None:
        vendors = {"meta": VendorConsent(allowed=True, data_classes=["behavioral"])}
    return ConsentTokenRequest(
        subject_id=subject,
        purposes=purposes,
        vendors=vendors,
        jurisdiction=jurisdiction,
        ttl_days=ttl_days,
    )


# ---------------------------------------------------------------------------
# Tenant registration
# ---------------------------------------------------------------------------

class TestTenantRegistration:
    def test_register_returns_keys(self):
        keys = token_service.register_tenant(unique_tenant("reg"))
        assert "public_key" in keys
        assert keys["public_key"].startswith("-----BEGIN")

    def test_register_already_registered_raises(self):
        tid = unique_tenant("dup")
        token_service.register_tenant(tid)
        with pytest.raises(ValueError, match="already registered"):
            token_service.register_tenant(tid)

    def test_get_public_key_after_register(self):
        tid = unique_tenant("getpk")
        token_service.register_tenant(tid)
        pk = token_service.get_public_key(tid)
        assert pk is not None
        assert "-----BEGIN" in pk

    def test_get_public_key_unknown_tenant(self):
        pk = token_service.get_public_key("nonexistent-tenant-xyz")
        assert pk is None


# ---------------------------------------------------------------------------
# Token issuance
# ---------------------------------------------------------------------------

class TestTokenIssuance:
    def setup_method(self):
        self.tenant = unique_tenant("issue")
        _register(self.tenant)

    def test_issue_returns_token(self):
        req = _make_request()
        tok = token_service.issue_token(self.tenant, req)
        assert tok.token is not None
        assert len(tok.token) > 20
        assert tok.status == TokenStatus.ACTIVE

    def test_token_has_correct_subject(self):
        req = _make_request(subject="specific-user-123")
        tok = token_service.issue_token(self.tenant, req)
        assert tok.subject_id == "specific-user-123"

    def test_token_has_correct_purposes(self):
        purposes = {
            "retargeting": PurposeConsent(allowed=True, ttl_days=14),
            "analytics": PurposeConsent(allowed=False),
        }
        req = _make_request(purposes=purposes)
        tok = token_service.issue_token(self.tenant, req)
        assert tok.purposes["retargeting"].allowed is True
        assert tok.purposes["analytics"].allowed is False

    def test_token_has_correct_vendors(self):
        vendors = {
            "meta": VendorConsent(allowed=True, data_classes=["behavioral", "device"]),
            "google": VendorConsent(allowed=False, data_classes=[]),
        }
        req = _make_request(vendors=vendors)
        tok = token_service.issue_token(self.tenant, req)
        assert "meta" in tok.vendors
        assert tok.vendors["meta"].allowed is True
        assert "behavioral" in tok.vendors["meta"].data_classes
        assert tok.vendors["google"].allowed is False

    def test_token_expiry_set_from_ttl(self):
        req = _make_request(ttl_days=7)
        tok = token_service.issue_token(self.tenant, req)
        now = datetime.now(timezone.utc)
        delta = tok.expires_at - now
        assert 6.9 < delta.total_seconds() / 86400 < 7.1  # ≈ 7 days

    def test_unknown_tenant_raises(self):
        with pytest.raises(ValueError, match="not registered"):
            token_service.issue_token("nonexistent-xyz", _make_request())


# ---------------------------------------------------------------------------
# Token validation
# ---------------------------------------------------------------------------

class TestTokenValidation:
    def setup_method(self):
        self.tenant = unique_tenant("valid")
        _register(self.tenant)

    def test_valid_token_passes(self):
        tok = token_service.issue_token(self.tenant, _make_request())
        result = token_service.validate_token(self.tenant, tok.token)
        assert result.valid is True
        assert result.status == TokenStatus.ACTIVE

    def test_validate_returns_purposes(self):
        req = _make_request(
            purposes={"analytics": PurposeConsent(allowed=True)},
            vendors={"ga": VendorConsent(allowed=True, data_classes=["behavioral"])},
        )
        tok = token_service.issue_token(self.tenant, req)
        result = token_service.validate_token(self.tenant, tok.token)
        assert "analytics" in result.purposes

    def test_tampered_token_fails(self):
        tok = token_service.issue_token(self.tenant, _make_request())
        tampered = tok.token[:-4] + "xxxx"
        result = token_service.validate_token(self.tenant, tampered)
        assert result.valid is False

    def test_wrong_tenant_fails(self):
        other = unique_tenant("other")
        _register(other)
        tok = token_service.issue_token(self.tenant, _make_request())
        result = token_service.validate_token(other, tok.token)
        assert result.valid is False

    def test_malformed_token_fails(self):
        result = token_service.validate_token(self.tenant, "not.a.jwt.at.all")
        assert result.valid is False

    def test_empty_string_fails(self):
        result = token_service.validate_token(self.tenant, "")
        assert result.valid is False


# ---------------------------------------------------------------------------
# Token revocation
# ---------------------------------------------------------------------------

class TestTokenRevocation:
    def setup_method(self):
        self.tenant = unique_tenant("revoke")
        _register(self.tenant)

    def test_revoke_marks_token_invalid(self):
        tok = token_service.issue_token(self.tenant, _make_request())
        revoked = token_service.revoke_token(self.tenant, tok.token_id, reason="user_request")
        assert revoked is True

        result = token_service.validate_token(self.tenant, tok.token)
        assert result.valid is False

    def test_revoke_nonexistent_returns_true(self):
        # The service adds the ID to the revoked set regardless of whether it
        # exists in the cache (to handle tokens that weren't stored locally).
        revoked = token_service.revoke_token(self.tenant, "nonexistent-token-id")
        assert revoked is True

    def test_revoke_all_for_subject(self):
        subject = f"bulk-user-{uuid.uuid4().hex[:6]}"
        tok1 = token_service.issue_token(self.tenant, _make_request(subject=subject))
        tok2 = token_service.issue_token(self.tenant, _make_request(subject=subject))
        count = token_service.revoke_all_for_subject(self.tenant, subject)
        assert count >= 2

        r1 = token_service.validate_token(self.tenant, tok1.token)
        r2 = token_service.validate_token(self.tenant, tok2.token)
        assert r1.valid is False
        assert r2.valid is False


# ---------------------------------------------------------------------------
# Token listing
# ---------------------------------------------------------------------------

class TestTokenListing:
    def setup_method(self):
        self.tenant = unique_tenant("list")
        _register(self.tenant)

    def test_list_tokens_returns_issued(self):
        req = _make_request(subject="list-user-1")
        tok = token_service.issue_token(self.tenant, req)
        tokens = token_service.list_tokens(self.tenant)
        ids = [t.token_id for t in tokens]
        assert tok.token_id in ids

    def test_list_tokens_by_subject(self):
        subject = f"filter-subject-{uuid.uuid4().hex[:6]}"
        t1 = token_service.issue_token(self.tenant, _make_request(subject=subject))
        t2 = token_service.issue_token(self.tenant, _make_request(subject="other-subject"))
        by_subject = token_service.list_tokens(self.tenant, subject_id=subject)
        ids = [t.token_id for t in by_subject]
        assert t1.token_id in ids
        assert t2.token_id not in ids

