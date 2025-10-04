import {
	FolderPlus,
	Share2,
	Download,
	Palette,
	Edit2,
	Edit3,
	Copy,
	Archive,
	Trash2,
} from "lucide-react";

interface ContextMenuPosition {
	x: number;
	y: number;
	collectionName: string;
}

interface CollectionContextMenuProps {
	contextMenu: ContextMenuPosition | null;
	collections: Record<string, string[]>;
	onAction: (action: string, collectionName: string) => void;
	showDelete?: boolean;
}

export function CollectionContextMenu({
	contextMenu,
	collections,
	onAction,
	showDelete = false,
}: CollectionContextMenuProps) {
	if (!contextMenu) return null;

	const hasPhotos = collections[contextMenu.collectionName]?.length > 0;

	return (
		<div
			className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-2 min-w-48"
			style={{
				left: Math.min(contextMenu.x, window.innerWidth - 200),
				top: Math.min(contextMenu.y, window.innerHeight - 400),
			}}
		>
			<div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
				{contextMenu.collectionName}
			</div>

			<button
				type="button"
				onClick={() => onAction("open", contextMenu.collectionName)}
				className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
			>
				<FolderPlus className="w-4 h-4" />
				Open Collection
			</button>

			<div className="border-t border-gray-100 my-1" />

			<button
				type="button"
				onClick={() => onAction("share", contextMenu.collectionName)}
				className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={!hasPhotos}
			>
				<Share2 className="w-4 h-4" />
				Share
			</button>

			<button
				type="button"
				onClick={() => onAction("export", contextMenu.collectionName)}
				className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={!hasPhotos}
			>
				<Download className="w-4 h-4" />
				Export
			</button>

			<div className="border-t border-gray-100 my-1" />

			<button
				type="button"
				onClick={() => onAction("theme", contextMenu.collectionName)}
				className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
			>
				<Palette className="w-4 h-4" />
				Change Theme
			</button>

			<button
				type="button"
				onClick={() => onAction("cover", contextMenu.collectionName)}
				className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={!hasPhotos}
			>
				<Edit2 className="w-4 h-4" />
				Change Cover
			</button>

			<button
				type="button"
				onClick={() => onAction("rename", contextMenu.collectionName)}
				className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
			>
				<Edit3 className="w-4 h-4" />
				Rename
			</button>

			<button
				type="button"
				onClick={() => onAction("duplicate", contextMenu.collectionName)}
				className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
			>
				<Copy className="w-4 h-4" />
				Duplicate
			</button>

			<button
				type="button"
				onClick={() => onAction("archive", contextMenu.collectionName)}
				className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
			>
				<Archive className="w-4 h-4" />
				Archive
			</button>

			<div className="border-t border-gray-100 my-1" />

			{showDelete && (
				<button
					type="button"
					onClick={() => onAction("delete", contextMenu.collectionName)}
					className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
				>
					<Trash2 className="w-4 h-4" />
					Delete
				</button>
			)}
		</div>
	);
}