/**
 * Handles advanced search apply CustomEvent with proper typing
 */
import { useEffect } from "react";
import type { AdvancedSearchApplyEvent } from "../utils/lifecycleTypes";

export interface UseAdvancedSearchApplyProps {
  setSearchText: (query: string) => void;
}

export function useAdvancedSearchApply({
  setSearchText,
}: UseAdvancedSearchApplyProps): void {
  useEffect(() => {
    const onApply = (e: Event) => {
      const evt = e as AdvancedSearchApplyEvent;
      const q = evt.detail?.q;
      if (typeof q === "string") {
        setSearchText(q);
      }
    };

    window.addEventListener("advanced-search-apply", onApply);

    return () => {
      window.removeEventListener("advanced-search-apply", onApply);
    };
  }, [setSearchText]);
}
