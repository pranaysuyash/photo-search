import type React from "react";
import { useEffect, useMemo } from "react";
import { createEngineBridgeAdapters } from "./EngineBridge";
import type { EngineBridgeAdapters } from "./EngineBridge";
import type { EngineHealthSnapshot, EngineLogEntry } from "../types/engine";
import { useEngineTelemetryActions } from "../stores/useStores";

const DEFAULT_HISTORY_LIMIT = 60;
const DEFAULT_LOG_LIMIT = 400;

export type EngineTelemetryProviderProps = {
  children: React.ReactNode;
  bridge?: EngineBridgeAdapters;
  historyLimit?: number;
  logLimit?: number;
};

const isValidSnapshot = (
  snapshot: EngineHealthSnapshot | null
): snapshot is EngineHealthSnapshot => Boolean(snapshot);

const hasLogEntries = (entries: EngineLogEntry[]) => entries.length > 0;

export function EngineTelemetryProvider({
  children,
  bridge,
  historyLimit = DEFAULT_HISTORY_LIMIT,
  logLimit = DEFAULT_LOG_LIMIT,
}: EngineTelemetryProviderProps) {
  const adapters = useMemo(
    () => bridge ?? createEngineBridgeAdapters(),
    [bridge]
  );
  const { recordHealth, replaceLogs, appendLogs } = useEngineTelemetryActions();

  useEffect(() => {
    if (!adapters.isAvailable()) {
      return;
    }

    let cancelled = false;

    const safeRecord = (snapshot: EngineHealthSnapshot | null) => {
      if (!cancelled && isValidSnapshot(snapshot)) {
        recordHealth(snapshot, { historyLimit });
      }
    };

    const safeReplace = (entries: EngineLogEntry[]) => {
      if (!cancelled && hasLogEntries(entries)) {
        replaceLogs(entries, { limit: logLimit });
      } else if (!cancelled && logLimit === 0) {
        replaceLogs([], { limit: logLimit });
      }
    };

    const safeAppend = (entries: EngineLogEntry[]) => {
      if (!cancelled && hasLogEntries(entries)) {
        appendLogs(entries, { limit: logLimit });
      }
    };

    adapters
      .getInitialHealth()
      .then(safeRecord)
      .catch(() => null);
    adapters
      .getRecentLogs(logLimit)
      .then(safeReplace)
      .catch(() => null);

    const unsubscribeHealth = adapters.subscribeHealth(safeRecord);
    const unsubscribeLogs = adapters.subscribeLogs(safeAppend);

    return () => {
      cancelled = true;
      unsubscribeHealth?.();
      unsubscribeLogs?.();
    };
  }, [adapters, appendLogs, historyLimit, logLimit, recordHealth, replaceLogs]);

  return <>{children}</>;
}
