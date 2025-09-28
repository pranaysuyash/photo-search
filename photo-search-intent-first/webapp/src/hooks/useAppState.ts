import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useJobsContext } from "../contexts/JobsContext";
import { useLibraryContext } from "../contexts/LibraryContext";
import type { ResultView } from "../contexts/ResultsConfigContext";
import {
	useAllTags,
	useAltSearch,
	useBusy,
	useCamera,
	useCaptionsEnabled,
	useClusters,
	useCollections,
	useDiag,
	useDir,
	useEngine,
	useFastIndexEnabled,
	useFastKind,
	useFavOnly,
	useFavorites,
	useFMax,
	useFMin,
	useHasText,
	useHfToken,
	useIsoMax,
	useIsoMin,
	useLibHasMore,
	useLibrary,
	useNeedsHf,
	useNeedsOAI,
	useNote,
	useOcrEnabled,
	useOpenaiKey,
	useOsTrashEnabled,
	usePersons,
	usePhotoActions,
	usePlace,
	usePoints,
	useSearchQuery,
	useSearchResults,
	useSettingsActions,
	useShowWelcome,
	useSmartCollections,
	useTagFilter,
	useTagsMap,
	useTopK,
	useUIActions,
	useWorkspaceActions,
	useWsToggle,
} from "../stores";

export interface GridSize {
	size: "small" | "medium" | "large";
	cols: number;
}

export interface ViewState {
	// Settings state
	dir: string;
	engine: string;
	hfToken: string;
	openaiKey: string;
	useFast: boolean;
	fastKind: string;
	useCaps: boolean;
	useOcr: boolean;
	useOsTrash: boolean;
	hasText: boolean;
	place: string;
	camera: string;
	isoMin: number;
	isoMax: number;
	fMin: number;
	fMax: number;

	// Photo state
	results: unknown[];
	query: string;
	fav: string[];
	favOnly: boolean;
	topK: number;
	tagFilter: string;
	allTags: string[];
	collections: Record<string, string[]>;
	smart: Record<string, unknown>;
	library: string[];
	libHasMore: boolean;
	tagsMap: Record<string, string[]>;
	needsHf: boolean;
	needsOAI: boolean;

	// UI state
	busy: string;
	note: string;
	showWelcome: boolean;

	// Workspace state
	persons: string[];
	clusters: unknown[];
	points: unknown[];
	diag: any;
	wsToggle: boolean;
}

export interface DerivedState {
	// Computed values from original App.tsx
	ratingMap: Record<string, number>;
	hasAnyFilters: boolean;
	items: { path: string; score?: number }[];
	indexCoverage?: number;
	altSearch: any;
	jobs: unknown[];
	libState: any;
}

export interface LocalUIState {
	searchText: string;
	selected: Set<string>;
	gridSize: "small" | "medium" | "large";
	resultView: ResultView;
	timelineBucket: "day" | "week" | "month";
	currentFilter: string;
	showFilters: boolean;
	dateFrom: string;
	dateTo: string;
	ratingMin: number;
}

export interface AppStateActions {
	setSearchText: (text: string) => void;
	setSelected: (selected: Set<string>) => void;
	setGridSize: (size: "small" | "medium" | "large") => void;
	setResultView: (view: ResultView) => void;
	setTimelineBucket: (bucket: "day" | "week" | "month") => void;
	setCurrentFilter: (filter: string) => void;
	setShowFilters: (show: boolean) => void;
	setDateFrom: (date: string) => void;
	setDateTo: (date: string) => void;
	setRatingMin: (rating: number) => void;
}

export function useAppState() {
	// Navigation
	const location = useLocation();
	const navigate = useNavigate();

	// Settings state
	const dir = useDir();
	const engine = useEngine();
	const hfToken = useHfToken();
	const openaiKey = useOpenaiKey();
	const useFast = useFastIndexEnabled();
	const fastKind = useFastKind();
	const useCaps = useCaptionsEnabled();
	const useOcr = useOcrEnabled();
	const useOsTrash = useOsTrashEnabled();
	const hasText = useHasText();
	const place = usePlace();
	const camera = useCamera();
	const isoMin = useIsoMin();
	const isoMax = useIsoMax();
	const fMin = useFMin();
	const fMax = useFMax();

	// Photo state
	const results = useSearchResults();
	const query = useSearchQuery();
	const fav = useFavorites();
	const favOnly = useFavOnly();
	const topK = useTopK();
	const tagFilter = useTagFilter();
	const allTags = useAllTags();
	const collections = useCollections();
	const smart = useSmartCollections();
	const library = useLibrary();
	const libHasMore = useLibHasMore();
	const tagsMap = useTagsMap();
	const needsHf = useNeedsHf();
	const needsOAI = useNeedsOAI();

	// UI state
	const busy = useBusy();
	const note = useNote();
	const showWelcome = useShowWelcome();

	// Workspace state
	const persons = usePersons();
	const clusters = useClusters();
	const points = usePoints();
	const diag = useDiag();
	const wsToggle = useWsToggle();

	// Additional state and contexts
	const altSearch = useAltSearch();
	const { state: libState } = useLibraryContext();
	const { state: jobsState } = useJobsContext();

	// Actions
	const settingsActions = useSettingsActions();
	const photoActions = usePhotoActions();
	const uiActions = useUIActions();
	const workspaceActions = useWorkspaceActions();

	// Local UI state
	const [searchText, setSearchText] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [gridSize, setGridSize] = useState<"small" | "medium" | "large">(
		"medium",
	);
	const [resultView, setResultView] = useState<ResultView>("grid");
	const [timelineBucket, setTimelineBucket] = useState<
		"day" | "week" | "month"
	>("day");
	const [currentFilter, setCurrentFilter] = useState("all");
	const [showFilters, setShowFilters] = useState(false);
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [ratingMin, setRatingMin] = useState(0);

	// Handlers for view settings
	const handleSetResultView = useCallback(
		(view: ResultView) => {
			setResultView(view);
			settingsActions.setResultView?.(
				view as "grid" | "film" | "timeline" | "map",
			);
		},
		[settingsActions],
	);

	const handleSetTimelineBucket = useCallback(
		(bucket: "day" | "week" | "month") => {
			setTimelineBucket(bucket);
			settingsActions.setTimelineBucket?.(bucket);
		},
		[settingsActions],
	);

	// Grid size options
	const gridSizeOptions = [
		{ size: "small" as const, cols: 6 },
		{ size: "medium" as const, cols: 4 },
		{ size: "large" as const, cols: 3 },
	];

	// Current view from route
	const currentView = (() => {
		const path = location.pathname;
		if (path === "/") return "search";
		if (path.startsWith("/collections")) return "collections";
		if (path.startsWith("/library")) return "library";
		if (path.startsWith("/people")) return "people";
		if (path.startsWith("/map")) return "map";
		if (path.startsWith("/trips")) return "trips";
		if (path.startsWith("/settings")) return "settings";
		if (path.startsWith("/workspace")) return "workspace";
		return "search";
	})();

	// Derived state calculations from original App.tsx
	const ratingMap = useMemo(() => {
		const m: Record<string, number> = {};
		const tm = tagsMap || {};
		for (const p of Object.keys(tm)) {
			const arr: string[] = tm[p] || [];
			const rt = arr.find((t) => /^rating:[1-5]$/.test(t));
			if (rt) m[p] = parseInt(rt.split(":")[1], 10);
		}
		return m;
	}, [tagsMap]);

	// Determine if unknown filters are active (for no-results empty state)
	const hasAnyFilters = useMemo(() => {
		const anyExif = Boolean(
			camera || isoMin || isoMax || fMin || fMax || place,
		);
		const anyDate = Boolean(dateFrom && dateTo);
		const anyPeople = Array.isArray(persons) && persons.length > 0;
		const anyTags = Boolean(tagFilter?.trim());
		const anyQuality = ratingMin > 0 || hasText;
		return Boolean(
			favOnly || anyExif || anyDate || anyPeople || anyTags || anyQuality,
		);
	}, [
		camera,
		isoMin,
		isoMax,
		fMin,
		fMax,
		place,
		dateFrom,
		dateTo,
		persons,
		tagFilter,
		ratingMin,
		hasText,
		favOnly,
	]);

	// Derived list to show: search results or library - memoized to prevent recreation
	const items: { path: string; score?: number }[] = useMemo(() => {
		return (library || []).map((p) => ({ path: p }));
	}, [library]);

	// Compute index coverage from diagnostics + library
	const indexCoverage = useMemo(() => {
		try {
			const count = diag?.engines?.[0]?.count || 0;
			const total = library?.length || 0;
			return total > 0 ? count / total : undefined;
		} catch {
			return undefined;
		}
	}, [diag, library?.length]);

	const derivedState: DerivedState = {
		ratingMap,
		hasAnyFilters,
		items,
		indexCoverage,
		altSearch,
		jobs: jobsState.jobs,
		libState,
	};

	const viewState: ViewState = {
		// Settings
		dir,
		engine,
		hfToken,
		openaiKey,
		useFast,
		fastKind,
		useCaps,
		useOcr,
		useOsTrash,
		hasText,
		place,
		camera,
		isoMin,
		isoMax,
		fMin,
		fMax,
		// Photo
		results,
		query,
		fav,
		favOnly,
		topK,
		tagFilter,
		allTags,
		collections,
		smart,
		library,
		libHasMore,
		tagsMap,
		needsHf,
		needsOAI,
		// UI
		busy,
		note,
		showWelcome,
		// Workspace
		persons,
		clusters,
		points,
		diag,
		wsToggle,
	};

	const localState: LocalUIState = {
		searchText,
		selected,
		gridSize,
		resultView,
		timelineBucket,
		currentFilter,
		showFilters,
		dateFrom,
		dateTo,
		ratingMin,
	};

	const actions: AppStateActions = {
		setSearchText,
		setSelected,
		setGridSize,
		setResultView: handleSetResultView,
		setTimelineBucket: handleSetTimelineBucket,
		setCurrentFilter,
		setShowFilters,
		setDateFrom,
		setDateTo,
		setRatingMin,
	};

	const stateActions = {
		settingsActions,
		photoActions,
		uiActions,
		workspaceActions,
	};

	return {
		// State
		viewState,
		localState,
		derivedState,

		// Actions
		actions,
		stateActions,

		// Navigation
		location,
		navigate,
		currentView,

		// Derived data
		gridSizeOptions,

		// Utilities
		hasSearchResults: results.length > 0,
		hasSelection: selected.size > 0,
		isLoading: busy.length > 0,
	};
}
