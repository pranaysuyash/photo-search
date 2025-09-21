import type React from "react";
import { createContext, useContext, useMemo } from "react";

// Types for the modal data and actions
export type FolderSettingsActions = {
  setDir: (dir: string) => void;
  setUseOsTrash: (useOsTrash: boolean) => void;
  setUseFast: (useFast: boolean) => void;
  setFastKind: (fastKind: "" | "annoy" | "faiss" | "hnsw") => void;
  setUseCaps: (useCaps: boolean) => void;
  setUseOcr: (useOcr: boolean) => void;
  setHasText: (hasText: boolean) => void;
  setHighContrast: (highContrast: boolean) => void;
};

export type UIActionsForModals = {
  setBusy: (busy: boolean) => void;
  setNote: (note: string) => void;
};

export type PhotoActionsForModals = {
  setResults: (results: any) => void;
  setSaved: (saved: any) => void;
  setCollections: (collections: any) => void;
};

export interface ModalData {
  // Core data
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

  // Search context
  searchText: string;
  query: string;

  // Collections & tags
  collections: Record<string, string[]>;
  clusters: Array<{ name?: string }>;
  allTags: string[];
  meta: { cameras?: string[]; places?: (string | number)[] } | null;
}

export interface ModalActions {
  // Settings actions
  settingsActions: FolderSettingsActions;

  // UI actions
  uiActions: UIActionsForModals;

  // Photo actions
  photoActions: PhotoActionsForModals;

  // Indexing and build actions
  libIndex: () => Promise<void> | void;
  prepareFast: (kind: "annoy" | "faiss" | "hnsw") => void;
  buildOCR: () => Promise<void> | void;
  buildMetadata: () => Promise<void> | void;

  // Tag actions
  tagSelected: (tag: string) => void;
}

export interface ModalDataContextType {
  data: ModalData;
  actions: ModalActions;
}

const ModalDataContext = createContext<ModalDataContextType | null>(null);

export function ModalDataProvider({
  children,
  data,
  actions
}: {
  children: React.ReactNode;
  data: ModalData;
  actions: ModalActions;
}) {
  const value = useMemo(() => ({
    data,
    actions
  }), [data, actions]);

  return (
    <ModalDataContext.Provider value={value}>
      {children}
    </ModalDataContext.Provider>
  );
}

export function useModalData() {
  const context = useContext(ModalDataContext);
  if (!context) {
    throw new Error("useModalData must be used within ModalDataProvider");
  }
  return context;
}

// Helper hooks for specific data and actions
export function useModalDataContext() {
  const { data } = useModalData();
  return data;
}

export function useModalDataActions() {
  const { actions } = useModalData();
  return actions;
}

// Specific hooks for commonly used data
export function useSelectedPhotos() {
  const { selected } = useModalDataContext();
  return selected;
}

export function useCurrentDir() {
  const { dir } = useModalDataContext();
  return dir;
}

export function useSearchContext() {
  const { searchText, query, clusters, allTags, meta } = useModalDataContext();
  return { searchText, query, clusters, allTags, meta };
}

export function useCollections() {
  const { collections } = useModalDataContext();
  const { tagSelected } = useModalDataActions();
  return { collections, tagSelected };
}