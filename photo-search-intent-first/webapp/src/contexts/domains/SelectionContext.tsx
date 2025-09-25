/**
 * SelectionContext - Provides selection and tagging operations
 * This context encapsulates all selection functionality including tagging,
 * rating, exporting, and selection state management.
 */
import type React from "react";
import { createContext, useContext, useMemo } from "react";
import type { SearchResult } from "../../api";

// Define the shape of our selection context
interface SelectionContextType {
	// Selection operations
	tagSelected: (tagText: string) => Promise<void>;
	setRatingSelected: (rating: 1 | 2 | 3 | 4 | 5 | 0) => Promise<void>;
	exportSelected: (dest: string) => Promise<void>;
	deleteSelected: () => Promise<void>;
	addToCollectionSelected: (collectionName: string) => Promise<void>;
	removeFromCollectionSelected: (collectionName: string) => Promise<void>;
	addToFavoritesSelected: () => Promise<void>;
	removeFromFavoritesSelected: () => Promise<void>;

	// Selection state
	selectedPaths: Set<string>;
	selectedResults: SearchResult[];
	selectionCount: number;
	isPathSelected: (path: string) => boolean;

	// Selection setters
	setSelectedPaths: (paths: Set<string>) => void;
	setSelectedResults: (results: SearchResult[]) => void;
	togglePathSelection: (path: string) => void;
	selectPath: (path: string) => void;
	deselectPath: (path: string) => void;
	selectAll: (results: SearchResult[]) => void;
	deselectAll: () => void;
	invertSelection: (results: SearchResult[]) => void;

	// Tag management
	availableTags: string[];
	selectedTags: string[];
	addTag: (tag: string) => void;
	removeTag: (tag: string) => void;
	setAvailableTags: (tags: string[]) => void;
	setSelectedTags: (tags: string[]) => void;

	// Rating management
	selectedRating: 1 | 2 | 3 | 4 | 5 | 0;
	setSelectedRating: (rating: 1 | 2 | 3 | 4 | 5 | 0) => void;

	// Batch operations
	batchTag: (
		tags: string[],
		operation: "add" | "remove" | "replace",
	) => Promise<void>;
	batchRate: (rating: 1 | 2 | 3 | 4 | 5 | 0) => Promise<void>;
	batchExport: (dest: string) => Promise<void>;
	batchDelete: (useOsTrash?: boolean) => Promise<void>;
}

// Create the context with a default value
const SelectionContext = createContext<SelectionContextType | undefined>(
	undefined,
);

// Provider component props
interface SelectionProviderProps {
	children: React.ReactNode;
	value: SelectionContextType;
}

// Provider component
export const SelectionProvider: React.FC<SelectionProviderProps> = ({
	children,
	value,
}) => {
	return (
		<SelectionContext.Provider value={value}>
			{children}
		</SelectionContext.Provider>
	);
};

// Hook to consume the context
export const useSelectionContext = (): SelectionContextType => {
	const context = useContext(SelectionContext);
	if (context === undefined) {
		throw new Error(
			"useSelectionContext must be used within a SelectionProvider",
		);
	}
	return context;
};

// Selector hooks for specific selection operations
export const useSelectionOperations = (): Pick<
	SelectionContextType,
	| "tagSelected"
	| "setRatingSelected"
	| "exportSelected"
	| "deleteSelected"
	| "addToCollectionSelected"
	| "removeFromCollectionSelected"
	| "addToFavoritesSelected"
	| "removeFromFavoritesSelected"
> => {
	const context = useSelectionContext();
	return useMemo(
		() => ({
			tagSelected: context.tagSelected,
			setRatingSelected: context.setRatingSelected,
			exportSelected: context.exportSelected,
			deleteSelected: context.deleteSelected,
			addToCollectionSelected: context.addToCollectionSelected,
			removeFromCollectionSelected: context.removeFromCollectionSelected,
			addToFavoritesSelected: context.addToFavoritesSelected,
			removeFromFavoritesSelected: context.removeFromFavoritesSelected,
		}),
		[
			context.tagSelected,
			context.setRatingSelected,
			context.exportSelected,
			context.deleteSelected,
			context.addToCollectionSelected,
			context.removeFromCollectionSelected,
			context.addToFavoritesSelected,
			context.removeFromFavoritesSelected,
		],
	);
};

export const useSelectionState = (): Pick<
	SelectionContextType,
	| "selectedPaths"
	| "selectedResults"
	| "selectionCount"
	| "isPathSelected"
	| "setSelectedPaths"
	| "setSelectedResults"
	| "togglePathSelection"
	| "selectPath"
	| "deselectPath"
	| "selectAll"
	| "deselectAll"
	| "invertSelection"
> => {
	const context = useSelectionContext();
	return useMemo(
		() => ({
			selectedPaths: context.selectedPaths,
			selectedResults: context.selectedResults,
			selectionCount: context.selectionCount,
			isPathSelected: context.isPathSelected,
			setSelectedPaths: context.setSelectedPaths,
			setSelectedResults: context.setSelectedResults,
			togglePathSelection: context.togglePathSelection,
			selectPath: context.selectPath,
			deselectPath: context.deselectPath,
			selectAll: context.selectAll,
			deselectAll: context.deselectAll,
			invertSelection: context.invertSelection,
		}),
		[
			context.selectedPaths,
			context.selectedResults,
			context.selectionCount,
			context.isPathSelected,
			context.setSelectedPaths,
			context.setSelectedResults,
			context.togglePathSelection,
			context.selectPath,
			context.deselectPath,
			context.selectAll,
			context.deselectAll,
			context.invertSelection,
		],
	);
};

export const useTagManagement = (): Pick<
	SelectionContextType,
	| "availableTags"
	| "selectedTags"
	| "addTag"
	| "removeTag"
	| "setAvailableTags"
	| "setSelectedTags"
> => {
	const context = useSelectionContext();
	return useMemo(
		() => ({
			availableTags: context.availableTags,
			selectedTags: context.selectedTags,
			addTag: context.addTag,
			removeTag: context.removeTag,
			setAvailableTags: context.setAvailableTags,
			setSelectedTags: context.setSelectedTags,
		}),
		[
			context.availableTags,
			context.selectedTags,
			context.addTag,
			context.removeTag,
			context.setAvailableTags,
			context.setSelectedTags,
		],
	);
};

export const useRatingManagement = (): Pick<
	SelectionContextType,
	"selectedRating" | "setSelectedRating"
> => {
	const context = useSelectionContext();
	return useMemo(
		() => ({
			selectedRating: context.selectedRating,
			setSelectedRating: context.setSelectedRating,
		}),
		[context.selectedRating, context.setSelectedRating],
	);
};

export const useBatchOperations = (): Pick<
	SelectionContextType,
	"batchTag" | "batchRate" | "batchExport" | "batchDelete"
> => {
	const context = useSelectionContext();
	return useMemo(
		() => ({
			batchTag: context.batchTag,
			batchRate: context.batchRate,
			batchExport: context.batchExport,
			batchDelete: context.batchDelete,
		}),
		[
			context.batchTag,
			context.batchRate,
			context.batchExport,
			context.batchDelete,
		],
	);
};

export default SelectionContext;
