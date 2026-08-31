import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Store,
  Tags,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { BrandMark } from './BrandMark.jsx';

const navigation = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Orders', to: '/admin/orders', icon: ClipboardList },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Categories', to: '/admin/categories', icon: Tags },
  { label: 'Storefront', to: '/products', icon: Store },
];

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
      <a className="skip-link" href="#admin-content">
        Skip to admin content
      </a>
      <header className="sticky top-0 z-30 border-b border-evergreen/10 bg-white/95 backdrop-blur">
        <div className="page-shell flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
          <Link to="/" aria-label="Floréa Haven home">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-evergreen">{user.name}</p>
              <p className="mt-0.5 text-[0.68rem] text-ink/50">{user.email}</p>
            </div>
            <span className="rounded-full bg-blush px-3 py-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-clay">
              Admin
            </span>
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
          <nav
            className="order-3 flex w-full gap-1 overflow-x-auto border-t border-evergreen/10 pt-3"
            aria-label="Administrator"
          >
            {navigation.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] transition ${
                    isActive
                      ? 'border-clay text-evergreen'
                      : 'border-transparent text-ink/50 hover:text-evergreen'
                  }`
                }
                to={to}
                end={end}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="admin-content" className="page-shell py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
