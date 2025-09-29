// Enhanced responsive spacing system for consistent layout across window sizes
// This builds upon the existing spacing constants and adds responsive patterns

import { SPACING, PADDING, MARGIN, BORDER_RADIUS, SHADOW, Z_INDEX } from './spacing';

// Responsive breakpoint definitions
export const BREAKPOINTS = {
	xs: '0px',
	sm: '640px',   // Small mobile
	md: '768px',   // Tablet
	lg: '1024px',  // Desktop
	xl: '1280px',  // Large desktop
	'2xl': '1536px', // Extra large desktop
} as const;

// Responsive spacing patterns
export const RESPONSIVE_SPACING = {
	// Container padding that scales with screen size
	container: {
		xs: 'px-2 py-2',
		sm: 'px-3 py-3',
		md: 'px-4 py-4',
		lg: 'px-6 py-6',
		xl: 'px-8 py-8',
		'2xl': 'px-10 py-10',
	},

	// Section spacing between components
	section: {
		xs: 'space-y-2',
		sm: 'space-y-3',
		md: 'space-y-4',
		lg: 'space-y-6',
		xl: 'space-y-8',
		'2xl': 'space-y-10',
	},

	// Card padding that scales appropriately
	card: {
		xs: 'p-3',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-6',
		xl: 'p-6',
		'2xl': 'p-8',
	},

	// Gap between grid items
	grid: {
		xs: 'gap-2',
		sm: 'gap-3',
		md: 'gap-4',
		lg: 'gap-6',
		xl: 'gap-6',
		'2xl': 'gap-8',
	},

	// Header spacing
	header: {
		xs: 'px-2 py-2',
		sm: 'px-3 py-3',
		md: 'px-6 py-4',
		lg: 'px-8 py-5',
		xl: 'px-10 py-6',
		'2xl': 'px-12 py-8',
	},

	// Modal padding
	modal: {
		xs: 'p-4',
		sm: 'p-6',
		md: 'p-8',
		lg: 'p-8',
		xl: 'p-10',
		'2xl': 'p-12',
	},

	// Button padding
	button: {
		xs: 'px-2 py-1 text-xs',
		sm: 'px-3 py-2 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base',
		xl: 'px-8 py-3 text-base',
		'2xl': 'px-10 py-4 text-lg',
	},

	// Form input padding
	input: {
		xs: 'px-2 py-1 text-xs',
		sm: 'px-3 py-2 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-4 py-3 text-base',
		xl: 'px-6 py-3 text-base',
		'2xl': 'px-8 py-4 text-lg',
	},
} as const;

// Layout patterns for common responsive scenarios
export const LAYOUT_PATTERNS = {
	// Full-width container with responsive padding
	container: 'w-full max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 xl:px-10 2xl:px-12',

	// Centered content container
	centered: 'flex items-center justify-center min-h-screen p-2 sm:p-3 md:p-6 lg:p-8',

	// Grid container
	grid: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4 lg:gap-6',

	// Flex container with responsive wrap
	flexWrap: 'flex flex-wrap gap-2 sm:gap-3 md:gap-4 lg:gap-6',

	// Sticky header
	stickyHeader: 'sticky top-0 z-50 bg-background border-b border-border shadow-sm px-2 py-2 sm:px-3 sm:py-3 md:px-6 md:py-4 lg:px-8 lg:py-5',

	// Sidebar layout
	sidebar: 'hidden md:flex md:w-64 lg:w-80 xl:w-96 flex-shrink-0 border-r border-border bg-muted/30',

	// Main content area
	mainContent: 'flex-1 overflow-hidden bg-background',
} as const;

// Responsive utility functions
export const getResponsiveClass = (
	baseClass: string,
	responsiveClasses: Record<string, string>
): string => {
	// Generate Tailwind responsive classes
	return Object.entries(responsiveClasses)
		.map(([breakpoint, className]) => {
			if (breakpoint === 'xs') return className;
			return `${breakpoint}:${className}`;
		})
		.join(' ');
};

// Pre-computed responsive class combinations
export const RESPONSIVE_CLASSES = {
	// Container variations
	container: getResponsiveClass('container', RESPONSIVE_SPACING.container),
	section: getResponsiveClass('section', RESPONSIVE_SPACING.section),
	card: getResponsiveClass('card', RESPONSIVE_SPACING.card),
	grid: getResponsiveClass('grid', RESPONSIVE_SPACING.grid),
	header: getResponsiveClass('header', RESPONSIVE_SPACING.header),
	modal: getResponsiveClass('modal', RESPONSIVE_SPACING.modal),
	button: getResponsiveClass('button', RESPONSIVE_SPACING.button),
	input: getResponsiveClass('input', RESPONSIVE_SPACING.input),

	// Common layout combinations
	pageHeader: 'px-2 py-2 sm:px-3 sm:py-3 md:px-6 md:py-4 lg:px-8 lg:py-5 xl:px-10 xl:py-6 2xl:px-12 2xl:py-8',
	contentArea: 'p-2 sm:p-3 md:p-6 lg:p-8 xl:p-10 2xl:p-12',
	cardContent: 'p-3 sm:p-4 md:p-6 lg:p-6 xl:p-6 2xl:p-8',

	// Responsive margin and padding
	mtResponsive: 'mt-2 sm:mt-3 md:mt-4 lg:mt-6 xl:mt-8 2xl:mt-10',
	mbResponsive: 'mb-2 sm:mb-3 md:mb-4 lg:mb-6 xl:mb-8 2xl:mb-10',
	pxResponsive: 'px-2 sm:px-3 md:px-6 lg:px-8 xl:px-10 2xl:px-12',
	pyResponsive: 'py-2 sm:py-3 md:py-4 lg:py-6 xl:py-8 2xl:py-10',

	// Responsive gaps
	gapResponsive: 'gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8 2xl:gap-10',
	gapSmall: 'gap-1 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-5 2xl:gap-6',
	gapLarge: 'gap-3 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-12',
} as const;

// Component-specific spacing patterns
export const COMPONENT_SPACING = {
	// Modal components
	modal: {
		container: 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-6 lg:p-8',
		backdrop: 'fixed inset-0 bg-black/40 backdrop-blur-sm z-40',
		content: 'relative bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-auto p-4 sm:p-6 md:p-8 lg:p-10',
		header: 'flex items-center justify-between pb-4 mb-4 border-b border-border',
		body: 'space-y-4',
		footer: 'flex items-center justify-end space-x-2 pt-4 mt-4 border-t border-border',
	},

	// Card components
	card: {
		container: 'bg-card border border-border rounded-lg shadow-sm overflow-hidden',
		header: 'p-4 sm:p-6 border-b border-border space-y-2',
		content: 'p-4 sm:p-6 pt-0',
		footer: 'p-4 sm:p-6 pt-0 flex items-center justify-between',
	},

	// Form components
	form: {
		container: 'space-y-4 sm:space-y-6',
		group: 'space-y-2 sm:space-y-3',
		label: 'text-sm font-medium text-foreground mb-1 sm:mb-2 block',
		input: 'w-full px-3 py-2 sm:px-4 sm:py-3 border border-border rounded-md bg-background text-foreground',
		help: 'text-xs text-muted-foreground mt-1',
		error: 'text-xs text-destructive mt-1',
	},

	// Navigation components
	nav: {
		container: 'flex items-center space-x-2 sm:space-x-4',
		item: 'px-3 py-2 sm:px-4 sm:py-3 text-sm font-medium rounded-md hover:bg-muted transition-colors',
		active: 'bg-primary text-primary-foreground',
	},

	// List components
	list: {
		container: 'space-y-1 sm:space-y-2',
		item: 'p-3 sm:p-4 hover:bg-muted rounded-md cursor-pointer transition-colors',
		itemHeader: 'flex items-center justify-between mb-2',
		itemContent: 'text-sm text-muted-foreground',
	},
} as const;

// CSS custom properties for dynamic spacing
export const SPACING_CSS_VARS = `
	:root {
		--spacing-xs: ${SPACING.xs};
		--spacing-sm: ${SPACING.sm};
		--spacing-base: ${SPACING.base};
		--spacing-md: ${SPACING.md};
		--spacing-lg: ${SPACING.lg};
		--spacing-xl: ${SPACING.xl};
		--spacing-2xl: ${SPACING['2xl']};
		--spacing-3xl: ${SPACING['3xl']};

		--padding-card: ${PADDING.card};
		--padding-section: ${PADDING.section};
		--padding-page: ${PADDING.page};

		--margin-card: ${MARGIN.card};
		--margin-section: ${MARGIN.section};
		--margin-page: ${MARGIN.page};

		--border-radius-sm: ${BORDER_RADIUS.sm};
		--border-radius-base: ${BORDER_RADIUS.base};
		--border-radius-lg: ${BORDER_RADIUS.lg};
		--border-radius-xl: ${BORDER_RADIUS.xl};

		--shadow-sm: ${SHADOW.sm};
		--shadow-base: ${SHADOW.base};
		--shadow-lg: ${SHADOW.lg};

		--z-index-dropdown: ${Z_INDEX.dropdown};
		--z-index-modal: ${Z_INDEX.modal};
		--z-index-popover: ${Z_INDEX.popover};
	}

	@media (max-width: 640px) {
		:root {
			--container-padding: 0.5rem;
			--section-spacing: 0.5rem;
		}
	}

	@media (min-width: 641px) and (max-width: 768px) {
		:root {
			--container-padding: 0.75rem;
			--section-spacing: 0.75rem;
		}
	}

	@media (min-width: 769px) and (max-width: 1024px) {
		:root {
			--container-padding: 1rem;
			--section-spacing: 1rem;
		}
	}

	@media (min-width: 1025px) {
		:root {
			--container-padding: 1.5rem;
			--section-spacing: 1.5rem;
		}
	}
`;

// Helper functions for responsive design
export const useResponsiveSpacing = () => {
	const getSpacingClass = (type: keyof typeof RESPONSIVE_SPACING): string => {
		return RESPONSIVE_CLASSES[type] || '';
	};

	const getLayoutClass = (type: keyof typeof LAYOUT_PATTERNS): string => {
		return LAYOUT_PATTERNS[type] || '';
	};

	const getComponentSpacing = (component: keyof typeof COMPONENT_SPACING): any => {
		return COMPONENT_SPACING[component];
	};

	return {
		getSpacingClass,
		getLayoutClass,
		getComponentSpacing,
		RESPONSIVE_CLASSES,
		LAYOUT_PATTERNS,
		COMPONENT_SPACING,
	};
};

export default {
	...RESPONSIVE_SPACING,
	LAYOUT_PATTERNS,
	RESPONSIVE_CLASSES,
	COMPONENT_SPACING,
	useResponsiveSpacing,
	BREAKPOINTS,
	SPACING_CSS_VARS,
};