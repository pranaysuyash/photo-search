import type { FilterPreset } from "../../models/FilterPreset";
import { VideoService } from "../../services/VideoService";
import { FilterPanel } from "../FilterPanel";
import { Lightbox } from "../Lightbox";
import { VideoLightbox } from "../VideoLightbox";

export interface PanelsHostProps {
	dir?: string;
	engine?: string;
	results: Array<{ path: string; score: number }>;
	detailIdx: number | null;
	showFilters: boolean;
	favOnly: boolean;
	tagFilter: string;
	camera: string;
	isoMin: number;
	isoMax: number;
	dateFrom: string;
	dateTo: string;
	fMin: number;
	fMax: number;
	place: string;
	useCaps: boolean;
	useOcr: boolean;
	hasText: boolean;
	ratingMin: number;
	availableCameras: string[];
	yearRange: [number, number];
	filterPresets: FilterPreset[];
	onCloseFilters: () => void;
	onApplyFilters: () => void;
	onSetFavOnly: (favOnly: boolean) => void;
	onSetTagFilter: (tagFilter: string) => void;
	onSetCamera: (camera: string) => void;
	onSetIsoMin: (isoMin: number) => void;
	onSetIsoMax: (isoMax: number) => void;
	onSetDateFrom: (dateFrom: string) => void;
	onSetDateTo: (dateTo: string) => void;
	onSetFMin: (fMin: number) => void;
	onSetFMax: (fMax: number) => void;
	onSetPlace: (place: string) => void;
	onSetUseCaps: (useCaps: boolean) => void;
	onSetUseOcr: (useOcr: boolean) => void;
	onSetHasText: (hasText: boolean) => void;
	onSetRatingMin: (ratingMin: number) => void;
	onSavePreset: (preset: FilterPreset) => void;
	onLoadPreset: (preset: FilterPreset) => void;
	onDeletePreset: (presetId: string) => void;
	onNavDetail: (direction: number) => void;
	onCloseDetail: () => void;
	onReveal: (path: string) => Promise<void>;
	onFavorite: (path: string) => Promise<void>;
	onMoreLikeThis: (path: string) => Promise<void>;
}

export function PanelsHost({
	dir,
	engine,
	results,
	detailIdx,
	showFilters,
	favOnly,
	tagFilter,
	camera,
	isoMin,
	isoMax,
	dateFrom,
	dateTo,
	fMin,
	fMax,
	place,
	useCaps,
	useOcr,
	hasText,
	ratingMin,
	availableCameras,
	yearRange,
	filterPresets,
	onCloseFilters,
	onApplyFilters,
	onSetFavOnly,
	onSetTagFilter,
	onSetCamera,
	onSetIsoMin,
	onSetIsoMax,
	onSetDateFrom,
	onSetDateTo,
	onSetFMin,
	onSetFMax,
	onSetPlace,
	onSetUseCaps,
	onSetUseOcr,
	onSetHasText,
	onSetRatingMin,
	onSavePreset,
	onLoadPreset,
	onDeletePreset,
	onNavDetail,
	onCloseDetail,
	onReveal,
	onFavorite,
	onMoreLikeThis,
}: PanelsHostProps) {
	return (
		<>
			<FilterPanel
				show={showFilters}
				onClose={onCloseFilters}
				onApply={onApplyFilters}
				favOnly={favOnly}
				setFavOnly={onSetFavOnly}
				tagFilter={tagFilter}
				setTagFilter={onSetTagFilter}
				camera={camera}
				setCamera={onSetCamera}
				isoMin={String(isoMin || "")}
				setIsoMin={(value: string) => onSetIsoMin(parseFloat(value) || 0)}
				isoMax={String(isoMax || "")}
				setIsoMax={(value: string) => onSetIsoMax(parseFloat(value) || 0)}
				dateFrom={dateFrom}
				setDateFrom={onSetDateFrom}
				dateTo={dateTo}
				setDateTo={onSetDateTo}
				fMin={String(fMin || "")}
				setFMin={(value: string) => onSetFMin(parseFloat(value) || 0)}
				fMax={String(fMax || "")}
				setFMax={(value: string) => onSetFMax(parseFloat(value) || 0)}
				place={place}
				setPlace={onSetPlace}
				useCaps={useCaps}
				setUseCaps={onSetUseCaps}
				useOcr={useOcr}
				setUseOcr={onSetUseOcr}
				hasText={hasText}
				setHasText={onSetHasText}
				ratingMin={ratingMin}
				setRatingMin={onSetRatingMin}
				person=""
				setPerson={() => {}}
				collection=""
				setCollection={() => {}}
				color=""
				setColor={() => {}}
				orientation=""
				setOrientation={() => {}}
				availableCameras={availableCameras}
				yearRange={yearRange}
				filterPresets={filterPresets}
				onSavePreset={onSavePreset}
				onLoadPreset={onLoadPreset}
				onDeletePreset={onDeletePreset}
			/>

			{detailIdx !== null &&
				results &&
				results[detailIdx] &&
				(VideoService.isVideoFile(results[detailIdx].path) ? (
					<VideoLightbox
						videoPath={results[detailIdx].path}
						videoUrl={`/api/media/${encodeURIComponent(
							results[detailIdx].path,
						)}`}
						onPrevious={() => onNavDetail(-1)}
						onNext={() => onNavDetail(1)}
						onClose={onCloseDetail}
					/>
				) : (
					<Lightbox
						dir={dir ?? ""}
						engine={engine ?? "local"}
						path={results[detailIdx].path}
						onPrev={() => onNavDetail(-1)}
						onNext={() => onNavDetail(1)}
						onClose={onCloseDetail}
						onReveal={async () => {
							try {
								const path =
									results && detailIdx !== null
										? results[detailIdx]?.path
										: undefined;
								if (path && dir) await onReveal(path);
							} catch (error) {
								console.error("Failed to reveal file:", error);
							}
						}}
						onFavorite={async () => {
							try {
								const path =
									results && detailIdx !== null
										? results[detailIdx]?.path
										: undefined;
								if (path) await onFavorite(path);
							} catch (error) {
								console.error("Failed to favorite:", error);
							}
						}}
						onMoreLikeThis={async () => {
							try {
								const path =
									results && detailIdx !== null
										? results[detailIdx]?.path
										: undefined;
								if (!path) return;
								// TODO: Implement more like this logic
								await onMoreLikeThis(path);
							} catch (error) {
								console.error("Search failed:", error);
							}
						}}
					/>
				))}
		</>
	);
}
