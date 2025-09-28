import { useEffect } from "react";
import type { Location } from "react-router-dom";

// Query param helpers
function getFlag(sp: URLSearchParams, key: string): boolean {
	return sp.get(key) === "1";
}
function getCSV(sp: URLSearchParams, key: string): string[] {
	const raw = sp.get(key);
	if (!raw) return [];
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}
function getNumber(sp: URLSearchParams, key: string): number | undefined {
	const v = sp.get(key);
	if (!v) return undefined;
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
}
function getString(sp: URLSearchParams, key: string): string | undefined {
	const v = sp.get(key);
	return v && v.length > 0 ? v : undefined;
}

interface UseQueryParamFiltersArgs {
	location: Location;
	searchText: string;
	setSearchText: (value: string) => void;
	setDateFrom: (value: string) => void;
	setDateTo: (value: string) => void;
	setRatingMin: (value: number) => void;
	resultView?: string;
	timelineBucket?: string;
	setResultViewLocal?: (value: "grid" | "timeline") => void;
	setTimelineBucketLocal?: (value: "day" | "week" | "month") => void;
	photoActions: {
		setFavOnly: (value: boolean) => void;
		setTagFilter: (value: string) => void;
	};
	settingsActions: {
		setPlace: (value: string) => void;
		setHasText: (value: boolean) => void;
		setCamera: (value: string) => void;
		setIsoMin: (value: number) => void;
		setIsoMax: (value: number) => void;
		setFMin: (value: number) => void;
		setFMax: (value: number) => void;
		setUseFast?: (value: boolean) => void;
		setFastKind?: (value: string) => void;
		setUseCaps?: (value: boolean) => void;
		setUseOcr?: (value: boolean) => void;
		setResultView?: (value: string) => void;
		setTimelineBucket?: (value: string) => void;
	};
	workspaceActions: {
		setPersons: (value: string[]) => void;
	};
}

export function useQueryParamFilters({
	location,
	searchText,
	setSearchText,
	setDateFrom,
	setDateTo,
	setRatingMin,
	resultView,
	timelineBucket,
	setResultViewLocal,
	setTimelineBucketLocal,
	photoActions,
	settingsActions,
	workspaceActions,
}: UseQueryParamFiltersArgs) {
	const { setFavOnly, setTagFilter } = photoActions;
	const {
		setPlace,
		setHasText,
		setCamera,
		setIsoMin,
		setIsoMax,
		setFMin,
		setFMax,
		setUseFast,
		setFastKind,
		setUseCaps,
		setUseOcr,
		setResultView,
		setTimelineBucket,
	} = settingsActions;
	const { setPersons } = workspaceActions;

	useEffect(() => {
		const sp = new URLSearchParams(location.search);
		const q = (sp.get("q") || "").trim();
		if (q && q !== searchText) setSearchText(q);

		try {
			// Favorites
			if (getFlag(sp, "fav")) setFavOnly(true);

			// Tags
			const tags = getCSV(sp, "tags");
			if (tags.length) setTagFilter(tags.join(","));

			// Dates
			const df = getString(sp, "date_from");
			if (df) setDateFrom(df);
			const dt = getString(sp, "date_to");
			if (dt) setDateTo(dt);

			// Simple text filters
			const plc = getString(sp, "place");
			if (plc) setPlace(plc);
			if (getFlag(sp, "has_text")) setHasText(true);
			const cam = getString(sp, "camera");
			if (cam) setCamera(cam);

			// Numeric ranges
			const isoMin = getNumber(sp, "iso_min");
			if (isoMin !== undefined) setIsoMin(isoMin);
			const isoMax = getNumber(sp, "iso_max");
			if (isoMax !== undefined) setIsoMax(isoMax);
			const fmin = getNumber(sp, "f_min");
			if (fmin !== undefined) setFMin(fmin);
			const fmax = getNumber(sp, "f_max");
			if (fmax !== undefined) setFMax(fmax);

			// Rating min clamped to [0,5]
			const rmin = getNumber(sp, "rating_min");
			if (rmin !== undefined)
				setRatingMin(Math.max(0, Math.min(5, Math.trunc(rmin))));

			// People
			const persons = getCSV(sp, "persons");
			const person = getString(sp, "person");
			if (persons.length) setPersons(persons);
			else if (person) setPersons([person]);

			// Feature flags
			if (getFlag(sp, "fast")) setUseFast?.(true);
			const fastKind = getString(sp, "fast_kind");
			if (fastKind) setFastKind?.(fastKind);
			if (getFlag(sp, "caps")) setUseCaps?.(true);
			if (getFlag(sp, "ocr")) setUseOcr?.(true);

			// Result view toggles
			const rv = getString(sp, "rv");
			if (rv && rv !== resultView) {
				setResultView?.(rv);
				if (rv === "grid" || rv === "timeline") setResultViewLocal?.(rv);
			}

			const tb = getString(sp, "tb");
			if (tb && tb !== timelineBucket) {
				setTimelineBucket?.(tb);
				if (tb === "day" || tb === "week" || tb === "month")
					setTimelineBucketLocal?.(tb);
			}
		} catch {
			/* noop: invalid query string or storage unavailable */
		}
	}, [
		location.search,
		searchText,
		setSearchText,
		setDateFrom,
		setDateTo,
		setRatingMin,
		resultView,
		timelineBucket,
		setFavOnly,
		setTagFilter,
		setPlace,
		setHasText,
		setCamera,
		setIsoMin,
		setIsoMax,
		setFMin,
		setFMax,
		setUseFast,
		setFastKind,
		setUseCaps,
		setUseOcr,
		setResultView,
		setTimelineBucket,
		setPersons,
		setResultViewLocal,
		setTimelineBucketLocal,
	]);
}

export default useQueryParamFilters;
