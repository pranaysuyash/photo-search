import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { CollectionsViewContainer } from "../../views/CollectionsViewContainer";
import { LibraryView as LibraryContainer } from "../../views/LibraryView";
import { PeopleViewContainer } from "../../views/PeopleViewContainer";
import { ResultsView } from "../../views/ResultsView";
import { SavedViewContainer } from "../../views/SavedViewContainer";
import { SuspenseFallback } from "../SuspenseFallback";

const MapView = lazy(() => import("../MapView"));
const SmartCollections = lazy(() => import("../SmartCollections"));
const TripsView = lazy(() => import("../TripsView"));
const VideoManager = lazy(() =>
	import("../VideoManager").then((m) => ({
		default: m.VideoManager,
	})),
);

export interface RoutesHostProps {
	dir?: string;
	engine?: string;
	library?: string[];
	libState: {
		isIndexing: boolean;
		progressPct: number;
		etaSeconds: number;
	};
	results: Array<{ path: string; score: number }>;
	searchId: string | null;
	searchText: string;
	altSearch: { active: boolean; applied: string; original: string };
	ratingMap: Record<string, number>;
	showInfoOverlay: boolean;
	busy: boolean;
	selected: Set<string>;
	tagsMap: Record<string, string[]>;
	smart: Record<string, unknown>;
	topK: number;
	query: string;
	favOnly: boolean;
	tagFilter: string;
	useCaps: boolean;
	useOcr: boolean;
	hasText: boolean;
	camera: string;
	isoMin: string;
	isoMax: string;
	fMin: string;
	fMax: string;
	place: string;
	persons: string[];
	hasMore: boolean;
	isLoading: boolean;
	onSelectLibrary: () => void;
	onRunDemo: () => Promise<void>;
	onOpenHelp: () => void;
	onLoadLibrary: () => void;
	onCompleteOnboardingStep: (step: string) => void;
	onToggleSelect: (path: string) => void;
	onOpen: (path: string) => void;
	openDetailByPath: (path: string) => void;
	scrollContainerRef: React.RefObject<HTMLDivElement>;
	setSearchText: (text: string) => void;
	onSearchNow: (text: string) => void;
	onLayout: (rows: number[][]) => void;
	onOpenFilters: () => void;
	onOpenAdvanced: () => void;
	setSmart: (smart: Record<string, unknown>) => void;
	setResults: (results: Array<{ path: string; score: number }>) => void;
	setSearchId: (id: string) => void;
	setNote: (note: string) => void;
	setBusy: (busy: string | boolean) => void;
	setTopK: (topK: number) => void;
}

export function RoutesHost({
	dir,
	engine,
	library,
	libState,
	results,
	searchId,
	searchText,
	altSearch,
	ratingMap,
	showInfoOverlay,
	busy,
	selected,
	tagsMap,
	smart,
	topK,
	query,
	favOnly,
	tagFilter,
	useCaps,
	useOcr,
	hasText,
	camera,
	isoMin,
	isoMax,
	fMin,
	fMax,
	place,
	persons,
	hasMore,
	isLoading,
	onSelectLibrary,
	onRunDemo,
	onOpenHelp,
	onLoadLibrary,
	onCompleteOnboardingStep,
	onToggleSelect,
	onOpen,
	openDetailByPath,
	scrollContainerRef,
	setSearchText,
	onSearchNow,
	onLayout,
	onOpenFilters,
	onOpenAdvanced,
	setSmart,
	setResults,
	setSearchId,
	setNote,
	setBusy,
	setTopK,
}: RoutesHostProps) {
	return (
		<Suspense fallback={<SuspenseFallback label="Loading…" />}>
			<Routes>
				<Route
					path="/people"
					element={<PeopleViewContainer onOpenHelp={onOpenHelp} />}
				/>
				<Route
					path="/collections"
					element={<CollectionsViewContainer onOpenHelp={onOpenHelp} />}
				/>
				<Route
					path="/library"
					element={
						<LibraryContainer
							dir={dir ?? ""}
							library={library ?? null}
							isIndexing={libState.isIndexing}
							progressPct={libState.progressPct}
							etaSeconds={libState.etaSeconds}
							onSelectLibrary={onSelectLibrary}
							onRunDemo={onRunDemo}
							onOpenHelp={onOpenHelp}
							onLoadLibrary={onLoadLibrary}
							hasMore={hasMore}
							isLoading={isLoading}
							selected={selected}
							onToggleSelect={onToggleSelect}
							onOpen={onOpen}
							tagsMap={tagsMap}
							onCompleteOnboardingStep={onCompleteOnboardingStep}
						/>
					}
				/>
				<Route
					path="/search"
					element={
						<ResultsView
							dir={dir ?? ""}
							engine={engine ?? "local"}
							results={results}
							searchId={searchId}
							searchText={searchText}
							altSearch={altSearch}
							ratingMap={ratingMap}
							showInfoOverlay={showInfoOverlay}
							isLoading={busy}
							openDetailByPath={openDetailByPath}
							scrollContainerRef={scrollContainerRef}
							setSearchText={setSearchText}
							onSearchNow={onSearchNow}
							onLayout={onLayout}
							onOpenHelp={onOpenHelp}
							onOpenFilters={onOpenFilters}
							onOpenAdvanced={onOpenAdvanced}
						/>
					}
				/>
				<Route
					path="/map"
					element={
						<div className="p-4">
							<MapView
								dir={dir ?? ""}
								engine={engine ?? "default"}
								points={[]} // TODO: pass points
								onLoadMap={() => {}} // TODO: pass loadMap
								selectedPhotos={selected}
								onPhotoSelect={onToggleSelect}
								onPhotoOpen={() => {}} // TODO: pass handlePhotoOpen
							/>
						</div>
					}
				/>
				<Route
					path="/smart"
					element={
						<div className="p-4">
							<SmartCollections
								dir={dir ?? ""}
								engine={engine ?? "local"}
								topK={topK}
								smart={smart}
								setSmart={setSmart}
								setResults={setResults}
								setSearchId={setSearchId}
								setNote={setNote}
								query={query}
								favOnly={favOnly}
								tagFilter={tagFilter}
								useCaps={useCaps}
								useOcr={useOcr}
								hasText={hasText}
								camera={camera}
								isoMin={isoMin}
								isoMax={isoMax}
								fMin={fMin}
								fMax={fMax}
								place={place}
								persons={persons}
							/>
						</div>
					}
				/>
				<Route
					path="/trips"
					element={
						<div className="p-4">
							<TripsView
								dir={dir ?? ""}
								engine={engine ?? "local"}
								setBusy={setBusy}
								setNote={setNote}
								setResults={setResults}
							/>
						</div>
					}
				/>
				<Route
					path="/videos"
					element={
						<div className="p-4">
							<VideoManager
								currentDir={dir ?? ""}
								provider={engine ?? "local"}
							/>
						</div>
					}
				/>
				<Route
					path="/saved"
					element={
						<SavedViewContainer
							onRun={(_name, q, k) => {
								if (q) setSearchText(q);
								if (k) setTopK(k);
								onSearchNow(q);
							}}
							onOpenHelp={onOpenHelp}
						/>
					}
				/>
			</Routes>
		</Suspense>
	);
}
