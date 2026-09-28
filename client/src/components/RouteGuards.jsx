import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { LoadingRegion, Skeleton } from './ui/Skeleton.jsx';

export function SessionLoading() {
  return (
    <LoadingRegion
      label="Restoring your session"
      className="page-shell flex min-h-[55vh] items-center justify-center py-20"
    >
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-7 shadow-low">
        <Skeleton className="mx-auto size-12 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-5 w-44 rounded-control" />
        <Skeleton className="mx-auto mt-3 h-3 w-60 max-w-full rounded-control" />
      </div>
    </LoadingRegion>
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
