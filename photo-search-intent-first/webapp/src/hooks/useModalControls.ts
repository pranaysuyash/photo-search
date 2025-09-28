import { useCallback, useMemo } from "react";
import { type ModalKey, useModalContext } from "../contexts/ModalContext";

export interface ModalControls {
	openModal: (key: ModalKey) => void;
	closeModal: (key: ModalKey) => void;
	toggleModal: (key: ModalKey) => void;
	closeAll: () => void;
	isOpen: (key: ModalKey) => boolean;
	openFolder: () => void;
	openHelp: () => void;
	openSearch: () => void;
	openJobs: () => void;
	openTheme: () => void;
	openDiagnostics: () => void;
	openShareManager: () => void;

	// Data-aware modal controls
	canOpenShare: () => boolean;
	canOpenExport: () => boolean;
	canOpenCollections: () => boolean;
	hasSelectedItems: () => boolean;
}

export function useModalControls(): ModalControls {
	const { state, actions } = useModalContext();

	const isOpen = useCallback((key: ModalKey) => Boolean(state[key]), [state]);

	return useMemo(
		() => ({
			openModal: actions.open,
			closeModal: actions.close,
			toggleModal: actions.toggle,
			closeAll: actions.closeAll,
			isOpen,
			openFolder: () => actions.open("folder"),
			openHelp: () => actions.open("help"),
			openSearch: () => actions.open("search"),
			openJobs: () => actions.open("jobs"),
			openTheme: () => actions.open("theme"),
			openDiagnostics: () => actions.open("diagnostics"),
			openShareManager: () => actions.open("shareManage"),

			// Data-aware modal controls - simplified without modal data context
			canOpenShare: () => true, // Will be enhanced when modal data context is properly set up
			canOpenExport: () => true,
			canOpenCollections: () => true,
			hasSelectedItems: () => false, // Will be enhanced when modal data context is properly set up
		}),
		[actions, isOpen],
	);
}

export default useModalControls;
