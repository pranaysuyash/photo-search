import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * Features:
 * - Catches rendering errors in child components
 * - Shows user-friendly error message
 * - Displays stack trace in development mode
 * - Provides reset functionality
 * - Logs errors to console (future: telemetry integration)
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send to telemetry service
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = (): void => {
    window.location.href = "/";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-card border border-border rounded-lg shadow-lg p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-12 h-12 text-destructive" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Something went wrong
                </h1>
                <p className="text-muted-foreground mb-6">
                  We're sorry, but something unexpected happened. You can try
                  refreshing the page or going back to the home screen.
                </p>

                {/* Error details in development mode */}
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="mb-6 p-4 bg-muted rounded-md">
                    <h2 className="text-sm font-semibold text-foreground mb-2">
                      Error Details (Development Mode)
                    </h2>
                    <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
                      {this.state.error.toString()}
                    </pre>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="text-xs font-medium text-foreground cursor-pointer hover:text-primary">
                          Component Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={this.handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={this.handleGoHome}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
