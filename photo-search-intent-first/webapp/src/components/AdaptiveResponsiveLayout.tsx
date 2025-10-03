import {
	Maximize2,
	Minimize2,
	Monitor,
	Smartphone,
	Tablet,
} from "lucide-react";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

interface UserIntent {
	primary: "explore" | "organize" | "find" | "demo" | "unsure";
	confidence: number;
	context?: string;
}

interface ViewportContext {
	width: number;
	height: number;
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	orientation: "portrait" | "landscape";
	deviceType: "mobile" | "tablet" | "desktop";
}

interface AdaptiveLayoutConfig {
	// Layout preferences based on user intent
	sidebarWidth: string;
	gridColumns: number;
	thumbnailSize: "sm" | "md" | "lg" | "xl";
	showFilters: boolean;
	showStats: boolean;
	compactMode: boolean;
	prioritizeSearch: boolean;
	showQuickActions: boolean;
	layoutDensity: "comfortable" | "compact" | "spacious";
}

interface AdaptiveResponsiveContextType extends ViewportContext {
	layoutConfig: AdaptiveLayoutConfig;
	updateLayoutConfig: (updates: Partial<AdaptiveLayoutConfig>) => void;
	userIntent: UserIntent;
	setUserIntent: (intent: UserIntent) => void;
	isFullscreen: boolean;
	toggleFullscreen: () => void;
	getOptimalLayout: () => AdaptiveLayoutConfig;
}

const AdaptiveResponsiveContext =
	createContext<AdaptiveResponsiveContextType | null>(null);

// Intent-based layout configurations
const getIntentLayoutConfigs = (
	intent: UserIntent,
	viewport: ViewportContext,
): AdaptiveLayoutConfig => {
	const baseConfig: AdaptiveLayoutConfig = {
		sidebarWidth: viewport.isMobile
			? "w-16"
			: viewport.isTablet
				? "w-20"
				: "w-64",
		gridColumns: viewport.isMobile ? 2 : viewport.isTablet ? 3 : 4,
		thumbnailSize: viewport.isMobile ? "sm" : "md",
		showFilters: !viewport.isMobile,
		showStats: !viewport.isMobile,
		compactMode: viewport.isMobile,
		prioritizeSearch: true,
		showQuickActions: !viewport.isMobile,
		layoutDensity: "comfortable",
	};

	switch (intent.primary) {
		case "find":
			return {
				...baseConfig,
				prioritizeSearch: true,
				showFilters: true,
				showQuickActions: true,
				thumbnailSize: viewport.isMobile ? "md" : "lg",
				gridColumns: viewport.isMobile ? 2 : viewport.isTablet ? 3 : 5,
				layoutDensity: "compact",
				sidebarWidth: viewport.isMobile ? "w-16" : "w-48",
			};

		case "organize":
			return {
				...baseConfig,
				showStats: true,
				showQuickActions: true,
				thumbnailSize: "sm",
				gridColumns: viewport.isMobile ? 3 : viewport.isTablet ? 4 : 6,
				layoutDensity: "compact",
				sidebarWidth: viewport.isMobile ? "w-20" : "w-72",
			};

		case "explore":
			return {
				...baseConfig,
				thumbnailSize: viewport.isMobile ? "md" : "xl",
				gridColumns: viewport.isMobile ? 1 : viewport.isTablet ? 2 : 3,
				layoutDensity: "spacious",
				showFilters: false,
				prioritizeSearch: false,
			};

		case "demo":
			return {
				...baseConfig,
				thumbnailSize: "lg",
				gridColumns: viewport.isMobile ? 2 : viewport.isTablet ? 3 : 4,
				layoutDensity: "comfortable",
				showQuickActions: true,
				prioritizeSearch: true,
			};

		default:
			return baseConfig;
	}
};

export function AdaptiveResponsiveProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [viewport, setViewport] = useState<ViewportContext>({
		width: typeof window !== "undefined" ? window.innerWidth : 1024,
		height: typeof window !== "undefined" ? window.innerHeight : 768,
		isMobile: typeof window !== "undefined" ? window.innerWidth < 768 : false,
		isTablet:
			typeof window !== "undefined"
				? window.innerWidth >= 768 && window.innerWidth < 1024
				: false,
		isDesktop: typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
		orientation:
			typeof window !== "undefined"
				? window.innerWidth > window.innerHeight
					? "landscape"
					: "portrait"
				: "landscape",
		deviceType:
			typeof window !== "undefined"
				? window.innerWidth < 768
					? "mobile"
					: window.innerWidth < 1024
						? "tablet"
						: "desktop"
				: "desktop",
	});

	const [userIntent, setUserIntentState] = useState<UserIntent>({
		primary: "unsure",
		confidence: 0,
	});
	const [layoutConfig, setLayoutConfig] = useState<AdaptiveLayoutConfig>(() =>
		getIntentLayoutConfigs(userIntent, viewport),
	);
	const [isFullscreen, setIsFullscreen] = useState(false);

	// Load user intent from localStorage
	useEffect(() => {
		try {
			const stored = localStorage.getItem("userIntent");
			if (stored) {
				const intent = JSON.parse(stored);
				setUserIntentState(intent);
			}
		} catch (error) {
			console.log("Could not load user intent:", error);
		}
	}, []);

	// Update viewport on resize
	useEffect(() => {
		const handleResize = () => {
			const newViewport: ViewportContext = {
				width: window.innerWidth,
				height: window.innerHeight,
				isMobile: window.innerWidth < 768,
				isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
				isDesktop: window.innerWidth >= 1024,
				orientation:
					window.innerWidth > window.innerHeight ? "landscape" : "portrait",
				deviceType:
					window.innerWidth < 768
						? "mobile"
						: window.innerWidth < 1024
							? "tablet"
							: "desktop",
			};

			setViewport(newViewport);
			setLayoutConfig(getIntentLayoutConfigs(userIntent, newViewport));
		};

		if (typeof window !== "undefined") {
			window.addEventListener("resize", handleResize);
			handleResize(); // Initial call

			return () => window.removeEventListener("resize", handleResize);
		}
	}, [userIntent]);

	// Update layout when user intent changes
	useEffect(() => {
		setLayoutConfig(getIntentLayoutConfigs(userIntent, viewport));
	}, [userIntent, viewport]);

	// Update layout config
	const updateLayoutConfig = (updates: Partial<AdaptiveLayoutConfig>) => {
		setLayoutConfig((prev) => ({ ...prev, ...updates }));

		// Persist user preferences
		try {
			localStorage.setItem(
				"layoutPreferences",
				JSON.stringify({ ...layoutConfig, ...updates }),
			);
		} catch (error) {
			console.log("Could not save layout preferences:", error);
		}
	};

	// Get optimal layout based on current context
	const getOptimalLayout = (): AdaptiveLayoutConfig => {
		return getIntentLayoutConfigs(userIntent, viewport);
	};

	// Fullscreen toggle
	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
			setIsFullscreen(true);
		} else {
			document.exitFullscreen();
			setIsFullscreen(false);
		}
	};

	// Listen for fullscreen changes
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};

		document.addEventListener("fullscreenchange", handleFullscreenChange);
		return () =>
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
	}, []);

	const contextValue: AdaptiveResponsiveContextType = {
		...viewport,
		layoutConfig,
		updateLayoutConfig,
		userIntent,
		setUserIntent: setUserIntentState,
		isFullscreen,
		toggleFullscreen,
		getOptimalLayout,
	};

	return (
		<AdaptiveResponsiveContext.Provider value={contextValue}>
			{children}
		</AdaptiveResponsiveContext.Provider>
	);
}

// Hook for using adaptive responsive context
export function useAdaptiveResponsive() {
	const context = useContext(AdaptiveResponsiveContext);
	if (!context) {
		throw new Error(
			"useAdaptiveResponsive must be used within AdaptiveResponsiveProvider",
		);
	}
	return context;
}

// Convenience hooks for specific layout concerns
export function useViewport() {
	const {
		width,
		height,
		isMobile,
		isTablet,
		isDesktop,
		orientation,
		deviceType,
	} = useAdaptiveResponsive();
	return {
		width,
		height,
		isMobile,
		isTablet,
		isDesktop,
		orientation,
		deviceType,
	};
}

export function useLayoutConfig() {
	const { layoutConfig, updateLayoutConfig, getOptimalLayout } =
		useAdaptiveResponsive();
	return { layoutConfig, updateLayoutConfig, getOptimalLayout };
}

export function useUserIntent() {
	const { userIntent, setUserIntent } = useAdaptiveResponsive();
	return { userIntent, setUserIntent };
}

// Responsive utility components
export function ResponsiveGrid({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	const { layoutConfig } = useAdaptiveResponsive();

	const gridClasses = {
		1: "grid-cols-1",
		2: "grid-cols-2",
		3: "grid-cols-3",
		4: "grid-cols-4",
		5: "grid-cols-5",
		6: "grid-cols-6",
	};

	return (
		<div
			className={`grid ${gridClasses[layoutConfig.gridColumns as keyof typeof gridClasses]} gap-${layoutConfig.layoutDensity === "spacious" ? "6" : layoutConfig.layoutDensity === "compact" ? "2" : "4"} ${className}`}
		>
			{children}
		</div>
	);
}

export function ResponsiveSidebar({ children }: { children: ReactNode }) {
	const { layoutConfig, isMobile } = useAdaptiveResponsive();

	if (isMobile) {
		return (
			<div
				className={`fixed inset-y-0 left-0 z-40 ${layoutConfig.sidebarWidth} bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out`}
			>
				{children}
			</div>
		);
	}

	return (
		<div
			className={`${layoutConfig.sidebarWidth} bg-white border-r border-gray-200 transition-all duration-200`}
		>
			{children}
		</div>
	);
}

export function ResponsiveContainer({ children }: { children: ReactNode }) {
	const { isMobile, isTablet } = useAdaptiveResponsive();

	return (
		<div
			className={`flex-1 ${isMobile ? "px-2" : isTablet ? "px-4" : "px-6"} py-4`}
		>
			{children}
		</div>
	);
}

// Intent-aware layout switcher
export function IntentLayoutSwitcher() {
	const { userIntent, layoutConfig, updateLayoutConfig, getOptimalLayout } =
		useAdaptiveResponsive();

	const handleResetToOptimal = () => {
		const optimal = getOptimalLayout();
		updateLayoutConfig(optimal);
	};

	const densityOptions = [
		{ value: "compact", label: "Compact" },
		{ value: "comfortable", label: "Comfortable" },
		{ value: "spacious", label: "Spacious" },
	] as const;

	return (
		<div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
			<div className="flex items-center gap-2 text-sm text-gray-600">
				<span>Intent:</span>
				<span className="font-medium capitalize">{userIntent.primary}</span>
				{userIntent.confidence > 0.5 && (
					<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
						{Math.round(userIntent.confidence * 100)}%
					</span>
				)}
			</div>

			<div className="flex items-center gap-2">
				<span className="text-sm text-gray-600">Density:</span>
				<select
					value={layoutConfig.layoutDensity}
					onChange={(e) =>
						updateLayoutConfig({ layoutDensity: e.target.value as unknown })
					}
					className="text-sm border border-gray-300 rounded px-2 py-1"
				>
					{densityOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>

			<button
				type="button"
				onClick={handleResetToOptimal}
				className="text-sm text-blue-600 hover:text-blue-700 font-medium"
			>
				Reset to Optimal
			</button>
		</div>
	);
}

// Viewport indicator for development
export function ViewportIndicator() {
	const { width, height, deviceType, orientation, isFullscreen } =
		useAdaptiveResponsive();

	if (process.env.NODE_ENV !== "development") {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded-lg text-xs z-50">
			<div className="flex items-center gap-2">
				{deviceType === "mobile" && <Smartphone className="w-3 h-3" />}
				{deviceType === "tablet" && <Tablet className="w-3 h-3" />}
				{deviceType === "desktop" && <Monitor className="w-3 h-3" />}
				<span>{deviceType}</span>
				<span>
					{width}×{height}
				</span>
				<span>{orientation}</span>
				{isFullscreen ? (
					<Maximize2 className="w-3 h-3" />
				) : (
					<Minimize2 className="w-3 h-3" />
				)}
			</div>
		</div>
	);
}
