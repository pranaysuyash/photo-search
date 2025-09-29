# Photo Search API Documentation: Intent-First Design

## Overview

This API documentation follows the Intent-First methodology, focusing on user outcomes rather than technical specifications. Every endpoint is designed to serve a specific user intent and optimize for perceived performance.

## Intent-First API Design Principles

### 1. **Optimize What Users Actually Feel**
- Progressive result delivery (streaming)
- Immediate acknowledgment of requests
- Background processing for long operations

### 2. **Progressive Enhancement**
- Core functionality works immediately
- Advanced features load asynchronously
- Graceful degradation when services unavailable

### 3. **Business Value Alignment**
- Every endpoint must serve a measurable user intent
- Performance metrics tied to user satisfaction
- Resource optimization based on actual usage patterns

## Core User Intents & API Mapping

### Intent 1: "I want to find my photos fast by describing them"

#### Primary Endpoint: Progressive Search
```http
GET /search/stream?query=friends&having&tea&top_k=50
```

**User Experience Flow:**
1. **0-500ms**: First 12 results appear immediately
2. **500ms-2s**: Additional results stream in batches of 12
3. **2s+**: Complete result set with metadata

**Response Format (Server-Sent Events):**
```json
// Immediate response (500ms)
event: initial
data: {
  "results": [
    {"path": "/photos/tea1.jpg", "score": 0.95},
    {"path": "/photos/tea2.jpg", "score": 0.92}
  ],
  "has_more": true,
  "estimated_total": 47
}

// Streaming updates (every 500ms)
event: update
data: {
  "batch": [
    {"path": "/photos/tea3.jpg", "score": 0.89},
    {"path": "/photos/tea4.jpg", "score": 0.87}
  ],
  "progress": 25
}

event: complete
data: {
  "final_count": 47,
  "search_id": "srch_abc123",
  "metadata": {
    "processing_time": 1.8,
    "indexes_used": ["clip-ViT-B-32", "faiss"]
  }
}
```

#### Fallback: Traditional Search
```http
POST /search
```
*Used when streaming unavailable or for compatibility*

### Intent 2: "I want to organize photos without waiting"

#### Async Collection Management
```http
POST /collections/create?async=true
```

**Response:**
```json
{
  "job_id": "coll_xyz789",
  "status": "accepted",
  "estimated_time": "2 minutes",
  "immediate_actions": [
    "Collection created",
    "Initial photos added: 15"
  ],
  "background_tasks": [
    "AI tagging in progress",
    "Duplicate detection"
  ]
}
```

### Intent 3: "I want to browse large result sets smoothly"

#### Cursor-Based Pagination
```http
GET /search/paginated?query=vacation&cursor=eyJwYXRoIjoiL2ZvbyIsInNjb3JlIjowLjg5fQ==&limit=24
```

**Response:**
```json
{
  "results": [...],
  "next_cursor": "eyJwYXRoIjoiL2JhciIsInNjb3JlIjowLjg1fQ==",
  "previous_cursor": "eyJwYXRoIjoiL2JheiIsInNjb3JlIjowLjkxfQ==",
  "has_more": true,
  "total_estimated": 156,
  "page_info": {
    "current_page": 3,
    "results_per_page": 24,
    "total_pages": 7
  }
}
```

### Intent 4: "I want to know the progress of long operations"

#### Job Status Tracking
```http
GET /jobs/{job_id}/status
```

**Response Examples:**
```json
// Queued
{
  "job_id": "idx_pqr456",
  "status": "queued",
  "position": 2,
  "estimated_start": "30 seconds"
}

// Running
{
  "job_id": "idx_pqr456", 
  "status": "running",
  "progress": 45,
  "current_action": "Processing batch 12/30",
  "photos_processed": 1540,
  "photos_total": 3420,
  "time_remaining": "12 minutes",
  "throughput": "120 photos/minute"
}

// Completed
{
  "job_id": "idx_pqr456",
  "status": "completed",
  "progress": 100,
  "result": {
    "new_photos": 1200,
    "updated_photos": 50,
    "total_photos": 3420
  },
  "duration": "28 minutes"
}
```

## API Endpoint Reference (Intent-First Organized)

### 🚀 **Immediate Response APIs** (Target: <500ms)

#### Health & Status
```http
GET /health
```
*Returns immediate system status*

#### Quick Search Preview
```http
GET /search/preview?query={text}&folder={path}
```
*First 6 results for immediate preview*

#### Instant Metadata
```http
GET /photos/{path}/metadata/quick
```
*Basic EXIF without heavy processing*

### ⚡ **Progressive APIs** (Target: <2s initial, streaming continues)

#### Streaming Search
```http
GET /search/stream
```
*Progressive result delivery*

#### Paginated Results  
```http
GET /search/paginated
```
*Cursor-based pagination*

#### Thumbnail Stream
```http
GET /thumbnails/stream?paths=...&priority=visible
```
*Progressive thumbnail loading*

### 🔄 **Background Job APIs** (Async with status tracking)

#### Indexing Jobs
```http
POST /jobs/index
GET /jobs/{job_id}/status
DELETE /jobs/{job_id}
```

#### AI Processing Jobs
```http
POST /jobs/captions
POST /jobs/faces  
POST /jobs/ocr
```

#### Collection Jobs
```http
POST /jobs/collections/ai_tag
POST /jobs/collections/dedup
```

### 📊 **Analytics & Insights APIs**

#### Performance Metrics
```http
GET /analytics/performance
```
*API response times, throughput*

#### User Experience Metrics
```http
GET /analytics/user_experience
```
*Time to first result, abandonment rates*

#### Collection Insights
```http
GET /analytics/collections/{id}/insights
```
*Growth trends, duplicate detection*

## Performance Optimization Features

### 1. **Smart Caching Strategy**

#### Predictive Cache Warming
```http
POST /cache/warm_predictive
```
*Analyzes user behavior to pre-load likely searches*

#### Cache Status Management
```http
GET /cache/status
POST /cache/warm?folder={path}
DELETE /cache/invalidate?folder={path}
```

### 2. **Intelligent Batch Processing**

#### Adaptive Batch Sizes
```http
POST /index?adaptive_batch=true&memory_limit=2GB
```
*Automatically adjusts batch size based on available memory*

#### Parallel Processing
```http
POST /index?parallel_workers=4&gpu_acceleration=true
```

### 3. **Progressive Quality Loading**

#### Thumbnail Quality Tiers
```http
GET /thumbnails/progressive?path={photo}&tiers=low,medium,high
```
*Loads blurred preview, then medium, then full quality*

#### Search Result Enrichment
```http
GET /search/enrich?search_id={id}&include=faces,exif,location
```
*Adds detailed metadata progressively*

## API Versioning

### Version Strategy
The API implements versioning using URL prefixes to ensure backward compatibility:
- **Current Version**: `/api/v1/`
- **Legacy Endpoints**: Continue to work at original paths for backward compatibility
- **New Development**: Should target versioned endpoints (`/api/v1/`)

### Version 1 Endpoints
Current v1 endpoints include:
- `/api/v1/search/` - Photo semantic search
- `/api/v1/search/cached` - Cached photo search
- Additional endpoints will be added in future development

## Response Models

### Standardized Response Structure
All API responses use Pydantic models for consistency:

#### Base Response Models
- `BaseResponse`: Core response with `ok` status and optional `message`
- `ErrorResponse`: Error responses with detailed error information  
- `SuccessResponse`: Successful responses with optional `data` field
- Endpoint-specific models like `HealthResponse`, `ShareResponse`, `IndexResponse`, etc.

#### Example Response Structures
```json
// Success Response
{
  "ok": true,
  "data": {
    // endpoint-specific data
  }
}

// Error Response
{
  "ok": false,
  "error": {
    "type": "error_type",
    "message": "error_message",
    "details": [...]
  }
}
```

## Error Handling (Intent-First)

### User-Friendly Error Responses
```json
{
  "ok": false,
  "error": {
    "type": "user_action_needed",
    "message": "We need access to your photo folder. Please check the path and try again.",
    "user_action": "Verify folder path and permissions",
    "estimated_fix_time": "30 seconds",
    "help_link": "https://help.photosearch.com/folder-access"
  },
  "context": {
    "folder_path": "/Users/photos",
    "permission_status": "denied",
    "suggested_paths": ["/Users/photos", "/Pictures"]
  }
}
```

### Graceful Degradation
```json
{
  "ok": false,
  "error": {
    "type": "partial_success",
    "message": "Found 24 photos, but some results may be missing due to a temporary issue.",
    "missing_features": ["face_detection", "location_data"],
    "retry_after": "5 minutes"
  },
  "results": [...]
}
```

## Client Integration Patterns

### 1. **Progressive Web App Pattern**
```javascript
// Immediate feedback while loading
const searchStream = new EventSource('/search/stream?query=vacation');

searchStream.addEventListener('initial', (e) => {
  const data = JSON.parse(e.data);
  displayResults(data.results); // Show first batch
  updateProgress(0, data.estimated_total);
});

searchStream.addEventListener('update', (e) => {
  const data = JSON.parse(e.data);
  appendResults(data.batch);
  updateProgress(data.progress, data.estimated_total);
});
```

### 2. **Mobile App Pattern**
```javascript
// Handle poor connectivity with offline-first
const searchWithFallback = async (query) => {
  try {
    // Try streaming first
    const streamResults = await streamSearch(query);
    return streamResults;
  } catch (error) {
    // Fallback to traditional search
    const traditionalResults = await traditionalSearch(query);
    return traditionalResults;
  }
};
```

### 3. **Desktop App Pattern**
```javascript
// Background job monitoring for long operations
const monitorJobProgress = (jobId) => {
  const interval = setInterval(async () => {
    const status = await fetchJobStatus(jobId);
    updateProgressBar(status.progress);
    
    if (status.status === 'completed') {
      clearInterval(interval);
      showCompletionNotification(status.result);
    }
  }, 2000); // Check every 2 seconds
};
```

## Rate Limiting & Fair Usage

### Intent-Based Rate Limiting
- **Search**: 60 requests/minute per user (allows for rapid refinement)
- **Indexing**: 1 concurrent job per folder (prevents resource exhaustion)
- **AI Features**: 30 requests/minute (balances cost and usability)

### Graceful Rate Limit Responses
```json
{
  "error": {
    "type": "rate_limited",
    "message": "You've reached the search limit. Please wait a moment before trying again.",
    "retry_after": 30,
    "suggested_action": "Try a more specific search term",
    "alternative": "Use the 'I'm feeling lucky' feature for instant results"
  }
}
```

## Security & Privacy (Intent-First)

### Privacy-First Design
- All operations local-first when possible
- Cloud provider tokens never stored server-side
- User data remains on user's device

### Consent-Based Features
```http
POST /features/enable?feature=cloud_processing
```
*Explicit opt-in for cloud-based AI features*

## Migration Guide: Traditional → Intent-First APIs

### Step 1: Add Streaming Support
```javascript
// Before
const results = await fetch('/search', {method: 'POST', body: {...}});

// After  
const results = await fetch('/search/stream?query=vacation');
// Handle progressive results via Server-Sent Events
```

### Step 2: Implement Job Management
```javascript
// Before
const result = await fetch('/index', {method: 'POST', body: {...}});

// After
const job = await fetch('/jobs/index', {method: 'POST', body: {...}});
const result = await monitorJobCompletion(job.job_id);
```

### Step 3: Add Pagination
```javascript
// Before
const allResults = await fetch('/search', {method: 'POST', body: {...}});

// After
const firstPage = await fetch('/search/paginated?limit=24');
const secondPage = await fetch(`/search/paginated?cursor=${firstPage.next_cursor}`);
```

## Testing & Quality Assurance

### Intent-Based Testing Scenarios
1. **"User searches for vacation photos on mobile with poor connection"**
   - Test streaming with network throttling
   - Verify graceful degradation
   - Measure time to first result

2. **"User indexes 50,000 photos on laptop"**  
   - Test background job management
   - Verify progress reporting accuracy
   - Measure resource usage

3. **"User browses through 200 search results"**
   - Test pagination performance
   - Verify thumbnail loading smoothness
   - Measure memory usage

### Performance Benchmarks
- **Time to First Result**: <500ms (95th percentile)
- **Streaming Batch Delivery**: <500ms between batches
- **Job Status Updates**: <2s latency
- **Pagination Response**: <200ms per page

## Monitoring & Observability

### User Experience Metrics
```http
GET /metrics/ux
```
*Returns user-centric performance data*

### Business Impact Metrics  
```http
GET /metrics/business
```
*Tracks engagement and conversion metrics*

### Technical Performance Metrics
```http
GET /metrics/technical  
```
*API response times, error rates, throughput*

## Conclusion

This Intent-First API design prioritizes user-perceived performance over technical metrics. Every endpoint serves a specific user intent with measurable outcomes. The progressive enhancement approach ensures core functionality works immediately while advanced features load asynchronously.

**Key Success Indicators:**
- User satisfaction with search speed
- Reduced abandonment rates  
- Increased engagement with large photo collections
- Positive feedback on responsiveness

**Next Steps:**
1. Implement streaming search endpoints
2. Deploy background job management
3. Add comprehensive analytics
4. Monitor user experience metrics
5. Iterate based on user feedback