import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResultsPanel from "./ResultsPanel";

vi.mock("../api", () => ({
  apiSetFavorite: vi.fn(async () => ({})),
  apiLogEvent: vi.fn(async () => ({})),
  apiOpen: vi.fn(async () => ({})),
}));

import { SimpleStoreProvider, usePhotoActions } from "../stores/useStores";

function SetupResultsPanelWithActions() {
  const actions = usePhotoActions();
  React.useEffect(() => {
    actions.setResults([
      { path: "/1.jpg", score: 0.9 },
      { path: "/2.jpg", score: 0.8 },
      { path: "/3.jpg", score: 0.7 },
    ]);
  }, [actions.setResults]);
  return <ResultsPanel />;
}

describe("ResultsPanel integration", () => {
  it("favorites selected items via batch action", async () => {
    render(
      <SimpleStoreProvider>
        <SetupResultsPanelWithActions />
      </SimpleStoreProvider>
    );
    fireEvent.click(await screen.findByRole("button", { name: /Select all/i }));
    fireEvent.click(screen.getByRole("button", { name: /Favorite selected/i }));
    const { apiSetFavorite } = await import("../api");
    await waitFor(() => {
      expect(vi.mocked(apiSetFavorite).mock.calls.length).toBeGreaterThan(0);
    });
  });
});
