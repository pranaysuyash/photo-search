/**
 * ANN Performance Dashboard Component
 * Real-time performance monitoring and optimization visualization
 */

import {
	AlertTriangle,
	CheckCircle,
	RefreshCw,
	Settings,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PerformanceData {
	timestamp: number;
	inferenceTime: number;
	memoryUsage: number;
	throughput: number;
	accuracy: number;
}

interface BackendMetrics {
	id: string;
	name: string;
	status: "healthy" | "degraded" | "unhealthy";
	inferenceTime: number;
	memoryUsage: number;
	throughput: number;
	accuracy: number;
	load: number;
}

interface OptimizationResult {
	strategy: string;
	improvements: {
		type: string;
		description: string;
		impact: number;
		confidence: number;
	}[];
	timestamp: number;
}

export const ANNPerformanceDashboard: React.FC = () => {
	const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
	const [backendMetrics, setBackendMetrics] = useState<BackendMetrics[]>([]);
	const [optimizationResults, setOptimizationResults] = useState<
		OptimizationResult[]
	>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

	// Mock data generation for demonstration
	const generateMockData = () => {
		const now = Date.now();
		const newData: PerformanceData[] = [];

		for (let i = 0; i < 30; i++) {
			newData.push({
				timestamp: now - (29 - i) * 60000, // Last 30 minutes
				inferenceTime: Math.random() * 200 + 100,
				memoryUsage: Math.random() * 50 + 50,
				throughput: Math.random() * 20 + 10,
				accuracy: Math.random() * 0.2 + 0.8,
			});
		}

		const mockBackends: BackendMetrics[] = [
			{
				id: "tensorflow-js",
				name: "TensorFlow.js",
				status: "healthy",
				inferenceTime: 150,
				memoryUsage: 120,
				throughput: 15,
				accuracy: 0.85,
				load: 0.6,
			},
			{
				id: "onnx-runtime",
				name: "ONNX Runtime",
				status: "healthy",
				inferenceTime: 100,
				memoryUsage: 80,
				throughput: 20,
				accuracy: 0.88,
				load: 0.4,
			},
			{
				id: "pytorch",
				name: "PyTorch",
				status: "degraded",
				inferenceTime: 250,
				memoryUsage: 200,
				throughput: 8,
				accuracy: 0.82,
				load: 0.8,
			},
		];

		const mockOptimizations: OptimizationResult[] = [
			{
				strategy: "Memory Optimization",
				improvements: [
					{
						type: "memory",
						description: "Cleared 20 old cache entries",
						impact: 15,
						confidence: 0.8,
					},
					{
						type: "memory",
						description: "Updated backend selection weights",
						impact: 10,
						confidence: 0.7,
					},
				],
				timestamp: now - 300000, // 5 minutes ago
			},
			{
				strategy: "Latency Optimization",
				improvements: [
					{
						type: "latency",
						description: "Pre-loaded 3 frequently used models",
						impact: 20,
						confidence: 0.9,
					},
					{
						type: "latency",
						description: "Optimized backend selection",
						impact: 15,
						confidence: 0.8,
					},
				],
				timestamp: now - 600000, // 10 minutes ago
			},
		];

		setPerformanceData(newData);
		setBackendMetrics(mockBackends);
		setOptimizationResults(mockOptimizations);
		setLastUpdated(new Date());
		setIsLoading(false);
	};

	useEffect(() => {
		generateMockData();

		// Simulate real-time updates
		const interval = setInterval(() => {
			generateMockData();
		}, 30000); // Update every 30 seconds

		return () => clearInterval(interval);
	}, []);

	const formatTimestamp = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString();
	};

	const getStatusBadge = (status: BackendMetrics["status"]) => {
		const variants = {
			healthy: "default",
			degraded: "secondary",
			unhealthy: "destructive",
		} as const;

		const icons = {
			healthy: <CheckCircle className="w-3 h-3" />,
			degraded: <AlertTriangle className="w-3 h-3" />,
			unhealthy: <AlertTriangle className="w-3 h-3" />,
		};

		return (
			<Badge variant={variants[status]} className="flex items-center gap-1">
				{icons[status]}
				{status}
			</Badge>
		);
	};

	const formatOptimizationTime = (timestamp: number) => {
		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / 60000);

		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes}m ago`;

		const hours = Math.floor(minutes / 60);
		return `${hours}h ago`;
	};

	const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
					<p>Loading performance dashboard...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6 bg-gray-50 min-h-screen">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">
						ANN Performance Dashboard
					</h1>
					<p className="text-gray-600">
						Real-time monitoring and optimization insights
					</p>
				</div>
				<div className="flex items-center gap-4">
					<Button variant="outline" onClick={generateMockData}>
						<RefreshCw className="w-4 h-4 mr-2" />
						Refresh
					</Button>
					<div className="text-sm text-gray-500">
						Last updated: {lastUpdated.toLocaleTimeString()}
					</div>
				</div>
			</div>

			<Tabs defaultValue="overview" className="space-y-4">
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="backends">Backends</TabsTrigger>
					<TabsTrigger value="performance">Performance</TabsTrigger>
					<TabsTrigger value="optimization">Optimization</TabsTrigger>
					<TabsTrigger value="settings">Settings</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-6">
					{/* Key Metrics Cards */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Avg Inference Time
								</CardTitle>
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{performanceData.length > 0
										? `${Math.round(performanceData[performanceData.length - 1].inferenceTime)}ms`
										: "0ms"}
								</div>
								<p className="text-xs text-muted-foreground">
									{performanceData.length > 1 && (
										<span
											className={
												performanceData[performanceData.length - 1]
													.inferenceTime <
												performanceData[performanceData.length - 2]
													.inferenceTime
													? "text-green-600"
													: "text-red-600"
											}
										>
											{performanceData[performanceData.length - 1]
												.inferenceTime <
											performanceData[performanceData.length - 2].inferenceTime
												? "↓"
												: "↑"}
											{Math.abs(
												Math.round(
													performanceData[performanceData.length - 1]
														.inferenceTime -
														performanceData[performanceData.length - 2]
															.inferenceTime,
												),
											)}
											ms
										</span>
									)}
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Memory Usage
								</CardTitle>
								<TrendingDown className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{performanceData.length > 0
										? `${Math.round(performanceData[performanceData.length - 1].memoryUsage)}MB`
										: "0MB"}
								</div>
								<p className="text-xs text-muted-foreground">
									{backendMetrics.length > 0 && (
										<span>Across {backendMetrics.length} backends</span>
									)}
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									Throughput
								</CardTitle>
								<TrendingUp className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{performanceData.length > 0
										? `${Math.round(performanceData[performanceData.length - 1].throughput)}/s`
										: "0/s"}
								</div>
								<p className="text-xs text-muted-foreground">
									Requests per second
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Accuracy</CardTitle>
								<CheckCircle className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{performanceData.length > 0
										? `${Math.round(performanceData[performanceData.length - 1].accuracy * 100)}%`
										: "0%"}
								</div>
								<p className="text-xs text-muted-foreground">
									Average model accuracy
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Performance Chart */}
					<Card>
						<CardHeader>
							<CardTitle>Performance Trends</CardTitle>
							<CardDescription>
								Real-time performance metrics over the last 30 minutes
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<LineChart data={performanceData}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="timestamp" tickFormatter={formatTimestamp} />
									<YAxis />
									<Tooltip
										labelFormatter={(value) =>
											`Time: ${formatTimestamp(value)}`
										}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="inferenceTime"
										stroke="#8884d8"
										name="Inference Time (ms)"
									/>
									<Line
										type="monotone"
										dataKey="memoryUsage"
										stroke="#82ca9d"
										name="Memory Usage (MB)"
									/>
									<Line
										type="monotone"
										dataKey="throughput"
										stroke="#ffc658"
										name="Throughput (/s)"
									/>
								</LineChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="backends" className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{backendMetrics.map((backend) => (
							<Card key={backend.id}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="text-lg">{backend.name}</CardTitle>
										{getStatusBadge(backend.status)}
									</div>
									<CardDescription>{backend.id}</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div className="flex justify-between">
											<span className="text-sm">Load</span>
											<span className="text-sm font-medium">
												{Math.round(backend.load * 100)}%
											</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className={`h-2 rounded-full ${
													backend.load < 0.5
														? "bg-green-500"
														: backend.load < 0.8
															? "bg-yellow-500"
															: "bg-red-500"
												}`}
												style={{ width: `${backend.load * 100}%` }}
											/>
										</div>
										<div className="space-y-2 text-sm">
											<div className="flex justify-between">
												<span>Inference Time</span>
												<span>{backend.inferenceTime}ms</span>
											</div>
											<div className="flex justify-between">
												<span>Memory</span>
												<span>{backend.memoryUsage}MB</span>
											</div>
											<div className="flex justify-between">
												<span>Throughput</span>
												<span>{backend.throughput}/s</span>
											</div>
											<div className="flex justify-between">
												<span>Accuracy</span>
												<span>{Math.round(backend.accuracy * 100)}%</span>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				<TabsContent value="performance" className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<CardTitle>Backend Comparison</CardTitle>
								<CardDescription>
									Performance metrics across different backends
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<BarChart data={backendMetrics}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="name" />
										<YAxis />
										<Tooltip />
										<Legend />
										<Bar
											dataKey="inferenceTime"
											fill="#8884d8"
											name="Inference Time (ms)"
										/>
										<Bar
											dataKey="memoryUsage"
											fill="#82ca9d"
											name="Memory Usage (MB)"
										/>
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Accuracy Distribution</CardTitle>
								<CardDescription>
									Model accuracy across different backends
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<PieChart>
										<Pie
											data={backendMetrics.map((b) => ({
												...b,
												value: b.accuracy * 100,
											}))}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({ name, value }) =>
												`${name}: ${Math.round(value)}%`
											}
											outerRadius={80}
											fill="#8884d8"
											dataKey="value"
										>
											{backendMetrics.map((entry, index) => (
												<Cell
													key={`cell-${index}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip />
									</PieChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="optimization" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Recent Optimizations</CardTitle>
							<CardDescription>
								Automatic performance improvements and their impact
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{optimizationResults.map((result, index) => (
									<div key={index} className="border rounded-lg p-4">
										<div className="flex items-center justify-between mb-2">
											<h3 className="font-semibold">{result.strategy}</h3>
											<span className="text-sm text-gray-500">
												{formatOptimizationTime(result.timestamp)}
											</span>
										</div>
										<div className="space-y-2">
											{result.improvements.map((improvement, impIndex) => (
												<div
													key={impIndex}
													className="flex items-center justify-between text-sm"
												>
													<span>{improvement.description}</span>
													<div className="flex items-center gap-2">
														<Badge variant="outline">{improvement.type}</Badge>
														<span className="font-medium text-green-600">
															+{Math.round(improvement.impact)}%
														</span>
														<span className="text-gray-500">
															({Math.round(improvement.confidence * 100)}%
															confidence)
														</span>
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="settings" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Optimization Settings</CardTitle>
							<CardDescription>
								Configure automatic performance optimization
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="font-medium">Auto Optimization</h3>
										<p className="text-sm text-gray-600">
											Enable automatic performance tuning
										</p>
									</div>
									<Button variant="outline" size="sm">
										<Settings className="w-4 h-4 mr-2" />
										Configure
									</Button>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-4">
										<div>
											<label className="text-sm font-medium">
												Optimization Interval
											</label>
											<select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
												<option>1 minute</option>
												<option>5 minutes</option>
												<option>10 minutes</option>
												<option>30 minutes</option>
											</select>
										</div>

										<div>
											<label className="text-sm font-medium">
												Performance Threshold
											</label>
											<input
												type="range"
												min="0"
												max="100"
												defaultValue="80"
												className="mt-1 block w-full"
											/>
											<div className="text-sm text-gray-600">80%</div>
										</div>
									</div>

									<div className="space-y-4">
										<div>
											<label className="text-sm font-medium">
												Cache Settings
											</label>
											<div className="mt-2 space-y-2">
												<label className="flex items-center">
													<input
														type="checkbox"
														className="mr-2"
														defaultChecked
													/>
													Enable caching
												</label>
												<label className="flex items-center">
													<input
														type="checkbox"
														className="mr-2"
														defaultChecked
													/>
													Enable batching
												</label>
											</div>
										</div>

										<div>
											<label className="text-sm font-medium">
												Max Cache Size
											</label>
											<input
												type="number"
												defaultValue="100"
												className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
											/>
										</div>
									</div>
								</div>

								<div className="pt-4">
									<Button className="w-full">Save Settings</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};
