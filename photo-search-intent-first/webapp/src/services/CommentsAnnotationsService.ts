/**
 * Comments & Annotations Service
 * Handles photo comments, annotations, mentions, and discussions
 */

export interface Comment {
	id: string;
	photoPath: string;
	userId: string;
	userName: string;
	userAvatar?: string;
	text: string;
	mentions: string[]; // User IDs
	timestamp: Date;
	edited?: Date;
	replyTo?: string; // Parent comment ID
	reactions: Reaction[];
	resolved?: boolean;
}

export interface Reaction {
	userId: string;
	emoji: string;
	timestamp: Date;
}

export interface Annotation {
	id: string;
	photoPath: string;
	userId: string;
	userName: string;
	type: "rectangle" | "circle" | "arrow" | "text" | "freehand";
	coordinates: {
		x: number; // Percentage of image width
		y: number; // Percentage of image height
		width?: number; // For rectangles
		height?: number; // For rectangles
		radius?: number; // For circles
		points?: Array<{ x: number; y: number }>; // For freehand/arrow
	};
	style: {
		color: string;
		strokeWidth: number;
		fontSize?: number;
		fontWeight?: string;
		opacity?: number;
	};
	text?: string;
	timestamp: Date;
	visible: boolean;
	linkedCommentId?: string;
}

export interface Discussion {
	photoPath: string;
	comments: Comment[];
	annotations: Annotation[];
	participants: Set<string>;
	lastActivity: Date;
	unresolvedCount: number;
}

export class CommentsAnnotationsService {
	private static comments = new Map<string, Comment[]>(); // photoPath -> comments
	private static annotations = new Map<string, Annotation[]>(); // photoPath -> annotations
	private static discussions = new Map<string, Discussion>(); // photoPath -> discussion
	private static mentionCallbacks = new Set<
		(userId: string, comment: Comment) => void
	>();

	/**
	 * Add a comment to a photo
	 */
	static async addComment(
		photoPath: string,
		userId: string,
		userName: string,
		text: string,
		replyTo?: string,
		mentions?: string[],
	): Promise<Comment> {
		const comment: Comment = {
			id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			photoPath,
			userId,
			userName,
			text,
			mentions: mentions || [],
			timestamp: new Date(),
			replyTo,
			reactions: [],
			resolved: false,
		};

		// Add to comments map
		if (!CommentsAnnotationsService.comments.has(photoPath)) {
			CommentsAnnotationsService.comments.set(photoPath, []);
		}
		CommentsAnnotationsService.comments.get(photoPath)?.push(comment);

		// Update discussion
		CommentsAnnotationsService.updateDiscussion(photoPath);

		// Notify mentioned users
		if (mentions && mentions.length > 0) {
			CommentsAnnotationsService.notifyMentions(mentions, comment);
		}

		return comment;
	}

	/**
	 * Edit a comment
	 */
	static async editComment(
		commentId: string,
		photoPath: string,
		newText: string,
		newMentions?: string[],
	): Promise<Comment> {
		const comments = CommentsAnnotationsService.comments.get(photoPath) || [];
		const comment = comments.find((c) => c.id === commentId);

		if (!comment) {
			throw new Error("Comment not found");
		}

		comment.text = newText;
		comment.edited = new Date();

		if (newMentions) {
			// Notify new mentions
			const previousMentions = new Set(comment.mentions);
			const addedMentions = newMentions.filter((m) => !previousMentions.has(m));

			if (addedMentions.length > 0) {
				CommentsAnnotationsService.notifyMentions(addedMentions, comment);
			}

			comment.mentions = newMentions;
		}

		CommentsAnnotationsService.updateDiscussion(photoPath);

		return comment;
	}

	/**
	 * Delete a comment
	 */
	static async deleteComment(
		commentId: string,
		photoPath: string,
	): Promise<void> {
		const comments = CommentsAnnotationsService.comments.get(photoPath) || [];
		const filteredComments = comments.filter((c) => c.id !== commentId);

		if (filteredComments.length === 0) {
			CommentsAnnotationsService.comments.delete(photoPath);
		} else {
			CommentsAnnotationsService.comments.set(photoPath, filteredComments);
		}

		CommentsAnnotationsService.updateDiscussion(photoPath);
	}

	/**
	 * Add reaction to comment
	 */
	static async addReaction(
		commentId: string,
		photoPath: string,
		userId: string,
		emoji: string,
	): Promise<void> {
		const comments = CommentsAnnotationsService.comments.get(photoPath) || [];
		const comment = comments.find((c) => c.id === commentId);

		if (!comment) return;

		// Remove existing reaction from same user
		comment.reactions = comment.reactions.filter((r) => r.userId !== userId);

		// Add new reaction
		comment.reactions.push({
			userId,
			emoji,
			timestamp: new Date(),
		});

		CommentsAnnotationsService.updateDiscussion(photoPath);
	}

	/**
	 * Mark comment as resolved
	 */
	static async resolveComment(
		commentId: string,
		photoPath: string,
		resolved: boolean = true,
	): Promise<void> {
		const comments = CommentsAnnotationsService.comments.get(photoPath) || [];
		const comment = comments.find((c) => c.id === commentId);

		if (comment) {
			comment.resolved = resolved;
			CommentsAnnotationsService.updateDiscussion(photoPath);
		}
	}

	/**
	 * Add annotation to photo
	 */
	static async addAnnotation(
		photoPath: string,
		userId: string,
		userName: string,
		annotation: Omit<
			Annotation,
			"id" | "photoPath" | "userId" | "userName" | "timestamp"
		>,
	): Promise<Annotation> {
		const newAnnotation: Annotation = {
			id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			photoPath,
			userId,
			userName,
			timestamp: new Date(),
			...annotation,
		};

		if (!CommentsAnnotationsService.annotations.has(photoPath)) {
			CommentsAnnotationsService.annotations.set(photoPath, []);
		}
		CommentsAnnotationsService.annotations.get(photoPath)?.push(newAnnotation);

		CommentsAnnotationsService.updateDiscussion(photoPath);

		return newAnnotation;
	}

	/**
	 * Update annotation
	 */
	static async updateAnnotation(
		annotationId: string,
		photoPath: string,
		updates: Partial<Annotation>,
	): Promise<Annotation> {
		const annotations =
			CommentsAnnotationsService.annotations.get(photoPath) || [];
		const annotation = annotations.find((a) => a.id === annotationId);

		if (!annotation) {
			throw new Error("Annotation not found");
		}

		Object.assign(annotation, updates);
		CommentsAnnotationsService.updateDiscussion(photoPath);

		return annotation;
	}

	/**
	 * Delete annotation
	 */
	static async deleteAnnotation(
		annotationId: string,
		photoPath: string,
	): Promise<void> {
		const annotations =
			CommentsAnnotationsService.annotations.get(photoPath) || [];
		const filteredAnnotations = annotations.filter(
			(a) => a.id !== annotationId,
		);

		if (filteredAnnotations.length === 0) {
			CommentsAnnotationsService.annotations.delete(photoPath);
		} else {
			CommentsAnnotationsService.annotations.set(
				photoPath,
				filteredAnnotations,
			);
		}

		CommentsAnnotationsService.updateDiscussion(photoPath);
	}

	/**
	 * Toggle annotation visibility
	 */
	static async toggleAnnotationVisibility(
		annotationId: string,
		photoPath: string,
	): Promise<void> {
		const annotations =
			CommentsAnnotationsService.annotations.get(photoPath) || [];
		const annotation = annotations.find((a) => a.id === annotationId);

		if (annotation) {
			annotation.visible = !annotation.visible;
			CommentsAnnotationsService.updateDiscussion(photoPath);
		}
	}

	/**
	 * Get discussion for a photo
	 */
	static getDiscussion(photoPath: string): Discussion | null {
		return CommentsAnnotationsService.discussions.get(photoPath) || null;
	}

	/**
	 * Get comments for a photo
	 */
	static getComments(photoPath: string): Comment[] {
		return CommentsAnnotationsService.comments.get(photoPath) || [];
	}

	/**
	 * Get annotations for a photo
	 */
	static getAnnotations(photoPath: string): Annotation[] {
		return CommentsAnnotationsService.annotations.get(photoPath) || [];
	}

	/**
	 * Search comments
	 */
	static searchComments(
		query: string,
	): Array<{ comment: Comment; photoPath: string }> {
		const results: Array<{ comment: Comment; photoPath: string }> = [];
		const lowercaseQuery = query.toLowerCase();

		CommentsAnnotationsService.comments.forEach((comments, photoPath) => {
			comments.forEach((comment) => {
				if (
					comment.text.toLowerCase().includes(lowercaseQuery) ||
					comment.userName.toLowerCase().includes(lowercaseQuery)
				) {
					results.push({ comment, photoPath });
				}
			});
		});

		return results;
	}

	/**
	 * Get user's mentions
	 */
	static getUserMentions(userId: string): Comment[] {
		const mentions: Comment[] = [];

		CommentsAnnotationsService.comments.forEach((comments) => {
			comments.forEach((comment) => {
				if (comment.mentions.includes(userId)) {
					mentions.push(comment);
				}
			});
		});

		return mentions.sort(
			(a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
		);
	}

	/**
	 * Subscribe to mention notifications
	 */
	static onMention(
		callback: (userId: string, comment: Comment) => void,
	): () => void {
		CommentsAnnotationsService.mentionCallbacks.add(callback);

		return () => {
			CommentsAnnotationsService.mentionCallbacks.delete(callback);
		};
	}

	/**
	 * Update discussion metadata
	 */
	private static updateDiscussion(photoPath: string): void {
		const comments = CommentsAnnotationsService.comments.get(photoPath) || [];
		const annotations =
			CommentsAnnotationsService.annotations.get(photoPath) || [];

		if (comments.length === 0 && annotations.length === 0) {
			CommentsAnnotationsService.discussions.delete(photoPath);
			return;
		}

		const participants = new Set<string>();
		comments.forEach((c) => participants.add(c.userId));
		annotations.forEach((a) => participants.add(a.userId));

		const unresolvedCount = comments.filter((c) => !c.resolved).length;

		const discussion: Discussion = {
			photoPath,
			comments,
			annotations,
			participants,
			lastActivity: new Date(),
			unresolvedCount,
		};

		CommentsAnnotationsService.discussions.set(photoPath, discussion);
	}

	/**
	 * Notify mentioned users
	 */
	private static notifyMentions(userIds: string[], comment: Comment): void {
		userIds.forEach((userId) => {
			CommentsAnnotationsService.mentionCallbacks.forEach((callback) => {
				callback(userId, comment);
			});
		});
	}

	/**
	 * Export discussion as markdown
	 */
	static exportDiscussion(photoPath: string): string {
		const discussion = CommentsAnnotationsService.getDiscussion(photoPath);
		if (!discussion) return "";

		let markdown = `# Discussion for ${photoPath}\n\n`;
		markdown += `**Participants:** ${discussion.participants.size}\n`;
		markdown += `**Last Activity:** ${discussion.lastActivity.toLocaleString()}\n\n`;

		if (discussion.comments.length > 0) {
			markdown += "## Comments\n\n";

			// Build comment tree
			const rootComments = discussion.comments.filter((c) => !c.replyTo);

			const renderComment = (comment: Comment, indent: number = 0): string => {
				const prefix = "  ".repeat(indent);
				let text = `${prefix}- **${comment.userName}** (${comment.timestamp.toLocaleString()})`;

				if (comment.resolved) text += " ✓";
				text += `\n${prefix}  ${comment.text}\n`;

				if (comment.reactions.length > 0) {
					const reactionCounts = new Map<string, number>();
					comment.reactions.forEach((r) => {
						reactionCounts.set(r.emoji, (reactionCounts.get(r.emoji) || 0) + 1);
					});
					text += `${prefix}  Reactions: ${Array.from(reactionCounts.entries())
						.map(([emoji, count]) => `${emoji} (${count})`)
						.join(", ")}\n`;
				}

				// Add replies
				const replies = discussion.comments.filter(
					(c) => c.replyTo === comment.id,
				);
				replies.forEach((reply) => {
					text += renderComment(reply, indent + 1);
				});

				return text;
			};

			rootComments.forEach((comment) => {
				markdown += renderComment(comment);
			});
		}

		if (discussion.annotations.length > 0) {
			markdown += "\n## Annotations\n\n";
			discussion.annotations.forEach((annotation) => {
				markdown += `- **${annotation.userName}** added ${annotation.type} annotation`;
				if (annotation.text) {
					markdown += `: "${annotation.text}"`;
				}
				markdown += ` (${annotation.timestamp.toLocaleString()})\n`;
			});
		}

		return markdown;
	}
}
