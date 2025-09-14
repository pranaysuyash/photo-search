import { useCallback, useMemo } from "react";
import {
	apiDelete,
	apiExport,
	apiSetFavorite,
	apiSetTags,
	apiUndoDelete,
} from "../api";
import { useSettingsActions } from "../stores/settingsStore";
import { useWorkspaceActions } from "../stores/workspaceStore";
import { handleError, networkErrors } from "../utils/errors";

interface SearchFilters {
	favOnly?: boolean;
	tagFilter?: string;
	dateFrom?: string;
	dateTo?: string;
	place?: string;
	camera?: string;
	isoMin?: number;
	isoMax?: number;
	fMin?: number;
	fMax?: number;
	hasText?: boolean;
	persons?: string[];
}

export interface PhotoActionsOptions {
	dir: string;
	engine: string;
	useOsTrash: boolean;
	uiActions: {
		setBusy: (message: string) => void;
		setNote: (message: string) => void;
	};
	photoActions: {
		setResults: (results: unknown[]) => void;
		setQuery: (query: string) => void;
		setTopK: (k: number) => void;
		setFavOnly: (favOnly: boolean) => void;
		setTagFilter: (tagFilter: string) => void;
		setSearchId: (searchId: string) => void;
	};
	tagsMap?: Record<string, string[]>;
}

export const usePhotoActions = (_options: PhotoActionsOptions) => {
	const {
		dir,
		engine: _engine,
		useOsTrash,
		uiActions,
		photoActions,
		tagsMap,
	} = _options;

	const settingsActions = useSettingsActions();
	const workspaceActions = useWorkspaceActions();

	const normalizePaths = (sel: Set<string> | string[]): string[] =>
		Array.isArray(sel) ? sel : Array.from(sel);

	const setRating = useCallback(
		async (rating: 1 | 2 | 3 | 4 | 5 | 0, selected: Set<string> | string[]) => {
			if (!dir) return;
			const selectedPaths = normalizePaths(selected);
			if (selectedPaths.length === 0) return;
			try {
				const re = /^rating:[1-5]$/;
				await Promise.all(
					selectedPaths.map(async (p) => {
						const curr = (tagsMap?.[p] || []).filter((t) => !re.test(t));
						const next = rating === 0 ? curr : [...curr, `rating:${rating}`];
						await apiSetTags(dir, p, next);
					}),
				);
				uiActions.setNote(
					rating === 0
						? `Cleared rating for ${selectedPaths.length}`
						: `Set rating ${rating} for ${selectedPaths.length}`,
				);
            } catch (error: unknown) {
                // @ts-ignore
                uiActions.setNote(error?.message || "Rating update failed");
                handleError(error, { logToServer: true, context: { action: "set_rating", component: "usePhotoActions", dir } });
            }
		},
		[dir, uiActions, tagsMap, normalizePaths],
	);

	const setTags = useCallback(
		async (newTags: string[] | string, selected: Set<string> | string[]) => {
			if (!dir) return;
			const selectedPaths = normalizePaths(selected);
			if (selectedPaths.length === 0) return;
			const tagList = Array.isArray(newTags)
				? newTags
				: newTags
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean);
			try {
				await Promise.all(
					selectedPaths.map((p) => apiSetTags(dir, p, tagList)),
				);
				uiActions.setNote(`Updated tags for ${selectedPaths.length} photos`);
            } catch (error: unknown) {
                // @ts-ignore
                uiActions.setNote(error?.message || "Tag update failed");
                handleError(error, { logToServer: true, context: { action: "set_tags", component: "usePhotoActions", dir } });
            }
		},
		[dir, uiActions, normalizePaths],
	);

	const exportPhotos = useCallback(
		async (
			a: string | Set<string> | string[],
			b: string | Set<string> | string[],
			options: {
				copy?: boolean;
				move?: boolean;
				includeMetadata?: boolean;
				createThumbnails?: boolean;
			} = {},
		) => {
			if (!dir) return;
			// Support both (dest, selected) and (selected, dest)
			let dest: string;
			let selectedPaths: string[];
			if (typeof a === "string") {
				dest = a;
				selectedPaths = normalizePaths(b as unknown);
			} else {
				selectedPaths = normalizePaths(a as unknown);
				dest = b as string;
			}
			if (!dest || selectedPaths.length === 0) return;

			const { includeMetadata = false, createThumbnails = false } = options;
			try {
				const r = await apiExport(
					dir,
					selectedPaths,
					dest,
					"copy",
					includeMetadata,
					createThumbnails,
				);
				uiActions.setNote(
					`Exported ${r.copied}, skipped ${r.skipped}, errors ${r.errors} → ${r.dest}`,
				);
            } catch (error: unknown) {
                // @ts-ignore
                uiActions.setNote(error?.message || "Export failed");
                handleError(error, { logToServer: true, context: { action: "export", component: "usePhotoActions", dir } });
            }
		},
		[dir, uiActions, normalizePaths],
	);

	const deletePhotos = useCallback(
		async (selected: Set<string> | string[]) => {
			if (!dir) return;
			const selectedPaths = normalizePaths(selected);
			if (selectedPaths.length === 0) return;
			const confirmed =
				typeof window !== "undefined"
					? window.confirm(`Move ${selectedPaths.length} item(s) to Trash?`)
					: true;
			if (!confirmed) return;
			try {
				await apiDelete(dir, selectedPaths, useOsTrash);
				uiActions.setNote(
					useOsTrash
						? `Moved ${selectedPaths.length} to OS Trash`
						: `Moved ${selectedPaths.length} to Trash`,
				);
            } catch (error: unknown) {
                // @ts-ignore
                uiActions.setNote(error?.message || "Delete failed");
                handleError(error, { logToServer: true, context: { action: "delete", component: "usePhotoActions", dir } });
            }
		},
		[dir, useOsTrash, uiActions, normalizePaths],
	);

	const undoDelete = useCallback(async () => {
		if (!dir) return;
		try {
			const r = await apiUndoDelete(dir as string);
			const restored = (r as unknown)?.restored ?? 0;
			uiActions.setNote(`Restored ${restored}`);
        } catch (error: unknown) {
            // @ts-ignore
            uiActions.setNote(error?.message || "Undo failed");
            handleError(error, { logToServer: true, context: { action: "undo_delete", component: "usePhotoActions", dir } });
        }
	}, [dir, uiActions]);

	const toggleFavorite = useCallback(
		async (photoPath: string) => {
			if (!dir || !photoPath) return;
			try {
				const isFav = (tagsMap?.[photoPath] || []).includes("favorite");
				await apiSetFavorite(dir, photoPath, !isFav);
        } catch (error) {
            // Swallow per tests; log for diagnostics
            handleError(error, { logToServer: true, context: { action: "toggle_favorite", component: "usePhotoActions", dir } });
        }
		},
		[dir, tagsMap],
	);

	const clearSearch = useCallback(() => {
		photoActions.setQuery("");
		photoActions.setResults([]);
		photoActions.setSearchId("");
	}, [photoActions]);

	const performSearch = useCallback(
		async (query: string, filters: SearchFilters = {}) => {
			if (!dir) return;

			if (networkErrors.isOffline()) {
				uiActions.setNote("Cannot search: No internet connection");
				return;
			}

			// This would typically be implemented with the actual search API
			// For now, it's a placeholder that would integrate with your search system
			console.log("Performing search:", { query, filters });

			// Reset filters and search state
			if (filters.favOnly) photoActions.setFavOnly(false);
			if (filters.tagFilter) photoActions.setTagFilter("");
			if (filters.dateFrom || filters.dateTo) {
				// Clear date filters
			}
			if (filters.place) settingsActions.setPlace("");
			if (filters.camera) settingsActions.setCamera("");
			if (filters.isoMin) settingsActions.setIsoMin("");
			if (filters.isoMax) settingsActions.setIsoMax("");
			if (filters.fMin) settingsActions.setFMin("");
			if (filters.fMax) settingsActions.setFMax("");
			if (filters.hasText) settingsActions.setHasText(false);
			if (filters.persons) workspaceActions.setPersons([]);

			// Set the search query and results
			photoActions.setQuery(query);
			photoActions.setResults([]); // This would be populated by actual search results

			uiActions.setNote(`Searching for: ${query}`);
		},
		[dir, uiActions, photoActions, settingsActions, workspaceActions],
	);

	// Utility functions for photo manipulation
	const photoUtils = useMemo(
		() => ({
			basename: (path: string): string => {
				return path.split("/").pop() || "";
			},

			formatFileSize: (bytes: number): string => {
				if (bytes === 0) return "0 Bytes";
				const k = 1024;
				const sizes = ["Bytes", "KB", "MB", "GB"];
				const i = Math.floor(Math.log(bytes) / Math.log(k));
				return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
			},

			formatDate: (date: Date | string): string => {
				const d = typeof date === "string" ? new Date(date) : date;
				return d.toLocaleDateString();
			},

			isValidImagePath: (path: string): boolean => {
				const validExtensions = [
					".jpg",
					".jpeg",
					".png",
					".gif",
					".bmp",
					".webp",
					".tiff",
					".tif",
				];
				const ext = path.toLowerCase().split(".").pop();
				return ext ? validExtensions.includes(`.${ext}`) : false;
			},

			isValidVideoPath: (path: string): boolean => {
				const validExtensions = [
					".mp4",
					".avi",
					".mov",
					".wmv",
					".flv",
					".mkv",
					".webm",
				];
				const ext = path.toLowerCase().split(".").pop();
				return ext ? validExtensions.includes(`.${ext}`) : false;
			},
		}),
		[],
	);

	return {
		setRating,
		setTags,
		exportPhotos,
		deletePhotos,
		undoDelete,
		toggleFavorite,
		clearSearch,
		performSearch,
		...photoUtils,
	};
};
