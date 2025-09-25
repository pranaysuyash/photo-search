import {
	ArrowRight,
	Camera,
	ChevronRight,
	Heart,
	Image,
	Search,
	Shield,
	Star,
	Users,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface EnhancedWelcomeProps {
	onStartDemo: () => void;
	onSelectFolder: () => void;
	onStartTour?: () => void;
	onOpenHelp?: () => void;
	isFirstVisit?: boolean;
	onCompleteOnboardingStep?: (step: string) => void;
}

export function EnhancedWelcome({
	onStartDemo,
	onSelectFolder,
	onStartTour,
	onOpenHelp,
	isFirstVisit = true,
	onCompleteOnboardingStep,
}: EnhancedWelcomeProps) {
	const [currentFeature, setCurrentFeature] = useState(0);
	const [showStats, setShowStats] = useState(false);

	const features = [
		{
			icon: <Search className="w-8 h-8 text-blue-500" />,
			title: "Natural Language Search",
			description:
				"Search like you speak: 'beach sunset' or 'family birthday party'",
			color: "from-blue-500 to-cyan-500",
		},
		{
			icon: <Users className="w-8 h-8 text-purple-500" />,
			title: "Face Recognition",
			description:
				"Find all photos of someone instantly with AI-powered face detection",
			color: "from-purple-500 to-pink-500",
		},
		{
			icon: <Heart className="w-8 h-8 text-red-500" />,
			title: "Smart Collections",
			description: "Auto-organize photos by people, places, and events",
			color: "from-red-500 to-orange-500",
		},
		{
			icon: <Zap className="w-8 h-8 text-yellow-500" />,
			title: "Lightning Fast",
			description: "Search thousands of photos in milliseconds",
			color: "from-yellow-500 to-orange-500",
		},
	];

	const quickFacts = [
		{
			icon: <Shield className="w-5 h-5 text-green-500" />,
			title: "100% Private",
			description: "All processing happens locally on your device",
		},
		{
			icon: <Star className="w-5 h-5 text-yellow-500" />,
			title: "AI-Powered",
			description: "Advanced machine learning for intelligent search",
		},
		{
			icon: <Camera className="w-5 h-5 text-blue-500" />,
			title: "All Formats",
			description: "Supports JPEG, PNG, HEIC, TIFF, and more",
		},
	];

	const sampleSearches = [
		"sunset at the beach",
		"my kids playing soccer",
		"that trip to Paris",
		"birthday cake with candles",
		"our dog running in the park",
		"family dinner last Christmas",
	];

	// Auto-rotate features
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentFeature((prev) => (prev + 1) % features.length);
		}, 4000);
		return () => clearInterval(interval);
	}, []);

	// Show stats after a delay
	useEffect(() => {
		const timer = setTimeout(() => setShowStats(true), 2000);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
			{/* Animated background elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl animate-pulse delay-500" />
			</div>

			<div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
				<div className="w-full max-w-6xl">
					{/* Hero Section */}
					<div className="text-center mb-12">
						<div className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 shadow-lg">
							<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
							<span className="text-sm font-medium text-gray-600 dark:text-gray-300">
								AI-Powered Photo Search
							</span>
						</div>

						<h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-6">
							Find Any Photo
							<br />
							<span className="text-4xl md:text-5xl font-semibold text-gray-600 dark:text-gray-400">
								Instantly
							</span>
						</h1>

						<p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
							Describe what you're looking for in plain English. No more endless
							scrolling through thousands of photos.
						</p>

						{/* Primary CTA Buttons */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
							<button
								type="button"
								onClick={() => {
									onCompleteOnboardingStep?.("start_demo");
									onStartDemo();
								}}
								className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 overflow-hidden"
							>
								<div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
								<div className="relative flex items-center gap-3">
									<Camera className="w-6 h-6" />
									<span>Try Demo Library</span>
									<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
								</div>
							</button>

							<button
								type="button"
								onClick={() => {
									onCompleteOnboardingStep?.("select_directory");
									onSelectFolder();
								}}
								className="px-8 py-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-gray-800 dark:text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-gray-200 dark:border-slate-700"
							>
								Use My Photos
							</button>
						</div>

						{/* Trust indicators */}
						<div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
							<div className="flex items-center gap-2">
								<Shield className="w-4 h-4" />
								<span>100% Private</span>
							</div>
							<div className="flex items-center gap-2">
								<Zap className="w-4 h-4" />
								<span>Lightning Fast</span>
							</div>
							<div className="flex items-center gap-2">
								<Image className="w-4 h-4" />
								<span>All Formats</span>
							</div>
						</div>
					</div>

					{/* Feature Showcase */}
					<div className="mb-12">
						<div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl">
							<div className="text-center mb-8">
								<h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
									Powered by Advanced AI
								</h2>
								<p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
									Our AI understands context, recognizes faces, and finds
									patterns in your photos
								</p>
							</div>

							{/* Feature carousel */}
							<div className="relative">
								<div className="flex justify-center">
									<div className="w-full max-w-2xl">
										<div className="bg-gradient-to-r from-white to-gray-50 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-8 shadow-lg">
											<div className="flex items-center gap-6">
												<div
													className={`p-4 rounded-2xl bg-gradient-to-r ${features[currentFeature].color}`}
												>
													{features[currentFeature].icon}
												</div>
												<div className="flex-1">
													<h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
														{features[currentFeature].title}
													</h3>
													<p className="text-gray-600 dark:text-gray-300">
														{features[currentFeature].description}
													</p>
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* Feature indicators */}
								<div className="flex justify-center gap-2 mt-6">
									{features.map((feature, index) => (
										<button
											key={feature.title}
											type="button"
											onClick={() => setCurrentFeature(index)}
											className={`w-3 h-3 rounded-full transition-all duration-200 ${
												index === currentFeature
													? "bg-blue-500 scale-125"
													: "bg-gray-300 hover:bg-gray-400"
											}`}
											aria-label={`View feature ${index + 1}`}
										/>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Quick Facts Grid */}
					<div className="grid md:grid-cols-3 gap-6 mb-12">
						{quickFacts.map((fact) => (
							<div
								key={`fact-${fact.title}`}
								className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg transform transition-all duration-500 ${
									showStats
										? "translate-y-0 opacity-100"
										: "translate-y-4 opacity-0"
								}`}
							>
								<div className="flex items-center gap-4">
									<div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-xl">
										{fact.icon}
									</div>
									<div>
										<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
											{fact.title}
										</h3>
										<p className="text-sm text-gray-600 dark:text-gray-300">
											{fact.description}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Sample Searches */}
					<div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl mb-8">
						<div className="text-center mb-6">
							<h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
								Try These Searches
							</h3>
							<p className="text-gray-600 dark:text-gray-300">
								Just type what you're looking for in plain English
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{sampleSearches.map((search) => (
								<button
									key={search}
									type="button"
									className="group p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl text-left hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all duration-200 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500"
									onClick={() => {
										// This would trigger a search in the real app
										console.log("Search for:", search);
									}}
								>
									<div className="flex items-center justify-between">
										<span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
											{search}
										</span>
										<ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Secondary Actions */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						{onStartTour && (
							<button
								type="button"
								onClick={onStartTour}
								className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors font-medium"
							>
								🎯 Take a Tour
							</button>
						)}
						{onOpenHelp && (
							<button
								type="button"
								onClick={onOpenHelp}
								className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors font-medium"
							>
								❓ Get Help
							</button>
						)}
					</div>

					{/* Footer */}
					<div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
						<p>
							{isFirstVisit
								? "Welcome! Let's get you started with AI-powered photo search."
								: "Ready to explore your photos with AI?"}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default EnhancedWelcome;
