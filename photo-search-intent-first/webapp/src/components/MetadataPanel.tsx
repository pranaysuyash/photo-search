import type { LucideProps } from "lucide-react";
import {
	Calendar,
	Camera,
	ChevronDown,
	ChevronRight,
	Image,
	Info,
	MapPin,
	Settings,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import {
	type ExifData,
	metadataService,
	type PhotoMetadata,
} from "../services/MetadataService";

interface MetadataPanelProps {
	dir: string;
	path: string;
	onClose?: () => void;
	compact?: boolean; // For inline display vs full panel
}

interface MetadataSection {
	title: string;
	icon: React.ComponentType<LucideProps>;
	fields: Array<{
		key: keyof ExifData | "fileSize" | "megapixels" | "aspectRatio";
		label: string;
		formatter?: (value: number | string) => string | undefined;
	}>;
}

const METADATA_SECTIONS: MetadataSection[] = [
	{
		title: "Camera",
		icon: Camera,
		fields: [
			{ key: "make", label: "Make" },
			{ key: "model", label: "Model" },
			{ key: "lens_make", label: "Lens Make" },
			{ key: "lens_model", label: "Lens Model" },
			{ key: "software", label: "Software" },
		],
	},
	{
		title: "Settings",
		icon: Settings,
		fields: [
			{
				key: "aperture",
				label: "Aperture",
				formatter: (v) => (v ? `f/${v}` : ""),
			},
			{ key: "shutter_speed", label: "Shutter Speed" },
			{ key: "iso", label: "ISO", formatter: (v) => (v ? `ISO ${v}` : "") },
			{
				key: "focal_length",
				label: "Focal Length",
				formatter: (v) => (v ? `${v}mm` : ""),
			},
			{ key: "flash", label: "Flash" },
			{ key: "white_balance", label: "White Balance" },
			{ key: "metering_mode", label: "Metering" },
		],
	},
	{
		title: "Image",
		icon: Image,
		fields: [
			{ key: "width", label: "Width", formatter: (v) => (v ? `${v}px` : "") },
			{ key: "height", label: "Height", formatter: (v) => (v ? `${v}px` : "") },
			{
				key: "megapixels",
				label: "Megapixels",
				formatter: (v) => (v ? `${v}MP` : ""),
			},
			{ key: "aspectRatio", label: "Aspect Ratio" },
			{ key: "orientation", label: "Orientation" },
			{ key: "color_space", label: "Color Space" },
			{
				key: "fileSize",
				label: "File Size",
				formatter: (v) =>
					metadataService.formatExifValue("file_size", v as number | string),
			},
		],
	},
	{
		title: "Date & Time",
		icon: Calendar,
		fields: [
			{
				key: "date_taken",
				label: "Date Taken",
				formatter: (v) => metadataService.formatExifValue("date_taken", v),
			},
			{
				key: "date_modified",
				label: "Modified",
				formatter: (v) => metadataService.formatExifValue("date_modified", v),
			},
		],
	},
	{
		title: "Location",
		icon: MapPin,
		fields: [
			{
				key: "latitude",
				label: "Latitude",
				formatter: (v) =>
					typeof v === "number" ? `${v.toFixed(6)}°` : undefined,
			},
			{
				key: "longitude",
				label: "Longitude",
				formatter: (v) =>
					typeof v === "number" ? `${v.toFixed(6)}°` : undefined,
			},
			{
				key: "altitude",
				label: "Altitude",
				formatter: (v) => (v ? `${v}m` : undefined),
			},
			{ key: "location_name", label: "Location" },
		],
	},
	{
		title: "Details",
		icon: Info,
		fields: [
			{ key: "title", label: "Title" },
			{ key: "description", label: "Description" },
			{ key: "artist", label: "Artist" },
			{ key: "copyright", label: "Copyright" },
			{
				key: "rating",
				label: "Rating",
				formatter: (v) => (v ? "★".repeat(v) : undefined),
			},
		],
	},
];

export function MetadataPanel({
	dir,
	path,
	onClose,
	compact = false,
}: MetadataPanelProps) {
	const [metadata, setMetadata] = useState<PhotoMetadata | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedSections, setExpandedSections] = useState<Set<string>>(
		new Set(compact ? [] : ["Camera", "Settings", "Image"]),
	);

	useEffect(() => {
		let mounted = true;

		const loadMetadata = async () => {
			setLoading(true);
			setError(null);

			try {
				const meta = await metadataService.getMetadata(dir, path);
				if (mounted) {
					setMetadata(meta);
				}
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to load metadata",
					);
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		loadMetadata();

		return () => {
			mounted = false;
		};
	}, [dir, path]);

	const toggleSection = (title: string) => {
		setExpandedSections((prev) => {
			const next = new Set(prev);
			if (next.has(title)) {
				next.delete(title);
			} else {
				next.add(title);
			}
			return next;
		});
	};

	const renderSection = (section: MetadataSection) => {
		const isExpanded = expandedSections.has(section.title);
		const hasData = section.fields.some((field) => {
			const value =
				field.key === "fileSize" ||
				field.key === "megapixels" ||
				field.key === "aspectRatio"
					? metadata?.[field.key]
					: metadata?.exif?.[field.key as keyof ExifData];
			return value !== null && value !== undefined && value !== "";
		});

		if (!hasData && compact) return null;

		const Icon = section.icon;

		return (
			<div
				key={section.title}
				className="border-b border-gray-200 last:border-b-0"
			>
				<button
					type="button"
					onClick={() => toggleSection(section.title)}
					className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 ${compact ? "py-2" : ""}`}
				>
					<div className="flex items-center gap-2">
						<Icon
							className={`${compact ? "w-3 h-3" : "w-4 h-4"} text-gray-500`}
						/>
						<span className={`font-medium ${compact ? "text-sm" : ""}`}>
							{section.title}
						</span>
						{hasData && !isExpanded && compact && (
							<span className="text-xs text-gray-400">
								(
								{
									section.fields.filter((f) => {
										const value =
											f.key === "fileSize" ||
											f.key === "megapixels" ||
											f.key === "aspectRatio"
												? metadata?.[f.key]
												: metadata?.exif?.[f.key as keyof ExifData];
										return (
											value !== null && value !== undefined && value !== ""
										);
									}).length
								}
								)
							</span>
						)}
					</div>
					{isExpanded ? (
						<ChevronDown className="w-4 h-4 text-gray-400" />
					) : (
						<ChevronRight className="w-4 h-4 text-gray-400" />
					)}
				</button>

				{isExpanded && (
					<div className={`pb-3 px-3 space-y-2 ${compact ? "text-sm" : ""}`}>
						{section.fields.map((field) => {
							const value =
								field.key === "fileSize" ||
								field.key === "megapixels" ||
								field.key === "aspectRatio"
									? metadata?.[field.key]
									: metadata?.exif?.[field.key as keyof ExifData];

							if (value === null || value === undefined || value === "")
								return null;

							const displayValue = field.formatter
								? field.formatter(value as string | number)
								: String(value);
							if (!displayValue) return null;

							return (
								<div
									key={field.key}
									className="flex justify-between items-start"
								>
									<span className="text-gray-600 min-w-0 flex-1">
										{field.label}:
									</span>
									<span className="text-gray-900 font-mono text-right ml-2 break-all">
										{displayValue}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	if (loading) {
		return (
			<div
				className={`bg-white border ${compact ? "rounded p-2" : "rounded-lg p-4"}`}
			>
				<div className="flex items-center justify-center py-4">
					<div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
					<span className="ml-2 text-sm text-gray-600">
						Loading metadata...
					</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				className={`bg-white border ${compact ? "rounded p-2" : "rounded-lg p-4"}`}
			>
				<div className="text-center py-4">
					<div className="text-red-600 text-sm">Failed to load metadata</div>
					<div className="text-xs text-gray-500 mt-1">{error}</div>
				</div>
			</div>
		);
	}

	if (!metadata || !metadata.exif) {
		return (
			<div
				className={`bg-white border ${compact ? "rounded p-2" : "rounded-lg p-4"}`}
			>
				<div className="text-center py-4">
					<div className="text-gray-500 text-sm">No metadata available</div>
				</div>
			</div>
		);
	}

	const filename = metadata.displayName || path.split("/").pop() || path;

	return (
		<div className={`bg-white border ${compact ? "rounded" : "rounded-lg"}`}>
			{!compact && onClose && (
				<div className="flex items-center justify-between p-4 border-b">
					<div>
						<h3 className="font-semibold text-lg">Photo Details</h3>
						<p className="text-sm text-gray-600 truncate" title={filename}>
							{filename}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 p-1"
					>
						×
					</button>
				</div>
			)}

			<div className={compact ? "" : "max-h-96 overflow-y-auto"}>
				{METADATA_SECTIONS.map(renderSection)}
			</div>
		</div>
	);
}

// Quick metadata display component for thumbnails/cards
export function QuickMetadata({
	dir,
	path,
	fields = ["aperture", "shutter_speed", "iso", "focal_length"],
}: {
	dir: string;
	path: string;
	fields?: Array<keyof ExifData>;
}) {
	const [metadata, setMetadata] = useState<PhotoMetadata | null>(null);

	useEffect(() => {
		let mounted = true;

		metadataService
			.getMetadata(dir, path)
			.then((meta) => {
				if (mounted) setMetadata(meta);
			})
			.catch(() => {
				if (mounted) setMetadata(null);
			});

		return () => {
			mounted = false;
		};
	}, [dir, path]);

	if (!metadata?.exif) return null;

	const values = fields
		.map((field) => {
			const value = metadata.exif?.[field];
			if (value === null || value === undefined) return null;
			return metadataService.formatExifValue(field, value);
		})
		.filter(Boolean);

	if (values.length === 0) return null;

	return (
		<div className="text-xs text-white bg-black/60 px-1 rounded">
			{values.join(" • ")}
		</div>
	);
}
