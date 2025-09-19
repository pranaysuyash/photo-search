import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../api";
import { useSimpleStore } from "../../stores/SimpleStore";

type ScanItem = {
  path: string;
  exists: boolean;
  files: number;
  bytes: number;
  label?: string;
  source?: string;
};

function defaultPathsByOS(): string[] {
  try {
    const ua = navigator.userAgent;
    const isWin = ua.includes("Windows") || ua.includes("Win64");
    const isMac = ua.includes("Macintosh") || ua.includes("Mac OS");
    if (isWin) {
      return ["~/Pictures", "~/Desktop", "~/Downloads", "~/OneDrive/Pictures"];
    }
    if (isMac) {
      return [
        "~/Pictures",
        "~/Desktop",
        "~/Downloads",
        "~/Documents/Screenshots",
      ];
    }
    // Linux/other
    return ["~/Pictures", "~/Downloads", "~/Desktop"];
  } catch {
    return ["~/Pictures", "~/Downloads"];
  }
}

export default function FirstRunSetup({
  open,
  onClose,
  onQuickStart,
  onCustom,
  onDemo,
  onTour,
}: {
  open: boolean;
  onClose: () => void;
  onQuickStart: (paths: string[]) => void;
  onCustom: () => void;
  onDemo: () => void;
  onTour?: () => void;
}) {
  const [items, setItems] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [paths, _setPaths] = useState<string[]>(defaultPathsByOS());
  const store = useSimpleStore();
  const incVid = store.state.settings.includeVideos;
  const setSettings = store.setSettings;
  const [includeVideos, setIncludeVideos] = useState<boolean>(incVid);

  const total = useMemo(
    () => items.reduce((a, b) => a + (b.files || 0), 0),
    [items]
  );
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState("");

  const chooseWithOS = async () => {
    try {
      const p = await (window as unknown).electronAPI?.selectFolder?.();
      if (typeof p === "string" && p.trim()) {
        try {
          (window as unknown).electronAPI?.setAllowedRoot?.(p);
        } catch {}
        onQuickStart([p]);
        onClose();
      }
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadDefaults = async () => {
      setLoading(true);
      try {
        try {
          const resp = await fetch(
            `${API_BASE}/library/defaults?include_videos=${
              includeVideos ? "1" : "0"
            }`
          );
          if (!resp.ok) {
            throw new Error(await resp.text());
          }
          const data = (await resp.json()) as { items?: ScanItem[] };
          const list = Array.isArray(data.items) ? data.items : [];
          if (!cancelled && list.length > 0) {
            setItems(list);
            _setPaths(list.map((it) => it.path));
            return;
          }
        } catch {
          if (cancelled) {
            return;
          }
        }

        if (cancelled) {
          return;
        }

        const fallback = defaultPathsByOS();
        if (!cancelled) {
          _setPaths(fallback);
        }
        if (fallback.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }
        try {
          const resp = await fetch(
            `${API_BASE}/scan_count?include_videos=${
              includeVideos ? "1" : "0"
            }`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fallback),
            }
          );
          if (!resp.ok) {
            throw new Error(await resp.text());
          }
          const data = (await resp.json()) as { items: ScanItem[] };
          if (!cancelled) setItems(data.items || []);
        } catch {
          if (!cancelled) setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDefaults();
    return () => {
      cancelled = true;
    };
  }, [open, includeVideos]);

  const formatBytes = (n: number) => {
    if (!n) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-[1101] bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl p-5">
        <div className="text-lg font-semibold mb-2">
          Welcome — let’s find your photos
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Get started fast (no cloud, local‑only).
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="font-medium mb-1">🚀 Quick Start (Recommended)</div>
            <div className="text-xs text-gray-600 mb-2">
              Index common locations (local only)
            </div>
            <ul className="text-xs text-gray-700 mb-2 space-y-1">
              {items.map((it) => (
                <li key={it.path} className="flex justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {it.label ?? it.path}
                    </span>
                    {it.label ? (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {it.path}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-right">
                    {it.exists
                      ? `${it.files} • ${formatBytes(it.bytes)} (Found)`
                      : "Not found"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-xs text-gray-700 mb-2">
              <input
                id="incl-videos"
                type="checkbox"
                checked={includeVideos}
                onChange={(e) => {
                  setIncludeVideos(e.target.checked);
                  try {
                    setSettings({ includeVideos: e.target.checked });
                  } catch {}
                }}
              />
              <label htmlFor="incl-videos">
                Include videos (may take longer)
              </label>
            </div>
            <button
              type="button"
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
              disabled={loading || starting}
              onClick={async () => {
                setStarting(true);
                setStatus("Starting indexing…");
                try {
                  onQuickStart(paths);
                  const first = items.find((it) => it.exists)?.path || paths[0];
                  const until = Date.now() + 7000;
                  while (Date.now() < until) {
                    try {
                      const r = await fetch(
                        `${API_BASE}/analytics?dir=${encodeURIComponent(
                          first
                        )}&limit=5`
                      );
                      if (r.ok) {
                        const js = (await r.json()) as unknown;
                        const ev = (js.events || []).find(
                          (e: unknown) => e.type === "index"
                        );
                        if (ev) {
                          setStatus(
                            `Indexed ${ev.new}+${ev.updated} (total ${ev.total})`
                          );
                          break;
                        }
                      }
                    } catch {}
                    await new Promise((res) => setTimeout(res, 1000));
                  }
                } finally {
                  setTimeout(() => {
                    setStarting(false);
                    onClose();
                  }, 1000);
                }
              }}
            >
              {loading
                ? "Calculating…"
                : starting
                ? status || "Starting…"
                : `Start indexing (${total} files • ${formatBytes(
                    items.reduce((a, b) => a + (b.bytes || 0), 0)
                  )})`}
            </button>
            {!starting && !loading && (
              <div className="mt-2 text-[11px] text-gray-600">
                Runs in the background; you can start searching.
              </div>
            )}
          </div>
          <div className="border rounded-lg p-4">
            <div className="font-medium mb-1">🎯 Custom Setup</div>
            <div className="text-xs text-gray-600 mb-2">
              Choose specific folders to index
            </div>
            <button
              type="button"
              className="px-3 py-1 rounded border text-sm"
              onClick={onCustom}
            >
              Select Folders…
            </button>
            {typeof (window as unknown).electronAPI?.selectFolder ===
              "function" && (
              <button
                type="button"
                className="ml-2 px-3 py-1 rounded border text-sm"
                onClick={chooseWithOS}
                title="Choose a folder with the system dialog"
              >
                Choose with OS…
              </button>
            )}
            <div className="mt-4 font-medium mb-1">📂 Demo Mode</div>
            <div className="text-xs text-gray-600 mb-2">
              Try with sample photos first
            </div>
            <button
              type="button"
              className="px-3 py-1 rounded border text-sm"
              onClick={onDemo}
            >
              Try Demo
            </button>
            <div className="mt-4 font-medium mb-1">🤖 Import Models</div>
            <div className="text-xs text-gray-600 mb-2">
              Import local AI models for offline use
            </div>
            <button
              type="button"
              className="px-3 py-1 rounded border text-sm"
              onClick={async () => {
                try {
                  const modelDir = await (
                    window as unknown
                  ).electronAPI?.selectFolder?.();
                  if (typeof modelDir === "string" && modelDir.trim()) {
                    setStatus("Validating model directory...");
                    setStarting(true);

                    try {
                      // Validate the directory contains models
                      const validateResp = await fetch(
                        `${API_BASE}/models/validate?dir=${encodeURIComponent(
                          modelDir
                        )}`
                      );
                      const validateData = await validateResp.json();

                      if (validateData.valid) {
                        // Set the model directory
                        await fetch(
                          `${API_BASE}/config/set?key=PHOTOVAULT_MODEL_DIR&value=${encodeURIComponent(
                            modelDir
                          )}`,
                          { method: "POST" }
                        );

                        // Enable offline mode
                        await fetch(
                          `${API_BASE}/config/set?key=TRANSFORMERS_OFFLINE&value=1`,
                          { method: "POST" }
                        );

                        setStatus("Models imported successfully!");
                        setTimeout(() => {
                          alert(
                            `Models imported from: ${modelDir}\n\nYou can now use offline search with the 'local' provider.`
                          );
                          setStarting(false);
                        }, 1000);
                      } else {
                        setStatus("");
                        setStarting(false);
                        alert(
                          `No valid models found in: ${modelDir}\n\nPlease download CLIP models first:\n• HuggingFace: openai/clip-vit-base-patch32\n• Local: Save to ~/.cache/huggingface/hub/`
                        );
                      }
                    } catch (error) {
                      setStatus("");
                      setStarting(false);
                      alert(
                        `Failed to validate models: ${error}\n\nPlease ensure you have downloaded CLIP models to the selected directory.`
                      );
                    }
                  }
                } catch {
                  setStatus("");
                  setStarting(false);
                  alert("Failed to select model directory. Please try again.");
                }
              }}
              disabled={starting}
            >
              {starting ? "Importing..." : "Import Models…"}
            </button>
            <div className="mt-1 text-[10px] text-gray-500">
              Need models? Download from HuggingFace or use existing local
              cache.
            </div>
            <div className="mt-4 font-medium mb-1">🎓 Guided Tour</div>
            <div className="text-xs text-gray-600 mb-2">
              Learn the basics in under a minute
            </div>
            <button
              type="button"
              className="px-3 py-1 rounded border text-sm"
              onClick={() => onTour?.()}
            >
              Start Tour
            </button>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-600">
          This runs locally; nothing leaves your device.
        </div>
        <div className="text-xs text-gray-600">
          You can add or remove folders anytime.
        </div>
        <div className="mt-3 text-right">
          <button
            type="button"
            className="px-3 py-1 rounded border text-sm"
            onClick={onClose}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
