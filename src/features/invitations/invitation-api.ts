import type {
  CompanyMembershipStatus,
  CompanyRole,
} from '../auth/auth.types';
import { parseCompanyRecord } from '../companies/company-api';
import {
  authenticatedApiRequest,
  isRecord,
  readNullableString,
  readRequiredString,
} from '../../lib/api-client';
import type {
  AcceptedMembership,
  InvitationAcceptance,
  InvitationPreview,
} from './invitation.types';

type DataPayload = {
  data?: unknown;
};

function readData(payload: unknown): unknown {
  const envelope = isRecord(payload) ? (payload as DataPayload) : {};
  return envelope.data;
}

function readCompanyRole(value: unknown): CompanyRole {
  const role = readRequiredString(value, 'company role');

  if (!['company_admin', 'manager', 'publisher'].includes(role)) {
    throw new Error('The API returned an unsupported company role.');
  }

  return role as CompanyRole;
}

function readMembershipStatus(value: unknown): CompanyMembershipStatus {
  const status = readRequiredString(value, 'membership status');

  if (!['invited', 'active', 'suspended', 'revoked'].includes(status)) {
    throw new Error('The API returned an unsupported membership status.');
  }

  return status as CompanyMembershipStatus;
}

function readRequiredBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`The API returned an invalid ${fieldName}.`);
  }

  return value;
}

function parsePreview(value: unknown): InvitationPreview {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid invitation preview.');
  }

  return {
    invitationId: readRequiredString(value.invitationId, 'invitation id'),
    company: parseCompanyRecord(value.company),
    email: readRequiredString(value.email, 'invitation email'),
    role: readCompanyRole(value.role),
    expiresAt: readRequiredString(value.expiresAt, 'invitation expiry'),
    requiresPasswordSetup: readRequiredBoolean(
      value.requiresPasswordSetup,
      'password setup flag',
    ),
  };
}

function parseMembership(value: unknown): AcceptedMembership {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid accepted membership.');
  }

  return {
    id: readRequiredString(value.id, 'membership id'),
    companyId: readRequiredString(value.companyId, 'membership company id'),
    userId: readRequiredString(value.userId, 'membership user id'),
    role: readCompanyRole(value.role),
    status: readMembershipStatus(value.status),
    invitedBy: readNullableString(value.invitedBy, 'membership inviter'),
    joinedAt: readNullableString(value.joinedAt, 'membership joined time'),
    createdAt: readRequiredString(value.createdAt, 'membership created time'),
    updatedAt: readRequiredString(value.updatedAt, 'membership updated time'),
  };
}

function parseAcceptance(value: unknown): InvitationAcceptance {
  if (!isRecord(value)) {
    throw new Error('The API returned an invalid invitation acceptance.');
  }

  return {
    company: parseCompanyRecord(value.company),
    membership: parseMembership(value.membership),
  };
}

export async function previewInvitation(
  accessToken: string,
  token: string,
  signal?: AbortSignal,
): Promise<InvitationPreview> {
  const payload = await authenticatedApiRequest(accessToken, '/invitations/preview', {
    method: 'POST',
    body: { token },
    ...(signal !== undefined ? { signal } : {}),
  });
  const data = readData(payload);

  if (!isRecord(data)) {
    throw new Error('The API returned an invalid invitation response.');
  }

  return parsePreview(data.preview);
}

export async function acceptInvitation(
  accessToken: string,
  token: string,
): Promise<InvitationAcceptance> {
  const payload = await authenticatedApiRequest(accessToken, '/invitations/accept', {
    method: 'POST',
    body: { token },
  });
  const data = readData(payload);

  if (!isRecord(data)) {
    throw new Error('The API returned an invalid invitation response.');
  }

  const result = data.result;

  if (!isRecord(result)) {
    throw new Error('The API returned an invalid invitation acceptance.');
  }

  return parseAcceptance(result);
}
