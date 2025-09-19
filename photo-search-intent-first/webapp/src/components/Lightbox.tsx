import type {
	MouseEvent as ReactMouseEvent,
	TouchEvent as ReactTouchEvent,
	WheelEvent as ReactWheelEvent,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiMetadataDetail, thumbUrl } from "../api";
import type { PhotoMeta } from "../models/PhotoMeta";
import { ImageEditor } from "../modules/ImageEditor";
import { useTouchGestures } from "../services/TouchGestureService";
import { FaceVerificationPanel } from "./FaceVerificationPanel";
import { QualityOverlay } from "./QualityOverlay";

export function Lightbox({
	dir,
	engine,
	path,
	onPrev,
	onNext,
	onClose,
	onReveal,
	onFavorite,
	onMoreLikeThis,
}: {
	dir: string;
	engine: string;
	path: string;
	onPrev: () => void;
	onNext: () => void;
	onClose: () => void;
	onReveal: () => void;
	onFavorite: () => void;
	onMoreLikeThis?: () => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const [scale, setScale] = useState(1);
	const [tx, setTx] = useState(0);
	const [ty, setTy] = useState(0);
	const [panning, setPanning] = useState(false);
	const panOrigin = useRef<{ x: number; y: number; tx: number; ty: number }>({
		x: 0,
		y: 0,
		tx: 0,
		ty: 0,
	});
	const [showInfo, setShowInfo] = useState(false);
	const [infoLoading, setInfoLoading] = useState(false);
	const [info, setInfo] = useState<PhotoMeta | null>(null);
	const [showEditor, setShowEditor] = useState(false);
	const [_editedImagePath, setEditedImagePath] = useState<string>(path);
	const [showQuality, setShowQuality] = useState(false);
	const [showFacePanel, setShowFacePanel] = useState(false);
	const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [isSwiping, setIsSwiping] = useState(false);

	// Enhanced touch gesture handling
	const touchGestureService = useTouchGestures(containerRef, {
		minSwipeDistance: 50,
		maxSwipeTime: 300,
		maxScale: 5,
		minScale: 0.5,
		doubleTapZoom: 2,
		enablePullToRefresh: false,
	});

	// Gesture callbacks are registered after zoom/resetZoom are defined below

	const zoom = useCallback(
		(delta: number, cx?: number, cy?: number) => {
			const prev = scale;
			const next = Math.min(5, Math.max(1, +(prev + delta).toFixed(2)));
			if (next === prev) return;
			// Zoom towards cursor point
			const img = imgRef.current;
			if (img && cx !== undefined && cy !== undefined) {
				const rect = img.getBoundingClientRect();
				const px = cx - rect.left;
				const py = cy - rect.top;
				const k = next / prev;
				setTx(tx + (px - px * k));
				setTy(ty + (py - py * k));
			}
			setScale(next);
		},
		[scale, tx, ty],
	);

	function onWheel(e: ReactWheelEvent) {
		e.preventDefault();
		const delta = e.deltaY < 0 ? 0.1 : -0.1;
		zoom(delta, e.clientX, e.clientY);
	}

	function onMouseDown(e: ReactMouseEvent) {
		if (scale === 1) return;
		setPanning(true);
		panOrigin.current = { x: e.clientX, y: e.clientY, tx, ty };
	}
	function onMouseMove(e: ReactMouseEvent) {
		if (!panning) return;
		const dx = e.clientX - panOrigin.current.x;
		const dy = e.clientY - panOrigin.current.y;
		setTx(panOrigin.current.tx + dx);
		setTy(panOrigin.current.ty + dy);
	}
	function onMouseUp() {
		setPanning(false);
	}
	function onMouseLeave() {
		setPanning(false);
	}

	const resetZoom = useCallback(() => {
		setScale(1);
		setTx(0);
		setTy(0);
	}, []);
	function zoomIn() {
		zoom(0.2);
	}
	function zoomOut() {
		zoom(-0.2);
	}

	// Set up gesture callbacks (after zoom/resetZoom are declared)
	useEffect(() => {
		if (!touchGestureService) return;

		touchGestureService
			.onSwipe((direction) => {
				if (direction.left) onNext();
				else if (direction.right) onPrev();
			})
			.onPinch((newScale, centerX, centerY) => {
				zoom(newScale - scale, centerX, centerY);
			})
			.onDoubleTap((x, y) => {
				if (scale === 1) zoom(1, x, y);
				else resetZoom();
			});
	}, [touchGestureService, onPrev, onNext, scale, resetZoom, zoom]);

	function onDblClick(e: ReactMouseEvent) {
		if (scale === 1) zoom(1, e.clientX, e.clientY);
		else resetZoom();
	}

	// Touch/swipe gesture handlers for mobile navigation
	function onTouchStart(e: ReactTouchEvent) {
		if (e.touches.length === 1) {
			const touch = e.touches[0];
			setTouchStart({ x: touch.clientX, y: touch.clientY });
			setIsSwiping(false);
		}
	}

	function onTouchMove(e: ReactTouchEvent) {
		if (!touchStart || e.touches.length !== 1) return;

		const touch = e.touches[0];
		const deltaX = touch.clientX - touchStart.x;
		const deltaY = touch.clientY - touchStart.y;
		const absDeltaX = Math.abs(deltaX);
		const absDeltaY = Math.abs(deltaY);

		// Determine if horizontal swipe (ignore vertical swipes)
		if (absDeltaX > absDeltaY && absDeltaX > 30) {
			setIsSwiping(true);
		}
	}

	function onTouchEnd(e: ReactTouchEvent) {
		if (!touchStart || !isSwiping) {
			setTouchStart(null);
			setIsSwiping(false);
			return;
		}

		const touch = e.changedTouches[0];
		const deltaX = touch.clientX - touchStart.x;
		const minSwipeDistance = 50; // Minimum distance for a valid swipe

		if (Math.abs(deltaX) > minSwipeDistance) {
			if (deltaX > 0) {
				// Swipe right - go to previous image
				onPrev();
			} else {
				// Swipe left - go to next image
				onNext();
			}
		}

		setTouchStart(null);
		setIsSwiping(false);
	}

	// Focus the dialog on open for accessibility
	useEffect(() => {
		containerRef.current?.focus();
	}, []);

	// Load metadata when info opens or path changes
	useEffect(() => {
		let cancelled = false;
		async function load() {
			if (!showInfo || !path) return;
			try {
				setInfoLoading(true);
				const r = await apiMetadataDetail(dir, path);
				if (!cancelled) setInfo((r?.meta as Partial<PhotoMeta>) || null);
			} catch {
				if (!cancelled) setInfo(null);
			} finally {
				if (!cancelled) setInfoLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [showInfo, dir, path]);

	if (!path) return null;

	return (
		<div
			className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					e.stopPropagation();
					onClose();
				}
			}}
			role="dialog"
			tabIndex={-1}
		>
			<div
				className="relative max-w-6xl w-full p-4"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				ref={containerRef}
				role="dialog"
				aria-modal="true"
				aria-label={path}
				tabIndex={-1}
			>
				<div className="flex items-center justify-between mb-2 text-white">
					<div className="truncate text-sm">{path}</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onPrev}
							className="bg-white/20 rounded px-2 py-1"
						>
							◀
						</button>
						<button
							type="button"
							onClick={onNext}
							className="bg-white/20 rounded px-2 py-1"
						>
							▶
						</button>
						<button
							type="button"
							onClick={() => setShowInfo((v) => !v)}
							className={`rounded px-2 py-1 ${showInfo ? "bg-blue-600 text-white" : "bg-white/20"}`}
						>
							Info
						</button>
						<button
							type="button"
							onClick={() => setShowQuality((v) => !v)}
							className={`rounded px-2 py-1 ${showQuality ? "bg-green-600 text-white" : "bg-white/20"}`}
						>
							Quality
						</button>
						<button
							type="button"
							onClick={() => setShowFacePanel((v) => !v)}
							className={`rounded px-2 py-1 ${showFacePanel ? "bg-purple-600 text-white" : "bg-white/20"}`}
						>
							Faces
						</button>
						<button
							type="button"
							onClick={onClose}
							className="bg-white text-black rounded px-2 py-1"
						>
							Close
						</button>
					</div>
				</div>
				<div
					className="relative bg-black/40 rounded overflow-hidden"
					onWheel={onWheel}
					onMouseDown={onMouseDown}
					onMouseMove={onMouseMove}
					onMouseUp={onMouseUp}
					onMouseLeave={onMouseLeave}
					onDoubleClick={onDblClick}
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onTouchEnd}
					onKeyDown={(e) => {
						if (e.key === "ArrowLeft") onPrev();
						else if (e.key === "ArrowRight") onNext();
					}}
					role="img"
					aria-label="Image viewer"
					style={{
						cursor:
							scale > 1 && panning
								? "grabbing"
								: scale > 1
									? "grab"
									: "default",
					}}
				>
					<img
						ref={imgRef}
						src={thumbUrl(dir, engine, path, 1024)}
						className="w-full h-auto select-none"
						style={{
							transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
							transformOrigin: "0 0",
						}}
						alt={path}
						draggable={false}
					/>
					<QualityOverlay imagePath={path} show={showQuality} />
				</div>
				<div className="mt-3 flex flex-wrap gap-2 items-center">
					<div className="flex items-center gap-2 bg-white/10 rounded p-1">
						<button
							type="button"
							onClick={zoomOut}
							className="px-2 py-1 bg-white/20 text-white rounded"
						>
							−
						</button>
						<div className="text-white text-sm w-12 text-center">
							{Math.round(scale * 100)}%
						</div>
						<button
							type="button"
							onClick={zoomIn}
							className="px-2 py-1 bg-white/20 text-white rounded"
						>
							+
						</button>
						<button
							type="button"
							onClick={resetZoom}
							className="px-2 py-1 bg-white/20 text-white rounded"
						>
							Reset
						</button>
					</div>
					<button
						type="button"
						onClick={onReveal}
						className="px-3 py-1 bg-gray-200 rounded"
					>
						Reveal in Finder/Explorer
					</button>
					<button
						type="button"
						onClick={() => setShowEditor(true)}
						className="px-3 py-1 bg-green-600 text-white rounded"
					>
						✏️ Edit
					</button>
					<button
						type="button"
						onClick={onFavorite}
						className="px-3 py-1 bg-pink-600 text-white rounded"
					>
						♥ Favorite
					</button>
					{onMoreLikeThis && (
						<button
							type="button"
							onClick={onMoreLikeThis}
							className="px-3 py-1 bg-blue-600 text-white rounded"
						>
							More like this
						</button>
					)}
				</div>

				{showInfo && (
					<div className="mt-3 bg-white text-gray-900 rounded p-3 max-h-72 overflow-auto">
						{infoLoading ? (
							<div className="text-sm text-gray-600">Loading EXIF…</div>
						) : info ? (
							<div className="grid grid-cols-2 gap-3 text-sm">
								{info.camera && (
									<div>
										<div className="text-gray-500">Camera</div>
										<div className="font-medium">{info.camera}</div>
									</div>
								)}
								{info.lens && (
									<div>
										<div className="text-gray-500">Lens</div>
										<div className="font-medium">{info.lens}</div>
									</div>
								)}
								{info.iso && (
									<div>
										<div className="text-gray-500">ISO</div>
										<div className="font-medium">{info.iso}</div>
									</div>
								)}
								{info.fnumber && (
									<div>
										<div className="text-gray-500">Aperture</div>
										<div className="font-medium">f/{info.fnumber}</div>
									</div>
								)}
								{info.shutter && (
									<div>
										<div className="text-gray-500">Shutter</div>
										<div className="font-medium">{info.shutter}</div>
									</div>
								)}
								{typeof info.datetime === "number" && (
									<div>
										<div className="text-gray-500">Date</div>
										<div className="font-medium">
											{new Date(info.datetime * 1000).toLocaleString()}
										</div>
									</div>
								)}
								{info.place && (
									<div className="col-span-2">
										<div className="text-gray-500">Place</div>
										<div className="font-medium">{info.place}</div>
									</div>
								)}
								{Array.isArray(info.tags) && info.tags.length > 0 && (
									<div className="col-span-2">
										<div className="text-gray-500">Tags</div>
										<div className="mt-1 flex flex-wrap gap-1">
											{info.tags.map((t: string) => (
												<span
													key={t}
													className="px-2 py-0.5 bg-gray-100 rounded text-xs"
												>
													{t}
												</span>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="text-sm text-gray-600">No metadata.</div>
						)}
					</div>
				)}

				{showFacePanel && (
					<div className="mt-3 bg-white text-gray-900 rounded p-3">
						<FaceVerificationPanel
							imagePath={path}
							detectedFaces={info?.faces || []}
							knownPeople={new Map()}
							onVerify={(clusterId, verified) => {
								console.log("Face verified:", clusterId, verified);
							}}
							onCreateNew={(name) => {
								console.log("New person created:", name);
							}}
						/>
					</div>
				)}

				{showEditor && (
					<ImageEditor
						imagePath={path}
						onSave={(editedPath) => {
							setEditedImagePath(editedPath);
							setShowEditor(false);
						}}
						onClose={() => setShowEditor(false)}
					/>
				)}
			</div>
		</div>
	);
}
