import {
	Activity,
	AlertCircle,
	CheckCircle,
	Clock,
	Database,
	FileText,
	Image,
	Pause,
	Play,
	RefreshCw,
	Search,
	Tag,
	TrendingUp,
	X,
	XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { apiAnalytics } from "../api";
import { useJobsContext } from "../contexts/JobsContext";
import { useDir } from "../stores/settingsStore";
import {
	formatTimestamp,
	humanizeDuration,
	humanizeFileSize,
} from "../utils/formatting";

interface JobProgress {
	type: string;
	title: string;
	status: "running" | "paused" | "completed" | "failed" | "queued";
	progress: number;
	total: number;
	currentItem?: string;
	etaSeconds?: number;
	ratePerSecond?: number;
	startTime: number;
	errors: number;
	warnings: number;
	description?: string;
	category: "indexing" | "analysis" | "processing" | "maintenance";
}

interface JobsSummary {
	indexing: JobProgress[];
	analysis: JobProgress[];
	processing: JobProgress[];
	maintenance: JobProgress[];
	totalActive: number;
	totalCompleted: number;
	overallProgress: number;
}

export default function EnhancedJobsDrawer({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const dir = useDir();
	const { state: jobsState } = useJobsContext();
	const [jobsSummary, setJobsSummary] = useState<JobsSummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		if (!open || !dir) return;

		const loadJobsData = async () => {
			setLoading(true);
			try {
				// Get analytics data from API
				const analytics = await apiAnalytics(dir, 500);

				// Get jobs from context
				const contextJobs = jobsState.jobs;

				// Transform analytics events into job progress data
				const jobProgressData: JobProgress[] = [];

				// Process analytics events to create job entries
				const recentEvents = analytics.events || [];
				const jobTypes = [
					{
						type: "metadata_build",
						title: "Indexing Metadata",
						category: "indexing" as const,
					},
					{
						type: "thumbs_build",
						title: "Generating Thumbnails",
						category: "indexing" as const,
					},
					{
						type: "ocr_build",
						title: "OCR Processing",
						category: "analysis" as const,
					},
					{
						type: "captions_build",
						title: "Caption Generation",
						category: "analysis" as const,
					},
					{
						type: "fast_build",
						title: "Search Index Building",
						category: "indexing" as const,
					},
					{
						type: "trips_build",
						title: "Trip Detection",
						category: "analysis" as const,
					},
					{
						type: "export",
						title: "Export Operation",
						category: "processing" as const,
					},
					{
						type: "backup_run",
						title: "Backup Process",
						category: "maintenance" as const,
					},
				];

				jobTypes.forEach((jobType) => {
					const events = recentEvents.filter((e) => e.type === jobType.type);
					if (events.length > 0) {
						const latestEvent = events[events.length - 1];
						const ev = latestEvent as Record<string, unknown>;

						const total = typeof ev.total === "number" ? ev.total : 0;
						const done =
							typeof ev.done === "number"
								? ev.done
								: typeof ev.updated === "number"
									? ev.updated
									: typeof ev.made === "number"
										? ev.made
										: typeof ev.copied === "number"
											? ev.copied
											: 0;

						const progress = total > 0 ? Math.min(done / total, 1) : 0;

						// Check if there's an active job in the context matching this type
						const contextJob = contextJobs.find((j) => j.type === jobType.type);
						const status = contextJob
							? contextJob.status === "running"
								? ("running" as const)
								: contextJob.status === "paused"
									? ("paused" as const)
									: progress >= 1
										? ("completed" as const)
										: ("running" as const)
							: progress >= 1
								? ("completed" as const)
								: ("queued" as const);

						jobProgressData.push({
							type: jobType.type,
							title: jobType.title,
							status,
							progress,
							total,
							startTime: new Date(latestEvent.time).getTime(),
							errors: typeof ev.errors === "number" ? ev.errors : 0,
							warnings: typeof ev.warnings === "number" ? ev.warnings : 0,
							description:
								typeof ev.description === "string" ? ev.description : undefined,
							category: jobType.category,
							...(status === "running" && {
								currentItem:
									typeof ev.current_file === "string"
										? ev.current_file
										: undefined,
								etaSeconds:
									typeof ev.eta_seconds === "number"
										? ev.eta_seconds
										: undefined,
								ratePerSecond:
									typeof ev.rate_per_second === "number"
										? ev.rate_per_second
										: undefined,
							}),
						});
					}
				});

				// Add context jobs that aren't in analytics
				contextJobs.forEach((contextJob) => {
					if (!jobProgressData.find((jp) => jp.type === contextJob.type)) {
						jobProgressData.push({
							type: contextJob.type,
							title: contextJob.title || contextJob.type,
							status: contextJob.status as unknown,
							progress: (contextJob.progress || 0) / (contextJob.total || 1),
							total: contextJob.total || 0,
							startTime: contextJob.startTime?.getTime() || Date.now(),
							errors: contextJob.errorCount || 0,
							warnings: contextJob.warningCount || 0,
							description: contextJob.description,
							category: contextJob.type.includes("index")
								? "indexing"
								: contextJob.type.includes("analyz")
									? "analysis"
									: contextJob.type.includes("backup") ||
											contextJob.type.includes("maintenance")
										? "maintenance"
										: "processing",
						});
					}
				});

				// Categorize jobs
				const summary: JobsSummary = {
					indexing: jobProgressData.filter((j) => j.category === "indexing"),
					analysis: jobProgressData.filter((j) => j.category === "analysis"),
					processing: jobProgressData.filter(
						(j) => j.category === "processing",
					),
					maintenance: jobProgressData.filter(
						(j) => j.category === "maintenance",
					),
					totalActive: jobProgressData.filter(
						(j) => j.status === "running" || j.status === "paused",
					).length,
					totalCompleted: jobProgressData.filter(
						(j) => j.status === "completed",
					).length,
					overallProgress:
						jobProgressData.length > 0
							? jobProgressData.reduce((sum, j) => sum + j.progress, 0) /
								jobProgressData.length
							: 0,
				};

				setJobsSummary(summary);
			} catch (error) {
				console.error("Failed to load jobs data:", error);
			} finally {
				setLoading(false);
			}
		};

		loadJobsData();

		// Set up periodic refresh for active jobs
		const interval = setInterval(() => {
			if (jobsSummary?.totalActive && jobsSummary.totalActive > 0) {
				setRefreshKey((prev) => prev + 1);
				loadJobsData();
			}
		}, 2000);

		return () => clearInterval(interval);
	}, [open, dir, refreshKey, jobsSummary?.totalActive, jobsState.jobs]);

	if (!open) return null;

	const getCategoryIcon = (category: string) => {
		switch (category) {
			case "indexing":
				return <Database className="w-4 h-4" />;
			case "analysis":
				return <Search className="w-4 h-4" />;
			case "processing":
				return <Image className="w-4 h-4" />;
			case "maintenance":
				return <RefreshCw className="w-4 h-4" />;
			default:
				return <Activity className="w-4 h-4" />;
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "running":
				return (
					<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
				);
			case "paused":
				return <Pause className="w-4 h-4 text-yellow-500" />;
			case "completed":
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			case "failed":
				return <XCircle className="w-4 h-4 text-red-500" />;
			default:
				return <Clock className="w-4 h-4 text-gray-400" />;
		}
	};

	const renderJobProgress = (job: JobProgress) => (
		<div
			key={job.type}
			className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2"
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					{getCategoryIcon(job.category)}
					<div>
						<h4 className="font-medium text-sm">{job.title}</h4>
						{job.description && (
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{job.description}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					{getStatusIcon(job.status)}
					<span className="text-xs text-gray-500 dark:text-gray-400">
						{Math.round(job.progress * 100)}%
					</span>
				</div>
			</div>

			{job.total > 0 && (
				<div className="mb-2">
					<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
						<div
							className="bg-blue-500 h-2 rounded-full transition-all duration-300"
							style={{ width: `${job.progress * 100}%` }}
						/>
					</div>
					<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
						<span>
							{Math.round(job.progress * job.total)} / {job.total}
						</span>
						{job.etaSeconds && (
							<span>ETA: {humanizeDuration(job.etaSeconds * 1000)}</span>
						)}
					</div>
				</div>
			)}

			{job.currentItem && (
				<div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
					Processing:{" "}
					<span className="font-mono">{job.currentItem.split("/").pop()}</span>
				</div>
			)}

			{job.ratePerSecond && job.ratePerSecond > 0 && (
				<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
					<TrendingUp className="inline w-3 h-3 mr-1" />
					{Math.round(job.ratePerSecond)} items/sec
				</div>
			)}

			{(job.errors > 0 || job.warnings > 0) && (
				<div className="flex gap-3 text-xs">
					{job.errors > 0 && (
						<span className="text-red-600 dark:text-red-400">
							<AlertCircle className="inline w-3 h-3 mr-1" />
							{job.errors} errors
						</span>
					)}
					{job.warnings > 0 && (
						<span className="text-yellow-600 dark:text-yellow-400">
							<AlertCircle className="inline w-3 h-3 mr-1" />
							{job.warnings} warnings
						</span>
					)}
				</div>
			)}
		</div>
	);

	const renderJobCategory = (title: string, jobs: JobProgress[]) => (
		<div key={title}>
			<h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
				{getCategoryIcon(jobs[0]?.category || "")}
				{title}
				{jobs.length > 0 && (
					<span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
						{jobs.length}
					</span>
				)}
			</h3>
			{jobs.length > 0 ? (
				jobs.map(renderJobProgress)
			) : (
				<div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
					No {title.toLowerCase()} jobs
				</div>
			)}
		</div>
	);

	return (
		<div className="fixed inset-0 z-50">
			<button
				type="button"
				className="absolute inset-0 bg-black/30 backdrop-blur-md supports-[backdrop-filter]:bg-black/25 supports-[backdrop-filter]:backdrop-blur-xl transition-all duration-300 ease-out"
				aria-label="Close jobs"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClose();
					}
				}}
				style={{ all: "unset" }}
			/>
			<div className="absolute right-0 top-0 bottom-0 w-full sm:w-[500px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-hidden">
				<div className="h-full flex flex-col">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
						<div>
							<h2 className="text-lg font-semibold flex items-center gap-2">
								<Activity className="w-5 h-5" />
								Library Operations
							</h2>
							{jobsSummary && (
								<div className="text-sm text-gray-600 dark:text-gray-400">
									{jobsSummary.totalActive} active •{" "}
									{jobsSummary.totalCompleted} completed
								</div>
							)}
						</div>
						<button
							type="button"
							className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
							onClick={onClose}
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Overall Progress */}
					{jobsSummary &&
						(jobsSummary.totalActive > 0 || jobsSummary.totalCompleted > 0) && (
							<div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-800">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">Overall Progress</span>
									<span className="text-sm text-gray-600 dark:text-gray-400">
										{Math.round(jobsSummary.overallProgress * 100)}%
									</span>
								</div>
								<div className="w-full bg-white/50 dark:bg-gray-800/50 rounded-full h-3">
									<div
										className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
										style={{ width: `${jobsSummary.overallProgress * 100}%` }}
									/>
								</div>
							</div>
						)}

					{/* Jobs List */}
					<div className="flex-1 overflow-y-auto p-4">
						{loading && (
							<div className="flex items-center justify-center py-8">
								<RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-2" />
								<span className="text-gray-600 dark:text-gray-400">
									Loading jobs...
								</span>
							</div>
						)}

						{!loading && jobsSummary && (
							<div className="space-y-4">
								{renderJobCategory("Indexing Operations", jobsSummary.indexing)}
								{renderJobCategory("Analysis & AI", jobsSummary.analysis)}
								{renderJobCategory("File Processing", jobsSummary.processing)}
								{renderJobCategory("Maintenance", jobsSummary.maintenance)}
							</div>
						)}

						{!loading &&
							jobsSummary &&
							jobsSummary.totalActive === 0 &&
							jobsSummary.totalCompleted === 0 && (
								<div className="text-center py-8">
									<Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
									<p className="text-gray-600 dark:text-gray-400 mb-2">
										No library operations
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-500">
										Jobs will appear here when indexing, analyzing, or
										processing your photo library.
									</p>
								</div>
							)}
					</div>

					{/* Footer */}
					{jobsSummary && jobsSummary.totalActive > 0 && (
						<div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
							<div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
								<span>Library operations are running in the background</span>
								<span>{formatTimestamp(Date.now())}</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
