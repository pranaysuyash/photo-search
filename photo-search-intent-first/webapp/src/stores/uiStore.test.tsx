import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useHasNote, useIsBusy, useUIStore } from "./uiStore";

describe("uiStore", () => {
	beforeEach(() => {
		useUIStore.setState({
			busy: "",
			note: "",
			viewMode: "grid",
			showWelcome: false,
			showHelp: false,
		});
	});

	it("default computed flags are false", () => {
		function Flags() {
			const busy = useIsBusy();
			const has = useHasNote();
			return <div data-busy={busy} data-has={has} />;
		}
		const { container } = render(<Flags />);
		expect(container.firstChild).toHaveAttribute("data-busy", "false");
		expect(container.firstChild).toHaveAttribute("data-has", "false");
	});

	it("actions update busy and note", () => {
		function Flags() {
			const busy = useIsBusy();
			const has = useHasNote();
			return <div data-busy={busy} data-has={has} />;
		}
		const { container, rerender } = render(<Flags />);
		const s = useUIStore.getState();
		s.setBusy("Indexing");
		rerender(<Flags />);
		expect(container.firstChild).toHaveAttribute("data-busy", "true");
		s.clearBusy();
		rerender(<Flags />);
		expect(container.firstChild).toHaveAttribute("data-busy", "false");
		s.setNote("Done");
		rerender(<Flags />);
		expect(container.firstChild).toHaveAttribute("data-has", "true");
	});
});
