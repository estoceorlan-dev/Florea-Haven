import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OrderStatusBadge } from '../components/OrderStatusBadge.jsx';
import { adminOrderApi } from '../services/api.js';
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
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    adminOrderApi
      .getOrders({ ...query, limit: 20 })
      .then((payload) => {
        if (!isCurrent) return;
        setOrders(payload.data);
        setPagination(payload.pagination);
        setError(null);
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [query]);

  const updateDraft = (field, value) => {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setIsLoading(true);
    setQuery({
      ...draftFilters,
      search: draftFilters.search.trim(),
      customer: draftFilters.customer.trim(),
      page: 1,
    });
  };

  const clearFilters = () => {
    setIsLoading(true);
    setDraftFilters(initialFilters);
    setQuery({ ...initialFilters, page: 1 });
  };

  return (
    <section>
      <div className="border-b border-evergreen/10 pb-7">
        <p className="eyebrow text-clay">Fulfillment operations</p>
        <h1 className="mt-2 font-display text-5xl tracking-[-0.045em] text-evergreen">
          Customer orders
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">
          Find new orders, review delivery details, and move each package through its
          fulfillment workflow.
        </p>
      </div>

      <form
        className="mt-7 grid gap-3 border border-evergreen/10 bg-white p-4 md:grid-cols-2 xl:grid-cols-5"
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
        <div
          className="form-alert mt-5 flex items-start justify-between gap-4"
          role="alert"
        >
          <span>{error.message}</span>
          <button
            className="text-link shrink-0"
            type="button"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-5 overflow-hidden border border-evergreen/10 bg-white">
        {isLoading ? (
          <div className="grid min-h-80 place-items-center" role="status">
            <LoaderCircle className="animate-spin text-leaf" aria-hidden="true" />
            <span className="sr-only">Loading orders</span>
          </div>
        ) : orders.length === 0 ? (
          <p className="p-12 text-center text-sm text-ink/55">
            No orders match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead className="bg-sage/45 text-[0.64rem] font-extrabold uppercase tracking-[0.12em] text-evergreen">
                <tr>
                  <th className="px-4 py-3" scope="col">
                    Order
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Customer
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Placed
                  </th>
                  <th className="px-4 py-3" scope="col">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right" scope="col">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right" scope="col">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-evergreen/10">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-evergreen">
                        #{orderNumber(order.id)}
                      </p>
                      <p className="mt-1 text-xs text-ink/45">
                        {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-evergreen">
                        {order.customer.name}
                      </p>
                      <p className="mt-1 text-xs text-ink/45">{order.customer.email}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-ink/60">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-bold text-evergreen">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link className="text-link" to={`/admin/orders/${order.id}`}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-ink/50">
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
                setIsLoading(true);
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
                setIsLoading(true);
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
