/**
 * OfflineActionQueueDemo - Demonstrates offline-first action queuing and sync
 * This component shows how to use the offline action queue system.
 */
import type React from "react";
import { useEffect, useState } from "react";
import type {
  OfflineActionStatus,
  OfflineActionType,
  OfflineAction,
} from "../framework/OfflineActionQueue";
import {
  useActionError,
  useActionMonitor,
  useActionProgress,
  useActionStatus,
  useOfflineActionQueue,
} from "../hooks/useOfflineActionQueue";

// Demo component for offline action queue
const OfflineActionQueueDemo: React.FC = () => {
  const {
    queue,
    isOnline,
    statistics,
    createAction,
    getActions,
    getActionById,
    updateActionStatus,
    cancelAction,
    retryAction,
    clearCompleted,
    clearFailed,
    sync,
    addProcessor,
    removeProcessor,
    addNetworkChangeListener,
    removeNetworkChangeListener,
  } = useOfflineActionQueue();

  const [newActionType, setNewActionType] =
    useState<OfflineActionType>("SEARCH");
  const [newActionPayload, setNewActionPayload] = useState<
    Record<string, unknown>
  >({});
  const [newActionPriority, setNewActionPriority] = useState<
    "LOW" | "NORMAL" | "HIGH" | "CRITICAL"
  >("NORMAL");
  const [selectedActionId, setSelectedActionId] = useState<string>("");
  const [actionResult, setActionResult] = useState<string>("");
  const [showDetailedView, setShowDetailedView] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<OfflineActionType | "ALL">(
    "ALL"
  );
  const [filterStatus, setFilterStatus] = useState<OfflineActionStatus | "ALL">(
    "ALL"
  );

  // Monitor specific actions
  const monitoredActions = useActionMonitor(
    ["SEARCH", "INDEX", "TAG"],
    ["QUEUED", "PROCESSING"]
  );

  // Get filtered actions
  const filteredActions = getActions(
    filterType !== "ALL" || filterStatus !== "ALL"
      ? {
          type: filterType !== "ALL" ? filterType : undefined,
          status: filterStatus !== "ALL" ? filterStatus : undefined,
        }
      : undefined
  );

  // Add sample processors
  useEffect(() => {
    const searchProcessor = async (action: OfflineAction) => {
      console.log("Processing search action:", action);
      // Simulate search processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate occasional error
      if (Math.random() < 0.3) {
        throw new Error("Simulated search error");
      }

      console.log("Search action completed");
    };

    const indexProcessor = async (action: OfflineAction) => {
      console.log("Processing index action:", action);
      // Simulate indexing processing
      await new Promise((resolve) => setTimeout(resolve, 3000));
      console.log("Index action completed");
    };

    const tagProcessor = async (action: OfflineAction) => {
      console.log("Processing tag action:", action);
      // Simulate tagging processing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Tag action completed");
    };

    addProcessor("SEARCH", searchProcessor);
    addProcessor("INDEX", indexProcessor);
    addProcessor("TAG", tagProcessor);

    return () => {
      removeProcessor("SEARCH");
      removeProcessor("INDEX");
      removeProcessor("TAG");
    };
  }, [addProcessor, removeProcessor]);

  // Handle network status changes
  const [networkStatus, setNetworkStatus] = useState<boolean>(isOnline);

  useEffect(() => {
    const handleNetworkChange = (status: boolean) => {
      setNetworkStatus(status);
      setActionResult(
        `Network status changed: ${status ? "online" : "offline"}`
      );
    };

    addNetworkChangeListener(handleNetworkChange);

    return () => {
      removeNetworkChangeListener(handleNetworkChange);
    };
  }, [addNetworkChangeListener, removeNetworkChangeListener]);

  // Handle queue changes
  useEffect(() => {
    const handleQueueChange = (actions: unknown[]) => {
      console.log("Queue changed. Total actions:", actions.length);
    };

    queue.addQueueChangeListener(handleQueueChange);

    return () => {
      queue.removeQueueChangeListener(handleQueueChange);
    };
  }, [queue]);

  // Create new action
  const handleCreateAction = async () => {
    try {
      const actionId = await createAction(newActionType, newActionPayload, {
        priority: newActionPriority,
        requiresNetwork: newActionType !== "TAG", // TAG doesn't require network
        maxRetries: 3,
      });

      setActionResult(`Action created with ID: ${actionId}`);
      setSelectedActionId(actionId);
    } catch (error) {
      setActionResult(`Failed to create action: ${(error as Error).message}`);
    }
  };

  // Update action status
  const handleUpdateStatus = (id: string, status: OfflineActionStatus) => {
    try {
      updateActionStatus(id, status);
      setActionResult(`Action ${id} status updated to ${status}`);
    } catch (error) {
      setActionResult(`Failed to update status: ${(error as Error).message}`);
    }
  };

  // Cancel action
  const handleCancelAction = async (id: string) => {
    try {
      await cancelAction(id);
      setActionResult(`Action ${id} cancelled`);
    } catch (error) {
      setActionResult(`Failed to cancel action: ${(error as Error).message}`);
    }
  };

  // Retry action
  const handleRetryAction = async (id: string) => {
    try {
      await retryAction(id);
      setActionResult(`Action ${id} retried`);
    } catch (error) {
      setActionResult(`Failed to retry action: ${(error as Error).message}`);
    }
  };

  // Clear completed actions
  const handleClearCompleted = () => {
    try {
      clearCompleted();
      setActionResult("Completed actions cleared");
    } catch (error) {
      setActionResult(
        `Failed to clear completed actions: ${(error as Error).message}`
      );
    }
  };

  // Clear failed actions
  const handleClearFailed = () => {
    try {
      clearFailed();
      setActionResult("Failed actions cleared");
    } catch (error) {
      setActionResult(
        `Failed to clear failed actions: ${(error as Error).message}`
      );
    }
  };

  // Sync with server
  const handleSync = async () => {
    try {
      await sync();
      setActionResult("Queue synced with server");
    } catch (error) {
      setActionResult(`Failed to sync: ${(error as Error).message}`);
    }
  };

  // Process action manually
  const handleProcessAction = async (id: string) => {
    const action = getActionById(id);
    if (!action) {
      setActionResult(`Action not found: ${id}`);
      return;
    }

    try {
      // This would normally be handled automatically, but for demo purposes
      // we'll manually trigger processing
      setActionResult(`Manually processing action ${id}`);

      // Simulate manual processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (Math.random() < 0.2) {
        throw new Error("Manual processing failed");
      }

      updateActionStatus(id, "SYNCED");
      setActionResult(`Action ${id} manually processed and synced`);
    } catch (error) {
      updateActionStatus(id, "FAILED");
      setActionResult(
        `Manual processing failed for ${id}: ${(error as Error).message}`
      );
    }
  };

  // Get status for selected action
  const selectedActionStatus = useActionStatus(selectedActionId);

  // Get progress for selected action
  const selectedActionProgress = useActionProgress(selectedActionId);

  // Get error for selected action
  const selectedActionError = useActionError(selectedActionId);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-gray-900">
          Offline Action Queue Demo
        </h1>
        <p className="mt-2 text-gray-600">
          Demonstrates offline-first action queuing, processing, and
          synchronization.
        </p>
      </header>

      {/* Network Status */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Network Status
        </h2>
        <div className="flex items-center space-x-4">
          <div
            className={`h-4 w-4 rounded-full ${
              networkStatus ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-lg font-medium">
            {networkStatus ? "Online" : "Offline"}
          </span>
          <button
            type="button"
            onClick={() => {
              // Simulate network toggle (for demo purposes only)
              const newStatus = !networkStatus;
              window.dispatchEvent(new Event(newStatus ? "online" : "offline"));
            }}
            className="ml-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Toggle Network Status
          </button>
        </div>
      </section>

      {/* Statistics */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Queue Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Total Actions</p>
            <p className="text-3xl font-bold text-blue-600">
              {statistics.total}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-800">Queued</p>
            <p className="text-3xl font-bold text-green-600">
              {statistics.queued}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">Processing</p>
            <p className="text-3xl font-bold text-yellow-600">
              {statistics.processing}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-red-800">Failed</p>
            <p className="text-3xl font-bold text-red-600">
              {statistics.failed}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900">Actions by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {Object.entries(statistics.byType).map(([type, count]) => (
              <div key={type} className="bg-gray-50 p-2 rounded">
                <p className="text-sm text-gray-700">{type}</p>
                <p className="font-medium">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Create Action */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Create New Action
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="action-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Action Type
            </label>
            <select
              id="action-type"
              value={newActionType}
              onChange={(e) =>
                setNewActionType(e.target.value as OfflineActionType)
              }
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="SEARCH">Search</option>
              <option value="INDEX">Index</option>
              <option value="TAG">Tag</option>
              <option value="RATE">Rate</option>
              <option value="EXPORT">Export</option>
              <option value="DELETE">Delete</option>
              <option value="MOVE">Move</option>
              <option value="COPY">Copy</option>
              <option value="CREATE_COLLECTION">Create Collection</option>
              <option value="DELETE_COLLECTION">Delete Collection</option>
              <option value="ADD_TO_COLLECTION">Add to Collection</option>
              <option value="REMOVE_FROM_COLLECTION">
                Remove from Collection
              </option>
              <option value="SETTINGS_UPDATE">Settings Update</option>
              <option value="METADATA_UPDATE">Metadata Update</option>
              <option value="OCR_PROCESS">OCR Process</option>
              <option value="CAPTION_GENERATE">Caption Generate</option>
              <option value="FACE_RECOGNIZE">Face Recognize</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="action-priority"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Priority
            </label>
            <select
              id="action-priority"
              value={newActionPriority}
              onChange={(e) => setNewActionPriority(e.target.value as unknown)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="action-payload"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Payload (JSON)
          </label>
          <textarea
            id="action-payload"
            rows={3}
            value={JSON.stringify(newActionPayload, null, 2)}
            onChange={(e) => {
              try {
                setNewActionPayload(JSON.parse(e.target.value) || {});
              } catch {
                // Keep existing payload if JSON is invalid
                console.warn("Invalid JSON payload:", e.target.value);
              }
            }}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
            placeholder='{ "query": "vacation photos", "limit": 10 }'
          />
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleCreateAction}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Action
          </button>
        </div>
      </section>

      {/* Action Result */}
      {actionResult && (
        <section className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{actionResult}</p>
        </section>
      )}

      {/* Selected Action Details */}
      {selectedActionId && (
        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Selected Action Details
            </h2>
            <button
              type="button"
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {showDetailedView ? "Hide" : "Show"} Details
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">ID</p>
              <p className="font-mono text-sm text-gray-900">
                {selectedActionId}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Status</p>
              <p className="font-mono text-gray-900">
                {selectedActionStatus || "Unknown"}
              </p>
            </div>

            {selectedActionProgress && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Progress</p>
                <p className="font-mono text-gray-900">
                  {selectedActionProgress.progress} /{" "}
                  {selectedActionProgress.total}
                </p>
              </div>
            )}
          </div>

          {selectedActionError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{selectedActionError}</p>
            </div>
          )}

          {showDetailedView && selectedActionId && (
            <div className="mt-4">
              <pre className="bg-gray-100 p-4 rounded-lg text-sm max-h-32 overflow-y-auto">
                {JSON.stringify(getActionById(selectedActionId), null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleUpdateStatus(selectedActionId, "PROCESSING")}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Mark Processing
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus(selectedActionId, "SYNCED")}
              className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Mark Synced
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus(selectedActionId, "FAILED")}
              className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Mark Failed
            </button>
            <button
              type="button"
              onClick={() => handleCancelAction(selectedActionId)}
              className="px-3 py-1 text-sm font-medium text-white bg-yellow-600 rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleRetryAction(selectedActionId)}
              className="px-3 py-1 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => handleProcessAction(selectedActionId)}
              className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Process Manually
            </button>
          </div>
        </section>
      )}

      {/* Monitored Actions */}
      {monitoredActions.length > 0 && (
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Monitored Actions
          </h2>
          <div className="space-y-2">
            {monitoredActions.map((action) => (
              <div
                key={action.id}
                className={`p-3 rounded-lg border ${
                  action.status === "QUEUED"
                    ? "border-blue-200 bg-blue-50"
                    : "border-yellow-200 bg-yellow-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{action.type}</p>
                    <p className="text-sm text-gray-500">
                      {action.id.substring(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        action.status === "QUEUED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {action.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedActionId(action.id)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter Controls */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Filter Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="filter-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Filter by Type
            </label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as unknown)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="ALL">All Types</option>
              <option value="SEARCH">Search</option>
              <option value="INDEX">Index</option>
              <option value="TAG">Tag</option>
              <option value="RATE">Rate</option>
              <option value="EXPORT">Export</option>
              <option value="DELETE">Delete</option>
              <option value="MOVE">Move</option>
              <option value="COPY">Copy</option>
              <option value="CREATE_COLLECTION">Create Collection</option>
              <option value="DELETE_COLLECTION">Delete Collection</option>
              <option value="ADD_TO_COLLECTION">Add to Collection</option>
              <option value="REMOVE_FROM_COLLECTION">
                Remove from Collection
              </option>
              <option value="SETTINGS_UPDATE">Settings Update</option>
              <option value="METADATA_UPDATE">Metadata Update</option>
              <option value="OCR_PROCESS">OCR Process</option>
              <option value="CAPTION_GENERATE">Caption Generate</option>
              <option value="FACE_RECOGNIZE">Face Recognize</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Filter by Status
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as unknown)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="ALL">All Statuses</option>
              <option value="QUEUED">Queued</option>
              <option value="PROCESSING">Processing</option>
              <option value="SYNCED">Synced</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </section>

      {/* Action List */}
      <section className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Action Queue ({filteredActions.length})
          </h2>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleClearCompleted}
              className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Clear Completed
            </button>
            <button
              type="button"
              onClick={handleClearFailed}
              className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Clear Failed
            </button>
            <button
              type="button"
              onClick={handleSync}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sync with Server
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredActions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No actions in queue matching current filters.
            </p>
          ) : (
            filteredActions.map((action) => (
              <div
                key={action.id}
                className={`p-4 rounded-lg border ${
                  action.status === "QUEUED"
                    ? "border-blue-200 bg-blue-50"
                    : action.status === "PROCESSING"
                    ? "border-yellow-200 bg-yellow-50"
                    : action.status === "SYNCED"
                    ? "border-green-200 bg-green-50"
                    : action.status === "FAILED"
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">
                        {action.type}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          action.status === "QUEUED"
                            ? "bg-blue-100 text-blue-800"
                            : action.status === "PROCESSING"
                            ? "bg-yellow-100 text-yellow-800"
                            : action.status === "SYNCED"
                            ? "bg-green-100 text-green-800"
                            : action.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {action.status}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          action.priority === "LOW"
                            ? "bg-gray-100 text-gray-800"
                            : action.priority === "NORMAL"
                            ? "bg-blue-100 text-blue-800"
                            : action.priority === "HIGH"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {action.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {action.id.substring(0, 8)}... • Created{" "}
                      {new Date(
                        action.metadata?.createdAt || 0
                      ).toLocaleString()}
                    </p>
                    <div className="flex space-x-4 mt-2">
                      <p className="text-sm">
                        <span className="font-medium">Payload:</span>
                        <span className="font-mono ml-1">
                          {JSON.stringify(action.payload).substring(0, 50)}...
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedActionId(action.id)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      View
                    </button>
                    {action.status === "FAILED" && (
                      <button
                        type="button"
                        onClick={() => handleRetryAction(action.id)}
                        className="text-sm text-green-600 hover:text-green-800"
                      >
                        Retry
                      </button>
                    )}
                    {(action.status === "QUEUED" ||
                      action.status === "FAILED") && (
                      <button
                        type="button"
                        onClick={() => handleCancelAction(action.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Simulate Actions */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Simulate Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => {
              createAction("SEARCH", { query: "Vacation photos", limit: 10 });
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Search Action
          </button>

          <button
            type="button"
            onClick={() => {
              createAction("INDEX", { directory: "/photos/vacation" });
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Index Action
          </button>

          <button
            type="button"
            onClick={() => {
              createAction("TAG", {
                photo: "/photos/vacation/beach.jpg",
                tags: ["beach", "water", "vacation"],
              });
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Tag Action
          </button>

          <button
            type="button"
            onClick={() => {
              createAction("RATE", {
                photo: "/photos/vacation/beach.jpg",
                rating: 5,
              });
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Rate Action
          </button>
        </div>
      </section>
    </div>
  );
};

export default OfflineActionQueueDemo;
