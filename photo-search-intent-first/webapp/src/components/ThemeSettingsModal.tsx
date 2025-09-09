import { useState } from "react";
import {
  X,
  Palette,
  Sun,
  Moon,
  Monitor,
  Contrast,
  Settings,
  RotateCcw,
} from "lucide-react";
import {
  useThemeStore,
  useHighContrast,
  useSettingsStore,
} from "../stores/settingsStore";
import type { ThemeMode, ColorScheme, Density } from "../stores/settingsStore";

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const colorSchemes = [
  { id: "blue" as ColorScheme, name: "Blue", color: "#3b82f6" },
  { id: "green" as ColorScheme, name: "Green", color: "#22c55e" },
  { id: "purple" as ColorScheme, name: "Purple", color: "#a855f7" },
  { id: "orange" as ColorScheme, name: "Orange", color: "#f97316" },
  { id: "gray" as ColorScheme, name: "Gray", color: "#6b7280" },
];

const densities = [
  {
    id: "compact" as Density,
    name: "Compact",
    description: "Tighter spacing, smaller elements",
  },
  {
    id: "normal" as Density,
    name: "Normal",
    description: "Balanced spacing and sizing",
  },
  {
    id: "spacious" as Density,
    name: "Spacious",
    description: "More breathing room, larger elements",
  },
];

export function ThemeSettingsModal({
  isOpen,
  onClose,
}: ThemeSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "appearance" | "colors" | "accessibility"
  >("appearance");

  // Theme store
  const themeMode = useThemeStore((state) => state.themeMode);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const density = useThemeStore((state) => state.density);
  const customColors = useThemeStore((state) => state.customColors);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const setColorScheme = useThemeStore((state) => state.setColorScheme);
  const setDensity = useThemeStore((state) => state.setDensity);
  const setCustomColors = useThemeStore((state) => state.setCustomColors);
  const resetTheme = useThemeStore((state) => state.resetTheme);

  // Settings store
  const highContrast = useHighContrast();
  const setHighContrast = useSettingsStore((state) => state.setHighContrast);

  // Local state for custom colors
  const [tempCustomColors, setTempCustomColors] = useState(
    customColors || {
      primary: "#3b82f6",
      secondary: "#64748b",
      accent: "#3b82f6",
    }
  );

  if (!isOpen) return null;

  const handleCustomColorChange = (
    type: "primary" | "secondary" | "accent",
    color: string
  ) => {
    const newColors = { ...tempCustomColors, [type]: color };
    setTempCustomColors(newColors);
    setCustomColors(newColors);
  };

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setColorScheme(scheme);
    if (scheme !== "custom") {
      setCustomColors(undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Theme Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize your app appearance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
            aria-label="Close theme settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: "appearance" as const, name: "Appearance", icon: Settings },
            { id: "colors" as const, name: "Colors", icon: Palette },
            {
              id: "accessibility" as const,
              name: "Accessibility",
              icon: Contrast,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === "appearance" && (
            <div className="space-y-6">
              {/* Theme Mode */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Theme Mode
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "light" as ThemeMode, name: "Light", icon: Sun },
                    { id: "dark" as ThemeMode, name: "Dark", icon: Moon },
                    { id: "auto" as ThemeMode, name: "Auto", icon: Monitor },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setThemeMode(mode.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        themeMode === mode.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <mode.icon className="w-6 h-6" />
                      <span className="text-sm font-medium">{mode.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Density */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Density
                </h3>
                <div className="space-y-3">
                  {densities.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDensity(d.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        density === d.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {d.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {d.description}
                          </div>
                        </div>
                        {density === d.id && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "colors" && (
            <div className="space-y-6">
              {/* Color Scheme */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Color Scheme
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {colorSchemes.map((scheme) => (
                    <button
                      key={scheme.id}
                      type="button"
                      onClick={() => handleColorSchemeChange(scheme.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        colorScheme === scheme.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: scheme.color }}
                      />
                      <span className="text-sm font-medium">{scheme.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleColorSchemeChange("custom")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      colorScheme === "custom"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center">
                      <Palette className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <span className="text-sm font-medium">Custom</span>
                  </button>
                </div>
              </div>

              {/* Custom Colors */}
              {colorScheme === "custom" && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Custom Colors
                  </h3>
                  <div className="space-y-4">
                    {[
                      { key: "primary", label: "Primary" },
                      { key: "secondary", label: "Secondary" },
                      { key: "accent", label: "Accent" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <label
                          htmlFor={`${key}-color`}
                          className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-16"
                        >
                          {label}
                        </label>
                        <input
                          id={`${key}-color`}
                          type="color"
                          value={
                            tempCustomColors[
                              key as keyof typeof tempCustomColors
                            ]
                          }
                          onChange={(e) =>
                            handleCustomColorChange(
                              key as "primary" | "secondary" | "accent",
                              e.target.value
                            )
                          }
                          className="w-12 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={
                            tempCustomColors[
                              key as keyof typeof tempCustomColors
                            ]
                          }
                          onChange={(e) =>
                            handleCustomColorChange(
                              key as "primary" | "secondary" | "accent",
                              e.target.value
                            )
                          }
                          className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="#000000"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "accessibility" && (
            <div className="space-y-6">
              {/* High Contrast */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  High Contrast Mode
                </h3>
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Contrast className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        High Contrast
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Increases contrast for better accessibility
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setHighContrast?.(!highContrast)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      highContrast
                        ? "bg-blue-600"
                        : "bg-gray-200 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        highContrast ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Reset Theme */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Reset Theme
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    resetTheme();
                    setHighContrast?.(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
