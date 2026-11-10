import sys
from pathlib import Path
import cv2

def extract_thumbnail(video_path, output_image_path, time_sec=1.0):
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return False
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(fps * time_sec))
    ret, frame = cap.read()
    if not ret or frame is None:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        ret, frame = cap.read()
    cap.release()
    if ret and frame is not None:
        h, w = frame.shape[:2]
        if w > 640:
            scale = 640.0 / w
            frame = cv2.resize(frame, (640, int(h * scale)))
        Path(output_image_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_image_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return True
    return False

if __name__ == "__main__":
    if len(sys.argv) > 2:
        video_p = sys.argv[1]
        out_p = sys.argv[2]
        time_s = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
        success = extract_thumbnail(video_p, out_p, time_s)
        sys.exit(0 if success else 1)

