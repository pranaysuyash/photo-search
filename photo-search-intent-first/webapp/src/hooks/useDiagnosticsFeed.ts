import { useEffect, useMemo, useState } from "react";
import { offlineService } from "../services/OfflineService";
import type {
  DiagnosticEventRecord,
} from "../services/IndexedDBStorage";
import type {
  ConnectivityStatusEvent,
  QueueSnapshotEvent,
  SyncCycleEvent,
  DiagnosticEvent,
} from "../services/OfflineService";

function isConnectivityEvent(payload: unknown): payload is ConnectivityStatusEvent {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as DiagnosticEvent).type === "connectivity-status"
  );
}

function isQueueSnapshotEvent(payload: unknown): payload is QueueSnapshotEvent {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as DiagnosticEvent).type === "queue-snapshot"
  );
}

function isSyncCycleEvent(payload: unknown): payload is SyncCycleEvent {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as DiagnosticEvent).type === "sync-cycle"
  );
}

export interface DiagnosticsFeedState {
  events: DiagnosticEventRecord[];
  latestStatus?: ConnectivityStatusEvent;
  latestQueue?: QueueSnapshotEvent;
  latestSync?: SyncCycleEvent;
}

export function useDiagnosticsFeed(limit = 50): DiagnosticsFeedState {
  const [records, setRecords] = useState<DiagnosticEventRecord[]>([]);

  useEffect(() => {
    let active = true;

    offlineService
      .getDiagnostics(limit)
      .then((initial) => {
        if (active) {
          setRecords(initial);
        }
      })
      .catch((error) => {
        console.error("Failed to load diagnostics", error);
      });

    const unsubscribe = offlineService.onDiagnostics((event) => {
      setRecords((prev) => {
        const nextRecord: DiagnosticEventRecord = {
          type: event.type,
          timestamp: event.timestamp,
          payload: event,
        };
        return [nextRecord, ...prev].slice(0, limit);
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [limit]);

  return useMemo(() => {
    let latestStatus: ConnectivityStatusEvent | undefined;
    let latestQueue: QueueSnapshotEvent | undefined;
    let latestSync: SyncCycleEvent | undefined;

    for (const record of records) {
      const payload = record.payload;
      if (!latestStatus && isConnectivityEvent(payload)) {
        latestStatus = payload;
      }
      if (!latestQueue && isQueueSnapshotEvent(payload)) {
        latestQueue = payload;
      }
      if (!latestSync && isSyncCycleEvent(payload)) {
        latestSync = payload;
      }
      if (latestStatus && latestQueue && latestSync) {
        break;
      }
    }

    return { events: records, latestStatus, latestQueue, latestSync };
  }, [records]);
}
