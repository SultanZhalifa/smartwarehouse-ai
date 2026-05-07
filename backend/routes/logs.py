"""
Smart Warehouse — Detection Logs Routes
=========================================
CRUD operations for detection logs, CSV export,
and public-facing latest detections endpoint.
"""

import io
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response

from config import verify_token, active_sessions
from database import get_db

router = APIRouter(prefix="/api", tags=["Detection Logs"])


# ─── Get Logs (Authenticated) ───
@router.get("/logs", response_model=List[Dict])
def get_logs(
    auth: bool = Depends(verify_token),
    zone: Optional[str] = None,
    limit: int = 100,
):
    """Optionally filter by zone name (substring match) and customise limit."""
    with get_db() as conn:
        cursor = conn.cursor()
        if zone:
            cursor.execute(
                "SELECT id, type, location, date, time, confidence, risk "
                "FROM logs WHERE location LIKE ? ORDER BY id DESC LIMIT ?",
                (f"%{zone}%", limit),
            )
        else:
            cursor.execute(
                "SELECT id, type, location, date, time, confidence, risk "
                "FROM logs ORDER BY id DESC LIMIT ?",
                (limit,),
            )
        rows = cursor.fetchall()

    return [
        {
            "id": r[0], "type": r[1], "location": r[2],
            "date": r[3], "time": r[4], "confidence": r[5], "risk": r[6],
        }
        for r in rows
    ]


# ─── Per-Zone Stats ───
@router.get("/zones/{zone_id}/stats")
def get_zone_stats(zone_id: str, auth: bool = Depends(verify_token)):
    """Aggregate stats for a specific zone (today + all-time + breakdown by class)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name, location FROM camera_zones WHERE id=?", (zone_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Zone not found")
        zone_name, location = row

        like = f"%{zone_name}%"
        today = time.strftime("%Y-%m-%d")

        cursor.execute(
            "SELECT COUNT(*) FROM logs WHERE location LIKE ?", (like,)
        )
        total_all = cursor.fetchone()[0]

        cursor.execute(
            "SELECT COUNT(*) FROM logs WHERE location LIKE ? AND date=?", (like, today)
        )
        total_today = cursor.fetchone()[0]

        cursor.execute(
            "SELECT type, COUNT(*) FROM logs WHERE location LIKE ? "
            "GROUP BY type ORDER BY COUNT(*) DESC",
            (like,),
        )
        breakdown = [{"type": r[0], "count": r[1]} for r in cursor.fetchall()]

        cursor.execute(
            "SELECT AVG(CAST(REPLACE(confidence, '%', '') AS REAL)) "
            "FROM logs WHERE location LIKE ?",
            (like,),
        )
        avg_conf = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT type, time, confidence, risk FROM logs WHERE location LIKE ? "
            "ORDER BY id DESC LIMIT 1",
            (like,),
        )
        last = cursor.fetchone()
        last_detection = (
            {"type": last[0], "time": last[1], "confidence": last[2], "risk": last[3]}
            if last else None
        )

    return {
        "zone_id": zone_id,
        "zone_name": zone_name,
        "location": location,
        "total_all": total_all,
        "total_today": total_today,
        "avg_confidence": round(avg_conf, 1),
        "breakdown": breakdown,
        "last_detection": last_detection,
    }


# ─── Public Latest Detections (for Login page) ───
@router.get("/public/latest-detections")
def get_latest_detections_public():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT type, time, risk FROM logs ORDER BY id DESC LIMIT 5")
        rows = cursor.fetchall()

    return [{"type": r[0], "time": r[1], "risk": r[2]} for r in rows]


# ─── Export Logs as CSV ───
@router.get("/export/logs")
def export_logs_csv(token: Optional[str] = None):
    # Accept token as query param since window.open can't send headers
    session = active_sessions.get(token) if token else None
    if not session or time.time() > session.get("expires", 0):
        raise HTTPException(status_code=401, detail="Unauthorized")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, type, location, date, time, confidence, risk "
            "FROM logs ORDER BY id DESC"
        )
        rows = cursor.fetchall()

    output = io.StringIO()
    output.write("ID,Animal Type,Location,Date,Time,Confidence,Risk Level\n")
    for r in rows:
        output.write(f'{r[0]},{r[1]},"{r[2]}",{r[3]},{r[4]},{r[5]},{r[6]}\n')

    today = time.strftime("%Y-%m-%d")
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="warehouse-logs-{today}.csv"'
        },
    )


# ─── Clear All Logs (Danger Zone) ───
@router.delete("/logs")
def clear_logs(auth: bool = Depends(verify_token)):
    with get_db() as conn:
        conn.cursor().execute("DELETE FROM logs")

    return {"status": "success", "message": "All detection logs cleared."}
