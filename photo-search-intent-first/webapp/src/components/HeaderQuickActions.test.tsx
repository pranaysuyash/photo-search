import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeaderQuickActions } from "./HeaderQuickActions";

describe("HeaderQuickActions", () => {
  const baseProps = {
    prefersReducedMotion: true,
    onOpenAccessibility: vi.fn(),
    onOpenOnboarding: vi.fn(),
    showHelpHint: true,
    onDismissHelpHint: vi.fn(),
  };

  it("invokes accessibility handler", () => {
    const props = { ...baseProps };
    render(<HeaderQuickActions {...props} />);
    fireEvent.click(screen.getByLabelText("Accessibility settings"));
    expect(props.onOpenAccessibility).toHaveBeenCalledTimes(1);
  });

  it("invokes onboarding handler", () => {
    const props = { ...baseProps };
    render(<HeaderQuickActions {...props} />);
    fireEvent.click(screen.getByLabelText("Help and onboarding"));
    expect(props.onOpenOnboarding).toHaveBeenCalledTimes(1);
  });

  it("dismisses help hint", () => {
    const props = { ...baseProps };
    render(<HeaderQuickActions {...props} />);
    // Find the dismiss button by its × symbol
    const dismissButton = screen.getByRole("button", {
      name: /Dismiss help hint/i,
    });
    fireEvent.click(dismissButton);
    expect(props.onDismissHelpHint).toHaveBeenCalledTimes(1);
  });

  it("hides hint when showHelpHint is false", () => {
    render(
      <HeaderQuickActions
        {...baseProps}
        showHelpHint={false}
        onDismissHelpHint={vi.fn()}
      />
    );
    expect(screen.queryByText(/Press .* for help and shortcuts/i)).toBeNull();
  });
});
