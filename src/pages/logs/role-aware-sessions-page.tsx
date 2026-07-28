import { useAuth } from "../../features/auth/use-auth";
import { SessionsPage as AdministrativeSessionsPage } from "./sessions-page";
import { PublisherSessionsPage } from "./publisher-sessions-page";

export function SessionsPage() {
  const auth = useAuth();
  const membership = auth.identity?.authorization.companyMembership ?? null;
  const isPublisher =
    membership?.status === "active" && membership.role === "publisher";

  return isPublisher ? <PublisherSessionsPage /> : <AdministrativeSessionsPage />;
}
