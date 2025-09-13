import type React from "react";

interface EmptyStateProps {
	icon?: React.ReactNode;
	title: string;
	description: string;
	action?: {
		label: string;
		onClick: () => void;
		variant?: "primary" | "secondary";
	};
	className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	icon,
	title,
	description,
	action,
	className = "",
}) => {
	return (
		<div className={`empty-state ${className}`}>
			{icon && <div className="empty-state-icon">{icon}</div>}
			<h3 className="empty-state-title">{title}</h3>
			<p className="empty-state-description">{description}</p>
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className={
						action.variant === "secondary" ? "btn-secondary" : "btn-primary"
					}
				>
					{action.label}
				</button>
			)}
		</div>
	);
};

// Preset empty states for common scenarios
export const NoResultsEmpty: React.FC<{ onSearch?: () => void }> = ({
	onSearch,
}) => (
	<EmptyState
		icon={
			<svg
				className="w-12 h-12"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<title>Empty state icon</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		}
		title="No results found"
		description="Try adjusting your search query or filters to find what you're looking for."
		action={onSearch ? { label: "New Search", onClick: onSearch } : undefined}
	/>
);

export const NoPhotosEmpty: React.FC<{ onIndex?: () => void }> = ({
	onIndex,
}) => (
	<EmptyState
		icon={
			<svg
				className="w-12 h-12"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<title>Empty state icon</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
		}
		title="No photos yet"
		description="Start by building an index of your photo folder to begin searching and organizing your photos."
		action={onIndex ? { label: "Build Index", onClick: onIndex } : undefined}
	/>
);

export const NoFavoritesEmpty: React.FC = () => (
	<EmptyState
		icon={
			<svg
				className="w-12 h-12"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<title>Empty state icon</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
				/>
			</svg>
		}
		title="No favorites yet"
		description="Heart the photos you love to easily find them later."
	/>
);

export const NoCollectionsEmpty: React.FC<{ onCreate?: () => void }> = ({
	onCreate,
}) => (
	<EmptyState
		icon={
			<svg
				className="w-12 h-12"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<title>Empty state icon</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
				/>
			</svg>
		}
		title="No collections yet"
		description="Create collections to organize your photos into themed groups."
		action={
			onCreate ? { label: "Create Collection", onClick: onCreate } : undefined
		}
	/>
);

export default EmptyState;
