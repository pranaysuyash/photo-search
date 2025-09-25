/**
 * ErrorHandlingDemo - Demonstrates comprehensive error handling with recovery options
 * This component shows how to use the enhanced error handling system in a React application.
 */
import type React from "react";
import { useState } from "react";
import {
  type AppError,
  ErrorBoundary,
  errorFactory,
  errorManager,
  handleGlobalError,
  useErrorHandler,
  useErrorHandling,
  useErrorNotification,
} from "../framework/EnhancedErrorHandling";
import { useError, useErrorNotifications } from "../stores/SimpleStore";

// Demo component for error handling
const ErrorHandlingDemo: React.FC = () => {
  const [errorType, setErrorType] = useState<string>("network");
  const [customMessage, setCustomMessage] = useState<string>(
    "This is a test error"
  );
  const [showDemoError, setShowDemoError] = useState<boolean>(false);
  const [demoError, setDemoError] = useState<AppError | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingResult, setProcessingResult] = useState<string>("");
  const [showNotifications, setShowNotifications] = useState<boolean>(true);

  // Error handling hooks
  const { clearError } = useErrorHandler();
  const { showNotification } = useErrorNotification();
  const {
    setError,
    clearError: clearStoreError,
    addErrorNotification,
    removeErrorNotification,
  } = useErrorHandling();
  const storeError = useError();
  const errorNotifications = useErrorNotifications();

  // Handle error creation
  const createError = async () => {
    setIsProcessing(true);
    setProcessingResult("");

    try {
      let appError: AppError;

      switch (errorType) {
        case "network":
          appError = errorFactory.networkError(customMessage, {
            context: {
              component: "ErrorHandlingDemo",
              action: "createNetworkError",
            },
            severity: "high",
            correlationId: `net-${Date.now()}`,
          });
          break;

        case "validation":
          appError = errorFactory.validationError(customMessage, {
            context: {
              component: "ErrorHandlingDemo",
              field: "testField",
              value: "invalidValue",
            },
            severity: "medium",
            correlationId: `val-${Date.now()}`,
          });
          break;

        case "permission":
          appError = errorFactory.permissionError(customMessage, {
            context: {
              component: "ErrorHandlingDemo",
              resource: "/test/resource",
            },
            severity: "high",
            correlationId: `perm-${Date.now()}`,
          });
          break;

        case "file_system":
          appError = errorFactory.fileSystemError(customMessage, {
            context: { component: "ErrorHandlingDemo", path: "/test/file.txt" },
            severity: "high",
            correlationId: `fs-${Date.now()}`,
          });
          break;

        case "indexing":
          appError = errorFactory.indexingError(customMessage, {
            context: { component: "ErrorHandlingDemo", dir: "/test/photos" },
            severity: "high",
            correlationId: `idx-${Date.now()}`,
          });
          break;

        case "search":
          appError = errorFactory.searchError(customMessage, {
            context: { component: "ErrorHandlingDemo", query: "test query" },
            severity: "medium",
            correlationId: `srch-${Date.now()}`,
          });
          break;

        case "export":
          appError = errorFactory.exportError(customMessage, {
            context: {
              component: "ErrorHandlingDemo",
              destination: "/test/export",
            },
            severity: "high",
            correlationId: `exp-${Date.now()}`,
          });
          break;

        case "resource_limit":
          appError = errorFactory.resourceLimitError(customMessage, {
            context: { component: "ErrorHandlingDemo", resource: "disk_space" },
            severity: "high",
            correlationId: `res-${Date.now()}`,
          });
          break;

        default:
          appError = errorFactory.unknownError(customMessage, {
            context: {
              component: "ErrorHandlingDemo",
              action: "createUnknownError",
            },
            severity: "medium",
            correlationId: `unk-${Date.now()}`,
          });
      }

      // Set error in demo state
      setDemoError(appError);
      setShowDemoError(true);

      // Set error in store
      setError(appError);
      addErrorNotification(appError);

      // Show notification
      showNotification(appError);

      // Log error
      appError.log();

      setProcessingResult(
        `Created ${errorType} error: ${appError.getUserFacingMessage()}`
      );
    } catch (err) {
      const appError = await handleGlobalError(err, {
        component: "ErrorHandlingDemo",
        action: "createError",
      });
      setProcessingResult(
        `Failed to create error: ${appError.getUserFacingMessage()}`
      );
      setError(appError);
      showNotification(appError);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle error resolution
  const resolveError = async (errorToResolve: AppError) => {
    setIsProcessing(true);
    setProcessingResult("");

    try {
      // Simulate error resolution
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clear error states
      clearError();
      clearStoreError();
      setShowDemoError(false);
      setDemoError(null);

      setProcessingResult(
        `Resolved error: ${errorToResolve.getUserFacingMessage()}`
      );
    } catch (err) {
      const appError = await handleGlobalError(err, {
        component: "ErrorHandlingDemo",
        action: "resolveError",
      });
      setProcessingResult(
        `Failed to resolve error: ${appError.getUserFacingMessage()}`
      );
      setError(appError);
      showNotification(appError);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle recovery action
  const handleRecoveryAction = async (
    actionId: string,
    errorToRecover: AppError
  ) => {
    setIsProcessing(true);
    setProcessingResult("");

    try {
      // Find the recovery option
      const recoveryOption = errorToRecover
        .getRecoveryOptions()
        ?.find((opt) => opt.id === actionId);
      if (!recoveryOption) {
        throw new Error(`Recovery option ${actionId} not found`);
      }

      // Execute the recovery action
      await recoveryOption.action();

      setProcessingResult(`Executed recovery action: ${recoveryOption.label}`);

      // Optionally resolve the error after successful recovery
      if (actionId.includes("retry")) {
        await resolveError(errorToRecover);
      }
    } catch (err) {
      const appError = await handleGlobalError(err, {
        component: "ErrorHandlingDemo",
        action: "handleRecoveryAction",
        recoveryActionId: actionId,
      });
      setProcessingResult(
        `Recovery action failed: ${appError.getUserFacingMessage()}`
      );
      setError(appError);
      showNotification(appError);
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear all errors
  const clearAllErrors = () => {
    clearError();
    clearStoreError();
    setShowDemoError(false);
    setDemoError(null);
    setProcessingResult("All errors cleared");
  };

  // Get error statistics
  const errorStatistics = errorManager.getErrorStatistics();
  const commonErrors = errorManager.getCommonErrors(5);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-gray-900">
          Enhanced Error Handling Demo
        </h1>
        <p className="mt-2 text-gray-600">
          Demonstrates comprehensive error handling with recovery options and
          user-facing messages.
        </p>
      </header>

      {/* Error Creation */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Create Error
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="error-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Error Type
            </label>
            <select
              id="error-type"
              value={errorType}
              onChange={(e) => setErrorType(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="network">Network Error</option>
              <option value="validation">Validation Error</option>
              <option value="permission">Permission Error</option>
              <option value="file_system">File System Error</option>
              <option value="indexing">Indexing Error</option>
              <option value="search">Search Error</option>
              <option value="export">Export Error</option>
              <option value="resource_limit">Resource Limit Error</option>
              <option value="unknown">Unknown Error</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="custom-message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Custom Message
            </label>
            <input
              type="text"
              id="custom-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              placeholder="Enter custom error message"
            />
          </div>
        </div>

        <div className="mt-4 flex space-x-3">
          <button
            type="button"
            onClick={createError}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isProcessing ? "Creating..." : "Create Error"}
          </button>

          <button
            type="button"
            onClick={clearAllErrors}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Clear All Errors
          </button>
        </div>
      </section>

      {/* Processing Result */}
      {processingResult && (
        <section
          className={`p-4 rounded-lg ${
            processingResult.includes("Failed") ||
            processingResult.includes("failed")
              ? "bg-red-50 border border-red-200"
              : "bg-green-50 border border-green-200"
          }`}
        >
          <p
            className={`${
              processingResult.includes("Failed") ||
              processingResult.includes("failed")
                ? "text-red-800"
                : "text-green-800"
            }`}
          >
            {processingResult}
          </p>
        </section>
      )}

      {/* Demo Error Display */}
      {showDemoError && demoError && (
        <ErrorBoundary
          fallback={({ error, resetError }) => (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-800">
                Error Boundary Caught Error
              </h3>
              <p className="mt-2 text-red-700">
                {error.getUserFacingMessage()}
              </p>
              <button
                type="button"
                onClick={resetError}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Reset Error
              </button>
            </div>
          )}
        >
          <section className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Demo Error
                </h2>
                <div className="mt-2 flex items-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      demoError.getSeverity() === "low"
                        ? "bg-green-100 text-green-800"
                        : demoError.getSeverity() === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : demoError.getSeverity() === "high"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {demoError.getSeverity().toUpperCase()}
                  </span>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {demoError.getCategory()}
                  </span>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {demoError.code}
                  </span>
                </div>
                <p className="mt-3 text-gray-700">
                  {demoError.getUserFacingMessage()}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Correlation ID: {demoError.correlationId || "N/A"} •
                  Timestamp: {new Date(demoError.timestamp).toLocaleString()}
                </p>

                {demoError.technicalDetails != null && (
                  <details className="mt-3">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      Technical Details
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      {typeof demoError.technicalDetails === "object" &&
                      demoError.technicalDetails !== null
                        ? JSON.stringify(demoError.technicalDetails, null, 2)
                        : String(demoError.technicalDetails)}
                    </pre>
                  </details>
                )}

                {demoError.context && (
                  <details className="mt-2">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      Context
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(demoError.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              <button
                type="button"
                onClick={() => resolveError(demoError)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Resolve Error
              </button>
            </div>

            {(() => {
              const recoveryOptions = demoError.getRecoveryOptions();
              return (
                recoveryOptions &&
                recoveryOptions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Recovery Options
                    </h3>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {recoveryOptions.map((option) => (
                        <div
                          key={option.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {option.label}
                              </h4>
                              {option.description && (
                                <p className="mt-1 text-sm text-gray-500">
                                  {option.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                option.priority >= 5
                                  ? "bg-red-100 text-red-800"
                                  : option.priority >= 4
                                  ? "bg-orange-100 text-orange-800"
                                  : option.priority >= 3
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              P{option.priority}
                            </span>
                          </div>

                          <div className="mt-3 flex justify-between items-center">
                            {option.estimatedTime && (
                              <span className="text-xs text-gray-500">
                                ~{option.estimatedTime}s
                              </span>
                            )}
                            {option.successRate && (
                              <span className="text-xs text-gray-500">
                                {Math.round(option.successRate * 100)}% success
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRecoveryAction(option.id, demoError)
                            }
                            disabled={isProcessing}
                            className="mt-3 w-full px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {isProcessing ? "Executing..." : option.label}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              );
            })()}
          </section>
        </ErrorBoundary>
      )}

      {/* Store Error Display */}
      {storeError && (
        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Store Error
              </h2>
              <div className="mt-2 flex items-center">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    storeError.getSeverity() === "low"
                      ? "bg-green-100 text-green-800"
                      : storeError.getSeverity() === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : storeError.getSeverity() === "high"
                      ? "bg-orange-100 text-orange-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {storeError.getSeverity().toUpperCase()}
                </span>
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {storeError.getCategory()}
                </span>
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {storeError.code}
                </span>
              </div>
              <p className="mt-3 text-gray-700">
                {storeError.getUserFacingMessage()}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Correlation ID: {storeError.correlationId || "N/A"} • Timestamp:{" "}
                {new Date(storeError.timestamp).toLocaleString()}
              </p>
            </div>

            <button
              type="button"
              onClick={clearStoreError}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Clear Error
            </button>
          </div>
        </section>
      )}

      {/* Error Notifications */}
      {showNotifications && errorNotifications.length > 0 && (
        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Error Notifications
            </h2>
            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {errorNotifications.map((notification) => (
              <div
                key={notification.timestamp}
                className={`p-4 rounded-lg border ${
                  notification.getSeverity() === "low"
                    ? "border-green-200 bg-green-50"
                    : notification.getSeverity() === "medium"
                    ? "border-yellow-200 bg-yellow-50"
                    : notification.getSeverity() === "high"
                    ? "border-orange-200 bg-orange-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium text-gray-900">
                        {notification.getCategory()}
                      </h3>
                      <span
                        className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          notification.getSeverity() === "low"
                            ? "bg-green-100 text-green-800"
                            : notification.getSeverity() === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : notification.getSeverity() === "high"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {notification.getSeverity().toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">
                      {notification.getUserFacingMessage()}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeErrorNotification(notification.timestamp)
                    }
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Remove notification"
                  >
                    <svg
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <title>Close notification</title>
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Error Statistics */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Error Statistics
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(errorStatistics).map(([category, stats]) => (
            <div key={category} className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">{category}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
              {stats.lastSeen > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Last: {new Date(stats.lastSeen).toLocaleTimeString()}
                </p>
              )}
            </div>
          ))}
        </div>

        {commonErrors.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Most Common Errors
            </h3>
            <div className="space-y-2">
              {commonErrors.map((error, index) => (
                <div
                  key={`${error.code}-${error.timestamp}`}
                  className="flex items-center p-3 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium text-gray-700 mr-3">
                    #{index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">
                        {error.getCategory()}
                      </span>
                      <span
                        className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          error.getSeverity() === "low"
                            ? "bg-green-100 text-green-800"
                            : error.getSeverity() === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : error.getSeverity() === "high"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {error.getSeverity().toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {error.getUserFacingMessage()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(error.timestamp).toLocaleString()} •{" "}
                      {error.code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Error History */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Error History
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Message
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Severity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Time
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Code
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {errorManager
                .getErrorHistory()
                .slice(0, 10)
                .map((error) => (
                  <tr key={error.timestamp}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {error.getCategory()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {error.getUserFacingMessage()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          error.getSeverity() === "low"
                            ? "bg-green-100 text-green-800"
                            : error.getSeverity() === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : error.getSeverity() === "high"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {error.getSeverity().toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {error.code}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {errorManager.getErrorHistory().length === 0 && (
          <p className="text-gray-500 text-center py-4">No errors in history</p>
        )}
      </section>
    </div>
  );
};

export default ErrorHandlingDemo;
