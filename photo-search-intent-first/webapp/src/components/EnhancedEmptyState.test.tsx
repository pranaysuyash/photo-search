import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { EnhancedEmptyState } from "./EnhancedEmptyState";

describe("EnhancedEmptyState", () => {
	const defaultProps = {
		type: "no-directory" as const,
		prefersReducedMotion: false,
		onOpenSettings: vi.fn(),
		onTryDemo: vi.fn(),
		context: "search" as const,
	};

	it("renders with QuickActions for no-directory type", () => {
		render(<EnhancedEmptyState {...defaultProps} />);

		// Should show the enhanced empty state with QuickActions
		expect(
			screen.getByText("Bring your photo library to life"),
		).toBeInTheDocument();
		expect(screen.getByText("Try sample searches")).toBeInTheDocument();
	});

	it("calls onOpenSettings when settings button is clicked", () => {
		render(<EnhancedEmptyState {...defaultProps} />);

		const settingsButton = screen.getByRole("button", { name: /settings/i });
		fireEvent.click(settingsButton);

		expect(defaultProps.onOpenSettings).toHaveBeenCalled();
	});

	it("calls onTryDemo when demo button is clicked", () => {
		render(<EnhancedEmptyState {...defaultProps} />);

		const demoButton = screen.getByRole("button", {
			name: /explore demo photos/i,
		});
		fireEvent.click(demoButton);

		expect(defaultProps.onTryDemo).toHaveBeenCalled();
	});

	it("shows different content for different types", () => {
		const { rerender } = render(
			<EnhancedEmptyState {...defaultProps} type="no-directory" />,
		);

		expect(
			screen.getByText("Bring your photo library to life"),
		).toBeInTheDocument();

		rerender(<EnhancedEmptyState {...defaultProps} type="no-photos" />);
		expect(screen.getByText("This folder is empty")).toBeInTheDocument();

		rerender(<EnhancedEmptyState {...defaultProps} type="indexing" />);
		expect(screen.getByText("Indexing your photos")).toBeInTheDocument();
	});

	it("respects prefersReducedMotion", () => {
		render(
			<EnhancedEmptyState {...defaultProps} prefersReducedMotion={true} />,
		);

		// Component should still render but animations should be disabled
		expect(
			screen.getByText("Bring your photo library to life"),
		).toBeInTheDocument();
	});
});
