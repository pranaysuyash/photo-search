// Backup Dashboard Component
// User Intent: "I want to know my photos are safe and backed up"
// Shows backup status in a friendly, reassuring way

import {
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	Clock,
	Cloud,
	FolderOpen,
	HardDrive,
	Info,
	RefreshCw,
	Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	type BackupConfig,
	type BackupJob,
	type BackupProvider,
	backupService,
} from "../services/BackupService";

interface BackupDashboardProps {
	isOpen: boolean;
	onClose: () => void;
}

export function BackupDashboard({ isOpen, onClose }: BackupDashboardProps) {
	const [status, setStatus] = useState(backupService.getStatus());
	const [health, setHealth] = useState(backupService.checkHealth());
	const [activeTab, setActiveTab] = useState<
		"overview" | "settings" | "history"
	>("overview");
	const [config, setConfig] = useState<BackupConfig>({
		enabled: false,
		providers: [],
		frequency: "daily",
		includePaths: [],
		excludePatterns: [],
		maxVersions: 5,
		compressionEnabled: true,
		encryptionEnabled: false,
	});

	useEffect(() => {
		if (!isOpen) return;

		// Update status every second when open
		const interval = setInterval(() => {
			setStatus(backupService.getStatus());
			setHealth(backupService.checkHealth());
		}, 1000);

		// Listen for backup events
		const handleUpdate = () => {
			setStatus(backupService.getStatus());
		};

		backupService.on("backup-started", handleUpdate);
		backupService.on("backup-completed", handleUpdate);
		backupService.on("backup-failed", handleUpdate);

		return () => {
			clearInterval(interval);
			backupService.off("backup-started", handleUpdate);
			backupService.off("backup-completed", handleUpdate);
			backupService.off("backup-failed", handleUpdate);
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
	};

	const formatRelativeTime = (date?: Date): string => {
		if (!date) return "Never";
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
		if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
		return "Just now";
	};

	const getHealthIcon = () => {
		if (health.isHealthy) {
			return <CheckCircle className="w-6 h-6 text-green-500" />;
		}
		if (health.issues.length > 2) {
			return <AlertTriangle className="w-6 h-6 text-red-500" />;
		}
		return <AlertCircle className="w-6 h-6 text-yellow-500" />;
	};

	const getHealthMessage = () => {
		if (health.isHealthy) {
			return "Your photos are safe and protected!";
		}
		if (health.issues.length > 2) {
			return "Your photos need attention";
		}
		return "Your photos could be safer";
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
					<div className="flex items-center gap-3">
						<Shield className="w-8 h-8 text-blue-500" />
						<div>
							<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
								Photo Backup & Safety
							</h2>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Keep your memories safe, automatically
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					>
						✕
					</button>
				</div>

				{/* Health Status Banner */}
				<div
					className={`p-4 ${health.isHealthy ? "bg-green-50 dark:bg-green-900/20" : "bg-yellow-50 dark:bg-yellow-900/20"}`}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							{getHealthIcon()}
							<div>
								<h3 className="font-semibold text-gray-900 dark:text-white">
									{getHealthMessage()}
								</h3>
								{status.lastBackup && (
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Last backup: {formatRelativeTime(status.lastBackup)}
									</p>
								)}
							</div>
						</div>
						{!status.enabled && (
							<button
								type="button"
								onClick={() => {
									backupService.setEnabled(true);
									setStatus(backupService.getStatus());
								}}
								className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
							>
								Turn on backup
							</button>
						)}
					</div>
				</div>

				{/* Tabs */}
				<div className="flex border-b dark:border-gray-700">
					<button
						type="button"
						onClick={() => setActiveTab("overview")}
						className={`px-6 py-3 font-medium ${
							activeTab === "overview"
								? "text-blue-500 border-b-2 border-blue-500"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						Overview
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("settings")}
						className={`px-6 py-3 font-medium ${
							activeTab === "settings"
								? "text-blue-500 border-b-2 border-blue-500"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						Settings
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("history")}
						className={`px-6 py-3 font-medium ${
							activeTab === "history"
								? "text-blue-500 border-b-2 border-blue-500"
								: "text-gray-600 dark:text-gray-400"
						}`}
					>
						History
					</button>
				</div>

				{/* Content */}
				<div className="p-6 overflow-y-auto max-h-[50vh]">
					{activeTab === "overview" && (
						<div className="space-y-6">
							{/* Statistics */}
							<div className="grid grid-cols-3 gap-4">
								<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
									<div className="flex items-center justify-between mb-2">
										<FolderOpen className="w-5 h-5 text-gray-400" />
										<span className="text-2xl font-bold text-gray-900 dark:text-white">
											{status.totalBackedUp.toLocaleString()}
										</span>
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Photos protected
									</p>
								</div>

								<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
									<div className="flex items-center justify-between mb-2">
										<HardDrive className="w-5 h-5 text-gray-400" />
										<span className="text-2xl font-bold text-gray-900 dark:text-white">
											{formatBytes(status.totalSize)}
										</span>
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Total size
									</p>
								</div>

								<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
									<div className="flex items-center justify-between mb-2">
										<Clock className="w-5 h-5 text-gray-400" />
										<span className="text-2xl font-bold text-gray-900 dark:text-white">
											{status.nextScheduled
												? formatRelativeTime(status.nextScheduled)
												: "Manual"}
										</span>
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Next backup
									</p>
								</div>
							</div>

							{/* Active Jobs */}
							{status.activeJobs.length > 0 && (
								<div>
									<h3 className="font-semibold mb-3">Currently backing up</h3>
									<div className="space-y-2">
										{status.activeJobs.map((job) => (
											<ActiveJobCard key={job.id} job={job} />
										))}
									</div>
								</div>
							)}

							{/* Recommendations */}
							{health.recommendations.length > 0 && (
								<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
									<div className="flex items-start gap-3">
										<Info className="w-5 h-5 text-blue-500 mt-0.5" />
										<div>
											<h3 className="font-semibold text-gray-900 dark:text-white mb-2">
												Ways to improve your backup
											</h3>
											<ul className="space-y-1">
												{health.recommendations.map((rec, idx) => (
													<li
														key={`rec-${idx}`}
														className="text-sm text-gray-600 dark:text-gray-400"
													>
														• {rec}
													</li>
												))}
											</ul>
										</div>
									</div>
								</div>
							)}

							{/* Quick Actions */}
							<div className="flex gap-3">
								<button
									type="button"
									onClick={() => backupService.startBackup()}
									className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
								>
									<RefreshCw className="w-5 h-5" />
									Backup now
								</button>
								<button
									type="button"
									onClick={() => setActiveTab("settings")}
									className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
								>
									<Shield className="w-5 h-5" />
									Add backup location
								</button>
							</div>
						</div>
					)}

					{activeTab === "settings" && (
						<BackupSettings
							config={config}
							onChange={(newConfig) => {
								setConfig(newConfig);
								backupService.configure(newConfig);
							}}
						/>
					)}

					{activeTab === "history" && <BackupHistory />}
				</div>
			</div>
		</div>
	);
}

// Active job card component
function ActiveJobCard({ job }: { job: BackupJob }) {
	const progress =
		job.totalFiles > 0 ? (job.processedFiles / job.totalFiles) * 100 : 0;

	return (
		<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<Cloud className="w-4 h-4 text-blue-500" />
					<span className="font-medium">Backing up to {job.provider}</span>
				</div>
				<span className="text-sm text-gray-500">{progress.toFixed(0)}%</span>
			</div>
			<div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
				<div
					className="bg-blue-500 h-2 rounded-full transition-all"
					style={{ width: `${progress}%` }}
				/>
			</div>
			<div className="flex items-center justify-between text-xs text-gray-500">
				<span>
					{job.processedFiles} of {job.totalFiles} photos
				</span>
				{job.estimatedTimeRemaining && (
					<span>
						About {Math.ceil(job.estimatedTimeRemaining / 60)} minutes left
					</span>
				)}
			</div>
			{job.currentFile && (
				<p className="text-xs text-gray-400 mt-1 truncate">
					Saving: {job.currentFile}
				</p>
			)}
		</div>
	);
}

// Backup settings component
function BackupSettings({
	config,
	onChange,
}: {
	config: BackupConfig;
	onChange: (config: BackupConfig) => void;
}) {
	return (
		<div className="space-y-6">
			{/* Backup Frequency */}
			<div>
				<h3 className="font-semibold mb-3">How often should we backup?</h3>
				<div className="grid grid-cols-2 gap-3">
					{[
						{
							value: "realtime",
							label: "As photos change",
							desc: "Most protection",
						},
						{
							value: "hourly",
							label: "Every hour",
							desc: "Great for active use",
						},
						{ value: "daily", label: "Once a day", desc: "Good balance" },
						{ value: "weekly", label: "Once a week", desc: "Light usage" },
						{
							value: "manual",
							label: "I'll do it myself",
							desc: "Full control",
						},
					].map((option) => (
						<button
							type="button"
							key={option.value}
							onClick={() =>
								onChange({ ...config, frequency: option.value as any })
							}
							className={`p-3 rounded-lg border text-left ${
								config.frequency === option.value
									? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
									: "border-gray-300 dark:border-gray-600"
							}`}
						>
							<div className="font-medium">{option.label}</div>
							<div className="text-xs text-gray-500">{option.desc}</div>
						</button>
					))}
				</div>
			</div>

			{/* Backup Locations */}
			<div>
				<h3 className="font-semibold mb-3">Where to save backups</h3>
				<div className="space-y-2">
					<label className="flex items-center gap-3 p-3 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
						<input
							type="checkbox"
							checked={config.providers.includes("local")}
							onChange={(e) => {
								const providers = e.target.checked
									? [...config.providers, "local" as BackupProvider]
									: config.providers.filter((p) => p !== "local");
								onChange({ ...config, providers });
							}}
							className="w-4 h-4"
						/>
						<HardDrive className="w-5 h-5 text-gray-400" />
						<div className="flex-1">
							<div className="font-medium">External drive</div>
							<div className="text-xs text-gray-500">
								Keep a copy on your computer or external drive
							</div>
						</div>
					</label>
				</div>
				<p className="text-xs text-gray-500 mt-2">
					Cloud backup options coming soon
				</p>
			</div>

			{/* Advanced Options */}
			<div>
				<h3 className="font-semibold mb-3">Advanced options</h3>
				<div className="space-y-2">
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={config.compressionEnabled}
							onChange={(e) =>
								onChange({ ...config, compressionEnabled: e.target.checked })
							}
							className="w-4 h-4"
						/>
						<span className="text-sm">Compress backups to save space</span>
					</label>
					<label className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={config.encryptionEnabled}
							onChange={(e) =>
								onChange({ ...config, encryptionEnabled: e.target.checked })
							}
							className="w-4 h-4"
						/>
						<span className="text-sm">Encrypt backups for extra security</span>
					</label>
				</div>
			</div>
		</div>
	);
}

// Backup history component
function BackupHistory() {
	const history = backupService.getHistory();

	if (history.length === 0) {
		return (
			<div className="text-center py-8">
				<Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
				<p className="text-gray-500">No backup history yet</p>
				<p className="text-sm text-gray-400 mt-1">
					Your backup history will appear here
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{history.map((version) => (
				<div
					key={version.id}
					className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
				>
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium">
								{version.isIncremental ? "Quick backup" : "Full backup"}
							</div>
							<div className="text-sm text-gray-500">
								{version.fileCount.toLocaleString()} photos •{" "}
								{formatBytes(version.totalSize)}
							</div>
							<div className="text-xs text-gray-400 mt-1">
								{new Date(version.timestamp).toLocaleString()}
							</div>
						</div>
						<button
							type="button"
							onClick={() => backupService.restore(version.id)}
							className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
						>
							Restore
						</button>
					</div>
				</div>
			))}
		</div>
	);
}

// Helper function
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
}
