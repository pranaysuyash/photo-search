import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/shadcn/Button";
import { handleError } from "../utils/errors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the error reporting service
    handleError(error, {
      logToServer: true,
      context: {
        component: this.props.componentName || "ErrorBoundary",
        action: "component_error",
      },
      fallbackMessage: "An unexpected error occurred",
    });

    // Store error info in state
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // If a fallback UI is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold text-red-800 mb-2">
            Oops! Something unexpected happened.
          </h2>
          <p className="text-red-600 mb-4">An unexpected error occurred.</p>
          {this.state.error && (
            <details className="w-full max-w-md bg-white p-4 rounded border text-sm text-gray-700 mb-4">
              <summary className="font-medium cursor-pointer mb-2">
                Error details
              </summary>
              <pre className="whitespace-pre-wrap overflow-x-auto">
                {this.state.error.toString()}
              </pre>
              {this.state.errorInfo?.componentStack && (
                <pre className="mt-2 whitespace-pre-wrap overflow-x-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} variant="default">
              Reload page
            </Button>
            <Button
              onClick={() => this.setState({ hasError: false })}
              variant="outline"
            >
              Try again
            </Button>
            <Button
              onClick={() => window.location.assign("/")}
              variant="secondary"
            >
              Go to home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
