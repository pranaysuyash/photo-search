/**
 * IndexOperationsContext - Provides indexing and indexing-related operations
 * This context encapsulates all indexing functionality including fast index creation,
 * OCR processing, metadata extraction, and indexing state management.
 */
import type React from "react";
import { createContext, useContext, useMemo } from "react";

// Define the shape of our index operations context
interface IndexOperationsContextType {
	// Index building operations
	prepareFast: (kind: "annoy" | "faiss" | "hnsw") => Promise<void>;
	buildOCR: () => Promise<void>;
	buildMetadata: () => Promise<void>;
	buildCaptions: () => Promise<void>;
	buildFaces: () => Promise<void>;

	// Index state and monitoring
	monitorOperation: (
		jobId: string,
		operation: "ocr" | "metadata" | "fast_index" | "captions" | "faces",
	) => () => void;

	// Index configuration
	useFast: boolean;
	fastKind: "annoy" | "faiss" | "hnsw" | "";
	ocrLanguages: string[];
	useOcr: boolean;
	useCaps: boolean;
	setUseFast: (useFast: boolean) => void;
	setFastKind: (fastKind: "annoy" | "faiss" | "hnsw" | "") => void;
	setOcrLanguages: (languages: string[]) => void;
	setUseOcr: (useOcr: boolean) => void;
	setUseCaps: (useCaps: boolean) => void;

	// Index status
	fastIndexReady: boolean;
	ocrReady: boolean;
	metadataReady: boolean;
	captionsReady: boolean;
	facesReady: boolean;
	setFastIndexReady: (ready: boolean) => void;
	setOcrReady: (ready: boolean) => void;
	setMetadataReady: (ready: boolean) => void;
	setCaptionsReady: (ready: boolean) => void;
	setFacesReady: (ready: boolean) => void;
}

// Create the context with a default value
const IndexOperationsContext = createContext<
	IndexOperationsContextType | undefined
>(undefined);

// Provider component props
interface IndexOperationsProviderProps {
	children: React.ReactNode;
	value: IndexOperationsContextType;
}

// Provider component
export const IndexOperationsProvider: React.FC<
	IndexOperationsProviderProps
> = ({ children, value }) => {
	return (
		<IndexOperationsContext.Provider value={value}>
			{children}
		</IndexOperationsContext.Provider>
	);
};

// Hook to consume the context
export const useIndexOperationsContext = (): IndexOperationsContextType => {
	const context = useContext(IndexOperationsContext);
	if (context === undefined) {
		throw new Error(
			"useIndexOperationsContext must be used within an IndexOperationsProvider",
		);
	}
	return context;
};

// Selector hooks for specific index operations
export const useIndexBuilding = (): Pick<
	IndexOperationsContextType,
	"prepareFast" | "buildOCR" | "buildMetadata" | "buildCaptions" | "buildFaces"
> => {
	const context = useIndexOperationsContext();
	return useMemo(
		() => ({
			prepareFast: context.prepareFast,
			buildOCR: context.buildOCR,
			buildMetadata: context.buildMetadata,
			buildCaptions: context.buildCaptions,
			buildFaces: context.buildFaces,
		}),
		[
			context.prepareFast,
			context.buildOCR,
			context.buildMetadata,
			context.buildCaptions,
			context.buildFaces,
		],
	);
};

export const useIndexMonitoring = (): Pick<
	IndexOperationsContextType,
	"monitorOperation"
> => {
	const context = useIndexOperationsContext();
	return useMemo(
		() => ({
			monitorOperation: context.monitorOperation,
		}),
		[context.monitorOperation],
	);
};

export const useIndexConfiguration = (): Pick<
	IndexOperationsContextType,
	| "useFast"
	| "fastKind"
	| "ocrLanguages"
	| "useOcr"
	| "useCaps"
	| "setUseFast"
	| "setFastKind"
	| "setOcrLanguages"
	| "setUseOcr"
	| "setUseCaps"
> => {
	const context = useIndexOperationsContext();
	return useMemo(
		() => ({
			useFast: context.useFast,
			fastKind: context.fastKind,
			ocrLanguages: context.ocrLanguages,
			useOcr: context.useOcr,
			useCaps: context.useCaps,
			setUseFast: context.setUseFast,
			setFastKind: context.setFastKind,
			setOcrLanguages: context.setOcrLanguages,
			setUseOcr: context.setUseOcr,
			setUseCaps: context.setUseCaps,
		}),
		[
			context.useFast,
			context.fastKind,
			context.ocrLanguages,
			context.useOcr,
			context.useCaps,
			context.setUseFast,
			context.setFastKind,
			context.setOcrLanguages,
			context.setUseOcr,
			context.setUseCaps,
		],
	);
};

export const useIndexStatus = (): Pick<
	IndexOperationsContextType,
	| "fastIndexReady"
	| "ocrReady"
	| "metadataReady"
	| "captionsReady"
	| "facesReady"
	| "setFastIndexReady"
	| "setOcrReady"
	| "setMetadataReady"
	| "setCaptionsReady"
	| "setFacesReady"
> => {
	const context = useIndexOperationsContext();
	return useMemo(
		() => ({
			fastIndexReady: context.fastIndexReady,
			ocrReady: context.ocrReady,
			metadataReady: context.metadataReady,
			captionsReady: context.captionsReady,
			facesReady: context.facesReady,
			setFastIndexReady: context.setFastIndexReady,
			setOcrReady: context.setOcrReady,
			setMetadataReady: context.setMetadataReady,
			setCaptionsReady: context.setCaptionsReady,
			setFacesReady: context.setFacesReady,
		}),
		[
			context.fastIndexReady,
			context.ocrReady,
			context.metadataReady,
			context.captionsReady,
			context.facesReady,
			context.setFastIndexReady,
			context.setOcrReady,
			context.setMetadataReady,
			context.setCaptionsReady,
			context.setFacesReady,
		],
	);
};

export default IndexOperationsContext;
