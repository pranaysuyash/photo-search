import { useEffect } from "react";
import type { Location } from "react-router-dom";

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
		const q = sp.get("q") || "";
		if (q && q !== searchText) setSearchText(q);

		try {
			const fav = sp.get("fav");
			if (fav === "1") setFavOnly(true);

			const tagsCSV = sp.get("tags") || "";
			if (tagsCSV) setTagFilter(tagsCSV);

			const df = sp.get("date_from");
			const dt = sp.get("date_to");
			if (df) setDateFrom(df);
			if (dt) setDateTo(dt);

			const plc = sp.get("place");
			if (plc) setPlace(plc);

			const ht = sp.get("has_text");
			if (ht === "1") setHasText(true);

			const cam = sp.get("camera");
			if (cam) setCamera(cam);

			const isoMinP = sp.get("iso_min");
			if (isoMinP) setIsoMin(parseFloat(isoMinP));
			const isoMaxP = sp.get("iso_max");
			if (isoMaxP) setIsoMax(parseFloat(isoMaxP));

			const fmin = sp.get("f_min");
			if (fmin) setFMin(parseFloat(fmin));
			const fmax = sp.get("f_max");
			if (fmax) setFMax(parseFloat(fmax));

			const rmin = sp.get("rating_min");
			if (rmin) {
				const parsed = parseInt(rmin, 10);
				if (!Number.isNaN(parsed)) {
					setRatingMin(Math.max(0, Math.min(5, parsed)));
				}
			}

			const person = sp.get("person");
			const personsCSV = sp.get("persons");
			if (personsCSV) {
				setPersons(
					personsCSV
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean),
				);
			} else if (person) {
				setPersons([person]);
			}

			const fast = sp.get("fast");
			if (fast === "1") setUseFast?.(true);

			const fastKind = sp.get("fast_kind");
			if (fastKind) setFastKind?.(fastKind);

			const caps = sp.get("caps");
			if (caps === "1") setUseCaps?.(true);

			const ocr = sp.get("ocr");
			if (ocr === "1") setUseOcr?.(true);

			const resultViewParam = sp.get("rv");
			if (resultViewParam && resultViewParam !== resultView) {
				setResultView?.(resultViewParam);
				if (resultViewParam === "grid" || resultViewParam === "timeline") {
					setResultViewLocal?.(resultViewParam);
				}
			}

			const timelineBucketParam = sp.get("tb");
			if (timelineBucketParam && timelineBucketParam !== timelineBucket) {
				setTimelineBucket?.(timelineBucketParam);
				if (
					timelineBucketParam === "day" ||
					timelineBucketParam === "week" ||
					timelineBucketParam === "month"
				) {
					setTimelineBucketLocal?.(timelineBucketParam);
				}
			}
		} catch {}
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
