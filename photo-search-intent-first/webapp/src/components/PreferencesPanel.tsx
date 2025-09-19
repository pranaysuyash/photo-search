import {
	Bell,
	Database,
	Eye,
	Keyboard,
	Moon,
	Settings,
	Shield,
	Sun,
	X,
} from "lucide-react";
import { useState } from "react";
import {
	useEnableDemoLibrary,
	useSettingsActions,
} from "../stores/settingsStore";

interface PreferencesPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

export function PreferencesPanel({ isOpen, onClose }: PreferencesPanelProps) {
	const [activeTab, setActiveTab] = useState("general");

	// Get demo library setting and actions
	const enableDemoLibrary = useEnableDemoLibrary();
	const { setEnableDemoLibrary } = useSettingsActions();

	// Preferences state
	const [preferences, setPreferences] = useState({
		// General
		theme: localStorage.getItem("theme") || "system",
		language: "en",
		dateFormat: "MM/DD/YYYY",

		// Display
		gridSize: "medium",
		showMetadata: true,
		autoplaySpeed: 3,
		imageQuality: "high",

		// Privacy
		analytics: true,
		crashReports: true,
		saveHistory: true,

		// Notifications
		desktopNotifications: false,
		soundEnabled: false,

		// Performance
		enableCache: true,
		preloadImages: true,
		reducedMotion: false,

		// Accessibility
		highContrast: false,
		largeText: false,
		keyboardShortcuts: true,
	});

	const updatePreference = (key: string, value: unknown) => {
		setPreferences((prev) => ({
			...prev,
			[key]: value,
		}));

		// Save to localStorage
		localStorage.setItem(`pref_${key}`, JSON.stringify(value));

		// Apply immediate changes
		if (key === "theme") {
			applyTheme(value as string);
		}
	};

	const applyTheme = (theme: string) => {
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else if (theme === "light") {
			root.classList.remove("dark");
		} else {
			// System preference
			const prefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			root.classList.toggle("dark", prefersDark);
		}
	};

	const tabs = [
		{ id: "general", label: "General", icon: Settings },
		{ id: "display", label: "Display", icon: Eye },
		{ id: "privacy", label: "Privacy", icon: Shield },
		{ id: "notifications", label: "Notifications", icon: Bell },
		{ id: "performance", label: "Performance", icon: Database },
		{ id: "accessibility", label: "Accessibility", icon: Keyboard },
	];

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						Preferences
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
						title="Close preferences"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="flex h-[60vh]">
					{/* Sidebar */}
					<div className="w-48 border-r dark:border-gray-700 p-4">
						{tabs.map((tab) => (
							<button
								type="button"
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
									activeTab === tab.id
										? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
										: "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
								}`}
							>
								<tab.icon className="w-4 h-4" />
								<span className="text-sm font-medium">{tab.label}</span>
							</button>
						))}
					</div>

					{/* Content */}
					<div className="flex-1 p-6 overflow-y-auto">
						{activeTab === "general" && (
							<div className="space-y-6">
								<div>
									<h3 className="text-lg font-semibold mb-4">
										General Settings
									</h3>

									<div className="space-y-4">
										<div>
											<span className="block text-sm font-medium mb-2">
												Theme
											</span>
											<div className="flex gap-2">
												{["light", "dark", "system"].map((theme) => (
													<button
														type="button"
														key={theme}
														onClick={() => updatePreference("theme", theme)}
														className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
															preferences.theme === theme
																? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
																: "border-gray-300 dark:border-gray-600"
														}`}
														title={`Switch to ${theme} theme`}
													>
														{theme === "light" && <Sun className="w-4 h-4" />}
														{theme === "dark" && <Moon className="w-4 h-4" />}
														{theme === "system" && (
															<Settings className="w-4 h-4" />
														)}
														<span className="capitalize">{theme}</span>
													</button>
												))}
											</div>
										</div>

										<div>
											<label
												htmlFor="language-select"
												className="block text-sm font-medium mb-2"
											>
												Language
											</label>
											<select
												id="language-select"
												value={preferences.language}
												onChange={(e) =>
													updatePreference("language", e.target.value)
												}
												className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
												title="Select language"
											>
												<option value="en">English</option>
												<option value="es">Español</option>
												<option value="fr">Français</option>
												<option value="de">Deutsch</option>
												<option value="ja">日本語</option>
											</select>
										</div>

										<div>
											<span className="block text-sm font-medium mb-2">
												Date Format
											</span>
											<select
												value={preferences.dateFormat}
												onChange={(e) =>
													updatePreference("dateFormat", e.target.value)
												}
												className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
												title="Select date format"
											>
												<option value="MM/DD/YYYY">MM/DD/YYYY</option>
												<option value="DD/MM/YYYY">DD/MM/YYYY</option>
												<option value="YYYY-MM-DD">YYYY-MM-DD</option>
											</select>
										</div>

										<div>
											<label className="flex items-center gap-3">
												<input
													type="checkbox"
													checked={enableDemoLibrary}
													onChange={(e) =>
														setEnableDemoLibrary?.(e.target.checked)
													}
													className="rounded"
												/>
												<div>
													<div className="text-sm font-medium">
														Enable Demo Library
													</div>
													<div className="text-xs text-gray-500">
														Automatically load demo photos when no directory is
														selected
													</div>
												</div>
											</label>
										</div>
									</div>
								</div>
							</div>
						)}

						{activeTab === "display" && (
							<div className="space-y-6">
								<h3 className="text-lg font-semibold mb-4">Display Settings</h3>

								<div className="space-y-4">
									<div>
										<span className="block text-sm font-medium mb-2">
											Grid Size
										</span>
										<div className="flex gap-2">
											{["small", "medium", "large"].map((size) => (
												<button
													type="button"
													key={size}
													onClick={() => updatePreference("gridSize", size)}
													className={`px-4 py-2 rounded-lg border capitalize ${
														preferences.gridSize === size
															? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
															: "border-gray-300 dark:border-gray-600"
													}`}
													title={`Set grid size to ${size}`}
												>
													{size}
												</button>
											))}
										</div>
									</div>

									<div>
										<label className="flex items-center gap-3">
											<input
												type="checkbox"
												checked={preferences.showMetadata}
												onChange={(e) =>
													updatePreference("showMetadata", e.target.checked)
												}
												className="rounded"
											/>
											<span className="text-sm">
												Show photo metadata overlay
											</span>
										</label>
									</div>

									<div>
										<label
											htmlFor="slideshow-speed"
											className="block text-sm font-medium mb-2"
										>
											Slideshow Speed: {preferences.autoplaySpeed}s
										</label>
										<input
											id="slideshow-speed"
											type="range"
											min="1"
											max="10"
											value={preferences.autoplaySpeed}
											onChange={(e) =>
												updatePreference(
													"autoplaySpeed",
													Number(e.target.value),
												)
											}
											className="w-full"
											title="Adjust slideshow speed"
										/>
									</div>

									<div>
										<label
											htmlFor="image-quality"
											className="block text-sm font-medium mb-2"
										>
											Image Quality
										</label>
										<select
											id="image-quality"
											value={preferences.imageQuality}
											onChange={(e) =>
												updatePreference("imageQuality", e.target.value)
											}
											className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
											title="Select image quality"
										>
											<option value="low">Low (faster loading)</option>
											<option value="medium">Medium</option>
											<option value="high">High (best quality)</option>
										</select>
									</div>
								</div>
							</div>
						)}

						{activeTab === "privacy" && (
							<div className="space-y-6">
								<h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>

								<div className="space-y-4">
									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.analytics}
											onChange={(e) =>
												updatePreference("analytics", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">Usage Analytics</div>
											<div className="text-xs text-gray-500">
												Help improve PhotoVault by sharing anonymous usage data
											</div>
										</div>
									</label>

									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.crashReports}
											onChange={(e) =>
												updatePreference("crashReports", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">Crash Reports</div>
											<div className="text-xs text-gray-500">
												Automatically send crash reports to help fix issues
											</div>
										</div>
									</label>

									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.saveHistory}
											onChange={(e) =>
												updatePreference("saveHistory", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">Search History</div>
											<div className="text-xs text-gray-500">
												Save search history for suggestions
											</div>
										</div>
									</label>

									<button
										type="button"
										className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
										title="Clear all stored data"
									>
										Clear All Data
									</button>
								</div>
							</div>
						)}

						{activeTab === "notifications" && (
							<div className="space-y-6">
								<h3 className="text-lg font-semibold mb-4">
									Notification Settings
								</h3>

								<div className="space-y-4">
									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.desktopNotifications}
											onChange={(e) =>
												updatePreference(
													"desktopNotifications",
													e.target.checked,
												)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">
												Desktop Notifications
											</div>
											<div className="text-xs text-gray-500">
												Show system notifications for important events
											</div>
										</div>
									</label>

									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.soundEnabled}
											onChange={(e) =>
												updatePreference("soundEnabled", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">Sound Effects</div>
											<div className="text-xs text-gray-500">
												Play sounds for actions and notifications
											</div>
										</div>
									</label>
								</div>
							</div>
						)}

						{activeTab === "performance" && (
							<div className="space-y-6">
								<h3 className="text-lg font-semibold mb-4">
									Performance Settings
								</h3>

								<div className="space-y-4">
									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.enableCache}
											onChange={(e) =>
												updatePreference("enableCache", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">Enable Caching</div>
											<div className="text-xs text-gray-500">
												Cache images for faster loading
											</div>
										</div>
									</label>

									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.preloadImages}
											onChange={(e) =>
												updatePreference("preloadImages", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">Preload Images</div>
											<div className="text-xs text-gray-500">
												Load nearby images in advance
											</div>
										</div>
									</label>

									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.reducedMotion}
											onChange={(e) =>
												updatePreference("reducedMotion", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">Reduce Motion</div>
											<div className="text-xs text-gray-500">
												Minimize animations and transitions
											</div>
										</div>
									</label>

									<button
										type="button"
										className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
										title="Clear cached data"
									>
										Clear Cache
									</button>
								</div>
							</div>
						)}

						{activeTab === "accessibility" && (
							<div className="space-y-6">
								<h3 className="text-lg font-semibold mb-4">
									Accessibility Settings
								</h3>

								<div className="space-y-4">
									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.highContrast}
											onChange={(e) =>
												updatePreference("highContrast", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">
												High Contrast Mode
											</div>
											<div className="text-xs text-gray-500">
												Increase contrast for better visibility
											</div>
										</div>
									</label>

									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.largeText}
											onChange={(e) =>
												updatePreference("largeText", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">Large Text</div>
											<div className="text-xs text-gray-500">
												Increase text size throughout the app
											</div>
										</div>
									</label>

									<label className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={preferences.keyboardShortcuts}
											onChange={(e) =>
												updatePreference("keyboardShortcuts", e.target.checked)
											}
											className="rounded"
										/>
										<div>
											<div className="text-sm font-medium">
												Keyboard Shortcuts
											</div>
											<div className="text-xs text-gray-500">
												Enable keyboard navigation and shortcuts
											</div>
										</div>
									</label>

									<button
										type="button"
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
										title="View keyboard shortcuts guide"
									>
										View Shortcuts Guide
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex justify-between">
					<button
						type="button"
						className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
						title="Reset all preferences to defaults"
					>
						Reset to Defaults
					</button>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
							title="Cancel changes"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
							title="Save preference changes"
						>
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
