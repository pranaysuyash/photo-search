# Photo Search View Modes Documentation

## Overview
Photo Search v3 offers multiple view modes designed for different browsing experiences, each optimized for specific use cases and user intents.

## View Modes

### 1. Masonry Grid (Default)
**Access**: Cmd/Ctrl+1 or View Menu → Grid View
**Best for**: Discovering recent photos, visual browsing

**Dynamic Sizing Algorithm**:
- **Recency (50%)**: Photos decay in size over 1 year
- **Frequency (30%)**: View count (capped at 100 views)
- **View Recency (20%)**: Last viewed (30-day decay)
- **Position Bias**: First 20 photos get priority

**Tile Sizes**:
- **Large (15%)**: 2x2 grid - Recent/frequently viewed photos
- **Wide (25%)**: 2x1 grid - Moderately recent photos
- **Normal (60%)**: 1x1 grid - Standard photos

**Features**:
- Responsive (1-4 columns based on screen size)
- Selection support (Cmd/Ctrl+click, Shift+click)
- Hover animations and metadata overlays
- Virtual scrolling for large libraries

### 2. Film Strip
**Access**: Cmd/Ctrl+2 or View Menu → List View
**Best for**: Sequential browsing, detailed viewing

**Layout**:
- Horizontal scrolling layout
- Fixed height (200px) with variable width
- Timeline-based organization
- Date headers for context

**Features**:
- Smooth horizontal scrolling
- Date grouping
- Click to expand photos
- Touch-friendly navigation

### 3. Timeline
**Access**: Cmd/Ctrl+3 or keyboard shortcut 3
**Best for**: Chronological browsing, memory recall

**Layout**:
- Vertical timeline with date headers
- Grouped by day/week/month
- Density threshold (5+ photos per group)
- Progressive disclosure

**Features**:
- Automatic date clustering
- Expandable date groups
- Recency-based ordering within groups
- Year/season headers

### 4. Quick Access Shortcuts
**1**: Masonry Grid
**2**: Film Strip
**3**: Timeline
**Cmd/Ctrl+F**: Focus search
**Cmd/Ctrl+O**: Open library
**Cmd/Ctrl+E**: Export library

## Implementation Details

### Data Sources
All views use the same `GridPhoto` interface:
```typescript
interface GridPhoto {
  path: string;
  thumbnail?: string;
  metadata?: {
    timestamp?: number;    // For recency calculations
    title?: string;      // Photo title
    views?: number;      // For frequency scoring
    lastViewed?: number; // For view recency
  };
  score?: number;        // AI match score
  favorite?: boolean;    // Favorite status
}
```

### Performance Optimizations
- **Masonry**: React Masonry + Framer Motion
- **Film Strip**: Virtual scrolling
- **Timeline**: Progressive loading
- **Shared**: Image lazy loading, memoization

### Responsive Design
- Mobile: 1-2 columns
- Tablet: 2-3 columns
- Desktop: 3-4 columns
- 2K+: 6 columns

## Advanced Features

### Favorites Integration
- Heart toggle in all views
- Visual indicators for favorites
- Can be extended to Favorites-only view

### Selection Mode
- Multi-select across all views
- Cmd/Ctrl+click to toggle
- Shift+click for range selection
- Selection persistence

### Metadata Display
- Photo titles
- View counts and dates
- AI match percentages
- File information

## Future Enhancements

### Potential View Modes
- **Map View**: Location-based clustering
- **Albums**: Event-based grouping
- **Favorites Only**: Filtered view
- **Slideshow**: Full-screen browsing
- **List View**: Traditional file list

### Enhancement Opportunities
- Theme toggle (light/dark/system)
- Auto-indexing controls
- Custom grid sizing
- Advanced filtering