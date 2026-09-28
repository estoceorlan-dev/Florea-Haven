import { ArrowLeft, LoaderCircle, Mail, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InlineError } from '../components/InlineError.jsx';
import { OrderDetails } from '../components/OrderDetails.jsx';
import { OrderStatusBadge } from '../components/OrderStatusBadge.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { FeedbackBanner } from '../components/ui/PageState.jsx';
import { AdminDetailSkeleton } from '../components/ui/Skeleton.jsx';
import { adminOrderApi } from '../services/api.js';
import { useInvalidateCatalog } from '../queries/useInvalidateCatalog.js';
import {
  allowedOrderTransitions,
  orderTransitionLabels,
} from '../utils/order-status.js';

export function AdminOrderDetailPage() {
  const invalidateCatalog = useInvalidateCatalog();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loadedOrderId, setLoadedOrderId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingStatus, setPendingStatus] = useState('');

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
    setUpdatingStatus(status);
    setNotice('');

    try {
      const payload = await adminOrderApi.updateStatus(orderId, status);
      if (status === 'cancelled') void invalidateCatalog();
      setOrder(payload.data);
      setError(null);
      setNotice(`Order status updated to ${payload.data.status}.`);
      setPendingStatus('');
    } catch (updateError) {
      setError(updateError);
    } finally {
      setUpdatingStatus('');
    }
  };

  if (loadedOrderId !== orderId) {
    return <AdminDetailSkeleton />;
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

      <div className="grid gap-5 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow text-clay">Fulfillment detail</p>
          <h1 className="mt-2 break-all font-display text-4xl tracking-[-0.04em] text-evergreen sm:text-5xl">
            Order {order.id}
          </h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {notice && (
        <FeedbackBanner className="mt-6" onDismiss={() => setNotice('')}>
          {notice}
        </FeedbackBanner>
      )}
      {error && (
        <FeedbackBanner className="mt-6" tone="error" onDismiss={() => setError(null)}>
          {error.message}
        </FeedbackBanner>
      )}

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-6 shadow-low">
          <div className="flex gap-3">
            <UserRound className="mt-0.5 shrink-0 text-leaf" size={19} />
            <div>
              <p className="eyebrow text-clay">Customer</p>
              <h2 className="mt-2 font-display text-2xl text-evergreen">
                {order.customer.name}
              </h2>
              <a
                className="mt-2 flex items-center gap-2 break-all text-sm text-text-muted hover:text-evergreen"
                href={`mailto:${order.customer.email}`}
              >
                <Mail size={15} aria-hidden="true" />
                {order.customer.email}
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-6 shadow-low">
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
                  onClick={() =>
                    status === 'cancelled'
                      ? setPendingStatus(status)
                      : updateStatus(status)
                  }
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
            <p className="mt-3 text-sm leading-6 text-text-muted">
              This order is complete and has no further status actions.
            </p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <OrderDetails order={order} />
      </div>
      <ConfirmDialog
        open={pendingStatus === 'cancelled'}
        title="Cancel this order?"
        description="Every item will be returned to inventory. The cancelled order will remain in the customer’s history."
        confirmLabel="Cancel order"
        isConfirming={updatingStatus === 'cancelled'}
        onClose={() => setPendingStatus('')}
        onConfirm={() => updateStatus('cancelled')}
      />
    </section>
  );
}
