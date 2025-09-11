/**
 * String utility functions for the photo search application
 */

/**
 * Extracts the base filename from a full path
 * @param path - Full file path
 * @returns Base filename
 * @example
 * basename("/Users/photos/image.jpg") // returns "image.jpg"
 * basename("image.jpg") // returns "image.jpg"
 */
export const basename = (path: string): string => {
	return path.split("/").pop() || path;
};

/**
 * Formats file size from bytes to human readable format
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted file size string
 * @example
 * formatFileSize(1024) // returns "1 KB"
 * formatFileSize(1048576) // returns "1 MB"
 */
export const formatFileSize = (bytes: number, decimals = 2): string => {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Truncates a string to a specified length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string
 * @example
 * truncateString("very long filename.jpg", 10) // returns "very lo..."
 */
export const truncateString = (str: string, maxLength: number): string => {
	if (str.length <= maxLength) return str;
	return `${str.slice(0, maxLength - 3)}...`;
};

/**
 * Sanitizes a string for safe DOM usage
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export const _sanitizeString = (str: string): string => {
	const div = document.createElement("div");
	div.textContent = str;
	return div.innerHTML;
};

/**
 * Formats a count number with appropriate suffix (k for thousands)
 * @param count - Number to format
 * @returns Formatted count string
 * @example
 * formatCount(1500) // returns "1k"
 * formatCount(500) // returns "500"
 */
export const formatCount = (count?: number): string | null => {
	if (!count) return null;
	if (count > 999) return `${Math.floor(count / 1000)}k`;
	return count.toString();
};

/**
 * Extracts file extension from a filename
 * @param filename - Filename with extension
 * @returns File extension (without dot)
 * @example
 * getFileExtension("image.jpg") // returns "jpg"
 * getFileExtension("archive.tar.gz") // returns "gz"
 */
export const getFileExtension = (filename: string): string => {
	const parts = filename.split(".");
	return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
};

/**
 * Checks if a filename has a valid image extension
 * @param filename - Filename to check
 * @returns True if image file
 * @example
 * isImageFile("photo.jpg") // returns true
 * isImageFile("document.pdf") // returns false
 */
export const isImageFile = (filename: string): boolean => {
	const imageExtensions = [
		"jpg",
		"jpeg",
		"png",
		"gif",
		"webp",
		"bmp",
		"svg",
		"heic",
		"heif",
		"raw",
	];
	const ext = getFileExtension(filename);
	return imageExtensions.includes(ext);
};

/**
 * Generates a unique ID for DOM elements or React keys
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 * @example
 * generateId() // returns "id-123456789"
 * generateId("tour") // returns "tour-123456789"
 */
export const generateId = (prefix = "id"): string => {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
