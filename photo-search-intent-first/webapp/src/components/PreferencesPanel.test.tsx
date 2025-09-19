import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesPanel } from "./PreferencesPanel";

// Mock the settings store
const mockUseEnableDemoLibrary = vi.fn();
const mockSetEnableDemoLibrary = vi.fn();

vi.mock("../stores/settingsStore", () => ({
	useEnableDemoLibrary: () => mockUseEnableDemoLibrary(),
	useSettingsActions: () => ({
		setEnableDemoLibrary: mockSetEnableDemoLibrary,
	}),
}));

describe("PreferencesPanel", () => {
	const mockOnClose = vi.fn();

	beforeEach(() => {
		mockOnClose.mockClear();
		mockSetEnableDemoLibrary.mockClear();
		mockUseEnableDemoLibrary.mockReturnValue(true);
	});

	it("renders demo library toggle with correct initial state", () => {
		render(<PreferencesPanel isOpen={true} onClose={mockOnClose} />);

		const checkbox = screen.getByRole("checkbox", {
			name: /enable demo library/i,
		});
		expect(checkbox).toBeInTheDocument();
		expect((checkbox as HTMLInputElement).checked).toBe(true);
	});

	it("calls setEnableDemoLibrary when toggle is changed", () => {
		render(<PreferencesPanel isOpen={true} onClose={mockOnClose} />);

		const checkbox = screen.getByRole("checkbox", {
			name: /enable demo library/i,
		});

		// Click the checkbox - should call with false (unchecking)
		fireEvent.click(checkbox);
		expect(mockSetEnableDemoLibrary).toHaveBeenCalledWith(false);

		// Click again - should call with false again (still trying to uncheck)
		fireEvent.click(checkbox);
		expect(mockSetEnableDemoLibrary).toHaveBeenCalledWith(false);
		expect(mockSetEnableDemoLibrary).toHaveBeenCalledTimes(2);
	});

	it("shows demo library description", () => {
		render(<PreferencesPanel isOpen={true} onClose={mockOnClose} />);

		expect(
			screen.getByText(
				/automatically load demo photos when no directory is selected/i,
			),
		).toBeInTheDocument();
	});

	it("does not render when isOpen is false", () => {
		render(<PreferencesPanel isOpen={false} onClose={mockOnClose} />);

		expect(
			screen.queryByRole("checkbox", { name: /enable demo library/i }),
		).not.toBeInTheDocument();
	});
});
