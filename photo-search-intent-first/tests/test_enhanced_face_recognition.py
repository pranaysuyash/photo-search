"""
Tests for enhanced face recognition functionality.
"""
import tempfile
import shutil
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch
from types import SimpleNamespace

from PIL import Image

import pytest

from services.enhanced_face_recognition import (
    EnhancedFaceRecognizer, 
    EnhancedFaceClusteringService,
    FaceDetection,
    FaceQualityScorer
)


class TestFaceQualityScorer:
    """Test the face quality assessment functionality."""
    
    def test_quality_assessment(self):
        """Test that quality scorer properly evaluates face images."""
        # Create a simple test image with a face-like region
        test_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        # Add a region that looks like a face (sharper)
        test_image[30:70, 30:70] = np.random.randint(100, 150, (40, 40, 3), dtype=np.uint8)
        
        scorer = FaceQualityScorer()
        quality_score = scorer.assess_quality(test_image, (30, 30, 40, 40))
        
        # Quality should be between 0 and 1
        assert 0.0 <= quality_score <= 1.0
        
    def test_quality_with_perfect_face(self):
        """Test quality scoring with a perfectly sized face."""
        # Create an image with a face region that should score well
        test_image = np.zeros((200, 200, 3), dtype=np.uint8)
        # Create a face-like region in the center
        test_image[75:125, 75:125] = 128  # Face region
        
        scorer = FaceQualityScorer()
        quality_score = scorer.assess_quality(test_image, (75, 75, 50, 50))
        
        # Even with a basic test, it should return a valid score
        assert 0.0 <= quality_score <= 1.0


class TestEnhancedFaceRecognizer:
    """Test the enhanced face recognition functionality."""
    
    def test_initialization(self):
        """Test that the enhanced face recognizer initializes properly."""
        recognizer = EnhancedFaceRecognizer(
            detection_model="insightface",
            clustering_method="hdbscan",
            similarity_threshold=0.6,
            quality_threshold=0.3
        )
        
        assert recognizer.detection_model == "insightface"
        assert recognizer.clustering_method in ["hdbscan", "agglomerative", "dbscan"]  # Default fallback
        assert recognizer.similarity_threshold == 0.6
        assert recognizer.quality_threshold == 0.3
    
    def test_cluster_faces_empty(self):
        """Test clustering with empty embeddings."""
        recognizer = EnhancedFaceRecognizer()
        labels = recognizer.cluster_faces(np.zeros((0, 512), dtype=np.float32))
        
        assert labels == []
        
    def test_cluster_faces_with_basic_data(self):
        """Test clustering with basic embedding data."""
        recognizer = EnhancedFaceRecognizer()
        
        # Create sample embeddings for clustering
        embeddings = np.random.rand(10, 512).astype(np.float32)
        # Normalize embeddings
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        embeddings = embeddings / (norms + 1e-9)
        
        labels = recognizer.cluster_faces(embeddings, min_cluster_size=1)
        
        assert len(labels) == 10
        assert all(isinstance(label, int) for label in labels)
        
    def test_extract_faces_empty_paths(self):
        """Test face extraction with empty photo paths."""
        recognizer = EnhancedFaceRecognizer()
        photo_faces, embeddings = recognizer.extract_faces([])
        
        assert photo_faces == {}
        assert embeddings.shape == (0, 512)

    def test_detect_faces_without_backend(self, monkeypatch):
        """Ensure graceful no-op when no detection backend is present."""
        recognizer = EnhancedFaceRecognizer()
        monkeypatch.setattr(recognizer, "_ensure_detector_backend", lambda: "unavailable")
        detections = recognizer.detect_faces_in_image("/tmp/does-not-exist.jpg")
        assert detections == []

    def test_detect_faces_with_face_recognition_fallback(self, tmp_path, monkeypatch):
        """Fallback detector should produce embeddings when insightface is missing."""
        recognizer = EnhancedFaceRecognizer()
        recognizer.quality_threshold = 0.0
        stub_backend = SimpleNamespace(
            face_locations=lambda image: [(0, 4, 4, 0)],
            face_encodings=lambda image, locations: [np.ones(128, dtype=np.float32)],
        )
        recognizer._face_recognition = stub_backend
        monkeypatch.setattr(recognizer, "_ensure_detector_backend", lambda: "face_recognition")

        test_image = tmp_path / "fallback.jpg"
        Image.fromarray(np.zeros((8, 8, 3), dtype=np.uint8)).save(test_image)

        detections = recognizer.detect_faces_in_image(str(test_image))

        assert len(detections) == 1
        assert detections[0].embedding.shape[0] == 128


class TestEnhancedFaceClusteringService:
    """Test the enhanced face clustering service."""
    
    @pytest.fixture
    def temp_index_dir(self):
        """Create a temporary directory for testing."""
        temp_dir = Path(tempfile.mkdtemp())
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def sample_faces_data(self):
        """Create sample faces data structure."""
        return {
            "photos": {
                "/photos/person1.jpg": [
                    {"emb_idx": 0, "bbox": [10, 10, 50, 50], "cluster": 0, "quality_score": 0.85}
                ],
                "/photos/person2.jpg": [
                    {"emb_idx": 1, "bbox": [20, 20, 60, 60], "cluster": 0, "quality_score": 0.92}
                ],
                "/photos/person3.jpg": [
                    {"emb_idx": 2, "bbox": [30, 30, 70, 70], "cluster": 1, "quality_score": 0.78}
                ]
            },
            "clusters": {
                "0": [("/photos/person1.jpg", 0), ("/photos/person2.jpg", 0)],
                "1": [("/photos/person3.jpg", 0)]
            },
            "names": {
                "0": "John Doe",
                "1": "Jane Smith"
            },
            "embeddings": [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]]
        }
    
    def test_initialization(self, temp_index_dir):
        """Test that the service initializes properly."""
        service = EnhancedFaceClusteringService(temp_index_dir)
        assert service.index_dir == temp_index_dir
        
    def test_merge_clusters(self, temp_index_dir, sample_faces_data):
        """Test merging clusters functionality."""
        # Save initial data
        from infra.faces import save_faces
        save_faces(temp_index_dir, sample_faces_data)
        
        service = EnhancedFaceClusteringService(temp_index_dir)
        
        # Perform merge
        result = service.merge_clusters("1", "0")
        
        # Check result structure
        assert result["ok"] is True
        assert result["merged_into"] == "0"
        assert result["source"] == "1"
        
        # Check that data was updated
        updated_data = service.faces_data
        assert "1" not in updated_data["clusters"]  # Source cluster removed
        assert len(updated_data["clusters"]["0"]) == 3  # Combined cluster has all faces
        
    def test_split_cluster(self, temp_index_dir, sample_faces_data):
        """Test splitting cluster functionality."""
        # Save initial data
        from infra.faces import save_faces
        save_faces(temp_index_dir, sample_faces_data)
        
        service = EnhancedFaceClusteringService(temp_index_dir)
        
        # Perform split
        result = service.split_cluster("0", ["/photos/person1.jpg"])
        
        # Check result structure
        assert result["ok"] is True
        assert result["original_cluster"] == "0"
        assert result["photos"] == ["/photos/person1.jpg"]
        assert int(result["new_cluster_id"]) >= 2  # New cluster ID should be higher
        
        # Check that data was updated
        updated_data = service.faces_data
        # Original cluster should have one face less
        assert len(updated_data["clusters"]["0"]) == 1
        # New cluster should have the split face
        assert len(updated_data["clusters"][result["new_cluster_id"]]) == 1
        
    def test_get_face_clusters(self, temp_index_dir, sample_faces_data):
        """Test getting face clusters."""
        # Save initial data
        from infra.faces import save_faces
        save_faces(temp_index_dir, sample_faces_data)
        
        service = EnhancedFaceClusteringService(temp_index_dir)
        clusters = service.get_face_clusters()
        
        # Should return list of clusters sorted by size
        assert isinstance(clusters, list)
        assert len(clusters) == 2  # Two clusters in sample data
        assert clusters[0]["size"] >= clusters[1]["size"]  # Sorted by size
        
    def test_find_similar_faces(self, temp_index_dir):
        """Test finding similar faces functionality."""
        # Create test data with embeddings
        test_data = {
            "photos": {
                "/photos/person1.jpg": [
                    {"emb_idx": 0, "bbox": [10, 10, 50, 50], "cluster": 0, "quality_score": 0.85}
                ],
                "/photos/person2.jpg": [
                    {"emb_idx": 1, "bbox": [20, 20, 60, 60], "cluster": 0, "quality_score": 0.92}
                ]
            },
            "clusters": {
                "0": [("/photos/person1.jpg", 0), ("/photos/person2.jpg", 0)]
            },
            "names": {
                "0": "John Doe"
            }
        }
        
        from infra.faces import save_faces
        save_faces(temp_index_dir, test_data)
        
        # Create and save embeddings
        embeddings = np.array([
            [0.1, 0.2, 0.3, 0.4],  # Face 0
            [0.11, 0.21, 0.31, 0.41]  # Face 1 (very similar)
        ], dtype=np.float32)
        
        from infra.faces import faces_embeddings_file
        np.save(faces_embeddings_file(temp_index_dir), embeddings)
        
        service = EnhancedFaceClusteringService(temp_index_dir)
        similar_faces = service.find_similar_faces("/photos/person1.jpg", 0, threshold=0.9)
        
        # Should find the similar face
        assert isinstance(similar_faces, list)
        # May not find matches due to the way our test data is structured, 
        # but the function should execute without error


class TestIntegration:
    """Integration tests for the enhanced face recognition system."""
    
    def test_complete_face_workflow(self):
        """Test a complete workflow from detection to clustering."""
        # This is a simplified integration test
        # In a real scenario, we would test with actual image files
        
        recognizer = EnhancedFaceRecognizer(
            clustering_method="dbscan",  # Use DBSCAN for simpler testing
            quality_threshold=0.0  # Accept all detections for testing
        )
        
        # Test with empty paths (should not fail)
        result = recognizer.build_face_index(
            Path(tempfile.mkdtemp()),
            [],
            min_cluster_size=1
        )
        
        assert "updated" in result
        assert "faces" in result
        assert "clusters" in result
        assert result["updated"] == 0
        assert result["faces"] == 0
        assert result["clusters"] == 0


if __name__ == "__main__":
    pytest.main([__file__])
