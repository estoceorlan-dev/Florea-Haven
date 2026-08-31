import { ArrowLeft, LoaderCircle, Mail, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { OrderDetails } from '../components/OrderDetails.jsx';
import { OrderStatusBadge } from '../components/OrderStatusBadge.jsx';
import { adminOrderApi } from '../services/api.js';
import {
  allowedOrderTransitions,
  orderTransitionLabels,
} from '../utils/order-status.js';

export function AdminOrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loadedOrderId, setLoadedOrderId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    adminOrderApi
      .getOrder(orderId)
      .then((payload) => {
        if (!isCurrent) return;
        setOrder(payload.data);
        setError(null);
        setLoadedOrderId(orderId);
      })
      .catch((loadError) => {
        if (!isCurrent) return;
        setOrder(null);
        setError(loadError);
        setLoadedOrderId(orderId);
      });

    return () => {
      isCurrent = false;
    };
  }, [orderId, reloadKey]);

  const updateStatus = async (status) => {
    if (
      status === 'cancelled' &&
      !window.confirm('Cancel this order and return every item to inventory?')
    ) {
      return;
    }

    setUpdatingStatus(status);
    setNotice('');

    try {
      const payload = await adminOrderApi.updateStatus(orderId, status);
      setOrder(payload.data);
      setError(null);
      setNotice(`Order status updated to ${payload.data.status}.`);
    } catch (updateError) {
      setError(updateError);
    } finally {
      setUpdatingStatus('');
    }
  };

  if (loadedOrderId !== orderId) {
    return (
      <div className="grid min-h-96 place-items-center" role="status">
        <LoaderCircle className="animate-spin text-leaf" aria-hidden="true" />
        <span className="sr-only">Loading order details</span>
      </div>
    );
  }

  if (!order && error) {
    return (
      <InlineError
        error={error}
        onRetry={() => {
          setLoadedOrderId(null);
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  const nextStatuses = allowedOrderTransitions[order.status] ?? [];

  return (
    <section>
      <Link className="text-link mb-7" to="/admin/orders">
        <ArrowLeft size={14} aria-hidden="true" />
        All orders
      </Link>

      <div className="grid gap-5 border-b border-evergreen/10 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow text-clay">Fulfillment detail</p>
          <h1 className="mt-2 break-all font-display text-4xl tracking-[-0.04em] text-evergreen sm:text-5xl">
            Order {order.id}
          </h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {notice && (
        <p
          className="mt-6 border border-evergreen/15 bg-white px-4 py-3 text-sm text-evergreen"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <div
          className="form-alert mt-6 flex items-start justify-between gap-4"
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

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="border border-evergreen/10 bg-white p-6">
          <div className="flex gap-3">
            <UserRound className="mt-0.5 shrink-0 text-leaf" size={19} />
            <div>
              <p className="eyebrow text-clay">Customer</p>
              <h2 className="mt-2 font-display text-2xl text-evergreen">
                {order.customer.name}
              </h2>
              <a
                className="mt-2 flex items-center gap-2 text-sm text-ink/60 hover:text-evergreen"
                href={`mailto:${order.customer.email}`}
              >
                <Mail size={15} aria-hidden="true" />
                {order.customer.email}
              </a>
            </div>
          </div>
        </div>

        <div className="border border-evergreen/10 bg-white p-6">
          <p className="eyebrow text-clay">Status actions</p>
          {nextStatuses.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {nextStatuses.map((status) => (
                <button
                  className={
                    status === 'cancelled' ? 'button-secondary' : 'button-primary'
                  }
                  type="button"
                  key={status}
                  disabled={Boolean(updatingStatus)}
                  onClick={() => updateStatus(status)}
                >
                  {updatingStatus === status && (
                    <LoaderCircle
                      className="animate-spin"
                      size={15}
                      aria-hidden="true"
                    />
                  )}
                  {orderTransitionLabels[status]}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-ink/55">
              This order is complete and has no further status actions.
            </p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <OrderDetails order={order} />
      </div>
    </section>
  );
}
