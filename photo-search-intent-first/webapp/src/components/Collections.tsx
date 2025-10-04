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
	Undo,
	Redo,
	Edit2,
	Check,
	ArrowLeft,
	BarChart3,
	PieChart,
	TrendingUp,
	Activity,
	FileImage,
	HardDrive,
} from "lucide-react";
import { CollectionCard } from "./ui/CollectionCard";
import { AnalyticsModal } from "./ui/AnalyticsModal";
import { CollectionContextMenu } from "./ui/CollectionContextMenu";
import { ThemeSelector } from "./ui/ThemeSelector";
import { CoverSelector } from "./ui/CoverSelector";
import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { apiCreateShare, apiExport, apiSetCollection, apiDeleteCollection, thumbUrl } from "../api";
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
	const [showCoverSelector, setShowCoverSelector] = useState<string | null>(null);
	const [collectionCovers, setCollectionCovers] = useState<Record<string, number>>({});
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
	const [showInsights, setShowInsights] = useState(false);

	// Undo/Redo functionality
	type CollectionAction = {
		type: "create" | "delete" | "update" | "theme_change";
		timestamp: number;
		collectionName: string;
		previousState?: {
			collections?: Record<string, string[]>;
			themes?: Record<string, string>;
		};
		newState?: {
			collections?: Record<string, string[]>;
			themes?: Record<string, string>;
		};
	};

	const [actionHistory, setActionHistory] = useState<CollectionAction[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

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
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [activeDropdown, showThemeSelector, contextMenu]);

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
							setSelectedCollections(prev => {
								const newSet = new Set(prev);
								if (newSet.has(collectionName)) {
									newSet.delete(collectionName);
								} else {
									newSet.add(collectionName);
								}
								return newSet;
							});
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

				case "a":
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						if (bulkMode) {
							setSelectedCollections(new Set(Object.keys(collections)));
						}
					}
					break;

				case "Escape":
					event.preventDefault();
					setFocusedCollectionIndex(-1);
					setKeyboardNavigationActive(false);
					if (bulkMode) {
						setSelectedCollections(new Set());
						setBulkMode(false);
					}
					break;

				case "z":
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						if (event.shiftKey) {
							handleRedo();
						} else {
							handleUndo();
						}
					}
					break;

				case "y":
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						handleRedo();
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
	}, [collections, searchQuery, focusedCollectionIndex, keyboardNavigationActive, bulkMode]);

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
		// Record theme change action
		const previousTheme = collectionThemes[collectionName] || "default";
		if (previousTheme !== themeKey) {
			recordAction({
				type: "theme_change",
				timestamp: Date.now(),
				collectionName,
				previousState: { themes: { ...collectionThemes } },
				newState: { themes: { ...collectionThemes, [collectionName]: themeKey } },
			});
		}

		setCollectionThemes(prev => ({
			...prev,
			[collectionName]: themeKey,
		}));
		// TODO: Save theme to API/localStorage
	};

	// Undo/Redo functionality
	const recordAction = (action: CollectionAction) => {
		setActionHistory(prev => {
			// Remove any future actions if we're not at the end
			const newHistory = prev.slice(0, historyIndex + 1);
			newHistory.push(action);

			// Limit history to 50 actions
			if (newHistory.length > 50) {
				newHistory.shift();
			}

			return newHistory;
		});
		setHistoryIndex(prev => prev + 1);
	};

	const canUndo = historyIndex >= 0 && actionHistory.length > 0;
	const canRedo = historyIndex < actionHistory.length - 1;

	const handleUndo = async () => {
		if (!canUndo) return;

		const action = actionHistory[historyIndex];

		try {
			// Revert the action
			switch (action.type) {
				case "theme_change":
					if (action.previousState?.themes) {
						setCollectionThemes(action.previousState.themes);
					}
					break;
				case "create":
					// Remove collection from API
					await apiDeleteCollection(dir, action.collectionName);
					onLoadCollections();
					break;
				case "delete":
					// Restore collection to API
					if (action.previousState?.photos) {
						await apiSetCollection(dir, action.collectionName, action.previousState.photos);
						onLoadCollections();
					}
					break;
				case "update":
					// Revert collection updates to API
					if (action.previousState?.photos) {
						await apiSetCollection(dir, action.collectionName, action.previousState.photos);
						onLoadCollections();
					}
					break;
			}

			setHistoryIndex(prev => prev - 1);
			announce(`Undid ${action.type} action on ${action.collectionName}`, "polite");
		} catch (error) {
			console.error("Undo operation failed:", error);
			announce("Failed to undo action", "assertive");
		}
	};

	const handleRedo = async () => {
		if (!canRedo) return;

		const action = actionHistory[historyIndex + 1];

		try {
			// Reapply the action
			switch (action.type) {
				case "theme_change":
					if (action.newState?.themes) {
						setCollectionThemes(action.newState.themes);
					}
					break;
				case "create":
					// Recreate collection in API
					if (action.newState?.photos) {
						await apiSetCollection(dir, action.collectionName, action.newState.photos);
						onLoadCollections();
					}
					break;
				case "delete":
					// Delete collection from API
					await apiDeleteCollection(dir, action.collectionName);
					onLoadCollections();
					break;
				case "update":
					// Reapply collection updates to API
					if (action.newState?.photos) {
						await apiSetCollection(dir, action.collectionName, action.newState.photos);
						onLoadCollections();
					}
					break;
			}

			setHistoryIndex(prev => prev + 1);
			announce(`Redid ${action.type} action on ${action.collectionName}`, "polite");
		} catch (error) {
			console.error("Redo operation failed:", error);
			announce("Failed to redo action", "assertive");
		}
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

	// Collection Insights and Analytics
	const getCollectionInsights = useMemo(() => {
		const totalCollections = Object.keys(collections).length;
		const totalPhotos = Object.values(collections).reduce((sum, photos) => sum + photos.length, 0);
		const avgPhotosPerCollection = totalCollections > 0 ? Math.round(totalPhotos / totalCollections) : 0;

		// Calculate collection sizes
		const collectionSizes = Object.entries(collections).map(([name, photos]) => ({
			name,
			count: photos.length,
			estimatedSize: photos.length * 2.5, // 2.5MB average per photo
		}));

		// Sort by size for insights
		const sortedBySizeDesc = [...collectionSizes].sort((a, b) => b.count - a.count);
		const largestCollection = sortedBySizeDesc[0];
		const smallestCollection = sortedBySizeDesc[sortedBySizeDesc.length - 1];

		// Calculate storage usage
		const totalEstimatedStorage = collectionSizes.reduce((sum, col) => sum + col.estimatedSize, 0);

		// Collection themes distribution
		const themeDistribution = Object.entries(collectionThemes).reduce((acc, [name, theme]) => {
			acc[theme] = (acc[theme] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		// Recent activity (simulated based on collection creation order)
		const recentActivity = Object.keys(collections).slice(-5).reverse();

		return {
			overview: {
				totalCollections,
				totalPhotos,
				avgPhotosPerCollection,
				totalEstimatedStorage: Math.round(totalEstimatedStorage),
			},
			collections: {
				all: collectionSizes,
				largest: largestCollection,
				smallest: smallestCollection,
				sortedBySize: sortedBySizeDesc,
			},
			themes: themeDistribution,
			recentActivity,
		};
	}, [collections, collectionThemes]);

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
			// Record action for undo/redo before deleting
			const collectionPaths = collections[collectionName] || [];
			recordAction({
				type: "delete",
				collectionName,
				timestamp: Date.now(),
				previousState: {
					photos: collectionPaths,
					themes: collectionThemes
				}
			});
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

	// Collection management handlers
	const handleRename = async (collectionName: string) => {
		const newName = prompt(`Rename collection "${collectionName}" to:`, collectionName);
		if (newName && newName.trim() && newName !== collectionName) {
			const trimmedName = newName.trim();

			// Check if name already exists
			if (collections[trimmedName]) {
				alert(`A collection named "${trimmedName}" already exists.`);
				return;
			}

			try {
				// Record action for undo/redo
				recordAction({
					type: "rename",
					collectionName,
					timestamp: Date.now(),
					previousState: {
						name: collectionName,
						newName: trimmedName,
						photos: collections[collectionName] || []
					}
				});

				// Create new collection and delete old one
				const collectionPaths = collections[collectionName] || [];
				await apiSetCollection(dir, engine, trimmedName, collectionPaths);
				await apiDeleteCollection(dir, engine, collectionName);

				// Update local state
				const updatedCollections = { ...collections };
				updatedCollections[trimmedName] = collectionPaths;
				delete updatedCollections[collectionName];

				// Transfer theme and cover settings
				const currentTheme = collectionThemes[collectionName];
				const currentCover = collectionCovers[collectionName];
				if (currentTheme) {
					setCollectionThemes(prev => {
						const updated = { ...prev };
						delete updated[collectionName];
						updated[trimmedName] = currentTheme;
						return updated;
					});
				}
				if (currentCover !== undefined) {
					setCollectionCovers(prev => {
						const updated = { ...prev };
						delete updated[collectionName];
						updated[trimmedName] = currentCover;
						return updated;
					});
				}

				if (onCollectionUpdate) {
					onCollectionUpdate(updatedCollections);
				}

				announce(`Collection renamed from "${collectionName}" to "${trimmedName}"`);
			} catch (error) {
				console.error(`Failed to rename collection ${collectionName}:`, error);
				alert(`Failed to rename collection. Please try again.`);
			}
		}
	};

	const handleDuplicate = async (collectionName: string) => {
		const baseName = `${collectionName} Copy`;
		let duplicateName = baseName;
		let counter = 1;

		// Find unique name
		while (collections[duplicateName]) {
			duplicateName = `${baseName} ${counter}`;
			counter++;
		}

		try {
			// Record action for undo/redo
			recordAction({
				type: "duplicate",
				collectionName: duplicateName,
				timestamp: Date.now(),
				previousState: {
					photos: collections[collectionName] || []
				}
			});

			const collectionPaths = collections[collectionName] || [];
			await apiSetCollection(dir, engine, duplicateName, collectionPaths);

			// Update local state
			const updatedCollections = {
				...collections,
				[duplicateName]: [...collectionPaths]
			};

			// Copy theme and cover settings
			const currentTheme = collectionThemes[collectionName];
			const currentCover = collectionCovers[collectionName];
			if (currentTheme) {
				setCollectionThemes(prev => ({
					...prev,
					[duplicateName]: currentTheme
				}));
			}
			if (currentCover !== undefined) {
				setCollectionCovers(prev => ({
					...prev,
					[duplicateName]: currentCover
				}));
			}

			if (onCollectionUpdate) {
				onCollectionUpdate(updatedCollections);
			}

			announce(`Collection "${collectionName}" duplicated as "${duplicateName}"`);
		} catch (error) {
			console.error(`Failed to duplicate collection ${collectionName}:`, error);
			alert(`Failed to duplicate collection. Please try again.`);
		}
	};

	const handleArchive = async (collectionName: string) => {
		const confirmArchive = confirm(
			`Archive collection "${collectionName}"?\n\nThis will move the collection to an archived state. You can restore it later if needed.`
		);

		if (confirmArchive) {
			try {
				// Record action for undo/redo
				recordAction({
					type: "archive",
					collectionName,
					timestamp: Date.now(),
					previousState: {
						photos: collections[collectionName] || [],
						themes: collectionThemes
					}
				});

				// For now, we'll simulate archiving by adding a prefix
				// In a real implementation, this might move to a separate archived collections store
				const archivedName = `[Archived] ${collectionName}`;
				const collectionPaths = collections[collectionName] || [];

				// Check if archived name already exists
				if (collections[archivedName]) {
					let counter = 1;
					let uniqueArchivedName = `${archivedName} (${counter})`;
					while (collections[uniqueArchivedName]) {
						counter++;
						uniqueArchivedName = `${archivedName} (${counter})`;
					}
					archivedName = uniqueArchivedName;
				}

				await apiSetCollection(dir, engine, archivedName, collectionPaths);
				await apiDeleteCollection(dir, engine, collectionName);

				// Update local state
				const updatedCollections = { ...collections };
				updatedCollections[archivedName] = collectionPaths;
				delete updatedCollections[collectionName];

				// Transfer theme settings
				const currentTheme = collectionThemes[collectionName];
				const currentCover = collectionCovers[collectionName];
				if (currentTheme) {
					setCollectionThemes(prev => {
						const updated = { ...prev };
						delete updated[collectionName];
						updated[archivedName] = currentTheme;
						return updated;
					});
				}
				if (currentCover !== undefined) {
					setCollectionCovers(prev => {
						const updated = { ...prev };
						delete updated[collectionName];
						updated[archivedName] = currentCover;
						return updated;
					});
				}

				if (onCollectionUpdate) {
					onCollectionUpdate(updatedCollections);
				}

				announce(`Collection "${collectionName}" archived as "${archivedName}"`);
			} catch (error) {
				console.error(`Failed to archive collection ${collectionName}:`, error);
				alert(`Failed to archive collection. Please try again.`);
			}
		}
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
				handleRename(collectionName);
				break;
			case "duplicate":
				handleDuplicate(collectionName);
				break;
			case "archive":
				handleArchive(collectionName);
				break;
			case "delete":
				if (onDelete) {
					// Record action for undo/redo before deleting
					const collectionPaths = collections[collectionName] || [];
					recordAction({
						type: "delete",
						collectionName,
						timestamp: Date.now(),
						previousState: {
							photos: collectionPaths,
							themes: collectionThemes
						}
					});
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

			// Record action for undo/redo
			recordAction({
				type: "create",
				collectionName: newCollectionName.trim(),
				timestamp: Date.now(),
				newState: {
					photos: selectedPhotos,
					themes: collectionThemes
				}
			});

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

						{/* Undo/Redo buttons */}
						<div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
							<button
								type="button"
								onClick={handleUndo}
								disabled={!canUndo}
								className="p-2 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Undo (Ctrl+Z)"
							>
								<Undo className="w-4 h-4" />
							</button>
							<div className="w-px bg-gray-300 h-4" />
							<button
								type="button"
								onClick={handleRedo}
								disabled={!canRedo}
								className="p-2 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
							>
								<Redo className="w-4 h-4" />
							</button>
						</div>

						{/* Collection Insights */}
						<button
							type="button"
							onClick={() => setShowInsights(true)}
							className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							title="Collection insights and analytics"
						>
							<BarChart3 className="w-4 h-4" />
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
						const collectionPaths = collections[name] || [];
						const theme = getCollectionTheme(name);
						const isFocused = focusedCollectionIndex === index;
						const isDropTarget = dragOverCollection === name;
						const isDragging = draggedItem?.type === "collection" && draggedItem.name === name;
						const isSelected = selectedCollections.has(name);

						return (
							<CollectionCard
								key={name}
								name={name}
								photos={collectionPaths}
								theme={theme}
								isFocused={isFocused}
								isDropTarget={isDropTarget}
								isDragging={isDragging}
								isSelected={isSelected}
								bulkMode={bulkMode}
								dir={dir}
								engine={engine}
								onOpen={onOpen}
								onShare={handleShare}
								onExport={handleExport}
								onDelete={onDelete}
								onSetCover={(name) => setShowCoverSelector(name)}
								onChangeTheme={(name) => setShowThemeSelector(name)}
								onToggleSelection={toggleCollectionSelection}
								onDragStart={handleCollectionDragStart}
								onDragOver={handleDragOver}
								onDragEnter={handleDragEnter}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								onContextMenu={handleContextMenu}
								onClick={() => {
									setFocusedCollectionIndex(index);
									setKeyboardNavigationActive(true);
								}}
								onRecordAction={recordAction}
								getCollectionCover={getCollectionCover}
								thumbUrl={thumbUrl}
								collectionThemes={collectionThemes}
								loadedImages={loadedImages}
								setLoadedImages={setLoadedImages}
							/>
						);
					})}
				</ul>
			)}

			<ThemeSelector
				isOpen={!!showThemeSelector}
				collectionName={showThemeSelector}
				currentTheme={showThemeSelector ? collectionThemes[showThemeSelector] || 'blue' : ''}
				themes={themes}
				onClose={() => setShowThemeSelector(null)}
				onSelectTheme={setCollectionTheme}
			/>

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

							{/* Undo/Redo */}
							<div>
								<h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
									<span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
									Undo/Redo
								</h4>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-gray-600">Undo last action</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + Z</kbd>
									</div>
									<div className="flex justify-between">
										<span className="text-gray-600">Redo action</span>
										<kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + Y</kbd>
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

			<AnalyticsModal
				isOpen={showInsights}
				onClose={() => setShowInsights(false)}
				insights={getCollectionInsights}
				collections={collections}
			/>

			<CollectionContextMenu
				contextMenu={contextMenu}
				collections={collections}
				onAction={handleContextMenuAction}
				showDelete={!!onDelete}
			/>

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

			<CoverSelector
				isOpen={!!showCoverSelector}
				collectionName={showCoverSelector}
				photos={showCoverSelector ? collections[showCoverSelector] || [] : []}
				currentCoverIndex={showCoverSelector ? collectionCovers[showCoverSelector] || 0 : 0}
				onClose={() => setShowCoverSelector(null)}
				onSelectCover={setCollectionCover}
				thumbUrl={thumbUrl}
				dir={dir}
				engine={engine}
			/>

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
