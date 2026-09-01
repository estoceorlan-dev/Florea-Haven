import {
  ArrowRight,
  LogOut,
  PackageOpen,
  ShieldAlert,
  ShoppingBag,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ThemeSelector } from '../components/ui/ThemeSelector.jsx';

export function AccountPage() {
  const { user, logout, sessionError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <section className="page-shell py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        {location.state?.accessDenied && (
          <div
            className="mb-6 flex gap-3 border border-clay/20 bg-blush/35 p-4 text-sm text-ink/70"
            role="alert"
          >
            <ShieldAlert className="mt-0.5 shrink-0 text-clay" size={18} />
            That area is reserved for administrators. Your customer account is signed in
            normally.
          </div>
        )}

        {sessionError && (
          <div
            className="mb-6 border border-clay/20 bg-blush/35 p-4 text-sm text-ink/70"
            role="alert"
          >
            Your account is available, but part of the session could not be refreshed.
          </div>
        )}

        <div className="border border-evergreen/10 bg-surface p-7 shadow-low sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <p className="eyebrow text-clay">Your account</p>
              <h1 className="mt-3 font-display text-5xl tracking-[-0.05em] text-evergreen">
                Welcome, {user.name.split(' ')[0]}.
              </h1>
              <p className="mt-4 text-sm text-ink/55">{user.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-sage px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-evergreen">
                {user.role}
              </span>
            </div>

            <button
              className="button-secondary shrink-0"
              type="button"
              disabled={isSigningOut}
              onClick={signOut}
            >
              <LogOut size={15} aria-hidden="true" />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>

          <div className="mt-10 grid gap-4 border-t border-evergreen/10 pt-8 sm:grid-cols-2">
            <Link className="group bg-surface-muted p-6" to="/orders">
              <PackageOpen className="text-leaf" size={22} />
              <h2 className="mt-5 font-display text-2xl text-evergreen">
                Order history
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                Review your order details, totals, address, and current status.
              </p>
              <span className="text-link mt-5">
                View orders
                <ArrowRight size={13} />
              </span>
            </Link>
            <Link
              className="group border border-evergreen/10 bg-surface p-6"
              to="/cart"
            >
              <ShoppingBag className="text-leaf" size={22} />
              <h2 className="mt-5 font-display text-2xl text-evergreen">Saved cart</h2>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                Return to the pieces you saved and continue to secure checkout.
              </p>
              <span className="text-link mt-5">
                Open cart
                <ArrowRight size={13} />
              </span>
            </Link>
          </div>

          <div className="mt-8 grid gap-5 border-t border-evergreen/10 pt-8 sm:grid-cols-[1fr_minmax(15rem,19rem)] sm:items-end">
            <div>
              <h2 className="font-display text-2xl text-evergreen">Appearance</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-ink/60">
                Follow your device or choose a theme for Floréa Haven on this browser.
              </p>
            </div>
            <ThemeSelector />
          </div>
        </div>
      </div>
    </section>
  );
}
