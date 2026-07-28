import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryClient } from '../../app/query-client';
import { useAuth } from '../auth/use-auth';
import { useCompany } from '../companies/use-company';
import {
  createNetworkAccount,
  createNetworkProvider,
  createTrackingDomain,
  fetchNetworkAccounts,
  fetchNetworkProviders,
  fetchTrackingDomains,
  updateNetworkAccount,
  updateNetworkProvider,
  updatePlatformTrackingDomainStatus,
  updateTrackingDomain,
} from './tracking-networks-api';
import type {
  CreateNetworkAccountInput,
  CreateNetworkProviderInput,
  CreateTrackingDomainInput,
  NetworkAccount,
  NetworkProvider,
  TrackingDomain,
  TrackingModuleLoadStatus,
  UpdateNetworkAccountInput,
  UpdateNetworkProviderInput,
  UpdatePlatformTrackingDomainStatusInput,
  UpdateTrackingDomainInput,
} from './tracking-networks.types';

const TRACKING_DOMAINS_QUERY_KEY = [
  'company-scoped',
  'tracking-networks',
  'domains',
] as const;
const NETWORK_PROVIDERS_QUERY_KEY = ['tracking-networks', 'providers'] as const;
const NETWORK_ACCOUNTS_QUERY_KEY = [
  'company-scoped',
  'tracking-networks',
  'accounts',
] as const;

const EMPTY_DOMAINS: readonly TrackingDomain[] = Object.freeze([]);
const EMPTY_PROVIDERS: readonly NetworkProvider[] = Object.freeze([]);
const EMPTY_ACCOUNTS: readonly NetworkAccount[] = Object.freeze([]);

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function readPermissions(
  platformRole: string | null | undefined,
  companyRole: string | null | undefined,
) {
  const platformAdmin = platformRole === 'platform_super_admin';
  const companyReader = companyRole === 'company_admin' || companyRole === 'manager';
  const companyManager = companyRole === 'company_admin';

  return {
    platformAdmin,
    canRead: platformAdmin || companyReader,
    canManage: platformAdmin || companyManager,
  } as const;
}

function resolveLoadStatus(
  enabled: boolean,
  allowed: boolean,
  loading: boolean,
  failed: boolean,
): TrackingModuleLoadStatus {
  if (!allowed) {
    return 'forbidden';
  }

  if (!enabled) {
    return 'idle';
  }

  if (loading) {
    return 'loading';
  }

  return failed ? 'error' : 'ready';
}

export function useTrackingDomains() {
  const auth = useAuth();
  const company = useCompany();
  const session = auth.session;
  const companyId = company.activeCompanyId;
  const permissions = readPermissions(
    auth.identity?.authorization.platformRole,
    auth.identity?.authorization.companyMembership?.role,
  );
  const enabled = session !== null && companyId !== null && permissions.canRead;

  const domainsQuery = useQuery({
    queryKey: [
      ...TRACKING_DOMAINS_QUERY_KEY,
      companyId,
      permissions.platformAdmin,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (session === null || companyId === null) {
        throw new Error('An active authenticated company context is required.');
      }

      return fetchTrackingDomains(
        session.access_token,
        companyId,
        permissions.platformAdmin,
        signal,
      );
    },
  });
  const refetch = domainsQuery.refetch;

  const invalidate = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: TRACKING_DOMAINS_QUERY_KEY });
    await queryClient.invalidateQueries({
      queryKey: ['company-scoped', 'tenant-administration', 'audit'],
    });
  }, []);

  const createMutation = useMutation<
    TrackingDomain,
    Error,
    CreateTrackingDomainInput
  >({
    mutationFn: async (input) => {
      if (session === null || companyId === null || !permissions.canManage) {
        throw new Error('Company administrator access is required.');
      }

      return createTrackingDomain(session.access_token, companyId, input);
    },
    onSettled: invalidate,
  });

  const updateMutation = useMutation<
    TrackingDomain,
    Error,
    UpdateTrackingDomainInput
  >({
    mutationFn: async (input) => {
      if (session === null || companyId === null || !permissions.canManage) {
        throw new Error('Company administrator access is required.');
      }

      return updateTrackingDomain(session.access_token, companyId, input);
    },
    onSettled: invalidate,
  });

  const platformStatusMutation = useMutation<
    TrackingDomain,
    Error,
    UpdatePlatformTrackingDomainStatusInput
  >({
    mutationFn: async (input) => {
      if (
        session === null ||
        companyId === null ||
        !permissions.platformAdmin
      ) {
        throw new Error('Platform Super Admin access is required.');
      }

      return updatePlatformTrackingDomainStatus(
        session.access_token,
        companyId,
        input,
      );
    },
    onSettled: invalidate,
  });

  const firstError =
    domainsQuery.error ??
    createMutation.error ??
    updateMutation.error ??
    platformStatusMutation.error;

  return {
    companyId,
    domains: domainsQuery.data ?? EMPTY_DOMAINS,
    status: resolveLoadStatus(
      enabled,
      permissions.canRead,
      domainsQuery.isLoading,
      domainsQuery.isError,
    ),
    error:
      firstError === null
        ? null
        : getErrorMessage(firstError, 'Tracking domains could not be loaded.'),
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      platformStatusMutation.isPending,
    permissions,
    createDomain: createMutation.mutateAsync,
    updateDomain: updateMutation.mutateAsync,
    updatePlatformStatus: platformStatusMutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await refetch();
    },
  } as const;
}

export function useNetworkProviders() {
  const auth = useAuth();
  const company = useCompany();
  const session = auth.session;
  const companyId = company.activeCompanyId;
  const permissions = readPermissions(
    auth.identity?.authorization.platformRole,
    auth.identity?.authorization.companyMembership?.role,
  );
  const enabled =
    session !== null &&
    permissions.canRead &&
    (permissions.platformAdmin || companyId !== null);

  const providersQuery = useQuery({
    queryKey: [
      ...NETWORK_PROVIDERS_QUERY_KEY,
      companyId,
      permissions.platformAdmin,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (session === null) {
        throw new Error('An authenticated session is required.');
      }

      if (!permissions.platformAdmin && companyId === null) {
        throw new Error('An active company context is required.');
      }

      return fetchNetworkProviders(
        session.access_token,
        companyId,
        permissions.platformAdmin,
        signal,
      );
    },
  });
  const refetch = providersQuery.refetch;

  const invalidate = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: NETWORK_PROVIDERS_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: NETWORK_ACCOUNTS_QUERY_KEY });
  }, []);

  const createMutation = useMutation<
    NetworkProvider,
    Error,
    CreateNetworkProviderInput
  >({
    mutationFn: async (input) => {
      if (session === null || !permissions.platformAdmin) {
        throw new Error('Platform Super Admin access is required.');
      }

      return createNetworkProvider(session.access_token, input);
    },
    onSettled: invalidate,
  });

  const updateMutation = useMutation<
    NetworkProvider,
    Error,
    UpdateNetworkProviderInput
  >({
    mutationFn: async (input) => {
      if (session === null || !permissions.platformAdmin) {
        throw new Error('Platform Super Admin access is required.');
      }

      return updateNetworkProvider(session.access_token, input);
    },
    onSettled: invalidate,
  });

  const firstError =
    providersQuery.error ?? createMutation.error ?? updateMutation.error;

  return {
    providers: providersQuery.data ?? EMPTY_PROVIDERS,
    status: resolveLoadStatus(
      enabled,
      permissions.canRead,
      providersQuery.isLoading,
      providersQuery.isError,
    ),
    error:
      firstError === null
        ? null
        : getErrorMessage(firstError, 'Network providers could not be loaded.'),
    isMutating: createMutation.isPending || updateMutation.isPending,
    permissions,
    createProvider: createMutation.mutateAsync,
    updateProvider: updateMutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await refetch();
    },
  } as const;
}

export function useNetworkAccounts() {
  const auth = useAuth();
  const company = useCompany();
  const session = auth.session;
  const companyId = company.activeCompanyId;
  const permissions = readPermissions(
    auth.identity?.authorization.platformRole,
    auth.identity?.authorization.companyMembership?.role,
  );
  const enabled = session !== null && companyId !== null && permissions.canRead;

  const accountsQuery = useQuery({
    queryKey: [
      ...NETWORK_ACCOUNTS_QUERY_KEY,
      companyId,
      permissions.platformAdmin,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (session === null || companyId === null) {
        throw new Error('An active authenticated company context is required.');
      }

      return fetchNetworkAccounts(
        session.access_token,
        companyId,
        permissions.platformAdmin,
        signal,
      );
    },
  });
  const refetch = accountsQuery.refetch;

  const invalidate = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: NETWORK_ACCOUNTS_QUERY_KEY });
    await queryClient.invalidateQueries({
      queryKey: ['company-scoped', 'reporting'],
    });
  }, []);

  const createMutation = useMutation<
    NetworkAccount,
    Error,
    CreateNetworkAccountInput
  >({
    mutationFn: async (input) => {
      if (session === null || companyId === null || !permissions.canManage) {
        throw new Error('Company administrator access is required.');
      }

      return createNetworkAccount(session.access_token, companyId, input);
    },
    onSettled: invalidate,
  });

  const updateMutation = useMutation<
    NetworkAccount,
    Error,
    UpdateNetworkAccountInput
  >({
    mutationFn: async (input) => {
      if (session === null || companyId === null || !permissions.canManage) {
        throw new Error('Company administrator access is required.');
      }

      return updateNetworkAccount(session.access_token, companyId, input);
    },
    onSettled: invalidate,
  });

  const firstError =
    accountsQuery.error ?? createMutation.error ?? updateMutation.error;

  return {
    companyId,
    accounts: accountsQuery.data ?? EMPTY_ACCOUNTS,
    status: resolveLoadStatus(
      enabled,
      permissions.canRead,
      accountsQuery.isLoading,
      accountsQuery.isError,
    ),
    error:
      firstError === null
        ? null
        : getErrorMessage(firstError, 'Network accounts could not be loaded.'),
    isMutating: createMutation.isPending || updateMutation.isPending,
    permissions,
    createAccount: createMutation.mutateAsync,
    updateAccount: updateMutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await refetch();
    },
  } as const;
}
