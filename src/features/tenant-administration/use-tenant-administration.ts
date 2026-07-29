import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { queryClient } from "../../app/query-client";
import { useAuth } from "../auth/use-auth";
import { useCompany } from "../companies/use-company";
import {
  createManagedUser,
  fetchCompanyAuditEvents,
  fetchCompanyDirectory,
  resetManagedUserPassword,
  updateCompanyMembership,
  updatePlatformUserStatus,
} from "./tenant-administration-api";
import type {
  AuditEvent,
  CompanyDirectoryUser,
  CompanyMembership,
  CreateManagedUserInput,
  CursorPage,
  DirectoryFilters,
  ManagedUserPasswordResetResult,
  ResetManagedUserPasswordInput,
  UpdateMembershipInput,
  UpdateUserStatusInput,
  UserProfile,
} from "./tenant-administration.types";

const TENANT_QUERY_PREFIX = [
  "company-scoped",
  "tenant-administration",
] as const;
const EMPTY_DIRECTORY: CursorPage<CompanyDirectoryUser> = Object.freeze({
  items: Object.freeze([]),
  nextCursor: null,
});
const EMPTY_AUDIT: CursorPage<AuditEvent> = Object.freeze({
  items: Object.freeze([]),
  nextCursor: null,
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Tenant administration data could not be loaded.";
}

export function useTenantAdministration(filters: DirectoryFilters) {
  const auth = useAuth();
  const company = useCompany();
  const session = auth.session;
  const companyId = company.activeCompanyId;
  const platformAdmin =
    auth.identity?.authorization.platformRole === "platform_super_admin";
  const enabled = session !== null && companyId !== null;
  const auditEnabled = enabled && !platformAdmin;

  const directoryQuery = useQuery({
    queryKey: [...TENANT_QUERY_PREFIX, "directory", companyId, filters],
    enabled,
    queryFn: ({ signal }) => {
      if (session === null || companyId === null) {
        throw new Error("An active authenticated company context is required.");
      }

      return fetchCompanyDirectory(
        session.access_token,
        companyId,
        filters,
        signal,
      );
    },
  });
  const refetchDirectory = directoryQuery.refetch;

  const auditQuery = useQuery({
    queryKey: [...TENANT_QUERY_PREFIX, "audit", companyId],
    enabled: auditEnabled,
    queryFn: ({ signal }) => {
      if (session === null || companyId === null) {
        throw new Error("An active authenticated company context is required.");
      }

      return fetchCompanyAuditEvents(session.access_token, companyId, signal);
    },
  });
  const refetchAudit = auditQuery.refetch;

  const invalidateTenantData = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: TENANT_QUERY_PREFIX,
    });
    await queryClient.invalidateQueries({
      queryKey: ["company-scoped", "reporting"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["company-scoped", "catalog"],
    });
  }, []);

  const createUserMutation = useMutation<
    CompanyDirectoryUser,
    Error,
    CreateManagedUserInput
  >({
    mutationFn: async (input) => {
      if (session === null || companyId === null) {
        throw new Error("An active authenticated company context is required.");
      }

      return createManagedUser(session.access_token, companyId, input);
    },
    onSettled: invalidateTenantData,
  });

  const resetPasswordMutation = useMutation<
    ManagedUserPasswordResetResult,
    Error,
    ResetManagedUserPasswordInput
  >({
    mutationFn: async (input) => {
      if (session === null || companyId === null) {
        throw new Error("An active authenticated company context is required.");
      }

      return resetManagedUserPassword(session.access_token, companyId, input);
    },
    onSettled: invalidateTenantData,
  });

  const membershipMutation = useMutation<
    CompanyMembership,
    Error,
    UpdateMembershipInput
  >({
    mutationFn: async (input) => {
      if (session === null || companyId === null) {
        throw new Error("An active authenticated company context is required.");
      }

      return updateCompanyMembership(session.access_token, companyId, input);
    },
    onSettled: invalidateTenantData,
  });

  const userStatusMutation = useMutation<
    UserProfile,
    Error,
    UpdateUserStatusInput
  >({
    mutationFn: async (input) => {
      if (session === null || companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return updatePlatformUserStatus(session.access_token, companyId, input);
    },
    onSettled: invalidateTenantData,
  });

  const refresh = useCallback(async (): Promise<void> => {
    const refreshes: Promise<unknown>[] = [refetchDirectory()];

    if (!platformAdmin) {
      refreshes.push(refetchAudit());
    }

    await Promise.all(refreshes);
  }, [platformAdmin, refetchAudit, refetchDirectory]);

  const auditError = platformAdmin ? null : auditQuery.error;
  const auditLoading = !platformAdmin && auditQuery.isLoading;
  const auditFailed = !platformAdmin && auditQuery.isError;
  const firstError =
    directoryQuery.error ??
    auditError ??
    createUserMutation.error ??
    resetPasswordMutation.error ??
    membershipMutation.error ??
    userStatusMutation.error;

  return {
    companyId,
    directory: directoryQuery.data ?? EMPTY_DIRECTORY,
    audit: platformAdmin ? EMPTY_AUDIT : (auditQuery.data ?? EMPTY_AUDIT),
    status: !enabled
      ? "idle"
      : directoryQuery.isLoading || auditLoading
        ? "loading"
        : directoryQuery.isError || auditFailed
          ? "error"
          : "ready",
    error: firstError === null ? null : getErrorMessage(firstError),
    isMutating:
      createUserMutation.isPending ||
      resetPasswordMutation.isPending ||
      membershipMutation.isPending ||
      userStatusMutation.isPending,
    createManagedUser: createUserMutation.mutateAsync,
    resetManagedUserPassword: resetPasswordMutation.mutateAsync,
    updateMembership: membershipMutation.mutateAsync,
    updateUserStatus: userStatusMutation.mutateAsync,
    refresh,
  } as const;
}
