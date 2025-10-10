import { useUIStore } from "@/store/uiStore";

/**
 * Error types for categorization
 */
export enum ErrorType {
  NETWORK = "network",
  VALIDATION = "validation",
  AUTH = "auth",
  SYSTEM = "system",
  UNKNOWN = "unknown",
}

/**
 * Error handling options
 */
export interface ErrorHandlerOptions {
  /** Show toast notification to user */
  showToast?: boolean;
  /** Custom toast message (overrides default) */
  toastMessage?: string;
  /** Log to console */
  logToConsole?: boolean;
  /** Send to telemetry service */
  sendToTelemetry?: boolean;
  /** Additional context for logging */
  context?: Record<string, unknown>;
}

/**
 * Categorize error by type
 */
export function categorizeError(error: unknown): ErrorType {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return ErrorType.NETWORK;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("connection")) {
      return ErrorType.NETWORK;
    }

    if (message.includes("validation") || message.includes("invalid")) {
      return ErrorType.VALIDATION;
    }

    if (message.includes("unauthorized") || message.includes("auth")) {
      return ErrorType.AUTH;
    }

    if (message.includes("system") || message.includes("internal")) {
      return ErrorType.SYSTEM;
    }
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown, type: ErrorType): string {
  // Custom error messages
  if (error instanceof Error && error.message) {
    // Check for specific error patterns
    if (error.message.includes("Failed to fetch")) {
      return "Unable to connect to the server. Please check your connection.";
    }

    if (
      error.message.includes("401") ||
      error.message.includes("Unauthorized")
    ) {
      return "You are not authorized to perform this action. Please log in.";
    }

    if (error.message.includes("404")) {
      return "The requested resource was not found.";
    }

    if (error.message.includes("500")) {
      return "A server error occurred. Please try again later.";
    }
  }

  // Fallback messages by type
  switch (type) {
    case ErrorType.NETWORK:
      return "Network error. Please check your internet connection.";
    case ErrorType.VALIDATION:
      return "Invalid input. Please check your data and try again.";
    case ErrorType.AUTH:
      return "Authentication failed. Please log in again.";
    case ErrorType.SYSTEM:
      return "A system error occurred. Please try again.";
    case ErrorType.UNKNOWN:
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

/**
 * Handle error with logging and user notification
 *
 * Usage:
 * ```ts
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   handleError(error, {
 *     showToast: true,
 *     context: { component: 'PhotoGrid', action: 'loadPhotos' }
 *   });
 * }
 * ```
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): void {
  const {
    showToast = true,
    toastMessage,
    logToConsole = true,
    sendToTelemetry = false,
    context = {},
  } = options;

  // Categorize error
  const errorType = categorizeError(error);
  const message = toastMessage || getErrorMessage(error, errorType);

  // Log to console
  if (logToConsole) {
    console.error("[Error Handler]", {
      type: errorType,
      error,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  // Show toast notification
  if (showToast) {
    const { addToast } = useUIStore.getState();
    addToast({
      type: "error",
      title: "Error",
      message,
      duration: 5000,
    });
  }

  // Send to telemetry service
  if (sendToTelemetry) {
    // TODO: Implement telemetry integration
    logErrorToTelemetry(error, errorType, context);
  }
}

/**
 * Log error to telemetry service
 * @internal
 */
function logErrorToTelemetry(
  error: unknown,
  type: ErrorType,
  context: Record<string, unknown>
): void {
  // TODO: Integrate with telemetry service (e.g., Sentry, LogRocket)
  console.info("[Telemetry] Would send error:", { error, type, context });
}

/**
 * Extract error message from unknown error type
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "An unknown error occurred";
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return categorizeError(error) === ErrorType.NETWORK;
}

/**
 * Check if error is an auth error
 */
export function isAuthError(error: unknown): boolean {
  return categorizeError(error) === ErrorType.AUTH;
}

/**
 * Create a typed error with additional context
 */
export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Retry a failed operation with exponential backoff
 *
 * Usage:
 * ```ts
 * const result = await retryOperation(
 *   () => fetchData(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (onRetry) {
          onRetry(attempt + 1, error);
        }
      }
    }
  }

  throw lastError;
}
