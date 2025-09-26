import type {
	ResultView,
	TimelineBucket,
} from "../contexts/ResultsConfigContext";

export type ViewPreferences = {
	resultView?: ResultView;
	timelineBucket?: TimelineBucket;
	gridSize?: "small" | "medium" | "large";
};

const STORAGE_KEY = "photo-view-preferences-v1";

const RESULT_VIEW_VALUES: ResultView[] = ["grid", "film", "timeline", "map"];
const TIMELINE_BUCKET_VALUES: TimelineBucket[] = ["day", "week", "month"];
const GRID_SIZE_VALUES = ["small", "medium", "large"] as const;

const isBrowser = typeof window !== "undefined";

function sanitizePreferences(raw: unknown): ViewPreferences {
	if (!raw || typeof raw !== "object") return {};
	const prefs = raw as Partial<ViewPreferences>;
	const next: ViewPreferences = {};

	if (prefs.resultView && RESULT_VIEW_VALUES.includes(prefs.resultView)) {
		next.resultView = prefs.resultView;
	}
	if (
		prefs.timelineBucket &&
		TIMELINE_BUCKET_VALUES.includes(prefs.timelineBucket)
	) {
		next.timelineBucket = prefs.timelineBucket;
	}
	if (prefs.gridSize && GRID_SIZE_VALUES.includes(prefs.gridSize)) {
		next.gridSize = prefs.gridSize;
	}
	return next;
}

export function loadViewPreferences(): ViewPreferences {
	if (!isBrowser) return {};
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		return sanitizePreferences(parsed);
	} catch (error) {
		console.warn("Failed to load view preferences", error);
		return {};
	}
}

export function saveViewPreferences(partial: Partial<ViewPreferences>): void {
	if (!isBrowser) return;
	try {
		const current = loadViewPreferences();
		const next = sanitizePreferences({ ...current, ...partial });
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch (error) {
		console.warn("Failed to save view preferences", error);
	}
}
