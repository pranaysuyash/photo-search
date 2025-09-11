import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SavedSearches from "./SavedSearches";

describe("SavedSearches", () => {
	it("shows empty state", () => {
		render(<SavedSearches saved={[]} onRun={() => {}} onDelete={() => {}} />);
		expect(screen.getByText(/No saved searches yet/)).toBeInTheDocument();
	});

	it("renders items and triggers actions", () => {
		const onRun = vi.fn();
		const onDelete = vi.fn();
		render(
			<SavedSearches
				saved={[{ name: "Trip", query: "beach", top_k: 10 }]}
				onRun={onRun}
				onDelete={onDelete}
			/>,
		);
		fireEvent.click(screen.getByText("Run"));
		expect(onRun).toHaveBeenCalledWith("Trip", "beach", 10);
		fireEvent.click(screen.getByText("Delete"));
		expect(onDelete).toHaveBeenCalledWith("Trip");
	});
});
