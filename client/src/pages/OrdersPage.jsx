import { ArrowRight, PackageOpen } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { OrderStatusBadge } from '../components/OrderStatusBadge.jsx';
import { EmptyState } from '../components/ui/PageState.jsx';
import { OrderListSkeleton } from '../components/ui/Skeleton.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useOrdersQuery } from '../queries/useOrdersQuery.js';
import { formatCurrency, formatDateTime } from '../utils/currency.js';

const orderNumber = (id) => id.slice(0, 8).toUpperCase();

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const orders = useOrdersQuery(user?.id, { page, limit: 10 });

  if (orders.isPending) return <OrderListSkeleton />;

  if (orders.error) {
    return (
      <div className="page-shell py-20">
        <InlineError error={orders.error} onRetry={orders.refetch} />
      </div>
    );
  }

  const { data, pagination } = orders.data;

  return (
    <section className="page-shell py-14 sm:py-20">
      <div className="border-b border-border pb-8">
        <p className="eyebrow text-clay">Your account</p>
        <h1 className="mt-3 font-display text-5xl tracking-[-0.055em] text-evergreen sm:text-6xl">
          Order history
        </h1>
        <p className="mt-4 text-sm text-text-muted">
          Follow every order from the Haven, from pending to delivered.
        </p>
      </div>

      {data.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={PackageOpen}
          eyebrow="Your order history"
          title="No orders just yet."
          description="When you place an order, its details and progress will live here."
          action={
            <Link className="button-primary" to="/products">
              Explore the collection
            </Link>
          }
        />
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {data.map((order) => (
              <article
                className="grid gap-5 rounded-card border border-border bg-surface p-5 shadow-low transition hover:border-border-strong sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
                key={order.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-2xl text-evergreen">
                      Order #{orderNumber(order.id)}
                    </h2>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
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

          {orders.isPlaceholderData && (
            <p className="mt-5 text-center text-xs text-text-muted" role="status">
              Updating order history…
            </p>
          )}
          {pagination.totalPages > 1 && (
            <nav
              className="mt-10 flex items-center justify-center gap-3"
              aria-label="Order history pages"
            >
              <button
                className="pagination-button"
                type="button"
                disabled={!pagination.hasPreviousPage || orders.isPlaceholderData}
                onClick={() => setSearchParams({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span className="text-sm text-text-muted" aria-current="page">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="pagination-button"
                type="button"
                disabled={!pagination.hasNextPage || orders.isPlaceholderData}
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
