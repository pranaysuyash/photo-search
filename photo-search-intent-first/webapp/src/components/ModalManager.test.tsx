import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ModalProvider, useModalContext } from "../contexts/ModalContext";
import { useModalControls } from "../hooks/useModalControls";
import { useModalStatus } from "../hooks/useModalStatus";

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
		</div>
	);
}

describe("Modal System Integration", () => {
	it("should integrate modal context, controls, and status correctly", () => {
		render(
			<ModalProvider>
				<TestModalComponent />
			</ModalProvider>,
		);

		// Initial state - no modals open
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Any Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Help Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Diagnostics Open: false",
		);

		// Open help modal
		fireEvent.click(screen.getByTestId("open-help"));
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Any Open: true",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Help Open: true",
		);

		// Open search modal (should keep help open)
		fireEvent.click(screen.getByTestId("open-search"));
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Any Open: true",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: true",
		);

		// Open diagnostics modal
		fireEvent.click(screen.getByTestId("open-diagnostics"));
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Diagnostics Open: true",
		);

		// Close help modal
		fireEvent.click(screen.getByTestId("close-help"));
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Help Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: true",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Diagnostics Open: true",
		);

		// Close all modals
		fireEvent.click(screen.getByTestId("close-all"));
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Any Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Diagnostics Open: false",
		);
	});

	it("should handle modal controls convenience methods", () => {
		render(
			<ModalProvider>
				<TestModalComponent />
			</ModalProvider>,
		);

		// Test opening different modals via controls
		const openHelpBtn = screen.getByTestId("open-help");
		const openSearchBtn = screen.getByTestId("open-search");
		const openDiagnosticsBtn = screen.getByTestId("open-diagnostics");

		fireEvent.click(openHelpBtn);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Help Open: true",
		);

		fireEvent.click(openSearchBtn);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: true",
		);

		fireEvent.click(openDiagnosticsBtn);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Diagnostics Open: true",
		);
	});
});

describe("Modal System Integration", () => {
	it("should integrate modal context, controls, and status correctly", () => {
		render(
			<ModalProvider>
				<TestModalComponent />
			</ModalProvider>,
		);

		// Initial state - no modals open
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Any Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Help Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: false",
		);

		// Open help modal
		fireEvent.click(screen.getByTestId("open-help"));
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Any Open: true",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Help Open: true",
		);

		// Open search modal (should keep help open)
		fireEvent.click(screen.getByTestId("open-search"));
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Any Open: true",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: true",
		);

		// Close help modal
		fireEvent.click(screen.getByTestId("close-help"));
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Help Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: true",
		);

		// Close all modals
		fireEvent.click(screen.getByTestId("close-all"));
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Any Open: false",
		);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: false",
		);
	});

	it("should handle modal controls convenience methods", () => {
		render(
			<ModalProvider>
				<TestModalComponent />
			</ModalProvider>,
		);

		// Test opening different modals via controls
		const openHelpBtn = screen.getByTestId("open-help");
		const openSearchBtn = screen.getByTestId("open-search");

		fireEvent.click(openHelpBtn);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Help Open: true",
		);

		fireEvent.click(openSearchBtn);
		expect(screen.getByTestId("modal-status").textContent).toContain(
			"Search Open: true",
		);
	});
});
