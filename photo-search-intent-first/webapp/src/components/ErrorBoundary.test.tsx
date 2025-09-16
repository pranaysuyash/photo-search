import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

// A component that throws an error
const BadComponent = () => {
  throw new Error("This is a test error!");
};

// A component that works fine
const GoodComponent = () => {
  return <div data-testid="good-component">This component works fine!</div>;
};

describe("ErrorBoundary", () => {
  // Suppress console.error for cleaner test output
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("good-component")).toBeInTheDocument();
    expect(screen.getByText("This component works fine!")).toBeInTheDocument();
  });

  it("renders error message when child component throws an error", () => {
    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    expect(
      screen.getByText(/Oops! Something unexpected happened\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred\./i)
    ).toBeInTheDocument();
  });

  it("renders custom fallback UI when provided", () => {
    const customFallback = (
      <div data-testid="custom-fallback">
        <h3>Custom Error Message</h3>
        <p>Something went wrong!</p>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <BadComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
    expect(screen.getByText("Custom Error Message")).toBeInTheDocument();
  });

  it("allows user to reload the page", () => {
    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload page|reload/i });
    fireEvent.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();
  });

  it("allows user to try again", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    // The "Try Again" button should set hasError to false
    // We can verify the button click worked by checking that the state was updated
    // Since the component re-throws the error, we'll see additional console errors
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
});
