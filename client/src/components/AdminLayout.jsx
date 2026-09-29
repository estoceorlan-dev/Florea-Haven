import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Store,
  Tags,
  UserRound,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { BrandMark } from './BrandMark.jsx';
import { NavigationDrawer } from './ui/NavigationDrawer.jsx';
import { ThemeSelector } from './ui/ThemeSelector.jsx';

const navigation = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Orders', to: '/admin/orders', icon: ClipboardList },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Categories', to: '/admin/categories', icon: Tags },
  { label: 'Floréa Haven', to: '/', icon: Store, end: true },
];

function AdminNavigation({ onNavigate }) {
  return (
    <nav className="grid gap-1" aria-label="Administrator">
      {navigation.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          className={({ isActive }) =>
            `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`
          }
          to={to}
          end={end}
          onClick={onNavigate}
        >
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function getPageTitle(pathname) {
  const page = navigation.find(({ to, end }) =>
    end ? pathname === to : pathname.startsWith(to),
  );

  return page?.label ?? 'Administrator';
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuButtonRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const pageTitle = getPageTitle(location.pathname);

  const signOut = async () => {
    setIsSigningOut(true);
    closeMenu();

    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      setLogoutError(`Could not sign out. ${error.message}`);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted text-text">
      {logoutError && (
        <p role="alert" className="form-alert">
          {logoutError}
        </p>
      )}
      <a className="skip-link" href="#admin-content">
        Skip to admin content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border px-6 py-6">
          <Link to="/" aria-label="Floréa Haven home">
            <BrandMark />
          </Link>
          <p className="mt-3 pl-11 text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-text-muted">
            Administrator
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5">
          <AdminNavigation />

          <div className="mt-auto space-y-5 border-t border-border px-2 pt-5">
            <ThemeSelector placement="top" />
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <UserRound size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{user.name}</p>
                <p className="mt-0.5 truncate text-xs text-text-muted">{user.email}</p>
              </div>
            </div>
            <button
              className="drawer-action-link w-full border border-border"
              type="button"
              disabled={isSigningOut}
              onClick={signOut}
            >
              <LogOut size={18} aria-hidden="true" />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-72">
        <div className="min-h-screen min-w-0 overflow-x-hidden lg:h-screen lg:overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
            <div className="admin-content-shell flex min-h-16 items-center justify-between gap-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  ref={menuButtonRef}
                  className="icon-button shrink-0 lg:hidden"
                  type="button"
                  aria-label={
                    menuOpen
                      ? 'Close administrator navigation'
                      : 'Open administrator navigation'
                  }
                  aria-expanded={menuOpen}
                  aria-controls="admin-navigation-drawer"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <Menu size={20} aria-hidden="true" />
                </button>
                <Link className="lg:hidden" to="/" aria-label="Floréa Haven home">
                  <BrandMark compact />
                </Link>
                <div className="min-w-0">
                  <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.15em] text-text-muted">
                    Admin workspace
                  </p>
                  <p className="truncate font-display text-xl text-evergreen sm:text-2xl">
                    {pageTitle}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden min-w-0 text-right sm:block">
                  <p className="truncate text-xs font-semibold text-evergreen">
                    {user.name}
                  </p>
                  <p className="mt-0.5 truncate text-[0.68rem] text-text-muted">
                    {user.email}
                  </p>
                </div>
                <span className="rounded-full bg-brand-soft px-3 py-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-brand">
                  Admin
                </span>
              </div>
            </div>
          </header>

          <main id="admin-content" className="admin-content-shell py-8 sm:py-10">
            <Outlet />
          </main>
        </div>
      </div>

      <NavigationDrawer
        id="admin-navigation-drawer"
        label="Administrator navigation"
        title="Admin menu"
        open={menuOpen}
        onClose={closeMenu}
        returnFocusRef={menuButtonRef}
      >
        <div className="border-b border-border bg-surface-muted px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <UserRound size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-text">{user.name}</p>
              <p className="mt-1 truncate text-xs text-text-muted">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="px-3 py-4">
          <AdminNavigation onNavigate={closeMenu} />
        </div>

        <div className="mt-auto space-y-5 border-t border-border px-5 py-6">
          <ThemeSelector placement="top" />
          <button
            className="drawer-action-link w-full border border-border"
            type="button"
            disabled={isSigningOut}
            onClick={signOut}
          >
            <LogOut size={18} aria-hidden="true" />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </NavigationDrawer>
    </div>
  );
}
