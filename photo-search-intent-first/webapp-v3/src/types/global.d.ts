export {};

declare global {
  interface Window {
    electronAPI?: {
      getStoreSetting?: (key: string) => Promise<unknown>;
      setStoreSetting?: (key: string, value: unknown) => Promise<unknown>;
      selectDirectory?: () => Promise<string | null | undefined>;
      onDirectorySelected?: (
        callback: (event: unknown, directory: string) => void
      ) => void;
      removeListener?: (
        channel: string,
        callback: (event: unknown, ...args: unknown[]) => void
      ) => void;
      removeAllListeners?: (channel: string) => void;
    };
  }
}
