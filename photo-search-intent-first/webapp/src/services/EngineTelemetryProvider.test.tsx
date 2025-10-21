import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EngineHealthSnapshot, EngineLogEntry } from "../types/engine";
import { EngineTelemetryProvider } from "./EngineTelemetryProvider";
import type { EngineBridgeAdapters } from "./EngineBridge";
import { SimpleStoreProvider } from "../stores/SimpleStore";
import {
  useEngineHealth,
  useEngineHealthHistory,
  useEngineLogs,
} from "../stores/useStores";

const TestConsumer = () => {
  const health = useEngineHealth();
  const history = useEngineHealthHistory();
  const logs = useEngineLogs();
  return (
    <div>
      <div data-testid="health-label">{health?.healthy ? "healthy" : ""}</div>
      <div data-testid="history-count">{history.length}</div>
      <div data-testid="logs-count">{logs.length}</div>
    </div>
  );
};

describe("EngineTelemetryProvider", () => {
  it("records initial telemetry and streams updates", async () => {
    const initialHealth: EngineHealthSnapshot = {
      backendRunning: true,
      healthy: true,
      failures: 0,
      latencyMs: 120,
      lastError: null,
      lastCheckedAt: new Date().toISOString(),
    };
    const followUp: EngineHealthSnapshot = {
      backendRunning: true,
      healthy: false,
      failures: 1,
      latencyMs: null,
      lastError: "timeout",
      lastCheckedAt: new Date().toISOString(),
      reason: "poll",
    };
    const initialLogs: EngineLogEntry[] = [
      { id: "l1", line: "INFO boot", receivedAt: Date.now() },
      { id: "l2", line: "INFO ready", receivedAt: Date.now() },
    ];
    const appended: EngineLogEntry[] = [
      { id: "l3", line: "ERROR lost", receivedAt: Date.now() },
    ];

    let healthCallback: ((snapshot: EngineHealthSnapshot) => void) | null =
      null;
    let logsCallback: ((entries: EngineLogEntry[]) => void) | null = null;
    const unsubscribeHealth = vi.fn();
    const unsubscribeLogs = vi.fn();

    const bridge: EngineBridgeAdapters = {
      isAvailable: () => true,
      getInitialHealth: vi.fn(async () => initialHealth),
      subscribeHealth: vi.fn((cb) => {
        healthCallback = cb;
        return unsubscribeHealth;
      }),
      getRecentLogs: vi.fn(async () => initialLogs),
      subscribeLogs: vi.fn((cb) => {
        logsCallback = cb;
        return unsubscribeLogs;
      }),
    };

    const { unmount } = render(
      <SimpleStoreProvider>
        <EngineTelemetryProvider bridge={bridge} historyLimit={3} logLimit={5}>
          <TestConsumer />
        </EngineTelemetryProvider>
      </SimpleStoreProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("history-count").textContent).toBe("1")
    );
    expect(screen.getByTestId("logs-count").textContent).toBe("2");

    act(() => {
      healthCallback?.(followUp);
      logsCallback?.(appended);
    });

    await waitFor(() =>
      expect(screen.getByTestId("history-count").textContent).toBe("2")
    );
    expect(screen.getByTestId("health-label").textContent).toBe("");
    expect(screen.getByTestId("logs-count").textContent).toBe("3");

    unmount();
    expect(unsubscribeHealth).toHaveBeenCalledTimes(1);
    expect(unsubscribeLogs).toHaveBeenCalledTimes(1);
  });

  it("skips wiring when bridge is unavailable", () => {
    const bridge: EngineBridgeAdapters = {
      isAvailable: () => false,
      getInitialHealth: vi.fn(),
      subscribeHealth: vi.fn(() => () => {}),
      getRecentLogs: vi.fn(),
      subscribeLogs: vi.fn(() => () => {}),
    };

    render(
      <SimpleStoreProvider>
        <EngineTelemetryProvider bridge={bridge}>
          <TestConsumer />
        </EngineTelemetryProvider>
      </SimpleStoreProvider>
    );

    expect(bridge.getInitialHealth).not.toHaveBeenCalled();
    expect(bridge.getRecentLogs).not.toHaveBeenCalled();
  });
});
