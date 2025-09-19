import { apiMetadataDetail } from "../api";

export interface ExifData {
	// Camera and lens information
	make?: string;
	model?: string;
	lens_make?: string;
	lens_model?: string;

	// Shooting settings
	iso?: number;
	aperture?: number; // f-stop value
	shutter_speed?: string;
	exposure_time?: number;
	focal_length?: number;

	// Date and time
	date_taken?: string;
	date_modified?: string;

	// GPS and location
	latitude?: number;
	longitude?: number;
	altitude?: number;
	gps_direction?: number;
	location_name?: string;

	// Image properties
	width?: number;
	height?: number;
	orientation?: number;
	color_space?: string;

	// Flash and lighting
	flash?: string;
	flash_fired?: boolean;
	white_balance?: string;
	metering_mode?: string;

	// Quality and processing
	quality?: string;
	compression?: string;
	software?: string;

	// Additional metadata
	title?: string;
	description?: string;
	keywords?: string[];
	copyright?: string;
	artist?: string;
	rating?: number;
}

export interface PhotoMetadata {
	path: string;
	fileSize?: number;
	mimeType?: string;
	exif?: ExifData;

	// Computed/derived values
	megapixels?: number;
	aspectRatio?: string;
	displayName?: string;
}

class MetadataService {
	private cache = new Map<string, PhotoMetadata>();
	private pendingRequests = new Map<string, Promise<PhotoMetadata>>();

	async getMetadata(dir: string, path: string): Promise<PhotoMetadata | null> {
		const cacheKey = `${dir}:${path}`;

		// Return cached result if available
		if (this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey) || null;
		}

		// Return pending request if already in flight
		if (this.pendingRequests.has(cacheKey)) {
			return this.pendingRequests.get(cacheKey) || null;
		}

		// Start new request
		const request = this.fetchMetadata(dir, path);
		this.pendingRequests.set(cacheKey, request);

		try {
			const result = await request;
			this.cache.set(cacheKey, result);
			return result;
		} catch (error) {
			console.warn(`Failed to fetch metadata for ${path}:`, error);
			return null;
		} finally {
			this.pendingRequests.delete(cacheKey);
		}
	}

	private async fetchMetadata(
		dir: string,
		path: string,
	): Promise<PhotoMetadata> {
		const response = await apiMetadataDetail(dir, path);
		const rawMeta = response.meta || {};

		// Parse and normalize EXIF data
		const exif: ExifData = {
			make: this.asString(rawMeta.make || rawMeta.Make),
			model: this.asString(rawMeta.model || rawMeta.Model),
			lens_make: this.asString(rawMeta.lens_make || rawMeta.LensMake),
			lens_model: this.asString(rawMeta.lens_model || rawMeta.LensModel),

			iso: this.parseNumber(rawMeta.iso || rawMeta.ISO),
			aperture: this.parseNumber(rawMeta.aperture || rawMeta.FNumber),
			shutter_speed: this.asString(
				rawMeta.shutter_speed || rawMeta.ExposureTime,
			),
			exposure_time: this.parseNumber(rawMeta.exposure_time),
			focal_length: this.parseNumber(
				rawMeta.focal_length || rawMeta.FocalLength,
			),

			date_taken: this.asString(
				rawMeta.date_taken || rawMeta.DateTime || rawMeta.DateTimeOriginal,
			),
			date_modified: this.asString(rawMeta.date_modified || rawMeta.ModifyDate),

			latitude: this.parseNumber(rawMeta.latitude || rawMeta.GPSLatitude),
			longitude: this.parseNumber(rawMeta.longitude || rawMeta.GPSLongitude),
			altitude: this.parseNumber(rawMeta.altitude || rawMeta.GPSAltitude),
			gps_direction: this.parseNumber(rawMeta.gps_direction),
			location_name: rawMeta.location_name,

			width: this.parseNumber(rawMeta.width || rawMeta.ImageWidth),
			height: this.parseNumber(rawMeta.height || rawMeta.ImageHeight),
			orientation: this.parseNumber(rawMeta.orientation || rawMeta.Orientation),
			color_space: this.asString(rawMeta.color_space || rawMeta.ColorSpace),

			flash: this.asString(rawMeta.flash || rawMeta.Flash),
			flash_fired: rawMeta.flash_fired,
			white_balance: this.asString(
				rawMeta.white_balance || rawMeta.WhiteBalance,
			),
			metering_mode: this.asString(
				rawMeta.metering_mode || rawMeta.MeteringMode,
			),

			quality: this.asString(rawMeta.quality),
			compression: this.asString(rawMeta.compression),
			software: this.asString(rawMeta.software || rawMeta.Software),

			title: this.asString(rawMeta.title || rawMeta.Title),
			description: this.asString(rawMeta.description || rawMeta.Description),
			keywords: this.parseKeywords(rawMeta.keywords || rawMeta.Keywords),
			copyright: this.asString(rawMeta.copyright || rawMeta.Copyright),
			artist: this.asString(rawMeta.artist || rawMeta.Artist),
			rating: this.parseNumber(rawMeta.rating || rawMeta.Rating),
		};

		// Compute derived values
		const metadata: PhotoMetadata = {
			path,
			fileSize: this.parseNumber(rawMeta.file_size),
			mimeType: rawMeta.mime_type,
			exif,
			displayName: path.split("/").pop() || path,
		};

		if (exif.width && exif.height) {
			metadata.megapixels =
				Math.round(((exif.width * exif.height) / 1000000) * 10) / 10;
			metadata.aspectRatio = this.calculateAspectRatio(exif.width, exif.height);
		}

		return metadata;
	}

	private parseNumber(value: unknown): number | undefined {
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const parsed = parseFloat(value);
			return Number.isNaN(parsed) ? undefined : parsed;
		}
		return undefined;
	}

	private parseKeywords(value: unknown): string[] | undefined {
		if (Array.isArray(value)) return value.filter((k) => typeof k === "string");
		if (typeof value === "string")
			return value
				.split(/[,;]/)
				.map((k) => k.trim())
				.filter(Boolean);
		return undefined;
	}

	private calculateAspectRatio(width: number, height: number): string {
		const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
		const divisor = gcd(width, height);
		const ratioW = width / divisor;
		const ratioH = height / divisor;

		// Common aspect ratios
		const ratio = ratioW / ratioH;
		if (Math.abs(ratio - 1.5) < 0.01) return "3:2";
		if (Math.abs(ratio - 1.33) < 0.01) return "4:3";
		if (Math.abs(ratio - 1.78) < 0.01) return "16:9";
		if (Math.abs(ratio - 1) < 0.01) return "1:1";

		return `${ratioW}:${ratioH}`;
	}

	// Format EXIF values for display
	formatExifValue(key: string, value: unknown): string {
		if (value === null || value === undefined) return "N/A";

		switch (key) {
			case "aperture":
				return `f/${value}`;
			case "shutter_speed":
			case "exposure_time":
				if (typeof value === "number") {
					return value >= 1 ? `${value}s` : `1/${Math.round(1 / value)}s`;
				}
				return String(value);
			case "focal_length":
				return `${value}mm`;
			case "iso":
				return `ISO ${value}`;
			case "file_size": {
				const n = this.parseNumber(value);
				return typeof n === "number" ? this.formatFileSize(n) : String(value);
			}
			case "megapixels":
				return `${value}MP`;
			case "date_taken":
			case "date_modified":
				return this.formatDate(String(value));
			case "latitude":
			case "longitude":
				return typeof value === "number"
					? `${value.toFixed(6)}°`
					: String(value);
			case "altitude":
				return `${value}m`;
			default:
				return String(value);
		}
	}

	private formatFileSize(bytes: number): string {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
	}

	private formatDate(dateStr: string): string {
		try {
			const date = new Date(dateStr);
			return (
				date.toLocaleDateString() +
				" " +
				date.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				})
			);
		} catch {
			return dateStr;
		}
	}

	private asString(value: unknown): string | undefined {
		return typeof value === "string" ? value : undefined;
	}

	// Extract common filter values from metadata
	getFilterValues(metadata: PhotoMetadata[]): {
		cameras: string[];
		lenses: string[];
		isoRange: [number, number];
		apertureRange: [number, number];
		focalLengthRange: [number, number];
		years: number[];
	} {
		const cameras = new Set<string>();
		const lenses = new Set<string>();
		const isos: number[] = [];
		const apertures: number[] = [];
		const focalLengths: number[] = [];
		const years = new Set<number>();

		metadata.forEach((meta) => {
			const exif = meta.exif;
			if (!exif) return;

			if (exif.make && exif.model) {
				cameras.add(`${exif.make} ${exif.model}`);
			}

			if (exif.lens_make && exif.lens_model) {
				lenses.add(`${exif.lens_make} ${exif.lens_model}`);
			} else if (exif.lens_model) {
				lenses.add(exif.lens_model);
			}

			if (exif.iso) isos.push(exif.iso);
			if (exif.aperture) apertures.push(exif.aperture);
			if (exif.focal_length) focalLengths.push(exif.focal_length);

			if (exif.date_taken) {
				try {
					const year = new Date(exif.date_taken).getFullYear();
					if (!Number.isNaN(year)) years.add(year);
				} catch {}
			}
		});

		return {
			cameras: Array.from(cameras).sort(),
			lenses: Array.from(lenses).sort(),
			isoRange:
				isos.length > 0 ? [Math.min(...isos), Math.max(...isos)] : [0, 0],
			apertureRange:
				apertures.length > 0
					? [Math.min(...apertures), Math.max(...apertures)]
					: [0, 0],
			focalLengthRange:
				focalLengths.length > 0
					? [Math.min(...focalLengths), Math.max(...focalLengths)]
					: [0, 0],
			years: Array.from(years).sort((a, b) => b - a),
		};
	}

	clearCache(): void {
		this.cache.clear();
		this.pendingRequests.clear();
	}
}

export const metadataService = new MetadataService();
