/**
 * Collaborative Sharing Service
 * Real-time collaboration, sharing, and social features for photos
 */

export interface SharingOptions {
	allowComments: boolean;
	allowLikes: boolean;
	allowDownload: boolean;
	allowEdit: boolean;
	expiresAt?: Date;
	password?: string;
	viewLimit?: number;
}

export interface SharedAlbum {
	id: string;
	title: string;
	description?: string;
	ownerId: string;
	ownerName: string;
	photos: string[];
	permissions: SharingOptions;
	shares: ShareLink[];
	collaborators: Collaborator[];
	comments: Comment[];
	likes: Like[];
	createdAt: Date;
	updatedAt: Date;
	isPublic: boolean;
	tags: string[];
	coverPhoto?: string;
}

export interface ShareLink {
	id: string;
	albumId: string;
	url: string;
	token: string;
	permissions: {
		canView: boolean;
		canComment: boolean;
		canDownload: boolean;
		canEdit: boolean;
	};
	createdAt: Date;
	expiresAt?: Date;
	accessCount: number;
	viewerLimit?: number;
	password?: string;
	createdBy: string;
}

export interface Collaborator {
	id: string;
	userId: string;
	email: string;
	name: string;
	avatar?: string;
	role: 'viewer' | 'editor' | 'owner';
	permissions: string[];
	joinedAt: Date;
	lastActive?: Date;
	status: 'active' | 'pending' | 'inactive';
}

export interface Comment {
	id: string;
	albumId: string;
	photoId?: string;
	userId: string;
	userName: string;
	userAvatar?: string;
	content: string;
	timestamp: Date;
	editedAt?: Date;
	replies: Comment[];
	likes: number;
	isLiked: boolean;
	mentions: string[];
	isResolved?: boolean;
	resolvedBy?: string;
	resolvedAt?: Date;
}

export interface Like {
	id: string;
	albumId: string;
	photoId?: string;
	userId: string;
	userName: string;
	userAvatar?: string;
	timestamp: Date;
	type: 'photo' | 'album' | 'comment';
}

export interface ActivityLog {
	id: string;
	albumId: string;
	userId: string;
	userName: string;
	action: string;
	details: Record<string, any>;
	timestamp: Date;
	targetPhoto?: string;
}

export interface CollaborationSession {
	id: string;
	albumId: string;
	participants: SessionParticipant[];
	photoStates: Map<string, PhotoState>;
	createdAt: Date;
	isActive: boolean;
}

export interface SessionParticipant {
	userId: string;
	userName: string;
	userAvatar?: string;
	joinedAt: Date;
	lastSeen: Date;
	currentPhoto?: string;
	cursor?: { x: number; y: number };
	isViewing: boolean;
	permissions: string[];
}

export interface PhotoState {
	photoId: string;
	editedBy: string;
	edits: PhotoEdit[];
	currentVersion: number;
	isLocked: boolean;
	lockedBy?: string;
	lockedAt?: Date;
}

export interface PhotoEdit {
	id: string;
	userId: string;
	userName: string;
	type: 'filter' | 'crop' | 'adjustment' | 'metadata';
	parameters: Record<string, any>;
	timestamp: Date;
	applied: boolean;
}

export interface NotificationSettings {
	email: boolean;
	push: boolean;
	inApp: boolean;
	comments: boolean;
	likes: boolean;
	shares: boolean;
	collaboratorJoins: boolean;
	albumUpdates: boolean;
}

export class CollaborativeSharingService {
	private static instance: CollaborativeSharingService;
	private albums: Map<string, SharedAlbum> = new Map();
	private sessions: Map<string, CollaborationSession> = new Map();
	private subscribers: Map<string, Set<(data: any) => void>> = new Map();

	private constructor() {
		// Initialize with sample data
		this.initializeSampleData();
	}

	static getInstance(): CollaborativeSharingService {
		if (!CollaborativeSharingService.instance) {
			CollaborativeSharingService.instance = new CollaborativeSharingService();
		}
		return CollaborativeSharingService.instance;
	}

	// Album Management
	async createAlbum(
		title: string,
		ownerId: string,
		ownerName: string,
		photos: string[] = [],
		options: Partial<SharingOptions> = {}
	): Promise<SharedAlbum> {
		const album: SharedAlbum = {
			id: this.generateId(),
			title,
			ownerId,
			ownerName,
			photos,
			permissions: {
				allowComments: true,
				allowLikes: true,
				allowDownload: false,
				allowEdit: false,
				...options
			},
			shares: [],
			collaborators: [{
				id: this.generateId(),
				userId: ownerId,
				email: '',
				name: ownerName,
				role: 'owner',
				permissions: ['view', 'edit', 'share', 'delete'],
				joinedAt: new Date(),
				status: 'active'
			}],
			comments: [],
			likes: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			isPublic: false,
			tags: [],
			coverPhoto: photos[0]
		};

		this.albums.set(album.id, album);
		this.logActivity(album.id, ownerId, ownerName, 'created_album', { title });
		this.broadcastToAlbum(album.id, 'album_created', album);

		return album;
	}

	async getAlbum(albumId: string, userId?: string): Promise<SharedAlbum | null> {
		const album = this.albums.get(albumId);
		if (!album) return null;

		// Check permissions if userId provided
		if (userId && !this.hasAccess(album, userId)) {
			return null;
		}

		return album;
	}

	async updateAlbum(
		albumId: string,
		userId: string,
		updates: Partial<SharedAlbum>
	): Promise<SharedAlbum | null> {
		const album = this.albums.get(albumId);
		if (!album || !this.hasEditAccess(album, userId)) {
			return null;
		}

		const updatedAlbum = { ...album, ...updates, updatedAt: new Date() };
		this.albums.set(albumId, updatedAlbum);

		this.logActivity(albumId, userId, 'updated_album', updates);
		this.broadcastToAlbum(albumId, 'album_updated', updatedAlbum);

		return updatedAlbum;
	}

	async deleteAlbum(albumId: string, userId: string): Promise<boolean> {
		const album = this.albums.get(albumId);
		if (!album || album.ownerId !== userId) {
			return false;
		}

		this.albums.delete(albumId);
		this.broadcastToAlbum(albumId, 'album_deleted', { albumId });

		return true;
	}

	// Sharing and Links
	async createShareLink(
		albumId: string,
		userId: string,
		permissions: Partial<ShareLink['permissions']>,
		expiresAt?: Date,
		password?: string
	): Promise<ShareLink> {
		const album = this.albums.get(albumId);
		if (!album || !this.hasShareAccess(album, userId)) {
			throw new Error('Album not found or no sharing permissions');
		}

		const shareLink: ShareLink = {
			id: this.generateId(),
			albumId,
			url: `${this.getBaseUrl()}/shared/${albumId}/${this.generateToken()}`,
			token: this.generateToken(),
			permissions: {
				canView: true,
				canComment: permissions.canComment ?? album.permissions.allowComments,
				canDownload: permissions.canDownload ?? album.permissions.allowDownload,
				canEdit: permissions.canEdit ?? album.permissions.allowEdit
			},
			createdAt: new Date(),
			expiresAt,
			accessCount: 0,
			password,
			createdBy: userId
		};

		album.shares.push(shareLink);
		this.albums.set(albumId, album);

		this.logActivity(albumId, userId, 'created_share_link', {
			shareId: shareLink.id,
			permissions: shareLink.permissions
		});

		return shareLink;
	}

	async getShareLink(token: string): Promise<ShareLink | null> {
		for (const album of this.albums.values()) {
			const share = album.shares.find(s => s.token === token);
			if (share && (!share.expiresAt || share.expiresAt > new Date())) {
				share.accessCount++;
				this.albums.set(album.id, album);
				return share;
			}
		}
		return null;
	}

	// Collaborators
	async addCollaborator(
		albumId: string,
		userId: string,
		email: string,
		name: string,
		role: Collaborator['role'] = 'viewer'
	): Promise<Collaborator> {
		const album = this.albums.get(albumId);
		if (!album || !this.hasShareAccess(album, userId)) {
			throw new Error('Album not found or no sharing permissions');
		}

		const collaborator: Collaborator = {
			id: this.generateId(),
			userId: this.generateId(), // Would normally come from user service
			email,
			name,
			role,
			permissions: this.getPermissionsForRole(role),
			joinedAt: new Date(),
			status: 'pending'
		};

		album.collaborators.push(collaborator);
		album.updatedAt = new Date();
		this.albums.set(albumId, album);

		this.logActivity(albumId, userId, 'added_collaborator', {
			collaboratorId: collaborator.id,
			name,
			role
		});

		// Send invitation (simulated)
		this.sendInvitation(email, album, collaborator);

		return collaborator;
	}

	async removeCollaborator(
		albumId: string,
		collaboratorId: string,
		userId: string
	): Promise<boolean> {
		const album = this.albums.get(albumId);
		if (!album || !this.hasManageAccess(album, userId)) {
			return false;
		}

		const index = album.collaborators.findIndex(c => c.id === collaboratorId);
		if (index === -1) return false;

		const removed = album.collaborators.splice(index, 1)[0];
		album.updatedAt = new Date();
		this.albums.set(albumId, album);

		this.logActivity(albumId, userId, 'removed_collaborator', {
			collaboratorId: removed.id,
			name: removed.name
		});

		return true;
	}

	// Comments and Social Features
	async addComment(
		albumId: string,
		userId: string,
		userName: string,
		content: string,
		photoId?: string,
		parentId?: string
	): Promise<Comment> {
		const album = this.albums.get(albumId);
		if (!album || !this.hasCommentAccess(album, userId)) {
			throw new Error('No permission to comment');
		}

		const comment: Comment = {
			id: this.generateId(),
			albumId,
			photoId,
			userId,
			userName,
			content,
			timestamp: new Date(),
			replies: [],
			likes: 0,
			isLiked: false,
			mentions: this.extractMentions(content)
		};

		if (parentId) {
			// Add as reply
			const parent = this.findComment(album, parentId);
			if (parent) {
				parent.replies.push(comment);
			}
		} else {
			// Add as top-level comment
			album.comments.push(comment);
		}

		album.updatedAt = new Date();
		this.albums.set(albumId, album);

		this.logActivity(albumId, userId, 'added_comment', {
			commentId: comment.id,
			photoId,
			content: content.substring(0, 100)
		});

		this.broadcastToAlbum(albumId, 'comment_added', comment);
		this.notifyMentions(comment, album);

		return comment;
	}

	async addLike(
		albumId: string,
		userId: string,
		userName: string,
		photoId?: string
	): Promise<Like> {
		const album = this.albums.get(albumId);
		if (!album || !this.hasLikeAccess(album, userId)) {
			throw new Error('No permission to like');
		}

		// Check if already liked
		const existingLike = album.likes.find(
			l => l.userId === userId && l.albumId === albumId && l.photoId === photoId
		);

		if (existingLike) {
			// Unlike
			album.likes = album.likes.filter(l => l.id !== existingLike.id);
			this.broadcastToAlbum(albumId, 'like_removed', existingLike);
			return existingLike;
		}

		const like: Like = {
			id: this.generateId(),
			albumId,
			photoId,
			userId,
			userName,
			timestamp: new Date(),
			type: photoId ? 'photo' : 'album'
		};

		album.likes.push(like);
		album.updatedAt = new Date();
		this.albums.set(albumId, album);

		this.logActivity(albumId, userId, 'liked', { photoId });
		this.broadcastToAlbum(albumId, 'like_added', like);

		return like;
	}

	// Real-time Collaboration
	async startCollaborationSession(
		albumId: string,
		userId: string,
		userName: string
	): Promise<CollaborationSession> {
		let session = this.sessions.get(albumId);

		if (!session) {
			session = {
				id: this.generateId(),
				albumId,
				participants: [],
				photoStates: new Map(),
				createdAt: new Date(),
				isActive: true
			};
			this.sessions.set(albumId, session);
		}

		// Add or update participant
		const existingParticipant = session.participants.find(p => p.userId === userId);
		if (!existingParticipant) {
			session.participants.push({
				userId,
				userName,
				joinedAt: new Date(),
				lastSeen: new Date(),
				permissions: ['view']
			});
		} else {
			existingParticipant.lastSeen = new Date();
			existingParticipant.isViewing = true;
		}

		this.broadcastToSession(albumId, 'participant_joined', {
			userId,
			userName,
			participantCount: session.participants.length
		});

		return session;
	}

	async updateParticipantCursor(
		albumId: string,
		userId: string,
		photoId: string,
		cursor: { x: number; y: number }
	): Promise<void> {
		const session = this.sessions.get(albumId);
		if (!session) return;

		const participant = session.participants.find(p => p.userId === userId);
		if (participant) {
			participant.currentPhoto = photoId;
			participant.cursor = cursor;
			participant.lastSeen = new Date();

			this.broadcastToSession(albumId, 'cursor_updated', {
				userId,
				photoId,
				cursor
			}, userId); // Don't send to self
		}
	}

	async leaveCollaborationSession(albumId: string, userId: string): Promise<void> {
		const session = this.sessions.get(albumId);
		if (!session) return;

		const participant = session.participants.find(p => p.userId === userId);
		if (participant) {
			participant.isViewing = false;
			participant.lastSeen = new Date();
		}

		this.broadcastToSession(albumId, 'participant_left', {
			userId,
			participantCount: session.participants.filter(p => p.isViewing).length
		});
	}

	// Real-time Subscriptions
	subscribeToAlbum(albumId: string, callback: (data: any) => void): () => void {
		if (!this.subscribers.has(albumId)) {
			this.subscribers.set(albumId, new Set());
		}

		this.subscribers.get(albumId)!.add(callback);

		// Return unsubscribe function
		return () => {
			const callbacks = this.subscribers.get(albumId);
			if (callbacks) {
				callbacks.delete(callback);
			}
		};
	}

	// Utility Methods
	private hasAccess(album: SharedAlbum, userId: string): boolean {
		return album.collaborators.some(c => c.userId === userId && c.status === 'active') ||
			   album.ownerId === userId;
	}

	private hasEditAccess(album: SharedAlbum, userId: string): boolean {
		const collaborator = album.collaborators.find(c => c.userId === userId);
		return collaborator ?
			collaborator.permissions.includes('edit') || collaborator.role === 'owner' :
			album.ownerId === userId;
	}

	private hasShareAccess(album: SharedAlbum, userId: string): boolean {
		const collaborator = album.collaborators.find(c => c.userId === userId);
		return collaborator ?
			collaborator.permissions.includes('share') || collaborator.role === 'owner' :
			album.ownerId === userId;
	}

	private hasManageAccess(album: SharedAlbum, userId: string): boolean {
		return album.ownerId === userId;
	}

	private hasCommentAccess(album: SharedAlbum, userId: string): boolean {
		return album.permissions.allowComments && this.hasAccess(album, userId);
	}

	private hasLikeAccess(album: SharedAlbum, userId: string): boolean {
		return album.permissions.allowLikes && this.hasAccess(album, userId);
	}

	private getPermissionsForRole(role: Collaborator['role']): string[] {
		switch (role) {
			case 'owner':
				return ['view', 'edit', 'share', 'delete', 'manage'];
			case 'editor':
				return ['view', 'edit', 'comment', 'download'];
			case 'viewer':
				return ['view', 'comment'];
			default:
				return ['view'];
		}
	}

	private findComment(album: SharedAlbum, commentId: string): Comment | null {
		const findInComments = (comments: Comment[]): Comment | null => {
			for (const comment of comments) {
				if (comment.id === commentId) return comment;
				const found = findInComments(comment.replies);
				if (found) return found;
			}
			return null;
		};

		return findInComments(album.comments);
	}

	private extractMentions(content: string): string[] {
		const mentions = content.match(/@(\w+)/g);
		return mentions ? mentions.map(m => m.substring(1)) : [];
	}

	private logActivity(albumId: string, userId: string, userName: string, action: string, details: any): void {
		const log: ActivityLog = {
			id: this.generateId(),
			albumId,
			userId,
			userName,
			action,
			details,
			timestamp: new Date()
		};

		// In production, this would be saved to a database
		console.log('Activity Log:', log);
	}

	private broadcastToAlbum(albumId: string, event: string, data: any): void {
		const callbacks = this.subscribers.get(albumId);
		if (callbacks) {
			callbacks.forEach(callback => {
				try {
					callback({ event, data, timestamp: new Date() });
				} catch (error) {
					console.error('Error in subscription callback:', error);
				}
			});
		}
	}

	private broadcastToSession(albumId: string, event: string, data: any, excludeUserId?: string): void {
		const session = this.sessions.get(albumId);
		if (!session) return;

		this.broadcastToAlbum(albumId, `session_${event}`, {
			...data,
			sessionId: session.id
		});
	}

	private sendInvitation(email: string, album: SharedAlbum, collaborator: Collaborator): void {
		// Simulate sending invitation
		console.log(`Invitation sent to ${email} for album "${album.title}"`);
	}

	private notifyMentions(comment: Comment, album: SharedAlbum): void {
		// Simulate notification for mentions
		comment.mentions.forEach(mention => {
			console.log(`Notification sent to ${mention} for mention in comment`);
		});
	}

	private generateId(): string {
		return Math.random().toString(36).substr(2, 9);
	}

	private generateToken(): string {
		return Math.random().toString(36).substr(2, 12) + Math.random().toString(36).substr(2, 12);
	}

	private getBaseUrl(): string {
		return window.location.origin;
	}

	private initializeSampleData(): void {
		// Initialize with sample shared album
		const sampleAlbum: SharedAlbum = {
			id: 'sample-album-1',
			title: 'Summer Vacation 2024',
			description: 'Our amazing summer trip photos',
			ownerId: 'user-1',
			ownerName: 'John Doe',
			photos: [
				'/photos/beach1.jpg',
				'/photos/mountain2.jpg',
				'/photos/sunset3.jpg'
			],
			permissions: {
				allowComments: true,
				allowLikes: true,
				allowDownload: true,
				allowEdit: false
			},
			shares: [],
			collaborators: [
				{
					id: 'collab-1',
					userId: 'user-1',
					email: 'john@example.com',
					name: 'John Doe',
					role: 'owner',
					permissions: ['view', 'edit', 'share', 'delete', 'manage'],
					joinedAt: new Date('2024-01-15'),
					status: 'active'
				}
			],
			comments: [
				{
					id: 'comment-1',
					albumId: 'sample-album-1',
					userId: 'user-2',
					userName: 'Jane Smith',
					content: 'Amazing photos! Love the sunset shot.',
					timestamp: new Date('2024-01-16T10:30:00'),
					replies: [
						{
							id: 'comment-2',
							albumId: 'sample-album-1',
							userId: 'user-1',
							userName: 'John Doe',
							content: 'Thanks! That one was my favorite too.',
							timestamp: new Date('2024-01-16T11:15:00'),
							replies: [],
							likes: 0,
							isLiked: false,
							mentions: []
						}
					],
					likes: 3,
					isLiked: false,
					mentions: []
				}
			],
			likes: [
				{
					id: 'like-1',
					albumId: 'sample-album-1',
					userId: 'user-2',
					userName: 'Jane Smith',
					timestamp: new Date('2024-01-16T10:35:00'),
					type: 'album'
				}
			],
			createdAt: new Date('2024-01-15'),
			updatedAt: new Date('2024-01-16T11:15:00'),
			isPublic: false,
			tags: ['vacation', 'summer', 'travel'],
			coverPhoto: '/photos/sunset3.jpg'
		};

		this.albums.set(sampleAlbum.id, sampleAlbum);
	}

	// Public API Methods
	async getUserAlbums(userId: string): Promise<SharedAlbum[]> {
		return Array.from(this.albums.values()).filter(
			album => album.collaborators.some(c => c.userId === userId && c.status === 'active')
		);
	}

	async getPublicAlbums(): Promise<SharedAlbum[]> {
		return Array.from(this.albums.values()).filter(album => album.isPublic);
	}

	async searchAlbums(query: string, userId?: string): Promise<SharedAlbum[]> {
		const albums = Array.from(this.albums.values());
		return albums.filter(album => {
			const hasAccess = userId ? this.hasAccess(album, userId) : album.isPublic;
			const matchesQuery =
				album.title.toLowerCase().includes(query.toLowerCase()) ||
				album.description?.toLowerCase().includes(query.toLowerCase()) ||
				album.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

			return hasAccess && matchesQuery;
		});
	}

	async getActivityLog(albumId: string, userId: string): Promise<ActivityLog[]> {
		// In production, this would fetch from database
		return [];
	}
}

export default CollaborativeSharingService;