import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ModalKey =
	| "help"
	| "theme"
	| "search"
	| "jobs"
	| "diagnostics"
	| "advanced"
	| "enhanced-share"
	| "export"
	| "share"
	| "shareManage"
	| "tag"
	| "folder"
	| "likeplus"
	| "save"
	| "collect"
	| "removeCollect";

type ModalState = Record<ModalKey, boolean>;

type ModalActions = {
	open: (key: ModalKey) => void;
	close: (key: ModalKey) => void;
	toggle: (key: ModalKey) => void;
	closeAll: () => void;
};

const Ctx = createContext<{ state: ModalState; actions: ModalActions } | null>(
	null,
);

const initialState: ModalState = {
	help: false,
	theme: false,
	search: false,
	jobs: false,
	diagnostics: false,
	advanced: false,
	"enhanced-share": false,
	export: false,
	share: false,
	shareManage: false,
	tag: false,
	folder: false,
	likeplus: false,
	save: false,
	collect: false,
	removeCollect: false,
};

export function ModalProvider({ children }: { children: React.ReactNode }) {
	const [modals, setModals] = useState<ModalState>(initialState);

	// Close all modals when a global error is announced
	useEffect(() => {
		const onGlobalError = () => setModals(initialState);
		window.addEventListener("global-error", onGlobalError);
		return () => window.removeEventListener("global-error", onGlobalError);
	}, []);

	const value = useMemo(
		() => ({
			state: modals,
			actions: {
				open: (k: ModalKey) => setModals((m) => ({ ...m, [k]: true })),
				close: (k: ModalKey) => setModals((m) => ({ ...m, [k]: false })),
				toggle: (k: ModalKey) => setModals((m) => ({ ...m, [k]: !m[k] })),
				closeAll: () => setModals(initialState),
			},
		}),
		[modals],
	);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useModalContext() {
	const v = useContext(Ctx);
	if (!v) throw new Error("useModalContext must be used within ModalProvider");
	return v;
}
