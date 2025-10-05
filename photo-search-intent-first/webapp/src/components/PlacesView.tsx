import { useMemo, useState } from "react";
import { MapPin, Grid, List } from "lucide-react";
import MapView from "./MapView";

interface PlacesViewProps {
  dir: string;
  engine: string;
  setBusy: (busy: string | boolean) => void;
  setNote: (note: string) => void;
  setResults: (results: Array<{ path: string; score: number }>) => void;
}

type ViewMode = "map" | "grid" | "list";

export function PlacesView({
  dir,
  engine,
  setBusy,
  setNote,
  setResults,
}: PlacesViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("map");

  // Sample location data - in a real implementation, this would come from EXIF data
  const locationData = useMemo(() => {
    return [
      {
        name: "San Francisco, CA",
        count: 45,
        coordinates: { lat: 37.7749, lon: -122.4194 },
        photos: Array.from({ length: 45 }, (_, i) => ({
          path: `sf-${i}.jpg`,
          score: Math.random(),
        })),
      },
      {
        name: "New York, NY",
        count: 32,
        coordinates: { lat: 40.7128, lon: -74.006 },
        photos: Array.from({ length: 32 }, (_, i) => ({
          path: `ny-${i}.jpg`,
          score: Math.random(),
        })),
      },
      {
        name: "Los Angeles, CA",
        count: 28,
        coordinates: { lat: 34.0522, lon: -118.2437 },
        photos: Array.from({ length: 28 }, (_, i) => ({
          path: `la-${i}.jpg`,
          score: Math.random(),
        })),
      },
      {
        name: "London, UK",
        count: 21,
        coordinates: { lat: 51.5074, lon: -0.1278 },
        photos: Array.from({ length: 21 }, (_, i) => ({
          path: `london-${i}.jpg`,
          score: Math.random(),
        })),
      },
      {
        name: "Paris, France",
        count: 18,
        coordinates: { lat: 48.8566, lon: 2.3522 },
        photos: Array.from({ length: 18 }, (_, i) => ({
          path: `paris-${i}.jpg`,
          score: Math.random(),
        })),
      },
    ];
  }, []);

  const totalPhotos = useMemo(
    () => locationData.reduce((sum, loc) => sum + loc.count, 0),
    [locationData]
  );

  const handleLocationSelect = (location: (typeof locationData)[0]) => {
    setBusy("Loading photos from " + location.name);
    // Simulate API call delay
    setTimeout(() => {
      setResults(location.photos);
      setNote(`Showing ${location.count} photos from ${location.name}`);
      setBusy(false);
    }, 500);
  };

  const renderMapView = () => {
    const mapPoints = locationData.map((loc) => ({
      lat: loc.coordinates.lat,
      lon: loc.coordinates.lon,
    }));

    return (
      <div className="h-full">
        <MapView
          dir={dir}
          engine={engine}
          points={mapPoints}
          onLoadMap={() => {
            console.log("Places map loaded");
          }}
          selectedPhotos={new Set()}
          onPhotoSelect={() => {}}
          onPhotoOpen={() => {}}
        />
      </div>
    );
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
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
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
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
        </button>
      ))}
    </div>
  );

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

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Places
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {totalPhotos} photos across {locationData.length} locations
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "map"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              aria-label="Map view"
            >
              <MapPin className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "map" && renderMapView()}
        {viewMode === "grid" && renderGridView()}
        {viewMode === "list" && renderListView()}
      </div>
    </div>
  );
}

export default PlacesView;
