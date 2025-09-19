import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/FilterPreset", () => ({
	applyFilterPreset: vi.fn(),
}));

import { applyFilterPreset, type FilterPreset } from "../models/FilterPreset";
import { useFilterPresets } from "./useFilterPresets";

const mockSetters = {
	setFavOnly: vi.fn(),
	setTagFilter: vi.fn(),
	setPlace: vi.fn(),
	setCamera: vi.fn(),
	setIsoMin: vi.fn(),
	setIsoMax: vi.fn(),
	setFMin: vi.fn(),
	setFMax: vi.fn(),
	setDateFrom: vi.fn(),
	setDateTo: vi.fn(),
	setUseCaps: vi.fn(),
	setUseOcr: vi.fn(),
	setHasText: vi.fn(),
	setRatingMin: vi.fn(),
};

describe("useFilterPresets", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	const samplePreset: FilterPreset = {
		id: "preset-1",
		name: "Favorites",
		createdAt: 1,
		updatedAt: 1,
		filters: { favOnly: true },
	};

	it("loads presets from localStorage on init", () => {
		localStorage.setItem("ps_filter_presets", JSON.stringify([samplePreset]));
		const { result } = renderHook(() => useFilterPresets(mockSetters));
		expect(result.current.filterPresets).toHaveLength(1);
		expect(result.current.filterPresets[0]).toMatchObject({ id: "preset-1" });
	});

	it("saves a new preset and persists to localStorage", () => {
		const { result } = renderHook(() => useFilterPresets(mockSetters));

		act(() => {
			result.current.savePreset(samplePreset);
		});

		expect(result.current.filterPresets).toHaveLength(1);
		const stored = JSON.parse(
			localStorage.getItem("ps_filter_presets") || "[]",
		);
		expect(stored).toHaveLength(1);
	});

	it("updates an existing preset when ids match", () => {
		const existing = { ...samplePreset, name: "Old" };
		localStorage.setItem("ps_filter_presets", JSON.stringify([existing]));

		const { result } = renderHook(() => useFilterPresets(mockSetters));

		act(() => {
			result.current.savePreset({ ...samplePreset, name: "Updated" });
		});

		expect(result.current.filterPresets[0].name).toBe("Updated");
	});

	it("invokes applyFilterPreset when loading", () => {
		const { result } = renderHook(() => useFilterPresets(mockSetters));
		act(() => {
			result.current.loadPreset(samplePreset);
		});

		expect(applyFilterPreset).toHaveBeenCalledWith(samplePreset, mockSetters);
	});

	it("deletes presets by id", () => {
		const { result } = renderHook(() => useFilterPresets(mockSetters));
		act(() => {
			result.current.savePreset(samplePreset);
		});

		act(() => {
			result.current.deletePreset("preset-1");
		});

		expect(result.current.filterPresets).toHaveLength(0);
	});
});
