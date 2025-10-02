# PhotoSearch Frontend Rebuild - Comprehensive AI Agent Prompt

## Project Overview
Build a modern, scalable, and high-performance photo management web application frontend for PhotoSearch - an AI-powered photo organization and search platform. This will be a **parallel implementation** that may replace the current frontend if successful.

## Current State Analysis

### Existing Frontend Issues
1. **Architecture Problems**:
   - 236 components with poor organization
   - Monolithic components (2,000+ lines)
   - Circular dependencies (4 identified)
   - Mixed state management patterns
   - 1,279 ESLint errors/warnings
   
2. **Performance Issues**:
   - Main bundle: 879.54 kB (242.54 kB gzipped) - exceeds recommended 250kB
   - Poor code splitting
   - Inefficient rendering patterns
   
3. **Maintainability Issues**:
   - Inconsistent component structure
   - Business logic mixed with presentation
   - Poor separation of concerns
   - Scattered configuration management

### Backend Capabilities (What You Need to Support)

#### Core API Endpoints (FastAPI)
The backend provides comprehensive REST APIs across multiple domains:

**Search & Discovery**:
- `/v1/search` - AI-powered semantic search with multiple engines (CLIP, text, hybrid)
- `/discovery/recommendations` - Smart photo recommendations (content-based, time-based, mood-based)
- `/discovery/smart-suggestions` - Intent recognition and search suggestions
- Advanced filters: metadata, location, time, tags, faces

**Library Management**:
- `/library/photos` - Paginated photo listing with sorting
- `/library/stats` - Library statistics and analytics
- `/library/scan` - Directory scanning and indexing

**Indexing & Performance**:
- `/indexing/build` - Build vector index for semantic search
- `/fast-index/build` - Fast index for quick lookups
- `/indexing/status` - Index build progress tracking
- OCR indexing for text in images

**Media Operations**:
- `/metadata/batch` - Batch metadata operations
- `/editing/apply` - Apply edits (crop, rotate, filters)
- `/file-management/move` - Move/organize files
- `/favorites/toggle` - Mark favorites
- `/tagging/set` - Add/remove tags

**Collections & Organization**:
- `/collections/list` - User collections
- `/smart-collections/list` - Dynamic smart collections
- `/trips/list` - Auto-detected trips
- `/faces/clusters` - Face detection & clustering

**Advanced Features**:
- `/analytics/search-stats` - Search analytics
- `/workspace/save` - Save search workspaces
- `/share/create` - Share collections
- `/videos/*` - Video playback support
- `/watch/start` - File system watching
- Map view with geo-clustering

**System & Config**:
- `/config/settings` - App configuration
- `/diagnostics/system` - System diagnostics
- `/models/status` - AI model status
- `/admin/*` - Admin operations

## Design Requirements

### Core Design Principles
1. **Modern & Clean**: Follow 2025 UI/UX best practices
2. **Performance First**: <250kB gzipped bundle, 60fps interactions
3. **Accessibility**: WCAG 2.1 AA compliance minimum
4. **Responsive**: Mobile-first approach, works on all devices
5. **Scalable Architecture**: Easy to extend and maintain

### UI/UX Guidelines

#### Visual Design
- **Design System**: Use shadcn/ui as the foundation
- **Color Scheme**: 
  - Light/Dark mode support (system preference detection)
  - High contrast mode option
  - CSS variables for theming
- **Typography**: 
  - Clear hierarchy
  - Readable font sizes (minimum 16px body)
  - System fonts for performance
- **Spacing**: Consistent 8px grid system
- **Animations**: 
  - Subtle, purposeful animations (150-300ms)
  - Respect `prefers-reduced-motion`
  - Framer Motion for complex animations

#### Layout Patterns
1. **App Shell**: Persistent navigation, content area
2. **Photo Grid**: 
   - Justified/masonry layout (like Google Photos)
   - Virtual scrolling for large libraries
   - Lazy loading with intersection observer
3. **Sidebar**: Collapsible navigation with sections
4. **Command Palette**: Keyboard-first interaction (Cmd+K)
5. **Progressive Disclosure**: Show complexity on demand

#### Key UI Components Needed

**Navigation & Layout**:
- App Shell with sidebar navigation
- Top bar with search, notifications, user menu
- Bottom navigation for mobile
- Breadcrumbs for deep navigation

**Photo Display**:
- Justified photo grid (react-photo-album or custom)
- Photo lightbox/viewer with zoom, pan
- Timeline view with date grouping
- Map view with clustered markers (react-leaflet)
- Video player integration

**Search & Discovery**:
- Smart search bar with suggestions
- Advanced filter panel (drawer/modal)
- Search intent recognition UI
- Recent searches, saved searches
- Filter chips/tags (removable)

**Collections & Organization**:
- Collection cards grid
- Collection detail view
- Drag-and-drop to collections
- Smart collection builder UI
- Trip timeline visualization

**Media Management**:
- Batch selection mode
- Bulk actions toolbar
- Quick actions menu (context menu)
- Metadata editor panel
- Tag management interface

**System & Settings**:
- Settings panel/page
- Indexing progress indicators
- Model download/status UI
- Diagnostics dashboard (admin)
- Error boundaries with retry

### Technical Stack

#### Required Technologies
```json
{
  "framework": "React 18.2+ with TypeScript 5.3+",
  "build": "Vite 5.0+",
  "router": "React Router DOM 6.23+",
  "ui": "shadcn/ui (Radix UI + Tailwind CSS)",
  "state": "Zustand 5.0+ (NOT Redux/Context API for global state)",
  "data": "@tanstack/react-query 5.90+ (server state)",
  "forms": "React Hook Form + Zod validation",
  "animations": "Framer Motion 12+",
  "icons": "Lucide React",
  "maps": "react-leaflet + Leaflet",
  "virtual": "react-window or @tanstack/react-virtual",
  "utils": "clsx + tailwind-merge"
}
```

#### Development Tools
- ESLint + Prettier (consistent formatting)
- TypeScript strict mode
- Vitest for unit tests
- Playwright for E2E tests
- Storybook for component development (optional)

### Architecture Requirements

#### Project Structure
```
webapp-v2/
├── src/
│   ├── app/                 # App setup, providers, routes
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   └── Providers.tsx
│   ├── features/           # Feature-based modules
│   │   ├── search/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   └── types.ts
│   │   ├── library/
│   │   ├── collections/
│   │   ├── discovery/
│   │   ├── settings/
│   │   └── ...
│   ├── components/         # Shared components
│   │   ├── ui/            # shadcn components
│   │   ├── layout/
│   │   └── common/
│   ├── lib/               # Utilities
│   │   ├── api/          # API client
│   │   ├── hooks/        # Shared hooks
│   │   └── utils/
│   ├── stores/           # Zustand stores
│   ├── types/            # TypeScript types
│   └── styles/           # Global styles
├── public/
├── tests/
└── package.json
```

#### State Management Strategy
1. **Server State**: Use React Query for all API data
   - Automatic caching, revalidation
   - Optimistic updates for mutations
   - Background refetching
   
2. **Client State**: Use Zustand for:
   - UI state (sidebar open/closed, theme)
   - User preferences
   - Selection state
   - View settings
   
3. **Form State**: React Hook Form
4. **URL State**: React Router for filters, pagination

#### Performance Requirements
1. **Bundle Size**:
   - Main chunk: <150kB gzipped
   - Total: <250kB gzipped initial load
   - Lazy load routes and heavy components
   
2. **Rendering**:
   - Virtual scrolling for >100 items
   - Image lazy loading with blur placeholder
   - Debounced search (300ms)
   - Optimistic UI updates
   
3. **Caching**:
   - React Query cache for API data
   - IndexedDB for offline support
   - Service Worker for asset caching

#### Code Quality Standards
1. **TypeScript**:
   - Strict mode enabled
   - No `any` types (use `unknown` if needed)
   - Proper type inference
   - Shared types in `/types`
   
2. **Components**:
   - Max 200 lines per component
   - Single Responsibility Principle
   - Props interface for all components
   - Composition over inheritance
   
3. **Hooks**:
   - Custom hooks for reusable logic
   - Proper dependency arrays
   - Memoization where needed (useMemo, useCallback)
   
4. **Error Handling**:
   - Error boundaries at route level
   - Try-catch in async functions
   - User-friendly error messages
   - Error reporting service integration

### Feature Implementation Checklist

#### Phase 1: Foundation (Week 1)
- [ ] Project setup with Vite + TypeScript
- [ ] Install and configure shadcn/ui
- [ ] Setup Zustand stores
- [ ] Setup React Query with API client
- [ ] Implement routing structure
- [ ] Create app shell layout
- [ ] Setup theme system (light/dark)
- [ ] Basic error boundaries

#### Phase 2: Core Features (Week 2)
- [ ] **Search**:
  - [ ] Search bar with suggestions
  - [ ] Advanced filters panel
  - [ ] Search results grid (virtual scrolling)
  - [ ] Intent recognition UI
- [ ] **Library**:
  - [ ] Photo grid with justified layout
  - [ ] Photo lightbox viewer
  - [ ] Pagination/infinite scroll
  - [ ] Metadata display
- [ ] **Navigation**:
  - [ ] Sidebar with sections
  - [ ] Command palette (Cmd+K)
  - [ ] Breadcrumbs

#### Phase 3: Advanced Features (Week 3)
- [ ] **Collections**:
  - [ ] Collection grid
  - [ ] Create/edit collections
  - [ ] Drag-and-drop to collections
  - [ ] Smart collections UI
- [ ] **Discovery**:
  - [ ] Recommendations view
  - [ ] Smart suggestions
  - [ ] Trips timeline
- [ ] **Map View**:
  - [ ] Geo-clustered photos
  - [ ] Map controls
  - [ ] Photo markers

#### Phase 4: Management & Polish (Week 4)
- [ ] **Batch Operations**:
  - [ ] Multi-select mode
  - [ ] Bulk actions toolbar
  - [ ] Tag management
- [ ] **Settings & Admin**:
  - [ ] Settings panel
  - [ ] Indexing UI
  - [ ] Model status
  - [ ] Diagnostics (admin)
- [ ] **Polish**:
  - [ ] Loading states
  - [ ] Empty states
  - [ ] Animations
  - [ ] Accessibility audit

### API Integration Guidelines

#### API Client Setup
```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('api_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

#### React Query Setup
```typescript
// Example: Search query
const useSearch = (query: string, filters: Filters) => {
  return useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => searchAPI.search({ query, ...filters }),
    enabled: query.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

#### Type Safety
- Generate types from OpenAPI schema if available
- Shared types between request/response
- Zod schemas for runtime validation

### Design System Implementation

#### shadcn/ui Setup
```bash
npx shadcn-ui@latest init
```

#### Required Components to Install
```bash
# Layout & Navigation
npx shadcn-ui@latest add dialog sheet dropdown-menu command

# Forms & Inputs
npx shadcn-ui@latest add input textarea select checkbox switch

# Feedback
npx shadcn-ui@latest add toast alert progress skeleton

# Data Display
npx shadcn-ui@latest add card badge separator tabs

# Overlay
npx shadcn-ui@latest add tooltip popover
```

#### Custom Components
- **PhotoGrid**: Justified layout with virtual scrolling
- **PhotoLightbox**: Full-screen viewer with controls
- **SearchBar**: Smart search with suggestions
- **FilterPanel**: Advanced filter builder
- **CollectionCard**: Collection preview card
- **TimelineView**: Date-grouped photo timeline
- **MapView**: Interactive photo map

### Accessibility Requirements

1. **Keyboard Navigation**:
   - Tab through all interactive elements
   - Escape to close modals/drawers
   - Arrow keys for grid navigation
   - Cmd/Ctrl+K for command palette

2. **Screen Reader Support**:
   - Proper ARIA labels
   - Live regions for dynamic content
   - Descriptive alt text for images
   - Role attributes

3. **Visual**:
   - High contrast mode
   - Focus indicators (visible outlines)
   - Text size adjustment
   - Color blind friendly palette

4. **Motion**:
   - Respect `prefers-reduced-motion`
   - Disable animations option
   - No auto-playing content

### Testing Strategy

#### Unit Tests (Vitest)
- Component logic tests
- Hook tests
- Utility function tests
- Store tests
- Target: 70% coverage

#### Integration Tests (Vitest + React Testing Library)
- Feature workflows
- API integration
- Form submissions
- Error scenarios

#### E2E Tests (Playwright)
- Critical user paths:
  - Search flow
  - Collection creation
  - Photo viewing
  - Batch operations
- Cross-browser testing
- Visual regression tests

### Performance Optimization

#### Code Splitting
```typescript
// Route-based splitting
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const LibraryPage = lazy(() => import('@/features/library/LibraryPage'));
```

#### Image Optimization
- Use `loading="lazy"` attribute
- Blur placeholder while loading
- Progressive JPEG/WebP support
- Responsive images with srcset

#### Virtual Scrolling
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// For large photo grids
const virtualizer = useVirtualizer({
  count: photos.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 250,
  overscan: 5,
});
```

### Error Handling

#### Error Boundary
```typescript
// app/ErrorBoundary.tsx
class ErrorBoundary extends Component {
  // Catch React errors
  // Show fallback UI
  // Log to error service
}
```

#### API Error Handling
```typescript
// React Query error handling
const { error, isError } = useQuery({
  queryKey: ['photos'],
  queryFn: fetchPhotos,
  retry: 3,
  onError: (error) => {
    toast.error(getErrorMessage(error));
  },
});
```

### Migration Strategy

#### Running in Parallel
1. Build in separate directory: `webapp-v2/`
2. Different dev port: `5174`
3. Use same API backend
4. Feature flag for testing

#### Cutover Plan
1. Deploy both frontends
2. A/B test with users
3. Compare metrics:
   - Bundle size
   - Load time
   - Error rates
   - User engagement
4. Gradual rollout
5. Full replacement when stable

### Success Metrics

#### Technical Metrics
- Bundle size: <250kB gzipped ✅
- First Contentful Paint: <1.5s ✅
- Time to Interactive: <3s ✅
- Lighthouse score: >90 ✅
- Zero ESLint errors ✅
- >70% test coverage ✅

#### User Experience Metrics
- Search response time: <200ms
- Grid rendering: 60fps
- Accessibility score: AA compliance
- Error rate: <1%
- User satisfaction: >4/5

## Implementation Instructions for AI Agents

### Step 1: Initial Setup
1. Create new directory: `webapp-v2/`
2. Initialize Vite project with React + TypeScript template
3. Install core dependencies (see Technical Stack)
4. Setup Tailwind CSS and shadcn/ui
5. Configure TypeScript strict mode
6. Setup ESLint + Prettier

### Step 2: Architecture Setup
1. Create folder structure as specified
2. Setup API client with axios
3. Configure React Query provider
4. Setup Zustand stores (UI, preferences)
5. Configure React Router
6. Create root providers component

### Step 3: Core Components
1. Implement app shell layout
2. Create shadcn-based UI components
3. Build photo grid with virtualization
4. Implement search bar with suggestions
5. Create lightbox viewer
6. Build navigation sidebar

### Step 4: Feature Implementation
Follow the Feature Implementation Checklist (Phase 1-4)
Implement one feature at a time, test thoroughly

### Step 5: Integration & Testing
1. Connect to backend APIs
2. Implement error handling
3. Add loading states
4. Write unit tests
5. Write E2E tests
6. Accessibility audit

### Step 6: Optimization
1. Code splitting implementation
2. Bundle size analysis
3. Performance profiling
4. Image optimization
5. Caching strategy

### Step 7: Polish & Deploy
1. Animation refinement
2. Dark mode testing
3. Cross-browser testing
4. Documentation
5. Deploy preview

## Quality Checklist

### Before Submitting
- [ ] TypeScript: No errors, strict mode enabled
- [ ] Linting: Zero ESLint errors
- [ ] Bundle: <250kB gzipped
- [ ] Tests: >70% coverage, all passing
- [ ] Accessibility: Lighthouse AA score
- [ ] Performance: Lighthouse >90
- [ ] Responsive: Works on mobile, tablet, desktop
- [ ] Dark mode: Fully functional
- [ ] Error handling: Graceful degradation
- [ ] Documentation: README with setup instructions

## Reference Resources

### Inspiration
- Google Photos web UI
- Apple Photos (macOS)
- Unsplash.com
- Pexels.com

### Technical References
- shadcn/ui docs: https://ui.shadcn.com
- React Query: https://tanstack.com/query
- Zustand: https://github.com/pmndrs/zustand
- Framer Motion: https://www.framer.com/motion
- React Photo Album: https://react-photo-album.com

### Design Guidelines
- Material Design 3: https://m3.material.io
- Apple HIG: https://developer.apple.com/design
- Accessible design: https://www.w3.org/WAI/WCAG21/quickref

---

## Final Notes

This is a comprehensive rebuild focused on:
✅ **Modern architecture** - Clean, scalable, maintainable
✅ **Performance** - Fast load, smooth interactions
✅ **User experience** - Intuitive, beautiful, accessible
✅ **Developer experience** - Type-safe, well-tested, documented

The goal is to create a frontend that not only matches but exceeds the current implementation in every aspect, providing a solid foundation for future development.

**Timeline**: 4 weeks for full implementation
**Team**: 2-3 frontend developers or AI agents
**Priority**: Quality over speed - do it right the first time
