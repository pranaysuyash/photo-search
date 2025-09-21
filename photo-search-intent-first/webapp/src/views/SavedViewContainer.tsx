import { apiDeleteSaved, apiGetSaved } from "../api";
import SavedSearches from "../components/SavedSearches";
import {
  useDir,
  usePhotoActions,
  useSavedSearches,
  useUIActions,
} from "../stores/useStores";

export function SavedViewContainer({
  onRun,
  onOpenHelp,
}: {
  onRun: (name: string, query: string, k?: number) => void;
  onOpenHelp?: () => void;
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
        onOpenHelp={onOpenHelp}
      />
    </div>
  );
}

export default SavedViewContainer;
