import type React from "react";
import { lazy, Suspense, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FOLDER_MODAL_EVENT } from "@/constants/events";
import { useToast } from "@/hooks/use-toast";
import { useModalContext } from "../contexts/ModalContext";
import { useModalStatus } from "../hooks/useModalStatus";
import type { PhotoActions, SettingsActions, UIActions } from "../stores/types";
import { FocusTrap } from "../utils/accessibility";
import { viewToPath } from "../utils/router";
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
import { ShareManageOverlay } from "./ShareManageOverlay";
import { SuspenseFallback } from "./SuspenseFallback";

const _DiagnosticsDrawer = lazy(() => import("./DiagnosticsDrawer"));
const JobsDrawer = lazy(() => import("./JobsDrawer"));
const AdvancedSearchModal = lazy(() => import("./modals/AdvancedSearchModal"));
const EnhancedSharingModal = lazy(() =>
  import("./modals/EnhancedSharingModal").then((m) => ({
    default: m.EnhancedSharingModal,
  }))
);
const ThemeSettingsModal = lazy(() =>
  import("./ThemeSettingsModal").then((m) => ({
    default: m.ThemeSettingsModal,
  }))
);
const SearchOverlay = lazy(() => import("./SearchOverlay"));

import { apiAddPreset, apiCreateShare } from "../api";
import { handleError } from "../utils/errors";
import { HelpModal } from "./HelpModal";

type FolderSettingsActions = Pick<
  SettingsActions,
  | "setDir"
  | "setUseOsTrash"
  | "setUseFast"
  | "setFastKind"
  | "setUseCaps"
  | "setUseOcr"
  | "setHasText"
  | "setHighContrast"
>;

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
  settingsActions: FolderSettingsActions;
  setBusy: UIActions["setBusy"];
  setNote: UIActions["setNote"];
  setResults: PhotoActions["setResults"];
  setSaved: PhotoActions["setSaved"];
  setCollections: PhotoActions["setCollections"];
  libIndex: () => Promise<void> | void;
  prepareFast: (kind: "annoy" | "faiss" | "hnsw") => void;
  buildOCR: () => Promise<void> | void;
  buildMetadata: () => Promise<void> | void;
  // Search context
  searchText: string;
  query: string;

  // Collections & tags
  collections: Record<string, string[]>;
  tagSelected: (tag: string) => void;

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
  setBusy,
  setNote,
  setResults,
  setSaved,
  setCollections,
  libIndex,
  prepareFast,
  buildOCR,
  buildMetadata,
  searchText,
  query,
  collections,
  tagSelected,
  clusters,
  allTags,
  meta,
}) => {
  const { actions: modal } = useModalContext();
  const modalStatus = useModalStatus();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleExternalOpen = () => modal.open("folder");
    window.addEventListener(FOLDER_MODAL_EVENT, handleExternalOpen);
    return () => {
      window.removeEventListener(FOLDER_MODAL_EVENT, handleExternalOpen);
    };
  }, [modal]);
  const navigate = useNavigate();
  const navigateToView = useCallback(
    (view: string) => navigate(viewToPath(view)),
    [navigate]
  );
  const { toast } = useToast();
  const uiActionsForModals = useMemo(
    () => ({ setBusy, setNote }),
    [setBusy, setNote]
  );
  const likePlusPhotoActions = useMemo(() => ({ setResults }), [setResults]);
  const savePhotoActions = useMemo(() => ({ setSaved }), [setSaved]);
  const collectionPhotoActions = useMemo(
    () => ({ setCollections }),
    [setCollections]
  );

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
    const expiryStr =
      (form.elements.namedItem("expiry") as HTMLInputElement)?.value || "24";
    const expiry = parseInt(expiryStr, 10);
    const pw = (
      form.elements.namedItem("pw") as HTMLInputElement
    )?.value?.trim();
    const viewOnly =
      (form.elements.namedItem("viewonly") as HTMLInputElement)?.checked ??
      true;
    try {
      const r = await apiCreateShare(dir, engine, sel, {
        expiryHours: Number.isNaN(expiry) ? 24 : expiry,
        password: pw || undefined,
        viewOnly,
      });
      await navigator.clipboard.writeText(window.location.origin + r.url);
      setNote("Share link copied to clipboard");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Share failed");
      handleError(err, {
        logToServer: true,
        context: {
          action: "create_share_basic",
          component: "ModalManager.createBasicShare",
          dir,
        },
      });
    }
    modal.close("share");
  }

  return (
    <>
      {/* Jobs & Diagnostics drawers */}
      {modalStatus.isOpen("jobs") && (
        <Suspense fallback={<SuspenseFallback label="Loading jobs…" />}>
          <JobsDrawer open={true} onClose={() => modal.close("jobs")} />
        </Suspense>
      )}
      {modalStatus.isOpen("diagnostics") && (
        <Suspense fallback={<SuspenseFallback label="Loading diagnostics…" />}>
          <_DiagnosticsDrawer
            open={modalStatus.isOpen("diagnostics")}
            onClose={() => modal.close("diagnostics")}
          />
        </Suspense>
      )}
      {modalStatus.isOpen("shareManage") && (
        <ShareManageOverlay
          isOpen={modalStatus.isOpen("shareManage")}
          onClose={() => modal.close("shareManage")}
          dir={dir}
        />
      )}

      {/* Advanced Search */}
      {modalStatus.isOpen("advanced") && (
        <Suspense
          fallback={<SuspenseFallback label="Loading advanced search…" />}
        >
          <AdvancedSearchModal
            open={true}
            onClose={() => modal.close("advanced")}
            onApply={(q) => {
              window.dispatchEvent(
                new CustomEvent("advanced-search-apply", { detail: { q } })
              );
              modal.close("advanced");
            }}
            onSave={async (name, q) => {
              try {
                await apiAddPreset(dir, name, q);
                toast({ description: `Saved preset ${name}` });
              } catch (e) {
                setNote(e instanceof Error ? e.message : "Save failed");
                handleError(e, {
                  logToServer: true,
                  context: {
                    action: "save_preset",
                    component: "ModalManager.AdvancedSearch.onSave",
                    dir,
                  },
                });
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
      <HelpModal
        isOpen={modalStatus.isOpen("help")}
        onClose={() => modal.close("help")}
        initialSection="getting-started"
      />
      {modalStatus.isOpen("theme") && (
        <Suspense
          fallback={<SuspenseFallback label="Loading theme settings…" />}
        >
          <ThemeSettingsModal
            isOpen={true}
            onClose={() => modal.close("theme")}
          />
        </Suspense>
      )}

      {/* Search Command Center overlay */}
      {modalStatus.isOpen("search") && (
        <Suspense fallback={<SuspenseFallback label="Opening search…" />}>
          <SearchOverlay
            open={modalStatus.isOpen("search")}
            onClose={() => modal.close("search")}
            clusters={clusters}
            allTags={allTags}
            meta={meta || undefined}
          />
        </Suspense>
      )}

      {/* Export / Enhanced Share */}
      {modalStatus.isOpen("export") && (
        <ExportModal
          selected={selected}
          dir={dir}
          onClose={() => modal.close("export")}
          uiActions={uiActionsForModals}
        />
      )}
      {modalStatus.isOpen("enhanced-share") && (
        <Suspense fallback={<SuspenseFallback label="Loading sharing…" />}>
          <EnhancedSharingModal
            selected={selected}
            dir={dir}
            onClose={() => modal.close("enhanced-share")}
            uiActions={uiActionsForModals}
          />
        </Suspense>
      )}

      {/* Basic Share (v1) */}
      {modalStatus.isOpen("share") && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close share"
            className="absolute inset-0 w-full h-full"
            onClick={() => modal.close("share")}
            onKeyDown={(e) => {
              if (e.key === "Escape") modal.close("share");
            }}
          />
          <FocusTrap onEscape={() => modal.close("share")}>
            <div
              className="bg-white rounded-lg p-4 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <div className="font-semibold mb-2">Share (v1)</div>
              <form onSubmit={createBasicShare}>
                <div className="grid gap-3">
                  <div>
                    <label
                      className="block text-sm text-gray-600 mb-1"
                      htmlFor="expiry-input"
                    >
                      Expiry (hours)
                    </label>
                    <input
                      id="expiry-input"
                      name="expiry"
                      type="number"
                      min={1}
                      defaultValue={24}
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm text-gray-600 mb-1"
                      htmlFor="pw-input"
                    >
                      Password (optional)
                    </label>
                    <input
                      id="pw-input"
                      name="pw"
                      type="password"
                      className="w-full border rounded px-2 py-1"
                      placeholder="••••••"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="viewonly" defaultChecked />{" "}
                    View-only (disable downloads)
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded border"
                    onClick={() => modal.close("share")}
                    aria-label="Cancel sharing"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-blue-600 text-white"
                    aria-label="Create shareable link"
                  >
                    Create Link
                  </button>
                </div>
              </form>
            </div>
          </FocusTrap>
        </div>
      )}

      {/* Tag & Folder */}
      {modalStatus.isOpen("tag") && (
        <TagModal
          onClose={() => modal.close("tag")}
          onTagSelected={tagSelected}
        />
      )}
      {modalStatus.isOpen("folder") && (
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
          uiActions={uiActionsForModals}
          doIndex={() => libIndex()}
          prepareFast={(k: string) =>
            prepareFast(k as "annoy" | "faiss" | "hnsw")
          }
          buildOCR={buildOCR}
          buildMetadata={buildMetadata}
        />
      )}

      {/* Like+, Save, Collections */}
      {modalStatus.isOpen("likeplus") && (
        <LikePlusModal
          selected={selected}
          dir={dir}
          engine={engine}
          topK={topK}
          onClose={() => modal.close("likeplus")}
          setSelectedView={navigateToView}
          photoActions={likePlusPhotoActions}
          uiActions={uiActionsForModals}
        />
      )}
      {modalStatus.isOpen("save") && (
        <SaveModal
          dir={dir}
          searchText={searchText}
          query={query}
          topK={topK}
          onClose={() => modal.close("save")}
          setSelectedView={navigateToView}
          photoActions={savePhotoActions}
          uiActions={uiActionsForModals}
        />
      )}
      {modalStatus.isOpen("collect") && (
        <CollectionModal
          selected={selected}
          dir={dir}
          collections={collections}
          onClose={() => modal.close("collect")}
          photoActions={collectionPhotoActions}
          uiActions={uiActionsForModals}
        />
      )}
      {modalStatus.isOpen("removeCollect") && (
        <RemoveCollectionModal
          selected={selected}
          dir={dir}
          collections={collections}
          onClose={() => modal.close("removeCollect")}
          photoActions={collectionPhotoActions}
          uiActions={uiActionsForModals}
        />
      )}
    </>
  );
};

export default ModalManager;
