import type {
  CompanyMembershipStatus,
  CompanyRole,
  PlatformRole,
} from "../auth/auth.types";

export type UserStatus = "active" | "suspended";

export type CompanyDirectoryUser = {
  membershipId: string;
  companyId: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  avatarPath: string | null;
  userStatus: UserStatus;
  role: CompanyRole;
  membershipStatus: CompanyMembershipStatus;
  invitedBy: string | null;
  joinedAt: string | null;
  membershipCreatedAt: string;
  membershipUpdatedAt: string;
  profileUpdatedAt: string;
};

export type UserProfile = {
  userId: string;
  displayName: string | null;
  avatarPath: string | null;
  platformRole: PlatformRole | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type CompanyMembership = {
  id: string;
  companyId: string;
  userId: string;
  role: CompanyRole;
  status: CompanyMembershipStatus;
  invitedBy: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
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

export type CursorPage<TItem> = {
  items: readonly TItem[];
  nextCursor: string | null;
};

export type DirectoryFilters = {
  search: string;
  role: CompanyRole | "";
  membershipStatus: CompanyMembershipStatus | "";
  userStatus: UserStatus | "";
};

export type CreateManagedUserInput = {
  email: string;
  password: string;
};

export type UpdateManagedUserInput = {
  userId: string;
  email?: string;
  displayName?: string;
  password?: string;
};

export type ManagedUserUpdateResult = {
  user: CompanyDirectoryUser;
  passwordUpdated: boolean;
};

export type ResetManagedUserPasswordInput = {
  userId: string;
  password: string;
};

export type ManagedUserPasswordResetResult = {
  userId: string;
  passwordUpdated: true;
};

export type UpdateMembershipInput = {
  membershipId: string;
  role: CompanyRole;
  status: CompanyMembershipStatus;
};

export type UpdateUserStatusInput = {
  userId: string;
  status: UserStatus;
};
