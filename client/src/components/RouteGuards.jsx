import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function SessionLoading() {
  return (
    <div className="page-shell flex min-h-[55vh] items-center justify-center py-20">
      <div className="text-center" role="status">
        <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-evergreen/15 border-t-evergreen" />
        <span className="mt-4 block text-sm text-ink/55">Restoring your session…</span>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (user.role !== 'admin') {
    return <Navigate to="/account" replace state={{ accessDenied: true }} />;
  }

  return <Outlet />;
}
