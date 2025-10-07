import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  ArrowLeft,
  RefreshCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api";
import { usePhotoStore } from "@/store/photoStore";

interface FavoritesProps {
  onToggleFavorite?: (path: string, favorite: boolean) => void;
}

export function Favorites({ onToggleFavorite }: FavoritesProps) {
  const navigate = useNavigate();
  const {
    favoriteEntries,
    setFavoriteEntries,
    currentDirectory,
    photos,
  } = usePhotoStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    if (!currentDirectory) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await apiClient.getFavorites(currentDirectory);
      setFavoriteEntries(data.favorites);
    } catch (refreshError) {
      console.error("Failed to refresh favorites:", refreshError);
      setError("Unable to load favorites. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [currentDirectory, setFavoriteEntries]);

  useEffect(() => {
    void handleRefresh();
  }, [handleRefresh]);

  const favoritePhotos = useMemo(
    () =>
      favoriteEntries.map((entry) => {
        const photo = photos.find((candidate) => candidate.path === entry.path);
        const fallbackTitle = entry.path.split("/").pop() ?? entry.path;
        return {
          path: entry.path,
          src: photo?.src ?? apiClient.getPhotoUrl(entry.path),
          title: photo?.title ?? fallbackTitle,
        };
      }),
    [favoriteEntries, photos]
  );

  const isEmpty = favoritePhotos.length === 0 && !isRefreshing;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Favorites
              </h1>
              <Badge variant="secondary" className="text-xs">
                {favoritePhotos.length}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Curate the shots you love most. Remove an item to drop it back into
              the main library.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/library")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Library
          </Button>
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing || !currentDirectory}
          >
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="mt-6">
        {!currentDirectory ? (
          <Card className="p-10 text-center">
            <Heart className="mx-auto mb-4 h-8 w-8 text-red-500" />
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
              Choose a library to see favorites
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Select a photo workspace first, then mark items with the heart icon
              in the library grid to see them here.
            </p>
          </Card>
        ) : isEmpty ? (
          <Card className="flex flex-col items-center justify-center gap-4 border-dashed p-12 text-center">
            <Heart className="h-10 w-10 text-red-400" />
            <div>
              <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
                No favorites yet
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Tap the heart icon on any photo in the library to pin it here for
                quick access.
              </p>
            </div>
          </Card>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            )}
          >
            {favoritePhotos.map((photo) => (
              <Card
                key={photo.path}
                className="group relative overflow-hidden border border-slate-200/70 bg-white shadow-sm transition hover:shadow-lg dark:border-slate-800/70 dark:bg-slate-900"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute top-3 right-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 rounded-full bg-white/90 p-0 text-red-500 hover:bg-white dark:bg-slate-800/90 dark:text-red-400"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleFavorite?.(photo.path, false);
                      }}
                      aria-pressed
                      aria-label="Remove from favorites"
                      disabled={!onToggleFavorite}
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {photo.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {photo.path}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;
