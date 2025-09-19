import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePhotoStore } from "../stores/photoStore";
import { useSettingsStore } from "../stores/settingsStore";
import ResultsPanel from "./ResultsPanel";

// Keep real settings/photo stores but mock UI store to avoid subscription churn in tests
vi.mock("../stores/uiStore", () => ({
	useBusy: () => "",
}));

// Provide a lightweight settings store stub to avoid persist/hydration churn
vi.mock("../stores/settingsStore", () => {
	const state: unknown = {
		dir: "",
		engine: "local",
		useCaps: false,
		useOcr: false,
		hasText: false,
		place: "",
		showExplain: false,
	};
	const useSettingsStore = {
		setState: (partial: unknown) => {
			const next = typeof partial === "function" ? partial(state) : partial;
			Object.assign(state, next);
		},
	} as unknown;
	return {
		useSettingsStore,
		useDir: () => state.dir,
		useEngine: () => state.engine,
		useCaptionsEnabled: () => state.useCaps,
		useOcrEnabled: () => state.useOcr,
		useHasText: () => state.hasText,
		usePlace: () => state.place,
		useShowExplain: () => state.showExplain,
		useSettingsActions: () => ({ setShowExplain: vi.fn() }),
	};
});

vi.mock("../api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../api")>();
	return {
		...actual,
		thumbUrl: (_d: string, _e: string, p: string, _s: number) =>
			`mock://thumb${p}`,
		apiOpen: async () => ({ ok: true }),
		apiSetFavorite: vi.fn(async () => ({ ok: true })),
	};
});

describe("ResultsPanel", () => {
	it("shows empty states and renders grid when results exist", () => {
		useSettingsStore.setState({ dir: "/d", engine: "local" } as unknown);
		usePhotoStore.setState({ results: [], query: "" } as unknown);
		const { rerender } = render(<ResultsPanel />);
		expect(screen.getByText(/Run a search/)).toBeInTheDocument();
		// With a query but no results
		usePhotoStore.setState({ query: "foo" } as unknown);
		rerender(<ResultsPanel />);
		expect(screen.getByText(/No results/)).toBeInTheDocument();
		// With results
		usePhotoStore.setState({
			results: [{ path: "/a.jpg", score: 0.9 }],
		} as unknown);
		rerender(<ResultsPanel />);
		expect(screen.getByText("Results")).toBeInTheDocument();
		expect(screen.getByText("1 found")).toBeInTheDocument();
	});

	it("selects all and favorites selected", async () => {
		const { apiSetFavorite } = await import("../api");
		useSettingsStore.setState({ dir: "/d", engine: "local" } as unknown);
		usePhotoStore.setState({
			results: [
				{ path: "/a.jpg", score: 0.9 },
				{ path: "/b.jpg", score: 0.8 },
			],
			query: "q",
		} as unknown);
		render(<ResultsPanel />);
		fireEvent.click(screen.getByText("Select all"));
		fireEvent.click(screen.getByText("♥ Favorite selected"));
		await waitFor(() => {
			expect(
				(apiSetFavorite as unknown).mock.calls.length,
			).toBeGreaterThanOrEqual(1);
		});
	});
});
