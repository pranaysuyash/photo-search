/**
 * EnhancedErrorHandling - Provides comprehensive error handling with recovery options
 * This system enhances error handling with user-friendly messages, recovery suggestions,
 * and advanced error management features.
 */
export interface RecoverableError extends Error {
	code: string;
	recoverable: boolean;
	userFacingMessage: string;
	technicalDetails?: unknown;
	recoveryOptions?: RecoveryOption[];
	context?: Record<string, unknown>;
	severity: ErrorSeverity;
	category: ErrorCategory;
	timestamp: number;
	correlationId?: string;
}

export interface RecoveryOption {
	id: string;
	label: string;
	description?: string;
	action: () => Promise<void>;
	requiresUserInput?: boolean;
	icon?: string;
	priority: number; // 1-5, higher is more important
	estimatedTime?: number; // Estimated time in seconds
	successRate?: number; // Success rate 0-1
}

// Error severity levels
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

// Error categories
export type ErrorCategory =
	| "NETWORK"
	| "VALIDATION"
	| "PERMISSION"
	| "FILE_SYSTEM"
	| "INDEXING"
	| "SEARCH"
	| "EXPORT"
	| "IMPORT"
	| "CONFIGURATION"
	| "AUTHENTICATION"
	| "THIRD_PARTY"
	| "RESOURCE_LIMIT"
	| "APPLICATION_STATE"
	| "USER_ACTION"
	| "DATA_CONSISTENCY"
	| "INTEGRATION"
	| "UNKNOWN";

// Enhanced error class
export class AppError extends Error implements RecoverableError {
	public readonly code: string;
	public readonly recoverable: boolean;
	public readonly userFacingMessage: string;
	public readonly technicalDetails?: unknown;
	public readonly recoveryOptions?: RecoveryOption[];
	public readonly context?: Record<string, unknown>;
	public readonly severity: ErrorSeverity;
	public readonly category: ErrorCategory;
	public readonly timestamp: number;
	public readonly correlationId?: string;

	constructor(
		message: string,
		options: {
			code: string;
			recoverable?: boolean;
			userFacingMessage?: string;
			technicalDetails?: unknown;
			recoveryOptions?: RecoveryOption[];
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			category?: ErrorCategory;
			correlationId?: string;
		},
	) {
		super(message);

		this.name = "AppError";
		this.code = options.code;
		this.recoverable = options.recoverable ?? false;
		this.userFacingMessage = options.userFacingMessage || message;
		this.technicalDetails = options.technicalDetails;
		this.recoveryOptions = options.recoveryOptions;
		this.context = options.context;
		this.severity = options.severity || "medium";
		this.category = options.category || "UNKNOWN";
		this.timestamp = Date.now();
		this.correlationId = options.correlationId;

		// Maintains proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AppError);
		}
	}

	// Convert to plain object for serialization
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			recoverable: this.recoverable,
			userFacingMessage: this.userFacingMessage,
			technicalDetails: this.technicalDetails,
			recoveryOptions: this.recoveryOptions?.map((opt) => ({
				id: opt.id,
				label: opt.label,
				description: opt.description,
				requiresUserInput: opt.requiresUserInput,
				icon: opt.icon,
				priority: opt.priority,
				estimatedTime: opt.estimatedTime,
				successRate: opt.successRate,
			})),
			context: this.context,
			severity: this.severity,
			category: this.category,
			timestamp: this.timestamp,
			correlationId: this.correlationId,
			stack: this.stack,
		};
	}

	// Create a user-friendly error message
	getUserFacingMessage(): string {
		return this.userFacingMessage;
	}

	// Get recovery options
	getRecoveryOptions(): RecoveryOption[] | undefined {
		return this.recoveryOptions;
	}

	// Get error severity
	getSeverity(): ErrorSeverity {
		return this.severity;
	}

	// Get error category
	getCategory(): ErrorCategory {
		return this.category;
	}

	// Log error with context
	log(context?: Record<string, unknown>): void {
		const logContext = {
			...this.context,
			...context,
			timestamp: new Date(this.timestamp).toISOString(),
			category: this.category,
			severity: this.severity,
			correlationId: this.correlationId,
		};

		console.error(
			`[${this.category}] ${this.code}: ${this.message}`,
			logContext,
		);

		// In development, also log the stack trace
		if (process.env.NODE_ENV === "development" && this.stack) {
			console.error("Stack trace:", this.stack);
		}
	}

	// Create a clone with updated context
	withContext(context: Record<string, unknown>): AppError {
		return new AppError(this.message, {
			code: this.code,
			recoverable: this.recoverable,
			userFacingMessage: this.userFacingMessage,
			technicalDetails: this.technicalDetails,
			recoveryOptions: this.recoveryOptions,
			context: { ...this.context, ...context },
			severity: this.severity,
			category: this.category,
			correlationId: this.correlationId,
		});
	}
}

// Error factory functions with enhanced options
export const errorFactory = {
	// Network errors
	networkError: (
		message: string,
		options?: {
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			correlationId?: string;
		},
	): AppError =>
		new AppError(message, {
			code: "NETWORK_ERROR",
			recoverable: true,
			userFacingMessage:
				"Network connection failed. Please check your internet connection.",
			category: "NETWORK",
			context: options?.context,
			severity: options?.severity || "high",
			correlationId: options?.correlationId,
			recoveryOptions: [
				{
					id: "retry_network",
					label: "Retry Connection",
					description: "Attempt to reconnect to the network",
					action: async () => {
						// Implementation would retry the network operation
						console.log("Retrying network connection...");
					},
					priority: 5,
					estimatedTime: 5,
					successRate: 0.8,
				},
				{
					id: "check_settings",
					label: "Check Settings",
					description: "Verify network and proxy settings",
					action: async () => {
						// Implementation would open settings panel
						console.log("Opening network settings...");
					},
					priority: 3,
					estimatedTime: 30,
					successRate: 0.6,
				},
			],
		}),

	// Validation errors
	validationError: (
		message: string,
		options?: {
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			correlationId?: string;
		},
	): AppError =>
		new AppError(message, {
			code: "VALIDATION_ERROR",
			recoverable: false,
			userFacingMessage:
				"Invalid input provided. Please check your entries and try again.",
			category: "VALIDATION",
			context: options?.context,
			severity: options?.severity || "medium",
			correlationId: options?.correlationId,
		}),

	// Permission errors
	permissionError: (
		message: string,
		options?: {
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			correlationId?: string;
		},
	): AppError =>
		new AppError(message, {
			code: "PERMISSION_ERROR",
			recoverable: true,
			userFacingMessage:
				"Access denied. Please check your permissions and try again.",
			category: "PERMISSION",
			context: options?.context,
			severity: options?.severity || "high",
			correlationId: options?.correlationId,
			recoveryOptions: [
				{
					id: "request_permission",
					label: "Request Permission",
					description: "Ask for the required permissions",
					action: async () => {
						// Implementation would request permissions
						console.log("Requesting permissions...");
					},
					priority: 5,
					estimatedTime: 2,
					successRate: 0.9,
				},
				{
					id: "check_admin",
					label: "Check Admin Rights",
					description: "Verify administrator privileges",
					action: async () => {
						// Implementation would check admin rights
						console.log("Checking administrator rights...");
					},
					priority: 4,
					estimatedTime: 10,
					successRate: 0.7,
				},
			],
		}),

	// File system errors
	fileSystemError: (
		message: string,
		options?: {
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			correlationId?: string;
		},
	): AppError =>
		new AppError(message, {
			code: "FILE_SYSTEM_ERROR",
			recoverable: true,
			userFacingMessage:
				"File system error occurred. Please check the file path and permissions.",
			category: "FILE_SYSTEM",
			context: options?.context,
			severity: options?.severity || "high",
			correlationId: options?.correlationId,
			recoveryOptions: [
				{
					id: "retry_operation",
					label: "Retry Operation",
					description: "Attempt the file operation again",
					action: async () => {
						// Implementation would retry the file operation
						console.log("Retrying file operation...");
					},
					priority: 5,
					estimatedTime: 3,
					successRate: 0.7,
				},
				{
					id: "check_disk_space",
					label: "Check Disk Space",
					description: "Verify sufficient disk space is available",
					action: async () => {
						// Implementation would check disk space
						console.log("Checking disk space...");
					},
					priority: 4,
					estimatedTime: 5,
					successRate: 0.8,
				},
				{
					id: "repair_permissions",
					label: "Repair Permissions",
					description: "Fix file or folder permissions",
					action: async () => {
						// Implementation would repair permissions
						console.log("Repairing permissions...");
					},
					priority: 3,
					estimatedTime: 30,
					successRate: 0.6,
				},
			],
		}),

	// Indexing errors
	indexingError: (
		message: string,
		options?: {
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			correlationId?: string;
		},
	): AppError =>
		new AppError(message, {
			code: "INDEXING_ERROR",
			recoverable: true,
			userFacingMessage:
				"Failed to index photos. Please try again or rebuild the index.",
			category: "INDEXING",
			context: options?.context,
			severity: options?.severity || "high",
			correlationId: options?.correlationId,
			recoveryOptions: [
				{
					id: "retry_indexing",
					label: "Retry Indexing",
					description: "Attempt to index the photos again",
					action: async () => {
						// Implementation would retry indexing
						console.log("Retrying indexing...");
					},
					priority: 5,
					estimatedTime: 60,
					successRate: 0.8,
				},
				{
					id: "rebuild_index",
					label: "Rebuild Index",
					description: "Create a fresh index from scratch",
					action: async () => {
						// Implementation would rebuild the index
						console.log("Rebuilding index...");
					},
					priority: 4,
					estimatedTime: 300,
					successRate: 0.95,
				},
				{
					id: "clear_cache",
					label: "Clear Cache",
					description: "Clear indexing cache and try again",
					action: async () => {
						// Implementation would clear cache
						console.log("Clearing cache...");
					},
					priority: 3,
					estimatedTime: 10,
					successRate: 0.7,
				},
			],
		}),

	// Search errors
	searchError: (
		message: string,
		options?: {
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			correlationId?: string;
		},
	): AppError =>
		new AppError(message, {
			code: "SEARCH_ERROR",
			recoverable: true,
			userFacingMessage:
				"Search failed. Please try a different query or check your connection.",
			category: "SEARCH",
			context: options?.context,
			severity: options?.severity || "medium",
			correlationId: options?.correlationId,
			recoveryOptions: [
				{
					id: "retry_search",
					label: "Retry Search",
					description: "Attempt the search again",
					action: async () => {
						// Implementation would retry the search
						console.log("Retrying search...");
					},
					priority: 5,
					estimatedTime: 5,
					successRate: 0.8,
				},
				{
					id: "simplify_query",
					label: "Simplify Query",
					description: "Try a simpler search term",
					action: async () => {
						// Implementation would suggest simpler terms
						console.log("Suggesting simpler query...");
					},
					priority: 4,
					estimatedTime: 2,
					successRate: 0.9,
				},
				{
					id: "check_connection",
					label: "Check Connection",
					description: "Verify internet connection",
					action: async () => {
						// Implementation would check connection
						console.log("Checking connection...");
					},
					priority: 3,
					estimatedTime: 5,
					successRate: 0.8,
				},
			],
		}),

	// Export errors
	exportError: (
		message: string,
		options?: {
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			correlationId?: string;
		},
	): AppError =>
		new AppError(message, {
			code: "EXPORT_ERROR",
			recoverable: true,
			userFacingMessage:
				"Export failed. Please check the destination and try again.",
			category: "EXPORT",
			context: options?.context,
			severity: options?.severity || "high",
			correlationId: options?.correlationId,
			recoveryOptions: [
				{
					id: "retry_export",
					label: "Retry Export",
					description: "Attempt the export again",
					action: async () => {
						// Implementation would retry the export
						console.log("Retrying export...");
					},
					priority: 5,
					estimatedTime: 30,
					successRate: 0.8,
				},
				{
					id: "change_destination",
					label: "Change Destination",
					description: "Select a different export location",
					action: async () => {
						// Implementation would open destination selector
						console.log("Changing destination...");
					},
					priority: 4,
					estimatedTime: 10,
					successRate: 0.95,
				},
				{
					id: "check_permissions",
					label: "Check Permissions",
					description: "Verify write permissions for destination",
					action: async () => {
						// Implementation would check permissions
						console.log("Checking permissions...");
					},
					priority: 3,
					estimatedTime: 5,
					successRate: 0.8,
				},
			],
		}),

	// Resource limit errors
	resourceLimitError: (
		message: string,
		options?: {
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			correlationId?: string;
		},
	): AppError =>
		new AppError(message, {
			code: "RESOURCE_LIMIT_ERROR",
			recoverable: true,
			userFacingMessage:
				"Resource limit exceeded. Please free up space or upgrade your plan.",
			category: "RESOURCE_LIMIT",
			context: options?.context,
			severity: options?.severity || "high",
			correlationId: options?.correlationId,
			recoveryOptions: [
				{
					id: "free_space",
					label: "Free Up Space",
					description: "Delete unnecessary files to free space",
					action: async () => {
						// Implementation would open cleanup tool
						console.log("Opening cleanup tool...");
					},
					priority: 5,
					estimatedTime: 60,
					successRate: 0.9,
				},
				{
					id: "upgrade_plan",
					label: "Upgrade Plan",
					description: "Increase storage or processing limits",
					action: async () => {
						// Implementation would open upgrade page
						console.log("Opening upgrade page...");
					},
					priority: 4,
					estimatedTime: 30,
					successRate: 0.95,
				},
			],
		}),

	// Unknown errors
	unknownError: (
		message: string,
		options?: {
			context?: Record<string, unknown>;
			severity?: ErrorSeverity;
			correlationId?: string;
		},
	): AppError =>
		new AppError(message, {
			code: "UNKNOWN_ERROR",
			recoverable: true,
			userFacingMessage:
				"An unexpected error occurred. Please try again later.",
			category: "UNKNOWN",
			context: options?.context,
			severity: options?.severity || "medium",
			correlationId: options?.correlationId,
			recoveryOptions: [
				{
					id: "retry_action",
					label: "Retry Action",
					description: "Attempt the action again",
					action: async () => {
						// Implementation would retry the action
						console.log("Retrying action...");
					},
					priority: 5,
					estimatedTime: 5,
					successRate: 0.7,
				},
				{
					id: "report_issue",
					label: "Report Issue",
					description: "Send error details to support team",
					action: async () => {
						// Implementation would open feedback form
						console.log("Reporting issue...");
					},
					priority: 4,
					estimatedTime: 30,
					successRate: 0.95,
				},
			],
		}),
};

// Error handler interface
export interface ErrorHandler {
	handle: (
		error: unknown,
		context?: Record<string, unknown>,
	) => Promise<AppError>;
	canHandle: (error: unknown) => boolean;
	getRecoveryOptions: (error: AppError) => RecoveryOption[];
}

// Error manager for centralized error handling
export class ErrorManager {
	private handlers: ErrorHandler[] = [];
	private errorHistory: AppError[] = [];
	private maxHistorySize: number = 100;

	// Register an error handler
	registerHandler(handler: ErrorHandler): void {
		this.handlers.push(handler);
	}

	// Handle an error with registered handlers
	async handle(
		error: unknown,
		context?: Record<string, unknown>,
	): Promise<AppError> {
		// Try each registered handler
		for (const handler of this.handlers) {
			if (handler.canHandle(error)) {
				return await handler.handle(error, context);
			}
		}

		// If it's already an AppError, return it
		if (error instanceof AppError) {
			this.addToHistory(error);
			return error;
		}

		// Convert unknown error to AppError
		const message = error instanceof Error ? error.message : String(error);
		const appError = errorFactory.unknownError(message, context);
		this.addToHistory(appError);
		return appError;
	}

	// Add error to history
	private addToHistory(error: AppError): void {
		this.errorHistory.unshift(error);
		if (this.errorHistory.length > this.maxHistorySize) {
			this.errorHistory.pop();
		}
	}

	// Get error history
	getErrorHistory(): AppError[] {
		return [...this.errorHistory];
	}

	// Clear error history
	clearErrorHistory(): void {
		this.errorHistory = [];
	}

	// Get error statistics
	getErrorStatistics(): Record<
		ErrorCategory,
		{ count: number; lastSeen: number }
	> {
		const stats: Record<ErrorCategory, { count: number; lastSeen: number }> = {
			NETWORK: { count: 0, lastSeen: 0 },
			VALIDATION: { count: 0, lastSeen: 0 },
			PERMISSION: { count: 0, lastSeen: 0 },
			FILE_SYSTEM: { count: 0, lastSeen: 0 },
			INDEXING: { count: 0, lastSeen: 0 },
			SEARCH: { count: 0, lastSeen: 0 },
			EXPORT: { count: 0, lastSeen: 0 },
			IMPORT: { count: 0, lastSeen: 0 },
			CONFIGURATION: { count: 0, lastSeen: 0 },
			AUTHENTICATION: { count: 0, lastSeen: 0 },
			THIRD_PARTY: { count: 0, lastSeen: 0 },
			RESOURCE_LIMIT: { count: 0, lastSeen: 0 },
			APPLICATION_STATE: { count: 0, lastSeen: 0 },
			USER_ACTION: { count: 0, lastSeen: 0 },
			DATA_CONSISTENCY: { count: 0, lastSeen: 0 },
			INTEGRATION: { count: 0, lastSeen: 0 },
			UNKNOWN: { count: 0, lastSeen: 0 },
		};

		this.errorHistory.forEach((error) => {
			const category = error.getCategory();
			stats[category].count++;
			stats[category].lastSeen = Math.max(
				stats[category].lastSeen,
				error.timestamp,
			);
		});

		return stats;
	}

	// Get most common errors
	getCommonErrors(limit: number = 10): AppError[] {
		const errorCounts: Record<string, { count: number; error: AppError }> = {};

		this.errorHistory.forEach((error) => {
			const key = `${error.category}:${error.code}`;
			if (!errorCounts[key]) {
				errorCounts[key] = { count: 1, error };
			} else {
				errorCounts[key].count++;
			}
		});

		return Object.values(errorCounts)
			.sort((a, b) => b.count - a.count)
			.slice(0, limit)
			.map((item) => item.error);
	}
}

// Global error manager instance
export const errorManager = new ErrorManager();

// Global error handler registry
const errorHandlers: ErrorHandler[] = [];

// Register an error handler
export function registerErrorHandler(handler: ErrorHandler): void {
	errorHandlers.push(handler);
	errorManager.registerHandler(handler);
}

// Handle an error with registered handlers
export async function handleGlobalError(
	error: unknown,
	context?: Record<string, unknown>,
): Promise<AppError> {
	return await errorManager.handle(error, context);
}

// Default error handler
const defaultErrorHandler: ErrorHandler = {
	canHandle: (): boolean => true,

	handle: async (
		error: unknown,
		context?: Record<string, unknown>,
	): Promise<AppError> => {
		if (error instanceof AppError) {
			return error;
		}

		const message = error instanceof Error ? error.message : String(error);
		return errorFactory.unknownError(message, context);
	},

	getRecoveryOptions: (error: AppError): RecoveryOption[] => {
		const options: RecoveryOption[] = [];

		// Add retry option for recoverable errors
		if (error.recoverable) {
			options.push({
				id: "generic_retry",
				label: "Retry",
				description: "Attempt the action again",
				action: async () => {
					// This would typically re-execute the failed action
					console.log("Retrying action...");
				},
				priority: 5,
				estimatedTime: 5,
				successRate: 0.7,
			});
		}

		// Add report option for all errors
		options.push({
			id: "report_issue",
			label: "Report Issue",
			description: "Send error details to support team",
			action: async () => {
				// This would typically open a feedback form or send to support
				console.log("Reporting issue...", error.toJSON());
			},
			priority: 4,
			estimatedTime: 30,
			successRate: 0.95,
		});

		return options;
	},
};

// Register default handler
registerErrorHandler(defaultErrorHandler);

// Error boundary component for React
import React from "react";

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{ error: AppError; resetError: () => void }>;
	onError?: (error: AppError) => void;
}

interface ErrorBoundaryState {
	error: AppError | null;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
		return {
			error:
				error instanceof AppError
					? error
					: errorFactory.unknownError(
							error instanceof Error ? error.message : String(error),
						),
		};
	}

	componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
		const appError =
			error instanceof AppError
				? error
				: errorFactory.unknownError(
						error instanceof Error ? error.message : String(error),
						{ componentStack: errorInfo.componentStack },
					);

		// Log the error
		appError.log();

		// Add to error manager history
		errorManager.addToHistory(appError);

		// Call onError callback if provided
		if (this.props.onError) {
			this.props.onError(appError);
		}
	}

	resetError = (): void => {
		this.setState({ error: null });
	};

	render(): React.ReactNode {
		if (this.state.error) {
			if (this.props.fallback) {
				const FallbackComponent = this.props.fallback;
				return (
					<FallbackComponent
						error={this.state.error}
						resetError={this.resetError}
					/>
				);
			}

			// Default error display
			return (
				<div className="error-boundary p-6 bg-red-50 border border-red-200 rounded-lg">
					<h2 className="text-xl font-bold text-red-800 mb-2">
						Something went wrong
					</h2>
					<p className="text-red-700 mb-4">
						{this.state.error.getUserFacingMessage()}
					</p>

					{this.state.error.getRecoveryOptions() &&
						this.state.error.getRecoveryOptions()!.length > 0 && (
							<div className="mb-4">
								<h3 className="font-medium text-gray-700 mb-2">
									Suggested actions:
								</h3>
								<div className="flex flex-wrap gap-2">
									{this.state.error.getRecoveryOptions()!.map((option) => (
										<button
											type="button"
											key={option.id}
											onClick={option.action}
											className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
										>
											{option.label}
										</button>
									))}
								</div>
							</div>
						)}

					<button
						type="button"
						onClick={this.resetError}
						className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
					>
						Try Again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

// Hook for handling errors in functional components
export function useErrorHandler() {
	const [error, setError] = React.useState<AppError | null>(null);

	const handleError = React.useCallback(
		(error: unknown, context?: Record<string, unknown>) => {
			handleGlobalError(error, context).then(setError);
		},
		[],
	);

	const clearError = React.useCallback(() => {
		setError(null);
	}, []);

	return { error, handleError, clearError };
}

// Hook for showing error notifications
export function useErrorNotification() {
	const [notifications, setNotifications] = React.useState<AppError[]>([]);

	const showNotification = React.useCallback((error: AppError) => {
		setNotifications((prev) => [...prev, error]);

		// Auto-remove notification after 5 seconds
		setTimeout(() => {
			setNotifications((prev) =>
				prev.filter((n) => n.timestamp !== error.timestamp),
			);
		}, 5000);
	}, []);

	const removeNotification = React.useCallback((timestamp: number) => {
		setNotifications((prev) => prev.filter((n) => n.timestamp !== timestamp));
	}, []);

	return { notifications, showNotification, removeNotification };
}
