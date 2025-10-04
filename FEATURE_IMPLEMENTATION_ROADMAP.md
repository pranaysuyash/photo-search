# Feature Implementation Roadmap - Photo Search Intent-First

## Executive Summary

**Current Status**: ✅ Electron app successfully launching with Python backend integration, CLIP models downloaded, and API endpoints functional

**Implementation Target**: Transform from basic search tool (38% API coverage) to comprehensive offline-first photo management platform (90%+ coverage)

**Priority**: Focus on Collections, Faces, and Trips as these provide the highest user value for photo organization

## Verified Technical Foundation

### ✅ Working Infrastructure

- **Electron App**: Successfully launching with Python backend on port 8000
- **CLIP Models**: Downloaded to Application Support (`clip-vit-b-32`, `clip-vit-base-patch32`)
- **API Health**: All endpoints responding with 200 OK status
- **File Protocol**: Direct photo access via `file://` protocol working
- **Virtual Environment**: Python 3.12 with all dependencies installed (aiosqlite, etc.)

### ⚠️ Minor Issues (Non-blocking)

- IPC warning: Duplicate handler registration (cosmetic only)
- Port conflicts during service restarts (development-only issue)

## Implementation Phases

### Phase 1: Essential Organization Features (Week 1)

**Priority**: High Impact, Medium Effort - Complete core photo organization

#### 1.1 Collections Management (Priority 1)

**Backend Available**: ✅ 7 endpoints ready

```typescript
// API endpoints to implement
apiGetCollections(dir: string) -> { collections: Record<string,string[]> }
apiSetCollection(dir: string, name: string, paths: string[])
apiDeleteCollection(dir: string, name: string)
```

**Frontend Tasks**:

- Create `CollectionsViewContainer.tsx` (wrapper for existing `CollectionsManager.tsx`)
- Add collections state to Zustand stores
- Implement drag-and-drop photo assignment
- Add collection CRUD UI with confirmation dialogs

**Acceptance Criteria**:

- Create collections by selecting photos
- View collection contents in grid layout
- Delete collections with confirmation
- Rename collections inline

#### 1.2 Complete Face Detection Workflow (Priority 2)

**Backend Available**: ✅ 3 endpoints, 1 working, 2 missing

```typescript
// Missing frontend integration
apiBuildFaces(dir: string, provider: string) -> { clusters: [...] }
apiFacesName(clusterId: string, name: string) -> { ok: boolean }
```

**Frontend Tasks**:

- Add "Build Face Index" button to `PeopleView.tsx`
- Implement face cluster naming UI
- Add face-based photo filtering
- Progress indicators for face detection

**Acceptance Criteria**:

- Trigger face detection from UI
- Name face clusters and search by person name
- View all photos of a specific person
- Progress feedback during face building

#### 1.3 Basic Analytics Dashboard (Priority 3)

**Backend Available**: ✅ Analytics endpoints exist but unused

```typescript
apiAnalytics(dir: string, limit: number) -> { events: [...] }
```

**Frontend Tasks**:

- Create `AnalyticsViewContainer.tsx`
- Add search statistics display
- Show recent activity feed
- Basic usage metrics

**Acceptance Criteria**:

- View search history and frequency
- See recent photo activity
- Display library statistics (count, size, etc.)

### Phase 2: Smart Features (Week 2)

**Priority**: Medium Impact, Medium Effort - Enable power-user workflows

#### 2.1 Smart Collections Builder (Priority 4)

**Backend Available**: ✅ Smart collections endpoints ready

```typescript
apiSetSmart(dir: string, name: string, rules: {...}) -> { ok: boolean }
apiResolveSmart(dir: string, name: string) -> { paths: string[] }
```

**Frontend Tasks**:

- Create rule builder UI with dropdowns
- Add rule preview functionality
- Smart collection auto-refresh
- Template smart collections (Recent, Favorites, etc.)

**Acceptance Criteria**:

- Create rules like "Photos from last month with people"
- Preview rule results before saving
- Auto-updating collections based on rules

#### 2.2 Trips Visualization (Priority 5)

**Backend Available**: ✅ Trips detection and listing

```typescript
apiTripsBuild(dir: string, provider: string) -> { trips: [...] }
apiTripsList(dir: string) -> { trips: [...] }
```

**Frontend Tasks**:

- Create `TripsViewContainer.tsx`
- Add timeline visualization for trips
- Map integration for trip locations
- Trip-based photo browsing

**Acceptance Criteria**:

- Auto-detect trips from photo metadata
- View trips on timeline
- Browse photos by trip
- Show trip locations on map

#### 2.3 OCR Text Search (Priority 6)

**Backend Available**: ✅ OCR building, missing snippets

```typescript
apiOcrSnippets(dir: string, query: string) -> { results: [...] }
```

**Frontend Tasks**:

- Add text search mode to search bar
- Highlight text in images
- Text snippet extraction UI
- Search within extracted text

**Acceptance Criteria**:

- Search for text found in images
- View extracted text from photos
- Highlight matching text regions

### Phase 3: Advanced Features (Week 3)

**Priority**: High Impact, High Effort - Professional photo management

#### 3.1 Image Editing Interface (Priority 7)

**Backend Available**: ✅ Edit operations endpoint

```typescript
apiEditOps(path: string, ops: {rotate?, crop?, filters?}) -> { ok: boolean }
```

**Frontend Tasks**:

- Create image editor modal/view
- Crop, rotate, filter controls
- Preview before apply
- Undo/redo editing history

**Acceptance Criteria**:

- Crop photos with draggable handles
- Rotate images and save changes
- Apply basic filters (brightness, contrast)
- Non-destructive editing with undo

#### 3.2 Similarity Search & Duplicates (Priority 8)

**Backend Available**: ✅ Similarity and duplicate detection

```typescript
apiSearchLike(dir: string, path: string, provider: string) -> { results: [...] }
apiLookalikes(dir: string) -> { groups: [...] }
```

**Frontend Tasks**:

- "Find Similar" button on photo details
- Duplicate detection results view
- Merge/delete duplicate workflow
- Visual similarity scoring

**Acceptance Criteria**:

- Find visually similar photos
- Detect and resolve duplicates
- Batch operations on similar photos

#### 3.3 Advanced Analytics (Priority 9)

**Backend Available**: ✅ Comprehensive analytics endpoints

```typescript
// Attention endpoints for insights
apiAttentionPopularity(dir: string) -> { popular: [...] }
apiAttentionForgotten(dir: string) -> { forgotten: [...] }
```

**Frontend Tasks**:

- Comprehensive analytics dashboard
- Photo popularity insights
- Storage usage analysis
- Performance metrics

**Acceptance Criteria**:

- View most/least viewed photos
- Storage usage breakdown
- Search performance analytics

### Phase 4: AI Automation (Week 4)

**Priority**: Medium Impact, High Effort - Intelligent features

#### 4.1 AI Caption Generation (Priority 10)

**Backend Available**: ✅ Caption building endpoint

```typescript
apiBuildCaptions(dir: string, provider: string) -> { captions: {...} }
```

**Frontend Tasks**:

- Caption generation UI
- Manual caption editing
- Caption-based search
- Batch caption generation

**Acceptance Criteria**:

- Generate captions for photos
- Search using generated captions
- Edit and approve AI captions

#### 4.2 Auto-tagging System (Priority 11)

**Backend Available**: ✅ Auto-tagging endpoint

```typescript
apiAutotag(dir: string, provider: string) -> { tags: {...} }
```

**Frontend Tasks**:

- Auto-tag trigger UI
- Tag suggestion system
- Batch tag approval
- Tag-based filtering

**Acceptance Criteria**:

- Automatically suggest tags for photos
- Batch approve/reject tag suggestions
- Filter photos by auto-generated tags

#### 4.3 Duplicate Management (Priority 12)

**Backend Available**: ✅ Duplicate resolution

```typescript
apiResolveLookalike(dir: string, action: string, paths: string[]) -> { ok: boolean }
```

**Frontend Tasks**:

- Duplicate review interface
- Side-by-side comparison
- Batch duplicate resolution
- Safe deletion workflow

**Acceptance Criteria**:

- Review detected duplicates
- Compare photos side-by-side
- Safely delete duplicates with confirmation

## Implementation Strategy

### Development Approach

1. **Incremental Integration**: Add one feature at a time to existing UI
2. **Existing Components**: Leverage current `PeopleView.tsx`, `CollectionsManager.tsx`, etc.
3. **State Management**: Extend Zustand stores for new data types
4. **API Pattern**: Follow existing `api.ts` client pattern

### Code Architecture

```typescript
// View Container Pattern
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

// State Management Extension
interface AppState {
  collections: Record<string, string[]>;
  smartCollections: Record<string, SmartRule>;
  trips: Trip[];
  faceClusters: FaceCluster[];
  // ... existing state
}
```

### Quality Assurance

- **Testing**: Unit tests for each new component
- **API Integration**: Test all endpoint integrations
- **Performance**: Ensure <100ms UI response times
- **Accessibility**: WCAG 2.1 AA compliance

## Success Metrics

### Integration Targets

- **Phase 1**: 55% API coverage (26/47 endpoints)
- **Phase 2**: 70% API coverage (33/47 endpoints)
- **Phase 3**: 85% API coverage (40/47 endpoints)
- **Phase 4**: 90% API coverage (42/47 endpoints)

### User Experience Goals

- Complete workflow coverage for all major photo management tasks
- No dead-end UI states or missing functionality
- Seamless navigation between organization features
- Professional-grade photo management capabilities

### Technical Objectives

- Maintain <250kB gzipped bundle size
- 60fps interactions and smooth animations
- Offline-first functionality with local AI processing
- Cross-platform compatibility (macOS, Windows, Linux)

## Next Immediate Steps

### This Week (Phase 1 Start)

1. **Collections Management** - Highest ROI, clear API contract
2. **Face Detection UI** - Build on existing `PeopleView.tsx` foundation
3. **Basic Analytics** - Quick win using existing data

### Development Setup

```bash
# Activate environment
cd photo-search-intent-first && source .venv/bin/activate

# Start backend (API server)
python api/server.py

# Start frontend (in new terminal)
npm --prefix webapp run dev

# Or run Electron app
npm --prefix electron run dev
```

### Resource Requirements

- **Total Effort**: ~190 hours (5 weeks full-time)
- **Phase 1**: 40 hours (Collections + Faces + Analytics)
- **Dependencies**: No new major libraries required
- **Skills**: React/TypeScript, FastAPI integration, Zustand state management

This roadmap transforms the photo search app from a basic search tool to a comprehensive, offline-first photo management platform with local AI capabilities, competing with professional photo management software while maintaining the privacy and performance advantages of local processing.
