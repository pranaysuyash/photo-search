import { ModalDataProvider } from "../../contexts/ModalDataContext";
import { ModalManager } from "../ModalManager";

export interface ModalsHostProps {
	selected: Set<string>;
	dir?: string;
	engine?: string;
	topK: number;
	highContrast: boolean;
	useFast: boolean;
	fastKind: "" | "annoy" | "faiss" | "hnsw";
	useCaps: boolean;
	useOcr: boolean;
	hasText: boolean;
	useOsTrash: boolean;
	searchText: string;
	query: string;
	collections: Record<string, string[]>;
	clusters: Array<{ id: string; name: string; count: number }>;
	allTags: string[];
	meta: { cameras: string[]; places: string[] };
	onSetBusy: (busy: string | boolean) => void;
	onSetNote: (note: string) => void;
	onSetResults: (results: Array<{ path: string; score: number }>) => void;
	onSetSaved: (
		saved: Array<{ name: string; query: string; topK: number }>,
	) => void;
	onSetCollections: (collections: Record<string, string[]>) => void;
	onSetDir: (dir: string) => void;
	onSetUseOsTrash: (useOsTrash: boolean) => void;
	onSetUseFast: (useFast: boolean) => void;
	onSetFastKind: (fastKind: "" | "annoy" | "faiss" | "hnsw") => void;
	onSetUseCaps: (useCaps: boolean) => void;
	onSetUseOcr: (useOcr: boolean) => void;
	onSetHasText: (hasText: boolean) => void;
	onSetHighContrast: (highContrast: boolean) => void;
	onIndex: () => void;
	onPrepareFast: () => void;
	onBuildOCR: () => void;
	onBuildMetadata: () => void;
	onTagSelected: (tag: string) => void;
}

export function ModalsHost({
	selected,
	dir,
	engine,
	topK,
	highContrast,
	useFast,
	fastKind,
	useCaps,
	useOcr,
	hasText,
	useOsTrash,
	searchText,
	query,
	collections,
	clusters,
	allTags,
	meta,
	onSetBusy,
	onSetNote,
	onSetResults,
	onSetSaved,
	onSetCollections,
	onSetDir,
	onSetUseOsTrash,
	onSetUseFast,
	onSetFastKind,
	onSetUseCaps,
	onSetUseOcr,
	onSetHasText,
	onSetHighContrast,
	onIndex,
	onPrepareFast,
	onBuildOCR,
	onBuildMetadata,
	onTagSelected,
}: ModalsHostProps) {
	return (
		<ModalDataProvider
			data={{
				selected,
				dir: dir ?? "",
				engine: engine ?? "local",
				topK,
				highContrast,
				useFast,
				fastKind,
				useCaps,
				useOcr,
				hasText,
				useOsTrash,
				searchText,
				query,
				collections,
				clusters,
				allTags,
				meta,
			}}
			actions={{
				settingsActions: {
					setDir: onSetDir,
					setUseOsTrash: onSetUseOsTrash,
					setUseFast: onSetUseFast,
					setFastKind: onSetFastKind,
					setUseCaps: onSetUseCaps,
					setUseOcr: onSetUseOcr,
					setHasText: onSetHasText,
					setHighContrast: onSetHighContrast,
				},
				uiActions: {
					setBusy: (busy: boolean) => onSetBusy(busy),
					setNote: onSetNote,
				},
				photoActions: {
					setResults: onSetResults,
					setSaved: onSetSaved,
					setCollections: onSetCollections,
				},
				libIndex: onIndex,
				prepareFast: onPrepareFast,
				buildOCR: onBuildOCR,
				buildMetadata: onBuildMetadata,
				tagSelected: onTagSelected,
			}}
		>
			<ModalManager />
		</ModalDataProvider>
	);
}
