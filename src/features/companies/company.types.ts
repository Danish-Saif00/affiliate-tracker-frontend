export type CompanyStatus = 'active' | 'suspended' | 'archived';

export type CompanyRecord = {
  id: string;
  slug: string;
  name: string;
  status: CompanyStatus;
  timezone: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCompanyInput = {
  slug: string;
  name: string;
  timezone?: string;
};

export type CompanyLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
