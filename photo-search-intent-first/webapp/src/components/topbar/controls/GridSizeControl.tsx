import type React from "react";

export type GridSize = "small" | "medium" | "large";

export const GridSizeControl: React.FC<{
	gridSize: GridSize;
	setGridSize: (s: GridSize) => void;
}> = ({ gridSize, setGridSize }) => {
	const handle = (s: GridSize) => () => setGridSize(s);
	return (
		<div className="grid-size-control">
			{(["small", "medium", "large"] as GridSize[]).map((s) => (
				<button
					type="button"
					key={s}
					onClick={handle(s)}
					className={`grid-size-button ${gridSize === s ? "active" : ""}`}
					aria-label={`Set grid size to ${s}`}
				>
					{s.charAt(0).toUpperCase() + s.slice(1)}
				</button>
			))}
		</div>
	);
};
