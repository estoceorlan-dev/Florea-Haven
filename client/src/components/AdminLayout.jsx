import { Link, Outlet } from 'react-router-dom';
import { BrandMark } from './BrandMark.jsx';

// This shell is intentionally minimal until the protected admin features are
// introduced in Phase 6. Defining it now keeps customer and admin navigation
// concerns separate from the start.
export function AdminLayout() {
  return (
    <div className="min-h-screen bg-mist text-ink">
      <header className="border-b border-evergreen/10 bg-white">
        <div className="page-shell flex h-20 items-center justify-between">
          <Link to="/" aria-label="Floréa Haven home">
            <BrandMark />
          </Link>
          <span className="eyebrow text-clay">Admin</span>
        </div>
      </header>
      <main className="page-shell py-10">
        <Outlet />
      </main>
    </div>
  );
}
