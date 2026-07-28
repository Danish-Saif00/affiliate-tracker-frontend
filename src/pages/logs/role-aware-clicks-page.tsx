import { useAuth } from "../../features/auth/use-auth";
import { ClicksPage as AdministrativeClicksPage } from "./clicks-page";
import { PublisherClicksPage } from "./publisher-clicks-page";

export function ClicksPage() {
  const auth = useAuth();
  const membership = auth.identity?.authorization.companyMembership ?? null;
  const isPublisher =
    membership?.status === "active" && membership.role === "publisher";

  return isPublisher ? <PublisherClicksPage /> : <AdministrativeClicksPage />;
}
