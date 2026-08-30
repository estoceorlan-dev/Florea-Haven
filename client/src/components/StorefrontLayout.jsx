import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BrandMark } from './BrandMark.jsx';

const navLinkClass = ({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`;

export function StorefrontLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
    setSearchOpen(false);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="bg-evergreen px-4 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.19em] text-ivory sm:text-xs">
        Free Metro Manila delivery on orders over ₱3,500
      </div>

      <header className="sticky top-0 z-40 border-b border-evergreen/10 bg-ivory/95 backdrop-blur-xl">
        <div className="page-shell flex h-[76px] items-center justify-between gap-5">
          <button
            className="icon-button lg:hidden"
            type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
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
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className="icon-button"
              type="button"
              aria-label={searchOpen ? 'Close search' : 'Search products'}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            >
              {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
            <button
              className="icon-button relative"
              type="button"
              aria-label="Shopping bag — available in the next implementation phase"
              title="Shopping bag arrives in Phase 4"
            >
              <ShoppingBag size={19} />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-clay" />
            </button>
          </div>
        </div>

        {searchOpen && (
          <form
            className="border-t border-evergreen/10 bg-white px-4 py-4"
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

        {menuOpen && (
          <nav
            className="absolute inset-x-0 top-full border-b border-evergreen/10 bg-ivory px-6 py-6 shadow-xl lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col">
              {[
                ['Home', '/'],
                ['Shop all', '/products'],
                ['Flowers', '/products?category=flowers'],
                ['Seeds', '/products?category=seeds'],
                ['Perfumes', '/products?category=perfumes'],
              ].map(([label, to]) => (
                <Link
                  className="border-b border-evergreen/10 py-3.5 font-display text-2xl"
                  key={label}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="mt-20 bg-evergreen text-ivory">
        <div className="page-shell grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
          <div className="max-w-sm">
            <Link to="/" aria-label="Floréa Haven home">
              <span className="inline-flex items-center gap-2.5 text-ivory">
                <span className="grid size-9 place-items-center rounded-full border border-ivory/25 bg-white/10">
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
              <Link className="hover:text-white" to="/products">
                Shop all
              </Link>
              <Link className="hover:text-white" to="/products?category=flowers">
                Fresh flowers
              </Link>
              <Link className="hover:text-white" to="/products?category=seeds">
                Garden seeds
              </Link>
              <Link className="hover:text-white" to="/products?category=perfumes">
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
