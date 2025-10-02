"""
Enhanced Smart Collections Service with advanced clustering algorithms.
"""
from __future__ import annotations
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import numpy as np

from domain.smart_collection_rules import (
    SmartCollectionConfig, SmartCollectionRule, RuleType, 
    BooleanOperator, RuleCondition, ComparisonOperator
)
from infra.index_store import IndexStore
from infra.collections import load_smart_collections, save_smart_collections
from infra.tags import load_tags
from infra.faces import photos_for_person as _face_photos
from api.utils import _emb
from api.runtime_flags import is_offline


logger = logging.getLogger(__name__)


class EnhancedSmartCollectionsService:
    """
    Enhanced service for managing smart collections with advanced rule evaluation
    and intelligent clustering algorithms.
    """
    
    def __init__(self, store: IndexStore, embedder=None):
        self.store = store
        self.embedder = embedder
        self.load_state()
    
    def load_state(self):
        """Load current smart collections configuration."""
        self.smart_collections = load_smart_collections(self.store.index_dir)
        self.tags_map = load_tags(self.store.index_dir)
        self.meta_data = self._load_exif_data()
    
    def _load_exif_data(self) -> Dict[str, Any]:
        """Load EXIF metadata for filtering."""
        meta_p = self.store.index_dir / 'exif_index.json'
        if meta_p.exists():
            try:
                data = json.loads(meta_p.read_text())
                return data
            except Exception:
                logger.warning(f"Could not load EXIF data from {meta_p}")
        return {}
    
    def _evaluate_condition(self, path: str, condition: RuleCondition) -> bool:
        """Evaluate a single condition against a photo path."""
        field = condition.field
        op = condition.operator
        value = condition.value
        
        # Get field value from photo metadata
        field_value = self._get_field_value(path, field)
        
        # Handle different field types and comparison operations
        if field_value is None:
            return False
        
        if op == ComparisonOperator.EQUALS:
            return field_value == value
        elif op == ComparisonOperator.NOT_EQUALS:
            return field_value != value
        elif op == ComparisonOperator.GREATER_THAN:
            return field_value > value if isinstance(field_value, (int, float)) and isinstance(value, (int, float)) else False
        elif op == ComparisonOperator.LESS_THAN:
            return field_value < value if isinstance(field_value, (int, float)) and isinstance(value, (int, float)) else False
        elif op == ComparisonOperator.GREATER_THAN_OR_EQUAL:
            return field_value >= value if isinstance(field_value, (int, float)) and isinstance(value, (int, float)) else False
        elif op == ComparisonOperator.LESS_THAN_OR_EQUAL:
            return field_value <= value if isinstance(field_value, (int, float)) and isinstance(value, (int, float)) else False
        elif op == ComparisonOperator.CONTAINS:
            if isinstance(field_value, (list, str)):
                return value in field_value
        elif op == ComparisonOperator.NOT_CONTAINS:
            if isinstance(field_value, (list, str)):
                return value not in field_value
        elif op == ComparisonOperator.BETWEEN:
            if isinstance(field_value, (int, float)) and isinstance(value, list) and len(value) == 2:
                return value[0] <= field_value <= value[1]
        elif op == ComparisonOperator.NOT_BETWEEN:
            if isinstance(field_value, (int, float)) and isinstance(value, list) and len(value) == 2:
                return not (value[0] <= field_value <= value[1])
        
        return False
    
    def _get_field_value(self, path: str, field: str) -> Any:
        """Extract the value of a field from photo metadata."""
        if field == "tags":
            return self.tags_map.get(path, [])
        elif field == "person":
            # This might require a more complex implementation
            return self._get_person_for_photo(path)
        elif field == "rating":
            tags = self.tags_map.get(path, [])
            rating_tags = [tag for tag in tags if tag.startswith("rating:")]
            if rating_tags:
                return int(rating_tags[0].split(":")[1])
            return None
        elif field in self.meta_data.get('paths', []):
            # Map path to index and retrieve corresponding value from EXIF data
            paths = self.meta_data.get('paths', [])
            if path in paths:
                idx = paths.index(path)
                for meta_field in ['camera', 'iso', 'fnumber', 'place', 'flash', 
                                  'white_balance', 'metering', 'gps_altitude', 
                                  'gps_heading', 'sharpness', 'brightness', 'exposure',
                                  'focal']:
                    field_data = self.meta_data.get(meta_field, [])
                    if idx < len(field_data):
                        value = field_data[idx]
                        if isinstance(value, (list, tuple)) and len(value) == 2:
                            # Handle fraction values
                            try:
                                return float(value[0]) / float(value[1])
                            except (ValueError, ZeroDivisionError):
                                pass
                        return value
        # Handle date-based fields
        elif field == "date":
            try:
                # Get modification time from the index state
                if self.store.state.mtimes and self.store.state.paths:
                    idx = self.store.state.paths.index(path)
                    return self.store.state.mtimes[idx]
            except (ValueError, IndexError):
                pass
        return None
    
    def _get_person_for_photo(self, path: str) -> Optional[str]:
        """Get person associated with a photo"""
        # This is a simplified implementation - in reality this would use the faces infrastructure
        try:
            face_data = {}
            faces_dir = self.store.index_dir / "faces"
            if faces_dir.exists():
                faces_file = faces_dir / "faces.json"
                if faces_file.exists():
                    face_data = json.loads(faces_file.read_text())
                    # Check if this path has face data
                    if path in face_data:
                        # Return the person name if available
                        return face_data[path].get("person")
        except Exception:
            pass
        return None

    def _evaluate_rule(self, path: str, rule: SmartCollectionRule) -> bool:
        """Evaluate a single rule against a photo path."""
        if not rule.enabled:
            return False
        
        if not rule.conditions:
            return True  # Empty rule matches all
        
        results = [self._evaluate_condition(path, condition) for condition in rule.conditions]
        
        # Apply boolean operator to combine condition results
        if rule.boolean_operator == BooleanOperator.AND:
            return all(results)
        elif rule.boolean_operator == BooleanOperator.OR:
            return any(results)
        elif rule.boolean_operator == BooleanOperator.NOT:
            # NOT applies to the entire rule result
            return not all(results)
        
        return False
    
    def _temporal_clustering(self, paths: List[str], time_window_hours: int = 24) -> List[List[str]]:
        """Group photos by temporal proximity (for trip detection)."""
        if not paths:
            return []
        
        # Get modification times for all paths
        time_map = {}
        if self.store.state.mtimes and self.store.state.paths:
            for path, mtime in zip(self.store.state.paths, self.store.state.mtimes):
                time_map[path] = datetime.fromtimestamp(mtime)
        
        # Filter paths that have timestamp info
        valid_paths = [p for p in paths if p in time_map]
        if not valid_paths:
            return []
        
        # Sort by timestamp
        sorted_paths = sorted(valid_paths, key=lambda p: time_map[p])
        
        # Group by time windows
        clusters = []
        current_cluster = [sorted_paths[0]]
        
        for path in sorted_paths[1:]:
            current_time = time_map[path]
            last_time = time_map[current_cluster[-1]]
            
            time_diff = abs((current_time - last_time).total_seconds()) / 3600  # in hours
            
            if time_diff <= time_window_hours:
                # Same cluster
                current_cluster.append(path)
            else:
                # Start new cluster
                clusters.append(current_cluster)
                current_cluster = [path]
        
        if current_cluster:
            clusters.append(current_cluster)
        
        return clusters
    
    def _location_clustering(self, paths: List[str], distance_threshold_km: float = 5.0) -> List[List[str]]:
        """Group photos by geographic proximity."""
        # This would use GPS coordinates from EXIF data
        # For now, implement a placeholder
        gps_map = {}
        
        # Extract GPS coordinates from EXIF data
        if 'paths' in self.meta_data and 'gps_latitude' in self.meta_data and 'gps_longitude' in self.meta_data:
            paths_list = self.meta_data['paths']
            lats = self.meta_data.get('gps_latitude', [])
            lngs = self.meta_data.get('gps_longitude', [])
            
            for i, path in enumerate(paths_list):
                if i < len(lats) and i < len(lngs) and lats[i] is not None and lngs[i] is not None:
                    gps_map[path] = (lats[i], lngs[i])
        
        # Filter to paths that have GPS data
        valid_paths = [p for p in paths if p in gps_map]
        if not valid_paths:
            return [[p] for p in paths]  # Return each as its own cluster
        
        # Simple clustering based on distance (for now, this is a simplified implementation)
        clusters = []
        unprocessed = set(valid_paths)
        
        while unprocessed:
            current_path = unprocessed.pop()
            current_cluster = [current_path]
            current_lat, current_lng = gps_map[current_path]
            
            to_remove = set()
            for path in unprocessed:
                lat, lng = gps_map[path]
                # Calculate distance (simplified)
                lat_diff = abs(current_lat - lat) * 111  # Rough km per degree
                lng_diff = abs(current_lng - lng) * 111 * abs(np.cos(np.radians(current_lat)))
                distance = np.sqrt(lat_diff**2 + lng_diff**2)
                
                if distance <= distance_threshold_km:
                    current_cluster.append(path)
                    to_remove.add(path)
            
            for path in to_remove:
                unprocessed.remove(path)
            
            clusters.append(current_cluster)
        
        # Add paths without GPS data as individual clusters
        remaining_paths = [p for p in paths if p not in gps_map]
        for path in remaining_paths:
            clusters.append([path])
        
        return clusters

    def evaluate_collection(self, config: SmartCollectionConfig, all_paths: Optional[List[str]] = None) -> List[str]:
        """
        Evaluate a smart collection configuration against a set of photo paths.
        
        Args:
            config: Smart collection configuration
            all_paths: List of all photo paths to evaluate against. If None, uses all in store.
        
        Returns:
            List of photo paths that match the collection rules
        """
        if all_paths is None:
            all_paths = self.store.state.paths or []
        
        if not config.rules:
            return all_paths  # Return all if no rules defined
        
        # Evaluate each rule on each path
        rule_results: Dict[int, List[str]] = {}
        
        for i, rule in enumerate(config.rules):
            if not rule.enabled:
                continue
            rule_results[i] = [path for path in all_paths if self._evaluate_rule(path, rule)]
        
        if not rule_results:
            return []  # No enabled rules
        
        # Combine rule results based on the collection's rule combination operator
        if config.rule_combination == BooleanOperator.AND:
            # Find intersection of all rule results
            result_sets = list(rule_results.values())
            if not result_sets:
                return []
            final_paths = set(result_sets[0])
            for result_set in result_sets[1:]:
                final_paths = final_paths.intersection(set(result_set))
        elif config.rule_combination == BooleanOperator.OR:
            # Find union of all rule results
            final_paths = set()
            for result_set in rule_results.values():
                final_paths.update(result_set)
        else:  # Default to AND
            result_sets = list(rule_results.values())
            if not result_sets:
                return []
            final_paths = set(result_sets[0])
            for result_set in result_sets[1:]:
                final_paths = final_paths.intersection(set(result_set))
        
        # Convert to list and apply sorting if specified
        result_list = list(final_paths)
        
        if config.sort_by == "date":
            # Sort by modification time
            time_map = {}
            if self.store.state.mtimes and self.store.state.paths:
                time_map = {p: t for p, t in zip(self.store.state.paths, self.store.state.mtimes)}
            
            result_list.sort(key=lambda p: time_map.get(p, 0), reverse=(config.sort_direction == "desc"))
        # Additional sorting options can be added as needed
        
        # Apply max results limit
        if config.max_results:
            result_list = result_list[:config.max_results]
        
        return result_list
    
    def create_smart_collection(self, config: SmartCollectionConfig) -> bool:
        """Create a new smart collection with the given configuration."""
        try:
            # Convert to dict format for saving
            collection_data = config.model_dump()
            collection_data['created_at'] = collection_data['created_at'].isoformat() if collection_data['created_at'] else None
            collection_data['updated_at'] = collection_data['updated_at'].isoformat() if collection_data['updated_at'] else None
            
            self.smart_collections[config.name] = collection_data
            save_smart_collections(self.store.index_dir, self.smart_collections)
            return True
        except Exception as e:
            logger.error(f"Error creating smart collection: {e}")
            return False
    
    def update_smart_collection(self, name: str, config: SmartCollectionConfig) -> bool:
        """Update an existing smart collection."""
        try:
            if name not in self.smart_collections:
                return False
            
            # Convert to dict format for saving
            collection_data = config.model_dump()
            collection_data['created_at'] = collection_data['created_at'].isoformat() if collection_data['created_at'] else None
            collection_data['updated_at'] = collection_data['updated_at'].isoformat() if collection_data['updated_at'] else None
            
            self.smart_collections[name] = collection_data
            save_smart_collections(self.store.index_dir, self.smart_collections)
            return True
        except Exception as e:
            logger.error(f"Error updating smart collection: {e}")
            return False
    
    def delete_smart_collection(self, name: str) -> bool:
        """Delete a smart collection."""
        if name in self.smart_collections:
            del self.smart_collections[name]
            save_smart_collections(self.store.index_dir, self.smart_collections)
            return True
        return False
    
    def get_smart_collection(self, name: str) -> Optional[SmartCollectionConfig]:
        """Get a specific smart collection by name."""
        collection_data = self.smart_collections.get(name)
        if not collection_data:
            return None
        
        # Convert datetime strings back to datetime objects
        if isinstance(collection_data.get('created_at'), str):
            try:
                collection_data['created_at'] = datetime.fromisoformat(collection_data['created_at'])
            except ValueError:
                collection_data['created_at'] = None
                
        if isinstance(collection_data.get('updated_at'), str):
            try:
                collection_data['updated_at'] = datetime.fromisoformat(collection_data['updated_at'])
            except ValueError:
                collection_data['updated_at'] = None
        
        return SmartCollectionConfig(**collection_data)
    
    def get_all_smart_collections(self) -> Dict[str, SmartCollectionConfig]:
        """Get all smart collections."""
        result = {}
        for name, data in self.smart_collections.items():
            # Convert datetime strings back to datetime objects
            collection_data = data.copy()
            if isinstance(collection_data.get('created_at'), str):
                try:
                    collection_data['created_at'] = datetime.fromisoformat(collection_data['created_at'].replace('Z', '+00:00'))
                except ValueError:
                    collection_data['created_at'] = None
                    
            if isinstance(collection_data.get('updated_at'), str):
                try:
                    collection_data['updated_at'] = datetime.fromisoformat(collection_data['updated_at'].replace('Z', '+00:00'))
                except ValueError:
                    collection_data['updated_at'] = None
            
            result[name] = SmartCollectionConfig(**collection_data)
        
        return result