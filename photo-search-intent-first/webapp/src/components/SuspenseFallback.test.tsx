import { render, screen } from "@testing-library/react";
import { Suspense, lazy } from "react";
import { describe, expect, it } from "vitest";
import { SuspenseFallback } from "./SuspenseFallback";

describe("SuspenseFallback", () => {
  it("renders while a lazy module is loading and disappears after it resolves", async () => {
    const Delayed = lazy(
      () =>
        new Promise<{ default: React.ComponentType }>((resolve) =>
          setTimeout(
            () => resolve({ default: () => <div data-testid="lazy-loaded">Loaded</div> }),
            50,
          ),
        ),
    );

    render(
      <Suspense fallback={<SuspenseFallback label="Loading test…" />}> 
        <Delayed />
      </Suspense>,
    );

    // Fallback should be visible immediately
    expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();

    // After lazy module resolves, it should render and fallback should go away
    expect(await screen.findByTestId("lazy-loaded")).toBeInTheDocument();
    expect(screen.queryByTestId("suspense-fallback")).toBeNull();
  });
});

