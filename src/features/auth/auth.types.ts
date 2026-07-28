import type { Session, User } from '@supabase/supabase-js';

export type PlatformRole = 'platform_super_admin';
export type CompanyRole = 'company_admin' | 'manager' | 'publisher';
export type CompanyMembershipStatus = 'invited' | 'active' | 'suspended' | 'revoked';

export type CompanyMembershipIdentity = {
  membershipId: string;
  companyId: string;
  userId: string;
  role: CompanyRole;
  status: CompanyMembershipStatus;
};

export type ApiIdentity = {
  requestId: string;
  user: {
    id: string;
    sessionId: string;
    assuranceLevel: string;
    isAnonymous: boolean;
    email?: string;
    phone?: string;
  };
  authorization: {
    platformRole: PlatformRole | null;
    requestedCompanyId: string | null;
    companyMembership: CompanyMembershipIdentity | null;
  };
};

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  identity: ApiIdentity | null;
  error: string | null;
};

export type SignInInput = {
  email: string;
  password: string;
  rememberSession: boolean;
};
