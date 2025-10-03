import {
	Camera,
	Clock,
	Folder,
	Play,
	Sparkles,
	TrendingUp,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import "./intent-aware-welcome.css";

interface UserIntent {
	primary: "explore" | "organize" | "find" | "demo" | "unsure";
	confidence: number;
	context?: string;
}

interface IntentAwareWelcomeProps {
	onStartDemo: () => void;
	onSelectFolder: () => void;
	onClose: () => void;
	onIntentDetected?: (intent: UserIntent) => void;
}

// Intent detection patterns
const intentPatterns = {
	explore: {
		keywords: ["try", "demo", "test", "see", "explore", "check", "preview"],
		weight: 0.8,
		action: "demo",
		message: "You want to explore the capabilities",
	},
	organize: {
		keywords: ["organize", "manage", "sort", "clean", "arrange", "catalog"],
		weight: 0.7,
		action: "folder",
		message: "You want to organize your photo collection",
	},
	find: {
		keywords: ["find", "search", "locate", "discover", "look for", "specific"],
		weight: 0.9,
		action: "folder",
		message: "You have specific photos in mind to find",
	},
	demo: {
		keywords: ["show", "demo", "example", "sample", "how it works"],
		weight: 0.85,
		action: "demo",
		message: "You want to see how it works first",
	},
};

export function IntentAwareWelcome({
	onStartDemo,
	onSelectFolder,
	onClose,
	onIntentDetected,
}: IntentAwareWelcomeProps) {
	const [detectedIntent, setDetectedIntent] = useState<UserIntent>({
		primary: "unsure",
		confidence: 0,
	});
	const [userInput, setUserInput] = useState("");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [showCustomization, setShowCustomization] = useState(false);

	// Smart intent detection from user input
	const detectIntent = (input: string): UserIntent => {
		const normalizedInput = input.toLowerCase();
		let bestMatch: UserIntent = { primary: "unsure", confidence: 0 };

		// Analyze each intent pattern
		for (const [intent, config] of Object.entries(intentPatterns)) {
			let score = 0;
			let matchedKeywords = 0;

			// Check keyword matches
			for (const keyword of config.keywords) {
				if (normalizedInput.includes(keyword)) {
					score += config.weight;
					matchedKeywords++;
				}
			}

			// Bonus for multiple keyword matches
			if (matchedKeywords > 1) {
				score += 0.2 * matchedKeywords;
			}

			// Contextual clues
			if (
				normalizedInput.includes("photo") ||
				normalizedInput.includes("picture")
			) {
				score += 0.3;
			}
			if (
				normalizedInput.includes("help") ||
				normalizedInput.includes("assist")
			) {
				score += 0.2;
			}

			if (score > bestMatch.confidence) {
				bestMatch = {
					primary: intent as UserIntent["primary"],
					confidence: Math.min(score, 1),
					context: input,
				};
			}
		}

		return bestMatch;
	};

	// Handle user intent input
	const handleUserInput = () => {
		if (!userInput.trim()) return;

		setIsAnalyzing(true);

		// Simulate brief analysis for UX
		setTimeout(() => {
			const intent = detectIntent(userInput);
			setDetectedIntent(intent);
			setShowCustomization(true);
			setIsAnalyzing(false);

			onIntentDetected?.(intent);

			// Auto-proceed if confidence is high
			if (intent.confidence > 0.7) {
				setTimeout(() => {
					if (
						intentPatterns[intent.primary as keyof typeof intentPatterns]
							?.action === "demo"
					) {
						onStartDemo();
					} else {
						onSelectFolder();
					}
				}, 1000);
			}
		}, 500);
	};

	// Smart suggestions based on detected intent
	const getSmartSuggestions = () => {
		switch (detectedIntent.primary) {
			case "find":
				return [
					"Find photos of people",
					"Locate specific events",
					"Search by description",
				];
			case "organize":
				return ["Organize by date", "Group by faces", "Sort by location"];
			case "explore":
			case "demo":
				return [
					"See AI search demo",
					"Try natural language",
					"Explore features",
				];
			default:
				return ["What brings you here?", "Search for photos", "Try the demo"];
		}
	};

	const getSuggestedAction = () => {
		const pattern =
			intentPatterns[detectedIntent.primary as keyof typeof intentPatterns];
		if (pattern && detectedIntent.confidence > 0.5) {
			return pattern.action === "demo" ? onStartDemo : onSelectFolder;
		}
		return null;
	};

	return (
		<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
			<div
				className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-label="Welcome to Photo Search"
			>
				<div className="p-8">
					<div className="text-center">
						{/* Hero Section */}
						<div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-6 relative">
							<Sparkles className="w-12 h-12 text-white" />
							{isAnalyzing && (
								<div className="absolute inset-0 rounded-2xl border-2 border-blue-400 animate-pulse" />
							)}
						</div>

						<h1 className="text-3xl font-bold text-gray-900 mb-4">
							What would you like to do today?
						</h1>

						{/* Intent Detection Area */}
						<div className="max-w-2xl mx-auto mb-8">
							<div className="bg-gray-50 rounded-xl p-6 mb-6">
								<label className="block text-sm font-medium text-gray-700 mb-3">
									Tell me what you're looking for (optional)
								</label>
								<div className="flex gap-3">
									<input
										type="text"
										value={userInput}
										onChange={(e) => setUserInput(e.target.value)}
										onKeyPress={(e) => e.key === "Enter" && handleUserInput()}
										placeholder="e.g., 'I want to find photos of my family vacation' or 'show me how this works'"
										className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										disabled={isAnalyzing}
									/>
									<button
										type="button"
										onClick={handleUserInput}
										disabled={isAnalyzing || !userInput.trim()}
										className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										{isAnalyzing ? (
											<div className="flex items-center gap-2">
												<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
												Analyzing
											</div>
										) : (
											"Analyze"
										)}
									</button>
								</div>

								{/* Smart Suggestions */}
								<div className="mt-4 flex flex-wrap gap-2">
									{getSmartSuggestions().map((suggestion, idx) => (
										<button
											type="button"
											key={idx}
											onClick={() => setUserInput(suggestion)}
											className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
										>
											{suggestion}
										</button>
									))}
								</div>
							</div>

							{/* Detected Intent Display */}
							{showCustomization && detectedIntent.confidence > 0 && (
								<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 animate-fade-in">
									<div className="flex items-center justify-between">
										<div className="text-left">
											<p className="text-sm font-medium text-blue-900">
												I understand:{" "}
												{
													intentPatterns[
														detectedIntent.primary as keyof typeof intentPatterns
													]?.message
												}
											</p>
											<p className="text-xs text-blue-700 mt-1">
												Confidence:{" "}
												{Math.round(detectedIntent.confidence * 100)}%
											</p>
										</div>
										{detectedIntent.confidence > 0.7 && (
											<div className="flex items-center gap-2 text-blue-600">
												<div className="w-2 h-2 bg-green-500 rounded-full" />
												<span className="text-sm font-medium">Recommended</span>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Primary Action Cards */}
							<div className="grid md:grid-cols-2 gap-6">
								{/* Demo Card */}
								<button
									type="button"
									onClick={onStartDemo}
									className={`text-left group transition-all ${
										detectedIntent.primary === "demo" ||
										detectedIntent.primary === "explore"
											? "ring-2 ring-blue-500 bg-blue-50"
											: "bg-white hover:bg-gray-50"
									} border-2 border-gray-200 rounded-xl p-6`}
								>
									<div className="flex items-center gap-4 mb-3">
										<div
											className={`w-12 h-12 rounded-xl flex items-center justify-center ${
												detectedIntent.primary === "demo" ||
												detectedIntent.primary === "explore"
													? "bg-blue-100 text-blue-600"
													: "bg-purple-100 text-purple-600 group-hover:bg-purple-200"
											} transition-colors`}
										>
											<Play className="w-6 h-6" />
										</div>
										<div className="flex-1">
											<h3 className="text-lg font-semibold text-gray-900">
												See it in action
											</h3>
											<p className="text-sm text-gray-600">
												Explore features with demo photos
											</p>
										</div>
									</div>
									<div className="text-sm text-gray-500">
										Perfect for: First-time users, testing capabilities
									</div>
								</button>

								{/* Folder Card */}
								<button
									type="button"
									onClick={onSelectFolder}
									className={`text-left group transition-all ${
										detectedIntent.primary === "find" ||
										detectedIntent.primary === "organize"
											? "ring-2 ring-blue-500 bg-blue-50"
											: "bg-white hover:bg-gray-50"
									} border-2 border-gray-200 rounded-xl p-6`}
								>
									<div className="flex items-center gap-4 mb-3">
										<div
											className={`w-12 h-12 rounded-xl flex items-center justify-center ${
												detectedIntent.primary === "find" ||
												detectedIntent.primary === "organize"
													? "bg-blue-100 text-blue-600"
													: "bg-blue-100 text-blue-600 group-hover:bg-blue-200"
											} transition-colors`}
										>
											<Folder className="w-6 h-6" />
										</div>
										<div className="flex-1">
											<h3 className="text-lg font-semibold text-gray-900">
												Use my photos
											</h3>
											<p className="text-sm text-gray-600">
												Search through your personal collection
											</p>
										</div>
									</div>
									<div className="text-sm text-gray-500">
										Perfect for: Finding specific photos, organizing
									</div>
								</button>
							</div>

							{/* Quick Stats */}
							<div className="grid grid-cols-3 gap-4 mt-8 text-center">
								<div className="bg-gray-50 rounded-lg p-3">
									<TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
									<div className="text-xs text-gray-600">AI-Powered</div>
								</div>
								<div className="bg-gray-50 rounded-lg p-3">
									<Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
									<div className="text-xs text-gray-600">Lightning Fast</div>
								</div>
								<div className="bg-gray-50 rounded-lg p-3">
									<Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
									<div className="text-xs text-gray-600">Face Recognition</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
								{/* Smart Suggested Action */}
								{getSuggestedAction() && (
									<button
										type="button"
										onClick={getSuggestedAction()!}
										className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
									>
										{detectedIntent.primary === "find" ||
										detectedIntent.primary === "organize"
											? "Search my photos"
											: "Try the demo"}
									</button>
								)}

								{/* Alternative Action */}
								<button
									type="button"
									onClick={
										detectedIntent.primary === "find" ||
										detectedIntent.primary === "organize"
											? onStartDemo
											: onSelectFolder
									}
									className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-md"
								>
									{detectedIntent.primary === "find" ||
									detectedIntent.primary === "organize"
										? "See demo first"
										: "Use my photos"}
								</button>
							</div>

							{/* Maybe Later */}
							<button
								type="button"
								onClick={onClose}
								className="mt-6 text-gray-500 hover:text-gray-700 transition-colors text-sm"
							>
								Maybe later
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
