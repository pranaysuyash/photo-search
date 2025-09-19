import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LibraryBrowser from "./LibraryBrowser";

vi.mock("../api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../api")>();
	return {
		...actual,
		thumbUrl: (_d: string, _e: string, p: string, _s: number) =>
			`mock://thumb${p}`,
		apiThumbBatch: vi.fn(async () => ({})),
	};
});

describe("LibraryBrowser", () => {
	it("shows empty state and loads", () => {
		const onLoad = vi.fn();
		const { rerender } = render(
			<LibraryBrowser
				dir="/d"
				engine="local"
				library={[]}
				onLoadLibrary={onLoad}
			/>,
		);
		expect(screen.getByText(/No items yet/)).toBeInTheDocument();
		fireEvent.click(screen.getByText("Reload"));
		expect(onLoad).toHaveBeenCalledWith(120, 0);
		rerender(
			<LibraryBrowser
				dir="/d"
				engine="local"
				library={["/a.jpg"]}
				onLoadLibrary={onLoad}
			/>,
		);
		expect(screen.getAllByRole("img").length).toBe(1);
	});
});
