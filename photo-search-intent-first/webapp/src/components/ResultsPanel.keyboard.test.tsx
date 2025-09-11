import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePhotoStore } from "../stores/photoStore";
import { useSettingsStore } from "../stores/settingsStore";
import ResultsPanel from "./ResultsPanel";

// Mock UI store selector to a stable value to avoid re-render loops in tests
vi.mock("../stores/uiStore", () => ({
	useBusy: () => "",
}));

// Provide a lightweight settings store stub to avoid persist/hydration churn
vi.mock("../stores/settingsStore", () => {
	const state: any = {
		dir: "",
		engine: "local",
		useCaps: false,
		useOcr: false,
		hasText: false,
		place: "",
		showExplain: false,
	};
	const useSettingsStore = {
		setState: (partial: any) => {
			const next = typeof partial === "function" ? partial(state) : partial;
			Object.assign(state, next);
		},
	} as any;
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

vi.mock("../api", () => ({
	thumbUrl: (_d: string, _e: string, p: string, _s: number) =>
		`mock://thumb${p}`,
	apiOpen: vi.fn(async () => ({ ok: true })),
	apiSetFavorite: vi.fn(async () => ({ ok: true })),
}));

function press(key: string) {
	window.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

describe("ResultsPanel keyboard + lightbox", () => {
	it("opens lightbox on Enter and favorites with f", async () => {
		const { apiSetFavorite, apiOpen } = await import("../api");
		useSettingsStore.setState({ dir: "/d", engine: "local" as any });
		usePhotoStore.setState({
			results: [
				{ path: "/a.jpg", score: 0.9 },
				{ path: "/b.jpg", score: 0.8 },
			],
			query: "q",
			fav: [],
		} as any);
		render(<ResultsPanel />);
		// Open first detail with Enter
		press("Enter");
		await waitFor(() => expect(screen.getByText("Close")).toBeInTheDocument());
		// Favorite current photo with 'f'
		press("f");
		await waitFor(() =>
			expect((apiSetFavorite as any).mock.calls.length).toBeGreaterThan(0),
		);
		// Reveal click
		fireEvent.click(screen.getByText("Reveal in Finder/Explorer"));
		await waitFor(() =>
			expect((apiOpen as any).mock.calls.length).toBeGreaterThan(0),
		);
		// Close lightbox with Escape before using grid shortcuts
		press("Escape");
		await waitFor(() => expect(screen.queryByText("Close")).toBeNull());
		// Select toggles via space, then clear with 'c', select all with 'a'
		press(" ");
		// Expect at least one selected gridcell
		await waitFor(() => {
			const cells = document.querySelectorAll(
				'[role="gridcell"][aria-selected="true"]',
			);
			expect(cells.length).toBeGreaterThan(0);
		});
		press("c");
		await waitFor(() => {
			const cells = document.querySelectorAll(
				'[role="gridcell"][aria-selected="true"]',
			);
			expect(cells.length).toBe(0);
		});
		press("a");
		await waitFor(() => {
			const cells = document.querySelectorAll(
				'[role="gridcell"][aria-selected="true"]',
			);
			expect(cells.length).toBeGreaterThan(0);
		});
		// Navigate right, then close with Escape
		press("ArrowRight");
		press("Escape");
		await waitFor(() => expect(screen.queryByText("Close")).toBeNull());
	});
});
