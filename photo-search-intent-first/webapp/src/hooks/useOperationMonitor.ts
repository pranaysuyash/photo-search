/**
 * Generic hook for monitoring long-running operations (OCR, metadata, fast index)
 * Provides unified interface for starting, monitoring, and handling operation status
 */
import { useCallback, useRef } from "react";
import { apiOperationStatus } from "../api";
import type { Job } from "../components/JobsCenter";
import { useJobsContext } from "../contexts/JobsContext";

export type OperationType = "ocr" | "metadata" | "fast_index";

type OperationStatus = {
	state: "running" | "completed" | "failed";
	progress?: number;
	total?: number;
	note?: string;
	error?: string;
	kind?: string;
};

export function useOperationMonitor(dir?: string) {
	const running = useRef<Record<string, number>>({}); // jobId -> timeoutId
	const { actions: jobs } = useJobsContext();

	const start = useCallback(
		(
			jobId: string,
			operation: OperationType,
			onUpdate: (status: OperationStatus) => void,
			jobConfig?: Partial<Job>,
		) => {
			if (!dir) return () => {};

			let cancelled = false;

			const poll = async () => {
				try {
					const rawStatus = await apiOperationStatus(dir, operation);
					if (cancelled) return;

					// Map API response to generic status
					const mapped = mapStatus(rawStatus);
					onUpdate(mapped);

					if (mapped.state === "running") {
						running.current[jobId] = window.setTimeout(poll, 1200);
					} else {
						// Operation completed or failed
						if (mapped.state === "completed") {
							jobs.update(jobId, {
								status: "completed",
								progress: mapped.total,
								total: mapped.total,
								estimatedTimeRemaining: 0,
								endTime: new Date(),
								...jobConfig,
							});
						} else if (mapped.state === "failed") {
							jobs.update(jobId, {
								status: "failed",
								error: mapped.error,
								endTime: new Date(),
								...jobConfig,
							});
						}
					}
				} catch (err) {
					if (!cancelled) {
						const error =
							err instanceof Error ? err.message : "Operation failed";
						onUpdate({ state: "failed", error });
						jobs.update(jobId, {
							status: "failed",
							error,
							endTime: new Date(),
							...jobConfig,
						});
					}
				}
			};

			poll();

			return () => {
				cancelled = true;
				if (running.current[jobId]) {
					window.clearTimeout(running.current[jobId]);
					delete running.current[jobId];
				}
			};
		},
		[dir, jobs],
	);

	return { start };
}

// Pure function to map API status to generic OperationStatus
function mapStatus(rawStatus: unknown): OperationStatus {
	const status = rawStatus as Record<string, unknown> | null | undefined;
	const state = String(status?.state ?? "").toLowerCase();

	if (state === "error" || state === "failed") {
		return {
			state: "failed",
			error:
				typeof status?.error === "string" ? status.error : "Operation failed",
		};
	}

	if (state === "complete" || state === "completed") {
		const total =
			typeof status?.total === "number"
				? status.total
				: typeof status?.done === "number"
					? status.done
					: typeof status?.updated === "number"
						? status.updated
						: undefined;

		return {
			state: "completed",
			progress: total,
			total,
		};
	}

	// Running state
	const isRunning =
		state === "running" || state === "processing" || state === "scanning";

	if (isRunning) {
		const total =
			typeof status?.total === "number"
				? status.total
				: typeof status?.target === "number"
					? status.target
					: undefined;
		const done = typeof status?.done === "number" ? status.done : undefined;

		return {
			state: "running",
			progress: done,
			total,
			note:
				typeof status?.note === "string"
					? status.note
					: typeof status?.state_detail === "string"
						? status.state_detail
						: typeof status?.kind === "string"
							? status.kind
							: undefined,
		};
	}

	// Default to running if we can't determine state
	return { state: "running" };
}
