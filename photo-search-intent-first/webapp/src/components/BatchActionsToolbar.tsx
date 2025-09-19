import {
	Copy,
	Download,
	Edit3,
	Eye,
	FileUp,
	FolderPlus,
	Heart,
	MoreHorizontal,
	RotateCcw,
	Share2,
	Star,
	Tag,
	Trash2,
} from "lucide-react";
import { useState } from "react";

interface BatchActionsToolbarProps {
	selectedCount: number;
	onAction: (action: string, options?: Record<string, unknown>) => void;
	onClearSelection: () => void;
}

export function BatchActionsToolbar({
	selectedCount,
	onAction,
	onClearSelection,
}: BatchActionsToolbarProps) {
	const [showMoreActions, setShowMoreActions] = useState(false);
	const [showTagModal, setShowTagModal] = useState(false);
	const [showRatingModal, setShowRatingModal] = useState(false);
	const [showCollectionModal, setShowCollectionModal] = useState(false);
	const [tagInput, setTagInput] = useState("");
	const [ratingValue, setRatingValue] = useState(0);
	const [collectionName, setCollectionName] = useState("");

	const handleTagAction = () => {
		if (tagInput.trim()) {
			onAction("tag", { tags: tagInput.split(",").map((t) => t.trim()) });
			setTagInput("");
			setShowTagModal(false);
		}
	};

	const handleRatingAction = () => {
		onAction("rate", { rating: ratingValue });
		setRatingValue(0);
		setShowRatingModal(false);
	};

	const handleCollectionAction = () => {
		if (collectionName.trim()) {
			onAction("addToCollection", { collection: collectionName.trim() });
			setCollectionName("");
			setShowCollectionModal(false);
		}
	};

	// Primary actions that are always visible
	const primaryActions: Array<{
		id: string;
		label: string;
		icon: JSX.Element;
		action: string | (() => void);
	}> = [
		{
			id: "favorite",
			label: "Favorite",
			icon: <Heart className="w-4 h-4" />,
			action: "favorite",
		},
		{
			id: "tag",
			label: "Tag",
			icon: <Tag className="w-4 h-4" />,
			action: () => setShowTagModal(true),
		},
		{
			id: "rate",
			label: "Rate",
			icon: <Star className="w-4 h-4" />,
			action: () => setShowRatingModal(true),
		},
		{
			id: "collection",
			label: "Add to Collection",
			icon: <FolderPlus className="w-4 h-4" />,
			action: () => setShowCollectionModal(true),
		},
	];

	// Secondary actions in the dropdown (string actions only)
	const moreActions: Array<{
		id: string;
		label: string;
		icon: JSX.Element;
		action: string;
		danger?: boolean;
	}> = [
		{
			id: "share",
			label: "Share",
			icon: <Share2 className="w-4 h-4" />,
			action: "share",
		},
		{
			id: "download",
			label: "Download",
			icon: <Download className="w-4 h-4" />,
			action: "download",
		},
		{
			id: "copy",
			label: "Copy",
			icon: <Copy className="w-4 h-4" />,
			action: "copy",
		},
		{
			id: "move",
			label: "Move",
			icon: <FileUp className="w-4 h-4" />,
			action: "move",
		},
		{
			id: "edit",
			label: "Edit",
			icon: <Edit3 className="w-4 h-4" />,
			action: "edit",
		},
		{
			id: "view",
			label: "View Details",
			icon: <Eye className="w-4 h-4" />,
			action: "view",
		},
		{
			id: "restore",
			label: "Restore",
			icon: <RotateCcw className="w-4 h-4" />,
			action: "restore",
		},
		{
			id: "delete",
			label: "Delete",
			icon: <Trash2 className="w-4 h-4" />,
			action: "delete",
			danger: true,
		},
	];

	return (
		<div className="batch-actions-toolbar">
			<div className="toolbar-content flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
				<div className="flex items-center gap-3">
					<div className="text-sm font-medium">{selectedCount} selected</div>
					<button
						type="button"
						onClick={onClearSelection}
						className="text-sm text-gray-600 hover:text-gray-800"
					>
						Clear
					</button>
				</div>

				<div className="flex items-center gap-2">
					{primaryActions.map((action) => {
						const handleClick = () => {
							if (typeof action.action === "string") {
								onAction(action.action);
							} else {
								action.action();
							}
						};
						return (
							<button
								key={action.id}
								type="button"
								onClick={handleClick}
								className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
								title={action.label}
							>
								{action.icon}
								<span className="hidden sm:inline">{action.label}</span>
							</button>
						);
					})}

					<div className="relative">
						<button
							type="button"
							onClick={() => setShowMoreActions(!showMoreActions)}
							className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
						>
							<MoreHorizontal className="w-4 h-4" />
							<span className="hidden sm:inline">More</span>
						</button>

						{showMoreActions && (
							<>
								{/* Backdrop to close the menu */}
								<button
									type="button"
									className="fixed inset-0 z-10 cursor-default"
									aria-label="Close menu"
									onClick={() => setShowMoreActions(false)}
									onKeyDown={(e) => {
										if (
											e.key === "Escape" ||
											e.key === "Enter" ||
											e.key === " "
										) {
											setShowMoreActions(false);
										}
									}}
								>
									<span className="sr-only">Close menu</span>
								</button>
								<div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border z-20">
									<div className="py-1">
										{moreActions.map((action) => {
											const handleClick = () => {
												onAction(action.action);
												setShowMoreActions(false);
											};
											return (
												<button
													key={action.id}
													type="button"
													onClick={handleClick}
													className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
														action.danger ? "text-red-600 hover:bg-red-50" : ""
													}`}
												>
													{action.icon}
													{action.label}
												</button>
											);
										})}
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Tag Modal */}
			{showTagModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
						<div className="p-4 border-b">
							<h3 className="font-semibold flex items-center gap-2">
								<Tag className="w-5 h-5" />
								Add Tags
							</h3>
						</div>
						<div className="p-4">
							<input
								type="text"
								value={tagInput}
								onChange={(e) => setTagInput(e.target.value)}
								placeholder="Enter tags separated by commas"
								className="w-full border rounded px-3 py-2"
								onKeyDown={(e) => {
									if (e.key === "Enter") handleTagAction();
								}}
							/>
							<div className="text-xs text-gray-500 mt-1">
								Example: vacation, family, beach
							</div>
						</div>
						<div className="flex justify-end gap-2 p-4 border-t">
							<button
								type="button"
								onClick={() => setShowTagModal(false)}
								className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleTagAction}
								className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
								disabled={!tagInput.trim()}
							>
								Add Tags
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Rating Modal */}
			{showRatingModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
						<div className="p-4 border-b">
							<h3 className="font-semibold flex items-center gap-2">
								<Star className="w-5 h-5" />
								Rate Photos
							</h3>
						</div>
						<div className="p-4">
							<div className="flex justify-center gap-1">
								{[1, 2, 3, 4, 5].map((star) => (
									<button
										key={star}
										type="button"
										onClick={() => setRatingValue(star)}
										className="text-2xl focus:outline-none"
									>
										{star <= ratingValue ? (
											<Star className="w-8 h-8 text-yellow-500 fill-current" />
										) : (
											<Star className="w-8 h-8 text-gray-300" />
										)}
									</button>
								))}
							</div>
							<div className="text-center text-sm text-gray-600 mt-2">
								{ratingValue > 0
									? `${ratingValue} star${ratingValue > 1 ? "s" : ""}`
									: "Select rating"}
							</div>
						</div>
						<div className="flex justify-end gap-2 p-4 border-t">
							<button
								type="button"
								onClick={() => setShowRatingModal(false)}
								className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleRatingAction}
								className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
								disabled={ratingValue === 0}
							>
								Apply Rating
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Collection Modal */}
			{showCollectionModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
						<div className="p-4 border-b">
							<h3 className="font-semibold flex items-center gap-2">
								<FolderPlus className="w-5 h-5" />
								Add to Collection
							</h3>
						</div>
						<div className="p-4">
							<input
								type="text"
								value={collectionName}
								onChange={(e) => setCollectionName(e.target.value)}
								placeholder="Enter collection name"
								className="w-full border rounded px-3 py-2"
								onKeyDown={(e) => {
									if (e.key === "Enter") handleCollectionAction();
								}}
							/>
							<div className="text-xs text-gray-500 mt-1">
								Create a new collection or add to an existing one
							</div>
						</div>
						<div className="flex justify-end gap-2 p-4 border-t">
							<button
								type="button"
								onClick={() => setShowCollectionModal(false)}
								className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleCollectionAction}
								className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
								disabled={!collectionName.trim()}
							>
								Add to Collection
							</button>
						</div>
					</div>
				</div>
			)}

			<style>{`
        .batch-actions-toolbar {
          position: fixed;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          width: 90%;
          max-width: 800px;
        }

        @media (max-width: 640px) {
          .batch-actions-toolbar {
            width: 95%;
            bottom: 0.5rem;
          }
        }
      `}</style>
		</div>
	);
}
