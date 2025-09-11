import React, { createContext, useCallback, useContext, useState } from "react";

// Simple state management to replace Zustand and eliminate infinite loops
interface SimpleSettings {
	dir: string;
	engine: string;
	hfToken: string;
	openaiKey: string;
	useFast: boolean;
	fastKind: string;
	useCaps: boolean;
	vlmModel: string;
	useOcr: boolean;
	hasText: boolean;
	useOsTrash: boolean;
	camera: string;
	isoMin: number;
	isoMax: number;
	fMin: number;
	fMax: number;
	place: string;
	showInfoOverlay: boolean;
	resultView: "grid" | "film" | "timeline";
	timelineBucket: "day" | "week" | "month";
	includeVideos: boolean;
}

interface SimplePhoto {
	results: any[];
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
	saved: any[];
	collections: Record<string, string[]>;
	smart: Record<string, any>;
	library: string[];
	libHasMore: boolean;
}

interface SimpleUI {
	busy: string;
	note: string;
	viewMode: "grid" | "film";
	showWelcome: boolean;
	showHelp: boolean;
}

interface SimpleWorkspace {
	workspace: string;
	wsToggle: boolean;
	persons: any[];
	clusters: any[];
	groups: any[];
	points: any[];
	diag: any;
}

interface SimpleStore {
	settings: SimpleSettings;
	photo: SimplePhoto;
	ui: SimpleUI;
	workspace: SimpleWorkspace;
}

const initialState: SimpleStore = {
	settings: {
		dir: "",
		engine: "local",
		hfToken: "",
		openaiKey: "",
		useFast: false,
		fastKind: "faiss",
		useCaps: false,
		vlmModel: "gpt-4o",
		useOcr: false,
		hasText: false,
		useOsTrash: false,
		camera: "",
		isoMin: 0,
		isoMax: 25600,
		fMin: 0.7,
		fMax: 32,
		place: "",
		showInfoOverlay: false,
		resultView: "grid",
		timelineBucket: "day",
		includeVideos: true,
	},
	photo: {
		results: [],
		searchId: "",
		query: "",
		topK: 24,
		fav: [],
		favOnly: false,
		tags: { allTags: [], tagsMap: {}, tagFilter: "" },
		saved: [],
		collections: {},
		smart: {},
		library: [],
		libHasMore: true,
	},
	ui: {
		busy: "",
		note: "",
		viewMode: "grid",
		showWelcome: false,
		showHelp: false,
	},
	workspace: {
		workspace: "",
		wsToggle: false,
		persons: [],
		clusters: [],
		groups: [],
		points: [],
		diag: null,
	},
};

const SimpleStoreContext = createContext<{
	state: SimpleStore;
	setSettings: (settings: Partial<SimpleSettings>) => void;
	setPhoto: (
		photo: Partial<SimplePhoto> | ((prev: SimpleStore) => Partial<SimplePhoto>),
	) => void;
	setUI: (ui: Partial<SimpleUI>) => void;
	setWorkspace: (workspace: Partial<SimpleWorkspace>) => void;
} | null>(null);

export const SimpleStoreProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [state, setState] = useState<SimpleStore>(initialState);

	const setSettings = useCallback((settings: Partial<SimpleSettings>) => {
		setState((prev) => ({
			...prev,
			settings: { ...prev.settings, ...settings },
		}));
	}, []);

	const setPhoto = useCallback(
		(
			photo:
				| Partial<SimplePhoto>
				| ((prev: SimpleStore) => Partial<SimplePhoto>),
		) => {
			setState((prev) => ({
				...prev,
				photo: {
					...prev.photo,
					...(typeof photo === "function" ? photo(prev) : photo),
				},
			}));
		},
		[],
	);

	const setUI = useCallback((ui: Partial<SimpleUI>) => {
		setState((prev) => ({ ...prev, ui: { ...prev.ui, ...ui } }));
	}, []);

	const setWorkspace = useCallback((workspace: Partial<SimpleWorkspace>) => {
		setState((prev) => ({
			...prev,
			workspace: { ...prev.workspace, ...workspace },
		}));
	}, []);

	return (
		<SimpleStoreContext.Provider
			value={{ state, setSettings, setPhoto, setUI, setWorkspace }}
		>
			{children}
		</SimpleStoreContext.Provider>
	);
};

export const useSimpleStore = () => {
	const context = useContext(SimpleStoreContext);
	if (!context)
		throw new Error("useSimpleStore must be used within SimpleStoreProvider");
	return context;
};

// Individual selector hooks to replace Zustand selectors
export const useDir = () => useSimpleStore().state.settings.dir;
export const useEngine = () => useSimpleStore().state.settings.engine;
export const useHfToken = () => useSimpleStore().state.settings.hfToken;
export const useOpenaiKey = () => useSimpleStore().state.settings.openaiKey;
export const useNeedsHf = () =>
	useSimpleStore().state.settings.engine.startsWith("hf");
export const useNeedsOAI = () =>
	useSimpleStore().state.settings.engine === "openai";
export const useCamera = () => useSimpleStore().state.settings.camera;
export const useIsoMin = () => useSimpleStore().state.settings.isoMin;
export const useIsoMax = () => useSimpleStore().state.settings.isoMax;
export const useFMin = () => useSimpleStore().state.settings.fMin;
export const useFMax = () => useSimpleStore().state.settings.fMax;
export const usePlace = () => useSimpleStore().state.settings.place;
export const useShowInfoOverlay = () =>
	useSimpleStore().state.settings.showInfoOverlay;
export const useResultViewSetting = () =>
	useSimpleStore().state.settings.resultView;
export const useTimelineBucketSetting = () =>
	useSimpleStore().state.settings.timelineBucket;
export const useIncludeVideosSetting = () =>
	useSimpleStore().state.settings.includeVideos;
export const useCaptionsEnabled = () => useSimpleStore().state.settings.useCaps;
export const useOcrEnabled = () => useSimpleStore().state.settings.useOcr;
export const useHasText = () => useSimpleStore().state.settings.hasText;
export const useFastIndexEnabled = () =>
	useSimpleStore().state.settings.useFast;
export const useFastKind = () => useSimpleStore().state.settings.fastKind;
export const useOsTrashEnabled = () =>
	useSimpleStore().state.settings.useOsTrash;

export const useSearchResults = () => useSimpleStore().state.photo.results;
export const useSearchId = () => useSimpleStore().state.photo.searchId;
export const useSearchQuery = () => useSimpleStore().state.photo.query;
export const useTopK = () => useSimpleStore().state.photo.topK;
export const useFavorites = () => useSimpleStore().state.photo.fav;
export const useFavOnly = () => useSimpleStore().state.photo.favOnly;
export const useTagFilter = () => useSimpleStore().state.photo.tags.tagFilter;
export const useAllTags = () => useSimpleStore().state.photo.tags.allTags;
export const useTagsMap = () => useSimpleStore().state.photo.tags.tagsMap;
export const useSavedSearches = () => useSimpleStore().state.photo.saved;
export const useCollections = () => useSimpleStore().state.photo.collections;
export const useSmartCollections = () => useSimpleStore().state.photo.smart;
export const useLibrary = () => useSimpleStore().state.photo.library;
export const useLibHasMore = () => useSimpleStore().state.photo.libHasMore;

export const useBusy = () => useSimpleStore().state.ui.busy;
export const useNote = () => useSimpleStore().state.ui.note;
export const useViewMode = () => useSimpleStore().state.ui.viewMode;
export const useShowWelcome = () => useSimpleStore().state.ui.showWelcome;
export const useShowHelp = () => useSimpleStore().state.ui.showHelp;

export const useWorkspace = () => useSimpleStore().state.workspace.workspace;
export const useWsToggle = () => useSimpleStore().state.workspace.wsToggle;
export const usePersons = () => useSimpleStore().state.workspace.persons;
export const useClusters = () => useSimpleStore().state.workspace.clusters;
export const useGroups = () => useSimpleStore().state.workspace.groups;
export const usePoints = () => useSimpleStore().state.workspace.points;
export const useDiag = () => useSimpleStore().state.workspace.diag;

// Action hooks
export const useSettingsActions = () => {
	const { setSettings } = useSimpleStore();
	return React.useMemo(
		() => ({
			setDir: (dir: string) => setSettings({ dir }),
			setEngine: (engine: string) => setSettings({ engine }),
			setHfToken: (hfToken: string) => setSettings({ hfToken }),
			setOpenaiKey: (openaiKey: string) => setSettings({ openaiKey }),
			setUseFast: (useFast: boolean) => setSettings({ useFast }),
			setFastKind: (fastKind: string) => setSettings({ fastKind }),
			setUseCaps: (useCaps: boolean) => setSettings({ useCaps }),
			setVlmModel: (vlmModel: string) => setSettings({ vlmModel }),
			setUseOcr: (useOcr: boolean) => setSettings({ useOcr }),
			setHasText: (hasText: boolean) => setSettings({ hasText }),
			setUseOsTrash: (useOsTrash: boolean) => setSettings({ useOsTrash }),
			setCamera: (camera: string) => setSettings({ camera }),
			setIsoMin: (isoMin: number) => setSettings({ isoMin }),
			setIsoMax: (isoMax: number) => setSettings({ isoMax }),
			setFMin: (fMin: number) => setSettings({ fMin }),
			setFMax: (fMax: number) => setSettings({ fMax }),
			setPlace: (place: string) => setSettings({ place }),
			setShowInfoOverlay: (showInfoOverlay: boolean) =>
				setSettings({ showInfoOverlay }),
			setResultView: (resultView: "grid" | "film" | "timeline") =>
				setSettings({ resultView }),
			setTimelineBucket: (timelineBucket: "day" | "week" | "month") =>
				setSettings({ timelineBucket }),
			setIncludeVideos: (includeVideos: boolean) =>
				setSettings({ includeVideos }),
		}),
		[setSettings],
	);
};

export const usePhotoActions = () => {
	const { setPhoto } = useSimpleStore();
	return React.useMemo(
		() => ({
			setResults: (results: any[]) => setPhoto({ results }),
			setSearchId: (searchId: string) => setPhoto({ searchId }),
			setQuery: (query: string) => setPhoto({ query }),
			setTopK: (topK: number) => setPhoto({ topK }),
			setFavorites: (fav: string[]) => setPhoto({ fav }),
			setFavOnly: (favOnly: boolean) => setPhoto({ favOnly }),
			setAllTags: (allTags: string[]) =>
				setPhoto((prev: SimpleStore) => ({
					tags: { ...prev.photo.tags, allTags },
				})),
			setTagsMap: (tagsMap: Record<string, string[]>) =>
				setPhoto((prev: SimpleStore) => ({
					tags: { ...prev.photo.tags, tagsMap },
				})),
			setTagFilter: (tagFilter: string) =>
				setPhoto((prev: SimpleStore) => ({
					tags: { ...prev.photo.tags, tagFilter },
				})),
			setSaved: (saved: any[]) => setPhoto({ saved }),
			setCollections: (collections: Record<string, string[]>) =>
				setPhoto({ collections }),
			setSmart: (smart: Record<string, any>) => setPhoto({ smart }),
			setLibrary: (library: string[]) => setPhoto({ library }),
			setLibHasMore: (libHasMore: boolean) => setPhoto({ libHasMore }),
			appendLibrary: (paths: string[]) =>
				setPhoto((prev: SimpleStore) => ({
					library: [...prev.photo.library, ...paths],
				})),
			resetSearch: () => setPhoto({ results: [], searchId: "", query: "" }),
		}),
		[setPhoto],
	);
};

export const useUIActions = () => {
	const { setUI } = useSimpleStore();
	return React.useMemo(
		() => ({
			setBusy: (busy: string) => setUI({ busy }),
			setNote: (note: string) => setUI({ note }),
			setViewMode: (viewMode: "grid" | "film") => setUI({ viewMode }),
			setShowWelcome: (showWelcome: boolean) => setUI({ showWelcome }),
			setShowHelp: (showHelp: boolean) => setUI({ showHelp }),
		}),
		[setUI],
	);
};

export const useWorkspaceActions = () => {
	const { setWorkspace } = useSimpleStore();
	return React.useMemo(
		() => ({
			setWorkspace: (workspace: string) => setWorkspace({ workspace }),
			setWsToggle: (wsToggle: boolean) => setWorkspace({ wsToggle }),
			setPersons: (persons: any[]) => setWorkspace({ persons }),
			setClusters: (clusters: any[]) => setWorkspace({ clusters }),
			setGroups: (groups: any[]) => setWorkspace({ groups }),
			setPoints: (points: any[]) => setWorkspace({ points }),
			setDiag: (diag: any) => setWorkspace({ diag }),
		}),
		[setWorkspace],
	);
};
