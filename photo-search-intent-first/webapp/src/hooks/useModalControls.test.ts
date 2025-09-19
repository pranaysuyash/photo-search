import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const open = vi.fn();
const close = vi.fn();
const toggle = vi.fn();
const closeAll = vi.fn();

vi.mock("../contexts/ModalContext", () => ({
	useModalContext: () => ({
		state: {},
		actions: { open, close, toggle, closeAll },
	}),
}));

import { useModalControls } from "./useModalControls";

describe("useModalControls", () => {
	it("delegates to modal actions", () => {
		const { result } = renderHook(() => useModalControls());

		result.current.openFolder();
		result.current.openHelp();
		result.current.openJobs();
		result.current.openSearch();
		result.current.openTheme();
		result.current.openDiagnostics();
		result.current.openShareManager();

		expect(open).toHaveBeenCalledWith("folder");
		expect(open).toHaveBeenCalledWith("help");
		expect(open).toHaveBeenCalledWith("jobs");
		expect(open).toHaveBeenCalledWith("search");
		expect(open).toHaveBeenCalledWith("theme");
		expect(open).toHaveBeenCalledWith("diagnostics");
		expect(open).toHaveBeenCalledWith("shareManage");

		result.current.closeModal("help");
		expect(close).toHaveBeenCalledWith("help");

		result.current.toggleModal("search");
		expect(toggle).toHaveBeenCalledWith("search");

		result.current.closeAll();
		expect(closeAll).toHaveBeenCalled();
	});
});
