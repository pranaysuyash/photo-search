import {
	Activity,
	AlertCircle,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Clock,
	Cpu,
	Database,
	Download,
	Image,
	Pause,
	Play,
	RotateCw,
	Search,
	Trash2,
	Upload,
	X,
	XCircle,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

export interface Job {
	id: string;
	type:
		| "index"
		| "search"
		| "edit"
		| "export"
		| "import"
		| "backup"
		| "analyze"
		| "restore";
	title: string;
	description?: string;
	status:
		| "queued"
		| "running"
		| "paused"
		| "completed"
		| "failed"
		| "cancelled";
	progress?: number;
	total?: number;
	startTime?: Date;
	endTime?: Date;
	error?: string;
	canPause?: boolean;
	canCancel?: boolean;
	canRetry?: boolean;
	estimatedTimeRemaining?: number; // seconds
	speed?: string; // human-readable speed
	currentItem?: string; // current file/photo being processed
	successCount?: number;
	warningCount?: number;
	errorCount?: number;
}

interface JobsCenterProps {
	jobs: Job[];
	onPause?: (jobId: string) => void;
	onResume?: (jobId: string) => void;
	onCancel?: (jobId: string) => void;
	onRetry?: (jobId: string) => void;
	onClear?: (jobId: string) => void;
	onClearAll?: () => void;
}

export function JobsCenter({
	jobs,
	onPause,
	onResume,
	onCancel,
	onRetry,
	onClear,
	onClearAll,
}: JobsCenterProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

	const activeJobs = jobs.filter(
		(j) => j.status === "running" || j.status === "paused",
	);
	const completedJobs = jobs.filter(
		(j) =>
			j.status === "completed" ||
			j.status === "failed" ||
			j.status === "cancelled",
	);

	const toggleExpanded = (jobId: string) => {
		const newExpanded = new Set(expandedJobs);
		if (newExpanded.has(jobId)) {
			newExpanded.delete(jobId);
		} else {
			newExpanded.add(jobId);
		}
		setExpandedJobs(newExpanded);
	};

	const getJobIcon = (type: Job["type"]) => {
		const icons = {
			index: <Database className="w-4 h-4" />,
			search: <Search className="w-4 h-4" />,
			edit: <Image className="w-4 h-4" />,
			export: <Download className="w-4 h-4" />,
			import: <Upload className="w-4 h-4" />,
			backup: <Database className="w-4 h-4" />,
			analyze: <Cpu className="w-4 h-4" />,
			restore: <RotateCw className="w-4 h-4" />,
		};
		return icons[type];
	};

	const getStatusColor = (status: Job["status"]) => {
		const colors = {
			queued: "text-gray-500",
			running: "text-blue-500",
			paused: "text-yellow-500",
			completed: "text-green-500",
			failed: "text-red-500",
			cancelled: "text-gray-400",
		};
		return colors[status];
	};

	const getStatusIcon = (status: Job["status"]) => {
		switch (status) {
			case "queued":
				return <Clock className="w-4 h-4" />;
			case "running":
				return (
					<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
				);
			case "paused":
				return <Pause className="w-4 h-4" />;
			case "completed":
				return <CheckCircle className="w-4 h-4" />;
			case "failed":
				return <XCircle className="w-4 h-4" />;
			case "cancelled":
				return <AlertCircle className="w-4 h-4" />;
		}
	};

	const formatDuration = (start?: Date, end?: Date) => {
		if (!start) return "";
		const endTime = end || new Date();
		const duration = endTime.getTime() - start.getTime();
		const seconds = Math.floor(duration / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) return `${hours}h ${minutes % 60}m`;
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
		return `${seconds}s`;
	};

	const formatTimeRemaining = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
		if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
		return `${seconds} second${seconds > 1 ? "s" : ""}`;
	};

	if (jobs.length === 0) return null;

	return (
		<>
			{/* Floating indicator */}
			<div className="fixed bottom-4 right-4 z-40">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="bg-white dark:bg-gray-800 rounded-full shadow-lg p-3 flex items-center gap-2 hover:shadow-xl transition-shadow"
				>
					<Activity className="w-5 h-5 text-blue-500" />
					{activeJobs.length > 0 && (
						<span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
							{activeJobs.length}
						</span>
					)}
				</button>
			</div>

			{/* Jobs panel */}
			{isOpen && (
				<div className="fixed bottom-20 right-4 w-96 max-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-40 flex flex-col">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
						<h3 className="font-semibold">What's happening</h3>
						<div className="flex items-center gap-2">
							{completedJobs.length > 0 && (
								<button
									type="button"
									onClick={onClearAll}
									className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
								>
									Clear All
								</button>
							)}
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Jobs list */}
					<div className="flex-1 overflow-y-auto">
						{/* Active jobs */}
						{activeJobs.length > 0 && (
							<div className="p-3">
								<h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
									Working on
								</h4>
								<div className="space-y-2">
									{activeJobs.map((job) => (
										<JobItem
											key={job.id}
											job={job}
											isExpanded={expandedJobs.has(job.id)}
											onToggleExpanded={() => toggleExpanded(job.id)}
											onPause={onPause}
											onResume={onResume}
											onCancel={onCancel}
											getJobIcon={getJobIcon}
											getStatusIcon={getStatusIcon}
											getStatusColor={getStatusColor}
											formatDuration={formatDuration}
											formatTimeRemaining={formatTimeRemaining}
										/>
									))}
								</div>
							</div>
						)}

						{/* Completed jobs */}
						{completedJobs.length > 0 && (
							<div className="p-3 border-t dark:border-gray-700">
								<h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
									Recently finished
								</h4>
								<div className="space-y-2">
									{completedJobs.map((job) => (
										<JobItem
											key={job.id}
											job={job}
											isExpanded={expandedJobs.has(job.id)}
											onToggleExpanded={() => toggleExpanded(job.id)}
											onRetry={onRetry}
											onClear={onClear}
											getJobIcon={getJobIcon}
											getStatusIcon={getStatusIcon}
											getStatusColor={getStatusColor}
											formatDuration={formatDuration}
											formatTimeRemaining={formatTimeRemaining}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}

interface JobItemProps {
	job: Job;
	isExpanded: boolean;
	onToggleExpanded: () => void;
	onPause?: (jobId: string) => void;
	onResume?: (jobId: string) => void;
	onCancel?: (jobId: string) => void;
	onRetry?: (jobId: string) => void;
	onClear?: (jobId: string) => void;
	getJobIcon: (type: Job["type"]) => React.ReactNode;
	getStatusIcon: (status: Job["status"]) => React.ReactNode;
	getStatusColor: (status: Job["status"]) => string;
	formatDuration: (start?: Date, end?: Date) => string;
	formatTimeRemaining: (seconds: number) => string;
}

function JobItem({
	job,
	isExpanded,
	onToggleExpanded,
	onPause,
	onResume,
	onCancel,
	onRetry,
	onClear,
	getJobIcon,
	getStatusIcon,
	getStatusColor,
	formatDuration,
	formatTimeRemaining,
}: JobItemProps) {
	const progressPercentage = job.total
		? ((job.progress || 0) / job.total) * 100
		: 0;

	return (
		<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-2 flex-1">
					<div className="mt-0.5">{getJobIcon(job.type)}</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium truncate">{job.title}</span>
							<div
								className={`flex items-center gap-1 ${getStatusColor(job.status)}`}
							>
								{getStatusIcon(job.status)}
								<span className="text-xs capitalize">{job.status}</span>
							</div>
						</div>

						{/* Enhanced Progress Display */}
						{job.status === "running" && job.total && (
							<div className="mt-2">
								<div className="flex items-center justify-between text-xs text-gray-500 mb-1">
									<span>
										{job.progress || 0} of {job.total}
										{job.type === "backup"
											? " photos saved"
											: job.type === "index"
												? " photos found"
												: job.type === "export"
													? " photos exported"
													: " items"}
									</span>
									<span>{progressPercentage.toFixed(0)}%</span>
								</div>
								<div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
									<div
										className="bg-blue-500 h-1.5 rounded-full transition-all"
										style={{ width: `${progressPercentage}%` }}
									/>
								</div>
								{/* ETA and Speed */}
								{(job.estimatedTimeRemaining || job.speed) && (
									<div className="flex items-center justify-between text-xs text-gray-400 mt-1">
										{job.estimatedTimeRemaining && (
											<span>
												About {formatTimeRemaining(job.estimatedTimeRemaining)}{" "}
												left
											</span>
										)}
										{job.speed && <span>{job.speed}</span>}
									</div>
								)}
								{/* Current item */}
								{job.currentItem && (
									<div className="text-xs text-gray-400 mt-1 truncate">
										{job.type === "backup"
											? "Saving: "
											: job.type === "index"
												? "Looking at: "
												: "Processing: "}
										{job.currentItem}
									</div>
								)}
							</div>
						)}

						{/* Duration and Status Summary */}
						{job.startTime && (
							<div className="text-xs text-gray-500 mt-1">
								{job.status === "completed"
									? "Finished in "
									: job.status === "failed"
										? "Failed after "
										: job.status === "running"
											? "Running for "
											: ""}
								{formatDuration(job.startTime, job.endTime)}
								{/* Success/Error counts for completed jobs */}
								{job.status === "completed" && (
									<span className="ml-2">
										{job.successCount && (
											<span className="text-green-500">
												✓ {job.successCount}
											</span>
										)}
										{job.warningCount && (
											<span className="text-yellow-500 ml-1">
												⚠ {job.warningCount}
											</span>
										)}
										{job.errorCount && (
											<span className="text-red-500 ml-1">
												✗ {job.errorCount}
											</span>
										)}
									</span>
								)}
							</div>
						)}

						{/* Error or description */}
						{isExpanded && (job.error || job.description) && (
							<div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
								{job.error ? (
									<div className="text-red-500">{job.error}</div>
								) : (
									<div>{job.description}</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-1 ml-2">
					{job.status === "running" && job.canPause && (
						<button
							type="button"
							onClick={() => onPause?.(job.id)}
							className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
						>
							<Pause className="w-3 h-3" />
						</button>
					)}

					{job.status === "paused" && (
						<button
							type="button"
							onClick={() => onResume?.(job.id)}
							className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
						>
							<Play className="w-3 h-3" />
						</button>
					)}

					{(job.status === "running" || job.status === "paused") &&
						job.canCancel && (
							<button
								type="button"
								onClick={() => onCancel?.(job.id)}
								className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-red-500"
							>
								<X className="w-3 h-3" />
							</button>
						)}

					{job.status === "failed" && job.canRetry && (
						<button
							type="button"
							onClick={() => onRetry?.(job.id)}
							className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
						>
							<RotateCw className="w-3 h-3" />
						</button>
					)}

					{(job.status === "completed" ||
						job.status === "failed" ||
						job.status === "cancelled") && (
						<button
							type="button"
							onClick={() => onClear?.(job.id)}
							className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
						>
							<Trash2 className="w-3 h-3" />
						</button>
					)}

					{(job.error || job.description) && (
						<button
							type="button"
							onClick={onToggleExpanded}
							className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
						>
							{isExpanded ? (
								<ChevronUp className="w-3 h-3" />
							) : (
								<ChevronDown className="w-3 h-3" />
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
