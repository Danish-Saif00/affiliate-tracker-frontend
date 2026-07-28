import { Navigate, Outlet } from 'react-router';

import { AuthLoadingScreen } from './auth-loading-screen';
import { useAuth } from './use-auth';

export function PublicOnlyRoute() {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (auth.status === 'authenticated') {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
