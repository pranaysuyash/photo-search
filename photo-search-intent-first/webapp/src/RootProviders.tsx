import type React from "react";
import { HashRouter } from "react-router-dom";
import GlobalAnnouncer from "./components/GlobalAnnouncer";
import { JobsProvider } from "./contexts/JobsContext";
import { LibraryProvider } from "./contexts/LibraryContext";
import { ModalProvider } from "./contexts/ModalContext";
import { SearchProvider } from "./contexts/SearchContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { UIProvider } from "./contexts/UIContext";
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
							<JobsProvider>
								<LibraryProvider>
									<SearchProvider>
										<ModalProvider>
											{children}
											<GlobalAnnouncer />
										</ModalProvider>
									</SearchProvider>
								</LibraryProvider>
							</JobsProvider>
						</PhotoVaultAPIProvider>
					</UIProvider>
				</SettingsProvider>
			</SimpleStoreProvider>
		</HashRouter>
	);
}
