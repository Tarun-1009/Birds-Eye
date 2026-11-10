"""
Birds-Eye AI Engine Configuration
Surveillance Core: Persons & Moving Vehicles (Cars, Bikes, Motorcycles, Bicycles, Trucks, Buses)
No clutter objects (suitcases, coolers, backpacks, furniture are completely excluded)
"""
from pathlib import Path
import os

# Root directories
ENGINE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = ENGINE_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
VIDEOS_DIR = DATA_DIR / "videos"
CROPS_DIR = DATA_DIR / "crops"
OUTPUT_DIR = DATA_DIR / "output"
MODELS_DIR = ENGINE_DIR / "models"

# Ensure runtime directories exist
for directory in [DATA_DIR, VIDEOS_DIR, CROPS_DIR, OUTPUT_DIR, MODELS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# YOLO Model Configurations: Upgraded to YOLO11m (Medium) for high accuracy
MODEL_NAME = "yolo11m.pt"
MODEL_PATH = MODELS_DIR / MODEL_NAME
CONFIDENCE_THRESHOLD = 0.32
PERSON_CONFIDENCE = 0.32
VEHICLE_CONFIDENCE = 0.32
IOU_THRESHOLD = 0.45
INFERENCE_IMG_SIZE = 960   # High-resolution inference (separates adjacent/small cars)
DEFAULT_SAMPLE_STEP = 2    # High-rate sampling (evaluates every 2nd frame for live running tracks)
MOTION_SAMPLE_INTERVAL_SEC = 0.20  # Fast motion recording interval (records runners every 0.2s)
MIN_TRACK_SIGHTINGS = 3    # Prunes transient 1-2 frame ghost flickers so true objects stay exact

# Supported recording video extensions
SUPPORTED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v"}

# COCO Classes STRICTLY for surveillance:
# Only Persons and Moving Vehicles. Zero suitcases, coolers, or accessories.
TARGET_CLASSES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

# Vehicles tracked as moving mobile entities
VEHICLE_CLASSES = {1, 2, 3, 5, 7}

# Zero background clutter
CARRIED_ITEM_CLASSES = set()
OBJECT_CLASSES = set()
