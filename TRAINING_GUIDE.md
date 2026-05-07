# 🐍 Custom YOLO Model Training Guide

Train YOLO11 to detect **Snake, Cat, and Gecko/Lizard** for the Smart Warehouse system.

## Why Custom Training is Needed

The default `yolo11n.pt` model (COCO dataset) only includes 80 generic classes.
**Snake and Gecko/Lizard are NOT in COCO.** Only Cat is detectable with the default model.

| Animal | COCO (Default) | Custom Model |
|--------|:---:|:---:|
| Cat | ✅ | ✅ |
| Snake | ❌ | ✅ |
| Gecko/Lizard | ❌ | ✅ |

## Prerequisites

```bash
cd backend
pip install ultralytics roboflow pyyaml
```

## Step 1: Get a Dataset

### Option A: Roboflow Universe (Recommended)

1. Create a **free account** at [app.roboflow.com](https://app.roboflow.com/)
2. Go to [universe.roboflow.com](https://universe.roboflow.com/)
3. Search and download these datasets in **YOLOv8 format**:
   - `"snake detection"` → pick one with 500+ images
   - `"gecko detection"` or `"lizard detection"` → pick one with 200+ images
   - `"cat detection"` → pick one with 500+ images
4. Extract and merge them into the `backend/dataset/` folder

### Option B: Use Roboflow's Combined Dataset Tool

1. Create a new project on Roboflow with 3 classes: `snake`, `cat`, `gecko`
2. Upload and annotate your own images (or import from Universe)
3. Generate a dataset version and download in YOLOv8 format

## Step 2: Organize the Dataset

Your `backend/dataset/` folder should look like:

```
backend/
└── dataset/
    ├── data.yaml          ← class definitions
    ├── images/
    │   ├── train/         ← training images (.jpg, .png)
    │   └── val/           ← validation images
    └── labels/
        ├── train/         ← YOLO label files (.txt)
        └── val/           ← YOLO label files (.txt)
```

### data.yaml contents:

```yaml
path: ./dataset
train: images/train
val: images/val
nc: 3
names:
  0: snake
  1: cat
  2: gecko
```

> **Important:** If your Roboflow datasets use different class names or IDs,
> edit `data.yaml` to match. The backend's `CLASS_NAME_MAP` handles normalization.

## Step 3: Train the Model

```bash
cd backend
python train_custom_model.py
```

Or train directly with the YOLO CLI:

```bash
yolo detect train model=yolo11n.pt data=dataset/data.yaml epochs=100 imgsz=640 batch=16 device=0 name=warehouse_pest
```

### Training Time (RTX 4050 Laptop GPU):
- **~1000 images**: ~20–30 minutes
- **~3000 images**: ~45–60 minutes
- **~5000 images**: ~90 minutes

## Step 4: Deploy the Model

After training completes:

1. The script automatically copies the best model to `backend/warehouse_pest.pt`
2. If training via CLI, manually copy: `cp runs/detect/warehouse_pest/weights/best.pt warehouse_pest.pt`
3. **Restart the backend server:**
   ```bash
   python main.py
   ```
4. The server will print: `[MODEL] Loaded custom warehouse pest model (warehouse_pest.pt)`

## Step 5: Verify

1. Open the dashboard and start the camera
2. Show a snake/gecko image or video to the camera
3. Confirm bounding boxes appear and logs are created

## Tips for Better Accuracy

- Use **at least 500 images per class** for good results
- Include images with **different lighting conditions** (bright, dim, warehouse-like)
- Include images with **different angles** and **partial occlusion**
- Add **negative examples** (empty warehouse backgrounds) to reduce false positives
- Increase epochs to **150–200** if mAP is below 70%
- Use `imgsz=640` for best accuracy/speed balance
