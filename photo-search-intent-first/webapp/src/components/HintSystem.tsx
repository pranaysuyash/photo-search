import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useReducedMotion } from "../framework/AccessibilityFramework";
import { ContextualHint } from "./OnboardingTour";

interface HintContextType {
	showHint: (hint: Omit<HintConfig, "id"> & { id: string }) => void;
	dismissHint: (id: string) => void;
	clearAllHints: () => void;
	activeHints: HintConfig[];
}

interface HintConfig {
	id: string;
	message: string;
	action?: string;
	position: "top" | "bottom" | "left" | "right" | "center";
	target?: string;
	priority: "low" | "medium" | "high";
	autoHide?: number;
	condition?: () => boolean;
	trigger?: string; // User action that triggers this hint
}

const HintContext = createContext<HintContextType | null>(null);

export function HintProvider({ children }: { children: React.ReactNode }) {
	const [activeHints, setActiveHints] = useState<HintConfig[]>([]);
	const { isReducedMotion } = useReducedMotion();

	const showHint = (hint: HintConfig) => {
		// Respect dismissed hints stored by onboarding
		try {
			const dismissed = JSON.parse(
				localStorage.getItem("dismissed-hints") || "[]",
			) as string[];
			if (Array.isArray(dismissed) && dismissed.includes(hint.id)) return;
		} catch {}
		// Don't show hints if reduced motion is enabled and it's not critical
		if (isReducedMotion && hint.priority !== "high") return;

		// Check if hint condition is met
		if (hint.condition && !hint.condition()) return;

		// Remove existing hint with same ID
		setActiveHints((prev) => prev.filter((h) => h.id !== hint.id));

		// Add new hint
		setActiveHints((prev) => [...prev, hint]);

		// Auto-hide if specified
		if (hint.autoHide) {
			setTimeout(() => {
				dismissHint(hint.id);
			}, hint.autoHide * 1000);
		}
	};

	const dismissHint = (id: string) => {
		setActiveHints((prev) => prev.filter((hint) => hint.id !== id));
	};

	const clearAllHints = () => {
		setActiveHints([]);
	};

	// Sort hints by priority
	const sortedHints = activeHints.sort((a, b) => {
		const priorityOrder = { high: 3, medium: 2, low: 1 };
		return priorityOrder[b.priority] - priorityOrder[a.priority];
	});

	// Only show the highest priority hint
	const visibleHint = sortedHints[0];

	return (
		<HintContext.Provider
			value={{ showHint, dismissHint, clearAllHints, activeHints }}
		>
			{children}
			{visibleHint && (
				<ContextualHint
					message={visibleHint.message}
					action={visibleHint.action}
					position={visibleHint.position}
					target={visibleHint.target}
					onDismiss={() => dismissHint(visibleHint.id)}
					autoHide={visibleHint.autoHide}
				/>
			)}
		</HintContext.Provider>
	);
}

export function useHints() {
	const context = useContext(HintContext);
	if (!context) {
		throw new Error("useHints must be used within a HintProvider");
	}
	return context;
}

// Predefined hint configurations
export const HINTS = {
	FIRST_SEARCH: {
		id: "first-search",
		message:
			'Try searching for "beach" or "mountains" to see AI-powered search in action!',
		action: "Click here or press Ctrl+K to search",
		position: "bottom" as const,
		target: '[data-tour="search-bar"]',
		priority: "high" as const,
		autoHide: 8,
	},

	UPLOAD_PHOTOS: {
		id: "upload-photos",
		message:
			"Ready to add your photos? Drag and drop files here or click to browse.",
		action: "Supported: JPG, PNG, GIF, WebP, HEIC",
		position: "top" as const,
		target: '[data-tour="upload-button"]',
		priority: "medium" as const,
		autoHide: 15,
	},

	EMPTY_LIBRARY: {
		id: "empty-library",
		message:
			"Your photo library is empty. Let's add some photos to get started!",
		action: "Click the upload button above",
		position: "center" as const,
		priority: "high" as const,
		condition: () => {
			// Check if library is empty
			const libraryState = localStorage.getItem("photo-library-state");
			if (!libraryState) return true;
			try {
				const state = JSON.parse(libraryState);
				return !state.photos || state.photos.length === 0;
			} catch {
				return true;
			}
		},
	},

	ADVANCED_SEARCH: {
		id: "advanced-search",
		message:
			'Try advanced search queries like "sunset with people" or "red car in city"',
		position: "bottom" as const,
		target: '[data-tour="search-bar"]',
		priority: "low" as const,
		trigger: "search-success",
		autoHide: 8,
	},

	BULK_SELECT: {
		id: "bulk-select",
		message: "Select multiple photos by holding Ctrl and clicking",
		action: "Or press Ctrl+A to select all",
		position: "top" as const,
		priority: "low" as const,
		trigger: "photo-selected",
		autoHide: 6,
	},

	ORGANIZE_FOLDERS: {
		id: "organize-folders",
		message:
			"Create folders to organize your photos by events, dates, or themes",
		position: "right" as const,
		target: '[data-tour="sidebar"]',
		priority: "medium" as const,
		trigger: "photos-uploaded",
		autoHide: 12,
	},

	KEYBOARD_SHORTCUTS: {
		id: "keyboard-shortcuts",
		message: "Use keyboard shortcuts for faster navigation",
		action: "Press Ctrl+K for search, Ctrl+B for sidebar",
		position: "center" as const,
		priority: "low" as const,
		trigger: "multiple-actions",
		autoHide: 10,
	},

	EXPORT_PHOTOS: {
		id: "export-photos",
		message: "Export selected photos in different formats and sizes",
		position: "left" as const,
		priority: "low" as const,
		trigger: "photos-selected",
		autoHide: 8,
	},

	SHARE_PHOTOS: {
		id: "share-photos",
		message: "Share photos directly from the app with customizable links",
		position: "left" as const,
		priority: "low" as const,
		trigger: "photos-selected",
		autoHide: 8,
	},
};

// Hook for triggering hints based on user actions
export function useHintTriggers() {
	const { showHint } = useHints();

	const triggerHint = (action: string, context?: unknown) => {
		switch (action) {
			case "app-loaded":
				// Show welcome hint after a short delay, only if contextual and not already shown
				setTimeout(() => {
					try {
						const already = localStorage.getItem("first-search-shown") === "1";
						const hasSearch = document.querySelector(
							'[data-tour="search-bar"]',
						);
						const hasDialog = document.querySelector('[role="dialog"]');
						if (!already && hasSearch && !hasDialog) {
							showHint(HINTS.FIRST_SEARCH);
							localStorage.setItem("first-search-shown", "1");
						}
					} catch {
						// best-effort only
					}
				}, 1200);
				break;

			case "library-empty":
				showHint(HINTS.EMPTY_LIBRARY);
				break;

			case "photos-uploaded":
				// Show organization hint after upload, but delay it to let user see results first
				setTimeout(() => {
					showHint(HINTS.ORGANIZE_FOLDERS);
				}, 2000);
				break;

			case "search-success": {
				// Show advanced search hint after successful search, but only if user hasn't seen it recently
				const lastAdvancedHint = localStorage.getItem(
					"last-advanced-search-hint",
				);
				const now = Date.now();
				if (
					!lastAdvancedHint ||
					now - parseInt(lastAdvancedHint) > 24 * 60 * 60 * 1000
				) {
					// 24 hours
					setTimeout(() => {
						showHint(HINTS.ADVANCED_SEARCH);
						localStorage.setItem("last-advanced-search-hint", now.toString());
					}, 3000);
				}
				break;
			}

			case "photo-selected": {
				// Only show bulk select hint if user hasn't selected multiple photos recently
				const recentBulkSelect = localStorage.getItem("last-bulk-select-hint");
				if (
					!recentBulkSelect ||
					Date.now() - parseInt(recentBulkSelect) > 7 * 24 * 60 * 60 * 1000
				) {
					// 7 days
					setTimeout(() => {
						showHint(HINTS.BULK_SELECT);
						localStorage.setItem(
							"last-bulk-select-hint",
							Date.now().toString(),
						);
					}, 1500);
				}
				break;
			}

			case "multiple-photos-selected":
				// Show export and share hints sequentially
				setTimeout(() => {
					showHint(HINTS.EXPORT_PHOTOS);
					setTimeout(() => {
						showHint(HINTS.SHARE_PHOTOS);
					}, 4000);
				}, 1000);
				break;

			case "keyboard-shortcut-used": {
				// Show keyboard shortcuts hint, but throttle it
				const lastKeyboardHint = localStorage.getItem(
					"last-keyboard-shortcuts-hint",
				);
				if (
					!lastKeyboardHint ||
					Date.now() - parseInt(lastKeyboardHint) > 3 * 24 * 60 * 60 * 1000
				) {
					// 3 days
					setTimeout(() => {
						showHint(HINTS.KEYBOARD_SHORTCUTS);
						localStorage.setItem(
							"last-keyboard-shortcuts-hint",
							Date.now().toString(),
						);
					}, 2000);
				}
				break;
			}

			case "search-no-results":
				// Show helpful hint when search returns no results
				showHint({
					id: "search-no-results-help",
					message: "Try broader search terms or check your spelling",
					action: "Examples: 'beach' instead of 'ocean waves'",
					position: "bottom",
					target: '[data-tour="search-bar"]',
					priority: "medium",
					autoHide: 6,
				});
				break;

			case "first-collection-created":
				// Congratulate user on creating their first collection
				setTimeout(() => {
					showHint({
						id: "collection-success",
						message: "Great! You've created your first photo collection",
						action: "Collections help you organize photos by events or themes",
						position: "center",
						priority: "medium",
						autoHide: 8,
					});
				}, 1500);
				break;

			case "advanced-search-used":
				// Encourage user after they try advanced search features
				setTimeout(() => {
					showHint({
						id: "advanced-search-feedback",
						message: "Nice! Advanced search gives you more precise results",
						action: "Try combining filters like 'person:john AND place:beach'",
						position: "bottom",
						target: '[data-tour="search-bar"]',
						priority: "low",
						autoHide: 10,
					});
				}, 2000);
				break;

			case "long-search-time":
				// Show hint when search takes longer than expected
				showHint({
					id: "search-performance-tip",
					message: "Large photo libraries may take longer to search",
					action: "Try more specific search terms for faster results",
					position: "bottom",
					target: '[data-tour="search-bar"]',
					priority: "low",
					autoHide: 5,
				});
				break;

			case "first-favorite":
				// Encourage favoriting photos
				setTimeout(() => {
					showHint({
						id: "favorite-tip",
						message: "💖 Favorited photos appear in your personal collection",
						action: "Click the heart icon to favorite photos you love",
						position: "top",
						priority: "low",
						autoHide: 6,
					});
				}, 1000);
				break;

			case "bulk-actions-available":
				// Show hint when multiple photos are selected
				showHint({
					id: "bulk-actions",
					message: "With multiple photos selected, you can:",
					action: "Export, share, or organize them together",
					position: "top",
					priority: "medium",
					autoHide: 8,
				});
				break;

			case "workspace-switch":
				// Show hint when user switches between workspaces
				setTimeout(() => {
					showHint({
						id: "workspace-awareness",
						message: "You're now viewing a different photo collection",
						action: "Each workspace keeps its photos and settings separate",
						position: "center",
						priority: "medium",
						autoHide: 6,
					});
				}, 500);
				break;

			case "offline-mode":
				// Show hint when app goes offline
				showHint({
					id: "offline-mode",
					message: "You're currently offline",
					action: "Some features may be limited until connection returns",
					position: "top",
					priority: "high",
					autoHide: 10,
				});
				break;

			case "feature-discovery":
				// Show hints for undiscovered features based on context
				{
					const contextObj = context as
						| { feature?: string; view?: string }
						| undefined;
					if (contextObj?.feature === "map" && contextObj?.view === "results") {
						setTimeout(() => {
							showHint({
								id: "map-view-discovery",
								message: "📍 View your photos on a map",
								action: "Click the map tab to see photo locations",
								position: "right",
								target: '[data-tour="map-tab"]',
								priority: "low",
								autoHide: 8,
							});
						}, 3000);
					} else if (contextObj?.feature === "collections") {
						setTimeout(() => {
							showHint({
								id: "collections-discovery",
								message: "📁 Organize photos into collections",
								action: "Create themed collections for events or trips",
								position: "right",
								target: '[data-tour="collections-tab"]',
								priority: "low",
								autoHide: 8,
							});
						}, 2500);
					}
				}
				break;

			default:
				break;
		}
	};

	return { triggerHint };
}

// Component for managing hint triggers based on app state
export function HintManager({ children }: { children: React.ReactNode }) {
	const { triggerHint } = useHintTriggers();

	useEffect(() => {
		// Trigger initial hints
		triggerHint("app-loaded");

		// Listen for custom events
		const handlePhotoUpload = () => triggerHint("photos-uploaded");
		const handleSearchSuccess = () => triggerHint("search-success");
		const handlePhotoSelect = () => triggerHint("photo-selected");
		const handleMultipleSelect = () => triggerHint("multiple-photos-selected");
		const handleKeyboardShortcut = () => triggerHint("keyboard-shortcut-used");

		document.addEventListener("photo-uploaded", handlePhotoUpload);
		document.addEventListener("search-success", handleSearchSuccess);
		document.addEventListener("photo-selected", handlePhotoSelect);
		document.addEventListener("multiple-photos-selected", handleMultipleSelect);
		document.addEventListener("keyboard-shortcut-used", handleKeyboardShortcut);

		return () => {
			document.removeEventListener("photo-uploaded", handlePhotoUpload);
			document.removeEventListener("search-success", handleSearchSuccess);
			document.removeEventListener("photo-selected", handlePhotoSelect);
			document.removeEventListener(
				"multiple-photos-selected",
				handleMultipleSelect,
			);
			document.removeEventListener(
				"keyboard-shortcut-used",
				handleKeyboardShortcut,
			);
		};
	}, [triggerHint]);

	return <>{children}</>;
}

// Progress tracking for user onboarding
export function useOnboardingProgress() {
	const [progress, setProgress] = useState({
		hasSearched: false,
		hasUploadedPhotos: false,
		hasCreatedFolder: false,
		hasUsedKeyboardShortcut: false,
		hasExportedPhotos: false,
		hasSharedPhotos: false,
	});

	useEffect(() => {
		const saved = localStorage.getItem("onboarding-progress");
		if (saved) {
			try {
				setProgress(JSON.parse(saved));
			} catch (e) {
				console.warn("Failed to parse onboarding progress:", e);
			}
		}
	}, []);

	const updateProgress = (key: keyof typeof progress, value: boolean) => {
		const newProgress = { ...progress, [key]: value };
		setProgress(newProgress);
		localStorage.setItem("onboarding-progress", JSON.stringify(newProgress));
	};

	const getCompletionPercentage = () => {
		const total = Object.keys(progress).length;
		const completed = Object.values(progress).filter(Boolean).length;
		return Math.round((completed / total) * 100);
	};

	const getNextSteps = () => {
		const steps = [];
		if (!progress.hasUploadedPhotos) {
			steps.push("Upload your first photos");
		}
		if (!progress.hasSearched) {
			steps.push("Try searching for photos");
		}
		if (!progress.hasCreatedFolder) {
			steps.push("Create a folder to organize photos");
		}
		if (!progress.hasUsedKeyboardShortcut) {
			steps.push("Use a keyboard shortcut");
		}
		return steps.slice(0, 3); // Show max 3 next steps
	};

	return {
		progress,
		updateProgress,
		getCompletionPercentage,
		getNextSteps,
	};
}
