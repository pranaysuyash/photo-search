// Spacing constants for consistent layout across the application
// These values correspond to the Tailwind theme spacing scale

export const SPACING = {
	// Base spacing units (multiples of 0.25rem)
	xs: "0.25rem", // 4px
	sm: "0.5rem", // 8px
	base: "1rem", // 16px
	md: "1.5rem", // 24px
	lg: "2rem", // 32px
	xl: "3rem", // 48px
	"2xl": "4rem", // 64px
	"3xl": "6rem", // 96px

	// Custom spacing values from theme
	"18": "4.5rem", // 72px
	"22": "5.5rem", // 88px
} as const;

export const PADDING = {
	card: SPACING.base,
	section: SPACING.md,
	page: SPACING.lg,
	tight: SPACING.xs,
	compact: SPACING.sm,
} as const;

export const MARGIN = {
	card: SPACING.base,
	section: SPACING.md,
	page: SPACING.lg,
	tight: SPACING.xs,
	compact: SPACING.sm,
} as const;

// Border radius constants
export const BORDER_RADIUS = {
	xs: "var(--radius-sm)", // 0.35rem
	sm: "var(--radius-base)", // 0.5rem
	base: "var(--radius-md)", // 0.65rem
	lg: "var(--radius-lg)", // 0.85rem
	xl: "var(--radius-xl)", // 1.15rem
	"2xl": "var(--radius-2xl)", // 1.5rem
} as const;

// Shadow constants
export const SHADOW = {
	xs: "var(--shadow-xs)",
	sm: "var(--shadow-sm)",
	base: "var(--shadow-base)",
	md: "var(--shadow-md)",
	lg: "var(--shadow-lg)",
	xl: "var(--shadow-xl)",
} as const;

// Z-index constants
export const Z_INDEX = {
	dropdown: 1000,
	sticky: 1020,
	fixed: 1030,
	"modal-backdrop": 1040,
	modal: 1050,
	popover: 1060,
	tooltip: 1070,
} as const;

export default {
	SPACING,
	PADDING,
	MARGIN,
	BORDER_RADIUS,
	SHADOW,
	Z_INDEX,
};
