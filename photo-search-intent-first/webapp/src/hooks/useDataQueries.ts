import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	apiGetFavorites,
	apiGetSaved,
	apiGetTags,
	apiSetFavorite,
	apiSetTags,
} from "../api";

// Query keys
export const queryKeys = {
	favorites: (dir: string) => ["favorites", dir] as const,
	saved: (dir: string) => ["saved", dir] as const,
	tags: (dir: string) => ["tags", dir] as const,
};

// Favorites queries
export function useFavorites(dir: string | undefined) {
	return useQuery({
		queryKey: queryKeys.favorites(dir || ""),
		queryFn: () => apiGetFavorites(dir || ""),
		enabled: !!dir,
		staleTime: 2 * 60 * 1000, // 2 minutes
	});
}

export function useSavedSearches(dir: string | undefined) {
	return useQuery({
		queryKey: queryKeys.saved(dir || ""),
		queryFn: () => apiGetSaved(dir || ""),
		enabled: !!dir,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

export function useTags(dir: string | undefined) {
	return useQuery({
		queryKey: queryKeys.tags(dir || ""),
		queryFn: () => apiGetTags(dir || ""),
		enabled: !!dir,
		staleTime: 2 * 60 * 1000, // 2 minutes
	});
}

// Mutations
export function useToggleFavorite() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			dir,
			path,
			favorite,
		}: {
			dir: string;
			path: string;
			favorite: boolean;
		}) => apiSetFavorite(dir, path, favorite),
		onSuccess: (_, { dir }) => {
			// Invalidate and refetch favorites
			queryClient.invalidateQueries({ queryKey: queryKeys.favorites(dir) });
		},
	});
}

export function useUpdateTags() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			dir,
			path,
			tags,
		}: {
			dir: string;
			path: string;
			tags: string[];
		}) => apiSetTags(dir, path, tags),
		onSuccess: (_, { dir }) => {
			// Invalidate and refetch tags
			queryClient.invalidateQueries({ queryKey: queryKeys.tags(dir) });
		},
	});
}
