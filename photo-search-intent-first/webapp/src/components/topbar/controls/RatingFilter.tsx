import type React from "react";

export const RatingFilter: React.FC<{
	ratingMin: number;
	setRatingMin: (n: number) => void;
}> = ({ ratingMin, setRatingMin }) => {
	const set = (n: number) => () => setRatingMin(n);
	return (
		<div className="rating-filter">
			<span>Min rating:</span>
			{[0, 1, 2, 3, 4, 5].map((n) => (
				<button
					key={n}
					type="button"
					className={`rating-button ${ratingMin === n ? "active" : ""}`}
					onClick={set(n)}
					aria-label={`Filter by minimum rating of ${n}`}
				>
					{n === 0 ? "Any" : `${"★".repeat(n)}`}
				</button>
			))}
		</div>
	);
};
