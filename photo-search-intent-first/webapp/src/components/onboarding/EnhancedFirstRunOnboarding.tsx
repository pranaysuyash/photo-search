import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ChevronLeft, ChevronRight, FolderOpen, Play, Sparkles, Zap } from "lucide-react";
import { API_BASE } from "../../api";
import { useSimpleStore } from "../../stores/SimpleStore";
import { useResponsiveSpacing } from "../../hooks/useResponsiveSpacing";
import { cn } from "../../lib/utils";

interface EnhancedFirstRunOnboardingProps {
	isOpen: boolean;
	onClose: () => void;
	onComplete: (setupData: OnboardingSetupData) => void;
}

interface OnboardingSetupData {
	directory?: string;
	includeVideos: boolean;
	enableDemo: boolean;
	completedSteps: string[];
}

type ScanItem = {
	path: string;
	exists: boolean;
	files: number;
	bytes: number;
	label?: string;
	source?: string;
};

interface OnboardingStep {
	id: string;
	title: string;
	description: string;
	type: 'welcome' | 'directory' | 'options' | 'demo' | 'complete';
}

const onboardingSteps: OnboardingStep[] = [
	{
		id: 'welcome',
		title: 'Welcome to Photo Search',
		description: 'Find any photo instantly with AI-powered search',
		type: 'welcome'
	},
	{
		id: 'directory',
		title: 'Choose Your Photos',
		description: 'Select where your photos are stored',
		type: 'directory'
	},
	{
		id: 'options',
		title: 'Customize Your Experience',
		description: 'Configure indexing options and preferences',
		type: 'options'
	},
	{
		id: 'demo',
		title: 'Try It Out',
		description: 'Experience the magic with sample photos',
		type: 'demo'
	},
	{
		id: 'complete',
		title: "You're All Set!",
		description: 'Start searching your photos naturally',
		type: 'complete'
	}
];

export function EnhancedFirstRunOnboarding({
	isOpen,
	onClose,
	onComplete
}: EnhancedFirstRunOnboardingProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [setupData, setSetupData] = useState<OnboardingSetupData>({
		includeVideos: false,
		enableDemo: false,
		completedSteps: []
	});
	const [scanItems, setScanItems] = useState<ScanItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [starting, setStarting] = useState(false);
	const [status, setStatus] = useState("");
	const [isTransitioning, setIsTransitioning] = useState(false);

	const { classes, getComponentSpacing } = useResponsiveSpacing();
	const modalSpacing = getComponentSpacing('modal');
	const store = useSimpleStore();
	const containerRef = useRef<HTMLDivElement>(null);

	const currentStepData = onboardingSteps[currentStep];
	const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

	// Focus management
	useEffect(() => {
		if (isOpen && containerRef.current) {
			containerRef.current.focus();
		}
	}, [isOpen, currentStep]);

	// Load default scan locations
	useEffect(() => {
		if (!isOpen || currentStepData.type !== 'directory') return;

		const loadDefaults = async () => {
			setLoading(true);
			try {
				const resp = await fetch(
					`${API_BASE}/library/defaults?include_videos=${setupData.includeVideos ? "1" : "0"}`
				);
				if (!resp.ok) return;

				const data = await resp.json() as { items?: ScanItem[] };
				if (Array.isArray(data.items) && data.items.length > 0) {
					setScanItems(data.items);
				}
			} catch (error) {
				console.debug("Failed to load defaults:", error);
			} finally {
				setLoading(false);
			}
		};

		loadDefaults();
	}, [isOpen, currentStepData.type, setupData.includeVideos]);

	const formatBytes = (bytes: number): string => {
		if (!bytes) return "0 B";
		const units = ["B", "KB", "MB", "GB", "TB"];
		let i = 0;
		let v = bytes;
		while (v >= 1024 && i < units.length - 1) {
			v /= 1024;
			i++;
		}
		return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
	};

	const totalFiles = scanItems.reduce((sum, item) => sum + (item.files || 0), 0);
	const totalSize = scanItems.reduce((sum, item) => sum + (item.bytes || 0), 0);

	const handleNext = () => {
		if (currentStep < onboardingSteps.length - 1) {
			setIsTransitioning(true);
			setSetupData(prev => ({
				...prev,
				completedSteps: [...prev.completedSteps, currentStepData.id]
			}));
			setTimeout(() => {
				setCurrentStep(prev => prev + 1);
				setIsTransitioning(false);
			}, 200);
		}
	};

	const handlePrev = () => {
		if (currentStep > 0) {
			setIsTransitioning(true);
			setTimeout(() => {
				setCurrentStep(prev => prev - 1);
				setIsTransitioning(false);
			}, 200);
		}
	};

	const handleQuickStart = async () => {
		const existingPaths = scanItems.filter(item => item.exists).map(item => item.path);
		if (existingPaths.length === 0) return;

		setStarting(true);
		setStatus("Starting indexing...");

		try {
			await onComplete({
				...setupData,
				directory: existingPaths[0],
				completedSteps: [...setupData.completedSteps, currentStepData.id]
			});

			// Show progress feedback
			const firstPath = existingPaths[0];
			for (let i = 0; i < 7; i++) {
				try {
					const r = await fetch(
						`${API_BASE}/analytics?dir=${encodeURIComponent(firstPath)}&limit=5`
					);
					if (r.ok) {
						const js = await r.json() as unknown;
						const ev = (js.events || []).find((e: React.MouseEvent) => e.type === "index");
						if (ev) {
							setStatus(`Indexed ${ev.new}+${ev.updated} (total ${ev.total})`);
							break;
						}
					}
				} catch {}
				await new Promise(res => setTimeout(res, 1000));
			}
		} finally {
			setTimeout(() => {
				setStarting(false);
				onClose();
			}, 1000);
		}
	};

	const handleSelectDirectory = async () => {
		try {
			const path = await (window as unknown).electronAPI?.selectFolder?.();
			if (typeof path === "string" && path.trim()) {
				try {
					await (window as unknown).electronAPI?.setAllowedRoot?.(path);
				} catch {}

				await onComplete({
					...setupData,
					directory: path,
					completedSteps: [...setupData.completedSteps, currentStepData.id]
				});
				onClose();
			}
		} catch (error) {
			console.debug("Failed to select directory:", error);
		}
	};

	const handleDemoMode = async () => {
		await onComplete({
			...setupData,
			enableDemo: true,
			completedSteps: [...setupData.completedSteps, currentStepData.id]
		});
		onClose();
	};

	const renderStepContent = () => {
		switch (currentStepData.type) {
			case 'welcome':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-center space-y-6"
					>
						<div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
							<Sparkles className="w-12 h-12 text-white" />
						</div>

						<div className="space-y-4">
							<h2 className="text-3xl font-bold text-gray-900 dark:text-white">
								Find any photo instantly
							</h2>
							<p className="text-lg text-gray-600 dark:text-gray-300">
								Just describe what you're looking for - like "that beach sunset"
								or "my daughter's birthday" - and we'll find it.
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
							<div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
								<Zap className="w-8 h-8 text-blue-500 mx-auto mb-2" />
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									AI-Powered
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Natural language search that understands you
								</p>
							</div>

							<div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
								<FolderOpen className="w-8 h-8 text-green-500 mx-auto mb-2" />
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									Local & Private
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Everything stays on your device
								</p>
							</div>

							<div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
								<Play className="w-8 h-8 text-purple-500 mx-auto mb-2" />
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									Easy to Use
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									No complex setup required
								</p>
							</div>
						</div>
					</motion.div>
				);

			case 'directory':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="space-y-6"
					>
						<div className="grid md:grid-cols-2 gap-6">
							<div className="space-y-4">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									🚀 Quick Start (Recommended)
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Index common photo locations automatically
								</p>

								{loading ? (
									<div className="text-center py-8">
										<div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Finding your photos...
										</p>
									</div>
								) : (
									<div className="space-y-3">
										{scanItems.map((item) => (
											<div
												key={item.path}
												className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center"
											>
												<div className="flex-1">
													<div className="font-medium text-gray-900 dark:text-white">
														{item.label || item.path}
													</div>
													{item.label && (
														<div className="text-xs text-gray-500 dark:text-gray-400">
															{item.path}
														</div>
													)}
												</div>
												<div className="text-right text-sm">
													{item.exists ? (
														<div className="text-green-600 dark:text-green-400">
															{item.files} files • {formatBytes(item.bytes)}
														</div>
													) : (
														<div className="text-gray-500 dark:text-gray-400">
															Not found
														</div>
													)}
												</div>
											</div>
										))}

										{totalFiles > 0 && (
											<div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
												<div className="font-medium text-blue-900 dark:text-blue-100">
													{totalFiles} photos found • {formatBytes(totalSize)}
												</div>
											</div>
										)}

										<button type="button" onClick={handleQuickStart}
											disabled={loading || starting || totalFiles === 0}
											className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											{starting ? status || "Starting..." : `Start Indexing (${totalFiles} files)`}
										</button>
									</div>
								)}
							</div>

							<div className="space-y-4">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									🎯 Custom Setup
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Choose specific folders manually
								</p>

								<div className="space-y-3">
									<button type="button" onClick={handleSelectDirectory}
										className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
									>
										<FolderOpen className="w-6 h-6 mx-auto mb-2 text-gray-400" />
										<div className="text-sm font-medium text-gray-700 dark:text-gray-300">
											Select Folder Manually
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											Browse your file system
										</div>
									</button>

									{(window as unknown).electronAPI?.selectFolder && (
										<button type="button" onClick={handleSelectDirectory}
											className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
										>
											Choose with System Dialog
										</button>
									)}
								</div>

								<div className="flex items-center gap-2">
									<input
										type="checkbox"
										id="include-videos"
										checked={setupData.includeVideos}
										onChange={(e) => setSetupData(prev => ({
											...prev,
											includeVideos: e.target.checked
										}))}
										className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
									/>
									<label htmlFor="include-videos" className="text-sm text-gray-700 dark:text-gray-300">
										Include videos (takes longer)
									</label>
								</div>
							</div>
						</div>
					</motion.div>
				);

			case 'options':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="space-y-6"
					>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
							Configure Your Experience
						</h3>

						<div className="max-w-md mx-auto space-y-4">
							<div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
								<div className="flex items-center justify-between mb-2">
									<div>
										<h4 className="font-medium text-gray-900 dark:text-white">
											Include Videos
										</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Index video files alongside photos
										</p>
									</div>
									<input
										type="checkbox"
										checked={setupData.includeVideos}
										onChange={(e) => setSetupData(prev => ({
											...prev,
											includeVideos: e.target.checked
										}))}
										className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
									/>
								</div>
							</div>

							<div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
								<div className="flex items-center justify-between mb-2">
									<div>
										<h4 className="font-medium text-gray-900 dark:text-white">
											Auto-index New Photos
										</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Automatically index new photos added to folders
										</p>
									</div>
									<input
										type="checkbox"
										defaultChecked
										className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
									/>
								</div>
							</div>

							<div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
								<div className="flex items-center justify-between mb-2">
									<div>
										<h4 className="font-medium text-gray-900 dark:text-white">
											Face Recognition
										</h4>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Automatically detect and tag people in photos
										</p>
									</div>
									<input
										type="checkbox"
										defaultChecked
										className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
									/>
								</div>
							</div>
						</div>
					</motion.div>
				);

			case 'demo':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-center space-y-6"
					>
						<div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
							<Play className="w-8 h-8 text-white" />
						</div>

						<h3 className="text-2xl font-bold text-gray-900 dark:text-white">
							Try It With Sample Photos
						</h3>

						<p className="text-lg text-gray-600 dark:text-gray-400">
							Experience the magic immediately with our curated demo library
						</p>

						<div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto">
							<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
								<div className="text-purple-600 dark:text-purple-400 mb-2">🏖️</div>
								<h4 className="font-medium text-gray-900 dark:text-white mb-1">
									Beach & Nature
								</h4>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Sunset photos and landscapes
								</p>
							</div>

							<div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
								<div className="text-pink-600 dark:text-pink-400 mb-2">👨‍👩‍👧‍👦</div>
								<h4 className="font-medium text-gray-900 dark:text-white mb-1">
									Family & Friends
								</h4>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									People and group photos
								</p>
							</div>
						</div>

						<button type="button" onClick={handleDemoMode}
							className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
						>
							Start Demo Experience
						</button>

						<p className="text-sm text-gray-500 dark:text-gray-400">
							You can always add your own photos later
						</p>
					</motion.div>
				);

			case 'complete':
				return (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-center space-y-6"
					>
						<div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
							<CheckCircle className="w-8 h-8 text-white" />
						</div>

						<h3 className="text-2xl font-bold text-gray-900 dark:text-white">
							You're All Set!
						</h3>

						<p className="text-lg text-gray-600 dark:text-gray-400">
							Start searching your photos naturally
						</p>

						<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-md mx-auto">
							<div className="text-blue-600 dark:text-blue-400 mb-2">💡</div>
							<h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
								Pro Tip
							</h4>
							<p className="text-sm text-blue-700 dark:text-blue-300">
								Try searching for "sunset", "beach", or "birthday" to see AI search in action!
							</p>
						</div>

						<div className="text-sm text-gray-500 dark:text-gray-400">
							You can always access the guided tour from the help menu
						</div>
					</motion.div>
				);

			default:
				return null;
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
				role="button"
				tabIndex={0}
			/>

			{/* Modal Container */}
			<div
				ref={containerRef}
				tabIndex={-1}
				className={cn(
					"relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden focus:outline-none",
					modalSpacing.container
				)}
			>
				{/* Progress Bar */}
				<div className="h-1 bg-gray-200 dark:bg-gray-700">
					<motion.div
						className="h-full bg-blue-500"
						initial={{ width: 0 }}
						animate={{ width: `${progress}%` }}
						transition={{ duration: 0.3 }}
					/>
				</div>

				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-border">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
							<Sparkles className="w-6 h-6 text-white" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-foreground">
								{currentStepData.title}
							</h2>
							<p className="text-sm text-muted-foreground">
								{currentStepData.description}
							</p>
						</div>
					</div>

					<button type="button" onClick={onClose}
						className="p-2 hover:bg-accent rounded-lg transition-colors"
						aria-label="Close onboarding"
					>
						×
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					<AnimatePresence mode="wait">
						<motion.div
							key={currentStep}
							initial={{ opacity: 0, x: isTransitioning ? 20 : -20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.2 }}
						>
							{renderStepContent()}
						</motion.div>
					</AnimatePresence>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between p-6 border-t border-border">
					<div className="text-sm text-muted-foreground">
						Step {currentStep + 1} of {onboardingSteps.length}
					</div>

					<div className="flex items-center gap-3">
						{currentStep > 0 && (
							<button type="button" onClick={handlePrev}
								className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors flex items-center gap-2"
							>
								<ChevronLeft className="w-4 h-4" />
								Previous
							</button>
						)}

						{currentStep < onboardingSteps.length - 1 ? (
							<button type="button" onClick={handleNext}
								className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
							>
								Next
								<ChevronRight className="w-4 h-4" />
							</button>
						) : (
							<button type="button" onClick={onClose}
								className="px-6 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
							>
								Get Started
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}