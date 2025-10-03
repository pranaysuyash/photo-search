/**
 * Auto-Curation Hook
 * Provides state management and operations for the auto-curation system
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AutoCurationEngine,
	type AutoCurationOptions,
	type AutoCurationResult,
	CurationAction,
	SmartCollectionSuggestion,
} from "../services/AutoCurationEngine";

export interface UseAutoCurationOptions {
	photoPaths: string[];
	options?: AutoCurationOptions;
	onCreateCollection?: (name: string, photos: string[]) => void;
	onDeletePhotos?: (paths: string[]) => void;
	onRatePhotos?: (paths: string[], rating: number) => void;
	onTagPhotos?: (paths: string[], tags: string[]) => void;
}

export interface AutoCurationState {
	isAnalyzing: boolean;
	result: AutoCurationResult | null;
	selectedActions: Set<string>;
	selectedCollections: Set<string>;
	progress: {
		current: number;
		total: number;
		currentStep: string;
		estimatedTimeRemaining: number;
	} | null;
	options: AutoCurationOptions;
}

export interface AutoCurationActions {
	startAnalysis: () => Promise<void>;
	executeSelectedActions: () => Promise<void>;
	createSelectedCollections: () => Promise<void>;
	selectAllActions: () => void;
	deselectAllActions: () => void;
	selectAllCollections: () => void;
	deselectAllCollections: () => void;
	toggleActionSelection: (actionId: string) => void;
	toggleCollectionSelection: (collectionName: string) => void;
	updateOptions: (options: Partial<AutoCurationOptions>) => void;
	clearResults: () => void;
}

export function useAutoCuration({
	photoPaths,
	options: initialOptions = {},
	onCreateCollection,
	onDeletePhotos,
	onRatePhotos,
	onTagPhotos,
}: UseAutoCurationOptions) {
	const [state, setState] = useState<AutoCurationState>({
		isAnalyzing: false,
		result: null,
		selectedActions: new Set(),
		selectedCollections: new Set(),
		progress: null,
		options: {
			enableQualityAssessment: true,
			enableDuplicateDetection: true,
			enableEventDetection: true,
			enableSmartGrouping: true,
			qualityThreshold: 50,
			duplicateThreshold: 85,
			maxPhotosPerCollection: 100,
			...initialOptions,
		},
	});

	const curationEngine = useMemo(
		() => AutoCurationEngine.getInstance(state.options),
		[state.options],
	);

	const setProgress = useCallback((progress: any) => {
		setState((prev) => ({
			...prev,
			progress: {
				current: progress.processed_photos,
				total: progress.total_photos,
				currentStep: progress.current_step,
				estimatedTimeRemaining: progress.estimated_time_remaining,
			},
		}));
	}, []);

	const startAnalysis = useCallback(async () => {
		if (photoPaths.length === 0) {
			throw new Error("No photos selected for analysis");
		}

		setState((prev) => ({
			...prev,
			isAnalyzing: true,
			result: null,
			selectedActions: new Set(),
			selectedCollections: new Set(),
			progress: null,
		}));

		try {
			const analysisResult = await curationEngine.analyzePhotos(
				photoPaths,
				setProgress,
			);

			setState((prev) => ({
				...prev,
				result: analysisResult,
				isAnalyzing: false,
				progress: null,
			}));

			return analysisResult;
		} catch (error) {
			setState((prev) => ({
				...prev,
				isAnalyzing: false,
				progress: null,
			}));
			throw error;
		}
	}, [photoPaths, curationEngine, setProgress]);

	const executeSelectedActions = useCallback(async () => {
		if (!state.result || state.selectedActions.size === 0) {
			return;
		}

		const actions = state.result.actions.filter((action) =>
			state.selectedActions.has(action.description),
		);

		const executedActions: string[] = [];
		const failedActions: string[] = [];

		for (const action of actions) {
			try {
				switch (action.type) {
					case "create_collection":
						if (onCreateCollection) {
							const collectionName = action.description.includes("Auto-Created")
								? action.description
								: `Auto-Created Collection - ${action.description}`;
							onCreateCollection(collectionName, action.photos);
						}
						break;

					case "delete_duplicates":
						if (onDeletePhotos) {
							onDeletePhotos(action.photos);
						}
						break;

					case "rate_photos":
						if (onRatePhotos) {
							const rating = action.description.includes("5-star")
								? 5
								: action.description.includes("4-star")
									? 4
									: action.description.includes("3-star")
										? 3
										: action.description.includes("2-star")
											? 2
											: 1;
							onRatePhotos(action.photos, rating);
						}
						break;

					case "tag_photos":
						if (onTagPhotos) {
							const tags = ["auto-curation"];
							if (action.description.includes("high-quality"))
								tags.push("high-quality");
							if (action.description.includes("low-quality"))
								tags.push("low-quality");
							if (action.description.includes("duplicate"))
								tags.push("duplicate");
							onTagPhotos(action.photos, tags);
						}
						break;

					case "move_photos":
						// Would need target collection for this action
						if (onCreateCollection && action.target_collection) {
							onCreateCollection(action.target_collection, action.photos);
						}
						break;
				}

				executedActions.push(action.description);
			} catch (error) {
				console.error(`Failed to execute action: ${action.description}`, error);
				failedActions.push(action.description);
			}
		}

		setState((prev) => ({
			...prev,
			selectedActions: new Set(),
		}));

		return {
			executed: executedActions,
			failed: failedActions,
			total: actions.length,
		};
	}, [
		state.result,
		state.selectedActions,
		onCreateCollection,
		onDeletePhotos,
		onRatePhotos,
		onTagPhotos,
	]);

	const createSelectedCollections = useCallback(async () => {
		if (!state.result || state.selectedCollections.size === 0) {
			return;
		}

		const collections = state.result.collections.filter((collection) =>
			state.selectedCollections.has(collection.name),
		);

		const createdCollections: string[] = [];
		const failedCollections: string[] = [];

		for (const collection of collections) {
			try {
				if (onCreateCollection) {
					onCreateCollection(collection.name, collection.photos);
					createdCollections.push(collection.name);
				}
			} catch (error) {
				console.error(`Failed to create collection: ${collection.name}`, error);
				failedCollections.push(collection.name);
			}
		}

		setState((prev) => ({
			...prev,
			selectedCollections: new Set(),
		}));

		return {
			created: createdCollections,
			failed: failedCollections,
			total: collections.length,
		};
	}, [state.result, state.selectedCollections, onCreateCollection]);

	const selectAllActions = useCallback(() => {
		if (state.result) {
			setState((prev) => ({
				...prev,
				selectedActions: new Set(
					prev.result?.actions.map((a) => a.description) || [],
				),
			}));
		}
	}, [state.result]);

	const deselectAllActions = useCallback(() => {
		setState((prev) => ({
			...prev,
			selectedActions: new Set(),
		}));
	}, []);

	const selectAllCollections = useCallback(() => {
		if (state.result) {
			setState((prev) => ({
				...prev,
				selectedCollections: new Set(
					prev.result?.collections.map((c) => c.name) || [],
				),
			}));
		}
	}, [state.result]);

	const deselectAllCollections = useCallback(() => {
		setState((prev) => ({
			...prev,
			selectedCollections: new Set(),
		}));
	}, []);

	const toggleActionSelection = useCallback((actionId: string) => {
		setState((prev) => {
			const newSelected = new Set(prev.selectedActions);
			if (newSelected.has(actionId)) {
				newSelected.delete(actionId);
			} else {
				newSelected.add(actionId);
			}
			return { ...prev, selectedActions: newSelected };
		});
	}, []);

	const toggleCollectionSelection = useCallback((collectionName: string) => {
		setState((prev) => {
			const newSelected = new Set(prev.selectedCollections);
			if (newSelected.has(collectionName)) {
				newSelected.delete(collectionName);
			} else {
				newSelected.add(collectionName);
			}
			return { ...prev, selectedCollections: newSelected };
		});
	}, []);

	const updateOptions = useCallback(
		(newOptions: Partial<AutoCurationOptions>) => {
			setState((prev) => ({
				...prev,
				options: { ...prev.options, ...newOptions },
			}));
		},
		[],
	);

	const clearResults = useCallback(() => {
		setState((prev) => ({
			...prev,
			result: null,
			selectedActions: new Set(),
			selectedCollections: new Set(),
			progress: null,
		}));
	}, []);

	// Derived values
	const hasResults = state.result !== null;
	const hasSelectedActions = state.selectedActions.size > 0;
	const hasSelectedCollections = state.selectedCollections.size > 0;
	const totalPhotos = photoPaths.length;
	const analysisProgress = state.progress
		? (state.progress.current / state.progress.total) * 100
		: 0;

	const summaryStats = useMemo(() => {
		if (!state.result) return null;

		return {
			totalPhotosAnalyzed: state.result.summary.total_photos_analyzed,
			duplicatesFound: state.result.summary.duplicates_found,
			eventsDetected: state.result.summary.events_detected,
			smartCollectionsSuggested:
				state.result.summary.smart_collections_suggested,
			qualityRatingsAssigned: state.result.summary.quality_ratings_assigned,
			processingTime: state.result.summary.processing_time,
			photosPerSecond:
				totalPhotos > 0
					? (
							state.result.summary.total_photos_analyzed /
							(state.result.summary.processing_time / 1000)
						).toFixed(2)
					: "0",
			averageQualityScore:
				state.result.analysis.length > 0
					? Math.round(
							state.result.analysis.reduce(
								(sum, a) => sum + a.quality.overall,
								0,
							) / state.result.analysis.length,
						)
					: 0,
		};
	}, [state.result, totalPhotos]);

	const actions = useMemo(() => {
		return {
			startAnalysis,
			executeSelectedActions,
			createSelectedCollections,
			selectAllActions,
			deselectAllActions,
			selectAllCollections,
			deselectAllCollections,
			toggleActionSelection,
			toggleCollectionSelection,
			updateOptions,
			clearResults,
		};
	}, [
		startAnalysis,
		executeSelectedActions,
		createSelectedCollections,
		selectAllActions,
		deselectAllActions,
		selectAllCollections,
		deselectAllCollections,
		toggleActionSelection,
		toggleCollectionSelection,
		updateOptions,
		clearResults,
	]);

	return {
		...state,
		...actions,
		// Derived values
		hasResults,
		hasSelectedActions,
		hasSelectedCollections,
		totalPhotos,
		analysisProgress,
		summaryStats,
	};
}

export default useAutoCuration;
