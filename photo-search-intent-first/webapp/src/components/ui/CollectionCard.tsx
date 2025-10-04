import {
	Download,
	FolderPlus,
	GripVertical,
	MoreVertical,
	Plus,
	Share2,
	Trash2,
	Edit3,
	Copy,
	Archive,
	Palette,
	CheckSquare,
	Square,
	Edit2,
	Camera,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface CollectionCardProps {
	name: string;
	photos: string[];
	theme: {
		colors: string;
		border: string;
	};
	isFocused?: boolean;
	isDropTarget?: boolean;
	isDragging?: boolean;
	isSelected?: boolean;
	bulkMode?: boolean;
	dir: string;
	engine: string;
	onOpen: (name: string) => void;
	onShare: (name: string) => void;
	onExport: (name: string) => void;
	onDelete?: (name: string) => void;
	onSetCover: (name: string) => void;
	onChangeTheme: (name: string) => void;
	onToggleSelection?: (name: string) => void;
	onDragStart: (e: React.DragEvent, name: string) => void;
	onDragOver: (e: React.DragEvent, name: string) => void;
	onDragEnter: (e: React.DragEvent, name: string) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent, name: string) => void;
	onContextMenu: (e: React.MouseEvent, name: string) => void;
	onRecordAction: (action: any) => void;
	getCollectionCover: (name: string, photos: string[]) => string;
	thumbUrl: (dir: string, engine: string, path: string, size: number) => string;
	collectionThemes: Record<string, string>;
	loadedImages: Set<string>;
	setLoadedImages: (fn: (prev: Set<string>) => Set<string>) => void;
}

// Lazy loading image component
const LazyImage = ({
	src,
	alt,
	className,
	collectionName,
	photoPath,
	loadedImages,
	setLoadedImages
}: {
	src: string;
	alt: string;
	className: string;
	collectionName: string;
	photoPath: string;
	loadedImages: Set<string>;
	setLoadedImages: (fn: (prev: Set<string>) => Set<string>) => void;
}) => {
	const imgRef = useRef<HTMLImageElement>(null);
	const [isVisible, setIsVisible] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const imageKey = `${collectionName}-${photoPath}`;

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !loadedImages.has(imageKey)) {
					setIsVisible(true);
					setLoadedImages(prev => new Set(prev).add(imageKey));
				}
			},
			{ threshold: 0.1, rootMargin: "50px" }
		);

		if (imgRef.current) {
			observer.observe(imgRef.current);
		}

		return () => observer.disconnect();
	}, [imageKey, loadedImages, setLoadedImages]);

	return (
		<div ref={imgRef} className={`${className} relative overflow-hidden`}>
			{isVisible ? (
				<img
					src={src}
					alt={alt}
					className={`w-full h-full object-cover transition-opacity duration-300 ${
						hasLoaded ? "opacity-100" : "opacity-0"
					}`}
					onLoad={() => setHasLoaded(true)}
					loading="lazy"
				/>
			) : (
				<div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
					<Camera className="w-6 h-6 text-gray-400" />
				</div>
			)}
			{isVisible && !hasLoaded && (
				<div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
					<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
				</div>
			)}
		</div>
	);
};

export function CollectionCard({
	name,
	photos,
	theme,
	isFocused = false,
	isDropTarget = false,
	isDragging = false,
	isSelected = false,
	bulkMode = false,
	dir,
	engine,
	onOpen,
	onShare,
	onExport,
	onDelete,
	onSetCover,
	onChangeTheme,
	onToggleSelection,
	onDragStart,
	onDragOver,
	onDragEnter,
	onDragLeave,
	onDrop,
	onContextMenu,
	onRecordAction,
	getCollectionCover,
	thumbUrl,
	collectionThemes,
	loadedImages,
	setLoadedImages,
}: CollectionCardProps) {
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const handleDelete = () => {
		if (onDelete) {
			// Record action for undo/redo before deleting
			onRecordAction({
				type: "delete",
				collectionName: name,
				timestamp: Date.now(),
				previousState: {
					photos: photos,
					themes: collectionThemes
				}
			});
			onDelete(name);
		}
		setIsDropdownOpen(false);
	};

	const renderPhotoGrid = () => {
		if (photos.length === 0) {
			return (
				<div className="w-full h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200">
					<FolderPlus className="w-8 h-8 mb-2" />
					<span className="text-sm">Empty collection</span>
				</div>
			);
		}

		if (photos.length === 1) {
			// Single photo - full cover
			return (
				<div className="relative">
					<LazyImage
						src={thumbUrl(dir, engine, getCollectionCover(name, photos), 200)}
						alt={`${name} collection cover`}
						className="w-full h-32 rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
						collectionName={name}
						photoPath={getCollectionCover(name, photos)}
						loadedImages={loadedImages}
						setLoadedImages={setLoadedImages}
					/>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="secondary"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										onSetCover(name);
									}}
									className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-700 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white shadow-sm"
								>
									<Edit2 className="w-3 h-3" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Change cover photo</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			);
		}

		if (photos.length === 2) {
			// Two photos - side by side
			return (
				<div className="grid grid-cols-2 gap-1 h-32">
					{photos.slice(0, 2).map((path, i) => (
						<LazyImage
							key={path}
							src={thumbUrl(dir, engine, path, 100)}
							alt={`${name} photo ${i + 1}`}
							className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
							collectionName={name}
							photoPath={path}
							loadedImages={loadedImages}
							setLoadedImages={setLoadedImages}
						/>
					))}
				</div>
			);
		}

		if (photos.length === 3) {
			// Three photos - main + 2 stack
			return (
				<div className="grid grid-cols-2 gap-1 h-32 relative">
					<div className="relative">
						<LazyImage
							src={thumbUrl(dir, engine, getCollectionCover(name, photos), 100)}
							alt={`${name} main photo`}
							className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
							collectionName={name}
							photoPath={getCollectionCover(name, photos)}
							loadedImages={loadedImages}
							setLoadedImages={setLoadedImages}
						/>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="secondary"
										size="sm"
										onClick={(e) => {
											e.stopPropagation();
											onSetCover(name);
										}}
										className="absolute top-1 left-1 bg-white/90 backdrop-blur-sm text-gray-700 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white shadow-sm"
									>
										<Edit2 className="w-2.5 h-2.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Change cover photo</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<div className="grid grid-rows-2 gap-1">
						{photos.slice(1, 3).map((path, i) => (
							<LazyImage
								key={path}
								src={thumbUrl(dir, engine, path, 50)}
								alt={`${name} photo ${i + 2}`}
								className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
								collectionName={name}
								photoPath={path}
								loadedImages={loadedImages}
								setLoadedImages={setLoadedImages}
							/>
						))}
					</div>
				</div>
			);
		}

		// Four or more photos - 2x2 grid with main cover
		return (
			<div className="grid grid-cols-2 grid-rows-2 gap-1 h-32 relative">
				{/* First photo is the cover photo */}
				<div className="relative">
					<LazyImage
						key={getCollectionCover(name, photos)}
						src={thumbUrl(dir, engine, getCollectionCover(name, photos), 75)}
						alt={`${name} cover photo`}
						className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
						collectionName={name}
						photoPath={getCollectionCover(name, photos)}
						loadedImages={loadedImages}
						setLoadedImages={setLoadedImages}
					/>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="secondary"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										onSetCover(name);
									}}
									className="absolute top-1 left-1 bg-white/90 backdrop-blur-sm text-gray-700 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white shadow-sm"
								>
									<Edit2 className="w-2 h-2" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Change cover photo</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				{/* Other photos */}
				{photos.slice(0, 3).filter(path => path !== getCollectionCover(name, photos)).slice(0, 3).map((path, i) => (
					<LazyImage
						key={path}
						src={thumbUrl(dir, engine, path, 75)}
						alt={`${name} photo ${i + 2}`}
						className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
						collectionName={name}
						photoPath={path}
						loadedImages={loadedImages}
						setLoadedImages={setLoadedImages}
					/>
				))}
				{/* Multiple photos indicator */}
				{photos.length > 4 && (
					<div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
						<Plus className="w-3 h-3" />
						{photos.length - 4}
					</div>
				)}
			</div>
		);
	};

	return (
		<Card
			draggable
			onDragStart={(e) => onDragStart(e, name)}
			onDragOver={(e) => onDragOver(e, name)}
			onDragEnter={(e) => onDragEnter(e, name)}
			onDragLeave={onDragLeave}
			onDrop={(e) => onDrop(e, name)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					if (bulkMode && onToggleSelection) {
						onToggleSelection(name);
					} else {
						onOpen(name);
					}
				}
			}}
			onContextMenu={(e) => onContextMenu(e, name)}
			tabIndex={0}
			aria-label={`Collection ${name} with ${photos.length} photos${isFocused ? " (focused)" : ""}`}
			className={`bg-gradient-to-br ${theme.colors} border rounded-xl transition-all duration-300 cursor-move shadow-sm hover:shadow-lg transform group ${
				isDropTarget
					? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200 ring-opacity-50 scale-105 animate-pulse"
					: `${theme.border} hover:border-gray-300 hover:scale-[1.02]`
			} ${isDragging ? "opacity-50 scale-95" : ""} ${
				isFocused ? "ring-4 ring-blue-400 ring-opacity-60 border-blue-400" : ""
			}`}
		>
			<CardContent className="p-4">
				{/* Collection header with drag handle */}
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						{bulkMode && onToggleSelection && (
							<Button
								variant="ghost"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									onToggleSelection(name);
								}}
								className="p-1 rounded hover:bg-white hover:bg-opacity-50 transition-colors"
							>
								{isSelected ? (
									<CheckSquare className="w-5 h-5 text-blue-600" />
								) : (
									<Square className="w-5 h-5 text-gray-400" />
								)}
							</Button>
						)}
						<GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
						<div className="min-w-0">
							<div className="font-semibold text-gray-900 truncate" title={name}>
								{name}
							</div>
							<div className="text-xs text-gray-600 space-y-1">
								<div className="flex items-center gap-1">
									<span>
										{photos.length} photo{photos.length !== 1 ? "s" : ""}
									</span>
									{isDropTarget && (
										<span className="text-blue-600 font-medium">
											• Drop here to add
										</span>
									)}
								</div>
								{photos.length > 0 && (
									<div className="flex items-center gap-2 text-xs text-gray-500">
										<span>Est. {Math.round(photos.length * 2.5)}MB</span>
										<span>•</span>
										<span>
											{new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Photo grid preview */}
				<div className="relative mb-3 group">
					{renderPhotoGrid()}
					{/* Gradient overlay for better text readability */}
					{photos.length > 0 && (
						<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
					)}
				</div>

				{/* Action buttons */}
				<div className="flex items-center justify-between pt-2 border-t border-gray-100">
					<Button onClick={() => onOpen(name)} className="text-xs font-medium">
						View Collection
					</Button>

					<div className="flex items-center gap-1">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onShare(name)}
										disabled={photos.length === 0}
										className="p-2 text-gray-500 hover:text-blue-600"
									>
										<Share2 className="w-4 h-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Share collection</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onExport(name)}
										disabled={photos.length === 0}
										className="p-2 text-gray-500 hover:text-green-600"
									>
										<Download className="w-4 h-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Export collection</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="p-2 text-gray-500 hover:text-gray-700"
								>
									<MoreVertical className="w-4 h-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="min-w-48">
								<DropdownMenuItem onClick={() => {
									setIsDropdownOpen(false);
									// TODO: Implement rename functionality
									alert("Rename functionality coming soon!");
								}}>
									<Edit3 className="w-4 h-4 mr-2" />
									Rename
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => {
									setIsDropdownOpen(false);
									// TODO: Implement duplicate functionality
									alert("Duplicate functionality coming soon!");
								}}>
									<Copy className="w-4 h-4 mr-2" />
									Duplicate
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => {
									setIsDropdownOpen(false);
									// TODO: Implement archive functionality
									alert("Archive functionality coming soon!");
								}}>
									<Archive className="w-4 h-4 mr-2" />
									Archive
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => {
									setIsDropdownOpen(false);
									onChangeTheme(name);
								}}>
									<Palette className="w-4 h-4 mr-2" />
									Change Theme
								</DropdownMenuItem>
								{onDelete && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={handleDelete}
											className="text-red-600 focus:text-red-600 focus:bg-red-50"
										>
											<Trash2 className="w-4 h-4 mr-2" />
											Delete
										</DropdownMenuItem>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}