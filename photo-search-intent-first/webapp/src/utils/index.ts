/**
 * Centralized exports for all utility functions and components
 * This file provides a single entry point for all utilities
 */

// Accessibility utilities
export {
	_isElementInViewport,
	AriaLiveRegion,
	FocusTrap,
	SkipLink,
	useAnnouncer,
	useKeyboardShortcut,
} from "./accessibility";

// Error handling utilities
export {
	_retryOperation,
	_setToastHandler,
	_validate,
	_withErrorBoundary,
	_withErrorHandling,
	classifyError,
	createAppError,
	ErrorType,
	getUserErrorMessage,
	handleError,
	networkErrors,
	showToast,
	type ToastOptions,
} from "./errors";
// Loading utilities
export {
	LoadingOverlay,
	LoadingSpinner,
	ProgressiveLoader,
	ScrollLoader,
	useContentLoading,
	useLoading,
} from "./loading";
// String utilities
export {
	_sanitizeString,
	basename,
	formatCount,
	formatFileSize,
	generateId,
	getFileExtension,
	isImageFile,
	truncateString,
} from "./strings";

// Re-export commonly used types (only export types that are actually exported from their modules)

// Version for tracking utility updates
export const _UTILS_VERSION = "1.0.0";
