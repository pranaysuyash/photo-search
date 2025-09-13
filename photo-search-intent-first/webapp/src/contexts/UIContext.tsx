import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type UIState = {
	sidebarOpen: boolean;
	theme: "light" | "dark";
	modals: { help: boolean; onboarding: boolean };
};

type UIActions = {
	toggleSidebar: () => void;
	setTheme: (t: "light" | "dark") => void;
	openModal: (k: keyof UIState["modals"]) => void;
	closeModal: (k: keyof UIState["modals"]) => void;
};

const Ctx = createContext<{ state: UIState; actions: UIActions } | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [theme, setTheme] = useState<"light" | "dark">(() => {
		const stored = localStorage.getItem("ps_theme") as
			| "light"
			| "dark"
			| null;
		return stored ?? "light";
	});
	const [modals, setModals] = useState({ help: false, onboarding: false });

	useEffect(() => {
		localStorage.setItem("ps_theme", theme);
		if (theme === "dark") document.documentElement.classList.add("dark");
		else document.documentElement.classList.remove("dark");
	}, [theme]);

	const value = useMemo(
		() => ({
			state: { sidebarOpen, theme, modals },
			actions: {
				toggleSidebar: () => setSidebarOpen((v) => !v),
				setTheme,
				openModal: (k: keyof typeof modals) =>
					setModals((m) => ({ ...m, [k]: true })),
				closeModal: (k: keyof typeof modals) =>
					setModals((m) => ({ ...m, [k]: false })),
			},
		}),
		[sidebarOpen, theme, modals],
	);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUIContext() {
	const v = useContext(Ctx);
	if (!v) throw new Error("useUIContext must be used within UIProvider");
	return v;
}
