import { useEffect, useState } from "react";
import { BREAKPOINTS } from "../constants/responsiveSpacing";

type Breakpoint = keyof typeof BREAKPOINTS;

interface BreakpointHook {
	breakpoint: Breakpoint;
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	windowSize: {
		width: number;
		height: number;
	};
}

export const useBreakpoint = (): BreakpointHook => {
	const [windowSize, setWindowSize] = useState({
		width: typeof window !== "undefined" ? window.innerWidth : 1024,
		height: typeof window !== "undefined" ? window.innerHeight : 768,
	});

	const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleResize = () => {
			const width = window.innerWidth;
			const height = window.innerHeight;
			setWindowSize({ width, height });

			// Determine current breakpoint
			let currentBreakpoint: Breakpoint = "lg";
			if (width < parseInt(BREAKPOINTS.sm)) {
				currentBreakpoint = "xs";
			} else if (width < parseInt(BREAKPOINTS.md)) {
				currentBreakpoint = "sm";
			} else if (width < parseInt(BREAKPOINTS.lg)) {
				currentBreakpoint = "md";
			} else if (width < parseInt(BREAKPOINTS.xl)) {
				currentBreakpoint = "lg";
			} else if (width < parseInt(BREAKPOINTS["2xl"])) {
				currentBreakpoint = "xl";
			} else {
				currentBreakpoint = "2xl";
			}

			setBreakpoint(currentBreakpoint);
		};

		// Initial call
		handleResize();

		// Debounced resize handler
		let timeoutId: number;
		const debouncedResize = () => {
			clearTimeout(timeoutId);
			timeoutId = window.setTimeout(handleResize, 100);
		};

		window.addEventListener("resize", debouncedResize);

		return () => {
			window.removeEventListener("resize", debouncedResize);
			clearTimeout(timeoutId);
		};
	}, []);

	const isMobile = breakpoint === "xs" || breakpoint === "sm";
	const isTablet = breakpoint === "md";
	const isDesktop =
		breakpoint === "lg" || breakpoint === "xl" || breakpoint === "2xl";

	return {
		breakpoint,
		isMobile,
		isTablet,
		isDesktop,
		windowSize,
	};
};

export default useBreakpoint;
