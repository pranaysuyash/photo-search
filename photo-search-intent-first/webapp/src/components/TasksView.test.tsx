import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TasksView from "./TasksView";

vi.mock("../api", () => ({
	apiTodo: vi.fn(async () => ({ text: "# Title\n\n- One\n- Two" })),
	apiAnalytics: vi.fn(async () => ({ events: [] })),
	apiAutotag: vi.fn(async () => ({ updated: 0 })),
}));

vi.mock("../stores/settingsStore", () => ({
	useDir: vi.fn(() => "/test/dir"),
	useEngine: vi.fn(() => "local"),
}));

describe("TasksView", () => {
	it("renders markdown from apiTodo", async () => {
		render(<TasksView />);
		expect(await screen.findByText("Title")).toBeInTheDocument();
		expect(await screen.findByText("One")).toBeInTheDocument();
		expect(await screen.findByText("Two")).toBeInTheDocument();
	});
});
