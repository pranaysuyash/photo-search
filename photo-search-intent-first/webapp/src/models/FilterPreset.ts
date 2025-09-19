// Filter Preset Data Structure
export interface FilterPreset {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	filters: {
		// Basic filters
		favOnly?: boolean;
		tagFilter?: string;
		place?: string;

		// Camera and lens filters
		camera?: string;
		isoMin?: string;
		isoMax?: string;
		fMin?: string;
		fMax?: string;

		// Date filters
		dateFrom?: string;
		dateTo?: string;

		// Search features
		useCaps?: boolean;
		useOcr?: boolean;
		hasText?: boolean;

		// Rating filter
		ratingMin?: number;
	};
}

// Function to create a filter preset from current filter values
export function createFilterPreset(
	name: string,
	filters: FilterPreset["filters"],
): FilterPreset {
	const now = Date.now();
	return {
		id: `preset_${now}_${Math.random().toString(36).substr(2, 9)}`,
		name,
		createdAt: now,
		updatedAt: now,
		filters,
	};
}

// Function to apply a filter preset to update filter state
export function applyFilterPreset(
	preset: FilterPreset,
	setters: {
		setFavOnly: (value: boolean) => void;
		setTagFilter: (value: string) => void;
		setPlace: (value: string) => void;
		setCamera: (value: string) => void;
		setIsoMin: (value: string) => void;
		setIsoMax: (value: string) => void;
		setFMin: (value: string) => void;
		setFMax: (value: string) => void;
		setDateFrom: (value: string) => void;
		setDateTo: (value: string) => void;
		setUseCaps: (value: boolean) => void;
		setUseOcr: (value: boolean) => void;
		setHasText: (value: boolean) => void;
		setRatingMin: (value: number) => void;
		// Optional setters used by FilterPanel for additional UI filters
		setPerson?: (value: string) => void;
		setCollection?: (value: string) => void;
		setColor?: (value: string) => void;
		setOrientation?: (value: string) => void;
	},
): void {
	const { filters } = preset;

	// Apply each filter if it exists in the preset
	if (filters.favOnly !== undefined) setters.setFavOnly(filters.favOnly);
	if (filters.tagFilter !== undefined) setters.setTagFilter(filters.tagFilter);
	if (filters.place !== undefined) setters.setPlace(filters.place);
	if (filters.camera !== undefined) setters.setCamera(filters.camera);
	if (filters.isoMin !== undefined) setters.setIsoMin(filters.isoMin);
	if (filters.isoMax !== undefined) setters.setIsoMax(filters.isoMax);
	if (filters.fMin !== undefined) setters.setFMin(filters.fMin);
	if (filters.fMax !== undefined) setters.setFMax(filters.fMax);
	if (filters.dateFrom !== undefined) setters.setDateFrom(filters.dateFrom);
	if (filters.dateTo !== undefined) setters.setDateTo(filters.dateTo);
	if (filters.useCaps !== undefined) setters.setUseCaps(filters.useCaps);
	if (filters.useOcr !== undefined) setters.setUseOcr(filters.useOcr);
	if (filters.hasText !== undefined) setters.setHasText(filters.hasText);
	if (filters.ratingMin !== undefined) setters.setRatingMin(filters.ratingMin);
}
