import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

describe("index.html electron runtime bootstrap", () => {
  it("exposes electron runtime markers", () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const htmlPath = join(__dirname, "..", "index.html");
    const html = readFileSync(htmlPath, "utf-8");
    expect(html).toContain("document.documentElement.dataset.runtime = \"electron\"");
    expect(html).toContain("window.__ELECTRON_RUNTIME__ = true");
  });
});
