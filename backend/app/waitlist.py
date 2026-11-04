import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "storepulse.db"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS waitlist ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "email TEXT UNIQUE NOT NULL, "
        "created_at TEXT NOT NULL, "
        "source TEXT)"
    )
    return conn


def is_valid_email(email: str) -> bool:
    return bool(email) and len(email) <= 254 and bool(EMAIL_RE.match(email))


def add_email(email: str, source: str = "landing") -> bool:
    """Returns True if newly added, False if it was already on the list."""
    email = email.strip().lower()
    conn = _conn()
    try:
        cur = conn.execute(
            "INSERT OR IGNORE INTO waitlist (email, created_at, source) VALUES (?, ?, ?)",
            (email, datetime.now(timezone.utc).isoformat(timespec="seconds"), source),
        )
        conn.commit()
        return cur.rowcount == 1
    finally:
        conn.close()


def all_signups():
    conn = _conn()
    try:
        return conn.execute("SELECT email, created_at, source FROM waitlist ORDER BY id").fetchall()
    finally:
        conn.close()
