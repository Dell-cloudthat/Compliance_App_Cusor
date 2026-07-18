"""
Pure Python Okta IAM API client.

All methods are read-only — this client never writes to any Okta tenant.

Usage:
    client = OktaIAMClient(domain="your-org.okta.com", token="SSWS your-api-token")
    users  = client.list_users(limit=50, status="ACTIVE")
    counts = client.get_user_count()
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = 15  # seconds


class OktaIAMClient:
    """Thin wrapper around the Okta Users / Apps / Groups REST API (v1)."""

    def __init__(self, domain: str, token: str) -> None:
        """
        domain — e.g. "your-org.okta.com" (without https://)
        token  — Okta API token (SSWS prefix or plain token string)
        """
        self.base_url = f"https://{domain.rstrip('/')}/api/v1"
        # Normalise: Okta accepts both bare tokens and "SSWS <token>"
        self.headers = {
            "Authorization": token if token.startswith("SSWS ") else f"SSWS {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}{path}"
        resp = requests.get(url, headers=self.headers, params=params, timeout=_DEFAULT_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    def _paginate(self, path: str, limit: int, params: Optional[Dict[str, Any]] = None) -> List[Dict]:
        """Follow Okta link-header pagination until `limit` records are collected."""
        params = {**(params or {}), "limit": min(limit, 200)}
        results: List[Dict] = []
        url = f"{self.base_url}{path}"
        while url and len(results) < limit:
            resp = requests.get(url, headers=self.headers, params=params, timeout=_DEFAULT_TIMEOUT)
            resp.raise_for_status()
            batch = resp.json()
            results.extend(batch)
            # Clear params after first request — they're baked into the next link URL
            params = None
            next_link = None
            for link in resp.headers.get("Link", "").split(","):
                if 'rel="next"' in link:
                    next_link = link.split(";")[0].strip().strip("<>")
                    break
            url = next_link if next_link else None
        return results[:limit]

    # ── Public methods ────────────────────────────────────────────────────────

    def list_users(self, limit: int = 50, status: str = "ACTIVE") -> List[Dict[str, Any]]:
        """Return users with login, name, status, and last-login timestamp."""
        raw = self._paginate("/users", limit=limit, params={"filter": f'status eq "{status}"'})
        return [
            {
                "id": u.get("id"),
                "login": u.get("profile", {}).get("login"),
                "first_name": u.get("profile", {}).get("firstName"),
                "last_name": u.get("profile", {}).get("lastName"),
                "email": u.get("profile", {}).get("email"),
                "status": u.get("status"),
                "last_login": u.get("lastLogin"),
                "created": u.get("created"),
            }
            for u in raw
        ]

    def get_user_count(self) -> Dict[str, int]:
        """Return user counts by status."""
        statuses = ["ACTIVE", "DEPROVISIONED", "SUSPENDED", "LOCKED_OUT"]
        counts: Dict[str, int] = {}
        total = 0
        for status in statuses:
            try:
                # Use limit=1 and check if non-empty; for exact counts we'd need
                # Okta's reporting API — this is a best-effort approximation.
                batch = self._get(
                    "/users",
                    params={"filter": f'status eq "{status}"', "limit": 200},
                )
                count = len(batch) if isinstance(batch, list) else 0
            except Exception:
                count = 0
            key = status.lower()
            counts[key] = count
            total += count
        counts["total"] = total
        return counts

    def list_groups(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return IAM groups with names and descriptions."""
        raw = self._paginate("/groups", limit=limit)
        return [
            {
                "id": g.get("id"),
                "name": g.get("profile", {}).get("name"),
                "description": g.get("profile", {}).get("description"),
                "type": g.get("type"),
                "member_count": g.get("objectClass"),  # placeholder — full count needs separate call
            }
            for g in raw
        ]

    def mfa_adoption(self) -> Dict[str, Any]:
        """Return MFA factor enrollment statistics for the org."""
        try:
            active_users = self._get("/users", params={"filter": 'status eq "ACTIVE"', "limit": 200})
            if not isinstance(active_users, list):
                active_users = []
        except Exception:
            active_users = []

        total_active = len(active_users)
        mfa_enrolled = 0
        factor_type_counts: Dict[str, int] = {}

        for user in active_users:
            uid = user.get("id")
            if not uid:
                continue
            try:
                factors = self._get(f"/users/{uid}/factors")
                if not isinstance(factors, list):
                    factors = []
                active_factors = [f for f in factors if f.get("status") == "ACTIVE"]
                if active_factors:
                    mfa_enrolled += 1
                    for f in active_factors:
                        ftype = f.get("factorType", "unknown")
                        factor_type_counts[ftype] = factor_type_counts.get(ftype, 0) + 1
            except Exception:
                pass

        adoption_pct = round(mfa_enrolled / total_active * 100, 1) if total_active else 0.0
        return {
            "total_active_users": total_active,
            "mfa_enrolled": mfa_enrolled,
            "mfa_not_enrolled": total_active - mfa_enrolled,
            "mfa_adoption_pct": adoption_pct,
            "factor_types": factor_type_counts,
        }

    def inactive_users(self, days: int = 90, limit: int = 100) -> List[Dict[str, Any]]:
        """Return ACTIVE users who have not logged in for at least N days."""
        cutoff = datetime.now(tz=timezone.utc) - timedelta(days=days)
        raw = self._paginate("/users", limit=500, params={"filter": 'status eq "ACTIVE"'})
        inactive: List[Dict[str, Any]] = []
        for u in raw:
            last_login_str = u.get("lastLogin")
            if not last_login_str:
                inactive.append(self._format_user(u))
                continue
            try:
                last_login = datetime.fromisoformat(last_login_str.replace("Z", "+00:00"))
                if last_login < cutoff:
                    inactive.append(self._format_user(u))
            except ValueError:
                inactive.append(self._format_user(u))
        return inactive[:limit]

    def get_user_app_access(self, user_id: str) -> List[Dict[str, Any]]:
        """Return the applications assigned to a specific user."""
        raw = self._get(f"/users/{user_id}/appLinks")
        if not isinstance(raw, list):
            return []
        return [
            {
                "app_name": a.get("appName"),
                "label": a.get("label"),
                "link_url": a.get("linkUrl"),
                "logo_url": a.get("logoUrl"),
                "app_instance_id": a.get("appInstanceId"),
            }
            for a in raw
        ]

    def list_apps(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List configured IAM applications."""
        raw = self._paginate("/apps", limit=limit, params={"filter": 'status eq "ACTIVE"'})
        return [
            {
                "id": a.get("id"),
                "label": a.get("label"),
                "name": a.get("name"),
                "status": a.get("status"),
                "sign_on_mode": a.get("signOnMode"),
                "created": a.get("created"),
                "last_updated": a.get("lastUpdated"),
            }
            for a in raw
        ]

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _format_user(u: Dict) -> Dict[str, Any]:
        return {
            "id": u.get("id"),
            "login": u.get("profile", {}).get("login"),
            "email": u.get("profile", {}).get("email"),
            "first_name": u.get("profile", {}).get("firstName"),
            "last_name": u.get("profile", {}).get("lastName"),
            "status": u.get("status"),
            "last_login": u.get("lastLogin"),
        }
