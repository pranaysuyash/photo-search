# Enhanced Search Features

## Overview

The Enhanced Search feature provides advanced capabilities for finding photos using temporal criteria, visual style similarity, and combined search techniques. This feature significantly improves the search experience by enabling users to find photos based on when they were taken, how they look visually, and complex combinations of multiple criteria.

## Key Features

### 1. Temporal Search
- **Time-based Similarity**: Find photos taken around the same time as a reference photo
- **Seasonal Search**: Find photos from specific seasons (spring, summer, fall, winter)
- **Time-of-Day Search**: Find photos taken during specific times (morning, afternoon, evening, night)
- **Year/Month Filtering**: Filter photos by specific years or months

### 2. Style Similarity Search
- **Color Palette Matching**: Find photos with similar color distributions
- **Texture Analysis**: Match photos based on visual texture characteristics
- **Composition Similarity**: Find photos with similar aspect ratios and compositions
- **Visual Style Clustering**: Group photos by visual characteristics (HDR, black & white, etc.)

### 3. Combined Search
- **Multi-Criteria Search**: Combine semantic, temporal, and stylistic criteria
- **Advanced Filtering**: Apply complex filters on camera metadata, EXIF data, and ratings
- **Weighted Scoring**: Customize the importance of different search criteria
- **Context-Aware Ranking**: Rank results based on multiple signals

## Architecture

### Core Components

#### EnhancedSearchService
The main search engine with:
- Temporal search capabilities
- Style similarity algorithms
- Combined search functionality
- Metadata extraction and filtering

### Data Models

#### TemporalSearchParams
Parameters for temporal search:
- `query_time`: Reference timestamp for similarity search
- `time_window_hours`: Time window in hours for grouping
- `season`: Season to filter by
- `time_of_day`: Time of day to filter by
- `year`: Specific year to filter by
- `month`: Specific month to filter by (1-12)

#### StyleSimilarityParams
Parameters for style similarity search:
- `reference_path`: Path to the reference photo
- `top_k`: Number of results to return
- `style_weight`: Weight for overall style similarity
- `color_weight`: Weight for color similarity
- `texture_weight`: Weight for texture similarity

#### CombinedSearchParams
Parameters for combined search:
- `query`: Text query for semantic search
- `temporal_params`: Temporal search parameters
- `style_reference`: Path to reference image for style similarity
- `filters`: Additional filters to apply
- `top_k`: Number of results to return

## API Endpoints

The enhanced search functionality is accessible through new v1 API endpoints:

### Enhanced Search Endpoints

- `POST /api/v1/enhanced_search/temporal` - Search based on temporal criteria
- `POST /api/v1/enhanced_search/style_similarity` - Search for photos with similar visual style
- `POST /api/v1/enhanced_search/combined` - Perform a combined search using multiple criteria
- `GET /api/v1/enhanced_search/similar_times` - Find photos from similar times as a reference
- `GET /api/v1/enhanced_search/seasonal` - Find photos from a specific season

### Request/Response Examples

#### Temporal Search

Request:
```json
{
  "dir": "/path/to/photos",
  "query_time": 1678886400.0,
  "time_window_hours": 24.0,
  "season": "summer",
  "time_of_day": "afternoon",
  "year": 2023,
  "month": 6,
  "top_k": 12
}
```

Response:
```json
{
  "search_id": "temporal_search_a1b2c3d4",
  "results": [
    {
      "path": "/path/to/photos/vacation/photo1.jpg",
      "score": 0.95
    },
    {
      "path": "/path/to/photos/vacation/photo2.jpg", 
      "score": 0.92
    }
  ],
  "cached": false,
  "provider": "local",
  "offline_mode": true
}
```

#### Style Similarity Search

Request:
```json
{
  "dir": "/path/to/photos",
  "reference_path": "/path/to/reference/photo.jpg",
  "top_k": 12,
  "style_weight": 0.3,
  "color_weight": 0.4,
  "texture_weight": 0.3
}
```

Response:
```json
{
  "search_id": "style_similarity_search_e5f6g7h8",
  "results": [
    {
      "path": "/path/to/photos/sunset/photo1.jpg",
      "score": 0.88
    },
    {
      "path": "/path/to/photos/sunset/photo2.jpg",
      "score": 0.85
    }
  ],
  "cached": false,
  "provider": "local",
  "offline_mode": true
}
```

#### Combined Search

Request:
```json
{
  "dir": "/path/to/photos",
  "query": "mountain landscape",
  "temporal_params": {
    "season": "fall",
    "year": 2023
  },
  "style_reference": "/path/to/reference/photo.jpg",
  "filters": {
    "camera": "Canon EOS",
    "iso_min": 100,
    "iso_max": 800
  },
  "top_k": 12
}
```

Response:
```json
{
  "search_id": "combined_search_i9j0k1l2",
  "results": [
    {
      "path": "/path/to/photos/fall_mountains/photo1.jpg",
      "score": 0.94
    },
    {
      "path": "/path/to/photos/fall_mountains/photo2.jpg",
      "score": 0.91
    }
  ],
  "cached": false,
  "provider": "local",
  "offline_mode": true
}
```

#### Find Photos from Similar Times

Request:
```http
GET /api/v1/enhanced_search/similar_times?dir=/path/to/photos&reference_photo=/path/to/reference/photo.jpg&time_window_hours=24.0&top_k=12
```

Response:
```json
{
  "search_id": "similar_times_search_m3n4o5p6",
  "results": [
    {
      "path": "/path/to/photos/trip/photo1.jpg",
      "score": 0.96
    },
    {
      "path": "/path/to/photos/trip/photo2.jpg",
      "score": 0.93
    }
  ],
  "cached": false,
  "provider": "local",
  "offline_mode": true
}
```

#### Seasonal Search

Request:
```http
GET /api/v1/enhanced_search/seasonal?dir=/path/to/photos&season=winter&year=2023&top_k=12
```

Response:
```json
{
  "search_id": "seasonal_search_q7r8s9t0",
  "results": [
    {
      "path": "/path/to/photos/winter_trip/photo1.jpg",
      "score": 0.89
    },
    {
      "path": "/path/to/photos/winter_trip/photo2.jpg",
      "score": 0.87
    }
  ],
  "cached": false,
  "provider": "local",
  "offline_mode": true
}
```

## Implementation Details

### Temporal Search Algorithms

The temporal search functionality uses several techniques:

1. **Timestamp Analysis**: Extracts timestamps from EXIF metadata or file modification times
2. **Seasonal Classification**: Maps months to seasons (Spring: Mar-May, Summer: Jun-Aug, etc.)
3. **Time-of-Day Mapping**: Classifies hours into time periods (Morning: 6-12, Afternoon: 12-17, etc.)
4. **Window-based Grouping**: Groups photos within specified time windows

### Style Similarity Algorithms

The style similarity search uses computer vision techniques:

1. **Color Histogram Matching**: Compares RGB color distributions using normalized histograms
2. **Texture Analysis**: Extracts texture features using gradient magnitude analysis
3. **Dominant Color Extraction**: Uses K-means clustering to identify dominant colors
4. **Shape Analysis**: Considers image aspect ratios and dimensions

### Combined Search Approach

The combined search integrates multiple signals:

1. **Semantic Search**: Base similarity from text embeddings
2. **Temporal Scoring**: Time-based similarity weighting
3. **Style Scoring**: Visual similarity weighting
4. **Metadata Filtering**: Applies camera and EXIF-based filters
5. **Score Fusion**: Combines multiple scores using weighted averaging

## Usage Examples

### Finding Vacation Photos from Similar Times

```python
# Find photos taken around the same time as a vacation photo
response = client.get("/api/v1/enhanced_search/similar_times", params={
    "dir": "/home/user/photos",
    "reference_photo": "/home/user/photos/vacation/beach.jpg",
    "time_window_hours": 48.0,  # 2-day window
    "top_k": 20
})
```

### Finding Photos with Similar Visual Style

```python
# Find photos with similar sunset colors and composition
response = client.post("/api/v1/enhanced_search/style_similarity", json={
    "dir": "/home/user/photos",
    "reference_path": "/home/user/photos/sunsets/golden_hour.jpg",
    "top_k": 15,
    "color_weight": 0.5,
    "texture_weight": 0.3,
    "style_weight": 0.2
})
```

### Seasonal Memory Search

```python
# Find all summer vacation photos over the years
response = client.get("/api/v1/enhanced_search/seasonal", params={
    "dir": "/home/user/photos",
    "season": "summer",
    "top_k": 50
})
```

### Combined Criteria Search

```python
# Find landscape photos taken in the morning during spring
response = client.post("/api/v1/enhanced_search/combined", json={
    "dir": "/home/user/photos",
    "query": "landscape nature",
    "temporal_params": {
        "season": "spring",
        "time_of_day": "morning"
    },
    "filters": {
        "camera": "DSLR",
        "iso_max": 400  # Good lighting conditions
    },
    "top_k": 25
})
```

## Performance Considerations

### Computational Complexity

1. **Temporal Search**: O(n) where n is the number of photos
2. **Style Similarity**: O(n×m) where n is photos and m is features per photo
3. **Combined Search**: O(n×(s+m+f)) combining semantic, metadata, and filtering costs

### Optimization Strategies

1. **Caching**: Cache computed features and search results
2. **Indexing**: Use spatial and temporal indexes for faster lookups
3. **Batching**: Process multiple photos in batches for efficiency
4. **Lazy Loading**: Load metadata only when needed

## Testing

The enhanced search system includes comprehensive tests covering:
- Temporal search functionality with various time criteria
- Style similarity algorithms with different visual features
- Combined search with multiple weighted signals
- Edge cases and error conditions
- Performance benchmarks

Run the tests with:
```bash
pytest tests/test_enhanced_search.py
```

## Future Enhancements

1. **Deep Learning Models**: Integration with state-of-the-art computer vision models for better style matching
2. **Real-time Processing**: Support for streaming and real-time search
3. **Cross-Collection Search**: Ability to search across multiple photo collections
4. **Privacy Controls**: Advanced privacy options for search data handling
5. **Performance Optimization**: GPU acceleration and distributed processing for large collections
6. **Natural Language Temporal Queries**: Support for queries like "photos from last summer" or "pictures taken around noon"
7. **Object-Based Style Search**: Find photos with similar objects or scenes
8. **Emotion-Based Search**: Match photos by emotional content or mood