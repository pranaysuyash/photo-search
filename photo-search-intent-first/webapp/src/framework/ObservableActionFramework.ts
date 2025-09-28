/**
 * ObservableActionFramework - Provides observable actions with telemetry and error handling
 * This framework wraps action functions with observability, telemetry, and error handling.
 */
import { v4 as uuidv4 } from "uuid";
import type { ActionTelemetry } from "../services/TelemetryService";
import { telemetryService } from "../services/TelemetryService";

// Action result interface
export interface ActionResult<T> {
	success: boolean;
	data?: T;
	error?: Error;
	actionId: string;
	duration: number;
}

// Observable action options
export interface ObservableActionOptions {
	category?: string;
	trackPerformance?: boolean;
	trackErrors?: boolean;
	trackUsage?: boolean;
	announce?: boolean;
	retryAttempts?: number;
	timeoutMs?: number;
	metadata?: Record<string, unknown>;
}

// Create an observable action wrapper
export function createObservableAction<T, Args extends any[]>(
	name: string,
	actionFn: (...args: Args) => Promise<T>,
	options: ObservableActionOptions = {},
): (...args: Args) => Promise<ActionResult<T>> {
	return async (...args: Args): Promise<ActionResult<T>> => {
		// Create action telemetry
		const actionId = uuidv4();
		const startTime = Date.now();

		const telemetry: Omit<ActionTelemetry, "endTime" | "duration" | "status"> =
			{
				id: actionId,
				name,
				category: options.category || "uncategorized",
				startTime,
				metadata: options.metadata,
			};

		// Track action start
		telemetryService.trackActionStart(telemetry);

		// Track usage
		if (options.trackUsage) {
			telemetryService.trackUsage(name);
		}

		// Announce action start if requested
		if (options.announce) {
			announceAction(`${name} started`, "polite");
		}

		let result: ActionResult<T>;
		let _error: Error | undefined;

		try {
			// Execute the action with optional timeout
			let actionPromise = actionFn(...args);

			if (options.timeoutMs) {
				actionPromise = Promise.race([
					actionPromise,
					new Promise<T>((_, reject) =>
						setTimeout(
							() =>
								reject(
									new Error(`Action timed out after ${options.timeoutMs}ms`),
								),
							options.timeoutMs,
						),
					),
				]) as Promise<T>;
			}

			// Retry logic if requested
			let attempts = 0;
			const maxAttempts = (options.retryAttempts || 0) + 1;

			while (attempts < maxAttempts) {
				try {
					const data = await actionPromise;
					result = {
						success: true,
						data,
						actionId,
						duration: Date.now() - startTime,
					};
					break;
				} catch (err) {
					attempts++;
					if (attempts >= maxAttempts) {
						throw err;
					}
					// Wait before retry with exponential backoff
					await new Promise((resolve) =>
						setTimeout(resolve, 2 ** attempts * 100),
					);
				}
			}

			// If we get here without a result, create a default one
			if (!result) {
				result = {
					success: true,
					actionId,
					duration: Date.now() - startTime,
				};
			}
		} catch (err) {
			_error = err as Error;
			result = {
				success: false,
				error: err as Error,
				actionId,
				duration: Date.now() - startTime,
			};

			// Track error
			if (options.trackErrors) {
				telemetryService.trackError(err as Error, { action: name, args });
			}

			// Announce error if requested
			if (options.announce) {
				announceAction(
					`${name} failed: ${(err as Error).message}`,
					"assertive",
				);
			}
		}

		// Track action end
		telemetryService.trackActionEnd(
			actionId,
			result.success ? "completed" : "failed",
			result.error,
		);

		// Announce completion if requested
		if (options.announce && result.success) {
			announceAction(`${name} completed`, "polite");
		}

		return result;
	};
}

// Batch action executor
export async function executeBatchActions<T, Args extends any[]>(
	name: string,
	actions: Array<(...args: Args) => Promise<T>>,
	args: Args,
	options: ObservableActionOptions = {},
): Promise<Array<ActionResult<T>>> {
	const batchStartTime = Date.now();
	const results: Array<ActionResult<T>> = [];

	// Track batch start
	const batchId = uuidv4();
	const batchTelemetry: Omit<
		ActionTelemetry,
		"endTime" | "duration" | "status"
	> = {
		id: batchId,
		name: `${name}_batch`,
		category: "batch",
		startTime: batchStartTime,
		metadata: {
			...options.metadata,
			actionCount: actions.length,
		},
	};

	telemetryService.trackActionStart(batchTelemetry);

	// Execute actions in parallel with concurrency limit
	const concurrencyLimit = 5;
	const resultsArray: Array<Promise<ActionResult<T>>[]> = [];

	for (let i = 0; i < actions.length; i += concurrencyLimit) {
		const chunk = actions.slice(i, i + concurrencyLimit);
		const chunkPromises = chunk.map((action, index) =>
			createObservableAction(`${name}_${i + index}`, action, options)(...args),
		);
		resultsArray.push(chunkPromises);
	}

	// Wait for all chunks to complete
	for (const chunkPromises of resultsArray) {
		const chunkResults = await Promise.all(chunkPromises);
		results.push(...chunkResults);
	}

	// Track batch end
	telemetryService.trackActionEnd(batchId, "completed");

	// Announce batch completion
	if (options.announce) {
		const successCount = results.filter((r) => r.success).length;
		announceAction(
			`${name} batch completed: ${successCount}/${results.length} succeeded`,
			"polite",
		);
	}

	return results;
}

// Action composition utility
export function composeActions<T>(
	name: string,
	...actions: Array<(input: T) => Promise<T>>
): (input: T) => Promise<ActionResult<T>> {
	return createObservableAction(name, async (input: T): Promise<T> => {
		let result = input;
		for (const action of actions) {
			result = await action(result);
		}
		return result;
	});
}

// Transactional action wrapper
export async function executeTransactionalAction<T, Args extends any[]>(
	name: string,
	actionFn: (...args: Args) => Promise<T>,
	rollbackFn: (result: T) => Promise<void>,
	args: Args,
	options: ObservableActionOptions = {},
): Promise<ActionResult<T>> {
	const transactionId = uuidv4();

	// Track transaction start
	const transactionTelemetry: Omit<
		ActionTelemetry,
		"endTime" | "duration" | "status"
	> = {
		id: transactionId,
		name: `${name}_transaction`,
		category: "transaction",
		startTime: Date.now(),
		metadata: options.metadata,
	};

	telemetryService.trackActionStart(transactionTelemetry);

	try {
		const result = await actionFn(...args);

		// Track successful transaction
		telemetryService.trackActionEnd(transactionId, "completed");

		return {
			success: true,
			data: result,
			actionId: transactionId,
			duration: Date.now() - transactionTelemetry.startTime,
		};
	} catch (error) {
		// Attempt rollback
		try {
			await rollbackFn(undefined as unknown); // Pass undefined as we don't have result

			// Track rolled back transaction
			telemetryService.trackActionEnd(transactionId, "cancelled");

			if (options.announce) {
				announceAction(`${name} transaction rolled back`, "assertive");
			}
		} catch (rollbackError) {
			// Track failed rollback
			telemetryService.trackActionEnd(
				transactionId,
				"failed",
				rollbackError as Error,
			);

			if (options.announce) {
				announceAction(
					`${name} transaction failed and rollback failed`,
					"assertive",
				);
			}
		}

		return {
			success: false,
			error: error as Error,
			actionId: transactionId,
			duration: Date.now() - transactionTelemetry.startTime,
		};
	}
}

// Screen reader announcement utility
export function announceAction(
	message: string,
	priority: "polite" | "assertive" = "polite",
): void {
	// Create or update live region for screen readers
	let liveRegion = document.getElementById("action-announcements");
	if (!liveRegion) {
		liveRegion = document.createElement("div");
		liveRegion.id = "action-announcements";
		liveRegion.setAttribute("aria-live", priority);
		liveRegion.setAttribute("aria-atomic", "true");
		liveRegion.className = "sr-only";
		document.body.appendChild(liveRegion);
	}

	// Update content to trigger announcement
	liveRegion.textContent = message;

	// Track accessibility event
	telemetryService.trackAccessibilityEvent("announcement", {
		message,
		priority,
	});
}

// Performance monitoring decorator
export function withPerformanceMonitoring<
	T extends (...args: unknown[]) => Promise<any>,
>(
	_target: Object,
	_propertyKey: string,
	descriptor: TypedPropertyDescriptor<T>,
): void {
	const originalMethod = descriptor.value;

	descriptor.value = async function (
		...args: Parameters<T>
	): Promise<ReturnType<T>> {
		const startTime = performance.now();

		try {
			const result = await originalMethod?.apply(this, args);

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Track performance
			telemetryService.trackPerformance({
				actionDuration: duration,
				memoryUsage: 0, // Would need to be measured differently
				cpuUsage: 0, // Would need to be measured differently
				networkLatency: 0, // Would need to be measured differently
				cacheHitRate: 0, // Would need to be measured differently
				errorRate: 0,
				successRate: 1,
				throughput: 1000 / duration,
			});

			return result;
		} catch (error) {
			const endTime = performance.now();
			const duration = endTime - startTime;

			// Track performance for failed actions
			telemetryService.trackPerformance({
				actionDuration: duration,
				memoryUsage: 0,
				cpuUsage: 0,
				networkLatency: 0,
				cacheHitRate: 0,
				errorRate: 1,
				successRate: 0,
				throughput: 0,
			});

			throw error;
		}
	};
}
