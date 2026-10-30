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
import torch
import numpy as np
from ultralytics import YOLO

from .config import (
    MODEL_NAME,
    MODEL_PATH,
    CROPS_DIR,
    OUTPUT_DIR,
    CONFIDENCE_THRESHOLD,
    TARGET_CLASSES,
    CARRIED_ITEM_CLASSES,
    DEFAULT_SAMPLE_STEP,
)
from .homography import HomographyTransformer
from .orientation import PoseOrientationEstimator
from .reid_osnet import OSNetFeatureExtractor
from .reid_gallery import ReIDGallery

class RecordingProcessor:
    """
    Processes surveillance video recordings to detect persons/objects,
    extract crops, and compute Bird's-Eye View coordinates using YOLO11n.
    """
    def __init__(
        self,
        model_path: Optional[Path] = None,
        confidence_thresh: float = CONFIDENCE_THRESHOLD,
        camera_angle: str = "default",
        device: Optional[str] = None
    ):
        path = model_path or MODEL_PATH
        if not Path(path).exists():
            path = MODEL_NAME
            
        if device is None:
            if torch.cuda.is_available():
                self.device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"
        else:
            self.device = device

        self.model = YOLO(str(path))
        self.model_name = Path(path).name
        self.conf_thresh = confidence_thresh
        self.homography = HomographyTransformer(camera_preset=camera_angle)
        self.pose_estimator = PoseOrientationEstimator(device=self.device)
        self.reid_extractor = OSNetFeatureExtractor(device=self.device)
        self.gallery = ReIDGallery(similarity_threshold=0.75)

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
        sample_step: int = DEFAULT_SAMPLE_STEP,
        save_crops: bool = True,
        max_crops_per_video: int = 20,
        render_annotated: bool = False,
        target_class_ids: Optional[List[int]] = None,
        gallery: Optional[ReIDGallery] = None
    ) -> Dict[str, Any]:
        """
        Runs object detection, pose orientation, OSNet Re-ID, and Bird's Eye View mapping.

        Args:
            video_path: Path to the video file
            sample_step: Run inference every N frames (default: 20)
            save_crops: Whether to save cropped target images to data/crops/
            max_crops_per_video: Max number of crops to save
            render_annotated: Whether to generate an annotated debug video
            target_class_ids: List of COCO class IDs to track (e.g. [0] for Person)
            gallery: Optional shared ReIDGallery across camera feeds
        """
        active_gallery = gallery if gallery is not None else self.gallery
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
                # Run YOLO ByteTrack tracking with persistent local IDs
                results = self.model.track(
                    frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    conf=self.conf_thresh,
                    verbose=False
                )[0]
                t_infer = time.time() - t0
                inference_times.append(t_infer)

                boxes = results.boxes
                frame_sec = round(frame_idx / info["fps"], 2)
                timestamp_str = f"{int(frame_sec // 60):02d}:{int(frame_sec % 60):02d}"

                frame_detections = []
                person_items = []
                carried_items = []

                # Pass 1: Parse boxes and classify into persons vs carried items
                for i, box in enumerate(boxes):
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    
                    if cls_id not in target_class_ids and cls_id not in CARRIED_ITEM_CLASSES:
                        continue

                    xyxy = box.xyxy[0].cpu().numpy().astype(int)
                    x1, y1, x2, y2 = xyxy.tolist()
                    
                    # Clamp to frame boundaries
                    x1 = max(0, min(x1, info["width"] - 1))
                    y1 = max(0, min(y1, info["height"] - 1))
                    x2 = max(0, min(x2, info["width"] - 1))
                    y2 = max(0, min(y2, info["height"] - 1))
                    
                    class_name = TARGET_CLASSES.get(cls_id, f"class_{cls_id}")

                    # Extract persistent local track ID
                    if box.id is not None and len(box.id) > 0:
                        local_id = int(box.id[0].item())
                    else:
                        local_id = i + 1

                    box_info = {
                        "cls_id": cls_id,
                        "class_name": class_name,
                        "conf": conf,
                        "local_id": local_id,
                        "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                        "xyxy": [x1, y1, x2, y2],
                    }

                    if cls_id == 0:  # Person
                        person_items.append(box_info)
                    elif cls_id in CARRIED_ITEM_CLASSES:
                        carried_items.append(box_info)

                # Pass 2: Associate carried items with nearest overlapping person box
                for p in person_items:
                    p["carried_items"] = []

                for item in carried_items:
                    ix1, iy1, ix2, iy2 = item["x1"], item["y1"], item["x2"], item["y2"]
                    item_area = max(1, (ix2 - ix1) * (iy2 - iy1))
                    best_person = None
                    best_overlap = 0.0

                    for p in person_items:
                        px1, py1, px2, py2 = p["x1"], p["y1"], p["x2"], p["y2"]
                        inter_x1 = max(ix1, px1)
                        inter_y1 = max(iy1, py1)
                        inter_x2 = min(ix2, px2)
                        inter_y2 = min(iy2, py2)
                        if inter_x2 > inter_x1 and inter_y2 > inter_y1:
                            inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
                            overlap = inter_area / item_area
                            if overlap > best_overlap:
                                best_overlap = overlap
                                best_person = p

                    if best_person and best_overlap > 0.15:
                        best_person["carried_items"].append({
                            "item": item["class_name"],
                            "confidence": round(item["conf"], 3),
                            "overlap_ratio": round(best_overlap, 3)
                        })

                # Pass 3: Pose orientation estimation for persons
                pose_keypoints_list = []
                if person_items:
                    try:
                        pose_results = self.pose_estimator.model(frame, verbose=False)[0]
                        if pose_results.keypoints is not None:
                            pose_keypoints_list = pose_results
                    except Exception:
                        pose_keypoints_list = None

                # Process person detections with orientation & carried items
                for p in person_items:
                    x1, y1, x2, y2 = p["x1"], p["y1"], p["x2"], p["y2"]
                    local_id = p["local_id"]
                    conf = p["conf"]
                    class_name = p["class_name"]
                    cls_id = p["cls_id"]
                    total_detections_count += 1
                    unique_local_ids.add(local_id)

                    # Match pose keypoints by IoU
                    best_kp = None
                    best_pose_iou = 0.0
                    if pose_keypoints_list and pose_keypoints_list.boxes is not None:
                        for p_idx, p_box in enumerate(pose_keypoints_list.boxes):
                            pxyxy = p_box.xyxy[0].cpu().numpy().astype(int)
                            inter_w = max(0, min(x2, pxyxy[2]) - max(x1, pxyxy[0]))
                            inter_h = max(0, min(y2, pxyxy[3]) - max(y1, pxyxy[1]))
                            if inter_w > 0 and inter_h > 0:
                                inter = inter_w * inter_h
                                union = (x2 - x1) * (y2 - y1) + (pxyxy[2] - pxyxy[0]) * (pxyxy[3] - pxyxy[1]) - inter
                                iou = inter / max(union, 1)
                                if iou > best_pose_iou:
                                    best_pose_iou = iou
                                    best_kp = pose_keypoints_list.keypoints.data[p_idx].cpu().numpy()

                    # Derive pose orientation (FRONT, BACK, LEFT, RIGHT)
                    orientation = self.pose_estimator.estimate_orientation_from_keypoints(best_kp, [x1, y1, x2, y2])
                    torso_box = self.pose_estimator.extract_torso_box(best_kp, [x1, y1, x2, y2], info["width"], info["height"])

                    # Project feet (bottom center) to Bird's-Eye View
                    bev_coord = self.homography.project_bbox(
                        [x1, y1, x2, y2], info["width"], info["height"]
                    )

                    # Extract image crops and features for Person Re-ID
                    crop_filename = None
                    crop_img = None
                    if save_crops and len(saved_crop_files) < max_crops_per_video:
                        crop_h = y2 - y1
                        crop_w = x2 - x1
                        if crop_h > 15 and crop_w > 15:
                            crop_img = frame[y1:y2, x1:x2]
                            crop_name = f"crop_{video_stem}_id{local_id}_f{frame_idx:04d}_{orientation}_{class_name}.jpg"
                            crop_path = CROPS_DIR / crop_name
                            cv2.imwrite(str(crop_path), crop_img)
                            saved_crop_files.append(str(crop_path.relative_to(CROPS_DIR.parent)))
                            crop_filename = crop_name

                    if crop_img is None:
                        crop_img = frame[y1:y2, x1:x2]

                    # Extract torso crop using pose-derived torso coordinates
                    tx1, ty1, tx2, ty2 = torso_box
                    if ty2 > ty1 and tx2 > tx1:
                        torso_img = frame[ty1:ty2, tx1:tx2]
                    else:
                        torso_img = crop_img

                    # Extract OSNet 512-dim normalized feature embeddings
                    body_vec, torso_vec = self.reid_extractor.extract_pair(crop_img, torso_img)

                    # Multi-orientation Cross-Camera Re-ID matching
                    carried_names = [ci["item"] for ci in p["carried_items"]]
                    global_id, reid_sim, is_new_id = active_gallery.match_or_register(
                        body_vector=body_vec,
                        torso_vector=torso_vec,
                        orientation=orientation,
                        camera_id=video_stem,
                        timestamp=timestamp_str,
                        carried_items=carried_names,
                        crop_image_url=crop_filename
                    )

                    detection_item = {
                        "local_id": local_id,
                        "global_identity_id": global_id,
                        "target_id": f"ID_{local_id} ({global_id})",
                        "frame_index": frame_idx,
                        "timestamp": timestamp_str,
                        "timeSec": frame_sec,
                        "class": class_name,
                        "class_id": cls_id,
                        "confidence": round(conf, 3),
                        "reid_similarity": reid_sim,
                        "is_new_identity": is_new_id,
                        "orientation": orientation,
                        "carried_items": carried_names,
                        "carried_items_details": p["carried_items"],
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
                        "torso_bbox": {
                            "x1": torso_box[0],
                            "y1": torso_box[1],
                            "x2": torso_box[2],
                            "y2": torso_box[3]
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
                        "global_identity_id": global_id,
                        "target_id": f"ID_{local_id} ({global_id})",
                        "x": bev_coord["x"],
                        "y": bev_coord["y"],
                        "visibleCameras": [video_path.stem],
                        "class": class_name,
                        "confidence": round(conf, 3),
                        "reid_similarity": reid_sim,
                        "orientation": orientation,
                        "carried_items": carried_names
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
            "frameDetections": detections_by_frame,
            "identities": active_gallery.get_identities_summary()
        }

