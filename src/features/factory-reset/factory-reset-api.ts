import {
  authenticatedApiRequest,
  isRecord,
  readNullableString,
  readRequiredNumber,
  readRequiredString,
} from '../../lib/api-client';

import type {
  FactoryResetReport,
  FactoryResetScope,
} from './factory-reset.types';

function readScope(value: unknown): FactoryResetScope {
  const scope = readRequiredString(value, 'factory-reset scope');

  if (scope !== 'tracker' && scope !== 'company') {
    throw new Error('The API returned an invalid factory-reset scope.');
  }

  return scope;
}

function readBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`The API returned an invalid ${fieldName}.`);
  }

  return value;
}

function parseReport(payload: unknown): FactoryResetReport {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new Error('The API returned an invalid factory-reset response.');
  }

  const data = payload.data;

  return {
    resetId: readRequiredString(data.resetId, 'factory-reset id'),
    scope: readScope(data.scope),
    companyId: readNullableString(data.companyId, 'factory-reset company id'),
    deletedTables: readRequiredNumber(data.deletedTables, 'deleted table count'),
    deletedRecords: readRequiredNumber(data.deletedRecords, 'deleted record count'),
    authUsersTargeted: readRequiredNumber(data.authUsersTargeted, 'auth-user target count'),
    externalResourcesTargeted: readRequiredNumber(
      data.externalResourcesTargeted,
      'external-resource target count',
    ),
    storageObjectsTargeted: readRequiredNumber(
      data.storageObjectsTargeted,
      'storage-object target count',
    ),
    authUsersPurged: readRequiredNumber(data.authUsersPurged, 'auth-user purge count'),
    authUsersPending: readRequiredNumber(data.authUsersPending, 'pending auth-user count'),
    externalResourcesPurged: readRequiredNumber(
      data.externalResourcesPurged,
      'external-resource purge count',
    ),
    externalResourcesPending: readRequiredNumber(
      data.externalResourcesPending,
      'pending external-resource count',
    ),
    storageObjectsPurged: readRequiredNumber(
      data.storageObjectsPurged,
      'storage-object purge count',
    ),
    storageObjectsPending: readRequiredNumber(
      data.storageObjectsPending,
      'pending storage-object count',
    ),
    completed: readBoolean(data.completed, 'factory-reset completion flag'),
  };
}

export async function resetTracker(
  accessToken: string,
  confirmation: string,
): Promise<FactoryResetReport> {
  const payload = await authenticatedApiRequest(
    accessToken,
    '/platform/factory-reset',
    {
      method: 'POST',
      body: { confirmation },
    },
  );

  return parseReport(payload);
}

export async function resetCompany(
  accessToken: string,
  companyId: string,
  confirmation: string,
): Promise<FactoryResetReport> {
  const payload = await authenticatedApiRequest(
    accessToken,
    `/companies/${companyId}/factory-reset`,
    {
      method: 'POST',
      companyId,
      body: { confirmation },
    },
  );

  return parseReport(payload);
}
