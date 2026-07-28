const ACTIVE_COMPANY_STORAGE_KEY = 'publisher-tracker.active-company-id';

export function readStoredCompanyId(): string | null {
  const value = window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
  return value !== null && value.trim().length > 0 ? value.trim() : null;
}

export function storeCompanyId(companyId: string): void {
  window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, companyId);
}

export function clearStoredCompanyId(): void {
  window.localStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
}
