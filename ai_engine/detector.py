"""
Surveillance Recording Detection & Bird's-Eye View Processor
Performs YOLO object detection, multi-target tracking, crop extraction,
and ground-plane projection on video recordings.
"""
from pathlib import Path
from typing import Dict, List, Any, Optional
import time
import json
import cv2
import numpy as np
from ultralytics import YOLO

from .config import (
    MODEL_NAME,
    MODEL_PATH,
    CROPS_DIR,
    OUTPUT_DIR,
    CONFIDENCE_THRESHOLD,
    TARGET_CLASSES,
)
from .homography import HomographyTransformer

class RecordingProcessor:
    """
    Processes surveillance video recordings to detect persons/objects,
    extract crops, and compute Bird's-Eye View coordinates using YOLO11n.
    """
    def __init__(
        self,
        model_path: Optional[Path] = None,
        confidence_thresh: float = CONFIDENCE_THRESHOLD,
        camera_angle: str = "default"
    ):
        path = model_path or MODEL_PATH
        if not Path(path).exists():
            path = MODEL_NAME
            
        self.model = YOLO(str(path))
        self.model_name = Path(path).name
        self.conf_thresh = confidence_thresh
        self.homography = HomographyTransformer(camera_preset=camera_angle)

    def inspect_recording(self, video_path: Path) -> Dict[str, Any]:
        """
        Extracts stream metadata and validates video file readability.
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise IOError(f"Cannot open video recording: {video_path}")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS)) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps if fps > 0 else 0.0
        
        # Test reading the first frame
        ret, sample_frame = cap.read()
        cap.release()

        return {
            "readable": ret and sample_frame is not None,
            "filename": video_path.name,
            "filepath": str(video_path.resolve()),
            "width": width,
            "height": height,
            "fps": round(fps, 2),
            "total_frames": total_frames,
            "duration_sec": round(duration_sec, 2),
            "file_size_bytes": video_path.stat().st_size
        }

    def process_recording(
        self,
        video_path: Path,
        sample_step: int = 5,
        save_crops: bool = True,
        max_crops_per_video: int = 20,
        render_annotated: bool = False,
        target_class_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Runs object detection and Bird's Eye View mapping on a surveillance recording.

        Args:
            video_path: Path to the video file
            sample_step: Run inference every N frames (1 = every frame)
            save_crops: Whether to save cropped target images to data/crops/
            max_crops_per_video: Max number of crops to save
            render_annotated: Whether to generate an annotated debug video
            target_class_ids: List of COCO class IDs to track (e.g. [0] for Person)
        """
        info = self.inspect_recording(video_path)
        cap = cv2.VideoCapture(str(video_path))
        
        if target_class_ids is None:
            # Default to Person (0), Car (2), Backpack (24), Suitcase (28)
            target_class_ids = [0, 2, 24, 28]

        detections_by_frame = []
        bev_trajectory = []
        saved_crop_files = []
        unique_local_ids = set()
        
        frame_idx = 0
        inference_times = []
        total_detections_count = 0
        video_stem = video_path.stem
        
        annotated_writer = None
        if render_annotated:
            out_video_path = OUTPUT_DIR / f"{video_stem}_annotated.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            annotated_writer = cv2.VideoWriter(
                str(out_video_path), fourcc, info["fps"], (info["width"], info["height"])
            )

        start_time = time.time()

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Only run inference on sampled frames
            if frame_idx % sample_step == 0:
                t0 = time.time()
                # Run YOLO tracking with persistent local IDs
                results = self.model.track(
                    frame,
                    persist=True,
                    conf=self.conf_thresh,
                    verbose=False
                )[0]
                t_infer = time.time() - t0
                inference_times.append(t_infer)

                boxes = results.boxes
                frame_sec = round(frame_idx / info["fps"], 2)
                timestamp_str = f"{int(frame_sec // 60):02d}:{int(frame_sec % 60):02d}"

                frame_detections = []

                for i, box in enumerate(boxes):
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    
                    if cls_id not in target_class_ids:
                        continue

                    xyxy = box.xyxy[0].cpu().numpy().astype(int)
                    x1, y1, x2, y2 = xyxy.tolist()
                    
                    # Clamp to frame boundaries
                    x1 = max(0, min(x1, info["width"] - 1))
                    y1 = max(0, min(y1, info["height"] - 1))
                    x2 = max(0, min(x2, info["width"] - 1))
                    y2 = max(0, min(y2, info["height"] - 1))
                    
                    class_name = TARGET_CLASSES.get(cls_id, f"class_{cls_id}")
                    total_detections_count += 1

                    # Extract persistent local track ID
                    if box.id is not None and len(box.id) > 0:
                        local_id = int(box.id[0].item())
                    else:
                        local_id = i + 1
                    unique_local_ids.add(local_id)

                    # Project feet (bottom center) to Bird's-Eye View
                    bev_coord = self.homography.project_bbox(
                        [x1, y1, x2, y2], info["width"], info["height"]
                    )

                    # Save image crop
                    crop_filename = None
                    if save_crops and len(saved_crop_files) < max_crops_per_video:
                        crop_h = y2 - y1
                        crop_w = x2 - x1
                        if crop_h > 15 and crop_w > 15:
                            crop_img = frame[y1:y2, x1:x2]
                            crop_name = f"crop_{video_stem}_id{local_id}_f{frame_idx:04d}_{class_name}.jpg"
                            crop_path = CROPS_DIR / crop_name
                            cv2.imwrite(str(crop_path), crop_img)
                            saved_crop_files.append(str(crop_path.relative_to(CROPS_DIR.parent)))
                            crop_filename = crop_name

                    detection_item = {
                        "local_id": local_id,
                        "target_id": f"ID_{local_id}",
                        "frame_index": frame_idx,
                        "timestamp": timestamp_str,
                        "timeSec": frame_sec,
                        "class": class_name,
                        "class_id": cls_id,
                        "confidence": round(conf, 3),
                        "bbox": {
                            "x": x1,
                            "y": y1,
                            "width": x2 - x1,
                            "height": y2 - y1,
                            "normalized": {
                                "x1": round(x1 / info["width"], 4),
                                "y1": round(y1 / info["height"], 4),
                                "x2": round(x2 / info["width"], 4),
                                "y2": round(y2 / info["height"], 4)
                            }
                        },
                        "bev_ground_coord": bev_coord,
                        "crop_filename": crop_filename,
                        "status": "Target Spotted" if conf > 0.8 else "Tracking Active"
                    }
                    frame_detections.append(detection_item)

                    # Add to overall trajectory point
                    bev_trajectory.append({
                        "t": frame_sec,
                        "local_id": local_id,
                        "target_id": f"ID_{local_id}",
                        "x": bev_coord["x"],
                        "y": bev_coord["y"],
                        "visibleCameras": [video_path.stem],
                        "class": class_name,
                        "confidence": round(conf, 3)
                    })

                    # Draw debug annotation
                    if render_annotated:
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 220, 255), 2)
                        label = f"ID:{local_id} {class_name} {conf:.2f} BEV:({bev_coord['x']},{bev_coord['y']})"
                        cv2.putText(
                            frame, label, (x1, max(18, y1 - 8)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 220, 255), 1
                        )

                if frame_detections:
                    detections_by_frame.append({
                        "frame_index": frame_idx,
                        "timestamp": timestamp_str,
                        "timeSec": frame_sec,
                        "detections": frame_detections
                    })

            if render_annotated and annotated_writer:
                annotated_writer.write(frame)

            frame_idx += 1

        cap.release()
        if annotated_writer:
            annotated_writer.release()

        total_process_time = time.time() - start_time
        avg_infer_ms = (sum(inference_times) / len(inference_times) * 1000) if inference_times else 0.0

        # Downsample trajectory if too dense for frontend
        trajectory_step = max(1, len(bev_trajectory) // 25)
        compact_trajectory = bev_trajectory[::trajectory_step]

        return {
            "model": self.model_name,
            "recording_info": info,
            "performance": {
                "total_processing_seconds": round(total_process_time, 2),
                "fps_processed": round(frame_idx / total_process_time, 2) if total_process_time > 0 else 0,
                "avg_inference_latency_ms": round(avg_infer_ms, 2),
                "frames_evaluated": len(inference_times)
            },
            "summary": {
                "total_detections": total_detections_count,
                "unique_local_objects_tracked": len(unique_local_ids),
                "local_ids_tracked": sorted(list(unique_local_ids)),
                "sampled_frames_with_detections": len(detections_by_frame),
                "saved_crops_count": len(saved_crop_files),
                "highest_confidence": max([d["confidence"] for f in detections_by_frame for d in f["detections"]], default=0.0)
            },
            "saved_crops": saved_crop_files,
            "birdsEyeTrajectory": compact_trajectory,
            "frameDetections": detections_by_frame
        }

