from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import List, Dict, Optional
import cv2
import numpy as np
import time
import sqlite3
import hashlib
import asyncio
import threading
import subprocess
import secrets
import random
import string
import datetime
from collections import defaultdict
from ultralytics import YOLO

app = FastAPI(title="Smart Warehouse API", version="1.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "warehouse.db"

# ─── Constants ───
TRACKED_CLASSES = {
    "Person", "Bird", "Cat", "Dog", "Horse", "Sheep", "Cow",
    "Elephant", "Bear", "Zebra", "Giraffe", "Snake", "Mouse", "Rat"
}
DANGER_CLASSES = {"Snake", "Bear", "Dog", "Cat", "Mouse", "Rat"}
DETECTION_COOLDOWN_SECONDS = 10.0
TTS_COOLDOWN_SECONDS = 8.0  # Prevent overlapping TTS alerts

# ─── In-Memory Stores ───
active_sessions = {}            # token -> { email, expires }
password_reset_codes = {}       # email -> { code, expires, attempts }
login_rate_limiter = defaultdict(list)  # ip -> [timestamps]
last_tts_time = 0.0            # Global TTS cooldown tracker

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE,
        password_hash TEXT, salt TEXT, name TEXT, role TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY, value TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, location TEXT,
        date TEXT, time TEXT, confidence TEXT, risk TEXT)''')

    # Migrate: add salt column if missing (backward compat)
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    if "salt" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN salt TEXT DEFAULT ''")

    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        salt = secrets.token_hex(16)
        default_pw = hashlib.sha256(("password123" + salt).encode()).hexdigest()
        cursor.execute("INSERT INTO users (email, password_hash, salt, name, role) VALUES (?, ?, ?, ?, ?)",
                       ("manager@kawanlama.com", default_pw, salt, "Manager", "admin"))

    cursor.execute("SELECT COUNT(*) FROM settings")
    if cursor.fetchone()[0] == 0:
        for k, v in [("cameraUrl", "0"), ("threshold", "85"), ("notifications", "true"), ("darkMode", "false")]:
            cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (k, v))
    conn.commit()
    conn.close()

init_db()

APP_SETTINGS = {}
def load_settings_cache():
    global APP_SETTINGS
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings")
    for row in cursor.fetchall():
        key, value = row
        if key in ["threshold"]:
            APP_SETTINGS[key] = int(value)
        elif key in ["notifications", "darkMode"]:
            APP_SETTINGS[key] = value.lower() == 'true'
        else:
            APP_SETTINGS[key] = value
    conn.close()

load_settings_cache()

# ─── Rate Limiter ───
def check_rate_limit(client_ip: str, max_attempts: int = 5, window_seconds: int = 60):
    """Simple in-memory rate limiter. Returns True if allowed, raises 429 if not."""
    now = time.time()
    # Clean old entries
    login_rate_limiter[client_ip] = [
        t for t in login_rate_limiter[client_ip] if now - t < window_seconds
    ]
    if len(login_rate_limiter[client_ip]) >= max_attempts:
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a minute before trying again.")
    login_rate_limiter[client_ip].append(now)

# ─── Auth Guard ───
def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.replace("Bearer ", "")
    session = active_sessions.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    if time.time() > session["expires"]:
        del active_sessions[token]
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return True

# ─── WebSockets ───
global_loop = None

@app.on_event("startup")
async def startup_event():
    global global_loop
    global_loop = asyncio.get_running_loop()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    def broadcast_sync(self, message: dict):
        if global_loop and global_loop.is_running():
            dead_connections = []
            for connection in self.active_connections:
                try:
                    asyncio.run_coroutine_threadsafe(connection.send_json(message), global_loop)
                except Exception:
                    dead_connections.append(connection)
            # Clean up dead connections
            for dc in dead_connections:
                self.active_connections.remove(dc)

manager = ConnectionManager()

@app.websocket("/api/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ─── Auth Routes ───
class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/login")
def login(request: LoginRequest, req: Request):
    client_ip = req.client.host if req.client else "unknown"
    check_rate_limit(client_ip)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash, salt, name, role FROM users WHERE email=?", (request.email,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    stored_hash, salt, name, role = user
    salt = salt or ""  # backward compat for users without salt
    computed_hash = hashlib.sha256((request.password + salt).encode()).hexdigest()

    if computed_hash != stored_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Generate secure session token
    token = secrets.token_hex(32)
    active_sessions[token] = {
        "email": request.email,
        "expires": time.time() + 86400  # 24 hours
    }
    return {"token": token, "user": {"name": name, "role": role}}

@app.post("/api/register")
def register(request: LoginRequest, req: Request):
    client_ip = req.client.host if req.client else "unknown"
    check_rate_limit(client_ip, max_attempts=3, window_seconds=120)

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    salt = secrets.token_hex(16)
    hashed_pw = hashlib.sha256((request.password + salt).encode()).hexdigest()
    try:
        cursor.execute("INSERT INTO users (email, password_hash, salt, name, role) VALUES (?, ?, ?, ?, ?)",
                       (request.email, hashed_pw, salt, "New User", "viewer"))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered.")
    conn.close()
    return {"status": "success", "message": "Registered successfully."}

# ─── Token Verification ───
@app.get("/api/verify-token")
def verify_token_endpoint(auth: bool = Depends(verify_token)):
    return {"status": "valid"}

# ─── Forgot / Reset Password ───
class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

@app.post("/api/forgot-password")
def forgot_password(request: ForgotPasswordRequest, req: Request):
    client_ip = req.client.host if req.client else "unknown"
    check_rate_limit(client_ip, max_attempts=3, window_seconds=120)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email=?", (request.email,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email address.")

    # Generate 6-digit OTP code
    code = ''.join(random.choices(string.digits, k=6))
    password_reset_codes[request.email] = {
        "code": code,
        "expires": time.time() + 600,  # 10 minutes
        "attempts": 0
    }

    # Since no email service is configured, we display the OTP code in the UI.
    return {
        "status": "success",
        "message": f"Reset code generated for {request.email}.",
        "otp_code": code
    }

@app.post("/api/reset-password")
def reset_password(request: ResetPasswordRequest):
    stored = password_reset_codes.get(request.email)

    if not stored:
        raise HTTPException(status_code=400, detail="No reset code found. Please request a new one.")

    if time.time() > stored["expires"]:
        del password_reset_codes[request.email]
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

    # Brute-force protection: max 3 attempts per code
    if stored["attempts"] >= 3:
        del password_reset_codes[request.email]
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new reset code.")

    if stored["code"] != request.code:
        stored["attempts"] += 1
        remaining = 3 - stored["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid reset code. {remaining} attempt(s) remaining.")

    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    salt = secrets.token_hex(16)
    new_hash = hashlib.sha256((request.new_password + salt).encode()).hexdigest()
    cursor.execute("UPDATE users SET password_hash=?, salt=? WHERE email=?", (new_hash, salt, request.email))
    conn.commit()
    conn.close()

    del password_reset_codes[request.email]
    return {"status": "success", "message": "Password updated successfully. You can now log in."}

# ─── Settings ───
@app.get("/api/settings")
def get_settings():
    load_settings_cache()
    return APP_SETTINGS

@app.post("/api/settings")
def update_settings(settings: Dict, auth: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for k, v in settings.items():
        val_str = "true" if v is True else "false" if v is False else str(v)
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, val_str))
    conn.commit()
    conn.close()
    load_settings_cache()
    return {"status": "success", "message": "Settings saved successfully."}

# ─── Logs ───
@app.get("/api/logs", response_model=List[Dict])
def get_logs(auth: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, type, location, date, time, confidence, risk FROM logs ORDER BY id DESC LIMIT 100")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "type": r[1], "location": r[2], "date": r[3], "time": r[4], "confidence": r[5], "risk": r[6]} for r in rows]

# Public endpoint for login page live detection log (no sensitive data)
@app.get("/api/public/latest-detections")
def get_latest_detections_public():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT type, time, risk FROM logs ORDER BY id DESC LIMIT 5")
    rows = cursor.fetchall()
    conn.close()
    return [{"type": r[0], "time": r[1], "risk": r[2]} for r in rows]

@app.get("/api/export/logs")
def export_logs_csv(token: Optional[str] = None):
    # Accept token as query param since window.open can't send headers
    session = active_sessions.get(token) if token else None
    if not session or time.time() > session.get("expires", 0):
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, type, location, date, time, confidence, risk FROM logs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    import io
    output = io.StringIO()
    output.write("ID,Animal Type,Location,Date,Time,Confidence,Risk Level\n")
    for r in rows:
        output.write(f'{r[0]},{r[1]},"{r[2]}",{r[3]},{r[4]},{r[5]},{r[6]}\n')

    csv_content = output.getvalue()
    today = time.strftime("%Y-%m-%d")
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="warehouse-logs-{today}.csv"'}
    )

# ─── Analytics (Real Data) ───
@app.get("/api/analytics")
def get_analytics(time_range: str = "weekly", auth: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Risk distribution (real)
    cursor.execute("SELECT risk, COUNT(*) FROM logs GROUP BY risk")
    dist_rows = cursor.fetchall()
    distribution = [
        { "name": "Hazard (Danger)", "value": 0, "color": "var(--alert-danger)" },
        { "name": "Contamination (Warning)", "value": 0, "color": "var(--alert-warning)" },
        { "name": "Staff/Info", "value": 0, "color": "var(--alert-success)" },
    ]
    for row in dist_rows:
        if row[0] == "danger": distribution[0]["value"] = row[1]
        elif row[0] == "warning": distribution[1]["value"] = row[1]
        elif row[0] == "info": distribution[2]["value"] = row[1]

    # Trend chart based on time_range
    today = datetime.date.today()
    trend = []

    if time_range == "daily":
        # Today's data, grouped by hour
        today_str = today.strftime("%Y-%m-%d")
        for h in range(24):
            hour_str = f"{h:02d}"
            cursor.execute(
                "SELECT type, COUNT(*) FROM logs WHERE date=? AND time LIKE ? GROUP BY type",
                (today_str, f"{hour_str}:%")
            )
            counts = {row[0]: row[1] for row in cursor.fetchall()}
            trend.append({
                "name": f"{hour_str}:00",
                "Snake": counts.get("Snake", 0),
                "Cat": counts.get("Cat", 0),
                "Dog": counts.get("Dog", 0),
                "Person": counts.get("Person", 0),
            })

    elif time_range == "monthly":
        # Last 30 days
        for i in range(29, -1, -1):
            d = today - datetime.timedelta(days=i)
            date_str = d.strftime("%Y-%m-%d")
            label = d.strftime("%d/%m")
            cursor.execute("SELECT type, COUNT(*) FROM logs WHERE date=? GROUP BY type", (date_str,))
            counts = {row[0]: row[1] for row in cursor.fetchall()}
            trend.append({
                "name": label,
                "Snake": counts.get("Snake", 0),
                "Cat": counts.get("Cat", 0),
                "Dog": counts.get("Dog", 0),
                "Person": counts.get("Person", 0),
            })

    else:  # weekly (default)
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for i in range(6, -1, -1):
            d = today - datetime.timedelta(days=i)
            day_name = day_names[d.weekday()]
            date_str = d.strftime("%Y-%m-%d")
            cursor.execute("SELECT type, COUNT(*) FROM logs WHERE date=? GROUP BY type", (date_str,))
            counts = {row[0]: row[1] for row in cursor.fetchall()}
            trend.append({
                "name": day_name,
                "Snake": counts.get("Snake", 0),
                "Cat": counts.get("Cat", 0),
                "Dog": counts.get("Dog", 0),
                "Person": counts.get("Person", 0),
            })

    # Zone heatmap (derived from actual log counts)
    cursor.execute("SELECT location, COUNT(*) FROM logs GROUP BY location")
    zone_rows = cursor.fetchall()
    total_logs = sum(r[1] for r in zone_rows) if zone_rows else 1
    zone_activity = []
    for row in zone_rows:
        intensity = min(100, int((row[1] / total_logs) * 100))
        zone_activity.append({"zone": row[0], "intensity": intensity})
    if not zone_activity:
        zone_activity = [
            {"zone": "Zone A", "intensity": 0},
            {"zone": "Zone B", "intensity": 0},
            {"zone": "Zone C", "intensity": 0},
            {"zone": "Zone D", "intensity": 0}
        ]

    conn.close()
    return {"trend": trend, "distribution": distribution, "zone_activity": zone_activity}

@app.get("/api/status")
def get_status(auth: bool = Depends(verify_token)):
    # Derive active zones from real log data (last 24h)
    today = datetime.date.today().strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT location FROM logs WHERE date=?", (today,))
    zones = [row[0] for row in cursor.fetchall()]
    conn.close()

    return {
        "status": "Active",
        "active_zones": zones if zones else ["Zone A - Live Cam"],
        "current_detections": [],
        "ai_performance": {
            "inference_time": LATEST_INFERENCE_TIME,
            "model": "YOLO11-Nano"
        }
    }

# ─── Danger Zone: Clear Logs ───
@app.delete("/api/logs")
def clear_logs(auth: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM logs")
    conn.commit()
    conn.close()
    return {"status": "success", "message": "All detection logs cleared."}

# ─── Danger Zone: Reset Settings ───
@app.post("/api/settings/reset")
def reset_settings(auth: bool = Depends(verify_token)):
    defaults = {"cameraUrl": "0", "threshold": "85", "notifications": "true", "darkMode": "false"}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for k, v in defaults.items():
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))
    conn.commit()
    conn.close()
    load_settings_cache()
    return {"status": "success", "message": "All settings restored to defaults."}

# ─── Video & AI Singleton Logic ───
try:
    model = YOLO('yolo11n.pt')
except Exception as e:
    model = None
    print(f"Failed to load YOLO model: {e}")

global_camera = None
LATEST_FRAME_BYTES = None

class CameraState(BaseModel):
    state: bool

@app.post("/api/camera/toggle")
def toggle_camera(req: CameraState, auth: bool = Depends(verify_token)):
    global global_camera
    if req.state:
        if global_camera is None:
            cam_src = APP_SETTINGS.get("cameraUrl", "0")
            if cam_src == "0": cam_src = 0

            global_camera = cv2.VideoCapture(cam_src)

            if cam_src == 0 and not global_camera.isOpened():
                # Fallback to directshow or index 1 if 0 fails
                global_camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                if not global_camera.isOpened():
                    global_camera = cv2.VideoCapture(1)
            if cam_src == 0:
                global_camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                global_camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                global_camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return {"status": "success", "message": "Camera turned ON"}
    else:
        if global_camera is not None:
            global_camera.release()
            global_camera = None
        return {"status": "success", "message": "Camera turned OFF"}

last_detection_time = {}

def speak_async(text):
    global last_tts_time
    now = time.time()
    if now - last_tts_time < TTS_COOLDOWN_SECONDS:
        return  # Skip if another TTS is still playing
    last_tts_time = now
    try:
        subprocess.Popen(f'powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak(\'{text}\');"', shell=True)
    except: pass

LATEST_INFERENCE_TIME = 0
camera_retry_count = 0

def background_video_processor():
    global global_camera, LATEST_FRAME_BYTES, LATEST_INFERENCE_TIME, camera_retry_count
    while True:
        try:
            if global_camera is None or not global_camera.isOpened():
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                if global_camera is not None:
                    cv2.putText(frame, "ERROR: No Webcam Detected", (120, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                    cv2.putText(frame, "Please configure an MP4 file path", (100, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
                    cv2.putText(frame, "in the Settings page.", (180, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
                else:
                    cv2.putText(frame, "Camera is OFF (Standby Mode)", (120, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (150, 150, 150), 2)
                ret, buffer = cv2.imencode('.jpg', frame)
                LATEST_FRAME_BYTES = buffer.tobytes()
                LATEST_INFERENCE_TIME = 0
                time.sleep(1)
                continue

            success, frame = global_camera.read()
            if not success or frame is None:
                camera_retry_count += 1
                if camera_retry_count > 30:
                    # Auto-reconnect: release and re-open camera
                    print("[CAMERA] Stream lost. Attempting reconnect...")
                    cam_src = APP_SETTINGS.get("cameraUrl", "0")
                    if cam_src == "0": cam_src = 0
                    global_camera.release()
                    time.sleep(2)
                    global_camera = cv2.VideoCapture(cam_src)
                    camera_retry_count = 0
                time.sleep(0.1)
                continue

            camera_retry_count = 0  # Reset on successful read

            if model:
                start_inference = time.time()
                results = model(frame, verbose=False, imgsz=320)
                inference_time_ms = int((time.time() - start_inference) * 1000)
                LATEST_INFERENCE_TIME = inference_time_ms
                current_time = time.time()
                if len(results) > 0 and getattr(results[0], 'boxes', None) is not None:
                    for box in results[0].boxes:
                        cls_id = int(box.cls[0].item())
                        conf = float(box.conf[0].item())
                        current_threshold = APP_SETTINGS.get("threshold", 85) / 100.0

                        if conf > current_threshold:
                            class_name = model.names[cls_id].capitalize()
                            last_time = last_detection_time.get(class_name, 0.0)

                            if current_time - last_time > DETECTION_COOLDOWN_SECONDS:

                                if class_name not in TRACKED_CLASSES:
                                    continue  # Skip irrelevant objects

                                last_detection_time[class_name] = current_time

                                # Set risk level based on logical categories
                                if class_name == "Person":
                                    risk_level = "info"  # Safe / authorized staff
                                elif class_name in DANGER_CLASSES:
                                    risk_level = "danger"  # Major Bio-Hazard
                                else:
                                    risk_level = "warning"  # Minor animal intrusion

                                # Thread-safe DB insert
                                try:
                                    conn = sqlite3.connect(DB_PATH)
                                    cursor = conn.cursor()
                                    cursor.execute('''INSERT INTO logs (type, location, date, time, confidence, risk)
                                                      VALUES (?, ?, ?, ?, ?, ?)''',
                                                   (class_name, "Zone A - Live Cam",
                                                    time.strftime("%Y-%m-%d"), time.strftime("%H:%M:%S"),
                                                    f"{int(conf * 100)}%", risk_level))
                                    log_id = cursor.lastrowid
                                    conn.commit()
                                    conn.close()
                                except sqlite3.Error as db_err:
                                    print(f"[DB-ERROR] Failed to insert log: {db_err}")
                                    log_id = 0

                                print(f"[AUTO-LOG] Logged: {class_name} ({conf*100:.1f}%) - Risk: {risk_level}")

                                # Audio Alert (Skip for Person to avoid spamming the presenter)
                                if risk_level != "info":
                                    translate_dict = {"Cat": "kucing", "Dog": "anjing", "Snake": "ular", "Mouse": "tikus", "Rat": "tikus", "Bear": "beruang"}
                                    indo_name = translate_dict.get(class_name, class_name)
                                    speak_async(f"Peringatan! Ada {indo_name} terdeteksi.")

                                # Trigger WebSockets Push Notification
                                if APP_SETTINGS.get("notifications", False):
                                    manager.broadcast_sync({
                                        "id": log_id,
                                        "type": class_name,
                                        "location": "Zone A - Live Cam",
                                        "date": time.strftime("%Y-%m-%d"),
                                        "time": time.strftime("%H:%M:%S"),
                                        "confidence": f"{int(conf * 100)}%",
                                        "message": f"Detected {class_name} at Zone A",
                                        "risk": risk_level
                                    })
                annotated_frame = results[0].plot()
            else:
                annotated_frame = frame

            ret, buffer = cv2.imencode('.jpg', annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            LATEST_FRAME_BYTES = buffer.tobytes()
            time.sleep(0.001)  # Max FPS processing loop
        except Exception as e:
            print(f"Background thread error: {e}")
            time.sleep(1)

# Start Background Thread
threading.Thread(target=background_video_processor, daemon=True).start()

def generate_video_stream_reader():
    while True:
        if LATEST_FRAME_BYTES:
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + LATEST_FRAME_BYTES + b'\r\n')
        time.sleep(0.001)  # Max FPS broadcast rate

@app.get("/api/video_feed")
def video_feed():
    return StreamingResponse(generate_video_stream_reader(), media_type="multipart/x-mixed-replace; boundary=frame")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
