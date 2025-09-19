import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useNeedsHf, useNeedsOAI, useSettingsStore } from "./settingsStore";

describe("settingsStore", () => {
	beforeEach(() => {
		useSettingsStore.setState({
			dir: "",
			engine: "local",
			hfToken: "",
			openaiKey: "",
			useFast: false,
			fastKind: "",
			useCaps: false,
			vlmModel: "Qwen/Qwen2-VL-2B-Instruct",
			useOcr: false,
			hasText: false,
			enableDemoLibrary: true,
			camera: "",
			isoMin: 0,
			isoMax: 0,
			fMin: 0,
			fMax: 0,
			place: "",
		});
	});

	it("defaults are sensible", () => {
		const s = useSettingsStore.getState();
		expect(s.engine).toBe("local");
		expect(s.vlmModel).toBeTruthy();
		expect(s.enableDemoLibrary).toBe(true);
		expect({
			camera: s.camera,
			isoMin: s.isoMin,
			isoMax: s.isoMax,
			fMin: s.fMin,
			fMax: s.fMax,
			place: s.place,
		}).toEqual({
			camera: "",
			isoMin: 0,
			isoMax: 0,
			fMin: 0,
			fMax: 0,
			place: "",
		});
	});

	it("actions update values", () => {
		const s = useSettingsStore.getState();
		s.setEngine("hf");
		s.setDir("/photos");
		s.setUseFast(true);
		s.setFastKind("faiss");
		expect(useSettingsStore.getState().engine).toBe("hf");
		expect(useSettingsStore.getState().dir).toBe("/photos");
		expect(useSettingsStore.getState().useFast).toBe(true);
		expect(useSettingsStore.getState().fastKind).toBe("faiss");
	});

	it("demo library toggle works correctly", () => {
		const s = useSettingsStore.getState();

		// Default should be true
		expect(s.enableDemoLibrary).toBe(true);

		// Disable demo library
		s.setEnableDemoLibrary(false);
		expect(useSettingsStore.getState().enableDemoLibrary).toBe(false);

		// Re-enable demo library
		s.setEnableDemoLibrary(true);
		expect(useSettingsStore.getState().enableDemoLibrary).toBe(true);
	});

	it("computed flags for providers", () => {
		function Flags() {
			const hf = useNeedsHf();
			const oai = useNeedsOAI();
			return <div data-hf={hf} data-oai={oai} />;
		}
		const { container, rerender } = render(<Flags />);
		// HF
		useSettingsStore.getState().setEngine("hf");
		rerender(<Flags />);
		expect((container.firstChild as HTMLElement)?.getAttribute("data-hf")).toBe(
			"true",
		);
		expect(
			(container.firstChild as HTMLElement)?.getAttribute("data-oai"),
		).toBe("false");
		// OpenAI
		useSettingsStore.getState().setEngine("openai");
		rerender(<Flags />);
		expect((container.firstChild as HTMLElement)?.getAttribute("data-hf")).toBe(
			"false",
		);
		expect(
			(container.firstChild as HTMLElement)?.getAttribute("data-oai"),
		).toBe("true");
	});
});
