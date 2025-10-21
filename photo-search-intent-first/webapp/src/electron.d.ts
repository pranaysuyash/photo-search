// TypeScript declarations for Electron API
interface Window {
  electronAPI?: {
    selectFolder: () => Promise<string | null>;
    getApiToken?: () => Promise<string>;
    getApiConfig?: () => Promise<{ base: string; token: string }>;
    health?: {
      getStatus: () => Promise<unknown>;
      forceCheck: () => Promise<unknown>;
      onStatusChange: (callback: (payload: unknown) => void) => () => void;
    };
    logs?: {
      getRecent: (limit?: number) => Promise<unknown>;
      onAppend: (callback: (entries: unknown) => void) => () => void;
    };
  };
  engine?: {
    request: (input: {
      path: string;
      method?: string;
      headers?: Record<string, string>;
      body?:
        | { kind: "json"; value: unknown }
        | { kind: "text"; value: string }
        | { kind: "form-data"; entries: Array<{ name: string; value: string }> }
        | { kind: "none" };
      timeoutMs?: number;
    }) => Promise<{
      ok: boolean;
      status: number;
      statusText?: string;
      headers?: Record<string, string>;
      bodyKind?: "json" | "text" | "none";
      body?: unknown;
      code?: string;
      message?: string;
    }>;
    start: () => Promise<unknown>;
    stop: () => Promise<unknown>;
    onStatus: (callback: (payload: unknown) => void) => () => void;
    logs: {
      subscribe: (callback: (entries: unknown) => void) => () => void;
      recent: (limit?: number) => Promise<unknown>;
    };
  };
}
