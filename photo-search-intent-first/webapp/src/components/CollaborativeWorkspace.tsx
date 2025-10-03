/**
 * Collaborative Workspace Component
 * Real-time collaboration interface for shared photo albums
 */

import {
  Activity,
  AlertCircle,
  Check,
  Clock,
  Download,
  Edit,
  Eye,
  Heart,
  Link,
  Lock,
  MessageSquare,
  MoreVertical,
  MousePointer,
  Send,
  Settings,
  Share2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import CollaborativeSharingService, {
  type CollaborationSession,
  type Collaborator,
  type Comment,
  type Like,
  type SessionParticipant,
  type SharedAlbum,
  type ShareLink,
} from "../services/CollaborativeSharingService";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "./ui";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface CollaborativeWorkspaceProps {
  albumId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  onPhotoSelect?: (photoPath: string) => void;
}

export function CollaborativeWorkspace({
  albumId,
  userId,
  userName,
  userAvatar,
  onPhotoSelect,
}: CollaborativeWorkspaceProps) {
  const [album, setAlbum] = useState<SharedAlbum | null>(null);
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [activeUsers, setActiveUsers] = useState<SessionParticipant[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("photos");
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<
    "viewer" | "editor"
  >("viewer");
  const [sharePermissions, setSharePermissions] = useState({
    canComment: true,
    canDownload: false,
    canEdit: false,
  });

  const { toast } = useToast();
  const sharingService = CollaborativeSharingService.getInstance();
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load album data
  useEffect(() => {
    loadAlbum();
    startCollaboration();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      leaveSession();
    };
  }, [albumId, userId]);

  // Auto-scroll to bottom of comments
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  const loadAlbum = async () => {
    try {
      const albumData = await sharingService.getAlbum(albumId, userId);
      if (albumData) {
        setAlbum(albumData);
        setCollaborators(albumData.collaborators);
        setComments(albumData.comments);
        setLikes(albumData.likes);
        setShareLinks(albumData.shares);
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this album.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Loading Album",
        description: "Could not load the shared album.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startCollaboration = async () => {
    try {
      const sessionData = await sharingService.startCollaborationSession(
        albumId,
        userId,
        userName
      );
      setSession(sessionData);
      setActiveUsers(sessionData.participants.filter((p) => p.isViewing));

      // Subscribe to real-time updates
      unsubscribeRef.current = sharingService.subscribeToAlbum(
        albumId,
        (data) => {
          handleRealtimeUpdate(data);
        }
      );
    } catch (error) {
      console.error("Failed to start collaboration session:", error);
    }
  };

  const leaveSession = async () => {
    try {
      await sharingService.leaveCollaborationSession(albumId, userId);
    } catch (error) {
      console.error("Failed to leave session:", error);
    }
  };

  const handleRealtimeUpdate = useCallback(
    (data: unknown) => {
      switch (data.event) {
        case "comment_added":
          if (data.data.photoId === undefined) {
            setComments((prev) => [...prev, data.data]);
          }
          break;
        case "like_added":
        case "like_removed":
          // Refresh likes from album
          loadAlbum();
          break;
        case "participant_joined":
        case "participant_left":
          if (session) {
            setActiveUsers(session.participants.filter((p) => p.isViewing));
          }
          break;
        case "album_updated":
          setAlbum(data.data);
          setCollaborators(data.data.collaborators);
          break;
      }
    },
    [session]
  );

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await sharingService.addComment(
        albumId,
        userId,
        userName,
        newComment,
        undefined,
        replyTo?.id
      );

      setNewComment("");
      setReplyTo(null);

      // Optimistic update will be handled by real-time subscription
    } catch (error) {
      toast({
        title: "Failed to Add Comment",
        description: "Could not post your comment.",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (photoId?: string) => {
    try {
      await sharingService.addLike(albumId, userId, userName, photoId);
    } catch (error) {
      toast({
        title: "Failed to Update Like",
        description: "Could not update your like status.",
        variant: "destructive",
      });
    }
  };

  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail.trim()) return;

    try {
      await sharingService.addCollaborator(
        albumId,
        userId,
        newCollaboratorEmail,
        newCollaboratorEmail.split("@")[0], // Extract name from email
        newCollaboratorRole
      );

      setNewCollaboratorEmail("");
      setShowInviteDialog(false);

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${newCollaboratorEmail}`,
      });

      // Refresh album data
      loadAlbum();
    } catch (error) {
      toast({
        title: "Failed to Send Invitation",
        description: "Could not send the invitation.",
        variant: "destructive",
      });
    }
  };

  const handleCreateShareLink = async () => {
    try {
      const shareLink = await sharingService.createShareLink(
        albumId,
        userId,
        sharePermissions
      );

      // Copy to clipboard
      await navigator.clipboard.writeText(shareLink.url);

      toast({
        title: "Share Link Created",
        description: "Link copied to clipboard!",
      });

      setShowShareDialog(false);
      loadAlbum(); // Refresh share links
    } catch (error) {
      toast({
        title: "Failed to Create Share Link",
        description: "Could not create share link.",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  const getUserRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isLiked = (photoId?: string) => {
    return likes.some(
      (like) =>
        like.userId === userId &&
        like.albumId === albumId &&
        like.photoId === photoId
    );
  };

  const getLikesCount = (photoId?: string) => {
    return likes.filter(
      (like) => like.albumId === albumId && like.photoId === photoId
    ).length;
  };

  if (isLoading) {
    return (
      <div className="collaborative-workspace-loading">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin mr-2">⟳</div>
          Loading collaborative workspace...
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="collaborative-workspace-error">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Album Not Found</h3>
          <p className="text-muted-foreground">
            This album doesn't exist or you don't have permission to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="collaborative-workspace">
      {/* Header */}
      <div className="workspace-header">
        <div className="workspace-info">
          <div className="workspace-title">
            <h2 className="text-xl font-semibold">{album.title}</h2>
            {album.description && (
              <p className="text-sm text-muted-foreground">
                {album.description}
              </p>
            )}
          </div>
          <div className="workspace-meta">
            <div className="active-users">
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 4).map((user, index) => (
                  <Avatar
                    key={user.userId}
                    className="w-6 h-6 border-2 border-background"
                  >
                    <AvatarImage src={user.userAvatar} />
                    <AvatarFallback className="text-xs">
                      {user.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activeUsers.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs">+{activeUsers.length - 4}</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {activeUsers.length} viewing
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {album.photos.length} photos
            </Badge>
            {album.isPublic && (
              <Badge variant="secondary" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Public
              </Badge>
            )}
          </div>
        </div>

        <div className="workspace-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareDialog(true)}
          >
            <Link className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInviteDialog(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="workspace-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="comments">
              Comments
              {comments.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {comments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="collaborators">
              <Users className="w-4 h-4 mr-2" />
              Collaborators
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shared Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="photo-grid">
                  {album.photos.map((photo, index) => (
                    <div key={index} className="photo-item">
                      <div
                        className="photo-container cursor-pointer"
                        onClick={() => onPhotoSelect?.(photo)}
                        role="button"
                        tabIndex={0}
                      >
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-48 object-cover rounded"
                        />
                        <div className="photo-overlay">
                          <div className="photo-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLike(photo);
                              }}
                              className={`text-white hover:text-red-500 ${
                                isLiked(photo) ? "text-red-500" : ""
                              }`}
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  isLiked(photo) ? "fill-current" : ""
                                }`}
                              />
                            </Button>
                            {album.permissions.allowDownload && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="photo-info">
                        <span className="text-xs text-muted-foreground">
                          Photo {index + 1}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {getLikesCount(photo)} likes
                        </span>
                      </div>
                      {/* Active user cursors */}
                      {activeUsers
                        .filter((user) => user.currentPhoto === photo)
                        .map((user) => (
                          <div
                            key={user.userId}
                            className="user-cursor"
                            style={{
                              left: `${user.cursor?.x || 0}%`,
                              top: `${user.cursor?.y || 0}%`,
                            }}
                          >
                            <MousePointer className="w-3 h-3" />
                            <span className="text-xs bg-background rounded px-1 shadow">
                              {user.userName}
                            </span>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Comments & Discussion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="comments-section">
                  {/* Comment Input */}
                  <div className="comment-input">
                    {replyTo && (
                      <div className="reply-to">
                        <span className="text-sm text-muted-foreground">
                          Replying to {replyTo.userName}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyTo(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 min-h-[60px]"
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="comments-list">
                    {comments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                        <p>No comments yet. Start the conversation!</p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          onReply={(comment) => setReplyTo(comment)}
                          onLike={() => handleLike()}
                          currentUserId={userId}
                        />
                      ))
                    )}
                    <div ref={commentsEndRef} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collaborators" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Collaborators</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="collaborators-list">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="collaborator-item">
                      <div className="collaborator-info">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={collaborator.avatar} />
                          <AvatarFallback>
                            {collaborator.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{collaborator.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {collaborator.email}
                          </div>
                        </div>
                      </div>
                      <div className="collaborator-meta">
                        <Badge className={getUserRoleColor(collaborator.role)}>
                          {collaborator.role}
                        </Badge>
                        {collaborator.status === "active" && (
                          <div className="flex items-center text-green-600 text-xs">
                            <div className="w-2 h-2 bg-green-600 rounded-full mr-1" />
                            Active
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Share Links */}
                {shareLinks.length > 0 && (
                  <div className="share-links mt-6">
                    <h4 className="font-medium mb-3">Share Links</h4>
                    {shareLinks.map((link) => (
                      <div key={link.id} className="share-link-item">
                        <div className="share-link-info">
                          <Link className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono truncate">
                            {link.url}
                          </span>
                        </div>
                        <div className="share-link-meta">
                          <Badge variant="outline" className="text-xs">
                            {link.accessCount} views
                          </Badge>
                          {link.expiresAt && (
                            <span className="text-xs text-muted-foreground">
                              Expires {formatTimestamp(link.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="activity-list">
                  {/* Activity items would be populated from the service */}
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2" />
                    <p>No recent activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="dialog-overlay">
          <Card className="dialog-content">
            <CardHeader>
              <CardTitle className="text-base">Create Share Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="permissions-section">
                <h4 className="font-medium">Permissions</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sharePermissions.canComment}
                      onChange={(e) =>
                        setSharePermissions((prev) => ({
                          ...prev,
                          canComment: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    Allow comments
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sharePermissions.canDownload}
                      onChange={(e) =>
                        setSharePermissions((prev) => ({
                          ...prev,
                          canDownload: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    Allow download
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sharePermissions.canEdit}
                      onChange={(e) =>
                        setSharePermissions((prev) => ({
                          ...prev,
                          canEdit: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    Allow editing
                  </label>
                </div>
              </div>

              <div className="dialog-actions">
                <Button
                  variant="outline"
                  onClick={() => setShowShareDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateShareLink}>Create Link</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="dialog-overlay">
          <Card className="dialog-content">
            <CardHeader>
              <CardTitle className="text-base">Invite Collaborator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={newCollaboratorEmail}
                  onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={newCollaboratorRole}
                  onChange={(e) =>
                    setNewCollaboratorRole(e.target.value as unknown)
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="viewer">Viewer - Can view and comment</option>
                  <option value="editor">
                    Editor - Can view, comment, and edit
                  </option>
                </select>
              </div>

              <div className="dialog-actions">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCollaborator}
                  disabled={!newCollaboratorEmail.trim()}
                >
                  Send Invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  onReply: (comment: Comment) => void;
  onLike: () => void;
  currentUserId: string;
}

function CommentItem({
  comment,
  onReply,
  onLike,
  currentUserId,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [newReply, setNewReply] = useState("");

  const handleReply = () => {
    if (newReply.trim()) {
      // Handle reply
      setNewReply("");
    }
  };

  return (
    <div className="comment-item">
      <div className="comment-header">
        <Avatar className="w-6 h-6">
          <AvatarImage src={comment.userAvatar} />
          <AvatarFallback className="text-xs">
            {comment.userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="comment-meta">
          <span className="font-medium text-sm">{comment.userName}</span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(comment.timestamp)}
          </span>
        </div>
      </div>
      <div className="comment-content">
        <p className="text-sm">{comment.content}</p>
      </div>
      <div className="comment-actions">
        <Button variant="ghost" size="sm" onClick={() => onReply(comment)}>
          Reply
        </Button>
        <Button variant="ghost" size="sm" onClick={onLike}>
          <Heart
            className={`w-3 h-3 ${
              comment.isLiked ? "fill-current text-red-500" : ""
            }`}
          />
          {comment.likes > 0 && (
            <span className="text-xs ml-1">{comment.likes}</span>
          )}
        </Button>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="comment-replies">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs"
          >
            {showReplies ? "Hide" : "Show"} {comment.replies.length} replies
          </Button>
          {showReplies && (
            <div className="replies-list ml-8">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onLike={onLike}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: Date | string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default CollaborativeWorkspace;
