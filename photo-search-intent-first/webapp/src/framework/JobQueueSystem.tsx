/**
 * JobQueueSystem - Provides a robust job queue system with proper lifecycle management
 * This system manages background jobs with advanced features like priorities, dependencies,
 * persistence, and offline support.
 */
import type React from "react";
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { apiAnalytics } from "../api";
import type { Job } from "../components/JobsCenter";
import { useDir } from "../stores/settingsStore";

// Job priority levels
export type JobPriority = "low" | "normal" | "high" | "critical";

// Job lifecycle statuses
export type JobStatus =
	| "queued" // Job is waiting to be processed
	| "running" // Job is currently being processed
	| "paused" // Job is temporarily suspended
	| "completed" // Job finished successfully
	| "failed" // Job encountered an error
	| "cancelled" // Job was cancelled by user
	| "retrying"; // Job is being retried after failure

// Retry policy for failed jobs
export interface RetryPolicy {
	maxAttempts: number;
	backoffStrategy: "fixed" | "exponential" | "fibonacci";
	initialDelayMs: number;
	maxDelayMs: number;
	jitter: boolean;
}

// Job dependencies
export interface JobDependencies {
	waitForJobs: string[]; // IDs of jobs that must complete first
	waitForResources: string[]; // Resources that must be available
}

// Job execution context
export interface JobExecutionContext {
	jobId: string;
	jobType: string;
	priority: JobPriority;
	startTime?: Date;
	endTime?: Date;
	progress?: number;
	total?: number;
	currentStep?: string;
	estimatedTimeRemaining?: number;
	resourcesUsed?: Record<string, number>;
	metadata: Record<string, unknown>;
}

// Extended job interface
export interface ExtendedJob extends Job {
	// Enhanced properties
	id: string;
	priority: JobPriority;
	status: JobStatus;
	dependencies?: JobDependencies;
	retryPolicy?: RetryPolicy;
	executionContext?: JobExecutionContext;
	createdAt: Date;
	updatedAt: Date;
	startedAt?: Date;
	completedAt?: Date;
	failedAt?: Date;
	cancelledAt?: Date;
	pausedAt?: Date;
	retryCount: number;
	lastError?: {
		message: string;
		code?: string;
		timestamp: Date;
		stack?: string;
	};
	tags?: string[];
	groupId?: string; // For grouping related jobs
	cancellable: boolean;
	pausable: boolean;
	progressTracking: boolean;
}

// Job queue state
export interface JobQueueState {
	jobs: Map<string, ExtendedJob>;
	groups: Map<string, Set<string>>; // Group ID -> Set of Job IDs
	dependencies: Map<string, Set<string>>; // Job ID -> Set of dependent Job IDs
	resourceLocks: Map<string, string>; // Resource name -> Job ID that holds lock
	statistics: {
		totalJobs: number;
		queued: number;
		running: number;
		paused: number;
		completed: number;
		failed: number;
		cancelled: number;
		retrying: number;
	};
	lastPollTime: number;
	isPolling: boolean;
}

// Job queue actions
export type JobQueueAction =
	| { type: "ADD_JOB"; job: ExtendedJob }
	| { type: "UPDATE_JOB"; id: string; updates: Partial<ExtendedJob> }
	| { type: "REMOVE_JOB"; id: string }
	| { type: "SET_STATUS"; id: string; status: JobStatus; error?: string }
	| {
			type: "SET_PROGRESS";
			id: string;
			progress: number;
			total?: number;
			currentStep?: string;
	  }
	| { type: "ADD_GROUP"; groupId: string; jobIds: string[] }
	| { type: "REMOVE_GROUP"; groupId: string }
	| { type: "ACQUIRE_RESOURCE"; resourceId: string; jobId: string }
	| { type: "RELEASE_RESOURCE"; resourceId: string; jobId: string }
	| { type: "CLEAR_COMPLETED"; before?: Date }
	| { type: "CLEAR_FAILED"; before?: Date }
	| { type: "CLEAR_CANCELLED"; before?: Date }
	| { type: "RESET_QUEUE" }
	| { type: "UPDATE_STATISTICS"; stats: Partial<JobQueueState["statistics"]> }
	| { type: "SET_POLLING"; isPolling: boolean; timestamp: number };

// Job scheduler interface
export interface JobScheduler {
	enqueue: (job: ExtendedJob) => Promise<string>;
	dequeue: () => Promise<ExtendedJob | undefined>;
	pause: (jobId: string) => Promise<void>;
	resume: (jobId: string) => Promise<void>;
	cancel: (jobId: string) => Promise<void>;
	retry: (jobId: string) => Promise<void>;
	getJob: (jobId: string) => ExtendedJob | undefined;
	getJobs: (filters?: JobFilters) => ExtendedJob[];
	getStatistics: () => JobQueueState["statistics"];
	clearCompleted: (before?: Date) => void;
	clearFailed: (before?: Date) => void;
	clearCancelled: (before?: Date) => void;
	reset: () => void;
}

// Job filters
export interface JobFilters {
	status?: JobStatus | JobStatus[];
	priority?: JobPriority | JobPriority[];
	type?: string | string[];
	tags?: string | string[];
	groupId?: string;
	before?: Date;
	after?: Date;
}

// Job queue reducer
function jobQueueReducer(
	state: JobQueueState,
	action: JobQueueAction,
): JobQueueState {
	switch (action.type) {
		case "ADD_JOB": {
			const newJobs = new Map(state.jobs);
			newJobs.set(action.job.id, action.job);

			return {
				...state,
				jobs: newJobs,
				statistics: {
					...state.statistics,
					totalJobs: state.statistics.totalJobs + 1,
					queued:
						state.statistics.queued + (action.job.status === "queued" ? 1 : 0),
					running:
						state.statistics.running +
						(action.job.status === "running" ? 1 : 0),
					paused:
						state.statistics.paused + (action.job.status === "paused" ? 1 : 0),
					completed:
						state.statistics.completed +
						(action.job.status === "completed" ? 1 : 0),
					failed:
						state.statistics.failed + (action.job.status === "failed" ? 1 : 0),
					cancelled:
						state.statistics.cancelled +
						(action.job.status === "cancelled" ? 1 : 0),
					retrying:
						state.statistics.retrying +
						(action.job.status === "retrying" ? 1 : 0),
				},
			};
		}

		case "UPDATE_JOB": {
			const newJobs = new Map(state.jobs);
			const existingJob = newJobs.get(action.id);
			if (existingJob) {
				newJobs.set(action.id, {
					...existingJob,
					...action.updates,
					updatedAt: new Date(),
				});
			}

			return {
				...state,
				jobs: newJobs,
			};
		}

		case "REMOVE_JOB": {
			const newJobs = new Map(state.jobs);
			const job = newJobs.get(action.id);
			if (job) {
				newJobs.delete(action.id);

				// Update statistics
				const statsDiff = {
					totalJobs: -1,
					queued: job.status === "queued" ? -1 : 0,
					running: job.status === "running" ? -1 : 0,
					paused: job.status === "paused" ? -1 : 0,
					completed: job.status === "completed" ? -1 : 0,
					failed: job.status === "failed" ? -1 : 0,
					cancelled: job.status === "cancelled" ? -1 : 0,
					retrying: job.status === "retrying" ? -1 : 0,
				};

				return {
					...state,
					jobs: newJobs,
					statistics: Object.entries(state.statistics).reduce(
						(acc, [key, value]) => ({
							...acc,
							[key]: Math.max(
								0,
								value + (statsDiff[key as keyof typeof statsDiff] || 0),
							),
						}),
						{} as JobQueueState["statistics"],
					),
				};
			}

			return state;
		}

		case "SET_STATUS": {
			const newJobs = new Map(state.jobs);
			const job = newJobs.get(action.id);
			if (job) {
				const oldStatus = job.status;
				const newStatus = action.status;

				// Update timestamps based on status
				const timestampUpdates: Partial<ExtendedJob> = {};
				if (newStatus === "running" && !job.startedAt) {
					timestampUpdates.startedAt = new Date();
				} else if (newStatus === "completed") {
					timestampUpdates.completedAt = new Date();
				} else if (newStatus === "failed") {
					timestampUpdates.failedAt = new Date();
					if (action.error) {
						timestampUpdates.lastError = {
							message: action.error,
							timestamp: new Date(),
						};
					}
				} else if (newStatus === "cancelled") {
					timestampUpdates.cancelledAt = new Date();
				} else if (newStatus === "paused") {
					timestampUpdates.pausedAt = new Date();
				}

				newJobs.set(action.id, {
					...job,
					status: newStatus,
					...timestampUpdates,
					updatedAt: new Date(),
				});

				// Update statistics
				const statsDiff = {
					[oldStatus]: -1,
					[newStatus]: 1,
				} as Record<JobStatus, number>;

				return {
					...state,
					jobs: newJobs,
					statistics: Object.entries(state.statistics).reduce(
						(acc, [key, value]) => ({
							...acc,
							[key]: Math.max(0, value + (statsDiff[key as JobStatus] || 0)),
						}),
						{} as JobQueueState["statistics"],
					),
				};
			}

			return state;
		}

		case "SET_PROGRESS": {
			const newJobs = new Map(state.jobs);
			const job = newJobs.get(action.id);
			if (job) {
				newJobs.set(action.id, {
					...job,
					progress: action.progress,
					total: action.total ?? job.total,
					currentStep: action.currentStep,
					updatedAt: new Date(),
				});
			}

			return {
				...state,
				jobs: newJobs,
			};
		}

		case "ADD_GROUP": {
			const newGroups = new Map(state.groups);
			const jobSet = newGroups.get(action.groupId) || new Set();
			action.jobIds.forEach((id) => jobSet.add(id));
			newGroups.set(action.groupId, jobSet);

			return {
				...state,
				groups: newGroups,
			};
		}

		case "REMOVE_GROUP": {
			const newGroups = new Map(state.groups);
			newGroups.delete(action.groupId);

			return {
				...state,
				groups: newGroups,
			};
		}

		case "ACQUIRE_RESOURCE": {
			const newResourceLocks = new Map(state.resourceLocks);
			newResourceLocks.set(action.resourceId, action.jobId);

			return {
				...state,
				resourceLocks: newResourceLocks,
			};
		}

		case "RELEASE_RESOURCE": {
			const newResourceLocks = new Map(state.resourceLocks);
			if (newResourceLocks.get(action.resourceId) === action.jobId) {
				newResourceLocks.delete(action.resourceId);
			}

			return {
				...state,
				resourceLocks: newResourceLocks,
			};
		}

		case "UPDATE_STATISTICS": {
			return {
				...state,
				statistics: {
					...state.statistics,
					...action.stats,
				},
			};
		}

		case "SET_POLLING": {
			return {
				...state,
				isPolling: action.isPolling,
				lastPollTime: action.timestamp,
			};
		}

		case "RESET_QUEUE": {
			return {
				jobs: new Map(),
				groups: new Map(),
				dependencies: new Map(),
				resourceLocks: new Map(),
				statistics: {
					totalJobs: 0,
					queued: 0,
					running: 0,
					paused: 0,
					completed: 0,
					failed: 0,
					cancelled: 0,
					retrying: 0,
				},
				lastPollTime: 0,
				isPolling: false,
			};
		}

		default:
			return state;
	}
}

// Initial job queue state
const initialJobQueueState: JobQueueState = {
	jobs: new Map(),
	groups: new Map(),
	dependencies: new Map(),
	resourceLocks: new Map(),
	statistics: {
		totalJobs: 0,
		queued: 0,
		running: 0,
		paused: 0,
		completed: 0,
		failed: 0,
		cancelled: 0,
		retrying: 0,
	},
	lastPollTime: 0,
	isPolling: false,
};

// Create job queue context
const JobQueueContext = createContext<{
	state: JobQueueState;
	dispatch: React.Dispatch<JobQueueAction>;
	scheduler: JobScheduler;
} | null>(null);

// Job queue provider props
interface JobQueueProviderProps {
	children: React.ReactNode;
	pollInterval?: number; // Polling interval in milliseconds
}

// Job queue provider
export const JobQueueProvider: React.FC<JobQueueProviderProps> = ({
	children,
	pollInterval = 2000,
}) => {
	const [state, dispatch] = useReducer(jobQueueReducer, initialJobQueueState);
	const dir = useDir();
	const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
	const isMountedRef = useRef(true);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			isMountedRef.current = false;
			if (pollTimerRef.current) {
				clearInterval(pollTimerRef.current);
			}
		};
	}, []);

	// Poll for job updates from analytics
	useEffect(() => {
		if (!dir) return;

		const pollAnalytics = async () => {
			if (!isMountedRef.current) return;

			try {
				dispatch({
					type: "SET_POLLING",
					isPolling: true,
					timestamp: Date.now(),
				});

				const response = await apiAnalytics(dir, 50); // Get recent events
				const events = response.events || [];

				// Process events in chronological order
				const sortedEvents = events
					.filter((e) => e.type?.startsWith("job_"))
					.sort(
						(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
					);

				for (const event of sortedEvents) {
					const jobId = event.job_id as string;
					if (!jobId) continue;

					switch (event.type) {
						case "job_started": {
							const existingJob = state.jobs.get(jobId);
							if (!existingJob) {
								// Create new job from event
								const job: ExtendedJob = {
									id: jobId,
									type: (event.job_type as Job["type"]) || "index",
									title: (event.title as string) || "Job",
									description: event.description as string,
									status: "running",
									priority: "normal",
									total: event.total as number,
									startTime: new Date(event.time),
									createdAt: new Date(event.time),
									updatedAt: new Date(event.time),
									startedAt: new Date(event.time),
									cancellable: true,
									pausable: false,
									progressTracking: true,
									retryCount: 0,
									metadata: {},
								};

								dispatch({ type: "ADD_JOB", job });
							} else if (existingJob.status !== "running") {
								// Update existing job status
								dispatch({
									type: "SET_STATUS",
									id: jobId,
									status: "running",
								});
							}
							break;
						}

						case "job_progress": {
							dispatch({
								type: "SET_PROGRESS",
								id: jobId,
								progress: event.progress as number,
								currentStep: event.current_item as string,
								total: event.total as number,
							});
							break;
						}

						case "job_completed": {
							dispatch({
								type: "SET_STATUS",
								id: jobId,
								status: "completed",
							});

							// Update job with completion details
							dispatch({
								type: "UPDATE_JOB",
								id: jobId,
								updates: {
									successCount: event.success_count as number,
									warningCount: event.warning_count as number,
									errorCount: event.error_count as number,
									completedAt: new Date(event.time),
									progress: event.total as number,
								},
							});
							break;
						}

						case "job_failed": {
							dispatch({
								type: "SET_STATUS",
								id: jobId,
								status: "failed",
								error: event.error as string,
							});
							break;
						}

						case "job_cancelled": {
							dispatch({
								type: "SET_STATUS",
								id: jobId,
								status: "cancelled",
							});
							break;
						}
					}
				}
			} catch (error) {
				console.warn("Failed to poll analytics for jobs:", error);
			} finally {
				if (isMountedRef.current) {
					dispatch({
						type: "SET_POLLING",
						isPolling: false,
						timestamp: Date.now(),
					});
				}
			}
		};

		// Start polling
		const startPolling = () => {
			if (pollTimerRef.current) {
				clearInterval(pollTimerRef.current);
			}

			pollTimerRef.current = setInterval(pollAnalytics, pollInterval);
			pollAnalytics(); // Initial poll
		};

		startPolling();

		return () => {
			if (pollTimerRef.current) {
				clearInterval(pollTimerRef.current);
				pollTimerRef.current = null;
			}
		};
	}, [dir, pollInterval, state.jobs.get]);

	// Create scheduler
	const scheduler = useMemo<JobScheduler>(() => {
		return {
			enqueue: async (job: ExtendedJob): Promise<string> => {
				dispatch({ type: "ADD_JOB", job });
				return job.id;
			},

			dequeue: async (): Promise<ExtendedJob | undefined> => {
				// Find highest priority queued job
				const queuedJobs = Array.from(state.jobs.values()).filter(
					(job) => job.status === "queued",
				);
				if (queuedJobs.length === 0) return undefined;

				// Sort by priority and creation time
				queuedJobs.sort((a, b) => {
					const priorityOrder: Record<JobPriority, number> = {
						critical: 0,
						high: 1,
						normal: 2,
						low: 3,
					};

					const priorityDiff =
						priorityOrder[a.priority] - priorityOrder[b.priority];
					if (priorityDiff !== 0) return priorityDiff;

					return a.createdAt.getTime() - b.createdAt.getTime();
				});

				const nextJob = queuedJobs[0];
				if (nextJob) {
					dispatch({ type: "SET_STATUS", id: nextJob.id, status: "running" });
					return nextJob;
				}

				return undefined;
			},

			pause: async (jobId: string): Promise<void> => {
				const job = state.jobs.get(jobId);
				if (job && job.status === "running" && job.pausable) {
					dispatch({ type: "SET_STATUS", id: jobId, status: "paused" });
				}
			},

			resume: async (jobId: string): Promise<void> => {
				const job = state.jobs.get(jobId);
				if (job && job.status === "paused") {
					dispatch({ type: "SET_STATUS", id: jobId, status: "running" });
				}
			},

			cancel: async (jobId: string): Promise<void> => {
				const job = state.jobs.get(jobId);
				if (job?.cancellable) {
					dispatch({ type: "SET_STATUS", id: jobId, status: "cancelled" });
				}
			},

			retry: async (jobId: string): Promise<void> => {
				const job = state.jobs.get(jobId);
				if (job) {
					// Check retry policy
					const maxAttempts = job.retryPolicy?.maxAttempts || 3;
					if (job.retryCount < maxAttempts) {
						dispatch({
							type: "SET_STATUS",
							id: jobId,
							status: "retrying",
						});

						// Schedule retry with backoff
						const backoffDelay = calculateBackoffDelay(
							job.retryPolicy?.backoffStrategy || "exponential",
							job.retryPolicy?.initialDelayMs || 1000,
							job.retryCount,
							job.retryPolicy?.maxDelayMs || 30000,
							job.retryPolicy?.jitter || false,
						);

						setTimeout(() => {
							dispatch({
								type: "SET_STATUS",
								id: jobId,
								status: "queued",
							});
							dispatch({
								type: "UPDATE_JOB",
								id: jobId,
								updates: {
									retryCount: job.retryCount + 1,
									updatedAt: new Date(),
								},
							});
						}, backoffDelay);
					} else {
						// Max retries exceeded, mark as failed
						dispatch({
							type: "SET_STATUS",
							id: jobId,
							status: "failed",
							error: "Maximum retry attempts exceeded",
						});
					}
				}
			},

			getJob: (jobId: string): ExtendedJob | undefined => {
				return state.jobs.get(jobId);
			},

			getJobs: (filters?: JobFilters): ExtendedJob[] => {
				let jobs = Array.from(state.jobs.values());

				if (filters) {
					if (filters.status) {
						const statuses = Array.isArray(filters.status)
							? filters.status
							: [filters.status];
						jobs = jobs.filter((job) => statuses.includes(job.status));
					}

					if (filters.priority) {
						const priorities = Array.isArray(filters.priority)
							? filters.priority
							: [filters.priority];
						jobs = jobs.filter((job) => priorities.includes(job.priority));
					}

					if (filters.type) {
						const types = Array.isArray(filters.type)
							? filters.type
							: [filters.type];
						jobs = jobs.filter((job) => types.includes(job.type));
					}

					if (filters.tags) {
						const tags = Array.isArray(filters.tags)
							? filters.tags
							: [filters.tags];
						jobs = jobs.filter((job) =>
							job.tags?.some((tag) => tags.includes(tag)),
						);
					}

					if (filters.groupId) {
						const groupJobIds = state.groups.get(filters.groupId);
						if (groupJobIds) {
							jobs = jobs.filter((job) => groupJobIds.has(job.id));
						}
					}

					if (filters.before) {
						jobs = jobs.filter((job) => job.createdAt < filters.before!);
					}

					if (filters.after) {
						jobs = jobs.filter((job) => job.createdAt > filters.after!);
					}
				}

				return jobs;
			},

			getStatistics: (): JobQueueState["statistics"] => {
				return { ...state.statistics };
			},

			clearCompleted: (before?: Date): void => {
				const completedJobs = Array.from(state.jobs.values()).filter(
					(job) => job.status === "completed",
				);

				if (before) {
					completedJobs
						.filter((job) => job.completedAt! < before)
						.forEach((job) => {
							dispatch({ type: "REMOVE_JOB", id: job.id });
						});
				} else {
					completedJobs.forEach((job) => {
						dispatch({ type: "REMOVE_JOB", id: job.id });
					});
				}
			},

			clearFailed: (before?: Date): void => {
				const failedJobs = Array.from(state.jobs.values()).filter(
					(job) => job.status === "failed",
				);

				if (before) {
					failedJobs
						.filter((job) => job.failedAt! < before)
						.forEach((job) => {
							dispatch({ type: "REMOVE_JOB", id: job.id });
						});
				} else {
					failedJobs.forEach((job) => {
						dispatch({ type: "REMOVE_JOB", id: job.id });
					});
				}
			},

			clearCancelled: (before?: Date): void => {
				const cancelledJobs = Array.from(state.jobs.values()).filter(
					(job) => job.status === "cancelled",
				);

				if (before) {
					cancelledJobs
						.filter((job) => job.cancelledAt! < before)
						.forEach((job) => {
							dispatch({ type: "REMOVE_JOB", id: job.id });
						});
				} else {
					cancelledJobs.forEach((job) => {
						dispatch({ type: "REMOVE_JOB", id: job.id });
					});
				}
			},

			reset: (): void => {
				dispatch({ type: "RESET_QUEUE" });
			},
		};
	}, [state]);

	const contextValue = useMemo(
		() => ({
			state,
			dispatch,
			scheduler,
		}),
		[state, scheduler],
	);

	return (
		<JobQueueContext.Provider value={contextValue}>
			{children}
		</JobQueueContext.Provider>
	);
};

// Hook to use job queue context
export const useJobQueue = () => {
	const context = useContext(JobQueueContext);
	if (!context) {
		throw new Error("useJobQueue must be used within a JobQueueProvider");
	}
	return context;
};

// Hook to use job scheduler
export const useJobScheduler = () => {
	const { scheduler } = useJobQueue();
	return scheduler;
};

// Hook to get job statistics
export const useJobStatistics = () => {
	const { state } = useJobQueue();
	return state.statistics;
};

// Hook to get job by ID
export const useJob = (jobId: string) => {
	const { state } = useJobQueue();
	return state.jobs.get(jobId);
};

// Hook to get jobs with filters
export const useJobs = (filters?: JobFilters) => {
	const { state } = useJobQueue();

	return useMemo(() => {
		let jobs = Array.from(state.jobs.values());

		if (filters) {
			if (filters.status) {
				const statuses = Array.isArray(filters.status)
					? filters.status
					: [filters.status];
				jobs = jobs.filter((job) => statuses.includes(job.status));
			}

			if (filters.priority) {
				const priorities = Array.isArray(filters.priority)
					? filters.priority
					: [filters.priority];
				jobs = jobs.filter((job) => priorities.includes(job.priority));
			}

			if (filters.type) {
				const types = Array.isArray(filters.type)
					? filters.type
					: [filters.type];
				jobs = jobs.filter((job) => types.includes(job.type));
			}

			if (filters.tags) {
				const tags = Array.isArray(filters.tags)
					? filters.tags
					: [filters.tags];
				jobs = jobs.filter((job) =>
					job.tags?.some((tag) => tags.includes(tag)),
				);
			}

			if (filters.groupId) {
				const groupJobIds = state.groups.get(filters.groupId);
				if (groupJobIds) {
					jobs = jobs.filter((job) => groupJobIds.has(job.id));
				}
			}

			if (filters.before) {
				jobs = jobs.filter((job) => job.createdAt < filters.before!);
			}

			if (filters.after) {
				jobs = jobs.filter((job) => job.createdAt > filters.after!);
			}
		}

		return jobs;
	}, [state, filters]);
};

// Utility function to calculate backoff delay
function calculateBackoffDelay(
	strategy: "fixed" | "exponential" | "fibonacci",
	initialDelay: number,
	attempt: number,
	maxDelay: number,
	jitter: boolean,
): number {
	let delay: number;

	switch (strategy) {
		case "fixed":
			delay = initialDelay;
			break;

		case "exponential":
			delay = initialDelay * 2 ** attempt;
			break;

		case "fibonacci": {
			// Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, ...
			const fib = (n: number): number => {
				if (n <= 1) return 1;
				let a = 1,
					b = 1;
				for (let i = 2; i <= n; i++) {
					const temp = a + b;
					a = b;
					b = temp;
				}
				return b;
			};
			delay = initialDelay * fib(attempt);
			break;
		}

		default:
			delay = initialDelay;
	}

	// Apply maximum delay
	delay = Math.min(delay, maxDelay);

	// Apply jitter if requested
	if (jitter) {
		delay = delay * (0.5 + Math.random() * 0.5); // 50% to 100% of delay
	}

	return delay;
}

// Utility function to create a new job
export function createJob(
	type: string,
	title: string,
	options?: {
		priority?: JobPriority;
		description?: string;
		total?: number;
		dependencies?: JobDependencies;
		retryPolicy?: RetryPolicy;
		tags?: string[];
		groupId?: string;
		cancellable?: boolean;
		pausable?: boolean;
		metadata?: Record<string, unknown>;
	},
): ExtendedJob {
	const now = new Date();

	return {
		id: uuidv4(),
		type,
		title,
		description: options?.description || "",
		status: "queued",
		priority: options?.priority || "normal",
		total: options?.total || 0,
		startTime: now,
		createdAt: now,
		updatedAt: now,
		dependencies: options?.dependencies,
		retryPolicy: options?.retryPolicy || {
			maxAttempts: 3,
			backoffStrategy: "exponential",
			initialDelayMs: 1000,
			maxDelayMs: 30000,
			jitter: true,
		},
		tags: options?.tags,
		groupId: options?.groupId,
		cancellable: options?.cancellable !== false, // Default true
		pausable: options?.pausable === true, // Default false
		progressTracking: true,
		retryCount: 0,
		metadata: options?.metadata || {},
	};
}

export default JobQueueContext;
