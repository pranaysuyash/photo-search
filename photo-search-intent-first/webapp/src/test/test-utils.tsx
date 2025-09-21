import { type RenderOptions, render } from "@testing-library/react";
import type React from "react";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";
import ErrorBoundary from "../components/ErrorBoundary";
import { HintManager, HintProvider } from "../components/HintSystem";
import { MobileOptimizations } from "../components/MobileOptimizations";
import { ThemeProvider } from "../components/ThemeProvider";
import { JobsProvider } from "../contexts/JobsContext";
import { LibraryProvider } from "../contexts/LibraryContext";
import { ModalProvider } from "../contexts/ModalContext";
import { ResultsConfigProvider } from "../contexts/ResultsConfigContext";
import { SearchProvider } from "../contexts/SearchContext";
import { UIProvider } from "../contexts/UIContext";
import { initializeAPI } from "../services/PhotoVaultAPI";
import { PhotoVaultAPIProvider } from "../services/PhotoVaultAPIProvider";
import { SimpleStoreProvider } from "../stores/SimpleStore";
import "@testing-library/jest-dom/vitest";

// Helpful: surface a console hint if the API enforces auth but frontend lacks token
if (typeof window !== "undefined") {
	// Vite's import.meta.env typing in tests can be loose; cast for safety
	const meta = import.meta as ImportMeta & { env?: Record<string, string> };
	const token = meta.env?.VITE_API_TOKEN || localStorage.getItem("api_token");
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
vi.mock("../stores/settingsStore", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../stores/settingsStore")>();

	const themeState = {
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
	};

	const themeActions = {
		setThemeMode: vi.fn((value: (typeof themeState)["themeMode"]) => {
			themeState.themeMode = value;
		}),
		setColorScheme: vi.fn((value: (typeof themeState)["colorScheme"]) => {
			themeState.colorScheme = value;
		}),
		setDensity: vi.fn((value: (typeof themeState)["density"]) => {
			themeState.density = value;
		}),
		setCustomColors: vi.fn(
			(value?: { primary: string; secondary: string; accent: string }) => {
				themeState.customColors = value;
			},
		),
		resetTheme: vi.fn(() => {
			themeState.themeMode = "auto";
			themeState.colorScheme = "blue";
			themeState.density = "normal";
			themeState.customColors = undefined;
		}),
	};

	const useThemeStore = (
		selector?: (state: typeof themeState & typeof themeActions) => unknown,
	) => {
		const combined = { ...themeState, ...themeActions };
		return selector ? selector(combined) : combined;
	};

	const settingsState = {
		dir: "/test/dir",
		engine: "local" as const,
		hfToken: "",
		openaiKey: "",
		useFast: false,
		fastKind: "",
		useCaps: false,
		vlmModel: "Qwen/Qwen2-VL-2B-Instruct",
		useOcr: false,
		hasText: false,
		useOsTrash: false,
		searchCommandCenter: false,
		showExplain: false,
		showInfoOverlay: false,
		highContrast: false,
		enableDemoLibrary: true,
		camera: "",
		isoMin: 0,
		isoMax: 0,
		fMin: 0,
		fMax: 0,
		place: "",
	};

	const assign = <K extends keyof typeof settingsState>(key: K) =>
		vi.fn((value: (typeof settingsState)[K]) => {
			settingsState[key] = value;
		});

	const settingsActions = {
		setDir: assign("dir"),
		setEngine: assign("engine"),
		setHfToken: assign("hfToken"),
		setOpenaiKey: assign("openaiKey"),
		setUseFast: assign("useFast"),
		setFastKind: assign("fastKind"),
		setUseCaps: assign("useCaps"),
		setVlmModel: assign("vlmModel"),
		setUseOcr: assign("useOcr"),
		setHasText: assign("hasText"),
		setUseOsTrash: assign("useOsTrash"),
		setSearchCommandCenter: assign("searchCommandCenter"),
		setShowExplain: assign("showExplain"),
		setShowInfoOverlay: assign("showInfoOverlay"),
		setHighContrast: assign("highContrast"),
		setEnableDemoLibrary: assign("enableDemoLibrary"),
		setCamera: assign("camera"),
		setIsoMin: vi.fn((value: number | string) => {
			settingsState.isoMin = Number(value) || 0;
		}),
		setIsoMax: vi.fn((value: number | string) => {
			settingsState.isoMax = Number(value) || 0;
		}),
		setFMin: vi.fn((value: number | string) => {
			settingsState.fMin = Number(value) || 0;
		}),
		setFMax: vi.fn((value: number | string) => {
			settingsState.fMax = Number(value) || 0;
		}),
		setPlace: assign("place"),
	};

	const useSettingsStore = (
		selector?: (
			state: typeof settingsState & typeof settingsActions,
		) => unknown,
	) => {
		const combined = { ...settingsState, ...settingsActions };
		return selector ? selector(combined) : combined;
	};

	return {
		...actual,
		useThemeStore,
		useThemeMode: () => themeState.themeMode,
		useColorScheme: () => themeState.colorScheme,
		useDensity: () => themeState.density,
		useCustomColors: () => themeState.customColors,
		useThemeActions: () => themeActions,
		useSettingsStore,
		useDir: () => settingsState.dir,
		useEngine: () => settingsState.engine,
		useHfToken: () => settingsState.hfToken,
		useOpenaiKey: () => settingsState.openaiKey,
		useFastIndexEnabled: () => settingsState.useFast,
		useFastKind: () => settingsState.fastKind,
		useCaptionsEnabled: () => settingsState.useCaps,
		useOcrEnabled: () => settingsState.useOcr,
		useHasText: () => settingsState.hasText,
		useOsTrashEnabled: () => settingsState.useOsTrash,
		useSearchCommandCenter: () => settingsState.searchCommandCenter,
		useShowExplain: () => settingsState.showExplain,
		useShowInfoOverlay: () => settingsState.showInfoOverlay,
		useHighContrast: () => settingsState.highContrast,
		useEnableDemoLibrary: () => settingsState.enableDemoLibrary,
		useCamera: () => settingsState.camera,
		useIsoMin: () => settingsState.isoMin,
		useIsoMax: () => settingsState.isoMax,
		useFMin: () => settingsState.fMin,
		useFMax: () => settingsState.fMax,
		usePlace: () => settingsState.place,
		useNeedsHf: () => false,
		useNeedsOAI: () => false,
		useSettingsActions: () => settingsActions,
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
	const w = window as unknown as {
		matchMedia?: (query: string) => MediaQueryList;
		IntersectionObserver?: typeof IntersectionObserver;
	};
	if (typeof window !== "undefined" && !w.matchMedia) {
		// Basic matchMedia stub used by ThemeProvider
		// eslint-disable-next-line @typescript-eslint/no-explicit-unknown
		w.matchMedia = (query: string) => ({
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

	// Minimal IntersectionObserver polyfill for JSDOM
	if (typeof window !== "undefined" && !w.IntersectionObserver) {
		class IO implements IntersectionObserver {
			readonly root: Element | Document | null = null;
			readonly rootMargin: string = "0px";
			readonly thresholds: ReadonlyArray<number> = [];
			constructor(
				_cb: IntersectionObserverCallback,
				_opts?: IntersectionObserverInit,
			) {}
			observe(): void {}
			unobserve(): void {}
			disconnect(): void {}
			takeRecords(): IntersectionObserverEntry[] {
				return [];
			}
		}
		w.IntersectionObserver = IO as unknown as typeof IntersectionObserver;
	}

	return (
		<ErrorBoundary>
			<BrowserRouter>
				<ThemeProvider>
					<UIProvider>
						<SimpleStoreProvider>
							<PhotoVaultAPIProvider>
								<JobsProvider>
									<LibraryProvider>
										<SearchProvider>
											<ModalProvider>
												<HintProvider>
													<HintManager>
														<ResultsConfigProvider
															value={{
																resultView: "grid",
																setResultView: () => {},
																timelineBucket: "day",
																setTimelineBucket: () => {},
															}}
														>
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
														</ResultsConfigProvider>
													</HintManager>
												</HintProvider>
											</ModalProvider>
										</SearchProvider>
									</LibraryProvider>
								</JobsProvider>
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
