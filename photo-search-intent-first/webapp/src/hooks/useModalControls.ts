import { useCallback, useMemo } from "react";
import { type ModalKey, useModalContext } from "../contexts/ModalContext";
import { useModalDataContext } from "../contexts/ModalDataContext";

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
	const data = useModalDataContext();

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

			// Data-aware modal controls
			canOpenShare: () => data.selected.size > 0 && !!data.dir,
			canOpenExport: () => data.selected.size > 0 && !!data.dir,
			canOpenCollections: () =>
				data.selected.size > 0 && Object.keys(data.collections).length > 0,
			hasSelectedItems: () => data.selected.size > 0,
		}),
		[actions, data, isOpen],
	);
}

export default useModalControls;
