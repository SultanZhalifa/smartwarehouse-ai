"""
Smart Warehouse — Custom YOLO11 Model Training Script
=====================================================
Trains a YOLO11-nano model to detect: Snake, Cat, Gecko/Lizard
for PT. Kawan Lama Bio-Hazard & Pest Detection system.

Prerequisites:
  pip install ultralytics roboflow

Usage:
  python train_custom_model.py

The trained model will be saved as 'warehouse_pest.pt' in this directory.
Restart the backend server to automatically use the new model.
"""

import os
import shutil
import yaml
import random
from pathlib import Path

# ─── CONFIG ───
# Read from environment variable. Get yours at https://app.roboflow.com/settings/api
ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "")
DATASET_DIR = Path("dataset")
MERGED_DIR = Path("dataset_merged")
EPOCHS = 50
IMG_SIZE = 640
BATCH_SIZE = 16          # RTX 4050 handles 16 with YOLO11n fine
MODEL_BASE = "yolo11n.pt"  # Nano — faster training, still good for 4 classes
OUTPUT_NAME = "warehouse_pest"
VALID_SPLIT_RATIO = 0.15  # 15% of train goes to val if no val exists

# ─── CLASS MAPPING ───
# Case 1 scope animals: 4 classes (snake danger, cat warning, gecko & lizard info)
TARGET_CLASSES = ["snake", "cat", "gecko", "lizard"]


def download_from_roboflow():
    """Download datasets from Roboflow Universe."""
    api_key = ROBOFLOW_API_KEY or os.environ.get("ROBOFLOW_API_KEY")
    
    if not api_key:
        print("\n--- Roboflow API Key Setup ---")
        api_key = input("  Enter your Roboflow API Key: ").strip()
        if not api_key:
            print("  [FAIL] API Key is required to download datasets.")
            return False

    try:
        from roboflow import Roboflow
    except ImportError:
        print("Installing roboflow...")
        os.system("pip install roboflow")
        from roboflow import Roboflow

    rf = Roboflow(api_key=api_key)

    print("\n" + "=" * 60)
    print("  INTERACTIVE DATASET SELECTION")
    print("=" * 60)
    print("""
Since Roboflow has thousands of datasets, you need to pick specific ones.

Recommended datasets (search on universe.roboflow.com):
  • Snake: search "snake detection object detection"
  • Gecko/Lizard: search "gecko detection" or "lizard detection"
  • Cat: search "cat detection"

For each dataset, you need:
  - Workspace name (shown in URL: universe.roboflow.com/WORKSPACE/project)
  - Project name
  - Version number
""")

    downloaded = []
    for animal in TARGET_CLASSES:
        print(f"\n--- {animal.upper()} Dataset ---")
        
        # Check if already downloaded
        animal_dir = DATASET_DIR / animal
        if animal_dir.exists() and any(animal_dir.rglob("*.jpg")) or any(animal_dir.rglob("*.png") if animal_dir.exists() else []):
            print(f"  [OK] {animal} dataset already exists, skipping download.")
            downloaded.append(animal)
            continue
        
        workspace = input(f"  Workspace for {animal} (or 'skip' to skip): ").strip()
        if workspace.lower() == "skip":
            continue
        project = input(f"  Project name: ").strip()
        version = input(f"  Version number: ").strip()

        try:
            proj = rf.workspace(workspace).project(project)
            ds = proj.version(int(version)).download("yolov8", location=str(animal_dir))
            downloaded.append(animal)
            print(f"  [OK] Downloaded {animal} dataset")
        except Exception as e:
            print(f"  [FAIL] Failed to download {animal}: {e}")

    return len(downloaded) > 0


def merge_datasets():
    """
    Merge individual animal datasets into one unified dataset.
    Handles missing valid/test splits by auto-splitting from train.
    Remaps class IDs to our TARGET_CLASSES order.
    """
    print("\n" + "=" * 60)
    print("  MERGING DATASETS")
    print("=" * 60)

    # Create merged directory structure
    for split in ["train", "val"]:
        (MERGED_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (MERGED_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    total_train = 0
    total_val = 0

    for animal in TARGET_CLASSES:
        animal_dir = DATASET_DIR / animal
        if not animal_dir.exists():
            print(f"  [WARN]  {animal} dataset not found, skipping.")
            continue

        # Find the actual data location (Roboflow sometimes nests it)
        train_img_dir = None
        for candidate in [
            animal_dir / "train" / "images",
            animal_dir / "images" / "train",
            animal_dir / "train",
        ]:
            if candidate.exists() and any(candidate.iterdir()):
                train_img_dir = candidate
                break

        if not train_img_dir:
            print(f"  [WARN]  No train images found for {animal}, skipping.")
            continue

        # Find corresponding label directory
        train_lbl_dir = None
        for candidate in [
            animal_dir / "train" / "labels",
            animal_dir / "labels" / "train",
        ]:
            if candidate.exists():
                train_lbl_dir = candidate
                break

        # If labels are in same folder as images (some Roboflow exports)
        if not train_lbl_dir:
            if any(train_img_dir.glob("*.txt")):
                train_lbl_dir = train_img_dir

        # Find valid images
        val_img_dir = None
        val_lbl_dir = None
        for candidate in [
            animal_dir / "valid" / "images",
            animal_dir / "val" / "images",
            animal_dir / "images" / "val",
            animal_dir / "images" / "valid",
        ]:
            if candidate.exists() and any(candidate.iterdir()):
                val_img_dir = candidate
                break

        if val_img_dir:
            for candidate in [
                animal_dir / "valid" / "labels",
                animal_dir / "val" / "labels",
                animal_dir / "labels" / "val",
                animal_dir / "labels" / "valid",
            ]:
                if candidate.exists():
                    val_lbl_dir = candidate
                    break

        # Read the animal's data.yaml to get its class mapping
        animal_yaml = None
        for p in animal_dir.rglob("data.yaml"):
            animal_yaml = p
            break

        original_classes = {}
        if animal_yaml:
            with open(animal_yaml) as f:
                cfg = yaml.safe_load(f)
                if "names" in cfg:
                    if isinstance(cfg["names"], dict):
                        original_classes = cfg["names"]
                    elif isinstance(cfg["names"], list):
                        original_classes = {i: n for i, n in enumerate(cfg["names"])}

        # Determine the target class index for this animal
        target_class_id = TARGET_CLASSES.index(animal)

        # Collect all train images
        train_images = list(train_img_dir.glob("*.jpg")) + list(train_img_dir.glob("*.png")) + list(train_img_dir.glob("*.jpeg"))

        # If no val split, auto-split from train
        if not val_img_dir or not any(val_img_dir.iterdir()):
            random.seed(42)
            random.shuffle(train_images)
            split_idx = max(1, int(len(train_images) * (1 - VALID_SPLIT_RATIO)))
            val_images_list = train_images[split_idx:]
            train_images = train_images[:split_idx]
            print(f"  [INFO] {animal}: Auto-split {len(val_images_list)} images for validation")
        else:
            val_images_list = list(val_img_dir.glob("*.jpg")) + list(val_img_dir.glob("*.png")) + list(val_img_dir.glob("*.jpeg"))

        # Copy train images + remap labels
        for img_path in train_images:
            dest_img = MERGED_DIR / "images" / "train" / f"{animal}_{img_path.name}"
            shutil.copy2(img_path, dest_img)

            # Find and remap label
            if train_lbl_dir:
                lbl_name = img_path.stem + ".txt"
                lbl_path = train_lbl_dir / lbl_name
                if lbl_path.exists():
                    dest_lbl = MERGED_DIR / "labels" / "train" / f"{animal}_{lbl_name}"
                    remap_labels(lbl_path, dest_lbl, target_class_id)

            total_train += 1

        # Copy val images + remap labels
        for img_path in val_images_list:
            dest_img = MERGED_DIR / "images" / "val" / f"{animal}_{img_path.name}"
            shutil.copy2(img_path, dest_img)

            # Find label
            lbl_name = img_path.stem + ".txt"
            lbl_path = None

            if val_lbl_dir:
                lbl_path = val_lbl_dir / lbl_name
            elif train_lbl_dir:
                lbl_path = train_lbl_dir / lbl_name

            if lbl_path and lbl_path.exists():
                dest_lbl = MERGED_DIR / "labels" / "val" / f"{animal}_{lbl_name}"
                remap_labels(lbl_path, dest_lbl, target_class_id)

            total_val += 1

        print(f"  [OK] {animal}: {len(train_images)} train + {len(val_images_list)} val images merged")

    # Write merged data.yaml
    merged_yaml = {
        "path": str(MERGED_DIR.resolve()),
        "train": "images/train",
        "val": "images/val",
        "names": {i: name for i, name in enumerate(TARGET_CLASSES)},
        "nc": len(TARGET_CLASSES),
    }

    yaml_path = MERGED_DIR / "data.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(merged_yaml, f, default_flow_style=False, sort_keys=False)

    print(f"\n  [STATS] Total: {total_train} train + {total_val} val images")
    print(f"  [OK] Merged data.yaml saved to: {yaml_path}")

    return yaml_path


def remap_labels(src_path, dest_path, target_class_id):
    """
    Remap all class IDs in a YOLO label file to the target class ID.
    Since each sub-dataset is one animal, all detections become that animal's class.
    """
    lines = []
    with open(src_path) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 5:
                # Replace original class ID with our target class ID
                parts[0] = str(target_class_id)
                lines.append(" ".join(parts))

    with open(dest_path, "w") as f:
        f.write("\n".join(lines) + "\n" if lines else "")


def setup_manual_dataset():
    """Create folder structure for manual dataset placement."""
    for split in ["train", "val"]:
        (DATASET_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (DATASET_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    # Create data.yaml
    data_yaml = {
        "path": str(DATASET_DIR.resolve()),
        "train": "images/train",
        "val": "images/val",
        "names": {i: name for i, name in enumerate(TARGET_CLASSES)},
        "nc": len(TARGET_CLASSES),
    }

    yaml_path = DATASET_DIR / "data.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(data_yaml, f, default_flow_style=False, sort_keys=False)

    print(f"\n[OK] Created dataset structure at: {DATASET_DIR.resolve()}")
    print(f"   data.yaml saved to: {yaml_path.resolve()}")
    return yaml_path


def train(data_yaml):
    """Train YOLO11 on the custom dataset."""
    from ultralytics import YOLO
    import torch

    device = 0 if torch.cuda.is_available() else 'cpu'
    
    print(f"\n{'=' * 60}")
    print(f"  STARTING TRAINING")
    print(f"{'=' * 60}")
    print(f"  Model:    {MODEL_BASE}")
    print(f"  Dataset:  {data_yaml}")
    print(f"  Epochs:   {EPOCHS}")
    print(f"  Img Size: {IMG_SIZE}")
    print(f"  Batch:    {BATCH_SIZE}")
    print(f"  Device:   {'GPU (CUDA) ' if device == 0 else 'CPU (Slow) [WARN]'}")
    print(f"{'=' * 60}\n")

    # Load pretrained model
    model = YOLO(MODEL_BASE)

    # Train
    results = model.train(
        data=str(data_yaml),
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH_SIZE,
        name=OUTPUT_NAME,
        patience=20,
        save=True,
        device=device,
        workers=4,
        exist_ok=True,
        pretrained=True,
        verbose=True,
    )

    # Copy best model to backend root
    best_path = Path(f"runs/detect/{OUTPUT_NAME}/weights/best.pt")
    if best_path.exists():
        dest = Path("warehouse_pest.pt")
        shutil.copy(best_path, dest)
        print(f"\n{'=' * 60}")
        print(f"  [OK] TRAINING COMPLETE!")
        print(f"{'=' * 60}")
        print(f"  Best model saved to: {dest.resolve()}")
        print(f"  Restart the backend server to use the new model.")
        print(f"  The server will automatically detect warehouse_pest.pt")
        print(f"{'=' * 60}")
    else:
        print("\n[FAIL] Training completed but best.pt not found.")
        print(f"   Check runs/detect/{OUTPUT_NAME}/weights/")


def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║   Smart Warehouse — Custom YOLO Model Trainer            ║
║   Case 1: Bio-Hazard & Pest Detection                   ║
║   Target Classes: Snake, Cat, Gecko                      ║
╚══════════════════════════════════════════════════════════╝
""")

    # Check if merged dataset already exists
    merged_yaml = MERGED_DIR / "data.yaml"
    if merged_yaml.exists():
        print(f"[OK] Found merged dataset: {merged_yaml}")
        response = input("   Start training with this dataset? (y/n): ").strip().lower()
        if response == "y":
            train(merged_yaml)
            return

    # Check if individual datasets exist
    existing = [a for a in TARGET_CLASSES if (DATASET_DIR / a).exists()]
    if existing:
        print(f"[INFO] Found existing datasets: {', '.join(existing)}")
        response = input("   Merge and train with these? (y/n): ").strip().lower()
        if response == "y":
            yaml_path = merge_datasets()
            if yaml_path:
                train(yaml_path)
            return

    # Setup options
    print("\nHow do you want to set up the dataset?\n")
    print("  1. Download from Roboflow (needs API key)")
    print("  2. Manual setup (I'll prepare the data myself)")
    print("  3. I already placed data in dataset/ folder")

    choice = input("\nChoice (1/2/3): ").strip()

    if choice == "1":
        if download_from_roboflow():
            # Merge all downloaded datasets
            yaml_path = merge_datasets()
            if yaml_path:
                train(yaml_path)
    elif choice == "2":
        yaml_path = setup_manual_dataset()
        print(f"""
┌─────────────────────────────────────────────────┐
│  NEXT STEPS:                                    │
│                                                 │
│  1. Place training images in:                   │
│     dataset/images/train/                       │
│                                                 │
│  2. Place validation images in:                 │
│     dataset/images/val/                         │
│                                                 │
│  3. Place YOLO label files (.txt) in:           │
│     dataset/labels/train/                       │
│     dataset/labels/val/                         │
│                                                 │
│  Class IDs:                                     │
│     0 = snake                                   │
│     1 = cat                                     │
│     2 = gecko                                   │
│                                                 │
│  4. Run this script again to start training     │
└─────────────────────────────────────────────────┘
""")
    elif choice == "3":
        yaml_path = merge_datasets()
        if yaml_path:
            train(yaml_path)
    else:
        print("Invalid choice.")


if __name__ == "__main__":
    main()
