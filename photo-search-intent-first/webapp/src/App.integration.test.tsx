import { useEffect } from "react";
import { act, fireEvent, render, screen, waitFor } from "./test/test-utils";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { usePhotoActions } from "./stores/useStores";

describe("App integration flows", () => {
  it("renders results and opens Lightbox from /search", async () => {
    window.history.pushState({}, "", "/search");
    let actionsRef: ReturnType<typeof usePhotoActions> | null = null;

    const Harness = ({ children }: { children: React.ReactNode }) => {
      const actions = usePhotoActions();
      useEffect(() => {
        actionsRef = actions;
      }, [actions]);
      return <>{children}</>;
    };

    render(
      <Harness>
        <App />
      </Harness>,
    );

    await waitFor(() => expect(actionsRef).toBeTruthy());

    act(() => {
      actionsRef?.setResults([
        { path: "/a.jpg", score: 0.9 },
        { path: "/b.jpg", score: 0.8 },
      ]);
    });

    fireEvent.keyDown(window, { key: "Enter" });
    expect(await screen.findByRole("img", { name: "Image viewer" })).toBeInTheDocument();
  });

  it("share route shows password form (password_required)", async () => {
    const originalFetch: typeof fetch | undefined = global.fetch as
      | typeof fetch
      | undefined;
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ok: false, error: "password_required" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ) as unknown as typeof fetch;
    try {
      window.history.pushState({}, "", "/share/abc");
      render(<App />);
      expect(await screen.findByText(/Password/i)).toBeInTheDocument();
    } finally {
      if (originalFetch) {
        global.fetch = originalFetch;
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - in some environments fetch may be undefined
        delete global.fetch;
      }
    }
  });
});
