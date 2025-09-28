/**
 * Bridge to global shortcuts and results shortcuts with clear typed arguments
 */
import { useGlobalShortcuts } from "../useGlobalShortcuts";
import { useResultsShortcuts } from "../useResultsShortcuts";

export interface UseGlobalShortcutsBridgeProps {
	// Global shortcuts props
	anyModalOpen: boolean;
	openModal: (key: string) => void;
	toggleModal: (key: string) => void;
	searchCommandCenter: boolean;
	showInfoOverlay: boolean;
	openFilters: () => void;
	selectedView: string;
	resultView: string;

	// Results shortcuts props - simplified to match actual interface
	resultsEnabled: boolean;
	resultsShortcutsProps: Parameters<typeof useResultsShortcuts>[0];
}

export function useGlobalShortcutsBridge({
	anyModalOpen,
	openModal,
	toggleModal,
	searchCommandCenter,
	showInfoOverlay,
	openFilters,
	selectedView,
	resultView,
	resultsEnabled,
	resultsShortcutsProps,
}: UseGlobalShortcutsBridgeProps): void {
	// Global shortcuts
	useGlobalShortcuts({
		anyModalOpen,
		openModal,
		toggleModal,
		searchCommandCenter,
		showInfoOverlay,
		openFilters,
		selectedView,
		resultView,
	});

	// Results shortcuts
	useResultsShortcuts({
		...resultsShortcutsProps,
		enabled: resultsEnabled,
	});
}
