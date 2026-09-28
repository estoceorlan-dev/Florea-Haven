import { useAdminQuery } from '../queries/useAdminQuery.js';
import {
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { OrderStatusBadge } from '../components/OrderStatusBadge.jsx';
import { EmptyState, FeedbackBanner } from '../components/ui/PageState.jsx';
import { AdminListSkeleton } from '../components/ui/Skeleton.jsx';
import { formatCurrency, formatDateTime } from '../utils/currency.js';

const initialFilters = {
  search: '',
  customer: '',
  status: 'all',
  dateFrom: '',
  dateTo: '',
};

const orderNumber = (id) => id.slice(0, 8).toUpperCase();

export function AdminOrdersPage() {
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [query, setQuery] = useState({ ...initialFilters, page: 1 });
  const ordersQuery = useAdminQuery('orders', { ...query, limit: 20 });
  const orders = ordersQuery.data?.data ?? [];
  const pagination = ordersQuery.data?.pagination;
  const isLoading = ordersQuery.isPending;
  const error = ordersQuery.error;

  const updateDraft = (field, value) => {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setQuery({
      ...draftFilters,
      search: draftFilters.search.trim(),
      customer: draftFilters.customer.trim(),
      page: 1,
    });
  };

  const clearFilters = () => {
    setDraftFilters(initialFilters);
    setQuery({ ...initialFilters, page: 1 });
  };

  return (
    <section>
      <div className="border-b border-border pb-7">
        <p className="eyebrow text-clay">Fulfillment operations</p>
        <h1 className="mt-2 font-display text-5xl tracking-[-0.045em] text-evergreen">
          Customer orders
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
          Find new orders, review delivery details, and move each package through its
          fulfillment workflow.
        </p>
      </div>

      <form
        className="mt-7 grid gap-3 rounded-card border border-border bg-surface p-4 shadow-low md:grid-cols-2 xl:grid-cols-5"
        aria-label="Filter orders"
        onSubmit={applyFilters}
      >
        <label className="relative">
          <span className="sr-only">Search order number</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-leaf"
            size={17}
            aria-hidden="true"
          />
          <input
            className="form-input pl-10"
            type="search"
            value={draftFilters.search}
            placeholder="Order number"
            onChange={(event) => updateDraft('search', event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Search customer</span>
          <input
            className="form-input"
            type="search"
            value={draftFilters.customer}
            placeholder="Customer name or email"
            onChange={(event) => updateDraft('customer', event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filter by order status</span>
          <select
            className="form-input"
            value={draftFilters.status}
            onChange={(event) => updateDraft('status', event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="form-field">
          From
          <input
            className="form-input"
            type="date"
            value={draftFilters.dateFrom}
            max={draftFilters.dateTo || undefined}
            onChange={(event) => updateDraft('dateFrom', event.target.value)}
          />
        </label>
        <label className="form-field">
          To
          <input
            className="form-input"
            type="date"
            value={draftFilters.dateTo}
            min={draftFilters.dateFrom || undefined}
            onChange={(event) => updateDraft('dateTo', event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-5">
          <button className="button-primary" type="submit">
            <SlidersHorizontal size={15} aria-hidden="true" />
            Apply filters
          </button>
          <button className="button-secondary" type="button" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </form>

      {error && (
        <FeedbackBanner
          className="mt-5"
          tone="error"
          onDismiss={() => ordersQuery.refetch()}
        >
          {error.message}
        </FeedbackBanner>
      )}

      <div className="mt-5 overflow-hidden rounded-card border border-border bg-surface shadow-low">
        {isLoading ? (
          <AdminListSkeleton label="Loading orders" />
        ) : orders.length === 0 ? (
          <EmptyState
            className="m-4"
            icon={PackageSearch}
            eyebrow="Fulfillment queue"
            title="No matching orders."
            description="Try a broader customer, status, or date filter."
          />
        ) : (
          <div role="table" aria-label="Customer orders">
            <div
              className="hidden grid-cols-[7rem_minmax(12rem,1.2fr)_minmax(10rem,1fr)_7rem_7rem_5rem] gap-4 bg-surface-muted px-5 py-3 text-[0.64rem] font-extrabold uppercase tracking-[0.12em] text-evergreen lg:grid"
              role="row"
            >
              {['Order', 'Customer', 'Placed', 'Status', 'Total', 'Action'].map(
                (label) => (
                  <span key={label} role="columnheader">
                    {label}
                  </span>
                ),
              )}
            </div>
            <div className="divide-y divide-border">
              {orders.map((order) => (
                <article
                  className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[7rem_minmax(12rem,1.2fr)_minmax(10rem,1fr)_7rem_7rem_5rem] lg:items-center"
                  key={order.id}
                  role="row"
                >
                  <div role="cell">
                    <p className="text-sm font-bold text-evergreen">
                      #{orderNumber(order.id)}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="min-w-0" role="cell">
                    <p className="break-words text-sm font-semibold text-evergreen">
                      {order.customer.name}
                    </p>
                    <p className="mt-1 break-all text-xs text-text-muted">
                      {order.customer.email}
                    </p>
                  </div>
                  <p className="text-sm text-text-muted" role="cell">
                    <span className="mr-2 text-xs lg:hidden">Placed</span>
                    {formatDateTime(order.created_at)}
                  </p>
                  <div role="cell">
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm font-bold text-evergreen" role="cell">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <div role="cell">
                    <Link className="text-link" to={`/admin/orders/${order.id}`}>
                      Review
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {pagination && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
            orders
          </p>
          <div className="flex gap-2">
            <button
              className="pagination-button"
              type="button"
              aria-label="Previous order page"
              disabled={!pagination.hasPreviousPage}
              onClick={() => {
                setQuery((current) => ({ ...current, page: current.page - 1 }));
              }}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              className="pagination-button"
              type="button"
              aria-label="Next order page"
              disabled={!pagination.hasNextPage}
              onClick={() => {
                setQuery((current) => ({ ...current, page: current.page + 1 }));
              }}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
