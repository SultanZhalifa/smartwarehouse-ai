"""
Smart Warehouse — Camera & Video Routes
=========================================
Multi-zone camera control with per-zone worker threads,
each running YOLO inference on its own video source
(webcam, video file, or RTSP/HTTP stream).
"""

import os
import time
import threading

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import (
    APP_SETTINGS, TRACKED_CLASSES, DANGER_CLASSES, WARNING_CLASSES,
    CLASS_NAME_MAP, DETECTION_COOLDOWN_SECONDS, TRANSLATE_DICT, verify_token,
)
from database import get_db
from services.detector import model, draw_hud_bounding_box, get_risk_info
from services.websocket_manager import manager
from services.tts import speak_async

router = APIRouter(prefix="/api", tags=["Camera"])


# ─── Per-Zone Worker State ───
class ZoneWorker:
    """Encapsulates a single zone's video capture + inference loop."""
    def __init__(self, zone_id: str, zone_name: str, source: str):
        self.zone_id = zone_id
        self.zone_name = zone_name
        self.source = source
        self.capture = None
        self.thread = None
        self.stop_flag = threading.Event()
        self.latest_frame_bytes = None
        self.latest_inference_ms = 0
        self.last_detection_per_class = {}
        self.lock = threading.Lock()
        self.running = False

    def _open_capture(self):
        """Open the cv2.VideoCapture for this zone's source."""
        src = self.source
        # Numeric webcam index
        if src.isdigit():
            idx = int(src)
            cap = cv2.VideoCapture(idx)
            if not cap.isOpened():
                cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            return cap
        # File path or stream URL
        if not src.lower().startswith(("rtsp://", "http://", "https://")):
            if not os.path.exists(src):
                print(f"[ZONE {self.zone_id}] Source file not found: {src}")
                return None
        return cv2.VideoCapture(src)

    def _is_video_file(self) -> bool:
        return self.source and not self.source.isdigit() and \
               not self.source.lower().startswith(("rtsp://", "http://", "https://"))

    def start(self):
        if self.running:
            return
        self.stop_flag.clear()
        self.capture = self._open_capture()
        if self.capture is None or not self.capture.isOpened():
            self.capture = None
            raise RuntimeError(f"Could not open source for zone {self.zone_id}: {self.source}")
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_flag.set()
        self.running = False
        if self.thread:
            self.thread.join(timeout=3)
        if self.capture is not None:
            self.capture.release()
            self.capture = None
        # Render a black frame so the UI shows NO SIGNAL after stop
        black = np.zeros((480, 640, 3), dtype=np.uint8)
        ok, buf = cv2.imencode(".jpg", black)
        if ok:
            with self.lock:
                self.latest_frame_bytes = buf.tobytes()

    def _run_loop(self):
        is_file = self._is_video_file()
        retry_count = 0

        while not self.stop_flag.is_set():
            try:
                if self.capture is None or not self.capture.isOpened():
                    time.sleep(0.5)
                    continue

                success, frame = self.capture.read()
                if not success or frame is None:
                    if is_file:
                        # Loop video file from start
                        self.capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        time.sleep(0.05)
                        continue
                    retry_count += 1
                    if retry_count > 30:
                        print(f"[ZONE {self.zone_id}] Stream lost, reconnecting...")
                        self.capture.release()
                        time.sleep(2)
                        self.capture = self._open_capture()
                        retry_count = 0
                    time.sleep(0.1)
                    continue

                retry_count = 0

                annotated = self._process_frame(frame)

                ok, buf = cv2.imencode(
                    ".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 80]
                )
                if ok:
                    with self.lock:
                        self.latest_frame_bytes = buf.tobytes()

                # Pace to ~30fps. For video files this maintains natural playback.
                time.sleep(0.033)

            except Exception as e:
                print(f"[ZONE {self.zone_id}] Worker error: {e}")
                time.sleep(0.5)

    def _process_frame(self, frame):
        """Run YOLO inference on a single frame, log detections, return annotated frame."""
        if not model:
            return frame

        start = time.time()
        results = model(frame, verbose=False, imgsz=320)
        self.latest_inference_ms = int((time.time() - start) * 1000)

        threshold = APP_SETTINGS.get("threshold", 50) / 100.0
        now = time.time()
        annotated = frame.copy()

        if len(results) == 0 or getattr(results[0], "boxes", None) is None:
            return annotated

        for box in results[0].boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            if conf <= threshold:
                continue

            raw_name = model.names[cls_id].lower()
            class_name = CLASS_NAME_MAP.get(raw_name, raw_name.capitalize())
            if class_name not in TRACKED_CLASSES:
                continue

            # Cooldown per-class per-zone
            last = self.last_detection_per_class.get(class_name, 0.0)
            if now - last > DETECTION_COOLDOWN_SECONDS:
                self.last_detection_per_class[class_name] = now
                self._log_detection(class_name, conf)

            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            draw_hud_bounding_box(annotated, x1, y1, x2, y2, class_name, conf)

        return annotated

    def _log_detection(self, class_name: str, conf: float):
        """Persist detection to DB and broadcast WebSocket alert."""
        risk_info = get_risk_info(class_name)
        risk_level = risk_info["level"]
        log_id = 0

        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO logs (type, location, date, time, confidence, risk) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        class_name,
                        self.zone_name,
                        time.strftime("%Y-%m-%d"),
                        time.strftime("%H:%M:%S"),
                        f"{int(conf * 100)}%",
                        risk_level,
                    ),
                )
                log_id = cursor.lastrowid
        except Exception as db_err:
            print(f"[DB-ERROR] Zone {self.zone_id}: {db_err}")

        print(
            f"[AUTO-LOG] {self.zone_name}: {class_name} ({conf*100:.1f}%) - {risk_level}"
        )

        indo = TRANSLATE_DICT.get(class_name, class_name)
        if risk_level == "danger":
            speak_async(
                f"Bahaya! Ada {indo} terdeteksi di {self.zone_name}! "
                "Segera evakuasi zona!"
            )
        else:
            speak_async(f"Peringatan! Ada {indo} terdeteksi di {self.zone_name}.")

        if APP_SETTINGS.get("notifications", False):
            manager.broadcast_sync({
                "id": log_id,
                "type": class_name,
                "location": self.zone_name,
                "date": time.strftime("%Y-%m-%d"),
                "time": time.strftime("%H:%M:%S"),
                "confidence": f"{int(conf * 100)}%",
                "message": f"Detected {class_name} at {self.zone_name}",
                "risk": risk_level,
            })


# ─── Zone Worker Registry ───
_zone_workers: dict[str, ZoneWorker] = {}
_workers_lock = threading.Lock()


def _get_zone_config(zone_id: str):
    """Look up zone (id, name, source) from DB."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, source FROM camera_zones WHERE id=?", (zone_id,)
        )
        return cursor.fetchone()


def get_zone_runtime_status(zone_id: str, fallback: str = "offline") -> str:
    """Used by /api/cameras to report live worker state."""
    with _workers_lock:
        worker = _zone_workers.get(zone_id)
    if worker and worker.running:
        return "live"
    # If a source is configured the zone is on standby (ready to start)
    cfg = _get_zone_config(zone_id)
    if cfg and cfg[2]:
        return "standby"
    return fallback if fallback else "offline"


def get_inference_time():
    """Aggregate inference time across all running zones (for analytics)."""
    with _workers_lock:
        running = [w.latest_inference_ms for w in _zone_workers.values() if w.running]
    if not running:
        return 0
    return int(sum(running) / len(running))


# ─── Zone Toggle Endpoint ───
class ZoneToggleRequest(BaseModel):
    state: bool


@router.post("/cameras/{zone_id}/toggle")
def toggle_zone(zone_id: str, req: ZoneToggleRequest, auth: bool = Depends(verify_token)):
    cfg = _get_zone_config(zone_id)
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found")
    _, zone_name, source = cfg

    if req.state:
        if not source:
            raise HTTPException(
                status_code=400,
                detail=f"Zone {zone_id} has no video source configured."
            )
        with _workers_lock:
            worker = _zone_workers.get(zone_id)
            if worker is None:
                worker = ZoneWorker(zone_id, zone_name, source)
                _zone_workers[zone_id] = worker
            else:
                worker.zone_name = zone_name
                worker.source = source
        try:
            worker.start()
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))
        return {"status": "success", "message": f"{zone_name} started.", "zone_id": zone_id}

    # Stop
    with _workers_lock:
        worker = _zone_workers.get(zone_id)
    if worker:
        worker.stop()
    return {"status": "success", "message": f"{zone_name} stopped.", "zone_id": zone_id}


# ─── Backward-compatible Legacy Endpoint ───
class CameraState(BaseModel):
    state: bool


@router.post("/camera/toggle")
def toggle_main_camera(req: CameraState, auth: bool = Depends(verify_token)):
    """Legacy endpoint — toggles Zone A specifically."""
    return toggle_zone("zone-a", ZoneToggleRequest(state=req.state), auth=auth)


# ─── Per-Zone Video Stream ───
def _zone_stream_generator(zone_id: str):
    while True:
        with _workers_lock:
            worker = _zone_workers.get(zone_id)
        if worker and worker.latest_frame_bytes:
            with worker.lock:
                frame_bytes = worker.latest_frame_bytes
            yield (
                b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
        time.sleep(0.033)


@router.get("/video_feed/{zone_id}")
def video_feed_zone(zone_id: str):
    return StreamingResponse(
        _zone_stream_generator(zone_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ─── Backward-compatible Legacy Stream (Zone A) ───
@router.get("/video_feed")
def video_feed_legacy():
    return StreamingResponse(
        _zone_stream_generator("zone-a"),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ─── Snapshot: capture current frame from a zone ───
@router.get("/cameras/{zone_id}/snapshot")
def snapshot_zone(zone_id: str, auth: bool = Depends(verify_token)):
    """Return the latest frame as a JPEG image."""
    from fastapi.responses import Response

    with _workers_lock:
        worker = _zone_workers.get(zone_id)
    if not worker or not worker.latest_frame_bytes:
        raise HTTPException(status_code=404, detail="No frame available — zone not running")
    with worker.lock:
        frame_bytes = worker.latest_frame_bytes
    return Response(content=frame_bytes, media_type="image/jpeg")


# ─── No-op start hook (kept for app.py compatibility) ───
def start_video_thread():
    """No background thread needed — workers spin up on demand per zone."""
    pass
