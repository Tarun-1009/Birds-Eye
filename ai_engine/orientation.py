"""
Pose-Based Orientation Estimation Module
Uses YOLO11n-Pose skeleton keypoints to classify person orientation:
FRONT, BACK, LEFT, or RIGHT.
"""
from typing import Tuple, Optional, Dict, Any, List
import numpy as np
import torch
from pathlib import Path
from ultralytics import YOLO

from .config import MODELS_DIR

# COCO 17 Keypoints Index Constants
KP_NOSE = 0
KP_LEFT_EYE = 1
KP_RIGHT_EYE = 2
KP_LEFT_EAR = 3
KP_RIGHT_EAR = 4
KP_LEFT_SHOULDER = 5
KP_RIGHT_SHOULDER = 6
KP_LEFT_ELBOW = 7
KP_RIGHT_ELBOW = 8
KP_LEFT_WRIST = 9
KP_RIGHT_WRIST = 10
KP_LEFT_HIP = 11
KP_RIGHT_HIP = 12
KP_LEFT_KNEE = 13
KP_RIGHT_KNEE = 14
KP_LEFT_ANKLE = 15
KP_RIGHT_ANKLE = 16

class PoseOrientationEstimator:
    def __init__(self, model_path: Optional[Path] = None, device: Optional[str] = None):
        if device is None:
            if torch.cuda.is_available():
                self.device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"
        else:
            self.device = device

        if model_path is None:
            model_file = MODELS_DIR / "yolo11n-pose.pt"
            self.model_path = model_file if model_file.exists() else "yolo11n-pose.pt"
        else:
            self.model_path = Path(model_path)

        self.model = YOLO(str(self.model_path))

    def estimate_orientation_from_keypoints(
        self,
        keypoints: np.ndarray,
        bbox: Optional[List[int]] = None
    ) -> str:
        """
        Applies pose-based orientation rules from 17 skeleton keypoints (x, y, conf):
        1. If nose and eye keypoint confidences > 0.5 -> label as FRONT.
        2. If nose/eyes < 0.35 and shoulder points are visible (> 0.35) -> label as BACK.
        3. If shoulder span is compressed or only one side ear/shoulder is visible -> label as LEFT or RIGHT.
        """
        if keypoints is None or len(keypoints) < 7:
            return "FRONT"

        nose_conf = float(keypoints[KP_NOSE][2])
        left_eye_conf = float(keypoints[KP_LEFT_EYE][2])
        right_eye_conf = float(keypoints[KP_RIGHT_EYE][2])
        left_ear_conf = float(keypoints[KP_LEFT_EAR][2])
        right_ear_conf = float(keypoints[KP_RIGHT_EAR][2])
        left_shoulder_conf = float(keypoints[KP_LEFT_SHOULDER][2])
        right_shoulder_conf = float(keypoints[KP_RIGHT_SHOULDER][2])

        # Rule 1: FRONT
        # If nose and eye keypoint confidences > 0.5 -> label as FRONT
        if nose_conf > 0.5 and (left_eye_conf > 0.5 or right_eye_conf > 0.5):
            return "FRONT"

        # Rule 2: BACK
        # If nose/eyes < 0.35 and shoulder points are visible -> label as BACK
        if (nose_conf < 0.35 and left_eye_conf < 0.35 and right_eye_conf < 0.35
                and (left_shoulder_conf > 0.35 or right_shoulder_conf > 0.35)):
            return "BACK"

        # Rule 3: LEFT or RIGHT
        # Check shoulder span compression
        left_shoulder_x = float(keypoints[KP_LEFT_SHOULDER][0])
        right_shoulder_x = float(keypoints[KP_RIGHT_SHOULDER][0])
        shoulder_span = abs(left_shoulder_x - right_shoulder_x)

        bbox_w = float(bbox[2] - bbox[0]) if (bbox and len(bbox) >= 4) else 100.0
        span_ratio = shoulder_span / max(bbox_w, 1.0)
        is_span_compressed = span_ratio < 0.35

        # Single side ear/shoulder visibility check
        left_side_visibility = left_ear_conf + left_shoulder_conf
        right_side_visibility = right_ear_conf + right_shoulder_conf
        one_side_dominant = abs(left_side_visibility - right_side_visibility) > 0.35

        if is_span_compressed or one_side_dominant:
            # Person profile orientation:
            # If left ear/shoulder is more visible, the left side of the person faces the camera
            if left_side_visibility > right_side_visibility:
                return "LEFT"
            else:
                return "RIGHT"

        # Fallback heuristic if ambiguous
        if nose_conf > 0.4:
            return "FRONT"
        elif left_shoulder_conf > 0.5 and right_shoulder_conf > 0.5:
            return "BACK"
        elif left_ear_conf > right_ear_conf:
            return "LEFT"
        else:
            return "RIGHT"

    def extract_torso_box(
        self,
        keypoints: Optional[np.ndarray],
        full_box: List[int],
        frame_w: int,
        frame_h: int
    ) -> List[int]:
        """
        Derives the torso crop bounding box [x1, y1, x2, y2] from keypoints (shoulders & hips)
        or falls back to anthropometric upper-torso region (20% to 65% of box height).
        """
        x1, y1, x2, y2 = full_box
        bw = max(1, x2 - x1)
        bh = max(1, y2 - y1)

        # Attempt to use skeleton shoulder and hip keypoints
        if keypoints is not None and len(keypoints) >= 13:
            ls = keypoints[KP_LEFT_SHOULDER]
            rs = keypoints[KP_RIGHT_SHOULDER]
            lh = keypoints[KP_LEFT_HIP]
            rh = keypoints[KP_RIGHT_HIP]

            shoulders_vis = (ls[2] > 0.3 or rs[2] > 0.3)
            hips_vis = (lh[2] > 0.3 or rh[2] > 0.3)

            if shoulders_vis and hips_vis:
                y_shoulders = [pt[1] for pt in [ls, rs] if pt[2] > 0.3]
                y_hips = [pt[1] for pt in [lh, rh] if pt[2] > 0.3]
                
                ty1 = int(min(y_shoulders))
                ty2 = int(max(y_hips))
                
                # Use full box width with slight horizontal padding
                tx1 = max(0, x1)
                tx2 = min(frame_w, x2)
                ty1 = max(0, min(ty1, frame_h - 1))
                ty2 = max(ty1 + 10, min(ty2, frame_h))
                if ty2 - ty1 >= 15 and tx2 - tx1 >= 15:
                    return [tx1, ty1, tx2, ty2]

        # Anthropometric fallback: torso is ~20% to ~65% of person height
        ty1 = max(0, int(y1 + 0.18 * bh))
        ty2 = min(frame_h, int(y1 + 0.65 * bh))
        tx1 = max(0, int(x1 + 0.05 * bw))
        tx2 = min(frame_w, int(x2 - 0.05 * bw))
        return [tx1, max(ty1 + 10, ty2 - 15), tx2, ty2]
