import { useEffect } from "react";

export function useThemeBootstrap() {
	useEffect(() => {
		try {
			const pref = localStorage.getItem("ps_theme");
			if (pref === "dark") {
				document.documentElement.classList.add("dark");
			}
		} catch {}
	}, []);
}

export default useThemeBootstrap;
