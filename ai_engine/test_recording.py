"""
Birds-Eye AI Engine — Recording Test Suite
Runs comprehensive verification and detection benchmarks on surveillance recordings
stored in the `data` folder.
"""
import sys
import os
import argparse
from pathlib import Path
import json
import time

# Ensure ai_engine package is in Python path
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Auto-detect and switch to virtual environment if cv2 is not available in current interpreter
try:
    import cv2
except ModuleNotFoundError:
    venv_candidates = [
        CURRENT_DIR / ".venv" / "bin" / "python",
        CURRENT_DIR / "venv" / "bin" / "python",
        CURRENT_DIR / ".venv" / "bin" / "python3",
        CURRENT_DIR / "venv" / "bin" / "python3",
        CURRENT_DIR / ".venv" / "Scripts" / "python.exe",
        CURRENT_DIR / "venv" / "Scripts" / "python.exe",
        PROJECT_ROOT / ".venv" / "bin" / "python",
        PROJECT_ROOT / "venv" / "bin" / "python",
    ]
    switched = False
    if not os.environ.get("_BIRDS_EYE_VENV_ATTEMPTED"):
        for py_bin in venv_candidates:
            if py_bin.exists():
                os.environ["_BIRDS_EYE_VENV_ATTEMPTED"] = "1"
                if os.name == "nt":
                    import subprocess
                    sys.exit(subprocess.call([str(py_bin)] + sys.argv))
                else:
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

from ai_engine.config import (
    DATA_DIR,
    VIDEOS_DIR,
    CROPS_DIR,
    OUTPUT_DIR,
    SUPPORTED_EXTENSIONS,
    MODEL_PATH,
    DEFAULT_SAMPLE_STEP
)
from ai_engine.detector import RecordingProcessor
from ai_engine.synthetic_generator import generate_test_recording

def discover_recordings(target_path: Path = None):
    """
    Finds all video files inside data/videos or the provided path.
    """
    search_dirs = [target_path] if target_path and target_path.is_dir() else [VIDEOS_DIR, DATA_DIR]
    found_videos = []
    
    if target_path and target_path.is_file():
        if target_path.suffix.lower() in SUPPORTED_EXTENSIONS:
            return [target_path]
        return []

    for d in search_dirs:
        if d.exists():
            for item in d.iterdir():
                if item.is_file() and item.suffix.lower() in SUPPORTED_EXTENSIONS:
                    if item not in found_videos:
                        found_videos.append(item)
    return found_videos

def print_banner():
    banner = r"""
========================================================================
    BIRD'S-EYE AI ENGINE — SURVEILLANCE RECORDING TEST SUITE
========================================================================
    Detects Targets | Crops Re-ID | Maps Top-Down Bird's Eye Trajectory
========================================================================
"""
    print(banner)

def run_tests(
    input_path: str = None,
    model_path: str = None,
    sample_step: int = DEFAULT_SAMPLE_STEP,
    save_crops: bool = True,
    render_annotated: bool = False,
    auto_generate: bool = True
):
    print_banner()
    
    target_path = Path(input_path) if input_path else None
    recordings = discover_recordings(target_path)

    # If no recordings found, automatically generate a sample recording
    if not recordings:
        print("[!] No recordings found in 'data/' or 'data/videos/'.")
        if auto_generate:
            print("[+] Generating synthetic multi-angle CCTV recording in data/videos/ ...")
            generated_file = generate_test_recording(
                output_filename="sample_cctv_recording.mp4",
                duration_sec=6,
                fps=25,
                camera_label="CCTV-CAM-01 [ENTRANCE]"
            )
            print(f"[OK] Generated: {generated_file.name} ({generated_file.stat().st_size / 1024:.1f} KB)")
            recordings = [generated_file]
        else:
            print("[-] Please place video recordings (.mp4, .avi, .mov, etc.) into 'data/videos' and re-run.")
            return False

    print(f"[INFO] Discovered {len(recordings)} recording(s) for testing:")
    for i, rec in enumerate(recordings, 1):
        size_mb = rec.stat().st_size / (1024 * 1024)
        print(f"       {i}. {rec.name} ({size_mb:.2f} MB)")
    print("-" * 72)

    # Initialize AI Processor
    active_model_path = Path(model_path) if model_path else MODEL_PATH
    print(f"[INFO] Initializing {active_model_path.name} & Homography Projection Engine...")
    t_init = time.time()
    processor = RecordingProcessor(model_path=active_model_path)
    print(f"[OK] {processor.model_name} Engine ready in {time.time() - t_init:.2f}s.\n")

    overall_results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_recordings_tested": len(recordings),
        "results": []
    }

    all_passed = True

    for idx, video_path in enumerate(recordings, 1):
        print(f"\n>>> [TEST {idx}/{len(recordings)}] Processing Recording: {video_path.name}")
        test_case_passed = True

        # Phase 1: Video File Inspection & Header Verification
        try:
            meta = processor.inspect_recording(video_path)
            print(f"    [PASS] Video Header & Stream: Valid")
            print(f"           Resolution: {meta['width']}x{meta['height']} | FPS: {meta['fps']} | Total Frames: {meta['total_frames']} ({meta['duration_sec']}s)")
        except Exception as e:
            print(f"    [FAIL] Video Readability Error: {str(e)}")
            test_case_passed = False
            all_passed = False
            continue

        # Phase 2: Object Detection, Tracking & Bird's Eye Mapping
        print(f"    [INFO] Running YOLO Detection & Bird's Eye Projection (sampling every {sample_step} frames)...")
        try:
            res = processor.process_recording(
                video_path=video_path,
                sample_step=sample_step,
                save_crops=save_crops,
                render_annotated=render_annotated
            )
            
            perf = res["performance"]
            summary = res["summary"]
            trajectory = res["birdsEyeTrajectory"]

            print(f"    [PASS] Detection & Tracking Executed Successfully")
            print(f"           Frames Evaluated: {perf['frames_evaluated']} frames")
            print(f"           Throughput:       {perf['fps_processed']} FPS (Avg latency: {perf['avg_inference_latency_ms']} ms/frame)")
            print(f"           Total Targets:    {summary['total_detections']} detections")
            print(f"           Tracked Local IDs:{summary.get('unique_local_objects_tracked', 0)} unique target(s) -> IDs: {summary.get('local_ids_tracked', [])}")
            print(f"           Top Confidence:   {summary['highest_confidence'] * 100:.1f}%")
            print(f"           Saved Crops:      {summary['saved_crops_count']} images -> data/crops/")
            print(f"           BEV Waypoints:    {len(trajectory)} coordinate points mapped to 0-100 ground plane")

            if render_annotated:
                annotated_path = OUTPUT_DIR / f"{video_path.stem}_annotated.mp4"
                print(f"           Annotated Video:  {annotated_path.name} -> data/output/")

            overall_results["results"].append({
                "video": video_path.name,
                "status": "PASSED",
                "metadata": meta,
                "performance": perf,
                "summary": summary,
                "sample_trajectory": trajectory[:5]
            })

        except Exception as e:
            print(f"    [FAIL] Detection Pipeline Error: {str(e)}")
            test_case_passed = False
            all_passed = False
            overall_results["results"].append({
                "video": video_path.name,
                "status": "FAILED",
                "error": str(e)
            })

    # Save summary report to data folder
    report_file = DATA_DIR / "test_results.json"
    with open(report_file, "w") as f:
        json.dump(overall_results, f, indent=2)

    print("\n" + "=" * 72)
    print(f"TEST RUN COMPLETED: {'[ALL TESTS PASSED]' if all_passed else '[SOME TESTS FAILED]'}")
    print(f"Detailed JSON Test Report: {report_file}")
    print(f"Crops Directory:           {CROPS_DIR}")
    print("=" * 72 + "\n")

    return all_passed

def main():
    parser = argparse.ArgumentParser(description="Test surveillance video recordings in data folder using YOLO11n")
    parser.add_argument("--input", "-i", type=str, default=None, help="Specific video path or folder to test")
    parser.add_argument("--model", "-m", type=str, default=None, help="Path or name of YOLO weights (default: yolo11n.pt)")
    parser.add_argument("--step", "-s", type=int, default=DEFAULT_SAMPLE_STEP, help=f"Sample inference every N frames (default: {DEFAULT_SAMPLE_STEP})")
    parser.add_argument("--no-crops", action="store_true", help="Disable saving detection crops")
    parser.add_argument("--render", "-r", action="store_true", help="Render annotated video with bounding boxes & BEV info")
    parser.add_argument("--generate", "-g", action="store_true", help="Force generate a synthetic test recording")

    args = parser.parse_args()

    if args.generate:
        print("[+] Generating fresh synthetic CCTV recording...")
        generate_test_recording()

    success = run_tests(
        input_path=args.input,
        model_path=args.model,
        sample_step=args.step,
        save_crops=not args.no_crops,
        render_annotated=args.render,
        auto_generate=True
    )
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()



