"""
Smart Warehouse — Auto Download Datasets from Roboflow Universe
================================================================
Downloads 4-class datasets (snake, cat, gecko, lizard) for Case 1.
Idempotent: skips classes already populated.

Usage:
  python download_datasets.py
"""

import os
import sys
import shutil
from pathlib import Path

# Read from environment variable. Get yours at https://app.roboflow.com/settings/api
ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "")
DATASET_DIR = Path("dataset")

# ─── Dataset Sources (verified by user) ───
DATASETS = {
    "snake":  ("project-rh1jo",  "snake-detection",     2),
    "cat":    ("pr-u9xoa",       "cat-detection-yyjkd", 1),
    "gecko":  ("teddychiu",      "gecko-qxjbq",         4),
    "lizard": ("purdue-wtoyq",   "lizard-lzkg2",        2),
}

# Classes to refresh even if already downloaded (for upgrades)
FORCE_REDOWNLOAD = {"snake", "cat", "gecko", "lizard"}


def main():
    if not ROBOFLOW_API_KEY:
        print("[ERROR] ROBOFLOW_API_KEY environment variable not set.")
        print("        Get yours at: https://app.roboflow.com/settings/api")
        print("        Then run: set ROBOFLOW_API_KEY=your_key_here  (Windows)")
        print("                  export ROBOFLOW_API_KEY=your_key_here  (Linux/Mac)")
        sys.exit(1)

    try:
        from roboflow import Roboflow
    except ImportError:
        print("Installing roboflow...")
        os.system(f"{sys.executable} -m pip install roboflow")
        from roboflow import Roboflow

    rf = Roboflow(api_key=ROBOFLOW_API_KEY)
    DATASET_DIR.mkdir(exist_ok=True)

    successes = []
    failures = []

    for class_name, (workspace, project, version) in DATASETS.items():
        target_dir = DATASET_DIR / class_name

        # Force re-download = wipe old data first
        if class_name in FORCE_REDOWNLOAD and target_dir.exists():
            print(f"[CLEAN] Removing existing {target_dir}")
            shutil.rmtree(target_dir, ignore_errors=True)

        # Skip if already populated and not forced
        if target_dir.exists() and any(target_dir.rglob("*.jpg")):
            print(f"[SKIP] {class_name}: already exists")
            successes.append(class_name)
            continue

        print(f"\n[DOWNLOAD] {class_name}")
        print(f"  Workspace: {workspace}")
        print(f"  Project:   {project}")
        print(f"  Version:   {version}")
        try:
            proj = rf.workspace(workspace).project(project)
            proj.version(version).download("yolov8", location=str(target_dir))
            successes.append(class_name)
            print(f"  [OK] Saved to {target_dir}")
        except Exception as e:
            failures.append((class_name, str(e)[:200]))
            print(f"  [FAIL] {str(e)[:200]}")

    print("\n" + "=" * 60)
    print(f"  Successes: {len(successes)} -> {successes}")
    if failures:
        print(f"  Failures:  {len(failures)}")
        for name, err in failures:
            print(f"    - {name}: {err}")
    print("=" * 60)

    # Print image counts per class
    print("\n[IMAGE COUNTS]")
    for class_name in DATASETS.keys():
        d = DATASET_DIR / class_name
        if not d.exists():
            print(f"  {class_name}: not downloaded")
            continue
        train_imgs = list(d.rglob("train/images/*.jpg")) + list(d.rglob("train/images/*.png"))
        val_imgs = list(d.rglob("valid/images/*.jpg")) + list(d.rglob("val/images/*.jpg"))
        test_imgs = list(d.rglob("test/images/*.jpg"))
        print(f"  {class_name}: train={len(train_imgs)}, val={len(val_imgs)}, test={len(test_imgs)}")


if __name__ == "__main__":
    main()
