/**
 * Utility functions for formatting data in human-readable formats
 */

// Format duration in milliseconds to human readable string
export function humanizeDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days}d ${hours % 24}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

// Format file size in bytes to human readable string
export function humanizeFileSize(bytes: number): string {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Format timestamp to relative time string
export function formatTimestamp(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const absDiff = Math.abs(diff);

	const minutes = Math.floor(absDiff / (1000 * 60));
	const hours = Math.floor(absDiff / (1000 * 60 * 60));
	const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

	if (diff < 0) {
		// Future timestamp
		if (days > 0) return `in ${days} day${days !== 1 ? "s" : ""}`;
		if (hours > 0) return `in ${hours} hour${hours !== 1 ? "s" : ""}`;
		if (minutes > 0) return `in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
		return "in a moment";
	} else {
		// Past timestamp
		if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ago`;
		if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
		if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
		return "just now";
	}
}

// Format timestamp to local time string
export function formatLocalTime(timestamp: number): string {
	return new Date(timestamp).toLocaleString();
}

// Format date to short string
export function formatDate(date: Date | number): string {
	const d = typeof date === "number" ? new Date(date) : date;
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

// Format time to short string
export function formatTime(date: Date | number): string {
	const d = typeof date === "number" ? new Date(date) : date;
	return d.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

// Format number with thousands separator
export function formatNumber(num: number): string {
	return new Intl.NumberFormat().format(num);
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
	return `${(value * 100).toFixed(decimals)}%`;
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + "...";
}

// Format file name from path
export function formatFileName(path: string): string {
	return path.split("/").pop() || path;
}

// Format file extension
export function formatFileExtension(path: string): string {
	const parts = path.split(".");
	return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : "";
}

// Format resolution
export function formatResolution(width: number, height: number): string {
	const megapixels = (width * height) / 1000000;
	return `${width}×${height} (${megapixels.toFixed(1)}MP)`;
}

// Format camera settings
export function formatCameraSettings(
	camera?: string,
	fnumber?: number,
	iso?: number,
	focal?: number,
): string {
	const parts: string[] = [];

	if (camera) parts.push(camera);
	if (fnumber && fnumber > 0) parts.push(`f/${fnumber.toFixed(1)}`);
	if (iso && iso > 0) parts.push(`ISO ${iso}`);
	if (focal && focal > 0) parts.push(`${focal}mm`);

	return parts.join(" • ");
}
