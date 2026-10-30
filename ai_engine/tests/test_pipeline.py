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
from ai_engine.orientation import PoseOrientationEstimator, KP_NOSE, KP_LEFT_EYE, KP_RIGHT_EYE, KP_LEFT_SHOULDER, KP_RIGHT_SHOULDER, KP_LEFT_EAR, KP_RIGHT_EAR
from ai_engine.reid_osnet import OSNetFeatureExtractor
from ai_engine.reid_gallery import ReIDGallery

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
            self.assertIn("orientation", results["birdsEyeTrajectory"][0])

    def test_pose_orientation_rules(self):
        estimator = PoseOrientationEstimator()

        # Rule 1: FRONT (nose & eye > 0.5)
        kp_front = np.zeros((17, 3))
        kp_front[KP_NOSE] = [100, 50, 0.85]
        kp_front[KP_LEFT_EYE] = [95, 45, 0.80]
        self.assertEqual(estimator.estimate_orientation_from_keypoints(kp_front), "FRONT")

        # Rule 2: BACK (nose/eyes < 0.35, shoulders > 0.35)
        kp_back = np.zeros((17, 3))
        kp_back[KP_NOSE] = [100, 50, 0.10]
        kp_back[KP_LEFT_EYE] = [95, 45, 0.05]
        kp_back[KP_RIGHT_EYE] = [105, 45, 0.08]
        kp_back[KP_LEFT_SHOULDER] = [80, 80, 0.90]
        kp_back[KP_RIGHT_SHOULDER] = [120, 80, 0.88]
        self.assertEqual(estimator.estimate_orientation_from_keypoints(kp_back), "BACK")

        # Rule 3: LEFT / RIGHT (side dominance)
        kp_left = np.zeros((17, 3))
        kp_left[KP_NOSE] = [90, 50, 0.40]
        kp_left[KP_LEFT_EAR] = [80, 48, 0.90]
        kp_left[KP_LEFT_SHOULDER] = [85, 80, 0.85]
        kp_left[KP_RIGHT_EAR] = [100, 48, 0.05]
        kp_left[KP_RIGHT_SHOULDER] = [92, 80, 0.15]
        self.assertEqual(estimator.estimate_orientation_from_keypoints(kp_left, [70, 30, 110, 180]), "LEFT")

    def test_osnet_512d_feature_extraction(self):
        extractor = OSNetFeatureExtractor()
        crop_body = np.random.randint(0, 255, (200, 100, 3), dtype=np.uint8)
        crop_torso = np.random.randint(0, 255, (80, 80, 3), dtype=np.uint8)

        body_vec, torso_vec = extractor.extract_pair(crop_body, crop_torso)
        self.assertEqual(body_vec.shape, (512,))
        self.assertEqual(torso_vec.shape, (512,))
        self.assertAlmostEqual(float(np.linalg.norm(body_vec)), 1.0, places=4)
        self.assertAlmostEqual(float(np.linalg.norm(torso_vec)), 1.0, places=4)

    def test_reid_gallery_matching_and_weighting(self):
        def make_correlated(v, target_sim):
            noise = np.random.randn(len(v))
            noise -= np.dot(noise, v) * v
            noise /= np.linalg.norm(noise)
            res = target_sim * v + np.sqrt(max(0, 1.0 - target_sim**2)) * noise
            return res / np.linalg.norm(res)

        gallery = ReIDGallery(similarity_threshold=0.75)
        v_body_1 = np.random.randn(512); v_body_1 /= np.linalg.norm(v_body_1)
        v_torso_1 = np.random.randn(512); v_torso_1 /= np.linalg.norm(v_torso_1)

        # 1. Register first identity
        gid1, sim1, is_new1 = gallery.match_or_register(v_body_1, v_torso_1, 'FRONT', camera_id='CAM-01')
        self.assertTrue(is_new1)

        # 2. Same angle (FRONT vs FRONT): cosine similarity on body vector > 0.75 matches existing ID
        v_body_same = make_correlated(v_body_1, 0.95)
        v_torso_same = make_correlated(v_torso_1, 0.90)
        gid_same, sim_same, is_new_same = gallery.match_or_register(v_body_same, v_torso_same, 'FRONT', camera_id='CAM-02')
        self.assertEqual(gid_same, gid1)
        self.assertFalse(is_new_same)

        # 3. 180° flip (FRONT vs BACK): 70% weighted on torso crop vector
        # e.g. torso matches high (0.92), body matches 0.45 -> combined = 0.70*0.92 + 0.30*0.45 = 0.779 >= 0.75
        v_torso_opp = make_correlated(v_torso_1, 0.92)
        v_body_opp = make_correlated(v_body_1, 0.45)
        gid_opp, sim_opp, is_new_opp = gallery.match_or_register(v_body_opp, v_torso_opp, 'BACK', camera_id='CAM-03')
        self.assertEqual(gid_opp, gid1)
        self.assertFalse(is_new_opp)

        # 4. Different identity (< 0.75) registers new Global ID
        v_body_diff = make_correlated(v_body_1, 0.20)
        v_torso_diff = make_correlated(v_torso_1, 0.20)
        gid_diff, sim_diff, is_new_diff = gallery.match_or_register(v_body_diff, v_torso_diff, 'FRONT', camera_id='CAM-04')
        self.assertNotEqual(gid_diff, gid1)
        self.assertTrue(is_new_diff)

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

