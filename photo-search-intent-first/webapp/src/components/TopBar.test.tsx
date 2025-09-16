import { describe, expect, it, vi } from "vitest";
import { TopBar } from "../components/TopBar";
import { render, screen } from "../test/test-utils";

// Mock the UIContext (partial: keep UIProvider export)
vi.mock("../contexts/UIContext", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../contexts/UIContext")>();
	return {
		...actual,
		useUIContext: () => ({
			state: {
				sidebarOpen: true,
				theme: "light",
				modals: { help: false, onboarding: false },
			},
			actions: {
				toggleSidebar: vi.fn(),
				setTheme: vi.fn(),
				openModal: vi.fn(),
				closeModal: vi.fn(),
			},
		}),
	};
});

// Mock the SearchBar component
vi.mock("../components/SearchBar", () => ({
	SearchBar: () => <div data-testid="search-bar">SearchBar</div>,
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
    motion: {
        button: ({
            children,
            ...props
        }: {
            children?: React.ReactNode;
            [key: string]: unknown;
        }) => {
            // Strip motion-only props to avoid DOM warnings in tests
            const {
                whileHover,
                whileTap,
                initial,
                animate,
                exit,
                transition,
                variants,
                layout,
                layoutId,
                drag,
                dragConstraints,
                dragElastic,
                dragMomentum,
                ...rest
            } = props as any
            return (
                <button type="button" {...rest}>
                    {children}
                </button>
            )
        },
    },
}));

// Ensure the feature-flagged Search Command Center is disabled so TopBar renders SearchBar
// Merge with actual module to avoid breaking other hooks used by providers
vi.mock("../stores/settingsStore", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../stores/settingsStore")>();
	return {
		...actual,
		useSearchCommandCenter: () => false,
	};
});

// Mock lucide-react icons (include icons used by ErrorBoundary as it is always imported in test wrapper)
vi.mock("lucide-react", () => ({
	BookmarkPlus: () => <div>BookmarkPlus</div>,
	Download: () => <div>Download</div>,
	Filter: () => <div>Filter</div>,
	FolderOpen: () => <div>FolderOpen</div>,
	Grid: () => <div>Grid</div>,
	List: () => <div>List</div>,
	Search: () => <div>Search</div>,
	Tag: () => <div>Tag</div>,
	Info: () => <div>Info</div>,
	Menu: () => <div>Menu</div>,
	MoreHorizontal: () => <div>MoreHorizontal</div>,
	Palette: () => <div>Palette</div>,
	Settings: () => <div>Settings</div>,
	Trash2: () => <div>Trash2</div>,
	Clock: () => <div>Clock</div>,
	History: () => <div>History</div>,
	TrendingUp: () => <div>TrendingUp</div>,
	AlertTriangle: () => <div>AlertTriangle</div>,
	Home: () => <div>Home</div>,
	RefreshCw: () => <div>RefreshCw</div>,
}));

describe("TopBar", () => {
	const defaultProps = {
		// Search and filter state
		searchText: "",
		setSearchText: vi.fn(),
		onSearch: vi.fn(),
		clusters: [],
		allTags: [],
		meta: {},

		// UI state
		busy: false,
		gridSize: "medium" as const,
		setGridSize: vi.fn(),
		selectedView: "library" as const,
		setSelectedView: vi.fn(),
		currentFilter: "all",
		setCurrentFilter: vi.fn(),
		ratingMin: 0,
		setRatingMin: vi.fn(),

		// Modal and menu controls
		setModal: vi.fn(),
		setIsMobileMenuOpen: vi.fn(),
		setShowFilters: vi.fn(),

		// Selection state
		selected: new Set<string>(),
		setSelected: vi.fn(),

		// Settings and API
		dir: "/test/path",
		engine: "local",
		topK: 20,
		useOsTrash: false,
		showInfoOverlay: false,
		onToggleInfoOverlay: vi.fn(),

		// Results view mode
		resultView: "grid" as const,
		onChangeResultView: vi.fn(),

		// Index progress
		diag: null,
		isIndexing: false,
		onIndex: vi.fn(),

		// Jobs integration
		activeJobs: 0,
		onOpenJobs: vi.fn(),

		// Progress
		progressPct: 0,
		etaSeconds: 0,
		paused: false,
		onPause: vi.fn(),
		onResume: vi.fn(),
		tooltip: "",
		ocrReady: false,

		// Actions
		photoActions: {
			setFavOnly: vi.fn(),
			setResults: vi.fn(),
		},
		uiActions: {
			setBusy: vi.fn(),
			setNote: vi.fn(),
		},

		// Toast system
		toastTimerRef: { current: null },
		setToast: vi.fn(),

		// Theme modal
		onOpenThemeModal: vi.fn(),
	};

	it("renders without crashing", () => {
		render(<TopBar {...defaultProps} />);
		// SearchBar is mocked in this test suite
		expect(screen.getByTestId("search-bar")).toBeInTheDocument();
	});

	it("shows indexed chip when diag is provided", () => {
		const props = {
			...defaultProps,
			diag: {
				engines: [{ key: "test", index_dir: "/test", count: 100 }],
			},
		};

		render(<TopBar {...props} />);
		expect(screen.getByText("Indexed")).toBeInTheDocument();
		expect(screen.getByText("100")).toBeInTheDocument();
	});

	it("shows indexing state when isIndexing is true", () => {
		const props = {
			...defaultProps,
			diag: {
				engines: [{ key: "test", index_dir: "/test", count: 100 }],
			},
			isIndexing: true,
		};

		render(<TopBar {...props} />);
		expect(screen.getByText("Indexing…")).toBeInTheDocument();
	});

	it("shows OCR ready indicator when ocrReady is true", () => {
		const props = {
			...defaultProps,
			ocrReady: true,
		};

		render(<TopBar {...props} />);
		expect(screen.getByText("OCR")).toBeInTheDocument();
	});

	it("shows active jobs indicator when activeJobs > 0", () => {
		const props = {
			...defaultProps,
			activeJobs: 3,
		};

		render(<TopBar {...props} />);
		expect(screen.getByText("Jobs (3)")).toBeInTheDocument();
	});
});
