"""
Test script to verify YOLO11n detection and YOLO11n-pose models with GPU/MPS/CPU execution.
"""
import sys
import os
from pathlib import Path
import time
import numpy as np

# Auto-detect virtual environment if needed
try:
    import torch
    import cv2
    from ultralytics import YOLO
except ModuleNotFoundError:
    CURRENT_DIR = Path(__file__).resolve().parent
    venv_py = CURRENT_DIR / "venv" / "bin" / "python"
    if not venv_py.exists():
        venv_py = CURRENT_DIR / ".venv" / "bin" / "python"
    if venv_py.exists() and not os.environ.get("_BIRDS_EYE_GPU_TEST_EXEC"):
        os.environ["_BIRDS_EYE_GPU_TEST_EXEC"] = "1"
        os.execv(str(venv_py), [str(venv_py)] + sys.argv)
    raise

def check_models_and_gpu():
    print("=" * 60)
    print("Birds-Eye AI Engine — GPU & Model Validation")
    print("=" * 60)
    
    # 1. Device detection
    cuda_available = torch.cuda.is_available()
    mps_available = hasattr(torch.backends, "mps") and torch.backends.mps.is_available()
    
    if cuda_available:
        device = "cuda"
        device_name = torch.cuda.get_device_name(0)
    elif mps_available:
        device = "mps"
        device_name = "Apple Silicon GPU (Metal Performance Shaders - MPS)"
    else:
        device = "cpu"
        device_name = "CPU (Fallback)"
        
    print(f"[Device Detection]")
    print(f"  PyTorch Version: {torch.__version__}")
    print(f"  CUDA Available:  {cuda_available}")
    print(f"  MPS Available:   {mps_available}")
    print(f"  Selected Device: {device} ({device_name})")
    print("-" * 60)

    # 2. Paths
    models_dir = Path(__file__).resolve().parent / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    det_path = models_dir / "yolo11n.pt"
    pose_path = models_dir / "yolo11n-pose.pt"
    
    # 3. Load YOLO11n Detection Model
    print(f"[Loading YOLO11n Detection Model: {det_path.name}]")
    t0 = time.time()
    det_model = YOLO(str(det_path) if det_path.exists() else "yolo11n.pt")
    # Warm up inference on detected device
    dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
    res_det = det_model(dummy_frame, device=device, verbose=False)
    load_time_det = (time.time() - t0) * 1000
    print(f"  ✓ Loaded successfully on device '{device}' in {load_time_det:.1f}ms")
    print(f"  ✓ Detection Forward Pass Confirmed (Boxes: {len(res_det[0].boxes)})")
    print("-" * 60)

    # 4. Load YOLO11n Pose Model
    print(f"[Loading YOLO11n Pose Model: {pose_path.name}]")
    t0 = time.time()
    pose_model = YOLO(str(pose_path) if pose_path.exists() else "yolo11n-pose.pt")
    res_pose = pose_model(dummy_frame, device=device, verbose=False)
    load_time_pose = (time.time() - t0) * 1000
    print(f"  ✓ Loaded successfully on device '{device}' in {load_time_pose:.1f}ms")
    keypoints = res_pose[0].keypoints
    print(f"  ✓ Pose Forward Pass Confirmed (Keypoints object present: {keypoints is not None})")
    print("=" * 60)
    print("Status: GPU/Device Execution Confirmed for both YOLO11n & YOLO11n-Pose!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = check_models_and_gpu()
    sys.exit(0 if success else 1)
