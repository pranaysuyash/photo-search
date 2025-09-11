import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
	Accessibility,
	AlertCircle,
	Bell,
	CheckCircle,
	Cloud,
	FolderOpen,
	HelpCircle,
	Loader2,
	Menu,
	Sparkles,
	Upload,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
// Import API functions from existing api.ts
import {
	apiLibrary,
	apiSearch,
	apiWorkspaceAdd,
	apiWorkspaceList,
} from "../api";
import { AccessibilityPanel } from "./AccessibilityPanel";
import AnimatedPhotoGrid from "./AnimatedPhotoGrid";
import EnhancedSearchBar from "./EnhancedSearchBar";
import { HintManager, HintProvider, useHintTriggers } from "./HintSystem";
import {
	MobileActionSheet,
	MobileOptimizations,
	MobilePhotoGrid,
	MobileSearchBar,
	MobileSidebar,
	useHapticFeedback,
	useMobileDetection,
} from "./MobileOptimizations";
import ModernLightbox from "./ModernLightbox";
import ModernSidebar from "./ModernSidebar";
import { OnboardingTour, useOnboarding } from "./OnboardingTour";

interface Photo {
	id: string;
	path: string;
	thumbnail?: string;
	fullPath?: string;
	title?: string;
	date?: string;
	location?: string;
	people?: string[];
	rating?: number;
	favorite?: boolean;
	selected?: boolean;
	width?: number;
	height?: number;
	aiScore?: number;
	tags?: string[];
}

interface ModernAppProps {
	darkMode?: boolean;
	onDarkModeToggle?: () => void;
}

const ModernApp: React.FC<ModernAppProps> = ({
	darkMode = false,
	onDarkModeToggle,
}) => {
	// Mobile detection and haptic feedback
	const { isMobile, isTablet, screenSize } = useMobileDetection();
	const { trigger: hapticTrigger } = useHapticFeedback();

	// Onboarding and hints
	const { hasCompletedTour, completeTour } = useOnboarding();
	const { triggerHint } = useHintTriggers();

	// UI state
	const [selectedView, setSelectedView] = useState("library");
	const [searchQuery, setSearchQuery] = useState("");
	const [photos, setPhotos] = useState<Photo[]>([]);
	const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
	const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notification, setNotification] = useState<{
		type: "success" | "error" | "info";
		message: string;
	} | null>(null);

	// Sidebar state
	const [showFilters, setShowFilters] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
	const [stats, setStats] = useState({
		totalPhotos: 0,
		collections: 0,
		people: 0,
		favorites: 0,
	});

	const [aiStatus, _setAiStatus] = useState({
		indexReady: false,
		fastIndexType: "FAISS",
		freeSpace: 0,
	});

	// Library management
	const [libraryPath, setLibraryPath] = useState<string | null>(null);
	const [showFolderModal, setShowFolderModal] = useState(false);
	const [_showSettingsModal, setShowSettingsModal] = useState(false);
	const [inputPath, setInputPath] = useState("");

	// New feature states
	const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);
	const [showOnboardingTour, setShowOnboardingTour] = useState(
		!hasCompletedTour,
	);
	const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
	const [selectedPhotoForActions, setSelectedPhotoForActions] =
		useState<Photo | null>(null);

	const loadWorkspace = useCallback(async () => {
		try {
			console.log("Loading workspace...");
			const workspace = await apiWorkspaceList();
			console.log("Workspace loaded:", workspace);
			// Don't auto-select a folder, let user choose
			// if (workspace.folders && workspace.folders.length > 0) {
			//   setLibraryPath(workspace.folders[0]);
			// }
		} catch (err) {
			console.error("Failed to load workspace:", err);
		}
	}, []);

	const loadLibrary = useCallback(async () => {
		if (!libraryPath) return;

		setLoading(true);
		setError(null);

		try {
			const result = await apiLibrary(libraryPath, "local", 100, 0);

			// Transform API response to Photo format
			const transformedPhotos: Photo[] = result.paths.map(
				(imgPath: string, index: number) => ({
					id: `photo-${index}`,
					path: imgPath,
					thumbnail: imgPath, // In real app, would generate thumbnails
					fullPath: imgPath,
					title: imgPath.split("/").pop()?.split(".")[0],
					date: new Date().toLocaleDateString(),
					rating: Math.floor(Math.random() * 5) + 1,
					favorite: Math.random() > 0.7,
					location: ["Paris", "Tokyo", "New York", "London"][
						Math.floor(Math.random() * 4)
					],
					tags: [
						["nature", "landscape"],
						["portrait", "people"],
						["urban", "architecture"],
						["travel", "adventure"],
					][Math.floor(Math.random() * 4)],
					people: [["John", "Jane"], ["Alice", "Bob"], [], ["Family"]][
						Math.floor(Math.random() * 4)
					],
				}),
			);

			setPhotos(transformedPhotos);
			triggerHint("library-loaded");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load library");
			console.error("Failed to load library:", err);
		} finally {
			setLoading(false);
		}
	}, [libraryPath, triggerHint]);

	// Load initial data
	useEffect(() => {
		loadWorkspace();
		// Trigger initial hints after a delay
		setTimeout(() => {
			triggerHint("app-loaded");
		}, 2000);
	}, [triggerHint, loadWorkspace]);

	// Load library when path changes
	useEffect(() => {
		if (libraryPath) {
			loadLibrary();
			triggerHint("photos-uploaded");
		}
	}, [libraryPath, triggerHint, loadLibrary]);

	// Handle mobile sidebar
	useEffect(() => {
		if (isMobile) {
			setSidebarOpen(false);
		} else {
			setSidebarOpen(true);
		}
	}, [isMobile]);

	// Trigger hints based on user actions
	useEffect(() => {
		if (photos.length > 0 && !libraryPath) {
			triggerHint("library-empty");
		}
	}, [photos.length, libraryPath, triggerHint]);

	// Filter photos based on search query
	useEffect(() => {
		if (searchQuery) {
			const filtered = photos.filter((photo) => {
				const searchLower = searchQuery.toLowerCase();
				return (
					photo.title?.toLowerCase().includes(searchLower) ||
					photo.location?.toLowerCase().includes(searchLower) ||
					photo.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
					photo.people?.some((person) =>
						person.toLowerCase().includes(searchLower),
					)
				);
			});
			setFilteredPhotos(filtered);
		} else {
			setFilteredPhotos(photos);
		}
	}, [searchQuery, photos]);

	// Update stats when photos change
	useEffect(() => {
		setStats({
			totalPhotos: photos.length,
			collections: Math.floor(photos.length / 20), // Mock calculation
			people: Array.from(new Set(photos.flatMap((p) => p.people || []))).length,
			favorites: photos.filter((p) => p.favorite).length,
		});
	}, [photos]);

	const handleSearch = async (query: string) => {
		if (!query.trim()) {
			setFilteredPhotos(photos);
			return;
		}

		setLoading(true);
		try {
			// Try AI search first
			const results = await apiSearch(libraryPath || "", query, "local", 10);

			if (results?.results) {
				const searchResultPaths = results.results.map((r: any) => r.path);
				const searchPhotos = photos.filter((p) =>
					searchResultPaths.includes(p.path),
				);
				setFilteredPhotos(searchPhotos);
				showNotification(
					"success",
					`Found ${searchPhotos.length} matching photos`,
				);

				// Trigger search success hint
				triggerHint("search-success");
			}
		} catch (err) {
			// Fallback to local search
			console.warn("AI search failed, using local search:", err);
			const filtered = photos.filter((photo) => {
				const searchLower = query.toLowerCase();
				return (
					photo.title?.toLowerCase().includes(searchLower) ||
					photo.location?.toLowerCase().includes(searchLower) ||
					photo.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
					photo.people?.some((person) =>
						person.toLowerCase().includes(searchLower),
					)
				);
			});
			setFilteredPhotos(filtered);
			showNotification(
				"info",
				`Found ${filtered.length} photos (local search)`,
			);
		} finally {
			setLoading(false);
		}
	};

	const handleSelectLibrary = () => {
		setShowFolderModal(true);
	};

	const handleAddPath = async (path: string) => {
		console.log("Adding path:", path);
		try {
			const result = await apiWorkspaceAdd(path);
			console.log("Workspace add result:", result);
			setLibraryPath(path);
			setShowFolderModal(false);
			showNotification("success", "Library path updated");
		} catch (err) {
			console.error("Failed to add path:", err);
			showNotification("error", `Failed to add library path: ${err}`);
		}
	};

	const handlePhotoClick = (_photo: Photo, index: number) => {
		setLightboxIndex(index);
		setLightboxOpen(true);
	};

	const handlePhotoSelect = (photo: Photo, selected: boolean) => {
		const newSelection = new Set(selectedPhotos);
		if (selected) {
			newSelection.add(photo.id);
		} else {
			newSelection.delete(photo.id);
		}
		setSelectedPhotos(newSelection);

		// Trigger hint for bulk selection
		if (newSelection.size > 1) {
			triggerHint("multiple-photos-selected");
		}
	};

	const handlePhotoAction = (action: string, photo: Photo) => {
		switch (action) {
			case "favorite":
				// Toggle favorite
				setPhotos((prev) =>
					prev.map((p) =>
						p.id === photo.id ? { ...p, favorite: !p.favorite } : p,
					),
				);
				hapticTrigger("light");
				break;
			case "rate": {
				// Update rating
				const { rating } = photo as any;
				setPhotos((prev) =>
					prev.map((p) => (p.id === photo.id ? { ...p, rating } : p)),
				);
				break;
			}
			case "delete":
				// Delete photo
				setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
				showNotification("info", "Photo deleted");
				hapticTrigger("medium");
				break;
			case "share":
				// Handle share action
				if (navigator.share && isMobile) {
					navigator.share({
						title: photo.title || "Photo",
						url: photo.fullPath,
					});
				} else {
					setSelectedPhotoForActions(photo);
					setShowMobileActionSheet(true);
				}
				break;
			case "clearSelection":
				setSelectedPhotos(new Set());
				break;
			default:
				console.log(`Action ${action} on photo ${photo.id}`);
		}
	};

	// New handlers for enhanced features
	const handleAccessibilitySettingsChange = (settings: any) => {
		// Apply accessibility settings to the app
		console.log("Accessibility settings changed:", settings);
	};

	const handleOnboardingComplete = () => {
		setShowOnboardingTour(false);
		completeTour();
		showNotification("success", "Welcome to Photo Search! 🎉");
	};

	const handleSwipeLeft = () => {
		// Navigate to next photo in lightbox or next view
		if (lightboxOpen) {
			setLightboxIndex((prev) => Math.min(prev + 1, displayPhotos.length - 1));
		}
	};

	const handleSwipeRight = () => {
		// Navigate to previous photo in lightbox or previous view
		if (lightboxOpen) {
			setLightboxIndex((prev) => Math.max(prev - 1, 0));
		}
	};

	const handlePullToRefresh = async () => {
		if (libraryPath) {
			await loadLibrary();
			showNotification("success", "Library refreshed");
		}
	};

	const handleMobilePhotoLongPress = (photo: Photo) => {
		setSelectedPhotoForActions(photo);
		setShowMobileActionSheet(true);
		hapticTrigger("medium");
	};

	const showNotification = (
		type: "success" | "error" | "info",
		message: string,
	) => {
		setNotification({ type, message });
		setTimeout(() => setNotification(null), 3000);
	};

	const displayPhotos = searchQuery
		? filteredPhotos
		: selectedView === "library"
			? photos
			: selectedView === "memories"
				? photos.filter((p) => p.favorite)
				: selectedView === "people"
					? photos.filter((p) => p.people && p.people.length > 0)
					: photos;

	return (
		<HintProvider>
			<HintManager>
				<MobileOptimizations
					onSwipeLeft={handleSwipeLeft}
					onSwipeRight={handleSwipeRight}
					onSwipeUp={() => setSidebarOpen(!sidebarOpen)}
					enableSwipeGestures={isMobile}
					enablePullToRefresh={true}
					onPullToRefresh={handlePullToRefresh}
				>
					<div
						className={clsx("flex h-screen bg-gray-50 dark:bg-gray-900", {
							dark: darkMode,
						})}
					>
						{/* Mobile Sidebar */}
						{isMobile ? (
							<MobileSidebar
								isOpen={sidebarOpen}
								onClose={() => setSidebarOpen(false)}
								position="left"
							>
								<ModernSidebar
									selectedView={selectedView}
									onViewChange={setSelectedView}
									stats={stats}
									aiStatus={aiStatus}
									darkMode={darkMode}
									onDarkModeToggle={onDarkModeToggle}
									onSettingsClick={() => setShowSettingsModal(true)}
									onSelectLibrary={handleSelectLibrary}
								/>
							</MobileSidebar>
						) : (
							/* Desktop Sidebar */
							<ModernSidebar
								selectedView={selectedView}
								onViewChange={setSelectedView}
								stats={stats}
								aiStatus={aiStatus}
								darkMode={darkMode}
								onDarkModeToggle={onDarkModeToggle}
								onSettingsClick={() => setShowSettingsModal(true)}
								onSelectLibrary={handleSelectLibrary}
							/>
						)}

						{/* Main Content */}
						<div className="flex-1 flex flex-col overflow-hidden">
							{/* Header */}
							<header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-4 md:px-8 py-4 md:py-6">
								<div className="flex items-center justify-between">
									{/* Mobile menu button */}
									{isMobile && (
										<button
											type="button"
											onClick={() => setSidebarOpen(true)}
											className="p-2 mr-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
											aria-label="Open menu"
										>
											<Menu className="w-5 h-5" />
										</button>
									)}

									{/* Search Bar */}
									{isMobile ? (
										<MobileSearchBar
											value={searchQuery}
											onChange={setSearchQuery}
											onSubmit={handleSearch}
											placeholder="Search photos..."
											enableVoiceSearch={true}
										/>
									) : (
										<EnhancedSearchBar
											value={searchQuery}
											onChange={setSearchQuery}
											onSearch={handleSearch}
											onFilterClick={() => setShowFilters(!showFilters)}
											showFilters={showFilters}
											isSearching={loading}
											className="flex-1 max-w-3xl"
										/>
									)}

									{/* Action Buttons */}
									<div className="flex items-center gap-2 md:gap-4 ml-4">
										{/* Accessibility Button */}
										<motion.button
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											onClick={() => setShowAccessibilityPanel(true)}
											className="p-2 md:p-3 bg-gray-100 dark:bg-gray-800 rounded-lg md:rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
											aria-label="Accessibility settings"
											data-tour="accessibility-button"
										>
											<Accessibility className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
										</motion.button>

										{/* Help/Tour Button */}
										<motion.button
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											onClick={() => setShowOnboardingTour(true)}
											className="p-2 md:p-3 bg-gray-100 dark:bg-gray-800 rounded-lg md:rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
											aria-label="Help and onboarding"
										>
											<HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
										</motion.button>

										{/* Notifications */}
										<motion.button
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											className="p-2 md:p-3 bg-gray-100 dark:bg-gray-800 rounded-lg md:rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
										>
											<Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
										</motion.button>

										{/* Import Button */}
										<motion.button
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											onClick={handleSelectLibrary}
											className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg md:rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25 font-medium"
											data-tour="upload-button"
										>
											<Upload className="w-4 h-4 md:w-5 md:h-5" />
											<span className="hidden md:inline">Import</span>
										</motion.button>
									</div>
								</div>
							</header>

							{/* Content Area */}
							<main className="flex-1 overflow-auto p-8">
								{loading && (
									<div className="flex items-center justify-center h-64">
										<motion.div
											animate={{ rotate: 360 }}
											transition={{
												duration: 1,
												repeat: Infinity,
												ease: "linear",
											}}
										>
											<Loader2 className="w-12 h-12 text-blue-500" />
										</motion.div>
									</div>
								)}

								{error && (
									<div className="flex flex-col items-center justify-center h-64 text-gray-500">
										<AlertCircle className="w-16 h-16 mb-4 text-red-500" />
										<p className="text-lg">{error}</p>
									</div>
								)}

								{!loading && !error && displayPhotos.length === 0 && (
									<div className="flex flex-col items-center justify-center h-64 text-gray-500">
										<FolderOpen className="w-16 h-16 mb-4" />
										<p className="text-lg mb-2">No photos found</p>
										<p className="text-sm text-gray-400 mb-4 text-center max-w-md">
											{libraryPath
												? "No photos were found in the selected folder. Try selecting a different folder or check that your photos are in common formats like JPEG, PNG, or TIFF."
												: "Select a photo library folder to get started. We'll analyze your photos to make them searchable by content, people, and locations."}
										</p>
										<button
											type="button"
											onClick={handleSelectLibrary}
											className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25 font-medium"
											aria-label="Select photo library folder"
										>
											{libraryPath
												? "Select Different Folder"
												: "Select Library Folder"}
										</button>
									</div>
								)}

								{!loading &&
									!error &&
									displayPhotos.length > 0 &&
									(isMobile ? (
										<MobilePhotoGrid
											photos={displayPhotos.map((photo) => ({
												id: photo.id,
												src: photo.thumbnail || photo.fullPath || "",
												alt: photo.title || "Photo",
											}))}
											onPhotoClick={(photoData) => {
												const photo = displayPhotos.find(
													(p) => p.id === photoData.id,
												);
												if (photo) {
													const index = displayPhotos.indexOf(photo);
													handlePhotoClick(photo, index);
												}
											}}
											onPhotoLongPress={handleMobilePhotoLongPress}
											selectedPhotos={Array.from(selectedPhotos)}
											onSelectionChange={(selected) =>
												setSelectedPhotos(new Set(selected))
											}
										/>
									) : (
										<AnimatedPhotoGrid
											photos={displayPhotos}
											onPhotoClick={handlePhotoClick}
											onPhotoSelect={handlePhotoSelect}
											onPhotoAction={handlePhotoAction}
											selectedPhotos={selectedPhotos}
											viewMode="grid"
											gridSize="medium"
											showMetadata={true}
											enableSelection={true}
											enableHover={true}
										/>
									))}
							</main>
						</div>

						{/* Lightbox */}
						<ModernLightbox
							isOpen={lightboxOpen}
							onClose={() => setLightboxOpen(false)}
							photos={displayPhotos}
							currentIndex={lightboxIndex}
							onNavigate={setLightboxIndex}
							onPhotoAction={handlePhotoAction}
							enableZoom={true}
							enableRotation={true}
							showThumbnails={true}
							showInfo={true}
						/>

						{/* Folder Selection Modal */}
						<AnimatePresence>
							{showFolderModal && (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
									onClick={() => setShowFolderModal(false)}
								>
									<motion.div
										initial={{ scale: 0.9, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										exit={{ scale: 0.9, opacity: 0 }}
										onClick={(e) => e.stopPropagation()}
										className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full"
									>
										<h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
											Select Library Folder
										</h2>
										<p className="text-gray-600 dark:text-gray-400 mb-6">
											Choose a folder containing your photos
										</p>

										{/* Native folder picker for Electron */}
										{(window as any).electronAPI && (
											<button
												type="button"
												onClick={async () => {
													try {
														const selectedPath = await (
															window as any
														).electronAPI.selectFolder();
														if (selectedPath) {
															setInputPath(selectedPath);
														}
													} catch (err) {
														console.error("Failed to select folder:", err);
													}
												}}
												className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
											>
												<FolderOpen className="w-5 h-5" />
												Browse for Folder
											</button>
										)}

										<input
											type="text"
											value={inputPath}
											onChange={(e) => setInputPath(e.target.value)}
											placeholder="/path/to/photos"
											className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
											onKeyDown={(e) => {
												if (e.key === "Enter" && inputPath) {
													handleAddPath(inputPath);
												}
											}}
											onPaste={(e) => {
												// Ensure paste works properly
												e.stopPropagation();
											}}
										/>

										<div className="flex gap-3 mt-6">
											<button
												type="button"
												onClick={() => {
													setShowFolderModal(false);
													setInputPath("");
												}}
												className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
											>
												Cancel
											</button>
											<button
												type="button"
												onClick={() => {
													if (inputPath) {
														handleAddPath(inputPath);
														setInputPath("");
													}
												}}
												className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
											>
												Select Folder
											</button>
										</div>
									</motion.div>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Notifications */}
						<AnimatePresence>
							{notification && (
								<motion.div
									initial={{ opacity: 0, y: -50, x: "-50%" }}
									animate={{ opacity: 1, y: 0, x: "-50%" }}
									exit={{ opacity: 0, y: -50, x: "-50%" }}
									className={clsx(
										"fixed top-8 left-1/2 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3",
										{
											"bg-green-500 text-white":
												notification.type === "success",
											"bg-red-500 text-white": notification.type === "error",
											"bg-blue-500 text-white": notification.type === "info",
										},
									)}
								>
									{notification.type === "success" && (
										<CheckCircle className="w-5 h-5" />
									)}
									{notification.type === "error" && (
										<AlertCircle className="w-5 h-5" />
									)}
									{notification.type === "info" && (
										<Sparkles className="w-5 h-5" />
									)}
									<span className="font-medium">{notification.message}</span>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Enhanced Components */}
					<AccessibilityPanel
						isOpen={showAccessibilityPanel}
						onClose={() => setShowAccessibilityPanel(false)}
						onSettingsChange={handleAccessibilitySettingsChange}
					/>

					<OnboardingTour
						isActive={showOnboardingTour}
						onComplete={handleOnboardingComplete}
						onSkip={() => setShowOnboardingTour(false)}
						userActions={[]}
					/>

					<MobileActionSheet
						isOpen={showMobileActionSheet}
						onClose={() => setShowMobileActionSheet(false)}
						title="Photo Actions"
						actions={[
							{
								label: "Share",
								icon: <Cloud className="w-5 h-5" />,
								onClick: () => {
									if (selectedPhotoForActions && navigator.share) {
										navigator.share({
											title: selectedPhotoForActions.title || "Photo",
											url: selectedPhotoForActions.fullPath,
										});
									}
								},
							},
							{
								label: "Download",
								icon: <FolderOpen className="w-5 h-5" />,
								onClick: () => {
									if (selectedPhotoForActions) {
										// Handle download
										console.log("Download:", selectedPhotoForActions);
									}
								},
							},
							{
								label: "Delete",
								icon: <AlertCircle className="w-5 h-5" />,
								onClick: () => {
									if (selectedPhotoForActions) {
										handlePhotoAction("delete", selectedPhotoForActions);
									}
								},
								destructive: true,
							},
						]}
					/>
				</MobileOptimizations>
			</HintManager>
		</HintProvider>
	);
};

export default ModernApp;
