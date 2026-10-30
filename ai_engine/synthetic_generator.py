"""
Synthetic CCTV Recording Generator
Generates realistic surveillance test recordings in `data/videos` with moving targets
and CCTV overlays when no test footage is present.
"""
from pathlib import Path
import numpy as np
import cv2
import time
from .config import VIDEOS_DIR, MODELS_DIR

def generate_test_recording(
    output_filename: str = "sample_cctv_recording.mp4",
    duration_sec: int = 5,
    fps: int = 25,
    width: int = 640,
    height: int = 480,
    camera_label: str = "CCTV-CAM-01 [FRONT COURTYARD]"
) -> Path:
    """
    Generates a realistic surveillance MP4 video file.
    If sample_frame.jpg exists in models directory, pans/animates across it with CCTV overlay.
    """
    out_path = VIDEOS_DIR / output_filename
    sample_img_path = MODELS_DIR / "sample_frame.jpg"
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(out_path), fourcc, fps, (width, height))
    
    total_frames = duration_sec * fps
    
    source_img = None
    if sample_img_path.exists():
        loaded = cv2.imread(str(sample_img_path))
        if loaded is not None:
            source_img = loaded

    for f in range(total_frames):
        t = f / fps
        progress = f / float(total_frames)

        if source_img is not None:
            src_h, src_w = source_img.shape[:2]
            # Dynamic pan & subtle zoom to simulate CCTV tracking pan-tilt
            crop_w = int(src_w * 0.82)
            crop_h = int(src_h * 0.82)
            max_x = src_w - crop_w
            max_y = src_h - crop_h
            
            x_offset = int(max_x * (0.1 + 0.8 * progress))
            y_offset = int(max_y * (0.3 + 0.4 * np.sin(progress * np.pi)))
            
            cropped = source_img[y_offset:y_offset + crop_h, x_offset:x_offset + crop_w]
            frame = cv2.resize(cropped, (width, height), interpolation=cv2.INTER_LINEAR)
        else:
            # Fallback simulated surveillance frame
            frame = np.full((height, width, 3), 35, dtype=np.uint8)
            # Perspective grid
            for i in range(0, width, 60):
                cv2.line(frame, (i, height // 2), (i + (i - width // 2) * 2, height), (55, 60, 68), 1)
            # Silhouette
            px = int(100 + progress * 440)
            py = int(300 + progress * 70)
            cv2.circle(frame, (px, py - 40), 12, (50, 70, 190), -1)
            cv2.rectangle(frame, (px - 10, py - 30), (px + 10, py + 10), (50, 70, 190), -1)

        # Surveillance CCTV HUD overlay
        timestamp_str = time.strftime("2026-10-31 %H:%M:%S", time.gmtime(1793400000 + int(t)))
        msec = int((t % 1) * 1000)
        full_time_str = f"{timestamp_str}.{msec:03d} UTC"
        
        # Header banner
        cv2.putText(frame, camera_label, (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.putText(frame, full_time_str, (20, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)
        cv2.putText(frame, f"REC [LIVE {fps}.0 FPS]", (width - 210, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255), 2)
        
        # Crosshair center overlay
        cx, cy = width // 2, height // 2
        cv2.line(frame, (cx - 12, cy), (cx + 12, cy), (0, 255, 255), 1)
        cv2.line(frame, (cx, cy - 12), (cx, cy + 12), (0, 255, 255), 1)
        
        # Frame counter in footer
        cv2.putText(frame, f"FRAME: {f:05d}/{total_frames:05d}", (20, height - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 160, 160), 1)
        
        out.write(frame)
        
    out.release()
    return out_path
