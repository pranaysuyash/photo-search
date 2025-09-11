// TypeScript declarations for Electron API
interface Window {
	electronAPI?: {
		selectFolder: () => Promise<string | null>;
	};
}
