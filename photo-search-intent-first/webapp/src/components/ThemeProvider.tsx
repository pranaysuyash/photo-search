import { useEffect, useMemo } from "react";
import { useThemeStore, useHighContrast } from "../stores/settingsStore";

// Color scheme definitions
const colorSchemes = {
  blue: {
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
    },
    secondary: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    accent: "#3b82f6",
  },
  green: {
    primary: {
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
      900: "#14532d",
    },
    secondary: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    accent: "#22c55e",
  },
  purple: {
    primary: {
      50: "#faf5ff",
      100: "#f3e8ff",
      200: "#e9d5ff",
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7",
      600: "#9333ea",
      700: "#7c3aed",
      800: "#6b21a8",
      900: "#581c87",
    },
    secondary: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    accent: "#a855f7",
  },
  orange: {
    primary: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
    },
    secondary: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    accent: "#f97316",
  },
  gray: {
    primary: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },
    secondary: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    accent: "#6b7280",
  },
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeMode = useThemeStore((state) => state.themeMode);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const density = useThemeStore((state) => state.density);
  const customColors = useThemeStore((state) => state.customColors);
  const highContrast = useHighContrast();

  // Determine actual theme mode (resolving 'auto')
  const actualThemeMode = useMemo(() => {
    if (themeMode === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return themeMode;
  }, [themeMode]);

  // Generate CSS variables based on theme
  const cssVariables = useMemo(() => {
    const scheme = customColors
      ? {
          primary: customColors.primary,
          secondary: customColors.secondary,
          accent: customColors.accent,
        }
      : colorSchemes[colorScheme as keyof typeof colorSchemes];

    const variables: Record<string, string> = {};

    // Primary colors
    if (customColors) {
      variables["--color-primary"] = customColors.primary;
      variables["--color-primary-hover"] = customColors.primary;
      variables["--color-primary-active"] = customColors.primary;
    } else {
      Object.entries(scheme.primary).forEach(([key, value]) => {
        variables[`--color-primary-${key}`] = value as string;
      });
    }

    // Secondary colors
    if (customColors) {
      variables["--color-secondary"] = customColors.secondary;
    } else {
      Object.entries(scheme.secondary).forEach(([key, value]) => {
        variables[`--color-secondary-${key}`] = value as string;
      });
    }

    // Accent color
    variables["--color-accent"] = customColors
      ? customColors.accent
      : scheme.accent;

    // Theme-specific colors
    if (actualThemeMode === "dark") {
      variables["--color-background"] = "#0f172a";
      variables["--color-surface"] = "#1e293b";
      variables["--color-surface-hover"] = "#334155";
      variables["--color-border"] = "#334155";
      variables["--color-border-hover"] = "#475569";
      variables["--color-text-primary"] = "#f8fafc";
      variables["--color-text-secondary"] = "#cbd5e1";
      variables["--color-text-tertiary"] = "#94a3b8";
    } else {
      variables["--color-background"] = "#ffffff";
      variables["--color-surface"] = "#f8fafc";
      variables["--color-surface-hover"] = "#f1f5f9";
      variables["--color-border"] = "#e2e8f0";
      variables["--color-border-hover"] = "#cbd5e1";
      variables["--color-text-primary"] = "#0f172a";
      variables["--color-text-secondary"] = "#475569";
      variables["--color-text-tertiary"] = "#64748b";
    }

    // High contrast overrides
    if (highContrast) {
      variables["--color-background"] = "#000000";
      variables["--color-surface"] = "#000000";
      variables["--color-surface-hover"] = "#000000";
      variables["--color-border"] = "#ffffff";
      variables["--color-border-hover"] = "#ffffff";
      variables["--color-text-primary"] = "#ffffff";
      variables["--color-text-secondary"] = "#ffffff";
      variables["--color-text-tertiary"] = "#ffffff";
      variables["--color-primary"] = "#ffffff";
      variables["--color-accent"] = "#00ff00";
    }

    return variables;
  }, [actualThemeMode, colorScheme, customColors, highContrast]);

  // Apply CSS variables and classes to document
  useEffect(() => {
    const root = document.documentElement;

    // Apply CSS variables
    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply theme class
    root.classList.remove("light", "dark");
    root.classList.add(actualThemeMode);

    // Apply density class
    root.classList.remove(
      "density-compact",
      "density-normal",
      "density-spacious"
    );
    root.classList.add(`density-${density}`);

    // Apply high contrast class
    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  }, [cssVariables, actualThemeMode, density, highContrast]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (themeMode !== "auto") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Force re-render by updating state
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(
        mediaQuery.matches ? "dark" : "light"
      );
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  return <>{children}</>;
}
