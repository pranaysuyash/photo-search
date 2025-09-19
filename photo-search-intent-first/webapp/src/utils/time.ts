/**
 * Convert seconds into a compact human-friendly string.
 * Examples: 45s, 2m 30s, 1h 5m
 */
export function humanizeSeconds(total: number): string {
	const s = Math.max(0, Math.floor(total || 0));
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rs = s % 60;
	if (s < 3600) {
		return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
	}
	const h = Math.floor(m / 60);
	const rm = m % 60;
	return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}
