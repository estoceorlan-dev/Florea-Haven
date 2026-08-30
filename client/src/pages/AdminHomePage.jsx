import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function AdminHomePage() {
  const { user } = useAuth();

  return (
    <section className="mx-auto max-w-5xl py-6 sm:py-10">
      <p className="eyebrow text-clay">Administrator access</p>
      <h1 className="mt-3 max-w-2xl font-display text-5xl leading-[0.98] tracking-[-0.055em] text-evergreen sm:text-6xl">
        The garden office is open.
      </h1>
      <p className="mt-5 max-w-xl text-sm leading-7 text-ink/60">
        Signed in as {user.name}. Product, inventory, customer, and order tools will be
        introduced in their planned administrator phases.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="border border-evergreen/10 bg-white p-7">
          <LockKeyhole className="text-leaf" size={24} strokeWidth={1.5} />
          <h2 className="mt-5 font-display text-3xl text-evergreen">
            Role protection active
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink/55">
            This route requires a current administrator session and redirects customer
            accounts safely.
          </p>
        </div>
        <Link
          className="group flex flex-col justify-between border border-evergreen/10 bg-evergreen p-7 text-white"
          to="/products"
        >
          <div>
            <p className="eyebrow text-blush">Public catalog</p>
            <h2 className="mt-5 font-display text-3xl">Review the storefront</h2>
          </div>
          <span className="mt-12 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]">
            View collection
            <ArrowRight
              className="transition group-hover:translate-x-1"
              size={16}
              aria-hidden="true"
            />
          </span>
        </Link>
      </div>
    </section>
  );
}
