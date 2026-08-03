import {
  authenticatedApiRequest,
  isRecord,
  readNullableString,
  readRequiredString,
} from "../../lib/api-client";
import type {
  AdoptPlatformTrackingDomainInput,
  CreateNetworkAccountInput,
  CreateNetworkProviderInput,
  CreateTrackingDomainInput,
  DisconnectPlatformTrackingDomainInput,
  NetworkAccount,
  NetworkAccountStatus,
  NetworkProvider,
  NetworkProviderIntegration,
  NetworkProviderStatus,
  ReconcilePlatformTrackingDomainInput,
  TrackingDomain,
  TrackingDomainProvider,
  TrackingDomainProviderVerificationStatus,
  TrackingDomainProvisioningStatus,
  TrackingDomainStatus,
  UpdateNetworkAccountInput,
  UpdateNetworkProviderInput,
  UpdatePlatformTrackingDomainStatusInput,
  UpdateTrackingDomainInput,
} from "./tracking-networks.types";

type DataPayload = {
  data?: unknown;
};

function readData(payload: unknown): unknown {
  const envelope = isRecord(payload) ? (payload as DataPayload) : {};
  return envelope.data;
}

function readBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`The API returned an invalid ${fieldName}.`);
  }

  return value;
}

function readTrackingDomainStatus(value: unknown): TrackingDomainStatus {
  const status = readRequiredString(value, "tracking domain status");

  if (
    !["pending_verification", "active", "suspended", "archived"].includes(
      status,
    )
  ) {
    throw new Error("The API returned an unsupported tracking domain status.");
  }

  return status as TrackingDomainStatus;
}

function readTrackingDomainProvider(value: unknown): TrackingDomainProvider {
  const provider = readRequiredString(value, "tracking domain provider");

  if (provider !== "manual" && provider !== "render") {
    throw new Error(
      "The API returned an unsupported tracking domain provider.",
    );
  }

  return provider;
}

function readTrackingDomainProviderVerificationStatus(
  value: unknown,
): TrackingDomainProviderVerificationStatus {
  const status = readRequiredString(
    value,
    "tracking domain provider verification status",
  );

  if (
    !["not_applicable", "unregistered", "unverified", "verified"].includes(
      status,
    )
  ) {
    throw new Error(
      "The API returned an unsupported tracking domain provider verification status.",
    );
  }

  return status as TrackingDomainProviderVerificationStatus;
}

function readTrackingDomainProvisioningStatus(
  value: unknown,
): TrackingDomainProvisioningStatus {
  const status = readRequiredString(
    value,
    "tracking domain provisioning status",
  );

  if (
    ![
      "manual",
      "ownership_pending",
      "ownership_verified",
      "provider_pending",
      "dns_pending",
      "tls_pending",
      "active",
      "failed",
      "disconnected",
    ].includes(status)
  ) {
    throw new Error(
      "The API returned an unsupported tracking domain provisioning status.",
    );
  }

  return status as TrackingDomainProvisioningStatus;
}

function readNullableCname(value: unknown): "CNAME" | null {
  if (value === null) {
    return null;
  }

  if (value !== "CNAME") {
    throw new Error(
      "The API returned an unsupported tracking domain DNS record type.",
    );
  }

  return value;
}

function readNetworkProviderStatus(value: unknown): NetworkProviderStatus {
  const status = readRequiredString(value, "network provider status");

  if (!["active", "archived"].includes(status)) {
    throw new Error("The API returned an unsupported network provider status.");
  }

  return status as NetworkProviderStatus;
}

function readNetworkAccountStatus(value: unknown): NetworkAccountStatus {
  const status = readRequiredString(value, "network account status");

  if (!["active", "suspended", "archived"].includes(status)) {
    throw new Error("The API returned an unsupported network account status.");
  }

  return status as NetworkAccountStatus;
}

function parseTrackingDomain(value: unknown): TrackingDomain {
  if (!isRecord(value)) {
    throw new Error("The API returned an invalid tracking domain.");
  }

  return {
    id: readRequiredString(value.id, "tracking domain id"),
    companyId: readRequiredString(
      value.companyId,
      "tracking domain company id",
    ),
    hostname: readRequiredString(value.hostname, "tracking domain hostname"),
    status: readTrackingDomainStatus(value.status),
    verificationToken: readRequiredString(
      value.verificationToken,
      "tracking domain verification token",
    ),
    ownershipRecordName: readRequiredString(
      value.ownershipRecordName,
      "tracking domain ownership record name",
    ),
    ownershipRecordValue: readRequiredString(
      value.ownershipRecordValue,
      "tracking domain ownership record value",
    ),
    verifiedAt: readNullableString(
      value.verifiedAt,
      "tracking domain verification time",
    ),
    isPrimary: readBoolean(value.isPrimary, "tracking domain primary flag"),
    provider: readTrackingDomainProvider(value.provider),
    providerCustomDomainId: readNullableString(
      value.providerCustomDomainId,
      "tracking domain provider id",
    ),
    providerVerificationStatus: readTrackingDomainProviderVerificationStatus(
      value.providerVerificationStatus,
    ),
    provisioningStatus: readTrackingDomainProvisioningStatus(
      value.provisioningStatus,
    ),
    dnsRecordType: readNullableCname(value.dnsRecordType),
    dnsRecordName: readNullableString(
      value.dnsRecordName,
      "tracking domain DNS record name",
    ),
    dnsTarget: readNullableString(
      value.dnsTarget,
      "tracking domain DNS target",
    ),
    ownershipVerifiedAt: readNullableString(
      value.ownershipVerifiedAt,
      "tracking domain ownership verification time",
    ),
    dnsVerifiedAt: readNullableString(
      value.dnsVerifiedAt,
      "tracking domain DNS verification time",
    ),
    tlsVerifiedAt: readNullableString(
      value.tlsVerifiedAt,
      "tracking domain TLS verification time",
    ),
    lastCheckedAt: readNullableString(
      value.lastCheckedAt,
      "tracking domain last check time",
    ),
    lastErrorCode: readNullableString(
      value.lastErrorCode,
      "tracking domain last error code",
    ),
    lastErrorMessage: readNullableString(
      value.lastErrorMessage,
      "tracking domain last error message",
    ),
    disconnectedAt: readNullableString(
      value.disconnectedAt,
      "tracking domain disconnect time",
    ),
    createdBy: readNullableString(value.createdBy, "tracking domain creator"),
    updatedBy: readNullableString(value.updatedBy, "tracking domain updater"),
    createdAt: readRequiredString(
      value.createdAt,
      "tracking domain created time",
    ),
    updatedAt: readRequiredString(
      value.updatedAt,
      "tracking domain updated time",
    ),
  };
}

function parseNetworkProviderIntegration(
  value: unknown,
): NetworkProviderIntegration {
  if (!isRecord(value)) {
    throw new Error(
      "The API returned an invalid Provider integration profile.",
    );
  }

  const postbackConversionStatus = readRequiredString(
    value.postbackConversionStatus,
    "Provider postback conversion status",
  );

  if (
    postbackConversionStatus !== "pending" &&
    postbackConversionStatus !== "approved"
  ) {
    throw new Error(
      "The API returned an unsupported Provider postback status.",
    );
  }

  return {
    defaultTrackingParameter: readNullableString(
      value.defaultTrackingParameter,
      "Provider default tracking parameter",
    ),
    postbackClickIdToken: readNullableString(
      value.postbackClickIdToken,
      "Provider click ID token",
    ),
    postbackConversionIdToken: readNullableString(
      value.postbackConversionIdToken,
      "Provider conversion ID token",
    ),
    postbackRevenueAmountToken: readNullableString(
      value.postbackRevenueAmountToken,
      "Provider revenue amount token",
    ),
    postbackRevenueCurrencyToken: readNullableString(
      value.postbackRevenueCurrencyToken,
      "Provider revenue currency token",
    ),
    postbackConversionStatus,
    configured: readBoolean(
      value.configured,
      "Provider integration configured flag",
    ),
  };
}

function parseNetworkProvider(value: unknown): NetworkProvider {
  if (!isRecord(value)) {
    throw new Error("The API returned an invalid network provider.");
  }

  return {
    id: readRequiredString(value.id, "network provider id"),
    companyId: readRequiredString(
      value.companyId,
      "network provider company id",
    ),
    code: readRequiredString(value.code, "network provider code"),
    name: readRequiredString(value.name, "network provider name"),
    status: readNetworkProviderStatus(value.status),
    websiteUrl: readNullableString(
      value.websiteUrl,
      "network provider website",
    ),
    documentationUrl: readNullableString(
      value.documentationUrl,
      "network provider documentation",
    ),
    integration: parseNetworkProviderIntegration(value.integration),
    createdBy: readNullableString(value.createdBy, "network provider creator"),
    createdAt: readRequiredString(
      value.createdAt,
      "network provider created time",
    ),
    updatedAt: readRequiredString(
      value.updatedAt,
      "network provider updated time",
    ),
  };
}

function parseNetworkAccount(value: unknown): NetworkAccount {
  if (!isRecord(value)) {
    throw new Error("The API returned an invalid network account.");
  }

  return {
    id: readRequiredString(value.id, "network account id"),
    companyId: readRequiredString(
      value.companyId,
      "network account company id",
    ),
    providerId: readRequiredString(
      value.providerId,
      "network account provider id",
    ),
    providerCode: readRequiredString(
      value.providerCode,
      "network account provider code",
    ),
    providerName: readRequiredString(
      value.providerName,
      "network account provider name",
    ),
    name: readRequiredString(value.name, "network account name"),
    externalAccountId: readNullableString(
      value.externalAccountId,
      "network account external id",
    ),
    status: readNetworkAccountStatus(value.status),
    createdBy: readNullableString(value.createdBy, "network account creator"),
    updatedBy: readNullableString(value.updatedBy, "network account updater"),
    createdAt: readRequiredString(
      value.createdAt,
      "network account created time",
    ),
    updatedAt: readRequiredString(
      value.updatedAt,
      "network account updated time",
    ),
  };
}

function readCollection<T>(
  payload: unknown,
  parser: (value: unknown) => T,
): readonly T[] {
  const data = readData(payload);

  if (!Array.isArray(data)) {
    throw new Error("The API returned an invalid collection.");
  }

  return data.map(parser);
}

export async function fetchTrackingDomains(
  accessToken: string,
  companyId: string,
  platformAdmin: boolean,
  signal?: AbortSignal,
): Promise<readonly TrackingDomain[]> {
  const path = platformAdmin
    ? `/platform/tracking-domains?companyId=${encodeURIComponent(companyId)}`
    : `/companies/${companyId}/tracking-domains`;
  const payload = await authenticatedApiRequest(accessToken, path, {
    companyId,
    ...(signal !== undefined ? { signal } : {}),
  });

  return readCollection(payload, parseTrackingDomain);
}

export async function createTrackingDomain(
  accessToken: string,
  companyId: string,
  input: CreateTrackingDomainInput,
): Promise<TrackingDomain> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${companyId}/tracking-domains`,
    {
      method: "POST",
      companyId,
      body: {
        hostname: input.hostname.trim().toLowerCase(),
      },
    },
  );

  return parseTrackingDomain(readData(payload));
}

export async function updateTrackingDomain(
  accessToken: string,
  companyId: string,
  input: UpdateTrackingDomainInput,
): Promise<TrackingDomain> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${companyId}/tracking-domains/${input.domainId}`,
    {
      method: "PATCH",
      companyId,
      body: {
        ...(input.hostname !== undefined
          ? { hostname: input.hostname.trim().toLowerCase() }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.isPrimary !== undefined
          ? { isPrimary: input.isPrimary }
          : {}),
      },
    },
  );

  return parseTrackingDomain(readData(payload));
}

export async function updatePlatformTrackingDomainStatus(
  accessToken: string,
  companyId: string,
  input: UpdatePlatformTrackingDomainStatusInput,
): Promise<TrackingDomain> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/platform/tracking-domains/${input.domainId}/status`,
    {
      method: "PATCH",
      companyId,
      body: { status: input.status },
    },
  );

  return parseTrackingDomain(readData(payload));
}

export async function adoptPlatformTrackingDomain(
  accessToken: string,
  companyId: string,
  input: AdoptPlatformTrackingDomainInput,
): Promise<TrackingDomain> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/platform/tracking-domains/${encodeURIComponent(input.domainId)}/adopt`,
    {
      method: "POST",
      companyId,
    },
  );

  return parseTrackingDomain(readData(payload));
}

export async function reconcilePlatformTrackingDomain(
  accessToken: string,
  companyId: string,
  input: ReconcilePlatformTrackingDomainInput,
): Promise<TrackingDomain> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/platform/tracking-domains/${encodeURIComponent(input.domainId)}/reconcile`,
    {
      method: "POST",
      companyId,
    },
  );

  return parseTrackingDomain(readData(payload));
}

export async function disconnectPlatformTrackingDomain(
  accessToken: string,
  companyId: string,
  input: DisconnectPlatformTrackingDomainInput,
): Promise<TrackingDomain> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/platform/tracking-domains/${encodeURIComponent(input.domainId)}/disconnect`,
    {
      method: "POST",
      companyId,
    },
  );

  return parseTrackingDomain(readData(payload));
}

export async function fetchNetworkProviders(
  accessToken: string,
  companyId: string,
  signal?: AbortSignal,
): Promise<readonly NetworkProvider[]> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/network-providers`,
    {
      companyId,
      ...(signal !== undefined ? { signal } : {}),
    },
  );

  return readCollection(payload, parseNetworkProvider);
}

export async function createCompanyNetworkProvider(
  accessToken: string,
  companyId: string,
  input: CreateNetworkProviderInput,
): Promise<NetworkProvider> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/network-providers`,
    {
      method: "POST",
      companyId,
      body: {
        code: input.code.trim().toLowerCase(),
        name: input.name.trim(),
        ...(input.websiteUrl !== undefined
          ? {
              websiteUrl:
                input.websiteUrl === null ? null : input.websiteUrl.trim(),
            }
          : {}),
        ...(input.documentationUrl !== undefined
          ? {
              documentationUrl:
                input.documentationUrl === null
                  ? null
                  : input.documentationUrl.trim(),
            }
          : {}),
        ...(input.integration !== undefined
          ? { integration: input.integration }
          : {}),
      },
    },
  );

  return parseNetworkProvider(readData(payload));
}

export async function updateCompanyNetworkProvider(
  accessToken: string,
  companyId: string,
  input: UpdateNetworkProviderInput,
): Promise<NetworkProvider> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/network-providers/${encodeURIComponent(
      input.providerId,
    )}`,
    {
      method: "PATCH",
      companyId,
      body: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.websiteUrl !== undefined
          ? {
              websiteUrl:
                input.websiteUrl === null ? null : input.websiteUrl.trim(),
            }
          : {}),
        ...(input.documentationUrl !== undefined
          ? {
              documentationUrl:
                input.documentationUrl === null
                  ? null
                  : input.documentationUrl.trim(),
            }
          : {}),
        ...(input.integration !== undefined
          ? { integration: input.integration }
          : {}),
      },
    },
  );

  return parseNetworkProvider(readData(payload));
}

export async function fetchNetworkAccounts(
  accessToken: string,
  companyId: string,
  signal?: AbortSignal,
): Promise<readonly NetworkAccount[]> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/network-accounts`,
    {
      companyId,
      ...(signal !== undefined ? { signal } : {}),
    },
  );

  return readCollection(payload, parseNetworkAccount);
}

export async function createNetworkAccount(
  accessToken: string,
  companyId: string,
  input: CreateNetworkAccountInput,
): Promise<NetworkAccount> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${companyId}/network-accounts`,
    {
      method: "POST",
      companyId,
      body: {
        providerId: input.providerId,
        name: input.name.trim(),
        ...(input.externalAccountId !== undefined
          ? {
              externalAccountId:
                input.externalAccountId === null
                  ? null
                  : input.externalAccountId.trim(),
            }
          : {}),
      },
    },
  );

  return parseNetworkAccount(readData(payload));
}

export async function updateNetworkAccount(
  accessToken: string,
  companyId: string,
  input: UpdateNetworkAccountInput,
): Promise<NetworkAccount> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${companyId}/network-accounts/${input.accountId}`,
    {
      method: "PATCH",
      companyId,
      body: {
        ...(input.providerId !== undefined
          ? { providerId: input.providerId }
          : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.externalAccountId !== undefined
          ? {
              externalAccountId:
                input.externalAccountId === null
                  ? null
                  : input.externalAccountId.trim(),
            }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    },
  );

  return parseNetworkAccount(readData(payload));
}
