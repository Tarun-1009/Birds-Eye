"""
In-Memory Multi-Orientation Re-ID Gallery.
Maintains feature vectors categorized under orientation slots: front, back, side, and torso.
Executes cross-camera matching using angle-adaptive cosine similarity:
- Same/adjacent angles: cosine similarity on whole-body vectors
- Opposite angles (180° flip FRONT <-> BACK): 70% weighted on torso crop vector
- Threshold > 0.75 assigns existing Global ID, otherwise registers a new Global ID.
"""
from typing import Dict, List, Any, Optional, Tuple, Set
import numpy as np
import time
from pathlib import Path
import json

class ReIDGallery:
    """
    In-memory Re-ID gallery categorized by multi-orientation feature slots.
    """
    SIMILARITY_THRESHOLD = 0.75
    OPPOSITE_TORSO_WEIGHT = 0.70
    OPPOSITE_BODY_WEIGHT = 0.30

    def __init__(self, similarity_threshold: float = 0.75):
        self.similarity_threshold = similarity_threshold
        # In-memory dictionary gallery
        self.gallery: Dict[str, Dict[str, Any]] = {}
        self._next_id = 1

    @staticmethod
    def map_orientation_slot(orientation: str) -> str:
        """
        Maps orientation string (FRONT, BACK, LEFT, RIGHT) to gallery slot:
        'front', 'back', 'side'.
        """
        norm = orientation.upper().strip()
        if norm == "FRONT":
            return "front"
        elif norm == "BACK":
            return "back"
        elif norm in ("LEFT", "RIGHT", "SIDE"):
            return "side"
        return "front"

    @staticmethod
    def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
        """
        Calculates cosine similarity between two 512-dim vectors.
        """
        if v1 is None or v2 is None:
            return 0.0
        n1 = np.linalg.norm(v1)
        n2 = np.linalg.norm(v2)
        if n1 < 1e-6 or n2 < 1e-6:
            return 0.0
        return float(np.dot(v1, v2) / (n1 * n2))

    def _compute_slot_similarity(self, query_vec: np.ndarray, stored_vectors: List[np.ndarray]) -> float:
        """
        Computes maximum cosine similarity against all stored vectors in a slot.
        """
        if not stored_vectors or query_vec is None:
            return 0.0
        sims = [self.cosine_similarity(query_vec, sv) for sv in stored_vectors]
        return float(max(sims)) if sims else 0.0

    def match_or_register(
        self,
        body_vector: np.ndarray,
        torso_vector: np.ndarray,
        orientation: str,
        camera_id: str = "CAM-01",
        timestamp: Optional[str] = None,
        carried_items: Optional[List[str]] = None,
        crop_image_url: Optional[str] = None
    ) -> Tuple[str, float, bool]:
        """
        Matches a person across cameras:
        - If comparing same/adjacent angles: compute cosine similarity of whole-body vectors.
        - If comparing opposite angles (180° flip from FRONT to BACK): compute cosine similarity
          predominantly on the torso crop vector (70% weight).
        - If similarity exceeds 0.75, assign the existing Global ID; otherwise, register a new Global ID.

        Returns: (global_id, match_confidence, is_new_identity)
        """
        ts = timestamp or time.strftime("%Y-%m-%d %H:%M:%S")
        cand_slot = self.map_orientation_slot(orientation)
        cand_orient = orientation.upper().strip()

        best_global_id = None
        best_sim = -1.0

        for gid, record in self.gallery.items():
            slots = record["orientations"]
            
            # Determine match against all existing orientations stored for this identity
            id_scores = []
            
            for stored_slot, stored_vecs in slots.items():
                if not stored_vecs or stored_slot == "torso":
                    continue
                
                # Check for 180° opposite flip: FRONT <-> BACK
                is_opposite = (
                    (cand_slot == "front" and stored_slot == "back") or
                    (cand_slot == "back" and stored_slot == "front")
                )

                if is_opposite:
                    # 70% weighted on torso vector + 30% body vector
                    torso_sim = self._compute_slot_similarity(torso_vector, slots.get("torso", []))
                    body_sim = self._compute_slot_similarity(body_vector, stored_vecs)
                    if slots.get("torso"):
                        combined_sim = (
                            self.OPPOSITE_TORSO_WEIGHT * torso_sim +
                            self.OPPOSITE_BODY_WEIGHT * body_sim
                        )
                    else:
                        combined_sim = body_sim
                    id_scores.append(combined_sim)
                else:
                    # Same or adjacent angle (front-front, side-side, front-side, back-side)
                    body_sim = self._compute_slot_similarity(body_vector, stored_vecs)
                    id_scores.append(body_sim)

            if id_scores:
                candidate_max_sim = max(id_scores)
                if candidate_max_sim > best_sim:
                    best_sim = candidate_max_sim
                    best_global_id = gid

        # Decision threshold: 0.75
        if best_global_id and best_sim >= self.similarity_threshold:
            # Assign existing Global ID
            target_record = self.gallery[best_global_id]
            target_record["last_seen"] = ts
            target_record["cameras"].add(camera_id)
            target_record["total_sightings"] += 1
            if carried_items:
                target_record["carried_items"].update(carried_items)
            
            # Update feature slots (keep up to 15 representative vectors per slot)
            if len(target_record["orientations"][cand_slot]) < 15:
                target_record["orientations"][cand_slot].append(body_vector)
            if len(target_record["orientations"]["torso"]) < 15:
                target_record["orientations"]["torso"].append(torso_vector)

            return best_global_id, round(best_sim, 3), False
        else:
            # Register a new Global ID
            new_id = f"person_{self._next_id:03d}"
            self._next_id += 1

            self.gallery[new_id] = {
                "id": new_id,
                "label": f"Person-{new_id.split('_')[-1]}",
                "target_type": "Person",
                "first_seen": ts,
                "last_seen": ts,
                "cameras": {camera_id},
                "total_sightings": 1,
                "carried_items": set(carried_items or []),
                "crop_image_url": crop_image_url,
                "orientations": {
                    "front": [body_vector] if cand_slot == "front" else [],
                    "back": [body_vector] if cand_slot == "back" else [],
                    "side": [body_vector] if cand_slot == "side" else [],
                    "torso": [torso_vector]
                }
            }
            initial_sim = round(max(0.85, best_sim if best_sim > 0 else 0.85), 3)
            return new_id, initial_sim, True

    def get_identities_summary(self) -> List[Dict[str, Any]]:
        """
        Returns serialized list of global identities suitable for JSON / SQLite.
        """
        summary = []
        for gid, r in self.gallery.items():
            summary.append({
                "id": gid,
                "label": r["label"],
                "target_type": r["target_type"],
                "first_seen": r["first_seen"],
                "last_seen": r["last_seen"],
                "cameras": list(r["cameras"]),
                "total_sightings": r["total_sightings"],
                "carried_items": list(r["carried_items"]),
                "reference_image_url": r["crop_image_url"],
                "orientation_coverage": {
                    k: len(v) for k, v in r["orientations"].items()
                }
            })
        return summary
