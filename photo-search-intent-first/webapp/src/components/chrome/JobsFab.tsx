import { Activity, Database, Zap } from "lucide-react";
import type React from "react";

export interface JobsFabProps {
	activeJobs?: number;
	isIndexing?: boolean;
	progressPct?: number;
	onOpenJobs: () => void;
}

export function JobsFab({
	activeJobs = 0,
	isIndexing = false,
	progressPct,
	onOpenJobs,
}: JobsFabProps) {
	const hasActiveJobs = activeJobs > 0 || isIndexing;

	return (
		<div className="fixed bottom-4 right-4 z-40">
			{hasActiveJobs && (
				<div className="absolute -top-2 -right-2 flex items-center">
					{isIndexing && typeof progressPct === "number" && (
						<div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700 mr-2">
							<div className="w-8 h-8 relative">
								<Database className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
								<svg
									className="w-8 h-8 transform -rotate-90"
									viewBox="0 0 36 36"
								>
									<path
										d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
										fill="none"
										stroke="#E5E7EB"
										strokeWidth="3"
									/>
									<path
										d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
										fill="none"
										stroke="#3B82F6"
										strokeWidth="3"
										strokeDasharray={`${progressPct ? progressPct * 100 : 40}, 100`}
									/>
								</svg>
								<span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
									{Math.round((progressPct || 0) * 100)}%
								</span>
							</div>
						</div>
					)}
					{activeJobs > 0 && (
						<div className="bg-red-500 text-white rounded-full px-2 py-1 text-xs font-semibold shadow-md animate-pulse">
							{activeJobs} active
						</div>
					)}
				</div>
			)}

			<button
				type="button"
				onClick={onOpenJobs}
				className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
					hasActiveJobs
						? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-500/25"
						: "bg-gray-600 text-white shadow-gray-500/25"
				}`}
				title={hasActiveJobs ? "View active jobs and progress" : "Open Jobs"}
				aria-label={
					hasActiveJobs
						? `View ${activeJobs} active jobs and indexing progress`
						: "Open the jobs panel"
				}
				aria-haspopup="dialog"
			>
				<Activity className="w-4 h-4" />
				<span className="font-medium">Jobs</span>
				{hasActiveJobs && <Zap className="w-4 h-4 animate-pulse" />}
			</button>
		</div>
	);
}
