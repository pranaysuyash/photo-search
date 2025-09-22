/**
 * Custom hook for managing search operations and related state
 * Encapsulates search logic and related actions
 */
import { useCallback, useMemo } from "react";
import {
	apiBuildFast,
	apiSearch,
	apiSearchLike,
	apiSearchSimilar,
} from "@/api";
import { useToast } from "@/hooks/useToast";
import { usePhotoActions } from "@/stores/usePhotoStore";
import { useSettings } from "@/stores/useSettingsStore";
import { useUIActions } from "@/stores/useUIStore";
import { useWorkspace } from "@/stores/useWorkspaceStore";

interface UseSearchOperationsProps {
	dir: string | null;
	engine: string;
	needsHf: boolean;
	hfToken?: string;
	needsOAI: boolean;
	openaiKey?: string;
	selectedView: string;
	useFast: boolean;
	fastKind: string;
	searchText: string;
	enableDemoLibrary: boolean;
	topK?: number;
	favOnly?: boolean;
	tagFilter?: string;
	dateFrom?: string;
	dateTo?: string;
	place?: string;
	hasText?: boolean;
	camera?: string;
	isoMin?: number;
	isoMax?: number;
	fMin?: number;
	fMax?: number;
	ratingMin?: number;
	persons?: string[];
	useCaps?: boolean;
	useOcr?: boolean;
	wsToggle?: boolean;
	resultView?: string;
	timelineBucket?: string;
	ratingMap?: any;
	loadLibrary?: (
		limit?: number,
		offset?: number,
		append?: boolean,
	) => Promise<void>;
	loadFav?: () => Promise<void>;
	loadSaved?: () => Promise<void>;
	loadTags?: () => Promise<void>;
	loadDiag?: () => Promise<void>;
	libIndex?: number;
	setDir?: (dir: string) => void;
	setQuery?: (query: string) => void;
	setResults?: (results: unknown[]) => void;
	setSearchId?: (searchId: string) => void;
	setBusy?: (busy: string) => void;
	setNote?: (note: string) => void;
	completeOnboardingStep?: (step: any) => void;
}

export function useSearchOperations({
	dir,
	engine,
	needsHf,
	hfToken,
	needsOAI,
	openaiKey,
	selectedView,
	useFast,
	fastKind,
	searchText,
	enableDemoLibrary,
	topK,
	favOnly,
	tagFilter,
	dateFrom,
	dateTo,
	place,
	hasText,
	camera,
	isoMin,
	isoMax,
	fMin,
	fMax,
	ratingMin,
	persons,
	useCaps,
	useOcr,
	wsToggle,
	resultView,
	timelineBucket,
	ratingMap,
	loadLibrary,
	loadFav,
	loadSaved,
	loadTags,
	loadDiag,
	libIndex,
	setDir,
	setQuery,
	setResults,
	setSearchId,
	setBusy,
	setNote,
	completeOnboardingStep,
}: UseSearchOperationsProps) {
	const { photoActions } = usePhotoActions();
	const { settingsActions } = useSettings();
	const { uiActions } = useUIActions();
	const { workspaceActions } = useWorkspace();
	const { pushToast } = useToast();

	// Perform a text search
	const performSearch = useCallback(
		async (query: string, topK: number = 24) => {
			if (!dir) return;

			try {
				uiActions.setBusy("Searching...");

				const searchOpts = {
					favOnly: settingsActions.favOnly,
					tags: settingsActions.tagFilter
						? settingsActions.tagFilter.split(",").map((s) => s.trim())
						: undefined,
					dateFrom: settingsActions.dateFrom
						? Math.floor(new Date(settingsActions.dateFrom).getTime() / 1000)
						: undefined,
					dateTo: settingsActions.dateTo
						? Math.floor(new Date(settingsActions.dateTo).getTime() / 1000)
						: undefined,
					place: settingsActions.place || undefined,
					hasText: settingsActions.hasText,
					camera: settingsActions.camera || undefined,
					isoMin: settingsActions.isoMin || undefined,
					isoMax: settingsActions.isoMax || undefined,
					fMin: settingsActions.fMin || undefined,
					fMax: settingsActions.fMax || undefined,
					useFast,
					fastKind: useFast ? fastKind : undefined,
					useCaps: settingsActions.useCaps,
					useOcr: settingsActions.useOcr,
				};

				const r = await apiSearch(dir, query, engine, topK, {
					hfToken: needsHf ? hfToken : undefined,
					openaiKey: needsOAI ? openaiKey : undefined,
					...searchOpts,
				});

				photoActions.setResults(r.results || []);
				photoActions.setSearchId(r.search_id || "");
				uiActions.setNote(`Found ${r.results?.length || 0} results`);

				return r;
			} catch (error) {
				uiActions.setNote(
					error instanceof Error ? error.message : "Search failed",
				);
				throw error;
			} finally {
				uiActions.setBusy("");
			}
		},
		[
			dir,
			engine,
			needsHf,
			hfToken,
			needsOAI,
			openaiKey,
			useFast,
			fastKind,
			settingsActions,
			photoActions,
			uiActions,
		],
	);

	// Search similar to a selected photo
	const searchSimilar = useCallback(
		async (path: string, topK: number = 24) => {
			if (!dir) return;

			try {
				uiActions.setBusy("Finding similar...");

				const r = await apiSearchSimilar(dir, path, engine, topK, {
					hfToken: needsHf ? hfToken : undefined,
					openaiKey: needsOAI ? openaiKey : undefined,
					useFast,
					fastKind: useFast ? fastKind : undefined,
				});

				photoActions.setResults(r.results || []);
				photoActions.setSearchId(r.search_id || "");
				uiActions.setNote(`Found ${r.results?.length || 0} similar photos`);

				return r;
			} catch (error) {
				uiActions.setNote(
					error instanceof Error ? error.message : "Similar search failed",
				);
				throw error;
			} finally {
				uiActions.setBusy("");
			}
		},
		[
			dir,
			engine,
			needsHf,
			hfToken,
			needsOAI,
			openaiKey,
			useFast,
			fastKind,
			photoActions,
			uiActions,
		],
	);

	// Search using an example photo and text query
	const searchLike = useCallback(
		async (
			path: string,
			text?: string,
			weight: number = 0.5,
			topK: number = 24,
		) => {
			if (!dir) return;

			try {
				uiActions.setBusy("Searching with example...");

				const r = await apiSearchLike(dir, path, engine, topK, {
					hfToken: needsHf ? hfToken : undefined,
					openaiKey: needsOAI ? openaiKey : undefined,
					useFast,
					fastKind: useFast ? fastKind : undefined,
					text,
					weight,
				});

				photoActions.setResults(r.results || []);
				photoActions.setSearchId(r.search_id || "");
				uiActions.setNote(`Found ${r.results?.length || 0} matching photos`);

				return r;
			} catch (error) {
				uiActions.setNote(
					error instanceof Error ? error.message : "Example search failed",
				);
				throw error;
			} finally {
				uiActions.setBusy("");
			}
		},
		[
			dir,
			engine,
			needsHf,
			hfToken,
			needsOAI,
			openaiKey,
			useFast,
			fastKind,
			photoActions,
			uiActions,
		],
	);

	// Build fast index for faster searching
	const buildFastIndex = useCallback(
		async (kind: "annoy" | "faiss" | "hnsw" = "faiss") => {
			if (!dir) {
				pushToast({
					title: "Missing Library",
					description: "Select a library before building an index.",
				});
				return;
			}

			try {
				uiActions.setBusy("Building search index...");
				pushToast({
					title: "Building Index",
					description: `Creating ${kind.toUpperCase()} index for faster searches...`,
				});

				const r = await apiBuildFast(
					dir,
					kind,
					engine,
					needsHf ? hfToken : undefined,
					needsOAI ? openaiKey : undefined,
				);

				pushToast({
					title: "Index Ready",
					description: `${kind.toUpperCase()} index built successfully`,
				});
				uiActions.setNote(`${kind.toUpperCase()} index ready`);

				// Refresh diagnostics to show updated index status
				workspaceActions.refreshDiagnostics();
			} catch (error) {
				uiActions.setNote(
					error instanceof Error ? error.message : "Index build failed",
				);
				pushToast({
					variant: "destructive",
					title: "Index Build Failed",
					description: "Failed to build search index. Please try again.",
				});
			} finally {
				uiActions.setBusy("");
			}
		},
		[
			dir,
			engine,
			needsHf,
			hfToken,
			needsOAI,
			openaiKey,
			workspaceActions,
			uiActions,
			pushToast,
		],
	);

	// Search state
	const searchState = useMemo(
		() => ({
			isSearching: uiActions.busy !== "",
			hasQuery: Boolean(photoActions.query),
			hasResults: (photoActions.results || []).length > 0,
			canUseFastIndex: useFast && Boolean(fastKind),
		}),
		[
			uiActions.busy,
			photoActions.query,
			photoActions.results,
			useFast,
			fastKind,
		],
	);

	return {
		// Actions
		performSearch,
		searchSimilar,
		searchLike,
		buildFastIndex,
		doSearchImmediate: async (query: string) => {
			await performSearch(query);
		},

		// State
		searchState,

		// Utilities
		clearSearch: () => photoActions.setQuery(""),
		updateQuery: (query: string) => photoActions.setQuery(query),
	};
}
