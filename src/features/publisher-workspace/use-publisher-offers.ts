import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/use-auth";
import { useCompany } from "../companies/use-company";
import { fetchPublisherOffers } from "./publisher-workspace-api";
import type {
  PublisherOffer,
  PublisherWorkspaceLoadStatus,
} from "./publisher-workspace.types";

const EMPTY_OFFERS: readonly PublisherOffer[] = Object.freeze([]);

export function usePublisherOffers() {
  const auth = useAuth();
  const company = useCompany();
  const accessToken = auth.session?.access_token ?? null;
  const companyId = company.activeCompanyId;
  const membership = auth.identity?.authorization.companyMembership ?? null;
  const allowed =
    membership?.status === "active" &&
    membership.role === "publisher" &&
    membership.companyId === companyId;
  const enabled = accessToken !== null && companyId !== null && allowed;

  const query = useQuery<readonly PublisherOffer[]>({
    queryKey: ["company-scoped", companyId, "publisher-assigned-offers"],
    enabled,
    queryFn: ({ signal }) => {
      if (accessToken === null || companyId === null) {
        throw new Error(
          "An active Publisher company context and authenticated session are required.",
        );
      }

      return fetchPublisherOffers(accessToken, companyId, signal);
    },
  });

  let status: PublisherWorkspaceLoadStatus = "idle";

  if (!allowed && auth.status !== "loading" && company.status !== "loading") {
    status = "forbidden";
  } else if (enabled && query.isLoading) {
    status = "loading";
  } else if (enabled && query.error !== null) {
    status = "error";
  } else if (enabled && query.data !== undefined) {
    status = "ready";
  }

  return {
    offers: query.data ?? EMPTY_OFFERS,
    status,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error === null
          ? null
          : "The assigned Offer directory could not be loaded.",
    isRefreshing: query.isFetching && !query.isLoading,
    refresh: async (): Promise<void> => {
      if (enabled) {
        await query.refetch();
      }
    },
  };
}
