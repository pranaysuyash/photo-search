import { useMemo } from "react";
import { type ModalKey, useModalContext } from "../contexts/ModalContext";
import { useModalDataContext, useModalDataActions } from "../contexts/ModalDataContext";

// Fallback data for when used outside ModalDataProvider
const fallbackModalData = {
  selected: new Set<string>(),
  dir: "",
  engine: "",
  topK: 0,
  highContrast: false,
  useFast: false,
  fastKind: "" as const,
  useCaps: false,
  useOcr: false,
  hasText: false,
  useOsTrash: false,
  searchText: "",
  query: "",
  collections: {},
  clusters: [],
  allTags: [],
  meta: null,
};

// Fallback actions for when used outside ModalDataProvider
const fallbackModalActions = {
  settingsActions: {
    setDir: () => {},
    setUseOsTrash: () => {},
    setUseFast: () => {},
    setFastKind: () => {},
    setUseCaps: () => {},
    setUseOcr: () => {},
    setHasText: () => {},
    setHighContrast: () => {},
  },
  uiActions: {
    setBusy: () => {},
    setNote: () => {},
  },
  photoActions: {
    setResults: () => {},
    setSaved: () => {},
    setCollections: () => {},
  },
  libIndex: () => {},
  prepareFast: () => {},
  buildOCR: () => {},
  buildMetadata: () => {},
  tagSelected: () => {},
};

export interface ModalControls {
	openModal: (key: ModalKey) => void;
	closeModal: (key: ModalKey) => void;
	toggleModal: (key: ModalKey) => void;
	closeAll: () => void;
	openFolder: () => void;
	openHelp: () => void;
	openSearch: () => void;
	openJobs: () => void;
	openTheme: () => void;
	openDiagnostics: () => void;
	openShareManager: () => void;

	// Data-aware modal controls
	canOpenShare: () => boolean;
	canOpenExport: () => boolean;
	canOpenCollections: () => boolean;
	hasSelectedItems: () => boolean;
}

export function useModalControls(): ModalControls {
	const { actions } = useModalContext();

	// Safely get data with fallback
	let data;
	try {
		data = useModalDataContext();
	} catch (error) {
		// Used outside ModalDataProvider context
		data = fallbackModalData;
	}

	return useMemo(
		() => ({
			openModal: actions.open,
			closeModal: actions.close,
			toggleModal: actions.toggle,
			closeAll: actions.closeAll,
			openFolder: () => actions.open("folder"),
			openHelp: () => actions.open("help"),
			openSearch: () => actions.open("search"),
			openJobs: () => actions.open("jobs"),
			openTheme: () => actions.open("theme"),
			openDiagnostics: () => actions.open("diagnostics"),
			openShareManager: () => actions.open("shareManage"),

			// Data-aware modal controls
			canOpenShare: () => data.selected.size > 0 && !!data.dir,
			canOpenExport: () => data.selected.size > 0 && !!data.dir,
			canOpenCollections: () => data.selected.size > 0 && Object.keys(data.collections).length > 0,
			hasSelectedItems: () => data.selected.size > 0,
		}),
		[actions, data],
	);
}

export default useModalControls;
