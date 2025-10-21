import { useEffect, useMemo, useState } from "react";
import { usePhotoVaultAPI } from "../services/PhotoVaultAPIProvider";
import { handleError } from "../utils/errors";
import { ConnectivityHistory } from "./ConnectivityHistory";
import {
  useEngineHealth,
  useEngineHealthHistory,
  useEngineLogs,
} from "../stores/useStores";
import { Badge } from "./ui/badge";

type Diagnostics = {
  folder: string;
  engines: {
    key: string;
    index_dir: string;
    count: number;
    fast?: { annoy: boolean; faiss: boolean; hnsw: boolean };
  }[];
  free_gb: number;
  os: string;
};

// Stage 1 guard: All health/log telemetry flows through EngineTelemetryProvider,
// which relies on the hardened IPC engine facade (no direct fetch to loopback).
export default function DiagnosticsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const api = usePhotoVaultAPI();
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const engineHealth = useEngineHealth();
  const healthHistory = useEngineHealthHistory();
  const engineLogs = useEngineLogs();
  const recentHealth = useMemo(
    () => healthHistory.slice(-8).reverse(),
    [healthHistory]
  );
  const statusDescriptor = useMemo(() => {
    if (!engineHealth) {
      return { label: "Unknown", tone: "bg-gray-100 text-gray-700" };
    }
    if (!engineHealth.backendRunning) {
      return { label: "Stopped", tone: "bg-yellow-100 text-yellow-800" };
    }
    if (engineHealth.healthy) {
      return { label: "Healthy", tone: "bg-green-100 text-green-700" };
    }
    return { label: "Degraded", tone: "bg-red-100 text-red-700" };
  }, [engineHealth]);

  const formatTimestamp = (value: string | null) => {
    if (!value) return "—";
    try {
      const date = new Date(value);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } catch (err) {
      console.warn("Failed to format timestamp", err);
      return value;
    }
  };

  const formatLatency = (latency: number | null) => {
    if (latency == null) return "—";
    if (latency < 1000) return `${latency} ms`;
    return `${(latency / 1000).toFixed(2)} s`;
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const d = await api.runDiagnostics();
        if (!cancelled) setDiag(d as Diagnostics);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load diagnostics"
          );
          handleError(e, {
            logToServer: true,
            context: {
              action: "diagnostics",
              component: "DiagnosticsDrawer.load",
            },
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (open) load();
    return () => {
      cancelled = true;
    };
  }, [api, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 appearance-none bg-black/30 backdrop-blur-md supports-[backdrop-filter]:bg-black/25 supports-[backdrop-filter]:backdrop-blur-xl transition-all duration-300 ease-out"
        aria-label="Close diagnostics"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[460px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-4 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">System Diagnostics</div>
          <button
            type="button"
            className="px-2 py-1 border rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {loading && <div className="text-sm text-gray-600">Loading…</div>}
        {error && (
          <div className="mb-3 p-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {diag && (
          <div className="space-y-4">
            <div className="p-3 border rounded space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Backend Health</div>
                <Badge className={`text-xs px-2 py-1 ${statusDescriptor.tone}`}>
                  {statusDescriptor.label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <span className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Backend
                  </span>
                  {engineHealth?.backendRunning ? "Running" : "Stopped"}
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Last Check
                  </span>
                  {formatTimestamp(engineHealth?.lastCheckedAt ?? null)}
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Latency
                  </span>
                  {formatLatency(engineHealth?.latencyMs ?? null)}
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Failures
                  </span>
                  {engineHealth?.failures ?? 0}
                </div>
              </div>
              {engineHealth?.lastError && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  Last error: {engineHealth.lastError}
                </div>
              )}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">
                  Recent Polls
                </div>
                {recentHealth.length === 0 ? (
                  <div className="text-xs text-gray-500">
                    No health snapshots yet.
                  </div>
                ) : (
                  <ul className="max-h-32 overflow-auto divide-y divide-gray-200 dark:divide-gray-800">
                    {recentHealth.map((entry, idx) => {
                      const tone = entry.healthy
                        ? "text-green-600"
                        : "text-red-600";
                      return (
                        <li
                          key={`${entry.lastCheckedAt ?? "unknown"}-${idx}`}
                          className="py-1 text-xs flex justify-between gap-2"
                        >
                          <span className={`${tone} font-medium`}>
                            {entry.healthy ? "Healthy" : "Failed"}
                          </span>
                          <span className="text-gray-500">
                            {formatTimestamp(entry.lastCheckedAt ?? null)}
                          </span>
                          {entry.reason && (
                            <span className="text-gray-400">
                              {entry.reason}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-semibold mb-1">Environment</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Folder: {diag.folder || "-"}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                OS: {diag.os || "-"}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Free Space:{" "}
                {typeof diag.free_gb === "number"
                  ? `${diag.free_gb.toFixed(1)} GB`
                  : "-"}
              </div>
            </div>

            <div className="p-3 border rounded">
              <div className="font-semibold mb-2">Engines</div>
              <div className="space-y-2">
                {(diag.engines || []).map((e, i) => (
                  <div
                    key={`${e.key}-${i}`}
                    className="text-sm p-2 rounded border"
                  >
                    <div className="font-medium">{e.key || "engine"}</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Index dir: {e.index_dir}
                    </div>
                    <div>Indexed: {e.count}</div>
                    {e.fast && (
                      <div className="mt-1 text-gray-700 dark:text-gray-300">
                        Fast Index:{" "}
                        {[
                          e.fast.annoy ? "Annoy" : null,
                          e.fast.faiss ? "FAISS" : null,
                          e.fast.hnsw ? "HNSW" : null,
                        ]
                          .filter(Boolean)
                          .join(", ") || "None"}
                      </div>
                    )}
                  </div>
                ))}
                {(!diag.engines || diag.engines.length === 0) && (
                  <div className="text-sm text-gray-600">
                    No engines reported.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connectivity History */}
        <div className="p-3 border rounded">
          <div className="font-semibold mb-2">Connectivity History</div>
          <ConnectivityHistory />
        </div>

        {/* Logs */}
        <div className="p-3 border rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Recent Engine Logs</div>
            <span className="text-xs text-gray-500">
              {engineLogs.length} cached
            </span>
          </div>
          <div className="h-48 overflow-y-auto border rounded bg-gray-900/5 dark:bg-gray-50/5">
            {engineLogs.length === 0 ? (
              <div className="text-sm text-gray-500 p-3">
                No log entries received yet. Start indexing or restart the
                engine to populate this view.
              </div>
            ) : (
              <ul className="text-xs font-mono p-2 space-y-1">
                {engineLogs.slice(-200).map((entry) => {
                  const isError = /error|traceback|fail|exception/i.test(
                    entry.line
                  );
                  return (
                    <li
                      key={entry.id}
                      className={
                        isError
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-800 dark:text-gray-200"
                      }
                    >
                      {entry.line}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
