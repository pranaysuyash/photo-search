import { fireEvent, render, screen, waitFor } from "../test/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ModularApp } from "../ModularApp";

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    apiSearch: vi.fn(async () => ({
      search_id: "s1",
      results: [
        { path: "/1.jpg", score: 0.9 },
        { path: "/2.jpg", score: 0.8 },
        { path: "/3.jpg", score: 0.7 },
      ],
    })),
    apiSearchWorkspace: vi.fn(async () => ({ search_id: "w1", results: [] })),
    apiGetFavorites: vi.fn(async () => ({ favorites: [] })),
    apiLibrary: vi.fn(async () => ({ total: 0, offset: 0, limit: 120, paths: [] })),
    apiGetCollections: vi.fn(async () => ({ collections: {} })),
    apiWorkspaceList: vi.fn(async () => ({ folders: [] })),
    apiDiagnostics: vi.fn(async () => ({ folder: "/d", engines: [], free_gb: 100, os: "macOS" })),
  };
});

describe("ModularApp search integration", () => {
  it("performs a search and renders returned results", async () => {
    window.history.pushState({}, "", "/search");
    render(<ModularApp />);

    const searchInput = await screen.findByPlaceholderText("Search photos...");
    fireEvent.change(searchInput, { target: { value: "sunset" } });
    fireEvent.keyPress(searchInput, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
      keyCode: 13,
    });

    const { apiSearch } = await import("../api");
    await waitFor(() => expect(vi.mocked(apiSearch)).toHaveBeenCalledWith(expect.any(String), "sunset", expect.any(String), expect.any(Number), expect.any(Object)));

    expect(await screen.findByRole("button", { name: "1.jpg" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "2.jpg" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "3.jpg" })).toBeInTheDocument();
  });
});
