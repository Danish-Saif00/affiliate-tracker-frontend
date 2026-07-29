import { useAuth } from "../../features/auth/use-auth";
import type { PerformanceReportDimension } from "../../features/final-operations/final-operations.types";
import { ControlAccessDenied } from "../control-plane/control-plane-ui";
import { ReportsPage as AdministrativeReportsPage } from "./reports-page";

export function ReportsPage({
  dimension,
}: {
  dimension: PerformanceReportDimension;
}) {
  const auth = useAuth();
  const membership = auth.identity?.authorization.companyMembership ?? null;
  const isPublisher =
    membership?.status === "active" && membership.role === "publisher";

  if (isPublisher && dimension !== "offers") {
    return (
      <ControlAccessDenied
        message="Publishers can access only their own Offer performance report."
        title="Report unavailable"
      />
    );
  }

  return (
    <AdministrativeReportsPage
      dimension={dimension}
      hideModuleHeader={isPublisher}
    />
  );
}
