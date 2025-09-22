/**
 * DataContext - Provides commonly used data to reduce prop drilling
 * This context consolidates data that's frequently accessed across components
 * to reduce the number of props passed down through the component tree.
 */
import type React from "react";
import { createContext, useContext } from "react";
import type { SearchResult } from "../api";

// Define the shape of our data context
interface DataContextType {
	// Directory and configuration
	dir: string | null;
	engine: string;
	hfToken?: string;
	openaiKey?: string;
	useFast: boolean;
	fastKind: string;
	useCaps: boolean;
	useOcr: boolean;
	hasText: boolean;

	// Search and filtering
	query: string;
	results: SearchResult[];
	searchId: string;
	topK: number;
	favOnly: boolean;
	tagFilter: string;
	allTags: string[];
	tagsMap: Record<string, string[]>;
	place: string;
	camera: string;
	isoMin: number;
	isoMax: number;
	fMin: number;
	fMax: number;

	// Collections and saved searches
	saved: Array<{ name: string; query: string; top_k?: number }>;
	collections: Record<string, unknown>;
	smart: Record<string, unknown>;

	// Library and workspace
	library: string[];
	libHasMore: boolean;
	persons: string[];
	clusters: unknown[];
	points: unknown[];
	diag: unknown | null;
	meta: unknown | null;

	// State flags
	needsHf: boolean;
	needsOAI: boolean;
	busy: string;
	note: string;
	isConnected: boolean;
	isOnline: boolean;
	showInfoOverlay: boolean;
	highContrast: boolean;
}

// Create the context with a default value
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
interface DataProviderProps {
	children: React.ReactNode;
	value: DataContextType;
}

export const DataProvider: React.FC<DataProviderProps> = ({
	children,
	value,
}) => {
	return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Hook to consume the context
export const useDataContext = (): DataContextType => {
	const context = useContext(DataContext);
	if (context === undefined) {
		throw new Error("useDataContext must be used within a DataProvider");
	}
	return context;
};

// Selector hooks for specific pieces of data
export const useDirectory = (): string | null => useDataContext().dir;
export const useEngine = (): string => useDataContext().engine;
export const useQuery = (): string => useDataContext().query;
export const useResults = (): SearchResult[] => useDataContext().results;
export const useLibrary = (): string[] => useDataContext().library;
export const useBusy = (): string => useDataContext().busy;
export const useNote = (): string => useDataContext().note;
export const useIsOnline = (): boolean => useDataContext().isOnline;
export const useShowInfoOverlay = (): boolean =>
	useDataContext().showInfoOverlay;
export const useHighContrast = (): boolean => useDataContext().highContrast;
export const useTagsMap = (): Record<string, string[]> =>
	useDataContext().tagsMap;
export const useAllTags = (): string[] => useDataContext().allTags;

export default DataContext;
