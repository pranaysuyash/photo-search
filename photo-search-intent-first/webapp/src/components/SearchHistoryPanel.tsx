import { Clock, Filter, Search, SortDesc, Trash2, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { List } from "react-window";
import {
	type SearchHistoryEntry,
	searchHistoryService,
} from "../services/SearchHistoryService";
import { handleError } from "../utils/errors";

// Mock performanceMonitor for testing environments
const _performanceMonitor = {
	start: () => () => {}, // Return a no-op function
	record: () => {},
	getRecentMetrics: () => [],
	getAverageDuration: () => 0,
};

interface SearchHistoryPanelProps {
	onSearch: (query: string) => void;
	onClose: () => void;
}

// Component for individual search history items in the virtualized list
const SearchHistoryItem = ({
	data,
	index,
	style,
}: {
	data: { items: SearchHistoryEntry[]; onSearch: (query: string) => void };
	index: number;
	style: React.CSSProperties;
}) => {
	const entry = data.items[index];

	const formatRelativeTime = (timestamp: number): string => {
		const now = Date.now();
		const diff = now - timestamp;
		const minutes = Math.floor(diff / (1000 * 60));
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return new Date(timestamp).toLocaleDateString();
	};

	const formatDate = (timestamp: number): string => {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const handleSearch = (query: string) => {
		try {
			data.onSearch(query);
		} catch (_e) {
			console.log("Searching for:", query);
		}
	};

	return (
		<div style={style} className="px-2">
			<div
				key={`entry-${entry.query}-${index}`}
				className="search-history-item py-2"
			>
				<button
					type="button"
					onClick={() => handleSearch(entry.query)}
					className="search-history-button w-full"
				>
					<Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
					<div className="search-query-container">
						<span className="search-query">{entry.query}</span>
						<div className="search-meta">
							<span className="result-count">{entry.resultCount} results</span>
							<span className="search-time" title={formatDate(entry.timestamp)}>
								{formatRelativeTime(entry.timestamp)}
							</span>
						</div>
					</div>
				</button>
			</div>
		</div>
	);
};

export const SearchHistoryPanel: React.FC<SearchHistoryPanelProps> = ({
	onSearch,
	onClose,
}) => {
	const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
	const [showClearConfirm, setShowClearConfirm] = useState(false);
	const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
	const [filterBy, setFilterBy] = useState<"all" | "today" | "week" | "month">(
		"all",
	);
	const [searchQuery, setSearchQuery] = useState("");

	const loadHistory = useCallback(() => {
		try {
			const historyEntries = searchHistoryService.getHistory();
			setHistory(historyEntries);
		} catch (error) {
			handleError(error, {
				logToServer: true,
				context: {
					component: "SearchHistoryPanel",
					action: "load_history",
				},
				fallbackMessage: "Failed to load search history",
			});
			setHistory([]); // Set empty array on error
		}
	}, []);

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	const filteredAndSortedHistory = useMemo(() => {
		let filtered = [...history];

		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter((entry) =>
				entry.query.toLowerCase().includes(query),
			);
		}

		// Apply time filter
		const now = Date.now();
		switch (filterBy) {
			case "today":
				filtered = filtered.filter(
					(entry) => now - entry.timestamp < 24 * 60 * 60 * 1000,
				);
				break;
			case "week":
				filtered = filtered.filter(
					(entry) => now - entry.timestamp < 7 * 24 * 60 * 60 * 1000,
				);
				break;
			case "month":
				filtered = filtered.filter(
					(entry) => now - entry.timestamp < 30 * 24 * 60 * 60 * 1000,
				);
				break;
		}

		// Sort by recency (default)
		filtered.sort((a, b) => b.timestamp - a.timestamp);

		return filtered;
	}, [history, filterBy, searchQuery]);

	const clearHistory = () => {
		searchHistoryService.clearHistory();
		setHistory([]);
		setShowClearConfirm(false);
	};

	return (
		<div className="search-history-panel">
			<div className="search-history-header">
				<div className="search-history-title">
					<Clock className="w-5 h-5" />
					<span>Search History</span>
				</div>
				<div className="search-history-actions">
					<button
						type="button"
						onClick={() => setShowClearConfirm(true)}
						className="clear-history-btn"
						title="Clear search history"
					>
						<Trash2 className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={onClose}
						className="close-btn"
						title="Close"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="search-history-filters p-3 border-b">
				<div className="relative mb-2">
					<input
						type="text"
						placeholder="Search in history..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
					<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
				</div>

				<div className="flex gap-2">
					<div className="relative flex-1">
						<select
							value={filterBy}
							onChange={(e) => setFilterBy(e.target.value as unknown)}
							className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
						>
							<option value="all">All time</option>
							<option value="today">Today</option>
							<option value="week">This week</option>
							<option value="month">This month</option>
						</select>
						<Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
					</div>

					<div className="relative flex-1">
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as unknown)}
							className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
						>
							<option value="recent">Most recent</option>
							<option value="popular">Most popular</option>
						</select>
						<SortDesc className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
					</div>
				</div>
			</div>

			{showClearConfirm && (
				<div className="clear-confirm-overlay">
					<div className="clear-confirm-dialog">
						<p>Are you sure you want to clear your search history?</p>
						<div className="clear-confirm-actions">
							<button
								type="button"
								onClick={() => setShowClearConfirm(false)}
								className="cancel-btn"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={clearHistory}
								className="confirm-btn"
							>
								Clear History
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="search-history-content flex-1">
				{filteredAndSortedHistory.length === 0 ? (
					<div className="empty-state">
						<Clock className="w-12 h-12 text-gray-300" />
						{searchQuery ? (
							<>
								<p>No matching search history</p>
								<p className="text-sm text-gray-500">
									No searches match "{searchQuery}"
								</p>
							</>
						) : (
							<>
								<p>No search history yet</p>
								<p className="text-sm text-gray-500">
									Your recent searches will appear here
								</p>
							</>
						)}
					</div>
				) : (
					<List
						height={600}
						itemCount={filteredAndSortedHistory.length}
						itemSize={70}
						itemData={{ items: filteredAndSortedHistory, onSearch }}
						overscanCount={5}
					>
						{SearchHistoryItem}
					</List>
				)}
			</div>

			<style>{`
        .search-history-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 400px;
          background: white;
          border-left: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
        }

        .search-history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .search-history-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 1.125rem;
        }

        .search-history-actions {
          display: flex;
          gap: 0.5rem;
        }

        .clear-history-btn,
        .close-btn {
          padding: 0.5rem;
          border-radius: 0.375rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }

        .clear-history-btn:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .close-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .search-history-content {
          flex: 1;
          overflow-y: auto;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .empty-state p {
          margin: 1rem 0 0.5rem;
        }

        .search-history-item {
          margin-bottom: 0.25rem;
        }

        .search-history-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .search-history-button:hover {
          background: #f3f4f6;
        }

        .search-query-container {
          flex: 1;
          min-width: 0;
        }

        .search-query {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-meta {
          display: flex;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .result-count::after {
          content: "•";
          margin-left: 0.75rem;
        }

        .clear-confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
        }

        .clear-confirm-dialog {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          max-width: 300px;
          width: 90%;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .clear-confirm-dialog p {
          margin-bottom: 1.5rem;
          text-align: center;
          font-size: 0.875rem;
          color: #374151;
        }

        .clear-confirm-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
        }

        .cancel-btn,
        .confirm-btn {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
        }

        .cancel-btn {
          background: #f3f4f6;
          color: #374151;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
        }

        .confirm-btn {
          background: #ef4444;
          color: white;
        }

        .confirm-btn:hover {
          background: #dc2626;
        }

        @media (max-width: 640px) {
          .search-history-panel {
            max-width: 100%;
          }
        }
      `}</style>
		</div>
	);
};

export { SearchHistoryPanel };
