// Analytics event types for job progress tracking
export interface AnalyticsEvent {
	// Required fields
	type: string;
	dir: string;

	// Optional fields
	job_id?: string;
	time?: number; // Unix timestamp added by server

	// Event-specific payload (arbitrary fields)
	[key: string]: unknown;
}

// Common analytics event types
export type AnalyticsEventType =
	| "index_start"
	| "index_progress"
	| "index_complete"
	| "index_error"
	| "search_start"
	| "search_complete"
	| "cancel_requested"
	| "cancel_confirmed"
	| "job_timeout"
	| "storage_warning"
	| "storage_error";

// Analytics API response types
export interface AnalyticsResponse {
	events: AnalyticsEvent[];
}

export interface AnalyticsEventRequest {
	type: string;
	dir: string;
	job_id?: string;
	[key: string]: unknown;
}

// Analytics event payloads for specific event types
export interface IndexProgressEvent extends AnalyticsEvent {
	type: "index_progress";
	job_id: string;
	processed: number;
	total: number;
	current_file?: string;
	eta_seconds?: number;
}

export interface IndexCompleteEvent extends AnalyticsEvent {
	type: "index_complete";
	job_id: string;
	total_processed: number;
	duration_seconds: number;
	new_files: number;
	updated_files: number;
}

export interface SearchCompleteEvent extends AnalyticsEvent {
	type: "search_complete";
	job_id: string;
	query: string;
	results_count: number;
	duration_ms: number;
}
