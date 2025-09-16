# Error Handling Best Practices

This document outlines the error handling strategies and best practices implemented in the Photo Search application.

## Overview

The Photo Search application implements a comprehensive error handling system that includes:

1. **Centralized Error Utilities** - Unified error handling functions
2. **Component Error Boundaries** - Graceful degradation for UI components
3. **API Error Handling** - Proper handling of network and server errors
4. **User-Friendly Messaging** - Clear, actionable error messages
5. **Error Logging** - Comprehensive error reporting and analytics

## Core Error Handling Utilities

### handleError Function

The `handleError` function is the central error handling utility that:

- Classifies errors into different types (network, validation, permission, etc.)
- Logs errors to the console for debugging
- Displays user-friendly toast notifications
- Optionally logs errors to the server for analytics
- Provides fallback messages for unknown errors

```typescript
import { handleError } from "../utils/errors";

try {
  // Some operation that might fail
  await apiCall();
} catch (error) {
  handleError(error, {
    logToServer: true,
    context: { 
      component: "MyComponent", 
      action: "api_call" 
    },
    fallbackMessage: "Failed to load data"
  });
}
```

### Error Types

The application defines specific error types for different scenarios:

- `NETWORK` - Network connectivity issues
- `VALIDATION` - Input validation errors
- `PERMISSION` - Access control violations
- `NOT_FOUND` - Resource not found
- `TIMEOUT` - Operation timeouts
- `RATE_LIMIT` - API rate limiting
- `SERVER` - Server-side errors
- `UNKNOWN` - Unexpected errors

### Error Boundaries

React Error Boundaries are used to gracefully handle component errors:

```tsx
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary componentName="MyComponent">
      <MyComponent />
    </ErrorBoundary>
  );
}
```

## Component-Level Error Handling

### RecentActivityPanel

The RecentActivityPanel implements error handling for:

- Loading activities from the service
- Filtering and sorting operations
- UI rendering errors

```tsx
const loadActivities = useCallback(() => {
  try {
    const activityFeed = UserManagementService.getActivityFeed();
    setActivities(activityFeed);
  } catch (error) {
    handleError(error, {
      logToServer: true,
      context: { 
        component: "RecentActivityPanel", 
        action: "load_activities" 
      },
      fallbackMessage: "Failed to load recent activity"
    });
    setActivities([]); // Set empty array on error
  }
}, []);
```

### SearchHistoryPanel

The SearchHistoryPanel implements error handling for:

- Loading search history from the service
- Filtering and sorting operations
- UI rendering errors

```tsx
const loadHistory = useCallback(() => {
  try {
    const historyEntries = searchHistoryService.getHistory();
    setHistory(historyEntries);
  } catch (error) {
    handleError(error, {
      logToServer: true,
      context: { 
        component: "SearchHistoryPanel", 
        action: "load_history" 
      },
      fallbackMessage: "Failed to load search history"
    });
    setHistory([]); // Set empty array on error
  }
}, []);
```

## API Error Handling

API calls are wrapped with proper error handling:

```typescript
export const apiSearch = async (
  dir: string,
  query: string,
  engine: string,
  topK: number,
  favOnly: boolean,
  tagFilter: string,
  useCaps: boolean,
  useOcr: boolean,
  hasText: boolean,
  camera: string,
  isoMin: string,
  isoMax: string,
  fMin: string,
  fMax: string,
  place: string,
  dateFrom: string,
  dateTo: string,
  ratingMin: number,
  person: string,
  collection: string,
  color: string,
  orientation: string,
  smart: Record<string, unknown>,
): Promise<SearchResult[]> => {
  try {
    // API call implementation
    const response = await fetch(/* ... */);
    // ...
  } catch (error) {
    handleError(error, {
      logToServer: true,
      context: { 
        component: "apiSearch", 
        action: "search", 
        dir 
      },
      fallbackMessage: "Search failed. Please try again."
    });
    throw error; // Re-throw to let caller handle
  }
};
```

## User Experience Considerations

### Clear Error Messages

Error messages should be:

- Concise and clear
- Actionable when possible
- Written in plain language
- Context-specific

### Recovery Options

When appropriate, error messages should provide recovery options:

- Retry buttons for transient errors
- Alternative workflows for permanent errors
- Links to help documentation
- Contact information for support

### Visual Design

Error states should:

- Use appropriate colors (typically red for errors)
- Maintain consistent styling with the rest of the application
- Be visually distinct from regular content
- Include clear visual hierarchy

## Logging and Analytics

### Server-Side Logging

Errors can be logged to the server for analysis:

```typescript
handleError(error, {
  logToServer: true,
  context: { 
    component: "MyComponent", 
    action: "my_action" 
  }
});
```

### Client-Side Logging

Client-side logging includes:

- Console output for debugging
- Structured error objects with context
- Stack traces when available
- User session information

## Testing Error Scenarios

### Unit Tests

Components should be tested with error scenarios:

```tsx
it("handles load error gracefully", () => {
  // Mock service to throw an error
  jest.spyOn(UserManagementService, "getActivityFeed")
    .mockImplementation(() => {
      throw new Error("Network error");
    });

  render(<RecentActivityPanel onClose={jest.fn()} />);

  // Assert that error is handled gracefully
  expect(screen.getByText("Failed to load recent activity")).toBeInTheDocument();
});
```

### Integration Tests

Integration tests should verify error handling across components:

```tsx
it("shows error boundary when component crashes", () => {
  render(
    <ErrorBoundary>
      <CrashingComponent />
    </ErrorBoundary>
  );

  expect(screen.getByText("Something went wrong")).toBeInTheDocument();
});
```

## Best Practices

### 1. Always Handle Errors

Never let errors bubble up unhandled:

```typescript
// ❌ Bad - unhandled error
const data = JSON.parse(rawData);

// ✅ Good - handled error
let data;
try {
  data = JSON.parse(rawData);
} catch (error) {
  handleError(error, { fallbackMessage: "Invalid data format" });
  data = {}; // Provide default value
}
```

### 2. Provide Context

Include relevant context when logging errors:

```typescript
handleError(error, {
  context: { 
    component: "SearchHistoryPanel", 
    action: "load_history",
    userId: currentUser.id,
    dir: currentDirectory
  }
});
```

### 3. Use Appropriate Error Types

Classify errors correctly for better handling:

```typescript
const error = createAppError(
  "Network timeout", 
  ErrorType.TIMEOUT,
  { code: "ECONNABORTED" }
);
```

### 4. Graceful Degradation

Design components to degrade gracefully when errors occur:

```tsx
function PhotoGrid({ photos }) {
  if (!photos) {
    return <div>Loading...</div>;
  }
  
  if (photos.length === 0) {
    return <div>No photos found</div>;
  }
  
  return (
    <div className="photo-grid">
      {photos.map(photo => (
        <PhotoItem key={photo.id} photo={photo} />
      ))}
    </div>
  );
}
```

### 5. Monitor Error Rates

Track error rates to identify issues:

- Set up alerts for increased error rates
- Monitor specific error types
- Track error trends over time
- Correlate errors with releases

## Future Improvements

### 1. Enhanced Error Reporting

- Automatic error grouping and deduplication
- Rich error context including user actions
- Integration with external error tracking services

### 2. Predictive Error Handling

- Machine learning to predict and prevent errors
- Proactive user guidance based on error patterns
- Personalized error messages based on user history

### 3. Advanced Recovery Options

- Automatic retry mechanisms for transient errors
- Offline error queuing and synchronization
- User-guided troubleshooting wizards

## Conclusion

The Photo Search application implements a robust error handling system that prioritizes user experience while providing developers with the tools needed to identify and resolve issues. By following these best practices, we ensure that errors are handled gracefully and that users can continue to use the application effectively even when problems occur.