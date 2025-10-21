import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Heart,
  Download,
  Share2,
  Sparkles,
  FolderOpen,
  Info,
  Images,

} from "lucide-react";
import type { Photo } from "@/types/photo";
import { cn } from "@/lib/utils";
import { GridViewSwitcher, type ViewMode } from "@/components/grids";
import { apiClient } from "@/services/api";
import { FolderSelector } from "./FolderSelector";
import { usePhotoStore } from "@/store/photoStore";
import { offlineModeHandler } from "@/services/offlineModeHandler";
import { fileSystemService } from "@/services/fileSystemService";
import { VideoInfo } from "./VideoInfo";
import { DEMO_LIBRARY_DIR } from "@/constants/directories";
import { useElectronBridge } from "@/hooks/useElectronBridge";

const GUIDE_STORAGE_KEY = "photo-library-guide-dismissed";
const INACTIVITY_DELAY_MS = 20000;

interface PhotoLibraryProps {
  photos: Photo[];
  isLoading: boolean;
  currentDirectory: string | null;
  onDirectorySelect: (directory: string) => void;
  onToggleFavorite?: (path: string, favorite: boolean) => void;
}

interface GridPhoto {
  path: string;
  thumbnail?: string;
  isVideo?: boolean;
  isImage?: boolean;
  metadata?: {
    timestamp?: number;
    title?: string;
    views?: number;
    lastViewed?: number;
  };
  score?: number;
  favorite?: boolean;
}

function getPhotoTitle(path: string, fallback?: string): string {
  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }
  const parts = path.split(/[\\/]/);
  const filename = parts[parts.length - 1] || "Photo";
  return filename.replace(/_[0-9]{6,}$/u, "");
}

function transformToGridPhoto(photo: Photo, index: number): GridPhoto {
  const typed = photo as Photo & {
    metadata?: {
      timestamp?: number;
      title?: string;
      views?: number;
      lastViewed?: number;
    };
    thumbnail?: string;
    isVideo?: boolean;
    isImage?: boolean;
  };

  const fallbackTimestamp = Date.now() - index * 60000;
  const metadata = typed.metadata ?? {};
  const timestamp =
    typeof metadata.timestamp === "number" && metadata.timestamp > 0
      ? metadata.timestamp
      : fallbackTimestamp;

  return {
    path: photo.path,
    thumbnail: typed.thumbnail ?? photo.thumbnailUrl ?? photo.filename,
    isVideo: typed.isVideo ?? photo.isVideo,
    isImage: typed.isImage ?? photo.isImage,
    metadata: {
      ...metadata,
      timestamp,
      title: getPhotoTitle(photo.path, metadata.title ?? photo.filename),
    },
    score: photo.score,
    favorite: Boolean(photo.favorite),
  };
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="h-10 w-full rounded-lg bg-slate-200/70 dark:bg-slate-800/60 animate-pulse" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={`photo-skeleton-${index}-${Math.random()}`}
            className="aspect-square rounded-2xl bg-slate-200/60 dark:bg-slate-800/50 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  currentDirectory,
  onDirectorySelect,
  onShowGuide,
  isOfflineMode,
  canScanDirectories,
  onSelectPhotoDirectories,
}: {
  currentDirectory: string | null;
  onDirectorySelect: (directory: string) => void;
  onShowGuide: () => void;
  isOfflineMode: boolean;
  canScanDirectories: boolean;
  onSelectPhotoDirectories?: () => Promise<string[] | null>;
}) {
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const { loadPhotosOffline, addPhotoDirectory } = usePhotoStore();

  const handleSelectDirectory = useCallback(async () => {
    if (isOfflineMode && canScanDirectories) {
      // Use Electron file system service for directory selection
      const success = await addPhotoDirectory();
      if (success) {
        // Load photos from the newly added directory
        await loadPhotosOffline();
      }
    } else {
      // Fallback to regular folder selector
      setShowFolderSelector(true);
    }
  }, [isOfflineMode, canScanDirectories, addPhotoDirectory, loadPhotosOffline]);

  const handleImport = useCallback(async () => {
    if (isOfflineMode && onSelectPhotoDirectories) {
      // In local-first mode, add new photo directories
      try {
        const selectedDirectories = await onSelectPhotoDirectories();
        if (selectedDirectories && selectedDirectories.length > 0) {
          // Add each selected directory
          for (const dir of selectedDirectories) {
            await addPhotoDirectory(dir);
          }
          // Reload photos from all directories
          await loadPhotosOffline();
          alert(`Added ${selectedDirectories.length} photo directories`);
        }
      } catch (error) {
        console.error("Failed to add photo directories:", error);
        alert("Failed to add photo directories. Please try again.");
      }
      return;
    }

    // Legacy backend mode (if backend is available)
    if (!currentDirectory) {
      setShowFolderSelector(true);
      return;
    }

    try {
      if (onSelectPhotoDirectories) {
        const selectedDirectories = await onSelectPhotoDirectories();
        if (!selectedDirectories || selectedDirectories.length === 0) return;

        const sourceDir = selectedDirectories[0]; // Use first selected directory
        const result = await apiClient.importPhotos(sourceDir, currentDirectory, {
          recursive: true,
          copy: true,
        });

        if (result.ok) {
          alert(`Import completed: ${result.imported} photos imported`);
          window.location.reload();
        } else {
          alert(`Import failed: ${result.errors} errors`);
        }
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert("Import failed. Please try again.");
    }
  }, [currentDirectory, isOfflineMode, loadPhotosOffline, onSelectPhotoDirectories, addPhotoDirectory]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-10 text-center">
      <Images className="h-16 w-16 text-slate-300 dark:text-slate-700" />
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {currentDirectory ? "No photos yet" : "Welcome to Photo Search"}
        </h3>
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
          {currentDirectory
            ? "This folder is empty or contains no supported images. Import photos or choose a different library to get started."
            : "Local-first photo management with optional AI enhancement. Select photo directories to explore your images with direct file access."}
        </p>
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <FolderOpen className="h-4 w-4" />
          <span>Direct file system access</span>
          {isOfflineMode && !canScanDirectories && (
            <span className="text-amber-600 dark:text-amber-400">• Browser mode (limited)</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={handleSelectDirectory} className="gap-2">
          <FolderOpen className="h-4 w-4" />
          {currentDirectory ? "Change library" : "Select photo directories"}
        </Button>
        <Button variant="outline" onClick={handleImport} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {isOfflineMode ? "Scan directories" : "Import photos"}
        </Button>
        <Button variant="ghost" onClick={onShowGuide} className="gap-2">
          <Info className="h-4 w-4" />
          View guided tour
        </Button>
      </div>

      <FolderSelector
        open={showFolderSelector}
        onOpenChange={setShowFolderSelector}
        onDirectorySelect={onDirectorySelect}
      />
    </div>
  );
}

function GuidePreview() {
  const [photos] = useState(() => {
    const now = Date.now();
    return Array.from({ length: 18 }, (_, index) => ({
      path: `/demo_photos/sample-${(index % 12) + 1}.jpg`,
      thumbnail: `/demo_photos/sample-${(index % 12) + 1}.jpg`,
      score: Math.random(),
      metadata: {
        timestamp: now - index * 86400000,
        title: `Sample photo ${index + 1}`,
        views: 12 + index,
        lastViewed: now - index * 43200000,
      },
    }));
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-2 dark:border-slate-800 dark:bg-slate-900/80">
      <GridViewSwitcher
        photos={photos}
        defaultView="masonry"
        persistenceKey="grid-demo-guide"
        showLabels
        onViewModeChange={() => { }}
      />
    </div>
  );
}

function PhotoLightbox({
  photo,
  open,
  onOpenChange,
  onToggleFavorite,
}: {
  photo: Photo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleFavorite?: (path: string, favorite: boolean) => void;
}) {
  const [secureUrl, setSecureUrl] = useState<string>('');
  const [videoMetadata, setVideoMetadata] = useState<any>(null);

  useEffect(() => {
    if (!photo || !fileSystemService.isAvailable()) {
      setSecureUrl(photo?.thumbnailUrl || '');
      return;
    }

    const loadSecureUrl = async () => {
      try {
        const url = await fileSystemService.getSecureFileUrl(photo.path);
        setSecureUrl(url);

        // Load video metadata if it's a video file
        if ((photo as any).isVideo) {
          try {
            const metadata = await fileSystemService.getFileMetadata(photo.path);
            setVideoMetadata(metadata);
          } catch (error) {
            console.error('Failed to get video metadata:', error);
          }
        }
      } catch (error) {
        console.error('Failed to get secure URL:', error);
        setSecureUrl(photo.thumbnailUrl);
      }
    };

    loadSecureUrl();
  }, [photo]);

  if (!photo) return null;

  const isFavorite = Boolean(photo.favorite);
  const isVideo = (photo as any).isVideo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden border-0 bg-slate-950/95 p-0">
        <div className="relative flex h-[70vh] flex-col md:h-[80vh]">
          {isVideo ? (
            <video
              src={secureUrl || photo.thumbnailUrl}
              controls
              className="h-full w-full flex-1 bg-black object-contain"
              preload="metadata"
            />
          ) : (
            <img
              src={secureUrl || photo.thumbnailUrl}
              alt={photo.filename}
              className="h-full w-full flex-1 bg-black object-contain"
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-black/70 text-white">
                  {getPhotoTitle(photo.path, photo.filename)}
                </Badge>
                {photo.score && (
                  <Badge className="bg-emerald-500/80 text-white">
                    {Math.round(photo.score * 100)}% match
                  </Badge>
                )}
              </div>
              {/* Video metadata display */}
              {isVideo && videoMetadata && (
                <VideoInfo metadata={videoMetadata} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isFavorite ? "default" : "secondary"}
                size="sm"
                className="gap-2"
                onClick={() => onToggleFavorite?.(photo.path, !isFavorite)}
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isFavorite ? "fill-current" : undefined
                  )}
                />
                {isFavorite ? "Favorited" : "Add to favorites"}
              </Button>
              <Button variant="secondary" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button variant="secondary" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PhotoLibrary({
  photos,
  isLoading,
  currentDirectory,
  onDirectorySelect,
  onToggleFavorite,
}: PhotoLibraryProps) {
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showGuideHint, setShowGuideHint] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(GUIDE_STORAGE_KEY) === "true";
  });
  const [activePhotoPath, setActivePhotoPath] = useState<string | null>(null);
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") {
      return "masonry";
    }
    const stored = localStorage.getItem("photo-library-view");
    return (stored as ViewMode) || "masonry";
  });

  // Offline mode state
  const {
    isOfflineMode,
    offlineCapabilities,
    loadPhotosOffline,
    addPhotoDirectory
  } = usePhotoStore();
  const [offlineMode, setOfflineMode] = useState(offlineModeHandler.getOfflineMode());

  // Electron bridge for directory selection
  const { selectPhotoDirectories } = useElectronBridge();

  // Listen for offline mode changes
  useEffect(() => {
    const handleOfflineModeChange = (mode: typeof offlineMode) => {
      setOfflineMode(mode);
      usePhotoStore.getState().updateOfflineMode(mode);
    };

    offlineModeHandler.addListener(handleOfflineModeChange);
    return () => offlineModeHandler.removeListener(handleOfflineModeChange);
  }, []);

  // Auto-load demo photos in Electron when no directories configured (first-time use)
  useEffect(() => {
    const autoLoadDemo = async () => {
      if (isOfflineMode && offlineCapabilities.canScanDirectories && !isLoading) {
        try {
          // Check if user has any directories configured
          const existingDirectories = await fileSystemService.getPhotoDirectories();

          // Only load demo if no directories are configured (first-time use)
          if (existingDirectories.length === 0) {
            console.log("🔄 First-time use detected - loading demo photos...");
            await addPhotoDirectory(DEMO_LIBRARY_DIR);
            await loadPhotosOffline();
            console.log("✅ Demo photos loaded for first-time use");
          }
        } catch (error) {
          console.warn("Failed to auto-load demo photos:", error);
        }
      }
    };

    // Small delay to ensure everything is initialized
    const timer = setTimeout(autoLoadDemo, 1000);
    return () => clearTimeout(timer);
  }, [isOfflineMode, offlineCapabilities.canScanDirectories, isLoading, addPhotoDirectory, loadPhotosOffline]);

  useEffect(() => {
    if (guideDismissed || showGuide) {
      setShowGuideHint(false);
      return;
    }

    const markInteraction = () => {
      setShowGuideHint(false);
    };

    const timer = window.setTimeout(() => {
      setShowGuideHint(true);
    }, INACTIVITY_DELAY_MS);

    window.addEventListener("pointerdown", markInteraction, { once: true });
    window.addEventListener("keydown", markInteraction, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
    };
  }, [guideDismissed, showGuide]);

  const gridPhotos = useMemo(() => photos.map(transformToGridPhoto), [photos]);

  const activePhoto = useMemo(
    () => photos.find((item) => item.path === activePhotoPath) ?? null,
    [photos, activePhotoPath]
  );

  const handlePhotoClick = useCallback((photo: GridPhoto) => {
    setActivePhotoPath(photo.path);
  }, []);

  const handleGuideChange = useCallback((open: boolean) => {
    setShowGuide(open);
    if (!open) {
      setGuideDismissed(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(GUIDE_STORAGE_KEY, "true");
      }
    }
  }, []);

  // Import functionality - currently unused but kept for future use
  // const handleImport = useCallback(async () => {
  //   if (!currentDirectory) {
  //     setShowFolderSelector(true);
  //     return;
  //   }

  //   try {
  //     const sourceDir = await selectImportFolder();
  //     if (!sourceDir) return;

  //     const result = await apiClient.importPhotos(sourceDir, currentDirectory, {
  //       recursive: true,
  //       copy: true,
  //     });

  //     if (result.ok) {
  //       alert(`Import completed: ${result.imported} photos imported`);
  //       window.location.reload();
  //     } else {
  //       alert(`Import failed: ${result.errors} errors`);
  //     }
  //   } catch (error) {
  //     console.error("Import failed:", error);
  //     alert("Import failed. Please try again.");
  //   }
  // }, [currentDirectory]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        currentDirectory={currentDirectory}
        onDirectorySelect={onDirectorySelect}
        onShowGuide={() => handleGuideChange(true)}
        isOfflineMode={isOfflineMode}
        canScanDirectories={offlineCapabilities.canScanDirectories}
        onSelectPhotoDirectories={selectPhotoDirectories}
      />
    );
  }

  const currentDirLabel = currentDirectory
    ? currentDirectory.split(/[\\/]/).slice(-2).join("/") || currentDirectory
    : "No library selected";

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col gap-4 p-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Photo Library
                </p>
                <Badge variant="secondary" className="text-xs">
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Local-First
                </Badge>
                {offlineMode.backendAvailable && (
                  <Badge variant="default" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Enhanced
                  </Badge>
                )}
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {currentDirLabel}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                View:{" "}
                {currentViewMode.charAt(0).toUpperCase() +
                  currentViewMode.slice(1)} • Direct file access
                {offlineMode.backendAvailable && " • AI features enabled"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  if (offlineCapabilities.canScanDirectories) {
                    await addPhotoDirectory();
                  } else {
                    setShowFolderSelector(true);
                  }
                }}
              >
                <FolderOpen className="h-4 w-4" />
                Add directory
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  await loadPhotosOffline();
                }}
              >
                <Sparkles className="h-4 w-4" />
                Scan photos
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className={cn("gap-2", showGuideHint && "animate-pulse")}
                    onClick={() => setShowGuide(true)}
                  >
                    <Info className="h-4 w-4" />
                    Guided tour
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Interactive walkthrough of the new grids.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white/70 p-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <GridViewSwitcher
            photos={gridPhotos}
            onPhotoClick={handlePhotoClick}
            defaultView={currentViewMode}
            persistenceKey="photo-library-view"
            showLabels={false}
            compact
            onViewModeChange={setCurrentViewMode}
          />
        </div>
      </div>

      <FolderSelector
        open={showFolderSelector}
        onOpenChange={setShowFolderSelector}
        onDirectorySelect={onDirectorySelect}
      />

      <Dialog open={showGuide} onOpenChange={handleGuideChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Guided tour
            </DialogTitle>
            <DialogDescription>
              Explore the new Masonry, Film Strip, and Timeline views. Switch
              modes with the toolbar or press 1, 2, or 3 on your keyboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  What's new
                </h3>
                <ul className="mt-2 space-y-2">
                  <li>• Masonry view adapts to recency and score.</li>
                  <li>
                    • Film Strip provides a cinema-style horizontal scroll.
                  </li>
                  <li>• Timeline groups photos by date automatically.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Pro Tip
                </p>
                <p className="mt-1 text-sm">
                  Use keyboard shortcuts 1, 2, or 3 to switch views instantly.
                  Your preference is saved per library.
                </p>
              </div>
            </div>

            <GuidePreview />
          </div>
        </DialogContent>
      </Dialog>

      <PhotoLightbox
        photo={activePhoto}
        open={Boolean(activePhoto)}
        onOpenChange={(open) => {
          if (!open) setActivePhotoPath(null);
        }}
        onToggleFavorite={onToggleFavorite}
      />
    </TooltipProvider>
  );
}


