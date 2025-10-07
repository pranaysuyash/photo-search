import {
  AlertTriangle,
  Clock,
  ListChecks,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import * as React from "react";
import { useDiagnosticsFeed } from "../hooks/useDiagnosticsFeed";
import { offlineService } from "../services/OfflineService";
import type { DiagnosticEventRecord } from "../services/IndexedDBStorage";
import type {
  ConnectivityStatusEvent,
  QueueSnapshotEvent,
  SyncCycleEvent,
} from "../services/OfflineService";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1_000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function describeEvent(record: DiagnosticEventRecord): {
  icon: React.ReactNode;
  label: string;
} {
  const payload = record.payload as Record<string, unknown> | undefined;
  switch (record.type) {
    case "connectivity-status": {
      const status = (payload?.status as ConnectivityStatusEvent["status"]) ?? "unknown";
      return {
        icon: status === "online" ? (
          <Wifi className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-red-600" />
        ),
        label:
          status === "online"
            ? "Connection restored"
            : status === "offline"
              ? "Connection lost"
              : "Connectivity update",
      };
    }
    case "queue-snapshot": {
      const queueLen = payload?.queueLength as number | undefined;
      const ready = payload?.readyLength as number | undefined;
      return {
        icon: <ListChecks className="w-3.5 h-3.5 text-blue-500" />,
        label: `Queue update${
          typeof queueLen === "number"
            ? ` · ${queueLen} queued${typeof ready === "number" ? ` (${ready} ready)` : ""}`
            : ""
        }`,
      };
    }
    case "sync-cycle": {
      const synced = payload?.syncedCount as number | undefined;
      const failed = payload?.failedCount as number | undefined;
      return {
        icon:
          typeof failed === "number" && failed > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
          ),
        label: `Sync complete${
          typeof synced === "number"
            ? ` · ${synced} synced${typeof failed === "number" ? `, ${failed} failed` : ""}`
            : ""
        }`,
      };
    }
    default:
      return {
        icon: <RefreshCw className="w-3.5 h-3.5 text-gray-500" />,
        label: "Diagnostic event",
      };
  }
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "–";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export function ActivityTray(): JSX.Element {
  const { events, latestStatus, latestQueue, latestSync } = useDiagnosticsFeed(50);

  const onlineStatus = latestStatus?.status ?? (offlineService.getStatus() ? "online" : "offline");
  const queueLength = latestQueue?.queueLength ?? 0;
  const readyLength = latestQueue?.readyLength ?? 0;
  const deferredLength = latestQueue?.deferredLength ?? 0;
  const nextRetryInMs = latestQueue?.nextRetryInMs ?? latestSync?.nextRetryInMs ?? null;
  const lastSyncAt = latestSync?.timestamp;

  const recentEvents = events.slice(0, 5);

  return (
    <section
      aria-label="Activity overview"
      className="mt-4 rounded-lg border border-slate-200 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          {onlineStatus === "online" ? (
            <Wifi className="w-4 h-4 text-green-600" aria-hidden="true" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-600" aria-hidden="true" />
          )}
          <span>Connection {onlineStatus === "online" ? "Online" : "Offline"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Next sync {formatDuration(nextRetryInMs)}</span>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-md bg-slate-100 p-2 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Queued</div>
          <div className="text-base font-semibold">{queueLength}</div>
        </div>
        <div className="rounded-md bg-slate-100 p-2 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Ready</div>
          <div className="text-base font-semibold">{readyLength}</div>
        </div>
        <div className="rounded-md bg-slate-100 p-2 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Deferred</div>
          <div className="text-base font-semibold">{deferredLength}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Last sync: {lastSyncAt ? formatRelativeTime(lastSyncAt) : "no recent sync"}
        </span>
      </div>

      <ul className="mt-3 space-y-2" aria-label="Recent activity">
        {recentEvents.length === 0 ? (
          <li className="text-xs text-slate-500 dark:text-slate-400">No diagnostics events yet.</li>
        ) : (
          recentEvents.map((record) => {
            const { icon, label } = describeEvent(record);
            return (
              <li
                key={`${record.type}-${record.timestamp}`}
                className="flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-800/70"
              >
                {icon}
                <div className="flex-1">
                  <div className="text-slate-700 dark:text-slate-200">{label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatRelativeTime(record.timestamp)}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
