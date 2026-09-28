import {
  ArrowRight,
  ClipboardList,
  Package,
  ShieldCheck,
  Store,
  Tags,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const tools = [
  {
    title: 'Customer orders',
    description: 'Review delivery details and progress new orders through fulfillment.',
    to: '/admin/orders',
    label: 'Manage orders',
    icon: ClipboardList,
  },
  {
    title: 'Products & inventory',
    description: 'Create products, refine listings, and keep stock levels accurate.',
    to: '/admin/products',
    label: 'Manage products',
    icon: Package,
  },
  {
    title: 'Categories',
    description: 'Organize the catalog and maintain customer-facing collections.',
    to: '/admin/categories',
    label: 'Manage categories',
    icon: Tags,
  },
  {
    title: 'Floréa Haven review',
    description: 'Check how active catalog changes appear to customers.',
    to: '/products',
    label: 'View Floréa Haven',
    icon: Store,
  },
];

export function AdminHomePage() {
  const { user } = useAuth();

  return (
    <section className="py-2 sm:py-4">
      <div className="grid gap-8 border-b border-border pb-9 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow text-clay">Administrator dashboard</p>
          <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.98] tracking-[-0.055em] text-evergreen sm:text-6xl">
            Welcome back, {user.name.split(' ')[0]}.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-text-muted">
            Keep Floréa Haven's collection organized, available, and ready for every
            customer visit.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-card border border-border bg-surface px-5 py-4 shadow-low">
          <ShieldCheck
            className="text-success"
            size={22}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-bold text-evergreen">Protected workspace</p>
            <p className="mt-1 text-xs text-text-muted">Administrator session active</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {tools.map(({ title, description, to, label, icon: Icon }, index) => (
          <Link
            key={to}
            className={`motion-lift group flex min-h-64 flex-col justify-between rounded-card border p-7 shadow-low ${
              index === 0
                ? 'border-brand bg-brand text-canvas'
                : 'border-border bg-surface text-text'
            }`}
            to={to}
          >
            <div>
              <Icon
                className={index === 0 ? 'text-brand-soft' : 'text-floral-accent'}
                size={25}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2
                className={`mt-6 font-display text-3xl ${index === 0 ? 'text-canvas' : 'text-evergreen'}`}
              >
                {title}
              </h2>
              <p
                className={`mt-3 text-sm leading-6 ${index === 0 ? 'text-canvas/80' : 'text-text-muted'}`}
              >
                {description}
              </p>
            </div>
            <span className="mt-8 inline-flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.11em]">
              {label}
              <ArrowRight
                className="transition group-hover:translate-x-1"
                size={15}
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
