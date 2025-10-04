import { ArrowLeft, Check } from "lucide-react";
import { Dialog, DialogContent } from "./dialog";
import { Button } from "./button";

interface CoverSelectorProps {
	isOpen: boolean;
	collectionName: string | null;
	photos: string[];
	currentCoverIndex: number;
	onClose: () => void;
	onSelectCover: (collectionName: string, index: number) => void;
	thumbUrl: (dir: string, engine: string, path: string, size: number) => string;
	dir: string;
	engine: string;
}

export function CoverSelector({
	isOpen,
	collectionName,
	photos,
	currentCoverIndex,
	onClose,
	onSelectCover,
	thumbUrl,
	dir,
	engine,
}: CoverSelectorProps) {
	if (!collectionName) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl w-full max-h-[80vh] overflow-hidden p-0">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={onClose}
							className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
						>
							<ArrowLeft className="w-5 h-5 text-gray-600" />
						</Button>
						<div>
							<h3 className="text-xl font-semibold text-gray-900">Choose Cover Photo</h3>
							<p className="text-sm text-gray-600 mt-1">
								Select a photo to represent the "{collectionName}" collection
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-500">
							Current: Photo {currentCoverIndex + 1}
						</span>
					</div>
				</div>

				<div className="p-6 overflow-y-auto max-h-[60vh]">
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{photos.map((photoPath, index) => {
							const isCurrentCover = currentCoverIndex === index;
							return (
								<button
									key={photoPath}
									type="button"
									onClick={() => onSelectCover(collectionName, index)}
									className={`relative group rounded-lg overflow-hidden transition-all duration-200 ${
										isCurrentCover
											? "ring-4 ring-blue-500 ring-offset-2"
											: "hover:ring-2 hover:ring-blue-300 hover:ring-offset-1"
									}`}
								>
									<div className="aspect-square">
										<img
											src={thumbUrl(dir, engine, photoPath, 150)}
											alt={`Photo ${index + 1}`}
											className="w-full h-full object-cover"
											loading="lazy"
										/>
									</div>

									{/* Current cover indicator */}
									{isCurrentCover && (
										<div className="absolute top-2 right-2 bg-blue-600 text-white p-1.5 rounded-full">
											<Check className="w-3 h-3" />
										</div>
									)}

									{/* Photo number */}
									<div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
										{index + 1}
									</div>

									{/* Hover overlay */}
									<div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
										<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
											<div className="bg-white text-blue-600 px-3 py-1.5 rounded-lg font-medium text-sm shadow-lg">
												{isCurrentCover ? "Current Cover" : "Set as Cover"}
											</div>
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				<div className="p-6 border-t border-gray-200 bg-gray-50">
					<div className="flex items-center justify-between">
						<p className="text-sm text-gray-600">
							{photos.length} photos in this collection
						</p>
						<Button onClick={onClose} className="bg-gray-600 text-white hover:bg-gray-700">
							Done
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}