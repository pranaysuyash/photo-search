# Search Enhancements Specification

## Product Manager Feedback Analysis

### Current User Satisfaction
**✅ Working Well:**
- NLP search feels "magical" for basic queries ("hiking in mountains", "dog in park")
- Semantic search with CLIP embeddings performs well
- Synonym expansion provides basic query enhancement

**🔍 Identified Gaps:**

## 1. Advanced Query Understanding

### Current Limitations
- **Single-shot queries**: No support for boolean operators or complex expressions
- **No negation**: Cannot exclude concepts ("beach NOT night")
- **Limited context**: No contextual awareness or query refinement
- **Basic synonyms**: Simple token replacement only

### Proposed Enhancements

#### A. Boolean Query Parser
```typescript
interface AdvancedQuery {
  original: string;
  tokens: QueryToken[];
  boolean: BooleanExpression;
  context: QueryContext;
}

type QueryToken = {
  text: string;
  type: 'keyword' | 'exclude' | 'include' | 'operator';
  weight?: number;
  synonyms?: string[];
};

type BooleanExpression = {
  type: 'AND' | 'OR' | 'NOT';
  operands: (BooleanExpression | QueryToken)[];
};
```

**Features:**
- Support for `AND`, `OR`, `NOT` operators
- Natural language parsing ("beaches without night photography")
- Query weighting and importance scoring
- Parenthetical expressions for complex logic

#### B. Context-Aware Search Enhancement
```typescript
interface QueryContext {
  timeContext?: 'day' | 'night' | 'sunset' | 'golden_hour';
  seasonContext?: 'spring' | 'summer' | 'fall' | 'winter';
  locationContext?: 'indoor' | 'outdoor' | 'urban' | 'nature';
  activityContext?: 'portrait' | 'landscape' | 'action' | 'still_life';
  qualityContext?: 'professional' | 'casual' | 'snapshot';
}
```

**Enhancements:**
- Automatic time detection from query ("sunset photos")
- Seasonal and weather inference
- Activity and subject type detection
- Quality level preference learning

#### C. Intelligent Query Expansion
```typescript
class AdvancedQueryExpander {
  expandQuery(query: string): ExpandedQuery {
    return {
      original: query,
      semanticVariations: this.getSemanticVariations(query),
      contextualFilters: this.getContextualFilters(query),
      booleanExpression: this.parseBooleanQuery(query),
      fallbackQueries: this.generateFallbacks(query)
    };
  }
}
```

**Features:**
- Multi-level semantic expansion
- Context-aware filter suggestions
- Automatic boolean query construction
- Smart fallback strategies

## 2. Multi-Folder Search UX Enhancement

### Current State Analysis
- **Technical**: Workspace system supports multiple folders
- **Problem**: Users find it confusing to search across folders
- **Goal**: Unified "All Photos" experience

### Proposed Enhancements

#### A. Unified Library Interface
```typescript
interface UnifiedLibrary {
  workspace: WorkspaceConfig;
  unifiedIndex: UnifiedIndex;
  searchScope: SearchScope;
}

type SearchScope =
  | { type: 'current_folder'; path: string }
  | { type: 'workspace'; workspaceId: string }
  | { type: 'all_photos'; includeAllWorkspaces: boolean };

interface WorkspaceConfig {
  id: string;
  name: string;
  folders: LibraryFolder[];
  searchMode: 'unified' | 'federated';
  autoInclude: boolean;
}
```

**Features:**
- Single "All Photos" view combining all workspaces
- Intelligent workspace management
- Cross-folder search with unified results
- Folder-based filtering within unified view

#### B. Smart Workspace Management
```typescript
class WorkspaceManager {
  // Auto-discover photo folders
  async discoverPhotoFolders(): Promise<LibraryFolder[]> {
    // Scan common photo directories
    // Analyze folder contents and photo counts
    // Suggest workspace configurations
  }

  // Intelligent workspace suggestions
  suggestWorkspaces(folders: LibraryFolder[]): WorkspaceSuggestion[] {
    // Group by time periods, events, locations
    // Suggest logical workspace configurations
    // Prevent overwhelming the user
  }
}
```

**Features:**
- Automatic photo folder discovery
- Intelligent workspace suggestions
- Usage-based workspace optimization
- Conflict resolution for overlapping folders

#### C. Enhanced Search UI
```typescript
interface EnhancedSearchInterface {
  scopeSelector: SearchScopeSelector;
  workspaceFilter: WorkspaceFilter;
  folderBreadcrumbs: FolderBreadcrumb[];
  resultSource: ResultSourceIndicator;
}
```

**Features:**
- Clear scope indication (current folder vs workspace vs all photos)
- Workspace-specific filtering within results
- Visual source indicators for each photo
- Seamless scope switching

## 3. Large Library Performance Optimization

### Current State Analysis
- **Available**: FAISS, Annoy, HNSW backends
- **Problem**: Not automatic, user must enable
- **Goal**: Seamless performance at any scale

### Proposed Enhancements

#### A. Automatic Performance Optimization
```typescript
class PerformanceOptimizer {
  analyzeLibraryPerformance(library: PhotoLibrary): PerformanceAssessment {
    const photoCount = library.getPhotoCount();
    const averageSearchTime = library.getAverageSearchTime();
    const indexSize = library.getIndexSize();

    return {
      needsOptimization: photoCount > PERFORMANCE_THRESHOLDS.LARGE_LIBRARY,
      recommendedBackend: this.selectOptimalBackend(photoCount, averageSearchTime),
      estimatedImprovement: this.estimatePerformanceGain(photoCount),
      optimizationPriority: this.calculatePriority(photoCount, averageSearchTime)
    };
  }

  selectOptimalBackend(photoCount: number, currentLatency: number): ANNBackend {
    if (photoCount < 5000) return 'brute_force';
    if (photoCount < 50000) return 'annoy';
    if (photoCount < 200000) return 'faiss';
    return 'hnsw'; // For very large libraries
  }

  autoOptimize(library: PhotoLibrary): Promise<OptimizationResult> {
    // Automatically build optimal index
    // Migrate existing data transparently
    // Monitor performance post-optimization
  }
}
```

**Performance Thresholds:**
```typescript
const PERFORMANCE_THRESHOLDS = {
  SMALL_LIBRARY: 5000,      // Brute force acceptable
  MEDIUM_LIBRARY: 50000,    // Consider Annoy
  LARGE_LIBRARY: 200000,    // Use FAISS
  VERY_LARGE_LIBRARY: 1000000, // Use HNSW
  MAX_SEARCH_LATENCY: 1000, // 1 second max
  OPTIMIZATION_TRIGGER: 2000 // Trigger optimization at 2 seconds
};
```

#### B. Progressive Indexing
```typescript
class ProgressiveIndexer {
  async buildProgressiveIndex(
    photos: Photo[],
    onProgress: (progress: IndexProgress) => void
  ): Promise<OptimizedIndex> {
    // Phase 1: Quick basic index (first 1000 photos)
    const basicIndex = await this.buildBasicIndex(photos.slice(0, 1000));
    onProgress({ phase: 'basic', complete: true, photoCount: 1000 });

    // Phase 2: Medium accuracy for common searches
    const mediumIndex = await this.buildMediumIndex(photos.slice(0, 10000));
    onProgress({ phase: 'medium', complete: true, photoCount: 10000 });

    // Phase 3: Full high-accuracy index
    const fullIndex = await this.buildFullIndex(photos);
    onProgress({ phase: 'full', complete: true, photoCount: photos.length });

    return { basicIndex, mediumIndex, fullIndex };
  }
}
```

**Features:**
- Phased indexing for immediate usability
- Progressive accuracy improvement
- Background processing with progress tracking
- Seamless index switching

#### C. Intelligent Caching Strategy
```typescript
class SearchCacheManager {
  private queryCache: LRUCache<string, CachedResults>;
  private embeddingCache: EmbeddingCache;
  private indexCache: IndexCache;

  async getCachedResults(query: SearchQuery): Promise<CachedResults | null> {
    // Check for exact query match
    // Check for semantic similar queries
    // Return cached results if valid
  }

  async cacheResults(query: SearchQuery, results: SearchResult[]): Promise<void> {
    // Cache with intelligent TTL
    // Store semantic query signature
    // Update cache statistics
  }
}
```

**Features:**
- Multi-level caching (query, embedding, index)
- Semantic cache invalidation
- Adaptive cache sizing
- Performance monitoring

## 4. Implementation Roadmap

### Phase 1: Query Understanding Enhancement (4-6 weeks)
1. **Boolean Query Parser**: 2 weeks
2. **Context-Aware Expansion**: 2 weeks
3. **Advanced Search UI**: 1-2 weeks
4. **Testing & Refinement**: 1 week

### Phase 2: Multi-Folder UX Enhancement (3-4 weeks)
1. **Unified Library Interface**: 2 weeks
2. **Workspace Management**: 1 week
3. **Enhanced Search UI Integration**: 1 week

### Phase 3: Performance Optimization (4-5 weeks)
1. **Automatic Performance Detection**: 1 week
2. **Progressive Indexing**: 2 weeks
3. **Intelligent Caching**: 1-2 weeks

## 5. Success Metrics

### Query Understanding
- **Success Rate**: 90% of complex queries handled correctly
- **Query Refinement**: 50% reduction in query refinement attempts
- **User Satisfaction**: 4.5/5 stars for advanced search features

### Multi-Folder Search
- **Adoption Rate**: 80% of users with multiple folders use unified search
- **Discoverability**: 90% of users find workspace features intuitive
- **Performance**: <500ms response time for cross-folder searches

### Large Library Performance
- **Performance**: <1s search time for 100K+ photo libraries
- **Optimization**: 95% automatic optimization rate
- **User Satisfaction**: 4.0/5 stars for large library performance

## 6. Technical Considerations

### Dependencies
- **NLP Libraries**: Consider spaCy or similar for advanced parsing
- **Index Backends**: Ensure FAISS/Annoy/HNSW are properly bundled
- **Caching**: Redis or similar for large-scale deployments
- **Monitoring**: Performance metrics collection and alerting

### Backward Compatibility
- Maintain existing simple search interface
- Gradual rollout of advanced features
- Feature flags for experimental capabilities
- Migration path for existing indexes

### Performance Impact
- Monitor memory usage with multiple ANN backends
- Profile indexing performance on large libraries
- Optimize cold-start performance
- Consider resource constraints for mobile deployment

---

*Specification Date: September 29, 2025*
*Priority: High - Direct user feedback driven*
*Estimate: 11-15 weeks total implementation*