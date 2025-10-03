# PhotoSearch Frontend Rebuild - Master Implementation Plan

**Version**: 2.0 (Final)
**Date**: October 2, 2025
**Status**: Production-Ready Blueprint
**Philosophy**: Intent-First, Zero-Risk, World-Class Quality

---

## 🎯 Executive Summary

Build a **parallel frontend** (`webapp-v2/`) that delivers billion-dollar app quality while maintaining **zero disruption** to the current production system. This plan integrates world-class design, comprehensive testing, observability infrastructure, and intent-first principles to create a sustainable, extensible platform.

### Success Criteria
- ✅ **Zero disruption** to existing `webapp/`
- ✅ **Complete feature parity** with current frontend
- ✅ **World-class performance** (<250KB bundle, LH >90)
- ✅ **Production observability** from day 1
- ✅ **WCAG AA compliance** shift-left approach
- ✅ **Backend compatibility** with all APIs
- ✅ **Comprehensive documentation** at every layer

---

## 📋 Table of Contents

1. [Project Principles](#project-principles)
2. [Parallel System Architecture](#parallel-system-architecture)
3. [Week 0: Infrastructure Foundation](#week-0-infrastructure-foundation)
4. [Design System & Aesthetics](#design-system--aesthetics)
5. [Technical Architecture](#technical-architecture)
6. [8-Phase Implementation](#8-phase-implementation)
7. [Testing Strategy](#testing-strategy)
8. [Observability & Monitoring](#observability--monitoring)
9. [Quality Gates & Governance](#quality-gates--governance)
10. [Risk Management](#risk-management)
11. [Migration & Rollout](#migration--rollout)
12. [Success Metrics](#success-metrics)

---

## 🎯 Project Principles

### Intent-First Philosophy

Every architectural decision traces back to user value and system sustainability:

| Principle | Implementation | Why It Matters |
|-----------|---------------|----------------|
| **Investigate Before Rebuild** | API schema diffing, feature parity matrix | Prevents silent regressions |
| **Preserve Value While Evolving** | Parallel dev, zero disruption to current app | Protects existing users |
| **Measured Optimization** | Performance budgets, instrumentation | Evidence-driven improvements |
| **Layered Responsibility** | Boundary linting, generated types | Maintainable architecture |
| **User-Centric Outcomes** | Task completion metrics, error rates | Focus on experience quality |

### Core Commitments

1. **No Breaking Changes** - Current app untouched until cutover
2. **Backend Compatibility** - Works with all existing APIs + extensions
3. **Comprehensive Testing** - Shift-left quality, not after-thought
4. **Documentation First** - ADRs, architecture docs, runbooks
5. **Performance Budgets** - Enforced in CI, not optional
6. **Accessibility Built-In** - WCAG AA from Phase 1, not Phase 6

---

## 🏗️ Parallel System Architecture

### Directory Structure

```
photo-search-intent-first/
├── webapp/                    # Current frontend (UNTOUCHED)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts        # Port: 5173
│
├── webapp-v2/                 # New frontend (PARALLEL)
│   ├── src/
│   │   ├── app/              # App bootstrap
│   │   ├── features/         # Domain features
│   │   ├── components/       # Shared components
│   │   ├── lib/              # Utilities
│   │   ├── stores/           # Client state
│   │   ├── types/            # TypeScript types
│   │   ├── generated/        # Generated code (API types)
│   │   └── styles/           # Global styles
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── docs/
│   │   ├── ADR/              # Architecture decisions
│   │   ├── api/              # API integration
│   │   └── components/       # Component docs
│   ├── scripts/              # Build/dev scripts
│   ├── tokens/               # Design tokens
│   ├── package.json
│   ├── vite.config.ts        # Port: 5174
│   └── tsconfig.json         # Strict mode
│
├── api/                       # Backend (SHARED)
│   ├── server.py
│   ├── routers/
│   ├── openapi.yaml          # Generated schema
│   └── ...
│
└── electron/                  # Electron (SHARED)
    └── ...
```

### Port Allocation

```typescript
// Environment configuration
const ports = {
  // Current system
  backend: 8000,
  webappOld: 5173,

  // New system (parallel)
  webappNew: 5174,
  storybook: 6006,
};

// Both frontends connect to same backend
const API_BASE = 'http://localhost:8000';
```

### Safety Mechanisms

#### 1. **Complete Isolation**
```bash
# Current app continues running
cd webapp && npm run dev  # :5173

# New app develops separately
cd webapp-v2 && npm run dev  # :5174

# Zero interference between them
```

#### 2. **Shared Backend Compatibility**
```typescript
// Both frontends use identical API client
// Backend supports both simultaneously
const apiClient = axios.create({
  baseURL: process.env.API_BASE || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// Frontend-version header for analytics
apiClient.interceptors.request.use((config) => {
  config.headers['X-Frontend-Version'] = 'v2';
  return config;
});
```

#### 3. **Independent Data Storage**
```typescript
// Separate localStorage namespaces
const STORAGE_PREFIX = 'photosearch-v2';

const storage = {
  set: (key: string, value: unknown) => {
    localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
  },
  get: (key: string) => {
    const item = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    return item ? JSON.parse(item) : null;
  },
};
```

#### 4. **Rollback Safety**
```bash
# If issues arise, instant rollback
mv webapp webapp-backup
mv webapp-old webapp
# Current app restored in seconds
```

---

## 🛠️ Week 0: Infrastructure Foundation

**Goal**: Set up all infrastructure before Phase 1 coding begins. This prevents technical debt and ensures quality from line 1.

### Checklist

#### Project Setup
- [ ] Initialize `webapp-v2/` directory
- [ ] Install Vite + React 18.2 + TypeScript 5.3
- [ ] Configure `tsconfig.json` (strict mode)
- [ ] Setup Git workflow (branch strategy)
- [ ] Create `.env.example` with all variables

#### Design System Foundation
- [ ] Install complete shadcn/ui (45+ components)
- [ ] Configure Tailwind CSS 3.4+
- [ ] Create design tokens JSON structure
- [ ] Setup Style Dictionary pipeline
- [ ] Document color system + typography

#### Code Quality Tools
- [ ] Configure ESLint (strict rules)
- [ ] Configure Prettier
- [ ] Install `eslint-plugin-boundaries`
- [ ] Setup pre-commit hooks (Husky)
- [ ] Configure `lint-staged`

#### Type Safety Infrastructure
- [ ] Backend: Export OpenAPI schema
- [ ] Install `openapi-typescript`
- [ ] Create `scripts/generate-types.sh`
- [ ] Add `types:generate` npm script
- [ ] Test type generation works

#### Performance Budgets
- [ ] Install `size-limit`
- [ ] Create `.size-limit.js` config
- [ ] Set bundle size targets
- [ ] Add `size` npm script
- [ ] Create baseline snapshot

#### Testing Setup
- [ ] Install Vitest + React Testing Library
- [ ] Install Playwright for E2E
- [ ] Install `axe-core` + `jest-axe`
- [ ] Create test utilities
- [ ] Setup coverage thresholds

#### CI/CD Pipeline
- [ ] Create `.github/workflows/ci.yml`
- [ ] Add lint stage
- [ ] Add type-check stage
- [ ] Add test stage
- [ ] Add bundle-size stage
- [ ] Add accessibility stage
- [ ] Setup status badges

#### Observability Infrastructure
- [ ] Create error taxonomy (`lib/errors/`)
- [ ] Setup structured logging (`lib/logging/`)
- [ ] Create analytics event schema
- [ ] Add performance mark utilities
- [ ] Setup error boundary template

#### Documentation
- [ ] Create ADR template
- [ ] Setup Storybook (optional)
- [ ] Create README.md
- [ ] Document local setup
- [ ] Create CONTRIBUTING.md

### Implementation Details

#### 1. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",

    // Strict mode (all enabled)
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,

    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/lib/*": ["src/lib/*"],
      "@/features/*": ["src/features/*"]
    },

    // Output
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

#### 2. ESLint Configuration

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
  plugins: ['react-refresh', 'boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'app', pattern: 'app/*' },
      { type: 'features', pattern: 'features/*' },
      { type: 'components', pattern: 'components/*' },
      { type: 'lib', pattern: 'lib/*' },
    ],
  },
  rules: {
    // No console.log in production
    'no-console': ['error', { allow: ['warn', 'error'] }],

    // TypeScript strictness
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // React
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    // Architecture boundaries
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        { from: 'app', allow: ['features', 'components', 'lib'] },
        { from: 'features', allow: ['components', 'lib'] },
        { from: 'components', allow: ['lib'] },
        { from: 'lib', allow: ['lib'] },
      ],
    }],
  },
};
```

#### 3. OpenAPI Type Generation

```bash
#!/bin/bash
# scripts/generate-types.sh

set -e

echo "🔄 Generating TypeScript types from OpenAPI schema..."

# Step 1: Extract OpenAPI schema from FastAPI
cd ../api
python3 -c "
from server import app
import json
schema = app.openapi()
with open('openapi.yaml', 'w') as f:
    import yaml
    yaml.dump(schema, f)
" || {
    echo "❌ Failed to extract OpenAPI schema"
    exit 1
}

# Step 2: Generate TypeScript types
cd ../webapp-v2
npx openapi-typescript ../api/openapi.yaml -o src/generated/api.ts

echo "✅ Types generated successfully at src/generated/api.ts"

# Step 3: Verify compilation
npx tsc --noEmit

echo "✅ Type generation complete!"
```

```json
// package.json scripts
{
  "scripts": {
    "types:generate": "bash scripts/generate-types.sh",
    "types:check": "tsc --noEmit",
    "predev": "npm run types:generate"
  }
}
```

#### 4. Size Limit Configuration

```javascript
// .size-limit.js
module.exports = [
  {
    name: 'Main Bundle',
    path: 'dist/assets/index-*.js',
    limit: '150 KB',
    gzip: true,
  },
  {
    name: 'Vendor Bundle',
    path: 'dist/assets/vendor-*.js',
    limit: '100 KB',
    gzip: true,
  },
  {
    name: 'Total Initial',
    path: 'dist/**/*.{js,css}',
    limit: '250 KB',
    gzip: true,
    ignore: ['**/*lazy*.js'], // Exclude lazy-loaded chunks
  },
];
```

#### 5. CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: webapp-v2/package-lock.json

      - name: Install dependencies
        working-directory: webapp-v2
        run: npm ci

      - name: Lint
        working-directory: webapp-v2
        run: npm run lint

      - name: Type check
        working-directory: webapp-v2
        run: npm run types:check

      - name: Unit tests
        working-directory: webapp-v2
        run: npm run test:coverage

      - name: Check bundle size
        working-directory: webapp-v2
        run: npm run size

      - name: Accessibility audit
        working-directory: webapp-v2
        run: npm run test:a11y

      - name: Build
        working-directory: webapp-v2
        run: npm run build

      - name: E2E tests
        working-directory: webapp-v2
        run: npm run test:e2e

  lighthouse:
    runs-on: ubuntu-latest
    needs: quality

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: webapp-v2
        run: npm ci

      - name: Build
        working-directory: webapp-v2
        run: npm run build

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:5174
          uploadArtifacts: true
          temporaryPublicStorage: true
```

#### 6. Design Tokens Structure

```json
// tokens/core.json
{
  "color": {
    "brand": {
      "primary": { "value": "#3b82f6" },
      "primary-foreground": { "value": "#ffffff" }
    },
    "semantic": {
      "success": { "value": "#10b981" },
      "warning": { "value": "#f59e0b" },
      "error": { "value": "#ef4444" },
      "info": { "value": "#3b82f6" }
    }
  },
  "spacing": {
    "xs": { "value": "0.25rem" },
    "sm": { "value": "0.5rem" },
    "md": { "value": "1rem" },
    "lg": { "value": "1.5rem" },
    "xl": { "value": "2rem" }
  },
  "typography": {
    "size": {
      "xs": { "value": "0.75rem" },
      "sm": { "value": "0.875rem" },
      "base": { "value": "1rem" },
      "lg": { "value": "1.125rem" },
      "xl": { "value": "1.25rem" }
    }
  }
}
```

```javascript
// scripts/build-tokens.js
const StyleDictionary = require('style-dictionary');

const sd = StyleDictionary.extend({
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables',
      }],
    },
  },
});

sd.buildAllPlatforms();
```

#### 7. Error Taxonomy

```typescript
// lib/errors/taxonomy.ts
export const ErrorCodes = {
  // Search errors (1xx)
  SEARCH_FAILED: 'SEARCH_001',
  SEARCH_TIMEOUT: 'SEARCH_002',
  INVALID_QUERY: 'SEARCH_003',

  // Image errors (2xx)
  IMAGE_LOAD_FAILED: 'IMG_001',
  IMAGE_DECODE_FAILED: 'IMG_002',
  THUMBNAIL_MISSING: 'IMG_003',

  // API errors (3xx)
  API_UNREACHABLE: 'API_001',
  API_TIMEOUT: 'API_002',
  API_UNAUTHORIZED: 'API_003',

  // State errors (4xx)
  INVALID_STATE: 'STATE_001',
  STORAGE_FULL: 'STATE_002',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

```typescript
// lib/logging/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  code?: string;
  userId?: string;
  feature?: string;
  [key: string]: unknown;
}

class Logger {
  private isDev = import.meta.env.DEV;

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (this.isDev) {
      console[level](message, context);
    } else {
      // Send to observability service
      this.sendToObservability(logEntry);
    }
  }

  private sendToObservability(entry: unknown) {
    // Send to Sentry, Datadog, etc.
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
```

### Week 0 Success Criteria

Before moving to Phase 1, verify:

- ✅ `npm run dev` starts app on :5174
- ✅ `npm run lint` passes with 0 errors
- ✅ `npm run types:check` passes
- ✅ `npm run types:generate` works
- ✅ `npm run test` runs (even if 0 tests)
- ✅ `npm run size` shows baseline
- ✅ CI pipeline passes
- ✅ Storybook loads (if using)
- ✅ All documentation present

---

## 🎨 Design System & Aesthetics

### Visual Design Language

#### Color System

```css
/* Light Mode - Elegant & Professional */
:root {
  /* Brand colors */
  --color-primary: 220 70% 50%;
  --color-primary-foreground: 0 0% 100%;

  /* Accent colors */
  --color-accent: 280 65% 60%;
  --color-accent-foreground: 0 0% 100%;

  /* Semantic colors */
  --color-success: 142 76% 36%;
  --color-warning: 38 92% 50%;
  --color-error: 0 84% 60%;

  /* Neutral scale */
  --color-background: 0 0% 100%;
  --color-foreground: 222 47% 11%;
  --color-muted: 210 40% 96%;
  --color-muted-foreground: 215 16% 47%;

  /* Borders & surfaces */
  --color-border: 214 32% 91%;
  --color-card: 0 0% 100%;
  --color-popover: 0 0% 100%;
}

/* Dark Mode - Premium & Comfortable */
.dark {
  --color-primary: 220 70% 55%;
  --color-primary-foreground: 0 0% 100%;

  --color-accent: 280 65% 65%;
  --color-accent-foreground: 0 0% 100%;

  --color-success: 142 76% 40%;
  --color-warning: 38 92% 55%;
  --color-error: 0 84% 65%;

  --color-background: 222 47% 11%;
  --color-foreground: 210 40% 98%;
  --color-muted: 217 33% 17%;
  --color-muted-foreground: 215 20% 65%;

  --color-border: 217 33% 17%;
  --color-card: 222 47% 11%;
  --color-popover: 222 47% 11%;
}
```

#### Typography

```css
/* Type scale (Perfect Fourth - 1.333) */
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.333rem;    /* 21px */
  --text-2xl: 1.777rem;   /* 28px */
  --text-3xl: 2.369rem;   /* 38px */
  --text-4xl: 3.157rem;   /* 50px */

  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

#### Motion Design

```typescript
// lib/animation/easing.ts
export const easing = {
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  snappy: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

export const duration = {
  instant: 100,
  fast: 200,
  base: 300,
  slow: 500,
  slower: 700,
} as const;
```

```css
/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Component Aesthetic Guidelines

#### Photo Grid (Google Photos Inspired)

```typescript
// features/library/components/PhotoGrid.tsx
interface PhotoGridProps {
  photos: Photo[];
  columnWidth?: number;
  gap?: number;
}

export const PhotoGrid = ({ photos, columnWidth = 250, gap = 16 }: PhotoGridProps) => {
  return (
    <PhotoAlbum
      photos={photos}
      layout="rows"
      spacing={gap}
      targetRowHeight={columnWidth}
      renderPhoto={({ photo, wrapperStyle, renderDefaultPhoto }) => (
        <motion.div
          style={wrapperStyle}
          whileHover={{ scale: 1.02, zIndex: 10 }}
          transition={{ duration: 0.2 }}
        >
          <PhotoCard photo={photo} />
        </motion.div>
      )}
    />
  );
};
```

#### Search Bar (Linear/Notion Inspired)

```typescript
// features/search/components/SearchBar.tsx
export const SearchBar = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger */}
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span className="text-muted-foreground">Search photos...</span>
        </div>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Command Palette */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search photos..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>Recent photos</CommandItem>
            <CommandItem>Favorites</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};
```

#### Lightbox (Premium Experience)

```typescript
// components/media/Lightbox.tsx
export const Lightbox = ({ photo, onClose }: LightboxProps) => {
  const [scale, setScale] = useState(1);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] h-screen p-0 bg-black/95">
        {/* Image viewer */}
        <motion.div
          className="flex items-center justify-center w-full h-full"
          style={{ scale }}
          drag
          dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <img
            src={photo.url}
            alt={photo.title}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </motion.div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 bg-background/80 backdrop-blur-lg rounded-lg p-2">
          <Button size="icon" variant="ghost" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setScale(1)}>
            Reset
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setScale(s => Math.min(3, s + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 🏛️ Technical Architecture

### State Management Strategy

#### 1. Server State (React Query)

All API data managed by React Query for automatic caching, revalidation, and optimistic updates.

```typescript
// lib/api/client.ts
import axios from 'axios';
import type { paths } from '@/generated/api';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('api_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Type-safe API calls
export type SearchResponse = paths['/v1/search']['post']['responses']['200']['content']['application/json'];

export const searchApi = {
  search: async (params: SearchParams): Promise<SearchResponse> => {
    const { data } = await apiClient.post('/v1/search', params);
    return data;
  },
};
```

```typescript
// features/search/hooks/useSearch.ts
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api';

export const useSearch = (query: string, filters: SearchFilters) => {
  return useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => searchApi.search({ query, ...filters }),
    enabled: query.length > 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
    retry: 2,
  });
};
```

```typescript
// Optimistic updates for mutations
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) => api.toggleFavorite(photoId),

    onMutate: async (photoId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['photos'] });

      // Snapshot previous value
      const previousPhotos = queryClient.getQueryData(['photos']);

      // Optimistically update
      queryClient.setQueryData(['photos'], (old: Photo[]) =>
        old.map(p => p.id === photoId ? { ...p, favorite: !p.favorite } : p)
      );

      return { previousPhotos };
    },

    onError: (err, photoId, context) => {
      // Rollback on error
      queryClient.setQueryData(['photos'], context?.previousPhotos);
      logger.error('Failed to toggle favorite', { code: ErrorCodes.API_ERROR, photoId });
    },

    onSettled: () => {
      // Refetch after success or error
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
};
```

#### 2. Client State (Zustand)

UI state, preferences, and selection managed by Zustand stores.

```typescript
// stores/uiStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  // State
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  gridSize: 'small' | 'medium' | 'large';
  viewMode: 'grid' | 'list' | 'timeline' | 'map';

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: UIStore['theme']) => void;
  setGridSize: (size: UIStore['gridSize']) => void;
  setViewMode: (mode: UIStore['viewMode']) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Initial state
      sidebarOpen: true,
      theme: 'system',
      gridSize: 'medium',
      viewMode: 'grid',

      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setGridSize: (size) => set({ gridSize: size }),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'photosearch-v2-ui',
    }
  )
);
```

```typescript
// stores/selectionStore.ts
import { create } from 'zustand';

interface SelectionStore {
  // State
  selected: Set<string>;
  selectionMode: boolean;

  // Actions
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selected: new Set(),
  selectionMode: false,

  select: (id) => set((state) => ({
    selected: new Set([...state.selected, id]),
  })),

  deselect: (id) => set((state) => {
    const newSelected = new Set(state.selected);
    newSelected.delete(id);
    return { selected: newSelected };
  }),

  toggleSelect: (id) => set((state) => {
    const newSelected = new Set(state.selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    return { selected: newSelected };
  }),

  selectAll: (ids) => set({ selected: new Set(ids) }),

  clearSelection: () => set({ selected: new Set(), selectionMode: false }),

  enterSelectionMode: () => set({ selectionMode: true }),

  exitSelectionMode: () => set({ selectionMode: false, selected: new Set() }),
}));
```

#### 3. Form State (React Hook Form + Zod)

```typescript
// features/search/components/FilterForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const filterSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).default([]),
  camera: z.string().optional(),
  focalLengthMin: z.number().min(0).optional(),
  focalLengthMax: z.number().max(1000).optional(),
});

type FilterFormData = z.infer<typeof filterSchema>;

export const FilterForm = ({ onSubmit }: FilterFormProps) => {
  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      tags: [],
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    // Type-safe submission
    onSubmit(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="dateFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields... */}
      </form>
    </Form>
  );
};
```

#### 4. URL State (React Router)

```typescript
// hooks/useSearchParams.ts
import { useSearchParams as useRouterSearchParams } from 'react-router-dom';

export const useTypedSearchParams = () => {
  const [searchParams, setSearchParams] = useRouterSearchParams();

  return {
    query: searchParams.get('q') || '',
    view: searchParams.get('view') as ViewMode || 'grid',
    filters: {
      dateFrom: searchParams.get('from'),
      dateTo: searchParams.get('to'),
      tags: searchParams.getAll('tag'),
    },

    updateQuery: (query: string) => {
      setSearchParams((prev) => {
        prev.set('q', query);
        return prev;
      });
    },

    updateView: (view: ViewMode) => {
      setSearchParams((prev) => {
        prev.set('view', view);
        return prev;
      });
    },
  };
};
```

### Performance Architecture

#### 1. Code Splitting

```typescript
// app/Router.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Route-based splitting
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const LibraryPage = lazy(() => import('@/features/library/LibraryPage'));
const CollectionsPage = lazy(() => import('@/features/collections/CollectionsPage'));
const MapPage = lazy(() => import('@/features/map/MapPage'));
const PeoplePage = lazy(() => import('@/features/people/PeoplePage'));

// Component-based splitting for heavy features
const Lightbox = lazy(() => import('@/components/media/Lightbox'));
const VideoPlayer = lazy(() => import('@/components/media/VideoPlayer'));

export const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/people" element={<PeoplePage />} />
      </Routes>
    </Suspense>
  );
};

// Preload on hover for instant navigation
export const NavLink = ({ to, children }: NavLinkProps) => {
  const handleMouseEnter = () => {
    // Preload route component
    switch (to) {
      case '/search':
        import('@/features/search/SearchPage');
        break;
      case '/map':
        import('@/features/map/MapPage');
        break;
    }
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
};
```

#### 2. Virtual Scrolling

```typescript
// components/media/VirtualPhotoGrid.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export const VirtualPhotoGrid = ({ photos }: { photos: Photo[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: photos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250,
    overscan: 5,
    // Measure actual rendered size for accuracy
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <PhotoCard photo={photos[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 3. Image Optimization

```typescript
// components/media/OptimizedImage.tsx
import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  placeholder?: string;
}

export const OptimizedImage = ({ src, alt, placeholder }: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative aspect-square overflow-hidden bg-muted">
      {/* Blur placeholder */}
      {isLoading && placeholder && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
          aria-hidden="true"
        />
      )}

      {/* Loading skeleton */}
      {isLoading && !placeholder && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoading(false)}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
      />
    </div>
  );
};
```

#### 4. Bundle Optimization

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'brotliCompress' }),
    visualizer({ filename: 'stats.html' }),
  ],

  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,

    rollupOptions: {
      output: {
        manualChunks: {
          // Core dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query', 'axios'],
          'vendor-ui': ['framer-motion', 'lucide-react'],

          // Heavy features (lazy-loaded)
          'feature-map': [/features\/map/],
          'feature-editing': [/features\/editing/],
          'feature-video': [/features\/video/],
        },

        // Optimize chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // Warning limits
    chunkSizeWarningLimit: 500,
  },

  // Dev server
  server: {
    port: 5174,
    strictPort: true,
  },
});
```

---

## 📅 8-Phase Implementation

### Phase 1: Foundation (Week 1)

**Goal**: Complete infrastructure and core navigation

**Tasks**:
- [x] Week 0 infrastructure (from above)
- [ ] Create app shell layout
- [ ] Implement sidebar navigation
- [ ] Build top bar with search
- [ ] Add command palette (Cmd+K)
- [ ] Implement theme toggle
- [ ] Setup routing structure
- [ ] Create error boundaries
- [ ] Add loading states
- [ ] Build empty states

**Deliverables**:
- ✅ App shell functional
- ✅ Navigation works
- ✅ Theme switching works
- ✅ Command palette works
- ✅ All routes defined
- ✅ Error boundaries catch errors

**Quality Gates**:
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors
- [ ] Axe: 0 serious violations
- [ ] Bundle: Within 20% of target
- [ ] Lighthouse Performance: >70
- [ ] All links accessible via keyboard

**Exit Criteria**:
- [ ] Can navigate all views
- [ ] Theme persists on reload
- [ ] Keyboard shortcuts work
- [ ] Error boundary catches test error
- [ ] CI pipeline green

### Phase 2: Core Photo Features (Week 2)

**Goal**: Photo grid, search, and lightbox viewer

**Tasks**:
- [ ] **Photo Grid**:
  - [ ] Implement justified layout
  - [ ] Add virtual scrolling
  - [ ] Lazy load images
  - [ ] Hover effects
  - [ ] Selection mode
  - [ ] Grid size controls

- [ ] **Search**:
  - [ ] Search bar with autocomplete
  - [ ] AI-powered suggestions
  - [ ] Recent searches
  - [ ] Filter panel
  - [ ] Removable filter chips
  - [ ] Connect to backend API

- [ ] **Lightbox**:
  - [ ] Fullscreen viewer
  - [ ] Keyboard navigation
  - [ ] Pinch zoom (mobile)
  - [ ] EXIF metadata panel
  - [ ] Share button
  - [ ] Delete with confirmation

- [ ] **Library View**:
  - [ ] Infinite scroll
  - [ ] Date grouping
  - [ ] Sort options
  - [ ] Empty state

**Deliverables**:
- ✅ Can browse photo library
- ✅ Can search photos
- ✅ Can view photo details
- ✅ 60fps scrolling

**Quality Gates**:
- [ ] Search latency <200ms (P95)
- [ ] Grid renders 1000 photos smoothly
- [ ] Image load time <300ms
- [ ] Lighthouse Performance: >80
- [ ] Contract tests pass (search API)
- [ ] Web Vitals instrumented

**Exit Criteria**:
- [ ] All core photo features work
- [ ] Performance targets met
- [ ] Unit tests: >70% coverage
- [ ] E2E: Search flow passes

### Phase 3: Organization & Collections (Week 3)

**Goal**: Collections, tags, favorites, trips

**Tasks**:
- [ ] **Collections**:
  - [ ] Collection grid view
  - [ ] Create collection modal
  - [ ] Edit collection
  - [ ] Delete collection
  - [ ] Drag-and-drop photos
  - [ ] Cover photo selection

- [ ] **Smart Collections**:
  - [ ] Rule builder UI
  - [ ] Live preview
  - [ ] Preset templates
  - [ ] Auto-update logic

- [ ] **Tags**:
  - [ ] Tag manager
  - [ ] Tag autocomplete
  - [ ] Batch tag editor
  - [ ] Tag filter
  - [ ] Tag colors

- [ ] **Favorites**:
  - [ ] Quick favorite toggle
  - [ ] Favorites view
  - [ ] Batch favorite

- [ ] **Trips**:
  - [ ] Trip timeline
  - [ ] Auto-detect trips
  - [ ] Trip map integration
  - [ ] Cover selection

**Deliverables**:
- ✅ Full organization system
- ✅ Collections functional
- ✅ Tags work
- ✅ Trips auto-detect

**Quality Gates**:
- [ ] Event taxonomy introduced
- [ ] Analytics validation script
- [ ] Design tokens frozen (v1)
- [ ] Visual regression tests added
- [ ] Resilience tests (offline mode)

**Exit Criteria**:
- [ ] Can create/manage collections
- [ ] Smart collections auto-update
- [ ] Tagging works end-to-end
- [ ] Trips display correctly

### Phase 4: Advanced Features (Week 4)

**Goal**: People, map, discovery, editing

**Tasks**:
- [ ] **People/Faces**:
  - [ ] Face grid
  - [ ] Cluster viewer
  - [ ] Name faces
  - [ ] Find similar
  - [ ] Face timeline

- [ ] **Map View**:
  - [ ] Interactive map
  - [ ] Photo markers
  - [ ] Geo-clustering
  - [ ] Location search
  - [ ] Map timeline

- [ ] **Discovery**:
  - [ ] Recommendations
  - [ ] Smart suggestions
  - [ ] "On this day"
  - [ ] Mood-based
  - [ ] Serendipity

- [ ] **Photo Editing**:
  - [ ] Crop tool
  - [ ] Rotate/flip
  - [ ] Filters
  - [ ] Adjustments
  - [ ] Edit history
  - [ ] Revert

**Deliverables**:
- ✅ Face recognition UI
- ✅ Map view works
- ✅ Discovery functional
- ✅ Basic editing tools

**Quality Gates**:
- [ ] Map stress test (1000+ markers)
- [ ] Image decode timing metric
- [ ] Editing undo architecture ADR
- [ ] Memory snapshot measurement

**Exit Criteria**:
- [ ] Map handles 1000+ photos
- [ ] Face clustering displays
- [ ] Discovery recommendations load
- [ ] Editing saves changes

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
  - [ ] Shortcuts panel

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

**Quality Gates**:
- [ ] Feature flags finalized
- [ ] Role/permission patterns (future)
- [ ] User timing marks added

**Exit Criteria**:
- [ ] Batch select 100+ photos
- [ ] Settings save/load
- [ ] Diagnostics display metrics

### Phase 6: Polish & Optimization (Week 6)

**Goal**: Animations, edge cases, security

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
  - [ ] Large libraries
  - [ ] No results
  - [ ] API errors

- [ ] **Security**:
  - [ ] CSP headers
  - [ ] Dependency audit
  - [ ] Secret scanning
  - [ ] Input sanitization

**Deliverables**:
- ✅ Smooth animations
- ✅ Great loading states
- ✅ Handles edge cases
- ✅ Security hardened

**Quality Gates**:
- [ ] Security headers added
- [ ] CSP tested
- [ ] Offline degradation UX
- [ ] Full a11y audit (should near-pass)
- [ ] Color contrast CI script

**Exit Criteria**:
- [ ] All animations respect reduced-motion
- [ ] Offline mode functional
- [ ] Security scan passes
- [ ] Accessibility: 0 critical issues

### Phase 7: Testing & Quality (Week 7)

**Goal**: Comprehensive testing, performance optimization

**Tasks**:
- [ ] **Unit Tests**:
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

- [ ] **E2E Tests**:
  - [ ] Critical paths
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
- ✅ Lighthouse >90
- ✅ Bundle <250KB gzipped

**Quality Gates**:
- [ ] Performance regression baselines frozen
- [ ] Contract coverage report
- [ ] Resilience chaos tests
- [ ] All quality metrics green

**Exit Criteria**:
- [ ] Coverage targets met
- [ ] 0 flaky tests
- [ ] Performance budgets met
- [ ] Cross-browser tested

### Phase 8: Launch Prep (Week 8)

**Goal**: Documentation, deployment, migration

**Tasks**:
- [ ] **Documentation**:
  - [ ] Component docs
  - [ ] API guide
  - [ ] User guide
  - [ ] Developer guide
  - [ ] Architecture docs

- [ ] **Deployment**:
  - [ ] Production build
  - [ ] CI/CD pipeline
  - [ ] A/B test setup
  - [ ] Analytics integration
  - [ ] Error monitoring

- [ ] **Migration**:
  - [ ] Feature parity check
  - [ ] Data migration
  - [ ] Settings migration
  - [ ] Rollout plan

**Deliverables**:
- ✅ Full documentation
- ✅ Production ready
- ✅ Migration plan
- ✅ Launch checklist

**Quality Gates**:
- [ ] Parity scoreboard published
- [ ] Rollout playbook (abort criteria)
- [ ] Post-launch SLO doc
- [ ] All ADRs complete

**Exit Criteria**:
- [ ] Documentation complete
- [ ] Production deployment successful
- [ ] Migration tested
- [ ] Rollback plan documented

---

## 🧪 Testing Strategy

### Test Pyramid

```
         /\
        /E2E\         ← 10% (Critical paths)
       /------\
      /Integration\   ← 20% (Feature flows)
     /------------\
    /    Unit      \  ← 70% (Functions, hooks, components)
   /________________\
```

### Layer Test Matrix

| Layer | Tests | Tools | Coverage Target | Phase |
|-------|-------|-------|----------------|-------|
| **Types/Contracts** | OpenAPI diff, type generation | openapi-typescript, vitest | 100% API coverage | 1 |
| **Units** | Utils, hooks, store reducers | Vitest | 80% | All |
| **Components** | UI, interactions, a11y | RTL, jest-axe | 70% | 2+ |
| **Integration** | Search, grid, editing flows | RTL, MSW | 60% | 2+ |
| **Contract** | API schema compatibility | Custom scripts | 100% endpoints | 2+ |
| **Performance** | Grid render, search latency | Playwright | Baseline regression | 2+ |
| **Visual** | Layout, grid, lightbox | Percy/Chromatic | Critical screens | 3+ |
| **Resilience** | Offline, slow network | MSW, Playwright | Key flows | 3+ |
| **Security** | Dependencies, secrets | Trivy, ESLint | 0 high/critical | 1+ |
| **Accessibility** | Axe, keyboard nav | axe-core, pa11y | 0 serious | All |

### Definition of Done (Every PR)

- [ ] TypeScript: 0 errors, no `any` added
- [ ] ESLint: 0 errors, 0 warnings
- [ ] Unit tests for new logic
- [ ] Storybook entry (if visual component)
- [ ] Axe: 0 serious violations
- [ ] Size impact justified if >2KB gz added
- [ ] Telemetry events follow schema
- [ ] ADR if architectural change
- [ ] Documentation updated

### Example Tests

#### Unit Test

```typescript
// features/search/hooks/useSearch.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSearch } from './useSearch';

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSearch', () => {
  it('should not fetch when query is too short', () => {
    const { result } = renderHook(
      () => useSearch('ab', {}),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
  });

  it('should fetch when query is long enough', async () => {
    const { result } = renderHook(
      () => useSearch('sunset', {}),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

#### Component Test with A11y

```typescript
// components/media/PhotoCard.test.tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PhotoCard } from './PhotoCard';

expect.extend(toHaveNoViolations);

describe('PhotoCard', () => {
  const mockPhoto = {
    id: '1',
    url: 'https://example.com/photo.jpg',
    title: 'Test Photo',
  };

  it('should render photo with alt text', () => {
    render(<PhotoCard photo={mockPhoto} />);

    const img = screen.getByAltText('Test Photo');
    expect(img).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<PhotoCard photo={mockPhoto} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

#### E2E Test

```typescript
// tests/e2e/search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test('should search and display results', async ({ page }) => {
    await page.goto('/');

    // Open command palette
    await page.keyboard.press('Meta+K');
    await expect(page.getByPlaceholder('Search photos...')).toBeVisible();

    // Enter search query
    await page.getByPlaceholder('Search photos...').fill('sunset');
    await page.keyboard.press('Enter');

    // Verify results
    await expect(page).toHaveURL(/search\?q=sunset/);
    await expect(page.getByRole('img')).toHaveCount({ minimum: 1 });
  });

  test('should handle no results', async ({ page }) => {
    await page.goto('/search?q=nonexistentquery12345');

    await expect(page.getByText('No photos found')).toBeVisible();
  });
});
```

#### Performance Test

```typescript
// tests/performance/grid.spec.ts
import { test, expect } from '@playwright/test';

test('photo grid should render smoothly', async ({ page }) => {
  await page.goto('/library');

  // Start performance measurement
  await page.evaluate(() => {
    performance.mark('grid-start');
  });

  // Wait for grid to load
  await page.waitForSelector('[data-testid="photo-grid"]');

  // End performance measurement
  const metrics = await page.evaluate(() => {
    performance.mark('grid-end');
    performance.measure('grid-render', 'grid-start', 'grid-end');
    const measure = performance.getEntriesByName('grid-render')[0];
    return {
      duration: measure.duration,
      cls: performance.getEntriesByType('layout-shift'),
    };
  });

  // Assert performance
  expect(metrics.duration).toBeLessThan(1000); // < 1s
  expect(metrics.cls.length).toBeLessThan(5); // Minimal layout shift
});
```

---

## 📊 Observability & Monitoring

### Structured Logging

```typescript
// lib/logging/logger.ts
interface LogContext {
  code?: ErrorCode;
  feature?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...context,
    };

    if (import.meta.env.DEV) {
      console[level](message, context);
    } else {
      // Send to observability service (Sentry, Datadog, etc.)
      this.sendToObservability(entry);
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
```

### Performance Instrumentation

```typescript
// lib/perf/usePerfMark.ts
export function usePerfMark(label: string) {
  useEffect(() => {
    const startMark = `${label}-start`;
    const endMark = `${label}-end`;

    performance.mark(startMark);

    return () => {
      performance.mark(endMark);
      performance.measure(label, startMark, endMark);

      const measure = performance.getEntriesByName(label)[0];
      if (measure) {
        // Send to analytics
        track('performance_measure', {
          label,
          duration: measure.duration,
        });
      }
    };
  }, [label]);
}

// Usage
export const SearchPage = () => {
  usePerfMark('search-page-render');

  // Component logic...
};
```

### Web Vitals

```typescript
// lib/perf/webVitals.ts
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

export function initWebVitals() {
  const sendToAnalytics = (metric: Metric) => {
    track('web_vital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    });
  };

  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

// Call in main.tsx
initWebVitals();
```

### Analytics Event Schema

```typescript
// lib/analytics/events.ts
export const EventSchema = {
  // Search events
  SEARCH_EXECUTED: {
    version: 1,
    properties: {
      query: 'string',
      queryLength: 'number',
      filtersApplied: 'number',
      latencyMs: 'number',
      resultsCount: 'number',
    },
  },

  // Grid events
  GRID_RENDER_COMPLETE: {
    version: 1,
    properties: {
      photoCount: 'number',
      durationMs: 'number',
      viewMode: 'string',
    },
  },

  // Lightbox events
  LIGHTBOX_OPENED: {
    version: 1,
    properties: {
      source: 'string',
      photoId: 'string',
      preloadCount: 'number',
    },
  },

  // Collection events
  COLLECTION_CREATED: {
    version: 1,
    properties: {
      type: 'string', // 'manual' | 'smart'
      photoCount: 'number',
    },
  },
} as const;

type EventName = keyof typeof EventSchema;

type EventPayload<N extends EventName> = {
  [K in keyof typeof EventSchema[N]['properties']]:
    typeof EventSchema[N]['properties'][K] extends 'number' ? number :
    typeof EventSchema[N]['properties'][K] extends 'string' ? string :
    never;
};

export function track<N extends EventName>(
  name: N,
  payload: EventPayload<N>
) {
  // Validate schema at runtime (dev only)
  if (import.meta.env.DEV) {
    validateEventSchema(name, payload);
  }

  // Send to analytics service
  if (window.analytics) {
    window.analytics.track(name, payload);
  }
}

function validateEventSchema(name: EventName, payload: unknown) {
  const schema = EventSchema[name];
  // Validate payload matches schema...
}
```

### Error Boundary

```typescript
// app/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react';
import { logger } from '@/lib/logging';
import { ErrorCodes } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React error boundary caught error', {
      code: ErrorCodes.REACT_ERROR,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## ⚖️ Quality Gates & Governance

### Weekly Rituals

| Ritual | Cadence | Participants | Output |
|--------|---------|--------------|--------|
| Phase Kickoff | Weekly | Team | Goals, risks surfaced |
| Design System Sync | Weekly | Design, Dev | Token changes, debt list |
| Perf Regression Review | 2x/week | Dev | Bundle + vitals delta |
| A11y Sweep | Weekly | Dev, QA | Violations triaged |
| Observability Dashboard | Weekly | Team | Error breakdown |
| Tech Debt Triage | Bi-weekly | Team | Ranked debt queue |
| Launch Readiness Gate | Phase 7 end | All | Checklist sign-off |
| Post-Launch Review | +2 weeks | All | KPI delta, improvements |

### CI Pipeline Stages

```yaml
# .github/workflows/ci.yml (expanded)
stages:
  - lint        # ESLint, Prettier
  - types       # TypeScript strict check
  - test-unit   # Vitest unit tests
  - test-a11y   # Axe accessibility
  - test-e2e    # Playwright E2E
  - size        # Bundle size check
  - build       # Production build
  - lighthouse  # Performance audit
```

### Phase Exit Criteria Template

```markdown
# Phase N Exit Criteria

## Functional Requirements
- [ ] All features implemented
- [ ] Feature demos completed
- [ ] Edge cases handled

## Quality Requirements
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors
- [ ] Unit test coverage: >70%
- [ ] E2E tests: Critical paths pass
- [ ] Accessibility: 0 serious violations

## Performance Requirements
- [ ] Bundle within budget
- [ ] Lighthouse score: >X
- [ ] Core Web Vitals: Green
- [ ] Performance regression tests pass

## Documentation
- [ ] Component docs updated
- [ ] ADRs written (if applicable)
- [ ] User guide updated
- [ ] API integration docs current

## Security
- [ ] Dependency audit clean
- [ ] No secrets in code
- [ ] CSP configured (if applicable)

## Approval
- [ ] Team lead approval
- [ ] Design review (if UI changes)
- [ ] Product review (if UX changes)
```

---

## ⚠️ Risk Management

### Risk Register

| Risk | Probability | Impact | Mitigation | Early Warning Signal |
|------|------------|--------|------------|---------------------|
| **Scope creep** | Medium | High | Definition of Done, visual debt backlog | Phase 2 slips >1 week |
| **Bundle regression** | High | Medium | size-limit CI, PR diff comments | >5% bundle increase |
| **API evolution during dev** | Medium | High | Schema diff gate, contract tests | Unreviewed backend merges |
| **A11y debt accumulation** | High | High | Shift-left lint, CI axe | Spike in violations |
| **Performance degradation** | Medium | Medium | Stress tests, monitoring | FPS <50 in profiling |
| **Token sprawl** | Medium | Medium | Token registry, design review | >20 new vars/week |
| **Virtualization edge cases** | Medium | Medium | Synthetic tests | Scroll jank reports |
| **Operational blind spots** | Medium | High | Structured metrics, dashboards | Unclassified errors spike |
| **Migration data loss** | Low | Critical | Backup plan, rollback tested | User reports missing data |
| **Team velocity** | Medium | Medium | Buffer time, realistic estimates | 2 consecutive sprint misses |

### Mitigation Strategies

#### Bundle Size Creep
```json
// .github/workflows/size-limit.yml
- name: Check bundle size
  run: npm run size

- name: Comment on PR
  uses: andresz1/size-limit-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

#### API Schema Drift
```bash
# scripts/check-api-schema.sh
#!/bin/bash
set -e

# Extract current schema
python3 ../api/extract_schema.py > schema-current.yaml

# Compare with baseline
if ! diff schema-baseline.yaml schema-current.yaml; then
  echo "❌ API schema has changed! Review required."
  exit 1
fi

echo "✅ API schema unchanged"
```

#### Performance Monitoring
```typescript
// lib/monitoring/performanceObserver.ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 100) {
      logger.warn('Slow operation detected', {
        operation: entry.name,
        duration: entry.duration,
      });
    }
  }
});

observer.observe({ entryTypes: ['measure'] });
```

---

## 🚀 Migration & Rollout

### Pre-Launch Checklist

#### Feature Parity Verification
- [ ] All 11 views implemented
- [ ] Search functionality complete
- [ ] Collections management works
- [ ] Batch operations functional
- [ ] Settings/preferences migrate
- [ ] Keyboard shortcuts work
- [ ] Offline mode functional

#### Performance Verification
- [ ] Bundle <250KB gzipped
- [ ] Lighthouse >90 all categories
- [ ] Search latency <200ms (P95)
- [ ] Grid scrolling 60fps
- [ ] Image load <300ms
- [ ] No memory leaks

#### Quality Verification
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] Test coverage >70%
- [ ] All E2E tests pass
- [ ] 0 accessibility violations
- [ ] Cross-browser tested

#### Security Verification
- [ ] Dependency audit clean
- [ ] No secrets in code
- [ ] CSP configured
- [ ] Input sanitization
- [ ] XSS protections

#### Operational Verification
- [ ] Monitoring configured
- [ ] Error tracking active
- [ ] Analytics integrated
- [ ] Logging structured
- [ ] Alerts configured

### Rollout Strategies

#### Option 1: Feature Flag Gradual Rollout

```typescript
// lib/experiments/experiments.ts
export const useNewFrontend = () => {
  const userId = useUserId();
  const rolloutPercentage = 10; // Start with 10%

  // Deterministic assignment
  const hash = hashCode(userId);
  const bucket = hash % 100;

  return bucket < rolloutPercentage;
};

// Usage
const App = () => {
  const useV2 = useNewFrontend();

  useEffect(() => {
    if (useV2) {
      window.location.href = 'http://localhost:5174';
    }
  }, [useV2]);

  return <div>Redirecting...</div>;
};
```

#### Option 2: A/B Testing

```typescript
// lib/experiments/abTest.ts
export const getFrontendVariant = () => {
  const experiment = getExperiment('new-frontend-v2');
  return experiment.variant; // 'control' | 'treatment'
};

// Track metrics
track('frontend_loaded', {
  variant: getFrontendVariant(),
  loadTime: performance.now(),
});
```

#### Option 3: Hard Cutover

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Deploying new frontend..."

# Backup current
cp -r webapp webapp-backup-$(date +%Y%m%d)

# Deploy new
rm -rf webapp
cp -r webapp-v2 webapp

# Rebuild
cd webapp && npm ci && npm run build

echo "✅ Deployment complete!"
echo "⚠️  Rollback command: mv webapp-backup-YYYYMMDD webapp"
```

### Post-Launch Monitoring

#### Day 1-3: Intensive Monitoring

```markdown
## Critical Metrics (Check every hour)
- [ ] Error rate <1%
- [ ] Page load time <3s (P95)
- [ ] API error rate <0.5%
- [ ] Crash rate <0.1%

## User Experience Metrics
- [ ] Session duration comparable
- [ ] Feature usage comparable
- [ ] Task completion rate >95%

## Performance Metrics
- [ ] LCP <2.5s
- [ ] FID <100ms
- [ ] CLS <0.1

## Rollback Triggers
- Error rate >5%
- Crash rate >1%
- API errors >2%
- Multiple critical user reports
```

#### Week 1-2: Optimization

```markdown
## Optimization Targets
- [ ] Address top 5 errors
- [ ] Optimize slowest endpoints
- [ ] Fix UX friction points
- [ ] Improve conversion funnels

## User Feedback
- [ ] Review support tickets
- [ ] Analyze session replays
- [ ] Survey users
- [ ] Iterate on pain points
```

---

## 📈 Success Metrics

### Technical Metrics

| Category | Metric | Target | Critical |
|----------|--------|--------|----------|
| **Performance** | Lighthouse Score | >90 | >80 |
| | Bundle Size (gz) | <250KB | <300KB |
| | LCP | <2.5s | <3.5s |
| | FID | <100ms | <150ms |
| | CLS | <0.1 | <0.25 |
| | Search Latency (P95) | <200ms | <500ms |
| **Quality** | TypeScript Errors | 0 | 0 |
| | ESLint Errors | 0 | 0 |
| | Test Coverage | >70% | >60% |
| | A11y Violations | 0 serious | 0 critical |
| **Reliability** | Error Rate | <1% | <2% |
| | Crash Rate | <0.1% | <0.5% |
| | Uptime | >99.9% | >99% |

### User Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to First Search | <30s | Analytics |
| Task Completion Rate | >95% | User testing |
| Feature Discovery | +30% vs old | Analytics |
| Session Duration | Maintained or + | Analytics |
| User Satisfaction (NPS) | >50 | Survey |
| Support Ticket Rate | -40% vs old | Support system |

### Business Metrics

| Metric | Target |
|--------|--------|
| Adoption Rate | >80% after 30 days |
| User Retention | Maintained |
| Feature Usage | +20% vs old |
| Churn Rate | No increase |

---

## 📚 Documentation Requirements

### Required Documentation

#### Architecture Decision Records (ADRs)
```markdown
# ADR-001: Use React Query for Server State

## Context
Need to manage server state with caching, revalidation, and optimistic updates.

## Decision
Use React Query for all API data fetching.

## Consequences
- Automatic caching and revalidation
- Optimistic updates built-in
- Learning curve for team
- Bundle size increase (~14KB gz)

## Alternatives Considered
- SWR (similar but less features)
- Custom solution (too much work)
```

#### Component Documentation
```typescript
/**
 * PhotoGrid displays photos in a justified layout with virtual scrolling
 * for optimal performance with large libraries.
 *
 * @example
 * ```tsx
 * <PhotoGrid
 *   photos={photos}
 *   columnWidth={250}
 *   gap={16}
 *   onPhotoClick={(photo) => openLightbox(photo)}
 * />
 * ```
 */
export const PhotoGrid = ({ photos, columnWidth, gap }: PhotoGridProps) => {
  // ...
};
```

#### API Integration Guide
```markdown
# API Integration Guide

## Authentication
All API requests require Bearer token authentication...

## Endpoints
### Search Photos
POST /v1/search
...

## Error Handling
API errors follow standard format...
```

---

## 🎓 Summary

This master plan delivers a **world-class frontend** with:

✅ **Zero Risk** - Parallel development, current app untouched
✅ **Production Quality** - Testing, observability, security built-in
✅ **Performance First** - <250KB bundle, 60fps, LH >90
✅ **Accessibility** - WCAG AA from day 1
✅ **Extensibility** - Clean architecture, documented, scalable
✅ **Intent-First** - Every decision traced to value

### Next Steps

1. **Review & Approve** - Team alignment on plan
2. **Week 0 Setup** - Infrastructure before coding
3. **Phase 1 Kickoff** - Build foundation
4. **Weekly Demos** - Show progress, gather feedback
5. **Launch** - When quality gates met

**Ready to build a billion-dollar app? Let's ship this! 🚀**
