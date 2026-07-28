import { createContext } from 'react';

import type {
  CompanyLoadStatus,
  CompanyRecord,
  CreateCompanyInput,
} from './company.types';

export type CompanyAccessRestrictionCode =
  | 'COMPANY_SUBSCRIPTION_REQUIRED'
  | 'COMPANY_SUBSCRIPTION_NOT_STARTED'
  | 'COMPANY_SUBSCRIPTION_EXPIRED';

export type CompanyAccessRestriction = {
  code: CompanyAccessRestrictionCode;
  message: string;
};

export type CompanyContextValue = {
  companies: readonly CompanyRecord[];
  activeCompany: CompanyRecord | null;
  activeCompanyId: string | null;
  accessRestriction: CompanyAccessRestriction | null;
  status: CompanyLoadStatus;
  error: string | null;
  createCompany(input: CreateCompanyInput): Promise<CompanyRecord>;
  updateCompanyStatus(
    companyId: string,
    status: 'active' | 'suspended',
  ): Promise<CompanyRecord>;
  refreshCompanies(): Promise<void>;
  retryCompanyAccess(): Promise<void>;
  selectCompany(companyId: string): Promise<void>;
  activateCompanyContext(companyId: string): Promise<void>;
};

export const CompanyContext = createContext<CompanyContextValue | null>(null);
