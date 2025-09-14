import { describe, expect, it } from "vitest";
import { humanizeSeconds } from "../../utils/time";

describe("humanizeSeconds", () => {
  it("formats seconds under a minute", () => {
    expect(humanizeSeconds(0)).toBe("0s");
    expect(humanizeSeconds(5)).toBe("5s");
    expect(humanizeSeconds(59)).toBe("59s");
  });

  it("formats minutes and seconds", () => {
    expect(humanizeSeconds(60)).toBe("1m");
    expect(humanizeSeconds(61)).toBe("1m 1s");
    expect(humanizeSeconds(90)).toBe("1m 30s");
    expect(humanizeSeconds(3599)).toBe("59m 59s");
  });

  it("formats hours and minutes", () => {
    expect(humanizeSeconds(3600)).toBe("1h");
    expect(humanizeSeconds(3660)).toBe("1h 1m");
    expect(humanizeSeconds(3661)).toBe("1h 1m");
    expect(humanizeSeconds(7200)).toBe("2h");
  });

  it("clamps negative to zero", () => {
    expect(humanizeSeconds(-5)).toBe("0s");
  });
});

