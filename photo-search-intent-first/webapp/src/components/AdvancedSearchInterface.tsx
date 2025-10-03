import {
	BookOpen,
	Filter,
	Info,
	Plus,
	Search,
	TrendingUp,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	type ParsedQuery,
	queryProcessor,
} from "../services/AdvancedQueryProcessor";

interface AdvancedSearchInterfaceProps {
	onSearch: (query: string, parsedQuery?: ParsedQuery) => void;
	initialQuery?: string;
	className?: string;
}

export function AdvancedSearchInterface({
	onSearch,
	initialQuery = "",
	className,
}: AdvancedSearchInterfaceProps) {
	const [query, setQuery] = useState(initialQuery);
	const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [explanation, setExplanation] = useState("");
	const [showExplanation, setShowExplanation] = useState(false);

	// Parse query in real-time
	useEffect(() => {
		if (query.trim()) {
			const parsed = queryProcessor.processQuery(query);
			setParsedQuery(parsed);

			// Generate suggestions
			const newSuggestions = queryProcessor.generateSuggestions(query);
			setSuggestions(newSuggestions);

			// Generate explanation if advanced
			if (parsed.intent !== "simple") {
				setExplanation(queryProcessor.explainQuery(query));
			} else {
				setExplanation("");
			}
		} else {
			setParsedQuery(null);
			setSuggestions([]);
			setExplanation("");
		}
	}, [query]);

	// Handle search
	const handleSearch = useCallback(() => {
		if (!query.trim()) return;
		onSearch(query, parsedQuery || undefined);
	}, [query, parsedQuery, onSearch]);

	// Handle suggestion click
	const handleSuggestionClick = (suggestion: string) => {
		setQuery(suggestion);
		onSearch(suggestion);
	};

	// Handle key press
	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	// Quick templates
	const quickTemplates = [
		{ label: "Beach photos", query: "beach AND sunset AND beautiful" },
		{
			label: "Family events",
			query: "family AND (birthday OR wedding OR celebration)",
		},
		{ label: "Recent favorites", query: "recent AND tagged AS favorite" },
		{ label: "Travel memories", query: "vacation OR travel OR trip" },
		{
			label: "Nature scenes",
			query: "nature AND (beach OR mountain OR forest)",
		},
		{ label: "Exclude blurry", query: "photos NOT blurry AND NOT dark" },
	];

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Main Search Bar */}
			<div className="relative">
				<div className="flex items-center gap-3">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Try: 'beach AND sunset NOT night' or 'family OR friends'"
							className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>

						{/* Query complexity indicator */}
						{parsedQuery && parsedQuery.intent !== "simple" && (
							<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
								<div
									className={`px-2 py-1 rounded-full text-xs font-medium ${
										parsedQuery.intent === "advanced"
											? "bg-purple-100 text-purple-700"
											: parsedQuery.intent === "negative"
												? "bg-red-100 text-red-700"
												: "bg-blue-100 text-blue-700"
									}`}
								>
									<Zap className="w-3 h-3 inline mr-1" />
									{parsedQuery.intent}
								</div>
							</div>
						)}
					</div>

					<button
						type="button"
						onClick={handleSearch}
						disabled={!query.trim()}
						className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Search
					</button>
				</div>

				{/* Advanced toggle */}
				<button
					type="button"
					onClick={() => setShowAdvanced(!showAdvanced)}
					className="mt-3 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
				>
					<Filter className="w-4 h-4" />
					{showAdvanced ? "Hide" : "Show"} advanced options
				</button>
			</div>

			{/* Advanced Options */}
			{showAdvanced && (
				<div className="bg-gray-50 rounded-lg p-6 space-y-4">
					{/* Quick Templates */}
					<div>
						<h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
							<TrendingUp className="w-4 h-4" />
							Quick Templates
						</h3>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
							{quickTemplates.map((template, idx) => (
								<button
									type="button"
									key={idx}
									onClick={() => setQuery(template.query)}
									className="text-left p-3 bg-white rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
								>
									<div className="font-medium text-sm text-gray-900">
										{template.label}
									</div>
									<div className="text-xs text-gray-500 mt-1">
										{template.query}
									</div>
								</button>
							))}
						</div>
					</div>

					{/* Boolean Operators Guide */}
					<div>
						<h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
							<BookOpen className="w-4 h-4" />
							Boolean Operators
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
							<div className="bg-white p-3 rounded border border-gray-200">
								<code className="font-mono text-blue-600">AND</code>
								<p className="text-gray-600 mt-1">
									All terms must be present (default)
								</p>
							</div>
							<div className="bg-white p-3 rounded border border-gray-200">
								<code className="font-mono text-blue-600">OR</code>
								<p className="text-gray-600 mt-1">
									Any of the terms can be present
								</p>
							</div>
							<div className="bg-white p-3 rounded border border-gray-200">
								<code className="font-mono text-blue-600">NOT</code>
								<p className="text-gray-600 mt-1">Exclude terms from results</p>
							</div>
							<div className="bg-white p-3 rounded border border-gray-200">
								<code className="font-mono text-blue-600">()</code>
								<p className="text-gray-600 mt-1">Group expressions</p>
							</div>
						</div>
					</div>

					{/* Filter Examples */}
					<div>
						<h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
							<Filter className="w-4 h-4" />
							Smart Filters
						</h3>
						<div className="bg-white rounded border border-gray-200 p-4">
							<div className="space-y-2 text-sm font-mono text-gray-700">
								<div>
									<span className="text-blue-600">before 2023</span> - Photos
									before 2023
								</div>
								<div>
									<span className="text-blue-600">after 2022</span> - Photos
									after 2022
								</div>
								<div>
									<span className="text-blue-600">in Paris</span> - Photos from
									Paris
								</div>
								<div>
									<span className="text-blue-600">tagged as favorite</span> -
									Favorite photos
								</div>
								<div>
									<span className="text-blue-600">.jpg</span> - JPEG files only
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Suggestions */}
			{suggestions.length > 0 && (
				<div className="bg-blue-50 rounded-lg p-4">
					<h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
						<Zap className="w-4 h-4" />
						Smart Suggestions
					</h3>
					<div className="flex flex-wrap gap-2">
						{suggestions.map((suggestion, idx) => (
							<button
								type="button"
								key={idx}
								onClick={() => handleSuggestionClick(suggestion)}
								className="px-3 py-1.5 bg-white hover:bg-blue-100 rounded-full text-sm text-blue-700 border border-blue-200 transition-colors"
							>
								{suggestion}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Query Explanation */}
			{parsedQuery && parsedQuery.intent !== "simple" && (
				<div className="bg-purple-50 rounded-lg p-4">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-purple-900 flex items-center gap-2">
							<Info className="w-4 h-4" />
							Query Analysis
						</h3>
						<button
							type="button"
							onClick={() => setShowExplanation(!showExplanation)}
							className="text-xs text-purple-600 hover:text-purple-700"
						>
							{showExplanation ? "Hide" : "Show"} details
						</button>
					</div>

					{showExplanation && (
						<div className="text-sm text-purple-700 whitespace-pre-line bg-white rounded p-3 mt-2">
							{explanation}
						</div>
					)}

					{/* Parsed query summary */}
					<div className="mt-3 text-sm text-purple-700">
						<div className="flex items-center gap-4">
							<span>
								Intent: <strong>{parsedQuery.intent}</strong>
							</span>
							<span>
								Terms: <strong>{parsedQuery.terms.length}</strong>
							</span>
							<span>
								Expanded: <strong>{parsedQuery.expandedTerms.length}</strong>
							</span>
							{parsedQuery.filters.length > 0 && (
								<span>
									Filters: <strong>{parsedQuery.filters.length}</strong>
								</span>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
