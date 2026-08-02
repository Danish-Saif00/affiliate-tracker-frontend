import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "../../app/query-client";
import { useAuth } from "../auth/use-auth";
import { useCompany } from "../companies/use-company";
import {
  cloneCatalogNetwork,
  cloneCatalogOffer,
  createCatalogNetwork,
  createCatalogOffer,
  deleteCatalogNetwork,
  deleteCatalogOffer,
  fetchCoreCatalog,
  updateCatalogNetwork,
  updateCatalogOffer,
  updateCatalogPublisher,
} from "./catalog-api";
import type {
  CatalogNetwork,
  CatalogOffer,
  CloneCatalogNetworkInput,
  CloneCatalogOfferInput,
  CatalogPublisher,
  CoreCatalogSnapshot,
  CreateCatalogNetworkInput,
  CreateCatalogOfferInput,
  DeleteCatalogNetworkInput,
  DeleteCatalogOfferInput,
  DeleteCatalogOfferResult,
  DeleteCatalogNetworkResult,
  UpdateCatalogNetworkInput,
  UpdateCatalogOfferInput,
  UpdateCatalogPublisherInput,
} from "./catalog.types";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Catalog data could not be updated.";
}

export interface UseCatalogOperationsOptions {
  readonly enabled?: boolean;
}

export function useCatalogOperations(
  options: UseCatalogOperationsOptions = {},
) {
  const auth = useAuth();
  const company = useCompany();
  const accessToken = auth.session?.access_token ?? null;
  const companyId = company.activeCompanyId;
  const identity = auth.identity;
  const platformAdmin =
    identity?.authorization.platformRole === "platform_super_admin";
  const membership = identity?.authorization.companyMembership;
  const activeRole = membership?.status === "active" ? membership.role : null;
  const canReadCatalog =
    !platformAdmin &&
    (activeRole === "company_admin" || activeRole === "manager");
  const canManageCatalog = !platformAdmin && activeRole === "company_admin";
  const canManagePublishers = !platformAdmin && activeRole === "manager";
  const queryKey = ["company-scoped", companyId, "core-catalog"] as const;
  const catalogQuery = useQuery<CoreCatalogSnapshot>({
    queryKey,
    enabled:
      options.enabled !== false &&
      accessToken !== null &&
      companyId !== null &&
      canReadCatalog,
    queryFn: ({ signal }) => {
      if (accessToken === null || companyId === null) {
        throw new Error(
          "A selected company and authenticated session are required.",
        );
      }

      return fetchCoreCatalog(accessToken, companyId, signal);
    },
  });

  async function invalidateCatalog(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["company-scoped", companyId],
    });
  }

  const createOfferMutation = useMutation<
    CatalogOffer,
    Error,
    CreateCatalogOfferInput
  >({
    mutationFn: (input) => {
      if (accessToken === null || companyId === null || !canManageCatalog) {
        throw new Error("Company administrator access is required.");
      }

      return createCatalogOffer(accessToken, companyId, input);
    },
    onSuccess: invalidateCatalog,
  });

  const cloneOfferMutation = useMutation<
    CatalogOffer,
    Error,
    CloneCatalogOfferInput
  >({
    mutationFn: (input) => {
      if (accessToken === null || companyId === null || !canManageCatalog) {
        throw new Error("Company administrator access is required.");
      }
      return cloneCatalogOffer(accessToken, companyId, input);
    },
    onSuccess: invalidateCatalog,
  });

  const updateOfferMutation = useMutation<
    CatalogOffer,
    Error,
    UpdateCatalogOfferInput
  >({
    mutationFn: (input) => {
      if (accessToken === null || companyId === null || !canManageCatalog) {
        throw new Error("Company administrator access is required.");
      }

      return updateCatalogOffer(accessToken, companyId, input);
    },
    onSuccess: invalidateCatalog,
  });

  const deleteOfferMutation = useMutation<
    DeleteCatalogOfferResult,
    Error,
    DeleteCatalogOfferInput
  >({
    mutationFn: (input) => {
      if (accessToken === null || companyId === null || !canManageCatalog) {
        throw new Error("Company administrator access is required.");
      }
      return deleteCatalogOffer(accessToken, companyId, input.offerId);
    },
    onSuccess: invalidateCatalog,
  });

  const createNetworkMutation = useMutation<
    CatalogNetwork,
    Error,
    CreateCatalogNetworkInput
  >({
    mutationFn: (input) => {
      if (accessToken === null || companyId === null || !canManageCatalog) {
        throw new Error("Company administrator access is required.");
      }

      return createCatalogNetwork(accessToken, companyId, input);
    },
    onSuccess: invalidateCatalog,
  });

  const cloneNetworkMutation = useMutation<
    CatalogNetwork,
    Error,
    CloneCatalogNetworkInput
  >({
    mutationFn: (input) => {
      if (accessToken === null || companyId === null || !canManageCatalog) {
        throw new Error("Company administrator access is required.");
      }

      return cloneCatalogNetwork(accessToken, companyId, input);
    },
    onSuccess: invalidateCatalog,
  });

  const updateNetworkMutation = useMutation<
    CatalogNetwork,
    Error,
    UpdateCatalogNetworkInput
  >({
    mutationFn: (input) => {
      if (accessToken === null || companyId === null || !canManageCatalog) {
        throw new Error("Company administrator access is required.");
      }

      return updateCatalogNetwork(accessToken, companyId, input);
    },
    onSuccess: invalidateCatalog,
  });

  const deleteNetworkMutation = useMutation<
    DeleteCatalogNetworkResult,
    Error,
    DeleteCatalogNetworkInput
  >({
    mutationFn: (input) => {
      if (accessToken === null || companyId === null || !canManageCatalog) {
        throw new Error("Company administrator access is required.");
      }

      return deleteCatalogNetwork(accessToken, companyId, input);
    },
    onSuccess: invalidateCatalog,
  });

  const updatePublisherMutation = useMutation<
    CatalogPublisher,
    Error,
    UpdateCatalogPublisherInput
  >({
    mutationFn: (input) => {
      if (accessToken === null || companyId === null || !canManagePublishers) {
        throw new Error("Manager access is required.");
      }

      return updateCatalogPublisher(accessToken, companyId, input);
    },
    onSuccess: invalidateCatalog,
  });

  return {
    snapshot: catalogQuery.data ?? null,
    isLoading: catalogQuery.isLoading,
    isRefreshing: catalogQuery.isFetching,
    isMutating:
      createOfferMutation.isPending ||
      cloneOfferMutation.isPending ||
      updateOfferMutation.isPending ||
      deleteOfferMutation.isPending ||
      createNetworkMutation.isPending ||
      cloneNetworkMutation.isPending ||
      updateNetworkMutation.isPending ||
      deleteNetworkMutation.isPending ||
      updatePublisherMutation.isPending,
    error:
      catalogQuery.error instanceof Error
        ? catalogQuery.error.message
        : createOfferMutation.error
          ? errorMessage(createOfferMutation.error)
          : cloneOfferMutation.error
            ? errorMessage(cloneOfferMutation.error)
            : updateOfferMutation.error
              ? errorMessage(updateOfferMutation.error)
              : deleteOfferMutation.error
                ? errorMessage(deleteOfferMutation.error)
                : createNetworkMutation.error
                  ? errorMessage(createNetworkMutation.error)
                  : cloneNetworkMutation.error
                    ? errorMessage(cloneNetworkMutation.error)
                    : updateNetworkMutation.error
                      ? errorMessage(updateNetworkMutation.error)
                      : deleteNetworkMutation.error
                        ? errorMessage(deleteNetworkMutation.error)
                        : updatePublisherMutation.error
                          ? errorMessage(updatePublisherMutation.error)
                          : null,
    permissions: {
      canReadCatalog,
      canManageCatalog,
      canManagePublishers,
    },
    refresh: async () => {
      await catalogQuery.refetch();
    },
    createOffer: createOfferMutation.mutateAsync,
    cloneOffer: cloneOfferMutation.mutateAsync,
    updateOffer: updateOfferMutation.mutateAsync,
    deleteOffer: deleteOfferMutation.mutateAsync,
    createNetwork: createNetworkMutation.mutateAsync,
    cloneNetwork: cloneNetworkMutation.mutateAsync,
    updateNetwork: updateNetworkMutation.mutateAsync,
    deleteNetwork: deleteNetworkMutation.mutateAsync,
    updatePublisher: updatePublisherMutation.mutateAsync,
  };
}
