# Next Implementation Priorities - Detailed TODO List

*Date: October 5, 2025*
*Following: Disabled Features Implementation Completion*

## 🎯 **IMMEDIATE HIGH-PRIORITY TODOS**

Based on the comprehensive audit and remaining gaps identified, here are the next critical implementation tasks:

---

### **TODO 1: VLM MODEL CONFIGURATION - AI SETTINGS INTERFACE**

**Priority**: 🔴 **HIGH**
**Estimated Effort**: 4-6 hours
**Impact**: Major - Enables AI-powered photo analysis configuration
**File**: `src/components/modals/FolderModal.tsx:267`

#### **Current State**
```typescript
// Line 267: TODO comment
// TODO: VLM model setting implementation
```

#### **Implementation Requirements**
1. **UI Components Needed**
   - Model selection dropdown (GPT-4V, Claude-3, Gemini Vision, Local Models)
   - API key configuration fields (with secure input masking)
   - Model parameters configuration (temperature, max tokens, etc.)
   - Test connection button with status indicator
   - Performance/cost settings (quality vs speed trade-offs)

2. **Technical Implementation**
   ```typescript
   interface VLMConfig {
     provider: 'openai' | 'anthropic' | 'google' | 'local';
     model: string;
     apiKey?: string;
     apiEndpoint?: string;
     parameters: {
       temperature: number;
       maxTokens: number;
       confidence: number;
     };
     features: {
       objectDetection: boolean;
       sceneAnalysis: boolean;
       textExtraction: boolean;
       faceRecognition: boolean;
     };
   }
   ```

3. **Integration Points**
   - Connect to existing photo analysis services
   - Integrate with metadata extraction pipeline
   - Add to settings persistence layer
   - Wire to auto-curation engine

#### **Files to Modify**
- `src/components/modals/FolderModal.tsx` - Main implementation
- `src/services/VLMService.ts` - New service layer (create)
- `src/types/VLMConfig.ts` - Type definitions (create)
- `src/config/vlmProviders.ts` - Provider configurations (create)

#### **Acceptance Criteria**
- [ ] User can select VLM provider and model
- [ ] Secure API key storage and validation
- [ ] Test connection functionality works
- [ ] Configuration persists across sessions
- [ ] Integration with photo analysis pipeline
- [ ] Error handling for invalid configurations

---

### **TODO 2: COLLECTION PERSISTENCE - COVERS & THEMES**

**Priority**: 🔴 **HIGH**
**Estimated Effort**: 2-3 hours
**Impact**: Major - User customizations persist across sessions
**Files**: `src/components/Collections.tsx:336, 357`

#### **Current State**
```typescript
// Line 336: TODO comment
// TODO: Save cover selection to API/localStorage

// Line 357: TODO comment
// TODO: Save theme to API/localStorage
```

#### **Implementation Requirements**
1. **API Integration**
   ```typescript
   // New API endpoints needed
   await apiSetCollectionMeta(dir, engine, collectionName, {
     cover: coverIndex,
     theme: themeKey,
     lastModified: Date.now()
   });

   const meta = await apiGetCollectionMeta(dir, engine, collectionName);
   ```

2. **Local Storage Fallback**
   ```typescript
   interface CollectionMeta {
     covers: Record<string, number>;
     themes: Record<string, string>;
     lastSynced: number;
   }

   const saveToLocalStorage = (meta: CollectionMeta) => {
     localStorage.setItem(`collections_meta_${dir}`, JSON.stringify(meta));
   };
   ```

3. **State Synchronization**
   - Load saved settings on component mount
   - Sync changes immediately when user modifies
   - Handle conflicts between local and remote data
   - Provide offline functionality

#### **Files to Modify**
- `src/components/Collections.tsx` - Add persistence calls
- `src/api.ts` - Add collection metadata endpoints
- `src/services/CollectionMetaService.ts` - New service (create)
- `src/hooks/useCollectionMeta.ts` - Custom hook (create)

#### **Implementation Steps**
1. Create collection metadata API endpoints
2. Implement local storage fallback mechanism
3. Add loading logic to Collections component
4. Wire save calls to cover/theme selection handlers
5. Add conflict resolution for sync issues
6. Implement offline/online state management

#### **Acceptance Criteria**
- [ ] Cover selections persist across browser sessions
- [ ] Theme choices persist across browser sessions
- [ ] Works offline with local storage fallback
- [ ] Syncs with backend when available
- [ ] Handles conflicts gracefully
- [ ] Performance impact minimal

---

### **TODO 3: REAL GPS DATA INTEGRATION - ENHANCED MAP FUNCTIONALITY**

**Priority**: 🟡 **MEDIUM-HIGH**
**Estimated Effort**: 6-8 hours
**Impact**: Major - Replace sample data with real location intelligence
**Files**: `src/components/chrome/RoutesHost.tsx`, `src/services/GPSParser.ts` (new)

#### **Current State**
```typescript
// Sample location data in getLocationPoints()
const samplePoints = [
  { lat: 37.7749, lon: -122.4194 }, // San Francisco
  // ... more sample data
];
```

#### **Implementation Requirements**
1. **EXIF GPS Data Parser**
   ```typescript
   interface GPSData {
     latitude: number;
     longitude: number;
     altitude?: number;
     timestamp?: Date;
     accuracy?: number;
     address?: string;
   }

   class GPSParser {
     static async extractGPS(imagePath: string): Promise<GPSData | null>;
     static async batchExtractGPS(imagePaths: string[]): Promise<Map<string, GPSData>>;
     static async reverseGeocode(lat: number, lon: number): Promise<string>;
   }
   ```

2. **Photo Location Clustering**
   ```typescript
   interface LocationCluster {
     center: { lat: number; lon: number };
     photos: string[];
     radius: number;
     address: string;
     confidence: number;
   }

   class LocationClustering {
     static clusterByProximity(photos: Array<{path: string, gps: GPSData}>): LocationCluster[];
     static identifySignificantLocations(clusters: LocationCluster[]): LocationCluster[];
   }
   ```

3. **Enhanced Map Features**
   - Photo clustering by geographic proximity
   - Location-based search capabilities
   - Trip/journey detection
   - Heatmap visualization
   - Address resolution and display

#### **Files to Modify**
- `src/services/GPSParser.ts` - New GPS extraction service
- `src/services/LocationClustering.ts` - New clustering logic
- `src/components/chrome/RoutesHost.tsx` - Use real GPS data
- `src/components/MapView.tsx` - Enhanced features
- `src/hooks/useGPSData.ts` - Custom hook for GPS operations

#### **Implementation Steps**
1. Create EXIF GPS parsing service
2. Implement photo location clustering algorithm
3. Add reverse geocoding for address resolution
4. Update MapView to use real data
5. Add location-based search capabilities
6. Implement trip/journey detection
7. Add performance optimizations for large datasets

#### **Acceptance Criteria**
- [ ] Real GPS data extracted from photo EXIF
- [ ] Photos clustered by geographic proximity
- [ ] Address resolution for location display
- [ ] Performance optimized for large photo libraries
- [ ] Fallback handling for photos without GPS
- [ ] Location-based search functionality

---

### **TODO 4: SAVED SEARCH FUNCTIONALITY - COMPLETE WORKFLOW**

**Priority**: 🟡 **MEDIUM**
**Estimated Effort**: 4-5 hours
**Impact**: Medium - Complete search workflow functionality
**Files**: `src/components/SavedSearches.tsx:30, 33, 43`

#### **Current State**
```typescript
// Line 30: TODO: Navigate to search functionality
// Line 33: TODO: Show demo searches
// Line 43: TODO: Run sample search
```

#### **Implementation Requirements**
1. **Search Storage Service**
   ```typescript
   interface SavedSearch {
     id: string;
     name: string;
     query: string;
     tags: string[];
     createdAt: Date;
     lastUsed: Date;
     useCount: number;
     parameters: {
       topK?: number;
       engine?: string;
       filters?: SearchFilters;
     };
   }

   class SavedSearchService {
     static async saveSearch(search: Omit<SavedSearch, 'id' | 'createdAt'>): Promise<string>;
     static async loadSearches(): Promise<SavedSearch[]>;
     static async deleteSearch(id: string): Promise<void>;
     static async updateSearch(id: string, updates: Partial<SavedSearch>): Promise<void>;
   }
   ```

2. **Navigation Integration**
   ```typescript
   const handleNavigateToSearch = (savedSearch: SavedSearch) => {
     // Set search parameters
     setSearchText(savedSearch.query);
     if (savedSearch.parameters.filters) {
       applyFilters(savedSearch.parameters.filters);
     }

     // Navigate to results
     navigate('/search');

     // Execute search
     onSearch(savedSearch.query);

     // Update usage statistics
     SavedSearchService.updateSearch(savedSearch.id, {
       lastUsed: new Date(),
       useCount: savedSearch.useCount + 1
     });
   };
   ```

3. **Demo Search Implementation**
   ```typescript
   const demoSearches: SavedSearch[] = [
     {
       name: "Beach Vacation Photos",
       query: "beach OR ocean OR sand tag:vacation",
       tags: ["vacation", "beach", "ocean"],
       // ...
     },
     {
       name: "Family Gatherings",
       query: "person:family tag:gathering OR tag:birthday",
       tags: ["family", "gathering", "birthday"],
       // ...
     }
   ];
   ```

#### **Files to Modify**
- `src/components/SavedSearches.tsx` - Main implementation
- `src/services/SavedSearchService.ts` - New service layer
- `src/hooks/useSavedSearches.ts` - Custom hook
- `src/components/SearchBar.tsx` - Add save functionality
- `src/components/modals/AdvancedSearchModal.tsx` - Wire save button

#### **Implementation Steps**
1. Create SavedSearchService with local storage
2. Implement navigation to search functionality
3. Add demo searches for new users
4. Connect save functionality to SearchBar and AdvancedSearchModal
5. Add search usage analytics and recommendations
6. Implement search organization (folders, tags)

#### **Acceptance Criteria**
- [ ] Users can save searches with custom names
- [ ] Saved searches navigate to correct results
- [ ] Demo searches provide good examples
- [ ] Search usage tracked for recommendations
- [ ] Import/export functionality for searches
- [ ] Search organization and management

---

## 🟡 **MEDIUM PRIORITY TODOS**

### **TODO 5: CLOUD PROVIDER AUTHENTICATION**

**Priority**: 🟡 **MEDIUM**
**Estimated Effort**: 8-10 hours
**Impact**: High - Complete cloud backup functionality

#### **Implementation Requirements**
- OAuth flows for Google Drive, Dropbox
- AWS S3 credential configuration
- iCloud Drive integration (if possible)
- Secure credential storage
- Connection testing and validation
- Error handling and retry logic

#### **Files to Create**
- `src/services/CloudAuthService.ts`
- `src/components/modals/CloudAuthModal.tsx`
- `src/hooks/useCloudAuth.ts`
- `src/config/cloudProviders.ts`

---

### **TODO 6: ENHANCED AUTO-CURATION FEATURES**

**Priority**: 🟡 **MEDIUM**
**Estimated Effort**: 6-8 hours
**Impact**: Medium - AI-powered organization improvements

#### **Implementation Requirements**
- Smart collection name suggestions
- Automatic tagging based on content analysis
- Duplicate photo detection and removal
- Event timeline detection
- Face recognition integration
- Quality assessment automation

#### **Files to Modify**
- `src/services/AutoCurationEngine.ts`
- `src/components/AutoCurationPanel.tsx`
- `src/services/ContentAnalysisService.ts` (new)

---

### **TODO 7: PERFORMANCE OPTIMIZATIONS**

**Priority**: 🟡 **MEDIUM**
**Estimated Effort**: 4-6 hours
**Impact**: Medium - Better user experience

#### **Implementation Requirements**
- Implement photo grid virtualization
- Add lazy loading for large collections
- Optimize bundle size with code splitting
- Add service worker for offline functionality
- Implement progressive image loading
- Cache optimization for repeated operations

---

## 🟢 **LOW PRIORITY TODOS**

### **TODO 8: STORYBOOK INTEGRATION**

**Priority**: 🟢 **LOW**
**Estimated Effort**: 2-3 hours
**Impact**: Low - Development workflow improvement

#### **Files to Update**
- Uncomment existing `.stories.tsx` files
- Update story configurations for new components
- Add comprehensive component documentation
- Create interaction testing stories

---

### **TODO 9: ENHANCED ERROR HANDLING**

**Priority**: 🟢 **LOW**
**Estimated Effort**: 3-4 hours
**Impact**: Low - Better error recovery

#### **Implementation Requirements**
- Global error boundary implementation
- Retry mechanisms for failed operations
- Better user feedback for errors
- Error logging and analytics
- Graceful degradation strategies

---

### **TODO 10: ACCESSIBILITY IMPROVEMENTS**

**Priority**: 🟢 **LOW**
**Estimated Effort**: 2-3 hours
**Impact**: Low - Better accessibility support

#### **Implementation Requirements**
- Comprehensive keyboard navigation
- Screen reader optimizations
- High contrast mode support
- Focus management improvements
- ARIA label enhancements

---

## 📋 **IMPLEMENTATION ROADMAP**

### **Phase 1: Core Functionality (Weeks 1-2)**
1. ✅ Enhanced Search Suggestions (COMPLETED)
2. ✅ Collection Management (COMPLETED)
3. ✅ Auto-Curation Settings (COMPLETED)
4. TODO 1: VLM Model Configuration
5. TODO 2: Collection Persistence

### **Phase 2: Enhanced Features (Weeks 3-4)**
1. ✅ Advanced Search Modal (COMPLETED)
2. ✅ Cloud Backup Options (COMPLETED)
3. TODO 3: Real GPS Data Integration
4. TODO 4: Saved Search Functionality

### **Phase 3: Production Ready (Weeks 5-6)**
1. TODO 5: Cloud Provider Authentication
2. TODO 6: Enhanced Auto-Curation Features
3. TODO 7: Performance Optimizations

### **Phase 4: Polish & Quality (Week 7)**
1. TODO 8: Storybook Integration
2. TODO 9: Enhanced Error Handling
3. TODO 10: Accessibility Improvements

---

## 🎯 **SUCCESS METRICS**

### **Functional Metrics**
- [ ] All high-priority TODOs completed
- [ ] Zero placeholder "coming soon" messages
- [ ] Complete workflow functionality
- [ ] API integration coverage >95%

### **Quality Metrics**
- [ ] Test coverage >80% for new features
- [ ] Performance benchmarks met
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Zero critical bugs in production

### **User Experience Metrics**
- [ ] Reduced time to complete common tasks
- [ ] Increased feature discoverability
- [ ] Improved error recovery rates
- [ ] Higher user satisfaction scores

---

## 📞 **IMPLEMENTATION NOTES**

### **Dependencies**
- Some TODOs depend on backend API development
- Cloud authentication requires external API setup
- VLM integration needs AI service configuration
- GPS parsing may require additional libraries

### **Risk Factors**
- Performance impact of real GPS parsing
- Cloud provider API rate limits
- Storage limitations for large libraries
- Browser compatibility for advanced features

### **Recommended Approach**
1. Start with high-priority TODOs that don't require external dependencies
2. Implement backend API changes in parallel
3. Use feature flags for gradual rollout
4. Maintain backward compatibility throughout
5. Add comprehensive testing for each implementation

---

*This roadmap provides a comprehensive plan for completing all remaining functionality. Each TODO includes detailed implementation requirements, acceptance criteria, and integration points to ensure successful completion.*