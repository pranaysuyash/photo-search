import { useCallback, useMemo } from "react";
import { apiOpen, apiSearchLike, apiSetFavorite, thumbUrl } from "../api";
import type { ErrorHandlerOptions } from "../utils/errors";
import { _withErrorHandling, networkErrors } from "../utils/errors";

export interface SearchLogicOptions {
	dir: string;
	engine: string;
	topK: number;
	uiActions: {
		setBusy: (message: string) => void;
		setNote: (message: string) => void;
	};
	photoActions: {
		setResults: (results: unknown[]) => void;
		setSearchId: (id: string) => void;
		setTopK: (k: number) => void;
		setFavOnly: (favOnly: boolean) => void;
		setTagFilter: (tagFilter: string) => void;
	};
	settingsActions: {
		setPlace: (place: string) => void;
		setCamera: (camera: string) => void;
		setIsoMin: (iso: number) => void;
		setIsoMax: (iso: number) => void;
		setFMin: (f: number) => void;
		setFMax: (f: number) => void;
		setHasText: (hasText: boolean) => void;
		setUseCaps: (useCaps: boolean) => void;
		setUseOcr: (useOcr: boolean) => void;
		setResultView: (view: "grid" | "film" | "timeline") => void;
		setTimelineBucket: (bucket: "day" | "week" | "month") => void;
		setShowInfoOverlay: (show: boolean) => void;
	};
	workspaceActions: {
		setPersons: (persons: string[]) => void;
	};
	fav: string[];
	loadFav: () => Promise<void>;
}

export const useSearchLogic = (_options: SearchLogicOptions) => {
	const {
		dir,
		engine,
		topK,
		uiActions,
		photoActions,
		settingsActions,
		workspaceActions,
		fav,
		loadFav,
	} = _options;

	const defaultErrorOptions: ErrorHandlerOptions = {
		showToast: false,
		logToConsole: true,
		context: {
			component: "useSearchLogic",
		},
	};

	const searchLikeThis = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (_path: string) => {
				if (!dir || !_path) return;

				if (networkErrors.isOffline()) {
					uiActions.setNote("Cannot search: No internet connection");
					return;
				}

				await _withErrorHandling(
					async () => {
						uiActions.setBusy("Searching similar…");
						const r = await apiSearchLike(dir, _path, engine, topK);
						photoActions.setResults(r.results || []);
						return r.results || [];
					},
					{
						...defaultErrorOptions,
						context: {
							...defaultErrorOptions.context,
							action: "searchLikeThis",
							metadata: { path: _path, engine, topK },
						},
						fallbackMessage: "Similarity search failed",
					},
				).finally(() => {
					uiActions.setBusy("");
				});
			},
			[dir, engine, topK, uiActions, photoActions],
		);

	const toggleFavorite = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (_path: string) => {
				if (!dir || !_path) return;

				await _withErrorHandling(
					async () => {
						await apiSetFavorite(dir, _path, !fav.includes(_path));
						await loadFav();
					},
					{
						...defaultErrorOptions,
						context: {
							...defaultErrorOptions.context,
							action: "toggleFavorite",
							metadata: { path: _path },
						},
						fallbackMessage: "Failed to update favorite",
					},
				);
			},
			[dir, fav, loadFav],
		);

	const revealPhoto = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (_path: string) => {
				if (!dir || !_path) return;

				await _withErrorHandling(
					async () => {
						await apiOpen(dir, _path);
					},
					{
						...defaultErrorOptions,
						context: {
							...defaultErrorOptions.context,
							action: "revealPhoto",
							metadata: { path: _path },
						},
						fallbackMessage: "Failed to open photo location",
					},
				);
			},
			[dir],
		);

	const buildSearchUrl = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback((searchText: string, filters: any = {}) => {
			const sp = new URLSearchParams();

			if (searchText?.trim()) {
				sp.set("q", searchText.trim());
			}

			// Apply filters
			if (filters.favOnly) sp.set("fav", "1");
			if (filters.tagFilter?.trim()) sp.set("tags", filters.tagFilter);
			if (filters.dateFrom) sp.set("date_from", filters.dateFrom);
			if (filters.dateTo) sp.set("date_to", filters.dateTo);
			if (filters.place?.trim()) sp.set("place", filters.place);
			if (filters.hasText) sp.set("has_text", "1");
			if (filters.camera?.trim()) sp.set("camera", filters.camera);
			if (filters.isoMin) sp.set("iso_min", String(filters.isoMin));
			if (filters.isoMax) sp.set("iso_max", String(filters.isoMax));
			if (filters.fMin) sp.set("f_min", String(filters.fMin));
			if (filters.fMax) sp.set("f_max", String(filters.fMax));

			const persons = filters.persons?.filter(Boolean) || [];
			if (persons.length === 1) sp.set("person", persons[0]);
			if (persons.length > 1) sp.set("persons", persons.join(","));

			if (filters.resultView) sp.set("rv", filters.resultView);
			if (filters.timelineBucket) sp.set("tb", filters.timelineBucket);

			return `?${sp.toString()}`;
		}, []);

	const parseSearchParams = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback((_searchParams: URLSearchParams) => {
			const filters: any = {};

			// Parse basic filters
			filters.favOnly = _searchParams.get("fav") === "1";
			filters.tagFilter = _searchParams.get("tags") || "";
			filters.dateFrom = _searchParams.get("date_from") || "";
			filters.dateTo = _searchParams.get("date_to") || "";
			filters.place = _searchParams.get("place") || "";
			filters.hasText = _searchParams.get("has_text") === "1";
			filters.camera = _searchParams.get("camera") || "";

			// Parse numeric filters
			const isoMin = _searchParams.get("iso_min");
			if (isoMin) filters.isoMin = parseFloat(isoMin);

			const isoMax = _searchParams.get("iso_max");
			if (isoMax) filters.isoMax = parseFloat(isoMax);

			const fMin = _searchParams.get("f_min");
			if (fMin) filters.fMin = parseFloat(fMin);

			const fMax = _searchParams.get("f_max");
			if (fMax) filters.fMax = parseFloat(fMax);

			// Parse person filters
			const person = _searchParams.get("person");
			const personsCSV = _searchParams.get("persons");
			if (personsCSV) {
				filters.persons = personsCSV
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
			} else if (person) {
				filters.persons = [person];
			}

			// Parse view settings
			filters.resultView = _searchParams.get("rv") as unknown;
			filters.timelineBucket = _searchParams.get("tb") as unknown;

			return filters;
		}, []);

	const applyFiltersFromUrl = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			(_searchParams: URLSearchParams) => {
				try {
					const filters = parseSearchParams(_searchParams);

					// Apply parsed filters to state
					if (filters.favOnly) photoActions.setFavOnly(true);
					if (filters.tagFilter) photoActions.setTagFilter(filters.tagFilter);
					if (filters.place) settingsActions.setPlace(filters.place);
					if (filters.hasText) settingsActions.setHasText(true);
					if (filters.camera) settingsActions.setCamera(filters.camera);
					if (filters.isoMin) settingsActions.setIsoMin(filters.isoMin);
					if (filters.isoMax) settingsActions.setIsoMax(filters.isoMax);
					if (filters.fMin) settingsActions.setFMin(filters.fMin);
					if (filters.fMax) settingsActions.setFMax(filters.fMax);
					if (filters.persons) workspaceActions.setPersons(filters.persons);
					if (filters.resultView)
						settingsActions.setResultView(filters.resultView);
					if (filters.timelineBucket)
						settingsActions.setTimelineBucket(filters.timelineBucket);

					return filters;
				} catch (error) {
					console.error("Error parsing search params:", error);
					return {};
				}
			},
			[parseSearchParams, photoActions, settingsActions, workspaceActions],
		);

	const getThumbUrl = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			(path: string, size: number = 196) => {
				if (!dir || !engine || !path) return "";
				return thumbUrl(dir, engine, path, size);
			},
			[dir, engine],
		);

	// Memoized utility functions
	const searchUtils = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useMemo(
			() => ({
				buildSearchUrl,
				parseSearchParams,
				applyFiltersFromUrl,
				getThumbUrl,
			}),
			[buildSearchUrl, parseSearchParams, applyFiltersFromUrl, getThumbUrl],
		);

	return {
		searchLikeThis,
		toggleFavorite,
		revealPhoto,
		...searchUtils,
	};
};
