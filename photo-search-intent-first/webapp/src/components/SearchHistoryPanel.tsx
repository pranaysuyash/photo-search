import { Clock, Search, Trash2, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	type SearchHistoryEntry,
	searchHistoryService,
} from "../services/SearchHistoryService";

interface SearchHistoryPanelProps {
	onSearch: (query: string) => void;
	onClose: () => void;
}

export const SearchHistoryPanel: React.FC<SearchHistoryPanelProps> = ({
	onSearch,
	onClose,
}) => {
	const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
	const [showClearConfirm, setShowClearConfirm] = useState(false);

	const loadHistory = useCallback(() => {
		const historyEntries = searchHistoryService.getHistory();
		setHistory(historyEntries);
	}, []);

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	const handleSearch = (query: string) => {
		onSearch(query);
		onClose();
	};

	const clearHistory = () => {
		searchHistoryService.clearHistory();
		setHistory([]);
		setShowClearConfirm(false);
	};

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

			<div className="search-history-content">
				{history.length === 0 ? (
					<div className="empty-state">
						<Clock className="w-12 h-12 text-gray-300" />
						<p>No search history yet</p>
						<p className="text-sm text-gray-500">
							Your recent searches will appear here
						</p>
					</div>
				) : (
					<div className="search-history-list">
						{history.map((entry, index) => (
							<div
								key={`entry-${entry.query}-${index}`}
								className="search-history-item"
							>
								<button
									type="button"
									onClick={() => handleSearch(entry.query)}
									className="search-history-button"
								>
									<Search className="w-4 h-4 text-gray-400" />
									<div className="search-query-container">
										<span className="search-query">{entry.query}</span>
										<div className="search-meta">
											<span className="result-count">
												{entry.resultCount} results
											</span>
											<span
												className="search-time"
												title={formatDate(entry.timestamp)}
											>
												{formatRelativeTime(entry.timestamp)}
											</span>
										</div>
									</div>
								</button>
							</div>
						))}
					</div>
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

        .search-history-list {
          padding: 0.5rem;
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
