export type SearchResult = { path: string; score: number; reasons?: string[] };

interface WindowWithElectron extends Window {
	electronAPI?: {
		selectFolder: () => Promise<string | null>;
	};
	process?: {
		type?: string;
	};
}

// Utility function to detect Electron environment
export function isElectron(): boolean {
	const windowElectron = window as WindowWithElectron;
	return (
		typeof window !== "undefined" &&
		(windowElectron.electronAPI !== undefined ||
			windowElectron.process?.type === "renderer" ||
			navigator.userAgent.toLowerCase().includes("electron"))
	);
}

// Compute API base URL robustly across web, dev, and Electron (file://) contexts
function computeApiBase(): string {
  const envBase = import.meta.env?.VITE_API_BASE;
  if (envBase) return envBase;
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    // Use real HTTP origin only
    if (origin && origin.startsWith("http")) return origin;
  } catch {}
  // In Electron packaged builds (file:// origin), talk to the bundled API server
  if (isElectron()) return "http://127.0.0.1:8000";
  // Fallback sensible default for dev server
  return "http://127.0.0.1:5173"; // overridden by env in real deployments
}

export const API_BASE = computeApiBase();

function authHeaders() {
	try {
		// Runtime token from localStorage should take precedence in dev
		const ls =
			typeof window !== "undefined" ? localStorage.getItem("api_token") : null;
			const envTok = import.meta.env?.VITE_API_TOKEN;
		const token = ls || envTok;
		if (token)
			return { Authorization: `Bearer ${token}` } as Record<string, string>;
	} catch {}
	return {} as Record<string, string>;
}

export async function apiPing(): Promise<boolean> {
	try {
		const r = await fetch(`${API_BASE}/api/ping`);
		if (!r.ok) return false;
		const js = await r.json();
		return Boolean(js?.ok);
	} catch {
		return false;
	}
}

export async function apiAuthStatus(): Promise<{ auth_required: boolean }> {
	try {
		const r = await fetch(`${API_BASE}/auth/status`);
		if (!r.ok) return { auth_required: false };
		return (await r.json()) as { auth_required: boolean };
	} catch {
		return { auth_required: false };
	}
}

export async function apiAuthCheck(token: string): Promise<boolean> {
	try {
		const r = await fetch(`${API_BASE}/auth/check`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		});
		return r.ok;
	} catch {
		return false;
	}
}

export async function apiDemoDir(): Promise<string | null> {
	try {
		const r = await fetch(`${API_BASE}/demo/dir`);
		if (!r.ok) return null;
		const js = (await r.json()) as { ok?: boolean; dir?: string };
		return js?.ok && js?.dir ? js.dir : null;
	} catch {
		return null;
	}
}

async function post<T>(path: string, body: unknown): Promise<T> {
	const r = await fetch(`${API_BASE}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify(body),
	});
	if (!r.ok) {
		if (r.status === 401) {
			throw new Error(
				"401 Unauthorized: Configure API_TOKEN for the server and VITE_API_TOKEN (or localStorage `api_token`) for the webapp.",
			);
		}
		throw new Error(await r.text());
	}
	return r.json();
}

export async function apiIndex(
	dir: string,
	provider: string,
	batchSize = 32,
	hfToken?: string,
	openaiKey?: string,
) {
	return post<{ new: number; updated: number; total: number }>("/index", {
		dir,
		provider,
		batch_size: batchSize,
		hf_token: hfToken,
		openai_key: openaiKey,
	});
}

export async function apiIndexStatus(
	dir: string,
	provider: string,
	hfToken?: string,
	openaiKey?: string,
) {
	const qs = new URLSearchParams({ dir, provider });
	if (hfToken) qs.set("hf_token", hfToken);
	if (openaiKey) qs.set("openai_key", openaiKey);
	const r = await fetch(`${API_BASE}/index/status?${qs.toString()}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		state?: string;
		start?: string;
		end?: string;
		target?: number;
		existing?: number;
		insert_done?: number;
		insert_total?: number;
		updated_done?: number;
		updated_total?: number;
		total?: number;
		new?: number;
		updated?: number;
	}>;
}

export async function apiIndexPause(dir: string) {
	return post<{ ok: boolean }>("/index/pause", { dir });
}

export async function apiIndexResume(dir: string) {
	return post<{ ok: boolean }>("/index/resume", { dir });
}

export async function apiSearch(
	dir: string,
	query: string,
	provider: string,
	topK = 24,
	opts?: {
		hfToken?: string;
		openaiKey?: string;
		favoritesOnly?: boolean;
		tags?: string[];
		dateFrom?: number;
		dateTo?: number;
		useFast?: boolean;
		fastKind?: string;
		useCaptions?: boolean;
		camera?: string;
		isoMin?: number;
		isoMax?: number;
		fMin?: number;
		fMax?: number;
		flash?: "fired" | "noflash";
		wb?: "auto" | "manual";
		metering?: string;
		altMin?: number;
		altMax?: number;
		headingMin?: number;
		headingMax?: number;
		place?: string;
		useOcr?: boolean;
		hasText?: boolean;
		person?: string;
		persons?: string[];
		sharpOnly?: boolean;
		excludeUnder?: boolean;
		excludeOver?: boolean;
	},
) {
	// Validate search parameters
	if (!query?.trim()) {
		throw new Error("Search query cannot be empty");
	}

	if (!dir?.trim()) {
		throw new Error("Directory must be specified");
	}

	if (topK < 1 || topK > 1000) {
		throw new Error("Top K must be between 1 and 1000");
	}

	try {
		// Send POST body to match backend contract and pass auth when required
		const r = await fetch(`${API_BASE}/search`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeaders() },
			body: JSON.stringify({
				dir,
				query,
				top_k: topK,
				provider,
				hf_token: opts?.hfToken,
				openai_key: opts?.openaiKey,
				favorites_only: opts?.favoritesOnly,
				tags: opts?.tags,
				date_from: opts?.dateFrom,
				date_to: opts?.dateTo,
				use_fast: opts?.useFast,
				fast_kind: opts?.fastKind,
				use_captions: opts?.useCaptions,
				use_ocr: opts?.useOcr,
				camera: opts?.camera,
				iso_min: opts?.isoMin,
				iso_max: opts?.isoMax,
				f_min: opts?.fMin,
				f_max: opts?.fMax,
				flash: opts?.flash,
				wb: opts?.wb,
				metering: opts?.metering,
				alt_min: opts?.altMin,
				alt_max: opts?.altMax,
				heading_min: opts?.headingMin,
				heading_max: opts?.headingMax,
				place: opts?.place,
				has_text: opts?.hasText,
				person: opts?.person,
				persons: opts?.persons,
				sharp_only: opts?.sharpOnly,
				exclude_underexp: opts?.excludeUnder,
				exclude_overexp: opts?.excludeOver,
			}),
		});
		if (!r.ok) throw new Error(await r.text());
		const result = (await r.json()) as {
			search_id: string;
			results: SearchResult[];
		};

		// Save search to history after successful search
		try {
			const { searchHistoryService } = await import(
				"./services/SearchHistoryService"
			);
			searchHistoryService.addToHistory({
				query: query.trim(),
				timestamp: Date.now(),
				resultCount: result.results?.length || 0,
				filters: {
					tags: opts?.tags,
					favOnly: opts?.favoritesOnly,
					dateFrom: opts?.dateFrom,
					dateTo: opts?.dateTo,
					person: opts?.person,
					place: opts?.place,
				},
			});
		} catch (historyError) {
			// Don't fail the search if history saving fails
			console.warn("Failed to save search to history:", historyError);
		}

		return result;
	} catch (error) {
		// Enhanced error handling
		if (error instanceof Error) {
			if (error.message.includes("network")) {
				throw new Error("Network error: Please check your connection");
			}
			if (error.message.includes("timeout")) {
				throw new Error(
					"Search timeout: Try a simpler query or check your connection",
				);
			}
			if (error.message.includes("401")) {
				throw new Error("Authentication error: Please check your API keys");
			}
			if (error.message.includes("403")) {
				throw new Error("Access denied: Please check your permissions");
			}
			if (error.message.includes("500")) {
				throw new Error("Server error: Please try again later");
			}
		}
		throw error;
	}
}

export async function apiSearchLikePlus(
	dir: string,
	path: string,
	provider: string,
	topK = 24,
	text?: string,
	weight = 0.5,
) {
	return post<{ results: SearchResult[] }>("/search_like_plus", {
		dir,
		path,
		provider,
		top_k: topK,
		text,
		weight,
	});
}

export async function apiCreateShare(
	dir: string,
	provider: string,
	paths: string[],
	opts?: { expiryHours?: number; password?: string; viewOnly?: boolean },
) {
	return post<{ ok: boolean; token: string; url: string; expires?: string }>(
		"/share",
		{
			dir,
			provider,
			paths,
			expiry_hours: opts?.expiryHours ?? 24,
			password: opts?.password,
			view_only: opts?.viewOnly ?? true,
		},
	);
}

export async function apiListShares(dir?: string) {
	const url = dir
		? `${API_BASE}/share?dir=${encodeURIComponent(dir)}`
		: `${API_BASE}/share`;
	const r = await fetch(url);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		shares: {
			token: string;
			created: string;
			expires?: string;
			dir: string;
			provider: string;
			count: number;
			view_only: boolean;
			expired?: boolean;
		}[];
	}>;
}

export async function apiRevokeShare(token: string) {
	return post<{ ok: boolean }>("/share/revoke", { token });
}

export async function apiAnalytics(dir: string, limit = 200) {
	const r = await fetch(
		`${API_BASE}/analytics?dir=${encodeURIComponent(dir)}&limit=${limit}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		events: { type: string; time: string; [k: string]: unknown }[];
	}>;
}

export async function apiLogEvent(
	dir: string,
	type: string,
	data?: Record<string, unknown>,
) {
	return post<{ ok: boolean }>("/analytics/log", { dir, type, data });
}

export async function apiBuildCaptions(
	dir: string,
	vlmModel: string,
	provider: string,
	hfToken?: string,
	openaiKey?: string,
) {
	return post<{ updated: number }>("/captions/build", {
		dir,
		vlm_model: vlmModel,
		provider,
		hf_token: hfToken,
		openai_key: openaiKey,
	});
}

export async function apiFeedback(
	dir: string,
	searchId: string,
	query: string,
	positives: string[],
	note: string,
) {
	return post<{ ok: boolean }>("/feedback", {
		dir,
		search_id: searchId,
		query,
		positives,
		note,
	});
}

export async function apiGetFavorites(dir: string) {
	const r = await fetch(`${API_BASE}/favorites?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ favorites: string[] }>;
}

export async function apiSetFavorite(
	dir: string,
	path: string,
	favorite: boolean,
) {
	return post<{ ok: boolean; favorites: string[] }>("/favorites", {
		dir,
		path,
		favorite,
	});
}

export async function apiGetSaved(dir: string) {
	const r = await fetch(`${API_BASE}/saved?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		saved: { name: string; query: string; top_k?: number }[];
	}>;
}

export async function apiAddSaved(
	dir: string,
	name: string,
	query: string,
	topK: number,
) {
	return post<{ ok: boolean; saved: Array<{ query: string; name: string }> }>(
		"/saved",
		{
			dir,
			name,
			query,
			top_k: topK,
		},
	);
}

export async function apiDeleteSaved(dir: string, name: string) {
	return post<{
		ok: boolean;
		deleted: number;
		saved: Array<{ query: string; name: string }>;
	}>("/saved/delete", {
		dir,
		name,
	});
}

// Presets (boolean templates)
export async function apiGetPresets(dir: string) {
	const r = await fetch(`${API_BASE}/presets?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ presets: { name: string; query: string }[] }>;
}

export async function apiAddPreset(dir: string, name: string, query: string) {
	return post<{ ok: boolean; presets: { name: string; query: string }[] }>(
		"/presets",
		{ dir, name, query },
	);
}

export async function apiDeletePreset(dir: string, name: string) {
	return post<{
		ok: boolean;
		deleted: number;
		presets: { name: string; query: string }[];
	}>("/presets/delete", { dir, name });
}

export async function apiMap(dir: string) {
	const r = await fetch(`${API_BASE}/map?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ points: { lat: number; lon: number }[] }>;
}

export async function apiDiagnostics(
	dir: string,
	provider?: string,
	openaiKey?: string,
	hfToken?: string,
) {
	const qs = new URLSearchParams({ dir });
	if (provider) qs.set("provider", provider);
	if (hfToken) qs.set("hf_token", hfToken);
	if (openaiKey) qs.set("openai_key", openaiKey);
	const r = await fetch(`${API_BASE}/diagnostics?${qs.toString()}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		folder: string;
		engines: {
			key: string;
			index_dir: string;
			count: number;
			fast?: { annoy: boolean; faiss: boolean; hnsw: boolean };
		}[];
		free_gb: number;
		os: string;
	}>;
}

export async function apiLibrary(
	dir: string,
	provider: string,
	limit = 120,
	offset = 0,
	opts?: { hfToken?: string; openaiKey?: string },
) {
	const qs = new URLSearchParams({
		dir,
		provider,
		limit: String(limit),
		offset: String(offset),
	});
	if (opts?.hfToken) qs.set("hf_token", opts.hfToken);
	if (opts?.openaiKey) qs.set("openai_key", opts.openaiKey);
	const r = await fetch(`${API_BASE}/library?${qs.toString()}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		total: number;
		offset: number;
		limit: number;
		paths: string[];
	}>;
}

export async function apiBuildFast(
	dir: string,
	kind: "annoy" | "faiss" | "hnsw",
	provider: string,
	hfToken?: string,
	openaiKey?: string,
) {
	return post<{ ok: boolean; kind: string }>("/fast/build", {
		dir,
		kind,
		provider,
		hf_token: hfToken,
		openai_key: openaiKey,
	});
}

export async function apiBuildOCR(
	dir: string,
	provider: string,
	languages?: string[],
	hfToken?: string,
	openaiKey?: string,
) {
	return post<{ updated: number }>("/ocr/build", {
		dir,
		provider,
		languages,
		hf_token: hfToken,
		openai_key: openaiKey,
	});
}

export async function apiLookalikes(dir: string, maxDistance = 5) {
	const r = await fetch(
		`${API_BASE}/lookalikes?dir=${encodeURIComponent(
			dir,
		)}&max_distance=${maxDistance}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		groups: { id: string; paths: string[]; resolved: boolean }[];
	}>;
}

export async function apiResolveLookalike(dir: string, paths: string[]) {
	return post<{ ok: boolean; id: string }>("/lookalikes/resolve", {
		dir,
		group_paths: paths,
	});
}

export async function apiWorkspaceList() {
	const r = await fetch(`${API_BASE}/workspace`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ folders: string[] }>;
}

export async function apiWorkspaceAdd(path: string) {
	return post<{ folders: string[] }>("/workspace/add", { path });
}

export async function apiWorkspaceRemove(path: string) {
	return post<{ folders: string[] }>("/workspace/remove", { path });
}

// Analytics / Monitoring
export async function apiAnalyticsLog(
	dir: string,
	type: string,
	data?: Record<string, unknown>,
) {
	return post<{ ok: boolean }>("/analytics/log", { dir, type, data });
}

export async function apiMetadataDetail(dir: string, path: string) {
	const r = await fetch(
		`${API_BASE}/metadata/detail?dir=${encodeURIComponent(
			dir,
		)}&path=${encodeURIComponent(path)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ meta: Record<string, unknown> }>;
}

export async function apiSearchWorkspace(
	dir: string,
	query: string,
	provider: string,
	topK = 24,
	opts?: {
		favoritesOnly?: boolean;
		tags?: string[];
		dateFrom?: number;
		dateTo?: number;
		place?: string;
		hasText?: boolean;
		person?: string;
		persons?: string[];
	},
) {
	return post<{ search_id: string; results: SearchResult[] }>(
		"/search_workspace",
		{
			dir,
			provider,
			query,
			top_k: topK,
			favorites_only: opts?.favoritesOnly,
			tags: opts?.tags,
			date_from: opts?.dateFrom,
			date_to: opts?.dateTo,
			place: opts?.place,
			has_text: opts?.hasText,
			person: opts?.person,
			persons: opts?.persons,
		},
	);
}

export async function apiGetTags(dir: string) {
	const r = await fetch(`${API_BASE}/tags?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ tags: Record<string, string[]>; all: string[] }>;
}

export async function apiSetTags(dir: string, path: string, tags: string[]) {
	return post<{ ok: boolean; tags: string[] }>("/tags", { dir, path, tags });
}

export function thumbUrl(
	dir: string,
	provider: string,
	path: string,
	size = 256,
) {
	// In Electron, use direct file access for offline capability
	if (isElectron()) {
		// Convert path to absolute file:// URL for direct file access
		const absolutePath = path.startsWith("/") ? path : `${dir}/${path}`;
		// Try file:// protocol first (more reliable), fallback to app:// if needed
		return `file://${absolutePath}`;
	}

	// For web app, use HTTP API
	const qs = new URLSearchParams({ dir, provider, path, size: String(size) });
	return `${API_BASE}/thumb?${qs.toString()}`;
}

export function thumbFaceUrl(
	dir: string,
	provider: string,
	path: string,
	emb: number,
	size = 196,
) {
	// In Electron, use direct file access for offline capability
	if (isElectron()) {
		// Convert path to absolute file:// URL for direct file access
		const absolutePath = path.startsWith("/") ? path : `${dir}/${path}`;
		return `file://${absolutePath}`;
	}

	// For web app, use HTTP API
	const qs = new URLSearchParams({
		dir,
		provider,
		path,
		emb: String(emb),
		size: String(size),
	});
	return `${API_BASE}/thumb_face?${qs.toString()}`;
}

// (duplicate removed)

export async function apiOpen(dir: string, path: string) {
	return post<{ ok: boolean }>("/open", { dir, path });
}

export async function apiEditOps(
	dir: string,
	path: string,
	ops: {
		rotate?: number;
		flip?: "h" | "v";
		crop?: { x: number; y: number; w: number; h: number };
	},
) {
	return post<{ out_path: string }>("/edit/ops", {
		dir,
		path,
		rotate: ops.rotate || 0,
		flip: ops.flip,
		crop: ops.crop,
	});
}

export async function apiUpscale(
	dir: string,
	path: string,
	scale: 2 | 4 = 2,
	engine: "pil" | "realesrgan" = "pil",
) {
	return post<{ out_path: string }>("/edit/upscale", {
		dir,
		path,
		scale,
		engine,
	});
}

export async function apiExport(
	dir: string,
	paths: string[],
	dest: string,
	mode: "copy" | "symlink" = "copy",
	stripExif = false,
	overwrite = false,
	opts?: {
		stripGps?: boolean;
		keepCopyrightOnly?: boolean;
		preset?: "web" | "email" | "print" | "custom";
		resizeLong?: number;
		quality?: number;
	},
) {
	return post<{
		ok: boolean;
		copied: number;
		skipped: number;
		errors: number;
		dest: string;
	}>("/export", {
		dir,
		paths,
		dest,
		mode,
		strip_exif: stripExif,
		overwrite,
		strip_gps: opts?.stripGps,
		keep_copyright_only: opts?.keepCopyrightOnly,
		preset: opts?.preset,
		resize_long: opts?.resizeLong,
		quality: opts?.quality,
	});
}

export async function apiBuildMetadata(
	dir: string,
	provider: string,
	hfToken?: string,
	openaiKey?: string,
) {
	return post<{ updated: number; cameras: string[] }>("/metadata/build", {
		dir,
		provider,
		hf_token: hfToken,
		openai_key: openaiKey,
	});
}

export async function apiGetMetadata(dir: string) {
	const r = await fetch(`${API_BASE}/metadata?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ cameras: string[]; places?: string[] }>;
}

export async function apiSearchLike(
	dir: string,
	path: string,
	provider: string,
	topK = 24,
) {
	return post<{ results: SearchResult[] }>("/search_like", {
		dir,
		path,
		provider,
		top_k: topK,
	});
}

export async function apiGetCollections(dir: string) {
	const r = await fetch(
		`${API_BASE}/collections?dir=${encodeURIComponent(dir)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ collections: Record<string, string[]> }>;
}

export async function apiSetCollection(
	dir: string,
	name: string,
	paths: string[],
) {
	return post<{ ok: boolean; collections: Record<string, string[]> }>(
		"/collections",
		{ dir, name, paths },
	);
}

export async function apiDeleteCollection(dir: string, name: string) {
	return post<{ ok: boolean; deleted: string | null }>("/collections/delete", {
		dir,
		name,
	});
}

export async function apiGetSmart(dir: string) {
	const r = await fetch(
		`${API_BASE}/smart_collections?dir=${encodeURIComponent(dir)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		smart: Record<string, { query: string; count?: number }>;
	}>;
}

export async function apiSetSmart(
	dir: string,
	name: string,
	rules: { query: string; count?: number } & Record<string, unknown>,
) {
	return post<{
		ok: boolean;
		smart: Record<string, { query: string; count?: number }>;
	}>("/smart_collections", { dir, name, rules });
}

export async function apiDeleteSmart(dir: string, name: string) {
	return post<{ ok: boolean; deleted: string | null }>(
		"/smart_collections/delete",
		{ dir, name },
	);
}

export async function apiResolveSmart(
	dir: string,
	name: string,
	provider: string,
	topK = 24,
) {
	return post<{ search_id: string | null; results: SearchResult[] }>(
		"/smart_collections/resolve",
		{ dir, name, provider, top_k: topK },
	);
}

export async function apiOcrSnippets(
	dir: string,
	paths: string[],
	limit = 160,
) {
	return post<{ snippets: Record<string, string> }>("/ocr/snippets", {
		dir,
		paths,
		limit,
	});
}

export async function apiOcrStatus(dir: string) {
	const r = await fetch(
		`${API_BASE}/ocr/status?dir=${encodeURIComponent(dir)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ ready: boolean; count?: number }>;
}

export async function apiBuildFaces(dir: string, provider: string) {
	return post<{ updated: number; faces: number; clusters: number }>(
		"/faces/build",
		{ dir, provider },
	);
}

export async function apiFacesClusters(dir: string) {
	const r = await fetch(
		`${API_BASE}/faces/clusters?dir=${encodeURIComponent(dir)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		clusters: {
			id: string;
			name?: string;
			size: number;
			examples: [string, number][];
		}[];
	}>;
}

export async function apiFacesName(
	dir: string,
	clusterId: string,
	name: string,
) {
	return post<{ ok: boolean }>("/faces/name", {
		dir,
		cluster_id: clusterId,
		name,
	});
}
export async function apiTripsBuild(dir: string, provider: string) {
	return post<{
		trips: Array<{
			id: string;
			name: string;
			startDate: string;
			endDate: string;
			photos: string[];
		}>;
	}>("/trips/build", { dir, provider });
}
export async function apiTripsList(dir: string) {
	const r = await fetch(`${API_BASE}/trips?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		trips: {
			id: string;
			count: number;
			place?: string;
			start_ts?: number;
			end_ts?: number;
			paths: string[];
		}[];
	}>;
}

// Deprecated: apiTodo() removed

export async function apiAutotag(dir: string, provider: string) {
	return post<{ tags: Record<string, string[]> }>("/autotag", {
		dir,
		provider,
	});
}

export async function apiDelete(
	dir: string,
	paths: string[],
	useOsTrash?: boolean,
) {
	const r = await fetch(`${API_BASE}/delete`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify({ dir, paths, os_trash: !!useOsTrash }),
	});
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		ok: boolean;
		moved: number;
		undoable?: boolean;
		os_trash?: boolean;
	}>;
}

export async function apiUndoDelete(dir: string) {
	const r = await fetch(`${API_BASE}/undo_delete`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...authHeaders() },
		body: JSON.stringify({ dir }),
	});
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{ ok: boolean; restored: number }>;
}

// Video Processing APIs
export async function apiListVideos(dir: string) {
	const r = await fetch(`${API_BASE}/videos?dir=${encodeURIComponent(dir)}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		videos: { path: string; mtime: number; size: number }[];
		count: number;
	}>;
}

export async function apiGetVideoMetadata(dir: string, path: string) {
	const r = await fetch(
		`${API_BASE}/video/metadata?dir=${encodeURIComponent(
			dir,
		)}&path=${encodeURIComponent(path)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		metadata: {
			width: number;
			height: number;
			fps: number;
			frame_count: number;
			duration: number;
		};
	}>;
}

export function videoThumbnailUrl(
	dir: string,
	path: string,
	frameTime = 1.0,
	size = 256,
) {
	// In Electron, use direct file access for offline capability
	if (isElectron()) {
		// Convert path to absolute file:// URL for direct file access
		const absolutePath = path.startsWith("/") ? path : `${dir}/${path}`;
		return `file://${absolutePath}`;
	}

	// For web app, use HTTP API
	const qs = new URLSearchParams({
		dir,
		path,
		frame_time: String(frameTime),
		size: String(size),
	});
	return `${API_BASE}/video/thumbnail?${qs.toString()}`;
}

export async function apiIndexVideos(dir: string, provider: string = "local") {
	return post<{ indexed: number; total: number }>("/videos/index", {
		dir,
		provider,
	});
}

// Batch Operations APIs
export async function apiBatchDelete(
	dir: string,
	paths: string[],
	osTrash = false,
) {
	return post<{
		ok: boolean;
		processed: number;
		moved: number;
		failed: number;
		undoable: boolean;
		os_trash: boolean;
	}>("/batch/delete", { dir, paths, os_trash: osTrash });
}

export async function apiBatchTag(
	dir: string,
	paths: string[],
	tags: string[],
	operation: "add" | "remove" | "replace" = "add",
) {
	return post<{ ok: boolean; updated: number; processed: number }>(
		"/batch/tag",
		{ dir, paths, tags, operation },
	);
}

export async function apiBatchAddToCollection(
	dir: string,
	paths: string[],
	collectionName: string,
) {
	return post<{
		ok: boolean;
		collection: string;
		added: number;
		total: number;
	}>("/batch/collections", { dir, paths, collection_name: collectionName });
}

// Enhanced Face Clustering APIs
export async function apiGetFacePhotos(dir: string, clusterId: string) {
	const r = await fetch(
		`${API_BASE}/faces/photos?dir=${encodeURIComponent(
			dir,
		)}&cluster_id=${encodeURIComponent(clusterId)}`,
	);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		cluster_id: string;
		photos: string[];
		count: number;
	}>;
}

export async function apiMergeFaceClusters(
	dir: string,
	sourceClusterId: string,
	targetClusterId: string,
) {
	return post<{ ok: boolean; merged_into: string; message?: string }>(
		"/faces/merge",
		{
			dir,
			source_cluster_id: sourceClusterId,
			target_cluster_id: targetClusterId,
		},
	);
}

export async function apiSplitFaceCluster(
	dir: string,
	clusterId: string,
	photoPaths: string[],
) {
	return post<{ ok: boolean; new_cluster_id: string; message?: string }>(
		"/faces/split",
		{ dir, cluster_id: clusterId, photo_paths: photoPaths },
	);
}

// Progressive Loading and Pagination APIs
export async function apiSearchPaginated(
	dir: string,
	query: string,
	provider: string,
	limit = 24,
	offset = 0,
	opts?: {
		hfToken?: string;
		openaiKey?: string;
		favoritesOnly?: boolean;
		tags?: string[];
		dateFrom?: number;
		dateTo?: number;
		useFast?: boolean;
		fastKind?: string;
		useCaptions?: boolean;
		camera?: string;
		isoMin?: number;
		isoMax?: number;
		fMin?: number;
		fMax?: number;
		flash?: "fired" | "noflash";
		wb?: "auto" | "manual";
		metering?: string;
		altMin?: number;
		altMax?: number;
		headingMin?: number;
		headingMax?: number;
		place?: string;
		useOcr?: boolean;
		hasText?: boolean;
		person?: string;
		persons?: string[];
		sharpOnly?: boolean;
		excludeUnder?: boolean;
		excludeOver?: boolean;
	},
) {
	const qs = new URLSearchParams({
		dir,
		query,
		provider,
		limit: String(limit),
		offset: String(offset),
	});

	if (opts?.hfToken) qs.set("hf_token", opts.hfToken);
	if (opts?.openaiKey) qs.set("openai_key", opts.openaiKey);
	if (opts?.favoritesOnly) qs.set("favorites_only", "true");
	if (opts?.tags) qs.set("tags", opts.tags.join(","));
	if (opts?.dateFrom !== undefined) qs.set("date_from", String(opts.dateFrom));
	if (opts?.dateTo !== undefined) qs.set("date_to", String(opts.dateTo));
	if (opts?.useFast) qs.set("use_fast", "true");
	if (opts?.fastKind) qs.set("fast_kind", opts.fastKind);
	if (opts?.useCaptions) qs.set("use_captions", "true");
	if (opts?.useOcr) qs.set("use_ocr", "true");
	if (opts?.camera) qs.set("camera", opts.camera);
	if (opts?.isoMin !== undefined) qs.set("iso_min", String(opts.isoMin));
	if (opts?.isoMax !== undefined) qs.set("iso_max", String(opts.isoMax));
	if (opts?.fMin !== undefined) qs.set("f_min", String(opts.fMin));
	if (opts?.fMax !== undefined) qs.set("f_max", String(opts.fMax));
	if (opts?.flash) qs.set("flash", opts.flash);
	if (opts?.wb) qs.set("wb", opts.wb);
	if (opts?.metering) qs.set("metering", opts.metering);
	if (opts?.altMin !== undefined) qs.set("alt_min", String(opts.altMin));
	if (opts?.altMax !== undefined) qs.set("alt_max", String(opts.altMax));
	if (opts?.headingMin !== undefined)
		qs.set("heading_min", String(opts.headingMin));
	if (opts?.headingMax !== undefined)
		qs.set("heading_max", String(opts.headingMax));
	if (opts?.place) qs.set("place", opts.place);
	if (opts?.hasText) qs.set("has_text", "true");
	if (opts?.person) qs.set("person", opts.person);
	if (opts?.persons) qs.set("persons", opts.persons.join(","));
	if (opts?.sharpOnly) qs.set("sharp_only", "true");
	if (opts?.excludeUnder) qs.set("exclude_underexp", "true");
	if (opts?.excludeOver) qs.set("exclude_overexp", "true");

	const r = await fetch(`${API_BASE}/search/paginated?${qs.toString()}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		search_id: string;
		results: SearchResult[];
		pagination: {
			offset: number;
			limit: number;
			total: number;
			has_more: boolean;
		};
	}>;
}

export async function apiLibraryPaginated(
	dir: string,
	provider: string = "local",
	limit = 120,
	offset = 0,
	sort: "mtime" | "name" | "size" = "mtime",
	order: "asc" | "desc" = "desc",
) {
	const qs = new URLSearchParams({
		dir,
		provider,
		limit: String(limit),
		offset: String(offset),
		sort,
		order,
	});

	const r = await fetch(`${API_BASE}/library/paginated?${qs.toString()}`);
	if (!r.ok) throw new Error(await r.text());
	return r.json() as Promise<{
		total: number;
		offset: number;
		limit: number;
		paths: string[];
		sort: string;
		order: string;
		has_more: boolean;
	}>;
}

// Missing API functions - stub implementations to prevent TypeScript errors
export async function apiDataNuke(
	_dir?: string,
	_all?: boolean,
): Promise<void> {
	throw new Error("Not implemented: apiDataNuke");
}

export async function apiGetExcludes(_dir: string): Promise<string[]> {
	throw new Error("Not implemented: apiGetExcludes");
}

export async function apiModelsCapabilities(): Promise<{
	models: string[];
	capabilities: Record<string, boolean>;
}> {
	throw new Error("Not implemented: apiModelsCapabilities");
}

export async function apiModelsDownload(_model: string): Promise<void> {
	throw new Error("Not implemented: apiModelsDownload");
}

export async function apiSetExcludes(
	_dir: string,
	_excludes: string[],
): Promise<void> {
	throw new Error("Not implemented: apiSetExcludes");
}

export async function apiWatchStart(
	_dir: string,
	_engine: string,
	_batchSize: number,
	_threads: number,
): Promise<void> {
	throw new Error("Not implemented: apiWatchStart");
}

export async function apiWatchStatus(): Promise<{
	watching: boolean;
	folders: string[];
}> {
	throw new Error("Not implemented: apiWatchStatus");
}

export async function apiWatchStop(_dir: string): Promise<void> {
	throw new Error("Not implemented: apiWatchStop");
}
