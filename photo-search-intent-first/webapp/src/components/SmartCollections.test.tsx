import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SmartCollections from "./SmartCollections";

vi.mock("../api", () => ({
	apiSetSmart: vi.fn(async () => ({ ok: true })),
	apiGetSmart: vi.fn(async () => ({ smart: { Trip: { query: "beach" } } })),
	apiResolveSmart: vi.fn(async () => ({
		search_id: "s1",
		results: [{ path: "/a.jpg", score: 1 }],
	})),
	apiDeleteSmart: vi.fn(async () => ({ ok: true, deleted: "Trip" })),
}));

describe("SmartCollections", () => {
	const baseProps = {
		dir: "/d",
		engine: "local",
		topK: 24,
		smart: {},
		setSmart: vi.fn(),
		setResults: vi.fn(),
		setSearchId: vi.fn(),
		setNote: vi.fn(),
		query: "beach",
		favOnly: false,
		tagFilter: "sun,sea",
		useCaps: false,
		useOcr: false,
		hasText: false,
		camera: "",
		isoMin: "",
		isoMax: "",
		fMin: "",
		fMax: "",
		place: "",
		persons: [],
	};

	it("refreshes and saves current as smart", async () => {
		const setSmart = vi.fn();
		const setNote = vi.fn();
		const props = { ...baseProps, setSmart, setNote };
		render(<SmartCollections {...props} />);
		fireEvent.click(screen.getByText("Refresh"));
		await waitFor(() => expect(setSmart).toHaveBeenCalled());
		vi.spyOn(window, "prompt").mockReturnValue("Beachy");
		fireEvent.click(screen.getByText("Save current as Smart"));
		await waitFor(() => expect(setNote).toHaveBeenCalled());
	});

	it("opens and deletes a smart collection", async () => {
		const setResults = vi.fn();
		const setSearchId = vi.fn();
		const setSmart = vi.fn();
		const setNote = vi.fn();
		vi.spyOn(window, "confirm").mockReturnValue(true);
		const props = {
			...baseProps,
			smart: { Trip: { query: "q" } },
			setResults,
			setSearchId,
			setSmart,
			setNote,
		};
		render(<SmartCollections {...props} />);
		fireEvent.click(screen.getByText("Open"));
		await waitFor(() => expect(setResults).toHaveBeenCalled());
		fireEvent.click(screen.getByText("Delete"));
		await waitFor(() => expect(setSmart).toHaveBeenCalled());
	});
});
