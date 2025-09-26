import {
  BookmarkPlus,
  Filter,
  FolderOpen,
  Search as IconSearch,
} from "lucide-react";
import type React from "react";
import type { ModalKey } from "../../../contexts/ModalContext";

import { LibrarySwitcher } from "../../LibrarySwitcher";
import { SearchBar } from "../../SearchBar";
import type { TopBarProps } from "../../TopBar";
import { MotionButton } from "../primitives/MotionButton";
import { QuickFilters } from "./QuickFilters";
import { stripStructuredTokens } from "../utils/queryTokens";

type PrimarySearchControlsProps = {
  searchCommandCenter: boolean;
  onOpenSearchOverlay?: () => void;
  searchText: string;
  setSearchText: (value: string) => void;
  doSearch: (value: string) => void | Promise<void>;
  clusters: Array<{ name?: string }>;
  allTags: string[];
  meta?: TopBarProps["meta"];
  dir: string;
  setShowFilters: (value: boolean | ((previous: boolean) => boolean)) => void;
  enableDemoLibrary?: boolean;
  onLibraryChange?: (dir: string | null) => void;
  handleOpenFolderModal: () => void;
  openModal: (modalId: ModalKey) => void;
};

export function PrimarySearchControls({
  searchCommandCenter,
  onOpenSearchOverlay,
  searchText,
  setSearchText,
  doSearch,
  clusters,
  allTags,
  meta,
  dir,
  setShowFilters,
  enableDemoLibrary,
  onLibraryChange,
  handleOpenFolderModal,
  openModal,
}: PrimarySearchControlsProps) {
  const hasFilterTokens =
    !searchCommandCenter &&
    /(camera:|tag:|person:|has_text:|iso:|fnumber:|width:|height:|place:)/i.test(
      searchText || ""
    );

  const clearFilterTokens = () => {
    const cleaned = stripStructuredTokens(searchText || "");
    setSearchText(cleaned);
    void doSearch(cleaned);
  };

  return (
    <div className="top-bar-left">
      {searchCommandCenter ? (
        <MotionButton
          type="button"
          className="ml-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          onClick={onOpenSearchOverlay}
          aria-label="Open search"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <IconSearch className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Search
          </span>
        </MotionButton>
      ) : (
        <div className="flex items-center gap-2 w-full max-w-2xl">
          <SearchBar
            searchText={searchText}
            setSearchText={setSearchText}
            onSearch={doSearch}
            clusters={clusters}
            allTags={allTags}
            meta={meta}
          />
          <button
            type="button"
            className="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Press ? to open keyboard shortcuts"
            onClick={() => openModal("help")}
            aria-label="Open keyboard shortcuts"
          >
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs border border-gray-200 dark:border-gray-600">
              ?
            </kbd>
            <span className="hidden md:inline">for shortcuts</span>
          </button>
        </div>
      )}

      <QuickFilters
        disabled={searchCommandCenter}
        meta={meta}
        allTags={allTags}
        clusters={clusters}
        searchText={searchText}
        setSearchText={setSearchText}
        doSearch={doSearch}
      />

      <MotionButton
        type="button"
        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        onClick={() => setShowFilters((prev) => !prev)}
        aria-label="Show filters"
        data-tour="filters-toggle"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Filters
        </span>
      </MotionButton>

      {enableDemoLibrary !== undefined && onLibraryChange && (
        <LibrarySwitcher
          currentDir={dir}
          onLibraryChange={onLibraryChange}
          enableDemoLibrary={enableDemoLibrary}
        />
      )}

      <MotionButton
        type="button"
        className="ml-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        onClick={handleOpenFolderModal}
        aria-label="Select photo folder"
        data-tour="select-library"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FolderOpen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Add Photos
        </span>
      </MotionButton>

      {hasFilterTokens && (
        <button
          type="button"
          className="chip"
          onClick={clearFilterTokens}
          title="Clear filter tokens from query"
          aria-label="Clear filter tokens"
        >
          Clear filters
        </button>
      )}

      <MotionButton
        type="button"
        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        onClick={() => openModal("save")}
        title="Save this search for later"
        aria-label="Save current search"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <BookmarkPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Remember
        </span>
      </MotionButton>
    </div>
  );
}

export default PrimarySearchControls;
