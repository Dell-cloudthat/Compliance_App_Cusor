"""
Database bootstrap and shared helpers.

Import DB_PATH, get_db, and the PII/CUI utilities from here everywhere
you need them, instead of re-declaring them in main.py.
"""

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

DB_PATH    = Path(__file__).parent / "database" / "compliance.db"
SCHEMA_PATH = Path(__file__).parent / "database" / "schema.sql"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------------------------
# PII / CUI detection helpers
# ---------------------------------------------------------------------------

def detect_pii_in_data(data: Dict[str, Any]) -> tuple[bool, List[str]]:
    """Return (has_pii, [pii_type, ...]) for a data payload."""
    pii_indicators = {
        'email':       ['email', 'e-mail', 'mail', 'user_email'],
        'ssn':         ['ssn', 'social_security', 'social_security_number'],
        'phone':       ['phone', 'telephone', 'mobile', 'cell'],
        'address':     ['address', 'street', 'city', 'zip', 'postal'],
        'name':        ['first_name', 'last_name', 'full_name', 'name'],
        'dob':         ['date_of_birth', 'dob', 'birth_date'],
        'credit_card': ['credit_card', 'card_number', 'cc_number'],
    }
    has_pii  = False
    pii_types: List[str] = []
    data_str = json.dumps(data).lower()
    for pii_type, keywords in pii_indicators.items():
        if any(k in data_str for k in keywords):
            has_pii = True
            pii_types.append(pii_type.upper())
    return has_pii, pii_types


def detect_cui_indicators(data: Dict[str, Any], metadata_tags: List[str]) -> bool:
    """Return True if the payload contains CUI markers."""
    cui_keywords = [
        'classified', 'secret', 'top_secret', 'federal', 'government',
        'defense', 'military', 'clearance', 'cui', 'controlled_unclassified',
    ]
    if any('CUI' in t.upper() or 'RESTRICTED' in t.upper() for t in metadata_tags):
        return True
    data_str = json.dumps(data).lower()
    return any(k in data_str for k in cui_keywords)


def classify_data_segment(data: Dict[str, Any], metadata_tags: List[str]) -> str:
    has_pii, _ = detect_pii_in_data(data)
    has_cui    = detect_cui_indicators(data, metadata_tags)
    if has_cui:
        return "RESTRICTED"
    if has_pii:
        return "CONFIDENTIAL"
    if 'ENCRYPTED' in metadata_tags:
        return "INTERNAL"
    return "PUBLIC"


# ---------------------------------------------------------------------------
# Schema bootstrap
# ---------------------------------------------------------------------------

def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn   = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    with open(SCHEMA_PATH) as fh:
        try:
            cursor.executescript(fh.read())
            conn.commit()
        except sqlite3.OperationalError as e:
            if "already exists" not in str(e).lower():
                print(f"Schema execution warning: {e}")
            conn.commit()

    # Ensure audit tables exist (safety fallback — schema.sql has them)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_engagements'")
    if not cursor.fetchone():
        print("Creating audit management tables...")
        _run_schema_fallback(cursor, conn)

    # Ensure IAM tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_permissions'")
    if not cursor.fetchone():
        print("Creating IAM system tables (re-running schema)...")
        _run_schema_fallback(cursor, conn)

    # Ensure IAM tracking tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_login_sessions'")
    if not cursor.fetchone():
        iam_tracking = Path(__file__).parent / "database" / "iam_tracking_schema.sql"
        if iam_tracking.exists():
            try:
                cursor.executescript(iam_tracking.read_text())
                conn.commit()
                print("IAM tracking tables created.")
            except Exception as e:
                print(f"Warning: IAM tracking schema: {e}")

    # Ensure CSCA / pattern detection tables exist
    for table, label in [
        ("security_events",         "CSCA"),
        ("security_event_patterns", "pattern detection"),
    ]:
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
        if not cursor.fetchone():
            print(f"Creating {label} tables (re-running schema)...")
            _run_schema_fallback(cursor, conn)

    conn.close()
    print(f"Database initialized at {DB_PATH}")


def _run_schema_fallback(cursor, conn) -> None:
    try:
        cursor.executescript(SCHEMA_PATH.read_text())
        conn.commit()
    except Exception as e:
        print(f"Warning: schema fallback failed: {e}")
