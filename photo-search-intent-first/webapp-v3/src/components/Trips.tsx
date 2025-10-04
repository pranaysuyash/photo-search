import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Play, Loader2, Clock, Camera } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { usePhotoStore } from "../store/photoStore";
import { apiClient, type Trip } from "../services/api";

export function Trips() {
  const { currentDirectory, trips, setTrips, setPhotos, setLoading } =
    usePhotoStore();

  const [isBuilding, setIsBuilding] = useState(false);

  // Load trips when directory changes
  useEffect(() => {
    const loadTrips = async () => {
      if (currentDirectory) {
        try {
          const response = await apiClient.getTrips(currentDirectory);
          setTrips(response.trips);
        } catch (error) {
          console.error("Failed to load trips:", error);
        }
      }
    };
    loadTrips();
  }, [currentDirectory, setTrips]);

  const handleBuildTrips = async () => {
    if (!currentDirectory) return;

    setIsBuilding(true);
    try {
      const response = await apiClient.buildTrips(currentDirectory, "local");
      setTrips(response.trips);
    } catch (error) {
      console.error("Failed to build trips:", error);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleOpenTrip = async (trip: Trip) => {
    setLoading(true);
    try {
      // Create photo objects from trip paths
      const tripPhotos = trip.paths.map((path, index) => ({
        id: index + 1,
        path,
        src: apiClient.getPhotoUrl(path),
        title: path.split("/").pop() || `Photo ${index + 1}`,
      }));
      setPhotos(tripPhotos);
    } catch (error) {
      console.error("Failed to open trip:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };

    if (start.getFullYear() === end.getFullYear()) {
      if (
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate()
      ) {
        return start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return `${start.toLocaleDateString(
        "en-US",
        options
      )} - ${end.toLocaleDateString("en-US", options)}, ${end.getFullYear()}`;
    }

    return `${start.toLocaleDateString("en-US", {
      ...options,
      year: "numeric",
    })} - ${end.toLocaleDateString("en-US", { ...options, year: "numeric" })}`;
  };

  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day";
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return `${Math.ceil(diffDays / 30)} months`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Trips</h1>
          <Badge variant="secondary">{trips.length}</Badge>
        </div>

        <Button
          onClick={handleBuildTrips}
          disabled={!currentDirectory || isBuilding}
        >
          {isBuilding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Building...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Build Trips
            </>
          )}
        </Button>
      </div>

      {!currentDirectory ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No directory selected
          </h3>
          <p className="text-gray-500">
            Please select a photo directory to detect trips
          </p>
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No trips detected yet
          </h3>
          <p className="text-gray-500 mb-4">
            Build trips to automatically group photos by time and location
          </p>
          <Button onClick={handleBuildTrips} disabled={isBuilding}>
            {isBuilding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Building trips...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Build Trips
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timeline view */}
          <div className="space-y-6">
            <AnimatePresence>
              {trips.map((trip, index) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => handleOpenTrip(trip)}
                    >
                      <div className="flex items-start gap-6">
                        {/* Trip photos preview */}
                        <div className="flex-shrink-0">
                          <div className="grid grid-cols-2 gap-1 w-32 h-24 rounded-lg overflow-hidden">
                            {trip.paths.slice(0, 4).map((photoPath) => (
                              <img
                                key={photoPath}
                                src={apiClient.getThumbnailUrl(photoPath, 100)}
                                alt="Trip moment"
                                className="w-full h-full object-cover"
                              />
                            ))}
                          </div>
                        </div>

                        {/* Trip details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold truncate">
                              {trip.name ||
                                `Trip to ${trip.place || "Unknown"}`}
                            </h3>
                            <Badge
                              variant="outline"
                              className="ml-2 flex-shrink-0"
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              {trip.count}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {formatDateRange(trip.startDate, trip.endDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {getDuration(trip.startDate, trip.endDate)}
                              </span>
                            </div>
                            {trip.place && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate">{trip.place}</span>
                              </div>
                            )}
                          </div>

                          {/* Photo samples */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {trip.count} photos
                            </span>
                            {trip.paths.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{trip.paths.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
