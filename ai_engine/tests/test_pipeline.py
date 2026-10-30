"""
Unit tests for Birds-Eye AI Engine
"""
import unittest
from pathlib import Path
import numpy as np

from ai_engine.config import VIDEOS_DIR, CROPS_DIR
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
            sample_step=4,
            save_crops=True,
            render_annotated=False
        )
        self.assertIn("recording_info", results)
        self.assertIn("performance", results)
        self.assertIn("summary", results)
        self.assertIn("birdsEyeTrajectory", results)
        self.assertEqual(results.get("model"), "yolo11n.pt")
        self.assertGreater(results["performance"]["frames_evaluated"], 0)

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

