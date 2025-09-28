import {
	Download,
	FolderOpen,
	Search as IconSearch,
	Tag as IconTag,
	Info,
	MoreHorizontal,
	Palette,
	Trash2,
} from "lucide-react";
import type React from "react";
import { Fragment, useState } from "react";
import { apiDelete, apiSearchLike, apiUndoDelete } from "../../../api";
import type { ModalKey } from "../../../contexts/ModalContext";
import type { PhotoActions, UIActions } from "../../../stores/types";
import type { ViewType } from "../../TopBar";
import { MotionButton } from "../primitives/MotionButton";

interface SelectionActionsBarProps {
	selectionCount: number;
	selectedPaths: string[];
	isSingleSelection: boolean;
	primarySelectedPath?: string;
	clearSelection: () => void;
	modalOpen: (modalId: ModalKey) => void;
	uiActions: Pick<UIActions, "setBusy" | "setNote">;
	photoActions: Pick<PhotoActions, "setResults">;
	dir: string;
	engine: string;
	topK: number;
	useOsTrash: boolean;
	setSelected: (selected: Set<string>) => void;
	setSelectedView: (view: ViewType) => void;
	toastTimerRef: React.MutableRefObject<number | null>;
	setToast: (
		toast: {
			message: string;
			actionLabel?: string;
			onAction?: () => void;
		} | null,
	) => void;
	showInfoOverlay: boolean;
	onToggleInfoOverlay: () => void;
	onOpenThemeModal?: () => void;
}

export function SelectionActionsBar({
	selectionCount,
	selectedPaths,
	isSingleSelection,
	primarySelectedPath,
	clearSelection,
	modalOpen,
	uiActions,
	photoActions,
	dir,
	engine,
	topK,
	useOsTrash,
	setSelected,
	setSelectedView,
	toastTimerRef,
	setToast,
	showInfoOverlay,
	onToggleInfoOverlay,
	onOpenThemeModal,
}: SelectionActionsBarProps) {
	const [showMore, setShowMore] = useState(false);

	const handleDelete = async () => {
		if (selectionCount === 0) return;
		if (!confirm(`Move ${selectionCount} item(s) to Trash?`)) return;
		try {
			uiActions.setBusy("Deleting…");
			const result = await apiDelete(dir, selectedPaths, useOsTrash);
			uiActions.setNote(
				`Moved ${result.moved} to ${useOsTrash ? "OS Trash" : "Trash"}`,
			);
			setSelected(new Set());
			if (!useOsTrash) {
				if (toastTimerRef.current) {
					window.clearTimeout(toastTimerRef.current);
				}
				setToast({
					message: `Moved ${result.moved} to Trash`,
					actionLabel: "Undo",
					onAction: async () => {
						try {
							const undo = await apiUndoDelete(dir);
							uiActions.setNote(`Restored ${undo.restored}`);
						} catch (err) {
							// Ignore undo errors: non-critical path
							if (import.meta.env.DEV) {
								console.warn("Undo delete failed", err);
							}
						}
						setToast(null);
						if (toastTimerRef.current) {
							window.clearTimeout(toastTimerRef.current);
							toastTimerRef.current = null;
						}
					},
				});
				toastTimerRef.current = window.setTimeout(() => {
					setToast(null);
					toastTimerRef.current = null;
				}, 10000);
			} else {
				setToast({ message: `Moved ${result.moved} to OS Trash` });
			}
		} catch (error) {
			uiActions.setNote(
				error instanceof Error ? error.message : "Delete failed",
			);
		} finally {
			uiActions.setBusy("");
		}
	};

	const handleSearchSimilar = async () => {
		if (!primarySelectedPath) return;
		uiActions.setBusy("Searching similar…");
		try {
			const response = await apiSearchLike(
				dir,
				primarySelectedPath,
				engine,
				topK,
			);
			photoActions.setResults(response.results || []);
			setSelectedView("results");
		} catch (error) {
			uiActions.setNote(
				error instanceof Error ? error.message : "Search failed",
			);
		} finally {
			uiActions.setBusy("");
		}
	};

	return (
		<div className="top-bar-selection w-full">
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50/70 dark:bg-blue-900/40 px-3 py-2 border border-blue-200/60 dark:border-blue-700/40 shadow-sm">
				<div className="flex items-center gap-3 min-w-0">
					<button
						type="button"
						className="px-2 py-1 text-xs font-semibold rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 dark:text-blue-100 transition"
						onClick={clearSelection}
						aria-label="Clear selection"
					>
						Clear
					</button>
					<div className="flex flex-col min-w-0" aria-live="polite">
						<span className="sr-only">Selection mode active.</span>
						<span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
							{selectionCount} photo{selectionCount !== 1 ? "s" : ""} selected
						</span>
						{isSingleSelection && primarySelectedPath && (
							<span className="text-xs text-blue-700/80 dark:text-blue-100/80 truncate max-w-xs">
								{primarySelectedPath.split("/").pop()}
							</span>
						)}
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2 w-full">
					<button
						type="button"
						className="action-button"
						onClick={() => modalOpen("export")}
						aria-label="Export selected photos"
					>
						<Download className="w-4 h-4" />
						Export
					</button>
					<button
						type="button"
						className="action-button"
						onClick={() => modalOpen("enhanced-share")}
						aria-label="Share selected photos"
					>
						<IconSearch className="w-4 h-4" />
						Share
					</button>
					{(import.meta.env?.VITE_FF_SHARING_V1 as string) === "1" && (
						<button
							type="button"
							className="action-button"
							onClick={() => modalOpen("share")}
							aria-label="Share selected photos"
						>
							<IconSearch className="w-4 h-4" /> Share
						</button>
					)}
					{(import.meta.env?.VITE_FF_SHARING_V1 as string) === "1" && (
						<button
							type="button"
							className="action-button"
							onClick={() => modalOpen("shareManage")}
							aria-label="Manage shared links"
						>
							Manage Shares
						</button>
					)}
					<button
						type="button"
						className={`action-button ${showInfoOverlay ? "active" : ""}`}
						onClick={onToggleInfoOverlay}
						aria-label="Toggle info overlay on grid items"
					>
						<Info className="w-4 h-4" /> Info
					</button>
					<button
						type="button"
						className="action-button"
						onClick={() => modalOpen("advanced")}
						aria-label="Open advanced search"
					>
						Advanced
					</button>
					<button
						type="button"
						className="action-button"
						onClick={() => modalOpen("tag")}
						aria-label="Tag selected photos"
					>
						<IconTag className="w-4 h-4" />
						Tag
					</button>
					{isSingleSelection && primarySelectedPath && (
						<Fragment>
							<button
								type="button"
								className="action-button"
								onClick={handleSearchSimilar}
								aria-label="Find similar photos to the selected photo"
							>
								<IconSearch className="w-4 h-4" /> Similar
							</button>
							<button
								type="button"
								className="action-button"
								onClick={() => modalOpen("likeplus")}
								aria-label="Find similar photos with additional text query"
							>
								<IconSearch className="w-4 h-4" /> Similar + Text
							</button>
						</Fragment>
					)}
					<button
						type="button"
						className="action-button"
						onClick={() => modalOpen("collect")}
						aria-label="Add selected photos to a collection"
					>
						<FolderOpen className="w-4 h-4" /> Add to Collection
					</button>
					<button
						type="button"
						className="action-button"
						onClick={() => modalOpen("removeCollect")}
						aria-label="Remove selected photos from a collection"
					>
						<FolderOpen className="w-4 h-4 rotate-180" /> Remove from Collection
					</button>
					<button
						type="button"
						className="action-button danger"
						onClick={handleDelete}
						aria-label="Delete selected photos"
					>
						<Trash2 className="w-4 h-4" />
						Delete
					</button>
					<MotionButton
						type="button"
						className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
						title="More actions"
						aria-label="More actions"
						aria-haspopup="true"
						aria-expanded={showMore}
						onClick={() => setShowMore((value) => !value)}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
						<span className="text-sm">More</span>
					</MotionButton>
					{showMore && (
						<div className="absolute right-2 mt-12 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 w-56">
							<button
								type="button"
								className="menu-item"
								onClick={() => onOpenThemeModal?.()}
							>
								<Palette className="w-4 h-4 mr-2" /> Theme
							</button>
							<button
								type="button"
								className="menu-item"
								onClick={() => modalOpen("advanced")}
							>
								<IconSearch className="w-4 h-4 mr-2" /> Advanced Search
							</button>
							<button
								type="button"
								className="menu-item"
								onClick={() => modalOpen("tag")}
							>
								<IconTag className="w-4 h-4 mr-2" /> Tag Selected
							</button>
							<button
								type="button"
								className="menu-item"
								onClick={() => modalOpen("export")}
							>
								<Download className="w-4 h-4 mr-2" /> Export
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default SelectionActionsBar;
