import { useAuth } from "../../features/auth/use-auth";
import { UserAgentsPage as AdministrativeUserAgentsPage } from "./user-agents-page";
import { PublisherUserAgentsPage } from "./publisher-user-agents-page";

export function UserAgentsPage() {
  const auth = useAuth();
  const membership = auth.identity?.authorization.companyMembership ?? null;
  const isPublisher =
    membership?.status === "active" && membership.role === "publisher";

  return isPublisher ? <PublisherUserAgentsPage /> : <AdministrativeUserAgentsPage />;
}
