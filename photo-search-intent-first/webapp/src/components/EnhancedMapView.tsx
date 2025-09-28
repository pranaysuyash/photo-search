import L, { DivIcon, Icon } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	CircleMarker,
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	useMap,
} from "react-leaflet";
import {
	apiClusterPhotos,
	apiMapClusters,
	type ClusterPhoto,
	type MapCluster,
	type MapPoint,
	thumbUrl,
} from "../api";
import { cn } from "../lib/utils";
import { ProgressiveImage } from "./ProgressiveImage";
import "leaflet/dist/leaflet.css";

// Fix default icon issue with React Leaflet
delete (L.Icon.Default.prototype as unknown)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: "/marker-icon-2x.png",
	iconUrl: "/marker-icon.png",
	shadowUrl: "/marker-shadow.png",
});

interface EnhancedMapViewProps {
	dir: string;
	engine: string;
	selectedPhotos?: Set<string>;
	onPhotoSelect?: (path: string, selected: boolean) => void;
	onPhotoOpen?: (path: string) => void;
	className?: string;
	height?: string;
	enableClustering?: boolean;
	showControls?: boolean;
}

interface MapState {
	clusters: MapCluster[];
	points: MapPoint[];
	loading: boolean;
	error: string | null;
	total: number;
	bounds: L.LatLngBounds | null;
}

// Custom hook for managing map data
function useMapData(dir: string, enableClustering = true) {
	const [state, setState] = useState<MapState>({
		clusters: [],
		points: [],
		loading: true,
		error: null,
		total: 0,
		bounds: null,
	});

	const [clusterPhotos, setClusterPhotos] = useState<
		Map<string, ClusterPhoto[]>
	>(new Map());
	const [loadingCluster, setLoadingCluster] = useState<string | null>(null);

	const loadData = useCallback(
		async (bounds?: L.LatLngBounds, zoom?: number) => {
			try {
				setState((prev) => ({ ...prev, loading: true, error: null }));

				if (enableClustering) {
					const boundsParams = bounds
						? {
								ne_lat: bounds.getNorthEast().lat,
								ne_lon: bounds.getNorthEast().lng,
								sw_lat: bounds.getSouthWest().lat,
								sw_lon: bounds.getSouthWest().lng,
							}
						: undefined;

					const data = await apiMapClusters(dir, {
						zoom,
						bounds: boundsParams,
						clusterSize: zoom && zoom < 10 ? 0.05 : 0.01,
						minPhotos: 1,
					});

					setState({
						clusters: data.clusters,
						points: data.points,
						loading: false,
						error: null,
						total: data.total,
						bounds: bounds || null,
					});
				} else {
					// Fallback to simple points
					const basicData = await fetch(
						`${
							import.meta.env.VITE_API_BASE || ""
						}/map?dir=${encodeURIComponent(dir)}`,
					);
					const pointsData = await basicData.json();

					// Define proper type for raw API response
					interface RawMapPoint {
						lat: number;
						lon: number;
						path?: string;
						place?: string;
						thumbnail?: string;
						caption?: string;
						date?: number;
					}

					setState({
						clusters: [],
						points: (pointsData.points as RawMapPoint[]).map((p) => ({
							...p,
							path: p.path || `point-${p.lat}-${p.lon}`,
						})),
						loading: false,
						error: null,
						total: pointsData.points.length,
						bounds: bounds || null,
					});
				}
			} catch (error) {
				setState((prev) => ({
					...prev,
					loading: false,
					error:
						error instanceof Error ? error.message : "Failed to load map data",
				}));
			}
		},
		[dir, enableClustering],
	);

	const loadClusterPhotos = useCallback(
		async (clusterId: string) => {
			if (clusterPhotos.has(clusterId)) return;

			try {
				setLoadingCluster(clusterId);
				const data = await apiClusterPhotos(dir, clusterId, { limit: 9 });
				setClusterPhotos((prev) => new Map(prev).set(clusterId, data.photos));
			} catch (error) {
				console.warn("Failed to load cluster photos:", error);
			} finally {
				setLoadingCluster(null);
			}
		},
		[dir, clusterPhotos],
	);

	return {
		...state,
		loadData,
		loadClusterPhotos,
		clusterPhotos,
		loadingCluster,
	};
}

// Component for handling map events and data loading
function MapEventHandler({
	onBoundsChange,
	onZoomChange,
}: {
	onBoundsChange: (bounds: L.LatLngBounds) => void;
	onZoomChange: (zoom: number) => void;
}) {
	const map = useMap();

	useEffect(() => {
		const handleMoveEnd = () => {
			onBoundsChange(map.getBounds());
		};

		const handleZoomEnd = () => {
			onZoomChange(map.getZoom());
			onBoundsChange(map.getBounds());
		};

		map.on("moveend", handleMoveEnd);
		map.on("zoomend", handleZoomEnd);

		return () => {
			map.off("moveend", handleMoveEnd);
			map.off("zoomend", handleZoomEnd);
		};
	}, [map, onBoundsChange, onZoomChange]);

	return null;
}

// Cluster marker component
function ClusterMarker({
	cluster,
	onClick,
}: {
	cluster: MapCluster;
	onClick: (cluster: MapCluster) => void;
}) {
	const [isHovered, setIsHovered] = useState(false);

	const clusterIcon = useMemo(
		() =>
			new DivIcon({
				className: "cluster-marker",
				html: `
					<div class="
						w-12 h-12 rounded-full bg-blue-500 border-2 border-white shadow-lg
						flex items-center justify-center text-white font-bold text-sm
						hover:bg-blue-600 transition-colors cursor-pointer
						${isHovered ? "scale-110 ring-4 ring-blue-300" : ""}
					" style="transform: scale(${Math.min(2, 1 + cluster.photoCount / 20)});">
						${cluster.photoCount}
					</div>
				`,
				iconSize: [48, 48],
				iconAnchor: [24, 24],
			}),
		[cluster.photoCount, isHovered],
	);

	return (
		<Marker
			position={[cluster.lat, cluster.lon]}
			icon={clusterIcon}
			eventHandlers={{
				click: () => onClick(cluster),
				mouseover: () => setIsHovered(true),
				mouseout: () => setIsHovered(false),
			}}
		>
			<Popup>
				<div className="p-2 min-w-[200px]">
					<h3 className="font-semibold text-sm mb-2">
						{cluster.photoCount} Photos
						{cluster.place && ` in ${cluster.place}`}
					</h3>
					<button
						type="button"
						className="w-full bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
						onClick={() => onClick(cluster)}
					>
						View Photos
					</button>
				</div>
			</Popup>
		</Marker>
	);
}

// Individual photo marker
function PhotoMarker({
	point,
	dir,
	engine,
	selected,
	onSelect,
	onOpen,
}: {
	point: MapPoint;
	dir: string;
	engine: string;
	selected: boolean;
	onSelect: (path: string, selected: boolean) => void;
	onOpen: (path: string) => void;
}) {
	const [isHovered, setIsHovered] = useState(false);

	const markerIcon = useMemo(
		() =>
			new Icon({
				iconUrl: point.thumbnail || thumbUrl(dir, engine, point.path, 64),
				iconSize: [32, 32],
				iconAnchor: [16, 16],
				className: cn(
					"rounded-full border-2 transition-all",
					selected ? "border-blue-500 ring-2 ring-blue-300" : "border-white",
					isHovered ? "scale-125 ring-2 ring-blue-200" : "scale-100",
				),
			}),
		[point.thumbnail, point.path, dir, engine, selected, isHovered],
	);

	return (
		<Marker
			position={[point.lat, point.lon]}
			icon={markerIcon}
			eventHandlers={{
				click: () => onOpen(point.path),
				mouseover: () => setIsHovered(true),
				mouseout: () => setIsHovered(false),
			}}
		>
			<Popup>
				<div className="p-2 min-w-[200px]">
					{point.thumbnail && (
						<ProgressiveImage
							src={point.thumbnail}
							alt={point.caption || "Photo"}
							className="w-full h-32 object-cover rounded mb-2"
							thumbSize={64}
							mediumSize={128}
						/>
					)}
					<h3 className="font-semibold text-sm mb-1">
						{point.caption || "Untitled Photo"}
					</h3>
					{point.place && (
						<p className="text-xs text-gray-600 mb-2">{point.place}</p>
					)}
					<div className="flex gap-2">
						<button
							type="button"
							className={cn(
								"flex-1 px-2 py-1 rounded text-xs transition-colors",
								selected
									? "bg-blue-500 text-white"
									: "bg-gray-200 hover:bg-gray-300",
							)}
							onClick={(e) => {
								e.stopPropagation();
								onSelect(point.path, !selected);
							}}
						>
							{selected ? "Deselect" : "Select"}
						</button>
						<button
							type="button"
							className="flex-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
							onClick={() => onOpen(point.path)}
						>
							View
						</button>
					</div>
				</div>
			</Popup>
		</Marker>
	);
}

// Cluster photo preview modal
function ClusterPhotoModal({
	cluster,
	photos,
	loading,
	selectedPhotos,
	onPhotoSelect,
	onPhotoOpen,
	onClose,
}: {
	cluster: MapCluster;
	photos: ClusterPhoto[];
	loading: boolean;
	selectedPhotos: Set<string>;
	onPhotoSelect: (path: string, selected: boolean) => void;
	onPhotoOpen: (path: string) => void;
	onClose: () => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
				<div className="p-4 border-b flex items-center justify-between">
					<h2 className="text-lg font-semibold">
						{cluster.photoCount} Photos{cluster.place && ` in ${cluster.place}`}
					</h2>
					<button
						type="button"
						className="text-gray-500 hover:text-gray-700"
						onClick={onClose}
					>
						✕
					</button>
				</div>

				<div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
					{loading ? (
						<div className="flex items-center justify-center h-32">
							<div className="text-gray-500">Loading photos...</div>
						</div>
					) : (
						<div className="grid grid-cols-3 gap-4">
							{photos.map((photo) => (
								<div key={photo.path} className="relative group">
									<button
										type="button"
										className="w-full aspect-square cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
										onClick={() => onPhotoOpen(photo.path)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onPhotoOpen(photo.path);
											}
										}}
										aria-label={`View photo: ${photo.caption || "Untitled"}`}
									>
										<ProgressiveImage
											src={photo.thumbnail}
											alt={photo.caption || "Photo"}
											className="w-full h-full object-cover rounded"
											thumbSize={96}
											mediumSize={256}
										/>
									</button>

									{/* Selection overlay */}
									<div
										className={cn(
											"absolute inset-0 bg-black/20 rounded transition-opacity",
											selectedPhotos.has(photo.path)
												? "opacity-100"
												: "opacity-0 group-hover:opacity-100",
										)}
									>
										<div className="absolute top-1 left-1">
											<label className="flex items-center">
												<input
													type="checkbox"
													checked={selectedPhotos.has(photo.path)}
													onChange={(e) => {
														e.stopPropagation();
														onPhotoSelect(photo.path, e.target.checked);
													}}
													className="w-4 h-4"
													aria-label={`Select photo: ${
														photo.caption || "Untitled"
													}`}
												/>
											</label>
										</div>
									</div>

									{photo.caption && (
										<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
											<p className="text-white text-xs truncate">
												{photo.caption}
											</p>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export function EnhancedMapView({
	dir,
	engine,
	selectedPhotos = new Set(),
	onPhotoSelect,
	onPhotoOpen,
	className,
	height = "500px",
	enableClustering = true,
	showControls = true,
}: EnhancedMapViewProps) {
	const [zoom, setZoom] = useState(10);
	const [selectedCluster, setSelectedCluster] = useState<MapCluster | null>(
		null,
	);
	const mapRef = useRef<L.Map | null>(null);

	const {
		clusters,
		points,
		loading,
		error,
		total,
		loadData,
		loadClusterPhotos,
		clusterPhotos,
		loadingCluster,
	} = useMapData(dir, enableClustering);

	// Load initial data
	useEffect(() => {
		loadData();
	}, [loadData]);

	// Handle bounds/zoom changes
	const handleBoundsChange = useCallback(
		(bounds: L.LatLngBounds) => {
			loadData(bounds, zoom);
		},
		[loadData, zoom],
	);

	const handleZoomChange = useCallback((newZoom: number) => {
		setZoom(newZoom);
	}, []);

	// Handle cluster click
	const handleClusterClick = useCallback(
		(cluster: MapCluster) => {
			setSelectedCluster(cluster);
			loadClusterPhotos(cluster.id);
		},
		[loadClusterPhotos],
	);

	// Calculate map bounds from data
	const mapBounds = useMemo(() => {
		if (clusters.length === 0 && points.length === 0) return null;

		const allCoords = [
			...clusters.map((c) => [c.lat, c.lon]),
			...points.map((p) => [p.lat, p.lon]),
		] as [number, number][];

		return L.latLngBounds(allCoords);
	}, [clusters, points]);

	const center = useMemo(() => {
		if (mapBounds) {
			return mapBounds.getCenter();
		}
		return { lat: 40.7128, lng: -74.006 }; // Default to NYC
	}, [mapBounds]);

	if (error) {
		return (
			<div
				className={cn("bg-red-50 border border-red-200 rounded p-4", className)}
			>
				<div className="text-red-600 font-medium">Map Error</div>
				<div className="text-red-500 text-sm mt-1">{error}</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"relative bg-gray-100 rounded-lg overflow-hidden",
				className,
			)}
		>
			{showControls && (
				<div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2">
					<div className="text-sm text-gray-600">
						{loading ? "Loading..." : `${total} locations`}
					</div>
					{loading && (
						<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
					)}
				</div>
			)}

			<MapContainer
				center={[center.lat, center.lng]}
				zoom={zoom}
				style={{ height, width: "100%" }}
				ref={mapRef}
				className="rounded-lg"
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>

				<MapEventHandler
					onBoundsChange={handleBoundsChange}
					onZoomChange={handleZoomChange}
				/>

				{/* Render clusters */}
				{enableClustering &&
					clusters.map((cluster) => (
						<ClusterMarker
							key={cluster.id}
							cluster={cluster}
							onClick={handleClusterClick}
						/>
					))}

				{/* Render individual points when zoomed in or clustering disabled */}
				{(!enableClustering || zoom >= 15) &&
					points.map((point) => (
						<PhotoMarker
							key={point.path}
							point={point}
							dir={dir}
							engine={engine}
							selected={selectedPhotos.has(point.path)}
							onSelect={onPhotoSelect || (() => {})}
							onOpen={onPhotoOpen || (() => {})}
						/>
					))}

				{/* Show cluster radius circles for debugging */}
				{process.env.NODE_ENV === "development" &&
					clusters.map((cluster) => (
						<CircleMarker
							key={`radius-${cluster.id}`}
							center={[cluster.lat, cluster.lon]}
							radius={cluster.radius * 111000} // Convert degrees to meters
							pathOptions={{
								color: "blue",
								fillColor: "blue",
								fillOpacity: 0.1,
								weight: 1,
								opacity: 0.3,
							}}
						/>
					))}
			</MapContainer>

			{/* Cluster photo modal */}
			{selectedCluster && (
				<ClusterPhotoModal
					cluster={selectedCluster}
					photos={clusterPhotos.get(selectedCluster.id) || []}
					loading={loadingCluster === selectedCluster.id}
					selectedPhotos={selectedPhotos}
					onPhotoSelect={onPhotoSelect || (() => {})}
					onPhotoOpen={onPhotoOpen || (() => {})}
					onClose={() => setSelectedCluster(null)}
				/>
			)}
		</div>
	);
}

// Fallback component for when Leaflet isn't available
export function SimpleMapFallback({
	points,
	onLoadMap,
}: {
	points: { lat: number; lon: number }[];
	onLoadMap: () => void;
}) {
	return (
		<div className="bg-white border rounded p-3">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold">Map (GPS)</h2>
				<button
					type="button"
					onClick={onLoadMap}
					className="bg-gray-200 rounded px-3 py-1 text-sm"
				>
					Load
				</button>
			</div>
			{points.length === 0 ? (
				<div className="text-sm text-gray-600 mt-2">No GPS points found.</div>
			) : (
				<div className="mt-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
					{points.map((p, i) => (
						<div
							key={`point-${p.lat}-${p.lon}-${i}`}
							className="border rounded p-2"
						>
							{p.lat.toFixed(5)}, {p.lon.toFixed(5)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
