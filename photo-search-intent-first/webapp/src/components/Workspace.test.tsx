import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Workspace from "./Workspace";

vi.mock("../api", () => ({
	apiWorkspaceAdd: vi.fn(async (path: string) => ({ folders: [path] })),
	apiWorkspaceRemove: vi.fn(async (_path: string) => ({ folders: [] })),
}));

describe("Workspace", () => {
	it("lists folders, removes, and adds", async () => {
		const setWorkspace = vi.fn();
		const { rerender } = render(
			<Workspace workspace={["/a"]} setWorkspace={setWorkspace} />,
		);
		fireEvent.click(screen.getByText("Remove"));
		await waitFor(() => expect(setWorkspace).toHaveBeenCalled());
		// Add
		rerender(<Workspace workspace={[]} setWorkspace={setWorkspace} />);
		const input = screen.getByPlaceholderText(
			"/path/to/folder",
		) as HTMLInputElement;
		input.value = "/b";
		fireEvent.click(screen.getByText("Add"));
		await waitFor(() => expect(setWorkspace).toHaveBeenCalledTimes(2));
	});
});
