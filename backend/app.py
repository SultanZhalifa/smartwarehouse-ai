"""
Smart Warehouse API — Application Entry Point
================================================
FastAPI application factory with modular route registration,
CORS middleware, WebSocket support, and background services.

Architecture:
    config.py          → Constants, env vars, shared state
    database.py        → Thread-safe SQLite + schema management
    services/
        detector.py    → YOLO11 model + HUD rendering
        tts.py         → Text-to-speech alerts
        websocket_manager.py → WebSocket broadcasting
    routes/
        auth.py        → Login, Register, Token, Password Reset
        logs.py        → Detection logs CRUD + CSV export
        settings.py    → System settings management
        analytics.py   → Charts, heatmap, system status
        camera.py      → Camera control + video streaming
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from database import init_db, load_settings_cache
from services.websocket_manager import manager
import services.websocket_manager as ws_module

# ─── Import Route Modules ───
from routes.auth import router as auth_router
from routes.logs import router as logs_router
from routes.settings import router as settings_router
from routes.analytics import router as analytics_router
from routes.analytics import set_inference_time_getter
from routes.camera import router as camera_router, start_video_thread, get_inference_time
from routes.zones import router as zones_router, init_camera_zones
from routes.model_info import router as model_info_router
from routes.users import router as users_router


# ─── Lifespan (modern startup/shutdown) ───
@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifespan: startup and shutdown events."""
    ws_module.global_loop = asyncio.get_running_loop()
    yield


# ─── Create Application ───
app = FastAPI(
    title="Smart Warehouse API",
    version="2.0.0",
    description="""
## AI-Powered Bio-Hazard & Pest Detection System

Real-time warehouse surveillance API that detects and classifies bio-hazards and pests
using a custom-trained YOLO11 model.

### Detection Classes
- **Snake** → Bio-Hazard (Danger) — Immediate evacuation alert
- **Cat** → Contamination (Warning) — Sanitization required
- **Gecko/Lizard** → Monitoring (Info) — Entry point inspection

### Architecture
- **Modular FastAPI** backend with route-based separation
- **Thread-safe SQLite** with WAL mode for concurrent access
- **WebSocket** push notifications with exponential backoff
- **bcrypt** password hashing with SHA-256 auto-migration
- **14 automated tests** via pytest

Built for the **AI Open Innovation Challenge 2026** — PT. Kawan Lama Group.
    """,
    contact={
        "name": "Group 5 — Smart Warehouse Team",
        "url": "https://github.com/smart-warehouse",
    },
    license_info={
        "name": "MIT License",
    },
    openapi_tags=[
        {"name": "Authentication", "description": "Login, registration, and password management"},
        {"name": "Detection Logs", "description": "CRUD operations for AI detection events"},
        {"name": "Settings", "description": "System configuration management"},
        {"name": "Analytics", "description": "Real-time charts, trends, and status"},
        {"name": "Camera", "description": "Camera control, video streaming, and AI inference"},
        {"name": "System", "description": "Health check, model info, and system metadata"},
    ],
    lifespan=lifespan,
)

# ─── CORS Middleware ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Route Modules ───
app.include_router(auth_router)
app.include_router(logs_router)
app.include_router(settings_router)
app.include_router(analytics_router)
app.include_router(camera_router)
app.include_router(zones_router)
app.include_router(model_info_router)
app.include_router(users_router)

# ─── Wire cross-module dependencies ───
set_inference_time_getter(get_inference_time)


# ─── WebSocket Endpoint ───
@app.websocket("/api/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─── Initialize ───
init_db()
init_camera_zones()
load_settings_cache()
start_video_thread()


# ─── Run Server ───
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

