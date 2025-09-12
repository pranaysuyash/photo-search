import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg" | "xl";
	message?: string;
	className?: string;
	inline?: boolean;
}

export function LoadingSpinner({
	size = "md",
	message,
	className = "",
	inline = false,
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
		xl: "w-12 h-12",
	};

	if (inline) {
		return (
			<span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-live="polite">
				<Loader2
					className={`${sizeClasses[size]} animate-spin text-blue-600`}
				/>
				{message ? (
					<span className="text-sm text-gray-600">{message}</span>
				) : (
					<span className="sr-only">Loading…</span>
				)}
			</span>
		);
	}

	return (
		<div className={`flex flex-col items-center justify-center ${className}`} role="status" aria-live="polite">
			<Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
			{message ? (
				<p className="mt-2 text-sm text-gray-600">{message}</p>
			) : (
				<span className="sr-only">Loading…</span>
			)}
		</div>
	);
}

// Skeleton loader for content placeholders
export function SkeletonLoader({
	lines = 3,
	className = "",
}: {
	lines?: number;
	className?: string;
}) {
	return (
		<div className={`animate-pulse ${className}`}>
			{Array.from({ length: lines }).map((_, i) => (
				<div
					key={`item-${i}`}
					className="h-4 bg-gray-200 rounded mb-2"
					style={{
						width: `${Math.random() * 40 + 60}%`,
					}}
				/>
			))}
		</div>
	);
}

// Loading overlay for sections
export function LoadingOverlay({
	message = "Loading...",
	blur = true,
}: {
	message?: string;
	blur?: boolean;
}) {
	return (
		<div
			className={`absolute inset-0 z-50 flex items-center justify-center ${
				blur ? "bg-white/80 backdrop-blur-sm" : "bg-white/90"
			}`}
		>
			<LoadingSpinner size="lg" message={message} />
		</div>
	);
}
