import React, { Suspense, lazy } from "react";
import { useModalContext } from "../contexts/ModalContext";
import type { PhotoActions, UIActions } from "../stores/types";
import type { SettingsActions } from "../stores/types";
import { FocusTrap } from "../utils/accessibility";
import { SuspenseFallback } from "./SuspenseFallback";

// Modals
import {
  CollectionModal,
  ExportModal,
  FolderModal,
  LikePlusModal,
  RemoveCollectionModal,
  SaveModal,
  TagModal,
} from "./modals";

const DiagnosticsDrawer = lazy(() => import("./DiagnosticsDrawer"));
const JobsDrawer = lazy(() => import("./JobsDrawer"));
const AdvancedSearchModal = lazy(
  () => import("./modals/AdvancedSearchModal")
);
const EnhancedSharingModal = lazy(() =>
  import("./modals/EnhancedSharingModal").then((m) => ({ default: m.EnhancedSharingModal }))
);
const ThemeSettingsModal = lazy(() =>
  import("./ThemeSettingsModal").then((m) => ({ default: m.ThemeSettingsModal }))
);
const SearchOverlay = lazy(() => import("./SearchOverlay"));
import { HelpModal } from "./HelpModal";
import { ShareManager } from "../modules/ShareManager";
import { apiCreateShare, apiAddPreset } from "../api";
import { handleError } from "../utils/errors";

export interface ModalManagerProps {
  // Core
  selected: Set<string>;
  dir: string;
  engine: string;
  topK: number;

  // Settings flags
  highContrast: boolean;
  useFast: boolean;
  fastKind: "" | "annoy" | "faiss" | "hnsw";
  useCaps: boolean;
  useOcr: boolean;
  hasText: boolean;
  useOsTrash: boolean;

  // Actions
  settingsActions: SettingsActions;
  uiActions: Pick<UIActions, "setBusy" | "setNote">;
  photoActions: Pick<
    PhotoActions,
    "setResults" | "setSmart" | "setSearchId" | "setFavOnly" | "setSaved" | "setCollections"
  >;
  libIndex: () => Promise<void> | void;
  prepareFast: (kind: "annoy" | "faiss" | "hnsw") => void;
  buildOCR: () => Promise<void> | void;
  buildMetadata: () => Promise<void> | void;
  setSelectedView: (view: string) => void; // now expected to navigate

  // Search context
  searchText: string;
  query: string;

  // Collections & tags
  collections: Record<string, string[]>;
  tagSelected: (tag: string) => void;

  // Toast
  setToast: (toast: { message: string; actionLabel?: string; onAction?: () => void } | null) => void;

  // Search overlay support
  clusters: Array<{ name?: string }>;
  allTags: string[];
  meta: { cameras?: string[]; places?: (string | number)[] } | null;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  selected,
  dir,
  engine,
  topK,
  highContrast,
  useFast,
  fastKind,
  useCaps,
  useOcr,
  hasText,
  useOsTrash,
  settingsActions,
  uiActions,
  photoActions,
  libIndex,
  prepareFast,
  buildOCR,
  buildMetadata,
  setSelectedView,
  searchText,
  query,
  collections,
  tagSelected,
  setToast,
  clusters,
  allTags,
  meta,
}) => {
  const { state: modalState, actions: modal } = useModalContext();

  // Basic v1 share modal submit handler
  async function createBasicShare(e: React.FormEvent) {
    e.preventDefault();
    if (!dir) return;
    const sel = Array.from(selected);
    if (sel.length === 0) {
      alert("Select photos to share");
      return;
    }
    const form = e.target as HTMLFormElement;
    const expiryStr = (form.elements.namedItem("expiry") as HTMLInputElement)?.value || "24";
    const expiry = parseInt(expiryStr, 10);
    const pw = (form.elements.namedItem("pw") as HTMLInputElement)?.value?.trim();
    const viewOnly = (form.elements.namedItem("viewonly") as HTMLInputElement)?.checked ?? true;
    try {
      const r = await apiCreateShare(dir, engine, sel, {
        expiryHours: Number.isNaN(expiry) ? 24 : expiry,
        password: pw || undefined,
        viewOnly,
      });
      await navigator.clipboard.writeText(window.location.origin + r.url);
      uiActions.setNote("Share link copied to clipboard");
    } catch (err) {
      uiActions.setNote(err instanceof Error ? err.message : "Share failed");
      handleError(err, { logToServer: true, context: { action: "create_share_basic", component: "ModalManager.createBasicShare", dir } });
    }
    modal.close("share");
  }

  return (
    <>
      {/* Jobs & Diagnostics drawers */}
      {modalState.jobs && (
        <Suspense fallback={<SuspenseFallback label="Loading jobs…" /> }>
          <JobsDrawer open={true} onClose={() => modal.close("jobs")} />
        </Suspense>
      )}
      {modalState.diagnostics && (
        <Suspense fallback={<SuspenseFallback label="Loading diagnostics…" /> }>
          <DiagnosticsDrawer open={true} onClose={() => modal.close("diagnostics")} />
        </Suspense>
      )}

      {/* Advanced Search */}
      {modalState.advanced && (
        <Suspense fallback={<SuspenseFallback label="Loading advanced search…" /> }>
          <AdvancedSearchModal
            open={true}
            onClose={() => modal.close("advanced")}
            onApply={(q) => {
              window.dispatchEvent(
                new CustomEvent("advanced-search-apply", { detail: { q } }),
              );
              modal.close("advanced");
            }}
            onSave={async (name, q) => {
              try {
                await apiAddPreset(dir, name, q);
                setToast({ message: `Saved preset ${name}` });
              } catch (e) {
                uiActions.setNote(
                  e instanceof Error ? e.message : "Save failed",
                );
                handleError(e, { logToServer: true, context: { action: "save_preset", component: "ModalManager.AdvancedSearch.onSave", dir } });
              }
            }}
            allTags={allTags || []}
            cameras={meta?.cameras || []}
            people={(clusters || [])
              .filter((c) => c.name)
              .map((c) => String(c.name))}
          />
        </Suspense>
      )}

      {/* Help / Theme */}
      <HelpModal isOpen={modalState.help} onClose={() => modal.close("help")} initialSection="getting-started" />
      {modalState.theme && (
        <Suspense fallback={<SuspenseFallback label="Loading theme settings…" /> }>
          <ThemeSettingsModal isOpen={true} onClose={() => modal.close("theme")} />
        </Suspense>
      )}

      {/* Search Command Center overlay */}
      {modalState.search && (
        <Suspense fallback={<SuspenseFallback label="Opening search…" /> }>
          <SearchOverlay
            open={modalState.search}
            onClose={() => modal.close("search")}
            clusters={clusters}
            allTags={allTags}
            meta={meta || undefined}
          />
        </Suspense>
      )}

      {/* Share Management (v2 manager) */}
      {modalState.shareManage && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
          onKeyDown={(e) => {
            if (e.key === "Escape") modal.close("shareManage");
          }}
        >
          <FocusTrap onEscape={() => modal.close("shareManage")}>
            <div className="bg-white rounded-lg p-4 w-full max-w-2xl" role="dialog" aria-modal="true">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Manage Shares</div>
                <button type="button" className="px-2 py-1 border rounded" onClick={() => modal.close("shareManage")}>
                  Close
                </button>
              </div>
              <ShareManager dir={dir} />
            </div>
          </FocusTrap>
        </div>
      )}

      {/* Export / Enhanced Share */}
      {modalState.export && (
        <ExportModal selected={selected} dir={dir} onClose={() => modal.close("export")} uiActions={uiActions} />
      )}
      {modalState["enhanced-share"] && (
        <Suspense fallback={<SuspenseFallback label="Loading sharing…" /> }>
          <EnhancedSharingModal selected={selected} dir={dir} onClose={() => modal.close("enhanced-share")} uiActions={uiActions} />
        </Suspense>
      )}

      {/* Basic Share (v1) */}
      {modalState.share && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
          onKeyDown={(e) => {
            if (e.key === "Escape") modal.close("share");
          }}
        >
          <FocusTrap onEscape={() => modal.close("share")}>
            <div className="bg-white rounded-lg p-4 w-full max-w-md" role="dialog" aria-modal="true">
              <div className="font-semibold mb-2">Share (v1)</div>
              <form onSubmit={createBasicShare}>
                <div className="grid gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="expiry-input">
                      Expiry (hours)
                    </label>
                    <input id="expiry-input" name="expiry" type="number" min={1} defaultValue={24} className="w-full border rounded px-2 py-1" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1" htmlFor="pw-input">
                      Password (optional)
                    </label>
                    <input id="pw-input" name="pw" type="password" className="w-full border rounded px-2 py-1" placeholder="••••••" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="viewonly" defaultChecked /> View-only (disable downloads)
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" className="px-3 py-1 rounded border" onClick={() => modal.close("share")} aria-label="Cancel sharing">
                    Cancel
                  </button>
                  <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white" aria-label="Create shareable link">
                    Create Link
                  </button>
                </div>
              </form>
            </div>
          </FocusTrap>
        </div>
      )}

      {/* Tag & Folder */}
      {modalState.tag && <TagModal onClose={() => modal.close("tag")} onTagSelected={tagSelected} />}
      {modalState.folder && (
        <FolderModal
          dir={dir}
          useOsTrash={useOsTrash}
          useFast={useFast}
          fastKind={fastKind}
          useCaps={useCaps}
          useOcr={useOcr}
          hasText={hasText}
          highContrast={highContrast}
          onClose={() => modal.close("folder")}
          settingsActions={settingsActions}
          uiActions={uiActions}
          doIndex={() => libIndex()}
          prepareFast={(k: string) => prepareFast(k as "annoy" | "faiss" | "hnsw")}
          buildOCR={buildOCR}
          buildMetadata={buildMetadata}
        />
      )}

      {/* Like+, Save, Collections */}
      {modalState.likeplus && (
        <LikePlusModal
          selected={selected}
          dir={dir}
          engine={engine}
          topK={topK}
          onClose={() => modal.close("likeplus")}
          setSelectedView={(view: string) => setSelectedView(view)}
          photoActions={photoActions}
          uiActions={uiActions}
        />
      )}
      {modalState.save && (
        <SaveModal
          dir={dir}
          searchText={searchText}
          query={query}
          topK={topK}
          onClose={() => modal.close("save")}
          setSelectedView={(view: string) => setSelectedView(view)}
          photoActions={photoActions}
          uiActions={uiActions}
        />
      )}
      {modalState.collect && (
        <CollectionModal
          selected={selected}
          dir={dir}
          collections={collections}
          onClose={() => modal.close("collect")}
          setToast={setToast}
          photoActions={photoActions}
          uiActions={uiActions}
        />
      )}
      {modalState.removeCollect && (
        <RemoveCollectionModal
          selected={selected}
          dir={dir}
          collections={collections}
          onClose={() => modal.close("removeCollect")}
          setToast={setToast}
          photoActions={photoActions}
          uiActions={uiActions}
        />
      )}
    </>
  );
};

export default ModalManager;
