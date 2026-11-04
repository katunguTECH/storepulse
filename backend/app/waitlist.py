import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SQLITE_PATH = Path(__file__).resolve().parents[1] / "storepulse.db"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _database_url():
    return os.getenv("DATABASE_URL", "").strip()


def _use_pg():
    return _database_url().startswith("postgres")


def _sqlite():
    conn = sqlite3.connect(SQLITE_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS waitlist ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "email TEXT UNIQUE NOT NULL, "
        "created_at TEXT NOT NULL, "
        "source TEXT)"
    )
    return conn


def _pg():
    import psycopg

    conn = psycopg.connect(_database_url())
    conn.execute(
        "CREATE TABLE IF NOT EXISTS waitlist ("
        "id SERIAL PRIMARY KEY, "
        "email TEXT UNIQUE NOT NULL, "
        "created_at TEXT NOT NULL, "
        "source TEXT)"
    )
    conn.commit()
    return conn


def is_valid_email(email: str) -> bool:
    return bool(email) and len(email) <= 254 and bool(EMAIL_RE.match(email))


def add_email(email: str, source: str = "landing") -> bool:
    """Returns True if newly added, False if it was already on the list."""
    email = email.strip().lower()
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    pg = _use_pg()
    conn = _pg() if pg else _sqlite()
    try:
        if pg:
            cur = conn.execute(
                "INSERT INTO waitlist (email, created_at, source) VALUES (%s, %s, %s) "
                "ON CONFLICT (email) DO NOTHING",
                (email, now, source),
            )
        else:
            cur = conn.execute(
                "INSERT OR IGNORE INTO waitlist (email, created_at, source) VALUES (?, ?, ?)",
                (email, now, source),
            )
        conn.commit()
        return cur.rowcount == 1
    finally:
        conn.close()


def all_signups():
    conn = _pg() if _use_pg() else _sqlite()
    try:
        return conn.execute("SELECT email, created_at, source FROM waitlist ORDER BY id").fetchall()
    finally:
        conn.close()
