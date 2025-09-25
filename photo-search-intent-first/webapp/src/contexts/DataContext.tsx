/**
 * DataContext - Provides commonly used data to reduce prop drilling
 * This context consolidates data that's frequently accessed across components
 * to reduce the number of props passed down through the component tree.
 */
import type React from "react";
import { createContext, useContext } from "react";
import type { SearchResult } from "../api";
import type { Job } from "../components/JobsCenter";
import type { LibraryState } from "../contexts/LibraryContext";

// Define the shape of our data context
interface DataContextType {
	// Directory and configuration
	dir: string | undefined;
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
	clusters: Array<{ name?: string }>;
	points: Array<{ lat: number; lon: number }>;
	diag: {
		engines?: Array<{
			key: string;
			count?: number;
			fast?: {
				annoy?: boolean;
				faiss?: boolean;
				hnsw?: boolean;
			};
		}>;
	} | null;
	meta: { cameras: string[]; places?: string[] };

	// State flags
	needsHf: boolean;
	needsOAI: boolean;
	busy: string;
	note: string;
	isConnected: boolean;
	showInfoOverlay: boolean;
	highContrast: boolean;

	// Additional data fields
	fav: string[];
	ocrReady: boolean;
	ocrTextCount?: number;
	presets: { name: string; query: string }[];
	altSearch:
		| { active: boolean; applied: string; original: string }
		| null
		| undefined;
	ratingMap: Record<string, number>;
	jobs: Job[];
	libState: LibraryState;
	items: { path: string; score?: number }[];
	hasAnyFilters: boolean;
	indexCoverage?: number;
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
export const useDirectory = (): string | undefined => useDataContext().dir;
export const useEngine = (): string => useDataContext().engine;
export const useQuery = (): string => useDataContext().query;
export const useResults = (): SearchResult[] => useDataContext().results;
export const useLibrary = (): string[] => useDataContext().library;
export const useBusy = (): string => useDataContext().busy;
export const useNote = (): string => useDataContext().note;
export const useShowInfoOverlay = (): boolean =>
	useDataContext().showInfoOverlay;
export const useHighContrast = (): boolean => useDataContext().highContrast;
export const useTagsMap = (): Record<string, string[]> =>
	useDataContext().tagsMap;
export const useAllTags = (): string[] => useDataContext().allTags;
export const useFav = (): string[] => useDataContext().fav;
export const useOcrReady = (): boolean => useDataContext().ocrReady;
export const useOcrTextCount = (): number | undefined =>
	useDataContext().ocrTextCount;
export const usePresets = (): { name: string; query: string }[] =>
	useDataContext().presets;
export const useAltSearch = (): unknown => useDataContext().altSearch;
export const useRatingMap = (): Record<string, number> =>
	useDataContext().ratingMap;
export const useJobs = (): Job[] => useDataContext().jobs;
export const useLibState = (): LibraryState => useDataContext().libState;
export const useItems = (): { path: string; score?: number }[] =>
	useDataContext().items;
export const useHasAnyFilters = (): boolean => useDataContext().hasAnyFilters;
export const useIndexCoverage = (): number | undefined =>
	useDataContext().indexCoverage;

export default DataContext;
