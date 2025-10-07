# Decision: Wire Places/Tags Views to Live Backend Data

## Context

The Places and Tags views in the React frontend were displaying dummy/hardcoded data instead of fetching real data from the backend analytics endpoints. This created an inconsistent user experience where the sidebar showed live counts but the detailed views showed fake data.

## Problem

- PlacesView showed hardcoded locations like "San Francisco, CA" with random counts
- TagsView showed hardcoded tags like "vacation", "family" with random counts
- No connection between sidebar counts and detailed view data
- User expectation of seeing actual photo metadata was not met

## Solution

Update both PlacesView and TagsView components to:

1. Accept `currentDirectory` as a prop
2. Fetch live analytics data using `apiClient.getAnalytics()`
3. Transform backend data (places: string[], tags: string[]) into UI-friendly format
4. Display loading states while fetching data
5. Handle errors gracefully with fallbacks

## Implementation Details

- Modified PlacesView to fetch `analytics.places` array and convert to LocationData format
- Modified TagsView to fetch `analytics.tags` array and convert to TagData format
- Added loading states and error handling
- Updated App.tsx routing to pass `currentDirectory` prop to both components
- Maintained existing UI patterns (grid/list/map views for Places, cloud/grid/list for Tags)

## Benefits

- Consistent data between sidebar counts and detailed views
- Real photo metadata visibility for users
- Better user experience with actual library insights
- Maintains offline-first architecture (data comes from local index)

## Risks

- Backend analytics may not have places/tags data if indexing hasn't run
- Performance impact of fetching analytics on view navigation
- UI may show empty states if no metadata available

## Alternatives Considered

- Cache analytics data in parent component to avoid repeated fetches
- Show placeholder data when backend data unavailable
- Implement lazy loading for large tag/place lists

## Future Considerations

- Add place coordinates from EXIF data when available
- Implement tag frequency analysis for better count accuracy
- Add search/filter functionality within Places/Tags views
- Consider virtual scrolling for large lists

## Related Decisions

- [Offline-First Architecture](./DECISIONS_OFFLINE_FIRST.md)
- [Auto-Indexing on Directory Selection](./DECISIONS_OFFLINE_FIRST.md)

## Status

Implemented and tested with live backend integration.
