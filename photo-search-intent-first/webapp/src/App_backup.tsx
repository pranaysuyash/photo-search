// Backup of original App.tsx before Zustand migration
import { useState } from "react";
import type { SearchResult } from "./api";

const _engines = [
	{ key: "local", label: "On-device (Recommended)" },
	{ key: "local-compat", label: "On-device (Compatible)" },
	{ key: "hf", label: "Hugging Face (CLIP)" },
	{ key: "hf-caption", label: "Hugging Face (Caption)" },
	{ key: "openai", label: "OpenAI (Captions)" },
];

const _basename = (p: string) => p.split("/").pop() || p;

export default function App() {
	const [_dir, _setDir] = useState("");
	const [engine, _setEngine] = useState("local");
	const [_hfToken, _setHfToken] = useState("");
	const [_openaiKey, _setOpenaiKey] = useState("");
	const [_query, _setQuery] = useState("");
	const [_topK, _setTopK] = useState(24);
	const [_busy, _setBusy] = useState("");
	const [_note, _setNote] = useState("");
	const [_results, _setResults] = useState<SearchResult[]>([]);
	const [_searchId, _setSearchId] = useState("");
	const [_fav, _setFav] = useState<string[]>([]);
	const [_favOnly, _setFavOnly] = useState(false);
	const [_allTags, _setAllTags] = useState<string[]>([]);
	const [_tagsMap, _setTagsMap] = useState<Record<string, string[]>>({});
	const [_tagFilter, _setTagFilter] = useState("");
	const [_saved, _setSaved] = useState<
		{ name: string; query: string; top_k?: number }[]
	>([]);
	const [_points, _setPoints] = useState<{ lat: number; lon: number }[]>([]);
	const [_diag, _setDiag] = useState<{
		folder: string;
		engines: {
			key: string;
			index_dir: string;
			count: number;
			fast?: { annoy: boolean; faiss: boolean; hnsw: boolean };
		}[];
		free_gb: number;
		os: string;
	} | null>(null);
	const [_groups, _setGroups] = useState<
		{ id: string; paths: string[]; resolved: boolean }[]
	>([]);
	const [_clusters, _setClusters] = useState<
		{ id: string; name?: string; size: number; examples: [string, number][] }[]
	>([]);
	const [_persons, _setPersons] = useState<string[]>([]);
	const [_useFast, _setUseFast] = useState(false);
	const [_fastKind, _setFastKind] = useState<"annoy" | "faiss" | "hnsw" | "">(
		"",
	);
	const [_useCaps, _setUseCaps] = useState(false);
	const [_vlmModel, _setVlmModel] = useState("Qwen/Qwen2-VL-2B-Instruct");
	const [_camera, _setCamera] = useState("");
	const [_isoMin, _setIsoMin] = useState("");
	const [_isoMax, _setIsoMax] = useState("");
	const [_fMin, _setFMin] = useState("");
	const [_fMax, _setFMax] = useState("");
	const [_place, _setPlace] = useState("");
	const [_useOcr, _setUseOcr] = useState(false);
	const [_hasText, _setHasText] = useState(false);
	const [_workspace, _setWorkspace] = useState<string[]>([]);
	const [_wsToggle, _setWsToggle] = useState(false);
	const [_viewMode, _setViewMode] = useState<"grid" | "film">("grid");
	const [_collections, _setCollections] = useState<Record<string, string[]>>(
		{},
	);
	const [_library, _setLibrary] = useState<string[]>([]);
	const [_smart, _setSmart] = useState<Record<string, unknown>>({});
	const [_showWelcome, _setShowWelcome] = useState(false);
	const [_showHelp, _setShowHelp] = useState(false);

	const _needsHf = engine.startsWith("hf");
	const _needsOAI = engine === "openai";

	// ... rest of the original functions would be here
	return <div>Original App with useState hooks (backup)</div>;
}
