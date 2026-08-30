import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="page-shell flex min-h-[60vh] items-center justify-center py-20 text-center">
      <div>
        <p className="eyebrow text-clay">404 · A path less planted</p>
        <h1 className="mt-4 font-display text-6xl tracking-[-0.06em] text-evergreen sm:text-8xl">
          Nothing grows here.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-ink/60">
          The page may have moved, or perhaps this corner of the garden has not been
          planted yet.
        </p>
        <Link className="button-primary mt-8" to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Return home
        </Link>
      </div>
    </section>
  );
}
