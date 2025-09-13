import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "../test/test-utils";

// Mock the aggregated store hooks to avoid infinite render loops in tests
let settings = {
	dir: "",
	engine: "local",
	hfToken: "",
	openaiKey: "",
	useFast: false,
	fastKind: "",
	useCaps: false,
	useOcr: false,
	hasText: false,
	camera: "",
	isoMin: "",
	isoMax: "",
	fMin: "",
	fMax: "",
	place: "",
	get needsHf() {
		return this.engine.startsWith("hf");
	},
	get needsOAI() {
		return this.engine === "openai";
	},
};
let photo = {
	query: "",
	topK: 24,
	favOnly: false,
	tags: { allTags: ["beach", "friends"], tagsMap: {}, tagFilter: "" },
	results: [],
	searchId: "",
	fav: [],
	saved: [],
	collections: {},
	smart: {},
	library: [],
};
let ui = { viewMode: "grid" as "grid" | "film", note: "" };
let workspace = {
	wsToggle: false,
	persons: [] as string[],
	diag: null as unknown,
};

const settingsActions = {
	setDir: (v: string) => {
		settings.dir = v;
	},
	setEngine: (v: string) => {
		settings.engine = v;
	},
	setHfToken: (v: string) => {
		settings.hfToken = v;
	},
	setOpenaiKey: (v: string) => {
		settings.openaiKey = v;
	},
	setUseFast: (v: boolean) => {
		settings.useFast = v;
	},
	setFastKind: (v: unknown) => {
		settings.fastKind = v;
	},
	setUseCaps: (v: boolean) => {
		settings.useCaps = v;
	},
	setVlmModel: (_: string) => {},
	setUseOcr: (v: boolean) => {
		settings.useOcr = v;
	},
	setHasText: (v: boolean) => {
		settings.hasText = v;
	},
	setCamera: (v: string) => {
		settings.camera = v;
	},
	setIsoMin: (v: string) => {
		settings.isoMin = v;
	},
	setIsoMax: (v: string) => {
		settings.isoMax = v;
	},
	setFMin: (v: string) => {
		settings.fMin = v;
	},
	setFMax: (v: string) => {
		settings.fMax = v;
	},
	setPlace: (v: string) => {
		settings.place = v;
	},
};
const photoActions = {
	setQuery: (v: string) => {
		photo.query = v;
	},
	setTopK: (v: number) => {
		photo.topK = v;
	},
	setFavOnly: (v: boolean) => {
		photo.favOnly = v;
	},
	setTagFilter: (v: string) => {
		photo.tags.tagFilter = v;
	},
	setResults: (_: unknown) => {},
	setSearchId: (_: string) => {},
	setFavorites: (_: string[]) => {},
	setAllTags: (_: string[]) => {},
	setTagsMap: (_: unknown) => {},
	setSaved: (_: unknown) => {},
	setCollections: (_: unknown) => {},
	setSmart: (_: unknown) => {},
	setLibrary: (_: string[]) => {},
	resetSearch: () => {},
};
const uiActions = {
	setViewMode: (v: "grid" | "film") => {
		ui.viewMode = v;
	},
};
const workspaceActions = {
	setWsToggle: (v: boolean) => {
		workspace.wsToggle = v;
	},
	setPersons: (p: string[]) => {
		workspace.persons = p;
	},
};

vi.mock("../stores/useStores", () => ({
	useSettings: () => settings,
	usePhoto: () => photo,
	useUI: () => ({ ...ui }),
	useWorkspaceState: () => workspace,
	useSettingsActions: () => settingsActions,
	usePhotoActions: () => photoActions,
	useUIActions: () => uiActions,
	useWorkspaceActions: () => workspaceActions,
	// Provide library-related selectors required by LibraryProvider in test wrapper
	useLibrary: () => [],
	useLibHasMore: () => false,
	useDir: () => settings.dir,
	useEngine: () => settings.engine,
	useHfToken: () => settings.hfToken,
	useOpenaiKey: () => settings.openaiKey,
	useFastIndexEnabled: () => settings.useFast,
	useFastKind: () => settings.fastKind,
	useCaptionsEnabled: () => settings.useCaps,
	useOcrEnabled: () => settings.useOcr,
	useHasText: () => settings.hasText,
	usePlace: () => settings.place,
	useCamera: () => settings.camera,
	useIsoMin: () => settings.isoMin,
	useIsoMax: () => settings.isoMax,
	useFMin: () => settings.fMin,
	useFMax: () => settings.fMax,
	useNeedsHf: () => settings.needsHf,
	useNeedsOAI: () => settings.needsOAI,
	useSearchQuery: () => photo.query,
	useTopK: () => photo.topK,
	useFavOnly: () => photo.favOnly,
	useTagFilter: () => photo.tags.tagFilter,
	useAllTags: () => photo.tags.allTags,
	useViewMode: () => ui.viewMode,
	useNote: () => ui.note,
	useWsToggle: () => workspace.wsToggle,
	usePersons: () => workspace.persons,
	useDiag: () => workspace.diag,
}));

import SearchControls from "./SearchControls";

describe("SearchControls", () => {
	beforeEach(() => {
		settings = {
			...settings,
			engine: "local",
			dir: "",
			hfToken: "",
			openaiKey: "",
			useFast: false,
			fastKind: "",
			useCaps: false,
			useOcr: false,
			hasText: false,
			camera: "",
			isoMin: "",
			isoMax: "",
			fMin: "",
			fMax: "",
			place: "",
		};
		photo = {
			...photo,
			query: "",
			topK: 24,
			favOnly: false,
			tags: { allTags: ["beach", "friends"], tagsMap: {}, tagFilter: "" },
		};
		ui = { viewMode: "grid", note: "" };
		workspace = { wsToggle: false, persons: [], diag: null };
	});

	it("renders and updates store on input changes", () => {
		render(<SearchControls onSearch={() => {}} onShowHelp={() => {}} />);

		// Engine select exists and toggles token fields when set to hf
		const engineSelect = screen.getByLabelText(/Engine/i) as HTMLSelectElement;
		expect(engineSelect.value).toBe("local");
		fireEvent.change(engineSelect, { target: { value: "hf" } });
		expect(settings.engine).toBe("hf");

		// Query updates photo store
		const queryInput = screen.getByLabelText(/Query/i) as HTMLInputElement;
		fireEvent.change(queryInput, { target: { value: "sunset" } });
		expect(photo.query).toBe("sunset");

		// Top‑K updates
		const topk = screen.getByRole("spinbutton") as HTMLInputElement;
		fireEvent.change(topk, { target: { value: "12" } });
		expect(photo.topK).toBe(12);

		// Favorites only toggle
		const favOnly = screen.getByLabelText(
			/Favorites only/i,
		) as HTMLInputElement;
		fireEvent.click(favOnly);
		expect(photo.favOnly).toBe(true);
	});
});
