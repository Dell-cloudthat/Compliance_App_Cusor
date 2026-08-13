"""
Rate limiting on auth endpoints.

The shared `client` fixture runs with the limiter disabled (see conftest.py
/ services.rate_limit's TESTING check) so the rest of the suite isn't
throttled by its own repeated registrations. These tests toggle
`limiter.enabled` on directly to verify the enforcement path end to end,
then restore it — re-importing `main` is avoided because the MCP
StreamableHTTPSessionManager it wires up is a run-once singleton.
"""

import pytest

from services.rate_limit import limiter


@pytest.fixture()
def rate_limiting_enabled():
    limiter.enabled = True
    try:
        yield
    finally:
        limiter.enabled = False


def test_login_is_rate_limited_per_ip(client, rate_limiting_enabled):
    codes = [
        client.post(
            "/api/auth/login", json={"email": "nobody@test.io", "password": "wrong"}
        ).status_code
        for _ in range(12)
    ]
    assert 401 in codes  # normal rejection path still works
    assert 429 in codes  # and eventually the IP gets throttled


def test_register_is_rate_limited_per_ip(client, rate_limiting_enabled):
    import random
    codes = []
    for _ in range(12):
        email = f"ratelimit-{random.randint(1, 10_000_000)}@test.local"
        resp = client.post("/api/auth/register", json={
            "name": "RL Test", "email": email,
            "password": "pytest-password-123", "organization": "X",
        })
        codes.append(resp.status_code)
    assert 429 in codes


def test_disabled_by_default_in_test_suite(client):
    """Sanity check: outside the rate_limiting_enabled fixture, the limiter
    must stay off so the rest of the suite's repeated registrations aren't
    throttled."""
    assert limiter.enabled is False
