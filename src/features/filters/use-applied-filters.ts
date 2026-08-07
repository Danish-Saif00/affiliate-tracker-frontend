import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ApplyFiltersHandler = () => void;

export type FilterApplyCoordinator = {
  registerApplyHandler: (handler: ApplyFiltersHandler) => () => void;
  closeFilters: () => void;
};

export const FilterApplyCoordinatorContext =
  createContext<FilterApplyCoordinator | null>(null);

export function useAppliedFilters<T>(
  draftFilters: T,
  onApply?: ApplyFiltersHandler,
) {
  const coordinator = useContext(FilterApplyCoordinatorContext);
  const [appliedFilters, setAppliedFilters] =
    useState<T>(draftFilters);

  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    onApply?.();
    coordinator?.closeFilters();
  }, [coordinator, draftFilters, onApply]);

  useEffect(() => {
    if (coordinator === null) {
      return;
    }

    return coordinator.registerApplyHandler(applyFilters);
  }, [applyFilters, coordinator]);

  return {
    appliedFilters,
    applyFilters,
  } as const;
}
