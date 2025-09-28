import type React from "react";

interface SkeletonProps {
	className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
	return <div className={`skeleton ${className}`} />;
};

export const SkeletonText: React.FC<SkeletonProps> = ({ className = "" }) => {
	return <div className={`skeleton-text ${className}`} />;
};

export const SkeletonTitle: React.FC<SkeletonProps> = ({ className = "" }) => {
	return <div className={`skeleton-title ${className}`} />;
};

export const SkeletonAvatar: React.FC<SkeletonProps> = ({ className = "" }) => {
	return <div className={`skeleton-avatar ${className}`} />;
};

interface PhotoGridSkeletonProps {
	count?: number;
	columns?: number;
}

export const PhotoGridSkeleton: React.FC<PhotoGridSkeletonProps> = ({
	count = 24,
	columns = 8,
}) => {
	const gridCols = {
		3: "grid-cols-3",
		4: "grid-cols-4",
		5: "md:grid-cols-5",
		6: "md:grid-cols-6",
		8: "lg:grid-cols-8",
	};

	return (
		<div
			className={`grid grid-cols-3 ${
				gridCols[columns as keyof typeof gridCols] || "lg:grid-cols-8"
			} gap-2`}
		>
			{Array.from({ length: count }, (_, index) => (
				<div key={`skeleton-grid-item-${index}`} className="aspect-square">
					<Skeleton className="w-full h-full rounded-lg" />
				</div>
			))}
		</div>
	);
};

export default Skeleton;
