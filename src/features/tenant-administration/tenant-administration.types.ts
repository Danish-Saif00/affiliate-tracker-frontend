import type {
  CompanyMembershipStatus,
  CompanyRole,
  PlatformRole,
} from '../auth/auth.types';

export type UserStatus = 'active' | 'suspended';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked';
export type InvitationDeliveryStatus = 'pending' | 'sent' | 'failed';

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

export type CompanyInvitation = {
  id: string;
  companyId: string;
  email: string;
  role: CompanyRole;
  status: InvitationStatus;
  deliveryStatus: InvitationDeliveryStatus;
  userId: string | null;
  requiresPasswordSetup: boolean;
  invitedBy: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSentAt: string | null;
  sendCount: number;
  lastDeliveryErrorCode: string | null;
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
  role: CompanyRole | '';
  membershipStatus: CompanyMembershipStatus | '';
  userStatus: UserStatus | '';
};

export type CreateInvitationInput = {
  email: string;
  role: CompanyRole;
};

export type InvitationActionInput = {
  invitationId: string;
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
