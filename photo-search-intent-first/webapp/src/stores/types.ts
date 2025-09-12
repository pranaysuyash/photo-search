import type { SearchResult } from "../api";

// Core search and photo state
export interface PhotoState {
	results: SearchResult[];
	searchId: string;
	query: string;
	topK: number;
	fav: string[];
	favOnly: boolean;
	tags: {
		allTags: string[];
		tagsMap: Record<string, string[]>;
		tagFilter: string;
	};
	saved: Array<{ name: string; query: string; top_k?: number }>;
	collections: Record<string, string[]>;
	smart: Record<string, any>;
	library: string[];
	libHasMore: boolean;
}

export interface PhotoActions {
	setResults: (results: SearchResult[]) => void;
	setSearchId: (id: string) => void;
	setQuery: (query: string) => void;
	setTopK: (topK: number) => void;
	setFavorites: (fav: string[]) => void;
	setFavOnly: (favOnly: boolean) => void;
	setAllTags: (tags: string[]) => void;
	setTagsMap: (map: Record<string, string[]>) => void;
	setTagFilter: (filter: string) => void;
	setSaved: (
		saved: Array<{ name: string; query: string; top_k?: number }>,
	) => void;
	setCollections: (collections: Record<string, string[]>) => void;
	setSmart: (smart: Record<string, any>) => void;
	setLibrary: (library: string[]) => void;
	setLibHasMore: (hasMore: boolean) => void;
	appendLibrary: (paths: string[]) => void;
	resetSearch: () => void;
}

// UI state for modals, loading, view modes
export interface UIState {
	busy: string;
	note: string;
	viewMode: "grid" | "film";
	showWelcome: boolean;
	showHelp: boolean;
}

export interface UIActions {
	setBusy: (message: string) => void;
	setNote: (note: string) => void;
	setViewMode: (mode: "grid" | "film") => void;
	setShowWelcome: (show: boolean) => void;
	setShowHelp: (show: boolean) => void;
	clearBusy: () => void;
}

// Settings and configuration
export interface SettingsState {
	dir: string;
	engine: string;
	hfToken: string;
	openaiKey: string;
	useFast: boolean;
	fastKind: "" | "annoy" | "faiss" | "hnsw";
	useCaps: boolean;
	vlmModel: string;
	useOcr: boolean;
	hasText: boolean;
	useOsTrash: boolean;
	showExplain?: boolean;
	showInfoOverlay?: boolean;
	highContrast: boolean;
	searchCommandCenter?: boolean;

	// EXIF filters
	camera: string;
	isoMin: string;
	isoMax: string;
	fMin: string;
	fMax: string;
	place: string;
	resultView?: "grid" | "film" | "timeline";
	timelineBucket?: "day" | "week" | "month";
}

export interface SettingsActions {
	setDir: (dir: string) => void;
	setEngine: (engine: string) => void;
	setHfToken: (token: string) => void;
	setOpenaiKey: (key: string) => void;
	setUseFast: (useFast: boolean) => void;
	setFastKind: (kind: "" | "annoy" | "faiss" | "hnsw") => void;
	setUseCaps: (useCaps: boolean) => void;
	setVlmModel: (model: string) => void;
	setUseOcr: (useOcr: boolean) => void;
	setHasText: (hasText: boolean) => void;
	setUseOsTrash: (useOsTrash: boolean) => void;
	setShowExplain?: (show: boolean) => void;
	setShowInfoOverlay?: (show: boolean) => void;
	setSearchCommandCenter?: (searchCommandCenter: boolean) => void;
	setCamera: (camera: string) => void;
	setIsoMin: (iso: string) => void;
	setIsoMax: (iso: string) => void;
	setFMin: (f: string) => void;
	setFMax: (f: string) => void;
	setPlace: (place: string) => void;
	setResultView?: (view: "grid" | "film" | "timeline") => void;
	setTimelineBucket?: (b: "day" | "week" | "month") => void;
	setHighContrast?: (highContrast: boolean) => void;
}

// Workspace, people, and system data
export interface WorkspaceState {
	workspace: string[];
	wsToggle: boolean;
	persons: string[];
	clusters: Array<{
		id: string;
		name?: string;
		size: number;
		examples: [string, number][];
	}>;
	groups: Array<{
		id: string;
		paths: string[];
		resolved: boolean;
	}>;
	points: Array<{ lat: number; lon: number }>;
	diag: {
		folder: string;
		engines: Array<{
			key: string;
			index_dir: string;
			count: number;
			fast?: { annoy: boolean; faiss: boolean; hnsw: boolean };
		}>;
		free_gb: number;
		os: string;
	} | null;
}

export interface WorkspaceActions {
	setWorkspace: (workspace: string[]) => void;
	setWsToggle: (toggle: boolean) => void;
	setPersons: (persons: string[]) => void;
	addPerson: (person: string) => void;
	removePerson: (person: string) => void;
	setClusters: (clusters: WorkspaceState["clusters"]) => void;
	setGroups: (groups: WorkspaceState["groups"]) => void;
	setPoints: (points: Array<{ lat: number; lon: number }>) => void;
	setDiag: (diag: WorkspaceState["diag"]) => void;
}
