export {};

declare global {
  interface Window {
    electronAPI?: {
      selectFolder: () => Promise<string | null>;
      selectImportFolder: () => Promise<string | null>;
      getApiToken: () => Promise<string>;
      getApiConfig: () => Promise<{ base: string; token: string }>;
      setAllowedRoot: (path: string) => Promise<boolean>;
      restartBackend: () => Promise<{ success: boolean; message: string }>;
      models: {
        getStatus: () => Promise<{
          ensured: boolean;
          copied: boolean;
          errors: string[];
          source: string | null;
          destination: string | null;
          lastChecked: string;
        }>;
        refresh: () => Promise<{
          ok: boolean;
          status: {
            ensured: boolean;
            copied: boolean;
            errors: string[];
            source: string | null;
            destination: string | null;
            lastChecked: string;
          };
        }>;
      };
      getStoreSetting?: (key: string) => Promise<string>;
      setStoreSetting?: (key: string, value: string) => Promise<boolean>;
      selectDirectory?: () => Promise<string | null | undefined>;
      onDirectorySelected?: (
        callback: (event: unknown, directory: string) => void
      ) => void;
      removeListener?: (
        channel: string,
        callback: (event: unknown, ...args: unknown[]) => void
      ) => void;
      removeAllListeners?: (channel: string) => void;
      on?: (
        channel: string,
        callback: (event: unknown, ...args: unknown[]) => void
      ) => void;
      off?: (
        channel: string,
        callback: (event: unknown, ...args: unknown[]) => void
      ) => void;
      onSetViewMode?: (
        callback: (event: unknown, mode: string) => void
      ) => void;
    };
    secureElectronAPI?: {
      selectFolder?: () => Promise<string | null | undefined>;
      readDirectoryPhotos?: (
        directoryPath:
          | string
          | { directory: string; limit?: number; offset?: number }
      ) => Promise<
        | Array<{
            path?: string;
            name?: string;
            relativePath?: string;
            size?: number;
            mtime?: number;
            ctime?: number;
            extension?: string;
          }>
        | {
            paths?: string[];
            total?: number;
            offset?: number;
            limit?: number;
          }
      >;
      readPhotoMetadata?: (photoPath: string) => Promise<{
        path: string;
        size?: number;
        mtime?: number;
        ctime?: number;
        extension?: string;
      }>;
      getApiToken?: () => Promise<string>;
      getApiConfig?: () => Promise<{ base: string; token: string }>;
      setAllowedRoot?: (path: string) => Promise<boolean>;
      restartBackend?: () => Promise<boolean>;
      getAllowedRoots?: () => Promise<string[]>;
      removeAllowedRoot?: (path: string) => Promise<boolean>;
    };
  }
}
