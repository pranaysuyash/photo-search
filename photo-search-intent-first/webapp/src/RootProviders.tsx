import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes
			retry: (failureCount, error) => {
				// Don't retry on 4xx errors
				if (error instanceof Error && error.message.includes("4")) {
					return false;
				}
				return failureCount < 3;
			},
		},
	},
});

export function RootProviders({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
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
		</QueryClientProvider>
	);
}
