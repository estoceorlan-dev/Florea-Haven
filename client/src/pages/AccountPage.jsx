import { LogOut, ShieldAlert, Sprout } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

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

        <div className="border border-evergreen/10 bg-white p-7 sm:p-10">
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

          <div className="mt-10 border-t border-evergreen/10 pt-8">
            <div className="flex gap-4 bg-mist p-5 sm:p-6">
              <Sprout className="mt-0.5 shrink-0 text-leaf" size={22} />
              <div>
                <h2 className="font-display text-2xl text-evergreen">
                  Your account is ready to grow
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  Persistent carts and order history arrive in the next phases. Your
                  secure account will carry those experiences when they are added.
                </p>
                <Link className="text-link mt-5" to="/products">
                  Explore the collection
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
