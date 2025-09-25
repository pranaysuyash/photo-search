import { Grid as IconGrid, List as IconList } from "lucide-react";
import type React from "react";

export type ViewType =
	| "results"
	| "library"
	| "map"
	| "people"
	| "tasks"
	| "trips";

export const ViewModeControl: React.FC<{
	selectedView: ViewType;
	setSelectedView: (v: ViewType) => void;
}> = ({ selectedView, setSelectedView }) => {
	const setResults = () => setSelectedView("results");
	const setLibrary = () => setSelectedView("library");
	return (
		<div className="view-mode-control">
			<button
				type="button"
				onClick={setResults}
				className={`view-mode-button ${
					selectedView === "results" ? "active" : ""
				}`}
				aria-label="Grid view"
			>
				<IconGrid className="w-4 h-4" />
			</button>
			<button
				type="button"
				onClick={setLibrary}
				className={`view-mode-button ${
					selectedView === "library" ? "active" : ""
				}`}
				aria-label="List view"
			>
				<IconList className="w-4 h-4" />
			</button>
		</div>
	);
};
