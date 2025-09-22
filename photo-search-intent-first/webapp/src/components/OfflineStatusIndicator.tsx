import {
	Activity,
	AlertTriangle,
	RefreshCw,
	Wifi,
	WifiOff,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { offlineService } from "../services/OfflineService";

export interface OfflineStatus {
	isOnline: boolean;
	queueStats: {
		totalActions: number;
		pendingActions: number;
		failedActions: number;
		storageSize: number;
	};
	networkQuality: number;
	isSyncing: boolean;
}

export function OfflineStatusIndicator() {
	const [status, setStatus] = useState<OfflineStatus>({
		isOnline: navigator.onLine,
		queueStats: {
			totalActions: 0,
			pendingActions: 0,
			failedActions: 0,
			storageSize: 0,
		},
		networkQuality: 1,
		isSyncing: false,
	});

	const [expanded, setExpanded] = useState(false);
	const [lastUpdate, setLastUpdate] = useState(Date.now());

	// Update status information
	const updateStatus = useCallback(async () => {
		try {
			const isOnline = offlineService.getStatus();
			const queueStats = await offlineService.getQueueStatistics();
			const networkQuality = offlineService.getNetworkQuality();

			setStatus({
				isOnline,
				queueStats,
				networkQuality,
				isSyncing: false, // This would need to be tracked in OfflineService
			});
			setLastUpdate(Date.now());
		} catch (error) {
			console.error("[OfflineStatusIndicator] Failed to update status:", error);
		}
	}, []);

	// Set up status listeners and periodic updates
	useEffect(() => {
		// Initial update
		updateStatus();

		// Listen to offline service status changes
		const unsubscribe = offlineService.onStatusChange((isOnline) => {
			setStatus((prev) => ({
				...prev,
				isOnline,
			}));
		});

		// Periodic updates
		const interval = setInterval(updateStatus, 5000);

		return () => {
			unsubscribe();
			clearInterval(interval);
		};
	}, [updateStatus]);

	// Format network quality as text
	const getNetworkQualityText = (quality: number): string => {
		if (quality >= 0.8) return "Excellent";
		if (quality >= 0.6) return "Good";
		if (quality >= 0.3) return "Fair";
		return "Poor";
	};

	// Format network quality as color
	const getNetworkQualityColor = (quality: number): string => {
		if (quality >= 0.8) return "text-green-600";
		if (quality >= 0.6) return "text-green-500";
		if (quality >= 0.3) return "text-yellow-500";
		return "text-red-500";
	};

	// Format storage size
	const formatStorageSize = (bytes: number): string => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / k ** i).toFixed(1)) + " " + sizes[i];
	};

	// Get status icon
	const getStatusIcon = () => {
		if (!status.isOnline) {
			return <WifiOff className="w-4 h-4" />;
		}
		if (status.queueStats.failedActions > 0) {
			return <AlertTriangle className="w-4 h-4" />;
		}
		if (status.queueStats.totalActions > 0) {
			return <Activity className="w-4 h-4" />;
		}
		return <Wifi className="w-4 h-4" />;
	};

	// Get status color
	const getStatusColor = (): string => {
		if (!status.isOnline)
			return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
		if (status.queueStats.failedActions > 0)
			return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
		if (status.queueStats.totalActions > 0)
			return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
		return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
	};

	// Get status text
	const getStatusText = (): string => {
		if (!status.isOnline) return "Offline";
		if (status.queueStats.failedActions > 0)
			return `${status.queueStats.failedActions} failed`;
		if (status.queueStats.totalActions > 0)
			return `${status.queueStats.totalActions} queued`;
		return "Online";
	};

	const now = Date.now();
	const isStale = now - lastUpdate > 10000; // 10 seconds

	return (
		<div className="relative">
			{/* Main status indicator */}
			<div
				className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${getStatusColor()} cursor-pointer transition-colors`}
				onClick={() => setExpanded(!expanded)}
				role="button"
				tabIndex={0}
				aria-label="Connection status details"
				aria-expanded={expanded}
			>
				{getStatusIcon()}
				<span>{getStatusText()}</span>
				{isStale && <RefreshCw className="w-3 h-3 animate-spin opacity-50" />}
				<span className="text-xs opacity-60 ml-1">
					({getNetworkQualityText(status.networkQuality)})
				</span>
			</div>

			{/* Expanded details panel */}
			{expanded && (
				<div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
					<div className="p-4">
						<div className="flex items-center justify-between mb-3">
							<h3 className="font-medium text-gray-900 dark:text-white">
								Connection Status
							</h3>
							<button
								type="button"
								onClick={() => setExpanded(false)}
								className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
								aria-label="Close status details"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						{/* Connection Status */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-600 dark:text-gray-400">
									Connection
								</span>
								<div className="flex items-center gap-2">
									{status.isOnline ? (
										<div className="w-2 h-2 bg-green-500 rounded-full"></div>
									) : (
										<div className="w-2 h-2 bg-red-500 rounded-full"></div>
									)}
									<span className="text-sm font-medium">
										{status.isOnline ? "Online" : "Offline"}
									</span>
								</div>
							</div>

							{/* Network Quality */}
							<div className="flex items-center justify-between">
								<span className="text-sm text-gray-600 dark:text-gray-400">
									Network Quality
								</span>
								<span
									className={`text-sm font-medium ${getNetworkQualityColor(status.networkQuality)}`}
								>
									{getNetworkQualityText(status.networkQuality)}
								</span>
							</div>

							{/* Queue Stats */}
							{status.queueStats.totalActions > 0 && (
								<div className="border-t dark:border-gray-700 pt-3 space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-600 dark:text-gray-400">
											Pending Actions
										</span>
										<span className="text-sm font-medium text-blue-600 dark:text-blue-400">
											{status.queueStats.pendingActions}
										</span>
									</div>

									{status.queueStats.failedActions > 0 && (
										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-600 dark:text-gray-400">
												Failed Actions
											</span>
											<span className="text-sm font-medium text-red-600 dark:text-red-400">
												{status.queueStats.failedActions}
											</span>
										</div>
									)}

									<div className="flex items-center justify-between">
										<span className="text-sm text-gray-600 dark:text-gray-400">
											Storage Used
										</span>
										<span className="text-sm font-medium">
											{formatStorageSize(status.queueStats.storageSize)}
										</span>
									</div>
								</div>
							)}

							{/* Last Updated */}
							<div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-700">
								Last updated: {new Date(lastUpdate).toLocaleTimeString()}
							</div>
						</div>

						{/* Action Buttons */}
						<div className="mt-4 flex gap-2">
							{status.queueStats.totalActions > 0 && (
								<button
									type="button"
									onClick={async () => {
										await offlineService.syncQueue();
										updateStatus();
									}}
									className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
								>
									Sync Now
								</button>
							)}
							{status.queueStats.failedActions > 0 && (
								<button
									type="button"
									onClick={async () => {
										await offlineService.retryFailedActions();
										updateStatus();
									}}
									className="flex-1 px-3 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
								>
									Retry Failed
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// Hook for easy integration
export function useOfflineStatus() {
	const [status, setStatus] = useState<OfflineStatus>({
		isOnline: navigator.onLine,
		queueStats: {
			totalActions: 0,
			pendingActions: 0,
			failedActions: 0,
			storageSize: 0,
		},
		networkQuality: 1,
		isSyncing: false,
	});

	const updateStatus = useCallback(async () => {
		try {
			const isOnline = offlineService.getStatus();
			const queueStats = await offlineService.getQueueStatistics();
			const networkQuality = offlineService.getNetworkQuality();

			setStatus({
				isOnline,
				queueStats,
				networkQuality,
				isSyncing: false,
			});
		} catch (error) {
			console.error("[useOfflineStatus] Failed to update status:", error);
		}
	}, []);

	useEffect(() => {
		updateStatus();

		const unsubscribe = offlineService.onStatusChange((isOnline) => {
			setStatus((prev) => ({ ...prev, isOnline }));
		});

		const interval = setInterval(updateStatus, 5000);

		return () => {
			unsubscribe();
			clearInterval(interval);
		};
	}, [updateStatus]);

	return { status, updateStatus };
}
