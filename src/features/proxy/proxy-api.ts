import {
  authenticatedApiRequest,
  isRecord,
  readNullableString,
  readRequiredNumber,
  readRequiredString,
} from '../../lib/api-client';
import type {
  CompanyProxyConfiguration,
  CompanyProxyConfigurationStatus,
  CompanyProxyEnforcementMode,
  CompanyProxyFailureBehavior,
  CompanyProxyProviderCode,
  CompanyProxyTestStatus,
  UpdateCompanyProxyConfigurationInput,
} from './proxy.types';
function readData(
  payload: unknown,
): unknown {
  if (!isRecord(payload)) {
    throw new Error(
      'The API returned an invalid response envelope.',
    );
  }
  return payload.data;
}
function readNestedData(
  payload: unknown,
  key: string,
): unknown {
  const data =
    readData(payload);
  if (!isRecord(data)) {
    throw new Error(
      'The API returned an invalid response payload.',
    );
  }
  return data[key];
}
function readRequiredBoolean(
  value: unknown,
  fieldName: string,
): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(
      `The API returned an invalid ${fieldName}.`,
    );
  }
  return value;
}
function readRequiredInteger(
  value: unknown,
  fieldName: string,
): number {
  const result =
    readRequiredNumber(
      value,
      fieldName,
    );
  if (!Number.isInteger(result)) {
    throw new Error(
      `The API returned an invalid ${fieldName}.`,
    );
  }
  return result;
}
function readProviderCode(
  value: unknown,
): CompanyProxyProviderCode {
  if (
    value === 'ipqualityscore' ||
    value === 'proxycheck'
  ) {
    return value;
  }
  throw new Error(
    'The API returned an unsupported Proxy provider.',
  );
}
function readConfigurationStatus(
  value: unknown,
): CompanyProxyConfigurationStatus {
  if (
    value === 'active' ||
    value === 'disabled'
  ) {
    return value;
  }
  throw new Error(
    'The API returned an unsupported Proxy status.',
  );
}
function readEnforcementMode(
  value: unknown,
): CompanyProxyEnforcementMode {
  if (
    value === 'monitor' ||
    value === 'enforce'
  ) {
    return value;
  }
  throw new Error(
    'The API returned an unsupported Proxy enforcement mode.',
  );
}
function readFailureBehavior(
  value: unknown,
): CompanyProxyFailureBehavior {
  if (
    value === 'allow' ||
    value === 'flag' ||
    value === 'block'
  ) {
    return value;
  }
  throw new Error(
    'The API returned an unsupported Proxy failure behavior.',
  );
}
function readTestStatus(
  value: unknown,
): CompanyProxyTestStatus | null {
  if (
    value === null ||
    value === 'passed' ||
    value === 'failed'
  ) {
    return value;
  }
  throw new Error(
    'The API returned an unsupported Proxy test status.',
  );
}
function readMembershipIds(
  value: unknown,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(
      'The API returned invalid Proxy bypass memberships.',
    );
  }
  return Object.freeze(
    value.map((item) =>
      readRequiredString(
        item,
        'Proxy bypass membership ID',
      ),
    ),
  );
}
function parseProxyConfiguration(
  value: unknown,
): CompanyProxyConfiguration {
  if (!isRecord(value)) {
    throw new Error(
      'The API returned an invalid Proxy configuration.',
    );
  }
  return Object.freeze({
    id: readRequiredString(
      value.id,
      'Proxy configuration ID',
    ),
    companyId: readRequiredString(
      value.companyId,
      'Proxy company ID',
    ),
    providerCode:
      readProviderCode(
        value.providerCode,
      ),
    apiKeyLast4:
      readRequiredString(
        value.apiKeyLast4,
        'Proxy API-key suffix',
      ),
    hasApiKey:
      readRequiredBoolean(
        value.hasApiKey,
        'Proxy API-key status',
      ),
    status:
      readConfigurationStatus(
        value.status,
      ),
    enforcementMode:
      readEnforcementMode(
        value.enforcementMode,
      ),
    riskThreshold:
      readRequiredInteger(
        value.riskThreshold,
        'Proxy risk threshold',
      ),
    requestTimeoutMs:
      readRequiredInteger(
        value.requestTimeoutMs,
        'Proxy request timeout',
      ),
    cacheTtlSeconds:
      readRequiredInteger(
        value.cacheTtlSeconds,
        'Proxy cache duration',
      ),
    failureBehavior:
      readFailureBehavior(
        value.failureBehavior,
      ),
    detectProxy:
      readRequiredBoolean(
        value.detectProxy,
        'Proxy detection setting',
      ),
    detectVpn:
      readRequiredBoolean(
        value.detectVpn,
        'VPN detection setting',
      ),
    detectTor:
      readRequiredBoolean(
        value.detectTor,
        'Tor detection setting',
      ),
    bypassOwnerMembershipIds:
      readMembershipIds(
        value.bypassOwnerMembershipIds,
      ),
    apiKeyUpdatedAt:
      readRequiredString(
        value.apiKeyUpdatedAt,
        'Proxy API-key update time',
      ),
    lastTestedAt:
      readNullableString(
        value.lastTestedAt,
        'Proxy last-tested time',
      ),
    lastTestStatus:
      readTestStatus(
        value.lastTestStatus,
      ),
    lastTestErrorCode:
      readNullableString(
        value.lastTestErrorCode,
        'Proxy test error code',
      ),
    createdBy:
      readNullableString(
        value.createdBy,
        'Proxy creator ID',
      ),
    updatedBy:
      readNullableString(
        value.updatedBy,
        'Proxy updater ID',
      ),
    createdAt:
      readRequiredString(
        value.createdAt,
        'Proxy creation time',
      ),
    updatedAt:
      readRequiredString(
        value.updatedAt,
        'Proxy update time',
      ),
  });
}
function parseNullableProxyConfiguration(
  value: unknown,
): CompanyProxyConfiguration | null {
  return value === null
    ? null
    : parseProxyConfiguration(value);
}
export async function fetchProxyConfiguration(
  accessToken: string,
  companyId: string,
  signal?: AbortSignal,
): Promise<CompanyProxyConfiguration | null> {
  const payload =
    await authenticatedApiRequest(
      accessToken,
      `/companies/${companyId}/proxy`,
      {
        companyId,
        ...(signal !== undefined
          ? { signal }
          : {}),
      },
    );
  return parseNullableProxyConfiguration(
    readNestedData(
      payload,
      'proxyConfiguration',
    ),
  );
}
export async function updateProxyConfiguration(
  accessToken: string,
  companyId: string,
  input:
    UpdateCompanyProxyConfigurationInput,
): Promise<CompanyProxyConfiguration> {
  const payload =
    await authenticatedApiRequest(
      accessToken,
      `/companies/${companyId}/proxy`,
      {
        method: 'PUT',
        companyId,
        body: input,
      },
    );
  return parseProxyConfiguration(
    readNestedData(
      payload,
      'proxyConfiguration',
    ),
  );
}
