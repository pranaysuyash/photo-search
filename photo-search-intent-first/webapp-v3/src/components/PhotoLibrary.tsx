import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Heart,
  Download,
  Share2,
  MoreHorizontal,
  Star,
  Eye,
  Clock,
  Camera,
  Palette,
  Zap,
  Folder,
  AlertCircle,
} from "lucide-react";
import type { Photo } from "@/store/photoStore";
import { cn } from "@/lib/utils";

interface PhotoLibraryProps {
  photos: Photo[];
  isLoading: boolean;
  currentDirectory: string | null;
  onDirectorySelect: (directory: string) => void;
  onToggleFavorite?: (path: string, favorite: boolean) => void;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-6">
      {Array.from({ length: 12 }, (_, i) => `skeleton-${Date.now()}-${i}`).map(
        (key) => (
          <div key={key} className="group relative">
            <div className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="mt-2 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        )
      )}
    </div>
  );
}

function EmptyState({
  currentDirectory,
  onDirectorySelect,
}: {
  currentDirectory: string | null;
  onDirectorySelect: (directory: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
      <div className="relative mb-6">
        <img
          src="/generated/asset_32.png"
          alt="Empty library visual"
          className="w-32 h-32 object-contain"
        />
      </div>

      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
        {currentDirectory ? "No Photos Found" : "Get Started"}
      </h3>

      <p className="text-slate-600 dark:text-slate-400 text-center max-w-md mb-6">
        {currentDirectory
          ? "This folder appears to be empty or contains no supported image files."
          : "Select a photo library to start exploring your memories with AI-powered search."}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() =>
            onDirectorySelect(
              "/Users/pranay/Projects/adhoc_projects/photo-search/e2e_data"
            )
          }
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Folder className="w-4 h-4 mr-2" />
          {currentDirectory ? "Change Library" : "Select Photo Library"}
        </Button>

        {currentDirectory && (
          <Button
            variant="outline"
            className="border-slate-200 dark:border-slate-700"
          >
            <Camera className="w-4 h-4 mr-2" />
            Import Photos
          </Button>
        )}
      </div>

      {!currentDirectory && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
          <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Zap className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Smart Search
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Find photos by content
            </p>
          </div>

          <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Eye className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Face Recognition
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Organize by people
            </p>
          </div>

          <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Palette className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Auto Tags
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Intelligent categorization
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  index,
  onToggleFavorite,
}: {
  photo: Photo;
  index: number;
  onToggleFavorite?: (path: string, favorite: boolean) => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isFavorite = Boolean(photo.favorite);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="group relative overflow-hidden bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-700/60 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60 transition-all duration-300 hover:scale-[1.02] cursor-pointer">
          <CardContent className="p-0">
            <div className="relative aspect-square overflow-hidden">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 animate-pulse flex items-center justify-center">
                  <Eye className="h-8 w-8 text-slate-400" />
                </div>
              )}

              {imageError ? (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-slate-400" />
                </div>
              ) : (
                <img
                  src={photo.src}
                  alt={photo.title}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-500",
                    "group-hover:scale-110",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  loading={index < 6 ? "eager" : "lazy"}
                />
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Top Actions */}
              <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.(photo.path, !isFavorite);
                  }}
                  aria-pressed={isFavorite}
                  aria-label={
                    isFavorite ? "Remove from favorites" : "Add to favorites"
                  }
                >
                  <Heart
                    className={cn(
                      "h-3 w-3 transition-colors",
                      isFavorite
                        ? "text-red-500 fill-red-500"
                        : "text-slate-600 dark:text-slate-400"
                    )}
                  />
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                </Button>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {photo.score && (
                      <Badge className="bg-green-500/90 text-white text-xs px-2 py-0.5">
                        {Math.round(photo.score * 100)}%
                      </Badge>
                    )}
                    <Badge className="bg-black/60 text-white text-xs px-2 py-0.5">
                      <Camera className="h-2 w-2 mr-1" />
                      IMG
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-6 px-2 bg-black/60 text-white hover:bg-black/80 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-2 w-2 mr-1" />
                      Save
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-6 px-2 bg-black/60 text-white hover:bg-black/80 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Share2 className="h-2 w-2 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>

              {/* Top Left Badges */}
              <div className="absolute top-2 left-2 flex flex-col space-y-1">
                {isFavorite && (
                  <Badge className="bg-red-500/90 text-white text-xs px-2 py-0.5">
                    <Heart className="h-2 w-2 mr-1 fill-current" />
                    Liked
                  </Badge>
                )}
              </div>
            </div>

            {/* Photo Title */}
            <div className="p-3">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {photo.title}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                  <Clock className="h-2 w-2 mr-1" />2 hours ago
                </p>
                <div className="flex items-center">
                  <Star className="h-3 w-3 text-yellow-500 mr-1" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    4.8
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      {/* Lightbox Modal */}
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 overflow-hidden">
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
          <img
            src={photo.src}
            alt={photo.title}
            className="w-full h-full object-contain"
          />

          {/* Modal Controls */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge className="bg-black/60 text-white">{photo.title}</Badge>
              {photo.score && (
                <Badge className="bg-green-500/90 text-white">
                  Match: {Math.round(photo.score * 100)}%
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-black/60 text-white hover:bg-black/80"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-black/60 text-white hover:bg-black/80"
              >
                <Share2 className="h-4 w-4 mr-2" />
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
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        currentDirectory={currentDirectory}
        onDirectorySelect={onDirectorySelect}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={index}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}
