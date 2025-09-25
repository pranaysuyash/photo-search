const cache = new Map<string, boolean>();
export function useFeatureFlag(name: string): boolean {
	if (cache.has(name)) return cache.get(name) ?? false;
	const v = (import.meta.env?.[`VITE_FF_${name}`] as string) === "1";
	cache.set(name, v);
	return v;
}
