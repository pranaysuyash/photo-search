import { describe, expect, it } from "vitest";
import {
	MiniStatus,
	StatusBar,
	StatusIndicator,
} from "../components/StatusBar";
import { render, screen } from "../test/test-utils";

describe("StatusBar", () => {
	it("renders with default props", () => {
		render(<StatusBar />);
		expect(screen.getByText("0 photos")).toBeInTheDocument();
		expect(screen.getByText("0 indexed")).toBeInTheDocument();
	});

	it("renders with custom props", () => {
		const props = {
			photoCount: 100,
			indexedCount: 50,
			searchProvider: "local",
			isIndexing: false,
			isConnected: true,
			currentDirectory: "/test/path",
			lastSync: new Date(),
			activeJobs: 2,
		};

		render(<StatusBar {...props} />);
		expect(screen.getByText("100 photos")).toBeInTheDocument();
		expect(screen.getByText("50 indexed")).toBeInTheDocument();
		expect(screen.getByText("local")).toBeInTheDocument();
		expect(screen.getByText("2 active jobs")).toBeInTheDocument();
		expect(screen.getByText(/Synced/)).toBeInTheDocument();
	});

	it("renders indexing state", () => {
		const props = {
			photoCount: 100,
			indexedCount: 50,
			isIndexing: true,
		};

		render(<StatusBar {...props} />);
		expect(screen.getByText("Indexing... 50/100")).toBeInTheDocument();
	});
});

describe("MiniStatus", () => {
	it("renders with default props", () => {
		render(<MiniStatus />);
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("renders indexing state", () => {
		render(<MiniStatus photoCount={100} isIndexing={true} activeJobs={2} />);
		expect(screen.getByText("100")).toBeInTheDocument();
		expect(screen.getByText("Indexing")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
	});
});

describe("StatusIndicator", () => {
	it("renders idle state", () => {
		render(<StatusIndicator status="idle" message="Ready" />);
		expect(screen.getByText("Ready")).toBeInTheDocument();
	});

	it("renders processing state", () => {
		render(<StatusIndicator status="processing" message="Processing..." />);
		expect(screen.getByText("Processing...")).toBeInTheDocument();
	});

	it("renders success state", () => {
		render(<StatusIndicator status="success" message="Success" />);
		expect(screen.getByText("Success")).toBeInTheDocument();
	});

	it("renders error state", () => {
		render(<StatusIndicator status="error" message="Error" />);
		expect(screen.getByText("Error")).toBeInTheDocument();
	});
});
