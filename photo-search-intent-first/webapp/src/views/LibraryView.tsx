import type React from "react";
import { EnhancedEmptyState } from "../components/EnhancedEmptyState";
import { EnhancedWelcome } from "../components/EnhancedWelcome";
import LibraryBrowser from "../components/LibraryBrowser";
import { humanizeSeconds } from "../utils/time";

export interface LibraryViewProps {
	dir: string;
	library: string[] | null;
	isIndexing: boolean;
	progressPct?: number;
	etaSeconds?: number;
	onSelectLibrary: () => void;
	onRunDemo: () => Promise<void>;
	onOpenHelp: () => void;
	onLoadLibrary: (limit?: number, offset?: number) => void;
	hasMore?: boolean;
	isLoading?: boolean;
	selected?: Set<string>;
	onToggleSelect?: (path: string) => void;
	onOpen?: (path: string) => void;
	tagsMap?: Record<string, string[]>;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
	dir,
	library,
	isIndexing,
	progressPct,
	etaSeconds,
	onSelectLibrary,
	onRunDemo,
	onOpenHelp,
	onLoadLibrary,
	hasMore = false,
	isLoading = false,
	selected = new Set(),
	onToggleSelect,
	onOpen,
	tagsMap = {},
}) => {
	// Empty dir state - use enhanced welcome experience
	if (!dir) {
		return (
			<EnhancedWelcome
				onStartDemo={onRunDemo}
				onSelectFolder={onSelectLibrary}
				onStartTour={onOpenHelp}
				onOpenHelp={onOpenHelp}
				isFirstVisit={true}
			/>
		);
	}

	if ((library?.length || 0) === 0 && isIndexing) {
		return (
			<div className="p-4">
				<EnhancedEmptyState
					type="indexing"
					indexingProgress={Math.round((progressPct || 0) * 100)}
					estimatedTime={
						typeof etaSeconds === "number" && Number.isFinite(etaSeconds)
							? `~${humanizeSeconds(etaSeconds || 0)}`
							: undefined
					}
				/>
			</div>
		);
	}

	// Display library browser with ScrollLoader integration
	return (
		<div className="p-4">
			<LibraryBrowser
				dir={dir}
				engine="default"
				library={library || []}
				onLoadLibrary={onLoadLibrary}
				selected={selected}
				onToggleSelect={onToggleSelect}
				onOpen={onOpen}
				tagsMap={tagsMap}
				hasMore={hasMore}
				isLoading={isLoading}
			/>
		</div>
	);
};

export default LibraryView;
