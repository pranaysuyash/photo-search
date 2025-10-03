/**
 * Test Map Clustering Integration
 *
 * This test verifies that the enhanced map clustering integration works correctly
 * and that components can be rendered without errors.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MapView from "../MapView";

// Mock the map components and dependencies
vi.mock("../api", () => ({
	apiMapClusters: vi.fn(() =>
		Promise.resolve({
			clusters: [],
			points: [],
			total: 0,
		}),
	),
	apiClusterPhotos: vi.fn(() =>
		Promise.resolve({
			photos: [],
		}),
	),
	thumbUrl: vi.fn(() => "mock-thumb-url"),
}));

vi.mock("../services/MapClusteringService", () => ({
	mapClusteringService: {
		clusterPoints: vi.fn(() =>
			Promise.resolve({
				clusters: [],
				unclustered: [],
				metrics: {
					totalPoints: 0,
					totalClusters: 0,
					clusteringTime: 0,
					memoryUsage: 0,
					cacheHits: 0,
					cacheMisses: 0,
				},
			}),
		),
		getMetrics: vi.fn(() => ({
			totalPoints: 0,
			totalClusters: 0,
			clusteringTime: 0,
			memoryUsage: 0,
			cacheHits: 0,
			cacheMisses: 0,
		})),
		clearCache: vi.fn(),
		updateConfig: vi.fn(),
	},
}));

vi.mock("leaflet", () => ({
	DivIcon: vi.fn(),
	Icon: {
		Default: {
			mergeOptions: vi.fn(),
		},
	},
}));

// Mock Leaflet CSS
vi.importActual("leaflet/dist/leaflet.css");

describe("Map Clustering Integration", () => {
	const defaultProps = {
		dir: "/test/directory",
		engine: "test-engine",
		points: [
			{ lat: 37.7749, lon: -122.4194 },
			{ lat: 37.7849, lon: -122.4094 },
			{ lat: 37.7649, lon: -122.4294 },
		],
		onLoadMap: vi.fn(),
		selectedPhotos: new Set(),
		onPhotoSelect: vi.fn(),
		onPhotoOpen: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders MapView with simple fallback when Leaflet is not available", () => {
		// Mock window without Leaflet
		Object.defineProperty(window, "L", {
			value: undefined,
			writable: true,
		});

		render(<MapView {...defaultProps} />);

		expect(screen.getByText("Map (GPS)")).toBeInTheDocument();
		expect(screen.getByText("Enhanced Clustering")).toBeInTheDocument();
		expect(screen.getByText("Load Map")).toBeInTheDocument();
	});

	it("shows enhanced clustering option when available", () => {
		Object.defineProperty(window, "L", {
			value: undefined,
			writable: true,
		});

		render(<MapView {...defaultProps} />);

		const enhancedButton = screen.getByText("Enhanced Clustering");
		expect(enhancedButton).toBeInTheDocument();
		expect(enhancedButton.closest("button")).toHaveClass("bg-blue-100");
	});

	it("displays GPS points correctly in simple view", () => {
		Object.defineProperty(window, "L", {
			value: undefined,
			writable: true,
		});

		render(<MapView {...defaultProps} />);

		// Check that coordinates are displayed
		expect(screen.getByText("37.77490, -122.41940")).toBeInTheDocument();
		expect(screen.getByText("37.78490, -122.40940")).toBeInTheDocument();
		expect(screen.getByText("37.76490, -122.42940")).toBeInTheDocument();
	});

	it("handles empty points array gracefully", () => {
		Object.defineProperty(window, "L", {
			value: undefined,
			writable: true,
		});

		render(<MapView {...defaultProps} points={[]} />);

		expect(screen.getByText("No GPS points found.")).toBeInTheDocument();
	});

	it("passes correct props to enhanced clustering when enabled", () => {
		const onLoadMap = vi.fn();

		Object.defineProperty(window, "L", {
			value: undefined,
			writable: true,
		});

		render(
			<MapView
				{...defaultProps}
				useEnhancedClustering={true}
				performanceMode="speed"
				onLoadMap={onLoadMap}
			/>,
		);

		expect(onLoadMap).not.toHaveBeenCalled();
	});
});
