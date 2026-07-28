import { environment } from './environment';
import type {
  ApiIdentity,
  CompanyMembershipStatus,
  CompanyRole,
  PlatformRole,
} from '../features/auth/auth.types';

type ApiErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
    requestId?: unknown;
  };
};

type AuthMePayload = {
  data?: unknown;
};

export type AuthenticatedApiRequestOptions = {
  body?: unknown;
  companyId?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  signal?: AbortSignal;
};

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId: string | null;

  public constructor(
    status: number,
    code: string,
    message: string,
    requestId: string | null,
  ) {
    super(message);

    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`The API returned an invalid ${fieldName}.`);
  }

  return value.trim();
}

export function readRequiredNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`The API returned an invalid ${fieldName}.`);
  }

  return value;
}

export function readNullableString(value: unknown, fieldName: string): string | null {
  if (value === null) {
    return null;
  }

  return readRequiredString(value, fieldName);
}

function readCompanyMembership(value: unknown): ApiIdentity['authorization']['companyMembership'] {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    throw new Error('The API returned an invalid company membership.');
  }

  const role = readRequiredString(value.role, 'company membership role');
  const status = readRequiredString(value.status, 'company membership status');

  if (!['company_admin', 'manager', 'publisher'].includes(role)) {
    throw new Error('The API returned an unsupported company role.');
  }

  if (!['invited', 'active', 'suspended', 'revoked'].includes(status)) {
    throw new Error('The API returned an unsupported membership status.');
  }

  return {
    membershipId: readRequiredString(value.membershipId, 'membership id'),
    companyId: readRequiredString(value.companyId, 'membership company id'),
    userId: readRequiredString(value.userId, 'membership user id'),
    role: role as CompanyRole,
    status: status as CompanyMembershipStatus,
  };
}

function parseIdentity(payload: unknown): ApiIdentity {
  if (!isRecord(payload)) {
    throw new Error('The API returned an invalid authentication response.');
  }

  const userValue = payload.user;
  const authorizationValue = payload.authorization;

  if (!isRecord(userValue) || !isRecord(authorizationValue)) {
    throw new Error('The API returned incomplete authentication data.');
  }

  const platformRoleValue = authorizationValue.platformRole;

  if (typeof userValue.isAnonymous !== 'boolean') {
    throw new Error('The API returned an invalid anonymous-user flag.');
  }

  if (platformRoleValue !== null && platformRoleValue !== 'platform_super_admin') {
    throw new Error('The API returned an unsupported platform role.');
  }

  return {
    requestId: readRequiredString(payload.requestId, 'request id'),
    user: {
      id: readRequiredString(userValue.id, 'user id'),
      sessionId: readRequiredString(userValue.sessionId, 'session id'),
      assuranceLevel: readRequiredString(userValue.assuranceLevel, 'assurance level'),
      isAnonymous: userValue.isAnonymous,
      ...(typeof userValue.email === 'string' ? { email: userValue.email } : {}),
      ...(typeof userValue.phone === 'string' ? { phone: userValue.phone } : {}),
    },
    authorization: {
      platformRole: platformRoleValue as PlatformRole | null,
      requestedCompanyId: readNullableString(
        authorizationValue.requestedCompanyId,
        'requested company id',
      ),
      companyMembership: readCompanyMembership(authorizationValue.companyMembership),
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

function createApiError(response: Response, payload: unknown): ApiRequestError {
  const errorPayload = isRecord(payload) ? (payload as ApiErrorPayload) : {};
  const error = isRecord(errorPayload.error) ? errorPayload.error : undefined;
  const code = typeof error?.code === 'string' ? error.code : 'API_REQUEST_FAILED';
  const message =
    typeof error?.message === 'string'
      ? error.message
      : `The API request failed with status ${response.status}.`;
  const requestId = typeof error?.requestId === 'string' ? error.requestId : null;

  return new ApiRequestError(response.status, code, message, requestId);
}

export async function authenticatedApiRequest(
  accessToken: string,
  path: string,
  options: AuthenticatedApiRequestOptions = {},
): Promise<unknown> {
  const headers = new Headers({
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`,
  });

  if (options.companyId !== undefined) {
    headers.set('x-company-id', options.companyId);
  }

  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${environment.apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw createApiError(response, payload);
  }

  return payload;
}

export async function fetchCurrentIdentity(
  accessToken: string,
  companyId?: string,
): Promise<ApiIdentity> {
  const payload = await authenticatedApiRequest(accessToken, '/auth/me', {
    ...(companyId !== undefined ? { companyId } : {}),
  });
  const authPayload = isRecord(payload) ? (payload as AuthMePayload) : {};

  return parseIdentity(authPayload.data);
}
