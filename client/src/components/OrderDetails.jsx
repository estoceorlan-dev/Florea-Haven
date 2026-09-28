import { Banknote, MapPin, PackageCheck } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/currency.js';
import { OrderStatusBadge } from './OrderStatusBadge.jsx';

const orderNumber = (id) => id.slice(0, 8).toUpperCase();

export function OrderDetails({ order }) {
  const address = order.delivery_address;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface p-5 shadow-low sm:p-6">
          <div>
            <p className="eyebrow text-clay">Order #{orderNumber(order.id)}</p>
            <p className="mt-2 text-sm text-text-muted">
              Placed {formatDateTime(order.created_at)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="mt-4 divide-y divide-border rounded-card border border-border bg-surface px-5 shadow-low sm:px-6">
          {order.items.map((item) => (
            <article
              className="grid gap-3 py-6 sm:grid-cols-[1fr_auto] sm:items-start"
              key={item.id}
            >
              <div>
                <p className="font-display text-2xl text-evergreen">
                  {item.product_name}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-text-muted">
                  {item.sku} · Qty {item.quantity} · {formatCurrency(item.unit_price)}{' '}
                  each
                </p>
              </div>
              <strong className="text-sm text-evergreen">
                {formatCurrency(item.line_total)}
              </strong>
            </article>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-text-muted">
          This purchase record keeps the product names, quantities, and prices from when
          you placed the order. Current catalog availability may differ.
        </p>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-28">
        <div className="rounded-card border border-border bg-surface-muted p-6 shadow-low lg:p-8">
          <p className="eyebrow text-clay">Order total</p>
          <div className="mt-5 flex items-center justify-between border-b border-border pb-4 text-sm">
            <span className="text-text-muted">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <strong className="font-display text-2xl text-evergreen">Total</strong>
            <strong className="text-lg text-evergreen">
              {formatCurrency(order.total_amount)}
            </strong>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-low">
          <div className="flex gap-3">
            <MapPin
              className="mt-0.5 shrink-0 text-floral-accent"
              size={18}
              aria-hidden="true"
            />
            <div>
              <h2 className="font-display text-xl text-evergreen">Delivery address</h2>
              <address className="mt-2 break-words text-sm not-italic leading-6 text-text-muted">
                {address.recipientName}
                <br />
                {address.addressLine1}
                {address.addressLine2 && (
                  <>
                    <br />
                    {address.addressLine2}
                  </>
                )}
                <br />
                {address.city}, {address.province} {address.postalCode}
                <br />
                {address.country}
                <br />
                {address.phone}
              </address>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-card border border-border bg-surface p-6 text-sm text-text-muted shadow-low">
          <p className="flex items-center gap-3">
            <Banknote className="text-floral-accent" size={18} aria-hidden="true" />
            Cash on Delivery
          </p>
          <p className="flex items-center gap-3">
            <PackageCheck className="text-floral-accent" size={18} aria-hidden="true" />
            Status updated {formatDateTime(order.status_updated_at)}
          </p>
        </div>
      </aside>
    </div>
  );
}
