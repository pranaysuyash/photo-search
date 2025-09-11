import { Filter, FolderOpen, Save, Trash2, X, Zap } from "lucide-react";
import { useState } from "react";
import {
	applyFilterPreset,
	createFilterPreset,
	type FilterPreset,
} from "../models/FilterPreset";
import { QuickFilters } from "./QuickFilters";

interface FilterPanelProps {
	show: boolean;
	onClose: () => void;
	onApply: () => void;
	favOnly: boolean;
	setFavOnly: (value: boolean) => void;
	tagFilter: string;
	setTagFilter: (value: string) => void;
	camera: string;
	setCamera: (value: string) => void;
	isoMin: string;
	setIsoMin: (value: string) => void;
	isoMax: string;
	setIsoMax: (value: string) => void;
	dateFrom: string;
	setDateFrom: (value: string) => void;
	dateTo: string;
	setDateTo: (value: string) => void;
	fMin: string;
	setFMin: (value: string) => void;
	fMax: string;
	setFMax: (value: string) => void;
	place: string;
	setPlace: (value: string) => void;
	useCaps: boolean;
	setUseCaps: (value: boolean) => void;
	useOcr: boolean;
	setUseOcr: (value: boolean) => void;
	hasText: boolean;
	setHasText: (value: boolean) => void;
	ratingMin: number;
	setRatingMin: (value: number) => void;
	// Metadata for filter suggestions
	availableCameras?: string[];
	yearRange?: [number, number];
	// Filter presets
	filterPresets: FilterPreset[];
	onSavePreset: (preset: FilterPreset) => void;
	onLoadPreset: (preset: FilterPreset) => void;
	onDeletePreset: (presetId: string) => void;
}

export function FilterPanel({
	show,
	onClose,
	onApply,
	favOnly,
	setFavOnly,
	tagFilter,
	setTagFilter,
	camera,
	setCamera,
	isoMin,
	setIsoMin,
	isoMax,
	setIsoMax,
	dateFrom,
	setDateFrom,
	dateTo,
	setDateTo,
	fMin,
	setFMin,
	fMax,
	setFMax,
	place,
	setPlace,
	useCaps,
	setUseCaps,
	useOcr,
	setUseOcr,
	hasText,
	setHasText,
	ratingMin,
	setRatingMin,
	availableCameras,
	yearRange,
	filterPresets,
	onSavePreset,
	onLoadPreset,
	onDeletePreset,
}: FilterPanelProps) {
	const [showPresets, setShowPresets] = useState(false);
	const [newPresetName, setNewPresetName] = useState("");
	const [showSaveForm, setShowSaveForm] = useState(false);

	if (!show) return null;

	// Function to get current filter values
	const getCurrentFilters = () => ({
		favOnly,
		tagFilter,
		place,
		camera,
		isoMin,
		isoMax,
		fMin,
		fMax,
		dateFrom,
		dateTo,
		useCaps,
		useOcr,
		hasText,
		ratingMin,
	});

	// Function to clear all filters
	const clearAllFilters = () => {
		setFavOnly(false);
		setTagFilter("");
		setPlace("");
		setCamera("");
		setIsoMin("");
		setIsoMax("");
		setFMin("");
		setFMax("");
		setDateFrom("");
		setDateTo("");
		setUseCaps(false);
		setUseOcr(false);
		setHasText(false);
		setRatingMin(0);
	};

	// Function to save current filters as a preset
	const handleSavePreset = () => {
		if (!newPresetName.trim()) return;

		const preset = createFilterPreset(
			newPresetName.trim(),
			getCurrentFilters(),
		);
		onSavePreset(preset);
		setNewPresetName("");
		setShowSaveForm(false);
	};

	// Function to apply a preset
	const handleLoadPreset = (preset: FilterPreset) => {
		applyFilterPreset(preset, {
			setFavOnly,
			setTagFilter,
			setPlace,
			setCamera,
			setIsoMin,
			setIsoMax,
			setFMin,
			setFMax,
			setDateFrom,
			setDateTo,
			setUseCaps,
			setUseOcr,
			setHasText,
			setRatingMin,
		});
		setShowPresets(false);
	};

	return (
		<div className="fixed inset-0 bg-black/40 z-40 flex">
			<div className="ml-auto w-full max-w-md bg-white border-l flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<h3 className="font-semibold flex items-center gap-2">
						<Filter className="w-5 h-5" />
						Filters
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded hover:bg-gray-100"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b">
					<button
						type="button"
						className={`flex-1 py-3 text-sm font-medium ${!showPresets ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
						onClick={() => setShowPresets(false)}
					>
						Filters
					</button>
					<button
						type="button"
						className={`flex-1 py-3 text-sm font-medium ${showPresets ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
						onClick={() => setShowPresets(true)}
					>
						Presets
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4">
					{showPresets ? (
						// Presets View
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<h4 className="font-medium">Saved Filter Presets</h4>
								<button
									type="button"
									onClick={() => setShowSaveForm(true)}
									className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1 rounded"
								>
									<Save className="w-4 h-4" />
									Save Current
								</button>
							</div>

							{showSaveForm && (
								<div className="border rounded p-3 bg-blue-50">
									<h5 className="font-medium mb-2">Save Current Filters</h5>
									<div className="flex gap-2">
										<input
											type="text"
											value={newPresetName}
											onChange={(e) => setNewPresetName(e.target.value)}
											placeholder="Preset name"
											className="flex-1 border rounded px-2 py-1 text-sm"
										/>
										<button
											type="button"
											onClick={handleSavePreset}
											disabled={!newPresetName.trim()}
											className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
										>
											Save
										</button>
										<button
											type="button"
											onClick={() => {
												setShowSaveForm(false);
												setNewPresetName("");
											}}
											className="px-3 py-1 border rounded text-sm"
										>
											Cancel
										</button>
									</div>
								</div>
							)}

							{filterPresets.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<FolderOpen className="w-12 h-12 mx-auto mb-2" />
									<p>No saved presets yet</p>
									<p className="text-sm mt-1">
										Save your filter combinations for quick access
									</p>
								</div>
							) : (
								<div className="space-y-2">
									{filterPresets.map((preset) => (
										<div
											key={preset.id}
											className="border rounded p-3 hover:bg-gray-50"
										>
											<div className="flex justify-between items-start">
												<div className="min-w-0 flex-1">
													<div
														className="font-medium truncate"
														title={preset.name}
													>
														{preset.name}
													</div>
													<div className="text-xs text-gray-500 mt-1">
														{Object.keys(preset.filters).length} filters
													</div>
												</div>
												<div className="flex gap-1">
													<button
														type="button"
														onClick={() => handleLoadPreset(preset)}
														className="p-1 rounded hover:bg-gray-200"
														title="Apply preset"
													>
														<Zap className="w-4 h-4" />
													</button>
													<button
														type="button"
														onClick={() => onDeletePreset(preset.id)}
														className="p-1 rounded hover:bg-red-100 text-red-600"
														title="Delete preset"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					) : (
						// Filters View
						<>
							<QuickFilters
								cameras={availableCameras}
								yearRange={yearRange}
								camera={camera}
								setCamera={setCamera}
								isoMin={isoMin}
								setIsoMin={setIsoMin}
								isoMax={isoMax}
								setIsoMax={setIsoMax}
								fMin={fMin}
								setFMin={setFMin}
								fMax={fMax}
								setFMax={setFMax}
								dateFrom={dateFrom}
								setDateFrom={setDateFrom}
								dateTo={dateTo}
								setDateTo={setDateTo}
								onApplyFilters={onApply}
								onClearFilters={clearAllFilters}
								compact
							/>

							<div className="space-y-4 text-sm">
								{/* Basic Filters */}
								<div className="space-y-3">
									<h4 className="font-medium text-gray-900">Basic Filters</h4>
									<div className="flex items-center justify-between">
										<label htmlFor="flt-fav">Favorites only</label>
										<input
											id="flt-fav"
											type="checkbox"
											checked={favOnly}
											onChange={(e) => setFavOnly(e.target.checked)}
										/>
									</div>
									<div>
										<label className="block mb-1" htmlFor="flt-tags">
											Tags (comma-separated)
										</label>
										<input
											id="flt-tags"
											className="w-full border rounded px-2 py-1"
											value={tagFilter}
											onChange={(e) => setTagFilter(e.target.value)}
											placeholder="portrait, landscape, vacation"
										/>
									</div>
									<div>
										<label className="block mb-1" htmlFor="flt-place">
											Location/Place
										</label>
										<input
											id="flt-place"
											className="w-full border rounded px-2 py-1"
											value={place}
											onChange={(e) => setPlace(e.target.value)}
											placeholder="New York, Beach, Mountains"
										/>
									</div>
								</div>

								{/* Search Features */}
								<div className="space-y-3 pt-3 border-t">
									<h4 className="font-medium text-gray-900">Search Features</h4>
									<div className="flex items-center justify-between">
										<label htmlFor="flt-caps">
											<span>Use AI captions</span>
											<div className="text-xs text-gray-500">
												Search in generated image descriptions
											</div>
										</label>
										<input
											id="flt-caps"
											type="checkbox"
											checked={useCaps}
											onChange={(e) => setUseCaps(e.target.checked)}
										/>
									</div>
									<div className="flex items-center justify-between">
										<label htmlFor="flt-ocr">
											<span>Use OCR</span>
											<div className="text-xs text-gray-500">
												Search for text within images
											</div>
										</label>
										<input
											id="flt-ocr"
											type="checkbox"
											checked={useOcr}
											onChange={(e) => setUseOcr(e.target.checked)}
										/>
									</div>
									<div className="flex items-center justify-between">
										<label htmlFor="flt-hastext">
											<span>Has text</span>
											<div className="text-xs text-gray-500">
												Only images containing readable text
											</div>
										</label>
										<input
											id="flt-hastext"
											type="checkbox"
											checked={hasText}
											onChange={(e) => setHasText(e.target.checked)}
										/>
									</div>
								</div>

								{/* Rating Filter */}
								<div className="space-y-3 pt-3 border-t">
									<h4 className="font-medium text-gray-900">Rating</h4>
									<div className="flex items-center gap-2">
										<span className="text-sm">Minimum rating:</span>
										{[0, 1, 2, 3, 4, 5].map((rating) => (
											<button
												key={rating}
												type="button"
												className={`px-2 py-1 rounded text-sm ${
													ratingMin === rating
														? "bg-blue-600 text-white"
														: "bg-gray-100 hover:bg-gray-200"
												}`}
												onClick={() => setRatingMin(rating)}
											>
												{rating === 0 ? "Any" : "★".repeat(rating)}
											</button>
										))}
									</div>
								</div>

								{/* Date Range */}
								<div className="space-y-3 pt-3 border-t">
									<h4 className="font-medium text-gray-900">Date Range</h4>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label
												className="block mb-1"
												htmlFor="flt-date-from-manual"
											>
												Date From
											</label>
											<input
												id="flt-date-from-manual"
												type="date"
												className="w-full border rounded px-2 py-1"
												value={dateFrom}
												onChange={(e) => setDateFrom(e.target.value)}
											/>
										</div>
										<div>
											<label
												className="block mb-1"
												htmlFor="flt-date-to-manual"
											>
												Date To
											</label>
											<input
												id="flt-date-to-manual"
												type="date"
												className="w-full border rounded px-2 py-1"
												value={dateTo}
												onChange={(e) => setDateTo(e.target.value)}
											/>
										</div>
									</div>
								</div>
							</div>
						</>
					)}
				</div>

				{/* Footer Actions */}
				<div className="flex justify-between items-center p-4 border-t bg-gray-50">
					<button
						type="button"
						onClick={clearAllFilters}
						className="text-sm text-gray-600 hover:text-gray-800"
					>
						Clear All Filters
					</button>
					<div className="flex gap-2">
						<button
							type="button"
							className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							type="button"
							className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
							onClick={onApply}
						>
							Apply Filters
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
