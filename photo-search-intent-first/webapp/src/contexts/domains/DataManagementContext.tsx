/**
 * DataManagementContext - Provides data loading and management operations
 * This context encapsulates all data-related functionality including loading,
 * indexing, metadata management, and data synchronization.
 */
import type React from "react";
import { createContext, useContext, useMemo } from "react";

// Define the shape of our data management context
interface DataManagementContextType {
	// Data loading operations
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

	// Data state
	favorites: string[];
	savedSearches: Array<{ name: string; query: string; top_k?: number }>;
	allTags: string[];
	tagsMap: Record<string, string[]>;
	diag: unknown;
	faces: unknown;
	mapPoints: unknown;
	library: string[];
	libHasMore: boolean;
	metadata: unknown;
	presets: unknown;

	// Data setters
	setFavorites: (fav: string[]) => void;
	setSavedSearches: (
		saved: Array<{ name: string; query: string; top_k?: number }>,
	) => void;
	setAllTags: (tags: string[]) => void;
	setTagsMap: (tagsMap: Record<string, string[]>) => void;
	setDiag: (diag: unknown) => void;
	setFaces: (faces: unknown) => void;
	setMapPoints: (points: unknown) => void;
	setLibrary: (library: string[]) => void;
	setLibHasMore: (hasMore: boolean) => void;
	setMetadata: (metadata: unknown) => void;
	setPresets: (presets: unknown) => void;

	// Data manipulation
	appendLibrary: (paths: string[]) => void;
	refreshData: () => Promise<void>;
}

// Create the context with a default value
const DataManagementContext = createContext<
	DataManagementContextType | undefined
>(undefined);

// Provider component props
interface DataManagementProviderProps {
	children: React.ReactNode;
	value: DataManagementContextType;
}

// Provider component
export const DataManagementProvider: React.FC<DataManagementProviderProps> = ({
	children,
	value,
}) => {
	return (
		<DataManagementContext.Provider value={value}>
			{children}
		</DataManagementContext.Provider>
	);
};

// Hook to consume the context
export const useDataManagementContext = (): DataManagementContextType => {
	const context = useContext(DataManagementContext);
	if (context === undefined) {
		throw new Error(
			"useDataManagementContext must be used within a DataManagementProvider",
		);
	}
	return context;
};

// Selector hooks for specific data operations
export const useDataLoading = (): Pick<
	DataManagementContextType,
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
	const context = useDataManagementContext();
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

export const useDataState = (): Pick<
	DataManagementContextType,
	| "favorites"
	| "savedSearches"
	| "allTags"
	| "tagsMap"
	| "diag"
	| "faces"
	| "mapPoints"
	| "library"
	| "libHasMore"
	| "metadata"
	| "presets"
	| "setFavorites"
	| "setSavedSearches"
	| "setAllTags"
	| "setTagsMap"
	| "setDiag"
	| "setFaces"
	| "setMapPoints"
	| "setLibrary"
	| "setLibHasMore"
	| "setMetadata"
	| "setPresets"
	| "appendLibrary"
> => {
	const context = useDataManagementContext();
	return useMemo(
		() => ({
			favorites: context.favorites,
			savedSearches: context.savedSearches,
			allTags: context.allTags,
			tagsMap: context.tagsMap,
			diag: context.diag,
			faces: context.faces,
			mapPoints: context.mapPoints,
			library: context.library,
			libHasMore: context.libHasMore,
			metadata: context.metadata,
			presets: context.presets,
			setFavorites: context.setFavorites,
			setSavedSearches: context.setSavedSearches,
			setAllTags: context.setAllTags,
			setTagsMap: context.setTagsMap,
			setDiag: context.setDiag,
			setFaces: context.setFaces,
			setMapPoints: context.setMapPoints,
			setLibrary: context.setLibrary,
			setLibHasMore: context.setLibHasMore,
			setMetadata: context.setMetadata,
			setPresets: context.setPresets,
			appendLibrary: context.appendLibrary,
		}),
		[
			context.favorites,
			context.savedSearches,
			context.allTags,
			context.tagsMap,
			context.diag,
			context.faces,
			context.mapPoints,
			context.library,
			context.libHasMore,
			context.metadata,
			context.presets,
			context.setFavorites,
			context.setSavedSearches,
			context.setAllTags,
			context.setTagsMap,
			context.setDiag,
			context.setFaces,
			context.setMapPoints,
			context.setLibrary,
			context.setLibHasMore,
			context.setMetadata,
			context.setPresets,
			context.appendLibrary,
		],
	);
};

export const useDataRefresh = (): Pick<
	DataManagementContextType,
	"refreshData"
> => {
	const context = useDataManagementContext();
	return useMemo(
		() => ({
			refreshData: context.refreshData,
		}),
		[context.refreshData],
	);
};

export default DataManagementContext;
