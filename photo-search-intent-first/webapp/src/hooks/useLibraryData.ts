/**
 * Custom hook for managing library data with React Query
 * Provides cached data fetching for library, metadata, tags, faces, map, favorites, saved searches, and presets
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	apiFacesClusters,
	apiGetFavorites,
	apiGetMetadata,
	apiGetPresets,
	apiGetSaved,
	apiGetTags,
	apiLibrary,
	apiMap,
	apiSetFavorite,
	apiSetTags,
} from "../api";

export function useLibraryData({
	dir,
	engine,
	needsHf,
	hfToken,
	needsOAI,
	openaiKey,
}: {
	dir?: string;
	engine: string;
	needsHf: boolean;
	hfToken?: string;
	needsOAI: boolean;
	openaiKey?: string;
}) {
	const queryClient = useQueryClient();

	const keys = {
		library: ["library", dir, engine],
		meta: ["meta", dir],
		tags: ["tags", dir],
		faces: ["faces", dir],
		map: ["map", dir],
		favs: ["favs", dir],
		saved: ["saved", dir],
		presets: ["presets", dir],
	} as const;

	const library = useQuery({
		queryKey: keys.library,
		enabled: !!dir,
		queryFn: () => {
			if (!dir) throw new Error("Directory required");
			return apiLibrary(dir, engine, 120, 0, {
				openaiKey: needsOAI ? openaiKey : undefined,
				hfToken: needsHf ? hfToken : undefined,
			});
		},
		select: (r) => r.paths ?? [],
		staleTime: 30_000,
	});

	const tags = useQuery({
		queryKey: keys.tags,
		enabled: !!dir,
		queryFn: () => {
			if (!dir) throw new Error("Directory required");
			return apiGetTags(dir);
		},
	});

	const meta = useQuery({
		queryKey: keys.meta,
		enabled: !!dir,
		queryFn: async () => {
			if (!dir) throw new Error("Directory required");
			const r = await apiGetMetadata(dir);
			return { cameras: r.cameras ?? [], places: r.places ?? [] };
		},
	});

	const faces = useQuery({
		queryKey: keys.faces,
		enabled: !!dir,
		queryFn: () => {
			if (!dir) throw new Error("Directory required");
			return apiFacesClusters(dir);
		},
		select: (r) => r.clusters ?? [],
	});

	const map = useQuery({
		queryKey: keys.map,
		enabled: !!dir,
		queryFn: () => {
			if (!dir) throw new Error("Directory required");
			return apiMap(dir);
		},
		select: (r) => r.points ?? [],
	});

	const favorites = useQuery({
		queryKey: keys.favs,
		enabled: !!dir,
		queryFn: () => {
			if (!dir) throw new Error("Directory required");
			return apiGetFavorites(dir);
		},
		select: (r) => r.favorites ?? [],
	});

	const saved = useQuery({
		queryKey: keys.saved,
		enabled: !!dir,
		queryFn: () => {
			if (!dir) throw new Error("Directory required");
			return apiGetSaved(dir);
		},
		select: (r) => r.saved ?? [],
	});

	const presets = useQuery({
		queryKey: keys.presets,
		enabled: !!dir,
		queryFn: () => {
			if (!dir) throw new Error("Directory required");
			return apiGetPresets(dir);
		},
		select: (r) => r.presets ?? [],
	});

	// Mutations with cache invalidation
	const setTagsMutation = useMutation({
		mutationFn: ({ path, tags }: { path: string; tags: string[] }) => {
			if (!dir) throw new Error("Directory required");
			return apiSetTags(dir, path, tags);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.tags });
		},
	});

	const setFavoriteMutation = useMutation({
		mutationFn: ({ path, favorite }: { path: string; favorite: boolean }) => {
			if (!dir) throw new Error("Directory required");
			return apiSetFavorite(dir, path, favorite);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: keys.favs });
		},
	});

	return {
		// Queries
		library,
		tags,
		meta,
		faces,
		map,
		favorites,
		saved,
		presets,

		// Mutations
		setTags: setTagsMutation.mutate,
		setFavorite: setFavoriteMutation.mutate,

		// Loading states
		isLoading: library.isLoading || tags.isLoading || meta.isLoading,
		isError: library.isError || tags.isError || meta.isError,

		// Refetch functions
		refetchLibrary: library.refetch,
		refetchTags: tags.refetch,
		refetchMeta: meta.refetch,
		refetchFaces: faces.refetch,
		refetchMap: map.refetch,
		refetchFavorites: favorites.refetch,
		refetchSaved: saved.refetch,
		refetchPresets: presets.refetch,
	};
}
