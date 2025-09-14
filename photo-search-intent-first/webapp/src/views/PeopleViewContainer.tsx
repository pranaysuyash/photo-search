import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PeopleView from "../components/PeopleView";
import { apiFacesClusters } from "../api";
import {
  useBusy,
  useClusters,
  useDir,
  useEngine,
  usePersons,
  usePhotoActions,
  useUIActions,
  useWorkspaceActions,
} from "../stores/useStores";

export function PeopleViewContainer() {
  const dir = useDir();
  const engine = useEngine();
  const busy = useBusy();
  const uiActions = useUIActions();
  const photoActions = usePhotoActions();
  const persons = usePersons();
  const clusters = useClusters() || [];
  const workspaceActions = useWorkspaceActions();
  const navigate = useNavigate();

  const loadFaces = useCallback(async () => {
    if (!dir) return;
    try {
      const r = await apiFacesClusters(dir);
      workspaceActions.setClusters(r.clusters || []);
    } catch {
      // ignore transient errors
    }
  }, [dir, workspaceActions]);

  return (
    <div className="p-4">
      <PeopleView
        dir={dir}
        engine={engine}
        clusters={clusters}
        persons={persons}
        setPersons={workspaceActions.setPersons}
        busy={busy}
        setBusy={uiActions.setBusy}
        setNote={uiActions.setNote}
        onLoadFaces={loadFaces}
        onOpenPhotos={(photos) => {
          photoActions.setResults(photos.map((p) => ({ path: p, score: 0 })));
          uiActions.setNote(`Viewing ${photos.length} photos from face cluster`);
          navigate("/search");
        }}
      />
    </div>
  );
}

export default PeopleViewContainer;

