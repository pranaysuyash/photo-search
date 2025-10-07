# Workspace Management Frontend Plan

## Overview
This document outlines the plan for implementing a beautiful UI for workspace management in the v3 frontend, including folder selection, inclusion/exclusion controls, and system-wide scanning options.

## Current State
The backend already supports:
- `/workspace` - list workspace directories
- `/workspace/add` - add directory to workspace
- `/workspace/remove` - remove directory from workspace
- `/library/defaults` - get default photo directories with media counts

## Frontend Requirements

### 1. Workspace Management Panel Component
Create a new component that can be accessed from the sidebar or settings that allows users to:
- View all currently added directories in their workspace
- Add new directories to the workspace
- Remove directories from the workspace
- View media counts for each directory
- See the source of each directory (Pictures, Downloads, etc.)

### 2. System-wide Scanner Option
Implement a system-wide scanning feature that can:
- Scan the entire system for image and video files
- Preview results before adding to workspace
- Allow selective inclusion of found directories
- Handle large scan results efficiently

### 3. Enhanced Directory Picker
Improve the current directory selection UI with:
- Visual directory browser
- Directory search and filtering
- Preview of media content in selected directories
- Ability to add multiple directories at once

## Implementation Plan

### Phase 1: Workspace Overview Panel
Create a new component `WorkspaceManager.tsx` that displays:

```tsx
interface WorkspaceManagerProps {
  currentDirectory: string | null;
  onDirectoryChange: (dir: string) => void;
}
```

This component should include:
- A list of current workspace directories with media counts
- Visual indicators of directory sources (icons for Pictures, Downloads, etc.)
- Buttons to add/remove directories
- Ability to set a directory as the current viewing directory
- Status indicators for indexed vs. unindexed directories

### Phase 2: Directory Selection Modal
Create a modal component for adding directories that includes:
- Default directory suggestions (using /library/defaults API)
- System-wide scan capability
- Search/filter functionality for finding directories
- Preview of media content in selected directories
- Multi-select capability

### Phase 3: System-wide Scanner
Implement a feature that:
- Scans the entire system for supported image/video formats
- Displays results in a paginated view
- Allows users to select which directories to add to the workspace
- Provides progress indicators during scanning
- Handles potential performance issues with large scans

### Phase 4: Integration with Existing UI
- Update the TopBar settings panel to include a link to the workspace manager
- Add a workspace icon to the sidebar that opens the workspace manager
- Ensure seamless integration with existing photo library display

## UI/UX Design

### Workspace Manager Layout
```
┌─────────────────────────────────────────┐
│ Workspace Manager                     │
├─────────────────────────────────────────┤
│ ┌─ Pictures ──────────────────────────┐ │
│ │ 1,245 photos, 23 videos           │ │
│ │ Source: Home folder               │ │
│ │ [Set as current] [Remove]         │ │
│ └─────────────────────────────────────┘ │
│ ┌─ Photos (iCloud) ──────────────────┐ │
│ │ 892 photos, 12 videos             │ │
│ │ Source: iCloud Drive              │ │
│ │ [Set as current] [Remove]         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Add Directory] [Scan System]           │
└─────────────────────────────────────────┘
```

### Directory Selection Modal
```
┌─────────────────────────────────────────┐
│ Select Directories to Add             │
├─────────────────────────────────────────┤
│ Search: [_______________________]       │
│                                         │
│ Suggested:                            │
│ • Pictures (2,137 items)              │
│ • Downloads (1,024 items)             │
│ • Documents/Photos (156 items)        │
│                                         │
│ [Scan System Wide]                    │
│                                         │
│ Selected: 0 directories               │
│ [Add Selected] [Cancel]               │
└─────────────────────────────────────────┘
```

### System Scanner UI
```
┌─────────────────────────────────────────┐
│ System-wide Media Scanner             │
├─────────────────────────────────────────┤
│ Status: Scanning D:/Pictures... (65%)   │
│                                         │
│ Found: 2,456 directories              │
│ With: 89,234 images, 2,156 videos     │
│                                         │
│ [Pause] [Stop]                        │
│                                         │
│ Results:                              │
│ ┌─ D:/Pictures/2023 ────────────────┐ │
│ │ 1,245 images, 23 videos           │ │
│ │ [Include] [Preview]               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## API Integration

### New API Service Methods
The frontend will need new methods in the API client:

```ts
// For workspace management
async getWorkspace(): Promise<{folders: string[]}>
async addDirectoryToWorkspace(path: string): Promise<{folders: string[]}>
async removeDirectoryFromWorkspace(path: string): Promise<{folders: string[]}>

// For system scanning
async scanSystemMedia(extensionTypes?: string[]): Promise<{directories: Array<{path: string, count: number, bytes: number}>}>
```

### State Management
Update the photo store to include:
- Workspace directories
- Current scan status
- Selected directories for addition
- System scan results

## Technical Considerations

### Performance
- Implement virtualization for large directory lists
- Use pagination for scan results
- Debounce search functionality
- Implement lazy loading for directory previews

### User Experience
- Provide clear feedback during scanning operations
- Allow cancellation of long-running scans
- Show loading states appropriately
- Handle errors gracefully

### Accessibility
- Ensure keyboard navigation throughout
- Proper ARIA labels for all interactive elements
- Sufficient color contrast
- Responsive design for different screen sizes

## Implementation Steps

### Step 1: API Client Updates
- Add new methods to interact with workspace endpoints
- Implement error handling for workspace operations
- Add types for workspace-related API responses

### Step 2: State Management
- Update photo store to handle workspace state
- Add actions for workspace operations
- Implement loading states for async operations

### Step 3: Component Development
- Create WorkspaceManager component
- Create DirectorySelectionModal component
- Create SystemScanner component
- Implement UI according to design specifications

### Step 4: Integration
- Add workspace icon to sidebar
- Update TopBar settings to include workspace access
- Ensure smooth navigation between views
- Test integration with existing photo library functionality

### Step 5: Testing
- Unit tests for new components
- Integration tests for API interactions
- User acceptance testing
- Performance testing with large directory sets

## Success Metrics
- Users can easily manage multiple photo directories
- System-wide scanning provides valuable directory suggestions
- UI is intuitive and responsive even with large numbers of directories
- Integration with existing functionality is seamless
- Performance remains acceptable with large directory sets

This plan provides a comprehensive approach to implementing workspace management in the v3 frontend, building upon the existing backend capabilities while providing a beautiful and functional user experience.