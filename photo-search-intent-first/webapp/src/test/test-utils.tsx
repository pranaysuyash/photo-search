import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { ModalDataProvider } from "../contexts/ModalDataContext";
import { ResultsConfigProvider } from "../contexts/ResultsConfigContext";
import { SearchProvider } from "../contexts/SearchContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { UIProvider } from "../contexts/UIContext";
import { AccessibilityProvider } from "../framework/AccessibilityFramework";
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

// Mock API_BASE and apiAnalytics
vi.mock("../api", () => ({
	API_BASE: "http://localhost:8000",
	apiAnalytics: vi.fn(() => Promise.resolve({ events: [], summary: {} })),
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

// Mock ActionsContext to avoid domain context dependencies
vi.mock("../contexts/ActionsContext", () => ({
	ActionsProvider: ({
		children,
	}: {
		children: React.ReactNode;
		value?: unknown;
	}) => <>{children}</>,
	useActionsContext: () => ({
		doSearchImmediate: vi.fn(),
		loadFav: vi.fn(),
		loadSaved: vi.fn(),
		loadTags: vi.fn(),
		loadDiag: vi.fn(),
		loadFaces: vi.fn(),
		loadMap: vi.fn(),
		loadLibrary: vi.fn(),
		loadMetadata: vi.fn(),
		loadPresets: vi.fn(),
		prepareFast: vi.fn(),
		buildOCR: vi.fn(),
		buildMetadata: vi.fn(),
		monitorOperation: vi.fn(),
		openDetailByPath: vi.fn(),
		navDetail: vi.fn(),
		tagSelected: vi.fn(),
		setRatingSelected: vi.fn(),
		exportSelected: vi.fn(),
		handlePhotoOpen: vi.fn(),
		handlePhotoAction: vi.fn(),
		handleAccessibilitySettingsChange: vi.fn(),
		rowsEqual: vi.fn(),
	}),
	useSearchActions: () => ({
		doSearchImmediate: vi.fn(),
	}),
	useDataActions: () => ({
		loadFav: vi.fn(),
		loadSaved: vi.fn(),
		loadTags: vi.fn(),
		loadDiag: vi.fn(),
		loadFaces: vi.fn(),
		loadMap: vi.fn(),
		loadLibrary: vi.fn(),
		loadMetadata: vi.fn(),
		loadPresets: vi.fn(),
	}),
	useIndexActions: () => ({
		prepareFast: vi.fn(),
		buildOCR: vi.fn(),
		buildMetadata: vi.fn(),
	}),
	useUIActions: () => ({
		monitorOperation: vi.fn(),
	}),
	useSelectionActions: () => ({
		tagSelected: vi.fn(),
		setRatingSelected: vi.fn(),
	}),
	useNavigationActions: () => ({
		openDetailByPath: vi.fn(),
		navDetail: vi.fn(),
	}),
	usePhotoActions: () => ({
		handlePhotoOpen: vi.fn(),
		handlePhotoAction: vi.fn(),
		exportSelected: vi.fn(),
		handleAccessibilitySettingsChange: vi.fn(),
		rowsEqual: vi.fn(),
	}),
}));

// Mock SearchOperationsContext to avoid domain context dependencies
vi.mock("../contexts/domains/SearchOperationsContext", () => ({
	SearchOperationsProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	useSearchOperationsContext: () => ({
		doSearchImmediate: vi.fn(),
		doSearchWithFilters: vi.fn(),
		searchId: "",
		searchResults: [],
		searchQuery: "",
		topK: 24,
		setSearchResults: vi.fn(),
		setSearchId: vi.fn(),
		setSearchQuery: vi.fn(),
		setTopK: vi.fn(),
		resetSearch: vi.fn(),
		useCaps: false,
		useOcr: false,
		useFast: false,
		fastKind: "",
		setUseCaps: vi.fn(),
		setUseOcr: vi.fn(),
		setUseFast: vi.fn(),
		setFastKind: vi.fn(),
		error: null,
		clearError: vi.fn(),
		retryLastAction: vi.fn(),
	}),
	useSearchExecution: () => ({
		doSearchImmediate: vi.fn(),
		doSearchWithFilters: vi.fn(),
		error: null,
		clearError: vi.fn(),
		retryLastAction: vi.fn(),
	}),
	useSearchState: () => ({
		searchId: "",
		searchResults: [],
		searchQuery: "",
		topK: 24,
		setSearchResults: vi.fn(),
		setSearchId: vi.fn(),
		setSearchQuery: vi.fn(),
		setTopK: vi.fn(),
		resetSearch: vi.fn(),
	}),
	useSearchConfiguration: () => ({
		useCaps: false,
		useOcr: false,
		useFast: false,
		fastKind: "",
		setUseCaps: vi.fn(),
		setUseOcr: vi.fn(),
		setUseFast: vi.fn(),
		setFastKind: vi.fn(),
	}),
}));

// Mock lazy components used in RoutesHost
vi.mock("../components/MapView", () => ({
	default: vi.fn(() => null),
}));

vi.mock("../components/SmartDiscovery", () => ({
	default: vi.fn(() => null),
}));

vi.mock("../components/AutoCurationPanel", () => ({
	default: vi.fn(() => null),
}));

vi.mock("../components/VisualTools", () => ({
	default: vi.fn(() => null),
}));

vi.mock("../components/CollaborativeWorkspace", () => ({
	default: vi.fn(() => null),
}));

vi.mock("../components/SocialSharingModal", () => ({
	default: vi.fn(() => null),
}));

vi.mock("../components/TripsView", () => ({
	default: vi.fn(() => null),
}));

vi.mock("../components/VideoManager", () => ({
	VideoManager: vi.fn(() => null),
}));

// Test wrapper that provides all necessary contexts
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	// Create a client for testing
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000, // 5 minutes
				gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
				retry: false, // Disable retries in tests
			},
		},
	});

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
		<QueryClientProvider client={queryClient}>
			<ErrorBoundary>
				<BrowserRouter
					future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
				>
					<ThemeProvider>
						<SettingsProvider>
							<UIProvider>
								<SimpleStoreProvider>
									<PhotoVaultAPIProvider>
										<JobsProvider>
											<LibraryProvider>
												<SearchProvider>
													<AccessibilityProvider>
														<ModalProvider>
															<ModalDataProvider
																data={{
																	selected: new Set(),
																	dir: "",
																	engine: "local",
																	topK: 100,
																	highContrast: false,
																	useFast: false,
																	fastKind: "",
																	useCaps: false,
																	useOcr: false,
																	hasText: false,
																	useOsTrash: false,
																	searchText: "",
																	query: "",
																	collections: {},
																	clusters: [],
																	allTags: [],
																	meta: { cameras: [], places: [] },
																}}
																actions={{
																	settingsActions: {
																		setDir: vi.fn(),
																		setUseOsTrash: vi.fn(),
																		setUseFast: vi.fn(),
																		setFastKind: vi.fn(),
																		setUseCaps: vi.fn(),
																		setUseOcr: vi.fn(),
																		setHasText: vi.fn(),
																		setHighContrast: vi.fn(),
																	},
																	uiActions: {
																		setBusy: vi.fn(),
																		setNote: vi.fn(),
																	},
																	photoActions: {
																		setResults: vi.fn(),
																		setSaved: vi.fn(),
																		setCollections: vi.fn(),
																	},
																	libIndex: vi.fn(),
																	prepareFast: vi.fn(),
																	buildOCR: vi.fn(),
																	buildMetadata: vi.fn(),
																	tagSelected: vi.fn(),
																}}
															>
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
															</ModalDataProvider>
														</ModalProvider>
													</AccessibilityProvider>
												</SearchProvider>
											</LibraryProvider>
										</JobsProvider>
									</PhotoVaultAPIProvider>
								</SimpleStoreProvider>
							</UIProvider>
						</SettingsProvider>
					</ThemeProvider>
				</BrowserRouter>
			</ErrorBoundary>
		</QueryClientProvider>
	);
}; // Custom render function that includes all providers
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
