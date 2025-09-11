import type React from "react";
import { HashRouter } from "react-router-dom";
import { LibraryProvider } from "./contexts/LibraryContext";
import { SearchProvider } from "./contexts/SearchContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { UIProvider } from "./contexts/UIContext";
import { PhotoVaultAPIProvider } from "./services/PhotoVaultAPIProvider";
import { SimpleStoreProvider } from "./stores/SimpleStore";

export function RootProviders({ children }: { children: React.ReactNode }) {
	return (
		<HashRouter>
			<SimpleStoreProvider>
				<SettingsProvider>
					<UIProvider>
						<PhotoVaultAPIProvider>
							<LibraryProvider>
								<SearchProvider>{children}</SearchProvider>
							</LibraryProvider>
						</PhotoVaultAPIProvider>
					</UIProvider>
				</SettingsProvider>
			</SimpleStoreProvider>
		</HashRouter>
	);
}
