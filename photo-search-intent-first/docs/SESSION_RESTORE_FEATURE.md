# Session Restore Feature

## Overview
This document describes the implementation of comprehensive session restore functionality for the Photo Search application. The feature enhances user experience by preserving and restoring application state across browser sessions.

## User Benefits
- **Seamless Continuity**: Users can pick up where they left off, even after closing the browser
- **Search Context Preservation**: Last search queries and filters are automatically restored
- **View Preferences**: Grid size, view modes, and timeline settings persist across sessions
- **Navigation Memory**: Recently accessed views and directories are remembered
- **Selection State**: Selected photos are preserved when possible
- **Progressive Enhancement**: Works gracefully with existing preference system

## Implementation Details

### 1. Session Restore Service (`src/services/SessionRestoreService.ts`)

**Why Important**: Core service that manages all session state persistence and restoration.

**Key Features**:
- **Comprehensive State Management**: Handles view preferences, navigation, search, UI, and library state
- **Data Sanitization**: Validates and sanitizes all stored data for security and stability
- **Automatic Cleanup**: Removes expired data to prevent storage bloat
- **Session Analytics**: Provides insights into user behavior and session patterns
- **Type Safety**: Full TypeScript support with proper interfaces

**Core Interface**:
```typescript
interface SessionState {
  viewPreferences: {
    resultView?: ResultView;
    timelineBucket?: TimelineBucket;
    gridSize?: 'small' | 'medium' | 'large';
  };

  navigation: {
    currentView?: string;
    lastVisitedViews?: string[];
    viewHistory?: Array<{
      view: string;
      timestamp: number;
      searchQuery?: string;
    }>;
  };

  search: {
    lastSearchQuery?: string;
    recentSearches?: Array<{
      query: string;
      timestamp: number;
      resultCount?: number;
    }>;
    activeFilters?: {
      favOnly?: boolean;
      tagFilter?: string;
      place?: string;
      camera?: string;
      dateFrom?: string;
      dateTo?: string;
      ratingMin?: number;
    };
  };

  ui: {
    selectedPhotos?: string[];
    sidebarState?: {
      showFilters?: boolean;
      showRecentActivity?: boolean;
      showSearchHistory?: boolean;
    };
    modalStates?: {
      lastOpenModal?: string;
      onboardingCompleted?: boolean;
    };
  };

  library: {
    lastAccessedDirectory?: string;
    preferredEngine?: string;
    scrollPositions?: Record<string, number>;
  };

  timestamps: {
    lastSession?: number;
    lastActivity?: number;
    sessionDuration?: number;
  };
}
```

**Data Sanitization**:
```typescript
function sanitizeSessionState(raw: unknown): Partial<SessionState> {
  // Comprehensive validation and sanitization
  // - Type checking for all fields
  // - Value validation ( enums, ranges )
  // - Timestamp validation
  // - Size limits and quotas
  // - Security filtering
}
```

### 2. Session Restore Hook (`src/hooks/useSessionRestore.ts`)

**Why Important**: Provides easy-to-use React hooks for session management.

**Hook Features**:
- **Debounced Saving**: Prevents excessive localStorage writes
- **Automatic Navigation Tracking**: Tracks view changes automatically
- **Specialized Hooks**: Focused hooks for common use cases
- **Memory Management**: Automatic cleanup and timeout handling

**Primary Hook**:
```typescript
export function useSessionRestore(options: UseSessionRestoreOptions = {}) {
  const { autoSave = true, restoreOnMount = true, debounceMs = 1000 } = options;

  // Session state management functions
  const sessionActions = useMemo(() => ({
    updateViewPreferences: useCallback((preferences) => {
      sessionRestoreService.updateViewPreferences(preferences);
      if (autoSave) debouncedSave();
    }, [autoSave, debouncedSave]),

    recordSearch: useCallback((query, resultCount) => {
      sessionRestoreService.recordSearch(query, resultCount);
      if (autoSave) debouncedSave();
    }, [autoSave, debouncedSave]),

    // ... other actions
  }), [autoSave, debouncedSave]);

  return { ...sessionActions, ...sessionState };
}
```

**Specialized Hooks**:
```typescript
export function useViewPreferences() {
  const { viewPreferences, updateViewPreferences } = useSessionRestore();
  return { viewPreferences, updateViewPreferences };
}

export function useSearchHistory() {
  const { recentSearches, lastSearchQuery, recordSearch } = useSessionRestore();
  return { recentSearches, lastSearchQuery, recordSearch };
}

export function useScrollRestore() {
  const { getScrollPosition, setScrollPosition } = useSessionRestore();
  return { getScrollPosition, setScrollPosition };
}
```

### 3. Session Restore Indicator (`src/components/SessionRestoreIndicator.tsx`)

**Why Important**: Provides visual feedback when session state is restored.

**Features**:
- **Smart Detection**: Only shows when there's actual restored state
- **Informative Display**: Shows what was restored (search, preferences, etc.)
- **Auto-dismiss**: Automatically hides after 5 seconds
- **User Control**: Manual dismiss option available
- **Responsive Design**: Works on all screen sizes

**Visual Design**:
```tsx
return (
  <div className="fixed bottom-4 right-4 z-50 max-w-sm">
    <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-lg p-3 shadow-lg">
      <div className="flex items-start space-x-2">
        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">Session Restored</p>
          <div className="text-xs text-green-700">
            {lastSearchQuery && <div>Last search: "{lastSearchQuery}"</div>}
            {recentSearchesCount > 0 && <div>{recentSearchesCount} recent searches</div>}
            {lastSessionTime && <div>Last session: {lastSessionTime}</div>}
          </div>
        </div>
      </div>
    </div>
  </div>
);
```

### 4. App Integration (`src/App.tsx`)

**Why Important**: Seamlessly integrates session restore into the main application.

**Integration Points**:

#### Initialization
```typescript
// Merge session preferences with existing preferences
const sessionPreferences = useMemo(() => sessionRestoreService.getViewPreferences(), []);
const viewPreferences = useMemo(() => loadViewPreferences(), []);
const mergedPreferences = useMemo(() => ({
  ...viewPreferences,
  ...sessionPreferences,
}), [viewPreferences, sessionPreferences]);
```

#### Search Tracking
```typescript
const doSearchImmediate = useCallback(async (text: string) => {
  // ... validation logic ...

  // Record search in session restore service
  sessionRestoreService.recordSearch(text.trim());
  sessionRestoreService.updateNavigation({
    currentView: 'results'
  });

  return await _doSearchImmediate(text);
}, [dir, _doSearchImmediate, uiActions]);
```

#### State Persistence
```typescript
// View preferences
useEffect(() => {
  saveViewPreferences({ resultView, timelineBucket, gridSize });
  sessionRestoreService.updateViewPreferences({ resultView, timelineBucket, gridSize });
}, [resultView, timelineBucket, gridSize]);

// Library state
useEffect(() => {
  if (dir) {
    sessionRestoreService.updateLibrary({
      lastAccessedDirectory: dir,
      preferredEngine: engine,
    });
  }
}, [dir, engine]);

// Selection state
useEffect(() => {
  sessionRestoreService.updateUI({
    selectedPhotos: Array.from(selected),
  });
}, [selected]);
```

## Storage Architecture

### Data Storage
- **localStorage**: Primary storage for session state
- **Storage Key**: `photo-session-state-v2`
- **Data Format**: JSON string with schema versioning
- **Size Management**: Automatic cleanup of old/expired data

### Data Lifecycle
1. **Session Start**: Load and validate existing session state
2. **During Session**: Track user interactions and state changes
3. **Session End**: Save final state with cleanup
4. **Next Session**: Restore validated state and continue

### Data Sanitization Rules
- **Type Safety**: All fields validated against expected types
- **Range Validation**: Numbers checked against valid ranges
- **Enum Validation**: String values checked against allowed values
- **Size Limits**: Arrays limited to prevent storage bloat
- **Time-based Expiration**: Old data automatically removed
- **Security Filtering**: Potentially harmful data sanitized

## Performance Optimizations

### Debounced Saving
```typescript
const debouncedSave = useCallback(() => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
  timeoutRef.current = setTimeout(() => {
    sessionRestoreService.updateActivity();
  }, debounceMs) as unknown as number;
}, [debounceMs]);
```

### Memory Management
- **Automatic Cleanup**: Expired data removed during load
- **Size Quotas**: Limits on arrays and objects
- **Lazy Loading**: State loaded only when needed
- **Efficient Updates**: Only changed data saved

### Storage Efficiency
- **Compression**: Redundant data removed
- **Schema Evolution**: Versioned storage format
- **Incremental Updates**: Only changed state persisted
- **Minimal Footprint**: Optimized data structures

## User Experience

### Session Restoration Flow
1. **Application Load**: Check for existing session state
2. **State Validation**: Sanitize and validate loaded data
3. **Preference Merge**: Combine with existing preferences
4. **UI Update**: Apply restored state to interface
5. **User Notification**: Show restoration indicator

### Visual Feedback
- **Green Indicator**: Shows successful session restore
- **Detailed Information**: Displays what was restored
- **Auto-dismiss**: Hides after 5 seconds
- **Manual Control**: Users can dismiss immediately

### Graceful Degradation
- **No State**: Falls back to default behavior
- **Corrupted Data**: Automatic cleanup and recovery
- **Storage Issues**: Graceful error handling
- **Browser Compatibility**: Works across all modern browsers

## Privacy and Security

### Data Handling
- **Local Storage Only**: No server transmission of session data
- **No PII**: Personally identifiable information excluded
- **Data Minimization**: Only essential state stored
- **User Control**: Clear session option available

### Security Measures
- **Input Sanitization**: All data validated before storage
- **XSS Prevention**: HTML characters escaped
- **Schema Validation**: Strict type checking
- **Size Limits**: Prevents storage abuse

## Analytics and Insights

### Session Analytics
```typescript
const analytics = sessionRestoreService.getSessionAnalytics();
// Returns:
// {
//   sessionDuration: number;
//   timeSinceLastActivity: number;
//   sessionsCount: number;
//   mostUsedViews: Array<{ view: string; count: number }>;
//   searchFrequency: number;
// }
```

### Usage Patterns
- **View History**: Most frequently accessed views
- **Search Patterns**: Search frequency and popular queries
- **Session Duration**: How long users stay engaged
- **Feature Usage**: Which features are used most often

## Testing

### Unit Tests
- **Service Logic**: SessionRestoreService class methods
- **Data Sanitization**: Input validation and cleaning
- **Hook Functionality**: useSessionRestore hook behavior
- **Component Rendering**: SessionRestoreIndicator display

### Integration Tests
- **App Integration**: Session restore in main application
- **Persistence**: Data survives browser restarts
- **Edge Cases**: Corrupted data, storage failures
- **Performance**: Memory usage and storage efficiency

### Test Coverage Areas
- State persistence and retrieval
- Data sanitization and validation
- Component lifecycle management
- Error handling and recovery
- Performance under load

## Future Enhancements

### Potential Improvements
1. **Cross-device Sync**: Session state synchronization across devices
2. **Cloud Storage**: Optional cloud backup of session state
3. **Advanced Analytics**: More detailed usage insights
4. **Customizable Restore**: User control over what gets restored
5. **Session Templates**: Predefined session configurations
6. **Collaborative Sessions**: Shared session states for multiple users

### Scalability Considerations
1. **Large Datasets**: Optimizing for thousands of photos
2. **Complex Filters**: Advanced filter state management
3. **Long Sessions**: Extended usage pattern handling
4. **Memory Optimization**: Better memory management for large states

## Deployment Notes

### Browser Compatibility
- **Modern Browsers**: Full feature support
- **localStorage Required**: Essential for functionality
- **JavaScript Enabled**: Required for session management
- **Cookies**: Not used, avoiding privacy concerns

### Migration Strategy
- **Backward Compatibility**: Existing preferences preserved
- **Gradual Rollout**: Features can be enabled incrementally
- **Data Migration**: Seamless upgrade from old preference system
- **Rollback Support**: Ability to disable if issues arise

### Configuration Options
```typescript
const sessionConfig = {
  autoSave: true,           // Enable automatic saving
  restoreOnMount: true,     // Restore state on component mount
  debounceMs: 1000,        // Debounce delay for saves
  maxRecentSearches: 10,   // Limit recent search history
  maxViewHistory: 20,      // Limit view history
  sessionTimeout: 86400000, // Session timeout (24 hours)
};
```

## Status
**Completed** - Session restore implementation is complete and functional.

- ✅ Comprehensive SessionRestoreService with full state management
- ✅ React hooks for easy integration
- ✅ Visual feedback component with SessionRestoreIndicator
- ✅ Seamless App.tsx integration
- ✅ Data sanitization and security measures
- ✅ Performance optimizations and debouncing
- ✅ Privacy-focused local storage approach
- ✅ Analytics and session insights
- ✅ Comprehensive error handling and recovery
- ✅ Full TypeScript support and type safety

The feature significantly improves user experience by providing seamless continuity across browser sessions while maintaining privacy and performance standards.