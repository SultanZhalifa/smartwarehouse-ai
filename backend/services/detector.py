"""
Smart Warehouse — AI Detection Service
========================================
YOLO11 model loading (auto-detects custom vs pretrained),
HUD-style bounding box rendering with corner brackets,
label pills, and confidence bars.
"""

import os
import cv2
import numpy as np
from ultralytics import YOLO

from config import (
    TRACKED_CLASSES, DANGER_CLASSES, WARNING_CLASSES, CLASS_NAME_MAP
)

# ─── Model Loading ───
model = None

try:
    if os.path.exists("warehouse_pest.pt"):
        model = YOLO("warehouse_pest.pt")
        print("[MODEL] Loaded custom warehouse pest model (warehouse_pest.pt)")
    elif os.path.exists("yolo11n.pt"):
        model = YOLO("yolo11n.pt")
        print("[MODEL] Custom model not found. Using YOLO11-nano (COCO).")
    else:
        print("[MODEL] No YOLO model weights found. AI detection disabled.")
except Exception as e:
    print(f"[MODEL] Failed to load YOLO model: {e}")


def get_risk_info(class_name: str):
    """Return color scheme and risk tag based on pest class."""
    if class_name in DANGER_CLASSES:
        return {
            "color": (71, 71, 255),       # Soft red (BGR)
            "accent": (100, 100, 255),     # Lighter red
            "tag": "DANGER",
            "level": "danger",
        }
    elif class_name in WARNING_CLASSES:
        return {
            "color": (66, 182, 255),       # Amber/orange (BGR)
            "accent": (100, 200, 255),     # Lighter amber
            "tag": "WARNING",
            "level": "warning",
        }
    else:
        return {
            "color": (181, 230, 29),       # Cyber green (BGR)
            "accent": (200, 245, 80),      # Lighter green
            "tag": "MONITOR",
            "level": "info",
        }


def draw_hud_bounding_box(frame, x1, y1, x2, y2, class_name, conf):
    """
    Draw a premium HUD-style bounding box with:
    - Corner brackets
    - Semi-transparent overlay
    - Label pill with class name, confidence, and risk tag
    - Confidence bar at the bottom
    """
    risk = get_risk_info(class_name)
    color = risk["color"]
    accent = risk["accent"]
    risk_tag = risk["tag"]

    w, h = x2 - x1, y2 - y1

    # ── Corner Bracket Style ──
    corner_len = max(15, min(w, h) // 5)
    thickness = 2

    # Top-left corner
    cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, thickness)
    cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, thickness)
    # Top-right corner
    cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, thickness)
    cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, thickness)
    # Bottom-left corner
    cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, thickness)
    cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, thickness)
    # Bottom-right corner
    cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, thickness)
    cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, thickness)

    # ── Thin connecting lines (subtle) ──
    overlay = frame.copy()
    cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 1)
    cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)

    # ── Semi-transparent label background ──
    label_text = f"{class_name.upper()}"
    conf_text = f"{int(conf * 100)}%"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.5

    (lw, lh), baseline = cv2.getTextSize(label_text, font, font_scale, 1)
    (cw, ch), _ = cv2.getTextSize(conf_text, font, font_scale - 0.1, 1)
    (rw, rh), _ = cv2.getTextSize(risk_tag, font, font_scale - 0.15, 1)

    # Label pill dimensions
    pill_w = lw + cw + rw + 40
    pill_h = lh + 14
    pill_y1 = max(0, y1 - pill_h - 4)
    pill_y2 = max(pill_h, y1 - 4)

    # Background
    overlay2 = frame.copy()
    cv2.rectangle(overlay2, (x1, pill_y1), (x1 + pill_w, pill_y2), (30, 30, 30), -1)
    cv2.addWeighted(overlay2, 0.75, frame, 0.25, 0, frame)

    # Left color accent bar
    cv2.rectangle(frame, (x1, pill_y1), (x1 + 3, pill_y2), color, -1)

    # Text rendering
    text_y = pill_y2 - 5
    cv2.putText(frame, label_text, (x1 + 8, text_y),
                font, font_scale, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.putText(frame, conf_text, (x1 + lw + 16, text_y),
                font, font_scale - 0.1, accent, 1, cv2.LINE_AA)
    tag_x = x1 + lw + cw + 28
    cv2.putText(frame, risk_tag, (tag_x, text_y),
                font, font_scale - 0.15, color, 1, cv2.LINE_AA)

    # ── Confidence bar (bottom of box) ──
    bar_h = 3
    bar_y = y2 + 4
    bar_w_full = w
    bar_w_fill = int(bar_w_full * conf)

    # Bar background
    overlay3 = frame.copy()
    cv2.rectangle(overlay3, (x1, bar_y), (x1 + bar_w_full, bar_y + bar_h), (60, 60, 60), -1)
    cv2.addWeighted(overlay3, 0.5, frame, 0.5, 0, frame)

    # Bar fill
    cv2.rectangle(frame, (x1, bar_y), (x1 + bar_w_fill, bar_y + bar_h), color, -1)

    return frame
