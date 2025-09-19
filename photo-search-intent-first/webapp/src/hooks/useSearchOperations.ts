import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
	apiDemoDir,
	apiSearch,
	apiSearchCached,
	apiSearchWorkspace,
	apiWorkspaceAdd,
	type SearchResult,
} from "../api";
import { announce } from "../utils/accessibility";
import { handleError } from "../utils/errors";
import { monitoringService } from "../services/MonitoringService";
import { SearchCache } from "../services/SearchCache";

export interface SearchOperationsOptions {
	searchText: string;
	enableDemoLibrary: boolean;
	dir: string | null;
	engine: string;
	topK: number;
	favOnly: boolean;
	tagFilter: string;
	dateFrom: string;
	dateTo: string;
	place: string;
	hasText: boolean;
	camera: string;
	isoMin: number;
	isoMax: number;
	fMin: number;
	fMax: number;
	ratingMin: number;
	persons: string[];
	useFast: boolean;
	fastKind: string;
	useCaps: boolean;
	useOcr: boolean;
	wsToggle: boolean;
	needsHf: boolean;
	hfToken: string;
	needsOAI: boolean;
	openaiKey: string;
	resultView: string;
	timelineBucket: string;
	ratingMap: Record<string, number>;
	loadLibrary: (limit?: number, offset?: number, append?: boolean) => Promise<void>;
	loadFav: () => Promise<void>;
	loadSaved: () => Promise<void>;
	loadTags: () => Promise<void>;
	loadDiag: () => Promise<void>;
	libIndex: (opts?: { dir?: string; provider?: string }) => Promise<void>;
	setDir: (dir: string) => void;
	setQuery: (query: string) => void;
	setResults: (results: SearchResult[]) => void;
	setSearchId: (id: string) => void;
	setBusy: (value: string) => void;
	setNote: (value: string) => void;
	completeOnboardingStep: (id: string) => void;
}

export function useSearchOperations(options: SearchOperationsOptions) {
	const navigate = useNavigate();

	const {
		searchText,
		enableDemoLibrary,
		dir,
		engine,
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
		useFast,
		fastKind,
		useCaps,
		useOcr,
		wsToggle,
		needsHf,
		hfToken,
		needsOAI,
		openaiKey,
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
	} = options;

	const doSearchImmediate = useCallback(
		async (text?: string) => {

			const q = (text ?? searchText ?? "").trim();
			if (!q) return;

			if (!dir && enableDemoLibrary) {
				try {
					const demoPath = await apiDemoDir();
					if (!demoPath) {
						setNote("Demo library not available.");
						return;
					}
					setDir(demoPath);
					setNote("Loading demo library… indexing will run once.");
					try {
						await apiWorkspaceAdd(demoPath);
					} catch {}
					await libIndex({ dir: demoPath, provider: engine });
					await loadLibrary(120, 0);
				} catch {}
			}

			setQuery(q);

			try {
				const sp = new URLSearchParams();
				sp.set("q", q);
				if (favOnly) sp.set("fav", "1");
				if (tagFilter?.trim()) sp.set("tags", tagFilter);
				if (dateFrom && dateTo) {
					sp.set("date_from", dateFrom);
					sp.set("date_to", dateTo);
				}
				if (place?.trim()) sp.set("place", place);
				if (hasText) sp.set("has_text", "1");
				if (camera?.trim()) sp.set("camera", camera);
				if (isoMin) sp.set("iso_min", String(isoMin));
				if (isoMax) sp.set("iso_max", String(isoMax));
				if (fMin) sp.set("f_min", String(fMin));
				if (fMax) sp.set("f_max", String(fMax));
				if (ratingMin > 0) sp.set("rating_min", String(ratingMin));
				const ppl = persons.filter(Boolean);
				if (ppl.length === 1) sp.set("person", ppl[0]);
				if (ppl.length > 1) sp.set("persons", ppl.join(","));
				if (useFast) sp.set("fast", "1");
				if (fastKind) sp.set("fast_kind", fastKind);
				if (useCaps) sp.set("caps", "1");
				if (useOcr) sp.set("ocr", "1");
				if (resultView) sp.set("rv", resultView);
				if (timelineBucket) sp.set("tb", timelineBucket);
				navigate(
					{ pathname: "/search", search: `?${sp.toString()}` },
					{ replace: false },
				);
			} catch {}

			setBusy("Searching…");
			setNote("");

			try {
				const tagList = tagFilter
					.split(",")
					.map((s: string) => s.trim())
					.filter(Boolean);
				const ppl = persons.filter(Boolean);

				const cacheKey = JSON.stringify({
					dir,
					q,
					engine,
					topK,
					favOnly,
					tagList,
					dateFrom,
					dateTo,
					place,
					hasText,
					camera,
					isoMin,
					isoMax,
					fMin,
					fMax,
					persons: ppl,
					useFast,
					fastKind,
					useCaps,
					useOcr,
					wsToggle,
				});

				const searchFn = async (): Promise<{
					results?: SearchResult[];
					search_id?: string;
				}> => {
					if (wsToggle) {
						return await apiSearchWorkspace(dir, q, engine, topK, {
							favoritesOnly: favOnly,
							tags: tagList,
							dateFrom: dateFrom
								? Math.floor(new Date(dateFrom).getTime() / 1000)
								: undefined,
							dateTo: dateTo
								? Math.floor(new Date(dateTo).getTime() / 1000)
								: undefined,
							place: place || undefined,
							hasText,
							...(ppl.length === 1
								? { person: ppl[0] }
								: ppl.length > 1
									? { persons: ppl }
									: {}),
						});
					}

					try {
						return await apiSearchCached(dir, q, engine, topK, undefined, {
							hfToken: needsHf ? hfToken : undefined,
							openaiKey: needsOAI ? openaiKey : undefined,
							useFast,
							fastKind: fastKind || undefined,
							useCaptions: useCaps,
							useOcr,
						});
					} catch (_cachedError) {
						return await apiSearch(dir, q, engine, topK, {
							hfToken: needsHf ? hfToken : undefined,
							openaiKey: needsOAI ? openaiKey : undefined,
							favoritesOnly: favOnly,
							tags: tagList,
							dateFrom: dateFrom
								? Math.floor(new Date(dateFrom).getTime() / 1000)
								: undefined,
							dateTo: dateTo
								? Math.floor(new Date(dateTo).getTime() / 1000)
								: undefined,
							...(useFast
								? { useFast: true, fastKind: fastKind || undefined }
								: {}),
							useCaptions: useCaps,
							useOcr,
							camera: camera || undefined,
							isoMin: isoMin || undefined,
							isoMax: isoMax || undefined,
							fMin: fMin || undefined,
							fMax: fMax || undefined,
							place: place || undefined,
							hasText: hasText || undefined,
							...(ppl.length === 1
								? { person: ppl[0] }
								: ppl.length > 1
									? { persons: ppl }
									: {}),
						});
					}
				};

				const { data: response, cached, responseTime } = await SearchCache.cachedSearch(
					cacheKey,
					searchFn,
				);

				monitoringService.trackSearch(q, response.results?.length || 0, responseTime);

				let res = response.results || [];
				if (ratingMin > 0) {
					res = res.filter((item) => (ratingMap[item.path] || 0) >= ratingMin);
				}
				setResults(res);
				announce(
					`Found ${res.length} ${res.length === 1 ? "result" : "results"} for "${q}"${
						cached ? " (cached)" : ""
					}`,
					res.length === 0 ? "assertive" : "polite",
				);
				setSearchId(response.search_id || "");

				const cacheStatus = cached ? " (cached)" : "";
				setNote(`Found ${response.results?.length || 0} results${cacheStatus}.`);

				await Promise.all([loadFav(), loadSaved(), loadTags(), loadDiag()]);
				completeOnboardingStep("first_search");
			} catch (error) {
				setNote(error instanceof Error ? error.message : "Search failed");
				handleError(error, {
					logToConsole: true,
					logToServer: true,
					context: {
						action: "search",
						component: "useSearchOperations.doSearchImmediate",
						dir,
					},
				});
			} finally {
				setBusy("");
			}
		}, [
			searchText,
			enableDemoLibrary,
			dir,
			engine,
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
			useFast,
			fastKind,
			useCaps,
			useOcr,
			wsToggle,
			needsHf,
			hfToken,
			needsOAI,
			openaiKey,
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
			navigate,
		]);

	return { doSearchImmediate };
}
