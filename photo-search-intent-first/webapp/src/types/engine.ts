export type EngineHealthSnapshot = {
  backendRunning: boolean;
  healthy: boolean;
  failures: number;
  latencyMs: number | null;
  lastError: string | null;
  lastCheckedAt: string | null;
  reason?: string;
};

export type EngineLogEntry = {
  id: string;
  line: string;
  receivedAt: number;
};
