import {
	Activity,
	AlertCircle,
	CheckCircle,
	Clock,
	Cpu,
	Database,
	HardDrive,
	Image,
	Search,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { OfflineStatusIndicator } from "./OfflineStatusIndicator";

interface StatusBarProps {
	photoCount?: number;
	indexedCount?: number;
	searchProvider?: string;
	isIndexing?: boolean;
	isConnected?: boolean;
	currentDirectory?: string;
	lastSync?: Date;
	activeJobs?: number;
}

export function StatusBar({
	photoCount = 0,
	indexedCount = 0,
	searchProvider = "local",
	isIndexing = false,
	isConnected = true,
	currentDirectory = "",
	lastSync,
	activeJobs = 0,
}: StatusBarProps) {
	const [cpuUsage, setCpuUsage] = useState(0);
	const [memoryUsage, setMemoryUsage] = useState(0);

	useEffect(() => {
		// Simulate CPU/Memory monitoring
		const interval = setInterval(() => {
			setCpuUsage(Math.random() * 30 + (isIndexing ? 40 : 10));
			setMemoryUsage(Math.random() * 20 + 30);
		}, 2000);

		return () => clearInterval(interval);
	}, [isIndexing]);

	const formatDirectory = (dir: string) => {
		if (!dir) return "No directory selected";
		const parts = dir.split("/");
		if (parts.length > 3) {
			return `.../${parts.slice(-2).join("/")}`;
		}
		return dir;
	};

	const formatTime = (date?: Date) => {
		if (!date) return "Never";
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);

		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	};

	return (
		<div className="status-bar">
			<div className="status-content">
				{/* Left section */}
				<div className="status-section">
					{/* Directory */}
					<div className="status-item">
						<HardDrive className="status-icon" />
						<span className="status-text">
							{formatDirectory(currentDirectory)}
						</span>
					</div>

					{/* Photo count */}
					<div className="status-item">
						<Image className="status-icon" />
						<span>{photoCount.toLocaleString()} photos</span>
					</div>

					{/* Indexed count */}
					{isIndexing ? (
						<div className="status-item">
							<div className="status-spinner" />
							<span className="status-text processing">
								Indexing... {indexedCount}/{photoCount}
							</span>
						</div>
					) : (
						<div className="status-item">
							<CheckCircle className="status-icon" />
							<span className="status-text success">
								{indexedCount.toLocaleString()} indexed
							</span>
						</div>
					)}
				</div>

				{/* Center section */}
				<div className="status-section">
					{/* Search provider */}
					<div className="status-item">
						<Search className="status-icon" />
						<span className="capitalize">{searchProvider}</span>
					</div>

					{/* Active jobs */}
					{activeJobs > 0 && (
						<div className="status-item">
							<Activity className="status-icon" />
							<span className="status-text warning">
								{activeJobs} active job{activeJobs !== 1 ? "s" : ""}
							</span>
						</div>
					)}

					{/* Last sync */}
					<div className="status-item">
						<Clock className="status-icon" />
						<span>Synced {formatTime(lastSync)}</span>
					</div>
				</div>

				{/* Right section */}
				<div className="status-section">
					{/* CPU usage */}
					<div className="status-item">
						<Cpu className="status-icon" />
						<span>{cpuUsage.toFixed(0)}%</span>
					</div>

					{/* Memory usage */}
					<div className="status-item">
						<Database className="status-icon" />
						<span>{memoryUsage.toFixed(0)}%</span>
					</div>

					{/* Connection status */}
					<div className="status-item">
						<OfflineStatusIndicator />
					</div>
				</div>
			</div>
		</div>
	);
}

interface MiniStatusProps {
	photoCount?: number;
	isIndexing?: boolean;
	activeJobs?: number;
}

export function MiniStatus({
	photoCount = 0,
	isIndexing = false,
	activeJobs = 0,
}: MiniStatusProps) {
	return (
		<div className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-200">
			<div className="flex items-center gap-1">
				<Image className="w-3 h-3" />
				<span>{photoCount.toLocaleString()}</span>
			</div>

			{isIndexing && (
				<div className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
					<div className="w-3 h-3 border-2 border-blue-700 dark:border-blue-300 border-t-transparent rounded-full animate-spin" />
					<span>Indexing</span>
				</div>
			)}

			{activeJobs > 0 && (
				<div className="flex items-center gap-1 text-orange-600 dark:text-orange-300">
					<Zap className="w-3 h-3" />
					<span>{activeJobs}</span>
				</div>
			)}
		</div>
	);
}

interface StatusIndicatorProps {
	status: "idle" | "processing" | "success" | "error";
	message?: string;
}

export function StatusIndicator({ status, message }: StatusIndicatorProps) {
	const statusConfig = {
		idle: {
			color: "text-gray-600 dark:text-gray-300",
			icon: <CheckCircle className="w-4 h-4" />,
			defaultMessage: "Ready",
		},
		processing: {
			color: "text-blue-700 dark:text-blue-300",
			icon: (
				<div className="w-4 h-4 border-2 border-blue-700 dark:border-blue-300 border-t-transparent rounded-full animate-spin" />
			),
			defaultMessage: "Processing...",
		},
		success: {
			color: "text-green-700 dark:text-green-300",
			icon: <CheckCircle className="w-4 h-4" />,
			defaultMessage: "Success",
		},
		error: {
			color: "text-red-700 dark:text-red-300",
			icon: <AlertCircle className="w-4 h-4" />,
			defaultMessage: "Error",
		},
	};

	const config = statusConfig[status];

	return (
		<div className={`flex items-center gap-2 ${config.color}`}>
			{config.icon}
			<span className="text-sm">{message || config.defaultMessage}</span>
		</div>
	);
}
