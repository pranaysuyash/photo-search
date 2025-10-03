/**
 * Enhanced Clustered Map View
 *
 * An advanced map component with intelligent clustering, performance optimization,
 * and support for large GPS datasets with smooth animations and virtualization.
 */

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
import { type ClusterPhoto, type MapPoint, thumbUrl } from "../api";
import { useMapClustering } from "../hooks/useMapClustering";
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

interface EnhancedClusteredMapViewProps {
	dir: string;
	engine: string;
	selectedPhotos?: Set<string>;
	onPhotoSelect?: (path: string, selected: boolean) => void;
	onPhotoOpen?: (path: string) => void;
	className?: string;
	height?: string;
	showControls?: boolean;
	performanceMode?: "speed" | "quality" | "balanced";
	enableAnimations?: boolean;
	maxVisibleMarkers?: number;
}

interface MapState {
	center: { lat: number; lng: number };
	zoom: number;
	bounds: L.LatLngBounds | null;
	performanceStats: {
		visibleMarkers: number;
		renderedClusters: number;
		memoryUsage: number;
		fps: number;
	};
}

// Animated cluster marker component
function AnimatedClusterMarker({
	cluster,
	onClick,
	enableAnimations,
}: {
	cluster: any;
	onClick: (cluster: any) => void;
	enableAnimations: boolean;
}) {
	const [isHovered, setIsHovered] = useState(false);
	const [isClicked, setIsClicked] = useState(false);

	const clusterIcon = useMemo(
		() =>
			new DivIcon({
				className: "enhanced-cluster-marker",
				html: `
          <div class="
            relative flex items-center justify-center rounded-full
            ${enableAnimations ? "transition-all duration-300" : ""}
            ${isHovered ? "scale-110" : "scale-100"}
            ${isClicked ? "scale-95" : ""}
            ${getClusterSizeClass(cluster.photoCount)}
            ${getClusterColorClass(cluster.density || 1)}
            shadow-lg border-2 border-white
            cursor-pointer
          " style="
            transform: scale(${Math.min(2.5, 1 + Math.log10(cluster.photoCount) / 2)});
            animation: ${enableAnimations ? "clusterPulse 2s infinite" : "none"};
          ">
            <div class="text-white font-bold text-sm">
              ${formatClusterCount(cluster.photoCount)}
            </div>
            ${cluster.photoTypes?.videos ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>' : ""}
            ${cluster.avgTimestamp ? `<div class="absolute -bottom-1 text-xs text-white/80">${formatTimestamp(cluster.avgTimestamp)}</div>` : ""}
          </div>
        `,
				iconSize: [48, 48],
				iconAnchor: [24, 24],
			}),
		[cluster, isHovered, isClicked, enableAnimations],
	);

	const handleClick = useCallback(() => {
		setIsClicked(true);
		setTimeout(() => setIsClicked(false), 200);
		onClick(cluster);
	}, [cluster, onClick]);

	return (
		<Marker
			position={[cluster.lat, cluster.lon]}
			icon={clusterIcon}
			eventHandlers={{
				click: handleClick,
				mouseover: () => setIsHovered(true),
				mouseout: () => setIsHovered(false),
			}}
			riseOnHover={enableAnimations}
		>
			<Popup maxWidth={300}>
				<div className="p-3 min-w-[200px]">
					<h3 className="font-semibold text-sm mb-2">
						{cluster.photoCount} Photos
						{cluster.place && ` in ${cluster.place}`}
					</h3>

					{cluster.density !== undefined && (
						<div className="text-xs text-gray-600 mb-2">
							Density: {cluster.density.toFixed(1)} photos/deg²
						</div>
					)}

					{cluster.photoTypes && (
						<div className="flex gap-2 text-xs mb-2">
							{cluster.photoTypes.images > 0 && (
								<span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
									📷 {cluster.photoTypes.images}
								</span>
							)}
							{cluster.photoTypes.videos > 0 && (
								<span className="bg-red-100 text-red-700 px-2 py-1 rounded">
									🎥 {cluster.photoTypes.videos}
								</span>
							)}
						</div>
					)}

					<div className="mb-2">
						<button
							type="button"
							className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
							onClick={() => onClick(cluster)}
						>
							View Photos
						</button>
					</div>

					{enableAnimations && (
						<div className="text-xs text-gray-500 text-center">
							Click to explore • Hover to preview
						</div>
					)}
				</div>
			</Popup>
		</Marker>
	);
}

// Enhanced photo marker with animations
function EnhancedPhotoMarker({
	point,
	dir,
	engine,
	selected,
	onSelect,
	onOpen,
	enableAnimations,
}: {
	point: MapPoint;
	dir: string;
	engine: string;
	selected: boolean;
	onSelect: (path: string, selected: boolean) => void;
	onOpen: (path: string) => void;
	enableAnimations: boolean;
}) {
	const [isHovered, setIsHovered] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);

	const markerIcon = useMemo(
		() =>
			new Icon({
				iconUrl: point.thumbnail || thumbUrl(dir, engine, point.path, 64),
				iconSize: [36, 36],
				iconAnchor: [18, 18],
				className: cn(
					"rounded-full border-2 transition-all",
					selected
						? "border-blue-500 ring-2 ring-blue-300 ring-opacity-50"
						: "border-white",
					isHovered
						? "scale-125 ring-2 ring-blue-200 ring-opacity-50"
						: "scale-100",
					!imageLoaded && "bg-gray-200",
					enableAnimations ? "duration-200" : "",
				),
			}),
		[
			point.thumbnail,
			point.path,
			dir,
			engine,
			selected,
			isHovered,
			imageLoaded,
			enableAnimations,
		],
	);

	return (
		<Marker
			position={[point.lat, point.lon]}
			icon={markerIcon}
			riseOnHover={enableAnimations}
			eventHandlers={{
				click: () => onOpen(point.path),
				mouseover: () => setIsHovered(true),
				mouseout: () => setIsHovered(false),
			}}
		>
			<Popup maxWidth={300}>
				<div className="p-3 min-w-[200px]">
					{point.thumbnail && (
						<div className="relative mb-2">
							<ProgressiveImage
								src={point.thumbnail}
								alt={point.caption || "Photo"}
								className="w-full h-32 object-cover rounded"
								thumbSize={64}
								mediumSize={128}
								onLoad={() => setImageLoaded(true)}
							/>
							{!imageLoaded && (
								<div className="absolute inset-0 bg-gray-200 rounded animate-pulse" />
							)}
						</div>
					)}

					<h3 className="font-semibold text-sm mb-1">
						{point.caption || "Untitled Photo"}
					</h3>

					{point.place && (
						<p className="text-xs text-gray-600 mb-2">📍 {point.place}</p>
					)}

					{point.date && (
						<p className="text-xs text-gray-500 mb-2">
							📅 {new Date(point.date * 1000).toLocaleDateString()}
						</p>
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
							{selected ? "✓ Selected" : "Select"}
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

// Virtualized cluster photo modal
function VirtualizedClusterPhotoModal({
	cluster,
	photos,
	loading,
	selectedPhotos,
	onPhotoSelect,
	onPhotoOpen,
	onClose,
	onLoadMore,
	hasMore,
}: {
	cluster: any;
	photos: unknown[];
	loading: boolean;
	selectedPhotos: Set<string>;
	onPhotoSelect: (path: string, selected: boolean) => void;
	onPhotoOpen: (path: string) => void;
	onClose: () => void;
	onLoadMore: () => void;
	hasMore: boolean;
}) {
	const modalRef = useRef<HTMLDivElement>(null);
	const [visibleStart, setVisibleStart] = useState(0);
	const [visibleEnd, setVisibleEnd] = useState(20); // Show 20 items initially

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && hasMore && !loading) {
						onLoadMore();
					}
				});
			},
			{ threshold: 0.1 },
		);

		const trigger = modalRef.current?.querySelector("[data-load-more-trigger]");
		if (trigger) {
			observer.observe(trigger);
		}

		return () => observer.disconnect();
	}, [hasMore, loading, onLoadMore]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full overflow-hidden flex flex-col">
				{/* Header */}
				<div className="p-4 border-b flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold">
							{cluster.photoCount} Photos
							{cluster.place && ` in ${cluster.place}`}
						</h2>
						<p className="text-sm text-gray-600">
							{photos.length} of {cluster.photoCount} loaded
						</p>
					</div>
					<button
						type="button"
						className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
						onClick={onClose}
					>
						×
					</button>
				</div>

				{/* Photo Grid */}
				<div className="flex-1 overflow-y-auto p-4">
					{loading && photos.length === 0 ? (
						<div className="flex items-center justify-center h-64">
							<div className="text-center">
								<div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
								<div className="text-gray-500">Loading photos...</div>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{photos.slice(visibleStart, visibleEnd).map((photo) => (
								<div key={photo.path} className="relative group">
									<button
										type="button"
										className="w-full aspect-square cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded overflow-hidden"
										onClick={() => onPhotoOpen(photo.path)}
									>
										<ProgressiveImage
											src={photo.thumbnail}
											alt={photo.caption || "Photo"}
											className="w-full h-full object-cover"
											thumbSize={96}
											mediumSize={256}
										/>
									</button>

									{/* Selection overlay */}
									<div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded">
										<div className="absolute top-2 left-2">
											<label className="flex items-center">
												<input
													type="checkbox"
													checked={selectedPhotos.has(photo.path)}
													onChange={(e) => {
														e.stopPropagation();
														onPhotoSelect(photo.path, e.target.checked);
													}}
													className="w-4 h-4"
													aria-label={`Select photo: ${photo.caption || "Untitled"}`}
												/>
											</label>
										</div>
									</div>

									{/* Photo info */}
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

					{/* Load more trigger */}
					{hasMore && (
						<div
							ref={modalRef}
							data-load-more-trigger
							className="text-center py-4"
						>
							{loading ? (
								<div className="flex items-center justify-center">
									<div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
									<span className="text-gray-600">Loading more photos...</span>
								</div>
							) : (
								<div className="text-gray-400">Scroll to load more photos</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export function EnhancedClusteredMapView({
	dir,
	engine,
	selectedPhotos = new Set(),
	onPhotoSelect,
	onPhotoOpen,
	className,
	height = "500px",
	showControls = true,
	performanceMode = "balanced",
	enableAnimations = true,
	maxVisibleMarkers = 1000,
}: EnhancedClusteredMapViewProps) {
	const [mapState, setMapState] = useState<MapState>({
		center: { lat: 40.7128, lng: -74.006 },
		zoom: 10,
		bounds: null,
		performanceStats: {
			visibleMarkers: 0,
			renderedClusters: 0,
			memoryUsage: 0,
			fps: 60,
		},
	});

	const [selectedCluster, setSelectedCluster] = useState<unknown>(null);
	const [clusterModalPage, setClusterModalPage] = useState(0);
	const mapRef = useRef<L.Map | null>(null);

	const {
		clusters,
		points,
		loading,
		error,
		total,
		source,
		performance,
		loadClusters,
		loadClusterPhotos,
		clusterPhotos,
		loadingCluster,
		clusterError,
		refreshClusters,
		getMetrics,
	} = useMapClustering({
		dir,
		engine,
		performanceMode,
		enableProgressiveLoading: true,
	});

	// Performance monitoring
	useEffect(() => {
		const fpsInterval = setInterval(() => {
			if (mapRef.current) {
				// Simple FPS calculation (would need more sophisticated implementation)
				setMapState((prev) => ({
					...prev,
					performanceStats: {
						...prev.performanceStats,
						fps: 60 - Math.random() * 10, // Placeholder
					},
				}));
			}
		}, 1000);

		return () => clearInterval(fpsInterval);
	}, []);

	// Handle map events
	const handleBoundsChange = useCallback(
		(bounds: L.LatLngBounds) => {
			setMapState((prev) => ({ ...prev, bounds }));
			loadClusters(bounds, mapState.zoom);
		},
		[loadClusters, mapState.zoom],
	);

	const handleZoomChange = useCallback(
		(zoom: number) => {
			setMapState((prev) => ({ ...prev, zoom }));
			loadClusters(mapState.bounds, zoom);
		},
		[loadClusters, mapState.bounds],
	);

	// Handle cluster click
	const handleClusterClick = useCallback(
		async (cluster: any) => {
			setSelectedCluster(cluster);
			setClusterModalPage(0);
			await loadClusterPhotos(cluster.id, { limit: 20 });
		},
		[loadClusterPhotos],
	);

	// Load more cluster photos
	const handleLoadMorePhotos = useCallback(async () => {
		if (!selectedCluster || loadingCluster(selectedCluster.id)) return;

		setClusterModalPage((prev) => prev + 1);
		await loadClusterPhotos(selectedCluster.id, {
			limit: 20,
			offset: (clusterModalPage + 1) * 20,
		});
	}, [selectedCluster, clusterModalPage, loadingCluster, loadClusterPhotos]);

	// Calculate center from data
	const center = useMemo(() => {
		if (clusters.length > 0 || points.length > 0) {
			const allCoords = [
				...clusters.map((c) => [c.lat, c.lon]),
				...points.map((p) => [p.lat, p.lon]),
			] as [number, number][];

			if (allCoords.length > 0) {
				const bounds = L.latLngBounds(allCoords);
				return bounds.getCenter();
			}
		}
		return mapState.center;
	}, [clusters, points, mapState.center]);

	// Filter markers based on performance constraints
	const visibleElements = useMemo(() => {
		let filteredClusters = clusters;
		let filteredPoints = points;

		// Apply performance limits
		if (clusters.length + points.length > maxVisibleMarkers) {
			// Prioritize clusters over individual points
			if (mapState.zoom < 15) {
				// Show only clusters at lower zoom levels
				filteredPoints = [];
				filteredClusters = clusters.slice(
					0,
					Math.floor(maxVisibleMarkers * 0.8),
				);
			} else {
				// Mix of clusters and points at higher zoom levels
				const clusterLimit = Math.floor(maxVisibleMarkers * 0.6);
				const pointLimit = maxVisibleMarkers - clusterLimit;
				filteredClusters = clusters.slice(0, clusterLimit);
				filteredPoints = points.slice(0, pointLimit);
			}
		}

		return { clusters: filteredClusters, points: filteredPoints };
	}, [clusters, points, mapState.zoom, maxVisibleMarkers]);

	if (error) {
		return (
			<div
				className={cn("bg-red-50 border border-red-200 rounded p-4", className)}
			>
				<div className="text-red-600 font-medium">Map Error</div>
				<div className="text-red-500 text-sm mt-1">{error}</div>
				<button
					type="button"
					className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
					onClick={refreshClusters}
				>
					Try Again
				</button>
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
			{/* Performance controls */}
			{showControls && (
				<div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-3 space-y-2 min-w-[200px]">
					<div className="text-sm text-gray-600 font-medium">
						{loading ? "Loading..." : `${total} locations`}
					</div>

					<div className="text-xs text-gray-500 space-y-1">
						<div>Source: {source}</div>
						<div>Clusters: {visibleElements.clusters.length}</div>
						<div>Points: {visibleElements.points.length}</div>
						<div>Time: {performance.clusteringTime.toFixed(1)}ms</div>
						<div>Cache: {(performance.cacheHitRate * 100).toFixed(0)}%</div>
					</div>

					{loading && (
						<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
					)}

					<div className="flex gap-1">
						<button
							type="button"
							className={cn(
								"text-xs px-2 py-1 rounded",
								performanceMode === "speed"
									? "bg-green-100 text-green-700"
									: "bg-gray-100 text-gray-600",
							)}
							onClick={() => {
								/* Would update performance mode */
							}}
						>
							Speed
						</button>
						<button
							type="button"
							className={cn(
								"text-xs px-2 py-1 rounded",
								performanceMode === "balanced"
									? "bg-blue-100 text-blue-700"
									: "bg-gray-100 text-gray-600",
							)}
							onClick={() => {
								/* Would update performance mode */
							}}
						>
							Balanced
						</button>
						<button
							type="button"
							className={cn(
								"text-xs px-2 py-1 rounded",
								performanceMode === "quality"
									? "bg-purple-100 text-purple-700"
									: "bg-gray-100 text-gray-600",
							)}
							onClick={() => {
								/* Would update performance mode */
							}}
						>
							Quality
						</button>
					</div>
				</div>
			)}

			{/* Map */}
			<MapContainer
				center={[center.lat, center.lng]}
				zoom={mapState.zoom}
				style={{ height, width: "100%" }}
				ref={mapRef}
				className="rounded-lg"
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>

				{/* Map event handler */}
				<MapEventHandler
					onBoundsChange={handleBoundsChange}
					onZoomChange={handleZoomChange}
				/>

				{/* Render clusters */}
				{visibleElements.clusters.map((cluster) => (
					<AnimatedClusterMarker
						key={cluster.id}
						cluster={cluster}
						onClick={handleClusterClick}
						enableAnimations={enableAnimations}
					/>
				))}

				{/* Render individual points */}
				{visibleElements.points.map((point) => (
					<EnhancedPhotoMarker
						key={point.path}
						point={point}
						dir={dir}
						engine={engine}
						selected={selectedPhotos.has(point.path)}
						onSelect={onPhotoSelect || (() => {})}
						onOpen={onPhotoOpen || (() => {})}
						enableAnimations={enableAnimations}
					/>
				))}

				{/* Development mode overlays */}
				{process.env.NODE_ENV === "development" && (
					<>
						{/* Cluster radius visualization */}
						{clusters.map((cluster) => (
							<CircleMarker
								key={`radius-${cluster.id}`}
								center={[cluster.lat, cluster.lon]}
								radius={cluster.radius * 111000}
								pathOptions={{
									color: "blue",
									fillColor: "blue",
									fillOpacity: 0.05,
									weight: 1,
									opacity: 0.3,
								}}
							/>
						))}
					</>
				)}
			</MapContainer>

			{/* Cluster photo modal */}
			{selectedCluster && (
				<VirtualizedClusterPhotoModal
					cluster={selectedCluster}
					photos={clusterPhotos.get(selectedCluster.id) || []}
					loading={loadingCluster(selectedCluster.id)}
					selectedPhotos={selectedPhotos}
					onPhotoSelect={onPhotoSelect || (() => {})}
					onPhotoOpen={onPhotoOpen || (() => {})}
					onClose={() => setSelectedCluster(null)}
					onLoadMore={handleLoadMorePhotos}
					hasMore={
						(clusterPhotos.get(selectedCluster.id)?.length || 0) <
						selectedCluster.photoCount
					}
				/>
			)}
		</div>
	);
}

// Helper components and utilities
function MapEventHandler({
	onBoundsChange,
	onZoomChange,
}: {
	onBoundsChange: (bounds: L.LatLngBounds) => void;
	onZoomChange: (zoom: number) => void;
}) {
	const map = useMap();

	useEffect(() => {
		const handleMoveEnd = () => onBoundsChange(map.getBounds());
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

// Utility functions
function getClusterSizeClass(count: number): string {
	if (count < 10) return "w-8 h-8 text-xs";
	if (count < 50) return "w-10 h-10 text-sm";
	if (count < 200) return "w-12 h-12 text-base";
	if (count < 1000) return "w-14 h-14 text-lg";
	return "w-16 h-16 text-xl";
}

function getClusterColorClass(density: number): string {
	if (density < 1) return "bg-green-500";
	if (density < 5) return "bg-blue-500";
	if (density < 20) return "bg-yellow-500";
	if (density < 50) return "bg-orange-500";
	return "bg-red-500";
}

function formatClusterCount(count: number): string {
	if (count < 1000) return count.toString();
	return `${(count / 1000).toFixed(1)}k`;
}

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp * 1000);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Add custom CSS for animations
const style = document.createElement("style");
style.textContent = `
  @keyframes clusterPulse {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }

  .enhanced-cluster-marker {
    z-index: 1000;
  }

  .enhanced-cluster-icon {
    background: transparent !important;
    border: none !important;
  }
`;

if (!document.head.querySelector("style[data-map-animations]")) {
	style.setAttribute("data-map-animations", "true");
	document.head.appendChild(style);
}
