"""
Shared rate limiter (slowapi / limits, in-memory token bucket per process).

Scope: applied to the highest-value abuse targets — auth endpoints — where
per-account lockout (see auth_service.py) already exists but does nothing
to stop a single IP from credential-stuffing many different email addresses
or spamming account registration.

In-memory storage is fine for a single-process deployment. If this backend
is ever run with multiple workers/replicas behind a load balancer, point
`storage_uri` at Redis so limits are shared across processes:
    Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379")

Testing: the pytest suite registers many throwaway accounts from the same
TestClient "IP" in a single run, which would otherwise trip the register
limit almost immediately. Set TESTING=1 (done automatically by
tests/conftest.py) to disable enforcement without touching route code.
"""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address

_TESTING = os.getenv("TESTING", "").strip().lower() in ("1", "true", "yes")

limiter = Limiter(key_func=get_remote_address, enabled=not _TESTING)
