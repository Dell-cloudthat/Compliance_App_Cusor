"""
Shared outbound email helper (stdlib smtplib — no external dependency).

Used by:
  - routes/waitlist.py    (early-access invite emails)
  - routes/action_items.py (action item assignment notifications — the
    "record of tracking outside the platform" for a team that's been
    assigned remediation work)

Configuration is entirely via env vars (see backend/.env.example):
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM

Without SMTP_HOST set, send_email() returns False without raising —
every caller must treat email as best-effort and always provide a
copyable fallback (e.g. a ticket reference or link) so the feature works
end to end even with no mail server configured.
"""

import logging
import os
import smtplib
from email.message import EmailMessage
from typing import Optional

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, body_text: str, to_name: Optional[str] = None) -> bool:
    """Best-effort SMTP send. Never raises — returns True/False."""
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        return False
    try:
        port = int(os.getenv("SMTP_PORT", "587"))
        user = os.getenv("SMTP_USER", "")
        password = os.getenv("SMTP_PASSWORD", "")
        from_addr = os.getenv("SMTP_FROM", user or "no-reply@example.com")

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email
        msg.set_content(body_text)

        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            if user:
                server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.warning("Email send to %s failed: %s", to_email, exc)
        return False


def is_email_configured() -> bool:
    return bool(os.getenv("SMTP_HOST", "").strip())
