/**
 * PhotoOperationsContext - Provides photo-specific operations and utilities
 * This context encapsulates all photo-related functionality including viewing,
 * editing, metadata operations, and photo utilities.
 */
import type React from "react";
import { createContext, useContext, useMemo } from "react";
import type { AccessibilitySettings } from "../../components/AccessibilityPanel";

// Define the shape of our photo operations context
interface PhotoOperationsContextType {
	// Photo viewing operations
	handlePhotoOpen: (path: string) => void;
	handlePhotoAction: (
		action: string,
		photo: { path: string; [key: string]: unknown },
	) => void;

	// Photo editing operations
	rotatePhoto: (path: string, degrees: 90 | 180 | 270) => Promise<void>;
	flipPhoto: (
		path: string,
		direction: "horizontal" | "vertical",
	) => Promise<void>;
	cropPhoto: (
		path: string,
		coords: { x: number; y: number; width: number; height: number },
	) => Promise<void>;
	adjustPhoto: (path: string, adjustments: PhotoAdjustments) => Promise<void>;
	upscalePhoto: (path: string, scale: 2 | 4) => Promise<void>;

	// Photo metadata operations
	updatePhotoTags: (path: string, tags: string[]) => Promise<void>;
	updatePhotoRating: (
		path: string,
		rating: 1 | 2 | 3 | 4 | 5 | 0,
	) => Promise<void>;
	updatePhotoCaption: (path: string, caption: string) => Promise<void>;
	removePhotoMetadata: (path: string, keys: string[]) => Promise<void>;

	// Photo export operations
	exportPhoto: (
		path: string,
		dest: string,
		options?: ExportOptions,
	) => Promise<void>;
	exportPhotosBatch: (
		paths: string[],
		dest: string,
		options?: ExportOptions,
	) => Promise<void>;
	copyToClipboard: (path: string) => Promise<void>;
	sharePhoto: (path: string, options?: ShareOptions) => Promise<void>;

	// Photo organization operations
	moveToTrash: (path: string, useOsTrash?: boolean) => Promise<void>;
	moveToFolder: (path: string, dest: string) => Promise<void>;
	moveToCollection: (path: string, collection: string) => Promise<void>;
	markAsFavorite: (path: string) => Promise<void>;
	removeFromFavorites: (path: string) => Promise<void>;

	// Accessibility operations
	handleAccessibilitySettingsChange: (settings: AccessibilitySettings) => void;
	accessibilitySettings: AccessibilitySettings;
	setAccessibilitySettings: (settings: AccessibilitySettings) => void;

	// Utility functions
	rowsEqual: (a: number[][], b: number[][]) => boolean;
	getPhotoInfo: (path: string) => Promise<PhotoInfo>;
	getSimilarPhotos: (
		path: string,
		limit?: number,
	) => Promise<Array<{ path: string; score: number }>>;
	getDuplicates: (
		path: string,
	) => Promise<Array<{ path: string; similarity: number }>>;
}

// Photo adjustments interface
interface PhotoAdjustments {
	brightness?: number; // -100 to 100
	contrast?: number; // -100 to 100
	saturation?: number; // -100 to 100
	hue?: number; // -180 to 180
	gamma?: number; // 0.1 to 9.99
	vibrance?: number; // -100 to 100
	exposure?: number; // -2 to 2
	temperature?: number; // 2000 to 12000
	tint?: number; // -150 to 150
}

// Export options interface
interface ExportOptions {
	quality?: number; // 1-100
	format?: "original" | "jpg" | "png" | "webp";
	stripExif?: boolean;
	stripGps?: boolean;
	keepCopyrightOnly?: boolean;
	resizeWidth?: number;
	resizeHeight?: number;
	preset?: "web" | "email" | "print" | "custom";
}

// Share options interface
interface ShareOptions {
	title?: string;
	text?: string;
	files?: string[];
}

// Photo info interface
interface PhotoInfo {
	path: string;
	name: string;
	size: number;
	dimensions: { width: number; height: number };
	format: string;
	colorSpace: string;
	bitDepth: number;
	hasAlpha: boolean;
	exif?: Record<string, unknown>;
	iptc?: Record<string, unknown>;
	xmp?: Record<string, unknown>;
	embeddedProfile?: string;
	embeddedText?: string;
	embeddedDescription?: string;
	embeddedKeywords?: string[];
	embeddedCopyright?: string;
	embeddedAuthor?: string;
	embeddedSoftware?: string;
	embeddedDateTime?: string;
	embeddedGps?: { latitude: number; longitude: number; altitude?: number };
	embeddedOrientation?: number;
	embeddedRating?: number;
	thumbnailPath?: string;
	histogram?: number[];
	dominantColors?: Array<{
		r: number;
		g: number;
		b: number;
		percentage: number;
	}>;
	sharpnessScore?: number;
	blurScore?: number;
	noiseLevel?: number;
	exposureValue?: number;
	highlights?: number;
	shadows?: number;
	whites?: number;
	blacks?: number;
	luminance?: number;
	colorfulness?: number;
	depthOfField?: number;
	bokehScore?: number;
	lightingType?: "natural" | "artificial" | "mixed" | "unknown";
	sceneType?: "indoor" | "outdoor" | "mixed" | "unknown";
	compositionScore?: number;
	aestheticScore?: number;
	faceCount?: number;
	faceRegions?: Array<{
		x: number;
		y: number;
		width: number;
		height: number;
		confidence: number;
	}>;
	detectedObjects?: Array<{
		label: string;
		confidence: number;
		x: number;
		y: number;
		width: number;
		height: number;
	}>;
	detectedText?: string;
	detectedEmotions?: Array<{
		emotion: string;
		confidence: number;
		x: number;
		y: number;
		width: number;
		height: number;
	}>;
	detectedActivities?: string[];
	detectedLandmarks?: Array<{ name: string; confidence: number }>;
	detectedCelebrities?: Array<{ name: string; confidence: number }>;
	detectedLogoBrands?: Array<{ brand: string; confidence: number }>;
	detectedNSFW?: { nsfw: boolean; confidence: number };
	detectedBarcodes?: Array<{
		type: string;
		value: string;
		x: number;
		y: number;
		width: number;
		height: number;
	}>;
}

// Create the context with a default value
const PhotoOperationsContext = createContext<
	PhotoOperationsContextType | undefined
>(undefined);

// Provider component props
interface PhotoOperationsProviderProps {
	children: React.ReactNode;
	value: PhotoOperationsContextType;
}

// Provider component
export const PhotoOperationsProvider: React.FC<
	PhotoOperationsProviderProps
> = ({ children, value }) => {
	return (
		<PhotoOperationsContext.Provider value={value}>
			{children}
		</PhotoOperationsContext.Provider>
	);
};

// Hook to consume the context
export const usePhotoOperationsContext = (): PhotoOperationsContextType => {
	const context = useContext(PhotoOperationsContext);
	if (context === undefined) {
		throw new Error(
			"usePhotoOperationsContext must be used within a PhotoOperationsProvider",
		);
	}
	return context;
};

// Selector hooks for specific photo operations
export const usePhotoViewing = (): Pick<
	PhotoOperationsContextType,
	"handlePhotoOpen" | "handlePhotoAction"
> => {
	const context = usePhotoOperationsContext();
	return useMemo(
		() => ({
			handlePhotoOpen: context.handlePhotoOpen,
			handlePhotoAction: context.handlePhotoAction,
		}),
		[context.handlePhotoOpen, context.handlePhotoAction],
	);
};

export const usePhotoEditing = (): Pick<
	PhotoOperationsContextType,
	"rotatePhoto" | "flipPhoto" | "cropPhoto" | "adjustPhoto" | "upscalePhoto"
> => {
	const context = usePhotoOperationsContext();
	return useMemo(
		() => ({
			rotatePhoto: context.rotatePhoto,
			flipPhoto: context.flipPhoto,
			cropPhoto: context.cropPhoto,
			adjustPhoto: context.adjustPhoto,
			upscalePhoto: context.upscalePhoto,
		}),
		[
			context.rotatePhoto,
			context.flipPhoto,
			context.cropPhoto,
			context.adjustPhoto,
			context.upscalePhoto,
		],
	);
};

export const usePhotoMetadata = (): Pick<
	PhotoOperationsContextType,
	| "updatePhotoTags"
	| "updatePhotoRating"
	| "updatePhotoCaption"
	| "removePhotoMetadata"
> => {
	const context = usePhotoOperationsContext();
	return useMemo(
		() => ({
			updatePhotoTags: context.updatePhotoTags,
			updatePhotoRating: context.updatePhotoRating,
			updatePhotoCaption: context.updatePhotoCaption,
			removePhotoMetadata: context.removePhotoMetadata,
		}),
		[
			context.updatePhotoTags,
			context.updatePhotoRating,
			context.updatePhotoCaption,
			context.removePhotoMetadata,
		],
	);
};

export const usePhotoExport = (): Pick<
	PhotoOperationsContextType,
	"exportPhoto" | "exportPhotosBatch" | "copyToClipboard" | "sharePhoto"
> => {
	const context = usePhotoOperationsContext();
	return useMemo(
		() => ({
			exportPhoto: context.exportPhoto,
			exportPhotosBatch: context.exportPhotosBatch,
			copyToClipboard: context.copyToClipboard,
			sharePhoto: context.sharePhoto,
		}),
		[
			context.exportPhoto,
			context.exportPhotosBatch,
			context.copyToClipboard,
			context.sharePhoto,
		],
	);
};

export const usePhotoOrganization = (): Pick<
	PhotoOperationsContextType,
	| "moveToTrash"
	| "moveToFolder"
	| "moveToCollection"
	| "markAsFavorite"
	| "removeFromFavorites"
> => {
	const context = usePhotoOperationsContext();
	return useMemo(
		() => ({
			moveToTrash: context.moveToTrash,
			moveToFolder: context.moveToFolder,
			moveToCollection: context.moveToCollection,
			markAsFavorite: context.markAsFavorite,
			removeFromFavorites: context.removeFromFavorites,
		}),
		[
			context.moveToTrash,
			context.moveToFolder,
			context.moveToCollection,
			context.markAsFavorite,
			context.removeFromFavorites,
		],
	);
};

export const useAccessibilityOperations = (): Pick<
	PhotoOperationsContextType,
	| "handleAccessibilitySettingsChange"
	| "accessibilitySettings"
	| "setAccessibilitySettings"
> => {
	const context = usePhotoOperationsContext();
	return useMemo(
		() => ({
			handleAccessibilitySettingsChange:
				context.handleAccessibilitySettingsChange,
			accessibilitySettings: context.accessibilitySettings,
			setAccessibilitySettings: context.setAccessibilitySettings,
		}),
		[
			context.handleAccessibilitySettingsChange,
			context.accessibilitySettings,
			context.setAccessibilitySettings,
		],
	);
};

export const usePhotoUtilities = (): Pick<
	PhotoOperationsContextType,
	"rowsEqual" | "getPhotoInfo" | "getSimilarPhotos" | "getDuplicates"
> => {
	const context = usePhotoOperationsContext();
	return useMemo(
		() => ({
			rowsEqual: context.rowsEqual,
			getPhotoInfo: context.getPhotoInfo,
			getSimilarPhotos: context.getSimilarPhotos,
			getDuplicates: context.getDuplicates,
		}),
		[
			context.rowsEqual,
			context.getPhotoInfo,
			context.getSimilarPhotos,
			context.getDuplicates,
		],
	);
};

export default PhotoOperationsContext;
