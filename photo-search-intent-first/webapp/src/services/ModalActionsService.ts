import { apiAddPreset, apiCreateShare } from "../api";
import type { ModalData } from "../contexts/ModalDataContext";
import { handleError } from "../utils/errors";

export class ModalActionsService {
	// Share actions
	static async createShare(
		data: ModalData,
		options: {
			expiryHours: number;
			password?: string;
			viewOnly: boolean;
		},
		setNote: (note: string) => void,
	): Promise<void> {
		try {
			const sel = Array.from(data.selected);
			if (sel.length === 0) {
				throw new Error("Select photos to share");
			}

			const r = await apiCreateShare(data.dir, data.engine, sel, options);
			await navigator.clipboard.writeText(window.location.origin + r.url);
			setNote("Share link copied to clipboard");
		} catch (err) {
			setNote(err instanceof Error ? err.message : "Share failed");
			handleError(err, {
				logToServer: true,
				context: {
					action: "create_share",
					component: "ModalActionsService.createShare",
					dir: data.dir,
				},
			});
			throw err;
		}
	}

	// Search preset actions
	static async saveSearchPreset(
		data: ModalData,
		name: string,
		query: string,
		setNote: (note: string) => void,
	): Promise<void> {
		try {
			await apiAddPreset(data.dir, name, query);
			setNote(`Saved preset ${name}`);
		} catch (e) {
			setNote(e instanceof Error ? e.message : "Save failed");
			handleError(e, {
				logToServer: true,
				context: {
					action: "save_preset",
					component: "ModalActionsService.saveSearchPreset",
					dir: data.dir,
				},
			});
			throw e;
		}
	}

	// Tag selection actions
	static handleTagSelection(
		tag: string,
		navigateToView: (view: string) => void,
		onClose: () => void,
	): void {
		// Navigate to search results for the selected tag
		navigateToView(`/search?q=${encodeURIComponent(tag)}`);
		onClose();
	}

	// Collection management helpers
	static validateCollectionOperation(
		selected: Set<string>,
		collections: Record<string, string[]>,
	): { isValid: boolean; error?: string } {
		if (selected.size === 0) {
			return { isValid: false, error: "Select photos to add to collection" };
		}
		return { isValid: true };
	}

	// Indexing status helpers
	static getIndexingStatusMessage(
		isIndexing: boolean,
		progress?: number,
	): string {
		if (isIndexing) {
			return progress ? `Indexing... ${progress}%` : "Indexing in progress";
		}
		return "Ready to index";
	}

	// Modal state management helpers
	static getModalTitle(modalType: string): string {
		const titles: Record<string, string> = {
			folder: "Set Photo Folder",
			export: "Export Photos",
			share: "Share Photos",
			"enhanced-share": "Share Photos",
			tag: "Add Tags",
			collect: "Add to Collection",
			removeCollect: "Remove from Collection",
			likeplus: "Like+",
			save: "Save Search",
			advanced: "Advanced Search",
			theme: "Theme Settings",
			help: "Help",
			search: "Search",
			jobs: "Jobs",
			diagnostics: "Diagnostics",
		};
		return titles[modalType] || "Modal";
	}

	// Input validation helpers
	static validateShareInput(expiryHours: number): {
		isValid: boolean;
		error?: string;
	} {
		if (isNaN(expiryHours) || expiryHours < 1) {
			return { isValid: false, error: "Expiry time must be at least 1 hour" };
		}
		if (expiryHours > 8760) {
			return { isValid: false, error: "Expiry time cannot exceed 1 year" };
		}
		return { isValid: true };
	}

	static validateFolderInput(dir: string): {
		isValid: boolean;
		error?: string;
	} {
		if (!dir || dir.trim() === "") {
			return { isValid: false, error: "Please select a folder" };
		}
		return { isValid: true };
	}
}
