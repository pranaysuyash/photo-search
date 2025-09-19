import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultsGrid } from "./ResultsGrid";

vi.mock("../api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../api")>();
	return {
		...actual,
		thumbUrl: (_dir: string, _engine: string, path: string, _size: number) =>
			`mock://thumb${path}`,
	};
});

describe("ResultsGrid", () => {
	const results = [
		{ path: "/a.jpg", score: 0.9 },
		{ path: "/b.jpg", score: 0.7 },
	];

	it("renders images and toggles selection", () => {
		const onToggle = vi.fn();
		const onOpen = vi.fn();
		render(
			<ResultsGrid
				dir="/pics"
				engine="local"
				results={results as unknown}
				selected={{}}
				onToggleSelect={onToggle}
				onOpen={onOpen}
			/>,
		);
		expect(screen.getAllByRole("img")).toHaveLength(2);
		const firstTile = screen.getByRole("button", { name: "Select /a.jpg" });
		fireEvent.click(firstTile);
		expect(onToggle).toHaveBeenCalledWith("/a.jpg");
		const secondTile = screen.getByRole("button", { name: "Select /b.jpg" });
		fireEvent.dblClick(secondTile);
		expect(onOpen).toHaveBeenCalledWith("/b.jpg");
	});

	it("hides score when showScore is false", () => {
		render(
			<ResultsGrid
				dir="/pics"
				engine="local"
				results={[{ path: "/c.jpg", score: 0.123 }] as unknown}
				selected={{}}
				onToggleSelect={() => {}}
				onOpen={() => {}}
				showScore={false}
			/>,
		);
		expect(screen.queryByText("0.12")).toBeNull();
	});
});
