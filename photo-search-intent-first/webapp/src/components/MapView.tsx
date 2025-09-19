import { useEffect, useState } from "react";
import { EnhancedMapView, SimpleMapFallback } from "./EnhancedMapView";

interface MapViewProps {
	dir: string;
	engine: string;
	points: { lat: number; lon: number }[];
	onLoadMap: () => void;
	selectedPhotos?: Set<string>;
	onPhotoSelect?: (path: string, selected: boolean) => void;
	onPhotoOpen?: (path: string) => void;
}

export default function MapView({
	dir,
	engine,
	points,
	onLoadMap,
	selectedPhotos = new Set(),
	onPhotoSelect,
	onPhotoOpen,
}: MapViewProps) {
	const [useEnhancedMap, setUseEnhancedMap] = useState(false);
	const [mapLoaded, setMapLoaded] = useState(false);

	// Check if Leaflet is available
	useEffect(() => {
		try {
			// Check if required Leaflet dependencies are loaded
			const hasLeaflet =
				typeof window !== "undefined" &&
				"L" in window &&
				"map" in (window.L as unknown);
			setUseEnhancedMap(hasLeaflet);
		} catch {
			setUseEnhancedMap(false);
		}
	}, []);

	const handleLoadMap = () => {
		setMapLoaded(true);
		onLoadMap();
	};

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

	return <SimpleMapFallback points={points} onLoadMap={handleLoadMap} />;
}
