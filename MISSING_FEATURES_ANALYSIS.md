# Missing Features Analysis - Photo Search Intent-First

Based on comprehensive code analysis, this document identifies the significant gaps between available backend APIs (47 endpoints) and frontend implementation.

## Executive Summary

**Current State**: Only 18/47 (38%) of backend features are integrated in the frontend.

**Major Missing Categories**:

- Collections & Organization: 9/9 endpoints missing
- Face Detection & People: 2/3 endpoints missing
- Analytics & Insights: Complete category missing
- Smart Features: OCR snippets, captions, similarity analysis
- File Management: Advanced operations missing

## Detailed Feature Gaps

### 1. Collections & Organization (100% Missing)

**Backend Available (9 endpoints)**:

- ✅ `/collections` (GET/POST) - Manual collections CRUD
- ✅ `/collections/delete` - Remove collections
- ✅ `/smart_collections` (GET/POST) - Rule-based collections
- ✅ `/smart_collections/delete` - Remove smart collections
- ✅ `/smart_collections/resolve` - Execute smart rules
- ✅ `/trips/build` - Auto-detect trips from metadata
- ✅ `/trips` - List detected trips

**Frontend Status**:

- ❌ No collections management UI
- ❌ No smart collections builder
- ❌ No trips visualization
- ❌ Basic `CollectionsManager.tsx` exists but not integrated

**API Functions Missing**:

```typescript
// Collections
apiGetCollections(dir: string) -> { collections: Record<string,string[]> }
apiSetCollection(dir: string, name: string, paths: string[])
apiDeleteCollection(dir: string, name: string)

// Smart Collections
apiGetSmart(dir: string) -> { smart: Record<string, {...}> }
apiSetSmart(dir: string, name: string, rules: {...})
apiDeleteSmart(dir: string, name: string)
apiResolveSmart(dir: string, name: string) -> { paths: string[] }

// Trips
apiTripsBuild(dir: string, provider: string) -> { trips: [...] }
apiTripsList(dir: string) -> { trips: [...] }
```

### 2. Face Detection & People (67% Missing)

**Backend Available (3 endpoints)**:

- ✅ `/faces/build` - InsightFace clustering
- ✅ `/faces/clusters` - Get face groups
- ✅ `/faces/name` - Assign names to clusters

**Frontend Status**:

- ✅ `apiFacesClusters` - Get face clusters (working)
- ❌ `apiBuildFaces` - Face detection trigger missing
- ❌ `apiFacesName` - Name assignment missing

**Components Exist But Incomplete**:

- `PeopleView.tsx` - Basic face display
- `FaceDetection.tsx` - Missing build integration
- `PeopleViewContainer.tsx` - Missing name management

### 3. Analytics & Insights (100% Missing)

**Backend Available**:

- ✅ `/analytics` - Search analytics
- ✅ `/analytics/event` - Event tracking
- ✅ `/attention/*` - Popularity, forgotten, seasonal

**Frontend Status**:

- ❌ No analytics dashboard
- ❌ No search statistics
- ❌ No usage insights
- ❌ Basic `apiAnalytics` exists but minimal UI

### 4. Advanced Search & AI (50% Missing)

**Backend Available**:

- ✅ `/search_like` - Find similar images
- ✅ `/search_like_plus` - Advanced similarity
- ✅ `/captions/build` - AI caption generation
- ✅ `/ocr/snippets` - OCR text extraction

**Frontend Status**:

- ❌ No similarity search UI
- ❌ No caption generation interface
- ❌ No OCR text search
- ✅ Basic search working

### 5. Image Operations & Editing (75% Missing)

**Backend Available**:

- ✅ `/editing/apply` - Crop, rotate, filters
- ✅ `/upscale` - AI upscaling
- ✅ `/open` - Open in external app

**Frontend Status**:

- ❌ No image editor UI
- ❌ No upscaling interface
- ❌ No external app integration
- ✅ Basic export working

### 6. File Management Advanced (60% Missing)

**Backend Available**:

- ✅ `/workspace/add` - Add directories
- ✅ `/workspace/remove` - Remove directories
- ✅ `/workspace/list` - List workspace folders
- ✅ `/file-management/move` - Move/organize files
- ✅ `/batch/*` - Batch operations

**Frontend Status**:

- ❌ No workspace management UI
- ❌ No file organization tools
- ❌ No batch operations interface
- ✅ Basic library browsing

### 7. Smart Features & Automation (80% Missing)

**Backend Available**:

- ✅ `/duplicates` - Find duplicates
- ✅ `/autotag` - Auto-tagging
- ✅ `/smart_collections/resolve` - Smart rules
- ✅ `/watch/start` - File system watching

**Frontend Status**:

- ❌ No duplicate detection UI
- ❌ No auto-tagging interface
- ❌ No smart rules builder
- ❌ No watch management

## Implementation Priority Matrix

### Phase 1: Essential Organization Features (Week 1)

**High Impact, Medium Effort**:

1. **Collections Management** - Manual collections CRUD
2. **Face Detection UI** - Complete face workflow
3. **Basic Analytics** - Search statistics dashboard

### Phase 2: Smart Features (Week 2)

**Medium Impact, Medium Effort**:

1. **Smart Collections** - Rule-based collections builder
2. **Trips Visualization** - Auto-detected trips with timeline
3. **OCR Text Search** - Text extraction and search

### Phase 3: Advanced Features (Week 3)

**High Impact, High Effort**:

1. **Image Editing** - Crop, rotate, filters interface
2. **Similarity Search** - Find similar/duplicate photos
3. **Advanced Analytics** - Comprehensive insights dashboard

### Phase 4: Automation & AI (Week 4)

**Medium Impact, High Effort**:

1. **AI Captions** - Automatic caption generation
2. **Auto-tagging** - Smart tag suggestions
3. **Duplicate Management** - Find and resolve duplicates

## Technical Implementation Notes

### API Integration Pattern

```typescript
// Standard API client pattern
export async function apiGetCollections(dir: string) {
  const r = await fetch(
    `${API_BASE}/collections?dir=${encodeURIComponent(dir)}`
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ collections: Record<string, string[]> }>;
}
```

### Component Architecture

```typescript
// View container pattern
export function CollectionsViewContainer() {
  const dir = useDir();
  const collections = useCollections();
  const actions = useCollectionActions();

  return (
    <CollectionsView
      dir={dir}
      collections={collections}
      onUpdate={actions.updateCollection}
      onDelete={actions.deleteCollection}
    />
  );
}
```

### State Management

- Use existing Zustand stores for data
- Add collection/face/trip state slices
- Implement optimistic updates for UX

## Resource Requirements

### Development Time Estimate

- **Phase 1**: 40 hours (Collections + Faces + Analytics basics)
- **Phase 2**: 50 hours (Smart features + Trips)
- **Phase 3**: 60 hours (Advanced features)
- **Phase 4**: 40 hours (AI automation)
- **Total**: ~190 hours (~5 weeks full-time)

### Technical Dependencies

- No new major dependencies required
- Leverage existing React + TypeScript stack
- Use current API client patterns
- Extend existing component architecture

## Success Metrics

### Integration Completion

- Target: 90% of backend endpoints integrated (42/47)
- Current: 38% (18/47)
- Gap: 24 missing integrations

### User Experience

- Complete workflow coverage for all major features
- No dead-end UI states
- Seamless navigation between features
- Responsive performance (<100ms UI updates)

## Next Steps

1. **Start with Collections Management** - Highest user value, clear API contract
2. **Complete Face Detection Workflow** - Build on existing foundation
3. **Add Basic Analytics Dashboard** - Leverage existing data
4. **Implement Smart Collections Builder** - Enable power-user workflows
5. **Add Trips Visualization** - Complete organization features

This analysis provides the roadmap for transforming the photo search app from a basic search tool to a comprehensive photo management platform with offline-first AI capabilities.
