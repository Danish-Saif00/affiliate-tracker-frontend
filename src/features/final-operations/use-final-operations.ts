import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import { queryClient } from '../../app/query-client';
import { ApiRequestError } from '../../lib/api-client';
import { useControlPlaneContext } from '../control-plane/use-control-plane';
import {
  createManualConversion,
  fetchAccountProfile,
  fetchBillingInvoices,
  fetchClickLogs,
  fetchConversionLogs,
  fetchPerformanceReport,
  fetchSessionLogs,
  fetchUserAgentLogs,
  updateAccountProfile,
} from './final-operations-api';
import type {
  AccountProfile,
  BillingInvoice,
  ClickLogFilters,
  ClickLogRecord,
  ConversionLogFilters,
  ConversionLogRecord,
  CreateManualConversionInput,
  FinalOperationsLoadStatus,
  ManualConversion,
  PerformanceReportDimension,
  PerformanceReportFilters,
  PerformanceReportRow,
  SessionLogFilters,
  SessionLogRecord,
  UpdateAccountProfileInput,
  UserAgentLogFilters,
  UserAgentLogRecord,
} from './final-operations.types';

const EMPTY_REPORT_ROWS: readonly PerformanceReportRow[] = Object.freeze([]);
const EMPTY_CLICKS: readonly ClickLogRecord[] = Object.freeze([]);
const EMPTY_CONVERSIONS: readonly ConversionLogRecord[] = Object.freeze([]);
const EMPTY_SESSIONS: readonly SessionLogRecord[] = Object.freeze([]);
const EMPTY_USER_AGENTS: readonly UserAgentLogRecord[] = Object.freeze([]);
const EMPTY_INVOICES: readonly BillingInvoice[] = Object.freeze([]);

function resolveStatus(
  enabled: boolean,
  allowed: boolean,
  loading: boolean,
  error: unknown,
): FinalOperationsLoadStatus {
  if (!allowed) {
    return 'forbidden';
  }

  if (!enabled) {
    return 'idle';
  }

  if (loading) {
    return 'loading';
  }

  if (error instanceof ApiRequestError && error.status === 403) {
    return 'forbidden';
  }

  return error === null ? 'ready' : 'error';
}

function resolveError(error: unknown, fallback: string): string | null {
  return error === null
    ? null
    : error instanceof Error
      ? error.message
      : fallback;
}

export function usePerformanceReport(
  dimension: PerformanceReportDimension,
  filters: PerformanceReportFilters,
) {
  const context = useControlPlaneContext();
  const allowed = context.permissions.canRead;
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    allowed;
  const query = useQuery({
    queryKey: [
      'company-scoped',
      'final-operations',
      'report',
      context.companyId,
      dimension,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error('An authenticated company context is required.');
      }

      return fetchPerformanceReport(
        context.accessToken,
        context.companyId,
        dimension,
        filters,
        signal,
      );
    },
  });

  return {
    ...context,
    rows: query.data ?? EMPTY_REPORT_ROWS,
    status: resolveStatus(enabled, allowed, query.isLoading, query.error),
    error: resolveError(query.error, 'The performance report could not be loaded.'),
    isRefreshing: query.isFetching,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useClickLogs(filters: ClickLogFilters) {
  const context = useControlPlaneContext();
  const allowed = context.permissions.canRead;
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    allowed;
  const query = useQuery({
    queryKey: [
      'company-scoped',
      'final-operations',
      'clicks',
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error('An authenticated company context is required.');
      }

      return fetchClickLogs(
        context.accessToken,
        context.companyId,
        filters,
        signal,
      );
    },
  });

  return {
    ...context,
    clicks: query.data ?? EMPTY_CLICKS,
    status: resolveStatus(enabled, allowed, query.isLoading, query.error),
    error: resolveError(query.error, 'Click logs could not be loaded.'),
    isRefreshing: query.isFetching,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useConversionLogs(filters: ConversionLogFilters) {
  const context = useControlPlaneContext();
  const allowed = context.permissions.canRead;
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    allowed;
  const query = useQuery({
    queryKey: [
      'company-scoped',
      'final-operations',
      'conversions',
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error('An authenticated company context is required.');
      }

      return fetchConversionLogs(
        context.accessToken,
        context.companyId,
        filters,
        signal,
      );
    },
  });
  const createMutation = useMutation<
    ManualConversion,
    Error,
    CreateManualConversionInput
  >({
    mutationFn: (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canViewOperations
      ) {
        throw new Error(
          'Company administrator or manager access is required.',
        );
      }

      return createManualConversion(
        context.accessToken,
        context.companyId,
        input,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          'company-scoped',
          'final-operations',
          'conversions',
          context.companyId,
        ],
      });
    },
  });
  const error = query.error ?? createMutation.error;

  return {
    ...context,
    conversions: query.data ?? EMPTY_CONVERSIONS,
    status: resolveStatus(enabled, allowed, query.isLoading, error),
    error: resolveError(error, 'Conversion logs could not be loaded.'),
    isRefreshing: query.isFetching,
    isCreating: createMutation.isPending,
    createManualConversion: createMutation.mutateAsync,
    resetCreateError: createMutation.reset,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useSessionLogs(filters: SessionLogFilters) {
  const context = useControlPlaneContext();
  const allowed = context.permissions.canRead;
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    allowed;
  const query = useQuery({
    queryKey: [
      'company-scoped',
      'final-operations',
      'sessions',
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error('An authenticated company context is required.');
      }

      return fetchSessionLogs(
        context.accessToken,
        context.companyId,
        filters,
        signal,
      );
    },
  });

  return {
    ...context,
    sessions: query.data ?? EMPTY_SESSIONS,
    status: resolveStatus(enabled, allowed, query.isLoading, query.error),
    error: resolveError(query.error, 'Session logs could not be loaded.'),
    isRefreshing: query.isFetching,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useUserAgentLogs(filters: UserAgentLogFilters) {
  const context = useControlPlaneContext();
  const allowed = context.permissions.canRead;
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    allowed;
  const query = useQuery({
    queryKey: [
      'company-scoped',
      'final-operations',
      'user-agents',
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error('An authenticated company context is required.');
      }

      return fetchUserAgentLogs(
        context.accessToken,
        context.companyId,
        filters,
        signal,
      );
    },
  });

  return {
    ...context,
    userAgents: query.data ?? EMPTY_USER_AGENTS,
    status: resolveStatus(enabled, allowed, query.isLoading, query.error),
    error: resolveError(query.error, 'User-agent logs could not be loaded.'),
    isRefreshing: query.isFetching,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useAccountProfile() {
  const context = useControlPlaneContext();
  const enabled = context.accessToken !== null;
  const query = useQuery<AccountProfile>({
    queryKey: ['authenticated', 'final-operations', 'account-profile'],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null) {
        throw new Error('An authenticated session is required.');
      }

      return fetchAccountProfile(context.accessToken, signal);
    },
  });
  const mutation = useMutation<AccountProfile, Error, UpdateAccountProfileInput>({
    mutationFn: (input) => {
      if (context.accessToken === null) {
        throw new Error('An authenticated session is required.');
      }

      return updateAccountProfile(context.accessToken, input);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(
        ['authenticated', 'final-operations', 'account-profile'],
        profile,
      );
    },
  });
  const error = query.error ?? mutation.error;

  return {
    ...context,
    profile: query.data ?? null,
    status: resolveStatus(enabled, true, query.isLoading, error),
    error: resolveError(error, 'The account profile could not be loaded.'),
    isUpdating: mutation.isPending,
    updateProfile: mutation.mutateAsync,
    resetUpdateError: mutation.reset,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useBillingInvoices(limit = 100) {
  const context = useControlPlaneContext();
  const allowed =
    context.permissions.platformAdmin ||
    context.permissions.companyRole === 'company_admin' ||
    context.permissions.companyRole === 'manager';
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    allowed;
  const query = useQuery({
    queryKey: [
      'company-scoped',
      'final-operations',
      'billing-invoices',
      context.companyId,
      limit,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error('An authenticated company context is required.');
      }

      return fetchBillingInvoices(
        context.accessToken,
        context.companyId,
        limit,
        signal,
      );
    },
  });

  return {
    ...context,
    invoices: query.data ?? EMPTY_INVOICES,
    status: resolveStatus(enabled, allowed, query.isLoading, query.error),
    error: resolveError(query.error, 'Billing invoices could not be loaded.'),
    isRefreshing: query.isFetching,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}
