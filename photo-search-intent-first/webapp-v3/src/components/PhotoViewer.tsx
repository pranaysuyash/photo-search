/**
 * PhotoViewer.tsx
 *
 * INTENT: Full-screen photo viewer with keyboard navigation, zoom controls,
 * slideshow mode, and metadata editing capabilities. Provides an immersive
 * viewing experience for photo collections.
 *
 * DESIGN PHILOSOPHY:
 * - Immersive Experience: Full-screen modal with minimal UI
 * - Keyboard First: Complete keyboard navigation support
 * - Touch Friendly: Gesture support for mobile/tablet
 * - Performance: Efficient image loading and caching
 * - Accessibility: Screen reader support and focus management
 *
 * FEATURES:
 * - Full-screen modal display with backdrop
 * - Keyboard navigation (arrow keys, ESC, space, etc.)
 * - Zoom and pan controls with smooth animations
 * - Slideshow mode with auto-advance
 * - Metadata display panel with inline editing
 * - Support for both images and videos
 * - Loading states and error handling
 * - Touch/swipe gestures for mobile
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo,
  type KeyboardEvent,
  type WheelEvent,
  type MouseEvent,
  type TouchEvent
} from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Play,
  Pause,
  Heart,
  Share2,
  Download,
  Info,
  Edit3,
  Save,
  Calendar,
  Camera,
  MapPin,
  Eye,
  Maximize,
  Minimize,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fileSystemService } from "@/services/fileSystemService";
import "./PhotoViewer.css";

export interface ViewerPhoto {
  id: string;
  path: string;
  src: string;
  thumbnailUrl?: string;
  title?: string;
  isVideo?: boolean;
  favorite?: boolean;
  score?: number;
  metadata?: {
    timestamp?: number;
    width?: number;
    height?: number;
    fileSize?: number;
    camera?: string;
    lens?: string;
    iso?: number;
    aperture?: number;
    shutterSpeed?: string;
    focalLength?: number;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    views?: number;
    lastViewed?: number;
  };
}

interface PhotoViewerProps {
  photos: ViewerPhoto[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onToggleFavorite?: (photoId: string, favorite: boolean) => void;
  onUpdateMetadata?: (photoId: string, metadata: Partial<ViewerPhoto["metadata"]>) => void;
  onShare?: (photo: ViewerPhoto) => void;
  onDownload?: (photo: ViewerPhoto) => void;
  /** Enable slideshow mode */
  enableSlideshow?: boolean;
  /** Slideshow interval in milliseconds */
  slideshowInterval?: number;
}

interface ZoomState {
  scale: number;
  x: number;
  y: number;
}

/**
 * Photo Viewer Component
 */
export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  onToggleFavorite,
  onUpdateMetadata,
  onShare,
  onDownload,
  enableSlideshow = true,
  slideshowInterval = 3000,
}) => {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [secureUrl, setSecureUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideshowTimerRef = useRef<NodeJS.Timeout>();

  const currentPhoto = useMemo(() => {
    return photos[currentIndex] || null;
  }, [photos, currentIndex]);

  // Load secure URL for current photo
  useEffect(() => {
    if (!currentPhoto || !fileSystemService.isAvailable()) {
      setSecureUrl(currentPhoto?.src || "");
      setIsLoading(false);
      return;
    }

    const loadSecureUrl = async () => {
      setIsLoading(true);
      try {
        const url = await fileSystemService.getSecureFileUrl(currentPhoto.path);
        setSecureUrl(url);
      } catch (error) {
        console.error("Failed to get secure URL:", error);
        setSecureUrl(currentPhoto.src);
      } finally {
        setIsLoading(false);
      }
    };

    loadSecureUrl();
  }, [currentPhoto]);

  // Reset zoom and rotation when photo changes
  useEffect(() => {
    setZoom({ scale: 1, x: 0, y: 0 });
    setRotation(0);
    setIsEditingTitle(false);
    setEditedTitle(currentPhoto?.title || "");
  }, [currentIndex, currentPhoto]);

  // Slideshow timer
  useEffect(() => {
    if (isSlideshow && enableSlideshow && photos.length > 1) {
      slideshowTimerRef.current = setInterval(() => {
        if (currentIndex < photos.length - 1) {
          onNext?.();
        } else {
          // Loop back to first photo
          // This would need to be handled by parent component
          setIsSlideshow(false);
        }
      }, slideshowInterval);
    } else {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
      }
    }

    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
      }
    };
  }, [isSlideshow, currentIndex, photos.length, onNext, enableSlideshow, slideshowInterval]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Don't handle keys when editing
      if (isEditingTitle) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onPrevious?.();
          break;
        case "ArrowRight":
        case " ":
          e.preventDefault();
          onNext?.();
          break;
        case "f":
        case "F11":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "i":
        case "I":
          e.preventDefault();
          setShowMetadata(!showMetadata);
          break;
        case "s":
        case "S":
          if (enableSlideshow) {
            e.preventDefault();
            setIsSlideshow(!isSlideshow);
          }
          break;
        case "r":
        case "R":
          e.preventDefault();
          setRotation((prev) => (prev + 90) % 360);
          break;
        case "+":
        case "=":
          e.preventDefault();
          handleZoom(0.2);
          break;
        case "-":
          e.preventDefault();
          handleZoom(-0.2);
          break;
        case "0":
          e.preventDefault();
          resetZoom();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isEditingTitle, showMetadata, isSlideshow, enableSlideshow, onClose, onNext, onPrevious]);

  // Fullscreen API
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.error("Failed to enter fullscreen:", error);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        console.error("Failed to exit fullscreen:", error);
      }
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Zoom functions
  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => {
      const newScale = Math.max(0.1, Math.min(5, prev.scale + delta));
      return { ...prev, scale: newScale };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoom({ scale: 1, x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      handleZoom(delta);
    }
  }, [handleZoom]);

  // Pan functions
  const handlePan = useCallback((info: PanInfo) => {
    if (zoom.scale > 1) {
      setZoom((prev) => ({
        ...prev,
        x: prev.x + info.delta.x,
        y: prev.y + info.delta.y,
      }));
    }
  }, [zoom.scale]);

  // Touch gestures
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch to zoom (would need more complex implementation)
      e.preventDefault();
    }
  }, []);

  // Metadata editing
  const handleSaveTitle = useCallback(() => {
    if (currentPhoto && editedTitle !== currentPhoto.title) {
      onUpdateMetadata?.(currentPhoto.id, { 
        ...currentPhoto.metadata,
        title: editedTitle 
      });
    }
    setIsEditingTitle(false);
  }, [currentPhoto, editedTitle, onUpdateMetadata]);

  const handleToggleFavorite = useCallback(() => {
    if (currentPhoto) {
      onToggleFavorite?.(currentPhoto.id, !currentPhoto.favorite);
    }
  }, [currentPhoto, onToggleFavorite]);

  if (!isOpen || !currentPhoto) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="photo-viewer-dialog"
        ref={containerRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
      >
        <div className="photo-viewer-container">
          {/* Header Controls */}
          <div className="photo-viewer-header">
            <div className="photo-viewer-header-left">
              <span className="photo-viewer-counter">
                {currentIndex + 1} / {photos.length}
              </span>
              {currentPhoto.score && (
                <Badge variant="secondary" className="photo-viewer-score">
                  {Math.round(currentPhoto.score * 100)}% match
                </Badge>
              )}
            </div>

            <div className="photo-viewer-header-right">
              {enableSlideshow && photos.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSlideshow(!isSlideshow)}
                  className="photo-viewer-control"
                >
                  {isSlideshow ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetadata(!showMetadata)}
                className="photo-viewer-control"
              >
                <Info className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="photo-viewer-control"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="photo-viewer-control"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="photo-viewer-content">
            {/* Navigation Buttons */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  className="photo-viewer-nav photo-viewer-nav-prev"
                  onClick={onPrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  className="photo-viewer-nav photo-viewer-nav-next"
                  onClick={onNext}
                  disabled={currentIndex === photos.length - 1}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Media Display */}
            <div className="photo-viewer-media-container">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhoto.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="photo-viewer-media"
                  drag={zoom.scale > 1}
                  onPan={handlePan}
                  style={{
                    transform: `scale(${zoom.scale}) translate(${zoom.x}px, ${zoom.y}px) rotate(${rotation}deg)`,
                  }}
                >
                  {isLoading ? (
                    <div className="photo-viewer-loading">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  ) : currentPhoto.isVideo ? (
                    <video
                      ref={videoRef}
                      src={secureUrl || currentPhoto.src}
                      controls
                      className="photo-viewer-video"
                      preload="metadata"
                      onLoadStart={() => setIsLoading(false)}
                      onLoadedMetadata={() => {
                        // Video metadata loaded - could extract duration, dimensions, etc.
                        if (videoRef.current) {
                          console.log('Video metadata:', {
                            duration: videoRef.current.duration,
                            videoWidth: videoRef.current.videoWidth,
                            videoHeight: videoRef.current.videoHeight
                          });
                        }
                      }}
                    />
                  ) : (
                    <img
                      ref={imageRef}
                      src={secureUrl || currentPhoto.src}
                      alt={currentPhoto.title || `Photo ${currentIndex + 1}`}
                      className="photo-viewer-image"
                      onLoad={() => setIsLoading(false)}
                      onError={() => setIsLoading(false)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Zoom Controls */}
            <div className="photo-viewer-zoom-controls">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZoom(-0.2)}
                disabled={zoom.scale <= 0.1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="photo-viewer-zoom-level">
                {Math.round(zoom.scale * 100)}%
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZoom(0.2)}
                disabled={zoom.scale >= 5}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={resetZoom}
                disabled={zoom.scale === 1 && zoom.x === 0 && zoom.y === 0}
              >
                Reset
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="photo-viewer-footer">
            <div className="photo-viewer-footer-left">
              {isEditingTitle ? (
                <div className="photo-viewer-title-edit">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        handleSaveTitle();
                      } else if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setEditedTitle(currentPhoto.title || "");
                      }
                    }}
                    className="photo-viewer-title-input"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveTitle}>
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="photo-viewer-title-display">
                  <h3 className="photo-viewer-title">
                    {currentPhoto.title || `Photo ${currentIndex + 1}`}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingTitle(true)}
                    className="photo-viewer-edit-title"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="photo-viewer-footer-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
                className={cn(
                  "photo-viewer-action",
                  currentPhoto.favorite && "text-red-500"
                )}
              >
                <Heart className={cn("h-4 w-4", currentPhoto.favorite && "fill-current")} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShare?.(currentPhoto)}
                className="photo-viewer-action"
              >
                <Share2 className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload?.(currentPhoto)}
                className="photo-viewer-action"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Metadata Panel */}
          <AnimatePresence>
            {showMetadata && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className="photo-viewer-metadata"
              >
                <DialogHeader>
                  <DialogTitle>Photo Information</DialogTitle>
                </DialogHeader>

                <div className="photo-viewer-metadata-content">
                  {currentPhoto.metadata?.timestamp && (
                    <div className="photo-viewer-metadata-item">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(currentPhoto.metadata.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {currentPhoto.metadata?.camera && (
                    <div className="photo-viewer-metadata-item">
                      <Camera className="h-4 w-4" />
                      <span>{currentPhoto.metadata.camera}</span>
                    </div>
                  )}

                  {currentPhoto.metadata?.location && (
                    <div className="photo-viewer-metadata-item">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {currentPhoto.metadata.location.address || 
                         `${currentPhoto.metadata.location.latitude.toFixed(6)}, ${currentPhoto.metadata.location.longitude.toFixed(6)}`}
                      </span>
                    </div>
                  )}

                  {currentPhoto.metadata?.views && (
                    <div className="photo-viewer-metadata-item">
                      <Eye className="h-4 w-4" />
                      <span>{currentPhoto.metadata.views} views</span>
                    </div>
                  )}

                  {/* Technical Details */}
                  {(currentPhoto.metadata?.width || currentPhoto.metadata?.height) && (
                    <div className="photo-viewer-metadata-section">
                      <h4>Dimensions</h4>
                      <p>
                        {currentPhoto.metadata.width} × {currentPhoto.metadata.height}
                      </p>
                    </div>
                  )}

                  {/* Camera Settings */}
                  {(currentPhoto.metadata?.iso || 
                    currentPhoto.metadata?.aperture || 
                    currentPhoto.metadata?.shutterSpeed) && (
                    <div className="photo-viewer-metadata-section">
                      <h4>Camera Settings</h4>
                      {currentPhoto.metadata.iso && <p>ISO {currentPhoto.metadata.iso}</p>}
                      {currentPhoto.metadata.aperture && <p>f/{currentPhoto.metadata.aperture}</p>}
                      {currentPhoto.metadata.shutterSpeed && <p>{currentPhoto.metadata.shutterSpeed}</p>}
                      {currentPhoto.metadata.focalLength && <p>{currentPhoto.metadata.focalLength}mm</p>}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoViewer;