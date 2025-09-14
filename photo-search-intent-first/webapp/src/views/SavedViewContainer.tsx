import React from "react";
import SavedSearches from "../components/SavedSearches";
import { apiDeleteSaved, apiGetSaved } from "../api";
import { useDir, usePhotoActions, useSavedSearches, useUIActions } from "../stores/useStores";

export function SavedViewContainer({
  onRun,
}: {
  onRun: (name: string, query: string, k?: number) => void;
}) {
  const dir = useDir();
  const saved = useSavedSearches();
  const photoActions = usePhotoActions();
  const uiActions = useUIActions();

  return (
    <div className="p-4">
      <SavedSearches
        saved={saved}
        onRun={(name, q, k) => {
          onRun(name, q, k);
        }}
        onDelete={async (name: string) => {
          try {
            await apiDeleteSaved(dir, name);
            const r = await apiGetSaved(dir);
            photoActions.setSaved(r.saved || []);
          } catch (e) {
            uiActions.setNote(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />
    </div>
  );
}

export default SavedViewContainer;

