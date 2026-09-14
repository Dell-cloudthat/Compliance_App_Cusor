"""
AI Controls Assistant — retrieval-grounded chat over the user's live controls.

Architecture (retrieval first, LLM second):
  1. The frontend sends the question + a compact snapshot of the user's
     controls (id, name, category, priority, status, frameworks). Controls
     are built client-side from framework modules, so the client is the
     source of truth for live status.
  2. This route scores every control against the question with a
     BM25-lite lexical ranker and keeps the top matches.
  3. If GROQ_API_KEY is set, the top matches + gap stats are packed into
     a system prompt and sent to Groq (llama-3.1-8b-instant by default).
     The model's only job is to explain retrieved facts — it is instructed
     to never invent control IDs.
  4. Without an API key the route degrades gracefully to a structured
     retrieval-only answer, so the feature works out of the box.

Question logging (product-improvement feedback loop)
------------------------------------------------------
Each question is logged to `assistant_conversations` — the raw question
text, which control IDs matched, and whether the LLM or retrieval-only
path answered it. This is intentionally narrow: the user's full controls
array and gap_summary (their live compliance posture) are NEVER stored,
only referenced in-memory for the duration of the request. The log exists
so the platform operator can review real customer questions via
GET /api/assistant/analytics — especially the ones that got zero matches,
which are the clearest signal for where to expand control descriptions,
add domain synonyms, or improve MCP tool coverage.

Set ASSISTANT_LOGGING=0 to disable this (e.g. for a customer who opts out).
Disclose this logging in your privacy policy before enabling it for real
customer traffic.
"""

import json
import logging
import math
import os
import re
import sqlite3
from collections import Counter
from typing import Any, Dict, List, Optional

import requests as http_requests
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from database import DB_PATH
from services.auth_service import get_current_user, require_platform_admin

logger = logging.getLogger(__name__)
router = APIRouter()

_LOGGING_ENABLED = os.getenv("ASSISTANT_LOGGING", "1").strip().lower() not in ("0", "false", "no")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL_DEFAULT = "llama-3.1-8b-instant"

_STOPWORDS = {
    "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "at", "is",
    "are", "was", "be", "do", "does", "how", "what", "which", "who", "i", "we",
    "my", "our", "me", "you", "your", "it", "this", "that", "with", "about",
    "need", "needs", "should", "can", "could", "would", "have", "has", "get",
}


def _tokenize(text: str) -> List[str]:
    return [
        t for t in re.findall(r"[a-z0-9\-]+", (text or "").lower())
        if t not in _STOPWORDS and len(t) > 1
    ]


# Domain synonym expansion so "laptop" finds endpoint controls, etc.
_SYNONYMS = {
    "laptop": ["endpoint", "device", "workstation"],
    "laptops": ["endpoint", "device", "workstation"],
    "phone": ["mobile", "device", "byod"],
    "password": ["authentication", "credential", "mfa"],
    "passwords": ["authentication", "credential", "mfa"],
    "login": ["authentication", "access", "mfa", "sso"],
    "employee": ["personnel", "user", "workforce", "training"],
    "employees": ["personnel", "user", "workforce", "training"],
    "remote": ["vpn", "zero-trust", "access"],
    "hacker": ["threat", "incident", "attack"],
    "breach": ["incident", "response", "detection"],
    "backup": ["recovery", "continuity", "restore"],
    "backups": ["recovery", "continuity", "restore"],
    "vendor": ["third-party", "supplier", "supply-chain"],
    "vendors": ["third-party", "supplier", "supply-chain"],
    "cloud": ["aws", "azure", "gcp", "saas"],
    "ai": ["model", "llm", "machine-learning", "atlas"],
    "encryption": ["cryptography", "encrypt", "data-protection"],
    "audit": ["evidence", "assessment", "certification"],
    "firewall": ["network", "boundary", "segmentation"],
    "phishing": ["email", "awareness", "training", "social-engineering"],
}


def _expand(tokens: List[str]) -> List[str]:
    out = list(tokens)
    for t in tokens:
        out.extend(_SYNONYMS.get(t, []))
    return out


def _score_control(query_tokens: List[str], control: Dict[str, Any]) -> float:
    """BM25-lite: term-frequency scoring with field weighting."""
    fields = [
        (str(control.get("id", "")), 5.0),
        (str(control.get("control_name", "")), 3.0),
        (str(control.get("category", "")), 2.0),
        (" ".join(control.get("frameworks", []) or []), 1.5),
        (str(control.get("description", "")), 1.0),
    ]
    score = 0.0
    qcount = Counter(query_tokens)
    for text, weight in fields:
        ftokens = Counter(_tokenize(text))
        for term, qf in qcount.items():
            tf = ftokens.get(term, 0)
            if tf:
                score += weight * (1 + math.log(tf)) * (1 + math.log(qf))
    # Gap boost — surface things the user actually needs to fix
    if control.get("status") in ("Not Implemented", "Non-Compliant"):
        score *= 1.4
    elif control.get("status") == "Partial":
        score *= 1.2
    return score


class ControlSnapshot(BaseModel):
    id: str
    control_name: str = ""
    description: str = ""
    category: str = ""
    priority: str = ""
    status: str = ""
    frameworks: List[str] = Field(default_factory=list)
    responsible_party: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class AssistantChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)
    controls: List[ControlSnapshot] = Field(default_factory=list)
    gap_summary: Dict[str, Any] = Field(default_factory=dict)
    top_k: int = Field(default=8, ge=1, le=20)


def _retrieve(message: str, controls: List[ControlSnapshot], top_k: int) -> List[Dict]:
    qtokens = _expand(_tokenize(message))
    scored = []
    for c in controls:
        d = c.model_dump()
        s = _score_control(qtokens, d)
        if s > 0:
            scored.append((s, d))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [d for _, d in scored[:top_k]]


def _call_groq(system_prompt: str, history: List[ChatMessage], message: str) -> Optional[str]:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return None
    model = os.getenv("GROQ_MODEL", GROQ_MODEL_DEFAULT).strip() or GROQ_MODEL_DEFAULT
    messages = [{"role": "system", "content": system_prompt}]
    for m in history[-6:]:
        if m.role in ("user", "assistant"):
            messages.append({"role": m.role, "content": m.content[:2000]})
    messages.append({"role": "user", "content": message[:2000]})
    try:
        resp = http_requests.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "temperature": 0.3, "max_tokens": 900},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        logger.warning("Groq call failed, falling back to retrieval-only: %s", exc)
        return None


def _retrieval_only_answer(matches: List[Dict], gap_summary: Dict) -> str:
    """Structured answer built purely from retrieved controls (no LLM)."""
    if not matches:
        return (
            "I couldn't find controls matching that question in your current "
            "framework set. Try rephrasing with terms like access, endpoint, "
            "encryption, incident, audit, or a specific control ID. "
            "(Tip: set GROQ_API_KEY on the backend to enable full AI answers.)"
        )
    lines = ["Here are the most relevant controls from your program:\n"]
    for m in matches:
        status = m.get("status") or "Unknown"
        flag = "⚠️ " if status in ("Not Implemented", "Non-Compliant", "Partial") else "✓ "
        owner = f" — owner: {m['responsible_party']}" if m.get("responsible_party") else ""
        lines.append(
            f"{flag}**{m['id']}** {m.get('control_name', '')} "
            f"[{status}]{owner}"
        )
        if m.get("description"):
            lines.append(f"   {m['description'][:180]}")
    open_gaps = [m for m in matches if m.get("status") in ("Not Implemented", "Non-Compliant", "Partial")]
    if open_gaps:
        lines.append(
            f"\n**Recommended next step:** prioritize {open_gaps[0]['id']} "
            f"({open_gaps[0].get('control_name', '')}) — it is currently "
            f"{open_gaps[0].get('status')} and matched your question most closely."
        )
    lines.append(
        "\n_Retrieval-only mode. Set GROQ_API_KEY on the backend for conversational answers._"
    )
    return "\n".join(lines)


def _build_system_prompt(matches: List[Dict], gap_summary: Dict) -> str:
    controls_block = json.dumps([
        {
            "id": m["id"],
            "name": m.get("control_name", ""),
            "status": m.get("status", ""),
            "priority": m.get("priority", ""),
            "category": m.get("category", ""),
            "frameworks": m.get("frameworks", []),
            "owner": m.get("responsible_party"),
            "description": (m.get("description") or "")[:300],
        }
        for m in matches
    ], indent=1)

    return f"""You are the AI Controls Assistant inside a compliance automation platform.
You help compliance managers understand and prioritize their security controls.

STRICT RULES:
- Only reference control IDs that appear in the CONTROLS data below. Never invent control IDs.
- Ground every recommendation in the user's actual control status shown below.
- When a control is 'Not Implemented', 'Non-Compliant', or 'Partial', treat it as an open gap.
- Be concise and actionable: lead with the answer, then list specific controls with their IDs and current status.
- If the retrieved controls don't answer the question, say so honestly and suggest what to search instead.

USER'S COMPLIANCE POSTURE:
{json.dumps(gap_summary, indent=1) if gap_summary else "(no gap summary provided)"}

CONTROLS RETRIEVED FOR THIS QUESTION (the only controls you may cite):
{controls_block}
"""


def _ensure_log_table() -> None:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS assistant_conversations (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id              INTEGER,
            question             TEXT NOT NULL,
            answer_mode          TEXT,
            matched_control_ids  TEXT,
            match_count          INTEGER DEFAULT 0,
            created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def _log_question(user_id: int, question: str, mode: str, matched_ids: List[str]) -> None:
    if not _LOGGING_ENABLED:
        return
    try:
        _ensure_log_table()
        conn = sqlite3.connect(str(DB_PATH))
        conn.execute(
            """INSERT INTO assistant_conversations
               (user_id, question, answer_mode, matched_control_ids, match_count)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, question[:2000], mode, json.dumps(matched_ids), len(matched_ids)),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        # Logging must never break the chat response.
        logger.warning("Failed to log assistant question: %s", exc)


@router.post("/api/assistant/chat")
async def assistant_chat(
    payload: AssistantChatRequest,
    user_id: int = Depends(get_current_user),
) -> Dict[str, Any]:
    matches = _retrieve(payload.message, payload.controls, payload.top_k)

    llm_answer = None
    if matches or payload.gap_summary:
        system_prompt = _build_system_prompt(matches, payload.gap_summary)
        llm_answer = _call_groq(system_prompt, payload.history, payload.message)

    answer = llm_answer or _retrieval_only_answer(matches, payload.gap_summary)
    mode = "llm" if llm_answer else "retrieval"

    _log_question(user_id, payload.message, mode, [m["id"] for m in matches])

    return {
        "answer": answer,
        "mode": mode,
        "matched_controls": [
            {
                "id": m["id"],
                "control_name": m.get("control_name", ""),
                "status": m.get("status", ""),
                "priority": m.get("priority", ""),
            }
            for m in matches
        ],
    }


@router.get("/api/assistant/analytics")
async def assistant_analytics(
    limit: int = 200,
    _admin: int = Depends(require_platform_admin),
) -> Dict[str, Any]:
    """
    Platform-operator view into what customers are actually asking.
    Prioritizes 'no_match_questions' — these are the clearest signal for
    where to expand control descriptions, add domain synonyms in
    _SYNONYMS, or improve MCP tool coverage.
    """
    _ensure_log_table()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        total = conn.execute("SELECT COUNT(*) AS n FROM assistant_conversations").fetchone()["n"]
        mode_split = {
            r["answer_mode"]: r["n"]
            for r in conn.execute(
                "SELECT answer_mode, COUNT(*) AS n FROM assistant_conversations GROUP BY answer_mode"
            ).fetchall()
        }
        no_match = conn.execute(
            """SELECT question, created_at FROM assistant_conversations
               WHERE match_count = 0 ORDER BY created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
        recent = conn.execute(
            """SELECT question, answer_mode, match_count, created_at
               FROM assistant_conversations ORDER BY created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()

        # Simple frequency count on normalized question text — surfaces
        # exact/near-duplicate FAQs without needing NLP clustering.
        freq_rows = conn.execute(
            """SELECT LOWER(TRIM(question)) AS q, COUNT(*) AS n
               FROM assistant_conversations GROUP BY q ORDER BY n DESC LIMIT 20"""
        ).fetchall()
    finally:
        conn.close()

    return {
        "total_questions": total,
        "mode_split": mode_split,
        "no_match_rate": round(len(no_match) / total, 3) if total else 0,
        "no_match_questions": [dict(r) for r in no_match],
        "most_frequent_questions": [dict(r) for r in freq_rows],
        "recent_questions": [dict(r) for r in recent],
    }


@router.get("/api/assistant/status")
async def assistant_status(user_id: int = Depends(get_current_user)) -> Dict[str, Any]:
    """Lets the frontend show whether full AI mode is available."""
    has_key = bool(os.getenv("GROQ_API_KEY", "").strip())
    return {
        "llm_enabled": has_key,
        "model": os.getenv("GROQ_MODEL", GROQ_MODEL_DEFAULT) if has_key else None,
        "mode": "llm" if has_key else "retrieval",
    }
