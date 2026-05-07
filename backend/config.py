"""
Smart Warehouse — Configuration & Constants
=============================================
Centralized configuration, environment variable loading,
and shared in-memory state for the application.
"""

import os
import time
from pathlib import Path
from collections import defaultdict
from typing import Optional
from dotenv import load_dotenv
from fastapi import HTTPException, Header

# ─── Load environment variables ───
load_dotenv()

# ─── Paths ───
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "warehouse.db"))

# ─── Security ───
SECRET_KEY = os.getenv("SECRET_KEY", "smartwarehouse-dev-key-change-in-production")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]

# ─── AI Detection Scope (Case 1: Bio-Hazard & Pest Detection) ───
TRACKED_CLASSES = {"Snake", "Cat", "Gecko", "Lizard"}
DANGER_CLASSES = {"Snake"}          # Bio-Hazard → danger
WARNING_CLASSES = {"Cat"}           # Contamination → warning
# Gecko, Lizard                     # Monitoring → info

# Normalize class names from any model output to standard names
CLASS_NAME_MAP = {
    "snake": "Snake", "cat": "Cat", "gecko": "Gecko", "lizard": "Lizard",
    "tokek": "Gecko", "cicak": "Gecko", "kadal": "Lizard",
    "ular": "Snake", "kucing": "Cat",
}

# Indonesian translation for TTS alerts
TRANSLATE_DICT = {
    "Snake": "ular", "Cat": "kucing", "Gecko": "gecko", "Lizard": "kadal"
}

# ─── Timing Constants ───
DETECTION_COOLDOWN_SECONDS = 10.0
TTS_COOLDOWN_SECONDS = 8.0
DEFAULT_THRESHOLD = int(os.getenv("DEFAULT_THRESHOLD", "50"))

# ─── In-Memory Stores ───
active_sessions = {}            # token -> { username, role, expires }
password_reset_codes = {}       # email -> { code, expires, attempts }

# Separate rate limiters per endpoint type (prevents cross-contamination)
login_rate_limiter = defaultdict(list)       # ip -> [timestamps]
forgot_pw_rate_limiter = defaultdict(list)   # ip -> [timestamps]
invite_rate_limiter = defaultdict(list)      # ip -> [timestamps]

# ─── App Settings Cache (loaded from DB at startup) ───
APP_SETTINGS = {}


# ─── Rate Limiter ───
def check_rate_limit(rate_limiter: dict, client_ip: str,
                     max_attempts: int = 5, window_seconds: int = 60):
    """Check if IP is rate-limited for the given limiter. Raises 429 if exceeded."""
    now = time.time()
    rate_limiter[client_ip] = [
        t for t in rate_limiter[client_ip] if now - t < window_seconds
    ]
    if len(rate_limiter[client_ip]) >= max_attempts:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please wait a minute before trying again."
        )


def record_attempt(rate_limiter: dict, client_ip: str):
    """Record an attempt for rate limiting on the given limiter."""
    rate_limiter[client_ip].append(time.time())


# ─── Auth Guards (Dependencies) ───
def verify_token(authorization: Optional[str] = Header(None)):
    """FastAPI dependency to verify Bearer token in request headers."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.replace("Bearer ", "")
    session = active_sessions.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    if time.time() > session["expires"]:
        del active_sessions[token]
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return session


def require_role(*allowed_roles: str):
    """FastAPI dependency factory: verify token AND check role membership."""
    def checker(authorization: Optional[str] = Header(None)):
        session = verify_token(authorization)
        if session.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required role: {' or '.join(allowed_roles)}."
            )
        return session
    return checker
