"""
Smart Warehouse — Model Info & Health Routes
===============================================
Public endpoints exposing AI model metadata,
performance specs, and system health status.
"""

import os

from fastapi import APIRouter

from services.detector import model

router = APIRouter(prefix="/api", tags=["System"])


@router.get("/health")
def health_check():
    """Public health endpoint for Docker healthcheck and uptime monitoring."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "model_loaded": model is not None,
        "service": "Smart Warehouse API",
    }


@router.get("/model-info")
def get_model_info():
    """
    Public endpoint exposing AI model metadata.
    Useful for judges/reviewers to verify model capabilities.
    """
    if model is None:
        return {
            "status": "no_model",
            "message": "No YOLO model is currently loaded.",
        }

    # Model file info
    model_path = None
    model_size_mb = 0
    for candidate in ["warehouse_pest.pt", "yolo11n.pt", "yolo26n.pt"]:
        if os.path.exists(candidate):
            model_path = candidate
            model_size_mb = round(os.path.getsize(candidate) / (1024 * 1024), 2)
            break

    # Class names from loaded model
    class_names = list(model.names.values()) if hasattr(model, "names") else []

    return {
        "status": "loaded",
        "model_file": model_path,
        "model_size_mb": model_size_mb,
        "num_classes": len(class_names),
        "class_names": class_names,
        "input_resolution": 320,
        "framework": "Ultralytics YOLO11",
        "task": "Object Detection",
        "use_case": "Bio-Hazard & Pest Detection (Snake, Cat, Gecko/Lizard)",
        "risk_classification": {
            "danger": "Snake — Bio-Hazard (immediate evacuation)",
            "warning": "Cat — Contamination (sanitization required)",
            "info": "Gecko/Lizard — Monitoring (entry point inspection)",
        },
    }
