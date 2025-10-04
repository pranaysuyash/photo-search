import {
	BarChart3,
	PieChart,
	TrendingUp,
	Activity,
	FileImage,
	HardDrive,
	FolderPlus,
	Palette,
	Calendar,
	X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";

interface CollectionInsights {
	overview: {
		totalCollections: number;
		totalPhotos: number;
		avgPhotosPerCollection: number;
		totalEstimatedStorage: number;
	};
	collections: {
		largest: { name: string; count: number; estimatedSize: number } | null;
		smallest: { name: string; count: number; estimatedSize: number } | null;
		sortedBySize: { name: string; count: number; estimatedSize: number }[];
	};
	themes: Record<string, number>;
	recentActivity: string[];
}

interface AnalyticsModalProps {
	isOpen: boolean;
	onClose: () => void;
	insights: CollectionInsights;
	collections: Record<string, string[]>;
}

export function AnalyticsModal({ isOpen, onClose, insights, collections }: AnalyticsModalProps) {
	const StatCard = ({
		icon: Icon,
		title,
		value,
		bgColor,
		iconColor
	}: {
		icon: any;
		title: string;
		value: string | number;
		bgColor: string;
		iconColor: string;
	}) => (
		<div className={`${bgColor} p-4 rounded-lg`}>
			<div className="flex items-center gap-2 mb-2">
				<Icon className={`w-5 h-5 ${iconColor}`} />
				<span className={`text-sm font-medium ${iconColor}`}>{title}</span>
			</div>
			<div className="text-2xl font-bold text-gray-900">{value}</div>
		</div>
	);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<BarChart3 className="w-6 h-6 text-blue-600" />
						Collection Insights & Analytics
					</DialogTitle>
				</DialogHeader>

				{insights.overview.totalCollections > 0 ? (
					<div className="space-y-6">
						{/* Overview Stats */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<StatCard
								icon={FolderPlus}
								title="Collections"
								value={insights.overview.totalCollections}
								bgColor="bg-blue-50"
								iconColor="text-blue-600"
							/>
							<StatCard
								icon={FileImage}
								title="Total Photos"
								value={insights.overview.totalPhotos}
								bgColor="bg-green-50"
								iconColor="text-green-600"
							/>
							<StatCard
								icon={TrendingUp}
								title="Avg per Collection"
								value={insights.overview.avgPhotosPerCollection}
								bgColor="bg-purple-50"
								iconColor="text-purple-600"
							/>
							<StatCard
								icon={HardDrive}
								title="Est. Storage"
								value={`${insights.overview.totalEstimatedStorage} MB`}
								bgColor="bg-orange-50"
								iconColor="text-orange-600"
							/>
						</div>

						{/* Collection Size Analysis */}
						<div className="bg-gray-50 p-6 rounded-lg">
							<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<PieChart className="w-5 h-5 text-indigo-600" />
								Collection Size Analysis
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{insights.collections.largest && (
									<div>
										<h5 className="font-medium text-gray-700 mb-2">Largest Collection</h5>
										<div className="bg-white p-4 rounded border">
											<div className="font-medium text-gray-900">{insights.collections.largest.name}</div>
											<div className="text-sm text-gray-600">{insights.collections.largest.count} photos</div>
											<div className="text-xs text-gray-500">{insights.collections.largest.estimatedSize.toFixed(1)} MB</div>
										</div>
									</div>
								)}
								{insights.collections.smallest && (
									<div>
										<h5 className="font-medium text-gray-700 mb-2">Smallest Collection</h5>
										<div className="bg-white p-4 rounded border">
											<div className="font-medium text-gray-900">{insights.collections.smallest.name}</div>
											<div className="text-sm text-gray-600">{insights.collections.smallest.count} photos</div>
											<div className="text-xs text-gray-500">{insights.collections.smallest.estimatedSize.toFixed(1)} MB</div>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Top Collections by Size */}
						<div className="bg-gray-50 p-6 rounded-lg">
							<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Activity className="w-5 h-5 text-green-600" />
								Top Collections by Size
							</h4>
							<div className="space-y-2">
								{insights.collections.sortedBySize.slice(0, 5).map((collection, index) => (
									<div key={collection.name} className="flex items-center justify-between bg-white p-3 rounded border">
										<div className="flex items-center gap-3">
											<span className="text-sm font-medium text-gray-500">#{index + 1}</span>
											<span className="font-medium text-gray-900">{collection.name}</span>
										</div>
										<div className="text-right">
											<div className="text-sm font-medium text-gray-900">{collection.count} photos</div>
											<div className="text-xs text-gray-500">{collection.estimatedSize.toFixed(1)} MB</div>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Theme Distribution */}
						{Object.keys(insights.themes).length > 0 && (
							<div className="bg-gray-50 p-6 rounded-lg">
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<Palette className="w-5 h-5 text-pink-600" />
									Theme Distribution
								</h4>
								<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
									{Object.entries(insights.themes).map(([theme, count]) => (
										<div key={theme} className="bg-white p-3 rounded border text-center">
											<div className="font-medium text-gray-900 capitalize">{theme}</div>
											<div className="text-sm text-gray-600">{count} collection{count !== 1 ? 's' : ''}</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Recent Activity */}
						{insights.recentActivity.length > 0 && (
							<div className="bg-gray-50 p-6 rounded-lg">
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<Calendar className="w-5 h-5 text-blue-600" />
									Recent Activity
								</h4>
								<div className="space-y-2">
									{insights.recentActivity.map((collectionName, index) => (
										<div key={collectionName} className="flex items-center gap-3 bg-white p-3 rounded border">
											<span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Recent</span>
											<span className="font-medium text-gray-900">{collectionName}</span>
											<span className="text-sm text-gray-500">({collections[collectionName]?.length || 0} photos)</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="text-center py-12">
						<BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
						<h4 className="text-lg font-medium text-gray-900 mb-2">No Collections Yet</h4>
						<p className="text-gray-600">Create your first collection to see insights and analytics.</p>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}