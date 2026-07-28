import { useAuth } from "../../features/auth/use-auth";
import { OffersPage, type OffersPageMode } from "./offers-page";
import { PublisherOffersPage } from "./publisher-offers-page";

export function RoleAwareOffersPage({ mode }: { mode: OffersPageMode }) {
  const auth = useAuth();
  const membership = auth.identity?.authorization.companyMembership;

  if (membership?.status === "active" && membership.role === "publisher") {
    return <PublisherOffersPage />;
  }

  return <OffersPage mode={mode} />;
}
