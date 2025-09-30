"""
Schema snapshot tests to detect breaking changes in API response models.

Generates JSON schemas for all response models and compares against saved snapshots.
Any schema changes require manual review to ensure backward compatibility.
"""
import json
import pytest
from pathlib import Path
from typing import Dict, Any

# Import all response models
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from api.schemas.v1 import (
    BaseResponse,
    SuccessResponse,
    ErrorResponse,
    IndexResponse,
    IndexStatusResponse,
    ShareResponse,
    ShareListResponse,
    ShareDetailResponse,
    FavoriteResponse,
    TagResponse,
    TagsListResponse,
    AutoTagResponse,
    CollectionResponse,
    CollectionsResponse,
    CollectionDeleteResponse,
    HealthResponse,
    SearchResponse,
)

# Models to snapshot
RESPONSE_MODELS = {
    "BaseResponse": BaseResponse,
    "SuccessResponse": SuccessResponse,
    "ErrorResponse": ErrorResponse,
    "IndexResponse": IndexResponse,
    "IndexStatusResponse": IndexStatusResponse,
    "ShareResponse": ShareResponse,
    "ShareListResponse": ShareListResponse,
    "ShareDetailResponse": ShareDetailResponse,
    "FavoriteResponse": FavoriteResponse,
    "TagResponse": TagResponse,
    "TagsListResponse": TagsListResponse,
    "AutoTagResponse": AutoTagResponse,
    "CollectionResponse": CollectionResponse,
    "CollectionsResponse": CollectionsResponse,
    "CollectionDeleteResponse": CollectionDeleteResponse,
    "HealthResponse": HealthResponse,
    "SearchResponse": SearchResponse,
}


def get_schema_snapshot_path() -> Path:
    """Get path to schema snapshots directory."""
    return Path(__file__).parent / "schema_snapshots"


def get_current_schemas() -> Dict[str, Any]:
    """Generate current JSON schemas for all response models."""
    schemas = {}
    for name, model_class in RESPONSE_MODELS.items():
        try:
            # Use Pydantic v2 method if available, fallback to v1
            if hasattr(model_class, 'model_json_schema'):
                schema = model_class.model_json_schema()
            else:
                schema = model_class.schema()
            schemas[name] = schema
        except Exception as e:
            pytest.fail(f"Failed to generate schema for {name}: {e}")
    return schemas


def save_schema_snapshots(schemas: Dict[str, Any]) -> None:
    """Save current schemas as snapshots."""
    snapshot_dir = get_schema_snapshot_path()
    snapshot_dir.mkdir(exist_ok=True)
    
    for name, schema in schemas.items():
        snapshot_file = snapshot_dir / f"{name}.json"
        with open(snapshot_file, 'w') as f:
            json.dump(schema, f, indent=2, sort_keys=True)


def load_schema_snapshots() -> Dict[str, Any]:
    """Load existing schema snapshots."""
    snapshot_dir = get_schema_snapshot_path()
    if not snapshot_dir.exists():
        return {}
    
    snapshots = {}
    for snapshot_file in snapshot_dir.glob("*.json"):
        name = snapshot_file.stem
        with open(snapshot_file) as f:
            snapshots[name] = json.load(f)
    return snapshots


class TestSchemaSnapshots:
    """Schema snapshot tests for response models."""
    
    def test_schema_snapshots_exist_or_create(self):
        """Ensure schema snapshots exist, create if missing."""
        current_schemas = get_current_schemas()
        existing_snapshots = load_schema_snapshots()
        
        if not existing_snapshots:
            # First run - create snapshots
            save_schema_snapshots(current_schemas)
            pytest.skip("Created initial schema snapshots. Re-run to validate.")
        
        # Snapshots exist, proceed with validation
        assert len(existing_snapshots) > 0, "No schema snapshots found"
    
    def test_schema_backward_compatibility(self):
        """Verify current schemas are backward compatible with snapshots."""
        current_schemas = get_current_schemas()
        existing_snapshots = load_schema_snapshots()
        
        if not existing_snapshots:
            pytest.skip("No snapshots to compare against. Run test_schema_snapshots_exist_or_create first.")
        
        breaking_changes = []
        
        for name, current_schema in current_schemas.items():
            if name not in existing_snapshots:
                # New model - this is fine
                continue
            
            snapshot_schema = existing_snapshots[name]
            compatibility_issues = self._check_backward_compatibility(
                name, snapshot_schema, current_schema
            )
            breaking_changes.extend(compatibility_issues)
        
        if breaking_changes:
            change_summary = "\n".join(breaking_changes)
            pytest.fail(f"Breaking schema changes detected:\n{change_summary}")
    
    def _check_backward_compatibility(self, name: str, old_schema: Dict[str, Any], new_schema: Dict[str, Any]) -> list[str]:
        """Check if new schema is backward compatible with old schema."""
        issues = []
        
        # Check if required fields were added
        old_required = set(old_schema.get("required", []))
        new_required = set(new_schema.get("required", []))
        added_required = new_required - old_required
        
        if added_required:
            issues.append(f"{name}: Added required fields: {added_required}")
        
        # Check if existing fields were removed
        old_properties = set(old_schema.get("properties", {}).keys())
        new_properties = set(new_schema.get("properties", {}).keys())
        removed_fields = old_properties - new_properties
        
        if removed_fields:
            issues.append(f"{name}: Removed fields: {removed_fields}")
        
        # Check if field types changed incompatibly
        old_props = old_schema.get("properties", {})
        new_props = new_schema.get("properties", {})
        
        for field_name in old_properties & new_properties:
            old_type = old_props[field_name].get("type")
            new_type = new_props[field_name].get("type")
            
            if old_type and new_type and old_type != new_type:
                issues.append(f"{name}.{field_name}: Type changed from {old_type} to {new_type}")
        
        return issues
    
    def test_update_snapshots_on_approval(self):
        """Update snapshots if changes are approved (manual test)."""
        # This test should only be run manually when schema changes are approved
        pytest.skip("Manual test - only run when approving schema changes")
        
        current_schemas = get_current_schemas()
        save_schema_snapshots(current_schemas)


if __name__ == "__main__":
    # Run with: python -m pytest tests/test_schema_snapshots.py -v
    # To update snapshots: python -m pytest tests/test_schema_snapshots.py::TestSchemaSnapshots::test_update_snapshots_on_approval -v -s
    pytest.main([__file__, "-v"])