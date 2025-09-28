/**
 * Handles device UX: mobile detection, haptic feedback, theme bootstrapping
 */
import { useEffect } from "react";
import {
	useHapticFeedback,
	useMobileDetection,
} from "../../components/MobileOptimizations";
import { useThemeStore } from "../../stores/settingsStore";
import type { ScreenSize, ThemeMode } from "../utils/lifecycleTypes";
import { safeLocalStorage } from "../utils/safeStorage";

export interface UseDeviceUXReturn {
	isMobile: boolean;
	isTablet: boolean;
	screenSize: ScreenSize;
	themeMode: ThemeMode;
	triggerHaptic: (type?: "light" | "medium" | "heavy") => void;
}

export function useDeviceUX(): UseDeviceUXReturn {
	const { isMobile, isTablet, screenSize } = useMobileDetection();
	const { trigger: triggerHaptic } = useHapticFeedback();
	const themeMode = useThemeStore((s) => s.themeMode) as ThemeMode;

	// Initialize theme from localStorage on mount
	useEffect(() => {
		const pref = safeLocalStorage.getItem("ps_theme");
		if (pref === "dark") {
			document.documentElement.classList.add("dark");
		}
	}, []);

	return {
		isMobile,
		isTablet,
		screenSize: screenSize as ScreenSize,
		themeMode,
		triggerHaptic,
	};
}
