export type FactoryResetScope = 'tracker' | 'company';

export interface FactoryResetReport {
  readonly resetId: string;
  readonly scope: FactoryResetScope;
  readonly companyId: string | null;
  readonly deletedTables: number;
  readonly deletedRecords: number;
  readonly authUsersTargeted: number;
  readonly externalResourcesTargeted: number;
  readonly storageObjectsTargeted: number;
  readonly authUsersPurged: number;
  readonly authUsersPending: number;
  readonly externalResourcesPurged: number;
  readonly externalResourcesPending: number;
  readonly storageObjectsPurged: number;
  readonly storageObjectsPending: number;
  readonly completed: boolean;
}
