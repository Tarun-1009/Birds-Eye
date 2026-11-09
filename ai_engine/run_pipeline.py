"""
Multi-Camera Surveillance Inference Pipeline
Processes camera feeds registered in SQLite database or passed as video files.
Runs YOLO11 tracking, Pose-based orientation estimation, and Multi-Orientation OSNet Re-ID.
Populates SQLite database (sightings, global_identities, cameras) with verified detections.
"""

import sys
import os
import json
import sqlite3
import argparse
from pathlib import Path
import cv2
import torch
import numpy as np

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ai_engine.config import (
    MODEL_PATH,
    CROPS_DIR,
    DATA_DIR,
    CONFIDENCE_THRESHOLD,
    TARGET_CLASSES,
    CARRIED_ITEM_CLASSES,
    VEHICLE_CLASSES,
    OBJECT_CLASSES,
)
from ai_engine.homography import HomographyTransformer
from ai_engine.orientation import PoseOrientationEstimator
from ai_engine.reid_osnet import OSNetFeatureExtractor
from ai_engine.reid_gallery import ReIDGallery

DB_PATH = DATA_DIR / "cctv_tracker.db"


def run_pipeline(
    camera_ids=None,
    sample_step=15,
    conf_thresh=0.30,
    similarity_thresh=0.68,
    clear_existing=False
):
    print(f"[Pipeline] Initializing detection pipeline (sample_step={sample_step}, conf={conf_thresh})...")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Pipeline] Compute device: {device}")

    # Connect to SQLite
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create tables if not exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cameras (
            camera_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            video_path TEXT NOT NULL,
            location TEXT,
            status TEXT DEFAULT 'ONLINE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS global_identities (
            global_id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            label TEXT,
            first_seen_camera TEXT NOT NULL,
            first_seen_timestamp REAL NOT NULL,
            dominant_color TEXT,
            reference_image_url TEXT,
            total_sightings INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sightings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            camera_id TEXT NOT NULL,
            timestamp_sec REAL NOT NULL,
            global_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            local_track_id INTEGER,
            frame_index INTEGER,
            timestamp TEXT,
            confidence REAL NOT NULL,
            orientation TEXT NOT NULL CHECK(orientation IN ('FRONT', 'BACK', 'LEFT', 'RIGHT', 'N/A')),
            bbox_x REAL NOT NULL,
            bbox_y REAL NOT NULL,
            bbox_w REAL NOT NULL,
            bbox_h REAL NOT NULL,
            bev_x REAL,
            bev_y REAL,
            crop_path TEXT,
            carried_items TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(camera_id) REFERENCES cameras(camera_id) ON DELETE CASCADE,
            FOREIGN KEY(global_id) REFERENCES global_identities(global_id) ON DELETE CASCADE
        )
    """)
    conn.commit()

    if clear_existing:
        print("[Pipeline] Clearing prior sightings and identities...")
        cursor.execute("DELETE FROM sightings")
        cursor.execute("DELETE FROM global_identities")
        conn.commit()

    # Fetch cameras to process
    if camera_ids:
        placeholders = ",".join(["?"] * len(camera_ids))
        cursor.execute(f"SELECT * FROM cameras WHERE camera_id IN ({placeholders}) ORDER BY camera_id ASC", camera_ids)
    else:
        cursor.execute("SELECT * FROM cameras ORDER BY camera_id ASC")
    
    cameras = cursor.fetchall()
    if not cameras:
        print("[Pipeline] No cameras found in database to process.")
        return {"success": False, "message": "No cameras found"}

    print(f"[Pipeline] Found {len(cameras)} cameras to evaluate.")

    # Initialize AI models
    from ultralytics import YOLO
    yolo_model = YOLO(str(MODEL_PATH))
    pose_estimator = PoseOrientationEstimator(device=device)
    reid_extractor = OSNetFeatureExtractor(device=device)
    homography = HomographyTransformer()
    gallery = ReIDGallery(similarity_threshold=similarity_thresh)

    CROPS_DIR.mkdir(parents=True, exist_ok=True)

    total_detections_inserted = 0

    for cam in cameras:
        cam_id = cam["camera_id"]
        cam_name = cam["name"]
        raw_video_path = cam["video_path"]

        # Resolve video path
        candidate_paths = [
            PROJECT_ROOT / raw_video_path,
            DATA_DIR / "videos" / Path(raw_video_path).name,
            PROJECT_ROOT / "backend" / "uploads" / "videos" / Path(raw_video_path).name,
            Path(raw_video_path)
        ]
        video_file = None
        for p in candidate_paths:
            if p.exists() and p.is_file():
                video_file = p
                break

        if not video_file:
            print(f"[Pipeline] Video file not found for camera {cam_id}: {raw_video_path}. Skipping.")
            continue

        print(f"\n[Pipeline] Processing {cam_id} ({cam_name}) from {video_file.name}...")
        cap = cv2.VideoCapture(str(video_file))
        if not cap.isOpened():
            print(f"[Pipeline] Failed to open video {video_file}. Skipping.")
            continue

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS)) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        frame_idx = 0
        cam_sightings_count = 0
        # Track keyframes per target in this camera to eliminate redundant repetitive frames
        cam_target_history = {}  # global_id -> {"last_time": float, "last_ori": str, "last_pos": (x, y)}

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_step == 0:
                frame_sec = round(frame_idx / fps, 2)
                timestamp_str = f"{int(frame_sec // 60):02d}:{int(frame_sec % 60):02d}"

                # Run YOLO tracking
                results = yolo_model.track(
                    frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    conf=conf_thresh,
                    verbose=False
                )[0]

                boxes = results.boxes
                person_items = []
                carried_items = []
                vehicle_items = []
                standalone_objects = []

                for i, box in enumerate(boxes):
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())

                    # Target classes: Person (0), Vehicles (1, 2, 3, 5, 7), Objects/Coolers (24, 26, 28, 72)
                    if cls_id not in TARGET_CLASSES:
                        continue

                    xyxy = box.xyxy[0].cpu().numpy().astype(int)
                    x1 = max(0, min(int(xyxy[0]), width - 1))
                    y1 = max(0, min(int(xyxy[1]), height - 1))
                    x2 = max(0, min(int(xyxy[2]), width - 1))
                    y2 = max(0, min(int(xyxy[3]), height - 1))

                    if (x2 - x1) < 15 or (y2 - y1) < 15:
                        continue

                    class_name = TARGET_CLASSES.get(cls_id, f"obj_{cls_id}")
                    local_id = int(box.id[0].item()) if (box.id is not None and len(box.id) > 0) else (i + 1)

                    box_info = {
                        "cls_id": cls_id,
                        "class_name": class_name,
                        "conf": conf,
                        "local_id": local_id,
                        "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                        "w": x2 - x1, "h": y2 - y1,
                    }

                    if cls_id == 0:
                        person_items.append(box_info)
                    elif cls_id in VEHICLE_CLASSES:
                        vehicle_items.append(box_info)
                    elif cls_id in CARRIED_ITEM_CLASSES:
                        carried_items.append(box_info)
                    elif cls_id in OBJECT_CLASSES:
                        standalone_objects.append(box_info)

                # Associate carried items with overlapping persons
                for p in person_items:
                    p["carried_items"] = []

                for item in carried_items:
                    ix1, iy1, ix2, iy2 = item["x1"], item["y1"], item["x2"], item["y2"]
                    item_area = max(1, (ix2 - ix1) * (iy2 - iy1))
                    best_person = None
                    best_overlap = 0.0

                    for p in person_items:
                        inter_x1 = max(ix1, p["x1"])
                        inter_y1 = max(iy1, p["y1"])
                        inter_x2 = min(ix2, p["x2"])
                        inter_y2 = min(iy2, p["y2"])
                        if inter_x2 > inter_x1 and inter_y2 > inter_y1:
                            inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
                            overlap = inter_area / item_area
                            if overlap > best_overlap:
                                best_overlap = overlap
                                best_person = p

                    if best_person and best_overlap > 0.15:
                        best_person["carried_items"].append(item["class_name"])
                    else:
                        # Unattended / Standalone item (e.g. luggage, cooler, backpack on ground)
                        standalone_objects.append(item)

                # Pose orientation for detected persons
                pose_results = None
                if person_items:
                    try:
                        pose_out = pose_estimator.model(frame, verbose=False)[0]
                        if pose_out.keypoints is not None:
                            pose_results = pose_out
                    except Exception as e:
                        pass

                # Process each person
                for p in person_items:
                    x1, y1, x2, y2 = p["x1"], p["y1"], p["x2"], p["y2"]
                    w, h = p["w"], p["h"]
                    local_id = p["local_id"]
                    conf = p["conf"]

                    best_kp = None
                    if pose_results and pose_results.boxes is not None:
                        best_iou = 0.0
                        for p_idx, p_box in enumerate(pose_results.boxes):
                            pxyxy = p_box.xyxy[0].cpu().numpy().astype(int)
                            iw = max(0, min(x2, pxyxy[2]) - max(x1, pxyxy[0]))
                            ih = max(0, min(y2, pxyxy[3]) - max(y1, pxyxy[1]))
                            if iw > 0 and ih > 0:
                                inter = iw * ih
                                union = w * h + (pxyxy[2] - pxyxy[0]) * (pxyxy[3] - pxyxy[1]) - inter
                                iou = inter / max(union, 1)
                                if iou > best_iou:
                                    best_iou = iou
                                    best_kp = pose_results.keypoints.data[p_idx].cpu().numpy()

                    # Derive pose orientation: FRONT, BACK, LEFT, RIGHT
                    orientation = pose_estimator.estimate_orientation_from_keypoints(best_kp, [x1, y1, x2, y2])
                    torso_box = pose_estimator.extract_torso_box(best_kp, [x1, y1, x2, y2], width, height)

                    # Extract whole-body and torso crops
                    crop_img = frame[y1:y2, x1:x2]
                    tx1, ty1, tx2, ty2 = torso_box
                    if ty2 > ty1 and tx2 > tx1:
                        torso_img = frame[ty1:ty2, tx1:tx2]
                    else:
                        torso_img = crop_img

                    # Extract OSNet Re-ID embeddings
                    body_vec, torso_vec = reid_extractor.extract_pair(crop_img, torso_img)

                    # Orientation-aware gallery matching (unifies 180° rotations)
                    global_id, reid_sim, is_new = gallery.match_or_register(
                        body_vector=body_vec,
                        torso_vector=torso_vec,
                        orientation=orientation,
                        camera_id=cam_id,
                        timestamp=timestamp_str,
                        carried_items=p["carried_items"],
                    )

                    # Progressive Keyframe Selection:
                    # Avoid recording dozens of identical 0.4s frames from the same camera.
                    # Record when:
                    # 1. Target first enters this camera
                    # 2. Target changes orientation (e.g. turned FRONT -> BACK or SIDE)
                    # 3. Target moved significantly and > 2.0s elapsed
                    prev_entry = cam_target_history.get(global_id)
                    should_record_keyframe = False

                    if prev_entry is None:
                        should_record_keyframe = True
                    elif orientation != prev_entry["last_ori"]:
                        # Angle changed! Record the rotated view
                        should_record_keyframe = True
                    elif (frame_sec - prev_entry["last_time"]) >= 2.0:
                        dx = abs(x1 - prev_entry["last_pos"][0])
                        dy = abs(y1 - prev_entry["last_pos"][1])
                        if dx > 35 or dy > 35:
                            should_record_keyframe = True

                    if should_record_keyframe:
                        crop_filename = f"crop_{cam_id}_{global_id}_f{frame_idx:04d}_{orientation}.jpg"
                        crop_path = CROPS_DIR / crop_filename
                        cv2.imwrite(str(crop_path), crop_img)

                        # Update reference image on gallery if not set
                        if not gallery.gallery[global_id].get("crop_image_url"):
                            gallery.gallery[global_id]["crop_image_url"] = crop_filename

                        cam_target_history[global_id] = {
                            "last_time": frame_sec,
                            "last_ori": orientation,
                            "last_pos": (x1, y1)
                        }

                        bev_coord = homography.project_bbox([x1, y1, x2, y2], width, height)

                        cursor.execute("""
                            INSERT INTO sightings (
                                camera_id, timestamp_sec, global_id, entity_type, local_track_id,
                                frame_index, timestamp, confidence, orientation,
                                bbox_x, bbox_y, bbox_w, bbox_h, bev_x, bev_y,
                                crop_path, carried_items
                            ) VALUES (?, ?, ?, 'person', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            cam_id,
                            frame_sec,
                            global_id,
                            local_id,
                            frame_idx,
                            timestamp_str,
                            round(conf, 3),
                            orientation,
                            x1, y1, w, h,
                            bev_coord["x"], bev_coord["y"],
                            crop_filename,
                            json.dumps(p["carried_items"]) if p["carried_items"] else None
                        ))

                        cam_sightings_count += 1
                        total_detections_inserted += 1

                # Process Vehicles (Cars, Vans, Trucks, Buses, Motorcycles)
                for v in vehicle_items:
                    x1, y1, x2, y2 = v["x1"], v["y1"], v["x2"], v["y2"]
                    w, h = v["w"], v["h"]
                    local_id = v["local_id"]
                    conf = v["conf"]
                    c_name = v["class_name"]
                    v_gid = f"veh_{c_name}_{local_id:03d}"
                    v_ori = "SIDE" if w > h * 1.3 else ("FRONT" if h > w else "SIDE")

                    v_prev = cam_target_history.get(v_gid)
                    should_record_veh = False
                    if v_prev is None:
                        should_record_veh = True
                    elif (frame_sec - v_prev["last_time"]) >= 2.0:
                        dx = abs(x1 - v_prev["last_pos"][0])
                        dy = abs(y1 - v_prev["last_pos"][1])
                        if dx > 40 or dy > 40:
                            should_record_veh = True

                    if should_record_veh:
                        crop_filename = f"crop_{cam_id}_{v_gid}_f{frame_idx:04d}_{v_ori}.jpg"
                        crop_path = CROPS_DIR / crop_filename
                        crop_img = frame[y1:y2, x1:x2]
                        cv2.imwrite(str(crop_path), crop_img)

                        cam_target_history[v_gid] = {
                            "last_time": frame_sec,
                            "last_ori": v_ori,
                            "last_pos": (x1, y1)
                        }

                        bev_coord = homography.project_bbox([x1, y1, x2, y2], width, height)

                        cursor.execute("""
                            INSERT INTO sightings (
                                camera_id, timestamp_sec, global_id, entity_type, local_track_id,
                                frame_index, timestamp, confidence, orientation,
                                bbox_x, bbox_y, bbox_w, bbox_h, bev_x, bev_y,
                                crop_path, carried_items
                            ) VALUES (?, ?, ?, 'vehicle', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            cam_id, frame_sec, v_gid, local_id, frame_idx, timestamp_str,
                            round(conf, 3), v_ori, x1, y1, w, h,
                            bev_coord["x"], bev_coord["y"], crop_filename, None
                        ))
                        cam_sightings_count += 1
                        total_detections_inserted += 1

                # Process Standalone Objects (Coolers, Suitcases, Packages)
                for obj in standalone_objects:
                    x1, y1, x2, y2 = obj["x1"], obj["y1"], obj["x2"], obj["y2"]
                    w, h = obj["w"], obj["h"]
                    local_id = obj["local_id"]
                    conf = obj["conf"]
                    c_name = obj["class_name"]
                    obj_gid = f"obj_{c_name}_{local_id:03d}"

                    obj_prev = cam_target_history.get(obj_gid)
                    should_record_obj = False
                    if obj_prev is None:
                        should_record_obj = True
                    elif (frame_sec - obj_prev["last_time"]) >= 2.5:
                        dx = abs(x1 - obj_prev["last_pos"][0])
                        dy = abs(y1 - obj_prev["last_pos"][1])
                        if dx > 40 or dy > 40:
                            should_record_obj = True

                    if should_record_obj:
                        crop_filename = f"crop_{cam_id}_{obj_gid}_f{frame_idx:04d}_FRONT.jpg"
                        crop_path = CROPS_DIR / crop_filename
                        crop_img = frame[y1:y2, x1:x2]
                        cv2.imwrite(str(crop_path), crop_img)

                        cam_target_history[obj_gid] = {
                            "last_time": frame_sec,
                            "last_ori": "FRONT",
                            "last_pos": (x1, y1)
                        }

                        bev_coord = homography.project_bbox([x1, y1, x2, y2], width, height)

                        cursor.execute("""
                            INSERT INTO sightings (
                                camera_id, timestamp_sec, global_id, entity_type, local_track_id,
                                frame_index, timestamp, confidence, orientation,
                                bbox_x, bbox_y, bbox_w, bbox_h, bev_x, bev_y,
                                crop_path, carried_items
                            ) VALUES (?, ?, ?, 'object', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            cam_id, frame_sec, obj_gid, local_id, frame_idx, timestamp_str,
                            round(conf, 3), "FRONT", x1, y1, w, h,
                            bev_coord["x"], bev_coord["y"], crop_filename, None
                        ))
                        cam_sightings_count += 1
                        total_detections_inserted += 1

            frame_idx += 1

        cap.release()
        conn.commit()
        print(f"[Pipeline] Finished {cam_id}: {cam_sightings_count} sightings indexed across {frame_idx} frames.")

    # Now synchronize global_identities in SQLite
    identities_summary = gallery.get_identities_summary()
    print(f"\n[Pipeline] Syncing {len(identities_summary)} unique global identities into SQLite...")

    # Distinct colors palette for identities
    colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04']

    for idx, ident in enumerate(identities_summary):
        gid = ident["id"]
        # Find first seen camera & timestamp from sightings
        cursor.execute("""
            SELECT camera_id, timestamp_sec, crop_path 
            FROM sightings 
            WHERE global_id = ? 
            ORDER BY timestamp_sec ASC, frame_index ASC 
            LIMIT 1
        """, (gid,))
        first_row = cursor.fetchone()

        first_cam = first_row["camera_id"] if first_row else (ident["cameras"][0] if ident["cameras"] else "CAM-01")
        first_time = first_row["timestamp_sec"] if first_row else 0.0
        ref_image = first_row["crop_path"] if first_row else ident.get("reference_image_url")
        assigned_color = colors[idx % len(colors)]

        # Count total sightings
        cursor.execute("SELECT COUNT(*) as cnt FROM sightings WHERE global_id = ?", (gid,))
        total_cnt = cursor.fetchone()["cnt"]

        # Form a friendly label showing observed angles
        label = f"Target {gid.replace('person_', '#').upper()}"

        cursor.execute("""
            INSERT OR REPLACE INTO global_identities (
                global_id, entity_type, label, first_seen_camera, first_seen_timestamp,
                dominant_color, reference_image_url, total_sightings
            ) VALUES (?, 'person', ?, ?, ?, ?, ?, ?)
        """, (
            gid,
            label,
            first_cam,
            first_time,
            assigned_color,
            ref_image,
            total_cnt
        ))

    # Also register non-person identities (vehicles, coolers, luggage) into global_identities
    cursor.execute("""
        SELECT DISTINCT global_id, entity_type, camera_id, timestamp_sec, crop_path 
        FROM sightings 
        WHERE entity_type IN ('vehicle', 'object')
        GROUP BY global_id
    """)
    non_persons = cursor.fetchall()
    for np_row in non_persons:
        np_gid = np_row["global_id"]
        np_type = np_row["entity_type"]
        parts = np_gid.split("_")
        kind = parts[1] if len(parts) > 2 else parts[0]
        label = f"{kind.capitalize()} #{parts[-1]}"

        cursor.execute("""
            INSERT OR REPLACE INTO global_identities (
                global_id, entity_type, label, first_seen_camera, first_seen_timestamp,
                dominant_color, reference_image_url, total_sightings
            ) VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COUNT(*) FROM sightings WHERE global_id = ?))
        """, (
            np_gid,
            np_type,
            label,
            np_row["camera_id"],
            np_row["timestamp_sec"],
            '#0891b2' if np_type == 'vehicle' else '#d97706',
            np_row["crop_path"],
            np_gid
        ))

    # Clean up any orphaned identities with 0 sightings
    cursor.execute("DELETE FROM global_identities WHERE global_id NOT IN (SELECT DISTINCT global_id FROM sightings)")
    conn.commit()

    # Final summary counts
    cursor.execute("SELECT COUNT(*) as cnt FROM global_identities")
    final_identities_count = cursor.fetchone()["cnt"]
    cursor.execute("SELECT COUNT(*) as cnt FROM sightings")
    final_sightings_count = cursor.fetchone()["cnt"]

    conn.close()

    result = {
        "success": True,
        "identities_count": final_identities_count,
        "sightings_count": final_sightings_count,
        "message": f"Pipeline complete: {final_identities_count} unique targets and {final_sightings_count} frame detections indexed."
    }
    print(f"[Pipeline] Done! {json.dumps(result)}")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multi-Camera AI Detection & Re-ID Pipeline")
    parser.add_argument("--sample-step", type=int, default=15, help="Evaluate every N frames (default: 15)")
    parser.add_argument("--conf", type=float, default=0.30, help="YOLO confidence threshold (default: 0.30)")
    parser.add_argument("--clear", action="store_true", help="Clear existing sightings before running")
    parser.add_argument("--cameras", nargs="+", help="Specific camera IDs to run on")
    args = parser.parse_args()

    run_pipeline(
        camera_ids=args.cameras,
        sample_step=args.sample_step,
        conf_thresh=args.conf,
        clear_existing=args.clear
    )

