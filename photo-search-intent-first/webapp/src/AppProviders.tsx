import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { HintProvider } from "./components/HintSystem";
import { ThemeProvider } from "./components/ThemeProvider";
import { JobsProvider } from "./contexts/JobsContext";
import { LibraryProvider } from "./contexts/LibraryContext";
import { ModalProvider } from "./contexts/ModalContext";
import { AccessibilityProvider } from "./framework/AccessibilityFramework";

interface AppProvidersProps {
	children: ReactNode;
}

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
		},
	},
});

/**
 * Centralizes top-level providers used by the legacy App so they can be
 * reused as we modularize the root component.
 */
export function AppProviders({ children }: AppProvidersProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<AccessibilityProvider>
				<JobsProvider>
					<LibraryProvider>
						<ErrorBoundary>
							<ThemeProvider>
								<HintProvider>
									<ModalProvider>{children}</ModalProvider>
								</HintProvider>
							</ThemeProvider>
						</ErrorBoundary>
					</LibraryProvider>
				</JobsProvider>
			</AccessibilityProvider>
		</QueryClientProvider>
	);
}
