# Backend-Frontend Integration Audit Report

**Date**: October 4, 2025  
**Scope**: webapp-v3 ↔ photo-search-intent-first backend  
**Status**: ❌ Critical API Mismatches Found

---

## 🚨 Critical API Mismatches

### 1. Library Endpoint Mismatch

**Frontend (webapp-v3)**:

```typescript
// src/services/api.ts line 45
const response = await fetch(`${API_BASE}/library`, {
  method: "POST", // ❌ WRONG METHOD
  body: formData,
});
```

**Backend (photo-search-intent-first)**:

```python
# api/routers/library.py line 89
@router.get("/library")  # ✅ Expects GET
def api_library(
    directory: str = Query(..., alias="dir"),
    provider: str = "local",
    limit: int = 120,
    offset: int = 0,
    ...
```

**❌ Issue**: Frontend sends POST with FormData, backend expects GET with query parameters.

### 2. Missing API Endpoints

Frontend expects these endpoints that may not exist:

| Frontend API Call             | Expected Backend       | Status               |
| ----------------------------- | ---------------------- | -------------------- |
| `POST /api/library`           | `GET /library`         | ❌ Method mismatch   |
| `POST /api/search`            | `POST /search`         | ✅ Exists            |
| `GET /api/analytics`          | `GET /analytics`       | ❓ Need verification |
| `GET /api/workspaces`         | `GET /workspaces`      | ❓ Need verification |
| `GET /api/photo?path=...`     | Photo serving endpoint | ❓ Need verification |
| `GET /api/thumbnail?path=...` | Thumbnail endpoint     | ❓ Need verification |

### 3. Search Endpoint Analysis

**Frontend Request**:

```typescript
// Sends FormData with: dir, q, provider, top_k, offset
const formData = new FormData();
formData.append("dir", dir);
formData.append("q", query);
formData.append("provider", provider);
formData.append("top_k", topK.toString());
formData.append("offset", offset.toString());
```

**Backend Expectation** (from server.py line 1114):

```python
@app.post("/search")
async def search_endpoint(
    dir: str = Form(...),
    query: str = Form(...),  # ❌ Frontend sends 'q', backend expects 'query'
    provider: str = Form("local"),
    hf_token: Optional[str] = Form(None),
    openai_key: Optional[str] = Form(None),
    ...
```

**❌ Issue**: Frontend sends `q` parameter, backend expects `query`.

---

## 📊 Backend API Inventory

### Available Endpoints (from routers/)

1. **Analytics Router**: `/analytics/*`
2. **Auth Router**: `/auth/*`
3. **Batch Router**: `/batch/*`
4. **Collections Router**: `/collections/*`
5. **Library Router**: `/library/*`
6. **Search Endpoints**: `/search`, `/search_video`
7. **File Management**: Various file ops
8. **Face Recognition**: `/faces/*`
9. **Trips**: `/trips/*`
10. **Videos**: `/videos/*`
11. **Workspace**: `/workspace/*`

### Missing from Frontend

The backend has many advanced features that the frontend v3 doesn't use:

- ❌ Collections management
- ❌ Face recognition
- ❌ Trip detection
- ❌ Advanced analytics
- ❌ Batch operations
- ❌ Video search
- ❌ Smart collections
- ❌ File management
- ❌ Workspace management

---

## 🔍 Research: Offline-First Photo Management Apps

### Best-in-Class Features

Based on research of leading offline photo management apps:

#### **Core Offline-First Principles**

1. **Local AI Processing**: All CLIP/vision models run on-device
2. **Intelligent Caching**: Smart prefetching of thumbnails and metadata
3. **Progressive Sync**: Graceful online/offline transitions
4. **Local Storage Management**: Efficient local database with automatic cleanup

#### **Must-Have Features**

1. **Smart Search**:

   - ✅ Semantic search (we have this)
   - ❌ Object detection (people, animals, objects)
   - ❌ Scene classification (beach, sunset, indoor)
   - ❌ Text recognition (OCR in photos)
   - ❌ Smart suggestions

2. **Organization**:

   - ❌ Automatic tagging
   - ❌ Smart albums (similar photos, events)
   - ❌ Timeline view with event detection
   - ❌ Duplicate detection
   - ❌ Storage optimization suggestions

3. **AI Enhancement**:

   - ❌ Auto-enhancement (exposure, colors)
   - ❌ Object removal/replacement
   - ❌ Style transfer
   - ❌ Upscaling/denoising
   - ❌ Portrait mode effects

4. **Workflow Features**:
   - ❌ Batch editing presets
   - ❌ Quick share collections
   - ❌ Export with metadata
   - ❌ Backup/restore system

#### **Could-Have Advanced Features**

1. **AI Magic**:

   - Content-aware fill
   - Sky replacement
   - Portrait relighting
   - Style transfer
   - Automatic composition suggestions

2. **Social/Sharing**:

   - Collaborative albums
   - Comments and annotations
   - Social media integration
   - Direct sharing links

3. **Professional Tools**:
   - RAW support
   - Color grading
   - Lens corrections
   - Professional metadata
   - Print layouts

---

## 🛠️ Model Integration Analysis

### Current Model Download System

**Electron App**: Has model download script (`scripts/download-models.js`) for:

- clip-vit-base-patch32.bin (~151MB)
- Config and tokenizer files
- SHA256 verification
- Progressive download with progress tracking

**Webapp**: Likely uses server-side models, needs verification.

### Recommended Integration Strategy

1. **Shared Model Storage**: Both webapp and Electron should use same model files
2. **Model Version Management**: Consistent versioning across apps
3. **Progressive Loading**: Download models on first use, cache locally
4. **Fallback Strategy**: Online API when local models unavailable

---

## 🎯 Immediate Action Items

### Priority 1: Fix Critical API Mismatches

1. **Fix Library Endpoint**:

   ```typescript
   // Change from POST to GET
   const response = await fetch(
     `${API_BASE}/library?dir=${encodeURIComponent(
       dir
     )}&provider=${provider}&limit=${limit}&offset=${offset}`
   );
   ```

2. **Fix Search Parameter**:

   ```typescript
   // Change 'q' to 'query'
   formData.append("query", query); // Instead of "q"
   ```

3. **Verify Missing Endpoints**: Check if analytics, workspaces, photo/thumbnail endpoints exist

### Priority 2: Feature Integration

1. **Analytics Integration**: Connect frontend analytics display to backend data
2. **Collections**: Implement full collections CRUD
3. **Face Recognition**: Add people/faces views
4. **Batch Operations**: Implement batch tagging, deletion, etc.

### Priority 3: Remove Dummy Data

Current webapp-v3 has hardcoded/dummy data in:

- ❌ Mock photo results
- ❌ Hardcoded analytics numbers
- ❌ Placeholder collections
- ❌ Test workspace data

---

## 📝 Recommendations

### Immediate (This Week)

1. Fix API mismatches to establish basic connectivity
2. Remove all dummy/hardcoded data
3. Implement proper error handling for API failures
4. Add loading states for all API calls

### Short-term (Next 2 Weeks)

1. Integrate all missing backend features into frontend
2. Implement model downloading/caching system
3. Add offline-first capabilities
4. Create comprehensive API client with proper TypeScript types

### Medium-term (Next Month)

1. Add advanced AI features (object detection, auto-tagging)
2. Implement smart collections and trip detection
3. Add batch operations and workflow features
4. Create unified model management between Electron and webapp

### Long-term (Next Quarter)

1. Add AI enhancement features (upscaling, denoising, object removal)
2. Implement professional tools and RAW support
3. Add social/sharing features
4. Create advanced analytics and insights

---

## 🏁 Success Metrics

- ✅ Zero API errors in frontend
- ✅ All backend features accessible from UI
- ✅ No dummy/hardcoded data
- ✅ Proper offline-first operation
- ✅ Model downloading works in both webapp and Electron
- ✅ Performance meets world-class standards (<250KB bundle)
- ✅ User experience rivals Apple Photos/Google Photos
