import { useCallback, useMemo } from "react";

interface UseSelectionSummaryArgs {
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
}

export interface SelectionSummary {
  selectedArray: string[];
  selectionCount: number;
  selectionMode: boolean;
  isSingleSelection: boolean;
  primarySelectedPath?: string;
  clearSelection: () => void;
}

export function useSelectionSummary({
  selected,
  setSelected,
}: UseSelectionSummaryArgs): SelectionSummary {
  const selectedArray = useMemo(() => Array.from(selected), [selected]);
  const selectionCount = selectedArray.length;
  const selectionMode = selectionCount > 0;
  const isSingleSelection = selectionCount === 1;
  const primarySelectedPath = isSingleSelection ? selectedArray[0] : undefined;
  const clearSelection = useCallback(() => setSelected(new Set()), [setSelected]);

  return {
    selectedArray,
    selectionCount,
    selectionMode,
    isSingleSelection,
    primarySelectedPath,
    clearSelection,
  };
}
