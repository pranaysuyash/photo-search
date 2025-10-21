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
import type { Photo as StorePhoto } from "@/store/photoStore";
import { cn } from "@/lib/utils";
import { GridViewSwitcher, type ViewMode } from "@/components/grids";
import { apiClient } from "@/services/api";
import { FolderSelector } from "./FolderSelector";

const GUIDE_STORAGE_KEY = "photo-library-guide-dismissed";
const INACTIVITY_DELAY_MS = 20000;

interface PhotoLibraryProps {
  photos: StorePhoto[];
  isLoading: boolean;
  currentDirectory: string | null;
  onDirectorySelect: (directory: string) => void;
  onToggleFavorite?: (path: string, favorite: boolean) => void;
}

interface GridPhoto {
  path: string;
  thumbnail?: string;
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

function transformToGridPhoto(photo: StorePhoto, index: number): GridPhoto {
  const typed = photo as StorePhoto & {
    metadata?: {
      timestamp?: number;
      title?: string;
      views?: number;
      lastViewed?: number;
    };
    thumbnail?: string;
  };

  const fallbackTimestamp = Date.now() - index * 60000;
  const metadata = typed.metadata ?? {};
  const timestamp =
    typeof metadata.timestamp === "number" && metadata.timestamp > 0
      ? metadata.timestamp
      : fallbackTimestamp;

  return {
    path: photo.path,
    thumbnail: typed.thumbnail ?? photo.src,
    metadata: {
      ...metadata,
      timestamp,
      title: getPhotoTitle(photo.path, metadata.title ?? photo.title),
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
}: {
  currentDirectory: string | null;
  onDirectorySelect: (directory: string) => void;
  onShowGuide: () => void;
}) {
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  const handleImport = useCallback(async () => {
    if (!currentDirectory) {
      setShowFolderSelector(true);
      return;
    }

    try {
      const sourceDir = await selectImportFolder();
      if (!sourceDir) return;

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
    } catch (error) {
      console.error("Import failed:", error);
      alert("Import failed. Please try again.");
    }
  }, [currentDirectory]);

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
            : "Select a photo library to explore your images with the new grid experiences. The guided tour is always available if you want a walkthrough."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => setShowFolderSelector(true)} className="gap-2">
          <FolderOpen className="h-4 w-4" />
          {currentDirectory ? "Change library" : "Select photo library"}
        </Button>
        <Button variant="outline" onClick={handleImport} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Import photos
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
        onViewModeChange={() => {}}
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
  photo: StorePhoto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleFavorite?: (path: string, favorite: boolean) => void;
}) {
  if (!photo) return null;

  const isFavorite = Boolean(photo.favorite);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden border-0 bg-slate-950/95 p-0">
        <div className="relative flex h-[70vh] flex-col md:h-[80vh]">
          <img
            src={photo.src}
            alt={photo.title}
            className="h-full w-full flex-1 bg-black object-contain"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-black/70 text-white">
                {getPhotoTitle(photo.path, photo.title)}
              </Badge>
              {photo.score && (
                <Badge className="bg-emerald-500/80 text-white">
                  {Math.round(photo.score * 100)}% match
                </Badge>
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

  const handleImport = useCallback(async () => {
    if (!currentDirectory) {
      setShowFolderSelector(true);
      return;
    }

    try {
      const sourceDir = await selectImportFolder();
      if (!sourceDir) return;

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
    } catch (error) {
      console.error("Import failed:", error);
      alert("Import failed. Please try again.");
    }
  }, [currentDirectory]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        currentDirectory={currentDirectory}
        onDirectorySelect={onDirectorySelect}
        onShowGuide={() => handleGuideChange(true)}
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
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Library
              </p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {currentDirLabel}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                View:{" "}
                {currentViewMode.charAt(0).toUpperCase() +
                  currentViewMode.slice(1)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setShowFolderSelector(true)}
              >
                <FolderOpen className="h-4 w-4" />
                Change library
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleImport}
              >
                <Sparkles className="h-4 w-4" />
                Add photos
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

async function selectImportFolder(): Promise<string | null> {
  if (typeof window === "undefined") {
    console.warn("Folder selection is not available in this environment");
    return null;
  }

  if (
    window.electronAPI &&
    typeof window.electronAPI.selectFolder === "function"
  ) {
    try {
      const result = await window.electronAPI.selectFolder();
      return result || null;
    } catch (error) {
      console.error("Failed to select folder:", error);
      return null;
    }
  }

  console.warn("Electron bridge not available for folder selection");
  return null;
}
