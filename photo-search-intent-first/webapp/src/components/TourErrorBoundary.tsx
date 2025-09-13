// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import type React from "react";
import {
	Component,
	type ErrorInfo,
	type ReactNode,
	useEffect,
	useState,
} from "react";

interface TourErrorBoundaryProps {
	children: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
	fallback?: ReactNode;
}

interface TourErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

export class TourErrorBoundary extends Component<
	TourErrorBoundaryProps,
	TourErrorBoundaryState
> {
	constructor(props: TourErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): TourErrorBoundaryState {
		return {
			hasError: true,
			error,
			errorInfo: null,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("Tour Error Boundary caught an error:", error, errorInfo);

		this.setState({
			error,
			errorInfo,
		});

		// Log to external service if needed
		this.props.onError?.(error, errorInfo);
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	handleSkipTour = () => {
		// Dispatch custom event to skip tour
		window.dispatchEvent(new CustomEvent("tour-error-skip"));
		this.handleReset();
	};

	render() {
		if (this.state.hasError && this.state.error) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<AnimatePresence>
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.9 }}
						className="fixed inset-0 z-[1003] flex items-center justify-center p-4"
					>
						<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full">
							{/* Header */}
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
										<AlertCircle className="w-5 h-5 text-white" />
									</div>
									<div>
										<h3 className="font-semibold text-gray-900 dark:text-white">
											Tour Error
										</h3>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Something went wrong with the tour
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={this.handleSkipTour}
									className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
									aria-label="Close"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Error Details */}
							<div className="space-y-4">
								<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
									<p className="text-sm text-red-800 dark:text-red-200">
										<strong>Error:</strong> {this.state.error.message}
									</p>
									{this.state.errorInfo?.componentStack && (
										<details className="mt-2">
											<summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
												View technical details
											</summary>
											<pre className="text-xs text-red-600 dark:text-red-400 mt-2 overflow-auto max-h-32">
												{this.state.errorInfo.componentStack}
											</pre>
										</details>
									)}
								</div>

								<div className="text-sm text-gray-600 dark:text-gray-400">
									<p>This could happen if:</p>
									<ul className="list-disc list-inside mt-2 space-y-1">
										<li>A tour target element is missing from the page</li>
										<li>The page structure has changed</li>
										<li>There's a network or loading issue</li>
									</ul>
								</div>
							</div>

							{/* Actions */}
							<div className="flex items-center justify-end gap-3 mt-6">
								<button
									type="button"
									onClick={this.handleSkipTour}
									className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
								>
									Skip Tour
								</button>
								<button
									type="button"
									onClick={this.handleReset}
									className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
								>
									<RefreshCw className="w-4 h-4" />
									Try Again
								</button>
							</div>
						</div>
					</motion.div>
				</AnimatePresence>
			);
		}

		return this.props.children;
	}
}

// Utility hook for tour error handling
export const _useTourErrorHandler = () => {
	const handleTourError = (error: Error, errorInfo: ErrorInfo) => {
		console.error("Tour error occurred:", error, errorInfo);

		// Log to analytics if available
		if ((window as unknown).gtag) {
			(window as unknown).gtag("event", "tour_error", {
				error_message: error.message,
				error_stack: error.stack,
			});
		}
	};

	return { handleTourError };
};

// Wrapper component for safer tour elements
export const SafeTourElement: React.FC<{
	children: ReactNode;
	fallback?: ReactNode;
	onError?: () => void;
}> = ({ children, fallback, onError }) => {
	const [hasError, setHasError] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional dependency exclusion
	useEffect(() => {
		if (hasError) {
			onError?.();
		}
	}, [hasError, onError]);

	if (hasError) {
		return fallback ? (
			fallback
		) : (
			<div className="text-sm text-gray-500 dark:text-gray-400">
				Tour element unavailable
			</div>
		);
	}

	try {
		return <>{children}</>;
	} catch (error) {
		console.error("SafeTourElement caught error:", error);
		setHasError(true);
		return null;
	}
};
