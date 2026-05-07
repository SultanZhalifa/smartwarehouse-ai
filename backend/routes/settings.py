"""
Smart Warehouse — Settings Routes
===================================
System configuration management with
persistent database storage and in-memory cache.
"""

from typing import Dict

from fastapi import APIRouter, Depends

from config import verify_token, require_role, APP_SETTINGS, DEFAULT_THRESHOLD
from database import get_db, load_settings_cache

router = APIRouter(prefix="/api", tags=["Settings"])


# ─── Get Settings (any authenticated user) ───
@router.get("/settings")
def get_settings(session: dict = Depends(verify_token)):
    load_settings_cache()
    return APP_SETTINGS


# ─── Update Settings (admin or manager only) ───
@router.post("/settings")
def update_settings(settings: Dict, session: dict = Depends(require_role("admin", "manager"))):
    with get_db() as conn:
        cursor = conn.cursor()
        for k, v in settings.items():
            val_str = "true" if v is True else "false" if v is False else str(v)
            cursor.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (k, val_str),
            )

    load_settings_cache()
    return {"status": "success", "message": "Settings saved successfully."}


# ─── Reset Settings to Defaults (admin only) ───
@router.post("/settings/reset")
def reset_settings(session: dict = Depends(require_role("admin"))):
    defaults = {
        "cameraUrl": "0",
        "threshold": str(DEFAULT_THRESHOLD),
        "notifications": "true",
        "darkMode": "false",
        "cameraZone": "Zone A",
    }

    with get_db() as conn:
        cursor = conn.cursor()
        for k, v in defaults.items():
            cursor.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v)
            )

    load_settings_cache()
    return {"status": "success", "message": "All settings restored to defaults."}
