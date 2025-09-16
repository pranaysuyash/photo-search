import { useState, useEffect } from "react";
import { performanceMonitor } from "../utils/performance";

interface PerformanceMetricsProps {
	visible?: boolean;
}

export const PerformanceMetrics = ({ visible = false }: PerformanceMetricsProps) => {
	const [isVisible, setIsVisible] = useState(visible);
	const [metrics, setMetrics] = useState<any[]>([]);

	useEffect(() => {
		if (!isVisible) return;

		const updateMetrics = () => {
			const recentMetrics = performanceMonitor.getRecentMetrics(1);
			const groupedMetrics: Record<string, { count: number; total: number; avg: number }> = {};

			// Group metrics by name and calculate averages
			recentMetrics.forEach(metric => {
				if (!groupedMetrics[metric.name]) {
					groupedMetrics[metric.name] = { count: 0, total: 0, avg: 0 };
				}
				
				groupedMetrics[metric.name].count += 1;
				groupedMetrics[metric.name].total += metric.duration;
				groupedMetrics[metric.name].avg = 
					groupedMetrics[metric.name].total / groupedMetrics[metric.name].count;
			});

			// Convert to array and sort by average duration
			const metricsArray = Object.entries(groupedMetrics)
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
				onClick={() => setIsVisible(true)}
				style={{
					position: "fixed",
					bottom: "10px",
					right: "10px",
					zIndex: 9999,
					background: "#3b82f6",
					color: "white",
					border: "none",
					borderRadius: "4px",
					padding: "8px 12px",
					cursor: "pointer",
					fontSize: "12px"
				}}
			>
				Show Perf
			</button>
		);
	}

	return (
		<div
			style={{
				position: "fixed",
				bottom: "10px",
				right: "10px",
				zIndex: 9999,
				background: "rgba(0, 0, 0, 0.9)",
				color: "white",
				borderRadius: "8px",
				padding: "16px",
				maxWidth: "400px",
				maxHeight: "300px",
				overflow: "auto",
				fontFamily: "monospace",
				fontSize: "12px"
			}}
		>
			<div style={{ 
				display: "flex", 
				justifyContent: "space-between", 
				alignItems: "center", 
				marginBottom: "12px" 
			}}>
				<h3 style={{ margin: 0, fontSize: "14px" }}>Performance Metrics</h3>
				<button
					onClick={() => setIsVisible(false)}
					style={{
						background: "transparent",
						color: "white",
						border: "1px solid #6b7280",
						borderRadius: "4px",
						padding: "4px 8px",
						cursor: "pointer",
						fontSize: "12px"
					}}
				>
					Hide
				</button>
			</div>
			
			<div style={{ marginBottom: "8px" }}>
				<strong>Recent Operations (last 1 min):</strong>
			</div>
			
			{metrics.length === 0 ? (
				<div>No metrics available</div>
			) : (
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr>
							<th style={{ textAlign: "left", borderBottom: "1px solid #4b5563", padding: "4px" }}>Operation</th>
							<th style={{ textAlign: "right", borderBottom: "1px solid #4b5563", padding: "4px" }}>Count</th>
							<th style={{ textAlign: "right", borderBottom: "1px solid #4b5563", padding: "4px" }}>Avg (ms)</th>
						</tr>
					</thead>
					<tbody>
						{metrics.map((metric, index) => (
							<tr key={index}>
								<td style={{ padding: "4px" }}>{metric.name}</td>
								<td style={{ textAlign: "right", padding: "4px" }}>{metric.count}</td>
								<td style={{ textAlign: "right", padding: "4px" }}>{metric.avg.toFixed(2)}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};