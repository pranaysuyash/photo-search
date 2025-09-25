import { useCallback } from "react";
import { apiOperationStatus } from "../api";
import type { Job } from "../components/JobsCenter";
import { useJobsContext } from "../contexts/JobsContext";

export function useMonitorOperation(dir?: string) {
	const { actions: jobsActions } = useJobsContext();

	return useCallback(
		(jobId: string, operation: "ocr" | "metadata" | "fast_index") => {
			if (!dir) return () => {};
			let cancelled = false;
			let timeout: number | undefined;
			const startedAt = Date.now();

			const poll = async () => {
				try {
					const status = await apiOperationStatus(dir, operation);
					if (cancelled) return;
					const state = String(status?.state ?? "").toLowerCase();
					if (state === "error") {
						jobsActions.update(jobId, {
							status: "failed",
							error:
								typeof status?.error === "string" ? status.error : "Job failed",
							endTime: new Date(),
						} as Partial<Job>);
						return;
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
						jobsActions.update(jobId, {
							status: "completed",
							progress: total,
							total,
							estimatedTimeRemaining: 0,
							speed: undefined,
							endTime: new Date(),
						} as Partial<Job>);
						return;
					}
					if (state === "failed") {
						jobsActions.update(jobId, {
							status: "failed",
							error:
								typeof status?.error === "string" ? status.error : "Job failed",
							endTime: new Date(),
						} as Partial<Job>);
						return;
					}

					const isRunning =
						state === "running" ||
						state === "processing" ||
						state === "scanning";
					if (isRunning) {
						const totalRaw =
							typeof status?.total === "number"
								? status.total
								: typeof status?.target === "number"
									? status.target
									: undefined;
						const doneRaw =
							typeof status?.done === "number" ? status.done : undefined;
						const patch: Partial<Job> = { status: "running" };
						if (typeof status?.note === "string")
							patch.description = status.note;
						else if (typeof status?.state_detail === "string")
							patch.description = status.state_detail;
						else if (
							typeof status?.kind === "string" &&
							operation === "fast_index"
						)
							patch.description = `${status.kind}`;

						if (typeof totalRaw === "number" && totalRaw >= 0)
							patch.total = totalRaw;
						if (typeof doneRaw === "number" && doneRaw >= 0)
							patch.progress = doneRaw;

						if (
							typeof patch.total === "number" &&
							patch.total > 0 &&
							typeof patch.progress === "number" &&
							patch.progress >= 0
						) {
							const elapsedSeconds = Math.max(
								1,
								(Date.now() - startedAt) / 1000,
							);
							if (patch.progress > 0) {
								const rate = patch.progress / elapsedSeconds;
								if (rate > 0) {
									const remaining = Math.max(0, patch.total - patch.progress);
									patch.estimatedTimeRemaining = Math.round(remaining / rate);
									const perMinute = rate * 60;
									patch.speed = `${
										perMinute >= 10
											? perMinute.toFixed(0)
											: perMinute.toFixed(1)
									} items/min`;
								}
							}
						} else {
							patch.estimatedTimeRemaining = undefined;
							patch.speed = undefined;
						}

						jobsActions.update(jobId, patch);
					}
				} catch (err) {
					if (!cancelled) {
						jobsActions.update(jobId, {
							status: "failed",
							error:
								err instanceof Error ? err.message : "Failed to fetch status",
							endTime: new Date(),
						} as Partial<Job>);
					}
					return;
				}

				if (!cancelled) timeout = window.setTimeout(poll, 1200) as number;
			};

			poll();

			return () => {
				cancelled = true;
				if (timeout) window.clearTimeout(timeout);
			};
		},
		[dir, jobsActions],
	);
}
