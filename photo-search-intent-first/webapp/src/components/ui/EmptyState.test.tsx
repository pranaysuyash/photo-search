import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, NoCollectionsEmpty, NoResultsEmpty } from "./EmptyState";

describe("EmptyState UI", () => {
	it("renders title, description, and action", () => {
		const onClick = vi.fn();
		render(
			<EmptyState
				title="T"
				description="D"
				action={{ label: "Do", onClick }}
			/>,
		);
		expect(screen.getByText("T")).toBeInTheDocument();
		expect(screen.getByText("D")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Do"));
		expect(onClick).toHaveBeenCalled();
	});

	it("presets render without crashing", () => {
		render(<NoResultsEmpty />);
		expect(screen.getByText(/No results/)).toBeInTheDocument();
		render(<NoCollectionsEmpty onCreate={() => {}} />);
		expect(screen.getByText(/Create Collection/)).toBeInTheDocument();
	});
});
