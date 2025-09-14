/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_URL?: string;
	readonly VITE_API_PORT?: string;
	readonly VITE_API_BASE?: string;
	readonly VITE_API_TOKEN?: string;
	readonly PROD?: boolean;
	readonly DEV?: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
