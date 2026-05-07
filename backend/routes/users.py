"""
Smart Warehouse — User Management Routes (Admin only)
======================================================
CRUD operations for user accounts: list, create, update,
delete, and admin-triggered password reset.
"""

import secrets
import string
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config import require_role, active_sessions
from database import get_db
from routes.auth import _hash_password

router = APIRouter(prefix="/api", tags=["User Management"])

VALID_ROLES = {"admin", "manager", "operator"}


class CreateUserRequest(BaseModel):
    username: str
    email: str
    name: str
    role: str = "operator"
    password: str


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


def _generate_temp_password(length: int = 10) -> str:
    """Generate a memorable temporary password."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _revoke_user_sessions(user_id: int):
    """Invalidate all active sessions for a given user_id."""
    tokens_to_remove = [
        tok for tok, sess in active_sessions.items()
        if sess.get("user_id") == user_id
    ]
    for tok in tokens_to_remove:
        del active_sessions[tok]


# ─── List Users ───
@router.get("/users")
def list_users(session: dict = Depends(require_role("admin"))):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, email, name, role, must_change_password "
            "FROM users ORDER BY id ASC"
        )
        rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "username": r[1],
            "email": r[2],
            "name": r[3],
            "role": r[4],
            "must_change_password": bool(r[5]),
        }
        for r in rows
    ]


# ─── Create User ───
@router.post("/users")
def create_user(request: CreateUserRequest, session: dict = Depends(require_role("admin"))):
    if request.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(sorted(VALID_ROLES))}."
        )
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if not request.username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty.")

    pw_hash, salt = _hash_password(request.password)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM users WHERE username = ? COLLATE NOCASE OR email = ?",
            (request.username, request.email)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="A user with this username or email already exists."
            )
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, salt, name, role, must_change_password) "
            "VALUES (?, ?, ?, ?, ?, ?, 1)",
            (request.username.lower(), request.email, pw_hash, salt, request.name, request.role)
        )
        new_id = cursor.lastrowid

    return {
        "status": "success",
        "message": "User created successfully.",
        "user": {
            "id": new_id,
            "username": request.username.lower(),
            "email": request.email,
            "name": request.name,
            "role": request.role,
            "must_change_password": True,
        },
    }


# ─── Update User ───
@router.patch("/users/{user_id}")
def update_user(user_id: int, request: UpdateUserRequest,
                session: dict = Depends(require_role("admin"))):
    if request.role and request.role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(sorted(VALID_ROLES))}."
        )

    # Prevent admin from demoting themselves (would lock out admin access)
    if user_id == session.get("user_id") and request.role and request.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own role."
        )

    updates = []
    values = []
    if request.name is not None:
        updates.append("name = ?")
        values.append(request.name)
    if request.email is not None:
        updates.append("email = ?")
        values.append(request.email)
    if request.role is not None:
        updates.append("role = ?")
        values.append(request.role)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    values.append(user_id)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found.")

        try:
            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
        except Exception:
            raise HTTPException(
                status_code=400, detail="Update failed (email may already be in use)."
            )

    # If role changed, revoke active sessions so new role takes effect on next login
    if request.role is not None:
        _revoke_user_sessions(user_id)

    return {"status": "success", "message": "User updated successfully."}


# ─── Delete User ───
@router.delete("/users/{user_id}")
def delete_user(user_id: int, session: dict = Depends(require_role("admin"))):
    if user_id == session.get("user_id"):
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found.")
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))

    _revoke_user_sessions(user_id)
    return {"status": "success", "message": "User deleted successfully."}


# ─── Admin Reset Password ───
@router.post("/users/{user_id}/reset-password")
def admin_reset_password(user_id: int, session: dict = Depends(require_role("admin"))):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found.")

        temp_password = _generate_temp_password()
        pw_hash, salt = _hash_password(temp_password)
        cursor.execute(
            "UPDATE users SET password_hash=?, salt=?, must_change_password=1 WHERE id=?",
            (pw_hash, salt, user_id)
        )

    _revoke_user_sessions(user_id)
    return {
        "status": "success",
        "message": "Password reset successfully. User must change it on next login.",
        "temp_password": temp_password,
    }
