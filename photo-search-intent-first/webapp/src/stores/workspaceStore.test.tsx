import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
	useFastIndexStatus,
	useHasPersons,
	useWorkspaceStore,
} from "./workspaceStore";

describe("workspaceStore", () => {
	beforeEach(() => {
		useWorkspaceStore.setState({
			workspace: [],
			wsToggle: false,
			persons: [],
			clusters: [],
			groups: [],
			points: [],
			diag: null,
		});
	});

	it("manages persons add/remove and toggle", () => {
		function Flags() {
			const has = useHasPersons();
			return <div data-has={has} />;
		}
		const { container, rerender } = render(<Flags />);
		const s = useWorkspaceStore.getState();
		s.addPerson("Alice");
		expect(useWorkspaceStore.getState().persons).toContain("Alice");
		s.addPerson("Alice"); // toggles off
		expect(useWorkspaceStore.getState().persons).not.toContain("Alice");
		s.setPersons(["Bob"]);
		rerender(<Flags />);
		expect(container.firstChild).toHaveAttribute("data-has", "true");
		s.removePerson("Bob");
		rerender(<Flags />);
		expect(container.firstChild).toHaveAttribute("data-has", "false");
	});

	it("exposes fast index status from diagnostics", () => {
		function Fast() {
			const fast = useFastIndexStatus();
			return (
				<div
					data-fast={fast ? "yes" : "no"}
					data-faiss={fast?.faiss ? "1" : "0"}
				/>
			);
		}
		const { container, rerender } = render(<Fast />);
		expect(container.firstChild).toHaveAttribute("data-fast", "no");
		useWorkspaceStore.setState({
			diag: {
				folder: "/x",
				engines: [
					{
						key: "local",
						index_dir: "/idx",
						count: 10,
						fast: { annoy: true, faiss: false, hnsw: true },
					},
				],
				free_gb: 10,
				os: "macOS",
			},
		});
		rerender(<Fast />);
		expect(container.firstChild).toHaveAttribute("data-fast", "yes");
		expect(container.firstChild).toHaveAttribute("data-faiss", "0");
	});
});
