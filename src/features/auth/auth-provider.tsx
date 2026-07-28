import type { Session } from '@supabase/supabase-js';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { queryClient } from '../../app/query-client';
import { AuthContext, type AuthContextValue } from './auth-context';
import { ApiRequestError, fetchCurrentIdentity } from '../../lib/api-client';
import { supabase } from '../../lib/supabase';
import {
  clearRememberSession,
  setRememberSession,
} from './auth-storage';
import type {
  ApiIdentity,
  AuthState,
  SignInInput,
} from './auth.types';

const initialAuthState: AuthState = {
  status: 'loading',
  session: null,
  user: null,
  identity: null,
  error: null,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'ACCOUNT_ACCESS_DENIED') {
      return 'Your Publisher Tracker account is unavailable or suspended.';
    }

    if (error.code === 'COMPANY_ACCESS_DENIED') {
      return 'Access to the selected company is unavailable.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes('invalid login credentials')) {
      return 'The email address or password is incorrect.';
    }

    if (normalizedMessage.includes('email not confirmed')) {
      return 'Confirm your email address before signing in.';
    }

    return error.message;
  }

  return 'Authentication failed. Please try again.';
}

async function clearLocalSession(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  clearRememberSession();
  queryClient.clear();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);
  const synchronizationSequence = useRef(0);

  const synchronizeSession = useCallback(
    async (session: Session | null, companyId?: string): Promise<ApiIdentity | null> => {
      const sequence = ++synchronizationSequence.current;

      if (session === null) {
        setState({
          status: 'unauthenticated',
          session: null,
          user: null,
          identity: null,
          error: null,
        });
        return null;
      }

      try {
        const identity = await fetchCurrentIdentity(session.access_token, companyId);

        if (sequence !== synchronizationSequence.current) {
          return identity;
        }

        setState({
          status: 'authenticated',
          session,
          user: session.user,
          identity,
          error: null,
        });

        return identity;
      } catch (error: unknown) {
        if (sequence !== synchronizationSequence.current) {
          return null;
        }

        const message = getErrorMessage(error);

        if (companyId !== undefined && error instanceof ApiRequestError) {
          setState((current) => ({
            ...current,
            error: message,
          }));
          throw error;
        }

        await clearLocalSession();

        setState({
          status: 'unauthenticated',
          session: null,
          user: null,
          identity: null,
          error: message,
        });

        return null;
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }

      if (error !== null) {
        setState({
          status: 'error',
          session: null,
          user: null,
          identity: null,
          error: getErrorMessage(error),
        });
        return;
      }

      void synchronizeSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (active) {
          void synchronizeSession(session);
        }
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [synchronizeSession]);

  const signIn = useCallback(
    async ({ email, password, rememberSession }: SignInInput): Promise<ApiIdentity> => {
      setRememberSession(rememberSession);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error !== null) {
        throw new Error(getErrorMessage(error), { cause: error });
      }

      if (data.session === null) {
        throw new Error('Supabase did not return an authenticated session.');
      }

      try {
        const identity = await fetchCurrentIdentity(data.session.access_token);

        setState({
          status: 'authenticated',
          session: data.session,
          user: data.session.user,
          identity,
          error: null,
        });

        return identity;
      } catch (verificationError: unknown) {
        await clearLocalSession();
        throw new Error(getErrorMessage(verificationError), {
          cause: verificationError,
        });
      }
    },
    [],
  );

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    clearRememberSession();
    queryClient.clear();

    setState({
      status: 'unauthenticated',
      session: null,
      user: null,
      identity: null,
      error: null,
    });

    if (error !== null) {
      throw new Error(getErrorMessage(error), { cause: error });
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    const redirectTo = `${window.location.origin}/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error !== null) {
      throw new Error(getErrorMessage(error), { cause: error });
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error !== null) {
      throw new Error(getErrorMessage(error), { cause: error });
    }
  }, []);

  const refreshIdentity = useCallback(
    async (companyId?: string): Promise<ApiIdentity | null> => {
      const { data, error } = await supabase.auth.getSession();

      if (error !== null) {
        throw new Error(getErrorMessage(error), { cause: error });
      }

      return synchronizeSession(data.session, companyId);
    },
    [synchronizeSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshIdentity,
    }),
    [
      refreshIdentity,
      requestPasswordReset,
      signIn,
      signOut,
      state,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
