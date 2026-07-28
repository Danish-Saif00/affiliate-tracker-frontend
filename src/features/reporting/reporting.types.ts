export type ReportingPeriod = {
  from: string;
  to: string;
};

export type ReportingMonetaryTotal = {
  currency: string;
  revenueAmountMinor: number;
  payoutAmountMinor: number;
};

export type ReportingTotals = {
  clicks: number;
  uniqueVisitors: number;
  duplicateClicks: number;
  highRiskClicks: number;
  conversions: number;
  approvedConversions: number;
  monetaryTotals: readonly ReportingMonetaryTotal[];
};

export type ReportingPerformanceRow = {
  dimensionId: string;
  dimensionName: string;
  clicks: number;
  conversions: number;
  approvedConversions: number;
  monetaryTotals: readonly ReportingMonetaryTotal[];
};

export type CompanyReportingDashboard = {
  companyId: string;
  period: ReportingPeriod;
  totals: ReportingTotals;
  offers: readonly ReportingPerformanceRow[];
  networkAccounts: readonly ReportingPerformanceRow[];
  members: readonly ReportingPerformanceRow[];
};

export type OperationalEvent = {
  id: string;
  companyId: string | null;
  actorUserId: string | null;
  requestId: string | null;
  eventName: string;
  entityType: string;
  entityId: string | null;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: string;
};
