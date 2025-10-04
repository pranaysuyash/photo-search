# CollectionCard Component Usage Example

*Date: October 4, 2025*

## Overview

This document shows how the extracted `CollectionCard` component can be integrated into the existing Collections.tsx to replace the monolithic card rendering logic.

## Component Features

The new `CollectionCard` component provides:

✅ **shadcn/ui Integration**: Uses Button, Card, DropdownMenu, Tooltip components
✅ **Lazy Loading**: Built-in intersection observer for image optimization
✅ **Accessibility**: Full keyboard navigation and ARIA support
✅ **Responsive Design**: Adapts photo grid layout based on collection size
✅ **Theme Support**: Integrates with existing theme system
✅ **Action Handling**: Context menus, drag/drop, and bulk operations

## Usage Example

Here's how to replace the existing collection card rendering in Collections.tsx:

### Before (Original Implementation)
```tsx
// In Collections.tsx (lines 1455-1812 - 357 lines)
{filteredCollections.map((name, index) => {
    const isDropTarget = dragOverCollection === name;
    const collectionPaths = collections[name] || [];
    const theme = getCollectionTheme(name);
    const isFocused = focusedCollectionIndex === index;

    return (
        <li key={name} draggable onDragStart={(e) => handleCollectionDragStart(e, name)}>
            {/* 350+ lines of complex JSX for card rendering */}
        </li>
    );
})}
```

### After (Using CollectionCard Component)
```tsx
// In Collections.tsx - Much cleaner implementation
import { CollectionCard } from "./ui/CollectionCard";

{filteredCollections.map((name, index) => {
    const collectionPaths = collections[name] || [];
    const theme = getCollectionTheme(name);
    const isFocused = focusedCollectionIndex === index;
    const isDropTarget = dragOverCollection === name;
    const isDragging = draggedItem?.type === "collection" && draggedItem.name === name;
    const isSelected = selectedCollections.has(name);

    return (
        <CollectionCard
            key={name}
            name={name}
            photos={collectionPaths}
            theme={theme}
            isFocused={isFocused}
            isDropTarget={isDropTarget}
            isDragging={isDragging}
            isSelected={isSelected}
            bulkMode={bulkMode}
            dir={dir}
            engine={engine}
            onOpen={onOpen}
            onShare={handleShare}
            onExport={handleExport}
            onDelete={onDelete}
            onSetCover={(name) => setShowCoverSelector(name)}
            onChangeTheme={(name) => setShowThemeSelector(name)}
            onToggleSelection={toggleCollectionSelection}
            onDragStart={handleCollectionDragStart}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={handleContextMenu}
            onRecordAction={recordAction}
            getCollectionCover={getCollectionCover}
            thumbUrl={thumbUrl}
            collectionThemes={collectionThemes}
            loadedImages={loadedImages}
            setLoadedImages={setLoadedImages}
        />
    );
})}
```

## Benefits of Refactoring

### Code Reduction
- **Before**: 357 lines of JSX in Collections.tsx
- **After**: ~25 lines for the map function
- **Savings**: ~330 lines removed from main component

### Maintainability
- **Focused Responsibility**: CollectionCard only handles card rendering
- **Easier Testing**: Component can be tested in isolation
- **Reusability**: Can be used in other parts of the application
- **Type Safety**: Full TypeScript support with proper interfaces

### User Experience
- **shadcn/ui Benefits**:
  - Better accessibility out of the box
  - Consistent design system
  - Smooth animations and interactions
  - Professional tooltips and dropdowns
- **Performance**: Optimized lazy loading for images
- **Responsive**: Better mobile experience

## Technical Improvements

### 1. Props Interface
```tsx
interface CollectionCardProps {
    // Clear, typed interface for all required props
    name: string;
    photos: string[];
    theme: { colors: string; border: string };
    // ... 20+ other well-typed props
}
```

### 2. Event Handling
```tsx
// Clean event delegation
onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (bulkMode && onToggleSelection) {
            onToggleSelection(name);
        } else {
            onOpen(name);
        }
    }
}}
```

### 3. Conditional Rendering
```tsx
// Organized photo grid rendering
const renderPhotoGrid = () => {
    if (photos.length === 0) return <EmptyState />;
    if (photos.length === 1) return <SinglePhoto />;
    if (photos.length === 2) return <TwoPhotos />;
    if (photos.length === 3) return <ThreePhotos />;
    return <FourOrMorePhotos />;
};
```

## Migration Strategy

### Phase 1: Side-by-side Implementation
1. Keep existing Collections.tsx code
2. Add feature flag to toggle between implementations
3. Test new CollectionCard thoroughly

### Phase 2: Gradual Rollout
1. Enable CollectionCard for subset of users
2. Monitor performance and user feedback
3. Address any issues found

### Phase 3: Complete Migration
1. Remove old card rendering code
2. Clean up unused imports and functions
3. Update tests to use new component

## Next Steps

1. **Import Integration**: Add CollectionCard import to Collections.tsx
2. **Event Handler Updates**: Ensure all handlers work with new component
3. **Testing**: Create comprehensive tests for CollectionCard
4. **Performance Testing**: Verify no regression in performance
5. **Documentation**: Update component documentation

This refactoring represents the first major step in breaking down the monolithic Collections.tsx component while maintaining all existing functionality and improving code quality.