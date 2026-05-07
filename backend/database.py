"""
Smart Warehouse — Database Layer
==================================
Thread-safe SQLite connection management, schema initialization,
and settings cache loader.
"""

import sqlite3
import secrets
import hashlib
from contextlib import contextmanager

from config import DB_PATH, APP_SETTINGS, DEFAULT_THRESHOLD


@contextmanager
def get_db():
    """Context manager for thread-safe database operations with auto-commit."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _hash_password(plain: str):
    """Hash a password using bcrypt, fallback to SHA-256 if unavailable."""
    try:
        import bcrypt
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode(), ""
    except ImportError:
        salt = secrets.token_hex(16)
        return hashlib.sha256((plain + salt).encode()).hexdigest(), salt


def init_db():
    """Initialize database tables, run migrations, and seed default data."""
    with get_db() as conn:
        cursor = conn.cursor()

        # ── Create Tables ──
        cursor.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE,
            password_hash TEXT, salt TEXT, name TEXT, role TEXT)''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, value TEXT)''')

        cursor.execute('''CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, location TEXT,
            date TEXT, time TEXT, confidence TEXT, risk TEXT)''')

        # ── Migrations ──
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        if "salt" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN salt TEXT DEFAULT ''")
        if "username" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN username TEXT")
        if "must_change_password" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0")

        # Backfill username from email local-part for legacy rows
        cursor.execute("SELECT id, email FROM users WHERE username IS NULL OR username = ''")
        for row in cursor.fetchall():
            uid, email = row
            if email and "@" in email:
                derived = email.split("@", 1)[0].lower()
                # Special case: legacy seed user becomes "manager" (as documented in plan)
                if email == "manager@kawanlama.com":
                    derived = "manager"
                cursor.execute("UPDATE users SET username=? WHERE id=?", (derived, uid))

        # Unique index on username (partial — ignores NULLs from any pre-migration rows)
        cursor.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username "
            "ON users(username) WHERE username IS NOT NULL"
        )

        # ── Seed Default Users (idempotent: only inserts users that don't exist) ──
        seed_users = [
            ("admin",    "admin123",    "admin",   "IT Administrator",  "admin@kawanlama.com"),
            ("manager",  "manager123",  "manager", "Warehouse Manager", "manager@kawanlama.com"),
            ("operator", "operator123", "operator", "Shift Operator",   "operator@kawanlama.com"),
        ]
        for username, plain_pw, role, name, email in seed_users:
            cursor.execute(
                "SELECT id FROM users WHERE username = ? COLLATE NOCASE",
                (username,)
            )
            if cursor.fetchone():
                continue
            pw_hash, salt = _hash_password(plain_pw)
            try:
                cursor.execute(
                    "INSERT INTO users (username, email, password_hash, salt, name, role, must_change_password) "
                    "VALUES (?, ?, ?, ?, ?, ?, 1)",
                    (username, email, pw_hash, salt, name, role)
                )
            except sqlite3.IntegrityError:
                # Email already taken (e.g., legacy row with this email but different username)
                pass

        # ── Seed Default Settings ──
        cursor.execute("SELECT COUNT(*) FROM settings")
        if cursor.fetchone()[0] == 0:
            defaults = [
                ("cameraUrl", "0"),
                ("threshold", str(DEFAULT_THRESHOLD)),
                ("notifications", "true"),
                ("darkMode", "false"),
                ("cameraZone", "Zone A"),
            ]
            for k, v in defaults:
                cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (k, v))


def load_settings_cache():
    """Reload settings from database into in-memory APP_SETTINGS cache."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        for key, value in cursor.fetchall():
            if key in ["threshold"]:
                APP_SETTINGS[key] = int(value)
            elif key in ["notifications", "darkMode"]:
                APP_SETTINGS[key] = value.lower() == "true"
            else:
                APP_SETTINGS[key] = value
