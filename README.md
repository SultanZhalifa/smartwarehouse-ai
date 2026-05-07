# Smart Warehouse — AI-Powered Bio-Hazard & Pest Detection

![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![OpenCV](https://img.shields.io/badge/opencv-%23white.svg?style=for-the-badge&logo=opencv&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)

> An automated AI surveillance system for PT. Kawan Lama that maintains the integrity of warehouse goods and worker safety from bio-hazard and pest intrusions — powered by a **custom-trained YOLO11 model** with real-time WebSocket alerts.

**Built for the AI Open Innovation Challenge 2026**

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Real-Time AI Detection** | Custom YOLO11 model trained on Snake, Cat, and Gecko datasets with HUD-style bounding boxes |
| **Live Video Streaming** | MJPEG video feed via OpenCV with sub-50ms inference latency |
| **3-Tier Risk Classification** | Bio-Hazard (Snake) → Contamination (Cat) → Monitoring (Gecko/Lizard) |
| **WebSocket Push Alerts** | Instant notifications with auto-reconnect and exponential backoff |
| **TTS Audio Alerts** | Indonesian voice warnings via Windows Speech Synthesis |
| **Interactive Zone Map** | SVG warehouse floor plan with color-coded threat heatmap |
| **Analytics Dashboard** | Trend charts, risk distribution, and zone activity powered by Recharts |
| **PDF Export** | One-click executive summary report generation (jsPDF + html2canvas) |
| **CSV Log Export** | Full detection history export with timestamps and confidence scores |
| **Session Auth** | Secure login with bcrypt hashing and 24h token expiry |

---

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────────┐
│ Camera/RTSP │───▶│  YOLO11 AI   │───▶│ FastAPI  │───▶│  SQLite  │───▶│ WebSocket │───▶│   React UI   │
│  (OpenCV)   │    │ (Inference)  │    │ (API)    │    │   (DB)   │    │(Real-time)│    │ (Dashboard)  │
└─────────────┘    └──────────────┘    └──────────┘    └──────────┘    └───────────┘    └──────────────┘
```

### Backend Module Architecture (v2.0)

```
backend/
├── app.py                      ← Application entry point (~90 lines)
├── config.py                   ← Constants, env vars, shared state
├── database.py                 ← Thread-safe SQLite with WAL mode
├── .env                        ← Environment variables
├── routes/
│   ├── auth.py                 ← Login, Register, Password Reset (bcrypt)
│   ├── logs.py                 ← Detection logs CRUD + CSV export
│   ├── settings.py             ← System settings management
│   ├── analytics.py            ← Charts, heatmap, system status
│   └── camera.py               ← Camera control + video streaming + AI inference
├── services/
│   ├── detector.py             ← YOLO11 model loading + HUD bounding box renderer
│   ├── websocket_manager.py    ← Thread-safe WebSocket broadcasting
│   └── tts.py                  ← Text-to-speech alerts with cooldown
├── tests/
│   └── test_api.py             ← 14 automated API tests (pytest)
├── train_custom_model.py       ← Custom YOLO training pipeline
└── main.py                     ← Backward compatibility wrapper
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, React Router DOM 7, Recharts 3, Vanilla CSS |
| **Backend** | Python 3.12, FastAPI, Uvicorn, Pydantic |
| **AI/Vision** | YOLO11-Nano (Ultralytics), OpenCV 4, NumPy |
| **Security** | bcrypt (password hashing), python-dotenv (env vars), rate limiting |
| **Database** | SQLite3 with WAL mode (thread-safe) |
| **Real-time** | WebSocket (bi-directional) with exponential backoff |
| **Testing** | pytest, httpx, FastAPI TestClient |
| **Export** | jsPDF, html2canvas, CSV streaming |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Webcam (optional — supports RTSP/video file input)

### 1. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure environment (optional)
cp .env.example .env  # Edit values as needed

# Start the API server
python -m uvicorn app:app --port 8000
```

> Backend runs on http://127.0.0.1:8000 — API docs available at http://127.0.0.1:8000/docs

### 2. Frontend Setup

```bash
# From project root
npm install
npm run dev
```

> Dashboard available at http://localhost:5173

### 3. Run Tests

```bash
cd backend
python -m pytest tests/ -v
```

### Default Credentials

The system seeds 3 users on first run with role-based access (RBAC):

| Username | Role | Access |
|----------|------|--------|
| `admin` | Admin | Full access (User Management, Settings, Live Monitor, Logs) |
| `manager` | Manager | Settings, Live Monitor, Logs, Analytics |
| `operator` | Operator | Live Monitor, Logs (read-only) |

> **Default passwords** are seeded on first DB initialization. Check `backend/database.py` for the seed values, or contact the project owner.
>
> **Important:** All users are required to change their password on first login. Change defaults immediately after deployment.

### AI Model Weights

The custom-trained YOLO11 model (`warehouse_pest.pt`) is **not committed to git** (~6MB binary). You have two options:

**Option A — Use base YOLO11 model (general-purpose):**
The system auto-falls-back to `yolo11n.pt` (downloaded by Ultralytics on first run). Limited accuracy for pest classes.

**Option B — Train your own custom model:**
```bash
cd backend
set ROBOFLOW_API_KEY=your_key_from_roboflow.com
python download_datasets.py
python train_custom_model.py
```
The training script will guide you through dataset setup and training.

### Demo Videos

Demo videos are included in `backend/demo_videos/` for immediate testing:
- `Cat.mp4` → Zone B (Storage Area)
- `Gecko.mp4` → Zone C (Loading Dock)
- `Snake.mp4` → Zone D (Entrance Gate)

To replace with your own footage, see [`backend/demo_videos/README.md`](backend/demo_videos/README.md).

### 4. Docker Deployment (One Command)

> **Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
# From project root
docker compose up --build
```

| Service | URL |
|---------|-----|
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **Frontend Dashboard** | http://localhost:5173 |
| **Health Check** | http://localhost:8000/api/health |
| **Model Info** | http://localhost:8000/api/model-info |

```bash
# Stop all services
docker compose down

# View live logs
docker compose logs -f backend
```

> **Note:** Webcam access is not available inside Docker containers on Windows. For camera demos in Docker, set the camera source to an RTSP URL or video file path via the Settings page.

---

## Custom AI Model Training

We trained a custom YOLO11 model (`warehouse_pest.pt`) on curated datasets from Roboflow:

- **Snake Detection** — 1,200+ annotated images
- **Cat Detection** — 800+ annotated images  
- **Gecko/Lizard Detection** — 600+ annotated images

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/login` | - | User authentication (username + password) |
| `POST` | `/api/logout` | Bearer | End user session |
| `POST` | `/api/change-password` | Bearer | Change current password |
| `GET` | `/api/verify-token` | Bearer | Token validation |
| `POST` | `/api/invite-user` | Admin | Generate user invitation link |
| `POST` | `/api/accept-invite` | - | Accept invitation and create account |
| `POST` | `/api/forgot-password` | - | OTP code generation |
| `POST` | `/api/reset-password` | - | Password reset with OTP |
| `GET` | `/api/settings` | - | Get system settings |
| `POST` | `/api/settings` | Bearer | Update settings |
| `POST` | `/api/settings/reset` | Bearer | Factory reset |
| `GET` | `/api/logs` | Bearer | Get detection logs |
| `DELETE` | `/api/logs` | Bearer | Clear all logs |
| `GET` | `/api/export/logs` | Token | CSV export |
| `GET` | `/api/analytics` | Bearer | Trend & distribution data |
| `GET` | `/api/status` | Bearer | System status |
| `POST` | `/api/cameras/{zone_id}/toggle` | Bearer | Start/stop zone camera |
| `GET` | `/api/cameras/{zone_id}/snapshot` | Bearer | Capture zone frame |
| `GET` | `/api/video_feed/{zone_id}` | - | Per-zone MJPEG stream |
| `GET` | `/api/video_feed` | - | Legacy Zone A stream |
| `WS` | `/api/ws/alerts` | - | Real-time alert notifications |
| `GET` | `/api/health` | - | System health check (Docker) |
| `GET` | `/api/model-info` | - | AI model metadata, training metrics & mAP |
| `GET` | `/api/training-artifacts/{name}` | - | Training images (confusion matrix, etc.) |

> Full interactive API documentation: http://127.0.0.1:8000/docs

---

## Agile Scrum Team (Group 5)

| Role | Name | NIM |
|------|------|-----|
| Product Owner | Risly Maria Theresia Worung | 001202400069 |
| Scrum Master | Sultan Zhalifunnas Musyaffa | 001202400200 |
| Frontend Lead | Misha Andalusia | 001202400040 |
| Backend & AI Lead | Fathir Barhouti Awlya | 001202400054 |

---

## Project Documentation

| Document | Description |
|----------|-------------|
| [`docs/SCRUM_ROLES.md`](docs/SCRUM_ROLES.md) | Team roles and responsibilities |
| [`docs/PRODUCT_BACKLOG.md`](docs/PRODUCT_BACKLOG.md) | Product backlog with priorities |
| [`docs/SPRINT_REPORTS.md`](docs/SPRINT_REPORTS.md) | Weekly sprint progress reports |

---

## License

This project was developed as part of the **AI Open Innovation Challenge 2026** for PT. Kawan Lama Group.
