/**
 * JobsContext - Simplified jobs context that integrates with the new JobQueueSystem
 * This context provides a familiar interface while leveraging the enhanced job queue system.
 */
import type React from "react";
import { createContext, useContext, useMemo } from "react";
import type { Job } from "../components/JobsCenter";
import {
	createJob,
	type ExtendedJob,
	type JobPriority,
	JobQueueProvider,
	type JobStatus,
	useJobQueue,
	useJobScheduler,
	useJobStatistics,
	useJobs,
} from "../framework/JobQueueSystem";

// Backward compatible JobsState
type JobsState = {
	jobs: Job[];
};

// Backward compatible JobsActions
type JobsActions = {
	add: (job: Job) => void;
	setStatus: (id: string, status: Job["status"]) => void;
	update: (id: string, patch: Partial<Job>) => void;
	remove: (id: string) => void;
	clearStopped: () => void; // keep running/queued only
};

// Create the context with backward compatibility
const JobsContext = createContext<{
	state: JobsState;
	actions: JobsActions;
} | null>(null);

// JobsProvider component props
interface JobsProviderProps {
	children: React.ReactNode;
	pollInterval?: number;
}

// Enhanced JobsProvider that uses JobQueueProvider internally
export const JobsProvider: React.FC<JobsProviderProps> = ({
	children,
	pollInterval = 2000,
}) => {
	return (
		<JobQueueProvider pollInterval={pollInterval}>
			<JobsContextWrapper>{children}</JobsContextWrapper>
		</JobQueueProvider>
	);
};

// Wrapper component that maps the new system to the old interface
const JobsContextWrapper: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { state: queueState, dispatch } = useJobQueue();
	const scheduler = useJobScheduler();
	const jobs = useJobs();

	// Convert ExtendedJob to backward compatible Job
	const convertToLegacyJob = (extendedJob: ExtendedJob): Job => {
		return {
			id: extendedJob.id,
			type: extendedJob.type,
			title: extendedJob.title,
			description: extendedJob.description,
			status: extendedJob.status as Job["status"],
			total: extendedJob.total,
			progress: extendedJob.progress,
			startTime: extendedJob.startTime,
			endTime:
				extendedJob.endTime ||
				extendedJob.completedAt ||
				extendedJob.failedAt ||
				extendedJob.cancelledAt,
			currentItem: extendedJob.currentStep,
			speed: extendedJob.executionContext?.resourcesUsed
				? `${Object.values(extendedJob.executionContext.resourcesUsed).reduce((sum, val) => sum + val, 0)} items/sec`
				: undefined,
			estimatedTimeRemaining: extendedJob.estimatedTimeRemaining,
			successCount: extendedJob.metadata?.successCount as number,
			warningCount: extendedJob.metadata?.warningCount as number,
			errorCount: extendedJob.metadata?.errorCount as number,
			error: extendedJob.lastError?.message,
			canCancel: extendedJob.cancellable,
			canPause: extendedJob.pausable,
		};
	};

	// Map jobs to legacy format
	const legacyJobs = useMemo(() => {
		return jobs.map(convertToLegacyJob);
	}, [jobs]);

	// Create backward compatible actions
	const actions = useMemo<JobsActions>(
		() => ({
			add: (job: Job) => {
				// Convert legacy job to extended job
				const extendedJob = createJob(job.type, job.title, {
					description: job.description,
					total: job.total,
					priority: "normal",
					cancellable: job.canCancel,
					pausable: job.canPause,
				});

				scheduler.enqueue(extendedJob);
			},

			setStatus: (id: string, status: Job["status"]) => {
				const job = jobs.find((j) => j.id === id);
				if (!job) return;

				switch (status) {
					case "running":
						scheduler.resume(id);
						break;
					case "paused":
						scheduler.pause(id);
						break;
					case "cancelled":
						scheduler.cancel(id);
						break;
					case "completed":
					case "failed":
						// These are typically set by the system based on events
						break;
					default:
						// For other statuses, we might need to update directly
						dispatch({
							type: "SET_STATUS",
							id,
							status: status as unknown as JobStatus,
						});
				}
			},

			update: (id: string, patch: Partial<Job>) => {
				dispatch({
					type: "UPDATE_JOB",
					id,
					updates: patch,
				});
			},

			remove: (id: string) => {
				dispatch({
					type: "REMOVE_JOB",
					id,
				});
			},

			clearStopped: () => {
				// Clear completed, failed, and cancelled jobs
				scheduler.clearCompleted();
				scheduler.clearFailed();
				scheduler.clearCancelled();
			},
		}),
		[jobs, scheduler, dispatch],
	);

	// Create backward compatible state
	const state = useMemo<JobsState>(
		() => ({
			jobs: legacyJobs,
		}),
		[legacyJobs],
	);

	const value = useMemo(
		() => ({
			state,
			actions,
		}),
		[state, actions],
	);

	return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
};

// Hook to consume the context (backward compatible)
export function useJobsContext() {
	const context = useContext(JobsContext);
	if (!context) {
		throw new Error("useJobsContext must be used within JobsProvider");
	}
	return context;
}

// Export the JobQueueProvider for direct use when needed
export { JobQueueProvider };

// Export hooks from the new system for advanced use cases
export { useJobQueue, useJobScheduler, useJobs, useJobStatistics, createJob };

export default JobsContext;
