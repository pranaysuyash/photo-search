import { useCallback, useEffect, useState } from "react";
import { applyFilterPreset, type FilterPreset } from "../models/FilterPreset";

export interface FilterPresetSetters {
	setFavOnly: (value: boolean) => void;
	setTagFilter: (value: string) => void;
	setPlace: (value: string) => void;
	setCamera: (value: string) => void;
	setIsoMin: (value: string) => void;
	setIsoMax: (value: string) => void;
	setFMin: (value: string) => void;
	setFMax: (value: string) => void;
	setDateFrom: (value: string) => void;
	setDateTo: (value: string) => void;
	setUseCaps: (value: boolean) => void;
	setUseOcr: (value: boolean) => void;
	setHasText: (value: boolean) => void;
	setRatingMin: (value: number) => void;
}

const STORAGE_KEY = "ps_filter_presets";

function readStoredPresets(): FilterPreset[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		const parsed = JSON.parse(stored);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((item): item is FilterPreset => {
			return (
				typeof item === "object" &&
				item !== null &&
				typeof item.id === "string" &&
				typeof item.name === "string"
			);
		});
	} catch {
		return [];
	}
}

export interface UseFilterPresetsResult {
	filterPresets: FilterPreset[];
	savePreset: (preset: FilterPreset) => void;
	loadPreset: (preset: FilterPreset) => void;
	deletePreset: (presetId: string) => void;
}

export function useFilterPresets(
	setters: FilterPresetSetters,
): UseFilterPresetsResult {
	const [filterPresets, setFilterPresets] = useState<FilterPreset[]>(() =>
		readStoredPresets(),
	);

	const savePreset = useCallback((preset: FilterPreset) => {
		setFilterPresets((prev) => {
			const existingIndex = prev.findIndex((p) => p.id === preset.id);
			if (existingIndex >= 0) {
				const next = [...prev];
				next[existingIndex] = preset;
				return next;
			}
			return [...prev, preset];
		});
	}, []);

	const loadPreset = useCallback(
		(preset: FilterPreset) => {
			applyFilterPreset(preset, setters);
		},
		[setters],
	);

	const deletePreset = useCallback((presetId: string) => {
		setFilterPresets((prev) => prev.filter((preset) => preset.id !== presetId));
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(filterPresets));
		} catch (error) {
			console.warn("Failed to save filter presets to localStorage:", error);
		}
	}, [filterPresets]);

	return {
		filterPresets,
		savePreset,
		loadPreset,
		deletePreset,
	};
}
