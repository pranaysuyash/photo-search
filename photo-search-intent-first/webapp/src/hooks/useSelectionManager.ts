/**
 * Custom hook for managing photo selection state and operations
 * Encapsulates selection logic and related actions
 */
import { useCallback, useMemo } from "react";
import { apiDelete, apiSetTags, apiUndoDelete } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { usePhotoActions, useUIActions } from "@/stores/useStores";

interface UseSelectionManagerProps {
	dir: string | null;
	tagsMap: Record<string, string[]> | null;
	selected: Set<string>;
	loadTags: () => Promise<void>;
	loadFav: () => Promise<void>;
}

export function useSelectionManager({
	dir,
	tagsMap,
	selected,
	loadTags,
	loadFav,
}: UseSelectionManagerProps) {
	const photoActions = usePhotoActions();
	const uiActions = useUIActions();
	const { toast: pushToast } = useToast();

	// Toggle selection for a single item
	const toggleSelect = useCallback(
		(path: string) => {
			const newSelected = new Set(selected);
			if (newSelected.has(path)) {
				newSelected.delete(path);
			} else {
				newSelected.add(path);
			}
			photoActions.setSelected(newSelected);
		},
		[selected, photoActions],
	);

	// Select all items
	const selectAll = useCallback(
		(items: { path: string }[]) => {
			const newSelected = new Set(items.map((item) => item.path));
			photoActions.setSelected(newSelected);
		},
		[photoActions],
	);

	// Clear all selections
	const clearSelection = useCallback(() => {
		photoActions.setSelected(new Set());
	}, [photoActions]);

	// Delete selected photos
	const deleteSelected = useCallback(async () => {
		if (!dir || selected.size === 0) return;

		try {
			uiActions.setBusy("Deleting...");
			const r = await apiDelete(dir, Array.from(selected), true);

			if (r.undoable) {
				pushToast({
					title: "Photos Deleted",
					description: `${r.moved} photos moved to trash`,
					action: {
						label: "Undo",
						onClick: async () => {
							try {
								uiActions.setBusy("Restoring...");
								await apiUndoDelete(dir);
								uiActions.setNote("Photos restored");
								await loadFav();
							} catch (error) {
								uiActions.setNote(
									error instanceof Error ? error.message : "Restore failed",
								);
							} finally {
								uiActions.setBusy("");
							}
						},
					},
				});
			} else {
				pushToast({
					title: "Photos Deleted",
					description: `${r.moved} photos permanently deleted`,
				});
			}

			clearSelection();
			await loadFav();
		} catch (error) {
			uiActions.setNote(
				error instanceof Error ? error.message : "Delete failed",
			);
		} finally {
			uiActions.setBusy("");
		}
	}, [dir, selected, clearSelection, loadFav, uiActions, pushToast]);

	// Tag selected photos
	const tagSelected = useCallback(
		async (tagText: string) => {
			if (!dir || selected.size === 0) return;

			const tagList = tagText
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);

			try {
				uiActions.setBusy("Updating tags...");
				await Promise.all(
					Array.from(selected).map((p) => apiSetTags(dir, p, tagList)),
				);

				pushToast({
					title: "Tags Updated",
					description: `Updated tags for ${selected.size} photos`,
				});

				await loadTags();
			} catch (error) {
				uiActions.setNote(
					error instanceof Error ? error.message : "Tag update failed",
				);
			} finally {
				uiActions.setBusy("");
			}
		},
		[dir, selected, loadTags, uiActions, pushToast],
	);

	// Set rating for selected photos
	const setRatingSelected = useCallback(
		async (rating: 1 | 2 | 3 | 4 | 5 | 0) => {
			if (!dir || selected.size === 0) return;

			try {
				uiActions.setBusy("Setting rating...");
				const re = /^rating:[1-5]$/;
				const paths = Array.from(selected);

				await Promise.all(
					paths.map(async (p) => {
						const curr = (tagsMap?.[p] || []).filter((t) => !re.test(t));
						const next = rating === 0 ? curr : [...curr, `rating:${rating}`];
						await apiSetTags(dir, p, next);
					}),
				);

				pushToast({
					title: "Rating Updated",
					description:
						rating === 0
							? `Cleared rating for ${selected.size} photos`
							: `Set rating ${rating} for ${selected.size} photos`,
				});

				await loadTags();
			} catch (error) {
				uiActions.setNote(
					error instanceof Error ? error.message : "Rating update failed",
				);
			} finally {
				uiActions.setBusy("");
			}
		},
		[dir, selected, tagsMap, loadTags, uiActions, pushToast],
	);

	// Selection statistics
	const selectionStats = useMemo(
		() => ({
			count: selected.size,
			hasSelection: selected.size > 0,
			allSelected: false, // This would need the full item list to determine
		}),
		[selected.size],
	);

	return {
		// Actions
		toggleSelect,
		selectAll,
		clearSelection,
		deleteSelected,
		tagSelected,
		setRatingSelected,

		// State
		selectionStats,

		// Utilities
		isSelected: (path: string) => selected.has(path),
	};
}
