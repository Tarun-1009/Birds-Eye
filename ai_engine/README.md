# 🦅 Birds-Eye AI Engine (Powered by YOLO11n)

Video surveillance intelligence module for object detection, person tracking, multi-camera Re-ID cropping, and top-down Bird's-Eye View (BEV) ground plane trajectory mapping using state-of-the-art **Ultralytics YOLO11n**.

---

## 📁 Architecture

```text
ai_engine/
├── config.py              # Path definitions, YOLO11n thresholds & target classes
├── homography.py          # Perspective-to-Ground Plane (BEV 0-100) homography engine
├── synthetic_generator.py # Generates realistic multi-angle CCTV video feeds
├── detector.py            # Stream inspection, YOLO11n inference, crop extraction & tracking
├── test_recording.py      # Primary CLI test runner for recordings in the data folder
├── run_test.bat           # One-click Windows runner
├── models/                # YOLO11n weights (yolo11n.pt) and test reference assets
├── tests/                 # Unittest test suite (test_pipeline.py)
└── venv/                  # Python virtual environment (Torch, OpenCV, Ultralytics)
```

---

## 🚀 Running the Recording Test Suite

### 1. Test All Recordings in the `data/` Folder
Run from the project root:

```bash
# Using npm script:
npm run test:ai

# Or direct Python execution:
ai_engine\venv\Scripts\python.exe ai_engine\test_recording.py

# Or Windows batch runner:
ai_engine\run_test.bat
```

> **Note**: If `data/videos/` is empty when running the test, the test suite will automatically generate a realistic CCTV surveillance feed (`sample_cctv_recording.mp4`) and run the entire verification suite on it.

### 2. Test Options & Flags

```bash
# Test a specific video file:
ai_engine\venv\Scripts\python.exe ai_engine\test_recording.py --input "data/videos/my_cctv.mp4"

# Generate an annotated output video with bounding boxes & BEV coordinates:
ai_engine\venv\Scripts\python.exe ai_engine\test_recording.py --render

# Evaluate every frame (no skipping):
ai_engine\venv\Scripts\python.exe ai_engine\test_recording.py --step 1

# Force regenerate synthetic surveillance test footage:
ai_engine\venv\Scripts\python.exe ai_engine\test_recording.py --generate
```

### 3. Run Standard Unittest Suite

```bash
ai_engine\venv\Scripts\python.exe -m unittest discover -s ai_engine/tests -p "test_*.py"
```

---

## 📊 Outputs Generated in `data/`

- **Target Crops** (`data/crops/`): High-resolution crops of detected targets extracted per frame for appearance feature matching and Re-ID.
- **Test Report** (`data/test_results.json`): Comprehensive JSON report containing video stream metadata, latency benchmarks (FPS, ms/frame), detection counts, confidence metrics, and top-down $(X, Y)$ ground plane trajectory coordinates.
- **Annotated Feeds** (`data/output/`): (Optional when `--render` is used) Video with rendered bounding boxes, labels, confidence scores, and ground coordinates.

