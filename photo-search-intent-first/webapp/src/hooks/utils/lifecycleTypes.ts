/**
 * Strict type definitions for app lifecycle components
 */

export type ThemeMode = "light" | "dark";
export type ResultView = "grid" | "film" | "timeline";
export type TimelineBucket = "day" | "week" | "month" | "year";
export type ScreenSize = "mobile" | "tablet" | "desktop";

export interface AdvancedSearchApplyEventDetail {
	q?: string;
}

export type AdvancedSearchApplyEvent =
	CustomEvent<AdvancedSearchApplyEventDetail>;

export interface PhotoResult {
	path: string;
	// Add other properties as they become known
}
