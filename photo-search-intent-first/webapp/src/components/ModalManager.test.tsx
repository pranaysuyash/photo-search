import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { useModalContext } from "../contexts/ModalContext";
import { useModalControls } from "../hooks/useModalControls";
import { useModalStatus } from "../hooks/useModalStatus";
import { render } from "../test/test-utils";
import ModalManager from "./ModalManager";

// Mock analytics fetches to prevent MSW unhandled request errors in these unit tests
const originalFetch: typeof fetch = global.fetch;
beforeAll(() => {
  vi.spyOn(global, "fetch").mockImplementation(
    (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1]
    ) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/analytics")) {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true, data: { jobs: [] } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      // originalFetch maintains correct typing here
      return originalFetch(input, init);
    }
  );
});
afterAll(() => {
  (global.fetch as unknown as { mockRestore?: () => void }).mockRestore?.();
});

// Test component that uses modal hooks
function TestModalComponent() {
  const { actions } = useModalContext();
  const modalControls = useModalControls();
  const modalStatus = useModalStatus();

  return (
    <div>
      <div data-testid="modal-status">
        Any Open: {modalStatus.anyOpen ? "true" : "false"}
        Help Open: {modalStatus.isOpen("help") ? "true" : "false"}
        Search Open: {modalStatus.isOpen("search") ? "true" : "false"}
        Diagnostics Open: {modalStatus.isOpen("diagnostics") ? "true" : "false"}
      </div>

      <button
        type="button"
        data-testid="open-help"
        onClick={() => actions.open("help")}
      >
        Open Help
      </button>

      <button
        type="button"
        data-testid="open-search"
        onClick={() => modalControls.openSearch()}
      >
        Open Search
      </button>

      <button
        type="button"
        data-testid="open-diagnostics"
        onClick={() => modalControls.openDiagnostics()}
      >
        Open Diagnostics
      </button>

      <button
        type="button"
        data-testid="close-help"
        onClick={() => actions.close("help")}
      >
        Close Help
      </button>

      <button
        type="button"
        data-testid="close-all"
        onClick={() => modalControls.closeAll()}
      >
        Close All
      </button>
      <ModalManager />
    </div>
  );
}

describe("Modal System Integration", () => {
  it("should render modal controls and status without crashing", () => {
    render(<TestModalComponent />);

    // Check that the component renders
    expect(screen.getByTestId("modal-status")).toBeInTheDocument();
    expect(screen.getByTestId("open-help")).toBeInTheDocument();
    expect(screen.getByTestId("open-search")).toBeInTheDocument();
    expect(screen.getByTestId("open-diagnostics")).toBeInTheDocument();
    expect(screen.getByTestId("close-help")).toBeInTheDocument();
    expect(screen.getByTestId("close-all")).toBeInTheDocument();

    // Check initial status (should show all closed)
    expect(screen.getByTestId("modal-status").textContent).toContain(
      "Any Open: false"
    );
  });

  it("should allow clicking modal control buttons", () => {
    render(<TestModalComponent />);

    // Click buttons to ensure they don't crash
    fireEvent.click(screen.getByTestId("open-help"));
    fireEvent.click(screen.getByTestId("open-search"));
    fireEvent.click(screen.getByTestId("open-diagnostics"));
    fireEvent.click(screen.getByTestId("close-help"));
    fireEvent.click(screen.getByTestId("close-all"));

    // If we get here without crashing, the test passes
    expect(true).toBe(true);
  });

  it("applies aria-hidden and inert to background when a modal opens", async () => {
    render(<TestModalComponent />);
    const openHelp = screen.getByTestId("open-help");
    fireEvent.click(openHelp);
    await waitFor(() => {
      const modalRoot = document.querySelector("[data-modal-root]");
      expect(modalRoot).toBeTruthy();
    });
    const modalRoot = document.querySelector("[data-modal-root]");
    if (modalRoot?.parentElement) {
      const siblings = Array.from(modalRoot.parentElement.children).filter(
        (c) => c !== modalRoot
      ) as HTMLElement[];
      siblings.forEach((sib) => {
        expect(sib.getAttribute("aria-hidden")).toBe("true");
        // @ts-ignore inert polyfill
        expect(!!sib.inert).toBe(true);
      });
    }
  });

  it("announces modal open and close via live region", async () => {
    render(<TestModalComponent />);
    const live = () =>
      document.querySelector(
        "[data-modal-root] .sr-only"
      ) as HTMLElement | null;
    fireEvent.click(screen.getByTestId("open-help"));
    await waitFor(() =>
      expect(live()?.textContent || "").toMatch(/Modal open/i)
    );
    fireEvent.click(screen.getByTestId("close-all"));
    await waitFor(() =>
      expect(live()?.textContent || "").toMatch(/All modals closed/i)
    );
  });

  it("closes only topmost modal on Escape (stack handling)", async () => {
    render(<TestModalComponent />);
    fireEvent.click(screen.getByTestId("open-help"));
    fireEvent.click(screen.getByTestId("open-diagnostics"));
    // Wait for diagnostics to reflect open
    await waitFor(() => {
      const status = screen.getByTestId("modal-status").textContent || "";
      expect(status).toMatch(/Diagnostics Open: true/);
    });
    // First Escape closes diagnostics
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      const status = screen.getByTestId("modal-status").textContent || "";
      expect(status).toMatch(/Diagnostics Open: false/);
      expect(status).toMatch(/Help Open: true/);
    });
    // Second Escape closes help
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      const status2 = screen.getByTestId("modal-status").textContent || "";
      expect(status2).toMatch(/Help Open: false/);
    });
  });

  it("restores focus to previously focused element after closing last modal", () => {
    render(<TestModalComponent />);
    const openHelp = screen.getByTestId("open-help");
    openHelp.focus();
    fireEvent.click(openHelp); // open help
    // Close via Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(openHelp);
  });
});
