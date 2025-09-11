import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
	AlertTriangle,
	CheckCircle,
	Contrast,
	Eye,
	Info,
	Keyboard,
	Monitor,
	Type,
	Volume2,
	VolumeX,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AccessibilityPanelProps {
	isOpen: boolean;
	onClose: () => void;
	onSettingsChange?: (settings: AccessibilitySettings) => void;
}

export interface AccessibilitySettings {
	highContrast: boolean;
	largeText: boolean;
	reducedMotion: boolean;
	screenReader: boolean;
	keyboardNavigation: boolean;
	focusIndicators: boolean;
	colorBlindFriendly: boolean;
	fontSize: "small" | "medium" | "large" | "xlarge";
	theme: "light" | "dark" | "auto";
}

const defaultSettings: AccessibilitySettings = {
	highContrast: false,
	largeText: false,
	reducedMotion: false,
	screenReader: false,
	keyboardNavigation: true,
	focusIndicators: true,
	colorBlindFriendly: false,
	fontSize: "medium",
	theme: "auto",
};

export function AccessibilityPanel({
	isOpen,
	onClose,
	onSettingsChange,
}: AccessibilityPanelProps) {
	const [settings, setSettings] =
		useState<AccessibilitySettings>(defaultSettings);
	const [activeTab, setActiveTab] = useState<
		"vision" | "motor" | "cognitive" | "general"
	>("general");

	// Load settings from localStorage on mount
	useEffect(() => {
		const saved = localStorage.getItem("accessibility-settings");
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				setSettings({ ...defaultSettings, ...parsed });
			} catch (e) {
				console.warn("Failed to parse accessibility settings:", e);
			}
		}
	}, []);

	// Save settings to localStorage and notify parent
	const updateSetting = <K extends keyof AccessibilitySettings>(
		key: K,
		value: AccessibilitySettings[K],
	) => {
		const newSettings = { ...settings, [key]: value };
		setSettings(newSettings);
		localStorage.setItem("accessibility-settings", JSON.stringify(newSettings));
		onSettingsChange?.(newSettings);

		// Apply immediate changes
		applyAccessibilitySettings(newSettings);
	};

	// Apply accessibility settings to the document
	const applyAccessibilitySettings = (settings: AccessibilitySettings) => {
		const root = document.documentElement;

		// High contrast
		if (settings.highContrast) {
			root.setAttribute("data-high-contrast", "true");
		} else {
			root.removeAttribute("data-high-contrast");
		}

		// Large text
		root.setAttribute("data-font-size", settings.fontSize);

		// Reduced motion
		if (settings.reducedMotion) {
			root.setAttribute("data-reduced-motion", "true");
		} else {
			root.removeAttribute("data-reduced-motion");
		}

		// Focus indicators
		if (settings.focusIndicators) {
			root.setAttribute("data-focus-visible", "true");
		} else {
			root.removeAttribute("data-focus-visible");
		}

		// Color blind friendly
		if (settings.colorBlindFriendly) {
			root.setAttribute("data-color-blind", "true");
		} else {
			root.removeAttribute("data-color-blind");
		}

		// Theme
		root.setAttribute("data-theme", settings.theme);
	};

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isOpen) return;

			// Escape to close
			if (e.key === "Escape") {
				onClose();
				return;
			}

			// Tab navigation
			if (e.key === "Tab") {
				e.preventDefault();
				// Handle tab navigation within the panel
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const tabs = [
		{ id: "general", label: "General", icon: Monitor },
		{ id: "vision", label: "Vision", icon: Eye },
		{ id: "motor", label: "Motor", icon: Keyboard },
		{ id: "cognitive", label: "Cognitive", icon: Volume2 },
	];

	const renderGeneralTab = () => (
		<div className="space-y-6">
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					General Settings
				</h3>

				{/* Theme */}
				<div className="space-y-3">
					<label className="flex items-center justify-between">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Theme
						</span>
						<select
							value={settings.theme}
							onChange={(e) => updateSetting("theme", e.target.value as any)}
							className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
						>
							<option value="auto">Auto</option>
							<option value="light">Light</option>
							<option value="dark">Dark</option>
						</select>
					</label>
				</div>

				{/* Font Size */}
				<div className="space-y-3">
					<label className="flex items-center justify-between">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Font Size
						</span>
						<select
							value={settings.fontSize}
							onChange={(e) => updateSetting("fontSize", e.target.value as any)}
							className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
						>
							<option value="small">Small</option>
							<option value="medium">Medium</option>
							<option value="large">Large</option>
							<option value="xlarge">Extra Large</option>
						</select>
					</label>
				</div>

				{/* Reduced Motion */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<VolumeX className="w-5 h-5 text-gray-500" />
						<div>
							<div className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Reduced Motion
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								Minimize animations and transitions
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() =>
							updateSetting("reducedMotion", !settings.reducedMotion)
						}
						className={clsx(
							"relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
							settings.reducedMotion
								? "bg-blue-600"
								: "bg-gray-200 dark:bg-gray-700",
						)}
						aria-pressed={settings.reducedMotion}
					>
						<span
							className={clsx(
								"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
								settings.reducedMotion ? "translate-x-6" : "translate-x-1",
							)}
						/>
					</button>
				</div>
			</div>
		</div>
	);

	const renderVisionTab = () => (
		<div className="space-y-6">
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					Vision & Display
				</h3>

				{/* High Contrast */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Contrast className="w-5 h-5 text-gray-500" />
						<div>
							<div className="text-sm font-medium text-gray-700 dark:text-gray-300">
								High Contrast
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								Increase contrast for better visibility
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() =>
							updateSetting("highContrast", !settings.highContrast)
						}
						className={clsx(
							"relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
							settings.highContrast
								? "bg-blue-600"
								: "bg-gray-200 dark:bg-gray-700",
						)}
						aria-pressed={settings.highContrast}
					>
						<span
							className={clsx(
								"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
								settings.highContrast ? "translate-x-6" : "translate-x-1",
							)}
						/>
					</button>
				</div>

				{/* Large Text */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Type className="w-5 h-5 text-gray-500" />
						<div>
							<div className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Large Text
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								Increase text size throughout the app
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() => updateSetting("largeText", !settings.largeText)}
						className={clsx(
							"relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
							settings.largeText
								? "bg-blue-600"
								: "bg-gray-200 dark:bg-gray-700",
						)}
						aria-pressed={settings.largeText}
					>
						<span
							className={clsx(
								"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
								settings.largeText ? "translate-x-6" : "translate-x-1",
							)}
						/>
					</button>
				</div>

				{/* Color Blind Friendly */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Eye className="w-5 h-5 text-gray-500" />
						<div>
							<div className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Color Blind Friendly
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								Use patterns and shapes instead of colors
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() =>
							updateSetting("colorBlindFriendly", !settings.colorBlindFriendly)
						}
						className={clsx(
							"relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
							settings.colorBlindFriendly
								? "bg-blue-600"
								: "bg-gray-200 dark:bg-gray-700",
						)}
						aria-pressed={settings.colorBlindFriendly}
					>
						<span
							className={clsx(
								"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
								settings.colorBlindFriendly ? "translate-x-6" : "translate-x-1",
							)}
						/>
					</button>
				</div>
			</div>
		</div>
	);

	const renderMotorTab = () => (
		<div className="space-y-6">
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					Motor & Dexterity
				</h3>

				{/* Keyboard Navigation */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Keyboard className="w-5 h-5 text-gray-500" />
						<div>
							<div className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Keyboard Navigation
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								Navigate using keyboard shortcuts
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() =>
							updateSetting("keyboardNavigation", !settings.keyboardNavigation)
						}
						className={clsx(
							"relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
							settings.keyboardNavigation
								? "bg-blue-600"
								: "bg-gray-200 dark:bg-gray-700",
						)}
						aria-pressed={settings.keyboardNavigation}
					>
						<span
							className={clsx(
								"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
								settings.keyboardNavigation ? "translate-x-6" : "translate-x-1",
							)}
						/>
					</button>
				</div>

				{/* Focus Indicators */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-5 h-5 rounded-full border-2 border-gray-500 flex items-center justify-center">
							<div className="w-2 h-2 bg-gray-500 rounded-full" />
						</div>
						<div>
							<div className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Focus Indicators
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								Show visible focus outlines
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() =>
							updateSetting("focusIndicators", !settings.focusIndicators)
						}
						className={clsx(
							"relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
							settings.focusIndicators
								? "bg-blue-600"
								: "bg-gray-200 dark:bg-gray-700",
						)}
						aria-pressed={settings.focusIndicators}
					>
						<span
							className={clsx(
								"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
								settings.focusIndicators ? "translate-x-6" : "translate-x-1",
							)}
						/>
					</button>
				</div>
			</div>

			{/* Keyboard Shortcuts */}
			<div className="space-y-3">
				<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Keyboard Shortcuts
				</h4>
				<div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
					<div className="flex justify-between">
						<span>Open search</span>
						<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
							Ctrl+K
						</kbd>
					</div>
					<div className="flex justify-between">
						<span>Focus sidebar</span>
						<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
							Ctrl+B
						</kbd>
					</div>
					<div className="flex justify-between">
						<span>Select all</span>
						<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
							Ctrl+A
						</kbd>
					</div>
					<div className="flex justify-between">
						<span>Delete selected</span>
						<kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
							Delete
						</kbd>
					</div>
				</div>
			</div>
		</div>
	);

	const renderCognitiveTab = () => (
		<div className="space-y-6">
			<div className="space-y-4">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					Cognitive Support
				</h3>

				{/* Screen Reader Support */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Volume2 className="w-5 h-5 text-gray-500" />
						<div>
							<div className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Screen Reader Support
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								Optimize for screen readers
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={() =>
							updateSetting("screenReader", !settings.screenReader)
						}
						className={clsx(
							"relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
							settings.screenReader
								? "bg-blue-600"
								: "bg-gray-200 dark:bg-gray-700",
						)}
						aria-pressed={settings.screenReader}
					>
						<span
							className={clsx(
								"inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
								settings.screenReader ? "translate-x-6" : "translate-x-1",
							)}
						/>
					</button>
				</div>
			</div>

			{/* Accessibility Tips */}
			<div className="space-y-3">
				<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Accessibility Tips
				</h4>
				<div className="space-y-3">
					<div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-blue-800 dark:text-blue-200">
							Use high contrast mode if text is hard to read
						</div>
					</div>
					<div className="flex gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
						<CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-green-800 dark:text-green-200">
							Enable keyboard navigation for faster browsing
						</div>
					</div>
					<div className="flex gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
						<AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-yellow-800 dark:text-yellow-200">
							Reduced motion helps with vestibular disorders
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
						onClick={onClose}
						aria-hidden="true"
					/>

					{/* Panel */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
						role="dialog"
						aria-modal="true"
						aria-labelledby="accessibility-title"
					>
						{/* Header */}
						<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
							<h2
								id="accessibility-title"
								className="text-xl font-semibold text-gray-900 dark:text-white"
							>
								Accessibility Settings
							</h2>
							<button
								type="button"
								onClick={onClose}
								className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
								aria-label="Close accessibility panel"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Tabs */}
						<div className="flex border-b border-gray-200 dark:border-gray-700">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										type="button"
										key={tab.id}
										onClick={() => setActiveTab(tab.id as any)}
										className={clsx(
											"flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
											activeTab === tab.id
												? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
												: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
										)}
										aria-pressed={activeTab === tab.id}
									>
										<Icon className="w-4 h-4" />
										<span className="hidden sm:inline">{tab.label}</span>
									</button>
								);
							})}
						</div>

						{/* Content */}
						<div className="p-6 max-h-96 overflow-y-auto">
							{activeTab === "general" && renderGeneralTab()}
							{activeTab === "vision" && renderVisionTab()}
							{activeTab === "motor" && renderMotorTab()}
							{activeTab === "cognitive" && renderCognitiveTab()}
						</div>

						{/* Footer */}
						<div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
							<div className="text-sm text-gray-600 dark:text-gray-400">
								Settings are saved automatically
							</div>
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
							>
								Done
							</button>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

// Hook for using accessibility settings
export function useAccessibilitySettings() {
	const [settings, setSettings] =
		useState<AccessibilitySettings>(defaultSettings);

	useEffect(() => {
		const saved = localStorage.getItem("accessibility-settings");
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				setSettings({ ...defaultSettings, ...parsed });
			} catch (e) {
				console.warn("Failed to parse accessibility settings:", e);
			}
		}
	}, []);

	const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
		const updated = { ...settings, ...newSettings };
		setSettings(updated);
		localStorage.setItem("accessibility-settings", JSON.stringify(updated));

		// Apply settings
		const root = document.documentElement;
		Object.entries(updated).forEach(([key, value]) => {
			if (typeof value === "boolean") {
				if (value) {
					root.setAttribute(`data-${key}`, "true");
				} else {
					root.removeAttribute(`data-${key}`);
				}
			} else {
				root.setAttribute(`data-${key}`, String(value));
			}
		});
	};

	return { settings, updateSettings };
}
