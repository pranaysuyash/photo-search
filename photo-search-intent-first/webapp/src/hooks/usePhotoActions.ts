import { useCallback, useMemo } from "react";
import { apiDelete, apiExport, apiSetTags, apiUndoDelete } from "../api";
import { useSettingsActions } from "../stores/settingsStore";
import { useWorkspaceActions } from "../stores/workspaceStore";
import type { ErrorHandlerOptions } from "../utils/errors";
import { _withErrorHandling, networkErrors } from "../utils/errors";

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
}

export const usePhotoActions = (_options: PhotoActionsOptions) => {
	const {
		dir,
		engine: _engine,
		useOsTrash,
		uiActions,
		photoActions,
	} = _options;

	const settingsActions = useSettingsActions();
	const workspaceActions = useWorkspaceActions();

	const defaultErrorOptions: ErrorHandlerOptions = {
		showToast: false,
		logToConsole: true,
		context: {
			component: "usePhotoActions",
		},
	};

	const setRating = useCallback(
		async (
			selectedPaths: string[],
			rating: 1 | 2 | 3 | 4 | 5 | 0,
			tagsMap?: Record<string, string[]>,
		) => {
			if (!dir || selectedPaths.length === 0) return;

			await _withErrorHandling(
				async () => {
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
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "setRating",
						metadata: { selectedPaths: selectedPaths.length, rating },
					},
					fallbackMessage: "Rating update failed",
				},
			);
		},
		[dir, uiActions],
	);

	const setTags = useCallback(
		async (selectedPaths: string[], tagText: string) => {
			if (!dir || selectedPaths.length === 0) return;

			const tagList = tagText
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);

			await _withErrorHandling(
				async () => {
					await Promise.all(
						selectedPaths.map((p) => apiSetTags(dir, p, tagList)),
					);
					uiActions.setNote(`Updated tags for ${selectedPaths.length} photos`);
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "setTags",
						metadata: {
							selectedPaths: selectedPaths.length,
							tagCount: tagList.length,
						},
					},
					fallbackMessage: "Tag update failed",
				},
			);
		},
		[dir, uiActions],
	);

	const exportPhotos = useCallback(
		async (
			selectedPaths: string[],
			dest: string,
			options: {
				copy?: boolean;
				move?: boolean;
				includeMetadata?: boolean;
				createThumbnails?: boolean;
			} = {},
		) => {
			if (!dir || selectedPaths.length === 0) return;

			const {
				copy = true,
				move = false,
				includeMetadata = false,
				createThumbnails = false,
			} = options;

			await _withErrorHandling(
				async () => {
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
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "exportPhotos",
						metadata: {
							selectedPaths: selectedPaths.length,
							dest,
							copy,
							move,
						},
					},
					fallbackMessage: "Export failed",
				},
			);
		},
		[dir, uiActions],
	);

	const deletePhotos = useCallback(
		async (_selectedPaths: string[]) => {
			if (!dir || _selectedPaths.length === 0) return;

			await _withErrorHandling(
				async () => {
					await apiDelete(dir, _selectedPaths, useOsTrash);
					uiActions.setNote(`Deleted ${_selectedPaths.length} photos`);
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "deletePhotos",
						metadata: { selectedPaths: _selectedPaths.length, useOsTrash },
					},
					fallbackMessage: "Delete failed",
				},
			);
		},
		[dir, useOsTrash, uiActions],
	);

	const undoDelete = useCallback(
		async (_selectedPaths: string[]) => {
			if (!dir || _selectedPaths.length === 0) return;

			await _withErrorHandling(
				async () => {
					await apiUndoDelete(dir);
					uiActions.setNote(`Restored ${_selectedPaths.length} photos`);
				},
				{
					...defaultErrorOptions,
					context: {
						...defaultErrorOptions.context,
						action: "undoDelete",
						metadata: { selectedPaths: _selectedPaths.length },
					},
					fallbackMessage: "Restore failed",
				},
			);
		},
		[dir, uiActions],
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
			if (filters.isoMin) settingsActions.setIsoMin(0);
			if (filters.isoMax) settingsActions.setIsoMax(0);
			if (filters.fMin) settingsActions.setFMin(0);
			if (filters.fMax) settingsActions.setFMax(0);
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
		clearSearch,
		performSearch,
		...photoUtils,
	};
};
