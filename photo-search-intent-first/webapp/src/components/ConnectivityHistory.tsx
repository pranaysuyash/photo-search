import {
	Activity,
	AlertTriangle,
	BarChart3,
	Clock,
	Download,
	RefreshCw,
	Trash2,
	Upload,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	type ConnectivityEvent,
	type ConnectivityStats,
	connectivityHistoryService,
} from "../services/ConnectivityHistory";
import { Badge } from "./ui/badge";

export function ConnectivityHistory() {
	const [events, setEvents] = useState<ConnectivityEvent[]>([]);
	const [stats, setStats] = useState<ConnectivityStats | null>(null);
	const [loading, setLoading] = useState(false);
	const [eventLimit, setEventLimit] = useState(50);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const loadData = () => {
		setLoading(true);
		try {
			const latestEvents = connectivityHistoryService.getEvents(eventLimit);
			const latestStats = connectivityHistoryService.getLatestStats();
			setEvents(latestEvents);
			setStats(latestStats);
		} catch (error) {
			console.error("Failed to load connectivity history:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatDuration = (ms: number): string => {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
		return `${(ms / 3600000).toFixed(1)}h`;
	};

	const formatTimestamp = (timestamp: number): string => {
		return new Date(timestamp).toLocaleString();
	};

	const getEventIcon = (type: ConnectivityEvent["type"]) => {
		switch (type) {
			case "online":
				return <Wifi className="w-4 h-4 text-green-500" />;
			case "offline":
				return <WifiOff className="w-4 h-4 text-red-500" />;
			case "quality_change":
				return <Activity className="w-4 h-4 text-blue-500" />;
			case "sync_start":
				return <Upload className="w-4 h-4 text-blue-500" />;
			case "sync_complete":
				return <Download className="w-4 h-4 text-green-500" />;
			case "sync_error":
				return <AlertTriangle className="w-4 h-4 text-red-500" />;
			default:
				return <Activity className="w-4 h-4 text-gray-500" />;
		}
	};

	const getEventColor = (type: ConnectivityEvent["type"]) => {
		switch (type) {
			case "online":
				return "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20";
			case "offline":
				return "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/20";
			case "quality_change":
				return "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20";
			case "sync_start":
				return "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20";
			case "sync_complete":
				return "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20";
			case "sync_error":
				return "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/20";
			default:
				return "text-gray-700 bg-gray-50 dark:text-gray-300 dark:bg-gray-900/20";
		}
	};

	const exportHistory = () => {
		try {
			const data = connectivityHistoryService.exportHistory();
			const blob = new Blob([data], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `connectivity-history-${new Date().toISOString().split("T")[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Failed to export history:", error);
		}
	};

	const clearHistory = () => {
		if (confirm("Are you sure you want to clear all connectivity history?")) {
			connectivityHistoryService.clearHistory();
			loadData();
		}
	};

	if (loading && !stats) {
		return (
			<div className="flex items-center justify-center p-4">
				<RefreshCw className="w-4 h-4 animate-spin mr-2" />
				Loading connectivity history...
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Statistics Summary */}
			{stats && (
				<div className="p-3 border rounded space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold flex items-center gap-2">
							<BarChart3 className="w-4 h-4" />
							Connectivity Statistics
						</h3>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={exportHistory}
								className="p-1 text-blue-600 hover:bg-blue-50 rounded"
								title="Export history"
							>
								<Download className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={clearHistory}
								className="p-1 text-red-600 hover:bg-red-50 rounded"
								title="Clear history"
							>
								<Trash2 className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={loadData}
								className="p-1 text-gray-600 hover:bg-gray-50 rounded"
								title="Refresh"
							>
								<RefreshCw className="w-4 h-4" />
							</button>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-gray-600">Total Events:</span>
							<span className="font-medium">{stats.totalEvents}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">Online Events:</span>
							<span className="font-medium text-green-600">
								{stats.onlineEvents}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">Offline Events:</span>
							<span className="font-medium text-red-600">
								{stats.offlineEvents}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">Sync Events:</span>
							<span className="font-medium text-blue-600">
								{stats.syncEvents}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">Error Events:</span>
							<span className="font-medium text-red-600">
								{stats.errorEvents}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">Network Quality:</span>
							<span className="font-medium">
								{(stats.averageNetworkQuality * 100).toFixed(0)}%
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">Current Uptime:</span>
							<span className="font-medium flex items-center gap-1">
								<Clock className="w-3 h-3" />
								{formatDuration(stats.currentUptime)}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">Longest Uptime:</span>
							<span className="font-medium">
								{formatDuration(stats.longestUptime)}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-gray-600">Total Downtime:</span>
							<span className="font-medium">
								{formatDuration(stats.totalDowntime)}
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Recent Events */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold">Recent Events</h3>
					<select
						value={eventLimit}
						onChange={(e) => setEventLimit(Number(e.target.value))}
						className="text-sm border rounded px-2 py-1"
					>
						<option value={10}>Last 10</option>
						<option value={25}>Last 25</option>
						<option value={50}>Last 50</option>
						<option value={100}>Last 100</option>
					</select>
				</div>

				<div className="space-y-1 max-h-64 overflow-y-auto">
					{events.length === 0 ? (
						<div className="text-sm text-gray-500 text-center py-4">
							No connectivity events recorded
						</div>
					) : (
						events.map((event) => (
							<div
								key={event.id}
								className={`p-2 rounded text-xs ${getEventColor(event.type)}`}
							>
								<div className="flex items-start gap-2">
									{getEventIcon(event.type)}
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between mb-1">
											<span className="font-medium capitalize">
												{event.type.replace("_", " ")}
											</span>
											<span className="text-xs opacity-75">
												{formatTimestamp(event.timestamp)}
											</span>
										</div>
										{event.details.reason && (
											<div className="text-xs opacity-90">
												Reason: {event.details.reason}
											</div>
										)}
										{event.details.networkQuality !== undefined && (
											<div className="text-xs opacity-90">
												Network Quality:{" "}
												{(event.details.networkQuality * 100).toFixed(0)}%
												{event.details.latency &&
													` (${event.details.latency}ms)`}
											</div>
										)}
										{event.details.actionsSynced !== undefined && (
											<div className="text-xs opacity-90">
												Actions: {event.details.actionsSynced} synced
												{event.details.actionsFailed &&
													`, ${event.details.actionsFailed} failed`}
												{event.details.duration &&
													` in ${formatDuration(event.details.duration)}`}
											</div>
										)}
										{event.details.error && (
											<div className="text-xs opacity-90 text-red-600">
												Error: {event.details.error}
											</div>
										)}
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Event Type Legend */}
			<div className="flex flex-wrap gap-2 text-xs">
				<Badge
					variant="secondary"
					className="text-green-700 bg-green-50 dark:bg-green-900/20"
				>
					<Wifi className="w-3 h-3 mr-1" />
					Online
				</Badge>
				<Badge
					variant="secondary"
					className="text-red-700 bg-red-50 dark:bg-red-900/20"
				>
					<WifiOff className="w-3 h-3 mr-1" />
					Offline
				</Badge>
				<Badge
					variant="secondary"
					className="text-blue-700 bg-blue-50 dark:bg-blue-900/20"
				>
					<Activity className="w-3 h-3 mr-1" />
					Quality Change
				</Badge>
				<Badge
					variant="secondary"
					className="text-blue-700 bg-blue-50 dark:bg-blue-900/20"
				>
					<Upload className="w-3 h-3 mr-1" />
					Sync Start
				</Badge>
				<Badge
					variant="secondary"
					className="text-green-700 bg-green-50 dark:bg-green-900/20"
				>
					<Download className="w-3 h-3 mr-1" />
					Sync Complete
				</Badge>
				<Badge
					variant="secondary"
					className="text-red-700 bg-red-50 dark:bg-red-900/20"
				>
					<AlertTriangle className="w-3 h-3 mr-1" />
					Sync Error
				</Badge>
			</div>
		</div>
	);
}
