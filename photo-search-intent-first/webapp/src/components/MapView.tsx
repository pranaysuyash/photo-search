import { useEffect, useState } from "react";
import { EnhancedClusteredMapView } from "./EnhancedClusteredMapView";
import { EnhancedMapView, SimpleMapFallback } from "./EnhancedMapView";

interface MapViewProps {
	dir: string;
	engine: string;
	points: { lat: number; lon: number }[];
	onLoadMap: () => void;
	selectedPhotos?: Set<string>;
	onPhotoSelect?: (path: string, selected: boolean) => void;
	onPhotoOpen?: (path: string) => void;
	useEnhancedClustering?: boolean;
	performanceMode?: "speed" | "quality" | "balanced";
}

export default function MapView({
	dir,
	engine,
	points,
	onLoadMap,
	selectedPhotos = new Set(),
	onPhotoSelect,
	onPhotoOpen,
	useEnhancedClustering = false,
	performanceMode = "balanced",
}: MapViewProps) {
	const [useEnhancedMap, setUseEnhancedMap] = useState(false);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [useNewClustering, setUseNewClustering] = useState(
		useEnhancedClustering,
	);

	// Check if Leaflet is available
	useEffect(() => {
		try {
			// Check if required Leaflet dependencies are loaded
			const hasLeaflet =
				typeof window !== "undefined" &&
				"L" in window &&
				typeof (window as unknown).L === "object" &&
				"map" in (window as unknown).L;
			setUseEnhancedMap(hasLeaflet);
		} catch {
			setUseEnhancedMap(false);
		}
	}, []);

	const handleLoadMap = () => {
		setMapLoaded(true);
		onLoadMap();
	};

	// Use enhanced clustered map if enabled and available
	if (useNewClustering && useEnhancedMap && mapLoaded) {
		return (
			<div className="bg-white border rounded p-3">
				<div className="flex items-center justify-between mb-3">
					<h2 className="font-semibold">Enhanced Map (GPS)</h2>
					<button
						type="button"
						onClick={() => setUseNewClustering(false)}
						className="bg-blue-100 text-blue-700 rounded px-3 py-1 text-sm hover:bg-blue-200 transition-colors"
					>
						Standard View
					</button>
				</div>
				<EnhancedClusteredMapView
					dir={dir}
					engine={engine}
					selectedPhotos={selectedPhotos}
					onPhotoSelect={onPhotoSelect}
					onPhotoOpen={onPhotoOpen}
					height="400px"
					performanceMode={performanceMode}
					enableProgressiveLoading={true}
					showPerformanceMetrics={true}
				/>
			</div>
		);
	}

	// Use enhanced map if available and loaded, otherwise fallback to simple view
	if (useEnhancedMap && mapLoaded) {
		return (
			<div className="bg-white border rounded p-3">
				<div className="flex items-center justify-between mb-3">
					<h2 className="font-semibold">Map (GPS)</h2>
					<button
						type="button"
						onClick={() => setMapLoaded(false)}
						className="bg-gray-200 rounded px-3 py-1 text-sm"
					>
						Simple View
					</button>
				</div>
				<EnhancedMapView
					dir={dir}
					engine={engine}
					selectedPhotos={selectedPhotos}
					onPhotoSelect={onPhotoSelect}
					onPhotoOpen={onPhotoOpen}
					height="400px"
					enableClustering={true}
					showControls={true}
				/>
			</div>
		);
	}

	return (
		<SimpleMapFallback
			points={points}
			onLoadMap={handleLoadMap}
			onEnableEnhancedClustering={() => setUseNewClustering(true)}
		/>
	);
}
