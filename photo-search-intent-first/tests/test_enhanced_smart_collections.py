"""
Tests for enhanced smart collections functionality.
"""
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any

import pytest

from domain.smart_collection_rules import (
    SmartCollectionConfig, SmartCollectionRule, RuleType, 
    ComparisonOperator, BooleanOperator, RuleCondition
)
from services.enhanced_smart_collections import EnhancedSmartCollectionsService
from infra.index_store import IndexStore


class TestEnhancedSmartCollectionsService:
    """Test cases for the enhanced smart collections service."""
    
    @pytest.fixture
    def temp_index_dir(self):
        """Create a temporary directory for testing."""
        temp_dir = Path(tempfile.mkdtemp())
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def mock_store(self, temp_index_dir):
        """Create a mock index store for testing."""
        # Create the necessary directory structure
        index_dir = temp_index_dir / ".photo_index"
        index_dir.mkdir(parents=True, exist_ok=True)
        
        # Create a mock index state with dummy data
        store = IndexStore(temp_index_dir)
        store.index_dir = index_dir
        
        # Mock some photo paths and metadata
        store.state.paths = [
            "/photos/trip1/photo1.jpg",
            "/photos/trip1/photo2.jpg", 
            "/photos/trip2/photo1.jpg",
            "/photos/portrait/person1.jpg",
            "/photos/portrait/person2.jpg",
            "/photos/landscape/mountain1.jpg",
            "/photos/landscape/mountain2.jpg"
        ]
        
        # Mock modification times (for temporal clustering)
        now = datetime.now()
        store.state.mtimes = [
            (now - timedelta(hours=1)).timestamp(),  # Trip 1 photo 1
            (now - timedelta(hours=0.5)).timestamp(),  # Trip 1 photo 2
            (now - timedelta(days=2)).timestamp(),  # Trip 2 photo 1
            (now - timedelta(hours=5)).timestamp(),  # Portrait 1
            (now - timedelta(hours=4.5)).timestamp(),  # Portrait 2
            (now - timedelta(hours=3)).timestamp(),  # Landscape 1
            (now - timedelta(hours=2.5)).timestamp()   # Landscape 2
        ]
        
        return store
    
    def test_basic_smart_collection_evaluation(self, mock_store):
        """Test basic smart collection evaluation with simple rules."""
        service = EnhancedSmartCollectionsService(mock_store)
        
        # Create a simple collection for portraits (just for testing the evaluation mechanism)
        rule = SmartCollectionRule(
            type=RuleType.TAGS,
            conditions=[
                RuleCondition(
                    field="tags",
                    operator=ComparisonOperator.CONTAINS,
                    value="portrait"
                )
            ],
            boolean_operator=BooleanOperator.AND
        )
        
        config = SmartCollectionConfig(
            name="test_portraits",
            description="Test collection for portraits",
            rules=[rule]
        )
        
        # Mock tags data (in a real scenario, this would come from the tags system)
        # Temporarily set tags for testing
        service.tags_map = {
            "/photos/portrait/person1.jpg": ["portrait", "person1"],
            "/photos/portrait/person2.jpg": ["portrait", "person2"],
            "/photos/landscape/mountain1.jpg": ["landscape", "mountain"],
            "/photos/landscape/mountain2.jpg": ["landscape", "mountain"],
            "/photos/trip1/photo1.jpg": ["trip", "vacation"],
            "/photos/trip1/photo2.jpg": ["trip", "vacation"],
            "/photos/trip2/photo1.jpg": ["trip", "adventure"]
        }
        
        results = service.evaluate_collection(config)
        
        # Should find 2 portrait photos
        assert len(results) == 2
        assert "/photos/portrait/person1.jpg" in results
        assert "/photos/portrait/person2.jpg" in results
        
    def test_complex_rule_evaluation(self, mock_store):
        """Test evaluation with multiple rules combined with AND/OR operators."""
        service = EnhancedSmartCollectionsService(mock_store)
        
        # Create two rules
        rule1 = SmartCollectionRule(
            type=RuleType.TAGS,
            conditions=[
                RuleCondition(
                    field="tags",
                    operator=ComparisonOperator.CONTAINS,
                    value="landscape"
                )
            ],
            boolean_operator=BooleanOperator.AND
        )
        
        rule2 = SmartCollectionRule(
            type=RuleType.TAGS,
            conditions=[
                RuleCondition(
                    field="tags",
                    operator=ComparisonOperator.CONTAINS,
                    value="mountain"
                )
            ],
            boolean_operator=BooleanOperator.AND
        )
        
        # Create config with OR combination (should match photos with landscape OR mountain tags)
        config = SmartCollectionConfig(
            name="test_landscape_or_mountain",
            description="Test collection with OR combination",
            rules=[rule1, rule2],
            rule_combination=BooleanOperator.OR
        )
        
        # Mock tags
        service.tags_map = {
            "/photos/portrait/person1.jpg": ["portrait", "person1"],
            "/photos/portrait/person2.jpg": ["portrait", "person2"],
            "/photos/landscape/mountain1.jpg": ["landscape", "mountain"],
            "/photos/landscape/mountain2.jpg": ["landscape", "mountain"],
            "/photos/trip1/photo1.jpg": ["trip", "vacation"],
            "/photos/trip1/photo2.jpg": ["trip", "vacation"],
            "/photos/trip2/photo1.jpg": ["trip", "adventure"]
        }
        
        results = service.evaluate_collection(config)
        
        # Should find 2 photos that have both landscape and mountain tags
        assert len(results) == 2
        assert "/photos/landscape/mountain1.jpg" in results
        assert "/photos/landscape/mountain2.jpg" in results
        
    def test_temporal_clustering(self, mock_store):
        """Test temporal clustering functionality."""
        service = EnhancedSmartCollectionsService(mock_store)
        
        all_paths = mock_store.state.paths
        clusters = service._temporal_clustering(all_paths, time_window_hours=2)
        
        # We expect photos taken within 2 hours to be clustered together
        # Based on our mock times:
        # - Trip 1 photos (0.5 and 1 hour ago) -> 1 cluster
        # - Portrait photos (4.5 and 5 hours ago) -> 1 cluster  
        # - Landscape photos (2.5 and 3 hours ago) -> 1 cluster
        # - Trip 2 photo (2 days ago) -> separate cluster
        assert len(clusters) >= 3  # At least these distinct clusters should exist
        
        # Find the cluster with Trip 1 photos
        trip1_cluster = None
        for cluster in clusters:
            if "/photos/trip1/photo1.jpg" in cluster and "/photos/trip1/photo2.jpg" in cluster:
                trip1_cluster = cluster
                break
        
        assert trip1_cluster is not None
        assert len(trip1_cluster) >= 2  # Should have at least the two trip1 photos
        
    def test_create_and_retrieve_collection(self, mock_store):
        """Test creating and retrieving smart collections."""
        service = EnhancedSmartCollectionsService(mock_store)
        
        # Create a collection
        rule = SmartCollectionRule(
            type=RuleType.FAVORITES,
            conditions=[
                RuleCondition(
                    field="favorites",
                    operator=ComparisonOperator.EQUALS,
                    value=True
                )
            ]
        )
        
        config = SmartCollectionConfig(
            name="test_favorites",
            description="Test favorites collection",
            rules=[rule]
        )
        
        # Create the collection
        success = service.create_smart_collection(config)
        assert success is True
        
        # Retrieve the collection
        retrieved = service.get_smart_collection("test_favorites")
        assert retrieved is not None
        assert retrieved.name == "test_favorites"
        assert retrieved.description == "Test favorites collection"
        assert len(retrieved.rules) == 1
        
        # Get all collections
        all_collections = service.get_all_smart_collections()
        assert "test_favorites" in all_collections
        assert len(all_collections) == 1
        
    def test_update_collection(self, mock_store):
        """Test updating an existing collection."""
        service = EnhancedSmartCollectionsService(mock_store)
        
        # Create a collection
        rule = SmartCollectionRule(
            type=RuleType.TAGS,
            conditions=[
                RuleCondition(
                    field="tags",
                    operator=ComparisonOperator.CONTAINS,
                    value="old_tag"
                )
            ]
        )
        
        config = SmartCollectionConfig(
            name="test_update",
            description="Original description",
            rules=[rule]
        )
        
        # Create the collection
        success = service.create_smart_collection(config)
        assert success is True
        
        # Update the collection
        updated_rule = SmartCollectionRule(
            type=RuleType.TAGS,
            conditions=[
                RuleCondition(
                    field="tags",
                    operator=ComparisonOperator.CONTAINS,
                    value="new_tag"
                )
            ]
        )
        
        updated_config = SmartCollectionConfig(
            name="test_update",
            description="Updated description",
            rules=[updated_rule]
        )
        
        update_success = service.update_smart_collection("test_update", updated_config)
        assert update_success is True
        
        # Verify the update
        retrieved = service.get_smart_collection("test_update")
        assert retrieved is not None
        assert retrieved.description == "Updated description"
        assert retrieved.rules[0].conditions[0].value == "new_tag"
        
    def test_delete_collection(self, mock_store):
        """Test deleting a smart collection."""
        service = EnhancedSmartCollectionsService(mock_store)
        
        # Create a collection
        rule = SmartCollectionRule(
            type=RuleType.TAGS,
            conditions=[
                RuleCondition(
                    field="tags",
                    operator=ComparisonOperator.CONTAINS,
                    value="test"
                )
            ]
        )
        
        config = SmartCollectionConfig(
            name="test_delete",
            description="Test delete collection",
            rules=[rule]
        )
        
        # Create the collection
        success = service.create_smart_collection(config)
        assert success is True
        
        # Verify it exists
        retrieved = service.get_smart_collection("test_delete")
        assert retrieved is not None
        
        # Delete the collection
        delete_success = service.delete_smart_collection("test_delete")
        assert delete_success is True
        
        # Verify it's gone
        retrieved = service.get_smart_collection("test_delete")
        assert retrieved is None
        
    def test_complex_rule_conditions(self, mock_store):
        """Test evaluation of complex rule conditions."""
        service = EnhancedSmartCollectionsService(mock_store)
        
        # Create a rule with multiple conditions
        rule = SmartCollectionRule(
            type=RuleType.EXIF,
            conditions=[
                RuleCondition(
                    field="iso",
                    operator=ComparisonOperator.GREATER_THAN,
                    value=100
                ),
                RuleCondition(
                    field="fnumber",
                    operator=ComparisonOperator.LESS_THAN,
                    value=5.6
                )
            ],
            boolean_operator=BooleanOperator.AND
        )
        
        config = SmartCollectionConfig(
            name="test_complex_conditions",
            description="Test complex conditions",
            rules=[rule]
        )
        
        # Mock EXIF data with ISO and F-number values
        service.meta_data = {
            'paths': mock_store.state.paths,
            'iso': [800, 400, 200, 100, 1600, 400, 800],  # ISO values for each photo
            'fnumber': [2.8, 4.0, 8.0, 5.6, 1.4, 3.5, 2.0]  # F-number values
        }
        
        results = service.evaluate_collection(config)
        
        # Should match photos where ISO > 100 AND F-number < 5.6
        # Based on our mock data: 
        # - photo1: ISO=800, F=2.8 -> matches
        # - photo2: ISO=400, F=4.0 -> matches  
        # - photo3: ISO=200, F=8.0 -> doesn't match (F >= 5.6)
        # - photo4: ISO=100, F=5.6 -> doesn't match (ISO not > 100, F not < 5.6)
        # - photo5: ISO=1600, F=1.4 -> matches
        # - photo6: ISO=400, F=3.5 -> matches
        # - photo7: ISO=800, F=2.0 -> matches
        
        expected_matching_paths = [
            mock_store.state.paths[0],  # ISO=800, F=2.8
            mock_store.state.paths[1],  # ISO=400, F=4.0
            mock_store.state.paths[4],  # ISO=1600, F=1.4
            mock_store.state.paths[5],  # ISO=400, F=3.5
            mock_store.state.paths[6],  # ISO=800, F=2.0
        ]
        
        for path in expected_matching_paths:
            assert path in results


class TestSmartCollectionRuleModels:
    """Test the smart collection rule data models."""
    
    def test_rule_condition_validation(self):
        """Test rule condition model validation."""
        condition = RuleCondition(
            field="iso",
            operator=ComparisonOperator.GREATER_THAN,
            value=400
        )
        
        assert condition.field == "iso"
        assert condition.operator == ComparisonOperator.GREATER_THAN
        assert condition.value == 400
        
    def test_smart_collection_config_validation(self):
        """Test smart collection config model validation."""
        rule = SmartCollectionRule(
            type=RuleType.EXIF,
            conditions=[
                RuleCondition(
                    field="iso",
                    operator=ComparisonOperator.GREATER_THAN,
                    value=400
                )
            ]
        )
        
        config = SmartCollectionConfig(
            name="test_config",
            description="Test configuration",
            rules=[rule],
            max_results=100,
            sort_by="date"
        )
        
        assert config.name == "test_config"
        assert config.description == "Test configuration"
        assert len(config.rules) == 1
        assert config.max_results == 100
        assert config.sort_by == "date"


if __name__ == "__main__":
    pytest.main([__file__])