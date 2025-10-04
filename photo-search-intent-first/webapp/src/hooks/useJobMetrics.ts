import { useMemo } from "react";
import type { Job } from "../components/JobsCenter";

export interface JobMetrics {
	activeJobsCount: number;
	runningJobsCount: number;
	indexingActive: boolean;
	indexingProgress?: number;
}

/**
 * Hook that extracts and memoizes job-related metrics used across multiple components.
 * Provides consistent job statistics for TopBar, StatusBar, and JobsFab components.
 */
export function useJobMetrics(jobs: Job[]): JobMetrics {
	return useMemo(() => {
		const activeJobs = jobs.filter(
			(job) => job.status === "running" || job.status === "paused",
		);
		const runningJobs = jobs.filter((job) => job.status === "running");
		const indexingJobs = jobs.filter((job) => job.type === "index");
		const indexingActive = indexingJobs.some(
			(job) => job.status === "running" || job.status === "paused",
		);
		const avgProgress = indexingJobs.length
			? indexingJobs.reduce((sum, job) => sum + (job.progress || 0), 0) /
				indexingJobs.length
			: undefined;

		return {
			activeJobsCount: activeJobs.length,
			runningJobsCount: runningJobs.length,
			indexingActive,
			indexingProgress: avgProgress,
		};
	}, [jobs]);
}