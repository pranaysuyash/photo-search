# User Management Service Documentation

This document provides documentation for the UserManagementService, which handles user profiles, permissions, sharing, and collaboration features in the Photo Search application.

## Overview

The UserManagementService is responsible for managing user-related functionality including:

- User profiles and preferences
- Permissions and access control
- Sharing and collaboration features
- Activity tracking
- Collections and favorites management

## Implementation Notes (September 2025)

- The current implementation is an in-memory stub that mirrors the production API surface so the web UI can run offline. No network requests are made.
- All data is reset whenever the page reloads; use the new `reset()` helper in tests to clear state between scenarios.
- The service seeds a small set of mock collaborators via `addMockCollaborators()` so that UI components (Recent Activity, Sharing modals) have data to display during development.
- Production deployments should replace this module with a real backend integration while keeping the same method contracts.

## Core Concepts

### UserProfile

Represents a user in the system:

```typescript
interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  role: "admin" | "editor" | "viewer";
  preferences: UserPreferences;
  createdAt: Date;
  lastActive: Date;
}
```

### UserPreferences

User-specific preferences and settings:

```typescript
interface UserPreferences {
  theme: "light" | "dark" | "auto";
  language: string;
  notifications: {
    comments: boolean;
    shares: boolean;
    edits: boolean;
    mentions: boolean;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
    collectionsPublic: boolean;
  };
  defaultView: "grid" | "list" | "timeline";
  gridSize: "small" | "medium" | "large";
}
```

### Permission

Access control permissions for resources:

```typescript
interface Permission {
  resourceId: string;
  resourceType: "photo" | "collection" | "workspace";
  userId: string;
  level: "view" | "comment" | "edit" | "admin";
  expiresAt?: Date;
  sharedBy: string;
  sharedAt: Date;
}
```

### ShareLink

Shareable links for resources:

```typescript
interface ShareLink {
  id: string;
  url: string;
  resourceId: string;
  resourceType: "photo" | "collection";
  permissions: "view" | "download" | "comment";
  password?: string;
  expiresAt?: Date;
  maxViews?: number;
  currentViews: number;
  createdBy: string;
  createdAt: Date;
}
```

### Activity

User activity tracking:

```typescript
interface Activity {
  id: string;
  userId: string;
  action: "view" | "edit" | "comment" | "share" | "favorite" | "delete";
  resourceId: string;
  resourceType: string;
  metadata?: unknown;
  timestamp: Date;
}
```

## Methods

### initialize()

Initialize user management with current user:

```typescript
static async initialize(): Promise<UserProfile>
```

### getCurrentUser()

Get current user profile:

```typescript
static getCurrentUser(): UserProfile | null
```

### updatePreferences()

Update user preferences:

```typescript
static async updatePreferences(
  preferences: Partial<UserPreferences>,
): Promise<UserProfile>
```

### shareWithUser()

Share resource with another user:

```typescript
static async shareWithUser(
  resourceId: string,
  resourceType: "photo" | "collection" | "workspace",
  userId: string,
  level: Permission["level"],
  expiresIn?: number, // hours
): Promise<Permission>
```

### createShareLink()

Create shareable link:

```typescript
static async createShareLink(
  resourceId: string,
  resourceType: "photo" | "collection",
  options?: {
    permissions?: "view" | "download" | "comment";
    password?: string;
    expiresIn?: number; // hours
    maxViews?: number;
  },
): Promise<ShareLink>
```

### getResourcePermissions()

Get permissions for a resource:

```typescript
static getResourcePermissions(
  resourceId: string,
  resourceType: string,
): Permission[]
```

### hasPermission()

Check if user has permission:

```typescript
static hasPermission(
  userId: string,
  resourceId: string,
  resourceType: string,
  requiredLevel: Permission["level"],
): boolean
```

### trackActivity()

Track user activity:

```typescript
static trackActivity(
  action: Activity["action"],
  resourceId: string,
  resourceType: string,
  metadata?: unknown,
): void
```

### getActivityFeed()

Get user activity feed:

```typescript
static getActivityFeed(userId?: string, limit: number = 50): Activity[]
```

### getCollaborators()

Get collaborators for a resource:

```typescript
static getCollaborators(
  resourceId: string,
  resourceType: string,
): UserProfile[]
```

### searchUsers()

Search users for mentions/sharing:

```typescript
static searchUsers(query: string): UserProfile[]
```

### revokePermission()

Revoke permission:

```typescript
static async revokePermission(
  resourceId: string,
  resourceType: string,
  userId: string,
): Promise<void>
```

### deleteShareLink()

Delete share link:

```typescript
static async deleteShareLink(linkId: string): Promise<void>
```

### reset()

Reset in-memory state (primarily for tests):

```typescript
static reset(): void
```

## Integration Points

- `components/RecentActivityPanel.tsx` consumes `getActivityFeed()` to build the user activity drawer.
- Storybook stories and tests mock this service (`components/RecentActivityPanel.stories.tsx`, `components/ActivityPanels.test.tsx`) to validate collaboration UX in isolation.
- Future sharing flows (e.g., `ShareManageOverlay`) can swap in the real backend by reusing the same method contracts without touching UI code.

## Usage Examples

### Initializing User Management

```typescript
import { UserManagementService } from "./services/UserManagementService";

// Initialize user management
const user = await UserManagementService.initialize();

console.log("Current user:", user.displayName);
```

### Updating User Preferences

```typescript
// Update user preferences
const updatedUser = await UserManagementService.updatePreferences({
  theme: "dark",
  notifications: {
    comments: true,
    shares: true,
    edits: false,
    mentions: true,
  },
});

console.log("Updated preferences:", updatedUser.preferences);
```

### Sharing Resources

```typescript
// Share a photo with another user
const permission = await UserManagementService.shareWithUser(
  "photo123",
  "photo",
  "user456",
  "view",
  24 // Expires in 24 hours
);

console.log("Share permission created:", permission.id);
```

### Creating Share Links

```typescript
// Create a shareable link
const shareLink = await UserManagementService.createShareLink(
  "collection789",
  "collection",
  {
    permissions: "view",
    expiresIn: 48, // Expires in 48 hours
    maxViews: 10,  // Max 10 views
  }
);

console.log("Share link:", shareLink.url);
```

### Tracking Activity

```typescript
// Track user activity
UserManagementService.trackActivity(
  "view",
  "photo123",
  "photo",
  {
    searchTerm: "beach vacation",
    resultPosition: 5,
  }
);

// Get activity feed
const activityFeed = UserManagementService.getActivityFeed();
console.log("Recent activity:", activityFeed);
```

### Checking Permissions

```typescript
// Check if user has permission
const hasEditPermission = UserManagementService.hasPermission(
  "user456",
  "photo123",
  "photo",
  "edit"
);

if (hasEditPermission) {
  console.log("User can edit this photo");
} else {
  console.log("User does not have edit permission");
}
```

## Best Practices

### 1. Initialize Early

Initialize the UserManagementService early in your application lifecycle:

```typescript
// In your app initialization
useEffect(() => {
  const initUserManagement = async () => {
    try {
      await UserManagementService.initialize();
    } catch (error) {
      console.error("Failed to initialize user management:", error);
    }
  };

  initUserManagement();
}, []);
```

### 2. Handle Errors Gracefully

Always handle errors when calling UserManagementService methods:

```typescript
try {
  const user = await UserManagementService.getCurrentUser();
  if (!user) {
    // Handle unauthenticated state
    redirectToLogin();
    return;
  }
  
  // Use user data
  setUser(user);
} catch (error) {
  console.error("Error getting current user:", error);
  // Show error message to user
}
```

### 3. Use Activity Tracking Appropriately

Track meaningful user activities for better insights:

```typescript
// Good - Track meaningful actions
UserManagementService.trackActivity("favorite", photoId, "photo");

// Avoid - Tracking too frequently
UserManagementService.trackActivity("scroll", photoId, "photo"); // Not recommended
```

### 4. Respect Privacy Settings

Respect user privacy settings when displaying activity:

```typescript
const user = UserManagementService.getCurrentUser();
const activityFeed = UserManagementService.getActivityFeed();

// Filter activity based on user privacy settings
const visibleActivity = activityFeed.filter(activity => {
  const activityUser = UserManagementService.searchUsers(activity.userId)[0];
  return activityUser?.preferences.privacy.activityVisible !== false;
});
```

## Security Considerations

### 1. Validate Inputs

Always validate inputs to prevent injection attacks:

```typescript
// Validate user inputs
const validateUserId = (userId: string): boolean => {
  return /^[a-zA-Z0-9-_]+$/.test(userId);
};

if (!validateUserId(userId)) {
  throw new Error("Invalid user ID");
}
```

### 2. Sanitize Data

Sanitize data before storing or displaying:

```typescript
// Sanitize user input
const sanitizeInput = (input: string): string => {
  return input.replace(/[<>]/g, ""); // Remove potentially dangerous characters
};
```

### 3. Implement Rate Limiting

Implement rate limiting for sensitive operations:

```typescript
// Track operation frequency
const operationCounts = new Map<string, number>();

const checkRateLimit = (userId: string, operation: string): boolean => {
  const key = `${userId}:${operation}`;
  const count = operationCounts.get(key) || 0;
  
  if (count > MAX_OPERATIONS_PER_MINUTE) {
    return false; // Rate limit exceeded
  }
  
  operationCounts.set(key, count + 1);
  setTimeout(() => {
    operationCounts.set(key, 0);
  }, 60000); // Reset after 1 minute
  
  return true;
};
```

## Testing

### Unit Tests

Write unit tests for UserManagementService methods:

```typescript
import { UserManagementService } from "./UserManagementService";

describe("UserManagementService", () => {
  beforeEach(() => {
    // Reset service state before each test
    UserManagementService.reset();
  });

  it("should initialize with default user", async () => {
    const user = await UserManagementService.initialize();
    
    expect(user).toBeDefined();
    expect(user.username).toBe("current_user");
    expect(user.role).toBe("admin");
  });

  it("should update user preferences", async () => {
    await UserManagementService.initialize();
    
    const updatedUser = await UserManagementService.updatePreferences({
      theme: "dark"
    });
    
    expect(updatedUser.preferences.theme).toBe("dark");
  });
});
```

### Integration Tests

Write integration tests for complex workflows:

```typescript
it("should handle sharing workflow correctly", async () => {
  // Initialize users
  await UserManagementService.initialize();
  
  // Share resource
  const permission = await UserManagementService.shareWithUser(
    "photo123",
    "photo",
    "user456",
    "view"
  );
  
  // Verify permission was created
  expect(permission.resourceId).toBe("photo123");
  expect(permission.level).toBe("view");
  
  // Verify user has permission
  const hasPermission = UserManagementService.hasPermission(
    "user456",
    "photo123",
    "photo",
    "view"
  );
  
  expect(hasPermission).toBe(true);
});
```

## Future Improvements

### 1. Enhanced Collaboration Features

- Real-time collaboration
- Comment threads
- Version control for edits
- Conflict resolution

### 2. Advanced Analytics

- User behavior analytics
- Engagement metrics
- Retention analysis
- Feature usage tracking

### 3. Social Features

- User profiles
- Followers and following
- Public collections
- Community features

## Conclusion

The UserManagementService provides a comprehensive foundation for user management, permissions, sharing, and collaboration in the Photo Search application. By following the documented patterns and best practices, developers can build secure, scalable, and user-friendly features that enhance the overall user experience.
