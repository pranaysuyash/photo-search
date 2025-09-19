import { useEffect, useState } from "react";
import { performanceMonitor } from "../utils/performance";

interface PerformanceMetricsProps {
	visible?: boolean;
}

type Metric = { name: string; count: number; total: number; avg: number };

export const PerformanceMetrics = ({
	visible = false,
}: PerformanceMetricsProps) => {
	const [isVisible, setIsVisible] = useState(visible);
	const [metrics, setMetrics] = useState<Metric[]>([]);

	useEffect(() => {
		if (!isVisible) return;

		const updateMetrics = () => {
			const recentMetrics = performanceMonitor.getRecentMetrics(1);
			const groupedMetrics: Record<
				string,
				{ count: number; total: number; avg: number }
			> = {};

			// Group metrics by name and calculate averages
			recentMetrics.forEach((metric) => {
				if (!groupedMetrics[metric.name]) {
					groupedMetrics[metric.name] = { count: 0, total: 0, avg: 0 };
				}

				groupedMetrics[metric.name].count += 1;
				groupedMetrics[metric.name].total += metric.duration;
				groupedMetrics[metric.name].avg =
					groupedMetrics[metric.name].total / groupedMetrics[metric.name].count;
			});

			// Convert to array and sort by average duration
			const metricsArray: Metric[] = Object.entries(groupedMetrics)
				.map(([name, data]) => ({ name, ...data }))
				.sort((a, b) => b.avg - a.avg);

			setMetrics(metricsArray);
		};

		// Update metrics every second when visible
		const interval = setInterval(updateMetrics, 1000);
		updateMetrics(); // Initial update

		// Cleanup
		return () => clearInterval(interval);
	}, [isVisible]);

	if (!isVisible) {
		return (
			<button
				type="button"
				onClick={() => setIsVisible(true)}
				className="fixed bottom-2 right-2 z-[9999] bg-blue-600 text-white rounded px-3 py-2 text-xs shadow"
			>
				Show Perf
			</button>
		);
	}

	return (
		<div className="fixed bottom-2 right-2 z-[9999] bg-black/90 text-white rounded-lg p-4 max-w-[400px] max-h-[300px] overflow-auto font-mono text-xs">
			<div className="flex items-center justify-between mb-3">
				<h3 className="m-0 text-sm">Performance Metrics</h3>
				<button
					type="button"
					onClick={() => setIsVisible(false)}
					className="px-2 py-1 border border-gray-500 rounded text-white"
				>
					Hide
				</button>
			</div>

			<div className="mb-2">
				<strong>Recent Operations (last 1 min):</strong>
			</div>

			{metrics.length === 0 ? (
				<div>No metrics available</div>
			) : (
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<th className="text-left border-b border-gray-600 p-1">
								Operation
							</th>
							<th className="text-right border-b border-gray-600 p-1">Count</th>
							<th className="text-right border-b border-gray-600 p-1">
								Avg (ms)
							</th>
						</tr>
					</thead>
					<tbody>
						{metrics.map((metric) => (
							<tr key={metric.name}>
								<td className="p-1">{metric.name}</td>
								<td className="text-right p-1">{metric.count}</td>
								<td className="text-right p-1">{metric.avg.toFixed(2)}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};
