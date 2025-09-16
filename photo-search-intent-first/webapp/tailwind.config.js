/** @type {import('tailwindcss').Config} */
export default {
	darkMode: "class",
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			// Custom color system using CSS variables
			colors: {
				// shadcn/ui color variables
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				// Legacy brand colors (keeping for backward compatibility)
				"brand-primary": {
					50: "var(--color-primary-50)",
					100: "var(--color-primary-100)",
					200: "var(--color-primary-200)",
					300: "var(--color-primary-300)",
					400: "var(--color-primary-400)",
					500: "var(--color-primary-500)",
					600: "var(--color-primary-600)",
					700: "var(--color-primary-700)",
					800: "var(--color-primary-800)",
					900: "var(--color-primary-900)",
				},
				// Legacy secondary/gray colors
				"brand-secondary": {
					50: "var(--color-secondary-50)",
					100: "var(--color-secondary-100)",
					200: "var(--color-secondary-200)",
					300: "var(--color-secondary-300)",
					400: "var(--color-secondary-400)",
					500: "var(--color-secondary-500)",
					600: "var(--color-secondary-600)",
					700: "var(--color-secondary-700)",
					800: "var(--color-secondary-800)",
					900: "var(--color-secondary-900)",
				},
				// Semantic colors
				success: "var(--color-state-success)",
				warning: "var(--color-state-warning)",
				error: "var(--color-state-error)",
				info: "var(--color-state-info)",
				// Legacy accent colors
				"brand-accent": {
					pink: "var(--color-accent-pink-500)",
					"pink-dark": "var(--color-accent-pink-600)",
					emerald: "var(--color-accent-emerald-500)",
					"emerald-dark": "var(--color-accent-emerald-600)",
					amber: "var(--color-accent-amber-500)",
					"amber-dark": "var(--color-accent-amber-600)",
					red: "var(--color-accent-red-500)",
					"red-dark": "var(--color-accent-red-600)",
				},
				// Surface colors
				surface: {
					background: "var(--color-surface-background)",
					card: "var(--color-surface-card)",
					border: "var(--color-surface-border)",
					divider: "var(--color-surface-divider)",
				},
				// Text colors
				text: {
					primary: "var(--color-text-primary)",
					secondary: "var(--color-text-secondary)",
					tertiary: "var(--color-text-tertiary)",
					inverse: "var(--color-text-inverse)",
					accent: "var(--color-text-accent)",
				},
			},
			// Custom font family
			fontFamily: {
				sans: "var(--font-family-sans)",
				mono: "var(--font-family-mono)",
			},
			// Custom spacing scale (extends default)
			spacing: {
				18: "var(--spacing-18)", // 4.5rem
				22: "var(--spacing-22)", // 5.5rem
			},
			// Custom border radius
			borderRadius: {
				xs: "var(--radius-sm)",
				sm: "var(--radius-base)",
				base: "var(--radius-md)",
				lg: "var(--radius-lg)",
				xl: "var(--radius-xl)",
				"2xl": "var(--radius-2xl)",
			},
			// Custom box shadows
			boxShadow: {
				xs: "var(--shadow-xs)",
				sm: "var(--shadow-sm)",
				base: "var(--shadow-base)",
				md: "var(--shadow-md)",
				lg: "var(--shadow-lg)",
				xl: "var(--shadow-xl)",
			},
			// Custom transitions
			transitionDuration: {
				fast: "150ms",
				base: "200ms",
				slow: "300ms",
				slower: "500ms",
			},
			// Custom z-index scale
			zIndex: {
				dropdown: "1000",
				sticky: "1020",
				fixed: "1030",
				"modal-backdrop": "1040",
				modal: "1050",
				popover: "1060",
				tooltip: "1070",
			},
		},
	},
	plugins: [],
};
