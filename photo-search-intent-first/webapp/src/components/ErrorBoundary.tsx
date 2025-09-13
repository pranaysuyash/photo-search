import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface WindowWithErrorService extends Window {
	logErrorToService?: (data: {
		error: string;
		errorInfo: string;
		timestamp: string;
	}) => void;
}

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
	errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			errorCount: 0,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		this.setState((prevState) => ({
			errorInfo,
			errorCount: prevState.errorCount + 1,
		}));

		// Call optional error handler
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}

		// Log to external service if needed
		const windowWithService = window as WindowWithErrorService;
		if (typeof window !== "undefined" && windowWithService.logErrorToService) {
			windowWithService.logErrorToService({
				error: error.toString(),
				errorInfo: errorInfo.componentStack,
				timestamp: new Date().toISOString(),
			});
		}

		// Announce a global-error so other systems (e.g., modal manager) can recover/close overlays
		try {
			window.dispatchEvent(new CustomEvent("global-error"));
		} catch {}
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	handleReload = () => {
		window.location.reload();
	};

	handleGoHome = () => {
		try {
			window.location.hash = "#/";
		} catch {
			window.location.href = "/";
		}
	};

	render() {
		if (this.state.hasError) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return <>{this.props.fallback}</>;
			}

			// Default error UI
			return (
				<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
					<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
						<div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
							<AlertTriangle className="w-6 h-6 text-red-600" />
						</div>

						<h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
							Oops! Something unexpected happened
						</h2>

						<p className="text-sm text-gray-600 text-center mb-4">
							Don't worry - your photos are safe. Let's get you back on track.
						</p>

						{/* Error details (only in development) */}
						{process.env.NODE_ENV === "development" && this.state.error && (
							<details className="mb-4">
								<summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
									Error details
								</summary>
								<div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto">
									<div className="text-red-600 mb-2">
										{this.state.error.toString()}
									</div>
									{this.state.errorInfo && (
										<pre className="text-gray-600 whitespace-pre-wrap">
											{this.state.errorInfo.componentStack}
										</pre>
									)}
								</div>
							</details>
						)}

						<div className="flex flex-col gap-2">
							<button
								type="button"
								onClick={this.handleReset}
								className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								<RefreshCw className="w-4 h-4" />
								Try again
							</button>

							<button
								type="button"
								onClick={this.handleReload}
								className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								Reload page
							</button>

							<button
								type="button"
								onClick={this.handleGoHome}
								className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
							>
								<Home className="w-4 h-4" />
								Go to home
							</button>
						</div>

						{this.state.errorCount > 2 && (
							<p className="mt-4 text-xs text-center text-gray-500">
								Having trouble? A quick refresh usually helps.
							</p>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

// Specialized error boundary for specific sections
export class SectionErrorBoundary extends Component<
	Props & { sectionName?: string },
	State
> {
	constructor(props: Props & { sectionName?: string }) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			errorCount: 0,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error(`Error in ${this.props.sectionName || "section"}:`, error);
		this.setState({ errorInfo });
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-start gap-3">
						<AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
						<div className="flex-1">
							<p className="text-sm font-medium text-red-900">
								Couldn't load {this.props.sectionName || "this section"}
							</p>
							<p className="text-sm text-red-700 mt-1">
								{this.state.error?.message ||
									"Something went wrong, but we can fix it"}
							</p>
							<button
								type="button"
								onClick={this.handleReset}
								className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
							>
								Try again
							</button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
