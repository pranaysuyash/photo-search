import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { UIActions, UIState } from "./types";

interface UIStore extends UIState, UIActions {}

export const useUIStore = create<UIStore>()(
	subscribeWithSelector((set, _get) => ({
		// Initial state
		busy: "",
		note: "",
		viewMode: "grid",
		showWelcome: false,
		showHelp: false,

		// Actions
		setBusy: (busy) => set({ busy }),
		setNote: (note) => set({ note }),
		setViewMode: (viewMode) => set({ viewMode }),
		setShowWelcome: (showWelcome) => set({ showWelcome }),
		setShowHelp: (showHelp) => set({ showHelp }),
		clearBusy: () => set({ busy: "" }),
	})),
);

// Selectors for optimized subscriptions
export const useBusy = () => useUIStore((state) => state.busy);
export const useNote = () => useUIStore((state) => state.note);
export const useViewMode = () => useUIStore((state) => state.viewMode);
export const useShowWelcome = () => useUIStore((state) => state.showWelcome);
export const useShowHelp = () => useUIStore((state) => state.showHelp);

// Stable actions selector
const uiActionsSelector = (state: unknown) => ({
	setBusy: state.setBusy,
	setNote: state.setNote,
	setViewMode: state.setViewMode,
	setShowWelcome: state.setShowWelcome,
	setShowHelp: state.setShowHelp,
	clearBusy: state.clearBusy,
});

// Actions selector - use shallow comparison
export const useUIActions = () => useUIStore(useShallow(uiActionsSelector));

// Computed selectors
export const useIsBusy = () => {
	const busy = useUIStore((state) => state.busy);
	return Boolean(busy);
};
export const useHasNote = () => {
	const note = useUIStore((state) => state.note);
	return Boolean(note);
};

// Stable computed selectors - avoid object returns without shallow
export const useUIState = () =>
	useUIStore((state) => ({
		busy: state.busy,
		note: state.note,
		viewMode: state.viewMode,
		showWelcome: state.showWelcome,
		showHelp: state.showHelp,
	}));
