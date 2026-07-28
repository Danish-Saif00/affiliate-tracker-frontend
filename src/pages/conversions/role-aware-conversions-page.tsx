import { useAuth } from "../../features/auth/use-auth";
import { ConversionsPage as AdministrativeConversionsPage } from "./conversions-page";
import { PublisherConversionsPage } from "./publisher-conversions-page";

export function ConversionsPage() {
  const auth = useAuth();
  const membership = auth.identity?.authorization.companyMembership ?? null;
  const isPublisher =
    membership?.status === "active" && membership.role === "publisher";

  return isPublisher ? (
    <PublisherConversionsPage />
  ) : (
    <AdministrativeConversionsPage />
  );
}
