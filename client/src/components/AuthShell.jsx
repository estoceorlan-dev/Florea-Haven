import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark.jsx';

export function AuthShell({ eyebrow, title, introduction, children }) {
  return (
    <div className="grid min-h-screen bg-ivory lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Floréa Haven home">
            <BrandMark />
          </Link>
          <Link className="text-link" to="/">
            <ArrowLeft size={14} aria-hidden="true" />
            Storefront
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-14">
          <div className="w-full">
            <p className="eyebrow text-clay">{eyebrow}</p>
            <h1 className="mt-3 font-display text-5xl leading-[0.98] tracking-[-0.055em] text-evergreen sm:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-ink/60">
              {introduction}
            </p>
            <div className="mt-9">{children}</div>
          </div>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-evergreen lg:block">
        <img
          className="absolute inset-0 size-full object-cover opacity-85"
          src="https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=1500&q=88"
          alt="Soft garden flowers arranged in natural light"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-image-overlay/90 via-image-overlay/15 to-transparent" />
        <blockquote className="absolute inset-x-0 bottom-0 p-12 text-white xl:p-16">
          <p className="max-w-lg font-display text-4xl leading-[1.08] tracking-[-0.04em]">
            “Where flowers are remembered, and small rituals are given room to grow.”
          </p>
          <footer className="mt-5 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-blush">
            The Floréa journal
          </footer>
        </blockquote>
      </aside>
    </div>
  );
}
