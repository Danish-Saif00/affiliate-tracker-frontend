import { useCallback, useState } from "react";
export function useAppliedFilters<T>(draftFilters: T) {
  const [appliedFilters, setAppliedFilters] =
    useState<T>(draftFilters);
  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
  }, [draftFilters]);
  return {
    appliedFilters,
    applyFilters,
  } as const;
}