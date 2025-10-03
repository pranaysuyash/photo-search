# Enhanced Face Recognition Feature

## Overview

The Enhanced Face Recognition feature provides advanced capabilities for detecting, clustering, and managing faces in photo collections. This feature significantly improves the accuracy and usability of face recognition compared to the basic implementation with better detection algorithms, quality assessment, and intelligent clustering.

## Key Improvements

### 1. Improved Face Detection
- **Quality Assessment**: Each face detection is scored for quality based on blur, pose, illumination, and size.
- **Multi-Model Support**: Support for multiple face detection models with fallbacks.
- **GPU Acceleration**: Option to use GPU for faster processing.

### 2. Enhanced Clustering Algorithms
- **Multiple Clustering Methods**: Support for DBSCAN, HDBSCAN, and Agglomerative clustering.
- **Configurable Parameters**: Adjustable thresholds for cluster size and similarity.
- **Quality-Based Filtering**: Low-quality detections are filtered before clustering.

### 3. Advanced Matching and Similarity
- **Configurable Thresholds**: Adjustable similarity thresholds for matching faces.
- **Quality-Weighted Matching**: Higher quality face detections receive priority.
- **Face Similarity Search**: Ability to find photos with faces similar to a reference face.

### 4. Enhanced Management Capabilities
- **Face Quality Statistics**: Get detailed statistics about face detection quality in your collection.
- **Intelligent Merging/Splitting**: More sophisticated algorithms for combining or separating face clusters.
- **Incremental Processing**: Process only new or changed photos.

## Architecture

### Core Components

#### EnhancedFaceRecognizer
The main recognition engine with:
- Face detection with quality scoring
- Multiple clustering algorithm support
- Configurable parameters for different scenarios

#### EnhancedFaceClusteringService
Service providing enhanced clustering operations:
- `merge_clusters()`: Combine two clusters with improved logic
- `split_cluster()`: Split selected photos to new cluster
- `find_similar_faces()`: Find faces similar to reference
- `get_face_quality_stats()`: Get quality metrics

### Data Models

#### FaceDetection
Represents a detected face with:
- Embedding vector
- Bounding box coordinates
- Quality score
- Detection confidence

#### FaceCluster
Represents a group of faces belonging to the same person with:
- Cluster ID
- Associated photos
- Centroid representation
- Confidence score

## API Endpoints

The enhanced face recognition functionality is accessible through new v1 API endpoints:

### Enhanced Faces Endpoints

- `POST /api/v1/enhanced_faces/build?dir={directory}` - Build enhanced face index with clustering options
- `GET /api/v1/enhanced_faces/clusters?directory={directory}` - Get all enhanced face clusters
- `POST /api/v1/enhanced_faces/merge` - Merge two face clusters
- `POST /api/v1/enhanced_faces/split` - Split photos from a cluster to a new cluster
- `POST /api/v1/enhanced_faces/find_similar` - Find faces similar to a reference face
- `GET /api/v1/enhanced_faces/quality_stats?directory={directory}` - Get face quality statistics

### Request/Response Examples

#### Building Enhanced Face Index

```json
{
  "dir": "/path/to/photos",
  "clustering_method": "hdbscan",
  "min_cluster_size": 3,
  "similarity_threshold": 0.6,
  "quality_threshold": 0.3
}
```

Response:
```json
{
  "updated": 150,
  "faces": 420,
  "clusters": 28,
  "unclustered_faces": 12
}
```

#### Finding Similar Faces

```json
{
  "dir": "/path/to/photos",
  "photo_path": "/path/to/photo.jpg",
  "face_idx": 0,
  "threshold": 0.7
}
```

Response:
```json
{
  "ok": true,
  "target_face": {
    "photo_path": "/path/to/photo.jpg",
    "face_idx": 0
  },
  "similar_faces": [
    {
      "photo_path": "/path/to/similar_photo.jpg",
      "face_idx": 1,
      "similarity": 0.85,
      "cluster": 5
    }
  ],
  "count": 1
}
```

#### Quality Statistics Response

```json
{
  "ok": true,
  "total_faces": 420,
  "high_quality_faces": 380,
  "average_quality": 0.78,
  "high_quality_ratio": 0.905
}
```

## Configuration Parameters

### Clustering Options
- `clustering_method`: Algorithm to use ("dbscan", "hdbscan", "agglomerative")
- `min_cluster_size`: Minimum number of faces for a valid cluster (default: 3)
- `similarity_threshold`: Threshold for considering faces similar (default: 0.6)
- `quality_threshold`: Minimum quality score for face detection (default: 0.3)

### Performance Considerations
- **Batch Processing**: Process photos in batches to manage memory usage
- **Incremental Updates**: Only process new or changed photos
- **Quality Filtering**: Excludes low-quality detections to improve clustering accuracy

## Usage Examples

### High-Quality Face Clustering
```python
recognizer = EnhancedFaceRecognizer(
    clustering_method="hdbscan",
    similarity_threshold=0.7,
    quality_threshold=0.5
)
result = recognizer.build_face_index(index_dir, photo_paths)
```

### Finding All Photos of a Specific Person
```python
# First, identify a face in a reference photo
service = EnhancedFaceClusteringService(index_dir)
similar_faces = service.find_similar_faces("/path/to/reference.jpg", face_idx=0)
```

### Merging Incorrectly Separated Clusters
```python
service = EnhancedFaceClusteringService(index_dir)
result = service.merge_clusters("cluster_5", "cluster_10")
```

## Migration from Basic Face Recognition

The enhanced face recognition feature is designed to be backward compatible while providing significant improvements:

1. **Endpoint Structure**: Uses `/enhanced_faces/*` endpoints to distinguish from basic functionality
2. **Data Compatibility**: Works with existing face index data
3. **Configuration**: Offers more granular control than basic implementation

## Implementation Notes

### Quality Assessment
The system uses multiple factors to assess face detection quality:
- **Blur Detection**: Uses Laplacian variance to measure sharpness
- **Face Size**: Evaluates face size relative to image dimensions
- **Pose Alignment**: Considers facial landmark alignment

### Clustering Improvements
- **Normalization**: Embeddings are L2-normalized for cosine similarity
- **Adaptive Parameters**: Clustering parameters can be adjusted based on dataset characteristics
- **Quality Filtering**: Low-quality embeddings are filtered before clustering to improve accuracy

## Testing

The enhanced face recognition system includes comprehensive tests covering:
- Face quality assessment algorithms
- Clustering functionality with different methods
- Service-level operations (merge, split, similarity search)
- Edge cases and error conditions

Run the tests with:
```bash
pytest tests/test_enhanced_face_recognition.py
```

## Future Enhancements

1. **Deep Learning Models**: Integration with state-of-the-art face recognition models
2. **Real-time Processing**: Support for video face tracking and recognition
3. **Cross-Collection Matching**: Ability to match faces across multiple photo collections
4. **Privacy Controls**: Advanced privacy options for face data handling
5. **Performance Optimization**: GPU acceleration and distributed processing for large collections