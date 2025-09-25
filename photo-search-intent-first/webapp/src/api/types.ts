export type SearchResult = { path: string; score: number; reasons?: string[] };

export interface SearchOptions {
	// Authentication
	hfToken?: string;
	openaiKey?: string;

	// Basic search
	favoritesOnly?: boolean;
	tags?: string[];
	dateFrom?: number;
	dateTo?: number;

	// AI features
	useFast?: boolean;
	fastKind?: string;
	useCaptions?: boolean;
	useOcr?: boolean;
	hasText?: boolean;

	// Camera settings
	camera?: string;
	isoMin?: number;
	isoMax?: number;
	fMin?: number;
	fMax?: number;
	flash?: "fired" | "noflash";
	wb?: "auto" | "manual";
	metering?: string;

	// Location
	altMin?: number;
	altMax?: number;
	headingMin?: number;
	headingMax?: number;
	place?: string;

	// People
	person?: string;
	persons?: string[];
}

export interface SearchParams {
	dir: string;
	query: string;
	provider: string;
	topK?: number;
	options?: SearchOptions;
}

export interface SearchCachedParams {
	dir: string;
	query: string;
	provider: string;
	topK?: number;
	cacheKey?: string;
	options?: {
		hfToken?: string;
		openaiKey?: string;
		useFast?: boolean;
		fastKind?: string;
		useCaptions?: boolean;
		useOcr?: boolean;
	};
}

export interface SearchPaginatedParams {
	dir: string;
	query: string;
	provider: string;
	limit?: number;
	offset?: number;
	options?: SearchOptions;
}

export interface SearchWorkspaceParams {
	dir: string;
	query: string;
	provider: string;
	topK?: number;
	options?: {
		favoritesOnly?: boolean;
		tags?: string[];
		dateFrom?: number;
		dateTo?: number;
		place?: string;
		hasText?: boolean;
		person?: string;
		persons?: string[];
	};
}

export interface SearchLikeParams {
	dir: string;
	path: string;
	provider: string;
	topK?: number;
}

export interface SearchLikePlusParams {
	dir: string;
	path: string;
	provider: string;
	topK?: number;
	text?: string;
	weight?: number;
}

export interface CreateShareParams {
	dir: string;
	provider: string;
	paths: string[];
	options?: {
		expiryHours?: number;
		password?: string;
		viewOnly?: boolean;
	};
}

export interface OperationStatusParams {
	dir: string;
	operation: string;
}

export interface BuildParams {
	dir: string;
	options?: {
		force?: boolean;
		fast?: boolean;
	};
}

export interface FaceClustersParams {
	dir: string;
	options?: {
		threshold?: number;
	};
}

export interface MetadataBatchParams {
	dir: string;
	paths: string[];
	operation: string;
	value?: string | number | boolean | string[] | Record<string, unknown>;
}

export interface WorkspaceParams {
	dir: string;
	workspace: string;
	operation: string;
	value?: string | number | boolean | string[] | Record<string, unknown>;
}

// Response types
export interface SearchResponse {
	search_id: string;
	results: SearchResult[];
}

export interface SearchCachedResponse {
	search_id: string;
	results: SearchResult[];
	cached: boolean;
	cache_key: string;
}

export interface CreateShareResponse {
	ok: boolean;
	token: string;
	url: string;
	expires?: string;
}

export interface CollectionsResponse {
	collections: Record<string, string[]>;
}

export interface OperationStatusResponse {
	state: string;
	start?: string;
	end?: string;
	total?: number;
	done?: number;
}

export interface AuthStatusResponse {
	auth_required: boolean;
}

export interface PingResponse {
	ok: boolean;
}

export interface DiagnosticsResponse {
	index: {
		total_photos: number;
		indexed_photos: number;
		embedding_provider: string;
		model_status: string;
	};
	features: {
		ocr: boolean;
		captions: boolean;
		faces: boolean;
	};
	system: {
		python_version: string;
		torch_available: boolean;
		gpu_available: boolean;
	};
}

export interface LibraryResponse {
	paths: string[];
	has_more: boolean;
}

export interface TagsResponse {
	tags: string[];
	tags_map: Record<string, string[]>;
}

export interface SavedSearchesResponse {
	saved: Array<{ name: string; query: string; top_k?: number }>;
}

export interface FavoritesResponse {
	favorites: string[];
}

export interface MapResponse {
	photos: Array<{
		path: string;
		latitude: number;
		longitude: number;
		altitude?: number;
		heading?: number;
	}>;
	bounds?: {
		north: number;
		south: number;
		east: number;
		west: number;
	};
}

export interface ExportResponse {
	ok: boolean;
	message?: string;
}

export interface DemoDirResponse {
	path: string;
	ready: boolean;
}

// Preset types
export interface SearchPreset {
	name: string;
	query?: string;
	options?: SearchOptions;
	topK?: number;
	created?: string;
}

export interface PresetsResponse {
	presets: SearchPreset[];
}

// Smart collection types
export interface SmartCollectionDefinition {
	query?: string;
	options?: SearchOptions;
	autoUpdate?: boolean;
	lastUpdated?: string;
}

export interface SmartCollectionsResponse {
	smart_collections: Record<string, SmartCollectionDefinition>;
}

// Metadata types
export interface PhotoMetadata {
	path: string;
	size?: number;
	modified?: number;
	width?: number;
	height?: number;
	make?: string;
	model?: string;
	iso?: number;
	focal_length?: number;
	aperture?: number;
	shutter_speed?: number;
	flash?: string;
	white_balance?: string;
	metering_mode?: string;
	exposure_compensation?: number;
	gps?: {
		latitude?: number;
		longitude?: number;
		altitude?: number;
		heading?: number;
	};
	ocr_text?: string;
	caption?: string;
	faces?: Array<{
		name?: string;
		bbox: [number, number, number, number];
		confidence?: number;
	}>;
	tags?: string[];
	favorite?: boolean;
}

export interface FaceClustersResponse {
	clusters: Array<{
		representative: string;
		members: string[];
		confidence: number;
	}>;
}
