import {
  authenticatedApiRequest,
  isRecord,
  readNullableString,
  readRequiredNumber,
  readRequiredString,
} from '../../lib/api-client';
import type {
  AccountProfile,
  BillingInvoice,
  ClickLogFilters,
  ClickLogRecord,
  ConversionLogFilters,
  ConversionLogRecord,
  CreateManualConversionInput,
  ManualConversion,
  PerformanceReportDimension,
  PerformanceReportFilters,
  PerformanceReportRow,
  SessionLogFilters,
  SessionLogRecord,
  UpdateAccountProfileInput,
  UserAgentLogFilters,
  UserAgentLogRecord,
} from './final-operations.types';

function readData(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new Error('The API returned an invalid final-operations response.');
  }

  return payload.data;
}

function readArray(value: unknown, fieldName: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`The API returned an invalid ${fieldName}.`);
  }

  return value;
}

function readOptionalString(value: unknown, fieldName: string): string | null {
  return value === null ? null : readRequiredString(value, fieldName);
}

function readDevice(value: unknown): ClickLogRecord['device'] {
  const normalized = readRequiredString(value, 'device');

  switch (normalized) {
    case 'desktop':
    case 'mobile':
    case 'tablet':
    case 'other':
      return normalized;
    default:
      throw new Error('The API returned an unsupported device.');
  }
}

function readReviewStatus(value: unknown): ClickLogRecord['status'] {
  const normalized = readRequiredString(value, 'review status');

  switch (normalized) {
    case 'approved':
    case 'rejected':
    case 'unchecked':
      return normalized;
    default:
      throw new Error('The API returned an unsupported review status.');
  }
}

function appendQuery(
  parameters: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void {
  if (value === undefined || value === '') {
    return;
  }

  parameters.set(key, String(value));
}

function createQueryString(
  filters:
    | PerformanceReportFilters
    | ClickLogFilters
    | ConversionLogFilters
    | SessionLogFilters
    | UserAgentLogFilters,
): string {
  const parameters = new URLSearchParams();

  appendQuery(parameters, 'from', filters.from);
  appendQuery(parameters, 'to', filters.to);
  appendQuery(parameters, 'search', filters.search);
  appendQuery(parameters, 'ownerMembershipId', filters.ownerMembershipId);
  appendQuery(parameters, 'countryCode', filters.countryCode);
  appendQuery(parameters, 'device', filters.device);
  appendQuery(parameters, 'limit', filters.limit);

  if ('offerId' in filters) {
    appendQuery(parameters, 'offerId', filters.offerId);
  }

  if ('networkAccountId' in filters) {
    appendQuery(parameters, 'networkAccountId', filters.networkAccountId);
  }

  if ('status' in filters) {
    appendQuery(parameters, 'status', filters.status);
  }

  if ('dimensionStatus' in filters) {
    appendQuery(parameters, 'dimensionStatus', filters.dimensionStatus);
  }

  if ('conversionStatus' in filters) {
    appendQuery(parameters, 'conversionStatus', filters.conversionStatus);
  }

  const serialized = parameters.toString();

  return serialized.length === 0 ? '' : `?${serialized}`;
}

function parsePerformanceRow(value: unknown): PerformanceReportRow {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid performance row.');
  }

  return {
    dimensionId: readRequiredString(value.dimensionId, 'dimension id'),
    dimensionName: readRequiredString(value.dimensionName, 'dimension name'),
    dimensionStatus: readRequiredString(value.dimensionStatus, 'dimension status'),
    approvedClicks: readRequiredNumber(value.approvedClicks, 'approved clicks'),
    rejectedClicks: readRequiredNumber(value.rejectedClicks, 'rejected clicks'),
    uncheckedClicks: readRequiredNumber(value.uncheckedClicks, 'unchecked clicks'),
    totalClicks: readRequiredNumber(value.totalClicks, 'total clicks'),
    approvedConversions: readRequiredNumber(
      value.approvedConversions,
      'approved conversions',
    ),
    rejectedConversions: readRequiredNumber(
      value.rejectedConversions,
      'rejected conversions',
    ),
    uncheckedConversions: readRequiredNumber(
      value.uncheckedConversions,
      'unchecked conversions',
    ),
    totalConversions: readRequiredNumber(
      value.totalConversions,
      'total conversions',
    ),
  };
}

function parseClick(value: unknown): ClickLogRecord {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid click log.');
  }

  const duplicateDecision = readRequiredString(
    value.duplicateDecision,
    'duplicate decision',
  );
  const fraudRiskLevel = readRequiredString(value.fraudRiskLevel, 'fraud risk');
  const proxyDetectionOutcome = readRequiredString(
    value.proxyDetectionOutcome,
    'proxy outcome',
  );

  if (duplicateDecision !== 'accepted' && duplicateDecision !== 'duplicate') {
    throw new Error('The API returned an unsupported duplicate decision.');
  }

  if (!['low', 'medium', 'high'].includes(fraudRiskLevel)) {
    throw new Error('The API returned an unsupported fraud risk.');
  }

  if (
    ![
      'not_checked',
      'bypassed',
      'clean',
      'flagged',
      'blocked',
      'provider_failed',
    ].includes(proxyDetectionOutcome)
  ) {
    throw new Error('The API returned an unsupported proxy outcome.');
  }

  return {
    id: readRequiredString(value.id, 'click id'),
    publicClickId: readRequiredString(value.publicClickId, 'public click id'),
    offerId: readRequiredString(value.offerId, 'offer id'),
    offerName: readRequiredString(value.offerName, 'offer name'),
    trackingDomainId: readRequiredString(value.trackingDomainId, 'domain id'),
    trackingDomainName: readRequiredString(value.trackingDomainName, 'domain name'),
    networkAccountId: readRequiredString(value.networkAccountId, 'network account id'),
    networkAccountName: readRequiredString(
      value.networkAccountName,
      'network account name',
    ),
    ownerMembershipId: readRequiredString(value.ownerMembershipId, 'publisher id'),
    publisherName: readRequiredString(value.publisherName, 'publisher name'),
    ipHash: readRequiredString(value.ipHash, 'IP privacy hash'),
    countryCode: readOptionalString(value.countryCode, 'country code'),
    device: readDevice(value.device),
    browser: readRequiredString(value.browser, 'browser'),
    userAgent: readOptionalString(value.userAgent, 'user agent'),
    status: readReviewStatus(value.status),
    duplicateDecision,
    fraudRiskLevel: fraudRiskLevel as ClickLogRecord['fraudRiskLevel'],
    proxyDetectionOutcome:
      proxyDetectionOutcome as ClickLogRecord['proxyDetectionOutcome'],
    capturedAt: readRequiredString(value.capturedAt, 'capture time'),
  };
}

function parseConversion(value: unknown): ConversionLogRecord {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid conversion log.');
  }

  const source = readRequiredString(value.source, 'conversion source');
  const status = readRequiredString(value.status, 'conversion status');

  if (source !== 'provider_postback' && source !== 'manual') {
    throw new Error('The API returned an unsupported conversion source.');
  }

  if (!['pending', 'approved', 'rejected', 'reversed'].includes(status)) {
    throw new Error('The API returned an unsupported conversion status.');
  }

  return {
    id: readRequiredString(value.id, 'conversion id'),
    publicConversionId: readRequiredString(
      value.publicConversionId,
      'public conversion id',
    ),
    publicClickId: readRequiredString(value.publicClickId, 'public click id'),
    offerId: readRequiredString(value.offerId, 'offer id'),
    offerName: readRequiredString(value.offerName, 'offer name'),
    trackingDomainId: readRequiredString(value.trackingDomainId, 'domain id'),
    trackingDomainName: readRequiredString(value.trackingDomainName, 'domain name'),
    networkAccountId: readRequiredString(value.networkAccountId, 'network account id'),
    networkAccountName: readRequiredString(
      value.networkAccountName,
      'network account name',
    ),
    ownerMembershipId: readRequiredString(value.ownerMembershipId, 'publisher id'),
    publisherName: readRequiredString(value.publisherName, 'publisher name'),
    countryCode: readOptionalString(value.countryCode, 'country code'),
    device: readDevice(value.device),
    browser: readRequiredString(value.browser, 'browser'),
    source,
    status: status as ConversionLogRecord['status'],
    reviewStatus: readReviewStatus(value.reviewStatus),
    revenueAmountMinor:
      value.revenueAmountMinor === null
        ? null
        : readRequiredNumber(value.revenueAmountMinor, 'revenue amount'),
    revenueCurrency: readNullableString(value.revenueCurrency, 'revenue currency'),
    payoutAmountMinor: readRequiredNumber(value.payoutAmountMinor, 'payout amount'),
    payoutCurrency: readRequiredString(value.payoutCurrency, 'payout currency'),
    convertedAt: readRequiredString(value.convertedAt, 'conversion time'),
  };
}

function parseSession(value: unknown): SessionLogRecord {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid session log.');
  }

  return {
    visitorId: readRequiredString(value.visitorId, 'visitor id'),
    ownerMembershipId: readRequiredString(value.ownerMembershipId, 'publisher id'),
    publisherName: readRequiredString(value.publisherName, 'publisher name'),
    ipHash: readRequiredString(value.ipHash, 'IP privacy hash'),
    countryCode: readOptionalString(value.countryCode, 'country code'),
    device: readDevice(value.device),
    browser: readRequiredString(value.browser, 'browser'),
    clickCount: readRequiredNumber(value.clickCount, 'session click count'),
    firstSeenAt: readRequiredString(value.firstSeenAt, 'first seen time'),
    lastSeenAt: readRequiredString(value.lastSeenAt, 'last seen time'),
  };
}

function parseUserAgent(value: unknown): UserAgentLogRecord {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid user-agent log.');
  }

  return {
    userAgentHash: readRequiredString(value.userAgentHash, 'user-agent hash'),
    userAgent: readOptionalString(value.userAgent, 'user agent'),
    device: readDevice(value.device),
    browser: readRequiredString(value.browser, 'browser'),
    clickCount: readRequiredNumber(value.clickCount, 'user-agent click count'),
    lastSeenAt: readRequiredString(value.lastSeenAt, 'last seen time'),
  };
}

function parseAccountProfile(value: unknown): AccountProfile {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid account profile.');
  }

  return {
    userId: readRequiredString(value.userId, 'account user id'),
    email: readRequiredString(value.email, 'account email'),
    displayName: readNullableString(value.displayName, 'display name'),
    timezone: readRequiredString(value.timezone, 'account timezone'),
    updatedAt: readRequiredString(value.updatedAt, 'profile update time'),
  };
}

function parseInvoice(value: unknown): BillingInvoice {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid billing invoice.');
  }

  const status = readRequiredString(value.status, 'invoice status');

  if (!['issued', 'paid', 'overdue', 'void'].includes(status)) {
    throw new Error('The API returned an unsupported invoice status.');
  }

  return {
    id: readRequiredString(value.id, 'invoice id'),
    companyId: readRequiredString(value.companyId, 'invoice company id'),
    subscriptionId: readRequiredString(value.subscriptionId, 'subscription id'),
    planId: readRequiredString(value.planId, 'invoice plan id'),
    planName: readRequiredString(value.planName, 'invoice plan name'),
    invoiceNumber: readRequiredString(value.invoiceNumber, 'invoice number'),
    status: status as BillingInvoice['status'],
    currency: readRequiredString(value.currency, 'invoice currency'),
    amountMinor: readRequiredNumber(value.amountMinor, 'invoice amount'),
    periodStartsAt: readRequiredString(value.periodStartsAt, 'period start'),
    periodEndsAt: readNullableString(value.periodEndsAt, 'period end'),
    issuedAt: readRequiredString(value.issuedAt, 'invoice issue time'),
    dueAt: readNullableString(value.dueAt, 'invoice due time'),
    paidAt: readNullableString(value.paidAt, 'invoice paid time'),
    externalReference: readNullableString(
      value.externalReference,
      'invoice external reference',
    ),
  };
}

function parseManualConversion(value: unknown): ManualConversion {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid manual conversion.');
  }

  const status = readRequiredString(value.status, 'manual conversion status');

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    throw new Error('The API returned an unsupported manual conversion status.');
  }

  if (value.source !== 'manual') {
    throw new Error('The API returned a non-manual conversion.');
  }

  return {
    id: readRequiredString(value.id, 'manual conversion id'),
    publicConversionId: readRequiredString(
      value.publicConversionId,
      'public conversion id',
    ),
    publicClickId: readRequiredString(value.publicClickId, 'public click id'),
    source: 'manual',
    status: status as ManualConversion['status'],
    payoutAmountMinor: readRequiredNumber(value.payoutAmountMinor, 'payout amount'),
    payoutCurrency: readRequiredString(value.payoutCurrency, 'payout currency'),
    convertedAt: readRequiredString(value.convertedAt, 'conversion time'),
  };
}

export async function fetchPerformanceReport(
  accessToken: string,
  companyId: string,
  dimension: PerformanceReportDimension,
  filters: PerformanceReportFilters,
  signal?: AbortSignal,
): Promise<readonly PerformanceReportRow[]> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/reports/${dimension}${createQueryString(filters)}`,
    {
      companyId,
      ...(signal !== undefined ? { signal } : {}),
    },
  );

  return readArray(readData(payload).rows, 'performance report rows').map(
    parsePerformanceRow,
  );
}

export async function fetchClickLogs(
  accessToken: string,
  companyId: string,
  filters: ClickLogFilters,
  signal?: AbortSignal,
): Promise<readonly ClickLogRecord[]> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/logs/clicks${createQueryString(filters)}`,
    {
      companyId,
      ...(signal !== undefined ? { signal } : {}),
    },
  );

  return readArray(readData(payload).clicks, 'click logs').map(parseClick);
}

export async function fetchConversionLogs(
  accessToken: string,
  companyId: string,
  filters: ConversionLogFilters,
  signal?: AbortSignal,
): Promise<readonly ConversionLogRecord[]> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/logs/conversions${createQueryString(filters)}`,
    {
      companyId,
      ...(signal !== undefined ? { signal } : {}),
    },
  );

  return readArray(readData(payload).conversions, 'conversion logs').map(
    parseConversion,
  );
}

export async function createManualConversion(
  accessToken: string,
  companyId: string,
  input: CreateManualConversionInput,
): Promise<ManualConversion> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/logs/conversions/manual`,
    {
      companyId,
      method: 'POST',
      body: input,
    },
  );

  return parseManualConversion(readData(payload).conversion);
}

export async function fetchSessionLogs(
  accessToken: string,
  companyId: string,
  filters: SessionLogFilters,
  signal?: AbortSignal,
): Promise<readonly SessionLogRecord[]> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/logs/sessions${createQueryString(filters)}`,
    {
      companyId,
      ...(signal !== undefined ? { signal } : {}),
    },
  );

  return readArray(readData(payload).sessions, 'session logs').map(parseSession);
}

export async function fetchUserAgentLogs(
  accessToken: string,
  companyId: string,
  filters: UserAgentLogFilters,
  signal?: AbortSignal,
): Promise<readonly UserAgentLogRecord[]> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/logs/user-agents${createQueryString(filters)}`,
    {
      companyId,
      ...(signal !== undefined ? { signal } : {}),
    },
  );

  return readArray(readData(payload).userAgents, 'user-agent logs').map(
    parseUserAgent,
  );
}

export async function fetchAccountProfile(
  accessToken: string,
  signal?: AbortSignal,
): Promise<AccountProfile> {
  const payload = await authenticatedApiRequest(accessToken, '/me/profile', {
    ...(signal !== undefined ? { signal } : {}),
  });

  return parseAccountProfile(readData(payload).profile);
}

export async function updateAccountProfile(
  accessToken: string,
  input: UpdateAccountProfileInput,
): Promise<AccountProfile> {
  const payload = await authenticatedApiRequest(accessToken, '/me/profile', {
    method: 'PUT',
    body: input,
  });

  return parseAccountProfile(readData(payload).profile);
}

export async function fetchBillingInvoices(
  accessToken: string,
  companyId: string,
  limit = 100,
  signal?: AbortSignal,
): Promise<readonly BillingInvoice[]> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${encodeURIComponent(companyId)}/billing/invoices?limit=${String(limit)}`,
    {
      companyId,
      ...(signal !== undefined ? { signal } : {}),
    },
  );

  return readArray(readData(payload).invoices, 'billing invoices').map(
    parseInvoice,
  );
}
