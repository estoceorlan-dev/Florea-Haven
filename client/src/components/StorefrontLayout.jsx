import {
  LogOut,
  Menu,
  PackageOpen,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCart } from '../hooks/useCart.js';
import { BrandMark } from './BrandMark.jsx';
import { NavigationDrawer } from './ui/NavigationDrawer.jsx';
import { ThemeSelector } from './ui/ThemeSelector.jsx';

const navLinkClass = ({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;

export function StorefrontLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuButtonRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const accountPath = user?.role === 'admin' ? '/admin' : user ? '/account' : '/login';
  const firstName = user?.name.trim().split(/\s+/)[0];

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const toggleMenu = () => {
    setSearchOpen(false);
    setMenuOpen((open) => !open);
  };

  const toggleSearch = () => {
    setMenuOpen(false);
    setSearchOpen((open) => !open);
  };

  const signOut = async () => {
    closeMenu();

    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
    setSearchOpen(false);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-canvas text-text">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="bg-evergreen px-4 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.19em] text-ivory sm:text-xs">
        Cash on Delivery · Made gently in Metro Manila
      </div>

      <header className="sticky top-0 z-40 border-b border-evergreen/10 bg-canvas/95 backdrop-blur-xl">
        <div className="page-shell flex h-[76px] items-center justify-between gap-5">
          <button
            ref={menuButtonRef}
            className="icon-button lg:hidden"
            type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="storefront-navigation-drawer"
            onClick={toggleMenu}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link
            to="/"
            aria-label="Floréa Haven home"
            onClick={() => setMenuOpen(false)}
          >
            <BrandMark />
          </Link>

          <nav
            className="hidden items-center gap-9 lg:flex"
            aria-label="Main navigation"
          >
            <NavLink className={navLinkClass} to="/" end>
              Home
            </NavLink>
            <NavLink className={navLinkClass} to="/products">
              Shop all
            </NavLink>
            <NavLink className={navLinkClass} to="/products?category=flowers">
              Flowers
            </NavLink>
            <NavLink className={navLinkClass} to="/products?category=seeds">
              Seeds
            </NavLink>
            <NavLink className={navLinkClass} to="/products?category=perfumes">
              Perfumes
            </NavLink>
            {user?.role === 'customer' && (
              <NavLink className={navLinkClass} to="/orders">
                My orders
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className="icon-button"
              type="button"
              aria-label={searchOpen ? 'Close search' : 'Search products'}
              aria-expanded={searchOpen}
              onClick={toggleSearch}
            >
              {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
            <Link
              className="icon-button relative"
              to="/cart"
              aria-label={`Shopping cart with ${cart.summary.item_count} items`}
            >
              <ShoppingBag size={19} aria-hidden="true" />
              {cart.summary.item_count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[0.56rem] font-bold leading-none text-canvas">
                  {cart.summary.item_count > 99 ? '99+' : cart.summary.item_count}
                </span>
              )}
            </Link>
            <Link
              className="account-link"
              to={accountPath}
              aria-label={user ? `Open account for ${user.name}` : 'Sign in'}
            >
              <UserRound size={19} aria-hidden="true" />
              <span className="hidden min-w-0 sm:block">
                <span className="block text-[0.6rem] font-bold uppercase tracking-[0.12em] text-ink/45">
                  {user ? 'Your account' : 'Welcome'}
                </span>
                <span className="block max-w-28 truncate text-xs font-semibold text-evergreen xl:max-w-36">
                  {user ? `Hi, ${firstName}` : 'Sign in'}
                </span>
              </span>
            </Link>
          </div>
        </div>

        {searchOpen && (
          <form
            className="border-t border-evergreen/10 bg-surface px-4 py-4"
            onSubmit={submitSearch}
            role="search"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3 border-b border-evergreen/30 pb-2">
              <Search size={18} aria-hidden="true" />
              <label className="sr-only" htmlFor="site-search">
                Search the collection
              </label>
              <input
                id="site-search"
                className="min-w-0 flex-1 bg-transparent py-1 text-base outline-none placeholder:text-ink/45"
                placeholder="Search flowers, seeds, perfumes…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoFocus
              />
              <button className="text-link" type="submit">
                Search
              </button>
            </div>
          </form>
        )}
      </header>

      <NavigationDrawer
        id="storefront-navigation-drawer"
        label="Mobile navigation"
        title="Explore"
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
              <p className="truncate font-semibold text-text">
                {user?.name ?? 'Welcome to Floréa Haven'}
              </p>
              <p className="mt-1 truncate text-xs text-text-muted">
                {user?.email ?? 'Sign in to see your account and orders'}
              </p>
            </div>
          </div>
        </div>

        <nav className="px-3 py-4" aria-label="Store navigation">
          {[
            ['Home', '/'],
            ['Shop all', '/products'],
            ['Flowers', '/products?category=flowers'],
            ['Seeds', '/products?category=seeds'],
            ['Perfumes', '/products?category=perfumes'],
          ].map(([label, to]) => (
            <Link className="drawer-nav-link" key={label} to={to} onClick={closeMenu}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="mx-5 border-t border-border pt-4">
          <p className="eyebrow mb-2 text-text-muted">Account</p>
          {user ? (
            <>
              <Link className="drawer-action-link" to={accountPath} onClick={closeMenu}>
                <UserRound size={18} aria-hidden="true" />
                {user.role === 'admin' ? 'Administrator' : 'My account'}
              </Link>
              {user.role === 'customer' && (
                <Link className="drawer-action-link" to="/orders" onClick={closeMenu}>
                  <PackageOpen size={18} aria-hidden="true" />
                  My orders
                </Link>
              )}
            </>
          ) : (
            <Link className="drawer-action-link" to="/login" onClick={closeMenu}>
              <UserRound size={18} aria-hidden="true" />
              Sign in
            </Link>
          )}
          <Link className="drawer-action-link" to="/cart" onClick={closeMenu}>
            <ShoppingBag size={18} aria-hidden="true" />
            Cart{cart.summary.item_count ? ` (${cart.summary.item_count})` : ''}
          </Link>
          {user && (
            <button
              className="drawer-action-link w-full"
              type="button"
              onClick={signOut}
            >
              <LogOut size={18} aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>

        <div className="mt-auto px-5 py-6">
          <ThemeSelector />
        </div>
      </NavigationDrawer>

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="mt-20 bg-evergreen text-ivory">
        <div className="page-shell grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
          <div className="max-w-sm">
            <Link to="/" aria-label="Floréa Haven home">
              <span className="inline-flex items-center gap-2.5 text-ivory">
                <span className="grid size-9 place-items-center rounded-full border border-ivory/25 bg-canvas/10">
                  <span className="brand-sprout">F</span>
                </span>
                <span className="font-display text-[1.65rem] tracking-[-0.035em]">
                  Floréa <i className="font-normal text-blush">Haven</i>
                </span>
              </span>
            </Link>
            <p className="mt-5 text-sm leading-7 text-ivory/70">
              Garden-grown beauty for homes that make room for softness, scent, and
              small everyday rituals.
            </p>
          </div>

          <div>
            <p className="eyebrow text-blush">Explore</p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-ivory/75">
              <Link className="hover:text-canvas" to="/products">
                Shop all
              </Link>
              <Link className="hover:text-canvas" to="/products?category=flowers">
                Fresh flowers
              </Link>
              <Link className="hover:text-canvas" to="/products?category=seeds">
                Garden seeds
              </Link>
              <Link className="hover:text-canvas" to="/products?category=perfumes">
                Botanical perfumes
              </Link>
            </div>
          </div>

          <div>
            <p className="eyebrow text-blush">Visit us</p>
            <p className="mt-5 text-sm leading-7 text-ivory/75">
              Quezon City, Metro Manila
              <br />
              Monday–Saturday, 9am–6pm
              <br />
              hello@floreahaven.test
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-ivory/50">
          © {new Date().getFullYear()} Floréa Haven. Made to grow slowly.
        </div>
      </footer>
    </div>
  );
}
