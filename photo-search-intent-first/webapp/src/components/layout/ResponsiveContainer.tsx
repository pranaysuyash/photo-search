import type React from "react";
import { forwardRef } from "react";
import {
	LAYOUT_PATTERNS,
	RESPONSIVE_CLASSES,
} from "../../constants/responsiveSpacing";
import { cn } from "../../lib/utils";

interface ResponsiveContainerProps {
	children: React.ReactNode;
	className?: string;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
	padding?: "none" | "sm" | "md" | "lg";
	centered?: boolean;
}

export const ResponsiveContainer = forwardRef<
	HTMLDivElement,
	ResponsiveContainerProps
>(
	(
		{ children, className, maxWidth = "2xl", padding = "md", centered = false },
		ref,
	) => {
		const containerClasses = cn(
			"w-full",
			{
				"max-w-sm": maxWidth === "sm",
				"max-w-md": maxWidth === "md",
				"max-w-lg": maxWidth === "lg",
				"max-w-xl": maxWidth === "xl",
				"max-w-2xl": maxWidth === "2xl",
				"max-w-full": maxWidth === "full",
			},
			{
				"px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-10": padding === "sm",
				"px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12": padding === "md",
				"px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16": padding === "lg",
				"px-0": padding === "none",
			},
			{
				"mx-auto": !centered,
				"mx-auto flex items-center justify-center": centered,
			},
			className,
		);

		return (
			<div ref={ref} className={containerClasses}>
				{children}
			</div>
		);
	},
);

ResponsiveContainer.displayName = "ResponsiveContainer";

interface ResponsiveGridProps {
	children: React.ReactNode;
	className?: string;
	cols?: {
		xs?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
		"2xl"?: number;
	};
	gap?: "none" | "sm" | "md" | "lg";
}

export const ResponsiveGrid = forwardRef<HTMLDivElement, ResponsiveGridProps>(
	(
		{
			children,
			className,
			cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5, "2xl": 6 },
			gap = "md",
		},
		ref,
	) => {
		const gridClasses = cn(
			"grid",
			{
				"grid-cols-1": cols.xs === 1,
				"grid-cols-2": cols.xs === 2,
				"grid-cols-3": cols.xs === 3,
				"grid-cols-4": cols.xs === 4,
			},
			{
				"sm:grid-cols-1": cols.sm === 1,
				"sm:grid-cols-2": cols.sm === 2,
				"sm:grid-cols-3": cols.sm === 3,
				"sm:grid-cols-4": cols.sm === 4,
				"sm:grid-cols-5": cols.sm === 5,
				"sm:grid-cols-6": cols.sm === 6,
			},
			{
				"md:grid-cols-1": cols.md === 1,
				"md:grid-cols-2": cols.md === 2,
				"md:grid-cols-3": cols.md === 3,
				"md:grid-cols-4": cols.md === 4,
				"md:grid-cols-5": cols.md === 5,
				"md:grid-cols-6": cols.md === 6,
			},
			{
				"lg:grid-cols-1": cols.lg === 1,
				"lg:grid-cols-2": cols.lg === 2,
				"lg:grid-cols-3": cols.lg === 3,
				"lg:grid-cols-4": cols.lg === 4,
				"lg:grid-cols-5": cols.lg === 5,
				"lg:grid-cols-6": cols.lg === 6,
			},
			{
				"xl:grid-cols-1": cols.xl === 1,
				"xl:grid-cols-2": cols.xl === 2,
				"xl:grid-cols-3": cols.xl === 3,
				"xl:grid-cols-4": cols.xl === 4,
				"xl:grid-cols-5": cols.xl === 5,
				"xl:grid-cols-6": cols.xl === 6,
			},
			{
				"2xl:grid-cols-1": cols["2xl"] === 1,
				"2xl:grid-cols-2": cols["2xl"] === 2,
				"2xl:grid-cols-3": cols["2xl"] === 3,
				"2xl:grid-cols-4": cols["2xl"] === 4,
				"2xl:grid-cols-5": cols["2xl"] === 5,
				"2xl:grid-cols-6": cols["2xl"] === 6,
			},
			{
				"gap-0": gap === "none",
				"gap-2 sm:gap-3 md:gap-4 lg:gap-6": gap === "md",
				"gap-1 sm:gap-2 md:gap-3 lg:gap-4": gap === "sm",
				"gap-3 sm:gap-4 md:gap-6 lg:gap-8": gap === "lg",
			},
			className,
		);

		return (
			<div ref={ref} className={gridClasses}>
				{children}
			</div>
		);
	},
);

ResponsiveGrid.displayName = "ResponsiveGrid";

interface ResponsiveFlexProps {
	children: React.ReactNode;
	className?: string;
	direction?: "row" | "col";
	wrap?: boolean;
	justify?: "start" | "end" | "center" | "between" | "around" | "evenly";
	align?: "start" | "end" | "center" | "baseline" | "stretch";
	gap?: "none" | "sm" | "md" | "lg";
}

export const ResponsiveFlex = forwardRef<HTMLDivElement, ResponsiveFlexProps>(
	(
		{
			children,
			className,
			direction = "row",
			wrap = false,
			justify = "start",
			align = "start",
			gap = "md",
		},
		ref,
	) => {
		const flexClasses = cn(
			"flex",
			{
				"flex-row": direction === "row",
				"flex-col": direction === "col",
			},
			{
				"flex-wrap": wrap,
			},
			{
				"justify-start": justify === "start",
				"justify-end": justify === "end",
				"justify-center": justify === "center",
				"justify-between": justify === "between",
				"justify-around": justify === "around",
				"justify-evenly": justify === "evenly",
			},
			{
				"items-start": align === "start",
				"items-end": align === "end",
				"items-center": align === "center",
				"items-baseline": align === "baseline",
				"items-stretch": align === "stretch",
			},
			{
				"gap-0": gap === "none",
				"gap-2 sm:gap-3 md:gap-4 lg:gap-6": gap === "md",
				"gap-1 sm:gap-2 md:gap-3 lg:gap-4": gap === "sm",
				"gap-3 sm:gap-4 md:gap-6 lg:gap-8": gap === "lg",
			},
			className,
		);

		return (
			<div ref={ref} className={flexClasses}>
				{children}
			</div>
		);
	},
);

ResponsiveFlex.displayName = "ResponsiveFlex";

interface ResponsiveStackProps {
	children: React.ReactNode;
	className?: string;
	spacing?: "none" | "sm" | "md" | "lg";
}

export const ResponsiveStack = forwardRef<HTMLDivElement, ResponsiveStackProps>(
	({ children, className, spacing = "md" }, ref) => {
		const stackClasses = cn(
			"flex flex-col",
			{
				"space-y-0": spacing === "none",
				"space-y-1 sm:space-y-2 md:space-y-3 lg:space-y-4": spacing === "sm",
				"space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6": spacing === "md",
				"space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8": spacing === "lg",
			},
			className,
		);

		return (
			<div ref={ref} className={stackClasses}>
				{children}
			</div>
		);
	},
);

ResponsiveStack.displayName = "ResponsiveStack";

export {
	ResponsiveContainer as Container,
	ResponsiveGrid as Grid,
	ResponsiveFlex as Flex,
	ResponsiveStack as Stack,
};
