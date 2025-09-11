import { type RenderOptions, render } from "@testing-library/react";
import type React from "react";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { HintManager, HintProvider } from "../components/HintSystem";
import { MobileOptimizations } from "../components/MobileOptimizations";
import { ThemeProvider } from "../components/ThemeProvider";
import { UIProvider } from "../contexts/UIContext";
import { initializeAPI } from "../services/PhotoVaultAPI";
import { PhotoVaultAPIProvider } from "../services/PhotoVaultAPIProvider";
import { SimpleStoreProvider } from "../stores/SimpleStore";
import "@testing-library/jest-dom/vitest";

// Helpful: surface a console hint if the API enforces auth but frontend lacks token
if (typeof window !== "undefined") {
  const token = (import.meta as any).env?.VITE_API_TOKEN || localStorage.getItem("api_token");
  if (!token) {
    // eslint-disable-next-line no-console
    console.info(
      "Tip: If your API sets API_TOKEN, add VITE_API_TOKEN in webapp .env or localStorage.setItem('api_token', '<value>').",
    );
  }
}

// Mock the accessibility settings hook
vi.mock("../components/AccessibilityPanel", () => ({
	useAccessibilitySettings: () => ({
		settings: {
			highContrast: false,
			largeText: false,
			reducedMotion: false,
			screenReader: false,
			keyboardNavigation: true,
			focusIndicators: true,
			colorBlindFriendly: false,
			fontSize: "medium",
			theme: "light",
		},
		updateSettings: vi.fn(),
	}),
}));

// Mock the theme store (simulate Zustand selector behavior)
vi.mock("../stores/settingsStore", () => {
	const mockState = {
		themeMode: "light" as const,
		colorScheme: "blue" as const,
		density: "normal" as const,
		customColors: undefined as
			| undefined
			| {
					primary: string;
					secondary: string;
					accent: string;
			  },
		setThemeMode: vi.fn(),
		setColorScheme: vi.fn(),
		setDensity: vi.fn(),
		setCustomColors: vi.fn(),
		resetTheme: vi.fn(),
	};

	const useThemeStore = (selector?: (s: typeof mockState) => unknown) => {
		return selector ? selector(mockState) : mockState;
	};

	// Minimal settings store used by some UI components (e.g., ThemeSettingsModal)
	const settingsStore = {
		dir: "/test/dir",
		engine: "local",
		hfToken: "",
		openaiKey: "",
		useFast: false,
		fastKind: "",
		useCaps: false,
		vlmModel: "Qwen/Qwen2-VL-2B-Instruct",
		useOcr: false,
		hasText: false,
		useOsTrash: false,
		showExplain: false,
		showInfoOverlay: false,
		highContrast: false,
		camera: "",
		isoMin: "",
		isoMax: "",
		fMin: "",
		fMax: "",
		place: "",
		setHighContrast: vi.fn(),
	};

	const useSettingsStore = (
		selector?: (s: typeof settingsStore) => unknown,
	) => {
		return selector ? selector(settingsStore) : settingsStore;
	};

	return {
		useHighContrast: () => false,
		useThemeMode: () => mockState.themeMode,
		useColorScheme: () => mockState.colorScheme,
		useDensity: () => mockState.density,
		useCustomColors: () => mockState.customColors,
		useThemeActions: () => ({
			setThemeMode: mockState.setThemeMode,
			setColorScheme: mockState.setColorScheme,
			setDensity: mockState.setDensity,
			setCustomColors: mockState.setCustomColors,
			resetTheme: mockState.resetTheme,
		}),
		useThemeStore,
		useSettingsStore,
	};
});

// Mock mobile detection
vi.mock("../components/MobileOptimizations", () => ({
	useMobileDetection: () => ({
		isMobile: false,
		isTablet: false,
		screenSize: "desktop",
	}),
	useHapticFeedback: () => ({
		trigger: vi.fn(),
	}),
	MobileOptimizations: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

// Mock onboarding
vi.mock("../components/OnboardingTour", () => ({
	useOnboarding: () => ({
		hasCompletedTour: true,
		completeTour: vi.fn(),
	}),
	OnboardingTour: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	ContextualHint: () => null,
}));

// Test wrapper that provides all necessary contexts
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	// Minimal browser polyfills for JSDOM
	if (typeof window !== "undefined" && !window.matchMedia) {
		// Basic matchMedia stub used by ThemeProvider
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).matchMedia = (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		});
	}

	// Initialize API singleton so usePhotoVaultAPI can fallback safely
	initializeAPI({ dir: "/test", provider: "local" });

	return (
		<ErrorBoundary>
			<BrowserRouter>
				<ThemeProvider>
					<UIProvider>
						<SimpleStoreProvider>
							<PhotoVaultAPIProvider>
								<HintProvider>
									<HintManager>
										<MobileOptimizations
											onSwipeLeft={vi.fn()}
											onSwipeRight={vi.fn()}
											onSwipeUp={vi.fn()}
											enableSwipeGestures={false}
											enablePullToRefresh={false}
											onPullToRefresh={vi.fn()}
										>
											{children}
										</MobileOptimizations>
									</HintManager>
								</HintProvider>
							</PhotoVaultAPIProvider>
						</SimpleStoreProvider>
					</UIProvider>
				</ThemeProvider>
			</BrowserRouter>
		</ErrorBoundary>
	);
};

// Custom render function that includes all providers
const customRender = (
	ui: React.ReactElement,
	options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Export AllTheProviders for use in individual tests
export { AllTheProviders };
