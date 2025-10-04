import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiTripsBuild, apiTripsList } from "../api";
import TripsView from "../components/TripsView";
import {
  useDir,
  useEngine,
  usePhotoActions,
  useUIActions,
  useTrips,
  useWorkspaceActions,
} from "../stores/useStores";

export function TripsViewContainer({
  onOpenHelp,
}: {
  onOpenHelp?: () => void;
}) {
  const dir = useDir();
  const engine = useEngine();
  const trips = useTrips() || [];
  const photoActions = usePhotoActions();
  const uiActions = useUIActions();
  const workspaceActions = useWorkspaceActions();
  const navigate = useNavigate();
  const [isBuilding, setIsBuilding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleBuildTrips = useCallback(async () => {
    if (!dir) return;
    setIsBuilding(true);
    try {
      uiActions.setBusy("Building trips from photo metadata...");
      const result = await apiTripsBuild(dir, engine);
      workspaceActions.setTrips(result.trips || []);
      uiActions.setNote(`Built ${result.trips?.length || 0} trips`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to build trips";
      uiActions.setNote(message);
    } finally {
      setIsBuilding(false);
      uiActions.setBusy("");
    }
  }, [dir, engine, uiActions, workspaceActions]);

  const handleRefreshTrips = useCallback(async () => {
    if (!dir) return;
    setIsLoading(true);
    try {
      const result = await apiTripsList(dir);
      workspaceActions.setTrips(result.trips || []);
      uiActions.setNote(`Loaded ${result.trips?.length || 0} trips`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load trips";
      uiActions.setNote(message);
    } finally {
      setIsLoading(false);
    }
  }, [dir, uiActions, workspaceActions]);

  const handleOpenTrip = useCallback(
    (trip: { paths?: string[]; name?: string }) => {
      const results = (trip.paths || []).map((path) => ({ path, score: 1.0 }));
      photoActions.setResults(results);
      uiActions.setNote(
        `Viewing trip: ${trip.name || "Untitled"} (${results.length} photos)`
      );
      navigate("/search");
    },
    [photoActions, uiActions, navigate]
  );

  return (
    <div className="p-4">
      <TripsView
        dir={dir}
        engine={engine}
        setBusy={uiActions.setBusy}
        setNote={uiActions.setNote}
        setResults={(results) => photoActions.setResults(results)}
        trips={trips}
        isBuilding={isBuilding}
        isLoading={isLoading}
        onBuildTrips={handleBuildTrips}
        onRefreshTrips={handleRefreshTrips}
        onOpenTrip={handleOpenTrip}
        onOpenHelp={onOpenHelp}
      />
    </div>
  );
}

export default TripsViewContainer;
