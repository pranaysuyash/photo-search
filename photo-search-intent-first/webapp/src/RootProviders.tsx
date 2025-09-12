import type React from "react";
import { HashRouter } from "react-router-dom";
import { LibraryProvider } from "./contexts/LibraryContext";
import { SearchProvider } from "./contexts/SearchContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { UIProvider } from "./contexts/UIContext";
import { ModalProvider } from "./contexts/ModalContext";
import { JobsProvider } from "./contexts/JobsContext";
import { PhotoVaultAPIProvider } from "./services/PhotoVaultAPIProvider";
import { SimpleStoreProvider } from "./stores/SimpleStore";

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <HashRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <SimpleStoreProvider>
        <SettingsProvider>
          <UIProvider>
            <PhotoVaultAPIProvider>
              <LibraryProvider>
                <JobsProvider>
                  <SearchProvider>
                    <ModalProvider>{children}</ModalProvider>
                  </SearchProvider>
                </JobsProvider>
              </LibraryProvider>
            </PhotoVaultAPIProvider>
          </UIProvider>
        </SettingsProvider>
      </SimpleStoreProvider>
    </HashRouter>
  );
}
