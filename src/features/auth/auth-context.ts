import { createContext } from "react";

import type { ApiIdentity, AuthState, SignInInput } from "./auth.types";

export type AuthContextValue = AuthState & {
  signIn(input: SignInInput): Promise<ApiIdentity>;
  signOut(): Promise<void>;
  refreshIdentity(companyId?: string): Promise<ApiIdentity | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
