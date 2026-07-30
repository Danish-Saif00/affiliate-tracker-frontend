import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { queryClient } from "../../app/query-client";
import { useAuth } from "../auth/use-auth";
import { useCompany } from "../companies/use-company";
import {
  createBillingPlan,
  createCompanySubscription,
  createDuplicateRule,
  createOffer,
  createOfferAssignment,
  createPostbackEndpoint,
  createTrackingLink,
  fetchBillingPlans,
  fetchCompanyBilling,
  fetchConversions,
  fetchCustomization,
  fetchDuplicateRules,
  fetchFraudClicks,
  fetchOfferAssignments,
  fetchOffers,
  fetchOperationalEvents,
  fetchPayoutProfiles,
  fetchPostbackEndpoints,
  fetchReporting,
  fetchTrackingLinks,
  rotatePostbackEndpointKey,
  updateBillingPlan,
  updateCompanySubscription,
  updateCustomization,
  updateDuplicateRule,
  updateOffer,
  updateOfferAssignment,
  updatePostbackEndpoint,
  updateTrackingLink,
  upsertPayoutProfile,
} from "./control-plane-api";
import type {
  BillingPlan,
  CompanyBillingSnapshot,
  CompanyCustomization,
  ControlPlanePermissions,
  Conversion,
  CreateBillingPlanInput,
  CreateDuplicateProtectionRuleInput,
  CreateOfferAssignmentInput,
  CreateOfferInput,
  CreateSubscriptionInput,
  CreateTrackingLinkInput,
  DuplicateProtectionRule,
  FraudClick,
  ModuleLoadStatus,
  NetworkPostbackEndpoint,
  NetworkPostbackEndpointSecret,
  Offer,
  OfferAssignment,
  OperationalEvent,
  PayoutProfile,
  ReportingDashboard,
  TrackingLink,
  UpdateBillingPlanInput,
  UpdateDuplicateProtectionRuleInput,
  UpdateOfferAssignmentInput,
  UpdateOfferInput,
  UpdateSubscriptionInput,
  UpdateTrackingLinkInput,
  UpsertPayoutProfileInput,
} from "./control-plane.types";

const EMPTY_OFFERS: readonly Offer[] = Object.freeze([]);
const EMPTY_PAYOUTS: readonly PayoutProfile[] = Object.freeze([]);
const EMPTY_ASSIGNMENTS: readonly OfferAssignment[] = Object.freeze([]);
const EMPTY_LINKS: readonly TrackingLink[] = Object.freeze([]);
const EMPTY_ENDPOINTS: readonly NetworkPostbackEndpoint[] = Object.freeze([]);
const EMPTY_CONVERSIONS: readonly Conversion[] = Object.freeze([]);
const EMPTY_RULES: readonly DuplicateProtectionRule[] = Object.freeze([]);
const EMPTY_CLICKS: readonly FraudClick[] = Object.freeze([]);
const EMPTY_PLANS: readonly BillingPlan[] = Object.freeze([]);
const EMPTY_EVENTS: readonly OperationalEvent[] = Object.freeze([]);

function errorMessage(error: unknown, fallback: string): string | null {
  return error === null
    ? null
    : error instanceof Error
      ? error.message
      : fallback;
}

function resolveStatus(
  enabled: boolean,
  allowed: boolean,
  loading: boolean,
  failed: boolean,
): ModuleLoadStatus {
  if (!allowed) {
    return "forbidden";
  }

  if (!enabled) {
    return "idle";
  }

  if (loading) {
    return "loading";
  }

  return failed ? "error" : "ready";
}

export function useControlPlaneContext() {
  const auth = useAuth();
  const company = useCompany();
  const platformAdmin =
    auth.identity?.authorization.platformRole === "platform_super_admin";
  const membership = auth.identity?.authorization.companyMembership ?? null;
  const companyRole = membership?.role ?? null;
  const activeMembership = membership?.status === "active";
  const canRead = platformAdmin || activeMembership;
  const canManage =
    platformAdmin || (activeMembership && companyRole === "company_admin");
  const permissions: ControlPlanePermissions = {
    platformAdmin,
    companyRole,
    canRead,
    canManage,
    canManagePlatform: platformAdmin,
    canManageOffers: canManage,
    canManageTracking:
      canManage ||
      (activeMembership &&
        (companyRole === "manager" || companyRole === "publisher")),
    canViewFinancials:
      platformAdmin ||
      (activeMembership &&
        (companyRole === "company_admin" ||
          companyRole === "manager" ||
          companyRole === "publisher")),
    canViewOperations:
      platformAdmin ||
      (activeMembership &&
        (companyRole === "company_admin" || companyRole === "manager")),
    canCustomize: canManage,
  };

  return {
    accessToken: auth.session?.access_token ?? null,
    companyId: company.activeCompanyId,
    companyName: company.activeCompany?.name ?? "Selected company",
    membershipId: membership?.membershipId ?? null,
    permissions,
  } as const;
}

function useInvalidateControlPlane() {
  return useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["company-scoped", "control-plane"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["company-scoped", "reporting"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["company-scoped", "reporting-dashboard"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["company-scoped", "operational-events"],
      }),
    ]);
  }, []);
}

export function useOffers(
  filters: { networkAccountId?: string; status?: string } = {},
) {
  const context = useControlPlaneContext();
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    context.permissions.canRead;
  const query = useQuery({
    queryKey: [
      "company-scoped",
      "control-plane",
      "offers",
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchOffers(
        context.accessToken,
        context.companyId,
        filters,
        signal,
      );
    },
  });
  const invalidate = useInvalidateControlPlane();
  const createMutation = useMutation<Offer, Error, CreateOfferInput>({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManageOffers
      ) {
        throw new Error(
          "Company administrator access is required to create offers.",
        );
      }

      return createOffer(context.accessToken, context.companyId, input);
    },
    onSettled: invalidate,
  });
  const updateMutation = useMutation<Offer, Error, UpdateOfferInput>({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManageOffers
      ) {
        throw new Error(
          "Company administrator access is required to update offers.",
        );
      }

      return updateOffer(context.accessToken, context.companyId, input);
    },
    onSettled: invalidate,
  });
  const firstError =
    query.error ?? createMutation.error ?? updateMutation.error;

  return {
    ...context,
    offers: query.data ?? EMPTY_OFFERS,
    status: resolveStatus(
      enabled,
      context.permissions.canRead,
      query.isLoading,
      query.isError,
    ),
    error: errorMessage(firstError, "Offers could not be loaded."),
    isMutating: createMutation.isPending || updateMutation.isPending,
    createOffer: createMutation.mutateAsync,
    updateOffer: updateMutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function usePayoutProfiles() {
  const context = useControlPlaneContext();
  const ownOnly =
    context.permissions.companyRole === "manager" ||
    context.permissions.companyRole === "publisher";
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    context.permissions.canViewFinancials;
  const query = useQuery({
    queryKey: [
      "company-scoped",
      "control-plane",
      "payout-profiles",
      context.companyId,
      ownOnly,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchPayoutProfiles(
        context.accessToken,
        context.companyId,
        ownOnly,
        signal,
      );
    },
  });
  const invalidate = useInvalidateControlPlane();
  const mutation = useMutation<PayoutProfile, Error, UpsertPayoutProfileInput>({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManageOffers
      ) {
        throw new Error(
          "Company administrator access is required to configure payouts.",
        );
      }

      return upsertPayoutProfile(context.accessToken, context.companyId, input);
    },
    onSettled: invalidate,
  });

  return {
    ...context,
    profiles: query.data ?? EMPTY_PAYOUTS,
    status: resolveStatus(
      enabled,
      context.permissions.canViewFinancials,
      query.isLoading,
      query.isError,
    ),
    error: errorMessage(
      query.error ?? mutation.error,
      "Payout profiles could not be loaded.",
    ),
    isMutating: mutation.isPending,
    upsertProfile: mutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useOfferAssignments(offerId: string | null) {
  const context = useControlPlaneContext();
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    offerId !== null &&
    context.permissions.canRead;
  const query = useQuery({
    queryKey: [
      "company-scoped",
      "control-plane",
      "assignments",
      context.companyId,
      offerId,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        offerId === null
      ) {
        throw new Error(
          "An offer and authenticated company context are required.",
        );
      }

      return fetchOfferAssignments(
        context.accessToken,
        context.companyId,
        offerId,
        signal,
      );
    },
  });
  const invalidate = useInvalidateControlPlane();
  const createMutation = useMutation<
    OfferAssignment,
    Error,
    CreateOfferAssignmentInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManageOffers
      ) {
        throw new Error(
          "Company administrator access is required to assign offers.",
        );
      }

      return createOfferAssignment(
        context.accessToken,
        context.companyId,
        input,
      );
    },
    onSettled: invalidate,
  });
  const updateMutation = useMutation<
    OfferAssignment,
    Error,
    UpdateOfferAssignmentInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManageOffers
      ) {
        throw new Error(
          "Company administrator access is required to update assignments.",
        );
      }

      return updateOfferAssignment(
        context.accessToken,
        context.companyId,
        input,
      );
    },
    onSettled: invalidate,
  });

  return {
    ...context,
    assignments: query.data ?? EMPTY_ASSIGNMENTS,
    status: resolveStatus(
      enabled,
      context.permissions.canRead,
      query.isLoading,
      query.isError,
    ),
    error: errorMessage(
      query.error ?? createMutation.error ?? updateMutation.error,
      "Offer assignments could not be loaded.",
    ),
    isMutating: createMutation.isPending || updateMutation.isPending,
    createAssignment: createMutation.mutateAsync,
    updateAssignment: updateMutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useTrackingLinks(
  filters: {
    offerId?: string;
    ownerMembershipId?: string;
    status?: string;
  } = {},
) {
  const context = useControlPlaneContext();
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    context.permissions.canRead;
  const query = useQuery({
    queryKey: [
      "company-scoped",
      "control-plane",
      "tracking-links",
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchTrackingLinks(
        context.accessToken,
        context.companyId,
        filters,
        signal,
      );
    },
  });
  const invalidate = useInvalidateControlPlane();
  const createMutation = useMutation<
    TrackingLink,
    Error,
    CreateTrackingLinkInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManageTracking
      ) {
        throw new Error("Tracking-link management access is required.");
      }

      return createTrackingLink(context.accessToken, context.companyId, input);
    },
    onSettled: invalidate,
  });
  const updateMutation = useMutation<
    TrackingLink,
    Error,
    UpdateTrackingLinkInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManageTracking
      ) {
        throw new Error("Tracking-link management access is required.");
      }

      return updateTrackingLink(context.accessToken, context.companyId, input);
    },
    onSettled: invalidate,
  });

  return {
    ...context,
    links: query.data ?? EMPTY_LINKS,
    status: resolveStatus(
      enabled,
      context.permissions.canRead,
      query.isLoading,
      query.isError,
    ),
    error: errorMessage(
      query.error ?? createMutation.error ?? updateMutation.error,
      "Tracking links could not be loaded.",
    ),
    isMutating: createMutation.isPending || updateMutation.isPending,
    createLink: createMutation.mutateAsync,
    updateLink: updateMutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function usePostbackEndpointCreator() {
  const context = useControlPlaneContext();
  const invalidate = useInvalidateControlPlane();
  const createMutation = useMutation<
    NetworkPostbackEndpointSecret,
    Error,
    {
      networkAccountId: string;
      name: string;
      status?: "active" | "paused";
    }
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManage
      ) {
        throw new Error(
          "Company administrator access is required to configure postbacks.",
        );
      }

      return createPostbackEndpoint(
        context.accessToken,
        context.companyId,
        input.networkAccountId,
        {
          name: input.name,
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      );
    },
    onSettled: invalidate,
  });

  return {
    ...context,
    error: errorMessage(
      createMutation.error,
      "The secure postback endpoint could not be created.",
    ),
    isMutating: createMutation.isPending,
    createEndpoint: createMutation.mutateAsync,
  } as const;
}

export function usePostbackEndpoints(
  networkAccountId: string | null,
  status?: string,
) {
  const context = useControlPlaneContext();
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    networkAccountId !== null &&
    context.permissions.canViewOperations;
  const query = useQuery({
    queryKey: [
      "company-scoped",
      "control-plane",
      "postback-endpoints",
      context.companyId,
      networkAccountId,
      status,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        networkAccountId === null
      ) {
        throw new Error(
          "A network account and authenticated company context are required.",
        );
      }

      return fetchPostbackEndpoints(
        context.accessToken,
        context.companyId,
        networkAccountId,
        status,
        signal,
      );
    },
  });
  const invalidate = useInvalidateControlPlane();
  const createMutation = useMutation<
    NetworkPostbackEndpointSecret,
    Error,
    { name: string; status?: "active" | "paused" }
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        networkAccountId === null ||
        !context.permissions.canManage
      ) {
        throw new Error(
          "Company administrator access is required to configure postbacks.",
        );
      }

      return createPostbackEndpoint(
        context.accessToken,
        context.companyId,
        networkAccountId,
        input,
      );
    },
    onSettled: invalidate,
  });
  const updateMutation = useMutation<
    NetworkPostbackEndpoint,
    Error,
    {
      endpointId: string;
      name?: string;
      status?: "active" | "paused" | "archived";
    }
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        networkAccountId === null ||
        !context.permissions.canManage
      ) {
        throw new Error(
          "Company administrator access is required to configure postbacks.",
        );
      }

      return updatePostbackEndpoint(
        context.accessToken,
        context.companyId,
        networkAccountId,
        input.endpointId,
        input,
      );
    },
    onSettled: invalidate,
  });
  const rotateMutation = useMutation<
    NetworkPostbackEndpointSecret,
    Error,
    string
  >({
    mutationFn: async (endpointId) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        networkAccountId === null ||
        !context.permissions.canManage
      ) {
        throw new Error(
          "Company administrator access is required to rotate postback keys.",
        );
      }

      return rotatePostbackEndpointKey(
        context.accessToken,
        context.companyId,
        networkAccountId,
        endpointId,
      );
    },
    onSettled: invalidate,
  });

  return {
    ...context,
    endpoints: query.data ?? EMPTY_ENDPOINTS,
    status: resolveStatus(
      enabled,
      context.permissions.canViewOperations,
      query.isLoading,
      query.isError,
    ),
    error: errorMessage(
      query.error ??
        createMutation.error ??
        updateMutation.error ??
        rotateMutation.error,
      "Postback endpoints could not be loaded.",
    ),
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      rotateMutation.isPending,
    createEndpoint: createMutation.mutateAsync,
    updateEndpoint: updateMutation.mutateAsync,
    rotateKey: rotateMutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useConversions(
  filters: {
    networkAccountId?: string;
    offerId?: string;
    ownerMembershipId?: string;
    status?: string;
    limit?: number;
  } = {},
) {
  const context = useControlPlaneContext();
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    context.permissions.canRead;
  const query = useQuery({
    queryKey: [
      "company-scoped",
      "control-plane",
      "conversions",
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchConversions(
        context.accessToken,
        context.companyId,
        filters,
        signal,
      );
    },
  });

  return {
    ...context,
    conversions: query.data ?? EMPTY_CONVERSIONS,
    status: resolveStatus(
      enabled,
      context.permissions.canRead,
      query.isLoading,
      query.isError,
    ),
    error: errorMessage(query.error, "Conversions could not be loaded."),
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useFraudReview(
  filters: {
    networkAccountId?: string;
    offerId?: string;
    ruleStatus?: string;
    duplicateDecision?: string;
    fraudRiskLevel?: string;
    limit?: number;
  } = {},
) {
  const context = useControlPlaneContext();
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    context.permissions.canViewOperations;
  const rulesQuery = useQuery({
    queryKey: [
      "company-scoped",
      "control-plane",
      "duplicate-rules",
      context.companyId,
      filters.networkAccountId,
      filters.offerId,
      filters.ruleStatus,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchDuplicateRules(
        context.accessToken,
        context.companyId,
        {
          networkAccountId: filters.networkAccountId,
          offerId: filters.offerId,
          status: filters.ruleStatus,
        },
        signal,
      );
    },
  });
  const clicksQuery = useQuery({
    queryKey: [
      "company-scoped",
      "control-plane",
      "fraud-clicks",
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchFraudClicks(
        context.accessToken,
        context.companyId,
        {
          networkAccountId: filters.networkAccountId,
          offerId: filters.offerId,
          duplicateDecision: filters.duplicateDecision,
          fraudRiskLevel: filters.fraudRiskLevel,
          limit: filters.limit,
        },
        signal,
      );
    },
  });
  const invalidate = useInvalidateControlPlane();
  const createMutation = useMutation<
    DuplicateProtectionRule,
    Error,
    CreateDuplicateProtectionRuleInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManage
      ) {
        throw new Error(
          "Company administrator access is required to configure fraud rules.",
        );
      }

      return createDuplicateRule(context.accessToken, context.companyId, input);
    },
    onSettled: invalidate,
  });
  const updateMutation = useMutation<
    DuplicateProtectionRule,
    Error,
    UpdateDuplicateProtectionRuleInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManage
      ) {
        throw new Error(
          "Company administrator access is required to configure fraud rules.",
        );
      }

      return updateDuplicateRule(context.accessToken, context.companyId, input);
    },
    onSettled: invalidate,
  });
  const firstError =
    rulesQuery.error ??
    clicksQuery.error ??
    createMutation.error ??
    updateMutation.error;

  return {
    ...context,
    rules: rulesQuery.data ?? EMPTY_RULES,
    clicks: clicksQuery.data ?? EMPTY_CLICKS,
    status: resolveStatus(
      enabled,
      context.permissions.canViewOperations,
      rulesQuery.isLoading || clicksQuery.isLoading,
      rulesQuery.isError || clicksQuery.isError,
    ),
    error: errorMessage(firstError, "Fraud review data could not be loaded."),
    isMutating: createMutation.isPending || updateMutation.isPending,
    createRule: createMutation.mutateAsync,
    updateRule: updateMutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await Promise.all([rulesQuery.refetch(), clicksQuery.refetch()]);
    },
  } as const;
}

export function useBilling() {
  const context = useControlPlaneContext();
  const enabled = context.accessToken !== null && context.companyId !== null;
  const plansQuery = useQuery({
    queryKey: ["control-plane", "billing-plans"],
    enabled:
      context.accessToken !== null && context.permissions.canManagePlatform,
    queryFn: ({ signal }) => {
      if (context.accessToken === null) {
        throw new Error("An authenticated session is required.");
      }

      return fetchBillingPlans(context.accessToken, undefined, signal);
    },
  });
  const snapshotQuery = useQuery({
    queryKey: ["company-scoped", "control-plane", "billing", context.companyId],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchCompanyBilling(
        context.accessToken,
        context.companyId,
        context.permissions.platformAdmin,
        signal,
      );
    },
  });
  const invalidate = useInvalidateControlPlane();
  const createPlanMutation = useMutation<
    BillingPlan,
    Error,
    CreateBillingPlanInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        !context.permissions.canManagePlatform
      ) {
        throw new Error(
          "Platform Super Admin access is required to create billing plans.",
        );
      }

      return createBillingPlan(context.accessToken, input);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["control-plane", "billing-plans"],
      });
      await invalidate();
    },
  });
  const updatePlanMutation = useMutation<
    BillingPlan,
    Error,
    UpdateBillingPlanInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        !context.permissions.canManagePlatform
      ) {
        throw new Error(
          "Platform Super Admin access is required to update billing plans.",
        );
      }

      return updateBillingPlan(context.accessToken, input);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["control-plane", "billing-plans"],
      });
      await invalidate();
    },
  });
  const createSubscriptionMutation = useMutation<
    CompanyBillingSnapshot,
    Error,
    CreateSubscriptionInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManagePlatform
      ) {
        throw new Error(
          "Platform Super Admin access is required to create subscriptions.",
        );
      }

      return createCompanySubscription(
        context.accessToken,
        context.companyId,
        input,
      );
    },
    onSettled: invalidate,
  });
  const updateSubscriptionMutation = useMutation<
    CompanyBillingSnapshot,
    Error,
    UpdateSubscriptionInput
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canManagePlatform
      ) {
        throw new Error(
          "Platform Super Admin access is required to update subscriptions.",
        );
      }

      return updateCompanySubscription(
        context.accessToken,
        context.companyId,
        input,
      );
    },
    onSettled: invalidate,
  });
  const firstError =
    plansQuery.error ??
    snapshotQuery.error ??
    createPlanMutation.error ??
    updatePlanMutation.error ??
    createSubscriptionMutation.error ??
    updateSubscriptionMutation.error;

  return {
    ...context,
    plans: plansQuery.data ?? EMPTY_PLANS,
    snapshot: snapshotQuery.data ?? null,
    status: resolveStatus(
      enabled,
      true,
      snapshotQuery.isLoading,
      snapshotQuery.isError,
    ),
    error: errorMessage(firstError, "Billing data could not be loaded."),
    isMutating:
      createPlanMutation.isPending ||
      updatePlanMutation.isPending ||
      createSubscriptionMutation.isPending ||
      updateSubscriptionMutation.isPending,
    createPlan: createPlanMutation.mutateAsync,
    updatePlan: updatePlanMutation.mutateAsync,
    createSubscription: createSubscriptionMutation.mutateAsync,
    updateSubscription: updateSubscriptionMutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await Promise.all([plansQuery.refetch(), snapshotQuery.refetch()]);
    },
  } as const;
}

export function useReporting(
  filters: {
    from?: string;
    to?: string;
    offerId?: string;
    networkAccountId?: string;
    ownerMembershipId?: string;
  } = {},
) {
  const context = useControlPlaneContext();
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    context.permissions.canRead;
  const query = useQuery<ReportingDashboard>({
    queryKey: [
      "company-scoped",
      "control-plane",
      "reporting",
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchReporting(
        context.accessToken,
        context.companyId,
        filters,
        signal,
      );
    },
  });

  return {
    ...context,
    dashboard: query.data ?? null,
    status: resolveStatus(
      enabled,
      context.permissions.canRead,
      query.isLoading,
      query.isError,
    ),
    error: errorMessage(query.error, "Reporting data could not be loaded."),
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useOperations(
  filters: {
    eventName?: string;
    entityType?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {},
) {
  const context = useControlPlaneContext();
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    context.permissions.canViewOperations;
  const query = useQuery<readonly OperationalEvent[]>({
    queryKey: [
      "company-scoped",
      "control-plane",
      "operations",
      context.companyId,
      filters,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchOperationalEvents(
        context.accessToken,
        context.companyId,
        filters,
        signal,
      );
    },
  });

  return {
    ...context,
    events: query.data ?? EMPTY_EVENTS,
    status: resolveStatus(
      enabled,
      context.permissions.canViewOperations,
      query.isLoading,
      query.isError,
    ),
    error: errorMessage(query.error, "Operational events could not be loaded."),
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}

export function useCustomization() {
  const context = useControlPlaneContext();
  const enabled =
    context.accessToken !== null &&
    context.companyId !== null &&
    context.permissions.canRead;
  const query = useQuery<CompanyCustomization | null>({
    queryKey: [
      "company-scoped",
      "control-plane",
      "customization",
      context.companyId,
    ],
    enabled,
    queryFn: ({ signal }) => {
      if (context.accessToken === null || context.companyId === null) {
        throw new Error("An authenticated company context is required.");
      }

      return fetchCustomization(context.accessToken, context.companyId, signal);
    },
  });
  const invalidate = useInvalidateControlPlane();
  const mutation = useMutation<
    CompanyCustomization,
    Error,
    {
      brandName?: string | null;
      tagline?: string | null;
      logoUrl?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      supportEmail?: string | null;
      defaultCurrency?: string | null;
      defaultTimezone?: string | null;
      linkIdentifierMode?: CompanyCustomization["linkIdentifierMode"];
      plainTextSharingEnabled?: boolean;
      restrictedSharePlatforms?: CompanyCustomization["restrictedSharePlatforms"];
      defaultLinkQueryParameters?: CompanyCustomization["defaultLinkQueryParameters"];
    }
  >({
    mutationFn: async (input) => {
      if (
        context.accessToken === null ||
        context.companyId === null ||
        !context.permissions.canCustomize
      ) {
        throw new Error(
          "Company administrator access is required to update settings.",
        );
      }

      return updateCustomization(context.accessToken, context.companyId, input);
    },
    onSettled: invalidate,
  });

  return {
    ...context,
    customization: query.data ?? null,
    status: resolveStatus(
      enabled,
      context.permissions.canRead,
      query.isLoading,
      query.isError,
    ),
    error: errorMessage(
      query.error ?? mutation.error,
      "Company settings could not be loaded.",
    ),
    isMutating: mutation.isPending,
    updateCustomization: mutation.mutateAsync,
    refresh: async (): Promise<void> => {
      await query.refetch();
    },
  } as const;
}
