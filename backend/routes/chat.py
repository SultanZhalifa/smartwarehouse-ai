"""
Smart Warehouse — AI Chat Route
================================
Rule-based NLP chatbot that answers natural-language questions
about warehouse detection data in Bahasa Indonesia.

Supports queries about:
- Detection statistics (total, per type, per zone, per risk level)
- Timeline (last detection, peak hours, trends)
- Zone safety (which zone is most/least dangerous)
- System status summary
"""

import datetime
import re

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from config import verify_token
from database import get_db

router = APIRouter(prefix="/api", tags=["AI Chat"])


class ChatRequest(BaseModel):
    message: str


# ── Intent classifier ──────────────────────────────────────────────────────

def _classify_intent(msg: str) -> str:
    """Map a user message to one of our supported intents."""
    m = msg.lower()

    # Zone queries
    if re.search(r"zona?.*(baha|risiko|aman|aktif|paling|mana|tertinggi)", m):
        return "zone_risk"
    if re.search(r"zone?.*(danger|risk|safe|most|which|highest)", m):
        return "zone_risk"

    # Peak hours / time pattern
    if re.search(r"(jam|waktu|kapan|pukul|peak|hour|sering|terjadi|pattern|pola)", m):
        return "peak_hours"

    # Last detection
    if re.search(r"(terakhir|last|terbaru|latest|baru saja|recent)", m):
        return "last_detection"

    # Count / stats by type
    if re.search(r"(ular|snake)", m):
        return "count_snake"
    if re.search(r"(kucing|cat)", m):
        return "count_cat"
    if re.search(r"(gecko|cicak|lizard|kadal)", m):
        return "count_gecko"

    # Total stats
    if re.search(r"(total|berapa|jumlah|count|how many|statistik|stat)", m):
        return "total_stats"

    # Summary / report
    if re.search(r"(ringkasan|summary|laporan|report|rekap|singkat)", m):
        return "summary"

    # Safety / status
    if re.search(r"(aman|safe|status|kondisi|situation)", m):
        return "safety_status"

    # Help
    if re.search(r"(help|bantuan|bisa apa|apa saja|fitur)", m):
        return "help"

    return "unknown"


# ── Database query helpers ─────────────────────────────────────────────────

def _get_stats(cursor) -> dict:
    cursor.execute("SELECT COUNT(*), risk, type FROM logs GROUP BY risk")
    rows = cursor.fetchall()
    stats = {"total": 0, "danger": 0, "warning": 0, "info": 0,
             "snake": 0, "cat": 0, "gecko": 0}
    for count, risk, _ in rows:
        stats["total"] += count
        if risk in stats:
            stats[risk] += count
    cursor.execute("SELECT type, COUNT(*) FROM logs GROUP BY type")
    for typ, cnt in cursor.fetchall():
        k = typ.lower()
        if k in ("gecko", "lizard"):
            stats["gecko"] += cnt
        elif k in stats:
            stats[k] += cnt
    return stats


def _get_zone_stats(cursor) -> list:
    cursor.execute(
        "SELECT location, COUNT(*), "
        "SUM(CASE WHEN risk='danger' THEN 1 ELSE 0 END) "
        "FROM logs GROUP BY location ORDER BY COUNT(*) DESC"
    )
    return [{"zone": r[0], "total": r[1], "danger": r[2]} for r in cursor.fetchall()]


def _get_last_detection(cursor) -> dict | None:
    cursor.execute(
        "SELECT type, location, risk, date, time, confidence "
        "FROM logs ORDER BY id DESC LIMIT 1"
    )
    row = cursor.fetchone()
    if row:
        return {"type": row[0], "location": row[1], "risk": row[2],
                "date": row[3], "time": row[4], "confidence": row[5]}
    return None


def _get_peak_hours(cursor) -> list:
    """Returns hour slots with most detections (all time)."""
    cursor.execute(
        "SELECT SUBSTR(time, 1, 2) AS hr, COUNT(*) "
        "FROM logs GROUP BY hr ORDER BY COUNT(*) DESC LIMIT 3"
    )
    return [{"hour": f"{r[0]}:00", "count": r[1]} for r in cursor.fetchall()]


def _get_today_stats(cursor) -> dict:
    today = datetime.date.today().strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) FROM logs WHERE date=?", (today,))
    total = cursor.fetchone()[0]
    cursor.execute(
        "SELECT COUNT(*) FROM logs WHERE date=? AND risk='danger'", (today,))
    danger = cursor.fetchone()[0]
    return {"total": total, "danger": danger, "date": today}


# ── Response builders ──────────────────────────────────────────────────────

def _fmt_risk_label(risk: str) -> str:
    return {"danger": "[BIO-HAZARD]", "warning": "[KONTAMINASI]", "info": "[MONITORING]"}.get(risk, risk.upper())


def _build_response(intent: str, cursor) -> str:
    if intent == "help":
        return (
            "**AI Warehouse Assistant** siap membantu!\n\n"
            "Saya bisa menjawab pertanyaan seperti:\n"
            "• \"Zona mana yang paling berbahaya?\"\n"
            "• \"Berapa total deteksi ular minggu ini?\"\n"
            "• \"Kapan terakhir ada insiden?\"\n"
            "• \"Jam berapa paling sering ada deteksi?\"\n"
            "• \"Buatkan ringkasan laporan keamanan\"\n\n"
            "Silakan tanyakan apa saja tentang keamanan gudang."
        )

    if intent == "total_stats":
        s = _get_stats(cursor)
        today = _get_today_stats(cursor)
        return (
            f"**Statistik Deteksi Keseluruhan**\n\n"
            f"• Total seluruh waktu: **{s['total']} deteksi**\n"
            f"• Hari ini: **{today['total']} deteksi** ({today['danger']} bahaya)\n\n"
            f"**Breakdown per kategori:**\n"
            f"• [BAHAYA] Bio-Hazard (Ular): {s['danger']} kejadian\n"
            f"• [SEDANG] Kontaminasi (Kucing): {s['warning']} kejadian\n"
            f"• [AMAN] Monitoring (Gecko/Lizard): {s['info']} kejadian"
        )

    if intent == "zone_risk":
        zones = _get_zone_stats(cursor)
        if not zones:
            return "Belum ada data deteksi di database. Jalankan kamera untuk mulai monitoring."
        most = zones[0]
        safest = zones[-1] if len(zones) > 1 else None
        lines = ["**Analisis Risiko Per Zona**\n"]
        for z in zones:
            risk_pct = int((z["danger"] / z["total"]) * 100) if z["total"] > 0 else 0
            level = "[BAHAYA]" if z["danger"] > 0 else "[AMAN]"
            lines.append(f"• **{z['zone']}**: {z['total']} deteksi ({risk_pct}% bahaya) {level}")
        lines.append(f"\n**Paling berbahaya: {most['zone']}** — {most['danger']} insiden Bio-Hazard")
        if safest:
            lines.append(f"**Paling aman: {safest['zone']}**")
        return "\n".join(lines)

    if intent == "peak_hours":
        peaks = _get_peak_hours(cursor)
        if not peaks:
            return "Belum cukup data historis untuk analisis pola waktu."
        ranks = ["#1", "#2", "#3"]
        lines = ["**Analisis Jam Puncak Risiko**\n",
                 "Berdasarkan data historis, deteksi paling sering terjadi pada:\n"]
        for i, p in enumerate(peaks):
            lines.append(f"{ranks[i]} **{p['hour']}** — {p['count']} deteksi")
        lines.append("\n**Rekomendasi:** Tingkatkan patroli manual pada jam-jam tersebut.")
        return "\n".join(lines)

    if intent == "last_detection":
        det = _get_last_detection(cursor)
        if not det:
            return "Belum ada deteksi tercatat dalam sistem. Gudang masih bersih."
        risk_label = _fmt_risk_label(det["risk"])
        action = "Segera lakukan evakuasi dan pemeriksaan zona!" if det["risk"] == "danger" else "Lakukan sanitasi dan pemeriksaan rutin."
        return (
            f"**Deteksi Terakhir:**\n\n"
            f"• Objek: **{det['type']}**\n"
            f"• Status: {risk_label}\n"
            f"• Lokasi: **{det['location']}**\n"
            f"• Waktu: {det['date']} pukul {det['time']}\n"
            f"• Confidence AI: **{det['confidence']}**\n\n"
            f"{action}"
        )

    if intent == "count_snake":
        cursor.execute("SELECT COUNT(*) FROM logs WHERE LOWER(type)='snake'")
        count = cursor.fetchone()[0]
        today = datetime.date.today().strftime("%Y-%m-%d")
        cursor.execute(
            "SELECT COUNT(*) FROM logs WHERE LOWER(type)='snake' AND date=?", (today,))
        today_count = cursor.fetchone()[0]
        severity = "[KRITIS]" if count > 5 else "[TERPANTAU]"
        tail = "Ular adalah ancaman Bio-Hazard tertinggi. Pastikan protokol evakuasi siap." if count > 0 else "Tidak ada deteksi ular sejauh ini."
        return (
            f"**Statistik Deteksi Ular — Bio-Hazard**\n\n"
            f"• Total keseluruhan: **{count} kejadian**\n"
            f"• Hari ini: **{today_count} kejadian**\n"
            f"• Tingkat bahaya: {severity}\n\n"
            f"{tail}"
        )

    if intent == "count_cat":
        cursor.execute("SELECT COUNT(*) FROM logs WHERE LOWER(type)='cat'")
        count = cursor.fetchone()[0]
        tail = "Kucing dapat mengontaminasi produk gudang. Lakukan sanitasi rutin." if count > 0 else "Tidak ada deteksi kucing sejauh ini."
        return (
            f"**Statistik Deteksi Kucing — Kontaminasi**\n\n"
            f"• Total deteksi: **{count} kejadian**\n"
            f"• Kategori risiko: [SEDANG] KONTAMINASI\n\n"
            f"{tail}"
        )

    if intent == "count_gecko":
        cursor.execute(
            "SELECT COUNT(*) FROM logs WHERE LOWER(type) IN ('gecko','lizard')")
        count = cursor.fetchone()[0]
        tail = "Periksa celah masuk di area yang sering terdeteksi." if count > 0 else "Tidak ada deteksi gecko/lizard sejauh ini."
        return (
            f"**Statistik Deteksi Gecko/Lizard — Monitoring**\n\n"
            f"• Total deteksi: **{count} kejadian**\n"
            f"• Kategori risiko: [RENDAH] MONITORING\n\n"
            f"{tail}"
        )

    if intent == "safety_status":
        s = _get_stats(cursor)
        today = _get_today_stats(cursor)
        if today["danger"] > 0:
            status = "WASPADA TINGGI"
            advice = "Ada insiden Bio-Hazard hari ini. Segera koordinasikan penanganan."
        elif s["danger"] > 0:
            status = "WASPADA SEDANG"
            advice = "Ada riwayat insiden Bio-Hazard. Pantau terus seluruh zona."
        else:
            status = "AMAN"
            advice = "Tidak ada ancaman terdeteksi. Pertahankan monitoring rutin."
        return (
            f"**Status Keamanan Gudang: [{status}]**\n\n"
            f"• Insiden hari ini: {today['total']} deteksi\n"
            f"• Total historis: {s['total']} deteksi\n\n"
            f"{advice}"
        )

    if intent == "summary":
        s = _get_stats(cursor)
        zones = _get_zone_stats(cursor)
        det = _get_last_detection(cursor)
        today = _get_today_stats(cursor)
        most_zone = zones[0]["zone"] if zones else "N/A"
        last_info = f"{det['type']} di {det['location']} ({det['time']})" if det else "Tidak ada"
        risk_level = "[TINGGI]" if s["danger"] > 2 else "[SEDANG]" if s["danger"] > 0 else "[RENDAH]"
        tail = "Tindakan segera diperlukan. Koordinasikan dengan tim keamanan." if s["danger"] > 0 else "Kondisi gudang dalam batas aman. Lanjutkan monitoring rutin."
        return (
            f"**Ringkasan Laporan Keamanan Gudang**\n"
            f"Digenerate: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}\n\n"
            f"**Statistik:**\n"
            f"• Total deteksi: {s['total']} | Hari ini: {today['total']}\n"
            f"• Bio-Hazard: {s['danger']} | Kontaminasi: {s['warning']} | Monitoring: {s['info']}\n\n"
            f"**Zona Paling Aktif:** {most_zone}\n"
            f"**Deteksi Terakhir:** {last_info}\n"
            f"**Level Risiko Keseluruhan:** {risk_level}\n\n"
            f"{tail}"
        )

    # Unknown
    return (
        "Maaf, saya belum memahami pertanyaan tersebut.\n\n"
        "Coba tanyakan:\n"
        "• \"Zona mana paling berbahaya?\"\n"
        "• \"Berapa total deteksi?\"\n"
        "• \"Kapan terakhir ada insiden?\"\n"
        "• \"Buatkan ringkasan laporan\"\n\n"
        "Atau ketik **\"bantuan\"** untuk melihat semua pertanyaan yang bisa dijawab."
    )



# ── Endpoint ───────────────────────────────────────────────────────────────


@router.post("/chat")
def chat(req: ChatRequest, session=Depends(verify_token)):
    """
    AI Chat — answers natural language questions about warehouse detection data.
    Supports Bahasa Indonesia and English queries.
    """
    intent = _classify_intent(req.message.strip())

    with get_db() as conn:
        cursor = conn.cursor()
        answer = _build_response(intent, cursor)

    return {
        "question": req.message,
        "answer": answer,
        "intent": intent,
        "responder": "SmartWarehouse AI v2.0",
        "timestamp": datetime.datetime.now().isoformat(),
    }
