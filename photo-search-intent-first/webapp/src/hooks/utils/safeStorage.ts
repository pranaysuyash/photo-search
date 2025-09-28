/**
 * Safe localStorage utilities that handle SSR and errors gracefully
 */

export interface SafeLocalStorage {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => boolean;
	removeItem: (key: string) => boolean;
	getItemJSON: <T>(key: string, fallback: T) => T;
	setItemJSON: <T>(key: string, value: T) => boolean;
}

export function guardBrowser(): boolean {
	return typeof window !== "undefined";
}

function safeLocalStorageGet(key: string): string | null {
	if (!guardBrowser()) return null;
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function safeLocalStorageSet(key: string, value: string): boolean {
	if (!guardBrowser()) return false;
	try {
		localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

function safeLocalStorageRemove(key: string): boolean {
	if (!guardBrowser()) return false;
	try {
		localStorage.removeItem(key);
		return true;
	} catch {
		return false;
	}
}

function safeLocalStorageGetJSON<T>(key: string, fallback: T): T {
	const raw = safeLocalStorageGet(key);
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function safeLocalStorageSetJSON<T>(key: string, value: T): boolean {
	try {
		const raw = JSON.stringify(value);
		return safeLocalStorageSet(key, raw);
	} catch {
		return false;
	}
}

export const safeLocalStorage: SafeLocalStorage = {
	getItem: safeLocalStorageGet,
	setItem: safeLocalStorageSet,
	removeItem: safeLocalStorageRemove,
	getItemJSON: safeLocalStorageGetJSON,
	setItemJSON: safeLocalStorageSetJSON,
};

export function defer(fn: () => void): void {
	if (guardBrowser() && "requestAnimationFrame" in window) {
		requestAnimationFrame(fn);
	} else {
		setTimeout(fn, 0);
	}
}
