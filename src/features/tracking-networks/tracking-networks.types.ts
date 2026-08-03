export type TrackingDomainStatus =
  "pending_verification" | "active" | "suspended" | "archived";

export type TrackingDomainProvider = "manual" | "render";

export type TrackingDomainProviderVerificationStatus =
  "not_applicable" | "unregistered" | "unverified" | "verified";

export type TrackingDomainProvisioningStatus =
  | "manual"
  | "ownership_pending"
  | "ownership_verified"
  | "provider_pending"
  | "dns_pending"
  | "tls_pending"
  | "active"
  | "failed"
  | "disconnected";

export type NetworkProviderStatus = "active" | "archived";

export type ProviderPostbackConversionStatus = "pending" | "approved";

export type NetworkAccountStatus = "active" | "suspended" | "archived";

export type TrackingModuleLoadStatus =
  "idle" | "loading" | "ready" | "error" | "forbidden";

export type TrackingDomain = {
  id: string;
  companyId: string;
  hostname: string;
  status: TrackingDomainStatus;
  verificationToken: string;
  ownershipRecordName: string;
  ownershipRecordValue: string;
  verifiedAt: string | null;
  isPrimary: boolean;
  provider: TrackingDomainProvider;
  providerCustomDomainId: string | null;
  providerVerificationStatus: TrackingDomainProviderVerificationStatus;
  provisioningStatus: TrackingDomainProvisioningStatus;
  dnsRecordType: "CNAME" | null;
  dnsRecordName: string | null;
  dnsTarget: string | null;
  ownershipVerifiedAt: string | null;
  dnsVerifiedAt: string | null;
  tlsVerifiedAt: string | null;
  lastCheckedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  disconnectedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NetworkProviderIntegration = {
  defaultTrackingParameter: string | null;
  postbackClickIdToken: string | null;
  postbackConversionIdToken: string | null;
  postbackRevenueAmountToken: string | null;
  postbackRevenueCurrencyToken: string | null;
  postbackConversionStatus: ProviderPostbackConversionStatus;
  configured: boolean;
};

export type NetworkProviderIntegrationInput = Omit<
  NetworkProviderIntegration,
  "configured"
>;

export type NetworkProvider = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  status: NetworkProviderStatus;
  websiteUrl: string | null;
  documentationUrl: string | null;
  integration: NetworkProviderIntegration;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NetworkAccount = {
  id: string;
  companyId: string;
  providerId: string;
  providerCode: string;
  providerName: string;
  name: string;
  externalAccountId: string | null;
  status: NetworkAccountStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTrackingDomainInput = {
  hostname: string;
};

export type UpdateTrackingDomainInput = {
  domainId: string;
  hostname?: string;
  status?: "active" | "suspended" | "archived";
  isPrimary?: boolean;
};

export type UpdatePlatformTrackingDomainStatusInput = {
  domainId: string;
  status: "active" | "suspended" | "archived";
};

export type AdoptPlatformTrackingDomainInput = {
  domainId: string;
};

export type ReconcilePlatformTrackingDomainInput = {
  domainId: string;
};

export type DisconnectPlatformTrackingDomainInput = {
  domainId: string;
};

export type CreateNetworkProviderInput = {
  code: string;
  name: string;
  websiteUrl?: string | null;
  documentationUrl?: string | null;
  integration?: NetworkProviderIntegrationInput;
};

export type UpdateNetworkProviderInput = {
  providerId: string;
  name?: string;
  status?: NetworkProviderStatus;
  websiteUrl?: string | null;
  documentationUrl?: string | null;
  integration?: NetworkProviderIntegrationInput;
};

export type CreateNetworkAccountInput = {
  providerId: string;
  name: string;
  externalAccountId?: string | null;
};

export type UpdateNetworkAccountInput = {
  accountId: string;
  providerId?: string;
  name?: string;
  externalAccountId?: string | null;
  status?: NetworkAccountStatus;
};
