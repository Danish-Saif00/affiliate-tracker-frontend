import { Navigate, Outlet, useLocation } from 'react-router';

import { AuthLoadingScreen } from './auth-loading-screen';
import { useAuth } from './use-auth';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (auth.status !== 'authenticated') {
    return (
      <Navigate
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          authError: auth.error,
        }}
        to="/login"
      />
    );
  }

  return <Outlet />;
}
