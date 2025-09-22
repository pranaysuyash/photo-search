import type { ReactNode } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { HintProvider } from "./components/HintSystem";
import { ThemeProvider } from "./components/ThemeProvider";

interface AppProvidersProps {
	children: ReactNode;
}

/**
 * Centralizes top-level providers used by the legacy App so they can be
 * reused as we modularize the root component.
 */
export function AppProviders({ children }: AppProvidersProps) {
	return (
		<ErrorBoundary>
			<ThemeProvider>
				<HintProvider>{children}</HintProvider>
			</ThemeProvider>
		</ErrorBoundary>
	);
}
