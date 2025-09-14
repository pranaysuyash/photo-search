// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
/**
 * Comprehensive error handling utilities for the photo search application
 */

import React from "react";

/**
 * Extended error type with additional properties
 */
interface ExtendedError extends Error {
	userMessage?: string;
	code?: string;
	status?: number;
}

/**
 * Toast notification system that integrates with the app's custom toast state
 */
export interface ToastOptions {
	message: string;
	type?: "success" | "error" | "warning" | "info";
	duration?: number;
	actionLabel?: string;
	onAction?: () => void;
}

/**
 * Global toast handler - should be set by the main app component
 */
let globalToastHandler: ((options: ToastOptions) => void) | null = null;

/**
 * Set the global toast handler from the main app
 */
export const _setToastHandler = (handler: (options: ToastOptions) => void) => {
	globalToastHandler = handler;
};

/**
 * Show a toast notification using the app's custom toast system
 */
export const showToast = (_options: ToastOptions) => {
	if (globalToastHandler) {
		globalToastHandler(_options);
	} else {
		// Fallback to console if no handler is set
		console.log(
			`[${_options.type?.toUpperCase() || "INFO"}] ${_options.message}`,
		);
	}
};

/**
 * Custom error types for different application scenarios
 */
export enum ErrorType {
	NETWORK = "NETWORK",
	VALIDATION = "VALIDATION",
	PERMISSION = "PERMISSION",
	NOT_FOUND = "NOT_FOUND",
	TIMEOUT = "TIMEOUT",
	RATE_LIMIT = "RATE_LIMIT",
	SERVER = "SERVER",
	UNKNOWN = "UNKNOWN",
}

/**
 * Enhanced error with additional context
 */
export interface AppError extends Error {
	type: ErrorType;
	code?: string;
	details?: unknown;
	userMessage?: string;
	recoverable?: boolean;
	timestamp: Date;
}

/**
 * Error context for logging and debugging
 */
export interface ErrorContext {
	component?: string;
	action?: string;
	userId?: string;
	sessionId?: string;
	metadata?: Record<string, unknown>;
	/** Optional current library directory to attach server logs */
	dir?: string;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerOptions {
	showToast?: boolean;
	logToConsole?: boolean;
	logToServer?: boolean;
	retryable?: boolean;
	fallbackMessage?: string;
	context?: ErrorContext;
}

/**
 * Creates an enhanced error with additional context
 */
export const createAppError = (
	message: string,
	type: ErrorType = ErrorType.UNKNOWN,
	options: Partial<AppError> = {},
): AppError => {
	const error = new Error(message) as AppError;
	error.type = type;
	error.timestamp = new Date();
	error.name = "AppError";

	if (options.code) error.code = options.code;
	if (options.details) error.details = options.details;
	if (options.userMessage) error.userMessage = options.userMessage;
	if (options.recoverable !== undefined)
		error.recoverable = options.recoverable;

	return error;
};

/**
 * Determines error type from various error sources
 */
export const classifyError = (error: Error | unknown): ErrorType => {
	if (!error) return ErrorType.UNKNOWN;

	const err = error as ExtendedError;

	// Network errors
	if (err.name === "TypeError" && err.message?.includes("fetch")) {
		return ErrorType.NETWORK;
	}
	if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
		return ErrorType.NETWORK;
	}

	// HTTP status codes
	if (err.status) {
		switch (err.status) {
			case 400:
			case 422:
				return ErrorType.VALIDATION;
			case 401:
			case 403:
				return ErrorType.PERMISSION;
			case 404:
				return ErrorType.NOT_FOUND;
			case 408:
				return ErrorType.TIMEOUT;
			case 429:
				return ErrorType.RATE_LIMIT;
			case 500:
			case 502:
			case 503:
				return ErrorType.SERVER;
			default:
				return ErrorType.UNKNOWN;
		}
	}

	// Timeout errors
	if (err.name === "AbortError" || err.message?.includes("timeout")) {
		return ErrorType.TIMEOUT;
	}

	return ErrorType.UNKNOWN;
};

/**
 * Gets user-friendly error message
 */
export const getUserErrorMessage = (
	error: AppError | Error | unknown,
): string => {
	if ((error as ExtendedError)?.userMessage)
		return (error as ExtendedError).userMessage;

	const type = classifyError(error);

	switch (type) {
		case ErrorType.NETWORK:
			return "Network connection issue. Please check your internet connection and try again.";
		case ErrorType.VALIDATION:
			return "Invalid input. Please check your data and try again.";
		case ErrorType.PERMISSION:
			return "You don't have permission to perform this action.";
		case ErrorType.NOT_FOUND:
			return "The requested item was not found.";
		case ErrorType.TIMEOUT:
			return "Request timed out. Please try again.";
		case ErrorType.RATE_LIMIT:
			return "Too many requests. Please wait a moment and try again.";
		case ErrorType.SERVER:
			return "Server error. Please try again later.";
		default:
			return (
				(error as ExtendedError)?.message ||
				"An unexpected error occurred. Please try again."
			);
	}
};

/**
 * Comprehensive error handler with logging and user feedback
 */
export const handleError = (
    error: Error | unknown,
    options: ErrorHandlerOptions = {},
): void => {
	const {
		showToast: shouldShowToast = true,
		logToConsole = true,
		logToServer = false,
		retryable = false,
		fallbackMessage = "Something went wrong",
		context = {},
	} = options;

	// Classify error
	const errorType = classifyError(error);
	const appError =
		error instanceof Error
			? error
			: createAppError(
					typeof error === "object" && error !== null && "message" in error
						? String(error.message)
						: String(error),
					errorType,
					{
						details: error,
					},
				);

	// Log to console for debugging
	if (logToConsole) {
		console.error("Application Error:", {
			error: appError,
			type: errorType,
			context,
			timestamp: new Date().toISOString(),
		});
	}

	// Show user-friendly message
	if (shouldShowToast) {
		const message = getUserErrorMessage(appError) || fallbackMessage;
		showToast({
			message,
			type: "error",
			duration: retryable ? 6000 : 4000,
			actionLabel: retryable ? "Retry" : undefined,
			onAction: retryable ? () => window.location.reload() : undefined,
		});
	}

    // Log to server (if enabled)
    if (logToServer) {
        void (async () => {
            try {
                // Feature flags / gating
                const env: any = (import.meta as unknown as { env?: Record<string, any> })?.env || {};
                const enabled = String(env.VITE_LOG_ERRORS_TO_SERVER ?? "1") !== "0";
                const envGate = String(env.VITE_LOG_ERRORS_ENV || "prod"); // 'prod' | 'all'
                const mode = env.MODE || env.NODE_ENV || "development";
                const sampleRate = Number(env.VITE_ERROR_LOG_SAMPLE ?? "1"); // 0..1
                if (!enabled) return;
                if (envGate === "prod" && mode !== "production") return;
                if (!(sampleRate > 0) || Math.random() >= Math.min(1, Math.max(0, sampleRate))) return;
                const { apiAnalyticsLog } = await import("../api");
                // Best-effort dir resolution: prefer explicit context.dir
                let dir = context?.dir || "";
                if (!dir) {
                    try {
						const raw = localStorage.getItem("photo-search-settings");
						if (raw) {
							const js = JSON.parse(raw);
							// zustand persist format: { state: { dir, ... }, version }
							dir = js?.state?.dir || "";
						}
					} catch {}
				}
                if (dir) {
                    const payload = {
                        component: context?.component,
                        action: context?.action,
                        userId: context?.userId,
                        sessionId: context?.sessionId,
                        metadata: context?.metadata || {},
                        type: classifyError(appError),
                        message: (appError as Error)?.message,
                        name: (appError as Error)?.name,
                        stack: (appError as Error)?.stack,
                        timestamp: new Date().toISOString(),
                    };
                    await apiAnalyticsLog(dir, "error", payload as Record<string, unknown>);
                }
            } catch (e) {
                // Fail quiet; never crash calling sites on logging
                console.debug("Server error logging failed", e);
            }
        })();
    }
};

/**
 * Explicit helper to log errors to server analytics from callers wanting control.
 */
export async function logServerError(
	error: unknown,
	context: ErrorContext & { dir?: string },
): Promise<boolean> {
	try {
		const { apiAnalyticsLog } = await import("../api");
		let dir = context?.dir || "";
		if (!dir) return false;
		const base: Record<string, unknown> = {
			component: context?.component,
			action: context?.action,
			metadata: context?.metadata || {},
			timestamp: new Date().toISOString(),
		};
		const e = error as Error;
		if (e && typeof e === "object") {
			base.message = (e as Error).message;
			base.name = (e as Error).name;
			base.stack = (e as Error).stack;
		}
		await apiAnalyticsLog(dir, "error", base);
		return true;
	} catch {
		return false;
	}
}

/**
 * Async operation wrapper with error handling
 */
export const _withErrorHandling = async <T>(
	operation: () => Promise<T>,
	options: ErrorHandlerOptions = {},
): Promise<T | null> => {
	try {
		return await operation();
	} catch (error) {
		handleError(error, options);
		return null;
	}
};

/**
 * Retry utility for failed operations
 */
export const _retryOperation = async <T>(
	operation: () => Promise<T>,
	maxRetries = 3,
	delay = 1000,
	backoff = 1.5,
): Promise<T> => {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt < maxRetries - 1) {
				const waitTime = delay * backoff ** attempt;
				console.warn(
					`Attempt ${attempt + 1} failed, retrying in ${waitTime}ms:`,
					lastError.message,
				);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}
		}
	}

	throw lastError || new Error("All retry attempts failed");
};

/**
 * Error boundary wrapper for React components
 */
export const _withErrorBoundary = <P extends object>(
	Component: React.ComponentType<P>,
	fallback?: React.ComponentType<{ error: Error; reset: () => void }>,
) => {
	return class ErrorBoundaryWrapper extends React.Component<
		P,
		{ hasError: boolean; error: Error | null }
	> {
		constructor(props: P) {
			super(props);
			this.state = { hasError: false, error: null };
		}

		static getDerivedStateFromError(error: Error) {
			return { hasError: true, error };
		}

		componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
			handleError(error, {
				showToast: true,
				logToConsole: true,
				context: {
					component: Component.name || "UnknownComponent",
					metadata: { errorInfo },
				},
			});
		}

		reset = () => {
			this.setState({ hasError: false, error: null });
		};

		render() {
			if (this.state.hasError && this.state.error) {
				if (fallback) {
					const FallbackComponent = fallback;
					return React.createElement(FallbackComponent, {
						error: this.state.error,
						reset: this.reset,
					});
				}
				return React.createElement(
					"div",
					{ className: "error-boundary-fallback" },
					React.createElement("h2", null, "Something went wrong"),
					React.createElement("p", null, getUserErrorMessage(this.state.error)),
					React.createElement(
						"button",
						{ type: "button", onClick: this.reset },
						"Try again",
					),
				);
			}

			return React.createElement(Component, this.props);
		}
	};
};

/**
 * Validation utilities with error handling
 */
export const _validate = {
	required: (value: unknown, fieldName: string): void => {
		if (!value || (typeof value === "string" && !value.trim())) {
			throw createAppError(`${fieldName} is required`, ErrorType.VALIDATION);
		}
	},

	minLength: (value: string, length: number, fieldName: string): void => {
		if (value.length < length) {
			throw createAppError(
				`${fieldName} must be at least ${length} characters`,
				ErrorType.VALIDATION,
			);
		}
	},

	maxLength: (value: string, length: number, fieldName: string): void => {
		if (value.length > length) {
			throw createAppError(
				`${fieldName} must be no more than ${length} characters`,
				ErrorType.VALIDATION,
			);
		}
	},

	pattern: (value: string, pattern: RegExp, fieldName: string): void => {
		if (!pattern.test(value)) {
			throw createAppError(
				`${fieldName} format is invalid`,
				ErrorType.VALIDATION,
			);
		}
	},

	range: (value: number, min: number, max: number, fieldName: string): void => {
		if (value < min || value > max) {
			throw createAppError(
				`${fieldName} must be between ${min} and ${max}`,
				ErrorType.VALIDATION,
			);
		}
	},
};

/**
 * Network error utilities
 */
export const networkErrors = {
	isOffline: (): boolean => {
		return !navigator.onLine;
	},

	handleOffline: (callback?: () => void): void => {
		if (networkErrors.isOffline()) {
			handleError(
				createAppError("You appear to be offline", ErrorType.NETWORK, {
					userMessage: "Please check your internet connection and try again.",
					recoverable: true,
				}),
				{ showToast: true },
			);
			callback?.();
		}
	},

	createTimeout: (ms: number): AbortSignal => {
		const controller = new AbortController();
		setTimeout(() => controller.abort(), ms);
		return controller.signal;
	},
};
