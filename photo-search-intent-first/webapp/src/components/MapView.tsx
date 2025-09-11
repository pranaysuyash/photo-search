interface MapViewProps {
	points: { lat: number; lon: number }[];
	onLoadMap: () => void;
}

export default function MapView({ points, onLoadMap }: MapViewProps) {
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
