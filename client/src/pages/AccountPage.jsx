import { ArrowRight, LogOut, PackageOpen, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ThemeSelector } from '../components/ui/ThemeSelector.jsx';
import { FeedbackBanner } from '../components/ui/PageState.jsx';
import { ImageUpload } from '../components/ImageUpload.jsx';
import { Avatar } from '../components/Avatar.jsx';

export function AccountPage() {
  const { user, logout, sessionError, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      setLogoutError(`Could not sign out. ${error.message}`);
      setIsSigningOut(false);
    }
  };

  return (
    <section className="page-shell py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        {logoutError && (
          <FeedbackBanner tone="error" className="mb-6">
            {logoutError}
          </FeedbackBanner>
        )}
        {location.state?.accessDenied && (
          <FeedbackBanner className="mb-6" tone="error">
            That area is reserved for administrators. Your customer account is signed in
            normally.
          </FeedbackBanner>
        )}

        {sessionError && (
          <FeedbackBanner className="mb-6" tone="error">
            Your account is available, but part of the session could not be refreshed.
          </FeedbackBanner>
        )}

        <div className="rounded-card border border-border bg-surface p-7 shadow-low sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <Avatar user={user} className="mb-4 size-16" />
              <p className="eyebrow text-clay">Your account</p>
              <h1 className="mt-3 font-display text-5xl tracking-[-0.05em] text-evergreen">
                Welcome, {user.name.split(' ')[0]}.
              </h1>
              <p className="mt-4 break-all text-sm text-text-muted">{user.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-brand-soft px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-brand">
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

          <div className="mt-8">
            <ImageUpload
              endpoint="/api/users/me/profile-image"
              src={user.profile_image_url}
              label="Profile picture"
              onSaved={(payload) => updateUser(payload.data.user)}
            />
          </div>
          <div className="mt-10 grid gap-4 border-t border-border pt-8 sm:grid-cols-2">
            <Link
              className="motion-lift group rounded-card border border-border bg-surface-muted p-6 shadow-low"
              to="/orders"
            >
              <PackageOpen
                className="text-floral-accent"
                size={22}
                aria-hidden="true"
              />
              <h2 className="mt-5 font-display text-2xl text-evergreen">
                Order history
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Review your order details, totals, address, and current status.
              </p>
              <span className="text-link mt-5">
                View orders
                <ArrowRight size={13} aria-hidden="true" />
              </span>
            </Link>
            <Link
              className="motion-lift group rounded-card border border-border bg-surface p-6 shadow-low"
              to="/cart"
            >
              <ShoppingBag
                className="text-floral-accent"
                size={22}
                aria-hidden="true"
              />
              <h2 className="mt-5 font-display text-2xl text-evergreen">Saved cart</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Return to the pieces you saved and continue to secure checkout.
              </p>
              <span className="text-link mt-5">
                Open cart
                <ArrowRight size={13} aria-hidden="true" />
              </span>
            </Link>
          </div>

          <div className="mt-8 grid gap-5 border-t border-border pt-8 sm:grid-cols-[1fr_minmax(15rem,19rem)] sm:items-end">
            <div>
              <h2 className="font-display text-2xl text-evergreen">Appearance</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">
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
