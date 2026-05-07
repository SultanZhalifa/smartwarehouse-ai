"""
Smart Warehouse — Authentication Routes
=========================================
Username-based login, invitation flow, token verification,
forced password change, and email-based password recovery.
"""

import time
import hashlib
import secrets
import random
import string

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel

from config import (
    active_sessions, password_reset_codes,
    login_rate_limiter, forgot_pw_rate_limiter, invite_rate_limiter,
    check_rate_limit, record_attempt,
    verify_token, require_role,
)
from database import get_db

# Store invite tokens in memory (for hackathon). In prod, use a DB table.
# Format: { "token": { "email": "...", "role": "...", "expires": float } }
invite_codes = {}

router = APIRouter(prefix="/api", tags=["Authentication"])


# ─── Request Models ───
class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


class InviteRequest(BaseModel):
    email: str
    username: str
    role: str = "operator"


class AcceptInviteRequest(BaseModel):
    token: str
    name: str
    password: str


# ─── Helpers ───
def _hash_password(plain: str):
    """Hash a password (bcrypt preferred, SHA-256 fallback)."""
    try:
        import bcrypt
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode(), ""
    except ImportError:
        salt = secrets.token_hex(16)
        return hashlib.sha256((plain + salt).encode()).hexdigest(), salt


def _verify_password(plain: str, stored_hash: str, salt: str) -> bool:
    """Verify a password against its stored hash (bcrypt or legacy SHA-256)."""
    salt = salt or ""
    try:
        import bcrypt
        if stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"):
            return bcrypt.checkpw(plain.encode(), stored_hash.encode())
        # Legacy SHA-256
        return hashlib.sha256((plain + salt).encode()).hexdigest() == stored_hash
    except ImportError:
        return hashlib.sha256((plain + salt).encode()).hexdigest() == stored_hash


# ─── Login ───
@router.post("/login")
def login(request: LoginRequest, req: Request):
    client_ip = req.client.host if req.client else "unknown"
    check_rate_limit(login_rate_limiter, client_ip)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, password_hash, salt, name, role, must_change_password "
            "FROM users WHERE username = ? COLLATE NOCASE",
            (request.username,)
        )
        user = cursor.fetchone()

    if not user:
        record_attempt(login_rate_limiter, client_ip)
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    user_id, stored_hash, salt, name, role, must_change = user

    if not _verify_password(request.password, stored_hash, salt):
        record_attempt(login_rate_limiter, client_ip)
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    # Auto-migrate legacy SHA-256 hash to bcrypt
    if not (stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$")):
        try:
            import bcrypt
            new_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
            with get_db() as conn:
                conn.cursor().execute(
                    "UPDATE users SET password_hash=?, salt='' WHERE id=?",
                    (new_hash, user_id)
                )
        except ImportError:
            pass

    # Generate session
    token = secrets.token_hex(32)
    active_sessions[token] = {
        "user_id": user_id,
        "username": request.username.lower(),
        "role": role,
        "expires": time.time() + 86400,  # 24h
    }
    return {
        "token": token,
        "user": {
            "username": request.username.lower(),
            "name": name,
            "role": role,
            "must_change_password": bool(must_change),
        },
    }


# ─── Change Password ───
@router.post("/change-password")
def change_password(request: ChangePasswordRequest, session: dict = Depends(verify_token)):
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    user_id = session.get("user_id")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash, salt FROM users WHERE id=?", (user_id,))
        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found.")

    stored_hash, salt = row
    if not _verify_password(request.current_password, stored_hash, salt):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    new_hash, new_salt = _hash_password(request.new_password)
    with get_db() as conn:
        conn.cursor().execute(
            "UPDATE users SET password_hash=?, salt=?, must_change_password=0 WHERE id=?",
            (new_hash, new_salt, user_id)
        )

    return {"status": "success", "message": "Password changed successfully."}


# ─── Admin Invite System ───
@router.post("/invite-user")
def invite_user(request: InviteRequest, req: Request,
                session: dict = Depends(require_role("admin"))):
    # Check if username or email already exists
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

    invite_token = secrets.token_urlsafe(32)
    invite_codes[invite_token] = {
        "username": request.username.lower(),
        "email": request.email,
        "role": request.role,
        "expires": time.time() + 86400 * 3,  # Valid for 3 days
    }

    origin = req.headers.get("origin") or str(req.base_url).rstrip("/")
    invite_link = f"{origin}/accept-invite?token={invite_token}"

    return {
        "status": "success",
        "message": f"Invitation generated for {request.email}",
        "invite_link": invite_link,
        "token": invite_token,
    }


@router.post("/accept-invite")
def accept_invite(request: AcceptInviteRequest, req: Request):
    client_ip = req.client.host if req.client else "unknown"
    check_rate_limit(invite_rate_limiter, client_ip, max_attempts=5, window_seconds=120)
    record_attempt(invite_rate_limiter, client_ip)

    invite = invite_codes.get(request.token)
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token.")

    if time.time() > invite["expires"]:
        del invite_codes[request.token]
        raise HTTPException(status_code=400, detail="Invitation has expired.")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    pw_hash, salt = _hash_password(request.password)

    with get_db() as conn:
        try:
            conn.cursor().execute(
                "INSERT INTO users (username, email, password_hash, salt, name, role, must_change_password) "
                "VALUES (?, ?, ?, ?, ?, ?, 0)",
                (invite["username"], invite["email"], pw_hash, salt, request.name, invite["role"])
            )
            del invite_codes[request.token]
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Failed to create account. Username or email may already be in use."
            )

    return {"status": "success", "message": "Account created successfully. You can now log in."}


# ─── Logout ───
@router.post("/logout")
def logout(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.replace("Bearer ", "")
    active_sessions.pop(token, None)
    return {"status": "success", "message": "Logged out successfully."}


# ─── Token Verification ───
@router.get("/verify-token")
def verify_token_endpoint(session: dict = Depends(verify_token)):
    return {
        "status": "valid",
        "user": {
            "username": session.get("username"),
            "role": session.get("role"),
        },
    }


# ─── Forgot Password ───
@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, req: Request):
    client_ip = req.client.host if req.client else "unknown"
    check_rate_limit(forgot_pw_rate_limiter, client_ip, max_attempts=3, window_seconds=120)
    record_attempt(forgot_pw_rate_limiter, client_ip)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email=?", (request.email,))
        user = cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=404, detail="No account found with that email address."
        )

    code = "".join(random.choices(string.digits, k=6))
    password_reset_codes[request.email] = {
        "code": code,
        "expires": time.time() + 600,
        "attempts": 0,
    }

    return {
        "status": "success",
        "message": f"Reset code generated for {request.email}.",
        "otp_code": code,
    }


# ─── Reset Password ───
@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    stored = password_reset_codes.get(request.email)

    if not stored:
        raise HTTPException(
            status_code=400, detail="No reset code found. Please request a new one."
        )

    if time.time() > stored["expires"]:
        del password_reset_codes[request.email]
        raise HTTPException(
            status_code=400, detail="Reset code has expired. Please request a new one."
        )

    if stored["attempts"] >= 3:
        del password_reset_codes[request.email]
        raise HTTPException(
            status_code=400,
            detail="Too many failed attempts. Please request a new reset code.",
        )

    if stored["code"] != request.code:
        stored["attempts"] += 1
        remaining = 3 - stored["attempts"]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid reset code. {remaining} attempt(s) remaining.",
        )

    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters."
        )

    new_hash, new_salt = _hash_password(request.new_password)

    with get_db() as conn:
        conn.cursor().execute(
            "UPDATE users SET password_hash=?, salt=?, must_change_password=0 WHERE email=?",
            (new_hash, new_salt, request.email),
        )

    del password_reset_codes[request.email]
    return {
        "status": "success",
        "message": "Password updated successfully. You can now log in.",
    }
