import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Grid, List, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  apiClient,
  type PlaceLocation,
  type PlacePoint,
  type SearchResult,
} from "@/services/api";
import { usePhotoStore } from "@/store/photoStore";
import PlacesMap from "@/components/PlacesMap";

interface PlacesViewProps {
  currentDirectory: string;
}

type ViewMode = "map" | "grid" | "list";

interface EnrichedLocation extends PlaceLocation {
  previewUrl: string | null;
}

const MAX_CARD_PREVIEWS = 4;

function mapSearchResults(results: SearchResult[]) {
  return results.map((result, index) => ({
    id: index + 1,
    path: result.path,
    src: apiClient.getPhotoUrl(result.path),
    title: result.path.split("/").pop() || `Photo ${index + 1}`,
    score: result.score,
  }));
}

export function PlacesView({ currentDirectory }: PlacesViewProps) {
  const navigate = useNavigate();
  const {
    setPhotos,
    setLoading: setLibraryLoading,
    setSearchQuery,
    setCurrentView,
  } = usePhotoStore((state) => ({
    setPhotos: state.setPhotos,
    setLoading: state.setLoading,
    setSearchQuery: state.setSearchQuery,
    setCurrentView: state.setCurrentView,
  }));

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [locations, setLocations] = useState<EnrichedLocation[]>([]);
  const [points, setPoints] = useState<PlacePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [missingGpsCount, setMissingGpsCount] = useState(0);

  useEffect(() => {
    if (!currentDirectory) {
      setLocations([]);
      setPoints([]);
      setSelectedId(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.getPlacesMap(currentDirectory);
        if (cancelled) return;

        const enriched: EnrichedLocation[] = response.locations.map(
          (location) => ({
            ...location,
            previewUrl: location.sample_points[0]
              ? apiClient.getPhotoUrl(location.sample_points[0].path)
              : null,
          })
        );

        setLocations(enriched);
        setPoints(response.points);
        setMissingGpsCount(response.total_without_coordinates ?? 0);

        if (enriched.length > 0) {
          setSelectedId((prev) =>
            prev && enriched.some((location) => location.id === prev)
              ? prev
              : enriched[0].id
          );
        } else {
          setSelectedId(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch places data", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load place analytics"
        );
        setLocations([]);
        setPoints([]);
        setSelectedId(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentDirectory]);

  const totalPhotos = useMemo(
    () => locations.reduce((sum, loc) => sum + loc.count, 0),
    [locations]
  );

  const handleLocationSelect = useCallback(
    async (locationId: string) => {
      if (!currentDirectory) return;
      const location = locations.find((loc) => loc.id === locationId);
      if (!location) return;

      setSelectedId(location.id);
      setCurrentView("search");
      setSearchQuery(location.name);
      setLibraryLoading(true);

      try {
        const response = await apiClient.search(currentDirectory, location.name, {
          provider: "local",
          topK: 80,
          place: location.name,
        });
        setPhotos(mapSearchResults(response.results));
        navigate("/search");
      } catch (err) {
        console.error("Place search failed", err);
      } finally {
        setLibraryLoading(false);
      }
    },
    [
      currentDirectory,
      locations,
      navigate,
      setCurrentView,
      setLibraryLoading,
      setPhotos,
      setSearchQuery,
    ]
  );

  const renderEmptyState = (message: string, icon?: ReactNode) => (
    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400">
      <div className="w-16 h-16 rounded-full bg-slate-200/70 dark:bg-slate-700/40 flex items-center justify-center mb-4">
        {icon ?? <Compass className="w-7 h-7" />}
      </div>
      <p className="text-base font-medium mb-1">{message}</p>
      {missingGpsCount > 0 ? (
        <p className="text-sm text-slate-400">
          {missingGpsCount.toLocaleString()} photos do not include GPS metadata yet.
        </p>
      ) : null}
    </div>
  );

  const renderLoadingState = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={`loading-${index}`} className="overflow-hidden">
          <div className="h-36 bg-slate-200/60 dark:bg-slate-800 animate-pulse" />
          <CardContent className="p-4 space-y-2">
            <div className="h-4 w-2/3 bg-slate-200/80 dark:bg-slate-700 animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-slate-200/70 dark:bg-slate-700/80 animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderGridView = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderEmptyState(error);
    if (locations.length === 0) return renderEmptyState("No GPS-tagged photos yet.");

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {locations.map((location) => (
          <Card
            key={location.id}
            className={cn(
              "group cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-900/60",
              selectedId === location.id
                ? "ring-2 ring-blue-500 shadow-blue-200/50 dark:shadow-blue-900/40"
                : ""
            )}
            onClick={() => handleLocationSelect(location.id)}
          >
            <div className="relative aspect-video overflow-hidden">
              {location.previewUrl ? (
                <img
                  src={location.previewUrl}
                  alt={location.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-200/80 dark:bg-slate-700/70">
                  <MapPin className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <Badge variant="secondary" className="bg-white/90 text-slate-700">
                  {location.count.toLocaleString()} photos
                </Badge>
              </div>
            </div>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {location.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {location.center.lat.toFixed(3)}°N · {location.center.lon.toFixed(3)}°E
                  </p>
                </div>
              </div>
              {location.sample_points.length > 1 ? (
                <div className="flex -space-x-2 pt-1">
                  {location.sample_points.slice(0, MAX_CARD_PREVIEWS).map((sample) => (
                    <img
                      key={sample.path}
                      src={apiClient.getPhotoUrl(sample.path)}
                      alt={location.name}
                      className="w-9 h-9 rounded-full border border-white object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderListView = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderEmptyState(error);
    if (locations.length === 0) return renderEmptyState("No GPS-tagged photos yet.");

    return (
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {locations.map((location) => (
          <button
            key={location.id}
            type="button"
            onClick={() => handleLocationSelect(location.id)}
            className={cn(
              "flex items-start gap-4 p-6 w-full text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/40",
              selectedId === location.id ? "bg-slate-100/60 dark:bg-slate-800/50" : ""
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                  {location.name}
                </h3>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {location.count.toLocaleString()} photos
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Center {location.center.lat.toFixed(3)}°N · {location.center.lon.toFixed(3)}°E · ~
                {Math.max(0.1, location.approximate_radius_km).toFixed(1)} km span
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderMapView = () => {
    if (isLoading) {
      return (
        <div className="flex-1 p-6">
          <div className="h-full min-h-[360px] w-full rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
        </div>
      );
    }
    if (error) return renderEmptyState(error);
    if (locations.length === 0)
      return renderEmptyState("No GPS-tagged photos yet.");

    return (
      <div className="flex-1 p-6">
        <PlacesMap
          locations={locations}
          points={points}
          selectedId={selectedId}
          onSelectLocation={handleLocationSelect}
          className="h-[520px]"
        />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="bg-white/85 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/60 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Places
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalPhotos.toLocaleString()} photos across {locations.length} mapped locations
            </p>
            {missingGpsCount > 0 ? (
              <p className="text-xs text-slate-400 mt-1">
                {missingGpsCount.toLocaleString()} photos do not include GPS metadata yet.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 bg-slate-100/60 dark:bg-slate-800/60 rounded-lg p-1">
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className={cn(
                "px-3 py-2",
                viewMode === "map"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
              )}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Map
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-2",
                viewMode === "grid"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
              )}
            >
              <Grid className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-2",
                viewMode === "list"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
              )}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === "map" && renderMapView()}
        {viewMode === "grid" && renderGridView()}
        {viewMode === "list" && renderListView()}
      </div>
    </div>
  );
}

export default PlacesView;
