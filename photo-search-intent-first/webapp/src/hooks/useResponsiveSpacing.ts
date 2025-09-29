import { useMemo } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { RESPONSIVE_SPACING, COMPONENT_SPACING, LAYOUT_PATTERNS, BREAKPOINTS } from '../constants/responsiveSpacing';

interface ResponsiveSpacingHook {
	// Get responsive spacing class for a specific type
	getSpacing: (type: keyof typeof RESPONSIVE_SPACING) => string;

	// Get component-specific spacing patterns
	getComponentSpacing: (component: keyof typeof COMPONENT_SPACING) => any;

	// Get layout pattern classes
	getLayout: (type: keyof typeof LAYOUT_PATTERNS) => string;

	// Current breakpoint information
	currentBreakpoint: keyof typeof BREAKPOINTS;
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;

	// Pre-computed responsive classes
	classes: {
		container: string;
		section: string;
		card: string;
		header: string;
		modal: string;
		button: string;
		input: string;
		grid: string;
		gap: string;
		padding: string;
		margin: string;
	};
}

export const useResponsiveSpacing = (): ResponsiveSpacingHook => {
	const { breakpoint, isMobile, isTablet, isDesktop } = useBreakpoint();

	const getSpacing = useMemo(() => {
		return (type: keyof typeof RESPONSIVE_SPACING): string => {
			const spacing = RESPONSIVE_SPACING[type];
			if (!spacing) return '';

			// Convert responsive object to Tailwind classes
			return Object.entries(spacing)
				.map(([bp, className]) => {
					if (bp === 'xs') return className;
					return `${bp}:${className}`;
				})
				.join(' ');
		};
	}, []);

	const getComponentSpacing = useMemo(() => {
		return (component: keyof typeof COMPONENT_SPACING): any => {
			return COMPONENT_SPACING[component];
		};
	}, []);

	const getLayout = useMemo(() => {
		return (type: keyof typeof LAYOUT_PATTERNS): string => {
			return LAYOUT_PATTERNS[type] || '';
		};
	}, []);

	const classes = useMemo(() => ({
		container: getSpacing('container'),
		section: getSpacing('section'),
		card: getSpacing('card'),
		header: getSpacing('header'),
		modal: getSpacing('modal'),
		button: getSpacing('button'),
		input: getSpacing('input'),
		grid: getSpacing('grid'),
		gap: getSpacing('grid'),
		padding: getSpacing('container'),
		margin: getSpacing('section'),
	}), [getSpacing]);

	return {
		getSpacing,
		getComponentSpacing,
		getLayout,
		currentBreakpoint: breakpoint,
		isMobile,
		isTablet,
		isDesktop,
		classes,
	};
};

export default useResponsiveSpacing;