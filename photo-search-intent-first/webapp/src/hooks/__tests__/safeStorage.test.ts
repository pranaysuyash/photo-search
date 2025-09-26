/**
 * Unit tests for safeStorage utilities
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { safeLocalStorage, guardBrowser, defer } from "../utils/safeStorage";

// Mock window and localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("guardBrowser", () => {
  it("should return true in browser environment", () => {
    expect(guardBrowser()).toBe(true);
  });

  it("should return false when window is undefined", () => {
    const originalWindow = global.window;
    // @ts-expect-error - intentionally setting to undefined for test
    delete global.window;

    expect(guardBrowser()).toBe(false);

    global.window = originalWindow;
  });
});

describe("safeLocalStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getItem", () => {
    it("should return value from localStorage", () => {
      mockLocalStorage.getItem.mockReturnValue("test-value");

      const result = safeLocalStorage.getItem("test-key");

      expect(result).toBe("test-value");
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("test-key");
    });

    it("should return null when localStorage throws", () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("Storage access denied");
      });

      const result = safeLocalStorage.getItem("test-key");

      expect(result).toBeNull();
    });
  });

  describe("setItem", () => {
    it("should set value in localStorage and return true", () => {
      mockLocalStorage.setItem.mockImplementation(() => {});

      const result = safeLocalStorage.setItem("test-key", "test-value");

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "test-key",
        "test-value"
      );
    });

    it("should return false when localStorage throws", () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      const result = safeLocalStorage.setItem("test-key", "test-value");

      expect(result).toBe(false);
    });
  });

  describe("getItemJSON", () => {
    it("should parse and return JSON value", () => {
      const testObj = { foo: "bar", num: 42 };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testObj));

      const result = safeLocalStorage.getItemJSON("test-key", {});

      expect(result).toEqual(testObj);
    });

    it("should return fallback when key does not exist", () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const fallback = { default: true };

      const result = safeLocalStorage.getItemJSON("test-key", fallback);

      expect(result).toBe(fallback);
    });

    it("should return fallback when JSON parsing fails", () => {
      mockLocalStorage.getItem.mockReturnValue("invalid-json");
      const fallback = { default: true };

      const result = safeLocalStorage.getItemJSON("test-key", fallback);

      expect(result).toBe(fallback);
    });
  });

  describe("setItemJSON", () => {
    it("should stringify and store JSON value", () => {
      mockLocalStorage.setItem.mockImplementation(() => {});
      const testObj = { foo: "bar", num: 42 };

      const result = safeLocalStorage.setItemJSON("test-key", testObj);

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify(testObj)
      );
    });

    it("should return false when JSON stringification fails", () => {
      const cyclicalObj: Record<string, unknown> = {};
      cyclicalObj.self = cyclicalObj; // Creates circular reference

      const result = safeLocalStorage.setItemJSON("test-key", cyclicalObj);

      expect(result).toBe(false);
    });
  });
});

describe("defer", () => {
  it("should use requestAnimationFrame when available", () => {
    const mockRAF = vi.fn((callback) => callback());
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = mockRAF;

    const callback = vi.fn();
    defer(callback);

    expect(mockRAF).toHaveBeenCalledWith(callback);
    expect(callback).toHaveBeenCalled();

    window.requestAnimationFrame = originalRAF;
  });

  it("should use setTimeout as fallback", () => {
    const originalRAF = window.requestAnimationFrame;
    // @ts-expect-error - intentionally removing RAF for test
    delete window.requestAnimationFrame;

    vi.useFakeTimers();

    const callback = vi.fn();
    defer(callback);

    // Fast-forward timers to trigger setTimeout
    vi.runAllTimers();

    expect(callback).toHaveBeenCalled();

    vi.useRealTimers();
    window.requestAnimationFrame = originalRAF;
  });
});
