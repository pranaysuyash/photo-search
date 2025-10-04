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
	X,
	Search,
	Filter,
	SortAsc,
	Calendar,
	Hash,
	Camera,
	MapPin,
	Users,
	Briefcase,
	Heart,
	Plane,
	HelpCircle,
	Keyboard,
	Edit2,
	Check,
	ArrowLeft,
} from "lucide-react";
import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { apiCreateShare, apiExport, apiSetCollection, thumbUrl } from "../api";
import { announce } from "../utils/accessibility";
import { handleError } from "../utils/errors";
import { EnhancedEmptyState } from "./EnhancedEmptyState";

interface CollectionsProps {
	dir: string;
	engine: string;
	collections: Record<string, string[]>;
	onLoadCollections: () => void;
	onOpen: (name: string) => void;
	onDelete?: (name: string) => void;
	onShare?: (name: string, paths: string[]) => void;
	onExport?: (name: string, paths: string[]) => void;
	selectedPhotos?: string[]; // Photos to add to collection
	onCollectionUpdate?: (collections: Record<string, string[]>) => void;
	onOpenHelp?: () => void;
}

type DragItem = {
	type: "collection" | "photo";
	data: string | string[];
	name?: string;
};

export default function Collections({
	dir,
	engine,
	collections,
	onLoadCollections,
	onOpen,
	onDelete,
	onShare,
	onExport,
	selectedPhotos = [],
	onCollectionUpdate,
	onOpenHelp,
}: CollectionsProps) {
	const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
	const [dragOverCollection, setDragOverCollection] = useState<string | null>(
		null,
	);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newCollectionName, setNewCollectionName] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [expandedActions, _setExpandedActions] = useState<string | null>(null);
	const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
	const [collectionThemes, setCollectionThemes] = useState<Record<string, string>>({});
	const [showThemeSelector, setShowThemeSelector] = useState<string | null>(null);
	const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
	const [bulkMode, setBulkMode] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<"name" | "size" | "date">("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [showFilters, setShowFilters] = useState(false);
	const [showTemplates, setShowTemplates] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
	const [focusedCollectionIndex, setFocusedCollectionIndex] = useState<number>(-1);
	const [keyboardNavigationActive, setKeyboardNavigationActive] = useState(false);
	const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		collectionName: string;
	} | null>(null);
	const [showCoverSelector, setShowCoverSelector] = useState<string | null>(null);
	const [collectionCovers, setCollectionCovers] = useState<Record<string, number>>({});

	const dragCounter = useRef(0);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (activeDropdown) {
				setActiveDropdown(null);
			}
			if (showThemeSelector) {
				setShowThemeSelector(null);
			}
			if (contextMenu) {
				setContextMenu(null);
			}
			if (showCoverSelector) {
				setShowCoverSelector(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [activeDropdown, showThemeSelector, contextMenu, showCoverSelector]);

	// Enhanced keyboard navigation
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const collectionsList = Object.keys(collections || {}).filter(name =>
				name.toLowerCase().includes(searchQuery.toLowerCase())
			);
			if (collectionsList.length === 0) return;

			// Enable keyboard navigation on tab
			if (event.key === "Tab") {
				setKeyboardNavigationActive(true);
				return;
			}

			// Only handle navigation if keyboard mode is active
			if (!keyboardNavigationActive) return;

			switch (event.key) {
				case "ArrowRight":
				case "ArrowDown":
					event.preventDefault();
					setFocusedCollectionIndex(prev =>
						prev < collectionsList.length - 1 ? prev + 1 : 0
					);
					break;

				case "ArrowLeft":
				case "ArrowUp":
					event.preventDefault();
					setFocusedCollectionIndex(prev =>
						prev > 0 ? prev - 1 : collectionsList.length - 1
					);
					break;

				case "Enter":
				case " ":
					event.preventDefault();
					if (focusedCollectionIndex >= 0 && focusedCollectionIndex < collectionsList.length) {
						const collectionName = collectionsList[focusedCollectionIndex];
						if (bulkMode) {
							toggleCollectionSelection(collectionName);
						} else {
							onOpen(collectionName);
						}
					}
					break;

				case "Delete":
				case "Backspace":
					event.preventDefault();
					if (focusedCollectionIndex >= 0 && focusedCollectionIndex < collectionsList.length && onDelete) {
						const collectionName = collectionsList[focusedCollectionIndex];
						onDelete(collectionName);
					}
					break;

				case "s":
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						if (focusedCollectionIndex >= 0 && focusedCollectionIndex < collectionsList.length) {
							const collectionName = collectionsList[focusedCollectionIndex];
							handleShare(collectionName);
						}
					}
					break;

				case "e":
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						if (focusedCollectionIndex >= 0 && focusedCollectionIndex < collectionsList.length) {
							const collectionName = collectionsList[focusedCollectionIndex];
							handleExport(collectionName);
						}
					}
					break;

				case "a":
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						if (bulkMode) {
							selectAllCollections();
						}
					}
					break;

				case "Escape":
					event.preventDefault();
					setFocusedCollectionIndex(-1);
					setKeyboardNavigationActive(false);
					if (bulkMode) {
						clearSelection();
					}
					break;

				case "?":
					if (event.shiftKey) {
						event.preventDefault();
						setShowKeyboardHelp(true);
					}
					break;

				case "Home":
					event.preventDefault();
					setFocusedCollectionIndex(0);
					break;

				case "End":
					event.preventDefault();
					setFocusedCollectionIndex(collectionsList.length - 1);
					break;
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [collections, searchQuery, focusedCollectionIndex, keyboardNavigationActive, bulkMode, onOpen, onDelete, handleShare, handleExport, toggleCollectionSelection, selectAllCollections, clearSelection]);

	// Theme system
	const themes = {
		default: {
			name: "Default",
			colors: "from-gray-50 to-gray-100",
			border: "border-gray-200",
			accent: "text-gray-700",
		},
		blue: {
			name: "Ocean",
			colors: "from-blue-50 to-cyan-100",
			border: "border-blue-200",
			accent: "text-blue-700",
		},
		green: {
			name: "Nature",
			colors: "from-green-50 to-emerald-100",
			border: "border-green-200",
			accent: "text-green-700",
		},
		purple: {
			name: "Creative",
			colors: "from-purple-50 to-violet-100",
			border: "border-purple-200",
			accent: "text-purple-700",
		},
		orange: {
			name: "Sunset",
			colors: "from-orange-50 to-amber-100",
			border: "border-orange-200",
			accent: "text-orange-700",
		},
		pink: {
			name: "Romance",
			colors: "from-pink-50 to-rose-100",
			border: "border-pink-200",
			accent: "text-pink-700",
		},
	};

	const getCollectionTheme = (collectionName: string) => {
		const themeKey = collectionThemes[collectionName] || "default";
		return themes[themeKey as keyof typeof themes] || themes.default;
	};

	const getCollectionCover = (collectionName: string, collectionPaths: string[]) => {
		const coverIndex = collectionCovers[collectionName] || 0;
		return collectionPaths[Math.min(coverIndex, collectionPaths.length - 1)] || collectionPaths[0];
	};

	const setCollectionCover = (collectionName: string, photoIndex: number) => {
		setCollectionCovers(prev => ({
			...prev,
			[collectionName]: photoIndex,
		}));
		// TODO: Save cover selection to API/localStorage
		setShowCoverSelector(null);
	};

	const setCollectionTheme = (collectionName: string, themeKey: string) => {
		setCollectionThemes(prev => ({
			...prev,
			[collectionName]: themeKey,
		}));
		// TODO: Save theme to API/localStorage
	};

	// Collection templates
	const collectionTemplates = {
		travel: {
			name: "Travel & Vacation",
			icon: Plane,
			description: "Perfect for organizing vacation photos and travel memories",
			theme: "blue",
			suggestedNames: ["Summer Vacation 2024", "Europe Trip", "Weekend Getaway", "Road Trip"],
		},
		family: {
			name: "Family & Friends",
			icon: Users,
			description: "Keep your precious family moments and friend gatherings organized",
			theme: "pink",
			suggestedNames: ["Family Reunion", "Birthday Party", "Holiday Memories", "Friends Night Out"],
		},
		work: {
			name: "Work & Projects",
			icon: Briefcase,
			description: "Organize professional photos, events, and project documentation",
			theme: "default",
			suggestedNames: ["Team Building", "Conference 2024", "Project Screenshots", "Office Events"],
		},
		nature: {
			name: "Nature & Landscapes",
			icon: MapPin,
			description: "Beautiful landscapes, wildlife, and outdoor adventures",
			theme: "green",
			suggestedNames: ["National Park Trip", "Hiking Adventures", "Wildlife Photography", "Garden Photos"],
		},
		events: {
			name: "Special Events",
			icon: Heart,
			description: "Weddings, parties, celebrations and milestone moments",
			theme: "purple",
			suggestedNames: ["Wedding Photos", "Anniversary Celebration", "Graduation Day", "Baby Shower"],
		},
		hobby: {
			name: "Hobbies & Interests",
			icon: Camera,
			description: "Photos related to your passions and creative pursuits",
			theme: "orange",
			suggestedNames: ["Photography Projects", "Art & Crafts", "Cooking Adventures", "Music Events"],
		},
	};

	const applyTemplate = (templateKey: string) => {
		const template = collectionTemplates[templateKey as keyof typeof collectionTemplates];
		if (template) {
			setCollectionTheme("", template.theme); // Will be applied when collection is created
			setSelectedTemplate(templateKey);
			setShowTemplates(false);
		}
	};

	// Bulk operations
	const toggleCollectionSelection = (collectionName: string) => {
		setSelectedCollections(prev => {
			const newSet = new Set(prev);
			if (newSet.has(collectionName)) {
				newSet.delete(collectionName);
			} else {
				newSet.add(collectionName);
			}
			return newSet;
		});
	};

	const selectAllCollections = () => {
		setSelectedCollections(new Set(Object.keys(collections)));
	};

	const clearSelection = () => {
		setSelectedCollections(new Set());
		setBulkMode(false);
	};

	const handleBulkDelete = async () => {
		if (!onDelete) return;

		const confirmed = confirm(`Delete ${selectedCollections.size} collections? This cannot be undone.`);
		if (!confirmed) return;

		for (const collectionName of selectedCollections) {
			await onDelete(collectionName);
		}
		clearSelection();
	};

	const handleBulkExport = async () => {
		const exportFolder = prompt("Export all selected collections to folder:", "Bulk Export");
		if (!exportFolder) return;

		for (const collectionName of selectedCollections) {
			const paths = collections[collectionName] || [];
			if (paths.length > 0) {
				try {
					await apiExport(dir, paths, `${exportFolder}/${collectionName}`, "copy", false, false);
				} catch (error) {
					console.error(`Failed to export collection ${collectionName}:`, error);
				}
			}
		}

		alert(`Exported ${selectedCollections.size} collections to ${exportFolder}`);
		clearSelection();
	};

	// Context menu handlers
	const handleContextMenu = (event: React.MouseEvent, collectionName: string) => {
		event.preventDefault();
		setContextMenu({
			x: event.clientX,
			y: event.clientY,
			collectionName,
		});
	};

	const handleContextMenuAction = (action: string, collectionName: string) => {
		setContextMenu(null);

		switch (action) {
			case "open":
				onOpen(collectionName);
				break;
			case "share":
				handleShare(collectionName);
				break;
			case "export":
				handleExport(collectionName);
				break;
			case "theme":
				setShowThemeSelector(collectionName);
				break;
			case "cover":
				setShowCoverSelector(collectionName);
				break;
			case "rename":
				// TODO: Implement rename functionality
				alert("Rename functionality coming soon!");
				break;
			case "duplicate":
				// TODO: Implement duplicate functionality
				alert("Duplicate functionality coming soon!");
				break;
			case "archive":
				// TODO: Implement archive functionality
				alert("Archive functionality coming soon!");
				break;
			case "delete":
				if (onDelete) {
					onDelete(collectionName);
				}
				break;
		}
	};

	// Filter and sort collections
	const filteredAndSortedCollections = useMemo(() => {
		let filtered = Object.keys(collections).filter(name =>
			name.toLowerCase().includes(searchQuery.toLowerCase())
		);

		// Sort collections
		filtered.sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case "name":
					comparison = a.localeCompare(b);
					break;
				case "size":
					const sizeA = collections[a]?.length || 0;
					const sizeB = collections[b]?.length || 0;
					comparison = sizeA - sizeB;
					break;
				case "date":
					// For now, sort alphabetically since we don't have real dates
					// TODO: Use real creation dates when API supports it
					comparison = a.localeCompare(b);
					break;
			}

			return sortOrder === "desc" ? -comparison : comparison;
		});

		return filtered;
	}, [collections, searchQuery, sortBy, sortOrder]);

	// Update keyboard navigation dependencies after filteredAndSortedCollections is defined
	useEffect(() => {
		// Reset focus when collections change
		if (focusedCollectionIndex >= filteredAndSortedCollections.length) {
			setFocusedCollectionIndex(-1);
		}
	}, [filteredAndSortedCollections, focusedCollectionIndex]);

	// Lazy loading image component
	const LazyImage = ({ src, alt, className, collectionName, photoPath }: {
		src: string;
		alt: string;
		className: string;
		collectionName: string;
		photoPath: string;
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
		}, [imageKey]);

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

	// Handle creating new collection
	const handleCreateCollection = useCallback(async () => {
		if (!newCollectionName.trim() || isCreating) return;

		setIsCreating(true);
		try {
			await apiSetCollection(dir, newCollectionName.trim(), selectedPhotos);

			// Apply template theme if selected
			if (selectedTemplate) {
				const template = collectionTemplates[selectedTemplate as keyof typeof collectionTemplates];
				if (template) {
					setCollectionTheme(newCollectionName.trim(), template.theme);
				}
			}

			setNewCollectionName("");
			setShowCreateForm(false);
			setSelectedTemplate(null);
			onLoadCollections();
			if (onCollectionUpdate) {
				const updated = {
					...collections,
					[newCollectionName.trim()]: selectedPhotos,
				};
				onCollectionUpdate(updated);
			}
		} catch (error) {
			console.error("Failed to create collection:", error);
			alert(
				error instanceof Error ? error.message : "Failed to create collection",
			);
		} finally {
			setIsCreating(false);
		}
	}, [
		newCollectionName,
		selectedPhotos,
		dir,
		onLoadCollections,
		collections,
		onCollectionUpdate,
		isCreating,
	]);

	// Handle drag start for collections (reordering)
	const handleCollectionDragStart = useCallback(
		(e: React.DragEvent, collectionName: string) => {
			const item: DragItem = {
				type: "collection",
				data: collectionName,
				name: collectionName,
			};
			setDraggedItem(item);
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", JSON.stringify(item));
		},
		[],
	);

	// Handle drag over collection (to add photos)
	const handleDragOver = useCallback(
		(e: React.DragEvent, collectionName: string) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
			setDragOverCollection(collectionName);
		},
		[],
	);

	const handleDragEnter = useCallback(
		(e: React.DragEvent, collectionName: string) => {
			e.preventDefault();
			dragCounter.current++;
			setDragOverCollection(collectionName);
		},
		[],
	);

	const handleDragLeave = useCallback((_e: React.DragEvent) => {
		dragCounter.current--;
		if (dragCounter.current === 0) {
			setDragOverCollection(null);
		}
	}, []);

	// Handle drop on collection
	const handleDrop = useCallback(
		async (e: React.DragEvent, targetCollection: string) => {
			e.preventDefault();
			dragCounter.current = 0;
			setDragOverCollection(null);

			try {
				const dataTransfer = e.dataTransfer.getData("text/plain");
				let dragData: DragItem;

				if (dataTransfer) {
					dragData = JSON.parse(dataTransfer);
				} else {
					// Fallback to state
					if (!draggedItem) return;
					dragData = draggedItem;
				}

				if (dragData.type === "photo") {
					// Adding photos to collection
					const photoPaths = Array.isArray(dragData.data)
						? dragData.data
						: [dragData.data as string];
					const existingPaths = collections[targetCollection] || [];
					const newPaths = Array.from(
						new Set([...existingPaths, ...photoPaths]),
					);

					await apiSetCollection(dir, targetCollection, newPaths);
					onLoadCollections();

					if (onCollectionUpdate) {
						const updated = { ...collections, [targetCollection]: newPaths };
						onCollectionUpdate(updated);
					}
				}
			} catch (error) {
				console.error("Failed to update collection:", error);
				alert("Failed to update collection");
				handleError(error, {
					logToServer: true,
					context: {
						action: "collection_update",
						component: "Collections.handleDrop",
						dir,
					},
				});
			} finally {
				setDraggedItem(null);
			}
		},
		[collections, dir, onLoadCollections, onCollectionUpdate, draggedItem],
	);

	// Handle sharing collection
	const handleShare = useCallback(
		async (collectionName: string) => {
			if (onShare) {
				onShare(collectionName, collections[collectionName] || []);
			} else {
				// Default sharing implementation
				try {
					const paths = collections[collectionName] || [];
					if (paths.length === 0) {
						alert("Collection is empty");
						return;
					}

					const result = await apiCreateShare(dir, engine, paths, {
						expiryHours: 24,
						viewOnly: true,
					});

					await navigator.clipboard.writeText(
						window.location.origin + result.url,
					);
					alert("Share link copied to clipboard!");
					announce("Share link copied to clipboard", "polite");
				} catch (error) {
					console.error("Failed to share collection:", error);
					alert(
						error instanceof Error
							? error.message
							: "Failed to share collection",
					);
					handleError(error, {
						logToServer: true,
						context: {
							action: "share_collection",
							component: "Collections.handleShare",
							dir,
						},
					});
				}
			}
		},
		[onShare, collections, dir, engine],
	);

	// Handle exporting collection
	const handleExport = useCallback(
		async (collectionName: string) => {
			if (onExport) {
				onExport(collectionName, collections[collectionName] || []);
			} else {
				// Default export implementation
				const folderName = prompt(
					`Export collection "${collectionName}" to folder:`,
					collectionName,
				);
				if (!folderName) return;

				try {
					const paths = collections[collectionName] || [];
					if (paths.length === 0) {
						alert("Collection is empty");
						return;
					}

					await apiExport(dir, paths, folderName, "copy", false, false);
					alert(`Exported ${paths.length} photos to ${folderName}`);
					announce(`Exported ${paths.length} photos`, "polite");
				} catch (error) {
					console.error("Failed to export collection:", error);
					alert(
						error instanceof Error
							? error.message
							: "Failed to export collection",
					);
					handleError(error, {
						logToServer: true,
						context: {
							action: "export_collection",
							component: "Collections.handleExport",
							dir,
						},
					});
				}
			}
		},
		[onExport, collections, dir],
	);
	return (
		<div className="glass-panel p-3">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div>
						<h2 className="text-xl font-bold text-gray-900">Collections</h2>
						<p className="text-sm text-gray-600 mt-1">
							Organize your photos into beautiful collections
						</p>
					</div>
					{selectedPhotos.length > 0 && (
						<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
							{selectedPhotos.length} selected
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{selectedPhotos.length > 0 && (
						<button
							type="button"
							onClick={() => setShowCreateForm(true)}
							className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 shadow-sm"
						>
							<Plus className="w-4 h-4" />
							Create Collection
						</button>
					)}
					<button
						type="button"
						onClick={() => setBulkMode(!bulkMode)}
						className={`border rounded-lg px-4 py-2 text-sm transition-colors duration-200 flex items-center gap-2 ${
							bulkMode
								? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
								: "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
						}`}
					>
						{bulkMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
						{bulkMode ? "Exit Bulk" : "Bulk Select"}
					</button>
					<button
						type="button"
						onClick={onLoadCollections}
						className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
					>
						Refresh
					</button>
				</div>
			</div>

			{/* Search and Filter Bar */}
			{Object.keys(collections || {}).length > 0 && (
				<div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
					<div className="flex items-center gap-4">
						{/* Search */}
						<div className="flex-1 relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
							<input
								type="text"
								placeholder="Search collections..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
							/>
						</div>

						{/* Sort Options */}
						<div className="flex items-center gap-2">
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value as "name" | "size" | "date")}
								className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="name">Sort by Name</option>
								<option value="size">Sort by Size</option>
								<option value="date">Sort by Date</option>
							</select>
							<button
								type="button"
								onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
								className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
							>
								<SortAsc className={`w-4 h-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`} />
							</button>
						</div>

						{/* Filter Toggle */}
						<button
							type="button"
							onClick={() => setShowFilters(!showFilters)}
							className={`p-2 border rounded-lg transition-colors ${
								showFilters
									? "bg-blue-600 text-white border-blue-600"
									: "border-gray-300 hover:bg-gray-50"
							}`}
							title="Toggle filters"
						>
							<Filter className="w-4 h-4" />
						</button>

						{/* Keyboard shortcuts help */}
						<button
							type="button"
							onClick={() => setShowKeyboardHelp(true)}
							className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							title="Keyboard shortcuts (Shift + ?)"
						>
							<Keyboard className="w-4 h-4" />
						</button>
					</div>

					{/* Filter Options */}
					{showFilters && (
						<div className="mt-4 pt-4 border-t border-gray-200">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Photo Count
									</label>
									<select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
										<option value="">Any count</option>
										<option value="empty">Empty collections</option>
										<option value="small">1-10 photos</option>
										<option value="medium">11-50 photos</option>
										<option value="large">50+ photos</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Theme
									</label>
									<select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
										<option value="">Any theme</option>
										{Object.entries(themes).map(([key, theme]) => (
											<option key={key} value={key}>{theme.name}</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Date Created
									</label>
									<select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
										<option value="">Any time</option>
										<option value="today">Today</option>
										<option value="week">This week</option>
										<option value="month">This month</option>
										<option value="year">This year</option>
									</select>
								</div>
							</div>
						</div>
					)}

					{/* Results Count */}
					{searchQuery && (
						<div className="mt-4 text-sm text-gray-600">
							Found {filteredAndSortedCollections.length} collection{filteredAndSortedCollections.length !== 1 ? "s" : ""}
							{searchQuery && ` matching "${searchQuery}"`}
						</div>
					)}
				</div>
			)}

			{/* Bulk Actions Bar */}
			{bulkMode && selectedCollections.size > 0 && (
				<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span className="text-blue-700 font-medium">
								{selectedCollections.size} collection{selectedCollections.size !== 1 ? "s" : ""} selected
							</span>
							<button
								type="button"
								onClick={selectAllCollections}
								className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
							>
								Select All
							</button>
							<button
								type="button"
								onClick={clearSelection}
								className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
							>
								Clear
							</button>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleBulkExport}
								className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium transition-colors duration-200 flex items-center gap-2"
							>
								<Download className="w-4 h-4" />
								Export All
							</button>
							{onDelete && (
								<button
									type="button"
									onClick={handleBulkDelete}
									className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium transition-colors duration-200 flex items-center gap-2"
								>
									<Trash2 className="w-4 h-4" />
									Delete All
								</button>
							)}
							<button
								type="button"
								onClick={clearSelection}
								className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
								title="Close bulk actions"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Create new collection form */}
			{showCreateForm && (
				<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
					<div className="flex items-center gap-3 mb-3">
						<FolderPlus className="w-5 h-5 text-blue-600" />
						<div className="flex-1">
							<input
								type="text"
								placeholder="Enter collection name..."
								value={newCollectionName}
								onChange={(e) => setNewCollectionName(e.target.value)}
								className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								onKeyDown={(e) => {
									if (e.key === "Enter") handleCreateCollection();
									if (e.key === "Escape") setShowCreateForm(false);
								}}
							/>
						</div>
						<button
							type="button"
							onClick={() => setShowTemplates(!showTemplates)}
							className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
								showTemplates
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
							}`}
							title="Use template"
						>
							Templates
						</button>
					</div>

					{/* Template Selection */}
					{showTemplates && (
						<div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
							<h4 className="text-sm font-medium text-gray-900 mb-3">Choose a template:</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
								{Object.entries(collectionTemplates).map(([key, template]) => {
									const IconComponent = template.icon;
									return (
										<button
											key={key}
											type="button"
											onClick={() => applyTemplate(key)}
											className={`p-3 text-left rounded-lg border-2 transition-all hover:scale-105 ${
												selectedTemplate === key
													? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
													: "border-gray-200 hover:border-blue-300 bg-white"
											}`}
										>
											<div className="flex items-center gap-2 mb-2">
												<IconComponent className="w-4 h-4 text-blue-600" />
												<span className="font-medium text-sm text-gray-900">
													{template.name}
												</span>
											</div>
											<p className="text-xs text-gray-600 mb-2">
												{template.description}
											</p>
											<div className="flex flex-wrap gap-1">
												{template.suggestedNames.slice(0, 2).map((name, i) => (
													<button
														key={i}
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setNewCollectionName(name);
															applyTemplate(key);
														}}
														className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
													>
														{name}
													</button>
												))}
											</div>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Selected Template Info */}
					{selectedTemplate && (
						<div className="mb-3 p-2 bg-white rounded-lg border border-blue-200">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="text-sm text-blue-600">Template:</span>
									<span className="text-sm font-medium text-gray-900">
										{collectionTemplates[selectedTemplate as keyof typeof collectionTemplates].name}
									</span>
								</div>
								<button
									type="button"
									onClick={() => setSelectedTemplate(null)}
									className="text-gray-400 hover:text-gray-600 transition-colors"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>
					)}
					<div className="flex items-center justify-between">
						{selectedPhotos.length > 0 && (
							<div className="text-sm text-blue-700">
								Will add{" "}
								<span className="font-medium">
									{selectedPhotos.length} selected photo
									{selectedPhotos.length !== 1 ? "s" : ""}
								</span>
							</div>
						)}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setShowCreateForm(false)}
								className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleCreateCollection}
								disabled={!newCollectionName.trim() || isCreating}
								className="bg-blue-600 text-white px-4 py-1.5 text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
							>
								{isCreating ? "Creating..." : "Create Collection"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Collections list */}
			{filteredAndSortedCollections.length === 0 && Object.keys(collections || {}).length === 0 ? (
				<div className="mt-4">
					<EnhancedEmptyState
						type="no-directory"
						onAction={() => setShowCreateForm(true)}
						onOpenHelp={onOpenHelp}
						sampleQueries={[
							"Vacation & Travel",
							"Family & Friends",
							"Nature & Landscapes",
							"Work Projects",
						]}
						onRunSample={(name) => {
							setNewCollectionName(name);
							setShowCreateForm(true);
						}}
						context="collections"
					/>
				</div>
			) : filteredAndSortedCollections.length === 0 ? (
				<div className="mt-4 text-center py-12">
					<Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">No collections found</h3>
					<p className="text-gray-600 mb-4">
						No collections match your search criteria.
					</p>
					<button
						type="button"
						onClick={() => {
							setSearchQuery("");
							setShowFilters(false);
						}}
						className="text-blue-600 hover:text-blue-800 font-medium"
					>
						Clear search and filters
					</button>
				</div>
			) : (
				<ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
					{filteredAndSortedCollections.map((name, index) => {
						const isDropTarget = dragOverCollection === name;
						const collectionPaths = collections[name] || [];
						const theme = getCollectionTheme(name);
						const isFocused = focusedCollectionIndex === index;

						return (
							<li
								key={name}
								draggable
								onDragStart={(e) => handleCollectionDragStart(e, name)}
								onDragOver={(e) => handleDragOver(e, name)}
								onDragEnter={(e) => handleDragEnter(e, name)}
								onDragLeave={handleDragLeave}
								onDrop={(e) => handleDrop(e, name)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										if (bulkMode) {
											toggleCollectionSelection(name);
										} else {
											onOpen(name);
										}
									}
								}}
								onClick={() => {
									setFocusedCollectionIndex(index);
									setKeyboardNavigationActive(true);
								}}
								onContextMenu={(e) => handleContextMenu(e, name)}
								tabIndex={0}
								aria-label={`Collection ${name} with ${collectionPaths.length} photos${isFocused ? " (focused)" : ""}`}
								className={`bg-gradient-to-br ${theme.colors} border rounded-xl p-4 transition-all duration-300 cursor-move shadow-sm hover:shadow-lg transform ${
									isDropTarget
										? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200 ring-opacity-50 scale-105 animate-pulse"
										: `${theme.border} hover:border-gray-300 hover:scale-[1.02]`
								} ${expandedActions === name ? "ring-2 ring-blue-200 shadow-md" : ""} ${
									draggedItem?.type === "collection" && draggedItem.name === name
										? "opacity-50 scale-95"
										: ""
								} ${
									isFocused && keyboardNavigationActive
										? "ring-4 ring-blue-400 ring-opacity-60 border-blue-400"
										: ""
								}`}
							>
								{/* Collection header with drag handle */}
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-2 min-w-0 flex-1">
										{bulkMode && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													toggleCollectionSelection(name);
												}}
												className="p-1 rounded hover:bg-white hover:bg-opacity-50 transition-colors"
											>
												{selectedCollections.has(name) ? (
													<CheckSquare className="w-5 h-5 text-blue-600" />
												) : (
													<Square className="w-5 h-5 text-gray-400" />
												)}
											</button>
										)}
										<GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
										<div className="min-w-0">
											<div
												className="font-semibold text-gray-900 truncate"
												title={name}
											>
												{name}
											</div>
											<div className="text-xs text-gray-600 space-y-1">
												<div className="flex items-center gap-1">
													<span>
														{collectionPaths.length} photo
														{collectionPaths.length !== 1 ? "s" : ""}
													</span>
													{isDropTarget && (
														<span className="text-blue-600 font-medium">
															• Drop here to add
														</span>
													)}
												</div>
												{collectionPaths.length > 0 && (
													<div className="flex items-center gap-2 text-xs text-gray-500">
														<span>
															Est. {Math.round(collectionPaths.length * 2.5)}MB
														</span>
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
									{collectionPaths.length > 0 ? (
										<>
											{collectionPaths.length === 1 ? (
												// Single photo - full cover
												<div className="relative">
													<LazyImage
														src={thumbUrl(dir, engine, getCollectionCover(name, collectionPaths), 200)}
														alt={`${name} collection cover`}
														className="w-full h-32 rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
														collectionName={name}
														photoPath={getCollectionCover(name, collectionPaths)}
													/>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setShowCoverSelector(name);
														}}
														className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-700 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white shadow-sm"
														title="Change cover photo"
													>
														<Edit2 className="w-3 h-3" />
													</button>
												</div>
											) : collectionPaths.length === 2 ? (
												// Two photos - side by side
												<div className="grid grid-cols-2 gap-1 h-32">
													{collectionPaths.slice(0, 2).map((path, i) => (
														<LazyImage
															key={path}
															src={thumbUrl(dir, engine, path, 100)}
															alt={`${name} photo ${i + 1}`}
															className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
															collectionName={name}
															photoPath={path}
														/>
													))}
												</div>
											) : collectionPaths.length === 3 ? (
												// Three photos - main + 2 stack
												<div className="grid grid-cols-2 gap-1 h-32 relative">
													<div className="relative">
														<LazyImage
															src={thumbUrl(dir, engine, getCollectionCover(name, collectionPaths), 100)}
															alt={`${name} main photo`}
															className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
															collectionName={name}
															photoPath={getCollectionCover(name, collectionPaths)}
														/>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																setShowCoverSelector(name);
															}}
															className="absolute top-1 left-1 bg-white/90 backdrop-blur-sm text-gray-700 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white shadow-sm"
															title="Change cover photo"
														>
															<Edit2 className="w-2.5 h-2.5" />
														</button>
													</div>
													<div className="grid grid-rows-2 gap-1">
														{collectionPaths.slice(1, 3).map((path, i) => (
															<LazyImage
																key={path}
																src={thumbUrl(dir, engine, path, 50)}
																alt={`${name} photo ${i + 2}`}
																className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
																collectionName={name}
																photoPath={path}
															/>
														))}
													</div>
												</div>
											) : (
												// Four or more photos - 2x2 grid with main cover
												<div className="grid grid-cols-2 grid-rows-2 gap-1 h-32 relative">
													{/* First photo is the cover photo */}
													<div className="relative">
														<LazyImage
															key={getCollectionCover(name, collectionPaths)}
															src={thumbUrl(dir, engine, getCollectionCover(name, collectionPaths), 75)}
															alt={`${name} cover photo`}
															className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
															collectionName={name}
															photoPath={getCollectionCover(name, collectionPaths)}
														/>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																setShowCoverSelector(name);
															}}
															className="absolute top-1 left-1 bg-white/90 backdrop-blur-sm text-gray-700 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white shadow-sm"
															title="Change cover photo"
														>
															<Edit2 className="w-2 h-2" />
														</button>
													</div>
													{/* Other photos */}
													{collectionPaths.slice(0, 3).filter(path => path !== getCollectionCover(name, collectionPaths)).slice(0, 3).map((path, i) => (
														<LazyImage
															key={path}
															src={thumbUrl(dir, engine, path, 75)}
															alt={`${name} photo ${i + 2}`}
															className="w-full h-full rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
															collectionName={name}
															photoPath={path}
														/>
													))}
												</div>
											)}

											{/* Multiple photos indicator */}
											{collectionPaths.length > 4 && (
												<div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
													<Plus className="w-3 h-3" />
													{collectionPaths.length - 4}
												</div>
											)}

											{/* Gradient overlay for better text readability */}
											<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
										</>
									) : (
										<div className="w-full h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200">
											<FolderPlus className="w-8 h-8 mb-2" />
											<span className="text-sm">Empty collection</span>
										</div>
									)}
								</div>

								{/* Action buttons */}
								<div className="flex items-center justify-between pt-2 border-t border-gray-100">
									<button
										type="button"
										onClick={() => onOpen(name)}
										className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium transition-colors duration-200 flex items-center gap-1"
									>
										View Collection
									</button>

									<div className="flex items-center gap-1">
										{/* Quick access buttons */}
										<button
											type="button"
											onClick={() => handleShare(name)}
											className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors duration-200"
											title="Share collection"
											disabled={collectionPaths.length === 0}
										>
											<Share2 className="w-4 h-4" />
										</button>
										<button
											type="button"
											onClick={() => handleExport(name)}
											className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors duration-200"
											title="Export collection"
											disabled={collectionPaths.length === 0}
										>
											<Download className="w-4 h-4" />
										</button>

										{/* Quick actions dropdown */}
										<div className="relative">
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setActiveDropdown(activeDropdown === name ? null : name);
												}}
												className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
												title="More actions"
											>
												<MoreVertical className="w-4 h-4" />
											</button>

											{activeDropdown === name && (
												<div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
													<div className="py-1">
														<button
															type="button"
															className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
															onClick={() => {
																setActiveDropdown(null);
																// TODO: Implement rename functionality
																alert("Rename functionality coming soon!");
															}}
														>
															<Edit3 className="w-4 h-4" />
															Rename
														</button>
														<button
															type="button"
															className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
															onClick={() => {
																setActiveDropdown(null);
																// TODO: Implement duplicate functionality
																alert("Duplicate functionality coming soon!");
															}}
														>
															<Copy className="w-4 h-4" />
															Duplicate
														</button>
														<button
															type="button"
															className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
															onClick={() => {
																setActiveDropdown(null);
																// TODO: Implement archive functionality
																alert("Archive functionality coming soon!");
															}}
														>
															<Archive className="w-4 h-4" />
															Archive
														</button>
														<button
															type="button"
															className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
															onClick={(e) => {
																e.stopPropagation();
																setActiveDropdown(null);
																setShowThemeSelector(name);
															}}
														>
															<Palette className="w-4 h-4" />
															Change Theme
														</button>
														<div className="border-t border-gray-100 my-1" />
														{onDelete && (
															<button
																type="button"
																onClick={() => {
																	setActiveDropdown(null);
																	onDelete(name);
																}}
																className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
															>
																<Trash2 className="w-4 h-4" />
																Delete
															</button>
														)}
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			{/* Theme Selector Modal */}
			{showThemeSelector && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-900">Choose Theme</h3>
							<button
								type="button"
								onClick={() => setShowThemeSelector(null)}
								className="text-gray-400 hover:text-gray-600 transition-colors"
							>
								×
							</button>
						</div>
						<div className="grid grid-cols-2 gap-3">
							{Object.entries(themes).map(([key, theme]) => (
								<button
									key={key}
									type="button"
									onClick={() => {
										setCollectionTheme(showThemeSelector, key);
										setShowThemeSelector(null);
									}}
									className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
										collectionThemes[showThemeSelector] === key
											? "border-blue-500 ring-2 ring-blue-200"
											: "border-gray-200 hover:border-gray-300"
									}`}
								>
									<div className={`w-full h-12 rounded-lg bg-gradient-to-br ${theme.colors} mb-2`} />
									<div className={`text-sm font-medium ${theme.accent}`}>
										{theme.name}
									</div>
								</button>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Keyboard Shortcuts Help Modal */}
			{showKeyboardHelp && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-2">
								<Keyboard className="w-6 h-6 text-blue-600" />
								<h3 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h3>
							</div>
							<button
								type="button"
								onClick={() => setShowKeyboardHelp(false)}
								className="text-gray-400 hover:text-gray-600 transition-colors p-1"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Navigation */}
							<div>
								<h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
									<span className="w-2 h-2 bg-blue-600 rounded-full"></span>
									Navigation
								</h4>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-600">Navigate collections</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Arrow keys</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">First collection</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Home</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Last collection</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">End</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Exit navigation</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
									</div>
								</div>
							</div>

							{/* Actions */}
							<div>
								<h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
									<span className="w-2 h-2 bg-green-600 rounded-full"></span>
									Actions
								</h4>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-600">Open collection</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter / Space</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Delete collection</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Delete</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Share collection</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + S</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Export collection</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + E</kbd>
									</div>
								</div>
							</div>

							{/* Bulk Operations */}
							<div>
								<h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
									<span className="w-2 h-2 bg-purple-600 rounded-full"></span>
									Bulk Operations
								</h4>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-600">Select all</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + A</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Toggle selection</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Space</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Clear selection</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
									</div>
								</div>
							</div>

							{/* Help */}
							<div>
								<h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
									<span className="w-2 h-2 bg-orange-600 rounded-full"></span>
									Help
								</h4>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-600">Show this help</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Shift + ?</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Enable navigation</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Tab</kbd>
									</div>
								</div>
							</div>
						</div>

						<div className="mt-6 p-4 bg-blue-50 rounded-lg">
							<div className="flex items-start gap-2">
								<HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
								<div>
									<h5 className="font-medium text-blue-900 mb-1">Pro Tips</h5>
									<ul className="text-sm text-blue-800 space-y-1">
										<li>• Use Tab to activate keyboard navigation mode</li>
										<li>• In bulk mode, Space toggles selection instead of opening</li>
										<li>• Hold Ctrl/Cmd for quick actions on focused collection</li>
										<li>• All shortcuts work with the currently focused collection</li>
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Context Menu */}
			{contextMenu && (
				<div
					className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-2 min-w-48"
					style={{
						left: Math.min(contextMenu.x, window.innerWidth - 200),
						top: Math.min(contextMenu.y, window.innerHeight - 400),
					}}
				>
					<div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
						{contextMenu.collectionName}
					</div>

					<button
						type="button"
						onClick={() => handleContextMenuAction("open", contextMenu.collectionName)}
						className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
					>
						<FolderPlus className="w-4 h-4" />
						Open Collection
					</button>

					<div className="border-t border-gray-100 my-1" />

					<button
						type="button"
						onClick={() => handleContextMenuAction("share", contextMenu.collectionName)}
						className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
						disabled={!collections[contextMenu.collectionName]?.length}
					>
						<Share2 className="w-4 h-4" />
						Share
					</button>

					<button
						type="button"
						onClick={() => handleContextMenuAction("export", contextMenu.collectionName)}
						className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
						disabled={!collections[contextMenu.collectionName]?.length}
					>
						<Download className="w-4 h-4" />
						Export
					</button>

					<div className="border-t border-gray-100 my-1" />

					<button
						type="button"
						onClick={() => handleContextMenuAction("theme", contextMenu.collectionName)}
						className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
					>
						<Palette className="w-4 h-4" />
						Change Theme
					</button>

					<button
						type="button"
						onClick={() => handleContextMenuAction("cover", contextMenu.collectionName)}
						className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
						disabled={!collections[contextMenu.collectionName]?.length}
					>
						<Edit2 className="w-4 h-4" />
						Change Cover
					</button>

					<button
						type="button"
						onClick={() => handleContextMenuAction("rename", contextMenu.collectionName)}
						className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
					>
						<Edit3 className="w-4 h-4" />
						Rename
					</button>

					<button
						type="button"
						onClick={() => handleContextMenuAction("duplicate", contextMenu.collectionName)}
						className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
					>
						<Copy className="w-4 h-4" />
						Duplicate
					</button>

					<button
						type="button"
						onClick={() => handleContextMenuAction("archive", contextMenu.collectionName)}
						className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
					>
						<Archive className="w-4 h-4" />
						Archive
					</button>

					<div className="border-t border-gray-100 my-1" />

					{onDelete && (
						<button
							type="button"
							onClick={() => handleContextMenuAction("delete", contextMenu.collectionName)}
							className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
						>
							<Trash2 className="w-4 h-4" />
							Delete
						</button>
					)}
				</div>
			)}

			{/* Enhanced drop zone hint */}
			{selectedPhotos.length > 0 &&
				Object.keys(collections || {}).length > 0 && (
					<div className="mt-6 text-sm text-center text-gray-600 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
						<div className="flex items-center justify-center gap-2 mb-2">
							<div className="animate-bounce">💡</div>
							<strong className="text-blue-700">Drag & Drop Tips</strong>
						</div>
						<p className="text-gray-700">
							Drag selected photos onto any collection above to add them instantly
						</p>
						<p className="text-sm text-gray-600 mt-1">
							or create a new collection with your {selectedPhotos.length} selected photo{selectedPhotos.length !== 1 ? "s" : ""}
						</p>
					</div>
				)}

			{/* Cover Selector Modal */}
			{showCoverSelector && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
						<div className="flex items-center justify-between p-6 border-b border-gray-200">
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => setShowCoverSelector(null)}
									className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
									title="Close"
								>
									<ArrowLeft className="w-5 h-5 text-gray-600" />
								</button>
								<div>
									<h3 className="text-xl font-semibold text-gray-900">Choose Cover Photo</h3>
									<p className="text-sm text-gray-600 mt-1">
										Select a photo to represent the "{showCoverSelector}" collection
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-sm text-gray-500">
									Current: Photo {(collectionCovers[showCoverSelector] || 0) + 1}
								</span>
							</div>
						</div>

						<div className="p-6 overflow-y-auto max-h-[60vh]">
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{collections[showCoverSelector]?.map((photoPath, index) => {
									const isCurrentCover = (collectionCovers[showCoverSelector] || 0) === index;
									return (
										<button
											key={photoPath}
											type="button"
											onClick={() => setCollectionCover(showCoverSelector, index)}
											className={`relative group rounded-lg overflow-hidden transition-all duration-200 ${
												isCurrentCover
													? "ring-4 ring-blue-500 ring-offset-2"
													: "hover:ring-2 hover:ring-blue-300 hover:ring-offset-1"
											}`}
										>
											<div className="aspect-square">
												<img
													src={thumbUrl(dir, engine, photoPath, 150)}
													alt={`Photo ${index + 1}`}
													className="w-full h-full object-cover"
													loading="lazy"
												/>
											</div>

											{/* Current cover indicator */}
											{isCurrentCover && (
												<div className="absolute top-2 right-2 bg-blue-600 text-white p-1.5 rounded-full">
													<Check className="w-3 h-3" />
												</div>
											)}

											{/* Photo number */}
											<div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
												{index + 1}
											</div>

											{/* Hover overlay */}
											<div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
												<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
													<div className="bg-white text-blue-600 px-3 py-1.5 rounded-lg font-medium text-sm shadow-lg">
														{isCurrentCover ? "Current Cover" : "Set as Cover"}
													</div>
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>

						<div className="p-6 border-t border-gray-200 bg-gray-50">
							<div className="flex items-center justify-between">
								<p className="text-sm text-gray-600">
									{collections[showCoverSelector]?.length || 0} photos in this collection
								</p>
								<button
									type="button"
									onClick={() => setShowCoverSelector(null)}
									className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
								>
									Done
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Global drag overlay for better feedback */}
			{draggedItem?.type === "photo" && (
				<div className="fixed inset-0 bg-blue-500 bg-opacity-10 pointer-events-none z-50 transition-opacity duration-200">
					<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-4 border border-blue-200">
						<div className="flex items-center gap-2 text-blue-600">
							<div className="animate-pulse">📸</div>
							<span className="font-medium">
								Dragging {Array.isArray(draggedItem.data) ? draggedItem.data.length : 1} photo{Array.isArray(draggedItem.data) && draggedItem.data.length !== 1 ? "s" : ""}
							</span>
						</div>
						<p className="text-sm text-gray-600 mt-1">Drop on a collection to add</p>
					</div>
				</div>
			)}
		</div>
	);
}
