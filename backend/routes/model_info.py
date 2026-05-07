"""
Smart Warehouse — Model Info & Health Routes
===============================================
Public endpoints exposing AI model metadata,
training performance metrics, and system health status.
"""

import os
import csv
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

from services.detector import model

router = APIRouter(prefix="/api", tags=["System"])

TRAINING_DIR = Path("runs/detect/warehouse_pest")


def _parse_training_metrics():
    """Parse results.csv from YOLO training to extract final epoch metrics."""
    results_csv = TRAINING_DIR / "results.csv"
    if not results_csv.exists():
        return None

    try:
        with open(results_csv, "r") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if not rows:
            return None

        # Get final epoch (best metrics are at the end for converged training)
        final = rows[-1]

        # Clean column names (YOLO CSV sometimes has leading spaces)
        final = {k.strip(): v.strip() for k, v in final.items()}

        # Find best mAP50 epoch
        best_map50 = 0.0
        best_epoch = 0
        for row in rows:
            cleaned = {k.strip(): v.strip() for k, v in row.items()}
            map50 = float(cleaned.get("metrics/mAP50(B)", 0))
            if map50 > best_map50:
                best_map50 = map50
                best_epoch = int(cleaned.get("epoch", 0))

        return {
            "epochs_trained": len(rows),
            "best_epoch": best_epoch,
            "final_metrics": {
                "precision": round(float(final.get("metrics/precision(B)", 0)) * 100, 2),
                "recall": round(float(final.get("metrics/recall(B)", 0)) * 100, 2),
                "mAP50": round(float(final.get("metrics/mAP50(B)", 0)) * 100, 2),
                "mAP50_95": round(float(final.get("metrics/mAP50-95(B)", 0)) * 100, 2),
            },
            "final_loss": {
                "box_loss": round(float(final.get("val/box_loss", 0)), 4),
                "cls_loss": round(float(final.get("val/cls_loss", 0)), 4),
                "dfl_loss": round(float(final.get("val/dfl_loss", 0)), 4),
            },
            "training_curve": [
                {
                    "epoch": int(r.get("epoch", "0").strip()),
                    "mAP50": round(float(r.get("metrics/mAP50(B)", "0").strip()) * 100, 2),
                    "mAP50_95": round(float(r.get("metrics/mAP50-95(B)", "0").strip()) * 100, 2),
                    "precision": round(float(r.get("metrics/precision(B)", "0").strip()) * 100, 2),
                    "recall": round(float(r.get("metrics/recall(B)", "0").strip()) * 100, 2),
                    "val_box_loss": round(float(r.get("val/box_loss", "0").strip()), 4),
                    "val_cls_loss": round(float(r.get("val/cls_loss", "0").strip()), 4),
                }
                for r in [{k.strip(): v for k, v in row.items()} for row in rows]
            ],
        }
    except Exception as e:
        print(f"[MODEL-INFO] Error parsing training metrics: {e}")
        return None


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
    Public endpoint exposing AI model metadata and training performance.
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

    # Training performance metrics
    training = _parse_training_metrics()

    # Available training artifact images
    artifacts = []
    artifact_files = [
        ("confusion_matrix", "Confusion Matrix"),
        ("confusion_matrix_normalized", "Normalized Confusion Matrix"),
        ("results", "Training Results"),
        ("BoxF1_curve", "F1 Score Curve"),
        ("BoxPR_curve", "Precision-Recall Curve"),
        ("BoxP_curve", "Precision Curve"),
        ("BoxR_curve", "Recall Curve"),
        ("labels", "Dataset Label Distribution"),
    ]
    for filename, label in artifact_files:
        ext = ".jpg" if filename == "labels" else ".png"
        if (TRAINING_DIR / f"{filename}{ext}").exists():
            artifacts.append({
                "key": filename,
                "label": label,
                "url": f"/api/training-artifacts/{filename}",
            })

    response = {
        "status": "loaded",
        "model_file": model_path,
        "model_size_mb": model_size_mb,
        "num_classes": len(class_names),
        "class_names": class_names,
        "input_resolution": 640,
        "inference_resolution": 320,
        "framework": "Ultralytics YOLO11",
        "base_model": "yolo11n (Nano)",
        "task": "Object Detection",
        "use_case": "Bio-Hazard & Pest Detection (Snake, Cat, Gecko/Lizard)",
        "risk_classification": {
            "danger": "Snake — Bio-Hazard (immediate evacuation)",
            "warning": "Cat — Contamination (sanitization required)",
            "info": "Gecko/Lizard — Monitoring (entry point inspection)",
        },
        "training": training,
        "artifacts": artifacts,
    }

    return response


@router.get("/training-artifacts/{artifact_name}")
def get_training_artifact(artifact_name: str):
    """Serve training artifact images (confusion matrix, PR curves, etc.)."""
    # Security: only allow known filenames
    allowed = {
        "confusion_matrix", "confusion_matrix_normalized", "results",
        "BoxF1_curve", "BoxPR_curve", "BoxP_curve", "BoxR_curve", "labels",
        "val_batch0_labels", "val_batch0_pred",
        "val_batch1_labels", "val_batch1_pred",
        "val_batch2_labels", "val_batch2_pred",
    }
    if artifact_name not in allowed:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Artifact not found")

    ext = ".jpg" if artifact_name in ("labels",) or artifact_name.startswith("val_") else ".png"
    file_path = TRAINING_DIR / f"{artifact_name}{ext}"

    if not file_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Artifact file not found on disk")

    media_type = "image/jpeg" if ext == ".jpg" else "image/png"
    return FileResponse(str(file_path), media_type=media_type)
