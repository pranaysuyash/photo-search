import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Collections from "../components/Collections";
import { apiGetCollections, apiDeleteCollection } from "../api";
import {
  useCollections,
  useDir,
  useEngine,
  usePhotoActions,
  useUIActions,
} from "../stores/useStores";

export function CollectionsViewContainer() {
  const dir = useDir();
  const engine = useEngine();
  const collections = useCollections() || {};
  const photoActions = usePhotoActions();
  const uiActions = useUIActions();
  const navigate = useNavigate();

  const loadCollections = useCallback(async () => {
    try {
      const r = await apiGetCollections(dir);
      photoActions.setCollections(r.collections || {});
    } catch (e) {
      uiActions.setNote(e instanceof Error ? e.message : "Failed to load collections");
    }
  }, [dir, photoActions, uiActions]);

  return (
    <div className="p-4">
      <Collections
        dir={dir}
        engine={engine}
        collections={collections}
        onLoadCollections={loadCollections}
        onOpen={(name: string) => {
          const paths = collections?.[name] || [];
          photoActions.setResults(paths.map((p) => ({ path: p, score: 0 })));
          uiActions.setNote(`${paths.length} in ${name}`);
          navigate("/search");
        }}
        onDelete={async (name: string) => {
          try {
            await apiDeleteCollection(dir, name);
            const r = await apiGetCollections(dir);
            photoActions.setCollections(r.collections || {});
            uiActions.setNote(`Deleted collection ${name}`);
          } catch (e) {
            uiActions.setNote(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />
    </div>
  );
}

export default CollectionsViewContainer;

