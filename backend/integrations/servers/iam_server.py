"""
IAM MCP Server — using the official Anthropic MCP Python SDK
(mcp.server.fastmcp, not the third-party fastmcp package)

Auth pattern (spec §"Required auth pattern")
--------------------------------------------
• No user_id tool parameter — resolved server-side from the JWT Bearer token.
• A Starlette middleware wraps the MCP sub-app and sets `_request_user_id`
  (a contextvars.ContextVar) before the MCP protocol layer runs.
• Cross-tenant access is structurally impossible: the server determines whose
  token it is; it is never told by the caller.
• Both consumers — an AI agent (via HTTP/SSE) and the FastAPI backend
  (direct in-process call) — use the same code path.

Vendor dispatch
---------------
Tools use the iam_ prefix.  Currently Okta; Azure AD / Google Workspace
follow behind the same tool names with vendor dispatch inside the tools.

Mounting
--------
    from integrations.servers.iam_server import create_iam_app, add_iam_auth_middleware
    add_iam_auth_middleware(app)
    app.mount("/mcp/iam", create_iam_app())

Direct in-process calls (trust.py, violations.py)
--------------------------------------------------
    from integrations.servers.iam_server import _request_user_id, iam_mfa_adoption
    ctx = _request_user_id.set(user_id)
    try:
        result = await iam_mfa_adoption()
    finally:
        _request_user_id.reset(ctx)
"""

import contextvars
import logging
import sqlite3
from typing import Any, Dict, List, Optional

from mcp.server.fastmcp import FastMCP

from database import DB_PATH
from integrations.clients.okta_iam import OktaIAMClient

logger = logging.getLogger(__name__)

# ─── Per-request user context ─────────────────────────────────────────────────
_request_user_id: contextvars.ContextVar[int] = contextvars.ContextVar(
    "iam_request_user_id"
)

# ─── MCP server ───────────────────────────────────────────────────────────────
mcp = FastMCP(
    name="compliance-iam",
    instructions=(
        "Read-only IAM integration tools for compliance assessment and Trust Score "
        "calculation. Authentication via JWT Bearer token — user identity is resolved "
        "server-side, never supplied as a tool parameter. "
        "All tools are read-only: this server never writes to any IAM tenant."
    ),
)

# ─── Credential lookup ────────────────────────────────────────────────────────

def _decrypt(ciphertext: str) -> str:
    from routes.credentials import decrypt
    return decrypt(ciphertext)


def _load_iam_client(user_id: int) -> OktaIAMClient:
    """
    Look up the tenant's stored IAM credential and return an authenticated client.
    Vendor dispatch: Okta now; Azure AD / Google Workspace follow.
    """
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """SELECT vendor, encrypted_credential
               FROM integration_credentials
               WHERE user_id = ? AND vendor IN ('okta','azure_ad','google_workspace')
                 AND status = 'active'
               ORDER BY CASE vendor
                 WHEN 'okta' THEN 1 WHEN 'azure_ad' THEN 2 ELSE 3
               END LIMIT 1""",
            (user_id,),
        ).fetchone()
    except sqlite3.OperationalError as e:
        if "no such table" in str(e):
            # Fresh deployment — nobody has connected any integration yet.
            row = None
        else:
            raise
    finally:
        conn.close()

    if not row:
        raise ValueError(
            "No active IAM credential found. "
            "Connect Okta (or Azure AD / Google Workspace) at Settings → Integrations."
        )

    vendor = row["vendor"]
    plaintext = _decrypt(row["encrypted_credential"])

    if vendor == "okta":
        if "::" not in plaintext:
            raise ValueError(
                "Okta credential must be stored as 'domain.okta.com::API_TOKEN'. "
                "Re-connect the integration to update the format."
            )
        domain, token = plaintext.split("::", 1)
        return OktaIAMClient(domain=domain, token=token)

    raise ValueError(
        f"IAM vendor '{vendor}' not yet supported. Currently supported: okta."
    )


def _get_client() -> OktaIAMClient:
    """Resolve the calling user from contextvar and return their IAM client."""
    try:
        uid = _request_user_id.get()
    except LookupError:
        raise ValueError(
            "No authenticated user context. "
            "Include 'Authorization: Bearer <JWT>' in the request."
        )
    return _load_iam_client(uid)


def _safe(fn, *args, **kwargs) -> Any:
    try:
        return fn(*args, **kwargs)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(
            f"IAM API call failed: {exc}. "
            "Verify the credential is still valid at Settings → Integrations."
        ) from exc


# ─── Tools (all readOnlyHint=True) ───────────────────────────────────────────

@mcp.tool(
    description=(
        "List IAM users with login, name, status, and last-login timestamp. "
        "Primary consumer: Wizard 'who has access to this AI system' questions. "
        "readOnlyHint: true — never modifies any IAM tenant."
    ),
    annotations={"readOnlyHint": True, "destructiveHint": False},
)
async def iam_list_users(
    limit: int = 50,
    status: str = "ACTIVE",
) -> List[Dict[str, Any]]:
    """
    limit  — max users to return (1–200)
    status — ACTIVE | DEPROVISIONED | SUSPENDED
    """
    client = _get_client()
    return _safe(client.list_users, limit=min(limit, 200), status=status)


@mcp.tool(
    description=(
        "Return user counts by status (ACTIVE, DEPROVISIONED, SUSPENDED, LOCKED_OUT). "
        "Primary consumer: Trust Score AI & ML Protection pillar. "
        "readOnlyHint: true."
    ),
    annotations={"readOnlyHint": True, "destructiveHint": False},
)
async def iam_get_user_count() -> Dict[str, int]:
    client = _get_client()
    return _safe(client.get_user_count)


@mcp.tool(
    description=(
        "List IAM groups with names and descriptions. "
        "Primary consumer: Wizard scoping questions (which groups own AI systems). "
        "readOnlyHint: true."
    ),
    annotations={"readOnlyHint": True, "destructiveHint": False},
)
async def iam_list_groups(limit: int = 50) -> List[Dict[str, Any]]:
    """limit — max groups to return (1–200)."""
    client = _get_client()
    return _safe(client.list_groups, limit=min(limit, 200))


@mcp.tool(
    description=(
        "MFA factor enrollment statistics for the org: total_active_users, "
        "mfa_enrolled, mfa_adoption_pct, factor_types. "
        "Primary consumer: Trust Score Security Coverage pillar. "
        "readOnlyHint: true."
    ),
    annotations={"readOnlyHint": True, "destructiveHint": False},
)
async def iam_mfa_adoption() -> Dict[str, Any]:
    client = _get_client()
    return _safe(client.mfa_adoption)


@mcp.tool(
    description=(
        "Return ACTIVE users who have not logged in for at least N days. "
        "Primary consumer: Roadmap gap flagging and violation source ingestion. "
        "readOnlyHint: true."
    ),
    annotations={"readOnlyHint": True, "destructiveHint": False},
)
async def iam_inactive_users(
    days: int = 90,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    days  — inactivity threshold in days
    limit — max users to return (1–200)
    """
    client = _get_client()
    return _safe(client.inactive_users, days=days, limit=min(limit, 200))


@mcp.tool(
    description=(
        "Return the applications assigned to a specific user. "
        "Primary consumer: Wizard per-AI-tool access mapping. "
        "readOnlyHint: true."
    ),
    annotations={"readOnlyHint": True, "destructiveHint": False},
)
async def iam_get_user_app_access(
    vendor_user_id: str,
) -> List[Dict[str, Any]]:
    """
    vendor_user_id — the IAM vendor's internal user ID
                     (from iam_list_users results — NOT the platform user_id).
    """
    client = _get_client()
    return _safe(client.get_user_app_access, user_id=vendor_user_id)


@mcp.tool(
    description=(
        "List configured IAM applications (label, sign-on mode, status). "
        "Primary consumer: Wizard — detecting existing AI/SaaS tools. "
        "readOnlyHint: true."
    ),
    annotations={"readOnlyHint": True, "destructiveHint": False},
)
async def iam_list_apps(limit: int = 50) -> List[Dict[str, Any]]:
    """limit — max apps to return (1–200)."""
    client = _get_client()
    return _safe(client.list_apps, limit=min(limit, 200))


# ─── ASGI app factory ─────────────────────────────────────────────────────────

def create_iam_app():
    """
    Return the Starlette ASGI app for mounting at /mcp/iam.
    Use MCP Inspector to verify: npx @modelcontextprotocol/inspector http://localhost:8000/mcp/iam
    """
    return mcp.streamable_http_app()


def add_iam_auth_middleware(fastapi_app) -> None:
    """
    Add a Starlette/FastAPI middleware that:
    1. Intercepts all /mcp/* requests
    2. Validates the JWT Bearer token using the platform's existing auth service
    3. Sets _request_user_id in a contextvars.ContextVar before the request proceeds
    4. Rejects missing/invalid/expired tokens with 401

    This makes cross-tenant access structurally impossible — the server resolves
    whose token it is; the caller never supplies a user_id.

    Call once in main.py:
        from integrations.servers.iam_server import add_iam_auth_middleware
        add_iam_auth_middleware(app)
    """
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.responses import JSONResponse

    class MCPJWTMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            if not request.url.path.startswith("/mcp/"):
                return await call_next(request)

            auth_header = request.headers.get("Authorization", "")
            token = auth_header.removeprefix("Bearer ").strip()

            if not token:
                return JSONResponse(
                    {
                        "error": "Missing JWT token.",
                        "detail": (
                            "Include 'Authorization: Bearer <token>' in your request. "
                            "Obtain a token via POST /api/auth/login."
                        ),
                    },
                    status_code=401,
                )

            try:
                from jose import JWTError, jwt as jose_jwt
                from services.auth_service import SECRET_KEY, ALGORITHM

                payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                uid_str = payload.get("sub")
                if uid_str is None:
                    raise JWTError("Missing sub claim")
                uid = int(uid_str)
            except Exception as exc:
                logger.warning("MCP JWT validation failed: %s", exc)
                return JSONResponse(
                    {"error": "Invalid or expired JWT token."},
                    status_code=401,
                )

            ctx_token = _request_user_id.set(uid)
            try:
                response = await call_next(request)
            finally:
                _request_user_id.reset(ctx_token)
            return response

    fastapi_app.add_middleware(MCPJWTMiddleware)
