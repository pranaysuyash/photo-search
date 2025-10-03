/**
 * Social Sharing Modal
 * Modal for sharing photos and albums with social features
 */

import {
  Check,
  Clock,
  Copy,
  Download,
  Eye,
  Facebook,
  Globe,
  Heart,
  Instagram,
  Link,
  Lock,
  Mail,
  MessageSquare,
  MoreHorizontal,
  QrCode,
  Settings,
  Share2,
  Twitter,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import CollaborativeSharingService, {
  Collaborator,
  type SharedAlbum,
  type ShareLink,
} from "../services/CollaborativeSharingService";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "./ui";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface SocialSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  title?: string;
  description?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
}

export function SocialSharingModal({
  isOpen,
  onClose,
  photos,
  title = "Photo Collection",
  description,
  userId,
  userName,
  userAvatar,
}: SocialSharingModalProps) {
  const [activeTab, setActiveTab] = useState("quick");
  const [sharedAlbum, setSharedAlbum] = useState<SharedAlbum | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [shareSettings, setShareSettings] = useState({
    allowComments: true,
    allowLikes: true,
    allowDownload: false,
    expiresIn: "never", // never, 1day, 1week, 1month
    requirePassword: false,
    password: "",
    isPublic: false,
  });

  const { toast } = useToast();
  const sharingService = CollaborativeSharingService.getInstance();

  useEffect(() => {
    if (isOpen && photos.length > 0) {
      // Auto-create or load album for these photos
      initializeSharedAlbum();
    }
  }, [isOpen, photos]);

  const initializeSharedAlbum = async () => {
    try {
      // Check if we already have an album for these photos
      const userAlbums = await sharingService.getUserAlbums(userId);
      const existingAlbum = userAlbums.find(
        (album) =>
          album.photos.length === photos.length &&
          album.photos.every((photo) => photos.includes(photo))
      );

      if (existingAlbum) {
        setSharedAlbum(existingAlbum);
        setShareLinks(existingAlbum.shares);
      } else {
        // Create new shared album
        const newAlbum = await sharingService.createAlbum(
          title,
          userId,
          userName,
          photos,
          {
            allowComments: shareSettings.allowComments,
            allowLikes: shareSettings.allowLikes,
            allowDownload: shareSettings.allowDownload,
          }
        );
        setSharedAlbum(newAlbum);
      }
    } catch (error) {
      console.error("Failed to initialize shared album:", error);
    }
  };

  const handleCreateShareLink = async () => {
    if (!sharedAlbum) return;

    setIsCreating(true);
    try {
      const expiresAt =
        shareSettings.expiresIn !== "never"
          ? new Date(Date.now() + getExpirationMs(shareSettings.expiresIn))
          : undefined;

      const shareLink = await sharingService.createShareLink(
        sharedAlbum.id,
        userId,
        {
          canComment: shareSettings.allowComments,
          canDownload: shareSettings.allowDownload,
          canEdit: false,
        },
        expiresAt,
        shareSettings.requirePassword ? shareSettings.password : undefined
      );

      setShareUrl(shareLink.url);
      setShareLinks((prev) => [...prev, shareLink]);

      toast({
        title: "Share Link Created",
        description: "Link has been copied to clipboard!",
      });

      // Copy to clipboard
      await navigator.clipboard.writeText(shareLink.url);
    } catch (error) {
      toast({
        title: "Failed to Create Share Link",
        description: "Could not create share link.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied",
        description: "Share link copied to clipboard!",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleSocialShare = async (platform: string) => {
    if (!shareUrl) {
      await handleCreateShareLink();
      return;
    }

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description || "");

    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    };

    const url = urls[platform as keyof typeof urls];
    if (url) {
      window.open(url, "_blank", "width=600,height=400");
    }
  };

  const getExpirationMs = (period: string): number => {
    const day = 24 * 60 * 60 * 1000;
    switch (period) {
      case "1day":
        return day;
      case "1week":
        return 7 * day;
      case "1month":
        return 30 * day;
      default:
        return 0;
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTotalStats = () => {
    if (!sharedAlbum) return { views: 0, likes: 0, comments: 0 };

    return {
      views: shareLinks.reduce((sum, link) => sum + link.accessCount, 0),
      likes: sharedAlbum.likes.length,
      comments: sharedAlbum.comments.length,
    };
  };

  if (!isOpen) return null;

  const stats = getTotalStats();

  return (
    <div className="modal-overlay">
      <Card className="modal-content social-sharing-modal">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Photos
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {photos.length} photo{photos.length > 1 ? "s" : ""}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="quick">Quick Share</TabsTrigger>
              <TabsTrigger value="link">Share Link</TabsTrigger>
              <TabsTrigger value="collaborate">Collaborate</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Quick Share */}
            <TabsContent value="quick" className="space-y-4">
              <div className="quick-share-options">
                <div className="social-buttons">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSocialShare("facebook")}
                  >
                    <Facebook className="w-4 h-4 mr-2" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSocialShare("twitter")}
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSocialShare("linkedin")}
                  >
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                </div>

                <div className="social-buttons">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSocialShare("email")}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSocialShare("reddit")}
                  >
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    Reddit
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCreateShareLink}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <div className="animate-spin mr-2">⟳</div>
                    ) : (
                      <Link className="w-4 h-4 mr-2" />
                    )}
                    Copy Link
                  </Button>
                </div>
              </div>

              {/* Stats */}
              {shareUrl && (
                <Card className="stats-card">
                  <CardContent className="pt-6">
                    <div className="stats-grid">
                      <div className="stat-item">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-lg font-semibold">
                            {stats.views}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Views
                          </div>
                        </div>
                      </div>
                      <div className="stat-item">
                        <Heart className="w-4 h-4 text-red-500" />
                        <div>
                          <div className="text-lg font-semibold">
                            {stats.likes}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Likes
                          </div>
                        </div>
                      </div>
                      <div className="stat-item">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-lg font-semibold">
                            {stats.comments}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Comments
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Share Link */}
            <TabsContent value="link" className="space-y-4">
              <div className="link-settings">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Share Link
                  </label>
                  {shareUrl ? (
                    <div className="flex gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleCopyLink(shareUrl)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleCreateShareLink}
                      disabled={isCreating || !sharedAlbum}
                      className="w-full"
                    >
                      {isCreating ? (
                        <div className="animate-spin mr-2">⟳</div>
                      ) : (
                        <>
                          <Link className="w-4 h-4 mr-2" />
                          Create Share Link
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="settings-section">
                  <h4 className="font-medium mb-3">Permissions</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareSettings.allowComments}
                        onChange={(e) =>
                          setShareSettings((prev) => ({
                            ...prev,
                            allowComments: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Allow comments</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareSettings.allowLikes}
                        onChange={(e) =>
                          setShareSettings((prev) => ({
                            ...prev,
                            allowLikes: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Allow likes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareSettings.allowDownload}
                        onChange={(e) =>
                          setShareSettings((prev) => ({
                            ...prev,
                            allowDownload: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Allow download</span>
                    </label>
                  </div>
                </div>

                <div className="settings-section">
                  <h4 className="font-medium mb-3">Access Control</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Link expires
                      </label>
                      <select
                        value={shareSettings.expiresIn}
                        onChange={(e) =>
                          setShareSettings((prev) => ({
                            ...prev,
                            expiresIn: e.target.value,
                          }))
                        }
                        className="w-full p-2 border rounded"
                      >
                        <option value="never">Never</option>
                        <option value="1day">1 Day</option>
                        <option value="1week">1 Week</option>
                        <option value="1month">1 Month</option>
                      </select>
                    </div>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareSettings.requirePassword}
                        onChange={(e) =>
                          setShareSettings((prev) => ({
                            ...prev,
                            requirePassword: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      <span className="text-sm">Require password</span>
                    </label>

                    {shareSettings.requirePassword && (
                      <Input
                        type="password"
                        placeholder="Enter password"
                        value={shareSettings.password}
                        onChange={(e) =>
                          setShareSettings((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>

                {shareUrl && (
                  <div className="qr-code-section">
                    <h4 className="font-medium mb-3">QR Code</h4>
                    <div className="qr-code-placeholder">
                      <QrCode className="w-32 h-32 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mt-2">
                        Scan to open share link
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Collaborate */}
            <TabsContent value="collaborate" className="space-y-4">
              <div className="collaborate-section">
                <div className="collaborator-invite">
                  <h4 className="font-medium mb-3">Invite Collaborators</h4>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      className="flex-1"
                    />
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                  </div>
                </div>

                {sharedAlbum && sharedAlbum.collaborators.length > 1 && (
                  <div className="collaborators-list">
                    <h4 className="font-medium mb-3">Collaborators</h4>
                    <div className="space-y-2">
                      {sharedAlbum.collaborators
                        .filter((c) => c.userId !== userId)
                        .map((collaborator) => (
                          <div
                            key={collaborator.id}
                            className="collaborator-item"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={collaborator.avatar} />
                              <AvatarFallback className="text-xs">
                                {collaborator.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm ml-2">
                              {collaborator.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="ml-auto text-xs"
                            >
                              {collaborator.role}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="collaboration-benefits">
                  <h4 className="font-medium mb-3">Collaboration Features</h4>
                  <div className="feature-grid">
                    <div className="feature-item">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Comments & Discussion</span>
                    </div>
                    <div className="feature-item">
                      <Users className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Real-time Editing</span>
                    </div>
                    <div className="feature-item">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Likes & Reactions</span>
                    </div>
                    <div className="feature-item">
                      <Eye className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">View Analytics</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Advanced */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="advanced-settings">
                <div className="settings-section">
                  <h4 className="font-medium mb-3">Album Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Title
                      </label>
                      <Input
                        value={title}
                        onChange={(e) => {
                          // Update album title
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <textarea
                        value={description || ""}
                        onChange={(e) => {
                          // Update album description
                        }}
                        className="w-full p-2 border rounded"
                        rows={3}
                        placeholder="Add a description..."
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h4 className="font-medium mb-3">Privacy Settings</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareSettings.isPublic}
                        onChange={(e) =>
                          setShareSettings((prev) => ({
                            ...prev,
                            isPublic: e.target.checked,
                          }))
                        }
                        className="mr-2"
                      />
                      <Globe className="w-4 h-4 mr-2" />
                      <span className="text-sm">Make public</span>
                    </label>
                  </div>
                </div>

                {shareLinks.length > 0 && (
                  <div className="share-links-section">
                    <h4 className="font-medium mb-3">Active Share Links</h4>
                    <div className="space-y-2">
                      {shareLinks.map((link) => (
                        <div key={link.id} className="share-link-item">
                          <div className="share-link-info">
                            <Link className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-mono truncate flex-1">
                              {link.url}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {link.accessCount} views
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created {formatDate(link.createdAt)}
                            {link.expiresAt &&
                              ` • Expires ${formatDate(link.expiresAt)}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default SocialSharingModal;
