"""
Homography and Bird's-Eye View (BEV) Ground Plane Projection
Maps 2D pixel coordinates (camera perspective) to top-down 2D ground plane coordinates (0-100 scale).
"""
import numpy as np
import cv2

class HomographyTransformer:
    """
    Transforms camera frame coordinates (bottom center of bounding boxes, representing feet/ground contact)
    into top-down 2D Bird's-Eye View (BEV) coordinates.
    """
    def __init__(self, src_points=None, dst_points=None, camera_preset="default"):
        self.camera_preset = camera_preset
        
        # Default perspective calibration: projects trapezoidal camera view onto square top-down grid (0-100 x 0-100)
        if src_points is None or dst_points is None:
            # Presets for common camera angles
            if camera_preset == "overhead":
                # High overhead camera: slight perspective correction
                self.src_points = np.float32([
                    [100, 100], [540, 100], [600, 440], [40, 440]
                ])
            elif camera_preset == "side":
                # Side camera angle: asymmetric projection
                self.src_points = np.float32([
                    [150, 120], [580, 80], [620, 460], [80, 460]
                ])
            else:
                # Standard front/angled CCTV view
                self.src_points = np.float32([
                    [120, 140], [520, 140], [620, 460], [20, 460]
                ])
                
            self.dst_points = np.float32([
                [10, 10], [90, 10], [90, 90], [10, 90]
            ])
        else:
            self.src_points = np.float32(src_points)
            self.dst_points = np.float32(dst_points)

        # Compute 3x3 homography matrix H
        self.H, _ = cv2.findHomography(self.src_points, self.dst_points, cv2.RANSAC, 5.0)

    def project_point(self, x: float, y: float, frame_w: int = 640, frame_h: int = 480) -> dict:
        """
        Projects an image coordinate (x, y) to top-down ground coordinates (X, Y) normalized to [0, 100].
        """
        # Normalize relative to source reference calibration (default reference 640x480)
        norm_x = (x / frame_w) * 640.0
        norm_y = (y / frame_h) * 480.0
        
        pt = np.array([[[norm_x, norm_y]]], dtype=np.float32)
        
        try:
            transformed = cv2.perspectiveTransform(pt, self.H)
            bev_x = float(np.clip(transformed[0][0][0], 0.0, 100.0))
            bev_y = float(np.clip(transformed[0][0][1], 0.0, 100.0))
        except Exception:
            # Fallback linear mapping
            bev_x = float(np.clip((x / frame_w) * 100.0, 0.0, 100.0))
            bev_y = float(np.clip((y / frame_h) * 100.0, 0.0, 100.0))

        return {
            "x": round(bev_x, 2),
            "y": round(bev_y, 2)
        }

    def project_bbox(self, bbox: list, frame_w: int, frame_h: int) -> dict:
        """
        Takes bounding box [x1, y1, x2, y2] and projects the bottom-center point (feet contact).
        """
        x1, y1, x2, y2 = bbox
        feet_x = (x1 + x2) / 2.0
        feet_y = float(y2)
        return self.project_point(feet_x, feet_y, frame_w, frame_h)

