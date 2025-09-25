/**
 * ActionsContext - Provides a consolidated interface for all application actions
 * This context acts as a facade that combines all domain-specific contexts
 * to provide a unified interface for application actions.
 */
import type React from "react";
import { createContext, useContext, useMemo } from "react";
import type { AccessibilitySettings } from "../../components/AccessibilityPanel";

// Define the shape of our actions context
interface ActionsContextType {
	// Search operations (delegated to SearchOperationsContext)
	doSearchImmediate: (query?: string) => Promise<void>;

	// Data loading (delegated to DataManagementContext)
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

	// Index operations (delegated to IndexOperationsContext)
	prepareFast: (kind: "annoy" | "faiss" | "hnsw") => Promise<void>;
	buildOCR: () => Promise<void>;
	buildMetadata: () => Promise<void>;

	// UI actions (delegated to IndexOperationsContext)
	monitorOperation: (
		jobId: string,
		operation: "ocr" | "metadata" | "fast_index",
	) => () => void;

	// Navigation (delegated to NavigationContext)
	openDetailByPath: (path: string) => void;
	navDetail: (delta: number) => void;

	// Selection actions (delegated to SelectionContext)
	tagSelected: (tagText: string) => Promise<void>;
	setRatingSelected: (rating: 1 | 2 | 3 | 4 | 5 | 0) => Promise<void>;

	// Utility functions (delegated to PhotoOperationsContext)
	exportSelected: (dest: string) => Promise<void>;
	handlePhotoOpen: (path: string) => void;
	handlePhotoAction: (
		action: string,
		photo: { path: string; [key: string]: unknown },
	) => void;
	handleAccessibilitySettingsChange: (settings: AccessibilitySettings) => void;
	rowsEqual: (a: number[][], b: number[][]) => boolean;
}

// Create the context with a default value
const ActionsContext = createContext<ActionsContextType | undefined>(undefined);

// Provider component props
interface ActionsProviderProps {
	children: React.ReactNode;
	value: ActionsContextType;
}

// Provider component
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

// Selector hooks for specific actions (maintaining backward compatibility)
export const useSearchActions = (): Pick<
	ActionsContextType,
	"doSearchImmediate"
> => {
	const context = useActionsContext();
	return useMemo(
		() => ({
			doSearchImmediate: context.doSearchImmediate,
		}),
		[context.doSearchImmediate],
	);
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
	return useMemo(
		() => ({
			loadFav: context.loadFav,
			loadSaved: context.loadSaved,
			loadTags: context.loadTags,
			loadDiag: context.loadDiag,
			loadFaces: context.loadFaces,
			loadMap: context.loadMap,
			loadLibrary: context.loadLibrary,
			loadMetadata: context.loadMetadata,
			loadPresets: context.loadPresets,
		}),
		[
			context.loadFav,
			context.loadSaved,
			context.loadTags,
			context.loadDiag,
			context.loadFaces,
			context.loadMap,
			context.loadLibrary,
			context.loadMetadata,
			context.loadPresets,
		],
	);
};

export const useIndexActions = (): Pick<
	ActionsContextType,
	"prepareFast" | "buildOCR" | "buildMetadata"
> => {
	const context = useActionsContext();
	return useMemo(
		() => ({
			prepareFast: context.prepareFast,
			buildOCR: context.buildOCR,
			buildMetadata: context.buildMetadata,
		}),
		[context.prepareFast, context.buildOCR, context.buildMetadata],
	);
};

export const useUIActions = (): Pick<
	ActionsContextType,
	"monitorOperation"
> => {
	const context = useActionsContext();
	return useMemo(
		() => ({
			monitorOperation: context.monitorOperation,
		}),
		[context.monitorOperation],
	);
};

export const useSelectionActions = (): Pick<
	ActionsContextType,
	"tagSelected" | "setRatingSelected"
> => {
	const context = useActionsContext();
	return useMemo(
		() => ({
			tagSelected: context.tagSelected,
			setRatingSelected: context.setRatingSelected,
		}),
		[context.tagSelected, context.setRatingSelected],
	);
};

export const useNavigationActions = (): Pick<
	ActionsContextType,
	"openDetailByPath" | "navDetail"
> => {
	const context = useActionsContext();
	return useMemo(
		() => ({
			openDetailByPath: context.openDetailByPath,
			navDetail: context.navDetail,
		}),
		[context.openDetailByPath, context.navDetail],
	);
};

export const usePhotoActions = (): Pick<
	ActionsContextType,
	| "handlePhotoOpen"
	| "handlePhotoAction"
	| "exportSelected"
	| "handleAccessibilitySettingsChange"
	| "rowsEqual"
> => {
	const context = useActionsContext();
	return useMemo(
		() => ({
			handlePhotoOpen: context.handlePhotoOpen,
			handlePhotoAction: context.handlePhotoAction,
			exportSelected: context.exportSelected,
			handleAccessibilitySettingsChange:
				context.handleAccessibilitySettingsChange,
			rowsEqual: context.rowsEqual,
		}),
		[
			context.handlePhotoOpen,
			context.handlePhotoAction,
			context.exportSelected,
			context.handleAccessibilitySettingsChange,
			context.rowsEqual,
		],
	);
};

export default ActionsContext;
