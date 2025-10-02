# World-Class Photo App Frontend - Complete Rebuild Plan

## 🎯 Vision: Build a Billion-Dollar App Experience

Create a parallel frontend (`webapp-v2/`) that rivals the best photo management apps in the world (Apple Photos, Google Photos, Lightroom) with modern aesthetics, flawless UX, complete feature coverage, and infinite extensibility.

---

## 📊 Current Frontend Analysis

### Existing Features Inventory

**Core Views** (11 views):
- ✅ Results/Search - AI-powered search results
- ✅ Library - Full photo library browse
- ✅ People - Face detection & clustering
- ✅ Map - Geo-location view
- ✅ Collections - User collections
- ✅ Smart Collections - Dynamic collections
- ✅ Trips - Auto-detected trips
- ✅ Saved - Saved searches
- ✅ Memories - Photo memories
- ✅ Tasks - Background tasks
- ✅ Videos - Video management

**Key Features**:
- AI semantic search (CLIP, text, hybrid)
- Advanced filters (metadata, location, time, tags, faces)
- Photo editing (crop, rotate, filters)
- Batch operations (tags, favorites, move)
- Face clustering & recognition
- Geo-mapping with clustering
- Timeline view (day/week/month)
- Collections & smart collections
- Trip detection
- Video playback
- Offline support (PWA)
- Search analytics
- Workspace management
- Sharing capabilities

**Technical Stack (Current)**:
- React 18.2 + TypeScript
- Vite build tool
- Mixed state management (Zustand + Contexts)
- Partial shadcn/ui (8.5% adoption)
- 879KB bundle (242KB gzipped) - too large
- 236 components with inconsistent architecture

### Critical Issues
1. ❌ Poor architecture (monolithic, circular deps)
2. ❌ Bundle too large (879KB vs target 250KB)
3. ❌ Low shadcn adoption (8.5%)
4. ❌ 140 duplicate custom components
5. ❌ Inconsistent UX/UI
6. ❌ 1,279 ESLint errors
7. ❌ No cohesive design system

---

## 🎨 Design Philosophy: World-Class Aesthetics

### Visual Design Principles

#### 1. **Exaggerated Minimalism** (2025 Trend)
- Clean layouts with bold, expressive features
- Ample whitespace with strategic pops of color
- Typography as a design element
- Micro-interactions for delight

#### 2. **Depth & Layering**
- Glassmorphism (frosted glass effects)
- Semi-transparent overlays
- Subtle shadows for elevation
- Blur effects for focus

#### 3. **Color System**
```css
/* Light Mode - Elegant & Professional */
--primary: 220 70% 50%        /* Deep blue */
--accent: 280 65% 60%         /* Purple accent */
--success: 142 76% 36%        /* Green */
--warning: 38 92% 50%         /* Amber */
--error: 0 84% 60%            /* Red */

/* Dark Mode - Premium & Comfortable */
--primary: 220 70% 55%        /* Lighter blue */
--accent: 280 65% 65%         /* Lighter purple */
--background: 222 47% 11%     /* Deep dark blue */
--surface: 217 33% 17%        /* Card surface */
```

#### 4. **Typography Scale**
```css
--font-display: 'SF Pro Display', system-ui, sans-serif;
--font-text: 'SF Pro Text', system-ui, sans-serif;
--font-mono: 'SF Mono', 'JetBrains Mono', monospace;

/* Type scale (perfect fourth - 1.333) */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.333rem;   /* 21px */
--text-2xl: 1.777rem;  /* 28px */
--text-3xl: 2.369rem;  /* 38px */
--text-4xl: 3.157rem;  /* 50px */
```

#### 5. **Motion Design**
```typescript
// Easing curves
const easing = {
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  smooth: "cubic-bezier(0.4, 0.0, 0.2, 1)",
  snappy: "cubic-bezier(0.0, 0.0, 0.2, 1)",
}

// Duration scale
const duration = {
  instant: 100,  // Micro-interactions
  fast: 200,     // Button feedback
  base: 300,     // Standard animations
  slow: 500,     // Complex transitions
}

// Respect user preferences
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

### UI Component Aesthetic

#### Photo Grid (Inspired by Google Photos)
- **Justified layout** - Photos fill rows perfectly
- **Responsive aspect ratios** - No cropping
- **Smooth scrolling** - 60fps virtual scroll
- **Hover states** - Scale + shadow on hover
- **Selection mode** - Checkbox with spring animation
- **Quick actions** - Slide-up menu on long press (mobile)

#### Search Bar (Inspired by Linear/Notion)
- **Cmd+K launcher** - Global command palette
- **Smart suggestions** - AI-powered, instant
- **Recent searches** - Quick access
- **Filter chips** - Visual, removable
- **Voice search** - Optional microphone input
- **Loading state** - Skeleton with shimmer

#### Navigation (Inspired by Apple Photos)
- **Sidebar** - Collapsible sections with icons
- **Breadcrumbs** - Path navigation
- **Tab bar** (mobile) - Bottom navigation
- **Shortcuts** - Keyboard first
- **Active states** - Pill-shaped highlight

#### Lightbox Viewer (Premium Experience)
- **Fullscreen** - Distraction-free
- **Gestures** - Pinch zoom, swipe navigate
- **EXIF panel** - Slide-in metadata
- **Edit mode** - Inline editing tools
- **Share sheet** - Native feel
- **Keyboard nav** - Arrow keys, ESC to close

---

## 🏗️ Architecture: Scalable & Extensible

### Project Structure (webapp-v2/)

```
webapp-v2/
├── public/
│   ├── models/              # AI models (cached)
│   ├── workers/             # Service workers
│   └── assets/              # Static assets
│
├── src/
│   ├── app/                 # App bootstrap
│   │   ├── App.tsx          # Root component
│   │   ├── Router.tsx       # Route configuration
│   │   ├── Providers.tsx    # Context providers
│   │   └── ErrorBoundary.tsx
│   │
│   ├── features/            # Feature modules (domain-driven)
│   │   ├── search/
│   │   │   ├── components/
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── SearchResults.tsx
│   │   │   │   ├── FilterPanel.tsx
│   │   │   │   └── SearchSuggestions.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useSearch.ts
│   │   │   │   ├── useSearchSuggestions.ts
│   │   │   │   └── useSearchFilters.ts
│   │   │   ├── api/
│   │   │   │   └── searchApi.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── library/          # Photo library
│   │   ├── people/           # Face clustering
│   │   ├── collections/      # Collections
│   │   ├── map/              # Geo view
│   │   ├── discovery/        # Smart discovery
│   │   ├── editing/          # Photo editing
│   │   ├── sharing/          # Sharing
│   │   ├── settings/         # Settings
│   │   └── admin/            # Admin tools
│   │
│   ├── components/          # Shared components
│   │   ├── ui/              # shadcn components (45+)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── command.tsx
│   │   │   ├── form.tsx
│   │   │   └── ... (all shadcn)
│   │   │
│   │   ├── layout/          # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── BottomNav.tsx
│   │   │
│   │   ├── media/           # Media components
│   │   │   ├── PhotoGrid.tsx
│   │   │   ├── PhotoCard.tsx
│   │   │   ├── Lightbox.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   └── ThumbnailImage.tsx
│   │   │
│   │   └── common/          # Common components
│   │       ├── EmptyState.tsx
│   │       ├── ErrorState.tsx
│   │       ├── LoadingState.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── lib/                 # Utilities
│   │   ├── api/
│   │   │   ├── client.ts           # Axios instance
│   │   │   ├── endpoints.ts        # API endpoints
│   │   │   └── types.ts            # API types
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── useIntersection.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   ├── useKeyboard.ts
│   │   │   └── useLongPress.ts
│   │   ├── utils/
│   │   │   ├── cn.ts               # Class merge
│   │   │   ├── format.ts           # Formatters
│   │   │   ├── validation.ts       # Validators
│   │   │   └── color.ts            # Color utils
│   │   └── constants/
│   │       ├── routes.ts
│   │       ├── config.ts
│   │       └── shortcuts.ts
│   │
│   ├── stores/              # Zustand stores
│   │   ├── uiStore.ts       # UI state
│   │   ├── prefsStore.ts    # User preferences
│   │   ├── selectionStore.ts # Selection state
│   │   └── cacheStore.ts    # Client cache
│   │
│   ├── types/               # TypeScript types
│   │   ├── api.ts           # API types
│   │   ├── domain.ts        # Domain models
│   │   └── components.ts    # Component types
│   │
│   └── styles/              # Global styles
│       ├── globals.css      # Reset + base
│       ├── themes.css       # Theme variables
│       └── animations.css   # Keyframes
│
├── tests/
│   ├── unit/               # Vitest tests
│   ├── integration/        # Integration tests
│   └── e2e/               # Playwright tests
│
├── .storybook/            # Storybook config
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

### State Management Strategy

#### 1. **Server State** (React Query)
```typescript
// All API data managed by React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Example: Search
const useSearch = (query: string, filters: SearchFilters) => {
  return useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => searchApi.search({ query, ...filters }),
    enabled: query.length > 2,
    staleTime: 5 * 60 * 1000, // 5min
    gcTime: 30 * 60 * 1000,   // 30min
  });
};

// Optimistic updates for mutations
const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) => api.toggleFavorite(photoId),
    onMutate: async (photoId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      const previous = queryClient.getQueryData(['photos']);
      queryClient.setQueryData(['photos'], (old) => /* update */);
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['photos'], context.previous);
    },
  });
};
```

#### 2. **Client State** (Zustand)
```typescript
// UI state
interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  gridSize: 'small' | 'medium' | 'large';
  viewMode: 'grid' | 'list' | 'timeline' | 'map';

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: UIStore['theme']) => void;
}

const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      gridSize: 'medium',
      viewMode: 'grid',

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'ui-store' }
  )
);

// Selection state
interface SelectionStore {
  selected: Set<string>;
  selectionMode: boolean;

  select: (id: string) => void;
  deselect: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
}
```

#### 3. **Form State** (React Hook Form + Zod)
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const searchFilterSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  camera: z.string().optional(),
});

type SearchFilterForm = z.infer<typeof searchFilterSchema>;

const FilterForm = () => {
  const form = useForm<SearchFilterForm>({
    resolver: zodResolver(searchFilterSchema),
    defaultValues: { tags: [] },
  });

  const onSubmit = form.handleSubmit((data) => {
    // Type-safe submission
  });

  return (
    <Form {...form}>
      {/* shadcn form components */}
    </Form>
  );
};
```

#### 4. **URL State** (React Router)
```typescript
// Search params for sharable state
const [searchParams, setSearchParams] = useSearchParams();

const query = searchParams.get('q') || '';
const view = searchParams.get('view') || 'grid';
const filters = {
  dateFrom: searchParams.get('from'),
  dateTo: searchParams.get('to'),
  tags: searchParams.getAll('tag'),
};

// Update URL
const updateSearch = (newQuery: string) => {
  setSearchParams((prev) => {
    prev.set('q', newQuery);
    return prev;
  });
};
```

### Performance Architecture

#### 1. **Code Splitting**
```typescript
// Route-based splitting
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const LibraryPage = lazy(() => import('@/features/library/LibraryPage'));
const MapPage = lazy(() => import('@/features/map/MapPage'));

// Component-based splitting
const Lightbox = lazy(() => import('@/components/media/Lightbox'));
const VideoPlayer = lazy(() => import('@/components/media/VideoPlayer'));

// Preload on hover
<Link
  to="/map"
  onMouseEnter={() => import('@/features/map/MapPage')}
>
  Map
</Link>
```

#### 2. **Virtual Scrolling**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const PhotoGrid = ({ photos }: { photos: Photo[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: photos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250,
    overscan: 5,
    // Masonry support
    lanes: 4,
    gap: 16,
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <PhotoCard key={item.key} photo={photos[item.index]} />
        ))}
      </div>
    </div>
  );
};
```

#### 3. **Image Optimization**
```typescript
const ThumbnailImage = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection observer for lazy load
  useIntersectionObserver(imgRef, {
    onIntersect: () => {
      if (imgRef.current && !imgRef.current.src) {
        imgRef.current.src = src;
      }
    },
  });

  return (
    <div className="relative aspect-square">
      {isLoading && <Skeleton className="absolute inset-0" />}
      <img
        ref={imgRef}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoading(false)}
        loading="lazy"
      />
    </div>
  );
};
```

#### 4. **Bundle Optimization**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Data fetching
          'vendor-query': ['@tanstack/react-query', 'axios'],

          // UI components (tree-shakeable)
          'vendor-ui': ['framer-motion', 'lucide-react'],

          // Heavy features
          'feature-map': [/features\/map/],
          'feature-editing': [/features\/editing/],
        },

        // Optimize naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // Size limits
    chunkSizeWarningLimit: 500,
  },

  // Compression
  plugins: [
    viteCompression({ algorithm: 'brotli' }),
  ],
});
```

---

## 🎯 Complete Feature Coverage

### Phase 1: Foundation (Week 1)

**Goal**: Set up architecture, design system, core navigation

**Tasks**:
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install complete shadcn/ui (45+ components)
- [ ] Setup Tailwind with design tokens
- [ ] Configure React Query + Zustand
- [ ] Setup React Router with layouts
- [ ] Create app shell (sidebar, topbar, content area)
- [ ] Implement theme system (light/dark/system)
- [ ] Build command palette (Cmd+K)
- [ ] Setup error boundaries
- [ ] Configure ESLint + Prettier (strict)

**Deliverables**:
- ✅ Working app shell
- ✅ Navigation functional
- ✅ Theme switching works
- ✅ Command palette works
- ✅ Zero lint errors

### Phase 2: Core Photo Features (Week 2)

**Goal**: Photo grid, search, lightbox - the essentials

**Tasks**:
- [ ] **Photo Grid**:
  - [ ] Justified layout (react-photo-album)
  - [ ] Virtual scrolling (@tanstack/react-virtual)
  - [ ] Lazy image loading
  - [ ] Hover effects
  - [ ] Selection mode
  - [ ] Grid size controls

- [ ] **Search**:
  - [ ] Search bar with auto-complete
  - [ ] AI-powered suggestions
  - [ ] Recent searches
  - [ ] Filter panel (drawer)
  - [ ] Filter chips (removable)
  - [ ] Search analytics

- [ ] **Lightbox**:
  - [ ] Fullscreen viewer
  - [ ] Keyboard navigation
  - [ ] Pinch zoom (mobile)
  - [ ] EXIF panel
  - [ ] Share functionality
  - [ ] Delete confirmation

- [ ] **Library View**:
  - [ ] Infinite scroll
  - [ ] Date grouping
  - [ ] Sorting options
  - [ ] Empty states

**Deliverables**:
- ✅ Can browse photos
- ✅ Can search photos
- ✅ Can view photo details
- ✅ Performance: 60fps scroll

### Phase 3: Organization & Collections (Week 3)

**Goal**: Collections, tags, favorites, trips

**Tasks**:
- [ ] **Collections**:
  - [ ] Collection grid
  - [ ] Create/edit/delete
  - [ ] Drag-and-drop to add
  - [ ] Collection detail view
  - [ ] Cover photo selection

- [ ] **Smart Collections**:
  - [ ] Rule builder UI
  - [ ] Live preview
  - [ ] Preset templates
  - [ ] Auto-update

- [ ] **Tags**:
  - [ ] Tag manager
  - [ ] Tag autocomplete
  - [ ] Batch tagging
  - [ ] Tag filtering
  - [ ] Tag colors

- [ ] **Favorites**:
  - [ ] Quick favorite toggle
  - [ ] Favorites view
  - [ ] Batch favorite

- [ ] **Trips**:
  - [ ] Trip timeline
  - [ ] Auto-detect trips
  - [ ] Trip map view
  - [ ] Trip cover selection

**Deliverables**:
- ✅ Full organization system
- ✅ Collections working
- ✅ Tags working
- ✅ Trips auto-detect

### Phase 4: Advanced Features (Week 4)

**Goal**: People, map, discovery, editing

**Tasks**:
- [ ] **People/Faces**:
  - [ ] Face grid
  - [ ] Cluster viewer
  - [ ] Name faces
  - [ ] Find similar faces
  - [ ] Face timeline

- [ ] **Map View**:
  - [ ] Interactive map (react-leaflet)
  - [ ] Photo markers
  - [ ] Geo-clustering
  - [ ] Location search
  - [ ] Map timeline

- [ ] **Discovery**:
  - [ ] Recommendations view
  - [ ] Smart suggestions
  - [ ] "On this day" memories
  - [ ] Mood-based discovery
  - [ ] Serendipity mode

- [ ] **Photo Editing**:
  - [ ] Crop tool
  - [ ] Rotate/flip
  - [ ] Filters (presets)
  - [ ] Adjustments (brightness, contrast, etc.)
  - [ ] Edit history
  - [ ] Revert changes

**Deliverables**:
- ✅ Face recognition UI
- ✅ Map view working
- ✅ Discovery functional
- ✅ Basic editing tools

### Phase 5: Batch & Management (Week 5)

**Goal**: Batch operations, admin, settings

**Tasks**:
- [ ] **Batch Operations**:
  - [ ] Multi-select UI
  - [ ] Batch toolbar
  - [ ] Bulk tag
  - [ ] Bulk move
  - [ ] Bulk delete
  - [ ] Bulk export

- [ ] **Settings**:
  - [ ] General settings
  - [ ] Library settings
  - [ ] Index settings
  - [ ] Model management
  - [ ] Advanced settings
  - [ ] Keyboard shortcuts panel

- [ ] **Admin/Diagnostics**:
  - [ ] System diagnostics
  - [ ] Index status
  - [ ] Performance metrics
  - [ ] Error logs
  - [ ] Cache management

**Deliverables**:
- ✅ Batch operations work
- ✅ Settings complete
- ✅ Admin tools functional

### Phase 6: Polish & Optimization (Week 6)

**Goal**: Animations, loading states, edge cases

**Tasks**:
- [ ] **Animations**:
  - [ ] Page transitions
  - [ ] Card animations
  - [ ] Skeleton loaders
  - [ ] Micro-interactions
  - [ ] Toast notifications

- [ ] **Loading States**:
  - [ ] Skeleton screens
  - [ ] Progress indicators
  - [ ] Optimistic updates
  - [ ] Error states
  - [ ] Empty states

- [ ] **Edge Cases**:
  - [ ] Offline mode
  - [ ] Slow network
  - [ ] Large libraries (10k+ photos)
  - [ ] No results
  - [ ] API errors

- [ ] **Accessibility**:
  - [ ] Keyboard navigation audit
  - [ ] Screen reader testing
  - [ ] Focus management
  - [ ] Color contrast check
  - [ ] ARIA labels

**Deliverables**:
- ✅ Smooth animations
- ✅ Great loading states
- ✅ Handles edge cases
- ✅ WCAG AA compliant

### Phase 7: Testing & Quality (Week 7)

**Goal**: Comprehensive testing, bug fixes

**Tasks**:
- [ ] **Unit Tests** (Vitest):
  - [ ] Component tests
  - [ ] Hook tests
  - [ ] Utility tests
  - [ ] Store tests
  - [ ] Target: 70% coverage

- [ ] **Integration Tests**:
  - [ ] Search flow
  - [ ] Collection flow
  - [ ] Editing flow
  - [ ] Batch operations

- [ ] **E2E Tests** (Playwright):
  - [ ] Critical user paths
  - [ ] Cross-browser
  - [ ] Mobile testing
  - [ ] Visual regression

- [ ] **Performance**:
  - [ ] Lighthouse audit
  - [ ] Bundle analysis
  - [ ] Memory profiling
  - [ ] Network optimization

**Deliverables**:
- ✅ 70%+ test coverage
- ✅ All E2E tests pass
- ✅ Lighthouse score >90
- ✅ Bundle <250KB gzipped

### Phase 8: Launch Prep (Week 8)

**Goal**: Documentation, deployment, handoff

**Tasks**:
- [ ] **Documentation**:
  - [ ] Component docs (Storybook)
  - [ ] API integration guide
  - [ ] User guide
  - [ ] Developer guide
  - [ ] Architecture docs

- [ ] **Deployment**:
  - [ ] Production build
  - [ ] CI/CD pipeline
  - [ ] A/B testing setup
  - [ ] Analytics integration
  - [ ] Error monitoring

- [ ] **Migration**:
  - [ ] Feature parity check
  - [ ] User data migration
  - [ ] Settings migration
  - [ ] Gradual rollout plan

**Deliverables**:
- ✅ Full documentation
- ✅ Production ready
- ✅ Migration plan
- ✅ Launch checklist

---

## 🚀 Parallel Development Strategy

### Safe Parallel Approach

#### 1. **Separate Directory**
```bash
photo-search-intent-first/
├── webapp/              # Current frontend (untouched)
├── webapp-v2/           # New frontend (parallel)
├── api/                 # Shared backend
└── electron/            # Shared electron
```

#### 2. **Different Ports**
```json
// webapp/vite.config.ts
{
  "server": { "port": 5173 }
}

// webapp-v2/vite.config.ts
{
  "server": { "port": 5174 }
}
```

#### 3. **Shared Backend**
```typescript
// Both frontends use same API
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
```

#### 4. **Feature Flags**
```typescript
// Gradual migration via flags
const useNewFrontend = localStorage.getItem('use_v2') === 'true';

if (useNewFrontend) {
  window.location.href = 'http://localhost:5174';
}
```

### Development Workflow

#### Week 1-2: Foundation
- Team works on `webapp-v2/` exclusively
- Old frontend stays running on `:5173`
- New frontend develops on `:5174`
- No disruption to current app

#### Week 3-4: Core Features
- Continue parallel development
- Start internal testing of new frontend
- Collect feedback
- Old frontend still primary

#### Week 5-6: Advanced Features
- Feature parity achieved
- Internal dogfooding begins
- Bug fixes in new frontend
- Old frontend receives critical fixes only

#### Week 7-8: Testing & Polish
- Comprehensive testing
- Performance optimization
- Documentation
- Migration scripts

#### Launch Phase:
**Option A: Hard Cutover**
```bash
# When ready
mv webapp webapp-old
mv webapp-v2 webapp
# Update build config
```

**Option B: Gradual Rollout**
```typescript
// Feature flag percentage rollout
const rolloutPercentage = 10; // Start with 10%
const userId = getUserId();
const hash = hashCode(userId);
const useV2 = (hash % 100) < rolloutPercentage;
```

**Option C: A/B Testing**
```typescript
// Analytics-driven decision
const variant = getExperimentVariant('new-frontend');
const frontend = variant === 'treatment' ? 'v2' : 'v1';
trackEvent('frontend_loaded', { variant: frontend });
```

### Risk Mitigation

#### 1. **Zero Disruption**
- Old frontend untouched during development
- Backend remains compatible with both
- Users see no changes until launch

#### 2. **Easy Rollback**
```bash
# If issues arise
mv webapp webapp-v2-deployed
mv webapp-old webapp
# Instant rollback
```

#### 3. **Parallel QA**
- Test new frontend independently
- Compare metrics side-by-side
- No pressure to rush

#### 4. **Data Compatibility**
```typescript
// Ensure data layer works with both
const migrateLocalStorage = () => {
  const oldSettings = localStorage.getItem('settings');
  const newSettings = transformSettings(oldSettings);
  localStorage.setItem('settings-v2', newSettings);
};
```

---

## 🎯 Quality Standards (Billion-Dollar Level)

### Code Quality

#### TypeScript Strictness
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true
  }
}
```

#### ESLint Rules
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "rules": {
    "no-console": "error",           // No console.log in production
    "@typescript-eslint/no-explicit-any": "error",
    "react/prop-types": "off",        // TypeScript handles this
    "react-hooks/exhaustive-deps": "error"
  }
}
```

#### Component Standards
```typescript
// Every component follows this pattern
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, onClick }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }))}
        disabled={disabled || loading}
        onClick={onClick}
        aria-busy={loading}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### Performance Budgets

#### Bundle Size
```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumError": "250kb"  // Gzipped
    },
    {
      "type": "anyComponentStyle",
      "maximumError": "10kb"
    },
    {
      "type": "anyScript",
      "maximumError": "150kb"
    }
  ]
}
```

#### Core Web Vitals
```typescript
// Targets (measured with Lighthouse)
const webVitals = {
  LCP: 2.5,      // Largest Contentful Paint
  FID: 100,      // First Input Delay
  CLS: 0.1,      // Cumulative Layout Shift
  FCP: 1.8,      // First Contentful Paint
  TTI: 3.8,      // Time to Interactive
  TBT: 200,      // Total Blocking Time
};
```

#### Runtime Performance
```typescript
// All operations must meet these targets
const performanceTargets = {
  searchLatency: 200,        // ms
  imageLoadTime: 300,        // ms
  pageTransition: 200,       // ms
  scrollFPS: 60,             // fps
  interactionDelay: 50,      // ms (instant feel)
};
```

### Accessibility Standards

#### WCAG 2.1 AA Compliance
- ✅ Color contrast ratio ≥ 4.5:1
- ✅ All interactive elements keyboard accessible
- ✅ Focus indicators visible
- ✅ ARIA labels on all icons
- ✅ Skip to content link
- ✅ Semantic HTML
- ✅ Screen reader testing

#### Keyboard Shortcuts
```typescript
const shortcuts = {
  global: {
    'cmd+k': 'Open command palette',
    '/': 'Focus search',
    'cmd+,': 'Open settings',
    '?': 'Show keyboard shortcuts',
  },
  navigation: {
    'g h': 'Go to home',
    'g l': 'Go to library',
    'g c': 'Go to collections',
    'g p': 'Go to people',
    'g m': 'Go to map',
  },
  actions: {
    'cmd+f': 'Toggle favorite',
    'cmd+d': 'Download photo',
    'cmd+i': 'Show info',
    'delete': 'Delete photo',
    'esc': 'Close modal',
  },
  grid: {
    'j': 'Next photo',
    'k': 'Previous photo',
    'space': 'Toggle select',
    'cmd+a': 'Select all',
    'enter': 'Open lightbox',
  },
};
```

### Design System Documentation

#### Storybook Setup
```typescript
// .storybook/preview.ts
export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: { matchers: { color: /(background|color)$/i } },
  layout: 'centered',
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#ffffff' },
      { name: 'dark', value: '#0f0f0f' },
    ],
  },
};

// Document every component
export default {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;
```

---

## 📈 Success Metrics

### Technical Metrics

#### Performance
- ✅ Lighthouse score: >90 (all categories)
- ✅ Bundle size: <250KB gzipped
- ✅ First Contentful Paint: <1.5s
- ✅ Time to Interactive: <3s
- ✅ Search latency: <200ms
- ✅ 60fps scrolling (virtual grid)

#### Code Quality
- ✅ TypeScript: 100% strict compliance, 0 `any` types
- ✅ ESLint: 0 errors, 0 warnings
- ✅ Test coverage: >70%
- ✅ E2E tests: 100% critical paths
- ✅ Accessibility: WCAG AA compliant

#### Architecture
- ✅ Component size: <200 lines average
- ✅ Circular dependencies: 0
- ✅ Duplicate code: <5%
- ✅ shadcn coverage: >90%
- ✅ Bundle chunks: Optimal splitting

### User Experience Metrics

#### Engagement
- ⏱️ Time to first search: <30s
- ⏱️ Average session duration: +20%
- ⏱️ Daily active users: +15%
- ⏱️ Feature discovery rate: +30%

#### Satisfaction
- 😊 User satisfaction (NPS): >50
- 😊 Task completion rate: >95%
- 😊 Error rate: <1%
- 😊 Support tickets: -40%

#### Performance (User-perceived)
- ⚡ Perceived speed: "Instant" (>90% users)
- ⚡ Zero layout shift (CLS < 0.1)
- ⚡ Smooth animations (100% frames)
- ⚡ Responsive interactions (<100ms)

---

## 🛠️ Tech Stack Summary

### Core
- **React** 18.2+ (Concurrent features)
- **TypeScript** 5.3+ (Strict mode)
- **Vite** 5.0+ (Fast builds)

### UI & Design
- **shadcn/ui** (Complete 45+ components)
- **Tailwind CSS** 3.4+ (Utility-first)
- **Radix UI** (Accessible primitives)
- **Framer Motion** 12+ (Animations)
- **Lucide React** (Icons)

### State & Data
- **Zustand** 5.0+ (Client state)
- **React Query** 5.90+ (Server state)
- **React Hook Form** + **Zod** (Forms)
- **React Router** 6.23+ (Routing)

### Media & Visuals
- **react-photo-album** (Justified grid)
- **@tanstack/react-virtual** (Virtual scroll)
- **react-leaflet** (Maps)
- **Leaflet** (Map library)

### Dev Tools
- **Vitest** (Unit tests)
- **Playwright** (E2E tests)
- **Storybook** (Component docs)
- **ESLint** + **Prettier** (Code quality)

### Performance
- **@vercel/analytics** (Real user metrics)
- **vite-plugin-compression** (Brotli/Gzip)
- **rollup-plugin-visualizer** (Bundle analysis)

---

## 📋 Implementation Checklist

### Pre-Development
- [ ] Review and approve design system
- [ ] Set up Figma designs (optional)
- [ ] Create GitHub project board
- [ ] Set up monitoring (Sentry, Analytics)
- [ ] Prepare test data sets

### Development Setup
- [ ] Initialize `webapp-v2/` directory
- [ ] Install dependencies
- [ ] Configure TypeScript (strict)
- [ ] Setup ESLint + Prettier
- [ ] Configure Vite
- [ ] Setup Tailwind + shadcn
- [ ] Initialize Git workflow

### Quality Gates
- [ ] Every PR requires:
  - [ ] 0 TypeScript errors
  - [ ] 0 ESLint errors
  - [ ] All tests passing
  - [ ] Lighthouse score >90
  - [ ] Bundle size check
  - [ ] Accessibility check

### Launch Checklist
- [ ] Feature parity with old frontend
- [ ] All tests passing (unit + E2E)
- [ ] Performance targets met
- [ ] Accessibility audit passed
- [ ] Documentation complete
- [ ] Migration script tested
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] A/B test setup ready

---

## 🎯 Final Thoughts

This plan creates a **world-class photo management app** that:

✅ **Looks Beautiful** - Modern, minimalist, with delightful animations
✅ **Feels Fast** - <250KB bundle, 60fps, instant interactions
✅ **Works Everywhere** - Responsive, accessible, offline-capable
✅ **Scales Infinitely** - Clean architecture, extensible, well-tested
✅ **Rivals the Best** - Matches Apple Photos, Google Photos, Lightroom

### Why This Will Succeed

1. **No Risk** - Parallel development, old app untouched
2. **Quality First** - Strict standards, comprehensive testing
3. **Modern Stack** - Best-in-class tools (shadcn, React Query, Zustand)
4. **Clear Timeline** - 8 weeks, well-defined phases
5. **Extensible** - Easy to add features, maintain, scale

### Next Steps

1. ✅ **Review this plan** - Approve architecture & timeline
2. 🚀 **Kickoff Phase 1** - Initialize project, setup foundation
3. 📊 **Weekly demos** - Show progress, gather feedback
4. 🎉 **Launch** - Deploy when quality gates met

---

**Ready to build a billion-dollar app experience? Let's do this! 🚀**
