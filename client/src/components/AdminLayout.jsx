import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { BrandMark } from './BrandMark.jsx';

// This shell is intentionally minimal until the protected admin features are
// introduced in Phase 6. Defining it now keeps customer and admin navigation
// concerns separate from the start.
export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-mist text-ink">
      <header className="border-b border-evergreen/10 bg-white">
        <div className="page-shell flex h-20 items-center justify-between">
          <Link to="/" aria-label="Floréa Haven home">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden text-xs text-ink/55 sm:inline">{user.email}</span>
            <span className="eyebrow text-clay">Admin</span>
            <button
              className="icon-button"
              type="button"
              aria-label="Sign out"
              disabled={isSigningOut}
              onClick={signOut}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <main className="page-shell py-10">
        <Outlet />
      </main>
    </div>
  );
}
