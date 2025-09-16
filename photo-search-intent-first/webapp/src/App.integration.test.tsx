import { fireEvent, render, screen } from "./test/test-utils";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App integration flows", () => {
  it("renders results and opens Lightbox from /search", async () => {
    window.history.pushState({}, "", "/search");
    const { usePhotoActions } = await import("./stores/useStores");
    render(<App />);
    const actions = usePhotoActions();
    // Inject two results
    actions.setResults([
      { path: "/a.jpg", score: 0.9 },
      { path: "/b.jpg", score: 0.8 },
    ]);
    // Focus grid and press Enter to open first
    fireEvent.keyDown(window, { key: "Enter" });
    // Lightbox renders an element with role img and aria-label "Image viewer"
    expect(
      await screen.findByRole("img", { name: "Image viewer" })
    ).toBeInTheDocument();
  });

  it("share route shows password form (password_required)", async () => {
    // Mock fetch for share detail
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: false, error: "password_required" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as unknown as typeof fetch;
    try {
      window.history.pushState({}, "", "/share/abc");
      render(<App />);
      // Password input should appear
      expect(await screen.findByText(/Password/i)).toBeInTheDocument();
    } finally {
      global.fetch = originalFetch as any;
    }
  });
});

