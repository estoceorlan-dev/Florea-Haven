import { ArrowRight, PackageOpen } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { OrderStatusBadge } from '../components/OrderStatusBadge.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { orderApi } from '../services/api.js';
import { formatCurrency, formatDateTime } from '../utils/currency.js';

const orderNumber = (id) => id.slice(0, 8).toUpperCase();

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const orders = useAsync(() => orderApi.getOrders({ page, limit: 10 }), [page]);

  if (orders.isLoading) {
    return (
      <div className="page-shell py-20" aria-busy="true">
        <div className="h-14 w-64 animate-pulse bg-evergreen/10" />
        <div className="mt-10 space-y-4">
          {[0, 1, 2].map((item) => (
            <div className="h-36 animate-pulse bg-evergreen/10" key={item} />
          ))}
        </div>
      </div>
    );
  }

  if (orders.error) {
    return (
      <div className="page-shell py-20">
        <InlineError error={orders.error} onRetry={orders.retry} />
      </div>
    );
  }

  const { data, pagination } = orders.data;

  return (
    <section className="page-shell py-14 sm:py-20">
      <div className="border-b border-evergreen/10 pb-8">
        <p className="eyebrow text-clay">Your account</p>
        <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
          Order history
        </h1>
        <p className="mt-4 text-sm text-ink/55">
          Follow every order from the Haven, from pending to delivered.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="py-20 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-evergreen">
            <PackageOpen size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="mt-6 font-display text-4xl text-evergreen">
            No orders just yet.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink/55">
            When you place an order, its details and progress will live here.
          </p>
          <Link className="button-primary mt-7" to="/products">
            Explore the collection
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {data.map((order) => (
              <article
                className="grid gap-5 border border-evergreen/10 bg-surface p-6 sm:grid-cols-[1fr_auto] sm:items-center"
                key={order.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-2xl text-evergreen">
                      Order #{orderNumber(order.id)}
                    </h2>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-sm text-ink/50">
                    {formatDateTime(order.created_at)} · {order.item_count}{' '}
                    {order.item_count === 1 ? 'item' : 'items'} ·{' '}
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
                <Link className="text-link" to={`/orders/${order.id}`}>
                  View order
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <nav
              className="mt-10 flex items-center justify-center gap-3"
              aria-label="Order history pages"
            >
              <button
                className="pagination-button"
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setSearchParams({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span className="text-sm text-ink/50">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="pagination-button"
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => setSearchParams({ page: String(page + 1) })}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
