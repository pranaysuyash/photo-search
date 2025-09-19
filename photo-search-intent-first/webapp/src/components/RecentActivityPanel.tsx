import { Calendar, Clock, Filter, Search, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { List } from "react-window";
import {
	type Activity,
	UserManagementService,
} from "../services/UserManagementService";
import { handleError } from "../utils/errors";

// Mock performanceMonitor for testing environments
const _performanceMonitor = {
	start: () => () => {}, // Return a no-op function
	record: () => {},
	getRecentMetrics: () => [],
	getAverageDuration: () => 0,
};

interface RecentActivityPanelProps {
	onClose: () => void;
}

const ACTION_ICONS = {
	view: "👁️",
	edit: "✏️",
	comment: "💬",
	share: "🔗",
	favorite: "❤️",
	delete: "🗑️",
};

const ACTION_LABELS = {
	view: "Viewed",
	edit: "Edited",
	comment: "Commented on",
	share: "Shared",
	favorite: "Favorited",
	delete: "Deleted",
};

// Component for individual activity items in the virtualized list
const ActivityItem = ({
	data,
	index,
	style,
}: {
	data: Activity[];
	index: number;
	style: React.CSSProperties;
}) => {
	const activity = data[index];

	const formatRelativeTime = (timestamp: Date): string => {
		const now = Date.now();
		const time = new Date(timestamp).getTime();
		const diff = now - time;
		const minutes = Math.floor(diff / (1000 * 60));
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return new Date(timestamp).toLocaleDateString();
	};

	const formatDate = (timestamp: Date): string => {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div style={style} className="px-2">
			<div className="recent-activity-item py-2">
				<div className="recent-activity-entry">
					<div className="activity-icon">
						{ACTION_ICONS[activity.action as keyof typeof ACTION_ICONS] || "📝"}
					</div>
					<div className="activity-content">
						<div className="activity-description">
							<span className="activity-action">
								{ACTION_LABELS[activity.action as keyof typeof ACTION_LABELS] ||
									activity.action}
							</span>{" "}
							<span className="activity-resource">
								{activity.resourceType} {activity.resourceId}
							</span>
						</div>
						{activity.metadata && (
							<div className="activity-metadata text-xs text-gray-500 mt-1">
								{typeof activity.metadata === "string"
									? activity.metadata
									: JSON.stringify(activity.metadata)}
							</div>
						)}
						<div className="activity-time text-xs text-gray-400 mt-1 flex items-center">
							<Clock className="w-3 h-3 mr-1" />
							<span title={formatDate(activity.timestamp)}>
								{formatRelativeTime(activity.timestamp)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export const RecentActivityPanel: React.FC<RecentActivityPanelProps> = ({
	onClose,
}) => {
	const [activities, setActivities] = useState<Activity[]>([]);
	const [filterBy, setFilterBy] = useState<"all" | "today" | "week" | "month">(
		"all",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<"recent" | "type">("recent");

	const loadActivities = useCallback(() => {
		try {
			const activityFeed = UserManagementService.getActivityFeed();
			setActivities(activityFeed);
		} catch (error) {
			handleError(error, {
				logToServer: true,
				context: {
					component: "RecentActivityPanel",
					action: "load_activities",
				},
				fallbackMessage: "Failed to load recent activity",
			});
			setActivities([]); // Set empty array on error
		}
	}, []);

	useEffect(() => {
		loadActivities();
	}, [loadActivities]);

	const filteredAndSortedActivities = useMemo(() => {
		let filtered = [...activities];

		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(activity) =>
					activity.action.toLowerCase().includes(query) ||
					(activity.metadata &&
						JSON.stringify(activity.metadata).toLowerCase().includes(query)),
			);
		}

		// Apply time filter
		const now = Date.now();
		switch (filterBy) {
			case "today":
				filtered = filtered.filter(
					(activity) =>
						now - new Date(activity.timestamp).getTime() < 24 * 60 * 60 * 1000,
				);
				break;
			case "week":
				filtered = filtered.filter(
					(activity) =>
						now - new Date(activity.timestamp).getTime() <
						7 * 24 * 60 * 60 * 1000,
				);
				break;
			case "month":
				filtered = filtered.filter(
					(activity) =>
						now - new Date(activity.timestamp).getTime() <
						30 * 24 * 60 * 60 * 1000,
				);
				break;
		}

		// Sort by recency (default)
		filtered.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);

		return filtered;
	}, [activities, filterBy, searchQuery]);

	return (
		<div className="recent-activity-panel">
			<div className="recent-activity-header">
				<div className="recent-activity-title">
					<Calendar className="w-5 h-5" />
					<span>Recent Activity</span>
				</div>
				<div className="recent-activity-actions">
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
			<div className="recent-activity-filters p-3 border-b">
				<div className="relative mb-2">
					<input
						type="text"
						placeholder="Search in activity..."
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
							<option value="type">By type</option>
						</select>
						<Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
					</div>
				</div>
			</div>

			<div className="recent-activity-content flex-1">
				{filteredAndSortedActivities.length === 0 ? (
					<div className="empty-state">
						<Calendar className="w-12 h-12 text-gray-300" />
						{searchQuery ? (
							<>
								<p>No matching activity</p>
								<p className="text-sm text-gray-500">
									No activities match "{searchQuery}"
								</p>
							</>
						) : (
							<>
								<p>No recent activity</p>
								<p className="text-sm text-gray-500">
									Your recent actions will appear here
								</p>
							</>
						)}
					</div>
				) : (
					<List
						height={600}
						itemCount={filteredAndSortedActivities.length}
						itemSize={80}
						itemData={filteredAndSortedActivities}
						overscanCount={5}
					>
						{ActivityItem}
					</List>
				)}
			</div>

			<style>{`
        .recent-activity-panel {
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

        .recent-activity-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .recent-activity-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 1.125rem;
        }

        .recent-activity-actions {
          display: flex;
          gap: 0.5rem;
        }

        .close-btn {
          padding: 0.5rem;
          border-radius: 0.375rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .recent-activity-content {
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

        .recent-activity-item {
          margin-bottom: 0.25rem;
        }

        .recent-activity-entry {
          display: flex;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.5rem;
          background: transparent;
          text-align: left;
        }

        .activity-icon {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
          background: #f3f4f6;
          font-size: 16px;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-description {
          font-size: 0.875rem;
          color: #1f2937;
        }

        .activity-action {
          font-weight: 500;
        }

        .activity-resource {
          color: #6b7280;
        }

        @media (max-width: 640px) {
          .recent-activity-panel {
            max-width: 100%;
          }
        }
      `}</style>
		</div>
	);
};
