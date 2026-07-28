import type { CompanyMembershipStatus, CompanyRole } from '../auth/auth.types';
import type { CompanyRecord } from '../companies/company.types';

export type InvitationPreview = {
  invitationId: string;
  company: CompanyRecord;
  email: string;
  role: CompanyRole;
  expiresAt: string;
  requiresPasswordSetup: boolean;
};

export type AcceptedMembership = {
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

export type InvitationAcceptance = {
  company: CompanyRecord;
  membership: AcceptedMembership;
};
