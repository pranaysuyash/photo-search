import { Aperture, Calendar, Camera, Zap } from "lucide-react";
import { useState } from "react";

interface QuickFiltersProps {
	// Available filter options (would be loaded from metadata)
	cameras?: string[];
	popularISOs?: number[];
	popularApertures?: number[];
	yearRange?: [number, number];

	// Current filter values
	camera: string;
	setCamera: (camera: string) => void;
	isoMin: string;
	setIsoMin: (iso: string) => void;
	isoMax: string;
	setIsoMax: (iso: string) => void;
	fMin: string;
	setFMin: (f: string) => void;
	fMax: string;
	setFMax: (f: string) => void;
	dateFrom: string;
	setDateFrom: (date: string) => void;
	dateTo: string;
	setDateTo: (date: string) => void;

	// Actions
	onApplyFilters: () => void;
	onClearFilters: () => void;
	compact?: boolean;
}

export function QuickFilters({
	cameras = [],
	popularISOs = [100, 200, 400, 800, 1600, 3200],
	popularApertures = [1.4, 1.8, 2.8, 4.0, 5.6, 8.0],
	yearRange,
	camera,
	setCamera,
	isoMin,
	setIsoMin,
	isoMax,
	setIsoMax,
	fMin,
	setFMin,
	fMax,
	setFMax,
	dateFrom,
	setDateFrom,
	dateTo,
	setDateTo,
	onApplyFilters,
	onClearFilters,
	compact = false,
}: QuickFiltersProps) {
	const [activeCategory, setActiveCategory] = useState<string>("camera");

	// Check if any filters are active
	const hasActiveFilters =
		camera || isoMin || isoMax || fMin || fMax || dateFrom || dateTo;

	const categories = [
		{
			id: "camera",
			label: "Camera",
			icon: Camera,
			content: (
				<div className="space-y-2">
					<div className="flex flex-wrap gap-1">
						<button
							type="button"
							onClick={() => setCamera("")}
							className={`px-2 py-1 text-xs rounded border ${
								!camera
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white border-gray-300 hover:bg-gray-50"
							}`}
						>
							Any Camera
						</button>
						{cameras.slice(0, compact ? 4 : 8).map((cam) => (
							<button
								key={cam}
								type="button"
								onClick={() => setCamera(camera === cam ? "" : cam)}
								className={`px-2 py-1 text-xs rounded border truncate max-w-32 ${
									camera === cam
										? "bg-blue-600 text-white border-blue-600"
										: "bg-white border-gray-300 hover:bg-gray-50"
								}`}
								title={cam}
							>
								{cam.length > 20 ? `${cam.substring(0, 20)}...` : cam}
							</button>
						))}
					</div>
				</div>
			),
		},
		{
			id: "aperture",
			label: "Aperture",
			icon: Aperture,
			content: (
				<div className="space-y-2">
					<div className="text-xs text-gray-600 mb-1">
						Quick select f-stop range:
					</div>
					<div className="flex flex-wrap gap-1">
						<button
							type="button"
							onClick={() => {
								setFMin("");
								setFMax("");
							}}
							className={`px-2 py-1 text-xs rounded border ${
								!fMin && !fMax
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white border-gray-300 hover:bg-gray-50"
							}`}
						>
							Any
						</button>
						{popularApertures.map((f) => (
							<button
								key={f}
								type="button"
								onClick={() => {
									const fStr = f.toString();
									if (fMin === fStr && fMax === fStr) {
										setFMin("");
										setFMax("");
									} else {
										setFMin(fStr);
										setFMax(fStr);
									}
								}}
								className={`px-2 py-1 text-xs rounded border ${
									fMin === f.toString() && fMax === f.toString()
										? "bg-blue-600 text-white border-blue-600"
										: "bg-white border-gray-300 hover:bg-gray-50"
								}`}
							>
								f/{f}
							</button>
						))}
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label
								htmlFor="min-fstop"
								className="block text-xs text-gray-600 mb-1"
							>
								Min f-stop
							</label>
							<input
								id="min-fstop"
								type="number"
								step="0.1"
								min="0.7"
								max="32"
								value={fMin}
								onChange={(e) => setFMin(e.target.value)}
								className="w-full text-xs border rounded px-2 py-1"
								placeholder="1.4"
							/>
						</div>
						<div>
							<label
								htmlFor="max-fstop"
								className="block text-xs text-gray-600 mb-1"
							>
								Max f-stop
							</label>
							<input
								id="max-fstop"
								type="number"
								step="0.1"
								min="0.7"
								max="32"
								value={fMax}
								onChange={(e) => setFMax(e.target.value)}
								className="w-full text-xs border rounded px-2 py-1"
								placeholder="8.0"
							/>
						</div>
					</div>
				</div>
			),
		},
		{
			id: "iso",
			label: "ISO",
			icon: Zap,
			content: (
				<div className="space-y-2">
					<div className="text-xs text-gray-600 mb-1">
						Quick select ISO range:
					</div>
					<div className="flex flex-wrap gap-1">
						<button
							type="button"
							onClick={() => {
								setIsoMin("");
								setIsoMax("");
							}}
							className={`px-2 py-1 text-xs rounded border ${
								!isoMin && !isoMax
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white border-gray-300 hover:bg-gray-50"
							}`}
						>
							Any
						</button>
						<button
							type="button"
							onClick={() => {
								setIsoMin("");
								setIsoMax("800");
							}}
							className={`px-2 py-1 text-xs rounded border ${
								!isoMin && isoMax === "800"
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white border-gray-300 hover:bg-gray-50"
							}`}
						>
							Low (≤800)
						</button>
						<button
							type="button"
							onClick={() => {
								setIsoMin("800");
								setIsoMax("");
							}}
							className={`px-2 py-1 text-xs rounded border ${
								isoMin === "800" && !isoMax
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white border-gray-300 hover:bg-gray-50"
							}`}
						>
							High (≥800)
						</button>
					</div>
					<div className="flex flex-wrap gap-1">
						{popularISOs.map((iso) => (
							<button
								key={iso}
								type="button"
								onClick={() => {
									const isoStr = iso.toString();
									if (isoMin === isoStr && isoMax === isoStr) {
										setIsoMin("");
										setIsoMax("");
									} else {
										setIsoMin(isoStr);
										setIsoMax(isoStr);
									}
								}}
								className={`px-2 py-1 text-xs rounded border ${
									isoMin === iso.toString() && isoMax === iso.toString()
										? "bg-blue-600 text-white border-blue-600"
										: "bg-white border-gray-300 hover:bg-gray-50"
								}`}
							>
								{iso}
							</button>
						))}
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label
								htmlFor="min-iso"
								className="block text-xs text-gray-600 mb-1"
							>
								Min ISO
							</label>
							<input
								id="min-iso"
								type="number"
								min="50"
								max="102400"
								step="100"
								value={isoMin}
								onChange={(e) => setIsoMin(e.target.value)}
								className="w-full text-xs border rounded px-2 py-1"
								placeholder="100"
							/>
						</div>
						<div>
							<label
								htmlFor="max-iso"
								className="block text-xs text-gray-600 mb-1"
							>
								Max ISO
							</label>
							<input
								id="max-iso"
								type="number"
								min="50"
								max="102400"
								step="100"
								value={isoMax}
								onChange={(e) => setIsoMax(e.target.value)}
								className="w-full text-xs border rounded px-2 py-1"
								placeholder="3200"
							/>
						</div>
					</div>
				</div>
			),
		},
		{
			id: "date",
			label: "Date",
			icon: Calendar,
			content: (
				<div className="space-y-2">
					{yearRange && (
						<div className="flex flex-wrap gap-1 mb-2">
							<button
								type="button"
								onClick={() => {
									setDateFrom("");
									setDateTo("");
								}}
								className={`px-2 py-1 text-xs rounded border ${
									!dateFrom && !dateTo
										? "bg-blue-600 text-white border-blue-600"
										: "bg-white border-gray-300 hover:bg-gray-50"
								}`}
							>
								Any Year
							</button>
							{Array.from(
								{ length: Math.min(6, yearRange[0] - yearRange[1] + 1) },
								(_, i) => yearRange[0] - i,
							).map((year) => (
								<button
									key={year}
									type="button"
									onClick={() => {
										const startOfYear = `${year}-01-01`;
										const endOfYear = `${year}-12-31`;
										if (dateFrom === startOfYear && dateTo === endOfYear) {
											setDateFrom("");
											setDateTo("");
										} else {
											setDateFrom(startOfYear);
											setDateTo(endOfYear);
										}
									}}
									className={`px-2 py-1 text-xs rounded border ${
										dateFrom === `${year}-01-01` && dateTo === `${year}-12-31`
											? "bg-blue-600 text-white border-blue-600"
											: "bg-white border-gray-300 hover:bg-gray-50"
									}`}
								>
									{year}
								</button>
							))}
						</div>
					)}
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label
								htmlFor="date-from"
								className="block text-xs text-gray-600 mb-1"
							>
								From
							</label>
							<input
								id="date-from"
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className="w-full text-xs border rounded px-2 py-1"
							/>
						</div>
						<div>
							<label
								htmlFor="date-to"
								className="block text-xs text-gray-600 mb-1"
							>
								To
							</label>
							<input
								id="date-to"
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className="w-full text-xs border rounded px-2 py-1"
							/>
						</div>
					</div>
				</div>
			),
		},
	];

	if (compact) {
		// Compact horizontal layout
		return (
			<div className="bg-white border rounded-lg p-3">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">Quick Filters</span>
						{hasActiveFilters && (
							<span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
								Active
							</span>
						)}
					</div>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={onApplyFilters}
							className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
						>
							Apply
						</button>
						{hasActiveFilters && (
							<button
								type="button"
								onClick={onClearFilters}
								className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
							>
								Clear
							</button>
						)}
					</div>
				</div>

				<div className="flex gap-2 overflow-x-auto">
					{categories.map((category) => {
						const Icon = category.icon;
						return (
							<div key={category.id} className="flex-shrink-0 min-w-48">
								<div className="flex items-center gap-1 mb-1">
									<Icon className="w-3 h-3 text-gray-500" />
									<span className="text-xs font-medium text-gray-700">
										{category.label}
									</span>
								</div>
								<div className="text-xs">{category.content}</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	// Full vertical layout
	return (
		<div className="bg-white border rounded-lg">
			<div className="flex items-center justify-between p-3 border-b">
				<div className="flex items-center gap-2">
					<span className="font-medium">Quick Filters</span>
					{hasActiveFilters && (
						<span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
							{
								[camera, isoMin, isoMax, fMin, fMax, dateFrom, dateTo].filter(
									Boolean,
								).length
							}{" "}
							active
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onApplyFilters}
						className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
					>
						Apply
					</button>
					{hasActiveFilters && (
						<button
							type="button"
							onClick={onClearFilters}
							className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
						>
							Clear All
						</button>
					)}
				</div>
			</div>

			<div className="flex border-b">
				{categories.map((category) => {
					const Icon = category.icon;
					return (
						<button
							key={category.id}
							type="button"
							onClick={() => setActiveCategory(category.id)}
							className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm border-r last:border-r-0 ${
								activeCategory === category.id
									? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
									: "hover:bg-gray-50 text-gray-700"
							}`}
						>
							<Icon className="w-4 h-4" />
							{category.label}
						</button>
					);
				})}
			</div>

			<div className="p-4">
				{categories.find((c) => c.id === activeCategory)?.content}
			</div>
		</div>
	);
}
