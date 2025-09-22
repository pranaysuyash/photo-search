/**
 * ActionsContext - Provides commonly used actions to reduce prop drilling
 * This context consolidates action functions that are frequently passed down
 * through the component tree to reduce prop drilling.
 */
import type React from "react";
import { createContext, useContext } from "react";
import type { SearchResult } from "../api";

// Define the shape of our actions context
interface ActionsContextType {
	// Search operations
	performSearch: (query: string, topK?: number) => Promise<void>;
	searchSimilar: (path: string, topK?: number) => Promise<void>;
	searchLike: (
		path: string,
		text?: string,
		weight?: number,
		topK?: number,
	) => Promise<void>;
	doSearchImmediate: (query: string) => Promise<void>;

	// Data loading
	loadFav: () => Promise<void>;
	loadSaved: () => Promise<void>;
	loadTags: () => Promise<void>;
	loadDiag: () => Promise<void>;
	loadFaces: () => Promise<void>;
	loadMap: () => Promise<void>;
	loadLibrary: (
		limit?: number,
		offset?: number,
		append?: boolean,
	) => Promise<void>;
	loadMetadata: () => Promise<void>;
	loadPresets: () => Promise<void>;

	// Index operations
	buildFast: (kind: "annoy" | "faiss" | "hnsw") => Promise<void>;
	buildOCR: () => Promise<void>;
	buildMetadata: () => Promise<void>;

	// UI actions
	setQuery: (query: string) => void;
	setResults: (results: SearchResult[]) => void;
	setSearchId: (id: string) => void;
	setBusy: (message: string) => void;
	setNote: (message: string) => void;
	setDir: (dir: string) => void;

	// Selection actions
	toggleSelect: (path: string) => void;
	selectAll: () => void;
	clearSelection: () => void;
	deleteSelected: () => Promise<void>;
	tagSelected: (tagText: string) => Promise<void>;
	setRatingSelected: (rating: 1 | 2 | 3 | 4 | 5 | 0) => Promise<void>;

	// View management
	setViewMode: (mode: "grid" | "film" | "timeline" | "map") => void;
	setResultView: (view: "grid" | "film" | "timeline" | "map") => void;
	setTimelineBucket: (bucket: "day" | "week" | "month" | "year") => void;

	// Settings actions
	setFavOnly: (value: boolean) => void;
	setTagFilter: (value: string) => void;
	setPlace: (value: string) => void;
	setCamera: (value: string) => void;
	setIsoMin: (value: number) => void;
	setIsoMax: (value: number) => void;
	setFMin: (value: number) => void;
	setFMax: (value: number) => void;
	setHasText: (value: boolean) => void;
	setUseFast: (value: boolean) => void;
	setFastKind: (value: string) => void;
	setUseCaps: (value: boolean) => void;
	setUseOcr: (value: boolean) => void;
	setResultViewSetting: (value: "grid" | "film" | "timeline" | "map") => void;
	setTimelineBucketSetting: (value: "day" | "week" | "month" | "year") => void;

	// Workspace actions
	setPersons: (persons: string[]) => void;
	setClusters: (clusters: unknown[]) => void;
	setPoints: (points: unknown[]) => void;
	setDiag: (diag: unknown) => void;
	setMeta: (meta: unknown) => void;

	// Modal actions
	openModal: (modal: string) => void;
	closeModal: (modal: string) => void;

	// Navigation
	navigate: (path: string) => void;

	// Utility functions
	handlePhotoOpen: (path: string) => void;
	handlePhotoAction: (
		action: string,
		photo: { path: string; [key: string]: unknown },
	) => void;
	exportSelected: (dest: string) => Promise<void>;
	monitorOperation: (jobId: string, operation: string) => () => void;
}

// Create the context with a default value
const ActionsContext = createContext<ActionsContextType | undefined>(undefined);

// Provider component
interface ActionsProviderProps {
	children: React.ReactNode;
	value: ActionsContextType;
}

export const ActionsProvider: React.FC<ActionsProviderProps> = ({
	children,
	value,
}) => {
	return (
		<ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>
	);
};

// Hook to consume the context
export const useActionsContext = (): ActionsContextType => {
	const context = useContext(ActionsContext);
	if (context === undefined) {
		throw new Error("useActionsContext must be used within an ActionsProvider");
	}
	return context;
};

// Selector hooks for specific actions
export const useSearchActions = (): Pick<
	ActionsContextType,
	| "performSearch"
	| "searchSimilar"
	| "searchLike"
	| "doSearchImmediate"
	| "setQuery"
	| "setResults"
	| "setSearchId"
> => {
	const context = useActionsContext();
	return {
		performSearch: context.performSearch,
		searchSimilar: context.searchSimilar,
		searchLike: context.searchLike,
		doSearchImmediate: context.doSearchImmediate,
		setQuery: context.setQuery,
		setResults: context.setResults,
		setSearchId: context.setSearchId,
	};
};

export const useDataActions = (): Pick<
	ActionsContextType,
	| "loadFav"
	| "loadSaved"
	| "loadTags"
	| "loadDiag"
	| "loadFaces"
	| "loadMap"
	| "loadLibrary"
	| "loadMetadata"
	| "loadPresets"
> => {
	const context = useActionsContext();
	return {
		loadFav: context.loadFav,
		loadSaved: context.loadSaved,
		loadTags: context.loadTags,
		loadDiag: context.loadDiag,
		loadFaces: context.loadFaces,
		loadMap: context.loadMap,
		loadLibrary: context.loadLibrary,
		loadMetadata: context.loadMetadata,
		loadPresets: context.loadPresets,
	};
};

export const useIndexActions = (): Pick<
	ActionsContextType,
	"buildFast" | "buildOCR" | "buildMetadata"
> => {
	const context = useActionsContext();
	return {
		buildFast: context.buildFast,
		buildOCR: context.buildOCR,
		buildMetadata: context.buildMetadata,
	};
};

export const useUIActions = (): Pick<
	ActionsContextType,
	| "setBusy"
	| "setNote"
	| "setDir"
	| "setViewMode"
	| "setResultView"
	| "setTimelineBucket"
> => {
	const context = useActionsContext();
	return {
		setBusy: context.setBusy,
		setNote: context.setNote,
		setDir: context.setDir,
		setViewMode: context.setViewMode,
		setResultView: context.setResultView,
		setTimelineBucket: context.setTimelineBucket,
	};
};

export const useSelectionActions = (): Pick<
	ActionsContextType,
	| "toggleSelect"
	| "selectAll"
	| "clearSelection"
	| "deleteSelected"
	| "tagSelected"
	| "setRatingSelected"
> => {
	const context = useActionsContext();
	return {
		toggleSelect: context.toggleSelect,
		selectAll: context.selectAll,
		clearSelection: context.clearSelection,
		deleteSelected: context.deleteSelected,
		tagSelected: context.tagSelected,
		setRatingSelected: context.setRatingSelected,
	};
};

export const useSettingsActions = (): Pick<
	ActionsContextType,
	| "setFavOnly"
	| "setTagFilter"
	| "setPlace"
	| "setCamera"
	| "setIsoMin"
	| "setIsoMax"
	| "setFMin"
	| "setFMax"
	| "setHasText"
	| "setUseFast"
	| "setFastKind"
	| "setUseCaps"
	| "setUseOcr"
	| "setResultViewSetting"
	| "setTimelineBucketSetting"
> => {
	const context = useActionsContext();
	return {
		setFavOnly: context.setFavOnly,
		setTagFilter: context.setTagFilter,
		setPlace: context.setPlace,
		setCamera: context.setCamera,
		setIsoMin: context.setIsoMin,
		setIsoMax: context.setIsoMax,
		setFMin: context.setFMin,
		setFMax: context.setFMax,
		setHasText: context.setHasText,
		setUseFast: context.setUseFast,
		setFastKind: context.setFastKind,
		setUseCaps: context.setUseCaps,
		setUseOcr: context.setUseOcr,
		setResultViewSetting: context.setResultViewSetting,
		setTimelineBucketSetting: context.setTimelineBucketSetting,
	};
};

export const useWorkspaceActions = (): Pick<
	ActionsContextType,
	"setPersons" | "setClusters" | "setPoints" | "setDiag" | "setMeta"
> => {
	const context = useActionsContext();
	return {
		setPersons: context.setPersons,
		setClusters: context.setClusters,
		setPoints: context.setPoints,
		setDiag: context.setDiag,
		setMeta: context.setMeta,
	};
};

export const useModalActions = (): Pick<
	ActionsContextType,
	"openModal" | "closeModal" | "navigate"
> => {
	const context = useActionsContext();
	return {
		openModal: context.openModal,
		closeModal: context.closeModal,
		navigate: context.navigate,
	};
};

export const usePhotoActions = (): Pick<
	ActionsContextType,
	| "handlePhotoOpen"
	| "handlePhotoAction"
	| "exportSelected"
	| "monitorOperation"
> => {
	const context = useActionsContext();
	return {
		handlePhotoOpen: context.handlePhotoOpen,
		handlePhotoAction: context.handlePhotoAction,
		exportSelected: context.exportSelected,
		monitorOperation: context.monitorOperation,
	};
};

export default ActionsContext;
