# Enhanced Smart Collections Feature

## Overview

The Enhanced Smart Collections feature provides advanced capabilities for automatically organizing photos based on complex rules, temporal clustering, and location-based grouping. This feature significantly extends the basic smart collections functionality with more sophisticated filtering and clustering algorithms.

## Key Features

### 1. Advanced Rule Engine
- **Boolean Logic**: Support for AND, OR, and NOT operators to combine multiple conditions
- **Nested Conditions**: Complex rule structures with multiple levels of conditions
- **Rule Weighting**: Ability to assign weights to different rules for ranking results
- **Rich Filter Types**: Support for various metadata fields and custom conditions

### 2. Temporal Clustering
- **Time-based Grouping**: Automatically group photos taken within specific time windows
- **Trip Detection**: Identify photo sequences that likely represent trips or events
- **Customizable Windows**: Configurable time ranges for clustering (e.g., 24 hours, 1 week)

### 3. Location Clustering
- **Geographic Grouping**: Group photos based on GPS coordinates
- **Distance Thresholds**: Configurable distance for clustering nearby photos
- **Map Integration**: Prepare for future map-based visualization

### 4. Comprehensive Metadata Filtering
- **EXIF Data**: Rich filtering based on camera settings (ISO, aperture, focal length, etc.)
- **Tags**: Advanced tag-based filtering with support for AND/OR logic
- **People Detection**: Group by recognized faces and people
- **Ratings**: Filter by user-assigned ratings

## Architecture

### Domain Models

#### SmartCollectionConfig
The main configuration object for a smart collection:

```python
class SmartCollectionConfig(BaseModel):
    name: str
    description: Optional[str]
    rules: List[SmartCollectionRule]
    rule_combination: BooleanOperator  # AND/OR for combining multiple rules
    max_results: Optional[int]
    sort_by: Optional[str]  # Options: relevance, date, rating
    sort_direction: Optional[str]  # asc/desc
```

#### SmartCollectionRule
Individual rules within a collection:

```python
class SmartCollectionRule(BaseModel):
    type: RuleType
    conditions: List[RuleCondition]
    boolean_operator: BooleanOperator
    enabled: bool
    weight: Optional[float]
```

#### RuleCondition
Specific conditions within rules:

```python
class RuleCondition(BaseModel):
    field: str
    operator: ComparisonOperator  # EQUALS, CONTAINS, BETWEEN, etc.
    value: Union[str, int, float, List[Any], Dict[str, Any]]
    weight: Optional[float]
```

### Services

#### EnhancedSmartCollectionsService
The core service implementing the enhanced functionality:

- `evaluate_collection()`: Evaluates rules against photo collections
- `_temporal_clustering()`: Groups photos by time proximity
- `_location_clustering()`: Groups photos by geographic proximity
- CRUD operations for managing smart collections

## API Endpoints

The enhanced functionality is accessible through new v1 API endpoints:

### Enhanced Smart Collections Endpoints

- `GET /api/v1/enhanced_smart_collections/?dir={directory}` - List all enhanced smart collections
- `POST /api/v1/enhanced_smart_collections/?dir={directory}` - Create a new enhanced smart collection
- `PUT /api/v1/enhanced_smart_collections/{name}?dir={directory}` - Update an existing collection
- `DELETE /api/v1/enhanced_smart_collections/{name}?dir={directory}` - Delete a collection
- `POST /api/v1/enhanced_smart_collections/evaluate/{name}?dir={directory}` - Evaluate and return matching photos
- `POST /api/v1/enhanced_smart_collections/temporal_cluster?dir={directory}&time_window_hours=24` - Perform temporal clustering
- `POST /api/v1/enhanced_smart_collections/location_cluster?dir={directory}&distance_threshold_km=5.0` - Perform location clustering

### Request/Response Examples

#### Creating a Complex Smart Collection

```json
{
  "name": "Summer Vacation 2023",
  "description": "Photos from summer vacation with family",
  "rules": [
    {
      "type": "query",
      "conditions": [
        {
          "field": "query",
          "operator": "CONTAINS",
          "value": "beach vacation summer"
        }
      ],
      "boolean_operator": "AND"
    },
    {
      "type": "exif", 
      "conditions": [
        {
          "field": "iso",
          "operator": "LESS_THAN",
          "value": 400
        }
      ],
      "boolean_operator": "AND"
    },
    {
      "type": "tags",
      "conditions": [
        {
          "field": "tags", 
          "operator": "CONTAINS",
          "value": "family"
        }
      ],
      "boolean_operator": "AND"
    }
  ],
  "rule_combination": "AND",
  "sort_by": "date",
  "sort_direction": "desc"
}
```

#### Temporal Clustering Response

```json
{
  "ok": true,
  "data": {
    "clusters": [
      {
        "id": "temporal_cluster_0",
        "photos": ["/photos/trip1/photo1.jpg", "/photos/trip1/photo2.jpg"],
        "count": 2,
        "start_time": 1678886400.0,
        "end_time": 1678972800.0,
        "duration_hours": 24.0
      }
    ],
    "total_clusters": 1,
    "total_photos": 100
  }
}
```

## Usage Examples

### Creating Smart Collections with Complex Rules

1. **Vacation Collection**: Find all photos from a specific date range, with people tags, and good lighting conditions (ISO < 400)
2. **Portrait Collection**: Group photos containing specific people and taken with portrait-appropriate camera settings
3. **Landscape Collection**: Find landscape photos based on tags, camera settings (high f-number), and optimal lighting conditions

### Automatic Organization

1. **Trip Detection**: Automatically group photos by temporal proximity to identify trips
2. **Event Recognition**: Group photos taken in the same location during the same time period
3. **Theme Detection**: Group photos by similar content or subjects

## Implementation Notes

### Backward Compatibility

The enhanced functionality is added alongside existing smart collections functionality to ensure backward compatibility. The original endpoints remain unchanged while new enhanced endpoints provide the additional features.

### Performance Considerations

1. **Caching**: Results of complex rule evaluations can be cached to improve performance
2. **Indexing**: Efficient indexing of metadata enables fast rule evaluation
3. **Pagination**: Large result sets support pagination to avoid performance issues

### Extensibility

The rule engine is designed to be extensible:
- New rule types can be added by extending the `RuleType` enum
- New comparison operators can be added by extending the `ComparisonOperator` enum
- Custom clustering algorithms can be implemented and integrated

## Testing

Comprehensive tests cover:
- Basic rule evaluation
- Complex rule combinations with boolean operators
- Temporal and location clustering algorithms  
- CRUD operations for smart collections
- Edge cases and error conditions

Run the tests with:
```bash
pytest tests/test_enhanced_smart_collections.py
```

## Future Enhancements

1. **Visual Similarity Clustering**: Group photos based on visual content similarity
2. **Style-based Organization**: Organize by photographic style (portrait, landscape, macro, etc.)
3. **Advanced Search Integration**: Combine semantic search with rule-based filtering
4. **Machine Learning**: Use ML models to suggest smart collections based on photo content
5. **Smart Albums**: Automatically create and update collections based on usage patterns