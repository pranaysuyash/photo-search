/**
 * Async operations hook with comprehensive error handling
 * Provides loading states, error handling, and retry functionality
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	_retryOperation,
	_withErrorHandling,
	createAppError,
	type ErrorHandlerOptions,
	ErrorType,
	handleError,
	networkErrors,
	showToast,
} from "../utils/errors";

interface UseAsyncOptions<T> {
	// Error handling
	errorOptions?: ErrorHandlerOptions;
	retryCount?: number;
	retryDelay?: number;

	// Loading states
	delay?: number; // Delay before showing loading state
	minimumLoadingTime?: number; // Minimum time to show loading state

	// Callbacks
	onSuccess?: (data: T) => void;
	onError?: (error: Error) => void;
	onFinally?: () => void;

	// Behavior
	throwOnError?: boolean;
	enabled?: boolean;
}

interface UseAsyncReturn<T> {
	// State
	data: T | null;
	loading: boolean;
	error: Error | null;

	// Actions
	execute: (...args: unknown[]) => Promise<T | null>;
	reset: () => void;
	retry: () => Promise<T | null>;

	// Utilities
	isOffline: boolean;
	isRetrying: boolean;
}

/**
 * Hook for managing async operations with comprehensive error handling
 *
 * @example
 * const { data, loading, error, execute } = useAsync(fetchUserData, {
 *   retryCount: 3,
 *   onSuccess: (user) => console.log('User loaded:', user),
 *   onError: (error) => console.error('Failed to load user:', error)
 * });
 *
 * // Execute the operation
 * execute(userId);
 */
export function useAsync<T = any>(
	asyncFunction: (...args: unknown[]) => Promise<T>,
	options: UseAsyncOptions<T> = {},
): UseAsyncReturn<T> {
	const {
		errorOptions = {},
		retryCount = 0,
		retryDelay = 1000,
		delay = 0,
		minimumLoadingTime = 0,
		onSuccess,
		onError,
		onFinally,
		throwOnError = false,
		enabled = true,
	} = options;

	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);

	const startTimeRef = useRef<number>(0);
	const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
	const minTimeTimerRef = useRef<NodeJS.Timeout | null>(null);
	const isMountedRef = useRef(true);
	const retryCountRef = useRef(0);

	/**
	 * Execute the async operation with error handling
	 */
	const execute = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (...args: unknown[]): Promise<T | null> => {
				if (!enabled) return null;

				// Check if offline
				if (networkErrors.isOffline()) {
					const offlineError = createAppError(
						"You appear to be offline",
						ErrorType.NETWORK,
						{
							userMessage:
								"Please check your internet connection and try again.",
						},
					);
					setError(offlineError);
					onError?.(offlineError);
					return null;
				}

				try {
					// Reset state
					setError(null);
					setIsRetrying(retryCountRef.current > 0);
					startTimeRef.current = Date.now();

					// Handle loading delay
					if (delay > 0) {
						delayTimerRef.current = setTimeout(() => {
							if (isMountedRef.current) setLoading(true);
						}, delay);
					} else {
						setLoading(true);
					}

					// Execute the async function with retry logic
					const result =
						retryCount > 0
							? await _retryOperation(
									() => asyncFunction(...args),
									retryCount,
									retryDelay,
								)
							: await asyncFunction(...args);

					// Ensure minimum loading time
					const elapsedTime = Date.now() - startTimeRef.current;
					const remainingMinTime = Math.max(
						0,
						minimumLoadingTime - elapsedTime,
					);

					if (remainingMinTime > 0) {
						await new Promise((resolve) =>
							setTimeout(resolve, remainingMinTime),
						);
					}

					if (isMountedRef.current) {
						setData(result);
						onSuccess?.(result);
					}

					return result;
				} catch (err) {
					const error = err instanceof Error ? err : new Error(String(err));

					if (isMountedRef.current) {
						setError(error);

						// Handle error with comprehensive options
						handleError(error, {
							...errorOptions,
							context: {
								...errorOptions.context,
								component: "useAsync",
								action: "execute",
							},
						});

						onError?.(error);

						if (throwOnError) {
							throw error;
						}
					}

					return null;
				} finally {
					// Clean up timers
					if (delayTimerRef.current) {
						clearTimeout(delayTimerRef.current);
						delayTimerRef.current = null;
					}
					if (minTimeTimerRef.current) {
						clearTimeout(minTimeTimerRef.current);
						minTimeTimerRef.current = null;
					}

					if (isMountedRef.current) {
						setLoading(false);
						setIsRetrying(false);
						retryCountRef.current = 0;
					}

					onFinally?.();
				}
			},
			[
				asyncFunction,
				enabled,
				retryCount,
				retryDelay,
				delay,
				minimumLoadingTime,
				onSuccess,
				onError,
				onFinally,
				throwOnError,
				errorOptions,
			],
		);

	/**
	 * Retry the last operation
	 */
	const retry = // biome-ignore lint/correctness/useExhaustiveDependencies: Stable callback
		// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async (): Promise<T | null> => {
			if (!error) return null;

			retryCountRef.current += 1;
			return execute();
		}, [execute, error]);

	/**
	 * Reset all state
	 */
	const reset = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(() => {
			setData(null);
			setLoading(false);
			setError(null);
			setIsRetrying(false);
			retryCountRef.current = 0;

			// Clean up timers
			if (delayTimerRef.current) {
				clearTimeout(delayTimerRef.current);
				delayTimerRef.current = null;
			}
			if (minTimeTimerRef.current) {
				clearTimeout(minTimeTimerRef.current);
				minTimeTimerRef.current = null;
			}
		}, []);

	// Cleanup on unmount
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		return () => {
			isMountedRef.current = false;
			if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
			if (minTimeTimerRef.current) clearTimeout(minTimeTimerRef.current);
		};
	}, []);

	return {
		data,
		loading,
		error,
		execute,
		reset,
		retry,
		isOffline: networkErrors.isOffline(),
		isRetrying,
	};
}

/**
 * Specialized hook for API operations with common error patterns
 */
export function useApi<T = any>(
	apiFunction: (...args: unknown[]) => Promise<T>,
	options: UseAsyncOptions<T> & {
		resourceName?: string;
		showSuccessToast?: boolean;
		successMessage?: string;
	} = {},
) {
	const {
		resourceName = "data",
		showSuccessToast = false,
		successMessage = `${resourceName} loaded successfully`,
		errorOptions = {},
		...asyncOptions
	} = options;

	const enhancedOnSuccess = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			(_data: T) => {
				if (showSuccessToast) {
					showToast({
						message: successMessage,
						type: "success",
						duration: 3000,
					});
				}
				options.onSuccess?.(_data);
			},
			[showSuccessToast, successMessage, options.onSuccess],
		);

	const enhancedErrorOptions: ErrorHandlerOptions = {
		...errorOptions,
		context: {
			...errorOptions.context,
			component: "useApi",
			action: `load${resourceName}`,
		},
	};

	return useAsync(apiFunction, {
		...asyncOptions,
		onSuccess: enhancedOnSuccess,
		errorOptions: enhancedErrorOptions,
	});
}

/**
 * Hook for managing multiple async operations
 */
export function useAsyncOperations<
	T extends Record<string, (...args: unknown[]) => Promise<unknown>>,
>(
	operations: T,
	options: Omit<UseAsyncOptions<unknown>, "onSuccess" | "onError"> = {},
) {
	type OperationName = keyof T;
	type OperationResults = { [K in keyof T]: Awaited<ReturnType<T[K]>> | null };

	const [results, setResults] = useState<Partial<OperationResults>>({});
	const [loading, setLoading] = useState<
		Partial<Record<OperationName, boolean>>
	>({});
	const [errors, setErrors] = useState<Partial<Record<OperationName, Error>>>(
		{},
	);

	const execute = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (
				operationName: OperationName,
				...args: Parameters<T[OperationName]>
			): Promise<OperationResults[OperationName] | null> => {
				const operation = operations[operationName];

				try {
					setLoading((prev) => ({ ...prev, [operationName]: true }));
					setErrors((prev) => ({ ...prev, [operationName]: null }));

					const result = await _withErrorHandling(
						() => operation(...args),
						options.errorOptions,
					);

					if (result) {
						setResults((prev) => ({ ...prev, [operationName]: result }));
					}

					return result as OperationResults[OperationName] | null;
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					setErrors((prev) => ({ ...prev, [operationName]: err }));
					return null;
				} finally {
					setLoading((prev) => ({ ...prev, [operationName]: false }));
				}
			},
			[operations, options.errorOptions],
		);

	const executeAll = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(async (): Promise<Partial<OperationResults>> => {
			const promises = Object.entries(operations).map(async ([name]) => {
				const result = await execute(
					name as OperationName,
					...([] as unknown as Parameters<T[OperationName]>),
				);
				return [name, result];
			});

			const entries = await Promise.all(promises);
			return Object.fromEntries(
				entries.filter(([, result]) => result !== null),
			);
		}, [execute, operations]);

	const reset = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback((operationName?: OperationName) => {
			if (operationName) {
				setResults((prev) => ({ ...prev, [operationName]: null }));
				setLoading((prev) => ({ ...prev, [operationName]: false }));
				setErrors((prev) => ({ ...prev, [operationName]: null }));
			} else {
				setResults({});
				setLoading({});
				setErrors({});
			}
		}, []);

	return {
		results: results as Partial<OperationResults>,
		loading: loading as Partial<Record<OperationName, boolean>>,
		errors: errors as Partial<Record<OperationName, Error>>,
		execute,
		executeAll,
		reset,
	};
}

/**
 * Hook for debounced async operations
 */
export function useDebouncedAsync<T = any>(
	asyncFunction: (...args: unknown[]) => Promise<T>,
	delay: number,
	options: UseAsyncOptions<T> = {},
) {
	const { execute, ...rest } = useAsync(asyncFunction, options);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const debouncedExecute = // biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
		useCallback(
			async (...args: unknown[]): Promise<T | null> => {
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}

				return new Promise((resolve) => {
					timeoutRef.current = setTimeout(async () => {
						const result = await execute(...args);
						resolve(result);
					}, delay);
				});
			},
			[execute, delay],
		);

	// Cleanup on unmount
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return {
		execute: debouncedExecute,
		...rest,
	};
}
