/**
 * Optimized versions of commonly re-rendered components with React.memo
 */
import type React from "react";
import { memo } from "react";

// Memoized button component to prevent unnecessary re-renders
export const MemoizedButton = memo<{
	children: React.ReactNode;
	onClick?: () => void;
	className?: string;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	title?: string;
	"aria-label"?: string;
}>(
	({
		children,
		onClick,
		className = "",
		disabled = false,
		type = "button",
		title,
		...props
	}) => (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			className={className}
			title={title}
			{...props}
		>
			{children}
		</button>
	),
);

MemoizedButton.displayName = "MemoizedButton";

// Memoized icon wrapper to prevent icon re-renders
export const MemoizedIcon = memo<{
    Icon: React.ComponentType<{ className?: string; size?: number }>;
    className?: string;
    size?: number;
}>(({ Icon, className, size }) => <Icon className={className} size={size} />);

MemoizedIcon.displayName = "MemoizedIcon";

// Memoized status indicator
export const MemoizedStatus = memo<{
	status: string;
	className?: string;
}>(({ status, className = "" }) => (
	<div className={`text-sm ${className}`}>{status}</div>
));

MemoizedStatus.displayName = "MemoizedStatus";

// Memoized counter display
export const MemoizedCounter = memo<{
	count: number;
	label: string;
	className?: string;
}>(({ count, label, className = "" }) => (
	<div className={`text-sm ${className}`}>
		{count} {label}
	</div>
));

MemoizedCounter.displayName = "MemoizedCounter";

// Memoized loading state
export const MemoizedLoadingState = memo<{
	isLoading: boolean;
	children: React.ReactNode;
	loadingComponent?: React.ReactNode;
}>(({ isLoading, children, loadingComponent = <div>Loading...</div> }) => (
	<>{isLoading ? loadingComponent : children}</>
));

MemoizedLoadingState.displayName = "MemoizedLoadingState";
