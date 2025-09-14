import { useEffect } from "react";

export function useOnboardingActions({
  openModal,
  openFilters,
}: {
  openModal: (k: string) => void;
  openFilters: () => void;
}) {
  useEffect(() => {
    const openAdvanced = () => openModal("advanced");
    const openFolder = () => openModal("folder");

    window.addEventListener("tour-action-open-advanced", openAdvanced);
    window.addEventListener("tour-action-open-filters", openFilters);
    window.addEventListener("tour-action-select-library", openFolder);

    return () => {
      window.removeEventListener("tour-action-open-advanced", openAdvanced);
      window.removeEventListener("tour-action-open-filters", openFilters);
      window.removeEventListener("tour-action-select-library", openFolder);
    };
  }, [openModal, openFilters]);
}

export default useOnboardingActions;

