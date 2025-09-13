// biome-ignore lint/complexity/noStaticOnlyClass: Service pattern
/**
 * User Management Service
 * Handles user profiles, permissions, sharing, and collaboration
 */

export interface UserProfile {
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

export interface UserPreferences {
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

export interface Permission {
	resourceId: string;
	resourceType: "photo" | "collection" | "workspace";
	userId: string;
	level: "view" | "comment" | "edit" | "admin";
	expiresAt?: Date;
	sharedBy: string;
	sharedAt: Date;
}

export interface ShareLink {
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

export interface Activity {
	id: string;
	userId: string;
	action: "view" | "edit" | "comment" | "share" | "favorite" | "delete";
	resourceId: string;
	resourceType: string;
	metadata?: unknown;
	timestamp: Date;
}

export class UserManagementService {
	private static currentUser: UserProfile | null = null;
	private static users = new Map<string, UserProfile>();
	private static permissions = new Map<string, Permission[]>();
	private static shareLinks = new Map<string, ShareLink>();
	private static activities: Activity[] = [];

	/**
	 * Initialize user management with current user
	 */
	static async initialize(): Promise<UserProfile> {
		// In production, this would authenticate with backend
		const user: UserProfile = {
			id: "user-1",
			username: "current_user",
			email: "user@example.com",
			displayName: "Current User",
			role: "admin",
			preferences: {
				theme: "auto",
				language: "en",
				notifications: {
					comments: true,
					shares: true,
					edits: true,
					mentions: true,
				},
				privacy: {
					profileVisible: true,
					activityVisible: true,
					collectionsPublic: false,
				},
				defaultView: "grid",
				gridSize: "medium",
			},
			createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			lastActive: new Date(),
		};

		UserManagementService.currentUser = user;
		UserManagementService.users.set(user.id, user);

		// Add some mock collaborators
		UserManagementService.addMockCollaborators();

		return user;
	}

	/**
	 * Get current user profile
	 */
	static getCurrentUser(): UserProfile | null {
		return UserManagementService.currentUser;
	}

	/**
	 * Update user preferences
	 */
	static async updatePreferences(
		preferences: Partial<UserPreferences>,
	): Promise<UserProfile> {
		if (!UserManagementService.currentUser)
			throw new Error("No user logged in");

		UserManagementService.currentUser.preferences = {
			...UserManagementService.currentUser.preferences,
			...preferences,
		};

		// In production, persist to backend
		return UserManagementService.currentUser;
	}

	/**
	 * Share resource with another user
	 */
	static async shareWithUser(
		resourceId: string,
		resourceType: "photo" | "collection" | "workspace",
		userId: string,
		level: Permission["level"],
		expiresIn?: number, // hours
	): Promise<Permission> {
		if (!UserManagementService.currentUser)
			throw new Error("No user logged in");

		const permission: Permission = {
			resourceId,
			resourceType,
			userId,
			level,
			sharedBy: UserManagementService.currentUser.id,
			sharedAt: new Date(),
			expiresAt: expiresIn
				? new Date(Date.now() + expiresIn * 60 * 60 * 1000)
				: undefined,
		};

		const key = `${resourceId}-${resourceType}`;
		if (!UserManagementService.permissions.has(key)) {
			UserManagementService.permissions.set(key, []);
		}

		UserManagementService.permissions.get(key)?.push(permission);

		// Track activity
		UserManagementService.trackActivity("share", resourceId, resourceType, {
			sharedWith: userId,
			level,
		});

		return permission;
	}

	/**
	 * Create shareable link
	 */
	static async createShareLink(
		resourceId: string,
		resourceType: "photo" | "collection",
		options?: {
			permissions?: "view" | "download" | "comment";
			password?: string;
			expiresIn?: number; // hours
			maxViews?: number;
		},
	): Promise<ShareLink> {
		if (!UserManagementService.currentUser)
			throw new Error("No user logged in");

		const shareLink: ShareLink = {
			id: `link-${Date.now()}`,
			url: `${window.location.origin}/share/${btoa(resourceId)}`,
			resourceId,
			resourceType,
			permissions: options?.permissions || "view",
			password: options?.password,
			expiresAt: options?.expiresIn
				? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000)
				: undefined,
			maxViews: options?.maxViews,
			currentViews: 0,
			createdBy: UserManagementService.currentUser.id,
			createdAt: new Date(),
		};

		UserManagementService.shareLinks.set(shareLink.id, shareLink);

		return shareLink;
	}

	/**
	 * Get permissions for a resource
	 */
	static getResourcePermissions(
		resourceId: string,
		resourceType: string,
	): Permission[] {
		const key = `${resourceId}-${resourceType}`;
		const permissions = UserManagementService.permissions.get(key) || [];

		// Filter out expired permissions
		const now = new Date();
		return permissions.filter((p) => !p.expiresAt || p.expiresAt > now);
	}

	/**
	 * Check if user has permission
	 */
	static hasPermission(
		userId: string,
		resourceId: string,
		resourceType: string,
		requiredLevel: Permission["level"],
	): boolean {
		const user = UserManagementService.users.get(userId);
		if (!user) return false;

		// Admins have all permissions
		if (user.role === "admin") return true;

		const permissions = UserManagementService.getResourcePermissions(
			resourceId,
			resourceType,
		);
		const userPermission = permissions.find((p) => p.userId === userId);

		if (!userPermission) return false;

		const levels = ["view", "comment", "edit", "admin"];
		const userLevelIndex = levels.indexOf(userPermission.level);
		const requiredLevelIndex = levels.indexOf(requiredLevel);

		return userLevelIndex >= requiredLevelIndex;
	}

	/**
	 * Track user activity
	 */
	static trackActivity(
		action: Activity["action"],
		resourceId: string,
		resourceType: string,
		metadata?: unknown,
	): void {
		if (!UserManagementService.currentUser) return;

		const activity: Activity = {
			id: `activity-${Date.now()}`,
			userId: UserManagementService.currentUser.id,
			action,
			resourceId,
			resourceType,
			metadata,
			timestamp: new Date(),
		};

		UserManagementService.activities.unshift(activity);

		// Keep only last 1000 activities
		if (UserManagementService.activities.length > 1000) {
			UserManagementService.activities = UserManagementService.activities.slice(
				0,
				1000,
			);
		}
	}

	/**
	 * Get user activity feed
	 */
	static getActivityFeed(userId?: string, limit: number = 50): Activity[] {
		let activities = UserManagementService.activities;

		if (userId) {
			activities = activities.filter((a) => a.userId === userId);
		}

		return activities.slice(0, limit);
	}

	/**
	 * Get collaborators for a resource
	 */
	static getCollaborators(
		resourceId: string,
		resourceType: string,
	): UserProfile[] {
		const permissions = UserManagementService.getResourcePermissions(
			resourceId,
			resourceType,
		);
		const collaboratorIds = new Set(permissions.map((p) => p.userId));

		return Array.from(collaboratorIds)
			.map((id) => UserManagementService.users.get(id))
			.filter(Boolean) as UserProfile[];
	}

	/**
	 * Search users for mentions/sharing
	 */
	static searchUsers(query: string): UserProfile[] {
		const lowercaseQuery = query.toLowerCase();

		return Array.from(UserManagementService.users.values()).filter(
			(user) =>
				user.username.toLowerCase().includes(lowercaseQuery) ||
				user.displayName.toLowerCase().includes(lowercaseQuery) ||
				user.email.toLowerCase().includes(lowercaseQuery),
		);
	}

	/**
	 * Add mock collaborators for testing
	 */
	private static addMockCollaborators(): void {
		const mockUsers: UserProfile[] = [
			{
				id: "user-2",
				username: "photographer_jane",
				email: "jane@example.com",
				displayName: "Jane Smith",
				role: "editor",
				preferences: UserManagementService.getDefaultPreferences(),
				createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
				lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
			},
			{
				id: "user-3",
				username: "viewer_bob",
				email: "bob@example.com",
				displayName: "Bob Johnson",
				role: "viewer",
				preferences: UserManagementService.getDefaultPreferences(),
				createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
				lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
			},
			{
				id: "user-4",
				username: "editor_alice",
				email: "alice@example.com",
				displayName: "Alice Williams",
				role: "editor",
				preferences: UserManagementService.getDefaultPreferences(),
				createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
				lastActive: new Date(Date.now() - 30 * 60 * 1000),
			},
		];

		mockUsers.forEach((user) => UserManagementService.users.set(user.id, user));
	}

	/**
	 * Get default preferences
	 */
	private static getDefaultPreferences(): UserPreferences {
		return {
			theme: "auto",
			language: "en",
			notifications: {
				comments: true,
				shares: true,
				edits: false,
				mentions: true,
			},
			privacy: {
				profileVisible: true,
				activityVisible: false,
				collectionsPublic: false,
			},
			defaultView: "grid",
			gridSize: "medium",
		};
	}

	/**
	 * Revoke permission
	 */
	static async revokePermission(
		resourceId: string,
		resourceType: string,
		userId: string,
	): Promise<void> {
		const key = `${resourceId}-${resourceType}`;
		const permissions = UserManagementService.permissions.get(key) || [];

		UserManagementService.permissions.set(
			key,
			permissions.filter((p) => p.userId !== userId),
		);
	}

	/**
	 * Delete share link
	 */
	static async deleteShareLink(linkId: string): Promise<void> {
		UserManagementService.shareLinks.delete(linkId);
	}
}
