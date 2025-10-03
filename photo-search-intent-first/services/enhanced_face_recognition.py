"""
Enhanced face recognition service with improved accuracy and clustering.
"""
from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
import numpy as np
from PIL import Image
import cv2

logger = logging.getLogger(__name__)


@dataclass
class FaceDetection:
    """Represents a face detected in an image."""
    embedding: np.ndarray
    bbox: Tuple[int, int, int, int]  # x, y, width, height
    confidence: float
    quality_score: float
    pose_angles: Optional[Tuple[float, float, float]] = None  # pitch, yaw, roll


@dataclass
class FaceCluster:
    """Represents a cluster of faces belonging to the same person."""
    id: str
    faces: List[Tuple[str, int]]  # (photo_path, face_idx)
    centroid: Optional[np.ndarray] = None
    name: Optional[str] = None
    confidence: float = 0.0  # How confident we are that this is a real person


class FaceQualityScorer:
    """Scores the quality of face detections based on multiple factors."""
    
    @staticmethod
    def assess_quality(image: np.ndarray, bbox: Tuple[int, int, int, int]) -> float:
        """
        Assess the quality of a face detection based on multiple factors:
        - Blur level
        - Pose alignment
        - Illumination
        - Face size relative to image
        """
        x, y, w, h = bbox
        face_img = image[y:y+h, x:x+w]
        
        if face_img.size == 0:
            return 0.0
        
        # Assess blur using Laplacian variance
        gray = cv2.cvtColor(face_img, cv2.COLOR_RGB2GRAY) if len(face_img.shape) == 3 else face_img
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Normalize blur score (empirical threshold)
        blur_score = min(1.0, blur_score / 100.0)
        
        # Face size relative to image
        face_area_ratio = (w * h) / (image.shape[0] * image.shape[1])
        size_score = min(1.0, face_area_ratio * 50)  # Adjust based on expected face size
        
        # Overall quality is combination of factors
        quality = (blur_score * 0.4 + size_score * 0.6)
        
        return min(1.0, max(0.0, quality))


class EnhancedFaceRecognizer:
    """Enhanced face recognition service with improved accuracy and clustering."""
    
    def __init__(self, 
                 detection_model: str = "insightface", 
                 clustering_method: str = "hdbscan",
                 similarity_threshold: float = 0.6,
                 quality_threshold: float = 0.3):
        self.detection_model = detection_model
        self.clustering_method = clustering_method
        self.similarity_threshold = similarity_threshold
        self.quality_threshold = quality_threshold
        self.quality_scorer = FaceQualityScorer()
        self.embedding_dim = 512
        self._detector_backend: Optional[str] = None
        self._insightface_app = None
        self._face_recognition = None

    def _ensure_detector_backend(self) -> str:
        """Resolve which detector backend is available for offline use."""
        if self._detector_backend:
            return self._detector_backend

        # Prefer insightface when available as it yields richer embeddings.
        try:
            from insightface.app import FaceAnalysis  # type: ignore
        except ImportError as exc:
            logger.debug("InsightFace unavailable: %s", exc)
        else:
            try:
                app = FaceAnalysis(providers=['CPUExecutionProvider'])
                app.prepare(ctx_id=0, det_size=(640, 640))
            except Exception as prep_exc:  # pragma: no cover - provider specific failure
                logger.warning("InsightFace present but failed to initialise: %s", prep_exc)
            else:
                self._insightface_app = app
                self._detector_backend = 'insightface'
                # InsightFace tends to emit 512-d embeddings by default.
                self.embedding_dim = 512
                return self._detector_backend

        # Fallback to face_recognition if InsightFace is absent.
        try:
            import face_recognition  # type: ignore
        except ImportError as exc:
            logger.warning(
                "No face detection backend available (insightface, face_recognition missing)."
                " Face-based features will be disabled."
            )
            self._detector_backend = 'unavailable'
            return self._detector_backend

        self._face_recognition = face_recognition
        self._detector_backend = 'face_recognition'
        # face_recognition returns 128-d embeddings.
        self.embedding_dim = 128
        return self._detector_backend
        
    def detect_faces_in_image(self, image_path: str) -> List[FaceDetection]:
        """Detect faces in a single image and return FaceDetection objects."""
        backend = self._ensure_detector_backend()
        if backend == 'unavailable':
            logger.debug("Skipping face detection for %s: no backend", image_path)
            return []

        try:
            image = np.array(Image.open(image_path).convert('RGB'))
        except Exception as load_exc:
            logger.warning(f"Error loading image {image_path}: {load_exc}")
            return []

        detections: List[FaceDetection] = []

        if backend == 'insightface' and self._insightface_app is not None:
            try:
                faces = self._insightface_app.get(image)
            except Exception as detect_exc:
                logger.warning(f"InsightFace detection failed for {image_path}: {detect_exc}")
                return []

            for face in faces:
                embedding = getattr(face, 'normed_embedding', getattr(face, 'embedding', None))
                if embedding is None:
                    continue

                bbox = getattr(face, 'bbox', None)
                if bbox is None:
                    continue

                x1, y1, x2, y2 = [int(max(0, b)) for b in bbox]
                w, h = x2 - x1, y2 - y1
                face_bbox = (x1, y1, w, h)
                quality_score = self.quality_scorer.assess_quality(image, face_bbox)

                if quality_score < self.quality_threshold:
                    continue

                detections.append(
                    FaceDetection(
                        embedding=np.array(embedding, dtype=np.float32),
                        bbox=face_bbox,
                        confidence=float(getattr(face, 'det_score', 0.0)),
                        quality_score=quality_score,
                        pose_angles=getattr(face, 'pose', None)
                    )
                )
            return detections

        if backend == 'face_recognition' and self._face_recognition is not None:
            try:
                face_locations = self._face_recognition.face_locations(image)
                if not face_locations:
                    return []
                face_encodings = self._face_recognition.face_encodings(image, face_locations)
            except Exception as detect_exc:
                logger.warning(f"face_recognition fallback failed for {image_path}: {detect_exc}")
                return []

            for (top, right, bottom, left), encoding in zip(face_locations, face_encodings):
                x1, y1 = int(left), int(top)
                w = int(right - left)
                h = int(bottom - top)
                face_bbox = (x1, y1, w, h)
                quality_score = self.quality_scorer.assess_quality(image, face_bbox)

                if quality_score < self.quality_threshold:
                    continue

                detections.append(
                    FaceDetection(
                        embedding=np.asarray(encoding, dtype=np.float32),
                        bbox=face_bbox,
                        confidence=1.0,
                        quality_score=quality_score,
                        pose_angles=None
                    )
                )

            return detections

        logger.warning(
            "Face detection backend %s reported as ready but produced no detections for %s",
            backend,
            image_path,
        )
        return []
    
    def extract_faces(self, photo_paths: List[str]) -> Tuple[Dict[str, List[FaceDetection]], np.ndarray]:
        """
        Extract face embeddings from a list of photo paths.
        
        Returns:
            - Dictionary mapping photo paths to list of FaceDetection objects
            - Numpy array of all embeddings (num_faces x embedding_dim)
        """
        photo_faces: Dict[str, List[FaceDetection]] = {}
        all_embeddings: List[np.ndarray] = []
        
        for photo_path in photo_paths:
            detections = self.detect_faces_in_image(photo_path)
            if detections:
                photo_faces[photo_path] = detections
                # Add embeddings to the overall list
                for detection in detections:
                    all_embeddings.append(detection.embedding)
        
        if all_embeddings:
            embeddings_array = np.vstack(all_embeddings).astype('float32')
            self.embedding_dim = embeddings_array.shape[1]
            # L2 normalize
            norms = np.linalg.norm(embeddings_array, axis=1, keepdims=True) + 1e-9
            embeddings_array = embeddings_array / norms
        else:
            embeddings_array = np.zeros((0, self.embedding_dim), dtype=np.float32)

        return photo_faces, embeddings_array
    
    def cluster_faces(self, embeddings: np.ndarray, min_cluster_size: int = 3) -> List[int]:
        """
        Cluster face embeddings using the specified method.
        
        Args:
            embeddings: Numpy array of shape (n_faces, embedding_dim)
            min_cluster_size: Minimum number of faces required for a valid cluster
            
        Returns:
            List of cluster labels (one per embedding)
        """
        if embeddings.shape[0] == 0:
            return []
        
        # Normalize embeddings to unit vectors for cosine similarity
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        normalized_embeddings = embeddings / (norms + 1e-9)
        
        if self.clustering_method == "hdbscan":
            try:
                from sklearn.cluster import DBSCAN
                # Using DBSCAN with cosine metric as HDBSCAN might not be available
                # In a real implementation, use HDBSCAN for better results
                db = DBSCAN(eps=0.4, min_samples=min_cluster_size, metric='cosine')
                labels = db.fit_predict(normalized_embeddings)
                return labels.tolist()
            except ImportError:
                logger.warning("HDBSCAN not available, falling back to DBSCAN")
                # Fallback to basic DBSCAN
                from sklearn.cluster import DBSCAN
                db = DBSCAN(eps=0.4, min_samples=min_cluster_size, metric='cosine')
                labels = db.fit_predict(normalized_embeddings)
                return labels.tolist()
        elif self.clustering_method == "agglomerative":
            try:
                from sklearn.cluster import AgglomerativeClustering
                clustering = AgglomerativeClustering(
                    n_clusters=None,
                    distance_threshold=0.5,
                    linkage='average',
                    metric='cosine'
                )
                labels = clustering.fit_predict(normalized_embeddings)
                return labels.tolist()
            except ImportError:
                logger.warning("Agglomerative clustering not available, using DBSCAN")
                from sklearn.cluster import DBSCAN
                db = DBSCAN(eps=0.4, min_samples=min_cluster_size, metric='cosine')
                labels = db.fit_predict(normalized_embeddings)
                return labels.tolist()
        else:
            # Default to DBSCAN
            from sklearn.cluster import DBSCAN
            db = DBSCAN(eps=0.4, min_samples=min_cluster_size, metric='cosine')
            labels = db.fit_predict(normalized_embeddings)
            return labels.tolist()
    
    def build_face_index(self, 
                        index_dir: Path, 
                        photo_paths: List[str], 
                        min_cluster_size: int = 3) -> Dict[str, Any]:
        """
        Build an enhanced face index with improved clustering.
        
        Args:
            index_dir: Directory to store face index data
            photo_paths: List of photo paths to process
            min_cluster_size: Minimum faces required for a cluster
            
        Returns:
            Dictionary with statistics about the indexing process
        """
        # Extract faces from all photos
        photo_faces, embeddings = self.extract_faces(photo_paths)
        
        # Cluster the faces
        labels = self.cluster_faces(embeddings, min_cluster_size)
        
        # Map labels back to photos
        faces_data = {
            "photos": {},  # path -> [{ emb_idx, bbox, cluster, quality_score }]
            "clusters": {},  # cluster_id -> [(photo_path, face_idx)]
            "names": {},  # cluster_id -> name
            "embeddings": embeddings.tolist() if embeddings.size > 0 else []
        }
        
        # Track how many faces we've processed
        face_idx = 0
        face_to_cluster = {}  # Maps face index to cluster
        
        # Build the photos mapping
        for photo_path, detections in photo_faces.items():
            face_data_list = []
            for detection in detections:
                cluster_id = int(labels[face_idx]) if face_idx < len(labels) else -1
                face_data = {
                    "emb_idx": face_idx,
                    "bbox": detection.bbox,
                    "cluster": cluster_id,
                    "quality_score": detection.quality_score
                }
                
                face_data_list.append(face_data)
                face_to_cluster[face_idx] = cluster_id
                face_idx += 1
            
            faces_data["photos"][photo_path] = face_data_list
        
        # Build the clusters mapping
        for face_idx, cluster_id in enumerate(labels):
            if str(cluster_id) not in faces_data["clusters"]:
                faces_data["clusters"][str(cluster_id)] = []
            
            # Find which photo and which face index within that photo this embedding corresponds to
            # This requires tracking the mapping as we build the embeddings
            current_face_idx = 0
            found = False
            for photo_path, detections in photo_faces.items():
                if current_face_idx + len(detections) > face_idx:
                    # This face belongs to this photo
                    face_within_photo_idx = face_idx - current_face_idx
                    faces_data["clusters"][str(cluster_id)].append((photo_path, face_within_photo_idx))
                    found = True
                    break
                current_face_idx += len(detections)
            
            if not found:
                logger.warning(f"Could not find photo for face index {face_idx}")
        
        # Load existing names if any
        from infra.faces import faces_state_file
        existing_data_path = faces_state_file(index_dir)
        if existing_data_path.exists():
            try:
                existing_data = json.loads(existing_data_path.read_text())
                faces_data["names"] = existing_data.get("names", {})
            except Exception:
                logger.warning("Could not load existing face names")
        
        # Save the enhanced face data
        from infra.faces import save_faces
        save_faces(index_dir, faces_data)
        
        # Save embeddings separately
        from infra.faces import faces_embeddings_file
        np.save(faces_embeddings_file(index_dir), embeddings)
        
        # Prepare stats
        unique_clusters = set(labels) if len(labels) > 0 else set()
        if -1 in unique_clusters:  # -1 represents unclustered faces
            unique_clusters.remove(-1)
        
        return {
            "updated": len(photo_faces),
            "faces": int(embeddings.shape[0]),
            "clusters": len(unique_clusters),
            "unclustered_faces": labels.count(-1) if -1 in labels else 0
        }


class EnhancedFaceClusteringService:
    """Service for managing enhanced face clustering operations."""
    
    def __init__(self, index_dir: Path):
        self.index_dir = index_dir
        self.faces_data = self._load_faces_data()
    
    def _load_faces_data(self) -> Dict[str, Any]:
        """Load existing faces data from storage."""
        from infra.faces import load_faces
        return load_faces(self.index_dir)
    
    def _save_faces_data(self, data: Dict[str, Any]) -> None:
        """Save faces data to storage."""
        from infra.faces import save_faces
        save_faces(self.index_dir, data)
    
    def merge_clusters(self, source_cluster_id: str, target_cluster_id: str) -> Dict[str, Any]:
        """Merge two face clusters together."""
        # Get the photos from the source cluster
        source_photos = self.faces_data.get("clusters", {}).get(str(source_cluster_id), [])
        
        # Add them to the target cluster
        target_cluster = self.faces_data.get("clusters", {}).get(str(target_cluster_id), [])
        target_cluster.extend(source_photos)
        self.faces_data["clusters"][str(target_cluster_id)] = target_cluster
        
        # Remove the source cluster
        if str(source_cluster_id) in self.faces_data["clusters"]:
            del self.faces_data["clusters"][str(source_cluster_id)]
        
        # Update the cluster assignments for each photo
        for photo_path, face_list in self.faces_data.get("photos", {}).items():
            for face_data in face_list:
                if str(face_data.get("cluster")) == str(source_cluster_id):
                    face_data["cluster"] = int(target_cluster_id)
        
        # Save the updated data
        self._save_faces_data(self.faces_data)
        
        return {
            "ok": True,
            "merged_into": target_cluster_id,
            "source": source_cluster_id,
            "message": f"Merged cluster {source_cluster_id} into {target_cluster_id}"
        }
    
    def split_cluster(self, cluster_id: str, photo_paths: List[str]) -> Dict[str, Any]:
        """Split selected photos from a face cluster into a new cluster."""
        # Find the highest cluster ID to assign a new one
        existing_cluster_ids = [int(k) for k in self.faces_data.get("clusters", {}).keys() 
                               if k.lstrip('-').isdigit()]
        new_cluster_id = str(max(existing_cluster_ids) + 1 if existing_cluster_ids else 0)
        
        # Find and move the specified photos to the new cluster
        cluster_photos = self.faces_data.get("clusters", {}).get(str(cluster_id), [])
        photos_to_move = []
        remaining_photos = []
        
        for photo_info in cluster_photos:
            photo_path, emb_idx = photo_info
            if photo_path in photo_paths:
                photos_to_move.append(photo_info)
            else:
                remaining_photos.append(photo_info)
        
        # Update both clusters
        self.faces_data["clusters"][str(cluster_id)] = remaining_photos
        self.faces_data["clusters"][new_cluster_id] = photos_to_move
        
        # Update the cluster assignments for each photo in photos_to_move
        for photo_path, emb_idx in photos_to_move:
            if photo_path in self.faces_data.get("photos", {}):
                for face_data in self.faces_data["photos"][photo_path]:
                    if (face_data.get("emb_idx") == emb_idx and 
                        str(face_data.get("cluster")) == str(cluster_id)):
                        face_data["cluster"] = int(new_cluster_id)
        
        # Save the updated data
        self._save_faces_data(self.faces_data)
        
        return {
            "ok": True,
            "new_cluster_id": new_cluster_id,
            "photos": photo_paths,
            "original_cluster": cluster_id,
            "message": f"Split {len(photos_to_move)} photos from cluster {cluster_id} to new cluster {new_cluster_id}"
        }
    
    def get_face_clusters(self) -> List[Dict[str, Any]]:
        """Get all face clusters with additional information."""
        names = self.faces_data.get("names", {})
        items = []
        
        for k, lst in self.faces_data.get("clusters", {}).items():
            try:
                size = len(lst)
            except Exception:
                size = 0
            items.append({
                "id": k, 
                "size": size, 
                "name": names.get(k, ""), 
                "examples": lst[:4]
            })
        
        # sort by size desc
        items.sort(key=lambda x: -x.get("size", 0))
        return items
    
    def find_similar_faces(self, photo_path: str, face_idx: int, threshold: float = 0.6) -> List[Dict[str, Any]]:
        """Find faces similar to a specified face in the cluster."""
        # Load embeddings
        from infra.faces import faces_embeddings_file
        embeddings_path = faces_embeddings_file(self.index_dir)
        
        if not embeddings_path.exists():
            return []
        
        try:
            all_embeddings = np.load(embeddings_path)
        except Exception:
            return []
        
        # Get the specified face embedding
        faces_in_photo = self.faces_data.get("photos", {}).get(photo_path, [])
        if face_idx >= len(faces_in_photo):
            return []
        
        face_emb_idx = faces_in_photo[face_idx].get("emb_idx")
        if face_emb_idx is None or face_emb_idx >= all_embeddings.shape[0]:
            return []
        
        target_embedding = all_embeddings[face_emb_idx:face_emb_idx+1]  # Shape: (1, embedding_dim)
        
        # Calculate cosine similarity with all embeddings
        similarities = np.dot(all_embeddings, target_embedding.T).flatten()
        
        # Find faces above the threshold
        similar_indices = np.where(similarities >= threshold)[0]
        
        # Convert to result format
        results = []
        for idx in similar_indices:
            # Find which photo and face this embedding belongs to
            for photo_path_iter, face_list in self.faces_data.get("photos", {}).items():
                for face_data in face_list:
                    if face_data.get("emb_idx") == int(idx):
                        results.append({
                            "photo_path": photo_path_iter,
                            "face_idx": face_list.index(face_data),
                            "similarity": float(similarities[idx]),
                            "cluster": face_data.get("cluster")
                        })
        
        return results
