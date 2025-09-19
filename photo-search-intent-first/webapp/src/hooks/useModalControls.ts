import { useMemo } from "react";
import { type ModalKey, useModalContext } from "../contexts/ModalContext";

export interface ModalControls {
	openModal: (key: ModalKey) => void;
	closeModal: (key: ModalKey) => void;
	toggleModal: (key: ModalKey) => void;
	closeAll: () => void;
	openFolder: () => void;
	openHelp: () => void;
	openSearch: () => void;
	openJobs: () => void;
	openTheme: () => void;
	openDiagnostics: () => void;
	openShareManager: () => void;
}

export function useModalControls(): ModalControls {
	const { actions } = useModalContext();

	return useMemo(
		() => ({
			openModal: actions.open,
			closeModal: actions.close,
			toggleModal: actions.toggle,
			closeAll: actions.closeAll,
			openFolder: () => actions.open("folder"),
			openHelp: () => actions.open("help"),
			openSearch: () => actions.open("search"),
			openJobs: () => actions.open("jobs"),
			openTheme: () => actions.open("theme"),
			openDiagnostics: () => actions.open("diagnostics"),
			openShareManager: () => actions.open("shareManage"),
		}),
		[actions],
	);
}

export default useModalControls;
