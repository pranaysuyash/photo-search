import type { EngineHealthSnapshot, EngineLogEntry } from "../types/engine";

interface EngineLike {
  onStatus?: (callback: (payload: unknown) => void) => () => void;
  logs?: {
    subscribe?: (callback: (entries: unknown) => void) => () => void;
    recent?: (limit?: number) => Promise<unknown>;
  };
}

type WindowWithBridge = Window & {
  engine?: EngineLike;
};

const MAX_LOG_ID_ATTEMPTS = 5;

const generateLogId = (prefix: string): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  for (let attempt = 0; attempt < MAX_LOG_ID_ATTEMPTS; attempt += 1) {
    const candidate = `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
    if (candidate) return candidate;
  }
  return `${prefix}-${Date.now()}`;
};

const coerceHealthSnapshot = (
  payload: unknown
): EngineHealthSnapshot | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const raw = payload as Record<string, unknown>;
  const backendRunning = Boolean(raw.backendRunning);
  const healthy = Boolean(raw.healthy);
  const failures = Number.isFinite(raw.failures) ? Number(raw.failures) : 0;
  const latencyMs =
    typeof raw.latencyMs === "number" && Number.isFinite(raw.latencyMs)
      ? raw.latencyMs
      : null;
  const lastCheckedAt =
    typeof raw.lastCheckedAt === "string" ? raw.lastCheckedAt : null;
  const lastError = typeof raw.lastError === "string" ? raw.lastError : null;
  const reason = typeof raw.reason === "string" ? raw.reason : undefined;

  return {
    backendRunning,
    healthy,
    failures,
    latencyMs,
    lastCheckedAt,
    lastError,
    reason,
  };
};

const coerceLogEntries = (
  payload: unknown,
  source: string
): EngineLogEntry[] => {
  if (payload == null) {
    return [];
  }
  const timestamp = Date.now();
  if (Array.isArray(payload)) {
    return payload
      .map((line, index) => {
        if (line == null) return null;
        const text = typeof line === "string" ? line : String(line);
        return {
          id: generateLogId(`${source}-${index}`),
          line: text,
          receivedAt: timestamp,
        } satisfies EngineLogEntry;
      })
      .filter((entry): entry is EngineLogEntry => Boolean(entry));
  }
  const text = typeof payload === "string" ? payload : String(payload);
  return [
    {
      id: generateLogId(`${source}-single`),
      line: text,
      receivedAt: timestamp,
    },
  ];
};

export interface EngineBridgeAdapters {
  isAvailable: () => boolean;
  getInitialHealth: () => Promise<EngineHealthSnapshot | null>;
  subscribeHealth: (
    callback: (snapshot: EngineHealthSnapshot) => void
  ) => () => void;
  getRecentLogs: (limit: number) => Promise<EngineLogEntry[]>;
  subscribeLogs: (callback: (entries: EngineLogEntry[]) => void) => () => void;
}

const getWindowBridge = (): WindowWithBridge | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window as WindowWithBridge;
};

export const createEngineBridgeAdapters = (): EngineBridgeAdapters => {
  return {
    isAvailable: () => {
      const w = getWindowBridge();
      return Boolean(
        w?.engine || w?.electronAPI?.health || w?.electronAPI?.logs
      );
    },
    getInitialHealth: async () => {
      try {
        const w = getWindowBridge();
        const result = await w?.electronAPI?.health?.getStatus?.();
        return coerceHealthSnapshot(result);
      } catch {
        return null;
      }
    },
    subscribeHealth: (callback) => {
      const w = getWindowBridge();
      const engineUnsub = w?.engine?.onStatus?.((payload) => {
        const snapshot = coerceHealthSnapshot(payload);
        if (snapshot) {
          callback(snapshot);
        }
      });
      if (engineUnsub) {
        return engineUnsub;
      }
      const apiUnsub = w?.electronAPI?.health?.onStatusChange?.((payload) => {
        const snapshot = coerceHealthSnapshot(payload);
        if (snapshot) {
          callback(snapshot);
        }
      });
      return apiUnsub || (() => {});
    },
    getRecentLogs: async (limit: number) => {
      try {
        const w = getWindowBridge();
        const payload = await (w?.engine?.logs?.recent
          ? w.engine.logs.recent(limit)
          : w?.electronAPI?.logs?.getRecent?.(limit));
        return coerceLogEntries(payload, "recent");
      } catch {
        return [];
      }
    },
    subscribeLogs: (callback) => {
      const handler = (payload: unknown) => {
        const entries = coerceLogEntries(payload, "append");
        if (entries.length) {
          callback(entries);
        }
      };
      const w = getWindowBridge();
      const engineUnsub = w?.engine?.logs?.subscribe?.(handler);
      if (engineUnsub) {
        return engineUnsub;
      }
      const apiUnsub = w?.electronAPI?.logs?.onAppend?.(handler);
      return apiUnsub || (() => {});
    },
  };
};
