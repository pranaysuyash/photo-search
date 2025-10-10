# API Endpoint Mapping - Frontend V3

**Last Updated**: 2025-10-10  
**Status**: 🔄 In Progress

## Overview

This document maps all backend API endpoints to their frontend integration status in webapp-v3. The backend has **25 routers** with 100+ endpoints total.

## Integration Status Legend

- ✅ **Integrated**: Fully implemented and tested in V3
- 🔄 **Partial**: Some endpoints used, others missing
- ❌ **Missing**: Not integrated yet
- 🚫 **Not Needed**: Backend feature not required in V3
- 📝 **Planned**: Documented for future implementation

---

## Core Routers (Priority 1)

### 1. Library Router (`/library`)

**Status**: ✅ Integrated  
**Priority**: Critical - Core functionality

| Endpoint   | Method | Status | Frontend Implementation                   |
| ---------- | ------ | ------ | ----------------------------------------- |
| `/library` | GET    | ✅     | `api.getLibrary()` - Used in Library page |

**Notes**:

- Query params: `dir` (required)
- Returns photo list with thumbnails
- **VERIFIED**: Uses GET with query params (correct) ✅

---

### 2. Search Router (via API V1)

**Status**: ✅ Integrated  
**Priority**: Critical - Core functionality

| Endpoint         | Method | Status | Frontend Implementation              |
| ---------------- | ------ | ------ | ------------------------------------ |
| `/api/v1/search` | POST   | ✅     | `api.search()` - Used in Search page |

**Notes**:

- JSON body: `{ query: string, dir: string, ... }`
- Returns SearchResponse with results array
- **VERIFIED**: Uses POST with JSON body (correct) ✅

---

### 3. Indexing Router (`/indexing`)

**Status**: 🔄 Partial  
**Priority**: Critical - Core functionality

| Endpoint           | Method | Status | Frontend Implementation                   |
| ------------------ | ------ | ------ | ----------------------------------------- |
| `/indexing/build`  | POST   | ✅     | `api.buildIndex()` - Used in Library page |
| `/indexing/status` | GET    | ❌     | Not implemented                           |
| `/indexing/cancel` | POST   | ❌     | Not implemented                           |
| `/indexing/update` | POST   | ❌     | Not implemented                           |

**Integration Needed**:

```typescript
// Add to api.ts
export async function getIndexStatus(dir: string): Promise<IndexStatus> {
  const res = await fetch(
    `${API_BASE}/indexing/status?dir=${encodeURIComponent(dir)}`
  );
  return handleResponse(res);
}

export async function cancelIndexing(dir: string): Promise<void> {
  const res = await fetch(`${API_BASE}/indexing/cancel`, {
    method: "POST",
    body: JSON.stringify({ dir }),
  });
  return handleResponse(res);
}
```

---

### 4. Collections Router (`/collections`)

**Status**: ❌ Missing  
**Priority**: High - Key feature

| Endpoint                              | Method | Status | Frontend Implementation |
| ------------------------------------- | ------ | ------ | ----------------------- |
| `/collections`                        | GET    | ❌     | Not implemented         |
| `/collections`                        | POST   | ❌     | Not implemented         |
| `/collections/{id}`                   | GET    | ❌     | Not implemented         |
| `/collections/{id}`                   | PUT    | ❌     | Not implemented         |
| `/collections/{id}`                   | DELETE | ❌     | Not implemented         |
| `/collections/{id}/photos`            | POST   | ❌     | Add photo to collection |
| `/collections/{id}/photos/{photo_id}` | DELETE | ❌     | Remove photo            |

**Integration Plan**:

1. Create `useCollections` hook
2. Add Collections page/modal
3. Implement CRUD operations
4. Add photo picker UI

---

### 5. Favorites Router (`/favorites`)

**Status**: ❌ Missing  
**Priority**: High - Key feature

| Endpoint            | Method | Status | Frontend Implementation |
| ------------------- | ------ | ------ | ----------------------- |
| `/favorites`        | GET    | ❌     | Not implemented         |
| `/favorites/toggle` | POST   | ❌     | Not implemented         |
| `/favorites/batch`  | POST   | ❌     | Not implemented         |

**Integration Plan**:

```typescript
// Add to api.ts
export async function getFavorites(dir: string): Promise<string[]> {
  const res = await fetch(
    `${API_BASE}/favorites?dir=${encodeURIComponent(dir)}`
  );
  return handleResponse(res);
}

export async function toggleFavorite(
  dir: string,
  photoPath: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites/toggle`, {
    method: "POST",
    body: JSON.stringify({ dir, photo_path: photoPath }),
  });
  return handleResponse(res);
}
```

---

### 6. Tagging Router (`/tagging`)

**Status**: ❌ Missing  
**Priority**: High - Key feature

| Endpoint              | Method | Status | Frontend Implementation |
| --------------------- | ------ | ------ | ----------------------- |
| `/tagging/tags`       | GET    | ❌     | Get all tags            |
| `/tagging/tags`       | POST   | ❌     | Create tag              |
| `/tagging/tags/{tag}` | DELETE | ❌     | Delete tag              |
| `/tagging/photo/tags` | POST   | ❌     | Add tags to photo       |
| `/tagging/photo/tags` | DELETE | ❌     | Remove tags from photo  |
| `/tagging/search`     | GET    | ❌     | Search by tags          |

---

## Advanced Features (Priority 2)

### 7. Faces Router (`/faces`)

**Status**: ❌ Missing  
**Priority**: Medium - Advanced feature

| Endpoint                    | Method | Status | Frontend Implementation     |
| --------------------------- | ------ | ------ | --------------------------- |
| `/faces/clusters`           | GET    | ❌     | Get face clusters           |
| `/faces/photos`             | GET    | ❌     | Get photos with faces       |
| `/faces/cluster/{id}`       | GET    | ❌     | Get specific cluster        |
| `/faces/cluster/{id}/label` | POST   | ❌     | Label cluster (name person) |

**Feature Description**:

- Face recognition and clustering
- Person identification
- Face-based photo search

---

### 8. Smart Collections Router (`/smart_collections`)

**Status**: ❌ Missing  
**Priority**: Medium - Advanced feature

| Endpoint                           | Method | Status | Frontend Implementation |
| ---------------------------------- | ------ | ------ | ----------------------- |
| `/smart_collections`               | GET    | ❌     | List smart collections  |
| `/smart_collections`               | POST   | ❌     | Create smart collection |
| `/smart_collections/{id}`          | GET    | ❌     | Get specific collection |
| `/smart_collections/{id}`          | PUT    | ❌     | Update rules            |
| `/smart_collections/{id}/evaluate` | POST   | ❌     | Re-evaluate matches     |

**Feature Description**:

- Dynamic collections based on rules
- Auto-updating based on criteria
- Examples: "Recent sunsets", "Photos with John", "High-quality portraits"

---

### 9. Trips Router (`/trips`)

**Status**: ❌ Missing  
**Priority**: Medium - Advanced feature

| Endpoint       | Method | Status | Frontend Implementation |
| -------------- | ------ | ------ | ----------------------- |
| `/trips`       | GET    | ❌     | List all trips          |
| `/trips/build` | POST   | ❌     | Auto-generate trips     |
| `/trips/{id}`  | GET    | ❌     | Get trip details        |
| `/trips/{id}`  | PUT    | ❌     | Update trip             |

**Feature Description**:

- Automatic trip detection from dates/locations
- Timeline view of photos
- Travel memories organization

---

### 10. Videos Router (`/videos`)

**Status**: ❌ Missing  
**Priority**: Medium - Advanced feature

| Endpoint            | Method | Status | Frontend Implementation |
| ------------------- | ------ | ------ | ----------------------- |
| `/videos`           | GET    | ❌     | List videos             |
| `/videos/thumbnail` | GET    | ❌     | Get video thumbnail     |
| `/videos/metadata`  | GET    | ❌     | Get video info          |
| `/videos/search`    | POST   | ❌     | Search videos           |

---

### 11. OCR Router (`/ocr`)

**Status**: ❌ Missing  
**Priority**: Low - Nice to have

| Endpoint       | Method | Status | Frontend Implementation |
| -------------- | ------ | ------ | ----------------------- |
| `/ocr/extract` | POST   | ❌     | Extract text from photo |
| `/ocr/search`  | POST   | ❌     | Search photos by text   |

---

## Utility Routers (Priority 3)

### 12. Metadata Router (`/metadata`)

**Status**: ❌ Missing  
**Priority**: Medium

| Endpoint          | Method | Status | Frontend Implementation  |
| ----------------- | ------ | ------ | ------------------------ |
| `/metadata`       | GET    | ❌     | Get photo EXIF           |
| `/metadata/batch` | POST   | ❌     | Get multiple photos EXIF |

---

### 13. Saved Router (`/saved`)

**Status**: ❌ Missing  
**Priority**: Medium

| Endpoint               | Method | Status | Frontend Implementation |
| ---------------------- | ------ | ------ | ----------------------- |
| `/saved/searches`      | GET    | ❌     | Get saved searches      |
| `/saved/searches`      | POST   | ❌     | Save search             |
| `/saved/searches/{id}` | DELETE | ❌     | Delete saved search     |

---

### 14. Analytics Router (`/analytics`)

**Status**: ❌ Missing  
**Priority**: Low

| Endpoint              | Method | Status | Frontend Implementation |
| --------------------- | ------ | ------ | ----------------------- |
| `/analytics/searches` | GET    | ❌     | Get search history      |
| `/analytics/popular`  | GET    | ❌     | Get popular searches    |

---

### 15. Diagnostics Router (`/diagnostics`)

**Status**: ❌ Missing  
**Priority**: Low - Dev tool

| Endpoint              | Method | Status | Frontend Implementation |
| --------------------- | ------ | ------ | ----------------------- |
| `/diagnostics/status` | GET    | ❌     | System status           |
| `/diagnostics/logs`   | GET    | ❌     | Get logs                |
| `/diagnostics/export` | POST   | ❌     | Export diagnostics      |

---

### 16. Config Router (`/config`)

**Status**: ❌ Missing  
**Priority**: Medium

| Endpoint  | Method | Status | Frontend Implementation |
| --------- | ------ | ------ | ----------------------- |
| `/config` | GET    | ❌     | Get app config          |
| `/config` | PUT    | ❌     | Update config           |

---

### 17. Models Router (`/models`)

**Status**: ❌ Missing  
**Priority**: Low

| Endpoint           | Method | Status | Frontend Implementation  |
| ------------------ | ------ | ------ | ------------------------ |
| `/models/status`   | GET    | ❌     | Check model availability |
| `/models/download` | POST   | ❌     | Download models          |

---

### 18. Auth Router (`/auth`)

**Status**: 🔄 Partial  
**Priority**: High - Security

| Endpoint       | Method | Status | Frontend Implementation |
| -------------- | ------ | ------ | ----------------------- |
| `/auth/status` | GET    | ❌     | Check if auth required  |
| `/auth/login`  | POST   | ❌     | Login                   |
| `/auth/verify` | POST   | ❌     | Verify token            |

---

### 19. Share Router (`/share`)

**Status**: ❌ Missing  
**Priority**: Low

| Endpoint         | Method | Status | Frontend Implementation |
| ---------------- | ------ | ------ | ----------------------- |
| `/share`         | POST   | ❌     | Create share link       |
| `/share/{token}` | GET    | ❌     | Get shared content      |

---

### 20. Editing Router (`/editing`)

**Status**: ❌ Missing  
**Priority**: Low - Future feature

| Endpoint           | Method | Status | Frontend Implementation |
| ------------------ | ------ | ------ | ----------------------- |
| `/editing/crop`    | POST   | ❌     | Crop photo              |
| `/editing/rotate`  | POST   | ❌     | Rotate photo            |
| `/editing/enhance` | POST   | ❌     | Auto-enhance            |

---

### 21. Batch Router (`/batch`)

**Status**: ❌ Missing  
**Priority**: Medium

| Endpoint          | Method | Status | Frontend Implementation |
| ----------------- | ------ | ------ | ----------------------- |
| `/batch/tag`      | POST   | ❌     | Batch tag photos        |
| `/batch/favorite` | POST   | ❌     | Batch favorite          |
| `/batch/delete`   | POST   | ❌     | Batch delete            |

---

### 22. File Management Router (`/file_management`)

**Status**: ❌ Missing  
**Priority**: Low

| Endpoint                  | Method | Status | Frontend Implementation |
| ------------------------- | ------ | ------ | ----------------------- |
| `/file_management/export` | POST   | ❌     | Export photos           |
| `/file_management/import` | POST   | ❌     | Import photos           |

---

### 23. Workspace Router (`/workspace`)

**Status**: ❌ Missing  
**Priority**: High - Multi-library support

| Endpoint          | Method | Status | Frontend Implementation |
| ----------------- | ------ | ------ | ----------------------- |
| `/workspace`      | GET    | ❌     | List all workspaces     |
| `/workspace`      | POST   | ❌     | Add workspace           |
| `/workspace/{id}` | DELETE | ❌     | Remove workspace        |

---

### 24. Captions Router (`/captions`)

**Status**: ❌ Missing  
**Priority**: Low - AI feature

| Endpoint             | Method | Status | Frontend Implementation |
| -------------------- | ------ | ------ | ----------------------- |
| `/captions/generate` | POST   | ❌     | Auto-generate caption   |

---

### 25. Discovery Router (`/discovery`)

**Status**: ❌ Missing  
**Priority**: Low - AI feature

| Endpoint                | Method | Status | Frontend Implementation |
| ----------------------- | ------ | ------ | ----------------------- |
| `/discovery/similar`    | POST   | ❌     | Find similar photos     |
| `/discovery/duplicates` | GET    | ❌     | Find duplicates         |

---

### 26. Auto Curation Router (`/auto_curation`)

**Status**: ❌ Missing  
**Priority**: Low - AI feature

| Endpoint                     | Method | Status | Frontend Implementation  |
| ---------------------------- | ------ | ------ | ------------------------ |
| `/auto_curation/best`        | GET    | ❌     | Get best photos          |
| `/auto_curation/suggestions` | GET    | ❌     | Get curation suggestions |

---

### 27. Fast Index Router (`/fast`)

**Status**: ❌ Missing  
**Priority**: Medium - Performance

| Endpoint       | Method | Status | Frontend Implementation |
| -------------- | ------ | ------ | ----------------------- |
| `/fast/build`  | POST   | ❌     | Build ANN index         |
| `/fast/status` | GET    | ❌     | Check ANN status        |

---

### 28. Watch Router (`/watch`)

**Status**: ❌ Missing  
**Priority**: Low

| Endpoint       | Method | Status | Frontend Implementation  |
| -------------- | ------ | ------ | ------------------------ |
| `/watch/start` | POST   | ❌     | Start watching directory |
| `/watch/stop`  | POST   | ❌     | Stop watching            |

---

### 29. Utilities Router (`/utilities`)

**Status**: ❌ Missing  
**Priority**: Low

| Endpoint             | Method | Status | Frontend Implementation |
| -------------------- | ------ | ------ | ----------------------- |
| `/utilities/health`  | GET    | ❌     | Health check            |
| `/utilities/version` | GET    | ❌     | Get version             |

---

### 30. Admin Router (`/admin`)

**Status**: 🚫 Not Needed  
**Priority**: N/A - Backend only

---

## Summary Statistics

### Integration Status

- ✅ **Fully Integrated**: 2 routers (8%)
- 🔄 **Partially Integrated**: 2 routers (8%)
- ❌ **Not Integrated**: 21 routers (84%)
- 🚫 **Not Needed**: 1 router

### Priority Breakdown

- **Priority 1 (Critical)**: 6 routers - 3 done, 3 to do
- **Priority 2 (High)**: 8 routers - 0 done, 8 to do
- **Priority 3 (Medium)**: 10 routers - 0 done, 10 to do
- **Priority 4 (Low)**: 7 routers - can defer

### Estimated Effort

- **Phase 1 Completion**: ~2-3 days (finish Priority 1)
- **Phase 2 Completion**: ~3-4 days (Priority 2 features)
- **Full Integration**: ~8-10 days (all priorities)

---

## Next Steps

### Immediate (Today)

1. ✅ Fix library endpoint (already done)
2. ✅ Fix search endpoint (already done)
3. ⏳ Add indexing status polling
4. ⏳ Implement favorites toggle
5. ⏳ Add collections CRUD

### This Week

1. Complete all Priority 1 routers
2. Design UI for collections/tags/favorites
3. Implement face recognition browsing
4. Add smart collections
5. Create comprehensive error handling

### Questions for Product Team

1. Which Priority 2/3 features are must-have for V3 launch?
2. Should we defer AI features (captions, curation) to V4?
3. Do we need all editing features or just basic ones?
4. Is multi-workspace support required for launch?

---

**Notes**:

- This document will be updated as integration progresses
- Each router will get detailed TypeScript interfaces
- Testing checklist will be created per router
- Error handling patterns will be standardized
