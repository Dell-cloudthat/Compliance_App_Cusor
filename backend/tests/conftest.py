"""
Shared pytest fixtures.

The app runs against the local SQLite dev database (init_db creates all
tables on startup). Each test registers a unique throwaway user so runs
never collide with dev data or each other.
"""

import random
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(main.app) as c:
        yield c


@pytest.fixture()
def fresh_user(client):
    """Register a unique user; returns dict with token + auth headers."""
    email = f"pytest-{random.randint(100000, 999999)}@test.local"
    resp = client.post(
        "/api/auth/register",
        json={
            "name": "Pytest User",
            "email": email,
            "password": "pytest-password-123",
            "organization": "Pytest Org",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    token = data["access_token"]
    return {
        "email": email,
        "password": "pytest-password-123",
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }
