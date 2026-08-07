import { useMutation, useQuery } from '@tanstack/react-query';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { queryClient } from '../../app/query-client';
import { ApiRequestError, fetchCurrentIdentity } from '../../lib/api-client';
import { useAuth } from '../auth/use-auth';
import {
  CompanyContext,
  type CompanyAccessRestriction,
  type CompanyAccessRestrictionCode,
  type CompanyContextValue,
} from './company-context';
import {
  createCompany as createCompanyRequest,
  fetchAvailableCompanies,
  updateCompanyStatus as updateCompanyStatusRequest,
} from './company-api';
import {
  clearStoredCompanyId,
  readStoredCompanyId,
  storeCompanyId,
} from './company-storage';
import type { CompanyRecord, CreateCompanyInput } from './company.types';

const COMPANIES_QUERY_KEY = ['available-companies'] as const;
const COMPANY_SCOPED_QUERY_KEY = ['company-scoped'] as const;
const ACCESS_RETRY_INTERVAL_MS = 60_000;
const SUBSCRIPTION_RESTRICTION_CODES: readonly CompanyAccessRestrictionCode[] = [
  'COMPANY_SUBSCRIPTION_REQUIRED',
  'COMPANY_SUBSCRIPTION_NOT_STARTED',
  'COMPANY_SUBSCRIPTION_EXPIRED',
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Company data could not be loaded.';
}

function getAccessRestriction(error: unknown): CompanyAccessRestriction | null {
  if (
    !(error instanceof ApiRequestError) ||
    !SUBSCRIPTION_RESTRICTION_CODES.includes(
      error.code as CompanyAccessRestrictionCode,
    )
  ) {
    return null;
  }

  return {
    code: error.code as CompanyAccessRestrictionCode,
    message: error.message,
  };
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const authStatus = auth.status;
  const identity = auth.identity;
  const session = auth.session;
  const refreshIdentity = auth.refreshIdentity;
  const [preferredCompanyId, setPreferredCompanyId] = useState<string | null>(() =>
    readStoredCompanyId(),
  );
  const [accessRestriction, setAccessRestriction] =
    useState<CompanyAccessRestriction | null>(null);
  const canListCompanies = authStatus === 'authenticated' && session !== null;

  const companiesQuery = useQuery<readonly CompanyRecord[]>({
    queryKey: COMPANIES_QUERY_KEY,
    enabled: canListCompanies,
    queryFn: ({ signal }) => {
      if (session === null) {
        throw new Error('An authenticated session is required.');
      }

      return fetchAvailableCompanies(session.access_token, signal);
    },
  });
  const refetchCompanies = companiesQuery.refetch;
  const companies = useMemo<readonly CompanyRecord[]>(
    () => companiesQuery.data ?? [],
    [companiesQuery.data],
  );
  const activeCompany = useMemo<CompanyRecord | null>(() => {
    if (!canListCompanies || companiesQuery.isLoading || companiesQuery.isError) {
      return null;
    }

    const preferredCompany = companies.find(
      (company) =>
        company.id === preferredCompanyId && company.status === 'active',
    );

    return (
      preferredCompany ??
      companies.find((company) => company.status === 'active') ??
      null
    );
  }, [
    canListCompanies,
    companies,
    companiesQuery.isError,
    companiesQuery.isLoading,
    preferredCompanyId,
  ]);
  const activeCompanyId = activeCompany?.id ?? null;

  useEffect(() => {
    if (authStatus !== 'authenticated' || activeCompanyId === null) {
      clearStoredCompanyId();
      return;
    }

    storeCompanyId(activeCompanyId);
  }, [activeCompanyId, authStatus]);

  useEffect(() => {
    if (
      authStatus !== 'authenticated' ||
      activeCompanyId === null ||
      identity?.authorization.requestedCompanyId === activeCompanyId
    ) {
      return;
    }

    let active = true;

    void refreshIdentity(activeCompanyId)
      .then(() => {
        if (active) {
          setAccessRestriction(null);
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        const restriction = getAccessRestriction(error);

        if (restriction !== null) {
          setAccessRestriction(restriction);
          return;
        }

        setPreferredCompanyId(null);
        clearStoredCompanyId();
      });

    return () => {
      active = false;
    };
  }, [activeCompanyId, authStatus, identity, refreshIdentity]);

  useEffect(() => {
    const platformAdmin =
      identity?.authorization.platformRole === 'platform_super_admin';

    if (
      activeCompanyId === null ||
      authStatus !== 'authenticated' ||
      platformAdmin ||
      session === null
    ) {
      return;
    }

    let active = true;

    const verifyCompanyAccess = () => {
      void fetchCurrentIdentity(
        session.access_token,
        activeCompanyId,
      )
        .then(() => {
          if (!active) {
            return;
          }

          if (accessRestriction !== null) {
            setAccessRestriction(null);
            void queryClient.invalidateQueries({
              queryKey: COMPANY_SCOPED_QUERY_KEY,
            });
          }
        })
        .catch((error: unknown) => {
          if (!active) {
            return;
          }

          const restriction = getAccessRestriction(error);

          if (restriction !== null) {
            setAccessRestriction(restriction);
          }
        });
    };

    const intervalId = window.setInterval(
      verifyCompanyAccess,
      ACCESS_RETRY_INTERVAL_MS,
    );
    window.addEventListener('focus', verifyCompanyAccess);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', verifyCompanyAccess);
    };
  }, [
    accessRestriction,
    activeCompanyId,
    authStatus,
    identity,
    session,
  ]);

  const createMutation = useMutation<CompanyRecord, Error, CreateCompanyInput>({
    mutationFn: async (input: CreateCompanyInput) => {
      if (session === null) {
        throw new Error('An authenticated session is required.');
      }

      return createCompanyRequest(session.access_token, input);
    },
    onSuccess: async (company) => {
      await queryClient.invalidateQueries({ queryKey: COMPANIES_QUERY_KEY });
      setPreferredCompanyId(company.id);
      storeCompanyId(company.id);
      await refreshIdentity(company.id);
      setAccessRestriction(null);
      await queryClient.invalidateQueries({ queryKey: COMPANY_SCOPED_QUERY_KEY });
    },
  });
  const mutateCompany = createMutation.mutateAsync;

  const updateStatusMutation = useMutation<
    CompanyRecord,
    Error,
    {
      companyId: string;
      status: 'active' | 'suspended';
    }
  >({
    mutationFn: async ({ companyId, status }) => {
      if (session === null) {
        throw new Error('An authenticated session is required.');
      }

      return updateCompanyStatusRequest(
        session.access_token,
        companyId,
        status,
      );
    },
    onSuccess: async (updatedCompany) => {
      await queryClient.invalidateQueries({
        queryKey: COMPANIES_QUERY_KEY,
      });

      if (
        updatedCompany.status !== 'active' &&
        preferredCompanyId === updatedCompany.id
      ) {
        setPreferredCompanyId(null);
        clearStoredCompanyId();
      }

      await queryClient.invalidateQueries({
        queryKey: COMPANY_SCOPED_QUERY_KEY,
      });
    },
  });
  const mutateCompanyStatus = updateStatusMutation.mutateAsync;

  const activateCompanyContext = useCallback(
    async (companyId: string): Promise<void> => {
      if (session === null) {
        throw new Error('An authenticated session is required.');
      }

      const refreshed = await fetchAvailableCompanies(session.access_token);
      queryClient.setQueryData(COMPANIES_QUERY_KEY, refreshed);
      const company = refreshed.find((item) => item.id === companyId);

      if (company === undefined || company.status !== 'active') {
        throw new Error('The accepted company is not available to this account.');
      }

      setPreferredCompanyId(company.id);
      storeCompanyId(company.id);

      try {
        await refreshIdentity(company.id);
        setAccessRestriction(null);
        await queryClient.invalidateQueries({ queryKey: COMPANY_SCOPED_QUERY_KEY });
      } catch (error: unknown) {
        const restriction = getAccessRestriction(error);

        if (restriction === null) {
          throw error;
        }

        setAccessRestriction(restriction);
      }
    },
    [refreshIdentity, session],
  );

  const selectCompany = useCallback(
    async (companyId: string): Promise<void> => {
      const company = companies.find((item) => item.id === companyId);

      if (company === undefined) {
        throw new Error('The selected company is unavailable.');
      }

      if (company.status !== 'active') {
        throw new Error('Only an active company can be selected.');
      }

      setPreferredCompanyId(company.id);
      storeCompanyId(company.id);

      try {
        await refreshIdentity(company.id);
        setAccessRestriction(null);
        await queryClient.invalidateQueries({ queryKey: COMPANY_SCOPED_QUERY_KEY });
      } catch (error: unknown) {
        const restriction = getAccessRestriction(error);

        if (restriction === null) {
          throw error;
        }

        setAccessRestriction(restriction);
      }
    },
    [companies, refreshIdentity],
  );

  const retryCompanyAccess = useCallback(async (): Promise<void> => {
    if (activeCompanyId === null) {
      throw new Error('An active company is required.');
    }

    try {
      await refreshIdentity(activeCompanyId);
      setAccessRestriction(null);
      await queryClient.invalidateQueries({ queryKey: COMPANY_SCOPED_QUERY_KEY });
    } catch (error: unknown) {
      const restriction = getAccessRestriction(error);

      if (restriction !== null) {
        setAccessRestriction(restriction);
      }

      throw error;
    }
  }, [activeCompanyId, refreshIdentity]);

  const refreshCompanies = useCallback(async (): Promise<void> => {
    await refetchCompanies();
  }, [refetchCompanies]);

  const createCompany = useCallback(
    async (input: CreateCompanyInput): Promise<CompanyRecord> => mutateCompany(input),
    [mutateCompany],
  );

  const updateCompanyStatus = useCallback(
    async (
      companyId: string,
      status: 'active' | 'suspended',
    ): Promise<CompanyRecord> =>
      mutateCompanyStatus({
        companyId,
        status,
      }),
    [mutateCompanyStatus],
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      companies,
      activeCompany,
      activeCompanyId,
      accessRestriction,
      status: !canListCompanies
        ? 'idle'
        : companiesQuery.isLoading
          ? 'loading'
          : companiesQuery.isError
            ? 'error'
            : 'ready',
      error: companiesQuery.error
        ? getErrorMessage(companiesQuery.error)
        : createMutation.error
          ? getErrorMessage(createMutation.error)
          : updateStatusMutation.error
            ? getErrorMessage(updateStatusMutation.error)
            : null,
      createCompany,
      updateCompanyStatus,
      refreshCompanies,
      retryCompanyAccess,
      selectCompany,
      activateCompanyContext,
    }),
    [
      accessRestriction,
      activeCompany,
      activeCompanyId,
      activateCompanyContext,
      canListCompanies,
      companies,
      companiesQuery.error,
      companiesQuery.isError,
      companiesQuery.isLoading,
      createCompany,
      createMutation.error,
      refreshCompanies,
      updateCompanyStatus,
      updateStatusMutation.error,
      retryCompanyAccess,
      selectCompany,
    ],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}
