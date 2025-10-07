import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

// Helper function to extract location points from library data
function getLocationPoints(
  library?: string[],
  results?: Array<{ path: string; score: number }>
): { lat: number; lon: number }[] {
  // For now, return sample location data
  // In a real implementation, this would parse EXIF GPS data from photos
  const samplePoints = [
    { lat: 37.7749, lon: -122.4194 }, // San Francisco
    { lat: 40.7128, lon: -74.006 }, // New York
    { lat: 34.0522, lon: -118.2437 }, // Los Angeles
    { lat: 51.5074, lon: -0.1278 }, // London
    { lat: 48.8566, lon: 2.3522 }, // Paris
  ];

  // Return subset based on available photos
  const photoCount = Math.min(library?.length || 0, results?.length || 0);
  return samplePoints.slice(
    0,
    Math.max(1, Math.min(photoCount, samplePoints.length))
  );
}
import { CollectionsViewContainer } from "../../views/CollectionsViewContainer";
import { LibraryView as LibraryContainer } from "../../views/LibraryView";
import { PeopleViewContainer } from "../../views/PeopleViewContainer";
import { ResultsView } from "../../views/ResultsView";
import { SavedViewContainer } from "../../views/SavedViewContainer";
import { SuspenseFallback } from "../SuspenseFallback";

const MapView = lazy(() => import("../MapView"));
const SmartDiscovery = lazy(() => import("../SmartDiscovery"));
const AutoCurationPanel = lazy(() => import("../AutoCurationPanel"));
const VisualTools = lazy(() => import("../VisualTools"));
const CollaborativeWorkspace = lazy(() => import("../CollaborativeWorkspace"));
const SocialSharingModal = lazy(() => import("../SocialSharingModal"));
const TripsView = lazy(() => import("../TripsView"));
const PlacesView = lazy(() => import("../PlacesView"));
const TagsView = lazy(() => import("../TagsView"));
const VideoManager = lazy(() =>
  import("../VideoManager").then((m) => ({
    default: m.VideoManager,
  }))
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
  allTags: string[];
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
  allTags,
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
          path="/places"
          element={
            <div className="p-4">
              <PlacesView
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
          path="/tags"
          element={
            <div className="p-4">
              <TagsView
                allTags={allTags}
                tagsMap={tagsMap}
                setBusy={setBusy}
                setNote={setNote}
                setResults={setResults}
              />
            </div>
          }
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
                points={getLocationPoints(library, results)}
                onLoadMap={() => {
                  // Map loaded successfully
                  console.log("Map view loaded");
                }}
                selectedPhotos={selected}
                onPhotoSelect={onToggleSelect}
                onPhotoOpen={(path: string) => {
                  // Open photo in detail view
                  openDetailByPath(path);
                }}
              />
            </div>
          }
        />
        <Route
          path="/smart"
          element={
            <div className="p-4">
              <SmartDiscovery
                onPhotoSelect={(photo) => openDetailByPath(photo.path)}
                onPhotoView={(photo) => {
                  // Optional: Handle photo view actions
                  console.log("Viewing photo:", photo.path);
                }}
              />
            </div>
          }
        />
        <Route
          path="/curation"
          element={
            <div className="p-4">
              <AutoCurationPanel
                onPhotoSelect={(photo) => openDetailByPath(photo)}
                onPhotoView={(photo) => {
                  // Optional: Handle photo view actions
                  console.log("Viewing photo:", photo.path);
                }}
              />
            </div>
          }
        />
        <Route
          path="/visual-tools"
          element={
            <div className="p-4">
              <VisualTools
                selectedImages={Array.from(selected)}
                onImageSelect={(path) => openDetailByPath(path)}
                onPhotoView={(photo) => {
                  // Optional: Handle photo view actions
                  console.log("Viewing photo:", photo.path);
                }}
                availableImages={library || []}
              />
            </div>
          }
        />
        <Route
          path="/collaborate/:albumId?"
          element={
            <div className="p-4">
              <CollaborativeWorkspace
                albumId="default-album"
                userId="current-user"
                userName="Current User"
                onPhotoSelect={(path) => openDetailByPath(path)}
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
