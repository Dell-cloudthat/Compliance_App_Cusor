"""
JWT-based authentication service.

Provides user registration, credential verification, and a FastAPI dependency
(get_current_user) that validates a Bearer token and returns the authenticated
user's integer id.

Environment variables
---------------------
JWT_SECRET_KEY   Secret used to sign tokens. Generate a long random string for
                 production (e.g. `openssl rand -hex 32`).
JWT_ALGORITHM    Signing algorithm (default: HS256).
ACCESS_TOKEN_EXPIRE_MINUTES  Token lifetime in minutes (default: 60).
"""

import logging
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from jose import JWTError, jwt
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_SECRET_KEY_FILE = Path(__file__).parent.parent / ".jwt_secret_key"

def _resolve_secret_key() -> str:
    """Return the JWT signing secret.

    Resolution order:
    1. ``JWT_SECRET_KEY`` environment variable  (required for production).
    2. Persisted key in ``.jwt_secret_key`` file next to the backend root
       (auto-created on first run; survives restarts; NOT committed to git).
    3. Freshly generated random key saved to that file.

    A startup warning is printed whenever the env var is absent so that the
    situation is obvious in logs before anything goes wrong in production.
    """
    key = os.getenv("JWT_SECRET_KEY")
    if key:
        return key

    if _SECRET_KEY_FILE.exists():
        key = _SECRET_KEY_FILE.read_text().strip()
        if key:
            logger.warning(
                "\n"
                "⚠️  JWT_SECRET_KEY env var is not set.\n"
                "   Using the persisted key from: %s\n"
                "   Set JWT_SECRET_KEY in your environment before deploying to production.",
                _SECRET_KEY_FILE,
            )
            return key

    # First boot — generate and persist
    key = secrets.token_hex(32)
    _SECRET_KEY_FILE.write_text(key)
    logger.warning(
        "\n"
        "⚠️  JWT_SECRET_KEY env var is not set.\n"
        "   A random signing key was generated and saved to: %s\n"
        "   Add this file to .gitignore and set JWT_SECRET_KEY before deploying to production.\n"
        "   Tokens will remain valid across restarts as long as that file exists.",
        _SECRET_KEY_FILE,
    )
    return key


SECRET_KEY = _resolve_secret_key()
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

DB_PATH = Path(__file__).parent.parent / "database" / "compliance.db"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def register_user(name: str, email: str, password: str, organization: Optional[str] = None) -> dict:
    """Create a new user account and return a JWT access token."""
    conn = _get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with that email already exists.",
            )

        password_hash = _hash_password(password)
        cursor = conn.execute(
            """
            INSERT INTO users (name, email, password_hash, organization, is_active,
                               failed_login_attempts, plan, role)
            VALUES (?, ?, ?, ?, 1, 0, 'free', 'viewer')
            """,
            (name, email, password_hash, organization),
        )
        conn.commit()
        user_id = cursor.lastrowid
    finally:
        conn.close()

    token = _create_access_token(user_id)
    return {"access_token": token, "token_type": "bearer", "user_id": user_id}


def authenticate_user(email: str, password: str) -> dict:
    """Verify credentials and return a JWT access token."""
    conn = _get_db()
    try:
        row = conn.execute(
            """
            SELECT id, password_hash, is_active, failed_login_attempts, locked_until
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        user_id = row["id"]

        # Account lock check
        if row["locked_until"]:
            locked_until = datetime.fromisoformat(row["locked_until"])
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < locked_until:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is temporarily locked due to too many failed login attempts.",
                )

        if not row["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled.",
            )

        if not _verify_password(password, row["password_hash"]):
            # Increment failed attempts and potentially lock account
            new_attempts = row["failed_login_attempts"] + 1
            lock_until = None
            if new_attempts >= MAX_FAILED_ATTEMPTS:
                lock_until = (
                    datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
                ).isoformat()
            conn.execute(
                "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
                (new_attempts, lock_until, user_id),
            )
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        # Successful login — reset failed attempts
        conn.execute(
            "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
            (user_id,),
        )
        conn.commit()
    finally:
        conn.close()

    token = _create_access_token(user_id)
    return {"access_token": token, "token_type": "bearer", "user_id": user_id}


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> int:
    """FastAPI dependency — decode the Bearer JWT and return the user's integer id."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: Optional[str] = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    return int(user_id_str)
