import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  queryClient,
} from '../../app/query-client';
import { useAuth } from '../auth/use-auth';
import { useCompany } from '../companies/use-company';
import {
  fetchProxyConfiguration,
  updateProxyConfiguration,
} from './proxy-api';
import type {
  CompanyProxyConfiguration,
  ProxyModuleLoadStatus,
  UpdateCompanyProxyConfigurationInput,
} from './proxy.types';
const PROXY_QUERY_KEY = [
  'company-scoped',
  'proxy-configuration',
] as const;
function getErrorMessage(
  error: unknown,
): string | null {
  return error === null
    ? null
    : error instanceof Error
      ? error.message
      : 'Proxy configuration could not be loaded.';
}
function resolveStatus(
  enabled: boolean,
  allowed: boolean,
  loading: boolean,
  failed: boolean,
): ProxyModuleLoadStatus {
  if (!allowed) {
    return 'forbidden';
  }
  if (!enabled) {
    return 'idle';
  }
  if (loading) {
    return 'loading';
  }
  return failed
    ? 'error'
    : 'ready';
}
export function useProxyConfiguration() {
  const auth =
    useAuth();
  const company =
    useCompany();
  const session =
    auth.session;
  const companyId =
    company.activeCompanyId;
  const platformAdmin =
    auth.identity?.authorization
      .platformRole ===
    'platform_super_admin';
  const companyAdmin =
    auth.identity?.authorization
      .companyMembership?.role ===
    'company_admin';
  const canManage =
    platformAdmin ||
    companyAdmin;
  const enabled =
    session !== null &&
    companyId !== null &&
    canManage;
  const query =
    useQuery<
      CompanyProxyConfiguration | null
    >({
      queryKey: [
        ...PROXY_QUERY_KEY,
        companyId,
      ],
      enabled,
      queryFn: ({ signal }) => {
        if (
          session === null ||
          companyId === null
        ) {
          throw new Error(
            'An authenticated company context is required.',
          );
        }
        return fetchProxyConfiguration(
          session.access_token,
          companyId,
          signal,
        );
      },
    });
  const invalidate =
    useCallback(
      async (): Promise<void> => {
        await queryClient
          .invalidateQueries({
            queryKey:
              PROXY_QUERY_KEY,
          });
        await queryClient
          .invalidateQueries({
            queryKey: [
              'company-scoped',
              'tenant-administration',
              'audit',
            ],
          });
      },
      [],
    );
  const mutation =
    useMutation<
      CompanyProxyConfiguration,
      Error,
      UpdateCompanyProxyConfigurationInput
    >({
      mutationFn: async (input) => {
        if (
          session === null ||
          companyId === null ||
          !canManage
        ) {
          throw new Error(
            'Company administrator access is required to configure Proxy detection.',
          );
        }
        return updateProxyConfiguration(
          session.access_token,
          companyId,
          input,
        );
      },
      onSettled: invalidate,
    });
  return {
    companyId,
    companyName:
      company.activeCompany?.name ??
      'Selected company',
    permissions: {
      platformAdmin,
      canManage,
    },
    configuration:
      query.data ?? null,
    status: resolveStatus(
      enabled,
      canManage,
      query.isLoading,
      query.isError,
    ),
    error: getErrorMessage(
      query.error ??
      mutation.error,
    ),
    isMutating:
      mutation.isPending,
    updateConfiguration:
      mutation.mutateAsync,
    refresh:
      async (): Promise<void> => {
        await query.refetch();
      },
  } as const;
}
