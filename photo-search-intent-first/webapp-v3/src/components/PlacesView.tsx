import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Grid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api";

type ViewMode = "map" | "grid" | "list";

interface LocationData {
  name: string;
  count: number;
  coordinates: { lat: number; lon: number };
  photos: Array<{ path: string; score: number }>;
}

interface PlacesViewProps {
  currentDirectory: string;
}

export function PlacesView({ currentDirectory }: PlacesViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlacesData = async () => {
      if (!currentDirectory) return;

      try {
        setIsLoading(true);
        const analytics = await apiClient.getAnalytics(currentDirectory);

        // Convert places array to LocationData format
        // For now, create dummy coordinates since backend doesn't provide them
        const places = analytics.places || [];
        const locationData = places.map((place: string | number) => ({
          name: String(place),
          count: Math.floor(Math.random() * 50) + 1, // Placeholder count
          coordinates: {
            lat: 37.7749 + (Math.random() - 0.5) * 10, // Random coords around SF
            lon: -122.4194 + (Math.random() - 0.5) * 10,
          },
          photos: [], // Will be populated when place search is implemented
        }));

        setLocationData(locationData);
      } catch (error) {
        console.error("Failed to fetch places data:", error);
        setLocationData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlacesData();
  }, [currentDirectory]);

  const totalPhotos = locationData.reduce((sum, loc) => sum + loc.count, 0);

  const handleLocationSelect = (location: LocationData) => {
    // In a real implementation, this would navigate to search results for this location
    console.log(
      `Selected location: ${location.name} (${location.count} photos)`
    );
  };

  const renderGridView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading places...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {locationData.map((location) => (
          <Card
            key={location.name}
            className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
            onClick={() => handleLocationSelect(location)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {location.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {location.count} photos
                  </p>
                </div>
              </div>
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderListView = () => (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {locationData.map((location) => (
        <button
          key={location.name}
          type="button"
          onClick={() => handleLocationSelect(location)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleLocationSelect(location);
            }
          }}
          className="flex items-center gap-4 p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors w-full text-left"
        >
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {location.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {location.coordinates.lat.toFixed(4)},{" "}
              {location.coordinates.lon.toFixed(4)}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {location.count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              photos
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderMapView = () => (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center">
          <MapPin className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Interactive Map View
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Map integration coming soon. This will show photo locations on an
            interactive map.
          </p>
          <Badge variant="secondary" className="text-sm">
            Feature in Development
          </Badge>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-700/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Places
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {totalPhotos} photos across {locationData.length} locations
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-1">
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className={cn(
                "px-3 py-2",
                viewMode === "map"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
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
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
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
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              )}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "map" && renderMapView()}
        {viewMode === "grid" && renderGridView()}
        {viewMode === "list" && renderListView()}
      </div>
    </div>
  );
}

export default PlacesView;
