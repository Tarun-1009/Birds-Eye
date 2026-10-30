"""
Unit tests for Birds-Eye AI Engine
"""
import unittest
import sys
import os
from pathlib import Path

# Auto-detect and switch to virtual environment if dependencies are not in current interpreter
try:
    import cv2
except ModuleNotFoundError:
    CURRENT_DIR = Path(__file__).resolve().parent
    AI_DIR = CURRENT_DIR.parent
    PROJECT_ROOT = AI_DIR.parent
    venv_candidates = [
        AI_DIR / ".venv" / "bin" / "python",
        AI_DIR / "venv" / "bin" / "python",
        AI_DIR / ".venv" / "bin" / "python3",
        AI_DIR / "venv" / "bin" / "python3",
        AI_DIR / ".venv" / "Scripts" / "python.exe",
        AI_DIR / "venv" / "Scripts" / "python.exe",
        PROJECT_ROOT / ".venv" / "bin" / "python",
        PROJECT_ROOT / "venv" / "bin" / "python",
    ]
    switched = False
    if not os.environ.get("_BIRDS_EYE_VENV_ATTEMPTED"):
        for py_bin in venv_candidates:
            if py_bin.exists():
                os.environ["_BIRDS_EYE_VENV_ATTEMPTED"] = "1"
                os.execv(str(py_bin), [str(py_bin)] + sys.argv)
                switched = True
                break
    if not switched:
        print("[ERROR] Missing required dependency 'cv2' (opencv-python).")
        print(f"Current Python interpreter: {sys.executable}")
        print("\nPlease activate the project virtual environment or install dependencies:")
        print("  source ai_engine/.venv/bin/activate")
        print("  pip install -r ai_engine/requirements.txt")
        sys.exit(1)

# Ensure project root is in sys.path
TEST_DIR = Path(__file__).resolve().parent
ROOT_DIR = TEST_DIR.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import numpy as np

from ai_engine.config import VIDEOS_DIR, CROPS_DIR, DEFAULT_SAMPLE_STEP
from ai_engine.homography import HomographyTransformer
from ai_engine.synthetic_generator import generate_test_recording
from ai_engine.detector import RecordingProcessor

class TestAIEnginePipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Generate a lightweight test recording
        cls.test_video_path = generate_test_recording(
            output_filename="unittest_sample.mp4",
            duration_sec=2,
            fps=20,
            width=320,
            height=240,
            camera_label="UNITTEST-CAM-01"
        )
        cls.processor = RecordingProcessor()

    def test_homography_projection(self):
        transformer = HomographyTransformer()
        # Test center point
        point = transformer.project_point(320, 240, frame_w=640, frame_h=480)
        self.assertIn("x", point)
        self.assertIn("y", point)
        self.assertGreaterEqual(point["x"], 0.0)
        self.assertLessEqual(point["x"], 100.0)
        self.assertGreaterEqual(point["y"], 0.0)
        self.assertLessEqual(point["y"], 100.0)

    def test_recording_metadata_inspection(self):
        info = self.processor.inspect_recording(self.test_video_path)
        self.assertTrue(info["readable"])
        self.assertEqual(info["width"], 320)
        self.assertEqual(info["height"], 240)
        self.assertGreater(info["total_frames"], 0)

    def test_detection_pipeline_run(self):
        results = self.processor.process_recording(
            video_path=self.test_video_path,
            sample_step=DEFAULT_SAMPLE_STEP,
            save_crops=True,
            render_annotated=False
        )
        self.assertIn("recording_info", results)
        self.assertIn("performance", results)
        self.assertIn("summary", results)
        self.assertIn("unique_local_objects_tracked", results["summary"])
        self.assertIn("local_ids_tracked", results["summary"])
        self.assertIn("birdsEyeTrajectory", results)
        self.assertEqual(results.get("model"), "yolo11n.pt")
        self.assertGreater(results["performance"]["frames_evaluated"], 0)
        if len(results["birdsEyeTrajectory"]) > 0:
            self.assertIn("local_id", results["birdsEyeTrajectory"][0])

    @classmethod
    def tearDownClass(cls):
        # Clean up unittest sample file
        if cls.test_video_path.exists():
            try:
                cls.test_video_path.unlink()
            except Exception:
                pass

if __name__ == "__main__":
    unittest.main()

